import { FIXED_HEADERS, MERGE_FIX_COLUMNS, REPLACEMENTS, VALID_DOSYA_TURU, BASE_COLUMNS } from '../constants';
import { CaseRecord, LogEntry, HeaderKey } from '../types';

const generateId = () => Math.random().toString(36).substring(2, 9);

const createLog = (message: string, type: LogEntry['type'] = 'INFO'): LogEntry => ({
  id: generateId(),
  timestamp: new Date().toLocaleTimeString(),
  message,
  type
});

// Helper to check if a string is empty or whitespace
const isEmpty = (str: string | undefined | null) => !str || str.trim().length === 0;

// Helper to detect if a line is a header row
const isHeaderRow = (line: string): boolean => {
    const lower = line.toLowerCase();
    // Check for multiple keywords to be sure it's a header row
    return (lower.includes('birim adı') && lower.includes('dosya no')) || 
           (lower.includes('dosya durumu') && lower.includes('dosya türü'));
};

/**
 * İki string değerini akıllıca birleştirir.
 * - Boş verileri eler.
 * - Biri diğerini içeriyorsa (Örn: "Tehdit, Hakaret" vs "Hakaret"), kapsayanı (uzun olanı) alır.
 * - İkisi de dolu ve farklıysa " / " ile birleştirir.
 */
const smartMerge = (val1: string, val2: string): string => {
  const v1 = val1 ? val1.trim() : "";
  const v2 = val2 ? val2.trim() : "";
  
  // Boş/Geçersiz kontrolü
  const isV1Invalid = !v1 || v1 === '-' || v1.toLowerCase() === 'nan';
  const isV2Invalid = !v2 || v2 === '-' || v2.toLowerCase() === 'nan';

  if (isV1Invalid && isV2Invalid) return "";
  if (isV1Invalid) return v2;
  if (isV2Invalid) return v1;

  // İkisi de dolu, karşılaştırma yapalım
  const n1 = v1.toLowerCase();
  const n2 = v2.toLowerCase();

  // Eşitlik durumu
  if (n1 === n2) return v1;

  // Kapsama durumu (Subset check)
  // Örn: v1="Kasten Yaralama", v2="Yaralama" -> v1 döner
  if (n1.includes(n2)) return v1;
  if (n2.includes(n1)) return v2;

  // İkisi de farklı ve geçerli bilgi içeriyor
  return `${v1} / ${v2}`;
};

export const parseClipboardData = (
  text: string, 
  addLog: (l: LogEntry) => void
): CaseRecord[] => {
  if (!text || !text.trim()) {
    addLog(createLog("Hata: Yapıştırılan veri boş.", 'ERROR'));
    return [];
  }

  let lines = text.trim().split('\n');
  const records: CaseRecord[] = [];
  
  // Boşlukları doldurmak için son geçerli değerleri tut (Forward Fill)
  const lastValidValues: Record<string, string> = {};
  
  // Mükerrer kayıtları engellemek için (Aynı satır birden fazla kez yapıştırılırsa)
  const seenRows = new Set<string>();

  lines.forEach((line, index) => {
    // Satırı temizle
    const trimmedLine = line.trim();

    // Boş satırları atla
    if (!trimmedLine) return;

    // Başlık satırlarını atla (Verinin ortasında veya başında olabilir)
    if (isHeaderRow(trimmedLine)) {
        // Sadece ilk satırda log basalım, her başlıkta basıp logu kirletmeyelim
        if (index === 0) {
            addLog(createLog("Tablo başlıkları algılandı ve temizleniyor...", 'INFO'));
        }
        return;
    }

    // Satırı tab karakterine göre böl
    const cols = line.split('\t');
    
    // Eğer satır sadece tablardan oluşuyorsa veya çok kısaysa atla
    if (cols.length <= 1 && !cols[0].trim()) return;

    // Temel kaydı oluştur
    const record: Partial<CaseRecord> = {
      _id: generateId(),
      _originalIndex: index
    };

    // Sabit başlık sırasına göre veriyi eşleştir
    FIXED_HEADERS.forEach((header, i) => {
      let val = cols[i] ? cols[i].trim() : "";
      
      // Bazı kopyalamalarda gelen "nan" değerlerini temizle
      if (val.toLowerCase() === 'nan') val = "";

      // Forward Fill Mantığı (Merge Hücreler için):
      // Eğer bu sütun birleştirilmiş bir alansa (Birim Adı vb.) ve değer boşsa,
      // bir önceki satırın değerini kullan.
      if (MERGE_FIX_COLUMNS.includes(header)) {
        if (isEmpty(val) && lastValidValues[header]) {
          val = lastValidValues[header];
        } else if (!isEmpty(val)) {
          lastValidValues[header] = val;
        }
      }
      
      (record as any)[header] = val;
    });

    // Eksik sütun varsa boş string olarak tamamla
    FIXED_HEADERS.forEach(h => {
        if (!(record as any)[h]) (record as any)[h] = "";
    });

    // Mükerrer Kontrolü (Duplicate Check)
    // Tüm sütun değerlerini birleştirerek benzersiz bir anahtar oluştur
    // Bu sayede aynı veriyi 2 kere yapıştırırsanız analizde 2 kere sayılmaz.
    const uniqueKey = FIXED_HEADERS.map(h => (record as any)[h]).join('|');
    
    if (seenRows.has(uniqueKey)) {
        // Bu satır daha önce işlendi, atla
        return;
    }
    seenRows.add(uniqueKey);

    records.push(record as CaseRecord);
  });

  addLog(createLog(`Veri işlendi: ${records.length} adet benzersiz dosya okundu.`, 'INFO'));
  return records;
};

