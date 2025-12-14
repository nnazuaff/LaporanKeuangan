# 💰 Laporan Keuangan - Aplikasi Android (APK)

Aplikasi laporan keuangan pribadi berbasis web yang dikonversi menjadi aplikasi Android native menggunakan **Capacitor**. Aplikasi dapat berjalan sepenuhnya offline di perangkat Android Anda.

## ✨ Fitur Utama

- ✅ **Aplikasi Android Native** - Dapat diinstall sebagai APK di Android
- ✅ **100% Offline** - Tidak memerlukan koneksi internet
- ✅ **Penyimpanan Lokal** - Data tersimpan di perangkat menggunakan localStorage
- ✅ **Mobile-First Design** - Dirancang khusus untuk layar HP
- ✅ **PIN Lock** - Keamanan dengan PIN 6 digit
- ✅ **Export Excel** - Export data ke file Excel

### Fitur Lengkap:
1. Input transaksi (pemasukan/pengeluaran)
2. Kategori transaksi (Makan, Transport, Hiburan, Gaji, dll)
3. Daftar transaksi dengan sorting otomatis
4. Filter berdasarkan jenis dan periode waktu
5. Kalender untuk pilih tanggal transaksi
6. Perhitungan otomatis saldo, pemasukan, dan pengeluaran
7. Edit dan hapus transaksi
8. Manajemen sumber saldo (Dompet, Bank, E-wallet)
9. Export data ke Excel
10. PIN lock untuk keamanan
11. Data persisten (tidak hilang saat aplikasi ditutup)


## 🚀 Cara Setup & Build APK

