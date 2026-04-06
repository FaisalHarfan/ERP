// production.js - Modul Produksi 5 Tahap (2-Step Process: Start -> Finish)
// Tahap: MIXING → EXTRUDER → OVEN_BASAH → OVEN_KERING → FINISH_GOOD

const PROD_STAGES = [
    { key: 'MIXING',       label: 'Mixing',       icon: 'fas fa-blender',      color: 'bg-blue-50 text-blue-600',   hasStock: true,  hasShrinkage: false, inputFrom: 'RAW_MATERIAL' },
    { key: 'OVEN_BASAH',   label: 'Oven Basah',   icon: 'fas fa-fire',         color: 'bg-orange-50 text-orange-600', hasStock: true, hasShrinkage: true,  inputFrom: 'MIXING' }, 
    { key: 'OVEN_KERING',  label: 'Oven Kering',  icon: 'fas fa-sun',          color: 'bg-yellow-50 text-yellow-600', hasStock: true, hasShrinkage: true,  inputFrom: 'OVEN_BASAH' },
];

const STAGE_LOCATIONS = {
    RAW_MATERIAL: 'WHS',
    MIXING: 'MIXING',
    OVEN_BASAH: 'OVEN_BASAH',
    OVEN_KERING: 'OVEN_KERING'
};

const MACHINE_CAPACITY = {
    OVEN_BASAH: 50, // Kapasitas max per batch dlm Kg
    OVEN_KERING: 40
};

const STAGE_STOCK_CATEGORY = {
    MIXING:      ['MIXING_STOCK'],
    OVEN_BASAH:  ['OVEN_BASAH_STOCK'],
    OVEN_KERING: ['FINISHED_GOODS']
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
        MIXING:      'bg-blue-100 text-blue-700',
        OVEN_BASAH:  'bg-orange-100 text-orange-700',
        OVEN_KERING: 'bg-yellow-100 text-yellow-700',
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

// ─── DASHBOARD: VISUAL PIPELINE ──────────────────────────────
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
                    <p class="text-[10px] text-slate-400">#${mo.moNumber} • ${new Date(mo.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</p>
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

    mc.innerHTML = `
        <div class="mb-6 flex justify-between items-end border-b border-slate-100 pb-4">
            <div>
                <p class="text-xs text-slate-400 font-bold uppercase tracking-widest mb-1">Status Produksi</p>
                <div class="flex items-center gap-4">
                    ${PROD_STAGES.map(s => `<span class="text-sm font-bold text-slate-700 flex items-center gap-2"><i class="fas fa-circle text-[8px] opacity-20"></i> ${s.label}</span>`).join('')}
                </div>
            </div>
            <div class="flex gap-2">
                <button onclick="renderProductionReports()" class="px-4 py-2 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-600 hover:bg-slate-50">Laporan</button>
                <button onclick="renderProductionMO()" class="px-4 py-2 bg-blue-600 text-white rounded-lg text-xs font-bold shadow-sm hover:bg-blue-700">Riwayat MO</button>
            </div>
        </div>
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            ${dashboardCards}
        </div>
    `;
};

// ─── DAFTAR MO ───────────────────────────────────────────────
window.renderProductionMO = () => {
    const canEdit = getModulePermission('produksi').edit;
    document.getElementById('pageTitle').innerText = 'Manufacturing Order ( MO )';
    const mc = document.getElementById('main-content');
    const mos = db.read('productionOrders') || [];

    // Initialize filter state if not exists
    window._prodFilters = window._prodFilters || {
        start: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0],
        end: new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).toISOString().split('T')[0],
        stage: '',
        status: '',
        product: ''
    };
    const f = window._prodFilters;
    const searchDone = window._prodSearchPerformed || false;

    const filtered = mos.filter(m => {
        if (f.stage && m.stage !== f.stage) return false;
        if (f.status && m.status !== f.status) return false;
        if (f.product && m.productId !== f.product) return false;
        if (f.start && f.end) {
            const moDate = new Date(m.date);
            moDate.setHours(0,0,0,0);
            const startD = new Date(f.start); startD.setHours(0,0,0,0);
            const endD = new Date(f.end); endD.setHours(23,59,59,999);
            if (moDate < startD || moDate > endD) return false;
        }
        return true;
    }).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    const stageOpts = PROD_STAGES.map(s =>
        `<option value="${s.key}" ${f.stage === s.key ? 'selected' : ''}>${s.label}</option>`).join('');

    const invItems = db.read('inventoryItems') || [];
    const productOpts = invItems.filter(i => i.category === 'FINISHED_GOODS' || i.category === 'WIP').map(i => 
        `<option value="${i.id}" ${f.product === i.id ? 'selected' : ''}>${i.itemName}</option>`).join('');

    // Group by Date for cleaner view
    const groups = {};
    filtered.forEach(mo => {
        const d = new Date(mo.date).toDateString();
        if (!groups[d]) groups[d] = [];
        groups[d].push(mo);
    });
    const sortedDates = Object.keys(groups).sort((a,b) => new Date(b) - new Date(a));

    let tableRows = "";
    if (!searchDone) {
        tableRows = `<tr><td colspan="7" class="py-20 text-center text-slate-400 font-medium">
            <div class="flex flex-col items-center gap-2">
                <i class="fas fa-search text-3xl opacity-20 mb-2"></i>
                <p class="text-sm">Silakan gunakan filter di atas lalu klik <span class="font-black text-slate-600">"Tampilkan Data"</span></p>
                <p class="text-[10px] text-slate-300 uppercase tracking-widest font-black">Data MO akan muncul di sini</p>
            </div>
        </td></tr>`;
    } else if (filtered.length === 0) {
        tableRows = `<tr><td colspan="7" class="py-20 text-center text-slate-300 italic text-sm">Belum ada perintah produksi (MO) ditemukan.</td></tr>`;
    } else {
        sortedDates.forEach(dateKey => {
            const dateObj = new Date(dateKey);
            const displayDate = dateObj.toLocaleDateString('id-ID', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' });
            
            tableRows += `
                <tr class="bg-slate-50/10">
                    <td colspan="7" class="py-3 px-6 text-[10px] font-black text-slate-500 uppercase tracking-widest border-y border-slate-50 bg-slate-50/30">
                        <div class="flex items-center gap-2">
                            <i class="fas fa-calendar-day text-blue-500"></i>
                            <span>${displayDate}</span>
                        </div>
                    </td>
                </tr>
            `;
            
            groups[dateKey].forEach(mo => {
                tableRows += `
                <tr class="border-b border-slate-50 hover:bg-slate-50/50 transition-all text-sm group">
                    <td class="py-4 px-6 font-mono font-bold text-blue-600 cursor-pointer hover:underline" onclick="viewProductionMO('${mo.id}')">${mo.moNumber}</td>
                    <td class="py-4 px-4">
                        <span class="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${prodStageColor(mo.stage)}">${prodStageLabel(mo.stage)}</span>
                    </td>
                    <td class="py-4 px-4">
                        <div class="text-[11px] font-bold text-slate-500 italic uppercase tracking-tighter">${mo.machineName || '-'}</div>
                    </td>
                    <td class="py-4 px-4">
                        <div class="font-bold text-slate-800 text-xs">${mo.productName || '-'}</div>
                    </td>
                    <td class="py-4 px-4 text-center">
                        ${mo.shift ? `<span class="text-blue-600 font-black font-mono text-sm tracking-tighter">${mo.shift}</span>` : '<span class="text-slate-300">-</span>'}
                    </td>
                    <td class="py-4 px-4">
                        <span class="px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-widest ${prodStatusColor(mo.status)}">
                            ${mo.status === 'DONE' ? 'Selesai' : 'Proses'}
                        </span>
                    </td>
                    <td class="py-4 px-6 text-right whitespace-nowrap">
                        <div class="flex justify-end gap-1.5 transition-all">
                            <button onclick="printProductionMO('${mo.id}')" class="p-1.5 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all" title="Cetak MO"><i class="fas fa-print text-sm"></i></button>
                            <button onclick="viewProductionMO('${mo.id}')" class="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-all" title="Detail"><i class="fas fa-eye text-sm"></i></button>
                            ${mo.status === 'IN_PROGRESS' && canEdit ? `
                            <button onclick="openCompleteMOModal('${mo.id}')" class="bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest shadow-sm active:scale-95 ml-1">Selesai</button>` : ''}
                            ${mo.status !== 'DONE' && canEdit ? `
                            <button onclick="deleteMO('${mo.id}')" class="p-1.5 text-rose-600 hover:bg-rose-50 rounded-lg transition-all" title="Hapus"><i class="fas fa-trash text-sm"></i></button>` : ''}
                        </div>
                    </td>
                </tr>`;
            });
        });
    }

    mc.innerHTML = `
        <div class="flex flex-col gap-6 animate-in fade-in duration-500">
            <!-- Header Section -->
            <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h2 class="text-2xl font-black text-slate-800 tracking-tight">Perintah Produksi</h2>
                    <p class="text-xs text-slate-500 font-medium italic">Manajemen Manufacturing Order (MO)</p>
                </div>
                ${canEdit ? `
                <button onclick="openMOModal()" class="w-full sm:w-auto bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-xl text-xs font-black flex items-center justify-center gap-2 shadow-lg shadow-green-100 uppercase tracking-widest transition-all active:scale-95 group">
                    <i class="fas fa-plus group-hover:rotate-90 transition-transform"></i> Mulai Produksi Baru
                </button>` : ''}
            </div>

            <!-- Filter Section -->
            <div class="bg-white rounded-2xl shadow-sm border border-slate-100 p-4 transition-all border-l-4 border-l-blue-500">
                <div class="flex items-center gap-2 mb-4">
                    <div class="w-6 h-6 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600">
                        <i class="fas fa-filter text-[10px]"></i>
                    </div>
                    <h3 class="text-[11px] font-black text-slate-800 uppercase tracking-widest">Kriteria Pencarian</h3>
                </div>
                
                <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 items-end">
                    <div class="space-y-1.5">
                        <label class="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Dari Tanggal</label>
                        <input type="date" id="prod_f_start" value="${f.start}" class="w-full border-2 border-slate-100 rounded-xl px-4 py-2.5 text-sm font-bold bg-slate-50 focus:bg-white focus:border-blue-500 outline-none transition-all">
                    </div>
                    <div class="space-y-1.5">
                        <label class="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Sampai Tanggal</label>
                        <input type="date" id="prod_f_end" value="${f.end}" class="w-full border-2 border-slate-100 rounded-xl px-4 py-2.5 text-sm font-bold bg-slate-50 focus:bg-white focus:border-blue-500 outline-none transition-all">
                    </div>
                    <div class="space-y-1.5">
                        <label class="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Tahap Produksi</label>
                        <select id="prod_f_stage" class="w-full border-2 border-slate-100 rounded-xl px-4 py-2.5 text-sm font-bold bg-slate-50 focus:bg-white focus:border-blue-500 outline-none transition-all cursor-pointer">
                            <option value="">-- SEMUA TAHAP --</option>${stageOpts}
                        </select>
                    </div>
                    <div class="space-y-1.5">
                        <label class="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Produk Jadi / WIP</label>
                        <select id="prod_f_product" class="w-full border-2 border-slate-100 rounded-xl px-4 py-2.5 text-sm font-bold bg-slate-50 focus:bg-white focus:border-blue-500 outline-none transition-all cursor-pointer">
                            <option value="">-- SEMUA PRODUK --</option>${productOpts}
                        </select>
                    </div>
                </div>

                <div class="mt-4 pt-4 border-t border-slate-50 flex flex-col sm:flex-row justify-between items-center gap-4">
                    <button onclick="resetProdFilter()" class="text-[9px] font-black text-slate-400 hover:text-slate-600 uppercase tracking-widest flex items-center gap-2 transition-all">
                        <i class="fas fa-redo-alt text-[10px]"></i> Reset Filter
                    </button>
                    <button onclick="applyProdFilter()" class="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white px-8 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all active:scale-95 shadow-lg shadow-blue-100 flex items-center justify-center gap-2">
                        <i class="fas fa-search"></i> Tampilkan Data
                    </button>
                </div>
            </div>

            <!-- List Section -->
            <div class="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden transition-all">
                <div class="p-6 border-b border-slate-50 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 bg-slate-50/30">
                    <div class="flex items-center gap-3">
                        <div class="w-1.5 h-6 bg-blue-500 rounded-sm"></div>
                        <h3 class="text-sm font-black text-slate-800 uppercase tracking-widest">Daftar Perintah Produksi</h3>
                    </div>
                    <span class="px-3 py-1 bg-white border-2 border-slate-100 rounded-lg text-[10px] font-black text-slate-500 uppercase tracking-widest">
                        Total: ${filtered.length} MO
                    </span>
                </div>
                <div class="overflow-x-auto">
                    <table class="w-full text-left border-collapse">
                        <thead>
                            <tr class="bg-slate-50/50 text-slate-400 border-b border-slate-100">
                                <th class="py-5 px-6 text-[10px] font-black uppercase tracking-widest">Nomor MO</th>
                                <th class="py-5 px-4 text-[10px] font-black uppercase tracking-widest">Tahap</th>
                                <th class="py-5 px-4 text-[10px] font-black uppercase tracking-widest">Mesin/Alat</th>
                                <th class="py-5 px-4 text-[10px] font-black uppercase tracking-widest">Produk</th>
                                <th class="py-5 px-4 text-center text-[10px] font-black uppercase tracking-widest">Shift</th>
                                <th class="py-5 px-4 text-[10px] font-black uppercase tracking-widest">Status</th>
                                <th class="py-5 px-6 text-right text-[10px] font-black uppercase tracking-widest">Opsi</th>
                            </tr>
                        </thead>
                        <tbody class="divide-y divide-slate-50">${tableRows}</tbody>
                    </table>
                </div>
            </div>
        </div>`;
};

