import React, { createContext, useContext, useState, useCallback } from 'react';
import { ToastMessage } from '../types';

interface ToastContextType {
    toasts: ToastMessage[];
    addToast: (toast: Omit<ToastMessage, 'id'>) => void;
    removeToast: (id: string) => void;
    success: (title: string, message?: string) => void;
    error: (title: string, message?: string) => void;
    warning: (title: string, message?: string) => void;
    info: (title: string, message?: string) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

const generateId = () => Math.random().toString(36).substring(2, 9);

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [toasts, setToasts] = useState<ToastMessage[]>([]);

    const removeToast = useCallback((id: string) => {
        setToasts((prev) => prev.filter((toast) => toast.id !== id));
    }, []);

    const addToast = useCallback(
        (toast: Omit<ToastMessage, 'id'>) => {
            const id = generateId();
            const newToast: ToastMessage = {
                ...toast,
                id,
                duration: toast.duration ?? 4000,
            };

            setToasts((prev) => [...prev, newToast]);

            // Auto remove after duration
            if (newToast.duration && newToast.duration > 0) {
                setTimeout(() => {
                    removeToast(id);
                }, newToast.duration);
            }
        },
        [removeToast]
    );

    const success = useCallback(
        (title: string, message?: string) => {
            addToast({ type: 'success', title, message });
        },
        [addToast]
    );

    const error = useCallback(
        (title: string, message?: string) => {
            addToast({ type: 'error', title, message, duration: 6000 });
        },
        [addToast]
    );

    const warning = useCallback(
        (title: string, message?: string) => {
            addToast({ type: 'warning', title, message });
        },
        [addToast]
    );

    const info = useCallback(
        (title: string, message?: string) => {
            addToast({ type: 'info', title, message });
        },
        [addToast]
    );

    return (
        <ToastContext.Provider
            value={{ toasts, addToast, removeToast, success, error, warning, info }}
        >
            {children}
        </ToastContext.Provider>
    );
};

export const useToast = (): ToastContextType => {
    const context = useContext(ToastContext);
    if (context === undefined) {
        throw new Error('useToast must be used within a ToastProvider');
    }
    return context;
};
