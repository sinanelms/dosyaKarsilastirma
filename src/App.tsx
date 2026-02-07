import { useState, useCallback } from 'react';
import { Scale, FileOutput, RefreshCcw, Download, FileText, Keyboard, HelpCircle, Loader2 } from 'lucide-react';
import { DataInput } from './components/DataInput';
import { ResultsTable } from './components/ResultsTable';
import { Logger } from './components/Logger';
import { PdfExportModal } from './components/PdfExportModal';
import { ThemeToggle, ToastContainer, UpdateNotification, HelpDialog } from './components/common';
import { parseClipboardData, compareDatasets } from './utils/processor';
import { useToast } from './context';
import { useKeyboardShortcuts } from './hooks';
import { CaseRecord, LogEntry } from './types';
import { FIXED_HEADERS } from './constants';

export default function App() {
    // Party 1 State
    const [name1, setName1] = useState('1. Kişi');
    const [text1, setText1] = useState('');
    const [data1, setData1] = useState<CaseRecord[]>([]);

    // Party 2 State
    const [name2, setName2] = useState('2. Kişi');
    const [text2, setText2] = useState('');
    const [data2, setData2] = useState<CaseRecord[]>([]);

    // Results & Logs
    const [results, setResults] = useState<CaseRecord[]>([]);
    const [logs, setLogs] = useState<LogEntry[]>([]);

    // PDF Modal State
    const [isPdfModalOpen, setIsPdfModalOpen] = useState(false);
    const [showShortcuts, setShowShortcuts] = useState(false);
    const [showHelp, setShowHelp] = useState(false);

    // Loading States
    const [isComparing, setIsComparing] = useState(false);

    // Hooks
    const toast = useToast();

    const addLog = useCallback((log: LogEntry) => {
        setLogs((prev) => [...prev, log]);
    }, []);

    const handleText1Change = (val: string) => {
        setText1(val);
        if (!val.trim()) {
            setData1([]);
        } else {
            const parsed = parseClipboardData(val, addLog);
            setData1(parsed);
        }
    };

    const handleText2Change = (val: string) => {
        setText2(val);
        if (!val.trim()) {
            setData2([]);
        } else {
            const parsed = parseClipboardData(val, addLog);
            setData2(parsed);
        }
    };

    const handleCompare = useCallback(() => {
        if (data1.length === 0 || data2.length === 0) {
            toast.warning('Karşılaştırma için her iki alanda da veri olmalıdır.');
            return;
        }
        setIsComparing(true);
        // Simulate processing delay for better UX feedback
        setTimeout(() => {
            const common = compareDatasets(data1, data2, addLog);
            setResults(common);
            setIsComparing(false);
            if (common.length > 0) {
                toast.success(`${common.length} ortak kayıt bulundu!`);
            }
        }, 300);
    }, [data1, data2, addLog, toast]);

    const handleClearAll = useCallback(() => {
        setText1('');
        setText2('');
        setData1([]);
        setData2([]);
        setResults([]);
        setLogs([]);
        setName1('1. Kişi');
        setName2('2. Kişi');
        toast.info('Tüm veriler temizlendi.');
    }, [toast]);

    const handleExportCSV = useCallback(() => {
        if (results.length === 0) {
            toast.warning('Dışa aktarılacak sonuç yok.');
            return;
        }

        const headers = FIXED_HEADERS.join('\t');
        const rows = results
            .map((row) =>
                FIXED_HEADERS.map((header) => `"${(row as Record<string, unknown>)[header]}"`).join('\t')
            )
            .join('\n');

        const csvContent = headers + '\n' + rows;
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);

        const link = document.createElement('a');
        link.setAttribute('href', url);
        link.setAttribute('download', `Karsilastirma_Raporu_${new Date().toISOString().slice(0, 10)}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        toast.success('CSV dosyası indirildi.');
    }, [results, toast]);

    // Keyboard Shortcuts
    useKeyboardShortcuts([
        { key: 'k', ctrl: true, handler: handleCompare, description: 'Karşılaştır' },
        { key: 's', ctrl: true, handler: handleExportCSV, description: 'CSV İndir' },
        { key: 'Escape', handler: () => setIsPdfModalOpen(false), description: 'Modal Kapat' },
    ]);

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
            {/* Update Notification */}
            <UpdateNotification />

            {/* Toast Container */}
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
                        <div
                            style={{
                                backgroundColor: '#b91c1c',
                                padding: '0.5rem',
                                borderRadius: 'var(--radius-lg)',
                                color: 'white',
                            }}
                        >
                            <Scale size={24} />
                        </div>
                        <div>
                            <h1
                                style={{
                                    fontSize: '1.25rem',
                                    fontWeight: 'bold',
                                    color: 'var(--text-primary)',
                                    lineHeight: 1.2,
                                }}
                            >
                                UYAP Dosya Karşılaştırma
                            </h1>
                            <p
                                style={{
                                    fontSize: '0.75rem',
                                    color: 'var(--text-tertiary)',
                                    fontWeight: 500,
                                }}
                            >
                                Cumhuriyet Başsavcılığı Analiz Modülü
                            </p>
                        </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        {/* Help Button */}
                        <button
                            onClick={() => setShowHelp(true)}
                            aria-label="Yardım ve kullanım kılavuzu"
                            title="Yardım"
                            style={{
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
                            }}
                        >
                            <HelpCircle size={18} />
                        </button>

                        {/* Keyboard Shortcuts Help */}
                        <button
                            onClick={() => setShowShortcuts(!showShortcuts)}
                            aria-label="Klavye kısayollarını göster"
                            title="Klavye Kısayolları"
                            style={{
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
                            }}
                        >
                            <Keyboard size={18} />
                        </button>

                        {/* Theme Toggle */}
                        <ThemeToggle />

                        {/* Clear Button */}
                        <button
                            onClick={handleClearAll}
                            aria-label="Tüm verileri sıfırla"
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.5rem',
                                padding: '0.5rem 1rem',
                                fontSize: '0.875rem',
                                fontWeight: 500,
                                color: 'var(--text-secondary)',
                                backgroundColor: 'var(--bg-card)',
                                border: '1px solid var(--border-primary)',
                                borderRadius: 'var(--radius-md)',
                                cursor: 'pointer',
                                transition: 'all var(--transition-fast)',
                            }}
                        >
                            <RefreshCcw size={16} />
                            Sıfırla
                        </button>

                        {/* Compare Button */}
                        <button
                            onClick={handleCompare}
                            disabled={data1.length === 0 || data2.length === 0 || isComparing}
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
                                cursor: data1.length === 0 || data2.length === 0 || isComparing ? 'not-allowed' : 'pointer',
                                opacity: data1.length === 0 || data2.length === 0 || isComparing ? 0.7 : 1,
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
                    style={{
                        backgroundColor: 'var(--bg-card)',
                        borderBottom: '1px solid var(--border-primary)',
                        padding: '0.75rem 1.5rem',
                    }}
                >
                    <div
                        style={{
                            maxWidth: '1280px',
                            margin: '0 auto',
                            display: 'flex',
                            gap: '2rem',
                            fontSize: '0.8125rem',
                        }}
                    >
                        <span style={{ color: 'var(--text-tertiary)', fontWeight: 600 }}>Kısayollar:</span>
                        <span>
                            <kbd
                                style={{
                                    backgroundColor: 'var(--bg-tertiary)',
                                    padding: '0.125rem 0.375rem',
                                    borderRadius: 'var(--radius-sm)',
                                    fontSize: '0.75rem',
                                    fontFamily: 'var(--font-mono)',
                                }}
                            >
                                CTRL+K
                            </kbd>{' '}
                            <span style={{ color: 'var(--text-secondary)' }}>Karşılaştır</span>
                        </span>
                        <span>
                            <kbd
                                style={{
                                    backgroundColor: 'var(--bg-tertiary)',
                                    padding: '0.125rem 0.375rem',
                                    borderRadius: 'var(--radius-sm)',
                                    fontSize: '0.75rem',
                                    fontFamily: 'var(--font-mono)',
                                }}
                            >
                                CTRL+S
                            </kbd>{' '}
                            <span style={{ color: 'var(--text-secondary)' }}>CSV İndir</span>
                        </span>
                        <span>
                            <kbd
                                style={{
                                    backgroundColor: 'var(--bg-tertiary)',
                                    padding: '0.125rem 0.375rem',
                                    borderRadius: 'var(--radius-sm)',
                                    fontSize: '0.75rem',
                                    fontFamily: 'var(--font-mono)',
                                }}
                            >
                                ESC
                            </kbd>{' '}
                            <span style={{ color: 'var(--text-secondary)' }}>Modal Kapat</span>
                        </span>
                    </div>
                </div>
            )}

            {/* Main Content */}
            <main
                style={{
                    flex: 1,
                    maxWidth: '1280px',
                    margin: '0 auto',
                    width: '100%',
                    padding: '1.5rem',
                }}
            >
                {/* Input Section */}
                <div
                    style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(2, 1fr)',
                        gap: '1.5rem',
                        height: '400px',
                        marginBottom: '1.5rem',
                    }}
                >
                    <DataInput
                        partyName={name1}
                        onNameChange={setName1}
                        count={data1.length}
                        value={text1}
                        onChange={handleText1Change}
                        onClear={() => {
                            setText1('');
                            setData1([]);
                        }}
                        color="blue"
                        data={data1}
                    />
                    <DataInput
                        partyName={name2}
                        onNameChange={setName2}
                        count={data2.length}
                        value={text2}
                        onChange={handleText2Change}
                        onClear={() => {
                            setText2('');
                            setData2([]);
                        }}
                        color="indigo"
                        data={data2}
                    />
                </div>

                {/* Results Section */}
                <div style={{ marginBottom: '1.5rem' }}>
                    <div
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            marginBottom: '1rem',
                        }}
                    >
                        <h2
                            style={{
                                fontSize: '1.125rem',
                                fontWeight: 'bold',
                                color: 'var(--text-primary)',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.5rem',
                            }}
                        >
                            <span
                                style={{
                                    width: '4px',
                                    height: '24px',
                                    backgroundColor: 'var(--color-primary)',
                                    borderRadius: 'var(--radius-full)',
                                }}
                            />
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
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                            {results.length > 0 && (
                                <>
                                    <button
                                        onClick={() => setIsPdfModalOpen(true)}
                                        style={{
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
                                        }}
                                    >
                                        <FileText size={16} style={{ color: 'var(--color-error)' }} />
                                        PDF Oluştur
                                    </button>
                                    <button
                                        onClick={handleExportCSV}
                                        style={{
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
                                        }}
                                    >
                                        <Download size={16} style={{ color: 'var(--color-success)' }} />
                                        Excel/CSV
                                    </button>
                                </>
                            )}
                        </div>
                    </div>

                    <ResultsTable data={results} party1Name={name1} party2Name={name2} />
                </div>

                {/* Logs */}
                <div style={{ paddingBottom: '2.5rem' }}>
                    <Logger logs={logs} />
                </div>

                {/* PDF Modal */}
                <PdfExportModal
                    isOpen={isPdfModalOpen}
                    onClose={() => setIsPdfModalOpen(false)}
                    data={results}
                    party1Name={name1}
                    party2Name={name2}
                />

                {/* Help Dialog */}
                <HelpDialog isOpen={showHelp} onClose={() => setShowHelp(false)} />
            </main>
        </div>
    );
}
