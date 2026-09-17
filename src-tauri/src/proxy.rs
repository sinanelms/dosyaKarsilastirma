//! Kurum ağlarında güncelleme sunucusuna ulaşmak için proxy çözümleme.
//!
//! Tauri güncelleyicisi (reqwest) Windows'taki elle girilmiş proxy'yi okur ama otomatik yapılandırma
//! betiğini (PAC, ör. `http://proxyk.uyap.gov.tr/files/proxy.pac`) çalıştıramaz. Burada adresin hangi
//! proxy'den geçmesi gerektiği Windows'un WinHTTP servisine sorulur; sonuç güncelleyiciye verilir.

/// Tarayıcıda açılan sürümler sayfası; uygulama içinden güncelleme mümkün olmazsa son çare.
pub const RELEASES_PAGE_URL: &str =
    "https://github.com/sinanelms/dosyaKarsilastirma/releases/latest";

/// WinHTTP'nin döndürdüğü proxy listesini (`host:port;http=host2:port`) güncelleyicinin beklediği
/// `http://host:port` biçimine çevirir. Tekrarlar ve `DIRECT` girdileri atılır.
pub fn parse_proxy_list(raw: &str) -> Vec<String> {
    let mut proxies: Vec<String> = Vec::new();
    for entry in raw.split(|c: char| c == ';' || c.is_whitespace()) {
        let entry = entry.trim();
        if entry.is_empty() || entry.eq_ignore_ascii_case("direct") {
            continue;
        }
        // "https=host:port" / "http=host:port" biçimi; ftp/socks girdileri kullanılmaz.
        let address = match entry.split_once('=') {
            Some((scheme, addr))
                if scheme.eq_ignore_ascii_case("http") || scheme.eq_ignore_ascii_case("https") =>
            {
                addr
            }
            Some(_) => continue,
            None => entry,
        };
        let address = address
            .trim_start_matches("http://")
            .trim_start_matches("https://")
            .trim_end_matches('/');
        if address.is_empty() {
            continue;
        }
        let url = format!("http://{address}");
        if !proxies.contains(&url) {
            proxies.push(url);
        }
    }
    proxies
}

#[cfg(windows)]
fn wide(s: &str) -> Vec<u16> {
    s.encode_utf16().chain(std::iter::once(0)).collect()
}

/// WinHTTP'nin ayırdığı dizeyi okuyup serbest bırakır.
#[cfg(windows)]
unsafe fn take_wide(ptr: *mut u16) -> Option<String> {
    if ptr.is_null() {
        return None;
    }
    let len = (0..).take_while(|&i| *ptr.add(i) != 0).count();
    let value = String::from_utf16_lossy(std::slice::from_raw_parts(ptr, len));
    windows_sys::Win32::Foundation::GlobalFree(ptr as _);
    Some(value)
}

/// Windows'un kullanıcı proxy ayarlarına (PAC, otomatik algılama, elle girilen) göre `url` için proxy adayları.
#[cfg(windows)]
pub fn resolve_proxies(url: &str) -> Vec<String> {
    use windows_sys::Win32::Networking::WinHttp::*;

    let mut result: Vec<String> = Vec::new();
    unsafe {
        let mut ie = WINHTTP_CURRENT_USER_IE_PROXY_CONFIG::default();
        let has_ie = WinHttpGetIEProxyConfigForCurrentUser(&mut ie) != 0;
        let (auto_detect, pac_url, manual_proxy) = if has_ie {
            (
                ie.fAutoDetect != 0,
                take_wide(ie.lpszAutoConfigUrl),
                take_wide(ie.lpszProxy),
            )
        } else {
            (false, None, None)
        };
        let _ = take_wide(ie.lpszProxyBypass);

        if pac_url.is_some() || auto_detect {
            result = proxies_from_pac(url, pac_url.as_deref(), auto_detect);
        }

        // Elle girilmiş proxy de yedek olarak denenir (güncelleyici bunu zaten okuyor olabilir).
        if let Some(manual) = manual_proxy {
            for proxy in parse_proxy_list(&manual) {
                if !result.contains(&proxy) {
                    result.push(proxy);
                }
            }
        }
    }
    result
}

