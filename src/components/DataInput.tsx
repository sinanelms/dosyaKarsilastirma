import React, { useState, useRef } from 'react';
import { ClipboardPaste, Trash2, AlertCircle, FolderOpen, List, FileText, Keyboard } from 'lucide-react';
import { CaseRecord } from '../types';

interface DataInputProps {
    partyName: string;
    onNameChange: (val: string) => void;
    value: string;
    count: number;
    onChange: (val: string) => void;
    onClear: () => void;
    color: "blue" | "indigo";
    data?: CaseRecord[];
}

export const DataInput: React.FC<DataInputProps> = ({
    partyName,
    onNameChange,
    value,
    count,
    onChange,
    onClear,
    color,
    data = []
}) => {
    const [pasteMessage, setPasteMessage] = useState<string | null>(null);
    const [viewMode, setViewMode] = useState<'raw' | 'table'>('raw');
    const [isFocused, setIsFocused] = useState(false);
    const [justPasted, setJustPasted] = useState(false);

    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);

    const accentColor = color === "blue" ? "var(--color-primary)" : "#6366f1";
    const accentBg = color === "blue" ? "var(--color-primary-light)" : "rgba(99, 102, 241, 0.1)";

    const triggerPasteAnimation = () => {
        setJustPasted(true);
        setTimeout(() => setJustPasted(false), 600);
    };

    const handlePasteButton = async () => {
        try {
            const text = await navigator.clipboard.readText();
            if (!text) return;
            appendData(text);
            setPasteMessage(null);

            if (viewMode === 'raw' && textareaRef.current) textareaRef.current.focus();
            else if (containerRef.current) containerRef.current.focus();

        } catch {
            if (viewMode === 'raw' && textareaRef.current) {
                textareaRef.current.focus();
            } else if (viewMode === 'table' && containerRef.current) {
                containerRef.current.focus();
                setPasteMessage("Lütfen CTRL+V yapınız");
                setTimeout(() => setPasteMessage(null), 3000);
            }
        }
    };

    const appendData = (text: string) => {
        triggerPasteAnimation();
        const newValue = value && value.trim().length > 0
            ? `${value}\n${text}`
            : text;
        onChange(newValue);
        if (count === 0) setViewMode('table');
    };

    const handleManualPaste = (e: React.ClipboardEvent) => {
        if (viewMode === 'raw') {
            triggerPasteAnimation();
            return;
        }

        e.preventDefault();
        const text = e.clipboardData.getData('text');
        if (!text) return;
        appendData(text);
    };

    const handleClear = () => {
        onClear();
        setViewMode('raw');
        if (textareaRef.current) {
            textareaRef.current.focus();
        }
    };

    return (
        <div
            style={{
                display: 'flex',
                flexDirection: 'column',
                height: '100%',
                backgroundColor: 'var(--bg-card)',
                borderRadius: 'var(--radius-xl)',
                overflow: 'hidden',
                position: 'relative',
                border: isFocused ? `2px solid ${accentColor}` : '1px solid var(--border-primary)',
                boxShadow: isFocused ? 'var(--shadow-lg)' : 'var(--shadow-sm)',
                transform: isFocused ? 'scale(1.01)' : 'scale(1)',
                transition: 'all var(--transition-fast)',
                zIndex: isFocused ? 10 : 1,
            }}
            onFocus={() => setIsFocused(true)}
            onBlur={(e) => {
                if (!e.currentTarget.contains(e.relatedTarget)) {
                    setIsFocused(false);
                }
            }}
        >
            {/* Paste Success Animation Overlay */}
            <div
                style={{
                    position: 'absolute',
                    inset: 0,
                    backgroundColor: 'rgba(74, 222, 128, 0.2)',
                    zIndex: 50,
                    pointerEvents: 'none',
                    opacity: justPasted ? 1 : 0,
                    transition: 'opacity 500ms ease-out',
                }}
            />

            {/* Header Area */}
            <div style={{
                padding: '0.75rem 1rem',
                borderBottom: '1px solid var(--border-primary)',
                backgroundColor: accentBg,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
            }}>
                {/* Left: Name & Icon */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flex: 1 }}>
                    <FolderOpen size={20} style={{ color: accentColor }} />
                    <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        backgroundColor: 'var(--bg-tertiary)',
                        borderRadius: 'var(--radius-md)',
                        padding: '0.25rem 0.5rem',
                        border: '1px solid var(--border-primary)',
                        maxWidth: '180px',
                        width: '100%',
                    }}>
                        <input
                            type="text"
                            value={partyName}
                            onChange={(e) => onNameChange(e.target.value)}
                            style={{
                                backgroundColor: 'transparent',
                                border: 'none',
                                outline: 'none',
                                fontSize: '0.875rem',
                                fontWeight: 'bold',
                                width: '100%',
                                color: 'var(--text-primary)',
                            }}
                            placeholder="İsim Giriniz"
                        />
                    </div>
                    <span style={{
                        fontSize: '0.75rem',
                        fontFamily: 'var(--font-mono)',
                        padding: '0.25rem 0.5rem',
                        borderRadius: 'var(--radius-sm)',
                        border: '1px solid var(--border-primary)',
                        backgroundColor: 'var(--bg-tertiary)',
                        color: 'var(--text-secondary)',
                        minWidth: '3rem',
                        textAlign: 'center',
                    }}>
                        {count}
                    </span>
                </div>

                {/* Right: View Toggle */}
                <div style={{
                    display: 'flex',
                    backgroundColor: 'var(--bg-tertiary)',
                    padding: '0.125rem',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--border-primary)',
                }}>
                    <button
                        onClick={() => setViewMode('raw')}
                        style={{
                            padding: '0.375rem',
                            borderRadius: 'var(--radius-sm)',
                            border: 'none',
                            cursor: 'pointer',
                            backgroundColor: viewMode === 'raw' ? 'var(--bg-card)' : 'transparent',
                            color: viewMode === 'raw' ? 'var(--text-primary)' : 'var(--text-tertiary)',
                            boxShadow: viewMode === 'raw' ? 'var(--shadow-sm)' : 'none',
                        }}
                        title="Metin Görünümü"
                    >
                        <FileText size={14} />
                    </button>
                    <button
                        onClick={() => setViewMode('table')}
                        style={{
                            padding: '0.375rem',
                            borderRadius: 'var(--radius-sm)',
                            border: 'none',
                            cursor: 'pointer',
                            backgroundColor: viewMode === 'table' ? 'var(--bg-card)' : 'transparent',
                            color: viewMode === 'table' ? 'var(--text-primary)' : 'var(--text-tertiary)',
                            boxShadow: viewMode === 'table' ? 'var(--shadow-sm)' : 'none',
                        }}
                        title="Tablo Görünümü"
                    >
                        <List size={14} />
                    </button>
                </div>
            </div>

            {/* Content Area */}
            <div
                ref={containerRef}
                style={{
                    flex: 1,
                    position: 'relative',
                    backgroundColor: 'var(--bg-card)',
                    overflow: 'hidden',
                    outline: 'none',
                }}
                tabIndex={0}
                onPaste={handleManualPaste}
            >
                {viewMode === 'raw' ? (
                    <textarea
                        ref={textareaRef}
                        style={{
                            width: '100%',
                            height: '100%',
                            padding: '1rem',
                            resize: 'none',
                            outline: 'none',
                            fontSize: '0.75rem',
                            fontFamily: 'var(--font-mono)',
                            color: 'var(--text-secondary)',
                            backgroundColor: 'transparent',
                            border: 'none',
                        }}
                        placeholder="Buraya veri yapıştırın..."
                        value={value}
                        onChange={(e) => onChange(e.target.value)}
                        spellCheck={false}
                    />
                ) : (
                    <div style={{
                        width: '100%',
                        height: '100%',
                        overflowY: 'auto',
                        backgroundColor: 'var(--bg-secondary)',
                    }} className="custom-scrollbar">
                        {data.length > 0 ? (
                            <table style={{ width: '100%', textAlign: 'left', borderCollapse: 'collapse' }}>
                                <thead>
                                    <tr style={{
                                        backgroundColor: 'var(--bg-tertiary)',
                                        fontSize: '0.75rem',
                                        color: 'var(--text-tertiary)',
                                        textTransform: 'uppercase',
                                        fontWeight: 600,
                                        position: 'sticky',
                                        top: 0,
                                        zIndex: 10,
                                    }}>
                                        <th style={{ padding: '0.5rem 0.75rem', borderBottom: '1px solid var(--border-primary)', width: '40px', textAlign: 'center' }}>#</th>
                                        <th style={{ padding: '0.5rem 0.75rem', borderBottom: '1px solid var(--border-primary)', width: '96px' }}>Dosya No</th>
                                        <th style={{ padding: '0.5rem 0.75rem', borderBottom: '1px solid var(--border-primary)' }}>Suçu</th>
                                        <th style={{ padding: '0.5rem 0.75rem', borderBottom: '1px solid var(--border-primary)', width: '80px' }}>Durum</th>
                                    </tr>
                                </thead>
                                <tbody style={{ fontSize: '0.75rem', fontFamily: 'var(--font-mono)' }}>
                                    {data.map((row, i) => (
                                        <tr key={row._id} style={{
                                            borderBottom: '1px solid var(--border-primary)',
                                        }}>
                                            <td style={{ padding: '0.5rem 0.75rem', textAlign: 'center', color: 'var(--text-tertiary)' }}>{i + 1}</td>
                                            <td style={{ padding: '0.5rem 0.75rem', fontWeight: 'bold', color: 'var(--text-primary)', whiteSpace: 'nowrap' }}>{row["Dosya No"]}</td>
                                            <td style={{ padding: '0.5rem 0.75rem', color: 'var(--text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '120px' }} title={row["Suçu"]}>{row["Suçu"] || "-"}</td>
                                            <td style={{ padding: '0.5rem 0.75rem' }}>
                                                <span style={{
                                                    padding: '0.125rem 0.375rem',
                                                    borderRadius: 'var(--radius-sm)',
                                                    fontSize: '0.625rem',
                                                    border: '1px solid',
                                                    whiteSpace: 'nowrap',
                                                    backgroundColor: row["Dosya Durumu"]?.toLowerCase().includes('açık') ? 'var(--color-success-bg)' :
                                                        row["Dosya Durumu"]?.toLowerCase().includes('kapalı') ? 'var(--color-error-bg)' :
                                                            'var(--bg-tertiary)',
                                                    color: row["Dosya Durumu"]?.toLowerCase().includes('açık') ? 'var(--color-success)' :
                                                        row["Dosya Durumu"]?.toLowerCase().includes('kapalı') ? 'var(--color-error)' :
                                                            'var(--text-secondary)',
                                                    borderColor: row["Dosya Durumu"]?.toLowerCase().includes('açık') ? 'var(--color-success-border)' :
                                                        row["Dosya Durumu"]?.toLowerCase().includes('kapalı') ? 'var(--color-error-border)' :
                                                            'var(--border-primary)',
                                                }}>
                                                    {row["Dosya Durumu"]}
                                                </span>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        ) : (
                            <div style={{
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                justifyContent: 'center',
                                height: '100%',
                                color: 'var(--text-tertiary)',
                                gap: '0.5rem',
                                pointerEvents: 'none',
                            }}>
                                <List size={32} style={{ opacity: 0.2 }} />
                                <span style={{ fontSize: '0.75rem' }}>Henüz veri yok.</span>
                                <span style={{ fontSize: '0.625rem', opacity: 0.6 }}>Yapıştırmak için CTRL+V kullanın</span>
                            </div>
                        )}
                    </div>
                )}

                {/* Visual Cue for Active State */}
                {isFocused && (
                    <div style={{
                        position: 'absolute',
                        top: '0.5rem',
                        right: '0.5rem',
                        pointerEvents: 'none',
                    }}>
                        <span style={{
                            fontSize: '0.625rem',
                            fontWeight: 'bold',
                            padding: '0.25rem 0.5rem',
                            borderRadius: 'var(--radius-full)',
                            backgroundColor: 'var(--bg-tertiary)',
                            color: 'var(--text-tertiary)',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.25rem',
                            border: '1px solid var(--border-primary)',
                        }}>
                            <Keyboard size={10} />
                            Yapıştırmaya Hazır
                        </span>
                    </div>
                )}
            </div>

            {/* Footer Actions */}
            <div style={{
                backgroundColor: 'var(--bg-tertiary)',
                padding: '0.5rem',
                borderTop: '1px solid var(--border-primary)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                gap: '0.5rem',
            }}>
                <div style={{ flex: 1, padding: '0 0.5rem' }}>
                    {pasteMessage && (
                        <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.375rem',
                            fontSize: '0.75rem',
                            color: 'var(--color-warning)',
                            fontWeight: 500,
                        }}>
                            <AlertCircle size={14} />
                            {pasteMessage}
                        </div>
                    )}
                </div>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button
                        onClick={handlePasteButton}
                        style={{
                            padding: '0.375rem 0.75rem',
                            fontSize: '0.75rem',
                            fontWeight: 'bold',
                            textTransform: 'uppercase',
                            letterSpacing: '0.05em',
                            borderRadius: 'var(--radius-md)',
                            border: '1px solid var(--border-primary)',
                            backgroundColor: 'var(--bg-card)',
                            color: accentColor,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.375rem',
                            transition: 'all var(--transition-fast)',
                        }}
                        title="Panodaki veriyi mevcut verinin altına ekler"
                    >
                        <ClipboardPaste size={14} />
                        <span>Ekle / Yapıştır</span>
                    </button>
                    <button
                        onClick={handleClear}
                        style={{
                            padding: '0.375rem 0.75rem',
                            fontSize: '0.75rem',
                            fontWeight: 'bold',
                            textTransform: 'uppercase',
                            letterSpacing: '0.05em',
                            borderRadius: 'var(--radius-md)',
                            border: '1px solid var(--color-error-border)',
                            backgroundColor: 'var(--bg-card)',
                            color: 'var(--color-error)',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.375rem',
                            transition: 'all var(--transition-fast)',
                        }}
                    >
                        <Trash2 size={14} />
                        <span>Sil</span>
                    </button>
                </div>
            </div>
        </div>
    );
};

