import React, { useState, useRef, useMemo, useEffect } from 'react';
import { useReactToPrint } from 'react-to-print';
import { X, Printer, Settings2, Columns, Type, CheckSquare, Square, Download, RectangleHorizontal, RectangleVertical, Move, PanelTop, PanelBottom, PanelLeft, PanelRight, ZoomIn, ZoomOut, Maximize, Rows, Loader2, FileText, Eye } from 'lucide-react';
import { CaseRecord } from '../types';
import { FIXED_HEADERS } from '../constants';

interface PdfExportModalProps {
    isOpen: boolean;
    onClose: () => void;
    data: CaseRecord[];
    party1Name: string;
    party2Name: string;
}

const DEFAULT_SELECTED_COLUMNS = [
    "Birim Adı", "Dosya No", "Dosya Durumu", "Suçu", "Karar Türü", "Açıklama"
];

export const PdfExportModal: React.FC<PdfExportModalProps> = ({ isOpen, onClose, data, party1Name, party2Name }) => {
    const [title, setTitle] = useState("Dosya Karşılaştırma ve Analiz Raporu");
    const [fontSize, setFontSize] = useState(9);
    const [orientation, setOrientation] = useState<'landscape' | 'portrait'>('landscape');
    const [selectedColumns, setSelectedColumns] = useState<string[]>(DEFAULT_SELECTED_COLUMNS);
    const [margins, setMargins] = useState({ top: 10, bottom: 10, left: 10, right: 10 });
    const [rowsPerPage, setRowsPerPage] = useState(15);
    const [zoom, setZoom] = useState(0.6);
    const [isPrinting, setIsPrinting] = useState(false);
    const [activeTab, setActiveTab] = useState<'settings' | 'columns'>('settings');

    const reportRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (orientation === 'landscape') setRowsPerPage(15);
        else setRowsPerPage(20);
    }, [orientation]);

    const pages = useMemo(() => {
        const chunks = [];
        for (let i = 0; i < data.length; i += rowsPerPage) {
            chunks.push(data.slice(i, i + rowsPerPage));
        }
        return chunks;
    }, [data, rowsPerPage]);

    // Dinamik @page stilleri - hook'tan önce tanımlanmalı
    const getPageStyles = () => `
        @page {
            size: ${orientation === 'landscape' ? 'A4 landscape' : 'A4 portrait'};
            margin: 0;
        }
        @media print {
            html, body {
                width: 100% !important;
                height: 100% !important;
                margin: 0 !important;
                padding: 0 !important;
                overflow: visible !important;
                -webkit-print-color-adjust: exact !important;
                print-color-adjust: exact !important;
                background: white !important;
            }
            
            /* Container transform sıfırla */
            .print-container {
                transform: none !important;
                width: 100% !important;
                margin: 0 !important;
                padding: 0 !important;
                gap: 0 !important;
            }
            
            .print-page-wrapper {
                width: ${orientation === 'landscape' ? '297mm' : '210mm'} !important;
                min-height: ${orientation === 'landscape' ? '210mm' : '297mm'} !important;
                height: auto !important;
                padding: ${margins.top}mm ${margins.right}mm ${margins.bottom}mm ${margins.left}mm !important;
                margin: 0 !important;
                box-sizing: border-box !important;
                break-after: page !important;
                page-break-after: always !important;
                box-shadow: none !important;
                border: none !important;
                background: white !important;
            }
            
            .print-page-wrapper:last-child {
                break-after: auto !important;
                page-break-after: auto !important;
            }
            
            table { 
                border-collapse: collapse !important; 
                width: 100% !important; 
            }
            th, td { 
                border: 0.5pt solid #000 !important; 
            }
        }
    `;

    // react-to-print hook - TÜM HOOK'LAR ERKEN RETURN'DEN ÖNCE OLMALI
    const handlePrint = useReactToPrint({
        contentRef: reportRef,
        documentTitle: title,
        onBeforePrint: () => {
            setIsPrinting(true);
            return Promise.resolve();
        },
        onAfterPrint: () => {
            setIsPrinting(false);
        },
    });

    // Erken return - hook'lardan SONRA olmalı
    if (!isOpen) return null;

    const toggleColumn = (col: string) => {
        setSelectedColumns(prev =>
            prev.includes(col) ? prev.filter(c => c !== col) : [...prev, col]
        );
    };

    const pageWidth = orientation === 'landscape' ? '297mm' : '210mm';
    const pageHeight = orientation === 'landscape' ? '210mm' : '297mm';

    // Style objects for dark mode support
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
        width: '320px',
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

    const orientationButtonStyle = (isActive: boolean): React.CSSProperties => ({
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

    const previewAreaStyle: React.CSSProperties = {
        flex: 1,
        backgroundColor: 'var(--bg-tertiary)',
        position: 'relative',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
    };

    const toolbarStyle: React.CSSProperties = {
        position: 'absolute',
        top: '1rem',
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 20,
        backgroundColor: 'var(--bg-card)',
        border: '1px solid var(--border-primary)',
        boxShadow: 'var(--shadow-lg)',
        borderRadius: 'var(--radius-full)',
        display: 'flex',
        alignItems: 'center',
        gap: '0.25rem',
        padding: '0.25rem',
    };

    const zoomButtonStyle: React.CSSProperties = {
        padding: '0.5rem',
        borderRadius: 'var(--radius-full)',
        backgroundColor: 'transparent',
        color: 'var(--text-secondary)',
        cursor: 'pointer',
        border: 'none',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
    };

    const actionButtonStyle = (isPrimary: boolean): React.CSSProperties => ({
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
        cursor: 'pointer',
        transition: 'all 0.2s ease',
    });

    return (
        <div style={modalOverlayStyle}>
            <div style={modalContainerStyle}>

                {/* Header */}
                <div style={headerStyle}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <div style={{
                            backgroundColor: 'var(--color-primary)',
                            color: 'white',
                            padding: '0.625rem',
                            borderRadius: 'var(--radius-lg)',
                        }}>
                            <FileText size={20} />
                        </div>
                        <div>
                            <h2 style={{
                                fontSize: '1.25rem',
                                fontWeight: 700,
                                color: 'var(--text-primary)',
                                margin: 0,
                            }}>Rapor Önizleme ve Yazdırma</h2>
                            <p style={{
                                fontSize: '0.75rem',
                                color: 'var(--text-tertiary)',
                                margin: 0,
                            }}>Sayfa yapısını ayarlayın ve çıktı alın</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
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
                            transition: 'all 0.2s ease',
                        }}
                    >
                        <X size={24} />
                    </button>
                </div>

                <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>

                    {/* Left Sidebar: Settings */}
                    <div style={sidebarStyle}>
                        {/* Tab headers */}
                        <div style={{ display: 'flex', borderBottom: '1px solid var(--border-primary)' }}>
                            <button
                                onClick={() => setActiveTab('settings')}
                                style={tabButtonStyle(activeTab === 'settings')}
                            >
                                <Settings2 size={16} />
                                Ayarlar
                            </button>
                            <button
                                onClick={() => setActiveTab('columns')}
                                style={tabButtonStyle(activeTab === 'columns')}
                            >
                                <Columns size={16} />
                                Sütunlar
                                <span style={{
                                    backgroundColor: 'var(--color-primary-light)',
                                    color: 'var(--color-primary)',
                                    fontSize: '0.625rem',
                                    padding: '0.125rem 0.375rem',
                                    borderRadius: 'var(--radius-full)',
                                    fontWeight: 600,
                                }}>{selectedColumns.length}</span>
                            </button>
                        </div>

                        {/* Tab content */}
                        <div style={{ flex: 1, overflowY: 'auto', padding: '1.25rem' }} className="custom-scrollbar">
                            {activeTab === 'settings' && (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

                                    {/* Rapor Başlığı */}
                                    <div>
                                        <label style={labelStyle}>Rapor Başlığı</label>
                                        <input
                                            type="text"
                                            value={title}
                                            onChange={(e) => setTitle(e.target.value)}
                                            style={inputStyle}
                                        />
                                    </div>

                                    {/* Sayfa Yönü */}
                                    <div>
                                        <label style={labelStyle}>Sayfa Yönü</label>
                                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                                            <button
                                                onClick={() => setOrientation('landscape')}
                                                style={orientationButtonStyle(orientation === 'landscape')}
                                            >
                                                <RectangleHorizontal size={18} />
                                                Yatay
                                            </button>
                                            <button
                                                onClick={() => setOrientation('portrait')}
                                                style={orientationButtonStyle(orientation === 'portrait')}
                                            >
                                                <RectangleVertical size={18} />
                                                Dikey
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
                                            {[
                                                { key: 'top', icon: PanelTop, label: 'Üst' },
                                                { key: 'bottom', icon: PanelBottom, label: 'Alt' },
                                                { key: 'left', icon: PanelLeft, label: 'Sol' },
                                                { key: 'right', icon: PanelRight, label: 'Sağ' },
                                            ].map(({ key, icon: Icon, label }) => (
                                                <div key={key}>
                                                    <div style={{ fontSize: '0.625rem', color: 'var(--text-tertiary)', display: 'flex', alignItems: 'center', gap: '0.25rem', marginBottom: '0.25rem' }}>
                                                        <Icon size={10} /> {label}
                                                    </div>
                                                    <input
                                                        type="number"
                                                        value={margins[key as keyof typeof margins]}
                                                        onChange={(e) => setMargins({ ...margins, [key]: Number(e.target.value) })}
                                                        style={{ ...inputStyle, textAlign: 'center', fontFamily: 'var(--font-mono)' }}
                                                    />
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Yazı Boyutu ve Satır Sayısı */}
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                        <div>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                                                <label style={{ ...labelStyle, marginBottom: 0 }}>
                                                    <Type size={12} /> Yazı (pt)
                                                </label>
                                                <span style={{
                                                    fontSize: '0.75rem',
                                                    backgroundColor: 'var(--bg-tertiary)',
                                                    padding: '0.125rem 0.5rem',
                                                    borderRadius: 'var(--radius-sm)',
                                                    color: 'var(--text-secondary)',
                                                    fontFamily: 'var(--font-mono)',
                                                }}>{fontSize}</span>
                                            </div>
                                            <input
                                                type="range"
                                                min="6"
                                                max="14"
                                                step="0.5"
                                                value={fontSize}
                                                onChange={(e) => setFontSize(parseFloat(e.target.value))}
                                                style={{ width: '100%', accentColor: 'var(--color-primary)' }}
                                            />
                                        </div>
                                        <div>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                                                <label style={{ ...labelStyle, marginBottom: 0 }}>
                                                    <Rows size={12} /> Satır/Syf
                                                </label>
                                                <span style={{
                                                    fontSize: '0.75rem',
                                                    backgroundColor: 'var(--bg-tertiary)',
                                                    padding: '0.125rem 0.5rem',
                                                    borderRadius: 'var(--radius-sm)',
                                                    color: 'var(--text-secondary)',
                                                    fontFamily: 'var(--font-mono)',
                                                }}>{rowsPerPage}</span>
                                            </div>
                                            <input
                                                type="range"
                                                min="5"
                                                max="40"
                                                step="1"
                                                value={rowsPerPage}
                                                onChange={(e) => setRowsPerPage(parseInt(e.target.value))}
                                                style={{ width: '100%', accentColor: 'var(--color-primary)' }}
                                            />
                                        </div>
                                    </div>

                                    {/* İstatistikler */}
                                    <div style={{
                                        backgroundColor: 'var(--bg-secondary)',
                                        borderRadius: 'var(--radius-lg)',
                                        padding: '1rem',
                                        border: '1px solid var(--border-primary)',
                                    }}>
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
                                                <div style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--color-primary)' }}>{pages.length}</div>
                                                <div style={{ fontSize: '0.625rem', color: 'var(--text-tertiary)', textTransform: 'uppercase' }}>Sayfa</div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {activeTab === 'columns' && (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                                    {FIXED_HEADERS.map((header) => {
                                        const isSelected = selectedColumns.includes(header);
                                        return (
                                            <button
                                                key={header}
                                                onClick={() => toggleColumn(header)}
                                                style={columnButtonStyle(isSelected)}
                                            >
                                                {isSelected
                                                    ? <CheckSquare size={16} style={{ color: 'var(--color-primary)' }} />
                                                    : <Square size={16} style={{ color: 'var(--text-tertiary)' }} />
                                                }
                                                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{header}</span>
                                            </button>
                                        );
                                    })}
                                </div>
                            )}
                        </div>

                        {/* Action Buttons */}
                        <div style={{
                            padding: '1rem',
                            borderTop: '1px solid var(--border-primary)',
                            backgroundColor: 'var(--bg-secondary)',
                            display: 'grid',
                            gridTemplateColumns: '1fr 1fr',
                            gap: '0.75rem',
                        }}>
                            <button
                                onClick={() => handlePrint()}
                                disabled={isPrinting}
                                style={{ ...actionButtonStyle(false), opacity: isPrinting ? 0.7 : 1 }}
                            >
                                {isPrinting ? <Loader2 size={20} className="animate-spin" /> : <Printer size={20} />}
                                <span style={{ fontSize: '0.75rem' }}>{isPrinting ? 'Hazırlanıyor...' : 'Yazdır'}</span>
                            </button>
                            <button
                                onClick={() => handlePrint()}
                                disabled={isPrinting}
                                style={{ ...actionButtonStyle(true), opacity: isPrinting ? 0.7 : 1 }}
                            >
                                {isPrinting ? <Loader2 size={20} className="animate-spin" /> : <Download size={20} />}
                                <span style={{ fontSize: '0.75rem' }}>{isPrinting ? 'İşleniyor...' : 'PDF Kaydet'}</span>
                            </button>
                        </div>
                    </div>

                    {/* Right Area: Preview */}
                    <div style={previewAreaStyle}>

                        {/* Toolbar */}
                        <div style={toolbarStyle}>
                            <button onClick={() => setZoom(Math.max(0.3, zoom - 0.1))} style={zoomButtonStyle} title="Uzaklaştır">
                                <ZoomOut size={16} />
                            </button>
                            <div style={{
                                padding: '0 0.5rem',
                                fontSize: '0.75rem',
                                fontFamily: 'var(--font-mono)',
                                width: '4rem',
                                textAlign: 'center',
                                color: 'var(--text-secondary)',
                            }}>{Math.round(zoom * 100)}%</div>
                            <button onClick={() => setZoom(Math.min(2.0, zoom + 0.1))} style={zoomButtonStyle} title="Yakınlaştır">
                                <ZoomIn size={16} />
                            </button>
                            <div style={{ width: '1px', height: '1rem', backgroundColor: 'var(--border-primary)', margin: '0 0.25rem' }}></div>
                            <button onClick={() => setZoom(0.7)} style={zoomButtonStyle} title="Sığdır">
                                <Maximize size={16} />
                            </button>
                        </div>

                        {/* Scrollable Canvas Area */}
                        <div style={{ flex: 1, overflow: 'auto', padding: '2.5rem', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '3rem' }} className="custom-scrollbar">

                            {/* Pages Container */}
                            <div
                                ref={reportRef}
                                className="print-container"
                                style={{
                                    transform: `scale(${zoom})`,
                                    transformOrigin: 'top center',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    gap: '30px'
                                }}
                            >
                                {/* Print-specific styles */}
                                <style>{getPageStyles()}</style>
                                {pages.map((pageData, pageIndex) => (
                                    <div
                                        key={pageIndex}
                                        className="print-page-wrapper"
                                        style={{
                                            width: pageWidth,
                                            height: pageHeight,
                                            padding: `${margins.top}mm ${margins.right}mm ${margins.bottom}mm ${margins.left}mm`,
                                            boxSizing: 'border-box',
                                            backgroundColor: 'white',
                                            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
                                            color: 'black',
                                            position: 'relative',
                                        }}
                                    >
                                        <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>

                                            <div style={{ display: 'flex', flexDirection: 'column', width: '100%', height: '100%', overflow: 'hidden' }}>

                                                {/* Report Header (Only on First Page) */}
                                                {pageIndex === 0 && (
                                                    <div style={{ textAlign: 'center', marginBottom: '24px', borderBottom: '2px solid black', paddingBottom: '8px', flexShrink: 0 }}>
                                                        <h1 style={{ fontFamily: 'serif', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px', color: 'black', fontSize: '16pt' }}>{title}</h1>
                                                        <div style={{ fontSize: '11pt', color: '#1e293b', fontFamily: 'serif', display: 'flex', justifyContent: 'center', gap: '24px' }}>
                                                            <span><strong>Tarih:</strong> {new Date().toLocaleDateString('tr-TR')}</span>
                                                            <span>|</span>
                                                            <span><strong>Taraflar:</strong> {party1Name} & {party2Name}</span>
                                                        </div>
                                                    </div>
                                                )}

                                                {/* Table Wrapper */}
                                                <div style={{ flex: 1, width: '100%', overflow: 'hidden', position: 'relative' }}>
                                                    <table style={{ width: '100%', borderCollapse: 'collapse', color: 'black', fontSize: `${fontSize}pt` }}>
                                                        <thead>
                                                            <tr style={{ backgroundColor: '#f1f5f9', color: 'black', textTransform: 'uppercase', fontSize: '9pt', fontWeight: 'bold', borderTop: '1px solid black', borderBottom: '1px solid black' }}>
                                                                <th style={{ width: '40px', textAlign: 'center', border: '1px solid black', padding: '4px', backgroundColor: '#f1f5f9' }}>#</th>
                                                                <th style={{ width: '128px', border: '1px solid black', padding: '4px', backgroundColor: '#f1f5f9' }}>Taraf</th>
                                                                {selectedColumns.map(col => (
                                                                    <th key={col} style={{ border: '1px solid black', padding: '4px', backgroundColor: '#f1f5f9' }}>{col}</th>
                                                                ))}
                                                            </tr>
                                                        </thead>
                                                        <tbody style={{ color: 'black' }}>
                                                            {pageData.map((row, index) => (
                                                                <tr key={row._id} style={{ backgroundColor: index % 2 === 1 ? '#f8fafc' : 'white', borderBottom: '1px solid rgba(0,0,0,0.5)' }}>
                                                                    <td style={{ textAlign: 'center', fontFamily: 'monospace', color: 'black', border: '1px solid black', padding: '4px', verticalAlign: 'top' }}>
                                                                        {(pageIndex * rowsPerPage) + index + 1}
                                                                    </td>

                                                                    <td style={{ color: 'black', border: '1px solid black', padding: '4px', verticalAlign: 'top' }}>
                                                                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                                                                            <div style={{ display: 'block', marginBottom: '2px' }}>
                                                                                <strong>{party1Name}:</strong> {row._party1Role || '-'}
                                                                            </div>
                                                                            <div style={{ display: 'block', marginBottom: '2px' }}>
                                                                                <strong>{party2Name}:</strong> {row._party2Role || '-'}
                                                                            </div>
                                                                        </div>
                                                                    </td>

                                                                    {selectedColumns.map(col => {
                                                                        const content = (row as Record<string, unknown>)[col] as string;
                                                                        const isOpen = col === "Dosya Durumu" && content && content.toLowerCase().includes('açık');

                                                                        return (
                                                                            <td key={col} style={{ color: 'black', border: '1px solid black', padding: '4px', verticalAlign: 'top', fontWeight: isOpen ? 'bold' : 'normal' }}>
                                                                                {content}
                                                                            </td>
                                                                        );
                                                                    })}
                                                                </tr>
                                                            ))}
                                                        </tbody>
                                                    </table>
                                                </div>
                                            </div>

                                            {/* Footer */}
                                            <div style={{ borderTop: '1px solid black', paddingTop: '8px', display: 'flex', justifyContent: 'space-between', fontFamily: 'monospace', color: '#1e293b', flexShrink: 0, fontSize: '8pt' }}>
                                                <span>UYAP Dosya Analiz Modülü</span>
                                                <span>Sayfa {pageIndex + 1} / {pages.length}</span>
                                            </div>

                                        </div>
                                    </div>
                                ))}
                            </div>

                        </div>

                    </div>

                </div>
            </div>
        </div>
    );
};
