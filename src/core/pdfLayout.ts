import type { HeaderKey, MatchRecord, Party } from '../types';
import { attributedCrimeEntries, crimeLabel, exportValue, type AttributedCrimeEntry } from './decision';

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

/** Suç bazında satır satır yazılan sütunlar; diğer sütunlar dosya düzeyindedir ve suç satırları boyunca birleştirilir. */
export const CRIME_COLUMNS: readonly HeaderKey[] = ['Suçu', 'Suç Tarihi', 'Karar Türü', 'Kesinleşme Tarihi'];

export interface PartyRole {
  name: string;
  /** null: kişi bu dosyada yok. '': kişi var, sıfat boş. */
  role: string | null;
}

export interface ReportCell {
  /** party: kişi adları ve sıfat etiketleri; status: dosya durumu etiketi; text: düz metin. */
  kind: 'party' | 'status' | 'text';
  /** Hücrenin düz metni (etiketli hücrelerde sütun genişliği hesabı için). */
  text: string;
  /** Hücrenin kapladığı satır sayısı (dosya düzeyindeki hücreler dosyanın suç satırları boyunca birleşir). */
  rowSpan: number;
  roles?: PartyRole[];
  /** Suç listesi karar listesiyle eşleştirilemedi; suç ile karar yan yana olmayabilir. */
  unaligned?: boolean;
}

export interface ReportRow {
  /**
   * jspdf-autotable düzeninde hücreler: üstteki birleştirilmiş hücrenin kapladığı sütunlar atlanır,
   * bu yüzden bir dosyanın ilk satırı dışındaki satırlarda yalnız suç sütunları bulunur.
   */
  cells: ReportCell[];
  /** Dosyanın rapordaki sıra no'su (0 tabanlı). */
  group: number;
  /** Dosyanın ilk satırı. */
  groupStart: boolean;
}

const UNALIGNED_NOTE = '(Karar eşleştirilemedi)';

const crimeCellText = (column: HeaderKey, entry: AttributedCrimeEntry | null): string => {
  if (!entry) return '';
  if (column === 'Suçu') return crimeLabel(entry);
  if (column === 'Suç Tarihi') return entry.crimeDate;
  if (column === 'Karar Türü') return entry.decision;
  return entry.decisionDate;
};

/**
 * Rapor tablosunun satırlarını kurar. Suç sütunlarından biri seçiliyse her suç (ve o suça verilen
 * karar) ayrı satırdır; sıra no, taraflar ve diğer sütunlar dosyanın suç satırları boyunca birleşir.
 * Sayfadan uzun birleştirilmiş hücre çizilemediği için çok suçlu dosya `maxEntriesPerBlock` suçluk
 * bloklara bölünür; her blok dosya bilgilerini yeniden gösterir.
 */
export const buildReportRows = (
  matches: readonly MatchRecord[],
  parties: readonly Pick<Party, 'id' | 'name'>[],
  columns: readonly HeaderKey[],
  { startIndex = 0, maxEntriesPerBlock = Infinity }: { startIndex?: number; maxEntriesPerBlock?: number } = {}
): ReportRow[] => {
  const hasCrimeColumns = columns.some((column) => CRIME_COLUMNS.includes(column));
  const blockSize = Math.max(1, Math.floor(maxEntriesPerBlock));
  const rows: ReportRow[] = [];

  matches.forEach((match, i) => {
    const group = startIndex + i;
    const entries = hasCrimeColumns ? attributedCrimeEntries(match, parties) : [];
    const lines: (AttributedCrimeEntry | null)[] = entries.length > 0 ? entries : [null];
    const roles: PartyRole[] = parties.map((p) => ({ name: p.name, role: match.roles[p.id] ?? null }));
    const partyText = roles.map(({ name, role }) => `${name}: ${role === null ? '—' : role || 'Belirtilmemiş'}`).join('\n');

    for (let blockStart = 0; blockStart < lines.length; blockStart += blockSize) {
      const block = lines.slice(blockStart, blockStart + blockSize);
      block.forEach((entry, j) => {
        const cells: ReportCell[] = [];
        if (j === 0) {
          cells.push({ kind: 'text', text: String(group + 1), rowSpan: block.length });
          cells.push({ kind: 'party', text: partyText, rowSpan: block.length, roles });
        }
        for (const column of columns) {
          if (CRIME_COLUMNS.includes(column)) {
            const unaligned = column === 'Suçu' && !!entry && !entry.aligned && !!entry.crime;
            const text = crimeCellText(column, entry);
            cells.push({ kind: 'text', text: unaligned ? `${text}\n${UNALIGNED_NOTE}` : text, rowSpan: 1, ...(unaligned ? { unaligned } : {}) });
          } else if (j === 0) {
            const text = exportValue(column, match[column] ?? '');
            cells.push({ kind: column === 'Dosya Durumu' ? 'status' : 'text', text, rowSpan: block.length });
          }
        }
        rows.push({ cells, group, groupStart: blockStart === 0 && j === 0 });
      });
    }
  });
  return rows;
};

/** Suç sütununun hücrelerindeki metin satırları; sütunu içeriğe göre daraltmak için ölçülür. */
export const crimeColumnLines = (
  matches: readonly MatchRecord[],
  parties: readonly Pick<Party, 'id' | 'name'>[],
  column: HeaderKey
): string[] =>
  matches.flatMap((match) =>
    attributedCrimeEntries(match, parties).flatMap((entry) => {
      const text = crimeCellText(column, entry);
      const unaligned = column === 'Suçu' && !entry.aligned && !!entry.crime;
      return unaligned ? [text, UNALIGNED_NOTE] : [text];
    })
  );

/**
 * Sütunu içeriğine göre daraltır: en geniş satır + iç boşluk. Üst sınır (sütunun kendiliğinden
 * alacağı genişlik) aşılmaz; içerik dar kalırsa artan genişlik diğer sütunlara kalır.
 */
export const fitColumnWidth = (
  lines: readonly string[],
  measure: (line: string) => number,
  cellPadding: number,
  maxWidth: number
): number => {
  const widest = lines.reduce((max, line) => Math.max(max, measure(line)), 0);
  // 0.2 mm: ölçüm ile çizim arasındaki yuvarlama farkı metni gereksiz yere alt satıra atmasın.
  return Math.min(maxWidth, widest + 2 * cellPadding + 0.2);
};
