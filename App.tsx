import React, { useState, useCallback } from 'react';
import { Scale, FileOutput, RefreshCcw, Download, FileText } from 'lucide-react';
import { DataInput } from './components/DataInput';
import { ResultsTable } from './components/ResultsTable';
import { Logger } from './components/Logger';
import { PdfExportModal } from './components/PdfExportModal';
import { parseClipboardData, compareDatasets } from './utils/processor';
import { CaseRecord, LogEntry } from './types';
import { FIXED_HEADERS } from './constants';

export default function App() {
  // Party 1 State
  const [name1, setName1] = useState("1. Kişi");
  const [text1, setText1] = useState("");
  const [data1, setData1] = useState<CaseRecord[]>([]);

  // Party 2 State
  const [name2, setName2] = useState("2. Kişi");
  const [text2, setText2] = useState("");
  const [data2, setData2] = useState<CaseRecord[]>([]);

  // Results & Logs
  const [results, setResults] = useState<CaseRecord[]>([]);
  const [logs, setLogs] = useState<LogEntry[]>([]);

  // PDF Modal State
  const [isPdfModalOpen, setIsPdfModalOpen] = useState(false);

  const addLog = useCallback((log: LogEntry) => {
    setLogs(prev => [...prev, log]);
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

  const handleCompare = () => {
    if (data1.length === 0 || data2.length === 0) {
      addLog({ 
        id: Date.now().toString(), 
        timestamp: new Date().toLocaleTimeString(), 
        message: "Karşılaştırma için her iki alanda da veri olmalıdır.", 
        type: "WARN" 
      });
      return;
    }
    const common = compareDatasets(data1, data2, addLog);
    setResults(common);
  };

  const handleClearAll = () => {
    setText1("");
    setText2("");
    setData1([]);
    setData2([]);
    setResults([]);
    setLogs([]);
    setName1("1. Kişi");
    setName2("2. Kişi");
  };

  const handleExportCSV = () => {
    if (results.length === 0) return;
    
    // Create CSV content
    const headers = FIXED_HEADERS.join('\t');
    const rows = results.map(row => 
      FIXED_HEADERS.map(header => `"${(row as any)[header]}"`).join('\t')
    ).join('\n');
    
    const csvContent = headers + '\n' + rows;
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `Karsilastirma_Raporu_${new Date().toISOString().slice(0,10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans text-slate-900">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 shadow-sm sticky top-0 z-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-red-700 p-2 rounded-lg text-white">
              <Scale size={24} />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-800 leading-tight">UYAP Dosya Karşılaştırma</h1>
              <p className="text-xs text-slate-500 font-medium">Cumhuriyet Başsavcılığı Analiz Modülü</p>
            </div>
          </div>
          <div className="flex gap-3">
             <button 
                onClick={handleClearAll}
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-slate-600 bg-white border border-slate-300 rounded-md hover:bg-slate-50 shadow-sm transition-all"
             >
                <RefreshCcw size={16} />
                Sıfırla
             </button>
             <button 
                onClick={handleCompare}
                disabled={data1.length === 0 || data2.length === 0}
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-700 rounded-md hover:bg-blue-800 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed transition-all"
             >
                <FileOutput size={16} />
                Karşılaştır
             </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        
        {/* Input Section */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 h-[400px]">
          <DataInput 
            partyName={name1}
            onNameChange={setName1}
            count={data1.length} 
            value={text1}
            onChange={handleText1Change}
            onClear={() => { setText1(""); setData1([]); }}
            color="blue"
            data={data1}
          />
          <DataInput 
            partyName={name2}
            onNameChange={setName2}
            count={data2.length} 
            value={text2}
            onChange={handleText2Change}
            onClear={() => { setText2(""); setData2([]); }}
            color="indigo"
            data={data2}
          />
        </div>

        {/* Results Section */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
              <span className="w-2 h-6 bg-blue-600 rounded-full"></span>
              Analiz Sonuçları
              {results.length > 0 && <span className="bg-green-100 text-green-800 text-xs px-2 py-1 rounded-full font-bold ml-2">{results.length} Eşleşme</span>}
            </h2>
            <div className="flex gap-2">
                {results.length > 0 && (
                  <>
                    <button 
                        onClick={() => setIsPdfModalOpen(true)}
                        className="text-sm bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 font-medium px-3 py-1.5 rounded-md shadow-sm flex items-center gap-1 transition-all"
                    >
                        <FileText size={16} className="text-red-600" />
                        PDF Oluştur
                    </button>
                    <button 
                        onClick={handleExportCSV}
                        className="text-sm bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 font-medium px-3 py-1.5 rounded-md shadow-sm flex items-center gap-1 transition-all"
                    >
                        <Download size={16} className="text-green-600" />
                        Excel/CSV
                    </button>
                  </>
                )}
            </div>
          </div>
          
          <ResultsTable data={results} party1Name={name1} party2Name={name2} />
        </div>

        {/* Logs */}
        <div className="pb-10">
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

      </main>
    </div>
  );
}