// inventory.js - Inventory Module for NexERP

// ─── HELPERS ──────────────────────────────────────────────────
const CATEGORY_LABELS = { RAW_MATERIAL: 'Raw Material', WIP: 'WIP', FINISHED_GOODS: 'Finished Goods' };
const CATEGORY_COLORS = { RAW_MATERIAL: 'bg-yellow-100 text-yellow-800', WIP: 'bg-blue-100 text-blue-800', FINISHED_GOODS: 'bg-green-100 text-green-800' };
const REF_LABELS = { PO: 'Purchase Receipt', SO: 'Sales Delivery', PRODUCTION_IN: 'Hasil Produksi', PRODUCTION_OUT: 'Konsumsi Produksi', SHRINKAGE: 'Penyusutan/NG', MANUAL: 'Manual' };

function invFmt(n) { return new Intl.NumberFormat('id-ID', { maximumFractionDigits: 2 }).format(n || 0); }
function invDate(d) { return d ? new Date(d).toLocaleDateString('id-ID') : '-'; }

// ─── 1. MASTER ITEM ───────────────────────────────────────────
function renderInventoryMaster() {
    document.getElementById('pageTitle').innerText = 'Master Item';
    const mc = document.getElementById('main-content');
    const items = db.read('inventoryItems');

    const lowStockCount = items.filter(it => db.getInventoryStock(it.id) < it.minStock).length;

    const rows = items.length ? items.map(it => {
        const stock = db.getInventoryStock(it.id);
        const isLow = stock < it.minStock;
        const isActive = it.status !== 'INACTIVE';
        return `<tr class="border-b border-gray-100 hover:bg-gray-50 ${isLow ? 'bg-red-50/40' : ''}">
            <td class="py-3 px-4 text-sm font-mono font-medium text-gray-700">${it.itemCode}</td>
            <td class="py-3 px-4 text-sm font-medium text-gray-800">${it.itemName}${isLow ? ' <span class="ml-1 px-1.5 py-0.5 bg-red-100 text-red-700 rounded text-[10px] font-bold">LOW</span>' : ''}</td>
            <td class="py-3 px-4 text-sm"><span class="px-2 py-0.5 rounded text-xs font-semibold ${CATEGORY_COLORS[it.category] || 'bg-gray-100 text-gray-700'}">${CATEGORY_LABELS[it.category] || it.category}</span></td>
            <td class="py-3 px-4 text-sm text-gray-600">${it.unit}</td>
            <td class="py-3 px-4 text-sm text-right font-medium ${isLow ? 'text-red-600' : 'text-gray-800'}">${invFmt(stock)}</td>
            <td class="py-3 px-4 text-sm text-right text-gray-500">${invFmt(it.minStock)}</td>
            <td class="py-3 px-4 text-sm"><span class="px-2 py-0.5 rounded text-xs font-semibold ${isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}">${isActive ? 'Active' : 'Non-Active'}</span></td>
            <td class="py-3 px-4 text-sm text-right whitespace-nowrap">
                <button onclick="openInventoryItemModal('${it.id}')" class="text-blue-500 hover:text-blue-700 mr-2" title="Edit"><i class="fas fa-edit"></i></button>
                <button onclick="toggleInventoryItemStatus('${it.id}')" class="text-gray-400 hover:text-gray-600" title="${isActive ? 'Non-Aktifkan' : 'Aktifkan'}"><i class="fas fa-${isActive ? 'toggle-on text-green-500' : 'toggle-off'}"></i></button>
            </td>
        </tr>`;
    }).join('') : `<tr><td colspan="8" class="py-8 text-center text-gray-400">Belum ada item. Tambah item pertama.</td></tr>`;

    mc.innerHTML = `
    <div class="space-y-4">
        ${lowStockCount ? `<div class="flex items-center gap-3 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700"><i class="fas fa-exclamation-triangle"></i><span><strong>${lowStockCount} item</strong> di bawah minimum stok!</span></div>` : ''}
        <div class="bg-white rounded-lg shadow-sm border border-gray-100">
            <div class="flex justify-between items-center p-4 sm:p-6 border-b border-gray-100">
                <h2 class="text-lg font-semibold text-gray-800">Master Item Inventory</h2>
                <button onclick="openInventoryItemModal()" class="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm font-medium">
                    <i class="fas fa-plus mr-2"></i>Tambah Item
                </button>
            </div>
            <div class="overflow-x-auto">
                <table class="w-full text-left border-collapse">
                    <thead><tr class="bg-gray-50 border-b border-gray-200">
                        <th class="py-3 px-4 text-xs font-semibold text-gray-600 uppercase">Kode</th>
                        <th class="py-3 px-4 text-xs font-semibold text-gray-600 uppercase">Nama Item</th>
                        <th class="py-3 px-4 text-xs font-semibold text-gray-600 uppercase">Kategori</th>
                        <th class="py-3 px-4 text-xs font-semibold text-gray-600 uppercase">Satuan</th>
                        <th class="py-3 px-4 text-xs font-semibold text-gray-600 uppercase text-right">Stok Saat Ini</th>
                        <th class="py-3 px-4 text-xs font-semibold text-gray-600 uppercase text-right">Min. Stok</th>
                        <th class="py-3 px-4 text-xs font-semibold text-gray-600 uppercase">Status</th>
                        <th class="py-3 px-4 text-xs font-semibold text-gray-600 uppercase text-right">Aksi</th>
                    </tr></thead>
                    <tbody>${rows}</tbody>
                </table>
            </div>
        </div>
    </div>`;
}