window.applyProdFilter = () => {
    window._prodSearchPerformed = true;
    window._prodFilters = {
        start: document.getElementById('prod_f_start')?.value || '',
        end: document.getElementById('prod_f_end')?.value || '',
        stage: document.getElementById('prod_f_stage')?.value || '',
        status: document.getElementById('prod_f_status')?.value || '',
        product: document.getElementById('prod_f_product')?.value || ''
    };
    renderProductionMO();
};

window.resetProdFilter = () => {
    window._prodSearchPerformed = false;
    window._prodFilters = {
        start: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0],
        end: new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).toISOString().split('T')[0],
        stage: '',
        status: '',
        product: ''
    };
    renderProductionMO();
};

// ─── STEP 1: MULAI MO (START) ───────────────────────────────
window.openMOModal = (stagePreset = '') => {
    const invItems = db.read('inventoryItems') || [];
    const stageOpts = PROD_STAGES.map(s =>
        `<option value="${s.key}" ${stagePreset === s.key ? 'selected' : ''}>${s.label}</option>`).join('');

    const boms = db.read('bomHeaders') || [];
    const bomOpts = boms.map(b => `<option value="${b.id}">${b.name}</option>`).join('');
    const machines = db.read('machines') || [];

    const body = `
    <div class="space-y-4">
        <!-- FIRST ROW: STAGE & DATE -->
        <div class="grid grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
                <label class="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Pilih Tahap <span class="text-red-500">*</span></label>
                <select id="mo_stage" onchange="updateMOForm()" class="w-full border-2 border-slate-200 rounded-lg px-3 py-2 text-sm bg-white font-black text-slate-800 focus:border-blue-500 outline-none transition-all">
                    <option value="">-- Pilih Tahap --</option>${stageOpts}
                </select>
            </div>
            <div id="mo_grp_date">
                <label class="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Tanggal Produksi <span class="text-red-500">*</span></label>
                <input type="date" id="mo_date" value="${new Date().toISOString().split('T')[0]}" onchange="recalcMONumber()" class="w-full border-2 border-slate-200 rounded-lg px-3 py-2 text-sm focus:border-blue-500 outline-none">
            </div>
            <div id="mo_grp_shift" class="hidden">
                <label class="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Shift <span class="text-red-500">*</span></label>
                <select id="mo_shift" class="w-full border-2 border-slate-200 rounded-lg px-3 py-2 text-sm bg-white font-black text-slate-800 focus:border-blue-500 outline-none transition-all">
                    <option value="1">Shift 1</option>
                    <option value="2">Shift 2</option>
                    <option value="3">Shift 3</option>
                </select>
            </div>
        </div>

        <!-- SECOND ROW: MO NUMBER & DYNAMIC FIELDS (BOM/MACHINE) -->
        <div class="grid grid-cols-2 gap-4">
            <div id="mo_grp_number">
                <label class="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Nomor MO <span class="text-red-500">*</span></label>
                <input type="text" id="mo_number_display" readonly class="w-full border-2 border-slate-100 rounded-lg px-3 py-2 text-sm font-black text-blue-600 bg-slate-50 font-mono">
            </div>
            <div id="mo_grp_bom">
                <label class="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Resep Produksi (BOM)</label>
                <select id="mo_bom_id" onchange="loadBOMMaterialsToMO()" class="w-full border-2 border-slate-200 rounded-lg px-3 py-2 text-sm bg-white focus:border-blue-500 outline-none">
                    <option value="">-- Tanpa Resep --</option>${bomOpts}
                </select>
            </div>
            <div id="mo_grp_machine" class="hidden">
                <label id="mo_machine_label" class="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Gunakan Mesin <span class="text-red-500">*</span></label>
                <select id="mo_machine_id" class="w-full border-2 border-slate-200 rounded-lg px-3 py-2 text-sm bg-white font-black text-slate-800 focus:border-blue-500 outline-none">
                    <option value="">-- Pilih Mesin/Oven --</option>
                    ${machines.filter(m => m.status === 'ACTIVE').map(m => `<option value="${m.id}" data-type="${m.type}">${m.name}</option>`).join('')}
                </select>
            </div>
        </div>
        
        <div id="mo_grp_product" class="grid grid-cols-1 gap-4">
            <div>
                <label class="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Pilih Produk <span class="text-red-500">*</span></label>
                <select id="mo_product_id" class="w-full border-2 border-slate-200 rounded-lg px-3 py-2 text-sm bg-white focus:border-blue-500 outline-none font-black text-slate-800">
                    <option value="">-- Pilih Produk Jadi --</option>
                    ${invItems.filter(i => i.category === 'FINISHED_GOODS' && i.status !== 'INACTIVE').map(i => `<option value="${i.id}">${i.itemName}</option>`).join('')}
                </select>
                <input type="hidden" id="mo_product">
            </div>
        </div>

        <div id="mo_dynamic_section" class="border-t border-slate-100 pt-4"></div>

        <div>
            <label class="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Catatan Tambahan</label>
            <textarea id="mo_notes" rows="1" class="w-full border-2 border-slate-100 rounded-lg px-3 py-2 text-sm focus:border-blue-500 outline-none" placeholder="Opsional..."></textarea>
        </div>
    </div>`;
    const footer = `
        <button onclick="startMO()" class="w-full sm:w-auto inline-flex justify-center rounded-lg bg-blue-600 px-8 py-2.5 text-white text-xs font-black uppercase tracking-widest hover:bg-blue-700 active:scale-95 transition-all">Mulai Produksi</button>
        <button onclick="closeModal()" class="mt-3 sm:mt-0 w-full sm:w-auto inline-flex justify-center rounded-lg border border-slate-200 px-8 py-2.5 bg-white text-slate-500 text-xs font-black uppercase tracking-widest hover:bg-slate-50 transition-all">Batal</button>`;

    showModal('Form Perintah Produksi', body, footer, 'full');

    // Define helper and listeners AFTER modal is in DOM
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

                // Auto-select WIP item matching the product name
                const wipSelect = document.getElementById('mo_input_item');
                if (!wipSelect) {
                    // Re-render updateMOForm if mo_input_item not found yet (dynamic section might be empty)
                    updateMOForm();
                }
                
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
        
        // 1. Initial category check: Match requested categories OR generic WIP
        const catMatch = cats.includes(i.category) || (i.category === 'WIP');
        if (!catMatch) return false;

        // 2. Name filtering: If nameFilter ("Mixing", "Oven Basah", etc.) is present, it MUST match
        if (nameFilter && !i.itemName.toLowerCase().includes(nameFilter.toLowerCase())) return false;

        // 3. Product ID filtering: 
        // - If we have a productId AND no nameFilter, strictly match productId.
        // - If we have both, prefer nameFilter (WIP items are often generic).
        if (productId && !nameFilter && i.productId && i.productId !== productId) return false;
        
        // 4. Exclude specific per-product mixing placeholders that aren't the main 'Stock Mixing'
        if (nameFilter === 'Mixing' && i.itemName.includes('(Mixing)') && i.itemName !== 'Stock Mixing') return false;
        
        return true;
    });
    const opts = filtered.map(i => {
        const stock = db.getInventoryStock(i.id);
        return `<option value="${i.id}">${i.itemName}${showStock ? ` (Stok: ${prodFmt(stock)} ${i.unit || 'Kg'})` : ''}</option>`;
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
    if (mchSelect) {
        for (let opt of mchSelect.options) { opt.classList.remove('hidden'); }
    }

    if (stage === 'MIXING') {
        grpBom?.classList.remove('hidden');
        grpMch?.classList.add('hidden');
        grpProd?.classList.remove('hidden');
        grpShift?.classList.add('hidden');
        
        const rmItems = invItems.filter(i => i.category === 'RAW_MATERIAL' && i.status !== 'INACTIVE');
        const rmOpts = rmItems.map(i => `<option value="${i.id}" data-unit="${i.unit}" data-stock="${db.getInventoryStock(i.id)}">${i.itemName} (Gudang: ${prodFmt(db.getInventoryStock(i.id))})</option>`).join('');
        sec.innerHTML = `
            <div class="bg-indigo-50 border-2 border-indigo-100 rounded-xl p-4">
                <h4 class="text-xs font-black text-indigo-800 mb-3 flex items-center justify-between uppercase tracking-widest">
                    <span><i class="fas fa-boxes mr-1"></i>Kebutuhan Bahan Baku</span>
                    <span class="text-[10px] lowercase font-normal italic">* stok campuran bisa bertambah karena air</span>
                </h4>
                <div class="flex items-center gap-2 mb-2 px-1 text-[9px] font-black text-slate-400 uppercase tracking-widest">
                    <div class="w-24">Lokasi</div>
                    <div class="flex-1">Bahan Baku</div>
                    <div class="w-28 text-center">Qty Target</div>
                    <div class="w-8"></div>
                </div>
                <div id="mo_rm_list" class="space-y-3"></div>
                <button type="button" onclick="addRMRowMO()" class="mt-3 text-[10px] font-black text-indigo-600 hover:text-indigo-800 bg-white border border-indigo-200 px-4 py-2 rounded-lg shadow-sm transition-all active:scale-95">
                    <i class="fas fa-plus mr-1"></i>Tambah Bahan Lagi
                </button>
                <select id="mo_rm_opts" class="hidden">${rmOpts}</select>
            </div>`;
        addRMRowMO();
        
        // Auto-load if BOM already selected
        const bomId = document.getElementById('mo_bom_id')?.value;
        if (bomId) setTimeout(() => loadBOMMaterialsToMO(), 50);

    } else {
        const stageInfo = PROD_STAGES.find(s => s.key === stage);
        const inputStoreCat = STAGE_STOCK_CATEGORY[stageInfo.inputFrom];
        const inputLabel = stageInfo.inputFrom === 'MIXING' ? 'Mixing' : stageInfo.inputFrom.replace('_', ' ');
        const productId = document.getElementById('mo_product_id')?.value;

        grpBom?.classList.add('hidden');
        grpMch?.classList.remove('hidden');
        grpProd?.classList.remove('hidden');
        grpShift?.classList.remove('hidden');
        if (mchLabel) mchLabel.innerText = "Gunakan " + (stage === 'OVEN_KERING' ? 'Oven' : 'Mesin');

        // Filter for OVEN_KERING
        if (stage === 'OVEN_KERING' && mchSelect) {
            for (let opt of mchSelect.options) {
                if (opt.value && opt.getAttribute('data-type') !== 'OVEN') opt.classList.add('hidden');
                else opt.classList.remove('hidden');
            }
        }

        sec.innerHTML = `
            <div class="bg-slate-50 border-2 border-slate-100 rounded-xl p-4">
                <div class="flex items-center gap-2 mb-4">
                    <div class="w-2 h-8 bg-blue-500 rounded-full"></div>
                    <div>
                        <h4 class="text-sm font-bold text-slate-800">Ambil Stok WIP ${inputLabel.replace('(', '').replace(')', '')}</h4>
                        <p class="text-[10px] text-slate-500 font-medium">Sisa stok akan tetap tersimpan sebagai <strong>Buffer Stock</strong>.</p>
                    </div>
                </div>
                <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                        <label class="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Jenis WIP</label>
                        ${buildItemSelect(inputStoreCat, 'mo_input_item', invItems, true, inputLabel, (stageInfo.inputFrom === 'MIXING' ? '' : productId))}
                    </div>
                    <div>
                        <label class="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Target Ambil (Kg)</label>
                        <input type="number" id="mo_input_qty" min="0" step="0.01" class="w-full border-2 border-slate-200 rounded-lg px-3 py-2 text-sm font-bold focus:border-blue-500 outline-none" placeholder="0.00" value="100">
                    </div>
                </div>
            </div>`;
    }
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
                <option value="MIXING">MIXING</option>
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
    const list = document.getElementById('mo_rm_list');
    if (list && list.children.length > 1) {
        btn.closest('.flex').remove();
    } else {
        showToast('Minimal harus ada 1 baris bahan', 'warning');
    }
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

window.startMO = () => {
    const stage = document.getElementById('mo_stage')?.value;
    const date = document.getElementById('mo_date')?.value;
    const shift = document.getElementById('mo_shift')?.value;
    const moNumber = document.getElementById('mo_number_display')?.value || ('MO-' + Date.now().toString().slice(-7));
    const productId = document.getElementById('mo_product_id')?.value;
    const productName = document.getElementById('mo_product')?.value.trim();
    const machineId = document.getElementById('mo_machine_id')?.value;
    const notes = document.getElementById('mo_notes')?.value.trim();

    // Required fields base
    let isValid = stage && date && productId && moNumber;
    let errorMsg = 'Lengkapi tahap, tanggal, dan pilih produk';

    // Machine is required for non-mixing stages if visible
    if (stage !== 'MIXING' && !machineId) {
        isValid = false;
        errorMsg = 'Silakan pilih mesin/oven yang digunakan';
    }

    if (!isValid) { 
        showToast(errorMsg, 'error'); 
        return; 
    }

    const inputItemId = document.getElementById('mo_input_item')?.value;
    const inputQty = parseFloat(document.getElementById('mo_input_qty')?.value) || 0;
    const takeDuration = document.getElementById('mo_take_duration')?.value || '-';

    const machine = machineId ? db.findById('machines', machineId) : null;
    let moData = { 
        moNumber, batchId: moNumber, stage, productId, productName, machineId, machineName: machine?.name || '-', picName: '', 
        shift: (stage === 'OVEN_BASAH' || stage === 'OVEN_KERING') ? shift : '',
        takeDuration: (stage === 'OVEN_BASAH' || stage === 'OVEN_KERING') ? takeDuration : '',
        date: new Date(date).toISOString(), notes, targetQty: 0, status: 'IN_PROGRESS', 
        createdAt: new Date().toISOString(), inputQty, inputItemId, outputQty: 0, shrinkagePct: 0, wasteQty: 0, qcStatus: 'PENDING' 
    };

    const validationErrors = [];

    if (stage === 'MIXING') {
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
                
                // VALIDATION: Check if enough stock
                if (currentStock < qty) {
                    validationErrors.push(`${item?.itemName || 'Item'}: Butuh ${prodFmt(qty)}, Tersisa ${prodFmt(currentStock)} ${item?.unit}`);
                }

                inputItems.push({ inventoryItemId: itemId, itemName: item?.itemName, qty, unit: item?.unit, location });
                totalInput += qty;
            }
        }

        if (validationErrors.length > 0) {
            const errorHtml = `<div class="text-left text-xs bg-red-50 p-3 rounded-lg border border-red-200 text-red-700 mt-2">
                <p class="font-bold mb-1 underline">STOK TIDAK CUKUP:</p>
                <ul class="list-disc list-inside space-y-1">
                    ${validationErrors.map(e => `<li>${e}</li>`).join('')}
                </ul>
                <p class="mt-2 italic opacity-75">* Silakan hubungi PUD atau lakukan mutasi stok terlebih dahulu.</p>
            </div>`;
            showToast("Stok tidak memadai untuk memulai produksi!", 'error');
            // We can even show a more detailed modal here if needed, but toast + return is minimum
            console.error("Stock Validation Failed:", validationErrors);
            return;
        }

        if (!inputItems.length) { showToast('Tambah minimal 1 bahan baku', 'error'); return; }
        moData.inputItems = inputItems;
        moData.inputQty = totalInput;
    } else {
        const inputItemId = document.getElementById('mo_input_item')?.value;
        const inputQty = parseFloat(document.getElementById('mo_input_qty')?.value) || 0;
        if (!inputItemId) { showToast('Pilih item input', 'error'); return; }
        
        // VALIDATION: Check if enough stock for WIP/Input (ONLY if qty > 0)
        if (inputQty > 0) {
            const item = db.findById('inventoryItems', inputItemId);
            const currentStock = db.getInventoryStock(inputItemId);
            if (currentStock < inputQty) {
                showToast(`Stok ${item?.itemName} tidak cukup (Butuh: ${prodFmt(inputQty)}, Stok: ${prodFmt(currentStock)} ${item?.unit})`, 'error');
                return;
            }
        }

        moData.inputItemId = inputItemId;
        moData.inputQty = inputQty;
    }

    db.insert('productionOrders', moData);
    showToast(`MO ${moNumber} dimulai & stok bahan dikurangi!`, 'success');
    closeModal();
    renderProductionMO();
};

