import React, { useEffect, useRef } from 'react';
import { LogEntry } from '../types';
import { Terminal } from 'lucide-react';

interface LoggerProps {
    logs: LogEntry[];
}

export const Logger: React.FC<LoggerProps> = ({ logs }) => {
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        // Scroll only within the container, not the whole page
        if (containerRef.current) {
            containerRef.current.scrollTop = containerRef.current.scrollHeight;
        }
    }, [logs]);

    const getLogColor = (type: string) => {
        switch (type) {
            case 'ERROR': return 'var(--color-error)';
            case 'WARN': return 'var(--color-warning)';
            case 'SUCCESS': return 'var(--color-success)';
            default: return 'var(--text-secondary)';
        }
    };

    return (
        <div style={{
            border: '1px solid var(--border-primary)',
            borderRadius: 'var(--radius-lg)',
            backgroundColor: 'var(--bg-tertiary)',
            color: 'var(--text-secondary)',
            fontFamily: 'var(--font-mono)',
            fontSize: '0.75rem',
            height: '10rem',
            display: 'flex',
            flexDirection: 'column',
            boxShadow: 'var(--shadow-sm)',
        }}>
            <div style={{
                backgroundColor: 'var(--bg-secondary)',
                padding: '0.25rem 0.75rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                borderBottom: '1px solid var(--border-primary)',
            }}>
                <Terminal size={12} />
                <span style={{ fontWeight: 600, color: 'var(--text-tertiary)' }}>Sistem Kayıtları</span>
            </div>
            <div
                ref={containerRef}
                className="custom-scrollbar"
                style={{
                    flex: 1,
                    overflowY: 'auto',
                    padding: '0.75rem',
                }}
            >
                {logs.length === 0 && <span style={{ opacity: 0.5, fontStyle: 'italic' }}>... Sistem hazır.</span>}
                {logs.map((log) => (
                    <div key={log.id} style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.25rem' }}>
                        <span style={{ color: 'var(--text-tertiary)' }}>[{log.timestamp}]</span>
                        <span style={{ color: getLogColor(log.type) }}>
                            {log.message}
                        </span>
                    </div>
                ))}
            </div>
        </div>
    );
};

