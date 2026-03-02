// production.js — Manufacturing Module

// ─── HELPERS ────────────────────────────────────────────────
const prodFmt = n => (parseFloat(n) || 0).toLocaleString('id-ID', { maximumFractionDigits: 2 });
const prodDate = d => d ? new Date(d).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' }) : '-';
const addDays = (dateStr, days) => {
    const d = new Date(dateStr);
    d.setDate(d.getDate() + Math.ceil(days));
    return d.toISOString().split('T')[0];
};
const calcEstFinish = (startDate, qty, cap) => cap > 0 ? addDays(startDate, qty / cap) : startDate;

const MO_STATUS = {
    DRAFT: { label: 'Draft', cls: 'bg-gray-100 text-gray-700' },
    RUNNING: { label: 'Running', cls: 'bg-blue-100 text-blue-700' },
    COMPLETED: { label: 'Completed', cls: 'bg-green-100 text-green-700' },
    CANCELLED: { label: 'Cancelled', cls: 'bg-red-100 text-red-700' }
};

const moBadge = status => {
    const s = MO_STATUS[status] || MO_STATUS.DRAFT;
    return `<span class="px-2 py-0.5 rounded text-xs font-bold ${s.cls}">${s.label}</span>`;
};

// ─── 1. PRODUCTION DASHBOARD ─────────────────────────────────
function renderProductionDashboard() {
    document.getElementById('pageTitle').innerText = 'Dashboard Produksi';
    const mc = document.getElementById('main-content');

    const mos = db.read('manufacturingOrders');
    const today = new Date().toISOString().split('T')[0];
    const machines = db.read('machines');

    const draft = mos.filter(m => m.status === 'DRAFT').length;
    const running = mos.filter(m => m.status === 'RUNNING').length;
    const completed = mos.filter(m => m.status === 'COMPLETED').length;

    // Total produksi bulan ini (dari completed MO)
    const thisMonth = new Date().toISOString().slice(0, 7);
    const monthlyQty = mos.filter(m => m.status === 'COMPLETED' && m.actualFinishDate && m.actualFinishDate.startsWith(thisMonth))
        .reduce((s, m) => s + (parseFloat(m.qtyProduced) || 0), 0);

    // Kapasitas mesin terpakai hari ini
    const machineRows = machines.map(m => {
        const used = db.getMachineCapacityUsed(m.id, today);
        const cap = parseFloat(m.dailyCapacity) || 0;
        const pct = cap > 0 ? Math.min(100, (used / cap * 100)).toFixed(0) : 0;
        const barColor = pct >= 100 ? 'bg-red-500' : pct >= 75 ? 'bg-yellow-500' : 'bg-green-500';
        return `
        <div class="flex items-center gap-3 py-2 border-b last:border-0">
            <div class="flex-1">
                <p class="text-sm font-medium text-gray-800">${m.machineName}</p>
                <p class="text-xs text-gray-400">${m.machineCode} · ${cap} kg/hari</p>
            </div>
            <div class="w-32">
                <div class="flex justify-between text-xs mb-1"><span>${prodFmt(used)} kg</span><span class="${pct >= 100 ? 'text-red-600 font-bold' : ''}">${pct}%</span></div>
                <div class="w-full bg-gray-200 rounded-full h-2"><div class="${barColor} h-2 rounded-full" style="width:${pct}%"></div></div>
            </div>
        </div>`;
    }).join('') || '<p class="text-sm text-gray-400 py-2">Belum ada mesin terdaftar.</p>';

    // MO Running — progress
    const runningMOs = mos.filter(m => m.status === 'RUNNING');
    const runningRows = runningMOs.map(mo => {
        const target = parseFloat(mo.qtyTarget) || 0;
        const produced = db.getMOQtyProduced(mo.id);
        const pct = target > 0 ? Math.min(100, (produced / target * 100)).toFixed(0) : 0;
        const isLate = mo.estFinishDate && today > mo.estFinishDate;
        return `
        <div class="py-3 border-b last:border-0 cursor-pointer hover:bg-gray-50 px-2 rounded" onclick="navigateTo('production-mo')">
            <div class="flex justify-between items-start">
                <div>
                    <p class="text-sm font-semibold text-blue-700">${mo.moNumber}</p>
                    <p class="text-xs text-gray-500">${mo.productName || '-'} · Target: ${prodFmt(target)} kg</p>
                </div>
                <div class="text-right">
                    ${isLate ? '<span class="text-xs bg-red-100 text-red-600 px-2 py-0.5 rounded font-semibold">⚠ Terlambat</span>' : ''}
                    <p class="text-xs text-gray-400 mt-0.5">Est: ${prodDate(mo.estFinishDate)}</p>
                </div>
            </div>
            <div class="mt-2">
                <div class="flex justify-between text-xs text-gray-500 mb-1"><span>${prodFmt(produced)} / ${prodFmt(target)} kg</span><span>${pct}%</span></div>
                <div class="w-full bg-gray-200 rounded-full h-1.5"><div class="bg-blue-500 h-1.5 rounded-full" style="width:${pct}%"></div></div>
            </div>
        </div>`;
    }).join('') || '<p class="text-sm text-gray-400 py-4 text-center">Tidak ada MO yang sedang berjalan.</p>';

    mc.innerHTML = `
    <div class="space-y-4">
        <!-- Stats -->
        <div class="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div class="bg-white rounded-lg shadow-sm border border-gray-100 p-4 text-center cursor-pointer hover:border-gray-300" onclick="navigateTo('production-mo')">
                <p class="text-3xl font-bold text-gray-500">${draft}</p>
                <p class="text-sm text-gray-500 mt-1">MO Draft</p>
            </div>
            <div class="bg-white rounded-lg shadow-sm border border-blue-100 p-4 text-center cursor-pointer hover:border-blue-300" onclick="navigateTo('production-mo')">
                <p class="text-3xl font-bold text-blue-600">${running}</p>
                <p class="text-sm text-gray-500 mt-1">MO Running</p>
            </div>
            <div class="bg-white rounded-lg shadow-sm border border-green-100 p-4 text-center cursor-pointer hover:border-green-300" onclick="navigateTo('production-mo')">
                <p class="text-3xl font-bold text-green-600">${completed}</p>
                <p class="text-sm text-gray-500 mt-1">MO Completed</p>
            </div>
            <div class="bg-white rounded-lg shadow-sm border border-orange-100 p-4 text-center">
                <p class="text-3xl font-bold text-orange-600">${prodFmt(monthlyQty)}</p>
                <p class="text-sm text-gray-500 mt-1">Produksi Bulan Ini (kg)</p>
            </div>
        </div>
        <!-- Row 2 -->
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div class="bg-white rounded-lg shadow-sm border border-gray-100 p-4">
                <h3 class="text-sm font-semibold text-gray-700 mb-3"><i class="fas fa-cog mr-2 text-gray-400"></i>Kapasitas Mesin Hari Ini</h3>
                ${machineRows}
            </div>
            <div class="bg-white rounded-lg shadow-sm border border-gray-100 p-4">
                <h3 class="text-sm font-semibold text-gray-700 mb-3"><i class="fas fa-industry mr-2 text-blue-400"></i>MO Sedang Berjalan</h3>
                ${runningRows}
            </div>
        </div>
    </div>`;
}

