import React, { useLayoutEffect, useRef, useState } from 'react';
import { useWindowVirtualizer } from '@tanstack/react-virtual';
import { AlertCircle, CheckCircle2, Clock, FileText, Gavel, Users, XCircle } from 'lucide-react';
import type { MatchRecord, Party } from '../types';
import { partyColor } from '../core/party';

interface ResultsTableProps {
    data: MatchRecord[];
    parties: Party[];
}

const lower = (value: string) => value.toLocaleLowerCase('tr-TR');

const getStatusStyle = (status: string) => {
    const s = lower(status);
    if (s.includes('açık') || s.includes('derdest')) {
        return { backgroundColor: 'var(--color-success-bg)', color: 'var(--color-success)', borderColor: 'var(--color-success-border)' };
    }
    if (s.includes('kapalı') || s.includes('kesinleş')) {
        return { backgroundColor: 'var(--color-error-bg)', color: 'var(--color-error)', borderColor: 'var(--color-error-border)' };
    }
    return { backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-secondary)', borderColor: 'var(--border-primary)' };
};

const getRoleStyle = (role?: string | null): React.CSSProperties => {
    if (!role) return { backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-tertiary)', borderColor: 'var(--border-primary)' };
    const r = lower(role);
    if (r.includes('şüpheli') || r.includes('sanık') || r.includes('ssç') || r.includes('suça sürüklenen')) {
        return { backgroundColor: 'var(--color-error-bg)', color: 'var(--color-error)', borderColor: 'var(--color-error-border)', fontWeight: 'bold' };
    }
    if (r.includes('müşteki') || r.includes('mağdur') || r.includes('katılan')) {
        return { backgroundColor: 'var(--color-info-bg)', color: 'var(--color-info)', borderColor: 'var(--color-info-border)', fontWeight: 'bold' };
    }
    if (r.includes('tanık')) {
        return { backgroundColor: 'var(--color-warning-bg)', color: 'var(--color-warning)', borderColor: 'var(--color-warning-border)' };
    }
    return { backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-secondary)', borderColor: 'var(--border-primary)' };
};

const getDecisionIcon = (decision: string) => {
    const d = lower(decision);
    if (d.includes('takipsizlik') || d.includes('beraat') || d.includes('düşme') || d.includes('yer olmadığı')) {
        return <CheckCircle2 size={14} style={{ color: 'var(--color-success)' }} />;
    }
    if (d.includes('ceza') || d.includes('hüküm') || d.includes('dava')) return <Gavel size={14} style={{ color: 'var(--color-error)' }} />;
    if (d.includes('yetkisizlik') || d.includes('görevsizlik')) return <XCircle size={14} style={{ color: 'var(--color-warning)' }} />;
    return <Clock size={14} style={{ color: 'var(--text-tertiary)' }} />;
};

/** Birleştirilmiş (alt alta \n ile ayrılmış) değerleri ayraçlı gösterir. */
const renderContent = (text: string) => {
    if (!text) return <span style={{ color: 'var(--text-tertiary)' }}>-</span>;
    const parts = text.split('\n');
    if (parts.length === 1) return <div>{text}</div>;
    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
            {parts.map((part, idx) => (
                <div
                    key={idx}
                    style={{
                        borderTop: idx > 0 ? '1px solid var(--border-primary)' : undefined,
                        paddingTop: idx > 0 ? '0.25rem' : undefined,
                        marginTop: idx > 0 ? '0.125rem' : undefined,
                        color: idx > 0 ? 'var(--text-secondary)' : 'inherit',
                    }}
                >
                    {part}
                </div>
            ))}
        </div>
    );
};

const ESTIMATED_ROW_HEIGHT = 120;

