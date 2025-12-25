// ==========================================
// APLIKASI LAPORAN KEUANGAN PRIBADI
// ==========================================

// Konstanta
const STORAGE_KEY = 'laporan_keuangan_transaksi';
const STORAGE_KEY_SALDO = 'laporan_keuangan_saldo_manual';
const STORAGE_KEY_PIN = 'laporan_keuangan_pin';
const STORAGE_KEY_SECURITY = 'laporan_keuangan_security_enabled';
const STORAGE_KEY_REMINDER = 'laporan_keuangan_reminder_enabled';
const STORAGE_KEY_REMINDER_TIME = 'laporan_keuangan_reminder_time';

// State aplikasi
let transaksiList = [];
let sumberSaldoList = [];
let filterJenis = 'semua';
let filterPeriode = 'semua';
let dateRangeStart = null;
let dateRangeEnd = null;
let currentCalendarMonth = new Date();
let currentPinInput = '';
let pinMode = 'verify'; // 'setup', 'verify', 'change', 'confirm'
let tempPin = '';

// ==========================================
// INITIALIZATION
// ==========================================

// Inisialisasi aplikasi saat halaman dimuat
document.addEventListener('DOMContentLoaded', function() {
    initApp();
});

function initApp() {
    // Tampilkan loading screen
    showAuthScreen();
    
    // Cek PIN terlebih dahulu
    checkPinAndInitialize();
}

function showAuthScreen() {
    const authScreen = document.getElementById('authScreen');
    const mainContent = document.getElementById('mainContent');
    
    if (authScreen && mainContent) {
        authScreen.classList.remove('hidden');
        mainContent.classList.add('hidden');
    }
}

function hideAuthScreen() {
    const authScreen = document.getElementById('authScreen');
    const mainContent = document.getElementById('mainContent');
    
    if (authScreen && mainContent) {
        authScreen.classList.add('hidden');
        mainContent.classList.remove('hidden');
    }
}

async function checkPinAndInitialize() {
    // Update message
    const authMessage = document.querySelector('.auth-message');
    
    // Cek apakah di Android Native
    const isCapacitor = window.Capacitor && window.Capacitor.isNativePlatform && window.Capacitor.isNativePlatform();
    
    if (isCapacitor) {
        // Cek apakah user aktifkan security
        const securityEnabled = localStorage.getItem(STORAGE_KEY_SECURITY);
        
        if (securityEnabled === 'true') {
            // Security aktif, gunakan biometric authentication
            if (authMessage) authMessage.textContent = 'Verifikasi...';
            await authenticateWithBiometric();
        } else {
            // Security tidak aktif, langsung masuk
            console.log('Security disabled by user');
            if (authMessage) authMessage.textContent = 'Memuat data...';
            initializeApp();
        }
    } else {
        // Browser/PWA - langsung masuk tanpa authentication
        console.log('Running in browser - skip authentication');
        if (authMessage) authMessage.textContent = 'Memuat data...';
        initializeApp();
    }
}

async function authenticateWithBiometric() {
    try {
        const NativeBiometric = window.Capacitor.Plugins.NativeBiometric;
        
        if (!NativeBiometric) {
            // Plugin tidak tersedia, langsung masuk
            console.log('Biometric plugin not available');
            initializeApp();
            return;
        }
        
        // Cek apakah biometric atau device credentials tersedia
        const available = await NativeBiometric.isAvailable();
        
        if (!available.isAvailable) {
            // Tidak ada security di device, langsung masuk
            console.log('No biometric/PIN available on device');
            initializeApp();
            return;
        }
        
        // Tampilkan prompt biometric dengan fallback ke PIN device
        await NativeBiometric.verifyIdentity({
            title: "Laporan Keuangan",
            subtitle: "Verifikasi identitas Anda",
            description: "Gunakan fingerprint, face unlock, atau PIN HP Anda",
            useFallback: true,
            fallbackTitle: "Gunakan PIN HP",
            maxAttempts: 3
        });
        
        // Sukses! Langsung initialize app
        console.log('✅ Authentication successful');
        initializeApp();
        
    } catch (error) {
        console.error('Authentication failed:', error);
        
        // Update message on auth screen
        const authMessage = document.querySelector('.auth-message');
        
        // Jika user cancel atau gagal, JANGAN biarkan masuk - retry terus
        if (error.code === 10 || error.code === 13) {
            // User canceled - HARUS coba lagi, tidak bisa bypass
            if (authMessage) authMessage.textContent = 'Authentication dibatalkan. Coba lagi...';
            console.log('❌ User canceled authentication, retrying...');
            
            // Coba lagi setelah 1.5 detik
            setTimeout(() => {
                if (authMessage) authMessage.textContent = 'Verifikasi...';
                authenticateWithBiometric();
            }, 1500);
        } else if (error.code === 11) {
            // Too many attempts
            if (authMessage) authMessage.textContent = 'Terlalu banyak percobaan. Coba lagi...';
            console.log('❌ Too many attempts, retrying...');
            
            setTimeout(() => {
                if (authMessage) authMessage.textContent = 'Verifikasi...';
                authenticateWithBiometric();
            }, 2000);
        } else {
            // Error lain - tetap retry, TIDAK bypass
            if (authMessage) authMessage.textContent = 'Error authentication. Coba lagi...';
            console.log('Authentication error, retrying:', error);
            
            setTimeout(() => {
                if (authMessage) authMessage.textContent = 'Verifikasi...';
                authenticateWithBiometric();
            }, 1500);
        }
    }
}

function initializeApp() {
    // Load data dari localStorage
    loadDataFromStorage();
    loadSaldoFromStorage();
    
    // Set tanggal default ke hari ini
    setDefaultDate();
    
    // Setup event listeners
    setupEventListeners();
    
    // Load security preference dan set toggle state
    loadSecurityPreference();
    
    // Setup back button handler untuk exit confirmation
    setupBackButtonHandler();
    
    // Setup notification action listener
    setupNotificationListener();
    
    // Render tampilan awal
    renderTransactions();
    renderSumberSaldo();
    renderSaldoBreakdown();
    updateSummary();
    
    // Register service worker untuk PWA
    registerServiceWorker();
    
    // Hide auth screen and show main content
    hideAuthScreen();
}

// ==========================================
// BACK BUTTON HANDLER (EXIT CONFIRMATION)
// ==========================================

function setupBackButtonHandler() {
    // Cek apakah di Android Native
    const isCapacitor = window.Capacitor && window.Capacitor.isNativePlatform && window.Capacitor.isNativePlatform();
    
    if (!isCapacitor) {
        // Browser - tidak perlu handle back button
        return;
    }
    
    // Import App plugin
    const { App } = window.Capacitor.Plugins;
    
    if (!App) {
        console.log('App plugin not available');
        return;
    }
    
    // Listen untuk back button
    App.addListener('backButton', ({ canGoBack }) => {
        // Cek apakah ada modal yang terbuka
        const activeModal = document.querySelector('.modal.active');
        
        if (activeModal) {
            // Ada modal terbuka, tutup modal aja
            activeModal.classList.remove('active');
            return;
        }
        
        // Tidak ada modal, tanyakan apakah mau keluar
        showExitConfirmation();
    });
    
    console.log('✅ Back button handler initialized');
}

