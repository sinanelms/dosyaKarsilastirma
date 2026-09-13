import type { CaseRecord } from '../types';
import type { XlsxWorkerRequest, XlsxWorkerResponse } from './xlsx.worker';

let worker: Worker | null = null;
let nextId = 0;
const pending = new Map<number, { resolve: (r: CaseRecord[]) => void; reject: (e: Error) => void }>();

const getWorker = (): Worker => {
  if (worker) return worker;
  worker = new Worker(new URL('./xlsx.worker.ts', import.meta.url), { type: 'module' });
  worker.onmessage = (event: MessageEvent<XlsxWorkerResponse>) => {
    const data = event.data;
    const entry = pending.get(data.id);
    if (!entry) return;
    pending.delete(data.id);
    if (data.ok) entry.resolve(data.records);
    else entry.reject(new Error(data.error));
  };
  return worker;
};

/** Excel dosyasını arka planda (Web Worker) okuyup kayıtlara çevirir. */
export const readXlsxFile = async (file: File): Promise<CaseRecord[]> => {
  const buffer = await file.arrayBuffer();
  const id = nextId++;
  return new Promise((resolve, reject) => {
    pending.set(id, { resolve, reject });
    getWorker().postMessage({ id, buffer } satisfies XlsxWorkerRequest, [buffer]);
  });
};
