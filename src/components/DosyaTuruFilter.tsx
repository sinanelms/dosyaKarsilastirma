import React, { useEffect, useRef, useState } from 'react';
import { Check, ChevronDown, Filter } from 'lucide-react';

interface DosyaTuruFilterProps {
    /** Sonuçlarda geçen dosya türleri ve kayıt sayıları. */
    options: { type: string; count: number }[];
    selected: string[];
    onChange: (selected: string[]) => void;
}

const menuItemStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    width: '100%',
    padding: '0.5rem 0.75rem',
    fontSize: '0.8125rem',
    color: 'var(--text-primary)',
    backgroundColor: 'transparent',
    border: 'none',
    cursor: 'pointer',
    textAlign: 'left',
};

const CheckBox = ({ checked }: { checked: boolean }) => (
    <span
        style={{
            width: '16px',
            height: '16px',
            flexShrink: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: 'var(--radius-sm)',
            border: `1px solid ${checked ? 'var(--color-primary)' : 'var(--border-secondary)'}`,
            backgroundColor: checked ? 'var(--color-primary)' : 'var(--bg-card)',
            color: 'white',
        }}
    >
        {checked && <Check size={12} strokeWidth={3} />}
    </span>
);

/** Analiz sonuçlarında gösterilecek dosya türlerini seçtiren açılır liste. */
export const DosyaTuruFilter: React.FC<DosyaTuruFilterProps> = ({ options, selected, onChange }) => {
    const [isOpen, setIsOpen] = useState(false);
    const rootRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!isOpen) return;
        const handlePointer = (e: MouseEvent) => {
            if (!rootRef.current?.contains(e.target as Node)) setIsOpen(false);
        };
        const handleKey = (e: KeyboardEvent) => {
            if (e.key === 'Escape') setIsOpen(false);
        };
        document.addEventListener('mousedown', handlePointer);
        document.addEventListener('keydown', handleKey);
        return () => {
            document.removeEventListener('mousedown', handlePointer);
            document.removeEventListener('keydown', handleKey);
        };
    }, [isOpen]);

    const visible = options.filter((o) => selected.includes(o.type));
    const allSelected = options.length > 0 && visible.length === options.length;
    const label = allSelected ? 'Tümü' : visible.length === 0 ? 'Seçilmedi' : visible.length === 1 ? visible[0].type || 'Belirtilmemiş' : `${visible.length} tür`;

    const toggle = (type: string) => onChange(selected.includes(type) ? selected.filter((t) => t !== type) : [...selected, type]);

    return (
        <div ref={rootRef} style={{ position: 'relative' }}>
            <button
                onClick={() => setIsOpen((v) => !v)}
                aria-haspopup="true"
                aria-expanded={isOpen}
                title="Tabloda gösterilecek dosya türlerini seçin"
                style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    padding: '0.375rem 0.75rem',
                    fontSize: '0.875rem',
                    fontWeight: 500,
                    color: 'var(--text-secondary)',
                    backgroundColor: 'var(--bg-card)',
                    border: `1px solid ${isOpen ? 'var(--color-primary)' : 'var(--border-primary)'}`,
                    borderRadius: 'var(--radius-md)',
                    cursor: 'pointer',
                }}
            >
                <Filter size={16} style={{ color: 'var(--color-primary)' }} />
                Dosya Türü:
                <span style={{ fontWeight: 600, color: 'var(--text-primary)', maxWidth: '180px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {label}
                </span>
                <ChevronDown size={14} style={{ transform: isOpen ? 'rotate(180deg)' : undefined, transition: 'transform var(--transition-fast)' }} />
            </button>

            {isOpen && (
                <div
                    role="menu"
                    className="animate-slide-down"
                    style={{
                        position: 'absolute',
                        top: 'calc(100% + 0.375rem)',
                        left: 0,
                        zIndex: 30,
                        minWidth: '280px',
                        backgroundColor: 'var(--bg-card)',
                        border: '1px solid var(--border-primary)',
                        borderRadius: 'var(--radius-lg)',
                        boxShadow: 'var(--shadow-lg)',
                        padding: '0.25rem 0',
                    }}
                >
                    <button
                        role="menuitemcheckbox"
                        aria-checked={allSelected}
                        onClick={() => onChange(allSelected ? [] : options.map((o) => o.type))}
                        style={{ ...menuItemStyle, fontWeight: 600, borderBottom: '1px solid var(--border-primary)' }}
                    >
                        <CheckBox checked={allSelected} />
                        Tümünü Seç
                    </button>
                    {options.map((option) => {
                        const checked = selected.includes(option.type);
                        return (
                            <button
                                key={option.type}
                                role="menuitemcheckbox"
                                aria-checked={checked}
                                onClick={() => toggle(option.type)}
                                style={menuItemStyle}
                            >
                                <CheckBox checked={checked} />
                                <span style={{ flex: 1 }}>{option.type || 'Belirtilmemiş'}</span>
                                <span style={{ fontSize: '0.75rem', fontFamily: 'var(--font-mono)', color: 'var(--text-tertiary)' }}>{option.count}</span>
                            </button>
                        );
                    })}
                </div>
            )}
        </div>
    );
};
