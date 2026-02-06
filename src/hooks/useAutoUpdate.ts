import { useState, useEffect, useCallback } from 'react';

// Type definitions for Tauri updater
interface UpdateInfo {
    version: string;
    date?: string;
    body?: string;
    available: boolean;
}

interface UpdateProgress {
    downloaded: number;
    total: number;
}

interface UseAutoUpdateReturn {
    updateInfo: UpdateInfo | null;
    isChecking: boolean;
    isDownloading: boolean;
    downloadProgress: UpdateProgress | null;
    error: string | null;
    checkForUpdates: () => Promise<void>;
    downloadAndInstall: () => Promise<void>;
    dismissUpdate: () => void;
}

// Check if running in Tauri environment
const isTauri = () => {
    return typeof window !== 'undefined' && '__TAURI__' in window;
};

export const useAutoUpdate = (): UseAutoUpdateReturn => {
    const [updateInfo, setUpdateInfo] = useState<UpdateInfo | null>(null);
    const [isChecking, setIsChecking] = useState(false);
    const [isDownloading, setIsDownloading] = useState(false);
    const [downloadProgress, setDownloadProgress] = useState<UpdateProgress | null>(null);
    const [error, setError] = useState<string | null>(null);

    const checkForUpdates = useCallback(async () => {
        if (!isTauri()) {
            setError('Güncelleme kontrolü sadece masaüstü uygulamasında çalışır.');
            return;
        }

        setIsChecking(true);
        setError(null);

        try {
            // Dynamic import for Tauri modules
            const { check } = await import('@tauri-apps/plugin-updater');
            const update = await check();

            if (update?.available) {
                setUpdateInfo({
                    version: update.version,
                    date: update.date,
                    body: update.body,
                    available: true,
                });
            } else {
                setUpdateInfo({ version: '', available: false });
            }
        } catch (err) {
            const message = err instanceof Error ? err.message : 'Güncelleme kontrolü başarısız';
            setError(message);
        } finally {
            setIsChecking(false);
        }
    }, []);

    const downloadAndInstall = useCallback(async () => {
        if (!isTauri() || !updateInfo?.available) return;

        setIsDownloading(true);
        setError(null);

        try {
            const { check } = await import('@tauri-apps/plugin-updater');
            const { relaunch } = await import('@tauri-apps/plugin-process');

            const update = await check();

            if (update) {
                await update.downloadAndInstall((event) => {
                    if (event.event === 'Started' && event.data.contentLength) {
                        setDownloadProgress({ downloaded: 0, total: event.data.contentLength });
                    } else if (event.event === 'Progress') {
                        setDownloadProgress((prev) =>
                            prev ? { ...prev, downloaded: prev.downloaded + event.data.chunkLength } : null
                        );
                    } else if (event.event === 'Finished') {
                        setDownloadProgress(null);
                    }
                });

                // Relaunch the app
                await relaunch();
            }
        } catch (err) {
            const message = err instanceof Error ? err.message : 'Güncelleme indirilemedi';
            setError(message);
            setIsDownloading(false);
        }
    }, [updateInfo]);

    const dismissUpdate = useCallback(() => {
        setUpdateInfo(null);
    }, []);

    // Check for updates on mount (with delay)
    useEffect(() => {
        if (isTauri()) {
            const timer = setTimeout(() => {
                checkForUpdates();
            }, 3000); // Check 3 seconds after app start

            return () => clearTimeout(timer);
        }
    }, [checkForUpdates]);

    return {
        updateInfo,
        isChecking,
        isDownloading,
        downloadProgress,
        error,
        checkForUpdates,
        downloadAndInstall,
        dismissUpdate,
    };
};
