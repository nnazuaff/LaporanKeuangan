// ==========================================
// APLIKASI LAPORAN KEUANGAN PRIBADI
// ==========================================

// Konstanta
const STORAGE_KEY = 'laporan_keuangan_transaksi';

// State aplikasi
let transaksiList = [];
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
    
    // Set tanggal default ke hari ini
    setDefaultDate();
    
    // Setup event listeners
    setupEventListeners();
    
    // Render tampilan awal
    renderTransactions();
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
    const nominal = parseFloat(document.getElementById('nominal').value);
    const jenis = document.getElementById('jenis').value;
    const kategori = document.getElementById('kategori').value;
    
    // Validasi
    if (!deskripsi || nominal <= 0) {
        alert('Mohon isi semua field dengan benar!');
        return;
    }
    
    // Buat objek transaksi
    const transaksi = {
        id: Date.now(), // ID unik berdasarkan timestamp
        tanggal: tanggal,
        deskripsi: deskripsi,
        nominal: nominal,
        jenis: jenis,
        kategori: kategori,
        createdAt: new Date().toISOString()
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
    showFeedback('Transaksi berhasil ditambahkan!');
}

// ==========================================
// DATA PERSISTENCE (localStorage)
// ==========================================

function saveDataToStorage() {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(transaksiList));
    } catch (error) {
        console.error('Gagal menyimpan data:', error);
        alert('Gagal menyimpan data. Storage mungkin penuh.');
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
    
    // Render setiap transaksi
    filtered.forEach(transaksi => {
        const item = createTransactionElement(transaksi);
        container.appendChild(item);
    });
}

function createTransactionElement(transaksi) {
    const div = document.createElement('div');
    div.className = `transaction-item ${transaksi.jenis}`;
    
    const formatNominal = transaksi.jenis === 'pemasukan' 
        ? `+${formatRupiah(transaksi.nominal)}`
        : `-${formatRupiah(transaksi.nominal)}`;
    
    div.innerHTML = `
        <div class="transaction-info">
            <div class="transaction-header">
                <div class="transaction-desc">${escapeHtml(transaksi.deskripsi)}</div>
                <div class="transaction-amount ${transaksi.jenis}">${formatNominal}</div>
            </div>
            <div class="transaction-meta">
                <span class="transaction-tanggal">📅 ${formatTanggal(transaksi.tanggal)}</span>
                <span class="transaction-kategori">${transaksi.kategori}</span>
            </div>
        </div>
        <button class="btn-delete" onclick="deleteTransaksi(${transaksi.id})">Hapus</button>
    `;
    
    return div;
}

function updateSummary() {
    // Hitung total pemasukan dan pengeluaran
    const pemasukan = transaksiList
        .filter(t => t.jenis === 'pemasukan')
        .reduce((sum, t) => sum + t.nominal, 0);
    
    const pengeluaran = transaksiList
        .filter(t => t.jenis === 'pengeluaran')
        .reduce((sum, t) => sum + t.nominal, 0);
    
    const saldo = pemasukan - pengeluaran;
    
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
    showFeedback('Transaksi berhasil dihapus!');
}

// ==========================================
// UTILITY FUNCTIONS
// ==========================================

function formatRupiah(angka) {
    return 'Rp ' + angka.toLocaleString('id-ID');
}

function formatTanggal(tanggalStr) {
    const options = { day: '2-digit', month: 'short', year: 'numeric' };
    const tanggal = new Date(tanggalStr + 'T00:00:00');
    return tanggal.toLocaleDateString('id-ID', options);
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
    // Simple feedback (bisa diganti dengan toast notification yang lebih bagus)
    const originalTitle = document.title;
    document.title = message;
    setTimeout(() => {
        document.title = originalTitle;
    }, 2000);
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
            alert('Data berhasil diimport!');
        }
    } catch (error) {
        alert('Format data tidak valid!');
    }
}
