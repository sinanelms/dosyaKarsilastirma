import { CRIME_ALIGNED_COLUMNS, FILL_DOWN_COLUMNS, FIXED_HEADERS } from '../constants';
import type { CaseRecord, HeaderKey } from '../types';
import { cleanCell, lowerTr } from './normalize';

let idCounter = 0;
export const generateId = (): string => `r${Date.now().toString(36)}${(idCounter++).toString(36)}`;

/** Panodan gelen sekmeyle ayrılmış metni satır/hücre dizisine çevirir. */
export const textToRows = (text: string): string[][] =>
  text
    .split(/\r?\n/)
    .filter((line) => line.trim().length > 0)
    .map((line) => line.split('\t'));

const HEADER_LOOKUP = new Map<string, HeaderKey>(FIXED_HEADERS.map((h) => [lowerTr(h), h]));

/** Satır en az iki bilinen başlık adı içeriyorsa sütun eşlemesini döndürür, değilse null. */
const detectHeader = (cells: string[]): (HeaderKey | null)[] | null => {
  const mapping = cells.map((cell) => HEADER_LOOKUP.get(lowerTr(cleanCell(cell))) ?? null);
  return mapping.filter(Boolean).length >= 2 ? mapping : null;
};

const POSITIONAL_MAPPING: (HeaderKey | null)[] = [...FIXED_HEADERS];

/**
 * Başlıksız UYAP çıktılarında sütun sayısına göre bilinen düzenler. (Sayfa ayarına göre
 * bazı boş sütunları atılmış çıktılarda görülür.)
 */
const LAYOUTS_BY_WIDTH: Record<number, HeaderKey[]> = {
  9: ['Birim Adı', 'Dosya Durumu', 'Dosya Türü', 'Dosya No', 'Sıfatı', 'Suçu', 'Karar Türü', 'Kesinleşme Tarihi', 'Açıklama'],
  10: ['Birim Adı', 'Dosya Durumu', 'Dosya Türü', 'Dosya No', 'Sıfatı', 'Suçu', 'Karar Türü', 'Kesinleşme Tarihi', 'Kesinleşme Türü', 'Açıklama'],
  11: ['Birim Adı', 'Dosya Durumu', 'Dosya Türü', 'Dosya No', 'Sıfatı', 'Suçu', 'Suç Tarihi', 'Karar Türü', 'Kesinleşme Tarihi', 'Kesinleşme Türü', 'Açıklama'],
};

/** İlk başlık satırından önceki satırlar için eşleme: sonradan gelen başlık, yoksa sütun sayısı. */
const initialMapping = (rows: readonly string[][]): (HeaderKey | null)[] => {
  for (const cells of rows) {
    const header = detectHeader(cells);
    if (header) return header;
  }
  // Excel satırları sayfa aralığı genişliğinde, yapıştırılan satırlar sondaki sekmeleriyle gelir.
  const width = rows.reduce((max, cells) => Math.max(max, cells.length), 0);
  return LAYOUTS_BY_WIDTH[width] ?? POSITIONAL_MAPPING;
};

/** Bir dosyayı tanımlayan sütunlar; bunlar aynı olan ardışık satırlar aynı dosyanın devamıdır. */
const IDENTITY_COLUMNS = ['Birim Adı', 'Dosya Durumu', 'Dosya Türü', 'Dosya No', 'Sıfatı'] as const;

/** Devam satırından kayda eklenen sütunlar. */
const DETAIL_COLUMNS = FIXED_HEADERS.filter((h) => !(IDENTITY_COLUMNS as readonly string[]).includes(h));

/**
 * Açık dosyalarda her suç ayrı satırdadır ve o suçun kararı aynı satırdadır. Devam satırında hizalı
 * sütunların hepsi (boş olsa da, aynı suç tekrar etse de) alt alta eklenir; i. satırlar birbirine
 * karşılık gelir (bkz. core/decision.ts crimeEntries).
 */
const ALIGNED_COLUMNS: readonly HeaderKey[] = CRIME_ALIGNED_COLUMNS;

const isContinuation = (record: CaseRecord | null, values: Record<HeaderKey, string>): record is CaseRecord =>
  !!record && IDENTITY_COLUMNS.every((column) => record[column] === values[column]);

