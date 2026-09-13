import { describe, expect, it } from 'vitest';
import { compareParties } from '../compare';
import { FIXED_HEADERS } from '../../constants';
import type { CaseRecord, HeaderKey } from '../../types';

let n = 0;
const rec = (values: Partial<Record<HeaderKey, string>>): CaseRecord => ({
  ...(Object.fromEntries(FIXED_HEADERS.map((h) => [h, ''])) as Record<HeaderKey, string>),
  'Birim Adı': 'Ankara CBS',
  'Dosya Durumu': 'Açık',
  'Dosya Türü': 'Soruşturma Dosyası',
  ...values,
  _id: `t${n++}`,
  _originalIndex: 0,
});

describe('compareParties', () => {
  it('iki kişide ortak dosyayı iki sıfatla birlikte döndürür', () => {
    const result = compareParties(
      [
        { id: 'a', records: [rec({ 'Dosya No': '2024/1', 'Sıfatı': 'Şüpheli', 'Suçu': 'Tehdit' }), rec({ 'Dosya No': '2024/2' })] },
        { id: 'b', records: [rec({ 'Dosya No': '2024/1', 'Sıfatı': 'Müşteki', 'Suçu': 'Silahla Tehdit' })] },
      ],
      2
    );
    expect(result).toHaveLength(1);
    expect(result[0].roles).toEqual({ a: 'Şüpheli', b: 'Müşteki' });
    expect(result[0].partyCount).toBe(2);
    expect(result[0]['Suçu']).toBe('Silahla Tehdit');
  });

  it('3 kişide minCount=2 iken ikili ortakları listeler, dosyada olmayan kişi null olur', () => {
    const parties = [
      { id: 'a', records: [rec({ 'Dosya No': '2024/1', 'Sıfatı': 'Şüpheli' }), rec({ 'Dosya No': '2024/9', 'Sıfatı': 'Şüpheli' })] },
      { id: 'b', records: [rec({ 'Dosya No': '2024/1', 'Sıfatı': 'Mağdur' }), rec({ 'Dosya No': '2024/9', 'Sıfatı': 'Tanık' })] },
      { id: 'c', records: [rec({ 'Dosya No': '2024/9', 'Sıfatı': 'Müşteki' })] },
    ];
    const two = compareParties(parties, 2);
    expect(two.map((r) => r['Dosya No']).sort()).toEqual(['2024/1', '2024/9']);
    expect(two.find((r) => r['Dosya No'] === '2024/1')!.roles.c).toBeNull();

    const three = compareParties(parties, 3);
    expect(three).toHaveLength(1);
    expect(three[0]['Dosya No']).toBe('2024/9');
    expect(three[0].partyCount).toBe(3);
  });

  it('dosya numarası ve birim adı yazım farklarını eşler', () => {
    const result = compareParties(
      [
        { id: 'a', records: [rec({ 'Birim Adı': 'Ankara Cumhuriyet Başsavcılığı', 'Dosya No': '2024/05' })] },
        { id: 'b', records: [rec({ 'Birim Adı': 'ankara cbs', 'Dosya No': '2024/5' })] },
      ],
      2
    );
    expect(result).toHaveLength(1);
  });

  it('aynı kişide aynı dosyanın birden fazla satırı tek kişi sayılır', () => {
    const result = compareParties(
      [
        { id: 'a', records: [rec({ 'Dosya No': '2024/1', 'Suçu': 'Tehdit' }), rec({ 'Dosya No': '2024/1', 'Suçu': 'Yağma' })] },
        { id: 'b', records: [rec({ 'Dosya No': '2024/2' })] },
      ],
      2
    );
    expect(result).toHaveLength(0);
  });

  it('geçersiz dosya türlerini dışarıda bırakır', () => {
    const result = compareParties(
      [
        { id: 'a', records: [rec({ 'Dosya No': '2024/1', 'Dosya Türü': 'Talimat Dosyası' })] },
        { id: 'b', records: [rec({ 'Dosya No': '2024/1', 'Dosya Türü': 'Talimat Dosyası' })] },
      ],
      2
    );
    expect(result).toHaveLength(0);
  });

  it('açık dosyaları önce, sonra birim, yıl ve numaraya göre sıralar', () => {
    const records = [
      rec({ 'Dosya No': '2023/10', 'Dosya Durumu': 'Kapalı' }),
      rec({ 'Dosya No': '2024/10' }),
      rec({ 'Dosya No': '2024/9' }),
      rec({ 'Dosya No': '2023/500' }),
    ];
    const result = compareParties(
      [
        { id: 'a', records },
        { id: 'b', records: records.map((r) => ({ ...r })) },
      ],
      2
    );
    expect(result.map((r) => r['Dosya No'])).toEqual(['2023/500', '2024/9', '2024/10', '2023/10']);
  });
});
