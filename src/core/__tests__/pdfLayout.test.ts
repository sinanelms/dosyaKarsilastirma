import { describe, expect, it } from 'vitest';
import { buildTableBody, buildTableHead, chunkRanges, DEFAULT_PDF_OPTIONS, sanitizePdfOptions } from '../pdfLayout';
import { compareParties } from '../compare';
import { rowsToRecords } from '../parse';

describe('chunkRanges', () => {
  it('satırları sayfa başına en fazla N satırlık aralıklara böler', () => {
    expect(chunkRanges(10, 4)).toEqual([
      [0, 4],
      [4, 8],
      [8, 10],
    ]);
  });

  it('N = 0 (otomatik) iken tek aralık döndürür', () => {
    expect(chunkRanges(7, 0)).toEqual([[0, 7]]);
  });

  it('boş listede tek boş aralık döndürür (başlıklı boş tablo için)', () => {
    expect(chunkRanges(0, 5)).toEqual([[0, 0]]);
  });
});

describe('tablo içeriği', () => {
  const header = ['Birim Adı', 'Dosya No', 'Dosya Türü', 'Sıfatı', 'Suçu'];
  const parties = [
    { id: 'a', name: 'Ali', records: rowsToRecords([header, ['A CBS', '2024/1', 'Soruşturma Dosyası', 'Şüpheli', 'Tehdit']]) },
    { id: 'b', name: 'Ayşe', records: rowsToRecords([header, ['A CBS', '2024/1', 'Soruşturma Dosyası', 'Müşteki', '']]) },
    { id: 'c', name: 'Can', records: rowsToRecords([header, ['B CBS', '2024/1', 'Soruşturma Dosyası', 'Şüpheli', '']]) },
  ];
  const matches = compareParties(parties, 2);

  it('başlıkta sıra no, taraf sütunu ve seçili sütunlar bulunur', () => {
    expect(buildTableHead(['Dosya No', 'Suçu'])).toEqual(['#', 'Taraf & Sıfat', 'Dosya No', 'Suçu']);
  });

  it('taraf hücresinde her kişi "Ad: Sıfat" satırı olarak yer alır, dosyada olmayan kişi "—"', () => {
    const body = buildTableBody(matches, parties, ['Dosya No', 'Suçu']);
    expect(body).toEqual([['1', 'Ali: Şüpheli\nAyşe: Müşteki\nCan: —', '2024/1', 'Tehdit']]);
  });

  it('başlangıç sıra numarası verilebilir', () => {
    expect(buildTableBody(matches, parties, [], 40)[0][0]).toBe('41');
  });
});

describe('sanitizePdfOptions', () => {
  it('geçersiz değerleri güvenli aralıklara çeker', () => {
    const o = sanitizePdfOptions({ ...DEFAULT_PDF_OPTIONS, fontSize: 99, rowsPerPage: -3, margins: { top: -1, right: 500, bottom: 10, left: Number.NaN } });
    expect(o.fontSize).toBe(16);
    expect(o.rowsPerPage).toBe(0);
    expect(o.margins).toEqual({ top: 0, right: 60, bottom: 10, left: 0 });
  });
});