const ResultRow = React.memo(function ResultRow({
    row,
    index,
    parties,
    measureRef,
}: {
    row: MatchRecord;
    index: number;
    parties: Party[];
    measureRef: (el: HTMLTableRowElement | null) => void;
}) {
    const cellBorder = '1px solid var(--border-primary)';
    return (
        <tr ref={measureRef} data-index={index} style={{ fontSize: '0.875rem', borderBottom: cellBorder }}>
            {/* Index Column */}
            <td
                style={{
                    padding: '1rem 0.25rem',
                    textAlign: 'center',
                    color: 'var(--text-tertiary)',
                    fontFamily: 'var(--font-mono)',
                    fontSize: '0.75rem',
                    borderRight: cellBorder,
                    backgroundColor: 'var(--bg-secondary)',
                }}
            >
                {index + 1}
            </td>

            {/* File Info Column */}
            <td style={{ padding: '0.75rem', verticalAlign: 'top', borderRight: cellBorder }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem', flexWrap: 'wrap' }}>
                        <span style={{ fontSize: '1.125rem', fontWeight: 'bold', color: 'var(--text-primary)', letterSpacing: '-0.025em', fontFamily: 'var(--font-mono)' }}>
                            {row['Dosya No']}
                        </span>
                        <span
                            style={{
                                fontSize: '0.625rem',
                                padding: '0.125rem 0.375rem',
                                borderRadius: 'var(--radius-sm)',
                                border: '1px solid',
                                textTransform: 'uppercase',
                                letterSpacing: '0.05em',
                                whiteSpace: 'pre-line',
                                ...getStatusStyle(row['Dosya Durumu']),
                            }}
                        >
                            {row['Dosya Durumu'] || 'DURUM YOK'}
                        </span>
                    </div>
                    <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>{row['Birim Adı']}</div>
                    <div style={{ fontSize: '0.6875rem', color: 'var(--text-tertiary)', marginTop: '0.25rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                        <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: 'var(--border-secondary)', flexShrink: 0 }}></span>
                        {row['Dosya Türü']}
                    </div>
                </div>
            </td>

            {/* Party Info Column */}
            <td style={{ padding: '0.75rem', verticalAlign: 'top', borderRight: cellBorder }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    {parties.map((party, partyIndex) => {
                        const role = row.roles[party.id];
                        const absent = role === null || role === undefined;
                        return (
                            <React.Fragment key={party.id}>
                                {partyIndex > 0 && <div style={{ borderTop: cellBorder }}></div>}
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.125rem', opacity: absent ? 0.55 : 1 }}>
                                    <span
                                        style={{
                                            fontSize: '0.625rem',
                                            fontWeight: 'bold',
                                            color: partyColor(party).accent,
                                            textTransform: 'uppercase',
                                            letterSpacing: '-0.025em',
                                        }}
                                    >
                                        {party.name}
                                    </span>
                                    <span
                                        style={{
                                            display: 'inline-block',
                                            padding: '0.125rem 0.5rem',
                                            borderRadius: 'var(--radius-sm)',
                                            fontSize: '0.6875rem',
                                            border: '1px solid',
                                            width: 'fit-content',
                                            whiteSpace: 'pre-line',
                                            ...getRoleStyle(role),
                                            ...(absent ? { borderStyle: 'dashed' } : {}),
                                        }}
                                    >
                                        {absent ? 'Bu dosyada yok' : role || 'Belirtilmemiş'}
                                    </span>
                                </div>
                            </React.Fragment>
                        );
                    })}
                </div>
            </td>

            {/* Crime Info Column */}
            <td style={{ padding: '0.75rem', verticalAlign: 'top', borderRight: cellBorder }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                    <div style={{ color: 'var(--text-primary)', fontWeight: 500, lineHeight: 1.4 }}>{renderContent(row['Suçu'])}</div>
                    {row['Suç Tarihi'] && (
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', display: 'flex', alignItems: 'flex-start', gap: '0.25rem', marginTop: '0.25rem' }}>
                            <Clock size={12} style={{ marginTop: '0.125rem', flexShrink: 0 }} />
                            Suç Tarihi:{' '}
                            <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-secondary)' }}>{renderContent(row['Suç Tarihi'])}</span>
                        </div>
                    )}
                </div>
            </td>

            {/* Decision & Status Column */}
            <td style={{ padding: '0.75rem', verticalAlign: 'top' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    {row['Karar Türü'] ? (
                        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem' }}>
                            <div style={{ marginTop: '0.125rem' }}>{getDecisionIcon(row['Karar Türü'])}</div>
                            <div style={{ flex: 1 }}>
                                <div style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-primary)' }}>{renderContent(row['Karar Türü'])}</div>
                                {row['Kesinleşme Tarihi'] && (
                                    <div style={{ fontSize: '0.75rem', color: 'var(--color-success)', marginTop: '0.125rem', display: 'flex', alignItems: 'flex-start', gap: '0.25rem' }}>
                                        <CheckCircle2 size={10} style={{ marginTop: '0.25rem', flexShrink: 0 }} />
                                        Kesinleşme: {renderContent(row['Kesinleşme Tarihi'])}
                                    </div>
                                )}
                            </div>
                        </div>
                    ) : (
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', fontStyle: 'italic' }}>Karar bilgisi yok</div>
                    )}

                    {row['Açıklama'] && (
                        <div
                            style={{
                                fontSize: '0.6875rem',
                                color: 'var(--text-tertiary)',
                                fontStyle: 'italic',
                                borderLeft: '2px solid var(--border-secondary)',
                                paddingLeft: '0.5rem',
                                marginTop: '0.25rem',
                            }}
                        >
                            {renderContent(row['Açıklama'])}
                        </div>
                    )}
                </div>
            </td>
        </tr>
    );
});

export const ResultsTable: React.FC<ResultsTableProps> = ({ data, parties }) => {
    const tableRef = useRef<HTMLDivElement>(null);
    const [scrollMargin, setScrollMargin] = useState(0);

    useLayoutEffect(() => {
        const update = () => {
            if (tableRef.current) setScrollMargin(tableRef.current.getBoundingClientRect().top + window.scrollY);
        };
        update();
        const observer = new ResizeObserver(update);
        observer.observe(document.body);
        return () => observer.disconnect();
    }, [data.length]);

    const virtualizer = useWindowVirtualizer({
        count: data.length,
        estimateSize: () => ESTIMATED_ROW_HEIGHT + parties.length * 20,
        overscan: 6,
        scrollMargin,
    });

    if (data.length === 0) {
        return (
            <div
                style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    height: '16rem',
                    color: 'var(--text-tertiary)',
                    backgroundColor: 'var(--bg-secondary)',
                    border: '2px dashed var(--border-primary)',
                    borderRadius: 'var(--radius-lg)',
                }}
            >
                <FileText size={48} style={{ marginBottom: '0.5rem', opacity: 0.5 }} />
                <p>Karşılaştırma sonucu burada görünecek.</p>
            </div>
        );
    }

    const virtualRows = virtualizer.getVirtualItems();
    const paddingTop = virtualRows.length > 0 ? virtualRows[0].start - scrollMargin : 0;
    const paddingBottom = virtualRows.length > 0 ? virtualizer.getTotalSize() - (virtualRows[virtualRows.length - 1].end - scrollMargin) : 0;
    const headerCell: React.CSSProperties = { padding: '0.75rem', fontWeight: 600, borderRight: '1px solid var(--border-primary)' };

    return (
        <div
            style={{
                width: '100%',
                border: '1px solid var(--border-primary)',
                borderRadius: 'var(--radius-xl)',
                boxShadow: 'var(--shadow-sm)',
                backgroundColor: 'var(--bg-card)',
                overflow: 'hidden',
                display: 'flex',
                flexDirection: 'column',
            }}
        >
            <div ref={tableRef} style={{ overflowX: 'auto' }} className="custom-scrollbar">
                <table style={{ width: '100%', minWidth: '960px', textAlign: 'left', borderCollapse: 'collapse', tableLayout: 'fixed' }}>
                    <colgroup>
                        <col style={{ width: '56px' }} />
                        <col style={{ width: '24%' }} />
                        <col style={{ width: '20%' }} />
                        <col style={{ width: '25%' }} />
                        <col />
                    </colgroup>
                    <thead>
                        <tr style={{ backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-secondary)', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                            <th style={{ ...headerCell, textAlign: 'center', padding: '0.75rem 0.25rem' }}>#</th>
                            <th style={headerCell}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                    <FileText size={14} /> DOSYA BİLGİSİ
                                </div>
                            </th>
                            <th style={headerCell}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                    {parties.length > 2 ? <Users size={14} /> : <AlertCircle size={14} />} TARAF & SIFAT
                                </div>
                            </th>
                            <th style={headerCell}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                    <Gavel size={14} /> SUÇ & TARİH
                                </div>
                            </th>
                            <th style={{ ...headerCell, borderRight: 'none' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                    <CheckCircle2 size={14} /> DURUM & KARAR
                                </div>
                            </th>
                        </tr>
                    </thead>
                    <tbody>
                        {paddingTop > 0 && (
                            <tr aria-hidden="true">
                                <td colSpan={5} style={{ height: paddingTop, padding: 0 }} />
                            </tr>
                        )}
                        {virtualRows.map((virtualRow) => (
                            <ResultRow
                                key={data[virtualRow.index]._key}
                                row={data[virtualRow.index]}
                                index={virtualRow.index}
                                parties={parties}
                                measureRef={virtualizer.measureElement}
                            />
                        ))}
                        {paddingBottom > 0 && (
                            <tr aria-hidden="true">
                                <td colSpan={5} style={{ height: paddingBottom, padding: 0 }} />
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
            <div
                style={{
                    backgroundColor: 'var(--bg-tertiary)',
                    padding: '0.5rem',
                    fontSize: '0.75rem',
                    color: 'var(--text-tertiary)',
                    borderTop: '1px solid var(--border-primary)',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                }}
            >
                <span>Veriler UYAP formatına göre düzenlenmiştir.</span>
                <span style={{ fontFamily: 'var(--font-mono)' }}>Toplam: {data.length} kayıt</span>
            </div>
        </div>
    );
};
