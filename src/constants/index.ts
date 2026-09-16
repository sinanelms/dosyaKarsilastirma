export const FIXED_HEADERS = [
    'Birim Adı',
    'Dosya Durumu',
    'Dosya Türü',
    'Dosya No',
    'Sıfatı',
    'Vekilleri',
    'Dava Türleri',
    'Dava Konusu',
    'İlamat Numaraları',
    'Suçu',
    'Suç Tarihi',
    'Karar Türü',
    'Kesinleşme Tarihi',
    'Kesinleşme Türü',
    'Açıklama',
] as const;

export const BASE_COLUMNS = ['Birim Adı', 'Dosya No', 'Dosya Durumu', 'Dosya Türü'];

/**
 * UYAP/Excel çıktısında birleştirilmiş hücre olarak gelen, bu yüzden boşsa üst satırdan
 * doldurulması gereken sütunlar. Detay sütunları (Suçu, Karar, Açıklama...) ASLA doldurulmaz;
 * aksi hâlde bir dosyanın bilgisi bir sonraki dosyaya kopyalanır.
 */
export const FILL_DOWN_COLUMNS = ['Birim Adı', 'Dosya Durumu', 'Dosya Türü'] as const;

/**
 * Suç bazında satır satır (\n) ve liste öğesi öğesi (", ") birbirine karşılık gelen sütunlar.
 * Bu sütunlar tek tek birleştirilmez, blok olarak ele alınır (bkz. core/decision.ts).
 */
export const CRIME_ALIGNED_COLUMNS = ['Suçu', 'Suç Tarihi', 'Karar Türü', 'Kesinleşme Tarihi', 'Kesinleşme Türü'] as const;

/**
 * Karşılaştırmaya alınan dosya türleri (REPLACEMENTS sonrası adlarla, birebir eşleşme).
 * Listede olmayanlar bilerek dışarıda bırakılır: ör. CBS Tasra Yakalama Dosyası, Adli Tıp Dosyası,
 * Ceza Dava Dosyası (Basit Yargılama Usulü).
 */
export const VALID_DOSYA_TURU = [
    'Soruşturma Dosyası',
    'Ceza Dava Dosyası',
    'CBS İhbar Dosyası',
    'CBS İlam Dosyası',
    'CBS Denetimli Serbestlik Dosyası',
    'CBS Yakalama Dosyası',
    'CBS Tasra İlam Dosyası',
    'İdari Yaptırım Dosyası',
    'Denetimli Serbestlik Dosyası',
];

export const REPLACEMENTS: Record<string, Record<string, string>> = {
    'Birim Adı': { 'Cumhuriyet Başsavcılığı': 'CBS' },
    'Dosya Türü': {
        'CBS Sorusturma Dosyası': 'Soruşturma Dosyası',
        'CBS İlam Dosyası': 'CBS İlam Dosyası',
        'CBS Denetimli Serbestlik Dosyası': 'Denetimli Serbestlik Dosyası',
    },
};

// Keyboard shortcuts
export const KEYBOARD_SHORTCUTS = {
    COMPARE: 'ctrl+k',
    EXPORT_CSV: 'ctrl+s',
    TOGGLE_THEME: 'ctrl+d',
    CLEAR_ALL: 'ctrl+shift+c',
    ESCAPE: 'escape',
} as const;

// App metadata
export const APP_INFO = {
    name: 'UYAP Dosya Karşılaştırma',
    version: '1.1.1',
    description: 'Cumhuriyet Başsavcılığı Analiz Modülü',
} as const;

/** Kişi kartlarının vurgu renkleri; kişi sayısı bu listeden fazlaysa başa dönülür. */
export const PARTY_COLORS = [
    { accent: 'var(--color-primary)', background: 'var(--color-primary-light)' },
    { accent: '#6366f1', background: 'rgba(99, 102, 241, 0.1)' },
    { accent: '#0d9488', background: 'rgba(13, 148, 136, 0.1)' },
    { accent: '#d97706', background: 'rgba(217, 119, 6, 0.1)' },
    { accent: '#db2777', background: 'rgba(219, 39, 119, 0.1)' },
    { accent: '#7c3aed', background: 'rgba(124, 58, 237, 0.1)' },
] as const;

export const DEFAULT_PARTY_COUNT = 2;
export const MAX_LOG_ENTRIES = 200;