// ─── 2. MASTER MESIN ─────────────────────────────────────────
function renderProductionMachines() {
    document.getElementById('pageTitle').innerText = 'Master Mesin';
    const mc = document.getElementById('main-content');
    const machines = db.read('machines');

    const rows = machines.map(m => {
        const statusBadge = m.status === 'ACTIVE'
            ? '<span class="px-2 py-0.5 rounded text-xs font-bold bg-green-100 text-green-700">Active</span>'
            : '<span class="px-2 py-0.5 rounded text-xs font-bold bg-yellow-100 text-yellow-700">Maintenance</span>';
        return `<tr class="border-b border-gray-100 hover:bg-gray-50">
            <td class="py-3 px-4 text-sm font-mono text-blue-600">${m.machineCode}</td>
            <td class="py-3 px-4 text-sm font-medium text-gray-800">${m.machineName}</td>
            <td class="py-3 px-4 text-sm text-gray-600">${m.machineType || 'Oven'}</td>
            <td class="py-3 px-4 text-sm text-gray-600 text-right">${prodFmt(m.dailyCapacity)} kg/hari</td>
            <td class="py-3 px-4 text-sm">${statusBadge}</td>
            <td class="py-3 px-4 text-sm text-right">
                <button onclick="openMachineModal('${m.id}')" class="text-blue-500 hover:text-blue-700 mr-2"><i class="fas fa-edit"></i></button>
                <button onclick="deleteMachine('${m.id}')" class="text-red-400 hover:text-red-600"><i class="fas fa-trash"></i></button>
            </td>
        </tr>`;
    }).join('') || `<tr><td colspan="6" class="py-8 text-center text-gray-400">Belum ada mesin. Tambah mesin baru.</td></tr>`;

    mc.innerHTML = `
    <div class="bg-white rounded-lg shadow-sm border border-gray-100">
        <div class="flex justify-between items-center p-4 border-b border-gray-100">
            <h2 class="text-lg font-semibold text-gray-800">Master Mesin Produksi</h2>
            <button onclick="openMachineModal()" class="bg-orange-600 hover:bg-orange-700 text-white px-4 py-2 rounded text-sm font-medium">
                <i class="fas fa-plus mr-2"></i>Tambah Mesin
            </button>
        </div>
        <div class="overflow-x-auto">
            <table class="w-full text-left border-collapse">
                <thead><tr class="bg-gray-50 border-b border-gray-200">
                    <th class="py-3 px-4 text-xs font-semibold text-gray-600 uppercase">Kode</th>
                    <th class="py-3 px-4 text-xs font-semibold text-gray-600 uppercase">Nama Mesin</th>
                    <th class="py-3 px-4 text-xs font-semibold text-gray-600 uppercase">Tipe</th>
                    <th class="py-3 px-4 text-xs font-semibold text-gray-600 uppercase text-right">Kapasitas/Hari</th>
                    <th class="py-3 px-4 text-xs font-semibold text-gray-600 uppercase">Status</th>
                    <th class="py-3 px-4 text-xs font-semibold text-gray-600 uppercase text-right">Aksi</th>
                </tr></thead>
                <tbody>${rows}</tbody>
            </table>
        </div>
    </div>`;
}

window.openMachineModal = (id = null) => {
    const m = id ? db.findById('machines', id) : null;
    const code = m ? m.machineCode : db.generateMachineCode();
    const body = `
    <div class="space-y-4">
        <div class="grid grid-cols-2 gap-3">
            <div><label class="block text-sm font-medium text-gray-700 mb-1">Kode Mesin</label>
                <input id="mch_code" value="${code}" readonly class="w-full border border-gray-200 rounded px-3 py-2 bg-gray-50 text-sm"></div>
            <div><label class="block text-sm font-medium text-gray-700 mb-1">Status</label>
                <select id="mch_status" class="w-full border border-gray-300 rounded px-3 py-2 text-sm bg-white">
                    <option value="ACTIVE" ${(!m || m.status === 'ACTIVE') ? 'selected' : ''}>Active</option>
                    <option value="MAINTENANCE" ${m?.status === 'MAINTENANCE' ? 'selected' : ''}>Maintenance</option>
                </select></div>
        </div>
        <div><label class="block text-sm font-medium text-gray-700 mb-1">Nama Mesin</label>
            <input id="mch_name" value="${m?.machineName || ''}" placeholder="contoh: Oven A" class="w-full border border-gray-300 rounded px-3 py-2 text-sm"></div>
        <div class="grid grid-cols-2 gap-3">
            <div><label class="block text-sm font-medium text-gray-700 mb-1">Tipe</label>
                <input id="mch_type" value="${m?.machineType || 'Oven'}" placeholder="Oven" class="w-full border border-gray-300 rounded px-3 py-2 text-sm"></div>
            <div><label class="block text-sm font-medium text-gray-700 mb-1">Kapasitas Harian (kg)</label>
                <input id="mch_cap" type="number" value="${m?.dailyCapacity || ''}" placeholder="100" class="w-full border border-gray-300 rounded px-3 py-2 text-sm"></div>
        </div>
    </div>`;
    const footer = `
        <button onclick="saveMachine('${id || ''}')" class="w-full sm:w-auto inline-flex justify-center rounded-md bg-orange-600 px-4 py-2 text-white text-sm font-medium hover:bg-orange-700 sm:ml-3">Simpan</button>
        <button onclick="closeModal()" class="mt-3 sm:mt-0 w-full sm:w-auto inline-flex justify-center rounded-md border border-gray-300 px-4 py-2 bg-white text-gray-700 text-sm font-medium sm:ml-3">Batal</button>`;
    showModal(id ? 'Edit Mesin' : 'Tambah Mesin', body, footer);
};

window.saveMachine = (id) => {
    const name = document.getElementById('mch_name').value.trim();
    const cap = parseFloat(document.getElementById('mch_cap').value);
    if (!name) { showToast('Nama mesin harus diisi', 'error'); return; }
    if (!cap || cap <= 0) { showToast('Kapasitas harian harus diisi', 'error'); return; }
    const data = {
        machineCode: document.getElementById('mch_code').value,
        machineName: name,
        machineType: document.getElementById('mch_type').value || 'Oven',
        dailyCapacity: cap,
        status: document.getElementById('mch_status').value
    };
    if (id) { db.update('machines', id, data); showToast('Mesin diupdate'); }
    else { db.insert('machines', data); showToast('Mesin ditambahkan'); }
    closeModal(); renderProductionMachines();
};

window.deleteMachine = (id) => {
    if (!confirm('Hapus mesin ini?')) return;
    db.delete('machines', id);
    showToast('Mesin dihapus');
    renderProductionMachines();
};

// ─── 3. BILL OF MATERIAL ────────────────────────────────────
function renderProductionBOM() {
    document.getElementById('pageTitle').innerText = 'Bill of Material';
    const mc = document.getElementById('main-content');
    const boms = db.read('bomHeaders');
    const invItems = db.read('inventoryItems');

    const rows = boms.map(b => {
        const product = invItems.find(i => i.id === b.productId);
        const materials = db.read('bomMaterials').filter(m => m.bomId === b.id);
        const statusBadge = b.status === 'ACTIVE'
            ? '<span class="px-2 py-0.5 rounded text-xs font-bold bg-green-100 text-green-700">Active</span>'
            : '<span class="px-2 py-0.5 rounded text-xs font-bold bg-gray-100 text-gray-600">Inactive</span>';
        return `<tr class="border-b border-gray-100 hover:bg-gray-50">
            <td class="py-3 px-4 text-sm font-mono text-blue-600">${b.bomCode}</td>
            <td class="py-3 px-4 text-sm font-medium text-gray-800">${product?.itemName || '-'}</td>
            <td class="py-3 px-4 text-sm text-gray-600 text-right">${prodFmt(b.outputPerBatch)} kg/batch</td>
            <td class="py-3 px-4 text-sm text-gray-600 text-center">${materials.length} bahan</td>
            <td class="py-3 px-4 text-sm">${statusBadge}</td>
            <td class="py-3 px-4 text-sm text-right">
                <button onclick="openBOMModal('${b.id}')" class="text-blue-500 hover:text-blue-700 mr-2"><i class="fas fa-edit"></i></button>
                <button onclick="deleteBOM('${b.id}')" class="text-red-400 hover:text-red-600"><i class="fas fa-trash"></i></button>
            </td>
        </tr>`;
    }).join('') || `<tr><td colspan="6" class="py-8 text-center text-gray-400">Belum ada BOM. Buat BOM baru.</td></tr>`;

    mc.innerHTML = `
    <div class="bg-white rounded-lg shadow-sm border border-gray-100">
        <div class="flex justify-between items-center p-4 border-b border-gray-100">
            <h2 class="text-lg font-semibold text-gray-800">Bill of Material</h2>
            <button onclick="openBOMModal()" class="bg-orange-600 hover:bg-orange-700 text-white px-4 py-2 rounded text-sm font-medium">
                <i class="fas fa-plus mr-2"></i>Buat BOM
            </button>
        </div>
        <div class="overflow-x-auto">
            <table class="w-full text-left border-collapse">
                <thead><tr class="bg-gray-50 border-b border-gray-200">
                    <th class="py-3 px-4 text-xs font-semibold text-gray-600 uppercase">BOM Code</th>
                    <th class="py-3 px-4 text-xs font-semibold text-gray-600 uppercase">Finished Product</th>
                    <th class="py-3 px-4 text-xs font-semibold text-gray-600 uppercase text-right">Output/Batch</th>
                    <th class="py-3 px-4 text-xs font-semibold text-gray-600 uppercase text-center">Bahan Baku</th>
                    <th class="py-3 px-4 text-xs font-semibold text-gray-600 uppercase">Status</th>
                    <th class="py-3 px-4 text-xs font-semibold text-gray-600 uppercase text-right">Aksi</th>
                </tr></thead>
                <tbody>${rows}</tbody>
            </table>
        </div>
    </div>`;
}

