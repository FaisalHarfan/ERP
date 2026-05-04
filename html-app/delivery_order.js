// delivery_order.js - Surat Jalan Module for Sales
// Modernized with Slate ERP Style & Integrated Logistics

// ==========================================
// HELPERS
// ==========================================
function doFmt(n) { return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(n || 0); }
function doDate(d) { return d ? new Date(d).toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' }) : '-'; }
function toRomanDO(num) {
    const roman = ["", "I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X", "XI", "XII"];
    return roman[num] || "";
}

function doGenNum() {
    const dos = db.read('deliveryOrders') || [];
    const now = new Date();
    const month = now.getMonth() + 1;
    const year = now.getFullYear();
    const romanMonth = toRomanDO(month);

    const sameMonthRecords = dos.filter(d => {
        if (!d.doNumber) return false;
        const parts = d.doNumber.split('/');
        if (parts.length < 4) return false;
        return parts[1] === romanMonth && parts[2] === String(year);
    });

    const nextSeq = sameMonthRecords.length + 1;
    const seqStr = String(nextSeq).padStart(4, '0');
    return `SJ/${romanMonth}/${year}/${seqStr}`;
}

window.calculateColly = function (qty, kemasan) {
    if (!qty || !kemasan) return 0;
    let factor = 1;
    if (kemasan === '25 Kg') factor = 25;
    else if (kemasan === '20 Kg') factor = 20;
    else if (kemasan === '15 Kg') factor = 15;
    else if (kemasan === '5 Kg') factor = 5;
    else if (kemasan === '4 KG (800 Gram)' || kemasan === '800 Gram') factor = 4;

    const result = factor > 0 ? qty / factor : 0;
    return Number.isInteger(result) ? result : result.toFixed(2);
};

// ==========================================
// MAIN LIST VIEW (SALES DEPT)
// ==========================================
window.renderSalesDeliveryOrders = function () {
    const perm = getModulePermission('penjualan');
    document.getElementById('pageTitle').innerText = 'Delivery Order (Surat Jalan)';
    const mc = document.getElementById('main-content');
    const doList = db.read('deliveryOrders').sort((a, b) => new Date(b.date) - new Date(a.date));

    if (!window._salesDoActiveTab) window._salesDoActiveTab = 'pending';
    if (!window.currentFilters.salesDeliveryOrders) window.currentFilters.salesDeliveryOrders = { start: '', end: '', search: '' };
    const filters = window.currentFilters.salesDeliveryOrders;
    
    let filteredList = filterByDateRange(doList, 'salesDeliveryOrders');
    if (filters.search) {
        const s = filters.search.toLowerCase();
        filteredList = filteredList.filter(d => 
            (d.doNumber || '').toLowerCase().includes(s) || 
            (d.recipientName || '').toLowerCase().includes(s) || 
            (d.soNumber || '').toLowerCase().includes(s) ||
            (d.invoiceNumber || '').toLowerCase().includes(s)
        );
    }

    let filteredDOs = window._salesDoActiveTab === 'pending' 
        ? filteredList.filter(d => d.status !== 'SHIPPED') 
        : filteredList.filter(d => d.status === 'SHIPPED');

    const statusBadge = (s) => {
        if (s === 'DRAFT' || s === 'PENDING') return '<span class="px-3 py-1 bg-slate-100 text-slate-500 rounded-full text-[10px] font-bold uppercase tracking-tight shadow-sm">Waiting WH</span>';
        if (s === 'HOLD') return '<span class="px-3 py-1 bg-red-50 text-red-600 rounded-full text-[10px] font-bold uppercase tracking-tight shadow-sm">Stock Hold</span>';
        if (s === 'SHIPPED') return '<span class="px-3 py-1 bg-green-50 text-green-700 rounded-full text-[10px] font-bold uppercase tracking-tight shadow-sm">Shipped</span>';
        return `<span class="px-3 py-1 bg-blue-50 text-blue-600 rounded-full text-[10px] font-bold uppercase tracking-tight shadow-sm">${s || 'PENDING'}</span>`;
    };

    mc.innerHTML = `
        <div id="sdo-list-view" class="animate-in fade-in duration-300 h-[calc(100vh-64px)] flex flex-col bg-slate-50 -m-4 sm:-m-6 font-sans">
            <!-- Header Section: Title & Actions -->
            <div class="bg-white border-b border-slate-200 z-40 shadow-sm relative shrink-0">
                <div class="flex flex-wrap md:flex-nowrap justify-between items-center px-8 py-5 gap-4">
                    <div class="flex items-center gap-5">
                        <div class="w-12 h-12 bg-blue-50 rounded-2xl flex items-center justify-center text-blue-600 shadow-sm">
                            <i class="fas fa-truck-loading text-xl"></i>
                        </div>
                        <div>
                            <p class="text-xl font-black text-slate-800 tracking-tight">Pengiriman Pesanan</p>
                        </div>
                    </div>
                    
                    <div class="flex items-center gap-3">
                        <button onclick="syncDeliveryOrders()" class="p-2.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all" title="Sync Data">
                            <i class="fas fa-sync-alt text-sm"></i>
                        </button>
                        ${perm.edit ? `
                            <button onclick="openBlankDeliveryModal()"
                                class="bg-slate-50 hover:bg-slate-100 text-slate-600 px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all active:scale-95 border border-slate-200 flex items-center gap-2">
                                <i class="fas fa-file-alt"></i> SJ Kosong
                            </button>
                            <button onclick="openDeliveryFromSOModal()"
                                class="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-blue-500/20 transition-all active:scale-95 flex items-center gap-2">
                                <i class="fas fa-file-invoice"></i> Dari SO
                            </button>
                        ` : ''}
                    </div>
                </div>

                <!-- Filter Bar: Search & Date -->
                <div class="flex flex-wrap md:flex-nowrap justify-between items-center px-8 py-4 border-t border-slate-100 bg-slate-50/20 gap-4 backdrop-blur-md">
                    <div class="flex items-center gap-4 flex-1">
                        <div class="flex-1 max-w-lg relative group">
                            <i class="fas fa-search absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 text-sm group-focus-within:text-blue-500 transition-colors"></i>
                            <input type="text" id="sdo_global_search" autocomplete="off" onkeyup="filterSalesDOTable()" value="${filters.search || ''}" placeholder="Cari Pelanggan, No. SJ, atau Ref..." 
                                class="w-full pl-11 pr-5 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-medium text-slate-600 placeholder:text-slate-300 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/5 outline-none transition-all shadow-sm">
                        </div>
                        
                        <div class="relative" id="sdo_date_filter_container">
                            <button onclick="toggleSalesDODateDropdown()" class="flex items-center bg-slate-50 border border-slate-200 rounded-lg overflow-hidden hover:bg-slate-100 transition-all shadow-sm h-[44px] group">
                                <span class="bg-slate-200/40 border-r border-slate-200 px-3 h-full flex items-center text-slate-500 transition-colors">
                                    <i class="fas fa-sort-amount-up text-sm"></i>
                                </span>
                                <span class="px-4 text-sm font-semibold text-blue-600">Date</span>
                                <span class="pr-3 text-slate-400">
                                    <i class="fas fa-chevron-down text-[11px]"></i>
                                </span>
                            </button>
                            
                            <div id="sdo_date_dropdown" class="absolute left-0 mt-3 w-80 bg-white border border-slate-100 rounded-3xl shadow-[0_20px_50px_-10px_rgba(0,0,0,0.1)] z-[200] hidden p-6 animate-in fade-in zoom-in-95 duration-200">
                                <h4 class="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
                                     <span class="w-1 h-3 bg-blue-600 rounded-full"></span> Date Range Filter
                                </h4>
                                <div class="space-y-4">
                                    <div class="grid grid-cols-2 gap-4">
                                        <div>
                                            <label class="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Dari</label>
                                            <input type="date" id="sdo_header_start" value="${filters.start}" class="w-full border-2 border-slate-50 rounded-xl px-3 py-2 text-sm font-bold text-slate-700 focus:border-blue-500/20 outline-none transition-all bg-slate-50/50">
                                        </div>
                                        <div>
                                            <label class="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Sampai</label>
                                            <input type="date" id="sdo_header_end" value="${filters.end}" class="w-full border-2 border-slate-50 rounded-xl px-3 py-2 text-sm font-bold text-slate-700 focus:border-blue-500/20 outline-none transition-all bg-slate-50/50">
                                        </div>
                                    </div>
                                    <div class="flex gap-2 pt-2 uppercase text-[10px] font-black tracking-[0.1em]">
                                        <button onclick="applySalesDODateFilter()" class="flex-1 bg-blue-600 text-white py-3 rounded-xl hover:bg-blue-700 shadow-lg shadow-blue-500/20 active:scale-95 transition-all">Terapkan Filter</button>
                                        <button onclick="resetSalesDODateFilter()" class="flex-1 bg-slate-100 text-slate-500 py-3 rounded-xl hover:bg-slate-200 active:scale-95 transition-all">Reset</button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div class="flex items-center gap-10">
                        <button onclick="changeSalesDOTab('pending')" class="relative py-2 group">
                            <span class="text-xs font-black uppercase tracking-[0.2em] transition-colors ${window._salesDoActiveTab === 'pending' ? 'text-blue-600' : 'text-slate-400 hover:text-slate-600'}">Antrean Kirim</span>
                            ${window._salesDoActiveTab === 'pending' ? '<div class="absolute -bottom-[21px] left-0 right-0 h-1 bg-blue-600 rounded-t-full shadow-[0_-4px_12px_rgba(37,99,235,0.3)]"></div>' : ''}
                        </button>
                        <button onclick="changeSalesDOTab('history')" class="relative py-2 group">
                            <span class="text-xs font-black uppercase tracking-[0.2em] transition-colors ${window._salesDoActiveTab === 'history' ? 'text-blue-600' : 'text-slate-400 hover:text-slate-600'}">Riwayat Selesai</span>
                            ${window._salesDoActiveTab === 'history' ? '<div class="absolute -bottom-[21px] left-0 right-0 h-1 bg-blue-600 rounded-t-full shadow-[0_-4px_12px_rgba(37,99,235,0.3)]"></div>' : ''}
                        </button>
                    </div>
                </div>
            </div>

            <!-- Content Area -->
            <div class="p-4 sm:p-6 flex-1 overflow-y-auto">
                <div class="mb-3 flex justify-between items-center px-2">
                    <p class="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total: <span id="sdo_total_count">${filteredDOs.length} Dokumen</span></p>
                </div>
                <div class="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden min-h-min">
                    <div class="overflow-x-auto min-h-[400px]">
                        <table class="w-full text-left border-collapse">
                            <thead class="sticky top-0 z-20">
                                <tr class="bg-slate-50/50 text-slate-500 text-[10px] uppercase font-black tracking-widest shadow-sm">
                                <th class="px-6 py-4 border-b border-slate-100">No. SJ / Ref</th>
                                <th class="px-6 py-4 border-b border-slate-100">Pelanggan</th>
                                <th class="px-6 py-4 border-b border-slate-100 text-center">Status</th>
                                <th class="px-6 py-4 border-b border-slate-100">Driver</th>
                                <th class="px-6 py-4 border-b border-slate-100 text-right">Aksi</th>
                            </tr>
                        </thead>
                        <tbody id="mc_do_table_body" class="text-sm divide-y divide-slate-50">
                            ${filteredDOs.length === 0 ? '<tr><td colspan="5" class="px-6 py-20 text-center text-slate-200 font-bold uppercase tracking-widest italic">Data tidak ditemukan.</td></tr>' :
            filteredDOs.map(d => `
                <tr class="hover:bg-slate-50/50 transition-colors group">
                    <td class="px-6 py-4">
                        <p class="font-black text-blue-600 text-sm tracking-tight mb-0.5">${d.doNumber}</p>
                        <p class="text-[10px] font-bold text-slate-400 tracking-wider">${d.soNumber || '-'}</p>
                    </td>
                    <td class="px-6 py-4">
                        <p class="font-black text-slate-700 text-sm">${(d.recipientName || 'Gudang Internal').toUpperCase()}</p>
                        <p class="text-[10px] font-bold text-slate-400 italic">${d.shippingAddress?.slice(0, 50) || '-'}${d.shippingAddress?.length > 50 ? '...' : ''}</p>
                    </td>
                    <td class="px-6 py-4 text-center">
                        ${statusBadge(d.status)}
                    </td>
                    <td class="px-6 py-4">
                        <p class="text-[10px] font-black text-slate-700 uppercase tracking-wider mb-0.5">${d.driverName || '-'}</p>
                        <p class="text-[10px] font-bold text-slate-400">${d.vehicleNumber || '-'}</p>
                    </td>
                    <td class="px-6 py-4 text-right">
                        <div class="flex justify-end items-center gap-2">
                            <button onclick="printDeliveryOrder('${d.id}')" class="bg-white text-slate-400 hover:text-blue-600 hover:bg-blue-50 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border border-slate-100 hover:border-blue-200 flex items-center gap-2 group/print">
                                <i class="fas fa-print group-hover/print:scale-110 transition-transform"></i> Cetak
                            </button>
                        </div>
                    </td>
                </tr>
            `).join('')}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    </div>
    <div id="sdo-form-view" class="hidden"></div>
    `;
};

window.changeSalesDOTab = function(tab) {
    window._salesDoActiveTab = tab;
    window.renderSalesDeliveryOrders();
};

window.filterSalesDOTable = function() {
    const q = (document.getElementById('sdo_global_search')?.value || '').toLowerCase();
    window.currentFilters.salesDeliveryOrders.search = q;
    
    const rows = document.querySelectorAll('#mc_do_table_body tr');
    let visibleCount = 0;

    rows.forEach(row => {
        const text = row.innerText.toLowerCase();
        const isVisible = text.includes(q);
        row.style.display = isVisible ? '' : 'none';
        if (isVisible) visibleCount++;
    });

    // Update document count
    const countEl = document.getElementById('sdo_total_count');
    if (countEl) countEl.innerText = visibleCount + ' Dokumen';
};

window.toggleSalesDODateDropdown = function() {
    const el = document.getElementById('sdo_date_dropdown');
    el.classList.toggle('hidden');
};

window.applySalesDOHeaderDateFilter = function() {
    window.currentFilters.salesDeliveryOrders.start = document.getElementById('sdo_header_start').value;
    window.currentFilters.salesDeliveryOrders.end = document.getElementById('sdo_header_end').value;
    window.renderSalesDeliveryOrders();
};

window.resetSalesDOHeaderDateFilter = function() {
    window.currentFilters.salesDeliveryOrders.start = '';
    window.currentFilters.salesDeliveryOrders.end = '';
    window.renderSalesDeliveryOrders();
};


// ==========================================
// BLANK DELIVERY ORDER
// ==========================================
window.openBlankDeliveryModal = function () {
    const products = (db.read('inventoryItems') || []).filter(p => !['RAW_MATERIAL'].includes(p.category));
    const productOptions = products.map(p => `<option value="${p.itemName}" data-unit="${p.unit || ''}">${p.itemCode || ''}</option>`).join('');

    const body = `
        <datalist id="inventory_products_list">
            ${productOptions}
        </datalist>
        <div class="space-y-4">
            <div class="grid grid-cols-2 gap-4">
                <div>
                    <label class="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-1.5">No. Surat Jalan</label>
                    <input type="text" id="do_number" value="${doGenNum()}" class="w-full border-2 border-slate-100 rounded-xl px-4 py-2 text-sm font-black text-blue-600 bg-slate-50 outline-none" readonly>
                </div>
                <div>
                    <label class="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-1.5">Nama Penerima / Tujuan</label>
                    <input type="text" id="do_recipient" class="w-full border-2 border-slate-100 rounded-xl px-4 py-2 text-sm font-bold text-slate-700 outline-none focus:border-blue-500 transition-all shadow-sm" placeholder="Nama pelanggan / tujuan">
                </div>
            </div>
            <div class="grid grid-cols-1 gap-4">
                <div>
                    <label class="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-1.5">Alamat Pengiriman</label>
                    <input type="text" id="do_address" class="w-full border-2 border-slate-100 rounded-xl px-4 py-2 text-sm font-bold text-slate-700 outline-none focus:border-blue-500 transition-all shadow-sm" placeholder="Alamat lengkap tujuan">
                </div>
            </div>
            <div class="grid grid-cols-3 gap-4">
                <div>
                    <label class="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-1.5">Driver / Kurir</label>
                    <input type="text" id="do_driver" class="w-full border-2 border-slate-100 rounded-xl px-4 py-2 text-sm font-bold text-slate-700 outline-none focus:border-blue-500 transition-all shadow-sm" placeholder="Nama driver">
                </div>
                <div>
                    <label class="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-1.5">No. Kendaraan</label>
                    <input type="text" id="do_vehicle" class="w-full border-2 border-slate-100 rounded-xl px-4 py-2 text-sm font-bold text-slate-700 outline-none focus:border-blue-500 transition-all shadow-sm" placeholder="B 1234 XY">
                </div>
                <div>
                    <label class="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-1.5">Tanggal</label>
                    <input type="date" id="do_date" class="w-full border-2 border-slate-100 rounded-xl px-4 py-2 text-sm font-bold text-slate-700 outline-none focus:border-blue-500 transition-all shadow-sm" value="${new Date().toISOString().slice(0, 10)}">
                </div>
            </div>

            <div class="bg-slate-50/50 p-4 rounded-2xl border border-slate-100">
                <div class="flex justify-between items-center mb-4 px-1">
                    <h4 class="text-[10px] font-black text-slate-800 uppercase tracking-[0.2em]">Daftar Item Barang</h4>
                    <button type="button" onclick="addBlankDOItem()" class="bg-blue-600 text-white px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest hover:bg-slate-900 transition-all shadow-sm">
                        <i class="fas fa-plus mr-1.5"></i> Tambah Item
                    </button>
                </div>
                <div id="blank_do_items" class="space-y-3"></div>
                <button type="button" onclick="addBlankDOItem()" class="mt-4 w-full border-2 border-dashed border-slate-200 text-slate-400 hover:border-slate-300 hover:text-slate-600 rounded-xl py-3 text-[10px] font-black uppercase tracking-widest transition-all">
                    + Tambah Baris Manual
                </button>
            </div>

            <div>
                <label class="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-1.5">Catatan Tambahan</label>
                <textarea id="do_notes" rows="2" class="w-full border-2 border-slate-100 rounded-xl px-4 py-2 text-sm font-bold text-slate-700 outline-none focus:border-blue-500 transition-all shadow-sm" placeholder="Instruksi pengiriman..."></textarea>
            </div>
        </div>
    `;
    const listView = document.getElementById('sdo-list-view');
    const formView = document.getElementById('sdo-form-view');
    if (!listView || !formView) return;

    renderBreadcrumb(['Logistik & Distribusi', 'Pengiriman Pesanan', 'Buat SJ Kosong']);
    listView.classList.add('hidden');
    formView.classList.remove('hidden');

    formView.innerHTML = `
        <div class="animate-in fade-in slide-in-from-bottom-2 duration-500 flex flex-col bg-white rounded-3xl overflow-hidden shadow-2xl border border-slate-200 -m-4 sm:-m-6 h-[calc(100vh-64px)] font-sans">
            <!-- Header / Action Bar -->
            <div class="bg-white border-b border-slate-100 px-8 py-5 flex items-center justify-between shrink-0 sticky top-0 z-50">
                <div class="flex items-center gap-6">
                    <div class="flex flex-col">
                        <h2 class="text-lg font-black text-slate-800 tracking-tight flex items-center gap-3 uppercase">
                            <span class="w-1.5 h-6 bg-blue-600 rounded-full"></span>
                            BUAT <span class="text-blue-600">SJ KOSONG</span>
                        </h2>
                    </div>
                </div>
                
                <div class="flex items-center gap-3">
                    <button onclick="renderSalesDeliveryOrders()" class="px-6 py-2.5 bg-slate-100 text-slate-500 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-200 transition-all active:scale-95">
                        Batal
                    </button>
                    <button onclick="saveBlankDeliveryOrder()" class="px-10 py-2.5 bg-blue-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-900 transition-all shadow-xl shadow-blue-500/20 active:scale-95 flex items-center gap-2">
                        SIMPAN & CETAK SJ <i class="fas fa-check-circle text-white/50 ml-1"></i>
                    </button>
                </div>
            </div>

            <!-- Scrollable Content -->
            <div class="flex-1 overflow-y-auto bg-slate-50/30 p-8 custom-scrollbar pb-32">
                <div class="max-w-6xl mx-auto space-y-8">
                    <div class="bg-white rounded-3xl p-8 border border-slate-100 shadow-sm space-y-8">
                        ${body}
                    </div>
                    
                    <div class="flex items-center gap-2 text-slate-400 text-[10px] font-black uppercase tracking-widest px-4">
                        <i class="fas fa-pencil-alt text-slate-300"></i> Local Draft Mode
                    </div>
                </div>
            </div>
        </div>
    `;
    addBlankDOItem();
};

window.addBlankDOItem = function () {
    const container = document.getElementById('blank_do_items');
    const id = Date.now();
    const div = document.createElement('div');
    div.id = `doi_${id}`;
    div.className = 'grid grid-cols-12 gap-2 bg-white p-3 rounded-xl border border-slate-100 shadow-sm items-center animate-in slide-in-from-left-2 duration-300';
    div.id = `doi_${id}`;
    div.className = 'grid grid-cols-12 gap-2 bg-white p-3 rounded-xl border border-slate-100 shadow-sm items-center animate-in slide-in-from-left-2 duration-300';
    div.innerHTML = `
        <div class="col-span-4 relative">
             <input type="text" id="doi_search_${id}" placeholder="Pilih Produk..." autocomplete="off"
                onclick="toggleBlankDOProductDropdown('${id}')" readonly
                class="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm font-bold text-slate-700 focus:border-blue-500 outline-none cursor-pointer bg-white transition-all">
             <input type="hidden" id="doi_name_${id}" class="doi-name">
             
             <div id="doi_dropdown_${id}" class="absolute left-0 mt-1 w-full bg-white border border-slate-100 rounded-xl shadow-2xl z-[200] hidden overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                <div class="p-2 border-b border-slate-50">
                    <input type="text" id="doi_dropdown_search_${id}" placeholder="Cari Kode/Nama..." onkeyup="filterBlankDOProductList('${id}', this.value)" class="w-full px-3 py-2 bg-slate-50 border-none rounded-lg text-xs font-bold outline-none focus:ring-2 focus:ring-blue-500/20">
                </div>
                <div class="max-h-48 overflow-y-auto p-1" id="doi_list_${id}">
                    <!-- Items injected here -->
                </div>
                <div class="p-2 border-t border-slate-50 bg-slate-50/10 space-y-1">
                    <button onclick="window.renderMasterProducts && window.renderMasterProducts()" class="w-full flex items-center gap-2 px-3 py-2 text-[10px] font-black text-slate-500 hover:bg-slate-50 hover:text-slate-900 rounded-lg transition-all uppercase tracking-widest">
                        <div class="w-6 h-6 flex items-center justify-center bg-slate-100 rounded-md">
                            <i class="fas fa-plus text-[8px]"></i>
                        </div>
                        Create a new Product
                    </button>
                    <button onclick="openAdvancedProductSearch('sj_kosong', '${id}')" class="w-full flex items-center gap-2 px-3 py-2 text-[10px] font-black text-slate-500 hover:bg-slate-50 hover:text-slate-900 rounded-lg transition-all uppercase tracking-widest">
                        <div class="w-6 h-6 flex items-center justify-center bg-slate-100 rounded-md">
                            <i class="fas fa-search text-[8px]"></i>
                        </div>
                        Advanced Search
                    </button>
                </div>
             </div>
        </div>
        <div class="col-span-2">
            <input type="text" placeholder="Unit" id="doi_unit_${id}" class="w-full border border-slate-200 rounded-lg px-2 py-2 text-xs font-bold text-slate-500 text-center uppercase doi-unit" value="PCS">
        </div>
        <div class="col-span-2">
            <input type="number" placeholder="Qty" min="1" value="1" id="doi_qty_${id}" oninput="updateCollyValue('${id}')" class="w-full border border-slate-200 rounded-lg px-2 py-2 text-sm text-center font-black text-slate-800 focus:border-blue-500 outline-none doi-qty shadow-inner">
        </div>
        <div class="col-span-3">
            <select id="doi_kemasan_${id}" onchange="updateCollyValue('${id}')" class="w-full border border-slate-200 rounded-lg px-2 py-2 text-[10px] font-bold text-slate-600 focus:border-blue-500 outline-none doi-kemasan appearance-none shadow-sm cursor-pointer">
                <option value="">-- Kemasan --</option>
                <option value="25 Kg">25 Kg</option>
                <option value="20 Kg">20 Kg</option>
                <option value="15 Kg">15 Kg</option>
                <option value="5 Kg">5 Kg</option>
                <option value="4 KG (800 Gram)">4 KG (800 Gram)</option>
            </select>
        </div>
        <div class="col-span-1 text-right">
            <button type="button" onclick="document.getElementById('doi_${id}').remove()" class="w-8 h-8 rounded-lg bg-red-50 text-red-500 hover:bg-red-500 hover:text-white transition-all flex items-center justify-center">
                <i class="fas fa-times text-xs"></i>
            </button>
        </div>
        <div class="col-span-12 flex items-center justify-between text-[10px] pt-1 border-t border-slate-50 mt-1">
            <div class="flex gap-4">
                <span class="text-slate-400">Colly: <strong id="doi_colly_${id}" class="text-blue-600 font-black ml-1">0</strong></span>
            </div>
            <input type="text" placeholder="Catatan Baris (opsional)" class="border-none bg-transparent p-0 text-[10px] font-medium text-slate-400 focus:ring-0 text-right doi-remark" style="width: 200px">
        </div>
    `;
    container.appendChild(div);
};

window.updateCollyValue = function (id) {
    const qty = parseFloat(document.getElementById(`doi_qty_${id}`).value) || 0;
    const kemasan = document.getElementById(`doi_kemasan_${id}`).value;
    const collyDisplay = document.getElementById(`doi_colly_${id}`);
    if (collyDisplay) {
        collyDisplay.innerText = calculateColly(qty, kemasan);
    }
};

window.toggleBlankDOProductDropdown = function (id) {
    const dropdown = document.getElementById(`doi_dropdown_${id}`);
    const isOpen = !dropdown.classList.contains('hidden');
    
    // Close all other product dropdowns
    document.querySelectorAll('[id^="doi_dropdown_"]').forEach(el => el.classList.add('hidden'));

    if (!isOpen) {
        dropdown.classList.remove('hidden');
        const searchInput = document.getElementById(`doi_dropdown_search_${id}`);
        searchInput.value = '';
        searchInput.focus();
        filterBlankDOProductList(id, '');
    }
};

window.filterBlankDOProductList = function (id, val) {
    const container = document.getElementById(`doi_list_${id}`);
    const allItems = db.read('inventoryItems') || [];
    
    // Inclusive filter for Finished Goods (Gudang Jadi)
    const products = allItems.filter(i => {
        const cat = (i.category || '').toUpperCase();
        return (cat.includes('FINISH') || cat.includes('PRODUK_JADI') || cat.includes('GUDANG_JADI') || cat.includes('FG')) && i.status !== 'INACTIVE';
    });
    const search = val.toLowerCase();
    
    container.innerHTML = products
        .filter(p => (p.itemName || '').toLowerCase().includes(search) || (p.itemCode || '').toLowerCase().includes(search))
        .map(p => `
            <div onclick="selectBlankDOProduct('${id}', '${p.itemName.replace(/'/g, "\\'")}', '${p.unit || 'PCS'}')" 
                class="px-3 py-2 text-xs font-bold text-slate-600 hover:bg-blue-50 hover:text-blue-600 rounded-lg cursor-pointer transition-colors m-0.5">
                <div class="flex justify-between items-center">
                    <span>${p.itemName}</span>
                    <span class="text-[9px] text-slate-300 font-black uppercase">${p.itemCode || ''}</span>
                </div>
            </div>
        `).join('') || '';

    if (search.length > 0) {
        container.innerHTML = `
            <div onclick="selectBlankDOFreeText('${id}')" 
                class="px-3 py-2 bg-blue-50/50 hover:bg-blue-100/50 border-b border-blue-100/50 mb-1 cursor-pointer transition-all">
                <div class="flex items-center gap-2">
                    <div class="w-6 h-6 rounded-md bg-blue-600 text-white flex items-center justify-center shadow-sm">
                        <i class="fas fa-keyboard text-[8px]"></i>
                    </div>
                    <div>
                        <div class="text-[8px] font-black text-blue-600 uppercase tracking-widest leading-none">Gunakan Teks Bebas</div>
                        <div class="text-[10px] font-bold text-slate-700 italic truncate" style="max-width: 150px">"${val}"</div>
                    </div>
                </div>
            </div>
            ${container.innerHTML}
        `;
    }

    if (!container.innerHTML) {
        container.innerHTML = '<div class="px-3 py-4 text-center text-[10px] font-bold text-slate-300 italic">Produk tidak ditemukan</div>';
    }
};

window.selectBlankDOFreeText = function (id) {
    const val = document.getElementById(`doi_dropdown_search_${id}`).value;
    document.getElementById(`doi_search_${id}`).value = val;
    document.getElementById(`doi_name_${id}`).value = val;
    document.getElementById(`doi_dropdown_${id}`).classList.add('hidden');
    
    // Auto focus qty
    document.getElementById(`doi_qty_${id}`).focus();
    document.getElementById(`doi_qty_${id}`).select();
};

window.selectBlankDOProduct = function (id, name, unit) {
    document.getElementById(`doi_search_${id}`).value = name;
    document.getElementById(`doi_name_${id}`).value = name;
    document.getElementById(`doi_unit_${id}`).value = unit;
    document.getElementById(`doi_dropdown_${id}`).classList.add('hidden');
    
    // Auto focus qty
    document.getElementById(`doi_qty_${id}`).focus();
    document.getElementById(`doi_qty_${id}`).select();
};

window.saveBlankDeliveryOrder = function () {
    const recipient = document.getElementById('do_recipient').value.trim();
    const address = document.getElementById('do_address').value.trim();
    const driver = document.getElementById('do_driver').value.trim();
    const vehicle = document.getElementById('do_vehicle').value.trim();
    const date = document.getElementById('do_date').value;
    const doNum = document.getElementById('do_number').value;
    const notes = document.getElementById('do_notes').value.trim();

    if (!recipient) { showToast('Nama penerima harus diisi.', 'error'); return; }

    const itemRows = document.getElementById('blank_do_items').querySelectorAll('[id^="doi_"]');
    const items = [];
    itemRows.forEach(row => {
        const idRow = row.id.split('_')[1];
        const name = row.querySelector('.doi-name')?.value.trim();
        const unit = row.querySelector('.doi-unit')?.value.trim() || 'PCS';
        const qty = parseFloat(row.querySelector('.doi-qty')?.value) || 0;
        const kemasan = row.querySelector('.doi-kemasan')?.value || '';
        const colly = row.querySelector(`#doi_colly_${idRow}`)?.innerText || 0;
        const remark = row.querySelector('.doi-remark')?.value.trim();
        
        if (name && qty > 0) items.push({
            name, unit, qty, remark,
            kemasan,
            colly
        });
    });

    if (items.length === 0) { showToast('Minimal satu item harus ditambahkan.', 'error'); return; }

    const saved = db.insert('deliveryOrders', {
        doNumber: doNum,
        date: date ? new Date(date).toISOString() : new Date().toISOString(),
        type: 'BLANK',
        status: 'PENDING',
        recipientName: recipient,
        address,
        driverName: driver,
        vehicleNo: vehicle,
        items,
        notes,
        invoiceId: null,
        invoiceNumber: null
    });

    showToast(`Surat Jalan ${doNum} berhasil dibuat.`);
    closeModal();
    renderSalesDeliveryOrders();
    setTimeout(() => printDeliveryOrder(saved.id), 300);
};

window.openDeliveryFromSOModal = function (soId = null) {
    const allSalesOrders = db.read('salesOrders') || [];
    const salesOrders = allSalesOrders.filter(s => {
        const st = (s.status || '').toUpperCase();
        return st === 'CONFIRMED' || st === 'PARTIAL_DELIVERED' || st === 'READY TO SHIP';
    });

    const customers = db.read('customers') || [];
    const eligibleCustomerIds = [...new Set(salesOrders.map(s => s.customerId))];
    const customerOptions = customers
        .filter(c => eligibleCustomerIds.includes(c.id))
        .map(c => `<option value="${c.id}">${c.name}</option>`)
        .join('');

    // Pre-calculate SO options if soId is provided
    let soOptions = '<option value="">-- Pilih Sales Order --</option>';
    let initialCustomerId = '';
    
    if (soId) {
        const targetSo = salesOrders.find(s => s.id === soId);
        if (targetSo) {
            initialCustomerId = targetSo.customerId;
            soOptions = salesOrders
                .filter(s => s.customerId === initialCustomerId)
                .map(s => `<option value="${s.id}" selected>[${s.soNumber}]</option>`)
                .join('');
        }
    }

    const body = `
        <div class="space-y-4">
            <div class="grid grid-cols-3 gap-4">
                <div>
                    <label class="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-1.5">No. Surat Jalan</label>
                    <input type="text" id="dos_number" value="${doGenNum()}" class="w-full border-2 border-slate-100 rounded-xl px-4 py-2.5 text-sm font-black text-blue-600 bg-slate-50 outline-none" readonly>
                </div>
                <div class="relative">
                    <label class="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-1.5">Pilih Customer <span class="text-red-400">*</span></label>
                    <input type="text" id="dos_customer_search" value="-- Pilih Customer --" readonly onclick="toggleSDODropdown('dos_customer_dropdown')"
                        class="w-full border-2 border-slate-100 rounded-xl px-4 py-2.5 text-sm font-bold text-slate-700 outline-none focus:border-blue-500 bg-white shadow-sm cursor-pointer transition-all">
                    <input type="hidden" id="dos_customer_id">
                    
                    <div id="dos_customer_dropdown" class="absolute left-0 mt-2 w-full bg-white border border-slate-100 rounded-2xl shadow-2xl z-[200] hidden overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                        <div class="p-3 border-b border-slate-50">
                            <input type="text" placeholder="Cari Customer..." onkeyup="filterSDOCustomerList(this.value)" class="w-full px-4 py-2 bg-slate-50 border-none rounded-lg text-xs font-bold outline-none focus:ring-2 focus:ring-blue-500/20">
                        </div>
                        <div class="max-h-60 overflow-y-auto p-1" id="dos_customer_list">
                            ${customers.filter(c => eligibleCustomerIds.includes(c.id)).map(c => `
                                <div onclick="selectSDOCustomer('${c.id}', '${c.name.replace(/'/g, "\\'")}')" 
                                    class="px-4 py-2.5 text-xs font-bold text-slate-600 hover:bg-blue-50 hover:text-blue-600 rounded-xl cursor-pointer transition-colors m-0.5">
                                    ${c.name}
                                </div>
                            `).join('')}
                        </div>
                    </div>
                </div>
                <div class="relative">
                    <label class="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-1.5">Pilih Sales Order <span class="text-red-400">*</span></label>
                    <input type="text" id="dos_so_search" value="-- Pilih Sales Order --" readonly onclick="toggleSDODropdown('dos_so_dropdown')"
                        class="w-full border-2 border-slate-100 rounded-xl px-4 py-2.5 text-sm font-bold text-slate-700 outline-none focus:border-blue-500 bg-white shadow-sm cursor-pointer transition-all">
                    <input type="hidden" id="dos_so_id">
                    
                    <div id="dos_so_dropdown" class="absolute left-0 mt-2 w-full bg-white border border-slate-100 rounded-2xl shadow-2xl z-[200] hidden overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                        <div class="p-3 border-b border-slate-50">
                            <input type="text" placeholder="Cari No. SO..." onkeyup="filterSDOSOList(this.value)" class="w-full px-4 py-2 bg-slate-50 border-none rounded-lg text-xs font-bold outline-none focus:ring-2 focus:ring-blue-500/20">
                        </div>
                        <div class="max-h-60 overflow-y-auto p-1" id="dos_so_list">
                            <div class="px-4 py-5 text-center text-[10px] font-bold text-slate-300 italic">Pilih Customer Dahulu</div>
                        </div>
                    </div>
                </div>
            </div>
            <div class="grid grid-cols-2 gap-4">
                <div>
                    <label class="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-1.5">Nama Penerima</label>
                    <input type="text" id="dos_recipient" class="w-full border-2 border-slate-100 rounded-xl px-4 py-2 text-sm font-bold text-slate-700 outline-none focus:border-blue-500 transition-all shadow-sm" placeholder="Nama penerima">
                </div>
                <div>
                    <label class="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-1.5">Alamat Pengiriman</label>
                    <input type="text" id="dos_address" class="w-full border-2 border-slate-100 rounded-xl px-4 py-2 text-sm font-bold text-slate-700 outline-none focus:border-blue-500 transition-all shadow-sm" placeholder="Alamat tujuan">
                </div>
            </div>
            <div class="grid grid-cols-3 gap-4">
                <div>
                    <label class="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-1.5">Driver / Kurir</label>
                    <input type="text" id="dos_driver" class="w-full border-2 border-slate-100 rounded-xl px-4 py-2 text-sm font-bold text-slate-700 outline-none focus:border-blue-500 transition-all shadow-sm" placeholder="Nama driver">
                </div>
                <div>
                    <label class="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-1.5">No. Ke kendaraan</label>
                    <input type="text" id="dos_vehicle" class="w-full border-2 border-slate-100 rounded-xl px-4 py-2 text-sm font-bold text-slate-700 outline-none focus:border-blue-500 transition-all shadow-sm" placeholder="B 1234 XY">
                </div>
                <div>
                    <label class="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-1.5">Tanggal</label>
                    <input type="date" id="dos_date" class="w-full border-2 border-slate-100 rounded-xl px-4 py-2 text-sm font-bold text-slate-700 outline-none focus:border-blue-500 transition-all shadow-sm" value="${new Date().toISOString().slice(0, 10)}">
                </div>
            </div>

            <div class="bg-white rounded-2xl border border-slate-100 overflow-hidden shadow-sm">
                <div class="bg-slate-50/50 px-4 py-3 border-b border-slate-100">
                    <h4 class="text-[10px] font-black text-slate-800 uppercase tracking-widest">Daftar Barang (Preview)</h4>
                </div>
                <div id="dos_items_preview" class="p-6 text-center text-slate-300 font-bold uppercase tracking-widest italic text-xs">
                    Pilih SO terlebih dahulu untuk melihat daftar barang.
                </div>
            </div>

            <div>
                <label class="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-1.5">Catatan Pengiriman</label>
                <textarea id="dos_notes" rows="2" class="w-full border-2 border-slate-100 rounded-xl px-4 py-2 text-sm font-bold text-slate-700 outline-none focus:border-blue-500 transition-all shadow-sm" placeholder="Instruksi khusus pengiriman..."></textarea>
            </div>
        </div>
    `;

    const listView = document.getElementById('sdo-list-view');
    const formView = document.getElementById('sdo-form-view');
    if (!listView || !formView) return;

    renderBreadcrumb(['Logistik & Distribusi', 'Pengiriman Pesanan', 'Buat Surat Jalan']);
    listView.classList.add('hidden');
    formView.classList.remove('hidden');

    formView.innerHTML = `
        <div class="animate-in fade-in slide-in-from-bottom-2 duration-500 flex flex-col bg-white rounded-3xl overflow-hidden shadow-2xl border border-slate-200 -m-4 sm:-m-6 h-[calc(100vh-64px)] font-sans">
            <!-- Header / Action Bar -->
            <div class="bg-white border-b border-slate-100 px-8 py-5 flex items-center justify-between shrink-0 sticky top-0 z-50">
                <div class="flex items-center gap-6">
                </div>
                
                <div class="flex items-center gap-3">
                    <button onclick="renderSalesDeliveryOrders()" class="px-6 py-2.5 bg-slate-100 text-slate-500 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-200 transition-all active:scale-95">
                        Batal
                    </button>
                    <button onclick="saveDeliveryFromSO()" class="px-10 py-2.5 bg-blue-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-900 transition-all shadow-xl shadow-blue-500/20 active:scale-95 flex items-center gap-2 font-black">
                        TERUSKAN KE GUDANG <i class="fas fa-truck-loading ml-1 text-white/50"></i>
                    </button>
                </div>
            </div>

            <!-- Scrollable Content -->
            <div class="flex-1 overflow-y-auto bg-slate-50/30 p-8 custom-scrollbar pb-32">
                <div class="max-w-6xl mx-auto space-y-8">
                    <div class="bg-white rounded-3xl p-8 border border-slate-100 shadow-sm space-y-8">
                        ${body}
                    </div>
                    
                    <div class="flex items-center gap-2 text-slate-400 text-[10px] font-black uppercase tracking-widest px-4">
                        <i class="fas fa-link text-slate-300"></i> Linked to Sales Order
                    </div>
                </div>
            </div>
        </div>
    `;

    window.toggleSDODropdown = function (id) {
        const dropdown = document.getElementById(id);
        const isOpen = !dropdown.classList.contains('hidden');
        
        // Close all first
        document.querySelectorAll('[id^="dos_"][id$="_dropdown"]').forEach(el => el.classList.add('hidden'));
        
        if (!isOpen) {
            dropdown.classList.remove('hidden');
            const searchInput = dropdown.querySelector('input[type="text"]');
            if (searchInput) {
                searchInput.value = '';
                searchInput.focus();
                if (id === 'dos_customer_dropdown') filterSDOCustomerList('');
                if (id === 'dos_so_dropdown') filterSDOSOList('');
            }
        }
    };

    window.filterSDOCustomerList = function (val) {
        const container = document.getElementById('dos_customer_list');
        const search = val.toLowerCase();
        const items = customers.filter(c => eligibleCustomerIds.includes(c.id));
        
        container.innerHTML = items
            .filter(c => c.name.toLowerCase().includes(search))
            .map(c => `
                <div onclick="selectSDOCustomer('${c.id}', '${c.name.replace(/'/g, "\\'")}')" 
                    class="px-4 py-2.5 text-xs font-bold text-slate-600 hover:bg-blue-50 hover:text-blue-600 rounded-xl cursor-pointer transition-colors m-0.5">
                    ${c.name}
                </div>
            `).join('') || '<div class="px-4 py-5 text-center text-[10px] font-bold text-slate-300 italic">Tidak ditemukan</div>';
    };

    window.selectSDOCustomer = function (id, name) {
        document.getElementById('dos_customer_id').value = id;
        document.getElementById('dos_customer_search').value = name;
        document.getElementById('dos_customer_dropdown').classList.add('hidden');
        
        // Reset SO
        document.getElementById('dos_so_id').value = '';
        document.getElementById('dos_so_search').value = '-- Pilih Sales Order --';
        
        // Load SOs for this customer
        const filteredSOs = salesOrders.filter(s => s.customerId === id);
        const soContainer = document.getElementById('dos_so_list');
        
        soContainer.innerHTML = filteredSOs.map(s => `
            <div onclick="selectSDOSO('${s.id}', '${s.soNumber}')" 
                class="px-4 py-2.5 text-xs font-bold text-slate-600 hover:bg-blue-50 hover:text-blue-600 rounded-xl cursor-pointer transition-colors m-0.5">
                [${s.soNumber}]
            </div>
        `).join('') || '<div class="px-4 py-5 text-center text-[10px] font-bold text-slate-300 italic">Tidak ada SO tersedia</div>';
        
        // Auto show SO dropdown for better flow
        setTimeout(() => toggleSDODropdown('dos_so_dropdown'), 100);
    };

    window.filterSDOSOList = function (val) {
        const customerId = document.getElementById('dos_customer_id').value;
        const container = document.getElementById('dos_so_list');
        if (!customerId) return;
        
        const search = val.toLowerCase();
        const filteredSOs = salesOrders.filter(s => s.customerId === customerId && s.soNumber.toLowerCase().includes(search));
        
        container.innerHTML = filteredSOs.map(s => `
            <div onclick="selectSDOSO('${s.id}', '${s.soNumber}')" 
                class="px-4 py-2.5 text-xs font-bold text-slate-600 hover:bg-blue-50 hover:text-blue-600 rounded-xl cursor-pointer transition-colors m-0.5">
                [${s.soNumber}]
            </div>
        `).join('') || '<div class="px-4 py-5 text-center text-[10px] font-bold text-slate-300 italic">Tidak ditemukan</div>';
    };

    window.selectSDOSO = function (id, number) {
        document.getElementById('dos_so_id').value = id;
        document.getElementById('dos_so_search').value = `[${number}]`;
        document.getElementById('dos_so_dropdown').classList.add('hidden');
        
        // Trigger item loading
        loadSOForDO();
    };

    if (soId) {
        const initSo = salesOrders.find(s => s.id === soId);
        if (initSo) {
            const initCust = customers.find(c => c.id === initSo.customerId);
            selectSDOCustomer(initCust.id, initCust.name);
            selectSDOSO(initSo.id, initSo.soNumber);
        }
    }
};

