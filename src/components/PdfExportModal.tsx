import React, { useEffect, useMemo, useState } from 'react';
import {
    AlertTriangle,
    CheckSquare,
    Columns,
    Download,
    Eye,
    FileText,
    Loader2,
    Move,
    PanelBottom,
    PanelLeft,
    PanelRight,
    PanelTop,
    Printer,
    RectangleHorizontal,
    RectangleVertical,
    RotateCcw,
    Rows,
    Settings2,
    Square,
    Type,
} from 'lucide-react';
import type { HeaderKey, MatchRecord, Party } from '../types';
import { FIXED_HEADERS } from '../constants';
import { DEFAULT_PDF_OPTIONS, PDF_FONT_LABELS, type PdfFontFamily, type PdfOptions } from '../core/pdfLayout';
import { usePdfGenerator } from '../pdf/usePdfGenerator';
import { printPdf } from '../pdf/printPdf';
import { PdfPreview } from './PdfPreview';
import { saveBinaryFile, todayStamp } from '../lib/tauri';
import { useToast } from '../context';

interface PdfExportModalProps {
    isOpen: boolean;
    onClose: () => void;
    data: MatchRecord[];
    parties: Party[];
}

const STORAGE_KEY = 'pdfExportOptions.v2';
const SELECTABLE_COLUMNS = FIXED_HEADERS.filter((h) => h !== 'Sıfatı');

const loadOptions = (): PdfOptions => {
    try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) return { ...DEFAULT_PDF_OPTIONS, ...JSON.parse(stored) };
    } catch {
        /* kayıtlı ayar yoksa varsayılanlar */
    }
    return DEFAULT_PDF_OPTIONS;
};

const fileNameFrom = (title: string) =>
    `${(title.trim() || 'Rapor').replace(/[\\/:*?"<>|]+/g, '').replace(/\s+/g, '_').slice(0, 60)}_${todayStamp()}.pdf`;

// ---- Stiller (mevcut görünüm korunmuştur) ----
const modalOverlayStyle: React.CSSProperties = {
    position: 'fixed',
    inset: 0,
    zIndex: 50,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    backdropFilter: 'blur(4px)',
    padding: '1rem',
    overflow: 'hidden',
};

const modalContainerStyle: React.CSSProperties = {
    backgroundColor: 'var(--bg-card)',
    borderRadius: 'var(--radius-xl)',
    boxShadow: 'var(--shadow-xl)',
    width: '100%',
    maxWidth: '98vw',
    height: '98vh',
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
    border: '1px solid var(--border-primary)',
};

const headerStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '1rem 1.5rem',
    borderBottom: '1px solid var(--border-primary)',
    backgroundColor: 'var(--bg-secondary)',
};

const sidebarStyle: React.CSSProperties = {
    width: '340px',
    backgroundColor: 'var(--bg-card)',
    borderRight: '1px solid var(--border-primary)',
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
    flexShrink: 0,
};

const tabButtonStyle = (isActive: boolean): React.CSSProperties => ({
    flex: 1,
    padding: '0.75rem',
    fontSize: '0.875rem',
    fontWeight: 500,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '0.5rem',
    border: 'none',
    borderBottom: isActive ? '2px solid var(--color-primary)' : '2px solid transparent',
    color: isActive ? 'var(--color-primary)' : 'var(--text-secondary)',
    backgroundColor: 'transparent',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
});

const labelStyle: React.CSSProperties = {
    fontSize: '0.75rem',
    fontWeight: 600,
    color: 'var(--text-tertiary)',
    textTransform: 'uppercase',
    marginBottom: '0.5rem',
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
};

const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '0.5rem 0.75rem',
    border: '1px solid var(--border-primary)',
    borderRadius: 'var(--radius-md)',
    backgroundColor: 'var(--bg-primary)',
    color: 'var(--text-primary)',
    fontSize: '0.875rem',
    outline: 'none',
};

const toggleButtonStyle = (isActive: boolean): React.CSSProperties => ({
    flex: 1,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '0.5rem',
    padding: '0.625rem',
    borderRadius: 'var(--radius-md)',
    border: `1px solid ${isActive ? 'var(--color-primary)' : 'var(--border-primary)'}`,
    backgroundColor: isActive ? 'var(--color-primary-light)' : 'var(--bg-primary)',
    color: isActive ? 'var(--color-primary)' : 'var(--text-secondary)',
    fontSize: '0.875rem',
    fontWeight: 500,
    cursor: 'pointer',
    transition: 'all 0.2s ease',
});

