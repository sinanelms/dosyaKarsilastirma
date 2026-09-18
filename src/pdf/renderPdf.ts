import { jsPDF } from 'jspdf';
import { autoTable, type CellDef } from 'jspdf-autotable';
import type { MatchRecord, Party } from '../types';
import {
  buildReportRows,
  buildTableHead,
  chunkRanges,
  crimeColumnLines,
  fitColumnWidth,
  sanitizePdfOptions,
  type PdfOptions,
  type ReportCell,
} from '../core/pdfLayout';
import { drawCellLayout, layoutPartyCell, layoutStatusCell } from './cellBadges';

export interface PdfFontData {
  /** TTF dosyasının base64 içeriği. */
  regular: string;
  bold: string;
}

export interface RenderPdfInput {
  matches: readonly MatchRecord[];
  parties: readonly Pick<Party, 'id' | 'name'>[];
  options: PdfOptions;
  font: PdfFontData;
  generatedAt: Date;
}

export interface RenderPdfResult {
  pdf: ArrayBuffer;
  pageCount: number;
}

const FOOTER_TEXT = 'UYAP Dosya Analiz Modülü';
const FOOTER_GAP = 5; // mm: tablo alt sınırı ile altbilgi çizgisi arası
const GRID_LINE_COLOR: [number, number, number] = [160, 170, 184];
const GROUP_LINE_COLOR: [number, number, number] = [71, 85, 105];
const ZEBRA_COLOR: [number, number, number] = [246, 248, 251];
const WARNING_TEXT_COLOR: [number, number, number] = [180, 83, 9];

/** Gövde hücrelerinin sütuna göre hizası; listede olmayan sütunlar sol üst hizalıdır. */
const BODY_ALIGN: Partial<Record<string, { halign?: 'center'; valign: 'middle' }>> = {
  'Birim Adı': { halign: 'center', valign: 'middle' },
  'Dosya No': { valign: 'middle' },
  'Dosya Durumu': { halign: 'center', valign: 'middle' },
  Suçu: { valign: 'middle' },
  'Suç Tarihi': { valign: 'middle' },
  'Karar Türü': { valign: 'middle' },
  'Kesinleşme Tarihi': { valign: 'middle' },
  Açıklama: { valign: 'middle' },
};

/**
 * Raporu jsPDF ile üretir. Tarayıcı, Web Worker ve Node'da aynı şekilde çalışır.
 * Önizleme de bu fonksiyonun çıktısıdır; bu yüzden önizleme ile kaydedilen dosya birebir aynıdır.
 */
