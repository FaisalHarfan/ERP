// settings.js - Settings & User Management Module

// ─── MODULE LABELS ─────────────────────────────────────────────
const MODULE_LABELS = {
    penjualan: 'Penjualan',
    pembelian: 'Pembelian',
    logistik: 'Logistik',
    produksi: 'Produksi',
    pengaturan: 'Pengaturan'
};

const MODULES = Object.keys(MODULE_LABELS);

// ─── 1. USER MANAGEMENT ────────────────────────────────────────
window.renderSettingsUsers = () => {
    document.getElementById('pageTitle').innerText = 'Manajemen Pengguna';
    const mc = document.getElementById('main-content');
    const users = db.read('users');
    const roles = db.read('roles');

    const rows = users.map(u => {
        const role = roles.find(r => r.id === u.roleId) || { name: '-' };
        const statusBadge = u.status === 'AKTIF'
            ? `<span class="px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded-full bg-green-100 text-green-700">Aktif</span>`
            : `<span class="px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded-full bg-red-100 text-red-600">Nonaktif</span>`;

        const initials = (u.avatar || u.fullName.split(' ').map(w => w[0]).join('').slice(0, 2)).toUpperCase();

        const systemBadge = u.id === 'user_admin' ? `<span class="ml-1 text-[9px] text-blue-400 font-bold">(System)</span>` : '';
        const editBtn = `<button onclick="openUserModal('${u.id}')" class="text-blue-500 hover:text-blue-700 mr-3" title="Edit"><i class="fas fa-pen text-xs"></i></button>`;
        const toggleBtn = u.id !== 'user_admin'
            ? `<button onclick="toggleUserStatus('${u.id}')" class="text-${u.status === 'AKTIF' ? 'orange' : 'green'}-500 hover:text-${u.status === 'AKTIF' ? 'orange' : 'green'}-700" title="${u.status === 'AKTIF' ? 'Nonaktifkan' : 'Aktifkan'}"><i class="fas fa-${u.status === 'AKTIF' ? 'user-slash' : 'user-check'} text-xs"></i></button>`
            : `<span class="text-gray-300 text-xs italic">Super User</span>`;

        return `<tr class="border-b border-gray-100 hover:bg-gray-50 transition-colors">
            <td class="py-3 px-4">
                <div class="flex items-center gap-3">
                    <div class="w-9 h-9 rounded-full bg-blue-500 flex items-center justify-center text-white text-xs font-black shadow-sm shrink-0">${initials}</div>
                    <div>
                        <p class="text-sm font-bold text-gray-800">${u.fullName}${systemBadge}</p>
                        <p class="text-xs text-gray-400">${u.email || u.username || '-'}</p>
                    </div>
                </div>
            </td>
            <td class="py-3 px-4 text-sm text-gray-600">${role.name}</td>
            <td class="py-3 px-4">${statusBadge}</td>
            <td class="py-3 px-4 text-right">${editBtn}${toggleBtn}</td>
        </tr>`;
    }).join('');

    mc.innerHTML = `
        <div class="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <div class="p-5 border-b border-gray-100 flex justify-between items-center">
                <div>
                    <h2 class="text-lg font-bold text-gray-800 tracking-tight">Daftar Pengguna</h2>
                    <p class="text-xs text-gray-400 mt-0.5">Kelola akun pengguna yang dapat mengakses sistem</p>
                </div>
                <button onclick="openUserModal()" class="bg-blue-600 hover:bg-blue-700 text-white text-sm px-4 py-2 rounded-lg font-bold transition-colors shadow-sm flex items-center gap-2">
                    <i class="fas fa-plus"></i> Tambah Pengguna
                </button>
            </div>
            <div class="overflow-x-auto">
                <table class="w-full text-left">
                    <thead><tr class="bg-gray-50 border-b border-gray-200">
                        <th class="py-3 px-4 text-[10px] font-bold text-gray-500 uppercase tracking-wider">Pengguna</th>
                        <th class="py-3 px-4 text-[10px] font-bold text-gray-500 uppercase tracking-wider">Peran</th>
                        <th class="py-3 px-4 text-[10px] font-bold text-gray-500 uppercase tracking-wider">Status</th>
                        <th class="py-3 px-4 text-[10px] font-bold text-gray-500 uppercase tracking-wider text-right">Aksi</th>
                    </tr></thead>
                    <tbody>${rows || '<tr><td colspan="4" class="py-10 text-center text-gray-400">Belum ada pengguna.</td></tr>'}</tbody>
                </table>
            </div>
        </div>`;
};

