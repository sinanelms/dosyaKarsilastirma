import { useState, useEffect, useCallback } from 'react';
import { useAutoUpdate } from './useAutoUpdate';

interface UseUpdateButtonReturn {
    isConnected: boolean;
    isChecking: boolean;
    handleUpdateClick: () => Promise<void>;
}

// Check if running in Tauri environment
const isTauri = () => {
    return typeof window !== 'undefined' && '__TAURI__' in window;
};

export const useUpdateButton = (): UseUpdateButtonReturn => {
    const [isConnected, setIsConnected] = useState(true); // Optimistic default
    const [isChecking, setIsChecking] = useState(false);
    const { checkForUpdates } = useAutoUpdate();

    // Check GitHub connection
    const checkConnection = useCallback(async () => {
        // Only check connection in Tauri environment
        if (!isTauri()) {
            console.log('🔴 useUpdateButton: Tauri ortamı değil, buton devre dışı');
            setIsConnected(false);
            return false;
        }

        console.log('🔍 useUpdateButton: GitHub bağlantısı kontrol ediliyor...');

        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 saniye timeout

            const response = await fetch(
                'https://api.github.com/repos/sinanelms/dosyaKarsilastirma/releases/latest',
                {
                    method: 'GET',
                    headers: {
                        'Accept': 'application/vnd.github.v3+json',
                    },
                    signal: controller.signal,
                }
            );

            clearTimeout(timeoutId);

            // If 404, it means no releases yet but repo is accessible
            if (response.status === 404) {
                console.log('⚠️ Henüz release yok, ancak repository erişilebilir - buton yeşil');
                setIsConnected(true);
                return true;
            }

            const connected = response.ok;
            console.log(connected ? '✅ GitHub bağlantısı başarılı' : `⚠️ GitHub yanıt verdi ama başarısız: ${response.status}`);
            setIsConnected(connected);
            return connected;
        } catch (error) {
            console.error('❌ useUpdateButton: GitHub bağlantı hatası:', error);
            setIsConnected(false);
            return false;
        }
    }, []);

    // Handle update button click
    const handleUpdateClick = useCallback(async () => {
        setIsChecking(true);
        try {
            await checkForUpdates();
        } finally {
            setIsChecking(false);
        }
    }, [checkForUpdates]);

    // Check connection on mount
    useEffect(() => {
        checkConnection();
    }, [checkConnection]);

    // Periodic connection check every 30 seconds
    useEffect(() => {
        const interval = setInterval(() => {
            checkConnection();
        }, 30000);

        return () => clearInterval(interval);
    }, [checkConnection]);

    return {
        isConnected,
        isChecking,
        handleUpdateClick,
    };
};
