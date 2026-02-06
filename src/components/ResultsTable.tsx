import React from 'react';
import { CaseRecord } from '../types';
import { AlertCircle, Gavel, FileText, CheckCircle2, XCircle, Clock } from 'lucide-react';

interface ResultsTableProps {
    data: CaseRecord[];
    party1Name: string;
    party2Name: string;
}

export const ResultsTable: React.FC<ResultsTableProps> = ({ data, party1Name, party2Name }) => {
    if (data.length === 0) {
        return (
            <div style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                height: '16rem',
                color: 'var(--text-tertiary)',
                backgroundColor: 'var(--bg-secondary)',
                border: '2px dashed var(--border-primary)',
                borderRadius: 'var(--radius-lg)',
            }}>
                <FileText size={48} style={{ marginBottom: '0.5rem', opacity: 0.5 }} />
                <p>Karşılaştırma sonucu burada görünecek.</p>
            </div>
        );
    }

    const getStatusStyle = (status: string) => {
        const s = status.toLowerCase();
        if (s.includes('açık') || s.includes('derdest')) {
            return { backgroundColor: 'var(--color-success-bg)', color: 'var(--color-success)', borderColor: 'var(--color-success-border)' };
        }
        if (s.includes('kapalı') || s.includes('kesinleş')) {
            return { backgroundColor: 'var(--color-error-bg)', color: 'var(--color-error)', borderColor: 'var(--color-error-border)' };
        }
        return { backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-secondary)', borderColor: 'var(--border-primary)' };
    };

    const getRoleStyle = (role?: string) => {
        if (!role) return { backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-tertiary)', borderColor: 'var(--border-primary)' };
        const r = role.toLowerCase();
        if (r.includes('şüpheli') || r.includes('sanık') || r.includes('ssç')) {
            return { backgroundColor: 'var(--color-error-bg)', color: 'var(--color-error)', borderColor: 'var(--color-error-border)', fontWeight: 'bold' as const };
        }
        if (r.includes('müşteki') || r.includes('mağdur') || r.includes('katılan')) {
            return { backgroundColor: 'var(--color-info-bg)', color: 'var(--color-info)', borderColor: 'var(--color-info-border)', fontWeight: 'bold' as const };
        }
        if (r.includes('tanık')) {
            return { backgroundColor: 'var(--color-warning-bg)', color: 'var(--color-warning)', borderColor: 'var(--color-warning-border)' };
        }
        return { backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-secondary)', borderColor: 'var(--border-primary)' };
    };

    const getDecisionIcon = (decision: string) => {
        const d = decision.toLowerCase();
        if (d.includes('takipsizlik') || d.includes('beraat') || d.includes('düşme')) return <CheckCircle2 size={14} style={{ color: 'var(--color-success)' }} />;
        if (d.includes('ceza') || d.includes('hüküm') || d.includes('dava')) return <Gavel size={14} style={{ color: 'var(--color-error)' }} />;
        if (d.includes('yetkisizlik') || d.includes('görevsizlik')) return <XCircle size={14} style={{ color: 'var(--color-warning)' }} />;
        return <Clock size={14} style={{ color: 'var(--text-tertiary)' }} />;
    };

    const renderContent = (text: string) => {
        if (!text) return <span style={{ color: 'var(--text-tertiary)' }}>-</span>;

        if (text.includes(" / ")) {
            const parts = text.split(" / ");
            return (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                    {parts.map((part, idx) => (
                        <div key={idx} style={{
                            borderTop: idx > 0 ? '1px solid var(--border-primary)' : undefined,
                            paddingTop: idx > 0 ? '0.25rem' : undefined,
                            marginTop: idx > 0 ? '0.125rem' : undefined,
                            color: idx > 0 ? 'var(--text-secondary)' : 'inherit',
                        }}>
                            {part}
                        </div>
                    ))}
                </div>
            );
        }
        return <div>{text}</div>;
    };

    return (
        <div style={{
            width: '100%',
            border: '1px solid var(--border-primary)',
            borderRadius: 'var(--radius-xl)',
            boxShadow: 'var(--shadow-sm)',
            backgroundColor: 'var(--bg-card)',
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
        }}>
            <div style={{ overflowX: 'auto' }} className="custom-scrollbar">
                <table style={{ width: '100%', textAlign: 'left', borderCollapse: 'collapse' }}>
                    <thead>
                        <tr style={{
                            backgroundColor: 'var(--bg-tertiary)',
                            color: 'var(--text-secondary)',
                            fontSize: '0.75rem',
                            textTransform: 'uppercase',
                            letterSpacing: '0.05em',
                        }}>
                            <th style={{ padding: '0.75rem', width: '40px', textAlign: 'center', fontWeight: 600, borderRight: '1px solid var(--border-primary)' }}>#</th>
                            <th style={{ padding: '0.75rem', width: '25%', fontWeight: 600, borderRight: '1px solid var(--border-primary)' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                    <FileText size={14} /> DOSYA BİLGİSİ
                                </div>
                            </th>
                            <th style={{ padding: '0.75rem', width: '20%', fontWeight: 600, borderRight: '1px solid var(--border-primary)' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                    <AlertCircle size={14} /> TARAF & SIFAT
                                </div>
                            </th>
                            <th style={{ padding: '0.75rem', width: '25%', fontWeight: 600, borderRight: '1px solid var(--border-primary)' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                    <Gavel size={14} /> SUÇ & TARİH
                                </div>
                            </th>
                            <th style={{ padding: '0.75rem', fontWeight: 600 }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                    <CheckCircle2 size={14} /> DURUM & KARAR
                                </div>
                            </th>
                        </tr>
                    </thead>
                    <tbody>
                        {data.map((row, idx) => (
                            <tr
                                key={row._id}
                                style={{
                                    fontSize: '0.875rem',
                                    borderBottom: '1px solid var(--border-primary)',
                                }}
                            >
                                {/* Index Column */}
                                <td style={{
                                    padding: '1rem',
                                    textAlign: 'center',
                                    color: 'var(--text-tertiary)',
                                    fontFamily: 'var(--font-mono)',
                                    fontSize: '0.75rem',
                                    borderRight: '1px solid var(--border-primary)',
                                    backgroundColor: 'var(--bg-secondary)',
                                }}>
                                    {idx + 1}
                                </td>

                                {/* File Info Column */}
                                <td style={{ padding: '0.75rem', verticalAlign: 'top', borderRight: '1px solid var(--border-primary)' }}>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                                        <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem' }}>
                                            <span style={{
                                                fontSize: '1.125rem',
                                                fontWeight: 'bold',
                                                color: 'var(--text-primary)',
                                                letterSpacing: '-0.025em',
                                                fontFamily: 'var(--font-mono)',
                                            }}>
                                                {row["Dosya No"]}
                                            </span>
                                            <span style={{
                                                fontSize: '0.625rem',
                                                padding: '0.125rem 0.375rem',
                                                borderRadius: 'var(--radius-sm)',
                                                border: '1px solid',
                                                textTransform: 'uppercase',
                                                letterSpacing: '0.05em',
                                                ...getStatusStyle(row["Dosya Durumu"]),
                                            }}>
                                                {row["Dosya Durumu"] || "DURUM YOK"}
                                            </span>
                                        </div>
                                        <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>
                                            {row["Birim Adı"]}
                                        </div>
                                        <div style={{
                                            fontSize: '0.6875rem',
                                            color: 'var(--text-tertiary)',
                                            marginTop: '0.25rem',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '0.25rem',
                                        }}>
                                            <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: 'var(--border-secondary)' }}></span>
                                            {row["Dosya Türü"]}
                                        </div>
                                    </div>
                                </td>

                                {/* Party Info Column */}
                                <td style={{ padding: '0.75rem', verticalAlign: 'top', borderRight: '1px solid var(--border-primary)' }}>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                        {/* Party 1 Role */}
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.125rem' }}>
                                            <span style={{ fontSize: '0.625rem', fontWeight: 'bold', color: 'var(--color-primary)', textTransform: 'uppercase', letterSpacing: '-0.025em' }}>{party1Name}</span>
                                            <span style={{
                                                display: 'inline-block',
                                                padding: '0.125rem 0.5rem',
                                                borderRadius: 'var(--radius-sm)',
                                                fontSize: '0.6875rem',
                                                border: '1px solid',
                                                width: 'fit-content',
                                                ...getRoleStyle(row._party1Role),
                                            }}>
                                                {row._party1Role || "Belirtilmemiş"}
                                            </span>
                                        </div>

                                        {/* Divider */}
                                        <div style={{ borderTop: '1px solid var(--border-primary)' }}></div>

                                        {/* Party 2 Role */}
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.125rem' }}>
                                            <span style={{ fontSize: '0.625rem', fontWeight: 'bold', color: '#6366f1', textTransform: 'uppercase', letterSpacing: '-0.025em' }}>{party2Name}</span>
                                            <span style={{
                                                display: 'inline-block',
                                                padding: '0.125rem 0.5rem',
                                                borderRadius: 'var(--radius-sm)',
                                                fontSize: '0.6875rem',
                                                border: '1px solid',
                                                width: 'fit-content',
                                                ...getRoleStyle(row._party2Role),
                                            }}>
                                                {row._party2Role || "Belirtilmemiş"}
                                            </span>
                                        </div>
                                    </div>
                                </td>

                                {/* Crime Info Column */}
                                <td style={{ padding: '0.75rem', verticalAlign: 'top', borderRight: '1px solid var(--border-primary)' }}>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                                        <div style={{ color: 'var(--text-primary)', fontWeight: 500, lineHeight: 1.4 }}>
                                            {renderContent(row["Suçu"])}
                                        </div>

                                        {row["Suç Tarihi"] && (
                                            <div style={{
                                                fontSize: '0.75rem',
                                                color: 'var(--text-tertiary)',
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '0.25rem',
                                                marginTop: '0.25rem',
                                            }}>
                                                <Clock size={12} />
                                                Suç Tarihi: <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-secondary)' }}>{renderContent(row["Suç Tarihi"])}</span>
                                            </div>
                                        )}
                                    </div>
                                </td>

                                {/* Decision & Status Column */}
                                <td style={{ padding: '0.75rem', verticalAlign: 'top' }}>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                        {row["Karar Türü"] ? (
                                            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem' }}>
                                                <div style={{ marginTop: '0.125rem' }}>{getDecisionIcon(row["Karar Türü"])}</div>
                                                <div style={{ flex: 1 }}>
                                                    <div style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                                                        {renderContent(row["Karar Türü"])}
                                                    </div>
                                                    {row["Kesinleşme Tarihi"] && (
                                                        <div style={{
                                                            fontSize: '0.75rem',
                                                            color: 'var(--color-success)',
                                                            marginTop: '0.125rem',
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            gap: '0.25rem',
                                                        }}>
                                                            <CheckCircle2 size={10} />
                                                            Kesinleşme: {renderContent(row["Kesinleşme Tarihi"])}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        ) : (
                                            <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', fontStyle: 'italic' }}>Karar bilgisi yok</div>
                                        )}

                                        {row["Açıklama"] && (
                                            <div style={{
                                                fontSize: '0.6875rem',
                                                color: 'var(--text-tertiary)',
                                                fontStyle: 'italic',
                                                borderLeft: '2px solid var(--border-secondary)',
                                                paddingLeft: '0.5rem',
                                                marginTop: '0.25rem',
                                            }}>
                                                {renderContent(row["Açıklama"])}
                                            </div>
                                        )}
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            <div style={{
                backgroundColor: 'var(--bg-tertiary)',
                padding: '0.5rem',
                fontSize: '0.75rem',
                color: 'var(--text-tertiary)',
                borderTop: '1px solid var(--border-primary)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
            }}>
                <span>Veriler UYAP formatına göre düzenlenmiştir.</span>
                <span style={{ fontFamily: 'var(--font-mono)' }}>Toplam: {data.length} kayıt</span>
            </div>
        </div>
    );
};

