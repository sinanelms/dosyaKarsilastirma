import React from 'react';
import { Download, X, RefreshCcw, Loader2 } from 'lucide-react';
import { useAutoUpdate } from '../../hooks/useAutoUpdate';

export const UpdateNotification: React.FC = () => {
    const {
        updateInfo,
        isChecking,
        isDownloading,
        downloadProgress,
        error,
        checkForUpdates,
        downloadAndInstall,
        dismissUpdate,
    } = useAutoUpdate();

    // Don't show if no update or update not available
    if (!updateInfo?.available && !isChecking && !error) {
        return null;
    }

    const progressPercent =
        downloadProgress && downloadProgress.total > 0
            ? Math.round((downloadProgress.downloaded / downloadProgress.total) * 100)
            : 0;

    return (
        <div
            className="animate-slide-down"
            style={{
                position: 'fixed',
                top: '1rem',
                right: '1rem',
                zIndex: 9998,
                backgroundColor: 'var(--bg-card)',
                border: '1px solid var(--border-primary)',
                borderRadius: 'var(--radius-lg)',
                boxShadow: 'var(--shadow-xl)',
                padding: '1rem',
                minWidth: '320px',
                maxWidth: '400px',
            }}
        >
            {/* Header */}
            <div
                style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    marginBottom: '0.75rem',
                }}
            >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <div
                        style={{
                            width: '32px',
                            height: '32px',
                            borderRadius: 'var(--radius-md)',
                            backgroundColor: 'var(--color-primary-light)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                        }}
                    >
                        <Download size={18} style={{ color: 'var(--color-primary)' }} />
                    </div>
                    <div>
                        <div style={{ fontWeight: 600, fontSize: '0.875rem', color: 'var(--text-primary)' }}>
                            Güncelleme Mevcut
                        </div>
                        {updateInfo?.version && (
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>
                                v{updateInfo.version}
                            </div>
                        )}
                    </div>
                </div>

                <button
                    onClick={dismissUpdate}
                    style={{
                        background: 'none',
                        border: 'none',
                        padding: '0.25rem',
                        cursor: 'pointer',
                        color: 'var(--text-tertiary)',
                        borderRadius: 'var(--radius-sm)',
                    }}
                >
                    <X size={18} />
                </button>
            </div>

            {/* Release Notes */}
            {updateInfo?.body && (
                <div
                    style={{
                        fontSize: '0.8125rem',
                        color: 'var(--text-secondary)',
                        marginBottom: '0.75rem',
                        padding: '0.5rem',
                        backgroundColor: 'var(--bg-tertiary)',
                        borderRadius: 'var(--radius-sm)',
                        maxHeight: '100px',
                        overflow: 'auto',
                    }}
                    className="custom-scrollbar"
                >
                    {updateInfo.body}
                </div>
            )}

            {/* Progress Bar */}
            {isDownloading && downloadProgress && (
                <div style={{ marginBottom: '0.75rem' }}>
                    <div
                        style={{
                            height: '6px',
                            backgroundColor: 'var(--bg-tertiary)',
                            borderRadius: 'var(--radius-full)',
                            overflow: 'hidden',
                        }}
                    >
                        <div
                            style={{
                                height: '100%',
                                width: `${progressPercent}%`,
                                backgroundColor: 'var(--color-primary)',
                                transition: 'width 200ms ease',
                            }}
                        />
                    </div>
                    <div
                        style={{
                            fontSize: '0.75rem',
                            color: 'var(--text-tertiary)',
                            textAlign: 'center',
                            marginTop: '0.25rem',
                        }}
                    >
                        İndiriliyor... {progressPercent}%
                    </div>
                </div>
            )}

            {/* Error */}
            {error && (
                <div
                    style={{
                        fontSize: '0.75rem',
                        color: 'var(--color-error)',
                        marginBottom: '0.75rem',
                        padding: '0.5rem',
                        backgroundColor: 'var(--color-error-bg)',
                        borderRadius: 'var(--radius-sm)',
                    }}
                >
                    {error}
                </div>
            )}

            {/* Actions */}
            <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button
                    onClick={downloadAndInstall}
                    disabled={isDownloading}
                    style={{
                        flex: 1,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '0.5rem',
                        padding: '0.625rem 1rem',
                        backgroundColor: 'var(--color-primary)',
                        color: 'white',
                        border: 'none',
                        borderRadius: 'var(--radius-md)',
                        fontWeight: 600,
                        fontSize: '0.8125rem',
                        cursor: isDownloading ? 'not-allowed' : 'pointer',
                        opacity: isDownloading ? 0.7 : 1,
                    }}
                >
                    {isDownloading ? (
                        <>
                            <Loader2 size={16} className="animate-spin" />
                            İndiriliyor...
                        </>
                    ) : (
                        <>
                            <Download size={16} />
                            Güncelle
                        </>
                    )}
                </button>

                {error && (
                    <button
                        onClick={checkForUpdates}
                        disabled={isChecking}
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            padding: '0.625rem',
                            backgroundColor: 'transparent',
                            color: 'var(--text-secondary)',
                            border: '1px solid var(--border-secondary)',
                            borderRadius: 'var(--radius-md)',
                            cursor: 'pointer',
                        }}
                    >
                        <RefreshCcw size={16} className={isChecking ? 'animate-spin' : ''} />
                    </button>
                )}
            </div>
        </div>
    );
};
