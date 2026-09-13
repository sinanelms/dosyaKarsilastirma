import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { renderPdf } from '../renderPdf';
import { compareParties } from '../../core/compare';
import { rowsToRecords } from '../../core/parse';
import { DEFAULT_PDF_OPTIONS } from '../../core/pdfLayout';

const fontsDir = resolve(__dirname, '../../assets/fonts');
const font = {
  regular: readFileSync(resolve(fontsDir, 'NotoSans-Regular.ttf')).toString('base64'),
  bold: readFileSync(resolve(fontsDir, 'NotoSans-Bold.ttf')).toString('base64'),
};

const header = ['Birim Adı', 'Dosya Durumu', 'Dosya Türü', 'Dosya No', 'Sıfatı', 'Suçu', 'Açıklama'];
const makeParties = (count: number) => {
  const rows = (role: string) => [
    header,
    ...Array.from({ length: count }, (_, i) => ['İzmir CBS', 'Açık', 'Soruşturma Dosyası', `2024/${i + 1}`, role, 'Kasten Yaralama', 'Şikâyetçi ğüşiöç']),
  ];
  return [
    { id: 'a', name: 'Ali Işık', records: rowsToRecords(rows('Şüpheli')) },
    { id: 'b', name: 'Ayşe Öz', records: rowsToRecords(rows('Müşteki')) },
  ];
};

const pageCountOf = (pdf: ArrayBuffer) => (new TextDecoder('latin1').decode(pdf).match(/\/Type \/Page\b/g) ?? []).length;

describe('renderPdf', () => {
  it('sayfa başına satır sınırına göre sayfa üretir ve dönen sayfa sayısı dosyadakiyle aynıdır', () => {
    const parties = makeParties(12);
    const result = renderPdf({
      matches: compareParties(parties, 2),
      parties,
      options: { ...DEFAULT_PDF_OPTIONS, rowsPerPage: 5 },
      font,
      generatedAt: new Date(2026, 8, 14),
    });
    expect(result.pageCount).toBe(3);
    expect(pageCountOf(result.pdf)).toBe(3);
    expect(new TextDecoder('latin1').decode(result.pdf.slice(0, 5))).toBe('%PDF-');
  });

  it('otomatik modda satırlar sığmazsa yeni sayfaya geçer; yön değişince sayfa sayısı değişir', () => {
    const parties = makeParties(120);
    const matches = compareParties(parties, 2);
    const base = { matches, parties, font, generatedAt: new Date() };
    const landscape = renderPdf({ ...base, options: { ...DEFAULT_PDF_OPTIONS, orientation: 'landscape' } });
    const portrait = renderPdf({ ...base, options: { ...DEFAULT_PDF_OPTIONS, orientation: 'portrait' } });
    expect(landscape.pageCount).toBeGreaterThan(1);
    expect(portrait.pageCount).toBeLessThan(landscape.pageCount);
    expect(pageCountOf(portrait.pdf)).toBe(portrait.pageCount);
  });

  it('fontu alt küme olarak gömer (PDF boyutu makul kalır)', () => {
    const parties = makeParties(3);
    const { pdf } = renderPdf({ matches: compareParties(parties, 2), parties, options: DEFAULT_PDF_OPTIONS, font, generatedAt: new Date() });
    expect(pdf.byteLength).toBeLessThan(400_000);
  });
});
