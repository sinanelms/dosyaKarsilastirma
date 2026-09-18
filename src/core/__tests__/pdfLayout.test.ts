import { describe, expect, it } from 'vitest';
import { buildReportRows, buildTableHead, chunkRanges, crimeColumnLines, DEFAULT_PDF_OPTIONS, fitColumnWidth, sanitizePdfOptions, type ReportRow } from '../pdfLayout';
import { FIXED_HEADERS } from '../../constants';
import type { HeaderKey, MatchRecord } from '../../types';
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

  it('taraf hücresinde her kişinin sıfatı bulunur, dosyada olmayan kişinin sıfatı null', () => {
    const rows = buildReportRows(matches, parties, ['Dosya No', 'Suçu']);
    expect(rows.map((row) => row.cells.map((cell) => cell.text))).toEqual([['1', 'Ali: Şüpheli\nAyşe: Müşteki\nCan: —', '2024/1', 'Tehdit']]);
    expect(rows[0].cells[1]).toMatchObject({
      kind: 'party',
      roles: [
        { name: 'Ali', role: 'Şüpheli' },
        { name: 'Ayşe', role: 'Müşteki' },
        { name: 'Can', role: null },
      ],
    });
  });

  it('başlangıç sıra numarası verilebilir', () => {
    expect(buildReportRows(matches, parties, [], { startIndex: 40 })[0].cells[0].text).toBe('41');
  });
});

