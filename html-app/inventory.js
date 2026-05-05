// inventory.js - Inventory Module for Unity ERP

// â”€â”€â”€ HELPERS â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const CATEGORY_LABELS = {
    RAW_MATERIAL: 'Bahan Baku',
    OVEN_BASAH_STOCK: 'Oven basah',
    OVEN_KERING_STOCK: 'Oven Kering',
    BULK_STOCK: 'Stok Curah (KG)',
    FINISHED_GOODS: 'Gudang Jadi'
};
const CATEGORY_COLORS = {
    RAW_MATERIAL: 'bg-yellow-100 text-yellow-800',
    OVEN_BASAH_STOCK: 'bg-orange-100 text-orange-800',
    OVEN_KERING_STOCK: 'bg-yellow-100 text-yellow-800',
    BULK_STOCK: 'bg-indigo-100 text-indigo-800',
    FINISHED_GOODS: 'bg-green-100 text-green-800'
};
const REF_LABELS = { PO: 'Purchase Receipt', SO: 'Sales Delivery', PRODUCTION_IN: 'Hasil Produksi', PRODUCTION_OUT: 'Konsumsi Produksi', SHRINKAGE: 'Penyusutan/NG', MANUAL: 'Manual' };

function invFmt(n) { return new Intl.NumberFormat('id-ID', { maximumFractionDigits: 2 }).format(n || 0); }
function invDate(d) { return d ? new Date(d).toLocaleDateString('id-ID') : '-'; }

// Helper to refresh correctly based on current view
window.refreshStockMasterView = () => {
    const title = document.getElementById('pageTitle')?.innerText?.trim();
    if (title === 'Stok Produksi') {
        if (typeof window.renderProductionStockMaster === 'function') window.renderProductionStockMaster();
        else renderInventoryMaster();
    } else {
        renderInventoryMaster();
    }
};

