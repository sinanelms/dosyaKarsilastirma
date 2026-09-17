import { useSyncExternalStore } from 'react';
import type { Update } from '@tauri-apps/plugin-updater';
import { isTauri } from '../lib/tauri';

export interface UpdateInfo {
    version: string;
    date?: string;
    body?: string;
    available: boolean;
}

export interface UpdateProgress {
    downloaded: number;
    total: number;
}

interface UpdateState {
    updateInfo: UpdateInfo | null;
    isChecking: boolean;
    isDownloading: boolean;
    downloadProgress: UpdateProgress | null;
    error: string | null;
    /** Bildirim kartı kapatıldı; güncelleme bilgisi (ve başlıktaki Güncelle butonu) korunur. */
    notificationDismissed: boolean;
    /** Uygulama içinden güncellenemedi; kullanıcıya sürümü tarayıcıdan indirme yolu gösterilir. */
    browserFallback: boolean;
}

/*
 * Güncelleme durumu modül düzeyinde tek bir depoda tutulur. Böylece başlıktaki "Güncelle" butonu
 * ile UpdateNotification bileşeni aynı durumu görür (önceden her biri ayrı hook kopyası kullanıyordu).
 */
let state: UpdateState = {
    updateInfo: null,
    isChecking: false,
    isDownloading: false,
    downloadProgress: null,
    error: null,
    notificationDismissed: false,
    browserFallback: false,
};
let pendingUpdate: Update | null = null;
/** En son başarılı olan yol; sonraki kontrollerde önce o denenir (null: doğrudan bağlantı). */
let workingProxy: string | null | undefined;

/** tauri.conf.json'daki güncelleme adresiyle aynı; proxy bu adres için sorulur. */
const UPDATE_ENDPOINT = 'https://github.com/sinanelms/dosyaKarsilastirma/releases/latest/download/latest.json';
const RELEASES_PAGE = 'https://github.com/sinanelms/dosyaKarsilastirma/releases/latest';
/** Kapalı bir ağda bağlantı denemesi uzun sürmesin diye her denemenin süre sınırı. */
const CHECK_TIMEOUT_MS = 15_000;
/** Başka bir ağ yolu denendiğinde sonucu değişebilecek (bağlantı kaynaklı) hatalar. */
const CONNECTION_ERROR = /(dns|connect|network|timed? ?out|error sending request|proxy|status code)/i;
let backgroundChecksScheduled = false;

/** Uygulama uzun süre açık kalırsa yeni sürümün yine de fark edilmesi için arka plan kontrol aralığı. */
const BACKGROUND_CHECK_INTERVAL_MS = 4 * 60 * 60 * 1000;
const listeners = new Set<() => void>();

const setState = (patch: Partial<UpdateState>) => {
    state = { ...state, ...patch };
    listeners.forEach((listener) => listener());
};

const subscribe = (listener: () => void) => {
    listeners.add(listener);
    return () => listeners.delete(listener);
};

const rawErrorMessage = (err: unknown, fallback: string) =>
    err instanceof Error ? err.message : typeof err === 'string' ? err : fallback;

/** Tauri güncelleyicisinin İngilizce hatalarını kullanıcıya anlaşılır Türkçe açıklamaya çevirir. */
const errorMessage = (err: unknown, fallback: string) => {
    const message = rawErrorMessage(err, fallback);
    if (/valid release JSON/i.test(message)) {
        return 'Sunucuda yayınlanmış güncelleme bilgisi (latest.json) bulunamadı. Yeni sürüm henüz yayınlanmamış olabilir.';
    }
    if (/signature/i.test(message)) return 'Güncelleme dosyasının imzası doğrulanamadı; kurulum yapılmadı.';
    if (CONNECTION_ERROR.test(message)) {
        return 'Güncelleme sunucusuna bağlanılamadı (kurum proxy ayarı da denendi). Yeni sürümü tarayıcıdan indirebilirsiniz.';
    }
    return message;
};

export type CheckResult = 'available' | 'up-to-date' | 'error';

/**
 * Güncellemeyi sırayla farklı yollarla arar; biri bağlantı hatası verirse sonraki denenir:
 *  1. Son başarılı yol (varsa)
 *  2. Doğrudan (Windows'a elle girilmiş proxy varsa güncelleyici onu kullanır)
 *  3. Windows proxy ayarlarından (PAC betiği / otomatik algılama) bulunan her proxy
 * Seçilen proxy Update nesnesinde saklanır; indirme de aynı yoldan yapılır.
 */
