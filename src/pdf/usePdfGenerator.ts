import { useEffect, useRef, useState } from 'react';
import type { MatchRecord, Party } from '../types';
import type { PdfOptions } from '../core/pdfLayout';
import type { PdfWorkerRequest, PdfWorkerResponse } from './pdf.worker';

export interface PdfGeneratorState {
  status: 'idle' | 'generating' | 'ready' | 'error';
  /** Önizleme iframe'i için blob URL. */
  url: string | null;
  bytes: ArrayBuffer | null;
  pageCount: number;
  durationMs: number;
  error: string | null;
}

const INITIAL: PdfGeneratorState = { status: 'idle', url: null, bytes: null, pageCount: 0, durationMs: 0, error: null };

/**
 * Ayarlar değiştikçe PDF'i (debounce ile) Web Worker'da yeniden üretir.
 * Eski isteklerin sonuçları istek kimliğiyle ayıklanır; yalnız en son ayarların PDF'i gösterilir.
 */
export const usePdfGenerator = (
  enabled: boolean,
  matches: MatchRecord[],
  parties: Pick<Party, 'id' | 'name'>[],
  options: PdfOptions,
  retryToken: number,
  debounceMs = 400
): PdfGeneratorState => {
  const [state, setState] = useState<PdfGeneratorState>(INITIAL);
  const workerRef = useRef<Worker | null>(null);
  const latestId = useRef(0);
  const urlRef = useRef<string | null>(null);

  useEffect(() => {
    if (!enabled) return;
    const worker = new Worker(new URL('./pdf.worker.ts', import.meta.url), { type: 'module' });
    workerRef.current = worker;
    worker.onmessage = (event: MessageEvent<PdfWorkerResponse>) => {
      const data = event.data;
      if (data.id !== latestId.current) return;
      if (!data.ok) {
        setState((s) => ({ ...s, status: 'error', error: data.error }));
        return;
      }
      const url = URL.createObjectURL(new Blob([data.pdf], { type: 'application/pdf' }));
      if (urlRef.current) URL.revokeObjectURL(urlRef.current);
      urlRef.current = url;
      setState({ status: 'ready', url, bytes: data.pdf, pageCount: data.pageCount, durationMs: data.durationMs, error: null });
    };
    worker.onerror = (event) => {
      setState((s) => ({ ...s, status: 'error', error: event.message || 'PDF oluşturucu başlatılamadı.' }));
    };
    return () => {
      worker.terminate();
      workerRef.current = null;
      if (urlRef.current) URL.revokeObjectURL(urlRef.current);
      urlRef.current = null;
      setState(INITIAL);
    };
  }, [enabled]);

  useEffect(() => {
    if (!enabled) return;
    const id = ++latestId.current;
    setState((s) => ({ ...s, status: 'generating', error: null }));
    const timer = setTimeout(() => {
      const request: PdfWorkerRequest = { id, matches, parties, options, generatedAt: Date.now() };
      workerRef.current?.postMessage(request);
    }, debounceMs);
    return () => clearTimeout(timer);
  }, [enabled, matches, parties, options, retryToken, debounceMs]);

  return state;
};
