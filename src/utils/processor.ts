import {
    FIXED_HEADERS,
    MERGE_FIX_COLUMNS,
    REPLACEMENTS,
    VALID_DOSYA_TURU,
} from '../constants';
import { CaseRecord, LogEntry } from '../types';

const generateId = () => Math.random().toString(36).substring(2, 9);

const createLog = (message: string, type: LogEntry['type'] = 'INFO'): LogEntry => ({
    id: generateId(),
    timestamp: new Date().toLocaleTimeString(),
    message,
    type,
});

// Helper to check if a string is empty or whitespace
const isEmpty = (str: string | undefined | null) => !str || str.trim().length === 0;

/**
 * Köşeli parantezleri ve gereksiz boşlukları temizler.
 * Kapalı dosyalardaki [Suç Adı] formatını düzeltmek için kullanılır.
 * @param value - Temizlenecek string değer
 * @returns Temizlenmiş değer
 * @example cleanBrackets('[Silahla Tehdit]') => 'Silahla Tehdit'
 */
const cleanBrackets = (value: string): string => {
    if (!value) return '';
    return value
        .replace(/^\[|\]$/g, '') // Baştan ve sondan köşeli parantezleri kaldır
        .trim();
};

// Helper to detect if a line is a header row
const isHeaderRow = (line: string): boolean => {
    const lower = line.toLowerCase();
    return (
        (lower.includes('birim adı') && lower.includes('dosya no')) ||
        (lower.includes('dosya durumu') && lower.includes('dosya türü'))
    );
};

/**
 * İki string değerini akıllıca birleştirir.
 * - Boş verileri eler.
 * - Biri diğerini içeriyorsa kapsayanı alır.
 * - İkisi de dolu ve farklıysa " / " ile birleştirir.
 */
const smartMerge = (val1: string, val2: string): string => {
    const v1 = val1 ? val1.trim() : '';
    const v2 = val2 ? val2.trim() : '';

    const isV1Invalid = !v1 || v1 === '-' || v1.toLowerCase() === 'nan';
    const isV2Invalid = !v2 || v2 === '-' || v2.toLowerCase() === 'nan';

    if (isV1Invalid && isV2Invalid) return '';
    if (isV1Invalid) return v2;
    if (isV2Invalid) return v1;

    const n1 = v1.toLowerCase();
    const n2 = v2.toLowerCase();

    if (n1 === n2) return v1;
    if (n1.includes(n2)) return v1;
    if (n2.includes(n1)) return v2;

    return `${v1}\n• ${v2}`;
};

