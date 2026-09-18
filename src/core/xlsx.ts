import * as XLSX from 'xlsx';
import { FIXED_HEADERS } from '../constants';
import type { HeaderKey, MatchRecord, Party } from '../types';
import { attributedCrimeEntries, crimeLabel, exportValue } from './decision';

const pad = (n: number) => String(n).padStart(2, '0');

/**
 * Hücreyi metne çevirir. Tarih biçimli sayılar Excel seri numarasından doğrudan gün.ay.yıl yapılır;
 * JS Date'e çevrilmez, çünkü o dönüşüm saat dilimine göre tarihi bir gün geriye kaydırabiliyordu
 * (Excel'de "03.01.2024 00:00:00" → "02.01.2024").
 */
const cellToText = (cell: XLSX.CellObject | undefined): string => {
  if (!cell || cell.v === null || cell.v === undefined) return '';
  if (cell.t === 'n' && cell.z !== undefined && XLSX.SSF.is_date(cell.z)) {
    const date = XLSX.SSF.parse_date_code(cell.v as number);
    if (date) return `${pad(date.d)}.${pad(date.m)}.${date.y}`;
  }
  if (cell.t === 'd' && cell.v instanceof Date) {
    return `${pad(cell.v.getUTCDate())}.${pad(cell.v.getUTCMonth() + 1)}.${cell.v.getUTCFullYear()}`;
  }
  return String(cell.v);
};

/**
 * .xlsx/.xls dosyasının ilk sayfasını metin hücrelerinden oluşan satırlara çevirir.
 * Birleştirilmiş hücrelerin değeri kapsadığı her hücreye yazılır: UYAP birden çok suçlu dosyada
 * Dosya No, Birim Adı vb. hücreleri birleştirir, suç/karar hücrelerini alt alta ayrı satıra yazar.
 */
export const readXlsxRows = (data: ArrayBuffer): string[][] => {
  const workbook = XLSX.read(data, { type: 'array', cellNF: true });
  const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
  if (!firstSheet?.['!ref']) return [];
  const range = XLSX.utils.decode_range(firstSheet['!ref']);

  const texts: string[][] = [];
  for (let r = range.s.r; r <= range.e.r; r++) {
    const row: string[] = [];
    for (let c = range.s.c; c <= range.e.c; c++) {
      row.push(cellToText(firstSheet[XLSX.utils.encode_cell({ r, c })] as XLSX.CellObject | undefined));
    }
    texts.push(row);
  }

  for (const merge of firstSheet['!merges'] ?? []) {
    const value = texts[merge.s.r - range.s.r]?.[merge.s.c - range.s.c];
    if (!value) continue;
    for (let r = merge.s.r; r <= merge.e.r; r++) {
      const row = texts[r - range.s.r];
      if (!row) continue;
      for (let c = merge.s.c; c <= merge.e.c; c++) {
        if (!row[c - range.s.c]) row[c - range.s.c] = value;
      }
    }
  }
  return texts;
};

/**
 * Kişiler aynı dosyada farklı suç/karar bildiriyorsa suç sütunları satır satır yazılır ve her
 * satırın başına kimin bildirdiği eklenir; böylece suç, karar ve tarih aynı hizada kalır.
 * Tek blok kaldığında (kayıtların çoğunda) hücreler bugünkü biçimiyle üretilir.
 */
const labelledCrimeCells = (
  match: MatchRecord,
  parties: readonly Pick<Party, 'id' | 'name'>[]
): Partial<Record<HeaderKey, string>> => {
  const entries = attributedCrimeEntries(match, parties);
  if (!entries.some((entry) => entry.partyNames.length > 0)) return {};
  return {
    'Suçu': entries.map(crimeLabel).join('\n'),
    'Suç Tarihi': entries.map((entry) => entry.crimeDate).join('\n'),
    'Karar Türü': entries.map((entry) => entry.decision).join('\n'),
    'Kesinleşme Tarihi': entries.map((entry) => entry.decisionDate).join('\n'),
  };
};

/** Sonuçları (kişi sıfat sütunları + tüm UYAP sütunları) .xlsx olarak üretir. */
export const buildResultsWorkbook = (
  matches: readonly MatchRecord[],
  parties: readonly Pick<Party, 'id' | 'name'>[]
): ArrayBuffer => {
  const detailHeaders = FIXED_HEADERS.filter((h) => h !== 'Sıfatı');
  const header = ['#', ...parties.map((p) => `${p.name} - Sıfatı`), ...detailHeaders];
  const body = matches.map((match, index) => {
    const labelled = labelledCrimeCells(match, parties);
    return [
      String(index + 1),
      ...parties.map((p) => (match.roles[p.id] === null ? '—' : match.roles[p.id] || 'Belirtilmemiş')),
      ...detailHeaders.map((h) => labelled[h] ?? exportValue(h, match[h])),
    ];
  });

  const sheet = XLSX.utils.aoa_to_sheet([header, ...body]);
  sheet['!cols'] = header.map((h) => ({ wch: Math.min(40, Math.max(8, h.length + 2)) }));
  sheet['!autofilter'] = { ref: XLSX.utils.encode_range({ s: { r: 0, c: 0 }, e: { r: body.length, c: header.length - 1 } }) };

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, sheet, 'Ortak Dosyalar');
  return XLSX.write(workbook, { type: 'array', bookType: 'xlsx', compression: true }) as ArrayBuffer;
};
