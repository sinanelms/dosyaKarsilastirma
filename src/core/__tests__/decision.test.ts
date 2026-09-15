import { describe, expect, it } from 'vitest';
import { crimeEntries, exportValue, formatUyapDate, parseAciklama, splitCrimes, uniqueLines } from '../decision';
import { cleanCell } from '../normalize';

const fields = (values: Partial<Record<'Suçu' | 'Suç Tarihi' | 'Karar Türü' | 'Kesinleşme Tarihi', string>>) => ({
  'Suçu': '',
  'Suç Tarihi': '',
  'Karar Türü': '',
  'Kesinleşme Tarihi': '',
  ...values,
});

describe('formatUyapDate', () => {
  it('UYAP ISO zaman damgasını gün.ay.yıl yapar', () => {
    expect(formatUyapDate('2023-07-31 14:03:59.0')).toBe('31.07.2023');
  });

  it('noktalı Türkçe tarihi saatsiz döndürür', () => {
    expect(formatUyapDate('05.02.2018 10:49:43')).toBe('05.02.2018');
    expect(formatUyapDate('05.02.2018')).toBe('05.02.2018');
  });

  it('tanınmayan değeri değiştirmez', () => {
    expect(formatUyapDate('bilinmiyor')).toBe('bilinmiyor');
  });
});

describe('splitCrimes', () => {
  it('virgüllü listeyi karar sayısı kadar suça böler', () => {
    expect(splitCrimes('Tehdit, Basit Yaralama', 2)).toEqual(['Tehdit', 'Basit Yaralama']);
  });

  it('adında virgül geçen bilinen suçu bölmez', () => {
    expect(
      splitCrimes('Tehdit, Kişisel Verileri, Hukuka Aykırı Olarak Ele Geçirmek veya Yaymak, Hakaret', 3)
    ).toEqual(['Tehdit', 'Kişisel Verileri, Hukuka Aykırı Olarak Ele Geçirmek veya Yaymak', 'Hakaret']);
    expect(splitCrimes('Kullanmak İçin Uyuşturucu veya Uyarıcı Madde Satın Almak, Kabul Etmek, Bulundurmak ve Kullanmak', 1)).toEqual([
      'Kullanmak İçin Uyuşturucu veya Uyarıcı Madde Satın Almak, Kabul Etmek, Bulundurmak ve Kullanmak',
    ]);
  });

  it('bilinmeyen adda küçük harfle başlayan parçayı öncekine ekler', () => {
    expect(splitCrimes('Yeni Suç Adı, alt bendi ile, Hakaret', 2)).toEqual(['Yeni Suç Adı, alt bendi ile', 'Hakaret']);
  });

  it('bölünemezse null döner', () => {
    expect(splitCrimes('A, B, C', 2)).toBeNull();
  });
});

