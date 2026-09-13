/// <reference lib="webworker" />
import type { MatchRecord, Party } from '../types';
import type { PdfOptions } from '../core/pdfLayout';
import { loadPdfFont } from './fonts';
import { renderPdf } from './renderPdf';

export interface PdfWorkerRequest {
  id: number;
  matches: MatchRecord[];
  parties: Pick<Party, 'id' | 'name'>[];
  options: PdfOptions;
  generatedAt: number;
}

export type PdfWorkerResponse =
  | { id: number; ok: true; pdf: ArrayBuffer; pageCount: number; durationMs: number }
  | { id: number; ok: false; error: string };

self.onmessage = async (event: MessageEvent<PdfWorkerRequest>) => {
  const { id, matches, parties, options, generatedAt } = event.data;
  const started = performance.now();
  try {
    const font = await loadPdfFont(options.fontFamily);
    const { pdf, pageCount } = renderPdf({ matches, parties, options, font, generatedAt: new Date(generatedAt) });
    const response: PdfWorkerResponse = { id, ok: true, pdf, pageCount, durationMs: Math.round(performance.now() - started) };
    self.postMessage(response, [pdf]);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    self.postMessage({ id, ok: false, error: message } satisfies PdfWorkerResponse);
  }
};
