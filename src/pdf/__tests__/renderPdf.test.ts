import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it, vi } from 'vitest';
import { renderPdf } from '../renderPdf';
import { FIXED_HEADERS } from '../../constants';
import type { HeaderKey } from '../../types';
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

  it('sayfadan uzun çok suçlu dosyayı bloklara bölerek birleştirilmiş hücre uyarısı olmadan çizer', () => {
    const crimes = Array.from({ length: 80 }, (_, i) => `Suç ${i + 1}`);
    const match = {
      ...(Object.fromEntries(FIXED_HEADERS.map((h) => [h, ''])) as Record<HeaderKey, string>),
      'Birim Adı': 'İzmir CBS',
      'Dosya No': '2020/1',
      'Dosya Durumu': 'Kapalı',
      'Suçu': crimes.join(', '),
      'Karar Türü': crimes.map(() => 'Takipsizlik').join(', '),
      _key: '2020/1',
      roles: { a: 'Şüpheli', b: null },
      partyCount: 1,
    };
    const warnings: string[] = [];
    const log = vi.spyOn(console, 'log').mockImplementation((message: unknown) => void warnings.push(String(message)));
    try {
      const result = renderPdf({
        matches: [match],
        parties: [
          { id: 'a', name: 'Ali Işık' },
          { id: 'b', name: 'Ayşe Öz' },
        ],
        options: DEFAULT_PDF_OPTIONS,
        font,
        generatedAt: new Date(),
      });
      expect(result.pageCount).toBeGreaterThan(1);
      expect(pageCountOf(result.pdf)).toBe(result.pageCount);
    } finally {
      log.mockRestore();
    }
    expect(warnings.filter((w) => w.includes('rowspan') || w.includes('Will not'))).toEqual([]);
  });

  it('fontu alt küme olarak gömer (PDF boyutu makul kalır)', () => {
    const parties = makeParties(3);
    const { pdf } = renderPdf({ matches: compareParties(parties, 2), parties, options: DEFAULT_PDF_OPTIONS, font, generatedAt: new Date() });
    expect(pdf.byteLength).toBeLessThan(400_000);
  });
});