const columnButtonStyle = (isSelected: boolean): React.CSSProperties => ({
    display: 'flex',
    alignItems: 'center',
    gap: '0.75rem',
    width: '100%',
    padding: '0.625rem 0.75rem',
    fontSize: '0.875rem',
    borderRadius: 'var(--radius-md)',
    border: 'none',
    backgroundColor: isSelected ? 'var(--color-primary-light)' : 'transparent',
    color: isSelected ? 'var(--color-primary)' : 'var(--text-secondary)',
    fontWeight: isSelected ? 500 : 400,
    cursor: 'pointer',
    transition: 'all 0.15s ease',
});

const valueBadgeStyle: React.CSSProperties = {
    fontSize: '0.75rem',
    backgroundColor: 'var(--bg-tertiary)',
    padding: '0.125rem 0.5rem',
    borderRadius: 'var(--radius-sm)',
    color: 'var(--text-secondary)',
    fontFamily: 'var(--font-mono)',
};

const actionButtonStyle = (isPrimary: boolean, disabled: boolean): React.CSSProperties => ({
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '0.5rem',
    padding: '0.75rem',
    borderRadius: 'var(--radius-lg)',
    border: isPrimary ? 'none' : '1px solid var(--border-primary)',
    backgroundColor: isPrimary ? 'var(--color-primary)' : 'var(--bg-primary)',
    color: isPrimary ? 'white' : 'var(--text-secondary)',
    fontWeight: 600,
    cursor: disabled ? 'not-allowed' : 'pointer',
    opacity: disabled ? 0.6 : 1,
    transition: 'all 0.2s ease',
});