/// PAC betiğini (veya WPAD otomatik algılamayı) çalıştırıp `url` için proxy listesini döndürür.
#[cfg(windows)]
pub fn proxies_from_pac(url: &str, pac_url: Option<&str>, auto_detect: bool) -> Vec<String> {
    use std::ptr::{null, null_mut};
    use windows_sys::Win32::Foundation::GetLastError;
    use windows_sys::Win32::Networking::WinHttp::*;

    let mut result: Vec<String> = Vec::new();
    unsafe {
        let agent = wide("UYAP Dosya Karsilastirma");
        let session = WinHttpOpen(
            agent.as_ptr(),
            WINHTTP_ACCESS_TYPE_NO_PROXY,
            null(),
            null(),
            0,
        );
        if !session.is_null() {
            let pac_wide = pac_url.map(wide);
            let target = wide(url);
            let mut options = WINHTTP_AUTOPROXY_OPTIONS::default();
            if let Some(pac) = &pac_wide {
                options.dwFlags |= WINHTTP_AUTOPROXY_CONFIG_URL;
                options.lpszAutoConfigUrl = pac.as_ptr();
            }
            if auto_detect {
                options.dwFlags |= WINHTTP_AUTOPROXY_AUTO_DETECT;
                options.dwAutoDetectFlags =
                    WINHTTP_AUTO_DETECT_TYPE_DHCP | WINHTTP_AUTO_DETECT_TYPE_DNS_A;
            }
            options.lpvReserved = null_mut();

            // Önce kimlik bilgisi göndermeden, PAC sunucusu isterse Windows oturumuyla dene.
            for auto_logon in [0, 1] {
                options.fAutoLogonIfChallenged = auto_logon;
                let mut info = WINHTTP_PROXY_INFO::default();
                if WinHttpGetProxyForUrl(session, target.as_ptr(), &mut options, &mut info) != 0 {
                    let proxy = take_wide(info.lpszProxy);
                    let _ = take_wide(info.lpszProxyBypass);
                    if info.dwAccessType == WINHTTP_ACCESS_TYPE_NAMED_PROXY {
                        if let Some(proxy) = proxy {
                            result.extend(parse_proxy_list(&proxy));
                        }
                    }
                    break;
                }
                let code = GetLastError();
                if code != ERROR_WINHTTP_LOGIN_FAILURE {
                    log_error("PAC çözümlenemedi", code);
                    break;
                }
            }
            WinHttpCloseHandle(session);
        }
    }
    result
}

#[cfg(windows)]
fn log_error(context: &str, code: u32) {
    #[cfg(debug_assertions)]
    eprintln!("{context}: WinHTTP hata kodu {code}");
    #[cfg(not(debug_assertions))]
    let _ = (context, code);
}

#[cfg(not(windows))]
pub fn resolve_proxies(_url: &str) -> Vec<String> {
    Vec::new()
}

#[cfg(windows)]
pub fn open_in_browser(url: &str) -> Result<(), String> {
    use std::ptr::null;
    use windows_sys::Win32::UI::Shell::ShellExecuteW;
    use windows_sys::Win32::UI::WindowsAndMessaging::SW_SHOWNORMAL;

    let operation: Vec<u16> = "open\0".encode_utf16().collect();
    let target: Vec<u16> = url.encode_utf16().chain(std::iter::once(0)).collect();
    // ShellExecuteW başarıda 32'den büyük bir değer döndürür.
    let code = unsafe {
        ShellExecuteW(
            std::ptr::null_mut(),
            operation.as_ptr(),
            target.as_ptr(),
            null(),
            null(),
            SW_SHOWNORMAL,
        )
    };
    if code as isize > 32 {
        Ok(())
    } else {
        Err(format!("Tarayıcı açılamadı (kod {})", code as isize))
    }
}

#[cfg(not(windows))]
pub fn open_in_browser(_url: &str) -> Result<(), String> {
    Err("Tarayıcıda açma yalnız Windows'ta destekleniyor".into())
}

#[cfg(test)]
mod tests {
    use super::parse_proxy_list;

    #[test]
    fn duz_liste() {
        assert_eq!(
            parse_proxy_list("proxy1.uyap.gov.tr:8080; proxy2.uyap.gov.tr:8080"),
            vec![
                "http://proxy1.uyap.gov.tr:8080",
                "http://proxy2.uyap.gov.tr:8080"
            ]
        );
    }

    #[test]
    fn sema_onekli_ve_direct() {
        assert_eq!(
            parse_proxy_list("http=p:3128;https=p:3128;ftp=f:21;DIRECT"),
            vec!["http://p:3128"]
        );
    }

    /// Yerel bir PAC dosyasıyla gerçek WinHTTP çözümlemesi:
    /// `PAC_TEST_URL=http://127.0.0.1:8765/test.pac cargo test -- --ignored`
    #[cfg(windows)]
    #[test]
    #[ignore]
    fn gercek_pac() {
        let pac = std::env::var("PAC_TEST_URL").expect("PAC_TEST_URL");
        let proxies =
            super::proxies_from_pac("https://github.com/x/latest.json", Some(&pac), false);
        assert_eq!(
            proxies,
            vec![
                "http://proxy.test.local:8080",
                "http://yedek.test.local:3128"
            ]
        );
        let direct = super::proxies_from_pac("http://intranet.local/", Some(&pac), false);
        assert!(direct.is_empty());
    }

    #[test]
    fn bos() {
        assert!(parse_proxy_list("").is_empty());
    }
}
