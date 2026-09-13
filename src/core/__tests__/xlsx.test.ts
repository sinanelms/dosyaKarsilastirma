import { describe, expect, it } from 'vitest';
import * as XLSX from 'xlsx';
import { buildResultsWorkbook, readXlsxRows } from '../xlsx';
import { rowsToRecords } from '../parse';
import { compareParties } from '../compare';

const toArrayBuffer = (aoa: unknown[][], opts: XLSX.AOA2SheetOpts = {}) => {
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(aoa, opts), 'Sayfa1');
  return XLSX.write(wb, { type: 'array', bookType: 'xlsx' }) as ArrayBuffer;
};

describe('readXlsxRows', () => {
  it('ilk sayfayı metin hücrelerine çevirir; tarihleri gg.aa.yyyy yapar, boşları doldurur', () => {
    const buf = toArrayBuffer(
      [
        ['Birim Adı', 'Dosya No', 'Suç Tarihi', 'Sıfatı'],
        ['Ankara CBS', '2024/5', new Date(Date.UTC(2024, 0, 31)), null],
        [null, 2024, 'x', 'Şüpheli'],
      ],
      { cellDates: true }
    );
    const rows = readXlsxRows(buf);
    expect(rows[0]).toEqual(['Birim Adı', 'Dosya No', 'Suç Tarihi', 'Sıfatı']);
    expect(rows[1]).toEqual(['Ankara CBS', '2024/5', '31.01.2024', '']);
    expect(rows[2]).toEqual(['', '2024', 'x', 'Şüpheli']);
  });

  it('rowsToRecords ile birlikte başlığa göre kayıt üretir', () => {
    const buf = toArrayBuffer([
      ['Dosya No', 'Birim Adı', 'Dosya Türü', 'Sıfatı'],
      ['2024/7', 'İzmir CBS', 'Soruşturma Dosyası', 'Mağdur'],
    ]);
    const records = rowsToRecords(readXlsxRows(buf));
    expect(records).toHaveLength(1);
    expect(records[0]['Birim Adı']).toBe('İzmir CBS');
  });
});

describe('buildResultsWorkbook', () => {
  it('kişi sıfat sütunlarını içeren ve geri okunabilen xlsx üretir', () => {
    const parse = (no: string, role: string) =>
      rowsToRecords([['Birim Adı', 'Dosya No', 'Dosya Türü', 'Sıfatı'], ['A CBS', no, 'Soruşturma Dosyası', role]]);
    const parties = [
      { id: 'a', name: 'Ali', records: parse('2024/1', 'Şüpheli') },
      { id: 'b', name: 'Ayşe', records: parse('2024/1', 'Müşteki') },
    ];
    const buf = buildResultsWorkbook(compareParties(parties, 2), parties);
    const rows = readXlsxRows(buf);
    expect(rows[0].slice(0, 3)).toEqual(['#', 'Ali - Sıfatı', 'Ayşe - Sıfatı']);
    expect(rows[1].slice(0, 3)).toEqual(['1', 'Şüpheli', 'Müşteki']);
    expect(rows[0]).toContain('Açıklama');
  });
});
