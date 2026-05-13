// sales_return.js - Sales Return & Product Exchange Module

// ==========================================
// HELPER & SHARED
// ==========================================
function srFmt(n) { return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(n || 0); }
function srDate(d) { return d ? new Date(d).toLocaleDateString('id-ID') : '-'; }

function srStatusBadge(status) {
    const map = {
        'PENDING': 'bg-slate-100 text-slate-500',
        'APPROVED': 'bg-slate-100 text-slate-500 shadow-sm',
        'GOODS_RECEIVED': 'bg-indigo-100 text-indigo-800',
        'RETURN_RECEIVED': 'bg-indigo-100 text-indigo-800',
        'COMPLETED': 'bg-emerald-100 text-emerald-800',
        'REJECTED': 'bg-red-100 text-red-800',
        'CANCELED': 'bg-slate-200 text-slate-500'
    };
    const labels = {
        'PENDING': 'WAITING WH',
        'APPROVED': 'WAITING WH',
        'GOODS_RECEIVED': 'Barang Diterima Inventory',
        'RETURN_RECEIVED': 'Retur Diterima',
        'COMPLETED': 'Selesai',
        'REJECTED': 'Ditolak',
        'CANCELED': 'Dibatalkan'
    };
    const cls = map[status] || 'bg-gray-100 text-gray-600';
    const lbl = labels[status] || status;
    return `<span class="px-2 py-1 rounded-full text-[10px] font-bold uppercase ${cls}">${lbl}</span>`;
}

function srGenerateNumber(prefix) {
    return prefix + '-' + new Date().getFullYear().toString().slice(-2) + Date.now().toString().slice(-6);
}

// ==========================================
// SALES RETURNS
// ==========================================
window.renderSalesReturns = async function () {
    document.getElementById('pageTitle').innerText = 'Retur Penjualan';
    const mc = document.getElementById('main-content');

    // Auto-sync on load to ensure data is fresh
    if (window.api && typeof window.api.pullAll === 'function') {
        mc.innerHTML = `<div class="p-20 text-center"><i class="fas fa-spinner fa-spin text-3xl text-blue-500 mb-4"></i><p class="text-slate-400 font-bold uppercase tracking-widest text-[10px]">Menyinkronkan Data...</p></div>`;
        await window.api.pullAll();
    }

    const perm = getModulePermission('penjualan');

    if (!window._srActiveTab) window._srActiveTab = 'pending';
    if (!window._srFilters) window._srFilters = { start: '', end: '', search: '' };
    const filters = window._srFilters;

    let returns = db.read('salesReturns') || [];

    if (filters.search) {
        const s = filters.search.toLowerCase();
        returns = returns.filter(r =>
            r.returnNumber?.toLowerCase().includes(s) ||
            db.findById('customers', r.customerId)?.name?.toLowerCase().includes(s) ||
            r.productName?.toLowerCase().includes(s)
        );
    }
    if (filters.start) {
        const dd = new Date(filters.start); dd.setHours(0, 0, 0, 0);
        returns = returns.filter(q => new Date(q.date) >= dd);
    }
    if (filters.end) {
        const dd = new Date(filters.end); dd.setHours(23, 59, 59, 999);
        returns = returns.filter(q => new Date(q.date) <= dd);
    }

    returns.sort((a, b) => new Date(b.date) - new Date(a.date));

    // All items in one list
    let filteredReturns = returns;

    const rows = filteredReturns.map(r => {
        const customer = db.findById('customers', r.customerId);

        return `
            <tr class="border-b border-slate-50 hover:bg-slate-50/50 transition-colors group">
                <td class="px-6 py-4">
                    <div class="text-sm font-black text-slate-900 mb-1 uppercase tracking-tight">${customer?.name || '-'}</div>
                    <div class="text-[10px] font-black text-blue-600 tracking-[0.1em] uppercase shadow-sm inline-block px-1.5 py-0.5 bg-blue-50 rounded">${r.soNumber || '-'}</div>
                </td>
                <td class="px-6 py-4">
                    <div class="text-[10px] text-slate-400 font-black uppercase tracking-widest mb-1">Tanggal Retur</div>
                    <div class="text-xs font-bold text-slate-700">${srDate(r.date)}</div>
                </td>
                <td class="px-6 py-4">
                    <div class="text-sm font-bold text-slate-800">${r.productName}</div>
                    <div class="text-[10px] text-slate-400 font-black uppercase tracking-widest mt-1">
                        Qty: ${r.qtyReturned} ${db.findById('inventoryItems', r.productId)?.unit || ''} &bull; 
                        <span class="${r.condition === 'Good' ? 'text-green-600' : 'text-red-500'}">${r.condition === 'Good' ? 'BAGUS' : 'RUSAK'}</span>
                    </div>
                </td>
                <td class="px-6 py-4 text-center">${srStatusBadge(r.status)}</td>
                <td class="px-6 py-4 text-right">
                    <div class="inline-block relative w-[130px]">
                        <select class="w-full bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 font-bold text-xs rounded-xl pl-3 pr-8 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer appearance-none transition-all shadow-sm" 
                            onchange="window.handleSRAction(this, '${r.id}')">
                            <option value="" disabled selected>Pilih Aksi...</option>
                            <option value="print">Cetak Nota</option>
                            ${['PENDING', 'APPROVED'].includes(r.status) ? `<option value="cancel">Batalkan Retur</option>` : ''}
                            ${perm.edit ? `<option value="delete">Hapus</option>` : ''}
                        </select>
                        <div class="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3 text-slate-400">
                            <i class="fas fa-chevron-down text-[10px]"></i>
                        </div>
                    </div>
                </td>
            </tr>
        `;
    }).join('');

    mc.innerHTML = `
        <div id="sr-list-view" class="animate-in fade-in duration-500 space-y-5">
            <div class="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
                <div class="p-6 md:p-8 bg-gradient-to-br from-slate-50 to-white border-b border-slate-100 flex flex-wrap lg:flex-nowrap items-center justify-between gap-6">
                    <div class="flex-1 min-w-[300px] relative">
                        <i class="fas fa-search absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 text-sm"></i>
                        <input type="text" id="sr_header_search" onkeyup="if(event.key==='Enter') filterSRTable()" value="${filters.search || ''}" placeholder="Cari Pelanggan, No. Retur, atau Produk..." 
                            class="w-full pl-12 pr-4 py-3 bg-white border-2 border-slate-100 rounded-2xl text-sm font-bold text-slate-600 focus:border-blue-500 outline-none transition-all shadow-sm">
                    </div>
                    
                    <div class="flex items-center gap-3">
                         <div class="relative group" id="sr_date_filter_container">
                            <button onclick="toggleSRDateDropdown()" class="flex items-center bg-white border-2 border-slate-100 rounded-2xl overflow-hidden hover:border-blue-300 transition-all shadow-sm h-[48px] group">
                                <span class="bg-slate-50 px-4 h-full flex items-center text-slate-500 group-hover:bg-slate-100 transition-colors">
                                    <i class="fas fa-calendar-alt text-xs"></i>
                                </span>
                                <span class="px-4 text-[11px] font-black text-slate-400 uppercase tracking-widest">Date Range</span>
                                <span class="pr-3 text-slate-400 group-hover:text-blue-500 transition-colors"><i class="fas fa-chevron-down text-[10px]"></i></span>
                            </button>
                            
                            <div id="sr_date_dropdown" class="absolute right-0 mt-3 w-72 bg-white border border-slate-100 rounded-3xl shadow-2xl z-[200] hidden p-6 animate-in zoom-in-95 duration-200">
                                <h4 class="text-[10px] font-black text-slate-800 uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
                                    <span class="w-1.5 h-1.5 bg-blue-600 rounded-full"></span> PERIODE RETUR
                                </h4>
                                <div class="space-y-4">
                                    <div class="space-y-1.5">
                                        <label class="block text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Dari Tanggal</label>
                                        <input type="date" id="sr_header_start" value="${filters.start}" class="w-full border-2 border-slate-50 rounded-xl px-4 py-2 text-xs font-black text-slate-700 bg-slate-50/50 focus:bg-white focus:border-blue-500 outline-none transition-all">
                                    </div>
                                    <div class="space-y-1.5">
                                        <label class="block text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Sampai Tanggal</label>
                                        <input type="date" id="sr_header_end" value="${filters.end}" class="w-full border-2 border-slate-50 rounded-xl px-4 py-2 text-xs font-black text-slate-700 bg-slate-50/50 focus:bg-white focus:border-blue-500 outline-none transition-all">
                                    </div>
                                    <div class="flex gap-2 pt-2">
                                        <button onclick="applySRHeaderDateFilter()" class="flex-1 bg-blue-600 text-white py-2.5 rounded-xl text-[10px] font-black uppercase tracking-[0.2em] hover:bg-slate-900 transition-all shadow-md active:scale-95">Filter</button>
                                        <button onclick="resetSRHeaderDateFilter()" class="flex-1 bg-slate-50 text-slate-400 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-[0.2em] hover:bg-slate-100 transition-all">Reset</button>
                                    </div>
                                </div>
                            </div>
                        </div>

                        ${perm.edit ? `<button onclick="openSalesReturnForm()" class="h-[48px] px-6 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl text-[11px] font-black uppercase tracking-widest shadow-lg shadow-blue-500/30 transition-all flex items-center gap-2 active:scale-95"><i class="fas fa-plus"></i> Buat</button>` : ''}
                    </div>
                </div>

                <div class="overflow-x-auto min-h-[400px]">
                    <table class="w-full text-left border-collapse">
                        <thead>
                            <tr class="bg-slate-50/30 text-slate-500 font-black uppercase text-[10px] tracking-[0.2em] border-b border-slate-100">
                                <th class="px-6 py-5">Tujuan / Ref Order</th>
                                <th class="px-6 py-5">Logistics Info</th>
                                <th class="px-6 py-5">Produk</th>
                                <th class="px-6 py-5 text-center">Status Barang</th>
                                <th class="px-6 py-5 text-right w-[180px]">Navigasi</th>
                            </tr>
                        </thead>
                        <tbody class="divide-y divide-slate-50">
                            ${rows || `<tr><td colspan="5" class="py-40 text-center text-slate-300 font-bold uppercase tracking-widest">Data tidak ditemukan.</td></tr>`}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
        <div id="sr-form-view" class="hidden"></div>
    `;
};

window.handleSRAction = async function (select, id) {
    const action = select.value;
    if (!action) return;

    if (action === 'print') {
        window.printSalesReturn(id);
    } else if (action === 'cancel') {
        if (confirm('Yakin ingin membatalkan retur ini? Status di Inventory akan otomatis di-cancel.')) {
            try {
                await api.update('salesReturns', id, { status: 'CANCELED' });
                if (window.api && typeof window.api.pullAll === 'function') await window.api.pullAll();
                showToast('Retur dibatalkan.');
                renderSalesReturns();
            } catch (e) {
                showToast('Gagal membatalkan: ' + e.message, 'error');
            }
        }
    } else if (action === 'delete') {
        if (confirm('Yakin ingin menghapus retur ini?')) {
            try {
                await db.delete('salesReturns', id);
                if (window.api && typeof window.api.pullAll === 'function') await window.api.pullAll();
                await db.sync('salesReturns');
                showToast('Retur berhasil dihapus.');
                renderSalesReturns();
            } catch (e) {
                showToast('Gagal hapus: ' + e.message, 'error');
            }
        }
    }
    select.value = '';
};

window.filterSRTable = () => {
    window._srFilters.search = document.getElementById('sr_header_search').value;
    renderSalesReturns();
};

window.toggleSRDateDropdown = () => document.getElementById('sr_date_dropdown').classList.toggle('hidden');

window.applySRHeaderDateFilter = () => {
    window._srFilters.start = document.getElementById('sr_header_start').value;
    window._srFilters.end = document.getElementById('sr_header_end').value;
    renderSalesReturns();
};

window.resetSRHeaderDateFilter = () => {
    window._srFilters.start = '';
    window._srFilters.end = '';
    renderSalesReturns();
};