window.openBOMModal = (id = null) => {
    const bom = id ? db.findById('bomHeaders', id) : null;
    const code = bom ? bom.bomCode : db.generateBOMCode();
    const fgItems = db.read('inventoryItems').filter(i => i.category === 'FINISHED_GOODS' && i.status !== 'INACTIVE');
    const fgOpts = fgItems.map(i => `<option value="${i.id}" ${bom?.productId === i.id ? 'selected' : ''}>${i.itemCode} — ${i.itemName}</option>`).join('');

    // Load existing materials
    window._bomRows = bom ? db.read('bomMaterials').filter(m => m.bomId === id).map(m => ({ ...m })) : [];

    const body = `
    <div class="space-y-4">
        <div class="grid grid-cols-2 gap-3">
            <div><label class="block text-sm font-medium text-gray-700 mb-1">BOM Code</label>
                <input id="bom_code" value="${code}" readonly class="w-full border border-gray-200 rounded px-3 py-2 bg-gray-50 text-sm"></div>
            <div><label class="block text-sm font-medium text-gray-700 mb-1">Status</label>
                <select id="bom_status" class="w-full border border-gray-300 rounded px-3 py-2 text-sm bg-white">
                    <option value="ACTIVE" ${(!bom || bom.status === 'ACTIVE') ? 'selected' : ''}>Active</option>
                    <option value="INACTIVE" ${bom?.status === 'INACTIVE' ? 'selected' : ''}>Inactive</option>
                </select></div>
        </div>
        <div class="grid grid-cols-2 gap-3">
            <div><label class="block text-sm font-medium text-gray-700 mb-1">Finished Product</label>
                <select id="bom_product" class="w-full border border-gray-300 rounded px-3 py-2 text-sm bg-white">
                    <option value="">-- Pilih Produk --</option>${fgOpts}
                </select></div>
            <div><label class="block text-sm font-medium text-gray-700 mb-1">Output per Batch (kg)</label>
                <input id="bom_output" type="number" value="${bom?.outputPerBatch || ''}" placeholder="1000" class="w-full border border-gray-300 rounded px-3 py-2 text-sm"></div>
        </div>
        <div class="border-t pt-3">
            <div class="flex justify-between items-center mb-2">
                <p class="text-sm font-medium text-gray-700">Daftar Bahan Baku</p>
                <button onclick="addBOMRow()" class="text-orange-600 hover:text-orange-800 text-sm font-medium"><i class="fas fa-plus mr-1"></i>Tambah Bahan</button>
            </div>
            <div id="bom_rows"></div>
        </div>
    </div>`;
    const footer = `
        <button onclick="saveBOM('${id || ''}')" class="w-full sm:w-auto inline-flex justify-center rounded-md bg-orange-600 px-4 py-2 text-white text-sm font-medium hover:bg-orange-700 sm:ml-3">Simpan BOM</button>
        <button onclick="closeModal()" class="mt-3 sm:mt-0 w-full sm:w-auto inline-flex justify-center rounded-md border border-gray-300 px-4 py-2 bg-white text-gray-700 text-sm font-medium sm:ml-3">Batal</button>`;
    showModal(id ? 'Edit BOM' : 'Buat BOM', body, footer);
    renderBOMRows();
};

function renderBOMRows() {
    const rmItems = db.read('inventoryItems').filter(i => i.category === 'RAW_MATERIAL' && i.status !== 'INACTIVE');
    const rmOpts = rmItems.map(i => `<option value="${i.id}" data-unit="${i.unit}">${i.itemCode} — ${i.itemName}</option>`).join('');
    const el = document.getElementById('bom_rows');
    if (!el) return;
    if (!window._bomRows.length) {
        el.innerHTML = '<p class="text-xs text-gray-400 py-2 text-center">Belum ada bahan baku. Klik "+ Tambah Bahan".</p>';
        return;
    }
    el.innerHTML = `
    <table class="w-full text-sm border-collapse">
        <thead><tr class="bg-gray-50 text-xs text-gray-600 uppercase">
            <th class="py-2 px-2 text-left">Bahan Baku</th>
            <th class="py-2 px-2 text-right">Qty</th>
            <th class="py-2 px-2 text-center">Satuan</th>
            <th class="py-2 px-2"></th>
        </tr></thead>
        <tbody>${window._bomRows.map((r, idx) => {
        const selOpts = rmItems.map(i => `<option value="${i.id}" data-unit="${i.unit}" ${r.itemId === i.id ? 'selected' : ''}>${i.itemCode} — ${i.itemName}</option>`).join('');
        return `<tr class="border-b border-gray-100">
                <td class="py-1.5 px-2"><select onchange="updateBOMRow(${idx},'itemId',this.value,this.selectedOptions[0]?.dataset.unit)" class="w-full border border-gray-300 rounded px-2 py-1 text-sm bg-white">
                    <option value="">-- Pilih --</option>${selOpts}</select></td>
                <td class="py-1.5 px-2"><input type="number" value="${r.qty || ''}" placeholder="Qty" min="0.01" oninput="updateBOMRow(${idx},'qty',parseFloat(this.value))" class="w-20 border border-gray-300 rounded px-2 py-1 text-sm text-right"></td>
                <td class="py-1.5 px-2 text-center text-gray-500 text-xs" id="bom_unit_${idx}">${r.unit || '-'}</td>
                <td class="py-1.5 px-2 text-center"><button onclick="removeBOMRow(${idx})" class="text-red-400 hover:text-red-600"><i class="fas fa-times"></i></button></td>
            </tr>`;
    }).join('')}</tbody>
    </table>`;
}

window.addBOMRow = () => {
    window._bomRows.push({ itemId: '', qty: 0, unit: '-', wastePct: 0 });
    renderBOMRows();
};
window.updateBOMRow = (idx, field, val, unit) => {
    window._bomRows[idx][field] = val;
    if (unit !== undefined) {
        window._bomRows[idx].unit = unit || '-';
        const unitEl = document.getElementById(`bom_unit_${idx}`);
        if (unitEl) unitEl.textContent = unit || '-';
    }
};
window.removeBOMRow = (idx) => {
    window._bomRows.splice(idx, 1);
    renderBOMRows();
};

window.saveBOM = (id) => {
    const productId = document.getElementById('bom_product').value;
    const outputPerBatch = parseFloat(document.getElementById('bom_output').value);
    const status = document.getElementById('bom_status').value;
    if (!productId) { showToast('Pilih produk', 'error'); return; }
    if (!outputPerBatch || outputPerBatch <= 0) { showToast('Output per batch harus diisi', 'error'); return; }
    if (!window._bomRows.length) { showToast('Minimal 1 bahan baku', 'error'); return; }
    if (window._bomRows.some(r => !r.itemId || !r.qty)) { showToast('Lengkapi semua bahan baku', 'error'); return; }

    const code = document.getElementById('bom_code').value;
    let bomId = id;
    if (id) {
        db.update('bomHeaders', id, { productId, outputPerBatch, status, bomCode: code });
        // Delete old materials
        db.read('bomMaterials').filter(m => m.bomId === id).forEach(m => db.delete('bomMaterials', m.id));
    } else {
        // Check only 1 active BOM per product
        const existing = db.read('bomHeaders').find(b => b.productId === productId && b.status === 'ACTIVE');
        if (existing && status === 'ACTIVE') { showToast('Sudah ada 1 BOM aktif untuk produk ini. Nonaktifkan yang lama dulu.', 'error'); return; }
        const newBOM = db.insert('bomHeaders', { bomCode: code, productId, outputPerBatch, status });
        bomId = newBOM.id;
    }
    // Insert materials
    window._bomRows.forEach(r => {
        const invItem = db.findById('inventoryItems', r.itemId);
        db.insert('bomMaterials', {
            bomId, itemId: r.itemId,
            itemName: invItem?.itemName || '', itemCode: invItem?.itemCode || '',
            qty: r.qty, unit: r.unit || invItem?.unit || '-', wastePct: r.wastePct || 0
        });
    });
    showToast('BOM disimpan');
    closeModal(); renderProductionBOM();
};

