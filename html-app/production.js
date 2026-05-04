// production.js - Modul Produksi
// Tahap: OVEN_BASAH -> OVEN_KERING -> FINISH_GOOD

const PROD_STAGES = [
    { key: 'OVEN_BASAH', label: 'Oven Basah', icon: 'fas fa-fire', color: 'bg-orange-50 text-orange-600', hasStock: true, hasShrinkage: true, inputFrom: 'RAW_MATERIAL' },
    { key: 'OVEN_KERING', label: 'Oven Kering', icon: 'fas fa-sun', color: 'bg-yellow-50 text-yellow-600', hasStock: true, hasShrinkage: true, inputFrom: 'OVEN_BASAH' },
    { key: 'PACKING', label: 'Gudang Jadi', icon: 'fas fa-box-open', color: 'bg-green-50 text-green-600', hasStock: true, hasShrinkage: true, inputFrom: 'OVEN_KERING' },
];

const STAGE_LOCATIONS = {
    RAW_MATERIAL: 'WHS',
    OVEN_BASAH: 'OVEN_BASAH',
    OVEN_KERING: 'OVEN_KERING',
    PACKING: 'WHS'
};

const MACHINE_CAPACITY = {
    OVEN_BASAH: 50, // Kapasitas max per batch dlm Kg
    OVEN_KERING: 40
};

const STAGE_STOCK_CATEGORY = {
    OVEN_BASAH: ['OVEN_BASAH_STOCK'],
    OVEN_KERING: ['OVEN_KERING_STOCK'],
    PACKING: ['FINISHED_GOODS']
};

function generateBatchId() {
    const today = new Date().toISOString().split('T')[0].replace(/-/g, '');
    const rand = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    return `BTCH-${today}-${rand}`;
}

function prodStageLabel(key) {
    return PROD_STAGES.find(s => s.key === key)?.label || key;
}
function prodStageColor(key) {
    const colors = {
        OVEN_BASAH: 'bg-orange-100 text-orange-700',
        OVEN_KERING: 'bg-yellow-100 text-yellow-700',
        PACKING: 'bg-green-100 text-green-700',
    };
    return colors[key] || 'bg-gray-100 text-gray-700';
}
function prodStatusColor(status) {
    return { DRAFT: 'bg-gray-100 text-gray-600', IN_PROGRESS: 'bg-blue-100 text-blue-700', DONE: 'bg-green-100 text-green-700' }[status] || 'bg-gray-100 text-gray-600';
}
function prodQCColor(status) {
    return { PENDING: 'bg-gray-100 text-gray-500', PASSED: 'bg-green-100 text-green-700', FAILED: 'bg-red-100 text-red-700' }[status] || 'bg-gray-100 text-gray-600';
}
function prodFmt(n) { return new Intl.NumberFormat('id-ID', { maximumFractionDigits: 2 }).format(n || 0); }
function prodDate(d) { return d ? new Date(d).toLocaleDateString('id-ID') : '-'; }