function showExitConfirmation() {
    // Buat custom confirmation modal
    const existingConfirm = document.getElementById('exitConfirmModal');
    if (existingConfirm) {
        existingConfirm.classList.add('active');
        return;
    }
    
    // Create modal
    const modal = document.createElement('div');
    modal.id = 'exitConfirmModal';
    modal.className = 'modal exit-modal';
    modal.innerHTML = `
        <div class="modal-content exit-modal-content">
            <div class="exit-modal-header">
                <h3>Keluar Aplikasi</h3>
            </div>
            <div class="exit-modal-body">
                <p>Apakah Anda yakin ingin keluar dari aplikasi?</p>
            </div>
            <div class="exit-modal-footer">
                <button type="button" class="btn-exit-cancel" onclick="closeExitConfirmation()">
                    Batal
                </button>
                <button type="button" class="btn-exit-confirm" onclick="exitApp()">
                    Ya, Keluar
                </button>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    // Tampilkan modal dengan animasi
    setTimeout(() => {
        modal.classList.add('active');
    }, 10);
}

function closeExitConfirmation() {
    const modal = document.getElementById('exitConfirmModal');
    if (modal) {
        modal.classList.remove('active');
    }
}

function exitApp() {
    const { App } = window.Capacitor.Plugins;
    
    if (App) {
        App.exitApp();
    }
}

// ==========================================
// SERVICE WORKER REGISTRATION
// ==========================================

function registerServiceWorker() {
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('service-worker.js')
            .then(function(registration) {
                console.log('Service Worker terdaftar:', registration);
                
                // Cek update setiap 1 jam
                setInterval(() => {
                    registration.update();
                }, 3600000);
                
                // Auto reload saat ada service worker baru
                registration.addEventListener('updatefound', () => {
                    const newWorker = registration.installing;
                    newWorker.addEventListener('statechange', () => {
                        if (newWorker.state === 'activated' && navigator.serviceWorker.controller) {
                            console.log('Service Worker updated, reloading...');
                            window.location.reload();
                        }
                    });
                });
            })
            .catch(function(error) {
                console.log('Service Worker gagal:', error);
            });
        
        // Reload page saat service worker mengambil kontrol
        let refreshing = false;
        navigator.serviceWorker.addEventListener('controllerchange', () => {
            if (!refreshing) {
                refreshing = true;
                window.location.reload();
            }
        });
    }
}

// ==========================================
// CUSTOM SELECT FUNCTIONALITY
// ==========================================

function setupCustomSelects() {
    const customSelects = document.querySelectorAll('.custom-select');
    
    customSelects.forEach(select => {
        const trigger = select.querySelector('.custom-select-trigger');
        const options = select.querySelectorAll('.custom-select-option');
        const triggerSpan = trigger.querySelector('span');
        const selectId = select.id;
        
        // Get corresponding hidden input
        let hiddenInput;
        if (selectId === 'jenisSelect') {
            hiddenInput = document.getElementById('jenis');
        } else if (selectId === 'kategoriSelect') {
            hiddenInput = document.getElementById('kategori');
        } else if (selectId === 'filterJenisSelect') {
            hiddenInput = document.getElementById('filterJenis');
        } else if (selectId === 'filterPeriodeSelect') {
            hiddenInput = document.getElementById('filterPeriode');
        } else if (selectId === 'namaSumberSelect') {
            hiddenInput = document.getElementById('namaSumber');
        }
        
        // Toggle dropdown
        trigger.addEventListener('click', function(e) {
            e.stopPropagation();
            
            // Close other dropdowns
            document.querySelectorAll('.custom-select.active').forEach(s => {
                if (s !== select) s.classList.remove('active');
            });
            
            select.classList.toggle('active');
        });
        
        // Handle option click
        options.forEach(option => {
            option.addEventListener('click', function(e) {
                e.stopPropagation();
                
                const value = this.getAttribute('data-value');
                const text = this.textContent;
                
                // Update trigger
                triggerSpan.textContent = text;
                triggerSpan.setAttribute('data-value', value);
                
                // Update hidden input
                if (hiddenInput) {
                    hiddenInput.value = value;
                }
                
                // Update active state
                options.forEach(opt => opt.classList.remove('active'));
                this.classList.add('active');
                
                // Close dropdown
                select.classList.remove('active');
                
                // Trigger change event for filters
                if (selectId === 'filterJenisSelect') {
                    filterJenis = value;
                    renderTransactions();
                } else if (selectId === 'filterPeriodeSelect') {
                    filterPeriode = value;
                    if (filterPeriode === 'custom') {
                        showDateRangePicker();
                    } else {
                        hideDateRangePicker();
                        dateRangeStart = null;
                        dateRangeEnd = null;
                        renderTransactions();
                    }
                } else if (selectId === 'namaSumberSelect') {
                    // Handle custom source input visibility
                    const customGroup = document.getElementById('customSumberGroup');
                    if (value === 'Custom') {
                        customGroup.style.display = 'block';
                    } else {
                        customGroup.style.display = 'none';
                    }
                }
            });
        });
    });
    
    // Close dropdowns when clicking outside
    document.addEventListener('click', function() {
        document.querySelectorAll('.custom-select.active').forEach(select => {
            select.classList.remove('active');
        });
    });
}

// ==========================================
// EVENT LISTENERS
// ==========================================

function setupEventListeners() {
    // Form submit
    const form = document.getElementById('formTransaksi');
    form.addEventListener('submit', handleFormSubmit);
    
    // Setup custom selects
    setupCustomSelects();
    
    // Filter jenis transaksi (will be handled by custom select now)
    const filterJenisEl = document.getElementById('filterJenis');
    if (filterJenisEl && filterJenisEl.tagName === 'INPUT') {
        // Already handled by custom select
    } else if (filterJenisEl) {
        filterJenisEl.addEventListener('change', function(e) {
            filterJenis = e.target.value;
            renderTransactions();
        });
    }
    
    // Filter periode (will be handled by custom select now)
    const filterPeriodeEl = document.getElementById('filterPeriode');
    if (filterPeriodeEl && filterPeriodeEl.tagName === 'INPUT') {
        // Already handled by custom select
    } else if (filterPeriodeEl) {
        filterPeriodeEl.addEventListener('change', function(e) {
            filterPeriode = e.target.value;
            if (filterPeriode === 'custom') {
                showDateRangePicker();
            } else {
                hideDateRangePicker();
                dateRangeStart = null;
                dateRangeEnd = null;
                renderTransactions();
            }
        });
    }
    
    // Date range picker buttons
    document.getElementById('prevMonth').addEventListener('click', function() {
        currentCalendarMonth.setMonth(currentCalendarMonth.getMonth() - 1);
        renderCalendar();
    });
    
    document.getElementById('nextMonth').addEventListener('click', function() {
        currentCalendarMonth.setMonth(currentCalendarMonth.getMonth() + 1);
        renderCalendar();
    });
    
    document.getElementById('clearDateRange').addEventListener('click', function() {
        dateRangeStart = null;
        dateRangeEnd = null;
        renderCalendar();
        updateDateRangeInfo();
    });
    
    document.getElementById('applyDateRange').addEventListener('click', function() {
        if (dateRangeStart && dateRangeEnd) {
            renderTransactions();
            hideDateRangePicker();
        } else {
            showToast('Pilih tanggal awal dan akhir terlebih dahulu', 'warning');
        }
    });
    
    // Form sumber saldo
    const formSaldo = document.getElementById('formSumberSaldo');
    formSaldo.addEventListener('submit', handleSaldoFormSubmit);
    
    // Dropdown nama sumber - show custom input if "Custom" selected
    const namaSumberEl = document.getElementById('namaSumber');
    namaSumberEl.addEventListener('change', function(e) {
        const customGroup = document.getElementById('customSumberGroup');
        if (e.target.value === 'Custom') {
            customGroup.style.display = 'block';
            document.getElementById('namaSumberCustom').required = true;
        } else {
            customGroup.style.display = 'none';
            document.getElementById('namaSumberCustom').required = false;
        }
    });
    
    // Format nominal input dengan pemisah titik
    const nominalInput = document.getElementById('nominal');
    nominalInput.addEventListener('input', function(e) {
        formatNominalInput(e.target);
    });
    
    // Format jumlah saldo input dengan pemisah titik
    const jumlahSaldoInput = document.getElementById('jumlahSaldo');
    jumlahSaldoInput.addEventListener('input', function(e) {
        formatNominalInput(e.target);
    });
    
    // Close modal when clicking outside
    const modal = document.getElementById('saldoModal');
    modal.addEventListener('click', function(e) {
        if (e.target === modal) {
            toggleSaldoModal();
        }
    });
}

// ==========================================
// FORM HANDLING
// ==========================================

function setDefaultDate() {
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('tanggal').value = today;
}

function handleFormSubmit(e) {
    e.preventDefault();
    
    // Ambil data dari form
    const tanggal = document.getElementById('tanggal').value;
    const deskripsi = document.getElementById('deskripsi').value.trim();
    const nominalStr = document.getElementById('nominal').value.replace(/\./g, '').replace(/,/g, '.');
    const nominal = parseFloat(nominalStr);
    const jenis = document.getElementById('jenis').value;
    const kategori = document.getElementById('kategori').value;
    
    // Validasi
    if (!deskripsi || isNaN(nominal) || nominal <= 0) {
        showToast('Mohon isi semua field dengan benar!', 'error');
        return;
    }
    
    // Buat objek transaksi dengan timestamp WIB
    const now = new Date();
    const transaksi = {
        id: Date.now(), // ID unik berdasarkan timestamp
        tanggal: tanggal,
        deskripsi: deskripsi,
        nominal: nominal,
        jenis: jenis,
        kategori: kategori,
        createdAt: now.toISOString(),
        createdAtWIB: formatWaktuWIB(now)
    };
    
    // Tambahkan ke array
    transaksiList.push(transaksi);
    
    // Simpan ke localStorage
    saveDataToStorage();
    
    // Reset form
    e.target.reset();
    setDefaultDate();
    
    // Update tampilan
    renderTransactions();
    updateSummary();
    
    // Feedback ke user
    const jenisText = jenis === 'pemasukan' ? 'Pemasukan' : 'Pengeluaran';
    const icon = jenis === 'pemasukan' ? '💰' : '💸';
    showToast(`${icon} ${jenisText} ${formatRupiah(nominal)} berhasil ditambahkan`, 'success');
}

// ==========================================
// DATA PERSISTENCE (localStorage)
// ==========================================

function saveDataToStorage() {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(transaksiList));
    } catch (error) {
        console.error('Gagal menyimpan data:', error);
        showToast('Gagal menyimpan data. Storage mungkin penuh.', 'error');
    }
}

function loadDataFromStorage() {
    try {
        const data = localStorage.getItem(STORAGE_KEY);
        if (data) {
            transaksiList = JSON.parse(data);
        }
    } catch (error) {
        console.error('Gagal memuat data:', error);
        transaksiList = [];
    }
}

function loadSaldoFromStorage() {
    try {
        const data = localStorage.getItem(STORAGE_KEY_SALDO);
        if (data) {
            sumberSaldoList = JSON.parse(data);
        }
    } catch (error) {
        console.error('Gagal memuat data saldo:', error);
        sumberSaldoList = [];
    }
}

function saveSaldoToStorage() {
    try {
        localStorage.setItem(STORAGE_KEY_SALDO, JSON.stringify(sumberSaldoList));
    } catch (error) {
        console.error('Gagal menyimpan data saldo:', error);
        showToast('Gagal menyimpan data saldo. Storage mungkin penuh.', 'error');
    }
}

// ==========================================
// FILTERING
// ==========================================

function getFilteredTransactions() {
    let filtered = [...transaksiList];
    
    // Filter berdasarkan jenis
    if (filterJenis !== 'semua') {
        filtered = filtered.filter(t => t.jenis === filterJenis);
    }
    
    // Filter berdasarkan periode
    if (filterPeriode !== 'semua') {
        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        
        filtered = filtered.filter(t => {
            const transaksiDate = new Date(t.tanggal);
            
            switch(filterPeriode) {
                case 'hari-ini':
                    return transaksiDate >= today;
                    
                case 'minggu-ini':
                    const startOfWeek = new Date(today);
                    startOfWeek.setDate(today.getDate() - today.getDay());
                    return transaksiDate >= startOfWeek;
                    
                case 'bulan-ini':
                    return transaksiDate.getMonth() === now.getMonth() && 
                           transaksiDate.getFullYear() === now.getFullYear();
                
                case 'custom':
                    if (dateRangeStart && dateRangeEnd) {
                        const startParts = dateRangeStart.split('-');
                        const endParts = dateRangeEnd.split('-');
                        const startDate = new Date(parseInt(startParts[0]), parseInt(startParts[1]) - 1, parseInt(startParts[2]));
                        const endDate = new Date(parseInt(endParts[0]), parseInt(endParts[1]) - 1, parseInt(endParts[2]));
                        
                        // Parse transaksi date dengan format yang sama
                        const tglParts = t.tanggal.split('-');
                        const transaksiDateParsed = new Date(parseInt(tglParts[0]), parseInt(tglParts[1]) - 1, parseInt(tglParts[2]));
                        
                        return transaksiDateParsed >= startDate && transaksiDateParsed <= endDate;
                    }
                    return true;
                    
                default:
                    return true;
            }
        });
    }
    
    // Urutkan berdasarkan tanggal terbaru
    filtered.sort((a, b) => new Date(b.tanggal) - new Date(a.tanggal));
    
    return filtered;
}

// ==========================================
// RENDERING
// ==========================================

function renderTransactions() {
    const container = document.getElementById('daftarTransaksi');
    const emptyState = document.getElementById('emptyState');
    const filtered = getFilteredTransactions();
    
    // Clear container
    container.innerHTML = '';
    
    // Tampilkan empty state jika tidak ada data
    if (filtered.length === 0) {
        emptyState.classList.remove('hidden');
        container.style.display = 'none';
        return;
    }
    
    emptyState.classList.add('hidden');
    container.style.display = 'flex';
    
    // Group transaksi berdasarkan tanggal
    const groupedByDate = {};
    filtered.forEach(transaksi => {
        const dateKey = transaksi.tanggal;
        if (!groupedByDate[dateKey]) {
            groupedByDate[dateKey] = [];
        }
        groupedByDate[dateKey].push(transaksi);
    });
    
    // Urutkan tanggal (terbaru dulu)
    const sortedDates = Object.keys(groupedByDate).sort((a, b) => new Date(b) - new Date(a));
    
    // Render per grup tanggal
    sortedDates.forEach(dateKey => {
        // Tambahkan header tanggal
        const dateHeader = document.createElement('div');
        dateHeader.className = 'date-separator';
        dateHeader.innerHTML = `
            <span class="date-separator-line"></span>
            <span class="date-separator-text">${formatTanggalLengkap(dateKey)}</span>
            <span class="date-separator-line"></span>
        `;
        container.appendChild(dateHeader);
        
        // Render transaksi dalam grup ini
        groupedByDate[dateKey].forEach(transaksi => {
            const item = createTransactionElement(transaksi);
            container.appendChild(item);
        });
    });
}

function createTransactionElement(transaksi) {
    const div = document.createElement('div');
    div.className = `transaction-item ${transaksi.jenis}`;
    
    const formatNominal = transaksi.jenis === 'pemasukan' 
        ? `+${formatRupiah(transaksi.nominal)}`
        : `-${formatRupiah(transaksi.nominal)}`;
    
    // Format waktu WIB
    const waktuWIB = transaksi.createdAtWIB || (transaksi.createdAt ? formatWaktuWIB(new Date(transaksi.createdAt)) : '');
    
    div.innerHTML = `
        <div class="transaction-info">
            <div class="transaction-header">
                <div class="transaction-desc">${escapeHtml(transaksi.deskripsi)}</div>
                <div class="transaction-amount ${transaksi.jenis}">${formatNominal}</div>
            </div>
            <div class="transaction-meta">
                <span class="transaction-kategori">🏷️ ${transaksi.kategori}</span>
                ${waktuWIB ? `<span class="transaction-waktu">🕐 ${waktuWIB}</span>` : ''}
            </div>
        </div>
        <button class="btn-delete" onclick="deleteTransaksi(${transaksi.id})">Hapus</button>
    `;
    
    return div;
}

function updateSummary() {
    // Hitung total pemasukan dan pengeluaran dari transaksi
    const pemasukan = transaksiList
        .filter(t => t.jenis === 'pemasukan')
        .reduce((sum, t) => sum + t.nominal, 0);
    
    const pengeluaran = transaksiList
        .filter(t => t.jenis === 'pengeluaran')
        .reduce((sum, t) => sum + t.nominal, 0);
    
    // Hitung total saldo manual dari semua sumber
    const saldoManual = sumberSaldoList.reduce((sum, s) => sum + s.jumlah, 0);
    
    // Saldo akhir = saldo manual + pemasukan - pengeluaran
    const saldo = saldoManual + pemasukan - pengeluaran;
    
    // Update tampilan
    document.getElementById('totalPemasukan').textContent = formatRupiah(pemasukan);
    document.getElementById('totalPengeluaran').textContent = formatRupiah(pengeluaran);
    document.getElementById('saldoAkhir').textContent = formatRupiah(saldo);
}

// ==========================================
// DELETE TRANSACTION
// ==========================================

function deleteTransaksi(id) {
    // Cari transaksi untuk ditampilkan di konfirmasi
    const transaksi = transaksiList.find(t => t.id === id);
    if (!transaksi) return;
    
    const jenisText = transaksi.jenis === 'pemasukan' ? 'Pemasukan' : 'Pengeluaran';
    
    // Tampilkan konfirmasi
    showConfirmDialog(
        `Yakin ingin menghapus ${jenisText.toLowerCase()} "${transaksi.deskripsi}" sebesar ${formatRupiah(transaksi.nominal)}?`,
        function() {
            // Jika OK, hapus
            transaksiList = transaksiList.filter(t => t.id !== id);
            
            // Simpan ke localStorage
            saveDataToStorage();
            
            // Update tampilan
            renderTransactions();
            updateSummary();
            
            // Feedback
            showToast(`🗑️ ${jenisText} berhasil dihapus`, 'success');
        }
    );
}

// ==========================================
// UTILITY FUNCTIONS
// ==========================================

function formatRupiah(angka) {
    // Support untuk desimal
    return 'Rp ' + angka.toLocaleString('id-ID', { 
        minimumFractionDigits: 0,
        maximumFractionDigits: 2 
    });
}

function formatTanggal(tanggalStr) {
    const options = { day: '2-digit', month: 'short', year: 'numeric' };
    const tanggal = new Date(tanggalStr + 'T00:00:00');
    return tanggal.toLocaleDateString('id-ID', options);
}

function formatTanggalLengkap(tanggalStr) {
    const tanggal = new Date(tanggalStr + 'T00:00:00');
    const hari = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
    const bulan = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
    
    const namaHari = hari[tanggal.getDay()];
    const tgl = tanggal.getDate();
    const namaBulan = bulan[tanggal.getMonth()];
    const tahun = tanggal.getFullYear();
    
    // Cek apakah hari ini
    const today = new Date();
    const isToday = tanggal.getDate() === today.getDate() && 
                    tanggal.getMonth() === today.getMonth() && 
                    tanggal.getFullYear() === today.getFullYear();
    
    if (isToday) {
        return `Hari Ini - ${namaHari}, ${tgl} ${namaBulan} ${tahun}`;
    }
    
    return `${namaHari}, ${tgl} ${namaBulan} ${tahun}`;
}

// ==========================================
// PIN MANAGEMENT
// ==========================================

function showPinModal() {
    const modal = document.getElementById('pinModal');
    const title = document.getElementById('pinTitle');
    const subtitle = document.getElementById('pinSubtitle');
    const resetBtn = document.getElementById('btnResetPin');
    const closeBtn = document.getElementById('pinCloseBtn');
    
    // Setup tampilan berdasarkan mode
    if (pinMode === 'setup') {
        title.textContent = 'Buat PIN Baru';
        subtitle.textContent = 'Buat PIN 4 digit untuk keamanan aplikasi';
        resetBtn.style.display = 'none';
        // Tampilkan tombol close jika sedang mengubah PIN (bukan setup awal)
        const savedPin = localStorage.getItem(STORAGE_KEY_PIN);
        closeBtn.style.display = savedPin ? 'block' : 'none';
    } else if (pinMode === 'verify') {
        title.textContent = 'Masukkan PIN';
        subtitle.textContent = 'Gunakan PIN untuk membuka aplikasi';
        resetBtn.style.display = 'block';
        closeBtn.style.display = 'none';
    } else if (pinMode === 'change') {
        title.textContent = 'PIN Lama';
        subtitle.textContent = 'Masukkan PIN lama Anda';
        resetBtn.style.display = 'none';
        closeBtn.style.display = 'block';
    } else if (pinMode === 'confirm') {
        title.textContent = 'Konfirmasi PIN Baru';
        subtitle.textContent = 'Masukkan ulang PIN baru Anda';
        resetBtn.style.display = 'none';
        closeBtn.style.display = 'block';
    }
    
    modal.classList.add('active');
    currentPinInput = '';
    updatePinDots();
    clearPinError();
    
    // Setup keypad listeners
    setupPinKeypad();
}

function setupPinKeypad() {
    const keys = document.querySelectorAll('.pin-key');
    
    keys.forEach(key => {
        // Remove old listeners
        const newKey = key.cloneNode(true);
        key.parentNode.replaceChild(newKey, key);
    });
    
    // Add new listeners
    document.querySelectorAll('.pin-key').forEach(key => {
        key.addEventListener('click', function() {
            const value = this.getAttribute('data-value');
            const action = this.getAttribute('data-action');
            
            if (value !== null) {
                handlePinInput(value);
            } else if (action === 'delete') {
                handlePinDelete();
            }
        });
    });
    
    // Reset PIN button
    document.getElementById('btnResetPin').addEventListener('click', handleResetPin);
}

function handlePinInput(digit) {
    if (currentPinInput.length < 4) {
        currentPinInput += digit;
        updatePinDots();
        
        if (currentPinInput.length === 4) {
            setTimeout(() => {
                validatePin();
            }, 300);
        }
    }
}

function handlePinDelete() {
    if (currentPinInput.length > 0) {
        currentPinInput = currentPinInput.slice(0, -1);
        updatePinDots();
        clearPinError();
    }
}

function updatePinDots() {
    for (let i = 1; i <= 4; i++) {
        const dot = document.getElementById(`dot${i}`);
        if (i <= currentPinInput.length) {
            dot.classList.add('filled');
        } else {
            dot.classList.remove('filled');
        }
    }
}

function validatePin() {
    const savedPin = localStorage.getItem(STORAGE_KEY_PIN);
    
    if (pinMode === 'setup') {
        // Mode setup: simpan PIN sementara untuk konfirmasi
        tempPin = currentPinInput;
        pinMode = 'confirm';
        currentPinInput = '';
        updatePinDots();
        const title = document.getElementById('pinTitle');
        const subtitle = document.getElementById('pinSubtitle');
        title.textContent = 'Konfirmasi PIN';
        subtitle.textContent = 'Masukkan ulang PIN baru Anda';
        clearPinError();
        
    } else if (pinMode === 'confirm') {
        // Mode konfirmasi: cek apakah PIN cocok dengan PIN sementara
        if (currentPinInput === tempPin) {
            // PIN cocok, simpan
            localStorage.setItem(STORAGE_KEY_PIN, currentPinInput);
            hidePinModal();
            initializeApp();
            showToast('PIN berhasil dibuat!', 'success');
        } else {
            // PIN tidak cocok
            showPinError('PIN tidak cocok. Coba lagi.');
            currentPinInput = '';
            tempPin = '';
            pinMode = 'setup';
            setTimeout(() => {
                const title = document.getElementById('pinTitle');
                const subtitle = document.getElementById('pinSubtitle');
                title.textContent = 'Buat PIN Baru';
                subtitle.textContent = 'Buat PIN 4 digit untuk keamanan aplikasi';
                updatePinDots();
            }, 1000);
        }
        
    } else if (pinMode === 'verify') {
        // Mode verify: cek PIN dengan yang tersimpan
        if (currentPinInput === savedPin) {
            // PIN benar
            hidePinModal();
            initializeApp();
        } else {
            // PIN salah
            showPinError('PIN salah. Coba lagi.');
            currentPinInput = '';
            updatePinDots();
        }
        
    } else if (pinMode === 'change') {
        // Mode change: verifikasi PIN lama
        if (currentPinInput === savedPin) {
            // PIN lama benar, minta PIN baru
            tempPin = '';
            currentPinInput = '';
            pinMode = 'setup';
            const title = document.getElementById('pinTitle');
            const subtitle = document.getElementById('pinSubtitle');
            title.textContent = 'Buat PIN Baru';
            subtitle.textContent = 'Buat PIN 4 digit baru';
            updatePinDots();
            clearPinError();
        } else {
            // PIN lama salah
            showPinError('PIN lama salah. Coba lagi.');
            currentPinInput = '';
            updatePinDots();
        }
    }
}

function showPinError(message) {
    const errorEl = document.getElementById('pinError');
    errorEl.textContent = message;
}

function clearPinError() {
    const errorEl = document.getElementById('pinError');
    errorEl.textContent = '';
}

function hidePinModal() {
    const modal = document.getElementById('pinModal');
    modal.classList.remove('active');
}

function handleResetPin() {
    const confirmed = confirm('⚠️ Reset PIN akan menghapus semua data aplikasi. Lanjutkan?');
    
    if (confirmed) {
        // Hapus semua data
        localStorage.removeItem(STORAGE_KEY_PIN);
        localStorage.removeItem(STORAGE_KEY);
        localStorage.removeItem(STORAGE_KEY_SALDO);
        
        // Reload halaman
        window.location.reload();
    }
}

function showChangePinModal() {
    pinMode = 'change';
    currentPinInput = '';
    showPinModal();
}

function cancelPinChange() {
    // Reset state PIN
    currentPinInput = '';
    tempPin = '';
    pinMode = 'verify';
    
    // Tutup modal PIN
    hidePinModal();
    
    // Tampilkan notifikasi
    showToast('Perubahan PIN dibatalkan', 'warning', 'Dibatalkan');
}

function showNotification(message, type = 'info') {
    // Implementasi notifikasi sederhana
    const notification = document.createElement('div');
    notification.className = 'notification notification-' + type;
    notification.textContent = message;
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 16px 24px;
        background: ${type === 'success' ? 'var(--success-color)' : 'var(--primary-color)'};
        color: white;
        border-radius: 12px;
        box-shadow: 0 8px 24px rgba(0, 0, 0, 0.2);
        z-index: 10001;
        animation: slideInRight 0.3s ease;
    `;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.style.animation = 'slideOutRight 0.3s ease';
        setTimeout(() => {
            document.body.removeChild(notification);
        }, 300);
    }, 3000);
}

