import { useAutoUpdate } from './useAutoUpdate';
import { isTauri } from '../lib/tauri';

interface UseUpdateButtonReturn {
    /** Buton yalnız masaüstü uygulamasında ve yeni bir sürüm bulunduğunda gösterilir. */
    isVisible: boolean;
    version: string | null;
    isDownloading: boolean;
    /** 0-100; boyut bilinmiyorsa null. */
    progressPercent: number | null;
    handleUpdateClick: () => Promise<void>;
}

export const useUpdateButton = (): UseUpdateButtonReturn => {
    const { updateInfo, isDownloading, downloadProgress, downloadAndInstall } = useAutoUpdate();
    const hasUpdate = isTauri() && !!updateInfo?.available;

    return {
        isVisible: hasUpdate,
        version: hasUpdate ? updateInfo.version : null,
        isDownloading,
        progressPercent:
            downloadProgress && downloadProgress.total > 0
                ? Math.round((downloadProgress.downloaded / downloadProgress.total) * 100)
                : null,
        handleUpdateClick: downloadAndInstall,
    };
};
