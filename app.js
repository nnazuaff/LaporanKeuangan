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
    const nominal = parseFloat(document.getElementById('nominal').value);
    const jenis = document.getElementById('jenis').value;
    const kategori = document.getElementById('kategori').value;
    
    // Validasi
    if (!deskripsi || nominal <= 0) {
        showToast('Mohon isi semua field dengan benar!', 'error');
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
