import React, { useLayoutEffect, useRef, useState } from 'react';
import { useWindowVirtualizer } from '@tanstack/react-virtual';
import { AlertCircle, CalendarDays, CheckCircle2, Clock, FileText, Gavel, Landmark, Scale, Users, XCircle } from 'lucide-react';
import type { MatchRecord, Party } from '../types';
import { partyColor } from '../core/party';
import { attributedCrimeEntries, parseAciklama } from '../core/decision';
import { roleTone, statusTone, type Tone } from '../core/tone';

interface ResultsTableProps {
    data: MatchRecord[];
    parties: Party[];
    /** Tablo boşken gösterilecek metin. */
    emptyMessage?: string;
}

const lower = (value: string) => value.toLocaleLowerCase('tr-TR');

const TONE_STYLES: Record<Tone, React.CSSProperties> = {
    success: { backgroundColor: 'var(--color-success-bg)', color: 'var(--color-success)', borderColor: 'var(--color-success-border)' },
    danger: { backgroundColor: 'var(--color-error-bg)', color: 'var(--color-error)', borderColor: 'var(--color-error-border)' },
    info: { backgroundColor: 'var(--color-info-bg)', color: 'var(--color-info)', borderColor: 'var(--color-info-border)' },
    warning: { backgroundColor: 'var(--color-warning-bg)', color: 'var(--color-warning)', borderColor: 'var(--color-warning-border)' },
    neutral: { backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-secondary)', borderColor: 'var(--border-primary)' },
};

const getStatusStyle = (status: string) => TONE_STYLES[statusTone(status)];

const getRoleStyle = (role?: string | null): React.CSSProperties => {
    if (!role) return { backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-tertiary)', borderColor: 'var(--border-primary)' };
    const tone = roleTone(role);
    return tone === 'danger' || tone === 'info' ? { ...TONE_STYLES[tone], fontWeight: 'bold' } : TONE_STYLES[tone];
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

const isDavaAcma = (decision: string) => lower(decision) === 'dava açma';

/** Açıklama'daki mahkeme dosyası durumunun anlamı (dosyanın o anki durumu). */
const statusDescription = (status?: string) => {
    const s = lower(status ?? '');
    if (s === 'kapalı') return 'Mahkeme dosyası kapalı: mahkeme karar verdi';
    if (s === 'açık') return 'Mahkeme dosyası açık: yargılama sürüyor';
    return `Mahkeme dosyasının şu anki durumu: ${status ?? ''}`;
};

const emptyValue = <span style={{ color: 'var(--text-tertiary)' }}>-</span>;

const cellStyle: React.CSSProperties = { padding: '0.75rem', verticalAlign: 'top' };

const DATE_COLUMN_WIDTH = 132;

/**
 * Suç / Tarih / Karar Türü üç sütuna yayılan tek hücrede ızgara olarak çizilir ki uzun suç adı
 * alt satıra geçse de karar aynı hizada kalsın. Oranlar colgroup ile aynıdır (22% | DATE_COLUMN_WIDTH | 14%).
 */
const crimeGridStyle: React.CSSProperties = {
    display: 'grid',
    gridTemplateColumns: `minmax(0, 22fr) ${DATE_COLUMN_WIDTH}px minmax(0, 14fr)`,
};

const crimeCellStyle: React.CSSProperties = { padding: '0.5rem 0.75rem', lineHeight: 1.4, overflowWrap: 'anywhere' };

const badgeStyle: React.CSSProperties = {
    fontSize: '0.625rem',
    padding: '0 0.375rem',
    borderRadius: 'var(--radius-sm)',
    border: '1px solid',
    whiteSpace: 'nowrap',
};

const ESTIMATED_ROW_HEIGHT = 120;
const COLUMN_COUNT = 7;

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
    const entries = attributedCrimeEntries(row, parties);
    const accentOf = new Map(parties.map((p) => [p.name, partyColor(p).accent]));
    const courts = parseAciklama(row['Açıklama']);
    const lawsuit = courts.find((ref) => ref.caseNo);
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

            {/* Suç / Tarih / Karar Türü — suç bazında satır satır hizalı; ızgara sütunları colgroup ile aynı oranda */}
            <td colSpan={3} style={{ padding: 0, verticalAlign: 'top', borderRight: cellBorder }}>
                {entries.length > 0 ? (
                    entries.map((entry, i) => (
                        <div
                            key={i}
                            style={{ ...crimeGridStyle, borderTop: i > 0 ? '1px dashed var(--border-primary)' : undefined }}
                            title={entry.aligned ? undefined : 'Suç listesi karar listesiyle eşleştirilemedi; suç ve karar yan yana olmayabilir.'}
                        >
                            <div style={{ ...crimeCellStyle, borderRight: cellBorder, color: 'var(--text-primary)', fontWeight: 500 }}>
                                {/* Kişiler bu dosyada farklı suç bildiriyorsa satırın kaynağı gösterilir. */}
                                {entry.partyNames.length > 0 && (
                                    <span
                                        title="Bu suç ve karar bilgisi yalnız bu kişinin çıktısında var."
                                        style={{ display: 'flex', flexWrap: 'wrap', gap: '0.25rem', marginBottom: '0.1875rem' }}
                                    >
                                        {entry.partyNames.map((name) => (
                                            <span
                                                key={name}
                                                style={{
                                                    ...badgeStyle,
                                                    fontWeight: 700,
                                                    letterSpacing: '-0.025em',
                                                    color: accentOf.get(name) ?? 'var(--text-secondary)',
                                                    borderColor: accentOf.get(name) ?? 'var(--border-primary)',
                                                    backgroundColor: 'var(--bg-secondary)',
                                                }}
                                            >
                                                {name}
                                            </span>
                                        ))}
                                    </span>
                                )}
                                {entry.crime || emptyValue}
                                {!entry.aligned && i === 0 && (
                                    <span style={{ display: 'block', fontSize: '0.6875rem', fontWeight: 400, color: 'var(--color-warning)' }}>Karar eşleştirilemedi</span>
                                )}
                            </div>
                            <div style={{ ...crimeCellStyle, borderRight: cellBorder, fontFamily: 'var(--font-mono)', fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>
                                {entry.decisionDate || (entry.crimeDate ? null : emptyValue)}
                                {entry.crimeDate && (
                                    <span title="Suç Tarihi" style={{ display: 'block', fontFamily: 'var(--font-sans)', fontSize: '0.6875rem', color: 'var(--text-tertiary)' }}>
                                        Suç: <span style={{ fontFamily: 'var(--font-mono)' }}>{entry.crimeDate}</span>
                                    </span>
                                )}
                            </div>
                            <div style={{ ...crimeCellStyle, display: 'flex', alignItems: 'flex-start', gap: '0.375rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                                {entry.decision ? (
                                    <>
                                        <span style={{ flexShrink: 0, display: 'flex', marginTop: '0.1875rem' }}>{getDecisionIcon(entry.decision)}</span>
                                        <span>
                                            {entry.decision}
                                            {/* Dava açılan suç, Açıklama'daki mahkeme dosyasında görülür (dosya başına tek mahkeme). */}
                                            {isDavaAcma(entry.decision) && lawsuit && (
                                                <span
                                                    title={`${lawsuit.court} ${lawsuit.caseNo} — ${statusDescription(lawsuit.status)}`}
                                                    style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', flexWrap: 'wrap', marginTop: '0.125rem', fontWeight: 400 }}
                                                >
                                                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.6875rem', color: 'var(--text-secondary)' }}>↳ {lawsuit.caseNo}</span>
                                                    {lawsuit.status && <span style={{ ...badgeStyle, ...getStatusStyle(lawsuit.status) }}>{lawsuit.status}</span>}
                                                </span>
                                            )}
                                        </span>
                                    </>
                                ) : (
                                    <span style={{ color: 'var(--text-tertiary)', fontWeight: 400, fontSize: '0.75rem', fontStyle: 'italic' }}>Karar yok</span>
                                )}
                            </div>
                        </div>
                    ))
                ) : (
                    <div style={crimeGridStyle}>
                        <div style={{ ...crimeCellStyle, borderRight: cellBorder }}>{emptyValue}</div>
                        <div style={{ ...crimeCellStyle, borderRight: cellBorder }}>{emptyValue}</div>
                        <div style={crimeCellStyle}>{emptyValue}</div>
                    </div>
                )}
            </td>

            {/* Açıklama Column */}
            <td style={cellStyle}>
                {courts.length > 0 ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                        {courts.map((ref, i) => (
                            <div key={i} style={{ display: 'flex', flexDirection: 'column', gap: '0.125rem', lineHeight: 1.35 }}>
                                <span style={{ color: 'var(--text-primary)', fontSize: '0.8125rem' }}>{ref.court}</span>
                                {ref.caseNo && (
                                    <span style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', flexWrap: 'wrap' }}>
                                        <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{ref.caseNo}</span>
                                        {ref.status && (
                                            <span title={statusDescription(ref.status)} style={{ ...badgeStyle, ...getStatusStyle(ref.status) }}>
                                                {ref.status}
                                            </span>
                                        )}
                                    </span>
                                )}
                            </div>
                        ))}
                    </div>
                ) : (
                    emptyValue
                )}
            </td>
        </tr>
    );
});

