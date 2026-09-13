import { useCallback } from 'react';
import { useAutoUpdate } from './useAutoUpdate';
import { useToast } from '../context';
import { isTauri } from '../lib/tauri';

interface UseUpdateButtonReturn {
    /** Güncelleyici yalnız masaüstü uygulamasında kullanılabilir. */
    isAvailable: boolean;
    isChecking: boolean;
    handleUpdateClick: () => Promise<void>;
}

export const useUpdateButton = (): UseUpdateButtonReturn => {
    const { isChecking, checkForUpdates } = useAutoUpdate();
    const toast = useToast();

    const handleUpdateClick = useCallback(async () => {
        if ((await checkForUpdates()) === 'up-to-date') {
            toast.info('Uygulama güncel.');
        }
    }, [checkForUpdates, toast]);

    return { isAvailable: isTauri(), isChecking, handleUpdateClick };
};