window.openUserModal = (userId = null) => {
    const user = userId ? db.findById('users', userId) : null;
    const roles = db.read('roles');
    const roleOpts = roles.map(r => `<option value="${r.id}" ${user?.roleId === r.id ? 'selected' : ''}>${r.name}</option>`).join('');

    // Get user's existing permissions or fall back to role defaults
    const userRoles = db.read('roles');
    const userRole = userRoles.find(r => r.id === (user?.roleId || ''));
    const existingPerms = user?.permissions || userRole?.permissions || {};
    const gp = (mod, type) => existingPerms[mod]?.[type] || false;
    const isAdmin = userId === 'user_admin' || userRole?.id === 'role_admin';

    const permSection = isAdmin ? '' : `
        <div class="mt-2 pt-3 border-t border-gray-200">
            <label class="block text-xs font-semibold text-gray-500 uppercase mb-1.5 tracking-wider">Hak Akses <span class="text-blue-500 normal-case font-normal">(per akun ini)</span></label>
            <p class="text-xs text-gray-400 mb-3">Centang modul yang bisa diakses akun ini.</p>
            ${MODULES.map(mod => `
            <div class="flex items-center justify-between py-2 border-b border-gray-50">
                <span class="text-sm text-gray-700 font-medium">${MODULE_LABELS[mod]}</span>
                <div class="flex items-center gap-5">
                    <label class="flex items-center gap-1.5 text-xs text-gray-500 cursor-pointer">
                        <input type="checkbox" id="up_view_${mod}" class="rounded border-gray-300 text-blue-600" ${gp(mod, 'view') ? 'checked' : ''}> Lihat
                    </label>
                    <label class="flex items-center gap-1.5 text-xs text-gray-500 cursor-pointer">
                        <input type="checkbox" id="up_edit_${mod}" class="rounded border-gray-300 text-green-600" ${gp(mod, 'edit') ? 'checked' : ''}> Edit
                    </label>
                </div>
            </div>`).join('')}
        </div>`;

    const body = `<div class="space-y-4">
        <div class="grid grid-cols-2 gap-4">
            <div>
                <label class="block text-xs font-semibold text-gray-500 uppercase mb-1.5 tracking-wider">Nama Lengkap <span class="text-red-500">*</span></label>
                <input type="text" id="u_fullname" value="${user?.fullName || ''}" class="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all" placeholder="Nama lengkap">
            </div>
            <div>
                <label class="block text-xs font-semibold text-gray-500 uppercase mb-1.5 tracking-wider">Email <span class="text-red-500">*</span></label>
                <input type="email" id="u_email" value="${user?.email || ''}" class="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all" placeholder="email@domain.com">
            </div>
        </div>
        <div class="grid grid-cols-2 gap-4">
            <div>
                <label class="block text-xs font-semibold text-gray-500 uppercase mb-1.5 tracking-wider">Password ${userId ? '(Kosongkan jika tidak diubah)' : '<span class="text-red-500">*</span>'}</label>
                <input type="password" id="u_password" class="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all" placeholder="••••••••">
            </div>
            <div>
                <label class="block text-xs font-semibold text-gray-500 uppercase mb-1.5 tracking-wider">Peran <span class="text-red-500">*</span></label>
                <select id="u_role" ${userId === 'user_admin' ? 'disabled' : ''} class="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white focus:ring-2 focus:ring-blue-500 outline-none transition-all"><option value="">-- Pilih Peran --</option>${roleOpts}</select>
            </div>
        </div>
        <div>
            <label class="block text-xs font-semibold text-gray-500 uppercase mb-1.5 tracking-wider">Status</label>
            <select id="u_status" ${userId === 'user_admin' ? 'disabled' : ''} class="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white focus:ring-2 focus:ring-blue-500 outline-none transition-all">
                <option value="AKTIF" ${user?.status === 'AKTIF' || !user ? 'selected' : ''}>Aktif</option>
                <option value="NONAKTIF" ${user?.status === 'NONAKTIF' ? 'selected' : ''}>Nonaktif</option>
            </select>
        </div>
        ${permSection}
    </div>`;

    const footer = `
        <button onclick="saveUser('${userId || ''}')" class="w-full sm:w-auto inline-flex justify-center rounded-lg bg-blue-600 px-5 py-2 text-white text-sm font-bold hover:bg-blue-700 sm:ml-3 transition-colors">
            <i class="fas fa-save mr-2"></i>${userId ? 'Simpan Perubahan' : 'Buat Pengguna'}
        </button>
        <button onclick="closeModal()" class="mt-3 sm:mt-0 w-full sm:w-auto inline-flex justify-center rounded-lg border border-gray-300 px-4 py-2 bg-white text-gray-700 text-sm font-medium sm:ml-3">Batal</button>`;

    showModal(userId ? 'Edit Pengguna' : 'Tambah Pengguna Baru', body, footer);
};