const SliderField: React.FC<{
    icon: React.ReactNode;
    label: string;
    value: number;
    display?: string;
    min: number;
    max: number;
    step: number;
    disabled?: boolean;
    onChange: (value: number) => void;
}> = ({ icon, label, value, display, min, max, step, disabled, onChange }) => (
    <div style={{ opacity: disabled ? 0.5 : 1 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
            <label style={{ ...labelStyle, marginBottom: 0 }}>
                {icon} {label}
            </label>
            <span style={valueBadgeStyle}>{display ?? value}</span>
        </div>
        <input
            type="range"
            min={min}
            max={max}
            step={step}
            value={value}
            disabled={disabled}
            onChange={(e) => onChange(parseFloat(e.target.value))}
            style={{ width: '100%', accentColor: 'var(--color-primary)' }}
        />
    </div>
);

export const PdfExportModal: React.FC<PdfExportModalProps> = ({ isOpen, onClose, data, parties }) => {
    const [options, setOptions] = useState<PdfOptions>(loadOptions);
    const [activeTab, setActiveTab] = useState<'settings' | 'columns'>('settings');
    const [retryToken, setRetryToken] = useState(0);
    const [isSaving, setIsSaving] = useState(false);
    const [printProgress, setPrintProgress] = useState<{ done: number; total: number } | null>(null);
    const toast = useToast();

    // Worker'a yalnız ad/kimlik gider; kişi metinleri değişse de PDF gereksiz yere yeniden üretilmez.
    const partyKey = parties.map((p) => `${p.id}${p.name}`).join('');
    // eslint-disable-next-line react-hooks/exhaustive-deps
    const pdfParties = useMemo(() => parties.map(({ id, name }) => ({ id, name })), [partyKey]);

    const pdf = usePdfGenerator(isOpen, data, pdfParties, options, retryToken);

    useEffect(() => {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(options));
        } catch {
            /* depolama kapalıysa ayar yalnız bu oturumda geçerli */
        }
    }, [options]);

    if (!isOpen) return null;

    const update = <K extends keyof PdfOptions>(key: K, value: PdfOptions[K]) => setOptions((prev) => ({ ...prev, [key]: value }));

    const toggleColumn = (col: HeaderKey) =>
        update(
            'columns',
            options.columns.includes(col) ? options.columns.filter((c) => c !== col) : SELECTABLE_COLUMNS.filter((c) => c === col || options.columns.includes(c))
        );

    const isReady = pdf.status === 'ready' && !!pdf.bytes;
    const isBusy = pdf.status === 'generating';

    const handleSave = async () => {
        if (!pdf.bytes) return;
        setIsSaving(true);
        try {
            const saved = await saveBinaryFile(fileNameFrom(options.title), pdf.bytes, { name: 'PDF Belgesi', extensions: ['pdf'] });
            if (saved) toast.success('PDF kaydedildi.');
        } catch (error) {
            console.error(error);
            toast.error('PDF kaydedilemedi.');
        } finally {
            setIsSaving(false);
        }
    };

    const handlePrint = async () => {
        if (!pdf.bytes) return;
        setPrintProgress({ done: 0, total: pdf.pageCount });
        try {
            await printPdf(pdf.bytes, (done, total) => setPrintProgress({ done, total }));
        } catch (error) {
            console.error(error);
            toast.error('Yazdırma hazırlanamadı. PDF\'i kaydedip bir PDF görüntüleyiciden yazdırabilirsiniz.');
        } finally {
            setPrintProgress(null);
        }
    };

    return (
        <div style={modalOverlayStyle} role="dialog" aria-modal="true" aria-label="PDF rapor önizleme">
            <div style={modalContainerStyle}>
                {/* Header */}
                <div style={headerStyle}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <div style={{ backgroundColor: 'var(--color-primary)', color: 'white', padding: '0.625rem', borderRadius: 'var(--radius-lg)' }}>
                            <FileText size={20} />
                        </div>
                        <div>
                            <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>Rapor Önizleme ve Yazdırma</h2>
                            <p style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', margin: 0 }}>
                                Önizleme, kaydedilecek PDF dosyasının kendisidir — gördüğünüz sayfa düzeni birebir çıktıdır
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        aria-label="Kapat"
                        style={{
                            padding: '0.5rem',
                            borderRadius: 'var(--radius-full)',
                            backgroundColor: 'transparent',
                            color: 'var(--text-tertiary)',
                            cursor: 'pointer',
                            border: 'none',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '1.5rem',
                            lineHeight: 1,
                        }}
                    >
                        ×
                    </button>
                </div>

                <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
                    {/* Left Sidebar: Settings */}
                    <div style={sidebarStyle}>
                        <div style={{ display: 'flex', borderBottom: '1px solid var(--border-primary)' }}>
                            <button onClick={() => setActiveTab('settings')} style={tabButtonStyle(activeTab === 'settings')}>
                                <Settings2 size={16} />
                                Ayarlar
                            </button>
                            <button onClick={() => setActiveTab('columns')} style={tabButtonStyle(activeTab === 'columns')}>
                                <Columns size={16} />
                                Sütunlar
                                <span
                                    style={{
                                        backgroundColor: 'var(--color-primary-light)',
                                        color: 'var(--color-primary)',
                                        fontSize: '0.625rem',
                                        padding: '0.125rem 0.375rem',
                                        borderRadius: 'var(--radius-full)',
                                        fontWeight: 600,
                                    }}
                                >
                                    {options.columns.length + 1}
                                </span>
                            </button>
                        </div>

                        <div style={{ flex: 1, overflowY: 'auto', padding: '1.25rem' }} className="custom-scrollbar">
                            {activeTab === 'settings' && (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                                    {/* Rapor Başlığı */}
                                    <div>
                                        <label style={labelStyle}>Rapor Başlığı</label>
                                        <input type="text" value={options.title} onChange={(e) => update('title', e.target.value)} style={inputStyle} />
                                    </div>

                                    {/* Sayfa Yönü */}
                                    <div>
                                        <label style={labelStyle}>Sayfa Yönü</label>
                                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                                            <button onClick={() => update('orientation', 'landscape')} style={toggleButtonStyle(options.orientation === 'landscape')}>
                                                <RectangleHorizontal size={18} />
                                                Yatay
                                            </button>
                                            <button onClick={() => update('orientation', 'portrait')} style={toggleButtonStyle(options.orientation === 'portrait')}>
                                                <RectangleVertical size={18} />
                                                Dikey
                                            </button>
                                        </div>
                                    </div>

                                    {/* Kağıt */}
                                    <div>
                                        <label style={labelStyle}>Kağıt Boyutu</label>
                                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                                            <button onClick={() => update('paper', 'a4')} style={toggleButtonStyle(options.paper === 'a4')}>
                                                A4
                                            </button>
                                            <button onClick={() => update('paper', 'a3')} style={toggleButtonStyle(options.paper === 'a3')}>
                                                A3
                                            </button>
                                        </div>
                                    </div>

                                    {/* Kenar Boşlukları */}
                                    <div>
                                        <label style={labelStyle}>
                                            <Move size={12} />
                                            Kenar Boşlukları (mm)
                                        </label>
                                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                                            {(
                                                [
                                                    { key: 'top', icon: PanelTop, label: 'Üst' },
                                                    { key: 'bottom', icon: PanelBottom, label: 'Alt' },
                                                    { key: 'left', icon: PanelLeft, label: 'Sol' },
                                                    { key: 'right', icon: PanelRight, label: 'Sağ' },
                                                ] as const
                                            ).map(({ key, icon: Icon, label }) => (
                                                <div key={key}>
                                                    <div style={{ fontSize: '0.625rem', color: 'var(--text-tertiary)', display: 'flex', alignItems: 'center', gap: '0.25rem', marginBottom: '0.25rem' }}>
                                                        <Icon size={10} /> {label}
                                                    </div>
                                                    <input
                                                        type="number"
                                                        min={0}
                                                        max={60}
                                                        value={options.margins[key]}
                                                        onChange={(e) => update('margins', { ...options.margins, [key]: Number(e.target.value) })}
                                                        style={{ ...inputStyle, textAlign: 'center', fontFamily: 'var(--font-mono)' }}
                                                    />
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Yazı Tipi */}
                                    <div>
                                        <label style={labelStyle}>
                                            <Type size={12} /> Yazı Tipi
                                        </label>
                                        <select
                                            value={options.fontFamily}
                                            onChange={(e) => update('fontFamily', e.target.value as PdfFontFamily)}
                                            style={{ ...inputStyle, cursor: 'pointer' }}
                                        >
                                            {(Object.keys(PDF_FONT_LABELS) as PdfFontFamily[]).map((family) => (
                                                <option key={family} value={family}>
                                                    {PDF_FONT_LABELS[family]}
                                                </option>
                                            ))}
                                        </select>
                                    </div>

                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                        <SliderField icon={<Type size={12} />} label="Yazı (pt)" value={options.fontSize} min={5} max={16} step={0.5} onChange={(v) => update('fontSize', v)} />
                                        <SliderField
                                            icon={<Move size={12} />}
                                            label="Hücre boşl."
                                            value={options.cellPadding}
                                            display={`${options.cellPadding} mm`}
                                            min={0}
                                            max={5}
                                            step={0.5}
                                            onChange={(v) => update('cellPadding', v)}
                                        />
                                    </div>

                                    {/* Sayfa başına satır */}
                                    <div>
                                        <label style={{ ...labelStyle, justifyContent: 'space-between' }}>
                                            <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                                <Rows size={12} /> Sayfa Başına Satır
                                            </span>
                                            <span style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', textTransform: 'none', fontWeight: 500, cursor: 'pointer' }}>
                                                <input
                                                    type="checkbox"
                                                    checked={options.rowsPerPage === 0}
                                                    onChange={(e) => update('rowsPerPage', e.target.checked ? 0 : 15)}
                                                    style={{ accentColor: 'var(--color-primary)' }}
                                                />
                                                Otomatik
                                            </span>
                                        </label>
                                        <SliderField
                                            icon={null}
                                            label=""
                                            value={options.rowsPerPage || 15}
                                            display={options.rowsPerPage === 0 ? 'sayfa dolunca' : `en fazla ${options.rowsPerPage}`}
                                            min={1}
                                            max={60}
                                            step={1}
                                            disabled={options.rowsPerPage === 0}
                                            onChange={(v) => update('rowsPerPage', v)}
                                        />
                                        <p style={{ fontSize: '0.6875rem', color: 'var(--text-tertiary)', marginTop: '0.375rem' }}>
                                            Uzun satırlar sayfaya sığmazsa sonraki sayfaya taşar.
                                        </p>
                                    </div>

                                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem', color: 'var(--text-secondary)', cursor: 'pointer' }}>
                                        <input type="checkbox" checked={options.zebra} onChange={(e) => update('zebra', e.target.checked)} style={{ accentColor: 'var(--color-primary)' }} />
                                        Satırları dönüşümlü renklendir
                                    </label>

                                    {/* İstatistikler */}
                                    <div style={{ backgroundColor: 'var(--bg-secondary)', borderRadius: 'var(--radius-lg)', padding: '1rem', border: '1px solid var(--border-primary)' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                                            <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Rapor Özeti</span>
                                            <Eye size={14} style={{ color: 'var(--text-tertiary)' }} />
                                        </div>
                                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                                            <div style={{ textAlign: 'center', padding: '0.5rem', backgroundColor: 'var(--bg-primary)', borderRadius: 'var(--radius-md)' }}>
                                                <div style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--color-primary)' }}>{data.length}</div>
                                                <div style={{ fontSize: '0.625rem', color: 'var(--text-tertiary)', textTransform: 'uppercase' }}>Kayıt</div>
                                            </div>
                                            <div style={{ textAlign: 'center', padding: '0.5rem', backgroundColor: 'var(--bg-primary)', borderRadius: 'var(--radius-md)' }}>
                                                <div style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--color-primary)' }}>
                                                    {pdf.pageCount > 0 ? pdf.pageCount : '–'}
                                                </div>
                                                <div style={{ fontSize: '0.625rem', color: 'var(--text-tertiary)', textTransform: 'uppercase' }}>Sayfa</div>
                                            </div>
                                        </div>
                                    </div>

                                    <button
                                        onClick={() => setOptions(DEFAULT_PDF_OPTIONS)}
                                        style={{ ...toggleButtonStyle(false), flex: 'none', fontSize: '0.8125rem' }}
                                    >
                                        <RotateCcw size={14} /> Varsayılan ayarlara dön
                                    </button>
                                </div>
                            )}

                            {activeTab === 'columns' && (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                                    <div style={{ ...columnButtonStyle(true), cursor: 'default', opacity: 0.8 }} title="Kişilerin sıfatları her zaman raporda yer alır">
                                        <CheckSquare size={16} style={{ color: 'var(--color-primary)' }} />
                                        <span>Taraf & Sıfat (sabit)</span>
                                    </div>
                                    {SELECTABLE_COLUMNS.map((header) => {
                                        const isSelected = options.columns.includes(header);
                                        return (
                                            <button key={header} onClick={() => toggleColumn(header)} style={columnButtonStyle(isSelected)}>
                                                {isSelected ? (
                                                    <CheckSquare size={16} style={{ color: 'var(--color-primary)' }} />
                                                ) : (
                                                    <Square size={16} style={{ color: 'var(--text-tertiary)' }} />
                                                )}
                                                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{header}</span>
                                            </button>
                                        );
                                    })}
                                </div>
                            )}
                        </div>

                        {/* Action Buttons */}
                        <div
                            style={{
                                padding: '1rem',
                                borderTop: '1px solid var(--border-primary)',
                                backgroundColor: 'var(--bg-secondary)',
                                display: 'grid',
                                gridTemplateColumns: '1fr 1fr',
                                gap: '0.75rem',
                            }}
                        >
                            <button onClick={handlePrint} disabled={!isReady || isBusy || !!printProgress} style={actionButtonStyle(false, !isReady || isBusy || !!printProgress)}>
                                <Printer size={20} />
                                <span style={{ fontSize: '0.75rem' }}>Yazdır</span>
                            </button>
                            <button onClick={handleSave} disabled={!isReady || isBusy || isSaving} style={actionButtonStyle(true, !isReady || isBusy || isSaving)}>
                                {isSaving ? <Loader2 size={20} className="animate-spin" /> : <Download size={20} />}
                                <span style={{ fontSize: '0.75rem' }}>{isSaving ? 'Kaydediliyor...' : 'PDF Kaydet'}</span>
                            </button>
                        </div>
                    </div>

                    {/* Right Area: Real PDF Preview */}
                    <div style={{ flex: 1, backgroundColor: 'var(--bg-tertiary)', position: 'relative', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                        <PdfPreview bytes={pdf.bytes} />

                        {(isBusy || pdf.status === 'idle' || printProgress) && (
                            <div
                                style={{
                                    position: 'absolute',
                                    top: '4rem',
                                    left: '50%',
                                    transform: 'translateX(-50%)',
                                    zIndex: 20,
                                    backgroundColor: 'var(--bg-card)',
                                    border: '1px solid var(--border-primary)',
                                    boxShadow: 'var(--shadow-lg)',
                                    borderRadius: 'var(--radius-full)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '0.5rem',
                                    padding: '0.5rem 1rem',
                                    fontSize: '0.8125rem',
                                    color: 'var(--text-secondary)',
                                }}
                            >
                                <Loader2 size={16} className="animate-spin" />
                                {printProgress
                                    ? `Yazdırma hazırlanıyor... ${printProgress.done} / ${printProgress.total}`
                                    : 'PDF hazırlanıyor...'}
                            </div>
                        )}

                        {pdf.status === 'ready' && (
                            <div style={{ position: 'absolute', bottom: '0.75rem', right: '1rem', fontSize: '0.6875rem', color: 'var(--text-tertiary)', fontFamily: 'var(--font-mono)', pointerEvents: 'none' }}>
                                {pdf.pageCount} sayfa · {Math.round((pdf.bytes?.byteLength ?? 0) / 1024)} KB · {pdf.durationMs} ms
                            </div>
                        )}

                        {pdf.status === 'error' && (
                            <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '0.75rem', color: 'var(--color-error)' }}>
                                <AlertTriangle size={36} />
                                <div style={{ fontWeight: 600 }}>PDF oluşturulamadı</div>
                                <div style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', maxWidth: '480px', textAlign: 'center' }}>{pdf.error}</div>
                                <button onClick={() => setRetryToken((t) => t + 1)} style={{ ...toggleButtonStyle(true), flex: 'none', padding: '0.5rem 1rem' }}>
                                    <RotateCcw size={14} /> Tekrar dene
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};
