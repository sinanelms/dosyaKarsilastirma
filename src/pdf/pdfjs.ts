import { getDocument, GlobalWorkerOptions, type PDFDocumentProxy } from 'pdfjs-dist';
import workerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';

/*
 * PDF önizlemesi ve yazdırma, WebView2'nin yerleşik PDF eklentisi yerine pdf.js ile uygulamanın
 * içinde çizilir. Eklenti kurumsal bilgisayarlarda grup ilkesiyle kapatılabildiği ve iframe içindeki
 * davranışı WebView2 sürümüne göre değiştiği için bu yol daha güvenilirdir. Çizilen içerik yine
 * kaydedilecek PDF baytlarının kendisidir (önizleme = çıktı).
 */
GlobalWorkerOptions.workerSrc = workerUrl;

/** PDF baytlarını açar. pdf.js verilen tamponu Worker'a aktarıp boşalttığı için kopyası kullanılır. */
export const openPdf = (bytes: ArrayBuffer): Promise<PDFDocumentProxy> =>
  getDocument({ data: new Uint8Array(bytes.slice(0)) }).promise;

/** Belgeyi ve arka plandaki pdf.js Worker bağlantısını serbest bırakır. */
export const closePdf = (doc: PDFDocumentProxy | null | undefined): Promise<void> =>
  doc ? doc.loadingTask.destroy() : Promise.resolve();

export type { PDFDocumentProxy };