window.saveUser = (userId) => {
    const fullName = document.getElementById('u_fullname').value.trim();
    const email = document.getElementById('u_email').value.trim().toLowerCase();
    const password = document.getElementById('u_password').value;
    const roleId = document.getElementById('u_role').value;
    const status = document.getElementById('u_status').value;

    if (!fullName || !email) { showToast('Nama dan email wajib diisi', 'error'); return; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { showToast('Format email tidak valid', 'error'); return; }
    if (!userId && !password) { showToast('Password wajib diisi untuk pengguna baru', 'error'); return; }
    if (!userId && !roleId) { showToast('Pilih peran / role terlebih dahulu', 'error'); return; }

    // Check email uniqueness
    const existing = db.read('users').find(u => u.email === email && u.id !== userId);
    if (existing) { showToast('Email sudah dipakai pengguna lain', 'error'); return; }

    const avatar = fullName.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();

    // Collect per-user permissions
    let permissions = null;
    if (userId !== 'user_admin') {
        permissions = {};
        MODULES.forEach(mod => {
            const edit = document.getElementById(`up_edit_${mod}`)?.checked || false;
            const view = document.getElementById(`up_view_${mod}`)?.checked || edit;
            permissions[mod] = { view, edit };
        });
    }

    if (userId) {
        const updates = { fullName, email, avatar, status };
        if (userId !== 'user_admin') { updates.roleId = roleId; }
        if (password) updates.password = password;
        if (permissions !== null) updates.permissions = permissions;
        db.update('users', userId, updates);
        showToast('Data pengguna berhasil diperbarui', 'success');
    } else {
        db.insert('users', { fullName, email, password, roleId, status, avatar, permissions });
        showToast('Pengguna baru berhasil dibuat', 'success');
    }

    closeModal();
    renderSettingsUsers();
};

window.toggleUserStatus = (userId) => {
    const user = db.findById('users', userId);
    if (!user) return;
    const newStatus = user.status === 'AKTIF' ? 'NONAKTIF' : 'AKTIF';
    db.update('users', userId, { status: newStatus });
    showToast(`Pengguna ${newStatus === 'AKTIF' ? 'diaktifkan' : 'dinonaktifkan'}`, 'info');
    renderSettingsUsers();
};

// ─── 2. ROLES & ACCESS MANAGEMENT ─────────────────────────────
window.renderSettingsRoles = () => {
    document.getElementById('pageTitle').innerText = 'Peran & Hak Akses';
    const mc = document.getElementById('main-content');
    const roles = db.read('roles');

    const cards = roles.map(role => {
        const permRows = MODULES.map(mod => {
            const perm = role.permissions?.[mod] || { view: false, edit: false };
            const viewToggle = `<button onclick="togglePermission('${role.id}', '${mod}', 'view')" 
                class="w-8 h-5 rounded-full transition-colors ${perm.view ? 'bg-blue-600' : 'bg-gray-200'} relative">
                <span class="absolute top-0.5 ${perm.view ? 'right-0.5' : 'left-0.5'} w-4 h-4 bg-white rounded-full shadow-sm transition-all"></span>
            </button>`;
            const editToggle = `<button onclick="togglePermission('${role.id}', '${mod}', 'edit')" 
                class="w-8 h-5 rounded-full transition-colors ${perm.edit ? 'bg-green-600' : 'bg-gray-200'} relative">
                <span class="absolute top-0.5 ${perm.edit ? 'right-0.5' : 'left-0.5'} w-4 h-4 bg-white rounded-full shadow-sm transition-all"></span>
            </button>`;
            return `<tr class="border-b border-gray-100 text-sm">
                <td class="py-2.5 px-4 text-gray-700 font-medium">${MODULE_LABELS[mod]}</td>
                <td class="py-2.5 px-4 text-center">${viewToggle}</td>
                <td class="py-2.5 px-4 text-center">${editToggle}</td>
            </tr>`;
        }).join('');

        const isSystem = role.id === 'role_admin';

        return `<div class="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <div class="p-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/30">
                <div class="flex items-center gap-3">
                    <div class="w-9 h-9 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-xs font-black shadow-sm">${role.name.slice(0, 2).toUpperCase()}</div>
                    <div>
                        <p class="font-bold text-gray-800 text-sm">${role.name}</p>
                        <p class="text-[10px] text-gray-400">${role.department || 'Umum'} · ${db.read('users').filter(u => u.roleId === role.id).length} pengguna</p>
                    </div>
                </div>
                ${!isSystem ? `<button onclick="deleteRole('${role.id}')" class="text-red-400 hover:text-red-600 text-xs"><i class="fas fa-trash"></i></button>` : '<span class="text-[9px] text-blue-400 font-bold border border-blue-100 bg-blue-50 px-2 py-0.5 rounded">SYSTEM</span>'}
            </div>
            <div class="overflow-x-auto">
                <table class="w-full text-left">
                    <thead><tr class="bg-gray-50/50 border-b border-gray-100">
                        <th class="py-2 px-4 text-[9px] font-bold text-gray-400 uppercase tracking-wider">Modul</th>
                        <th class="py-2 px-4 text-[9px] font-bold text-gray-400 uppercase tracking-wider text-center">Lihat</th>
                        <th class="py-2 px-4 text-[9px] font-bold text-gray-400 uppercase tracking-wider text-center">Edit</th>
                    </tr></thead>
                    <tbody>${permRows}</tbody>
                </table>
            </div>
        </div>`;
    }).join('');

    mc.innerHTML = `
        <div class="flex justify-between items-center mb-5">
            <div>
                <h2 class="text-lg font-bold text-gray-800 tracking-tight">Peran & Hak Akses</h2>
                <p class="text-xs text-gray-400 mt-0.5">Atur izin akses untuk setiap peran pengguna</p>
            </div>
            <button onclick="openRoleModal()" class="bg-blue-600 hover:bg-blue-700 text-white text-sm px-4 py-2 rounded-lg font-bold transition-colors shadow-sm flex items-center gap-2">
                <i class="fas fa-plus"></i> Tambah Peran
            </button>
        </div>
        <div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">${cards}</div>`;
};

window.togglePermission = (roleId, module, type) => {
    const roles = db.read('roles');
    const role = roles.find(r => r.id === roleId);
    if (!role || roleId === 'role_admin') { showToast('Peran Administrator tidak bisa diubah', 'error'); return; }
    if (!role.permissions) role.permissions = {};
    if (!role.permissions[module]) role.permissions[module] = { view: false, edit: false };
    role.permissions[module][type] = !role.permissions[module][type];
    // If turning off view, also turn off edit
    if (type === 'view' && !role.permissions[module].view) role.permissions[module].edit = false;
    // If turning on edit, also turn on view
    if (type === 'edit' && role.permissions[module].edit) role.permissions[module].view = true;
    db.update('roles', roleId, { permissions: role.permissions });
    renderSettingsRoles();
};

window.openRoleModal = () => {
    const body = `<div class="space-y-4">
        <div class="grid grid-cols-2 gap-3">
            <div>
                <label class="block text-xs font-semibold text-gray-500 uppercase mb-1.5 tracking-wider">Nama Peran <span class="text-red-500">*</span></label>
                <input type="text" id="role_name" class="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none" placeholder="cth: Staff Gudang">
            </div>
            <div>
                <label class="block text-xs font-semibold text-gray-500 uppercase mb-1.5 tracking-wider">Departemen</label>
                <input type="text" id="role_department" class="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none" placeholder="cth: Produksi, HRD">
            </div>
        </div>
        <div class="space-y-2">
            <label class="block text-xs font-semibold text-gray-500 uppercase mb-1.5 tracking-wider">Hak Akses Awal</label>
            ${MODULES.map(mod => `<div class="flex items-center justify-between py-2 border-b border-gray-50">
                <span class="text-sm text-gray-700">${MODULE_LABELS[mod]}</span>
                <div class="flex items-center gap-4">
                    <label class="flex items-center gap-2 text-xs text-gray-500 cursor-pointer">
                        <input type="checkbox" id="r_view_${mod}" class="rounded border-gray-300 text-blue-600 focus:ring-blue-500"> Lihat
                    </label>
                    <label class="flex items-center gap-2 text-xs text-gray-500 cursor-pointer">
                        <input type="checkbox" id="r_edit_${mod}" class="rounded border-gray-300 text-green-600 focus:ring-green-500"> Edit
                    </label>
                </div>
            </div>`).join('')}
        </div>
    </div>`;

    const footer = `
        <button onclick="saveRole()" class="w-full sm:w-auto inline-flex justify-center rounded-lg bg-blue-600 px-5 py-2 text-white text-sm font-bold hover:bg-blue-700 sm:ml-3">
            <i class="fas fa-save mr-2"></i>Buat Peran
        </button>
        <button onclick="closeModal()" class="mt-3 sm:mt-0 w-full sm:w-auto inline-flex justify-center rounded-lg border border-gray-300 px-4 py-2 bg-white text-gray-700 text-sm font-medium sm:ml-3">Batal</button>`;

    showModal('Tambah Peran Baru', body, footer);
};

window.saveRole = () => {
    const name = document.getElementById('role_name').value.trim();
    const department = document.getElementById('role_department').value.trim();
    if (!name) { showToast('Nama peran wajib diisi', 'error'); return; }

    const permissions = {};
    MODULES.forEach(mod => {
        const edit = document.getElementById(`r_edit_${mod}`)?.checked || false;
        const view = document.getElementById(`r_view_${mod}`)?.checked || edit;
        permissions[mod] = { view, edit };
    });

    db.insert('roles', { name, department, isSystem: false, permissions });
    showToast('Peran baru berhasil dibuat', 'success');
    closeModal();
    renderSettingsRoles();
};

window.deleteRole = (roleId) => {
    const usersWithRole = db.read('users').filter(u => u.roleId === roleId);
    if (usersWithRole.length > 0) {
        showToast(`Tidak bisa hapus: ada ${usersWithRole.length} pengguna dengan peran ini`, 'error');
        return;
    }
    if (!confirm('Yakin hapus peran ini?')) return;
    db.delete('roles', roleId);
    showToast('Peran berhasil dihapus', 'success');
    renderSettingsRoles();
};

// ─── 3. COMPANY SETTINGS ───────────────────────────────────────
window.renderSettingsCompany = () => {
    document.getElementById('pageTitle').innerText = 'Profil Perusahaan';
    const mc = document.getElementById('main-content');
    const cfg = JSON.parse(localStorage.getItem('nexerp_company_config') || 'null') || {};

    mc.innerHTML = `
        <div class="max-w-2xl mx-auto">
            <div class="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                <div class="p-5 border-b border-gray-100 bg-gray-50/30">
                    <h2 class="font-bold text-gray-800 text-sm tracking-tight">Profil Perusahaan</h2>
                    <p class="text-xs text-gray-400 mt-0.5">Informasi ini tampil di invoice, PO, dan dokumen lainnya</p>
                </div>
                <div class="p-6 space-y-5">
                    <div class="flex items-start gap-6 pb-2">
                        <div class="shrink-0">
                            <label class="block text-xs font-semibold text-gray-500 uppercase mb-2 tracking-wider">Logo Perusahaan</label>
                            <div class="relative group cursor-pointer w-24 h-24 bg-gray-50 border-2 border-dashed border-gray-200 rounded-xl flex flex-col items-center justify-center overflow-hidden hover:border-blue-400 transition-colors" onclick="document.getElementById('cfg_logo_input').click()">
                                <img id="cfg_logo_preview" src="${cfg.logo || ''}" class="w-full h-full object-contain ${cfg.logo ? '' : 'hidden'}">
                                <div id="cfg_logo_placeholder" class="${cfg.logo ? 'hidden' : 'flex'} flex-col items-center text-gray-400">
                                    <i class="fas fa-image text-xl mb-1"></i>
                                    <span class="text-[10px]">Upload</span>
                                </div>
                                <div class="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                                    <i class="fas fa-camera text-white"></i>
                                </div>
                            </div>
                            <input type="file" id="cfg_logo_input" class="hidden" accept="image/*" onchange="handleLogoChange(this)">
                        </div>
                        <div class="flex-1 space-y-4">
                            <div>
                                <label class="block text-xs font-semibold text-gray-500 uppercase mb-2 tracking-wider">Nama Perusahaan</label>
                                <input id="cfg_name" type="text" value="${cfg.companyName || 'PT. Tana Subur Nusantara'}" 
                                    class="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all shadow-sm">
                            </div>
                            <div>
                                <label class="block text-xs font-semibold text-gray-500 uppercase mb-2 tracking-wider">No. WhatsApp Perusahaan</label>
                                <div class="relative">
                                    <span class="absolute left-3 top-1/2 -translate-y-1/2 text-green-500"><i class="fab fa-whatsapp"></i></span>
                                    <input id="cfg_whatsapp" type="text" value="${cfg.whatsappPhone || ''}" placeholder="62812xxxxxx"
                                        class="w-full border border-gray-300 rounded-lg pl-9 pr-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all shadow-sm">
                                </div>
                            </div>
                        </div>
                    </div>
                    <div>
                        <label class="block text-xs font-semibold text-gray-500 uppercase mb-2 tracking-wider">Alamat</label>
                        <textarea id="cfg_address" rows="2" class="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all resize-none shadow-sm">${cfg.companyAddress || 'J8WR+3JQ, Jl. Akses Tol Karawang Tim., Anggadita, Kec. Klari, Karawang, Jawa Barat 41371'}</textarea>
                    </div>
                    <div class="grid grid-cols-2 gap-4">
                        <div>
                            <label class="block text-xs font-semibold text-gray-500 uppercase mb-2 tracking-wider">No. Telepon</label>
                            <input id="cfg_phone" type="text" value="${cfg.companyPhone || '0267-12345678'}" 
                                class="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all shadow-sm">
                        </div>
                        <div>
                            <label class="block text-xs font-semibold text-gray-500 uppercase mb-2 tracking-wider">Email</label>
                            <input id="cfg_email" type="email" value="${cfg.companyEmail || 'info@tanasubur.co.id'}" 
                                class="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all shadow-sm">
                        </div>
                    </div>

                    <div class="grid grid-cols-2 gap-4 border-t border-gray-100 pt-4">
                        <div>
                            <label class="block text-xs font-semibold text-gray-500 uppercase mb-2 tracking-wider">Mata Uang (Currency)</label>
                            <select id="cfg_currency" class="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all shadow-sm bg-white">
                                <option value="IDR" ${cfg.currency === 'IDR' ? 'selected' : ''}>IDR (Rupiah)</option>
                                <option value="USD" ${cfg.currency === 'USD' ? 'selected' : ''}>USD (Dollar)</option>
                                <option value="SGD" ${cfg.currency === 'SGD' ? 'selected' : ''}>SGD (Singapore Dollar)</option>
                                <option value="EUR" ${cfg.currency === 'EUR' ? 'selected' : ''}>EUR (Euro)</option>
                            </select>
                        </div>
                        <div>
                            <label class="block text-xs font-semibold text-gray-500 uppercase mb-2 tracking-wider">Format Tanggal</label>
                            <select id="cfg_date_format" class="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all shadow-sm bg-white">
                                <option value="DD/MM/YYYY" ${cfg.dateFormat === 'DD/MM/YYYY' ? 'selected' : ''}>DD/MM/YYYY</option>
                                <option value="MM/DD/YYYY" ${cfg.dateFormat === 'MM/DD/YYYY' ? 'selected' : ''}>MM/DD/YYYY</option>
                                <option value="YYYY-MM-DD" ${cfg.dateFormat === 'YYYY-MM-DD' ? 'selected' : ''}>YYYY-MM-DD</option>
                            </select>
                        </div>
                    </div>

                    <div class="grid grid-cols-2 gap-4">
                        <div>
                            <label class="block text-xs font-semibold text-gray-500 uppercase mb-2 tracking-wider">Zona Waktu (Timezone)</label>
                            <select id="cfg_timezone" class="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all shadow-sm bg-white">
                                <option value="Asia/Jakarta" ${cfg.timezone === 'Asia/Jakarta' || !cfg.timezone ? 'selected' : ''}>WIB (Jakarta)</option>
                                <option value="Asia/Makassar" ${cfg.timezone === 'Asia/Makassar' ? 'selected' : ''}>WITA (Makassar)</option>
                                <option value="Asia/Jayapura" ${cfg.timezone === 'Asia/Jayapura' ? 'selected' : ''}>WIT (Jayapura)</option>
                                <option value="UTC" ${cfg.timezone === 'UTC' ? 'selected' : ''}>UTC (GMT)</option>
                            </select>
                        </div>
                        <div>
                            <label class="block text-xs font-semibold text-gray-500 uppercase mb-2 tracking-wider">Bahasa Sistem</label>
                            <select id="cfg_language" class="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all shadow-sm bg-white">
                                <option value="id" ${cfg.language === 'id' || !cfg.language ? 'selected' : ''}>Bahasa Indonesia</option>
                                <option value="en" ${cfg.language === 'en' ? 'selected' : ''}>English</option>
                            </select>
                        </div>
                    </div>

                    <div class="grid grid-cols-2 gap-4">
                        <div>
                            <label class="block text-xs font-semibold text-gray-500 uppercase mb-2 tracking-wider">NPWP</label>
                            <input id="cfg_npwp" type="text" value="${cfg.companyNpwp || ''}" 
                                class="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all" placeholder="xx.xxx.xxx.x-xxx.xxx">
                        </div>
                        <div>
                            <label class="block text-xs font-semibold text-gray-500 uppercase mb-2 tracking-wider">Default Pajak (PPN %)</label>
                            <input id="cfg_tax" type="number" step="0.1" value="${cfg.taxRate || '12'}" 
                                class="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all font-mono" placeholder="12">
                        </div>
                    </div>
                    <div class="pt-2 flex justify-end">
                        <button onclick="saveCompanyConfig()" class="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2.5 rounded-lg text-sm font-bold transition-colors shadow-sm flex items-center gap-2">
                            <i class="fas fa-save"></i> Simpan Pengaturan
                        </button>
                    </div>
                </div>
            </div>
        </div>`;
};

window.handleLogoChange = (input) => {
    if (input.files && input.files[0]) {
        const reader = new FileReader();
        reader.onload = (e) => {
            const base64 = e.target.result;
            document.getElementById('cfg_logo_preview').src = base64;
            document.getElementById('cfg_logo_preview').classList.remove('hidden');
            document.getElementById('cfg_logo_placeholder').classList.add('hidden');
            window._temp_logo = base64;
        };
        reader.readAsDataURL(input.files[0]);
    }
};

window.saveCompanyConfig = () => {
    const cfg = {
        companyName: document.getElementById('cfg_name').value.trim(),
        companyAddress: document.getElementById('cfg_address').value.trim(),
        companyPhone: document.getElementById('cfg_phone').value.trim(),
        companyEmail: document.getElementById('cfg_email').value.trim(),
        companyNpwp: document.getElementById('cfg_npwp').value.trim(),
        taxRate: parseFloat(document.getElementById('cfg_tax').value) || 0,
        whatsappPhone: document.getElementById('cfg_whatsapp').value.trim(),
        currency: document.getElementById('cfg_currency').value,
        dateFormat: document.getElementById('cfg_date_format').value,
        timezone: document.getElementById('cfg_timezone').value,
        language: document.getElementById('cfg_language').value,
        logo: window._temp_logo || document.getElementById('cfg_logo_preview').src
    };
    if (cfg.logo.includes('blob:')) cfg.logo = ''; // clear if invalid

    localStorage.setItem('unityerp_company_config', JSON.stringify(cfg));
    // Update runtime CONFIG
    Object.assign(CONFIG, cfg);
    showToast('Pengaturan perusahaan berhasil disimpan', 'success');
};

// Load saved company config on boot — runs after app.js defines CONFIG
document.addEventListener('DOMContentLoaded', () => {
    try {
        // Migration for company config
        if (!localStorage.getItem('unityerp_company_config') && localStorage.getItem('nexerp_company_config')) {
            localStorage.setItem('unityerp_company_config', localStorage.getItem('nexerp_company_config'));
        }
        const saved = JSON.parse(localStorage.getItem('unityerp_company_config') || 'null');
        if (saved && typeof CONFIG !== 'undefined') Object.assign(CONFIG, saved);
    } catch (e) { /* ignore */ }
});

// ─── 4. SYSTEM SETTINGS (TECHNICAL) ───────────────────────────
window.renderSettingsSystem = () => {
    document.getElementById('pageTitle').innerText = 'Pengaturan Sistem';
    const mc = document.getElementById('main-content');

    // Migration for maintenance mode
    if (localStorage.getItem('unityerp_maintenance_mode') === null && localStorage.getItem('nexerp_maintenance_mode') !== null) {
        localStorage.setItem('unityerp_maintenance_mode', localStorage.getItem('nexerp_maintenance_mode'));
    }

    const isMaintenance = localStorage.getItem('unityerp_maintenance_mode') === 'true';
    const logs = db.read('systemLogs').sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp)).slice(0, 50);

    mc.innerHTML = `
        <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <!-- Technical Control Panel -->
            <div class="lg:col-span-1 space-y-6">
                <!-- Backup & Restore -->
                <div class="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
                    <h3 class="text-sm font-bold text-gray-800 mb-4 flex items-center gap-2">
                        <i class="fas fa-database text-blue-500"></i> Backup & Restore
                    </h3>
                    <p class="text-xs text-gray-400 mb-4">Ekspor semua data sistem ke file JSON atau pulihkan dari file cadangan.</p>
                    
                    <div class="space-y-3">
                        <button onclick="exportSystemDatabase()" class="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 text-white text-sm font-bold rounded-lg hover:bg-blue-700 transition shadow-sm">
                            <i class="fas fa-download"></i> Backup Database (JSON)
                        </button>
                        
                        <div class="relative">
                            <input type="file" id="restore_file" class="hidden" onchange="importSystemDatabase(event)">
                            <button onclick="document.getElementById('restore_file').click()" class="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-white border border-blue-200 text-blue-600 text-sm font-bold rounded-lg hover:bg-blue-50 transition">
                                <i class="fas fa-upload"></i> Restore Database
                            </button>
                        </div>
                    </div>
                </div>

                <!-- Maintenance Mode -->
                <div class="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
                    <h3 class="text-sm font-bold text-gray-800 mb-4 flex items-center gap-2">
                        <i class="fas fa-tools text-orange-500"></i> Maintenance Mode
                    </h3>
                    <div class="flex items-center justify-between mb-2">
                        <span class="text-sm text-gray-600">Status Pemeliharaan</span>
                        <div onclick="toggleMaintenanceMode()" class="relative inline-flex items-center cursor-pointer">
                            <div class="w-11 h-6 ${isMaintenance ? 'bg-orange-500' : 'bg-gray-200'} rounded-full transition-colors relative">
                                <div class="absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition-transform ${isMaintenance ? 'translate-x-5' : ''}"></div>
                            </div>
                        </div>
                    </div>
                    <p class="text-[11px] text-gray-400 mt-2">Saat aktif, pengguna non-admin tidak dapat mengakses fitur sistem.</p>
                </div>

                <!-- System Update / Info -->
                <div class="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
                    <h3 class="text-sm font-bold text-gray-800 mb-4 flex items-center gap-2">
                        <i class="fas fa-sync text-emerald-500"></i> System Info
                    </h3>
                    <div class="space-y-2">
                        <div class="flex justify-between text-xs">
                            <span class="text-gray-400">Versi Sistem</span>
                            <span class="font-bold text-gray-700">v1.2.5 — Regular Update</span>
                        </div>
                        <div class="flex justify-between text-xs">
                            <span class="text-gray-400">Terakhir Update</span>
                            <span class="text-gray-700">6 Maret 2026</span>
                        </div>
                        <button class="w-full mt-3 text-xs font-bold text-emerald-600 py-2 border border-emerald-100 rounded-lg hover:bg-emerald-50 transition">
                            Cek Pembaruan
                        </button>
                    </div>
                </div>
            </div>

            <!-- Activity Logs -->
            <div class="lg:col-span-2">
                <div class="bg-white rounded-xl shadow-sm border border-gray-100 flex flex-col h-full overflow-hidden">
                    <div class="p-5 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                        <div>
                            <h3 class="text-sm font-bold text-gray-800">Log Aktivitas Sistem</h3>
                            <p class="text-[11px] text-gray-400">Menampilkan 50 aktivitas terbaru dari semua pengguna.</p>
                        </div>
                        <button onclick="clearSystemLogs()" class="text-xs text-red-500 hover:text-red-700 font-semibold px-2 py-1">Hapus Log</button>
                    </div>
                    <div class="overflow-y-auto max-h-[600px]">
                        <table class="w-full text-left">
                            <thead class="bg-gray-50 border-b border-gray-100 sticky top-0">
                                <tr>
                                    <th class="py-2.5 px-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Waktu</th>
                                    <th class="py-2.5 px-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">User</th>
                                    <th class="py-2.5 px-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Aksi</th>
                                    <th class="py-2.5 px-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Detail</th>
                                </tr>
                            </thead>
                            <tbody class="divide-y divide-gray-50">
                                ${logs.map(log => `
                                    <tr class="hover:bg-gray-50/50 transition-colors">
                                        <td class="py-2.5 px-4 text-[11px] text-gray-500 whitespace-nowrap">${new Date(log.timestamp).toLocaleString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit', day: '2-digit', month: 'short' })}</td>
                                        <td class="py-2.5 px-4 text-[11px] font-semibold text-gray-700">${log.userEmail.split('@')[0]}</td>
                                        <td class="py-2.5 px-4">
                                            <span class="px-2 py-0.5 text-[9px] font-black uppercase rounded bg-gray-100 text-gray-600 border border-gray-200">${log.action}</span>
                                        </td>
                                        <td class="py-2.5 px-4 text-[11px] text-gray-400 italic truncate max-w-[200px]" title="${log.details}">${log.details}</td>
                                    </tr>
                                `).join('') || '<tr><td colspan="4" class="py-10 text-center text-gray-400 text-xs italic">Belum ada log aktivitas.</td></tr>'}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    `;
};