/**
 * Excel'den kopyalanıp yapıştırılan metinde birleştirilmiş hücrelerin alt satırları boş gelir:
 * kimlik sütunları boş, yalnız suç/karar dolu satır önceki dosyanın devamıdır. Önceki kaydın ilk
 * satırında suç yoksa bağlanmaz: sıralaması bozulmuş çıktılarda (ör. suçsuz bir Müşteki dosyasının
 * altına düşmüş 2009 tarihli karar satırı) veri yanlış dosyaya taşınmasın.
 */
const isOrphanContinuation = (record: CaseRecord | null, values: Record<HeaderKey, string>): record is CaseRecord =>
  !!record &&
  !!values['Suçu'] &&
  IDENTITY_COLUMNS.every((column) => !values[column]) &&
  !!record['Suçu'].split('\n')[0].trim();

/** Devam satırının suç/karar değerlerini kayda alt alta ekler. */
const appendContinuation = (record: CaseRecord, values: Record<HeaderKey, string>) => {
  for (const column of DETAIL_COLUMNS) {
    const value = values[column];
    if (ALIGNED_COLUMNS.includes(column)) {
      record[column] = `${record[column]}\n${value}`;
    } else if (value && !record[column].split('\n').includes(value)) {
      record[column] = record[column] ? `${record[column]}\n${value}` : value;
    }
  }
};

/**
 * Ham satırları kayıtlara dönüştürür.
 * - Başlık satırı görülürse sonraki satırlar başlık adına göre eşlenir; ilk başlıktan önceki
 *   satırlar da o başlığa göre (yoksa sütun sayısına / sıraya göre) okunur.
 * - Yalnız FILL_DOWN_COLUMNS (birleştirilmiş hücreler) üst satırdan doldurulur.
 * - Kimlik sütunları bir önceki kayıtla aynı olan satır, birleştirilmiş hücreli bir dosyanın
 *   devamıdır (readXlsxRows birleştirilmiş değeri alt satırlara yazar): suç/karar değerleri o
 *   kayda alt alta eklenir.
 * - Dosya No'su olmayan satır yalnız isOrphanContinuation koşulunda (yapıştırılan metindeki
 *   birleştirilmiş hücre devamı) önceki kayda eklenir; diğerleri atlanır.
 * - Birebir aynı satırlar tekilleştirilir.
 */
export const rowsToRecords = (rows: readonly (readonly unknown[])[]): CaseRecord[] => {
  const cleanedRows = rows.map((rawCells) => rawCells.map(cleanCell));
  let mapping = initialMapping(cleanedRows);
  const lastValues: Partial<Record<HeaderKey, string>> = {};
  const seen = new Set<string>();
  const records: CaseRecord[] = [];
  /** Devam satırlarının ekleneceği kayıt; tekrar diye atlanan satırın devamı da atlanır. */
  let current: CaseRecord | null = null;

  cleanedRows.forEach((cells, index) => {
    if (cells.every((c) => c === '')) return;

    const header = detectHeader(cells);
    if (header) {
      mapping = header;
      current = null;
      return;
    }

    const values = Object.fromEntries(FIXED_HEADERS.map((h) => [h, ''])) as Record<HeaderKey, string>;
    mapping.forEach((key, i) => {
      if (key && cells[i]) values[key] = cells[i];
    });

    if (!values['Dosya No']) {
      if (isOrphanContinuation(current, values)) appendContinuation(current, values);
      return;
    }

    for (const column of FILL_DOWN_COLUMNS) {
      if (values[column]) lastValues[column] = values[column];
      else if (lastValues[column]) values[column] = lastValues[column]!;
    }

    if (isContinuation(current, values)) {
      appendContinuation(current, values);
      return;
    }

    const uniqueKey = FIXED_HEADERS.map((h) => values[h]).join('');
    if (seen.has(uniqueKey)) {
      current = null;
      return;
    }
    seen.add(uniqueKey);

    current = { ...values, _id: generateId(), _originalIndex: index };
    records.push(current);
  });

  // Hiç değeri olmayan hizalı sütunlarda yalnız satır ayraçları kalır; boş değere indir.
  for (const record of records) {
    for (const column of ALIGNED_COLUMNS) {
      if (/^\n+$/.test(record[column])) record[column] = '';
    }
  }
  return records;
};
