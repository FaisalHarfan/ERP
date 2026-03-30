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
    const returns = db.read('salesReturns').sort((a, b) => new Date(b.date) - new Date(a.date));
    const perm = getModulePermission('penjualan');

    mc.innerHTML = `
        <div class="space-y-4">
            <!-- Header -->
            <div class="flex flex-wrap justify-between items-center bg-white p-4 rounded-xl shadow-sm border border-gray-100 gap-3">
                <div>
                    <h3 class="text-lg font-bold text-gray-800">Manajemen Retur Penjualan</h3>
                    <p class="text-xs text-gray-500">Kelola barang yang dikembalikan oleh pelanggan.</p>
                </div>
                ${perm.edit ? `<button onclick="openSalesReturnModal()" class="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg text-sm font-bold shadow-sm flex items-center gap-2"><i class="fas fa-plus"></i> Buat Retur Baru</button>` : ''}
            </div>

            <!-- Table -->
            <div class="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                <table class="w-full text-left border-collapse">
                    <thead class="bg-gray-50 text-slate-500 text-[11px] uppercase tracking-wider">
                        <tr>
                            <th class="px-4 py-3 border-b border-gray-100">No. Retur</th>
                            <th class="px-4 py-3 border-b border-gray-100">Tanggal</th>
                            <th class="px-4 py-3 border-b border-gray-100">Pelanggan</th>
                            <th class="px-4 py-3 border-b border-gray-100">Produk</th>
                            <th class="px-4 py-3 border-b border-gray-100 text-center">Qty</th>
                            <th class="px-4 py-3 border-b border-gray-100">Kondisi</th>
                            <th class="px-4 py-3 border-b border-gray-100">Status</th>
                            <th class="px-4 py-3 border-b border-gray-100 text-right">Aksi</th>
                        </tr>
                    </thead>
                    <tbody class="text-sm divide-y divide-gray-100">
                        ${returns.length === 0 ? '<tr><td colspan="8" class="px-6 py-12 text-center text-gray-400 italic">Belum ada data retur penjualan.</td></tr>' : ''}
                        ${returns.map(r => {
        const customer = db.findById('customers', r.customerId);
        let actions = '';
        if (perm.edit) {
            if (r.status === 'REQUESTED') {
                actions += `<button onclick="approveReturn('${r.id}', true)" class="text-green-600 hover:text-green-800 mr-2 font-bold text-xs border border-green-200 bg-green-50 px-2 py-1 rounded" title="Setujui">Setujui</button>`;
                actions += `<button onclick="approveReturn('${r.id}', false)" class="text-red-500 hover:text-red-700 font-bold text-xs border border-red-200 bg-red-50 px-2 py-1 rounded" title="Tolak">Tolak</button>`;
            }
            if (r.status === 'APPROVED') {
                actions += `<button onclick="receiveReturnGoods('${r.id}')" class="text-indigo-600 hover:text-indigo-800 font-bold text-xs border border-indigo-200 bg-indigo-50 px-2 py-1 rounded">Terima Barang</button>`;
            }
            if (r.status === 'GOODS_RECEIVED') {
                actions += `<button onclick="processReturnRefund('${r.id}')" class="text-purple-600 hover:text-purple-800 font-bold text-xs border border-purple-200 bg-purple-50 px-2 py-1 rounded">Proses Refund</button>`;
            }
        }
        return `
                                <tr class="hover:bg-gray-50/50 transition-colors">
                                    <td class="px-4 py-3 font-bold text-red-600">${r.returnNumber}</td>
                                    <td class="px-4 py-3 text-gray-600">${srDate(r.date)}</td>
                                    <td class="px-4 py-3 text-gray-800">${customer?.name || 'N/A'}</td>
                                    <td class="px-4 py-3 text-gray-700">${r.productName} <span class="text-xs text-gray-400">x${r.qtyReturned}</span></td>
                                    <td class="px-4 py-3 text-center font-bold">${r.qtyReturned}</td>
                                    <td class="px-4 py-3">
                                        ${r.condition === 'Good'
                ? '<span class="px-2 py-1 bg-green-100 text-green-700 rounded text-[10px] font-bold">Bagus</span>'
                : '<span class="px-2 py-1 bg-red-100 text-red-700 rounded text-[10px] font-bold">Rusak</span>'}
                                    </td>
                                    <td class="px-4 py-3">${srStatusBadge(r.status)}</td>
                                    <td class="px-4 py-3 text-right space-x-2">${actions || '-'}</td>
                                </tr>
                            `;
    }).join('')}
                    </tbody>
                </table>
            </div>
        </div>
    `;
};

