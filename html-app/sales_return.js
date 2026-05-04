// sales_return.js - Sales Return & Product Exchange Module

// ==========================================
// HELPER & SHARED
// ==========================================
function srFmt(n) { return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(n || 0); }
function srDate(d) { return d ? new Date(d).toLocaleDateString('id-ID') : '-'; }

function srStatusBadge(status) {
    const map = {
        'REQUESTED': 'bg-yellow-100 text-yellow-800',
        'APPROVED': 'bg-blue-100 text-blue-800',
        'GOODS_RECEIVED': 'bg-indigo-100 text-indigo-800',
        'RETURN_RECEIVED': 'bg-indigo-100 text-indigo-800',
        'REPLACEMENT_SENT': 'bg-purple-100 text-purple-800',
        'REFUNDED': 'bg-green-100 text-green-800',
        'COMPLETED': 'bg-gray-100 text-gray-700',
        'REJECTED': 'bg-red-100 text-red-800'
    };
    const labels = {
        'REQUESTED': 'Diminta', 'APPROVED': 'Disetujui',
        'GOODS_RECEIVED': 'Barang Diterima', 'RETURN_RECEIVED': 'Retur Diterima',
        'REPLACEMENT_SENT': 'Pengganti Dikirim', 'REFUNDED': 'Refund',
        'COMPLETED': 'Selesai', 'REJECTED': 'Ditolak'
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
window.renderSalesReturns = function () {
    document.getElementById('pageTitle').innerText = 'Retur Penjualan';
    const mc = document.getElementById('main-content');
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
        const dd = new Date(filters.start); dd.setHours(0,0,0,0);
        returns = returns.filter(q => new Date(q.date) >= dd);
    }
    if (filters.end) {
        const dd = new Date(filters.end); dd.setHours(23,59,59,999);
        returns = returns.filter(q => new Date(q.date) <= dd);
    }

    returns.sort((a, b) => new Date(b.date) - new Date(a.date));

    // 'pending' = REQUESTED, APPROVED, GOODS_RECEIVED
    // 'history' = REFUNDED, COMPLETED, REJECTED
    let filteredReturns = window._srActiveTab === 'pending'
        ? returns.filter(r => ['REQUESTED', 'APPROVED', 'GOODS_RECEIVED'].includes(r.status))
        : returns.filter(r => ['REFUNDED', 'COMPLETED', 'REJECTED'].includes(r.status));

    const rows = filteredReturns.map(r => {
        const customer = db.findById('customers', r.customerId);
        
        let actions = '';
        if (perm.edit) {
            if (r.status === 'REQUESTED') {
                actions += `<option value="approve">Setujui</option>`;
                actions += `<option value="reject">Tolak</option>`;
            }
            if (r.status === 'APPROVED') {
                actions += `<option value="receive">Terima Barang</option>`;
            }
            if (r.status === 'GOODS_RECEIVED') {
                actions += `<option value="refund">Proses Refund</option>`;
            }
        }
        
        const actionHtml = actions ? `
            <div class="inline-block relative w-full md:w-[130px]">
                <select class="w-full bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 font-bold text-xs rounded-xl pl-3 pr-8 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer appearance-none transition-all shadow-sm" onchange="handleSRAction(this, '${r.id}')">
                    <option value="" disabled selected>Pilih Aksi...</option>
                    ${actions}
                </select>
                <div class="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3 text-slate-400">
                    <i class="fas fa-chevron-down text-[10px]"></i>
                </div>
            </div>
        ` : '<span class="text-slate-300 font-bold text-xs">-</span>';

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
                <td class="px-6 py-4 text-right">${actionHtml}</td>
            </tr>
        `;
    }).join('');

    mc.innerHTML = `
        <div class="animate-in fade-in duration-500 space-y-5">
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

                        ${perm.edit ? `<button onclick="openSalesReturnModal()" class="h-[48px] px-6 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl text-[11px] font-black uppercase tracking-widest shadow-lg shadow-blue-500/30 transition-all flex items-center gap-2 active:scale-95"><i class="fas fa-plus"></i> Buat</button>` : ''}

                        <div class="flex bg-slate-100 p-1.5 rounded-2xl shadow-inner ml-2">
                            <button onclick="window._srActiveTab='pending'; renderSalesReturns()" 
                                class="px-6 py-2 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all ${window._srActiveTab === 'pending' ? 'bg-white text-blue-600 shadow-md transform scale-105 z-10' : 'text-slate-400 hover:text-slate-600'}">
                                Antrean
                            </button>
                            <button onclick="window._srActiveTab='history'; renderSalesReturns()" 
                                class="px-6 py-2 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all ${window._srActiveTab === 'history' ? 'bg-white text-blue-600 shadow-md transform scale-105 z-10' : 'text-slate-400 hover:text-slate-600'}">
                                Riwayat
                            </button>
                        </div>
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
    `;
};

window.handleSRAction = function(select, id) {
    const action = select.value;
    if (!action) return;
    if (action === 'approve') approveReturn(id, true);
    else if (action === 'reject') approveReturn(id, false);
    else if (action === 'receive') receiveReturnGoods(id);
    else if (action === 'refund') processReturnRefund(id);
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

window.openSalesReturnModal = function (soId = null) {
    const salesOrders = db.read('salesOrders').filter(s => ['CONFIRMED', 'DELIVERED'].includes(s.status));
    const customers = db.read('customers');

    const soOptions = salesOrders.map(so => {
        const cust = db.findById('customers', so.customerId);
        return `<option value="${so.id}" ${soId === so.id ? 'selected' : ''}>${so.soNumber} - ${cust?.name || ''}</option>`;
    }).join('');

    const body = `
        <div class="space-y-4">
            <div class="bg-blue-50 border border-blue-200 rounded-lg p-3 text-xs text-blue-700 flex items-center gap-2">
                <i class="fas fa-info-circle"></i>
                Pilih Sales Order untuk mengisi data produk secara otomatis.
            </div>
            <div class="grid grid-cols-2 gap-4">
                <div>
                    <label class="block text-xs font-bold text-gray-600 uppercase mb-1">Sales Order</label>
                    <select id="sr_so" class="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white focus:ring-2 focus:ring-blue-400" onchange="loadSOItemsForReturn()">
                        <option value="">-- Pilih Sales Order --</option>
                        ${soOptions}
                    </select>
                </div>
                <div>
                    <label class="block text-xs font-bold text-gray-600 uppercase mb-1">Produk yang Dikembalikan</label>
                    <select id="sr_product" class="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white focus:ring-2 focus:ring-blue-400">
                        <option value="">-- Pilih SO Dulu --</option>
                    </select>
                </div>
            </div>
            <div class="grid grid-cols-3 gap-4">
                <div>
                    <label class="block text-xs font-bold text-gray-600 uppercase mb-1">Qty Dikembalikan</label>
                    <input type="number" id="sr_qty" min="1" value="1" class="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-400">
                </div>
                <div>
                    <label class="block text-xs font-bold text-gray-600 uppercase mb-1">Kondisi Barang</label>
                    <select id="sr_condition" class="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white focus:ring-2 focus:ring-blue-400">
                        <option value="Good">Bagus / Good</option>
                        <option value="Damaged">Rusak / Damaged</option>
                    </select>
                </div>
                <div>
                    <label class="block text-xs font-bold text-gray-600 uppercase mb-1">Metode Refund</label>
                    <select id="sr_refund_method" class="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white focus:ring-2 focus:ring-blue-400">
                        <option value="Cash">Tunai (Cash)</option>
                        <option value="Bank">Transfer Bank</option>
                        <option value="StoreCredit">Store Credit (Nota)</option>
                    </select>
                </div>
            </div>
            <div>
                <label class="block text-xs font-bold text-gray-600 uppercase mb-1">Alasan Retur</label>
                <textarea id="sr_reason" rows="2" class="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-400" placeholder="Jelaskan alasan retur..."></textarea>
            </div>
            <div>
                <label class="block text-xs font-bold text-gray-600 uppercase mb-1">Catatan Tambahan</label>
                <input type="text" id="sr_notes" class="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-400" placeholder="Opsional...">
            </div>
        </div>
    `;

    const footer = `
        <button onclick="saveSalesReturn()" class="bg-blue-600 text-white px-6 py-2 rounded-lg text-sm font-bold hover:bg-blue-700 shadow-md">Simpan Retur</button>
        <button onclick="closeModal()" class="px-6 py-2 text-sm font-bold text-gray-500 hover:bg-gray-100 rounded-lg">Batal</button>
    `;
    showModal('Buat Sales Return Baru', body, footer, 'full');
    if (soId) { setTimeout(() => loadSOItemsForReturn(), 100); }
};

window.loadSOItemsForReturn = function () {
    const soId = document.getElementById('sr_so').value;
    const productSelect = document.getElementById('sr_product');
    if (!soId) { productSelect.innerHTML = '<option value="">-- Pilih SO Dulu --</option>'; return; }
    const so = db.findById('salesOrders', soId);
    if (!so || !so.items?.length) { productSelect.innerHTML = '<option value="">Tidak ada item</option>'; return; }
    productSelect.innerHTML = so.items.map(item => {
        // SO items use inventoryItemId + prodText (from addSOItemRow)
        const invItem = db.findById('inventoryItems', item.inventoryItemId);
        const displayName = item.prodText || invItem?.itemName || 'Produk';
        const price = item.price || item.unitPrice || 0;
        const invId = item.inventoryItemId || '';
        return `<option value="${invId}" data-name="${displayName}" data-price="${price}">${displayName} - ${srFmt(price)}</option>`;
    }).join('');
};

window.saveSalesReturn = function () {
    const soId = document.getElementById('sr_so').value;
    const productSel = document.getElementById('sr_product');
    const qty = parseInt(document.getElementById('sr_qty').value) || 0;
    const condition = document.getElementById('sr_condition').value;
    const refundMethod = document.getElementById('sr_refund_method').value;
    const reason = document.getElementById('sr_reason').value.trim();
    const notes = document.getElementById('sr_notes').value.trim();

    if (!soId) { showToast('Pilih Sales Order terlebih dahulu.', 'error'); return; }
    if (qty <= 0) { showToast('Qty harus lebih dari 0.', 'error'); return; }

    const so = db.findById('salesOrders', soId);
    const productName = productSel.options[productSel.selectedIndex]?.dataset.name || 'Produk';
    const productId = productSel.value;
    const unitPrice = parseFloat(productSel.options[productSel.selectedIndex]?.dataset.price || 0);

    const ret = db.insert('salesReturns', {
        returnNumber: srGenerateNumber('RET'),
        date: new Date().toISOString(),
        soId, soNumber: so?.soNumber || '',
        customerId: so?.customerId || '',
        productId, productName,
        qtyReturned: qty,
        unitPrice,
        totalRefund: unitPrice * qty,
        condition,
        refundMethod,
        reason,
        notes,
        status: 'REQUESTED'
    });

    showToast(`Retur ${ret.returnNumber} berhasil dibuat. Menunggu persetujuan.`);
    closeModal();
    renderSalesReturns();
};

window.approveReturn = function (id, approved) {
    const ret = db.findById('salesReturns', id);
    if (!ret) return;
    if (approved) {
        db.update('salesReturns', id, { status: 'APPROVED' });
        showToast(`Retur ${ret.returnNumber} disetujui. Tim gudang akan menerima barang.`);
    } else {
        db.update('salesReturns', id, { status: 'REJECTED' });
        showToast(`Retur ${ret.returnNumber} ditolak.`, 'warning');
    }
    renderSalesReturns();
};

window.receiveReturnGoods = function (id) {
    const ret = db.findById('salesReturns', id);
    if (!ret) return;
    const conditionText = ret.condition === 'Good' ? 'Bagus' : 'Rusak';
    if (!confirm(`Konfirmasi penerimaan barang retur (${conditionText}) ${ret.returnNumber}?\n${ret.condition === 'Good' ? 'Stok akan bertambah.' : 'Masuk ke histori NG/Judgment.'}`)) return;

    if (ret.productId) {
        const invItem = db.findById('inventoryItems', ret.productId);
        if (invItem) {
            // Condition Logic
            if (ret.condition === 'Good') {
                // Add to sellable stock
                db.addInventoryTransaction(invItem.id, 'IN', ret.qtyReturned, 'SALES_RETURN', ret.id, `Retur Bagus ${ret.returnNumber}: ${invItem.itemName}`);
            } else {
                // Damaged -> Add to NG Story (not in main stock)
                db.insert('inventoryJudgments', {
                    date: new Date().toISOString().split('T')[0],
                    itemId: invItem.id,
                    qty: ret.qtyReturned,
                    location: 'WHS',
                    status: 'DAMAGE (RUSAK FISIK)',
                    notes: `Retur dari ${ret.returnNumber}: ${ret.reason || 'Barang Rusak'}`,
                    createdBy: 'Admin'
                });
                // Record as NG_IN for history card (ignores total available)
                db.addInventoryTransaction(invItem.id, 'NG_IN', ret.qtyReturned, 'SALES_RETURN', ret.id, `Retur Rusak (NG) ${ret.returnNumber}: ${invItem.itemName}`);
            }

            // Journal Entry
            if (typeof db.addJournalEntry === 'function') {
                const modalPrice = invItem.purchasePrice || 0;
                const totalModal = ret.qtyReturned * modalPrice;
                if (totalModal > 0) {
                    db.addJournalEntry({
                        description: `Penerimaan Barang Retur ${ret.returnNumber} [${conditionText}]`,
                        referenceType: 'RETURN', referenceId: ret.id,
                        items: [
                            { accountId: 'acc_inv_fg', debit: totalModal, credit: 0 },
                            { accountId: 'acc_cogs', debit: 0, credit: totalModal }
                        ]
                    });
                }
            }
        }
    }

    db.update('salesReturns', id, { status: 'GOODS_RECEIVED', receivedAt: new Date().toISOString() });
    showToast(`Barang retur (${conditionText}) diterima.`);
    renderSalesReturns();
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
window.renderProductExchanges = function () {
    document.getElementById('pageTitle').innerText = 'Tukar Guling Produk';
    const mc = document.getElementById('main-content');
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
        const dd = new Date(filters.start); dd.setHours(0,0,0,0);
        exchanges = exchanges.filter(ex => new Date(ex.date) >= dd);
    }
    if (filters.end) {
        const dd = new Date(filters.end); dd.setHours(23,59,59,999);
        exchanges = exchanges.filter(ex => new Date(ex.date) <= dd);
    }

    exchanges.sort((a, b) => new Date(b.date) - new Date(a.date));

    // 'pending' = REQUESTED, APPROVED, RETURN_RECEIVED
    // 'history' = REPLACEMENT_SENT, COMPLETED, REJECTED
    let filteredExchanges = window._exActiveTab === 'pending'
        ? exchanges.filter(ex => ['REQUESTED', 'APPROVED', 'RETURN_RECEIVED'].includes(ex.status))
        : exchanges.filter(ex => ['REPLACEMENT_SENT', 'COMPLETED', 'REJECTED'].includes(ex.status));

    const rows = filteredExchanges.map(ex => {
        const customer = db.findById('customers', ex.customerId);
        
        let actions = '';
        if (perm.edit) {
            if (ex.status === 'REQUESTED') {
                actions += `<option value="approve">Setujui</option>`;
                actions += `<option value="reject">Tolak</option>`;
            }
            if (ex.status === 'APPROVED') {
                actions += `<option value="receive">Terima Retur</option>`;
            }
            if (ex.status === 'RETURN_RECEIVED') {
                actions += `<option value="ship">Kirim Pengganti</option>`;
            }
        }
        
        const actionHtml = actions ? `
            <div class="inline-block relative w-full md:w-[130px]">
                <select class="w-full bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 font-bold text-xs rounded-xl pl-3 pr-8 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer appearance-none transition-all shadow-sm" onchange="handleEXAction(this, '${ex.id}')">
                    <option value="" disabled selected>Pilih Aksi...</option>
                    ${actions}
                </select>
                <div class="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3 text-slate-400">
                    <i class="fas fa-chevron-down text-[10px]"></i>
                </div>
            </div>
        ` : '<span class="text-slate-300 font-bold text-xs">-</span>';

        const diff = ex.priceDifference || 0;
        const diffDisplay = diff === 0 
            ? '<span class="text-slate-400 font-bold">Rp 0</span>' : diff > 0 
            ? `<span class="text-green-600 font-black">+${srFmt(diff)}</span>` 
            : `<span class="text-red-600 font-black">${srFmt(diff)}</span>`;

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
                <td class="px-6 py-4 text-center">
                    <div class="text-[10px] text-slate-400 font-black uppercase tracking-widest mb-1">Selisih Harga</div>
                    ${diffDisplay}
                </td>
                <td class="px-6 py-4 text-center">${srStatusBadge(ex.status)}</td>
                <td class="px-6 py-4 text-right">${actionHtml}</td>
            </tr>
        `;
    }).join('');

    mc.innerHTML = `
        <div class="animate-in fade-in duration-500 space-y-5">
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

                        ${perm.edit ? `<button onclick="openExchangeModal()" class="h-[48px] px-6 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl text-[11px] font-black uppercase tracking-widest shadow-lg shadow-blue-500/30 transition-all flex items-center gap-2 active:scale-95"><i class="fas fa-plus"></i> Buat</button>` : ''}

                        <div class="flex bg-slate-100 p-1.5 rounded-2xl shadow-inner ml-2">
                            <button onclick="window._exActiveTab='pending'; renderProductExchanges()" 
                                class="px-6 py-2 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all ${window._exActiveTab === 'pending' ? 'bg-white text-blue-600 shadow-md transform scale-105 z-10' : 'text-slate-400 hover:text-slate-600'}">
                                Antrean
                            </button>
                            <button onclick="window._exActiveTab='history'; renderProductExchanges()" 
                                class="px-6 py-2 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all ${window._exActiveTab === 'history' ? 'bg-white text-blue-600 shadow-md transform scale-105 z-10' : 'text-slate-400 hover:text-slate-600'}">
                                Riwayat
                            </button>
                        </div>
                    </div>
                </div>

                <div class="overflow-x-auto min-h-[400px]">
                    <table class="w-full text-left border-collapse">
                        <thead>
                            <tr class="bg-slate-50/30 text-slate-500 font-black uppercase text-[10px] tracking-[0.2em] border-b border-slate-100">
                                <th class="px-6 py-5">Tujuan / Ref Order</th>
                                <th class="px-6 py-5">Logistics Info</th>
                                <th class="px-6 py-5">Barang (Lama -> Baru)</th>
                                <th class="px-6 py-5 text-center">Selisih</th>
                                <th class="px-6 py-5 text-center">Status Barang</th>
                                <th class="px-6 py-5 text-right w-[180px]">Navigasi</th>
                            </tr>
                        </thead>
                        <tbody class="divide-y divide-slate-50">
                            ${rows || `<tr><td colspan="6" class="py-40 text-center text-slate-300 font-bold uppercase tracking-widest">Data tidak ditemukan.</td></tr>`}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    `;
};

window.handleEXAction = function(select, id) {
    const action = select.value;
    if (!action) return;
    if (action === 'approve') approveExchange(id, true);
    else if (action === 'reject') approveExchange(id, false);
    else if (action === 'receive') receiveExchangeReturn(id);
    else if (action === 'ship') shipExchangeReplacement(id);
    select.value = '';
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

window.openExchangeModal = function (soId = null) {
    const salesOrders = db.read('salesOrders').filter(s => ['CONFIRMED', 'DELIVERED'].includes(s.status));
    const inventoryItems = db.read('inventoryItems').filter(i => i.status === 'ACTIVE');

    const soOptions = salesOrders.map(so => {
        const cust = db.findById('customers', so.customerId);
        return `<option value="${so.id}" ${soId === so.id ? 'selected' : ''}>${so.soNumber} - ${cust?.name || ''}</option>`;
    }).join('');

    const invOptions = inventoryItems.map(i =>
        `<option value="${i.id}" data-price="${i.purchasePrice || 0}" data-name="${i.itemName || ''}">${i.itemName || i.itemCode || 'Item'} (Stok: ${db.getInventoryStock ? db.getInventoryStock(i.id) : (i.stock || 0)})</option>`
    ).join('');

    const body = `
        <div class="space-y-4">
            <div class="bg-blue-50 border border-blue-200 rounded-lg p-3 text-xs text-blue-700 flex items-center gap-2">
                <i class="fas fa-exchange-alt"></i>
                Pilih Sales Order lalu tentukan produk lama (yang dikembalikan) dan produk baru (pengganti).
            </div>
            <div class="grid grid-cols-2 gap-4">
                <div>
                    <label class="block text-xs font-bold text-gray-600 uppercase mb-1">Sales Order Asal</label>
                    <select id="ex_so" class="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white focus:ring-2 focus:ring-blue-400" onchange="loadSOItemsForExchange()">
                        <option value="">-- Pilih Sales Order --</option>
                        ${soOptions}
                    </select>
                </div>
                <div>
                    <label class="block text-xs font-bold text-gray-600 uppercase mb-1">Produk yang Dikembalikan</label>
                    <select id="ex_returned_product" class="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white focus:ring-2 focus:ring-blue-400">
                        <option value="">-- Pilih SO Dulu --</option>
                    </select>
                </div>
            </div>
            <div class="grid grid-cols-2 gap-4">
                <div>
                    <label class="block text-xs font-bold text-gray-600 uppercase mb-1">Kondisi Barang Retur</label>
                    <select id="ex_condition" class="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white focus:ring-2 focus:ring-blue-400">
                        <option value="Good">Bagus / Good (Masuk Stok)</option>
                        <option value="Damaged">Rusak / Damaged (NG / Judgment)</option>
                    </select>
                </div>
                <div>
                     <label class="block text-xs font-bold text-gray-600 uppercase mb-1">Alasan Penukaran</label>
                     <input type="text" id="ex_reason" class="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-400" placeholder="Alasan...">
                </div>
            </div>
            <div class="grid grid-cols-3 gap-4">
                <div>
                    <label class="block text-xs font-bold text-gray-600 uppercase mb-1">Qty Dikembalikan</label>
                    <input type="number" id="ex_returned_qty" min="1" value="1" class="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-400" onchange="calcExchangeDiff()">
                </div>
                <div>
                    <label class="block text-xs font-bold text-gray-600 uppercase mb-1">Produk Pengganti</label>
                    <select id="ex_replacement_product" class="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white focus:ring-2 focus:ring-blue-400" onchange="calcExchangeDiff()">
                        <option value="">-- Pilih Produk --</option>
                        ${invOptions}
                    </select>
                </div>
                <div>
                    <label class="block text-xs font-bold text-gray-600 uppercase mb-1">Qty Pengganti</label>
                    <input type="number" id="ex_replacement_qty" min="1" value="1" class="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-400" onchange="calcExchangeDiff()">
                </div>
            </div>
            <div id="ex_diff_display" class="hidden p-3 rounded-lg text-sm font-bold text-center"></div>
            <div>
                <label class="block text-xs font-bold text-gray-600 uppercase mb-1">Alasan Penukaran</label>
                <textarea id="ex_reason" rows="2" class="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-400" placeholder="Jelaskan alasan penukaran..."></textarea>
            </div>
        </div>
    `;
    const footer = `
        <button onclick="saveExchange()" class="bg-blue-600 text-white px-6 py-2 rounded-lg text-sm font-bold hover:bg-blue-700 shadow-md">Simpan Exchange</button>
        <button onclick="closeModal()" class="px-6 py-2 text-sm font-bold text-gray-500 hover:bg-gray-100 rounded-lg">Batal</button>
    `;
    showModal('Buat Product Exchange (Tukar Guling)', body, footer, 'full');
    if (soId) { setTimeout(() => loadSOItemsForExchange(), 100); }
};

window.loadSOItemsForExchange = function () {
    const soId = document.getElementById('ex_so').value;
    const productSelect = document.getElementById('ex_returned_product');
    if (!soId) { productSelect.innerHTML = '<option value="">-- Pilih SO Dulu --</option>'; return; }
    const so = db.findById('salesOrders', soId);
    if (!so?.items?.length) { productSelect.innerHTML = '<option value="">Tidak ada item</option>'; return; }
    productSelect.innerHTML = so.items.map(item => {
        const invItem = db.findById('inventoryItems', item.inventoryItemId);
        const displayName = item.prodText || invItem?.itemName || 'Produk';
        const price = item.price || item.unitPrice || 0;
        const invId = item.inventoryItemId || '';
        return `<option value="${invId}" data-name="${displayName}" data-price="${price}">${displayName} (Harga: ${srFmt(price)})</option>`;
    }).join('');
    calcExchangeDiff();
};

window.calcExchangeDiff = function () {
    const returnedSel = document.getElementById('ex_returned_product');
    const replacementSel = document.getElementById('ex_replacement_product');
    const retQty = parseInt(document.getElementById('ex_returned_qty').value) || 1;
    const repQty = parseInt(document.getElementById('ex_replacement_qty').value) || 1;
    const diffDisplay = document.getElementById('ex_diff_display');

    if (!returnedSel.value || !replacementSel.value) { diffDisplay.classList.add('hidden'); return; }

    const retPrice = parseFloat(returnedSel.options[returnedSel.selectedIndex]?.dataset.price || 0);
    const repPrice = parseFloat(replacementSel.options[replacementSel.selectedIndex]?.dataset.price || 0);
    const diff = (repPrice * repQty) - (retPrice * retQty);

    diffDisplay.classList.remove('hidden');
    if (diff > 0) {
        diffDisplay.className = 'p-3 rounded-lg text-sm font-bold text-center bg-blue-50 border border-blue-200 text-blue-700';
        diffDisplay.innerHTML = `<i class="fas fa-arrow-up mr-1"></i> Pelanggan perlu membayar selisih: <span class="text-lg">${srFmt(diff)}</span>`;
    } else if (diff < 0) {
        diffDisplay.className = 'p-3 rounded-lg text-sm font-bold text-center bg-blue-50 border border-blue-200 text-blue-700';
        diffDisplay.innerHTML = `<i class="fas fa-arrow-down mr-1"></i> Perusahaan mengembalikan selisih: <span class="text-lg">${srFmt(Math.abs(diff))}</span>`;
    } else {
        diffDisplay.className = 'p-3 rounded-lg text-sm font-bold text-center bg-green-50 border border-green-200 text-green-700';
        diffDisplay.innerHTML = `<i class="fas fa-check mr-1"></i> Tidak ada selisih harga.`;
    }
};

window.saveExchange = function () {
    const soId = document.getElementById('ex_so').value;
    const returnedSel = document.getElementById('ex_returned_product');
    const replacementSel = document.getElementById('ex_replacement_product');
    const retQty = parseInt(document.getElementById('ex_returned_qty').value) || 0;
    const repQty = parseInt(document.getElementById('ex_replacement_qty').value) || 0;
    const reason = document.getElementById('ex_reason').value.trim();

    if (!soId || !returnedSel.value || !replacementSel.value || retQty <= 0 || repQty <= 0) {
        showToast('Isi semua data yang diperlukan.', 'error'); return;
    }

    const so = db.findById('salesOrders', soId);
    const retPrice = parseFloat(returnedSel.options[returnedSel.selectedIndex]?.dataset.price || 0);
    const repPrice = parseFloat(replacementSel.options[replacementSel.selectedIndex]?.dataset.price || 0);
    const diff = (repPrice * repQty) - (retPrice * retQty);

    const ex = db.insert('productExchanges', {
        exchangeNumber: srGenerateNumber('EXC'),
        date: new Date().toISOString(),
        soId, soNumber: so?.soNumber || '',
        customerId: so?.customerId || '',
        returnedProductId: returnedSel.value,
        returnedProductName: returnedSel.options[returnedSel.selectedIndex]?.dataset.name || 'Produk',
        returnedQty: retQty, returnedPrice: retPrice,
        replacementProductId: replacementSel.value,
        replacementProductName: replacementSel.options[replacementSel.selectedIndex]?.text || 'Produk Baru',
        replacementQty: repQty, replacementPrice: repPrice,
        priceDifference: diff,
        condition: document.getElementById('ex_condition').value,
        reason, status: 'REQUESTED'
    });

    showToast(`Exchange ${ex.exchangeNumber} berhasil dibuat.`);
    closeModal();
    renderProductExchanges();
};

window.approveExchange = function (id, approved) {
    const ex = db.findById('productExchanges', id);
    if (!ex) return;
    db.update('productExchanges', id, { status: approved ? 'APPROVED' : 'REJECTED' });
    showToast(approved ? `Exchange ${ex.exchangeNumber} disetujui.` : `Exchange ${ex.exchangeNumber} ditolak.`, approved ? 'success' : 'warning');
    renderProductExchanges();
};

window.receiveExchangeReturn = function (id) {
    const ex = db.findById('productExchanges', id);
    if (!ex) return;
    const conditionText = ex.condition === 'Good' ? 'Bagus' : 'Rusak';
    if (!confirm(`Terima barang retur (${conditionText}) untuk Exchange ${ex.exchangeNumber}?\n${ex.condition === 'Good' ? 'Stok akan bertambah.' : 'Masuk ke histori NG/Judgment.'}`)) return;

    const returnedItem = db.findById('inventoryItems', ex.returnedProductId);
    if (returnedItem) {
        // Condition Logic
        if (ex.condition === 'Good') {
            // Ad to main stock (IN)
            db.addInventoryTransaction(returnedItem.id, 'IN', ex.returnedQty, 'EXCHANGE_RETURN', ex.id, `Tukar Guling ${ex.exchangeNumber}: ${returnedItem.itemName}`);
        } else {
            // Damaged -> Add to NG Story (not in main stock)
            db.insert('inventoryJudgments', {
                date: new Date().toISOString().split('T')[0],
                itemId: returnedItem.id,
                qty: ex.returnedQty,
                location: 'WHS',
                status: 'DAMAGE (RUSAK FISIK)',
                notes: `Retur dari ${ex.exchangeNumber}: ${ex.reason || 'Barang Rusak'}`,
                createdBy: 'Admin'
            });
            // Record as NG_IN for history card (ignores total available)
            db.addInventoryTransaction(returnedItem.id, 'NG_IN', ex.returnedQty, 'EXCHANGE_RETURN', ex.id, `Retur NG dari ${ex.exchangeNumber}: ${returnedItem.itemName}`);
        }

        // Journal Entry (same regardless of condition, but usually we return to inventory)
        if (typeof db.addJournalEntry === 'function') {
            const modalPrice = returnedItem.purchasePrice || 0;
            const totalModal = ex.returnedQty * modalPrice;
            if (totalModal > 0) {
                db.addJournalEntry({
                    description: `Retur Masuk Tukar Guling ${ex.exchangeNumber} [${conditionText}]`,
                    referenceType: 'PRODUCT_EXCHANGE', referenceId: ex.id,
                    items: [
                        { accountId: 'acc_inv_fg', debit: totalModal, credit: 0 },
                        { accountId: 'acc_cogs', debit: 0, credit: totalModal }
                    ]
                });
            }
        }
    }

    db.update('productExchanges', id, { status: 'RETURN_RECEIVED', returnReceivedAt: new Date().toISOString() });
    showToast(`Barang retur (${conditionText}) diterima.`);
    renderProductExchanges();
};

window.shipExchangeReplacement = function (id) {
    const ex = db.findById('productExchanges', id);
    if (!ex) return;
    if (!confirm(`Konfirmasi pengiriman produk pengganti "${ex.replacementProductName}"?\nStok akan berkurang ${ex.replacementQty} unit.`)) return;

    // Deduct replacement stock using central helper
    const repItem = db.findById('inventoryItems', ex.replacementProductId);
    if (repItem) {
        if (!db.validateInventoryStock(ex.replacementProductId, ex.replacementQty)) {
            showToast(`Stok "${ex.replacementProductName}" tidak mencukupi!`, 'error'); return;
        }

        db.addInventoryTransaction(
            repItem.id,
            'OUT',
            ex.replacementQty,
            'SALES_OUT',
            ex.id,
            `Kirim Pengganti Tukar Guling ${ex.exchangeNumber}: ${repItem.itemName}`
        );

        // Jurnal Keuangan: Debit HPP, Kredit Persediaan
        if (typeof db.addJournalEntry === 'function') {
            const modalPrice = repItem.purchasePrice || 0;
            const totalModal = ex.replacementQty * modalPrice;
            if (totalModal > 0) {
                db.addJournalEntry({
                    description: `HPP Pengiriman Ganti ${ex.exchangeNumber}`,
                    referenceType: 'PRODUCT_EXCHANGE',
                    referenceId: ex.id,
                    items: [
                        { accountId: 'acc_cogs', debit: totalModal, credit: 0 },
                        { accountId: 'acc_inv_fg', debit: 0, credit: totalModal }
                    ]
                });
            }
        }
    }

    // Handle price difference journal
    const diff = ex.priceDifference || 0;
    if (diff !== 0 && typeof db.addJournalEntry === 'function') {
        const absDiff = Math.abs(diff);
        if (diff > 0) {
            // Customer pays more -- revenue
            db.addJournalEntry({
                description: `Selisih Tukar Guling ${ex.exchangeNumber} (Customer Bayar)`,
                referenceId: ex.id, referenceType: 'PRODUCT_EXCHANGE',
                items: [
                    { accountId: 'acc_ar', debit: absDiff, credit: 0 },
                    { accountId: 'acc_sales', debit: 0, credit: absDiff }
                ]
            });
        } else {
            // Company refunds -- cost
            db.addJournalEntry({
                description: `Selisih Tukar Guling ${ex.exchangeNumber} (Perusahaan Kembalikan)`,
                referenceId: ex.id, referenceType: 'PRODUCT_EXCHANGE',
                items: [
                    { accountId: 'acc_sales_return', debit: absDiff, credit: 0 },
                    { accountId: 'acc_cash', debit: 0, credit: absDiff }
                ]
            });
        }
    }

    db.update('productExchanges', id, { status: 'COMPLETED', completedAt: new Date().toISOString() });
    showToast(`Exchange ${ex.exchangeNumber} selesai. ${diff !== 0 ? 'Jurnal selisih harga dibuat.' : ''}`);
    renderProductExchanges();
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


