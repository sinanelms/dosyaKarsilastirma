/// <reference lib="webworker" />
import { readXlsxRows } from '../core/xlsx';
import { rowsToRecords } from '../core/parse';
import type { CaseRecord } from '../types';

export interface XlsxWorkerRequest {
  id: number;
  buffer: ArrayBuffer;
}

export type XlsxWorkerResponse =
  | { id: number; ok: true; records: CaseRecord[] }
  | { id: number; ok: false; error: string };

self.onmessage = (event: MessageEvent<XlsxWorkerRequest>) => {
  const { id, buffer } = event.data;
  try {
    const records = rowsToRecords(readXlsxRows(buffer));
    self.postMessage({ id, ok: true, records } satisfies XlsxWorkerResponse);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    self.postMessage({ id, ok: false, error: message } satisfies XlsxWorkerResponse);
  }
};