describe('crimeEntries', () => {
  it('açık dosyada her suçu kendi satırındaki kararla eşler (aaysegul.xlsx 2024/17284)', () => {
    const entries = crimeEntries(
      fields({
        'Suçu': 'Hakaret\nHakaret\nTehdit\nBasit Yaralama',
        'Karar Türü': '\nEk-Takipsizlik\n\n',
        'Kesinleşme Tarihi': '\n2024-08-01 00:00:00.0\n\n',
      })
    );
    expect(entries.map((e) => [e.crime, e.decision, e.decisionDate])).toEqual([
      ['Hakaret', '', ''],
      ['Hakaret', 'Ek-Takipsizlik', '01.08.2024'],
      ['Tehdit', '', ''],
      ['Basit Yaralama', '', ''],
    ]);
  });

  it('kapalı dosyanın paralel listelerini suç bazında eşler', () => {
    const entries = crimeEntries(
      fields({
        'Suçu': 'Tehdit, Basit Yaralama',
        'Karar Türü': 'Ek-Takipsizlik, Dava Açma',
        'Kesinleşme Tarihi': '2022-09-14 00:00:00.0, 2022-09-14 16:31:28.0',
      })
    );
    expect(entries).toEqual([
      { crime: 'Tehdit', crimeDate: '', decision: 'Ek-Takipsizlik', decisionDate: '14.09.2022', aligned: true },
      { crime: 'Basit Yaralama', crimeDate: '', decision: 'Dava Açma', decisionDate: '14.09.2022', aligned: true },
    ]);
  });

  it('kararı olmayan kapalı dosya listesini ("[, ]") suçlara böler', () => {
    const entries = crimeEntries(fields({ 'Suçu': 'Hakaret, Mala Zarar Verme', 'Karar Türü': ', ', 'Kesinleşme Tarihi': ', ' }));
    expect(entries.map((e) => [e.crime, e.decision])).toEqual([
      ['Hakaret', ''],
      ['Mala Zarar Verme', ''],
    ]);
  });

  it('kararsız çok suçlu kapalı dosyayı Excel hücresinden suçlara böler (ertugrul.xlsx 2023/2-1782)', () => {
    const entries = crimeEntries(
      fields({
        'Suçu': cleanCell('[Hakaret, Tehdit, Basit Yaralama]'),
        'Karar Türü': cleanCell('[, , ]'),
        'Kesinleşme Tarihi': cleanCell('[, , ]'),
      })
    );
    expect(entries.map((e) => [e.crime, e.decision, e.decisionDate])).toEqual([
      ['Hakaret', '', ''],
      ['Tehdit', '', ''],
      ['Basit Yaralama', '', ''],
    ]);
  });

  it('eşleştirilemeyen listeyi uydurmadan, eşleşmemiş olarak döndürür', () => {
    const entries = crimeEntries(fields({ 'Suçu': 'A, B, C', 'Karar Türü': 'Dava Açma, Takipsizlik' }));
    expect(entries.map((e) => [e.crime, e.decision, e.aligned])).toEqual([
      ['A, B, C', 'Dava Açma', false],
      ['', 'Takipsizlik', false],
    ]);
  });

  it('suç tarihini satırına taşır', () => {
    expect(crimeEntries(fields({ 'Suçu': 'Hırsızlık', 'Suç Tarihi': '2020-01-02 00:00:00.0' }))[0].crimeDate).toBe('02.01.2020');
  });

  it('boş kayıtta satır üretmez', () => {
    expect(crimeEntries(fields({}))).toEqual([]);
  });
});

describe('exportValue', () => {
  it('tarih sütunlarında saati atar, listeyi ve satırları korur', () => {
    expect(exportValue('Kesinleşme Tarihi', '2022-09-14 00:00:00.0, 2022-09-14 16:31:28.0')).toBe('14.09.2022, 14.09.2022');
    expect(exportValue('Kesinleşme Tarihi', '\n05.02.2018 10:49:43\n')).toBe('05.02.2018');
  });

  it('boş liste öğelerini çıktıya yazmaz', () => {
    expect(exportValue('Karar Türü', ', , ')).toBe('');
    expect(exportValue('Karar Türü', ', Dava Açma')).toBe('Dava Açma');
    expect(exportValue('Kesinleşme Tarihi', ', 2023-04-05 16:00:01.0')).toBe('05.04.2023');
  });

  it('diğer sütunlarda yalnız boş satırları atar', () => {
    expect(exportValue('Karar Türü', '\nEk-Takipsizlik\n\n')).toBe('Ek-Takipsizlik');
    expect(exportValue('Suçu', 'Hakaret\nHakaret')).toBe('Hakaret\nHakaret');
  });
});

describe('uniqueLines', () => {
  it('tekrar eden ve boş satırları eler', () => {
    expect(uniqueLines('Tehdit\n\nTehdit\nSilahla Tehdit')).toEqual(['Tehdit', 'Silahla Tehdit']);
  });
});

describe('parseAciklama', () => {
  it('mahkeme, esas no ve durumu ayırır', () => {
    expect(parseAciklama('Mersin 14. Asliye Ceza Mahkemesi(2023/661),Açık')).toEqual([
      { court: 'Mersin 14. Asliye Ceza Mahkemesi', caseNo: '2023/661', status: 'Açık' },
    ]);
  });

  it('parantezli birim adlarını bozmaz', () => {
    expect(parseAciklama('Kahramanmaraş(Kapatılan) 1. Sulh Ceza Mahkemesi(2011/894),Yargıtaydan Döndü')).toEqual([
      { court: 'Kahramanmaraş(Kapatılan) 1. Sulh Ceza Mahkemesi', caseNo: '2011/894', status: 'Yargıtaydan Döndü' },
    ]);
  });

  it('kalıba uymayan açıklamayı düz metin bırakır', () => {
    expect(parseAciklama('İdn.Kbl.Trh:12/03/2020, Krr. Trh.15/04/2020')).toEqual([
      { court: 'İdn.Kbl.Trh:12/03/2020, Krr. Trh.15/04/2020' },
    ]);
  });
});
