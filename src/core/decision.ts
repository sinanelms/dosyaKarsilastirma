/*
 * UYAP "Kişi Dosya" Excel çıktısındaki suç/karar sütunlarını suç bazında satırlara ayrıştırır.
 *
 * İki biçim vardır:
 * 1. Açık dosyalar: bir dosyanın her suçu ayrı Excel satırındadır; Dosya No, Birim Adı vb. hücreler
 *    birleştirilmiştir. O suça verilmiş karar (varsa) aynı satırdadır. rowsToRecords bu satırları
 *    alt alta (\n) ekler; i. satırlar birbirine karşılık gelir.
 *      Suçu "Hakaret\nHakaret\nTehdit"   Karar Türü "\nEk-Takipsizlik\n"
 * 2. Kapalı dosyalar: tek satırda köşeli parantezli, virgülle ayrılmış PARALEL listeler (cleanCell
 *    parantezleri atar). Suçu[i] ↔ Karar Türü[i] ↔ Kesinleşme Tarihi[i].
 *      Suçu "Tehdit, Basit Yaralama"   Karar Türü "Ek-Takipsizlik, Dava Açma"
 * Karar adlarında ve tarihlerde virgül geçmez; bazı suç adlarında geçer ("Kişisel Verileri, Hukuka
 * Aykırı Olarak Ele Geçirmek veya Yaymak"), bu yüzden suç listesi karar sayısına göre bölünür.
 */

import type { HeaderKey } from '../types';
import { compactLines } from './normalize';

const splitLines = (value: string): string[] => (value ? value.split('\n') : []);

/** Karar Türü / tarih gibi virgül içermeyen paralel listeleri öğelerine ayırır (boşlar korunur). */
const splitList = (line: string): string[] => (line.trim() ? line.split(',').map((token) => token.trim()) : []);

const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})(?:[ T](\d{2}):(\d{2})(?::\d{2}(?:\.\d+)?)?)?$/;
const TR_DATE = /^(\d{2})\.(\d{2})\.(\d{4})(?:\s+(\d{2}):(\d{2})(?::\d{2})?)?$/;

/** "2023-07-31 14:03:59.0" veya "31.07.2023 14:03:59" → "31.07.2023"; tanınmayan değer aynen döner. */
export const formatUyapDate = (value: string): string => {
  const text = value.trim();
  const iso = ISO_DATE.exec(text);
  if (iso) return `${iso[3]}.${iso[2]}.${iso[1]}`;
  const tr = TR_DATE.exec(text);
  if (tr) return `${tr[1]}.${tr[2]}.${tr[3]}`;
  return text;
};

/**
 * Adında ", " geçen, UYAP çıktılarında görülen suç adları. Kapalı dosyaların suç listesi bu adlar
 * bölünmeden ayrıştırılır. Yeni bir ad eşleşmezse satır "eşleştirilemedi" olarak gösterilir.
 */
