import type { jsPDF } from 'jspdf';
import type { PartyRole } from '../core/pdfLayout';
import { roleTone, statusTone, type Tone } from '../core/tone';

/*
 * Taraf & Sıfat ve Dosya Durumu hücrelerindeki renkli, çerçeveli etiketler. Aynı yerleşim hem hücre
 * yüksekliğini ayırmak (didParseCell → minCellHeight) hem çizmek (didDrawCell) için kullanılır.
 * Siyah-beyaz çıktıda da ayırt edilsin diye renk tek başına anlam taşımaz: etiketin çerçevesi vardır,
 * şüpheli/sanık ve müşteki/mağdur kalın yazılır, dosyada olmayan kişi kesik çerçeveli ve soluktur.
 */

type Rgb = [number, number, number];

const TONE_COLORS: Record<Tone, { fill: Rgb; border: Rgb; text: Rgb }> = {
  danger: { fill: [254, 226, 226], border: [220, 38, 38], text: [153, 27, 27] },
  info: { fill: [224, 242, 254], border: [2, 132, 199], text: [7, 89, 133] },
  warning: { fill: [254, 243, 199], border: [217, 119, 6], text: [146, 64, 14] },
  success: { fill: [220, 252, 231], border: [22, 163, 74], text: [22, 101, 52] },
  neutral: { fill: [241, 245, 249], border: [148, 163, 184], text: [51, 65, 85] },
};

const ABSENT_COLORS = { fill: [255, 255, 255] as Rgb, border: [148, 163, 184] as Rgb, text: [100, 116, 139] as Rgb };
const NAME_COLOR: Rgb = [15, 23, 42];
const ABSENT_NAME_COLOR: Rgb = [120, 130, 145];
const RULE_COLOR: Rgb = [203, 213, 225];

const PT_TO_MM = 25.4 / 72;
const LINE_HEIGHT_FACTOR = 1.15;

export interface BadgeFont {
  family: string;
  /** Tablonun yazı boyutu (pt). */
  size: number;
}

interface Badge {
  lines: string[];
  width: number;
  height: number;
  size: number;
  padX: number;
  padY: number;
  tone: Tone;
  bold: boolean;
  absent: boolean;
}

type LayoutItem =
  | { type: 'name'; lines: string[]; y: number; size: number; absent: boolean }
  | { type: 'badge'; badge: Badge; y: number }
  | { type: 'rule'; y: number };

export interface CellLayout {
  items: LayoutItem[];
  /** İçerik yüksekliği (mm, hücre iç boşluğu hariç). */
  height: number;
}

const layoutBadge = (doc: jsPDF, text: string, maxWidth: number, font: BadgeFont, tone: Tone, absent = false): Badge => {
  const size = Math.max(5, font.size - 1);
  const padX = size * PT_TO_MM * 0.55;
  const padY = size * PT_TO_MM * 0.2;
  const bold = !absent && tone !== 'neutral' && tone !== 'warning';
  doc.setFont(font.family, bold ? 'bold' : 'normal');
  doc.setFontSize(size);
  const lines = doc.splitTextToSize(text, Math.max(1, maxWidth - 2 * padX)) as string[];
  const textWidth = Math.max(0, ...lines.map((line) => doc.getTextWidth(line)));
  return {
    lines,
    width: Math.min(maxWidth, textWidth + 2 * padX),
    height: lines.length * size * PT_TO_MM * LINE_HEIGHT_FACTOR + 2 * padY,
    size,
    padX,
    padY,
    tone,
    bold,
    absent,
  };
};

const gapOf = (font: BadgeFont) => font.size * PT_TO_MM * 0.3;