window.openSalesReturnForm = function (soId = null) {
    window._srItems = [];
    const lv = document.getElementById('sr-list-view');
    const fv = document.getElementById('sr-form-view');
    if (!lv || !fv) return;

    lv.classList.add('hidden');
    fv.classList.remove('hidden');

    if (window.renderBreadcrumb) {
        renderBreadcrumb(['Penjualan', 'Sales Return', 'Buat Retur Baru']);
    }

    const customers = db.read('customers');
    let initialCustomerName = '-- Pilih Customer --';
    let initialCustomerId = '';
    let initialSONumber = '';

    if (soId) {
        const so = db.findById('salesOrders', soId);
        if (so) {
            const cust = db.findById('customers', so.customerId);
            initialCustomerName = cust?.name || '';
            initialCustomerId = cust?.id || '';
            initialSONumber = so.soNumber;
        }
    }

    fv.innerHTML = `
        <div id="sr-form-view" class="animate-in slide-in-from-bottom-10 duration-500 pb-20 bg-slate-50/30 min-h-screen">
            <!-- Compact Header -->
            <div class="bg-white border-b border-slate-100 mb-6">
                <div class="max-w-7xl mx-auto px-8 py-6 flex justify-between items-center">
                    <div>
                        <h2 class="text-xl font-black text-slate-800 tracking-tight">BUAT SALES RETURN BARU</h2>
                        <p class="text-[9px] font-black text-slate-400 uppercase tracking-widest mt-1 flex items-center gap-1.5">
                            <i class="fas fa-shopping-cart text-blue-500"></i> Penjualan / Retur Barang
                        </p>
                    </div>
                    <div class="flex items-center gap-3">
                        <button onclick="window.closeSalesReturnForm()" class="px-5 py-2.5 text-[9px] font-black uppercase tracking-widest text-slate-400 hover:text-slate-600 transition-all">Batal</button>
                        <button onclick="window.saveSalesReturn()" class="bg-blue-600 hover:bg-blue-700 text-white px-8 py-2.5 rounded-xl text-[9px] font-black uppercase tracking-widest shadow-lg shadow-blue-500/20 transition-all active:scale-95 flex items-center gap-2">
                            <i class="fas fa-check-circle"></i> Simpan Retur
                        </button>
                    </div>
                </div>
            </div>

            <div class="max-w-7xl mx-auto px-8 mt-10 space-y-8">
                <!-- 1. Header Info -->
                <div class="bg-white rounded-3xl p-10 border border-slate-100 shadow-sm space-y-8">
                    <h3 class="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] flex items-center gap-2">
                        <i class="fas fa-info-circle text-blue-600"></i> INFORMASI DASAR
                    </h3>
                    
                    <div class="grid grid-cols-1 md:grid-cols-3 gap-8">
                        <div class="space-y-2">
                            <label class="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Pilih Customer</label>
                            <div class="relative" id="sr_customer_container">
                                <input type="text" id="sr_customer_search" value="${initialCustomerName}" readonly
                                    onclick="window.toggleCustomerDropdownSR('sr_customer_dropdown', true)"
                                    class="w-full bg-slate-50 border-2 border-transparent rounded-2xl px-5 py-3 text-sm font-black text-slate-700 focus:bg-white focus:border-blue-500/20 focus:ring-4 focus:ring-blue-500/5 outline-none transition-all cursor-pointer shadow-sm">
                                <input type="hidden" id="sr_customer_id" value="${initialCustomerId}">
                                
                                <div id="sr_customer_dropdown" class="absolute left-0 mt-2 w-full min-w-[300px] bg-white border border-slate-100 rounded-2xl shadow-2xl z-[200] hidden overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                                    <div class="p-4 border-b border-slate-50 bg-slate-50/30">
                                        <div class="relative">
                                            <i class="fas fa-search absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 text-xs"></i>
                                            <input type="text" id="sr_customer_filter_input" onkeyup="window.filterCustomerSelectorSR(this.value)" 
                                                placeholder="Cari Nama Customer..." 
                                                class="w-full pl-10 pr-4 py-2 bg-white border border-slate-100 rounded-xl text-xs font-bold outline-none focus:border-blue-500 transition-all">
                                        </div>
                                    </div>
                                    <div class="max-h-64 overflow-y-auto p-1" id="sr_customer_list"></div>
                                </div>
                            </div>
                        </div>
                        <div class="space-y-2">
                            <label class="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Sales Order</label>
                            <select id="sr_so" class="w-full h-[52px] bg-slate-50 border-2 border-transparent rounded-2xl px-5 py-3 text-sm font-black text-blue-600 outline-none focus:bg-white focus:border-blue-500/20 focus:ring-4 focus:ring-blue-500/5 transition-all shadow-sm" onchange="window.loadSOItemsForReturn()">
                                <option value="">-- Pilih Customer Dahulu --</option>
                            </select>
                        </div>
                        <div class="space-y-2">
                            <label class="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Metode Refund</label>
                            <select id="sr_refund_method" class="w-full h-[52px] bg-slate-50 border-2 border-transparent rounded-2xl px-5 py-3 text-sm font-black text-slate-700 focus:bg-white focus:border-blue-500/20 focus:ring-4 focus:ring-blue-500/5 outline-none transition-all uppercase shadow-sm">
                                <option value="Cash">Tunai (Cash)</option>
                                <option value="Bank">Transfer Bank</option>
                                <option value="StoreCredit">Store Credit (Nota)</option>
                            </select>
                        </div>
                    </div>
                </div>

                <!-- 2. Item Adder -->
                <div class="bg-white rounded-3xl p-10 border border-slate-100 shadow-sm space-y-8">
                    <h3 class="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] flex items-center gap-2">
                        <i class="fas fa-box-open text-blue-600"></i> TAMBAH PRODUK KE DAFTAR
                    </h3>
                    
                    <div class="p-8 bg-slate-50/50 rounded-[2rem] border-2 border-slate-100 border-dashed">
                        <div class="grid grid-cols-1 md:grid-cols-12 gap-6 items-end">
                            <div class="md:col-span-7 space-y-2">
                                <label class="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Pilih Produk Dari SO</label>
                                <select id="sr_product" class="w-full h-[52px] bg-white border-2 border-slate-100 rounded-2xl px-5 py-2 text-sm font-black text-slate-700 outline-none focus:border-blue-500 transition-all uppercase shadow-sm" onchange="window.updateSRProductDetails()">
                                    <option value="">-- Pilih Produk --</option>
                                </select>
                            </div>
                            <div class="md:col-span-5 space-y-2">
                                <label class="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Kondisi Barang</label>
                                <select id="sr_item_condition" class="w-full h-[52px] bg-white border-2 border-slate-100 rounded-2xl px-5 py-2 text-sm font-black text-slate-700 outline-none focus:border-blue-500 transition-all uppercase shadow-sm">
                                    <option value="Good">Good / Bagus</option>
                                    <option value="Damaged">Damaged / Rusak</option>
                                </select>
                            </div>
                            
                            <div class="md:col-span-3 space-y-2">
                                <label class="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Qty Retur</label>
                                <input type="number" id="sr_qty" value="1" min="1" class="w-full h-[52px] bg-white border-2 border-slate-100 rounded-2xl px-5 py-2 text-sm font-black text-slate-700 outline-none focus:border-blue-500 transition-all shadow-sm">
                            </div>
                            <div class="md:col-span-6 space-y-2">
                                <label class="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Harga Satuan (Refund)</label>
                                <input type="number" id="sr_unit_price" value="0" class="w-full h-[52px] bg-white border-2 border-slate-100 rounded-2xl px-5 py-2 text-sm font-black text-slate-700 outline-none focus:border-blue-500 transition-all shadow-sm">
                            </div>
                            <div class="md:col-span-3">
                                <button onclick="window.addSRItem()" class="w-full h-[52px] bg-blue-600 text-white rounded-2xl font-black text-[11px] uppercase tracking-widest hover:bg-slate-900 transition-all active:scale-95 shadow-lg shadow-blue-500/20 flex items-center justify-center gap-2">
                                    <i class="fas fa-plus-circle"></i> Tambah
                                </button>
                            </div>
                        </div>
                    </div>

                    <!-- List of added items -->
                    <div class="overflow-x-auto rounded-3xl border border-slate-100 mt-6 bg-slate-50/20">
                        <table class="w-full text-left">
                            <thead class="bg-slate-50 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">
                                <tr>
                                    <th class="px-8 py-5">Produk</th>
                                    <th class="px-8 py-5 text-center">Kondisi</th>
                                    <th class="px-8 py-5 text-center">Qty</th>
                                    <th class="px-8 py-5 text-right">Harga</th>
                                    <th class="px-8 py-5 text-right">Total</th>
                                    <th class="px-8 py-5 text-right w-[80px]">Aksi</th>
                                </tr>
                            </thead>
                            <tbody id="sr_items_table_body" class="divide-y divide-slate-100 text-sm bg-white">
                                <tr><td colspan="6" class="px-8 py-20 text-center text-slate-300 font-bold uppercase tracking-widest italic">Belum ada produk ditambahkan.</td></tr>
                            </tbody>
                        </table>
                    </div>
                </div>

                <!-- 3. Footer Section (Notes & Totals) -->
                <div class="grid grid-cols-1 lg:grid-cols-12 gap-8">
                    <div class="lg:col-span-7 space-y-6">
                        <div class="bg-white rounded-3xl p-8 border border-slate-100 shadow-sm space-y-6">
                            <h3 class="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] flex items-center gap-2">
                                <i class="fas fa-comment-alt text-blue-600"></i> ALASAN & CATATAN
                            </h3>
                            <div class="space-y-4">
                                <textarea id="sr_reason" rows="3" class="w-full bg-slate-50 border-2 border-transparent rounded-2xl px-5 py-4 text-sm font-black text-slate-700 focus:bg-white focus:border-blue-500/20 focus:ring-4 focus:ring-blue-500/5 outline-none transition-all placeholder:text-slate-300" placeholder="Jelaskan alasan retur secara detail..."></textarea>
                                <input type="text" id="sr_notes" class="w-full bg-slate-50 border-2 border-transparent rounded-2xl px-5 py-4 text-sm font-black text-slate-700 focus:bg-white focus:border-blue-500/20 focus:ring-4 focus:ring-blue-500/5 outline-none transition-all placeholder:text-slate-300 uppercase" placeholder="Catatan opsional (misal: No. SJ supplier)...">
                            </div>
                        </div>
                    </div>
                    <div class="lg:col-span-5">
                        <div class="bg-white rounded-3xl p-10 border border-slate-100 shadow-sm space-y-6">
                            <div class="space-y-4">
                                <div class="flex justify-between items-center text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                    <span>Total Estimasi Refund</span>
                                    <span class="text-blue-600">Waiting WH</span>
                                </div>
                                <div id="sr_refund_total_display" class="text-4xl font-black text-slate-800 tracking-tight">Rp 0</div>
                                <p class="text-[9px] font-medium text-slate-400 italic mt-2">* Nilai di atas adalah estimasi sebelum verifikasi gudang.</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;
    if (soId) { setTimeout(() => loadSOItemsForReturn(), 100); }
};

window.closeSalesReturnForm = function () {
    const lv = document.getElementById('sr-list-view');
    const fv = document.getElementById('sr-form-view');
    if (lv) lv.classList.remove('hidden');
    if (fv) fv.classList.add('hidden');
    renderSalesReturns();
};

window.toggleCustomerDropdownSR = function (id, show) {
    const el = document.getElementById(id);
    if (!el) return;
    if (show) {
        if (!el.classList.contains('hidden')) { el.classList.add('hidden'); return; }
        el.classList.remove('hidden');
        window.filterCustomerSelectorSR('');
        setTimeout(() => document.getElementById('sr_customer_filter_input')?.focus(), 50);
        const closer = (e) => {
            if (!el.contains(e.target) && e.target.id !== 'sr_customer_search') {
                el.classList.add('hidden');
                document.removeEventListener('click', closer);
            }
        };
        setTimeout(() => document.addEventListener('click', closer), 10);
    } else { el.classList.add('hidden'); }
};

window.filterCustomerSelectorSR = function (q) {
    const listContainer = document.getElementById('sr_customer_list');
    if (!listContainer) return;
    const query = q.toLowerCase();
    const customers = db.read('customers').filter(c => c.name.toLowerCase().includes(query)).slice(0, 50);
    if (customers.length === 0) {
        listContainer.innerHTML = `<div class="p-4 text-center text-[10px] font-black text-slate-400 uppercase italic">Tidak ada customer.</div>`;
        return;
    }
    listContainer.innerHTML = customers.map(c => `
        <div onclick="window.selectCustomerSR('${c.id}', '${c.name.replace(/'/g, "\\'")}')" 
            class="px-4 py-2.5 hover:bg-slate-50 rounded-xl cursor-pointer transition-all m-0.5 border border-transparent hover:border-slate-100 group">
            <div class="text-[11px] font-black text-slate-600 group-hover:text-blue-600 tracking-tight">${c.name}</div>
        </div>
    `).join('');
};

window.selectCustomerSR = function (id, name) {
    document.getElementById('sr_customer_id').value = id;
    document.getElementById('sr_customer_search').value = name;
    document.getElementById('sr_customer_dropdown').classList.add('hidden');

    // Filter SOs for this customer
    const soSelect = document.getElementById('sr_so');
    const salesOrders = db.read('salesOrders').filter(s => s.customerId === id && ['CONFIRMED', 'DELIVERED', 'COMPLETED'].includes(s.status));

    if (salesOrders.length === 0) {
        soSelect.innerHTML = '<option value="">-- Tidak ada SO --</option>';
    } else {
        soSelect.innerHTML = '<option value="">-- Pilih Sales Order --</option>' +
            salesOrders.map(so => `<option value="${so.id}">${so.soNumber}</option>`).join('');
    }

    // Reset product section
    document.getElementById('sr_product').innerHTML = '<option value="">-- Pilih SO Dulu --</option>';
};

window.updateSRProductDetails = function () {
    const productSelect = document.getElementById('sr_product');
    const selectedOption = productSelect.options[productSelect.selectedIndex];
    const unitPrice = parseFloat(selectedOption?.getAttribute('data-price') || 0);

    document.getElementById('sr_unit_price').value = unitPrice;
    window.updateSRRefundTotal();
};

window.updateSRRefundTotal = function () {
    const unitPrice = parseFloat(document.getElementById('sr_unit_price').value) || 0;
    const qty = parseFloat(document.getElementById('sr_qty').value) || 0;
    const total = unitPrice * qty;

    const display = document.getElementById('sr_refund_total_display');
    if (display) display.innerText = srFmt(total);
};

window.openAdvancedSOSelector = function (context) {
    const customers = db.read('customers');
    const salesOrders = db.read('salesOrders').filter(s => ['CONFIRMED', 'DELIVERED', 'COMPLETED'].includes(s.status));

    const body = `
        <div class="space-y-6">
            <div class="relative">
                <i class="fas fa-search absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"></i>
                <input type="text" id="adv_so_search_input" onkeyup="filterAdvancedSOTable()" placeholder="Cari No. SO, Customer, atau Tanggal..." 
                    class="w-full pl-12 pr-4 py-3 bg-slate-50 border-2 border-slate-100 rounded-2xl focus:border-blue-500 outline-none transition-all font-bold text-slate-700">
            </div>
            
            <div class="overflow-hidden border border-slate-100 rounded-2xl max-h-[450px] overflow-y-auto shadow-sm">
                <table class="w-full text-sm text-left">
                    <thead class="bg-slate-50 text-slate-500 font-black uppercase text-[10px] tracking-wider sticky top-0 z-10">
                        <tr>
                            <th class="px-6 py-4">No. Sales Order</th>
                            <th class="px-6 py-4">Customer</th>
                            <th class="px-6 py-4">Tanggal</th>
                            <th class="px-6 py-4 text-right">Aksi</th>
                        </tr>
                    </thead>
                    <tbody id="adv_so_table_body" class="divide-y divide-slate-50">
                        ${salesOrders.map(so => {
        const c = db.findById('customers', so.customerId);
        return `
                                <tr class="hover:bg-blue-50/30 transition-colors">
                                    <td class="px-6 py-4 font-black text-blue-600">${so.soNumber}</td>
                                    <td class="px-6 py-4 font-bold text-slate-700">${c?.name || '-'}</td>
                                    <td class="px-6 py-4 text-slate-500 text-xs">${srDate(so.date)}</td>
                                    <td class="px-6 py-4 text-right">
                                        <button onclick="window.selectSOForContext('${so.id}', '${so.soNumber}', '${c?.name.replace(/'/g, "\\'") || ''}', '${context}'); closeModal();" 
                                            class="px-4 py-2 bg-blue-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-900 transition-all shadow-md active:scale-95">Pilih</button>
                                    </td>
                                </tr>
                            `;
    }).join('')}
                    </tbody>
                </table>
            </div>
        </div>
    `;

    showModal('Advanced Sales Order Search', body, `<button onclick="closeModal()" class="px-8 py-2.5 bg-slate-100 text-slate-500 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-200 transition-all">Tutup</button>`, 'lg');

    window.filterAdvancedSOTable = () => {
        const q = document.getElementById('adv_so_search_input').value.toLowerCase();
        document.querySelectorAll('#adv_so_table_body tr').forEach(row => {
            row.style.display = row.innerText.toLowerCase().includes(q) ? '' : 'none';
        });
    };
};

window.closeSalesReturnForm = () => {
    const lv = document.getElementById('sr-list-view');
    const fv = document.getElementById('sr-form-view');
    if (lv && fv) {
        lv.classList.remove('hidden');
        fv.classList.add('hidden');
        renderSalesReturns();
    }
};

window.loadSOItemsForReturn = function () {
    const soId = document.getElementById('sr_so').value;
    const productSelect = document.getElementById('sr_product');
    if (!soId) { productSelect.innerHTML = '<option value="">-- Pilih SO Dulu --</option>'; return; }
    const so = db.findById('salesOrders', soId);
    if (!so || !so.items?.length) { productSelect.innerHTML = '<option value="">Tidak ada item</option>'; return; }

    productSelect.innerHTML = '<option value="">-- Pilih Produk --</option>' + so.items.map(item => {
        const invItem = db.findById('inventoryItems', item.inventoryItemId);
        const displayName = item.prodText || invItem?.itemName || 'Produk';
        const price = item.price || item.unitPrice || 0;
        const invId = item.inventoryItemId || '';
        return `<option value="${invId}" data-name="${displayName}" data-price="${price}">${displayName}</option>`;
    }).join('');

    window.updateSRProductDetails();
};

window.updateSRProductDetails = function () {
    const productSelect = document.getElementById('sr_product');
    const selectedOption = productSelect.options[productSelect.selectedIndex];
    const unitPrice = parseFloat(selectedOption?.getAttribute('data-price') || 0);
    document.getElementById('sr_unit_price').value = unitPrice;
};

window.addSRItem = function () {
    const productSelect = document.getElementById('sr_product');
    const productId = productSelect.value;
    const productName = productSelect.options[productSelect.selectedIndex]?.dataset.name;
    const condition = document.getElementById('sr_item_condition').value;
    const qtyReturned = parseFloat(document.getElementById('sr_qty').value) || 0;
    const unitPrice = parseFloat(document.getElementById('sr_unit_price').value) || 0;

    if (!productId) { showToast('Pilih produk terlebih dahulu', 'error'); return; }
    if (qtyReturned <= 0) { showToast('Qty harus > 0', 'error'); return; }

    window._srItems.push({
        productId, productName, qtyReturned, unitPrice, condition,
        total: qtyReturned * unitPrice
    });

    window.renderSRItemsTable();

    // Reset adder fields
    productSelect.value = '';
    document.getElementById('sr_qty').value = 1;
    document.getElementById('sr_unit_price').value = 0;
};

window.removeSRItem = function (index) {
    window._srItems.splice(index, 1);
    window.renderSRItemsTable();
};

window.renderSRItemsTable = function () {
    const tbody = document.getElementById('sr_items_table_body');
    const totalDisplay = document.getElementById('sr_refund_total_display');

    if (window._srItems.length === 0) {
        tbody.innerHTML = `<tr><td colspan="6" class="px-6 py-10 text-center text-slate-300 font-bold uppercase tracking-widest italic">Belum ada produk ditambahkan.</td></tr>`;
        totalDisplay.innerText = srFmt(0);
        return;
    }

    let grandTotal = 0;
    tbody.innerHTML = window._srItems.map((item, idx) => {
        grandTotal += item.total;
        return `
            <tr class="hover:bg-slate-50 transition-colors">
                <td class="px-6 py-4 font-bold text-slate-700">${item.productName}</td>
                <td class="px-6 py-4 text-center">
                    <span class="px-2 py-0.5 rounded text-[10px] font-black uppercase ${item.condition === 'Good' ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'}">${item.condition}</span>
                </td>
                <td class="px-6 py-4 text-center font-bold">${item.qtyReturned}</td>
                <td class="px-6 py-4 text-right font-medium">${srFmt(item.unitPrice)}</td>
                <td class="px-6 py-4 text-right font-black text-slate-900">${srFmt(item.total)}</td>
                <td class="px-6 py-4 text-right">
                    <button onclick="window.removeSRItem(${idx})" class="text-red-400 hover:text-red-600 p-2"><i class="fas fa-times"></i></button>
                </td>
            </tr>
        `;
    }).join('');

    totalDisplay.innerText = srFmt(grandTotal);
};

window.saveSalesReturn = async function () {
    const soId = document.getElementById('sr_so').value;
    const customerId = document.getElementById('sr_customer_id').value;
    const refundMethod = document.getElementById('sr_refund_method').value;
    const reason = document.getElementById('sr_reason').value.trim();
    const notes = document.getElementById('sr_notes').value.trim();

    if (!soId) { showToast('Pilih Sales Order terlebih dahulu.', 'error'); return; }
    if (window._srItems.length === 0) { showToast('Tambahkan minimal 1 produk.', 'error'); return; }

    const so = db.findById('salesOrders', soId);

    try {
        const result = await api.createSalesReturn({
            soId, soNumber: so?.soNumber || '',
            customerId: customerId || so?.customerId || '',
            items: window._srItems,
            refundMethod, reason, notes
        });
        showToast(`Retur ${result.returnNumber} berhasil dibuat dengan ${result.count} item.`);
        if (window.api && typeof window.api.pullAll === 'function') await window.api.pullAll();
        await db.sync('salesReturns');
        window.closeSalesReturnForm();
    } catch (err) {
        showToast(`Gagal membuat retur: ${err.message}`, 'error');
    }
};

window.approveSalesReturnDoc = async function (id, approved) {
    try {
        await api.updateSalesReturn(id, { status: approved ? 'APPROVED' : 'DRAFT' });
        showToast(`Dokumen Retur ${approved ? 'Disetujui' : 'Dibatalkan Approvalnya'}`);
        await db.sync('salesReturns');
        renderSalesReturns();
    } catch (err) {
        showToast(`Gagal: ${err.message}`, 'error');
    }
};

window.receiveReturnGoods = function (id) {
    const ret = db.findById('salesReturns', id);
    if (!ret) return;
    const invItem = db.findById('inventoryItems', ret.productId);

    // Open the receive form as overlay in the sr-form-view div
    const lv = document.getElementById('sr-list-view');
    const fv = document.getElementById('sr-form-view');
    if (!lv || !fv) return;
    lv.classList.add('hidden');
    fv.classList.remove('hidden');

    if (window.renderBreadcrumb) {
        renderBreadcrumb(['Penjualan', 'Sales Return', 'Terima Barang Retur']);
    }

    fv.innerHTML = `
        <div class="animate-in fade-in slide-in-from-bottom-4 duration-500 -m-6 h-[calc(100vh-64px)] flex flex-col overflow-hidden bg-white">
            <!-- Header -->
            <div class="sticky top-0 z-40 bg-white border-b border-slate-100 px-8 py-4 flex items-center justify-between shrink-0 shadow-sm">
                <div>
                    <h2 class="text-lg font-black text-slate-800 tracking-tight">Penerimaan Barang Retur</h2>
                    <p class="text-[10px] font-black text-slate-400 uppercase tracking-widest">Verifikasi Fisik Oleh Gudang</p>
                </div>
                <div class="flex items-center gap-3">
                    <button onclick="window.closeSalesReturnForm()" class="px-6 py-2.5 bg-slate-100 text-slate-500 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-200 transition-all active:scale-95">Batal</button>
                    <button onclick="window.confirmReceiveReturn('${id}')" class="px-8 py-2.5 bg-emerald-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-emerald-700 transition-all shadow-lg active:scale-95 flex items-center gap-2">
                        <i class="fas fa-check-circle text-[10px]"></i> Konfirmasi Terima
                    </button>
                </div>
            </div>

            <!-- Content -->
            <div class="flex-1 overflow-y-auto bg-slate-50/50 p-8">
                <div class="max-w-3xl mx-auto space-y-6">

                    <!-- Info dari Sales -->
                    <div class="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm">
                        <h3 class="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] flex items-center gap-2 mb-5">
                            <i class="fas fa-file-alt text-blue-600"></i> Informasi Retur (Dari Sales)
                        </h3>
                        <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
                            <div class="bg-slate-50 rounded-2xl p-4">
                                <div class="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">No. Retur</div>
                                <div class="text-sm font-black text-slate-800">${ret.returnNumber || '-'}</div>
                            </div>
                            <div class="bg-slate-50 rounded-2xl p-4">
                                <div class="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Ref SO</div>
                                <div class="text-sm font-black text-blue-700">${ret.soNumber || '-'}</div>
                            </div>
                            <div class="bg-slate-50 rounded-2xl p-4">
                                <div class="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Customer</div>
                                <div class="text-sm font-black text-slate-800">${db.findById('customers', ret.customerId)?.name || '-'}</div>
                            </div>
                            <div class="bg-slate-50 rounded-2xl p-4">
                                <div class="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Tanggal</div>
                                <div class="text-sm font-black text-slate-800">${srDate(ret.date)}</div>
                            </div>
                        </div>
                    </div>

                    <!-- Produk yang Diretur -->
                    <div class="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm">
                        <h3 class="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] flex items-center gap-2 mb-5">
                            <i class="fas fa-box text-blue-600"></i> Produk yang Diretur
                        </h3>
                        <div class="flex items-center gap-5 p-4 bg-blue-50 rounded-2xl border border-blue-100">
                            <div class="w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center">
                                <i class="fas fa-box text-white"></i>
                            </div>
                            <div class="flex-1">
                                <div class="text-base font-black text-slate-900">${ret.productName || '-'}</div>
                                <div class="text-[10px] font-bold text-slate-500 mt-0.5">
                                    Kode: ${invItem?.itemCode || '-'} &bull; Unit: ${invItem?.unit || 'KG'}
                                </div>
                            </div>
                            <div class="text-right">
                                <div class="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Qty Klaim Sales</div>
                                <div class="text-2xl font-black text-blue-700">${ret.qtyReturned} <span class="text-sm">${invItem?.unit || 'KG'}</span></div>
                            </div>
                        </div>
                        ${ret.reason ? `
                        <div class="mt-4 p-4 bg-amber-50 border border-amber-100 rounded-2xl">
                            <div class="text-[9px] font-black text-amber-600 uppercase tracking-widest mb-1"><i class="fas fa-exclamation-circle mr-1"></i> Alasan Retur dari Sales</div>
                            <div class="text-sm text-slate-700">${ret.reason}</div>
                        </div>
                        ` : ''}
                    </div>

                    <!-- Form Verifikasi Gudang -->
                    <div class="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm">
                        <h3 class="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] flex items-center gap-2 mb-5">
                            <i class="fas fa-clipboard-check text-emerald-600"></i> Verifikasi Gudang
                        </h3>
                        <div class="space-y-5">
                            <div class="grid grid-cols-2 gap-5">
                                <div class="space-y-2">
                                    <label class="block text-[10px] font-black text-slate-400 uppercase tracking-widest">Qty Aktual Diterima (${invItem?.unit || 'KG'})</label>
                                    <input type="number" id="recv_qty" value="${ret.qtyReturned}" min="0" step="0.01"
                                        class="w-full bg-slate-50 border-2 border-transparent rounded-2xl px-5 py-3 text-lg font-black text-slate-700 focus:bg-white focus:border-emerald-500/30 focus:ring-4 focus:ring-emerald-500/5 outline-none transition-all">
                                    <p class="text-[10px] text-slate-400 ml-1">Qty yang benar-benar sampai di gudang</p>
                                </div>
                                <div class="space-y-2">
                                    <label class="block text-[10px] font-black text-slate-400 uppercase tracking-widest">Kondisi Barang Aktual</label>
                                    <div class="grid grid-cols-2 gap-3">
                                        <label class="cursor-pointer">
                                            <input type="radio" name="recv_condition" value="Good" class="sr-only peer" ${ret.condition === 'Good' ? 'checked' : ''}>
                                            <div class="peer-checked:bg-emerald-50 peer-checked:border-emerald-400 peer-checked:text-emerald-700 border-2 border-slate-200 rounded-2xl p-4 text-center transition-all">
                                                <i class="fas fa-check-circle text-xl mb-1 block peer-checked:text-emerald-500"></i>
                                                <div class="text-[11px] font-black uppercase tracking-widest">Bagus</div>
                                                <div class="text-[9px] text-slate-400 mt-1">Masuk ke stok gudang</div>
                                            </div>
                                        </label>
                                        <label class="cursor-pointer">
                                            <input type="radio" name="recv_condition" value="Damaged" class="sr-only peer" ${ret.condition !== 'Good' ? 'checked' : ''}>
                                            <div class="peer-checked:bg-red-50 peer-checked:border-red-400 peer-checked:text-red-700 border-2 border-slate-200 rounded-2xl p-4 text-center transition-all">
                                                <i class="fas fa-times-circle text-xl mb-1 block"></i>
                                                <div class="text-[11px] font-black uppercase tracking-widest">Rusak</div>
                                                <div class="text-[9px] text-slate-400 mt-1">Masuk ke Judgment</div>
                                            </div>
                                        </label>
                                    </div>
                                </div>
                            </div>
                            <div class="space-y-2">
                                <label class="block text-[10px] font-black text-slate-400 uppercase tracking-widest">Catatan Gudang</label>
                                <textarea id="recv_notes" rows="3" placeholder="Catatan kondisi barang, ketidaksesuaian, dll..."
                                    class="w-full bg-slate-50 border-2 border-transparent rounded-2xl px-5 py-3 text-sm text-slate-700 focus:bg-white focus:border-emerald-500/30 outline-none transition-all resize-none"></textarea>
                            </div>
                        </div>
                    </div>

                    <!-- Info Stok -->
                    <div class="bg-emerald-50 border border-emerald-100 rounded-3xl p-5 flex items-start gap-4">
                        <div class="w-10 h-10 bg-emerald-600 rounded-xl flex items-center justify-center shrink-0 mt-0.5">
                            <i class="fas fa-warehouse text-white text-sm"></i>
                        </div>
                        <div>
                            <div class="text-sm font-black text-emerald-800">Setelah konfirmasi:</div>
                            <ul class="text-[11px] text-emerald-700 mt-1 space-y-0.5">
                                <li>• Jika <strong>Bagus</strong> → stok <strong>${ret.productName}</strong> akan bertambah di gudang (RETURN_IN)</li>
                                <li>• Jika <strong>Rusak</strong> → barang masuk ke daftar <strong>Judgment/NG</strong> untuk diproses lebih lanjut</li>
                                <li>• Status retur akan berubah menjadi <strong>Barang Diterima</strong></li>
                            </ul>
                        </div>
                    </div>

                </div>
            </div>
        </div>
    `;
};

window.confirmReceiveReturn = async function (id) {
    const ret = db.findById('salesReturns', id);
    if (!ret) return;

    const qtyActual = parseFloat(document.getElementById('recv_qty')?.value) || 0;
    const conditionRadio = document.querySelector('input[name="recv_condition"]:checked');
    const conditionActual = conditionRadio ? conditionRadio.value : ret.condition;
    const notes = document.getElementById('recv_notes')?.value?.trim() || '';

    if (qtyActual <= 0) { showToast('Qty aktual harus lebih dari 0', 'error'); return; }

    const invItem = db.findById('inventoryItems', ret.productId);

    if (invItem) {
        if (conditionActual === 'Good') {
            // Barang Bagus → masuk ke stok gudang
            await db.addInventoryTransaction(
                invItem.id, 'RETURN_IN', qtyActual,
                'SALES_RETURN', ret.id,
                `Retur Diterima - ${ret.returnNumber}${notes ? ': ' + notes : ''}`
            );
        } else {
            // Barang Rusak → masuk ke Judgment
            await db.insert('inventoryJudgments', {
                date: new Date().toISOString().split('T')[0],
                itemId: invItem.id,
                itemName: invItem.itemName,
                qty: qtyActual,
                location: 'WHS',
                status: 'DAMAGE (RUSAK FISIK)',
                notes: `Retur Rusak dari ${ret.returnNumber}${notes ? ': ' + notes : ''}`,
                createdBy: 'Admin'
            });
            await db.addInventoryTransaction(
                invItem.id, 'NG_IN', qtyActual,
                'SALES_RETURN', ret.id,
                `Retur Rusak (NG) - ${ret.returnNumber}`
            );
        }
    }

    await db.update('salesReturns', id, {
        status: 'GOODS_RECEIVED',
        receivedAt: new Date().toISOString(),
        receivedQty: qtyActual,
        receivedCondition: conditionActual,
        receivedNotes: notes
    });

    await db.sync('salesReturns');

    const condLabel = conditionActual === 'Good' ? 'Bagus — stok bertambah di gudang ✓' : 'Rusak — masuk ke Judgment ✓';
    showToast(`Barang retur diterima (${condLabel})`);
    window.closeSalesReturnForm();
};



window.processReturnRefund = function (id) {
    const ret = db.findById('salesReturns', id);
    if (!ret) return;
    const method = ret.refundMethod;
    const amount = ret.totalRefund;

    if (!confirm(`Proses refund sebesar ${srFmt(amount)} dengan metode "${method}"?\nJurnal akuntansi akan dibuat secara otomatis.`)) return;

    if (method === 'StoreCredit') {
        // Create Credit Note automatically
        const noteNumber = srGenerateNumber('CN');
        db.insert('creditNotes', {
            noteNumber,
            date: new Date().toISOString(),
            customerId: ret.customerId,
            amount,
            notes: `Store Credit dari Retur ${ret.returnNumber}`,
            invoiceId: null,
            referenceType: 'SALES_RETURN', referenceId: ret.id
        });
        showToast(`Credit Note ${noteNumber} berhasil dibuat untuk Store Credit.`);
    } else {
        // Cash or Bank refund -- create journal entry
        const cashAccountId = method === 'Bank' ? 'acc_bank' : 'acc_cash';
        if (typeof db.addJournalEntry === 'function') {
            db.addJournalEntry({
                description: `Refund Retur ${ret.returnNumber}`,
                referenceId: ret.id, referenceType: 'SALES_RETURN',
                items: [
                    { accountId: 'acc_sales_return', debit: amount, credit: 0 },
                    { accountId: cashAccountId, debit: 0, credit: amount }
                ]
            });
        }
        showToast(`Refund ${srFmt(amount)} diproses. Jurnal akuntansi dibuat.`);
    }

    db.update('salesReturns', id, { status: 'COMPLETED', refundedAt: new Date().toISOString() });
    renderSalesReturns();
};

// ==========================================
// PRODUCT EXCHANGES (TUKAR GULING)
// ==========================================
window.renderProductExchanges = async function () {
    document.getElementById('pageTitle').innerText = 'Tukar Guling';
    const mc = document.getElementById('main-content');

    // Auto-sync on load
    if (window.api && typeof window.api.pullAll === 'function') {
        mc.innerHTML = `<div class="p-20 text-center"><i class="fas fa-spinner fa-spin text-3xl text-purple-500 mb-4"></i><p class="text-slate-400 font-bold uppercase tracking-widest text-[10px]">Menyinkronkan Data...</p></div>`;
        await window.api.pullAll();
    }

    const perm = getModulePermission('penjualan');

    if (!window._exActiveTab) window._exActiveTab = 'pending';
    if (!window._exFilters) window._exFilters = { start: '', end: '', search: '' };
    const filters = window._exFilters;

    let exchanges = db.read('productExchanges') || [];

    if (filters.search) {
        const s = filters.search.toLowerCase();
        exchanges = exchanges.filter(ex =>
            ex.exchangeNumber?.toLowerCase().includes(s) ||
            db.findById('customers', ex.customerId)?.name?.toLowerCase().includes(s) ||
            ex.returnedProductName?.toLowerCase().includes(s)
        );
    }
    if (filters.start) {
        const dd = new Date(filters.start); dd.setHours(0, 0, 0, 0);
        exchanges = exchanges.filter(ex => new Date(ex.date) >= dd);
    }
    if (filters.end) {
        const dd = new Date(filters.end); dd.setHours(23, 59, 59, 999);
        exchanges = exchanges.filter(ex => new Date(ex.date) <= dd);
    }

    exchanges.sort((a, b) => new Date(b.date) - new Date(a.date));

    // All items in one list
    let filteredExchanges = exchanges;

    const rows = filteredExchanges.map(ex => {
        const customer = db.findById('customers', ex.customerId);

        let deleteBtn = '';
        if (perm.edit && (ex.status === 'PENDING' || ex.status === 'APPROVED')) {
            deleteBtn = `
                <button onclick="window.handleEXAction({value: 'delete'}, '${ex.id}')" class="bg-white text-slate-400 hover:text-red-600 hover:bg-red-50 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border border-slate-100 hover:border-red-200 flex items-center gap-2 group/del" title="Hapus Exchange">
                    <i class="fas fa-trash group-hover/del:scale-110 transition-transform"></i> Hapus
                </button>
            `;
        }

        return `
            <tr class="border-b border-slate-50 hover:bg-slate-50/50 transition-colors group">
                <td class="px-6 py-4">
                    <div class="text-sm font-black text-slate-900 mb-1 uppercase tracking-tight">${customer?.name || '-'}</div>
                    <div class="text-[10px] font-black text-blue-600 tracking-[0.1em] uppercase shadow-sm inline-block px-1.5 py-0.5 bg-blue-50 rounded">${ex.soNumber || '-'}</div>
                </td>
                <td class="px-6 py-4">
                    <div class="text-[10px] text-slate-400 font-black uppercase tracking-widest mb-1">Tanggal Exchange</div>
                    <div class="text-xs font-bold text-slate-700">${srDate(ex.date)}</div>
                </td>
                <td class="px-6 py-4">
                    <div class="text-sm font-bold text-red-600 flex items-center gap-2 uppercase tracking-tight"><i class="fas fa-arrow-left text-[10px]"></i> ${ex.returnedProductName} <span class="text-[10px] bg-slate-100 px-1 rounded text-slate-500">x${ex.returnedQty}</span></div>
                    <div class="text-sm font-bold text-green-600 flex items-center gap-2 mt-1 uppercase tracking-tight"><i class="fas fa-arrow-right text-[10px]"></i> ${ex.replacementProductName} <span class="text-[10px] bg-slate-100 px-1 rounded text-slate-500">x${ex.replacementQty}</span></div>
                </td>
                <td class="px-6 py-4 text-center">${srStatusBadge(ex.status)}</td>
                <td class="px-6 py-4 text-right">
                    <div class="inline-block relative w-[130px]">
                        <select class="w-full bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 font-bold text-xs rounded-xl pl-3 pr-8 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer appearance-none transition-all shadow-sm" 
                            onchange="window.handleEXAction(this, '${ex.id}')">
                            <option value="" disabled selected>Pilih Aksi...</option>
                            <option value="print">Cetak Nota</option>
                            ${!['COMPLETED', 'REJECTED', 'CANCELED'].includes(ex.status) ? `<option value="cancel">Batalkan Exchange</option>` : ''}
                            ${perm.edit ? `<option value="delete">Hapus</option>` : ''}
                        </select>
                        <div class="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3 text-slate-400">
                            <i class="fas fa-chevron-down text-[10px]"></i>
                        </div>
                    </div>
                </td>
            </tr>
        `;
    }).join('');

    mc.innerHTML = `
        <div id="ex-list-view" class="animate-in fade-in duration-500 space-y-5">
            <div class="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
                <div class="p-6 md:p-8 bg-gradient-to-br from-slate-50 to-white border-b border-slate-100 flex flex-wrap lg:flex-nowrap items-center justify-between gap-6">
                    <div class="flex-1 min-w-[300px] relative">
                        <i class="fas fa-search absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 text-sm"></i>
                        <input type="text" id="ex_header_search" onkeyup="if(event.key==='Enter') filterEXTable()" value="${filters.search || ''}" placeholder="Cari Pelanggan, No. Exchange, atau Produk..." 
                            class="w-full pl-12 pr-4 py-3 bg-white border-2 border-slate-100 rounded-2xl text-sm font-bold text-slate-600 focus:border-blue-500 outline-none transition-all shadow-sm">
                    </div>
                    
                    <div class="flex items-center gap-3">
                         <div class="relative group" id="ex_date_filter_container">
                            <button onclick="toggleEXDateDropdown()" class="flex items-center bg-white border-2 border-slate-100 rounded-2xl overflow-hidden hover:border-blue-300 transition-all shadow-sm h-[48px] group">
                                <span class="bg-slate-50 px-4 h-full flex items-center text-slate-500 group-hover:bg-slate-100 transition-colors">
                                    <i class="fas fa-calendar-alt text-xs"></i>
                                </span>
                                <span class="px-4 text-[11px] font-black text-slate-400 uppercase tracking-widest">Date Range</span>
                                <span class="pr-3 text-slate-400 group-hover:text-blue-500 transition-colors"><i class="fas fa-chevron-down text-[10px]"></i></span>
                            </button>
                            
                            <div id="ex_date_dropdown" class="absolute right-0 mt-3 w-72 bg-white border border-slate-100 rounded-3xl shadow-2xl z-[200] hidden p-6 animate-in zoom-in-95 duration-200">
                                <h4 class="text-[10px] font-black text-slate-800 uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
                                    <span class="w-1.5 h-1.5 bg-blue-600 rounded-full"></span> PERIODE TUKAR GULING
                                </h4>
                                <div class="space-y-4">
                                    <div class="space-y-1.5">
                                        <label class="block text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Dari Tanggal</label>
                                        <input type="date" id="ex_header_start" value="${filters.start}" class="w-full border-2 border-slate-50 rounded-xl px-4 py-2 text-xs font-black text-slate-700 bg-slate-50/50 focus:bg-white focus:border-blue-500 outline-none transition-all">
                                    </div>
                                    <div class="space-y-1.5">
                                        <label class="block text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Sampai Tanggal</label>
                                        <input type="date" id="ex_header_end" value="${filters.end}" class="w-full border-2 border-slate-50 rounded-xl px-4 py-2 text-xs font-black text-slate-700 bg-slate-50/50 focus:bg-white focus:border-blue-500 outline-none transition-all">
                                    </div>
                                    <div class="flex gap-2 pt-2">
                                        <button onclick="applyEXHeaderDateFilter()" class="flex-1 bg-blue-600 text-white py-2.5 rounded-xl text-[10px] font-black uppercase tracking-[0.2em] hover:bg-slate-900 transition-all shadow-md active:scale-95">Filter</button>
                                        <button onclick="resetEXHeaderDateFilter()" class="flex-1 bg-slate-50 text-slate-400 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-[0.2em] hover:bg-slate-100 transition-all">Reset</button>
                                    </div>
                                </div>
                            </div>
                        </div>

                        ${perm.edit ? `<button onclick="openExchangeForm()" class="h-[48px] px-6 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl text-[11px] font-black uppercase tracking-widest shadow-lg shadow-blue-500/30 transition-all flex items-center gap-2 active:scale-95"><i class="fas fa-plus"></i> Buat</button>` : ''}
                    </div>
                </div>

                <div class="overflow-x-auto min-h-[400px]">
                    <table class="w-full text-left border-collapse">
                        <thead>
                            <tr class="bg-slate-50/30 text-slate-500 font-black uppercase text-[10px] tracking-[0.2em] border-b border-slate-100">
                                <th class="px-6 py-5">Tujuan / Ref Order</th>
                                <th class="px-6 py-5">Logistics Info</th>
                                <th class="px-6 py-5">Barang (Lama -> Baru)</th>
                                <th class="px-6 py-5 text-center">Status Barang</th>
                                <th class="px-6 py-5 text-right w-[180px]">Navigasi</th>
                            </tr>
                        </thead>
                        <tbody class="divide-y divide-slate-50">
                            ${rows || `<tr><td colspan="5" class="py-40 text-center text-slate-300 font-bold uppercase tracking-widest">Data tidak ditemukan.</td></tr>`}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
        <div id="ex-form-view" class="hidden"></div>
    `;
};

window.handleEXAction = async function (select, id) {
    const action = select.value;
    if (!action) return;

    if (action === 'print') {
        window.printProductExchange(id);
    } else if (action === 'cancel') {
        if (confirm('Yakin ingin membatalkan exchange ini? Status di Inventory akan otomatis di-cancel.')) {
            try {
                await api.update('productExchanges', id, { status: 'CANCELED' });
                if (window.api && typeof window.api.pullAll === 'function') await window.api.pullAll();
                showToast('Exchange dibatalkan.');
                renderProductExchanges();
            } catch (e) {
                showToast('Gagal membatalkan: ' + e.message, 'error');
            }
        }
    } else if (action === 'delete') {
        if (confirm('Yakin ingin menghapus tukar guling ini?')) {
            try {
                await db.delete('productExchanges', id);
                if (window.api && typeof window.api.pullAll === 'function') await window.api.pullAll();
                showToast('Tukar Guling berhasil dihapus.');
                renderProductExchanges();
            } catch (e) {
                showToast('Gagal hapus: ' + e.message, 'error');
            }
        }
    }
    select.value = '';
};

window.approveExchangeDoc = async function (id, approved) {
    try {
        if (approved) {
            await api.approveProductExchange(id);
            showToast('Tukar Guling disetujui. Inventory akan terima barang.');
        } else {
            await api.rejectProductExchange(id);
            showToast('Tukar Guling ditolak.', 'warning');
        }
        if (window.api && typeof window.api.pullAll === 'function') await window.api.pullAll();
        renderProductExchanges();
    } catch (err) {
        showToast(`Gagal: ${err.message}`, 'error');
    }
};

window.filterEXTable = () => {
    window._exFilters.search = document.getElementById('ex_header_search').value;
    renderProductExchanges();
};

window.toggleEXDateDropdown = () => document.getElementById('ex_date_dropdown').classList.toggle('hidden');

window.applyEXHeaderDateFilter = () => {
    window._exFilters.start = document.getElementById('ex_header_start').value;
    window._exFilters.end = document.getElementById('ex_header_end').value;
    renderProductExchanges();
};

window.resetEXHeaderDateFilter = () => {
    window._exFilters.start = '';
    window._exFilters.end = '';
    renderProductExchanges();
};

window.openExchangeForm = function (soId = null) {
    const lv = document.getElementById('ex-list-view');
    const fv = document.getElementById('ex-form-view');
    if (!lv || !fv) return;

    lv.classList.add('hidden');
    fv.classList.remove('hidden');

    if (window.renderBreadcrumb) {
        renderBreadcrumb(['Penjualan', 'Tukar Guling', 'Buat Exchange Baru']);
    }

    const customers = db.read('customers');
    let initialCustomerName = '-- Pilih Customer --';
    let initialCustomerId = '';

    if (soId) {
        const so = db.findById('salesOrders', soId);
        if (so) {
            const cust = db.findById('customers', so.customerId);
            initialCustomerName = cust?.name || '';
            initialCustomerId = cust?.id || '';
        }
    }

    const inventoryItems = db.read('inventoryItems').filter(i => i.status === 'ACTIVE');
    const invOptions = inventoryItems.map(i =>
        `<option value="${i.id}" data-price="${i.purchasePrice || 0}" data-name="${i.itemName || ''}">${i.itemName || i.itemCode || 'Item'} (Stok: ${db.getInventoryStock ? db.getInventoryStock(i.id) : (i.stock || 0)})</option>`
    ).join('');

    fv.innerHTML = `
        <div id="ex-form-view" class="animate-in slide-in-from-bottom-10 duration-500 pb-20 bg-slate-50/30 min-h-screen">
            <!-- Compact Header -->
            <div class="bg-white border-b border-slate-100 mb-6">
                <div class="max-w-7xl mx-auto px-8 py-6 flex justify-between items-center">
                    <div>
                        <h2 class="text-xl font-black text-slate-800 tracking-tight">BUAT TUKAR GULING BARU</h2>
                        <p class="text-[9px] font-black text-slate-400 uppercase tracking-widest mt-1 flex items-center gap-1.5">
                            <i class="fas fa-exchange-alt text-blue-500"></i> Penjualan / Tukar Guling Produk
                        </p>
                    </div>
                    <div class="flex items-center gap-3">
                        <button onclick="window.closeExchangeForm()" class="px-5 py-2.5 text-[9px] font-black uppercase tracking-widest text-slate-400 hover:text-slate-600 transition-all">Batal</button>
                        <button onclick="window.saveExchange()" class="bg-blue-600 hover:bg-blue-700 text-white px-8 py-2.5 rounded-xl text-[9px] font-black uppercase tracking-widest shadow-lg shadow-blue-500/20 transition-all active:scale-95 flex items-center gap-2">
                            <i class="fas fa-check-circle"></i> Simpan Exchange
                        </button>
                    </div>
                </div>
            </div>

            <div class="max-w-7xl mx-auto px-8 mt-10 space-y-8">
                <!-- 1. INFORMASI DASAR -->
                <div class="bg-white rounded-3xl p-10 border border-slate-100 shadow-sm space-y-8">
                    <h3 class="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] flex items-center gap-2">
                        <i class="fas fa-info-circle text-blue-600"></i> INFORMASI DASAR
                    </h3>
                    
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div class="space-y-2">
                            <label class="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Pilih Customer</label>
                            <div class="relative" id="ex_customer_container">
                                <input type="text" id="ex_customer_search" value="${initialCustomerName}" readonly
                                    onclick="window.toggleCustomerDropdownEX('ex_customer_dropdown', true)"
                                    class="w-full bg-slate-50 border-2 border-transparent rounded-2xl px-5 py-3 text-sm font-black text-slate-700 focus:bg-white focus:border-blue-500/20 focus:ring-4 focus:ring-blue-500/5 outline-none transition-all cursor-pointer shadow-sm">
                                <input type="hidden" id="ex_customer" value="${initialCustomerId}">
                                
                                <div id="ex_customer_dropdown" class="absolute left-0 mt-2 w-full min-w-[300px] bg-white border border-slate-100 rounded-2xl shadow-2xl z-[200] hidden overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                                    <div class="p-4 border-b border-slate-50 bg-slate-50/30">
                                        <div class="relative">
                                            <i class="fas fa-search absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 text-xs"></i>
                                            <input type="text" id="ex_customer_filter_input" onkeyup="window.filterCustomerSelectorEX(this.value)" 
                                                placeholder="Cari Nama Customer..." 
                                                class="w-full pl-10 pr-4 py-2 bg-white border border-slate-100 rounded-xl text-xs font-bold outline-none focus:border-blue-500 transition-all">
                                        </div>
                                    </div>
                                    <div class="max-h-64 overflow-y-auto p-1" id="ex_customer_list"></div>
                                </div>
                            </div>
                        </div>
                        <div class="space-y-2">
                            <label class="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Sales Order Terkait</label>
                            <select id="ex_so" class="w-full h-[52px] bg-slate-50 border-2 border-transparent rounded-2xl px-5 py-3 text-sm font-black text-blue-600 outline-none focus:bg-white focus:border-blue-500/20 focus:ring-4 focus:ring-blue-500/5 transition-all shadow-sm" onchange="window.loadSOItemsForExchange()">
                                <option value="">-- Pilih Customer Dahulu --</option>
                            </select>
                        </div>
                    </div>
                </div>

                <!-- 2. KONFIGURASI PENUKARAN -->
                <div id="ex_details_section" class="opacity-40 pointer-events-none transition-all duration-500 space-y-8">
                    <div class="bg-white rounded-3xl p-10 border border-slate-100 shadow-sm space-y-8">
                        <h3 class="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] flex items-center gap-2">
                            <i class="fas fa-sync-alt text-blue-600"></i> KONFIGURASI PENUKARAN ITEM
                        </h3>

                        <div class="grid grid-cols-1 lg:grid-cols-2 gap-10">
                            <!-- Returned Item -->
                            <div class="space-y-6 p-8 bg-red-50/20 rounded-[2rem] border-2 border-red-100/50 relative">
                                <div class="absolute top-0 right-0 w-32 h-32 bg-red-500/5 rounded-full blur-3xl -mr-10 -mt-10"></div>
                                <h4 class="text-[11px] font-black text-red-600 uppercase tracking-widest flex items-center gap-2 relative z-10">
                                    <span class="w-6 h-6 bg-red-600 text-white rounded-lg flex items-center justify-center text-[10px]"><i class="fas fa-arrow-down"></i></span>
                                    Barang Yang Dikembalikan
                                </h4>
                                
                                <div class="space-y-5 relative z-10">
                                    <div class="space-y-2">
                                        <label class="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Pilih Produk Dari SO</label>
                                        <div class="relative" id="ex_ret_prod_container">
                                            <input type="text" id="ex_ret_prod_search" value="-- PILIH PRODUK --" readonly
                                                onclick="window.toggleProductDropdownEX('ex_ret_prod_dropdown', true, 'returned')"
                                                class="w-full bg-white border-2 border-slate-100 rounded-2xl px-5 py-3 text-sm font-black text-slate-700 shadow-sm focus:border-red-500/20 focus:ring-4 focus:ring-red-500/5 outline-none transition-all cursor-pointer">
                                            <input type="hidden" id="ex_returned_product">
                                            
                                            <div id="ex_ret_prod_dropdown" class="absolute left-0 mt-2 w-full min-w-[350px] bg-white border border-slate-100 rounded-[2rem] shadow-2xl z-[200] hidden overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                                                <div class="p-6 border-b border-slate-50 bg-slate-50/30">
                                                    <div class="relative">
                                                        <i class="fas fa-search absolute left-5 top-1/2 -translate-y-1/2 text-slate-400 text-sm"></i>
                                                        <input type="text" id="ex_ret_prod_filter" onkeyup="window.filterProductSelectorEX(this.value, 'returned')" 
                                                            placeholder="Ketik kode atau nama..." 
                                                            class="w-full pl-12 pr-4 py-3 bg-white border-2 border-slate-100 rounded-2xl text-sm font-bold outline-none focus:border-red-500 transition-all shadow-sm">
                                                    </div>
                                                </div>
                                                <div class="max-h-80 overflow-y-auto p-2 custom-scrollbar" id="ex_ret_prod_list"></div>
                                                <div class="p-4 bg-slate-50/50 border-t border-slate-100 flex flex-col gap-2">
                                                    <button class="w-full py-2 px-4 text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-3 hover:text-blue-600 transition-all">
                                                        <div class="w-8 h-8 rounded-xl bg-white border border-slate-100 flex items-center justify-center shadow-sm"><i class="fas fa-plus"></i></div>
                                                        Create a New Product
                                                    </button>
                                                    <button class="w-full py-2 px-4 text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-3 hover:text-blue-600 transition-all">
                                                        <div class="w-8 h-8 rounded-xl bg-white border border-slate-100 flex items-center justify-center shadow-sm"><i class="fas fa-search"></i></div>
                                                        Advanced Search
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                    <div class="grid grid-cols-2 gap-5">
                                        <div class="space-y-2">
                                            <label class="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Qty Retur (KG)</label>
                                            <input type="number" id="ex_returned_qty" min="1" value="1" class="w-full bg-white border-2 border-slate-100 rounded-2xl px-5 py-3 text-sm font-black text-slate-700 shadow-sm focus:border-red-500/20 focus:ring-4 focus:ring-red-500/5 outline-none transition-all" onchange="calcExchangeDiff()">
                                        </div>
                                        <div class="space-y-2">
                                            <label class="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Kondisi Fisik</label>
                                            <select id="ex_condition" class="w-full bg-white border-2 border-slate-100 rounded-2xl px-5 py-3 text-sm font-black text-slate-700 shadow-sm focus:border-red-500/20 focus:ring-4 focus:ring-red-500/5 outline-none transition-all uppercase">
                                                <option value="Good">BAGUS / GOOD</option>
                                                <option value="Damaged">RUSAK / DAMAGED</option>
                                            </select>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <!-- Replacement Item -->
                            <div class="space-y-6 p-8 bg-emerald-50/20 rounded-[2rem] border-2 border-emerald-100/50 relative">
                                <div class="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 rounded-full blur-3xl -mr-10 -mt-10"></div>
                                <h4 class="text-[11px] font-black text-emerald-600 uppercase tracking-widest flex items-center gap-2 relative z-10">
                                    <span class="w-6 h-6 bg-emerald-600 text-white rounded-lg flex items-center justify-center text-[10px]"><i class="fas fa-arrow-up"></i></span>
                                    Barang Pengganti (Baru)
                                </h4>
                                
                                <div class="space-y-5 relative z-10">
                                    <div class="space-y-2">
                                        <label class="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Pilih Produk Pengganti</label>
                                        <div class="relative" id="ex_rep_prod_container">
                                            <input type="text" id="ex_rep_prod_search" value="-- PILIH PRODUK --" readonly
                                                onclick="window.toggleProductDropdownEX('ex_rep_prod_dropdown', true, 'replacement')"
                                                class="w-full bg-white border-2 border-slate-100 rounded-2xl px-5 py-3 text-sm font-black text-slate-700 shadow-sm focus:border-emerald-500/20 focus:ring-4 focus:ring-emerald-500/5 outline-none transition-all cursor-pointer">
                                            <input type="hidden" id="ex_replacement_product">
                                            
                                            <div id="ex_rep_prod_dropdown" class="absolute left-0 mt-2 w-full min-w-[350px] bg-white border border-slate-100 rounded-[2rem] shadow-2xl z-[200] hidden overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                                                <div class="p-6 border-b border-slate-50 bg-slate-50/30">
                                                    <div class="relative">
                                                        <i class="fas fa-search absolute left-5 top-1/2 -translate-y-1/2 text-slate-400 text-sm"></i>
                                                        <input type="text" id="ex_rep_prod_filter" onkeyup="window.filterProductSelectorEX(this.value, 'replacement')" 
                                                            placeholder="Ketik kode atau nama..." 
                                                            class="w-full pl-12 pr-4 py-3 bg-white border-2 border-slate-100 rounded-2xl text-sm font-bold outline-none focus:border-emerald-500 transition-all shadow-sm">
                                                    </div>
                                                </div>
                                                <div class="max-h-80 overflow-y-auto p-2 custom-scrollbar" id="ex_rep_prod_list"></div>
                                                <div class="p-4 bg-slate-50/50 border-t border-slate-100 flex flex-col gap-2">
                                                    <button class="w-full py-2 px-4 text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-3 hover:text-blue-600 transition-all">
                                                        <div class="w-8 h-8 rounded-xl bg-white border border-slate-100 flex items-center justify-center shadow-sm"><i class="fas fa-plus"></i></div>
                                                        Create a New Product
                                                    </button>
                                                    <button class="w-full py-2 px-4 text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-3 hover:text-blue-600 transition-all">
                                                        <div class="w-8 h-8 rounded-xl bg-white border border-slate-100 flex items-center justify-center shadow-sm"><i class="fas fa-search"></i></div>
                                                        Advanced Search
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                    <div class="space-y-2">
                                        <label class="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Qty Pengganti (KG)</label>
                                        <input type="number" id="ex_replacement_qty" min="1" value="1" class="w-full bg-white border-2 border-slate-100 rounded-2xl px-5 py-3 text-sm font-black text-slate-700 shadow-sm focus:border-emerald-500/20 focus:ring-4 focus:ring-emerald-500/5 outline-none transition-all" onchange="calcExchangeDiff()">
                                    </div>
                                </div>
                            </div>
                        </div>

                    </div>

                    <!-- 3. ALASAN & CATATAN -->
                    <div class="bg-white rounded-3xl p-10 border border-slate-100 shadow-sm space-y-6">
                        <h3 class="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] flex items-center gap-2">
                            <i class="fas fa-comment-alt text-blue-600"></i> ALASAN & CATATAN
                        </h3>
                        <textarea id="ex_reason" rows="3" class="w-full bg-slate-50 border-2 border-transparent rounded-2xl px-5 py-4 text-sm font-black text-slate-700 focus:bg-white focus:border-blue-500/20 focus:ring-4 focus:ring-blue-500/5 outline-none transition-all resize-none uppercase" placeholder="JELASKAN ALASAN PENUKARAN SECARA DETAIL..."></textarea>
                    </div>
                </div>
            </div>
        </div>
    `;
    if (soId) { setTimeout(() => window.loadSOItemsForExchange(), 100); }
};

window.closeExchangeForm = () => {
    const lv = document.getElementById('ex-list-view');
    const fv = document.getElementById('ex-form-view');
    if (lv) lv.classList.remove('hidden');
    if (fv) fv.classList.add('hidden');
    renderProductExchanges();
};

window.toggleCustomerDropdownEX = function (id, show) {
    const el = document.getElementById(id);
    if (!el) return;
    if (show) {
        if (!el.classList.contains('hidden')) { el.classList.add('hidden'); return; }
        el.classList.remove('hidden');
        window.filterCustomerSelectorEX('');
        setTimeout(() => document.getElementById('ex_customer_filter_input')?.focus(), 50);
        const closer = (e) => {
            if (!el.contains(e.target) && e.target.id !== 'ex_customer_search') {
                el.classList.add('hidden');
                document.removeEventListener('click', closer);
            }
        };
        setTimeout(() => document.addEventListener('click', closer), 10);
    } else { el.classList.add('hidden'); }
};

window.filterCustomerSelectorEX = function (q) {
    const list = document.getElementById('ex_customer_list');
    if (!list) return;
    const customers = db.read('customers').filter(c => c.name.toLowerCase().includes(q.toLowerCase()));
    list.innerHTML = customers.map(c => `
        <div onclick="window.selectCustomerEX('${c.id}', '${c.name.replace(/'/g, "\\'")}')" 
            class="px-5 py-3 hover:bg-blue-50 cursor-pointer transition-all border-b border-slate-50 last:border-0 group">
            <div class="text-xs font-black text-slate-700 group-hover:text-blue-700 uppercase tracking-wide">${c.name}</div>
            <div class="text-[9px] font-bold text-slate-400 uppercase tracking-widest">${c.id}</div>
        </div>
    `).join('') || '<div class="p-8 text-center text-[10px] font-black text-slate-300 uppercase tracking-widest">Customer tidak ditemukan</div>';
};

window.selectCustomerEX = function (id, name) {
    document.getElementById('ex_customer').value = id;
    document.getElementById('ex_customer_search').value = name;
    document.getElementById('ex_customer_dropdown').classList.add('hidden');

    // Reset SO
    const soSelect = document.getElementById('ex_so');
    soSelect.innerHTML = '<option value="">-- Loading SO... --</option>';

    const salesOrders = db.read('salesOrders').filter(so => so.customerId === id && ['CONFIRMED', 'DELIVERED', 'COMPLETED'].includes(so.status));
    if (salesOrders.length === 0) {
        soSelect.innerHTML = '<option value="">-- Tidak Ada SO --</option>';
    } else {
        soSelect.innerHTML = '<option value="">-- Pilih Sales Order --</option>' +
            salesOrders.map(so => `<option value="${so.id}">${so.soNumber} (${srDate(so.date)})</option>`).join('');
    }

    // Enable details section logic
    document.getElementById('ex_details_section').classList.add('opacity-40', 'pointer-events-none');
    document.getElementById('ex_returned_product').value = '';
    document.getElementById('ex_ret_prod_search').value = '-- PILIH PRODUK --';
};

window.loadSOItemsForExchange = function () {
    const soId = document.getElementById('ex_so').value;
    const searchInput = document.getElementById('ex_ret_prod_search');

    if (!soId) {
        searchInput.value = '-- Pilih SO Dulu --';
        document.getElementById('ex_details_section').classList.add('opacity-40', 'pointer-events-none');
        return;
    }

    document.getElementById('ex_details_section').classList.remove('opacity-40', 'pointer-events-none');
    searchInput.value = '-- PILIH PRODUK --';
    window.calcExchangeDiff();
};

window.toggleProductDropdownEX = function (id, show, type) {
    const el = document.getElementById(id);
    if (!el) return;
    if (show) {
        if (!el.classList.contains('hidden')) { el.classList.add('hidden'); return; }
        el.classList.remove('hidden');
        window.filterProductSelectorEX('', type);
        const filterInput = document.getElementById(type === 'returned' ? 'ex_ret_prod_filter' : 'ex_rep_prod_filter');
        setTimeout(() => filterInput?.focus(), 50);

        const closer = (e) => {
            const searchInput = document.getElementById(type === 'returned' ? 'ex_ret_prod_search' : 'ex_rep_prod_search');
            if (!el.contains(e.target) && e.target !== searchInput) {
                el.classList.add('hidden');
                document.removeEventListener('click', closer);
            }
        };
        setTimeout(() => document.addEventListener('click', closer), 10);
    } else { el.classList.add('hidden'); }
};

window.filterProductSelectorEX = function (q, type) {
    const list = document.getElementById(type === 'returned' ? 'ex_ret_prod_list' : 'ex_rep_prod_list');
    if (!list) return;

    let items = [];
    if (type === 'returned') {
        const soId = document.getElementById('ex_so').value;
        const so = db.findById('salesOrders', soId);
        if (so && so.items) {
            items = so.items.filter(i =>
                (i.productName || '').toLowerCase().includes(q.toLowerCase()) ||
                (i.prodText || '').toLowerCase().includes(q.toLowerCase())
            );
        }
    } else {
        items = db.read('inventoryItems').filter(i =>
            i.status === 'ACTIVE' &&
            (i.itemCode || '').startsWith('FG') &&
            ((i.itemName || '').toLowerCase().includes(q.toLowerCase()) || (i.itemCode || '').toLowerCase().includes(q.toLowerCase()))
        );
    }

    list.innerHTML = items.map(i => {
        const invId = i.inventoryItemId || i.productId || i.id;
        const invItem = db.findById('inventoryItems', invId);
        const name = i.prodText || i.productName || i.itemName || invItem?.itemName || 'Item';
        const code = i.productCode || i.itemCode || invItem?.itemCode || '-';
        const stock = db.getInventoryStock ? db.getInventoryStock(invId) : (i.stock || invItem?.stock || 0);
        const price = i.price || i.unitPrice || i.purchasePrice || invItem?.purchasePrice || 0;

        return `
            <div onclick="window.selectProductEX('${invId}', '${name.replace(/'/g, "\\'")}', '${price}', '${type}')" 
                class="px-5 py-4 hover:bg-blue-50/50 cursor-pointer transition-all border-b border-slate-50 last:border-0 group rounded-2xl">
                <div class="flex justify-between items-start">
                    <div class="space-y-1">
                        <div class="text-[12px] font-black text-slate-800 group-hover:text-blue-700 uppercase tracking-tight transition-colors">${name}</div>
                        <div class="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] flex items-center gap-1.5">
                            <i class="fas fa-barcode text-[8px]"></i> ${code}
                        </div>
                    </div>
                    <div class="text-right space-y-1">
                        <div class="text-[10px] font-black text-blue-600 uppercase tracking-widest flex items-center justify-end gap-1.5">
                             STOCK: ${stock}
                        </div>
                        <div class="text-[11px] font-bold text-slate-400 tracking-tight">${srFmt(price)}</div>
                    </div>
                </div>
            </div>
        `;
    }).join('') || '<div class="p-8 text-center text-[10px] font-black text-slate-300 uppercase tracking-widest">Produk tidak ditemukan</div>';
};

window.selectProductEX = function (id, name, price, type) {
    const idInput = document.getElementById(type === 'returned' ? 'ex_returned_product' : 'ex_replacement_product');
    const searchInput = document.getElementById(type === 'returned' ? 'ex_ret_prod_search' : 'ex_rep_prod_search');
    const dropdown = document.getElementById(type === 'returned' ? 'ex_ret_prod_dropdown' : 'ex_rep_prod_dropdown');

    idInput.value = id;
    searchInput.value = name;
    dropdown.classList.add('hidden');
    window.calcExchangeDiff();
};

window.calcExchangeDiff = function () {
    // Hidden as requested
};

window.saveExchange = async function () {
    const soId = document.getElementById('ex_so').value;
    const returnedProductId = document.getElementById('ex_returned_product').value;
    const replacementProductId = document.getElementById('ex_replacement_product').value;
    const retQty = parseFloat(document.getElementById('ex_returned_qty').value) || 0;
    const repQty = parseFloat(document.getElementById('ex_replacement_qty').value) || 0;
    const reason = document.getElementById('ex_reason').value.trim();
    const condition = document.getElementById('ex_condition').value;
    const customerId = document.getElementById('ex_customer').value;

    if (!soId || !returnedProductId || !replacementProductId || retQty <= 0 || repQty <= 0) {
        showToast('Isi semua data yang diperlukan.', 'error'); return;
    }

    const so = db.findById('salesOrders', soId);
    const retItem = so?.items?.find(i => (i.inventoryItemId || i.productId) === returnedProductId);
    const repItem = db.findById('inventoryItems', replacementProductId);

    const retPrice = parseFloat(retItem?.price || retItem?.unitPrice || 0);
    const repPrice = parseFloat(repItem?.unitPrice || repItem?.purchasePrice || 0);
    const diff = (repPrice * repQty) - (retPrice * retQty);

    try {
        const result = await api.createProductExchange({
            soId, soNumber: so?.soNumber || '',
            customerId: customerId || so?.customerId || '',
            returnedProductId,
            returnedProductName: retItem?.productName || retItem?.prodText || 'Produk',
            returnedQty: retQty, returnedPrice: retPrice, returnedCondition: condition,
            replacementProductId,
            replacementProductName: repItem?.itemName || 'Produk Pengganti',
            replacementQty: repQty, replacementPrice: repPrice,
            priceDifference: diff, reason
        });
        showToast(`Tukar Guling ${result.exchangeNumber} berhasil dibuat. Menunggu persetujuan.`);
        if (window.api && typeof window.api.pullAll === 'function') await window.api.pullAll();
        await db.sync('productExchanges');
        window.closeExchangeForm();
    } catch (err) {
        showToast(`Gagal membuat tukar guling: ${err.message}`, 'error');
    }
};

window.approveExchange = async function (id, approved) {
    const ex = db.findById('productExchanges', id);
    if (!ex) return;
    try {
        await api.updateProductExchange(id, { status: approved ? 'APPROVED' : 'DRAFT' });
        showToast(`Dokumen Tukar Guling ${approved ? 'Disetujui' : 'Dibatalkan Approvalnya'}`);
        await db.sync('productExchanges');
        renderProductExchanges();
    } catch (err) {
        showToast(`Gagal: ${err.message}`, 'error');
    }
};

window.receiveExchangeReturn = function (id) {
    const ex = db.findById('productExchanges', id);
    if (!ex) return;
    const invItem = db.findById('inventoryItems', ex.returnedProductId);

    // Open form
    const lv = document.getElementById('ex-list-view');
    const fv = document.getElementById('ex-form-view');
    if (!lv || !fv) return;
    lv.classList.add('hidden');
    fv.classList.remove('hidden');

    fv.innerHTML = `
        <div class="animate-in fade-in slide-in-from-bottom-4 duration-500 -m-6 h-[calc(100vh-64px)] flex flex-col overflow-hidden bg-white">
            <div class="sticky top-0 z-40 bg-white border-b border-slate-100 px-8 py-4 flex items-center justify-between shrink-0 shadow-sm">
                <div>
                    <h2 class="text-lg font-black text-slate-800 tracking-tight">Terima Barang (Tukar Guling)</h2>
                    <p class="text-[10px] font-black text-slate-400 uppercase tracking-widest">Gudang / Penerimaan Retur</p>
                </div>
                <div class="flex items-center gap-3">
                    <button onclick="window.closeExchangeForm()" class="px-6 py-2.5 bg-slate-100 text-slate-500 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-200 transition-all active:scale-95">Batal</button>
                    <button onclick="window.confirmReceiveExchange('${id}')" class="px-8 py-2.5 bg-emerald-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-emerald-700 transition-all shadow-lg active:scale-95 flex items-center gap-2">
                        <i class="fas fa-check-circle text-[10px]"></i> Konfirmasi Terima
                    </button>
                </div>
            </div>

            <div class="flex-1 overflow-y-auto bg-slate-50/50 p-8">
                <div class="max-w-3xl mx-auto space-y-6">
                    <div class="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm">
                        <h3 class="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4">Item Yang Dikembalikan</h3>
                        <div class="flex items-center gap-4 p-4 bg-red-50 rounded-2xl">
                            <div class="w-12 h-12 bg-red-600 rounded-xl flex items-center justify-center text-white"><i class="fas fa-box"></i></div>
                            <div class="flex-1">
                                <div class="text-base font-black text-slate-900">${ex.returnedProductName}</div>
                                <div class="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Diharapkan: ${ex.returnedQty} ${invItem?.unit || 'KG'}</div>
                            </div>
                        </div>
                    </div>

                    <div class="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm space-y-4">
                        <div class="space-y-2">
                            <label class="block text-[10px] font-black text-slate-400 uppercase tracking-widest">Qty Aktual Diterima</label>
                            <input type="number" id="ex_recv_qty" value="${ex.returnedQty}" class="w-full bg-slate-50 border-2 border-transparent rounded-2xl px-5 py-3 text-lg font-black text-slate-700 focus:bg-white focus:border-emerald-500/30 outline-none transition-all">
                        </div>
                        <div class="space-y-2">
                            <label class="block text-[10px] font-black text-slate-400 uppercase tracking-widest">Kondisi Aktual</label>
                            <select id="ex_recv_condition" class="w-full bg-slate-50 border-2 border-transparent rounded-2xl px-5 py-3 text-sm font-black text-slate-700 focus:bg-white focus:border-emerald-500/30 outline-none transition-all">
                                <option value="Good" ${ex.returnedCondition === 'Good' ? 'selected' : ''}>BAGUS / GOOD</option>
                                <option value="Damaged" ${ex.returnedCondition !== 'Good' ? 'selected' : ''}>RUSAK / DAMAGED</option>
                            </select>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;
};

