// inventory.js - Inventory Module for Unity ERP

// ─── HELPERS ──────────────────────────────────────────────────
const CATEGORY_LABELS = {
    RAW_MATERIAL: 'Raw Material',
    WIP: 'WIP',
    MIXING_STOCK: 'Stock Mixing',
    OVEN_BASAH_STOCK: 'Oven Basah',
    FINISHED_GOODS: 'Finishgoods'
};
const CATEGORY_COLORS = {
    RAW_MATERIAL: 'bg-yellow-100 text-yellow-800',
    WIP: 'bg-blue-100 text-blue-800',
    MIXING_STOCK: 'bg-blue-50 text-blue-700',
    OVEN_BASAH_STOCK: 'bg-orange-100 text-orange-800',
    FINISHED_GOODS: 'bg-green-100 text-green-800'
};
const REF_LABELS = { PO: 'Purchase Receipt', SO: 'Sales Delivery', PRODUCTION_IN: 'Hasil Produksi', PRODUCTION_OUT: 'Konsumsi Produksi', SHRINKAGE: 'Penyusutan/NG', MANUAL: 'Manual' };

function invFmt(n) { return new Intl.NumberFormat('id-ID', { maximumFractionDigits: 2 }).format(n || 0); }
function invDate(d) { return d ? new Date(d).toLocaleDateString('id-ID') : '-'; }

// ─── 0. DASHBOARD LOGISTIK ───────────────────────────────────
window.renderInventoryDashboard = () => {
    document.getElementById('pageTitle').innerText = 'Dashboard Logistik';
    const mc = document.getElementById('main-content');
    const today = new Date().toISOString().split('T')[0];

    // Data PO (Penerimaan)
    const pos = db.read('purchaseOrders') || [];
    const pendingReceipts = pos.filter(p => ['APPROVED', 'PARTIALLY RECEIVED'].includes(p.status));
    const overdueReceipts = pendingReceipts.filter(p => p.etd && p.etd < today);

    // Data SO (Surat Jalan/Pengiriman)
    const sos = db.read('salesOrders') || [];
    const pendingDeliveries = sos.filter(s => s.status === 'CONFIRMED');
    const overdueDeliveries = pendingDeliveries.filter(s => {
        const diff = (new Date() - new Date(s.date)) / (1000 * 60 * 60 * 24);
        return diff > 2;
    });

    // Data SJ (Delivery Orders)
    const dos = db.read('deliveryOrders') || [];
    const draftSJs = dos.filter(d => ['DRAFT', 'PENDING', 'HOLD'].includes(d.status));
    const overdueSJs = draftSJs.filter(d => {
        const diff = (new Date() - new Date(d.date)) / (1000 * 60 * 60 * 24);
        return diff > 1;
    });

    // Data MO (Produksi)
    const mos = db.read('productionOrders') || [];
    const runningMOs = mos.filter(m => m.status === 'IN_PROGRESS');
    const draftMOs = mos.filter(m => m.status === 'DRAFT');
    const overdueMOs = runningMOs.filter(m => {
        const diffHours = (new Date() - new Date(m.createdAt)) / (1000 * 60 * 60);
        return diffHours > 24; 
    });

    const lowStockItems = db.read('inventoryItems').filter(it => db.getInventoryStock(it.id) < it.minStock);
    const lowStockCount = lowStockItems.length;

    const card = (title, count, overdue, actionLabel, viewId, icon, color) => `
        <div class="bg-white rounded-xl shadow-sm border border-gray-100 p-6 flex flex-col justify-between hover:shadow-md transition-shadow">
            <div class="flex justify-between items-start mb-4">
                <div>
                    <h3 class="text-lg font-bold text-gray-800">${title}</h3>
                    <div class="mt-1 flex items-center gap-3">
                        <span class="text-sm text-gray-500">${count} Operasi</span>
                        ${overdue > 0 ? `<span class="text-[10px] font-bold text-red-600 bg-red-50 border border-red-100 px-2 py-0.5 rounded-full uppercase tracking-tighter">${overdue} Terlambat</span>` : ''}
                    </div>
                </div>
                <div class="w-12 h-12 rounded-lg ${color} flex items-center justify-center text-xl shadow-sm">
                    <i class="${icon}"></i>
                </div>
            </div>
            <div class="flex gap-2">
                <button onclick="navigateTo('${viewId}')" class="flex-1 bg-gray-50 hover:bg-gray-100 border border-gray-200 text-gray-700 font-bold py-2 px-4 rounded-lg text-sm transition-colors text-center">
                    ${actionLabel}
                </button>
            </div>
        </div>`;

    mc.innerHTML = `
        <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
            ${card('Penerimaan', pendingReceipts.length, overdueReceipts.length, 'Untuk Diterima', 'inventory-po-receipt', 'fas fa-download', 'bg-blue-50 text-blue-600')}
            ${card('Surat Jalan', draftSJs.length, overdueSJs.length, 'Manajemen SJ', 'inventory-delivery', 'fas fa-truck-loading', 'bg-teal-50 text-teal-600')}
            ${card('Produksi', runningMOs.length + draftMOs.length, overdueMOs.length, 'Produksi', 'production-mo', 'fas fa-industry', 'bg-purple-50 text-purple-600')}

        </div>
        
        <div class="mt-8 grid grid-cols-1 lg:grid-cols-2 gap-6">
             <div class="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                <h3 class="text-md font-bold text-gray-800 mb-4 flex items-center gap-2">
                    <i class="fas fa-exclamation-circle text-red-500"></i> Isu Perlu Perhatian
                </h3>
                <div class="space-y-3">
                    ${overdueReceipts.length ? `
                        <div class="flex items-center justify-between p-3 bg-red-50 rounded-lg border border-red-100">
                           <div class="flex items-center gap-3">
                               <div class="p-2 bg-red-100 text-red-600 rounded-lg"><i class="fas fa-history"></i></div>
                               <div>
                                   <p class="text-sm font-bold text-red-800">${overdueReceipts.length} Penerimaan Terlambat</p>
                                   <p class="text-xs text-red-600">PO melewati tanggal ETD</p>
                               </div>
                           </div>
                           <button onclick="navigateTo('inventory-po-receipt')" class="text-xs font-bold text-red-700 hover:underline">Lihat</button>
                        </div>
                    ` : ''}
                    ${overdueDeliveries.length ? `
                        <div class="flex items-center justify-between p-3 bg-orange-50 rounded-lg border border-orange-100">
                           <div class="flex items-center gap-3">
                               <div class="p-2 bg-orange-100 text-orange-600 rounded-lg"><i class="fas fa-truck"></i></div>
                               <div>
                                   <p class="text-sm font-bold text-orange-800">${overdueDeliveries.length} Pengiriman Belum Ber-SJ</p>
                                   <p class="text-xs text-orange-600">SO terkonfirmasi > 2 hari belum dibuat SJ</p>
                               </div>
                           </div>
                           <button onclick="navigateTo('sales-delivery-orders')" class="text-xs font-bold text-orange-700 hover:underline">Lihat</button>
                        </div>
                    ` : ''}
                    ${overdueSJs.length ? `
                        <div class="flex items-center justify-between p-3 bg-teal-50 rounded-lg border border-teal-100">
                           <div class="flex items-center gap-3">
                               <div class="p-2 bg-teal-100 text-teal-600 rounded-lg"><i class="fas fa-file-invoice"></i></div>
                               <div>
                                   <p class="text-sm font-bold text-teal-800">${overdueSJs.length} SJ Belum Diproses</p>
                                   <p class="text-xs text-teal-600">Surat Jalan > 24 jam belum dikirim/approve</p>
                               </div>
                           </div>
                           <button onclick="navigateTo('inventory-delivery')" class="text-xs font-bold text-teal-700 hover:underline">Lihat</button>
                        </div>
                    ` : ''}
                    ${overdueMOs.length ? `
                        <div class="flex items-center justify-between p-3 bg-purple-50 rounded-lg border border-purple-100">
                           <div class="flex items-center gap-3">
                               <div class="p-2 bg-purple-100 text-purple-600 rounded-lg"><i class="fas fa-industry"></i></div>
                               <div>
                                   <p class="text-sm font-bold text-purple-800">${overdueMOs.length} Produksi Belum Selesai</p>
                                   <p class="text-xs text-purple-600">Proses produksi > 24 jam belum selesai</p>
                               </div>
                           </div>
                           <button onclick="navigateTo('production-mo')" class="text-xs font-bold text-purple-700 hover:underline">Lihat</button>
                        </div>
                    ` : ''}
                    ${lowStockCount > 0 ? `
                        <div class="flex items-center justify-between p-3 bg-rose-50 rounded-lg border border-rose-100">
                           <div class="flex items-center gap-3">
                               <div class="p-2 bg-rose-100 text-rose-600 rounded-lg"><i class="fas fa-boxes"></i></div>
                               <div>
                                   <p class="text-sm font-bold text-rose-800">${lowStockCount} Item Stok Rendah</p>
                                   <p class="text-xs text-rose-600">Segera lakukan pembelian atau produksi</p>
                               </div>
                           </div>
                           <button onclick="navigateTo('inventory-master')" class="text-xs font-bold text-rose-700 hover:underline">Lihat</button>
                        </div>
                    ` : ''}
                    ${!overdueReceipts.length && !overdueDeliveries.length && !overdueSJs.length && !overdueMOs.length && lowStockCount === 0 ? `<p class="text-center py-6 text-gray-400 text-sm italic">🎉 Semua berjalan sesuai jadwal!</p>` : ''}
                </div>
             </div>

             <div class="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                <h3 class="text-md font-bold text-gray-800 mb-4 flex items-center gap-2">
                    <i class="fas fa-chart-line text-blue-500"></i> Ringkasan Stok
                </h3>
                <div class="flex items-center justify-between pb-4 border-b">
                    <span class="text-sm text-gray-600">Item Low Stock</span>
                    <span class="px-2 py-1 bg-red-50 text-red-700 rounded-lg font-black text-sm border border-red-100">${db.read('inventoryItems').filter(it => db.getInventoryStock(it.id) < it.minStock).length}</span>
                </div>
                <div class="flex items-center justify-between py-4 border-b">
                    <span class="text-sm text-gray-600">Total Finished Goods</span>
                    <span class="px-2 py-1 bg-green-50 text-green-700 rounded-lg font-black text-sm border border-green-100">${db.read('inventoryItems').filter(it => it.category === 'FINISHED_GOODS').length}</span>
                </div>
                <div class="flex items-center justify-between pt-4">
                    <span class="text-sm text-gray-600">Pergerakan Hari Ini</span>
                    <span class="px-2 py-1 bg-blue-50 text-blue-700 rounded-lg font-black text-sm border border-blue-100">${(db.read('stockCard') || []).filter(s => s.date && s.date.startsWith(today)).length}</span>
                </div>
             </div>
        </div>
    `;
};

// ─── 1. MASTER ITEM ───────────────────────────────────────────
function renderInventoryMaster() {
    const canEdit = getModulePermission('logistik').edit;
    document.getElementById('pageTitle').innerText = 'Master Item';
    const mc = document.getElementById('main-content');
    
    // Persist filters
    window._inventoryFilters = window._inventoryFilters || { category: '', name: '' };
    const f = window._inventoryFilters;

    let items = db.read('inventoryItems') || [];
    
    // Apply Filters
    if (f.category) {
        items = items.filter(it => it.category === f.category);
    }
    if (f.name) {
        const q = f.name.toLowerCase();
        items = items.filter(it => it.itemName.toLowerCase().includes(q) || it.itemCode.toLowerCase().includes(q));
    }

    // Current month range for detailed mutation
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
    const allTxs = db.read('stockTransactions') || [];

    // Calculate low stock count for current filtered items
    const lowStockCount = items.filter(it => db.getInventoryStock(it.id) < it.minStock).length;

    const rows = items.length ? items.map(it => {
        const stock = db.getInventoryStock(it.id);
        const isLow = stock < it.minStock;
        const isActive = it.status !== 'INACTIVE';

        return `<tr class="border-b border-gray-100 hover:bg-gray-50 ${isLow ? 'bg-red-50/40' : ''}">
            <td class="py-3 px-4 text-sm font-mono font-medium text-gray-700">${it.itemCode}</td>
            <td class="py-3 px-4 text-sm font-medium text-gray-800">${it.itemName}${isLow ? ' <span class="ml-1 px-1.5 py-0.5 bg-red-100 text-red-700 rounded text-[10px] font-bold">LOW</span>' : ''}</td>
            <td class="py-3 px-4 text-sm"><span class="px-2 py-0.5 rounded text-xs font-semibold ${CATEGORY_COLORS[it.category] || 'bg-gray-100 text-gray-700'}">${CATEGORY_LABELS[it.category] || it.category}</span></td>
            <td class="py-3 px-4 text-xs font-bold text-gray-400 uppercase tracking-widest">${it.unit}</td>
            <td class="py-3 px-4 text-sm text-right font-black ${isLow ? 'text-red-700' : 'text-blue-800'}">${invFmt(stock)}</td>
            <td class="py-3 px-4 text-sm text-right text-gray-400 font-medium">${invFmt(it.minStock)}</td>
            <td class="py-3 px-4 text-sm"><span class="px-2 py-0.5 rounded text-xs font-semibold ${isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}">${isActive ? 'Active' : 'Non-Active'}</span></td>
            <td class="py-3 px-4 text-sm text-right whitespace-nowrap">
                ${canEdit ? `
                ${isCurrentUserAdmin() ? `
                    <button onclick="openStockAdjustmentModal('${it.id}')" class="text-orange-500 hover:text-orange-700 mr-2" title="Penyesuaian Stok"><i class="fas fa-sync-alt"></i></button>
                    <button onclick="deleteInventoryItem('${it.id}')" class="text-red-500 hover:text-red-700 mr-2" title="Hapus Permanen"><i class="fas fa-trash-alt"></i></button>
                ` : ''}
                <button onclick="openInventoryItemModal('${it.id}')" class="text-blue-500 hover:text-blue-700 mr-2" title="Edit"><i class="fas fa-edit"></i></button>
                <button onclick="toggleInventoryItemStatus('${it.id}')" class="text-gray-400 hover:text-gray-600" title="${isActive ? 'Non-Aktifkan' : 'Aktifkan'}"><i class="fas fa-${isActive ? 'toggle-on text-green-500' : 'toggle-off'}"></i></button>
                ` : '<span class="text-gray-400 text-[10px] italic font-medium uppercase tracking-tight">View Only</span>'}
            </td>
        </tr>`;
    }).join('') : `<tr><td colspan="8" class="py-8 text-center text-gray-400">Belum ada item yang sesuai filter.</td></tr>`;

    const catOpts = Object.entries(CATEGORY_LABELS).map(([v, l]) => `<option value="${v}" ${f.category === v ? 'selected' : ''}>${l}</option>`).join('');

    mc.innerHTML = `
    <div class="space-y-4">
        ${lowStockCount ? `<div class="flex items-center gap-3 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700"><i class="fas fa-exclamation-triangle"></i><span><strong>${lowStockCount} item</strong> di bawah minimum stok (Total Aktif)!</span></div>` : ''}
        
        <!-- Standard Filter Bar -->
        <div class="bg-white p-5 rounded-lg shadow-sm border border-gray-100 mb-5">
            <h3 class="text-sm font-black text-slate-800 uppercase tracking-widest mb-4 flex items-center gap-3"><i class="fas fa-filter text-blue-500"></i> FILTER PENCARIAN</h3>
            <div class="flex flex-wrap gap-4 items-end">
            <div class="flex-1 min-w-[240px]">
                <label class="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5 ml-1">Pencarian Barang</label>
                <div class="relative">
                    <i class="fas fa-search absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"></i>
                    <input type="text" id="filter_item_name" value="${f.name}" placeholder="Cari Nama atau Kode Item..." 
                        class="w-full border border-gray-200 rounded-lg pl-10 pr-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all">
                </div>
            </div>
            <div class="w-56">
                <label class="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5 ml-1">Kategori</label>
                <select id="filter_item_category" class="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none bg-white transition-all">
                    <option value="">-- Semua Kategori --</option>
                    ${catOpts}
                </select>
            </div>
            <div class="flex gap-2">
                <button onclick="updateInventoryFilters()" class="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg text-sm font-bold flex items-center gap-2 shadow-sm transition-all">
                    <i class="fas fa-filter"></i> Tampilkan
                </button>
                <button onclick="resetInventoryFilters()" class="px-4 py-2 text-sm font-medium text-gray-500 hover:text-gray-700 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                    Reset
                </button>
            </div>
        </div>

        <div class="bg-white rounded-lg shadow-sm border border-gray-100">
            <div class="flex justify-between items-center p-4 sm:p-6 border-b border-gray-100">
                <h2 class="text-lg font-black text-gray-800 uppercase tracking-tight flex items-center gap-2">
                    <i class="fas fa-boxes text-blue-600"></i> Master Barang / Stok
                </h2>
                <div class="flex gap-2">
                    ${canEdit ? `
                    <button onclick="openInventoryItemModal()" class="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm font-medium">
                        <i class="fas fa-plus mr-2"></i>Tambah Item
                    </button>
                    ` : `
                    <span class="text-xs font-medium text-orange-500 bg-orange-50 border border-orange-100 px-3 py-1.5 rounded-lg flex items-center gap-2">
                        <i class="fas fa-info-circle"></i> Mode Lihat Saja
                    </span>
                    `}
                </div>
            </div>
            <div class="overflow-x-auto">
                <table class="w-full text-left border-collapse">
                    <thead><tr class="bg-gray-50 border-b border-gray-200">
                        <th class="py-3 px-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Kode</th>
                        <th class="py-3 px-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Nama Item</th>
                        <th class="py-3 px-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Kategori</th>
                        <th class="py-3 px-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Unit</th>
                        <th class="py-3 px-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Stok Saat Ini</th>
                        <th class="py-3 px-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right text-slate-300">Min. Stok</th>
                        <th class="py-3 px-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Status</th>
                        <th class="py-3 px-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Aksi</th>
                    </tr></thead>
                    <tbody>${rows}</tbody>
                </table>
            </div>
        </div>
    </div>`;
}

window.updateInventoryFilters = () => {
    window._inventoryFilters = {
        name: document.getElementById('filter_item_name')?.value || '',
        category: document.getElementById('filter_item_category')?.value || ''
    };
    renderInventoryMaster();
};

window.resetInventoryFilters = () => {
    window._inventoryFilters = { name: '', category: '' };
    renderInventoryMaster();
};

window.openInventoryItemModal = (id = null) => {
    const item = id ? db.findById('inventoryItems', id) : null;
    const units = ['KG', 'GR', 'L', 'PCS', 'BOX', 'SAK', 'KARTON', 'LITER'];
    const unitOpts = units.map(u => `<option ${item?.unit === u ? 'selected' : ''}>${u}</option>`).join('');
    const cats = [['RAW_MATERIAL', 'Raw Material'], ['WIP', 'WIP'], ['MIXING_STOCK', 'Stock Mixing'], ['OVEN_BASAH_STOCK', 'Oven Basah'], ['FINISHED_GOODS', 'Finished Goods']];
    const catOpts = cats.map(([v, l]) => `<option value="${v}" ${item?.category === v ? 'selected' : ''}>${l}</option>`).join('');
    const previewCode = item ? item.itemCode : '(auto-generate)';

    const body = `<div class="space-y-4">
        <div class="grid grid-cols-2 gap-4">
            <div><label class="block text-sm font-medium text-gray-700 mb-1">Kode Item</label>
                <input type="text" id="inv_code_preview" value="${previewCode}" class="w-full border border-gray-200 rounded px-3 py-2 bg-gray-50 text-gray-500 text-sm" readonly></div>
            <div><label class="block text-sm font-medium text-gray-700 mb-1">Nama Item <span class="text-red-500">*</span></label>
                <input type="text" id="inv_name" value="${item?.itemName || ''}" class="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500"></div>
            <div><label class="block text-sm font-medium text-gray-700 mb-1">Kategori <span class="text-red-500">*</span></label>
                <select id="inv_category" onchange="invUpdateCodePreview()" class="w-full border border-gray-300 rounded px-3 py-2 text-sm bg-white focus:ring-2 focus:ring-blue-500">
                    <option value="">-- Pilih --</option>${catOpts}
                </select></div>
            <div><label class="block text-sm font-medium text-gray-700 mb-1">Satuan <span class="text-red-500">*</span></label>
                <select id="inv_unit" class="w-full border border-gray-300 rounded px-3 py-2 text-sm bg-white focus:ring-2 focus:ring-blue-500">${unitOpts}</select></div>
            <div><label class="block text-sm font-medium text-gray-700 mb-1">Harga Beli / Cost per Unit</label>
                <input type="number" id="inv_price" value="${item?.purchasePrice ?? 0}" min="0" step="0.01" class="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500"></div>
            <div><label class="block text-sm font-medium text-gray-700 mb-1">Minimum Stok</label>
                <input type="number" id="inv_min_stock" value="${item?.minStock ?? 0}" min="0" class="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500"></div>
            <div><label class="block text-sm font-medium text-gray-700 mb-1">Status</label>
                <select id="inv_status" class="w-full border border-gray-300 rounded px-3 py-2 text-sm bg-white focus:ring-2 focus:ring-blue-500">
                    <option value="ACTIVE" ${(!item || item.status !== 'INACTIVE') ? 'selected' : ''}>Active</option>
                    <option value="INACTIVE" ${item?.status === 'INACTIVE' ? 'selected' : ''}>Non-Active</option>
                </select></div>
            ${(!id && isCurrentUserAdmin()) ? `
            <div>
                <label class="block text-sm font-medium text-gray-700 mb-1 font-bold text-blue-600">Awal Stok (Starting Stock)</label>
                <input type="number" id="inv_initial_stock" value="0" min="0" class="w-full border border-blue-300 rounded px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 bg-blue-50">
            </div>` : ''}
        </div>
    </div>`;

    const footer = `
        <button onclick="saveInventoryItem('${id || ''}')" class="w-full sm:w-auto inline-flex justify-center rounded-md bg-blue-600 px-4 py-2 text-white text-sm font-medium hover:bg-blue-700 sm:ml-3">Simpan</button>
        <button onclick="closeModal()" class="mt-3 sm:mt-0 w-full sm:w-auto inline-flex justify-center rounded-md border border-gray-300 px-4 py-2 bg-white text-gray-700 text-sm font-medium sm:ml-3">Batal</button>`;
    showModal(id ? 'Edit Item' : 'Tambah Item Baru', body, footer);
};