window.deleteBOM = (id) => {
    if (!confirm('Hapus BOM ini?')) return;
    db.read('bomMaterials').filter(m => m.bomId === id).forEach(m => db.delete('bomMaterials', m.id));
    db.delete('bomHeaders', id);
    showToast('BOM dihapus');
    renderProductionBOM();
};

// ─── 4. MANUFACTURING ORDER ──────────────────────────────────
function renderProductionMO() {
    document.getElementById('pageTitle').innerText = 'Manufacturing Order';
    const mc = document.getElementById('main-content');
    const mos = db.read('manufacturingOrders').sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    const today = new Date().toISOString().split('T')[0];

    const rows = mos.map(mo => {
        const produced = db.getMOQtyProduced(mo.id);
        const target = parseFloat(mo.qtyTarget) || 0;
        const pct = target > 0 ? Math.min(100, (produced / target * 100)).toFixed(0) : 0;
        const isLate = mo.status === 'RUNNING' && mo.estFinishDate && today > mo.estFinishDate;

        let actions = `<button onclick="viewMO('${mo.id}')" class="text-gray-500 hover:text-gray-700 mr-1" title="Detail"><i class="fas fa-eye"></i></button>`;
        if (mo.status === 'DRAFT') {
            actions += `<button onclick="startMO('${mo.id}')" class="text-white bg-blue-600 hover:bg-blue-700 text-xs px-2 py-1 rounded mr-1">▶ Mulai</button>`;
            actions += `<button onclick="cancelMO('${mo.id}')" class="text-red-400 hover:text-red-600 mr-1"><i class="fas fa-ban"></i></button>`;
        }
        if (mo.status === 'RUNNING') {
            actions += `<button onclick="openDailyLogModal('${mo.id}')" class="text-white bg-green-600 hover:bg-green-700 text-xs px-2 py-1 rounded mr-1">+ Log</button>`;
            actions += `<button onclick="completeMO('${mo.id}')" class="text-white bg-orange-600 hover:bg-orange-700 text-xs px-2 py-1 rounded mr-1">✓ Complete</button>`;
        }

        return `<tr class="border-b border-gray-100 hover:bg-gray-50 ${isLate ? 'bg-red-50' : ''}">
            <td class="py-3 px-4 text-sm font-mono font-semibold text-blue-600">${mo.moNumber}</td>
            <td class="py-3 px-4 text-sm text-gray-800">${mo.productName || '-'}</td>
            <td class="py-3 px-4 text-sm text-gray-600 text-right">${prodFmt(target)} kg</td>
            <td class="py-3 px-4 text-sm text-gray-600">
                <div class="flex items-center gap-2">
                    <div class="flex-1 bg-gray-200 rounded-full h-1.5 min-w-[60px]">
                        <div class="bg-blue-500 h-1.5 rounded-full" style="width:${pct}%"></div>
                    </div>
                    <span class="text-xs text-gray-500">${pct}%</span>
                </div>
            </td>
            <td class="py-3 px-4 text-sm text-gray-500">${prodDate(mo.startDate)}</td>
            <td class="py-3 px-4 text-sm ${isLate ? 'text-red-600 font-semibold' : 'text-gray-500'}">${prodDate(mo.estFinishDate)}${isLate ? ' ⚠' : ''}</td>
            <td class="py-3 px-4 text-sm">${moBadge(mo.status)}</td>
            <td class="py-3 px-4 text-sm text-right">${actions}</td>
        </tr>`;
    }).join('') || `<tr><td colspan="8" class="py-8 text-center text-gray-400">Belum ada Manufacturing Order.</td></tr>`;

    mc.innerHTML = `
    <div class="bg-white rounded-lg shadow-sm border border-gray-100">
        <div class="flex justify-between items-center p-4 border-b border-gray-100">
            <h2 class="text-lg font-semibold text-gray-800">Manufacturing Order</h2>
            <button onclick="openMOModal()" class="bg-orange-600 hover:bg-orange-700 text-white px-4 py-2 rounded text-sm font-medium">
                <i class="fas fa-plus mr-2"></i>Buat MO
            </button>
        </div>
        <div class="overflow-x-auto">
            <table class="w-full text-left border-collapse">
                <thead><tr class="bg-gray-50 border-b border-gray-200">
                    <th class="py-3 px-4 text-xs font-semibold text-gray-600 uppercase">No. MO</th>
                    <th class="py-3 px-4 text-xs font-semibold text-gray-600 uppercase">Produk</th>
                    <th class="py-3 px-4 text-xs font-semibold text-gray-600 uppercase text-right">Target</th>
                    <th class="py-3 px-4 text-xs font-semibold text-gray-600 uppercase">Progress</th>
                    <th class="py-3 px-4 text-xs font-semibold text-gray-600 uppercase">Start</th>
                    <th class="py-3 px-4 text-xs font-semibold text-gray-600 uppercase">Est. Selesai</th>
                    <th class="py-3 px-4 text-xs font-semibold text-gray-600 uppercase">Status</th>
                    <th class="py-3 px-4 text-xs font-semibold text-gray-600 uppercase text-right">Aksi</th>
                </tr></thead>
                <tbody>${rows}</tbody>
            </table>
        </div>
    </div>`;
}

window.openMOModal = () => {
    const fgItems = db.read('inventoryItems').filter(i => i.category === 'FINISHED_GOODS' && i.status !== 'INACTIVE');
    const machines = db.read('machines').filter(m => m.status === 'ACTIVE');
    const moNum = db.generateMONumber();
    const today = new Date().toISOString().split('T')[0];

    const fgOpts = fgItems.map(i => `<option value="${i.id}" data-name="${i.itemName}">${i.itemCode} — ${i.itemName}</option>`).join('');
    const mchOpts = machines.map(m => `<option value="${m.id}" data-cap="${m.dailyCapacity}">${m.machineCode} — ${m.machineName} (${m.dailyCapacity}kg/hari)</option>`).join('');

    const body = `
    <div class="space-y-4">
        <div class="grid grid-cols-2 gap-3">
            <div><label class="block text-sm font-medium text-gray-700 mb-1">No. MO</label>
                <input id="mo_number" value="${moNum}" readonly class="w-full border border-gray-200 rounded px-3 py-2 bg-gray-50 text-sm"></div>
            <div><label class="block text-sm font-medium text-gray-700 mb-1">Tanggal Mulai</label>
                <input type="date" id="mo_start" value="${today}" oninput="moCalcEstFinish()" class="w-full border border-gray-300 rounded px-3 py-2 text-sm"></div>
        </div>
        <div class="grid grid-cols-2 gap-3">
            <div><label class="block text-sm font-medium text-gray-700 mb-1">Finished Product</label>
                <select id="mo_product" onchange="moLoadBOM()" class="w-full border border-gray-300 rounded px-3 py-2 text-sm bg-white">
                    <option value="">-- Pilih Produk --</option>${fgOpts}
                </select></div>
            <div><label class="block text-sm font-medium text-gray-700 mb-1">Target Produksi (kg)</label>
                <input type="number" id="mo_qty" placeholder="1000" oninput="moCalcEstFinish()" class="w-full border border-gray-300 rounded px-3 py-2 text-sm"></div>
        </div>
        <div class="grid grid-cols-2 gap-3">
            <div><label class="block text-sm font-medium text-gray-700 mb-1">Mesin (Oven)</label>
                <select id="mo_machine" onchange="moCalcEstFinish()" class="w-full border border-gray-300 rounded px-3 py-2 text-sm bg-white">
                    <option value="">-- Pilih Mesin --</option>${mchOpts}
                </select></div>
            <div><label class="block text-sm font-medium text-gray-700 mb-1">Est. Selesai (auto)</label>
                <input id="mo_est_finish" readonly class="w-full border border-gray-200 rounded px-3 py-2 bg-gray-50 text-sm" placeholder="Otomatis"></div>
        </div>
        <div id="mo_bom_preview" class="hidden border border-orange-200 bg-orange-50 rounded-lg p-3 text-sm"></div>
        <div><label class="block text-sm font-medium text-gray-700 mb-1">Catatan</label>
            <textarea id="mo_notes" rows="2" placeholder="Opsional" class="w-full border border-gray-300 rounded px-3 py-2 text-sm"></textarea></div>
    </div>`;
    const footer = `
        <button onclick="saveMO()" class="w-full sm:w-auto inline-flex justify-center rounded-md bg-orange-600 px-4 py-2 text-white text-sm font-medium hover:bg-orange-700 sm:ml-3">Simpan MO Draft</button>
        <button onclick="closeModal()" class="mt-3 sm:mt-0 w-full sm:w-auto inline-flex justify-center rounded-md border border-gray-300 px-4 py-2 bg-white text-gray-700 text-sm font-medium sm:ml-3">Batal</button>`;
    showModal('Buat Manufacturing Order', body, footer);
};

