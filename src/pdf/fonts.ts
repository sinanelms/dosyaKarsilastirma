import notoSansRegular from '../assets/fonts/NotoSans-Regular.ttf?url';
import notoSansBold from '../assets/fonts/NotoSans-Bold.ttf?url';
import notoSerifRegular from '../assets/fonts/NotoSerif-Regular.ttf?url';
import notoSerifBold from '../assets/fonts/NotoSerif-Bold.ttf?url';
import robotoRegular from '../assets/fonts/Roboto-Regular.ttf?url';
import robotoBold from '../assets/fonts/Roboto-Bold.ttf?url';
import type { PdfFontFamily } from '../core/pdfLayout';
import type { PdfFontData } from './renderPdf';

/*
 * PDF fontları JS paketine gömülmez; ayrı dosya olarak paketlenir ve yalnız seçilen font
 * ilk kullanımda okunur (uygulama çevrimdışı çalışır, açılış paketi küçük kalır).
 */
const FONT_URLS: Record<PdfFontFamily, { regular: string; bold: string }> = {
  NotoSans: { regular: notoSansRegular, bold: notoSansBold },
  NotoSerif: { regular: notoSerifRegular, bold: notoSerifBold },
  Roboto: { regular: robotoRegular, bold: robotoBold },
};

const cache = new Map<PdfFontFamily, Promise<PdfFontData>>();

const toBase64 = (buffer: ArrayBuffer): string => {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
};

const fetchBase64 = async (url: string): Promise<string> => {
  const response = await fetch(new URL(url, self.location.href));
  if (!response.ok) throw new Error(`Font okunamadı: ${url} (${response.status})`);
  return toBase64(await response.arrayBuffer());
};

export const loadPdfFont = (family: PdfFontFamily): Promise<PdfFontData> => {
  let pending = cache.get(family);
  if (!pending) {
    const urls = FONT_URLS[family];
    pending = Promise.all([fetchBase64(urls.regular), fetchBase64(urls.bold)]).then(([regular, bold]) => ({ regular, bold }));
    pending.catch(() => cache.delete(family));
    cache.set(family, pending);
  }
  return pending;
};