window.invUpdateCodePreview = () => {
    const cat = document.getElementById('inv_category')?.value;
    if (!cat) return;
    const preview = document.getElementById('inv_code_preview');
    if (preview && preview.value === '(auto-generate)') {
        preview.value = db.generateItemCode(cat) + ' (preview)';
    }
};

window.saveInventoryItem = (id) => {
    const name = document.getElementById('inv_name').value.trim();
    const category = document.getElementById('inv_category').value;
    const unit = document.getElementById('inv_unit').value;
    const minStock = parseFloat(document.getElementById('inv_min_stock').value) || 0;
    const status = document.getElementById('inv_status').value;
    const purchasePrice = parseFloat(document.getElementById('inv_price').value) || 0;
    if (!name || !category || !unit) { showToast('Nama, Kategori, dan Satuan wajib diisi', 'error'); return; }

    if (id) {
        db.update('inventoryItems', id, { itemName: name, category, unit, minStock, purchasePrice, status });
        showToast('Item berhasil diperbarui');
    } else {
        const itemCode = db.generateItemCode(category);
        const newItem = db.insert('inventoryItems', { itemCode, itemName: name, category, unit, minStock, purchasePrice, status: 'ACTIVE' });
        
        // Handle Initial Stock
        const initialStock = parseFloat(document.getElementById('inv_initial_stock')?.value) || 0;
        if (initialStock > 0) {
            db.addInventoryTransaction(newItem.id, 'IN', initialStock, 'MANUAL', null, 'Initial stock on item creation');
        }
        
        showToast('Item baru berhasil ditambahkan');
    }
    closeModal();
    renderInventoryMaster();
};

window.toggleInventoryItemStatus = (id) => {
    const item = db.findById('inventoryItems', id);
    if (!item) return;
    const newStatus = item.status === 'INACTIVE' ? 'ACTIVE' : 'INACTIVE';
    db.update('inventoryItems', id, { status: newStatus });
    showToast(`Item di-${newStatus === 'ACTIVE' ? 'aktifkan' : 'non-aktifkan'}`);
    renderInventoryMaster();
};

window.deleteInventoryItem = (id) => {
    const item = db.findById('inventoryItems', id);
    if (!item) return;

    if (!confirm(`⚠ HAPUS PERMANEN: ${item.itemName} (${item.itemCode})?\n\nSemua transaksi (Masuk/Keluar), history di Stock Card, item di SO/PO/RFQ, serta BOM yang menggunakan item ini di SELURUH departemen akan ikut TERHAPUS.\n\nLanjutkan?`)) return;

    // 1. Array of all collections that might contain this item
    const collections = [
        'stockTransactions', 'stockCard', 'purchaseRFQs', 'purchaseOrders', 
        'salesQuotations', 'salesOrders', 'productionOrders', 'inventoryBOM',
        'salesInvoices', 'purchaseInvoices', 'deliveryOrders', 'salesReturns',
        'productExchanges', 'inventoryShrinkage'
    ];

    // 2. Deep clean across all collections
    collections.forEach(col => {
        let data = db.read(col) || [];
        let modified = false;

        if (col === 'stockTransactions' || col === 'stockCard') {
            const initialLen = data.length;
            data = data.filter(t => t.itemId !== id);
            if (data.length !== initialLen) modified = true;
        } 
        else if (col === 'productExchanges') {
            const initialLen = data.length;
            data = data.filter(t => t.fromItemId !== id && t.toItemId !== id);
            if (data.length !== initialLen) modified = true;
        }
        else if (col === 'inventoryBOM') {
            const initialLen = data.length;
            // Remove the BOM if it's for this product
            data = data.filter(b => b.parentId !== id);
            // Also remove this product from components of other BOMs
            data = data.map(b => {
                if (b.components) {
                    const cLen = b.components.length;
                    b.components = b.components.filter(c => c.itemId !== id);
                    if (b.components.length !== cLen) modified = true;
                }
                return b;
            });
            if (data.length !== initialLen) modified = true;
        }
        else {
            // General structure: docs with "items" array
            data = data.map(doc => {
                if (doc.items) {
                    const initialItemsLen = doc.items.length;
                    doc.items = doc.items.filter(it => it.inventoryItemId !== id);
                    if (doc.items.length !== initialItemsLen) {
                        modified = true;
                        // Recalculate totals if necessary (simplified)
                        if (doc.totalAmount !== undefined) {
                            const newDPP = doc.items.reduce((s, i) => s + (parseFloat(i.subtotal) || 0), 0);
                            const taxRate = parseFloat(doc.taxRate) || 0;
                            doc.dppAmount = newDPP;
                            doc.taxAmount = Math.round(newDPP * taxRate / 100);
                            doc.totalAmount = newDPP + doc.taxAmount;
                        }
                    }
                }
                return doc;
            });
            
            // Optional: Remove parent documents if they now have 0 items (e.g. PO with no items is invalid)
            const preFilterLen = data.length;
            data = data.filter(doc => doc.items ? doc.items.length > 0 : true);
            if (data.length !== preFilterLen) modified = true;
        }

        if (modified) {
            localStorage.setItem(`db_${col}`, JSON.stringify(data));
        }
    });

    // 3. Finally delete the item itself
    db.delete('inventoryItems', id);

    showToast(`Barang ${item.itemName} dan seluruh data terkait telah dihapus dari sistem.`, 'success');
    renderInventoryMaster();
};

// ─── STOCK ADJUSTMENT ──────────────────────────────────────────
window.openStockAdjustmentModal = (itemId) => {
    if (!isCurrentUserAdmin()) { showToast('Akses ditolak: Hanya Admin yang bisa melakukan penyesuaian stok.', 'error'); return; }
    const item = db.findById('inventoryItems', itemId);
    if (!item) return;
    const currentStock = db.getInventoryStock(itemId);

    const body = `
        <div class="space-y-4">
            <div class="bg-orange-50 border border-orange-200 rounded-lg p-3 text-xs text-orange-700 flex items-start gap-2">
                <i class="fas fa-exclamation-triangle mt-0.5"></i>
                <div>
                    <strong>Penyesuaian Stok (Stock Adjustment)</strong><br>
                    Gunakan fitur ini untuk menyesuaikan stok sistem dengan stok fisik di gudang. 
                    Sistem akan otomatis membuat transaksi masuk/keluar untuk mencocokkan jumlahnya.
                </div>
            </div>
            <div class="grid grid-cols-2 gap-4">
                <div>
                    <label class="block text-xs font-bold text-gray-500 uppercase mb-1">Kode Item</label>
                    <input type="text" value="${item.itemCode}" readonly class="w-full border border-gray-200 rounded px-3 py-2 text-sm bg-gray-50 text-gray-500">
                </div>
                <div>
                    <label class="block text-xs font-bold text-gray-500 uppercase mb-1">Nama Item</label>
                    <input type="text" value="${item.itemName}" readonly class="w-full border border-gray-200 rounded px-3 py-2 text-sm bg-gray-50 text-gray-500">
                </div>
            </div>
            <div class="grid grid-cols-2 gap-6 p-4 bg-gray-50 rounded-xl border border-gray-100">
                <div>
                    <label class="block text-xs font-bold text-gray-500 uppercase mb-1 text-center">Stok di Sistem</label>
                    <div class="text-2xl font-black text-center text-gray-400">${invFmt(currentStock)} <span class="text-xs font-normal">${item.unit}</span></div>
                </div>
                <div class="flex items-center justify-center text-gray-300">
                    <i class="fas fa-arrow-right fa-2x"></i>
                </div>
                <div class="col-span-2">
                    <label class="block text-sm font-bold text-blue-800 text-center mb-2">STOK FISIK AKTUAL (HASIL OPNAME)</label>
                    <div class="flex items-center justify-center gap-3">
                        <input type="number" id="adj_physical_stock" value="${currentStock}" min="0" step="0.01" 
                            class="w-48 text-center text-3xl font-black border-2 border-blue-500 rounded-xl px-4 py-3 text-blue-600 focus:ring-4 focus:ring-blue-100">
                        <span class="text-lg font-bold text-gray-500">${item.unit}</span>
                    </div>
                </div>
            </div>
            <div>
                <label class="block text-xs font-bold text-gray-500 uppercase mb-1">Alasan Penyesuaian</label>
                <textarea id="adj_notes" rows="2" class="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500" placeholder="cth: Hasil stok opname bulanan, barang rusak, dll"></textarea>
            </div>
        </div>
    `;

    const footer = `
        <button onclick="saveStockAdjustment('${itemId}')" class="bg-blue-600 text-white px-6 py-2 rounded-lg text-sm font-bold hover:bg-blue-700 shadow-md">Simpan Penyesuaian</button>
        <button onclick="closeModal()" class="px-6 py-2 text-sm font-bold text-gray-500 hover:bg-gray-100 rounded-lg">Batal</button>
    `;
    showModal('Penyesuaian Stok', body, footer, 'max-w-md');
};

window.saveStockAdjustment = (itemId) => {
    const physicalStock = parseFloat(document.getElementById('adj_physical_stock').value);
    const notes = document.getElementById('adj_notes').value.trim();
    if (isNaN(physicalStock) || physicalStock < 0) { showToast('Jumlah stok tidak valid', 'error'); return; }

    const currentStock = db.getInventoryStock(itemId);
    const diff = physicalStock - currentStock;

    if (diff === 0) {
        showToast('Tidak ada perbedaan stok, tidak perlu penyesuaian.');
        closeModal();
        return;
    }

    const type = diff > 0 ? 'IN' : 'OUT';
    const absDiff = Math.abs(diff);
    
    db.addInventoryTransaction(itemId, type, absDiff, 'MANUAL', null, notes || 'Stock Adjustment (Manual Update)');
    
    showToast(`Stok berhasil disesuaikan (${diff > 0 ? '+' : '-'}${invFmt(absDiff)}). Sekarang: ${invFmt(physicalStock)}`);
    closeModal();
    renderInventoryMaster();
};

// ─── SHARED: Item select options ──────────────────────────────
function getActiveItemOpts(filterCategory = null) {
    const items = db.read('inventoryItems').filter(i => i.status !== 'INACTIVE' && (!filterCategory || i.category === filterCategory));
    if (!items.length) return '<option value="">-- Belum ada item aktif --</option>';
    return `<option value="">-- Pilih Item --</option>` + items.map(i =>
        `<option value="${i.id}" data-unit="${i.unit}" data-code="${i.itemCode}">${i.itemCode} — ${i.itemName}</option>`
    ).join('');
}

// ─── 2. STOCK IN ──────────────────────────────────────────────
function renderInventoryStockIn() {
    const canEdit = getModulePermission('logistik').edit;
    document.getElementById('pageTitle').innerText = 'Stock In';
    const mc = document.getElementById('main-content');
    const now = new Date();
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
    const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0];

    mc.innerHTML = `
    <div class="bg-white rounded-xl shadow-sm border border-gray-100">
        <div class="flex justify-between items-center p-5 border-b border-gray-100">
            <div>
                <h2 class="text-lg font-semibold text-gray-800">Stock In</h2>
                <p class="text-xs text-gray-500 mt-0.5">Penerimaan barang dari PO, produksi, atau input manual</p>
            </div>
            <div class="flex gap-2">
                ${canEdit ? `
                <button onclick="openStockInModal()" class="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2">
                    <i class="fas fa-plus"></i>Tambah Stock In
                </button>
                ` : `
                <span class="text-xs font-medium text-orange-500 bg-orange-50 border border-orange-100 px-3 py-2 rounded-lg flex items-center gap-2">
                    <i class="fas fa-info-circle"></i> Mode Lihat Saja
                </span>
                `}
            </div>
        </div>
        <div class="p-4 border-b border-gray-100 flex flex-wrap gap-3 items-end">
            <div><label class="block text-xs font-medium text-gray-500 mb-1">Kategori</label>
                <select id="si_fcat" class="border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white">
                    <option value="">-- Semua Kategori --</option>
                    <option value="RAW_MATERIAL">Raw Material</option>
                    <option value="MIXING_STOCK">Stock Mixing</option>
                    <option value="OVEN_BASAH_STOCK">Oven Basah</option>
                    <option value="FINISHED_GOODS">Finished Goods</option>
                </select></div>
            <div><label class="block text-xs font-medium text-gray-500 mb-1">Dari</label>
                <input type="date" id="si_ffrom" value="${firstDay}" class="border border-gray-300 rounded-lg px-3 py-2 text-sm"></div>
            <div><label class="block text-xs font-medium text-gray-500 mb-1">Sampai</label>
                <input type="date" id="si_fto" value="${lastDay}" class="border border-gray-300 rounded-lg px-3 py-2 text-sm"></div>
            <button onclick="applyStockInFilter()" class="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2 rounded-lg text-sm font-semibold flex items-center gap-2">
                <i class="fas fa-search"></i> Tampilkan
            </button>
        </div>
        <div id="si_table_container" class="overflow-x-auto"></div>
    </div>`;
    applyStockInFilter();
}

window.applyStockInFilter = () => {
    const catFilter = document.getElementById('si_fcat')?.value || '';
    const fromStr = document.getElementById('si_ffrom')?.value;
    const toStr = document.getElementById('si_fto')?.value;
    const from = fromStr ? new Date(fromStr) : null; if (from) from.setHours(0, 0, 0, 0);
    const to = toStr ? new Date(toStr) : null; if (to) to.setHours(23, 59, 59, 999);
    const invItems = db.read('inventoryItems');
    const allTxs = db.read('stockTransactions').filter(t => t.type === 'IN').sort((a, b) => new Date(b.date) - new Date(a.date));
    const txs = allTxs.filter(t => {
        if (from && new Date(t.date) < from) return false;
        if (to && new Date(t.date) > to) return false;
        if (catFilter) {
            const item = invItems.find(i => i.id === t.itemId);
            if (!item || item.category !== catFilter) return false;
        }
        return true;
    });
    const rows = txs.length ? txs.map(t => {
        const item = invItems.find(i => i.id === t.itemId);
        const catLabel = CATEGORY_LABELS[item?.category] || '-';
        const catColor = CATEGORY_COLORS[item?.category] || 'bg-gray-100 text-gray-700';
        return `<tr class="border-b border-gray-100 hover:bg-gray-50">
            <td class="py-3 px-4 text-sm font-mono text-blue-600">${t.txNo}</td>
            <td class="py-3 px-4 text-sm text-gray-600">${invDate(t.date)}</td>
            <td class="py-3 px-4 text-sm"><span class="px-2 py-0.5 rounded text-xs font-semibold ${catColor}">${catLabel}</span></td>
            <td class="py-3 px-4 text-sm font-mono text-gray-500">${t.itemCode}</td>
            <td class="py-3 px-4 text-sm font-medium text-gray-800">${t.itemName}</td>
            <td class="py-3 px-4 text-sm text-right font-semibold text-green-700">+${invFmt(t.qty)}</td>
            <td class="py-3 px-4 text-sm"><span class="px-2 py-0.5 rounded text-xs bg-gray-100 text-gray-700">${REF_LABELS[t.reference] || t.reference}</span></td>
            <td class="py-3 px-4 text-sm text-gray-500 truncate max-w-xs">${t.notes || '-'}</td>
        </tr>`;
    }).join('') : `<tr><td colspan="8" class="py-8 text-center text-gray-400">Tidak ada data untuk filter ini</td></tr>`;
    document.getElementById('si_table_container').innerHTML = `
        <table class="w-full text-left border-collapse">
            <thead><tr class="bg-gray-50 border-b border-gray-200">
                <th class="py-3 px-4 text-xs font-semibold text-gray-600 uppercase">No. Tx</th>
                <th class="py-3 px-4 text-xs font-semibold text-gray-600 uppercase">Tanggal</th>
                <th class="py-3 px-4 text-xs font-semibold text-gray-600 uppercase">Kategori</th>
                <th class="py-3 px-4 text-xs font-semibold text-gray-600 uppercase">Kode</th>
                <th class="py-3 px-4 text-xs font-semibold text-gray-600 uppercase">Item</th>
                <th class="py-3 px-4 text-xs font-semibold text-gray-600 uppercase text-right">Qty Masuk</th>
                <th class="py-3 px-4 text-xs font-semibold text-gray-600 uppercase">Referensi</th>
                <th class="py-3 px-4 text-xs font-semibold text-gray-600 uppercase">Keterangan</th>
            </tr></thead>
            <tbody>${rows}</tbody>
        </table>`;
};


window.openStockInModal = () => {
    const todayStr = new Date().toISOString().split('T')[0];
    const body = `<div class="space-y-4">
        <div class="grid grid-cols-2 gap-4">
            <div><label class="block text-sm font-medium text-gray-700 mb-1">Tanggal</label>
                <input type="date" id="si_date" value="${todayStr}" class="w-full border border-gray-300 rounded px-3 py-2 text-sm"></div>
            <div><label class="block text-sm font-medium text-gray-700 mb-1">Referensi</label>
                <select id="si_ref" class="w-full border border-gray-300 rounded px-3 py-2 text-sm bg-white">
                    <option value="PO">Purchase Receipt</option>
                    <option value="PRODUCTION_IN">Hasil Produksi</option>
                    <option value="MANUAL">Manual</option>
                </select></div>
        </div>
        <div><label class="block text-sm font-medium text-gray-700 mb-1">Item <span class="text-red-500">*</span></label>
            <select id="si_item" onchange="invUpdateUnit('si_item','si_unit_display')" class="w-full border border-gray-300 rounded px-3 py-2 text-sm bg-white">${getActiveItemOpts()}</select></div>
        <div class="grid grid-cols-2 gap-4">
            <div><label class="block text-sm font-medium text-gray-700 mb-1">Qty <span class="text-red-500">*</span></label>
                <input type="number" id="si_qty" min="0.01" step="0.01" placeholder="0" class="w-full border border-gray-300 rounded px-3 py-2 text-sm"></div>
            <div><label class="block text-sm font-medium text-gray-700 mb-1">Satuan</label>
                <input type="text" id="si_unit_display" readonly class="w-full border border-gray-200 rounded px-3 py-2 text-sm bg-gray-50 text-gray-500"></div>
        </div>
        <div><label class="block text-sm font-medium text-gray-700 mb-1">No. Referensi / Keterangan</label>
            <input type="text" id="si_notes" placeholder="cth: PO-123456 atau keterangan lain" class="w-full border border-gray-300 rounded px-3 py-2 text-sm"></div>
    </div>`;

    const footer = `
        <button onclick="saveStockIn()" class="w-full sm:w-auto inline-flex justify-center rounded-md bg-green-600 px-4 py-2 text-white text-sm font-medium hover:bg-green-700 sm:ml-3">Simpan Stock In</button>
        <button onclick="closeModal()" class="mt-3 sm:mt-0 w-full sm:w-auto inline-flex justify-center rounded-md border border-gray-300 px-4 py-2 bg-white text-gray-700 text-sm font-medium sm:ml-3">Batal</button>`;
    showModal('Tambah Stock In', body, footer);
};

window.invUpdateUnit = (selectId, displayId) => {
    const sel = document.getElementById(selectId);
    const disp = document.getElementById(displayId);
    if (sel && disp) disp.value = sel.selectedOptions[0]?.dataset.unit || '';
};