window.renderInventoryDashboard = () => {
    document.getElementById('pageTitle').innerText = 'Dashboard Logistik';
    const mc = document.getElementById('main-content');

    const items = (db.read('inventoryItems') || []).filter(it => it.status === 'ACTIVE');
    const warehouses = db.read('warehouses') || [];
    const stockTxs = db.read('stockTransactions') || [];
    
    // Calculate Stats
    let totalInventoryValue = 0;
    const warehouseValues = {}; 
    const locations = ['WHS', 'OVEN_BASAH', 'OVEN_KERING'];
    locations.forEach(loc => warehouseValues[loc] = 0);

    items.forEach(it => {
        locations.forEach(loc => {
            const stock = db.getInventoryStock(it.id, loc);
            const val = stock * (it.purchasePrice || 0);
            totalInventoryValue += val;
            warehouseValues[loc] += val;
        });
    });

    const shortageItems = items.filter(it => db.getInventoryStock(it.id) < (it.minStock || 0));
    
    const fmt = v => new Intl.NumberFormat('id-ID').format(v);

    const frappeCard = (title, value) => `
        <div class="bg-white rounded-xl border border-gray-100 p-5 flex flex-col justify-between shadow-[0_2px_10px_-3px_rgba(6,81,237,0.05)] h-[104px]">
            <div class="flex justify-between items-start mb-2">
                <span class="text-sm font-medium text-gray-500 hover:text-gray-700 cursor-pointer">${title}</span>
                <span class="text-gray-300 hover:text-gray-500 cursor-pointer text-lg leading-none">...</span>
            </div>
            <div class="text-[26px] font-semibold text-gray-800 tracking-tight leading-none">${value}</div>
        </div>`;

    const chartPanel = (title, subtitle, id, heightClass = 'h-64', hasFilters = false, extraBody = '') => `
        <div class="bg-white rounded-xl border border-gray-100 shadow-[0_2px_10px_-3px_rgba(6,81,237,0.05)] p-5 flex flex-col">
            <div class="flex justify-between items-start mb-6">
                <div>
                    <h3 class="text-[15px] font-semibold text-gray-800">${title}</h3>
                    ${subtitle ? `<p class="text-[12px] text-gray-500 mt-1">${subtitle}</p>` : ''}
                </div>
                <div class="flex gap-2 items-center">
                    <button class="w-7 h-7 rounded bg-gray-50 text-gray-500 hover:bg-gray-100 flex items-center justify-center transition-colors"><i class="fas fa-filter text-[10px]"></i></button>
                    ${hasFilters ? `
                    <button class="px-2 h-7 rounded bg-gray-50 text-gray-600 hover:bg-gray-100 flex items-center justify-center transition-colors text-[11px] font-medium gap-1">
                        Last Year <i class="fas fa-chevron-down text-[8px] text-gray-400"></i>
                    </button>
                    <button class="px-2 h-7 rounded bg-gray-50 text-gray-600 hover:bg-gray-100 flex items-center justify-center transition-colors text-[11px] font-medium gap-1">
                        <i class="far fa-calendar text-[10px] text-gray-500"></i> Monthly <i class="fas fa-chevron-down text-[8px] text-gray-400"></i>
                    </button>
                    ` : ''}
                    <button class="w-7 h-7 rounded bg-gray-50 text-gray-500 hover:bg-gray-100 flex items-center justify-center transition-colors"><span class="leading-none pb-2 font-bold tracking-widest text-[10px]">...</span></button>
                </div>
            </div>
            ${id ? `<div class="relative w-full ${heightClass} flex-1"><canvas id="${id}"></canvas></div>` : ``}
            ${extraBody}
        </div>`;

    const noDataPanel = (title) => chartPanel(title, null, null, '', false, '<div class="bg-[#f8f9fa] flex items-center justify-center w-full h-48 rounded-lg"><span class="text-sm text-gray-400">No Data</span></div>');

    mc.innerHTML = `
        <div class="max-w-full mx-auto space-y-4 animate-fade-in pb-12 font-sans pt-2">
            <!-- KPI Grid -->
            <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
                ${frappeCard('Total Active Items', items.length)}
                ${frappeCard('Total Warehouses / Locations', locations.length)}
                ${frappeCard('Total Stock Value', fmt(totalInventoryValue))}
            </div>

            <!-- Chart 1 -->
            ${chartPanel('Warehouse wise Stock Value', 'Last synced just now', 'chartWhValue', 'h-[320px]', true)}

            <!-- Chart Row 2 -->
            <div class="grid grid-cols-1 lg:grid-cols-2 gap-4">
                ${chartPanel('Purchase Receipt Trends', 'Last synced just now', 'chartPurchaseTrends', 'h-[250px]', true)}
                ${chartPanel('Delivery Trends', 'Last synced just now', 'chartDeliveryTrends', 'h-[250px]', true)}
            </div>

            <!-- Chart Row 3 -->
            <div class="grid grid-cols-1 lg:grid-cols-2 gap-4">
                ${noDataPanel('Oldest Items')}
                <div class="bg-white rounded-xl border border-gray-100 shadow-[0_2px_10px_-3px_rgba(6,81,237,0.05)] p-5 flex flex-col h-[330px]">
                    <div class="flex justify-between items-start mb-6">
                        <div>
                            <h3 class="text-[15px] font-semibold text-gray-800">Item Shortage Summary</h3>
                        </div>
                        <div class="flex gap-2 items-center">
                            <button class="w-7 h-7 rounded bg-gray-50 text-gray-500 hover:bg-gray-100 flex items-center justify-center transition-colors"><i class="fas fa-filter text-[10px]"></i></button>
                            <button class="w-7 h-7 rounded bg-gray-50 text-gray-500 hover:bg-gray-100 flex items-center justify-center transition-colors"><span class="leading-none pb-2 font-bold tracking-widest text-[10px]">...</span></button>
                        </div>
                    </div>
                    <div class="flex-1 overflow-y-auto">
                        ${shortageItems.length === 0 ? '<div class="bg-[#f8f9fa] flex items-center justify-center w-full h-48 rounded-lg"><span class="text-sm text-gray-400">No Data</span></div>' : `
                        <table class="w-full text-left">
                            <thead class="text-xs text-gray-500 border-b border-gray-100">
                                <tr>
                                    <th class="px-2 py-2 font-medium">Item Name</th>
                                    <th class="px-2 py-2 font-medium text-right">Actual</th>
                                    <th class="px-2 py-2 font-medium text-right">Min</th>
                                </tr>
                            </thead>
                            <tbody class="divide-y divide-gray-50 text-sm text-gray-700">
                                ${shortageItems.map(it => `
                                    <tr>
                                        <td class="px-2 py-2 truncate max-w-[150px]">${it.itemName}</td>
                                        <td class="px-2 py-2 text-right font-medium text-red-500">${db.getInventoryStock(it.id)}</td>
                                        <td class="px-2 py-2 text-right text-gray-400">${it.minStock}</td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                        `}
                    </div>
                </div>
            </div>
        </div>
    `;

    setTimeout(() => {
        if(window.initInventoryCharts) window.initInventoryCharts(warehouseValues, stockTxs);
    }, 100);
};

window.initInventoryCharts = function(warehouseValues, stockTxs) {
    if (typeof Chart === 'undefined') return;
    const currentYear = new Date().getFullYear();

    // 1. Warehouse Value
    const ctxWh = document.getElementById('chartWhValue');
    if (ctxWh) {
        const labels = Object.keys(warehouseValues);
        const data = Object.values(warehouseValues);
        if (data.every(v => v === 0)) {
            ctxWh.parentElement.innerHTML = '<div class="bg-[#f8f9fa] flex items-center justify-center w-full h-full rounded-lg"><span class="text-sm text-gray-400">No Data</span></div>';
        } else {
            new Chart(ctxWh, {
                type: 'bar',
                data: {
                    labels: labels,
                    datasets: [{
                        data: data,
                        backgroundColor: '#818cf8',
                        borderRadius: 4,
                        barThickness: 40
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: { legend: { display: false } },
                    scales: {
                        y: { display: false, grid: {display: false} },
                        x: { grid: {display: false}, border: {display: false}, ticks: { color: '#6b7280', font: {size: 11} } }
                    }
                }
            });
        }
    }

    // Prepare monthly data for trends
    const purchaseMonthly = new Array(12).fill(0);
    const deliveryMonthly = new Array(12).fill(0);

    stockTxs.forEach(tx => {
        const d = new Date(tx.date || tx.createdAt);
        if (d.getFullYear() === currentYear) {
            if (tx.type === 'IN') {
                purchaseMonthly[d.getMonth()] += parseFloat(tx.qty || 0);
            }
            if (tx.type === 'OUT') {
                deliveryMonthly[d.getMonth()] += parseFloat(tx.qty || 0);
            }
        }
    });

    // 2. Purchase Trends
    const ctxPurchase = document.getElementById('chartPurchaseTrends');
    if (ctxPurchase) {
        if (purchaseMonthly.every(v => v === 0)) {
            ctxPurchase.parentElement.innerHTML = '<div class="bg-[#f8f9fa] flex items-center justify-center w-full h-full rounded-lg"><span class="text-sm text-gray-400">No Data</span></div>';
        } else {
            new Chart(ctxPurchase, {
                type: 'line',
                data: {
                    labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
                    datasets: [{
                        label: 'Qty Received',
                        data: purchaseMonthly,
                        borderColor: '#f9a8d4', // pink
                        borderWidth: 2,
                        tension: 0.1,
                        pointBackgroundColor: '#f9a8d4',
                        pointRadius: purchaseMonthly.some(v => v > 0) ? 3 : 0,
                        fill: false
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: { legend: { display: false } },
                    scales: {
                        y: { beginAtZero: true, grid: { color: '#f3f4f6', drawBorder: false }, ticks: { color: '#9ca3af', font: {size: 11} }, border: {display: false} },
                        x: { grid: { display: false, drawBorder: false }, ticks: { color: '#9ca3af', font: {size: 11} }, border: {display: false} }
                    }
                }
            });
        }
    }

    // 3. Delivery Trends
    const ctxDelivery = document.getElementById('chartDeliveryTrends');
    if (ctxDelivery) {
        if (deliveryMonthly.every(v => v === 0)) {
            ctxDelivery.parentElement.innerHTML = '<div class="bg-[#f8f9fa] flex items-center justify-center w-full h-full rounded-lg"><span class="text-sm text-gray-400">No Data</span></div>';
        } else {
            new Chart(ctxDelivery, {
                type: 'line',
                data: {
                    labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
                    datasets: [{
                        label: 'Qty Delivered',
                        data: deliveryMonthly,
                        borderColor: '#34d399', // emerald
                        borderWidth: 2,
                        tension: 0.1,
                        pointBackgroundColor: '#34d399',
                        pointRadius: deliveryMonthly.some(v => v > 0) ? 3 : 0,
                        fill: false
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: { legend: { display: false } },
                    scales: {
                        y: { beginAtZero: true, grid: { color: '#f3f4f6', drawBorder: false }, ticks: { color: '#9ca3af', font: {size: 11} }, border: {display: false} },
                        x: { grid: { display: false, drawBorder: false }, ticks: { color: '#9ca3af', font: {size: 11} }, border: {display: false} }
                    }
                }
            });
        }
    }
};

// ——— 1. MASTER ITEM ————————————————————————————————————————
window.renderInventoryMaster = async () => {
    const canEdit = getModulePermission('logistik').edit;
    renderBreadcrumb(['Stock', 'Master Items']);
    document.getElementById('pageTitle').innerText = 'Master Item';
    const mc = document.getElementById('main-content');
    
    // Loading State
    mc.innerHTML = `<div class="p-10 text-center"><i class="fas fa-spinner fa-spin text-3xl text-indigo-500"></i><p class="mt-4 text-slate-500 font-medium">Memuat Master Item...</p></div>`;

    try {
        let items = await api.getInventoryItems();
        window._tempInventoryItems = items; // Cache for modals

        // Persist filters
        window._inventoryFilters = window._inventoryFilters || { category: '', name: '' };
        const f = window._inventoryFilters;

        // Apply Filters
        if (f.category) {
            items = items.filter(it => it.category === f.category);
        }
        if (f.name) {
            const q = f.name.toLowerCase();
            items = items.filter(it => it.itemName.toLowerCase().includes(q) || it.itemCode.toLowerCase().includes(q));
        }

        // Sort items: Gudang Jadi first, then others by logical order, then alphabetical
        const catOrder = {
            FINISHED_GOODS: 1,
            RAW_MATERIAL: 2,
            OVEN_BASAH_STOCK: 3,
            OVEN_KERING_STOCK: 4,
            BULK_STOCK: 5
        };
        items.sort((a, b) => {
            const orderA = catOrder[a.category] || 99;
            const orderB = catOrder[b.category] || 99;
            if (orderA !== orderB) return orderA - orderB;
            return (a.itemName || '').localeCompare(b.itemName || '');
        });

        const catOpts = Object.entries(CATEGORY_LABELS)
            .map(([v, l]) => `<option value="${v}" ${f.category === v ? 'selected' : ''}>${l}</option>`)
            .join('');

    mc.innerHTML = `
    <div class="space-y-4 animate-in fade-in duration-500">
        <!-- Compact Filter Bar -->
        <div class="bg-white rounded-xl shadow-sm border border-slate-100 p-5">
            <div class="flex flex-wrap items-center gap-4">
                <!-- Search Input -->
                <div class="flex-1 min-w-[250px] relative group">
                    <i class="fas fa-search absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-indigo-500 transition-colors"></i>
                    <input type="text" id="filter_item_name" onkeyup="updateInventoryFilters()" value="${f.name}" placeholder="Search Code or Item Name..." 
                        class="w-full pl-12 pr-4 py-2.5 bg-slate-50 border border-transparent rounded-xl text-sm font-semibold text-slate-700 placeholder:text-slate-300 focus:bg-white focus:border-indigo-300 focus:ring-4 focus:ring-indigo-500/5 outline-none transition-all">
                </div>

                <!-- Category Filter -->
                <div class="relative min-w-[180px]">
                    <i class="fas fa-filter absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 pointer-events-none"></i>
                    <select id="filter_item_category" onchange="updateInventoryFilters()" 
                        class="w-full pl-11 pr-10 py-2.5 bg-slate-50 border border-transparent rounded-xl text-sm font-bold text-slate-700 appearance-none cursor-pointer focus:bg-white focus:border-indigo-300 focus:ring-4 focus:ring-indigo-500/5 transition-all outline-none">
                        <option value="">All Categories</option>
                        ${catOpts}
                    </select>
                    <i class="fas fa-chevron-down absolute right-4 top-1/2 -translate-y-1/2 text-slate-300 pointer-events-none text-[10px]"></i>
                </div>

                <!-- Actions -->
                <div class="flex gap-3 ml-auto">
                    ${canEdit ? `
                    <button onclick="renderInventoryItemForm()" class="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-xl transition-all text-sm font-bold shadow-lg shadow-indigo-500/20 flex items-center gap-2">
                        <i class="fas fa-plus"></i> New Item
                    </button>
                    ` : ''}
                    <button onclick="resetInventoryFilters()" class="bg-white border border-slate-200 text-slate-600 px-5 py-2.5 rounded-xl hover:bg-slate-50 transition-all text-sm font-bold" title="Reset Filters">
                        <i class="fas fa-sync-alt"></i>
                    </button>
                </div>
            </div>
        </div>

        <!-- Master Item Table Card -->
        <div class="bg-white rounded-xl shadow-sm border border-slate-100 overflow-visible">
            <div class="overflow-visible">
                <table class="w-full text-left" id="inventory_table">
                    <thead class="bg-slate-50/50 border-b border-slate-100">
                        <tr>
                            <th class="py-4 px-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Item Information</th>
                            <th class="py-4 px-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Category</th>
                            <th class="py-4 px-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Unit</th>
                            <th class="py-4 px-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Stock</th>
                            <th class="py-4 px-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Min Stock</th>
                            <th class="py-4 px-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Status</th>
                            <th class="py-4 px-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody id="inventory_table_body" class="divide-y divide-slate-50">
                        ${renderInventoryRows(items)}
                    </tbody>
                </table>
            </div>
            
            <div class="p-4 bg-slate-50/50 border-t border-slate-100 flex justify-between items-center">
                <span class="text-[10px] font-black text-slate-400 uppercase tracking-widest">Showing ${items.length} Registered Items</span>
                <div class="flex gap-1">
                    <!-- Pagination could go here if needed -->
                </div>
            </div>

            <div id="inventory_empty_state" class="${items.length === 0 ? '' : 'hidden'} py-20 flex flex-col items-center justify-center text-center">
                <div class="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center text-slate-300 mb-4 text-2xl">
                    <i class="fas fa-boxes"></i>
                </div>
                <p class="text-sm font-medium text-slate-500">No items found matching your filters.</p>
            </div>
        </div>
    </div>`;
    } catch (err) {
        mc.innerHTML = `<div class="p-10 text-center text-red-500"><i class="fas fa-exclamation-triangle text-3xl mb-4"></i><p>${err.message}</p></div>`;
    }
}

function renderInventoryRows(items) {
    const canEdit = getModulePermission('logistik').edit;
    if (items.length === 0) return '';
    
    return items.map(it => {
        const stock = it.currentStock || 0; // Menggunakan pre-calculated stock dari Backend API!
        const isLow = stock < (it.minStock || 0);
        const isActive = it.status !== 'INACTIVE';
        
        return `
        <tr class="hover:bg-slate-50/80 transition-colors group ${isLow ? 'bg-red-50/10' : ''}">
            <td class="py-4 px-5">
                <div class="flex items-center gap-3">
                    <div class="w-8 h-8 rounded-lg ${isLow ? 'bg-red-50 text-red-500' : 'bg-indigo-50 text-indigo-600'} flex items-center justify-center text-[10px] font-black shrink-0 border border-black/5">
                        <i class="fas fa-cube"></i>
                    </div>
                    <div>
                        <div class="text-sm font-bold text-slate-800 flex items-center gap-2">
                            ${it.itemName}
                            ${isLow ? '<span class="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" title="Low Stock"></span>' : ''}
                        </div>
                        <div class="text-[11px] text-slate-400 font-mono font-medium">${it.itemCode}</div>
                    </div>
                </div>
            </td>
            <td class="py-4 px-5">
                <span class="px-2.5 py-1 rounded-lg text-[10px] font-bold ${CATEGORY_COLORS[it.category] || 'bg-slate-100 text-slate-600'} border border-black/5 shadow-sm">
                    ${CATEGORY_LABELS[it.category] || it.category}
                </span>
            </td>
            <td class="py-4 px-5 text-[11px] font-black text-slate-400 uppercase tracking-widest">${it.unit}</td>
            <td class="py-4 px-5 text-sm text-right font-black ${isLow ? 'text-red-600' : 'text-slate-800'}">
                ${invFmt(stock)}
            </td>
            <td class="py-4 px-5 text-sm text-right text-slate-400 font-bold">${invFmt(it.minStock)}</td>
            <td class="py-4 px-5">
                <div class="flex items-center gap-2">
                    <span class="w-1.5 h-1.5 rounded-full ${isActive ? 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.3)]' : 'bg-slate-300'}"></span>
                    <span class="text-[10px] font-bold ${isActive ? 'text-green-600' : 'text-slate-400'} uppercase tracking-widest">${isActive ? 'Active' : 'Non-Active'}</span>
                </div>
            </td>
            <td class="py-4 px-5 text-right overflow-visible">
                <div class="flex justify-end overflow-visible">
                    <div class="relative dropdown-container" style="z-index: 1000;">
                        <button onclick="this.nextElementSibling.classList.toggle('hidden')" class="flex items-center gap-2 px-3 py-1.5 rounded-[10px] border border-slate-200 text-slate-700 bg-[#f8fafc] hover:bg-slate-100 transition-colors text-[12px] font-bold shadow-sm whitespace-nowrap">
                            Pilih Aksi...
                            <i class="fas fa-chevron-down text-[10px] text-slate-400"></i>
                        </button>
                        <div class="dropdown-menu hidden absolute right-0 top-full mt-1 w-40 bg-white rounded-xl shadow-[0_10px_25px_-5px_rgba(0,0,0,0.1),0_8px_10px_-6px_rgba(0,0,0,0.1)] border border-slate-100 z-[1001] overflow-hidden text-left">
                            <div class="py-1 flex flex-col">
                                <button onclick="renderInventoryItemForm('${it.id}')" class="text-left px-4 py-2 text-xs font-bold text-slate-600 hover:text-indigo-600 hover:bg-indigo-50/50 flex items-center gap-2 transition-colors">
                                    <i class="fas fa-edit w-4"></i> Edit Item
                                </button>
                                ${isCurrentUserAdmin() ? `
                                <button onclick="openStockAdjustmentModal('${it.id}')" class="text-left px-4 py-2 text-xs font-bold text-slate-600 hover:text-orange-600 hover:bg-orange-50/50 flex items-center gap-2 transition-colors">
                                    <i class="fas fa-sync-alt w-4"></i> Adjustment
                                </button>
                                <div class="h-px bg-slate-100 my-1 mx-2"></div>
                                <button onclick="deleteInventoryItem('${it.id}')" class="text-left px-4 py-2 text-xs font-bold text-red-600 hover:bg-red-50/50 flex items-center gap-2 transition-colors">
                                    <i class="fas fa-trash w-4"></i> Hapus Item
                                </button>
                                ` : ''}
                            </div>
                        </div>
                    </div>
                </div>
            </td>
        </tr>`;
    }).join('');
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

window.renderInventoryItemForm = (id = null) => {
    if (window.pushCurrentToHistory) window.pushCurrentToHistory();
    const item = id ? db.findById('inventoryItems', id) : null;
    const units = ['KG', 'GR', 'L', 'PCS', 'BOX', 'SAK', 'KARTON', 'LITER'];
    const unitOpts = units.map(u => `<option ${item?.unit === u ? 'selected' : ''}>${u}</option>`).join('');
    
    // Dynamic Categories based on context
    const allCats = [
        ['RAW_MATERIAL', 'Bahan Baku'], 
        ['OVEN_BASAH_STOCK', 'Oven Basah'], 
        ['OVEN_KERING_STOCK', 'Oven Kering'], 
        ['FINISHED_GOODS', 'Gudang Jadi']
    ];
    
    const pageTitleText = document.getElementById('pageTitle')?.innerText;
    let filteredCats = allCats;
    if (pageTitleText === 'Stok Produksi') {
        filteredCats = allCats.filter(([v]) => ['OVEN_BASAH_STOCK', 'OVEN_KERING_STOCK'].includes(v));
    }

    const catOpts = filteredCats.map(([v, l]) => `<option value="${v}" ${item?.category === v ? 'selected' : ''}>${l}</option>`).join('');
    const previewCode = item ? item.itemCode : '(auto-generate)';

    const isProduction = pageTitleText === 'Stok Produksi' || (window._currentView && window._currentView.includes('production'));
    renderBreadcrumb([isProduction ? 'Produksi' : 'Stock', 'Master Items', id ? 'Edit Item' : 'New Item']);
    document.getElementById('pageTitle').innerText = id ? 'Edit Item Master' : 'Tambah Item Baru';
    const mc = document.getElementById('main-content');

    mc.innerHTML = `
    <div class="animate-in fade-in slide-in-from-bottom-2 duration-400 -m-4 sm:-m-6 h-[calc(100vh-64px)] flex flex-col overflow-hidden bg-white">
        <!-- Sticky Action Bar -->
        <div class="sticky top-0 z-40 bg-white border-b border-slate-100 px-8 py-4 flex items-center justify-between shrink-0 shadow-sm">
            <div></div>
            <div class="flex items-center gap-3">
                <button onclick="renderInventoryMaster()" class="px-6 py-2.5 bg-slate-100 text-slate-500 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-200 transition-all active:scale-95">Batal</button>
                <button onclick="saveInventoryItem('${id || ''}')" class="px-8 py-2.5 bg-indigo-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-indigo-700 transition-all shadow-lg active:scale-95 flex items-center gap-2">
                    <i class="fas fa-check-circle text-[10px]"></i> Simpan Data Item
                </button>
            </div>
        </div>

        <!-- Scrollable Content -->
        <div class="flex-1 overflow-y-auto bg-slate-50/50 custom-scrollbar pb-32">
            <div class="w-full p-8 space-y-8">
                
                <!-- Informasi Dasar -->
                <div class="bg-white rounded-3xl p-8 border border-slate-100 shadow-sm space-y-6">
                    <h3 class="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] flex items-center gap-2">
                        <i class="fas fa-info-circle text-indigo-600"></i> Informasi Dasar
                    </h3>
                    
                    <div class="grid grid-cols-1 md:grid-cols-4 gap-6">
                        <div class="md:col-span-2">
                            <label class="block text-sm font-semibold text-slate-600 mb-2">Nama Item / Produk <span class="text-red-400">*</span></label>
                            <input type="text" id="inv_name" value="${item?.itemName || ''}" 
                                class="w-full border-none rounded-xl px-4 py-3 bg-slate-100/80 font-bold text-slate-800 outline-none" placeholder="">
                        </div>
                        <div>
                            <label class="block text-sm font-semibold text-slate-600 mb-2">Kategori <span class="text-red-400">*</span></label>
                            <select id="inv_category" onchange="invUpdateCodePreview()" 
                                class="w-full border-none rounded-xl px-4 py-3 bg-slate-100/80 font-bold text-slate-700 outline-none cursor-pointer">
                                <option value="">-- Pilih Kategori --</option>
                                ${catOpts}
                            </select>
                        </div>
                        <div>
                            <label class="block text-sm font-semibold text-slate-600 mb-2">Item Code</label>
                            <div class="px-4 py-3 bg-slate-200/50 rounded-xl font-mono font-bold text-slate-500 text-center" id="inv_code_preview_label">
                                ${previewCode}
                            </div>
                            <input type="hidden" id="inv_code_preview" value="${previewCode}">
                        </div>
                        <div>
                            <label class="block text-sm font-semibold text-slate-600 mb-2">Satuan Dasar <span class="text-red-400">*</span></label>
                            <select id="inv_unit" class="w-full border-none rounded-xl px-4 py-3 bg-slate-100/80 font-bold text-slate-700 outline-none cursor-pointer">
                                ${unitOpts}
                            </select>
                        </div>
                        <div>
                            <label class="block text-sm font-semibold text-slate-600 mb-2">Harga Beli Rata-rata</label>
                            <div class="relative">
                                <span class="absolute left-4 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">Rp</span>
                                <input type="number" id="inv_price" value="${item?.purchasePrice ?? 0}" min="0" step="0.01" 
                                    class="w-full border-none rounded-xl pl-10 pr-4 py-3 bg-slate-100/80 font-bold text-slate-800 outline-none">
                            </div>
                        </div>
                        <div>
                            <label class="block text-sm font-semibold text-slate-600 mb-2">Safety Stock (Min. Stok)</label>
                            <input type="number" id="inv_min_stock" value="${item?.minStock ?? 0}" min="0" 
                                class="w-full border-none rounded-xl px-4 py-3 bg-slate-100/80 font-bold text-slate-800 outline-none">
                        </div>
                        <div>
                            <label class="block text-sm font-semibold text-slate-600 mb-2">Status</label>
                            <select id="inv_status" class="w-full border-none rounded-xl px-4 py-3 bg-slate-100/80 font-bold text-slate-700 outline-none cursor-pointer">
                                <option value="ACTIVE" ${(!item || item.status !== 'INACTIVE') ? 'selected' : ''}>Active</option>
                                <option value="INACTIVE" ${item?.status === 'INACTIVE' ? 'selected' : ''}>Non-Active</option>
                            </select>
                        </div>
                        ${(!id && isCurrentUserAdmin()) ? `
                        <div>
                            <label class="block text-sm font-semibold text-indigo-600 mb-2">Stok Awal</label>
                            <input type="number" id="inv_initial_stock" value="0" min="0" 
                                class="w-full border-none rounded-xl px-4 py-3 bg-indigo-50 font-black text-indigo-700 outline-none">
                        </div>` : ''}
                    </div>
                </div>

            </div>
        </div>
    </div>`;
};

window.invUpdateCodePreview = () => {
    const cat = document.getElementById('inv_category')?.value;
    if (!cat) return;
    const preview = document.getElementById('inv_code_preview');
    const label = document.getElementById('inv_code_preview_label');
    
    if (preview && (preview.value.includes('(auto-generate)') || preview.value.includes('(preview)'))) {
        const newCode = db.generateItemCode(cat) + ' (preview)';
        preview.value = newCode;
        if (label) label.innerText = newCode;
    }

    // Auto-suffix name for Oven categories
    const nameInput = document.getElementById('inv_name');
    if (nameInput) {
        let name = nameInput.value.trim();
        // Remove existing suffixes first to avoid duplicates
        name = name.replace(/\s*\(Oven Basah\)/gi, '').replace(/\s*\(Oven Kering\)/gi, '');
        
        if (cat === 'OVEN_BASAH_STOCK') {
            nameInput.value = name + (name ? ' ' : '') + '(Oven Basah)';
        } else if (cat === 'OVEN_KERING_STOCK') {
            nameInput.value = name + (name ? ' ' : '') + '(Oven Kering)';
        } else {
            nameInput.value = name;
        }
    }
};

window.saveInventoryItem = async (id) => {
    const name = document.getElementById('inv_name').value.trim();
    const category = document.getElementById('inv_category').value;
    const unit = document.getElementById('inv_unit').value;
    const minStock = parseFloat(document.getElementById('inv_min_stock').value) || 0;
    const status = document.getElementById('inv_status').value;
    const purchasePrice = parseFloat(document.getElementById('inv_price').value) || 0;
    if (!name || !category || !unit) { showToast('Nama, Kategori, dan Satuan wajib diisi', 'error'); return; }

    const initialStock = parseFloat(document.getElementById('inv_initial_stock')?.value) || 0;

    const btn = event.currentTarget || event.target;
    const oldHtml = btn.innerHTML;
    btn.innerHTML = `<i class="fas fa-spinner fa-spin mr-2"></i>Menyimpan...`;
    btn.disabled = true;

    try {
        if (id) {
            await api.updateInventoryItem(id, { itemName: name, category, unit, minStock, purchasePrice, status });
            showToast('Item berhasil diperbarui');
        } else {
            await api.createInventoryItem({ itemName: name, category, unit, minStock, purchasePrice, status, initialStock });
            showToast('Item baru berhasil ditambahkan');
        }
        
        // Refresh hybrid cache transparently (in background) to keep other modules updated
        api.read('inventoryItems').then(data => {
            if (data && Array.isArray(data)) localStorage.setItem('unityerp_inventoryItems', JSON.stringify(data));
        });

        closeModal();
        renderInventoryMaster();
    } catch (err) {
        showToast(err.message, 'error');
        btn.innerHTML = oldHtml;
        btn.disabled = false;
    }
};

window.toggleInventoryItemStatus = async (id) => {
    const item = (window._tempInventoryItems || []).find(it => it.id === id);
    if (!item) return;
    const newStatus = item.status === 'INACTIVE' ? 'ACTIVE' : 'INACTIVE';
    
    try {
        await api.updateInventoryItem(id, { status: newStatus });
        showToast(`Item di-${newStatus === 'ACTIVE' ? 'aktifkan' : 'non-aktifkan'}`);
        renderInventoryMaster();
    } catch (err) {
        showToast(err.message, 'error');
    }
};

window.deleteInventoryItem = async (id) => {
    const item = (window._tempInventoryItems || []).find(it => it.id === id);
    if (!item) return;

    if (!confirm(`⚠️ HAPUS PERMANEN: ${item.itemName} (${item.itemCode})?\n\nSemua transaksi (Masuk/Keluar), history di Stock Card, item di SO/PO/RFQ, serta BOM yang menggunakan item ini di SELURUH departemen akan ikut TERHAPUS.\n\nLanjutkan?`)) return;

    try {
        await api.deleteInventoryItem(id);

        // -- LOCAL CLEANUP --
        // Keep the local deep clean for other modules that are not yet migrated to Phase 2
        const collections = [
            'stockTransactions', 'stockCard', 'purchaseRFQs', 'purchaseOrders', 
            'salesQuotations', 'salesOrders', 'productionOrders', 'inventoryBOM',
            'salesInvoices', 'purchaseInvoices', 'deliveryOrders', 'salesReturns',
            'productExchanges', 'inventoryShrinkage'
        ];

        collections.forEach(col => {
            let data = JSON.parse(localStorage.getItem('unityerp_' + col) || '[]');
            let modified = false;

            if (col === 'stockTransactions' || col === 'stockCard') {
                const initialLen = data.length;
                data = data.filter(t => t.itemId !== id && t.item_id !== id);
                if (data.length !== initialLen) modified = true;
            } 
            else if (col === 'productExchanges') {
                const initialLen = data.length;
                data = data.filter(t => t.fromItemId !== id && t.toItemId !== id);
                if (data.length !== initialLen) modified = true;
            }
            else if (col === 'inventoryBOM') {
                const initialLen = data.length;
                data = data.filter(b => b.parentId !== id);
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
                data = data.map(doc => {
                    if (doc.items) {
                        const initialItemsLen = doc.items.length;
                        doc.items = doc.items.filter(it => it.inventoryItemId !== id);
                        if (doc.items.length !== initialItemsLen) {
                            modified = true;
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
                const preFilterLen = data.length;
                data = data.filter(doc => doc.items ? doc.items.length > 0 : true);
                if (data.length !== preFilterLen) modified = true;
            }

            if (modified) {
                // Save locally but don't trigger background sync generic save
                localStorage.setItem('unityerp_' + col, JSON.stringify(data));
            }
        });

        // Finally delete from local inventoryItems cache
        let localItems = JSON.parse(localStorage.getItem('unityerp_inventoryItems') || '[]');
        localItems = localItems.filter(i => i.id !== id);
        localStorage.setItem('unityerp_inventoryItems', JSON.stringify(localItems));

        showToast(`Barang ${item.itemName} dan seluruh data terkait telah dihapus dari sistem.`, 'success');
        renderInventoryMaster();
    } catch (err) {
        showToast(err.message, 'error');
    }
};

window.openStockAdjustmentModal = (itemId) => {
    if (!isCurrentUserAdmin()) { showToast('Akses ditolak: Hanya Admin yang bisa melakukan penyesuaian stok.', 'error'); return; }
    const item = db.findById('inventoryItems', itemId);
    if (!item) return;
    const currentStock = db.getInventoryStock(itemId);

    const body = `
    <div class="space-y-6">
        <div class="p-4 bg-orange-50 border border-orange-100 rounded-2xl text-[10px] text-orange-700 font-bold uppercase tracking-widest leading-relaxed flex items-center gap-3">
            <div class="w-8 h-8 rounded-full bg-orange-100 flex items-center justify-center text-orange-500 shadow-sm flex-shrink-0">
                <i class="fas fa-sync-alt text-sm"></i>
            </div>
            <span>Gunakan fitur ini untuk mencocokkan stok sistem dengan stok fisik di gudang.</span>
        </div>

        <div class="grid grid-cols-2 gap-4">
            <div class="p-4 bg-slate-50/50 rounded-2xl border border-slate-100">
                <label class="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Kode Item</label>
                <div class="text-xs font-black text-slate-700 font-mono">${item.itemCode}</div>
            </div>
            <div class="p-4 bg-slate-50/50 rounded-2xl border border-slate-100">
                <label class="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Nama Item</label>
                <div class="text-xs font-black text-slate-700 truncate">${item.itemName}</div>
            </div>
        </div>

        <div class="bg-white p-6 rounded-2xl border-2 border-slate-100 shadow-sm relative overflow-hidden">
            <div class="flex flex-col items-center gap-6 relative z-10">
                <div class="text-center">
                    <label class="block text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-3">STOK DI SISTEM</label>
                    <div class="flex items-baseline justify-center gap-2">
                        <span class="text-3xl font-black text-slate-300">${invFmt(currentStock)}</span>
                        <span class="text-[10px] font-black text-slate-300 uppercase">${item.unit}</span>
                    </div>
                </div>

                <div class="w-12 h-12 rounded-full bg-blue-50 flex items-center justify-center text-blue-200">
                    <i class="fas fa-chevron-down text-lg"></i>
                </div>

                <div class="w-full text-center">
                    <label class="block text-[10px] font-black text-blue-600 uppercase tracking-[0.2em] mb-4">STOK FISIK AKTUAL (OPNAME)</label>
                    <div class="flex flex-col items-center gap-2">
                        <div class="relative group">
                            <input type="number" id="adj_physical_stock" value="${currentStock}" min="0" step="0.01" 
                                class="w-full max-w-[200px] text-center text-4xl font-black border-b-4 border-blue-500 pb-2 text-blue-600 outline-none transition-all focus:border-blue-700 bg-transparent">
                        </div>
                        <span class="text-xs font-black text-slate-400 uppercase tracking-widest mt-2">${item.unit}</span>
                    </div>
                </div>
            </div>
            
            <!-- Subtle background icon -->
            <i class="fas fa-clipboard-check absolute -bottom-6 -right-6 text-8xl text-slate-50/50 -rotate-12"></i>
        </div>

        <div>
            <label class="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Alasan Penyesuaian / Catatan Opname</label>
            <textarea id="adj_notes" rows="2" class="w-full border-2 border-slate-100 rounded-2xl px-4 py-3 text-xs font-bold text-slate-700 focus:border-blue-500 outline-none transition-all bg-slate-50/50" placeholder="cth: Hasil stok opname bulanan, barang rusak, dll"></textarea>
        </div>
    </div>`;

    const footer = `
        <div class="flex gap-3 w-full sm:w-auto">
            <button onclick="closeModal()" class="flex-1 sm:flex-none px-6 py-2.5 rounded-xl border border-slate-200 text-slate-500 text-[10px] font-black uppercase tracking-widest hover:bg-slate-50 transition-all">Batal</button>
            <button onclick="saveStockAdjustment('${itemId}')" class="flex-1 sm:flex-none bg-blue-600 hover:bg-blue-700 text-white px-8 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-blue-200 transition-all active:scale-95 flex items-center justify-center gap-2">
                <i class="fas fa-check-circle"></i> SIMPAN PENYESUAIAN
            </button>
        </div>`;
    showModal('Penyesuaian Stok', body, footer, 'max-w-md');
};

window.saveStockAdjustment = async (itemId) => {
    const actualStock = parseFloat(document.getElementById('adj_physical_stock').value);
    const notes = document.getElementById('adj_notes').value.trim();
    if (isNaN(actualStock) || actualStock < 0) { showToast('Jumlah stok tidak valid', 'error'); return; }

    const item = (window._tempInventoryItems || []).find(it => it.id === itemId);
    const currentStock = item ? (item.currentStock || 0) : 0;
    const diff = actualStock - currentStock;

    if (diff === 0) {
        showToast('Tidak ada perbedaan stok, tidak perlu penyesuaian.');
        closeModal();
        return;
    }

    const type = diff > 0 ? 'IN' : 'OUT';
    const absDiff = Math.abs(diff);

    const btn = event.currentTarget || event.target;
    const oldHtml = btn.innerHTML;
    btn.innerHTML = `<i class="fas fa-spinner fa-spin mr-2"></i>Menyimpan...`;
    btn.disabled = true;

    try {
        await api.createInventoryTransaction({
            itemId: itemId,
            type: type,
            qty: absDiff,
            reference: 'MANUAL',
            notes: notes || 'Stock Adjustment (Manual Update)'
        });
        
        // Background sync transactions cache
        api.read('stockTransactions').then(data => {
            if (data && Array.isArray(data)) localStorage.setItem('unityerp_stockTransactions', JSON.stringify(data));
        });

        showToast(`Stok berhasil disesuaikan (${type}: ${absDiff})`);
        closeModal();
        renderInventoryMaster();
    } catch (err) {
        showToast(err.message, 'error');
        btn.innerHTML = oldHtml;
        btn.disabled = false;
    }
};

// ——— 10. KONVERSI KEMASAN (REPACKING) —————————————————————————————
window.renderInventoryConversion = () => {
    document.getElementById('pageTitle').innerText = 'Konversi Kemasan';
    const mc = document.getElementById('main-content');
    const logs = db.read('inventoryConversions') || [];

    mc.innerHTML = `
    <div class="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div class="p-6 border-b border-gray-100 flex justify-between items-center">
            <div>
                <h3 class="font-semibold text-gray-700 text-base">Riwayat Stok Kemasan</h3>
                <p class="text-xs text-gray-400 mt-0.5">Pencatatan penyusunan stok per ukuran kemasan</p>
            </div>
            <button onclick="openInventoryConversionModal()" class="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700 transition-colors">
                Catat Stok Sak
            </button>
        </div>
        <div class="overflow-x-auto">
            <table class="w-full text-left">
                <thead class="bg-gray-50 text-gray-400 text-xs uppercase tracking-wider">
                    <tr>
                        <th class="px-6 py-3 border-b border-gray-100">Tanggal</th>
                        <th class="px-6 py-3 border-b border-gray-100">Sumber</th>
                        <th class="px-6 py-3 border-b border-gray-100">Kemasan</th>
                        <th class="px-6 py-3 border-b border-gray-100 text-right">Jumlah</th>
                        <th class="px-6 py-3 border-b border-gray-100">Keterangan</th>
                        <th class="px-6 py-3 border-b border-gray-100">Operator</th>
                    </tr>
                </thead>
                <tbody class="text-sm divide-y divide-gray-50">
                    ${logs.slice().reverse().flatMap(l => {
                        const fromItem = db.findById('inventoryItems', l.fromItemId);
                        // Support both new format (entries[]) and old format (single toItemId)
                        const entries = l.entries || (l.toItemId ? [{
                            itemId: l.toItemId,
                            itemName: db.findById('inventoryItems', l.toItemId)?.itemName || '-',
                            qty: l.resultQty,
                            unit: db.findById('inventoryItems', l.toItemId)?.unit || 'Pack'
                        }] : []);
                        return entries.map((e, i) => `
                        <tr class="hover:bg-gray-50">
                            <td class="px-6 py-3 text-xs text-gray-400">${i === 0 ? invDate(l.date) : ''}</td>
                            <td class="px-6 py-3 text-gray-600">${i === 0 ? (fromItem?.itemName || '-') : ''}</td>
                            <td class="px-6 py-3 font-medium text-gray-700">${e.itemName}</td>
                            <td class="px-6 py-3 text-right">
                                <span class="px-2 py-0.5 bg-blue-50 text-blue-700 rounded text-xs font-bold border border-blue-100">
                                    ${invFmt(e.qty)} ${e.unit || 'Pack'}
                                </span>
                            </td>
                            <td class="px-6 py-3 text-xs text-gray-400">${i === 0 ? (l.notes || '-') : ''}</td>
                            <td class="px-6 py-3 text-xs text-gray-400">${i === 0 ? (l.createdBy || 'Admin') : ''}</td>
                        </tr>`);
                    }).join('') || '<tr><td colspan="6" class="py-12 text-center text-gray-400 text-sm">Belum ada riwayat</td></tr>'}
                </tbody>
            </table>
        </div>
    </div>`;
};

window.openInventoryConversionModal = (preSelectedId = null) => {
    const items = db.read('inventoryItems').filter(i => i.status === 'ACTIVE' && i.category === 'FINISHED_GOODS');
    const currentDate = new Date().toISOString().split('T')[0];

    const body = `
    <div class="space-y-8">
        <!-- Section: Informasi Utama -->
        <div class="grid grid-cols-2 gap-8 bg-gray-50/50 p-6 rounded-2xl border border-gray-100">
            <div>
                <label class="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2.5">Tanggal Konversi</label>
                <div class="relative">
                    <i class="fas fa-calendar absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"></i>
                    <input type="date" id="conv_date" value="${currentDate}" class="w-full border-2 border-gray-200 rounded-xl pl-11 pr-4 py-3.5 text-sm font-bold text-gray-700 focus:border-blue-500 outline-none transition-all">
                </div>
            </div>
            <div>
                <label class="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2.5">PIC Konversi</label>
                <div class="relative">
                    <i class="fas fa-user absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"></i>
                    <input type="text" id="conv_pic" class="w-full border-2 border-gray-200 rounded-xl pl-11 pr-4 py-3.5 text-sm font-bold text-gray-700 focus:border-blue-500 outline-none transition-all" placeholder="Nama Penanggung Jawab">
                </div>
            </div>
        </div>

        <div class="grid grid-cols-2 gap-12">
            <!-- Kolom Kiri: Sumber -->
            <div class="space-y-6">
                <p class="text-xs font-black text-blue-600 uppercase tracking-[0.2em] border-b-2 border-blue-50 pb-2">Data Produk</p>
                <div class="relative">
                    <label class="block text-xs font-bold text-gray-500 mb-2">Produk yang mau di konversi</label>
                    <div id="conv_from_trigger" onclick="openProductSearch('conv_from', 'FINISHED_GOODS')" class="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-base font-black text-slate-400 cursor-pointer hover:bg-slate-50 transition-all flex justify-between items-center group">
                        <span id="conv_from_label" class="truncate pr-2">-- Pilih Produk --</span>
                        <i class="fas fa-chevron-down text-xs text-slate-300 group-hover:text-slate-400 transition-colors"></i>
                    </div>
                    <input type="hidden" id="conv_from_item" onchange="updateConversionSourceInfo()">
                    <div id="conv_from_results_container" class="absolute z-[100] top-full left-0 right-0 mt-2 bg-white rounded-2xl shadow-[0_15px_40px_rgba(0,0,0,0.12)] hidden border border-slate-100 overflow-hidden min-w-[320px]">
                        <div class="p-3 border-b border-slate-50">
                            <div class="relative">
                                <i class="fas fa-search absolute left-3 top-1/2 -translate-y-1/2 text-slate-300 text-xs"></i>
                                <input type="text" id="conv_from_search_input" placeholder="Ketik kode atau nama..." class="w-full bg-slate-50 border border-blue-100 rounded-lg pl-9 pr-3 py-2 text-xs focus:border-blue-400 outline-none transition-all font-medium">
                            </div>
                        </div>
                        <div id="conv_from_results" class="max-h-[300px] overflow-y-auto custom-scrollbar"></div>
                    </div>
                </div>
                <div id="conv_src_info" class="hidden">
                    <div class="bg-blue-50 border border-blue-100 rounded-xl p-4 flex justify-between items-center">
                        <span class="text-xs font-bold text-blue-400 uppercase tracking-widest">Stok Sistem</span>
                        <strong id="conv_src_stock" class="text-xl font-black text-blue-700">0 Kg</strong>
                    </div>
                </div>
            </div>

            <!-- Kolom Kanan: Detail Konversi -->
            <div class="space-y-6">
                <p class="text-xs font-black text-orange-600 uppercase tracking-[0.2em] border-b-2 border-orange-50 pb-2">Detail Konversi</p>
                <div>
                    <label class="block text-xs font-bold text-gray-500 mb-2">Qty yang mau di konversi (Kg)</label>
                    <input type="number" id="conv_total_kg_input" oninput="calculateConversionResult()" class="w-full border-2 border-gray-200 rounded-xl px-6 py-4 text-3xl font-black text-gray-800 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all placeholder-gray-200" placeholder="0">
                </div>
                <div>
                    <label class="block text-xs font-bold text-gray-500 mb-2">Pilih Berat per Pack</label>
                    <select id="conv_ratio" onchange="calculateConversionResult()" class="w-full border-2 border-gray-200 rounded-xl px-4 py-4 text-base font-bold text-gray-800 bg-white focus:border-blue-500 outline-none shadow-sm">
                        <option value="5">5 Kg</option>
                        <option value="0.8">800 gram (0.8 Kg)</option>
                    </select>
                </div>
            </div>
        </div>

        <!-- Ringkasan & Keterangan -->
        <div class="flex flex-col gap-6 pt-6 border-t border-gray-100">
            <div class="bg-gray-50 rounded-2xl p-6 flex justify-between items-center border border-gray-200">
                <div class="space-y-1">
                    <p class="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Total Berat Dikeluarkan</p>
                    <p class="text-4xl font-black text-gray-800"><span id="conv_total_kg_display">0</span> <span class="text-xs font-normal text-gray-400">Kg</span></p>
                </div>
                <div class="flex flex-col items-center">
                    <div class="w-10 h-10 rounded-full bg-white border border-gray-200 flex items-center justify-center text-gray-300 shadow-sm">
                        <i class="fas fa-chevron-right"></i>
                    </div>
                </div>
                <div class="text-right space-y-1">
                    <p class="text-[10px] font-black text-blue-500 uppercase tracking-[0.2em]">Hasil Konversi (Qty)</p>
                    <p class="text-4xl font-black text-blue-700" id="conv_result_qty">0</p>
                </div>
            </div>
            
            <input type="hidden" id="conv_total_kg" value="0">
            <input type="hidden" id="conv_result_qty_manual" value="0">

            <div>
                <label class="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Keterangan Tambahan</label>
                <textarea id="conv_notes" rows="2" class="w-full border-2 border-gray-100 rounded-xl px-4 py-4 text-sm font-medium text-gray-700 focus:border-blue-500 outline-none placeholder-gray-300" placeholder="Tambahkan catatan..."></textarea>
            </div>
        </div>
    </div>`;

    const footer = `
        <div class="flex gap-4 w-full">
            <button onclick="closeModal()" class="px-8 py-4 rounded-xl text-sm font-black uppercase tracking-widest text-gray-400 bg-gray-100 hover:bg-gray-200 transition-all">Batal</button>
            <button onclick="saveInventoryConversion()" class="flex-1 py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-black uppercase tracking-widest shadow-lg shadow-blue-500/30 transition-all active:scale-[0.98]">
                <i class="fas fa-check-circle mr-2"></i>Simpan Konversi
            </button>
        </div>
    `;

    showModal('Konversi Kemasan Produk', body, footer, 'xl');

    if (preSelectedId) {
        const item = db.findById('inventoryItems', preSelectedId);
        if (item) {
            setTimeout(() => {
                const hidden = document.getElementById('conv_from_item');
                const label = document.getElementById('conv_from_label');
                if (hidden) hidden.value = preSelectedId;
                if (label) {
                    label.innerText = item.itemName;
                    label.classList.remove('text-slate-400');
                    label.classList.add('text-slate-800', 'font-black');
                }
                updateConversionSourceInfo();
            }, 100);
        }
    }
};

window.calculateConversionResult = () => {
    const inputKg = document.getElementById('conv_total_kg_input');
    const ratioEl = document.getElementById('conv_ratio');
    if (!inputKg || !ratioEl) return;

    const totalKg = parseFloat(inputKg.value) || 0;
    const ratio = parseFloat(ratioEl.value) || 1;
    const result = totalKg / ratio;
    
    // Update hidden fields for saving
    const hiddenKg = document.getElementById('conv_total_kg');
    const hiddenQty = document.getElementById('conv_result_qty_manual');
    if (hiddenKg) hiddenKg.value = totalKg;
    if (hiddenQty) hiddenQty.value = result;

    // Update UI displays
    const dispKg = document.getElementById('conv_total_kg_display');
    const dispQty = document.getElementById('conv_result_qty');
    if (dispKg) dispKg.textContent = totalKg.toLocaleString('id-ID');
    if (dispQty) dispQty.textContent = result.toLocaleString('id-ID');
};

window.updateConversionSourceInfo = () => {
    const id = document.getElementById('conv_from_item').value;
    const info = document.getElementById('conv_src_info');
    const stockEl = document.getElementById('conv_src_stock');
    
    if (id) {
        const totalStock = db.getInventoryStock(id);
        const pb = (db.read('packBreakdowns') || []).find(b => b.itemId === id) || {};
        const q5 = pb.qty5 || 0;
        const q800 = pb.qty800 || 0;
        const weightOthers = q5 * 5 + q800 * 0.8;
        
        // Show only the 25kg packaging stock (convertible stock)
        const q25Stock = totalStock - weightOthers;
        
        stockEl.textContent = invFmt(q25Stock) + ' Kg';
        info.classList.remove('hidden');
    } else {
        info.classList.add('hidden');
    }
};

window.saveInventoryConversion = () => {
    try {
        const fromId = document.getElementById('conv_from_item').value;
        const totalKg = parseFloat(document.getElementById('conv_total_kg').value) || 0;
        const resultQty = parseFloat(document.getElementById('conv_result_qty_manual').value) || 0;
        const ratio = parseFloat(document.getElementById('conv_ratio').value) || 0;
        const notes = document.getElementById('conv_notes').value;
        const date = document.getElementById('conv_date').value;
        const pic = document.getElementById('conv_pic').value;

        // Validasi
        if (!fromId) { showToast('Pilih produk terlebih dahulu', 'error'); return; }
        if (totalKg <= 0) { showToast('Masukkan jumlah Kg yang valid', 'error'); return; }
        if (!date) { showToast('Pilih tanggal konversi', 'error'); return; }
        if (!pic) { showToast('Masukkan nama PIC', 'error'); return; }

        if (!db.validateInventoryStock(fromId, totalKg)) {
            showToast('Stok tidak mencukupi untuk konversi ini', 'error');
            return;
        }

        // Simpan Log Konversi
        db.insert('inventoryConversions', {
            date, 
            fromItemId: fromId, 
            totalKg, 
            ratio, 
            resultQty, 
            notes, 
            pic,
            createdBy: window._session?.fullName || 'Admin',
            createdAt: new Date().toISOString()
        });

        // Update Pack Breakdown (Update saldo 5kg / 800gr)
        const allPB = db.read('packBreakdowns') || [];
        let pb = allPB.find(b => b.itemId === fromId);
        if (!pb) {
            pb = { id: db.uuid(), itemId: fromId, qty25: 0, qty5: 0, qty800: 0 };
            allPB.push(pb);
        }
        
        // Tambah ke bucket yang sesuai
        if (Math.abs(ratio - 5) < 0.1) {
            pb.qty5 = (parseFloat(pb.qty5) || 0) + resultQty;
        } else if (Math.abs(ratio - 0.8) < 0.1) {
            pb.qty800 = (parseFloat(pb.qty800) || 0) + resultQty;
        }

        db.save('packBreakdowns', allPB);

        showToast('Konversi kemasan berhasil disimpan', 'success');
        closeModal();
        
        // Refresh laporan jika sedang terbuka
        if (window.runMonthlyStockReport) window.runMonthlyStockReport();
    } catch (err) {
        console.error('Error saving conversion:', err);
        showToast('Terjadi kesalahan saat menyimpan: ' + err.message, 'error');
    }
};

// â”€â”€â”€ SHARED: Item select options â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function getActiveItemOpts(filterCategory = null) {
    const items = db.read('inventoryItems').filter(i => i.status !== 'INACTIVE' && (!filterCategory || i.category === filterCategory));
    if (!items.length) return '<option value="">-- Belum ada item aktif --</option>';
    return `<option value="">-- Pilih Item --</option>` + items.map(i =>
        `<option value="${i.id}" data-unit="${i.unit}" data-code="${i.itemCode}">${i.itemCode} - ${i.itemName}</option>`
    ).join('');
}

// â”€â”€â”€ 2. STOCK IN â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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
                    <option value="RAW_MATERIAL">Bahan Baku</option>
                    <option value="OVEN_BASAH_STOCK">Oven Basah</option>
                    <option value="OVEN_KERING_STOCK">Oven Kering</option>
                    <option value="FINISHED_GOODS">Gudang Jadi</option>
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
        <div class="relative mb-4">
            <label class="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Pilih Barang / Material <span class="text-red-500">*</span></label>
            <div id="si_trigger" onclick="openProductSearch('si')" class="w-full bg-white border border-slate-200 rounded-xl px-4 py-2 text-xs text-slate-400 cursor-pointer hover:bg-slate-50 transition-all flex justify-between items-center group h-[38px]">
                <span id="si_label" class="truncate pr-2">-- Cari Kode atau Nama Produk --</span>
                <i class="fas fa-chevron-down text-[10px] text-slate-300 group-hover:text-slate-400 transition-colors"></i>
            </div>
            <input type="hidden" id="si_item">
            <div id="si_results_container" class="absolute z-[100] top-full left-0 right-0 mt-2 bg-white rounded-2xl shadow-[0_15px_40px_rgba(0,0,0,0.12)] hidden border border-slate-100 overflow-hidden min-w-[320px]">
                <div class="p-3 border-b border-slate-50">
                    <div class="relative">
                        <i class="fas fa-search absolute left-3 top-1/2 -translate-y-1/2 text-slate-300 text-xs"></i>
                        <input type="text" id="si_search_input" placeholder="Ketik kode atau nama..." class="w-full bg-slate-50 border border-blue-100 rounded-lg pl-9 pr-3 py-2 text-xs focus:border-blue-400 outline-none transition-all font-medium">
                    </div>
                </div>
                <div id="si_results" class="max-h-[300px] overflow-y-auto custom-scrollbar"></div>
            </div>
        </div>
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

// â”€â”€â”€ 3. STOCK OUT â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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
                    <option value="RAW_MATERIAL">Bahan Baku</option>
                    <option value="OVEN_BASAH_STOCK">Oven Basah</option>
                    <option value="OVEN_KERING_STOCK">Oven Kering</option>
                    <option value="FINISHED_GOODS">Gudang Jadi</option>
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
        <div class="relative mb-4">
            <label class="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Pilih Barang / Material <span class="text-red-500">*</span></label>
            <div id="so_trigger" onclick="openProductSearch('so')" class="w-full bg-white border border-slate-200 rounded-xl px-4 py-2 text-xs text-slate-400 cursor-pointer hover:bg-slate-50 transition-all flex justify-between items-center group h-[38px]">
                <span id="so_label" class="truncate pr-2">-- Cari Kode atau Nama Produk --</span>
                <i class="fas fa-chevron-down text-[10px] text-slate-300 group-hover:text-slate-400 transition-colors"></i>
            </div>
            <input type="hidden" id="so_item" onchange="invShowCurrentStock('so_item','so_stock_info')">
            <div id="so_results_container" class="absolute z-[100] top-full left-0 right-0 mt-2 bg-white rounded-2xl shadow-[0_15px_40px_rgba(0,0,0,0.12)] hidden border border-slate-100 overflow-hidden min-w-[320px]">
                <div class="p-3 border-b border-slate-50">
                    <div class="relative">
                        <i class="fas fa-search absolute left-3 top-1/2 -translate-y-1/2 text-slate-300 text-xs"></i>
                        <input type="text" id="so_search_input" placeholder="Ketik kode atau nama..." class="w-full bg-slate-50 border border-blue-100 rounded-lg pl-9 pr-3 py-2 text-xs focus:border-blue-400 outline-none transition-all font-medium">
                    </div>
                </div>
                <div id="so_results" class="max-h-[300px] overflow-y-auto custom-scrollbar"></div>
            </div>
        </div>
        <div id="so_stock_info" class="hidden p-3 bg-blue-50 border border-blue-100 rounded-xl text-xs text-blue-700 font-bold mb-4"></div>
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
    const hidden = document.getElementById(selectId);
    const info = document.getElementById(infoId);
    if (!hidden || !info || !hidden.value) { info.classList.add('hidden'); return; }
    
    const item = db.findById('inventoryItems', hidden.value);
    if (!item) return;

    const stock = db.getInventoryStock(hidden.value);
    info.classList.remove('hidden');
    info.innerHTML = `<i class="fas fa-info-circle mr-2"></i>Stok saat ini: <span class="text-blue-800">${invFmt(stock)} ${item.unit || ''}</span>`;
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

// â”€â”€â”€ 4. PRODUCTION COMMAND CENTER (UNIFIED) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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



    const frappeCard = (title, value) => `
        <div class="bg-white rounded-xl border border-gray-100 p-5 flex flex-col justify-between shadow-[0_2px_10px_-3px_rgba(6,81,237,0.05)] h-[104px]">
            <div class="flex justify-between items-start mb-2">
                <span class="text-sm font-medium text-gray-500 hover:text-gray-700 cursor-pointer">${title}</span>
                <span class="text-gray-300 hover:text-gray-500 cursor-pointer text-lg leading-none">...</span>
            </div>
            <div class="text-[26px] font-semibold text-gray-800 tracking-tight leading-none">${value}</div>
        </div>`;

    const statsHeader = `
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 mb-8">
            ${frappeCard('Batch Aktif', activeMOs.length)}
            ${frappeCard('Output Hari Ini (Kg)', invFmt(todayOutput))}
            ${frappeCard('Rata-rata Yield', avgYield + '%')}
        </div>
    `;



    const chartPanel = (title, subtitle, id, heightClass = 'h-64', hasFilters = false, extraBody = '', customFilterHtml = '') => `
        <div class="bg-white rounded-xl border border-gray-100 shadow-[0_2px_10px_-3px_rgba(6,81,237,0.05)] p-5 flex flex-col">
            <div class="flex justify-between items-start mb-6">
                <div>
                    <h3 class="text-[15px] font-semibold text-gray-800">${title}</h3>
                    ${subtitle ? `<p class="text-[12px] text-gray-500 mt-1">${subtitle}</p>` : ''}
                </div>
                <div class="flex gap-2 items-center">
                    ${customFilterHtml}
                    <button class="w-7 h-7 rounded bg-gray-50 text-gray-500 hover:bg-gray-100 flex items-center justify-center transition-colors"><i class="fas fa-filter text-[10px]"></i></button>
                    ${hasFilters ? `
                    <button class="px-2 h-7 rounded bg-gray-50 text-gray-600 hover:bg-gray-100 flex items-center justify-center transition-colors text-[11px] font-medium gap-1">
                        Last Year <i class="fas fa-chevron-down text-[8px] text-gray-400"></i>
                    </button>
                    <button class="px-2 h-7 rounded bg-gray-50 text-gray-600 hover:bg-gray-100 flex items-center justify-center transition-colors text-[11px] font-medium gap-1">
                        <i class="far fa-calendar text-[10px] text-gray-500"></i> Monthly <i class="fas fa-chevron-down text-[8px] text-gray-400"></i>
                    </button>
                    ` : ''}
                    <button class="w-7 h-7 rounded bg-gray-50 text-gray-500 hover:bg-gray-100 flex items-center justify-center transition-colors"><span class="leading-none pb-2 font-bold tracking-widest text-[10px]">...</span></button>
                </div>
            </div>
            ${id ? `<div class="relative w-full ${heightClass} flex-1"><canvas id="${id}"></canvas></div>` : ''}
            ${extraBody}
        </div>`;

    window._mosRawData = mos;
    const uniqueProducts = [...new Set(mos.filter(m => m.stage === 'OVEN_KERING' && m.status === 'DONE').flatMap(m => {
        if (m.targetProducts && m.targetProducts.length > 0) return m.targetProducts.map(tp => tp.itemName);
        return m.productName ? [m.productName] : [];
    }))];
    const prodOpts = uniqueProducts.map(p => `<option value="${p}">${p}</option>`).join('');
    const yieldFilterHtml = `<select id="chartProdYieldFilter" class="px-2 h-7 rounded bg-gray-50 border border-gray-200 text-gray-600 hover:bg-gray-100 transition-colors text-[11px] font-medium outline-none" onchange="window.initProdCharts(window._mosRawData)"><option value="">-- Semua Produk --</option>${prodOpts}</select>`;

    const chartSection = `
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
            ${chartPanel('Tren Output Produksi', 'Last synced just now', 'chartProdOutput', 'h-[300px]', true)}
            ${chartPanel('Tren Yield Oven Kering', 'Efisiensi yield harian per produk', 'chartProdYield', 'h-[300px]', true, '', yieldFilterHtml)}
        </div>
        <div class="grid grid-cols-1 gap-4 mb-8">
            ${chartPanel('Produk Paling Sering Diproduksi', 'Top 5 produk berdasarkan total output (KG)', 'chartTopProds', 'h-[320px]')}
        </div>
    `;

    mc.innerHTML = `
        <div class="animate-in fade-in slide-in-from-bottom-4 duration-500">
            ${statsHeader}
            ${chartSection}
        </div>
    `;

    setTimeout(() => {
        if(window.initProdCharts) window.initProdCharts(mos);
    }, 100);
}

window.initProdCharts = function(mos) {
    if (typeof Chart === 'undefined') return;

    // Destroy existing instances if any
    if (window.outputChartInstance) window.outputChartInstance.destroy();
    if (window.yieldChartInstance) window.yieldChartInstance.destroy();

    // 1. Tren Output Produksi (Bar Chart)
    const ctxOutput = document.getElementById('chartProdOutput');
    if (ctxOutput) {
        const last7Days = [];
        for (let i = 6; i >= 0; i--) {
            const d = new Date();
            d.setDate(d.getDate() - i);
            last7Days.push(d.toISOString().split('T')[0]);
        }

        const ovenBasahData = [];
        const ovenKeringData = [];

        last7Days.forEach(dateStr => {
            const dateMOs = mos.filter(m => m.status === 'DONE' && m.updatedAt?.startsWith(dateStr));
            let ob = 0, ok = 0;
            dateMOs.forEach(m => {
                if (m.stage === 'OVEN_BASAH') ob += (m.outputQty || 0);
                if (m.stage === 'OVEN_KERING') ok += (m.outputQty || 0);
            });
            ovenBasahData.push(ob);
            ovenKeringData.push(ok);
        });

        const labels = last7Days.map(d => {
            const dt = new Date(d);
            return dt.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' });
        });

        window.outputChartInstance = new Chart(ctxOutput, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [
                    {
                        label: 'Oven Basah (Kg)',
                        data: ovenBasahData,
                        backgroundColor: '#fdba74',
                        borderRadius: 4,
                        barThickness: 16
                    },
                    {
                        label: 'Oven Kering (Kg)',
                        data: ovenKeringData,
                        backgroundColor: '#6ee7b7',
                        borderRadius: 4,
                        barThickness: 16
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { position: 'top', labels: { boxWidth: 10, usePointStyle: true, font: {size: 11} } }
                },
                scales: {
                    x: { grid: { display: false }, ticks: { color: '#9ca3af', font: {size: 11} } },
                    y: { beginAtZero: true, grid: { color: '#f3f4f6', drawBorder: false }, ticks: { color: '#9ca3af', font: {size: 11} }, border: {display: false} }
                }
            }
        });
    }

    // 2. Analisis Yield per Produk (Trend)
    const ctxYield = document.getElementById('chartProdYield');
    if (ctxYield) {
        const filterProduct = document.getElementById('chartProdYieldFilter')?.value;
        const last7Days = [];
        for (let i = 6; i >= 0; i--) {
            const d = new Date();
            d.setDate(d.getDate() - i);
            last7Days.push(d.toISOString().split('T')[0]);
        }

        const yieldData = [];
        let hasData = false;

        last7Days.forEach(dateStr => {
            const dateMOs = mos.filter(m => m.status === 'DONE' && m.stage === 'OVEN_KERING' && m.updatedAt?.startsWith(dateStr));
            let totalYield = 0;
            let count = 0;
            dateMOs.forEach(m => {
                if (m.targetProducts && m.targetProducts.length > 0) {
                    m.targetProducts.forEach(tp => {
                        if (!filterProduct || tp.itemName === filterProduct) {
                            const y = tp.qty > 0 ? (tp.outputQty / tp.qty) * 100 : 100;
                            totalYield += y;
                            count++;
                            hasData = true;
                        }
                    });
                } else if (m.productName) {
                    if (!filterProduct || m.productName === filterProduct) {
                        const y = m.yield !== undefined ? parseFloat(m.yield) : (m.inputQty > 0 ? (m.outputQty / m.inputQty * 100) : 100);
                        totalYield += y;
                        count++;
                        hasData = true;
                    }
                }
            });
            yieldData.push(count > 0 ? totalYield / count : null);
        });

        const labels = last7Days.map(d => new Date(d).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' }));

        if (!hasData && filterProduct) {
            ctxYield.parentElement.innerHTML = '<div class="bg-[#f8f9fa] flex items-center justify-center w-full h-full rounded-lg"><span class="text-sm text-gray-400">Belum Ada Data Yield</span></div><canvas id="chartProdYield" class="hidden"></canvas>';
        } else {
            // Restore canvas if it was replaced by 'Belum Ada Data'
            if (ctxYield.classList.contains('hidden')) {
                ctxYield.parentElement.innerHTML = '<canvas id="chartProdYield"></canvas>';
            }
            
            window.yieldChartInstance = new Chart(document.getElementById('chartProdYield'), {
                type: 'line',
                data: {
                    labels: labels,
                    datasets: [{
                        label: 'Rata-rata Yield (%)',
                        data: yieldData,
                        borderColor: '#818cf8',
                        backgroundColor: 'rgba(129, 140, 248, 0.2)',
                        borderWidth: 2,
                        fill: true,
                        tension: 0.4,
                        spanGaps: true,
                        pointBackgroundColor: '#818cf8',
                        pointRadius: 4
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: { legend: { display: false } },
                    scales: {
                        y: { 
                            beginAtZero: false, 
                            min: 80,
                            max: 100, 
 
                            grid: { color: '#f3f4f6', drawBorder: false }, 
                            ticks: { callback: function(value) { return value + "%" }, color: '#9ca3af', font: {size: 11} },
                            border: {display: false}
                        },
                        x: { grid: { display: false }, ticks: { color: '#9ca3af', font: {size: 11} }, border: {display: false} }
                    }
                }
            });
        }

        // 3. Top Products (Horizontal Bar Chart)
        const ctxTop = document.getElementById('chartTopProds');
        if (ctxTop) {
            if (window.topProdChartInstance) window.topProdChartInstance.destroy();
            const topProdsRaw = {};
            mos.filter(m => m.status === 'DONE').forEach(m => {
                const name = m.productName || (m.outputProducts && m.outputProducts.length > 0 ? m.outputProducts[0].itemName : null) || 'Unknown';
                topProdsRaw[name] = (topProdsRaw[name] || 0) + (parseFloat(m.outputQty) || 0);
            });
            const sorted = Object.entries(topProdsRaw).sort((a,b) => b[1] - a[1]).slice(0, 5);

            window.topProdChartInstance = new Chart(ctxTop, {
                type: 'bar',
                data: {
                    labels: sorted.map(p => p[0]),
                    datasets: [{
                        data: sorted.map(p => p[1]),
                        backgroundColor: '#818cf8',
                        borderRadius: 6,
                        barThickness: 24,
                        hoverBackgroundColor: '#6366f1'
                    }]
                },
                options: {
                    indexAxis: 'y',
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: { 
                        legend: { display: false },
                        tooltip: {
                            backgroundColor: '#1e293b',
                            padding: 12,
                            cornerRadius: 8,
                            callbacks: {
                                label: (c) => ` ${invFmt(c.parsed.x)} KG`
                            }
                        }
                    },
                    scales: {
                        x: { display: false, grid: { display: false } },
                        y: { 
                            grid: { display: false }, 
                            border: { display: false },
                            ticks: { 
                                color: '#64748b', 
                                font: { size: 10, weight: 'bold' },
                                padding: 10
                            }
                        }
                    }
                }
            });
        }
    }
}


// --- Fungsi Transfer ke Mixing & Proses Mixing dihapus (tahap Mixing sudah tidak ada) ---

window.openOvenProcessModal = () => {
    const wipInWet = db.read('inventoryItems').filter(i => i.category === 'WIP');
    const validOpts = wipInWet.map(i => {
        const stock = db.getInventoryStock(i.id, 'OVEN_BASAH');
        if (stock <= 0) return null;
        return `<option value="${i.id}" data-stock="${stock}">${i.itemName} (Stok: ${formatNumber(stock)})</option>`;
    }).filter(Boolean).join('');

    const body = `
    <div class="space-y-6">
        <div class="p-4 bg-red-50 border border-red-100 rounded-2xl text-[10px] text-red-700 font-bold uppercase tracking-widest leading-relaxed flex items-center gap-3">
            <div class="w-8 h-8 rounded-full bg-red-100 flex items-center justify-center text-red-500 shadow-sm flex-shrink-0">
                <i class="fas fa-fire text-sm"></i>
            </div>
            <span>Langkah ini memindahkan item dari <strong>Oven Basah</strong> ke <strong>Oven Kering</strong> dengan penyusutan berat.</span>
        </div>

        <div>
            <label class="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Pilih Item di Oven Basah</label>
            <select id="oven_input_item" class="w-full h-[42px] border-2 border-slate-100 rounded-xl px-4 text-xs font-black text-slate-700 focus:border-red-400 outline-none transition-all appearance-none bg-slate-50/50 cursor-pointer" onchange="document.getElementById('oven_in_qty').value=this.selectedOptions[0]?.dataset.stock || 0">
                <option value="">-- Pilih Produk --</option>
                ${validOpts}
            </select>
        </div>

        <div class="grid grid-cols-2 gap-6 bg-slate-50/50 p-5 rounded-2xl border border-slate-100">
            <div>
                <label class="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Qty Masuk Oven</label>
                <div class="relative">
                    <input type="number" id="oven_in_qty" class="w-full h-[38px] border-2 border-slate-200 rounded-xl px-4 text-xs font-black text-slate-400 bg-slate-100 outline-none" readonly>
                    <span class="absolute right-4 top-1/2 -translate-y-1/2 text-[9px] font-black text-slate-300 uppercase tracking-widest">KG</span>
                </div>
            </div>
            <div>
                <label class="block text-[10px] font-black text-red-600 uppercase tracking-widest mb-2 ml-1">Hasil (Oven Kering)</label>
                <div class="relative">
                    <input type="number" id="oven_out_qty" class="w-full h-[38px] border-2 border-red-200 rounded-xl px-4 text-xs font-black text-red-700 focus:border-red-500 outline-none transition-all bg-white shadow-sm" placeholder="0.00">
                    <span class="absolute right-4 top-1/2 -translate-y-1/2 text-[9px] font-black text-red-400 uppercase tracking-widest">KG</span>
                </div>
            </div>
        </div>

        <div>
            <label class="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Keterangan / Catatan</label>
            <input type="text" id="oven_notes" class="w-full h-[38px] border-2 border-slate-100 rounded-xl px-4 text-xs font-bold text-slate-700 focus:border-blue-500 outline-none transition-all bg-slate-50/50" placeholder="Opsional...">
        </div>
    </div>`;

    const footer = `
        <div class="flex gap-3 w-full sm:w-auto">
            <button onclick="closeModal()" class="flex-1 sm:flex-none px-6 py-2.5 rounded-xl border border-slate-200 text-slate-500 text-[10px] font-black uppercase tracking-widest hover:bg-slate-50 transition-all">Batal</button>
            <button onclick="saveOvenProcess()" class="flex-1 sm:flex-none bg-red-600 hover:bg-red-700 text-white px-8 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-red-200 transition-all active:scale-95 flex items-center justify-center gap-2">
                <i class="fas fa-thermometer-half"></i> MULAI BAKING
            </button>
        </div>`;
    showModal('Proses Oven (Baking)', body, footer, 'max-w-md');
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
        return `<option value="${i.id}" data-stock="${stock}">${i.itemName} (Stok: ${formatNumber(stock)})</option>`;
    }).filter(Boolean).join('');

    const body = `
    <div class="space-y-6">
        <div class="p-4 bg-green-50 border border-green-100 rounded-2xl text-[10px] text-green-700 font-bold uppercase tracking-widest leading-relaxed flex items-center gap-3">
            <div class="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center text-green-500 shadow-sm flex-shrink-0">
                <i class="fas fa-check-double text-sm"></i>
            </div>
            <span>Tahap akhir: Memindahkan stok dari <strong>Oven Kering</strong> ke <strong>Gudang Jadi (FG)</strong>.</span>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div class="md:col-span-2">
                <label class="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Pilih Item di Oven Kering</label>
                <select id="fin_input_item" class="w-full h-[42px] border-2 border-slate-100 rounded-xl px-4 text-xs font-black text-slate-700 focus:border-green-400 outline-none transition-all appearance-none bg-slate-50/50 cursor-pointer" onchange="document.getElementById('fin_in_qty').value=this.selectedOptions[0]?.dataset.stock || 0">
                    <option value="">-- Pilih Produk --</option>
                    ${wipOpts}
                </select>
            </div>

            <div>
                <label class="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Stok Tersedia</label>
                <div class="relative">
                    <input type="number" id="fin_in_qty" class="w-full h-[38px] border-2 border-slate-200 rounded-xl px-4 text-xs font-black text-slate-400 bg-slate-100 outline-none" readonly>
                    <span class="absolute right-4 top-1/2 -translate-y-1/2 text-[9px] font-black text-slate-300 uppercase tracking-widest">KG</span>
                </div>
            </div>

            <div>
                <label class="block text-[10px] font-black text-green-600 uppercase tracking-widest mb-2 ml-1">Qty Jadi (Ke FG)</label>
                <div class="relative">
                    <input type="number" id="fin_out_qty" class="w-full h-[38px] border-2 border-green-200 rounded-xl px-4 text-xs font-black text-green-700 focus:border-green-500 outline-none transition-all bg-white shadow-sm" placeholder="0.00">
                    <span class="absolute right-4 top-1/2 -translate-y-1/2 text-[9px] font-black text-green-400 uppercase tracking-widest">KG</span>
                </div>
            </div>
        </div>

        <div class="pt-6 border-t border-slate-100">
            <label class="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">SIMPAN SEBAGAI PRODUK JADI (FG)</label>
            <div id="fin_output_trigger" onclick="openProductSearch('fin_output', 'FINISHED_GOODS')" class="w-full h-[42px] bg-white border-2 border-slate-100 rounded-xl px-4 text-xs font-black text-slate-400 cursor-pointer hover:border-green-400 hover:bg-green-50/20 transition-all flex justify-between items-center group shadow-sm">
                <span id="fin_output_label" class="truncate pr-2 uppercase tracking-widest">-- Cari Produk Jadi di Gudang --</span>
                <div class="w-6 h-6 rounded-lg bg-slate-50 flex items-center justify-center text-slate-300 group-hover:text-green-500 group-hover:bg-green-100 transition-all">
                    <i class="fas fa-search text-[10px]"></i>
                </div>
            </div>
            <input type="hidden" id="fin_output_item">
        </div>
    </div>`;

    const footer = `
        <div class="flex gap-3 w-full sm:w-auto">
            <button onclick="closeModal()" class="flex-1 sm:flex-none px-6 py-2.5 rounded-xl border border-slate-200 text-slate-500 text-[10px] font-black uppercase tracking-widest hover:bg-slate-50 transition-all">Batal</button>
            <button onclick="saveFinalizeProd()" class="flex-1 sm:flex-none bg-green-600 hover:bg-green-700 text-white px-8 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-green-200 transition-all active:scale-95 flex items-center justify-center gap-2">
                <i class="fas fa-warehouse"></i> MASUK GUDANG FG
            </button>
        </div>`;
    showModal('Finalisasi Produksi', body, footer, 'xl');
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

// â”€â”€â”€ 6. STOCK REPORT â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function renderInventoryReport() {
    document.getElementById('pageTitle').innerText = 'Laporan Stok';
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
                    ? '<span class="px-2 py-0.5 rounded text-xs font-semibold bg-red-100 text-red-700">âš  Low Stock</span>'
                    : '<span class="px-2 py-0.5 rounded text-xs font-semibold bg-green-100 text-green-700">âœ“ Normal</span>'}
                    </td>
                    <td class="py-3 px-4 text-sm text-right whitespace-nowrap">
                        ${it.category === 'FINISHED_GOODS' ? `<button onclick="openRepackModal('${it.id}')" class="text-blue-600 hover:text-blue-800 font-bold text-xs bg-blue-50 px-2 py-1 rounded border border-blue-100 mr-2"><i class="fas fa-box-open mr-1"></i>Repack</button>` : ''}
                        <button onclick="renderInventoryItemForm('${it.id}')" class="text-slate-400 hover:text-slate-600 p-1"> <i class="fas fa-edit"></i></button>
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
                <p class="text-xs text-green-600 font-semibold uppercase">Gudang Jadi</p>
                <p class="text-3xl font-bold text-green-700 mt-1">${totalFG}</p>
            </div>
        </div>

        <div class="bg-white rounded-lg shadow-sm border border-gray-100">
            <div class="border-b border-gray-200">
                <nav class="-mb-px flex space-x-4 px-6" id="inv_report_tabs">
                    ${[['all', 'Semua Item'], ['RAW_MATERIAL', 'Bahan Baku'], ['FINISHED_GOODS', 'Gudang Jadi']].map(([cat, label], i) =>
        `<button onclick="switchInvReportTab('${cat}')" id="inv_tab_${cat}" class="whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm ${i === 0 ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}">${label}</button>`
    ).join('')}
                </nav>
            </div>
            <div id="inv_report_table" class="overflow-x-auto">${buildTable(null)}</div>
        </div>
    </div>`;

    window._invReportBuildTable = buildTable;
}

// --- INTEGRASI: PO -> Inventory & SO -> Inventory ---

// Cari inventoryItem by nama (case-insensitive, partial match) â€” fallback jika tidak ada ID
function findInvItemByName(name) {
    if (!name) return null;
    const clean = name.toLowerCase().trim();
    const items = db.read('inventoryItems').filter(i => i.status !== 'INACTIVE');
    let found = items.find(i => i.itemName.toLowerCase() === clean);
    if (found) return found;
    found = items.find(i => i.itemName.toLowerCase().includes(clean) || clean.includes(i.itemName.toLowerCase()));
    return found || null;
}

// Dipanggil dari confirmReceiveGoods (PO diterima) -> stock IN
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
    if (synced > 0) showToast(`[OK] ${synced} item dari PO ${poNumber} otomatis masuk ke stok Inventory!`, 'success');
    else showToast('PO diterima. Pastikan item PO terhubung ke Master Inventory.', 'success');
};

