# UYAP Dosya Karşılaştırma

Cumhuriyet Başsavcılığı için geliştirilmiş UYAP dosya karşılaştırma ve analiz modülü.

![Version](https://img.shields.io/badge/version-1.0.0-blue.svg)
![License](https://img.shields.io/badge/license-MIT-green.svg)
![Tauri](https://img.shields.io/badge/Tauri-2.0-24c8db.svg)
![React](https://img.shields.io/badge/React-19-61dafb.svg)

## Özellikler

### 🔍 Dosya Karşılaştırma
- İki farklı tarafın UYAP verilerini karşılaştırma
- Ortak dosyaların akıllı birleştirme ile tespiti
- Otomatik veri temizleme ve standartlaştırma

### 🎨 Modern Arayüz
- **Koyu/Açık Tema**: Göz yorgunluğunu azaltan koyu mod desteği
- **Responsive Tasarım**: Farklı ekran boyutlarına uyumlu
- **Anlık Geri Bildirim**: Toast bildirimleri ile kullanıcı bilgilendirmesi

### ⌨️ Klavye Kısayolları
| Kısayol | İşlev |
|---------|-------|
| `CTRL+K` | Karşılaştırmayı başlat |
| `CTRL+S` | CSV olarak dışa aktar |
| `ESC` | Açık modalı kapat |

### 📊 Dışa Aktarım
- **CSV/Excel**: Tablo verilerini Excel uyumlu formatta indir
- **PDF Rapor**: Özelleştirilebilir PDF rapor oluşturma
  - Sayfa yönü seçimi (Yatay/Dikey)
  - Kenar boşluğu ayarları
  - Sütun seçimi
  - Font boyutu ayarı

### 🔄 Otomatik Güncelleme
- GitHub Releases üzerinden otomatik güncelleme kontrolü
- İndirme durumu göstergesi
- Tek tıkla güncelleme ve yeniden başlatma

## Kurulum

### Geliştirme Ortamı

1. **Bağımlılıkları yükleyin:**
```bash
npm install
```

2. **Geliştirme sunucusunu başlatın:**
```bash
npm run dev
```

### Masaüstü Uygulaması (Tauri)

#### Gereksinimler
- [Rust](https://www.rust-lang.org/tools/install)
- Windows için: Visual Studio C++ Build Tools
- [Node.js](https://nodejs.org/) v18+

#### Derleme

```bash
# Geliştirme modunda çalıştır
npm run tauri dev

# Üretim derlemesi
npm run tauri build
```

## Kullanım

### 1. Veri Girişi

1. UYAP'tan ilgili verileri kopyalayın (CTRL+C)
2. Sol panele birinci tarafın verilerini yapıştırın
3. Sağ panele ikinci tarafın verilerini yapıştırın

> **İpucu**: Birden fazla sayfa verisini aynı panele yapıştırarak birleştirebilirsiniz.

### 2. Karşılaştırma

**Karşılaştır** butonuna tıklayın veya `CTRL+K` kullanın.

### 3. Sonuçları İnceleme

- Ortak dosyalar tabloda gösterilir
- Tarafların sıfatları ayrı sütunlarda belirtilir
- Dosya durumu renk kodlarıyla gösterilir:
  - 🟢 Yeşil: Açık dosyalar
  - 🔴 Kırmızı: Kapalı dosyalar

### 4. Dışa Aktarım

- **CSV**: `Excel/CSV` butonuna tıklayın
- **PDF**: `PDF Oluştur` butonuna tıklayarak özelleştirilebilir rapor oluşturun

## Proje Yapısı

```
dosyaKarsilastirma/
├── src/
│   ├── components/          # React bileşenleri
│   │   ├── common/          # Ortak UI bileşenleri
│   │   │   ├── ErrorFallback.tsx
│   │   │   ├── Toast.tsx
│   │   │   ├── ThemeToggle.tsx
│   │   │   └── UpdateNotification.tsx
│   │   ├── DataInput.tsx
│   │   ├── Logger.tsx
│   │   ├── PdfExportModal.tsx
│   │   └── ResultsTable.tsx
│   ├── context/             # React Context
│   │   ├── ThemeContext.tsx
│   │   └── ToastContext.tsx
│   ├── hooks/               # Custom hooks
│   │   ├── useAutoUpdate.ts
│   │   └── useKeyboardShortcuts.ts
│   ├── utils/               # Yardımcı fonksiyonlar
│   │   └── processor.ts
│   ├── types/               # TypeScript tip tanımlamaları
│   ├── constants/           # Sabit değerler
│   ├── styles/              # Global stiller
│   ├── App.tsx              # Ana uygulama bileşeni
│   └── main.tsx             # Giriş noktası
├── src-tauri/               # Tauri (Rust) backend
├── public/                  # Statik dosyalar
└── package.json
```

## Teknolojiler

- **Frontend**: React 19, TypeScript, Vite
- **Styling**: Tailwind CSS, CSS Variables
- **Desktop**: Tauri 2.0 (Rust)
- **İkonlar**: Lucide React
- **Linting**: ESLint, Prettier

## Ortam Değişkenleri

Otomatik güncelleme için aşağıdaki yapılandırmalar `src-tauri/tauri.conf.json` dosyasında ayarlanmalıdır:

```json
{
  "plugins": {
    "updater": {
      "endpoints": ["https://github.com/KULLANICI/REPO/releases/latest/download/latest.json"],
      "pubkey": "PUBLIC_KEY_HERE"
    }
  }
}
```

## Lisans

MIT License - Detaylar için [LICENSE](LICENSE) dosyasına bakın.

## Katkıda Bulunma

1. Bu depoyu fork edin
2. Yeni bir branch oluşturun (`git checkout -b feature/yenilik`)
3. Değişikliklerinizi commit edin (`git commit -am 'Yeni özellik ekle'`)
4. Branch'i push edin (`git push origin feature/yenilik`)
5. Pull Request açın

---

**Not**: Bu uygulama resmi bir UYAP ürünü değildir. Cumhuriyet Başsavcılıkları için geliştirilen bağımsız bir yardımcı araçtır.
