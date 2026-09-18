import { CRIME_ALIGNED_COLUMNS, FIXED_HEADERS, VALID_DOSYA_TURU } from '../constants';
import type { CaseRecord, CrimeAlignedKey, CrimeBlock, HeaderKey, MatchRecord, Party } from '../types';
import { blockCoveredBy, crimeEntries, type CrimeEntry } from './decision';
import { applyReplacements, lowerTr, normalizeDosyaNo, smartMerge } from './normalize';

type PartyInput = Pick<Party, 'id' | 'records'>;

const cleanRecord = (record: CaseRecord): Record<HeaderKey, string> => {
  const result = {} as Record<HeaderKey, string>;
  for (const header of FIXED_HEADERS) {
    result[header] = applyReplacements(header, record[header] ?? '');
  }
  return result;
};

const ALIGNED: readonly CrimeAlignedKey[] = CRIME_ALIGNED_COLUMNS;

type AlignedValues = Record<CrimeAlignedKey, string>;

const alignedValues = (record: Record<HeaderKey, string>): AlignedValues =>
  Object.fromEntries(ALIGNED.map((header) => [header, record[header]])) as AlignedValues;

/** Blokta bilgi var mı? Yalnız hizalama için tutulan boş satırlar ve boş liste öğeleri sayılmaz. */
const hasContent = (values: AlignedValues) => ALIGNED.some((header) => values[header].replace(/[\s,]/g, ''));

/** Kaynaklardan gelen tek bir suç/karar bloğu ve onu bildiren kişiler. */
interface SourceBlock {
  partyIds: string[];
  values: AlignedValues;
  entries: CrimeEntry[];
  /** Anlamsal kimlik: birebir aynı bloklar tek blokta toplanır. */
  signature: string;
  /** Dolu alan sayısı. Bir blok bir başkasını kapsıyorsa bu değeri ondan küçük olamaz. */
  info: number;
}

const infoScore = (entries: readonly CrimeEntry[]): number =>
  entries.reduce((sum, e) => sum + [e.crime, e.crimeDate, e.decision, e.decisionDate].filter((v) => v.trim()).length, 0);

const compareStrings = (a: string, b: string) => (a < b ? -1 : a > b ? 1 : 0);

const signatureOf = (entries: readonly CrimeEntry[]): string =>
  entries
    .map((e) => [e.crime.trim(), e.crimeDate, e.decision.trim(), e.decisionDate].join(''))
    .sort()
    .join('');

/** Hizalı sütunlardaki satır sayısı; bloklar uç uca eklenirken hizanın korunması için gerekir. */
const lineCount = (values: AlignedValues) => ALIGNED.reduce((max, header) => Math.max(max, values[header].split('\n').length), 1);

/**
 * Blokları uç uca ekleyerek dosya düzeyindeki hizalı sütun değerlerini kurar. Her blok kendi satır
 * sayısına tamamlanır: hiç değeri olmayan sütunda ayraçlar atıldığı için (bkz. rowsToRecords)
 * sütunların satır sayıları farklı olabilir, tamamlanmazsa suç ile karar hizası kayar.
 */
const joinBlocks = (blocks: readonly SourceBlock[]): AlignedValues => {
  if (blocks.length === 1) return blocks[0].values;
  const result = {} as AlignedValues;
  for (const header of ALIGNED) {
    result[header] = blocks
      .map((block) => {
        const lines = block.values[header].split('\n');
        while (lines.length < lineCount(block.values)) lines.push('');
        return lines.join('\n');
      })
      .join('\n');
  }
  return result;
};

/**
 * Aynı dosyanın farklı kaynaklardaki suç/karar bloklarını sadeleştirir: bir blok bir başkasının
 * eksik hâliyse atılır ve kişisi onu kapsayan bloğa bağlanır, değilse ayrı blok olarak korunur.
 * Bloklar önce bilgi miktarına (sonra anlamsal kimliğe) göre sıralandığı için sonuç kişi sırasından
 * bağımsızdır. Bilgisi olmayan bloklar kişi etiketi taşımaz; yalnız hepsi boşsa sonuçta kalır.
 */