function formatWaktuWIB(date) {
    // Konversi ke WIB (UTC+7)
    const wibDate = new Date(date.getTime() + (7 * 60 * 60 * 1000));
    
    const jam = wibDate.getUTCHours().toString().padStart(2, '0');
    const menit = wibDate.getUTCMinutes().toString().padStart(2, '0');
    const detik = wibDate.getUTCSeconds().toString().padStart(2, '0');
    
    return `${jam}:${menit}:${detik} WIB`;
}

function formatNominalInput(input) {
    // Ambil nilai tanpa format
    let value = input.value.replace(/\./g, '').replace(/,/g, '.');
    
    // Simpan posisi kursor
    const cursorPosition = input.selectionStart;
    const oldLength = input.value.length;
    
    // Cek apakah ada desimal
    const parts = value.split('.');
    let integerPart = parts[0];
    const decimalPart = parts[1];
    
    // Format bagian integer dengan pemisah titik
    integerPart = integerPart.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
    
    // Gabungkan kembali dengan desimal jika ada
    let formattedValue = integerPart;
    if (decimalPart !== undefined) {
        formattedValue += ',' + decimalPart;
    }
    
    // Set nilai baru
    input.value = formattedValue;
    
    // Restore posisi kursor
    const newLength = input.value.length;
    const newCursorPosition = cursorPosition + (newLength - oldLength);
    input.setSelectionRange(newCursorPosition, newCursorPosition);
}