// Dipanggil dari deliverSO (SO dikirim) -> stock OUT
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
                errors.push(`⚠️ Stok inventory "${invItem.itemName}" tidak cukup`);
                return;
            }
            db.addInventoryTransaction(invItem.id, 'OUT', item.qty, 'SO', soId,
                `Auto dari SO Delivery ${soNumber}: ${item.prodText}`);
            synced++;
        }
    });
    if (errors.length) errors.forEach(e => showToast(e, 'error'));
    if (synced > 0) showToast(`âœ… ${synced} item otomatis dikurangi dari stok Inventory!`, 'success');
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

// â”€â”€â”€ 6. PENGIRIMAN BARANG (SURAT JALAN / DELIVERY) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// renderWarehouseDeliveryOrders removed - using the version in delivery_order.js

// Legacy logistics section removed. Using delivery_order.js instead.


// â”€â”€â”€ PENERIMAAN BARANG DARI PO â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function renderInventoryPOReceipt() {
    const mainContent = document.getElementById('main-content');
    const tab = window._porActiveTab || 'pending';
    const suppliers = db.read('suppliers');
    const canEdit = getModulePermission('logistik').edit;

    document.getElementById('pageTitle').innerText = 'Penerimaan Barang dari PO';

    // --- TAB NAVIGATION UI ---
    let tabsHtml = `
        <div class="flex items-center gap-1 bg-slate-100 p-1.5 rounded-2xl w-fit border border-slate-200/60 shadow-inner overflow-hidden">
            <button onclick="window._porActiveTab='pending'; renderInventoryPOReceipt();" 
                class="px-8 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all duration-300 flex items-center gap-2 ${tab === 'pending' ? 'bg-white text-blue-600 shadow-md scale-100 border border-slate-100' : 'text-slate-400 hover:text-slate-600 hover:bg-white/40 opacity-70'}">
                <i class="fas fa-truck-loading"></i> Antrian Gudang
            </button>
            <button onclick="window._porActiveTab='history'; renderInventoryPOReceipt();" 
                class="px-8 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all duration-300 flex items-center gap-2 ${tab === 'history' ? 'bg-white text-green-600 shadow-md scale-100 border border-slate-100' : 'text-slate-400 hover:text-slate-600 hover:bg-white/40 opacity-70'}">
                <i class="fas fa-history"></i> Riwayat Selesai
            </button>
        </div>
    `;

    const filters = window.currentFilters.inventoryPOReceipt;
    const supOptions = suppliers.map(s => `<option value="${s.id}" ${filters.supplier === s.id ? 'selected' : ''}>${s.name}</option>`).join('');

    let pos = db.read('purchaseOrders').sort((a, b) => new Date(b.date) - new Date(a.date));

    // Base Tab Filter
    if (tab === 'pending') {
        pos = pos.filter(po => ['APPROVED', 'PARTIALLY RECEIVED'].includes(po.status));
    } else {
        pos = pos.filter(po => ['RECEIVED', 'PARTIALLY RECEIVED'].includes(po.status) && (po.items || []).some(i => (i.receivedQty || 0) > 0));
    }

    // Filter Logic
    if (filters.start) { const d = new Date(filters.start); d.setHours(0, 0, 0, 0); pos = pos.filter(po => new Date(po.date) >= d); }
    if (filters.end) { const d = new Date(filters.end); d.setHours(23, 59, 59, 999); pos = pos.filter(po => new Date(po.date) <= d); }
    if (filters.supplier) { pos = pos.filter(po => po.supplierId === filters.supplier); }

    let rows = pos.map(po => {
        const supplier = suppliers.find(s => s.id === po.supplierId) || { name: 'Unknown' };
        const totalQty = (po.items || []).reduce((s, i) => s + (i.qty || 0), 0);
        const receivedQty = (po.items || []).reduce((s, i) => s + (i.receivedQty || 0), 0);
        const progressPct = totalQty > 0 ? Math.round((receivedQty / totalQty) * 100) : 0;

        return `
            <tr class="border-b border-slate-50 hover:bg-slate-50/50 transition-colors group">
                <td class="py-4 px-6 whitespace-nowrap">
                    <button onclick="${tab === 'pending' ? `viewPO('${po.id}')` : `viewPOReceiptDetails('${po.id}')`}" class="text-blue-700 hover:text-blue-800 font-mono text-sm font-bold transition-colors cursor-pointer outline-none bg-blue-50/80 px-3.5 py-1.5 rounded-lg border border-blue-200 shadow-sm">
                        ${po.poNumber.toUpperCase()}
                    </button>
                </td>
                <td class="py-4 px-6 text-sm text-slate-500 font-medium">${invDate(po.date)}</td>
                <td class="py-4 px-6 text-sm text-slate-900 font-bold tracking-tight">${supplier.name}</td>
                <td class="py-4 px-6">
                    <div class="flex items-center gap-3">
                        <div class="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden" style="min-width:100px">
                            <div class="h-full ${progressPct === 100 ? 'bg-green-500' : 'bg-blue-500'} rounded-full transition-all duration-1000" style="width: ${progressPct}%"></div>
                        </div>
                        <span class="text-[10px] font-black text-slate-500 tracking-tighter w-12 text-right">${invFmt(receivedQty)}/${invFmt(totalQty)}</span>
                    </div>
                </td>
                <td class="py-4 px-6 text-center">
                    <span class="px-3 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest border border-blue-100 bg-blue-50 text-blue-600">${po.status === 'PARTIALLY RECEIVED' ? 'PARTIALLY RECEIVED' : po.status}</span>
                </td>
                <td class="py-4 px-6 text-right whitespace-nowrap">
                    ${tab === 'pending' ? (canEdit ? `
                    <button onclick="openPOReceiptModal('${po.id}')" class="bg-blue-600 hover:bg-slate-900 text-white px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-blue-200 transition-all active:scale-95 flex items-center gap-2 ml-auto">
                        <i class="fas fa-box-open"></i> TERIMA
                    </button>
                    ` : '<span class="text-slate-400 text-[10px] italic font-medium">VIEW ONLY</span>') : `
                    <button onclick="viewPOReceiptDetails('${po.id}')" class="bg-slate-100 hover:bg-slate-200 text-slate-600 px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all active:scale-95 flex items-center gap-2 ml-auto">
                        <i class="fas fa-eye"></i> DETAIL
                    </button>
                    `}
                </td>
            </tr>`;
    }).join('');

    if (pos.length === 0) rows = `<tr><td colspan="6" class="py-32 text-center text-slate-300 font-black uppercase tracking-widest opacity-40 italic"><i class="fas fa-truck-loading text-5xl mb-4"></i><br>${tab === 'pending' ? 'Tidak ada antrian penerimaan barang' : 'Belum ada riwayat penerimaan'}</td></tr>`;

    mainContent.innerHTML = `
        <div id="por-list-view" class="animate-in fade-in duration-300 h-[calc(100vh-64px)] flex flex-col bg-slate-50 -m-4 sm:-m-6">
            <!-- Full Width Fixed Header Bar -->
            <div class="bg-white border-b border-gray-200 shrink-0 z-40 shadow-sm relative">
                <div class="flex flex-wrap md:flex-nowrap justify-between items-center px-6 py-4 gap-4">
                    <div class="flex items-center gap-3 flex-1">
                        <div class="flex-1 max-w-md relative">
                            <i class="fas fa-search absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 text-sm cursor-text pointer-events-none"></i>
                            <input type="text" id="por_search" onkeyup="filterPORTable()" placeholder="Search Pending Receiving..." 
                                class="w-full pl-11 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm font-medium text-slate-700 placeholder:text-slate-400 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:bg-white outline-none transition-all">
                        </div>
                        
                        <!-- Date Filter Dropdown Trigger -->
                        <div class="relative" id="por_date_filter_container">
                            <button onclick="togglePORDateDropdown()" class="flex items-center bg-slate-50 border border-slate-200 rounded-xl overflow-hidden hover:bg-slate-100 transition-all shadow-sm h-[38px] group p-0">
                                <span class="bg-slate-100 border-r border-slate-200 px-3 h-full flex items-center text-slate-600 transition-colors">
                                    <i class="fas fa-sort-amount-up text-[13px]"></i>
                                </span>
                                <span class="px-4 text-[14px] font-medium text-blue-600">Date</span>
                                <span class="pr-3 pl-1 text-slate-500 justify-center flex items-center">
                                    <i class="fas fa-chevron-down text-[11px]"></i>
                                </span>
                            </button>
                            
                            <!-- Dropdown Content -->
                            <div id="por_date_dropdown" class="absolute left-0 mt-2 w-72 bg-white border border-slate-100 rounded-2xl shadow-xl z-[200] hidden p-5 animate-in fade-in zoom-in-95 duration-200">
                                <h4 class="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Filter Berdasarkan Tanggal</h4>
                                <div class="space-y-4">
                                    <div>
                                        <label class="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Dari Tanggal</label>
                                        <input type="date" id="por_header_start" value="${filters.start || ''}" class="w-full border border-slate-100 rounded-xl px-3 py-2 text-sm font-bold text-slate-700 bg-slate-50/50 focus:bg-white focus:border-blue-500 outline-none transition-all">
                                    </div>
                                    <div>
                                        <label class="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Sampai Tanggal</label>
                                        <input type="date" id="por_header_end" value="${filters.end || ''}" class="w-full border border-slate-100 rounded-xl px-3 py-2 text-sm font-bold text-slate-700 bg-slate-50/50 focus:bg-white focus:border-blue-500 outline-none transition-all">
                                    </div>
                                    <div class="flex gap-2 pt-2">
                                        <button onclick="applyPORHeaderFilter()" class="flex-1 bg-blue-600 text-white py-2.5 rounded-xl text-[11px] font-black uppercase tracking-widest hover:bg-blue-700 transition-all shadow-md active:scale-95">Apply</button>
                                        <button onclick="resetPORHeaderFilter()" class="flex-1 bg-slate-50 text-slate-500 py-2.5 rounded-xl text-[11px] font-black uppercase tracking-widest hover:bg-slate-100 transition-all">Reset</button>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <!-- Supplier Filter Dropdown Trigger -->
                        <div class="relative" id="por_sup_filter_container">
                            <button onclick="togglePORSupDropdown()" class="flex items-center bg-slate-50 border border-slate-200 rounded-xl overflow-hidden hover:bg-slate-100 transition-all shadow-sm h-[38px] group p-0">
                                <span class="bg-slate-100 border-r border-slate-200 px-3 h-full flex items-center text-slate-600 transition-colors">
                                    <i class="fas fa-building text-[13px]"></i>
                                </span>
                                <span class="px-4 text-[14px] font-medium text-blue-600">Supplier</span>
                                <span class="pr-3 pl-1 text-slate-500 justify-center flex items-center">
                                    <i class="fas fa-chevron-down text-[11px]"></i>
                                </span>
                            </button>
                            
                            <!-- Dropdown Content -->
                            <div id="por_sup_dropdown" class="absolute left-0 mt-2 w-72 bg-white border border-slate-100 rounded-2xl shadow-xl z-[200] hidden p-5 animate-in fade-in zoom-in-95 duration-200">
                                <h4 class="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Pilih Supplier</h4>
                                <div class="space-y-4">
                                    <select id="por_header_sup" class="w-full border border-slate-100 rounded-xl px-3 py-2 text-sm font-bold text-slate-700 bg-slate-50/50 focus:bg-white focus:border-blue-500 outline-none transition-all">
                                        <option value="">Semua Supplier</option>
                                        ${supOptions}
                                    </select>
                                    <div class="flex gap-2 pt-2">
                                        <button onclick="applyPORHeaderFilter()" class="flex-1 bg-blue-600 text-white py-2.5 rounded-xl text-[11px] font-black uppercase tracking-widest hover:bg-blue-700 transition-all shadow-md active:scale-95">Apply</button>
                                        <button onclick="resetPORHeaderFilter()" class="flex-1 bg-slate-50 text-slate-500 py-2.5 rounded-xl text-[11px] font-black uppercase tracking-widest hover:bg-slate-100 transition-all">Reset</button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                <div class="px-6 pb-4 pt-4">
                    ${tabsHtml}
                </div>
            </div>

            <!-- Content Area -->
            <div class="flex-1 overflow-auto">
                <table class="w-full text-left border-collapse" id="por_table">
                    <thead class="bg-slate-50 sticky top-0 z-30 shadow-[0_1px_0_#e2e8f0]">
                        <tr class="bg-slate-50/50 border-b border-slate-100">
                            <th class="py-4 px-6 text-[10px] font-black text-slate-400 uppercase tracking-widest whitespace-nowrap">NO. PO</th>
                            <th class="py-4 px-6 text-[10px] font-black text-slate-400 uppercase tracking-widest whitespace-nowrap">TGL ORDER</th>
                            <th class="py-4 px-6 text-[10px] font-black text-slate-400 uppercase tracking-widest whitespace-nowrap">SUPPLIER</th>
                            <th class="py-4 px-6 text-[10px] font-black text-slate-400 uppercase tracking-widest whitespace-nowrap">PROGRES TERIMA</th>
                            <th class="py-4 px-6 text-[10px] font-black text-slate-400 uppercase tracking-widest whitespace-nowrap text-center">STATUS</th>
                            <th class="py-4 px-6 text-[10px] font-black text-slate-400 uppercase tracking-widest whitespace-nowrap text-right">AKSI</th>
                        </tr>
                    </thead>
                    <tbody class="divide-y divide-slate-100 bg-white">
                        ${rows}
                    </tbody>
                </table>
            </div>
            
            <div class="bg-slate-50 border-t border-slate-200 p-2 text-center text-[10px] font-black text-slate-400 tracking-widest uppercase shrink-0">
                TOTAL: ${pos.length} DOKUMEN MENUNGGU
            </div>
        </div>
    `;

    // Add UI Helpers
    window.togglePORDateDropdown = () => {
        document.getElementById('por_date_dropdown').classList.toggle('hidden');
        const el = document.getElementById('por_sup_dropdown');
        if (el) el.classList.add('hidden');
    };
    
    window.togglePORSupDropdown = () => {
        document.getElementById('por_sup_dropdown').classList.toggle('hidden');
        const el = document.getElementById('por_date_dropdown');
        if (el) el.classList.add('hidden');
    };

    window.applyPORHeaderFilter = () => {
        window.currentFilters.inventoryPOReceipt.start = document.getElementById('por_header_start').value;
        window.currentFilters.inventoryPOReceipt.end = document.getElementById('por_header_end').value;
        window.currentFilters.inventoryPOReceipt.supplier = document.getElementById('por_header_sup').value;
        renderInventoryPOReceipt();
    };

    window.resetPORHeaderFilter = () => {
        window.currentFilters.inventoryPOReceipt = { start: '', end: '', supplier: '', status: '' };
        renderInventoryPOReceipt();
    };

    window.filterPORTable = () => {
        const query = document.getElementById('por_search').value.toLowerCase();
        const trs = document.getElementById('por_table').querySelectorAll('tbody tr');
        trs.forEach(tr => {
            const txt = tr.innerText.toLowerCase();
            tr.style.display = txt.includes(query) ? '' : 'none';
        });
    };
}