window.moCalcEstFinish = () => {
    const start = document.getElementById('mo_start')?.value;
    const qty = parseFloat(document.getElementById('mo_qty')?.value) || 0;
    const mchSel = document.getElementById('mo_machine');
    const cap = parseFloat(mchSel?.selectedOptions[0]?.dataset.cap) || 0;
    const estEl = document.getElementById('mo_est_finish');
    if (start && qty && cap) {
        estEl.value = calcEstFinish(start, qty, cap);
    } else {
        estEl.value = '';
    }
};

window.moLoadBOM = () => {
    const productSel = document.getElementById('mo_product');
    const productId = productSel?.value;
    const preview = document.getElementById('mo_bom_preview');
    if (!productId || !preview) { preview.classList.add('hidden'); return; }
    const bom = db.read('bomHeaders').find(b => b.productId === productId && b.status === 'ACTIVE');
    if (!bom) { preview.classList.remove('hidden'); preview.innerHTML = '<p class="text-orange-700"><i class="fas fa-exclamation-triangle mr-1"></i>Tidak ada BOM aktif untuk produk ini. Buat BOM terlebih dahulu.</p>'; return; }
    const materials = db.read('bomMaterials').filter(m => m.bomId === bom.id);
    const rows = materials.map(m => {
        const stk = db.getInventoryStock(m.itemId);
        const ok = stk >= m.qty;
        return `<tr class="${ok ? '' : 'text-red-600'}">
            <td class="py-1">${m.itemCode} — ${m.itemName}</td>
            <td class="py-1 px-3 text-right">${prodFmt(m.qty)} ${m.unit}</td>
            <td class="py-1 text-right">${ok ? '<span class="text-green-600">✓</span>' : '<span class="text-red-600">✗ Kurang</span>'}</td>
        </tr>`;
    }).join('');
    preview.classList.remove('hidden');
    preview.innerHTML = `<p class="font-semibold text-orange-800 mb-2"><i class="fas fa-clipboard-list mr-1"></i>BOM: ${bom.bomCode} (${prodFmt(bom.outputPerBatch)} kg/batch)</p>
        <table class="w-full text-xs">${rows}</table>`;
};

window.saveMO = () => {
    const productSel = document.getElementById('mo_product');
    const productId = productSel?.value;
    const productName = productSel?.selectedOptions[0]?.dataset.name || '';
    const qty = parseFloat(document.getElementById('mo_qty')?.value);
    const machSel = document.getElementById('mo_machine');
    const machineId = machSel?.value;
    const machineName = machSel?.selectedOptions[0]?.textContent?.split(' — ')[1]?.split(' (')[0] || '';
    const startDate = document.getElementById('mo_start')?.value;
    const estFinishDate = document.getElementById('mo_est_finish')?.value;
    const notes = document.getElementById('mo_notes')?.value;

    if (!productId) { showToast('Pilih produk', 'error'); return; }
    if (!qty || qty <= 0) { showToast('Target produksi harus diisi', 'error'); return; }
    if (!machineId) { showToast('Pilih mesin', 'error'); return; }

    // Verify BOM exists
    const bom = db.read('bomHeaders').find(b => b.productId === productId && b.status === 'ACTIVE');
    if (!bom) { showToast('Tidak ada BOM aktif untuk produk ini!', 'error'); return; }

    db.insert('manufacturingOrders', {
        moNumber: document.getElementById('mo_number').value,
        productId, productName, qtyTarget: qty,
        bomId: bom.id, machineId, machineName,
        startDate, estFinishDate, notes,
        status: 'DRAFT', qtyProduced: 0
    });
    showToast('MO Draft berhasil dibuat');
    closeModal(); renderProductionMO();
};

window.startMO = (id) => {
    const mo = db.findById('manufacturingOrders', id);
    if (!mo) return;
    const bom = db.findById('bomHeaders', mo.bomId);
    if (!bom) { showToast('BOM tidak ditemukan!', 'error'); return; }

    const materials = db.read('bomMaterials').filter(m => m.bomId === bom.id);
    const target = parseFloat(mo.qtyTarget) || 0;
    const outputPerBatch = parseFloat(bom.outputPerBatch) || 1;
    const batchFactor = target / outputPerBatch;

    // Cek stok semua bahan baku
    const errors = [];
    materials.forEach(mat => {
        const needed = mat.qty * batchFactor * (1 + (parseFloat(mat.wastePct) || 0) / 100);
        if (!db.validateInventoryStock(mat.itemId, needed)) {
            const stk = db.getInventoryStock(mat.itemId);
            errors.push(`⚠ ${mat.itemName}: Butuh ${prodFmt(needed)} ${mat.unit}, Stok: ${prodFmt(stk)} ${mat.unit}`);
        }
    });

    if (errors.length) {
        alert('STOK TIDAK CUKUP!\n\n' + errors.join('\n') + '\n\nMO tidak bisa dimulai.');
        return;
    }

    if (!confirm(`Mulai produksi ${mo.moNumber}?\nBahan baku akan dikurangi dari Inventory otomatis.`)) return;

    // Kurangi stok Raw Material dari Inventory (base qty saja, tanpa waste factor)
    materials.forEach(mat => {
        const needed = mat.qty * batchFactor;
        db.addInventoryTransaction(mat.itemId, 'OUT', needed, 'PRODUCTION_OUT', id,
            `Konsumsi produksi ${mo.moNumber}: ${mat.itemName}`);
    });

    db.update('manufacturingOrders', id, { status: 'RUNNING' });
    showToast(`✅ MO ${mo.moNumber} dimulai! Stok bahan baku dikurangi.`, 'success');
    renderProductionMO();
};