const checkWithFallbacks = async (): Promise<Update | null> => {
    const [{ check }, { invoke }] = await Promise.all([
        import('@tauri-apps/plugin-updater'),
        import('@tauri-apps/api/core'),
    ]);

    let lastError: unknown = new Error('Güncelleme kontrolü başarısız');
    const tried = new Set<string | null>();
    const tryRoute = async (proxy: string | null): Promise<{ update: Update | null } | null> => {
        if (tried.has(proxy)) return null;
        tried.add(proxy);
        try {
            const update = await check(proxy ? { proxy, timeout: CHECK_TIMEOUT_MS } : { timeout: CHECK_TIMEOUT_MS });
            workingProxy = proxy;
            return { update };
        } catch (err) {
            // İmza/format hataları bağlantı sorunu değildir; başka yol denemek sonucu değiştirmez.
            if (!CONNECTION_ERROR.test(rawErrorMessage(err, ''))) throw err;
            lastError = err;
            return null;
        }
    };

    const routes: Array<() => Promise<Array<string | null>>> = [
        async () => (workingProxy === undefined ? [] : [workingProxy]),
        async () => [null],
        () => invoke<string[]>('resolve_update_proxies', { url: UPDATE_ENDPOINT }).catch(() => []),
    ];
    for (const route of routes) {
        for (const proxy of await route()) {
            const result = await tryRoute(proxy);
            if (result) return result.update;
        }
    }
    throw lastError;
};

/** Sürümler sayfasını varsayılan tarayıcıda açar (uygulama içinden güncelleme mümkün olmadığında). */
export const openReleasesPage = async (): Promise<void> => {
    if (!isTauri()) {
        window.open(RELEASES_PAGE, '_blank', 'noopener');
        return;
    }
    try {
        const { invoke } = await import('@tauri-apps/api/core');
        await invoke('open_releases_page');
    } catch (err) {
        setState({ error: rawErrorMessage(err, 'Tarayıcı açılamadı') });
    }
};

/** Güncelleme var mı diye bakar. */
export const checkForUpdates = async (): Promise<CheckResult> => {
    if (!isTauri()) {
        setState({ error: 'Güncelleme kontrolü sadece masaüstü uygulamasında çalışır.' });
        return 'error';
    }
    if (state.isChecking) return 'error';

    setState({ isChecking: true, error: null });
    try {
        const previousVersion = state.updateInfo?.available ? state.updateInfo.version : null;
        pendingUpdate = await checkWithFallbacks();
        setState({
            browserFallback: false,
            updateInfo: pendingUpdate
                ? { version: pendingUpdate.version, date: pendingUpdate.date, body: pendingUpdate.body, available: true }
                : { version: '', available: false },
            // Kapatılan bildirim ancak daha yeni bir sürüm çıkınca yeniden gösterilir.
            notificationDismissed: !!pendingUpdate && state.notificationDismissed && pendingUpdate.version === previousVersion,
        });
        return pendingUpdate ? 'available' : 'up-to-date';
    } catch (err) {
        setState({ error: errorMessage(err, 'Güncelleme kontrolü başarısız'), browserFallback: true });
        return 'error';
    } finally {
        setState({ isChecking: false });
    }
};

export const downloadAndInstall = async (): Promise<void> => {
    if (!isTauri() || !pendingUpdate) return;

    setState({ isDownloading: true, error: null });
    try {
        const { relaunch } = await import('@tauri-apps/plugin-process');
        let downloaded = 0;
        await pendingUpdate.downloadAndInstall((event) => {
            if (event.event === 'Started') {
                downloaded = 0;
                setState({ downloadProgress: { downloaded: 0, total: event.data.contentLength ?? 0 } });
            } else if (event.event === 'Progress') {
                downloaded += event.data.chunkLength;
                setState({ downloadProgress: { downloaded, total: state.downloadProgress?.total ?? 0 } });
            } else if (event.event === 'Finished') {
                setState({ downloadProgress: null });
            }
        });
        await relaunch();
    } catch (err) {
        setState({ error: errorMessage(err, 'Güncelleme indirilemedi'), isDownloading: false, browserFallback: true });
    }
};

/** Bildirim kartını kapatır; güncelleme varsa başlıktaki Güncelle butonu görünmeye devam eder. */
export const dismissUpdate = () => setState({ notificationDismissed: true, error: null, browserFallback: false });

/** Arka plan kontrolü: ağ hatası kullanıcıya gösterilmez. */
const silentCheck = () => {
    if (state.isDownloading) return;
    checkForUpdates().then((result) => {
        if (result === 'error') setState({ error: null, browserFallback: false });
    });
};

export const useAutoUpdate = () => {
    const snapshot = useSyncExternalStore(subscribe, () => state);

    // Masaüstünde açılıştan birkaç saniye sonra ve sonra belirli aralıklarla sessizce kontrol et.
    if (!backgroundChecksScheduled && isTauri()) {
        backgroundChecksScheduled = true;
        setTimeout(silentCheck, 3000);
        setInterval(silentCheck, BACKGROUND_CHECK_INTERVAL_MS);
    }

    return { ...snapshot, checkForUpdates, downloadAndInstall, dismissUpdate, openReleasesPage };
};