export const compareDatasets = (
  dataset1: CaseRecord[],
  dataset2: CaseRecord[],
  addLog: (l: LogEntry) => void
): CaseRecord[] => {
  addLog(createLog("Veriler karşılaştırılıyor...", 'INFO'));
  console.group("Analiz Başlatıldı");

  // 1. Veri Temizleme ve Standartlaştırma
  const cleanRecord = (rec: CaseRecord) => {
    const newRec = { ...rec };
    
    // Değişiklikleri Uygula (Örn: "Cumhuriyet Başsavcılığı" -> "CBS")
    Object.keys(REPLACEMENTS).forEach(col => {
      if ((newRec as any)[col]) {
        const map = REPLACEMENTS[col];
        Object.keys(map).forEach(oldVal => {
            if ((newRec as any)[col].includes(oldVal)) {
                 (newRec as any)[col] = (newRec as any)[col].replace(oldVal, map[oldVal]);
            }
        });
      }
    });
    return newRec;
  };

  const d1 = dataset1.map(cleanRecord);
  const d2 = dataset2.map(cleanRecord);

  // 2. Dosya Türü Filtreleme (Sadece Ceza, Soruşturma vb.)
  const isValid = (r: CaseRecord) => VALID_DOSYA_TURU.includes(r["Dosya Türü"]);
  const validD1 = d1.filter(isValid);
  const validD2 = d2.filter(isValid);

  if (validD1.length === 0 || validD2.length === 0) {
    addLog(createLog("Filtreleme sonrası geçerli kayıt bulunamadı (Dosya Türü kontrol edin).", 'WARN'));
    console.groupEnd();
    return [];
  }

  // 3. Kesişim Kümesini Bulma (Inner Join)
  // Anahtar: Birim Adı | Dosya No | Dosya Türü (Dosya Durumu hariç tutuldu, durumu farklı olsa bile eşleşsin)
  
  const getCompositeKey = (r: CaseRecord) => {
    // Not: Dosya Durumu'nu anahtardan çıkardık ki biri Açık biri Kapalı olsa bile eşleşsin.
    return [r["Birim Adı"], r["Dosya No"], r["Dosya Türü"]]
        .map(val => val.trim().toLowerCase())
        .join('|');
  };

  // Map oluşturarak Dataset 1'deki kayıtlara hızlı erişim sağlıyoruz
  const map1 = new Map<string, CaseRecord>();
  validD1.forEach(r => map1.set(getCompositeKey(r), r));
  
  const commonRecords: CaseRecord[] = [];
  const seenInResult = new Set<string>(); // Sonuçta tekrarı önlemek için

  validD2.forEach(row => {
    const key = getCompositeKey(row);
    if (map1.has(key)) {
      if (!seenInResult.has(key)) {
        seenInResult.add(key);
        
        // Eşleşen 1. Verisetindeki kaydı al
        const record1 = map1.get(key)!;
        
        // AKILLI BİRLEŞTİRME (Smart Merge)
        const mergedRecord: any = { ...row }; 

        FIXED_HEADERS.forEach(header => {
            // Birim Adı ve Dosya No zaten anahtar, onları olduğu gibi bırakabiliriz ama yine de garanti olsun.
            if (header === "Birim Adı" || header === "Dosya No") return;

            // Diğer tüm alanlar için akıllı birleştirme uygula
            mergedRecord[header] = smartMerge(record1[header], row[header]);
        });

        // Debug Log
        if (row['Suçu'] !== record1['Suçu']) {
             console.log(`[BİRLEŞTİRME] Dosya: ${row['Dosya No']}`);
             console.log(`- Taraf 1: ${record1['Suçu']}`);
             console.log(`- Taraf 2: ${row['Suçu']}`);
             console.log(`-> Sonuç: ${mergedRecord['Suçu']}`);
        }

        // Tarafların sıfatlarını manuel ekle (Merge işleminde ezilmemesi için)
        mergedRecord._party1Role = record1['Sıfatı'] || '';
        mergedRecord._party2Role = row['Sıfatı'] || '';

        commonRecords.push(mergedRecord as CaseRecord);
      }
    }
  });

  if (commonRecords.length === 0) {
    addLog(createLog("Ortak kayıt bulunamadı.", 'WARN'));
    console.groupEnd();
    return [];
  }

  // 4. Sıralama (Yıl ve Dosya Numarasına Göre)
  commonRecords.sort((a, b) => {
    const parseDosyaNo = (str: string) => {
      const parts = str.split('/');
      const year = parseInt(parts[0]) || 0;
      const no = parts.length > 1 ? parseInt(parts[1].replace(/\D/g, '')) || 0 : 0;
      return { year, no };
    };

    const valA = parseDosyaNo(a["Dosya No"]);
    const valB = parseDosyaNo(b["Dosya No"]);

    // 0. Öncelik: Dosya Durumu 'Açık' olanlar en başa
    const isOpenA = a["Dosya Durumu"].toLowerCase().includes("açık");
    const isOpenB = b["Dosya Durumu"].toLowerCase().includes("açık");

    if (isOpenA && !isOpenB) return -1;
    if (!isOpenA && isOpenB) return 1;

    // 1. Önce Birim Adı
    const unitCompare = a["Birim Adı"].localeCompare(b["Birim Adı"]);
    if (unitCompare !== 0) return unitCompare;

    // 2. Sonra Yıl
    if (valA.year !== valB.year) return valA.year - valB.year;
    
    // 3. Sonra Numara
    return valA.no - valB.no;
  });

  addLog(createLog(`Karşılaştırma tamamlandı. ${commonRecords.length} ortak kayıt bulundu.`, 'SUCCESS'));
  console.log(`%cKarşılaştırma Başarılı: ${commonRecords.length} eşleşme.`, 'color: green');
  console.groupEnd();
  return commonRecords;
};