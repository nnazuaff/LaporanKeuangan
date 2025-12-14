# 💰 Laporan Keuangan - Android App

Aplikasi mobile untuk mencatat dan mengelola keuangan pribadi. Dibuat dengan teknologi web (HTML, CSS, JavaScript) dan dikonversi menjadi aplikasi Android native menggunakan Capacitor.

## ✨ Fitur

### 💸 Manajemen Transaksi
- Catat pemasukan dan pengeluaran
- Kategori transaksi (Makan, Transport, Gaji, dll)
- Filter berdasarkan jenis dan periode
- Kalender untuk pilih tanggal transaksi
- Edit dan hapus transaksi

### 💳 Manajemen Saldo
- Multiple sumber dana (Bank, E-wallet, Cash)
- Breakdown saldo per sumber
- Perhitungan otomatis saldo akhir

### 🔒 Keamanan
- Biometric authentication (Fingerprint/Face unlock)
- Device PIN fallback
- Authentication screen dengan loading state
- Exit confirmation dialog

### 📊 Export & Laporan
- Export to PDF dengan auto-open
- Export to Excel
- Summary pemasukan, pengeluaran, dan saldo

### 🔔 Notifikasi
- Daily reminder untuk catat transaksi
- Custom time setting
- Persistent notification (tidak perlu app terbuka)

### 🎨 UI/UX
- Custom dropdown untuk semua form select
- Modern card design dengan glassmorphism
- Smooth animations dan transitions
- Safe area padding untuk notch/status bar
- Mobile-first responsive design

### 📴 Offline First
- 100% offline capability
- Data tersimpan lokal (localStorage)
- Service Worker untuk PWA
- Tidak butuh koneksi internet

## 🚀 Quick Start

### Prerequisites
- Node.js (LTS version)
- Android Studio dengan Android SDK
- Git

### Installation

```bash
# Clone repository
git clone https://github.com/nnazuaff/LaporanKeuangan.git
cd LaporanKeuangan

# Install dependencies
npm install

# Build dan sync ke Android
npm run build

# Buka di Android Studio
npx cap open android
```

### Build APK

1. Di Android Studio, tunggu Gradle sync selesai
2. Connect Android device dengan USB debugging, atau gunakan emulator
3. Klik **Run** ▶️ untuk test di device
4. Untuk build APK: **Build → Build Bundle(s) / APK(s) → Build APK(s)**

APK akan ada di: `android/app/build/outputs/apk/debug/app-debug.apk`

## 🔄 Development Workflow

Setelah edit kode (HTML/CSS/JS):

```bash
npm run build
```

Lalu Run ulang di Android Studio.

## 🛠️ Tech Stack

- **Frontend**: HTML5, CSS3, Vanilla JavaScript
- **Storage**: localStorage API
- **PDF**: jsPDF
- **Excel**: SheetJS (xlsx)
- **Native**: Capacitor 8.0
- **Plugins**: 
  - @capacitor/app (back button handling)
  - @capacitor/filesystem (file management)
  - @capacitor/share (sharing files)
  - @capacitor/local-notifications (reminders)
  - capacitor-native-biometric (authentication)

## 📱 Compatibility

- **Android**: 5.0+ (API Level 21+)
- **Tested**: Various Android devices

## 📝 License

MIT License - Free for personal and educational use

## 👨‍💻 Author

**nnazuaff**
- GitHub: [@nnazuaff](https://github.com/nnazuaff)
- Instagram: [@nnzuaf](https://www.instagram.com/nnzuaf/)

---