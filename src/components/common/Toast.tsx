import React from 'react';
import { X, CheckCircle, AlertCircle, AlertTriangle, Info } from 'lucide-react';
import { useToast } from '../../context/ToastContext';
import { ToastMessage } from '../../types';

const ToastItem: React.FC<{ toast: ToastMessage; onRemove: (id: string) => void }> = ({
    toast,
    onRemove,
}) => {
    const icons = {
        success: <CheckCircle size={20} />,
        error: <AlertCircle size={20} />,
        warning: <AlertTriangle size={20} />,
        info: <Info size={20} />,
    };

    const colors = {
        success: {
            bg: 'var(--color-success-bg)',
            border: 'var(--color-success-border)',
            icon: 'var(--color-success)',
        },
        error: {
            bg: 'var(--color-error-bg)',
            border: 'var(--color-error-border)',
            icon: 'var(--color-error)',
        },
        warning: {
            bg: 'var(--color-warning-bg)',
            border: 'var(--color-warning-border)',
            icon: 'var(--color-warning)',
        },
        info: {
            bg: 'var(--color-info-bg)',
            border: 'var(--color-info-border)',
            icon: 'var(--color-info)',
        },
    };

    const color = colors[toast.type];

    return (
        <div
            className="animate-slide-up"
            style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: '0.75rem',
                padding: '1rem',
                backgroundColor: color.bg,
                border: `1px solid ${color.border}`,
                borderRadius: 'var(--radius-lg)',
                boxShadow: 'var(--shadow-lg)',
                minWidth: '300px',
                maxWidth: '400px',
            }}
        >
            <div style={{ color: color.icon, flexShrink: 0, marginTop: '2px' }}>{icons[toast.type]}</div>

            <div style={{ flex: 1 }}>
                <div
                    style={{
                        fontWeight: 600,
                        fontSize: '0.875rem',
                        color: 'var(--text-primary)',
                        marginBottom: toast.message ? '0.25rem' : 0,
                    }}
                >
                    {toast.title}
                </div>
                {toast.message && (
                    <div
                        style={{
                            fontSize: '0.8125rem',
                            color: 'var(--text-secondary)',
                        }}
                    >
                        {toast.message}
                    </div>
                )}
            </div>

            <button
                onClick={() => onRemove(toast.id)}
                style={{
                    background: 'none',
                    border: 'none',
                    padding: '0.25rem',
                    cursor: 'pointer',
                    color: 'var(--text-tertiary)',
                    borderRadius: 'var(--radius-sm)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    transition: 'color var(--transition-fast)',
                }}
                onMouseOver={(e) => (e.currentTarget.style.color = 'var(--text-primary)')}
                onMouseOut={(e) => (e.currentTarget.style.color = 'var(--text-tertiary)')}
            >
                <X size={16} />
            </button>
        </div>
    );
};

export const ToastContainer: React.FC = () => {
    const { toasts, removeToast } = useToast();

    if (toasts.length === 0) return null;

    return (
        <div
            style={{
                position: 'fixed',
                bottom: '1.5rem',
                right: '1.5rem',
                zIndex: 9999,
                display: 'flex',
                flexDirection: 'column',
                gap: '0.75rem',
            }}
        >
            {toasts.map((toast) => (
                <ToastItem key={toast.id} toast={toast} onRemove={removeToast} />
            ))}
        </div>
    );
};
