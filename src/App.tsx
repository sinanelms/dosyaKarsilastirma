import { lazy, Suspense, useCallback, useEffect, useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import { Download, FileOutput, FileText, HelpCircle, Keyboard, Loader2, RefreshCcw, Scale, UserPlus, Users } from 'lucide-react';
import { DataInput } from './components/DataInput';
import { ResultsTable } from './components/ResultsTable';
import { Logger } from './components/Logger';
import { HelpDialog, ThemeToggle, ToastContainer, UpdateNotification } from './components/common';
import { rowsToRecords, textToRows } from './core/parse';
import { compareParties } from './core/compare';
import { createParty, withRecords } from './core/party';
import { readXlsxFile } from './workers/readXlsxFile';
import { saveBinaryFile, todayStamp } from './lib/tauri';
import { useToast } from './context';
import { useKeyboardShortcuts, useUpdateButton } from './hooks';
import type { LogEntry, MatchRecord, Party } from './types';
import { DEFAULT_PARTY_COUNT, MAX_LOG_ENTRIES } from './constants';

const PARSE_DEBOUNCE_MS = 200;

// PDF motoru (jsPDF worker + pdf.js) yalnız rapor penceresi ilk açıldığında yüklenir.
const PdfExportModal = lazy(() => import('./components/PdfExportModal').then((m) => ({ default: m.PdfExportModal })));

const initialParties = () => Array.from({ length: DEFAULT_PARTY_COUNT }, (_, i) => createParty(i));

const headerIconButton: CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '40px',
    height: '40px',
    borderRadius: 'var(--radius-md)',
    border: '1px solid var(--border-primary)',
    backgroundColor: 'var(--bg-card)',
    color: 'var(--text-secondary)',
    cursor: 'pointer',
};

const secondaryButton: CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: '0.25rem',
    padding: '0.375rem 0.75rem',
    fontSize: '0.875rem',
    fontWeight: 500,
    color: 'var(--text-secondary)',
    backgroundColor: 'var(--bg-card)',
    border: '1px solid var(--border-primary)',
    borderRadius: 'var(--radius-md)',
    cursor: 'pointer',
};

const kbdStyle: CSSProperties = {
    backgroundColor: 'var(--bg-tertiary)',
    padding: '0.125rem 0.375rem',
    borderRadius: 'var(--radius-sm)',
    fontSize: '0.75rem',
    fontFamily: 'var(--font-mono)',
};

const sectionTitle: CSSProperties = {
    fontSize: '1.125rem',
    fontWeight: 'bold',
    color: 'var(--text-primary)',
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
};

const SectionBar = () => (
    <span style={{ width: '4px', height: '24px', backgroundColor: 'var(--color-primary)', borderRadius: 'var(--radius-full)' }} />
);