// ─── TECHNICAL LOGIC ──────────────────────────────────────────
window.exportSystemDatabase = () => {
    const database = {};
    const PREFIX = 'unityerp_';
    for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key.startsWith(PREFIX)) {
            try {
                database[key] = JSON.parse(localStorage.getItem(key));
            } catch (e) {
                database[key] = localStorage.getItem(key);
            }
        }
    }

    const blob = new Blob([JSON.stringify(database, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `UnityERP_Backup_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);

    db.logSystemActivity('BACKUP', 'User mengekspor database sistem ke file JSON');
    showToast('Database berhasil diekspor');
};

window.importSystemDatabase = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    if (!confirm('PERINGATAN: Mengimpor database akan menghapus semua data saat ini! Lanjutkan?')) return;

    const reader = new FileReader();
    reader.onload = (e) => {
        try {
            const data = JSON.parse(e.target.result);
            // Validation: Support both old and new prefixes
            const keys = Object.keys(data);
            const isOld = keys.every(k => k.startsWith('nexerp_'));
            const isNew = keys.every(k => k.startsWith('unityerp_'));

            if (isOld || isNew) {
                // Clear both old and new data before injecting
                for (let i = localStorage.length - 1; i >= 0; i--) {
                    const key = localStorage.key(i);
                    if (key.startsWith('nexerp_') || key.startsWith('unityerp_')) {
                        localStorage.removeItem(key);
                    }
                }

                Object.keys(data).forEach(key => {
                    localStorage.setItem(key, typeof data[key] === 'object' ? JSON.stringify(data[key]) : data[key]);
                });

                showToast('Restore Berhasil! Sistem akan dimuat ulang.', 'success');
                setTimeout(() => window.location.reload(), 2000);
            } else {
                showToast('File tidak valid: Format UnityERP tidak ditemukan.', 'error');
            }
        } catch (err) {
            showToast('Gagal membaca file backup', 'error');
        }
    };
    reader.readAsText(file);
};

window.toggleMaintenanceMode = () => {
    const key = 'unityerp_maintenance_mode';
    const current = localStorage.getItem(key) === 'true';
    localStorage.setItem(key, (!current).toString());
    db.logSystemActivity('MAINTENANCE', `Maintenance mode changed to ${!current}`);
    renderSettingsSystem();
    showToast(`Maintenance mode ${!current ? 'AKTIF' : 'NONAKTIF'}`, 'warning');
};

window.clearSystemLogs = () => {
    if (!confirm('Hapus semua log aktivitas?')) return;
    db.save('systemLogs', []);
    db.logSystemActivity('LOG_CLEAR', 'Logs dihapus oleh Administrator');
    renderSettingsSystem();
};

// Expose views
window.settingsViews = {
    'settings-users': renderSettingsUsers,
    'settings-roles': renderSettingsRoles,
    'settings-company': renderSettingsCompany,
    'settings-system': renderSettingsSystem
};
