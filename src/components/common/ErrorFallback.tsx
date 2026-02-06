import React from 'react';
import { FallbackProps } from 'react-error-boundary';
import { AlertTriangle, RefreshCcw, Bug } from 'lucide-react';

export const ErrorFallback: React.FC<FallbackProps> = ({ error, resetErrorBoundary }) => {
    return (
        <div
            role="alert"
            style={{
                minHeight: '100vh',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: 'var(--bg-secondary)',
                padding: '2rem',
            }}
        >
            <div
                style={{
                    maxWidth: '500px',
                    backgroundColor: 'var(--bg-card)',
                    borderRadius: 'var(--radius-xl)',
                    padding: '2rem',
                    boxShadow: 'var(--shadow-xl)',
                    border: '1px solid var(--border-primary)',
                    textAlign: 'center',
                }}
            >
                <div
                    style={{
                        width: '64px',
                        height: '64px',
                        borderRadius: '50%',
                        backgroundColor: 'var(--color-error-bg)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        margin: '0 auto 1.5rem',
                    }}
                >
                    <AlertTriangle size={32} style={{ color: 'var(--color-error)' }} />
                </div>

                <h2
                    style={{
                        fontSize: '1.5rem',
                        fontWeight: 'bold',
                        color: 'var(--text-primary)',
                        marginBottom: '0.5rem',
                    }}
                >
                    Beklenmeyen Bir Hata Oluştu
                </h2>

                <p
                    style={{
                        color: 'var(--text-secondary)',
                        marginBottom: '1.5rem',
                    }}
                >
                    Uygulama bir sorunla karşılaştı. Lütfen tekrar deneyin veya sayfayı yenileyin.
                </p>

                <details
                    style={{
                        backgroundColor: 'var(--bg-tertiary)',
                        borderRadius: 'var(--radius-md)',
                        padding: '1rem',
                        marginBottom: '1.5rem',
                        textAlign: 'left',
                    }}
                >
                    <summary
                        style={{
                            cursor: 'pointer',
                            color: 'var(--text-secondary)',
                            fontSize: '0.875rem',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.5rem',
                        }}
                    >
                        <Bug size={16} />
                        Hata Detayları
                    </summary>
                    <pre
                        style={{
                            marginTop: '0.75rem',
                            fontSize: '0.75rem',
                            color: 'var(--color-error)',
                            whiteSpace: 'pre-wrap',
                            wordBreak: 'break-word',
                            fontFamily: 'var(--font-mono)',
                        }}
                    >
                        {error.message}
                    </pre>
                </details>

                <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center' }}>
                    <button
                        onClick={resetErrorBoundary}
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.5rem',
                            padding: '0.75rem 1.5rem',
                            backgroundColor: 'var(--color-primary)',
                            color: 'white',
                            border: 'none',
                            borderRadius: 'var(--radius-md)',
                            fontWeight: '600',
                            fontSize: '0.875rem',
                            cursor: 'pointer',
                            transition: 'background-color var(--transition-fast)',
                        }}
                        onMouseOver={(e) =>
                            (e.currentTarget.style.backgroundColor = 'var(--color-primary-hover)')
                        }
                        onMouseOut={(e) =>
                            (e.currentTarget.style.backgroundColor = 'var(--color-primary)')
                        }
                    >
                        <RefreshCcw size={16} />
                        Tekrar Dene
                    </button>

                    <button
                        onClick={() => window.location.reload()}
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.5rem',
                            padding: '0.75rem 1.5rem',
                            backgroundColor: 'transparent',
                            color: 'var(--text-secondary)',
                            border: '1px solid var(--border-secondary)',
                            borderRadius: 'var(--radius-md)',
                            fontWeight: '500',
                            fontSize: '0.875rem',
                            cursor: 'pointer',
                            transition: 'all var(--transition-fast)',
                        }}
                        onMouseOver={(e) => {
                            e.currentTarget.style.backgroundColor = 'var(--bg-hover)';
                        }}
                        onMouseOut={(e) => {
                            e.currentTarget.style.backgroundColor = 'transparent';
                        }}
                    >
                        Sayfayı Yenile
                    </button>
                </div>
            </div>
        </div>
    );
};
