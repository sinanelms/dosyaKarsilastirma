import * as XLSX from 'xlsx';
import { FIXED_HEADERS } from '../constants';
import type { MatchRecord, Party } from '../types';

const pad = (n: number) => String(n).padStart(2, '0');

const cellToText = (value: unknown): string => {
  if (value === null || value === undefined) return '';
  if (value instanceof Date) {
    // SheetJS tarihleri varsayılan olarak UTC kabul eder.
    return `${pad(value.getUTCDate())}.${pad(value.getUTCMonth() + 1)}.${value.getUTCFullYear()}`;
  }
  return String(value);
};

/** .xlsx/.xls dosyasının ilk sayfasını metin hücrelerinden oluşan satırlara çevirir. */
export const readXlsxRows = (data: ArrayBuffer): string[][] => {
  const workbook = XLSX.read(data, { type: 'array', cellDates: true, dense: true });
  const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
  if (!firstSheet) return [];
  const rows = XLSX.utils.sheet_to_json<unknown[]>(firstSheet, { header: 1, raw: true, defval: null, blankrows: false });
  return rows.map((row) => Array.from(row, cellToText));
};

/** Sonuçları (kişi sıfat sütunları + tüm UYAP sütunları) .xlsx olarak üretir. */
export const buildResultsWorkbook = (
  matches: readonly MatchRecord[],
  parties: readonly Pick<Party, 'id' | 'name'>[]
): ArrayBuffer => {
  const detailHeaders = FIXED_HEADERS.filter((h) => h !== 'Sıfatı');
  const header = ['#', ...parties.map((p) => `${p.name} - Sıfatı`), ...detailHeaders];
  const body = matches.map((match, index) => [
    String(index + 1),
    ...parties.map((p) => (match.roles[p.id] === null ? '—' : match.roles[p.id] || 'Belirtilmemiş')),
    ...detailHeaders.map((h) => match[h]),
  ]);

  const sheet = XLSX.utils.aoa_to_sheet([header, ...body]);
  sheet['!cols'] = header.map((h) => ({ wch: Math.min(40, Math.max(8, h.length + 2)) }));
  sheet['!autofilter'] = { ref: XLSX.utils.encode_range({ s: { r: 0, c: 0 }, e: { r: body.length, c: header.length - 1 } }) };

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, sheet, 'Ortak Dosyalar');
  return XLSX.write(workbook, { type: 'array', bookType: 'xlsx', compression: true }) as ArrayBuffer;
};
