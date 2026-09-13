import { jsPDF } from 'jspdf';
import { autoTable } from 'jspdf-autotable';
import type { MatchRecord, Party } from '../types';
import {
  buildTableBody,
  buildTableHead,
  chunkRanges,
  PARTY_COLUMN_TITLE,
  sanitizePdfOptions,
  type PdfOptions,
} from '../core/pdfLayout';

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

  // Kısa ama bölünmemesi gereken sütunlara (ör. "2024/12345") yazı boyutuyla orantılı en az genişlik.
  const MIN_WIDTH_EM: Partial<Record<string, number>> = { 'Dosya No': 5.5, 'Dosya Durumu': 4.5, 'Birim Adı': 7, 'Suç Tarihi': 5, 'Kesinleşme Tarihi': 5 };
  const em = options.fontSize * 0.3528 + options.cellPadding * 0.4; // mm
  const minColumnWidths = Object.fromEntries(
    head[0].flatMap((title, index) => (MIN_WIDTH_EM[title] ? [[index, { minCellWidth: MIN_WIDTH_EM[title]! * em + options.cellPadding * 2 }]] : []))
  );

  chunkRanges(matches.length, options.rowsPerPage).forEach(([start, end], chunkIndex) => {
    if (chunkIndex > 0) {
      doc.addPage();
      cursorY = margins.top;
    }
    autoTable(doc, {
      head,
      body: buildTableBody(matches.slice(start, end), parties, options.columns, start),
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
        lineColor: 60,
        lineWidth: 0.15,
      },
      headStyles: { fontStyle: 'bold', fillColor: [241, 245, 249], textColor: 0, valign: 'middle' },
      alternateRowStyles: options.zebra ? { fillColor: [248, 250, 252] } : {},
      columnStyles: {
        0: { halign: 'center', cellWidth: Math.max(7, options.fontSize * 1.3) },
        1: { cellWidth: partyColumnWidth },
        ...minColumnWidths,
      },
      didParseCell: (data) => {
        if (data.section !== 'body') return;
        const title = head[0][data.column.index];
        if (title === 'Dosya No' || (title === 'Dosya Durumu' && String(data.cell.raw).toLocaleLowerCase('tr-TR').includes('açık'))) {
          data.cell.styles.fontStyle = 'bold';
        }
        if (title === PARTY_COLUMN_TITLE) data.cell.styles.fontSize = Math.max(5, options.fontSize - 0.5);
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
