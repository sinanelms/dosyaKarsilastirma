import { closePdf, openPdf } from './pdfjs';

const PRINT_ROOT_ID = 'pdf-print-root';
/** 2 → yaklaşık 144 DPI; tablo metni için yeterince net, 100+ sayfada bellek dostu. */
const PRINT_SCALE = 2;

const canvasToBlobUrl = (canvas: HTMLCanvasElement) =>
  new Promise<string>((resolve, reject) =>
    canvas.toBlob((blob) => (blob ? resolve(URL.createObjectURL(blob)) : reject(new Error('Sayfa görüntüsü oluşturulamadı'))), 'image/png')
  );

/**
 * PDF'in her sayfasını görüntüye çizip sayfa boyutu PDF ile birebir aynı olan bir yazdırma
 * düzeni kurar ve sistemin yazdırma penceresini açar. Yazdırılan içerik önizlenen PDF'in kendisidir.
 */
export const printPdf = async (bytes: ArrayBuffer, onProgress?: (done: number, total: number) => void): Promise<void> => {
  const doc = await openPdf(bytes);
  const urls: string[] = [];
  const root = document.createElement('div');
  root.id = PRINT_ROOT_ID;
  const style = document.createElement('style');

  try {
    const first = (await doc.getPage(1)).getViewport({ scale: 1 });
    for (let pageNumber = 1; pageNumber <= doc.numPages; pageNumber++) {
      const page = await doc.getPage(pageNumber);
      const viewport = page.getViewport({ scale: PRINT_SCALE });
      const canvas = document.createElement('canvas');
      canvas.width = Math.floor(viewport.width);
      canvas.height = Math.floor(viewport.height);
      await page.render({ canvas, viewport, intent: 'print' }).promise;
      urls.push(await canvasToBlobUrl(canvas));
      page.cleanup();
      onProgress?.(pageNumber, doc.numPages);
    }

    // PDF birimi punto (pt) olduğu için sayfa boyutu doğrudan pt ile verilir.
    style.textContent = `
      #${PRINT_ROOT_ID} { display: none; }
      @page { size: ${first.width}pt ${first.height}pt; margin: 0; }
      @media print {
        html, body { margin: 0 !important; padding: 0 !important; background: #fff !important; }
        body > *:not(#${PRINT_ROOT_ID}) { display: none !important; }
        #${PRINT_ROOT_ID} { display: block; }
        #${PRINT_ROOT_ID} img { display: block; width: ${first.width}pt; height: ${first.height}pt; break-after: page; }
        #${PRINT_ROOT_ID} img:last-child { break-after: auto; }
      }`;
    for (const url of urls) {
      const img = document.createElement('img');
      img.src = url;
      img.alt = '';
      root.appendChild(img);
    }
    document.head.appendChild(style);
    document.body.appendChild(root);
    await Promise.all(Array.from(root.querySelectorAll('img'), (img) => img.decode().catch(() => undefined)));

    window.print();
    // Chromium/WebView2'de print() pencere kapanana kadar bekler; yine de temizliği bir sonraki
    // döngüye bırakmak, bazı sürümlerde boş sayfa yazdırılmasını önler.
    await new Promise((resolve) => setTimeout(resolve, 500));
  } finally {
    root.remove();
    style.remove();
    urls.forEach((url) => URL.revokeObjectURL(url));
    await closePdf(doc);
  }
};