export const parseClipboardData = (
    text: string,
    addLog: (l: LogEntry) => void
): CaseRecord[] => {
    if (!text || !text.trim()) {
        addLog(createLog('Hata: Yapıştırılan veri boş.', 'ERROR'));
        return [];
    }

    const lines = text.trim().split('\n');
    const records: CaseRecord[] = [];
    const lastValidValues: Record<string, string> = {};
    const seenRows = new Set<string>();

    lines.forEach((line, index) => {
        const trimmedLine = line.trim();

        if (!trimmedLine) return;

        if (isHeaderRow(trimmedLine)) {
            if (index === 0) {
                addLog(createLog('Tablo başlıkları algılandı ve temizleniyor...', 'INFO'));
            }
            return;
        }

        const cols = line.split('\t');

        if (cols.length <= 1 && !cols[0].trim()) return;

        const record: Partial<CaseRecord> = {
            _id: generateId(),
            _originalIndex: index,
        };

        FIXED_HEADERS.forEach((header, i) => {
            let val = cols[i] ? cols[i].trim() : '';

            if (val.toLowerCase() === 'nan') val = '';

            // Köşeli parantez temizleme (kapalı dosyalar için)
            val = cleanBrackets(val);

            if (MERGE_FIX_COLUMNS.includes(header)) {
                if (isEmpty(val) && lastValidValues[header]) {
                    val = lastValidValues[header];
                } else if (!isEmpty(val)) {
                    lastValidValues[header] = val;
                }
            }

            (record as Record<string, unknown>)[header] = val;
        });

        FIXED_HEADERS.forEach((h) => {
            if (!(record as Record<string, unknown>)[h]) {
                (record as Record<string, unknown>)[h] = '';
            }
        });

        const uniqueKey = FIXED_HEADERS.map((h) => (record as Record<string, unknown>)[h]).join('|');

        if (seenRows.has(uniqueKey)) {
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
    addLog(createLog('Veriler karşılaştırılıyor...', 'INFO'));

    const cleanRecord = (rec: CaseRecord) => {
        const newRec = { ...rec };

        Object.keys(REPLACEMENTS).forEach((col) => {
            const value = (newRec as Record<string, unknown>)[col];
            if (typeof value === 'string') {
                const map = REPLACEMENTS[col];
                Object.keys(map).forEach((oldVal) => {
                    if (value.includes(oldVal)) {
                        (newRec as Record<string, unknown>)[col] = value.replace(oldVal, map[oldVal]);
                    }
                });
            }
        });
        return newRec;
    };

    const d1 = dataset1.map(cleanRecord);
    const d2 = dataset2.map(cleanRecord);

    const isValid = (r: CaseRecord) => VALID_DOSYA_TURU.includes(r['Dosya Türü']);
    const validD1 = d1.filter(isValid);
    const validD2 = d2.filter(isValid);

    if (validD1.length === 0 || validD2.length === 0) {
        addLog(
            createLog('Filtreleme sonrası geçerli kayıt bulunamadı (Dosya Türü kontrol edin).', 'WARN')
        );
        return [];
    }

    const getCompositeKey = (r: CaseRecord) => {
        return [r['Birim Adı'], r['Dosya No'], r['Dosya Türü']]
            .map((val) => val.trim().toLowerCase())
            .join('|');
    };

    const map1 = new Map<string, CaseRecord>();
    validD1.forEach((r) => map1.set(getCompositeKey(r), r));

    const commonRecords: CaseRecord[] = [];
    const seenInResult = new Set<string>();

    validD2.forEach((row) => {
        const key = getCompositeKey(row);
        if (map1.has(key)) {
            if (!seenInResult.has(key)) {
                seenInResult.add(key);

                const record1 = map1.get(key)!;

                const mergedRecord: Record<string, unknown> = { ...row };

                FIXED_HEADERS.forEach((header) => {
                    if (header === 'Birim Adı' || header === 'Dosya No') return;
                    mergedRecord[header] = smartMerge(
                        record1[header] as string,
                        row[header] as string
                    );
                });

                mergedRecord._party1Role = record1['Sıfatı'] || '';
                mergedRecord._party2Role = row['Sıfatı'] || '';

                commonRecords.push(mergedRecord as CaseRecord);
            }
        }
    });

    if (commonRecords.length === 0) {
        addLog(createLog('Ortak kayıt bulunamadı.', 'WARN'));
        return [];
    }

    // Sıralama
    commonRecords.sort((a, b) => {
        const parseDosyaNo = (str: string) => {
            const parts = str.split('/');
            const year = parseInt(parts[0]) || 0;
            const no = parts.length > 1 ? parseInt(parts[1].replace(/\D/g, '')) || 0 : 0;
            return { year, no };
        };

        const valA = parseDosyaNo(a['Dosya No']);
        const valB = parseDosyaNo(b['Dosya No']);

        const isOpenA = a['Dosya Durumu'].toLowerCase().includes('açık');
        const isOpenB = b['Dosya Durumu'].toLowerCase().includes('açık');

        if (isOpenA && !isOpenB) return -1;
        if (!isOpenA && isOpenB) return 1;

        const unitCompare = a['Birim Adı'].localeCompare(b['Birim Adı']);
        if (unitCompare !== 0) return unitCompare;

        if (valA.year !== valB.year) return valA.year - valB.year;

        return valA.no - valB.no;
    });

    addLog(
        createLog(`Karşılaştırma tamamlandı. ${commonRecords.length} ortak kayıt bulundu.`, 'SUCCESS')
    );
    return commonRecords;
};

// Export helper functions for testing
export { generateId, createLog, isEmpty, isHeaderRow, smartMerge, cleanBrackets };