// Close dropdowns on outside click
document.addEventListener('click', (e) => {
    if (!e.target.closest('#por_date_filter_container')) {
        const el = document.getElementById('por_date_dropdown');
        if (el) el.classList.add('hidden');
    }
    if (!e.target.closest('#por_sup_filter_container')) {
        const el = document.getElementById('por_sup_dropdown');
        if (el) el.classList.add('hidden');
    }
});

window.openPOReceiptModal = (id) => {
    const po = db.findById('purchaseOrders', id);
    if (!['APPROVED', 'PARTIALLY RECEIVED'].includes(po.status)) {
        showToast('PO harus APPROVED atau PARTIAL sebelum terima barang', 'error');
        return;
    }
    const rows = (po.items || []).map((i, idx) => {
        const receivedSoFar = i.receivedQty || 0;
        const sisa = Math.max(0, i.qty - receivedSoFar);
        return `
        <tr class="border-b text-sm">
            <td class="py-4 px-4">${i.prodText || i.itemName || '-'}
                <div class="text-[10px] text-gray-400 mt-1">Total Pesan: ${invFmt(i.qty)} | Sudah Terima: ${invFmt(receivedSoFar)}</div>
            </td>
            <td class="py-4 px-4 text-center"><span class="font-bold text-blue-600">${invFmt(sisa)}</span></td>
            <td class="py-4 px-4 text-right">
                <input type="number" id="recv_qty_${idx}" value="${sisa}" max="${sisa}" min="0"
                    ${sisa === 0 ? 'disabled' : ''}
                    class="w-20 border border-gray-300 rounded px-2 py-1 text-center text-sm ${sisa === 0 ? 'bg-gray-100' : ''}">
            </td>
        </tr>`;
    }).join('');

    const todayStr = new Date().toISOString().split('T')[0];
    const npbNum = window.generateNPBNumber ? window.generateNPBNumber() : `NPB-${todayStr.replace(/-/g, '')}-${Math.floor(Math.random()*1000)}`;
    const body = `<div class="text-sm">
        <div class="bg-blue-50 border border-blue-100 p-4 rounded-xl mb-4">
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                    <label class="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">No. NPB (Otomatis)</label>
                    <input type="text" id="recv_npb" value="${npbNum}" readonly class="w-full border-none rounded-lg px-3 py-2 text-sm font-bold text-blue-700 bg-blue-100/50 shadow-sm outline-none cursor-not-allowed">
                </div>
                <div>
                    <label class="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Tanggal Terima</label>
                    <input type="date" id="recv_date" value="${todayStr}" class="w-full border-none rounded-lg px-3 py-2 text-sm font-bold text-slate-700 bg-white shadow-sm focus:ring-2 focus:ring-blue-500 outline-none">
                </div>
                <div>
                    <label class="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">No. Surat Jalan (Supplier)</label>
                    <input type="text" id="recv_sj" placeholder="Contoh: SJ-12345" class="w-full border-none rounded-lg px-3 py-2 text-sm font-bold text-slate-700 bg-white shadow-sm focus:ring-2 focus:ring-blue-500 outline-none">
                </div>
                <div>
                    <label class="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Penerima / Keterangan</label>
                    <input type="text" id="recv_notes" placeholder="Nama penerima atau catatan tambahan" class="w-full border-none rounded-lg px-3 py-2 text-sm font-bold text-slate-700 bg-white shadow-sm focus:ring-2 focus:ring-blue-500 outline-none">
                </div>
            </div>
        </div>
        
        <p class="text-gray-500 mb-3 text-xs italic">Masukkan qty aktual yang diterima. (Barang yang sudah diterima 100% tidak bisa diinput lagi).</p>
        <div class="overflow-x-auto rounded-xl border border-slate-200">
            <table class="w-full text-left">
                <thead class="bg-slate-50 border-b border-slate-200 text-[10px] font-black text-slate-500 uppercase tracking-widest">
                    <tr>
                        <th class="py-4 px-4">Produk</th>
                        <th class="py-4 px-4 text-center">Sisa Qty</th>
                        <th class="py-4 px-4 text-right">Terima Hari Ini</th>
                    </tr>
                </thead>
                <tbody class="divide-y divide-slate-100">
                    ${rows}
                </tbody>
            </table>
        </div>
    </div>`;

    const mainContent = document.getElementById('main-content');
    let formView = document.getElementById('por-form-view');
    if (!formView) {
        mainContent.insertAdjacentHTML('beforeend', '\n<div id="por-form-view" class="hidden"></div>');
        formView = document.getElementById('por-form-view');
    }

    const listViewPending = document.getElementById('por-list-view');
    if (listViewPending) listViewPending.classList.add('hidden');
    
    formView.innerHTML = `
        <div class="animate-in fade-in slide-in-from-bottom-2 duration-400 -m-4 sm:-m-6 h-[calc(100vh-64px)] flex flex-col overflow-hidden bg-slate-50/50">
            <div class="sticky top-0 z-40 bg-white border-b border-slate-100 px-8 py-4 flex justify-between items-center shrink-0 shadow-sm">
                <div class="flex items-center gap-4">
                    <h2 class="text-lg font-black text-slate-800 tracking-tight">Terima Barang - <span class="text-blue-600">${po.poNumber}</span></h2>
                </div>
                <div class="flex items-center gap-3">
                    <button onclick="closePORForm()" class="px-6 py-2.5 bg-slate-100 text-slate-500 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-200 transition-all active:scale-95">BATAL</button>
                    <button onclick="confirmPOReceipt('${id}')" class="px-8 py-2.5 bg-green-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-green-700 transition-all shadow-lg shadow-green-200 active:scale-95 flex items-center gap-2">
                        <i class="fas fa-check"></i> KONFIRMASI TERIMA
                    </button>
                </div>
            </div>
            
            <div class="flex-1 overflow-y-auto custom-scrollbar pb-32">
                <div class="w-full px-8 py-8 max-w-7xl mx-auto space-y-8">
                    <div class="bg-white rounded-3xl p-8 border border-slate-100 shadow-sm">
                        <h3 class="text-[10px] font-black text-blue-600 uppercase tracking-widest mb-6 flex items-center gap-2">
                            <i class="fas fa-info-circle"></i> INFORMASI PENERIMAAN
                        </h3>
                        ${body}
                    </div>
                </div>
            </div>
        </div>
    `;
    
    formView.classList.remove('hidden');
};

