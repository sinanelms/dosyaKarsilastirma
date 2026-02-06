import React, { useState } from 'react';
import { CaseRecord } from '../types';
import { ChevronDown, ChevronUp, AlertCircle, Gavel, FileText, CheckCircle2, XCircle, Clock } from 'lucide-react';

interface ResultsTableProps {
  data: CaseRecord[];
  party1Name: string;
  party2Name: string;
}

export const ResultsTable: React.FC<ResultsTableProps> = ({ data, party1Name, party2Name }) => {
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' } | null>(null);

  if (data.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-slate-400 bg-slate-50 border-2 border-dashed border-slate-200 rounded-lg">
        <FileText size={48} className="mb-2 opacity-50" />
        <p>Karşılaştırma sonucu burada görünecek.</p>
      </div>
    );
  }

  // --- Helper Functions for Styling ---

  const getStatusStyle = (status: string) => {
    const s = status.toLowerCase();
    if (s.includes('açık') || s.includes('derdest')) return 'bg-green-100 text-green-800 border-green-200';
    if (s.includes('kapalı') || s.includes('kesinleş')) return 'bg-red-50 text-red-800 border-red-100';
    return 'bg-slate-100 text-slate-700 border-slate-200';
  };

  const getRoleStyle = (role?: string) => {
    if (!role) return 'bg-slate-50 text-slate-400 border-slate-100';
    const r = role.toLowerCase();
    if (r.includes('şüpheli') || r.includes('sanık') || r.includes('ssç')) return 'bg-red-100 text-red-900 border-red-200 font-bold';
    if (r.includes('müşteki') || r.includes('mağdur') || r.includes('katılan')) return 'bg-blue-100 text-blue-900 border-blue-200 font-bold';
    if (r.includes('tanık')) return 'bg-amber-50 text-amber-800 border-amber-200';
    return 'bg-slate-50 text-slate-700 border-slate-200';
  };

  const getDecisionIcon = (decision: string) => {
    const d = decision.toLowerCase();
    if (d.includes('takipsizlik') || d.includes('beraat') || d.includes('düşme')) return <CheckCircle2 size={14} className="text-green-600" />;
    if (d.includes('ceza') || d.includes('hüküm') || d.includes('dava')) return <Gavel size={14} className="text-red-600" />;
    if (d.includes('yetkisizlik') || d.includes('görevsizlik')) return <XCircle size={14} className="text-orange-600" />;
    return <Clock size={14} className="text-slate-400" />;
  };

  // Helper to render merged content (e.g., "Data A / Data B") nicely
  const renderContent = (text: string, className: string = "") => {
     if (!text) return <span className="text-slate-300">-</span>;
     
     if (text.includes(" / ")) {
        const parts = text.split(" / ");
        return (
            <div className="flex flex-col gap-1">
                {parts.map((part, idx) => (
                    <div key={idx} className={`${className} ${idx > 0 ? 'border-t border-slate-100 pt-1 mt-0.5 text-slate-600' : ''}`}>
                        {part}
                    </div>
                ))}
            </div>
        );
     }
     return <div className={className}>{text}</div>;
  };

  return (
    <div className="w-full border border-slate-200 rounded-xl shadow-sm bg-white overflow-hidden flex flex-col">
      <div className="overflow-x-auto custom-scrollbar">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-800 text-slate-200 text-xs uppercase tracking-wider">
              <th className="p-3 w-10 text-center font-semibold border-r border-slate-700">#</th>
              <th className="p-3 w-1/4 font-semibold border-r border-slate-700">
                <div className="flex items-center gap-2">
                  <FileText size={14} /> DOSYA BİLGİSİ
                </div>
              </th>
              <th className="p-3 w-1/5 font-semibold border-r border-slate-700">
                <div className="flex items-center gap-2">
                  <AlertCircle size={14} /> TARAF & SIFAT
                </div>
              </th>
              <th className="p-3 w-1/4 font-semibold border-r border-slate-700">
                <div className="flex items-center gap-2">
                  <Gavel size={14} /> SUÇ & TARİH
                </div>
              </th>
              <th className="p-3 font-semibold">
                <div className="flex items-center gap-2">
                  <CheckCircle2 size={14} /> DURUM & KARAR
                </div>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {data.map((row, idx) => (
              <tr 
                key={row._id} 
                className="hover:bg-blue-50/50 transition-colors group text-sm"
              >
                {/* Index Column */}
                <td className="p-4 text-center text-slate-400 font-mono text-xs border-r border-slate-100 bg-slate-50/30">
                  {idx + 1}
                </td>

                {/* File Info Column */}
                <td className="p-3 align-top border-r border-slate-100">
                  <div className="flex flex-col gap-1">
                    <div className="flex items-baseline gap-2">
                      <span className="text-lg font-bold text-slate-800 tracking-tight font-mono">
                        {row["Dosya No"]}
                      </span>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded border uppercase tracking-wide ${getStatusStyle(row["Dosya Durumu"])}`}>
                        {renderContent(row["Dosya Durumu"] || "DURUM YOK")}
                      </span>
                    </div>
                    <div className="text-xs font-semibold text-slate-600 uppercase">
                      {row["Birim Adı"]}
                    </div>
                    <div className="text-[11px] text-slate-500 mt-1 flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-slate-300"></span>
                      {row["Dosya Türü"]}
                    </div>
                  </div>
                </td>

                {/* Party Info Column */}
                <td className="p-3 align-top border-r border-slate-100">
                  <div className="flex flex-col gap-2">
                    
                    {/* Party 1 Role */}
                    <div className="flex flex-col gap-0.5">
                       <span className="text-[10px] font-bold text-blue-900 uppercase tracking-tight">{party1Name}</span>
                       <span className={`inline-block px-2 py-0.5 rounded text-[11px] border ${getRoleStyle(row._party1Role)} w-fit`}>
                          {row._party1Role || "Belirtilmemiş"}
                       </span>
                    </div>

                    {/* Divider */}
                    <div className="border-t border-slate-100"></div>

                    {/* Party 2 Role */}
                    <div className="flex flex-col gap-0.5">
                       <span className="text-[10px] font-bold text-indigo-900 uppercase tracking-tight">{party2Name}</span>
                       <span className={`inline-block px-2 py-0.5 rounded text-[11px] border ${getRoleStyle(row._party2Role)} w-fit`}>
                          {row._party2Role || "Belirtilmemiş"}
                       </span>
                    </div>

                    {/* Vekiller / Proxies */}
                    {row["Vekilleri"] && (
                      <div className="text-xs text-slate-500 bg-slate-50 p-1.5 rounded border border-slate-100 mt-1">
                        <span className="font-semibold block text-[10px] text-slate-400 uppercase mb-0.5">Vekiller:</span>
                        {renderContent(row["Vekilleri"])}
                      </div>
                    )}
                  </div>
                </td>

                {/* Crime Info Column */}
                <td className="p-3 align-top border-r border-slate-100">
                  <div className="flex flex-col gap-1">
                    {/* Render Crime with Smart Split */}
                    {renderContent(row["Suçu"], "text-slate-800 font-medium leading-snug")}
                    
                    {row["Suç Tarihi"] && (
                      <div className="text-xs text-slate-500 flex items-center gap-1 mt-1">
                        <Clock size={12} />
                        Suç Tarihi: <div className="font-mono text-slate-700">{renderContent(row["Suç Tarihi"])}</div>
                      </div>
                    )}
                    {row["Dava Türleri"] && (
                      <div className="mt-1 text-[10px] text-slate-400 uppercase">
                         {renderContent(row["Dava Türleri"])}
                      </div>
                    )}
                  </div>
                </td>

                {/* Decision & Status Column */}
                <td className="p-3 align-top">
                  <div className="flex flex-col gap-2">
                    {row["Karar Türü"] ? (
                       <div className="flex items-start gap-2">
                          <div className="mt-0.5">{getDecisionIcon(row["Karar Türü"])}</div>
                          <div className="flex-1">
                            <div className="text-sm font-semibold text-slate-800">
                                {renderContent(row["Karar Türü"])}
                            </div>
                            {row["Kesinleşme Tarihi"] && (
                              <div className="text-xs text-green-700 mt-0.5 flex items-center gap-1">
                                <CheckCircle2 size={10} />
                                Kesinleşme: {renderContent(row["Kesinleşme Tarihi"])}
                              </div>
                            )}
                          </div>
                       </div>
                    ) : (
                      <div className="text-xs text-slate-400 italic">Karar bilgisi yok</div>
                    )}
                    
                    {row["Açıklama"] && (
                      <div className="text-[11px] text-slate-500 italic border-l-2 border-slate-200 pl-2 mt-1">
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
      <div className="bg-slate-50 p-2 text-xs text-slate-500 border-t border-slate-200 flex justify-between items-center">
         <span>Veriler UYAP formatına göre düzenlenmiştir.</span>
         <span className="font-mono">Toplam: {data.length} kayıt</span>
      </div>
    </div>
  );
};