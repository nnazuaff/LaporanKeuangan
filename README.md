# 💰 Laporan Keuangan - Aplikasi PWA

Aplikasi laporan keuangan pribadi berbasis PWA (Progressive Web App) yang dapat berjalan sepenuhnya offline di perangkat Android Anda.

## ✨ Fitur Utama

- ✅ **100% Offline** - Tidak memerlukan koneksi internet
- ✅ **Penyimpanan Lokal** - Data tersimpan di perangkat menggunakan localStorage
- ✅ **Mobile-First Design** - Dirancang khusus untuk layar HP
- ✅ **PWA Ready** - Dapat diinstall sebagai aplikasi di HP
- ✅ **Mudah Dibungkus ke APK** - Siap dijadikan aplikasi Android

### Fitur Lengkap:
1. Input transaksi (pemasukan/pengeluaran)
2. Kategori transaksi (Makan, Transport, Hiburan, dll)
3. Daftar transaksi dengan sorting otomatis
4. Filter berdasarkan jenis dan periode
5. Perhitungan otomatis saldo, pemasukan, dan pengeluaran
6. Hapus transaksi
7. Data persisten (tidak hilang saat aplikasi ditutup)

## 📁 Struktur File

```
laporan_keuangan/
├── index.html              # Halaman utama aplikasi
├── style.css               # Styling lengkap (mobile-first)
├── app.js                  # Logic aplikasi dan manajemen data
├── manifest.json           # PWA manifest
├── service-worker.js       # Service worker untuk offline capability
├── generate-icon.html      # Generator icon aplikasi
├── icon-192.png           # Icon 192x192 (generate dulu)
├── icon-512.png           # Icon 512x512 (generate dulu)
└── README.md              # File ini
```

## 🚀 Cara Menggunakan

### 1. Generate Icon Aplikasi
1. Buka file `generate-icon.html` di browser
2. Klik tombol "Download Icon 192x192"
3. Klik tombol "Download Icon 512x512"
4. Simpan kedua file icon di folder yang sama dengan `index.html`

### 2. Jalankan Aplikasi di Browser
1. Buka file `index.html` di browser (Chrome/Edge/Firefox)
2. Aplikasi siap digunakan!

### 3. Install sebagai PWA di HP Android

**Menggunakan Chrome:**
1. Buka aplikasi di Chrome Android
2. Tap menu (⋮) > "Add to Home screen" / "Install app"
3. Aplikasi akan ditambahkan ke home screen

**Menggunakan Server Lokal:**
```bash
# Jika punya Python
python -m http.server 8000

# Atau gunakan Live Server di VS Code
# Kemudian akses dari HP: http://[IP-KOMPUTER]:8000
```

### 4. Membungkus ke File APK

**Metode 1: PWA Builder (Termudah)**
1. Upload file ke web server atau GitHub Pages
2. Kunjungi [PWABuilder.com](https://www.pwabuilder.com/)
3. Masukkan URL aplikasi
4. Download APK yang dihasilkan

**Metode 2: Menggunakan Cordova/Capacitor**
```bash
# Install Cordova
npm install -g cordova

# Buat project
cordova create myapp com.example.keuangan LaporanKeuangan
cd myapp

# Copy semua file ke folder www/
# Kemudian build APK
cordova platform add android
cordova build android
```

**Metode 3: Android Studio (WebView)**
- Buat project Android baru dengan WebView
- Load file HTML lokal ke dalam WebView
- Build APK manual

## 🎨 Kustomisasi

### Mengubah Warna
Edit di `style.css`:
```css
:root {
    --primary-color: #4CAF50;     /* Warna utama */
    --primary-dark: #388E3C;      /* Warna gelap */
    --danger-color: #f44336;      /* Warna pengeluaran */
}
```

### Menambah Kategori
Edit di `index.html`, bagian select kategori:
```html
<option value="Kategori Baru">Kategori Baru</option>
```

### Mengubah Icon
Edit fungsi `drawIcon()` di `generate-icon.html` atau gunakan icon custom Anda sendiri.

## 💾 Backup & Restore Data

### Backup Data (via Console Browser)
```javascript
exportData() // Download file JSON
```

### Restore Data (via Console Browser)
```javascript
// Copy isi file JSON ke clipboard, lalu:
importData('paste-json-data-disini')
```

## 🔧 Troubleshooting

**Service Worker tidak terdaftar?**
- Pastikan menggunakan HTTPS atau localhost
- Cek di DevTools > Application > Service Workers

**Data hilang?**
- Jangan clear browser data/cache
- Lakukan backup rutin dengan `exportData()`

**Aplikasi tidak bisa diinstall?**
- Pastikan `manifest.json` dan icon sudah benar
- Gunakan HTTPS atau localhost
- Cek PWA requirements di DevTools > Lighthouse

## 📱 Kompatibilitas

- ✅ Chrome Android (Recommended)
- ✅ Edge Android
- ✅ Firefox Android
- ✅ Samsung Internet
- ⚠️ Safari iOS (limited PWA support)

## 🛠️ Teknologi yang Digunakan

- **HTML5** - Struktur aplikasi
- **CSS3** - Styling & responsive design
- **Vanilla JavaScript** - Logic tanpa framework
- **LocalStorage API** - Penyimpanan data lokal
- **Service Worker API** - Offline capability
- **Web App Manifest** - PWA metadata

## 📝 Lisensi

Aplikasi ini dibuat untuk penggunaan pribadi. Anda bebas memodifikasi dan menggunakannya sesuai kebutuhan.

## 🤝 Kontribusi

Jika ingin menambahkan fitur:
1. Export/import data ke file
2. Grafik pengeluaran bulanan
3. Budget planning
4. Reminder pembayaran
5. Multi-currency support

Silakan modifikasi kode sesuai kebutuhan Anda!

## 📧 Support

Jika ada pertanyaan atau issue, silakan buat issue di repository ini.

---

**Selamat menggunakan! 💰📊**
