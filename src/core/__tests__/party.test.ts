import { describe, expect, it } from 'vitest';
import { capitalizeName, nameFromFileName } from '../party';

describe('capitalizeName', () => {
  it('her kelimenin ilk harfini Türkçe kurala göre büyütür', () => {
    expect(capitalizeName('ali işler')).toBe('Ali İşler');
    expect(capitalizeName('ırmak ÇELİK')).toBe('Irmak ÇELİK');
    expect(capitalizeName('')).toBe('');
  });

  it('yazarken sondaki boşluğu korur', () => {
    expect(capitalizeName('ahmet ')).toBe('Ahmet ');
  });
});

describe('nameFromFileName', () => {
  it('uzantıyı atar ve adı büyük harfle başlatır', () => {
    expect(nameFromFileName('mehmet_yılmaz.xlsx')).toBe('Mehmet Yılmaz');
    expect(nameFromFileName('ŞÜPHELİ Listesi.XLS')).toBe('ŞÜPHELİ Listesi');
  });
});