// Helper to get or create a generic Mixing Stock item to track sacks
function getOrCreateMixingStockItem() {
    const items = db.read('inventoryItems') || [];
    let mixItem = items.find(i => i.itemName === 'Stock Mixing');
    
    if (!mixItem) {
        const itemCode = db.generateItemCode('MIXING_STOCK');
        mixItem = db.insert('inventoryItems', { 
            itemCode, 
            itemName: 'Stock Mixing', 
            category: 'MIXING_STOCK', 
            unit: 'SAK', 
            minStock: 0, 
            purchasePrice: 0, 
            status: 'ACTIVE' 
        });
    }
    return mixItem;
}

// ─── STEP 2: SELESAIKAN MO (FINISH) ──────────────────────────
window.openCompleteMOModal = (id) => {
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
    if (mo.stage === 'MIXING') {
        const genericMixItem = getOrCreateMixingStockItem();
        const matRows = (mo.inputItems || []).map(m => `
            <div class="flex items-center gap-3 bg-slate-50 p-2 rounded-lg border border-slate-100">
                <div class="flex-1 text-xs font-bold text-slate-700">${m.itemName}</div>
                <div class="w-24 text-right text-[9px] text-slate-400 italic">Resep: ${prodFmt(m.qty)} ${m.unit || ''}</div>
                <div class="flex items-center gap-1 bg-white px-2 py-1 rounded border border-slate-200 shadow-sm focus-within:border-blue-400 trasition-all">
                    <input type="text" inputmode="decimal" class="mo_final_rm_actual w-24 bg-transparent border-0 text-sm font-black text-blue-600 text-right focus:ring-0 outline-none" data-item-id="${m.inventoryItemId}" data-item-name="${m.itemName}" data-item-unit="${m.unit}" value="${m.qty}">
                    <span class="text-[9px] font-black text-slate-400 uppercase tracking-tighter">Kg</span>
                </div>
            </div>
        `).join('');

        dynamicBody = `
            <div class="bg-blue-50/50 border-2 border-blue-100 rounded-xl p-4 mb-4">
                <h4 class="text-xs font-black text-blue-800 mb-3 uppercase tracking-widest flex items-center gap-2">
                    <i class="fas fa-clipboard-check"></i> Realisasi Pemakaian Bahan
                </h4>
                <div class="space-y-2">${matRows}</div>
            </div>

            <div class="bg-blue-50 border border-blue-100 p-4 rounded-lg">
                <h4 class="text-xs font-black text-blue-800 mb-3 uppercase tracking-widest"><i class="fas fa-boxes mr-1"></i>Input Hasil Mixing</h4>
                <div class="grid grid-cols-2 gap-4">
                    <div>
                        <input type="text" id="mo_final_output_sacks" inputmode="numeric" class="w-full border-2 border-indigo-300 rounded-lg px-3 py-2 text-3xl font-black text-indigo-700 focus:ring-0 focus:border-indigo-500 outline-none" placeholder="0">
                    </div>
                    <div>
                        <p class="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Masuk ke Stok</p>
                        <p class="text-sm font-black text-indigo-900 mt-2">${genericMixItem.itemName}</p>
                        <input type="hidden" id="mo_final_output_item" value="${genericMixItem.id}">
                    </div>
                </div>
            </div>`;
    } else if (mo.stage === 'OVEN_BASAH' || mo.stage === 'OVEN_KERING') {
        const stageInfo = PROD_STAGES.find(s => s.key === mo.stage);
        const nextLabel = mo.stage === 'OVEN_KERING' ? 'Finish Good' : prodStageLabel(mo.stage);
        const inputItem = db.findById('inventoryItems', mo.inputItemId);
        const isOvenKering = mo.stage === 'OVEN_KERING';

        dynamicBody = `
            <div class="space-y-4">
                <div class="bg-blue-50 border-2 border-blue-100 p-4 rounded-xl">
                    <h4 class="text-xs font-black text-blue-800 mb-2 uppercase tracking-widest flex items-center gap-2">
                        <i class="fas fa-sign-in-alt"></i> Pemakaian Bahan (WIP)
                    </h4>
                    <div class="flex items-center gap-4">
                        <div class="flex-1">
                            <p class="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Item yang Digunakan</p>
                            <p class="text-sm font-bold text-slate-800">${inputItem?.itemName || '-'}</p>
                        </div>
                        <div class="w-40">
                            <label class="block text-[10px] font-black text-blue-600 uppercase tracking-widest mb-1 text-right">Qty Sebelum Oven (${inputItem?.unit || 'Kg'}) <span class="text-red-500">*</span></label>
                            <input type="number" id="mo_final_input_actual" step="0.01" value="${mo.inputQty || ''}" oninput="recalcShrinkageByQty(this.value)" class="w-full border-2 border-blue-300 rounded-lg px-3 py-2 text-lg font-black text-blue-700 text-right focus:border-blue-500 outline-none transition-all">
                        </div>
                    </div>
                </div>

                <div class="bg-orange-50 border border-orange-100 p-4 rounded-xl">
                    <h4 class="text-xs font-black text-orange-800 mb-3 uppercase tracking-widest flex items-center gap-2">
                        <i class="fas fa-sign-out-alt"></i> Hasil Nyata
                    </h4>
                    <div class="grid grid-cols-2 gap-4">
                        <div class="${isOvenKering ? '' : 'col-span-2'}">
                            <label class="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Qty Setelah Oven (Kg) <span class="text-red-500">*</span></label>
                            <input type="number" id="mo_final_output_qty" step="0.01" oninput="${isOvenKering ? "const inputVal = parseFloat(document.getElementById('mo_final_input_actual').value) || 0; recalcShrinkageByQty(inputVal)" : ""}" class="w-full border-2 border-orange-300 rounded-lg px-3 py-2 text-3xl font-black text-orange-700 focus:border-orange-500 outline-none" placeholder="0.00">
                        </div>
                        ${isOvenKering ? `
                        <div>
                            <label class="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Penyusutan (Kg)</label>
                            <input type="number" id="mo_final_shrink_kg" class="w-full border-2 border-slate-200 rounded-lg px-3 py-2 text-sm bg-slate-50 font-black text-red-600" readonly>
                        </div>
                        <div>
                            <label class="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Penyusutan (%)</label>
                            <input type="number" id="mo_final_shrink" class="w-full border-2 border-slate-200 rounded-lg px-3 py-2 text-sm bg-slate-50 font-black text-red-600" readonly>
                        </div>` : ''}
                        
                        <div class="col-span-2 mt-4 pt-4 border-t border-orange-100">
                            ${(() => {
                                const targetWipId = db.ensureWIPItem(mo.productId, nextLabel);
                                const targetItem = db.findById('inventoryItems', targetWipId);
                                const isFinal = mo.stage === 'OVEN_KERING';
                                return `
                                    <p class="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Lokasi Penyimpanan</p>
                                    <div class="flex items-center gap-2 text-orange-900">
                                        <i class="fas fa-${isFinal ? 'check-circle' : 'warehouse'} text-[10px] opacity-40"></i>
                                        <span class="text-sm font-black">${isFinal ? 'Finish Goods: ' : ''}${targetItem?.itemName || 'Gudang WIP'}</span>
                                    </div>
                                    <input type="hidden" id="mo_final_output_item" value="${targetWipId}">
                                `;
                            })()}
                        </div>
                    </div>
                </div>
            </div>`;
    }

    const body = `
    <div class="space-y-4">
        <div class="p-3 bg-gray-50 rounded-lg border border-gray-100 flex flex-wrap justify-center items-center text-sm gap-6">
            <div><span class="text-[10px] font-bold text-gray-400 uppercase tracking-widest">No. MO:</span> <span class="font-black text-gray-800">${mo.moNumber}</span></div>
            <div><span class="text-[10px] font-bold text-gray-400 uppercase tracking-widest">ID Batch:</span> <span class="font-mono font-black text-blue-600">${mo.batchId}</span></div>
        </div>
        ${dynamicBody}
        
        <div class="space-y-4 border-t border-gray-100 pt-4">
            <div>
                <label class="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 flex items-center gap-2">
                    <i class="fas fa-comment-dots text-blue-400"></i> Catatan Hasil Produksi (Teks Bebas)
                </label>
                <textarea id="mo_final_notes" class="w-full h-24 border-2 border-slate-100 rounded-xl px-4 py-3 text-sm focus:border-blue-400 focus:ring-4 focus:ring-blue-50 outline-none transition-all resize-none shadow-inner" placeholder="Punya catatan khusus? Tulis di sini bebas..."></textarea>
            </div>
        </div>

        <div class="grid grid-cols-2 gap-4 border-t border-gray-100 pt-4">
            ${mo.stage !== 'MIXING' && mo.stage !== 'OVEN_BASAH' && mo.stage !== 'OVEN_KERING' ? `
            <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">Waste / Produk Gagal (Kg)</label>
                <input type="number" id="mo_final_waste" min="0" step="0.01" value="0" class="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm">
            </div>
            <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">Status Quality Control <span class="text-red-500">*</span></label>
                <select id="mo_final_qc" class="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white font-bold text-blue-700">
                    <option value="PASSED">✅ QC PASSED</option>
                    <option value="FAILED">❌ QC FAILED</option>
                </select>
            </div>` : `
            <div class="hidden"><input type="hidden" id="mo_final_waste" value="0"></div>
            <div class="hidden"><input type="hidden" id="mo_final_qc" value="PASSED"></div>`}
        </div>
    </div>`;

    const footer = `
        <button onclick="finalizeMO('${id}')" class="w-full sm:w-auto inline-flex justify-center rounded-lg bg-green-600 px-8 py-2 text-white text-sm font-black hover:bg-green-700 sm:ml-3 shadow-lg shadow-green-100 uppercase tracking-widest">Selesaikan Produksi</button>
        <button onclick="closeModal()" class="mt-3 sm:mt-0 w-full sm:w-auto inline-flex justify-center rounded-lg border border-gray-300 px-8 py-2 bg-white text-gray-500 text-sm font-bold hover:bg-gray-50 sm:ml-3 uppercase tracking-widest">Batal</button>`;

    showModal('Laporan Hasil Produksi', body, footer);
};

