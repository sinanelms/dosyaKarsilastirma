import React, { useEffect, useRef } from 'react';
import { LogEntry } from '../types';
import { Terminal } from 'lucide-react';

interface LoggerProps {
  logs: LogEntry[];
}

export const Logger: React.FC<LoggerProps> = ({ logs }) => {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  return (
    <div className="border border-slate-200 rounded-lg bg-slate-900 text-slate-300 font-mono text-xs h-40 flex flex-col shadow-inner">
      <div className="bg-slate-800 px-3 py-1 flex items-center gap-2 border-b border-slate-700">
        <Terminal size={12} />
        <span className="font-semibold text-slate-400">Sistem Kayıtları</span>
      </div>
      <div className="flex-1 overflow-y-auto p-3 space-y-1 custom-scrollbar">
        {logs.length === 0 && <span className="opacity-50 italic">... Sistem hazır.</span>}
        {logs.map((log) => (
          <div key={log.id} className="flex gap-2">
            <span className="text-slate-500">[{log.timestamp}]</span>
            <span className={
              log.type === 'ERROR' ? 'text-red-400' :
              log.type === 'WARN' ? 'text-amber-400' :
              log.type === 'SUCCESS' ? 'text-green-400' :
              'text-slate-300'
            }>
              {log.message}
            </span>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>
    </div>
  );
};