window.completeMO = (id) => {
    const mo = db.findById('manufacturingOrders', id);
    if (!mo) return;
    const today = new Date().toISOString().split('T')[0];
    const produced = db.getMOQtyProduced(id);
    const target = parseFloat(mo.qtyTarget) || 0;

    // Validasi qty cukup
    if (produced < target) {
        showToast(`Belum bisa Complete. Produksi baru ${prodFmt(produced)} dari ${prodFmt(target)} kg. Tambah log harian dulu.`, 'error');
        return;
    }

    // Ambil bahan baku dari BOM untuk ditampilkan di modal penyusutan
    const bom = db.findById('bomHeaders', mo.bomId);
    const materials = bom ? db.read('bomMaterials').filter(m => m.bomId === bom.id) : [];

    const batchFactor = target / (parseFloat(bom?.outputPerBatch) || 1);
    // Store consumed per material for % calculation
    window._shrinkMats = materials.map((mat, idx) => ({
        idx, itemId: mat.itemId, itemName: mat.itemName,
        itemCode: mat.itemCode, unit: mat.unit,
        consumed: mat.qty * batchFactor
    }));

    const shrinkageRows = window._shrinkMats.map((mat) => `
        <tr class="border-b border-gray-100">
            <td class="py-2 px-3 text-sm text-gray-700">${mat.itemCode} — ${mat.itemName}</td>
            <td class="py-2 px-3 text-sm text-gray-500 text-right">${prodFmt(mat.consumed)}</td>
            <td class="py-2 px-3 text-sm text-gray-500 text-center">${mat.unit}</td>
            <td class="py-2 px-3">
                <input type="number" id="shrink_qty_${mat.idx}" min="0" step="0.01" placeholder="0"
                    data-item-id="${mat.itemId}" data-item-name="${mat.itemName}"
                    data-unit="${mat.unit}" data-consumed="${mat.consumed}"
                    oninput="calcShrinkPct()"
                    class="w-24 border border-gray-300 rounded px-2 py-1 text-sm text-right">
            </td>
            <td class="py-2 px-3 text-sm text-right font-semibold" id="shrink_pct_${mat.idx}">—</td>
        </tr>`).join('');

    const earlyFinish = mo.estFinishDate && today < mo.estFinishDate
        ? `<div class="bg-yellow-50 border border-yellow-200 rounded p-2 text-sm text-yellow-700 mb-3">
            ⚠ Est. selesai ${prodDate(mo.estFinishDate)}, hari ini ${prodDate(today)} (lebih awal).
           </div>` : '';

    const body = `
    <div class="space-y-4">
        ${earlyFinish}
        <div class="grid grid-cols-3 gap-3 text-center">
            <div class="bg-blue-50 rounded-lg p-3">
                <p class="text-xl font-bold text-blue-700">${prodFmt(target)}</p><p class="text-xs text-gray-500">Target (kg)</p>
            </div>
            <div class="bg-green-50 rounded-lg p-3">
                <p class="text-xl font-bold text-green-700">${prodFmt(produced)}</p><p class="text-xs text-gray-500">Qty Diproduksi (kg)</p>
            </div>
            <div class="bg-orange-50 rounded-lg p-3">
                <p class="text-xl font-bold text-orange-700">${mo.productName}</p><p class="text-xs text-gray-500">Produk</p>
            </div>
        </div>

        <div class="border border-orange-200 bg-orange-50 rounded-lg p-3">
            <p class="text-sm font-semibold text-orange-800 mb-1"><i class="fas fa-exclamation-triangle mr-1"></i>Input Penyusutan / NG</p>
            <p class="text-xs text-orange-600 mb-3">Masukkan qty bahan baku yang susut / jadi NG. Kosongkan jika tidak ada.</p>
            ${materials.length ? `
            <table class="w-full">
                <thead><tr class="bg-orange-100 text-xs text-orange-700 uppercase">
                    <th class="py-2 px-3 text-left">Bahan Baku</th>
                    <th class="py-2 px-3 text-right">Qty Dipakai</th>
                    <th class="py-2 px-3 text-center">Satuan</th>
                    <th class="py-2 px-3 text-right">Qty Susut</th>
                    <th class="py-2 px-3 text-right">% Susut</th>
                </tr></thead>

                <tbody>${shrinkageRows}</tbody>
                <tfoot><tr class="bg-orange-100 font-semibold">
                    <td class="py-2 px-3 text-sm text-orange-800" colspan="2">Total Penyusutan Produk</td>
                    <td class="py-2 px-3 text-sm text-center text-orange-700">kg</td>
                    <td class="py-2 px-3 text-sm text-right text-orange-800" id="shrink_total_qty">0</td>
                    <td class="py-2 px-3 text-sm text-right text-orange-800" id="shrink_total_pct">0.00%</td>
                </tr></tfoot>
            </table>` : '<p class="text-sm text-gray-400">Tidak ada bahan baku di BOM.</p>'}
        </div>

        <div><label class="block text-sm font-medium text-gray-700 mb-1">Catatan Penyusutan</label>
            <textarea id="complete_notes" rows="2" placeholder="Opsional — sebab penyusutan, jenis NG, dll"
                class="w-full border border-gray-300 rounded px-3 py-2 text-sm"></textarea></div>
    </div>`;

    const footer = `
        <button onclick="confirmCompleteMO('${id}', ${materials.length})" class="w-full sm:w-auto inline-flex justify-center rounded-md bg-green-600 px-4 py-2 text-white text-sm font-medium hover:bg-green-700 sm:ml-3">
            <i class="fas fa-check mr-2"></i>Selesaikan Produksi
        </button>
        <button onclick="closeModal()" class="mt-3 sm:mt-0 w-full sm:w-auto inline-flex justify-center rounded-md border border-gray-300 px-4 py-2 bg-white text-gray-700 text-sm font-medium sm:ml-3">Batal</button>`;

    showModal(`Selesaikan MO — ${mo.moNumber}`, body, footer);
};

// Live-calculate % susut saat user mengetik
window.calcShrinkPct = () => {
    if (!window._shrinkMats) return;
    let totalConsumed = 0, totalShrink = 0;
    window._shrinkMats.forEach(mat => {
        const input = document.getElementById(`shrink_qty_${mat.idx}`);
        const shrinkQty = parseFloat(input?.value) || 0;
        const pct = mat.consumed > 0 ? (shrinkQty / mat.consumed * 100) : 0;
        const pctEl = document.getElementById(`shrink_pct_${mat.idx}`);
        if (pctEl) {
            pctEl.textContent = pct > 0 ? pct.toFixed(2) + '%' : '—';
            pctEl.className = `py-2 px-3 text-sm text-right font-semibold ${pct > 10 ? 'text-red-600' : pct > 0 ? 'text-orange-600' : 'text-gray-400'}`;
        }
        totalConsumed += mat.consumed;
        totalShrink += shrinkQty;
    });
    const totalPct = totalConsumed > 0 ? (totalShrink / totalConsumed * 100) : 0;
    const totalQtyEl = document.getElementById('shrink_total_qty');
    const totalPctEl = document.getElementById('shrink_total_pct');
    if (totalQtyEl) totalQtyEl.textContent = prodFmt(totalShrink);
    if (totalPctEl) {
        totalPctEl.textContent = totalPct.toFixed(2) + '%';
        totalPctEl.className = `py-2 px-3 text-sm text-right font-bold ${totalPct > 10 ? 'text-red-700' : 'text-orange-800'}`;
    }
};

window.confirmCompleteMO = (id, materialCount) => {
    const mo = db.findById('manufacturingOrders', id);
    if (!mo) return;
    const today = new Date().toISOString().split('T')[0];
    const produced = db.getMOQtyProduced(id);
    const notes = document.getElementById('complete_notes')?.value || '';

    // Catat penyusutan per bahan
    const shrinkageItems = [];
    for (let idx = 0; idx < materialCount; idx++) {
        const input = document.getElementById(`shrink_qty_${idx}`);
        const qty = parseFloat(input?.value) || 0;
        if (qty > 0) {
            shrinkageItems.push({
                itemId: input.dataset.itemId,
                itemName: input.dataset.itemName,
                unit: input.dataset.unit,
                qty
            });
        }
    }

    // OUT penyusutan dari Inventory (terpisah dari konsumsi produksi)
    shrinkageItems.forEach(s => {
        db.addInventoryTransaction(s.itemId, 'OUT', s.qty, 'PRODUCTION_OUT', id,
            `Penyusutan/NG produksi ${mo.moNumber}: ${s.itemName}`);
    });

    // IN Finished Goods ke Inventory
    db.addInventoryTransaction(mo.productId, 'IN', produced, 'PRODUCTION_IN', id,
        `Output produksi ${mo.moNumber}: ${mo.productName}`);

    db.update('manufacturingOrders', id, {
        status: 'COMPLETED',
        qtyProduced: produced,
        actualFinishDate: today,
        shrinkageItems,
        completionNotes: notes
    });

    const shrinkInfo = shrinkageItems.length
        ? `\nPenyusutan dicatat: ${shrinkageItems.map(s => `${s.itemName} ${prodFmt(s.qty)} ${s.unit}`).join(', ')}`
        : '';
    showToast(`✅ MO ${mo.moNumber} selesai! ${prodFmt(produced)} kg ${mo.productName} masuk Inventory.${shrinkInfo}`, 'success');
    closeModal();
    renderProductionMO();
};