export const ResultsTable: React.FC<ResultsTableProps> = ({ data, parties, emptyMessage }) => {
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
                <p>{emptyMessage ?? 'Karşılaştırma sonucu burada görünecek.'}</p>
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
                <table style={{ width: '100%', minWidth: '1120px', textAlign: 'left', borderCollapse: 'collapse', tableLayout: 'fixed' }}>
                    <colgroup>
                        <col style={{ width: '48px' }} />
                        <col style={{ width: '19%' }} />
                        <col style={{ width: '15%' }} />
                        <col style={{ width: '22%' }} />
                        <col style={{ width: DATE_COLUMN_WIDTH }} />
                        <col style={{ width: '14%' }} />
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
                                    <Scale size={14} /> SUÇ
                                </div>
                            </th>
                            <th
                                style={headerCell}
                                title="Kararın verildiği tarih (UYAP çıktısında 'Kesinleşme Tarihi' adlı sütun; değerler karar tarihidir). Varsa suç tarihi de gösterilir."
                            >
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', whiteSpace: 'nowrap' }}>
                                    <CalendarDays size={14} /> KARAR TARİHİ
                                </div>
                            </th>
                            <th style={headerCell}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                    <Gavel size={14} /> KARAR TÜRÜ
                                </div>
                            </th>
                            <th style={{ ...headerCell, borderRight: 'none' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                    <Landmark size={14} /> AÇIKLAMA
                                </div>
                            </th>
                        </tr>
                    </thead>
                    <tbody>
                        {paddingTop > 0 && (
                            <tr aria-hidden="true">
                                <td colSpan={COLUMN_COUNT} style={{ height: paddingTop, padding: 0 }} />
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
                                <td colSpan={COLUMN_COUNT} style={{ height: paddingBottom, padding: 0 }} />
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