window.openInventoryItemModal = (id = null) => {
    const item = id ? db.findById('inventoryItems', id) : null;
    const units = ['KG', 'GR', 'L', 'PCS', 'BOX', 'SAK', 'KARTON', 'LITER'];
    const unitOpts = units.map(u => `<option ${item?.unit === u ? 'selected' : ''}>${u}</option>`).join('');
    const cats = [['RAW_MATERIAL', 'Raw Material'], ['WIP', 'WIP (Setengah Jadi)'], ['FINISHED_GOODS', 'Finished Goods']];
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
            <div><label class="block text-sm font-medium text-gray-700 mb-1">Minimum Stok</label>
                <input type="number" id="inv_min_stock" value="${item?.minStock ?? 0}" min="0" class="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500"></div>
            <div><label class="block text-sm font-medium text-gray-700 mb-1">Status</label>
                <select id="inv_status" class="w-full border border-gray-300 rounded px-3 py-2 text-sm bg-white focus:ring-2 focus:ring-blue-500">
                    <option value="ACTIVE" ${(!item || item.status !== 'INACTIVE') ? 'selected' : ''}>Active</option>
                    <option value="INACTIVE" ${item?.status === 'INACTIVE' ? 'selected' : ''}>Non-Active</option>
                </select></div>
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
    if (!name || !category || !unit) { showToast('Nama, Kategori, dan Satuan wajib diisi', 'error'); return; }

    if (id) {
        db.update('inventoryItems', id, { itemName: name, category, unit, minStock, status });
        showToast('Item berhasil diperbarui');
    } else {
        const itemCode = db.generateItemCode(category);
        db.insert('inventoryItems', { itemCode, itemName: name, category, unit, minStock, status: 'ACTIVE' });
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
            <button onclick="openStockInModal()" class="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2">
                <i class="fas fa-plus"></i>Tambah Stock In
            </button>
        </div>
        <div class="p-4 border-b border-gray-100 flex flex-wrap gap-3 items-end">
            <div><label class="block text-xs font-medium text-gray-500 mb-1">Kategori</label>
                <select id="si_fcat" class="border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white">
                    <option value="">-- Semua Kategori --</option>
                    <option value="RAW_MATERIAL">Raw Material</option>
                    <option value="WIP">WIP</option>
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
            <button onclick="openStockOutModal()" class="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2">
                <i class="fas fa-plus"></i>Tambah Stock Out
            </button>
        </div>
        <div class="p-4 border-b border-gray-100 flex flex-wrap gap-3 items-end">
            <div><label class="block text-xs font-medium text-gray-500 mb-1">Kategori</label>
                <select id="sout_fcat" class="border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white">
                    <option value="">-- Semua Kategori --</option>
                    <option value="RAW_MATERIAL">Raw Material</option>
                    <option value="WIP">WIP</option>
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
        <div id="so_stock_info" class="hidden p-2 bg-blue-50 border border-blue-100 rounded text-sm text-blue-700"></div>
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

// ─── 4. PRODUCTION CONSUMPTION ────────────────────────────────
function renderInventoryProduction() {
    document.getElementById('pageTitle').innerText = 'Konsumsi Produksi';
    const mc = document.getElementById('main-content');

    const prodTxs = db.read('stockTransactions')
        .filter(t => ['PRODUCTION_IN', 'PRODUCTION_OUT', 'SHRINKAGE'].includes(t.reference))
        .sort((a, b) => new Date(b.date) - new Date(a.date));

    const grouped = {};
    prodTxs.forEach(t => {
        const key = t.referenceId || t.txNo;
        if (!grouped[key]) grouped[key] = [];
        grouped[key].push(t);
    });

    const rows = Object.entries(grouped).length ? Object.entries(grouped).map(([key, txList]) => {
        const date = invDate(txList[0].date);
        const ins = txList.filter(t => t.reference === 'PRODUCTION_IN');
        const outs = txList.filter(t => t.reference === 'PRODUCTION_OUT' || t.reference === 'SHRINKAGE');
        const isShrinkOnly = !ins.length;
        return `<tr class="border-b border-gray-100 hover:bg-gray-50 ${isShrinkOnly ? 'bg-orange-50/30' : ''}">
            <td class="py-3 px-4 text-sm text-gray-600">${date}</td>
            <td class="py-3 px-4 text-sm">${isShrinkOnly
                ? '<span class="px-2 py-0.5 rounded text-xs font-semibold bg-orange-100 text-orange-700">⚠ Penyusutan/NG</span>'
                : '<span class="px-2 py-0.5 rounded text-xs font-semibold bg-blue-100 text-blue-700">Produksi</span>'}
            </td>
            <td class="py-3 px-4 text-sm">
                ${outs.map(t => `<div class="text-xs text-red-600 font-medium">-${invFmt(t.qty)} ${t.itemName}</div>`).join('')}
            </td>
            <td class="py-3 px-4 text-sm">
                ${ins.length
                ? ins.map(t => `<div class="text-xs text-green-600 font-medium">+${invFmt(t.qty)} ${t.itemName}</div>`).join('')
                : '<span class="text-xs text-orange-500">— tidak ada (murni susut)</span>'}
            </td>
            <td class="py-3 px-4 text-sm text-gray-500 text-xs">${txList[0].notes || '-'}</td>
            <td class="py-3 px-4 text-sm text-gray-400 text-xs">${txList[0].createdBy}</td>
        </tr>`;
    }).join('') : `<tr><td colspan="6" class="py-8 text-center text-gray-400">Belum ada data konsumsi produksi</td></tr>`;

    mc.innerHTML = `
    <div class="space-y-4">
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div class="bg-blue-50 border border-blue-100 rounded-lg p-3 text-sm text-blue-700">
                <i class="fas fa-industry mr-2"></i><strong>Produksi Normal:</strong> RM keluar → FG masuk (dengan auto-hitung penyusutan)
            </div>
            <div class="bg-orange-50 border border-orange-100 rounded-lg p-3 text-sm text-orange-700">
                <i class="fas fa-exclamation-triangle mr-2"></i><strong>Penyusutan/NG:</strong> RM keluar saja — stok <em>hilang</em>, tidak masuk ke mana-mana
            </div>
        </div>
        <div class="bg-white rounded-lg shadow-sm border border-gray-100">
            <div class="flex justify-between items-center p-4 sm:p-6 border-b border-gray-100">
                <h2 class="text-lg font-semibold text-gray-800">Konsumsi Produksi</h2>
                <button onclick="openProductionConsumptionModal()" class="bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-md text-sm font-medium">
                    <i class="fas fa-plus mr-2"></i>Input Produksi / Penyusutan
                </button>
            </div>
            <div class="overflow-x-auto">
                <table class="w-full text-left border-collapse">
                    <thead><tr class="bg-gray-50 border-b border-gray-200">
                        <th class="py-3 px-4 text-xs font-semibold text-gray-600 uppercase">Tanggal</th>
                        <th class="py-3 px-4 text-xs font-semibold text-gray-600 uppercase">Tipe</th>
                        <th class="py-3 px-4 text-xs font-semibold text-gray-600 uppercase">Bahan Baku Keluar</th>
                        <th class="py-3 px-4 text-xs font-semibold text-gray-600 uppercase">Hasil / FG Masuk</th>
                        <th class="py-3 px-4 text-xs font-semibold text-gray-600 uppercase">Keterangan</th>
                        <th class="py-3 px-4 text-xs font-semibold text-gray-600 uppercase">User</th>
                    </tr></thead>
                    <tbody>${rows}</tbody>
                </table>
            </div>
        </div>
    </div>`;
}

window.openProductionConsumptionModal = () => {
    const todayStr = new Date().toISOString().split('T')[0];
    const rmOpts = getActiveItemOpts('RAW_MATERIAL');
    const fgOpts = getActiveItemOpts('FINISHED_GOODS');

    const body = `<div class="space-y-4">
        <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">Tipe Transaksi</label>
            <div class="grid grid-cols-2 gap-2">
                <button type="button" id="mode_prod" onclick="setProdMode('production')"
                    class="py-2 px-3 rounded-lg border-2 border-blue-500 bg-blue-50 text-blue-700 text-sm font-semibold text-center transition-all">
                    <i class="fas fa-industry mr-1"></i>Produksi Normal<br>
                    <span class="text-xs font-normal">RM keluar → FG masuk</span>
                </button>
                <button type="button" id="mode_shrink" onclick="setProdMode('shrinkage')"
                    class="py-2 px-3 rounded-lg border-2 border-gray-200 bg-gray-50 text-gray-500 text-sm font-semibold text-center transition-all">
                    <i class="fas fa-exclamation-triangle mr-1"></i>Penyusutan / NG<br>
                    <span class="text-xs font-normal">RM keluar saja (hilang)</span>
                </button>
            </div>
        </div>

        <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Tanggal Produksi</label>
            <input type="date" id="pc_date" value="${todayStr}" class="w-full border border-gray-300 rounded px-3 py-2 text-sm">
        </div>

        <div class="border border-red-100 rounded-lg p-4 bg-red-50/30">
            <h4 class="text-sm font-semibold text-red-700 mb-3">
                <i class="fas fa-arrow-up mr-1"></i>Bahan Baku / Raw Material (Stock OUT)
            </h4>
            <div id="pc_rm_list" class="space-y-2"></div>
            <button onclick="addRMRow()" class="mt-2 text-xs text-red-600 hover:text-red-800 border border-red-200 px-3 py-1 rounded">
                <i class="fas fa-plus mr-1"></i>Tambah Bahan Baku
            </button>
        </div>

        <div id="pc_fg_section" class="border border-green-100 rounded-lg p-4 bg-green-50/30">
            <h4 class="text-sm font-semibold text-green-700 mb-3">
                <i class="fas fa-arrow-down mr-1"></i>Hasil Produksi — Finished Goods (Stock IN)
            </h4>
            <div class="p-2 mb-3 bg-orange-50 border border-orange-100 rounded text-xs text-orange-700">
                <i class="fas fa-info-circle mr-1"></i>
                <strong>Penyusutan otomatis:</strong> Masukkan % susut → qty FG dihitung otomatis dari total RM dikurangi penyusutan.
            </div>
            <div class="grid grid-cols-3 gap-3 mb-3">
                <div class="col-span-2">
                    <label class="block text-xs text-gray-600 mb-1">Item Finished Goods <span class="text-red-500">*</span></label>
                    <select id="pc_fg_item" onchange="invUpdateUnit('pc_fg_item','pc_fg_unit_disp')" class="w-full border border-gray-300 rounded px-2 py-1.5 text-sm bg-white">${fgOpts}</select>
                </div>
                <div>
                    <label class="block text-xs text-gray-600 mb-1">% Penyusutan</label>
                    <div class="flex items-center gap-1">
                        <input type="number" id="pc_waste_pct" min="0" max="99" step="0.1" value="0"
                            oninput="invCalcFGQty()"
                            class="w-full border border-gray-300 rounded px-2 py-1.5 text-sm"> <span class="text-xs text-gray-400">%</span>
                    </div>
                </div>
            </div>
            <div class="grid grid-cols-3 gap-3">
                <div>
                    <label class="block text-xs text-gray-600 mb-1">Total RM (auto)</label>
                    <input type="text" id="pc_rm_total" readonly value="0" class="w-full border border-gray-200 rounded px-2 py-1.5 text-sm bg-gray-50 text-gray-500">
                </div>
                <div>
                    <label class="block text-xs text-gray-600 mb-1">Qty Susut (auto)</label>
                    <input type="text" id="pc_waste_qty" readonly value="0" class="w-full border border-orange-200 rounded px-2 py-1.5 text-sm bg-orange-50 text-orange-600">
                </div>
                <div>
                    <label class="block text-xs text-gray-600 mb-1">Qty FG <span class="text-red-500">*</span></label>
                    <input type="number" id="pc_fg_qty" min="0.01" step="0.01" placeholder="0"
                        class="w-full border border-green-300 rounded px-2 py-1.5 text-sm bg-green-50 font-semibold">
                </div>
            </div>
            <input type="text" id="pc_fg_unit_disp" readonly class="mt-2 w-24 border border-gray-200 rounded px-2 py-1 text-xs bg-gray-50 text-gray-400">
        </div>

        <div id="pc_shrink_notice" class="hidden border border-orange-200 rounded-lg p-3 bg-orange-50 text-sm text-orange-700">
            <i class="fas fa-exclamation-triangle mr-2"></i>
            <strong>Mode Penyusutan/NG:</strong> Stok Raw Material akan <strong>dikurangi</strong> dan <strong>tidak ada</strong> yang masuk ke Finished Goods. Ini untuk mencatat hilangnya bahan karena air menguap, NG, atau reject produksi.
        </div>

        <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Keterangan / Batch No.</label>
            <input type="text" id="pc_notes" placeholder="cth: Batch #001 — keripik singkong" class="w-full border border-gray-300 rounded px-3 py-2 text-sm">
        </div>
    </div>`;

    const footer = `
        <button onclick="saveProductionConsumption()" class="w-full sm:w-auto inline-flex justify-center rounded-md bg-orange-500 px-4 py-2 text-white text-sm font-medium hover:bg-orange-600 sm:ml-3">Simpan</button>
        <button onclick="closeModal()" class="mt-3 sm:mt-0 w-full sm:w-auto inline-flex justify-center rounded-md border border-gray-300 px-4 py-2 bg-white text-gray-700 text-sm font-medium sm:ml-3">Batal</button>`;

    window._prodMode = 'production';
    showModal('Input Konsumsi Produksi', body, footer);
    addRMRow();
};

window.setProdMode = (mode) => {
    window._prodMode = mode;
    const btnProd = document.getElementById('mode_prod');
    const btnShrink = document.getElementById('mode_shrink');
    const fgSection = document.getElementById('pc_fg_section');
    const shrinkNotice = document.getElementById('pc_shrink_notice');
    if (mode === 'production') {
        btnProd.className = 'py-2 px-3 rounded-lg border-2 border-blue-500 bg-blue-50 text-blue-700 text-sm font-semibold text-center transition-all';
        btnShrink.className = 'py-2 px-3 rounded-lg border-2 border-gray-200 bg-gray-50 text-gray-500 text-sm font-semibold text-center transition-all';
        fgSection.classList.remove('hidden');
        shrinkNotice.classList.add('hidden');
    } else {
        btnShrink.className = 'py-2 px-3 rounded-lg border-2 border-orange-400 bg-orange-50 text-orange-700 text-sm font-semibold text-center transition-all';
        btnProd.className = 'py-2 px-3 rounded-lg border-2 border-gray-200 bg-gray-50 text-gray-500 text-sm font-semibold text-center transition-all';
        fgSection.classList.add('hidden');
        shrinkNotice.classList.remove('hidden');
    }
};

window.invCalcFGQty = () => {
    // Recalculate RM total from all rows
    let total = 0;
    document.querySelectorAll('[id^="rm_qty_"]').forEach(inp => { total += parseFloat(inp.value) || 0; });
    const wastePct = parseFloat(document.getElementById('pc_waste_pct')?.value) || 0;
    const wasteQty = total * wastePct / 100;
    const fgQty = Math.max(0, total - wasteQty);
    const rmTotal = document.getElementById('pc_rm_total');
    const wasteQtyEl = document.getElementById('pc_waste_qty');
    const fgQtyEl = document.getElementById('pc_fg_qty');
    if (rmTotal) rmTotal.value = invFmt(total);
    if (wasteQtyEl) wasteQtyEl.value = invFmt(wasteQty);
    if (fgQtyEl && wastePct > 0) fgQtyEl.value = fgQty.toFixed(2);
};

window.addRMRow = () => {
    const rmOpts = getActiveItemOpts('RAW_MATERIAL') + getActiveItemOpts('WIP').replace('<option value="">-- Pilih Item --</option>', '');
    const rowId = Date.now();
    const container = document.getElementById('pc_rm_list');
    if (!container) return;
    const div = document.createElement('div');
    div.className = 'flex gap-2 items-center';
    div.id = `rm_row_${rowId}`;
    div.innerHTML = `
        <select id="rm_item_${rowId}" class="flex-1 border border-gray-300 rounded px-2 py-1.5 text-sm bg-white">${getActiveItemOpts('RAW_MATERIAL')}</select>
        <input type="number" id="rm_qty_${rowId}" min="0.01" step="0.01" placeholder="Qty"
            oninput="invCalcFGQty()"
            class="w-24 border border-gray-300 rounded px-2 py-1.5 text-sm">
        <button onclick="document.getElementById('rm_row_${rowId}').remove(); invCalcFGQty()" class="text-red-400 hover:text-red-600 px-1"><i class="fas fa-times"></i></button>`;
    container.appendChild(div);
};

window.saveProductionConsumption = () => {
    const mode = window._prodMode || 'production';
    const notes = document.getElementById('pc_notes').value.trim() || (mode === 'shrinkage' ? 'Penyusutan/NG' : 'Konsumsi Produksi');
    const batchId = 'PROD-' + Date.now().toString().slice(-6);

    // Collect RM rows
    const rmRows = document.querySelectorAll('[id^="rm_row_"]');
    const rmItems = [];
    let hasError = false;
    rmRows.forEach(row => {
        const rowId = row.id.replace('rm_row_', '');
        const itemId = document.getElementById(`rm_item_${rowId}`)?.value;
        const qty = parseFloat(document.getElementById(`rm_qty_${rowId}`)?.value);
        if (!itemId || !qty || qty <= 0) { hasError = true; return; }
        if (!db.validateInventoryStock(itemId, qty)) {
            const item = db.findById('inventoryItems', itemId);
            showToast(`Stok ${item?.itemName || 'item'} tidak mencukupi!`, 'error');
            hasError = true;
        }
        rmItems.push({ itemId, qty });
    });
    if (hasError) return;
    if (!rmItems.length) { showToast('Tambah minimal 1 bahan baku', 'error'); return; }

    if (mode === 'production') {
        // Normal production: RM OUT + FG IN
        const fgItemId = document.getElementById('pc_fg_item')?.value;
        const fgQty = parseFloat(document.getElementById('pc_fg_qty')?.value);
        if (!fgItemId || !fgQty || fgQty <= 0) { showToast('Pilih item FG dan isi qty yang dihasilkan', 'error'); return; }
        rmItems.forEach(({ itemId, qty }) => db.addInventoryTransaction(itemId, 'OUT', qty, 'PRODUCTION_OUT', batchId, notes));
        db.addInventoryTransaction(fgItemId, 'IN', fgQty, 'PRODUCTION_IN', batchId, notes);
        showToast('Produksi berhasil disimpan! RM berkurang, FG bertambah.', 'success');
    } else {
        // Shrinkage only: RM OUT, nothing IN
        rmItems.forEach(({ itemId, qty }) => db.addInventoryTransaction(itemId, 'OUT', qty, 'SHRINKAGE', batchId, notes));
        showToast('Penyusutan/NG dicatat. Stok RM berkurang, tidak ada FG yang masuk.', 'success');
    }

    closeModal();
    renderInventoryProduction();
};

// ─── 5. STOCK CARD / HISTORY ──────────────────────────────────
function renderInventoryCard() {
    document.getElementById('pageTitle').innerText = 'Kartu Stok';
    const mc = document.getElementById('main-content');

    mc.innerHTML = `
    <div class="space-y-4">
        <div class="bg-white rounded-lg shadow-sm border border-gray-100 p-4">
            <div class="flex flex-wrap gap-3 items-end">
                <div><label class="block text-xs font-medium text-gray-600 mb-1">Kategori</label>
                    <select id="card_item_filter" class="border border-gray-300 rounded px-3 py-2 text-sm bg-white min-w-[180px]">
                        <option value="">-- Semua Kategori --</option>
                        <option value="RAW_MATERIAL">Raw Material</option>
                        <option value="WIP">WIP (Setengah Jadi)</option>
                        <option value="FINISHED_GOODS">Finished Goods</option>
                    </select></div>
                <div><label class="block text-xs font-medium text-gray-600 mb-1">Dari</label>
                    <input type="date" id="card_from" class="border border-gray-300 rounded px-3 py-2 text-sm"></div>
                <div><label class="block text-xs font-medium text-gray-600 mb-1">Sampai</label>
                    <input type="date" id="card_to" class="border border-gray-300 rounded px-3 py-2 text-sm"></div>
                <button onclick="renderInventoryCardTable()" class="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded text-sm font-medium">
                    <i class="fas fa-search mr-2"></i>Tampilkan
                </button>
            </div>
        </div>
        <div id="card_table_area"></div>
    </div>`;
    renderInventoryCardTable();
}

window.renderInventoryCardTable = () => {
    const sel = document.getElementById('card_item_filter');
    const category = sel?.value;
    const fromDate = document.getElementById('card_from')?.value;
    const toDate = document.getElementById('card_to')?.value;

    const catLabels = { RAW_MATERIAL: 'Raw Material', WIP: 'WIP (Setengah Jadi)', FINISHED_GOODS: 'Finished Goods' };

    // Filter transaksi by kategori item
    let txs = db.read('stockTransactions');
    if (category) {
        const categoryItemIds = db.read('inventoryItems')
            .filter(i => i.category === category)
            .map(i => i.id);
        txs = txs.filter(t => categoryItemIds.includes(t.itemId));
    }
    if (fromDate) txs = txs.filter(t => t.date >= fromDate);
    if (toDate) txs = txs.filter(t => t.date.split('T')[0] <= toDate);
    txs = txs.sort((a, b) => new Date(a.date) - new Date(b.date));

    let balance = 0;
    const rows = txs.length ? txs.map(t => {
        const qtyIn = t.type === 'IN' ? t.qty : 0;
        const qtyOut = t.type === 'OUT' ? t.qty : 0;
        balance += qtyIn - qtyOut;
        return `<tr class="border-b border-gray-100 hover:bg-gray-50">
            <td class="py-2.5 px-4 text-sm text-gray-600">${invDate(t.date)}</td>
            <td class="py-2.5 px-4 text-sm font-mono ${t.type === 'IN' ? 'text-blue-600' : 'text-red-600'}">${t.txNo}</td>
            <td class="py-2.5 px-4 text-sm"><span class="px-2 py-0.5 rounded text-xs font-bold ${t.type === 'IN' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}">${t.type}</span></td>
            <td class="py-2.5 px-4 text-sm text-gray-700">${t.itemCode} — ${t.itemName}</td>
            <td class="py-2.5 px-4 text-sm text-right font-medium text-green-700">${qtyIn > 0 ? '+' + invFmt(qtyIn) : '-'}</td>
            <td class="py-2.5 px-4 text-sm text-right font-medium text-red-700">${qtyOut > 0 ? '-' + invFmt(qtyOut) : '-'}</td>
            <td class="py-2.5 px-4 text-sm text-right font-bold text-gray-800">${invFmt(balance)}</td>
            <td class="py-2.5 px-4 text-sm text-gray-400 text-xs">${REF_LABELS[t.reference] || t.reference}</td>
        </tr>`;
    }).join('') : `<tr><td colspan="8" class="py-8 text-center text-gray-400">Tidak ada data</td></tr>`;

    document.getElementById('card_table_area').innerHTML = `
    <div class="bg-white rounded-lg shadow-sm border border-gray-100">
        ${category ? `
        <div class="px-4 pt-4 pb-2 border-b border-gray-100 flex items-center gap-3">
            <span class="font-semibold text-gray-800">${catLabels[category] || category}</span>
            <span class="text-xs text-gray-400">${txs.length} transaksi</span>
        </div>` : ''}
        <div class="overflow-x-auto">
            <table class="w-full text-left border-collapse">
                <thead><tr class="bg-gray-50 border-b border-gray-200">
                    <th class="py-3 px-4 text-xs font-semibold text-gray-600 uppercase">Tanggal</th>
                    <th class="py-3 px-4 text-xs font-semibold text-gray-600 uppercase">No. Tx</th>
                    <th class="py-3 px-4 text-xs font-semibold text-gray-600 uppercase">Tipe</th>
                    <th class="py-3 px-4 text-xs font-semibold text-gray-600 uppercase">Item</th>
                    <th class="py-3 px-4 text-xs font-semibold text-gray-600 uppercase text-right">Qty Masuk</th>
                    <th class="py-3 px-4 text-xs font-semibold text-gray-600 uppercase text-right">Qty Keluar</th>
                    <th class="py-3 px-4 text-xs font-semibold text-gray-600 uppercase text-right">Balance</th>
                    <th class="py-3 px-4 text-xs font-semibold text-gray-600 uppercase">Referensi</th>
                </tr></thead>
                <tbody>${rows}</tbody>
            </table>
        </div>
    </div>`;
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
                <th class="py-3 px-4 text-xs font-semibold text-gray-600 uppercase">Satuan</th>
                <th class="py-3 px-4 text-xs font-semibold text-gray-600 uppercase text-right">Stok Saat Ini</th>
                <th class="py-3 px-4 text-xs font-semibold text-gray-600 uppercase text-right">Min. Stok</th>
                <th class="py-3 px-4 text-xs font-semibold text-gray-600 uppercase">Status Stok</th>
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
function renderInventoryDelivery() {
    document.getElementById('pageTitle').innerText = 'Surat Jalan / Pengiriman';
    const mc = document.getElementById('main-content');

    // Ambil SO yang statusnya CONFIRMED, DELIVERED, HOLD
    const sos = db.read('salesOrders')
        .filter(so => ['CONFIRMED', 'DELIVERED', 'HOLD'].includes(so.status))
        .sort((a, b) => new Date(b.date) - new Date(a.date));
    const customers = db.read('customers');

    const rows = sos.length ? sos.map(so => {
        const cust = customers.find(c => c.id === so.customerId) || { name: 'Unknown' };

        // Cek total qty item
        const totalQty = so.items.reduce((sum, item) => sum + (parseFloat(item.qty) || 0), 0);

        let statusBadge = '';
        if (so.status === 'CONFIRMED') statusBadge = '<span class="px-2 py-1 bg-yellow-100 text-yellow-700 rounded text-xs font-semibold">MENUNGGU KIRIM</span>';
        if (so.status === 'HOLD') statusBadge = '<span class="px-2 py-1 bg-red-100 text-red-700 rounded text-xs font-semibold">HOLD</span>';
        if (so.status === 'DELIVERED') statusBadge = '<span class="px-2 py-1 bg-green-100 text-green-700 rounded text-xs font-semibold">DELIVERED</span>';

        let actionHtml = `<button onclick="viewSODetailInv('${so.id}')" class="text-gray-500 hover:text-gray-700 mr-2" title="Detail SO"><i class="fas fa-eye"></i></button>`;

        if (so.status === 'CONFIRMED' || so.status === 'HOLD') {
            actionHtml += `<button onclick="processDelivery('${so.id}')" class="text-white hover:bg-blue-700 bg-blue-600 px-2 py-1 rounded text-xs shadow-sm mr-2" title="Proses Kirim"><i class="fas fa-truck mr-1"></i>Kirim</button>`;

            if (so.status === 'CONFIRMED') {
                actionHtml += `<button onclick="holdDelivery('${so.id}')" class="text-orange-600 hover:text-orange-800 border border-orange-200 bg-orange-50 px-2 py-1 rounded text-xs shadow-sm" title="Tahan Pengiriman"><i class="fas fa-hand-paper"></i> Hold</button>`;
            }
        }

        if (so.status === 'DELIVERED') {
            actionHtml += `<button onclick="printSuratJalan('${so.id}')" class="text-white hover:bg-purple-700 bg-purple-600 px-2 py-1 rounded text-xs shadow-sm" title="Cetak Surat Jalan"><i class="fas fa-print mr-1"></i>Cetak SJ</button>`;
        }

        return `
            <tr class="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                <td class="py-3 px-4 text-sm font-medium text-blue-600">${so.soNumber}</td>
                <td class="py-3 px-4 text-sm text-gray-800">${formatDate(so.date).split(' ')[0]}</td>
                <td class="py-3 px-4 text-sm text-gray-800">${cust.name}</td>
                <td class="py-3 px-4 text-sm text-gray-800 text-center">${invFmt(totalQty)} Item</td>
                <td class="py-3 px-4 text-sm text-center">${statusBadge}</td>
                <td class="py-3 px-4 text-sm text-right whitespace-nowrap">${actionHtml}</td>
            </tr>
        `;
    }).join('') : `<tr><td colspan="6" class="py-6 text-center text-gray-400 border-b border-gray-100">Belum ada SO yang siap dikirim.</td></tr>`;

    mc.innerHTML = `
        <div class="bg-white rounded-lg shadow-sm border border-gray-100 p-4 sm:p-6 mb-4">
            <h2 class="text-lg font-semibold text-gray-800 mb-1"><i class="fas fa-truck-loading text-blue-500 mr-2"></i>Pengiriman & Surat Jalan</h2>
            <p class="text-sm text-gray-500">Daftar Sales Order yang sudah disetujui Sales dan siap diproses kirim oleh Gudang.</p>
        </div>
        
        <div class="bg-white rounded-lg shadow-sm border border-gray-100">
            <div class="overflow-x-auto">
                <table class="w-full text-left border-collapse">
                    <thead>
                        <tr class="bg-gray-50 border-b border-gray-200">
                            <th class="py-3 px-4 text-xs font-semibold text-gray-600 uppercase tracking-wider">No. SO</th>
                            <th class="py-3 px-4 text-xs font-semibold text-gray-600 uppercase tracking-wider">Tanggal SO</th>
                            <th class="py-3 px-4 text-xs font-semibold text-gray-600 uppercase tracking-wider">Customer</th>
                            <th class="py-3 px-4 text-xs font-semibold text-gray-600 uppercase tracking-wider text-center">Total Item</th>
                            <th class="py-3 px-4 text-xs font-semibold text-gray-600 uppercase tracking-wider text-center">Status Gudang</th>
                            <th class="py-3 px-4 text-xs font-semibold text-gray-600 uppercase tracking-wider text-right">Aksi</th>
                        </tr>
                    </thead>
                    <tbody>${rows}</tbody>
                </table>
            </div>
        </div>
    `;
}

window.viewSODetailInv = (id) => {
    // Re-use viewSO logic from app.js, but read-only mode typically
    if (typeof viewSO === 'function') {
        viewSO(id); // Using the global app.js view
    }
};

window.holdDelivery = (id) => {
    const reason = prompt("Masukkan alasan pengiriman di-hold (misal: stok kurang, dll):");
    if (reason === null) return;
    const so = db.findById('salesOrders', id);
    if (so && typeof addNotification === 'function') {
        addNotification('Pengiriman Di-Hold', `SO ${so.soNumber} ditahan oleh Gudang. Alasan: ${reason}`);
    }
    showToast('SO di-hold.', 'warning');
    renderInventoryDelivery();
};

window.processDelivery = (id) => {
    const so = db.findById('salesOrders', id);
    if (!so) return;

    // Validation Step
    const stockErrors = [];
    so.items.forEach(item => {
        const invId = item.inventoryItemId || item.productId;
        if (invId) {
            const hasEnough = db.validateInventoryStock(invId, item.qty);
            if (!hasEnough) {
                const itemData = db.findById('inventoryItems', invId);
                const itemName = itemData ? itemData.itemName : item.prodText || item.description;
                const currentStk = db.getInventoryStock(invId);
                stockErrors.push(`Stok [${itemName}] kurang! Butuh: ${item.qty}, Tersedia: ${currentStk}`);
            }
        }
    });

    if (stockErrors.length > 0) {
        alert("GAGAL PROSES KIRIM:\n\n" + stockErrors.join("\n"));
        return;
    }

    if (!confirm(`Proses pengiriman untuk SO ${so.soNumber}?\nStok Finished Goods akan langsung dipotong dari Inventory.`)) return;

    const deliveryDate = new Date().toISOString();

    // Execution Step (Deduct Stock using Inventory Module)
    so.items.forEach(item => {
        const invId = item.inventoryItemId || item.productId;
        if (invId) {
            db.addInventoryTransaction(
                invId,
                'OUT',
                item.qty,
                'SALES_OUT',
                so.id,
                `Pengiriman Surat Jalan SO ${so.soNumber}: ${item.prodText || item.description || ''}`
            );
        }
    });

    db.update('salesOrders', so.id, {
        status: 'DELIVERED',
        deliveryDate: deliveryDate,
        deliveryDOIdentifier: 'DO-' + so.soNumber.substring(3)
    });

    if (typeof addNotification === 'function') {
        addNotification('Barang Terkirim', `SO ${so.soNumber} telah dikirim oleh Gudang dengan No. DO: DO-${so.soNumber.substring(3)}`);
    }

    showToast('Barang berhasil dikirim. Stok dikurangi.', 'success');
    renderInventoryDelivery();

    // Langsung buka modal cetak Surat Jalan
    setTimeout(() => printSuratJalan(id), 500);
};

window.printSuratJalan = (id) => {
    const so = db.findById('salesOrders', id);
    if (!so) return;
    const cust = db.findById('customers', so.customerId) || { name: 'Unknown', address: '-', phone: '-' };
    const doRef = so.deliveryDOIdentifier || ('DO-' + so.soNumber.substring(3));
    const delivDate = so.deliveryDate ? invDate(so.deliveryDate) : invDate(new Date());

    const itemRows = so.items.map((item, idx) => `
        <tr class="border-b border-gray-400">
            <td class="py-2 text-center">${idx + 1}</td>
            <td class="py-2 font-medium">${item.description}</td>
            <td class="py-2 text-center">${invFmt(item.qty)}</td>
            <td class="py-2 text-center">KG/PCS</td>
            <td class="py-2 text-center"></td>
        </tr>
    `).join('');

    const printableContent = `
        <div id="printArea" class="bg-white p-8 text-black" style="font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; color: #000;">
            <div class="flex justify-between items-start border-b-2 border-black pb-4 mb-6">
                <div>
                    <h1 class="text-3xl font-bold uppercase tracking-wider">Surat Jalan</h1>
                    <p class="text-sm mt-1">NO. DO : <strong>${doRef}</strong></p>
                    <p class="text-sm">Tanggal : ${delivDate}</p>
                    <p class="text-sm">Ref. SO : ${so.soNumber}</p>
                </div>
                <div class="text-right">
                    <h2 class="text-xl font-bold">PT Tana Subur Nusantara</h2>
                    <p class="text-sm">J8WR+3JQ, Jl. Akses Tol Karawang Tim.<br>Anggadita, Kec. Klari, Karawang<br>Jawa Barat 41371</p>
                </div>
            </div>

            <div class="mb-6 flex space-x-12">
                <div class="flex-1">
                    <p class="text-sm font-bold border-b border-gray-400 mb-2">Kepada Yth:</p>
                    <p class="font-bold text-lg">${cust.name}</p>
                    <p class="text-sm whitespace-pre-wrap">${cust.address || '-'}</p>
                    <p class="text-sm mt-1">Telp: ${cust.phone || '-'}</p>
                </div>
                <div class="flex-1">
                    <p class="text-sm font-bold border-b border-gray-400 mb-2">Instruksi Pengiriman:</p>
                    <p class="text-sm italic">${so.deliveryNotes || 'Mohon diterima dengan baik.'}</p>
                </div>
            </div>

            <table class="w-full text-left border-collapse mb-8 border border-black">
                <thead>
                    <tr class="border-b-2 border-black bg-gray-100">
                        <th class="py-2 px-2 text-center w-12 border-r border-black">No</th>
                        <th class="py-2 px-2 border-r border-black">Deskripsi Barang</th>
                        <th class="py-2 px-2 text-center w-24 border-r border-black">Qty</th>
                        <th class="py-2 px-2 text-center w-24 border-r border-black">Satuan</th>
                        <th class="py-2 px-2 text-center w-32">Keterangan</th>
                    </tr>
                </thead>
                <tbody class="border-b border-black">
                    ${itemRows}
                </tbody>
            </table>

            <p class="text-xs mb-8"><em>* Barang telah diterima dalam kondisi baik dan sesuai pesanan.</em></p>

            <div class="flex justify-between text-center mt-12 px-8">
                <div>
                    <p class="mb-16">Penerima,</p>
                    <p class="border-t border-black pt-1 w-40 mx-auto">( Tanda Tangan & Cap )</p>
                </div>
                <div>
                    <p class="mb-16">Pengemudi,</p>
                    <p class="border-t border-black pt-1 w-40 mx-auto">( Nama Jelas )</p>
                </div>
                <div>
                    <p class="mb-16">Hormat Kami,</p>
                    <p class="border-t border-black pt-1 w-40 mx-auto">Bag. Gudang</p>
                </div>
            </div>
            
            <style>
                @media print {
                    body * { visibility: hidden; }
                    #modal-container { visibility: visible; }
                    #printArea, #printArea * { visibility: visible; }
                    #printArea { position: fixed; left: 0; top: 0; width: 100%; height: 100vh; padding: 2cm; }
                    .no-print { display: none !important; }
                }
            </style>
        </div>
    `;

    const footer = `
        <button onclick="window.print()" class="no-print w-full sm:w-auto inline-flex justify-center rounded-md bg-purple-600 px-6 py-2 text-white text-sm font-bold hover:bg-purple-700 sm:ml-3 shadow-md">
            <i class="fas fa-print mr-2 mt-1"></i> Print Sekarang
        </button>
        <button onclick="closeModal()" class="no-print mt-3 sm:mt-0 w-full sm:w-auto inline-flex justify-center rounded-md border border-gray-300 px-4 py-2 bg-white text-gray-700 text-sm font-medium sm:ml-3 hover:bg-gray-50">Tutup</button>
    `;

    // Gunakan div container yang cukup besar untuk print area
    showModal('Cetak Surat Jalan', `<div class="overflow-x-auto print-container" style="max-height: 70vh;">${printableContent}</div>`, footer);
};

// ─── PENERIMAAN BARANG DARI PO ───────────────────────────────
function renderInventoryPOReceipt() {
    document.getElementById('pageTitle').innerText = 'Penerimaan Barang dari PO';
    const mc = document.getElementById('main-content');
    const pos = db.read('purchaseOrders').sort((a, b) => new Date(b.date) - new Date(a.date));
    const suppliers = db.read('suppliers');

    // Filter PO yang masih perlu diterima
    const pendingPOs = pos.filter(po => {
        if (['RECEIVED', 'CANCELLED', 'DRAFT'].includes(po.status)) return false;
        const hasUnreceived = (po.items || []).some(i => (i.receivedQty || 0) < i.qty);
        return hasUnreceived || po.status === 'APPROVED' || po.status === 'PARTIALLY RECEIVED';
    });

    const rows = pendingPOs.map(po => {
        const sup = suppliers.find(s => s.id === po.supplierId) || { name: '-' };
        const totalOrdered = (po.items || []).reduce((s, i) => s + i.qty, 0);
        const totalReceived = (po.items || []).reduce((s, i) => s + (i.receivedQty || 0), 0);
        const sisa = totalOrdered - totalReceived;
        const pct = totalOrdered > 0 ? Math.round((totalReceived / totalOrdered) * 100) : 0;

        let statusBadge = `<span class="px-2 py-0.5 rounded text-xs font-semibold bg-blue-100 text-blue-700">${po.status}</span>`;
        if (po.status === 'PARTIALLY RECEIVED') statusBadge = `<span class="px-2 py-0.5 rounded text-xs font-semibold bg-orange-100 text-orange-700">PARTIAL</span>`;

        return `<tr class="border-b border-gray-100 hover:bg-gray-50">
            <td class="py-3 px-4 text-sm font-medium text-blue-600">${po.poNumber}</td>
            <td class="py-3 px-4 text-sm text-gray-700">${invDate(po.date)}</td>
            <td class="py-3 px-4 text-sm text-gray-800">${sup.name}</td>
            <td class="py-3 px-4 text-sm">
                <div class="flex items-center gap-2">
                    <div class="flex-1 bg-gray-200 rounded-full h-1.5" style="min-width:60px">
                        <div class="bg-green-500 h-1.5 rounded-full" style="width:${pct}%"></div>
                    </div>
                    <span class="text-xs text-gray-600 whitespace-nowrap">${invFmt(totalReceived)}/${invFmt(totalOrdered)}</span>
                </div>
                <div class="text-xs text-orange-600 font-medium">Sisa: ${invFmt(sisa)}</div>
            </td>
            <td class="py-3 px-4 text-center">${statusBadge}</td>
            <td class="py-3 px-4 text-right">
                <button onclick="openPOReceiptModal('${po.id}')" class="text-white bg-green-600 hover:bg-green-700 text-xs px-3 py-1.5 rounded font-medium">
                    <i class="fas fa-truck-loading mr-1"></i>Terima Barang
                </button>
            </td>
        </tr>`;
    }).join('') || `<tr><td colspan="6" class="py-8 text-center text-gray-500">Tidak ada PO yang menunggu penerimaan barang.</td></tr>`;

    mc.innerHTML = `
        <div class="bg-white rounded-xl shadow-sm border border-gray-100">
            <div class="p-5 border-b border-gray-100 flex justify-between items-center">
                <div>
                    <h2 class="text-lg font-semibold text-gray-800">Penerimaan Barang dari PO</h2>
                    <p class="text-xs text-gray-500 mt-0.5">Daftar Purchase Order yang menunggu penerimaan fisik barang</p>
                </div>
                <span class="px-3 py-1 bg-orange-100 text-orange-700 rounded-full text-sm font-semibold">${pendingPOs.length} PO Pending</span>
            </div>
            <div class="overflow-x-auto">
                <table class="w-full text-left border-collapse">
                    <thead><tr class="bg-gray-50 border-b border-gray-200">
                        <th class="py-3 px-4 text-xs font-semibold text-gray-600 uppercase">No. PO</th>
                        <th class="py-3 px-4 text-xs font-semibold text-gray-600 uppercase">Tanggal</th>
                        <th class="py-3 px-4 text-xs font-semibold text-gray-600 uppercase">Supplier</th>
                        <th class="py-3 px-4 text-xs font-semibold text-gray-600 uppercase">Progress</th>
                        <th class="py-3 px-4 text-xs font-semibold text-gray-600 uppercase text-center">Status</th>
                        <th class="py-3 px-4 text-xs font-semibold text-gray-600 uppercase text-right">Aksi</th>
                    </tr></thead>
                    <tbody>${rows}</tbody>
                </table>
            </div>
        </div>`;
}

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

// Ekspor views untuk router di app.js
window.inventoryViews = {
    'inventory-master': renderInventoryMaster,
    'inventory-stock-in': renderInventoryStockIn,
    'inventory-stock-out': renderInventoryStockOut,
    'inventory-delivery': renderInventoryDelivery,
    'inventory-production': renderInventoryProduction,
    'inventory-card': renderInventoryCard,
    'inventory-report': renderInventoryReport,
    'inventory-po-receipt': renderInventoryPOReceipt
};


