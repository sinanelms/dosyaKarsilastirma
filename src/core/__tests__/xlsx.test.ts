import { describe, expect, it } from 'vitest';
import * as XLSX from 'xlsx';
import { buildResultsWorkbook, readXlsxRows } from '../xlsx';
import { rowsToRecords, textToRows } from '../parse';
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

  it('birleştirilmiş hücre değerini kapsadığı alt satırlara yazar', () => {
    const wb = XLSX.utils.book_new();
    const sheet = XLSX.utils.aoa_to_sheet([
      ['Dosya No', 'Suçu'],
      ['2023/16158', 'Tehdit'],
      [null, 'Hakaret'],
    ]);
    sheet['!merges'] = [{ s: { r: 1, c: 0 }, e: { r: 2, c: 0 } }];
    XLSX.utils.book_append_sheet(wb, sheet, 'Sayfa_1');
    const rows = readXlsxRows(XLSX.write(wb, { type: 'array', bookType: 'xlsx' }) as ArrayBuffer);
    expect(rows[2]).toEqual(['2023/16158', 'Hakaret']);
    expect(rowsToRecords(rows).map((r) => r['Suçu'])).toEqual(['Tehdit\nHakaret']);
  });

  it('tarih biçimli sayıyı saat dilimine bağlı kaydırmadan gün.ay.yıl yapar', () => {
    const wb = XLSX.utils.book_new();
    const sheet = XLSX.utils.aoa_to_sheet([['Kesinleşme Tarihi'], [45294], [45294.999]]);
    sheet['A2'].z = 'dd.mm.yyyy hh:mm:ss';
    sheet['A3'].z = 'dd.mm.yyyy hh:mm:ss';
    XLSX.utils.book_append_sheet(wb, sheet, 'Sayfa_1');
    const rows = readXlsxRows(XLSX.write(wb, { type: 'array', bookType: 'xlsx' }) as ArrayBuffer);
    // 45294 = 03.01.2024 00:00:00 (gamze.xlsx'te 02.01.2024 okunuyordu)
    expect(rows.slice(1)).toEqual([['03.01.2024'], ['03.01.2024']]);
  });

  it('Excel yükleme ile Excel den kopyala-yapıştır aynı kayıtları üretir (birleştirilmiş hücreler)', () => {
    const aoa = [
      ['Birim Adı', 'Dosya Durumu', 'Dosya Türü', 'Dosya No', 'Sıfatı', 'Suçu', 'Karar Türü', 'Kesinleşme Tarihi', 'Açıklama'],
      ['Kahramanmaraş CBS', 'Açık', 'CBS Sorusturma Dosyası', '2024/17284', 'Müşteki Şüpheli', 'Hakaret', null, null, null],
      [null, null, null, null, null, 'Hakaret', 'Ek-Takipsizlik', '2024-08-01 00:00:00.0', null],
      [null, null, null, null, null, 'Tehdit', null, null, null],
      ['Kahramanmaraş CBS', 'Açık', 'CBS Sorusturma Dosyası', '2024/27527', 'Müşteki Şüpheli', 'Basit Yaralama', null, null, null],
    ];
    const wb = XLSX.utils.book_new();
    const sheet = XLSX.utils.aoa_to_sheet(aoa);
    sheet['!merges'] = [0, 1, 2, 3, 4, 8].map((c) => ({ s: { r: 1, c }, e: { r: 3, c } }));
    XLSX.utils.book_append_sheet(wb, sheet, 'Sayfa_1');

    const fromExcel = rowsToRecords(readXlsxRows(XLSX.write(wb, { type: 'array', bookType: 'xlsx' }) as ArrayBuffer));
    const clipboard = aoa.map((row) => row.map((cell) => cell ?? '').join('\t')).join('\r\n');
    const fromPaste = rowsToRecords(textToRows(clipboard));

    const view = (records: typeof fromExcel) => records.map(({ _id: _ignored, _originalIndex: _index, ...rest }) => rest);
    expect(view(fromPaste)).toEqual(view(fromExcel));
    expect(fromExcel[0]['Suçu']).toBe('Hakaret\nHakaret\nTehdit');
    expect(fromExcel[0]['Karar Türü']).toBe('\nEk-Takipsizlik\n');
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
