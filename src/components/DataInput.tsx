import React, { useRef, useState } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import {
    AlertCircle,
    ClipboardPaste,
    FileSpreadsheet,
    FileText,
    FolderOpen,
    Keyboard,
    List,
    Loader2,
    Trash2,
    UploadCloud,
    X,
} from 'lucide-react';
import type { Party } from '../types';
import { partyColor } from '../core/party';
import { uniqueLines } from '../core/decision';

interface DataInputProps {
    party: Party;
    canRemove: boolean;
    isLoadingFile: boolean;
    onNameChange: (name: string) => void;
    onTextChange: (text: string) => void;
    onFiles: (files: File[]) => void;
    onClear: () => void;
    onRemove: () => void;
}

const PREVIEW_ROW_HEIGHT = 33;
const EXCEL_EXTENSIONS = /\.(xlsx|xls)$/i;

const statusColors = (status: string) => {
    const s = status?.toLocaleLowerCase('tr-TR') ?? '';
    if (s.includes('açık')) return { bg: 'var(--color-success-bg)', fg: 'var(--color-success)', border: 'var(--color-success-border)' };
    if (s.includes('kapalı')) return { bg: 'var(--color-error-bg)', fg: 'var(--color-error)', border: 'var(--color-error-border)' };
    return { bg: 'var(--bg-tertiary)', fg: 'var(--text-secondary)', border: 'var(--border-primary)' };
};

