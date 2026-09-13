import { REPLACEMENTS } from '../constants';

/** Türkçe kurallarla küçük harfe çevirir (İ → i, I → ı). */
export const lowerTr = (value: string): string => value.toLocaleLowerCase('tr-TR');

/** Hücre değerini temizler: boşluk, "nan" ve kapalı dosyalardaki [Suç Adı] köşeli parantezleri. */
export const cleanCell = (value: unknown): string => {
  if (value === null || value === undefined) return '';
  let text = String(value).trim();
  if (lowerTr(text) === 'nan') return '';
  if (text.startsWith('[') && text.endsWith(']')) {
    text = text.slice(1, -1).trim();
  }
  return text;
};

/**
 * Dosya numarasını eşleştirme anahtarı için normalize eder.
 * @example normalizeDosyaNo(' 2024 / 05 ') === '2024/5'
 */
export const normalizeDosyaNo = (value: string): string =>
  lowerTr(value.replace(/\s+/g, '')).replace(/(^|\/)0+(\d)/g, '$1$2');

/** Birim adı ve dosya türündeki yazım farklarını tüm eşleşmelerde standartlaştırır. */
export const applyReplacements = (column: string, value: string): string => {
  const rules = REPLACEMENTS[column];
  if (!rules || !value) return value;
  let result = value;
  for (const [from, to] of Object.entries(rules)) {
    result = result.split(from).join(to);
  }
  return result;
};

const isBlank = (value: string) => !value || value === '-' || lowerTr(value) === 'nan';

/**
 * Aynı dosyanın farklı kişilerdeki iki değerini birleştirir.
 * - Boş değerleri eler.
 * - Biri diğerini kapsıyorsa kapsayanı alır.
 * - Farklıysa alt alta (\n) ekler.
 */
export const smartMerge = (current: string, incoming: string): string => {
  const a = (current ?? '').trim();
  const b = (incoming ?? '').trim();
  if (isBlank(a)) return isBlank(b) ? '' : b;
  if (isBlank(b)) return a;

  const lowerB = lowerTr(b);
  const parts = a.split('\n');
  if (parts.some((part) => lowerTr(part).includes(lowerB))) return a;
  if (parts.length === 1 && lowerB.includes(lowerTr(a))) return b;
  return `${a}\n${b}`;
};