window.recalcShrinkageByQty = (input) => {
    const rawOut = document.getElementById('mo_final_output_qty')?.value || '0';
    const out = parseFloat(rawOut) || 0;
    const shrinkPctEl = document.getElementById('mo_final_shrink');
    const shrinkKgEl = document.getElementById('mo_final_shrink_kg');
    if (input > 0) {
        const kg = (input - out).toFixed(2);
        const pct = ((input - out) / input * 100).toFixed(1);
        if (shrinkKgEl) shrinkKgEl.value = kg;
        if (shrinkPctEl) shrinkPctEl.value = pct;
    } else {
        if (shrinkKgEl) shrinkKgEl.value = 0;
        if (shrinkPctEl) shrinkPctEl.value = 0;
    }
};

window.finalizeMO = (id) => {
    const mo = db.findById('productionOrders', id);
    if (!mo) return;

    let updates = { 
        status: 'DONE', 
        completedAt: new Date().toISOString(),
        notes: (mo.notes || '') + (document.getElementById('mo_final_notes')?.value ? '\n[FINISH]: ' + document.getElementById('mo_final_notes').value : ''),
        wasteQty: mo.stage === 'MIXING' ? 0 : (parseFloat(document.getElementById('mo_final_waste')?.value) || 0),
        qcStatus: mo.stage === 'MIXING' ? 'PASSED' : (document.getElementById('mo_final_qc')?.value || 'PASSED')
    };

    // Deduct inputs at completion (as per user request: reference-only at start)
    if (mo.stage === 'MIXING') {
        const actualRows = document.querySelectorAll('.mo_final_rm_actual');
        const updatedInputItems = [];
        let totalInputActual = 0;

        const errors = [];
        actualRows.forEach(row => {
            const itemId = row.getAttribute('data-item-id');
            const itemName = row.getAttribute('data-item-name');
            const rawVal = row.value.replace(/,/g, '.').replace(/[^0-9.]/g, '');
            const qtyActual = parseFloat(rawVal) || 0;

            if (itemId && qtyActual > 0) {
                const stock = db.getInventoryStock(itemId, 'WHS');
                if (stock < qtyActual) {
                    errors.push(`${itemName}: Butuh ${qtyActual}, Sisa ${stock}`);
                }
            }
        });

        if (errors.length > 0) {
            showToast("Stok Bahan tidak cukup untuk menyelesaikan Mixing: " + errors.join("; "), 'error');
            return;
        }

        actualRows.forEach(row => {
            const itemId = row.getAttribute('data-item-id');
            const itemName = row.getAttribute('data-item-name');
            const itemUnit = row.getAttribute('data-item-unit');
            const rawVal = row.value.replace(/,/g, '.').replace(/[^0-9.]/g, '');
            const qtyActual = parseFloat(rawVal) || 0;

            if (itemId && qtyActual > 0) {
                db.addInventoryTransaction(itemId, 'OUT', qtyActual, 'PRODUCTION_OUT', null, `FINISH Mixing MO ${mo.moNumber}: Consumed for ${mo.productName}`, 'Admin', 'WHS');
                updatedInputItems.push({ inventoryItemId: itemId, itemName, qty: qtyActual, unit: itemUnit });
                totalInputActual += qtyActual;
            }
        });

        updates.inputItems = updatedInputItems;
        updates.inputQty = totalInputActual; // Update with actual total

        const rawSacks = document.getElementById('mo_final_output_sacks')?.value.replace(/,/g, '.').replace(/[^0-9.]/g, '') || '0';
        const sacks = parseFloat(rawSacks) || 0;
        const outputItemId = document.getElementById('mo_final_output_item')?.value;

        if (sacks <= 0) { showToast('Masukkan jumlah karung hasil mixing', 'error'); return; }
        if (!outputItemId) { showToast('Pilih item stok tujuan', 'error'); return; }

        updates.outputQty = sacks; // Primary quantity is now sack count as per user request
        updates.outputSacks = sacks;
        updates.outputItemId = outputItemId;
        
        // In to MIXING location
        db.addInventoryTransaction(outputItemId, 'IN', updates.outputQty, 'PRODUCTION_IN', null, `FINISH Mixing MO ${mo.moNumber}: ${mo.productName}`, 'Admin', 'MIXING');

    } else {
        const rawInput = document.getElementById('mo_final_input_actual')?.value.replace(/,/g, '.').replace(/[^0-9.]/g, '') || '';
        const rawOutput = document.getElementById('mo_final_output_qty')?.value.replace(/,/g, '.').replace(/[^0-9.]/g, '') || '';
        
        const inputQtyActual = parseFloat(rawInput);
        const outputQty = parseFloat(rawOutput);
        const outputItemId = document.getElementById('mo_final_output_item')?.value;

        if (!inputQtyActual || inputQtyActual <= 0) { showToast('Masukkan Qty bahan yang DI AMBIL/DIPAKAI', 'error'); return; }
        if (!outputQty || outputQty <= 0) { showToast('Masukkan Qty output hasil nyata', 'error'); return; }
        if (!outputItemId) { showToast('Pilih item stok tujuan', 'error'); return; }
        
        updates.inputQty = inputQtyActual;
        updates.outputQty = outputQty;
        updates.outputItemId = outputItemId;

        // OUT: Deduct from source location
        if (mo.inputItemId) {
            const srcLoc = mo.stage === 'OVEN_BASAH' ? 'MIXING' : (mo.stage === 'OVEN_KERING' ? 'OVEN_BASAH' : 'WHS');
            const stock = db.getInventoryStock(mo.inputItemId, srcLoc);
            if (stock < inputQtyActual) {
                showToast(`Stok ${mo.productName || 'Input'} di ${srcLoc} tidak cukup! (Sisa: ${stock}, Butuh: ${inputQtyActual})`, 'error');
                return;
            }
            db.addInventoryTransaction(mo.inputItemId, 'OUT', inputQtyActual, 'PRODUCTION_OUT', null, `FINISH ${prodStageLabel(mo.stage)} MO ${mo.moNumber}: Consumed ${inputQtyActual}`, 'Admin', srcLoc);
        }

        // IN: Add to target location
        const dstLoc = mo.stage === 'OVEN_BASAH' ? 'OVEN_BASAH' : (mo.stage === 'OVEN_KERING' ? 'WHS' : 'WHS');
        db.addInventoryTransaction(outputItemId, 'IN', outputQty, 'PRODUCTION_IN', null, `FINISH ${prodStageLabel(mo.stage)} MO ${mo.moNumber}: Produced ${outputQty}`, 'Admin', dstLoc);
        
        if (mo.stage === 'OVEN_KERING') {
            const shrinkPct = parseFloat(document.getElementById('mo_final_shrink')?.value) || 0;
            const shrinkageKg = Math.max(0, inputQtyActual - outputQty);
            
            updates.shrinkagePct = shrinkPct;
            updates.shrinkageKg = shrinkageKg;
            
            // Record explicit shrinkage for better audit trail
            if (shrinkageKg > 0) {
                db.addInventoryTransaction(mo.inputItemId, 'SHRINKAGE', shrinkageKg, 'PRODUCTION_SHRINK', id, `Susut ${shrinkPct}% saat Oven Kering MO ${mo.moNumber}`, 'Admin', 'OVEN_BASAH');
            }
        } else {
            updates.shrinkagePct = 0;
            updates.shrinkageKg = 0;
        }
    }

    db.update('productionOrders', id, updates);
    showToast(`Produksi ${mo.moNumber} selesai! Stok masuk diperbarui.`, 'success');
    closeModal();
    renderProductionMO();
};

