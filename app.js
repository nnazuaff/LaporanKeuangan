// ==========================================
// APLIKASI LAPORAN KEUANGAN PRIBADI
// ==========================================

// Konstanta
const STORAGE_KEY = 'laporan_keuangan_transaksi';
const STORAGE_KEY_SALDO = 'laporan_keuangan_saldo_manual';

// State aplikasi
let transaksiList = [];
let sumberSaldoList = [];
let filterJenis = 'semua';
let filterPeriode = 'semua';

// ==========================================
// INITIALIZATION
// ==========================================

// Inisialisasi aplikasi saat halaman dimuat
document.addEventListener('DOMContentLoaded', function() {
    initApp();
});

function initApp() {
    // Load data dari localStorage
    loadDataFromStorage();
    loadSaldoFromStorage();
    
    // Set tanggal default ke hari ini
    setDefaultDate();
    
    // Setup event listeners
    setupEventListeners();
    
    // Render tampilan awal
    renderTransactions();
    renderSumberSaldo();
    renderSaldoBreakdown();
    updateSummary();
    
    // Register service worker untuk PWA
    registerServiceWorker();
}

// ==========================================
// SERVICE WORKER REGISTRATION
// ==========================================

function registerServiceWorker() {
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('service-worker.js')
            .then(function(registration) {
                console.log('Service Worker terdaftar:', registration);
            })
            .catch(function(error) {
                console.log('Service Worker gagal:', error);
            });
    }
}

// ==========================================
// EVENT LISTENERS
// ==========================================

function setupEventListeners() {
    // Form submit
    const form = document.getElementById('formTransaksi');
    form.addEventListener('submit', handleFormSubmit);
    
    // Filter jenis transaksi
    const filterJenisEl = document.getElementById('filterJenis');
    filterJenisEl.addEventListener('change', function(e) {
        filterJenis = e.target.value;
        renderTransactions();
    });
    
    // Filter periode
    const filterPeriodeEl = document.getElementById('filterPeriode');
    filterPeriodeEl.addEventListener('change', function(e) {
        filterPeriode = e.target.value;
        renderTransactions();
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
    showToast(`${jenisText} ${formatRupiah(nominal)} berhasil ditambahkan`, 'success');
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
    if (!confirm('Yakin ingin menghapus transaksi ini?')) {
        return;
    }
    
    // Hapus dari array
    transaksiList = transaksiList.filter(t => t.id !== id);
    
    // Simpan ke localStorage
    saveDataToStorage();
    
    // Update tampilan
    renderTransactions();
    updateSummary();
    
    // Feedback
    showToast('Transaksi berhasil dihapus', 'success');
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
    const jumlahSaldo = parseFloat(document.getElementById('jumlahSaldo').value);
    
    // Jika Custom, gunakan input custom
    if (namaSumber === 'Custom') {
        namaSumber = document.getElementById('namaSumberCustom').value.trim();
    }
    
    // Validasi
    if (!namaSumber || jumlahSaldo < 0) {
        showToast('Mohon isi semua field dengan benar!', 'error');
        return;
    }
    
    // Cek apakah sumber sudah ada
    const existingIndex = sumberSaldoList.findIndex(s => s.nama.toLowerCase() === namaSumber.toLowerCase());
    
    if (existingIndex !== -1) {
        // Update yang sudah ada
        if (confirm(`Sumber "${namaSumber}" sudah ada. Update jumlahnya?`)) {
            sumberSaldoList[existingIndex].jumlah = jumlahSaldo;
            sumberSaldoList[existingIndex].updatedAt = new Date().toISOString();
        } else {
            return;
        }
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
    if (!confirm('Yakin ingin menghapus sumber saldo ini?')) {
        return;
    }
    
    // Hapus dari array
    sumberSaldoList = sumberSaldoList.filter(s => s.id !== id);
    
    // Simpan ke localStorage
    saveSaldoToStorage();
    
    // Update tampilan
    renderSumberSaldo();
    renderSaldoBreakdown();
    updateSummary();
    
    // Feedback
    showToast('Sumber saldo berhasil dihapus', 'success');
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
        <span class="saldo-source-name">Total Saldo Manual</span>
        <span class="saldo-source-amount">${formatRupiah(totalSaldoManual)}</span>
    `;
    
    container.appendChild(totalItem);
}
