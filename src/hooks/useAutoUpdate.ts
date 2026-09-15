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
};
let pendingUpdate: Update | null = null;
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
    if (/(dns|connect|network|timed? ?out|error sending request)/i.test(message)) {
        return 'Güncelleme sunucusuna bağlanılamadı. İnternet bağlantınızı kontrol edin.';
    }
    return message;
};

export type CheckResult = 'available' | 'up-to-date' | 'error';

/** Güncelleme var mı diye bakar. */
export const checkForUpdates = async (): Promise<CheckResult> => {
    if (!isTauri()) {
        setState({ error: 'Güncelleme kontrolü sadece masaüstü uygulamasında çalışır.' });
        return 'error';
    }
    if (state.isChecking) return 'error';

    setState({ isChecking: true, error: null });
    try {
        const { check } = await import('@tauri-apps/plugin-updater');
        const previousVersion = state.updateInfo?.available ? state.updateInfo.version : null;
        pendingUpdate = await check();
        setState({
            updateInfo: pendingUpdate
                ? { version: pendingUpdate.version, date: pendingUpdate.date, body: pendingUpdate.body, available: true }
                : { version: '', available: false },
            // Kapatılan bildirim ancak daha yeni bir sürüm çıkınca yeniden gösterilir.
            notificationDismissed: !!pendingUpdate && state.notificationDismissed && pendingUpdate.version === previousVersion,
        });
        return pendingUpdate ? 'available' : 'up-to-date';
    } catch (err) {
        setState({ error: errorMessage(err, 'Güncelleme kontrolü başarısız') });
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
        setState({ error: errorMessage(err, 'Güncelleme indirilemedi'), isDownloading: false });
    }
};

/** Bildirim kartını kapatır; güncelleme varsa başlıktaki Güncelle butonu görünmeye devam eder. */
export const dismissUpdate = () => setState({ notificationDismissed: true, error: null });

/** Arka plan kontrolü: ağ hatası kullanıcıya gösterilmez. */
const silentCheck = () => {
    if (state.isDownloading) return;
    checkForUpdates().then((result) => {
        if (result === 'error') setState({ error: null });
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

    return { ...snapshot, checkForUpdates, downloadAndInstall, dismissUpdate };
};