window.cancelMO = (id) => {
    const mo = db.findById('manufacturingOrders', id);
    if (!confirm(`Batalkan MO ${mo?.moNumber}?`)) return;
    db.update('manufacturingOrders', id, { status: 'CANCELLED' });
    showToast('MO dibatalkan');
    renderProductionMO();
};

window.viewMO = (id) => {
    const mo = db.findById('manufacturingOrders', id);
    if (!mo) return;
    const produced = db.getMOQtyProduced(id);
    const target = parseFloat(mo.qtyTarget) || 0;
    const pct = target > 0 ? Math.min(100, (produced / target * 100)).toFixed(1) : 0;
    const logs = db.read('dailyProductionLogs').filter(l => l.moId === id).sort((a, b) => a.date.localeCompare(b.date));
    const logRows = logs.map(l => `<tr class="border-b border-gray-100">
        <td class="py-2 px-3 text-sm">${prodDate(l.date)}</td>
        <td class="py-2 px-3 text-sm text-right font-medium">${prodFmt(l.qtyProduced)} kg</td>
        <td class="py-2 px-3 text-sm text-gray-500">${l.notes || '-'}</td>
    </tr>`).join('') || '<tr><td colspan="3" class="py-4 text-center text-gray-400">Belum ada log harian.</td></tr>';

    const bom = mo.bomId ? db.findById('bomHeaders', mo.bomId) : null;
    const materials = bom ? db.read('bomMaterials').filter(m => m.bomId === bom.id) : [];

    // Hitung batch factor untuk Qty Dipakai di BOM
    const outputPerBatch = parseFloat(bom?.outputPerBatch) || 1;
    const batchFactor = target / outputPerBatch;

    const matRows = materials.map(m => `<tr class="border-b border-gray-100">
        <td class="py-2 px-3 text-sm">${m.itemCode} — ${m.itemName}</td>
        <td class="py-2 px-3 text-sm text-right">${prodFmt(m.qty * batchFactor)} ${m.unit}</td>
    </tr>`).join('');

    const shrinkItems = mo.shrinkageItems || [];
    let totalShrink = 0, totalConsumed = 0;

    // Kalkulasi persentase di viewMO
    const shrinkRows = shrinkItems.map(s => {
        const mat = materials.find(m => m.itemId === s.itemId);
        const consumed = mat ? (mat.qty * batchFactor) : 0;
        const pct = consumed > 0 ? (s.qty / consumed * 100) : 0;
        totalShrink += s.qty;
        totalConsumed += consumed;
        return `<tr class="border-b border-gray-100">
            <td class="py-2 px-3 text-sm">${s.itemName}</td>
            <td class="py-2 px-3 text-sm text-right">${prodFmt(consumed)}</td>
            <td class="py-2 px-3 text-sm text-center">${s.unit}</td>
            <td class="py-2 px-3 text-sm text-right text-orange-600 font-medium">${prodFmt(s.qty)}</td>
            <td class="py-2 px-3 text-sm text-right font-medium ${pct > 10 ? 'text-red-600' : 'text-orange-600'}">${pct > 0 ? pct.toFixed(2) + '%' : '0%'}</td>
        </tr>`;
    }).join('');

    const totalPct = totalConsumed > 0 ? (totalShrink / totalConsumed * 100) : 0;

    const body = `
    <div class="space-y-4">
        <div class="grid grid-cols-3 gap-3 text-center">
            <div class="bg-blue-50 rounded-lg p-3">
                <p class="text-2xl font-bold text-blue-700">${prodFmt(target)}</p><p class="text-xs text-gray-500">Target (kg)</p>
            </div>
            <div class="bg-green-50 rounded-lg p-3">
                <p class="text-2xl font-bold text-green-700">${prodFmt(produced)}</p><p class="text-xs text-gray-500">Diproduksi (kg)</p>
            </div>
            <div class="bg-orange-50 rounded-lg p-3">
                <p class="text-2xl font-bold text-orange-700">${pct}%</p><p class="text-xs text-gray-500">Progress</p>
            </div>
        </div>
        <div class="w-full bg-gray-200 rounded-full h-3">
            <div class="bg-blue-500 h-3 rounded-full" style="width:${pct}%"></div>
        </div>
        <div class="grid grid-cols-2 gap-3 text-sm">
            <div><p class="text-gray-500 text-xs">Produk</p><p class="font-medium">${mo.productName || '-'}</p></div>
            <div><p class="text-gray-500 text-xs">Mesin</p><p class="font-medium">${mo.machineName || '-'}</p></div>
            <div><p class="text-gray-500 text-xs">Mulai</p><p class="font-medium">${prodDate(mo.startDate)}</p></div>
            <div><p class="text-gray-500 text-xs">Est. Selesai</p><p class="font-medium">${prodDate(mo.estFinishDate)}</p></div>
            <div><p class="text-gray-500 text-xs">Status</p><p>${moBadge(mo.status)}</p></div>
            <div><p class="text-gray-500 text-xs">Selesai Aktual</p><p class="font-medium">${prodDate(mo.actualFinishDate)}</p></div>
        </div>
        ${materials.length ? `
        <div class="border-t pt-3">
            <p class="text-sm font-semibold text-gray-700 mb-2">Bahan Baku & Konsumsi</p>
            <table class="w-full text-sm border"><thead><tr class="bg-gray-50 text-xs text-gray-600 uppercase">
                <th class="py-2 px-3 text-left">Item</th><th class="py-2 px-3 text-right">Qty Dipakai</th>
            </tr></thead><tbody>${matRows}</tbody></table>
        </div>` : ''}
        ${shrinkItems.length ? `
        <div class="border-t pt-3">
            <p class="text-sm font-semibold text-orange-800 mb-2"><i class="fas fa-exclamation-triangle mr-1"></i>Rekap Penyusutan / NG</p>
            <table class="w-full text-sm border border-orange-200">
                <thead><tr class="bg-orange-50 text-xs text-orange-700 uppercase">
                    <th class="py-2 px-3 text-left">Bahan Baku</th>
                    <th class="py-2 px-3 text-right">Dipakai</th>
                    <th class="py-2 px-3 text-center">Satuan</th>
                    <th class="py-2 px-3 text-right">Susut</th>
                    <th class="py-2 px-3 text-right">% Susut</th>
                </tr></thead>
                <tbody>${shrinkRows}</tbody>
                <tfoot><tr class="bg-orange-100 font-semibold text-orange-800">
                    <td class="py-2 px-3 text-sm" colspan="2">Total Penyusutan Produk</td>
                    <td class="py-2 px-3 text-sm text-center">kg</td>
                    <td class="py-2 px-3 text-sm text-right">${prodFmt(totalShrink)}</td>
                    <td class="py-2 px-3 text-sm text-right">${totalPct.toFixed(2)}%</td>
                </tr></tfoot>
            </table>
            ${mo.completionNotes ? `<p class="text-xs text-gray-500 mt-2 bg-gray-50 p-2 rounded"><b>Catatan:</b> ${mo.completionNotes}</p>` : ''}
        </div>` : ''}
        <div class="border-t pt-3">
            <p class="text-sm font-semibold text-gray-700 mb-2">Log Produksi Harian</p>
            <table class="w-full"><thead><tr class="bg-gray-50 text-xs text-gray-600 uppercase">
                <th class="py-2 px-3 text-left">Tanggal</th><th class="py-2 px-3 text-right">Qty Produksi</th><th class="py-2 px-3">Catatan</th>
            </tr></thead><tbody>${logRows}</tbody></table>
        </div>
    </div>`;
    const footer = `<button onclick="closeModal()" class="w-full sm:w-auto inline-flex justify-center rounded-md border border-gray-300 px-4 py-2 bg-white text-gray-700 text-sm font-medium sm:ml-3">Tutup</button>`;
    showModal(`Detail MO — ${mo.moNumber}`, body, footer);
};

