mod proxy;

/// Güncelleme adresi için Windows proxy ayarlarından (PAC dahil) proxy adaylarını döndürür.
#[tauri::command]
async fn resolve_update_proxies(url: String) -> Vec<String> {
    // PAC betiğini indirmek birkaç saniye sürebilir; arayüz iş parçacığını bekletmemek için ayrı iş parçacığında.
    tauri::async_runtime::spawn_blocking(move || proxy::resolve_proxies(&url))
        .await
        .unwrap_or_default()
}

/// Sürümler sayfasını varsayılan tarayıcıda açar. Adres sabittir; arayüzden gelen URL açılmaz.
#[tauri::command]
fn open_releases_page() -> Result<(), String> {
    proxy::open_in_browser(proxy::RELEASES_PAGE_URL)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_process::init())
        .invoke_handler(tauri::generate_handler![
            resolve_update_proxies,
            open_releases_page
        ])
        .setup(|app| {
            #[cfg(desktop)]
            app.handle()
                .plugin(tauri_plugin_updater::Builder::new().build())?;

            #[cfg(debug_assertions)]
            {
                use tauri::Manager;
                if let Some(window) = app.get_webview_window("main") {
                    window.open_devtools();
                }
            }
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
