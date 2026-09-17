import { PARTY_COLORS } from '../constants';
import type { CaseRecord, Party } from '../types';

let partyCounter = 0;

/** Yeni boş kişi oluşturur. `index` 0 tabanlıdır ve varsayılan adı/rengi belirler. */
export const createParty = (index: number): Party => ({
  id: `p${Date.now().toString(36)}${(partyCounter++).toString(36)}`,
  name: `${index + 1}. Kişi`,
  nameEdited: false,
  text: '',
  textRecords: [],
  fileRecords: [],
  fileNames: [],
  records: [],
  colorIndex: index % PARTY_COLORS.length,
});

/** Metin veya dosya kayıtları değiştiğinde birleşik `records` listesini yeniden kurar. */
export const withRecords = (
  party: Party,
  changes: Partial<Pick<Party, 'text' | 'textRecords' | 'fileRecords' | 'fileNames'>>
): Party => {
  const next = { ...party, ...changes };
  const records: CaseRecord[] =
    next.fileRecords.length === 0 ? next.textRecords : [...next.textRecords, ...next.fileRecords];
  return { ...next, records };
};

export const partyColor = (party: Pick<Party, 'colorIndex'>) => PARTY_COLORS[party.colorIndex % PARTY_COLORS.length];

/** Her kelimenin ilk harfini Türkçe kurallarla büyütür; kalan harflere dokunmaz. */
export const capitalizeName = (value: string): string =>
  value.replace(/(^|\s)(\S)/gu, (_, space: string, letter: string) => space + letter.toLocaleUpperCase('tr-TR'));

/** Excel dosya adından kişi adı üretir: uzantı atılır, alt çizgiler boşluğa çevrilir. */
export const nameFromFileName = (fileName: string): string =>
  capitalizeName(
    fileName
      .replace(/\.(xlsx|xls)$/i, '')
      .replace(/_+/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
  );
