import { CRIME_ALIGNED_COLUMNS, FIXED_HEADERS, VALID_DOSYA_TURU } from '../constants';
import type { CaseRecord, HeaderKey, MatchRecord, Party } from '../types';
import { applyReplacements, lowerTr, normalizeDosyaNo, smartMerge } from './normalize';

type PartyInput = Pick<Party, 'id' | 'records'>;

const cleanRecord = (record: CaseRecord): Record<HeaderKey, string> => {
  const result = {} as Record<HeaderKey, string>;
  for (const header of FIXED_HEADERS) {
    result[header] = applyReplacements(header, record[header] ?? '');
  }
  return result;
};

const ALIGNED: readonly HeaderKey[] = CRIME_ALIGNED_COLUMNS;

/** Suç/karar bloğunun bilgi miktarı: önce dolu karar öğesi sayısı, sonra toplam metin uzunluğu. */
const crimeBlockScore = (record: Record<HeaderKey, string>): number => {
  const decisions = `${record['Karar Türü']},${record['Kesinleşme Tarihi']}`.split(/[,\n]/).filter((t) => t.trim()).length;
  const length = ALIGNED.reduce((sum, header) => sum + record[header].replace(/[\s,]/g, '').length, 0);
  return decisions * 1_000_000 + length;
};

const isValidType =(record: Record<HeaderKey, string>) =>
  !record['Dosya Türü'] || VALID_DOSYA_TURU.includes(record['Dosya Türü']);

/** Dosyanın kişiler arası eşleştirme anahtarı: birim | dosya no | dosya türü. */
export const matchKey = (record: Record<HeaderKey, string>): string =>
  [lowerTr(record['Birim Adı'].trim()), normalizeDosyaNo(record['Dosya No']), lowerTr(record['Dosya Türü'].trim())].join('|');

const parseDosyaNo = (value: string) => {
  const [year = '', no = ''] = value.split('/');
  return { year: parseInt(year, 10) || 0, no: parseInt(no.replace(/\D/g, ''), 10) || 0 };
};

const isOpen = (record: MatchRecord) => lowerTr(record['Dosya Durumu']).includes('açık');

const compareMatches = (a: MatchRecord, b: MatchRecord): number => {
  const openA = isOpen(a);
  const openB = isOpen(b);
  if (openA !== openB) return openA ? -1 : 1;

  const unit = a['Birim Adı'].localeCompare(b['Birim Adı'], 'tr');
  if (unit !== 0) return unit;

  const na = parseDosyaNo(a['Dosya No']);
  const nb = parseDosyaNo(b['Dosya No']);
  return na.year - nb.year || na.no - nb.no;
};

/**
 * Kişilerin kayıtlarını dosya bazında birleştirir ve en az `minCount` kişide geçen dosyaları döndürür.
 * Karmaşıklık: O(toplam kayıt) — Map tabanlı.
 */
export const compareParties = (parties: readonly PartyInput[], minCount: number): MatchRecord[] => {
  const byKey = new Map<string, MatchRecord>();

  for (const party of parties) {
    for (const raw of party.records) {
      const record = cleanRecord(raw);
      if (!isValidType(record)) continue;

      const key = matchKey(record);
      let match = byKey.get(key);
      if (!match) {
        match = {
          ...record,
          _key: key,
          roles: Object.fromEntries(parties.map((p) => [p.id, null])),
          partyCount: 0,
        };
        byKey.set(key, match);
      } else {
        for (const header of FIXED_HEADERS) {
          if (header === 'Birim Adı' || header === 'Dosya No' || header === 'Sıfatı' || ALIGNED.includes(header)) continue;
          match[header] = smartMerge(match[header], record[header]);
        }
        // Suç/karar sütunları satır satır hizalıdır; tek tek birleştirmek hizayı bozar. Aynı dosyanın
        // farklı kişilerde (farklı tarihte alınmış) çıktılarından daha çok karar bilgisi olanı alınır.
        if (crimeBlockScore(record) > crimeBlockScore(match)) {
          for (const header of ALIGNED) match[header] = record[header];
        }
      }

      const previousRole = match.roles[party.id];
      if (previousRole === null) {
        match.partyCount += 1;
        match.roles[party.id] = record['Sıfatı'];
      } else {
        match.roles[party.id] = smartMerge(previousRole, record['Sıfatı']);
      }
    }
  }

  const threshold = Math.max(2, Math.min(minCount, parties.length));
  const results: MatchRecord[] = [];
  for (const match of byKey.values()) {
    if (match.partyCount >= threshold) {
      match['Sıfatı'] = Object.values(match.roles)
        .filter((role): role is string => !!role)
        .reduce(smartMerge, '');
      results.push(match);
    }
  }
  return results.sort(compareMatches);
};
