import { describe, expect, it } from 'vitest';
import { compareParties } from '../compare';
import { attributedCrimeEntries, blockCoveredBy, crimeEntries } from '../decision';
import { FIXED_HEADERS } from '../../constants';
import type { CaseRecord, HeaderKey, MatchRecord, Party } from '../../types';

let n = 0;
const rec = (values: Partial<Record<HeaderKey, string>>): CaseRecord => ({
  ...(Object.fromEntries(FIXED_HEADERS.map((h) => [h, ''])) as Record<HeaderKey, string>),
  'Birim Adı': 'Ankara CBS',
  'Dosya Durumu': 'Kapalı',
  'Dosya Türü': 'Soruşturma Dosyası',
  'Dosya No': '2024/1',
  ...values,
  _id: `t${n++}`,
  _originalIndex: 0,
});

const party = (id: string, name: string): Pick<Party, 'id' | 'name'> => ({ id, name });

/** İki kişinin aynı dosyada farklı sıfat, suç ve karar taşıdığı tipik durum. */
const AYSE = { 'Sıfatı': 'Müşteki Şüpheli', 'Suçu': 'Hakaret', 'Karar Türü': 'Ek-Takipsizlik', 'Kesinleşme Tarihi': '2024-03-04 00:00:00.0' };
const BORA = { 'Sıfatı': 'Şüpheli', 'Suçu': 'Basit Yaralama', 'Karar Türü': 'Dava Açma', 'Kesinleşme Tarihi': '2024-03-04 09:38:42.0' };

const crimeText = (match: MatchRecord) => crimeEntries(match).map((e) => `${e.crime}|${e.decision}|${e.decisionDate}`);

describe('blockCoveredBy', () => {
  it('kararı boş olan girdiyi, aynı suça kararı olan girdi karşılar', () => {
    const az = crimeEntries({ 'Suçu': 'Hakaret', 'Suç Tarihi': '', 'Karar Türü': '', 'Kesinleşme Tarihi': '' });
    const cok = crimeEntries({ 'Suçu': 'Hakaret', 'Suç Tarihi': '', 'Karar Türü': 'Ek-Takipsizlik', 'Kesinleşme Tarihi': '01.08.2024' });
    expect(blockCoveredBy(az, cok)).toBe(true);
    expect(blockCoveredBy(cok, az)).toBe(false);
  });

  it('tekrar eden suçu ayrı olay sayar: iki Hakaret tek Hakaret ile karşılanmaz', () => {
    const iki = crimeEntries({ 'Suçu': 'Hakaret\nHakaret', 'Suç Tarihi': '', 'Karar Türü': '', 'Kesinleşme Tarihi': '' });
    const bir = crimeEntries({ 'Suçu': 'Hakaret', 'Suç Tarihi': '', 'Karar Türü': '', 'Kesinleşme Tarihi': '' });
    expect(blockCoveredBy(iki, bir)).toBe(false);
    expect(blockCoveredBy(bir, iki)).toBe(true);
  });

  it('farklı suçlar birbirini karşılamaz', () => {
    const a = crimeEntries({ 'Suçu': 'Hakaret', 'Suç Tarihi': '', 'Karar Türü': 'Ek-Takipsizlik', 'Kesinleşme Tarihi': '' });
    const b = crimeEntries({ 'Suçu': 'Basit Yaralama', 'Suç Tarihi': '', 'Karar Türü': 'Dava Açma', 'Kesinleşme Tarihi': '' });
    expect(blockCoveredBy(a, b)).toBe(false);
    expect(blockCoveredBy(b, a)).toBe(false);
  });

  it('aynı bilgiyi taşıyan açık ve kapalı dosya biçimlerini eşdeğer sayar', () => {
    const acik = crimeEntries({ 'Suçu': 'Tehdit\nHakaret', 'Suç Tarihi': '', 'Karar Türü': 'Takipsizlik\nTakipsizlik', 'Kesinleşme Tarihi': '' });
    const kapali = crimeEntries({ 'Suçu': 'Tehdit, Hakaret', 'Suç Tarihi': '', 'Karar Türü': 'Takipsizlik, Takipsizlik', 'Kesinleşme Tarihi': '' });
    expect(blockCoveredBy(acik, kapali)).toBe(true);
    expect(blockCoveredBy(kapali, acik)).toBe(true);
  });
});

