import { describe, expect, it } from 'vitest';
import { rowsToRecords, textToRows } from '../parse';
import { cleanCell, normalizeDosyaNo, smartMerge } from '../normalize';

const HEADER = [
  'Birim Adı', 'Dosya Durumu', 'Dosya Türü', 'Dosya No', 'Sıfatı', 'Vekilleri', 'Dava Türleri',
  'Dava Konusu', 'İlamat Numaraları', 'Suçu', 'Suç Tarihi', 'Karar Türü', 'Kesinleşme Tarihi',
  'Kesinleşme Türü', 'Açıklama',
];

const row = (values: Partial<Record<string, string>>) => HEADER.map((h) => values[h] ?? '');

describe('textToRows', () => {
  it('sekmeyle ayrılmış satırları ve CRLF satır sonlarını böler', () => {
    expect(textToRows('a\tb\r\nc\td\n')).toEqual([
      ['a', 'b'],
      ['c', 'd'],
    ]);
  });

  it('boş satırları atlar', () => {
    expect(textToRows('a\tb\n\n  \nc')).toEqual([['a', 'b'], ['c']]);
  });
});

describe('rowsToRecords', () => {
  it('boş detay hücrelerini üst satırdan doldurmaz (son sütun hatası)', () => {
    const records = rowsToRecords([
      row({
        'Birim Adı': 'Ankara CBS', 'Dosya Durumu': 'Kapalı', 'Dosya Türü': 'Soruşturma Dosyası',
        'Dosya No': '2023/100', 'Sıfatı': 'Şüpheli', 'Suçu': 'Hırsızlık',
        'Karar Türü': 'Kovuşturmaya Yer Olmadığı', 'Kesinleşme Türü': 'Kesinleşti', 'Açıklama': 'Not 1',
      }),
      row({ 'Birim Adı': 'Ankara CBS', 'Dosya Durumu': 'Açık', 'Dosya Türü': 'Soruşturma Dosyası', 'Dosya No': '2024/5', 'Sıfatı': 'Müşteki' }),
    ]);

    expect(records).toHaveLength(2);
    expect(records[1]['Suçu']).toBe('');
    expect(records[1]['Karar Türü']).toBe('');
    expect(records[1]['Kesinleşme Türü']).toBe('');
    expect(records[1]['Açıklama']).toBe('');
  });

  it('birleştirilmiş hücre sütunlarını (Birim Adı, Dosya Durumu, Dosya Türü) üstten doldurur', () => {
    const records = rowsToRecords([
      row({ 'Birim Adı': 'İzmir CBS', 'Dosya Durumu': 'Açık', 'Dosya Türü': 'Soruşturma Dosyası', 'Dosya No': '2024/1' }),
      row({ 'Dosya No': '2024/2', 'Sıfatı': 'Şüpheli' }),
    ]);
    expect(records[1]['Birim Adı']).toBe('İzmir CBS');
    expect(records[1]['Dosya Durumu']).toBe('Açık');
    expect(records[1]['Dosya Türü']).toBe('Soruşturma Dosyası');
    expect(records[1]['Dosya No']).toBe('2024/2');
  });

  it('başlık satırı varsa sütunları ada göre eşler', () => {
    const records = rowsToRecords([
      ['Dosya No', 'Birim Adı', 'Sıfatı', 'Dosya Türü', 'Dosya Durumu'],
      ['2024/9', 'Bursa CBS', 'Mağdur', 'Soruşturma Dosyası', 'Açık'],
    ]);
    expect(records).toHaveLength(1);
    expect(records[0]['Birim Adı']).toBe('Bursa CBS');
    expect(records[0]['Dosya No']).toBe('2024/9');
    expect(records[0]['Sıfatı']).toBe('Mağdur');
    expect(records[0]['Açıklama']).toBe('');
  });

  it('yapıştırma arasında tekrar eden başlık satırlarını atlar', () => {
    const records = rowsToRecords([
      HEADER,
      row({ 'Birim Adı': 'A', 'Dosya No': '2024/1' }),
      HEADER,
      row({ 'Birim Adı': 'A', 'Dosya No': '2024/2' }),
    ]);
    expect(records.map((r) => r['Dosya No'])).toEqual(['2024/1', '2024/2']);
  });

  it('tamamen aynı satırları tekilleştirir', () => {
    const r = row({ 'Birim Adı': 'A', 'Dosya No': '2024/1' });
    expect(rowsToRecords([r, [...r]])).toHaveLength(1);
  });

  it('dosya numarası olmayan satırları kayıt saymaz', () => {
    expect(rowsToRecords([row({ 'Birim Adı': 'A', 'Açıklama': 'bilgi' })])).toHaveLength(0);
  });
});

describe('normalize', () => {
  it('cleanCell köşeli parantez, nan ve boşlukları temizler', () => {
    expect(cleanCell('  [Silahla Tehdit] ')).toBe('Silahla Tehdit');
    expect(cleanCell('NaN')).toBe('');
    expect(cleanCell('[açık')).toBe('[açık');
    expect(cleanCell(undefined)).toBe('');
  });

  it('normalizeDosyaNo baştaki sıfırları ve boşlukları kaldırır', () => {
    expect(normalizeDosyaNo(' 2024 / 05 ')).toBe('2024/5');
    expect(normalizeDosyaNo('2024/0')).toBe('2024/0');
    expect(normalizeDosyaNo('2024/123 Esas')).toBe('2024/123esas');
  });

  it('smartMerge kapsayanı alır, farklıysa satır ile birleştirir', () => {
    expect(smartMerge('', 'B')).toBe('B');
    expect(smartMerge('Hırsızlık', 'hırsızlık')).toBe('Hırsızlık');
    expect(smartMerge('Tehdit', 'Silahla Tehdit')).toBe('Silahla Tehdit');
    expect(smartMerge('A', 'B')).toBe('A\nB');
    expect(smartMerge('A\nB', 'B')).toBe('A\nB');
  });
});