### Prasyarat
- [Node.js](https://nodejs.org/) (LTS version)
- [Android Studio](https://developer.android.com/studio)
- Android SDK (terinstall via Android Studio)

### 1️⃣ Clone Repository

```bash
git clone https://github.com/nnazuaff/LaporanKeuangan.git
cd LaporanKeuangan
```

### 2️⃣ Install Dependencies

```bash
npm install
```

### 3️⃣ Build Web Assets

```bash
npm run build
```

Script ini akan copy semua file web (HTML, CSS, JS) ke folder `www/` dan sync dengan Capacitor.

### 4️⃣ Generate Android Project (Pertama Kali)

```bash
npx cap add android
```

### 5️⃣ Generate Icon & Splash Screen

```bash
npm install @capacitor/assets --save-dev
npx capacitor-assets generate --android
```

### 6️⃣ Buka di Android Studio

```bash
npx cap open android
```

Atau manual: **File → Open** → Pilih folder `android/`

### 7️⃣ Build & Run APK

**Di Android Studio:**
1. Tunggu Gradle build selesai
2. Sambungkan HP Android (dengan USB Debugging aktif) atau buat emulator
3. Klik tombol **▶️ Run** (hijau)

**Build APK untuk distribusi:**
- **Build → Build Bundle(s) / APK(s) → Build APK(s)**
- APK akan ada di: `android/app/build/outputs/apk/debug/app-debug.apk`

**Build Release APK (Signed):**
- **Build → Generate Signed Bundle / APK**
- Pilih **APK** → Buat keystore → Build
- APK ada di: `android/app/release/app-release.apk`

## 🔄 Update Aplikasi (Setelah Edit Kode)

Setiap kali mengubah file HTML, CSS, atau JS:

```bash
npm run build
```

Lalu di Android Studio, klik **▶️ Run** lagi untuk test di HP.

## 🎨 Kustomisasi

### Mengubah Icon Aplikasi

1. Siapkan icon PNG ukuran **1024x1024px**
2. Copy ke folder `resources/icon.png`
3. Generate ulang:
   ```bash
   npx capacitor-assets generate --android
   npx cap sync android
   ```

### Mengubah Nama Aplikasi

Edit di `capacitor.config.json`:
```json
{
  "appName": "Nama Baru",
  "appId": "com.namaanda.app"
}
```

### Mengubah Package Name

Edit `appId` di `capacitor.config.json`, lalu:
```bash
npx cap sync
```

### Mengubah Warna Tema

Edit di `style.css`:
```css
:root {
    --primary-color: #4CAF50;     /* Warna utama */
    --primary-dark: #388E3C;      /* Warna gelap */
    --danger-color: #f44336;      /* Warna pengeluaran */
}
```

Jangan lupa `npm run build` setelah edit.

### Menambah Kategori

Edit di `index.html`, bagian select kategori:
```html
<option value="Kategori Baru">Kategori Baru</option>
```

## 💾 Backup & Export Data

Data disimpan di localStorage perangkat. Aplikasi menyediakan fitur **Export ke Excel** langsung dari aplikasi.

**Export dari Aplikasi:**
1. Buka aplikasi di HP
2. Tap tombol **Export Excel**
3. File akan terdownload di HP

## 🔧 Troubleshooting

**Gradle build error di Android Studio?**
- Pastikan Android SDK sudah terinstall
- Update Gradle: **File → Project Structure → Project**
- Sync project: **File → Sync Project with Gradle Files**

**Aplikasi tidak muncul di HP setelah Run?**
- Pastikan USB Debugging aktif di HP
- Izinkan instalasi dari unknown sources
- Cek HP terdeteksi di Device Manager Android Studio

**Icon tidak berubah setelah generate?**
- Jalankan `npx cap sync android`
- Clean & rebuild: **Build → Clean Project** → **Build → Rebuild Project**
- Uninstall app di HP, lalu install ulang

**Error "capacitor.config.json not found"?**
- Pastikan menjalankan `npm install` dulu
- Jangan hapus file `capacitor.config.json`

**Data hilang setelah update app?**
- Data di localStorage akan tetap tersimpan
- Export dulu sebelum uninstall app untuk berjaga-jaga

## 📱 Kompatibilitas

- ✅ **Android 5.0+** (API Level 21+)
- ✅ Tested di HP Android berbagai merk
- ❌ iOS (gunakan versi PWA di Safari)

## 🛠️ Teknologi yang Digunakan

- **HTML5** - Struktur aplikasi
- **CSS3** - Styling & responsive design
- **Vanilla JavaScript** - Logic tanpa framework
- **LocalStorage API** - Penyimpanan data lokal
- **Service Worker API** - Offline capability
- **Capacitor** - Native Android wrapper
- **Android Studio** - IDE untuk build APK
- **SheetJS (xlsx)** - Export ke Excel

## � NPM Scripts

```bash
npm run build         # Build web assets & sync ke Capacitor
npm run sync          # Sync perubahan ke Android project
npm run open:android  # Buka di Android Studio
```

## 🎯 Roadmap Fitur Masa Depan

- [ ] Grafik pengeluaran bulanan
- [ ] Budget planning & notifikasi
- [ ] Backup otomatis ke cloud
- [ ] Multi-currency support
- [ ] Dark mode
- [ ] Widget Android

## 📝 Lisensi

Aplikasi ini dibuat untuk penggunaan pribadi dan edukasi. Anda bebas memodifikasi dan menggunakannya sesuai kebutuhan.

## 🤝 Kontribusi

Kontribusi sangat diterima! Jika ingin menambahkan fitur atau memperbaiki bug:
1. Fork repository ini
2. Buat branch baru (`git checkout -b feature/FiturBaru`)
3. Commit perubahan (`git commit -m 'Tambah fitur baru'`)
4. Push ke branch (`git push origin feature/FiturBaru`)
5. Buat Pull Request

## 📧 Support

Jika ada pertanyaan atau issue, silakan buat [issue](https://github.com/nnazuaff/LaporanKeuangan/issues) di repository ini.

## 👨‍💻 Author

**nnazuaff**
- GitHub: [@nnazuaff](https://github.com/nnazuaff)

---

**Selamat menggunakan! Kelola keuangan Anda dengan lebih baik! 💰📊✨**