describe('compareParties — kişiye özel suç/karar blokları', () => {
  it('kişi sırası suç ve kararı değiştirmez (aynı dosya, iki kişi)', () => {
    const a = { id: 'ayse', records: [rec(AYSE)] };
    const b = { id: 'bora', records: [rec(BORA)] };
    const ileri = compareParties([a, b], 2);
    const geri = compareParties([b, a], 2);

    expect(ileri).toHaveLength(1);
    expect(geri).toHaveLength(1);
    for (const column of ['Suçu', 'Karar Türü', 'Kesinleşme Tarihi'] as const) {
      expect(new Set(ileri[0][column].split('\n')), column).toEqual(new Set(geri[0][column].split('\n')));
    }
    expect(new Set(crimeText(ileri[0]))).toEqual(new Set(crimeText(geri[0])));
  });

  it('iki kişinin farklı suç bilgisini birlikte korur, hiçbirini atmaz', () => {
    const result = compareParties([{ id: 'ayse', records: [rec(AYSE)] }, { id: 'bora', records: [rec(BORA)] }], 2);
    expect(crimeText(result[0]).sort()).toEqual(['Basit Yaralama|Dava Açma|04.03.2024', 'Hakaret|Ek-Takipsizlik|04.03.2024']);
    expect(result[0].crimeBlocks).toHaveLength(2);
    expect(result[0].crimeBlocks.map((b) => b.partyIds).flat().sort()).toEqual(['ayse', 'bora']);
  });

  it('bir kişinin bilgisi diğerini kapsıyorsa tek blok kalır ve iki kişi de o bloğa bağlanır', () => {
    const result = compareParties(
      [
        { id: 'a', records: [rec({ 'Suçu': 'Hakaret', 'Karar Türü': 'Ek-Takipsizlik', 'Kesinleşme Tarihi': '01.08.2024' })] },
        { id: 'b', records: [rec({ 'Suçu': 'Hakaret' })] },
      ],
      2
    );
    expect(result[0].crimeBlocks).toHaveLength(1);
    expect(result[0].crimeBlocks[0].partyIds.slice().sort()).toEqual(['a', 'b']);
    expect(result[0]['Suçu']).toBe('Hakaret');
    expect(result[0]['Karar Türü']).toBe('Ek-Takipsizlik');
  });

  it('suç bilgisi olmayan kişiyi diğerinin suç satırlarına etiket olarak eklemez', () => {
    const result = compareParties(
      [
        { id: 'supheli', records: [rec({ 'Sıfatı': 'Şüpheli', 'Suçu': 'Hakaret', 'Karar Türü': 'Dava Açma' })] },
        { id: 'musteki', records: [rec({ 'Sıfatı': 'Müşteki' })] },
      ],
      2
    );
    expect(result[0].crimeBlocks).toHaveLength(1);
    expect(result[0].crimeBlocks[0].partyIds).toEqual(['supheli']);
  });

  it('aynı kişinin iki farklı tarihli çıktısında eksik olmayan bilgiyi korur', () => {
    // Aynı kişinin eski ve yeni tarihli iki UYAP çıktısındaki biçim farkı.
    const eski = rec({ 'Dosya No': '2023/7', 'Suçu': 'Tehdit\n6136 sayılı yasaya aykırılık', 'Karar Türü': 'Dava Açma\nEk-Takipsizlik' });
    const yeni = rec({ 'Dosya No': '2023/7', 'Suçu': 'Tehdit, Hakaret', 'Karar Türü': 'Dava Açma, Dava Açma' });
    const result = compareParties([{ id: 'ayse', records: [eski, yeni] }, { id: 'bora', records: [rec({ 'Dosya No': '2023/7' })] }], 2);
    const crimes = crimeEntries(result[0]).map((e) => e.crime);
    expect(crimes).toContain('6136 sayılı yasaya aykırılık');
    expect(crimes).toContain('Hakaret');
  });

  it('tek blok kaldığında hizalı sütunların ham değerini değiştirmez', () => {
    const block = { 'Suçu': 'Hakaret\nHakaret\nTehdit', 'Karar Türü': '\nEk-Takipsizlik\n', 'Kesinleşme Tarihi': '\n2024-08-01 00:00:00.0\n' };
    const result = compareParties(
      [
        { id: 'a', records: [rec({ 'Dosya No': '2024/4', ...block })] },
        { id: 'b', records: [rec({ 'Dosya No': '2024/4', 'Suçu': 'Hakaret\nHakaret\nTehdit' })] },
      ],
      2
    );
    expect(result[0]['Suçu']).toBe('Hakaret\nHakaret\nTehdit');
    expect(result[0]['Karar Türü']).toBe('\nEk-Takipsizlik\n');
  });

  it('iki blok birleşirken suç ile karar hizasını korur', () => {
    const a = rec({ 'Suçu': 'Hakaret\nTehdit', 'Karar Türü': '\nDava Açma' });
    const b = rec({ 'Suçu': 'Mala Zarar Verme', 'Karar Türü': 'Takipsizlik' });
    const result = compareParties([{ id: 'a', records: [a] }, { id: 'b', records: [b] }], 2);
    expect(crimeText(result[0])).toEqual(['Hakaret||', 'Tehdit|Dava Açma|', 'Mala Zarar Verme|Takipsizlik|']);
  });
});

describe('attributedCrimeEntries', () => {
  const parties = [party('ayse', 'Ayşe'), party('bora', 'Bora')];

  it('kişiler farklı bilgi taşıdığında her satıra kişi adını ekler', () => {
    const [match] = compareParties([{ id: 'ayse', records: [rec(AYSE)] }, { id: 'bora', records: [rec(BORA)] }], 2);
    const rows = attributedCrimeEntries(match, parties);
    expect(rows.map((r) => [r.crime, r.partyNames])).toEqual([
      ['Hakaret', ['Ayşe']],
      ['Basit Yaralama', ['Bora']],
    ]);
  });

  it('tek blok kaldığında kişi adı etiketi üretmez', () => {
    const [match] = compareParties([{ id: 'ayse', records: [rec(AYSE)] }, { id: 'bora', records: [rec({ ...AYSE, 'Sıfatı': 'Şüpheli' })] }], 2);
    const rows = attributedCrimeEntries(match, parties);
    expect(rows).toHaveLength(1);
    expect(rows[0].partyNames).toEqual([]);
  });

  it('crimeEntries ile aynı sayıda ve aynı sırada satır üretir', () => {
    const [match] = compareParties([{ id: 'ayse', records: [rec(AYSE)] }, { id: 'bora', records: [rec(BORA)] }], 2);
    expect(attributedCrimeEntries(match, parties).map((r) => r.crime)).toEqual(crimeEntries(match).map((e) => e.crime));
  });
});