/** Her kişi için ad ve altında sıfat etiketi; kişiler arasında ince çizgi. */
export const layoutPartyCell = (doc: jsPDF, roles: readonly PartyRole[], width: number, font: BadgeFont): CellLayout => {
  const items: LayoutItem[] = [];
  const gap = gapOf(font);
  const nameSize = Math.max(5, font.size - 0.5);
  let y = 0;

  roles.forEach(({ name, role }, index) => {
    if (index > 0) {
      y += gap * 1.5;
      items.push({ type: 'rule', y });
      y += gap * 1.5;
    }
    const absent = role === null;
    doc.setFont(font.family, 'bold');
    doc.setFontSize(nameSize);
    const nameLines = doc.splitTextToSize(name, width) as string[];
    items.push({ type: 'name', lines: nameLines, y, size: nameSize, absent });
    y += nameLines.length * nameSize * PT_TO_MM * LINE_HEIGHT_FACTOR + gap * 0.5;

    const labels = absent ? ['Bu dosyada yok'] : role.split('\n').map((line) => line.trim()).filter(Boolean);
    (labels.length > 0 ? labels : ['Belirtilmemiş']).forEach((label, labelIndex) => {
      if (labelIndex > 0) y += gap * 0.5;
      const badge = layoutBadge(doc, label, width, font, absent || labels.length === 0 ? 'neutral' : roleTone(label), absent);
      items.push({ type: 'badge', badge, y });
      y += badge.height;
    });
  });
  return { items, height: y };
};

/** Dosya durumu (alt alta birden çok durum olabilir) etiketleri. */
export const layoutStatusCell = (doc: jsPDF, text: string, width: number, font: BadgeFont): CellLayout => {
  const items: LayoutItem[] = [];
  const gap = gapOf(font);
  let y = 0;
  text
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .forEach((label, index) => {
      if (index > 0) y += gap * 0.5;
      const badge = layoutBadge(doc, label, width, font, statusTone(label));
      items.push({ type: 'badge', badge, y });
      y += badge.height;
    });
  return { items, height: y };
};

const drawBadge = (doc: jsPDF, badge: Badge, x: number, y: number, family: string) => {
  const colors = badge.absent ? ABSENT_COLORS : TONE_COLORS[badge.tone];
  const radius = Math.min(badge.height / 2, 1.2);
  doc.setFillColor(...colors.fill);
  doc.setDrawColor(...colors.border);
  doc.setLineWidth(0.2);
  if (badge.absent) doc.setLineDashPattern([0.8, 0.6], 0);
  doc.roundedRect(x, y, badge.width, badge.height, radius, radius, 'FD');
  if (badge.absent) doc.setLineDashPattern([], 0);
  doc.setFont(family, badge.bold ? 'bold' : 'normal');
  doc.setFontSize(badge.size);
  doc.setTextColor(...colors.text);
  doc.text(badge.lines, x + badge.padX, y + badge.padY, { baseline: 'top', lineHeightFactor: LINE_HEIGHT_FACTOR });
};

/** Yerleşimi (x, y) sol üst köşesinden başlayarak çizer; `center` etiketleri genişlik içinde yatay ortalar. */
export const drawCellLayout = (
  doc: jsPDF,
  layout: CellLayout,
  x: number,
  y: number,
  width: number,
  font: BadgeFont,
  align: 'left' | 'center' = 'left'
) => {
  for (const item of layout.items) {
    if (item.type === 'rule') {
      doc.setDrawColor(...RULE_COLOR);
      doc.setLineWidth(0.15);
      doc.line(x, y + item.y, x + width, y + item.y);
    } else if (item.type === 'name') {
      doc.setFont(font.family, 'bold');
      doc.setFontSize(item.size);
      doc.setTextColor(...(item.absent ? ABSENT_NAME_COLOR : NAME_COLOR));
      doc.text(item.lines, x, y + item.y, { baseline: 'top', lineHeightFactor: LINE_HEIGHT_FACTOR });
    } else {
      const offsetX = align === 'center' ? Math.max(0, (width - item.badge.width) / 2) : 0;
      drawBadge(doc, item.badge, x + offsetX, y + item.y, font.family);
    }
  }
};