window.closePORForm = () => {
    const formView = document.getElementById('por-form-view');
    const listViewPending = document.getElementById('por-list-view');
    if (formView) formView.classList.add('hidden');
    if (listViewPending) listViewPending.classList.remove('hidden');
    renderInventoryPOReceipt();
};

window.confirmPOReceipt = async (id) => {
    const po = db.findById('purchaseOrders', id);
    const updatedItems = JSON.parse(JSON.stringify(po.items || []));
    let anyReceived = false;
    let sumReceived = 0, sumTarget = 0;
    const receivedItems = [];

    const recvDate = document.getElementById('recv_date')?.value || new Date().toISOString().split('T')[0];
    const recvNpb = document.getElementById('recv_npb')?.value || '';

    updatedItems.forEach((item, idx) => {
        sumTarget += item.qty;
        const recvInput = document.getElementById(`recv_qty_${idx}`);
        if (!recvInput || recvInput.disabled) { sumReceived += (item.receivedQty || 0); return; }
        const recvQty = parseFloat(recvInput.value) || 0;
        item.receivedQty = (item.receivedQty || 0) + recvQty;
        sumReceived += item.receivedQty;
        if (recvQty > 0) {
            receivedItems.push({
                index: idx,
                prodText: item.prodText || item.itemName || '',
                qty: recvQty,
                unit: item.unit || '',
                inventoryItemId: item.inventoryItemId || item.productId || null,
                price: item.price || 0
            });
            anyReceived = true;
        }
    });

    if (!anyReceived) { showToast('Tidak ada qty yang dimasukkan', 'error'); return; }

    try {
        // Use Phase 2 API for Atomic Transaction (Stock IN + Journal + Status Update)
        const result = await api.receivePOGoods(id, {
            receivedItems, recvDate, recvNpb, recvSj: '', recvNotes: ''
        });

        // Optimistic UI update
        db.update('purchaseOrders', id, {
            status: result.newStatus,
            receivedAt: new Date().toISOString(),
            actualDeliveryDate: result.isCompleted ? new Date().toISOString().split('T')[0] : (po.actualDeliveryDate || null),
            items: updatedItems
        });

        showToast(result.message, result.isCompleted ? 'success' : 'info');
        closePORForm();
    } catch (err) {
        showToast(err.message, 'error');
    }
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

    showModal(`Detail Penerimaan - ${po.poNumber}`, body, `<button onclick="closeModal()" class="btn-secondary">Tutup</button>`);
};



// ─── 7. SHRINKAGE REPORT ──────────────────────────────────────────
window.renderInventoryShrinkageReport = () => {
    const canEdit = getModulePermission('produksi').edit;
    document.getElementById('pageTitle').innerText = 'Laporan Penyusutan';
    const mc = document.getElementById('main-content');

    const filters = window.currentFilters.inventoryShrinkage || {};
    const now = new Date();
    const currentYear = now.getFullYear();
    const firstDay = `${currentYear}-01-01`;
    const lastDay = `${currentYear}-12-31`;

    const fromVal = filters.start || firstDay;
    const toVal = filters.end || lastDay;

    mc.innerHTML = `
    <div class="animate-in fade-in slide-in-from-top-4 duration-500 space-y-6">
        <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
            <div>
                <h2 class="text-lg font-bold text-slate-800 tracking-tight">Analytics Penyusutan (KG)</h2>
                <p class="text-xs text-slate-400 font-medium">Monitoring tren penyusutan produksi bulanan</p>
            </div>
            <div class="flex gap-2">
                ${canEdit ? `
                <button onclick="openManualShrinkageModal()" class="bg-blue-600 hover:bg-slate-900 text-white px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-blue-200 transition-all active:scale-95 flex items-center gap-2">
                    <i class="fas fa-plus"></i> CATAT PENYUSUTAN MANUAL
                </button>
                ` : ''}
            </div>
        </div>

        <!-- Analytics Filter Bar -->
        <div class="bg-white border border-slate-100 rounded-2xl shadow-sm p-5">
            <div class="flex flex-wrap items-center gap-4">
                <div class="flex items-center gap-3 bg-slate-50 p-1.5 rounded-xl border border-slate-100">
                    <div class="flex flex-col px-3">
                        <label class="text-[9px] font-black text-slate-400 uppercase tracking-widest">Dari Tanggal</label>
                        <input type="date" id="sr_from" value="${fromVal}" onchange="runShrinkageReport()"
                            class="bg-transparent border-none text-sm font-bold text-slate-700 focus:ring-0 p-0 cursor-pointer">
                    </div>
                    <div class="w-px h-8 bg-slate-200"></div>
                    <div class="flex flex-col px-3">
                        <label class="text-[9px] font-black text-slate-400 uppercase tracking-widest">Sampai Tanggal</label>
                        <input type="date" id="sr_to" value="${toVal}" onchange="runShrinkageReport()"
                            class="bg-transparent border-none text-sm font-bold text-slate-700 focus:ring-0 p-0 cursor-pointer">
                    </div>
                </div>

                <div class="h-10 w-px bg-slate-100 hidden md:block mx-2"></div>

                <div class="flex items-center gap-2">
                    <button onclick="runShrinkageReport()" class="bg-blue-600 text-white px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-blue-500/20 hover:bg-slate-900 transition-all active:scale-95">
                        Update Report
                    </button>
                    <button onclick="exportShrinkageReport()" class="bg-white border border-slate-200 text-slate-600 px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-50 transition-all">
                        <i class="fas fa-file-export mr-2"></i> Export
                    </button>
                </div>
            </div>
        </div>

        <!-- Chart Section -->
        <div class="bg-white border border-slate-100 rounded-2xl shadow-sm p-6">
            <div class="flex items-center justify-between mb-6">
                <div>
                    <h3 class="text-sm font-bold text-slate-800">Tren Penyusutan Bulanan</h3>
                    <p class="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">Nilai dalam Kilogram (KG)</p>
                </div>
                <div class="flex items-center gap-4">
                    <div class="flex items-center gap-2">
                        <div class="w-3 h-3 rounded-full bg-blue-500"></div>
                        <span class="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Penyusutan</span>
                    </div>
                </div>
            </div>
            <div style="height:320px; position:relative;">
                <canvas id="shrinkage_analytics_chart"></canvas>
            </div>
        </div>

        <!-- Monthly Summary (Full Width) -->
        <div class="bg-white border border-slate-100 rounded-2xl shadow-sm overflow-hidden flex flex-col">
            <div class="px-5 py-4 border-b border-slate-50 bg-slate-50/50 flex justify-between items-center">
                <h3 class="text-[10px] font-black text-slate-500 uppercase tracking-widest">Ringkasan Penyusutan Bulanan</h3>
                <span class="text-[9px] font-bold text-slate-400">KLIK DETAIL UNTUK MELIHAT DATA HARIAN</span>
            </div>
            <div class="overflow-x-auto">
                <table class="w-full text-sm">
                    <thead class="bg-white border-b border-slate-100">
                        <tr>
                            <th class="px-6 py-4 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Periode Bulan</th>
                            <th class="px-6 py-4 text-right text-[10px] font-black text-slate-400 uppercase tracking-widest">Total Penyusutan</th>
                            <th class="px-6 py-4 text-center text-[10px] font-black text-slate-400 uppercase tracking-widest">Aksi</th>
                        </tr>
                    </thead>
                    <tbody id="shrinkage_monthly_body" class="divide-y divide-slate-50"></tbody>
                    <tfoot id="shrinkage_monthly_foot" class="bg-blue-50/20 font-black"></tfoot>
                </table>
            </div>
        </div>
    </div>`;

    setTimeout(() => runShrinkageReport(), 50);
};

window.runShrinkageReport = () => {
    const fromVal = document.getElementById('sr_from')?.value;
    const toVal = document.getElementById('sr_to')?.value;
    
    if (!window.currentFilters.inventoryShrinkage) window.currentFilters.inventoryShrinkage = {};
    if (fromVal) window.currentFilters.inventoryShrinkage.start = fromVal;
    if (toVal) window.currentFilters.inventoryShrinkage.end = toVal;

    const monthlyBody = document.getElementById('shrinkage_monthly_body');
    const monthlyFoot = document.getElementById('shrinkage_monthly_foot');
    
    if (!fromVal || !toVal || !monthlyBody) return;

    const from = new Date(fromVal + 'T00:00:00');
    const to = new Date(toVal + 'T23:59:59');

    const items = db.read('inventoryItems');

    const moShrinkages = (db.read('productionOrders') || []).filter(mo => {
        if (mo.status !== 'DONE') return false;
        const kg = parseFloat(mo.shrinkageKg) || 0;
        if (kg <= 0) return false;
        const d = new Date(mo.completedAt || mo.updatedAt || mo.createdAt);
        return d >= from && d <= to;
    }).map(mo => {
        const inputItem = mo.inputItemId ? items.find(i => i.id === mo.inputItemId) : null;
        return {
            date: mo.completedAt || mo.updatedAt || mo.createdAt,
            itemName: inputItem?.itemName || `WIP ${mo.stage} (${mo.productName || '-'})`,
            qty: parseFloat(mo.shrinkageKg) || 0,
            pct: parseFloat(mo.shrinkagePct) || 0,
            unit: inputItem?.unit || 'KG',
            notes: `Susut ${mo.stage} MO ${mo.moNumber}`,
            source: 'MO'
        };
    });

    const manualTxs = (db.read('stockTransactions') || []).filter(t => {
        const d = new Date(t.date);
        return d >= from && d <= to && (t.reference === 'SHRINKAGE' || t.type === 'SHRINKAGE');
    }).map(t => {
        let pct = 0;
        const match = t.notes?.match(/Susut ([\d.]+)%/i);
        if (match) pct = parseFloat(match[1]);
        return {
            date: t.date,
            itemName: t.itemName || 'Item Tidak Diketahui',
            qty: parseFloat(t.qty) || 0,
            pct: pct,
            unit: items.find(i => i.id === t.itemId)?.unit || t.unit || 'KG',
            notes: t.notes || 'Penyusutan Manual',
            source: 'MANUAL'
        };
    });

    const allEntries = [...moShrinkages, ...manualTxs].sort((a,b) => new Date(b.date) - new Date(a.date));
    let grandTotal = 0;
    
    const buckets = [];
    let curr = new Date(from.getFullYear(), from.getMonth(), 1);
    while (curr <= to) {
        buckets.push({
            month: curr.getMonth(),
            year: curr.getFullYear(),
            label: curr.toLocaleString('id-ID', { month: 'long', year: 'numeric' }),
            total: 0
        });
        curr.setMonth(curr.getMonth() + 1);
    }

    allEntries.forEach(e => {
        const d = new Date(e.date);
        const b = buckets.find(x => x.month === d.getMonth() && x.year === d.getFullYear());
        if (b) {
            b.total += e.qty;
            grandTotal += e.qty;
        }
    });

    monthlyBody.innerHTML = buckets.slice().reverse().map(b => `
        <tr class="hover:bg-slate-50 transition-colors">
            <td class="px-6 py-4 font-bold text-slate-700">${b.label}</td>
            <td class="px-6 py-4 text-right font-black text-slate-900 font-mono">${invFmt(b.total)} KG</td>
            <td class="px-6 py-4 text-center">
                <button onclick="showShrinkageMonthDetail(${b.month}, ${b.year})" class="text-[10px] font-black text-blue-600 hover:text-slate-900 uppercase tracking-widest border-b-2 border-blue-100 hover:border-slate-200 pb-0.5 transition-all">Detail</button>
            </td>
        </tr>
    `).join('') || '<tr><td colspan="3" class="py-12 text-center text-slate-400 italic">Tidak ada data penyusutan di periode ini.</td></tr>';

    monthlyFoot.innerHTML = `
        <tr>
            <td class="px-6 py-5 text-[11px] text-blue-800 uppercase tracking-widest">Total Akumulasi Periode</td>
            <td class="px-6 py-5 text-right text-lg text-blue-900 font-black font-mono">${invFmt(grandTotal)} KG</td>
            <td></td>
        </tr>
    `;

    // Store globally for detail modal access
    window._lastShrinkData = allEntries;

    // Render Chart
    const ctx = document.getElementById('shrinkage_analytics_chart');
    if (ctx && typeof Chart !== 'undefined') {
        if (window._shrinkChart) window._shrinkChart.destroy();
        window._shrinkChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: buckets.map(b => b.label),
                datasets: [{
                    label: 'Penyusutan (KG)',
                    data: buckets.map(b => b.total),
                    borderColor: '#3b82f6',
                    backgroundColor: 'rgba(59, 130, 246, 0.1)',
                    fill: true,
                    tension: 0.4,
                    pointRadius: 4,
                    pointBackgroundColor: '#3b82f6',
                    pointBorderColor: '#fff',
                    pointBorderWidth: 2,
                    borderWidth: 3
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        backgroundColor: '#1e293b',
                        titleFont: { size: 11, weight: 'bold' },
                        bodyFont: { size: 12, weight: 'black' },
                        padding: 12,
                        callbacks: { label: ctx => ` ${ctx.parsed.y.toLocaleString('id-ID')} KG` }
                    }
                },
                scales: {
                    x: { grid: { display: false }, ticks: { font: { size: 10, weight: 'bold' }, color: '#94a3b8' } },
                    y: { 
                        beginAtZero: true, 
                        grid: { color: 'rgba(226, 232, 240, 0.5)', drawBorder: false },
                        ticks: { font: { size: 10, weight: 'bold' }, color: '#94a3b8', callback: v => v + ' kg' }
                    }
                }
            }
        });
    }
};

