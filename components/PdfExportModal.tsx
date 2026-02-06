import React, { useState, useRef, useMemo, useEffect } from 'react';
import { X, Printer, Settings2, Columns, Type, CheckSquare, Square, Download, RectangleHorizontal, RectangleVertical, Move, PanelTop, PanelBottom, PanelLeft, PanelRight, ZoomIn, ZoomOut, Maximize, Rows, Loader2 } from 'lucide-react';
import { CaseRecord } from '../types';
import { FIXED_HEADERS } from '../constants';

interface PdfExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  data: CaseRecord[];
  party1Name: string;
  party2Name: string;
}

// Varsayılan olarak seçili gelecek sütunlar
const DEFAULT_SELECTED_COLUMNS = [
  "Birim Adı", "Dosya No", "Dosya Durumu", "Suçu", "Karar Türü", "Açıklama"
];

export const PdfExportModal: React.FC<PdfExportModalProps> = ({ isOpen, onClose, data, party1Name, party2Name }) => {
  const [title, setTitle] = useState("Dosya Karşılaştırma ve Analiz Raporu");
  const [fontSize, setFontSize] = useState(9);
  const [orientation, setOrientation] = useState<'landscape' | 'portrait'>('landscape');
  const [selectedColumns, setSelectedColumns] = useState<string[]>(DEFAULT_SELECTED_COLUMNS);
  
  // Kenar Boşlukları (mm cinsinden)
  const [margins, setMargins] = useState({ top: 10, bottom: 10, left: 10, right: 10 });
  
  // Sayfalama Ayarı
  const [rowsPerPage, setRowsPerPage] = useState(15);
  
  // Önizleme Zoom Seviyesi
  const [zoom, setZoom] = useState(0.6);

  // Yazdırma işlemi durumu
  const [isPrinting, setIsPrinting] = useState(false);

  const reportRef = useRef<HTMLDivElement>(null);

  // Oryantasyon değişince varsayılan satır sayısını güncelle
  useEffect(() => {
    if (orientation === 'landscape') setRowsPerPage(15);
    else setRowsPerPage(20);
  }, [orientation]);

  // Veriyi sayfalara böl
  const pages = useMemo(() => {
    const chunks = [];
    for (let i = 0; i < data.length; i += rowsPerPage) {
        chunks.push(data.slice(i, i + rowsPerPage));
    }
    return chunks;
  }, [data, rowsPerPage]);

  if (!isOpen) return null;

  const toggleColumn = (col: string) => {
    setSelectedColumns(prev => 
      prev.includes(col) ? prev.filter(c => c !== col) : [...prev, col]
    );
  };

  const handlePrintOrPdf = () => {
    // Popup engelleyicilere takılmamak için window.open kullanıcı etkileşimi anında çağrılmalı
    const printWindow = window.open('', '_blank');

    if (!printWindow) {
        alert("Tarayıcınız açılır pencereleri (pop-up) engelledi. Lütfen izin verin ve tekrar deneyin.");
        return;
    }

    if (!reportRef.current) {
        printWindow.close();
        return;
    }

    setIsPrinting(true);

    try {
        const content = reportRef.current.innerHTML;

        const htmlContent = `
            <!DOCTYPE html>
            <html lang="tr">
              <head>
                <meta charset="UTF-8">
                <title>${title}</title>
                <script src="https://cdn.tailwindcss.com"></script>
                <style>
                  @import url('https://fonts.googleapis.com/css2?family=Noto+Serif+TR:wght@400;600;700&family=Inter:wght@400;500;600&display=swap');
                  
                  :root {
                    --page-width: ${orientation === 'landscape' ? '297mm' : '210mm'};
                    --page-height: ${orientation === 'landscape' ? '210mm' : '297mm'};
                  }

                  body {
                    background-color: white;
                    margin: 0;
                    padding: 0;
                    font-family: 'Inter', sans-serif;
                    -webkit-print-color-adjust: exact; 
                    print-color-adjust: exact;
                  }
                  
                  /* Loading Overlay (Ekranda görünür, baskıda gizlenir) */
                  #loading-overlay {
                      position: fixed;
                      inset: 0;
                      background: white;
                      display: flex;
                      flex-direction: column;
                      align-items: center;
                      justify-content: center;
                      z-index: 50;
                  }

                  /* YAZDIRMA AYARLARI */
                  @media print {
                    #loading-overlay { display: none !important; }
                    
                    @page { 
                        size: ${orientation}; 
                        margin: ${margins.top}mm ${margins.right}mm ${margins.bottom}mm ${margins.left}mm !important; 
                    }
                    
                    body { margin: 0; }

                    .print-page-wrapper {
                        width: 100% !important;
                        height: auto !important;
                        break-after: page !important;
                        page-break-after: always !important;
                        box-shadow: none !important;
                        border: none !important;
                        margin: 0 !important;
                        padding: 0 !important;
                    }
                    
                    .print-page-wrapper:last-child {
                        break-after: auto !important;
                        page-break-after: auto !important;
                    }
                  }

                  /* Tablo Stilleri */
                  table { border-collapse: collapse; width: 100%; }
                  th, td { border: 0.5pt solid #000; }
                  .role-badge { display: block; margin-bottom: 2px; }
                  .status-open { font-weight: bold; }
                </style>
              </head>
              <body>
                <div id="loading-overlay">
                    <svg class="animate-spin h-10 w-10 text-slate-500 mb-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                        <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    <div class="text-slate-600 font-semibold">Rapor Hazırlanıyor...</div>
                    <div class="text-xs text-slate-400 mt-2">Pencere açılmazsa CTRL+P yapınız.</div>
                </div>
                ${content}
                <script>
                   window.onload = function() {
                      // Tailwind ve fontların yüklenmesi için kısa bir bekleme
                      setTimeout(function() {
                          window.focus();
                          window.print();
                      }, 1000);
                   };
                </script>
              </body>
            </html>
        `;

        printWindow.document.open();
        printWindow.document.write(htmlContent);
        printWindow.document.close();

        // Ana ekrandaki butonu kısa süre sonra tekrar aktif et
        setTimeout(() => setIsPrinting(false), 1500);

    } catch (err) {
        console.error(err);
        printWindow.close();
        setIsPrinting(false);
        alert("Rapor oluşturulurken bir hata meydana geldi.");
    }
  };

  // --- Render Helpers ---
  const pageWidth = orientation === 'landscape' ? '297mm' : '210mm';
  const pageHeight = orientation === 'landscape' ? '210mm' : '297mm';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-hidden">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-[98vw] h-[98vh] flex flex-col overflow-hidden animate-in fade-in zoom-in duration-200 border border-slate-200">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50">
          <div className="flex items-center gap-3">
            <div className="bg-red-600 text-white p-2 rounded-lg">
              <Printer size={20} />
            </div>
            <div>
               <h2 className="text-xl font-bold text-slate-800">Rapor Önizleme ve Yazdırma</h2>
               <p className="text-xs text-slate-500">Sayfa yapısını ayarlayın ve çıktı alın.</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-2 hover:bg-slate-200 rounded-full transition-colors text-slate-500 hover:text-red-600"
          >
            <X size={24} />
          </button>
        </div>

        <div className="flex flex-1 overflow-hidden">
          
          {/* Left Sidebar: Settings */}
          <div className="w-80 bg-white border-r border-slate-200 flex flex-col overflow-hidden shadow-[4px_0_24px_-12px_rgba(0,0,0,0.1)] z-10 shrink-0">
            <div className="p-5 space-y-6 overflow-y-auto custom-scrollbar flex-1">
              
              {/* Sayfa Ayarları */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-slate-800 font-semibold border-b border-slate-100 pb-2">
                    <Settings2 size={18} className="text-blue-600" />
                    <span>Genel Ayarlar</span>
                </div>
                
                {/* Sayfa Yönü */}
                <div>
                   <label className="text-xs font-bold text-slate-500 uppercase mb-2 block">Sayfa Yönü</label>
                   <div className="grid grid-cols-2 gap-2">
                      <button
                        onClick={() => setOrientation('landscape')}
                        className={`flex items-center justify-center gap-2 p-2 rounded-md border text-sm transition-all ${
                            orientation === 'landscape' 
                            ? 'bg-blue-50 border-blue-500 text-blue-700 shadow-sm' 
                            : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                        }`}
                      >
                         <RectangleHorizontal size={18} />
                         <span>Yatay</span>
                      </button>
                      <button
                        onClick={() => setOrientation('portrait')}
                        className={`flex items-center justify-center gap-2 p-2 rounded-md border text-sm transition-all ${
                            orientation === 'portrait' 
                            ? 'bg-blue-50 border-blue-500 text-blue-700 shadow-sm' 
                            : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                        }`}
                      >
                         <RectangleVertical size={18} />
                         <span>Dikey</span>
                      </button>
                   </div>
                </div>

                {/* Kenar Boşlukları */}
                <div>
                    <label className="text-xs font-bold text-slate-500 uppercase mb-2 flex items-center gap-2">
                        <Move size={12} />
                        Kenar Boşlukları (mm)
                    </label>
                    <div className="grid grid-cols-2 gap-3">
                        <div className="flex flex-col gap-1">
                             <div className="flex items-center gap-1 text-[10px] text-slate-400">
                                <PanelTop size={10} /> Üst
                             </div>
                             <input 
                                type="number" 
                                value={margins.top}
                                onChange={(e) => setMargins({...margins, top: Number(e.target.value)})}
                                className="w-full px-2 py-1.5 border border-slate-300 rounded text-sm text-center font-mono focus:border-blue-500 outline-none"
                             />
                        </div>
                        <div className="flex flex-col gap-1">
                             <div className="flex items-center gap-1 text-[10px] text-slate-400">
                                <PanelBottom size={10} /> Alt
                             </div>
                             <input 
                                type="number" 
                                value={margins.bottom}
                                onChange={(e) => setMargins({...margins, bottom: Number(e.target.value)})}
                                className="w-full px-2 py-1.5 border border-slate-300 rounded text-sm text-center font-mono focus:border-blue-500 outline-none"
                             />
                        </div>
                        <div className="flex flex-col gap-1">
                             <div className="flex items-center gap-1 text-[10px] text-slate-400">
                                <PanelLeft size={10} /> Sol
                             </div>
                             <input 
                                type="number" 
                                value={margins.left}
                                onChange={(e) => setMargins({...margins, left: Number(e.target.value)})}
                                className="w-full px-2 py-1.5 border border-slate-300 rounded text-sm text-center font-mono focus:border-blue-500 outline-none"
                             />
                        </div>
                        <div className="flex flex-col gap-1">
                             <div className="flex items-center gap-1 text-[10px] text-slate-400">
                                <PanelRight size={10} /> Sağ
                             </div>
                             <input 
                                type="number" 
                                value={margins.right}
                                onChange={(e) => setMargins({...margins, right: Number(e.target.value)})}
                                className="w-full px-2 py-1.5 border border-slate-300 rounded text-sm text-center font-mono focus:border-blue-500 outline-none"
                             />
                        </div>
                    </div>
                </div>

                <div>
                   <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Rapor Başlığı</label>
                   <input 
                     type="text" 
                     value={title} 
                     onChange={(e) => setTitle(e.target.value)}
                     className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-blue-500 outline-none text-sm font-medium"
                   />
                </div>
                
                <div className="grid grid-cols-2 gap-3">
                    <div>
                      <div className="flex justify-between mb-1">
                        <label className="text-xs font-bold text-slate-500 uppercase flex items-center gap-1">
                           <Type size={12} /> Yazı (pt)
                        </label>
                        <span className="text-xs bg-slate-100 px-2 rounded text-slate-600">{fontSize}</span>
                      </div>
                      <input 
                        type="range" 
                        min="6" 
                        max="14" 
                        step="0.5"
                        value={fontSize} 
                        onChange={(e) => setFontSize(parseFloat(e.target.value))}
                        className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                      />
                    </div>
                    <div>
                      <div className="flex justify-between mb-1">
                        <label className="text-xs font-bold text-slate-500 uppercase flex items-center gap-1">
                           <Rows size={12} /> Satır/Syf
                        </label>
                        <span className="text-xs bg-slate-100 px-2 rounded text-slate-600">{rowsPerPage}</span>
                      </div>
                      <input 
                        type="range" 
                        min="5" 
                        max="40" 
                        step="1"
                        value={rowsPerPage} 
                        onChange={(e) => setRowsPerPage(parseInt(e.target.value))}
                        className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                      />
                    </div>
                </div>
              </div>

              {/* Sütun Seçimi */}
              <div className="space-y-3 pt-4 border-t border-slate-100">
                 <div className="flex items-center justify-between text-slate-800 font-semibold border-b border-slate-100 pb-2">
                    <div className="flex items-center gap-2">
                        <Columns size={18} className="text-blue-600" />
                        <span>Sütun Yönetimi</span>
                    </div>
                    <span className="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full">{selectedColumns.length} Seçili</span>
                 </div>
                 <div className="space-y-1">
                    {FIXED_HEADERS.map((header) => {
                       const isSelected = selectedColumns.includes(header);
                       return (
                         <button
                           key={header}
                           onClick={() => toggleColumn(header)}
                           className={`flex items-center gap-3 w-full px-3 py-2 text-sm rounded-md transition-all ${
                             isSelected 
                             ? 'bg-blue-50 text-blue-800 font-medium' 
                             : 'text-slate-500 hover:bg-slate-50'
                           }`}
                         >
                           {isSelected 
                             ? <CheckSquare size={16} className="text-blue-600 min-w-[16px]" /> 
                             : <Square size={16} className="text-slate-300 min-w-[16px]" />
                           }
                           <span className="truncate">{header}</span>
                         </button>
                       );
                    })}
                 </div>
              </div>

            </div>

            {/* Print Button Area */}
            <div className="p-4 border-t border-slate-200 bg-slate-50 grid grid-cols-2 gap-3">
               <button 
                onClick={handlePrintOrPdf}
                disabled={isPrinting}
                className="flex flex-col items-center justify-center gap-2 bg-white border border-slate-300 text-slate-700 py-3 rounded-lg hover:bg-slate-50 transition-all font-semibold shadow-sm hover:shadow active:scale-95 group disabled:opacity-70 disabled:cursor-wait"
               >
                 {isPrinting ? <Loader2 size={20} className="animate-spin text-slate-500" /> : <Printer size={20} className="text-slate-500 group-hover:text-slate-800" />}
                 <span className="text-xs">{isPrinting ? 'Hazırlanıyor...' : 'Yazdır'}</span>
               </button>
               <button 
                onClick={handlePrintOrPdf}
                disabled={isPrinting}
                className="flex flex-col items-center justify-center gap-2 bg-slate-900 text-white py-3 rounded-lg hover:bg-slate-800 transition-all font-semibold shadow-lg hover:shadow-xl active:scale-95 disabled:opacity-70 disabled:cursor-wait"
               >
                 {isPrinting ? <Loader2 size={20} className="animate-spin text-blue-200" /> : <Download size={20} className="text-blue-200" />}
                 <span className="text-xs">{isPrinting ? 'İşleniyor...' : 'PDF Kaydet'}</span>
               </button>
            </div>
          </div>

          {/* Right Area: Preview */}
          <div className="flex-1 bg-slate-200/50 relative overflow-hidden flex flex-col">
            
            {/* Toolbar */}
            <div className="absolute top-4 left-1/2 -translate-x-1/2 z-20 bg-white/90 backdrop-blur border border-slate-300 shadow-lg rounded-full flex items-center gap-1 p-1">
                <button onClick={() => setZoom(Math.max(0.3, zoom - 0.1))} className="p-2 hover:bg-slate-100 rounded-full text-slate-600" title="Uzaklaştır">
                    <ZoomOut size={16} />
                </button>
                <div className="px-2 text-xs font-mono w-16 text-center">{Math.round(zoom * 100)}%</div>
                <button onClick={() => setZoom(Math.min(2.0, zoom + 0.1))} className="p-2 hover:bg-slate-100 rounded-full text-slate-600" title="Yakınlaştır">
                    <ZoomIn size={16} />
                </button>
                <div className="w-px h-4 bg-slate-300 mx-1"></div>
                <button onClick={() => setZoom(0.7)} className="p-2 hover:bg-slate-100 rounded-full text-slate-600" title="Sığdır">
                    <Maximize size={16} />
                </button>
            </div>

            {/* Scrollable Canvas Area */}
            <div className="flex-1 overflow-auto p-10 custom-scrollbar flex flex-col items-center gap-12">
                
                {/* Pages Container */}
                <div 
                    ref={reportRef}
                    style={{
                         transform: `scale(${zoom})`,
                         transformOrigin: 'top center',
                         display: 'flex',
                         flexDirection: 'column',
                         gap: '30px' // Ekranda sayfalar arası boşluk
                    }}
                >
                    {pages.map((pageData, pageIndex) => (
                        <div 
                            key={pageIndex}
                            className="print-page-wrapper bg-white shadow-xl text-black relative"
                            style={{ 
                                width: pageWidth, 
                                height: pageHeight,
                                padding: `${margins.top}mm ${margins.right}mm ${margins.bottom}mm ${margins.left}mm`,
                                boxSizing: 'border-box'
                            }}
                        >
                            {/* Inner Flex Container to manage spacing strictly */}
                            <div className="w-full h-full flex flex-col justify-between">
                                
                                {/* Top Section: Title & Table */}
                                <div className="flex flex-col w-full h-full overflow-hidden">
                                    
                                    {/* Report Header (Only on First Page) */}
                                    {pageIndex === 0 && (
                                        <div className="text-center mb-6 border-b-2 border-black pb-2 shrink-0">
                                            <h1 className="font-serif font-bold uppercase tracking-wide mb-1 text-black" style={{ fontSize: '16pt' }}>{title}</h1>
                                            <div className="text-sm text-slate-800 font-serif flex justify-center gap-6">
                                                <span><strong>Tarih:</strong> {new Date().toLocaleDateString('tr-TR')}</span>
                                                <span>|</span>
                                                <span><strong>Taraflar:</strong> {party1Name} & {party2Name}</span>
                                            </div>
                                        </div>
                                    )}

                                    {/* Table Wrapper - Takes remaining height but doesn't overflow */}
                                    <div className="flex-1 w-full overflow-hidden relative">
                                        {/* Ekran önizlemesinde tailwind classları etkili olur, ancak inline stylelar baskın çıkar. */}
                                        <table className="w-full border-collapse text-black" style={{ fontSize: `${fontSize}pt` }}>
                                            <thead>
                                                <tr className="bg-slate-100 text-black uppercase text-xs font-bold border-y border-black">
                                                <th className="w-10 text-center border border-black p-1 bg-slate-100">#</th>
                                                {/* Taraflar sütunu her zaman görünsün, diğerleri seçime bağlı */}
                                                <th className="w-32 border border-black p-1 bg-slate-100">Taraf</th>
                                                {selectedColumns.map(col => (
                                                    <th key={col} className="border border-black p-1 bg-slate-100">{col}</th>
                                                ))}
                                                </tr>
                                            </thead>
                                            <tbody className="text-black">
                                                {pageData.map((row, index) => (
                                                <tr key={row._id} className="even:bg-slate-50 border-b border-black/50">
                                                    <td className="text-center font-mono text-black border border-black p-1 align-top">
                                                        {(pageIndex * rowsPerPage) + index + 1}
                                                    </td>
                                                    
                                                    {/* Sabit Taraf Bilgisi Sütunu */}
                                                    <td className="text-black border border-black p-1 align-top">
                                                        <div className="flex flex-col">
                                                            <div className="role-badge">
                                                                <strong>{party1Name}:</strong> {row._party1Role || '-'}
                                                            </div>
                                                            <div className="role-badge">
                                                                <strong>{party2Name}:</strong> {row._party2Role || '-'}
                                                            </div>
                                                        </div>
                                                    </td>

                                                    {/* Dinamik Sütunlar */}
                                                    {selectedColumns.map(col => {
                                                        let content = (row as any)[col];
                                                        let styleClass = "";
                                                        
                                                        // Dosya Durumu için özel renklendirme
                                                        if (col === "Dosya Durumu") {
                                                            if (content.toLowerCase().includes('açık')) styleClass = "status-open";
                                                            else if (content.toLowerCase().includes('kapalı')) styleClass = "status-closed";
                                                        }

                                                        return (
                                                            <td key={col} className={`text-black border border-black p-1 align-top ${styleClass}`}>
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
                                
                                {/* Footer - Always at bottom of margins */}
                                <div className="page-footer-wrapper border-t border-black pt-2 flex justify-between font-mono text-slate-800 shrink-0" style={{ fontSize: '8pt' }}>
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