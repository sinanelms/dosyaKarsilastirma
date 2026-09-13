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
}

/*
 * Güncelleme durumu modül düzeyinde tek bir depoda tutulur. Böylece başlıktaki "Güncelle" butonu
 * ile UpdateNotification bileşeni aynı durumu görür (önceden her biri ayrı hook kopyası kullanıyordu).
 */
let state: UpdateState = { updateInfo: null, isChecking: false, isDownloading: false, downloadProgress: null, error: null };
let pendingUpdate: Update | null = null;
let startupCheckScheduled = false;
const listeners = new Set<() => void>();

const setState = (patch: Partial<UpdateState>) => {
    state = { ...state, ...patch };
    listeners.forEach((listener) => listener());
};

const subscribe = (listener: () => void) => {
    listeners.add(listener);
    return () => listeners.delete(listener);
};

const errorMessage = (err: unknown, fallback: string) =>
    err instanceof Error ? err.message : typeof err === 'string' ? err : fallback;

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
        pendingUpdate = await check();
        setState({
            updateInfo: pendingUpdate
                ? { version: pendingUpdate.version, date: pendingUpdate.date, body: pendingUpdate.body, available: true }
                : { version: '', available: false },
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

export const dismissUpdate = () => setState({ updateInfo: null, error: null });

export const useAutoUpdate = () => {
    const snapshot = useSyncExternalStore(subscribe, () => state);

    // Masaüstünde açılıştan birkaç saniye sonra bir kez sessizce kontrol et.
    if (!startupCheckScheduled && isTauri()) {
        startupCheckScheduled = true;
        setTimeout(() => {
            checkForUpdates().then(() => {
                // Açılıştaki sessiz kontrolde ağ hatası kullanıcıya gösterilmez.
                if (!state.updateInfo?.available) setState({ error: null });
            });
        }, 3000);
    }

    return { ...snapshot, checkForUpdates, downloadAndInstall, dismissUpdate };
};