window.saveStockIn = () => {
    const itemId = document.getElementById('si_item').value;
    const qty = parseFloat(document.getElementById('si_qty').value);
    const reference = document.getElementById('si_ref').value;
    const notes = document.getElementById('si_notes').value.trim();
    if (!itemId) { showToast('Pilih item terlebih dahulu', 'error'); return; }
    if (!qty || qty <= 0) { showToast('Qty harus lebih dari 0', 'error'); return; }
    db.addInventoryTransaction(itemId, 'IN', qty, reference, null, notes);
    showToast('Stock In berhasil disimpan', 'success');
    closeModal();
    renderInventoryStockIn();
};

// ─── 3. STOCK OUT ─────────────────────────────────────────────
function renderInventoryStockOut() {
    const canEdit = getModulePermission('logistik').edit;
    document.getElementById('pageTitle').innerText = 'Stock Out Manual';
    const mc = document.getElementById('main-content');
    const now = new Date();
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
    const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0];

    mc.innerHTML = `
    <div class="bg-white rounded-xl shadow-sm border border-gray-100">
        <div class="flex justify-between items-center p-5 border-b border-gray-100">
            <div>
                <h2 class="text-lg font-semibold text-gray-800">Stock Out Manual</h2>
                <p class="text-xs text-gray-500 mt-0.5">Pengeluaran barang dari delivery, produksi, atau input manual</p>
            </div>
            <div class="flex gap-2">
                ${canEdit ? `
                <button onclick="openStockOutModal()" class="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2">
                    <i class="fas fa-plus"></i>Tambah Stock Out
                </button>
                ` : `
                <span class="text-xs font-medium text-orange-500 bg-orange-50 border border-orange-100 px-3 py-2 rounded-lg flex items-center gap-2">
                    <i class="fas fa-info-circle"></i> Mode Lihat Saja
                </span>
                `}
            </div>
        </div>
        <div class="p-4 border-b border-gray-100 flex flex-wrap gap-3 items-end">
            <div><label class="block text-xs font-medium text-gray-500 mb-1">Kategori</label>
                <select id="sout_fcat" class="border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white">
                    <option value="">-- Semua Kategori --</option>
                    <option value="RAW_MATERIAL">Raw Material</option>
                    <option value="MIXING_STOCK">Stock Mixing</option>
                    <option value="OVEN_BASAH_STOCK">Oven Basah</option>
                    <option value="FINISHED_GOODS">Finished Goods</option>
                </select></div>
            <div><label class="block text-xs font-medium text-gray-500 mb-1">Dari</label>
                <input type="date" id="sout_ffrom" value="${firstDay}" class="border border-gray-300 rounded-lg px-3 py-2 text-sm"></div>
            <div><label class="block text-xs font-medium text-gray-500 mb-1">Sampai</label>
                <input type="date" id="sout_fto" value="${lastDay}" class="border border-gray-300 rounded-lg px-3 py-2 text-sm"></div>
            <button onclick="applyStockOutFilter()" class="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2 rounded-lg text-sm font-semibold flex items-center gap-2">
                <i class="fas fa-search"></i> Tampilkan
            </button>
        </div>
        <div id="sout_table_container" class="overflow-x-auto"></div>
    </div>`;
    applyStockOutFilter();
}

window.applyStockOutFilter = () => {
    const catFilter = document.getElementById('sout_fcat')?.value || '';
    const fromStr = document.getElementById('sout_ffrom')?.value;
    const toStr = document.getElementById('sout_fto')?.value;
    const from = fromStr ? new Date(fromStr) : null; if (from) from.setHours(0, 0, 0, 0);
    const to = toStr ? new Date(toStr) : null; if (to) to.setHours(23, 59, 59, 999);
    const invItems = db.read('inventoryItems');
    const allTxs = db.read('stockTransactions').filter(t => t.type === 'OUT').sort((a, b) => new Date(b.date) - new Date(a.date));
    const txs = allTxs.filter(t => {
        if (from && new Date(t.date) < from) return false;
        if (to && new Date(t.date) > to) return false;
        if (catFilter) {
            const item = invItems.find(i => i.id === t.itemId);
            if (!item || item.category !== catFilter) return false;
        }
        return true;
    });
    const rows = txs.length ? txs.map(t => {
        const item = invItems.find(i => i.id === t.itemId);
        const catLabel = CATEGORY_LABELS[item?.category] || '-';
        const catColor = CATEGORY_COLORS[item?.category] || 'bg-gray-100 text-gray-700';
        return `<tr class="border-b border-gray-100 hover:bg-gray-50">
            <td class="py-3 px-4 text-sm font-mono text-red-600">${t.txNo}</td>
            <td class="py-3 px-4 text-sm text-gray-600">${invDate(t.date)}</td>
            <td class="py-3 px-4 text-sm"><span class="px-2 py-0.5 rounded text-xs font-semibold ${catColor}">${catLabel}</span></td>
            <td class="py-3 px-4 text-sm font-mono text-gray-500">${t.itemCode}</td>
            <td class="py-3 px-4 text-sm font-medium text-gray-800">${t.itemName}</td>
            <td class="py-3 px-4 text-sm text-right font-semibold text-red-700">-${invFmt(t.qty)}</td>
            <td class="py-3 px-4 text-sm"><span class="px-2 py-0.5 rounded text-xs bg-gray-100 text-gray-700">${REF_LABELS[t.reference] || t.reference}</span></td>
            <td class="py-3 px-4 text-sm text-gray-500 truncate max-w-xs">${t.notes || '-'}</td>
        </tr>`;
    }).join('') : `<tr><td colspan="8" class="py-8 text-center text-gray-400">Tidak ada data untuk filter ini</td></tr>`;
    document.getElementById('sout_table_container').innerHTML = `
        <table class="w-full text-left border-collapse">
            <thead><tr class="bg-gray-50 border-b border-gray-200">
                <th class="py-3 px-4 text-xs font-semibold text-gray-600 uppercase">No. Tx</th>
                <th class="py-3 px-4 text-xs font-semibold text-gray-600 uppercase">Tanggal</th>
                <th class="py-3 px-4 text-xs font-semibold text-gray-600 uppercase">Kategori</th>
                <th class="py-3 px-4 text-xs font-semibold text-gray-600 uppercase">Kode</th>
                <th class="py-3 px-4 text-xs font-semibold text-gray-600 uppercase">Item</th>
                <th class="py-3 px-4 text-xs font-semibold text-gray-600 uppercase text-right">Qty Keluar</th>
                <th class="py-3 px-4 text-xs font-semibold text-gray-600 uppercase">Referensi</th>
                <th class="py-3 px-4 text-xs font-semibold text-gray-600 uppercase">Keterangan</th>
            </tr></thead>
            <tbody>${rows}</tbody>
        </table>`;
};


window.openStockOutModal = () => {
    const todayStr = new Date().toISOString().split('T')[0];
    const body = `<div class="space-y-4">
        <div class="grid grid-cols-2 gap-4">
            <div><label class="block text-sm font-medium text-gray-700 mb-1">Tanggal</label>
                <input type="date" id="so_date" value="${todayStr}" class="w-full border border-gray-300 rounded px-3 py-2 text-sm"></div>
            <div><label class="block text-sm font-medium text-gray-700 mb-1">Referensi</label>
                <select id="so_ref" class="w-full border border-gray-300 rounded px-3 py-2 text-sm bg-white">
                    <option value="SO">Sales Delivery</option>
                    <option value="PRODUCTION_OUT">Konsumsi Produksi</option>
                    <option value="MANUAL">Manual</option>
                </select></div>
        </div>
        <div><label class="block text-sm font-medium text-gray-700 mb-1">Item <span class="text-red-500">*</span></label>
            <select id="so_item" onchange="invUpdateUnit('so_item','so_unit_display'); invShowCurrentStock('so_item','so_stock_info')" class="w-full border border-gray-300 rounded px-3 py-2 text-sm bg-white">${getActiveItemOpts()}</select></div>
        <div id="so_stock_info" class="hidden p-2 bg-indigo-50 border border-blue-100 rounded text-sm text-blue-700"></div>
        <div class="grid grid-cols-2 gap-4">
            <div><label class="block text-sm font-medium text-gray-700 mb-1">Qty <span class="text-red-500">*</span></label>
                <input type="number" id="so_qty" min="0.01" step="0.01" placeholder="0" class="w-full border border-gray-300 rounded px-3 py-2 text-sm"></div>
            <div><label class="block text-sm font-medium text-gray-700 mb-1">Satuan</label>
                <input type="text" id="so_unit_display" readonly class="w-full border border-gray-200 rounded px-3 py-2 text-sm bg-gray-50 text-gray-500"></div>
        </div>
        <div><label class="block text-sm font-medium text-gray-700 mb-1">No. Referensi / Keterangan</label>
            <input type="text" id="so_notes" placeholder="cth: SO-123456 atau keterangan lain" class="w-full border border-gray-300 rounded px-3 py-2 text-sm"></div>
    </div>`;
    const footer = `
        <button onclick="saveStockOut()" class="w-full sm:w-auto inline-flex justify-center rounded-md bg-red-500 px-4 py-2 text-white text-sm font-medium hover:bg-red-600 sm:ml-3">Simpan Stock Out</button>
        <button onclick="closeModal()" class="mt-3 sm:mt-0 w-full sm:w-auto inline-flex justify-center rounded-md border border-gray-300 px-4 py-2 bg-white text-gray-700 text-sm font-medium sm:ml-3">Batal</button>`;
    showModal('Tambah Stock Out', body, footer);
};

window.invShowCurrentStock = (selectId, infoId) => {
    const sel = document.getElementById(selectId);
    const info = document.getElementById(infoId);
    if (!sel || !info || !sel.value) { info.classList.add('hidden'); return; }
    const stock = db.getInventoryStock(sel.value);
    const unit = sel.selectedOptions[0]?.dataset.unit || '';
    info.classList.remove('hidden');
    info.innerHTML = `<i class="fas fa-info-circle mr-1"></i>Stok saat ini: <strong>${invFmt(stock)} ${unit}</strong>`;
};

window.saveStockOut = () => {
    const itemId = document.getElementById('so_item').value;
    const qty = parseFloat(document.getElementById('so_qty').value);
    const reference = document.getElementById('so_ref').value;
    const notes = document.getElementById('so_notes').value.trim();
    if (!itemId) { showToast('Pilih item terlebih dahulu', 'error'); return; }
    if (!qty || qty <= 0) { showToast('Qty harus lebih dari 0', 'error'); return; }
    if (!db.validateInventoryStock(itemId, qty)) {
        showToast('Stok tidak mencukupi untuk transaksi ini!', 'error'); return;
    }
    db.addInventoryTransaction(itemId, 'OUT', qty, reference, null, notes);
    showToast('Stock Out berhasil disimpan', 'success');
    closeModal();
    renderInventoryStockOut();
};

// ─── 4. PRODUCTION COMMAND CENTER (UNIFIED) ───────────────────
function renderProductionBoard() {
    const canEdit = getModulePermission('logistik').edit;
    document.getElementById('pageTitle').innerText = 'Production Command Center';
    const mc = document.getElementById('main-content');
    
    const todayStr = new Date().toISOString().split('T')[0];
    const mos = db.read('productionOrders') || [];
    const activeMOs = mos.filter(m => m.status === 'IN_PROGRESS');
    const finishedToday = mos.filter(m => m.status === 'DONE' && m.updatedAt?.startsWith(todayStr));
    
    // Calculate Stats
    const todayOutput = finishedToday.reduce((s, m) => s + (m.outputQty || 0), 0);
    const avgYield = finishedToday.length ? (finishedToday.reduce((s, m) => s + (m.yield || 100), 0) / finishedToday.length).toFixed(1) : '100';

    const STAGES = [
        { 
            id: 'MIXING', label: 'LANE 1: MIXING', category: 'MIXING_STOCK', icon: 'fas fa-blender', 
            tw: { badge: 'bg-blue-100 text-blue-700', iconBg: 'bg-gradient-to-br from-blue-100 to-blue-50 text-blue-600 border-blue-200/50', btn: 'bg-gradient-to-r from-blue-600 to-indigo-600 shadow-blue-500/30', dot: 'bg-blue-500', dotPulse: 'bg-blue-400', gradientL: 'from-blue-50/80', tagBg: 'bg-blue-50 text-blue-600' },
            monitorLocation: 'MIXING' 
        },
        { 
            id: 'OVEN_BASAH', label: 'LANE 2: OVEN BASAH', category: 'OVEN_BASAH_STOCK', icon: 'fas fa-fire', 
            tw: { badge: 'bg-orange-100 text-orange-700', iconBg: 'bg-gradient-to-br from-orange-100 to-orange-50 text-orange-600 border-orange-200/50', btn: 'bg-gradient-to-r from-orange-500 to-red-500 shadow-orange-500/30', dot: 'bg-orange-500', dotPulse: 'bg-orange-400', gradientL: 'from-orange-50/80', tagBg: 'bg-orange-50 text-orange-600' },
            monitorLocation: 'OVEN_BASAH' 
        },
        { 
            id: 'OVEN_KERING', label: 'LANE 3: OVEN KERING', category: 'FINISHED_GOODS', icon: 'fas fa-sun', 
            tw: { badge: 'bg-emerald-100 text-emerald-700', iconBg: 'bg-gradient-to-br from-emerald-100 to-emerald-50 text-emerald-600 border-emerald-200/50', btn: 'bg-gradient-to-r from-emerald-500 to-green-600 shadow-emerald-500/30', dot: 'bg-emerald-500', dotPulse: 'bg-emerald-400', gradientL: 'from-emerald-50/80', tagBg: 'bg-emerald-50 text-emerald-600' },
            monitorLocation: 'WHS' 
        }
    ];

    const statsHeader = `
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 mb-8">
            <div class="bg-gradient-to-br from-white to-blue-50/50 p-5 rounded-2xl shadow-sm border border-blue-100 flex flex-col relative overflow-hidden group hover:shadow-md transition-all">
                <div class="absolute -right-4 -top-4 w-20 h-20 bg-blue-100 rounded-full blur-2xl opacity-50 group-hover:scale-110 transition-transform"></div>
                <div class="absolute top-4 right-4 text-blue-200 group-hover:text-blue-500 transition-colors duration-500"><i class="fas fa-layer-group fa-2x"></i></div>
                <p class="text-[10px] font-black text-blue-500 uppercase tracking-widest mb-2 z-10 relative">Batch Aktif</p>
                <div class="flex items-end gap-2 mt-auto z-10 relative">
                    <span class="text-4xl font-black text-slate-800 tracking-tighter">${activeMOs.length}</span>
                    <span class="text-xs font-bold text-slate-400 mb-1.5 uppercase tracking-wider">Orders</span>
                </div>
            </div>
            
            <div class="bg-gradient-to-br from-white to-emerald-50/50 p-5 rounded-2xl shadow-sm border border-emerald-100 flex flex-col relative overflow-hidden group hover:shadow-md transition-all">
                <div class="absolute -right-4 -top-4 w-20 h-20 bg-emerald-100 rounded-full blur-2xl opacity-50 group-hover:scale-110 transition-transform"></div>
                <div class="absolute top-4 right-4 text-emerald-200 group-hover:text-emerald-500 transition-colors duration-500"><i class="fas fa-box-open fa-2x"></i></div>
                <p class="text-[10px] font-black text-emerald-500 uppercase tracking-widest mb-2 z-10 relative">Output Hari Ini</p>
                <div class="flex items-end gap-2 mt-auto z-10 relative">
                    <span class="text-4xl font-black text-slate-800 tracking-tighter">${invFmt(todayOutput)}</span>
                    <span class="text-xs font-bold text-slate-400 mb-1.5 uppercase tracking-wider">Kg</span>
                </div>
            </div>

            <div class="bg-gradient-to-br from-white to-orange-50/50 p-5 rounded-2xl shadow-sm border border-orange-100 flex flex-col relative overflow-hidden group hover:shadow-md transition-all">
                <div class="absolute -right-4 -top-4 w-20 h-20 bg-orange-100 rounded-full blur-2xl opacity-50 group-hover:scale-110 transition-transform"></div>
                <div class="absolute top-4 right-4 text-orange-200 group-hover:text-orange-500 transition-colors duration-500"><i class="fas fa-chart-line fa-2x"></i></div>
                <p class="text-[10px] font-black text-orange-500 uppercase tracking-widest mb-2 z-10 relative">Rata-rata Yield</p>
                <div class="flex items-end gap-2 mt-auto z-10 relative">
                    <span class="text-4xl font-black text-slate-800 tracking-tighter">${avgYield}%</span>
                    <span class="text-xs font-bold text-slate-400 mb-1.5 uppercase tracking-wider">Efisiensi</span>
                </div>
            </div>

        </div>
    `;

    const getStageData = (stageId, category, monitorLocation) => {
        const items = db.read('inventoryItems');
        const allTxs = db.read('stockTransactions');
        const stageItems = items.filter(i => i.category === category);
        const loc = monitorLocation || stageId;

        return stageItems.map(item => {
            const txs = allTxs.filter(t => t.itemId === item.id && t.location === loc);
            const awal = txs.filter(t => t.date < todayStr).reduce((s, t) => t.type === 'IN' ? s + t.qty : s - t.qty, 0);
            const masuk = txs.filter(t => t.date >= todayStr && t.type === 'IN').reduce((s, t) => s + t.qty, 0);
            const keluar = txs.filter(t => t.date >= todayStr && t.type === 'OUT').reduce((s, t) => s + t.qty, 0);
            const akhir = awal + masuk - keluar;
            if (awal === 0 && masuk === 0 && keluar === 0 && akhir === 0) return null;
            return { item, awal, masuk, keluar, akhir };
        }).filter(Boolean);
    };

    const renderLane = (st) => {
        const laneMOs = activeMOs.filter(m => m.stage === st.id);
        const stockData = getStageData(st.id, st.category, st.monitorLocation);
        
        const moCards = laneMOs.map(mo => `
            <div class="bg-white rounded-xl border border-slate-200/60 p-4 mb-3 shadow-sm hover:shadow-md hover:border-slate-300 transition-all cursor-pointer relative overflow-hidden group" onclick="viewProductionMO('${mo.id}')">
                <div class="absolute -right-4 -top-4 w-16 h-16 bg-slate-50 rounded-full rotate-12 opacity-50 group-hover:scale-150 transition-all duration-500"></div>
                <div class="absolute top-4 right-4 opacity-20 text-slate-400 transform group-hover:rotate-12 group-hover:scale-110 transition-all duration-500">
                    <i class="${st.icon} fa-2x"></i>
                </div>
                
                <div class="relative z-10">
                    <div class="flex justify-between items-center mb-3">
                        <span class="text-[10px] font-black ${st.tw.badge} px-2 py-1 rounded-md uppercase tracking-wider shadow-[0_1px_2px_rgba(0,0,0,0.05)] border border-white/50">${mo.moNumber}</span>
                        <span class="text-[10px] font-bold text-slate-400 flex items-center gap-1.5"><i class="far fa-clock"></i>${new Date(mo.createdAt).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</span>
                    </div>
                    <p class="text-sm font-black text-slate-800 mb-4 pr-8 leading-tight tracking-tight">${mo.productName}</p>
                    
                    <div class="grid grid-cols-2 gap-2 mb-4">
                        <div class="bg-slate-50/80 p-2 rounded-lg border border-slate-100">
                            <span class="block text-[8px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Target Produksi</span>
                            <span class="block text-xs font-black text-slate-700">${invFmt(mo.targetQty)} Kg</span>
                        </div>
                        <div class="bg-slate-50/80 p-2 rounded-lg border border-slate-100">
                            <span class="block text-[8px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Mesin/Jalur</span>
                            <span class="block text-[10px] font-bold text-slate-600 truncate">${mo.machineName || '-'}</span>
                        </div>
                    </div>
                    
                    <button onclick="event.stopPropagation(); openCompleteMOModal('${mo.id}')" 
                        class="w-full ${st.tw.btn} text-white py-2.5 rounded-lg text-[10px] font-black uppercase tracking-widest shadow-md hover:shadow-lg hover:scale-[1.01] active:scale-95 transition-all flex items-center justify-center gap-2">
                        <i class="fas fa-check-circle"></i> Selesaikan Tahap
                    </button>
                </div>
            </div>
        `).join('');

        const stockRows = stockData.map(d => `
            <div class="flex justify-between items-center py-2 px-3 hover:bg-slate-50 rounded-lg transition-colors border-b border-slate-50 last:border-0">
                <div class="flex items-center gap-2">
                    <div class="w-1.5 h-1.5 rounded-full ${st.tw.dot}"></div>
                    <span class="text-[11px] font-bold text-slate-700">${d.item.itemName}</span>
                </div>
                <span class="text-[11px] font-black text-slate-800 bg-slate-100 px-2.5 py-1 rounded-md border border-slate-200/60 shadow-sm">${invFmt(d.akhir)}</span>
            </div>
        `).join('');

        return `
            <div class="flex flex-col h-full min-w-[340px] max-w-[360px]">
                <!-- Lane Header -->
                <div class="bg-white rounded-2xl rounded-b-none p-5 border border-b-0 border-slate-200/80 shadow-sm relative overflow-hidden z-10">
                    <div class="absolute right-0 top-0 w-32 h-full bg-gradient-to-l ${st.tw.gradientL} to-transparent opacity-80"></div>
                    <div class="flex items-center gap-4 relative z-10">
                        <div class="w-12 h-12 rounded-2xl ${st.tw.iconBg} flex items-center justify-center text-xl shadow-sm border">
                            <i class="${st.icon} drop-shadow-[0_2px_4px_rgba(0,0,0,0.1)]"></i>
                        </div>
                        <div>
                            <h3 class="text-sm font-black text-slate-800 uppercase tracking-widest drop-shadow-sm">${st.label}</h3>
                            <p class="text-[10px] font-black text-slate-500 mt-0.5 flex items-center gap-2 uppercase tracking-wider">
                                <span class="relative flex h-2 w-2">
                                  <span class="animate-ping absolute inline-flex h-full w-full rounded-full ${st.tw.dotPulse} opacity-75"></span>
                                  <span class="relative inline-flex rounded-full h-2 w-2 ${st.tw.dot}"></span>
                                </span>
                                ${laneMOs.length} Menunggu
                            </p>
                        </div>
                    </div>
                </div>
                
                <!-- Lane Body (Active Jobs) -->
                <div class="flex-1 bg-slate-100 p-4 border-x border-slate-200/80 overflow-y-auto max-h-[500px] shadow-inner styled-scrollbar">
                    <p class="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                        <i class="fas fa-stream"></i> Antrean Proses
                    </p>
                    ${moCards || `
                    <div class="py-12 text-center border-2 border-dashed border-slate-200/80 rounded-2xl bg-slate-50 border-white/50 shadow-sm">
                        <div class="w-16 h-16 bg-white rounded-full flex items-center justify-center mx-auto mb-3 shadow-sm border border-slate-100">
                            <i class="fas fa-inbox text-slate-300 text-2xl"></i>
                        </div>
                        <p class="text-xs font-black text-slate-400 uppercase tracking-widest">Kosong</p>
                        <p class="text-[10px] font-bold text-slate-400 mt-1">Tidak ada job di antrean</p>
                    </div>`}
                </div>

                <!-- Lane Footer (WIP Stock) -->
                <div class="bg-white rounded-2xl rounded-t-none p-4 border border-slate-200/80 shadow-[0_-4px_10px_-2px_rgba(0,0,0,0.03)] z-10 relative">
                    <div class="absolute inset-0 bg-gradient-to-b from-slate-50/50 to-transparent rounded-2xl pointer-events-none"></div>
                    <div class="flex items-center justify-between mb-4 px-1 relative z-10">
                        <p class="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                            <i class="fas fa-boxes text-slate-300"></i> Buffer WIP
                        </p>
                        <span class="text-[9px] font-black ${st.tw.tagBg} px-2 py-1 rounded-md shadow-sm border border-white/50">${stockData.length} Varian</span>
                    </div>
                    <div class="space-y-1 relative z-10">
                        ${stockRows || '<div class="py-4 text-center text-[10px] font-bold italic text-slate-400 bg-slate-50 rounded-lg">Stok Kosong / Tidak Tercatat</div>'}
                    </div>
                </div>
            </div>
        `;
    };

    mc.innerHTML = `
        <div class="animate-in fade-in slide-in-from-bottom-4 duration-500">
            ${statsHeader}
            
            <div class="flex gap-6 overflow-x-auto pb-6">
                ${STAGES.map(st => renderLane(st)).join('')}
            </div>
        </div>
    `;
}