window.showShrinkageMonthDetail = (month, year, start = null, end = null) => {
    const months = ['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember'];
    const label = `${months[month]} ${year}`;
    
    // Default to full month if no specific dates provided
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    
    const filterStart = start ? new Date(start) : firstDay;
    const filterEnd = end ? new Date(end) : lastDay;
    
    // Set hours to ensure range works
    filterStart.setHours(0,0,0,0);
    filterEnd.setHours(23,59,59,999);

    const data = (window._lastShrinkData || []).filter(e => {
        const d = new Date(e.date);
        return d >= filterStart && d <= filterEnd;
    });

    const rows = data.map(e => `
        <tr class="hover:bg-slate-50 transition-colors border-b border-slate-100 last:border-0">
            <td class="px-4 py-3 text-[11px] text-slate-500 font-medium">${invDate(e.date)}</td>
            <td class="px-4 py-3">
                <div class="text-xs font-bold text-slate-800">${e.itemName}</div>
                <div class="text-[9px] text-slate-400 italic leading-tight mt-0.5">${e.notes}</div>
            </td>
            <td class="px-4 py-3 text-right text-sm font-black text-red-600 font-mono">-${invFmt(e.qty)} <span class="text-[10px]">KG</span></td>
            <td class="px-4 py-3 text-center">
                <span class="text-[10px] font-bold text-slate-500 bg-slate-50 px-2 py-0.5 rounded border border-slate-100">${e.pct > 0 ? e.pct.toFixed(1) + '%' : '-'}</span>
            </td>
        </tr>
    `).join('') || '<tr><td colspan="4" class="py-12 text-center text-slate-400 italic">Tidak ada rincian data untuk periode ini.</td></tr>';

    const total = data.reduce((s, e) => s + e.qty, 0);
    const fromVal = filterStart.toISOString().split('T')[0];
    const toVal = filterEnd.toISOString().split('T')[0];

    const body = `
        <div class="space-y-4 animate-in fade-in duration-300">
            <!-- Filter Bar styled like image -->
            <div class="flex justify-end mb-2">
                <div class="flex items-center bg-[#f8fafc] border border-slate-200 rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-all group">
                    <div class="px-3 py-2.5 bg-slate-100 border-r border-slate-200 text-slate-500 group-hover:text-blue-600 transition-colors">
                        <i class="fas fa-calendar-day text-xs"></i>
                    </div>
                    <div class="flex items-center px-4 py-2 gap-4">
                        <div class="flex flex-col">
                            <span class="text-[8px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Dari</span>
                            <input type="date" id="modal_shrink_from" value="${fromVal}" 
                                class="bg-transparent border-none p-0 text-[11px] font-bold text-blue-600 outline-none w-[100px] cursor-pointer">
                        </div>
                        <div class="w-px h-8 bg-slate-200"></div>
                        <div class="flex flex-col">
                            <span class="text-[8px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Sampai</span>
                            <input type="date" id="modal_shrink_to" value="${toVal}" 
                                class="bg-transparent border-none p-0 text-[11px] font-bold text-blue-600 outline-none w-[100px] cursor-pointer">
                        </div>
                        <button onclick="applyModalShrinkFilter(${month}, ${year})" 
                            class="ml-2 w-9 h-9 rounded-lg bg-blue-600 text-white flex items-center justify-center hover:bg-blue-700 transition-all shadow-lg shadow-blue-500/20 active:scale-95">
                            <i class="fas fa-filter text-xs"></i>
                        </button>
                    </div>
                </div>
            </div>

            <div class="flex items-center justify-between bg-blue-50/50 p-4 rounded-xl border border-blue-100">
                <div>
                    <p class="text-[9px] font-black text-blue-400 uppercase tracking-widest mb-0.5">Total Penyusutan Terfilter</p>
                    <p class="text-xl font-black text-blue-800 font-mono">${invFmt(total)} KG</p>
                </div>
                <div class="text-right">
                    <p class="text-[9px] font-black text-blue-400 uppercase tracking-widest mb-0.5">Jumlah Entri</p>
                    <p class="text-lg font-black text-blue-800">${data.length}</p>
                </div>
            </div>

            <div class="border border-slate-200 rounded-xl overflow-hidden">
                <div class="max-h-[400px] overflow-y-auto scrollbar-thin">
                    <table class="w-full text-sm">
                        <thead class="bg-slate-50 sticky top-0 border-b border-slate-200 z-10">
                            <tr>
                                <th class="px-4 py-3 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Tanggal</th>
                                <th class="px-4 py-3 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Produk / Keterangan</th>
                                <th class="px-4 py-3 text-right text-[10px] font-black text-slate-400 uppercase tracking-widest">Susut</th>
                                <th class="px-4 py-3 text-center text-[10px] font-black text-slate-400 uppercase tracking-widest">%</th>
                            </tr>
                        </thead>
                        <tbody class="divide-y divide-slate-50 bg-white">
                            ${rows}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    `;

    if (!window._isModalOpen) {
        showModal(`Detail Penyusutan: ${label}`, body, `<button onclick="closeModal()" class="w-full sm:w-auto bg-slate-900 text-white px-8 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-slate-200 hover:bg-black transition-all">Tutup</button>`, 'lg');
    } else {
        const modalBody = document.querySelector('#modal-container .overflow-y-auto.flex-1');
        if (modalBody) modalBody.innerHTML = body;
    }
};

window.applyModalShrinkFilter = (month, year) => {
    const start = document.getElementById('modal_shrink_from')?.value;
    const end = document.getElementById('modal_shrink_to')?.value;
    window.showShrinkageMonthDetail(month, year, start, end);
};