describe('buildReportRows: suç bazında satırlar', () => {
  const record = (values: Partial<Record<HeaderKey, string>>): MatchRecord => ({
    ...(Object.fromEntries(FIXED_HEADERS.map((h) => [h, ''])) as Record<HeaderKey, string>),
    ...values,
    _key: values['Dosya No'] ?? '',
    roles: { a: 'Şüpheli', b: 'Müşteki' },
    crimeBlocks: [],
    partyCount: 2,
  });
  const parties = [
    { id: 'a', name: 'Ali' },
    { id: 'b', name: 'Ayşe' },
  ];
  const closedFile = record({
    'Birim Adı': 'A CBS',
    'Dosya No': '2020/5',
    'Dosya Durumu': 'Kapalı',
    'Suçu': 'Tehdit, Basit Yaralama, Hakaret',
    'Karar Türü': 'Ek-Takipsizlik, Dava Açma, Takipsizlik',
    'Kesinleşme Tarihi': '2020-01-02 10:00:00.0, 2020-03-04 00:00:00.0, 2020-05-06 00:00:00.0',
    'Açıklama': 'A 1. Asliye Ceza Mahkemesi(2020/9),Açık',
  });
  const texts = (rows: ReportRow[]) => rows.map((row) => row.cells.map((cell) => cell.text));
  const columns: HeaderKey[] = ['Dosya No', 'Dosya Durumu', 'Suçu', 'Karar Türü', 'Kesinleşme Tarihi', 'Açıklama'];

  it('her suç kendi kararı ve tarihiyle ayrı satırdır; dosya düzeyindeki hücreler suç satırları boyunca birleşir', () => {
    const rows = buildReportRows([closedFile], parties, columns);
    expect(texts(rows)).toEqual([
      ['1', 'Ali: Şüpheli\nAyşe: Müşteki', '2020/5', 'Kapalı', 'Tehdit', 'Ek-Takipsizlik', '02.01.2020', 'A 1. Asliye Ceza Mahkemesi(2020/9),Açık'],
      ['Basit Yaralama', 'Dava Açma', '04.03.2020'],
      ['Hakaret', 'Takipsizlik', '06.05.2020'],
    ]);
    expect(rows[0].cells.map((cell) => cell.rowSpan)).toEqual([3, 3, 3, 3, 1, 1, 1, 3]);
    expect(rows[0].cells[3].kind).toBe('status');
    expect(rows.map((row) => [row.group, row.groupStart])).toEqual([
      [0, true],
      [0, false],
      [0, false],
    ]);
  });

  it('suç sütunu seçili değilse dosya tek satırdır', () => {
    const rows = buildReportRows([closedFile], parties, ['Dosya No', 'Açıklama']);
    expect(texts(rows)).toEqual([['1', 'Ali: Şüpheli\nAyşe: Müşteki', '2020/5', 'A 1. Asliye Ceza Mahkemesi(2020/9),Açık']]);
    expect(rows[0].cells.every((cell) => cell.rowSpan === 1)).toBe(true);
  });

  it('çok suçlu dosya bloklara bölünür; her blok dosya bilgilerini yeniden gösterir', () => {
    const rows = buildReportRows([closedFile], parties, ['Dosya No', 'Suçu'], { maxEntriesPerBlock: 2 });
    expect(texts(rows)).toEqual([
      ['1', 'Ali: Şüpheli\nAyşe: Müşteki', '2020/5', 'Tehdit'],
      ['Basit Yaralama'],
      ['1', 'Ali: Şüpheli\nAyşe: Müşteki', '2020/5', 'Hakaret'],
    ]);
    expect(rows.map((row) => row.cells[0].rowSpan)).toEqual([2, 1, 1]);
    expect(rows.map((row) => row.groupStart)).toEqual([true, false, false]);
  });

  it('suç listesi kararlarla eşleştirilemezse suç hücresi uyarı taşır', () => {
    const rows = buildReportRows([record({ 'Dosya No': '2020/6', 'Suçu': 'A, B, C', 'Karar Türü': 'Takipsizlik, Dava Açma' })], parties, ['Suçu', 'Karar Türü']);
    expect(texts(rows)).toEqual([
      ['1', 'Ali: Şüpheli\nAyşe: Müşteki', 'A, B, C\n(Karar eşleştirilemedi)', 'Takipsizlik'],
      ['', 'Dava Açma'],
    ]);
    expect(rows[0].cells[2].unaligned).toBe(true);
    expect(rows[1].cells[0].unaligned).toBeUndefined();
  });

  it('suç bilgisi olmayan dosya boş suç hücreli tek satırdır', () => {
    const rows = buildReportRows([record({ 'Dosya No': '2020/7' })], parties, ['Dosya No', 'Suçu']);
    expect(texts(rows)).toEqual([['1', 'Ali: Şüpheli\nAyşe: Müşteki', '2020/7', '']]);
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

describe('fitColumnWidth', () => {
  const measure = (line: string) => line.length; // 1 birim = 1 karakter

  it('sütunu en geniş satıra göre daraltır', () => {
    expect(fitColumnWidth(['Tehdit', 'Kasten Yaralama'], measure, 2, 100)).toBeCloseTo(15 + 4 + 0.2);
  });

  it('üst sınırı aşmaz', () => {
    expect(fitColumnWidth(['çok çok uzun bir suç adı'], measure, 2, 10)).toBe(10);
  });

  it('içerik yoksa yalnız iç boşluk kadar yer kaplar', () => {
    expect(fitColumnWidth([], measure, 2, 100)).toBeCloseTo(4.2);
  });
});

describe('crimeColumnLines', () => {
  it('suç metinlerini ve eşleşmeyen kayıtların uyarı satırını döndürür', () => {
    const parties = [
      { id: 'a', name: 'Ali', records: rowsToRecords([['Dosya No', 'Sıfatı', 'Suçu', 'Karar Türü'], ['2024/1', 'Şüpheli', 'Tehdit,Hakaret', 'Dava Açma']]) },
      { id: 'b', name: 'Veli', records: rowsToRecords([['Dosya No', 'Sıfatı', 'Suçu', 'Karar Türü'], ['2024/1', 'Müşteki', 'Tehdit,Hakaret', 'Dava Açma']]) },
    ];
    const lines = crimeColumnLines(compareParties(parties, 2), parties, 'Suçu');
    expect(lines.some((line) => line.includes('Tehdit'))).toBe(true);
    expect(lines.some((line) => line.includes('Hakaret'))).toBe(true);
  });
});