// ─── HELPERS ──────────────────────────────────────────────────

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

    // Ensure Stage is MIXING
    const stageEl = document.getElementById('mo_stage');
    if (stageEl && stageEl.value !== 'MIXING') {
        stageEl.value = 'MIXING';
        updateMOForm(); 
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
    if (mo.stage === 'MIXING' && mo.inputItems) {
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
            <div><span class="text-gray-400">Total Output:</span> <strong class="text-green-600">${mo.status === 'DONE' ? prodFmt(mo.outputQty) + ' Kg' : '-'}</strong></div>
            ${mo.shrinkagePct > 0 ? `<div><span class="text-gray-400">Penyusutan:</span> <strong class="text-orange-600">${mo.shrinkagePct}%</strong></div>` : ''}
        </div>
        ${detailRows ? `<div class="bg-gray-50 p-4 rounded-xl border border-gray-100">${detailRows}</div>` : ''}
        ${mo.notes ? `<div class="bg-blue-50 p-3 rounded-lg text-xs text-blue-700"><i class="fas fa-info-circle mr-1"></i>${mo.notes}</div>` : ''}
    </div>`;
    showModal(`Detail MO - ${mo.moNumber}`, body, `<button onclick="closeModal()" class="btn-secondary">Tutup</button>`);
};

window.deleteMO = (id) => {
    const mo = db.findById('productionOrders', id);
    if (!mo) return;
    if (!confirm(`Hapus MO ${mo.moNumber}? Catatan: Stok bahan yang sudah dikurangi saat Start TIDAK akan otomatis dikembalikan. Lakukan penyusuaian stok manual jika perlu.`)) return;
    db.delete('productionOrders', id);
    showToast('MO berhasil dihapus', 'success');
    renderProductionMO();
};

// ─── LAPORAN PRODUKSI ────────────────────────────────────────
window.renderProductionReports = () => {
    document.getElementById('pageTitle').innerText = 'Laporan Efisiensi & Stok WIP';
    const mc = document.getElementById('main-content');
    const mos = db.read('productionOrders') || [];
    const invItems = db.read('inventoryItems') || [];

    // 1. WIP Stock Table (Current Balances)
    const wipTableRows = PROD_STAGES.filter(s => s.hasStock).map(st => {
        const cat = STAGE_STOCK_CATEGORY[st.key];
        const items = invItems.filter(i => i.category === cat);
        const stock = items.reduce((s, i) => s + (db.getInventoryStock(i.id) || 0), 0);
        return `
        <tr class="border-b border-slate-50">
            <td class="py-3 px-4"><div class="flex items-center gap-2"><div class="w-2 h-2 rounded-full bg-blue-500"></div><span class="font-bold text-slate-700 text-sm">WIP ${st.label}</span></div></td>
            <td class="py-3 px-4 text-right font-black text-slate-800">${prodFmt(stock)} Kg</td>
            <td class="py-3 px-4 text-slate-400 text-[10px] uppercase font-bold italic tracking-widest text-right">Tersedia untuk tahap selanjutnya</td>
        </tr>`;
    }).join('');

    // 2. Batch Performance Table
    const batchRows = mos.sort((a,b) => new Date(b.createdAt) - new Date(a.createdAt)).map(mo => {
        const eff = mo.status === 'DONE' ? ((mo.outputQty / (mo.targetQty || 1)) * 100).toFixed(1) : '-';
        return `
        <tr class="border-b border-gray-100 text-xs hover:bg-gray-50 transition-colors">
            <td class="py-3 px-4 font-mono font-semibold text-blue-600">${mo.batchId || '-'}</td>
            <td class="py-3 px-4"><span class="px-2 py-0.5 rounded text-[10px] font-bold ${prodStageColor(mo.stage)} uppercase tracking-wider">${prodStageLabel(mo.stage)}</span></td>
            <td class="py-3 px-4 text-right font-medium text-gray-500">${prodFmt(mo.targetQty)}</td>
            <td class="py-3 px-4 text-right font-bold text-gray-800">${mo.status === 'DONE' ? prodFmt(mo.outputQty) : '<span class="italic text-gray-300 font-normal">proses</span>'}</td>
            <td class="py-3 px-4 text-right text-red-500 font-medium">${mo.wasteQty > 0 ? prodFmt(mo.wasteQty) : '-'}</td>
            <td class="py-3 px-4 text-right text-orange-600 font-medium">${mo.shrinkagePct > 0 ? mo.shrinkagePct + '%' : '-'}</td>
            <td class="py-3 px-4 text-center font-bold ${eff !== '-' ? (eff > 95 ? 'text-green-600' : 'text-blue-600') : 'text-gray-300'}">${eff !== '-' ? eff + '%' : '-'}</td>
            <td class="py-3 px-4 text-center"><span class="px-2 py-1 rounded text-[10px] font-bold text-white ${mo.qcStatus === 'PASSED' ? 'bg-green-600' : (mo.qcStatus === 'FAILED' ? 'bg-red-600' : 'bg-gray-400')} uppercase shadow-sm">${mo.qcStatus}</span></td>
        </tr>`;
    }).join('') || '<tr><td colspan="8" class="py-10 text-center text-gray-400 font-medium">Belum ada riwayat batch produksi</td></tr>';

    mc.innerHTML = `
        <div class="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
            <div class="lg:col-span-1 bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                <div class="p-4 bg-gray-50 border-b border-gray-100 flex items-center gap-2">
                    <i class="fas fa-warehouse text-blue-500"></i>
                    <h3 class="font-bold text-gray-800 text-xs uppercase tracking-wider">Stok WIP Tersedia</h3>
                </div>
                <table class="w-full text-left border-collapse">
                    <tbody class="divide-y divide-gray-50">${wipTableRows}</tbody>
                </table>
                <div class="p-4 border-t border-gray-50 bg-blue-50/50 text-[11px] text-blue-600 font-medium">
                    <i class="fas fa-info-circle mr-1"></i> Stok ini siap digunakan untuk proses produksi selanjutnya.
                </div>
            </div>
            
            <div class="lg:col-span-2 bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                <div class="p-4 bg-gray-50 border-b border-gray-100 flex justify-between items-center">
                    <h3 class="font-bold text-gray-800 text-xs uppercase tracking-wider"><i class="fas fa-chart-line mr-2 text-blue-500"></i>History & Efisiensi Batch</h3>
                    <button class="bg-white border border-gray-200 text-gray-600 px-3 py-1.5 rounded-lg text-xs font-semibold hover:bg-gray-50 transition-colors uppercase tracking-wider"><i class="fas fa-file-export mr-1"></i>Ekspor Data</button>
                </div>
                <div class="overflow-x-auto">
                    <table class="w-full text-left border-collapse">
                        <thead><tr class="bg-white border-b border-gray-100">
                            <th class="py-4 px-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Batch ID</th>
                            <th class="py-4 px-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Tahapan</th>
                            <th class="py-4 px-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest text-right">Target (Kg)</th>
                            <th class="py-4 px-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest text-right">Aktual (Kg)</th>
                            <th class="py-4 px-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest text-right text-red-400">Waste</th>
                            <th class="py-4 px-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest text-right text-orange-400">Susut%</th>
                            <th class="py-4 px-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest text-center">Efisien</th>
                            <th class="py-4 px-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest text-center">QC</th>
                        </tr></thead>
                        <tbody>${batchRows}</tbody>
                    </table>
                </div>
            </div>
        </div>`;
};
// ─── PRODUKSI HARIAN (PROCESS-DRIVEN) ───────────────────────
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
        <div class="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
            <div class="overflow-x-auto">
                <table class="w-full text-left border-collapse">
                    <thead><tr class="bg-gray-50 border-b border-gray-200">
                        <th class="py-3 px-4 text-[10px] font-bold text-gray-400 uppercase">Tanggal</th>
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
    const products = invItems.filter(i => i.category === 'FINISHED_GOODS' || i.category === 'WIP');

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

    showModal('Register Aktivitas Produksi', body, footer, 'lg');
};


window.updateDailyFormMapping = () => {
    const proc = document.getElementById('dp_process').value;
    const src = document.getElementById('dp_source_loc');
    const dst = document.getElementById('dp_dest_loc');
    const itemDropdown = document.getElementById('dp_item_id');
    if (!proc || !src || !dst || !itemDropdown) return;

    // 1. Set Locations
    if (proc === 'MIXING') {
        src.value = 'WHS'; dst.value = 'MIXING';
    } else if (proc === 'EXTRUDER' || proc === 'OVEN_BASAH') {
        src.value = 'MIXING'; dst.value = proc === 'EXTRUDER' ? 'MIXING' : 'OVEN_BASAH';
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

    if (proc === 'MIXING') {
        if (currentType !== 'MIXING' || itemDropdown.innerHTML === '') {
            const boms = db.read('bomHeaders') || [];
            itemDropdown.innerHTML = '<option value="">-- Pilih Resep / BOM --</option>' + 
                boms.map(b => `<option value="${b.id}">${b.name}</option>`).join('');
            itemDropdown.setAttribute('data-last-proc', 'MIXING');
        }
        
        qtyInField.readOnly = true;

        itemDropdown.onchange = () => {
            const bomId = itemDropdown.value;
            if (!bomId) {
                ingredSection.classList.add('hidden');
                ingredList.innerHTML = '';
                qtyInField.value = '0.00';
                return;
            }
            const materials = (db.read('bomMaterials') || []).filter(m => m.bomHeaderId === bomId);
                ingredSection.classList.remove('hidden');
            ingredList.innerHTML = materials.map(m => {
                const item = db.findById('inventoryItems', m.itemId);
                return `
                <div class="flex items-center justify-between bg-white px-3 py-2 rounded-lg border border-gray-200">
                    <span class="text-xs font-semibold text-gray-700">${item ? item.itemName : 'N/A'}</span>
                    <div class="flex items-center gap-1.5">
                        <input type="number" step="0.01" data-item-id="${m.itemId}" class="mixing_item_qty w-20 border border-gray-300 rounded px-2 py-1 text-sm font-bold text-blue-700 focus:ring-1 focus:ring-blue-500 outline-none text-right" placeholder="0.00" oninput="recalcTotalMixingQty()">
                        <span class="text-[9px] font-bold text-gray-400">KG</span>
                    </div>
                </div>`;
            }).join('');
            if (!materials.length) {
                ingredList.innerHTML = '<p class="text-xs text-red-500 italic">Peringatan: Resep tidak memiliki rincian bahan.</p>';
            }
            recalcTotalMixingQty();
        };

    } else {
        ingredSection.classList.add('hidden');
        qtyInField.readOnly = false;
        
        if (currentType !== proc || itemDropdown.innerHTML === '') {
            let filtered = [];
            if (proc === 'EXTRUDER' || proc === 'OVEN_BASAH') {
                filtered = invItems.filter(i => i.category === 'MIXING_STOCK' || (i.category === 'WIP' && i.itemName.toLowerCase().includes('mixing')));
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
    }
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
        productName: process === 'MIXING' ? db.findById('bomHeaders', itemId)?.name : (db.findById('inventoryItems', itemId)?.itemName || process), 
        itemId, qtyIn: qIn,
        srcLoc, dstLoc, status: 'RUNNING',
        createdAt: new Date().toISOString(),
        batchId: batchId
    };

    // 2. Logic Per Stage
    if (process === 'MIXING') {
        const bom = db.findById('bomHeaders', itemId);
        if (!bom) { showToast('Resep tidak ditemukan', 'error'); return; }
        
        const rows = document.querySelectorAll('.mixing_item_qty');
        let totalVal = 0;
        
        rows.forEach(row => {
            const matId = row.getAttribute('data-item-id');
            const weight = parseFloat(row.value) || 0;
            if (weight > 0) {
                db.addInventoryTransaction(matId, 'OUT', weight, 'PRODUCTION_START', reference, `Bahan Mixing: ${bom.name} (Batch ${weight.toFixed(2)}kg)`, 'Admin', srcLoc);
                totalVal += weight;
            }
        });

        if (totalVal <= 0) { showToast('Masukkan minimal satu berat bahan baku', 'error'); return; }

        logData.qtyIn = totalVal;
        const targetWipId = db.ensureWIPItem(bom.targetProductId, 'Mixing');
        db.addInventoryTransaction(targetWipId, 'IN', totalVal, 'PRODUCTION_START', reference, `Start Mixing: ${bom.name}`, 'Admin', dstLoc);

    } else {
        db.addInventoryTransaction(itemId, 'OUT', qIn, 'PRODUCTION_START', reference, `Proses ${prodStageLabel(process)}`, 'Admin', srcLoc);
        
        const sourceItem = db.findById('inventoryItems', itemId);
        const targetWipId = db.ensureWIPItem((sourceItem && sourceItem.productId) ? sourceItem.productId : itemId, prodStageLabel(process));
        db.addInventoryTransaction(targetWipId, 'IN', qIn, 'PRODUCTION_START', reference, `Running ${prodStageLabel(process)}`, 'Admin', dstLoc);
    }

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

    showModal('Finalisasi Hasil Produksi', body, footer, 'md');
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
    db.addInventoryTransaction(log.itemId, 'IN', qOut, 'PRODUCTION_FINISH', null, `Hasil Produksi ${log.process}: ${log.productName}`, 'Admin', log.dstLoc);

    showToast('Produksi selesai! Stok hasil telah masuk ke gudang tujuan.', 'success');
    closeModal();
    renderDailyProduction();
};

window.deleteDailyLog = (id) => {
    if (!confirm('Hapus catatan produksi ini? Catatan: Stok tidak akan dikembalikan otomatis.')) return;
    db.delete('dailyProductionLogs', id);
    renderDailyProduction();
};

// ─── FINALISASI & REPACKING (WIP to FG) ────────────────────
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
    const wipItems = invItems.filter(i => i.category === 'WIP');
    const fgItems = invItems.filter(i => i.category === 'FINISHED_GOODS');

    const body = `
    <div class="space-y-6">
        <div class="p-4 bg-green-50 border border-green-100 rounded-2xl flex items-center gap-4">
            <div class="w-12 h-12 bg-green-600 text-white rounded-full flex items-center justify-center text-xl shadow-md border-4 border-white"><i class="fas fa-weight"></i></div>
            <div>
                <h4 class="text-sm font-black text-green-800 uppercase tracking-tight">Konversi WIP ke Finish Good</h4>
                <p class="text-[10px] text-green-600 font-bold leading-tight">Sistem akan otomatis memotong stok WIP (Kg) dan menambah stok produk jadi (SKU) sesuai ukuran kantong.</p>
            </div>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div class="space-y-4">
                <h5 class="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2"><i class="fas fa-sign-out-alt text-orange-500"></i> SOURCE: DARI WIP (Kg)</h5>
                <div>
                    <label class="block text-xs font-bold text-slate-600 mb-1">Pilih Item WIP <span class="text-red-500">*</span></label>
                    <select id="rp_source_id" class="w-full border-2 border-slate-100 rounded-xl px-4 py-3 text-sm focus:border-green-500 outline-none transition-all font-semibold">
                        <option value="">-- Pilih WIP --</option>
                        ${wipItems.map(i => `<option value="${i.id}">${i.itemName} (Stok: ${prodFmt(db.getInventoryStock(i.id))} Kg)</option>`).join('')}
                    </select>
                </div>
                <div>
                    <label class="block text-xs font-bold text-slate-600 mb-1">Total Berat yang Dipakai (Kg) <span class="text-red-500">*</span></label>
                    <input type="number" id="rp_qty_kg" step="0.01" class="w-full border-2 border-slate-100 rounded-xl px-4 py-3 text-lg font-black text-slate-800 focus:border-green-500 outline-none transition-all" placeholder="0.00" oninput="calcRepackingUnits()">
                </div>
            </div>

            <div class="space-y-4 border-l-0 md:border-l border-slate-100 md:pl-6">
                <h5 class="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2"><i class="fas fa-sign-in-alt text-green-500"></i> DEST: KE FINISH GOOD (PACK)</h5>
                <div>
                    <label class="block text-xs font-bold text-slate-600 mb-1">Pilih SKU Finish Good <span class="text-red-500">*</span></label>
                    <select id="rp_dest_id" class="w-full border-2 border-slate-100 rounded-xl px-4 py-3 text-sm focus:border-green-500 outline-none transition-all font-semibold" onchange="calcRepackingUnits()">
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
                    <label class="block text-xs font-bold text-slate-600 mb-1 font-mono uppercase tracking-tighter">Hasil Pack (Otomatis)</label>
                    <div class="relative">
                        <input type="number" id="rp_qty_units" readonly class="w-full bg-slate-50 border-2 border-slate-100 rounded-xl px-4 py-3 text-xl font-black text-green-600" value="0">
                        <span class="absolute right-4 top-1/2 -translate-y-1/2 text-[10px] font-black text-slate-300 uppercase underline decoration-green-500 decoration-2">UNIT / PCS</span>
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

    showModal('Finalisasi Produksi: WIP ➔ Finish Good', body, footer, 'lg');
};

window.calcRepackingUnits = () => {
    const kg = parseFloat(document.getElementById('rp_qty_kg').value) || 0;
    const destEl = document.getElementById('rp_dest_id');
    const unitsEl = document.getElementById('rp_qty_units');
    if (!destEl || !unitsEl) return;

    const opt = destEl.options[destEl.selectedIndex];
    const kgPerUnit = parseFloat(opt?.dataset?.kg) || 0;
    
    if (kg > 0 && kgPerUnit > 0) {
        unitsEl.value = Math.floor(kg / kgPerUnit);
    } else {
        unitsEl.value = 0;
    }
};

window.saveRepacking = () => {
    const srcId = document.getElementById('rp_source_id').value;
    const destId = document.getElementById('rp_dest_id').value;
    const kg = parseFloat(document.getElementById('rp_qty_kg').value) || 0;
    const units = parseFloat(document.getElementById('rp_qty_units').value) || 0;
    const date = document.getElementById('rp_date').value;

    if (!srcId || !destId || kg <= 0 || units <= 0) {
        showToast('Lengkapi semua data repacking (Qty harus masuk akal)', 'error');
        return;
    }

    if (!db.validateInventoryStock(srcId, kg)) {
        showToast('Stok WIP tidak mencukupi untuk repacking', 'error');
        return;
    }

    const srcItem = db.findById('inventoryItems', srcId);
    const destItem = db.findById('inventoryItems', destId);

    const logData = {
        date, srcId, destId, sourceName: srcItem.itemName, destName: destItem.itemName,
        qtyKg: kg, qtyUnits: units, unitType: destItem.unit || 'Pack',
        createdAt: new Date().toISOString()
    };

    // 1. Record Log
    db.insert('repackingLogs', logData);

    // 2. Stock Movement
    // WIP OUT (Kg)
    db.addInventoryTransaction(srcId, 'OUT', kg, 'REPACKING', null, `Finalisasi WIP: Out untuk ${destItem.itemName}`, 'Admin', 'OVEN_KERING');
    // FG IN (Units)
    db.addInventoryTransaction(destId, 'IN', units, 'REPACKING', null, `Finalisasi WIP: Hasil ${units} ${destItem.unit || 'Pack'}`, 'Admin', 'FINISH_GOOD');

    showToast('Konversi berhasil! Stok barang jadi telah ditambahkan.', 'success');
    closeModal();
    renderProductionFinalization();
};

window.deleteRepackingLog = (id) => {
    if (!confirm('Hapus log repacking ini? Catatan: Stok tidak dikembalikan otomatis.')) return;
    db.delete('repackingLogs', id);
    renderProductionFinalization();
};
// ─── BILL OF MATERIAL (BOM) ──────────────────────────────────
window.renderBOMManagement = () => {
    document.getElementById('pageTitle').innerText = 'Bill Of Material ( BOM )';
    const mc = document.getElementById('main-content');
    const boms = db.read('bomHeaders') || [];
    const products = db.read('inventoryItems').filter(i => i.category !== 'RAW_MATERIAL');

    const bomRows = boms.map(bom => {
        const targetProduct = db.findById('inventoryItems', bom.targetProductId);
        const materials = (db.read('bomMaterials') || []).filter(m => m.bomHeaderId === bom.id);
        return `
        <tr class="border-b border-slate-50 hover:bg-slate-50 transition-colors">
            <td class="py-4 px-4 font-bold text-slate-700">${bom.name}</td>
            <td class="py-4 px-4 text-sm">${targetProduct ? targetProduct.itemName : 'N/A'}</td>
            <td class="py-4 px-4 text-center text-slate-500">${materials.length} Bahan</td>
            <td class="py-4 px-4 text-right">
                <button onclick="openBOMModal('${bom.id}')" class="text-blue-500 hover:text-blue-700 mx-1"><i class="fas fa-edit"></i></button>
                <button onclick="deleteBOM('${bom.id}')" class="text-red-500 hover:text-red-700 mx-1"><i class="fas fa-trash"></i></button>
            </td>
        </tr>`;
    }).join('') || '<tr><td colspan="5" class="py-10 text-center text-slate-400">Belum ada resep yang dibuat</td></tr>';

    mc.innerHTML = `
    <div class="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <div class="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
            <div>
                <h3 class="font-bold text-slate-800 text-lg">Daftar Resep & Komposisi</h3>
                <p class="text-xs text-slate-500 mt-1">Kelola standar bahan baku untuk setiap Produk Jadi (Finish Good)</p>
            </div>
            <button onclick="openBOMModal()" class="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-xl text-sm font-bold shadow-sm transition-all flex items-center gap-2">
                <i class="fas fa-plus"></i> Buat Resep Baru
            </button>
        </div>
        <div class="overflow-x-auto">
            <table class="w-full text-left">
                <thead class="bg-slate-50 text-slate-500 text-[10px] uppercase font-bold tracking-widest">
                    <tr>
                        <th class="py-4 px-4">Nama Resep</th>
                        <th class="py-4 px-4">Produk Target</th>
                        <th class="py-4 px-4 text-center">Jumlah Bahan</th>
                        <th class="py-4 px-4 text-right">Aksi</th>
                    </tr>
                </thead>
                <tbody>${bomRows}</tbody>
            </table>
        </div>
    </div>`;
};

window.openBOMModal = (id = null) => {
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
            <label class="block text-[11px] font-black text-slate-400 uppercase mb-3 ml-1">PILIH PRODUK TARGET (WIP MIXING) <span class="text-red-500">*</span></label>
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
                <div class="flex-1 min-w-[300px]">
                    <label class="block text-[10px] font-black text-slate-400 uppercase mb-2 ml-1">BAHAN BAKU</label>
                    <select id="add_mat_item" onchange="const opt=this.selectedOptions[0]; document.getElementById('add_mat_unit').value=opt?.dataset.unit||''" 
                        class="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold text-slate-700 outline-none bg-white font-mono uppercase">
                        <option value="">-- PILIH BAHAN BAKU --</option>
                        ${rawMaterials.map(m => `<option value="${m.id}" data-name="${m.itemName}" data-unit="${m.unit}">${m.itemCode} — ${m.itemName}</option>`).join('')}
                    </select>
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

    const footer = `
        <div class="flex items-center justify-end gap-3 w-full">
            <button onclick="closeModal()" class="text-slate-500 hover:text-slate-700 px-6 py-2.5 text-sm font-bold transition-all">Batal</button>
            <button onclick="saveBOM('${id || ''}')" class="bg-indigo-600 hover:bg-indigo-700 text-white px-10 py-2.5 rounded-xl text-sm font-bold shadow-lg shadow-indigo-100 transition-all active:scale-95">Simpan Resep</button>
        </div>
    `;

    showModal(id ? 'Edit Resep' : 'Buat Resep Baru', body, footer, 'full');

    if (currentMaterials.length > 0) {
        currentMaterials.forEach(m => {
            const item = db.findById('inventoryItems', m.itemId);
            appendMaterialToTable(m.location || 'GUDANG', m.itemId, item ? item.itemName : 'Unknown', m.qty, m.unit);
        });
    }
};

window.appendBOMMaterial = () => {
    const loc = document.getElementById('add_mat_location').value;
    const itemSel = document.getElementById('add_mat_item');
    const itemOpt = itemSel.selectedOptions[0];
    const itemId = itemSel.value;
    const qty = parseFloat(document.getElementById('add_mat_qty').value);
    const unit = document.getElementById('add_mat_unit').value;

    if (!itemId) { showToast('Pilih bahan baku lebih dulu', 'warning'); return; }
    if (isNaN(qty) || qty <= 0) { showToast('Isi jumlah yang valid', 'warning'); return; }

    appendMaterialToTable(loc, itemId, itemOpt.dataset.name, qty, unit);
    
    // Reset inputs
    itemSel.value = '';
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
    closeModal();
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

    const isMixing = mo.stage === 'MIXING';
    const isOven = mo.stage === 'OVEN_BASAH' || mo.stage === 'OVEN_KERING';

    const renderMixingSection = (items, title, isFirstPage = false, operatorLabel = "Operator Mixing") => {
        if (!items.length) return "";
        const rows = items.map((m, index) => `
            <tr>
                <td style="border: 1px solid #000; padding: 10px; text-align: center;">${index + 1}</td>
                <td style="border: 1px solid #000; padding: 10px;">${m.itemName}</td>
                <td style="border: 1px solid #000; padding: 10px; text-align: right; font-weight: 600;">${prodFmt(m.qty)} ${m.unit || ""}</td>
                <td style="border: 1px solid #000; padding: 10px;"></td>
            </tr>
        `).join("");

        const resultBox = isFirstPage ? `
            <div style="border: 2px solid #000; border-radius: 8px; padding: 20px; font-size: 14px; font-weight: 800; color: #000; text-transform: uppercase;">
                HASIL MIXING (Kg) :
            </div>` : "";

        return `
            <div class="mo-page" style="${!isFirstPage ? 'padding-top: 1.5cm;' : ''}">
                ${renderBaseHeader(mo, title, operatorLabel)}
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
                ${renderBaseFooter(mo, operatorLabel, isFirstPage ? "Operator wajib mengisi kolom 'Qty Actual' dan 'Hasil Mixing'" : "Operator wajib mengisi kolom 'Qty Actual'")}
            </div>`;
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

    function renderBaseHeader(mo, areaTitle, operatorLabel) {
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
                    <div class="info-item"><span class="info-label">Nomor MO</span> <span class="info-val">: ${mo.moNumber}</span></div>
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
        const materials = mo.inputItems || [];
        const gudangItems = materials.filter(m => (m.location || 'GUDANG') === 'GUDANG');
        const bumbuItems = materials.filter(m => m.location === 'BUMBU');
        printHTML = renderMixingSection(gudangItems, "GUDANG BAHAN BAKU", true, "Operator Mixing") +
                    renderMixingSection(bumbuItems, "BUMBU / SEASONING", false, "Operator Bumbu");
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

// ─── MASTER MESIN (MACHINE MASTER) ───────────────────────────
window.renderMachineMaster = () => {
    const main = document.getElementById('main-content');
    const machines = db.read('machines') || [];

    const rows = machines.length ? machines.map(m => {
        const isMaintenance = m.status === 'MAINTENANCE';
        const isActive = m.status === 'ACTIVE';
        
        let statusClass = 'bg-gray-100 text-gray-500';
        if (isActive) statusClass = 'bg-green-50 text-green-700';
        if (isMaintenance) statusClass = 'bg-amber-50 text-amber-700';

        return `
        <tr class="border-b border-slate-100 hover:bg-slate-50/50 transition-all text-sm">
            <td class="py-4 px-4 font-mono font-bold text-slate-400 uppercase tracking-widest text-[10px]">${m.code}</td>
            <td class="py-4 px-4">
                <div class="flex flex-col">
                    <span class="font-bold text-slate-800">${m.name}</span>
                    <span class="text-[10px] text-slate-400 font-bold uppercase tracking-wider">${m.type || 'EXTRUDER'}</span>
                </div>
            </td>
            <td class="py-4 px-4">
                <div class="text-[11px] font-black text-slate-600 uppercase tracking-widest">
                    ${m.capacity || '-'} <span class="text-[9px] text-slate-400 ml-0.5">KG/Batch</span>
                </div>
            </td>
            <td class="py-4 px-4">
                <span class="px-2 py-0.5 rounded text-[10px] font-bold uppercase ${statusClass}">
                    ${m.status || 'Active'}
                </span>
            </td>
            <td class="py-4 px-4 text-right">
                <div class="flex justify-end items-center gap-1">
                    <button onclick="openAddMachineModal('${m.id}')" class="p-2 text-blue-500 hover:bg-blue-50 rounded-lg transition-all" title="Edit Mesin">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button onclick="deleteMachine('${m.id}')" class="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all" title="Hapus Permanen">
                        <i class="fas fa-trash-alt"></i>
                    </button>
                </div>
            </td>
        </tr>`;
    }).join('') : `<tr><td colspan="5" class="py-20 text-center text-slate-300 italic text-sm">Belum ada data mesin.</td></tr>`;

    main.innerHTML = `
        <div class="mb-6 flex justify-between items-center bg-white p-5 rounded-2xl border border-slate-100 shadow-sm">
            <div>
                <h3 class="text-lg font-black text-slate-800 uppercase tracking-widest mb-1">Master Data Mesin</h3>
                <p class="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Aset & Peralatan Produksi</p>
            </div>
            <button onclick="openAddMachineModal()" class="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all shadow-md active:scale-95 flex items-center gap-2">
                <i class="fas fa-plus"></i> Tambah Mesin
            </button>
        </div>

        <div class="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
            <table class="w-full text-left border-collapse">
                <thead class="bg-slate-50/50 border-b border-slate-100">
                    <tr>
                        <th class="py-4 px-4 text-[10px] font-black text-slate-400 uppercase tracking-widest w-24">Kode</th>
                        <th class="py-4 px-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Informasi Mesin</th>
                        <th class="py-4 px-4 text-[10px] font-black text-slate-400 uppercase tracking-widest w-32">Kapasitas</th>
                        <th class="py-4 px-4 text-[10px] font-black text-slate-400 uppercase tracking-widest w-32">Status</th>
                        <th class="py-4 px-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right w-40">Opsi</th>
                    </tr>
                </thead>
                <tbody>${rows}</tbody>
            </table>
        </div>`;
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