function escapeHtml(text) {
    const map = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;'
    };
    return text.replace(/[&<>"']/g, m => map[m]);
}

function showFeedback(message) {
    // Gunakan toast notification yang lebih bagus
    showToast(message, 'success');
}

// ==========================================
// TOAST NOTIFICATION SYSTEM
// ==========================================

// ==========================================
// SECURITY SETTINGS
// ==========================================

function toggleSecurityModal() {
    const modal = document.getElementById('securityModal');
    modal.classList.toggle('active');
}

function loadSecurityPreference() {
    const isCapacitor = window.Capacitor && window.Capacitor.isNativePlatform && window.Capacitor.isNativePlatform();
    
    if (!isCapacitor) {
        // Di browser, hide tombol settings
        const btnSettings = document.querySelector('.btn-security-settings');
        if (btnSettings) {
            btnSettings.style.display = 'none';
        }
        return;
    }
    
    // Load preference dari localStorage
    const securityEnabled = localStorage.getItem(STORAGE_KEY_SECURITY);
    const checkbox = document.getElementById('biometricToggle');
    
    if (checkbox) {
        checkbox.checked = securityEnabled === 'true';
    }
    
    // Load reminder preference
    loadReminderPreference();
}

function toggleBiometricSecurity(checked) {
    // Simpan preference ke localStorage
    localStorage.setItem(STORAGE_KEY_SECURITY, checked ? 'true' : 'false');
    
    if (checked) {
        showToast('Keamanan biometric diaktifkan', 'success', 'Berhasil!');
    } else {
        showToast('Keamanan biometric dinonaktifkan', 'success', 'Berhasil!');
    }
}

// ==========================================
// REMINDER NOTIFICATION FUNCTIONALITY
// ==========================================

async function toggleReminder(checked) {
    const isCapacitor = window.Capacitor && window.Capacitor.isNativePlatform && window.Capacitor.isNativePlatform();
    
    if (!isCapacitor) {
        showToast('Reminder hanya tersedia di Android', 'warning');
        const reminderToggle = document.getElementById('reminderToggle');
        if (reminderToggle) reminderToggle.checked = false;
        return;
    }
    
    const timeSettings = document.getElementById('reminderTimeSettings');
    
    if (checked) {
        // Request permission
        const { LocalNotifications } = window.Capacitor.Plugins;
        
        try {
            const permission = await LocalNotifications.requestPermissions();
            
            if (permission.display === 'granted') {
                // Show time settings
                if (timeSettings) timeSettings.style.display = 'block';
                
                // Save preference
                localStorage.setItem(STORAGE_KEY_REMINDER, 'true');
                
                // Schedule notification with saved time
                const savedTime = localStorage.getItem(STORAGE_KEY_REMINDER_TIME) || '20:00';
                await scheduleReminderNotification(savedTime);
                
                showToast('Reminder diaktifkan', 'success');
            } else {
                showToast('Izin notifikasi diperlukan', 'error');
                const reminderToggle = document.getElementById('reminderToggle');
                if (reminderToggle) reminderToggle.checked = false;
            }
        } catch (error) {
            console.error('Error requesting notification permission:', error);
            showToast('Gagal mengaktifkan reminder', 'error');
            const reminderToggle = document.getElementById('reminderToggle');
            if (reminderToggle) reminderToggle.checked = false;
        }
    } else {
        // Hide time settings
        if (timeSettings) timeSettings.style.display = 'none';
        
        // Cancel notifications
        await cancelReminderNotification();
        
        // Save preference
        localStorage.setItem(STORAGE_KEY_REMINDER, 'false');
        
        showToast('Reminder dinonaktifkan', 'success');
    }
}

async function saveReminderTime() {
    const timeInput = document.getElementById('reminderTime');
    const time = timeInput.value;
    
    if (!time) {
        showToast('Pilih waktu terlebih dahulu', 'warning');
        return;
    }
    
    // Save time to localStorage
    localStorage.setItem(STORAGE_KEY_REMINDER_TIME, time);
    
    // Reschedule notification (sudah show toast di dalam fungsi ini)
    await scheduleReminderNotification(time);
}

async function scheduleReminderNotification(time) {
    const isCapacitor = window.Capacitor && window.Capacitor.isNativePlatform && window.Capacitor.isNativePlatform();
    
    if (!isCapacitor) return;
    
    const { LocalNotifications } = window.Capacitor.Plugins;
    
    try {
        // Request permissions first
        const permResult = await LocalNotifications.requestPermissions();
        if (permResult.display !== 'granted') {
            showToast('⚠️ Izin notifikasi ditolak', 'error');
            return;
        }
        
        // Cancel ALL existing notifications first to prevent duplicates
        try {
            const pending = await LocalNotifications.getPending();
            if (pending.notifications && pending.notifications.length > 0) {
                await LocalNotifications.cancel({ 
                    notifications: pending.notifications.map(n => ({ id: n.id })) 
                });
            }
        } catch (e) {
            console.log('No pending notifications to cancel');
        }
        
        // Parse time (format HH:MM)
        const [hours, minutes] = time.split(':').map(Number);
        
        // Create date for notification
        const now = new Date();
        const notificationDate = new Date(
            now.getFullYear(),
            now.getMonth(),
            now.getDate(),
            hours,
            minutes,
            0,
            0 // Set milliseconds to 0
        );
        
        // If time has passed today, schedule for tomorrow
        if (notificationDate <= now) {
            notificationDate.setDate(notificationDate.getDate() + 1);
        }
        
        console.log('📅 Scheduling notification for:', notificationDate.toLocaleString());
        
        // Schedule notification with higher priority
        await LocalNotifications.schedule({
            notifications: [
                {
                    id: 1,
                    title: "📝 Jangan Lupa Catat Keuangan!",
                    body: "Tap untuk buka app dan catat transaksi hari ini",
                    schedule: {
                        at: notificationDate,
                        repeats: true,
                        every: 'day',
                        allowWhileIdle: true
                    },
                    sound: 'default',
                    importance: 5,
                    priority: 2,
                    actionTypeId: 'OPEN_APP',
                    extra: {
                        action: 'open_app',
                        timestamp: notificationDate.getTime() // Track schedule time
                    },
                    channelId: 'reminders',
                    autoCancel: true, // Auto dismiss setelah di-tap
                    ongoing: false // Ensure notification can be dismissed
                }
            ]
        });
        
        console.log('✅ Reminder scheduled for', time);
        showToast(`⏰ Reminder berhasil diatur untuk jam ${time}`, 'success');
    } catch (error) {
        console.error('Error scheduling notification:', error);
        showToast('Gagal menjadwalkan reminder: ' + error.message, 'error');
    }
}

async function cancelReminderNotification() {
    const isCapacitor = window.Capacitor && window.Capacitor.isNativePlatform && window.Capacitor.isNativePlatform();
    
    if (!isCapacitor) return;
    
    const { LocalNotifications } = window.Capacitor.Plugins;
    
    try {
        await LocalNotifications.cancel({ notifications: [{ id: 1 }] });
        console.log('✅ Reminder cancelled');
    } catch (error) {
        console.error('Error cancelling notification:', error);
    }
}

function loadReminderPreference() {
    const isCapacitor = window.Capacitor && window.Capacitor.isNativePlatform && window.Capacitor.isNativePlatform();
    
    if (!isCapacitor) return;
    
    // Load reminder enabled state
    const reminderEnabled = localStorage.getItem(STORAGE_KEY_REMINDER);
    const reminderToggle = document.getElementById('reminderToggle');
    const timeSettings = document.getElementById('reminderTimeSettings');
    
    if (reminderToggle) {
        reminderToggle.checked = reminderEnabled === 'true';
    }
    
    if (timeSettings) {
        timeSettings.style.display = reminderEnabled === 'true' ? 'block' : 'none';
    }
    
    // Load saved time
    const savedTime = localStorage.getItem(STORAGE_KEY_REMINDER_TIME);
    const timeInput = document.getElementById('reminderTime');
    
    if (timeInput && savedTime) {
        timeInput.value = savedTime;
    }
}

// Global variable untuk track listener agar tidak duplicate
let notificationListenerAdded = false;
let lastNotificationTapTime = 0;

function setupNotificationListener() {
    const isCapacitor = window.Capacitor && window.Capacitor.isNativePlatform && window.Capacitor.isNativePlatform();
    
    if (!isCapacitor) return;
    
    const { LocalNotifications } = window.Capacitor.Plugins;
    
    if (!LocalNotifications) return;
    
    // Prevent duplicate listener registration
    if (notificationListenerAdded) {
        console.log('⚠️ Notification listener already added, skipping...');
        return;
    }
    
    // Listen for notification action (when user taps notification)
    LocalNotifications.addListener('localNotificationActionPerformed', async (notificationAction) => {
        console.log('Notification tapped:', notificationAction);
        
        // Debounce: prevent multiple rapid taps
        const now = Date.now();
        if (now - lastNotificationTapTime < 2000) {
            console.log('⚠️ Ignoring duplicate tap (debounced)');
            return;
        }
        lastNotificationTapTime = now;
        
        // Dismiss/clear notification dari status bar setelah di-tap
        try {
            const delivered = await LocalNotifications.getDeliveredNotifications();
            if (delivered.notifications && delivered.notifications.length > 0) {
                // Clear all delivered notifications
                await LocalNotifications.removeDeliveredNotifications({
                    notifications: delivered.notifications.map(n => ({ id: n.id }))
                });
                console.log('✅ Notification cleared from status bar');
            }
        } catch (error) {
            console.log('Error clearing notifications:', error);
        }
        
        // Show toast HANYA setelah user tap notifikasi (sekali)
        showToast('Jangan lupa catat transaksi hari ini! 📝', 'info', 'Reminder');
    });
    
    notificationListenerAdded = true;
    console.log('✅ Notification listener initialized');
}

// ==========================================

function showToast(message, type = 'success', title = '') {
    // Tentukan title dan icon berdasarkan type
    let toastTitle = title;
    let icon = '';
    
    if (!toastTitle) {
        switch(type) {
            case 'success':
                toastTitle = 'Berhasil!';
                icon = '✓';
                break;
            case 'error':
                toastTitle = 'Error!';
                icon = '✕';
                break;
            case 'warning':
                toastTitle = 'Perhatian!';
                icon = '⚠';
                break;
            default:
                toastTitle = 'Info';
                icon = 'ℹ';
        }
    }
    
    // Buat elemen toast
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    
    toast.innerHTML = `
        <div class="toast-icon">${icon}</div>
        <div class="toast-content">
            <div class="toast-title">${escapeHtml(toastTitle)}</div>
            <div class="toast-message">${escapeHtml(message)}</div>
        </div>
        <button class="toast-close" onclick="this.parentElement.remove()">×</button>
    `;
    
    // Tambahkan ke body
    document.body.appendChild(toast);
    
    // Auto remove setelah 3 detik
    setTimeout(() => {
        toast.classList.add('hiding');
        setTimeout(() => {
            if (toast.parentElement) {
                toast.remove();
            }
        }, 300);
    }, 3000);
    
    // Hapus jika sudah ada lebih dari 3 toast
    const toasts = document.querySelectorAll('.toast');
    if (toasts.length > 3) {
        toasts[0].remove();
    }
}

// ==========================================
// CONFIRM DIALOG
// ==========================================

function showConfirmDialog(message, onConfirm) {
    // Buat overlay
    const overlay = document.createElement('div');
    overlay.className = 'confirm-overlay';
    
    // Buat dialog
    const dialog = document.createElement('div');
    dialog.className = 'confirm-dialog';
    
    dialog.innerHTML = `
        <div class="confirm-icon">⚠️</div>
        <div class="confirm-message">${escapeHtml(message)}</div>
        <div class="confirm-buttons">
            <button class="confirm-btn confirm-cancel">Batal</button>
            <button class="confirm-btn confirm-ok">OK</button>
        </div>
    `;
    
    overlay.appendChild(dialog);
    document.body.appendChild(overlay);
    
    // Trigger animation
    setTimeout(() => {
        overlay.classList.add('active');
    }, 10);
    
    // Handle button clicks
    const cancelBtn = dialog.querySelector('.confirm-cancel');
    const okBtn = dialog.querySelector('.confirm-ok');
    
    function closeDialog() {
        overlay.classList.remove('active');
        setTimeout(() => {
            overlay.remove();
        }, 300);
    }
    
    cancelBtn.addEventListener('click', closeDialog);
    
    okBtn.addEventListener('click', function() {
        closeDialog();
        if (onConfirm) onConfirm();
    });
    
    // Close on overlay click
    overlay.addEventListener('click', function(e) {
        if (e.target === overlay) {
            closeDialog();
        }
    });
}

// ==========================================
// EXPORT DATA (Optional - untuk backup)
// ==========================================

// Fungsi untuk export data sebagai JSON (bisa dipanggil dari console)
function exportData() {
    const dataStr = JSON.stringify(transaksiList, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `laporan-keuangan-${new Date().toISOString().split('T')[0]}.json`;
    link.click();
    URL.revokeObjectURL(url);
}

// Fungsi untuk import data dari JSON (bisa dipanggil dari console)
function importData(jsonString) {
    try {
        const data = JSON.parse(jsonString);
        if (Array.isArray(data)) {
            transaksiList = data;
            saveDataToStorage();
            renderTransactions();
            updateSummary();
            showToast('Data berhasil diimport!', 'success');
        }
    } catch (error) {
        showToast('Format data tidak valid!', 'error');
    }
}

// ==========================================
// SALDO MANUAL FUNCTIONS
// ==========================================

function toggleSaldoModal() {
    const modal = document.getElementById('saldoModal');
    modal.classList.toggle('active');
}

function handleSaldoFormSubmit(e) {
    e.preventDefault();
    
    // Ambil data dari form
    let namaSumber = document.getElementById('namaSumber').value;
    const jumlahSaldoStr = document.getElementById('jumlahSaldo').value.replace(/\./g, '').replace(/,/g, '.');
    const jumlahSaldo = parseFloat(jumlahSaldoStr);
    
    // Jika Custom, gunakan input custom
    if (namaSumber === 'Custom') {
        namaSumber = document.getElementById('namaSumberCustom').value.trim();
    }
    
    // Validasi
    if (!namaSumber || isNaN(jumlahSaldo) || jumlahSaldo < 0) {
        showToast('Mohon isi semua field dengan benar!', 'error');
        return;
    }
    
    // Cek apakah sumber sudah ada
    const existingIndex = sumberSaldoList.findIndex(s => s.nama.toLowerCase() === namaSumber.toLowerCase());
    
    let isUpdate = false;
    if (existingIndex !== -1) {
        // Tampilkan konfirmasi untuk update
        showConfirmDialog(
            `Sumber "${namaSumber}" sudah ada dengan saldo ${formatRupiah(sumberSaldoList[existingIndex].jumlah)}. Update menjadi ${formatRupiah(jumlahSaldo)}?`,
            function() {
                // Jika OK, update
                sumberSaldoList[existingIndex].jumlah = jumlahSaldo;
                sumberSaldoList[existingIndex].updatedAt = new Date().toISOString();
                
                // Simpan ke localStorage
                saveSaldoToStorage();
                
                // Reset form
                e.target.reset();
                document.getElementById('customSumberGroup').style.display = 'none';
                
                // Update tampilan
                renderSumberSaldo();
                renderSaldoBreakdown();
                updateSummary();
                
                // Feedback
                showToast(`${namaSumber} berhasil diupdate menjadi ${formatRupiah(jumlahSaldo)}`, 'success');
            }
        );
        return;
    } else {
        // Buat objek sumber saldo baru
        const sumberSaldo = {
            id: Date.now(),
            nama: namaSumber,
            jumlah: jumlahSaldo,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };
        
        // Tambahkan ke array
        sumberSaldoList.push(sumberSaldo);
    }
    
    // Simpan ke localStorage
    saveSaldoToStorage();
    
    // Reset form
    e.target.reset();
    document.getElementById('customSumberGroup').style.display = 'none';
    
    // Update tampilan
    renderSumberSaldo();
    renderSaldoBreakdown();
    updateSummary();
    
    // Feedback
    showToast(`${namaSumber} - ${formatRupiah(jumlahSaldo)} berhasil ditambahkan`, 'success');
}

function deleteSumberSaldo(id) {
    // Cari nama sumber untuk ditampilkan di konfirmasi
    const sumber = sumberSaldoList.find(s => s.id === id);
    if (!sumber) return;
    
    // Tampilkan konfirmasi
    showConfirmDialog(
        `Yakin ingin menghapus "${sumber.nama}" dengan saldo ${formatRupiah(sumber.jumlah)}?`,
        function() {
            // Jika OK, hapus
            sumberSaldoList = sumberSaldoList.filter(s => s.id !== id);
            
            // Simpan ke localStorage
            saveSaldoToStorage();
            
            // Update tampilan
            renderSumberSaldo();
            renderSaldoBreakdown();
            updateSummary();
            
            // Feedback
            showToast(`${sumber.nama} berhasil dihapus`, 'success');
        }
    );
}

function renderSumberSaldo() {
    const container = document.getElementById('daftarSumberSaldo');
    
    // Clear container
    container.innerHTML = '';
    
    // Tampilkan empty state jika tidak ada data
    if (sumberSaldoList.length === 0) {
        container.innerHTML = '<div class="empty-sumber">Belum ada sumber saldo. Tambahkan di atas.</div>';
        return;
    }
    
    // Render setiap sumber saldo
    sumberSaldoList.forEach(sumber => {
        const item = document.createElement('div');
        item.className = 'sumber-item';
        
        item.innerHTML = `
            <div class="sumber-item-info">
                <div class="sumber-item-name">${escapeHtml(sumber.nama)}</div>
                <div class="sumber-item-amount">${formatRupiah(sumber.jumlah)}</div>
            </div>
            <button class="btn-delete-sumber" onclick="deleteSumberSaldo(${sumber.id})">Hapus</button>
        `;
        
        container.appendChild(item);
    });
}

function renderSaldoBreakdown() {
    const container = document.getElementById('saldoBreakdown');
    
    // Clear container
    container.innerHTML = '';
    
    // Jika tidak ada sumber saldo, sembunyikan
    if (sumberSaldoList.length === 0) {
        container.style.display = 'none';
        return;
    }
    
    container.style.display = 'block';
    
    // Header
    const header = document.createElement('h3');
    header.textContent = '💳 Saldo per Sumber';
    container.appendChild(header);
    
    // Render setiap sumber
    sumberSaldoList.forEach(sumber => {
        const item = document.createElement('div');
        item.className = 'saldo-source-item';
        
        item.innerHTML = `
            <span class="saldo-source-name">${escapeHtml(sumber.nama)}</span>
            <span class="saldo-source-amount">${formatRupiah(sumber.jumlah)}</span>
        `;
        
        container.appendChild(item);
    });
    
    // Total saldo manual
    const totalSaldoManual = sumberSaldoList.reduce((sum, s) => sum + s.jumlah, 0);
    const totalItem = document.createElement('div');
    totalItem.className = 'saldo-source-item';
    totalItem.style.fontWeight = '700';
    totalItem.style.borderTop = '2px solid var(--border-color)';
    totalItem.style.paddingTop = '12px';
    totalItem.style.marginTop = '8px';
    
    totalItem.innerHTML = `
        <span class="saldo-source-name">Total Saldo</span>
        <span class="saldo-source-amount">${formatRupiah(totalSaldoManual)}</span>
    `;
    
    container.appendChild(totalItem);
}

// ==========================================
// DATE RANGE PICKER
// ==========================================

function showDateRangePicker() {
    // Set tanggal start ke hari ini jika belum ada yang dipilih
    if (!dateRangeStart && !dateRangeEnd) {
        const today = new Date();
        const year = today.getFullYear();
        const month = today.getMonth() + 1;
        const day = today.getDate();
        dateRangeStart = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        
        // Set currentCalendarMonth ke bulan ini
        currentCalendarMonth = new Date();
    }
    
    document.getElementById('dateRangePicker').style.display = 'block';
    renderCalendar();
    updateDateRangeInfo();
}

function hideDateRangePicker() {
    document.getElementById('dateRangePicker').style.display = 'none';
}

function renderCalendar() {
    const calendar = document.getElementById('calendar');
    const title = document.getElementById('calendarTitle');
    
    const year = currentCalendarMonth.getFullYear();
    const month = currentCalendarMonth.getMonth();
    
    // Update title
    const monthNames = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 
                        'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
    title.textContent = `${monthNames[month]} ${year}`;
    
    // Get first day of month and total days
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    
    // Clear calendar
    calendar.innerHTML = '';
    
    // Add day headers
    const dayHeaders = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];
    dayHeaders.forEach(day => {
        const header = document.createElement('div');
        header.className = 'calendar-day-header';
        header.textContent = day;
        calendar.appendChild(header);
    });
    
    // Add empty cells for days before first day
    for (let i = 0; i < firstDay; i++) {
        const emptyCell = document.createElement('div');
        emptyCell.className = 'calendar-day empty';
        calendar.appendChild(emptyCell);
    }
    
    // Add day cells
    for (let day = 1; day <= daysInMonth; day++) {
        const dayCell = document.createElement('div');
        dayCell.className = 'calendar-day';
        dayCell.textContent = day;
        
        // Format date sebagai YYYY-MM-DD tanpa timezone issues
        const cellDateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        const cellDate = new Date(year, month, day);
        
        // Check if this date is selected
        if (dateRangeStart && cellDateStr === dateRangeStart) {
            dayCell.classList.add('selected', 'start');
        }
        if (dateRangeEnd && cellDateStr === dateRangeEnd) {
            dayCell.classList.add('selected', 'end');
        }
        
        // Check if this date is in range
        if (dateRangeStart && dateRangeEnd) {
            const startParts = dateRangeStart.split('-');
            const endParts = dateRangeEnd.split('-');
            const start = new Date(parseInt(startParts[0]), parseInt(startParts[1]) - 1, parseInt(startParts[2]));
            const end = new Date(parseInt(endParts[0]), parseInt(endParts[1]) - 1, parseInt(endParts[2]));
            if (cellDate >= start && cellDate <= end) {
                dayCell.classList.add('in-range');
            }
        }
        
        // Add click handler
        dayCell.addEventListener('click', function() {
            handleDateClick(cellDateStr);
        });
        
        calendar.appendChild(dayCell);
    }
}

function handleDateClick(dateStr) {
    if (!dateRangeStart || (dateRangeStart && dateRangeEnd)) {
        // First click or reset after both selected
        dateRangeStart = dateStr;
        dateRangeEnd = null;
    } else {
        // Second click
        const startParts = dateRangeStart.split('-');
        const clickedParts = dateStr.split('-');
        const start = new Date(parseInt(startParts[0]), parseInt(startParts[1]) - 1, parseInt(startParts[2]));
        const clicked = new Date(parseInt(clickedParts[0]), parseInt(clickedParts[1]) - 1, parseInt(clickedParts[2]));
        
        if (clicked < start) {
            // Clicked date is before start, swap them
            dateRangeEnd = dateRangeStart;
            dateRangeStart = dateStr;
        } else {
            dateRangeEnd = dateStr;
        }
    }
    
    renderCalendar();
    updateDateRangeInfo();
}

function updateDateRangeInfo() {
    const info = document.getElementById('dateRangeInfo');
    
    if (!dateRangeStart) {
        info.textContent = 'Pilih tanggal awal dan akhir';
    } else if (!dateRangeEnd) {
        info.textContent = `Dari: ${formatTanggalForPicker(dateRangeStart)} - Pilih tanggal akhir`;
    } else {
        info.textContent = `${formatTanggalForPicker(dateRangeStart)} s/d ${formatTanggalForPicker(dateRangeEnd)}`;
    }
}

function formatTanggalForPicker(dateStr) {
    // Parse date dari format YYYY-MM-DD
    const parts = dateStr.split('-');
    const year = parseInt(parts[0]);
    const month = parseInt(parts[1]) - 1; // Month is 0-indexed
    const day = parseInt(parts[2]);
    
    const tanggal = new Date(year, month, day);
    const hari = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
    const bulan = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
    
    const namaHari = hari[tanggal.getDay()];
    const tgl = tanggal.getDate();
    const namaBulan = bulan[tanggal.getMonth()];
    const tahun = tanggal.getFullYear();
    
    return `${namaHari}, ${tgl} ${namaBulan} ${tahun}`;
}


function formatTanggalShort(dateStr) {
    const date = new Date(dateStr);
    const day = date.getDate();
    const month = date.getMonth() + 1;
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
}

function getFilteredTransactions() {
    // Duplikasi logik filter dari renderTransactions
    let filtered = [...transaksiList];
    
    // Filter berdasarkan jenis
    if (filterJenis !== 'semua') {
        filtered = filtered.filter(t => t.jenis === filterJenis);
    }
    
    // Filter berdasarkan periode
    if (filterPeriode !== 'semua') {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        filtered = filtered.filter(transaksi => {
            const transaksiDate = new Date(transaksi.tanggal);
            transaksiDate.setHours(0, 0, 0, 0);
            
            if (filterPeriode === 'hari-ini') {
                return transaksiDate.getTime() === today.getTime();
            } else if (filterPeriode === 'minggu-ini') {
                const startOfWeek = new Date(today);
                startOfWeek.setDate(today.getDate() - today.getDay());
                return transaksiDate >= startOfWeek;
            } else if (filterPeriode === 'bulan-ini') {
                return transaksiDate.getMonth() === today.getMonth() &&
                       transaksiDate.getFullYear() === today.getFullYear();
            } else if (filterPeriode === 'custom') {
                if (dateRangeStart && dateRangeEnd) {
                    const start = new Date(dateRangeStart);
                    const end = new Date(dateRangeEnd);
                    start.setHours(0, 0, 0, 0);
                    end.setHours(23, 59, 59, 999);
                    return transaksiDate >= start && transaksiDate <= end;
                }
            }
            return true;
        });
    }
    
    // Sort by date (newest first)
    filtered.sort((a, b) => new Date(b.tanggal) - new Date(a.tanggal));
    
    return filtered;
}