export const CRIME_NAMES_WITH_COMMA = [
  'Kullanmak İçin Uyuşturucu veya Uyarıcı Madde Satın Almak, Kabul Etmek, Bulundurmak ve Kullanmak',
  'Kişisel Verileri, Hukuka Aykırı Olarak Ele Geçirmek veya Yaymak',
  'Korku, Kaygı veya Panik Yaratabilecek Tarzda Silahla Ateş Etme',
  'Kişinin, kendisini kamu görevlisi veya banka,sigorta,kredi kurumlarının çalışanı olarak tanıtması veya bu kurumlarla ilişkili olduğunu söylemesi suretiyle dolandırıcılık',
  'Birinci ila dördüncü fıkralarda tanımlanan fiillerin işlenmesine iştirak etmeksizin, bunların konusunu oluşturan eşyayı, bu özelliğini bilerek ve ticarî amaçla satışa arz etmek',
  'Birinci ila dördüncü fıkralarda tanımlanan fiillerin işlenmesine iştirak etmeksizin, bunların konusunu oluşturan eşyayı, bu özelliğini bilerek ve ticarî amaçla satın almak',
  'Birinci ila dördüncü fıkralarda tanımlanan fiillerin işlenmesine iştirak etmeksizin, bunların konusunu oluşturan eşyayı, bu özelliğini bilerek ve ticarî amaçla satmak',
  'Birinci ila dördüncü fıkralarda tanımlanan fiillerin işlenmesine iştirak etmeksizin, bunların konusunu oluşturan eşyayı, bu özelliğini bilerek ve ticarî amaçla taşımak',
  'Kamu Kurum ve Kuruluşları, vb.Tüzel Kişilikleri ile Bilişim Sistemleri,Banka veya Kredi Kurumlarının Araç Olarak Kullanılması Suretiyle Dolandırıcılık',
  'Kamu Kurum ve Kuruluşları, vb.Tüzel Kişiliklerin Araç Olarak Kullanılması Suretiyle Dolandırıcılık',
  'Bilişim Sistemindeki Verileri Bozma Yoketme, Erişilmez Kılma,Sisteme Veri Yerleştirme vb.',
  'Bilişim Sistemlerinin, Banka veya Kredi Kurumlarının Araç Olarak Kullanılması Suretiyle Banka veya Diğer Kredi Kurumlarınca Tahsis Edilmemesi Gereken Bir Kredinin Açılmasını Sağlamak',
  'Transit rejimi çerçevesinde taşınan serbest dolaşımda bulunmayan eşyayı, rejim hükümlerine aykırı olarak gümrük bölgesinde bırakmak',
  'Kaçak Orman Emvali Nakletme, Biçme, İşleme, Kabul Etme, Kullanma, Satma, Satınalma veya Bulundurma',
  'Türk Milletini, Türkiye Cumhuriyeti Devletini, Türkiye Büyük Millet Meclisini, Türkiye Cumhuriyeti Hükümetini ve Devletin Yargı Organlarını Alenen Aşağılama',
  'Fuhşu Kolaylaştırmak veya Fuhşa Aracılık Etmek Amacıyla Hazırlanmış Görüntü, Yazı ve Sözleri İçeren Ürünleri Verme, Dağıtma veya Yayma',
  'KÜLTÜR VARLIKLARI BULMAK AMACIYLA, İZİNSİZ OLARAK KAZI VEYA SONDAJ YAPMAK',
  'Kasten Yaralama Sonucu, Yasal Hakların Kullanılmasını Engellemek',
  'Suç Delillerini Yok Etme, Gizleme veya Değiştirme',
  'Dikili Ağaç, Fidan veya Bağ Çubuğuna Zarar Verme',
  'Silahla, birden fazla kişi ile birlikte konutta geceleyin yağma',
];

/** Uzun adlar önce denensin ki "…satın almak" ile "…satmak" gibi ortak önekler karışmasın. */
const KNOWN_NAMES = [...CRIME_NAMES_WITH_COMMA].sort((a, b) => b.length - a.length);

/**
 * Virgülle birleştirilmiş suç listesini tam `count` suça böler; bölünemezse null döner.
 * Önce bilinen virgüllü adlar bütün alınır, sayı tutmazsa küçük harfle başlayan parçalar öncekine
 * eklenir (Türkçe suç adlarının kelimeleri büyük harfle başlar, cümle devamı küçük harfle).
 */
export const splitCrimes = (text: string, count: number): string[] | null => {
  const value = text.trim();
  if (count <= 1) return [value];

  const tokens: string[] = [];
  let rest = value;
  while (rest) {
    const known = KNOWN_NAMES.find((name) => rest === name || rest.startsWith(`${name}, `));
    const end = known ? known.length : rest.indexOf(', ');
    const token = end === -1 ? rest : rest.slice(0, end);
    tokens.push(token.trim());
    rest = end === -1 ? '' : rest.slice(end).replace(/^,\s*/, '');
  }
  if (tokens.length === count) return tokens;

  const joined: string[] = [];
  for (const token of tokens) {
    if (joined.length > 0 && /^[a-zçğıöşü]/.test(token)) joined[joined.length - 1] += `, ${token}`;
    else joined.push(token);
  }
  return joined.length === count ? joined : null;
};

export interface CrimeEntry {
  crime: string;
  crimeDate: string;
  decision: string;
  decisionDate: string;
  /** false: kapalı dosyanın suç listesi karar sayısına bölünemedi; suç ile karar yan yana değildir. */
  aligned: boolean;
}

