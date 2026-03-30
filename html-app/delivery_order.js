// delivery_order.js - Surat Jalan Module for Sales

// ==========================================
// HELPERS
// ==========================================
function doFmt(n) { return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(n || 0); }
function doDate(d) { return d ? new Date(d).toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' }) : '-'; }
function doGenNum() { return 'SJ-' + new Date().getFullYear().toString().slice(-2) + Date.now().toString().slice(-6); }

window.calculateColly = function (qty, kemasan) {
    if (!qty || !kemasan) return 0;
    let factor = 1;
    if (kemasan === '25 Kg') factor = 25;
    else if (kemasan === '20 Kg') factor = 20;
    else if (kemasan === '15 Kg') factor = 15;
    else if (kemasan === '5 Kg') factor = 5;
    else if (kemasan === '800 Gram') factor = 0.8;
    
    const result = factor > 0 ? qty / factor : 0;
    return Number.isInteger(result) ? result : result.toFixed(2);
};

// ==========================================
// MAIN LIST VIEW
// ==========================================
window.renderSalesDeliveryOrders = function () {
    document.getElementById('pageTitle').innerText = 'Delivery Order (Surat Jalan)';
    const mc = document.getElementById('main-content');
    const doList = db.read('deliveryOrders').sort((a, b) => new Date(b.date) - new Date(a.date));
    const perm = getModulePermission('penjualan');

    const statusBadge = (s) => {
        if (s === 'DRAFT' || s === 'PENDING') return '<span class="px-2 py-1 bg-gray-100 text-gray-500 rounded text-[10px] font-bold uppercase">Waiting WH</span>';
        if (s === 'HOLD') return '<span class="px-2 py-1 bg-red-100 text-red-600 rounded text-[10px] font-bold uppercase">Stock Hold</span>';
        if (s === 'SHIPPED') return '<span class="px-2 py-1 bg-green-100 text-green-700 rounded text-[10px] font-bold uppercase">Shipped</span>';
        return `<span class="px-2 py-1 bg-gray-50 text-gray-400 rounded text-[10px] font-bold uppercase">${s || 'PENDING'}</span>`;
    };

    mc.innerHTML = `
        <div class="space-y-4">
            <!-- Header -->
            <div class="flex flex-wrap justify-between items-center bg-white p-4 rounded-xl shadow-sm border border-gray-100 gap-3">
                <div>
                    <h3 class="text-lg font-bold text-gray-800">Manajemen Surat Jalan</h3>
                    <p class="text-xs text-gray-500">Buat surat jalan manual atau pantau status pengiriman.</p>
                </div>
                ${perm.edit ? `
                    <div class="flex items-center gap-2">
                        <button onclick="openBlankDeliveryModal()"
                            class="bg-gray-700 hover:bg-gray-800 text-white px-4 py-2 rounded-lg text-sm font-bold shadow-sm flex items-center gap-2 transition-all">
                            <i class="fas fa-file-alt"></i> Surat Jalan Kosong
                        </button>
                        <button onclick="openDeliveryFromSOModal()"
                            class="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-bold shadow-sm flex items-center gap-2 transition-all">
                            <i class="fas fa-file-invoice"></i> Dari Sales Order
                        </button>
                    </div>
                ` : ''}
            </div>

            <!-- Table -->
            <div class="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                <table class="w-full text-left border-collapse">
                    <thead class="bg-gray-50 text-slate-500 text-[11px] uppercase tracking-wider">
                        <tr>
                            <th class="px-4 py-3 border-b border-gray-100">No. SJ</th>
                            <th class="px-4 py-3 border-b border-gray-100">Pelanggan</th>
                            <th class="px-4 py-3 border-b border-gray-100">Ref SO/Inv</th>
                            <th class="px-4 py-3 border-b border-gray-100 text-center">Status</th>
                            <th class="px-4 py-3 border-b border-gray-100">Driver</th>
                            <th class="px-4 py-3 border-b border-gray-100 text-right">Aksi</th>
                        </tr>
                    </thead>
                    <tbody class="text-sm divide-y divide-gray-100">
                        ${doList.length === 0 ? '<tr><td colspan="6" class="px-6 py-12 text-center text-gray-400 italic">Belum ada data surat jalan.</td></tr>' :
            doList.map(d => `
                <tr class="hover:bg-gray-50/50 transition-colors">
                    <td class="px-4 py-3 font-bold text-blue-700">${d.doNumber}</td>
                    <td class="px-4 py-3 text-gray-800 font-medium">${d.recipientName || '-'}</td>
                    <td class="px-4 py-3 text-gray-500 text-xs">${d.soNumber || d.invoiceNumber || '-'}</td>
                    <td class="px-4 py-3 text-center">${statusBadge(d.status)}</td>
                    <td class="px-4 py-3 text-gray-600">${d.driverName || '-'}</td>
                    <td class="px-4 py-3 text-right">
                        <button onclick="printDeliveryOrder('${d.id}')" class="text-blue-500 hover:text-blue-700 font-bold text-xs" title="Cetak Surat Jalan">
                            <i class="fas fa-print mr-1"></i>Cetak
                        </button>
                    </td>
                </tr>
            `).join('')}
                    </tbody>
                </table>
            </div>
        </div>
    `;
};

// ==========================================
// BLANK DELIVERY ORDER
// ==========================================
window.openBlankDeliveryModal = function () {
    const products = db.read('inventoryItems') || [];
    const productOptions = products.map(p => `<option value="${p.itemName}" data-unit="${p.unit || ''}">${p.itemCode || ''}</option>`).join('');

    const body = `
        <datalist id="inventory_products_list">
            ${productOptions}
        </datalist>
        <div class="space-y-4">
            <div class="bg-gray-50 border border-gray-200 rounded-lg p-3 text-xs text-gray-600 flex items-center gap-2">
                <i class="fas fa-info-circle text-gray-400"></i>
                Surat jalan kosong — isi item secara manual untuk pengiriman yang belum ada orderan.
            </div>
            <div class="grid grid-cols-2 gap-4">
                <div>
                    <label class="block text-xs font-bold text-gray-600 uppercase mb-1">Nama Penerima / Tujuan</label>
                    <input type="text" id="do_recipient" class="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-gray-400" placeholder="Nama pelanggan / tujuan pengiriman">
                </div>
                <div>
                    <label class="block text-xs font-bold text-gray-600 uppercase mb-1">Alamat Pengiriman</label>
                    <input type="text" id="do_address" class="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-gray-400" placeholder="Alamat tujuan">
                </div>
            </div>
            <div class="grid grid-cols-3 gap-4">
                <div>
                    <label class="block text-xs font-bold text-gray-600 uppercase mb-1">Nama Driver / Kurir</label>
                    <input type="text" id="do_driver" class="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-gray-400" placeholder="Nama driver">
                </div>
                <div>
                    <label class="block text-xs font-bold text-gray-600 uppercase mb-1">No. Polisi Kendaraan</label>
                    <input type="text" id="do_vehicle" class="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-gray-400" placeholder="B 1234 XY">
                </div>
                <div>
                    <label class="block text-xs font-bold text-gray-600 uppercase mb-1">Tanggal Pengiriman</label>
                    <input type="date" id="do_date" class="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-gray-400" value="${new Date().toISOString().slice(0, 10)}">
                </div>
            </div>

            <!-- Items -->
            <div>
                <div class="flex justify-between items-center mb-2">
                    <label class="block text-xs font-bold text-gray-600 uppercase">Daftar Barang</label>
                    <button type="button" onclick="addBlankDOItem()" class="bg-gray-700 text-white px-3 py-1 rounded text-xs font-bold hover:bg-gray-800"><i class="fas fa-plus mr-1"></i>Tambah Item</button>
                </div>
                <div id="blank_do_items" class="space-y-2">
                    <!-- Items will be added here -->
                </div>
                <button type="button" onclick="addBlankDOItem()" class="mt-2 w-full border-2 border-dashed border-gray-300 text-gray-400 hover:border-gray-400 hover:text-gray-600 rounded-lg py-2 text-sm transition-all">
                    + Tambah Baris Item
                </button>
            </div>

            <div>
                <label class="block text-xs font-bold text-gray-600 uppercase mb-1">Catatan</label>
                <textarea id="do_notes" rows="2" class="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-gray-400" placeholder="Catatan pengiriman (opsional)..."></textarea>
            </div>
        </div>
    `;
    const footer = `
        <button onclick="saveBlankDeliveryOrder()" class="bg-gray-700 text-white px-6 py-2 rounded-lg text-sm font-bold hover:bg-gray-800 shadow-md">Simpan & Cetak</button>
        <button onclick="closeModal()" class="px-6 py-2 text-sm font-bold text-gray-500 hover:bg-gray-100 rounded-lg">Batal</button>
    `;
    showModal('Buat Surat Jalan Kosong', body, footer, 'max-w-2xl');
    window._blankDOItems = [];
    addBlankDOItem(); // Start with one row
};

window.addBlankDOItem = function () {
    const container = document.getElementById('blank_do_items');
    const id = Date.now();
    const div = document.createElement('div');
    div.id = `doi_${id}`;
    div.className = 'flex items-center gap-2 bg-white p-2 rounded-lg border border-gray-100 shadow-sm';
    div.innerHTML = `
        <div class="flex-1 min-w-[200px]">
             <input type="text" list="inventory_products_list" placeholder="Nama barang" oninput="onBlankDOItemChange('${id}')" id="doi_name_${id}" class="w-full border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:ring-2 focus:ring-gray-400 doi-name">
        </div>
        <div class="w-20">
            <input type="text" placeholder="Unit" id="doi_unit_${id}" class="w-full border border-gray-300 rounded-lg px-2 py-1.5 text-sm text-center focus:ring-2 focus:ring-gray-400 doi-unit">
        </div>
        <div class="w-24">
            <input type="number" placeholder="Qty" min="1" value="1" id="doi_qty_${id}" oninput="updateCollyValue('${id}')" class="w-full border border-gray-300 rounded-lg px-2 py-1.5 text-sm text-center font-bold focus:ring-2 focus:ring-gray-400 doi-qty">
        </div>
        <div class="w-32">
            <select id="doi_kemasan_${id}" onchange="updateCollyValue('${id}')" class="w-full border border-gray-300 rounded-lg px-2 py-1.5 text-xs focus:ring-2 focus:ring-gray-400 doi-kemasan">
                <option value="">-- Kemasan --</option>
                <option value="25 Kg">25 Kg</option>
                <option value="20 Kg">20 Kg</option>
                <option value="15 Kg">15 Kg</option>
                <option value="5 Kg">5 Kg</option>
                <option value="800 Gram">800 Gram</option>
            </select>
        </div>
        <div class="w-20">
            <input type="text" placeholder="Colly" id="doi_colly_${id}" readonly class="w-full bg-gray-50 border border-gray-200 rounded-lg px-2 py-1.5 text-sm text-center font-bold text-blue-600 doi-colly">
        </div>
        <div class="w-24">
            <input type="text" placeholder="Ket" class="w-full border border-gray-300 rounded-lg px-2 py-1.5 text-sm focus:ring-2 focus:ring-gray-400 doi-remark">
        </div>
        <button type="button" onclick="document.getElementById('doi_${id}').remove()" class="text-red-400 hover:text-red-600 text-xs w-6 flex-shrink-0"><i class="fas fa-times"></i></button>
    `;
    container.appendChild(div);
};

window.updateCollyValue = function(id) {
    const qty = parseFloat(document.getElementById(`doi_qty_${id}`).value) || 0;
    const kemasan = document.getElementById(`doi_kemasan_${id}`).value;
    const collyInput = document.getElementById(`doi_colly_${id}`);
    if (collyInput) {
        collyInput.value = calculateColly(qty, kemasan);
    }
};

window.onBlankDOItemChange = function (id) {
    const nameInput = document.getElementById(`doi_name_${id}`);
    const unitInput = document.getElementById(`doi_unit_${id}`);
    const val = nameInput.value;

    const datalist = document.getElementById('inventory_products_list');
    const options = Array.from(datalist.options);
    const match = options.find(o => o.value === val);

    if (match) {
        const unit = match.getAttribute('data-unit');
        if (unit) unitInput.value = unit;
    }
};

window.saveBlankDeliveryOrder = function () {
    const recipient = document.getElementById('do_recipient').value.trim();
    const address = document.getElementById('do_address').value.trim();
    const driver = document.getElementById('do_driver').value.trim();
    const vehicle = document.getElementById('do_vehicle').value.trim();
    const date = document.getElementById('do_date').value;
    const notes = document.getElementById('do_notes').value.trim();

    if (!recipient) { showToast('Nama penerima harus diisi.', 'error'); return; }

    // Collect items
    const itemRows = document.getElementById('blank_do_items').querySelectorAll('[id^="doi_"]');
    const items = [];
    itemRows.forEach(row => {
        const name = row.querySelector('.doi-name')?.value.trim();
        const unit = row.querySelector('.doi-unit')?.value.trim() || 'PCS';
        const qty = parseFloat(row.querySelector('.doi-qty')?.value) || 0;
        const kemasan = row.querySelector('.doi-kemasan')?.value || '';
        const colly = row.querySelector('.doi-colly')?.value || 0;
        const remark = row.querySelector('.doi-remark')?.value.trim();
        if (name && qty > 0) items.push({ 
            name, unit, qty, remark,
            kemasan,
            colly
        });
    });

    const doNum = doGenNum();
    const saved = db.insert('deliveryOrders', {
        doNumber: doNum,
        date: date ? new Date(date).toISOString() : new Date().toISOString(),
        type: 'BLANK',
        recipientName: recipient,
        address,
        driverName: driver,
        vehicleNo: vehicle,
        items,
        notes,
        invoiceId: null,
        invoiceNumber: null
    });

    // INTEGRASI: Potong Stok & Jurnal (Jika memungkinkan)
    items.forEach(item => {
        // Cari item di inventory (case insensitive)
        const invItem = db.read('inventoryItems').find(i => i.itemName.toLowerCase() === item.name.toLowerCase());
        if (invItem) {
            db.addInventoryTransaction(invItem.id, 'OUT', item.qty, 'SALES_OUT', saved.id, `SJ Manual ${doNum}: ${item.name}`);

            // Jurnal: Debit HPP, Kredit Persediaan FG (Nilai est. atau modal)
            if (typeof db.addJournalEntry === 'function') {
                const modalPrice = invItem.purchasePrice || 0;
                const totalModal = item.qty * modalPrice;
                if (totalModal > 0) {
                    db.addJournalEntry({
                        description: `HPP Pengiriman SJ ${doNum} (${item.name})`,
                        referenceType: 'DO',
                        referenceId: saved.id,
                        items: [
                            { accountId: 'acc_cogs', debit: totalModal, credit: 0 },
                            { accountId: 'acc_inv_fg', debit: 0, credit: totalModal }
                        ]
                    });
                }
            }
        }
    });

    showToast(`Surat Jalan ${doNum} berhasil dibuat.`);
    closeModal();
    renderSalesDeliveryOrders();
    // Auto print
    setTimeout(() => printDeliveryOrder(saved.id), 300);
};

// ==========================================
// DELIVERY ORDER FROM SALES ORDER
// ==========================================
window.openDeliveryFromSOModal = function (soId = null) {
    const salesOrders = db.read('salesOrders').filter(s => s.status === 'CONFIRMED' || s.status === 'DELIVERED');
    const customers = db.read('customers');

    const soOptions = salesOrders.map(so => {
        const cust = db.findById('customers', so.customerId);
        return `<option value="${so.id}" ${soId === so.id ? 'selected' : ''}>SO-${so.soNumber} — ${cust?.name || 'Unknown'}</option>`;
    }).join('');

    const body = `
        <div class="space-y-4">
            <div class="bg-blue-50 border border-blue-200 rounded-lg p-3 text-xs text-blue-700 flex items-center gap-2">
                <i class="fas fa-file-signature"></i>
                Pilih Sales Order untuk mengisi data barang dan pelanggan secara otomatis.
            </div>
            <div class="grid grid-cols-2 gap-4">
                <div>
                    <label class="block text-xs font-bold text-gray-600 uppercase mb-1">Sales Order</label>
                    <select id="dos_so" class="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white focus:ring-2 focus:ring-blue-400" onchange="loadSOForDO()">
                        <option value="">-- Pilih Sales Order --</option>
                        ${soOptions}
                    </select>
                </div>
                <div>
                    <label class="block text-xs font-bold text-gray-600 uppercase mb-1">Nama Penerima</label>
                    <input type="text" id="dos_recipient" class="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-400" placeholder="Akan terisi otomatis">
                </div>
            </div>
            <div class="grid grid-cols-3 gap-4">
                <div>
                    <label class="block text-xs font-bold text-gray-600 uppercase mb-1">Alamat Pengiriman</label>
                    <input type="text" id="dos_address" class="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-400" placeholder="Alamat tujuan">
                </div>
                <div>
                    <label class="block text-xs font-bold text-gray-600 uppercase mb-1">Nama Driver</label>
                    <input type="text" id="dos_driver" class="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-400" placeholder="Nama driver / kurir">
                </div>
                <div>
                    <label class="block text-xs font-bold text-gray-600 uppercase mb-1">No. Polisi Kendaraan</label>
                    <input type="text" id="dos_vehicle" class="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-400" placeholder="B 1234 XY">
                </div>
            </div>

            <div class="grid grid-cols-2 gap-4">
               <div>
                    <label class="block text-xs font-bold text-gray-600 uppercase mb-1">Tanggal Pengiriman</label>
                    <input type="date" id="dos_date" class="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-400" value="${new Date().toISOString().slice(0, 10)}">
                </div>
            </div>

            <!-- Auto-filled items preview -->
            <div>
                <label class="block text-xs font-bold text-gray-600 uppercase mb-2">Daftar Barang (dari Sales Order)</label>
                <div id="dos_items_preview" class="bg-gray-50 rounded-lg border border-gray-200 p-3 text-sm text-gray-400 italic text-center">
                    Pilih SO terlebih dahulu untuk melihat daftar barang.
                </div>
            </div>

            <div>
                <label class="block text-xs font-bold text-gray-600 uppercase mb-1">Catatan Pengiriman</label>
                <textarea id="dos_notes" rows="2" class="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-400" placeholder="Catatan tambahan..."></textarea>
            </div>
        </div>
    `;
    const footer = `
        <button onclick="saveDeliveryFromSO()" class="bg-blue-600 text-white px-6 py-2 rounded-lg text-sm font-bold hover:bg-blue-700 shadow-md">Simpan & Cetak</button>
        <button onclick="closeModal()" class="px-6 py-2 text-sm font-bold text-gray-500 hover:bg-gray-100 rounded-lg">Batal</button>
    `;
    showModal('Buat Surat Jalan dari Sales Order', body, footer, 'max-w-2xl');
    if (soId) setTimeout(() => loadSOForDO(), 100);
};

window.loadSOForDO = function () {
    const soId = document.getElementById('dos_so').value;
    if (!soId) return;

    const so = db.findById('salesOrders', soId);
    if (!so) return;

    const customer = db.findById('customers', so.customerId);

    // Fill recipient and address
    document.getElementById('dos_recipient').value = customer?.name || '';
    document.getElementById('dos_address').value = customer?.address || '';

    // Build items
    let items = (so.items || []).map(item => {
        const invItem = db.findById('inventoryItems', item.inventoryItemId);
        return {
            name: item.prodText || invItem?.itemName || 'Produk',
            unit: item.prodUnit || invItem?.unit || 'PCS',
            qty: item.qty || 1,
            remark: '',
            inventoryItemId: item.inventoryItemId,
            price: item.price || 0
        };
    });

    const preview = document.getElementById('dos_items_preview');
    if (items.length > 0) {
        preview.innerHTML = `
            <table class="w-full text-sm text-left">
                <thead class="bg-gray-100">
                    <tr class="text-[10px] text-gray-500 uppercase tracking-tight">
                        <th class="px-2 py-2">Barang</th>
                        <th class="px-2 py-2 text-center w-16">Qty</th>
                        <th class="px-2 py-2 text-center w-32">Kemasan</th>
                        <th class="px-2 py-2 text-center w-16">Colly</th>
                    </tr>
                </thead>
                <tbody class="divide-y divide-gray-100">
                    ${items.map((i, idx) => `
                        <tr>
                            <td class="px-2 py-2 text-gray-800 text-xs font-medium">${i.name}</td>
                            <td class="px-2 py-2 text-center font-bold text-xs" id="dosi_qty_${idx}">${i.qty}</td>
                            <td class="px-2 py-2">
                                <select onchange="window.updateSOColly('${idx}')" id="dosi_kemasan_${idx}" class="w-full border border-gray-300 rounded px-1 py-1 text-[10px] dosi-kemasan">
                                    <option value="">-- Pilih --</option>
                                    <option value="25 Kg">25 Kg</option>
                                    <option value="20 Kg">20 Kg</option>
                                    <option value="15 Kg">15 Kg</option>
                                    <option value="5 Kg">5 Kg</option>
                                    <option value="800 Gram">800 Gram</option>
                                </select>
                            </td>
                            <td class="px-2 py-2 text-center font-bold text-blue-600 text-[11px]" id="dosi_colly_display_${idx}">0</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        `;

        window.updateSOColly = function(idx) {
            const qty = parseFloat(document.getElementById(`dosi_qty_${idx}`).innerText) || 0;
            const kemasan = document.getElementById(`dosi_kemasan_${idx}`).value;
            const display = document.getElementById(`dosi_colly_display_${idx}`);
            if (display) {
                display.innerText = calculateColly(qty, kemasan);
            }
        };

        document.getElementById('dos_so').dataset.soNum = so.soNumber;
    } else {
        preview.innerHTML = `<p class="text-gray-400 text-sm italic text-center py-3">Sales Order ini tidak memiliki item.</p>`;
    }
};

window.saveDeliveryFromSO = function () {
    const soSel = document.getElementById('dos_so');
    const soId = soSel.value;
    const recipient = document.getElementById('dos_recipient').value.trim();
    const address = document.getElementById('dos_address').value.trim();
    const driver = document.getElementById('dos_driver').value.trim();
    const vehicle = document.getElementById('dos_vehicle').value.trim();
    const date = document.getElementById('dos_date').value;
    const notes = document.getElementById('dos_notes').value.trim();

    if (!soId) { showToast('Pilih Sales Order terlebih dahulu.', 'error'); return; }
    if (!recipient) { showToast('Nama penerima harus diisi.', 'error'); return; }

    const so = db.findById('salesOrders', soId);
    
    // Collect items from preview table
    const preview = document.getElementById('dos_items_preview');
    const rows = preview.querySelectorAll('tbody tr');
    const items = [];
    rows.forEach((row, idx) => {
        const name = row.cells[0].innerText;
        const qty = parseFloat(row.cells[1].innerText) || 0;
        const kemasan = row.querySelector('.dosi-kemasan')?.value || '';
        const colly = row.querySelector(`#dosi_colly_display_${idx}`)?.innerText || 0;
        
        // Find original SO item for metadata
        const soItem = so.items.find(si => (si.prodText || si.itemName) === name);
        
        items.push({
            name,
            qty,
            kemasan,
            colly,
            unit: soItem?.prodUnit || 'PCS',
            inventoryItemId: soItem?.inventoryItemId,
            price: soItem?.price || 0,
            remark: ''
        });
    });

    const doNum = doGenNum();
    const saved = db.insert('deliveryOrders', {
        doNumber: doNum,
        date: date ? new Date(date).toISOString() : new Date().toISOString(),
        status: 'DRAFT',
        type: 'SO',
        recipientName: recipient,
        address,
        driverName: driver,
        vehicleNo: vehicle,
        items,
        notes,
        salesOrderId: soId,
        soNumber: so?.soNumber
    });

    showToast(`Surat Jalan ${doNum} dari SO-${so?.soNumber} berhasil dibuat dan dikirim ke Gudang.`);
    closeModal();
    renderSalesDeliveryOrders();
    setTimeout(() => printDeliveryOrder(saved.id), 300);
};