export default function App() {
    // Kişiler (varsayılan 2)
    const [parties, setParties] = useState<Party[]>(initialParties);
    const [loadingPartyIds, setLoadingPartyIds] = useState<string[]>([]);

    // Sonuçlar ve loglar
    const [results, setResults] = useState<MatchRecord[]>([]);
    const [hasCompared, setHasCompared] = useState(false);
    const [minCount, setMinCount] = useState(2);
    const [logs, setLogs] = useState<LogEntry[]>([]);

    // Modallar
    const [isPdfModalOpen, setIsPdfModalOpen] = useState(false);
    const [showShortcuts, setShowShortcuts] = useState(false);
    const [showHelp, setShowHelp] = useState(false);
    const [isComparing, setIsComparing] = useState(false);

    const toast = useToast();
    const {
        isVisible: isUpdateVisible,
        version: updateVersion,
        isDownloading,
        progressPercent: updateProgress,
        handleUpdateClick,
    } = useUpdateButton();

    const parseTimers = useRef(new Map<string, ReturnType<typeof setTimeout>>());

    const addLog = useCallback((message: string, type: LogEntry['type'] = 'INFO') => {
        const entry: LogEntry = {
            id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
            timestamp: new Date().toLocaleTimeString('tr-TR'),
            message,
            type,
        };
        setLogs((prev) => {
            const next = [...prev, entry];
            return next.length > MAX_LOG_ENTRIES ? next.slice(next.length - MAX_LOG_ENTRIES) : next;
        });
    }, []);

    const updateParty = useCallback((id: string, update: (party: Party) => Party) => {
        setParties((prev) => prev.map((p) => (p.id === id ? update(p) : p)));
    }, []);

    const invalidateResults = useCallback(() => {
        setResults([]);
        setHasCompared(false);
    }, []);

    useEffect(() => {
        const timers = parseTimers.current;
        return () => timers.forEach((timer) => clearTimeout(timer));
    }, []);

    const handleTextChange = (party: Party, text: string) => {
        updateParty(party.id, (p) => ({ ...p, text }));

        // Ayrıştırma, yazma/yapıştırma bittikten sonra (debounce) yapılır; büyük metinlerde arayüz donmaz.
        const timers = parseTimers.current;
        clearTimeout(timers.get(party.id));
        timers.set(
            party.id,
            setTimeout(() => {
                timers.delete(party.id);
                const textRecords = text.trim() ? rowsToRecords(textToRows(text)) : [];
                if (text.trim()) addLog(`${party.name}: ${textRecords.length} benzersiz dosya okundu (pano).`);
                updateParty(party.id, (p) => withRecords(p, { textRecords }));
            }, PARSE_DEBOUNCE_MS)
        );
    };

    const handleFiles = async (party: Party, files: File[]) => {
        setLoadingPartyIds((prev) => [...prev, party.id]);
        try {
            for (const file of files) {
                try {
                    const records = await readXlsxFile(file);
                    updateParty(party.id, (p) =>
                        withRecords(p, { fileRecords: [...p.fileRecords, ...records], fileNames: [...p.fileNames, file.name] })
                    );
                    addLog(`${party.name}: "${file.name}" dosyasından ${records.length} dosya okundu.`);
                    if (records.length === 0) {
                        toast.warning(`"${file.name}" içinde dosya kaydı bulunamadı. Başlık satırını kontrol edin.`);
                    }
                } catch (error) {
                    const message = error instanceof Error ? error.message : String(error);
                    addLog(`"${file.name}" okunamadı: ${message}`, 'ERROR');
                    toast.error(`"${file.name}" okunamadı.`);
                }
            }
        } finally {
            setLoadingPartyIds((prev) => prev.filter((pid) => pid !== party.id));
        }
    };

    const handleClearParty = (id: string) => {
        clearTimeout(parseTimers.current.get(id));
        updateParty(id, (p) => withRecords(p, { text: '', textRecords: [], fileRecords: [], fileNames: [] }));
    };

    const handleAddParty = () => {
        setParties((prev) => [...prev, createParty(prev.length)]);
        invalidateResults();
    };

    const handleRemoveParty = (id: string) => {
        clearTimeout(parseTimers.current.get(id));
        const remaining = parties.length - 1;
        setParties((prev) => prev.filter((p) => p.id !== id));
        setMinCount((m) => Math.max(2, Math.min(m, remaining)));
        invalidateResults();
    };

    const filledPartyCount = parties.filter((p) => p.records.length > 0).length;
    const canCompare = filledPartyCount >= 2 && !isComparing;

    const runCompare = useCallback(
        (count: number) => {
            const active = parties.filter((p) => p.records.length > 0);
            if (active.length < 2) {
                toast.warning('Karşılaştırma için en az iki kişide veri olmalıdır.');
                return;
            }
            setIsComparing(true);
            // Yükleniyor göstergesinin çizilebilmesi için bir kare bekle.
            requestAnimationFrame(() => {
                const threshold = Math.min(count, active.length);
                const started = performance.now();
                const common = compareParties(active, threshold);
                const elapsed = Math.round(performance.now() - started);
                setResults(common);
                setHasCompared(true);
                setIsComparing(false);
                if (common.length > 0) {
                    addLog(`${active.length} kişi karşılaştırıldı (en az ${threshold} kişide ortak): ${common.length} ortak dosya, ${elapsed} ms.`, 'SUCCESS');
                    toast.success(`${common.length} ortak kayıt bulundu!`);
                } else {
                    addLog(`${active.length} kişi karşılaştırıldı: ortak kayıt bulunamadı (Dosya Türü / Dosya No kontrol edin).`, 'WARN');
                }
            });
        },
        [parties, addLog, toast]
    );

    const handleCompare = useCallback(() => runCompare(minCount), [runCompare, minCount]);

    const handleMinCountChange = (value: number) => {
        setMinCount(value);
        if (hasCompared) runCompare(value);
    };

    const handleClearAll = useCallback(() => {
        parseTimers.current.forEach((timer) => clearTimeout(timer));
        parseTimers.current.clear();
        setParties(initialParties());
        setMinCount(2);
        invalidateResults();
        setLogs([]);
        toast.info('Tüm veriler temizlendi.');
    }, [toast, invalidateResults]);

    const handleExportExcel = useCallback(async () => {
        if (results.length === 0) {
            toast.warning('Dışa aktarılacak sonuç yok.');
            return;
        }
        try {
            const saved = await saveBinaryFile(`Karsilastirma_Raporu_${todayStamp()}.xlsx`, (await import('./core/xlsx')).buildResultsWorkbook(results, parties), {
                name: 'Excel Çalışma Kitabı',
                extensions: ['xlsx'],
            });
            if (saved) toast.success('Excel dosyası kaydedildi.');
        } catch (error) {
            console.error(error);
            toast.error('Excel dosyası kaydedilemedi.');
        }
    }, [results, parties, toast]);

    useKeyboardShortcuts([
        { key: 'k', ctrl: true, handler: handleCompare, description: 'Karşılaştır' },
        { key: 's', ctrl: true, handler: handleExportExcel, description: 'Excel İndir' },
        { key: 'Escape', handler: () => setIsPdfModalOpen(false), description: 'Modal Kapat' },
    ]);

    // Sonuçta yalnız karşılaştırmaya katılmış kişiler gösterilir.
    const resultParties = results.length > 0 ? parties.filter((p) => results[0].roles[p.id] !== undefined) : parties;

    return (
        <div
            style={{
                minHeight: '100vh',
                backgroundColor: 'var(--bg-secondary)',
                display: 'flex',
                flexDirection: 'column',
                fontFamily: 'var(--font-sans)',
                color: 'var(--text-primary)',
            }}
        >
            <UpdateNotification />
            <ToastContainer />

            {/* Header */}
            <header
                style={{
                    backgroundColor: 'var(--bg-card)',
                    borderBottom: '1px solid var(--border-primary)',
                    boxShadow: 'var(--shadow-sm)',
                    position: 'sticky',
                    top: 0,
                    zIndex: 20,
                }}
            >
                <div
                    style={{
                        maxWidth: '1280px',
                        margin: '0 auto',
                        padding: '0 1.5rem',
                        height: '64px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                    }}
                >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <div style={{ backgroundColor: '#b91c1c', padding: '0.5rem', borderRadius: 'var(--radius-lg)', color: 'white' }}>
                            <Scale size={24} />
                        </div>
                        <div>
                            <h1 style={{ fontSize: '1.25rem', fontWeight: 'bold', color: 'var(--text-primary)', lineHeight: 1.2 }}>
                                UYAP Dosya Karşılaştırma
                            </h1>
                            <p style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', fontWeight: 500 }}>
                                Cumhuriyet Başsavcılığı Analiz Modülü
                            </p>
                        </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        {isUpdateVisible && (
                            <button
                                onClick={handleUpdateClick}
                                disabled={isDownloading}
                                aria-label={`Yeni sürümü yükle: v${updateVersion}`}
                                title={`Yeni sürüm mevcut: v${updateVersion} — indirip kurar ve uygulamayı yeniden başlatır`}
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: '0.5rem',
                                    padding: '0.5rem 1rem',
                                    borderRadius: 'var(--radius-md)',
                                    border: 'none',
                                    backgroundColor: '#10b981',
                                    color: 'white',
                                    cursor: isDownloading ? 'not-allowed' : 'pointer',
                                    fontWeight: 600,
                                    fontSize: '0.875rem',
                                    transition: 'all var(--transition-fast)',
                                    opacity: isDownloading ? 0.7 : 1,
                                }}
                            >
                                {isDownloading ? (
                                    <>
                                        <Loader2 size={16} className="animate-spin" />
                                        İndiriliyor{updateProgress !== null ? ` %${updateProgress}` : '...'}
                                    </>
                                ) : (
                                    <>
                                        <RefreshCcw size={16} />
                                        Güncelle v{updateVersion}
                                    </>
                                )}
                            </button>
                        )}

                        <button onClick={() => setShowHelp(true)} aria-label="Yardım ve kullanım kılavuzu" title="Yardım" style={headerIconButton}>
                            <HelpCircle size={18} />
                        </button>

                        <button
                            onClick={() => setShowShortcuts(!showShortcuts)}
                            aria-label="Klavye kısayollarını göster"
                            title="Klavye Kısayolları"
                            style={headerIconButton}
                        >
                            <Keyboard size={18} />
                        </button>

                        <ThemeToggle />

                        <button
                            onClick={handleClearAll}
                            aria-label="Tüm verileri sıfırla"
                            style={{ ...secondaryButton, gap: '0.5rem', padding: '0.5rem 1rem', transition: 'all var(--transition-fast)' }}
                        >
                            <RefreshCcw size={16} />
                            Sıfırla
                        </button>

                        <button
                            onClick={handleCompare}
                            disabled={!canCompare}
                            aria-label="Verileri karşılaştır"
                            aria-busy={isComparing}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.5rem',
                                padding: '0.5rem 1rem',
                                fontSize: '0.875rem',
                                fontWeight: 500,
                                color: 'white',
                                backgroundColor: 'var(--color-primary)',
                                border: 'none',
                                borderRadius: 'var(--radius-md)',
                                cursor: canCompare ? 'pointer' : 'not-allowed',
                                opacity: canCompare ? 1 : 0.7,
                                transition: 'all var(--transition-fast)',
                            }}
                        >
                            {isComparing ? (
                                <>
                                    <Loader2 size={16} className="animate-spin" />
                                    İşleniyor...
                                </>
                            ) : (
                                <>
                                    <FileOutput size={16} />
                                    Karşılaştır
                                </>
                            )}
                        </button>
                    </div>
                </div>
            </header>

            {/* Keyboard Shortcuts Panel */}
            {showShortcuts && (
                <div
                    className="animate-slide-down"
                    style={{ backgroundColor: 'var(--bg-card)', borderBottom: '1px solid var(--border-primary)', padding: '0.75rem 1.5rem' }}
                >
                    <div style={{ maxWidth: '1280px', margin: '0 auto', display: 'flex', gap: '2rem', fontSize: '0.8125rem' }}>
                        <span style={{ color: 'var(--text-tertiary)', fontWeight: 600 }}>Kısayollar:</span>
                        {[
                            ['CTRL+K', 'Karşılaştır'],
                            ['CTRL+S', 'Excel İndir'],
                            ['ESC', 'Modal Kapat'],
                        ].map(([keys, label]) => (
                            <span key={keys}>
                                <kbd style={kbdStyle}>{keys}</kbd> <span style={{ color: 'var(--text-secondary)' }}>{label}</span>
                            </span>
                        ))}
                    </div>
                </div>
            )}

            {/* Main Content */}
            <main style={{ flex: 1, maxWidth: '1280px', margin: '0 auto', width: '100%', padding: '1.5rem' }}>
                {/* Input Section */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
                    <h2 style={sectionTitle}>
                        <SectionBar />
                        Veri Girişi
                        <span
                            style={{
                                backgroundColor: 'var(--bg-tertiary)',
                                color: 'var(--text-secondary)',
                                fontSize: '0.75rem',
                                padding: '0.25rem 0.5rem',
                                borderRadius: 'var(--radius-full)',
                                fontWeight: 'bold',
                                marginLeft: '0.5rem',
                            }}
                        >
                            {parties.length} Kişi
                        </span>
                    </h2>
                    <button onClick={handleAddParty} style={secondaryButton} title="Karşılaştırmaya yeni kişi ekle">
                        <UserPlus size={16} style={{ color: 'var(--color-primary)' }} />
                        Kişi Ekle
                    </button>
                </div>

                <div
                    style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 520px), 1fr))',
                        gap: '1.5rem',
                        marginBottom: '1.5rem',
                    }}
                >
                    {parties.map((party, index) => (
                        <DataInput
                            key={party.id}
                            party={party}
                            canRemove={index >= DEFAULT_PARTY_COUNT}
                            isLoadingFile={loadingPartyIds.includes(party.id)}
                            onNameChange={(name) => updateParty(party.id, (p) => ({ ...p, name }))}
                            onTextChange={(text) => handleTextChange(party, text)}
                            onFiles={(files) => handleFiles(party, files)}
                            onClear={() => handleClearParty(party.id)}
                            onRemove={() => handleRemoveParty(party.id)}
                        />
                    ))}
                </div>

                {/* Results Section */}
                <div style={{ marginBottom: '1.5rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem', gap: '1rem', flexWrap: 'wrap' }}>
                        <h2 style={sectionTitle}>
                            <SectionBar />
                            Analiz Sonuçları
                            {results.length > 0 && (
                                <span
                                    style={{
                                        backgroundColor: 'var(--color-success-bg)',
                                        color: 'var(--color-success)',
                                        fontSize: '0.75rem',
                                        padding: '0.25rem 0.5rem',
                                        borderRadius: 'var(--radius-full)',
                                        fontWeight: 'bold',
                                        marginLeft: '0.5rem',
                                    }}
                                >
                                    {results.length} Eşleşme
                                </span>
                            )}
                        </h2>
                        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                            {parties.length > 2 && (
                                <label style={{ ...secondaryButton, cursor: 'default', gap: '0.5rem' }} title="Bir dosyanın listelenmesi için kaç kişide ortak olması gerektiği">
                                    <Users size={16} style={{ color: 'var(--color-primary)' }} />
                                    En az
                                    <select
                                        value={minCount}
                                        onChange={(e) => handleMinCountChange(Number(e.target.value))}
                                        aria-label="En az kaç kişide ortak"
                                        style={{
                                            border: '1px solid var(--border-primary)',
                                            borderRadius: 'var(--radius-sm)',
                                            backgroundColor: 'var(--bg-primary)',
                                            color: 'var(--text-primary)',
                                            padding: '0.125rem 0.25rem',
                                            fontSize: '0.875rem',
                                            fontWeight: 600,
                                        }}
                                    >
                                        {Array.from({ length: parties.length - 1 }, (_, i) => i + 2).map((n) => (
                                            <option key={n} value={n}>
                                                {n}
                                            </option>
                                        ))}
                                    </select>
                                    kişide ortak
                                </label>
                            )}
                            {results.length > 0 && (
                                <>
                                    <button onClick={() => setIsPdfModalOpen(true)} style={secondaryButton}>
                                        <FileText size={16} style={{ color: 'var(--color-error)' }} />
                                        PDF Oluştur
                                    </button>
                                    <button onClick={handleExportExcel} style={secondaryButton}>
                                        <Download size={16} style={{ color: 'var(--color-success)' }} />
                                        Excel
                                    </button>
                                </>
                            )}
                        </div>
                    </div>

                    <ResultsTable data={results} parties={resultParties} />
                </div>

                {/* Logs */}
                <div style={{ paddingBottom: '2.5rem' }}>
                    <Logger logs={logs} />
                </div>

                {isPdfModalOpen && (
                    <Suspense fallback={null}>
                        <PdfExportModal isOpen onClose={() => setIsPdfModalOpen(false)} data={results} parties={resultParties} />
                    </Suspense>
                )}

                <HelpDialog isOpen={showHelp} onClose={() => setShowHelp(false)} />
            </main>
        </div>
    );
}
