export const FIXED_HEADERS = [
  "Birim Adı", "Dosya Durumu", "Dosya Türü", "Dosya No", "Sıfatı", "Vekilleri",
  "Dava Türleri", "Dava Konusu", "İlamat Numaraları", "Suçu", "Suç Tarihi",
  "Karar Türü", "Kesinleşme Tarihi", "Kesinleşme Türü", "Açıklama"
] as const;

export const BASE_COLUMNS = ["Birim Adı", "Dosya No", "Dosya Durumu", "Dosya Türü"];

export const MERGE_FIX_COLUMNS = ["Birim Adı", "Dosya Durumu", "Dosya Türü", "Dosya No", "Sıfatı", "Vekilleri"];

export const VALID_DOSYA_TURU = ["Soruşturma Dosyası", "Ceza Dava Dosyası", "CBS İhbar Dosyası"];

export const REPLACEMENTS: Record<string, Record<string, string>> = {
  "Birim Adı": { "Cumhuriyet Başsavcılığı": "CBS" },
  "Dosya Türü": { "CBS Sorusturma Dosyası": "Soruşturma Dosyası" }
};