export const DataInput: React.FC<DataInputProps> = ({
    party,
    canRemove,
    isLoadingFile,
    onNameChange,
    onTextChange,
    onFiles,
    onClear,
    onRemove,
}) => {
    const [pasteMessage, setPasteMessage] = useState<string | null>(null);
    const [viewMode, setViewMode] = useState<'raw' | 'table'>('raw');
    const [isFocused, setIsFocused] = useState(false);
    const [justPasted, setJustPasted] = useState(false);
    const [isDragOver, setIsDragOver] = useState(false);

    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const scrollRef = useRef<HTMLDivElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const { accent: accentColor, background: accentBg } = partyColor(party);
    const data = party.records;
    const count = data.length;

    const rowVirtualizer = useVirtualizer({
        count: data.length,
        getScrollElement: () => scrollRef.current,
        estimateSize: () => PREVIEW_ROW_HEIGHT,
        overscan: 12,
    });

    const triggerPasteAnimation = () => {
        setJustPasted(true);
        setTimeout(() => setJustPasted(false), 600);
    };

    const showMessage = (message: string) => {
        setPasteMessage(message);
        setTimeout(() => setPasteMessage(null), 3000);
    };

    const appendData = (text: string) => {
        triggerPasteAnimation();
        const newValue = party.text && party.text.trim().length > 0 ? `${party.text}\n${text}` : text;
        onTextChange(newValue);
        setViewMode('table');
    };

    const handlePasteButton = async () => {
        try {
            const text = await navigator.clipboard.readText();
            if (!text) return;
            appendData(text);
            setPasteMessage(null);
            containerRef.current?.focus();
        } catch {
            if (viewMode === 'raw' && textareaRef.current) {
                textareaRef.current.focus();
            } else if (viewMode === 'table' && containerRef.current) {
                containerRef.current.focus();
                showMessage('Lütfen CTRL+V yapınız');
            }
        }
    };

    const handleManualPaste = (e: React.ClipboardEvent) => {
        if (viewMode === 'raw') {
            triggerPasteAnimation();
            // Metin önce textarea'ya yapışsın, ardından tablo görünümüne geçilsin.
            setTimeout(() => {
                setViewMode('table');
                containerRef.current?.focus();
            }, 0);
            return;
        }
        e.preventDefault();
        const text = e.clipboardData.getData('text');
        if (text) appendData(text);
    };

    const acceptFiles = (fileList: FileList | null) => {
        const files = Array.from(fileList ?? []);
        const excelFiles = files.filter((f) => EXCEL_EXTENSIONS.test(f.name));
        if (files.length > 0 && excelFiles.length === 0) {
            showMessage('Yalnız .xlsx veya .xls dosyası yüklenebilir');
            return;
        }
        if (excelFiles.length > 0) {
            onFiles(excelFiles);
            triggerPasteAnimation();
            setViewMode('table');
        }
    };

    const handleClear = () => {
        onClear();
        setViewMode('raw');
        textareaRef.current?.focus();
    };

    const iconButtonStyle = (active: boolean): React.CSSProperties => ({
        padding: '0.375rem',
        borderRadius: 'var(--radius-sm)',
        border: 'none',
        cursor: 'pointer',
        backgroundColor: active ? 'var(--bg-card)' : 'transparent',
        color: active ? 'var(--text-primary)' : 'var(--text-tertiary)',
        boxShadow: active ? 'var(--shadow-sm)' : 'none',
    });

    const footerButtonStyle: React.CSSProperties = {
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
    };

    const cellStyle: React.CSSProperties = {
        padding: '0 0.75rem',
        height: PREVIEW_ROW_HEIGHT,
        whiteSpace: 'nowrap',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
    };

    const virtualRows = rowVirtualizer.getVirtualItems();
    const paddingTop = virtualRows.length > 0 ? virtualRows[0].start : 0;
    const paddingBottom =
        virtualRows.length > 0 ? rowVirtualizer.getTotalSize() - virtualRows[virtualRows.length - 1].end : 0;

    return (
        <div
            style={{
                display: 'flex',
                flexDirection: 'column',
                height: '400px',
                backgroundColor: 'var(--bg-card)',
                borderRadius: 'var(--radius-xl)',
                overflow: 'hidden',
                position: 'relative',
                border: isFocused || isDragOver ? `2px solid ${accentColor}` : '1px solid var(--border-primary)',
                boxShadow: isFocused ? 'var(--shadow-lg)' : 'var(--shadow-sm)',
                transform: isFocused ? 'scale(1.01)' : 'scale(1)',
                transition: 'all var(--transition-fast)',
                zIndex: isFocused ? 10 : 1,
            }}
            onFocus={() => setIsFocused(true)}
            onBlur={(e) => {
                if (!e.currentTarget.contains(e.relatedTarget)) setIsFocused(false);
            }}
            onDragOver={(e) => {
                if (Array.from(e.dataTransfer.types).includes('Files')) {
                    e.preventDefault();
                    setIsDragOver(true);
                }
            }}
            onDragLeave={(e) => {
                if (!e.currentTarget.contains(e.relatedTarget as Node)) setIsDragOver(false);
            }}
            onDrop={(e) => {
                e.preventDefault();
                setIsDragOver(false);
                acceptFiles(e.dataTransfer.files);
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

            {/* Drag & Drop Overlay */}
            {isDragOver && (
                <div
                    style={{
                        position: 'absolute',
                        inset: 0,
                        zIndex: 60,
                        pointerEvents: 'none',
                        backgroundColor: accentBg,
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '0.5rem',
                        color: accentColor,
                        fontWeight: 600,
                        backdropFilter: 'blur(2px)',
                    }}
                >
                    <UploadCloud size={40} />
                    Excel dosyasını bırakın
                </div>
            )}

            {/* Header Area */}
            <div
                style={{
                    padding: '0.75rem 1rem',
                    borderBottom: '1px solid var(--border-primary)',
                    backgroundColor: accentBg,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '0.5rem',
                }}
            >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flex: 1, minWidth: 0 }}>
                    <FolderOpen size={20} style={{ color: accentColor, flexShrink: 0 }} />
                    <div
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            backgroundColor: 'var(--bg-tertiary)',
                            borderRadius: 'var(--radius-md)',
                            padding: '0.25rem 0.5rem',
                            border: '1px solid var(--border-primary)',
                            maxWidth: '180px',
                            width: '100%',
                        }}
                    >
                        <input
                            type="text"
                            value={party.name}
                            onChange={(e) => onNameChange(e.target.value)}
                            aria-label="Kişi adı"
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
                    <span
                        title="Benzersiz dosya sayısı"
                        style={{
                            fontSize: '0.75rem',
                            fontFamily: 'var(--font-mono)',
                            padding: '0.25rem 0.5rem',
                            borderRadius: 'var(--radius-sm)',
                            border: '1px solid var(--border-primary)',
                            backgroundColor: 'var(--bg-tertiary)',
                            color: 'var(--text-secondary)',
                            minWidth: '3rem',
                            textAlign: 'center',
                        }}
                    >
                        {count}
                    </span>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                    <div
                        style={{
                            display: 'flex',
                            backgroundColor: 'var(--bg-tertiary)',
                            padding: '0.125rem',
                            borderRadius: 'var(--radius-md)',
                            border: '1px solid var(--border-primary)',
                        }}
                    >
                        <button onClick={() => setViewMode('raw')} style={iconButtonStyle(viewMode === 'raw')} title="Metin Görünümü">
                            <FileText size={14} />
                        </button>
                        <button onClick={() => setViewMode('table')} style={iconButtonStyle(viewMode === 'table')} title="Tablo Görünümü">
                            <List size={14} />
                        </button>
                    </div>
                    {canRemove && (
                        <button
                            onClick={onRemove}
                            title="Bu kişiyi kaldır"
                            aria-label={`${party.name} kişisini kaldır`}
                            style={{
                                ...iconButtonStyle(false),
                                border: '1px solid var(--border-primary)',
                                backgroundColor: 'var(--bg-tertiary)',
                                borderRadius: 'var(--radius-md)',
                                display: 'flex',
                            }}
                        >
                            <X size={14} />
                        </button>
                    )}
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
                    minHeight: 0,
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
                        placeholder={
                            party.fileNames.length > 0
                                ? 'Excel verisi yüklendi. İsterseniz buraya ek veri yapıştırabilirsiniz...'
                                : 'Buraya veri yapıştırın veya Excel dosyası sürükleyin...'
                        }
                        value={party.text}
                        onChange={(e) => onTextChange(e.target.value)}
                        spellCheck={false}
                    />
                ) : (
                    <div
                        ref={scrollRef}
                        style={{ width: '100%', height: '100%', overflowY: 'auto', backgroundColor: 'var(--bg-secondary)' }}
                        className="custom-scrollbar"
                    >
                        {data.length > 0 ? (
                            <table style={{ width: '100%', textAlign: 'left', borderCollapse: 'collapse', tableLayout: 'fixed' }}>
                                <thead>
                                    <tr
                                        style={{
                                            backgroundColor: 'var(--bg-tertiary)',
                                            fontSize: '0.75rem',
                                            color: 'var(--text-tertiary)',
                                            textTransform: 'uppercase',
                                            fontWeight: 600,
                                            position: 'sticky',
                                            top: 0,
                                            zIndex: 10,
                                        }}
                                    >
                                        <th style={{ padding: '0.5rem 0.75rem', borderBottom: '1px solid var(--border-primary)', width: '52px', textAlign: 'center' }}>#</th>
                                        <th style={{ padding: '0.5rem 0.75rem', borderBottom: '1px solid var(--border-primary)', width: '110px' }}>Dosya No</th>
                                        <th style={{ padding: '0.5rem 0.75rem', borderBottom: '1px solid var(--border-primary)' }}>Suçu</th>
                                        <th style={{ padding: '0.5rem 0.75rem', borderBottom: '1px solid var(--border-primary)', width: '90px' }}>Durum</th>
                                    </tr>
                                </thead>
                                <tbody style={{ fontSize: '0.75rem', fontFamily: 'var(--font-mono)' }}>
                                    {paddingTop > 0 && (
                                        <tr aria-hidden="true">
                                            <td colSpan={4} style={{ height: paddingTop, padding: 0 }} />
                                        </tr>
                                    )}
                                    {virtualRows.map((virtualRow) => {
                                        const row = data[virtualRow.index];
                                        const colors = statusColors(row['Dosya Durumu']);
                                        const crimes = uniqueLines(row['Suçu']).join(' / ');
                                        return (
                                            <tr key={row._id} style={{ borderBottom: '1px solid var(--border-primary)', height: PREVIEW_ROW_HEIGHT }}>
                                                <td style={{ ...cellStyle, textAlign: 'center', color: 'var(--text-tertiary)' }}>{virtualRow.index + 1}</td>
                                                <td style={{ ...cellStyle, fontWeight: 'bold', color: 'var(--text-primary)' }}>{row['Dosya No']}</td>
                                                <td style={{ ...cellStyle, color: 'var(--text-secondary)' }} title={crimes}>
                                                    {crimes || '-'}
                                                </td>
                                                <td style={cellStyle}>
                                                    <span
                                                        style={{
                                                            padding: '0.125rem 0.375rem',
                                                            borderRadius: 'var(--radius-sm)',
                                                            fontSize: '0.625rem',
                                                            border: '1px solid',
                                                            backgroundColor: colors.bg,
                                                            color: colors.fg,
                                                            borderColor: colors.border,
                                                        }}
                                                    >
                                                        {row['Dosya Durumu']}
                                                    </span>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                    {paddingBottom > 0 && (
                                        <tr aria-hidden="true">
                                            <td colSpan={4} style={{ height: paddingBottom, padding: 0 }} />
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        ) : (
                            <div
                                style={{
                                    display: 'flex',
                                    flexDirection: 'column',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    height: '100%',
                                    color: 'var(--text-tertiary)',
                                    gap: '0.5rem',
                                    pointerEvents: 'none',
                                }}
                            >
                                <List size={32} style={{ opacity: 0.2 }} />
                                <span style={{ fontSize: '0.75rem' }}>Henüz veri yok.</span>
                                <span style={{ fontSize: '0.625rem', opacity: 0.6 }}>
                                    CTRL+V ile yapıştırın veya Excel dosyası sürükleyin
                                </span>
                            </div>
                        )}
                    </div>
                )}

                {isLoadingFile && (
                    <div
                        style={{
                            position: 'absolute',
                            inset: 0,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '0.5rem',
                            backgroundColor: 'var(--bg-card)',
                            opacity: 0.9,
                            color: 'var(--text-secondary)',
                            fontSize: '0.875rem',
                            zIndex: 20,
                        }}
                    >
                        <Loader2 size={18} className="animate-spin" />
                        Excel dosyası okunuyor...
                    </div>
                )}

                {isFocused && !isLoadingFile && (
                    <div style={{ position: 'absolute', top: '0.5rem', right: '1rem', pointerEvents: 'none', zIndex: 15 }}>
                        <span
                            style={{
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
                            }}
                        >
                            <Keyboard size={10} />
                            Yapıştırmaya Hazır
                        </span>
                    </div>
                )}
            </div>

            {/* Footer Actions */}
            <div
                style={{
                    backgroundColor: 'var(--bg-tertiary)',
                    padding: '0.5rem',
                    borderTop: '1px solid var(--border-primary)',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    gap: '0.5rem',
                }}
            >
                <div style={{ flex: 1, padding: '0 0.5rem', minWidth: 0 }}>
                    {pasteMessage ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', fontSize: '0.75rem', color: 'var(--color-warning)', fontWeight: 500 }}>
                            <AlertCircle size={14} />
                            {pasteMessage}
                        </div>
                    ) : (
                        party.fileNames.length > 0 && (
                            <div
                                title={party.fileNames.join('\n')}
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '0.375rem',
                                    fontSize: '0.6875rem',
                                    color: 'var(--text-tertiary)',
                                    whiteSpace: 'nowrap',
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                }}
                            >
                                <FileSpreadsheet size={12} style={{ color: 'var(--color-success)', flexShrink: 0 }} />
                                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{party.fileNames.join(', ')}</span>
                            </div>
                        )
                    )}
                </div>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <input
                        ref={fileInputRef}
                        type="file"
                        accept=".xlsx,.xls"
                        multiple
                        hidden
                        onChange={(e) => {
                            acceptFiles(e.target.files);
                            e.target.value = '';
                        }}
                    />
                    <button
                        onClick={() => fileInputRef.current?.click()}
                        disabled={isLoadingFile}
                        style={footerButtonStyle}
                        title="UYAP'tan alınan Excel (.xlsx) dosyasını yükler; mevcut verinin üzerine ekler"
                    >
                        <FileSpreadsheet size={14} />
                        <span>Excel Yükle</span>
                    </button>
                    <button onClick={handlePasteButton} style={footerButtonStyle} title="Panodaki veriyi mevcut verinin altına ekler">
                        <ClipboardPaste size={14} />
                        <span>Ekle / Yapıştır</span>
                    </button>
                    <button
                        onClick={handleClear}
                        style={{ ...footerButtonStyle, border: '1px solid var(--color-error-border)', color: 'var(--color-error)' }}
                    >
                        <Trash2 size={14} />
                        <span>Sil</span>
                    </button>
                </div>
            </div>
        </div>
    );
};