// --- DASHBOARD: VISUAL PIPELINE ---
window.renderProductionDashboard = () => {
    document.getElementById('pageTitle').innerText = 'Produksi & Work In Progress';
    const mc = document.getElementById('main-content');
    const mos = db.read('productionOrders') || [];

    const getStageStock = (loc) => {
        const invTxs = db.read('stockTransactions') || [];
        return invTxs.filter(t => t.location === loc).reduce((total, t) => {
            return t.type === 'IN' ? total + parseFloat(t.qty) : total - parseFloat(t.qty);
        }, 0);
    };

    const dashboardCards = PROD_STAGES.map((st, idx) => {
        const stageMOs = mos.filter(m => m.stage === st.key && m.status === 'IN_PROGRESS');
        const loc = STAGE_LOCATIONS[st.key];
        const stockQty = loc ? getStageStock(loc) : null;

        const moList = stageMOs.map(mo => `
            <div class="hover:bg-slate-50 p-3 rounded-lg border border-slate-100 flex justify-between items-center group cursor-pointer" onclick="viewProductionMO('${mo.id}')">
                <div>
                    <p class="text-xs font-bold text-slate-700">${mo.productName}</p>
                    <p class="text-[10px] text-slate-400">#${mo.moNumber} • ${new Date(mo.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                </div>
                <button onclick="event.stopPropagation(); openCompleteMOModal('${mo.id}')" class="text-[10px] font-bold text-blue-600 hover:underline">SELESAIKAN</button>
            </div>
        `).join('') || '<p class="text-center py-6 text-slate-300 text-[10px] font-medium tracking-wider">Antrean Kosong</p>';

        return `
        <div class="bg-white rounded-xl border border-slate-100 shadow-sm flex flex-col h-[480px]">
            <div class="p-4 border-b border-slate-50 flex justify-between items-center">
                <span class="text-sm font-bold text-slate-800">${st.label}</span>
                <button onclick="openMOModal('${st.key}')" class="text-blue-600 hover:text-blue-800"><i class="fas fa-plus-circle"></i></button>
            </div>
            <div class="p-3 bg-slate-50/50 flex justify-between items-center text-[10px] font-bold uppercase tracking-widest text-slate-400">
                <span>Total Aktif: ${stageMOs.length}</span>
                <span class="text-indigo-600">${stockQty !== null ? `${prodFmt(stockQty)} Kg` : '-'}</span>
            </div>
            <div class="flex-1 p-3 overflow-y-auto space-y-2">
                ${moList}
            </div>
        </div>`;
    }).join('');

    // Calculate Top Produced Products (by total KG)
    const topProdsRaw = {};
    mos.filter(m => m.status === 'DONE').forEach(m => {
        const name = m.productName || (m.outputProducts && m.outputProducts.length > 0 ? m.outputProducts[0].itemName : null) || 'Unknown';
        topProdsRaw[name] = (topProdsRaw[name] || 0) + (parseFloat(m.outputQty) || 0);
    });
    const sortedProds = Object.entries(topProdsRaw).sort((a,b) => b[1] - a[1]).slice(0, 5);

    mc.innerHTML = `
        <div class="mb-6 flex justify-between items-end border-b border-slate-100 pb-4">
            <div>
                <p class="text-xs text-slate-400 font-bold uppercase tracking-widest mb-1">Status Produksi</p>
                <div class="flex items-center gap-4">
                    ${PROD_STAGES.map(s => `<span class="text-sm font-bold text-slate-700 flex items-center gap-2"><i class="fas fa-circle text-[8px] opacity-20"></i> ${s.label}</span>`).join('')}
                </div>
            </div>
            <div class="flex gap-2">
                <button onclick="renderProductionStockMaster()" class="px-4 py-2 bg-slate-800 text-white rounded-lg text-xs font-bold shadow-sm hover:bg-slate-900 flex items-center gap-2">
                    <i class="fas fa-boxes"></i> Master Stok
                </button>
                <button onclick="renderProductionReports()" class="px-4 py-2 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-600 hover:bg-slate-50">Laporan</button>
                <button onclick="renderProductionMO()" class="px-4 py-2 bg-blue-600 text-white rounded-lg text-xs font-bold shadow-sm hover:bg-blue-700">Riwayat MO</button>
            </div>
        </div>

        <!-- Pipeline Cards -->
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
            ${dashboardCards}
        </div>

        <!-- Analytics Section -->
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-6 pb-12">
            <div class="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 hover:shadow-md transition-shadow">
                <div class="flex justify-between items-center mb-6">
                    <div>
                        <h3 class="text-sm font-black text-slate-800 uppercase tracking-wider">Top Produced Products</h3>
                        <p class="text-[10px] text-slate-400 font-bold uppercase mt-0.5">Berdasarkan Total Berat (KG)</p>
                    </div>
                    <div class="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center">
                        <i class="fas fa-crown text-indigo-500 text-xs"></i>
                    </div>
                </div>
                <div style="height: 220px;">
                    <canvas id="prod_top_chart"></canvas>
                </div>
            </div>

            <div class="bg-white rounded-2xl border border-slate-200 shadow-sm p-8 flex flex-col justify-center items-center text-center group">
                 <div class="w-20 h-20 rounded-full bg-slate-50 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-500">
                    <div class="w-14 h-14 rounded-full bg-white shadow-inner flex items-center justify-center text-blue-500">
                        <i class="fas fa-chart-line text-2xl"></i>
                    </div>
                 </div>
                 <h4 class="text-slate-800 font-black uppercase tracking-widest text-sm mb-3">Analisis Efisiensi</h4>
                 <p class="text-xs text-slate-500 max-w-xs leading-relaxed font-medium">Data di samping menunjukkan dominasi produk dalam alur kerja pabrik Anda. Fokuskan kontrol kualitas pada item dengan volume tinggi ini untuk meminimalkan penyusutan secara signifikan.</p>
                 <button onclick="renderProductionReports()" class="mt-6 px-6 py-2.5 rounded-xl bg-slate-50 text-slate-600 text-[10px] font-black uppercase tracking-widest hover:bg-slate-100 transition-colors">Lihat Detail Laporan</button>
            </div>
        </div>
    `;

    // Draw Chart
    setTimeout(() => {
        const ctx = document.getElementById('prod_top_chart');
        if (ctx && sortedProds.length > 0) {
            new Chart(ctx, {
                type: 'bar',
                data: {
                    labels: sortedProds.map(p => p[0]),
                    datasets: [{
                        data: sortedProds.map(p => p[1]),
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
                                label: (c) => ` ${prodFmt(c.parsed.x)} KG`
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
    }, 100);
};

// --- DAFTAR MO ---
window.renderProductionMO = () => {
    const canEdit = getModulePermission('produksi').edit;
    document.getElementById('pageTitle').innerText = 'Manufacturing Order ( MO )';
    const mc = document.getElementById('main-content');
    const mos = db.read('productionOrders') || [];

    window._prodFilters = window._prodFilters || { stage: '', search: '', start: '', end: '' };
    const f = window._prodFilters;

    const filtered = mos.filter(m => {
        if (f.stage && m.stage !== f.stage) return false;
        if (f.search) {
            const q = f.search.toLowerCase();
            const inMO = (m.moNumber || '').toLowerCase().includes(q);
            const inProd = (m.productName || '').toLowerCase().includes(q);
            const inStage = (prodStageLabel(m.stage) || '').toLowerCase().includes(q);
            const inTP = (m.targetProducts || []).some(tp => (tp.itemName || '').toLowerCase().includes(q));
            if (!inMO && !inProd && !inTP && !inStage) return false;
        }
        if (f.start || f.end) {
            const moDate = new Date(m.date || m.createdAt);
            moDate.setHours(0, 0, 0, 0);
            if (f.start) { const sd = new Date(f.start); sd.setHours(0, 0, 0, 0); if (moDate < sd) return false; }
            if (f.end) { const ed = new Date(f.end); ed.setHours(23, 59, 59, 999); if (moDate > ed) return false; }
        }
        return true;
    }).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    const stageOpts = PROD_STAGES.map(s =>
        `<option value="${s.key}" ${f.stage === s.key ? 'selected' : ''}>${s.label}</option>`).join('');

    let tableRows = '';
    if (filtered.length === 0) {
        tableRows = `<tr><td colspan="6" class="py-20 text-center text-slate-300 italic text-sm">Tidak ada MO ditemukan.</td></tr>`;
    } else {
        filtered.forEach(mo => {
            const moDate = new Date(mo.date || mo.createdAt).toLocaleDateString('id-ID', { day: '2-digit', month: '2-digit', year: 'numeric' });
            const tpNames = (mo.targetProducts || []).map(tp => tp.itemName || '').filter(Boolean).join(', ') || mo.productName || '-';
            tableRows += `
            <tr class="border-b border-slate-100 hover:bg-slate-50 transition-all text-sm">
                <td class="py-4 px-5 font-mono font-bold text-blue-600 cursor-pointer hover:underline whitespace-nowrap" onclick="viewProductionMO('${mo.id}')">${mo.moNumber}</td>
                <td class="py-4 px-4"><span class="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${prodStageColor(mo.stage)}">${prodStageLabel(mo.stage)}</span></td>
                <td class="py-4 px-4 text-xs text-slate-500 font-medium">${moDate}</td>
                <td class="py-4 px-4 font-semibold text-slate-800 text-xs max-w-xs truncate">${tpNames}</td>
                <td class="py-4 px-4"><span class="px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-widest ${prodStatusColor(mo.status)}">${mo.status === 'DONE' ? 'Selesai' : 'Proses'}</span></td>
                <td class="py-4 px-5 text-right whitespace-nowrap">
                    <div class="flex justify-end items-center gap-1.5">
                        <button onclick="printProductionMO('${mo.id}')" class="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all" title="Cetak"><i class="fas fa-print text-xs"></i></button>
                        <button onclick="viewProductionMO('${mo.id}')" class="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all" title="Detail"><i class="fas fa-eye text-xs"></i></button>
                        ${mo.status === 'IN_PROGRESS' && canEdit ? `<button onclick="openCompleteMOModal('${mo.id}')" class="bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest active:scale-95 transition-all">Selesai</button>` : ''}
                        ${mo.status !== 'DONE' && canEdit ? `<button onclick="deleteMO('${mo.id}')" class="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all" title="Hapus"><i class="fas fa-trash text-xs"></i></button>` : ''}
                    </div>
                </td>
            </tr>`;
        });
    }

    mc.innerHTML = `
        <div class="flex flex-col gap-4 animate-in fade-in duration-300">
            <div class="flex flex-col sm:flex-row justify-between items-center gap-4">
                <!-- Search Bar -->
                <div class="relative w-full sm:max-w-md">
                    <i class="fas fa-search absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 text-sm"></i>
                    <input type="text" id="mo_search_input" placeholder="Cari nomor MO, produk, atau tahap..." value="${f.search || ''}"
                        oninput="window._prodFilters.search=this.value; renderProductionMO()"
                        class="w-full pl-11 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-600 outline-none focus:border-blue-500 transition-all shadow-sm">
                </div>
                
                <!-- Action Buttons -->
                <div class="flex items-center gap-3 shrink-0 w-full sm:w-auto">
                    <!-- Date Filter Dropdown Trigger -->
                    <div class="relative" id="mo_date_filter_container">
                        <button onclick="toggleMODateDropdown()" class="flex items-center bg-slate-50 border border-slate-200 rounded-lg overflow-hidden hover:bg-slate-100 transition-all shadow-sm h-[42px] group">
                            <span class="bg-slate-200/60 border-r border-slate-200 px-3 h-full flex items-center text-slate-700 transition-colors">
                                <i class="fas fa-sort-amount-up text-sm"></i>
                            </span>
                            <span class="px-4 text-sm font-medium text-blue-700">Date</span>
                            <span class="pr-3 text-slate-600">
                                <i class="fas fa-chevron-down text-[12px]"></i>
                            </span>
                        </button>
                        
                        <!-- Dropdown Content -->
                        <div id="mo_date_dropdown" class="absolute right-0 mt-2 w-72 bg-white border border-slate-100 rounded-2xl shadow-2xl z-[200] hidden p-5 animate-in fade-in zoom-in-95 duration-200">
                            <h4 class="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Filter Berdasarkan Tanggal</h4>
                            <div class="space-y-4">
                                <div>
                                    <label class="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Dari Tanggal</label>
                                    <input type="date" id="mo_header_start" value="${f.start || ''}" class="w-full border-2 border-slate-50 rounded-xl px-3 py-2 text-sm font-bold text-slate-700 focus:border-blue-500 outline-none transition-all bg-slate-50/50">
                                </div>
                                <div>
                                    <label class="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Sampai Tanggal</label>
                                    <input type="date" id="mo_header_end" value="${f.end || ''}" class="w-full border-2 border-slate-50 rounded-xl px-3 py-2 text-sm font-bold text-slate-700 focus:border-blue-500 outline-none transition-all bg-slate-50/50">
                                </div>
                                <div class="flex gap-2 pt-2">
                                    <button onclick="applyMOHeaderDateFilter()" class="flex-1 bg-blue-600 text-white py-2 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-blue-700 transition-all shadow-lg active:scale-95">Apply</button>
                                    <button onclick="resetMOHeaderDateFilter()" class="flex-1 bg-slate-50 text-slate-400 py-2 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-slate-100 transition-all">Reset</button>
                                </div>
                            </div>
                        </div>
                    </div>
                    ${canEdit ? `<button onclick="openMOModal()" class="bg-blue-600 hover:bg-blue-700 text-white h-[42px] px-6 rounded-lg text-xs font-black flex items-center gap-2 shadow-sm uppercase tracking-widest transition-all active:scale-95 whitespace-nowrap"><i class="fas fa-plus"></i> BUAT MO</button>` : ''}
                </div>
            </div>
            <div class="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                <div class="flex items-center justify-between px-5 py-4 border-b border-slate-100">
                    <span class="text-xs font-black text-slate-700 uppercase tracking-widest">Daftar Perintah Produksi</span>
                    <span class="text-[10px] font-bold text-slate-400">${filtered.length} MO</span>
                </div>
                <div class="overflow-x-auto">
                    <table class="w-full text-left">
                        <thead>
                            <tr class="border-b border-slate-100 bg-slate-50/50">
                                <th class="py-3 px-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Nomor MO</th>
                                <th class="py-3 px-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Tahap</th>
                                <th class="py-3 px-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Tanggal</th>
                                <th class="py-3 px-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Produk</th>
                                <th class="py-3 px-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Status</th>
                                <th class="py-3 px-5 text-right text-[10px] font-black text-slate-400 uppercase tracking-widest">Aksi</th>
                            </tr>
                        </thead>
                        <tbody>${tableRows}</tbody>
                    </table>
                </div>
            </div>
        </div>`;

    // Restore focus to search input if it was being typed in
    setTimeout(() => {
        const searchInput = document.getElementById('mo_search_input');
        if (searchInput && f.search) {
            searchInput.focus();
            searchInput.setSelectionRange(searchInput.value.length, searchInput.value.length);
        }
    }, 10);
};

window.toggleMODateDropdown = () => {
    const dropdown = document.getElementById('mo_date_dropdown');
    if (dropdown) dropdown.classList.toggle('hidden');
};

window.applyMOHeaderDateFilter = () => {
    window._prodFilters.start = document.getElementById('mo_header_start')?.value || '';
    window._prodFilters.end = document.getElementById('mo_header_end')?.value || '';
    document.getElementById('mo_date_dropdown')?.classList.add('hidden');
    renderProductionMO();
};

window.resetMOHeaderDateFilter = () => {
    window._prodFilters.start = '';
    window._prodFilters.end = '';
    document.getElementById('mo_date_dropdown')?.classList.add('hidden');
    renderProductionMO();
};

// Global click handler to close dropdown
document.addEventListener('click', (e) => {
    const container = document.getElementById('mo_date_filter_container');
    const dropdown = document.getElementById('mo_date_dropdown');
    if (container && dropdown && !container.contains(e.target)) {
        dropdown.classList.add('hidden');
    }
});

// --- STEP 1: MULAI MO (START) ---------------------------------
window.openMOModal = (stagePreset = '') => {
    if (window.pushCurrentToHistory) window.pushCurrentToHistory();
    const invItems = db.read('inventoryItems') || [];
    const stageOpts = PROD_STAGES.map(s =>
        `<option value="${s.key}" ${stagePreset === s.key ? 'selected' : ''}>${s.label}</option>`).join('');

    const boms = db.read('bomHeaders') || [];
    const bomOpts = boms.map(b => `<option value="${b.id}">${b.name}</option>`).join('');
    const machines = db.read('machines') || [];
    const todayStr = new Date().toISOString().split('T')[0];

    const mc = document.getElementById('main-content');
    document.getElementById('pageTitle').innerText = 'Form Perintah Produksi';
    renderBreadcrumb(['Produksi', 'Manufacturing Orders', 'Buat MO Baru']);

    mc.innerHTML = `
        <div class="animate-in fade-in slide-in-from-bottom-2 duration-400 -m-4 sm:-m-6 h-[calc(100vh-64px)] flex flex-col overflow-hidden bg-white">

            <!-- Sticky Action Bar -->
            <div class="sticky top-0 z-40 bg-white border-b border-slate-100 px-8 py-4 flex items-center justify-between shrink-0 shadow-sm">
                <div></div>
                <div class="flex items-center gap-3">
                    <button type="button" onclick="renderProductionMO()"
                        class="px-6 py-2.5 bg-slate-100 text-slate-500 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-200 transition-all active:scale-95">
                        Batal
                    </button>
                    <button type="button" onclick="startMO()"
                        class="px-8 py-2.5 bg-blue-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-blue-700 transition-all shadow-lg active:scale-95 flex items-center gap-2">
                        <i class="fas fa-play-circle text-[10px]"></i> Mulai Produksi
                    </button>
                </div>
            </div>

            <!-- Scrollable Content -->
            <div class="flex-1 overflow-y-auto bg-slate-50/50 pb-32">
                <div class="w-full p-8 space-y-6">



                    <!-- Section 1: Informasi Dasar -->
                    <div class="bg-white rounded-3xl p-8 border border-slate-100 shadow-sm space-y-6">
                        <h3 class="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] flex items-center gap-2">
                            <i class="fas fa-info-circle text-blue-600"></i> Informasi Dasar
                        </h3>
                        <div class="grid grid-cols-1 sm:grid-cols-4 gap-6">
                            <div>
                                <label class="block text-sm font-semibold text-slate-600 mb-2">Nomor MO <span class="text-red-400">*</span></label>
                                <input type="text" id="mo_number_display" readonly
                                    class="w-full border-none rounded-xl px-4 py-3 bg-slate-100/80 font-bold text-blue-600 font-mono outline-none">
                            </div>
                            <div>
                                <label class="block text-sm font-semibold text-slate-600 mb-2">Tahap Produksi <span class="text-red-400">*</span></label>
                                <select id="mo_stage" onchange="updateMOForm()"
                                    class="w-full border-none rounded-xl px-4 py-3 bg-slate-100/80 font-bold text-slate-800 outline-none cursor-pointer">
                                    <option value="">-- Pilih Tahap --</option>${stageOpts}
                                </select>
                            </div>
                            <div>
                                <label class="block text-sm font-semibold text-slate-600 mb-2">Tanggal Produksi <span class="text-red-400">*</span></label>
                                <input type="date" id="mo_date" value="${todayStr}" onchange="recalcMONumber()"
                                    class="w-full border-none rounded-xl px-4 py-3 bg-slate-100/80 font-bold text-slate-800 outline-none">
                            </div>
                            <div id="mo_grp_shift">
                                <label class="block text-sm font-semibold text-slate-600 mb-2">Shift <span class="text-red-400">*</span></label>
                                <select id="mo_shift"
                                    class="w-full border-none rounded-xl px-4 py-3 bg-slate-100/80 font-bold text-slate-800 outline-none cursor-pointer">
                                    <option value="">-- Pilih Shift --</option>
                                    <option value="1">Shift 1</option>
                                    <option value="2">Shift 2</option>
                                    <option value="3">Shift 3</option>
                                </select>
                            </div>
                        </div>

                        <div class="grid grid-cols-1 sm:grid-cols-2 gap-6">
                            <div id="mo_grp_bom">
                                <label class="block text-sm font-semibold text-slate-600 mb-2">Resep Produksi (BOM)</label>
                                <select id="mo_bom_id" onchange="loadBOMMaterialsToMO()"
                                    class="w-full border-none rounded-xl px-4 py-3 bg-slate-100/80 font-bold text-slate-700 outline-none cursor-pointer">
                                    <option value="">-- Tanpa Resep --</option>${bomOpts}
                                </select>
                            </div>
                            <div>
                                <label class="block text-sm font-semibold text-slate-600 mb-2">Catatan Tambahan</label>
                                <textarea id="mo_notes" rows="1" placeholder="Opsional..."
                                    class="w-full border-none rounded-xl px-4 py-3 bg-slate-100/80 text-sm text-slate-700 outline-none resize-none"></textarea>
                            </div>
                        </div>

                        <!-- Hidden global machine (for non-OVEN_BASAH stages) -->
                        <div id="mo_grp_machine" class="hidden">
                            <label id="mo_machine_label" class="block text-sm font-semibold text-slate-600 mb-3">Gunakan Mesin <span class="text-red-400">*</span></label>
                            <div class="flex flex-wrap gap-2 p-4 bg-slate-100/60 rounded-2xl" id="mo_machine_list">
                                ${machines.filter(m => !m.status || m.status === 'ACTIVE').map(m =>
        `<label class="inline-flex items-center gap-2 bg-white border border-slate-200 rounded-xl px-3 py-2 cursor-pointer hover:border-blue-300 hover:bg-blue-50 transition-all">
                                        <input type="checkbox" name="mo_machines[]" class="accent-blue-600" value="${m.id}" data-type="${m.type || ''}">
                                        <span class="text-xs font-bold text-slate-700 uppercase">${m.name}</span>
                                    </label>`).join('')}
                            </div>
                        </div>
                    </div>

                    <!-- Section 2: Target Produk (single or multi depending on stage) -->
                    <div id="mo_grp_product" class="bg-white rounded-3xl p-8 border border-slate-100 shadow-sm space-y-4">
                        <h3 class="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] flex items-center gap-2">
                            <i class="fas fa-boxes text-blue-600"></i> Target Produk
                        </h3>

                        <!-- Single product (non-Oven Basah) -->
                        <div id="mo_product_single_wrap">
                            <label class="block text-sm font-semibold text-slate-600 mb-2">Produk yang Dibuat <span class="text-red-400">*</span></label>
                            <div class="relative">
                                <input type="text" id="mo_product_display_single"
                                    placeholder="-- Klik untuk pilih produk --" readonly
                                    onclick="toggleMOProductDropdown('single')"
                                    class="w-full border-none rounded-xl px-4 py-3 bg-slate-100/80 font-bold text-slate-800 outline-none cursor-pointer hover:bg-slate-200/60 transition-all">
                                <input type="hidden" id="mo_product_id">
                                <input type="hidden" id="mo_product">
                                <div id="mo_product_dropdown_single"
                                    class="hidden absolute left-0 top-full mt-2 w-full bg-white border border-slate-100 rounded-2xl shadow-2xl z-[200] overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                                    <div class="p-3 border-b border-slate-50">
                                        <input type="text" id="mo_product_search_single"
                                            placeholder="Ketik kode atau nama..."
                                            oninput="filterMOProductList('single', this.value)"
                                            class="w-full px-4 py-2 bg-slate-50 border-none rounded-lg text-xs font-bold outline-none focus:ring-2 focus:ring-blue-500/20">
                                    </div>
                                    <div class="max-h-64 overflow-y-auto p-1" id="mo_product_list_single"></div>
                                </div>
                            </div>
                        </div>

                        <!-- Multi product (Oven Basah) -->
                        <div id="mo_product_multi_wrap" class="hidden">
                            <div class="flex items-center justify-between mb-4">
                                <label class="block text-sm font-semibold text-slate-600">Target Produk yang Dibuat <span class="text-red-400">*</span></label>
                                <button type="button" onclick="addMOTargetProductRow()"
                                    class="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shadow-lg active:scale-95">
                                    <i class="fas fa-plus text-[10px]"></i> Tambah Produk
                                </button>
                            </div>
                            <div id="mo_target_product_rows" class="space-y-3"></div>
                            <p id="mo_target_empty_msg" class="text-center text-sm text-slate-300 italic py-6">
                                Klik "+ Tambah Produk" untuk menentukan produk yang akan dibuat.
                            </p>
                        </div>
                    </div>

                    <!-- Section 3: Dynamic (Bahan Baku or WIP Input) -->
                    <div id="mo_dynamic_section"></div>

                </div>
            </div>
        </div>`;

    // Define helper and listeners AFTER form is in DOM
    window.recalcMONumber = () => {
        const d = document.getElementById('mo_date')?.value;
        const mo = db.generateMONumber(d);
        const input = document.getElementById('mo_number_display');
        if (input) input.value = mo;
    };

    // Initial setup
    setTimeout(() => {
        recalcMONumber();

        const prodSelect = document.getElementById('mo_product_id');
        if (prodSelect) {
            prodSelect.addEventListener('change', (e) => {
                const productName = e.target.options[e.target.selectedIndex]?.text || '';
                const nameField = document.getElementById('mo_product');
                if (nameField) nameField.value = productName;

                const ws = document.getElementById('mo_input_item');
                if (ws && productName) {
                    for (let i = 0; i < ws.options.length; i++) {
                        const optText = ws.options[i].text.toLowerCase();
                        if (optText.includes(productName.toLowerCase())) {
                            ws.selectedIndex = i;
                            ws.dispatchEvent(new Event('change'));
                            break;
                        }
                    }
                }
            });
        }

        if (stagePreset) updateMOForm();
    }, 50);
};


function buildItemSelect(category, id, items, showStock = false, nameFilter = '', productId = '') {
    const cats = Array.isArray(category) ? category : [category];
    const filtered = items.filter(i => {
        if (i.status === 'INACTIVE') return false;

        // 1. Initial category check: Match requested categories exactly
        const catMatch = cats.includes(i.category);
        if (!catMatch) return false;

        const rawName = i.itemName || '';
        const cleanName = rawName.toLowerCase();

        if (nameFilter) {
            const cleanFilter = String(nameFilter).toLowerCase();

            let matched = cleanName.includes(cleanFilter) || cleanFilter.includes(cleanName);

            if (!matched && productId && i.productId === productId && cats.includes(i.category)) {
                matched = true;
            }

            if (!matched && (cleanFilter.includes(' ') || cleanFilter.includes('_'))) {
                const f1 = cleanFilter.replace(/[_\s]/g, '');
                const n1 = cleanName.replace(/[_\s]/g, '');
                matched = n1.includes(f1) || f1.includes(n1);
            }
            if (!matched) return false;
        }
        if (productId && i.productId && i.productId !== productId) return false;
        return true;
    });

    // FAIL-SAFE: If filtering by name/product resulted in 0 items, but we have items in the category,
    // show ALL items in those categories to the user so they can at least pick one.
    if (filtered.length === 0 && (cats.length > 0)) {
        const fallback = items.filter(i => i.status !== 'INACTIVE' && cats.includes(i.category));
        if (fallback.length > 0) return buildSelectHTML(fallback, id, showStock, nameFilter);
    }

    return buildSelectHTML(filtered, id, showStock, nameFilter);
}

function buildSelectHTML(filteredItems, id, showStock, nameFilter) {
    const opts = filteredItems.map(i => {
        const stock = db.getInventoryStock(i.id);
        const name = i.itemName;
        const stockText = showStock ? ` (Stok: ${prodFmt(stock)} ${i.unit || 'Kg'})` : '';
        return `<option value="${i.id}">${name}${stockText}</option>`;
    }).join('');

    return `
        <select id="${id}" class="w-full border-2 border-slate-200 rounded-lg px-3 py-2 text-sm bg-white font-bold text-slate-800 focus:border-blue-500 outline-none transition-all">
            <option value="">-- Pilih Item --</option>
            ${opts}
        </select>`;
}

window.updateMOForm = () => {
    const stage = document.getElementById('mo_stage')?.value;
    const sec = document.getElementById('mo_dynamic_section');
    if (!sec || !stage) return;

    const invItems = db.read('inventoryItems') || [];
    const grpBom = document.getElementById('mo_grp_bom');
    const grpMch = document.getElementById('mo_grp_machine');
    const grpProd = document.getElementById('mo_grp_product');
    const mchLabel = document.getElementById('mo_machine_label');
    const mchSelect = document.getElementById('mo_machine_id');
    const grpShift = document.getElementById('mo_grp_shift');

    // Default: Reset filters
    const mchCheckboxes = document.querySelectorAll('input[name="mo_machines[]"]');
    if (mchCheckboxes.length > 0) {
        mchCheckboxes.forEach(cb => {
            cb.checked = false;
            cb.closest('label').classList.remove('hidden');
        });
    }

    if (stage === 'OVEN_BASAH' || stage === 'OVEN_KERING') {
        // Switch to multi-product UI (both Oven Basah & Oven Kering use per-row product+machine)
        document.getElementById('mo_product_single_wrap')?.classList.add('hidden');
        document.getElementById('mo_product_multi_wrap')?.classList.remove('hidden');
        if (document.getElementById('mo_target_product_rows')?.children.length === 0) {
            setTimeout(() => { if (window.addMOTargetProductRow) addMOTargetProductRow(stage); }, 30);
        }

        // Hide global machine section — machines go inside each product row
        grpMch?.classList.add('hidden');
        if (stage === 'OVEN_BASAH') {
            grpBom?.classList.remove('hidden');
        } else {
            grpBom?.classList.add('hidden');
        }

        if (stage === 'OVEN_BASAH') {
            if (!document.getElementById('mo_rm_list')) {
                sec.innerHTML = '';
                const stageLabel = 'Oven Basah';
                const stageColor = 'orange';
                const rmItems = invItems.filter(i => (i.category === 'RAW_MATERIAL') && i.status !== 'INACTIVE');
                const rmOpts = rmItems.map(i => `<option value="${i.id}" data-unit="${i.unit}" data-stock="${db.getInventoryStock(i.id)}">${i.itemName} (Gudang: ${prodFmt(db.getInventoryStock(i.id))})</option>`).join('');
                sec.innerHTML = `
                    <div class="bg-${stageColor}-50 border-2 border-${stageColor}-100 rounded-xl p-4">
                        <h4 class="text-xs font-black text-${stageColor}-800 mb-3 flex items-center justify-between uppercase tracking-widest">
                            <span><i class="fas fa-boxes mr-1"></i>Kebutuhan Bahan Baku & Bumbu</span>
                            <span class="text-[10px] lowercase font-normal italic">* untuk proses ${stageLabel}</span>
                        </h4>
                        <div class="flex items-center gap-2 mb-2 px-1 text-[9px] font-black text-slate-400 uppercase tracking-widest">
                            <div class="w-24">Lokasi</div>
                            <div class="flex-1">Bahan Baku</div>
                            <div class="w-28 text-center">Qty Target</div>
                            <div class="w-8"></div>
                        </div>
                        <div id="mo_rm_list" class="space-y-3"></div>
                        <button type="button" onclick="addRMRowMO()" class="mt-3 text-[10px] font-black text-${stageColor}-600 hover:text-${stageColor}-800 bg-white border border-${stageColor}-200 px-4 py-2 rounded-lg shadow-sm transition-all active:scale-95">
                            <i class="fas fa-plus mr-1"></i>Tambah Bahan Lagi
                        </button>
                        <select id="mo_rm_opts" class="hidden">${rmOpts}</select>
                    </div>`;
            }
        } else {
            sec.innerHTML = '';
        }

    } else {
        const stageInfo = PROD_STAGES.find(s => s.key === stage) || { key: stage, inputFrom: 'RAW_MATERIAL' };
        let isPacking = stage === 'PACKING';

        sec.innerHTML = '';
        grpBom?.classList.add('hidden');
        document.getElementById('mo_product_single_wrap')?.classList.remove('hidden');
        document.getElementById('mo_product_multi_wrap')?.classList.add('hidden');

        if (isPacking) {
            grpMch?.classList.add('hidden');
        } else {
            grpMch?.classList.remove('hidden');
            if (mchLabel) mchLabel.innerHTML = `Gunakan Mesin/Oven <span class="text-red-500">*</span>`;
            if (mchCheckboxes && mchCheckboxes.length > 0) {
                mchCheckboxes.forEach(cb => {
                    cb.closest('label').classList.remove('hidden');
                });
            }
        }
        grpProd?.classList.remove('hidden');
    }
};

window.filterMOProducts = () => {
    const q = document.getElementById('mo_product_search')?.value.toLowerCase();
    const sel = document.getElementById('mo_product_id');
    if (!sel) return;

    for (let opt of sel.options) {
        if (!opt.value) continue; // Skip placeholder
        const txt = opt.text.toLowerCase();
        if (txt.includes(q)) {
            opt.classList.remove('hidden');
            opt.disabled = false;
        } else {
            opt.classList.add('hidden');
            opt.disabled = true; // Added disabled for extra browser compatibility
        }
    }

    // Auto-select first visible option if exact match? 
    // No, better let user select manually.
};

window.addRMRowMO = () => {
    const list = document.getElementById('mo_rm_list');
    if (!list) return;

    const row = document.createElement('div');
    row.className = 'flex items-center gap-2 group animate-in slide-in-from-left-2 duration-300';

    // Get options from hidden select
    const opts = document.getElementById('mo_rm_opts')?.innerHTML || '';

    row.innerHTML = `
        <div class="w-24">
            <select class="mo_rm_loc w-full border border-slate-200 rounded-lg px-2 py-1.5 text-[10px] font-bold bg-white focus:border-indigo-500 outline-none">
                <option value="WHS">GUDANG</option>
            </select>
        </div>
        <div class="flex-1">
            <select class="mo_rm_item w-full border border-slate-200 rounded-lg px-3 py-1.5 text-xs font-bold bg-white focus:border-indigo-500 outline-none">
                <option value="">-- Pilih Bahan --</option>${opts}
            </select>
        </div>
        <div class="w-28 flex items-center gap-1 bg-white border border-slate-200 rounded-lg px-2">
            <input type="text" inputmode="decimal" class="mo_rm_qty w-full border-0 p-1.5 text-xs font-black text-indigo-700 text-right focus:ring-0 outline-none" placeholder="0.00">
            <span class="text-[9px] font-black text-slate-400 uppercase tracking-tighter">Kg</span>
        </div>
        <button type="button" onclick="removeRMRowMO(this)" class="w-8 h-8 flex items-center justify-center text-slate-300 hover:text-red-500 transition-colors">
            <i class="fas fa-times-circle"></i>
        </button>`;

    list.appendChild(row);
};

window.removeRMRowMO = (btn) => {
    btn.closest('.flex').remove();
};

window.loadBOMMaterialsToMO = () => {
    const bomId = document.getElementById('mo_bom_id')?.value;
    if (!bomId) return;

    const boms = db.read('bomHeaders') || [];
    const bom = boms.find(b => b.id === bomId);
    if (!bom || !bom.items) return;

    const list = document.getElementById('mo_rm_list');
    if (list) list.innerHTML = '';

    bom.items.forEach(item => {
        addRMRowMO();
        const lastRow = list.lastElementChild;
        if (lastRow) {
            const itemSelect = lastRow.querySelector('.mo_rm_item');
            const qtyInput = lastRow.querySelector('.mo_rm_qty');
            if (itemSelect) itemSelect.value = item.inventoryItemId;
            if (qtyInput) qtyInput.value = item.qty;
        }
    });

    // Auto set product if BOM has it
    if (bom.productId) {
        const prodSelect = document.getElementById('mo_product_id');
        if (prodSelect) {
            prodSelect.value = bom.productId;
            // Trigger change manual to update hidden name
            prodSelect.dispatchEvent(new Event('change'));
        }
    }
};

window.startMO = async () => {
    const stage = document.getElementById('mo_stage')?.value;
    const date = document.getElementById('mo_date')?.value;
    const shift = document.getElementById('mo_shift')?.value;
    const moNumber = document.getElementById('mo_number_display')?.value || ('MO-' + Date.now().toString().slice(-7));
    // For OVEN_BASAH: productId/Name dari target product list (baris pertama)
    const isOvenBasah = stage === 'OVEN_BASAH';
    let productId = '';
    let productName = '';
    if (!isOvenBasah) {
        productId = document.getElementById('mo_product_id')?.value;
        productName = document.getElementById('mo_product')?.value?.trim() || '';
    } else {
        // OVEN_BASAH & OVEN_KERING: read first row from multi-product list
        const firstRow = document.querySelector('#mo_target_product_rows .mo-tp-row');
        productId = firstRow?.querySelector('.mo-tp-item-id')?.value || '';
        productName = firstRow?.querySelector('.mo-tp-item-name')?.value || '';
    }

    const mchCheckboxes = document.querySelectorAll('input[name="mo_machines[]"]:checked');
    let machineIds = [];
    let machineNames = [];
    mchCheckboxes.forEach(cb => {
        machineIds.push(cb.value);
        const nameSpan = cb.nextElementSibling;
        if (nameSpan) machineNames.push(nameSpan.innerText);
    });
    const machineId = machineIds.join(',');
    const machineNameStr = machineNames.join(', ') || '-';

    const notes = document.getElementById('mo_notes')?.value.trim();

    // Required fields base
    let isValid = stage && date && moNumber;
    const isMultiRow = isOvenBasah || stage === 'OVEN_KERING';
    if (!isMultiRow) isValid = isValid && !!productId;
    let errorMsg = 'Lengkapi tahap, tanggal, dan pilih produk';

    // Machine is required for non-packing, non-multi-row stages
    if (stage !== 'PACKING' && !isMultiRow && machineIds.length === 0) {
        isValid = false;
        errorMsg = 'Silakan pilih minimal satu mesin/oven yang digunakan';
    }

    if (!isValid) {
        showToast(errorMsg, 'error');
        return;
    }

    let inputItemId = document.getElementById('mo_input_item')?.value;
    const inputQty = parseFloat(document.getElementById('mo_input_qty')?.value) || 0;
    const takeDuration = document.getElementById('mo_take_duration')?.value || '-';

    // Auto-resolve WIP Input Item for non-Oven Basah stages if not in DOM
    if (!isOvenBasah && !inputItemId && productId) {
        const stageInfo = PROD_STAGES.find(s => s.key === stage) || { key: stage, inputFrom: 'RAW_MATERIAL' };
        if (stageInfo.inputFrom !== 'RAW_MATERIAL') {
            const inputStageLabel = PROD_STAGES.find(s => s.key === stageInfo.inputFrom)?.label || stageInfo.inputFrom;
            inputItemId = db.ensureWIPItem(productId, inputStageLabel, true);
        }
    }

    let moData = {
        moNumber, batchId: moNumber, stage, productId, productName, machineId, machineName: machineNameStr, picName: '',
        shift: (stage === 'OVEN_BASAH' || stage === 'OVEN_KERING') ? shift : '',
        takeDuration: (stage === 'OVEN_BASAH' || stage === 'OVEN_KERING') ? takeDuration : '',
        date: new Date(date).toISOString(), notes, targetQty: 0, status: 'IN_PROGRESS',
        createdAt: new Date().toISOString(), inputQty, inputItemId, outputQty: 0, shrinkagePct: 0, wasteQty: 0, qcStatus: 'PENDING'
    };

    // For OVEN_BASAH & OVEN_KERING: read target products + their assigned machines from multi-rows
    if (isOvenBasah || stage === 'OVEN_KERING') {
        const tpRows = document.querySelectorAll('#mo_target_product_rows .mo-tp-row');
        const targetProducts = [];
        const tpErrors = [];
        const allUsedMachineIds = new Set();
        const allUsedMachineNames = [];

        tpRows.forEach((row, i) => {
            const itemId = row.querySelector('.mo-tp-item-id')?.value || '';
            const itemName = row.querySelector('.mo-tp-item-name')?.value || '';
            const qty = parseFloat(row.querySelector('.mo-tp-qty')?.value) || 0;
            if (!itemId) { tpErrors.push(`Produk baris ${i + 1}: belum dipilih`); return; }

            const mchChecked = [...row.querySelectorAll('.mo-tp-mch:checked')];
            const rowMachineIds = mchChecked.map(cb => cb.value);
            const rowMachineNames = mchChecked.map(cb => cb.dataset.machineName || '');
            rowMachineIds.forEach((mid, idx) => {
                if (!allUsedMachineIds.has(mid)) {
                    allUsedMachineIds.add(mid);
                    allUsedMachineNames.push(rowMachineNames[idx]);
                }
            });

            targetProducts.push({ itemId, itemName, qty, machineIds: rowMachineIds, machineNames: rowMachineNames });
        });
        if (tpErrors.length > 0) { showToast(tpErrors.join(' | '), 'error'); return; }
        if (targetProducts.length === 0) { showToast('Tambahkan minimal 1 produk target', 'error'); return; }

        moData.targetProducts = targetProducts;
        moData.productId = targetProducts[0].itemId;
        moData.productName = targetProducts[0].itemName;
        moData.machineId = [...allUsedMachineIds].join(',');
        moData.machineName = allUsedMachineNames.join(', ') || '-';
    }

    const validationErrors = [];

    if (stage === 'OVEN_BASAH') {
        // Read raw materials for OVEN_BASAH
        const rmRows = document.querySelectorAll('#mo_rm_list .flex');
        const inputItems = [];
        let totalInput = 0;

        for (const row of rmRows) {
            const itemId = row.querySelector('.mo_rm_item')?.value;
            const qty = parseFloat(row.querySelector('.mo_rm_qty')?.value);
            const location = row.querySelector('.mo_rm_location')?.value || 'GUDANG';

            if (itemId && qty > 0) {
                const item = db.findById('inventoryItems', itemId);
                const currentStock = db.getInventoryStock(itemId);
                if (currentStock < qty) {
                    validationErrors.push(`${item?.itemName || 'Item'}: Butuh ${prodFmt(qty)}, Tersisa ${prodFmt(currentStock)} ${item?.unit}`);
                }
                inputItems.push({ inventoryItemId: itemId, itemName: item?.itemName, qty, unit: item?.unit, location });
                totalInput += qty;
            }
        }

        if (validationErrors.length > 0) {
            showToast("Stok tidak memadai untuk memulai produksi!", 'error');
            return;
        }
        if (!inputItems.length) { showToast('Tambah minimal 1 bahan baku', 'error'); return; }
        moData.inputItems = inputItems;
        moData.inputQty = totalInput;

    } else if (stage === 'OVEN_KERING') {
        // For OVEN_KERING: auto-resolve WIP input items per target product
        const tpRows = moData.targetProducts || [];
        let totalWipInput = 0;
        for (const tp of tpRows) {
            const stageInfo = PROD_STAGES.find(s => s.key === 'OVEN_KERING') || { inputFrom: 'OVEN_BASAH' };
            const inputStageLabel = PROD_STAGES.find(s => s.key === stageInfo.inputFrom)?.label || stageInfo.inputFrom;
            const wipItemId = db.ensureWIPItem(tp.itemId, inputStageLabel, true);
            const wipStock = db.getInventoryStock(wipItemId);
            totalWipInput += wipStock;
        }
        moData.inputQty = totalWipInput;

    } else {
        // Other stages: no input item/qty required (removed per user request)
        moData.inputQty = 0;
    }

    try {
        await api.startProductionOrder(moData);
        showToast(`MO ${moNumber} dimulai!`, 'success');
        // Ensure the list shows today's MO after submit
        window._prodSearchPerformed = true;
        const todayStr2 = new Date().toISOString().split('T')[0];
        if (!window._prodFilters) window._prodFilters = {};
        if (!window._prodFilters.end || window._prodFilters.end < todayStr2) window._prodFilters.end = todayStr2;
        renderProductionMO();
    } catch (err) {
        showToast(err.message, 'error');
    }
};

// --- STEP 2: SELESAIKAN MO (FINISH) ---------------------------
window.openCompleteMOModal = (id) => {
    if (window.pushCurrentToHistory) window.pushCurrentToHistory();
    const mo = db.findById('productionOrders', id);
    if (!mo) return;
    const invItems = db.read('inventoryItems') || [];

    // Fallback for missing productId (legacy records)
    if (!mo.productId && mo.productName) {
        const p = invItems.find(i => i.itemName === mo.productName && i.category === 'FINISHED_GOODS');
        if (p) mo.productId = p.id;
    }

    const stageInfo = PROD_STAGES.find(s => s.key === mo.stage);

    let dynamicBody = '';
    if (mo.stage === 'OVEN_BASAH') {
        // Build the raw material actual input rows
        const matRowsOB = (mo.inputItems || []).map(m => `
            <div class="flex items-center gap-3 bg-slate-50 p-2 rounded-lg border border-slate-100">
                <div class="flex-1 text-xs font-bold text-slate-700">${m.itemName}</div>
                <div class="w-auto text-right text-[9px] text-slate-400 italic">Resep: ${prodFmt(m.qty)}</div>
                <div class="flex items-center gap-1 bg-slate-50 px-2 py-1 rounded border border-slate-200 shadow-sm focus-within:border-slate-400 transition-all">
                    <input type="text" inputmode="decimal" oninput="formatNumericInput(this)" class="mo_final_rm_actual w-20 bg-transparent border-0 text-sm font-black text-slate-700 text-right focus:ring-0 outline-none" data-item-id="${m.inventoryItemId}" data-item-name="${m.itemName}" data-item-unit="${m.unit}" value="${prodFmt(m.qty)}">
                    <span class="text-[9px] font-black text-slate-400 uppercase tracking-tighter">${m.unit || 'Kg'}</span>
                </div>
            </div>
        `).join('');

        // Build output product options (OVEN_BASAH_STOCK category)
        const ovenStockItems = (db.read('inventoryItems') || []).filter(i => i.category === 'OVEN_BASAH_STOCK' && i.status !== 'INACTIVE');
        const ovenStockOpts = ovenStockItems.map(i => `<option value="${i.id}">${i.itemName}</option>`).join('');

        // Build pre-filled product result rows from targetProducts (no re-selection needed)
        const tpList = mo.targetProducts || [];
        const resultRowsHtml = tpList.length > 0
            ? tpList.map((tp, idx) => {
                const invItem = db.findById('inventoryItems', tp.itemId);
                const itemName = tp.itemName || invItem?.itemName || `Produk ${idx + 1}`;
                return `
                <div class="ob-output-row flex items-center gap-3 bg-slate-50 p-3 rounded-xl border border-slate-100" data-item-id="${tp.itemId}">
                    <input type="hidden" class="ob-out-item" value="${tp.itemId}">
                    <div class="flex-1">
                        <p class="text-xs font-black text-slate-400 uppercase tracking-widest mb-0.5">Produk</p>
                        <p class="text-sm font-black text-slate-800">${itemName}</p>
                    </div>
                    <div class="flex flex-col items-end gap-1">
                        <label class="text-[9px] font-black text-slate-400 uppercase tracking-widest">Qty Hasil (Kg)</label>
                        <div class="flex items-center gap-1.5 bg-white border-2 border-slate-200 rounded-xl px-3 py-2 focus-within:border-blue-400 transition-all">
                            <input type="text" inputmode="decimal" oninput="formatNumericInput(this)" placeholder="0"
                                class="ob-out-qty w-24 bg-transparent border-0 text-xl font-black text-slate-800 text-right focus:ring-0 outline-none">
                            <span class="text-xs font-black text-slate-400">Kg</span>
                        </div>
                    </div>
                </div>`;
            }).join('')
            : `<div class="ob-output-row flex items-center gap-3 bg-slate-50 p-3 rounded-xl border border-slate-100" data-item-id="">
                <input type="hidden" class="ob-out-item" value="">
                <div class="flex-1">
                    <p class="text-xs font-black text-slate-400 uppercase tracking-widest mb-0.5">Produk</p>
                    <p class="text-sm font-black text-slate-500 italic">—</p>
                </div>
                <div class="flex flex-col items-end gap-1">
                    <label class="text-[9px] font-black text-slate-400 uppercase tracking-widest">Qty Hasil (Kg)</label>
                    <div class="flex items-center gap-1.5 bg-white border-2 border-orange-200 rounded-xl px-3 py-2 focus-within:border-orange-500 transition-all">
                        <input type="text" inputmode="decimal" oninput="formatNumericInput(this)" placeholder="0"
                            class="ob-out-qty w-24 bg-transparent border-0 text-xl font-black text-orange-600 text-right focus:ring-0 outline-none">
                        <span class="text-xs font-black text-slate-400">Kg</span>
                    </div>
                </div>
               </div>`;

        dynamicBody = `
            <div class="space-y-2 mb-4">
                <h4 class="text-[10px] font-black text-slate-400 mb-3 uppercase tracking-[0.2em] flex items-center gap-2">
                    <i class="fas fa-clipboard-check text-blue-600"></i> Realisasi Pemakaian Bahan Oven Basah
                </h4>
                <div class="space-y-2">${matRowsOB}</div>
            </div>

            <div class="bg-white border-2 border-slate-100 p-4 rounded-xl shadow-sm">
                <h4 class="text-xs font-black text-slate-800 uppercase tracking-widest flex items-center gap-2 mb-3">
                    <i class="fas fa-boxes text-orange-500"></i> Produk Hasil Oven Basah
                </h4>
                <div id="ob_output_rows" class="space-y-2">${resultRowsHtml}</div>
            </div>`;

    } else if (mo.stage === 'OVEN_KERING') {
        const tpList = mo.targetProducts || [];

        // Build per-product rows for OVEN_KERING
        const okRows = tpList.map((tp, idx) => {
            const invItem = db.findById('inventoryItems', tp.itemId);
            const stageInfo = PROD_STAGES.find(s => s.key === 'OVEN_KERING') || { inputFrom: 'OVEN_BASAH' };
            const inputStageLabel = PROD_STAGES.find(s => s.key === stageInfo.inputFrom)?.label || stageInfo.inputFrom;
            const wipItemId = db.ensureWIPItem(tp.itemId, inputStageLabel, false);
            const wipItem = wipItemId ? db.findById('inventoryItems', wipItemId) : null;
            const wipStock = wipItemId ? db.getInventoryStock(wipItemId) : 0;
            const ovenName = (tp.machineNames || []).join(', ') || '-';
            const inputQty = tp.qty || 0;
            const outputWipId = db.ensureWIPItem(tp.itemId, 'Oven Kering', false);
            const outputWipItem = outputWipId ? db.findById('inventoryItems', outputWipId) : null;

            return `
            <div class="ok-result-row bg-slate-50 border border-slate-200 rounded-2xl p-5 space-y-4"
                data-tp-idx="${idx}"
                data-item-id="${tp.itemId}"
                data-wip-item-id="${wipItemId || ''}"
                data-output-wip-id="${outputWipId || ''}"
                data-input-qty="${inputQty}">

                <!-- Header Row: Produk + Oven -->
                <div class="flex items-center justify-between">
                    <div>
                        <p class="text-[9px] font-black text-slate-300 uppercase tracking-widest mb-0.5">Produk</p>
                        <p class="text-sm font-black text-slate-800">${wipItem?.itemName || tp.itemName || `Produk ${idx+1}`}</p>
                        <p class="text-[9px] text-slate-400 mt-0.5">${wipItem?.itemCode || ''}</p>
                    </div>
                    <div class="text-right">
                        <p class="text-[9px] font-black text-slate-300 uppercase tracking-widest mb-0.5">Oven</p>
                        <span class="inline-flex items-center gap-1.5 bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-xs font-black text-slate-700">
                            <i class="fas fa-fire text-orange-400 text-[10px]"></i> ${ovenName}
                        </span>
                    </div>
                </div>

                <!-- Input / Output Row -->
                <div class="grid grid-cols-3 gap-3">
                    <!-- Qty Input dari MO -->
                    <div class="bg-white border border-slate-100 rounded-xl p-3 text-center">
                        <p class="text-[8px] font-black text-slate-300 uppercase tracking-widest mb-1">Qty Masuk (Kg)</p>
                        <p class="text-xl font-black text-slate-600">${prodFmt(inputQty)}</p>
                        <p class="text-[8px] text-slate-300 mt-0.5">Stok WIP: ${prodFmt(wipStock)}</p>
                    </div>

                    <!-- Hasil Aktual (editable) -->
                    <div class="bg-white border-2 border-blue-200 rounded-xl p-3 text-center focus-within:border-blue-500 transition-all">
                        <p class="text-[8px] font-black text-blue-400 uppercase tracking-widest mb-1">Hasil Setelah Oven (Kg) *</p>
                        <input type="number"
                            class="ok-result-qty w-full bg-transparent text-xl font-black text-slate-800 text-center outline-none"
                            placeholder="0"
                            step="0.1" min="0"
                            oninput="recalcOKShrinkage(${idx})"
                            data-row="${idx}">
                    </div>

                    <!-- Penyusutan (auto) -->
                    <div class="bg-rose-50 border border-rose-100 rounded-xl p-3 text-center">
                        <p class="text-[8px] font-black text-rose-300 uppercase tracking-widest mb-1">Susut (Kg) / (%)</p>
                        <p class="text-lg font-black text-rose-500" id="ok_shrink_kg_${idx}">0.00</p>
                        <p class="text-[10px] font-black text-rose-400" id="ok_shrink_pct_${idx}">0.0%</p>
                    </div>
                </div>

                ${outputWipItem ? `
                <div class="flex items-center gap-2 bg-indigo-50 border border-indigo-100 rounded-xl px-3 py-2">
                    <i class="fas fa-dolly-flatbed text-indigo-400 text-xs"></i>
                    <div>
                        <span class="text-[8px] font-black text-indigo-300 uppercase tracking-widest">Stok Tujuan: </span>
                        <span class="text-xs font-black text-indigo-800">${outputWipItem.itemName}</span>
                    </div>
                </div>` : ''}
            </div>`;
        }).join('');

        dynamicBody = `
            <div class="space-y-4">
                <h4 class="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] flex items-center gap-2">
                    <i class="fas fa-fire text-orange-500"></i> Hasil Produksi Oven Kering
                </h4>
                ${okRows || '<p class="text-sm text-slate-400 italic">Tidak ada produk terdaftar pada MO ini.</p>'}
            </div>`;

    } else if (mo.stage === 'PACKING') {
        const nextLabel = prodStageLabel(mo.stage);
        const inputItem = db.findById('inventoryItems', mo.inputItemId);

        const baseProd = db.findById('inventoryItems', mo.productId);

        dynamicBody = `
            <div class="space-y-4">
                <div class="bg-white border-2 border-slate-100 p-5 rounded-2xl shadow-sm">
                    <h4 class="text-[10px] font-black text-slate-400 mb-4 uppercase tracking-widest flex items-center gap-2">
                        <i class="fas fa-sign-in-alt text-blue-500"></i> Pemakaian Oven Kering (WIP)
                    </h4>
                    <div class="flex items-center gap-4">
                        <div class="flex-1">
                            <p class="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-1">Item yang Digunakan</p>
                            <p class="text-lg font-black text-slate-800 tracking-tight">${inputItem?.itemName || '-'}</p>
                        </div>
                        <div class="w-48 text-right">
                            <label class="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Total Pengeluaran Actual (Kg) <span class="text-red-500">*</span></label>
                            <input type="text" id="mo_final_input_actual" inputmode="decimal" value="${prodFmt(mo.inputQty || 0)}" oninput="formatNumericInput(this)" class="w-full border-2 border-slate-300 rounded-lg px-4 py-2 text-lg font-black text-slate-700 text-right bg-slate-50 focus:bg-white focus:border-blue-500 outline-none transition-all shadow-sm">
                        </div>
                    </div>
                </div>

                <div class="bg-white border-2 border-slate-200 border-dashed p-6 rounded-2xl relative">
                    <div class="absolute -top-3 left-6 px-3 bg-white text-[10px] font-black text-slate-400 uppercase tracking-widest border border-slate-200 rounded-full">
                        Hasil Pengepakan Sak
                    </div>
                    <div class="grid grid-cols-2 gap-6 mt-2">
                        <div class="col-span-2">
                            <label class="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Jumlah Karung (SETARA 25 KG / SAK) <span class="text-red-500">*</span></label>
                            <div class="relative">
                                <input type="text" id="mo_final_output_qty" inputmode="decimal" readonly oninput="formatNumericInput(this)" class="w-full border-b-4 border-slate-300 focus:border-blue-500 rounded-none px-0 py-2 text-3xl font-black text-slate-800 outline-none transition-all bg-slate-50/50 placeholder:text-slate-200" placeholder="0">
                                <span class="absolute right-0 bottom-2 text-xs font-black text-blue-500 bg-blue-50 px-2 py-1 rounded">HASIL BAGI-25</span>
                            </div>
                        </div>
                        <div class="col-span-2 pt-4">
                            ${baseProd ? `
                            <div class="p-4 bg-indigo-50 border-2 border-indigo-100 rounded-2xl flex items-center gap-4">
                                <div class="w-12 h-12 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-lg">
                                    <i class="fas fa-warehouse"></i>
                                </div>
                                <div>
                                    <p class="text-[10px] font-black text-indigo-400 uppercase tracking-widest">Stok Tujuan (Inventory Gudang Jadi)</p>
                                    <p class="text-sm font-black text-indigo-900">${baseProd.itemName}</p>
                                    <input type="hidden" id="mo_final_output_item" value="${baseProd.id}">
                                </div>
                            </div>` : `<div class="p-4 bg-red-50 text-red-500 rounded-xl">Error: Produk Utama tidak ditemukan.</div>`}
                        </div>
                    </div>
                </div>
            </div>`;
    }

    const moDate = new Date(mo.date || mo.createdAt).toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' });
    const mc = document.getElementById('main-content');
    document.getElementById('pageTitle').innerText = 'Laporan Hasil Produksi';
    renderBreadcrumb(['Produksi', 'Manufacturing Orders', mo.moNumber, 'Selesaikan']);

    mc.innerHTML = `
        <div class="animate-in fade-in slide-in-from-bottom-2 duration-400 -m-4 sm:-m-6 h-[calc(100vh-64px)] flex flex-col overflow-hidden bg-white">

            <!-- Sticky Action Bar -->
            <div class="sticky top-0 z-40 bg-white border-b border-slate-100 px-8 py-4 flex items-center justify-between shrink-0 shadow-sm">
                <div></div>
                <div class="flex items-center gap-3">
                    <button type="button" onclick="renderProductionMO()"
                        class="px-6 py-2.5 bg-slate-100 text-slate-500 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-200 transition-all active:scale-95">
                        Batal
                    </button>
                    <button type="button" onclick="finalizeMO('${id}')"
                        class="px-8 py-2.5 bg-green-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-green-700 transition-all shadow-lg active:scale-95 flex items-center gap-2">
                        <i class="fas fa-check-circle text-[10px]"></i> Selesaikan Produksi
                    </button>
                </div>
            </div>

            <!-- Scrollable Content -->
            <div class="flex-1 overflow-y-auto bg-slate-50/50 pb-32">
                <div class="w-full p-8 space-y-6">

                    <!-- Section 1: Info MO -->
                    <div class="bg-white rounded-3xl p-8 border border-slate-100 shadow-sm">
                        <h3 class="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] flex items-center gap-2 mb-6">
                            <i class="fas fa-info-circle text-blue-600"></i> Informasi MO
                        </h3>
                        <div class="grid grid-cols-1 sm:grid-cols-2 gap-6">
                            <div>
                                <label class="block text-sm font-semibold text-slate-600 mb-2">Tanggal MO</label>
                                <div class="w-full border-none rounded-xl px-4 py-3 bg-slate-100/80 font-bold text-slate-700">${moDate}</div>
                            </div>
                            <div>
                                <label class="block text-sm font-semibold text-slate-600 mb-2">Nomor MO</label>
                                <div class="w-full border-none rounded-xl px-4 py-3 bg-slate-100/80 font-black text-blue-600 font-mono">${mo.moNumber}</div>
                            </div>
                        </div>
                    </div>

                    <!-- Section 2: Dynamic content (Bahan / Output) -->
                    <div class="bg-white rounded-3xl p-8 border border-slate-100 shadow-sm space-y-4">
                        ${dynamicBody}
                    </div>

                    <!-- Section 3: Catatan -->
                    <div class="bg-white rounded-3xl p-8 border border-slate-100 shadow-sm">
                        <h3 class="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] flex items-center gap-2 mb-4">
                            <i class="fas fa-comment-dots text-blue-600"></i> Catatan Hasil Produksi
                        </h3>
                        <textarea id="mo_final_notes" rows="3"
                            placeholder="Punya catatan khusus? Tulis di sini bebas..."
                            class="w-full border-none rounded-xl px-4 py-3 bg-slate-100/80 text-sm text-slate-700 outline-none resize-none"></textarea>
                        <input type="hidden" id="mo_final_waste" value="0">
                        <input type="hidden" id="mo_final_qc" value="PASSED">
                    </div>

                </div>
            </div>
        </div>`;
};


window.recalcShrinkageByQty = (rawInput, stage = '') => {
    const input = typeof rawInput === 'string' ? parseFormattedNum(rawInput) : (parseFloat(rawInput) || 0);

    if (stage === 'PACKING') {
        const outEl = document.getElementById('mo_final_output_qty');
        if (outEl) {
            const sacks = Math.floor(input / 25);
            outEl.value = sacks;
        }
        return;
    }

    const rawOut = document.getElementById('mo_final_output_qty')?.value || '0';
    const out = parseFormattedNum(rawOut);
    const shrinkPctEl = document.getElementById('mo_final_shrink');
    const shrinkKgEl = document.getElementById('mo_final_shrink_kg');
    if (input > 0) {
        const kg = (input - out).toFixed(2);
        const pct = ((input - out) / input * 100).toFixed(1);
        if (shrinkKgEl) shrinkKgEl.value = prodFmt(kg);
        if (shrinkPctEl) shrinkPctEl.value = pct;
    } else {
        if (shrinkKgEl) shrinkKgEl.value = '0';
        if (shrinkPctEl) shrinkPctEl.value = '0';
    }
};

window.formatNumericInput = (el) => {
    let cursor = el.selectionStart;
    let oldLen = el.value.length;
    let raw = el.value.replace(/[^0-9,]/g, '');
    if (raw === "") { el.value = ""; return; }

    let parts = raw.split(',');
    parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ".");
    if (parts.length > 2) parts = [parts[0], parts[1]]; // Max one decimal separator

    el.value = parts.join(',');

    // Maintain cursor position
    let newLen = el.value.length;
    el.setSelectionRange(cursor + (newLen - oldLen), cursor + (newLen - oldLen));
};

window.parseFormattedNum = (val) => {
    if (!val) return 0;
    // Replace dots (thousands) with empty, then replace comma (decimal) with dot
    return parseFloat(String(val).replace(/\./g, '').replace(/,/g, '.')) || 0;
};

// Recalculate shrinkage per product row for OVEN_KERING finish form
window.recalcOKShrinkage = (idx) => {
    const row = document.querySelector(`.ok-result-row[data-tp-idx="${idx}"]`);
    if (!row) return;
    const inputQty = parseFloat(row.dataset.inputQty) || 0;
    const resultInput = row.querySelector('.ok-result-qty');
    const outputQty = parseFloat(resultInput?.value) || 0;
    const shrinkKg = Math.max(0, inputQty - outputQty).toFixed(2);
    const shrinkPct = inputQty > 0 ? ((inputQty - outputQty) / inputQty * 100).toFixed(1) : '0.0';
    const kgEl = document.getElementById(`ok_shrink_kg_${idx}`);
    const pctEl = document.getElementById(`ok_shrink_pct_${idx}`);
    if (kgEl) kgEl.textContent = shrinkKg;
    if (pctEl) pctEl.textContent = shrinkPct + '%';
};

window.finalizeMO = async (id) => {
    const mo = db.findById('productionOrders', id);
    if (!mo) return;

    let updates = {
        status: 'DONE',
        completedAt: new Date().toISOString(),
        notes: (mo.notes || '') + (document.getElementById('mo_final_notes')?.value ? '\n[FINISH]: ' + document.getElementById('mo_final_notes').value : ''),
        wasteQty: (mo.stage === 'OVEN_BASAH') ? 0 : (parseFormattedNum(document.getElementById('mo_final_waste')?.value) || 0),
        qcStatus: (mo.stage === 'OVEN_BASAH') ? 'PASSED' : (document.getElementById('mo_final_qc')?.value || 'PASSED')
    };

    if (mo.stage === 'OVEN_BASAH') {
        // --- Consume Raw Materials ---
        const actualRows = document.querySelectorAll('.mo_final_rm_actual');
        const updatedInputItems = [];
        let totalInputActual = 0;

        const rmErrors = [];
        actualRows.forEach(row => {
            const itemId = row.getAttribute('data-item-id');
            const itemName = row.getAttribute('data-item-name');
            const qtyActual = parseFormattedNum(row.value);
            if (itemId && qtyActual > 0) {
                const stock = db.getInventoryStock(itemId, 'WHS');
                if (stock < qtyActual) rmErrors.push(`${itemName}: Butuh ${qtyActual}, Sisa ${stock}`);
            }
        });
        if (rmErrors.length > 0) {
            showToast(`Stok Bahan tidak cukup: ` + rmErrors.join("; "), 'error');
            return;
        }
        actualRows.forEach(row => {
            const itemId = row.getAttribute('data-item-id');
            const itemName = row.getAttribute('data-item-name');
            const itemUnit = row.getAttribute('data-item-unit');
            const qtyActual = parseFormattedNum(row.value);
            if (itemId && qtyActual > 0) {
                updatedInputItems.push({ inventoryItemId: itemId, itemName, qty: qtyActual, unit: itemUnit });
                totalInputActual += qtyActual;
            }
        });
        updates.inputItems = updatedInputItems;
        updates.inputQty = totalInputActual;

        // --- Record Multi-Product Output ---
        const outputRows = document.querySelectorAll('.ob-output-row');
        if (outputRows.length === 0) {
            showToast('Tambahkan minimal 1 produk hasil Oven Basah!', 'error');
            return;
        }

        const outputProducts = [];
        const outErrors = [];
        outputRows.forEach((row, i) => {
            const itemId = row.querySelector('.ob-out-item')?.value;
            const qty = parseFormattedNum(row.querySelector('.ob-out-qty')?.value);
            const itemName = db.findById('inventoryItems', itemId)?.itemName || '';
            if (!itemId) { outErrors.push(`Baris ${i + 1}: Pilih produk`); return; }
            if (qty <= 0) { outErrors.push(`Baris ${i + 1}: Isi Qty hasil (Kg)`); return; }
            outputProducts.push({ itemId, itemName, qty });
        });
        if (outErrors.length > 0) {
            showToast(outErrors.join(' | '), 'error');
            return;
        }

        let totalOutputActual = outputProducts.reduce((sum, p) => sum + p.qty, 0);
        updates.outputQty = totalOutputActual;
        updates.outputSacks = totalOutputActual;
        updates.outputItemId = outputProducts[0]?.itemId || '';
        updates.outputProducts = outputProducts; // Save multi-product list to MO record

    } else if (mo.stage === 'OVEN_KERING') {
        const tpList = mo.targetProducts || [];
        const resultInputs = document.querySelectorAll('.ok-result-qty');
        
        let totalInputActual = 0;
        let totalOutputActual = 0;
        let totalShrinkageKg = 0;
        
        const outErrors = [];
        const completedProducts = [];
        
        tpList.forEach((tp, idx) => {
            const inputQty = tp.qty;
            const outputQty = parseFormattedNum(resultInputs[idx]?.value);
            if (outputQty <= 0) {
                outErrors.push(`Baris ${idx + 1}: Isi Hasil Setelah Oven (Kg)`);
            } else if (outputQty > inputQty) {
                outErrors.push(`Baris ${idx + 1}: Hasil melebihi Qty Masuk`);
            }
            totalInputActual += inputQty;
            totalOutputActual += outputQty;
            const shrink = Math.max(0, inputQty - outputQty);
            totalShrinkageKg += shrink;
            completedProducts.push({ ...tp, outputQty, shrinkageKg: shrink });
        });
        
        if (outErrors.length > 0) {
            showToast(outErrors.join(' | '), 'error');
            return;
        }

        const rmErrors = [];
        tpList.forEach(tp => {
            const wipItemId = db.ensureWIPItem(tp.itemId, 'Oven Basah', true);
            const wipStock = db.getInventoryStock(wipItemId, 'OVEN_BASAH');
            if (wipStock < tp.qty) {
                rmErrors.push(`Stok WIP Oven Basah untuk ${tp.itemName} tidak cukup (Sisa: ${prodFmt(wipStock)} Kg)`);
            }
        });
        if (rmErrors.length > 0) {
            showToast(rmErrors.join(' | '), 'error');
            return;
        }

        updates.inputQty = totalInputActual;
        updates.outputQty = totalOutputActual;
        updates.shrinkageKg = totalShrinkageKg;
        updates.shrinkagePct = totalInputActual > 0 ? (totalShrinkageKg / totalInputActual) * 100 : 0;
        updates.targetProducts = completedProducts;

    } else if (mo.stage === 'PACKING') {
        const inputQtyActual = parseFormattedNum(document.getElementById('mo_final_input_actual')?.value);
        const outputQty = parseFormattedNum(document.getElementById('mo_final_output_qty')?.value);
        const outputItemId = document.getElementById('mo_final_output_item')?.value;

        if (inputQtyActual <= 0) { showToast('Masukkan Qty bahan yang DI AMBIL/DIPAKAI', 'error'); return; }
        if (outputQty <= 0) { showToast('Masukkan Qty output hasil nyata', 'error'); return; }
        if (!outputItemId) { showToast('Pilih item stok tujuan', 'error'); return; }

        updates.inputQty = inputQtyActual;
        updates.outputQty = inputQtyActual; // Record Kg as the primary output for stock
        updates.outputSacks = outputQty; // Store Sack count as metadata
        updates.outputItemId = outputItemId;

        // Validation for input stock
        if (mo.inputItemId) {
            const srcLoc = 'OVEN_KERING';
            const stock = db.getInventoryStock(mo.inputItemId, srcLoc);
            if (stock < inputQtyActual) {
                showToast(`Stok ${mo.productName || 'Input'} di ${srcLoc} tidak cukup! (Sisa: ${prodFmt(stock)}, Butuh: ${prodFmt(inputQtyActual)})`, 'error');
                return;
            }
        }

        updates.shrinkagePct = 0;
        updates.shrinkageKg = 0;
    }

    try {
        await api.completeProductionOrder(id, updates);
        showToast(`Produksi ${mo.moNumber} selesai!`, 'success');
        // Navigate back to MO list and keep it visible
        window._prodSearchPerformed = true;
        const todayStr3 = new Date().toISOString().split('T')[0];
        if (!window._prodFilters) window._prodFilters = {};
        if (!window._prodFilters.end || window._prodFilters.end < todayStr3) window._prodFilters.end = todayStr3;
        renderProductionMO();
    } catch (err) {
        showToast(err.message, 'error');
    }
};

// --- HELPERS -------------------------------------------------

window.addMOTargetProductRow = (stageOrPresetId = '', presetName = '', presetId = '') => {
    // Support old call signature: addMOTargetProductRow(presetId, presetName)
    // New call: addMOTargetProductRow(stage) or addMOTargetProductRow(stage, '', presetId)
    let stage = document.getElementById('mo_stage')?.value || 'OVEN_BASAH';
    // If first arg is a stage key, use it; otherwise treat as presetId (backward compat)
    const stageKeys = ['OVEN_BASAH', 'OVEN_KERING', 'MIXING', 'PACKING'];
    if (stageKeys.includes(stageOrPresetId)) {
        stage = stageOrPresetId;
    } else if (stageOrPresetId) {
        presetId = stageOrPresetId;
    }

    const container = document.getElementById('mo_target_product_rows');
    const emptyMsg = document.getElementById('mo_target_empty_msg');
    if (!container) return;

    const isOvenKering = stage === 'OVEN_KERING';

    // Filter machines: OVEN_KERING shows only OVEN-type; OVEN_BASAH shows non-OVEN machines
    const allMachines = (db.read('machines') || []).filter(m => {
        const t = (m.type || '').toUpperCase();
        const s = (m.status || 'ACTIVE');
        if (s === 'INACTIVE') return false;
        if (isOvenKering) return t === 'OVEN' || t === 'OVEN_KERING';
        return t !== 'OVEN' && t !== 'OVEN_BASAH' && t !== 'OVEN_KERING';
    });

    const machineLabel = isOvenKering ? 'Pilih Oven' : 'Pilih Mesin';
    const machineItemsHtml = allMachines.length > 0
        ? allMachines.map(m => `
            <label class="mo-tp-mch-label flex items-center gap-2 px-3 py-2 cursor-pointer hover:bg-blue-50 rounded-lg transition-all">
                <input type="checkbox" class="mo-tp-mch accent-blue-600 w-3.5 h-3.5 shrink-0" value="${m.id}" data-machine-name="${m.name}" onchange="onMOProductMachineChange(this)">
                <span class="text-xs font-bold text-slate-700 uppercase">${m.name}</span>
            </label>`).join('')
        : `<p class="text-[11px] text-slate-300 italic px-3 py-2">Tidak ada ${machineLabel.toLowerCase()} tersedia</p>`;

    const rowId = 'tp_' + Date.now() + '_' + Math.random().toString(36).slice(2, 5);

    const div = document.createElement('div');
    div.className = 'mo-tp-row flex items-center gap-2 bg-white p-2 rounded-xl border border-slate-200 hover:border-slate-300 transition-all';
    div.innerHTML = `
        <!-- Product search input -->
        <div class="relative flex-1 min-w-0">
            <input type="text" id="mo_product_display_${rowId}"
                placeholder="-- Klik untuk pilih produk --" readonly
                onclick="toggleMOProductDropdown('${rowId}')"
                class="w-full border border-slate-200 rounded-lg px-3 py-2 text-xs font-bold text-slate-800 bg-slate-50 outline-none cursor-pointer hover:bg-white hover:border-blue-300 transition-all">
            <input type="hidden" class="mo-tp-item-id" id="mo_tp_id_${rowId}">
            <input type="hidden" class="mo-tp-item-name" id="mo_tp_name_${rowId}">
            <div id="mo_product_dropdown_${rowId}"
                class="hidden absolute left-0 top-full mt-1.5 w-full min-w-[280px] bg-white border border-slate-100 rounded-2xl shadow-2xl z-[200] overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                <div class="p-3 border-b border-slate-50">
                    <input type="text" id="mo_product_search_${rowId}"
                        placeholder="Ketik kode atau nama..."
                        oninput="filterMOProductList('${rowId}', this.value)"
                        class="w-full px-3 py-2 bg-slate-50 border-none rounded-lg text-xs font-bold outline-none focus:ring-2 focus:ring-blue-500/20">
                </div>
                <div class="max-h-56 overflow-y-auto p-1" id="mo_product_list_${rowId}"></div>
            </div>
        </div>

        <!-- QTY input -->
        <input type="number" class="mo-tp-qty shrink-0 w-24 border-2 border-slate-200 rounded-lg px-2 py-2 text-sm font-black text-center text-slate-800 outline-none focus:border-blue-400 transition-all" placeholder="0 Kg" min="0" step="0.1">

        <!-- Machine dropdown -->
        <div class="relative shrink-0" id="${rowId}_wrap">
            <button type="button"
                onclick="toggleMOProductMachineDropdown('${rowId}')"
                class="mo-tp-mch-btn flex items-center gap-2 px-3 py-2 rounded-lg border-2 border-slate-200 bg-slate-50 hover:border-blue-400 hover:bg-blue-50 text-slate-500 text-xs font-black transition-all whitespace-nowrap">
                <i class="fas fa-${isOvenKering ? 'fire' : 'cogs'} text-slate-400 text-[10px]"></i>
                <span class="mo-tp-mch-label-text">${machineLabel}</span>
                <i class="fas fa-chevron-down text-[9px] text-slate-300"></i>
            </button>
            <div id="${rowId}_dropdown"
                class="mo-tp-mch-dropdown hidden absolute right-0 top-full mt-1.5 z-50 bg-white border border-slate-200 rounded-xl shadow-2xl p-2 min-w-[180px] max-h-[240px] overflow-y-auto">
                <p class="text-[9px] font-black text-slate-300 uppercase tracking-widest px-2 pb-1.5 mb-1 border-b border-slate-50">${machineLabel}</p>
                ${machineItemsHtml}
            </div>
        </div>

        <button type="button"
            onclick="this.closest('.mo-tp-row').remove(); onMOProductMachineChange(null); if(!document.querySelector('.mo-tp-row')) document.getElementById('mo_target_empty_msg')?.classList.remove('hidden')"
            class="w-7 h-7 rounded-lg bg-red-50 text-red-400 hover:bg-red-500 hover:text-white transition-all flex items-center justify-center shrink-0">
            <i class="fas fa-times text-[10px]"></i>
        </button>`;

    container.appendChild(div);

    // If preset given, pre-fill
    if (presetId) {
        const hiddenId = div.querySelector('.mo-tp-item-id');
        const hiddenName = div.querySelector('.mo-tp-item-name');
        const display = div.querySelector(`#mo_product_display_${rowId}`);
        if (hiddenId) hiddenId.value = presetId;
        if (hiddenName) hiddenName.value = presetName;
        if (display) display.value = presetName;
    }

    if (emptyMsg) emptyMsg.classList.add('hidden');
    onMOProductMachineChange(null);
};

// ── Product search dropdown helpers for MO form ──────────────────────────

window.toggleMOProductDropdown = (rowId) => {
    const dropdown = document.getElementById('mo_product_dropdown_' + rowId);
    if (!dropdown) return;
    const isOpen = !dropdown.classList.contains('hidden');

    // Close all MO product & machine dropdowns
    document.querySelectorAll('[id^="mo_product_dropdown_"]').forEach(d => d.classList.add('hidden'));
    document.querySelectorAll('.mo-tp-mch-dropdown').forEach(d => d.classList.add('hidden'));

    if (!isOpen) {
        dropdown.classList.remove('hidden');
        const search = document.getElementById('mo_product_search_' + rowId);
        if (search) { search.value = ''; search.focus(); }
        filterMOProductList(rowId, '');

        const closeHandler = (e) => {
            if (!dropdown.parentElement?.contains(e.target)) {
                dropdown.classList.add('hidden');
                document.removeEventListener('click', closeHandler);
            }
        };
        setTimeout(() => document.addEventListener('click', closeHandler), 10);
    }
};

window.filterMOProductList = (rowId, val) => {
    const container = document.getElementById('mo_product_list_' + rowId);
    if (!container) return;
    const search = val.toLowerCase();
    const allItems = db.read('inventoryItems') || [];
    const products = allItems.filter(i => i.category === 'FINISHED_GOODS' && i.status !== 'INACTIVE');

    const filtered = products.filter(p =>
        !search ||
        (p.itemName || '').toLowerCase().includes(search) ||
        (p.itemCode || '').toLowerCase().includes(search)
    );

    const stage = document.getElementById('mo_stage')?.value;
    const stageInfo = PROD_STAGES.find(s => s.key === stage) || { key: stage, inputFrom: 'RAW_MATERIAL' };

    container.innerHTML = filtered.map(p => {
        let displayStock = db.getInventoryStock(p.id);
        let stockLabel = 'Stock FG';
        let stockColor = 'text-blue-500';
        
        let displayItemName = p.itemName;
        let displayItemCode = p.itemCode || '-';
        
        if (stageInfo.inputFrom !== 'RAW_MATERIAL') {
            const inputStageLabel = PROD_STAGES.find(s => s.key === stageInfo.inputFrom)?.label || stageInfo.inputFrom;
            const inputItemId = db.ensureWIPItem(p.id, inputStageLabel, false);
            if (inputItemId) {
                const wipItem = db.findById('inventoryItems', inputItemId);
                if (wipItem) {
                    displayItemName = wipItem.itemName;
                    displayItemCode = wipItem.itemCode || '-';
                }
                displayStock = db.getInventoryStock(inputItemId);
                stockLabel = `Stok WIP (${inputStageLabel})`;
            } else {
                displayStock = 0;
                stockLabel = `Stok WIP (${inputStageLabel})`;
                displayItemName = `${p.itemName} (${inputStageLabel})`;
                displayItemCode = 'BELUM ADA';
            }
            stockColor = displayStock > 0 ? 'text-emerald-600' : 'text-rose-500';
        }
        
        const name = (p.itemName || '').replace(/'/g, "\\'");
        return `
            <div onclick="selectMOProduct('${rowId}', '${p.id}', '${name}')"
                class="px-4 py-3 rounded-xl cursor-pointer hover:bg-slate-50 transition-colors m-0.5 border border-transparent hover:border-slate-200">
                <div class="flex justify-between items-center">
                    <div class="flex flex-col gap-0.5">
                        <span class="text-sm font-bold text-slate-800">${displayItemName}</span>
                        <span class="text-[9px] text-slate-400 uppercase font-black tracking-widest">${displayItemCode}</span>
                    </div>
                    <div class="text-[9px] ${stockColor} font-black uppercase text-right leading-tight">${stockLabel}<br><span class="text-xs">${prodFmt(displayStock)} Kg</span></div>
                </div>
            </div>`;
    }).join('') || '<div class="px-5 py-8 text-center text-[10px] font-bold text-slate-300 italic uppercase tracking-widest">Produk tidak ditemukan</div>';
};

window.selectMOProduct = (rowId, itemId, itemName) => {
    if (rowId === 'single') {
        const display = document.getElementById('mo_product_display_single');
        const hiddenId = document.getElementById('mo_product_id');
        const hiddenName = document.getElementById('mo_product');
        if (display) display.value = itemName;
        if (hiddenId) hiddenId.value = itemId;
        if (hiddenName) hiddenName.value = itemName;
    } else {
        const display = document.getElementById('mo_product_display_' + rowId);
        const hiddenId = document.getElementById('mo_tp_id_' + rowId);
        const hiddenName = document.getElementById('mo_tp_name_' + rowId);
        if (display) display.value = itemName;
        if (hiddenId) hiddenId.value = itemId;
        if (hiddenName) hiddenName.value = itemName;
    }
    const dropdown = document.getElementById('mo_product_dropdown_' + rowId);
    if (dropdown) dropdown.classList.add('hidden');

    // Auto-update form untuk merefresh tampilan Material Input WIP (stok dll)
    if (window.updateMOForm) {
        window.updateMOForm();
    }
};

window.toggleMOProductMachineDropdown = (rowId) => {
    const dropdown = document.getElementById(rowId + '_dropdown');
    if (!dropdown) return;
    const isOpen = !dropdown.classList.contains('hidden');
    document.querySelectorAll('.mo-tp-mch-dropdown').forEach(d => d.classList.add('hidden'));
    document.querySelectorAll('[id^="mo_product_dropdown_"]').forEach(d => d.classList.add('hidden'));
    if (!isOpen) dropdown.classList.remove('hidden');
};

// Close dropdowns on outside click
if (!window._moMchDropdownListenerAdded) {
    window._moMchDropdownListenerAdded = true;
    document.addEventListener('click', (e) => {
        if (!e.target.closest('.mo-tp-mch-dropdown') && !e.target.closest('.mo-tp-mch-btn') &&
            !e.target.closest('[id^="mo_product_dropdown_"]') && !e.target.closest('[id^="mo_product_display_"]')) {
            document.querySelectorAll('.mo-tp-mch-dropdown').forEach(d => d.classList.add('hidden'));
            document.querySelectorAll('[id^="mo_product_dropdown_"]').forEach(d => d.classList.add('hidden'));
        }
    });
}

// Mutual exclusion: a machine checked in one row is disabled in all other rows
window.onMOProductMachineChange = (changedCb) => {
    const allRows = document.querySelectorAll('.mo-tp-row');
    const checkedIds = new Set();
    allRows.forEach(row => {
        row.querySelectorAll('.mo-tp-mch:checked').forEach(cb => checkedIds.add(cb.value));
    });
    allRows.forEach(row => {
        const rowChecked = [];
        row.querySelectorAll('.mo-tp-mch').forEach(cb => {
            const isCheckedInThisRow = cb.checked;
            if (isCheckedInThisRow) rowChecked.push(cb.dataset.machineName || cb.value);
            if (!isCheckedInThisRow && checkedIds.has(cb.value)) {
                cb.disabled = true;
                cb.closest('label').classList.add('opacity-40', 'cursor-not-allowed', 'pointer-events-none');
            } else {
                cb.disabled = false;
                cb.closest('label').classList.remove('opacity-40', 'cursor-not-allowed', 'pointer-events-none');
            }
        });
        const labelEl = row.querySelector('.mo-tp-mch-label-text');
        if (labelEl) {
            if (rowChecked.length === 0) {
                labelEl.textContent = 'Pilih Mesin';
                row.querySelector('.mo-tp-mch-btn')?.classList.remove('border-blue-500', 'bg-blue-50', 'text-blue-700');
                row.querySelector('.mo-tp-mch-btn')?.classList.add('border-slate-200', 'bg-slate-50', 'text-slate-500');
            } else {
                labelEl.textContent = rowChecked.join(', ');
                row.querySelector('.mo-tp-mch-btn')?.classList.add('border-blue-500', 'bg-blue-50', 'text-blue-700');
                row.querySelector('.mo-tp-mch-btn')?.classList.remove('border-slate-200', 'bg-slate-50', 'text-slate-500');
            }
        }
    });
};



window.addOvenBasahOutputRow = () => {
    const container = document.getElementById('ob_output_rows');
    const tpl = document.getElementById('ob_row_tpl');
    const emptyMsg = document.getElementById('ob_empty_msg');
    if (!container || !tpl) return;

    const clone = tpl.content.cloneNode(true);
    container.appendChild(clone);

    if (emptyMsg) emptyMsg.classList.add('hidden');
};

window.addRMRowMO = (itemId = '', qty = 0, location = 'GUDANG') => {
    const list = document.getElementById('mo_rm_list');
    const optsEl = document.getElementById('mo_rm_opts');
    if (!list || !optsEl) return;
    const div = document.createElement('div');
    div.className = 'flex items-center gap-2';
    div.innerHTML = `
        <select class="mo_rm_location w-24 border border-gray-300 rounded-lg px-2 py-2 text-[10px] font-black text-indigo-600 bg-white uppercase">
            <option value="GUDANG" ${location === 'GUDANG' ? 'selected' : ''}>Gudang</option>
            <option value="BUMBU" ${location === 'BUMBU' ? 'selected' : ''}>Bumbu</option>
        </select>
        <select class="mo_rm_item flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white">${optsEl.innerHTML}</select>
        <input type="number" class="mo_rm_qty w-28 border border-gray-300 rounded-lg px-3 py-2 text-sm" min="0.01" step="0.01" placeholder="Qty" value="${qty || ''}">
        <button type="button" onclick="this.parentElement.remove()" class="text-red-400 hover:text-red-600 px-2"><i class="fas fa-times"></i></button>`;
    list.appendChild(div);
    if (itemId) div.querySelector('.mo_rm_item').value = itemId;
};

window.loadBOMMaterialsToMO = () => {
    const bomId = document.getElementById('mo_bom_id')?.value;
    if (!bomId) return;

    // Auto fill name
    const bom = db.findById('bomHeaders', bomId);
    if (bom) {
        document.getElementById('mo_product').value = bom.name;
    }

    // Auto fill materials
    const allMaterials = db.read('bomMaterials') || [];
    const materials = allMaterials.filter(m => m.bomHeaderId === bomId);

    const list = document.getElementById('mo_rm_list');
    if (list) {
        if (materials.length > 0) {
            list.innerHTML = '';
            materials.forEach(m => {
                addRMRowMO(m.itemId, m.qty, m.location || 'GUDANG');
            });
            showToast(`${materials.length} Bahan baku otomatis dimuat dari resep`, 'success');
        } else {
            showToast('Resep ini tidak memiliki daftar bahan baku', 'warning');
        }
    }
};

window.addFGRowMO = () => {
    const list = document.getElementById('mo_fg_list');
    const optsEl = document.getElementById('mo_fg_opts');
    if (!list) return;
    const div = document.createElement('div');
    div.className = 'flex items-center gap-2';
    const fgOpts = optsEl ? optsEl.innerHTML : '';
    div.innerHTML = `
        <select class="mo_fg_item flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white"><option value="">-- Pilih SKU --</option>${fgOpts}</select>
        <input type="number" class="mo_fg_qty w-28 border border-gray-300 rounded-lg px-3 py-2 text-sm" min="0.01" step="0.01" placeholder="Qty">
        <button type="button" onclick="this.parentElement.remove()" class="text-red-400 hover:text-red-600 px-2"><i class="fas fa-times"></i></button>`;
    list.appendChild(div);
};

window.viewProductionMO = (id) => {
    const mo = db.findById('productionOrders', id);
    if (!mo) return;
    let detailRows = '';
    if (mo.stage === 'OVEN_BASAH' && mo.inputItems) {
        detailRows = `<div><h4 class="text-xs font-bold text-gray-500 uppercase mb-2">Bahan Baku</h4>` + mo.inputItems.map(i => `<div class="flex justify-between text-sm py-1 border-b border-gray-50"><span>${i.itemName}</span><span class="font-bold">${prodFmt(i.qty)} ${i.unit}</span></div>`).join('') + `</div>`;
    } else if (mo.stage === 'FINISH_GOOD' && mo.fgItems) {
        detailRows = `<div><h4 class="text-xs font-bold text-gray-500 uppercase mb-2">Output SKU</h4>` + mo.fgItems.map(i => `<div class="flex justify-between text-sm py-1 border-b border-gray-50 text-green-700"><span>${i.itemName}</span><span class="font-bold">+${prodFmt(i.qty)} ${i.unit || 'Kg'}</span></div>`).join('') + `</div>`;
    }

    const body = `
    <div class="space-y-4">
        <div class="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
            <div><span class="text-gray-400">No. MO:</span> <strong class="font-mono">${mo.moNumber}</strong></div>
            <div><span class="text-gray-400">Status:</span> <span class="px-2 py-0.5 rounded text-[10px] font-bold ${prodStatusColor(mo.status)}">${mo.status}</span></div>
            <div><span class="text-gray-400">Tahap:</span> <span class="px-2 py-0.5 rounded text-[10px] font-bold ${prodStageColor(mo.stage)}">${prodStageLabel(mo.stage)}</span></div>
            <div><span class="text-gray-400">Produk:</span> <strong>${mo.productName}</strong></div>
            <div><span class="text-gray-400">Tgl Mulai:</span> ${prodDate(mo.date)}</div>
            <div><span class="text-gray-400">Tgl Selesai:</span> ${prodDate(mo.completedAt)}</div>
            <div><span class="text-gray-400">Total Input:</span> <strong>${prodFmt(mo.inputQty)} Kg</strong></div>
            <div class="col-span-2">
                <span class="text-gray-400">Total Output:</span>
                ${mo.status === 'DONE'
            ? (mo.outputProducts && mo.outputProducts.length > 0
                ? `<div class="mt-1 space-y-1">${mo.outputProducts.map(op => `<div class="flex items-center gap-2 text-xs"><span class="w-2 h-2 rounded-full bg-green-400 inline-block"></span><strong class="text-slate-700">${op.itemName}</strong><span class="text-green-600 font-black ml-auto">${prodFmt(op.qty)} Krg</span></div>`).join('')}</div>`
                : `<strong class="text-green-600">${prodFmt(mo.outputQty)} Krg</strong>`)
            : '<span class="text-slate-400">-</span>'}
            </div>
            ${mo.shrinkagePct > 0 ? `<div><span class="text-gray-400">Penyusutan:</span> <strong class="text-orange-600">${mo.shrinkagePct}%</strong></div>` : ''}
        </div>
        ${detailRows ? `<div class="bg-gray-50 p-4 rounded-xl border border-gray-100">${detailRows}</div>` : ''}
        ${mo.notes ? `<div class="bg-blue-50 p-3 rounded-lg text-xs text-blue-700 whitespace-pre-wrap flex items-start gap-2"><i class="fas fa-info-circle mt-0.5"></i><div>${mo.notes}</div></div>` : ''}
    </div>`;
    showModal(`Detail MO - ${mo.moNumber}`, body, `<button onclick="closeModal()" class="btn-secondary">Tutup</button>`);
};

window.deleteMO = async (id) => {
    const mo = db.findById('productionOrders', id);
    if (!mo) return;
    if (!confirm(`Hapus MO ${mo.moNumber}? Catatan: Stok bahan yang sudah dikurangi saat Start TIDAK akan otomatis dikembalikan. Lakukan penyusuaian stok manual jika perlu.`)) return;
    
    try {
        await api.deleteProductionOrder(id);
        showToast('MO berhasil dihapus', 'success');
        renderProductionMO();
    } catch (err) {
        showToast(err.message, 'error');
    }
};

// â”€â”€â”€ LAPORAN PRODUKSI â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
window.renderProductionReports = () => {
    document.getElementById('pageTitle').innerText = 'Laporan Tren Output Produksi';
    const mainContent = document.getElementById('main-content');
    const currentYear = new Date().getFullYear();

    mainContent.innerHTML = `
        <div class="font-sans bg-white animate-in fade-in duration-500 rounded-2xl border border-slate-200 shadow-sm overflow-hidden mb-12">
            <!-- Header Filter (ERPNext Style) -->
            <div class="flex flex-wrap items-center gap-3 px-6 py-6 border-b border-slate-100 bg-white shrink-0">
                <div class="flex items-center bg-slate-100 rounded-lg p-1 border border-slate-200">
                    <select id="pr_period" onchange="updateProductionReports()"
                        class="bg-transparent border-none px-3 py-1.5 text-[13px] font-bold text-slate-700 focus:outline-none cursor-pointer outline-none">
                        <option value="Monthly" selected>Monthly</option>
                        <option value="Quarterly">Quarterly</option>
                        <option value="Half-Yearly">Half-Yearly</option>
                        <option value="Yearly">Yearly</option>
                    </select>
                </div>

                <div class="flex items-center bg-slate-100 rounded-lg p-1 border border-slate-200">
                    <select id="pr_based_on" onchange="updateProductionReports()"
                        class="bg-transparent border-none px-3 py-1.5 text-[13px] font-bold text-slate-700 focus:outline-none cursor-pointer outline-none">
                        <option value="Item">Berdasarkan Produk</option>
                        <option value="Stage">Berdasarkan Tahapan</option>
                    </select>
                </div>

                <div class="flex items-center bg-slate-100 rounded-lg p-1 border border-slate-200">
                    <input type="number" id="pr_year" value="${currentYear}" onchange="updateProductionReports()"
                        class="bg-transparent border-none px-3 py-1.5 text-[13px] font-bold text-slate-700 focus:outline-none outline-none w-20 text-center">
                </div>

                <div class="flex-1"></div>
                
                <button onclick="exportProductionReportsCsv()" class="bg-white border border-slate-300 rounded-xl px-5 py-2.5 text-[11px] font-black uppercase tracking-widest text-slate-700 transition-all hover:bg-slate-50 hover:border-slate-400 shadow-sm flex items-center gap-2 active:scale-95">
                    <i class="fas fa-file-export text-xs text-slate-500"></i> Ekspor CSV
                </button>
            </div>
            
            <!-- Metadata Info -->
            <div class="px-6 mt-6 mb-4 text-[12px] text-blue-700 font-bold flex items-center gap-2">
                <div class="w-2.5 h-2.5 rounded-full bg-blue-600 animate-pulse shadow-[0_0_8px_rgba(59,130,246,0.5)]"></div>
                Laporan ini menampilkan tren output produksi dalam satuan Kilogram (KG).
            </div>

            <!-- Chart Section -->
            <div class="bg-white px-8 pt-6 pb-12 border-b border-slate-100 relative">
                <div style="height: 320px;">
                    <canvas id="pr_chart"></canvas>
                </div>
            </div>

            <!-- Table Section -->
            <div class="overflow-x-auto bg-white">
                <table class="w-full text-left border-collapse" id="pr_table">
                    <thead class="bg-slate-50 border-b border-slate-200">
                        <tr id="pr_thead" class="text-[11px] font-black text-slate-500 uppercase tracking-widest"></tr>
                    </thead>
                    <tbody id="pr_tbody" class="divide-y divide-slate-100 text-[13px] text-slate-800"></tbody>
                </table>
            </div>
            
            <!-- Footer -->
            <div class="px-6 py-6 bg-slate-50 border-t border-slate-100 shrink-0 flex justify-between items-center w-full">
                <p class="text-[11px] text-slate-500 font-medium italic">Data bersumber dari Manufacturing Orders (MO) dengan status 'DONE'.</p>
                <p class="text-[11px] font-black text-slate-400 tracking-tighter uppercase">Execution Time: ${(Math.random() * 0.05 + 0.01).toFixed(6)} sec</p>
            </div>
        </div>
    `;
    updateProductionReports();
};

window.updateProductionReports = () => {
    const year      = parseInt(document.getElementById('pr_year')?.value || new Date().getFullYear());
    const basedOn   = document.getElementById('pr_based_on')?.value || 'Item';
    const period    = document.getElementById('pr_period')?.value || 'Monthly';
    
    let labels = [];
    if (period === 'Monthly') labels = ['Jan','Feb','Mar','Apr','Mei','Jun','Jul','Agu','Sep','Okt','Nov','Des'];
    else if (period === 'Quarterly') labels = ['Q1', 'Q2', 'Q3', 'Q4'];
    else if (period === 'Half-Yearly') labels = ['H1', 'H2'];
    else if (period === 'Yearly') labels = [year.toString()];
    
    const mos = (db.read('productionOrders') || []).filter(mo => {
        if (mo.status !== 'DONE') return false;
        const d = new Date(mo.completedAt || mo.date || mo.createdAt);
        return d.getFullYear() === year;
    });

    const pivot = {};
    const chartData = Array(labels.length).fill(0);

    mos.forEach(mo => {
        const date = new Date(mo.completedAt || mo.date || mo.createdAt);
        const monthIdx = date.getMonth();
        let pIdx = 0;
        
        if (period === 'Monthly') pIdx = monthIdx;
        else if (period === 'Quarterly') pIdx = Math.floor(monthIdx / 3);
        else if (period === 'Half-Yearly') pIdx = Math.floor(monthIdx / 6);
        else if (period === 'Yearly') pIdx = 0;

        chartData[pIdx] += (mo.outputQty || 0);

        let key, label;
        if (basedOn === 'Item') {
            // Robust name detection
            const bestName = mo.productName || 
                            (mo.outputProducts && mo.outputProducts.length > 0 ? mo.outputProducts[0].itemName : null) ||
                            (mo.targetProducts && mo.targetProducts.length > 0 ? mo.targetProducts[0].itemName : null) ||
                            (mo.outputItemId ? db.findById('inventoryItems', mo.outputItemId)?.itemName : null) ||
                            'Produk #' + (mo.productId || mo.id).slice(0,8);
            
            key = mo.productId || mo.outputItemId || bestName;
            label = bestName;
        } else {
            key = mo.stage || 'Unknown';
            label = prodStageLabel(mo.stage);
        }

        if (!pivot[key]) {
            pivot[key] = { label, periods: Array(labels.length).fill(0) };
        }
        pivot[key].periods[pIdx] += (mo.outputQty || 0);
    });

    // Draw Chart
    const ctx = document.getElementById('pr_chart');
    if (ctx) {
        if (window._prChart) window._prChart.destroy();
        window._prChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Output Produksi (KG)',
                    data: chartData,
                    borderColor: '#3b82f6', // blue-500
                    backgroundColor: 'rgba(59, 130, 246, 0.05)',
                    fill: true,
                    tension: 0.4,
                    pointRadius: 0,
                    pointHoverRadius: 6,
                    pointHoverBackgroundColor: '#3b82f6',
                    pointHoverBorderColor: '#fff',
                    pointHoverBorderWidth: 2,
                    borderWidth: 2,
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                interaction: { mode: 'index', intersect: false },
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        backgroundColor: '#1e293b',
                        titleFont: { size: 11, weight: 'bold' },
                        bodyFont: { size: 13, weight: '900' },
                        padding: 10,
                        cornerRadius: 8,
                        callbacks: {
                            label: c => ' Output: ' + prodFmt(c.parsed.y) + ' KG'
                        }
                    }
                },
                scales: {
                    x: { grid: { display: false }, ticks: { color: '#94a3b8', font: { size: 10, weight: 'bold' } } },
                    y: {
                        beginAtZero: true,
                        grid: { color: '#f1f5f9', strokeDashArray: [4, 4] },
                        border: { display: false },
                        ticks: {
                            color: '#94a3b8', font: { size: 10, weight: 'bold' },
                            callback: v => prodFmt(v) + ' KG'
                        }
                    }
                }
            }
        });
    }

    // Header Table
    const thead = document.getElementById('pr_thead');
    if (thead) {
        thead.innerHTML = `
            <th class="w-14 px-4 py-4 border-r border-slate-200 text-center text-gray-500">#</th>
            <th class="min-w-[240px] px-6 py-4 border-r border-slate-200">${basedOn === 'Item' ? 'Item' : 'Tahapan'}</th>
            <th class="px-4 py-4 border-r border-slate-200 text-center">Unit</th>
            ${labels.map(p => `<th class="px-4 py-4 border-r border-slate-200 text-right">${p}</th>`).join('')}
            <th class="px-6 py-4 text-right font-bold">Total (KG)</th>
        `;
    }

    // Body Table
    const tbody = document.getElementById('pr_tbody');
    if (tbody) {
        const rows = Object.values(pivot).sort((a,b) => {
            const sumA = a.periods.reduce((s,v) => s + (parseFloat(v) || 0), 0);
            const sumB = b.periods.reduce((s,v) => s + (parseFloat(v) || 0), 0);
            return sumB - sumA;
        });
        
        let htmlRows = '';
        if (rows.length === 0) {
            htmlRows = `<tr><td colspan="${4 + labels.length}" class="text-center text-slate-400 py-20 italic font-medium">Belum ada data produksi yang selesai pada tahun ${year}</td></tr>`;
        } else {
            for (let i = 0; i < rows.length; i++) {
                const row = rows[i];
                let rowTotal = 0;
                let monthCells = '';
                
                for (let j = 0; j < row.periods.length; j++) {
                    const val = parseFloat(row.periods[j]) || 0;
                    rowTotal += val;
                    monthCells += `<td class="px-4 py-4 border-r border-slate-200 text-right ${val > 0 ? 'text-gray-900 font-medium' : 'text-gray-300'}">${val > 0 ? prodFmt(val) : '0'}</td>`;
                }
                
                htmlRows += `
                <tr class="hover:bg-gray-50 transition-colors border-b border-slate-100">
                    <td class="px-4 py-6 border-r border-slate-200 text-center text-gray-400 text-sm font-medium">${i + 1}</td>
                    <td class="px-6 py-6 border-r border-slate-200 text-gray-900 font-bold text-base">${row.label || 'Produk Tanpa Nama'}</td>
                    <td class="px-4 py-6 border-r border-slate-200 text-center text-gray-500 font-bold">KG</td>
                    ${monthCells}
                    <td class="px-6 py-6 text-right font-black text-slate-900 bg-slate-50/50 text-base border-l border-slate-200">${prodFmt(rowTotal)}</td>
                </tr>`;
            }
        }
        tbody.innerHTML = htmlRows;

        // Grand Total Row
        if (rows.length > 0) {
            const footerTotal = Array(labels.length).fill(0);
            rows.forEach(r => r.periods.forEach((v, i) => footerTotal[i] += (parseFloat(v) || 0)));
            const grandTotal = footerTotal.reduce((s, v) => s + v, 0);

            const trTotal = document.createElement('tr');
            trTotal.className = 'bg-slate-50 border-t-2 border-slate-300 font-black';
            trTotal.innerHTML = `
                <td colspan="2" class="px-6 py-8 border-r border-slate-200 text-left font-black text-lg text-slate-800">TOTAL AKHIR</td>
                <td class="px-4 py-8 border-r border-slate-200"></td>
                ${footerTotal.map(v => `<td class="px-4 py-8 border-r border-slate-200 text-right font-black text-slate-900">${prodFmt(v)}</td>`).join('')}
                <td class="px-6 py-8 text-right font-black text-blue-600 bg-blue-50/30 text-xl border-l-2 border-blue-100">${prodFmt(grandTotal)}</td>
            `;
            tbody.appendChild(trTotal);
        }
    }
};

window.exportProductionReportsCsv = () => {
    const table = document.getElementById('pr_table');
    if (!table) return;
    let csv = '\uFEFF'; 
    const trs = Array.from(table.querySelectorAll('tr'));
    trs.forEach(row => {
        const cells = Array.from(row.querySelectorAll('th,td')).map(c => {
            let t = c.textContent.trim().replace(/"/g, '""');
            return `"${t}"`;
        });
        csv += cells.join(',') + '\n';
    });
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `Laporan_Tren_Produksi_${document.getElementById('pr_year')?.value || ''}.csv`;
    a.click();
};
// â”€â”€â”€ PRODUKSI HARIAN (PROCESS-DRIVEN) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
window.renderDailyProduction = () => {
    const canEdit = getModulePermission('produksi').edit;
    document.getElementById('pageTitle').innerText = 'Produksi Harian (Daily Logs)';
    const mc = document.getElementById('main-content');
    const logs = (db.read('dailyProductionLogs') || []).sort((a, b) => new Date(b.date) - new Date(a.date));

    const rows = logs.map(log => {
        const isRunning = log.status === 'RUNNING';
        const statusBadge = isRunning
            ? `<span class="px-2 py-0.5 rounded text-[10px] font-black bg-blue-100 text-blue-600 animate-pulse uppercase tracking-tighter">Running</span>`
            : `<span class="px-2 py-0.5 rounded text-[10px] font-black bg-green-100 text-green-600 uppercase tracking-tighter">Done</span>`;

        return `
        <tr class="border-b border-gray-100 hover:bg-gray-50 text-sm transition-colors">
            <td class="py-3 px-4 font-medium text-slate-500 text-xs">${prodDate(log.date)}</td>
            <td class="py-3 px-4"><span class="px-2 py-0.5 rounded text-[10px] font-bold ${prodStageColor(log.process)}">${prodStageLabel(log.process)}</span></td>
            <td class="py-3 px-4 text-gray-800 font-bold text-xs">${log.productName || '-'}</td>
            <td class="py-3 px-4 text-center font-bold">${statusBadge}</td>
            <td class="py-3 px-4 text-right font-medium">${prodFmt(log.qtyIn)} Kg</td>
            <td class="py-3 px-4 text-right font-black text-blue-600">${isRunning ? '-' : prodFmt(log.qtyOut) + ' Kg'}</td>
            <td class="py-3 px-4 text-right text-orange-600 font-bold">${log.shrinkageKg > 0 ? prodFmt(log.shrinkageKg) + ' Kg' : '-'}</td>
            <td class="py-3 px-4 text-gray-400 text-[10px] italic">${log.notes || '-'}</td>
            <td class="py-3 px-4 text-right">
                <div class="flex justify-end items-center gap-2">
                    ${isRunning ? `
                        <button onclick="openFinishProductionModal('${log.id}')" class="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-lg text-xs font-black shadow-sm transition-all active:scale-95 flex items-center gap-1">
                            <i class="fas fa-flag-checkered"></i> Selesaikan
                        </button>` : ''}
                    <button onclick="deleteDailyLog('${log.id}')" class="text-slate-300 hover:text-red-500 transition-colors p-1"><i class="fas fa-trash"></i></button>
                </div>
            </td>
        </tr>`;
    }).join('') || '<tr><td colspan="9" class="py-20 text-center text-gray-400 font-medium italic">Belum ada aktivitas produksi harian.</td></tr>';

    mc.innerHTML = `
        <div class="mb-6 flex justify-between items-center bg-white p-6 rounded-xl shadow-sm border border-gray-100">
            <div>
                <h2 class="text-lg font-bold text-gray-800 uppercase tracking-tight"><i class="fas fa-tasks mr-2 text-blue-500"></i>Register Produksi Harian</h2>
                <p class="text-xs text-gray-500 font-medium mt-1">Log harian aktivitas produksi dan mutasi stok antar tahap</p>
            </div>
            ${canEdit ? `
            <button onclick="openDailyProductionModal()" class="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-lg text-sm font-semibold flex items-center gap-2 shadow-sm transition-all active:scale-95">
                <i class="fas fa-plus"></i> Mulai Produksi
            </button>` : ''}
        </div>

        <div class="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <div class="overflow-x-auto">
                <table class="w-full text-left border-collapse">
                    <thead><tr class="bg-gray-50 border-b border-gray-200">
                        <th class="py-3 px-4 text-[10px] font-bold text-gray-400 uppercase tracking-wider">Tanggal</th>
                        <th class="py-3 px-4 text-[10px] font-bold text-gray-400 uppercase tracking-wider">Tahapan</th>
                        <th class="py-3 px-4 text-[10px] font-bold text-gray-400 uppercase">Tahapan</th>
                        <th class="py-3 px-4 text-[10px] font-bold text-gray-400 uppercase">Item / Batch</th>
                        <th class="py-3 px-4 text-[10px] font-bold text-gray-400 uppercase text-center">Status</th>
                        <th class="py-3 px-4 text-[10px] font-bold text-gray-400 uppercase text-right">In (Kg)</th>
                        <th class="py-3 px-4 text-[10px] font-bold text-gray-400 uppercase text-right">Hasil (Kg)</th>
                        <th class="py-3 px-4 text-[10px] font-bold text-gray-400 uppercase text-right">Susut%</th>
                        <th class="py-3 px-4 text-[10px] font-bold text-gray-400 uppercase">Catatan</th>
                        <th class="py-3 px-4 text-[10px] font-bold text-gray-400 uppercase text-right">Aksi</th>
                    </tr></thead>
                    <tbody class="divide-y divide-gray-100">${rows}</tbody>
                </table>
            </div>
        </div>
    `;
};

window.openDailyProductionModal = () => {
    const invItems = db.read('inventoryItems') || [];
    const products = invItems.filter(i => i.category === 'FINISHED_GOODS' || i.category === 'OVEN_BASAH_STOCK' || i.category === 'OVEN_KERING_STOCK');

    const body = `
    <div class="space-y-6">
        <div class="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div class="space-y-1">
                <label class="block text-xs font-semibold text-gray-600">Tanggal Produksi</label>
                <input type="date" id="dp_date" value="${new Date().toISOString().split('T')[0]}" class="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all">
            </div>
            <div class="space-y-1">
                <label class="block text-xs font-semibold text-gray-600">Pilih Proses <span class="text-red-500">*</span></label>
                <select id="dp_process" onchange="updateDailyFormMapping()" class="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm font-bold text-blue-700 bg-white focus:ring-2 focus:ring-blue-500 outline-none transition-all">
                    <option value="">-- PILIH TAHAP --</option>
                    ${PROD_STAGES.map(s => `<option value="${s.key}">${s.label}</option>`).join('')}
                </select>
            </div>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div class="space-y-1">
                <label class="block text-xs font-semibold text-gray-600">Input Item / BOM <span class="text-red-500">*</span></label>
                <select id="dp_item_id" class="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 bg-white outline-none font-semibold">
                    <option value="">-- Pilih Tahap Dulu --</option>
                </select>
            </div>
            <div class="space-y-1">
                <label class="block text-xs font-semibold text-gray-600">Kuantitas Masuk (Kg) <span class="text-red-500">*</span></label>
                <input type="number" id="dp_qty_in" step="0.01" class="w-full border border-gray-300 rounded-lg px-3 py-2 text-lg font-bold text-gray-800 focus:ring-2 focus:ring-blue-500 outline-none placeholder-gray-300 bg-gray-50" placeholder="0.00" readonly>
            </div>
        </div>

        <div id="mixing_ingredients_section" class="hidden animate-fade-in border-t border-gray-100 pt-5">
            <label class="block text-[11px] font-bold text-blue-600 uppercase tracking-wider mb-3">Form Pemakaian Bahan Baku</label>
            <div id="mixing_ingredients_list" class="grid grid-cols-1 md:grid-cols-2 gap-3"></div>
        </div>

        <div class="hidden">
            <input type="hidden" id="dp_source_loc">
            <input type="hidden" id="dp_dest_loc">
        </div>
    </div>`;

    const footer = `
        <button onclick="closeModal()" class="px-6 py-2.5 rounded-lg text-gray-600 font-bold uppercase text-xs border border-gray-300 hover:bg-gray-50 transition-colors">Batal</button>
        <button onclick="processDailyProduction()" class="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2.5 rounded-lg font-bold uppercase text-xs shadow-sm transition-all active:scale-95">Mulai Proses Produksi</button>
    `;

    showModal('Register Aktivitas Produksi', body, footer, 'full');
};


window.updateDailyFormMapping = () => {
    const proc = document.getElementById('dp_process').value;
    const src = document.getElementById('dp_source_loc');
    const dst = document.getElementById('dp_dest_loc');
    const itemDropdown = document.getElementById('dp_item_id');
    if (!proc || !src || !dst || !itemDropdown) return;

    // 1. Set Locations
    if (proc === 'OVEN_BASAH') {
        src.value = 'WHS'; dst.value = 'OVEN_BASAH';
    } else if (proc === 'OVEN_KERING') {
        src.value = 'OVEN_BASAH'; dst.value = 'OVEN_KERING';
    } else if (proc === 'FINISH_GOOD') {
        src.value = 'OVEN_KERING'; dst.value = 'FINISH_GOOD';
    }

    // 2. Filter Input Items
    const invItems = db.read('inventoryItems') || [];
    const ingredSection = document.getElementById('mixing_ingredients_section');
    const ingredList = document.getElementById('mixing_ingredients_list');
    const qtyInField = document.getElementById('dp_qty_in');

    const currentType = itemDropdown.getAttribute('data-last-proc');

    // No MIXING stage — go directly to items filter
    ingredSection.classList.add('hidden');
    qtyInField.readOnly = false;

    if (currentType !== proc || itemDropdown.innerHTML === '') {
        let filtered = [];
        if (proc === 'OVEN_BASAH') {
            filtered = invItems.filter(i => i.category === 'RAW_MATERIAL');
        } else if (proc === 'OVEN_KERING') {
            filtered = invItems.filter(i => i.category === 'OVEN_BASAH_STOCK' || (i.category === 'WIP' && i.itemName.toLowerCase().includes('oven basah')));
        } else if (proc === 'FINISH_GOOD') {
            filtered = invItems.filter(i => i.category === 'OVEN_KERING_STOCK' || (i.category === 'WIP' && i.itemName.toLowerCase().includes('oven kering')));
        }

        itemDropdown.innerHTML = '<option value="">-- Pilih Barang Input --</option>' +
            filtered.map(i => `<option value="${i.id}">${i.itemName} (Stok: ${prodFmt(db.getInventoryStock(i.id))})</option>`).join('');
        itemDropdown.setAttribute('data-last-proc', proc);
    }
    itemDropdown.onchange = null;
};

window.recalcTotalMixingQty = () => {
    const inputs = document.querySelectorAll('.mixing_item_qty');
    let total = 0;
    inputs.forEach(i => total += (parseFloat(i.value) || 0));
    document.getElementById('dp_qty_in').value = total.toFixed(2);
};

window.processDailyProduction = () => {
    const date = document.getElementById('dp_date').value;
    const process = document.getElementById('dp_process').value;
    const itemId = document.getElementById('dp_item_id').value;
    const qIn = parseFloat(document.getElementById('dp_qty_in').value) || 0;
    const srcLoc = document.getElementById('dp_source_loc').value;
    const dstLoc = document.getElementById('dp_dest_loc').value;
    const shift = document.getElementById('dp_shift').value;

    if (!date || !process || !itemId || qIn <= 0) {
        showToast('Lengkapi data wajib (Tanggal, Tahap, Item/Resep, Qty In)', 'error');
        return;
    }

    const batchId = generateBatchId();
    const reference = `DAILY_PROD_${batchId}`;
    const logId = Date.now().toString();

    // 1. Initialize Log Data
    const logData = {
        id: logId,
        date, process,
        productName: db.findById('inventoryItems', itemId)?.itemName || process,
        itemId, qtyIn: qIn,
        srcLoc, dstLoc, status: 'RUNNING',
        createdAt: new Date().toISOString(),
        batchId: batchId,
        targetWipId: null // Will be set below
    };

    // 2. Logic Per Stage
    let targetWipId = null;
    // Process the item
    db.addInventoryTransaction(itemId, 'OUT', qIn, 'PRODUCTION_START', reference, `Proses ${prodStageLabel(process)}`, 'Admin', srcLoc);
    db.addInventoryTransaction(targetWipId, 'IN', qIn, 'PRODUCTION_START', reference, `Running ${prodStageLabel(process)}`, 'Admin', dstLoc);

    db.insert('dailyProductionLogs', logData);
    showToast('Produksi dimulai! Status kini RUNNING.', 'success');
    closeModal();
    renderDailyProduction();
};

window.openFinishProductionModal = (id) => {
    const log = db.read('dailyProductionLogs').find(l => l.id === id);
    if (!log) return;

    const body = `
    <div class="space-y-6">
        <div class="p-4 bg-blue-50 border border-blue-100 rounded-xl flex items-center gap-4">
            <div class="w-12 h-12 bg-blue-600 text-white rounded-lg flex items-center justify-center text-xl shadow-sm"><i class="fas fa-check-double"></i></div>
            <div>
                <h4 class="text-sm font-bold text-blue-800 uppercase tracking-tight">Penyelesaian Produksi</h4>
                <p class="text-[11px] text-blue-600 font-medium leading-tight">Input kuantitas hasil nyata (Actual Output) untuk disimpan ke stok.</p>
            </div>
        </div>

        <div class="bg-gray-50 p-4 rounded-lg border border-gray-100 grid grid-cols-2 gap-4">
            <div>
                <p class="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-1">Bahan Digunakan</p>
                <p class="text-sm font-bold text-gray-700">${prodFmt(log.qtyIn)} Kg</p>
                <input type="hidden" id="finish_qty_in" value="${log.qtyIn}">
            </div>
            <div>
        <button onclick="saveFinishProduction('${id}')" class="w-full bg-blue-600 hover:bg-blue-700 text-white px-6 py-4 rounded-2xl font-black shadow-lg shadow-blue-100 transition-all active:scale-95 uppercase tracking-widest text-xs">Simpan & Selesaikan</button>
    `;

    showModal('Finalisasi Hasil Produksi', body, footer, 'full');
};

window.calcFinishShrinkage = () => {
    const qIn = parseFloat(document.getElementById('finish_qty_in').value) || 0;
    const qOut = parseFloat(document.getElementById('finish_qty_out').value) || 0;
    if (qIn > 0) {
        const diff = Math.max(0, qIn - qOut);
        const pct = (diff / qIn * 100).toFixed(1);
        document.getElementById('finish_shrink_kg').value = diff.toFixed(2);
        document.getElementById('finish_shrink_pct').value = pct + '%';
    }
};

window.saveFinishProduction = (id) => {
    const qOut = parseFloat(document.getElementById('finish_qty_out').value) || 0;
    if (qOut <= 0) {
        showToast('Input Qty hasil yang valid', 'error');
        return;
    }

    const log = db.read('dailyProductionLogs').find(l => l.id === id);
    if (!log) return;

    const shrinkKg = Math.max(0, log.qtyIn - qOut);
    const shrinkPct = (shrinkKg / log.qtyIn * 100).toFixed(1);

    // 1. Update Log
    db.update('dailyProductionLogs', id, {
        qtyOut: qOut,
        shrinkageKg: shrinkKg,
        shrinkagePct: shrinkPct,
        status: 'COMPLETED',
        finishDate: new Date().toISOString()
    });

    // 2. Stock Movement (Finish)
    // Add the actual clean result (qOut) to the target item
    if (log.targetWipId) {
        db.addInventoryTransaction(log.targetWipId, 'IN', qOut, 'PRODUCTION_FINISH', null, `Hasil Produksi ${log.process}: ${log.productName}`, 'Admin', log.dstLoc);
    }

    showToast('Produksi selesai! Stok hasil telah masuk ke gudang tujuan.', 'success');
    closeModal();
    renderDailyProduction();
};

window.deleteDailyLog = (id) => {
    if (!confirm('Hapus catatan produksi ini? Catatan: Stok tidak akan dikembalikan otomatis.')) return;
    db.delete('dailyProductionLogs', id);
    renderDailyProduction();
};

// â”€â”€â”€ FINALISASI & REPACKING (WIP to FG) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
window.renderProductionFinalization = () => {
    const canEdit = getModulePermission('produksi').edit;
    document.getElementById('pageTitle').innerText = 'Finalisasi & Repacking (Finish Good)';
    const mc = document.getElementById('main-content');
    const logs = (db.read('repackingLogs') || []).sort((a, b) => new Date(b.date) - new Date(a.date));

    const rows = logs.map(log => `
        <tr class="border-b border-gray-100 hover:bg-gray-50 text-sm">
            <td class="py-3 px-4 text-xs">${prodDate(log.date)}</td>
            <td class="py-3 px-4 font-bold text-slate-700">${log.sourceName}</td>
            <td class="py-3 px-4 text-right">${prodFmt(log.qtyKg)} Kg</td>
            <td class="py-3 px-4 text-center"><i class="fas fa-arrow-right text-slate-300"></i></td>
            <td class="py-3 px-4 font-bold text-green-600">${log.destName}</td>
            <td class="py-3 px-4 text-right font-black text-green-700">${prodFmt(log.qtyUnits)} ${log.unitType}</td>
            <td class="py-3 px-4 text-right">
                <button onclick="deleteRepackingLog('${log.id}')" class="text-red-400 hover:text-red-600 shadow-sm p-1 rounded hover:bg-red-50"><i class="fas fa-trash"></i></button>
            </td>
        </tr>
    `).join('') || '<tr><td colspan="7" class="py-10 text-center text-gray-400 text-xs italic font-medium">Belum ada aktivitas repacking</td></tr>';

    mc.innerHTML = `
        <div class="mb-6 flex flex-col md:flex-row justify-between items-start md:items-center bg-white p-6 rounded-2xl shadow-sm border border-gray-100 gap-4">
            <div>
                <h2 class="text-xl font-black text-slate-800 flex items-center gap-2">
                    <i class="fas fa-box-open text-green-600"></i> Finalisasi WIP ke Finish Good
                </h2>
                <p class="text-sm text-slate-500 font-medium">Konversi stok barang setengah jadi (WIP) menjadi produk siap jual dalam berbagai ukuran kemasan.</p>
            </div>
            ${canEdit ? `
            <button onclick="openRepackingModal()" class="w-full md:w-auto bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-xl font-bold flex items-center justify-center gap-2 shadow-lg shadow-green-100 transition-all active:scale-95">
                <i class="fas fa-plus-circle"></i> Mulai Repacking
            </button>` : ''}
        </div>

        <div class="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div class="overflow-x-auto">
                <table class="w-full text-left border-collapse">
                    <thead><tr class="bg-slate-50 border-b border-slate-100">
                        <th class="py-4 px-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Tanggal</th>
                        <th class="py-4 px-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Source (WIP)</th>
                        <th class="py-4 px-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Total Berat (Kg)</th>
                        <th class="py-4 px-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center"></th>
                        <th class="py-4 px-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Target (SKU FG)</th>
                        <th class="py-4 px-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Hasil Pack</th>
                        <th class="py-4 px-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Aksi</th>
                    </tr></thead>
                    <tbody>${rows}</tbody>
                </table>
            </div>
        </div>
    `;
};

window.openRepackingModal = () => {
    const invItems = db.read('inventoryItems') || [];
    const wipItems = invItems.filter(i => i.category === 'OVEN_KERING_STOCK');
    const fgItems = invItems.filter(i => i.category === 'FINISHED_GOODS');

    const body = `
    <div class="space-y-6">
        <div class="p-4 bg-green-50 border border-green-100 rounded-2xl flex items-center gap-4">
            <div class="w-12 h-12 bg-green-600 text-white rounded-full flex items-center justify-center text-xl shadow-md border-4 border-white"><i class="fas fa-random"></i></div>
            <div>
                <h4 class="text-sm font-black text-green-800 uppercase tracking-tight">Konversi & Repacking Produk</h4>
                <p class="text-[10px] text-green-600 font-bold leading-tight">Ubah stok WIP (Kg) atau Produk Jadi (25kg) menjadi kemasan lebih kecil secara akurat.</p>
            </div>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div class="space-y-4">
                <h5 class="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2"><i class="fas fa-sign-out-alt text-orange-500"></i> ASAL: WIP (Kg) / PRODUK (Sak)</h5>
                <div>
                    <label class="block text-xs font-bold text-slate-600 mb-1">Pilih Item Sumber <span class="text-red-500">*</span></label>
                    <select id="rp_source_id" class="w-full border-2 border-slate-100 rounded-xl px-4 py-3 text-sm focus:border-green-500 outline-none transition-all font-semibold" onchange="updateRepackingSourceInfo()">
                        <option value="">-- Pilih Sumber --</option>
                        <optgroup label="WIP Stages (Stok Produksi)">
                            ${wipItems.map(i => `<option value="${i.id}" data-type="WIP" data-kg="1">${i.itemName} (Stok: ${prodFmt(db.getInventoryStock(i.id))} Kg)</option>`).join('')}
                        </optgroup>
                        <optgroup label="Finish Goods (Gudang Jadi)">
                            ${fgItems.map(i => {
        let kgMap = 1;
        const nameLower = i.itemName.toLowerCase();
        if (nameLower.includes('25kg')) kgMap = 25;
        else if (nameLower.includes('10kg')) kgMap = 10;
        else if (nameLower.includes('5kg')) kgMap = 5;
        else if (nameLower.includes('800g')) kgMap = 0.8;
        return `<option value="${i.id}" data-type="FG" data-kg="${kgMap}">${i.itemName} (Stok: ${formatNumber(db.getInventoryStock(i.id))} ${i.unit})</option>`;
    }).join('')}
                        </optgroup>
                    </select>
                </div>
                <div>
                    <label id="rp_qty_label" class="block text-xs font-bold text-slate-600 mb-1">Total yang Dipakai (Kg) <span class="text-red-500">*</span></label>
                    <div class="relative">
                        <input type="number" id="rp_qty_val" step="0.01" class="w-full border-2 border-slate-100 rounded-xl px-4 py-3 text-lg font-black text-slate-800 focus:border-green-500 outline-none transition-all" placeholder="0.00" oninput="recalcRepackingTotal()">
                        <span id="rp_qty_unit_tag" class="absolute right-4 top-1/2 -translate-y-1/2 text-[10px] font-black text-slate-300 uppercase">KG</span>
                    </div>
                    <p id="rp_source_calc_info" class="text-[9px] text-slate-400 mt-1 italic font-medium"></p>
                    <input type="hidden" id="rp_qty_kg" value="0">
                </div>
            </div>

            <div class="space-y-4 border-l-0 md:border-l border-slate-100 md:pl-6">
                <h5 class="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2"><i class="fas fa-sign-in-alt text-green-500"></i> TARGET: KE KEMASAN BARU</h5>
                <div>
                    <label class="block text-xs font-bold text-slate-600 mb-1">Pilih Produk Tujuan <span class="text-red-500">*</span></label>
                    <select id="rp_dest_id" class="w-full border-2 border-slate-100 rounded-xl px-4 py-3 text-sm focus:border-green-500 outline-none transition-all font-semibold" onchange="recalcRepackingTotal()">
                        <option value="">-- Pilih SKU --</option>
                        ${fgItems.map(i => {
        let kgMap = 1;
        const nameLower = i.itemName.toLowerCase();
        if (nameLower.includes('25kg')) kgMap = 25;
        else if (nameLower.includes('10kg')) kgMap = 10;
        else if (nameLower.includes('5kg')) kgMap = 5;
        else if (nameLower.includes('800g')) kgMap = 0.8;
        return `<option value="${i.id}" data-kg="${kgMap}">${i.itemName} (Konversi: ${kgMap} Kg/Pack)</option>`;
    }).join('')}
                    </select>
                </div>
                <div>
                    <label class="block text-xs font-bold text-slate-600 mb-1 font-mono uppercase tracking-tighter">Hasil Produk Jadi (Otomatis)</label>
                    <div class="relative">
                        <input type="number" id="rp_qty_units" readonly class="w-full bg-slate-50 border-2 border-slate-100 rounded-xl px-4 py-3 text-xl font-black text-green-600" value="0">
                        <span id="rp_dest_unit_tag" class="absolute right-4 top-1/2 -translate-y-1/2 text-[10px] font-black text-slate-300 uppercase underline decoration-green-500 decoration-2">UNIT</span>
                    </div>
                </div>
            </div>
        </div>

        <div class="pt-4 border-t border-slate-100">
            <label class="block text-xs font-bold text-slate-600 mb-1">Tanggal Packing</label>
            <input type="date" id="rp_date" value="${new Date().toISOString().split('T')[0]}" class="w-full border-2 border-slate-100 rounded-xl px-4 py-2 text-sm focus:border-blue-500 outline-none transition-all">
        </div>
    </div>`;

    const footer = `
        <div class="flex gap-3 w-full">
            <button onclick="closeModal()" class="flex-1 bg-white border border-slate-200 text-slate-500 px-6 py-3 rounded-xl font-bold hover:bg-slate-50 transition-all uppercase tracking-widest text-xs">Batal</button>
            <button onclick="saveRepacking()" class="flex-[2] bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-xl font-bold shadow-lg shadow-green-100 transition-all active:scale-95 uppercase tracking-widest text-xs">Simpan & Update Stok</button>
        </div>
    `;

    showModal('Finalisasi Produksi: WIP -> Finish Good', body, footer, 'full');
};

window.updateRepackingSourceInfo = () => {
    const sel = document.getElementById('rp_source_id');
    const opt = sel.options[sel.selectedIndex];
    const type = opt.dataset?.type || 'WIP';
    const tag = document.getElementById('rp_qty_unit_tag');
    const label = document.getElementById('rp_qty_label');

    if (type === 'FG') {
        tag.innerText = 'UNIT / SAK';
        label.innerText = 'Jumlah Unit yang Dibongkar *';
    } else {
        tag.innerText = 'KG';
        label.innerText = 'Total Berat yang Dipakai (Kg) *';
    }
    recalcRepackingTotal();
};

window.recalcRepackingTotal = () => {
    const srcSel = document.getElementById('rp_source_id');
    const srcOpt = srcSel.options[srcSel.selectedIndex];
    const srcType = srcOpt.dataset?.type || 'WIP';
    const srcKgPerUnit = parseFloat(srcOpt.dataset?.kg) || 1;

    const inputVal = parseFloat(document.getElementById('rp_qty_val').value) || 0;
    const totalKg = srcType === 'FG' ? (inputVal * srcKgPerUnit) : inputVal;

    document.getElementById('rp_qty_kg').value = totalKg;
    if (srcType === 'FG' && inputVal > 0) {
        document.getElementById('rp_source_calc_info').innerText = `= Setara ${prodFmt(totalKg)} Kg`;
    } else {
        document.getElementById('rp_source_calc_info').innerText = '';
    }

    const dstSel = document.getElementById('rp_dest_id');
    const dstOpt = dstSel.options[dstSel.selectedIndex];
    const dstKgPerUnit = parseFloat(dstOpt.dataset?.kg) || 0;
    const dstTag = document.getElementById('rp_dest_unit_tag');

    if (dstOpt.value) {
        dstTag.innerText = dstKgPerUnit >= 1 ? 'UNIT / SAK' : 'PCS / PAK';
    }

    const unitsEl = document.getElementById('rp_qty_units');
    if (totalKg > 0 && dstKgPerUnit > 0) {
        unitsEl.value = Math.floor(totalKg / dstKgPerUnit);
    } else {
        unitsEl.value = 0;
    }
};

window.saveRepacking = () => {
    const srcId = document.getElementById('rp_source_id').value;
    const destId = document.getElementById('rp_dest_id').value;
    const inputVal = parseFloat(document.getElementById('rp_qty_val').value) || 0;
    const kg = parseFloat(document.getElementById('rp_qty_kg').value) || 0;
    const units = parseFloat(document.getElementById('rp_qty_units').value) || 0;
    const date = document.getElementById('rp_date').value;

    if (!srcId || !destId || inputVal <= 0 || units <= 0) {
        showToast('Lengkapi semua data konversi', 'error');
        return;
    }

    const srcSel = document.getElementById('rp_source_id');
    const srcOpt = srcSel.options[srcSel.selectedIndex];
    const srcType = srcOpt.dataset?.type || 'WIP';

    if (!db.validateInventoryStock(srcId, inputVal)) {
        showToast('Stok sumber tidak mencukupi untuk konversi', 'error');
        return;
    }

    const srcItem = db.findById('inventoryItems', srcId);
    const destItem = db.findById('inventoryItems', destId);

    // Deduct Source (From WHS for FG, from PRODUCTION for WIP)
    const srcLoc = srcType === 'FG' ? 'WHS' : 'OVEN_KERING';
    db.addInventoryTransaction(srcId, 'OUT', inputVal, 'PRODUCTION_OUT', null, `Konversi Kemasan (Out): Dari ${srcItem.itemName}`, 'Admin', srcLoc);

    // Add Target (Always to WHS as Finish Good)
    db.addInventoryTransaction(destId, 'IN', units, 'PRODUCTION_IN', null, `Konversi Kemasan (In): Ke ${destItem.itemName}`, 'Admin', 'WHS');

    const logId = Date.now().toString();
    db.insert('repackingLogs', {
        id: logId, date,
        sourceId: srcId, sourceName: srcItem.itemName, qtyKg: kg,
        destId: destId, destName: destItem.itemName, qtyUnits: units,
        unitType: destItem.unit || 'Pack',
        createdAt: new Date().toISOString()
    });

    showToast('Konversi berhasil! Stok barang jadi telah ditambahkan.', 'success');
    closeModal();
    renderProductionFinalization();
};

window.deleteRepackingLog = (id) => {
    if (!confirm('Hapus log repacking ini? Catatan: Stok tidak dikembalikan otomatis.')) return;
    db.delete('repackingLogs', id);
    renderProductionFinalization();
};
// â”€â”€â”€ BILL OF MATERIAL (BOM) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
window.renderBOMManagement = () => {
    document.getElementById('pageTitle').innerText = 'Bill Of Material ( BOM )';
    const mc = document.getElementById('main-content');
    const boms = db.read('bomHeaders') || [];

    mc.innerHTML = `
        <div class="space-y-4">
            <!-- Structured Filter Bar -->
            <div class="bg-white rounded-xl shadow-sm border border-slate-100 p-5">
                <div class="flex flex-wrap items-center gap-4">
                    <!-- Search Input -->
                    <div class="flex-1 min-w-[250px] relative group">
                        <i class="fas fa-search absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-blue-500 transition-colors"></i>
                        <input type="text" id="bom_search" onkeyup="filterBOMList()" placeholder="Cari Nama Resep atau Produk Target..." 
                            class="w-full pl-12 pr-4 py-2.5 bg-slate-50 border border-transparent rounded-xl text-sm font-semibold text-slate-700 placeholder:text-slate-300 focus:bg-white focus:border-blue-300 focus:ring-4 focus:ring-blue-500/5 outline-none transition-all">
                    </div>

                    <!-- Actions -->
                    <div class="flex gap-3 ml-auto">
                        <button onclick="openBOMModal()" class="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl transition-all text-sm font-bold shadow-lg shadow-blue-500/20 flex items-center gap-2">
                            <i class="fas fa-plus"></i> Buat Resep Baru
                        </button>
                    </div>
                </div>
            </div>

            <!-- BOM Table Card -->
            <div class="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
                <div class="overflow-x-auto">
                    <table class="w-full text-left" id="bom_table">
                        <thead class="bg-slate-50/50 border-b border-slate-100">
                            <tr>
                                <th class="py-4 px-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Nama Resep</th>
                                <th class="py-4 px-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Produk Target</th>
                                <th class="py-4 px-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Jumlah Bahan</th>
                                <th class="py-4 px-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody id="bom_table_body" class="divide-y divide-slate-50">
                            ${renderBOMRows(boms)}
                        </tbody>
                    </table>
                </div>
                <div id="bom_empty_state" class="${boms.length === 0 ? '' : 'hidden'} py-20 flex flex-col items-center justify-center text-center">
                    <div class="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center text-slate-300 mb-4 text-2xl">
                        <i class="fas fa-receipt"></i>
                    </div>
                    <p class="text-sm font-medium text-slate-500">Belum ada resep yang dibuat.</p>
                </div>
            </div>
        </div>
    `;
};

window.renderBOMRows = (boms) => {
    if (boms.length === 0) return '';
    
    return boms.map(bom => {
        const targetProduct = db.findById('inventoryItems', bom.targetProductId);
        const materials = (db.read('bomMaterials') || []).filter(m => m.bomHeaderId === bom.id);
        const initials = bom.name ? bom.name.substring(0,2).toUpperCase() : 'BM';
        
        return `
        <tr class="hover:bg-slate-50/80 transition-colors group">
            <td class="py-4 px-5">
                <div class="flex items-center gap-3">
                    <div class="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center text-xs font-bold shrink-0">
                        ${initials}
                    </div>
                    <div>
                        <div class="text-sm font-bold text-slate-800">${bom.name}</div>
                    </div>
                </div>
            </td>
            <td class="py-4 px-5">
                <div class="text-sm text-slate-700 font-medium">${targetProduct ? targetProduct.itemName : 'N/A'}</div>
            </td>
            <td class="py-4 px-5 text-center">
                <span class="text-xs font-black text-slate-800 bg-slate-100 px-2.5 py-1 rounded-md border border-slate-200/60 shadow-sm">${materials.length} Bahan</span>
            </td>
            <td class="py-4 px-5 text-right">
                <div class="flex justify-end gap-2 transition-opacity">
                    <button onclick="openBOMModal('${bom.id}')" class="w-8 h-8 rounded-lg bg-slate-100 text-slate-500 hover:bg-blue-50 hover:text-blue-600 transition-all" title="Edit"><i class="fas fa-edit text-xs"></i></button>
                    <button onclick="deleteBOM('${bom.id}')" class="w-8 h-8 rounded-lg bg-slate-100 text-slate-500 hover:bg-red-50 hover:text-red-600 transition-all" title="Delete"><i class="fas fa-trash text-xs"></i></button>
                </div>
            </td>
        </tr>`;
    }).join('');
};

window.filterBOMList = () => {
    const search = document.getElementById('bom_search')?.value.toLowerCase() || '';
    const boms = db.read('bomHeaders') || [];
    
    const filtered = boms.filter(b => {
        const targetProduct = db.findById('inventoryItems', b.targetProductId);
        const productName = targetProduct ? targetProduct.itemName.toLowerCase() : '';
        return !search || 
            b.name.toLowerCase().includes(search) || 
            productName.includes(search);
    });

    const tbody = document.getElementById('bom_table_body');
    const emptyState = document.getElementById('bom_empty_state');
    
    if (filtered.length === 0) {
        tbody.innerHTML = '';
        emptyState.classList.remove('hidden');
    } else {
        tbody.innerHTML = renderBOMRows(filtered);
        emptyState.classList.add('hidden');
    }
};


window.toggleMaterialDropdown = () => {
    const menu = document.getElementById('material_dropdown_menu');
    menu.classList.toggle('hidden');
    if (!menu.classList.contains('hidden')) {
        document.getElementById('material_dropdown_search').focus();
    }
};

window.filterMaterialDropdown = () => {
    const query = document.getElementById('material_dropdown_search').value.toLowerCase();
    const options = document.querySelectorAll('.material-option');
    options.forEach(opt => {
        const name = opt.dataset.name || '';
        const code = opt.dataset.code || '';
        if (name.includes(query) || code.includes(query)) {
            opt.classList.remove('hidden');
            opt.classList.add('flex');
        } else {
            opt.classList.add('hidden');
            opt.classList.remove('flex');
        }
    });
};

window.selectMaterialOption = (id, name, unit) => {
    const input = document.getElementById('add_mat_item');
    input.value = id;
    input.dataset.name = name;
    input.dataset.unit = unit;
    
    const btnText = document.getElementById('material_dropdown_text');
    btnText.textContent = name;
    btnText.classList.remove('text-slate-400');
    btnText.classList.add('text-slate-700');
    
    document.getElementById('add_mat_unit').value = unit || '';
    
    document.getElementById('material_dropdown_menu').classList.add('hidden');
    document.getElementById('material_dropdown_search').value = '';
    filterMaterialDropdown();
};

window.openBOMModal = (id = null) => {
    if (window.pushCurrentToHistory) window.pushCurrentToHistory();
    const bom = id ? db.findById('bomHeaders', id) : null;
    const invItems = db.read('inventoryItems') || [];
    const mixingProducts = invItems.filter(i => {
        if (i.status === 'INACTIVE') return false;
        if (i.category !== 'WIP' && i.category !== 'FINISHED_GOODS') return false;
        const name = (i.itemName || '').toLowerCase();
        const code = (i.itemCode || '').toLowerCase();
        // Exclude specific stage WIPs that don't need a Recipe/BOM (Oven Basah, Oven Kering, Extruder)
        if (name.includes('oven basah') || code.includes('ovenbasah')) return false;
        if (name.includes('oven kering') || code.includes('ovenkering')) return false;
        if (name.includes('extruder') || code.includes('extruder')) return false;
        return true;
    });
    const rawMaterials = invItems.filter(i => (i.category === 'RAW_MATERIAL' || i.category === 'Bahan Baku') && i.status !== 'INACTIVE');

    // Materials data if edit
    const currentMaterials = id ? (db.read('bomMaterials') || []).filter(m => m.bomHeaderId === id) : [];

    const body = `
    <div class="space-y-6 px-1 py-2">
        <!-- Target Product Section -->
        <div class="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
            <label class="block text-[11px] font-black text-slate-400 uppercase mb-3 ml-1">PILIH PRODUK TARGET (WIP OVEN BASAH) <span class="text-red-500">*</span></label>
            <select id="bom_name_id" onchange="document.getElementById('bom_product_id').value = this.value" 
                class="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold bg-white focus:border-indigo-400 outline-none transition-all shadow-sm">
                <option value="">-- Pilih Produk Target --</option>
                ${mixingProducts.map(p => `
                <option value="${p.id}" data-name="${p.itemName}" ${id && db.findById('bomHeaders', id)?.targetProductId === p.id ? 'selected' : ''}>
                    ${p.itemName} (${p.itemCode})
                </option>`).join('')}
            </select>
            <input type="hidden" id="bom_product_id" value="${id ? db.findById('bomHeaders', id)?.targetProductId : ''}">
        </div>

        <!-- Item Bahan Baku (Expanded for 'full' width) -->
        <div class="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
            <h4 class="text-[11px] font-black text-indigo-500 uppercase tracking-widest mb-6 flex items-center gap-3">
                <i class="fas fa-layer-group"></i> ITEM BAHAN BAKU
            </h4>
            
            <div class="flex gap-3 mb-8 bg-slate-50/50 p-4 rounded-2xl border border-slate-100 items-end flex-wrap xl:flex-nowrap">
                <div class="w-full sm:w-48">
                    <label class="block text-[10px] font-black text-slate-400 uppercase mb-2 ml-1">LOKASI</label>
                    <select id="add_mat_location" class="w-full border border-slate-200 rounded-xl px-4 py-3 text-xs font-black text-indigo-700 outline-none bg-white font-mono uppercase">
                        <option value="GUDANG">GUDANG</option>
                        <option value="BUMBU">BUMBU</option>
                    </select>
                </div>
                <div class="flex-1 min-w-[300px] relative">
                    <label class="block text-[10px] font-black text-slate-400 uppercase mb-2 ml-1">BAHAN BAKU</label>
                    
                    <button type="button" onclick="toggleMaterialDropdown()" id="material_dropdown_btn"
                        class="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold text-slate-400 bg-white text-left flex justify-between items-center transition-all hover:border-slate-300">
                        <span id="material_dropdown_text">-- Cari Kode atau Nama Produk --</span>
                        <i class="fas fa-chevron-down text-[10px]"></i>
                    </button>
                    
                    <input type="hidden" id="add_mat_item" value="">

                    <div id="material_dropdown_menu" class="hidden absolute top-full left-0 right-0 mt-2 bg-white border border-slate-200 rounded-2xl shadow-xl z-50 overflow-hidden animate-slide-up">
                        <div class="p-3 border-b border-slate-100 bg-slate-50/30">
                            <div class="relative">
                                <i class="fas fa-search absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs"></i>
                                <input type="text" id="material_dropdown_search" onkeyup="filterMaterialDropdown()" placeholder="Ketik kode atau nama..." 
                                    class="w-full bg-white border border-slate-200 rounded-xl pl-9 pr-3 py-2.5 text-sm font-medium text-slate-700 outline-none focus:border-blue-400 transition-all shadow-sm">
                            </div>
                        </div>
                        
                        <div class="max-h-64 overflow-y-auto custom-scrollbar p-2" id="material_dropdown_list">
                            ${rawMaterials.map(m => {
                                const stockTxs = db.read('stockTransactions') || [];
                                const stock = stockTxs.filter(t => t.itemId === m.id).reduce((tot, t) => t.type === 'IN' ? tot + parseFloat(t.qty) : tot - parseFloat(t.qty), 0);
                                
                                return `
                                <div class="material-option flex justify-between items-center p-3 hover:bg-blue-50/50 rounded-xl cursor-pointer transition-all group" 
                                    onclick="selectMaterialOption('${m.id}', '${m.itemName.replace(/'/g, "\\'")}', '${m.unit}')"
                                    data-name="${(m.itemName || '').toLowerCase()}" data-code="${(m.itemCode || '').toLowerCase()}">
                                    <div class="flex flex-col">
                                        <div class="text-sm font-bold text-slate-700 group-hover:text-blue-600">${m.itemName}</div>
                                        <div class="text-[10px] font-black text-slate-300 uppercase tracking-widest group-hover:text-blue-300">${m.itemCode}</div>
                                    </div>
                                    <div class="text-right">
                                        <div class="text-[10px] font-black text-blue-500 uppercase tracking-widest bg-blue-50 px-2 py-1 rounded-lg">STOCK: ${prodFmt(stock)}</div>
                                    </div>
                                </div>`;
                            }).join('')}
                        </div>
                        
                        <div class="p-2 border-t border-slate-100 bg-slate-50/50">
                            <button type="button" class="w-full flex items-center gap-3 p-2.5 hover:bg-white hover:shadow-sm rounded-xl text-[11px] font-black text-slate-500 hover:text-blue-600 transition-all uppercase tracking-wider">
                                <div class="w-7 h-7 rounded-lg bg-white border border-slate-200 flex items-center justify-center shadow-sm text-slate-400 group-hover:text-blue-500"><i class="fas fa-plus"></i></div>
                                Create New Product
                            </button>
                        </div>
                    </div>
                </div>
                <div class="w-full sm:w-32">
                    <label class="block text-[10px] font-black text-slate-400 uppercase mb-2 ml-1 text-center">QTY</label>
                    <input type="number" id="add_mat_qty" step="0.01" class="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm font-black text-slate-700 text-center outline-none" placeholder="0.00">
                </div>
                <div class="w-full sm:w-24">
                    <label class="block text-[10px] font-black text-slate-400 uppercase mb-2 ml-1 text-center font-mono">UNIT</label>
                    <input type="text" id="add_mat_unit" readonly class="w-full border border-slate-100 rounded-xl px-2 py-3 text-xs font-black text-slate-400 outline-none bg-slate-100 uppercase text-center" placeholder="-">
                </div>
                <button type="button" onclick="appendBOMMaterial()" class="bg-indigo-900 hover:bg-slate-900 text-white w-full xl:w-14 h-12 rounded-xl transition-all flex items-center justify-center shadow-lg shadow-indigo-100 active:scale-95">
                    <i class="fas fa-plus"></i>
                </button>
            </div>

            <div class="overflow-hidden rounded-2xl border border-slate-100 shadow-sm">
                <table class="w-full text-left text-sm border-collapse">
                    <thead class="bg-slate-50 border-b border-slate-200">
                        <tr>
                            <th class="py-4 px-6 text-[10px] font-black text-slate-400 uppercase tracking-widest w-48 border-r border-slate-50 italic">LOKASI</th>
                            <th class="py-4 px-6 text-[10px] font-black text-slate-400 uppercase tracking-widest border-r border-slate-50">BAHAN BAKU</th>
                            <th class="py-4 px-6 text-[10px] font-black text-slate-400 uppercase tracking-widest w-40 text-right border-r border-slate-50 bg-slate-50/20">JUMLAH</th>
                            <th class="py-4 px-2 text-center w-20"></th>
                        </tr>
                    </thead>
                    <tbody id="bom_materials_table_body" class="divide-y divide-slate-100 bg-white">
                    </tbody>
                </table>
            </div>
        </div>
    </div>`;

    const main = document.getElementById('main-content');
    document.getElementById('pageTitle').innerText = id ? 'Edit Resep' : 'Buat Resep Baru';

    main.innerHTML = `
    <div class="w-full space-y-6 pb-20">

        ${body}

        <div class="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-end gap-3 mt-6">
            <button onclick="renderBOMManagement()" class="text-slate-500 hover:text-slate-700 px-6 py-2.5 text-sm font-bold transition-all">Batal</button>
            <button onclick="saveBOM('${id || ''}')" class="bg-indigo-600 hover:bg-indigo-700 text-white px-10 py-2.5 rounded-xl text-sm font-bold shadow-lg shadow-indigo-100 transition-all active:scale-95">Simpan Resep</button>
        </div>
    </div>`;

    if (currentMaterials.length > 0) {
        currentMaterials.forEach(m => {
            const item = db.findById('inventoryItems', m.itemId);
            appendMaterialToTable(m.location || 'GUDANG', m.itemId, item ? item.itemName : 'Unknown', m.qty, m.unit);
        });
    }
};

window.appendBOMMaterial = () => {
    const loc = document.getElementById('add_mat_location').value;
    const itemInput = document.getElementById('add_mat_item');
    const itemId = itemInput.value;
    const qty = parseFloat(document.getElementById('add_mat_qty').value);
    const unit = document.getElementById('add_mat_unit').value;

    if (!itemId) { showToast('Pilih bahan baku lebih dulu', 'warning'); return; }
    if (isNaN(qty) || qty <= 0) { showToast('Isi jumlah yang valid', 'warning'); return; }

    appendMaterialToTable(loc, itemId, itemInput.dataset.name, qty, unit);

    // Reset inputs
    itemInput.value = '';
    delete itemInput.dataset.name;
    document.getElementById('material_dropdown_text').textContent = '-- Cari Kode atau Nama Produk --';
    document.getElementById('material_dropdown_text').classList.add('text-slate-400');
    document.getElementById('material_dropdown_text').classList.remove('text-slate-700');
    document.getElementById('add_mat_qty').value = '';
    document.getElementById('add_mat_unit').value = '';
};

function appendMaterialToTable(location, itemId, itemName, qty, unit) {
    const tbody = document.getElementById('bom_materials_table_body');
    const tr = document.createElement('tr');
    tr.className = 'hover:bg-slate-50/50 transition-all text-sm';
    tr.dataset.itemId = itemId;
    tr.dataset.location = location;
    tr.dataset.qty = qty;
    tr.dataset.unit = unit;

    tr.innerHTML = `
        <td class="py-2.5 px-4 border-r border-slate-100">
            <span class="text-[10px] font-bold px-2 py-0.5 bg-indigo-50 text-indigo-700 rounded-md uppercase">${location}</span>
        </td>
        <td class="py-2.5 px-4 border-r border-slate-100">
            <div class="font-bold text-slate-700">${itemName}</div>
        </td>
        <td class="py-2.5 px-4 text-right border-r border-slate-100">
            <span class="font-black text-slate-800">${qty}</span>
            <span class="text-[10px] text-slate-400 font-bold uppercase ml-1">${unit}</span>
        </td>
        <td class="py-2.5 px-2 text-center">
            <button onclick="this.parentElement.parentElement.remove()" class="text-gray-300 hover:text-red-500 transition-colors">
                <i class="fas fa-times-circle"></i>
            </button>
        </td>
    `;
    tbody.appendChild(tr);
}

window.saveBOM = (id = '') => {
    const nameId = document.getElementById('bom_name_id').value;
    const nameOpt = document.getElementById('bom_name_id').selectedOptions[0];
    const name = nameOpt ? nameOpt.getAttribute('data-name') : '';
    const targetProductId = nameId;

    if (!name || !targetProductId) {
        showToast('Mohon pilih Produk Mixing target resep', 'error');
        return;
    }

    const rows = document.querySelectorAll('#bom_materials_table_body tr');
    const materials = [];
    for (const row of rows) {
        const itemId = row.dataset.itemId;
        const qty = parseFloat(row.dataset.qty);
        const unit = row.dataset.unit;
        const location = row.dataset.location;
        if (itemId && qty) {
            materials.push({ itemId, qty, unit, location });
        }
    }

    if (materials.length === 0) {
        showToast('Tambahkan minimal satu bahan baku', 'error');
        return;
    }

    const bomData = { name, targetProductId, baseQty: 100, unit: '%', updatedAt: new Date().toISOString() };

    let headerId = id;
    if (id) {
        db.update('bomHeaders', id, bomData);
    } else {
        const newBom = db.insert('bomHeaders', bomData);
        headerId = newBom.id;
    }

    // Replace materials
    const allMaterials = db.read('bomMaterials') || [];
    const filtered = allMaterials.filter(m => m.bomHeaderId !== headerId);
    materials.forEach(m => {
        filtered.push({
            id: Date.now().toString() + Math.random().toString(36).substr(2, 5),
            bomHeaderId: headerId,
            itemId: m.itemId,
            qty: m.qty,
            unit: m.unit,
            location: m.location,
            createdAt: new Date().toISOString()
        });
    });
    db.save('bomMaterials', filtered);

    showToast('Resep berhasil disimpan!', 'success');
    renderBOMManagement();
};

window.deleteBOM = (id) => {
    if (!confirm('Hapus resep ini?')) return;
    db.delete('bomHeaders', id);
    const materials = db.read('bomMaterials') || [];
    db.save('bomMaterials', materials.filter(m => m.bomHeaderId !== id));
    showToast('Resep berhasil dihapus', 'success');
    renderBOMManagement();
};

window.printProductionMO = (id) => {
    const mo = db.findById("productionOrders", id);
    if (!mo) { showToast("MO tidak ditemukan", "error"); return; }

    const isMixing = false; // Tahap Mixing sudah dihapus
    const isOven = mo.stage === 'OVEN_BASAH' || mo.stage === 'OVEN_KERING';

    const renderMixingSection = (items, title, moSuffix = "", operatorLabel = "Operator Mixing") => {
        if (!items.length) return "";
        const rows = items.map((m, index) => `
            <tr>
                <td style="border: 1px solid #000; padding: 10px; text-align: center;">${index + 1}</td>
                <td style="border: 1px solid #000; padding: 10px;">${m.itemName}</td>
                <td style="border: 1px solid #000; padding: 10px; text-align: right; font-weight: 600;">${prodFmt(m.qty)} ${m.unit || ""}</td>
                <td style="border: 1px solid #000; padding: 10px;"></td>
            </tr>
        `).join("");

        const resultBox = moSuffix !== '-G' ? `
            <div style="border: 2px solid #000; border-radius: 8px; padding: 20px; font-size: 14px; font-weight: 800; color: #000; text-transform: uppercase;">
                HASIL PRODUKSI (Kg) :
            </div>` : "";

        return `
            <div class="mo-page" style="${moSuffix !== '-G' ? 'padding-top: 1.5cm;' : ''}">
                ${renderBaseHeader(mo, title, operatorLabel, moSuffix)}
                <table>
                    <thead>
                        <tr>
                            <th style="width: 40px; text-align: center;">NO</th>
                            <th style="text-align: center;">NAMA BAHAN BAKU</th>
                            <th style="width: 140px; text-align: center;">QTY TARGET (BOM)</th>
                            <th style="width: 200px; text-align: center;">QTY ACTUAL</th>
                        </tr>
                    </thead>
                    <tbody>${rows}</tbody>
                </table>
                <div style="margin-bottom: 25px;">${resultBox}</div>
                ${renderBaseFooter(mo, operatorLabel, moSuffix === '-G' ? "Bagian Gudang: Verifikasi pengambilan bahan baku." : "Operator wajib mengisi kolom 'Qty Actual' dan 'Hasil Mixing'")}
            </div>`;
    };

    const renderMixingThreeSheets = () => {
        const materials = mo.inputItems || [];
        const gudangItems = materials.filter(m => (m.location || 'GUDANG') === 'GUDANG');
        const bumbuItems = materials.filter(m => m.location === 'BUMBU');

        return renderMixingSection(gudangItems, "GUDANG BAHAN BAKU (WHS)", "-G", "Petugas Gudang") +
            renderMixingSection(gudangItems, "PROSES PRODUKSI (UTAMA)", "-P", "Operator Oven") +
            renderMixingSection(gudangItems, "ARSIP PRODUKSI / QA", "-A", "Staff Admin") +
            renderMixingSection(bumbuItems, "BUMBU / SEASONING", "-B", "Operator Bumbu");
    };

    const renderOvenPage = (title, operatorLabel = "Operator Oven") => {
        const inputItem = mo.inputItemId ? db.findById('inventoryItems', mo.inputItemId) : null;
        const isBasah = mo.stage === 'OVEN_BASAH';

        return `
            <div class="mo-page">
                ${renderBaseHeader(mo, title, operatorLabel)}
                
                <div style="margin-bottom: 25px; display: grid; grid-template-columns: 1fr; gap: 20px;">
                    <!-- Input WIP Section -->
                    <div style="border: 2px solid #000; border-radius: 8px; padding: 15px;">
                        <h4 style="margin: 0 0 10px 0; font-size: 11px; font-weight: 800;">INPUT BAHAN (WIP)</h4>
                        <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #000; padding-bottom: 8px; ${isBasah ? 'margin-bottom: 12px;' : ''}">
                            <span style="font-size: 13px; font-weight: 700;">${inputItem?.itemName || 'WIP ITEM'}</span>
                            <span style="font-size: 14px; font-weight: 800; border-left: 2px solid #000; padding-left: 15px; min-width: 150px; text-align: right;">TARGET: ${prodFmt(mo.inputQty)} Kg</span>
                        </div>
                        ${isBasah ? `
                        <div style="display: flex; justify-content: space-between; align-items: center;">
                            <span style="font-size: 10px; font-weight: 800; text-transform: uppercase;">Pengambilan Actual Stock Mixing (Kg) :</span>
                            <div style="border: 2px solid #000; width: 200px; height: 35px; background: #fff;"></div>
                        </div>` : ''}
                    </div>

                    <!-- Output & Measurement Section -->
                    <div style="border: 2px solid #000; border-radius: 8px; padding: 15px; background: #fafafa;">
                        <h4 style="margin: 0 0 15px 0; font-size: 11px; font-weight: 800; border-bottom: 2px solid #000; padding-bottom: 5px;">LAPORAN HASIL PRODUKSI</h4>
                        <table style="margin-bottom: 0;">
                            ${!isBasah ? `
                            <tr>
                                <td style="width: 250px; border: none; padding: 10px 0; font-weight: 700; font-size: 11px;">QTY SEBELUM OVEN (Kg)</td>
                                <td style="border: 2px solid #000; width: 200px; height: 35px; background: #fff;"></td>
                            </tr>` : ''}
                            <tr>
                                <td style="padding: 10px 0; border: none; font-weight: 700; font-size: 11px; ${isBasah ? 'width: 250px;' : ''}">
                                    ${isBasah ? 'QTY SETELAH OVEN BASAH' : 'QTY SETELAH OVEN'} (Kg)
                                </td>
                                <td style="border: 2px solid #000; ${isBasah ? 'width: 200px;' : ''} height: 35px; background: #fff;"></td>
                            </tr>
                            ${!isBasah ? `
                            <tr>
                                <td style="padding: 10px 0; border: none; font-weight: 700; font-size: 11px;">PENYUSUTAN (Kg)</td>
                                <td style="border: 2px solid #000; height: 35px; background: #fff;"></td>
                            </tr>` : ''}
                        </table>
                    </div>
                </div>

                <div style="margin-bottom: 20px; font-size: 10px; border: 1px solid #000; padding: 10px; border-radius: 4px; background: #fff;">
                    <strong>Pengecekan Kualitas:</strong>
                    <div style="display: flex; gap: 20px; margin-top: 8px;">
                        <span>[ ] Bentuk Sesuai</span>
                        <span>[ ] Warna Seragam</span>
                        <span>[ ] Tingkat Kematangan Sesuai</span>
                    </div>
                </div>

                ${renderBaseFooter(mo, operatorLabel, "Operator wajib mengisi kolom penggabungan data secara manual.")}
            </div>`;
    };

    function renderBaseHeader(mo, areaTitle, operatorLabel, moSuffix = "") {
        return `
            <div class="header">
                <div>
                    <div class="company-name">TANA SUBUR NUSANTARA</div>
                    <div style="font-size: 10px; color: #000; font-weight: 500; letter-spacing: 0.05em;">FOOD MANUFACTURING SYSTEM - PRODUCTION DEPARTMENT</div>
                </div>
                <div class="doc-title">${mo.stage.replace('_', ' ')} ORDER</div>
            </div>

            <div class="info-grid">
                <div>
                    <div class="info-item"><span class="info-label">Nomor MO</span> <span class="info-val" style="color:#000; font-weight:800; font-size:14px;">: ${mo.moNumber} <span style="background:#000; color:#fff; padding: 2px 8px; border-radius: 4px; margin-left:5px;">${moSuffix.replace('-', '')}</span></span></div>
                    <div class="info-item"><span class="info-label">Batch ID</span> <span class="info-val">: ${mo.batchId}</span></div>
                    <div class="info-item"><span class="info-label">Nama Produk</span> <span class="info-val">: ${mo.productName}</span></div>
                </div>
                <div>
                    <div class="info-item"><span class="info-label">Tanggal Prod.</span> <span class="info-val">: ${prodDate(mo.date)}</span></div>
                    <div class="info-item"><span class="info-label">Shift</span> <span class="info-val">: ${mo.shift || "-"}</span></div>
                    <div class="info-item"><span class="info-label">Mesin/Oven</span> <span class="info-val">: ${mo.machineName || "-"}</span></div>
                </div>
            </div>
            <h4 style="margin-bottom: 12px; font-size: 11px; font-weight: 800; color: #000; text-transform: uppercase; border-left: 4px solid #000; padding-left: 8px;">Area Kerja: ${areaTitle}</h4>
        `;
    }

    function renderBaseFooter(mo, operatorLabel, manualInstruction) {
        return `
            ${mo.notes ? `<div class="notes-box"><strong>Catatan:</strong> <p style="margin-top: 3px; font-style: italic; color: #000;">${mo.notes}</p></div>` : ""}
            <div style="margin-top: 5px; font-size: 9px; color: #666; font-style: italic;">* ${manualInstruction}</div>
            <div class="footer">
                <div style="flex: 1; text-align: center;">
                    <div style="height: 60px;"></div>
                    <div style="border-top: 2px solid #000; padding-top: 5px; font-size: 11px; font-weight: 700;">&nbsp;</div>
                    <div style="font-size: 9px; font-weight: 800; text-transform: uppercase;">Staff Produksi</div>
                </div>
                <div style="flex: 1; text-align: center;">
                    <div style="height: 60px;"></div>
                    <div style="border-top: 2px solid #000; padding-top: 5px; font-size: 11px; font-weight: 700;">${mo.picName || "&nbsp;"}</div>
                    <div style="font-size: 9px; font-weight: 800; text-transform: uppercase;">${operatorLabel}</div>
                </div>
            </div>`;
    }

    let printHTML = "";
    if (isMixing) {
        printHTML = renderMixingThreeSheets();
    } else if (isOven) {
        printHTML = renderOvenPage(prodStageLabel(mo.stage).toUpperCase(), "Operator Oven");
    } else {
        // Fallback or Extruder
        printHTML = renderOvenPage(prodStageLabel(mo.stage).toUpperCase(), "Operator Produksi");
    }

    const printWindow = window.open("", "_blank");
    if (!printWindow) { showToast("Pop-up diblokir! Izinkan pop-up untuk mencetak.", "error"); return; }

    printWindow.document.write(`
        <html>
        <head>
            <title>MO - ${mo.moNumber}</title>
            <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet">
            <style>
                @page { margin: 0; }
                body { font-family: "Inter", sans-serif; padding: 1.5cm; color: #000; line-height: 1.4; -webkit-print-color-adjust: exact; margin: 0; }
                .mo-page { break-after: page; }
                .header { display: flex; justify-content: space-between; border-bottom: 2px solid #000; padding-bottom: 12px; margin-bottom: 20px; }
                .company-name { font-size: 22px; font-weight: 800; color: #000; letter-spacing: -0.025em; }
                .doc-title { font-size: 14px; font-weight: 800; border: 2px solid #000; padding: 5px 12px; border-radius: 4px; align-self: flex-start; margin-top: 5px; }
                .info-grid { display: grid; grid-template-cols: 1fr 1fr; gap: 15px; margin-bottom: 20px; }
                .info-item { display: flex; margin-bottom: 6px; font-size: 12px; border-bottom: 1px dashed #ccc; padding-bottom: 4px; }
                .info-label { width: 100px; font-weight: 700; color: #000; text-transform: uppercase; font-size: 10px; letter-spacing: 0.05em; }
                .info-val { font-weight: 600; color: #000; }
                table { width: 100%; border-collapse: collapse; margin-bottom: 25px; }
                th { background: #fff; border: 1px solid #000; padding: 8px; text-align: left; font-size: 10px; text-transform: uppercase; color: #000; font-weight: 800; }
                td { border: 1px solid #000; padding: 8px; font-size: 12px; color: #000; }
                .notes-box { background: #fff; padding: 15px; border-radius: 4px; border: 1px solid #000; margin-bottom: 20px; font-size: 11px; }
                .footer { display: flex; justify-content: space-between; gap: 60px; margin-top: 40px; break-inside: avoid; }
                @media print {
                    .no-print { display: none; }
                }
            </style>
        </head>
        <body>
            ${printHTML}
            <script>
                window.onload = function() { 
                    setTimeout(() => {
                        window.print(); 
                        window.onafterprint = function() { window.close(); }
                    }, 500);
                }
            </script>
        </body>
        </html>
    `);
    printWindow.document.close();
};

// â”€â”€â”€ MASTER MESIN (MACHINE MASTER) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
window.renderMachineMaster = () => {
    document.getElementById('pageTitle').innerText = 'Machine Master';
    const main = document.getElementById('main-content');
    const machines = db.read('machines') || [];

    main.innerHTML = `
        <div class="space-y-4">
            <!-- Structured Filter Bar -->
            <div class="bg-white rounded-xl shadow-sm border border-slate-100 p-5">
                <div class="flex flex-wrap items-center gap-4">
                    <!-- Search Input -->
                    <div class="flex-1 min-w-[250px] relative group">
                        <i class="fas fa-search absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-blue-500 transition-colors"></i>
                        <input type="text" id="mch_search" onkeyup="filterMachineList()" placeholder="Cari Kode atau Nama Mesin..." 
                            class="w-full pl-12 pr-4 py-2.5 bg-slate-50 border border-transparent rounded-xl text-sm font-semibold text-slate-700 placeholder:text-slate-300 focus:bg-white focus:border-blue-300 focus:ring-4 focus:ring-blue-500/5 outline-none transition-all">
                    </div>

                    <!-- Actions -->
                    <div class="flex gap-3 ml-auto">
                        <button onclick="openAddMachineModal()" class="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl transition-all text-sm font-bold shadow-lg shadow-blue-500/20 flex items-center gap-2">
                            <i class="fas fa-plus"></i> Tambah Mesin
                        </button>
                    </div>
                </div>
            </div>

            <!-- Machine Table Card -->
            <div class="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
                <div class="overflow-x-auto">
                    <table class="w-full text-left border-collapse" id="machine_table">
                        <thead class="bg-slate-50/50 border-b border-slate-100">
                            <tr>
                                <th class="py-4 px-5 text-[10px] font-black text-slate-400 uppercase tracking-widest w-24">Kode</th>
                                <th class="py-4 px-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Informasi Mesin</th>
                                <th class="py-4 px-5 text-[10px] font-black text-slate-400 uppercase tracking-widest w-32">Kapasitas</th>
                                <th class="py-4 px-5 text-[10px] font-black text-slate-400 uppercase tracking-widest w-32">Status</th>
                                <th class="py-4 px-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right w-40">Opsi</th>
                            </tr>
                        </thead>
                        <tbody id="machine_table_body" class="divide-y divide-slate-50">
                            ${renderMachineRows(machines)}
                        </tbody>
                    </table>
                </div>
                <div id="machine_empty_state" class="${machines.length === 0 ? '' : 'hidden'} py-20 flex flex-col items-center justify-center text-center">
                    <div class="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center text-slate-300 mb-4 text-2xl">
                        <i class="fas fa-cogs"></i>
                    </div>
                    <p class="text-sm font-medium text-slate-500">Belum ada data mesin.</p>
                </div>
            </div>
        </div>`;
};

window.renderMachineRows = (machines) => {
    if (machines.length === 0) return '';
    
    return machines.map(m => {
        const isMaintenance = m.status === 'MAINTENANCE';
        const isActive = m.status === 'ACTIVE';

        let statusClass = 'bg-slate-100 text-slate-500';
        if (isActive) statusClass = 'bg-green-50 text-green-700 border border-green-200/50 shadow-[0_1px_2px_rgba(0,0,0,0.05)]';
        if (isMaintenance) statusClass = 'bg-amber-50 text-amber-700 border border-amber-200/50 shadow-[0_1px_2px_rgba(0,0,0,0.05)]';
        
        // Use initial letters for the avatar
        const initials = m.name ? m.name.substring(0,2).toUpperCase() : 'MC';

        return `
        <tr class="hover:bg-slate-50/80 transition-colors group">
            <td class="py-4 px-5 font-mono font-bold text-slate-400 uppercase tracking-widest text-[10px]">${m.code}</td>
            <td class="py-4 px-5">
                <div class="flex items-center gap-3">
                    <div class="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center text-xs font-bold shrink-0">
                        ${initials}
                    </div>
                    <div class="flex flex-col">
                        <span class="font-bold text-slate-800">${m.name}</span>
                        <span class="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-0.5">${m.type || 'EXTRUDER'}</span>
                    </div>
                </div>
            </td>
            <td class="py-4 px-5">
                <div class="text-[11px] font-black text-slate-600 uppercase tracking-widest">
                    ${m.capacity || '-'} <span class="text-[9px] text-slate-400 ml-0.5">KG/Batch</span>
                </div>
            </td>
            <td class="py-4 px-5">
                <span class="px-2.5 py-1 rounded-md text-[10px] font-bold uppercase ${statusClass}">
                    ${m.status || 'Active'}
                </span>
            </td>
            <td class="py-4 px-5 text-right">
                <div class="flex justify-end gap-2 transition-opacity">
                    <button onclick="openAddMachineModal('${m.id}')" class="w-8 h-8 rounded-lg bg-slate-100 text-slate-500 hover:bg-blue-50 hover:text-blue-600 transition-all" title="Edit Mesin"><i class="fas fa-edit text-xs"></i></button>
                    <button onclick="deleteMachine('${m.id}')" class="w-8 h-8 rounded-lg bg-slate-100 text-slate-500 hover:bg-red-50 hover:text-red-600 transition-all" title="Hapus Permanen"><i class="fas fa-trash text-xs"></i></button>
                </div>
            </td>
        </tr>`;
    }).join('');
};

window.filterMachineList = () => {
    const search = document.getElementById('mch_search')?.value.toLowerCase() || '';
    const machines = db.read('machines') || [];
    
    const filtered = machines.filter(m => {
        return !search || 
            (m.name || '').toLowerCase().includes(search) || 
            (m.code || '').toLowerCase().includes(search) ||
            (m.type || '').toLowerCase().includes(search);
    });

    const tbody = document.getElementById('machine_table_body');
    const emptyState = document.getElementById('machine_empty_state');
    
    if (filtered.length === 0) {
        tbody.innerHTML = '';
        emptyState.classList.remove('hidden');
    } else {
        tbody.innerHTML = renderMachineRows(filtered);
        emptyState.classList.add('hidden');
    }
};

window.openAddMachineModal = (id = null) => {
    const m = id ? db.findById('machines', id) : null;
    const body = `
        <div class="space-y-6 pt-2">
            <!-- Row 1: Basic Information in 4 Columns (Sales Style) -->
            <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                    <label class="block text-[11px] font-bold text-gray-700 mb-1">Nama Mesin <span class="text-red-500 text-[10px] font-normal italic">(Wajib)</span></label>
                    <input type="text" id="mch_name" value="${m ? m.name : ''}" 
                        class="w-full border border-gray-300 rounded px-3 py-2 text-sm bg-white focus:border-blue-500 outline-none" 
                        placeholder="Ketik nama mesin...">
                </div>
                <div>
                    <label class="block text-[11px] font-bold text-gray-700 mb-1">Kapasitas Mesin <span class="text-gray-400 text-[9px] font-normal">(KG/Batch)</span></label>
                    <input type="number" id="mch_capacity" value="${m ? (m.capacity || '') : ''}" 
                        class="w-full border border-gray-300 rounded px-3 py-2 text-sm bg-white focus:border-blue-500 outline-none" 
                        placeholder="0">
                </div>
                <div>
                    <label class="block text-[11px] font-bold text-gray-700 mb-1">Kategori / Tipe <span class="text-red-500 text-[10px] font-normal italic">(Wajib)</span></label>
                    <select id="mch_type" class="w-full border border-gray-300 rounded px-3 py-2 text-sm bg-white focus:border-blue-500 outline-none">
                        <option value="EXTRUDER" ${m?.type === 'EXTRUDER' ? 'selected' : ''}>EXTRUDER</option>
                        <option value="OVEN"     ${m?.type === 'OVEN' ? 'selected' : ''}>OVEN</option>
                    </select>
                </div>
                <div>
                    <label class="block text-[11px] font-bold text-gray-700 mb-1">Status Operasi</label>
                    <select id="mch_status" class="w-full border border-gray-300 rounded px-3 py-2 text-sm bg-white focus:border-blue-500 outline-none">
                        <option value="ACTIVE"      ${m?.status === 'ACTIVE' ? 'selected' : ''}>ACTIVE</option>
                        <option value="MAINTENANCE" ${m?.status === 'MAINTENANCE' ? 'selected' : ''}>MAINTENANCE</option>
                        <option value="INACTIVE"    ${m?.status === 'INACTIVE' ? 'selected' : ''}>INACTIVE</option>
                    </select>
                </div>
            </div>

            <!-- Optional: Detailed Technical Settings Section (Following Sales design) -->
            <div class="border-t border-gray-100 pt-6 mt-6">
                <h4 class="text-sm font-bold text-gray-800 mb-4 flex items-center gap-2">
                    <i class="fas fa-tools text-gray-400"></i> Informasi Tambahan & Catatan
                </h4>
                <div class="space-y-4">
                    <div>
                        <label class="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5 ml-1">KETERANGAN / NOTES</label>
                        <textarea id="mch_notes" rows="3" class="w-full border border-gray-300 rounded-lg p-4 text-sm bg-gray-50 focus:bg-white focus:border-blue-500 outline-none transition-all" placeholder="Tambahkan catatan teknis atau spesifikasi khusus di sini...">${m?.notes || ''}</textarea>
                    </div>
                </div>
            </div>
        </div>`;

    const footer = `
        <div class="flex items-center justify-end gap-3 w-full">
            <button onclick="closeModal()" class="px-6 py-2 border border-gray-300 rounded text-sm font-medium text-gray-600 hover:bg-gray-50 transition-all">Batal</button>
            <button onclick="saveMachine('${id || ''}')" class="px-10 py-2 bg-blue-600 border border-blue-700 rounded text-sm font-bold text-white hover:bg-blue-700 shadow-sm transition-all active:scale-95">
                ${m ? 'Update Perubahan' : 'Simpan Mesin Baru'}
            </button>
        </div>`;

    showModal(m ? 'Edit Data Mesin' : 'Tambah Mesin Baru', body, footer, 'full');
};

window.saveMachine = (id = null) => {
    const name = document.getElementById('mch_name')?.value.trim();
    const capacity = document.getElementById('mch_capacity')?.value;
    const type = document.getElementById('mch_type')?.value;
    const status = document.getElementById('mch_status')?.value;
    const notes = document.getElementById('mch_notes')?.value;

    if (!name) { showToast('Nama mesin wajib diisi', 'error'); return; }

    if (id) {
        // Update
        const machines = db.read('machines');
        const idx = machines.findIndex(m => m.id === id);
        if (idx !== -1) {
            machines[idx].name = name;
            machines[idx].capacity = capacity;
            machines[idx].type = type;
            machines[idx].status = status;
            machines[idx].notes = notes;
            db.save('machines', machines);
            showToast(`Data ${name} diperbarui!`, 'success');
        }
    } else {
        // Insert
        const code = db.generateMachineCode();
        const newMch = {
            id: 'mch_' + Date.now(),
            code,
            name,
            capacity,
            type,
            status: status || 'ACTIVE',
            createdAt: new Date().toISOString()
        };
        db.insert('machines', newMch);
        showToast(`Mesin ${name} berhasil didaftarkan`, 'success');
    }

    closeModal();
    renderMachineMaster();
};

window.deleteMachine = (id) => {
    if (!confirm('Yakin ingin menghapus data mesin ini?')) return;
    db.delete('machines', id);
    showToast('Mesin berhasil dihapus', 'success');
    renderMachineMaster();
};

window.toggleMachineStatus = (id) => {
    const machines = db.read('machines');
    const idx = machines.findIndex(m => m.id === id);
    if (idx === -1) return;

    machines[idx].status = machines[idx].status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    db.save('machines', machines);
    showToast(`Status mesin berhasil diubah`, 'success');
    renderMachineMaster();
};

// --- MASTER STOK PRODUKSI (Mirip Inventory) ---
window.renderProductionStockMaster = () => {
    const canEdit = getModulePermission('produksi').edit;
    renderBreadcrumb(['Produksi', 'Master', 'Stock Master']);
    document.getElementById('pageTitle').innerText = 'Stok Produksi';
    const mc = document.getElementById('main-content');
    
    // Persist filters
    window._prodStockFilters = window._prodStockFilters || { q: '', cat: '' };
    const f = window._prodStockFilters;

    let items = (db.read('inventoryItems') || []).filter(it => it.status === 'ACTIVE');
    
    // Default categories for production if no filter: Raw, WIP, FG
    const prodCats = ['RAW_MATERIAL', 'OVEN_BASAH_STOCK', 'OVEN_KERING_STOCK', 'FINISHED_GOODS', 'BULK_STOCK'];
    
    // Apply Filters
    if (f.cat) {
        items = items.filter(it => it.category === f.cat);
    } else {
        // Only show production relevant if no category selected
        items = items.filter(it => prodCats.includes(it.category));
    }

    if (f.q) {
        const q = f.q.toLowerCase();
        items = items.filter(it => it.itemName.toLowerCase().includes(q) || (it.itemCode && it.itemCode.toLowerCase().includes(q)));
    }

    const catLabels = {
        RAW_MATERIAL: 'Bahan Baku',
        OVEN_BASAH_STOCK: 'Oven Basah',
        OVEN_KERING_STOCK: 'Oven Kering',
        BULK_STOCK: 'Stok Curah',
        FINISHED_GOODS: 'Gudang Jadi'
    };

    const catOpts = Object.entries(catLabels)
        .map(([v, l]) => `<option value="${v}" ${f.cat === v ? 'selected' : ''}>${l}</option>`)
        .join('');

    mc.innerHTML = `
    <div class="space-y-4 animate-in fade-in duration-500">
        <!-- Compact Filter Bar -->
        <div class="bg-white rounded-xl shadow-sm border border-slate-100 p-5">
            <div class="flex flex-wrap items-center gap-4">
                <!-- Search Input -->
                <div class="flex-1 min-w-[250px] relative group">
                    <i class="fas fa-search absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-blue-500 transition-colors"></i>
                    <input type="text" id="filter_prodStock_q" onkeyup="applyProdStockFilters()" value="${f.q}" placeholder="Search Code or Item Name..." 
                        class="w-full pl-12 pr-4 py-2.5 bg-slate-50 border border-transparent rounded-xl text-sm font-semibold text-slate-700 placeholder:text-slate-300 focus:bg-white focus:border-blue-300 focus:ring-4 focus:ring-blue-500/5 outline-none transition-all">
                </div>

                <!-- Category Filter -->
                <div class="relative min-w-[180px]">
                    <i class="fas fa-filter absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 pointer-events-none"></i>
                    <select id="filter_prodStock_cat" onchange="applyProdStockFilters()" 
                        class="w-full pl-11 pr-10 py-2.5 bg-slate-50 border border-transparent rounded-xl text-sm font-bold text-slate-700 appearance-none cursor-pointer focus:bg-white focus:border-blue-300 focus:ring-4 focus:ring-blue-500/5 transition-all outline-none">
                        <option value="">All Categories</option>
                        ${catOpts}
                    </select>
                    <i class="fas fa-chevron-down absolute right-4 top-1/2 -translate-y-1/2 text-slate-300 pointer-events-none text-[10px]"></i>
                </div>

                <!-- Actions -->
                <div class="flex gap-3 ml-auto">
                    <button class="bg-white border border-slate-200 text-slate-600 px-4 py-2.5 rounded-xl hover:bg-slate-50 transition-all text-xs font-bold flex items-center gap-2">
                        <i class="fas fa-file-export text-green-500"></i> Export List
                    </button>
                    ${canEdit ? `
                    <button onclick="renderInventoryItemForm()" class="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl transition-all text-sm font-bold shadow-lg shadow-blue-500/20 flex items-center gap-2">
                        <i class="fas fa-plus"></i> New Item
                    </button>
                    ` : ''}
                    <button onclick="resetProdStockFilters()" class="bg-white border border-slate-200 text-slate-600 px-5 py-2.5 rounded-xl hover:bg-slate-50 transition-all text-sm font-bold" title="Refresh">
                        <i class="fas fa-sync-alt"></i>
                    </button>
                </div>
            </div>
        </div>

        <!-- Master Item Table Card -->
        <div class="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
            <div class="overflow-x-auto">
                <table class="w-full text-left" id="prod_stock_table">
                    <thead class="bg-slate-50/50 border-b border-slate-100">
                        <tr>
                            <th class="py-4 px-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Item Information</th>
                            <th class="py-4 px-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Category</th>
                            <th class="py-4 px-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Unit</th>
                            <th class="py-4 px-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Stock</th>
                            <th class="py-4 px-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Min Stock</th>
                            <th class="py-4 px-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Status</th>
                            <th class="py-4 px-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody id="prod_stock_table_body" class="divide-y divide-slate-50">
                        ${renderProductionStockRows(items)}
                    </tbody>
                </table>
            </div>
            
            <div class="p-4 bg-slate-50/50 border-t border-slate-100 flex justify-between items-center">
                <span class="text-[10px] font-black text-slate-400 uppercase tracking-widest">Showing ${items.length} Production Items</span>
            </div>

            <div id="prod_stock_empty_state" class="${items.length === 0 ? '' : 'hidden'} py-20 flex flex-col items-center justify-center text-center">
                <div class="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center text-slate-300 mb-4 text-2xl">
                    <i class="fas fa-boxes"></i>
                </div>
                <p class="text-sm font-medium text-slate-500">No items found matching your filters.</p>
            </div>
        </div>
    </div>`;
};

window.renderProductionStockRows = (items) => {
    const canEdit = getModulePermission('produksi').edit;
    if (items.length === 0) return '';
    
    const catLabels = {
        RAW_MATERIAL: 'Bahan Baku',
        OVEN_BASAH_STOCK: 'Oven Basah',
        OVEN_KERING_STOCK: 'Oven Kering',
        BULK_STOCK: 'Stok Curah',
        FINISHED_GOODS: 'Gudang Jadi'
    };
    const catColors = {
        RAW_MATERIAL: 'bg-yellow-100 text-yellow-800',
        OVEN_BASAH_STOCK: 'bg-orange-100 text-orange-800',
        OVEN_KERING_STOCK: 'bg-yellow-100 text-yellow-800',
        BULK_STOCK: 'bg-indigo-100 text-indigo-800',
        FINISHED_GOODS: 'bg-green-100 text-green-800'
    };

    return items.map(it => {
        const stock = db.getInventoryStock(it.id);
        const isLow = stock < (it.minStock || 0);
        const isActive = it.status !== 'INACTIVE';
        
        return `
        <tr class="hover:bg-slate-50/80 transition-colors group ${isLow ? 'bg-red-50/10' : ''}">
            <td class="py-4 px-5">
                <div class="flex items-center gap-3">
                    <div class="w-8 h-8 rounded-lg ${isLow ? 'bg-red-50 text-red-500' : 'bg-blue-50 text-blue-600'} flex items-center justify-center text-[10px] font-black shrink-0 border border-black/5">
                        <i class="fas fa-cube"></i>
                    </div>
                    <div>
                        <div class="text-sm font-bold text-slate-800 flex items-center gap-2">
                            ${it.itemName}
                            ${isLow ? '<span class="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" title="Low Stock"></span>' : ''}
                        </div>
                        <div class="text-[11px] text-slate-400 font-mono font-medium">${it.itemCode || '-'}</div>
                    </div>
                </div>
            </td>
            <td class="py-4 px-5">
                <span class="px-2.5 py-1 rounded-lg text-[10px] font-bold ${catColors[it.category] || 'bg-slate-100 text-slate-600'} border border-black/5 shadow-sm">
                    ${catLabels[it.category] || it.category}
                </span>
            </td>
            <td class="py-4 px-5 text-[11px] font-black text-slate-400 uppercase tracking-widest text-center">${it.unit}</td>
            <td class="py-4 px-5 text-sm text-right font-black ${isLow ? 'text-red-600' : 'text-slate-800'}">
                ${prodFmt(stock)}
            </td>
            <td class="py-4 px-5 text-sm text-right text-slate-400 font-bold">${prodFmt(it.minStock)}</td>
            <td class="py-4 px-5">
                <div class="flex items-center gap-2">
                    <span class="w-1.5 h-1.5 rounded-full ${isActive ? 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.3)]' : 'bg-slate-300'}"></span>
                    <span class="text-[10px] font-bold ${isActive ? 'text-green-600' : 'text-slate-400'} uppercase tracking-widest">${isActive ? 'Active' : 'Non-Active'}</span>
                </div>
            </td>
            <td class="py-4 px-5 text-right">
                ${canEdit ? `
                <div class="flex justify-end">
                    <div class="relative" onmouseenter="this.querySelector('.dropdown-menu').classList.remove('hidden')" onmouseleave="this.querySelector('.dropdown-menu').classList.add('hidden')">
                        <button class="flex items-center gap-2 px-3 py-1.5 rounded-[10px] border border-slate-200 text-slate-700 bg-[#f8fafc] hover:bg-slate-100 transition-colors text-[12px] font-bold shadow-sm whitespace-nowrap">
                            Pilih Aksi...
                            <i class="fas fa-chevron-down text-[10px] text-slate-400"></i>
                        </button>
                        <div class="dropdown-menu hidden absolute right-0 top-full mt-1 w-40 bg-white rounded-xl shadow-[0_4px_20px_-4px_rgba(0,0,0,0.1)] border border-slate-100 z-[99] overflow-hidden text-left">
                            <div class="py-1 flex flex-col">
                                <button onclick="renderInventoryItemForm('${it.id}')" class="text-left px-4 py-2 text-xs font-bold text-slate-600 hover:text-blue-600 hover:bg-blue-50/50 flex items-center gap-2 transition-colors">
                                    <i class="fas fa-edit w-4"></i> Edit Item
                                </button>
                                <button onclick="openStockAdjustmentModal('${it.id}')" class="text-left px-4 py-2 text-xs font-bold text-slate-600 hover:text-blue-600 hover:bg-blue-50/50 flex items-center gap-2 transition-colors">
                                    <i class="fas fa-sync-alt w-4"></i> Penyesuaian Stok
                                </button>
                                <button onclick="toggleInventoryItemStatus('${it.id}')" class="text-left px-4 py-2 text-xs font-bold text-slate-600 hover:text-blue-600 hover:bg-blue-50/50 flex items-center gap-2 transition-colors">
                                    <i class="fas fa-power-off w-4"></i> ${isActive ? 'Non-Aktifkan' : 'Aktifkan'}
                                </button>
                                <div class="border-t border-slate-50 my-1"></div>
                                <button onclick="deleteInventoryItem('${it.id}')" class="text-left px-4 py-2 text-xs font-bold text-red-500 hover:bg-red-50 flex items-center gap-2 transition-colors">
                                    <i class="fas fa-trash-alt w-4"></i> Hapus Item
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
                ` : '<span class="text-[10px] font-black text-slate-300 uppercase italic">View Only</span>'}
            </td>
        </tr>
        `;
    }).join('');
};

window.applyProdStockFilters = () => {
    window._prodStockFilters = {
        q: document.getElementById('filter_prodStock_q')?.value || '',
        cat: document.getElementById('filter_prodStock_cat')?.value || ''
    };
    renderProductionStockMaster();
};

window.resetProdStockFilters = () => {
    window._prodStockFilters = { q: '', cat: '' };
    renderProductionStockMaster();
};



