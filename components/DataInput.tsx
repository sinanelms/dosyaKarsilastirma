import React, { useState, useRef, useEffect } from 'react';
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
  data?: CaseRecord[]; // Processed data for table view
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
  
  // Auto-switch to table view if data is populated initially or changes significantly
  useEffect(() => {
    if (count > 0 && viewMode === 'raw' && !value.endsWith('\n')) {
        // Optional: We could auto-switch here, but let's respect user choice for now.
        // setViewMode('table');
    }
  }, [count]);

  // Dynamic styles based on color prop
  const theme = color === "blue" 
    ? {
        border: "border-blue-200",
        activeBorder: "border-blue-500 ring-4 ring-blue-500/10",
        headerBg: "bg-blue-50",
        headerText: "text-blue-900",
        button: "hover:bg-blue-100 text-blue-700",
        icon: "text-blue-400",
        activeIcon: "text-blue-600",
        selection: "selection:bg-blue-100"
      }
    : {
        border: "border-indigo-200",
        activeBorder: "border-indigo-500 ring-4 ring-indigo-500/10",
        headerBg: "bg-indigo-50",
        headerText: "text-indigo-900",
        button: "hover:bg-indigo-100 text-indigo-700",
        icon: "text-indigo-400",
        activeIcon: "text-indigo-600",
        selection: "selection:bg-indigo-100"
      };

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
      
      // Focus back to container to keep the active state visuals
      if (viewMode === 'raw' && textareaRef.current) textareaRef.current.focus();
      else if (containerRef.current) containerRef.current.focus();

    } catch (err) {
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
     // Optional: Auto switch to table view on successful paste
     if (count === 0) setViewMode('table');
  };

  const handleManualPaste = (e: React.ClipboardEvent) => {
    // Prevent default to avoid double pasting or native replacement issues in certain browsers
    // but usually let textarea handle it naturally. However, for animation we intervene.
    
    // For raw mode, let textarea handle it but trigger animation
    if (viewMode === 'raw') {
        triggerPasteAnimation();
        return; 
    }

    // For table mode (div), we must handle it manually
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
      className={`flex flex-col h-full bg-white rounded-xl transition-all duration-200 overflow-hidden relative
        ${isFocused ? `shadow-lg scale-[1.01] z-10 ${theme.activeBorder}` : `shadow-sm border ${theme.border} hover:shadow-md`}
      `}
      onFocus={() => setIsFocused(true)}
      onBlur={(e) => {
        // Check if the new focus is still inside this component
        if (!e.currentTarget.contains(e.relatedTarget)) {
            setIsFocused(false);
        }
      }}
    >
      {/* Paste Success Animation Overlay */}
      <div 
        className={`absolute inset-0 bg-green-400/20 z-50 pointer-events-none transition-opacity duration-500 ease-out mix-blend-multiply
            ${justPasted ? 'opacity-100' : 'opacity-0'}
        `}
      />

      {/* Header Area */}
      <div className={`px-4 py-3 border-b ${theme.headerBg} ${theme.headerText} flex items-center justify-between transition-colors`}>
        
        {/* Left: Name & Icon */}
        <div className="flex items-center gap-2 flex-1">
            <FolderOpen className={isFocused ? theme.activeIcon : theme.icon} size={20} />
            <div className={`flex items-center bg-white/60 rounded-lg px-2 py-1 border transition-all ${isFocused ? 'border-blue-400/50 shadow-sm' : 'border-black/5' } w-full max-w-[180px]`}>
                <input 
                    type="text" 
                    value={partyName}
                    onChange={(e) => onNameChange(e.target.value)}
                    className="bg-transparent border-none outline-none text-sm font-bold w-full placeholder-slate-400"
                    placeholder="İsim Giriniz"
                />
            </div>
            <span className={`text-xs font-mono px-2 py-1 rounded-md border shadow-sm whitespace-nowrap min-w-[3rem] text-center transition-colors ${isFocused ? 'bg-white text-slate-900 border-blue-200' : 'bg-white/80 border-black/5 text-slate-600'}`}>
             {count}
           </span>
        </div>

        {/* Right: View Toggle */}
        <div className="flex bg-white/50 p-0.5 rounded-lg border border-black/5">
            <button 
                onClick={() => setViewMode('raw')}
                className={`p-1.5 rounded-md transition-all ${viewMode === 'raw' ? 'bg-white shadow text-slate-800' : 'text-slate-400 hover:text-slate-600'}`}
                title="Metin Görünümü"
            >
                <FileText size={14} />
            </button>
            <button 
                onClick={() => setViewMode('table')}
                className={`p-1.5 rounded-md transition-all ${viewMode === 'table' ? 'bg-white shadow text-slate-800' : 'text-slate-400 hover:text-slate-600'}`}
                title="Tablo Görünümü"
            >
                <List size={14} />
            </button>
        </div>
      </div>

      {/* Content Area */}
      <div 
        ref={containerRef}
        className={`flex-1 relative group bg-white overflow-hidden outline-none ${theme.selection}`}
        tabIndex={0} // Make focusable for paste events in table mode
        onPaste={handleManualPaste}
      >
        {viewMode === 'raw' ? (
            <textarea
              ref={textareaRef}
              className={`w-full h-full p-4 resize-none outline-none text-xs font-mono text-slate-600 border-0 bg-transparent placeholder:text-slate-300 custom-scrollbar`}
              placeholder={`Buraya veri yapıştırın...`}
              value={value}
              onChange={(e) => onChange(e.target.value)}
              // onPaste event handled by parent div for unified animation
              spellCheck={false}
            />
        ) : (
            <div className="w-full h-full overflow-y-auto custom-scrollbar bg-slate-50/50">
                {data.length > 0 ? (
                    <table className="w-full text-left border-collapse">
                        <thead className="bg-slate-100 text-xs text-slate-500 uppercase font-semibold sticky top-0 z-10 shadow-sm">
                            <tr>
                                <th className="px-3 py-2 border-b border-slate-200 w-10 text-center">#</th>
                                <th className="px-3 py-2 border-b border-slate-200 w-24">Dosya No</th>
                                <th className="px-3 py-2 border-b border-slate-200">Suçu</th>
                                <th className="px-3 py-2 border-b border-slate-200 w-20">Durum</th>
                            </tr>
                        </thead>
                        <tbody className="text-xs font-mono">
                            {data.map((row, i) => (
                                <tr key={row._id} className="border-b border-slate-100 hover:bg-blue-50/50">
                                    <td className="px-3 py-2 text-center text-slate-400">{i + 1}</td>
                                    <td className="px-3 py-2 font-bold text-slate-700 whitespace-nowrap">{row["Dosya No"]}</td>
                                    <td className="px-3 py-2 text-slate-600 truncate max-w-[120px]" title={row["Suçu"]}>{row["Suçu"] || "-"}</td>
                                    <td className="px-3 py-2">
                                        <span className={`px-1.5 py-0.5 rounded text-[10px] border whitespace-nowrap ${
                                            row["Dosya Durumu"].toLowerCase().includes('açık') ? 'bg-green-50 text-green-700 border-green-100' : 
                                            row["Dosya Durumu"].toLowerCase().includes('kapalı') ? 'bg-red-50 text-red-700 border-red-100' : 
                                            'bg-slate-100 text-slate-600 border-slate-200'
                                        }`}>
                                            {row["Dosya Durumu"]}
                                        </span>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                ) : (
                    <div className="flex flex-col items-center justify-center h-full text-slate-400 gap-2 pointer-events-none">
                        <List size={32} className="opacity-20" />
                        <span className="text-xs">Henüz veri yok.</span>
                        <span className="text-[10px] opacity-60">Yapıştırmak için CTRL+V kullanın</span>
                    </div>
                )}
            </div>
        )}

        {/* Visual Cue for Active State */}
        {isFocused && (
            <div className="absolute top-2 right-2 pointer-events-none animate-in fade-in duration-300">
                <span className={`text-[10px] font-bold px-2 py-1 rounded-full bg-slate-900/5 text-slate-500 flex items-center gap-1 backdrop-blur-sm border border-white/50`}>
                    <Keyboard size={10} />
                    Yapıştırmaya Hazır
                </span>
            </div>
        )}

        {/* Empty State / Hover Hint (Only for raw mode when empty and NOT focused) */}
        {viewMode === 'raw' && !value && !isFocused && (
           <div className="absolute inset-0 pointer-events-none flex items-center justify-center text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity">
              <span className="bg-slate-50 px-3 py-1.5 rounded-md shadow-sm border border-slate-200 text-xs font-medium">
                 Tıkla ve Yapıştır
              </span>
           </div>
        )}
      </div>

      {/* Footer Actions */}
      <div className={`bg-slate-50 p-2 border-t flex justify-between items-center gap-2 transition-colors ${isFocused ? 'bg-slate-100' : ''}`}>
        <div className="flex-1 px-2">
            {pasteMessage && (
                <div className="flex items-center gap-1.5 text-xs text-amber-600 font-medium animate-pulse">
                    <AlertCircle size={14} />
                    {pasteMessage}
                </div>
            )}
        </div>
        <div className="flex gap-2">
            <button 
              onClick={handlePasteButton}
              className={`px-3 py-1.5 text-xs font-bold uppercase tracking-wide rounded-md transition-colors flex items-center gap-1.5 ${theme.button} border border-transparent hover:border-black/5`}
              title="Panodaki veriyi mevcut verinin altına ekler"
            >
              <ClipboardPaste size={14} />
              <span className="hidden sm:inline">Ekle / Yapıştır</span>
            </button>
            <button 
              onClick={handleClear}
              className="px-3 py-1.5 text-xs font-bold uppercase tracking-wide text-red-600 hover:bg-red-50 rounded-md transition-colors flex items-center gap-1.5 border border-transparent hover:border-red-100"
            >
              <Trash2 size={14} />
              <span className="hidden sm:inline">Sil</span>
            </button>
        </div>
      </div>
    </div>
  );
};