window.openTransferToMixingModal = () => {
    const rmOpts = getActiveItemOpts('RAW_MATERIAL');
    const body = `
        <div class="space-y-4">
            <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">Pilih Bahan Baku</label>
                <select id="trans_item" class="w-full border border-gray-300 rounded px-3 py-2 text-sm bg-white">${rmOpts}</select>
            </div>
            <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">Qty di Kirim</label>
                <input type="number" id="trans_qty" min="0.01" step="0.01" class="w-full border border-gray-300 rounded px-3 py-2 text-sm" placeholder="0.00">
            </div>
            <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">Keterangan</label>
                <input type="text" id="trans_notes" class="w-full border border-gray-300 rounded px-3 py-2 text-sm" placeholder="Opsional">
            </div>
        </div>
    `;
    const footer = `
        <button onclick="saveTransferToMixing()" class="bg-blue-600 text-white px-4 py-2 rounded text-sm font-bold">Kirim ke Mixing</button>
        <button onclick="closeModal()" class="text-gray-500 px-4 py-2 text-sm">Batal</button>
    `;
    showModal('Kirim Bahan ke Mixing', body, footer);
};

window.saveTransferToMixing = () => {
    const itemId = document.getElementById('trans_item').value;
    const qty = parseFloat(document.getElementById('trans_qty').value);
    const notes = document.getElementById('trans_notes').value;
    if (!itemId || !qty) return showToast('Isi semua data!', 'error');

    if (!db.validateInventoryStock(itemId, qty)) return showToast('Stok tidak cukup!', 'error');

    const txId = 'TRF-' + Date.now().toString().slice(-6);
    // WHS OUT
    db.addInventoryTransaction(itemId, 'OUT', qty, 'STAGE_TRANSFER', txId, notes, 'Admin', 'WHS');
    // MIXING IN
    db.addInventoryTransaction(itemId, 'IN', qty, 'STAGE_TRANSFER', txId, notes, 'Admin', 'MIXING');

    showToast('Berhasil dikirim ke Mixing', 'success');
    closeModal();
    renderInventoryProduction();
};

window.openMixingProcessModal = () => {
    const rmItemsInMixing = db.read('inventoryItems').filter(i => i.category === 'RAW_MATERIAL');
    // Filter items that have stock in Mixing
    const validOpts = rmItemsInMixing.map(i => {
        const stock = db.getInventoryStock(i.id, 'MIXING');
        if (stock <= 0) return null;
        return `<option value="${i.id}" data-stock="${stock}">${i.itemName} (Stok: ${stock})</option>`;
    }).filter(Boolean).join('');

    const wipOpts = getActiveItemOpts('WIP');

    const body = `
        <div class="space-y-4">
            <div class="p-3 bg-blue-50 border border-blue-100 rounded text-xs text-blue-700">
                Langkah ini mengonsumsi Bahan Baku di <strong>Mixing</strong> dan menghasilkan Adonan di <strong>Oven Basah</strong>.
            </div>
            <div id="mixing_rm_rows" class="space-y-2">
                <div class="flex gap-2">
                    <select class="flex-1 border border-gray-300 rounded px-2 py-1.5 text-xs bg-white">${validOpts}</select>
                    <input type="number" class="w-24 border border-gray-300 rounded px-2 py-1.5 text-xs" placeholder="Qty">
                </div>
            </div>
            <button onclick="addMixingRMRow('${validOpts.replace(/'/g, "\\'")}')" class="text-[10px] text-blue-600 font-bold uppercase"><i class="fas fa-plus"></i> Tambah Bahan</button>
            <hr>
            <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">Hasil Adonan (Oven Basah)</label>
                <select id="mix_output_item" class="w-full border border-gray-300 rounded px-3 py-2 text-xs bg-white">${wipOpts}</select>
            </div>
            <div class="grid grid-cols-2 gap-3">
                <div>
                    <label class="block text-xs font-medium text-gray-600 mb-1">Total Hasil (Incl. Air)</label>
                    <input type="number" id="mix_output_qty" class="w-full border border-green-300 rounded px-3 py-2 text-sm bg-green-50 font-bold" placeholder="0.00">
                </div>
                <div>
                    <label class="block text-xs font-medium text-gray-600 mb-1">Keterangan</label>
                    <input type="text" id="mix_notes" class="w-full border border-gray-300 rounded px-3 py-2 text-sm">
                </div>
            </div>
        </div>
    `;
    const footer = `
        <button onclick="saveMixingProcess()" class="bg-orange-500 text-white px-4 py-2 rounded text-sm font-bold">Proses Mixing</button>
        <button onclick="closeModal()" class="text-gray-500 px-4 py-2 text-sm">Batal</button>
    `;
    showModal('Proses Mixing & Tambah Air', body, footer);
};

window.addMixingRMRow = (opts) => {
    const div = document.createElement('div');
    div.className = 'flex gap-2 transition-all animate-fadeIn';
    div.innerHTML = `<select class="flex-1 border border-gray-300 rounded px-2 py-1.5 text-xs bg-white">${opts}</select>
                     <input type="number" class="w-24 border border-gray-300 rounded px-2 py-1.5 text-xs" placeholder="Qty">
                     <button onclick="this.parentElement.remove()" class="text-red-400"><i class="fas fa-times"></i></button>`;
    document.getElementById('mixing_rm_rows').appendChild(div);
};

window.saveMixingProcess = () => {
    const outputItemId = document.getElementById('mix_output_item').value;
    const outputQty = parseFloat(document.getElementById('mix_output_qty').value);
    const notes = document.getElementById('mix_notes').value;
    const txId = 'MIX-' + Date.now().toString().slice(-6);

    if (!outputItemId || !outputQty) return showToast('Isi hasil adonan!', 'error');

    const rows = document.getElementById('mixing_rm_rows').querySelectorAll('div');
    const consumptions = [];
    let error = null;

    rows.forEach(row => {
        const id = row.querySelector('select').value;
        const qty = parseFloat(row.querySelector('input').value);
        if (id && qty > 0) {
            if (db.getInventoryStock(id, 'MIXING') < qty) {
                error = 'Stok di Mixing tidak cukup!';
            }
            consumptions.push({ id, qty });
        }
    });

    if (error) return showToast(error, 'error');
    if (!consumptions.length) return showToast('Pilih minimal 1 bahan baku!', 'error');

    // 1. Consume RM from Mixing
    consumptions.forEach(c => {
        db.addInventoryTransaction(c.id, 'OUT', c.qty, 'PRODUCTION_MIXING', txId, notes, 'Admin', 'MIXING');
    });

    // 2. Add WIP to Oven Basah
    db.addInventoryTransaction(outputItemId, 'IN', outputQty, 'PRODUCTION_MIXING', txId, notes, 'Admin', 'OVEN_BASAH');

    showToast('Proses Mixing selesai', 'success');
    closeModal();
    renderInventoryProduction();
};

window.openOvenProcessModal = () => {
    const wipInWet = db.read('inventoryItems').filter(i => i.category === 'WIP');
    const validOpts = wipInWet.map(i => {
        const stock = db.getInventoryStock(i.id, 'OVEN_BASAH');
        if (stock <= 0) return null;
        return `<option value="${i.id}" data-stock="${stock}">${i.itemName} (Stok: ${stock})</option>`;
    }).filter(Boolean).join('');

    const body = `
        <div class="space-y-4">
            <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">Pilih Item di Oven Basah</label>
                <select id="oven_input_item" class="w-full border border-gray-300 rounded px-3 py-2 text-sm bg-white" onchange="document.getElementById('oven_in_qty').value=this.selectedOptions[0].dataset.stock">${validOpts}</select>
            </div>
            <div class="grid grid-cols-2 gap-3">
                <div>
                    <label class="block text-xs font-medium text-gray-600 mb-1">Qty Masuk Oven</label>
                    <input type="number" id="oven_in_qty" class="w-full border border-gray-300 rounded px-3 py-2 text-sm bg-gray-50" readonly>
                </div>
                <div>
                    <label class="block text-xs font-medium text-gray-600 mb-1">Hasil Oven (Oven Kering)</label>
                    <input type="number" id="oven_out_qty" class="w-full border border-red-300 rounded px-3 py-2 text-sm font-bold bg-red-50" placeholder="0.00">
                </div>
            </div>
             <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">Keterangan</label>
                <input type="text" id="oven_notes" class="w-full border border-gray-300 rounded px-3 py-2 text-sm">
            </div>
        </div>
    `;
    const footer = `
        <button onclick="saveOvenProcess()" class="bg-red-600 text-white px-4 py-2 rounded text-sm font-bold">Mulai Baking / Dioven</button>
        <button onclick="closeModal()" class="text-gray-500 px-4 py-2 text-sm">Batal</button>
    `;
    showModal('Proses Oven (Penyusutan)', body, footer);
    // Trigger initial qty
    setTimeout(() => { const el = document.getElementById('oven_input_item'); if(el) el.dispatchEvent(new Event('change')); }, 100);
};

window.saveOvenProcess = () => {
    const itemId = document.getElementById('oven_input_item').value;
    const inQty = parseFloat(document.getElementById('oven_in_qty').value);
    const outQty = parseFloat(document.getElementById('oven_out_qty').value);
    const notes = document.getElementById('oven_notes').value;

    if (!itemId || !outQty) return showToast('Isi hasil oven!', 'error');

    const txId = 'OVN-' + Date.now().toString().slice(-6);

    // 1. OUT from Oven Basah
    db.addInventoryTransaction(itemId, 'OUT', inQty, 'PRODUCTION_OVEN', txId, notes, 'Admin', 'OVEN_BASAH');
    // 2. IN to Oven Kering
    db.addInventoryTransaction(itemId, 'IN', outQty, 'PRODUCTION_OVEN', txId, notes, 'Admin', 'OVEN_KERING');

    showToast('Proses Baking selesai', 'success');
    closeModal();
    renderInventoryProduction();
};

window.openFinalizeProdModal = () => {
    const wipInDry = db.read('inventoryItems').filter(i => i.category === 'WIP');
    const wipOpts = wipInDry.map(i => {
        const stock = db.getInventoryStock(i.id, 'OVEN_KERING');
        if (stock <= 0) return null;
        return `<option value="${i.id}" data-stock="${stock}">${i.itemName} (Stok: ${stock})</option>`;
    }).filter(Boolean).join('');

    const fgOpts = getActiveItemOpts('FINISHED_GOODS');

    const body = `
        <div class="space-y-4">
             <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">Item di Oven Kering</label>
                <select id="fin_input_item" class="w-full border border-gray-300 rounded px-3 py-2 text-sm bg-white" onchange="document.getElementById('fin_in_qty').value=this.selectedOptions[0].dataset.stock">${wipOpts}</select>
            </div>
             <div class="grid grid-cols-2 gap-3">
                <div>
                    <label class="block text-xs font-medium text-gray-600 mb-1">Qty Tersedia</label>
                    <input type="number" id="fin_in_qty" class="w-full border border-gray-300 rounded px-3 py-2 text-sm bg-gray-50" readonly>
                </div>
                <div>
                    <label class="block text-xs font-medium text-gray-600 mb-1">Qty Jadi FG</label>
                    <input type="number" id="fin_out_qty" class="w-full border border-green-300 rounded px-3 py-2 text-sm font-bold bg-green-50" placeholder="0.00">
                </div>
            </div>
            <hr>
            <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">Simpan sebagai Finished Good</label>
                <select id="fin_output_item" class="w-full border border-gray-300 rounded px-3 py-2 text-sm bg-white">${fgOpts}</select>
            </div>
        </div>
    `;
    const footer = `
        <button onclick="saveFinalizeProd()" class="bg-green-600 text-white px-4 py-2 rounded text-sm font-bold">Selesai Produksi (STOK FG)</button>
        <button onclick="closeModal()" class="text-gray-500 px-4 py-2 text-sm">Batal</button>
    `;
    showModal('Finalisasi Produksi ke Gudang FG', body, footer);
    setTimeout(() => { const el = document.getElementById('fin_input_item'); if(el) el.dispatchEvent(new Event('change')); }, 100);
};

window.saveFinalizeProd = () => {
    const inputItemId = document.getElementById('fin_input_item').value;
    const outputItemId = document.getElementById('fin_output_item').value;
    const inQty = parseFloat(document.getElementById('fin_in_qty').value);
    const outQty = parseFloat(document.getElementById('fin_out_qty').value);

    if (!inputItemId || !outputItemId || !outQty) return showToast('Pilih item dan isi qty!', 'error');

    const txId = 'FIN-' + Date.now().toString().slice(-6);

    // 1. OUT from Oven Kering (WIP)
    db.addInventoryTransaction(inputItemId, 'OUT', inQty, 'PRODUCTION_FINALIZE', txId, '', 'Admin', 'OVEN_KERING');
    // 2. IN to WHS (FG)
    db.addInventoryTransaction(outputItemId, 'IN', outQty, 'PRODUCTION_FINALIZE', txId, '', 'Admin', 'WHS');

    showToast('Produksi Selesai! Stok FG bertambah.', 'success');
    closeModal();
    renderInventoryProduction();
};

// ─── 6. STOCK REPORT ─────────────────────────────────────────
function renderInventoryReport() {
    document.getElementById('pageTitle').innerText = 'Laporan Stok';
    const mc = document.getElementById('main-content');
    const items = db.read('inventoryItems');

    const withStock = items.map(it => ({ ...it, currentStock: db.getInventoryStock(it.id) }));
    const lowItems = withStock.filter(i => i.currentStock < i.minStock);
    const totalRM = withStock.filter(i => i.category === 'RAW_MATERIAL').length;
    const totalFG = withStock.filter(i => i.category === 'FINISHED_GOODS').length;

    const buildTable = (filterCat) => {
        const filtered = filterCat ? withStock.filter(i => i.category === filterCat) : withStock;
        if (!filtered.length) return '<p class="py-6 text-center text-gray-400 text-sm">Tidak ada data</p>';
        return `<table class="w-full text-left border-collapse">
            <thead><tr class="bg-gray-50 border-b border-gray-200">
                <th class="py-3 px-4 text-xs font-semibold text-gray-600 uppercase">Kode</th>
                <th class="py-3 px-4 text-xs font-semibold text-gray-600 uppercase">Nama Item</th>
                <th class="py-3 px-4 text-xs font-semibold text-gray-600 uppercase">Kategori</th>
                <th class="py-3 px-4 text-xs font-semibold text-gray-600 uppercase text-right">Stok</th>
                <th class="py-3 px-4 text-xs font-semibold text-gray-600 uppercase text-right">Min. Stok</th>
                <th class="py-3 px-4 text-xs font-semibold text-gray-600 uppercase">Status Stok</th>
                <th class="py-3 px-4 text-xs font-semibold text-gray-600 uppercase text-right">Aksi</th>
            </tr></thead>
            <tbody>${filtered.map(it => {
            const isLow = it.currentStock < it.minStock;
            return `<tr class="border-b border-gray-100 hover:bg-gray-50 ${isLow ? 'bg-red-50/30' : ''}">
                    <td class="py-3 px-4 text-sm font-mono text-gray-600">${it.itemCode}</td>
                    <td class="py-3 px-4 text-sm font-medium text-gray-800">${it.itemName}</td>
                    <td class="py-3 px-4 text-sm"><span class="px-2 py-0.5 rounded text-xs font-semibold ${CATEGORY_COLORS[it.category] || ''}">${CATEGORY_LABELS[it.category] || it.category}</span></td>
                    <td class="py-3 px-4 text-sm text-gray-600">${it.unit}</td>
                    <td class="py-3 px-4 text-sm text-right font-bold ${isLow ? 'text-red-600' : 'text-gray-800'}">${invFmt(it.currentStock)}</td>
                    <td class="py-3 px-4 text-sm text-right text-gray-500">${invFmt(it.minStock)}</td>
                    <td class="py-3 px-4 text-sm">
                        ${isLow
                    ? '<span class="px-2 py-0.5 rounded text-xs font-semibold bg-red-100 text-red-700">⚠ Low Stock</span>'
                    : '<span class="px-2 py-0.5 rounded text-xs font-semibold bg-green-100 text-green-700">✓ Normal</span>'}
                    </td>
                    <td class="py-3 px-4 text-sm text-right whitespace-nowrap">
                        ${it.category === 'FINISHED_GOODS' ? `<button onclick="openRepackModal('${it.id}')" class="text-blue-600 hover:text-blue-800 font-bold text-xs bg-blue-50 px-2 py-1 rounded border border-blue-100 mr-2"><i class="fas fa-box-open mr-1"></i>Repack</button>` : ''}
                        <button onclick="openInventoryItemModal('${it.id}')" class="text-slate-400 hover:text-slate-600 p-1"><i class="fas fa-edit"></i></button>
                    </td>
                </tr>`;
        }).join('')}</tbody>
        </table>`;
    };

    mc.innerHTML = `
    <div class="space-y-4">
        <div class="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div class="bg-white rounded-lg border border-gray-100 shadow-sm p-4">
                <p class="text-xs text-gray-500 font-semibold uppercase">Total Item</p>
                <p class="text-3xl font-bold text-gray-800 mt-1">${items.length}</p>
            </div>
            <div class="bg-red-50 rounded-lg border border-red-100 shadow-sm p-4">
                <p class="text-xs text-red-500 font-semibold uppercase">Low Stock</p>
                <p class="text-3xl font-bold text-red-700 mt-1">${lowItems.length}</p>
            </div>
            <div class="bg-yellow-50 rounded-lg border border-yellow-100 shadow-sm p-4">
                <p class="text-xs text-yellow-600 font-semibold uppercase">Raw Material</p>
                <p class="text-3xl font-bold text-yellow-700 mt-1">${totalRM}</p>
            </div>
            <div class="bg-green-50 rounded-lg border border-green-100 shadow-sm p-4">
                <p class="text-xs text-green-600 font-semibold uppercase">Finished Goods</p>
                <p class="text-3xl font-bold text-green-700 mt-1">${totalFG}</p>
            </div>
        </div>

        <div class="bg-white rounded-lg shadow-sm border border-gray-100">
            <div class="border-b border-gray-200">
                <nav class="-mb-px flex space-x-4 px-6" id="inv_report_tabs">
                    ${[['all', 'Semua Item'], ['RAW_MATERIAL', 'Raw Material'], ['WIP', 'WIP'], ['FINISHED_GOODS', 'Finished Goods']].map(([cat, label], i) =>
        `<button onclick="switchInvReportTab('${cat}')" id="inv_tab_${cat}" class="whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm ${i === 0 ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}">${label}</button>`
    ).join('')}
                </nav>
            </div>
            <div id="inv_report_table" class="overflow-x-auto">${buildTable(null)}</div>
        </div>
    </div>`;

    window._invReportBuildTable = buildTable;
}

