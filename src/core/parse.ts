import { FILL_DOWN_COLUMNS, FIXED_HEADERS } from '../constants';
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
 * Ham satırları kayıtlara dönüştürür.
 * - Başlık satırı görülürse sonraki satırlar başlık adına göre eşlenir; yoksa sıraya göre.
 * - Yalnız FILL_DOWN_COLUMNS (birleştirilmiş hücreler) üst satırdan doldurulur.
 * - Dosya No'su olmayan satırlar atlanır, birebir aynı satırlar tekilleştirilir.
 */
export const rowsToRecords = (rows: readonly (readonly unknown[])[]): CaseRecord[] => {
  let mapping = POSITIONAL_MAPPING;
  const lastValues: Partial<Record<HeaderKey, string>> = {};
  const seen = new Set<string>();
  const records: CaseRecord[] = [];

  rows.forEach((rawCells, index) => {
    const cells = rawCells.map(cleanCell);
    if (cells.every((c) => c === '')) return;

    const header = detectHeader(cells);
    if (header) {
      mapping = header;
      return;
    }

    const values = Object.fromEntries(FIXED_HEADERS.map((h) => [h, ''])) as Record<HeaderKey, string>;
    mapping.forEach((key, i) => {
      if (key && cells[i]) values[key] = cells[i];
    });

    for (const column of FILL_DOWN_COLUMNS) {
      if (values[column]) lastValues[column] = values[column];
      else if (lastValues[column]) values[column] = lastValues[column]!;
    }

    if (!values['Dosya No']) return;

    const uniqueKey = FIXED_HEADERS.map((h) => values[h]).join('');
    if (seen.has(uniqueKey)) return;
    seen.add(uniqueKey);

    records.push({ ...values, _id: generateId(), _originalIndex: index });
  });

  return records;
};