window.exportShrinkageReport = () => {
    const data = window._lastShrinkData || [];
    if (data.length === 0) { showToast('Tidak ada data untuk diekspor', 'info'); return; }
    
    const headers = ['Tanggal', 'Item', 'Keterangan', 'Qty (KG)', 'Persentase (%)', 'Sumber'];
    const csvRows = [headers.join(',')];
    
    data.forEach(e => {
        csvRows.push([
            invDate(e.date),
            `"${e.itemName}"`,
            `"${e.notes}"`,
            e.qty,
            e.pct.toFixed(2),
            e.source
        ].join(','));
    });
    
    const blob = new Blob([csvRows.join('\n')], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Laporan_Penyusutan_Produksi_${new Date().toISOString().slice(0,10)}.csv`;
    a.click();
};

window.openManualShrinkageModal = () => {

    const todayStr = new Date().toISOString().split('T')[0];
    const itemOpts = getActiveItemOpts();

    const body = `<div class="space-y-4">
        <div><label class="block text-sm font-medium text-gray-700 mb-1">Tanggal Judgment</label>
            <input type="date" id="mshrink_date" value="${todayStr}" class="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500"></div>
        <div class="relative mb-4">
            <label class="block text-xs font-medium text-gray-700 mb-1.5 ml-1">Item yang Bermasalah (NG/Susut) <span class="text-red-500">*</span></label>
            <div id="mshrink_trigger" onclick="openProductSearch('mshrink')" class="w-full bg-white border border-slate-200 rounded-xl px-4 py-2 text-xs text-slate-400 cursor-pointer hover:bg-slate-50 transition-all flex justify-between items-center group h-[38px]">
                <span id="mshrink_label" class="truncate pr-2">-- Pilih Barang Bermasalah --</span>
                <i class="fas fa-chevron-down text-[10px] text-slate-300 group-hover:text-slate-400 transition-colors"></i>
            </div>
            <input type="hidden" id="mshrink_item" onchange="invShowCurrentStock('mshrink_item','mshrink_stock_info')">
            <div id="mshrink_results_container" class="absolute z-[100] top-full left-0 right-0 mt-2 bg-white rounded-2xl shadow-[0_15px_40px_rgba(0,0,0,0.12)] hidden border border-slate-100 overflow-hidden min-w-[320px]">
                <div class="p-3 border-b border-slate-50">
                    <div class="relative">
                        <i class="fas fa-search absolute left-3 top-1/2 -translate-y-1/2 text-slate-300 text-xs"></i>
                        <input type="text" id="mshrink_search_input" placeholder="Ketik kode atau nama..." class="w-full bg-slate-50 border border-blue-100 rounded-lg pl-9 pr-3 py-2 text-xs focus:border-blue-400 outline-none transition-all font-medium">
                    </div>
                </div>
                <div id="mshrink_results" class="max-h-[300px] overflow-y-auto custom-scrollbar"></div>
            </div>
        </div>
        <div id="mshrink_stock_info" class="hidden p-3 bg-blue-50 border border-blue-100 rounded-xl text-xs text-blue-700 font-bold mb-4"></div>
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

// ———— 8. MONTHLY STOCK REPORT ————————————————————————————
window.currentMonthlyReportCategory = 'RAW_MATERIAL';

window.renderMonthlyStockReport = () => {
    if (!window.currentMonthlyReportCategory || ['WIP_OVEN_BASAH', 'WIP_OVEN_KERING'].includes(window.currentMonthlyReportCategory)) {
        window.currentMonthlyReportCategory = 'RAW_MATERIAL';
    }

    renderBreadcrumb(['Stock', 'Mutasi Stok Bulanan']);
    document.getElementById('pageTitle').innerText = 'Laporan Stok Bulanan';
    const mc = document.getElementById('main-content');

    const now = new Date();
    const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

    mc.innerHTML = `
    <div class="space-y-4 animate-in fade-in duration-500">
        <!-- Compact Filter Bar -->
        <div class="bg-white rounded-xl shadow-sm border border-slate-100 p-5">
            <div class="flex flex-wrap items-center gap-4">
                <!-- Search Input -->
                <div class="flex-1 min-w-[250px] relative group">
                    <i class="fas fa-search absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-indigo-500 transition-colors"></i>
                    <input type="text" id="msr_search" onkeyup="runMonthlyStockReport()" placeholder="Search Code or Item Name..." 
                        class="w-full pl-12 pr-4 py-2.5 bg-slate-50 border border-transparent rounded-xl text-sm font-semibold text-slate-700 placeholder:text-slate-300 focus:bg-white focus:border-indigo-300 focus:ring-4 focus:ring-indigo-500/5 outline-none transition-all">
                </div>

                <!-- Month Picker -->
                <div class="relative min-w-[150px]">
                    <i class="fas fa-calendar-alt absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 pointer-events-none"></i>
                    <input type="month" id="msr_month" value="${currentMonth}" onchange="runMonthlyStockReport()"
                        class="w-full pl-11 pr-4 py-2.5 bg-slate-50 border border-transparent rounded-xl text-sm font-bold text-slate-700 focus:bg-white focus:border-indigo-300 focus:ring-4 focus:ring-indigo-500/5 transition-all outline-none cursor-pointer">
                </div>

                <!-- Category Filter -->
                <div class="relative min-w-[180px]">
                    <i class="fas fa-filter absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 pointer-events-none"></i>
                    <select id="msr_category" onchange="runMonthlyStockReport()" 
                        class="w-full pl-11 pr-10 py-2.5 bg-slate-50 border border-transparent rounded-xl text-sm font-bold text-slate-700 appearance-none cursor-pointer focus:bg-white focus:border-indigo-300 focus:ring-4 focus:ring-indigo-500/5 transition-all outline-none">
                        <option value="RAW_MATERIAL" ${window.currentMonthlyReportCategory === 'RAW_MATERIAL' ? 'selected' : ''}>Bahan Baku</option>
                        <option value="FINISHED_GOODS" ${window.currentMonthlyReportCategory === 'FINISHED_GOODS' ? 'selected' : ''}>Gudang Jadi</option>
                    </select>
                    <i class="fas fa-chevron-down absolute right-4 top-1/2 -translate-y-1/2 text-slate-300 pointer-events-none text-[10px]"></i>
                </div>

                <!-- Actions -->
                <div class="flex gap-3 ml-auto">
                    <button onclick="openInventoryConversionModal()" id="btn_msr_conversion" class="hidden bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-xl transition-all text-sm font-bold shadow-lg shadow-indigo-500/20 flex items-center gap-2">
                        <i class="fas fa-random"></i> Konversi
                    </button>
                    <button onclick="runMonthlyStockReport()" class="bg-white border border-slate-200 text-slate-600 px-5 py-2.5 rounded-xl hover:bg-slate-50 transition-all text-sm font-bold" title="Refresh Data">
                        <i class="fas fa-sync-alt"></i>
                    </button>
                </div>
            </div>
        </div>
        
        <!-- Report Table Card -->
        <div class="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
            <div id="monthly_stock_report_output" class="p-0"></div>
        </div>
    </div>`;

    setTimeout(() => runMonthlyStockReport(), 50);
};

window.runMonthlyStockReport = () => {
    const monthVal = document.getElementById('msr_month')?.value;
    const output = document.getElementById('monthly_stock_report_output');
    if (!monthVal || !output) return;

    const [year, month] = monthVal.split('-').map(Number);
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0, 23, 59, 59);

    const items = db.read('inventoryItems').filter(it => it.status !== 'INACTIVE');
    const allTxs = db.read('stockTransactions');

    const catSelect = document.getElementById('msr_category');
    if (catSelect) window.currentMonthlyReportCategory = catSelect.value;
    const cat = window.currentMonthlyReportCategory || 'RAW_MATERIAL';
    
    const btnConv = document.getElementById('btn_msr_conversion');
    if (btnConv) {
        if (cat === 'FINISHED_GOODS') btnConv.classList.remove('hidden');
        else btnConv.classList.add('hidden');
    }

    let filteredItems = items.filter(it => it.category === cat);
    if (cat === 'WIP_OVEN_BASAH') {
        filteredItems = items.filter(it => it.category === 'OVEN_BASAH_STOCK' || (it.category === 'WIP' && it.itemName.toLowerCase().includes('oven basah')));
    } else if (cat === 'WIP_OVEN_KERING') {
        filteredItems = items.filter(it => it.category === 'OVEN_KERING_STOCK' || (it.category === 'WIP' && it.itemName.toLowerCase().includes('oven kering')));
    }

    const searchQuery = document.getElementById('msr_search')?.value.toLowerCase() || '';
    if (searchQuery) {
        filteredItems = filteredItems.filter(it => it.itemName.toLowerCase().includes(searchQuery) || it.itemCode.toLowerCase().includes(searchQuery));
    }

    const reportData = filteredItems.map(it => {
        const itemTxs = allTxs.filter(t => t.itemId === it.id);
        const preTxs = itemTxs.filter(t => new Date(t.date) < startDate);
        const inPeriodTxs = itemTxs.filter(t => new Date(t.date) >= startDate && new Date(t.date) <= endDate);

        const initial = preTxs.reduce((sum, t) => sum + (t.type === 'IN' ? t.qty : -t.qty), 0);
        const totalIn = inPeriodTxs.filter(t => t.type === 'IN').reduce((sum, t) => sum + t.qty, 0);
        const totalOut = inPeriodTxs.filter(t => t.type === 'OUT').reduce((sum, t) => sum + t.qty, 0);
        const final = initial + totalIn - totalOut;

        return { ...it, openingStock: initial, totalIn, totalOut, closingStock: final };
    }).filter(it => it.openingStock !== 0 || it.totalIn !== 0 || it.totalOut !== 0);

    let html = `
    <div class="overflow-x-auto">
        <table class="w-full text-left" id="inventory_table">
            <thead class="bg-slate-50/50 border-b border-slate-100">
                <tr>
                    <th class="py-4 px-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Item Information</th>
                    <th class="py-4 px-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Unit</th>
                    <th class="py-4 px-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Awal</th>
                    <th class="py-4 px-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right text-green-600">Masuk (+)</th>
                    <th class="py-4 px-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right text-red-600">Keluar (-)</th>
                    <th class="py-4 px-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right text-indigo-600">Akhir</th>
                    <th class="py-4 px-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Actions</th>
                </tr>
            </thead>
            <tbody class="divide-y divide-slate-50">`;

    if (reportData.length === 0) {
        html += `<tr><td colspan="7">
            <div class="py-20 flex flex-col items-center justify-center text-center">
                <div class="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center text-slate-300 mb-4 text-2xl">
                    <i class="fas fa-boxes"></i>
                </div>
                <p class="text-sm font-medium text-slate-500">Tidak ada pergerakan stok di periode ini.</p>
            </div>
        </td></tr>`;
    } else {
        reportData.forEach(s => {
            html += `
                <tr class="hover:bg-slate-50/80 transition-colors group">
                    <td class="py-4 px-5">
                        <div class="flex items-center gap-3">
                            <div class="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center text-[10px] font-black shrink-0 border border-black/5">
                                <i class="fas fa-cube"></i>
                            </div>
                            <div>
                                <div class="text-sm font-bold text-slate-800 flex items-center gap-2">
                                    ${s.itemName}
                                </div>
                                <div class="text-[11px] text-slate-400 font-mono font-medium">${s.itemCode}</div>
                            </div>
                        </div>
                    </td>
                    <td class="py-4 px-5 text-[11px] font-black text-slate-400 uppercase tracking-widest">${s.unit}</td>
                    <td class="py-4 px-5 text-sm text-right font-black text-slate-400">${invFmt(s.openingStock)}</td>
                    <td class="py-4 px-5 text-sm text-right font-black text-green-600/80">+${invFmt(s.totalIn)}</td>
                    <td class="py-4 px-5 text-sm text-right font-black text-red-600/80">-${invFmt(s.totalOut)}</td>
                    <td class="py-4 px-5 text-sm text-right font-black text-indigo-700">${invFmt(s.closingStock)}</td>
                    <td class="py-4 px-5 text-right">
                        <button onclick="viewProductStockCard('${s.id}', '${monthVal}')" class="flex items-center gap-2 px-3 py-1.5 rounded-[10px] border border-slate-200 text-slate-700 bg-[#f8fafc] hover:bg-slate-100 transition-colors text-[12px] font-bold shadow-sm whitespace-nowrap ml-auto">
                            <i class="fas fa-list-ul text-[10px] text-slate-400"></i>
                            Kartu Stok
                        </button>
                    </td>
                </tr>`;
        });
    }

    html += `</tbody></table></div>
        <div class="p-4 bg-slate-50/50 border-t border-slate-100 flex justify-between items-center">
            <span class="text-[10px] font-black text-slate-400 uppercase tracking-widest">Showing ${reportData.length} Items</span>
        </div>`;
    output.innerHTML = html;
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
            <input type="text" value="${item.itemName} (Stok: ${formatNumber(db.getInventoryStock(item.id))} ${item.unit})" class="w-full border border-gray-200 rounded-lg px-3 py-2 bg-gray-50 text-gray-600 text-sm" readonly>
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

    showModal('Repackaging Finished Goods', body, footer, 'full');
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
window.viewProductStockCard = (productId, startDateStr = null, endDateStr = null) => {
    const item = db.findById('inventoryItems', productId);
    if (!item) return;

    // Handle initial call (legacy format with monthStr)
    let startDate, endDate;
    if (startDateStr && startDateStr.includes('-') && startDateStr.length === 7) { 
        // monthStr format (YYYY-MM)
        const [year, month] = startDateStr.split('-').map(Number);
        startDate = new Date(year, month - 1, 1);
        endDate = new Date(year, month, 0, 23, 59, 59);
        startDateStr = startDate.toISOString().split('T')[0];
        endDateStr = endDate.toISOString().split('T')[0];
    } else {
        startDate = startDateStr ? new Date(startDateStr) : new Date(new Date().getFullYear(), new Date().getMonth(), 1);
        endDate = endDateStr ? new Date(endDateStr) : new Date();
        startDateStr = startDate.toISOString().split('T')[0];
        endDateStr = endDate.toISOString().split('T')[0];
    }

    const allTxs = db.read('stockTransactions');
    const openingTxs = allTxs.filter(t => t.itemId === productId && new Date(t.date) < startDate);
    const openingStock = openingTxs.reduce((sum, t) => sum + (t.type === 'IN' ? t.qty : -t.qty), 0);

    const monthTxs = allTxs.filter(t => t.itemId === productId && new Date(t.date) >= startDate && new Date(t.date) <= new Date(endDate.getTime() + 86400000))
        .sort((a, b) => new Date(a.date) - new Date(b.date));

    let balance = openingStock;
    let totalNormalIn = 0;
    let totalManualIn = 0;
    let totalNormalOut = 0;
    let totalShrinkOut = 0;
    const itemRows = monthTxs.map(t => {
        const qtyIn = t.type === 'IN' ? t.qty : 0;
        const qtyOut = t.type === 'OUT' ? t.qty : 0;
        
        const refUpper = (t.reference || '').toUpperCase();
        const isShrink = ['SHRINKAGE', 'ADJUST_OUT', 'WASTE', 'JUDGMENT'].includes(refUpper) || (t.notes || '').toLowerCase().includes('susut');
        const isManualIn = ['MANUAL', 'ADJUST_IN'].includes(refUpper);

        if (qtyIn > 0) {
            if (isManualIn) totalManualIn += qtyIn;
            else totalNormalIn += qtyIn;
        }
        if (qtyOut > 0) {
            if (isShrink) totalShrinkOut += qtyOut;
            else totalNormalOut += qtyOut;
        }
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
        <div class="bg-gray-50 p-4 rounded-xl border border-gray-100 flex flex-wrap gap-6 text-sm">
            <div class="flex-1 min-w-[200px]"><span class="text-gray-400 block text-[10px] uppercase font-bold">Produk</span> <strong class="text-blue-700">${item.itemName}</strong></div>
            <div class="flex-1 min-w-[200px]"><span class="text-gray-400 block text-[10px] uppercase font-bold">Kode Barang</span> <strong>${item.itemCode || '-'}</strong></div>
            
            <div class="w-full pt-4 mt-2 border-t border-gray-200 flex items-end gap-4 bg-white p-4 rounded-lg shadow-sm">
                <div class="flex-1 max-w-[200px]">
                    <label class="text-[11px] uppercase font-black text-slate-500 block mb-1.5 ml-1">Dari Tanggal</label>
                    <input type="date" id="stock_card_start" value="${startDateStr}" class="w-full border-2 border-slate-200 rounded-lg px-3 py-2 text-sm font-bold text-slate-700 focus:border-blue-500 outline-none transition-all">
                </div>
                <div class="flex-1 max-w-[200px]">
                    <label class="text-[11px] uppercase font-black text-slate-500 block mb-1.5 ml-1">Sampai Tanggal</label>
                    <input type="date" id="stock_card_end" value="${endDateStr}" class="w-full border-2 border-slate-200 rounded-lg px-3 py-2 text-sm font-bold text-slate-700 focus:border-blue-500 outline-none transition-all">
                </div>
                <button onclick="viewProductStockCard('${productId}', document.getElementById('stock_card_start').value, document.getElementById('stock_card_end').value)" class="bg-blue-600 text-white px-6 py-2.5 rounded-lg text-xs font-black uppercase tracking-widest hover:bg-blue-700 active:scale-95 transition-all shadow-md">
                    <i class="fas fa-filter mr-2"></i>Terapkan Filter
                </button>
            </div>

            <div class="w-full pt-1 flex justify-between items-center text-xs">
                <span class="text-gray-400 uppercase font-bold text-[10px]">Ringkasan</span>
                <span class="text-orange-600 font-bold">Stok Awal: ${invFmt(openingStock)} ${item.unit}</span>
            </div>
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
                    <tr class="border-t-2 border-gray-100 bg-gray-50/50 font-black text-xs">
                        <td colspan="3" class="py-2 px-2 text-gray-500 uppercase tracking-wider">TOTAL MASUK NORMAL (+)</td>
                        <td class="py-2 px-2 text-right text-green-700">+${invFmt(totalNormalIn)}</td>
                        <td colspan="3"></td>
                    </tr>
                    <tr class="bg-gray-50/50 font-black text-xs">
                        <td colspan="3" class="py-2 px-2 text-gray-400 uppercase tracking-wider">TOTAL MASUK (MANUAL/ADJ) (+)</td>
                        <td class="py-2 px-2 text-right text-blue-600">+${invFmt(totalManualIn)}</td>
                        <td colspan="3"></td>
                    </tr>
                    <tr class="bg-gray-50/50 font-black text-xs">
                        <td colspan="3" class="py-2 px-2 text-gray-400 uppercase tracking-wider">TOTAL KELUAR NORMAL (-)</td>
                        <td></td>
                        <td class="py-2 px-2 text-right text-slate-800">-${invFmt(totalNormalOut)}</td>
                        <td colspan="2"></td>
                    </tr>
                    <tr class="bg-red-50/30 font-black text-xs">
                        <td colspan="3" class="py-2 px-2 text-red-400 uppercase tracking-wider">TOTAL SUSUT / NG / JUDGMENT (-)</td>
                        <td></td>
                        <td class="py-2 px-2 text-right text-red-600">-${invFmt(totalShrinkOut)}</td>
                        <td colspan="2"></td>
                    </tr>
                    <tr class="bg-blue-50/50 font-black text-xs border-t-2 border-blue-100">
                        <td colspan="5" class="py-3 px-2 text-blue-800 uppercase tracking-widest text-right">SALDO AKHIR PERIODE</td>
                        <td class="py-3 px-2 text-right text-blue-900 text-sm font-black">${invFmt(balance)}</td>
                        <td></td>
                    </tr>
                </tbody>
            </table>
        </div>

        ${item.category === 'FINISHED_GOODS' ? (() => {
            const pb = (db.read('packBreakdowns') || []).find(b => b.itemId === productId) || {};
            const q5   = pb.qty5    || 0;
            const q800 = pb.qty800 || 0;
            // q25 is now the remainder of the total weight
            const weightOthers = q5 * 5 + q800 * 0.8;
            const q25 = (balance - weightOthers) / 25;
            const totalKgPack = balance; // Always balanced now
            const balanced = true;
            return '<div class="mt-4 border border-gray-100 rounded-xl overflow-hidden">' +
                '<div class="px-4 py-2.5 bg-gray-50 border-b border-gray-100 flex justify-between items-center">' +
                '<p class="text-[10px] font-black text-gray-400 uppercase tracking-widest">Breakdown Kemasan</p>' +
                '<span class="text-[10px] font-bold ' + (balanced ? 'text-green-600' : 'text-orange-500') + '">' +
                'âœ“ Balance</span>' +
                '</div>' +
                '<div class="p-4">' +
                '<table class="w-full text-sm mb-4">' +
                '<thead><tr class="text-[10px] text-gray-400 uppercase font-bold border-b border-gray-100">' +
                '<th class="pb-2 text-left">Ukuran</th>' +
                '<th class="pb-2 text-right pr-3">Jumlah (Sak/Pack)</th>' +
                '<th class="pb-2 text-right">Total Kg</th></tr></thead>' +
                '<tbody>' +
                '<tr class="border-b border-gray-50 bg-gray-50/30">' +
                '<td class="py-2.5 font-medium text-gray-700 italic">Sak 25 Kg (Sisa)</td>' +
                '<td class="py-2.5 pr-3 text-right"><input type="number" id="pb_25" value="' + q25.toFixed(2) + '" readonly class="w-28 border-0 bg-transparent px-2 py-1 text-right text-sm text-blue-600 font-bold outline-none"></td>' +
                '<td class="py-2.5 text-right font-semibold text-blue-600" id="pb_25_kg">' + invFmt(q25 * 25) + ' Kg</td>' +
                '</tr>' +
                '<tr class="border-b border-gray-50">' +
                '<td class="py-2.5 font-medium text-gray-700">Sak 5 Kg</td>' +
                '<td class="py-2.5 pr-3 text-right"><input type="number" id="pb_5" value="' + q5 + '" readonly class="w-20 border-0 bg-transparent px-2 py-1 text-right text-sm text-gray-700 font-bold outline-none cursor-default"></td>' +
                '<td class="py-2.5 text-right font-semibold text-gray-600" id="pb_5_kg">' + invFmt(q5 * 5) + ' Kg</td>' +
                '</tr>' +
                '<tr class="border-b border-gray-50">' +
                '<td class="py-2.5 font-medium text-gray-700">Pack 800 gram</td>' +
                '<td class="py-2.5 pr-3 text-right"><input type="number" id="pb_800" value="' + q800 + '" readonly class="w-20 border-0 bg-transparent px-2 py-1 text-right text-sm text-gray-700 font-bold outline-none cursor-default"></td>' +
                '<td class="py-2.5 text-right font-semibold text-gray-600" id="pb_800_kg">' + invFmt(q800 * 0.8) + ' Kg</td>' +
                '</tr>' +
                '</tbody>' +
                '<tfoot><tr class="border-t-2 border-gray-100 font-bold text-sm">' +
                '<td class="pt-2.5 text-gray-400 text-xs uppercase tracking-widest">Total Kemasan</td>' +
                '<td class="pt-2.5 text-right" colspan="2" id="pb_total_kg"><span class="text-blue-700 font-black text-base">' + invFmt(totalKgPack) + ' Kg</span></td>' +
                '</tr></tfoot>' +
                '</table>' +
                '</div></div>';
        })() : ''}
    </div>`;

    const footer = `
        <button onclick="printProductStockCard('${productId}', '${startDateStr}', '${endDateStr}')" class="bg-gray-800 text-white px-4 py-2 rounded-lg text-xs font-bold hover:bg-black transition-all flex items-center gap-2">
            <i class="fas fa-print"></i> Cetak Kartu Stok
        </button>
        <button onclick="closeModal()" class="px-4 py-2 text-xs font-bold text-gray-500 hover:bg-gray-100 rounded-lg">Tutup</button>
    `;

    showModal(`Kartu Stok - ${item.itemName}`, body, footer, 'full');
};

window.recalcPackBreakdown = (saldoAkhir) => {
    const q5   = parseFloat(document.getElementById('pb_5')?.value)   || 0;
    const q800 = parseFloat(document.getElementById('pb_800')?.value) || 0;
    
    // Auto calculate q25 as remainder
    const weightOthers = q5 * 5 + q800 * 0.8;
    const q25 = (saldoAkhir - weightOthers) / 25;

    const el25_inp = document.getElementById('pb_25');
    const el25_kg  = document.getElementById('pb_25_kg');
    const el5_kg   = document.getElementById('pb_5_kg');
    const el800_kg = document.getElementById('pb_800_kg');
    const elTot    = document.getElementById('pb_total_kg');

    if (el25_inp) el25_inp.value = q25.toFixed(2);
    if (el25_kg)  el25_kg.textContent = invFmt(q25 * 25) + ' Kg';
    if (el5_kg)   el5_kg.textContent = invFmt(q5 * 5) + ' Kg';
    if (el800_kg) el800_kg.textContent = invFmt(q800 * 0.8) + ' Kg';
    if (elTot)    elTot.innerHTML = '<span class="text-green-700">' + invFmt(saldoAkhir) + ' Kg</span>';
};

window.savePackBreakdown = (productId) => {
    const q5   = parseFloat(document.getElementById('pb_5')?.value)   || 0;
    const q800 = parseFloat(document.getElementById('pb_800')?.value) || 0;
    // We only need to store the "assigned" packs. 25Kg is derived.
    const existing = db.read('packBreakdowns').find(b => b.itemId === productId);
    if (existing) {
        db.update('packBreakdowns', existing.id, { qty5: q5, qty800: q800 });
    } else {
        db.insert('packBreakdowns', { itemId: productId, qty25: 0, qty5: q5, qty800: q800 });
    }
    showToast('Breakdown kemasan disimpan');
};


window.printProductStockCard = (productId, startDateStr, endDateStr) => {
    const item = db.findById('inventoryItems', productId);
    if (!item) return;

    const startDate = new Date(startDateStr + 'T00:00:00');
    const endDate = new Date(endDateStr + 'T23:59:59');

    const allTxs = db.read('stockTransactions');
    const openingTxs = allTxs.filter(t => t.itemId === productId && new Date(t.date) < startDate);
    const openingStock = openingTxs.reduce((sum, t) => sum + (t.type === 'IN' ? t.qty : -t.qty), 0);

    const monthTxs = allTxs.filter(t => t.itemId === productId && new Date(t.date) >= startDate && new Date(t.date) <= endDate)
        .sort((a, b) => new Date(a.date) - new Date(b.date));

    let balance = openingStock;
    let totalNormalIn = 0;
    let totalManualIn = 0;
    let totalNormalOut = 0;
    let totalShrinkOut = 0;

    const rows = monthTxs.map(t => {
        const qtyIn = t.type === 'IN' ? t.qty : 0;
        const qtyOut = t.type === 'OUT' ? t.qty : 0;
        
        const refUpper = (t.reference || '').toUpperCase();
        const isShrink = ['SHRINKAGE', 'ADJUST_OUT', 'WASTE', 'JUDGMENT'].includes(refUpper) || (t.notes || '').toLowerCase().includes('susut');
        const isManualIn = ['MANUAL', 'ADJUST_IN'].includes(refUpper);

        if (qtyIn > 0) {
            if (isManualIn) totalManualIn += qtyIn;
            else totalNormalIn += qtyIn;
        }
        if (qtyOut > 0) {
            if (isShrink) totalShrinkOut += qtyOut;
            else totalNormalOut += qtyOut;
        }
        balance += qtyIn - qtyOut;

        return `
            <tr>
                <td class="t-center">${invDate(t.date)}</td>
                <td>${t.txNo}</td>
                <td class="t-right">${qtyIn > 0 ? invFmt(qtyIn) : '-'}</td>
                <td class="t-right">${qtyOut > 0 ? invFmt(qtyOut) : '-'}</td>
                <td class="t-right f-bold">${invFmt(balance)}</td>
                <td>${t.reference} - ${t.notes || ''}</td>
            </tr>`;
    }).join('');

    const printHtml = `
    <html>
    <head>
        <title>Kartu Stok - ${item.itemName}</title>
        <style>
            body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; font-size: 11px; margin: 30px; color: #334155; }
            .header { text-align: center; margin-bottom: 20px; border-bottom: 2px solid #e2e8f0; padding-bottom: 15px; }
            .meta { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 20px; }
            .meta-box { background: #f8fafc; padding: 12px; border: 1px solid #e2e8f0; border-radius: 8px; }
            table { width: 100%; border-collapse: collapse; margin-top: 10px; }
            th { background: #f1f5f9; border: 1px solid #e2e8f0; padding: 8px; text-transform: uppercase; font-size: 9px; letter-spacing: 0.05em; }
            td { border: 1px solid #e2e8f0; padding: 8px; }
            .t-right { text-align: right; }
            .t-center { text-align: center; }
            .f-bold { font-weight: bold; }
            .total-row { background: #f8fafc; font-weight: bold; font-size: 10px; }
            .bg-in { background: #f0fdf4 !important; color: #166534; }
            .bg-in-manual { background: #eff6ff !important; color: #1e40af; }
            .bg-out-normal { background: #f8fafc !important; color: #334155; }
            .bg-out-shrink { background: #fef2f2 !important; color: #991b1b; }
            .bg-final { background: #eff6ff !important; color: #1e40af; font-size: 12px; }
            @media print {
                .bg-in { background-color: #f0fdf4 !important; }
                .bg-in-manual { background-color: #eff6ff !important; }
                .bg-out-shrink { background-color: #fef2f2 !important; }
            }
        </style>
    </head>
    <body onload="window.print()">
        <div class="header">
            <h1 style="margin:0;font-size:18px;color:#1e293b;">KARTU STOK PERSEDIAAN</h1>
            <p style="margin:5px 0;font-weight:bold;color:#64748b;">${CONFIG.companyName}</p>
        </div>
        
        <div class="meta">
            <div class="meta-box">
                <strong>Nama Barang:</strong> ${item.itemName}<br>
                <strong>Kode Barang:</strong> ${item.itemCode || '-'}<br>
                <strong>Kategori:</strong> ${item.category}
            </div>
            <div class="meta-box">
                <strong>Periode:</strong> ${startDateStr} s/d ${endDateStr}<br>
                <strong>Satuan:</strong> ${item.unit}
            </div>
        </div>

        <table>
            <thead>
                <tr>
                    <th width="12%">Tanggal</th>
                    <th width="15%">No. Bukti</th>
                    <th width="12%" class="t-right">Masuk</th>
                    <th width="12%" class="t-right">Keluar</th>
                    <th width="12%" class="t-right">Saldo</th>
                    <th>Ref / Keterangan</th>
                </tr>
            </thead>
            <tbody>
                <tr style="background:#fffbeb; font-style: italic;">
                    <td colspan="4" class="f-bold">SALDO AWAL PERIODE</td>
                    <td class="t-right f-bold">${invFmt(openingStock)}</td>
                    <td></td>
                </tr>
                ${rows || '<tr><td colspan="6" class="t-center" style="padding:40px;color:#94a3b8;">Tidak ada transaksi</td></tr>'}
                
                <tr class="total-row bg-in">
                    <td colspan="2">TOTAL MASUK NORMAL (+)</td>
                    <td class="t-right">+${invFmt(totalNormalIn)}</td>
                    <td colspan="3"></td>
                </tr>
                <tr class="total-row bg-in-manual">
                    <td colspan="2">TOTAL MASUK (MANUAL/ADJ) (+)</td>
                    <td class="t-right">+${invFmt(totalManualIn)}</td>
                    <td colspan="3"></td>
                </tr>
                <tr class="total-row bg-out-normal">
                    <td colspan="3">TOTAL KELUAR NORMAL (-)</td>
                    <td class="t-right">-${invFmt(totalNormalOut)}</td>
                    <td colspan="2"></td>
                </tr>
                <tr class="total-row bg-out-shrink">
                    <td colspan="3">TOTAL SUSUT / NG / JUDGMENT (-)</td>
                    <td class="t-right">-${invFmt(totalShrinkOut)}</td>
                    <td colspan="2"></td>
                </tr>
                <tr class="total-row bg-final" style="border-top: 2px solid #3b82f6;">
                    <td colspan="4" class="t-right">SALDO AKHIR PERIODE</td>
                    <td class="t-right f-bold">${invFmt(balance)}</td>
                    <td></td>
                </tr>
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

// â”€â”€â”€ 5. STOK WIP & HISTORY (PRODUCTION SPECIFIC) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
window.renderProductionWIPStock = function() {
    renderBreadcrumb(['Produksi', 'Reports', 'Mutasi Stock Bulanan']);
    document.getElementById('pageTitle').innerText = 'Mutasi Stock Bulanan';
    const mc = document.getElementById('main-content');
    
    if (!window.currentWIPMutationCategory) window.currentWIPMutationCategory = 'OVEN_BASAH';
    const now = new Date();
    const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

    mc.innerHTML = `
    <div class="space-y-4 animate-in fade-in duration-500">
        <!-- Compact Filter Bar -->
        <div class="bg-white rounded-xl shadow-sm border border-slate-100 p-5">
            <div class="flex flex-wrap items-center gap-4">
                <!-- Search Input -->
                <div class="flex-1 min-w-[250px] relative group">
                    <i class="fas fa-search absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-indigo-500 transition-colors"></i>
                    <input type="text" id="wip_msr_search" onkeyup="runWIPMutationReport()" placeholder="Cari Nama atau Kode WIP..." 
                        class="w-full pl-12 pr-4 py-2.5 bg-slate-50 border border-transparent rounded-xl text-sm font-semibold text-slate-700 placeholder:text-slate-300 focus:bg-white focus:border-indigo-300 focus:ring-4 focus:ring-indigo-500/5 outline-none transition-all">
                </div>

                <!-- Month Picker -->
                <div class="relative min-w-[150px]">
                    <i class="fas fa-calendar-alt absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 pointer-events-none"></i>
                    <input type="month" id="wip_msr_month" value="${currentMonth}" onchange="runWIPMutationReport()"
                        class="w-full pl-11 pr-4 py-2.5 bg-slate-50 border border-transparent rounded-xl text-sm font-bold text-slate-700 focus:bg-white focus:border-indigo-300 focus:ring-4 focus:ring-indigo-500/5 transition-all outline-none cursor-pointer">
                </div>

                <!-- Location/Stage Filter -->
                <div class="relative min-w-[180px]">
                    <i class="fas fa-industry absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 pointer-events-none"></i>
                    <select id="wip_msr_location" onchange="runWIPMutationReport()" 
                        class="w-full pl-11 pr-10 py-2.5 bg-slate-50 border border-transparent rounded-xl text-sm font-bold text-slate-700 appearance-none cursor-pointer focus:bg-white focus:border-indigo-300 focus:ring-4 focus:ring-indigo-500/5 transition-all outline-none">
                        <option value="OVEN_BASAH" ${window.currentWIPMutationCategory === 'OVEN_BASAH' ? 'selected' : ''}>Oven Basah</option>
                        <option value="OVEN_KERING" ${window.currentWIPMutationCategory === 'OVEN_KERING' ? 'selected' : ''}>Oven Kering</option>
                    </select>
                    <i class="fas fa-chevron-down absolute right-4 top-1/2 -translate-y-1/2 text-slate-300 pointer-events-none text-[10px]"></i>
                </div>

                <!-- Actions -->
                <div class="flex gap-3 ml-auto">
                    <button onclick="runWIPMutationReport()" class="bg-white border border-slate-200 text-slate-600 px-5 py-2.5 rounded-xl hover:bg-slate-50 transition-all text-sm font-bold" title="Refresh Data">
                        <i class="fas fa-sync-alt"></i>
                    </button>
                    <button onclick="window.printWIPReport()" class="bg-indigo-600 text-white px-5 py-2.5 rounded-xl hover:bg-indigo-700 transition-all text-sm font-bold shadow-lg shadow-indigo-500/20 flex items-center gap-2">
                        <i class="fas fa-print"></i> Cetak Lap.
                    </button>
                </div>
            </div>
        </div>
        
        <!-- Report Table Card -->
        <div class="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
            <div id="wip_mutation_report_output" class="p-0">
                <div class="py-20 text-center text-slate-300 italic"><i class="fas fa-spinner fa-spin mr-2"></i>Memuat data mutasi...</div>
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
        const locSelect = document.getElementById('wip_msr_location');
        const searchInput = document.getElementById('wip_msr_search');
        
        if (!monthVal || !output) return;

        if (locSelect) window.currentWIPMutationCategory = locSelect.value;
        const loc = window.currentWIPMutationCategory || 'OVEN_BASAH';
        const searchQuery = searchInput?.value.toLowerCase() || '';

        const [year, month] = monthVal.split('-').map(Number);
        const startDate = new Date(year, month - 1, 1);
        const endDate = new Date(year, month, 0, 23, 59, 59);

        const items = (db.read('inventoryItems') || []).filter(it => it.status !== 'INACTIVE');
        const allTxs = db.read('stockTransactions') || [];

        const reportData = items.filter(it => {
            // Filter by category
            if (loc === 'OVEN_BASAH') return it.category === 'OVEN_BASAH_STOCK';
            if (loc === 'OVEN_KERING') return it.category === 'OVEN_KERING_STOCK';
            return false;
        }).filter(it => {
            // Filter by search
            if (!searchQuery) return true;
            return it.itemName.toLowerCase().includes(searchQuery) || it.itemCode.toLowerCase().includes(searchQuery);
        }).map(it => {
            const itemTxs = allTxs.filter(t => t.itemId === it.id);
            
            const getStageQty = (txs, direction) => {
                return txs.reduce((sum, t) => {
                    const q = parseFloat(t.qty) || 0;
                    const type = (t.type || '').toUpperCase();
                    const isIn = ['IN', 'ADJUST_IN', 'PRODUCTION_IN', 'RETURN_IN'].includes(type);
                    const isOut = ['OUT', 'SHRINKAGE', 'ADJUST_OUT', 'PRODUCTION_OUT', 'SALES_OUT', 'WASTE'].includes(type);
                    
                    if (direction === 'IN' && isIn) return sum + q;
                    if (direction === 'OUT' && isOut) return sum + q;
                    if (direction === 'NET') {
                        if (isIn) return sum + q;
                        if (isOut) return sum - q;
                    }
                    return sum;
                }, 0);
            };

            const openingTxs = itemTxs.filter(t => new Date(t.date) < startDate);
            const openingStock = getStageQty(openingTxs, 'NET');
            
            const monthTxs = itemTxs.filter(t => new Date(t.date) >= startDate && new Date(t.date) <= endDate);
            const totalIn = getStageQty(monthTxs, 'IN');
            const totalOut = getStageQty(monthTxs, 'OUT');
            const closingStock = openingStock + totalIn - totalOut;

            return { ...it, openingStock, totalIn, totalOut, closingStock, loc };
        }).filter(it => it.openingStock !== 0 || it.totalIn !== 0 || it.totalOut !== 0);

        let html = `
        <div class="overflow-x-auto">
            <table class="w-full text-left">
                <thead class="bg-slate-50/50 border-b border-slate-100">
                    <tr>
                        <th class="py-4 px-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Item Information</th>
                        <th class="py-4 px-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Unit</th>
                        <th class="py-4 px-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Stok Awal</th>
                        <th class="py-4 px-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right text-green-600">Masuk (+)</th>
                        <th class="py-4 px-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right text-red-600">Keluar (-)</th>
                        <th class="py-4 px-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right text-indigo-600">Stok Akhir</th>
                        <th class="py-4 px-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Actions</th>
                    </tr>
                </thead>
                <tbody class="divide-y divide-slate-50">`;

        if (reportData.length === 0) {
            html += `
                <tr>
                    <td colspan="7">
                        <div class="py-20 flex flex-col items-center justify-center text-center">
                            <div class="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center text-slate-300 mb-4 text-2xl">
                                <i class="fas fa-boxes-stacked"></i>
                            </div>
                            <p class="text-sm font-medium text-slate-500">Tidak ada pergerakan stok WIP di periode ini.</p>
                        </div>
                    </td>
                </tr>`;
        } else {
            reportData.forEach(s => {
                html += `
                <tr class="hover:bg-slate-50/80 transition-colors group">
                    <td class="py-4 px-5">
                        <div class="flex items-center gap-3">
                            <div class="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center text-[10px] font-black shrink-0 border border-black/5">
                                <i class="fas fa-layer-group"></i>
                            </div>
                            <div>
                                <div class="text-sm font-bold text-slate-800 flex items-center gap-2">
                                    ${s.itemName}
                                </div>
                                <div class="text-[11px] text-slate-400 font-mono font-medium">${s.itemCode}</div>
                            </div>
                        </div>
                    </td>
                    <td class="py-4 px-5 text-[11px] font-black text-slate-400 uppercase tracking-widest">${s.unit}</td>
                    <td class="py-4 px-5 text-sm text-right font-black text-slate-400">${invFmt(s.openingStock)}</td>
                    <td class="py-4 px-5 text-sm text-right font-black text-green-600/80">+${invFmt(s.totalIn)}</td>
                    <td class="py-4 px-5 text-sm text-right font-black text-red-600/80">-${invFmt(s.totalOut)}</td>
                    <td class="py-4 px-5 text-sm text-right font-black text-indigo-700">${invFmt(s.closingStock)}</td>
                    <td class="py-4 px-5 text-right">
                        <button onclick="openWIPHistoryModal('${s.id}', '${loc}')" class="flex items-center gap-2 px-3 py-1.5 rounded-[10px] border border-slate-200 text-slate-700 bg-[#f8fafc] hover:bg-slate-100 transition-colors text-[12px] font-bold shadow-sm whitespace-nowrap ml-auto active:scale-95">
                            <i class="fas fa-file-invoice text-[10px] text-slate-400"></i>
                            Kartu Stok
                        </button>
                    </td>
                </tr>`;
            });
        }

        html += `
                </tbody>
            </table>
        </div>
        <div class="p-4 bg-slate-50/50 border-t border-slate-100 flex justify-between items-center">
            <span class="text-[10px] font-black text-slate-400 uppercase tracking-widest">Showing ${reportData.length} WIP Items</span>
        </div>`;
        
        output.innerHTML = html;
    } catch (e) {
        console.error(e);
        const output = document.getElementById('wip_mutation_report_output');
        if (output) output.innerHTML = `<div class="py-20 text-center text-red-500 font-bold text-sm">Terjadi kesalahan saat memuat data.</div>`;
    }
};

window.openWIPHistoryModal = (itemId, location, startDateStr = null, endDateStr = null) => {
    const item = db.findById('inventoryItems', itemId);
    if (!item) return;

    // Handle initial call (legacy format with monthStr)
    const startDate = startDateStr ? new Date(startDateStr) : new Date(new Date().getFullYear(), new Date().getMonth(), 1);
    const endDate = endDateStr ? new Date(endDateStr) : new Date();
    startDateStr = startDate.toISOString().split('T')[0];
    endDateStr = endDate.toISOString().split('T')[0];

    const allTxs = db.read('stockTransactions') || [];
    const _getTxLoc = (t) => {
        let l = t.location;
        if (l === 'WHS' || !l) {
            if (item.category === 'OVEN_BASAH_STOCK') l = 'OVEN_BASAH';
            else if (item.category === 'OVEN_KERING_STOCK') l = 'OVEN_KERING';
            else l = 'WHS';
        }
        return l;
    };
    
    const txs = allTxs.filter(t => t.itemId === itemId && _getTxLoc(t) === location && new Date(t.date) >= startDate && new Date(t.date) <= new Date(endDate.getTime() + 86400000))
                      .sort((a, b) => new Date(a.date) - new Date(b.date));

    let balance = 0; // WIP card might need opening stock logic too if we want same precision as inventory
    const openingTxs = allTxs.filter(t => t.itemId === itemId && _getTxLoc(t) === location && new Date(t.date) < startDate);
    const openingStock = openingTxs.reduce((sum, t) => {
        const type = (t.type || '').toUpperCase();
        const isIn = ['IN', 'ADJUST_IN', 'PRODUCTION_IN', 'RETURN_IN'].includes(type);
        const isOut = ['OUT', 'SHRINKAGE', 'ADJUST_OUT', 'PRODUCTION_OUT', 'SALES_OUT', 'WASTE'].includes(type);
        if (isIn) return sum + t.qty;
        if (isOut) return sum - t.qty;
        return sum;
    }, 0);

    let currentBalance = openingStock;
    let totalNormalIn = 0;
    let totalManualIn = 0;
    let totalNormalOut = 0;
    let totalShrinkOut = 0;

    const rows = txs.map(t => {
        const type = (t.type || '').toUpperCase();
        const isIn = ['IN', 'ADJUST_IN', 'PRODUCTION_IN', 'RETURN_IN'].includes(type);
        const isOut = ['OUT', 'SHRINKAGE', 'ADJUST_OUT', 'PRODUCTION_OUT', 'SALES_OUT', 'WASTE'].includes(type);
        const q = t.qty || 0;
        
        const refUpper = (t.reference || '').toUpperCase();
        const isShrink = ['SHRINKAGE', 'ADJUST_OUT', 'WASTE', 'JUDGMENT'].includes(refUpper) || (t.notes || '').toLowerCase().includes('susut');
        const isManualIn = ['MANUAL', 'ADJUST_IN'].includes(refUpper);

        if (isIn) { 
            if (isManualIn) totalManualIn += q;
            else totalNormalIn += q;
            currentBalance += q; 
        }
        if (isOut) { 
            if (isShrink) totalShrinkOut += q;
            else totalNormalOut += q;
            currentBalance -= q; 
        }

        return `
            <tr class="border-b border-gray-50 text-[11px]">
                <td class="py-2.5 px-2 text-gray-500">${new Date(t.date).toLocaleString('id-ID', {day:'2-digit', month:'2-digit', year:'numeric', hour:'2-digit', minute:'2-digit'})}</td>
                <td class="py-2.5 px-2 font-mono text-gray-400 text-[10px]">${t.type}</td>
                <td class="py-2.5 px-2 text-right text-green-600 font-bold">${isIn ? '+' + invFmt(q) : '-'}</td>
                <td class="py-2.5 px-2 text-right text-red-600 font-bold">${isOut ? '-' + invFmt(q) : '-'}</td>
                <td class="py-2.5 px-2 text-right font-black text-slate-800">${invFmt(currentBalance)}</td>
                <td class="py-2.5 px-2">
                    <span class="font-medium text-gray-700 text-xs">${t.reference || '-'}</span>
                    ${t.notes ? `<span class="text-gray-400 block text-[9px] italic">${t.notes}</span>` : ''}
                </td>
            </tr>`;
    }).join('');

    const body = `
        <div class="p-1">
            <div class="mb-4 bg-gray-50 p-3 rounded border border-gray-100 flex flex-wrap justify-between items-end gap-3">
                <div class="flex-1">
                    <h4 class="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-0.5">Item</h4>
                    <p class="text-sm font-bold text-gray-800">${item.itemName}</p>
                    <p class="text-[9px] text-blue-600 font-bold uppercase mt-1">Lokasi: ${location}</p>
                </div>
                <div class="flex gap-4 items-end bg-white p-3 rounded-lg border border-slate-100 shadow-sm">
                    <div>
                        <label class="text-[10px] uppercase font-black text-slate-500 block mb-1 ml-1">Dari</label>
                        <input type="date" id="wip_hist_start" value="${startDateStr}" class="border-2 border-slate-200 rounded-lg px-3 py-1.5 text-xs font-bold text-slate-700 focus:border-blue-500 outline-none">
                    </div>
                    <div>
                        <label class="text-[10px] uppercase font-black text-slate-500 block mb-1 ml-1">Ke</label>
                        <input type="date" id="wip_hist_end" value="${endDateStr}" class="border-2 border-slate-200 rounded-lg px-3 py-1.5 text-xs font-bold text-slate-700 focus:border-blue-500 outline-none">
                    </div>
                    <div>
                        <button onclick="openWIPHistoryModal('${itemId}', '${location}', document.getElementById('wip_hist_start').value, document.getElementById('wip_hist_end').value)" class="bg-blue-600 text-white px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest hover:bg-blue-700 transition-all active:scale-95 shadow-md">Terapkan Filter</button>
                    </div>
                </div>
            </div>
            <div class="max-h-[400px] overflow-y-auto border border-gray-200 rounded">
                <table class="w-full text-left">
                    <thead class="bg-gray-100 sticky top-0 shadow-sm">
                        <tr class="text-[10px] font-bold text-gray-400 uppercase tracking-widest border-b border-gray-200">
                            <th class="py-2 px-2">Waktu</th>
                            <th class="py-2 px-2 text-center">Tipe</th>
                            <th class="py-2 px-2 text-right">Masuk</th>
                            <th class="py-2 px-2 text-right">Keluar</th>
                            <th class="py-2 px-2 text-right">Saldo</th>
                            <th class="py-2 px-2">Keterangan</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr class="bg-orange-50/50 text-[10px] font-bold italic text-gray-500">
                            <td colspan="4" class="py-1 px-2 uppercase">SALDO AWAL</td>
                            <td class="py-1 px-2 text-right">${invFmt(openingStock)}</td>
                            <td></td>
                        </tr>
                        ${rows || `<tr><td colspan="6" class="py-10 text-center text-gray-400 italic text-xs">Belum ada riwayat mutasi</td></tr>`}
                    </tbody>
                    <tfoot class="bg-slate-50 border-t-2 border-slate-200">
                        <tr class="text-[11px] font-black uppercase text-slate-500">
                            <td colspan="2" class="py-2 px-2">TOTAL MASUK NORMAL (+)</td>
                            <td class="py-2 px-2 text-right text-green-600">+${invFmt(totalNormalIn)}</td>
                            <td colspan="3"></td>
                        </tr>
                        <tr class="text-[11px] font-black uppercase text-blue-600 bg-blue-50/20">
                            <td colspan="2" class="py-2 px-2">TOTAL MASUK (MANUAL/ADJ) (+)</td>
                            <td class="py-2 px-2 text-right text-blue-700">+${invFmt(totalManualIn)}</td>
                            <td colspan="3"></td>
                        </tr>
                        <tr class="text-[11px] font-black uppercase text-slate-500">
                            <td colspan="2" class="py-2 px-2">TOTAL KELUAR NORMAL (-)</td>
                            <td></td>
                            <td class="py-2 px-2 text-right text-slate-700">-${invFmt(totalNormalOut)}</td>
                            <td colspan="2"></td>
                        </tr>
                        <tr class="text-[11px] font-black uppercase text-red-600 bg-red-50/30">
                            <td colspan="2" class="py-2 px-2">TOTAL SUSUT / NG / MANUAL (-)</td>
                            <td></td>
                            <td class="py-2 px-2 text-right text-red-600">-${invFmt(totalShrinkOut)}</td>
                            <td colspan="2"></td>
                        </tr>
                        <tr class="text-[11px] font-black uppercase text-blue-800 bg-blue-50/50 border-t border-blue-100">
                            <td colspan="4" class="py-3 px-2 text-right tracking-widest">SALDO AKHIR PERIODE</td>
                            <td class="py-3 px-2 text-right text-blue-900">${invFmt(currentBalance)}</td>
                            <td></td>
                        </tr>
                    </tfoot>
                </table>
            </div>
        </div>
    `;

    const footer = `
        <div class="flex gap-2">
            <button onclick="printWIPStockCard('${itemId}', '${location}', '${startDateStr}', '${endDateStr}')" class="px-4 py-2 bg-slate-800 text-white rounded text-xs font-bold uppercase hover:bg-black transition-colors flex items-center gap-2">
                <i class="fas fa-print"></i> Cetak Kartu Stok
            </button>
            <button onclick="closeModal()" class="px-6 py-2 bg-gray-200 text-gray-700 rounded text-xs font-bold uppercase hover:bg-gray-300 transition-colors">Tutup</button>
        </div>
    `;

    showModal(`Kartu Stok WIP: ${location}`, body, footer, 'full');
}

window.printWIPStockCard = (itemId, location, startDateStr, endDateStr) => {
    const item = db.findById('inventoryItems', itemId);
    if (!item) return;

    const startDate = new Date(startDateStr + 'T00:00:00');
    const endDate = new Date(endDateStr + 'T23:59:59');

    const allTxs = db.read('stockTransactions') || [];
    const _getTxLoc = (t) => {
        let l = t.location;
        if (l === 'WHS' || !l) {
            if (item.category === 'OVEN_BASAH_STOCK') l = 'OVEN_BASAH';
            else if (item.category === 'OVEN_KERING_STOCK') l = 'OVEN_KERING';
            else l = 'WHS';
        }
        return l;
    };

    const openingTxs = allTxs.filter(t => t.itemId === itemId && _getTxLoc(t) === location && new Date(t.date) < startDate);
    const openingStock = openingTxs.reduce((sum, t) => {
        const type = (t.type || '').toUpperCase();
        const isIn = ['IN', 'ADJUST_IN', 'PRODUCTION_IN', 'RETURN_IN'].includes(type);
        const isOut = ['OUT', 'SHRINKAGE', 'ADJUST_OUT', 'PRODUCTION_OUT', 'SALES_OUT', 'WASTE'].includes(type);
        if (isIn) return sum + t.qty;
        if (isOut) return sum - t.qty;
        return sum;
    }, 0);

    const txs = allTxs.filter(t => t.itemId === itemId && _getTxLoc(t) === location && new Date(t.date) >= startDate && new Date(t.date) <= endDate)
                      .sort((a, b) => new Date(a.date) - new Date(b.date));

    let currentBalance = openingStock;
    let totalNormalIn = 0;
    let totalManualIn = 0;
    let totalNormalOut = 0;
    let totalShrinkOut = 0;

    const rows = txs.map(t => {
        const type = (t.type || '').toUpperCase();
        const isIn = ['IN', 'ADJUST_IN', 'PRODUCTION_IN', 'RETURN_IN'].includes(type);
        const isOut = ['OUT', 'SHRINKAGE', 'ADJUST_OUT', 'PRODUCTION_OUT', 'SALES_OUT', 'WASTE'].includes(type);
        const q = t.qty || 0;
        
        const refUpper = (t.reference || '').toUpperCase();
        const isShrink = ['SHRINKAGE', 'ADJUST_OUT', 'WASTE', 'JUDGMENT'].includes(refUpper) || (t.notes || '').toLowerCase().includes('susut');
        const isManualIn = ['MANUAL', 'ADJUST_IN'].includes(refUpper);

        if (isIn) { 
            if (isManualIn) totalManualIn += q;
            else totalNormalIn += q;
            currentBalance += q; 
        }
        if (isOut) { 
            if (isShrink) totalShrinkOut += q;
            else totalNormalOut += q;
            currentBalance -= q; 
        }

        return `
            <tr>
                <td class="t-center">${invDate(t.date)}</td>
                <td class="t-center">${t.type}</td>
                <td class="t-right">${isIn ? '+' + invFmt(q) : '-'}</td>
                <td class="t-right">${isOut ? '-' + invFmt(q) : '-'}</td>
                <td class="t-right f-bold">${invFmt(currentBalance)}</td>
                <td>${t.reference || '-'} ${t.notes ? '(' + t.notes + ')' : ''}</td>
            </tr>`;
    }).join('');

    const printHtml = `
    <html>
    <head>
        <title>Kartu Stok WIP - ${location} - ${item.itemName}</title>
        <style>
            body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; font-size: 11px; margin: 30px; color: #334155; }
            .header { text-align: center; margin-bottom: 20px; border-bottom: 2px solid #e2e8f0; padding-bottom: 15px; }
            .meta { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 20px; }
            .meta-box { background: #f8fafc; padding: 12px; border: 1px solid #e2e8f0; border-radius: 8px; }
            table { width: 100%; border-collapse: collapse; margin-top: 10px; }
            th { background: #f1f5f9; border: 1px solid #e2e8f0; padding: 8px; text-transform: uppercase; font-size: 9px; letter-spacing: 0.05em; }
            td { border: 1px solid #e2e8f0; padding: 8px; }
            .t-right { text-align: right; }
            .t-center { text-align: center; }
            .f-bold { font-weight: bold; }
            .total-row { background: #f8fafc; font-weight: bold; font-size: 10px; }
            .bg-in { background: #f0fdf4 !important; color: #166534; }
            .bg-in-manual { background: #eff6ff !important; color: #1e40af; }
            .bg-out-normal { background: #f8fafc !important; color: #334155; }
            .bg-out-shrink { background: #fef2f2 !important; color: #991b1b; }
            .bg-final { background: #eff6ff !important; color: #1e40af; font-size: 12px; }
            @media print {
                .bg-in { background-color: #f0fdf4 !important; }
                .bg-in-manual { background-color: #eff6ff !important; }
                .bg-out-shrink { background-color: #fef2f2 !important; }
            }
        </style>
    </head>
    <body onload="window.print()">
        <div class="header">
            <h1 style="margin:0;font-size:18px;color:#1e293b;">KARTU STOK WIP: ${location}</h1>
            <p style="margin:5px 0;font-weight:bold;color:#64748b;">${CONFIG.companyName}</p>
        </div>
        
        <div class="meta">
            <div class="meta-box">
                <strong>Item:</strong> ${item.itemName}<br>
                <strong>Kode:</strong> ${item.itemCode || '-'}<br>
                <strong>Lokasi:</strong> ${location}
            </div>
            <div class="meta-box">
                <strong>Periode:</strong> ${startDateStr} s/d ${endDateStr}<br>
                <strong>Satuan:</strong> ${item.unit}
            </div>
        </div>

        <table>
            <thead>
                <tr>
                    <th width="15%">Waktu</th>
                    <th width="8%">Tipe</th>
                    <th width="12%" class="t-right">Masuk</th>
                    <th width="12%" class="t-right">Keluar</th>
                    <th width="12%" class="t-right">Saldo</th>
                    <th>Dokumen / Keterangan</th>
                </tr>
            </thead>
            <tbody>
                <tr style="background:#fffbeb; font-style: italic;">
                    <td colspan="4" class="f-bold">SALDO AWAL PERIODE</td>
                    <td class="t-right f-bold">${invFmt(openingStock)}</td>
                    <td></td>
                </tr>
                ${rows || '<tr><td colspan="6" class="t-center" style="padding:40px;color:#94a3b8;">Tidak ada transaksi</td></tr>'}
                
                <tr class="total-row bg-in">
                    <td colspan="2">TOTAL MASUK NORMAL (+)</td>
                    <td class="t-right">+${invFmt(totalNormalIn)}</td>
                    <td colspan="3"></td>
                </tr>
                <tr class="total-row bg-in-manual">
                    <td colspan="2">TOTAL MASUK (MANUAL/ADJ) (+)</td>
                    <td class="t-right">+${invFmt(totalManualIn)}</td>
                    <td colspan="3"></td>
                </tr>
                <tr class="total-row bg-out-normal">
                    <td colspan="3">TOTAL KELUAR NORMAL (-)</td>
                    <td class="t-right">-${invFmt(totalNormalOut)}</td>
                    <td colspan="2"></td>
                </tr>
                <tr class="total-row bg-out-shrink">
                    <td colspan="3">TOTAL SUSUT / NG / MANUAL (-)</td>
                    <td class="t-right">-${invFmt(totalShrinkOut)}</td>
                    <td colspan="2"></td>
                </tr>
                <tr class="total-row bg-final" style="border-top: 2px solid #3b82f6;">
                    <td colspan="4" class="t-right">SALDO AKHIR PERIODE</td>
                    <td class="t-right f-bold">${invFmt(currentBalance)}</td>
                    <td></td>
                </tr>
            </tbody>
        </table>

        <div style="margin-top:30px; display: flex; justify-content: space-between; font-size: 9px; color: #94a3b8;">
            <p>Dicetak pada: ${new Date().toLocaleString('id-ID')}</p>
            <p>Unity ERP System</p>
        </div>
    </body>
    </html>`;

    const win = window.open('', '_blank');
    if (win) {
        win.document.write(printHtml);
        win.document.close();
    }
};


// â”€â”€â”€ 7. JUDGMENT / NG BARANG â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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
    <!-- Collapsible Filter Section -->
    <div class="bg-white rounded-xl shadow-sm border border-gray-100 mb-5 overflow-hidden">
        <div onclick="toggleInvJFilter()" class="flex items-center justify-between p-4 cursor-pointer hover:bg-gray-50 transition-colors select-none">
            <h3 class="text-[10px] font-black text-slate-800 uppercase tracking-[0.2em] flex items-center gap-3">
                <i class="fas fa-filter text-blue-600"></i> FILTER PENCARIAN
                ${(!window._uiState.invJFilterOpen && (f.start || f.end || f.status || f.itemName)) ? 
                    `<span class="ml-2 px-2 py-0.5 bg-blue-50 text-blue-600 rounded-full text-[9px] font-bold">Filter Aktif</span>` : ''}
            </h3>
            <div class="flex items-center gap-3">
                <span class="text-[9px] font-bold text-slate-400 uppercase tracking-widest">${window._uiState.invJFilterOpen ? 'Sembunyikan' : 'Tampilkan'}</span>
                <i class="fas fa-chevron-${window._uiState.invJFilterOpen ? 'up' : 'down'} text-slate-300 text-xs"></i>
            </div>
        </div>

        <div class="${window._uiState.invJFilterOpen ? 'block' : 'hidden'} p-5 border-t border-slate-50 animate-in slide-in-from-top-2 duration-200">
            <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 items-end">
                <div class="space-y-1.5">
                    <label class="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Dari Tanggal</label>
                    <input type="date" id="jud_filter_start" value="${f.start}" class="w-full border-2 border-slate-100 rounded-lg px-3 py-2 text-sm font-bold text-slate-700 focus:border-blue-500 outline-none transition-all bg-slate-50/50 focus:bg-white">
                </div>
                <div class="space-y-1.5">
                    <label class="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Sampai Tanggal</label>
                    <input type="date" id="jud_filter_end" value="${f.end}" class="w-full border-2 border-slate-100 rounded-lg px-3 py-2 text-sm font-bold text-slate-700 focus:border-blue-500 outline-none transition-all bg-slate-50/50 focus:bg-white">
                </div>
                <div class="space-y-1.5">
                    <label class="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Status NG</label>
                    <select id="jud_filter_status" class="w-full border-2 border-slate-100 rounded-lg px-3 py-2 text-sm font-bold text-slate-700 focus:border-blue-500 outline-none transition-all bg-slate-50/50 focus:bg-white cursor-pointer font-sans">
                        <option value="">-- Semua Status --</option>${statusOpts}
                    </select>
                </div>
                <div class="space-y-1.5">
                    <label class="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Pencarian Barang</label>
                    <input type="text" id="jud_filter_name" value="${f.itemName}" placeholder="Cari Nama/Kode Item..." 
                        class="w-full border-2 border-slate-100 rounded-lg px-3 py-2 text-sm font-bold text-slate-700 focus:border-blue-500 outline-none transition-all bg-slate-50/50 focus:bg-white">
                </div>
            </div>

            <div class="mt-4 pt-4 border-t border-slate-50 flex flex-col sm:flex-row justify-between items-center gap-4">
                <button onclick="resetJudgmentFilters()" class="text-[9px] font-black text-slate-400 hover:text-slate-600 uppercase tracking-widest flex items-center gap-2 transition-all">
                    <i class="fas fa-undo-alt text-[10px]"></i> Reset Filter
                </button>
                <button onclick="updateJudgmentFilters()" class="w-full sm:w-auto bg-blue-600 hover:bg-slate-900 text-white px-8 py-2.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all shadow-lg active:scale-95 flex items-center justify-center gap-2">
                    <i class="fas fa-search"></i> TAMPILKAN DATA
                </button>
            </div>
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
        <div class="bg-white rounded-xl shadow-xl w-full max-w-6xl overflow-hidden animate-slide-up border border-gray-100">
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

window.printWIPReport = () => {
    const monthVal = document.getElementById('wip_msr_month')?.value;
    const loc = window.currentWIPMutationCategory || 'OVEN_BASAH';
    if (!monthVal) return;

    const [year, month] = monthVal.split('-').map(Number);
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0, 23, 59, 59);

    const items = (db.read('inventoryItems') || []).filter(it => it.status !== 'INACTIVE');
    const allTxs = db.read('stockTransactions') || [];

    const reportData = items.filter(it => {
        if (loc === 'OVEN_BASAH') return it.category === 'OVEN_BASAH_STOCK';
        if (loc === 'OVEN_KERING') return it.category === 'OVEN_KERING_STOCK';
        return false;
    }).map(it => {
        const itemTxs = allTxs.filter(t => t.itemId === it.id);
        const getStageQty = (txs, direction) => {
            return txs.reduce((sum, t) => {
                const q = parseFloat(t.qty) || 0;
                const type = (t.type || '').toUpperCase();
                const isIn = ['IN', 'ADJUST_IN', 'PRODUCTION_IN', 'RETURN_IN'].includes(type);
                const isOut = ['OUT', 'SHRINKAGE', 'ADJUST_OUT', 'PRODUCTION_OUT', 'SALES_OUT', 'WASTE'].includes(type);
                if (direction === 'IN' && isIn) return sum + q;
                if (direction === 'OUT' && isOut) return sum + q;
                if (direction === 'NET') {
                    if (isIn) return sum + q;
                    if (isOut) return sum - q;
                }
                return sum;
            }, 0);
        };
        const openingTxs = itemTxs.filter(t => new Date(t.date) < startDate);
        const openingStock = getStageQty(openingTxs, 'NET');
        const monthTxs = itemTxs.filter(t => new Date(t.date) >= startDate && new Date(t.date) <= endDate);
        const totalIn = getStageQty(monthTxs, 'IN');
        const totalOut = getStageQty(monthTxs, 'OUT');
        const closingStock = openingStock + totalIn - totalOut;
        return { ...it, openingStock, totalIn, totalOut, closingStock };
    }).filter(it => it.openingStock !== 0 || it.totalIn !== 0 || it.totalOut !== 0);

    let rows = reportData.map(s => `
        <tr>
            <td style="font-family:monospace">${s.itemCode}</td>
            <td>${s.itemName}</td>
            <td style="text-align:center">${s.unit}</td>
            <td style="text-align:right">${invFmt(s.openingStock)}</td>
            <td style="text-align:right;color:#166534">+${invFmt(s.totalIn)}</td>
            <td style="text-align:right;color:#991b1b">-${invFmt(s.totalOut)}</td>
            <td style="text-align:right;font-weight:bold">${invFmt(s.closingStock)}</td>
        </tr>
    `).join('');

    const printHtml = `
    <div style="font-family:sans-serif;padding:20px;color:#1e293b">
        <h2 style="margin:0;text-transform:uppercase;letter-spacing:0.05em">Laporan Mutasi Stok WIP: ${loc.replace('_', ' ')}</h2>
        <p style="margin:5px 0;font-size:12px;color:#64748b">Periode: ${monthVal} | Perusahaan: ${CONFIG.companyName}</p>
        <hr style="border:0;border-top:2px solid #e2e8f0;margin:20px 0">
        <table style="width:100%;border-collapse:collapse;font-size:11px">
            <thead>
                <tr style="background:#f8fafc">
                    <th style="border:1px solid #e2e8f0;padding:10px;text-align:left">KODE</th>
                    <th style="border:1px solid #e2e8f0;padding:10px;text-align:left">NAMA ITEM</th>
                    <th style="border:1px solid #e2e8f0;padding:10px;text-align:center">UNIT</th>
                    <th style="border:1px solid #e2e8f0;padding:10px;text-align:right">AWAL</th>
                    <th style="border:1px solid #e2e8f0;padding:10px;text-align:right">MASUK (+)</th>
                    <th style="border:1px solid #e2e8f0;padding:10px;text-align:right">KELUAR (-)</th>
                    <th style="border:1px solid #e2e8f0;padding:10px;text-align:right">AKHIR</th>
                </tr>
            </thead>
            <tbody>
                ${rows || '<tr><td colspan="7" style="padding:40px;text-align:center;color:#94a3b8;font-style:italic">Tidak ada data pergerakan stok</td></tr>'}
            </tbody>
        </table>
        <div style="margin-top:40px;display:flex;justify-content:space-between;font-size:10px;color:#94a3b8">
            <p>Dicetak pada: ${new Date().toLocaleString('id-ID')}</p>
            <p>Unity ERP System</p>
        </div>
    </div>`;

    window.printHTML(printHtml, `Mutasi WIP ${loc} - ${monthVal}`, true);
};



