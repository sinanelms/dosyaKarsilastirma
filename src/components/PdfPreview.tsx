import React, { useEffect, useRef, useState } from 'react';
import { Maximize, ZoomIn, ZoomOut } from 'lucide-react';
import { closePdf, openPdf, type PDFDocumentProxy } from '../pdf/pdfjs';

interface PdfPreviewProps {
    bytes: ArrayBuffer | null;
}

const PAGE_GAP = 24;
const ZOOM_STEPS = [0.5, 0.75, 1, 1.25, 1.5, 2];

const toolbarStyle: React.CSSProperties = {
    position: 'absolute',
    top: '1rem',
    left: '50%',
    transform: 'translateX(-50%)',
    zIndex: 20,
    backgroundColor: 'var(--bg-card)',
    border: '1px solid var(--border-primary)',
    boxShadow: 'var(--shadow-lg)',
    borderRadius: 'var(--radius-full)',
    display: 'flex',
    alignItems: 'center',
    gap: '0.25rem',
    padding: '0.25rem',
};

const zoomButtonStyle: React.CSSProperties = {
    padding: '0.5rem',
    borderRadius: 'var(--radius-full)',
    backgroundColor: 'transparent',
    color: 'var(--text-secondary)',
    cursor: 'pointer',
    border: 'none',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
};

/** Tek sayfa: görünür alana yaklaşınca çizilir, uzaklaşınca bellek için temizlenir. */
const PdfPage: React.FC<{ doc: PDFDocumentProxy; pageNumber: number; width: number; height: number; root: HTMLElement | null }> = ({
    doc,
    pageNumber,
    width,
    height,
    root,
}) => {
    const holderRef = useRef<HTMLDivElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [isNear, setIsNear] = useState(false);

    useEffect(() => {
        const holder = holderRef.current;
        if (!holder) return;
        const observer = new IntersectionObserver(([entry]) => setIsNear(entry.isIntersecting), { root, rootMargin: '1200px 0px' });
        observer.observe(holder);
        return () => observer.disconnect();
    }, [root]);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!isNear || !canvas) return;
        let cancelled = false;
        let task: ReturnType<Awaited<ReturnType<PDFDocumentProxy['getPage']>>['render']> | null = null;

        doc.getPage(pageNumber).then((page) => {
            if (cancelled) return;
            const ratio = window.devicePixelRatio || 1;
            const base = page.getViewport({ scale: 1 });
            const viewport = page.getViewport({ scale: (width / base.width) * ratio });
            const offscreen = document.createElement('canvas');
            offscreen.width = Math.floor(viewport.width);
            offscreen.height = Math.floor(viewport.height);
            task = page.render({ canvas: offscreen, viewport });
            task.promise
                .then(() => {
                    if (cancelled) return;
                    // Çizim bitince tek seferde kopyalanır; yakınlaştırma sırasında boş sayfa yanıp sönmez.
                    canvas.width = offscreen.width;
                    canvas.height = offscreen.height;
                    canvas.getContext('2d')?.drawImage(offscreen, 0, 0);
                })
                .catch(() => undefined);
        });

        return () => {
            cancelled = true;
            task?.cancel();
        };
    }, [doc, pageNumber, width, isNear]);

    return (
        <div
            ref={holderRef}
            data-page={pageNumber}
            style={{ width, height, backgroundColor: 'white', boxShadow: '0 10px 30px -10px rgba(0, 0, 0, 0.35)', flexShrink: 0 }}
        >
            {isNear && <canvas ref={canvasRef} style={{ width: '100%', height: '100%', display: 'block' }} />}
        </div>
    );
};

/**
 * Üretilen PDF'i pdf.js ile sayfa sayfa gösterir. Yalnız görünür alana yakın sayfalar çizilir;
 * 100+ sayfalık raporlarda da bellek ve işlemci kullanımı düşük kalır.
 */
