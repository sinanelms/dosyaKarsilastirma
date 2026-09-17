import { FIXED_HEADERS } from '../constants';

export type HeaderKey = (typeof FIXED_HEADERS)[number];

export type CaseRecord = Record<HeaderKey, string> & {
  _id: string;
  _originalIndex: number;
};

/** Karşılaştırmaya katılan bir kişi. */
export interface Party {
  id: string;
  name: string;
  /** Kullanıcı adı elle değiştirdiyse true; Excel yüklenince ad otomatik doldurulmaz. */
  nameEdited: boolean;
  /** Panodan yapıştırılan ham metin. */
  text: string;
  /** Metinden ayrıştırılan kayıtlar. */
  textRecords: CaseRecord[];
  /** Yüklenen Excel dosyalarından okunan kayıtlar. */
  fileRecords: CaseRecord[];
  fileNames: string[];
  /** textRecords + fileRecords (karşılaştırmada kullanılan liste). */
  records: CaseRecord[];
  /** PARTY_COLORS içindeki renk sırası. */
  colorIndex: number;
}

/** En az iki kişide ortak bulunan, kişilerdeki değerleri birleştirilmiş dosya. */
export type MatchRecord = Record<HeaderKey, string> & {
  _key: string;
  /** Kişi kimliği → sıfat. null: kişi bu dosyada yok. '' : kişi var, sıfat boş. */
  roles: Record<string, string | null>;
  partyCount: number;
};

export interface LogEntry {
  id: string;
  timestamp: string;
  message: string;
  type: 'INFO' | 'WARN' | 'ERROR' | 'SUCCESS';
}

export type Theme = 'light' | 'dark';

export interface ToastMessage {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message?: string;
  duration?: number;
}