export const renderPdf = ({ matches, parties, options: rawOptions, font, generatedAt }: RenderPdfInput): RenderPdfResult => {
  const options = sanitizePdfOptions(rawOptions);
  const { margins, fontFamily } = options;

  const doc = new jsPDF({ orientation: options.orientation, unit: 'mm', format: options.paper, compress: true });
  doc.addFileToVFS(`${fontFamily}-Regular.ttf`, font.regular);
  doc.addFileToVFS(`${fontFamily}-Bold.ttf`, font.bold);
  doc.addFont(`${fontFamily}-Regular.ttf`, fontFamily, 'normal');
  doc.addFont(`${fontFamily}-Bold.ttf`, fontFamily, 'bold');
  doc.setProperties({ title: options.title, creator: FOOTER_TEXT });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const contentWidth = pageWidth - margins.left - margins.right;
  const footerFontSize = Math.max(6, options.fontSize - 1);
  const footerHeight = footerFontSize * 0.3528 + FOOTER_GAP; // pt → mm
  const tableBottomMargin = margins.bottom + footerHeight;

  // Rapor başlığı (ilk sayfa)
  let cursorY = margins.top;
  if (options.title.trim()) {
    doc.setFont(fontFamily, 'bold');
    doc.setFontSize(options.fontSize + 6);
    const titleLines = doc.splitTextToSize(options.title.toLocaleUpperCase('tr-TR'), contentWidth) as string[];
    doc.text(titleLines, pageWidth / 2, cursorY, { align: 'center', baseline: 'top' });
    cursorY += titleLines.length * (options.fontSize + 6) * 0.3528 * 1.2;
  }

  doc.setFont(fontFamily, 'normal');
  doc.setFontSize(options.fontSize + 1);
  const subtitle = `Tarih: ${generatedAt.toLocaleDateString('tr-TR')}   |   Taraflar: ${parties.map((p) => p.name).join(', ')}   |   Kayıt: ${matches.length}`;
  const subtitleLines = doc.splitTextToSize(subtitle, contentWidth) as string[];
  doc.text(subtitleLines, pageWidth / 2, cursorY + 1, { align: 'center', baseline: 'top' });
  cursorY += 1 + subtitleLines.length * (options.fontSize + 1) * 0.3528 * 1.2 + 1.5;
  doc.setLineWidth(0.5);
  doc.setDrawColor(0);
  doc.line(margins.left, cursorY, pageWidth - margins.right, cursorY);
  cursorY += 3;

  const head = [buildTableHead(options.columns)];
  const partyColumnWidth = Math.min(55, Math.max(28, contentWidth * 0.16));
  const badgeFont = { family: fontFamily, size: options.fontSize };

  // Kısa ama bölünmemesi gereken sütunlara (ör. "2024/12345") yazı boyutuyla orantılı en az genişlik.
  const MIN_WIDTH_EM: Partial<Record<string, number>> = { 'Dosya No': 5.5, 'Dosya Durumu': 4.5, 'Birim Adı': 7, 'Suç Tarihi': 5, 'Kesinleşme Tarihi': 5 };
  const em = options.fontSize * 0.3528 + options.cellPadding * 0.4; // mm
  const minColumnWidths = Object.fromEntries(
    head[0].flatMap((title, index) => (MIN_WIDTH_EM[title] ? [[index, { minCellWidth: MIN_WIDTH_EM[title]! * em + options.cellPadding * 2 }]] : []))
  );

  // Suç adları çoğu dosyada kısadır; sütun içeriğe göre daralır, artan genişlik Açıklama gibi uzun
  // sütunlara kalır. Üst sınır sütunun kendiliğinden aldığı genişliktir (tablo genişliğinin ~1/4'ü).
  const CRIME_COLUMN_MAX_RATIO = 0.24;
  const crimeColumnIndex = head[0].indexOf('Suçu');
  const crimeColumnStyle = (() => {
    if (crimeColumnIndex < 0) return {};
    doc.setFont(fontFamily, 'bold');
    doc.setFontSize(options.fontSize);
    const headerWidth = doc.getTextWidth('Suçu');
    doc.setFont(fontFamily, 'normal');
    const lines = crimeColumnLines(matches, parties, 'Suçu');
    const width = fitColumnWidth(lines, (line) => doc.getTextWidth(line), options.cellPadding, contentWidth * CRIME_COLUMN_MAX_RATIO);
    return { [crimeColumnIndex]: { cellWidth: Math.max(width, headerWidth + 2 * options.cellPadding) } };
  })();

  // Birleştirilmiş hücre sayfadan uzun olursa jspdf-autotable onu bölemez; bir blok, suç satırları
  // en fazla üç satıra sarsa bile boş bir sayfaya sığacak sayıda suçla sınırlanır.
  const lineHeight = options.fontSize * 0.3528 * 1.15;
  const pageBodyHeight = pageHeight - margins.top - tableBottomMargin - (2 * lineHeight + 2 * options.cellPadding);
  const maxEntriesPerBlock = Math.max(1, Math.floor(pageBodyHeight / (3 * lineHeight + 2 * options.cellPadding)));

  chunkRanges(matches.length, options.rowsPerPage).forEach(([start, end], chunkIndex) => {
    if (chunkIndex > 0) {
      doc.addPage();
      cursorY = margins.top;
    }
    const rows = buildReportRows(matches.slice(start, end), parties, options.columns, { startIndex: start, maxEntriesPerBlock });
    // jspdf-autotable hook'larında hücrenin ham girdisi (CellDef nesnesi) üzerinden rapor hücresine ulaşılır.
    const reportCells = new WeakMap<object, ReportCell>();
    const body: CellDef[][] = rows.map((row) =>
      row.cells.map((cell) => {
        const def: CellDef = { content: cell.text, rowSpan: cell.rowSpan };
        reportCells.set(def, cell);
        return def;
      })
    );

    autoTable(doc, {
      head,
      body,
      startY: cursorY,
      margin: { top: margins.top, right: margins.right, bottom: tableBottomMargin, left: margins.left },
      theme: 'grid',
      showHead: 'everyPage',
      rowPageBreak: 'avoid',
      styles: {
        font: fontFamily,
        fontStyle: 'normal',
        fontSize: options.fontSize,
        cellPadding: options.cellPadding,
        overflow: 'linebreak',
        valign: 'top',
        textColor: 0,
        lineColor: GRID_LINE_COLOR,
        lineWidth: 0.15,
      },
      headStyles: { fontStyle: 'bold', fillColor: [241, 245, 249], textColor: 0, halign: 'center', valign: 'middle', lineColor: GROUP_LINE_COLOR },
      columnStyles: {
        // Sıra no sütunu: başlık ve numara hücrenin (birleştirilmiş satırlar dahil) ortasında.
        0: { halign: 'center', valign: 'middle', cellWidth: Math.max(7, options.fontSize * 1.3) },
        1: { cellWidth: partyColumnWidth },
        ...minColumnWidths,
        ...crimeColumnStyle,
      },
      didParseCell: (data) => {
        if (data.section !== 'body') return;
        const cell = reportCells.get(data.cell.raw as object);
        const row = rows[data.row.index];
        if (!cell || !row) return;
        const { styles } = data.cell;
        // Dönüşümlü renk satıra değil dosyaya göre: bir dosyanın suç satırları aynı zemindedir.
        if (options.zebra && row.group % 2 === 1) styles.fillColor = ZEBRA_COLOR;
        const title = head[0][data.column.index];
        if (title === 'Dosya No') styles.fontStyle = 'bold';
        Object.assign(styles, BODY_ALIGN[title]);
        if (cell.unaligned) styles.textColor = WARNING_TEXT_COLOR;

        if (cell.kind === 'party' && cell.roles) {
          const layout = layoutPartyCell(doc, cell.roles, partyColumnWidth - 2 * options.cellPadding, badgeFont);
          styles.minCellHeight = layout.height + 2 * options.cellPadding;
          data.cell.text = [];
        } else if (cell.kind === 'status') {
          // Sütun genişliği henüz belli değil; metin genişlik hesabı için hücrede kalır, çizimden önce silinir.
          styles.minCellHeight = layoutStatusCell(doc, cell.text, contentWidth, badgeFont).height + 2 * options.cellPadding;
        }
      },
      willDrawCell: (data) => {
        if (data.section !== 'body') return;
        if (reportCells.get(data.cell.raw as object)?.kind === 'status') data.cell.text = [];
      },
      didDrawCell: (data) => {
        if (data.section !== 'body') return;
        const cell = reportCells.get(data.cell.raw as object);
        const row = rows[data.row.index];
        if (!cell || !row) return;
        const { x, y, width, height } = data.cell;
        const innerWidth = width - 2 * options.cellPadding;
        if (cell.kind === 'party' && cell.roles) {
          const layout = layoutPartyCell(doc, cell.roles, innerWidth, badgeFont);
          drawCellLayout(doc, layout, x + options.cellPadding, y + options.cellPadding, innerWidth, badgeFont);
        } else if (cell.kind === 'status') {
          // Etiketler hücrenin (birleştirilmiş satırlar dahil) yatay ve dikey ortasına çizilir.
          const layout = layoutStatusCell(doc, cell.text, innerWidth, badgeFont);
          const offsetY = Math.max(0, (height - 2 * options.cellPadding - layout.height) / 2);
          drawCellLayout(doc, layout, x + options.cellPadding, y + options.cellPadding + offsetY, innerWidth, badgeFont, 'center');
        }
        // Dosyalar arasına kalın ayırıcı: satırın son hücresi çizildikten sonra, tablonun tüm genişliğince.
        if (row.groupStart && data.row.index > 0 && data.column.index === data.table.columns.length - 1) {
          const tableWidth = data.table.columns.reduce((sum, column) => sum + column.width, 0);
          doc.setDrawColor(...GROUP_LINE_COLOR);
          doc.setLineWidth(0.45);
          doc.line(margins.left, y, margins.left + tableWidth, y);
        }
      },
    });
  });

  // Altbilgi: toplam sayfa sayısı ancak tüm tablolar çizildikten sonra bilinir.
  const pageCount = doc.getNumberOfPages();
  for (let page = 1; page <= pageCount; page++) {
    doc.setPage(page);
    const lineY = pageHeight - margins.bottom - footerFontSize * 0.3528 - 1.5;
    doc.setLineWidth(0.2);
    doc.setDrawColor(0);
    doc.line(margins.left, lineY, pageWidth - margins.right, lineY);
    doc.setFont(fontFamily, 'normal');
    doc.setFontSize(footerFontSize);
    doc.setTextColor(30);
    doc.text(FOOTER_TEXT, margins.left, pageHeight - margins.bottom, { baseline: 'bottom' });
    doc.text(`Sayfa ${page} / ${pageCount}`, pageWidth - margins.right, pageHeight - margins.bottom, { align: 'right', baseline: 'bottom' });
  }

  return { pdf: doc.output('arraybuffer'), pageCount };
};