// ─── INTEGRASI: PO → Inventory & SO → Inventory ──────────────

// Cari inventoryItem by nama (case-insensitive, partial match) — fallback jika tidak ada ID
function findInvItemByName(name) {
    if (!name) return null;
    const clean = name.toLowerCase().trim();
    const items = db.read('inventoryItems').filter(i => i.status !== 'INACTIVE');
    let found = items.find(i => i.itemName.toLowerCase() === clean);
    if (found) return found;
    found = items.find(i => i.itemName.toLowerCase().includes(clean) || clean.includes(i.itemName.toLowerCase()));
    return found || null;
}

// Dipanggil dari confirmReceiveGoods (PO diterima) → stock IN
window.syncInventoryFromPOReceipt = (poId, poNumber, receivedItems) => {
    let synced = 0;
    receivedItems.forEach(item => {
        if (!item.qty || item.qty <= 0) return;
        // Prioritaskan inventoryItemId yang sudah tersimpan di item PO
        const invItem = item.inventoryItemId
            ? db.findById('inventoryItems', item.inventoryItemId)
            : findInvItemByName(item.prodText);
        if (invItem) {
            db.addInventoryTransaction(invItem.id, 'IN', item.qty, 'PO', poId,
                `Auto dari PO Receive: ${poNumber} - ${item.prodText}`);
            synced++;
        }
    });
    if (synced > 0) showToast(`✅ ${synced} item dari PO ${poNumber} otomatis masuk ke stok Inventory!`, 'success');
    else showToast('PO diterima. Pastikan item PO terhubung ke Master Inventory.', 'success');
};

// Dipanggil dari deliverSO (SO dikirim) → stock OUT
window.syncInventoryFromSODelivery = (soId, soNumber, items) => {
    let synced = 0;
    const errors = [];
    items.forEach(item => {
        if (!item.qty || item.qty <= 0) return;
        // Prioritaskan inventoryItemId yang sudah tersimpan di item SO
        const invItem = item.inventoryItemId
            ? db.findById('inventoryItems', item.inventoryItemId)
            : findInvItemByName(item.prodText);
        if (invItem) {
            if (!db.validateInventoryStock(invItem.id, item.qty)) {
                errors.push(`⚠ Stok inventory "${invItem.itemName}" tidak cukup`);
                return;
            }
            db.addInventoryTransaction(invItem.id, 'OUT', item.qty, 'SO', soId,
                `Auto dari SO Delivery ${soNumber}: ${item.prodText}`);
            synced++;
        }
    });
    if (errors.length) errors.forEach(e => showToast(e, 'error'));
    if (synced > 0) showToast(`✅ ${synced} item otomatis dikurangi dari stok Inventory!`, 'success');
};

window.switchInvReportTab = (cat) => {
    document.querySelectorAll('[id^="inv_tab_"]').forEach(btn => {
        btn.classList.remove('border-blue-500', 'text-blue-600');
        btn.classList.add('border-transparent', 'text-gray-500');
    });
    const active = document.getElementById(`inv_tab_${cat}`);
    if (active) { active.classList.add('border-blue-500', 'text-blue-600'); active.classList.remove('border-transparent', 'text-gray-500'); }
    document.getElementById('inv_report_table').innerHTML = window._invReportBuildTable(cat === 'all' ? null : cat);
};

// ─── 6. PENGIRIMAN BARANG (SURAT JALAN / DELIVERY) ────────────
// renderWarehouseDeliveryOrders removed - using the version in delivery_order.js

// Legacy logistics section removed. Using delivery_order.js instead.


// ─── PENERIMAAN BARANG DARI PO ───────────────────────────────
function renderInventoryPOReceipt() {
    const canEdit = getModulePermission('logistik').edit;
    document.getElementById('pageTitle').innerText = 'Penerimaan Barang dari PO';
    const mc = document.getElementById('main-content');
    let pos = db.read('purchaseOrders').sort((a, b) => new Date(b.date) - new Date(a.date));
    const suppliers = db.read('suppliers');

    if (!window._porActiveTab) window._porActiveTab = 'pending';

    // Apply Date Filter
    pos = filterByDateRange(pos, 'inventoryPOReceipt');

    // Filter logic
    let filteredPOs = pos.filter(po => {
        // Apply Supplier Filter
        if (window.currentFilters.inventoryPOReceipt.supplier && po.supplierId !== window.currentFilters.inventoryPOReceipt.supplier) return false;

        // Apply Status Filter
        const stFilter = window.currentFilters.inventoryPOReceipt.status;
        if (stFilter === 'PENDING') {
            if (['RECEIVED', 'CANCELLED', 'DRAFT'].includes(po.status)) return false;
            const hasUnreceived = (po.items || []).some(i => (i.receivedQty || 0) < i.qty);
            if (!hasUnreceived && po.status !== 'APPROVED' && po.status !== 'PARTIALLY RECEIVED') return false;
        } else if (stFilter === 'RECEIVED') {
            if (po.status !== 'RECEIVED' && !(po.status === 'PARTIALLY RECEIVED' && (po.items || []).some(i => (i.receivedQty || 0) > 0))) return false;
        } else if (stFilter === 'UNRECEIVED') {
            // Specifically only those with NO goods received yet
            const noReceived = (po.items || []).every(i => (i.receivedQty || 0) === 0);
            if (!noReceived || po.status === 'RECEIVED' || po.status === 'CANCELLED') return false;
        }

        // Apply Tab Filter (Current behavior fallback)
        if (window._porActiveTab === 'pending') {
            if (['RECEIVED', 'CANCELLED', 'DRAFT'].includes(po.status)) return false;
            const hasUnreceived = (po.items || []).some(i => (i.receivedQty || 0) < i.qty);
            if (!hasUnreceived && po.status !== 'APPROVED' && po.status !== 'PARTIALLY RECEIVED') return false;
        } else {
            if (po.status !== 'RECEIVED' && !(po.status === 'PARTIALLY RECEIVED' && (po.items || []).some(i => (i.receivedQty || 0) > 0))) return false;
        }
        
        return true;
    });

    const rows = filteredPOs.map(po => {
        const sup = suppliers.find(s => s.id === po.supplierId) || { name: '-' };
        const totalOrdered = (po.items || []).reduce((s, i) => s + i.qty, 0);
        const totalReceived = (po.items || []).reduce((s, i) => s + (i.receivedQty || 0), 0);
        const pct = totalOrdered > 0 ? Math.round((totalReceived / totalOrdered) * 100) : 0;

        let statusBadge = `<span class="px-2 py-0.5 rounded text-xs font-semibold bg-blue-100 text-blue-700">${po.status}</span>`;
        if (po.status === 'PARTIALLY RECEIVED') statusBadge = `<span class="px-2 py-0.5 rounded text-xs font-semibold bg-orange-100 text-orange-700">PARTIAL</span>`;
        if (po.status === 'RECEIVED') statusBadge = `<span class="px-2 py-0.5 rounded text-xs font-semibold bg-green-100 text-green-700">RECEIVED</span>`;

        return `<tr class="border-b border-gray-100 hover:bg-gray-50 transition-colors">
            <td class="py-3 px-4 text-sm font-medium text-blue-600">${po.poNumber}</td>
            <td class="py-3 px-4 text-sm text-gray-700">${invDate(po.date)}</td>
            <td class="py-3 px-4 text-sm text-gray-800">${sup.name}</td>
            <td class="py-3 px-4 text-sm text-gray-600">${po.status === 'RECEIVED' ? invDate(po.receivedAt) : '-'}</td>
            <td class="py-3 px-4 text-sm">
                <div class="flex items-center gap-2">
                    <div class="flex-1 bg-gray-200 rounded-full h-1.5" style="min-width:60px">
                        <div class="bg-green-500 h-1.5 rounded-full" style="width:${pct}%"></div>
                    </div>
                    <span class="text-xs text-gray-600">${invFmt(totalReceived)}/${invFmt(totalOrdered)}</span>
                </div>
            </td>
            <td class="py-3 px-4 text-center">${statusBadge}</td>
            <td class="py-3 px-4 text-right">
                ${window._porActiveTab === 'pending' ? (canEdit ? `
                <button onclick="openPOReceiptModal('${po.id}')" class="text-white bg-green-600 hover:bg-green-700 text-xs px-3 py-1.5 rounded font-medium shadow-sm transition-colors">
                    <i class="fas fa-truck-loading mr-1"></i>Terima Barang
                </button>` : '<span class="text-gray-400 text-[10px] italic font-medium">VIEW ONLY</span>') : `
                <button onclick="viewPOReceiptDetails('${po.id}')" class="text-blue-500 hover:text-blue-700 text-xs font-bold">
                    <i class="fas fa-eye mr-1"></i>Detail
                </button>
                `}
            </td>
        </tr>`;
    }).join('');

    const tableHtml = rows ? `
        <div class="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <div class="overflow-x-auto">
                <table class="w-full text-left">
                    <thead><tr class="bg-gray-50 border-b border-gray-200">
                        <th class="py-3 px-4 text-[10px] font-bold text-gray-500 uppercase tracking-wider">No. PO</th>
                        <th class="py-3 px-4 text-[10px] font-bold text-gray-500 uppercase tracking-wider">Tgl PO</th>
                        <th class="py-3 px-4 text-[10px] font-bold text-gray-500 uppercase tracking-wider">Supplier</th>
                        <th class="py-3 px-4 text-[10px] font-bold text-gray-500 uppercase tracking-wider">Tgl Terima</th>
                        <th class="py-3 px-4 text-[10px] font-bold text-gray-500 uppercase tracking-wider">Progress</th>
                        <th class="py-3 px-4 text-[10px] font-bold text-gray-500 uppercase tracking-wider text-center">Status</th>
                        <th class="py-3 px-4 text-[10px] font-bold text-gray-500 uppercase tracking-wider text-right">Aksi</th>
                    </tr></thead>
                    <tbody>${rows}</tbody>
                </table>
            </div>
        </div>` : `
        <div class="bg-white rounded-xl shadow-sm border border-gray-100 p-20 text-center">
            <div class="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4 text-gray-300">
                <i class="fas fa-box-open text-4xl"></i>
            </div>
            <h3 class="text-gray-800 font-bold text-lg">${window._porActiveTab === 'pending' ? 'Tidak Ada Antrian Penerimaan' : 'Belum Ada Riwayat'}</h3>
            <p class="text-gray-500 text-sm mt-1">${window._porActiveTab === 'pending' ? 'Semua Purchase Order telah diterima atau belum disetujui.' : 'Belum ada PO yang tercatat diterima.'}</p>
        </div>`;

    mc.innerHTML = `
        <div class="flex items-center gap-4 mb-6 border-b border-gray-200">
            <button onclick="window._porActiveTab='pending'; renderInventoryPOReceipt()" 
                class="px-4 py-2 text-sm font-bold border-b-2 transition-all ${window._porActiveTab === 'pending' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-400 hover:text-gray-600'}">
                Antrean Penerimaan
            </button>
            <button onclick="window._porActiveTab='history'; renderInventoryPOReceipt()" 
                class="px-4 py-2 text-sm font-bold border-b-2 transition-all ${window._porActiveTab === 'history' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-400 hover:text-gray-600'}">
                Riwayat Penerimaan
            </button>
        </div>

        <div class="bg-white rounded-xl shadow-sm border border-slate-100 p-5 mb-5">
            <h3 class="text-sm font-black text-slate-800 uppercase tracking-widest mb-4 flex items-center gap-3"><i class="fas fa-filter text-blue-500"></i> FILTER PENCARIAN</h3>
            <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 items-end mb-4">
                <div>
                    <label class="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Supplier</label>
                    <select id="por_supplier" class="w-full border-2 border-slate-200 rounded-lg px-3 py-2 text-sm bg-white font-bold text-slate-700 focus:border-blue-500 outline-none transition-all">
                        <option value="">Semua Supplier</option>
                        ${suppliers.map(s => `<option value="${s.id}" ${window.currentFilters.inventoryPOReceipt.supplier === s.id ? 'selected' : ''}>${s.name}</option>`).join('')}
                    </select>
                </div>
                <div>
                    <label class="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Status</label>
                    <select id="por_status" class="w-full border-2 border-slate-200 rounded-lg px-3 py-2 text-sm bg-white font-bold text-slate-700 focus:border-blue-500 outline-none transition-all">
                        <option value="" ${!window.currentFilters.inventoryPOReceipt.status ? 'selected' : ''}>Semua Status</option>
                        <option value="PENDING" ${window.currentFilters.inventoryPOReceipt.status === 'PENDING' ? 'selected' : ''}>Menunggu / Antrean</option>
                        <option value="UNRECEIVED" ${window.currentFilters.inventoryPOReceipt.status === 'UNRECEIVED' ? 'selected' : ''}>Unreceived (Nol Penerimaan)</option>
                        <option value="RECEIVED" ${window.currentFilters.inventoryPOReceipt.status === 'RECEIVED' ? 'selected' : ''}>Selesai / Riwayat</option>
                    </select>
                </div>
                <div>
                    <label class="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Dari Tanggal PO</label>
                    <input type="date" id="por_start_date" value="${window.currentFilters.inventoryPOReceipt.start}" 
                        class="w-full border-2 border-slate-200 rounded-lg px-3 py-2 text-sm bg-white font-bold text-slate-700 focus:border-blue-500 outline-none transition-all">
                </div>
                <div>
                    <label class="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Sampai Tanggal PO</label>
                    <input type="date" id="por_end_date" value="${window.currentFilters.inventoryPOReceipt.end}" 
                        class="w-full border-2 border-slate-200 rounded-lg px-3 py-2 text-sm bg-white font-bold text-slate-700 focus:border-blue-500 outline-none transition-all">
                </div>
            </div>
            <div class="flex gap-2">
                <button onclick="applyPORFilter()" class="bg-blue-600 hover:bg-blue-700 text-white px-8 py-2 rounded-lg text-xs font-black uppercase tracking-widest transition-all shadow-sm">
                    <i class="fas fa-search mr-2"></i> TAMPILKAN
                </button>
                <button onclick="resetPORFilter()" class="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-500 rounded-lg transition-all shadow-sm" title="Reset">
                    <i class="fas fa-undo"></i>
                </button>
            </div>
        </div>
        ${tableHtml}`;
}

window.applyPORFilter = () => {
    window.currentFilters.inventoryPOReceipt.start = document.getElementById('por_start_date').value;
    window.currentFilters.inventoryPOReceipt.end = document.getElementById('por_end_date').value;
    window.currentFilters.inventoryPOReceipt.supplier = document.getElementById('por_supplier').value;
    window.currentFilters.inventoryPOReceipt.status = document.getElementById('por_status').value;
    renderInventoryPOReceipt();
};

window.resetPORFilter = () => {
    window.currentFilters.inventoryPOReceipt = { start: '', end: '', supplier: '', status: '' };
    renderInventoryPOReceipt();
};

window.openPOReceiptModal = (id) => {
    const po = db.findById('purchaseOrders', id);
    const rows = (po.items || []).map((i, idx) => {
        const receivedSoFar = i.receivedQty || 0;
        const sisa = Math.max(0, i.qty - receivedSoFar);
        return `<tr class="border-b text-sm">
            <td class="py-3 px-3">
                <div class="font-medium text-gray-800">${i.prodText || i.itemName || '-'}</div>
                <div class="text-xs text-gray-400">Pesan: ${invFmt(i.qty)} | Diterima: ${invFmt(receivedSoFar)} | Sisa: <span class="text-orange-600 font-medium">${invFmt(sisa)}</span></div>
            </td>
            <td class="py-3 px-3">
                <div class="w-full bg-gray-200 rounded-full h-1.5 mb-1">
                    <div class="bg-green-500 h-1.5 rounded-full" style="width:${i.qty > 0 ? Math.round((receivedSoFar / i.qty) * 100) : 0}%"></div>
                </div>
            </td>
            <td class="py-3 px-3 text-right">
                <input type="number" id="recv_qty_${idx}" value="${sisa}" max="${sisa}" min="0"
                    ${sisa === 0 ? 'disabled' : ''}
                    class="w-24 border border-gray-300 rounded px-2 py-1 text-center text-sm ${sisa === 0 ? 'bg-gray-100 text-gray-400' : 'bg-white'}">
            </td>
        </tr>`;
    }).join('');

    const body = `<div class="text-sm">
        <div class="bg-blue-50 border border-blue-100 rounded-lg p-3 mb-4 text-xs text-blue-700">
            <i class="fas fa-info-circle mr-1"></i> Masukkan qty aktual yang diterima hari ini. Anda bisa menerima sebagian saja.
        </div>
        <table class="w-full">
            <thead><tr class="border-b-2 border-gray-800 text-xs uppercase">
                <th class="py-2 px-3 text-left">Produk</th>
                <th class="py-2 px-3 text-left">Progress</th>
                <th class="py-2 px-3 text-right">Terima Hari Ini</th>
            </tr></thead>
            <tbody>${rows}</tbody>
        </table>
    </div>`;

    const footer = `
        <button onclick="confirmPOReceipt('${id}')" class="w-full sm:w-auto inline-flex justify-center rounded-md bg-green-600 px-5 py-2 text-white text-sm font-medium hover:bg-green-700 sm:ml-3">
            <i class="fas fa-check mr-2"></i>Konfirmasi Terima
        </button>
        <button onclick="closeModal()" class="mt-3 sm:mt-0 w-full sm:w-auto inline-flex justify-center rounded-md border border-gray-300 px-4 py-2 bg-white text-gray-700 text-sm font-medium sm:ml-3">Batal</button>`;

    showModal(`Terima Barang — ${po.poNumber}`, body, footer);
};

window.confirmPOReceipt = (id) => {
    const po = db.findById('purchaseOrders', id);
    const updatedItems = JSON.parse(JSON.stringify(po.items || []));
    let anyReceived = false;
    let sumReceived = 0, sumTarget = 0;

    updatedItems.forEach((item, idx) => {
        sumTarget += item.qty;
        const recvInput = document.getElementById(`recv_qty_${idx}`);
        if (!recvInput || recvInput.disabled) { sumReceived += (item.receivedQty || 0); return; }
        const recvQty = parseFloat(recvInput.value) || 0;
        item.receivedQty = (item.receivedQty || 0) + recvQty;
        sumReceived += item.receivedQty;
        if (recvQty > 0) {
            const stockItemId = item.inventoryItemId || item.productId || null;
            if (stockItemId) {
                try { db.addInventoryTransaction(stockItemId, 'IN', recvQty, 'PO', id, `Penerimaan PO ${po.poNumber}`); } catch (e) { console.warn(e); }
            }
            anyReceived = true;
        }
    });

    if (!anyReceived) { showToast('Tidak ada qty yang dimasukkan', 'error'); return; }

    const done = sumReceived >= sumTarget;
    db.update('purchaseOrders', id, {
        status: done ? 'RECEIVED' : 'PARTIALLY RECEIVED',
        receivedAt: new Date().toISOString(),
        actualDeliveryDate: done ? new Date().toISOString().split('T')[0] : (po.actualDeliveryDate || null),
        items: updatedItems
    });

    const sisa = sumTarget - sumReceived;
    showToast(done ? '✅ Semua barang diterima! PO selesai.' : `📦 Diterima sebagian. Sisa ${invFmt(sisa)} unit.`, done ? 'success' : 'info');
    closeModal();
    renderInventoryPOReceipt();
};