export const PdfPreview: React.FC<PdfPreviewProps> = ({ bytes }) => {
    const scrollRef = useRef<HTMLDivElement>(null);
    const [doc, setDoc] = useState<PDFDocumentProxy | null>(null);
    const [pageSize, setPageSize] = useState<{ width: number; height: number } | null>(null);
    const [containerWidth, setContainerWidth] = useState(0);
    const [zoom, setZoom] = useState(1);
    const [currentPage, setCurrentPage] = useState(1);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!bytes) return;
        let cancelled = false;
        let opened: PDFDocumentProxy | null = null;
        openPdf(bytes)
            .then(async (next) => {
                opened = next;
                if (cancelled) return void closePdf(next);
                const viewport = (await next.getPage(1)).getViewport({ scale: 1 });
                if (cancelled) return void closePdf(next);
                // Yeni belge hazır olana kadar eskisi ekranda kalır (titreme olmaz).
                setDoc(next);
                setPageSize({ width: viewport.width, height: viewport.height });
                setError(null);
            })
            .catch((err: unknown) => !cancelled && setError(err instanceof Error ? err.message : String(err)));
        return () => {
            cancelled = true;
            // Bir sonraki belge ekrana gelince önceki belge yok edilir.
            setTimeout(() => closePdf(opened), 2000);
        };
    }, [bytes]);

    useEffect(() => {
        const element = scrollRef.current;
        if (!element) return;
        const observer = new ResizeObserver(([entry]) => setContainerWidth(entry.contentRect.width));
        observer.observe(element);
        return () => observer.disconnect();
    }, []);

    const fitWidth = Math.max(200, containerWidth - 80);
    const pageWidth = pageSize ? Math.round(fitWidth * zoom) : 0;
    const pageHeight = pageSize ? Math.round((pageWidth * pageSize.height) / pageSize.width) : 0;
    const pageCount = doc?.numPages ?? 0;

    const handleScroll = () => {
        const element = scrollRef.current;
        if (!element || !pageHeight) return;
        const page = Math.floor((element.scrollTop + element.clientHeight / 3) / (pageHeight + PAGE_GAP)) + 1;
        setCurrentPage(Math.min(Math.max(1, page), pageCount));
    };

    const stepZoom = (direction: 1 | -1) => {
        const index = ZOOM_STEPS.findIndex((step) => step >= zoom - 0.001);
        const next = ZOOM_STEPS[Math.min(ZOOM_STEPS.length - 1, Math.max(0, (index === -1 ? ZOOM_STEPS.length - 1 : index) + direction))];
        setZoom(next);
    };

    return (
        <div style={{ position: 'relative', flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
            {doc && (
                <div style={toolbarStyle}>
                    <button onClick={() => stepZoom(-1)} style={zoomButtonStyle} title="Uzaklaştır" aria-label="Uzaklaştır">
                        <ZoomOut size={16} />
                    </button>
                    <div style={{ padding: '0 0.5rem', fontSize: '0.75rem', fontFamily: 'var(--font-mono)', minWidth: '4rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
                        {Math.round(zoom * 100)}%
                    </div>
                    <button onClick={() => stepZoom(1)} style={zoomButtonStyle} title="Yakınlaştır" aria-label="Yakınlaştır">
                        <ZoomIn size={16} />
                    </button>
                    <div style={{ width: '1px', height: '1rem', backgroundColor: 'var(--border-primary)', margin: '0 0.25rem' }}></div>
                    <button onClick={() => setZoom(1)} style={zoomButtonStyle} title="Genişliğe sığdır" aria-label="Genişliğe sığdır">
                        <Maximize size={16} />
                    </button>
                    <div style={{ padding: '0 0.75rem', fontSize: '0.75rem', fontFamily: 'var(--font-mono)', color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>
                        Sayfa {currentPage} / {pageCount}
                    </div>
                </div>
            )}

            <div
                ref={scrollRef}
                onScroll={handleScroll}
                className="custom-scrollbar"
                data-testid="pdf-preview"
                style={{ flex: 1, overflow: 'auto', padding: '4.5rem 40px 2.5rem', display: 'flex', flexDirection: 'column', alignItems: zoom > 1 ? 'flex-start' : 'center', gap: PAGE_GAP }}
            >
                {doc &&
                    pageSize &&
                    Array.from({ length: pageCount }, (_, i) => (
                        <PdfPage key={i} doc={doc} pageNumber={i + 1} width={pageWidth} height={pageHeight} root={scrollRef.current} />
                    ))}
                {error && <div style={{ color: 'var(--color-error)', fontSize: '0.875rem' }}>Önizleme gösterilemedi: {error}</div>}
            </div>
        </div>
    );
};