// ==========================================
// PRINT DELIVERY ORDER
// ==========================================
window.printDeliveryOrder = function (id) {
    const d = db.findById('deliveryOrders', id);
    if (!d) { showToast('Data surat jalan tidak ditemukan.', 'error'); return; }

    // Read company profile from global CONFIG (app.js) or Settings (localStorage)
    const cfg = JSON.parse(localStorage.getItem('unityerp_company_config') || '{}');
    const company = {
        name: cfg.companyName || (typeof CONFIG !== 'undefined' ? CONFIG.companyName : 'PT. NAMA PERUSAHAAN'),
        address: cfg.companyAddress || (typeof CONFIG !== 'undefined' ? CONFIG.companyAddress : 'Jl. Alamat Perusahaan'),
        phone: cfg.companyPhone || (typeof CONFIG !== 'undefined' ? CONFIG.companyPhone : '-'),
        email: cfg.companyEmail || (typeof CONFIG !== 'undefined' ? CONFIG.companyEmail : '-'),
        logo: cfg.logo || (typeof CONFIG !== 'undefined' ? CONFIG.logo : '')
    };

    const itemsTable = d.items?.length > 0 ? `
        <table style="width:100%;border-collapse:collapse;margin-top:12px;">
            <thead>
                <tr style="background:#f5f5f5;">
                    <th style="border:1px solid #ccc;padding:8px;text-align:center;font-size:12px;width:40px">No.</th>
                    <th style="border:1px solid #ccc;padding:8px;text-align:left;font-size:12px;">Nama Barang / Keterangan</th>
                    <th style="border:1px solid #ccc;padding:8px;text-align:center;font-size:12px;width:60px">Qty</th>
                    <th style="border:1px solid #ccc;padding:8px;text-align:center;font-size:12px;width:60px">Colly</th>
                    <th style="border:1px solid #ccc;padding:8px;text-align:center;font-size:12px;width:60px">Satuan</th>
                    <th style="border:1px solid #ccc;padding:8px;text-align:left;font-size:12px;">Keterangan</th>
                </tr>
            </thead>
            <tbody>
                ${d.items.map((item, i) => `
                    <tr>
                        <td style="border:1px solid #ccc;padding:8px;text-align:center;font-size:12px;">${i + 1}</td>
                        <td style="border:1px solid #ccc;padding:8px;font-size:12px;">
                            ${item.name || '-'}
                            ${item.kemasan ? `<div style="font-size:10px;color:#777;margin-top:2px;">Kemasan: ${item.kemasan}</div>` : ''}
                        </td>
                        <td style="border:1px solid #ccc;padding:8px;text-align:center;font-size:12px;font-weight:bold">${item.qty || 0}</td>
                        <td style="border:1px solid #ccc;padding:8px;text-align:center;font-size:12px;font-weight:bold;color:#2563eb">${item.colly || '-'}</td>
                        <td style="border:1px solid #ccc;padding:8px;text-align:center;font-size:12px;">${item.unit || 'PCS'}</td>
                        <td style="border:1px solid #ccc;padding:8px;font-size:12px;color:#555">${item.remark || ''}</td>
                    </tr>
                `).join('')}
                ${[...Array(Math.max(0, 8 - (d.items?.length || 0)))].map(() => `
                    <tr>
                        <td style="border:1px solid #ccc;padding:6px;">&nbsp;</td>
                        <td style="border:1px solid #ccc;padding:6px;"></td>
                        <td style="border:1px solid #ccc;padding:6px;"></td>
                        <td style="border:1px solid #ccc;padding:6px;"></td>
                        <td style="border:1px solid #ccc;padding:6px;"></td>
                        <td style="border:1px solid #ccc;padding:6px;"></td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
    ` : `
        <table style="width:100%;border-collapse:collapse;margin-top:12px;">
            <thead>
                <tr style="background:#f5f5f5;">
                    <th style="border:1px solid #ccc;padding:8px;text-align:center;font-size:12px;width:40px">No.</th>
                    <th style="border:1px solid #ccc;padding:8px;text-align:left;font-size:12px;">Nama Barang / Keterangan</th>
                    <th style="border:1px solid #ccc;padding:8px;text-align:center;font-size:12px;width:60px">Qty</th>
                    <th style="border:1px solid #ccc;padding:8px;text-align:center;font-size:12px;width:60px">Satuan</th>
                    <th style="border:1px solid #ccc;padding:8px;text-align:left;font-size:12px;">Keterangan</th>
                </tr>
            </thead>
            <tbody>
                ${[...Array(10)].map((_, i) => `
                    <tr>
                        <td style="border:1px solid #ccc;padding:20px 8px;text-align:center;font-size:12px;">${i + 1}</td>
                        <td style="border:1px solid #ccc;padding:20px 8px;"></td>
                        <td style="border:1px solid #ccc;padding:20px 8px;"></td>
                        <td style="border:1px solid #ccc;padding:20px 8px;"></td>
                        <td style="border:1px solid #ccc;padding:20px 8px;"></td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
    `;

    const printHtml = `
        <!DOCTYPE html>
        <html lang="id">
        <head>
            <meta charset="UTF-8">
            <title>Surat Jalan ${d.doNumber}</title>
            <style>
                * { margin: 0; padding: 0; box-sizing: border-box; }
                body { font-family: Arial, sans-serif; color: #111; font-size: 13px; padding: 20px 30px; }
                .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 16px; padding-bottom: 12px; border-bottom: 2px solid #333; }
                .company-name { font-size: 18px; font-weight: bold; color: #111; }
                .company-info { font-size: 11px; color: #555; margin-top: 4px; line-height: 1.5; }
                .title-box { text-align: center; }
                .title-box h2 { font-size: 18px; font-weight: bold; letter-spacing: 2px; border: 2px solid #333; padding: 6px 20px; display: inline-block; }
                .do-number { font-size: 12px; color: #555; margin-top: 4px; }
                .meta-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 0; margin: 12px 0; }
                .meta-row { display: flex; border: 1px solid #ccc; margin: -1px 0 0 0; }
                .meta-label { font-weight: bold; font-size: 11px; width: 130px; flex-shrink: 0; background: #f8f8f8; padding: 6px 8px; border-right: 1px solid #ccc; }
                .meta-value { font-size: 11px; padding: 6px 8px; flex: 1; }
                .signatures { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 16px; margin-top: 32px; text-align: center; }
                .sig-box { border: 1px solid #ccc; padding: 10px; border-radius: 4px; }
                .sig-title { font-size: 11px; font-weight: bold; color: #333; }
                .sig-space { height: 60px; border-bottom: 1px solid #999; margin: 16px 20px 6px; }
                .sig-name { font-size: 11px; color: #555; }
                .notes-box { margin-top: 12px; padding: 8px; background: #f9f9f9; border: 1px solid #ddd; border-radius: 3px; font-size: 11px; color: #555; }
                @media print { body { padding: 10px 15px; } }
            </style>
        </head>
        <body>
            <div class="header">
                <div style="display:flex;align-items:center;gap:12px;">
                    ${company.logo ? `<img src="${company.logo}" style="height:56px;width:auto;object-fit:contain;border-radius:4px;">` : ''}
                    <div>
                        <div class="company-name">${company.name}</div>
                        <div class="company-info">
                            ${company.address}<br>
                            Telp: ${company.phone} | ${company.email}
                        </div>
                    </div>
                </div>
                <div class="title-box">
                    <h2>SURAT JALAN</h2>
                    <div class="do-number">No: <strong>${d.doNumber}</strong></div>
                    ${d.type === 'BLANK' ? '<div style="font-size:10px;color:#888;margin-top:2px;">(Kosong)</div>' : ''}
                </div>
            </div>

            <div class="meta-grid">
                <div>
                    <div class="meta-row">
                        <div class="meta-label">Kepada Yth.</div>
                        <div class="meta-value"><strong>${d.recipientName || '...........................'}</strong></div>
                    </div>
                    <div class="meta-row">
                        <div class="meta-label">Alamat</div>
                        <div class="meta-value">${d.address || '...........................'}</div>
                    </div>
                    <div class="meta-row">
                        <div class="meta-label">No. Ref (SO/Inv)</div>
                        <div class="meta-value"><strong>${d.soNumber || d.invoiceNumber || '...........................'}</strong></div>
                    </div>
                </div>
                <div>
                    <div class="meta-row">
                        <div class="meta-label">Tanggal</div>
                        <div class="meta-value">${doDate(d.date)}</div>
                    </div>
                    <div class="meta-row">
                        <div class="meta-label">Driver / Kurir</div>
                        <div class="meta-value">${d.driverName || '...........................'}</div>
                    </div>
                    <div class="meta-row">
                        <div class="meta-label">No. Kendaraan</div>
                        <div class="meta-value">${d.vehicleNo || '...........................'}</div>
                    </div>
                </div>
            </div>

            ${itemsTable}

            ${d.notes ? `<div class="notes-box"><strong>Catatan:</strong> ${d.notes}</div>` : ''}

            <div class="signatures">
                <div class="sig-box">
                    <div class="sig-title">Dibuat Oleh</div>
                    <div class="sig-space"></div>
                    <div class="sig-name">( ................................. )</div>
                    <div class="sig-name" style="margin-top:3px;font-size:10px;">${company.name || 'Perusahaan'}</div>
                </div>
                <div class="sig-box">
                    <div class="sig-title">Driver / Kurir</div>
                    <div class="sig-space"></div>
                    <div class="sig-name">( ${d.driverName || '.....................'} )</div>
                    <div class="sig-name" style="margin-top:3px;font-size:10px;">Pengirim</div>
                </div>
                <div class="sig-box">
                    <div class="sig-title">Diterima Oleh</div>
                    <div class="sig-space"></div>
                    <div class="sig-name">( ................................. )</div>
                    <div class="sig-name" style="margin-top:3px;font-size:10px;">Penerima / Pelanggan</div>
                </div>
            </div>
        </body>
        </html>
    `;

    const printWindow = window.open('', '_blank', 'width=794,height=1123');
    if (printWindow) {
        printWindow.document.write(printHtml);
        printWindow.document.close();
        printWindow.onload = () => {
            printWindow.focus();
            printWindow.print();
        };
    } else {
        showToast('Popup diblokir browser. Izinkan popup untuk halaman ini.', 'error');
    }
};
// ==========================================
// WAREHOUSE DELIVERY VIEW
// ==========================================
// ==========================================
// WAREHOUSE DELIVERY VIEW (SIMPLIFIED APPROVAL)
// ==========================================
window.renderWarehouseDeliveryOrders = function () {
    document.getElementById('pageTitle').innerText = 'Logistics / Approval';
    const mc = document.getElementById('main-content');
    const doList = db.read('deliveryOrders').sort((a, b) => new Date(b.date) - new Date(a.date));

    const statusBadge = (s) => {
        if (s === 'DRAFT' || s === 'PENDING') return '<span class="px-2 py-1 bg-yellow-100 text-yellow-700 rounded text-[10px] font-bold uppercase">Waiting Approval</span>';
        if (s === 'HOLD') return '<span class="px-2 py-1 bg-red-100 text-red-700 rounded text-[10px] font-bold uppercase">Stock Hold</span>';
        if (s === 'SHIPPED') return '<span class="px-2 py-1 bg-green-100 text-green-700 rounded text-[10px] font-bold uppercase">Shipped</span>';
        return `<span class="px-2 py-1 bg-gray-100 text-gray-500 rounded text-[10px] font-bold uppercase">${s || 'DRAFT'}</span>`;
    };

    mc.innerHTML = `
        <div class="space-y-4">
            <div class="flex justify-between items-center bg-white p-4 rounded-xl shadow-sm border border-gray-100">
                <div>
                    <h3 class="text-lg font-bold text-gray-800">Persetujuan Pengiriman (Gudang)</h3>
                    <p class="text-xs text-gray-500">Cek ketersediaan stok dan setujui untuk pengiriman.</p>
                </div>
            </div>

            <div class="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                <table class="w-full text-left border-collapse">
                    <thead class="bg-gray-50 text-slate-500 text-[11px] uppercase tracking-wider">
                        <tr>
                            <th class="px-4 py-3 border-b border-gray-100">No. SJ</th>
                            <th class="px-4 py-3 border-b border-gray-100">Tujuan</th>
                            <th class="px-4 py-3 border-b border-gray-100">Status Stok</th>
                            <th class="px-4 py-3 border-b border-gray-100">Progress</th>
                            <th class="px-4 py-3 border-b border-gray-100 text-right">Aksi</th>
                        </tr>
                    </thead>
                    <tbody class="text-sm divide-y divide-gray-100">
                        ${doList.length === 0 ? '<tr><td colspan="5" class="px-6 py-12 text-center text-gray-400 italic">Tidak ada pengiriman yang perlu diproses.</td></tr>' :
            doList.map(d => {
                let showApprove = ['DRAFT', 'PENDING', 'HOLD'].includes(d.status);
                
                // Real-time stock check for display
                let stockStatus = '<span class="text-green-600 font-bold text-xs"><i class="fas fa-check-circle mr-1"></i>READY</span>';
                let hasIssue = false;
                (d.items || []).forEach(item => {
                    if (item.inventoryItemId && !db.validateInventoryStock(item.inventoryItemId, item.qty)) {
                        hasIssue = true;
                    }
                });
                
                if (hasIssue) {
                    stockStatus = '<span class="text-red-500 font-bold text-xs"><i class="fas fa-exclamation-triangle mr-1"></i>STOK KURANG</span>';
                }

                return `
                    <tr class="hover:bg-gray-50/50 transition-colors">
                        <td class="px-4 py-3 font-bold text-blue-700">${d.doNumber}</td>
                        <td class="px-4 py-3">
                            <div class="font-medium text-gray-800">${d.recipientName || '-'}</div>
                            <div class="text-[10px] text-gray-400">${d.soNumber || '-'}</div>
                        </td>
                        <td class="px-4 py-3">${stockStatus}</td>
                        <td class="px-4 py-3">${statusBadge(d.status)}</td>
                        <td class="px-4 py-3 text-right space-x-1">
                            ${showApprove ? `
                                <button onclick="openConfirmShipmentModal('${d.id}')" 
                                    class="${hasIssue ? 'bg-orange-500 hover:bg-orange-600' : 'bg-green-600 hover:bg-green-700'} text-white shadow-sm px-3 py-1.5 rounded-lg font-bold text-xs transition-all">
                                    ${hasIssue ? 'Approve (Stok Low)' : 'Approve & Kirim'}
                                </button>
                            ` : ''}
                            <button onclick="printDeliveryOrder('${d.id}')" class="text-gray-400 hover:text-blue-500 p-1 transition-colors">
                                <i class="fas fa-print"></i>
                            </button>
                        </td>
                    </tr>
                `;
            }).join('')}
                    </tbody>
                </table>
            </div>
        </div>
    `;
};

window.updateDOStatus = function(id, status) {
    db.update('deliveryOrders', id, { status: status });
    showToast(`DO status updated to ${status}`);
    renderWarehouseDeliveryOrders();
};

window.openConfirmShipmentModal = function(id) {
    const d = db.findById('deliveryOrders', id);
    
    let issues = [];
    (d.items || []).forEach(item => {
        if (item.inventoryItemId) {
            const stock = db.getInventoryStock(item.inventoryItemId);
            if (stock < item.qty) {
                issues.push(`${item.name} (Stok: ${stock}, Butuh: ${item.qty})`);
            }
        }
    });

    const hasIssue = issues.length > 0;
    const body = `
        <div class="space-y-4">
            ${hasIssue ? `
                <div class="p-4 bg-orange-50 text-orange-700 rounded-lg border border-orange-200">
                    <p class="font-bold mb-2 uppercase text-[10px] flex items-center gap-2">
                        <i class="fas fa-exclamation-triangle"></i> PERINGATAN: STOK TIDAK CUKUP
                    </p>
                    <p class="text-[11px] mb-2">Item berikut memiliki stok kurang di sistem, namun tetap bisa dikirim (stok akan menjadi negatif):</p>
                    <ul class="text-[11px] list-disc pl-5 space-y-1 font-medium">
                        ${issues.map(i => `<li>${i}</li>`).join('')}
                    </ul>
                </div>
            ` : `
                <div class="p-3 bg-green-50 text-green-700 rounded-lg text-xs font-medium border border-green-100 flex items-center gap-2">
                    <i class="fas fa-check-circle"></i> Stok tersedia. Masukkan detail pengiriman untuk memproses stok keluar.
                </div>
            `}
            <div class="grid grid-cols-2 gap-4">
                <div>
                    <label class="block text-xs font-bold text-gray-600 mb-1 uppercase tracking-tight">Kurir / Driver</label>
                    <input id="ship_carrier" value="${d.driverName || ''}" class="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-green-400" placeholder="Contoh: JNE / Pak Budi">
                </div>
                <div>
                    <label class="block text-xs font-bold text-gray-600 mb-1 uppercase tracking-tight">No. Resi / Plat</label>
                    <input id="ship_tracking" value="${d.vehicleNo || ''}" class="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-green-400" placeholder="Opsional">
                </div>
            </div>
        </div>
    `;
    const footer = `
        <button onclick="confirmShipment('${id}')" class="bg-green-600 text-white px-6 py-2 rounded-lg text-sm font-bold hover:bg-green-700 shadow-lg transition-transform active:scale-95">Setujui & Kirim Barang</button>
        <button onclick="closeModal()" class="px-6 py-2 text-sm font-bold text-gray-500 hover:bg-gray-100 rounded-lg">Batal</button>
    `;
    showModal('Konfirmasi Pengiriman', body, footer, 'max-w-md');
};

window.confirmShipment = function(id) {
    const d = db.findById('deliveryOrders', id);
    const carrier = document.getElementById('ship_carrier').value;
    const tracking = document.getElementById('ship_tracking').value;

    db.update('deliveryOrders', id, {
        status: 'SHIPPED',
        driverName: carrier,
        trackingNo: tracking,
        shippedAt: new Date().toISOString()
    });

    // Reduce inventory stock now!
    let totalCogs = 0;
    (d.items || []).forEach(item => {
        if (item.inventoryItemId) {
            db.addInventoryTransaction(item.inventoryItemId, 'OUT', item.qty, 'SALES_OUT', id, `SJ ${d.doNumber}`);
            const product = db.findById('inventoryItems', item.inventoryItemId);
            if (product) totalCogs += (item.qty * (product.purchasePrice || 0));
        }
    });

    // Journal COGS & Inventory
    if (totalCogs > 0 && typeof db.addJournalEntry === 'function') {
        db.addJournalEntry({
            description: `HPP Pengiriman DO ${d.doNumber}`,
            referenceType: 'DO',
            referenceId: id,
            items: [
                { accountId: 'acc_cogs', debit: totalCogs, credit: 0 },
                { accountId: 'acc_inv_fg', debit: 0, credit: totalCogs }
            ]
        });
    }

    // Update SO status to DELIVERED
    if (d.salesOrderId) {
        db.update('salesOrders', d.salesOrderId, { status: 'DELIVERED' });
    }

    showToast(`Shipment confirmed! Stock reduced.`);
    closeModal();
    renderWarehouseDeliveryOrders();
};

window.openDOFromSO = function(soId) {
    const so = db.findById('salesOrders', soId);
    if (!so) return;

    const customer = db.findById('customers', so.customerId);
    
    // Auto-create DO in DRAFT status
    const doNum = doGenNum();
    const items = (so.items || []).map(i => ({
        inventoryItemId: i.inventoryItemId,
        name: i.prodText,
        qty: i.qty,
        unit: i.prodUnit || 'PCS'
    }));

    const saved = db.insert('deliveryOrders', {
        doNumber: doNum,
        date: new Date().toISOString(),
        status: 'DRAFT',
        salesOrderId: soId,
        soNumber: so.soNumber,
        customerId: so.customerId,
        recipientName: customer?.name || 'Unknown',
        address: customer?.address || '',
        items: items,
        driverName: '',
        vehicleNo: ''
    });

    showToast(`Delivery Order ${doNum} created for Warehouse processing.`);
    renderSalesOrders(); // Refresh SO list to show "Processing"
};