window.confirmReceiveExchange = async function (id) {
    const qty = parseFloat(document.getElementById('ex_recv_qty').value) || 0;
    const cond = document.getElementById('ex_recv_condition').value;
    if (qty <= 0) { showToast('Qty harus lebih dari 0', 'error'); return; }

    try {
        await api.receiveProductExchange(id, { receivedQty: qty, receivedCondition: cond, receivedNotes: '' });
        await db.sync('productExchanges');
        const condLabel = cond === 'Good' ? 'Bagus — stok bertambah (RETURN_IN)' : 'Rusak — masuk Judgment';
        showToast(`Barang retur exchange diterima (${condLabel}).`);
        window.closeExchangeForm();
    } catch (err) {
        showToast(`Gagal: ${err.message}`, 'error');
    }
};

window.shipExchangeReplacement = function (id) {
    const ex = db.findById('productExchanges', id);
    if (!ex) return;

    // Open form
    const lv = document.getElementById('ex-list-view');
    const fv = document.getElementById('ex-form-view');
    if (!lv || !fv) return;
    lv.classList.add('hidden');
    fv.classList.remove('hidden');

    fv.innerHTML = `
        <div class="animate-in fade-in slide-in-from-bottom-4 duration-500 -m-6 h-[calc(100vh-64px)] flex flex-col overflow-hidden bg-white">
            <div class="sticky top-0 z-40 bg-white border-b border-slate-100 px-8 py-4 flex items-center justify-between shrink-0 shadow-sm">
                <div>
                    <h2 class="text-lg font-black text-slate-800 tracking-tight">Kirim Barang Pengganti</h2>
                    <p class="text-[10px] font-black text-slate-400 uppercase tracking-widest">Logistik / Pengiriman Ganti</p>
                </div>
                <div class="flex items-center gap-3">
                    <button onclick="window.closeExchangeForm()" class="px-6 py-2.5 bg-slate-100 text-slate-500 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-200 transition-all active:scale-95">Batal</button>
                    <button onclick="window.confirmShipExchange('${id}')" class="px-8 py-2.5 bg-blue-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-blue-700 transition-all shadow-lg active:scale-95 flex items-center gap-2">
                        <i class="fas fa-shipping-fast text-[10px]"></i> Konfirmasi Kirim
                    </button>
                </div>
            </div>

            <div class="flex-1 overflow-y-auto bg-slate-50/50 p-8">
                <div class="max-w-3xl mx-auto space-y-6">
                    <div class="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm">
                        <h3 class="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4">Item Pengganti</h3>
                        <div class="flex items-center gap-4 p-4 bg-emerald-50 rounded-2xl">
                            <div class="w-12 h-12 bg-emerald-600 rounded-xl flex items-center justify-center text-white"><i class="fas fa-truck-loading"></i></div>
                            <div class="flex-1">
                                <div class="text-base font-black text-slate-900">${ex.replacementProductName}</div>
                                <div class="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Qty Kirim: ${ex.replacementQty} KG</div>
                            </div>
                        </div>
                    </div>
                    
                    <div class="bg-blue-50 border border-blue-100 rounded-2xl p-4 flex items-start gap-3">
                        <i class="fas fa-info-circle text-blue-600 mt-0.5"></i>
                        <p class="text-[11px] text-blue-800 font-bold leading-relaxed">Pastikan stok fisik tersedia di gudang. Konfirmasi ini akan otomatis memotong stok dan membuat jurnal HPP.</p>
                    </div>
                </div>
            </div>
        </div>
    `;
};

