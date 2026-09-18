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

  it('birleştirilmiş hücreli dosyanın devam satırlarındaki suç ve kararları aynı kayda ekler', () => {
    const file = { 'Birim Adı': 'Mersin CBS', 'Dosya Durumu': 'Kapalı', 'Dosya Türü': 'CBS Sorusturma Dosyası', 'Dosya No': '2022/54584', 'Sıfatı': 'Şüpheli', 'Açıklama': 'Mersin 10. Asliye Ceza Mahkemesi(2022/683),Kapalı' };
    const records = rowsToRecords([
      HEADER,
      row({ ...file, 'Suçu': 'Tehdit', 'Karar Türü': 'Ek-Takipsizlik', 'Kesinleşme Tarihi': '2022-09-14 00:00:00.0' }),
      row({ ...file, 'Suçu': 'Basit Yaralama', 'Kesinleşme Tarihi': '2022-09-14 16:31:28.0' }),
      row({ ...file, 'Suçu': 'Basit Yaralama', 'Karar Türü': 'Dava Açma', 'Kesinleşme Tarihi': '2022-09-14 16:31:28.0' }),
      row({ ...file, 'Dosya No': '2022/1623' }),
    ]);
    expect(records).toHaveLength(2);
    // Suç bazında satır satır hizalı: aynı suç tekrar etse de, karar boş olsa da satır eklenir.
    expect(records[0]['Suçu']).toBe('Tehdit\nBasit Yaralama\nBasit Yaralama');
    expect(records[0]['Karar Türü']).toBe('Ek-Takipsizlik\n\nDava Açma');
    expect(records[0]['Kesinleşme Tarihi']).toBe('2022-09-14 00:00:00.0\n2022-09-14 16:31:28.0\n2022-09-14 16:31:28.0');
    expect(records[0]['Kesinleşme Türü']).toBe('');
    expect(records[0]['Açıklama']).toBe(file['Açıklama']);
    expect(records[1]['Suçu']).toBe('');
  });

  it('yapıştırılan metinde kimlik sütunları boş devam satırını suçlu önceki dosyaya ekler', () => {
    const records = rowsToRecords([
      HEADER,
      row({ 'Birim Adı': 'Kızıltepe CBS', 'Dosya No': '2022/6737', 'Sıfatı': 'Şüpheli', 'Suçu': 'Hakaret' }),
      row({ 'Suçu': 'Basit Yaralama' }),
      row({ 'Suçu': 'Dolandırıcılık', 'Karar Türü': 'Takipsizlik', 'Kesinleşme Tarihi': '01.02.2023' }),
    ]);
    expect(records).toHaveLength(1);
    expect(records[0]['Suçu']).toBe('Hakaret\nBasit Yaralama\nDolandırıcılık');
    expect(records[0]['Karar Türü']).toBe('\n\nTakipsizlik');
  });

  it('Dosya No su olmayan yetim satırı önceki dosyaya bağlamaz', () => {
    const records = rowsToRecords([
      HEADER,
      row({ 'Birim Adı': 'Ankara CBS', 'Dosya No': '2024/11', 'Sıfatı': 'Müşteki' }),
      row({ 'Suçu': 'Kasten Yaralama', 'Karar Türü': 'Dava Açma', 'Kesinleşme Tarihi': '26.12.2011' }),
    ]);
    expect(records).toHaveLength(1);
    expect(records[0]['Suçu']).toBe('');
    expect(records[0]['Karar Türü']).toBe('');
  });

  it('başlık satırı dosyanın ortasındaysa önceki satırları da o başlığa göre okur', () => {
    const header = ['Birim Adı', 'Dosya Durumu', 'Dosya Türü', 'Dosya No', 'Sıfatı', 'Suçu', 'Karar Türü', 'Kesinleşme Tarihi', 'Kesinleşme Türü', 'Açıklama'];
    const records = rowsToRecords([
      ['Ankara CBS', 'Kapalı', 'CBS Sorusturma Dosyası', '2022/4', 'Şüpheli', '[Basit Yaralama]', '[Takipsizlik]', '[2022-05-09 09:06:50.0]', '[]', ''],
      header,
      ['Ankara CBS', 'Açık', 'CBS Sorusturma Dosyası', '2024/1', 'Müşteki', '', '', '', '', 'Ankara 1. Asliye Ceza Mahkemesi(2024/5),Açık'],
    ]);
    expect(records[0]['Suçu']).toBe('Basit Yaralama');
    expect(records[0]['Karar Türü']).toBe('Takipsizlik');
    expect(records[0]['Kesinleşme Türü']).toBe('');
    expect(records[1]['Açıklama']).toBe('Ankara 1. Asliye Ceza Mahkemesi(2024/5),Açık');
  });

  it('başlıksız 9 sütunlu çıktıyı sütun sayısından tanır', () => {
    const records = rowsToRecords([
      ['İzmir CBS', 'Kapalı', 'CBS Sorusturma Dosyası', '2020/6', 'Müşteki Şüpheli', 'Basit Yaralama', 'Ek-Takipsizlik', '16.03.2021', 'Ankara 8. Asliye Ceza Mahkemesi(2021/8),Kapalı'],
    ]);
    expect(records[0]['Suçu']).toBe('Basit Yaralama');
    expect(records[0]['Karar Türü']).toBe('Ek-Takipsizlik');
    expect(records[0]['Açıklama']).toContain('2021/8');
  });
});

describe('normalize', () => {
  it('cleanCell köşeli parantez, nan ve boşlukları temizler', () => {
    expect(cleanCell('  [Silahla Tehdit] ')).toBe('Silahla Tehdit');
    expect(cleanCell('NaN')).toBe('');
    expect(cleanCell('[açık')).toBe('[açık');
    expect(cleanCell('[]')).toBe('');
    // Öğe sayısı suç sayısını verir; korunur.
    expect(cleanCell('[, , ]')).toBe(', , ');
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