const reduceBlocks = (blocks: readonly SourceBlock[]): SourceBlock[] => {
  const merged = new Map<string, SourceBlock>();
  for (const block of blocks) {
    const existing = merged.get(block.signature);
    if (existing) {
      for (const id of block.partyIds) if (!existing.partyIds.includes(id)) existing.partyIds.push(id);
    } else {
      merged.set(block.signature, { ...block, partyIds: [...block.partyIds] });
    }
  }

  const filled = [...merged.values()].filter((block) => block.entries.length > 0);
  if (filled.length === 0) {
    const empty = [...merged.values()].sort((a, b) => compareStrings(a.signature, b.signature))[0];
    return empty ? [{ ...empty, partyIds: [] }] : [];
  }

  // Kapsayan blok her zaman daha çok satır ve dolu alan taşır; bu sıra kapsananın önüne geçmesini
  // garanti eder, böylece tek geçişlik eleme yeterli olur ve sonuç kişi sırasından bağımsız kalır.
  filled.sort(
    (a, b) => b.entries.length - a.entries.length || b.info - a.info || compareStrings(a.signature, b.signature)
  );

  const kept: SourceBlock[] = [];
  for (const block of filled) {
    const cover = kept.find((candidate) => blockCoveredBy(block.entries, candidate.entries));
    if (cover) {
      for (const id of block.partyIds) if (!cover.partyIds.includes(id)) cover.partyIds.push(id);
    } else {
      kept.push(block);
    }
  }
  return kept;
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
  const sourceBlocks = new Map<string, SourceBlock[]>();

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
          crimeBlocks: [],
        };
        byKey.set(key, match);
        sourceBlocks.set(key, []);
      } else {
        for (const header of FIXED_HEADERS) {
          if (header === 'Birim Adı' || header === 'Dosya No' || header === 'Sıfatı') continue;
          if ((ALIGNED as readonly HeaderKey[]).includes(header)) continue;
          match[header] = smartMerge(match[header], record[header]);
        }
      }

      // Suç/karar sütunları satır satır hizalıdır; sütun sütun birleştirmek suç ile kararı ayırır.
      // Blok olarak toplanır, karşılaştırma bitince kapsananlar elenir (bkz. reduceBlocks).
      const values = alignedValues(record);
      if (hasContent(values) || sourceBlocks.get(key)!.length === 0) {
        const entries = crimeEntries(values);
        sourceBlocks.get(key)!.push({ partyIds: [party.id], values, entries, signature: signatureOf(entries), info: infoScore(entries) });
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
  const partyOrder = new Map(parties.map((p, index) => [p.id, index]));
  const results: MatchRecord[] = [];
  for (const match of byKey.values()) {
    if (match.partyCount < threshold) continue;

    const blocks = reduceBlocks(sourceBlocks.get(match._key) ?? []);
    for (const block of blocks) block.partyIds.sort((a, b) => (partyOrder.get(a) ?? 0) - (partyOrder.get(b) ?? 0));
    // Kapsama taraması bilgi miktarına göre yapılır; gösterimde bloklar kişi kartı sırasını izler.
    const firstParty = (block: SourceBlock) => Math.min(...block.partyIds.map((id) => partyOrder.get(id) ?? 0), Infinity);
    blocks.sort((a, b) => firstParty(a) - firstParty(b));
    match.crimeBlocks = blocks.map(({ partyIds, values }): CrimeBlock => ({ partyIds, values }));
    if (blocks.length > 0) Object.assign(match, joinBlocks(blocks));

    match['Sıfatı'] = Object.values(match.roles)
      .filter((role): role is string => !!role)
      .reduce(smartMerge, '');
    results.push(match);
  }
  return results.sort(compareMatches);
};
