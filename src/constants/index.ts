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

export const MERGE_FIX_COLUMNS = [
    'Birim Adı',
    'Dosya Durumu',
    'Dosya Türü',
    'Dosya No',
    'Sıfatı',
    'Vekilleri',
];

export const VALID_DOSYA_TURU = ['Soruşturma Dosyası', 'Ceza Dava Dosyası', 'CBS İhbar Dosyası'];

export const REPLACEMENTS: Record<string, Record<string, string>> = {
    'Birim Adı': { 'Cumhuriyet Başsavcılığı': 'CBS' },
    'Dosya Türü': { 'CBS Sorusturma Dosyası': 'Soruşturma Dosyası' },
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
    version: '1.0.0',
    description: 'Cumhuriyet Başsavcılığı Analiz Modülü',
} as const;