window.viewPOReceiptDetails = (id) => {
    const po = db.findById('purchaseOrders', id);
    if (!po) return;
    const suppliers = db.read('suppliers');
    const sup = suppliers.find(s => s.id === po.supplierId) || { name: '-' };

    const itemRows = (po.items || []).map(i => `
        <tr class="border-b border-gray-100 text-sm text-gray-700">
            <td class="py-3 px-2 font-medium">${i.prodText || i.itemName || '-'}</td>
            <td class="py-3 px-2 text-right">${invFmt(i.qty)} ${i.unit || ''}</td>
            <td class="py-3 px-2 text-right font-bold text-green-600">${invFmt(i.receivedQty || 0)} ${i.unit || ''}</td>
        </tr>
    `).join('');

    const body = `
        <div class="space-y-4">
            <div class="grid grid-cols-2 gap-4 text-sm bg-gray-50 p-4 rounded-xl border border-gray-100">
                <div><span class="text-gray-400">No. PO:</span> <strong class="text-blue-600">${po.poNumber}</strong></div>
                <div><span class="text-gray-400">Supplier:</span> <strong>${sup.name}</strong></div>
                <div><span class="text-gray-400">Tgl Order:</span> <strong>${invDate(po.date)}</strong></div>
                <div><span class="text-gray-400">Tgl Terima:</span> <strong class="text-green-600">${invDate(po.receivedAt)}</strong></div>
            </div>
            
            <table class="w-full text-left">
                <thead>
                    <tr class="border-b-2 border-gray-100 text-[10px] font-black text-gray-400 uppercase tracking-widest">
                        <th class="py-2 px-2">Nama Produk / Item</th>
                        <th class="py-2 px-2 text-right">Order Qty</th>
                        <th class="py-2 px-2 text-right text-green-600">Terima Qty</th>
                    </tr>
                </thead>
                <tbody>${itemRows}</tbody>
            </table>
        </div>
    `;

    showModal(`Detail Penerimaan — ${po.poNumber}`, body, `<button onclick="closeModal()" class="btn-secondary">Tutup</button>`);
};


// ─── 7. SHRINKAGE REPORT ─────────────────────────────────────
window.renderInventoryShrinkageReport = () => {
    const canEdit = getModulePermission('produksi').edit;
    document.getElementById('pageTitle').innerText = 'Laporan Penyusutan';
    const mc = document.getElementById('main-content');

    const now = new Date();
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
    const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0];

    mc.innerHTML = `
    <div class="bg-white rounded-xl shadow-sm border border-gray-100 p-5 mb-5">
        <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-3">
            <h2 class="text-lg font-semibold text-gray-800">Laporan Penyusutan / NG</h2>
            <div class="flex gap-2">
                ${canEdit ? `
                <button onclick="openManualShrinkageModal()" class="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-colors">
                    <i class="fas fa-plus"></i> Catat Penyusutan Manual
                </button>
                ` : `
                <span class="text-xs font-medium text-orange-500 bg-orange-50 border border-orange-100 px-3 py-2 rounded-lg flex items-center gap-2">
                    <i class="fas fa-info-circle"></i> Mode Lihat Saja
                </span>
                `}
            </div>
        </div>
        <div class="flex flex-wrap gap-3 items-end">
            <div>
                <label class="block text-xs font-medium text-gray-500 mb-1">Dari Tanggal</label>
                <input type="date" id="sr_from" value="${firstDay}" class="border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white focus:ring-2 focus:ring-blue-500 outline-none">
            </div>
            <div>
                <label class="block text-xs font-medium text-gray-500 mb-1">Sampai Tanggal</label>
                <input type="date" id="sr_to" value="${lastDay}" class="border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white focus:ring-2 focus:ring-blue-500 outline-none">
            </div>
            <button onclick="runShrinkageReport()" class="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2 rounded-lg text-sm font-semibold transition-colors flex items-center gap-2">
                <i class="fas fa-search"></i> Tampilkan
            </button>
        </div>
    </div>
    <div id="shrinkage_report_output"></div>`;

    setTimeout(() => runShrinkageReport(), 50);
};

window.runShrinkageReport = () => {
    const fromVal = document.getElementById('sr_from')?.value;
    const toVal = document.getElementById('sr_to')?.value;
    const output = document.getElementById('shrinkage_report_output');
    if (!fromVal || !toVal || !output) return;

    const from = new Date(fromVal); from.setHours(0, 0, 0, 0);
    const to = new Date(toVal); to.setHours(23, 59, 59, 999);

    const items = db.read('inventoryItems');

    // ── 1. Penyusutan dari MO (productionOrders) — tidak double-count mutasi stok ──
    const moShrinkages = (db.read('productionOrders') || []).filter(mo => {
        if (mo.status !== 'DONE') return false;
        if (mo.stage !== 'OVEN_KERING') return false; // Hanya Oven Kering yang ada susut
        const kg = parseFloat(mo.shrinkageKg) || 0;
        if (kg <= 0) return false;
        const d = new Date(mo.completedAt || mo.updatedAt || mo.createdAt);
        return d >= from && d <= to;
    }).map(mo => {
        const inputItem = mo.inputItemId ? items.find(i => i.id === mo.inputItemId) : null;
        return {
            date: mo.completedAt || mo.updatedAt || mo.createdAt,
            itemCode: inputItem?.itemCode || '-',
            itemName: inputItem?.itemName || `WIP ${mo.stage} (${mo.productName || '-'})`,
            itemId: mo.inputItemId || null,
            qty: parseFloat(mo.shrinkageKg) || 0,
            unit: inputItem?.unit || 'Kg',
            notes: `Susut ${mo.stage === 'OVEN_KERING' ? 'Oven Kering' : mo.stage} MO ${mo.moNumber}: ${(parseFloat(mo.shrinkageKg)||0).toFixed(2)} Kg (${mo.shrinkagePct || 0}%)`,
            source: 'MO'
        };
    });

    // ── 2. Penyusutan manual (dari stockTransactions dengan reference SHRINKAGE) ──
    const manualTxs = (db.read('stockTransactions') || []).filter(t => {
        const d = new Date(t.date);
        return d >= from && d <= to && t.reference === 'SHRINKAGE';
    }).map(t => ({
        date: t.date,
        itemCode: t.itemCode || '-',
        itemName: t.itemName,
        itemId: t.itemId,
        qty: parseFloat(t.qty) || 0,
        unit: items.find(i => i.id === t.itemId)?.unit || t.unit || 'Kg',
        notes: t.notes || 'Penyusutan Manual',
        source: 'MANUAL'
    }));

    // ── Gabungkan & sort terbaru dulu ──
    const allEntries = [...moShrinkages, ...manualTxs]
        .sort((a, b) => new Date(b.date) - new Date(a.date));

    // ── Summary per item ──
    const summary = {};
    allEntries.forEach(e => {
        const key = e.itemId || e.itemName;
        if (!summary[key]) summary[key] = { itemName: e.itemName, itemCode: e.itemCode, totalQty: 0, count: 0, unit: e.unit };
        summary[key].totalQty += e.qty;
        summary[key].count += 1;
    });

    // ── Detail rows ──
    const detailRows = allEntries.map(e => {
        const sourceBadge = e.source === 'MO'
            ? `<span class="px-1.5 py-0.5 rounded text-[9px] font-black bg-orange-100 text-orange-700 uppercase">MO</span>`
            : `<span class="px-1.5 py-0.5 rounded text-[9px] font-black bg-gray-100 text-gray-500 uppercase">Manual</span>`;
        return `
            <tr class="border-b border-gray-100 hover:bg-orange-50/30 transition-colors">
                <td class="py-2.5 px-4 text-xs text-gray-500">${invDate(e.date)}</td>
                <td class="py-2.5 px-4 text-xs font-mono font-bold text-blue-600">${e.itemCode}</td>
                <td class="py-2.5 px-4 text-sm font-medium text-gray-800">${e.itemName}</td>
                <td class="py-2.5 px-4 text-xs text-gray-500 italic max-w-[240px] truncate" title="${e.notes}">
                    ${sourceBadge} ${e.notes}
                </td>
                <td class="py-2.5 px-4 text-sm text-right font-black text-red-600">-${invFmt(e.qty)}</td>
                <td class="py-2.5 px-4 text-xs font-bold text-gray-400 uppercase">${e.unit}</td>
            </tr>
        `;
    }).join('') || '<tr><td colspan="6" class="py-10 text-center text-gray-400 text-sm italic">Tidak ada data penyusutan dalam periode ini.</td></tr>';

    // ── Summary rows ──
    const summaryRows = Object.values(summary).sort((a, b) => b.totalQty - a.totalQty).map(s => {
        const it = items.find(i => i.id === s.itemId || i.itemCode === s.itemCode);
        return `
            <tr class="border-b border-gray-100 hover:bg-gray-50">
                <td class="py-3 px-4 text-sm font-mono text-blue-600">${s.itemCode}</td>
                <td class="py-3 px-4 text-sm font-medium text-gray-800">${s.itemName}</td>
                <td class="py-3 px-4 text-sm"><span class="px-2 py-0.5 rounded text-xs font-semibold ${CATEGORY_COLORS[it?.category] || 'bg-gray-100'}">${it ? CATEGORY_LABELS[it.category] : 'WIP'}</span></td>
                <td class="py-3 px-4 text-sm text-right font-black text-red-600">-${invFmt(s.totalQty)} ${s.unit}</td>
                <td class="py-3 px-4 text-sm text-center text-gray-500">${s.count} kali</td>
            </tr>
        `;
    }).join('') || '<tr><td colspan="5" class="py-8 text-center text-gray-400 text-sm italic">Tidak ada data.</td></tr>';

    const totalSusutKg = allEntries.reduce((s, e) => s + e.qty, 0);

    output.innerHTML = `
        <div class="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
            <div class="bg-red-50 border border-red-100 rounded-xl p-4">
                <p class="text-[10px] font-black text-red-400 uppercase tracking-widest mb-1">Total Susut</p>
                <p class="text-2xl font-black text-red-600">${invFmt(totalSusutKg)} <span class="text-sm font-bold">Kg</span></p>
            </div>
            <div class="bg-orange-50 border border-orange-100 rounded-xl p-4">
                <p class="text-[10px] font-black text-orange-400 uppercase tracking-widest mb-1">Jumlah Kejadian</p>
                <p class="text-2xl font-black text-orange-600">${allEntries.length} <span class="text-sm font-bold">Entri</span></p>
            </div>
            <div class="bg-blue-50 border border-blue-100 rounded-xl p-4 col-span-2 md:col-span-1">
                <p class="text-[10px] font-black text-blue-400 uppercase tracking-widest mb-1">Item Terdampak</p>
                <p class="text-2xl font-black text-blue-600">${Object.keys(summary).length} <span class="text-sm font-bold">Item</span></p>
            </div>
        </div>

        <div class="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden mb-6">
            <div class="p-4 bg-slate-50 border-b border-gray-100 flex justify-between items-center">
                <h3 class="font-bold text-gray-700 flex items-center gap-2">
                    <i class="fas fa-history text-orange-500"></i> Riwayat Penyusutan Detail
                </h3>
                <span class="text-xs text-gray-500">${allEntries.length} Entri</span>
            </div>
            <div class="overflow-x-auto">
                <table class="w-full text-left">
                    <thead>
                        <tr class="bg-gray-50/50 border-b border-gray-200">
                            <th class="py-3 px-4 text-xs font-semibold text-gray-600 uppercase">Tanggal</th>
                            <th class="py-3 px-4 text-xs font-semibold text-gray-600 uppercase">Kode</th>
                            <th class="py-3 px-4 text-xs font-semibold text-gray-600 uppercase">Nama Item</th>
                            <th class="py-3 px-4 text-xs font-semibold text-gray-600 uppercase">Keterangan / Sumber</th>
                            <th class="py-3 px-4 text-xs font-semibold text-gray-600 uppercase text-right">Susut (Kg)</th>
                        </tr>
                    </thead>
                    <tbody>${detailRows}</tbody>
                </table>
            </div>
        </div>

        <div class="bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden">
            <div class="p-4 bg-gray-50 border-b border-gray-100 flex justify-between items-center">
                <h3 class="font-bold text-gray-700"><i class="fas fa-chart-bar mr-2 text-blue-500"></i>Ringkasan per Item</h3>
                <span class="text-xs text-gray-500">${Object.keys(summary).length} Item</span>
            </div>
            <div class="overflow-x-auto">
                <table class="w-full text-left">
                    <thead>
                        <tr class="bg-gray-50/50 border-b border-gray-200">
                            <th class="py-3 px-4 text-xs font-semibold text-gray-600 uppercase">Kode</th>
                            <th class="py-3 px-4 text-xs font-semibold text-gray-600 uppercase">Nama Item</th>
                            <th class="py-3 px-4 text-xs font-semibold text-gray-600 uppercase">Kategori</th>
                            <th class="py-3 px-4 text-xs font-semibold text-gray-600 uppercase text-right">Total Susut</th>
                            <th class="py-3 px-4 text-xs font-semibold text-gray-600 uppercase text-center">Frekuensi</th>
                        </tr>
                    </thead>
                    <tbody>${summaryRows}</tbody>
                </table>
            </div>
        </div>
    `;
};

window.openManualShrinkageModal = () => {
    const todayStr = new Date().toISOString().split('T')[0];
    const itemOpts = getActiveItemOpts();

    const body = `<div class="space-y-4">
        <div><label class="block text-sm font-medium text-gray-700 mb-1">Tanggal Judgment</label>
            <input type="date" id="mshrink_date" value="${todayStr}" class="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500"></div>
        <div><label class="block text-sm font-medium text-gray-700 mb-1">Item yang Bermasalah (NG/Susut) <span class="text-red-500">*</span></label>
            <select id="mshrink_item" onchange="invUpdateUnit('mshrink_item','mshrink_unit_disp'); invShowCurrentStock('mshrink_item','mshrink_stock_info')" 
                class="w-full border border-gray-300 rounded px-3 py-2 text-sm bg-white focus:ring-2 focus:ring-blue-500">${itemOpts}</select></div>
        <div id="mshrink_stock_info" class="hidden p-2 bg-blue-50 border border-blue-100 rounded text-xs text-blue-700"></div>
        <div class="grid grid-cols-2 gap-4">
            <div><label class="block text-sm font-medium text-gray-700 mb-1">Qty Susut <span class="text-red-500">*</span></label>
                <input type="number" id="mshrink_qty" min="0.01" step="0.01" placeholder="0" class="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500"></div>
            <div><label class="block text-sm font-medium text-gray-700 mb-1">Satuan</label>
                <input type="text" id="mshrink_unit_disp" readonly class="w-full border border-gray-200 rounded px-3 py-2 text-sm bg-gray-50 text-gray-500"></div>
        </div>
        <div><label class="block text-sm font-medium text-gray-700 mb-1">Alasan / Judgement (Keterangan)</label>
            <textarea id="mshrink_notes" placeholder="cth: Barang pecah di gudang, NG dari produksi..." class="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500" rows="2"></textarea></div>
    </div>`;

    const footer = `
        <button onclick="saveManualShrinkage()" class="w-full sm:w-auto inline-flex justify-center rounded-md bg-blue-600 px-4 py-2 text-white text-sm font-medium hover:bg-blue-700 sm:ml-3">Catat & Potong Stok</button>
        <button onclick="closeModal()" class="mt-3 sm:mt-0 w-full sm:w-auto inline-flex justify-center rounded-md border border-gray-300 px-4 py-2 bg-white text-gray-700 text-sm font-medium sm:ml-3">Batal</button>`;

    showModal('Judgement Barang (Penyusutan Manual)', body, footer);
};

window.saveManualShrinkage = () => {
    const itemId = document.getElementById('mshrink_item').value;
    const qty = parseFloat(document.getElementById('mshrink_qty').value);
    const date = document.getElementById('mshrink_date').value;
    const notes = document.getElementById('mshrink_notes').value.trim() || 'Penyusutan Manual (Judgement)';

    if (!itemId || !qty || qty <= 0) { showToast('Data belum lengkap Pak', 'error'); return; }
    if (!db.validateInventoryStock(itemId, qty)) {
        showToast('Stok tidak mencukupi untuk dipotong!', 'error'); return;
    }

    db.addInventoryTransaction(itemId, 'OUT', qty, 'SHRINKAGE', null, notes, date);
    showToast('Penyusutan berhasil dicatat dan stok dipotong', 'success');
    closeModal();
    renderInventoryShrinkageReport();
};

// ─── 8. MONTHLY STOCK REPORT ─────────────────────────────────
window.currentMonthlyReportCategory = 'RAW_MATERIAL';