type DecisionFields = Pick<Record<HeaderKey, string>, 'Suçu' | 'Suç Tarihi' | 'Karar Türü' | 'Kesinleşme Tarihi'>;

/** Kaydı suç bazında satırlara ayırır: her satır bir suç ve (varsa) o suça verilen karardır. */
export const crimeEntries = (record: DecisionFields): CrimeEntry[] => {
  const crimeLines = splitLines(record['Suçu']);
  const crimeDateLines = splitLines(record['Suç Tarihi']);
  const decisionLines = splitLines(record['Karar Türü']);
  const dateLines = splitLines(record['Kesinleşme Tarihi']);
  const lineCount = Math.max(crimeLines.length, crimeDateLines.length, decisionLines.length, dateLines.length);

  const entries: CrimeEntry[] = [];
  for (let i = 0; i < lineCount; i++) {
    const crimeLine = crimeLines[i]?.trim() ?? '';
    const crimeDate = formatUyapDate(crimeDateLines[i] ?? '');
    const decisions = splitList(decisionLines[i] ?? '');
    const dates = splitList(dateLines[i] ?? '');
    const count = Math.max(decisions.length, dates.length, 1);

    const crimes = crimeLine ? splitCrimes(crimeLine, count) : Array<string>(count).fill('');
    const aligned = crimes !== null;
    for (let j = 0; j < count; j++) {
      const entry: CrimeEntry = {
        crime: aligned ? crimes[j] : j === 0 ? crimeLine : '',
        crimeDate,
        decision: decisions[j] ?? '',
        decisionDate: dates[j] ? formatUyapDate(dates[j]) : '',
        aligned,
      };
      if (entry.crime || entry.crimeDate || entry.decision || entry.decisionDate) entries.push(entry);
    }
  }
  return entries;
};

const DATE_COLUMNS: readonly string[] = ['Suç Tarihi', 'Kesinleşme Tarihi'];

/** Öğelerinde virgül geçmeyen liste sütunları; çıktıda boş öğeleri atılabilir. */
const LIST_COLUMNS: readonly string[] = [...DATE_COLUMNS, 'Karar Türü', 'Kesinleşme Türü'];

/**
 * PDF / Excel çıktısı için hücre değeri: hizalama için tutulan boş satırlar ve boş liste öğeleri
 * atılır, tarihler saatsiz gün.ay.yıl yazılır ("2022-09-14 16:31:28.0, , " → "14.09.2022").
 * Suçu gibi öğe adında virgül geçebilen sütunlarda yalnız boş satırlar atılır.
 */
export const exportValue = (column: HeaderKey, value: string): string => {
  if (!LIST_COLUMNS.includes(column)) return compactLines(value ?? '');
  const format = DATE_COLUMNS.includes(column) ? formatUyapDate : (token: string) => token;
  return splitLines(value ?? '')
    .map((line) => splitList(line).filter(Boolean).map(format).join(', '))
    .filter(Boolean)
    .join('\n');
};

/** Alt alta birleştirilmiş değerlerden tekrar edenleri eler. */
export const uniqueLines = (value: string): string[] => [
  ...new Set(splitLines(value).map((line) => line.trim()).filter(Boolean)),
];

export interface CourtReference {
  /** Ör. "Mersin 14. Asliye Ceza Mahkemesi" — kalıba uymayan açıklamada tüm metin. */
  court: string;
  /** Ör. "2023/661" */
  caseNo?: string;
  /** Ör. "Açık", "Kapalı", "İstinafta" */
  status?: string;
}

const COURT_REFERENCE = /^(.*?)\s*\((\d{4}\/\d+)\)\s*,\s*(.+)$/;

/** "Mersin 14. Asliye Ceza Mahkemesi(2023/661),Açık" açıklamasını mahkeme / esas no / duruma ayırır. */
export const parseAciklama = (value: string): CourtReference[] =>
  uniqueLines(value).map((line) => {
    const match = COURT_REFERENCE.exec(line);
    return match ? { court: match[1], caseNo: match[2], status: match[3].trim() } : { court: line };
  });