window.confirmShipExchange = async function (id) {
    try {
        await api.shipProductExchange(id);
        showToast('Barang pengganti dikirim. Tukar Guling Selesai.');
        if (window.api && typeof window.api.pullAll === 'function') await window.api.pullAll();
        window.closeExchangeForm();
    } catch (err) {
        showToast(`Gagal: ${err.message}`, 'error');
    }
};

// ==========================================
// SALES RETURN REPORTS
// ==========================================
window.renderSalesReturnReports = function () {
    document.getElementById('pageTitle').innerText = 'Laporan Retur Penjualan';
    const mc = document.getElementById('main-content');
    const returns = db.read('salesReturns');
    const exchanges = db.read('productExchanges');
    const customers = db.read('customers');

    // Stats
    const totalReturns = returns.length;
    const totalExchanges = exchanges.length;
    const totalRefundValue = returns.reduce((s, r) => s + (r.totalRefund || 0), 0);
    const completedReturns = returns.filter(r => r.status === 'COMPLETED').length;
    const goodCondition = returns.filter(r => r.condition === 'Good').length;
    const damagedCondition = returns.filter(r => r.condition === 'Damaged').length;

    // Top returned products
    const productMap = {};
    returns.forEach(r => {
        if (!r.productName) return;
        productMap[r.productName] = (productMap[r.productName] || 0) + r.qtyReturned;
    });
    const topProducts = Object.entries(productMap).sort((a, b) => b[1] - a[1]).slice(0, 5);

    // Customer return history
    const custMap = {};
    returns.forEach(r => {
        const name = db.findById('customers', r.customerId)?.name || 'Unknown';
        custMap[name] = (custMap[name] || 0) + 1;
    });
    const topCustomers = Object.entries(custMap).sort((a, b) => b[1] - a[1]).slice(0, 5);

    mc.innerHTML = `
        <div class="space-y-6">
            <!-- KPI Cards -->
            <div class="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div class="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
                    <p class="text-xs text-gray-500 uppercase font-bold">Total Retur</p>
                    <p class="text-3xl font-bold text-blue-600 mt-1">${totalReturns}</p>
                    <p class="text-xs text-gray-400 mt-1">${completedReturns} selesai</p>
                </div>
                <div class="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
                    <p class="text-xs text-gray-500 uppercase font-bold">Total Tukar Guling</p>
                    <p class="text-3xl font-bold text-blue-600 mt-1">${totalExchanges}</p>
                </div>
                <div class="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
                    <p class="text-xs text-gray-500 uppercase font-bold">Total Nilai Refund</p>
                    <p class="text-2xl font-bold text-purple-600 mt-1">${srFmt(totalRefundValue)}</p>
                </div>
                <div class="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
                    <p class="text-xs text-gray-500 uppercase font-bold">Kondisi Barang</p>
                    <p class="mt-2 text-sm font-bold text-green-600">${goodCondition} Bagus <span class="text-gray-400 font-normal">|</span> <span class="text-red-500">${damagedCondition} Rusak</span></p>
                </div>
            </div>

            <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                <!-- Top Returned Products -->
                <div class="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                    <div class="p-4 border-b border-gray-100">
                        <h3 class="font-bold text-gray-800">Produk Paling Sering Diretur</h3>
                    </div>
                    <div class="p-4 space-y-3">
                        ${topProducts.length === 0 ? '<p class="text-gray-400 text-sm text-center py-4">Belum ada data.</p>' :
            topProducts.map(([name, qty], i) => `
                                <div class="flex items-center gap-3">
                                    <span class="w-6 h-6 flex items-center justify-center rounded-full bg-blue-100 text-blue-600 text-xs font-bold">${i + 1}</span>
                                    <span class="flex-1 text-sm text-gray-700">${name}</span>
                                    <span class="font-bold text-blue-600">${qty}x</span>
                                </div>
                            `).join('')}
                    </div>
                </div>

                <!-- Customer Return History -->
                <div class="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                    <div class="p-4 border-b border-gray-100">
                        <h3 class="font-bold text-gray-800">Customer Paling Sering Retur</h3>
                    </div>
                    <div class="p-4 space-y-3">
                        ${topCustomers.length === 0 ? '<p class="text-gray-400 text-sm text-center py-4">Belum ada data.</p>' :
            topCustomers.map(([name, count], i) => `
                                <div class="flex items-center gap-3">
                                    <span class="w-6 h-6 flex items-center justify-center rounded-full bg-blue-100 text-blue-600 text-xs font-bold">${i + 1}</span>
                                    <span class="flex-1 text-sm text-gray-700">${name}</span>
                                    <span class="font-bold text-blue-600">${count}x</span>
                                </div>
                            `).join('')}
                    </div>
                </div>
            </div>

            <!-- Full Return History Table -->
            <div class="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                <div class="p-4 border-b border-gray-100"><h3 class="font-bold text-gray-800">Riwayat Semua Retur</h3></div>
                <div class="overflow-x-auto">
                    <table class="w-full text-left border-collapse">
                        <thead class="bg-gray-50 text-slate-500 text-[11px] uppercase tracking-wider">
                            <tr>
                                <th class="px-4 py-3 border-b border-gray-100">No. Retur</th>
                                <th class="px-4 py-3 border-b border-gray-100">Tanggal</th>
                                <th class="px-4 py-3 border-b border-gray-100">Pelanggan</th>
                                <th class="px-4 py-3 border-b border-gray-100">Produk</th>
                                <th class="px-4 py-3 border-b border-gray-100">Metode Refund</th>
                                <th class="px-4 py-3 border-b border-gray-100 text-right">Nilai Refund</th>
                                <th class="px-4 py-3 border-b border-gray-100">Status</th>
                            </tr>
                        </thead>
                        <tbody class="text-sm divide-y divide-gray-100">
                            ${returns.length === 0 ? '<tr><td colspan="7" class="px-6 py-12 text-center text-gray-400 italic">Belum ada data retur.</td></tr>' :
            returns.map(r => `
                                    <tr class="hover:bg-gray-50/50">
                                        <td class="px-4 py-3 font-bold text-blue-600">${r.returnNumber}</td>
                                        <td class="px-4 py-3 text-gray-600">${srDate(r.date)}</td>
                                        <td class="px-4 py-3 text-gray-800">${db.findById('customers', r.customerId)?.name || 'N/A'}</td>
                                        <td class="px-4 py-3">${r.productName} <span class="text-xs text-gray-400">x${r.qtyReturned}</span></td>
                                        <td class="px-4 py-3 text-gray-600">${r.refundMethod}</td>
                                        <td class="px-4 py-3 text-right font-bold text-blue-600">${srFmt(r.totalRefund || 0)}</td>
                                        <td class="px-4 py-3">${srStatusBadge(r.status)}</td>
                                    </tr>
                                `).join('')}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    `;
};