window.openSalesReturnModal = function (soId = null) {
    const salesOrders = db.read('salesOrders').filter(s => ['CONFIRMED', 'DELIVERED'].includes(s.status));
    const customers = db.read('customers');

    const soOptions = salesOrders.map(so => {
        const cust = db.findById('customers', so.customerId);
        return `<option value="${so.id}" ${soId === so.id ? 'selected' : ''}>${so.soNumber} — ${cust?.name || ''}</option>`;
    }).join('');

    const body = `
        <div class="space-y-4">
            <div class="bg-red-50 border border-red-200 rounded-lg p-3 text-xs text-red-700 flex items-center gap-2">
                <i class="fas fa-info-circle"></i>
                Pilih Sales Order untuk mengisi data produk secara otomatis.
            </div>
            <div class="grid grid-cols-2 gap-4">
                <div>
                    <label class="block text-xs font-bold text-gray-600 uppercase mb-1">Sales Order</label>
                    <select id="sr_so" class="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white focus:ring-2 focus:ring-red-400" onchange="loadSOItemsForReturn()">
                        <option value="">-- Pilih Sales Order --</option>
                        ${soOptions}
                    </select>
                </div>
                <div>
                    <label class="block text-xs font-bold text-gray-600 uppercase mb-1">Produk yang Dikembalikan</label>
                    <select id="sr_product" class="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white focus:ring-2 focus:ring-red-400">
                        <option value="">-- Pilih SO Dulu --</option>
                    </select>
                </div>
            </div>
            <div class="grid grid-cols-3 gap-4">
                <div>
                    <label class="block text-xs font-bold text-gray-600 uppercase mb-1">Qty Dikembalikan</label>
                    <input type="number" id="sr_qty" min="1" value="1" class="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-red-400">
                </div>
                <div>
                    <label class="block text-xs font-bold text-gray-600 uppercase mb-1">Kondisi Barang</label>
                    <select id="sr_condition" class="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white focus:ring-2 focus:ring-red-400">
                        <option value="Good">Bagus / Good</option>
                        <option value="Damaged">Rusak / Damaged</option>
                    </select>
                </div>
                <div>
                    <label class="block text-xs font-bold text-gray-600 uppercase mb-1">Metode Refund</label>
                    <select id="sr_refund_method" class="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white focus:ring-2 focus:ring-red-400">
                        <option value="Cash">Tunai (Cash)</option>
                        <option value="Bank">Transfer Bank</option>
                        <option value="StoreCredit">Store Credit (Nota)</option>
                    </select>
                </div>
            </div>
            <div>
                <label class="block text-xs font-bold text-gray-600 uppercase mb-1">Alasan Retur</label>
                <textarea id="sr_reason" rows="2" class="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-red-400" placeholder="Jelaskan alasan retur..."></textarea>
            </div>
            <div>
                <label class="block text-xs font-bold text-gray-600 uppercase mb-1">Catatan Tambahan</label>
                <input type="text" id="sr_notes" class="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-red-400" placeholder="Opsional...">
            </div>
        </div>
    `;

    const footer = `
        <button onclick="saveSalesReturn()" class="bg-red-600 text-white px-6 py-2 rounded-lg text-sm font-bold hover:bg-red-700 shadow-md">Simpan Retur</button>
        <button onclick="closeModal()" class="px-6 py-2 text-sm font-bold text-gray-500 hover:bg-gray-100 rounded-lg">Batal</button>
    `;
    showModal('Buat Sales Return Baru', body, footer, 'max-w-2xl');
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
        return `<option value="${invId}" data-name="${displayName}" data-price="${price}">${displayName} — ${srFmt(price)}</option>`;
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
    if (!confirm(`Konfirmasi penerimaan barang retur ${ret.returnNumber}?\nBarang kondisi ${ret.condition === 'Good' ? '"Bagus" akan ditambah kembali ke stok' : '"Rusak" akan dicatat ke Damaged Stock'}.`)) return;

    // Update stock in Inventory using central helper
    if (ret.productId) {
        const invItem = db.findById('inventoryItems', ret.productId);
        if (invItem) {
            const conditionText = ret.condition === 'Good' ? 'Bagus' : 'Rusak';
            const type = ret.condition === 'Good' ? 'IN' : 'SHRINKAGE';

            db.addInventoryTransaction(
                invItem.id,
                type,
                ret.qtyReturned,
                'SALES_RETURN',
                ret.id,
                `Retur ${conditionText} ${ret.returnNumber}: ${invItem.itemName}`
            );

            // Jurnal Keuangan: Balik HPP (Debit Persediaan, Kredit HPP)
            if (ret.condition === 'Good' && typeof db.addJournalEntry === 'function') {
                const modalPrice = invItem.purchasePrice || 0;
                const totalModal = ret.qtyReturned * modalPrice;
                if (totalModal > 0) {
                    db.addJournalEntry({
                        description: `Penerimaan Barang Retur ${ret.returnNumber}`,
                        referenceType: 'RETURN',
                        referenceId: ret.id,
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
    showToast(`Barang retur ${ret.returnNumber} telah diterima dan stok diperbarui.`);
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
        // Cash or Bank refund — create journal entry
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
    const exchanges = db.read('productExchanges').sort((a, b) => new Date(b.date) - new Date(a.date));
    const perm = getModulePermission('penjualan');

    mc.innerHTML = `
        <div class="space-y-4">
            <div class="flex flex-wrap justify-between items-center bg-white p-4 rounded-xl shadow-sm border border-gray-100 gap-3">
                <div>
                    <h3 class="text-lg font-bold text-gray-800">Manajemen Tukar Guling Produk</h3>
                    <p class="text-xs text-gray-500">Penukaran produk dari pelanggan dengan produk pengganti.</p>
                </div>
                ${perm.edit ? `<button onclick="openExchangeModal()" class="bg-orange-600 hover:bg-orange-700 text-white px-4 py-2 rounded-lg text-sm font-bold shadow-sm flex items-center gap-2"><i class="fas fa-exchange-alt"></i> Buat Tukar Guling</button>` : ''}
            </div>

            <div class="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                <table class="w-full text-left border-collapse">
                    <thead class="bg-gray-50 text-slate-500 text-[11px] uppercase tracking-wider">
                        <tr>
                            <th class="px-4 py-3 border-b border-gray-100">No. Exchange</th>
                            <th class="px-4 py-3 border-b border-gray-100">Tanggal</th>
                            <th class="px-4 py-3 border-b border-gray-100">Pelanggan</th>
                            <th class="px-4 py-3 border-b border-gray-100">Produk Lama → Baru</th>
                            <th class="px-4 py-3 border-b border-gray-100 text-right">Selisih Harga</th>
                            <th class="px-4 py-3 border-b border-gray-100">Status</th>
                            <th class="px-4 py-3 border-b border-gray-100 text-right">Aksi</th>
                        </tr>
                    </thead>
                    <tbody class="text-sm divide-y divide-gray-100">
                        ${exchanges.length === 0 ? '<tr><td colspan="7" class="px-6 py-12 text-center text-gray-400 italic">Belum ada data tukar guling.</td></tr>' : ''}
                        ${exchanges.map(ex => {
        const customer = db.findById('customers', ex.customerId);
        let actions = '';
        if (perm.edit) {
            if (ex.status === 'REQUESTED') {
                actions += `<button onclick="approveExchange('${ex.id}', true)" class="text-green-600 hover:text-green-800 font-bold text-xs border border-green-200 bg-green-50 px-2 py-1 rounded mr-1">Setujui</button>`;
                actions += `<button onclick="approveExchange('${ex.id}', false)" class="text-red-500 font-bold text-xs border border-red-200 bg-red-50 px-2 py-1 rounded">Tolak</button>`;
            }
            if (ex.status === 'APPROVED') {
                actions += `<button onclick="receiveExchangeReturn('${ex.id}')" class="text-indigo-600 font-bold text-xs border border-indigo-200 bg-indigo-50 px-2 py-1 rounded">Terima Retur</button>`;
            }
            if (ex.status === 'RETURN_RECEIVED') {
                actions += `<button onclick="shipExchangeReplacement('${ex.id}')" class="text-purple-600 font-bold text-xs border border-purple-200 bg-purple-50 px-2 py-1 rounded">Kirim Pengganti</button>`;
            }
        }
        const diff = ex.priceDifference || 0;
        const diffDisplay = diff === 0 ? '<span class="text-gray-400">-</span>' :
            diff > 0 ? `<span class="text-green-600 font-bold">+${srFmt(diff)}</span>` :
                `<span class="text-red-600 font-bold">${srFmt(diff)}</span>`;

        return `
                                <tr class="hover:bg-gray-50/50 transition-colors">
                                    <td class="px-4 py-3 font-bold text-orange-600">${ex.exchangeNumber}</td>
                                    <td class="px-4 py-3 text-gray-600">${srDate(ex.date)}</td>
                                    <td class="px-4 py-3 text-gray-800">${customer?.name || 'N/A'}</td>
                                    <td class="px-4 py-3 text-gray-700 text-sm">
                                        <span class="text-red-500">${ex.returnedProductName}</span>
                                        <i class="fas fa-arrow-right text-gray-400 mx-1 text-xs"></i>
                                        <span class="text-green-600">${ex.replacementProductName}</span>
                                    </td>
                                    <td class="px-4 py-3 text-right">${diffDisplay}</td>
                                    <td class="px-4 py-3">${srStatusBadge(ex.status)}</td>
                                    <td class="px-4 py-3 text-right">${actions || '-'}</td>
                                </tr>
                            `;
    }).join('')}
                    </tbody>
                </table>
            </div>
        </div>
    `;
};

window.openExchangeModal = function (soId = null) {
    const salesOrders = db.read('salesOrders').filter(s => ['CONFIRMED', 'DELIVERED'].includes(s.status));
    const inventoryItems = db.read('inventoryItems').filter(i => i.status === 'ACTIVE');

    const soOptions = salesOrders.map(so => {
        const cust = db.findById('customers', so.customerId);
        return `<option value="${so.id}" ${soId === so.id ? 'selected' : ''}>${so.soNumber} — ${cust?.name || ''}</option>`;
    }).join('');

    const invOptions = inventoryItems.map(i =>
        `<option value="${i.id}" data-price="${i.purchasePrice || 0}" data-name="${i.itemName || ''}">${i.itemName || i.itemCode || 'Item'} (Stok: ${db.getInventoryStock ? db.getInventoryStock(i.id) : (i.stock || 0)})</option>`
    ).join('');

    const body = `
        <div class="space-y-4">
            <div class="bg-orange-50 border border-orange-200 rounded-lg p-3 text-xs text-orange-700 flex items-center gap-2">
                <i class="fas fa-exchange-alt"></i>
                Pilih Sales Order lalu tentukan produk lama (yang dikembalikan) dan produk baru (pengganti).
            </div>
            <div class="grid grid-cols-2 gap-4">
                <div>
                    <label class="block text-xs font-bold text-gray-600 uppercase mb-1">Sales Order Asal</label>
                    <select id="ex_so" class="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white focus:ring-2 focus:ring-orange-400" onchange="loadSOItemsForExchange()">
                        <option value="">-- Pilih Sales Order --</option>
                        ${soOptions}
                    </select>
                </div>
                <div>
                    <label class="block text-xs font-bold text-gray-600 uppercase mb-1">Produk yang Dikembalikan</label>
                    <select id="ex_returned_product" class="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white focus:ring-2 focus:ring-orange-400">
                        <option value="">-- Pilih SO Dulu --</option>
                    </select>
                </div>
            </div>
            <div class="grid grid-cols-3 gap-4">
                <div>
                    <label class="block text-xs font-bold text-gray-600 uppercase mb-1">Qty Dikembalikan</label>
                    <input type="number" id="ex_returned_qty" min="1" value="1" class="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-orange-400" onchange="calcExchangeDiff()">
                </div>
                <div>
                    <label class="block text-xs font-bold text-gray-600 uppercase mb-1">Produk Pengganti</label>
                    <select id="ex_replacement_product" class="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white focus:ring-2 focus:ring-orange-400" onchange="calcExchangeDiff()">
                        <option value="">-- Pilih Produk --</option>
                        ${invOptions}
                    </select>
                </div>
                <div>
                    <label class="block text-xs font-bold text-gray-600 uppercase mb-1">Qty Pengganti</label>
                    <input type="number" id="ex_replacement_qty" min="1" value="1" class="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-orange-400" onchange="calcExchangeDiff()">
                </div>
            </div>
            <div id="ex_diff_display" class="hidden p-3 rounded-lg text-sm font-bold text-center"></div>
            <div>
                <label class="block text-xs font-bold text-gray-600 uppercase mb-1">Alasan Penukaran</label>
                <textarea id="ex_reason" rows="2" class="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-orange-400" placeholder="Jelaskan alasan penukaran..."></textarea>
            </div>
        </div>
    `;
    const footer = `
        <button onclick="saveExchange()" class="bg-orange-600 text-white px-6 py-2 rounded-lg text-sm font-bold hover:bg-orange-700 shadow-md">Simpan Exchange</button>
        <button onclick="closeModal()" class="px-6 py-2 text-sm font-bold text-gray-500 hover:bg-gray-100 rounded-lg">Batal</button>
    `;
    showModal('Buat Product Exchange (Tukar Guling)', body, footer, 'max-w-2xl');
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
        diffDisplay.className = 'p-3 rounded-lg text-sm font-bold text-center bg-orange-50 border border-orange-200 text-orange-700';
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
    if (!confirm(`Terima barang retur untuk Exchange ${ex.exchangeNumber}?\nStok "${ex.returnedProductName}" akan bertambah ${ex.returnedQty} unit.`)) return;

    // Update stock & Journal for returned product (IN)
    const returnedItem = db.findById('inventoryItems', ex.returnedProductId);
    if (returnedItem) {
        db.addInventoryTransaction(
            returnedItem.id,
            'IN',
            ex.returnedQty,
            'SALES_RETURN',
            ex.id,
            `Retur Masuk Tukar Guling ${ex.exchangeNumber}: ${returnedItem.itemName}`
        );

        // Jurnal Retur Masuk (mengembalikan stok ke gudang)
        if (typeof db.addJournalEntry === 'function') {
            const modalPrice = returnedItem.purchasePrice || 0;
            const totalModal = ex.returnedQty * modalPrice;
            if (totalModal > 0) {
                db.addJournalEntry({
                    description: `Retur Masuk Tukar Guling ${ex.exchangeNumber}`,
                    referenceType: 'PRODUCT_EXCHANGE',
                    referenceId: ex.id,
                    items: [
                        { accountId: 'acc_inv_fg', debit: totalModal, credit: 0 },
                        { accountId: 'acc_cogs', debit: 0, credit: totalModal }
                    ]
                });
            }
        }
    }

    db.update('productExchanges', id, { status: 'RETURN_RECEIVED', returnReceivedAt: new Date().toISOString() });
    showToast(`Barang retur diterima. Stok "${ex.returnedProductName}" diperbarui.`);
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
            // Customer pays more — revenue
            db.addJournalEntry({
                description: `Selisih Tukar Guling ${ex.exchangeNumber} (Customer Bayar)`,
                referenceId: ex.id, referenceType: 'PRODUCT_EXCHANGE',
                items: [
                    { accountId: 'acc_ar', debit: absDiff, credit: 0 },
                    { accountId: 'acc_sales', debit: 0, credit: absDiff }
                ]
            });
        } else {
            // Company refunds — cost
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
                    <p class="text-3xl font-bold text-red-600 mt-1">${totalReturns}</p>
                    <p class="text-xs text-gray-400 mt-1">${completedReturns} selesai</p>
                </div>
                <div class="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
                    <p class="text-xs text-gray-500 uppercase font-bold">Total Tukar Guling</p>
                    <p class="text-3xl font-bold text-orange-600 mt-1">${totalExchanges}</p>
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
                                    <span class="w-6 h-6 flex items-center justify-center rounded-full bg-red-100 text-red-600 text-xs font-bold">${i + 1}</span>
                                    <span class="flex-1 text-sm text-gray-700">${name}</span>
                                    <span class="font-bold text-red-600">${qty}x</span>
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
                                    <span class="w-6 h-6 flex items-center justify-center rounded-full bg-orange-100 text-orange-600 text-xs font-bold">${i + 1}</span>
                                    <span class="flex-1 text-sm text-gray-700">${name}</span>
                                    <span class="font-bold text-orange-600">${count}x</span>
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
                                        <td class="px-4 py-3 font-bold text-red-600">${r.returnNumber}</td>
                                        <td class="px-4 py-3 text-gray-600">${srDate(r.date)}</td>
                                        <td class="px-4 py-3 text-gray-800">${db.findById('customers', r.customerId)?.name || 'N/A'}</td>
                                        <td class="px-4 py-3">${r.productName} <span class="text-xs text-gray-400">x${r.qtyReturned}</span></td>
                                        <td class="px-4 py-3 text-gray-600">${r.refundMethod}</td>
                                        <td class="px-4 py-3 text-right font-bold text-red-600">${srFmt(r.totalRefund || 0)}</td>
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