window.renderMonthlyStockReport = () => {
    document.getElementById('pageTitle').innerText = 'Laporan Stok Bulanan';
    const mc = document.getElementById('main-content');

    const now = new Date();
    const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

    mc.innerHTML = `
    <div class="bg-white rounded-xl shadow-sm border border-gray-100 p-5 mb-5">
        <h2 class="text-lg font-semibold text-gray-800 mb-4 tracking-tight">Laporan Mutasi Stok Bulanan</h2>
        <div class="flex flex-wrap gap-3 items-end">
            <div>
                <label class="block text-xs font-semibold text-gray-500 uppercase mb-2 tracking-wider">Pilih Bulan</label>
                <input type="month" id="msr_month" value="${currentMonth}" class="border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white focus:ring-2 focus:ring-blue-500 outline-none transition-all">
            </div>
            <button onclick="runMonthlyStockReport()" class="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg text-sm font-bold transition-all flex items-center gap-2 shadow-sm h-[38px]">
                <i class="fas fa-search"></i> Tampilkan Laporan
            </button>
        </div>
    </div>
    
    <div class="bg-white rounded-xl shadow-sm border border-gray-100 mb-5 overflow-hidden">
        <div class="border-b border-gray-100">
            <nav class="flex overflow-x-auto no-scrollbar" id="msr_tabs_nav">
                ${[
                    ['RAW_MATERIAL', 'RawMatrial'],
                    ['MIXING_STOCK', 'Mixing'],
                    ['WIP_OVEN_BASAH', 'Oven Basah'],
                    ['WIP_OVEN_KERING', 'Oven Kering'],
                    ['FINISHED_GOODS', 'Finishgoods']
                ].map(([cat, label]) =>
                    `<button onclick="switchMonthlyReportTab('${cat}')" id="msr_tab_${cat}" 
                             class="whitespace-nowrap py-4 px-6 font-bold text-xs uppercase tracking-wider border-b-2 transition-all 
                             ${(window.currentMonthlyReportCategory || 'RAW_MATERIAL') === cat ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-400 hover:text-gray-600'}">${label}</button>`
                ).join('')}
            </nav>
        </div>
        <div id="monthly_stock_report_output"></div>
    </div>`;

    setTimeout(() => runMonthlyStockReport(), 50);
};

window.switchMonthlyReportTab = (cat) => {
    window.currentMonthlyReportCategory = cat;
    document.querySelectorAll('[id^="msr_tab_"]').forEach(btn => {
        btn.classList.remove('border-blue-600', 'text-blue-600');
        btn.classList.add('border-transparent', 'text-gray-400');
    });
    const active = document.getElementById(`msr_tab_${cat}`);
    if (active) {
        active.classList.add('border-blue-600', 'text-blue-600');
        active.classList.remove('border-transparent', 'text-gray-400');
    }
    runMonthlyStockReport();
};

window.runMonthlyStockReport = () => {
    db.seedWIPItems(); // Pastikan smua baris proses muncul
    const monthVal = document.getElementById('msr_month')?.value;
    const output = document.getElementById('monthly_stock_report_output');
    if (!monthVal || !output) return;

    const [year, month] = monthVal.split('-').map(Number);
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0, 23, 59, 59);

    const items = db.read('inventoryItems');
    const allTxs = db.read('stockTransactions');

    // Custom filtering for production stages
    const cat = window.currentMonthlyReportCategory || 'RAW_MATERIAL';
    let filteredItems = [];

    if (cat === 'RAW_MATERIAL') {
        filteredItems = items.filter(it => it.category === 'RAW_MATERIAL');
    } else if (cat === 'MIXING_STOCK') {
        filteredItems = items.filter(it => it.category === 'MIXING_STOCK');
    } else if (cat === 'FINISHED_GOODS') {
        filteredItems = items.filter(it => it.category === 'FINISHED_GOODS');
    } else if (cat === 'WIP_OVEN_BASAH') {
        // Include items explicitly in OVEN_BASAH_STOCK category OR items in WIP category with "Oven Basah" in name
        filteredItems = items.filter(it => 
            it.category === 'OVEN_BASAH_STOCK' || 
            (it.category === 'WIP' && it.itemName.toLowerCase().includes('oven basah'))
        );
    } else if (cat === 'WIP_OVEN_KERING') {
        filteredItems = items.filter(it => 
            (it.category === 'WIP' && it.itemName.toLowerCase().includes('oven kering'))
        );
    } else if (cat.startsWith('WIP_')) {
        const stageName = cat.replace('WIP_', '').replace('_', ' ');
        filteredItems = items.filter(it => it.category === 'WIP' && it.itemName.toLowerCase().includes(stageName.toLowerCase()));
    } else {
        filteredItems = items;
    }

    const reportData = filteredItems.map(it => {
        // Stok Awal (semua tx sebelum startDate)
        const openingTxs = allTxs.filter(t => t.itemId === it.id && new Date(t.date) < startDate);
        const openingStock = openingTxs.reduce((sum, t) => sum + (t.type === 'IN' ? t.qty : -t.qty), 0);

        // Mutasi dalam Bulan terpilih
        const monthTxs = allTxs.filter(t => t.itemId === it.id && new Date(t.date) >= startDate && new Date(t.date) <= endDate);
        const totalIn = monthTxs.filter(t => t.type === 'IN').reduce((sum, t) => sum + t.qty, 0);
        const totalOut = monthTxs.filter(t => t.type === 'OUT').reduce((sum, t) => sum + t.qty, 0);
        const closingStock = openingStock + totalIn - totalOut;

        return {
            ...it,
            openingStock,
            totalIn,
            totalOut,
            closingStock
        };
    }).filter(it => ['WIP', 'MIXING_STOCK', 'OVEN_BASAH_STOCK', 'OVEN_KERING_STOCK'].includes(it.category) || it.openingStock !== 0 || it.totalIn !== 0 || it.totalOut !== 0);

    const rows = reportData.length ? reportData.map(s => `
        <tr class="border-b border-gray-100 hover:bg-gray-50 transition-colors">
            <td class="py-3 px-4 text-xs font-mono text-gray-500">${s.itemCode}</td>
            <td class="py-3 px-4 text-sm font-bold text-gray-800">${s.itemName}</td>
            <td class="py-3 px-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">${s.unit}</td>
            <td class="py-3 px-4 text-sm text-right font-medium text-gray-700 bg-gray-50/20">${invFmt(s.openingStock)}</td>
            <td class="py-3 px-4 text-sm text-right font-bold text-green-600">+${invFmt(s.totalIn)}</td>
            <td class="py-3 px-4 text-sm text-right font-bold text-red-600">-${invFmt(s.totalOut)}</td>
            <td class="py-3 px-4 text-sm text-right font-black text-blue-700 bg-blue-50/10">${invFmt(s.closingStock)}</td>
            <td class="py-3 px-4 text-right">
                <button onclick="viewProductStockCard('${s.id}', '${monthVal}')" class="text-blue-600 hover:text-blue-800 text-xs font-bold bg-blue-50 px-2 py-1 rounded border border-blue-100 transition-colors">
                    <i class="fas fa-eye mr-1"></i>Kartu
                </button>
            </td>
        </tr>
    `).join('') : `<tr><td colspan="8" class="py-20 text-center text-gray-400">
        <i class="fas fa-history text-3xl mb-3 opacity-20"></i><br/>
        <span class="text-sm">Tidak ada pergerakan stok untuk kategori "${CATEGORY_LABELS[window.currentMonthlyReportCategory] || 'Semua'}" di bulan ini.</span>
    </td></tr>`;

    output.innerHTML = `
        <div class="overflow-x-auto">
            <table class="w-full text-left border-collapse">
                <thead class="bg-gray-50/50 border-b border-gray-200">
                    <tr>
                        <th class="py-3 px-4 text-[10px] font-bold text-gray-500 uppercase tracking-wider">Kode</th>
                        <th class="py-3 px-4 text-[10px] font-bold text-gray-500 uppercase tracking-wider">Nama Item</th>
                        <th class="py-3 px-4 text-[10px] font-bold text-gray-500 uppercase tracking-wider">Unit</th>
                        <th class="py-3 px-4 text-[10px] font-bold text-gray-500 uppercase tracking-wider text-right">Stok Awal</th>
                        <th class="py-3 px-4 text-[10px] font-bold text-gray-500 uppercase tracking-wider text-right">Masuk (+)</th>
                        <th class="py-3 px-4 text-[10px] font-bold text-gray-500 uppercase tracking-wider text-right">Keluar (-)</th>
                        <th class="py-3 px-4 text-[10px] font-bold text-gray-500 uppercase tracking-wider text-right">Stok Akhir</th>
                        <th class="py-3 px-4 text-[10px] font-bold text-gray-500 uppercase tracking-wider text-right">Aksi</th>
                    </tr>
                </thead>
                <tbody>${rows}</tbody>
            </table>
        </div>`;
};

// --- Repacking Logic ---
window.openRepackModal = (id) => {
    const item = db.findById('inventoryItems', id);
    if (!item) return;
    const items = db.read('inventoryItems');
    const fgItems = items.filter(it => it.category === 'FINISHED_GOODS' && it.id !== id);
    const fgOpts = fgItems.map(it => `<option value="${it.id}">${it.itemName} (${it.unit})</option>`).join('');

    const body = `
    <div class="space-y-4">
        <div class="p-3 bg-blue-50 border border-blue-100 rounded-lg text-sm text-blue-800">
            <i class="fas fa-info-circle mr-2"></i><strong>Repacking</strong>: Mengonversi stok dari satu item ke item lainnya (contoh: dari Karung 25kg ke Kemasan 5kg).
        </div>
        <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Item Asal (Source)</label>
            <input type="text" value="${item.itemName} (Stok: ${db.getInventoryStock(item.id)} ${item.unit})" class="w-full border border-gray-200 rounded-lg px-3 py-2 bg-gray-50 text-gray-600 text-sm" readonly>
        </div>
        <div class="grid grid-cols-2 gap-4">
            <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">Jumlah Akan Di-repack (${item.unit}) <span class="text-red-500">*</span></label>
                <input type="number" id="repack_source_qty" min="0.01" step="0.01" class="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" placeholder="0">
            </div>
            <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">Pilih Item Tujuan (Target) <span class="text-red-500">*</span></label>
                <select id="repack_target_id" class="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white font-bold">
                    <option value="">-- Pilih SKU Tujuan --</option>${fgOpts}
                </select>
            </div>
        </div>
        <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Jumlah Hasil Terbentuk (Target Unit) <span class="text-red-500">*</span></label>
            <input type="number" id="repack_target_qty" min="0.01" step="0.01" class="w-full border-2 border-green-200 rounded-lg px-3 py-2 text-lg font-bold text-green-700" placeholder="Hasil akhir">
            <p class="text-[10px] text-gray-400 mt-1">Contoh: Repack 25 Kg menjadi 5 pack ukuran 5 Kg.</p>
        </div>
    </div>`;

    const footer = `
        <button onclick="saveRepacking('${id}')" class="w-full sm:w-auto inline-flex justify-center rounded-lg bg-blue-600 px-5 py-2 text-white text-sm font-bold hover:bg-blue-700 sm:ml-3">Proses Repacking</button>
        <button onclick="closeModal()" class="mt-3 sm:mt-0 w-full sm:w-auto inline-flex justify-center rounded-lg border border-gray-300 px-5 py-2 bg-white text-gray-700 text-sm font-medium sm:ml-3">Batal</button>`;

    showModal('Repackaging Finished Goods', body, footer);
};

window.saveRepacking = (sourceId) => {
    const srcQty = parseFloat(document.getElementById('repack_source_qty')?.value);
    const targetId = document.getElementById('repack_target_id')?.value;
    const targetQty = parseFloat(document.getElementById('repack_target_qty')?.value);

    if (!srcQty || srcQty <= 0 || !targetId || !targetQty || targetQty <= 1) {
        showToast('Lengkapi semua data repacking dengan benar', 'error');
        return;
    }

    const srcItem = db.findById('inventoryItems', sourceId);
    const targetItem = db.findById('inventoryItems', targetId);

    if (!db.validateInventoryStock(sourceId, srcQty)) {
        showToast(`Stok ${srcItem.itemName} tidak mencukupi untuk repacking`, 'error');
        return;
    }

    // Transactions
    db.addInventoryTransaction(sourceId, 'OUT', srcQty, 'PRODUCTION_OUT', null, `Repacking: ${srcItem.itemName} -> ${targetItem.itemName}`);
    db.addInventoryTransaction(targetId, 'IN', targetQty, 'PRODUCTION_IN', null, `Repacking: ${srcItem.itemName} -> ${targetItem.itemName}`);

    showToast('Repacking berhasil dilakukan!', 'success');
    closeModal();
    if (typeof renderInventoryMaster === 'function') renderInventoryMaster();
};

// --- Integrated Stock Card ---
window.viewProductStockCard = (productId, monthStr) => {
    const item = db.findById('inventoryItems', productId);
    if (!item) return;

    const [year, month] = monthStr.split('-').map(Number);
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0, 23, 59, 59);

    const allTxs = db.read('stockTransactions');
    const openingTxs = allTxs.filter(t => t.itemId === productId && new Date(t.date) < startDate);
    const openingStock = openingTxs.reduce((sum, t) => sum + (t.type === 'IN' ? t.qty : -t.qty), 0);

    const monthTxs = allTxs.filter(t => t.itemId === productId && new Date(t.date) >= startDate && new Date(t.date) <= endDate)
        .sort((a, b) => new Date(a.date) - new Date(b.date));

    let balance = openingStock;
    const itemRows = monthTxs.map(t => {
        const qtyIn = t.type === 'IN' ? t.qty : 0;
        const qtyOut = t.type === 'OUT' ? t.qty : 0;
        balance += qtyIn - qtyOut;
        return `
            <tr class="border-b border-gray-100 text-xs">
                <td class="py-2 px-2 text-gray-500">${invDate(t.date)}</td>
                <td class="py-2 px-2 font-mono text-gray-400">${t.txNo}</td>
                <td class="py-2 px-2 font-medium text-gray-700">${t.itemName}</td>
                <td class="py-2 px-2 text-right text-green-600 font-bold">${qtyIn > 0 ? '+' + invFmt(qtyIn) : '-'}</td>
                <td class="py-2 px-2 text-right text-red-600 font-bold">${qtyOut > 0 ? '-' + invFmt(qtyOut) : '-'}</td>
                <td class="py-2 px-2 text-right font-black text-gray-800">${invFmt(balance)}</td>
                <td class="py-2 px-2 text-[10px] text-gray-400 capitalize italic">${t.reference.toLowerCase()}</td>
            </tr>`;
    }).join('');

    const body = `
    <div class="space-y-4">
        <div class="bg-gray-50 p-4 rounded-xl border border-gray-100 grid grid-cols-2 gap-4 text-sm">
            <div><span class="text-gray-400 block text-[10px] uppercase font-bold">Produk</span> <strong class="text-blue-700">${item.itemName}</strong></div>
            <div><span class="text-gray-400 block text-[10px] uppercase font-bold">Periode</span> <strong>${monthStr}</strong></div>
            <div><span class="text-gray-400 block text-[10px] uppercase font-bold">Kode Barang</span> <strong>${item.itemCode || '-'}</strong></div>
            <div><span class="text-gray-400 block text-[10px] uppercase font-bold">Stok Awal</span> <strong class="text-orange-600">${invFmt(openingStock)} ${item.unit}</strong></div>
        </div>

        <div class="overflow-x-auto">
            <table class="w-full text-left">
                <thead>
                    <tr class="border-b-2 border-gray-100 text-[10px] font-black text-gray-400 uppercase tracking-widest">
                        <th class="py-2 px-2">Tanggal</th>
                        <th class="py-2 px-2">No. Bukti</th>
                        <th class="py-2 px-2">Keterangan</th>
                        <th class="py-2 px-2 text-right">Masuk</th>
                        <th class="py-2 px-2 text-right">Keluar</th>
                        <th class="py-2 px-2 text-right">Saldo</th>
                        <th class="py-2 px-2">Ref</th>
                    </tr>
                </thead>
                <tbody>
                    <tr class="bg-orange-50/50 text-[10px] font-bold italic text-gray-500">
                        <td colspan="5" class="py-1 px-2">SALDO AWAL PERIODE</td>
                        <td class="py-1 px-2 text-right">${invFmt(openingStock)}</td>
                        <td></td>
                    </tr>
                    ${itemRows || '<tr><td colspan="7" class="py-10 text-center text-gray-300 italic">Tidak ada mutasi di periode ini</td></tr>'}
                </tbody>
            </table>
        </div>
    </div>`;

    const footer = `
        <button onclick="printProductStockCard('${productId}', '${monthStr}')" class="bg-gray-800 text-white px-4 py-2 rounded-lg text-xs font-bold hover:bg-black transition-all flex items-center gap-2">
            <i class="fas fa-print"></i> Cetak Kartu Stok
        </button>
        <button onclick="closeModal()" class="px-4 py-2 text-xs font-bold text-gray-500 hover:bg-gray-100 rounded-lg">Tutup</button>
    `;

    showModal(`Kartu Stok — ${item.itemName}`, body, footer, 'max-w-3xl');
};

window.printProductStockCard = (productId, monthStr) => {
    const item = db.findById('inventoryItems', productId);
    if (!item) return;

    const [year, month] = monthStr.split('-').map(Number);
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0, 23, 59, 59);

    const allTxs = db.read('stockTransactions');
    const openingTxs = allTxs.filter(t => t.itemId === productId && new Date(t.date) < startDate);
    const openingStock = openingTxs.reduce((sum, t) => sum + (t.type === 'IN' ? t.qty : -t.qty), 0);

    const monthTxs = allTxs.filter(t => t.itemId === productId && new Date(t.date) >= startDate && new Date(t.date) <= endDate)
        .sort((a, b) => new Date(a.date) - new Date(b.date));

    let balance = openingStock;
    const rows = monthTxs.map(t => {
        const qtyIn = t.type === 'IN' ? t.qty : 0;
        const qtyOut = t.type === 'OUT' ? t.qty : 0;
        balance += qtyIn - qtyOut;
        return `
            <tr>
                <td style="border:1px solid #ddd;padding:8px;text-align:center;">${invDate(t.date)}</td>
                <td style="border:1px solid #ddd;padding:8px;">${t.txNo}</td>
                <td style="border:1px solid #ddd;padding:8px;">${t.itemName}</td>
                <td style="border:1px solid #ddd;padding:8px;text-align:right;">${qtyIn > 0 ? invFmt(qtyIn) : '-'}</td>
                <td style="border:1px solid #ddd;padding:8px;text-align:right;">${qtyOut > 0 ? invFmt(qtyOut) : '-'}</td>
                <td style="border:1px solid #ddd;padding:8px;text-align:right;font-weight:bold;">${invFmt(balance)}</td>
                <td style="border:1px solid #ddd;padding:8px;text-align:center;">${t.reference}</td>
            </tr>`;
    }).join('');

    const printHtml = `
    <html>
    <head>
        <title>Kartu Stok - ${item.itemName}</title>
        <style>
            body { font-family: sans-serif; font-size: 12px; margin: 40px; }
            .header { text-align: center; margin-bottom: 30px; border-bottom: 2px solid #333; padding-bottom: 10px; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            th { background: #f2f2f2; border: 1px solid #ddd; padding: 10px; text-align: left; }
            td { border: 1px solid #ddd; padding: 8px; }
            .meta { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 20px; }
            .meta-box { background: #f9f9f9; padding: 10px; border: 1px solid #eee; border-radius: 5px; }
        </style>
    </head>
    <body onload="window.print()">
        <div class="header">
            <h1 style="margin:0;font-size:20px;">KARTU STOK PERSEDIAAN</h1>
            <p style="margin:5px 0;color:#666;">${CONFIG.companyName}</p>
        </div>
        <div class="meta">
            <div class="meta-box">
                <strong>Nama Barang:</strong> ${item.itemName}<br>
                <strong>Kode Barang:</strong> ${item.itemCode || '-'}<br>
                <strong>Kategori:</strong> ${item.category}
            </div>
            <div class="meta-box">
                <strong>Periode:</strong> ${monthStr}<br>
                <strong>Satuan:</strong> ${item.unit}<br>
                <strong>Saldo Awal:</strong> ${invFmt(openingStock)}
            </div>
        </div>
        <table>
            <thead>
                <tr>
                    <th>Tanggal</th>
                    <th>No. Bukti</th>
                    <th>Keterangan</th>
                    <th style="text-align:right;">Masuk</th>
                    <th style="text-align:right;">Keluar</th>
                    <th style="text-align:right;">Saldo</th>
                    <th>Keterangan</th>
                </tr>
            </thead>
            <tbody>
                <tr>
                    <td colspan="5" style="background:#fefce8;font-weight:bold;font-style:italic;">SALDO AWAL PERIODE</td>
                    <td style="background:#fefce8;text-align:right;font-weight:bold;">${invFmt(openingStock)}</td>
                    <td style="background:#fefce8;"></td>
                </tr>
                 ${rows || '<tr><td colspan="7" style="text-align:center;padding:40px;color:#999;">Tidak ada transaksi</td></tr>'}
            </tbody>
        </table>
        <div style="margin-top:50px;text-align:right;">
            <p>Dicetak pada: ${new Date().toLocaleString()}</p>
        </div>
    </body>
    </html>`;

    const win = window.open('', '_blank');
    win.document.write(printHtml);
    win.document.close();
};

// inventoryViews removed - using the centralized router in app.js

// ─── 5. STOK WIP & HISTORY (PRODUCTION SPECIFIC) ──────────────
window.renderProductionWIPStock = function() {
    document.getElementById('pageTitle').innerText = 'Stok WIP & History Tracking';
    const mc = document.getElementById('main-content');
    
    if (!window.currentWIPMutationCategory) window.currentWIPMutationCategory = 'MIXING';
    const now = new Date();
    const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

    mc.innerHTML = `
    <div class="animate-in fade-in duration-300">
        <!-- Month Filter -->
        <!-- Month Filter -->
        <div class="bg-white rounded-xl shadow-sm border border-slate-100 p-5 mb-5">
            <h3 class="text-sm font-black text-slate-800 uppercase tracking-widest mb-4 flex items-center gap-3"><i class="fas fa-filter text-blue-500"></i> FILTER PENCARIAN</h3>
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 items-end mb-4">
                <div>
                    <label class="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Pilih Bulan Mutasi</label>
                    <input type="month" id="wip_msr_month" value="${currentMonth}" class="w-full border-2 border-slate-200 rounded-lg px-3 py-2 text-sm bg-white font-bold text-slate-700 focus:border-blue-500 outline-none transition-all">
                </div>
            </div>
            <div class="flex gap-2">
                <button onclick="runWIPMutationReport()" class="bg-blue-600 hover:bg-blue-700 text-white px-8 py-2 rounded-lg text-xs font-black uppercase tracking-widest transition-all shadow-sm">
                    <i class="fas fa-search mr-2"></i> TAMPILKAN
                </button>
            </div>
        </div>

        <!-- Tabs & Table -->
        <div class="bg-white rounded-xl shadow-sm border border-gray-100 mb-5 overflow-hidden">
            <!-- Tabs Nav -->
            <div class="border-b border-gray-100 bg-gray-50/30">
                <nav class="flex overflow-x-auto no-scrollbar">
                    ${[
                        ['MIXING', 'Mixing'],
                        ['OVEN_BASAH', 'Oven Basah']
                    ].map(([loc, label]) =>
                        `<button onclick="switchWIPMutationTab('${loc}')" id="wip_tab_${loc}" 
                                 class="whitespace-nowrap py-4 px-6 font-bold text-xs uppercase tracking-wider border-b-2 transition-all 
                                 ${(window.currentWIPMutationCategory === loc) ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-400 hover:text-gray-600'}">${label}</button>`
                    ).join('')}
                </nav>
            </div>
            
            <!-- Table Output -->
            <div id="wip_mutation_report_output">
                <div class="py-20 text-center text-gray-300 italic"><i class="fas fa-spinner fa-spin mr-2"></i>Loading data...</div>
            </div>
        </div>
    </div>`;

    setTimeout(() => { if (window.runWIPMutationReport) window.runWIPMutationReport(); }, 50);
}

window.switchWIPMutationTab = (loc) => {
    window.currentWIPMutationCategory = loc;
    document.querySelectorAll('[id^="wip_tab_"]').forEach(btn => {
        btn.classList.remove('border-blue-600', 'text-blue-600');
        btn.classList.add('border-transparent', 'text-gray-400', 'hover:text-gray-600');
    });
    const active = document.getElementById(`wip_tab_${loc}`);
    if (active) {
        active.classList.add('border-blue-600', 'text-blue-600');
        active.classList.remove('border-transparent', 'text-gray-400', 'hover:text-gray-600');
    }
    window.runWIPMutationReport();
};

window.runWIPMutationReport = () => {
    try {
        const monthVal = document.getElementById('wip_msr_month')?.value;
        const output = document.getElementById('wip_mutation_report_output');
        if (!monthVal || !output) return;

        const [year, month] = monthVal.split('-').map(Number);
        const startDate = new Date(year, month - 1, 1);
        const endDate = new Date(year, month, 0, 23, 59, 59);
        const loc = window.currentWIPMutationCategory || 'MIXING';

        const items = db.read('inventoryItems') || [];
        const allTxs = db.read('stockTransactions') || [];

        const reportData = items.map(it => {
            const locTxs = allTxs.filter(t => t.itemId === it.id && t.location === loc);
            const openingStock = locTxs.filter(t => new Date(t.date) < startDate).reduce((sum, t) => sum + (t.type === 'IN' ? t.qty : -t.qty), 0);
            const monthTxs = locTxs.filter(t => new Date(t.date) >= startDate && new Date(t.date) <= endDate);
            const totalIn = monthTxs.filter(t => t.type === 'IN').reduce((sum, t) => sum + t.qty, 0);
            const totalOut = monthTxs.filter(t => t.type === 'OUT').reduce((sum, t) => sum + t.qty, 0);
            const closingStock = openingStock + totalIn - totalOut;

            return { ...it, openingStock, totalIn, totalOut, closingStock, loc };
        }).filter(it => it.openingStock !== 0 || it.totalIn !== 0 || it.totalOut !== 0);

        const rows = reportData.length ? reportData.map(s => `
            <tr class="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                <td class="py-3 px-4 text-xs font-mono text-gray-400">${s.itemCode}</td>
                <td class="py-3 px-4 text-sm font-bold text-gray-800">${s.itemName}</td>
                <td class="py-3 px-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">${s.unit}</td>
                <td class="py-3 px-4 text-sm text-right font-medium text-gray-500 bg-gray-50/30">${invFmt(s.openingStock)}</td>
                <td class="py-3 px-4 text-sm text-right font-bold text-green-600">+${invFmt(s.totalIn)}</td>
                <td class="py-3 px-4 text-sm text-right font-bold text-red-600">-${invFmt(s.totalOut)}</td>
                <td class="py-3 px-4 text-sm text-right font-black text-blue-700 bg-blue-50/10">${invFmt(s.closingStock)}</td>
                <td class="py-3 px-4 text-right">
                    <button onclick="openWIPHistoryModal('${s.id}', '${loc}')" class="text-blue-600 hover:text-blue-800 text-xs font-bold bg-blue-50 px-3 py-1.5 rounded transition-all shadow-sm">
                        <i class="fas fa-eye mr-1"></i> Kartu
                    </button>
                </td>
            </tr>
        `).join('') : `<tr><td colspan="8" class="py-20 text-center text-gray-400 italic text-sm">
            <i class="fas fa-folder-open text-3xl mb-3 opacity-20"></i><br>
            Tidak ada pergerakan stok di lokasi "${loc}" pada periode ini.
        </td></tr>`;

        output.innerHTML = `
            <div class="overflow-x-auto">
                <table class="w-full text-left">
                    <thead class="bg-gray-100/50 border-b border-gray-200">
                        <tr>
                            <th class="py-3 px-4 text-[10px] font-bold text-gray-400 uppercase tracking-wider">Kode</th>
                            <th class="py-3 px-4 text-[10px] font-bold text-gray-400 uppercase tracking-wider">Nama Item</th>
                            <th class="py-3 px-4 text-[10px] font-bold text-gray-400 uppercase tracking-wider">Unit</th>
                            <th class="py-3 px-4 text-[10px] font-bold text-gray-400 uppercase tracking-wider text-right">Stok Awal</th>
                            <th class="py-3 px-4 text-[10px] font-bold text-gray-400 uppercase tracking-wider text-right">Masuk (+)</th>
                            <th class="py-3 px-4 text-[10px] font-bold text-gray-400 uppercase tracking-wider text-right">Keluar (-)</th>
                            <th class="py-3 px-4 text-[10px] font-bold text-gray-400 uppercase tracking-wider text-right">Stok Akhir</th>
                            <th class="py-3 px-4 text-[10px] font-bold text-gray-400 uppercase tracking-wider text-right">Aksi</th>
                        </tr>
                    </thead>
                    <tbody class="divide-y divide-gray-100">${rows}</tbody>
                </table>
            </div>`;
    } catch (e) {
        console.error(e);
        const output = document.getElementById('wip_mutation_report_output');
        if (output) output.innerHTML = `<div class="py-20 text-center text-red-500 font-bold text-sm">Terjadi kesalahan saat memuat data.</div>`;
    }
};

function openWIPHistoryModal(itemId, location) {
    const item = db.findById('inventoryItems', itemId);
    if (!item) return;

    const allTxs = db.read('stockTransactions') || [];
    const txs = allTxs.filter(t => t.itemId === itemId && t.location === location)
                      .sort((a, b) => new Date(b.date) - new Date(a.date));

    const rows = txs.map(t => `
        <tr class="border-b border-gray-50 text-[11px]">
            <td class="py-2.5 px-2 text-gray-500">${new Date(t.date).toLocaleString('id-ID', {day:'2-digit', month:'2-digit', year:'numeric', hour:'2-digit', minute:'2-digit'})}</td>
            <td class="py-2.5 px-2">
                <span class="px-1.5 py-0.5 rounded text-[10px] font-bold ${t.type === 'IN' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}">
                    ${t.type === 'IN' ? 'IN' : 'OUT'}
                </span>
            </td>
            <td class="py-2.5 px-2 font-bold text-right ${t.type === 'IN' ? 'text-green-700' : 'text-red-700'}">
                ${t.type === 'IN' ? '+' : '-'}${invFmt(t.qty)}
            </td>
            <td class="py-2.5 px-2">
                <span class="font-medium text-gray-700 text-xs">${t.reference || '-'}</span>
                ${t.notes ? `<span class="text-gray-400 block text-[9px] italic">${t.notes}</span>` : ''}
            </td>
        </tr>
    `).join('');

    const body = `
        <div class="p-1">
            <div class="mb-4 bg-gray-50 p-3 rounded border border-gray-100 flex justify-between items-center">
                <div>
                    <h4 class="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-0.5">Item</h4>
                    <p class="text-sm font-bold text-gray-800">${item.itemName}</p>
                </div>
                <div class="text-right">
                    <h4 class="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-0.5">Lokasi</h4>
                    <p class="text-[11px] font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded border border-blue-100">${location}</p>
                </div>
            </div>
            <div class="max-h-[400px] overflow-y-auto border border-gray-200 rounded">
                <table class="w-full text-left">
                    <thead class="bg-gray-100 sticky top-0 shadow-sm">
                        <tr class="text-[10px] font-bold text-gray-400 uppercase tracking-widest border-b border-gray-200">
                            <th class="py-2 px-2">Waktu</th>
                            <th class="py-2 px-2">Tipe</th>
                            <th class="py-2 px-2 text-right">Qty</th>
                            <th class="py-2 px-2">Keterangan</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${rows || `<tr><td colspan="4" class="py-10 text-center text-gray-400 italic text-xs">Belum ada riwayat mutasi</td></tr>`}
                    </tbody>
                </table>
            </div>
        </div>
    `;

    showModal(`Kartu Stok WIP: ${location}`, body, `<button onclick="closeModal()" class="px-6 py-2 bg-gray-800 text-white rounded text-xs font-bold uppercase hover:bg-black transition-colors">Tutup</button>`);
}

// ─── 7. JUDGMENT / NG BARANG ──────────────────────────────────
window.renderInventoryJudgment = () => {
    const canEdit = getModulePermission('logistik').edit;
    document.getElementById('pageTitle').innerText = 'Judgment / Barang NG';
    const mc = document.getElementById('main-content');
    
    // Initialize & Persist Filters
    window._judgmentFilters = window._judgmentFilters || { start: '', end: '', status: '', itemName: '' };
    const f = window._judgmentFilters;

    let judgments = db.read('inventoryJudgments') || [];

    // Apply Filters
    if (f.start) {
        judgments = judgments.filter(j => j.date >= f.start);
    }
    if (f.end) {
        judgments = judgments.filter(j => j.date <= f.end);
    }
    if (f.status) {
        judgments = judgments.filter(j => j.status === f.status);
    }
    if (f.itemName) {
        const q = f.itemName.toLowerCase();
        judgments = judgments.filter(j => {
            const item = db.findById('inventoryItems', j.itemId);
            return item && (item.itemName.toLowerCase().includes(q) || item.itemCode.toLowerCase().includes(q));
        });
    }

    judgments.sort((a,b) => new Date(b.date) - new Date(a.date));

    // Options for Statuses
    const statusTypes = ['NG (NOT GOOD)', 'REJECTED', 'EXPIRED', 'WASTE', 'DAMAGE'];
    const statusOpts = statusTypes.map(s => `<option value="${s}" ${f.status === s ? 'selected' : ''}>${s}</option>`).join('');

    const rows = judgments.length ? judgments.map(j => {
        const item = db.findById('inventoryItems', j.itemId);
        return `<tr class="border-b border-gray-100 hover:bg-gray-50 transition-colors">
            <td class="py-3 px-4 text-xs font-mono font-medium text-gray-500">${j.date || '-'}</td>
            <td class="py-3 px-4 text-xs font-bold text-blue-600">${item ? item.itemCode : '-'}</td>
            <td class="py-3 px-4 text-sm font-medium text-gray-800">${item ? item.itemName : '-'}</td>
            <td class="py-3 px-4 text-xs font-bold text-gray-400 uppercase tracking-widest">${j.location || 'WHS'}</td>
            <td class="py-3 px-4 text-sm text-right font-black text-red-600">-${invFmt(j.qty)} <span class="text-[10px] font-normal text-gray-400 ml-1 uppercase">${item ? item.unit : '-'}</span></td>
            <td class="py-3 px-4 text-xs">
                <span class="px-2 py-0.5 bg-red-50 text-red-700 rounded text-[10px] font-bold uppercase tracking-wider ring-1 ring-red-100">${j.status || 'NG'}</span>
            </td>
            <td class="py-3 px-3 text-xs text-gray-500 font-medium">${j.notes || '-'}</td>
            <td class="py-3 px-4 text-xs text-right whitespace-nowrap">
                <button onclick="deleteInventoryJudgment('${j.id}')" class="text-gray-400 hover:text-red-600 transition-colors pointer-cursor p-1" title="Hapus"><i class="fas fa-trash-alt"></i></button>
            </td>
        </tr>`;
    }).join('') : `<tr><td colspan="8" class="py-12 text-center text-gray-400 italic">Belum ada data judgment sesuai kriteria filter.</td></tr>`;

    mc.innerHTML = `
    <div class="space-y-4">
        <!-- Standard Filter Bar -->
        <div class="bg-white p-5 rounded-xl shadow-sm border border-gray-100 flex flex-wrap gap-4 items-end">
            <div class="flex-1 min-w-[140px]">
                <label class="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5 ml-1">Dari Tanggal</label>
                <input type="date" id="jud_filter_start" value="${f.start}" class="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none">
            </div>
            <div class="flex-1 min-w-[140px]">
                <label class="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5 ml-1">Sampai Tanggal</label>
                <input type="date" id="jud_filter_end" value="${f.end}" class="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none">
            </div>
            <div class="w-48">
                <label class="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5 ml-1">Status NG</label>
                <select id="jud_filter_status" class="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:ring-2 focus:ring-blue-500 outline-none">
                    <option value="">-- Semua Status --</option>${statusOpts}
                </select>
            </div>
            <div class="flex-1 min-w-[200px]">
                <label class="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5 ml-1">Pencarian Barang</label>
                <input type="text" id="jud_filter_name" value="${f.itemName}" placeholder="Cari Nama/Kode Item..." 
                    class="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none">
            </div>
            <div class="flex gap-2">
                <button onclick="updateJudgmentFilters()" class="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg text-sm font-bold flex items-center gap-2 shadow-sm transition-all"><i class="fas fa-search"></i> Cari</button>
                <button onclick="resetJudgmentFilters()" class="bg-gray-100 hover:bg-gray-200 text-gray-600 px-4 py-2 rounded-lg text-sm font-bold transition-all">Reset</button>
            </div>
        </div>

        <div class="bg-white rounded-xl shadow-sm border border-gray-100 p-6 flex justify-between items-center transition-all">
            <div>
                <h2 class="text-xl font-black text-gray-800 uppercase tracking-tight flex items-center gap-2">
                    <i class="fas fa-exclamation-triangle text-red-500"></i> Log Barang NG / Judgment
                </h2>
                <p class="text-[11px] text-gray-400 font-bold uppercase tracking-wider mt-0.5">Daftar mutasi afkir & barang tidak layak pakai</p>
            </div>
            ${canEdit ? `
            <button onclick="openJudgmentModal()" class="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-lg text-sm font-bold flex items-center gap-2 shadow-sm transition-all active:scale-95">
                <i class="fas fa-plus"></i> Rekam Barang NG
            </button>` : ''}
        </div>

        <div class="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <div class="overflow-x-auto">
                <table class="w-full text-left border-collapse">
                    <thead class="bg-gray-50 text-gray-400 text-[10px] font-black uppercase tracking-widest">
                        <tr>
                            <th class="py-3 px-4 border-b border-gray-200">Tanggal</th>
                            <th class="py-3 px-4 border-b border-gray-200">ID Item</th>
                            <th class="py-3 px-4 border-b border-gray-200">Nama Produk AFKIR</th>
                            <th class="py-3 px-4 border-b border-gray-200">Gudang</th>
                            <th class="py-3 px-4 border-b border-gray-200 text-right">Kuantitas</th>
                            <th class="py-3 px-4 border-b border-gray-200">Status</th>
                            <th class="py-3 px-4 border-b border-gray-200">Keterangan</th>
                            <th class="py-3 px-4 border-b border-gray-200 text-right">Aksi</th>
                        </tr>
                    </thead>
                    <tbody class="text-sm font-sans divide-y divide-gray-100">${rows}</tbody>
                </table>
            </div>
        </div>
    </div>`;
};

window.updateJudgmentFilters = () => {
    window._judgmentFilters = {
        start: document.getElementById('jud_filter_start').value,
        end: document.getElementById('jud_filter_end').value,
        status: document.getElementById('jud_filter_status').value,
        itemName: document.getElementById('jud_filter_name').value.trim()
    };
    renderInventoryJudgment();
};

window.resetJudgmentFilters = () => {
    window._judgmentFilters = { start: '', end: '', status: '', itemName: '' };
    renderInventoryJudgment();
};

window.openJudgmentModal = () => {
    const items = db.read('inventoryItems').filter(i => i.status !== 'INACTIVE');
    const today = new Date().toISOString().split('T')[0];

    const modalHTML = `
    <div id="judgment-modal" class="fixed inset-0 bg-slate-800/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4 italic-none">
        <div class="bg-white rounded-xl shadow-xl w-full max-w-lg overflow-hidden animate-slide-up border border-gray-100">
            <div class="bg-white border-b border-gray-100 p-6 flex justify-between items-center">
                <div class="flex items-center gap-3">
                    <div class="w-10 h-10 bg-red-50 text-red-600 rounded-lg flex items-center justify-center border border-red-100">
                        <i class="fas fa-exclamation-triangle"></i>
                    </div>
                    <div>
                        <h3 class="text-base font-bold text-gray-800 uppercase tracking-tight">Record NG / Judgment</h3>
                        <p class="text-[11px] text-gray-400 font-medium uppercase tracking-wider">Mutasi Barang Rusak/Afkir</p>
                    </div>
                </div>
                <button onclick="closeModal('judgment-modal')" class="text-gray-400 hover:text-gray-600 transition-colors">
                    <i class="fas fa-times text-lg"></i>
                </button>
            </div>
            
            <form id="form-judgment" class="p-6 space-y-5">
                <div class="grid grid-cols-2 gap-4">
                    <div class="space-y-1">
                        <label class="block text-[11px] font-bold text-gray-500 uppercase tracking-wider ml-1">Tanggal</label>
                        <input type="date" name="date" value="${today}" class="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none bg-white">
                    </div>
                    <div class="space-y-1">
                        <label class="block text-[11px] font-bold text-gray-500 uppercase tracking-wider ml-1">Pilih Gudang/Tahap</label>
                        <select name="location" class="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none bg-white">
                            <option value="WHS">Gudang Utama (WHS)</option>
                            <option value="MIXING">Mixing</option>
                            <option value="OVEN_BASAH">Oven Basah</option>
                        </select>
                    </div>
                </div>

                <div class="space-y-1">
                    <label class="block text-[11px] font-bold text-gray-500 uppercase tracking-wider ml-1">Pilih Produk Ter-NG</label>
                    <select name="itemId" required class="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none bg-white">
                        <option value="">-- Cari Nama atau Kode Item --</option>
                        ${items.map(i => `<option value="${i.id}">[${i.itemCode}] ${i.itemName}</option>`).join('')}
                    </select>
                </div>

                <div class="grid grid-cols-2 gap-4">
                    <div class="space-y-1">
                        <label class="block text-[11px] font-bold text-gray-500 uppercase tracking-wider ml-1">Jumlah (Qty)</label>
                        <input type="number" name="qty" required step="any" placeholder="0.00" class="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none bg-white">
                    </div>
                    <div class="space-y-1">
                        <label class="block text-[11px] font-bold text-gray-500 uppercase tracking-wider ml-1">Kategori NG</label>
                        <select name="status" class="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none bg-white">
                            <option value="NG (NOT GOOD)">NG (NOT GOOD)</option>
                            <option value="REJECTED">REJECTED (AFKIR)</option>
                            <option value="EXPIRED">EXPIRED</option>
                            <option value="WASTE">WASTE (HASIL SISA)</option>
                            <option value="DAMAGE">DAMAGE (RUSAK FISIK)</option>
                        </select>
                    </div>
                </div>

                <div class="space-y-1">
                    <label class="block text-[11px] font-bold text-gray-500 uppercase tracking-wider ml-1">Keterangan / Alasan</label>
                    <textarea name="notes" rows="3" placeholder="Contoh: Tekstur tidak sesuai standar..." class="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none bg-white"></textarea>
                </div>

                <div class="pt-4 flex gap-3">
                    <button type="button" onclick="closeModal('judgment-modal')" class="flex-1 px-4 py-2.5 rounded-lg text-gray-600 font-bold uppercase tracking-wider text-xs border border-gray-300 hover:bg-gray-50 transition-colors">Batal</button>
                    <button type="submit" class="flex-[1.5] bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-lg font-bold uppercase tracking-wider text-xs shadow-sm transition-colors">
                        <i class="fas fa-save mr-2"></i> Simpan Data NG
                    </button>
                </div>
            </form>
        </div>
    </div>`;

    document.getElementById('modal-container').innerHTML = modalHTML;

    document.getElementById('form-judgment').onsubmit = (e) => {
        e.preventDefault();
        const fd = new FormData(e.target);
        const data = Object.fromEntries(fd.entries());
        data.qty = parseFloat(data.qty);

        // 1. Validate qty sufficiency
        const currentStock = db.getInventoryStock(data.itemId, data.location);
        if (currentStock < data.qty) {
            Swal.fire({
                title: 'Stok Tidak Cukup',
                text: `Kuantitas di ${data.location} hanya tersedia ${invFmt(currentStock)}. Harap periksa kembali stok fisik.`,
                icon: 'warning',
                confirmButtonColor: '#ef4444'
            });
            return;
        }

        // 2. Add to database table
        const res = db.insert('inventoryJudgments', {
            ...data,
            createdBy: window._session?.fullName || 'User'
        });

        // 3. Impact Stock: OUT transaction
        db.addInventoryTransaction(
            data.itemId, 
            'OUT', 
            data.qty, 
            'SHRINKAGE', 
            res.id, 
            `JUDGMENT [${data.status}]: ${data.notes}`, 
            window._session?.fullName || 'System',
            data.location
        );

        showToast('Judgment NG berhasil disimpan dan stok terpotong.', 'success');
        closeModal('judgment-modal');
        renderInventoryJudgment();
    };
};

window.deleteInventoryJudgment = (id) => {
    Swal.fire({
        title: 'Hapus Judgment?',
        text: 'Data akan dihapus dan stok akan ditarik balik (Adjust IN).',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#ef4444',
        cancelButtonColor: '#64748b',
        confirmButtonText: 'Ya, Hapus!',
        cancelButtonText: 'Batal'
    }).then((result) => {
        if (result.isConfirmed) {
            // Find the Tx to reverse
            const txs = db.read('stockTransactions');
            const idx = txs.findIndex(t => t.reference === 'SHRINKAGE' && t.referenceId === id);
            if (idx > -1) {
                txs.splice(idx, 1);
                db.save('stockTransactions', txs);
            }
            db.delete('inventoryJudgments', id);
            showToast('Data judgment dihapus.', 'success');
            renderInventoryJudgment();
        }
    });
};