window.openPrintWindow = function (type, id, data = null) {
    if (type === 'sales-return') {
        const sr = data || db.findById('salesReturns', id);
        if (!sr) return;

        const items = Array.isArray(data) ? data : (data ? [data] : [sr]);
        const first = items[0] || sr;
        const customer = db.findById('customers', first.customerId);

        let grandTotal = 0;
        const itemRows = items.map((item, idx) => {
            const subtotal = (parseFloat(item.unitPrice) || 0) * (parseFloat(item.qtyReturned) || 0);
            grandTotal += subtotal;
            const invItem = db.findById('inventoryItems', item.productId);
            return `
                <tr class="border-b border-slate-100">
                    <td class="py-3 px-2 text-center text-xs">${idx + 1}</td>
                    <td class="py-3 px-2 text-xs font-bold text-slate-800">
                        ${item.productName}
                        <div class="text-[9px] text-slate-400 mt-0.5 font-mono">CODE: ${invItem?.itemCode || item.productId}</div>
                    </td>
                    <td class="py-3 px-2 text-center">
                        <span class="px-2 py-0.5 rounded text-[9px] font-black uppercase ${item.condition === 'Good' ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'}">${item.condition === 'Good' ? 'BAGUS' : 'RUSAK'}</span>
                    </td>
                    <td class="py-3 px-2 text-center text-xs font-black">${item.qtyReturned} ${invItem?.unit || 'UNIT'}</td>
                    <td class="py-3 px-2 text-right text-xs font-medium text-slate-500">${srFmt(item.unitPrice)}</td>
                    <td class="py-3 px-2 text-right text-xs font-black text-slate-900">${srFmt(subtotal)}</td>
                </tr>
            `;
        }).join('');

        const printableHTML = `
            <div class="max-w-4xl mx-auto bg-white p-4">
                <div id="print-internal-header" class="flex justify-between items-start mb-8 pb-6 border-b-2 border-slate-100">
                    <div>
                        <div class="bg-blue-600 text-white px-3 py-1 rounded text-[10px] font-black uppercase tracking-widest mb-2 inline-block shadow-sm">Nota Retur Penjualan</div>
                        <h2 class="text-3xl font-black text-slate-800 tracking-tight">${first.returnNumber}</h2>
                        <p class="text-sm text-slate-400 mt-1">Referensi SO: <span class="text-blue-600 font-bold">${first.soNumber || '-'}</span></p>
                    </div>
                    <div class="text-right">
                        <h1 class="text-xl font-black text-slate-900 leading-none">${CONFIG.companyName}</h1>
                        <p class="text-[9px] text-slate-500 max-w-[250px] leading-relaxed mt-2 uppercase font-black tracking-tight">${CONFIG.companyAddress}</p>
                    </div>
                </div>

                <div class="grid grid-cols-2 gap-12 mb-8">
                    <div class="bg-slate-50 p-5 rounded-2xl border border-slate-100 shadow-inner">
                        <h3 class="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-2"><i class="fas fa-user-tie text-blue-500"></i> CUSTOMER / TUJUAN</h3>
                        <p class="text-base font-black text-slate-800 leading-tight mb-1">${customer ? customer.name : '-'}</p>
                        <p class="text-[10px] text-slate-500 leading-relaxed font-bold uppercase tracking-tighter mb-2">${customer?.phone || ''}</p>
                        <div class="h-px bg-slate-200 w-8 mb-2"></div>
                        <p class="text-xs text-slate-500 leading-relaxed italic font-medium">${customer?.address || '-'}</p>
                    </div>
                    <div class="text-right flex flex-col justify-between py-1">
                        <div>
                            <p class="text-[9px] text-slate-400 font-black uppercase tracking-widest">Tanggal Dokumen</p>
                            <p class="text-sm font-black text-slate-800">${srDate(first.date)}</p>
                        </div>
                        <div class="mt-4">
                            <p class="text-[9px] text-slate-400 font-black uppercase tracking-widest mb-1">Status Dokumen</p>
                            <span class="inline-block px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-[10px] font-black uppercase tracking-widest">${first.status}</span>
                        </div>
                    </div>
                </div>

                <div class="overflow-hidden rounded-2xl border border-slate-100 mb-8 shadow-sm">
                    <table class="w-full text-left border-collapse">
                        <thead>
                            <tr class="bg-slate-800 text-white text-[10px] uppercase font-black tracking-widest">
                                <th class="py-3 px-3 text-center w-12">No</th>
                                <th class="py-3 px-3">Deskripsi Produk</th>
                                <th class="py-3 px-3 text-center">Kondisi</th>
                                <th class="py-3 px-3 text-center">Qty</th>
                                <th class="py-3 px-3 text-right">Harga</th>
                                <th class="py-3 px-3 text-right">Total</th>
                            </tr>
                        </thead>
                        <tbody class="divide-y divide-slate-100">
                            ${itemRows}
                        </tbody>
                        <tfoot class="bg-slate-50/80">
                            <tr>
                                <td colspan="5" class="py-4 px-4 text-right text-[10px] font-black uppercase tracking-widest text-slate-400 italic">Total Refund:</td>
                                <td class="py-4 px-4 text-right font-black text-xl text-blue-700 tracking-tighter">${srFmt(grandTotal)}</td>
                            </tr>
                        </tfoot>
                    </table>
                </div>

                <div class="grid grid-cols-2 gap-8 mb-12">
                    <div class="space-y-3">
                        <div class="p-4 bg-slate-50 rounded-xl border border-slate-100">
                            <h4 class="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Alasan Retur:</h4>
                            <p class="text-[11px] text-slate-600 leading-relaxed font-medium italic">${first.reason || '-'}</p>
                        </div>
                        ${first.notes ? `
                        <div class="p-4 bg-slate-50 rounded-xl border border-slate-100">
                            <h4 class="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Catatan:</h4>
                            <p class="text-[11px] text-slate-600 leading-relaxed font-medium">${first.notes}</p>
                        </div>` : ''}
                    </div>
                    <div class="flex flex-col justify-end bg-slate-900 rounded-2xl p-6 text-white text-right shadow-xl">
                        <p class="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1">Refund Method:</p>
                        <p class="text-lg font-black text-blue-400 uppercase tracking-widest mb-4">${first.refundMethod || 'Cash / Credit'}</p>
                        <p class="text-[9px] text-slate-500 italic">Pastikan data di atas sudah sesuai sebelum melakukan pencairan dana atau pemotongan tagihan.</p>
                    </div>
                </div>

                <div class="grid grid-cols-3 gap-8 mt-20 text-center">
                    <div>
                        <p class="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-16">Dibuat Oleh,</p>
                        <div class="border-t border-slate-200 pt-3 mx-4">
                            <p class="text-[10px] font-black text-slate-800 uppercase tracking-widest">( ............................ )</p>
                            <p class="text-[9px] text-slate-400 font-bold mt-1 uppercase tracking-tighter">Sales Department</p>
                        </div>
                    </div>
                    <div>
                        <p class="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-16">Disetujui Oleh,</p>
                        <div class="border-t border-slate-200 pt-3 mx-4">
                            <p class="text-[10px] font-black text-slate-800 uppercase tracking-widest">( ............................ )</p>
                            <p class="text-[9px] text-slate-400 font-bold mt-1 uppercase tracking-tighter">Finance / Manager</p>
                        </div>
                    </div>
                    <div>
                        <p class="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-16">Diterima Gudang,</p>
                        <div class="border-t border-slate-200 pt-3 mx-4">
                            <p class="text-[10px] font-black text-slate-800 uppercase tracking-widest">( ............................ )</p>
                            <p class="text-[9px] text-slate-400 font-bold mt-1 uppercase tracking-tighter">Inventory Team</p>
                        </div>
                    </div>
                </div>

                <div class="mt-20 text-center border-t border-slate-50 pt-6">
                    <p class="text-[9px] text-slate-300 font-black uppercase tracking-[0.5em]">Dokumen Resmi UnityERP Nusantara &bull; ${new Date().toLocaleString('id-ID')}</p>
                </div>
            </div>
        `;

        window.printHTML(printableHTML, `Nota Retur ${first.returnNumber}`, true);
    }
};

window.printSalesReturn = function (id) {
    const sr = db.findById('salesReturns', id);
    if (!sr) return;

    // Group all items with same return number for the single printout
    const all = db.read('salesReturns') || [];
    const items = all.filter(r => r.returnNumber === sr.returnNumber);

    showToast(`Menyiapkan Nota Retur ${sr.returnNumber}...`);
    if (window.openPrintWindow) {
        window.openPrintWindow('sales-return', sr.id, items);
    } else {
        console.error('Print logic error: openPrintWindow missing');
    }
};

window.printProductExchange = function (id) {
    const ex = db.findById('productExchanges', id);
    if (!ex) return;
    showToast(`Mencetak Nota Tukar Guling ${ex.exchangeNumber}...`);
    // Basic exchange printout (placeholder style)
    const printableHTML = `
        <div class="p-10 text-center">
            <h1 class="text-2xl font-bold mb-4">NOTA TUKAR GULING</h1>
            <p class="text-xl mb-2">${ex.exchangeNumber}</p>
            <p class="text-slate-500">Detail Tukar Guling akan diimplementasikan segera.</p>
        </div>
    `;
    window.printHTML(printableHTML, `Exchange ${ex.exchangeNumber}`);
};