// ─── 5. DAILY PRODUCTION LOG ────────────────────────────────
function renderProductionLog() {
    document.getElementById('pageTitle').innerText = 'Log Produksi Harian';
    const mc = document.getElementById('main-content');
    const logs = db.read('dailyProductionLogs').sort((a, b) => b.date.localeCompare(a.date));
    const mos = db.read('manufacturingOrders');

    const rows = logs.map(l => {
        const mo = mos.find(m => m.id === l.moId);
        return `<tr class="border-b border-gray-100 hover:bg-gray-50">
            <td class="py-3 px-4 text-sm text-gray-600">${prodDate(l.date)}</td>
            <td class="py-3 px-4 text-sm font-mono text-blue-600">${mo?.moNumber || '-'}</td>
            <td class="py-3 px-4 text-sm text-gray-800">${mo?.productName || '-'}</td>
            <td class="py-3 px-4 text-sm text-right font-medium text-green-700">+${prodFmt(l.qtyProduced)} kg</td>
            <td class="py-3 px-4 text-sm text-gray-500">${l.machineName || '-'}</td>
            <td class="py-3 px-4 text-sm text-gray-400">${l.notes || '-'}</td>
        </tr>`;
    }).join('') || `<tr><td colspan="6" class="py-8 text-center text-gray-400">Belum ada log produksi harian.</td></tr>`;

    mc.innerHTML = `
    <div class="bg-white rounded-lg shadow-sm border border-gray-100">
        <div class="flex justify-between items-center p-4 border-b border-gray-100">
            <h2 class="text-lg font-semibold text-gray-800">Log Produksi Harian</h2>
            <button onclick="openDailyLogModal()" class="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded text-sm font-medium">
                <i class="fas fa-plus mr-2"></i>Tambah Log
            </button>
        </div>
        <div class="overflow-x-auto">
            <table class="w-full text-left border-collapse">
                <thead><tr class="bg-gray-50 border-b border-gray-200">
                    <th class="py-3 px-4 text-xs font-semibold text-gray-600 uppercase">Tanggal</th>
                    <th class="py-3 px-4 text-xs font-semibold text-gray-600 uppercase">No. MO</th>
                    <th class="py-3 px-4 text-xs font-semibold text-gray-600 uppercase">Produk</th>
                    <th class="py-3 px-4 text-xs font-semibold text-gray-600 uppercase text-right">Qty Produksi</th>
                    <th class="py-3 px-4 text-xs font-semibold text-gray-600 uppercase">Mesin</th>
                    <th class="py-3 px-4 text-xs font-semibold text-gray-600 uppercase">Catatan</th>
                </tr></thead>
                <tbody>${rows}</tbody>
            </table>
        </div>
    </div>`;
}

window.openDailyLogModal = (preselectedMoId = null) => {
    const runningMOs = db.read('manufacturingOrders').filter(m => m.status === 'RUNNING');
    const today = new Date().toISOString().split('T')[0];
    const moOpts = runningMOs.map(m => {
        const produced = db.getMOQtyProduced(m.id);
        const rem = Math.max(0, (parseFloat(m.qtyTarget) || 0) - produced);
        return `<option value="${m.id}" data-machine="${m.machineId}" data-rem="${rem}" ${preselectedMoId === m.id ? 'selected' : ''}>${m.moNumber} — ${m.productName} (Sisa: ${prodFmt(rem)} kg)</option>`;
    }).join('');

    if (!runningMOs.length) { showToast('Tidak ada MO yang sedang berjalan.', 'error'); return; }

    const body = `
    <div class="space-y-4">
        <div class="grid grid-cols-2 gap-3">
            <div><label class="block text-sm font-medium text-gray-700 mb-1">Tanggal</label>
                <input type="date" id="log_date" value="${today}" oninput="logCheckCapacity()" class="w-full border border-gray-300 rounded px-3 py-2 text-sm"></div>
            <div><label class="block text-sm font-medium text-gray-700 mb-1">Manufacturing Order</label>
                <select id="log_mo" onchange="logCheckCapacity()" class="w-full border border-gray-300 rounded px-3 py-2 text-sm bg-white">
                    <option value="">-- Pilih MO --</option>${moOpts}
                </select></div>
        </div>
        <div class="grid grid-cols-2 gap-3">
            <div><label class="block text-sm font-medium text-gray-700 mb-1">Qty Produksi Hari Ini (kg)</label>
                <input type="number" id="log_qty" min="0.01" step="0.01" placeholder="0" oninput="logCheckCapacity()" class="w-full border border-gray-300 rounded px-3 py-2 text-sm"></div>
            <div><label class="block text-sm font-medium text-gray-700 mb-1">Catatan</label>
                <input id="log_notes" placeholder="Opsional" class="w-full border border-gray-300 rounded px-3 py-2 text-sm"></div>
        </div>
        <div id="log_capacity_info" class="hidden rounded-lg p-3 text-sm"></div>
    </div>`;
    const footer = `
        <button onclick="saveDailyLog()" class="w-full sm:w-auto inline-flex justify-center rounded-md bg-green-600 px-4 py-2 text-white text-sm font-medium hover:bg-green-700 sm:ml-3">Simpan Log</button>
        <button onclick="closeModal()" class="mt-3 sm:mt-0 w-full sm:w-auto inline-flex justify-center rounded-md border border-gray-300 px-4 py-2 bg-white text-gray-700 text-sm font-medium sm:ml-3">Batal</button>`;
    showModal('Log Produksi Harian', body, footer);
    if (preselectedMoId) setTimeout(logCheckCapacity, 100);
};

window.logCheckCapacity = () => {
    const moSel = document.getElementById('log_mo');
    const moId = moSel?.value;
    const date = document.getElementById('log_date')?.value;
    const qty = parseFloat(document.getElementById('log_qty')?.value) || 0;
    const infoEl = document.getElementById('log_capacity_info');
    if (!moId || !infoEl) return;

    const mo = db.findById('manufacturingOrders', moId);
    if (!mo || !mo.machineId) return;
    const machine = db.findById('machines', mo.machineId);
    if (!machine) return;

    const cap = parseFloat(machine.dailyCapacity) || 0;
    const used = db.getMachineCapacityUsed(mo.machineId, date);
    const remaining = cap - used;
    const exceedsCapacity = qty > remaining;

    infoEl.classList.remove('hidden');
    infoEl.className = `rounded-lg p-3 text-sm ${exceedsCapacity ? 'bg-red-50 border border-red-200' : 'bg-blue-50 border border-blue-200'}`;
    infoEl.innerHTML = `<p class="font-semibold ${exceedsCapacity ? 'text-red-700' : 'text-blue-700'}">${machine.machineName}</p>
        <p class="${exceedsCapacity ? 'text-red-600' : 'text-blue-600'}">Kapasitas: ${prodFmt(cap)} kg/hari · Sudah terpakai: ${prodFmt(used)} kg · Sisa: ${prodFmt(remaining)} kg</p>
        ${exceedsCapacity ? `<p class="text-red-700 font-semibold mt-1">⚠ Qty melebihi kapasitas mesin yang tersisa hari ini!</p>` : ''}`;
};

window.saveDailyLog = () => {
    const moSel = document.getElementById('log_mo');
    const moId = moSel?.value;
    const date = document.getElementById('log_date')?.value;
    const qty = parseFloat(document.getElementById('log_qty')?.value);
    const notes = document.getElementById('log_notes')?.value;

    if (!moId) { showToast('Pilih MO', 'error'); return; }
    if (!qty || qty <= 0) { showToast('Qty produksi harus diisi', 'error'); return; }

    const mo = db.findById('manufacturingOrders', moId);
    const machine = mo?.machineId ? db.findById('machines', mo.machineId) : null;

    // Cek kapasitas mesin
    if (machine) {
        const cap = parseFloat(machine.dailyCapacity) || 0;
        const used = db.getMachineCapacityUsed(mo.machineId, date);
        if (qty > (cap - used)) {
            if (!confirm(`Qty melebihi kapasitas sisa mesin (${prodFmt(cap - used)} kg). Tetap simpan?`)) return;
        }
    }

    db.insert('dailyProductionLogs', {
        date, moId, qtyProduced: qty, notes,
        machineId: mo?.machineId || '', machineName: machine?.machineName || ''
    });

    // Update total qtyProduced di MO
    const totalProduced = db.getMOQtyProduced(moId) + qty;
    db.update('manufacturingOrders', moId, { qtyProduced: totalProduced });

    showToast(`Log ditambahkan: +${prodFmt(qty)} kg`, 'success');
    closeModal();
    renderProductionLog();
};

