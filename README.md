# UYAP Dosya Karşılaştırma

Cumhuriyet Başsavcılıkları için geliştirilmiş UYAP dosya karşılaştırma ve analiz modülü. İki veya daha fazla kişinin UYAP dosya listelerini karşılaştırır ve **aynı dosyada yer aldıkları kayıtları** her kişinin sıfatıyla birlikte listeler.

![Version](https://img.shields.io/badge/version-1.1.2-blue.svg)
![Tauri](https://img.shields.io/badge/Tauri-2-24c8db.svg)
![React](https://img.shields.io/badge/React-19-61dafb.svg)

## Özellikler

- **Çoklu kişi:** Varsayılan 2 kişi; "Kişi Ekle" ile istediğiniz kadar. 3+ kişide "En az N kişide ortak" seçimi.
- **İki giriş yolu:** UYAP tablosundan kopyala-yapıştır **veya** `.xlsx` / `.xls` dosyası yükle (butonla ya da sürükle-bırak).
- **Akıllı eşleştirme:** Dosya No yazım farkları (`2024/05` = `2024/5`) ve birim adı kısaltmaları (`Cumhuriyet Başsavcılığı` = `CBS`) tolere edilir. Başlık satırına göre sütun eşleme yapılır.
- **Gerçek PDF rapor:** Önizleme, kaydedilecek dosyanın kendisidir. Kenar boşlukları, sayfa başına satır, yatay/dikey, A4/A3, yazı tipi, yazı boyutu, hücre boşluğu ve sütun seçimi ayarlanabilir. Her suç ve karar ayrı satırda; sıfat ve dosya durumu renkli etiketlerle gösterilir.
- **Excel dışa aktarım:** Kişi sıfat sütunlarıyla birlikte `.xlsx`.
- **Büyük listeler:** Sanal listeleme ve Web Worker sayesinde binlerce kayıtta akıcı çalışır.
- **Koyu/açık tema**, klavye kısayolları, imzalı otomatik güncelleme.
- **Gizlilik:** Tüm işlemler yerelde yapılır; veriler hiçbir sunucuya gönderilmez.

## Yenilikler (v1.1.2)

- **Dosya Türü filtresi:** Analiz Sonuçları'nda varsayılan olarak yalnız soruşturma dosyaları (CBS Sorusturma Dosyası) gösterilir; diğer türler "Dosya Türü" filtresinden seçilir. Tablo, PDF rapor ve Excel çıktısı filtreye uyar.
- **Karşılaştır / Sıfırla** butonları kişi kartlarının altına taşındı; **PDF Oluştur** ve **Excel** butonları tablonun altında da yer alır.
- **Kişi adı:** Kelimelerin ilk harfi otomatik büyür; Excel yüklenince ad, dosya adından doldurulur (elle değiştirilebilir).
- Metin görünümünde veri yapıştırılınca kart otomatik olarak tablo görünümüne geçer.

## Önceki Sürüm (v1.1.1)

- **PDF raporda hücre hizalama:** "Dosya Karşılaştırma ve Analiz Raporu" tablosu daha okunaklı hale getirildi.
  - **Birim Adı** ve **Dosya Durumu** hücreleri yatay ve dikey olarak ortalanır.
  - **Dosya No**, **Suçu**, **Karar Türü** ve **Açıklama** hücreleri dikey olarak ortalanır (suç tarihleri de aynı şekilde).
  - Birden çok suç satırını kaplayan hücreler, birleşik hücrenin tam ortasına yerleşir.

## Klavye Kısayolları

| Kısayol | İşlev |
|---|---|
| `Ctrl+K` | Karşılaştır |
| `Ctrl+S` | Excel olarak kaydet |
| `Esc` | Açık pencereyi kapat |

## Kullanım

1. UYAP'tan kişinin dosya listesini kopyalayın veya Excel olarak indirin.
2. Her kişi kartına yapıştırın ya da "Excel Yükle" ile dosyayı seçin. Aynı karta birden fazla sayfa veya dosya eklenebilir.
3. Gerekirse "Kişi Ekle" ile yeni kişi ekleyin.
4. **Karşılaştır** (`Ctrl+K`).
5. Sonuçları inceleyin. Varsayılan olarak yalnız soruşturma dosyaları listelenir; diğer türleri **Dosya Türü** filtresinden seçin.
6. **PDF Oluştur** veya **Excel** ile kaydedin (yalnız filtrede seçili türler aktarılır).

## Hızlı Başlangıç (Geliştirici)

```bash
npm install
```

```bash
npm run dev
```

Masaüstü uygulaması için Rust ve Visual Studio Build Tools gerekir:

```bash
npm run tauri:dev
```

Test, lint ve derleme:

```bash
npm run lint && npm test && npm run build
```

## Teknolojiler

React 19 · TypeScript · Vite · Tauri 2 · jsPDF + jspdf-autotable · SheetJS · TanStack Virtual · vitest · ESLint 9

Fontlar: Noto Sans / Noto Serif (SIL OFL 1.1), Roboto (Apache 2.0). Lisans metinleri `src/assets/fonts` altındadır.

---

**Not:** Bu uygulama resmi bir UYAP ürünü değildir. Cumhuriyet Başsavcılıkları için geliştirilmiş bağımsız bir yardımcı araçtır.
