import React from 'react';

interface SkeletonProps {
    width?: string | number;
    height?: string | number;
    borderRadius?: string;
    className?: string;
    style?: React.CSSProperties;
}

/**
 * Skeleton loader bileşeni - içerik yüklenirken placeholder olarak kullanılır
 * Erişilebilirlik için role="status" ve aria-label kullanır
 */
export function Skeleton({
    width = '100%',
    height = '1rem',
    borderRadius = 'var(--radius-md)',
    className = '',
    style = {},
}: SkeletonProps) {
    return (
        <div
            role="status"
            aria-label="Yükleniyor"
            className={`skeleton-loader ${className}`}
            style={{
                width,
                height,
                borderRadius,
                backgroundColor: 'var(--bg-tertiary)',
                animation: 'skeleton-pulse 1.5s ease-in-out infinite',
                ...style,
            }}
        />
    );
}

interface SkeletonTextProps {
    lines?: number;
    widths?: (string | number)[];
    gap?: string;
}

/**
 * Çoklu satır skeleton - metin yüklenirken kullanılır
 */
export function SkeletonText({ lines = 3, widths, gap = '0.5rem' }: SkeletonTextProps) {
    const defaultWidths = ['100%', '80%', '60%'];

    return (
        <div
            role="status"
            aria-label="Metin yükleniyor"
            style={{ display: 'flex', flexDirection: 'column', gap }}
        >
            {Array.from({ length: lines }).map((_, index) => (
                <Skeleton
                    key={index}
                    width={widths?.[index] ?? defaultWidths[index % defaultWidths.length]}
                    height="0.875rem"
                />
            ))}
        </div>
    );
}

interface SkeletonTableRowProps {
    columns?: number;
}

/**
 * Tablo satırı skeleton - tablo verileri yüklenirken kullanılır
 */
export function SkeletonTableRow({ columns = 5 }: SkeletonTableRowProps) {
    return (
        <tr role="status" aria-label="Satır yükleniyor">
            {Array.from({ length: columns }).map((_, index) => (
                <td
                    key={index}
                    style={{
                        padding: '0.75rem 1rem',
                        borderBottom: '1px solid var(--border-primary)',
                    }}
                >
                    <Skeleton height="1rem" width={index === 0 ? '60%' : '80%'} />
                </td>
            ))}
        </tr>
    );
}

interface SkeletonCardProps {
    showAvatar?: boolean;
}

/**
 * Kart skeleton - kart içerikleri yüklenirken kullanılır
 */
export function SkeletonCard({ showAvatar = true }: SkeletonCardProps) {
    return (
        <div
            role="status"
            aria-label="Kart yükleniyor"
            style={{
                padding: '1rem',
                backgroundColor: 'var(--bg-card)',
                borderRadius: 'var(--radius-lg)',
                border: '1px solid var(--border-primary)',
            }}
        >
            <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-start' }}>
                {showAvatar && <Skeleton width="40px" height="40px" borderRadius="50%" />}
                <div style={{ flex: 1 }}>
                    <SkeletonText lines={2} widths={['60%', '40%']} />
                </div>
            </div>
        </div>
    );
}
