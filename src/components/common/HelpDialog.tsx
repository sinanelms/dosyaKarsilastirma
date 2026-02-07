import React, { useEffect, useRef } from 'react';
import {
    HelpCircle,
    X,
    Keyboard,
    FileOutput,
    Download,
    Printer,
    Moon,
    Sun,
    ClipboardPaste,
} from 'lucide-react';

interface HelpDialogProps {
    isOpen: boolean;
    onClose: () => void;
}

export function HelpDialog({ isOpen, onClose }: HelpDialogProps) {
    const dialogRef = useRef<HTMLDivElement>(null);
    const closeButtonRef = useRef<HTMLButtonElement>(null);

    // ESC tuşu ile kapat
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape' && isOpen) {
                onClose();
            }
        };

        if (isOpen) {
            document.addEventListener('keydown', handleKeyDown);
            // Focus trap - modal açıldığında close butonuna odaklan
            closeButtonRef.current?.focus();
            // Body scroll'u engelle
            document.body.style.overflow = 'hidden';
        }

        return () => {
            document.removeEventListener('keydown', handleKeyDown);
            document.body.style.overflow = '';
        };
    }, [isOpen, onClose]);

    // Overlay tıklaması ile kapat
    const handleOverlayClick = (e: React.MouseEvent) => {
        if (e.target === e.currentTarget) {
            onClose();
        }
    };

    if (!isOpen) return null;

    return (
        <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="help-dialog-title"
            aria-describedby="help-dialog-description"
            onClick={handleOverlayClick}
            style={{
                position: 'fixed',
                inset: 0,
                backgroundColor: 'rgba(0, 0, 0, 0.5)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 1000,
                padding: '1rem',
            }}
            className="animate-fade-in"
        >
            <div
                ref={dialogRef}
                style={{
                    backgroundColor: 'var(--bg-card)',
                    borderRadius: 'var(--radius-xl)',
                    boxShadow: 'var(--shadow-xl)',
                    maxWidth: '600px',
                    width: '100%',
                    maxHeight: '85vh',
                    overflow: 'hidden',
                    display: 'flex',
                    flexDirection: 'column',
                }}
                className="animate-slide-up"
            >
                {/* Header */}
                <div
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '1rem 1.5rem',
                        borderBottom: '1px solid var(--border-primary)',
                    }}
                >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <div
                            style={{
                                backgroundColor: 'var(--color-primary-light)',
                                padding: '0.5rem',
                                borderRadius: 'var(--radius-md)',
                            }}
                        >
                            <HelpCircle size={20} style={{ color: 'var(--color-primary)' }} />
                        </div>
                        <h2
                            id="help-dialog-title"
                            style={{
                                fontSize: '1.125rem',
                                fontWeight: 'bold',
                                color: 'var(--text-primary)',
                            }}
                        >
                            Kullanım Kılavuzu
                        </h2>
                    </div>
                    <button
                        ref={closeButtonRef}
                        onClick={onClose}
                        aria-label="Yardım penceresini kapat"
                        style={{
                            padding: '0.5rem',
                            borderRadius: 'var(--radius-md)',
                            border: 'none',
                            backgroundColor: 'transparent',
                            color: 'var(--text-tertiary)',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                        }}
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Content */}
                <div
                    id="help-dialog-description"
                    style={{
                        padding: '1.5rem',
                        overflowY: 'auto',
                        flex: 1,
                    }}
                    className="custom-scrollbar"
                >
                    {/* Hakkında */}
                    <section style={{ marginBottom: '1.5rem' }}>
                        <h3
                            style={{
                                fontSize: '1rem',
                                fontWeight: 600,
                                color: 'var(--text-primary)',
                                marginBottom: '0.75rem',
                            }}
                        >
                            📋 Uygulama Hakkında
                        </h3>
                        <p
                            style={{
                                fontSize: '0.875rem',
                                color: 'var(--text-secondary)',
                                lineHeight: 1.6,
                            }}
                        >
                            UYAP Dosya Karşılaştırma, Cumhuriyet Başsavcılıkları için geliştirilmiş
                            bir analiz aracıdır. İki farklı kişinin UYAP sistemindeki dosyalarını
                            karşılaştırarak ortak dosyaları tespit eder.
                        </p>
                    </section>

                    {/* Nasıl Kullanılır */}
                    <section style={{ marginBottom: '1.5rem' }}>
                        <h3
                            style={{
                                fontSize: '1rem',
                                fontWeight: 600,
                                color: 'var(--text-primary)',
                                marginBottom: '0.75rem',
                            }}
                        >
                            🚀 Nasıl Kullanılır?
                        </h3>
                        <ol
                            style={{
                                fontSize: '0.875rem',
                                color: 'var(--text-secondary)',
                                lineHeight: 1.8,
                                paddingLeft: '1.25rem',
                            }}
                        >
                            <li style={{ marginBottom: '0.5rem' }}>
                                <strong>1.</strong> UYAP sisteminden karşılaştırmak istediğiniz
                                verileri kopyalayın (Ctrl+C)
                            </li>
                            <li style={{ marginBottom: '0.5rem' }}>
                                <strong>2.</strong> Sol panele birinci kişinin verilerini yapıştırın
                            </li>
                            <li style={{ marginBottom: '0.5rem' }}>
                                <strong>3.</strong> Sağ panele ikinci kişinin verilerini yapıştırın
                            </li>
                            <li style={{ marginBottom: '0.5rem' }}>
                                <strong>4.</strong> "Karşılaştır" butonuna tıklayın
                            </li>
                            <li>
                                <strong>5.</strong> Ortak dosyalar tabloda listelenecektir
                            </li>
                        </ol>
                    </section>

                    {/* Özellikler */}
                    <section style={{ marginBottom: '1.5rem' }}>
                        <h3
                            style={{
                                fontSize: '1rem',
                                fontWeight: 600,
                                color: 'var(--text-primary)',
                                marginBottom: '0.75rem',
                            }}
                        >
                            ✨ Özellikler
                        </h3>
                        <div
                            style={{
                                display: 'grid',
                                gridTemplateColumns: 'repeat(2, 1fr)',
                                gap: '0.75rem',
                            }}
                        >
                            {[
                                { icon: ClipboardPaste, text: 'Hızlı yapıştırma' },
                                { icon: FileOutput, text: 'Akıllı karşılaştırma' },
                                { icon: Printer, text: 'PDF dışa aktarım' },
                                { icon: Download, text: 'Excel/CSV desteği' },
                                { icon: Moon, text: 'Koyu tema' },
                                { icon: Sun, text: 'Açık tema' },
                            ].map((item, index) => (
                                <div
                                    key={index}
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '0.5rem',
                                        padding: '0.5rem 0.75rem',
                                        backgroundColor: 'var(--bg-tertiary)',
                                        borderRadius: 'var(--radius-md)',
                                        fontSize: '0.8125rem',
                                        color: 'var(--text-secondary)',
                                    }}
                                >
                                    <item.icon size={16} style={{ color: 'var(--color-primary)' }} />
                                    {item.text}
                                </div>
                            ))}
                        </div>
                    </section>

                    {/* Klavye Kısayolları */}
                    <section>
                        <h3
                            style={{
                                fontSize: '1rem',
                                fontWeight: 600,
                                color: 'var(--text-primary)',
                                marginBottom: '0.75rem',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.5rem',
                            }}
                        >
                            <Keyboard size={18} />
                            Klavye Kısayolları
                        </h3>
                        <div
                            style={{
                                backgroundColor: 'var(--bg-tertiary)',
                                borderRadius: 'var(--radius-lg)',
                                padding: '1rem',
                            }}
                        >
                            {[
                                { keys: 'Ctrl + K', action: 'Karşılaştırmayı başlat' },
                                { keys: 'Ctrl + S', action: 'CSV olarak indir' },
                                { keys: 'Escape', action: 'Açık modalı kapat' },
                            ].map((shortcut, index) => (
                                <div
                                    key={index}
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'space-between',
                                        padding: '0.5rem 0',
                                        borderBottom:
                                            index < 2 ? '1px solid var(--border-primary)' : 'none',
                                    }}
                                >
                                    <kbd
                                        style={{
                                            backgroundColor: 'var(--bg-card)',
                                            padding: '0.25rem 0.5rem',
                                            borderRadius: 'var(--radius-sm)',
                                            fontSize: '0.8125rem',
                                            fontFamily: 'var(--font-mono)',
                                            color: 'var(--text-primary)',
                                            border: '1px solid var(--border-secondary)',
                                        }}
                                    >
                                        {shortcut.keys}
                                    </kbd>
                                    <span
                                        style={{
                                            fontSize: '0.875rem',
                                            color: 'var(--text-secondary)',
                                        }}
                                    >
                                        {shortcut.action}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </section>
                </div>

                {/* Footer */}
                <div
                    style={{
                        padding: '1rem 1.5rem',
                        borderTop: '1px solid var(--border-primary)',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                    }}
                >
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>
                        Versiyon 1.0.0
                    </span>
                    <button
                        onClick={onClose}
                        style={{
                            padding: '0.5rem 1rem',
                            backgroundColor: 'var(--color-primary)',
                            color: 'white',
                            border: 'none',
                            borderRadius: 'var(--radius-md)',
                            fontSize: '0.875rem',
                            fontWeight: 500,
                            cursor: 'pointer',
                        }}
                    >
                        Anladım
                    </button>
                </div>
            </div>
        </div>
    );
}
