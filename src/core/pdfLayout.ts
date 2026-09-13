import type { HeaderKey, MatchRecord, Party } from '../types';

export type PdfFontFamily = 'NotoSans' | 'NotoSerif' | 'Roboto';
export type PdfOrientation = 'landscape' | 'portrait';
export type PdfPaper = 'a4' | 'a3';

export interface PdfMargins {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

/** PDF modalındaki kullanıcı ayarları. Uzunluklar milimetre, yazı boyutu punto. */
export interface PdfOptions {
  title: string;
  orientation: PdfOrientation;
  paper: PdfPaper;
  margins: PdfMargins;
  fontFamily: PdfFontFamily;
  fontSize: number;
  /** Hücre iç boşluğu (mm). */
  cellPadding: number;
  /** Sayfa başına en fazla satır. 0 = otomatik (sayfa dolunca geç). */
  rowsPerPage: number;
  /** Rapor sütunları (Taraf & Sıfat sütunu her zaman eklenir). */
  columns: HeaderKey[];
  zebra: boolean;
}

export const PDF_FONT_LABELS: Record<PdfFontFamily, string> = {
  NotoSans: 'Noto Sans (düz)',
  NotoSerif: 'Noto Serif (tırnaklı)',
  Roboto: 'Roboto',
};

export const DEFAULT_PDF_OPTIONS: PdfOptions = {
  title: 'Dosya Karşılaştırma ve Analiz Raporu',
  orientation: 'landscape',
  paper: 'a4',
  margins: { top: 10, right: 10, bottom: 12, left: 10 },
  fontFamily: 'NotoSans',
  fontSize: 8,
  cellPadding: 1.5,
  rowsPerPage: 0,
  columns: ['Birim Adı', 'Dosya No', 'Dosya Durumu', 'Suçu', 'Karar Türü', 'Açıklama'],
  zebra: true,
};

export const PARTY_COLUMN_TITLE = 'Taraf & Sıfat';

const clamp = (value: number, min: number, max: number) =>
  Number.isFinite(value) ? Math.min(max, Math.max(min, value)) : min;

/** Kullanıcı girdisini PDF motorunun güvenle kullanabileceği aralıklara çeker. */
export const sanitizePdfOptions = (options: PdfOptions): PdfOptions => ({
  ...options,
  fontSize: clamp(options.fontSize, 5, 16),
  cellPadding: clamp(options.cellPadding, 0, 6),
  rowsPerPage: Math.floor(clamp(options.rowsPerPage, 0, 500)),
  margins: {
    top: clamp(options.margins.top, 0, 60),
    right: clamp(options.margins.right, 0, 60),
    bottom: clamp(options.margins.bottom, 0, 60),
    left: clamp(options.margins.left, 0, 60),
  },
});

/** [başlangıç, bitiş) aralıkları; her aralık bir "sayfa grubu"dur. */
export const chunkRanges = (count: number, perPage: number): [number, number][] => {
  if (count === 0 || perPage <= 0) return [[0, count]];
  const ranges: [number, number][] = [];
  for (let start = 0; start < count; start += perPage) {
    ranges.push([start, Math.min(count, start + perPage)]);
  }
  return ranges;
};

export const buildTableHead = (columns: readonly HeaderKey[]): string[] => ['#', PARTY_COLUMN_TITLE, ...columns];

export const buildTableBody = (
  matches: readonly MatchRecord[],
  parties: readonly Pick<Party, 'id' | 'name'>[],
  columns: readonly HeaderKey[],
  startIndex = 0
): string[][] =>
  matches.map((match, i) => [
    String(startIndex + i + 1),
    parties
      .map((p) => {
        const role = match.roles[p.id];
        return `${p.name}: ${role === null || role === undefined ? '—' : role || 'Belirtilmemiş'}`;
      })
      .join('\n'),
    ...columns.map((column) => match[column] ?? ''),
  ]);