window.loadSOForDO = function () {
    const soId = document.getElementById('dos_so_id').value;
    if (!soId) {
        document.getElementById('dos_items_preview').innerHTML = '<span class="text-slate-300">Pilih SO terlebih dahulu</span>';
        return;
    }

    const so = db.findById('salesOrders', soId);
    if (!so) return;

    const customer = db.findById('customers', so.customerId);
    document.getElementById('dos_recipient').value = customer?.name || '';
    document.getElementById('dos_address').value = customer?.address || '';

    const preview = document.getElementById('dos_items_preview');
    if (so.items && so.items.length > 0) {
        preview.innerHTML = `
            <table class="w-full text-left border-collapse">
                <thead class="bg-slate-50/30 text-[9px] font-black text-slate-400 uppercase tracking-widest">
                    <tr>
                        <th class="px-4 py-3 border-b border-slate-100 w-12 text-center">#</th>
                        <th class="px-4 py-3 border-b border-slate-100">Barang / Keterangan</th>
                        <th class="px-4 py-3 border-b border-slate-100 text-center w-24">Order</th>
                        <th class="px-4 py-3 border-b border-slate-100 text-center w-36">Kemasan</th>
                        <th class="px-4 py-3 border-b border-slate-100 text-center w-20">Colly</th>
                    </tr>
                </thead>
                <tbody class="divide-y divide-slate-50">
                    ${so.items.map((i, idx) => `
                        <tr>
                            <td class="px-4 py-3 text-center text-slate-400 font-bold">${idx + 1}</td>
                            <td class="px-4 py-3">
                                <div class="text-sm font-black text-slate-800 uppercase tracking-tight">${i.prodText || '-'}</div>
                            </td>
                            <td class="px-4 py-3 text-center">
                                <span class="bg-slate-50 px-3 py-1.5 rounded-lg text-sm font-black text-slate-700" id="dosi_qty_${idx}" data-qty="${i.qty}">${(i.qty || 0).toLocaleString('id-ID')}</span>
                            </td>
                            <td class="px-4 py-3">
                                <select onchange="window.updateSOColly('${idx}')" id="dosi_kemasan_${idx}" class="w-full border border-slate-200 rounded-lg px-2 py-1.5 text-[10px] font-bold text-slate-600 appearance-none shadow-sm cursor-pointer focus:border-blue-500 transition-all outline-none">
                                    <option value="">-- Pilih --</option>
                                    <option value="25 Kg">25 Kg</option>
                                    <option value="20 Kg">20 Kg</option>
                                    <option value="15 Kg">15 Kg</option>
                                    <option value="5 Kg">5 Kg</option>
                                    <option value="4 KG (800 Gram)">4 KG (800 Gram)</option>
                                </select>
                            </td>
                            <td class="px-4 py-3 text-center font-black text-blue-600 text-sm shadow-inner" id="dosi_colly_display_${idx}">0</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        `;

        window.updateSOColly = function (idx) {
            const qtyBox = document.getElementById(`dosi_qty_${idx}`);
            const qty = parseFloat(qtyBox?.dataset.qty) || 0;
            const kemasan = document.getElementById(`dosi_kemasan_${idx}`).value;
            const display = document.getElementById(`dosi_colly_display_${idx}`);
            if (display) {
                display.innerText = calculateColly(qty, kemasan);
            }
        };
    } else {
        preview.innerHTML = `<p class="py-12 text-slate-300 font-bold uppercase italic tracking-widest">SO tidak memiliki item.</p>`;
    }
};

window.saveDeliveryFromSO = function () {
    try {
        const soId = document.getElementById('dos_so_id')?.value;
        const recipient = document.getElementById('dos_recipient')?.value.trim();
        const address = document.getElementById('dos_address')?.value.trim();
        const driver = document.getElementById('dos_driver')?.value.trim();
        const vehicle = document.getElementById('dos_vehicle')?.value.trim();
        const date = document.getElementById('dos_date')?.value;
        const notes = document.getElementById('dos_notes')?.value.trim();

        if (!soId) { showToast('Pilih Sales Order.', 'error'); return; }
        if (!recipient) { showToast('Penerima harus diisi.', 'error'); return; }

        const so = db.findById('salesOrders', soId);
        if (!so) { showToast('Sales Order tidak ditemukan.', 'error'); return; }
    const rows = document.getElementById('dos_items_preview').querySelectorAll('tbody tr');
    const items = [];
    rows.forEach((row, idx) => {
        const qtyBox = row.querySelector(`#dosi_qty_${idx}`);
        const name = row.cells[1].innerText.split('\n')[0];
        const qty = parseFloat(qtyBox.dataset.qty) || 0;
        const kemasan = row.querySelector(`#dosi_kemasan_${idx}`)?.value || '';
        const colly = row.querySelector(`#dosi_colly_display_${idx}`)?.innerText || 0;

        const soItem = so.items[idx]; 

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

    const doNum = document.getElementById('dos_number').value;
    const saved = db.insert('deliveryOrders', {
        doNumber: doNum,
        date: date ? new Date(date).toISOString() : new Date().toISOString(),
        status: 'PENDING',
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

        showToast(`Surat Jalan ${doNum} berhasil diproses ke gudang.`);
        renderSalesDeliveryOrders();
    } catch (err) {
        console.error('Save Delivery Error:', err);
        showToast('Gagal memproses ke gudang: ' + err.message, 'error');
    }
};

// ==========================================
// PRINT DELIVERY ORDER (MODERN TEMPLATE)
// ==========================================
window.printDeliveryOrder = function (id) {
    const d = db.findById('deliveryOrders', id);
    if (!d) { showToast('Data tidak ditemukan.', 'error'); return; }

    const cfg = JSON.parse(localStorage.getItem('unityerp_company_config') || '{}');
    const company = {
        name: cfg.companyName || (typeof CONFIG !== 'undefined' ? CONFIG.companyName : 'PT. NAMA PERUSAHAAN'),
        address: cfg.companyAddress || (typeof CONFIG !== 'undefined' ? CONFIG.companyAddress : 'Jl. Alamat Perusahaan'),
        phone: cfg.companyPhone || (typeof CONFIG !== 'undefined' ? CONFIG.companyPhone : '-'),
        email: cfg.companyEmail || (typeof CONFIG !== 'undefined' ? CONFIG.companyEmail : '-'),
        logo: cfg.logo || (typeof CONFIG !== 'undefined' ? CONFIG.logo : '')
    };

    // Cek apakah customer Non-Tax (NT) dari SO terkait
    let isNonTax = false;
    if (d.salesOrderId) {
        const so = db.findById('salesOrders', d.salesOrderId);
        if (so && so.isTax === false) isNonTax = true;
    }
    if (!isNonTax && d.soNumber && d.soNumber.includes('-B-')) isNonTax = true;

    const itemsTable = `
        <table style="width:100%;border-collapse:collapse;margin-top:20px;">
            <thead>
                <tr style="background:#f1f5f9;border-bottom:2px solid #334155;">
                    <th style="padding:10px 8px;text-align:center;font-size:10px;text-transform:uppercase;width:40px">No</th>
                    <th style="padding:10px 8px;text-align:left;font-size:10px;text-transform:uppercase">Deskripsi Barang</th>
                    <th style="padding:10px 8px;text-align:center;font-size:10px;text-transform:uppercase;width:80px">Jumlah</th>
                    <th style="padding:10px 8px;text-align:center;font-size:10px;text-transform:uppercase;width:80px">Satuan</th>
                    <th style="padding:10px 8px;text-align:center;font-size:10px;text-transform:uppercase;width:100px">Kemasan</th>
                    <th style="padding:10px 8px;text-align:center;font-size:10px;text-transform:uppercase;width:70px">Colly</th>
                </tr>
            </thead>
            <tbody>
                ${(d.items || []).map((item, i) => `
                    <tr style="border-bottom:1px solid #e2e8f0;">
                        <td style="padding:6px 8px;text-align:center;font-size:10px;">${i+1}</td>
                        <td style="padding:6px 8px;text-align:left;font-size:10px;">
                            <div style="font-weight:bold;text-transform:uppercase">${item.name || item.prodText || '-'}</div>
                            ${item.remark ? `<div style="font-size:8px;color:#64748b;margin-top:2px;">${item.remark}</div>` : ''}
                        </td>
                        <td style="padding:6px 8px;text-align:center;font-size:11px;font-weight:900">${(item.qty || 0).toLocaleString('id-ID')}</td>
                        <td style="padding:6px 8px;text-align:center;font-size:10px;font-weight:bold;color:#64748b">${item.unit || 'PCS'}</td>
                        <td style="padding:6px 8px;text-align:center;font-size:10px;color:#334155">${item.kemasan === '800 Gram' ? '4 KG (800 Gram)' : (item.kemasan || '-')}</td>
                        <td style="padding:6px 8px;text-align:center;font-size:11px;font-weight:bold;color:#2563eb">${item.colly || '-'}</td>
                    </tr>
                `).join('')}
                 ${[...Array(Math.max(0, 5 - (d.items?.length || 0)))].map(() => `
                    <tr style="border-bottom:1px solid #e2e8f0;height:25px">
                        <td style="padding:6px 8px;">&nbsp;</td>
                        <td style="padding:6px 8px;"></td>
                        <td style="padding:6px 8px;"></td>
                        <td style="padding:6px 8px;"></td>
                        <td style="padding:6px 8px;"></td>
                        <td style="padding:6px 8px;"></td>
                    </tr>
                `).join('')}
            </tbody>
        </table>`;

    const printHtml = `
        <!DOCTYPE html>
        <html>
        <head>
            <title>Surat Jalan ${d.doNumber}</title>
            <style>
                @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;700;900&display=swap');
                * { margin:0; padding:0; box-sizing:border-box; font-family:'Inter', sans-serif; }
                body { padding:20px; color:#1e293b; background:#e2e8f0; margin:0; }
                .header { display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:15px; border-bottom:3px solid #0f172a; padding-bottom:10px; }
                .company-name { font-size:20px; font-weight:900; color:#0f172a; text-transform:uppercase; letter-spacing:-0.5px; }
                .company-info { font-size:9px; color:#64748b; margin-top:3px; line-height:1.4; font-weight:500; }
                .doc-type { text-align:right; }
                .doc-type h1 { font-size:24px; font-weight:900; color:#0f172a; margin:0; line-height:1; }
                .doc-no { font-size:12px; font-weight:700; color:#2563eb; margin-top:3px; font-family:monospace; }
                .meta-table { width:100%; border-collapse:collapse; margin-bottom:10px; }
                .meta-table td { padding:3px 0; font-size:10px; vertical-align:top; }
                .label { font-weight:bold; color:#64748b; text-transform:uppercase; font-size:8px; width:100px; }
                .value { font-weight:700; color:#0f172a; text-transform:uppercase; }
                .signatures { margin-top:15px; display:grid; grid-template-columns:1fr 1fr 1fr; gap:20px; text-align:center; }
                .sig-box { border:1px solid #e2e8f0; border-radius:8px; padding:10px; }
                .sig-title { font-size:9px; font-weight:900; color:#94a3b8; text-transform:uppercase; margin-bottom:40px; letter-spacing:1px; }
                .sig-line { border-top:2px solid #0f172a; width:80%; margin:0 auto 3px; }
                .sig-name { font-size:10px; font-weight:700; color:#0f172a; }
                .notes { margin-top:10px; padding:10px; background:#f8fafc; border:1px solid #e2e8f0; border-left:4px solid #64748b; border-radius:6px; font-size:9px; color:#475569; line-height:1.4; }
                @page { size: landscape; margin: 10mm; }
                .page { page-break-after: always; background:#fff; padding:30px; margin-bottom:30px; border:1px solid #cbd5e1; border-radius:8px; box-shadow:0 4px 20px rgba(0,0,0,0.1); }
                .page:last-child { page-break-after: auto; margin-bottom:0; }
                @media print { body { padding:0; background:#fff; } .page { margin:0; padding:0; border:none; border-radius:0; box-shadow:none; } .sig-box { border:1px solid #000; } .header { border-bottom:2px solid #000; } .copy-label { display: none !important; } }
            </style>
        </head>
        <body>
            ${buildPage('CUSTOMER')}
            ${buildPage('GUDANG')}
        </body>
        </html>
    `;

    function buildPage(copyType) {
        const isGudang = copyType === 'GUDANG';
        return `
            <div class="page">
                <div class="header">
                    <div style="display:flex;align-items:center;gap:12px;">
                        ${!isNonTax && company.logo && !isGudang ? `<img src="${company.logo}" style="height:50px;width:auto;object-fit:contain;" alt="Logo">` : ''}
                        <div>
                            <div class="company-name">${company.name}</div>
                            ${!isNonTax && !isGudang ? `<div class="company-info">${company.address}<br>Tel: ${company.phone} | ${company.email}</div>` : ''}
                        </div>
                    </div>
                    <div class="doc-type">
                        <h1>SURAT JALAN</h1>
                        <div class="doc-no"># ${d.doNumber}</div>
                        <div class="copy-label" style="font-size:8px;font-weight:900;color:#94a3b8;text-transform:uppercase;letter-spacing:2px;margin-top:4px;border:1px solid #e2e8f0;border-radius:4px;padding:2px 8px;display:inline-block;">Copy: ${copyType}</div>
                    </div>
                </div>

                ${!isGudang ? `
                <div style="display:grid; grid-template-columns:1fr 1fr; gap:40px; margin-bottom:20px;">
                    <table class="meta-table">
                        <tr><td class="label">Kepada Yth</td><td class="value" style="font-size:14px;color:#2563eb">${d.recipientName || '-'}</td></tr>
                        <tr><td class="label">Alamat</td><td class="value" style="font-weight:500;color:#475569">${d.address || '-'}</td></tr>
                        <tr><td class="label">Ref Order</td><td class="value">${d.soNumber || d.invoiceNumber || '-'}</td></tr>
                    </table>
                    <table class="meta-table">
                        <tr><td class="label">Tanggal</td><td class="value">${doDate(d.date)}</td></tr>
                        <tr><td class="label">Driver</td><td class="value">${d.driverName || '-'}</td></tr>
                        <tr><td class="label">Kendaraan</td><td class="value">${d.vehicleNo || '-'}</td></tr>
                    </table>
                </div>
                ` : ''}

                ${itemsTable}

                ${!isGudang ? `
                <div style="display:grid; grid-template-columns:1.5fr 1fr; gap:40px;">
                    <div class="notes">
                        <strong style="display:block;margin-bottom:5px;color:#0f172a;text-transform:uppercase;font-size:9px">Catatan Pengiriman:</strong>
                        ${d.notes || 'Hati-hati dalam pengiriman barang, pastikan barang sesuai dan diterima oleh pihak yang berwenang.'}
                    </div>
                    <div class="notes" style="background:#fff;border-left:4px solid #2563eb">
                        <strong style="display:block;margin-bottom:5px;color:#0f172a;text-transform:uppercase;font-size:9px">Info Warehouse:</strong>
                        Barang ini telah melewati proses verifikasi standar unit gudang kami.
                    </div>
                </div>

                <div class="signatures">
                    <div class="sig-box">
                        <div class="sig-title">Diterima Oleh</div>
                        <div class="sig-line"></div>
                        <div class="sig-name">Penerima / Pelanggan</div>
                    </div>
                    <div class="sig-box">
                        <div class="sig-title">Pengemudi</div>
                        <div class="sig-line"></div>
                        <div class="sig-name">${d.driverName || 'Driver / Kurir'}</div>
                    </div>
                    <div class="sig-box">
                        <div class="sig-title">Hormat Kami</div>
                        <div class="sig-line"></div>
                        <div class="sig-name">${company.name}</div>
                    </div>
                </div>
                ` : ''}
            </div>
        `;
    }

    const pw = window.open('', '_blank', 'width=800,height=1000');
    if (pw) {
        pw.document.write(printHtml);
        pw.document.close();
        pw.onload = () => { pw.focus(); pw.print(); };
    }
};

// ==========================================
// WAREHOUSE LOGISTICS MANAGEMENT (NEW UI)
// ==========================================
window.renderWarehouseDeliveryOrders = function () {
    document.getElementById('pageTitle').innerText = 'Logistics / Delivery Manage';
    const mc = document.getElementById('main-content');
    
    if (!window._whDoActiveTab) window._whDoActiveTab = 'pending';
    if (!window.currentFilters.inventoryDelivery) window.currentFilters.inventoryDelivery = { start: '', end: '', search: '' };
    const filters = window.currentFilters.inventoryDelivery;

    let doList = db.read('deliveryOrders').sort((a, b) => new Date(b.date) - new Date(a.date));

    if (filters.search) {
        const s = filters.search.toLowerCase();
        doList = doList.filter(d => 
            d.doNumber?.toLowerCase().includes(s) || 
            d.recipientName?.toLowerCase().includes(s) || 
            d.soNumber?.toLowerCase().includes(s)
        );
    }
    if (filters.start) {
        const dd = new Date(filters.start); dd.setHours(0,0,0,0);
        doList = doList.filter(q => new Date(q.date) >= dd);
    }
    if (filters.end) {
        const dd = new Date(filters.end); dd.setHours(23,59,59,999);
        doList = doList.filter(q => new Date(q.date) <= dd);
    }

    let filteredDOs = window._whDoActiveTab === 'pending' 
        ? doList.filter(d => d.status !== 'SHIPPED') 
        : doList.filter(d => d.status === 'SHIPPED');

    const rows = filteredDOs.map(d => {
        let hasIssue = false;
        (d.items || []).forEach(item => {
            if (item.inventoryItemId && !db.validateInventoryStock(item.inventoryItemId, item.qty)) {
                hasIssue = true;
            }
        });

        const statusHtml = d.status === 'SHIPPED' 
            ? '<span class="px-3 py-1 bg-green-50 text-green-600 border border-green-100 rounded-full text-[10px] font-black tracking-tight shadow-sm">SHIPPED</span>'
            : (hasIssue 
                ? '<span class="px-3 py-1 bg-red-50 text-red-600 border border-red-100 rounded-full text-[10px] font-black tracking-tight shadow-sm animate-pulse">STOK KURANG</span>'
                : `<span class="px-3 py-1 bg-blue-50 text-blue-600 border border-blue-100 rounded-full text-[10px] font-black tracking-tight shadow-sm uppercase">${d.status || 'WAITING'}</span>`);

        const actionHtml = `
            <div class="inline-block relative w-full md:w-[130px]">
                <select class="w-full bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 font-bold text-xs rounded-xl pl-3 pr-8 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer appearance-none transition-all shadow-sm" onchange="handleDOAction(this, '${d.id}')">
                    <option value="" disabled selected>Pilih Aksi...</option>
                    ${window._whDoActiveTab === 'pending' ? `<option value="approve">Approve & Kirim</option>` : `<option value="view">Lihat Detail</option>`}
                    <option value="print">Cetak Surat Jalan</option>
                </select>
                <div class="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3 text-slate-400">
                    <i class="fas fa-chevron-down text-[10px]"></i>
                </div>
            </div>
        `;

        return `
            <tr class="border-b border-slate-50 hover:bg-slate-50/50 transition-colors group">
                <td class="px-6 py-4">
                    <div class="text-sm font-black text-slate-900 mb-1 uppercase tracking-tight">${d.recipientName || '-'}</div>
                    <div class="text-[10px] font-black text-blue-600 tracking-[0.1em] uppercase shadow-sm inline-block px-1.5 py-0.5 bg-blue-50 rounded">${d.soNumber || d.invoiceNumber || '-'}</div>
                </td>
                <td class="px-6 py-4">
                    <div class="text-[10px] text-slate-400 font-black uppercase tracking-widest mb-1">Tanggal SJ</div>
                    <div class="text-xs font-bold text-slate-700">${doDate(d.date)}</div>
                </td>
                <td class="px-6 py-4 text-center">${statusHtml}</td>
                <td class="px-6 py-4">
                    <div class="text-[10px] font-mono text-slate-400 font-black tracking-[0.2em] mb-1">DOKUMEN #</div>
                    <div class="text-xs font-black text-slate-800 tracking-tight group-hover:text-blue-600 transition-colors">${d.doNumber}</div>
                </td>
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
                        <input type="text" id="do_header_search" onkeyup="if(event.key==='Enter') filterDOTable()" value="${filters.search || ''}" placeholder="Cari Pelanggan, No. SJ, atau Ref Order..." 
                            class="w-full pl-12 pr-4 py-3 bg-white border-2 border-slate-100 rounded-2xl text-sm font-bold text-slate-600 focus:border-blue-500 outline-none transition-all shadow-sm">
                    </div>
                    
                    <div class="flex items-center gap-3">
                         <div class="relative group" id="do_date_filter_container">
                            <button onclick="toggleDODateDropdown()" class="flex items-center bg-white border-2 border-slate-100 rounded-2xl overflow-hidden hover:border-blue-300 transition-all shadow-sm h-[48px] group">
                                <span class="bg-slate-50 px-4 h-full flex items-center text-slate-500 group-hover:bg-slate-100 transition-colors">
                                    <i class="fas fa-calendar-alt text-xs"></i>
                                </span>
                                <span class="px-4 text-[11px] font-black text-slate-400 uppercase tracking-widest">Date Range</span>
                                <span class="pr-3 text-slate-400 group-hover:text-blue-500 transition-colors"><i class="fas fa-chevron-down text-[10px]"></i></span>
                            </button>
                            
                            <div id="do_date_dropdown" class="absolute right-0 mt-3 w-72 bg-white border border-slate-100 rounded-3xl shadow-2xl z-[200] hidden p-6 animate-in zoom-in-95 duration-200">
                                <h4 class="text-[10px] font-black text-slate-800 uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
                                    <span class="w-1.5 h-1.5 bg-blue-600 rounded-full"></span> PERIODE SJ
                                </h4>
                                <div class="space-y-4">
                                    <div class="space-y-1.5">
                                        <label class="block text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Dari Tanggal</label>
                                        <input type="date" id="do_header_start" value="${filters.start}" class="w-full border-2 border-slate-50 rounded-xl px-4 py-2 text-xs font-black text-slate-700 bg-slate-50/50 focus:bg-white focus:border-blue-500 outline-none transition-all">
                                    </div>
                                    <div class="space-y-1.5">
                                        <label class="block text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Sampai Tanggal</label>
                                        <input type="date" id="do_header_end" value="${filters.end}" class="w-full border-2 border-slate-50 rounded-xl px-4 py-2 text-xs font-black text-slate-700 bg-slate-50/50 focus:bg-white focus:border-blue-500 outline-none transition-all">
                                    </div>
                                    <div class="flex gap-2 pt-2">
                                        <button onclick="applyDOHeaderDateFilter()" class="flex-1 bg-blue-600 text-white py-2.5 rounded-xl text-[10px] font-black uppercase tracking-[0.2em] hover:bg-slate-900 transition-all shadow-md active:scale-95">Filter</button>
                                        <button onclick="resetDOHeaderDateFilter()" class="flex-1 bg-slate-50 text-slate-400 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-[0.2em] hover:bg-slate-100 transition-all">Reset</button>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div class="flex bg-slate-100 p-1.5 rounded-2xl shadow-inner ml-2">
                            <button onclick="window._whDoActiveTab='pending'; renderWarehouseDeliveryOrders()" 
                                class="px-6 py-2 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all ${window._whDoActiveTab === 'pending' ? 'bg-white text-blue-600 shadow-md transform scale-105 z-10' : 'text-slate-400 hover:text-slate-600'}">
                                Antrean
                            </button>
                            <button onclick="window._whDoActiveTab='history'; renderWarehouseDeliveryOrders()" 
                                class="px-6 py-2 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all ${window._whDoActiveTab === 'history' ? 'bg-white text-blue-600 shadow-md transform scale-105 z-10' : 'text-slate-400 hover:text-slate-600'}">
                                Riwayat
                            </button>
                        </div>
                    </div>
                </div>

                <div class="overflow-x-auto min-h-[500px]">
                    <table class="w-full text-left border-collapse">
                        <thead>
                            <tr class="bg-slate-50/30 text-slate-500 font-black uppercase text-[10px] tracking-[0.2em] border-b border-slate-100">
                                <th class="px-6 py-5">Tujuan / Ref Order</th>
                                <th class="px-6 py-5">Logistics Info</th>
                                <th class="px-6 py-5 text-center">Status Barang</th>
                                <th class="px-6 py-5">Ref Dokumen</th>
                                <th class="px-6 py-5 text-right w-[180px]">Navigasi</th>
                            </tr>
                        </thead>
                        <tbody class="divide-y divide-slate-50">
                            ${rows || `<tr><td colspan="5" class="py-40 text-center text-slate-300">Data tidak ditemukan.</td></tr>`}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    `;
};

window.handleDOAction = function(select, id) {
    const action = select.value;
    if (!action) return;
    if (action === 'approve') openConfirmShipmentModal(id);
    else if (action === 'view') viewShipmentDetails(id);
    else if (action === 'print') printDeliveryOrder(id);
    select.value = '';
};

window.filterDOTable = () => {
    window.currentFilters.inventoryDelivery.search = document.getElementById('do_header_search').value;
    renderWarehouseDeliveryOrders();
};

window.toggleDODateDropdown = () => document.getElementById('do_date_dropdown').classList.toggle('hidden');

window.applyDOHeaderDateFilter = () => {
    window.currentFilters.inventoryDelivery.start = document.getElementById('do_header_start').value;
    window.currentFilters.inventoryDelivery.end = document.getElementById('do_header_end').value;
    renderWarehouseDeliveryOrders();
};

window.resetDOHeaderDateFilter = () => {
    window.currentFilters.inventoryDelivery.start = '';
    window.currentFilters.inventoryDelivery.end = '';
    renderWarehouseDeliveryOrders();
};

window.openConfirmShipmentModal = function(id) {
    const d = db.findById('deliveryOrders', id);
    if (!d) return;

    let issues = [];
    const itemRows = (d.items || []).map(i => {
        const stock = i.inventoryItemId ? db.getInventoryStock(i.inventoryItemId) : 0;
        const isOk = !i.inventoryItemId || stock >= i.qty;
        if (!isOk) issues.push(i.name);

        return `
            <tr class="border-b border-slate-50 last:border-0">
                <td class="py-4 px-3">
                    <span class="block font-black text-slate-800 text-xs uppercase tracking-tight">${i.name}</span>
                    <span class="text-[9px] text-slate-400 font-bold uppercase tracking-widest">${i.kemasan || '-'}</span>
                </td>
                <td class="py-4 px-3 text-right">
                    <div class="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Qty Kirim</div>
                    <div class="font-black text-blue-600 text-sm italic">${i.qty}</div>
                </td>
                <td class="py-4 px-3 text-right">
                    <div class="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Di Gudang</div>
                    <div class="font-black ${isOk ? 'text-slate-800' : 'text-red-600 animate-pulse'} text-sm">${stock}</div>
                </td>
                <td class="py-4 px-3 text-center">
                    ${isOk 
                        ? '<span class="w-8 h-8 bg-green-50 text-green-500 rounded-full flex items-center justify-center mx-auto shadow-sm"><i class="fas fa-check text-[10px]"></i></span>' 
                        : '<span class="w-8 h-8 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto shadow-sm animate-bounce"><i class="fas fa-times text-[10px]"></i></span>'}
                </td>
            </tr>
        `;
    }).join('');

    const hasIssue = issues.length > 0;
    const body = `
        <div class="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-400">
            <div class="${hasIssue ? 'bg-red-50 border-red-100' : 'bg-blue-50 border-blue-100'} border-2 rounded-3xl p-5 flex items-start gap-4 shadow-sm relative overflow-hidden">
                <div class="relative z-10 w-12 h-12 ${hasIssue ? 'bg-red-600' : 'bg-blue-600'} rounded-2xl flex items-center justify-center shrink-0 shadow-lg text-white">
                    <i class="fas ${hasIssue ? 'fa-exclamation-triangle' : 'fa-truck-loading'} text-sm"></i>
                </div>
                <div class="relative z-10 flex-1">
                    <h4 class="text-xs font-black ${hasIssue ? 'text-red-900' : 'text-blue-900'} tracking-widest uppercase mb-1">Verifikasi Logistics</h4>
                    <p class="text-[10px] ${hasIssue ? 'text-red-700' : 'text-blue-700'} font-bold leading-relaxed uppercase tracking-tight">
                        ${hasIssue ? 'PERINGATAN: Stok tidak mencukupi untuk beberapa item. Lanjutkan dengan resiko stok negatif?' : 'Seluruh barang tersedia. Konfirmasi untuk mencetak surat jalan final dan memotong stok.'}
                    </p>
                </div>
            </div>

            <div class="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
                <table class="w-full text-left">
                    <thead class="bg-slate-50/50 border-b border-slate-100">
                        <tr class="text-[9px] font-black text-slate-400 uppercase tracking-widest">
                            <th class="py-3.5 px-3">Item Produk</th>
                            <th class="py-3.5 px-3 text-right">Kirim</th>
                            <th class="py-3.5 px-3 text-right">Fisik</th>
                            <th class="py-3.5 px-3 text-center w-20">Valid</th>
                        </tr>
                    </thead>
                    <tbody class="divide-y divide-slate-50">${itemRows}</tbody>
                </table>
            </div>

            <div class="grid grid-cols-2 gap-4">
                <div class="space-y-1.5">
                    <label class="block text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Nama Driver Konfirmasi</label>
                    <input type="text" id="dos_track_driver" value="${d.driverName || ''}" class="w-full border-2 border-slate-50 rounded-2xl px-4 py-2.5 text-xs font-black text-slate-700 bg-slate-50 focus:bg-white focus:border-blue-500 outline-none transition-all shadow-sm uppercase tracking-tight">
                </div>
                <div class="space-y-1.5">
                    <label class="block text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">No. Polisi Kendaraan</label>
                    <input type="text" id="dos_track_no" placeholder="Contoh: B 1234 XY" value="${d.vehicleNo || ''}" class="w-full border-2 border-slate-50 rounded-2xl px-4 py-2.5 text-xs font-black text-slate-700 bg-slate-50 focus:bg-white focus:border-blue-500 outline-none transition-all shadow-sm">
                </div>
            </div>
        </div>
    `;

    const footer = `
        <div class="flex items-center justify-end gap-4 w-full">
            <button onclick="closeModal()" class="text-xs font-black text-slate-400 uppercase tracking-widest hover:text-slate-600 transition-colors">Batal</button>
            <button onclick="confirmShipment('${id}')" 
                class="bg-blue-600 hover:bg-slate-900 text-white px-10 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl transition-all active:scale-95 flex items-center gap-2">
                ${hasIssue ? 'PROSES (STOK MINUS)' : 'KONFIRMASI PENGIRIMAN'}
            </button>
        </div>
    `;
    showModal('Persetujuan Pengeluaran Barang', body, footer, 'max-w-xl');
};

window.confirmShipment = async function(id) {
    const d = db.findById('deliveryOrders', id);
    if (!d) return;

    const driverName = document.getElementById('dos_track_driver')?.value || d.driverName;
    const vehicleNo = document.getElementById('dos_track_no')?.value || d.vehicleNo;

    try {
        // Use Phase 2 API for Atomic Transaction (Stock Deduction + Journal HPP + Status Update)
        await api.shipDeliveryOrder(id, { driverName, vehicleNo });
        
        // Optimistic UI updates
        db.update('deliveryOrders', id, {
            status: 'SHIPPED',
            shippedAt: new Date().toISOString(),
            driverName: driverName,
            vehicleNo: vehicleNo
        });

        if (d.salesOrderId) db.update('salesOrders', d.salesOrderId, { status: 'DELIVERED' });
        
        showToast(`Pengiriman SJ ${d.doNumber} berhasil dikonfirmasi!`, 'success');
        closeModal();
        
        if (typeof renderWarehouseDeliveryOrders === 'function') {
            renderWarehouseDeliveryOrders();
        } else if (typeof renderSalesDeliveryOrders === 'function') {
            renderSalesDeliveryOrders();
        }
    } catch (err) {
        showToast(err.message, 'error');
    }
};

window.viewDO = (id) => {
    const d = db.findById('deliveryOrders', id);
    const mainContent = document.getElementById('main-content');
    
    // Set breadcrumb
    document.getElementById('pageTitle').innerText = 'Delivery Order Details';

    const itemRows = (d.items || []).map(i => `
        <tr class="hover:bg-slate-50 transition-colors">
            <td class="py-5 px-8">
                <div class="font-black text-slate-800 text-sm uppercase">${i.itemName}</div>
                <div class="text-[9px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">ID: ${i.productId?.slice(0, 8) || 'N/A'}</div>
            </td>
            <td class="py-5 px-6 text-right font-black text-slate-900">${i.qty}</td>
            <td class="py-5 px-6 text-center">
                <span class="px-3 py-1 bg-slate-100 rounded-full text-[10px] font-black text-slate-500 uppercase tracking-widest">
                    ${i.unit || 'PCS'}
                </span>
            </td>
            <td class="py-5 px-6 text-center font-bold text-slate-700">${i.colly || '-'}</td>
        </tr>
    `).join('');

    const printableBody = `
        <div class="max-w-5xl mx-auto space-y-8 my-8 pb-20 px-6">
            <!-- Header Card -->
            <div class="bg-slate-900 rounded-[2.5rem] p-10 text-white shadow-2xl relative overflow-hidden">
                <div class="absolute top-0 right-0 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl -mr-20 -mt-20"></div>
                <div class="relative z-10 flex flex-col md:flex-row justify-between gap-8">
                    <div class="space-y-4">
                        <div class="inline-flex items-center gap-2 px-3 py-1 bg-blue-500/20 rounded-full border border-blue-500/30">
                            <span class="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse"></span>
                            <span class="text-[10px] font-black uppercase tracking-[0.2em] text-blue-200">Official Document</span>
                        </div>
                        <h2 class="text-5xl font-black tracking-tighter uppercase italic">${d.doNumber}</h2>
                        <div class="flex items-center gap-4 text-slate-400">
                            <span class="text-xs font-bold uppercase tracking-widest flex items-center gap-2">
                                <i class="fas fa-calendar-alt text-blue-500"></i> ${doDate(d.shippedAt || d.date)}
                            </span>
                            <span class="w-1.5 h-1.5 bg-slate-700 rounded-full"></span>
                            <span class="text-xs font-bold uppercase tracking-widest flex items-center gap-2">
                                <i class="fas fa-fingerprint text-blue-500"></i> ID: ${d.id.slice(0, 8)}
                            </span>
                        </div>
                    </div>
                    
                    <div class="bg-white/10 backdrop-blur-md border border-white/10 p-6 rounded-2xl min-w-[240px]">
                        <div class="text-[10px] font-black text-blue-400 uppercase tracking-widest mb-3">Shipment Status</div>
                        <div class="flex items-center gap-3">
                            <div class="w-3 h-3 rounded-full bg-green-500 shadow-[0_0_12px_rgba(34,197,94,0.5)] animate-pulse"></div>
                            <span class="text-xl font-black uppercase tracking-tight text-white">${d.status || 'SHIPPED'}</span>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Detail Grid -->
            <div class="bg-white rounded-[2.5rem] shadow-sm border border-slate-100 overflow-hidden">
                <div class="grid grid-cols-1 md:grid-cols-2">
                    <!-- Recipient -->
                    <div class="p-10 border-r border-slate-50">
                        <div class="flex items-center gap-4 pb-6 border-b border-slate-50 mb-8">
                            <div class="w-12 h-12 rounded-2xl bg-blue-50 flex items-center justify-center text-blue-600 shadow-sm font-black">
                                <i class="fas fa-building text-xl"></i>
                            </div>
                            <div>
                                <h3 class="text-xs font-black text-slate-400 uppercase tracking-[0.2em]">Recipient Details</h3>
                                <p class="text-xl font-black text-slate-900 uppercase tracking-tight mt-0.5">${d.recipientName}</p>
                            </div>
                        </div>
                        <div class="bg-slate-50/50 p-6 rounded-2xl border border-slate-200/50 mb-8">
                            <p class="text-sm font-bold text-slate-600 leading-relaxed italic">"${d.address || 'No address provided.'}"</p>
                        </div>
                        <div class="grid grid-cols-2 gap-4">
                            <div class="p-4 bg-slate-50 rounded-xl border border-slate-100">
                                <span class="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] block mb-1">SO Reference</span>
                                <span class="text-xs font-black text-slate-800 uppercase">${d.soNumber || '-'}</span>
                            </div>
                            <div class="p-4 bg-slate-50 rounded-xl border border-slate-100">
                                <span class="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] block mb-1">Invoice Ref</span>
                                <span class="text-xs font-black text-slate-800 uppercase">${d.invoiceNumber || '-'}</span>
                            </div>
                        </div>
                    </div>

                    <!-- Logistics -->
                    <div class="p-10">
                        <div class="flex items-center gap-4 pb-6 border-b border-slate-50 mb-8">
                            <div class="w-12 h-12 rounded-2xl bg-slate-900 flex items-center justify-center text-white shadow-lg font-black">
                                <i class="fas fa-truck text-xl"></i>
                            </div>
                            <div>
                                <h3 class="text-xs font-black text-slate-400 uppercase tracking-[0.2em]">Logistics Info</h3>
                                <p class="text-xl font-black text-slate-900 uppercase tracking-tight mt-0.5">${d.driverName || 'External Courier'}</p>
                            </div>
                        </div>
                        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div class="p-5 border-2 border-slate-100 rounded-2xl">
                                <span class="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] block mb-2">License Plate</span>
                                <div class="px-3 py-1 bg-slate-900 text-white rounded text-sm font-black uppercase tracking-widest shadow-md inline-block">
                                    ${d.vehicleNo || '---'}
                                </div>
                            </div>
                            <div class="p-5 border-2 border-slate-100 rounded-2xl">
                                <span class="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] block mb-2">Expedition Mode</span>
                                <span class="text-sm font-black text-slate-800 uppercase tracking-tight flex items-center gap-2">
                                    <i class="fas fa-shipping-fast text-slate-300"></i> ${d.expedition || 'Internal'}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Items Table -->
            <div class="bg-white rounded-[2.5rem] shadow-sm border border-slate-100 overflow-hidden">
                <div class="p-8 border-b border-slate-50 flex items-center justify-between bg-slate-50/20">
                    <h3 class="text-sm font-black text-slate-800 uppercase tracking-widest flex items-center gap-3">
                        <i class="fas fa-list text-blue-600"></i> Manifest Barang
                    </h3>
                    <span class="px-4 py-1.5 bg-white border border-slate-200 rounded-full text-[10px] font-black text-slate-500 uppercase tracking-widest shadow-sm">
                        ${(d.items || []).length} SKU
                    </span>
                </div>
                <div class="overflow-x-auto">
                    <table class="w-full text-left border-collapse">
                        <thead>
                            <tr class="bg-slate-50/50 text-slate-500 text-[10px] uppercase font-black tracking-[0.2em]">
                                <th class="py-5 px-8">Product Description</th>
                                <th class="py-5 px-6 text-right">Qty Shipped</th>
                                <th class="py-5 px-6 text-center">Packaging</th>
                                <th class="py-5 px-6 text-center">Colly</th>
                            </tr>
                        </thead>
                        <tbody class="divide-y divide-slate-100">
                            ${itemRows}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    `;

    mainContent.innerHTML = `
        <div class="animate-in fade-in slide-in-from-bottom-2 duration-400 -m-6 h-[calc(100vh-64px)] flex flex-col overflow-hidden bg-white">
            <!-- Record Header / Action Bar (STICKY AREA) -->
            <div class="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200 px-8 py-5 flex items-center justify-between shrink-0 shadow-sm">
                <div class="flex items-center gap-6">
                    <button onclick="renderWarehouseDeliveryOrders()" class="w-10 h-10 rounded-full hover:bg-slate-100 flex items-center justify-center text-slate-400 transition-all border border-transparent hover:border-slate-200 active:scale-90">
                        <i class="fas fa-arrow-left"></i>
                    </button>
                    <div>
                        <div class="flex items-center gap-2 mb-1">
                            <span class="text-[9px] font-black text-slate-400 uppercase tracking-widest">Logistics</span>
                            <span class="w-1 h-1 bg-slate-300 rounded-full"></span>
                            <span class="text-[9px] font-black text-slate-400 uppercase tracking-widest">Delivery Order</span>
                            <span class="w-1 h-1 bg-slate-300 rounded-full"></span>
                            <span class="text-[9px] font-black text-blue-500 uppercase tracking-widest">ID: ${d.id.slice(0, 8)}</span>
                        </div>
                        <h1 class="text-xl font-black text-slate-900 tracking-tight uppercase">${d.doNumber}</h1>
                    </div>
                    <div class="ml-4 px-4 py-1.5 rounded-full bg-green-500 text-white text-[10px] font-black tracking-widest uppercase shadow-lg shadow-green-200">
                        ${d.status || 'SHIPPED'}
                    </div>
                </div>
                
                <div class="flex items-center gap-3">
                    <button onclick="printDeliveryOrder('${d.id}')" 
                        class="px-6 py-2.5 bg-slate-100 text-slate-700 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-200 transition-all flex items-center gap-2 active:scale-95">
                        <i class="fas fa-print text-slate-400"></i> Cetak Surat Jalan
                    </button>
                    <div class="w-px h-6 bg-slate-200 mx-2"></div>
                    <button onclick="renderWarehouseDeliveryOrders()" class="px-6 py-2.5 bg-slate-900 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-black transition-all shadow-xl active:scale-95 group">
                        Kembali <i class="fas fa-times ml-2 text-slate-400 group-hover:text-white"></i>
                    </button>
                </div>
            </div>

            <!-- Scrollable Content Area -->
            <div class="flex-1 overflow-y-auto bg-slate-50/50 custom-scrollbar pb-24">
                ${printableBody}
            </div>
        </div>
    `;
};
