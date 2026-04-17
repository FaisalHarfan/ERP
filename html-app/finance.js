// finance.js - Finance Module Logic

// Initialize Global States and Filters
window._uiState = window._uiState || {};
window._apFilters = window._apFilters || { status: 'BELUM_LUNAS', supplierId: '', startDate: '', endDate: '' };
window._apHistoryFilters = window._apHistoryFilters || { supplierId: '', date: '', method: '' };
window._arFilters = window._arFilters || { customer: '', date: '' };
window._arHistoryFilters = window._arHistoryFilters || { customer: '', date: '', method: '' };
window._journalFilters = window._journalFilters || { q: '' };
window._expenseFilters = window._expenseFilters || { start: '', end: '', coaId: '' };
window._receiptFilters = window._receiptFilters || { start: '', end: '', coaId: '' };
window._coaFilters = window._coaFilters || { accountId: '', type: '' };

// Ensure filter open states are initialized
window._uiState.apFilterOpen = window._uiState.apFilterOpen ?? false;
window._uiState.apHistFilterOpen = window._uiState.apHistFilterOpen ?? false;
window._uiState.apActiveTab = window._uiState.apActiveTab || 'unpaid';
window._uiState.arFilterOpen = window._uiState.arFilterOpen ?? false;
window._uiState.arHistFilterOpen = window._uiState.arHistFilterOpen ?? false;
window._uiState.arActiveTab = window._uiState.arActiveTab || 'unpaid';
window._uiState.journalFilterOpen = window._uiState.journalFilterOpen ?? false;
window._uiState.expFilterOpen = window._uiState.expFilterOpen ?? false;
window._uiState.recFilterOpen = window._uiState.recFilterOpen ?? false;
window._uiState.coaFilterOpen = window._uiState.coaFilterOpen ?? false;
window._uiState.repFilterOpen = window._uiState.repFilterOpen ?? false;

window.formatAmountInput = function(val) {
    if (!val) return '';
    let number = val.toString().replace(/[^0-9]/g, '');
    if (!number) return '';
    return number.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
};

window.parseAmountInput = function(val) {
    if (!val) return 0;
    return parseFloat(val.toString().replace(/\./g, '')) || 0;
};

window.renderFinanceDashboard = function () {
    document.getElementById('pageTitle').innerText = 'Dashboard Finance';
    const mc = document.getElementById('main-content');

    const accounts = db.read('accounts');
    const journal = db.read('journalEntries');

    // Hitung Ringkasan
    const totalRevenue = accounts.filter(a => a.type === 'INCOME').reduce((sum, a) => sum + Math.abs(db.getAccountBalance(a.id)), 0);
    const totalExpenses = accounts.filter(a => a.type === 'EXPENSE').reduce((sum, a) => sum + Math.abs(db.getAccountBalance(a.id)), 0);
    const netProfit = totalRevenue - totalExpenses;

    const cashBankBalance = accounts.filter(a => a.code.startsWith('11')).reduce((sum, a) => sum + db.getAccountBalance(a.id), 0);
    const salesInvoices = db.read('salesInvoices');
    const purchaseInvoices = db.read('purchaseInvoices');
    const allPayments = db.read('payments');
    const allSuppPayments = db.read('supplierPayments');

    const totalAR = salesInvoices.filter(i => i.status === 'UNPAID' || i.status === 'PARTIAL').reduce((sum, i) => {
        const paid = allPayments.filter(p => p.invoiceId === i.id).reduce((s, p) => s + (parseFloat(p.amount) || 0), 0);
        return sum + ((parseFloat(i.totalAmount) || 0) - paid);
    }, 0);
    const totalAP = purchaseInvoices.filter(i => i.status === 'UNPAID' || i.status === 'PARTIAL').reduce((sum, i) => {
        const paid = allSuppPayments.filter(p => p.invoiceId === i.id).reduce((s, p) => s + (parseFloat(p.amount) || 0), 0);
        return sum + ((parseFloat(i.totalAmount) || 0) - paid);
    }, 0);

    mc.innerHTML = `
        <!-- Summary Cards -->
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <div class="bg-white rounded-xl shadow-sm border border-gray-100 p-6 flex flex-col justify-between hover:shadow-md transition-shadow border-l-4 border-blue-500">
                <div>
                    <p class="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Total Pendapatan</p>
                    <h3 class="text-2xl font-bold text-gray-800">${formatCurrency(totalRevenue)}</h3>
                </div>
                <div class="mt-4 flex items-center text-xs text-green-600 font-bold">
                    <i class="fas fa-arrow-up mr-1"></i> Real-time
                </div>
            </div>

            <div class="bg-white rounded-xl shadow-sm border border-gray-100 p-6 flex flex-col justify-between hover:shadow-md transition-shadow border-l-4 border-red-500">
                <div>
                    <p class="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Total Pengeluaran</p>
                    <h3 class="text-2xl font-bold text-gray-800">${formatCurrency(totalExpenses)}</h3>
                </div>
                <div class="mt-4 flex items-center text-xs text-red-600 font-bold">
                    <i class="fas fa-arrow-down mr-1"></i> Real-time
                </div>
            </div>

            <div class="bg-white rounded-xl shadow-sm border border-gray-100 p-6 flex flex-col justify-between hover:shadow-md transition-shadow border-l-4 border-indigo-500">
                <div>
                    <p class="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Laba Bersih</p>
                    <h3 class="text-2xl font-bold ${netProfit >= 0 ? 'text-indigo-600' : 'text-red-600'}">${formatCurrency(netProfit)}</h3>
                </div>
                <div class="mt-4 flex items-center text-xs text-indigo-600 font-bold">
                    <i class="fas fa-chart-line mr-1"></i> Profit/Loss
                </div>
            </div>

            <div class="bg-white rounded-xl shadow-sm border border-gray-100 p-6 flex flex-col justify-between hover:shadow-md transition-shadow border-l-4 border-green-500">
                <div>
                    <p class="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Saldo Kas & Bank</p>
                    <h3 class="text-2xl font-bold text-green-600">${formatCurrency(cashBankBalance)}</h3>
                </div>
                <div class="mt-4 flex items-center text-xs text-green-600 font-bold">
                    <i class="fas fa-wallet mr-1"></i> Liquidity
                </div>
            </div>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
             <div class="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                <div>
                    <p class="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Piutang Usaha (AR)</p>
                    <h3 class="text-xl font-bold text-orange-600">${formatCurrency(totalAR)}</h3>
                    <p class="text-[10px] text-gray-400 mt-1">Tagihan pelanggan belum lunas</p>
                </div>
                <button onclick="navigateTo('finance-ar')" class="mt-4 text-sm font-bold text-blue-600 hover:text-blue-800">Lihat Detail <i class="fas fa-chevron-right ml-1"></i></button>
            </div>
            <div class="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                <div>
                    <p class="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Hutang Usaha (AP)</p>
                    <h3 class="text-xl font-bold text-red-600">${formatCurrency(totalAP)}</h3>
                    <p class="text-[10px] text-gray-400 mt-1">Tagihan supplier belum dibayar</p>
                </div>
                <button onclick="navigateTo('finance-ap')" class="mt-4 text-sm font-bold text-blue-600 hover:text-blue-800">Lihat Detail <i class="fas fa-chevron-right ml-1"></i></button>
            </div>
        </div>

        <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div class="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                <h3 class="text-md font-bold text-gray-800 mb-4 flex items-center gap-2">
                    <i class="fas fa-university text-blue-500"></i> Rekening Kas & Bank
                </h3>
                <div class="space-y-4">
                    ${db.read('bankAccounts').map(ba => {
        const bal = db.getAccountBalance(ba.accountId);
        return `
                            <div class="flex justify-between items-center p-3 rounded-lg bg-gray-50">
                                <div>
                                    <p class="text-sm font-bold text-gray-700">${ba.name}</p>
                                    <p class="text-[10px] text-gray-500">${ba.bankName} - ${ba.accountNumber}</p>
                                </div>
                                <span class="font-bold text-blue-600 text-sm">${formatCurrency(bal)}</span>
                            </div>
                        `;
    }).join('') || '<p class="text-center py-6 text-gray-400 text-sm">Belum ada akun bank.</p>'}
                </div>
            </div>

            <div class="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                <h3 class="text-md font-bold text-gray-800 mb-4 flex items-center gap-2">
                    <i class="fas fa-history text-slate-500"></i> Jurnal Umum Terakhir
                </h3>
                <div class="space-y-3">
                    ${journal.slice(-5).reverse().map(j => `
                        <div class="flex items-center justify-between text-xs border-b border-gray-50 pb-2">
                            <div>
                                <p class="font-bold text-gray-800">${j.journalNo}</p>
                                <p class="text-gray-500 truncate w-48">${j.description}</p>
                            </div>
                            <div class="text-right">
                                <span class="font-bold text-blue-600">${formatCurrency(j.totalDebit)}</span>
                                <p class="text-[10px] text-gray-400">${formatDate(j.date).slice(0, 10)}</p>
                            </div>
                        </div>
                    `).join('') || '<p class="text-center py-6 text-gray-400 text-sm">Tidak ada transaksi terbaru.</p>'}
                </div>
                <button onclick="navigateTo('finance-journal')" class="w-full mt-4 py-2 bg-gray-50 text-gray-600 text-xs font-bold rounded-lg hover:bg-gray-100">Buka Semua Jurnal</button>
            </div>
        </div>
    `;
};

window.renderFinanceAccounts = function () {
    document.getElementById('pageTitle').innerText = 'Chart of Accounts (COA)';
    const mc = document.getElementById('main-content');
    
    const filterAccountId = window._coaFilters?.accountId || '';
    const filterType = window._coaFilters?.type || '';

    let accounts = db.read('accounts');
    const allAccounts = [...accounts]; // For the dropdown
    
    if (filterAccountId) {
        accounts = accounts.filter(a => a.id === filterAccountId);
    }
    if (filterType) {
        accounts = accounts.filter(a => a.type === filterType);
    }

    mc.innerHTML = `
        <div class="flex flex-col gap-6">
            <!-- Collapsible Filter Section -->
            <div class="bg-white rounded-xl shadow-sm border border-slate-100 mb-0 overflow-hidden">
                <div onclick="toggleCOAFilter()" class="flex items-center justify-between p-4 cursor-pointer hover:bg-slate-50 transition-colors select-none">
                    <h3 class="text-[10px] font-black text-slate-800 uppercase tracking-[0.2em] flex items-center gap-3">
                        <i class="fas fa-filter text-blue-600"></i> FILTER PENCARIAN
                        ${(!window._uiState.coaFilterOpen && (filterAccountId || filterType)) ? 
                            `<span class="ml-2 px-2 py-0.5 bg-blue-50 text-blue-600 rounded-full text-[9px] font-bold">Filter Aktif</span>` : ''}
                    </h3>
                    <div class="flex items-center gap-3">
                        <span class="text-[9px] font-bold text-slate-400 uppercase tracking-widest">${window._uiState.coaFilterOpen ? 'Sembunyikan' : 'Tampilkan'}</span>
                        <i class="fas fa-chevron-${window._uiState.coaFilterOpen ? 'up' : 'down'} text-slate-300 text-xs"></i>
                    </div>
                </div>

                <div class="${window._uiState.coaFilterOpen ? 'block' : 'hidden'} p-5 border-t border-slate-50 animate-in slide-in-from-top-2 duration-200">
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-4 items-end">
                        <div>
                            <label class="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Pilih Akun</label>
                            <select id="coaFilterAccountId" class="w-full border-2 border-slate-100 rounded-lg px-3 py-2 text-sm font-bold text-slate-700 focus:border-blue-500 outline-none transition-all bg-slate-50/50 focus:bg-white cursor-pointer font-sans">
                                <option value="">-- Semua Akun --</option>
                                ${allAccounts.map(a => `<option value="${a.id}" ${filterAccountId === a.id ? 'selected' : ''}>${a.code} - ${a.name}</option>`).join('')}
                            </select>
                        </div>
                        <div>
                            <label class="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Tipe Akun</label>
                            <select id="coaFilterType" class="w-full border-2 border-slate-100 rounded-lg px-3 py-2 text-sm font-bold text-slate-700 focus:border-blue-500 outline-none transition-all bg-slate-50/50 focus:bg-white cursor-pointer font-sans">
                                <option value="">-- Semua Tipe --</option>
                                <option value="ASSET" ${filterType === 'ASSET' ? 'selected' : ''}>Aset (Harta)</option>
                                <option value="LIABILITY" ${filterType === 'LIABILITY' ? 'selected' : ''}>Kewajiban (Hutang)</option>
                                <option value="EQUITY" ${filterType === 'EQUITY' ? 'selected' : ''}>Ekuitas (Modal)</option>
                                <option value="INCOME" ${filterType === 'INCOME' ? 'selected' : ''}>Pendapatan</option>
                                <option value="EXPENSE" ${filterType === 'EXPENSE' ? 'selected' : ''}>Beban / Biaya</option>
                            </select>
                        </div>
                    </div>
                    <div class="flex gap-2 pt-4 mt-4 border-t border-slate-50">
                        <button onclick="updateCOAFilters()" class="bg-blue-600 hover:bg-slate-900 text-white px-8 py-2.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all shadow-lg active:scale-95">
                            <i class="fas fa-search mr-2"></i> TAMPILKAN DATA
                        </button>
                        <button onclick="document.getElementById('coaFilterAccountId').value=''; document.getElementById('coaFilterType').value=''; updateCOAFilters()" class="bg-slate-50 hover:bg-slate-100 text-slate-400 px-5 py-2.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all">
                            <i class="fas fa-undo mr-2"></i> RESET
                        </button>
                    </div>
                </div>
            </div>

            <div class="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                <div class="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50 flex-wrap gap-4">
                    <div>
                        <h3 class="font-bold text-gray-700 text-lg">Daftar Akun</h3>
                        <p class="text-xs text-gray-500">Kelola kategori keuangan perusahaan</p>
                    </div>
                    <button onclick="openAccountModal()" class="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-bold hover:bg-blue-700 transition-colors shadow-sm whitespace-nowrap">
                        <i class="fas fa-plus mr-2"></i>Tambah Akun
                    </button>
                </div>
                <div class="overflow-x-auto">
                    <table class="w-full text-left border-collapse">
                        <thead class="bg-gray-50 text-slate-500 text-[11px] uppercase tracking-wider font-semibold">
                            <tr>
                                <th class="px-6 py-3 border-b border-gray-100">Kode</th>
                                <th class="px-6 py-3 border-b border-gray-100">Nama Akun</th>
                                <th class="px-6 py-3 border-b border-gray-100">Tipe</th>
                                <th class="px-6 py-3 border-b border-gray-100 text-right">Saldo</th>
                                <th class="px-6 py-3 border-b border-gray-100">Status</th>
                                <th class="px-6 py-3 border-b border-gray-100"></th>
                            </tr>
                        </thead>
                        <tbody class="text-sm divide-y divide-gray-100">
                            ${accounts.map(a => `
                                <tr class="hover:bg-blue-50/30 transition-colors">
                                    <td class="px-6 py-4 font-bold text-indigo-600">${a.code}</td>
                                    <td class="px-6 py-4">
                                        <div class="font-medium text-gray-700">${a.name}</div>
                                        <div class="text-[10px] text-gray-400 italic">${a.description || '-'}</div>
                                    </td>
                                    <td class="px-6 py-4">
                                        <span class="px-2 py-0.5 rounded-full text-[10px] font-bold ${getAccountTypeClass(a.type)}">${a.type}</span>
                                    </td>
                                    <td class="px-6 py-4 text-right font-bold ${db.getAccountBalance(a.id) < 0 ? 'text-red-500' : 'text-blue-600'}">
                                        ${formatCurrency(Math.abs(db.getAccountBalance(a.id)))}
                                    </td>
                                    <td class="px-6 py-4">
                                        <span class="inline-flex items-center px-2 py-1 rounded-full text-[10px] font-medium bg-green-100 text-green-700">
                                            <span class="w-1.5 h-1.5 rounded-full bg-green-500 mr-1.5"></span> Aktif
                                        </span>
                                    </td>
                                    <td class="px-6 py-4 text-right">
                                        <div class="flex justify-end gap-2">
                                            <button onclick="viewAccountMutasi('${a.id}')" class="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:bg-green-50 hover:text-green-600 transition-all" title="Lihat Mutasi"><i class="fas fa-list-ul text-xs"></i></button>
                                            <button onclick="editAccount('${a.id}')" class="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:bg-blue-50 hover:text-blue-600 transition-all"><i class="fas fa-edit text-xs"></i></button>
                                            <button onclick="deleteAccount('${a.id}')" class="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:bg-red-50 hover:text-red-600 transition-all"><i class="fas fa-trash text-xs"></i></button>
                                        </div>
                                    </td>
                                </tr>
                            `).join('') || '<tr><td colspan="6" class="px-6 py-8 text-center text-gray-400 italic">Akun tidak ditemukan.</td></tr>'}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    `;
};

window.updateCOAFilters = function() {
    window._coaFilters = {
        accountId: document.getElementById('coaFilterAccountId')?.value || '',
        type: document.getElementById('coaFilterType')?.value || ''
    };
    renderFinanceAccounts();
};

function getAccountTypeClass(type) {
    const map = {
        'ASSET': 'bg-green-100 text-green-700',
        'LIABILITY': 'bg-orange-100 text-orange-700',
        'EQUITY': 'bg-purple-100 text-purple-700',
        'INCOME': 'bg-indigo-100 text-indigo-700',
        'EXPENSE': 'bg-red-100 text-red-700'
    };
    return map[type] || 'bg-gray-100 text-gray-700';
}

window.openAccountModal = function (accountId = null) {
    let acc = null;
    if (accountId) {
        acc = db.findById('accounts', accountId);
    }
    const body = `
        <form id="accountForm" class="space-y-4">
            <input type="hidden" id="editAccountId" value="${acc ? acc.id : ''}">
            <div class="grid grid-cols-2 gap-4">
                <div>
                    <label class="block text-xs font-bold text-gray-500 mb-1">Kode Akun</label>
                    <input type="text" id="accCode" value="${acc ? acc.code : ''}" class="w-full border border-gray-200 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none" placeholder="Misal: 1101" required>
                </div>
                <div>
                    <label class="block text-xs font-bold text-gray-500 mb-1">Nama Akun</label>
                    <input type="text" id="accName" value="${acc ? acc.name : ''}" class="w-full border border-gray-200 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none" placeholder="Misal: Kas Utama" required>
                </div>
            </div>
            <div class="grid grid-cols-2 gap-4">
                <div>
                    <label class="block text-xs font-bold text-gray-500 mb-1">Tipe Akun</label>
                    <select id="accType" class="w-full border border-gray-200 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none">
                        <option value="ASSET" ${acc && acc.type === 'ASSET' ? 'selected' : ''}>Aset (Harta)</option>
                        <option value="LIABILITY" ${acc && acc.type === 'LIABILITY' ? 'selected' : ''}>Liabilitas (Hutang)</option>
                        <option value="EQUITY" ${acc && acc.type === 'EQUITY' ? 'selected' : ''}>Ekuitas (Modal)</option>
                        <option value="INCOME" ${acc && acc.type === 'INCOME' ? 'selected' : ''}>Pendapatan</option>
                        <option value="EXPENSE" ${acc && acc.type === 'EXPENSE' ? 'selected' : ''}>Beban/Biaya</option>
                    </select>
                </div>
                <div>
                    <label class="block text-xs font-bold text-gray-500 mb-1">Saldo Awal (Manual)</label>
                    <input type="number" id="accOpeningBalance" value="${acc && acc.openingBalance !== undefined ? acc.openingBalance : ''}" class="w-full border border-gray-200 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none" placeholder="0">
                </div>
            </div>

            <div>
                <label class="block text-xs font-bold text-gray-500 mb-1">Deskripsi</label>
                <textarea id="accDesc" class="w-full border border-gray-200 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none" rows="2" placeholder="Penjelasan singkat penggunaan akun...">${acc && acc.description ? acc.description : ''}</textarea>
            </div>
        </form>
    `;
    const footer = `
        <button onclick="saveAccount()" class="px-6 py-2 bg-blue-600 text-white rounded-lg text-sm font-bold shadow-md hover:bg-blue-700 transition-colors">${acc ? 'Update Akun' : 'Simpan Akun'}</button>
        <button onclick="closeModal()" class="px-4 py-2 bg-gray-100 text-gray-600 rounded-lg text-sm font-bold mr-2">Batal</button>
    `;
    showModal(acc ? 'Edit Akun' : 'Tambah Akun Baru', body, footer);
};

window.saveAccount = function () {
    const editId = document.getElementById('editAccountId')?.value;
    const code = document.getElementById('accCode').value;
    const name = document.getElementById('accName').value;
    const type = document.getElementById('accType').value;
    const description = document.getElementById('accDesc').value;
    const openingBalanceStr = document.getElementById('accOpeningBalance')?.value;
    const openingBalance = openingBalanceStr ? parseFloat(openingBalanceStr) : 0;

    if (!code || !name) return alert('Mohon isi kode dan nama akun.');

    if (editId) {
        db.update('accounts', editId, { code, name, type, description, openingBalance });
        showToast('Akun berhasil diupdate');
    } else {
        db.insert('accounts', { code, name, type, description, status: 'ACTIVE', openingBalance });
        showToast('Akun berhasil ditambahkan');
    }

    closeModal();
    renderFinanceAccounts();
};

window.editAccount = function(id) {
    openAccountModal(id);
};

window.deleteAccount = function(id) {
    if (confirm('Yakin ingin menghapus akun ini?')) {
        db.delete('accounts', id);
        showToast('Akun berhasil dihapus', 'info');
        renderFinanceAccounts();
    }
};

window.viewAccountMutasi = function(accountId, startDate = '', endDate = '') {
    const acc = db.findById('accounts', accountId);
    if (!acc) return;
    
    const journalEntries = db.read('journalEntries').sort((a,b) => new Date(a.date) - new Date(b.date));
    const ledger = [];
    let runningBalance = parseFloat(acc.openingBalance) || 0;
    
    // Add Opening Balance as first entry
    ledger.push({
        date: acc.createdAt || new Date().toISOString(),
        journalNo: '-',
        description: 'Saldo Awal',
        debit: 0,
        credit: 0,
        balance: runningBalance
    });
    
    journalEntries.forEach(j => {
        j.items.forEach(item => {
            if (item.accountId === accountId) {
                const debit = parseFloat(item.debit) || 0;
                const credit = parseFloat(item.credit) || 0;
                
                // Normal Balance Logic: Assets/Expenses are +Debit, -Credit. Liability/Equity/Income are -Debit, +Credit.
                if (acc.type === 'ASSET' || acc.type === 'EXPENSE') {
                    runningBalance += (debit - credit);
                } else {
                    runningBalance += (credit - debit);
                }
                
                ledger.push({
                    date: j.date,
                    journalNo: j.journalNo,
                    description: j.description,
                    debit: debit,
                    credit: credit,
                    balance: runningBalance
                });
            }
        });
    });
    
    // Filter by date if provided
    let filteredLedger = ledger;
    if (startDate) {
        filteredLedger = filteredLedger.filter(l => l.date.slice(0, 10) >= startDate || l.description === 'Saldo Awal');
    }
    if (endDate) {
        filteredLedger = filteredLedger.filter(l => l.date.slice(0, 10) <= endDate || l.description === 'Saldo Awal');
    }

    // Sort reverse for display
    filteredLedger.reverse();

    const body = `
        <div class="space-y-4">
            <!-- Filter & Action Header -->
            <div class="flex flex-col md:flex-row justify-between items-start md:items-center p-4 bg-slate-50 border border-slate-200 rounded-xl gap-4 no-print">
                <div class="flex flex-wrap items-center gap-3">
                    <div class="flex flex-col">
                        <label class="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Dari Tanggal</label>
                        <input type="date" id="mutasi_start" value="${startDate}" class="border-2 border-slate-200 rounded-lg px-3 py-1.5 text-xs font-bold focus:border-blue-500 outline-none">
                    </div>
                    <div class="flex flex-col">
                        <label class="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Sampai Tanggal</label>
                        <input type="date" id="mutasi_end" value="${endDate}" class="border-2 border-slate-200 rounded-lg px-3 py-1.5 text-xs font-bold focus:border-blue-500 outline-none">
                    </div>
                    <button onclick="applyMutasiFilter('${accountId}')" class="mt-4 bg-blue-600 hover:bg-slate-900 text-white px-5 py-2 rounded-lg text-xs font-black uppercase tracking-widest transition-all">
                        <i class="fas fa-filter mr-2"></i> FILTER
                    </button>
                </div>
                <div class="flex gap-2 w-full md:w-auto mt-2 md:mt-0">
                    <button onclick="exportMutasiToPDF('${accountId}', '${startDate}', '${endDate}')" class="flex-1 md:flex-none bg-red-600 hover:bg-black text-white px-5 py-2.5 rounded-lg text-xs font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2">
                        <i class="fas fa-file-pdf"></i> CETAK PDF
                    </button>
                </div>
            </div>

            <div class="flex justify-between items-center bg-white p-4 rounded-lg border-2 border-slate-100 shadow-sm">
                <div>
                    <h4 class="text-sm font-black text-slate-800 uppercase tracking-widest">${acc.code} - ${acc.name}</h4>
                    <p class="text-[10px] text-gray-500 uppercase font-bold tracking-tight mt-1">Periode: <span class="text-blue-600">${startDate || 'Awal'} s/d ${endDate || 'Sekarang'}</span></p>
                </div>
                <div class="text-right">
                    <p class="text-[10px] text-gray-400 uppercase font-black">Saldo Akhir Periode</p>
                    <p class="text-lg font-black text-blue-600">${formatCurrency(Math.abs(filteredLedger[0]?.balance || 0))}</p>
                </div>
            </div>

            <div class="overflow-x-auto border rounded-xl overflow-hidden shadow-sm bg-white">
                <table id="mutasiTable" class="w-full text-left text-xs border-collapse">
                    <thead class="bg-slate-800 text-white uppercase tracking-widest text-[9px]">
                        <tr>
                            <th class="px-4 py-3 border-r border-slate-700">Tanggal</th>
                            <th class="px-4 py-3 border-r border-slate-700">Ref / Jurnal</th>
                            <th class="px-4 py-3 border-r border-slate-700">Keterangan</th>
                            <th class="px-4 py-3 text-right border-r border-slate-700 uppercase">Debit</th>
                            <th class="px-4 py-3 text-right border-r border-slate-700 uppercase">Kredit</th>
                            <th class="px-4 py-3 text-right uppercase">Saldo</th>
                        </tr>
                    </thead>
                    <tbody class="divide-y divide-gray-100">
                        ${filteredLedger.map(l => `
                            <tr class="hover:bg-blue-50/50 transition-colors">
                                <td class="px-4 py-3 text-gray-400 whitespace-nowrap font-medium">${l.date.slice(0, 10).split('-').reverse().join('/')}</td>
                                <td class="px-4 py-3 font-bold text-slate-700 whitespace-nowrap">${l.journalNo}</td>
                                <td class="px-4 py-3 text-gray-600 min-w-[200px] font-medium">${l.description}</td>
                                <td class="px-4 py-3 text-right font-bold ${l.debit > 0 ? 'text-blue-600' : 'text-slate-100'}">${l.debit > 0 ? formatCurrency(l.debit).replace('Rp ', '') : '0,00'}</td>
                                <td class="px-4 py-3 text-right font-bold ${l.credit > 0 ? 'text-red-500' : 'text-slate-100'}">${l.credit > 0 ? formatCurrency(l.credit).replace('Rp ', '') : '0,00'}</td>
                                <td class="px-4 py-3 text-right font-black text-slate-800 bg-slate-50/50">${formatCurrency(Math.abs(l.balance)).replace('Rp ', '')}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        </div>
    `;
    
    const footer = `
        <button onclick="closeModal()" class="px-8 py-2.5 bg-slate-900 text-white rounded-lg text-xs font-black uppercase tracking-widest hover:bg-black transition-all">Tutup</button>
    `;
    
    showModal(`Mutasi Buku Besar: ${acc.name}`, body, footer, 'full');
};

window.applyMutasiFilter = function(accountId) {
    const start = document.getElementById('mutasi_start').value;
    const end = document.getElementById('mutasi_end').value;
    viewAccountMutasi(accountId, start, end);
};

window.exportMutasiToPDF = function(accountId, startDate, endDate) {
    const acc = db.findById('accounts', accountId);
    if (!acc) return;

    const printHeader = `
        <div style="text-align: center; margin-bottom: 20px; border-bottom: 2px solid #333; padding-bottom: 10px;">
            <h1 style="margin: 0; font-size: 24px;">PT. TANA SUBUR NUSANTARA</h1>
            <p style="margin: 5px 0; font-size: 14px;">LAPORAN MUTASI BUKU BESAR</p>
            <h2 style="margin: 5px 0; font-size: 18px; color: #1a56db;">${acc.code} - ${acc.name}</h2>
            <p style="margin: 5px 0; font-size: 12px; color: #666;">Periode: ${startDate || 'Awal'} s/d ${endDate || 'Sekarang'}</p>
        </div>
    `;

    const tableToPrint = document.getElementById('mutasiTable').cloneNode(true);
    
    // Customize table for print
    tableToPrint.style.width = '100%';
    tableToPrint.style.borderCollapse = 'collapse';
    tableToPrint.style.fontSize = '10px';
    
    const ths = tableToPrint.querySelectorAll('th');
    ths.forEach(th => {
        th.style.border = '1px solid #ddd';
        th.style.padding = '8px';
        th.style.backgroundColor = '#f8fafc';
        th.style.color = '#333';
        th.style.textAlign = 'left';
    });
    
    const tds = tableToPrint.querySelectorAll('td');
    tds.forEach(td => {
        td.style.border = '1px solid #ddd';
        td.style.padding = '6px';
        if (td.classList.contains('text-right')) td.style.textAlign = 'right';
    });

    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
        <html>
            <head>
                <title>Mutasi_${acc.name}_${new Date().toISOString().slice(0, 10)}</title>
                <style>
                    body { font-family: 'Inter', system-ui, sans-serif; padding: 20px; }
                    @page { margin: 1cm; }
                    .text-right { text-align: right; }
                    .font-bold { font-weight: bold; }
                    .text-blue-600 { color: #1a56db; }
                    .text-red-500 { color: #ef4444; }
                </style>
            </head>
            <body>
                ${printHeader}
                ${tableToPrint.outerHTML}
                <div style="margin-top: 30px; text-align: right;">
                    <p style="font-size: 10px; color: #999;">Dicetak pada: ${new Date().toLocaleString()}</p>
                </div>
            </body>
        </html>
    `);

    printWindow.document.close();
    setTimeout(() => {
        printWindow.print();
        // printWindow.close(); // Optional: close after print
    }, 500);
};

window.renderFinanceExpenses = function () {
    document.getElementById('pageTitle').innerText = 'Manajemen Pengeluaran & Biaya';
    const mc = document.getElementById('main-content');
    
    // Filters logic
    const fDateStart = window._expenseFilters?.start || '';
    const fDateEnd = window._expenseFilters?.end || '';
    const fCoaId = window._expenseFilters?.coaId || '';
    const allCoa = db.read('accounts').filter(a => a.type === 'EXPENSE');

    let expenses = db.read('expenses') || [];
    if (fDateStart) expenses = expenses.filter(e => e.date >= fDateStart);
    if (fDateEnd) expenses = expenses.filter(e => e.date <= fDateEnd);
    if (fCoaId) expenses = expenses.filter(e => e.toAccountId === fCoaId);

    mc.innerHTML = `
        <div class="flex flex-col gap-6">
            <!-- Filter Section -->
            <div class="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
                <div onclick="toggleExpenseFilter()" class="flex items-center justify-between p-4 cursor-pointer hover:bg-slate-50 transition-colors select-none">
                    <h3 class="text-[10px] font-black text-slate-800 uppercase tracking-[0.2em] flex items-center gap-3">
                        <i class="fas fa-filter text-red-600"></i> FILTER PENCARIAN
                        ${(fDateStart || fDateEnd || fCoaId) ? `<span class="ml-2 px-2 py-0.5 bg-red-50 text-red-600 rounded-full text-[9px] font-bold">Filter Aktif</span>` : ''}
                    </h3>
                    <div class="flex items-center gap-3">
                        <span class="text-[9px] font-bold text-slate-400 uppercase tracking-widest">${window._uiState.expFilterOpen ? 'Sembunyikan' : 'Tampilkan'}</span>
                        <i class="fas fa-chevron-${window._uiState.expFilterOpen ? 'up' : 'down'} text-slate-300 text-xs"></i>
                    </div>
                </div>
                <div class="${window._uiState.expFilterOpen ? 'block' : 'hidden'} p-5 border-t border-slate-50 animate-in slide-in-from-top-2 duration-200">
                    <div class="grid grid-cols-1 md:grid-cols-3 gap-6 items-end">
                        <div class="space-y-1.5">
                            <label class="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Dari Tanggal</label>
                            <input type="date" id="expFStart" value="${fDateStart}" class="w-full border-2 border-slate-100 rounded-lg px-3 py-2 text-sm font-bold text-slate-700 bg-slate-50/50 outline-none focus:border-red-500 transition-all">
                        </div>
                        <div class="space-y-1.5">
                            <label class="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Sampai Tanggal</label>
                            <input type="date" id="expFEnd" value="${fDateEnd}" class="w-full border-2 border-slate-100 rounded-lg px-3 py-2 text-sm font-bold text-slate-700 bg-slate-50/50 outline-none focus:border-red-500 transition-all">
                        </div>
                        <div class="space-y-1.5">
                            <label class="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Nama COA (Biaya)</label>
                            <select id="expFCoa" class="w-full border-2 border-slate-100 rounded-lg px-3 py-2 text-sm font-bold text-slate-700 bg-slate-50/50 outline-none focus:border-red-500 transition-all">
                                <option value="">-- Semua Kategori --</option>
                                ${allCoa.map(a => `<option value="${a.id}" ${fCoaId === a.id ? 'selected' : ''}>${a.code} - ${a.name}</option>`).join('')}
                            </select>
                        </div>
                    </div>
                    <div class="flex gap-2 pt-6 mt-6 border-t border-slate-50">
                        <button onclick="applyExpenseFilters()" class="bg-red-600 hover:bg-slate-900 text-white px-8 py-2.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all shadow-lg active:scale-95">
                            CARI DATA
                        </button>
                        <button onclick="resetExpenseFilters()" class="bg-slate-50 hover:bg-slate-100 text-slate-400 px-5 py-2.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all">
                            RESET
                        </button>
                    </div>
                </div>
            </div>

            <div class="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                <div class="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                    <div>
                        <h3 class="font-bold text-gray-700 text-lg">Riwayat Pengeluaran (Biaya)</h3>
                        <p class="text-xs text-gray-500 text-red-500">Catat setiap pengeluaran kas perusahaan</p>
                    </div>
                    <button onclick="openExpenseModal()" class="px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-bold hover:bg-red-700 transition-colors shadow-sm">
                        <i class="fas fa-plus mr-2"></i>Catat Biaya
                    </button>
                </div>
                <div class="overflow-x-auto">
                    <table class="w-full text-left border-collapse">
                        <thead class="bg-gray-50 text-slate-500 text-[11px] uppercase tracking-wider font-semibold">
                            <tr>
                                <th class="px-6 py-3 border-b border-gray-100">Tgl & Ref</th>
                                <th class="px-6 py-3 border-b border-gray-100">Kebutuhan</th>
                                <th class="px-6 py-3 border-b border-gray-100">Nama COA</th>
                                <th class="px-6 py-3 border-b border-gray-100">Kas Bank</th>
                                <th class="px-6 py-3 border-b border-gray-100 text-right">Jumlah</th>
                            </tr>
                        </thead>
                        <tbody class="text-sm divide-y divide-gray-100">
                            ${expenses.map(e => `
                                <tr class="hover:bg-red-50/30 transition-colors">
                                    <td class="px-6 py-4">
                                        <div class="text-[10px] text-gray-400 font-bold">${formatDate(e.date).slice(0, 10)}</div>
                                        <div class="font-bold text-gray-800">${e.expenseNo}</div>
                                    </td>
                                    <td class="px-6 py-4 text-gray-600 font-medium">${e.description}</td>
                                    <td class="px-6 py-4">
                                        <span class="px-2 py-0.5 bg-gray-100 text-gray-600 rounded-md text-[10px] uppercase font-bold">
                                            ${db.findById('accounts', e.toAccountId)?.name || '-'}
                                        </span>
                                    </td>
                                    <td class="px-6 py-4 text-gray-600 text-xs font-bold uppercase">${db.findById('accounts', e.fromAccountId)?.name || '-'}</td>
                                    <td class="px-6 py-4 text-right font-black text-red-600">${formatCurrency(e.amount)}</td>
                                </tr>
                            `).join('') || '<tr><td colspan="5" class="px-6 py-12 text-center text-gray-400 italic">Belum ada pengeluaran yang ditemukan.</td></tr>'}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    `;
};

window.toggleExpenseFilter = function() {
    window._uiState.expFilterOpen = !window._uiState.expFilterOpen;
    renderFinanceExpenses();
};

window.applyExpenseFilters = function() {
    window._expenseFilters = {
        start: document.getElementById('expFStart').value,
        end: document.getElementById('expFEnd').value,
        coaId: document.getElementById('expFCoa').value
    };
    renderFinanceExpenses();
};

window.resetExpenseFilters = function() {
    window._expenseFilters = { start: '', end: '', coaId: '' };
    renderFinanceExpenses();
};

window.renderFinanceReceipts = function () {
    document.getElementById('pageTitle').innerText = 'Penerimaan Kas & Bank';
    const mc = document.getElementById('main-content');
    
    // Filters logic
    const fDateStart = window._receiptFilters?.start || '';
    const fDateEnd = window._receiptFilters?.end || '';
    const fCoaId = window._receiptFilters?.coaId || '';
    const allCoa = db.read('accounts').filter(a => a.type === 'INCOME' || a.type === 'EQUITY' || a.type === 'LIABILITY');

    let receipts = db.read('receipts') || [];
    if (fDateStart) receipts = receipts.filter(r => r.date >= fDateStart);
    if (fDateEnd) receipts = receipts.filter(r => r.date <= fDateEnd);
    if (fCoaId) receipts = receipts.filter(r => r.sourceAccountId === fCoaId);

    mc.innerHTML = `
        <div class="flex flex-col gap-6">
            <!-- Filter Section -->
            <div class="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
                <div onclick="toggleReceiptFilter()" class="flex items-center justify-between p-4 cursor-pointer hover:bg-slate-50 transition-colors select-none">
                    <h3 class="text-[10px] font-black text-slate-800 uppercase tracking-[0.2em] flex items-center gap-3">
                        <i class="fas fa-filter text-blue-600"></i> FILTER PENCARIAN
                        ${(fDateStart || fDateEnd || fCoaId) ? `<span class="ml-2 px-2 py-0.5 bg-blue-50 text-blue-600 rounded-full text-[9px] font-bold">Filter Aktif</span>` : ''}
                    </h3>
                    <div class="flex items-center gap-3">
                        <span class="text-[9px] font-bold text-slate-400 uppercase tracking-widest">${window._uiState.recFilterOpen ? 'Sembunyikan' : 'Tampilkan'}</span>
                        <i class="fas fa-chevron-${window._uiState.recFilterOpen ? 'up' : 'down'} text-slate-300 text-xs"></i>
                    </div>
                </div>
                <div class="${window._uiState.recFilterOpen ? 'block' : 'hidden'} p-5 border-t border-slate-50 animate-in slide-in-from-top-2 duration-200">
                    <div class="grid grid-cols-1 md:grid-cols-3 gap-6 items-end">
                        <div class="space-y-1.5">
                            <label class="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Dari Tanggal</label>
                            <input type="date" id="recFStart" value="${fDateStart}" class="w-full border-2 border-slate-100 rounded-lg px-3 py-2 text-sm font-bold text-slate-700 bg-slate-50/50 outline-none focus:border-blue-500 transition-all">
                        </div>
                        <div class="space-y-1.5">
                            <label class="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Sampai Tanggal</label>
                            <input type="date" id="recFEnd" value="${fDateEnd}" class="w-full border-2 border-slate-100 rounded-lg px-3 py-2 text-sm font-bold text-slate-700 bg-slate-50/50 outline-none focus:border-blue-500 transition-all">
                        </div>
                        <div class="space-y-1.5">
                            <label class="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Sumber COA</label>
                            <select id="recFCoa" class="w-full border-2 border-slate-100 rounded-lg px-3 py-2 text-sm font-bold text-slate-700 bg-slate-50/50 outline-none focus:border-blue-500 transition-all">
                                <option value="">-- Semua Sumber --</option>
                                ${allCoa.map(a => `<option value="${a.id}" ${fCoaId === a.id ? 'selected' : ''}>${a.code} - ${a.name}</option>`).join('')}
                            </select>
                        </div>
                    </div>
                    <div class="flex gap-2 pt-6 mt-6 border-t border-slate-50">
                        <button onclick="applyReceiptFilters()" class="bg-blue-600 hover:bg-slate-900 text-white px-8 py-2.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all shadow-lg active:scale-95">
                            CARI DATA
                        </button>
                        <button onclick="resetReceiptFilters()" class="bg-slate-50 hover:bg-slate-100 text-slate-400 px-5 py-2.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all">
                            RESET
                        </button>
                    </div>
                </div>
            </div>

            <div class="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                <div class="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                    <div>
                        <h3 class="font-bold text-gray-700 text-lg">Riwayat Penerimaan</h3>
                        <p class="text-xs text-gray-500 text-blue-500">Catat setiap uang yang masuk ke kas/bank perusahaan</p>
                    </div>
                    <button onclick="openReceiptModal()" class="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-bold hover:bg-blue-700 transition-colors shadow-sm">
                        <i class="fas fa-plus mr-2"></i>Catat Penerimaan
                    </button>
                </div>
                <div class="overflow-x-auto">
                    <table class="w-full text-left border-collapse">
                        <thead class="bg-gray-50 text-slate-500 text-[11px] uppercase tracking-wider font-semibold">
                            <tr>
                                <th class="px-6 py-3 border-b border-gray-100">Tgl & Ref</th>
                                <th class="px-6 py-3 border-b border-gray-100">Keterangan</th>
                                <th class="px-6 py-3 border-b border-gray-100">Sumber (COA)</th>
                                <th class="px-6 py-3 border-b border-gray-100">Penerima (Kas)</th>
                                <th class="px-6 py-3 border-b border-gray-100 text-right">Jumlah</th>
                            </tr>
                        </thead>
                        <tbody class="text-sm divide-y divide-gray-100">
                            ${receipts.map(r => `
                                <tr class="hover:bg-blue-50/30 transition-colors">
                                    <td class="px-6 py-4">
                                        <div class="text-[10px] text-gray-400 font-bold">${formatDate(r.date).slice(0, 10)}</div>
                                        <div class="font-bold text-gray-800">${r.receiptNo}</div>
                                    </td>
                                    <td class="px-6 py-4 text-gray-600 font-medium">${r.description}</td>
                                    <td class="px-6 py-4 text-gray-500 text-xs font-bold uppercase tracking-tight">${db.findById('accounts', r.sourceAccountId)?.name || '-'}</td>
                                    <td class="px-6 py-4 text-gray-500 text-xs font-bold uppercase tracking-tight">${db.findById('accounts', r.targetAccountId)?.name || '-'}</td>
                                    <td class="px-6 py-4 text-right font-black text-blue-600">${formatCurrency(r.amount)}</td>
                                </tr>
                            `).join('') || '<tr><td colspan="5" class="px-6 py-12 text-center text-gray-400 italic">Belum ada penerimaan yang ditemukan.</td></tr>'}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    `;
};

window.toggleReceiptFilter = function() {
    window._uiState.recFilterOpen = !window._uiState.recFilterOpen;
    renderFinanceReceipts();
};

window.toggleARFilter = function() {
    window._uiState.arFilterOpen = !window._uiState.arFilterOpen;
    renderFinanceAR();
};

window.toggleAPFilter = function() {
    window._uiState.apFilterOpen = !window._uiState.apFilterOpen;
    renderFinanceAP();
};

window.toggleJournalFilter = function() {
    window._uiState.journalFilterOpen = !window._uiState.journalFilterOpen;
    renderFinanceJournal();
};

window.applyJournalFilters = function() {
    window._journalFilters = {
        q: document.getElementById('journalFilterQ').value
    };
    renderFinanceJournal();
};

window.applyReceiptFilters = function() {
    window._receiptFilters = {
        start: document.getElementById('recFStart').value,
        end: document.getElementById('recFEnd').value,
        coaId: document.getElementById('recFCoa').value
    };
    renderFinanceReceipts();
};

window.resetReceiptFilters = function() {
    window._receiptFilters = { start: '', end: '', coaId: '' };
    renderFinanceReceipts();
};

window.openReceiptModal = function () {
    const assetAccounts = db.read('accounts').filter(a => a.type === 'ASSET' && a.code.startsWith('11'));
    const allAccounts = db.read('accounts');

    const body = `
        <form id="receiptForm" class="space-y-8 py-6">
            <div class="grid grid-cols-2 gap-8">
                <div class="col-span-2 md:col-span-1">
                    <label class="block text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] mb-3 ml-1">Tanggal Terima</label>
                    <input type="date" id="recDate" class="w-full border-2 border-slate-100 rounded-xl p-4 text-base font-bold focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all bg-slate-50/30" value="${new Date().toISOString().slice(0, 10)}">
                </div>
                <div class="col-span-2 md:col-span-1">
                    <label class="block text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] mb-3 ml-1">Jumlah diterima (IDR)</label>
                    <input type="text" id="recAmount" 
                           oninput="this.value = formatAmountInput(this.value)"
                           class="w-full border-2 border-slate-100 rounded-xl p-4 text-base font-bold focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all bg-slate-50/30" 
                           placeholder="0" required>
                </div>
            </div>
            
            <div class="grid grid-cols-2 gap-8">
                <div class="col-span-2 md:col-span-1">
                    <label class="block text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] mb-3 ml-1">Masuk Ke (Kas/Bank Penerima)</label>
                    <select id="recTargetAccount" class="w-full border-2 border-slate-100 rounded-xl p-4 text-base font-bold focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all bg-slate-50/30">
                        ${assetAccounts.map(a => `<option value="${a.id}">${a.name} (${a.code})</option>`).join('')}
                    </select>
                </div>
                <div class="col-span-2 md:col-span-1">
                    <label class="block text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] mb-3 ml-1">Sumber COA (Asal Dana)</label>
                    <select id="recSourceAccount" class="w-full border-2 border-slate-100 rounded-xl p-4 text-base font-bold focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all bg-slate-50/30">
                        <option value="">- Pilih Akun Sumber -</option>
                        ${allAccounts.map(a => `<option value="${a.id}">${a.code} - ${a.name}</option>`).join('')}
                    </select>
                </div>
            </div>

            <div class="grid grid-cols-2 gap-8">
                <div class="col-span-2 md:col-span-1">
                    <label class="block text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] mb-3 ml-1">Metode Penerimaan</label>
                    <select id="recMethod" class="w-full border-2 border-slate-100 rounded-xl p-4 text-base font-bold focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all bg-slate-50/30">
                        <option value="Transfer">Transfer Bank</option>
                        <option value="Tunai">Tunai / Cash</option>
                        <option value="Cek/Giro">Cek / Giro</option>
                    </select>
                </div>
                <div class="col-span-2 md:col-span-1">
                    <label class="block text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] mb-3 ml-1">Keterangan Transaksi</label>
                    <textarea id="recDesc" class="w-full border-2 border-slate-100 rounded-xl p-4 text-base font-bold focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all bg-slate-50/30" rows="2" placeholder="Tuliskan alasan atau detail penerimaan dana..."></textarea>
                </div>
            </div>
        </form>
    `;
    const footer = `
        <button onclick="saveReceipt()" class="px-8 py-3 bg-blue-600 text-white rounded-lg text-xs font-black uppercase tracking-widest shadow-lg hover:bg-slate-900 transition-all active:scale-95">Simpan Penerimaan</button>
        <button onclick="closeModal()" class="px-5 py-3 bg-gray-100 text-gray-500 rounded-lg text-xs font-black uppercase tracking-widest mr-2 hover:bg-gray-200 transition-all">Batal</button>
    `;
    showModal('Catat Penerimaan Kas & Bank', body, footer, 'xl');
};

window.saveReceipt = function () {
    const date = document.getElementById('recDate').value;
    const amountVal = document.getElementById('recAmount').value;
    const amount = parseAmountInput(amountVal);
    const targetAccId = document.getElementById('recTargetAccount').value;
    const sourceAccId = document.getElementById('recSourceAccount').value;
    const method = document.getElementById('recMethod').value;
    const desc = document.getElementById('recDesc').value;

    if (!amount || amount <= 0) return showToast('Mohon isi jumlah penerimaan.', 'error');
    if (!sourceAccId) return showToast('Mohon pilih akun sumber (COA).', 'error');

    const receiptNo = db.generateFinanceTxNo('RECEIPT');
    const receipt = db.insert('receipts', {
        date, receiptNo, amount, targetAccountId: targetAccId, sourceAccountId: sourceAccId, method, description: desc
    });

    // Create Journal Entry
    // Debit: Cash/Bank (Target), Credit: Source COA
    db.addJournalEntry({
        date, 
        journalNo: receiptNo, 
        description: desc || `Penerimaan Kas - ${receiptNo}`, 
        items: [
            { accountId: targetAccId, debit: amount, credit: 0 },
            { accountId: sourceAccId, debit: 0, credit: amount }
        ], 
        referenceType: 'RECEIPT', 
        referenceId: receipt.id
    });

    closeModal();
    showToast('Penerimaan berhasil dicatat', 'success');
    renderFinanceReceipts();
};

window.openExpenseModal = function () {
    const assetAccounts = db.read('accounts').filter(a => a.type === 'ASSET' && a.code.startsWith('11'));
    const expenseAccounts = db.read('accounts').filter(a => a.type === 'EXPENSE');
    const depts = db.read('departments');

    const body = `
        <form id="expenseForm" class="space-y-8 py-6">
            <div class="grid grid-cols-2 gap-8">
                <div>
                    <label class="block text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] mb-3 ml-1">Tanggal di bayar</label>
                    <input type="date" id="expDate" class="w-full border-2 border-slate-100 rounded-xl p-4 text-base font-bold focus:ring-4 focus:ring-red-500/10 focus:border-red-500 outline-none transition-all bg-slate-50/30" value="${new Date().toISOString().slice(0, 10)}">
                </div>
                <div>
                    <label class="block text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] mb-3 ml-1">Jumlah yang di bayar (IDR)</label>
                    <input type="text" id="expAmount" 
                           oninput="this.value = formatAmountInput(this.value)"
                           class="w-full border-2 border-slate-100 rounded-xl p-4 text-base font-bold focus:ring-4 focus:ring-red-500/10 focus:border-red-500 outline-none transition-all bg-slate-50/30" 
                           placeholder="0" required>
                </div>
            </div>

            <div class="grid grid-cols-2 gap-8">
                <div>
                    <label class="block text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] mb-3 ml-1">Kas Bank yang mengeluarkan dana</label>
                    <select id="expFromAccount" class="w-full border-2 border-slate-100 rounded-xl p-4 text-base font-bold focus:ring-4 focus:ring-red-500/10 focus:border-red-500 outline-none transition-all bg-slate-50/30">
                        ${assetAccounts.map(a => `<option value="${a.id}">${a.name} (${a.code})</option>`).join('')}
                    </select>
                </div>
                <div>
                    <label class="block text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] mb-3 ml-1">Nama COA (Kategori Biaya)</label>
                    <select id="expToAccount" class="w-full border-2 border-slate-100 rounded-xl p-4 text-base font-bold focus:ring-4 focus:ring-red-500/10 focus:border-red-500 outline-none transition-all bg-slate-50/30">
                        ${expenseAccounts.map(a => `<option value="${a.id}">${a.name} (${a.code})</option>`).join('')}
                    </select>
                </div>
            </div>

            <div class="grid grid-cols-2 gap-8">
                <div>
                    <label class="block text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] mb-3 ml-1">Metode Pembayaran</label>
                    <select id="expMethod" class="w-full border-2 border-slate-100 rounded-xl p-4 text-base font-bold focus:ring-4 focus:ring-red-500/10 focus:border-red-500 outline-none transition-all bg-slate-50/30">
                        <option value="Transfer">Transfer Bank</option>
                        <option value="Tunai">Tunai / Cash</option>
                        <option value="Cek/Giro">Cek / Giro</option>
                    </select>
                </div>
                <div>
                    <label class="block text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] mb-3 ml-1">Departemen Alokasi</label>
                    <select id="expDept" class="w-full border-2 border-slate-100 rounded-xl p-4 text-base font-bold focus:ring-4 focus:ring-red-500/10 focus:border-red-500 outline-none transition-all bg-slate-50/30">
                        <option value="">- Pilih Departemen -</option>
                        ${depts.map(d => `<option value="${d.id}">${d.name}</option>`).join('')}
                    </select>
                </div>
            </div>

            <div>
                <label class="block text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] mb-3 ml-1">Kebutuhan (Keterangan)</label>
                <textarea id="expDesc" class="w-full border-2 border-slate-100 rounded-xl p-4 text-base font-bold focus:ring-4 focus:ring-red-500/10 focus:border-red-500 outline-none transition-all bg-slate-50/30" rows="2" placeholder="Tuliskan tujuan atau kebutuhan pengeluaran dana..."></textarea>
            </div>
        </form>
    `;
    const footer = `
        <button onclick="saveExpense()" class="px-8 py-3 bg-red-600 text-white rounded-lg text-xs font-black uppercase tracking-widest shadow-lg hover:bg-slate-900 transition-all active:scale-95">Simpan Pengeluaran</button>
        <button onclick="closeModal()" class="px-5 py-3 bg-gray-100 text-gray-500 rounded-lg text-xs font-black uppercase tracking-widest mr-2 hover:bg-gray-200 transition-all">Batal</button>
    `;
    showModal('Catat Pengeluaran Baru', body, footer, 'xl');
};

window.saveExpense = function () {
    const date = document.getElementById('expDate').value;
    const amountVal = document.getElementById('expAmount').value;
    const amount = parseAmountInput(amountVal);
    const fromAccId = document.getElementById('expFromAccount').value;
    const toAccId = document.getElementById('expToAccount').value;
    const deptId = document.getElementById('expDept').value;
    const method = document.getElementById('expMethod').value;
    const desc = document.getElementById('expDesc').value;

    if (!amount || amount <= 0) return showToast('Mohon isi jumlah pengeluaran.', 'error');

    const expenseNo = db.generateFinanceTxNo('EXPENSE');
    const expense = db.insert('expenses', {
        date, expenseNo, amount, fromAccountId: fromAccId, toAccountId: toAccId, departmentId: deptId, description: desc, method: method
    });

    // Create Journal Entry
    db.addJournalEntry({
        date, 
        journalNo: expenseNo, 
        description: desc || `Pengeluaran - ${expenseNo}`, 
        items: [
            { accountId: toAccId, debit: amount, credit: 0 },
            { accountId: fromAccId, debit: 0, credit: amount }
        ], 
        referenceType: 'EXPENSE', 
        referenceId: expense.id, 
        departmentId: deptId
    });

    closeModal();
    showToast('Pengeluaran berhasil dicatat', 'success');
    renderFinanceExpenses();
};

window.renderFinanceJournal = function () {
    document.getElementById('pageTitle').innerText = 'Jurnal Umum (General Journal)';
    const mc = document.getElementById('main-content');
    const journal = db.read('journalEntries') || [];
    // Filter logic
    window._journalFilters = window._journalFilters || { q: '' };
    const f = window._journalFilters;
    let filteredJournal = [...journal];
    if (f.q) {
        const query = f.q.toLowerCase();
        filteredJournal = filteredJournal.filter(j => 
            j.description.toLowerCase().includes(query) || 
            j.journalNo.toLowerCase().includes(query) ||
            (j.partnerName && j.partnerName.toLowerCase().includes(query))
        );
    }

    mc.innerHTML = `
        <div class="space-y-6">
            <!-- New Standard Filter Section -->
            <div class="bg-white rounded-xl shadow-sm border border-slate-100 mb-6 overflow-hidden">
                <div onclick="toggleJournalFilter()" class="flex items-center justify-between p-4 cursor-pointer hover:bg-slate-50 transition-colors select-none">
                    <h3 class="text-[10px] font-black text-slate-800 uppercase tracking-[0.2em] flex items-center gap-3">
                        <i class="fas fa-filter text-blue-600"></i> FILTER PENCARIAN
                        ${f.q ? `<span class="ml-2 px-2 py-0.5 bg-blue-50 text-blue-600 rounded-full text-[9px] font-bold">Filter Aktif</span>` : ''}
                    </h3>
                    <div class="flex items-center gap-3">
                        <span class="text-[9px] font-bold text-slate-400 uppercase tracking-widest">${window._uiState.journalFilterOpen ? 'Sembunyikan' : 'Tampilkan'}</span>
                        <i class="fas fa-chevron-${window._uiState.journalFilterOpen ? 'up' : 'down'} text-slate-300 text-xs"></i>
                    </div>
                </div>

                <div class="${window._uiState.journalFilterOpen ? 'block' : 'hidden'} p-5 border-t border-slate-50 animate-in slide-in-from-top-2 duration-200">
                    <div>
                        <label class="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Pencarian Jurnal</label>
                        <div class="relative">
                            <i class="fas fa-search absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"></i>
                            <input type="text" id="journalFilterQ" value="${f.q}" placeholder="Cari Deskripsi, Nomor Jurnal, atau Mitra..." 
                                class="w-full border-2 border-slate-100 rounded-lg pl-10 pr-3 py-2 text-sm font-bold text-slate-700 focus:border-blue-500 outline-none transition-all bg-slate-50/50 focus:bg-white overflow-hidden"
                                onkeyup="if(event.key === 'Enter') applyJournalFilters()">
                        </div>
                    </div>
                    <div class="flex gap-2 pt-4 mt-4 border-t border-slate-50">
                        <button onclick="applyJournalFilters()" class="bg-blue-600 hover:bg-slate-900 text-white px-8 py-2.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all shadow-lg active:scale-95">
                            <i class="fas fa-search mr-2"></i> TAMPILKAN DATA
                        </button>
                        <button onclick="document.getElementById('journalFilterQ').value=''; applyJournalFilters()" class="bg-slate-50 hover:bg-slate-100 text-slate-400 px-5 py-2.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all">
                            <i class="fas fa-undo mr-2"></i> RESET
                        </button>
                    </div>
                </div>
            </div>

            <div class="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <div class="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                <div>
                     <h3 class="font-bold text-gray-700 text-lg">Semua Transaksi</h3>
                     <p class="text-xs text-gray-500 italic">Audit trail semua transaksi akuntansi</p>
                </div>
                <!-- Manual Journal Button (Placeholder) -->
                <button onclick="openJournalEntryModal()" class="px-4 py-2 bg-gray-800 text-white rounded-lg text-sm font-bold hover:bg-black transition-all">
                    <i class="fas fa-plus mr-2"></i>Entri Jurnal
                </button>
            </div>
            <div class="overflow-x-auto">
                <table class="w-full text-left border-collapse table-fixed">
                    <thead class="bg-gray-50 text-slate-500 text-[11px] uppercase tracking-wider font-semibold">
                        <tr>
                            <th class="px-6 py-3 border-b border-gray-100 w-32">Ref & Tgl</th>
                            <th class="px-6 py-3 border-b border-gray-100 w-64">Akun & Departemen</th>
                            <th class="px-6 py-3 border-b border-gray-100 text-right w-32">Debit</th>
                            <th class="px-6 py-3 border-b border-gray-100 text-right w-32">Kredit</th>
                        </tr>
                    </thead>
                    <tbody class="text-xs divide-y divide-gray-100">
                        ${filteredJournal.map(j => `
                            <tr class="bg-slate-50/50">
                                <td class="px-6 py-4" colspan="2">
                                    <div class="flex items-center gap-3">
                                        <div class="px-2 py-1 bg-blue-100 text-blue-700 rounded font-bold text-[9px]">${j.journalNo}</div>
                                        <div>
                                            <span class="font-bold text-gray-800">${j.description}</span>
                                            <span class="ml-2 text-[10px] text-gray-400">${formatDate(j.date).slice(0, 10)} ${j.partnerName ? `· <span class="text-indigo-600 font-bold">${j.partnerName}</span>` : ''}</span>
                                        </div>
                                    </div>
                                </td>
                                <td colspan="2"></td>
                            </tr>
                            ${j.items.map(item => `
                                <tr>
                                    <td class="px-6 py-2"></td>
                                    <td class="px-6 py-2">
                                        <div class="flex items-center gap-2 ${item.credit > 0 ? 'pl-8' : ''}">
                                            <span class="font-medium text-gray-700">${db.findById('accounts', item.accountId)?.name || '-'}</span>
                                            <span class="text-[9px] text-gray-400">(${db.findById('accounts', item.accountId)?.code || '-'})</span>
                                            ${j.departmentId ? `<span class="px-1.5 py-0.5 bg-gray-100 text-gray-500 rounded text-[8px] font-bold uppercase">${db.findById('departments', j.departmentId)?.name}</span>` : ''}
                                        </div>
                                    </td>
                                    <td class="px-6 py-2 text-right ${item.debit > 0 ? 'font-bold text-gray-800' : 'text-gray-300'}">
                                        ${item.debit > 0 ? formatCurrency(item.debit).replace('Rp ', '').trim() : '-'}
                                    </td>
                                    <td class="px-6 py-2 text-right ${item.credit > 0 ? 'font-bold text-gray-800' : 'text-gray-300'}">
                                        ${item.credit > 0 ? formatCurrency(item.credit).replace('Rp ', '').trim() : '-'}
                                    </td>
                                </tr>
                            `).join('')}
                        `).join('') || '<tr><td colspan="4" class="px-6 py-12 text-center text-gray-400">Jurnal akuntansi masih kosong.</td></tr>'}
                    </tbody>
                </table>
            </div>
        </div>
    `;
};

// --- Manual Journal Modal ---
window.openJournalEntryModal = function() {
    const accs = db.read('accounts').filter(a => a.status === 'ACTIVE');
    const depts = db.read('departments');
    const customers = db.read('customers');
    const suppliers = db.read('suppliers');
    
    // Combine partners for selection
    const partners = [
        ...customers.map(c => ({ id: c.id, name: c.name, type: 'CUSTOMER' })),
        ...suppliers.map(s => ({ id: s.id, name: s.name, type: 'SUPPLIER' }))
    ].sort((a,b) => a.name.localeCompare(b.name));

    const body = `
        <div class="space-y-4">
            <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                    <label class="block text-[10px] font-bold text-gray-400 uppercase mb-1">Tanggal Entry</label>
                    <input type="date" id="mj_date" class="w-full border-2 border-gray-100 rounded-lg p-2.5 text-sm" value="${new Date().toISOString().split('T')[0]}">
                </div>
                <div class="md:col-span-2">
                    <label class="block text-[10px] font-bold text-gray-400 uppercase mb-1">Keterangan / Memo</label>
                    <input type="text" id="mj_desc" class="w-full border-2 border-gray-100 rounded-lg p-2.5 text-sm" placeholder="Misal: Penyesuaian Saldo Awal atau Biaya Lainnya">
                </div>
            </div>
            
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                     <label class="block text-[10px] font-bold text-gray-400 uppercase mb-1 text-indigo-600">Link Mitra (Customer/Supplier) - Opsional</label>
                     <select id="mj_partner" class="w-full border-2 border-gray-100 rounded-lg p-2.5 text-sm">
                        <option value="">- Pilih Mitra (Tidak ada) -</option>
                        ${partners.map(p => `<option value="${p.id}">${p.name} (${p.type})</option>`).join('')}
                     </select>
                </div>
                <div>
                    <label class="block text-[10px] font-bold text-gray-400 uppercase mb-1">Departemen</label>
                     <select id="mj_dept" class="w-full border-2 border-gray-100 rounded-lg p-2.5 text-sm">
                        <option value="">- Umum -</option>
                        ${depts.map(d => `<option value="${d.id}">${d.name}</option>`).join('')}
                     </select>
                </div>
            </div>

            <div class="border-t pt-4">
                <table class="w-full text-left">
                    <thead>
                        <tr class="text-[10px] font-bold text-gray-400 uppercase border-b pb-2">
                            <th class="pb-2">Akun Keuangan</th>
                            <th class="pb-2 text-right w-32">Debit</th>
                            <th class="pb-2 text-right w-32">Kredit</th>
                            <th class="pb-2 w-10"></th>
                        </tr>
                    </thead>
                    <tbody id="mj_rows">
                        <!-- Rows will be added here -->
                    </tbody>
                    <tfoot>
                        <tr class="border-t">
                            <td class="py-4">
                                <button onclick="addJournalRow()" class="text-xs font-bold text-blue-600 hover:underline"><i class="fas fa-plus mr-1"></i> Tambah Baris</button>
                            </td>
                            <td class="py-4 text-right font-bold text-sm" id="mj_total_debit">0</td>
                            <td class="py-4 text-right font-bold text-sm" id="mj_total_credit">0</td>
                            <td></td>
                        </tr>
                    </tfoot>
                </table>
                <div id="mj_balance_warning" class="hidden mt-2 p-2 bg-red-50 text-red-600 text-[10px] font-bold text-center rounded-lg">
                    TOTAL DEBIT DAN KREDIT HARUS SEIMBANG (BALANCE)
                </div>
            </div>
        </div>
    `;

    const footer = `
        <button onclick="saveManualJournal()" class="px-6 py-2 bg-blue-600 text-white rounded-lg text-sm font-bold shadow-md hover:bg-blue-700 transition-colors">Posting Jurnal</button>
        <button onclick="closeModal()" class="px-4 py-2 bg-gray-100 text-gray-600 rounded-lg text-sm font-bold mr-2">Batal</button>
    `;

    showModal('Entri Jurnal Umum (Manual)', body, footer, 'full');
    
    // Add two initial rows
    addJournalRow();
    addJournalRow();
};

window.addJournalRow = function() {
    const accs = db.read('accounts').filter(a => a.status === 'ACTIVE');
    const tbody = document.getElementById('mj_rows');
    const row = document.createElement('tr');
    row.className = 'border-b border-gray-50 mj-item-row';
    row.innerHTML = `
        <td class="py-2">
            <select class="w-full border-none focus:ring-0 p-1 text-sm font-bold text-gray-700 mj-acc-select">
                <option value="" disabled selected>Pilih Akun...</option>
                ${accs.map(a => `<option value="${a.id}">${a.code} - ${a.name}</option>`).join('')}
            </select>
        </td>
        <td class="py-2">
            <input type="number" class="w-full border-none focus:ring-0 text-right p-1 text-sm font-bold mj-debit" value="0" oninput="updateJournalTotals()">
        </td>
        <td class="py-2">
            <input type="number" class="w-full border-none focus:ring-0 text-right p-1 text-sm font-bold mj-credit" value="0" oninput="updateJournalTotals()">
        </td>
        <td class="py-2 text-center text-gray-300 hover:text-red-500 cursor-pointer" onclick="this.parentElement.remove(); updateJournalTotals()">
            <i class="fas fa-times-circle"></i>
        </td>
    `;
    tbody.appendChild(row);
};

window.updateJournalTotals = function() {
    let totalDebit = 0;
    let totalCredit = 0;
    
    document.querySelectorAll('.mj-debit').forEach(el => totalDebit += parseFloat(el.value || 0));
    document.querySelectorAll('.mj-credit').forEach(el => totalCredit += parseFloat(el.value || 0));
    
    document.getElementById('mj_total_debit').innerText = formatCurrency(totalDebit).replace('Rp ', '').trim();
    document.getElementById('mj_total_credit').innerText = formatCurrency(totalCredit).replace('Rp ', '').trim();
    
    const warning = document.getElementById('mj_balance_warning');
    if (Math.abs(totalDebit - totalCredit) > 0.01) {
        warning.classList.remove('hidden');
    } else {
        warning.classList.add('hidden');
    }
};

window.saveManualJournal = function() {
    const date = document.getElementById('mj_date').value;
    const desc = document.getElementById('mj_desc').value;
    const deptId = document.getElementById('mj_dept').value;
    const partnerId = document.getElementById('mj_partner').value;
    
    // Find partner name if exists
    let partnerName = '';
    if (partnerId) {
        const cust = db.findById('customers', partnerId);
        const supp = db.findById('suppliers', partnerId);
        partnerName = cust ? cust.name : (supp ? supp.name : '');
    }

    const items = [];
    document.querySelectorAll('.mj-item-row').forEach(row => {
        const accId = row.querySelector('.mj-acc-select').value;
        const debit = parseFloat(row.querySelector('.mj-debit').value || 0);
        const credit = parseFloat(row.querySelector('.mj-credit').value || 0);
        
        if (accId && (debit > 0 || credit > 0)) {
            items.push({ accountId: accId, debit, credit });
        }
    });

    if (!desc) return alert('Keterangan jurnal harus diisi');
    if (items.length < 2) return alert('Minimal harus ada 2 akun (Debit & Kredit)');
    
    const totalDebit = items.reduce((s, i) => s + i.debit, 0);
    const totalCredit = items.reduce((s, i) => s + i.credit, 0);
    
    if (Math.abs(totalDebit - totalCredit) > 0.1) {
        return alert('Total Debit dan Kredit tidak seimbang!');
    }

    db.addJournalEntry({
        date,
        description: desc,
        items,
        referenceType: 'MANUAL',
        departmentId: deptId,
        // Custom fields injected into the record
        partnerId,
        partnerName
    });

    closeModal();
    showToast('Jurnal berhasil diposting');
    renderFinanceJournal();
};

// --- Buku Besar Mitra (Partner Ledger) ---
window.renderFinancePartnerLedger = function () {
    document.getElementById('pageTitle').innerText = 'Buku Besar Mitra (Partner Ledger)';
    const mc = document.getElementById('main-content');
    
    // Use year 2026 as per screenshot or current
    const currentYear = new Date().getFullYear();
    const targetYear = 2026; // Match screenshot requirement
    
    const customers = db.read('customers');
    const suppliers = db.read('suppliers');
    const partners = [...customers, ...suppliers];
    const journalEntries = db.read('journalEntries');

    // Aggregate ledger by partner
    const ledgerData = partners.map(p => {
        // Filter journals linked to this partner
        // 1. Explicitly linked via partnerId (newly created journals)
        // 2. Referenced via reference records (SALES_INVOICE, PURCHASE_INVOICE)
        const entries = journalEntries.filter(j => {
            const isTargetYear = new Date(j.date).getFullYear() === targetYear;
            if (!isTargetYear) return false;

            if (j.partnerId === p.id) return true;
            
            // Heuristic for older/automated journals
            if (j.referenceType === 'SALES_INVOICE') {
                const inv = db.findById('salesInvoices', j.referenceId);
                if (inv && inv.customerId === p.id) return true;
            }
            if (j.referenceType === 'PURCHASE_INVOICE') {
                const inv = db.findById('purchaseInvoices', j.referenceId);
                if (inv && inv.supplierId === p.id) return true;
            }
            if (j.referenceType === 'PAYMENT') {
                const pay = db.findById('payments', j.referenceId);
                if (pay) {
                    const inv = db.findById('salesInvoices', pay.invoiceId);
                    if (inv && inv.customerId === p.id) return true;
                }
            }
            if (j.referenceType === 'EXPENSE') {
                 // Expense might not be linked to customer/supplier partner table unless defined
            }
            
            return false;
        });

        // Debit/Credit related to AR/AP accounts usually define the balance for partner
        // But the user screenshot shows total debit/credit per partner across all their entries
        let totalDebit = 0;
        let totalCredit = 0;

        entries.forEach(j => {
            totalDebit += parseFloat(j.totalDebit) || 0;
            totalCredit += parseFloat(j.totalCredit) || 0;
        });

        return {
            id: p.id,
            name: p.name,
            totalDebit,
            totalCredit,
            balance: totalDebit - totalCredit
        };
    }).filter(l => l.totalDebit !== 0 || l.totalCredit !== 0);

    const grandTotals = ledgerData.reduce((t, l) => {
        t.debit += l.totalDebit;
        t.credit += l.totalCredit;
        t.balance += l.balance;
        return t;
    }, { debit: 0, credit: 0, balance: 0 });

    mc.innerHTML = `
        <div class="flex justify-end mb-4">
             <button onclick="printFinanceReport()" class="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-bold shadow-md hover:bg-blue-700 transition-all">
                <i class="fas fa-print mr-2"></i> Print Laporan
            </button>
        </div>

        <div class="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden printable-area p-8 font-sans max-w-6xl mx-auto">
            <div class="flex justify-between items-start mb-12">
                <div class="text-xs text-gray-500 leading-relaxed text-slate-400">
                    <h2 class="text-sm font-bold text-gray-800 mb-1">PT Tana Subur Nusantara</h2>
                    <p>Jl. Akses Tol Karawang Tim., Anggadita, Kec. Klari</p>
                    <p>Karawang JB 41371</p>
                    <p>Indonesia</p>
                    <p class="font-bold mt-2">NPWP:</p>
                </div>
                <div class="text-right">
                    <h1 class="text-2xl font-bold text-gray-800">Buku Besar Mitra</h1>
                </div>
            </div>

            <div class="mb-2">
                <table class="w-full text-left border-collapse">
                    <thead class="bg-gray-100/50">
                        <tr>
                            <th class="px-4 py-2 text-center text-[10px] font-bold text-gray-700 border-b border-gray-200" colspan="8">
                                ${targetYear}
                            </th>
                        </tr>
                        <tr class="text-[10px] uppercase tracking-wider font-bold text-gray-800">
                            <th class="px-4 py-3 border-b border-gray-200">Jurnal</th>
                            <th class="px-4 py-3 border-b border-gray-200">Akun</th>
                            <th class="px-4 py-3 border-b border-gray-200">Tanggal Faktur</th>
                            <th class="px-4 py-3 border-b border-gray-200">Batas Waktu</th>
                            <th class="px-4 py-3 border-b border-gray-200">Sesuai</th>
                            <th class="px-4 py-3 border-b border-gray-200 text-right">Debit</th>
                            <th class="px-4 py-3 border-b border-gray-200 text-right">Kredit</th>
                            <th class="px-4 py-3 border-b border-gray-200 text-right">Saldo</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${ledgerData.map(l => `
                            <tr class="border-b border-gray-50 text-[11px]">
                                <td class="px-4 py-4 font-bold text-gray-700" colspan="5">${l.name}</td>
                                <td class="px-4 py-4 text-right font-mono text-gray-700 font-bold">${formatCurrency(l.totalDebit).replace('Rp ', '').trim()}</td>
                                <td class="px-4 py-4 text-right font-mono text-gray-300">${l.totalCredit > 0 ? formatCurrency(l.totalCredit).replace('Rp ', '').trim() : '0'}</td>
                                <td class="px-4 py-4 text-right font-mono text-gray-800 font-bold">${formatCurrency(l.balance).replace('Rp ', '').trim()}</td>
                            </tr>
                        `).join('') || '<tr><td colspan="8" class="px-4 py-12 text-center text-gray-400 italic">Tidak ada transaksi mitra untuk tahun ini.</td></tr>'}
                        
                        <tr class="border-t-2 border-gray-200 font-bold text-xs text-gray-800">
                            <td class="px-4 py-4" colspan="5">Total</td>
                            <td class="px-4 py-4 text-right font-mono">${formatCurrency(grandTotals.debit).replace('Rp ', '').trim()}</td>
                            <td class="px-4 py-4 text-right font-mono">${formatCurrency(grandTotals.credit).replace('Rp ', '').trim()}</td>
                            <td class="px-4 py-4 text-right font-mono">${formatCurrency(grandTotals.balance).replace('Rp ', '').trim()}</td>
                        </tr>
                    </tbody>
                </table>
            </div>
        </div>
    `;
};

window.renderFinanceAR = function () {
    document.getElementById('pageTitle').innerText = 'Data Piutang (AR)';
    const mc = document.getElementById('main-content');
    const activeTab = window._uiState.arActiveTab;

    let contentHtml = '';

    if (activeTab === 'unpaid') {
        const filterCust = (window._arFilters?.customer || '').toLowerCase();
        const filterDate = window._arFilters?.date || '';

        let invoices = db.read('salesInvoices').filter(i => i.status === 'UNPAID' || i.status === 'PARTIAL');
        if (filterCust) {
            invoices = invoices.filter(i => {
                const cName = (i.customerName || db.findById('customers', i.customerId)?.name || '').toLowerCase();
                return cName.includes(filterCust);
            });
        }
        if (filterDate) {
            invoices = invoices.filter(i => i.date && i.date.startsWith(filterDate));
        }

        const allPayments = db.read('payments');
        const totalAR = invoices.reduce((sum, i) => {
            const paid = allPayments.filter(p => p.invoiceId === i.id).reduce((s, p) => s + (parseFloat(p.amount) || 0), 0);
            return sum + (parseFloat(i.totalAmount) - paid);
        }, 0);

        contentHtml = `
            <!-- Filter Section (Unpaid) -->
            <div class="bg-white rounded-xl shadow-sm border border-slate-100 mb-6 overflow-hidden">
                <div onclick="toggleARFilter()" class="flex items-center justify-between p-4 cursor-pointer hover:bg-slate-50 transition-colors select-none">
                    <h3 class="text-[10px] font-black text-slate-800 uppercase tracking-[0.2em] flex items-center gap-3">
                        <i class="fas fa-filter text-blue-600"></i> FILTER PENCARIAN
                        ${(filterCust || filterDate) ? `<span class="ml-2 px-2 py-0.5 bg-blue-50 text-blue-600 rounded-full text-[9px] font-bold">Filter Aktif</span>` : ''}
                    </h3>
                    <div class="flex items-center gap-3">
                        <span class="text-[9px] font-bold text-slate-400 uppercase tracking-widest">${window._uiState.arFilterOpen ? 'Sembunyikan' : 'Tampilkan'}</span>
                        <i class="fas fa-chevron-${window._uiState.arFilterOpen ? 'up' : 'down'} text-slate-300 text-xs"></i>
                    </div>
                </div>
                <div class="${window._uiState.arFilterOpen ? 'block' : 'hidden'} p-5 border-t border-slate-50 animate-in slide-in-from-top-2 duration-200">
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-4 items-end">
                        <div class="space-y-1.5">
                            <label class="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Nama Customer</label>
                            <input type="text" id="arFilterCustomer" value="${window._arFilters?.customer || ''}" placeholder="Cari Nama Customer..." class="w-full border-2 border-slate-100 rounded-lg px-3 py-2 text-sm font-bold text-slate-700 focus:border-blue-500 outline-none transition-all bg-slate-50/50">
                        </div>
                        <div class="space-y-1.5">
                            <label class="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Bulan Faktur</label>
                            <input type="month" id="arFilterDate" value="${window._arFilters?.date || ''}" class="w-full border-2 border-slate-100 rounded-lg px-3 py-2 text-sm font-bold text-slate-700 focus:border-blue-500 outline-none transition-all bg-slate-50/50">
                        </div>
                    </div>
                    <div class="flex gap-2 pt-4 mt-4 border-t border-slate-50">
                        <button onclick="updateARFilters()" class="bg-blue-600 hover:bg-slate-900 text-white px-8 py-2.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all shadow-lg active:scale-95">TAMPILKAN DATA</button>
                        <button onclick="document.getElementById('arFilterCustomer').value=''; document.getElementById('arFilterDate').value=''; updateARFilters()" class="bg-slate-50 hover:bg-slate-100 text-slate-400 px-5 py-2.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all">RESET</button>
                    </div>
                </div>
            </div>

            <div class="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                <div class="p-4 border-b border-gray-100 bg-gray-50/50 flex justify-between items-center flex-wrap gap-4">
                    <div>
                        <h3 class="font-bold text-gray-700">Daftar Faktur Penjualan Belum Lunas</h3>
                        <p class="text-xs text-gray-500">Total piutang aktif: <span class="font-bold text-orange-600">${formatCurrency(totalAR)}</span></p>
                    </div>
                    <button onclick="openFinanceARPaymentModal()" class="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-bold shadow-sm hover:bg-blue-700 transition-colors">
                        <i class="fas fa-plus mr-1"></i> Input Pelunasan
                    </button>
                </div>
                <div class="overflow-x-auto">
                    <table class="w-full text-left border-collapse">
                        <thead class="bg-gray-50 text-slate-500 text-[11px] uppercase tracking-wider font-semibold">
                            <tr>
                                <th class="px-6 py-3 border-b border-gray-100">Faktur</th>
                                <th class="px-6 py-3 border-b border-gray-100">Customer</th>
                                <th class="px-6 py-3 border-b border-gray-100">Jatuh Tempo</th>
                                <th class="px-6 py-3 border-b border-gray-100 text-right">Sisa Piutang</th>
                                <th class="px-6 py-3 border-b border-gray-100">Status</th>
                            </tr>
                        </thead>
                        <tbody class="text-sm divide-y divide-gray-100">
                            ${invoices.map(i => {
                                const paid = allPayments.filter(p => p.invoiceId === i.id).reduce((s, p) => s + (parseFloat(p.amount) || 0), 0);
                                return `
                                <tr>
                                    <td class="px-6 py-4">
                                        <div class="font-bold text-gray-800">${i.invoiceNumber}</div>
                                        <div class="text-[10px] text-gray-400">${formatDate(i.date).slice(0, 10)}</div>
                                    </td>
                                    <td class="px-6 py-4 text-gray-700 font-medium">${i.customerName || db.findById('customers', i.customerId)?.name || 'Unknown'}</td>
                                    <td class="px-6 py-4 text-gray-600">${i.dueDate || '-'}</td>
                                    <td class="px-6 py-4 text-right font-bold text-blue-600">${formatCurrency(i.totalAmount - paid)}</td>
                                    <td class="px-6 py-4">
                                        <span class="px-2 py-1 ${i.status === 'PARTIAL' ? 'bg-orange-100 text-orange-700' : 'bg-red-100 text-red-700'} rounded-full text-[10px] font-bold">${i.status}</span>
                                    </td>
                                </tr>
                            `}).join('') || '<tr><td colspan="5" class="px-6 py-12 text-center text-gray-400">Tidak ada piutang aktif.</td></tr>'}
                        </tbody>
                    </table>
                </div>
            </div>
        `;
    } else {
        // Riwayat Tab
        const f = window._arHistoryFilters;
        const filterCust = (f.customer || '').toLowerCase();
        const filterDate = f.date || '';
        const filterMethod = f.method || '';

        let payments = db.read('payments').sort((a, b) => new Date(b.date) - new Date(a.date));
        if (filterCust) {
            payments = payments.filter(p => {
                const inv = db.findById('salesInvoices', p.invoiceId);
                const cust = db.findById('customers', inv?.customerId);
                return (cust?.name || '').toLowerCase().includes(filterCust);
            });
        }
        if (filterDate) payments = payments.filter(p => p.date && p.date.startsWith(filterDate));
        if (filterMethod) payments = payments.filter(p => p.method === filterMethod);

        contentHtml = `
            <!-- Filter Section (History) -->
            <div class="bg-white rounded-xl shadow-sm border border-slate-100 mb-6 overflow-hidden">
                <div onclick="toggleARHistFilter()" class="flex items-center justify-between p-4 cursor-pointer hover:bg-slate-50 transition-colors select-none">
                    <h3 class="text-[10px] font-black text-slate-800 uppercase tracking-[0.2em] flex items-center gap-3">
                        <i class="fas fa-filter text-blue-600"></i> FILTER RIWAYAT
                        ${(filterCust || filterDate || filterMethod) ? `<span class="ml-2 px-2 py-0.5 bg-blue-50 text-blue-600 rounded-full text-[9px] font-bold">Filter Aktif</span>` : ''}
                    </h3>
                    <div class="flex items-center gap-3">
                        <span class="text-[9px] font-bold text-slate-400 uppercase tracking-widest">${window._uiState.arHistFilterOpen ? 'Sembunyikan' : 'Tampilkan'}</span>
                        <i class="fas fa-chevron-${window._uiState.arHistFilterOpen ? 'up' : 'down'} text-slate-300 text-xs"></i>
                    </div>
                </div>
                <div class="${window._uiState.arHistFilterOpen ? 'block' : 'hidden'} p-5 border-t border-slate-50 animate-in slide-in-from-top-2 duration-200">
                    <div class="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
                        <div class="space-y-1.5">
                            <label class="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Nama Customer</label>
                            <input type="text" id="arHistFilterCustomer" value="${f.customer}" placeholder="Cari Nama..." class="w-full border-2 border-slate-100 rounded-lg px-3 py-2 text-sm font-bold text-slate-700 bg-slate-50/50">
                        </div>
                        <div class="space-y-1.5">
                            <label class="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Bulan Pembayaran</label>
                            <input type="month" id="arHistFilterDate" value="${f.date}" class="w-full border-2 border-slate-100 rounded-lg px-3 py-2 text-sm font-bold text-slate-700 bg-slate-50/50">
                        </div>
                        <div class="space-y-1.5">
                            <label class="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Metode</label>
                            <select id="arHistFilterMethod" class="w-full border-2 border-slate-100 rounded-lg px-3 py-2 text-sm font-bold text-slate-700 bg-slate-50/50">
                                <option value="">Semua Metode</option>
                                <option value="Transfer Bank" ${f.method === 'Transfer Bank' ? 'selected' : ''}>Transfer Bank</option>
                                <option value="Tunai" ${f.method === 'Tunai' ? 'selected' : ''}>Tunai / Cash</option>
                            </select>
                        </div>
                    </div>
                    <div class="flex gap-2 pt-4 mt-4 border-t border-slate-50">
                        <button onclick="applyARHistFilters()" class="bg-blue-600 hover:bg-slate-900 text-white px-8 py-2.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all">TAMPILKAN</button>
                        <button onclick="resetARHistoryFilters()" class="bg-slate-50 hover:bg-slate-100 text-slate-400 px-5 py-2.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all">RESET</button>
                    </div>
                </div>
            </div>

            <div class="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                <div class="p-4 border-b border-gray-100 bg-slate-50/50">
                    <h3 class="font-bold text-gray-700">Riwayat Penerimaan Pembayaran</h3>
                </div>
                <div class="overflow-x-auto">
                    <table class="w-full text-left border-collapse">
                        <thead class="bg-gray-50 text-slate-500 text-[11px] uppercase tracking-wider font-semibold">
                            <tr>
                                <th class="px-6 py-3 border-b border-gray-100">Tgl & Ref</th>
                                <th class="px-6 py-3 border-b border-gray-100">Faktur</th>
                                <th class="px-6 py-3 border-b border-gray-100">Customer</th>
                                <th class="px-6 py-3 border-b border-gray-100 text-right">Jumlah</th>
                            </tr>
                        </thead>
                        <tbody class="text-sm divide-y divide-gray-100">
                            ${payments.map(p => {
                                const inv = db.findById('salesInvoices', p.invoiceId) || { invoiceNumber: '-', customerId: null };
                                const cust = db.findById('customers', inv.customerId) || { name: '-' };
                                return `
                                <tr>
                                    <td class="px-6 py-4">
                                        <div class="text-[10px] text-gray-400 font-bold">${formatDate(p.date).slice(0, 10)}</div>
                                        <div class="font-bold text-gray-800">${p.paymentNumber}</div>
                                    </td>
                                    <td class="px-6 py-4 text-gray-600 font-medium">${inv.invoiceNumber}</td>
                                    <td class="px-6 py-4 text-gray-600">${cust.name}</td>
                                    <td class="px-6 py-4 text-right font-bold text-blue-600">${formatCurrency(p.amount)}</td>
                                </tr>
                            `}).join('') || '<tr><td colspan="4" class="px-6 py-12 text-center text-gray-400">Belum ada riwayat.</td></tr>'}
                        </tbody>
                    </table>
                </div>
            </div>
        `;
    }

    mc.innerHTML = `
        <div class="space-y-6">
            <!-- Tab Navigation -->
            <div class="flex items-center gap-8 border-b border-slate-200 mb-6 px-2">
                <button onclick="window._uiState.arActiveTab='unpaid'; renderFinanceAR()" 
                    class="pb-4 text-sm font-bold transition-all relative ${activeTab === 'unpaid' ? 'text-blue-600' : 'text-slate-400 hover:text-slate-600'}">
                    Antrean Piutang
                    ${activeTab === 'unpaid' ? '<div class="absolute -bottom-[1px] left-0 w-full h-[3px] bg-blue-600 rounded-full shadow-[0_2px_10px_rgba(37,99,235,0.3)]"></div>' : ''}
                </button>
                <button onclick="window._uiState.arActiveTab='history'; renderFinanceAR()" 
                    class="pb-4 text-sm font-bold transition-all relative ${activeTab === 'history' ? 'text-blue-600' : 'text-slate-400 hover:text-slate-600'}">
                    Riwayat Penerimaan
                    ${activeTab === 'history' ? '<div class="absolute -bottom-[1px] left-0 w-full h-[3px] bg-blue-600 rounded-full shadow-[0_2px_10px_rgba(37,99,235,0.3)]"></div>' : ''}
                </button>
            </div>

            ${contentHtml}
        </div>
    `;
};

window.updateARFilters = function() {
    window._arFilters = {
        customer: document.getElementById('arFilterCustomer')?.value || '',
        date: document.getElementById('arFilterDate')?.value || ''
    };
    renderFinanceAR();
};

window.toggleARFilter = function() {
    window._uiState.arFilterOpen = !window._uiState.arFilterOpen;
    renderFinanceAR();
};

window.toggleARHistFilter = function() {
    window._uiState.arHistFilterOpen = !window._uiState.arHistFilterOpen;
    renderFinanceAR();
};

window.applyARHistFilters = function() {
    window._arHistoryFilters = {
        customer: document.getElementById('arHistFilterCustomer').value,
        date: document.getElementById('arHistFilterDate').value,
        method: document.getElementById('arHistFilterMethod').value
    };
    renderFinanceAR();
};

window.resetARHistoryFilters = function() {
    window._arHistoryFilters = { customer: '', date: '', method: '' };
    renderFinanceAR();
};

// --- Finance AR Payment Feature ---
window.openFinanceARPaymentModal = () => {
    const invoices = db.read('salesInvoices');
    const payments = db.read('payments');
    const customers = db.read('customers');
    const assetAccounts = db.read('accounts').filter(a => a.type === 'ASSET' && a.code.startsWith('11'));

    const unpaidInvoices = invoices.filter(inv => inv.status === 'UNPAID' || inv.status === 'PARTIAL');
    if (unpaidInvoices.length === 0) {
        showToast('Tidak ada invoice piutang yang belum dibayar.', 'error');
        return;
    }

    // Build unique customer list from unpaid invoices only
    const customerIdsWithUnpaid = [...new Set(unpaidInvoices.map(inv => inv.customerId))];
    const custOptions = customerIdsWithUnpaid.map(cId => {
        const c = customers.find(x => x.id === cId) || { name: 'Unknown' };
        return `<option value="${cId}">${c.name}</option>`;
    }).join('');

    const body = `
        <div class="space-y-4">
            <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">Pilih Customer</label>
                <select id="far_customer_id" class="w-full border border-gray-300 rounded px-3 py-2 bg-white" onchange="updateARInvoicesByCustomer()">
                    <option value="" disabled selected>Pilih Customer...</option>
                    ${custOptions}
                </select>
            </div>
            <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">Pilih Faktur Piutang (AR)</label>
                <select id="far_invoice_id" class="w-full border border-gray-300 rounded px-3 py-2 bg-white" onchange="updateFinanceARPaymentDefaultAmount()" disabled>
                    <option value="" disabled selected>-- Pilih Customer terlebih dahulu --</option>
                </select>
            </div>
            <div class="grid grid-cols-2 gap-4">
                <div>
                    <label class="block text-sm font-medium text-gray-700 mb-1">Tanggal Terima</label>
                    <input type="date" id="far_date" value="${new Date().toISOString().split('T')[0]}" class="w-full border border-gray-300 rounded px-3 py-2 bg-white">
                </div>
                <div>
                    <label class="block text-sm font-medium text-gray-700 mb-1">Masuk ke Kas/Bank</label>
                    <select id="far_account_id" class="w-full border border-gray-300 rounded px-3 py-2 bg-white">
                        ${assetAccounts.map(a => `<option value="${a.id}">${a.name} (${a.code})</option>`).join('')}
                    </select>
                </div>
            </div>
            <div class="grid grid-cols-2 gap-4">
                <div>
                    <label class="block text-sm font-medium text-gray-700 mb-1">Metode</label>
                    <select id="far_method" class="w-full border border-gray-300 rounded px-3 py-2 bg-white">
                        <option value="Transfer Bank">Transfer Bank</option>
                        <option value="Tunai">Tunai / Cash</option>
                        <option value="Giro/Cek">Giro / Cek</option>
                    </select>
                </div>
                <!-- Empty div for alignment if wanted, or we put something else here -->
                <div class="hidden sm:block"></div>
            </div>
            <div class="grid grid-cols-2 gap-4">
                <div>
                    <label class="block text-sm font-medium text-gray-700 mb-1" title="Sesuai sisa piutang faktur">Alokasi Piutang (Rp)</label>
                    <input type="number" id="far_amount" placeholder="0" class="w-full border border-gray-300 rounded px-3 py-2 text-lg font-bold text-blue-600">
                </div>
                <div>
                    <label class="block text-sm font-medium text-gray-700 mb-1" title="Input jika ada kelebihan nominal transfer">Uang Lebih Titipan (Rp)</label>
                    <input type="number" id="far_overpay" placeholder="0" value="0" class="w-full border border-gray-300 rounded px-3 py-2 text-lg font-bold text-green-600">
                </div>
            </div>
            <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">Catatan</label>
                <textarea id="far_notes" placeholder="Catatan tambahan..." rows="2" class="w-full border border-gray-300 rounded px-3 py-2 text-sm"></textarea>
            </div>
            <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">Upload Bukti Pembayaran <span class="text-xs text-gray-400 font-normal">(Opsional)</span></label>
                <input type="file" id="far_proof_file" accept="image/*,application/pdf" class="w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 border border-slate-300 rounded bg-white">
            </div>
        </div>
    `;

    const footer = `
        <button type="button" onclick="saveFinanceARPayment()" class="w-full sm:w-auto justify-center rounded-md bg-green-600 px-4 py-2 text-white font-medium hover:bg-green-700 text-sm shadow-sm transition-colors">Proses Pelunasan</button>
        <button type="button" onclick="closeModal()" class="mt-3 w-full sm:w-auto justify-center rounded-md border border-gray-300 bg-white px-4 py-2 text-gray-700 font-medium hover:bg-gray-50 text-sm transition-colors">Batal</button>
    `;

    showModal('Input Pelunasan Piutang (AR)', body, footer, 'full');
};

window.updateARInvoicesByCustomer = () => {
    const customerId = document.getElementById('far_customer_id').value;
    const invoiceSelect = document.getElementById('far_invoice_id');
    const amountInput = document.getElementById('far_amount');

    if (!customerId) {
        invoiceSelect.innerHTML = '<option value="" disabled selected>-- Pilih Customer terlebih dahulu --</option>';
        invoiceSelect.disabled = true;
        if (amountInput) amountInput.value = '0';
        return;
    }

    const invoices = db.read('salesInvoices').filter(inv => (inv.status === 'UNPAID' || inv.status === 'PARTIAL') && inv.customerId === customerId);
    const payments = db.read('payments');

    if (invoices.length === 0) {
        invoiceSelect.innerHTML = '<option value="" disabled selected>Tidak ada faktur UNPAID untuk customer ini</option>';
        invoiceSelect.disabled = true;
        if (amountInput) amountInput.value = '0';
        return;
    }

    const options = invoices.map(inv => {
        const invPayments = payments.filter(p => p.invoiceId === inv.id);
        const totalPaid = invPayments.reduce((sum, p) => sum + parseFloat(p.amount), 0);
        const balance = inv.totalAmount - totalPaid;
        return `<option value="${inv.id}" data-balance="${balance}">${inv.invoiceNumber} (Sisa: ${formatCurrency(balance)})</option>`;
    }).join('');

    invoiceSelect.innerHTML = '<option value="" disabled selected>Pilih Invoice...</option>' + options;
    invoiceSelect.disabled = false;
    if (amountInput) amountInput.value = '0';
};

window.updateFinanceARPaymentDefaultAmount = () => {
    const select = document.getElementById('far_invoice_id');
    if (select && select.selectedIndex > 0) {
        const balance = select.options[select.selectedIndex].dataset.balance;
        document.getElementById('far_amount').value = balance;
    }
};

window.saveFinanceARPayment = async () => {
    const invoiceId = document.getElementById('far_invoice_id').value;
    const dateInput = document.getElementById('far_date').value;
    const accountId = document.getElementById('far_account_id').value;
    const method = document.getElementById('far_method').value;
    const inputAmount = parseFloat(document.getElementById('far_amount').value);
    const overpayAmount = parseFloat(document.getElementById('far_overpay').value) || 0;
    const fileInput = document.getElementById('far_proof_file');
    const notes = document.getElementById('far_notes').value.trim();

    if (!invoiceId) { showToast('Pilih invoice terlebih dahulu', 'error'); return; }
    if (!accountId) { showToast('Pilih akun Kas/Bank', 'error'); return; }
    if (!inputAmount || inputAmount <= 0) { showToast('Jumlah pelunasan tidak valid', 'error'); return; }
    if (overpayAmount < 0) { showToast('Uang lebih tidak boleh negatif', 'error'); return; }

    const inv = db.findById('salesInvoices', invoiceId);
    if (!inv) return;

    let attachmentData = null;
    if (fileInput && fileInput.files.length > 0) {
        const file = fileInput.files[0];
        if (file.size > 2 * 1024 * 1024) { showToast('Ukuran file maksimal 2MB', 'error'); return; }
        attachmentData = await new Promise((resolve) => {
            const reader = new FileReader();
            reader.onload = (e) => resolve(e.target.result);
            reader.readAsDataURL(file);
        });
    }

    const paymentsDb = db.read('payments');
    const invPayments = paymentsDb.filter(p => p.invoiceId === inv.id);
    const totalPaid = invPayments.reduce((sum, p) => sum + parseFloat(p.amount), 0);
    const balance = inv.totalAmount - totalPaid;

    if (inputAmount > balance + 1) { // precision buffer
        showToast(`Jumlah bayar melebihi sisa piutang (${formatCurrency(balance)})`, 'error');
        return;
    }

    const payNumSequence = (paymentsDb.length + 1).toString().padStart(3, '0');
    const month = new Date(dateInput).getMonth() + 1;
    const year = new Date(dateInput).getFullYear();
    const paymentNumber = `PAY-${payNumSequence}/${romanize(month)}/${year}`;

    const payRecord = db.insert('payments', {
        paymentNumber,
        invoiceId: inv.id,
        date: new Date(dateInput).toISOString(),
        amount: inputAmount,
        overpayAmount: overpayAmount, // Track kelebihan bayar
        method,
        proofReference: attachmentData,
        notes,
        status: 'COMPLETED',
        createdAt: new Date().toISOString()
    });

    const newTotalPaid = totalPaid + inputAmount;
    if (newTotalPaid >= inv.totalAmount - 1) {
        db.update('salesInvoices', inv.id, { status: 'PAID' });
    } else {
        db.update('salesInvoices', inv.id, { status: 'PARTIAL' });
    }

    if (typeof db.addJournalEntry === 'function') {
        const journalItems = [
            { accountId: accountId, debit: inputAmount + overpayAmount, credit: 0 },
            { accountId: 'acc_ar', debit: 0, credit: inputAmount }
        ];

        if (overpayAmount > 0) {
            journalItems.push({ accountId: 'acc_ar_overpay', debit: 0, credit: overpayAmount });
        }

        db.addJournalEntry({
            date: new Date(dateInput).toISOString(),
            journalNo: paymentNumber,
            description: `Pelunasan Piutang (AR) ${inv.invoiceNumber} via ${method}` + (overpayAmount > 0 ? ` (+Uang Lebih ${formatCurrency(overpayAmount)})` : ''),
            items: journalItems
        });
    }

    showToast('Pelunasan piutang berhasil dicatat', 'success');
    closeModal();
    renderFinanceAR();
};

window._apFilters = window._apFilters || { status: 'BELUM_LUNAS', supplierId: '', startDate: '', endDate: '' };

window.applyAPFilters = () => {
    window._apFilters = {
        status: document.getElementById('filter_ap_status').value,
        supplierId: document.getElementById('filter_ap_supplier').value,
        startDate: document.getElementById('filter_ap_start').value,
        endDate: document.getElementById('filter_ap_end').value
    };
    renderFinanceAP();
};

window.resetAPFilters = () => {
    window._apFilters = { status: 'BELUM_LUNAS', supplierId: '', startDate: '', endDate: '' };
    renderFinanceAP();
};

window.renderFinanceAP = function () {
    document.getElementById('pageTitle').innerText = 'Data Hutang (AP)';
    const mc = document.getElementById('main-content');
    const activeTab = window._uiState.apActiveTab;

    let contentHtml = '';

    if (activeTab === 'unpaid') {
        let invoices = db.read('purchaseInvoices') || [];
        const suppliers = db.read('suppliers') || [];

        const f = window._apFilters;
        if (f.status === 'BELUM_LUNAS') {
            invoices = invoices.filter(i => i.status === 'UNPAID' || i.status === 'PARTIAL');
        } else if (f.status) {
            invoices = invoices.filter(i => i.status === f.status);
        }
        if (f.supplierId) invoices = invoices.filter(i => i.supplierId === f.supplierId);
        if (f.startDate) invoices = invoices.filter(i => (i.date || '').substring(0, 10) >= f.startDate);
        if (f.endDate) invoices = invoices.filter(i => (i.date || '').substring(0, 10) <= f.endDate);

        invoices.sort((a, b) => new Date(b.date) - new Date(a.date));

        contentHtml = `
            <!-- Filter Section (Unpaid) -->
            <div class="bg-white rounded-xl shadow-sm border border-slate-100 mb-6 overflow-hidden">
                <div onclick="toggleAPFilter()" class="flex items-center justify-between p-4 cursor-pointer hover:bg-slate-50 transition-colors select-none">
                    <h3 class="text-[10px] font-black text-slate-800 uppercase tracking-[0.2em] flex items-center gap-3">
                        <i class="fas fa-filter text-blue-600"></i> FILTER PENCARIAN
                        ${(f.status || f.supplierId || f.startDate || f.endDate) ? `<span class="ml-2 px-2 py-0.5 bg-blue-50 text-blue-600 rounded-full text-[9px] font-bold">Filter Aktif</span>` : ''}
                    </h3>
                    <div class="flex items-center gap-3">
                        <span class="text-[9px] font-bold text-slate-400 uppercase tracking-widest">${window._uiState.apFilterOpen ? 'Sembunyikan' : 'Tampilkan'}</span>
                        <i class="fas fa-chevron-${window._uiState.apFilterOpen ? 'up' : 'down'} text-slate-300 text-xs"></i>
                    </div>
                </div>
                <div class="${window._uiState.apFilterOpen ? 'block' : 'hidden'} p-5 border-t border-slate-50 animate-in slide-in-from-top-2 duration-200">
                    <div class="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                        <div class="space-y-1.5">
                            <label class="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Status</label>
                            <select id="filter_ap_status" class="w-full border-2 border-slate-100 rounded-lg px-3 py-2 text-sm font-bold text-slate-700 bg-slate-50/50">
                                <option value="BELUM_LUNAS" ${f.status === 'BELUM_LUNAS' ? 'selected' : ''}>Belum Lunas</option>
                                <option value="PAID" ${f.status === 'PAID' ? 'selected' : ''}>Paid</option>
                            </select>
                        </div>
                        <div class="space-y-1.5">
                            <label class="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Supplier</label>
                            <select id="filter_ap_supplier" class="w-full border-2 border-slate-100 rounded-lg px-3 py-2 text-sm font-bold text-slate-700 bg-slate-50/50">
                                <option value="">Semua Supplier</option>
                                ${suppliers.map(s => `<option value="${s.id}" ${f.supplierId === s.id ? 'selected' : ''}>${s.name}</option>`).join('')}
                            </select>
                        </div>
                        <div class="space-y-1.5">
                            <label class="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Dari</label>
                            <input type="date" id="filter_ap_start" value="${f.startDate}" class="w-full border-2 border-slate-100 rounded-lg px-3 py-2 text-sm font-bold text-slate-700 bg-slate-50/50">
                        </div>
                        <div class="space-y-1.5">
                            <label class="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Sampai</label>
                            <input type="date" id="filter_ap_end" value="${f.endDate}" class="w-full border-2 border-slate-100 rounded-lg px-3 py-2 text-sm font-bold text-slate-700 bg-slate-50/50">
                        </div>
                    </div>
                    <div class="flex gap-2 pt-4 mt-4 border-t border-slate-50">
                        <button onclick="applyAPFilters()" class="bg-blue-600 hover:bg-slate-900 text-white px-8 py-2.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all">TAMPILKAN DATA</button>
                        <button onclick="resetAPFilters()" class="bg-slate-50 hover:bg-slate-100 text-slate-400 px-5 py-2.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all">RESET</button>
                    </div>
                </div>
            </div>

            <div class="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                <div class="p-6 border-b border-gray-100 bg-gray-50/50 flex justify-between items-center">
                    <div>
                        <h3 class="font-bold text-gray-700">Daftar Tagihan Supplier</h3>
                        <p class="text-xs text-gray-500">Total hutang aktif: <span class="font-bold text-red-600">${formatCurrency(invoices.reduce((sum, inv) => {
                            const paid = db.read('supplierPayments').filter(p => p.invoiceId === inv.id).reduce((s, p) => s + (parseFloat(p.amount) || 0), 0);
                            return sum + (parseFloat(inv.totalAmount) - paid);
                        }, 0))}</span></p>
                    </div>
                    <button onclick="openFinanceAPPaymentModal()" class="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-bold shadow-sm hover:bg-blue-700 transition-colors">
                        <i class="fas fa-plus mr-1"></i> Input Pelunasan
                    </button>
                </div>
                <div class="overflow-x-auto">
                    <table class="w-full text-left border-collapse">
                        <thead class="bg-gray-50 text-slate-500 text-[11px] uppercase tracking-wider font-semibold">
                            <tr>
                                <th class="px-6 py-3 border-b border-gray-100">Tagihan</th>
                                <th class="px-6 py-3 border-b border-gray-100">Supplier</th>
                                <th class="px-6 py-3 border-b border-gray-100">Jatuh Tempo</th>
                                <th class="px-6 py-3 border-b border-gray-100 text-right">Total</th>
                                <th class="px-6 py-3 border-b border-gray-100 text-center">Status</th>
                            </tr>
                        </thead>
                        <tbody class="text-sm divide-y divide-gray-100">
                            ${invoices.map(i => `
                                <tr>
                                    <td class="px-6 py-4">
                                        <div class="font-bold text-gray-800">${i.invoiceNumber}</div>
                                        <div class="text-[10px] text-gray-400">${formatDate(i.date).slice(0, 10)}</div>
                                    </td>
                                    <td class="px-6 py-4 font-medium text-gray-700">${suppliers.find(s => s.id === i.supplierId || s.name === i.supplierId)?.name || i.supplierId}</td>
                                    <td class="px-6 py-4 text-gray-600">${i.dueDate || '-'}</td>
                                    <td class="px-6 py-4 text-right font-bold text-blue-600">
                                        ${(() => {
                                            const paid = db.read('supplierPayments').filter(p => p.invoiceId === i.id).reduce((s, p) => s + (parseFloat(p.amount) || 0), 0);
                                            return formatCurrency(i.totalAmount - paid);
                                        })()}
                                    </td>
                                    <td class="px-6 py-4 text-center">
                                        <span class="px-3 py-1 ${i.status === 'PAID' ? 'bg-green-50 text-green-700' : (i.status === 'PARTIAL' ? 'bg-orange-50 text-orange-700' : 'bg-red-50 text-red-700')} rounded-md text-[10px] font-black tracking-widest border">
                                            ${i.status}
                                        </span>
                                    </td>
                                </tr>
                            `).join('') || '<tr><td colspan="5" class="px-6 py-12 text-center text-gray-400">Tidak ada data.</td></tr>'}
                        </tbody>
                    </table>
                </div>
            </div>
        `;
    } else {
        // Riwayat Tab
        const f = window._apHistoryFilters;
        const filterSuppId = f.supplierId;
        const filterDate = f.date || '';
        const filterMethod = f.method || '';

        let payments = db.read('supplierPayments').sort((a, b) => new Date(b.date) - new Date(a.date));
        const suppliers = db.read('suppliers');
        if (filterSuppId) {
            payments = payments.filter(p => {
                const inv = db.findById('purchaseInvoices', p.invoiceId);
                return (inv && inv.supplierId === filterSuppId);
            });
        }
        if (filterDate) payments = payments.filter(p => p.date && p.date.startsWith(filterDate));
        if (filterMethod) payments = payments.filter(p => p.method === filterMethod);

        contentHtml = `
            <!-- Filter Section (History) -->
            <div class="bg-white rounded-xl shadow-sm border border-slate-100 mb-6 overflow-hidden">
                <div onclick="toggleAPHistFilter()" class="flex items-center justify-between p-4 cursor-pointer hover:bg-slate-50 transition-colors select-none">
                    <h3 class="text-[10px] font-black text-slate-800 uppercase tracking-[0.2em] flex items-center gap-3">
                        <i class="fas fa-filter text-blue-600"></i> FILTER RIWAYAT
                        ${(filterSuppId || filterDate || filterMethod) ? `<span class="ml-2 px-2 py-0.5 bg-blue-50 text-blue-600 rounded-full text-[9px] font-bold">Filter Aktif</span>` : ''}
                    </h3>
                    <div class="flex items-center gap-3">
                        <span class="text-[9px] font-bold text-slate-400 uppercase tracking-widest">${window._uiState.apHistFilterOpen ? 'Sembunyikan' : 'Tampilkan'}</span>
                        <i class="fas fa-chevron-${window._uiState.apHistFilterOpen ? 'up' : 'down'} text-slate-300 text-xs"></i>
                    </div>
                </div>
                <div class="${window._uiState.apHistFilterOpen ? 'block' : 'hidden'} p-5 border-t border-slate-50 animate-in slide-in-from-top-2 duration-200">
                    <div class="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
                        <div class="space-y-1.5">
                            <label class="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Supplier</label>
                            <select id="apHistFilterSupplier" class="w-full border-2 border-slate-100 rounded-lg px-3 py-2 text-sm font-bold text-slate-700 bg-slate-50/50">
                                <option value="">Semua Supplier</option>
                                ${suppliers.map(s => `<option value="${s.id}" ${f.supplierId === s.id ? 'selected' : ''}>${s.name}</option>`).join('')}
                            </select>
                        </div>
                        <div class="space-y-1.5">
                            <label class="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Bulan Pembayaran</label>
                            <input type="month" id="apHistFilterDate" value="${f.date}" class="w-full border-2 border-slate-100 rounded-lg px-3 py-2 text-sm font-bold text-slate-700 bg-slate-50/50">
                        </div>
                        <div class="space-y-1.5">
                            <label class="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Metode</label>
                            <select id="apHistFilterMethod" class="w-full border-2 border-slate-100 rounded-lg px-3 py-2 text-sm font-bold text-slate-700 bg-slate-50/50">
                                <option value="">Semua Metode</option>
                                <option value="Transfer Bank" ${f.method === 'Transfer Bank' ? 'selected' : ''}>Transfer Bank</option>
                                <option value="Tunai" ${f.method === 'Tunai' ? 'selected' : ''}>Tunai / Cash</option>
                            </select>
                        </div>
                    </div>
                    <div class="flex gap-2 pt-4 mt-4 border-t border-slate-50">
                        <button onclick="applyAPHistFilters()" class="bg-blue-600 hover:bg-slate-900 text-white px-8 py-2.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all">TAMPILKAN</button>
                        <button onclick="resetAPHistoryFilters()" class="bg-slate-50 hover:bg-slate-100 text-slate-400 px-5 py-2.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all">RESET</button>
                    </div>
                </div>
            </div>

            <div class="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                <div class="p-4 border-b border-gray-100 bg-slate-50/50">
                    <h3 class="font-bold text-gray-700">Riwayat Pembayaran Supplier</h3>
                </div>
                <div class="overflow-x-auto">
                    <table class="w-full text-left border-collapse">
                        <thead class="bg-gray-50 text-slate-500 text-[11px] uppercase tracking-wider font-semibold">
                            <tr>
                                <th class="px-6 py-3 border-b border-gray-100">Tgl & Ref</th>
                                <th class="px-6 py-3 border-b border-gray-100">Tagihan</th>
                                <th class="px-6 py-3 border-b border-gray-100">Supplier</th>
                                <th class="px-6 py-3 border-b border-gray-100 text-right">Jumlah</th>
                            </tr>
                        </thead>
                        <tbody class="text-sm divide-y divide-gray-100">
                            ${payments.map(p => {
                                const inv = db.findById('purchaseInvoices', p.invoiceId) || { invoiceNumber: '-', supplierId: null };
                                const foundSupp = suppliers.find(s => s.id === inv.supplierId || s.name === inv.supplierId);
                                const suppName = foundSupp ? foundSupp.name : (inv.supplierId || '-');
                                return `
                                <tr>
                                    <td class="px-6 py-4">
                                        <div class="text-[10px] text-gray-400 font-bold">${formatDate(p.date).slice(0, 10)}</div>
                                        <div class="font-bold text-gray-800">${p.paymentNumber}</div>
                                    </td>
                                    <td class="px-6 py-4 text-gray-600 font-medium">${inv.invoiceNumber}</td>
                                    <td class="px-6 py-4 text-gray-600">${suppName}</td>
                                    <td class="px-6 py-4 text-right font-bold text-red-600">${formatCurrency(p.amount)}</td>
                                </tr>
                            `}).join('') || '<tr><td colspan="4" class="px-6 py-12 text-center text-gray-400">Belum ada riwayat.</td></tr>'}
                        </tbody>
                    </table>
                </div>
            </div>
        `;
    }

    mc.innerHTML = `
        <div class="space-y-6">
            <!-- Tab Navigation -->
            <div class="flex items-center gap-8 border-b border-slate-200 mb-6 px-2">
                <button onclick="window._uiState.apActiveTab='unpaid'; renderFinanceAP()" 
                    class="pb-4 text-sm font-bold transition-all relative ${activeTab === 'unpaid' ? 'text-blue-600' : 'text-slate-400 hover:text-slate-600'}">
                    Antrean Hutang
                    ${activeTab === 'unpaid' ? '<div class="absolute -bottom-[1px] left-0 w-full h-[3px] bg-blue-600 rounded-full shadow-[0_2px_10px_rgba(37,99,235,0.3)]"></div>' : ''}
                </button>
                <button onclick="window._uiState.apActiveTab='history'; renderFinanceAP()" 
                    class="pb-4 text-sm font-bold transition-all relative ${activeTab === 'history' ? 'text-blue-600' : 'text-slate-400 hover:text-slate-600'}">
                    Riwayat Pembayaran
                    ${activeTab === 'history' ? '<div class="absolute -bottom-[1px] left-0 w-full h-[3px] bg-blue-600 rounded-full shadow-[0_2px_10px_rgba(37,99,235,0.3)]"></div>' : ''}
                </button>
            </div>

            ${contentHtml}
        </div>
    `;
};

window.toggleAPHistFilter = function() {
    window._uiState.apHistFilterOpen = !window._uiState.apHistFilterOpen;
    renderFinanceAP();
};

window.applyAPHistFilters = function() {
    window._apHistoryFilters = {
        supplierId: document.getElementById('apHistFilterSupplier').value,
        date: document.getElementById('apHistFilterDate').value,
        method: document.getElementById('apHistFilterMethod').value
    };
    renderFinanceAP();
};

window.resetAPHistoryFilters = function() {
    window._apHistoryFilters = { supplierId: '', date: '', method: '' };
    renderFinanceAP();
};

// --- Finance AP Payment Feature ---
window.openFinanceAPPaymentModal = () => {
    const invoices = db.read('purchaseInvoices').filter(i => i.status === 'UNPAID' || i.status === 'PARTIAL');
    const payments = db.read('supplierPayments');
    const suppliers = db.read('suppliers');
    const assetAccounts = db.read('accounts').filter(a => a.type === 'ASSET' && a.code.startsWith('11'));

    if (invoices.length === 0) {
        showToast('Tidak ada tagihan supplier yang belum dibayar.', 'error');
        return;
    }

    // Build unique supplier list from unpaid invoices only
    const supplierIdsWithUnpaid = [...new Set(invoices.map(inv => inv.supplierId))];
    const suppOptions = supplierIdsWithUnpaid.map(sId => {
        const s = suppliers.find(x => x.id === sId || x.name === sId);
        const displayName = s ? s.name : (sId || 'Unknown Supplier');
        return `<option value="${sId}">${displayName}</option>`;
    }).join('');

    const body = `
        <div class="space-y-4">
            <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">Pilih Supplier</label>
                <select id="fap_supplier_id" class="w-full border border-gray-300 rounded px-3 py-2 bg-white" onchange="updateAPInvoicesBySupplier()">
                    <option value="" disabled selected>Pilih Supplier...</option>
                    ${suppOptions}
                </select>
            </div>
            <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">Pilih Tagihan Supplier (AP)</label>
                <select id="fap_invoice_id" class="w-full border border-gray-300 rounded px-3 py-2 bg-white" onchange="updateFinanceAPPaymentDefaultAmount()" disabled>
                    <option value="" disabled selected>-- Pilih Supplier terlebih dahulu --</option>
                </select>
            </div>
            <div class="grid grid-cols-2 gap-4">
                <div>
                    <label class="block text-sm font-medium text-gray-700 mb-1">Tanggal Bayar</label>
                    <input type="date" id="fap_date" value="${new Date().toISOString().split('T')[0]}" class="w-full border border-gray-300 rounded px-3 py-2 bg-white">
                </div>
                <div>
                    <label class="block text-sm font-medium text-gray-700 mb-1">Bayar Dari (Kas/Bank)</label>
                    <select id="fap_account_id" class="w-full border border-gray-300 rounded px-3 py-2 bg-white" onchange="updateFinanceAPPaymentDefaultAmount()">
                        ${assetAccounts.map(a => `<option value="${a.id}">${a.name} (${a.code})</option>`).join('')}
                    </select>
                    <div id="fap_balance_info" class="mt-1 text-[10px] font-bold text-gray-400 italic">
                        Saldo: <span id="fap_current_balance">${formatCurrency(db.getAccountBalance(assetAccounts[0]?.id))}</span>
                    </div>
                </div>
            </div>
            <div class="grid grid-cols-2 gap-4">
                <div>
                    <label class="block text-sm font-medium text-gray-700 mb-1">Metode Pembayaran</label>
                    <select id="fap_method" class="w-full border border-gray-300 rounded px-3 py-2 bg-white">
                        <option value="Transfer Bank">Transfer Bank</option>
                        <option value="Tunai">Tunai / Cash</option>
                    </select>
                </div>
                <div>
                    <label class="block text-sm font-medium text-gray-700 mb-1">Jumlah Bayar (Rp)</label>
                    <input type="number" id="fap_amount" placeholder="0" class="w-full border border-gray-300 rounded px-3 py-2 text-lg font-bold text-red-600">
                </div>
            </div>
            <!-- Informasi Rekening Supplier (Penerima) -->
            <div id="fap_bank_info" class="hidden p-3 bg-blue-50 border border-blue-100 rounded-lg">
                <p class="text-[10px] font-bold text-blue-600 uppercase tracking-widest mb-2 border-b border-blue-200 pb-1">Detail Rekening Penerima (Supplier)</p>
                <div class="grid grid-cols-2 gap-2 mt-1">
                    <div>
                        <p class="text-[10px] text-gray-500">Bank</p>
                        <p id="fap_bank_name" class="text-xs font-bold text-gray-800">-</p>
                    </div>
                    <div>
                        <p class="text-[10px] text-gray-500">No. Rekening</p>
                        <p id="fap_bank_account" class="text-xs font-bold text-gray-800">-</p>
                    </div>
                    <div class="col-span-2">
                        <p class="text-[10px] text-gray-500">Atas Nama</p>
                        <p id="fap_bank_holder" class="text-xs font-bold text-gray-800">-</p>
                    </div>
                </div>
            </div>

            <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">Catatan</label>
                <textarea id="fap_notes" placeholder="No. Referensi Bank / Catatan tambahan..." rows="2" class="w-full border border-gray-300 rounded px-3 py-2 text-sm"></textarea>
            </div>
            <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">Upload Bukti Transfer <span class="text-xs text-gray-400 font-normal">(Opsional)</span></label>
                <input type="file" id="fap_receipt" accept="image/*,application/pdf" class="w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 border border-slate-300 rounded bg-white">
            </div>
        </div>
    `;

    const footer = `
        <button type="button" onclick="saveFinanceAPPayment()" class="w-full sm:w-auto justify-center rounded-md bg-blue-600 px-4 py-2 text-white font-medium hover:bg-blue-700 text-sm shadow-sm transition-colors">Proses Pembayaran</button>
        <button type="button" onclick="closeModal()" class="mt-3 w-full sm:w-auto justify-center rounded-md border border-gray-300 bg-white px-4 py-2 text-gray-700 font-medium hover:bg-gray-50 text-sm transition-colors">Batal</button>
    `;

    showModal('Input Pelunasan Hutang (AP)', body, footer, 'full');
};

window.updateAPInvoicesBySupplier = () => {
    const supplierId = document.getElementById('fap_supplier_id').value;
    const invoiceSelect = document.getElementById('fap_invoice_id');
    const amountInput = document.getElementById('fap_amount');

    if (!supplierId) {
        invoiceSelect.innerHTML = '<option value="" disabled selected>-- Pilih Supplier terlebih dahulu --</option>';
        invoiceSelect.disabled = true;
        if (amountInput) amountInput.value = '0';
        updateFinanceAPPaymentDefaultAmount(); // Update bank info to hidden
        return;
    }

    const invoices = db.read('purchaseInvoices').filter(inv => (inv.status === 'UNPAID' || inv.status === 'PARTIAL') && inv.supplierId === supplierId);
    const payments = db.read('supplierPayments');

    if (invoices.length === 0) {
        invoiceSelect.innerHTML = '<option value="" disabled selected>Tidak ada tagihan UNPAID untuk supplier ini</option>';
        invoiceSelect.disabled = true;
        if (amountInput) amountInput.value = '0';
        updateFinanceAPPaymentDefaultAmount();
        return;
    }

    const options = invoices.map(inv => {
        const invPayments = payments.filter(p => p.invoiceId === inv.id);
        const totalPaid = invPayments.reduce((sum, p) => sum + parseFloat(p.amount), 0);
        const balance = inv.totalAmount - totalPaid;
        return `<option value="${inv.id}" data-balance="${balance}">${inv.invoiceNumber} (Sisa: ${formatCurrency(balance)})</option>`;
    }).join('');

    invoiceSelect.innerHTML = '<option value="" disabled selected>Pilih Tagihan...</option>' + options;
    invoiceSelect.disabled = false;
    if (amountInput) amountInput.value = '0';
    updateFinanceAPPaymentDefaultAmount(); // Clear bank info as invoice is deselected
};

window.updateFinanceAPPaymentDefaultAmount = () => {
    const select = document.getElementById('fap_invoice_id');
    const accSelect = document.getElementById('fap_account_id');
    const bankInfoContainer = document.getElementById('fap_bank_info');
    
    // Update Balance Info
    if (accSelect) {
        const balance = db.getAccountBalance(accSelect.value);
        const balanceDisplay = document.getElementById('fap_current_balance');
        if (balanceDisplay) {
            balanceDisplay.innerText = formatCurrency(balance);
            if (balance < 0) balanceDisplay.classList.add('text-red-500');
            else balanceDisplay.classList.remove('text-red-500');
        }
    }

    if (select && select.selectedIndex > 0) {
        const invId = select.value;
        const balance = select.options[select.selectedIndex].dataset.balance;
        document.getElementById('fap_amount').value = balance;

        // Populate Bank Info
        const inv = db.findById('purchaseInvoices', invId);
        if (inv && (inv.bankName || inv.bankAccount || inv.bankHolder)) {
            bankInfoContainer.classList.remove('hidden');
            document.getElementById('fap_bank_name').innerText = inv.bankName || '-';
            document.getElementById('fap_bank_account').innerText = inv.bankAccount || '-';
            document.getElementById('fap_bank_holder').innerText = inv.bankHolder || '-';
        } else {
            bankInfoContainer.classList.add('hidden');
        }
    } else {
        if (bankInfoContainer) bankInfoContainer.classList.add('hidden');
    }
};

window.saveFinanceAPPayment = async () => {
    const invoiceId = document.getElementById('fap_invoice_id').value;
    const dateInput = document.getElementById('fap_date').value;
    const accountId = document.getElementById('fap_account_id').value;
    const method = document.getElementById('fap_method').value;
    const inputAmount = parseFloat(document.getElementById('fap_amount').value);
    const notes = document.getElementById('fap_notes').value.trim();
    const fileInput = document.getElementById('fap_receipt');

    if (!invoiceId) { showToast('Pilih tagihan terlebih dahulu', 'error'); return; }
    if (!accountId) { showToast('Pilih akun Kas/Bank', 'error'); return; }
    if (!inputAmount || inputAmount <= 0) { showToast('Jumlah pembayaran tidak valid', 'error'); return; }

    const currentBalance = db.getAccountBalance(accountId);
    if (inputAmount > currentBalance) {
        showToast(`Saldo tidak mencukupi! Tersedia: ${formatCurrency(currentBalance)}`, 'error');
        return;
    }

    const inv = db.findById('purchaseInvoices', invoiceId);
    if (!inv) return;

    const paymentsDb = db.read('supplierPayments');
    const invPayments = paymentsDb.filter(p => p.invoiceId === inv.id);
    const totalPaid = invPayments.reduce((sum, p) => sum + parseFloat(p.amount), 0);
    const balance = inv.totalAmount - totalPaid;

    if (inputAmount > balance + 1) { 
        showToast(`Jumlah bayar melebihi sisa hutang (${formatCurrency(balance)})`, 'error');
        return;
    }

    let receiptData = null;
    if (fileInput && fileInput.files.length > 0) {
        const file = fileInput.files[0];
        if (file.size > 2 * 1024 * 1024) { showToast('Ukuran file maksimal 2MB', 'error'); return; }
        receiptData = await new Promise((resolve) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result);
            reader.readAsDataURL(file);
        });
    }

    const payNumSequence = (paymentsDb.length + 1).toString().padStart(3, '0');
    const month = new Date(dateInput).getMonth() + 1;
    const year = new Date(dateInput).getFullYear();
    const paymentNumber = `VCH-${payNumSequence}/${romanize(month)}/${year}`;

    db.insert('supplierPayments', {
        paymentNumber,
        invoiceId: inv.id,
        date: new Date(dateInput).toISOString(),
        amount: inputAmount,
        method,
        notes,
        receiptBase64: receiptData,
        status: 'COMPLETED',
        createdAt: new Date().toISOString()
    });

    const newTotalPaid = totalPaid + inputAmount;
    if (newTotalPaid >= inv.totalAmount - 1) {
        db.update('purchaseInvoices', inv.id, { status: 'PAID' });
    } else {
        db.update('purchaseInvoices', inv.id, { status: 'PARTIAL' });
    }

    // --- Journal Entry ---
    if (typeof db.addJournalEntry === 'function') {
        db.addJournalEntry({
            date: new Date(dateInput).toISOString(),
            journalNo: paymentNumber,
            description: `Pelunasan Hutang (AP) ke ${db.findById('suppliers', inv.supplierId)?.name || 'Supplier'} - ${inv.invoiceNumber}`,
            items: [
                { accountId: 'acc_ap', debit: inputAmount, credit: 0 }, // Debit AP (Hutang berkurang)
                { accountId: accountId, debit: 0, credit: inputAmount } // Credit Kas/Bank (Uang berkurang)
            ]
        });
    }

    showToast('Pembayaran hutang berhasil dicatat', 'success');
    closeModal();
    renderFinanceAP();
};

window.renderFinanceSettings = function () {
    document.getElementById('pageTitle').innerText = 'Pengaturan Keuangan';
    const mc = document.getElementById('main-content');

    const banks = db.read('bankAccounts');
    const departments = db.read('departments');
    const accounts = db.read('accounts').filter(a => a.type === 'ASSET');

    mc.innerHTML = `
        <div class="space-y-6">
            <!-- Tabs Header -->
            <div class="flex border-b border-gray-200 gap-6">
                <button onclick="switchFinanceSettingTab('banks')" id="tab-btn-banks" class="pb-3 text-sm font-bold border-b-2 border-blue-600 text-blue-600 px-2 transition-all">Akun Bank</button>
                <button onclick="switchFinanceSettingTab('depts')" id="tab-btn-depts" class="pb-3 text-sm font-bold border-b-2 border-transparent text-gray-400 px-2 transition-all hover:text-gray-600">Departemen</button>
            </div>

            <!-- Banks Tab Content -->
            <div id="tab-content-banks" class="space-y-4">
                <div class="flex justify-between items-center">
                    <div>
                        <h3 class="text-lg font-bold text-gray-800">Daftar Akun Bank</h3>
                        <p class="text-xs text-gray-500">Kelola rekening bank yang terhubung dengan akun kas & bank di COA.</p>
                    </div>
                    <button onclick="openBankAccountModal()" class="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-bold shadow-sm flex items-center gap-2">
                        <i class="fas fa-plus"></i> Tambah Bank
                    </button>
                </div>

                <div class="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                    <table class="w-full text-left border-collapse">
                        <thead class="bg-gray-50 text-slate-500 text-[11px] uppercase tracking-wider font-semibold">
                            <tr>
                                <th class="px-6 py-3 border-b border-gray-100">Nama Bank / Kas</th>
                                <th class="px-6 py-3 border-b border-gray-100">No. Rekening</th>
                                <th class="px-6 py-3 border-b border-gray-100">Terhubung COA</th>
                                <th class="px-6 py-3 border-b border-gray-100 text-right">Aksi</th>
                            </tr>
                        </thead>
                        <tbody class="text-sm divide-y divide-gray-100">
                            ${banks.map(ba => `
                                <tr class="hover:bg-gray-50/50 transition-colors">
                                    <td class="px-6 py-4 font-bold text-gray-800">${ba.name} <span class="text-[10px] font-normal text-gray-400 ml-1">(${ba.bankName})</span></td>
                                    <td class="px-6 py-4 text-gray-600 font-mono">${ba.accountNumber}</td>
                                    <td class="px-6 py-4">
                                        <span class="px-2 py-1 bg-blue-50 text-blue-700 rounded text-[10px] font-bold">
                                            ${db.findById('accounts', ba.accountId)?.name || 'Unknown'}
                                        </span>
                                    </td>
                                    <td class="px-6 py-4 text-right space-x-2">
                                        <button onclick="openBankAccountModal('${ba.id}')" class="text-blue-500 hover:text-blue-700"><i class="fas fa-edit"></i></button>
                                        <button onclick="deleteBankAccount('${ba.id}')" class="text-red-400 hover:text-red-600"><i class="fas fa-trash"></i></button>
                                    </td>
                                </tr>
                            `).join('') || '<tr><td colspan="4" class="px-6 py-12 text-center text-gray-400 italic">Belum ada akun bank yang terdaftar.</td></tr>'}
                        </tbody>
                    </table>
                </div>
            </div>

            <!-- Departments Tab Content -->
            <div id="tab-content-depts" class="hidden space-y-4">
                 <div class="flex justify-between items-center">
                    <div>
                        <h3 class="text-lg font-bold text-gray-800">Daftar Departemen</h3>
                        <p class="text-xs text-gray-500">Departemen digunakan untuk alokasi biaya dan laporan per bagian.</p>
                    </div>
                    <button onclick="openDepartmentModal()" class="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-bold shadow-sm flex items-center gap-2">
                        <i class="fas fa-plus"></i> Tambah Departemen
                    </button>
                </div>

                <div class="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                    <table class="w-full text-left border-collapse">
                        <thead class="bg-gray-50 text-slate-500 text-[11px] uppercase tracking-wider font-semibold">
                            <tr>
                                <th class="px-6 py-3 border-b border-gray-100">Nama Departemen</th>
                                <th class="px-6 py-3 border-b border-gray-100">ID Referensi</th>
                                <th class="px-6 py-3 border-b border-gray-100 text-right">Aksi</th>
                            </tr>
                        </thead>
                        <tbody class="text-sm divide-y divide-gray-100">
                            ${departments.map(d => `
                                <tr class="hover:bg-gray-50/50 transition-colors">
                                    <td class="px-6 py-4 font-bold text-gray-800">${d.name}</td>
                                    <td class="px-6 py-4 text-gray-500 font-mono text-xs">${d.id}</td>
                                    <td class="px-6 py-4 text-right space-x-2">
                                        <button onclick="openDepartmentModal('${d.id}')" class="text-blue-500 hover:text-blue-700"><i class="fas fa-edit"></i></button>
                                        <button onclick="deleteDepartment('${d.id}')" class="text-red-400 hover:text-red-600"><i class="fas fa-trash"></i></button>
                                    </td>
                                </tr>
                            `).join('') || '<tr><td colspan="3" class="px-6 py-12 text-center text-gray-400 italic">Belum ada departemen yang terdaftar.</td></tr>'}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    `;
};

window.switchFinanceSettingTab = function (tab) {
    const btnBanks = document.getElementById('tab-btn-banks');
    const btnDepts = document.getElementById('tab-btn-depts');
    const contentBanks = document.getElementById('tab-content-banks');
    const contentDepts = document.getElementById('tab-content-depts');

    if (tab === 'banks') {
        btnBanks.classList.add('border-blue-600', 'text-blue-600');
        btnBanks.classList.remove('border-transparent', 'text-gray-400');
        btnDepts.classList.add('border-transparent', 'text-gray-400');
        btnDepts.classList.remove('border-blue-600', 'text-blue-600');
        contentBanks.classList.remove('hidden');
        contentDepts.classList.add('hidden');
    } else {
        btnDepts.classList.add('border-blue-600', 'text-blue-600');
        btnDepts.classList.remove('border-transparent', 'text-gray-400');
        btnBanks.classList.add('border-transparent', 'text-gray-400');
        btnBanks.classList.remove('border-blue-600', 'text-blue-600');
        contentDepts.classList.remove('hidden');
        contentBanks.classList.add('hidden');
    }
};

// --- CRUD Bank Account ---
window.openBankAccountModal = function (id = null) {
    const ba = id ? db.findById('bankAccounts', id) : null;
    const accounts = db.read('accounts').filter(a => a.type === 'ASSET');

    const body = `
        <div class="space-y-4">
            <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">Nama Tampilan (e.g. Kas Toko, Rekening BCA)</label>
                <input type="text" id="ba_name" value="${ba?.name || ''}" class="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500">
            </div>
            <div class="grid grid-cols-2 gap-4">
                <div>
                    <label class="block text-sm font-medium text-gray-700 mb-1">Nama Bank (e.g. BCA, Mandiri)</label>
                    <input type="text" id="ba_bank" value="${ba?.bankName || ''}" class="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500">
                </div>
                <div>
                    <label class="block text-sm font-medium text-gray-700 mb-1">No. Rekening</label>
                    <input type="text" id="ba_number" value="${ba?.accountNumber || ''}" class="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500">
                </div>
            </div>
            <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">Hubungkan ke COA (Account)</label>
                <select id="ba_account" class="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white focus:ring-2 focus:ring-blue-500">
                    <option value="">-- Pilih Akun COA --</option>
                    ${accounts.map(a => `<option value="${a.id}" ${ba?.accountId === a.id ? 'selected' : ''}>${a.code} - ${a.name}</option>`).join('')}
                </select>
                <p class="text-[10px] text-gray-400 mt-1">Hanya akun tipe ASSET yang ditampilkan.</p>
            </div>
        </div>
    `;

    const footer = `
        <button onclick="saveBankAccount('${id || ''}')" class="bg-blue-600 text-white px-6 py-2 rounded-lg text-sm font-bold">Simpan</button>
        <button onclick="closeModal()" class="px-6 py-2 text-sm font-bold text-gray-500 hover:bg-gray-100 rounded-lg">Batal</button>
    `;
    showModal(id ? 'Edit Akun Bank' : 'Tambah Akun Bank', body, footer);
};

window.saveBankAccount = function (id) {
    const data = {
        name: document.getElementById('ba_name').value.trim(),
        bankName: document.getElementById('ba_bank').value.trim(),
        accountNumber: document.getElementById('ba_number').value.trim(),
        accountId: document.getElementById('ba_account').value
    };

    if (!data.name || !data.bankName || !data.accountId) {
        showToast('Mohon lengkapi semua data wajib.', 'error');
        return;
    }

    if (id) {
        db.update('bankAccounts', id, data);
        showToast('Akun bank berhasil diperbarui.');
    } else {
        db.insert('bankAccounts', data);
        showToast('Akun bank baru ditambahkan.');
    }
    closeModal();
    renderFinanceSettings();
};

window.deleteBankAccount = function (id) {
    if (!confirm('Hapus akun bank ini? Transaksi jurnal yang sudah ada tidak akan terhapus, namun tidak dapat memilih bank ini lagi.')) return;
    db.delete('bankAccounts', id);
    showToast('Akun bank dihapus.');
    renderFinanceSettings();
};

// --- CRUD Department ---
window.openDepartmentModal = function (id = null) {
    const dept = id ? db.findById('departments', id) : null;

    const body = `
        <div class="space-y-4">
            <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">Nama Departemen</label>
                <input type="text" id="dept_name" value="${dept?.name || ''}" class="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500">
            </div>
            <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">ID (Kode)</label>
                <input type="text" id="dept_id_val" value="${dept?.id || ''}" ${id ? 'disabled bg-gray-50' : ''} class="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500">
                <p class="text-[10px] text-gray-400 mt-1">Gunakan kode singkat tanpa spasi (e.g. dept_production, IT, SALES)</p>
            </div>
        </div>
    `;

    const footer = `
        <button onclick="saveDepartment('${id || ''}')" class="bg-blue-600 text-white px-6 py-2 rounded-lg text-sm font-bold">Simpan</button>
        <button onclick="closeModal()" class="px-6 py-2 text-sm font-bold text-gray-500 hover:bg-gray-100 rounded-lg">Batal</button>
    `;
    showModal(id ? 'Edit Departemen' : 'Tambah Departemen', body, footer);
};

window.saveDepartment = function (id) {
    const name = document.getElementById('dept_name').value.trim();
    let newId = document.getElementById('dept_id_val').value.trim();

    if (!name || (!id && !newId)) {
        showToast('Nama dan ID departemen wajib diisi.', 'error');
        return;
    }

    if (id) {
        db.update('departments', id, { name });
        showToast('Departemen diperbarui.');
    } else {
        // Cek ID unik
        const exists = db.findById('departments', newId);
        if (exists) {
            showToast('ID Departemen sudah digunakan.', 'error');
            return;
        }
        db.insert('departments', { id: newId, name });
        showToast('Departemen baru berhasil ditambahkan.');
    }
    closeModal();
    renderFinanceSettings();
};

window.deleteDepartment = function (id) {
    if (!confirm('Hapus departemen ini? Data historis yang menggunakan departemen ini mungkin tidak akan terpengaruh.')) return;
    db.delete('departments', id);
    showToast('Departemen dihapus.');
    renderFinanceSettings();
};

// --- CREDIT NOTES (Sales Returns / Adjustments) ---
window.renderFinanceCreditNotes = function () {
    document.getElementById('pageTitle').innerText = 'Credit Notes (Penyesuaian Piutang)';
    const mc = document.getElementById('main-content');
    
    // Filters logic
    const filterCust = (window._cnFilters?.customer || '').toLowerCase();
    const filterDate = window._cnFilters?.date || '';
    
    let notes = db.read('creditNotes');
    if (filterCust) {
        notes = notes.filter(n => {
            const cName = (db.findById('customers', n.customerId)?.name || '').toLowerCase();
            return cName.includes(filterCust);
        });
    }
    if (filterDate) {
        notes = notes.filter(n => n.date && n.date.startsWith(filterDate));
    }

    mc.innerHTML = `
        <div class="space-y-6">
            <!-- Compact Filter Section -->
            <div class="bg-white rounded-xl shadow-sm border border-slate-100 p-5 mb-5">
                <h3 class="text-xs font-black text-slate-800 uppercase tracking-widest mb-4 flex items-center gap-2"><i class="fas fa-filter text-blue-500"></i> Filter Pencarian</h3>
                <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 items-end mb-4">
                    <div>
                        <label class="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Cari Customer</label>
                        <input type="text" id="cnFilterCustomer" placeholder="Nama customer..." class="w-full border-2 border-slate-200 rounded-lg px-3 py-2 text-sm bg-white font-bold text-slate-700 focus:border-blue-500 outline-none transition-all" value="${window._cnFilters?.customer || ''}" onkeyup="if(event.key === 'Enter') updateCNFilters()">
                    </div>
                    <div>
                        <label class="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Cari Tanggal</label>
                        <input type="date" id="cnFilterDate" class="w-full border-2 border-slate-200 rounded-lg px-3 py-2 text-sm bg-white font-bold text-slate-700 focus:border-blue-500 outline-none transition-all" value="${window._cnFilters?.date || ''}">
                    </div>
                </div>
                <div class="flex gap-2">
                    <button onclick="updateCNFilters()" class="bg-blue-600 hover:bg-blue-700 text-white px-8 py-2 rounded-lg text-xs font-black uppercase tracking-widest transition-all active:scale-95 shadow-sm shadow-blue-100">
                        <i class="fas fa-search mr-2"></i> TAMPILKAN
                    </button>
                    <button onclick="document.getElementById('cnFilterCustomer').value=''; document.getElementById('cnFilterDate').value=''; updateCNFilters()" class="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-500 rounded-lg transition-all active:scale-95 shadow-sm" title="Reset Filter">
                        <i class="fas fa-undo"></i>
                    </button>
                </div>
            </div>

            <div class="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                <div class="p-4 border-b border-gray-100 bg-gray-50/50 flex justify-between items-center flex-wrap gap-4">
                    <div>
                        <h3 class="text-lg font-bold text-gray-800">Riwayat Credit Note</h3>
                        <p class="text-xs text-gray-500 font-medium">Dokumen untuk pengurangan piutang (Retur/Diskon).</p>
                    </div>
                    <button onclick="openCreditNoteModal()" class="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-sm font-bold shadow-sm transition-all flex items-center gap-2">
                        <i class="fas fa-plus"></i> Buat Credit Note
                    </button>
                </div>

            <div class="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                <table class="w-full text-left border-collapse">
                    <thead class="bg-gray-50 text-slate-500 text-[11px] uppercase tracking-wider font-semibold">
                        <tr>
                            <th class="px-6 py-3 border-b border-gray-100">No. Nota</th>
                            <th class="px-6 py-3 border-b border-gray-100">Tanggal</th>
                            <th class="px-6 py-3 border-b border-gray-100">Pelanggan</th>
                            <th class="px-6 py-3 border-b border-gray-100">Alasan / Note</th>
                            <th class="px-6 py-3 border-b border-gray-100 text-right">Total</th>
                            <th class="px-6 py-3 border-b border-gray-100 text-right">Aksi</th>
                        </tr>
                    </thead>
                    <tbody class="text-sm divide-y divide-gray-100">
                        ${notes.map(n => `
                            <tr class="hover:bg-gray-50/50 transition-colors">
                                <td class="px-6 py-4 font-bold text-gray-800">${n.noteNumber}</td>
                                <td class="px-6 py-4 text-gray-600">${formatDate(n.date).slice(0, 10)}</td>
                                <td class="px-6 py-4 text-gray-700">${db.findById('customers', n.customerId)?.name || 'N/A'}</td>
                                <td class="px-6 py-4 text-gray-500 italic">${n.notes || '-'}</td>
                                <td class="px-6 py-4 text-right font-bold text-red-600">(${formatCurrency(n.amount)})</td>
                                <td class="px-6 py-4 text-right">
                                    <button onclick="viewCreditNote('${n.id}')" class="text-gray-400 hover:text-indigo-600 transition-colors" title="Lihat Detail"><i class="fas fa-eye"></i></button>
                                </td>
                            </tr>
                        `).join('') || '<tr><td colspan="6" class="px-6 py-12 text-center text-gray-400 italic">Belum ada data Credit Note.</td></tr>'}
                    </tbody>
                </table>
            </div>
        </div>
    `;
};
window.updateCNFilters = function() {
    window._cnFilters = {
        customer: document.getElementById('cnFilterCustomer')?.value || '',
        date: document.getElementById('cnFilterDate')?.value || ''
    };
    renderFinanceCreditNotes();
};

function romanizeFinanceList(num) {
    const roman = ["", "I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X", "XI", "XII"];
    return roman[num] || "";
}

window.generateCreditNoteNumber = function(isTax) {
    const records = db.read('creditNotes') || [];
    const now = new Date();
    const month = now.getMonth() + 1;
    const year = now.getFullYear();
    const romanMonth = romanizeFinanceList(month);
    
    // Filter CN by same month and year to get shared sequence
    const sameMonthRecords = records.filter(s => {
        if (!s.noteNumber) return false;
        // CN-A-001/III/2026
        const mainParts = s.noteNumber.split('/');
        if (mainParts.length < 3) return false;
        const romanPart = mainParts[1];
        const yearPartStr = mainParts[2];
        return romanPart === romanMonth && yearPartStr === String(year);
    });

    const nextSeq = sameMonthRecords.length + 1;
    const seqStr = String(nextSeq).padStart(3, '0');
    const type = isTax ? 'A' : 'B';
    return `CN-${type}-${seqStr}/${romanMonth}/${year}`;
};

window.generateDebitNoteNumber = function(isTax) {
    const records = db.read('debitNotes') || [];
    const now = new Date();
    const month = now.getMonth() + 1;
    const year = now.getFullYear();
    const romanMonth = romanizeFinanceList(month);
    
    // Filter DN by same month and year to get shared sequence
    const sameMonthRecords = records.filter(s => {
        if (!s.noteNumber) return false;
        // DN-A-001/III/2026
        const mainParts = s.noteNumber.split('/');
        if (mainParts.length < 3) return false;
        const romanPart = mainParts[1];
        const yearPartStr = mainParts[2];
        return romanPart === romanMonth && yearPartStr === String(year);
    });

    const nextSeq = sameMonthRecords.length + 1;
    const seqStr = String(nextSeq).padStart(3, '0');
    const type = isTax ? 'A' : 'B';
    return `DN-${type}-${seqStr}/${romanMonth}/${year}`;
};

window.updateCNNumberPreview = function() {
    const isTax = document.getElementById('cn_is_tax').value === 'true';
    document.getElementById('cn_number').value = window.generateCreditNoteNumber(isTax);
};

window.updateDNNumberPreview = function() {
    const isTax = document.getElementById('dn_is_tax').value === 'true';
    document.getElementById('dn_number').value = window.generateDebitNoteNumber(isTax);
};

window.openCreditNoteModal = function () {
    const customers = db.read('customers');
    const body = `
        <div class="space-y-4 text-left">
            <div class="grid grid-cols-2 gap-4">
                <div>
                    <label class="block text-xs font-bold text-gray-500 uppercase mb-1">Pelanggan</label>
                    <select id="cn_customer" class="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white" onchange="updateCNInvoiceList()">
                        <option value="">-- Pilih Pelanggan --</option>
                        ${customers.map(c => `<option value="${c.id}">${c.name}</option>`).join('')}
                    </select>
                </div>
                <div>
                    <label class="block text-xs font-bold text-gray-500 uppercase mb-1">Pilih Invoice (Opsional)</label>
                    <select id="cn_invoice" class="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white">
                        <option value="">-- Pilih Pelanggan Dahulu --</option>
                    </select>
                </div>
            </div>
            <div class="grid grid-cols-2 gap-4">
                <div>
                    <label class="block text-xs font-bold text-gray-500 uppercase mb-1">Tanggal</label>
                    <input type="date" id="cn_date" class="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" value="${new Date().toISOString().split('T')[0]}" required>
                </div>
                <div>
                    <label class="block text-xs font-bold text-gray-500 uppercase mb-1">No. Credit Note <span class="text-red-500 text-[10px] font-normal italic">(Wajib)</span></label>
                    <div class="flex">
                         <select id="cn_is_tax" onchange="updateCNNumberPreview()" class="border border-gray-300 border-r-0 rounded-l-lg px-2 py-2 bg-gray-50 text-xs font-bold focus:outline-none focus:ring-0 text-gray-700">
                            <option value="true">TAX</option>
                            <option value="false">NT</option>
                         </select>
                         <input type="text" id="cn_number" value="${generateCreditNoteNumber(true)}" class="w-full border border-gray-300 rounded-r-lg px-3 py-2 bg-gray-50 font-mono text-xs focus:outline-none text-gray-700" readonly>
                    </div>
                </div>
            </div>
            <div>
                <label class="block text-xs font-bold text-gray-500 uppercase mb-1">Jumlah Pemotongan (Amount)</label>
                <div class="relative">
                    <span class="absolute left-3 top-2 text-gray-400 text-sm">Rp</span>
                    <input type="number" id="cn_amount" class="w-full border border-gray-300 rounded-lg pl-10 pr-3 py-2 text-sm font-bold text-red-600 focus:ring-2 focus:ring-red-500" placeholder="0">
                </div>
            </div>
            <div>
                <label class="block text-xs font-bold text-gray-500 uppercase mb-1">Alasan / Catatan</label>
                <textarea id="cn_notes" rows="3" class="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" placeholder="Contoh: Barang rusak / Retur unit..."></textarea>
            </div>
        </div>
    `;
    const footer = `
        <button onclick="saveCreditNote()" class="bg-indigo-600 text-white px-6 py-2 rounded-lg text-sm font-bold hover:bg-indigo-700 transition-all shadow-md">Simpan Credit Note</button>
        <button onclick="closeModal()" class="px-6 py-2 text-sm font-bold text-gray-500 hover:bg-gray-100 rounded-lg transition-all">Batal</button>
    `;
    showModal('Buat Credit Note Baru', body, footer);
};

window.updateCNInvoiceList = function () {
    const customerId = document.getElementById('cn_customer').value;
    const invSelect = document.getElementById('cn_invoice');
    if (!customerId) { invSelect.innerHTML = '<option value="">-- Pilih Pelanggan Dahulu --</option>'; return; }
    const invoices = db.read('salesInvoices').filter(i => i.customerId === customerId);
    invSelect.innerHTML = '<option value="">-- Tidak Terkait Invoice Spesifik --</option>' +
        invoices.map(i => `<option value="${i.id}">${i.invoiceNumber} (Total: ${formatCurrency(i.totalAmount)})</option>`).join('');
};

window.saveCreditNote = function () {
    const customerId = document.getElementById('cn_customer').value;
    const amount = parseFloat(document.getElementById('cn_amount').value) || 0;
    const notes = document.getElementById('cn_notes').value.trim();
    const invoiceId = document.getElementById('cn_invoice').value;
    const dateInput = document.getElementById('cn_date')?.value || new Date().toISOString().split('T')[0];
    const isTax = document.getElementById('cn_is_tax')?.value === 'true';
    const taxType = isTax ? 'A' : 'B';
    const noteNumberStr = document.getElementById('cn_number')?.value;

    if (!customerId || amount <= 0) { showToast('Mohon pilih pelanggan dan isi jumlah yang valid.', 'error'); return; }
    
    // Convert local date to ISO for storage or store as YYYY-MM-DD directly
    const isoDate = new Date(dateInput).toISOString();
    const noteNumber = noteNumberStr || ('CN-' + Date.now().toString().slice(-6));
    
    const cn = db.insert('creditNotes', { noteNumber, date: isoDate, customerId, amount, notes, invoiceId, taxType });
    if (typeof db.addJournalEntry === 'function') {
        db.addJournalEntry({
            description: `Credit Note ${noteNumber} - ${notes}`,
            referenceId: cn.id, referenceType: 'CREDIT_NOTE',
            items: [
                { accountId: 'acc_sales_return', debit: amount, credit: 0 },
                { accountId: 'acc_ar', debit: 0, credit: amount }
            ]
        });
    }
    showToast('Credit Note berhasil disimpan dan Jurnal dibuat.');
    closeModal(); renderFinanceCreditNotes();
};

// --- DEBIT NOTES (Purchase Returns / Adjustments) ---
window.renderFinanceDebitNotes = function () {
    document.getElementById('pageTitle').innerText = 'Debit Notes (Penyesuaian Hutang)';
    const mc = document.getElementById('main-content');
    
    // Filters logic
    const filterSupp = (window._dnFilters?.supplier || '').toLowerCase();
    const filterDate = window._dnFilters?.date || '';
    
    let notes = db.read('debitNotes');
    if (filterSupp) {
        notes = notes.filter(n => {
            const sName = (db.findById('suppliers', n.supplierId)?.name || '').toLowerCase();
            return sName.includes(filterSupp);
        });
    }
    if (filterDate) {
        notes = notes.filter(n => n.date && n.date.startsWith(filterDate));
    }

    mc.innerHTML = `
        <div class="space-y-6">
            <!-- Compact Filter Section -->
            <div class="bg-white rounded-xl shadow-sm border border-slate-100 p-5 mb-5">
                <h3 class="text-xs font-black text-slate-800 uppercase tracking-widest mb-4 flex items-center gap-2"><i class="fas fa-filter text-blue-500"></i> Filter Pencarian</h3>
                <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 items-end mb-4">
                    <div>
                        <label class="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Cari Supplier</label>
                        <input type="text" id="dnFilterSupplier" placeholder="Nama supplier..." class="w-full border-2 border-slate-200 rounded-lg px-3 py-2 text-sm bg-white font-bold text-slate-700 focus:border-blue-500 outline-none transition-all" value="${window._dnFilters?.supplier || ''}" onkeyup="if(event.key === 'Enter') updateDNFilters()">
                    </div>
                    <div>
                        <label class="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Cari Tanggal</label>
                        <input type="date" id="dnFilterDate" class="w-full border-2 border-slate-200 rounded-lg px-3 py-2 text-sm bg-white font-bold text-slate-700 focus:border-blue-500 outline-none transition-all" value="${window._dnFilters?.date || ''}">
                    </div>
                </div>
                <div class="flex gap-2">
                    <button onclick="updateDNFilters()" class="bg-blue-600 hover:bg-blue-700 text-white px-8 py-2 rounded-lg text-xs font-black uppercase tracking-widest transition-all active:scale-95 shadow-sm shadow-blue-100">
                        <i class="fas fa-search mr-2"></i> TAMPILKAN
                    </button>
                    <button onclick="document.getElementById('dnFilterSupplier').value=''; document.getElementById('dnFilterDate').value=''; updateDNFilters()" class="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-500 rounded-lg transition-all active:scale-95 shadow-sm" title="Reset Filter">
                        <i class="fas fa-undo"></i>
                    </button>
                </div>
            </div>

            <div class="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                <div class="p-4 border-b border-gray-100 bg-gray-50/50 flex justify-between items-center flex-wrap gap-4">
                    <div>
                        <h3 class="text-lg font-bold text-gray-800">Riwayat Debit Note</h3>
                        <p class="text-xs text-gray-500 font-medium">Dokumen untuk pengurangan hutang (Retur Pembelian).</p>
                    </div>
                    <button onclick="openDebitNoteModal()" class="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-bold shadow-sm transition-all flex items-center gap-2">
                        <i class="fas fa-plus"></i> Buat Debit Note
                    </button>
                </div>

            <div class="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                <table class="w-full text-left border-collapse">
                    <thead class="bg-gray-50 text-slate-500 text-[11px] uppercase tracking-wider font-semibold">
                        <tr>
                            <th class="px-6 py-3 border-b border-gray-100">No. Nota</th>
                            <th class="px-6 py-3 border-b border-gray-100">Tanggal</th>
                            <th class="px-6 py-3 border-b border-gray-100">Supplier</th>
                            <th class="px-6 py-3 border-b border-gray-100">Alasan / Note</th>
                            <th class="px-6 py-3 border-b border-gray-100 text-right">Total</th>
                            <th class="px-6 py-3 border-b border-gray-100 text-right">Aksi</th>
                        </tr>
                    </thead>
                    <tbody class="text-sm divide-y divide-gray-100">
                        ${notes.map(n => `
                            <tr class="hover:bg-gray-50/50 transition-colors">
                                <td class="px-6 py-4 font-bold text-gray-800">${n.noteNumber}</td>
                                <td class="px-6 py-4 text-gray-600">${formatDate(n.date).slice(0, 10)}</td>
                                <td class="px-6 py-4 text-gray-700">${db.findById('suppliers', n.supplierId)?.name || 'N/A'}</td>
                                <td class="px-6 py-4 text-gray-500 italic">${n.notes || '-'}</td>
                                <td class="px-6 py-4 text-right font-bold text-green-600">(${formatCurrency(n.amount)})</td>
                                <td class="px-6 py-4 text-right">
                                    <button onclick="viewDebitNote('${n.id}')" class="text-gray-400 hover:text-blue-600 transition-colors" title="Lihat Detail"> <i class="fas fa-eye"></i></button>
                                </td>
                            </tr>
                        `).join('') || '<tr><td colspan="6" class="px-6 py-12 text-center text-gray-400 italic">Belum ada data Debit Note.</td></tr>'}
                    </tbody>
                </table>
            </div>
        </div>
    `;
};

window.updateDNFilters = function() {
    window._dnFilters = {
        supplier: document.getElementById('dnFilterSupplier')?.value || '',
        date: document.getElementById('dnFilterDate')?.value || ''
    };
    renderFinanceDebitNotes();
};

window.openDebitNoteModal = function () {
    const suppliers = db.read('suppliers');
    const body = `
        <div class="space-y-4 text-left">
            <div class="grid grid-cols-2 gap-4">
                <div>
                    <label class="block text-xs font-bold text-gray-500 uppercase mb-1">Supplier</label>
                    <select id="dn_supplier" class="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white" onchange="updateDNInvoiceList()">
                        <option value="">-- Pilih Supplier --</option>
                        ${suppliers.map(s => `<option value="${s.id}">${s.name}</option>`).join('')}
                    </select>
                </div>
                <div>
                    <label class="block text-xs font-bold text-gray-500 uppercase mb-1">Pilih Tagihan (Opsional)</label>
                    <select id="dn_invoice" class="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white">
                        <option value="">-- Pilih Supplier Dahulu --</option>
                    </select>
                </div>
            </div>
            <div class="grid grid-cols-2 gap-4">
                <div>
                    <label class="block text-xs font-bold text-gray-500 uppercase mb-1">Tanggal</label>
                    <input type="date" id="dn_date" class="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" value="${new Date().toISOString().split('T')[0]}" required>
                </div>
                <div>
                    <label class="block text-xs font-bold text-gray-500 uppercase mb-1">No. Debit Note <span class="text-red-500 text-[10px] font-normal italic">(Wajib)</span></label>
                    <div class="flex">
                         <select id="dn_is_tax" onchange="updateDNNumberPreview()" class="border border-gray-300 border-r-0 rounded-l-lg px-2 py-2 bg-gray-50 text-xs font-bold focus:outline-none focus:ring-0 text-gray-700">
                            <option value="true">TAX</option>
                            <option value="false">NT</option>
                         </select>
                         <input type="text" id="dn_number" value="${generateDebitNoteNumber(true)}" class="w-full border border-gray-300 rounded-r-lg px-3 py-2 bg-gray-50 font-mono text-xs focus:outline-none text-gray-700" readonly>
                    </div>
                </div>
            </div>
            <div>
                <label class="block text-xs font-bold text-gray-500 uppercase mb-1">Jumlah Pemotongan (Amount)</label>
                <div class="relative">
                    <span class="absolute left-3 top-2 text-gray-400 text-sm">Rp</span>
                    <input type="number" id="dn_amount" class="w-full border border-gray-300 rounded-lg pl-10 pr-3 py-2 text-sm font-bold text-green-600 focus:ring-2 focus:ring-green-500" placeholder="0">
                </div>
            </div>
            <div>
                <label class="block text-xs font-bold text-gray-500 uppercase mb-1">Alasan / Catatan</label>
                <textarea id="dn_notes" rows="3" class="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" placeholder="Contoh: Retur bahan baku / Koreksi harga..."></textarea>
            </div>
        </div>
    `;
    const footer = `
        <button onclick="saveDebitNote()" class="bg-blue-600 text-white px-6 py-2 rounded-lg text-sm font-bold hover:bg-blue-700 transition-all shadow-md">Simpan Debit Note</button>
        <button onclick="closeModal()" class="px-6 py-2 text-sm font-bold text-gray-500 hover:bg-gray-100 rounded-lg transition-all">Batal</button>
    `;
    showModal('Buat Debit Note Baru', body, footer);
};

window.updateDNInvoiceList = function () {
    const supplierId = document.getElementById('dn_supplier').value;
    const invSelect = document.getElementById('dn_invoice');
    if (!supplierId) { invSelect.innerHTML = '<option value="">-- Pilih Supplier Dahulu --</option>'; return; }
    const invoices = db.read('purchaseInvoices').filter(i => i.supplierId === supplierId);
    invSelect.innerHTML = '<option value="">-- Tidak Terkait Tagihan Spesifik --</option>' +
        invoices.map(i => `<option value="${i.id}">${i.invoiceNumber} (Total: ${formatCurrency(i.totalAmount)})</option>`).join('');
};

window.saveDebitNote = function () {
    const supplierId = document.getElementById('dn_supplier').value;
    const amount = parseFloat(document.getElementById('dn_amount').value) || 0;
    const notes = document.getElementById('dn_notes').value.trim();
    const invoiceId = document.getElementById('dn_invoice').value;
    const dateInput = document.getElementById('dn_date')?.value || new Date().toISOString().split('T')[0];
    const isTax = document.getElementById('dn_is_tax')?.value === 'true';
    const taxType = isTax ? 'A' : 'B';
    const noteNumberStr = document.getElementById('dn_number')?.value;

    if (!supplierId || amount <= 0) { showToast('Mohon pilih supplier dan isi jumlah yang valid.', 'error'); return; }
    
    const isoDate = new Date(dateInput).toISOString();
    const noteNumber = noteNumberStr || ('DN-' + Date.now().toString().slice(-6));
    
    const dn = db.insert('debitNotes', { noteNumber, date: isoDate, supplierId, amount, notes, invoiceId, taxType });
    if (typeof db.addJournalEntry === 'function') {
        db.addJournalEntry({
            description: `Debit Note ${noteNumber} - ${notes}`,
            referenceId: dn.id, referenceType: 'DEBIT_NOTE',
            items: [
                { accountId: 'acc_ap', debit: amount, credit: 0 },
                { accountId: 'acc_purchase_return', debit: 0, credit: amount }
            ]
        });
    }
    showToast('Debit Note berhasil disimpan dan Jurnal dibuat.');
    closeModal(); renderFinanceDebitNotes();
};

// --- View & PDF Notes ---

window.viewCreditNote = function (id) {
    const cn = db.findById('creditNotes', id);
    const customer = db.findById('customers', cn.customerId);
    const invoice = cn.invoiceId ? db.findById('salesInvoices', cn.invoiceId) : null;

    const printableHTML = `
        <div class="max-w-4xl mx-auto bg-white p-6 border border-gray-100 shadow-sm rounded-2xl">
            <div id="print-internal-header" class="flex justify-between items-start mb-6 pb-4 border-b-2 border-gray-50">
                <div>
                    <div class="bg-indigo-600 text-white px-3 py-1 rounded text-[10px] font-black uppercase tracking-widest mb-2 inline-block">Credit Note</div>
                    <h2 class="text-4xl font-black text-slate-800 tracking-tight">${cn.noteNumber}</h2>
                    <p class="text-xs text-slate-400 mt-1 font-medium italic">Tanggal: <span class="text-indigo-600 font-bold">${formatDate(cn.date).slice(0, 10)}</span></p>
                </div>
                <div class="text-right flex flex-col items-end">
                    ${CONFIG.logo ? `<img src="${CONFIG.logo}" class="h-10 w-auto object-contain mb-3">` : ''}
                    <h1 class="text-xl font-black text-slate-900 leading-none">${CONFIG.companyName}</h1>
                    <p class="text-[9px] text-slate-500 max-w-[220px] leading-relaxed mt-2 uppercase font-bold tracking-tight">${CONFIG.companyAddress}</p>
                </div>
            </div>

            <div class="grid grid-cols-2 gap-8 mb-6">
                <div class="bg-slate-50 p-5 rounded-2xl border border-slate-100 shadow-inner">
                    <h3 class="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                        <i class="fas fa-user-circle text-indigo-500 text-sm"></i> PELANGGAN
                    </h3>
                    <p class="text-lg font-black text-slate-800 leading-tight mb-1">${customer ? customer.name : 'Unknown Customer'}</p>
                    <p class="text-xs text-slate-500 leading-relaxed font-medium italic">${customer?.address || '-'}</p>
                    <p class="text-xs text-slate-600 font-bold mt-2">${customer?.phone || '-'}</p>
                </div>
                <div class="text-right">
                    <h3 class="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-3 flex items-center justify-end gap-2">
                        REFERENSI <i class="fas fa-file-invoice text-orange-500 text-sm"></i>
                    </h3>
                    <p class="text-xs text-slate-500 font-bold uppercase tracking-tighter mb-1">Invoice Terkait</p>
                    <p class="text-sm font-black text-slate-800 mb-4">${invoice ? invoice.invoiceNumber : 'Umum / Tanpa Invoice'}</p>
                    <p class="text-xs text-slate-500 font-bold uppercase tracking-tighter mb-1">Status</p>
                    <span class="inline-block px-4 py-1 rounded-full text-[10px] font-black tracking-widest bg-green-500 text-white shadow-sm uppercase">Original Copy</span>
                </div>
            </div>

            <div class="mb-6">
                <table class="w-full text-left border-collapse mb-6">
                    <thead>
                        <tr class="bg-indigo-50 border-y-2 border-indigo-100">
                            <th class="py-3 px-4 text-xs font-black text-indigo-900 uppercase tracking-widest">Deskripsi Penyesuaian</th>
                            <th class="py-3 px-4 text-xs font-black text-indigo-900 uppercase tracking-widest text-right">Tipe Pajak</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr class="border-b border-gray-100">
                            <td class="py-4 px-4 text-sm font-medium text-slate-800">${cn.notes || 'Penyesuaian Dokumen'}</td>
                            <td class="py-4 px-4 text-sm font-bold text-slate-500 text-right">${(cn.taxType === 'TAX' || cn.taxType === 'A') ? 'Termasuk PPN' : 'Non-Tax'}</td>
                        </tr>
                    </tbody>
                </table>

                <div class="flex justify-end">
                    <div class="w-80 bg-slate-50 p-5 rounded-2xl border border-slate-100">
                        ${(cn.taxType === 'TAX' || cn.taxType === 'A') ? `
                            <div class="flex justify-between mb-3 border-b border-dashed border-slate-200 pb-2">
                                <span class="text-[10px] font-bold text-slate-500 uppercase tracking-widest">DPP (Dasar Pengenaan Pajak)</span>
                                <span class="text-sm font-bold text-slate-700">${formatCurrency(Math.round(cn.amount / 1.11))}</span>
                            </div>
                            <div class="flex justify-between mb-3 border-b border-slate-200 pb-3">
                                <span class="text-[10px] font-bold text-slate-500 uppercase tracking-widest">PPN (11%)</span>
                                <span class="text-sm font-bold text-slate-700">${formatCurrency(Math.round(cn.amount - (cn.amount / 1.11)))}</span>
                            </div>
                        ` : ''}
                        <div class="flex justify-between items-center">
                            <span class="text-xs font-black text-indigo-900 uppercase tracking-widest">Total Pengurangan Piutang</span>
                            <span class="text-xl font-black text-indigo-600">${formatCurrency(cn.amount)}</span>
                        </div>
                    </div>
                </div>
            </div>

            <div class="grid grid-cols-2 gap-8 mt-8 text-center">
                <div class="flex flex-col items-center">
                    <p class="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-10">Disiapkan Oleh,</p>
                    <div class="w-40 h-px bg-slate-300 mb-2"></div>
                    <p class="text-xs font-black text-slate-800 uppercase tracking-tighter italic">( Administrasi Finance )</p>
                </div>
                <div class="flex flex-col items-center">
                    <p class="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-10">Disetujui Oleh,</p>
                    <div class="w-40 h-px bg-slate-300 mb-2"></div>
                    <p class="text-xs font-black text-slate-800 uppercase tracking-tighter italic">${customer ? customer.name : '( Tanda Tangan Pelanggan )'}</p>
                </div>
            </div>

            <div class="mt-8 pt-4 border-t border-slate-50 text-center">
                <p class="text-[8px] text-slate-300 font-black uppercase tracking-[0.5em]">Unity ERP - Finance Management System</p>
            </div>
        </div>
    `;

    const footer = `
        <div class="flex w-full justify-between gap-4">
            <div class="flex gap-2">
                <button onclick='printHTML(\`${printableHTML.replace(/`/g, "\\`").replace(/\n/g, "")}\`, "Credit Note ${cn.noteNumber}")' class="inline-flex items-center px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-bold hover:bg-indigo-700 shadow-lg shadow-indigo-100 transition-all active:scale-95">
                    <i class="fas fa-file-pdf mr-2 text-xs"></i> SAVE AS PDF
                </button>
                <button onclick="openSendCreditNoteModal('${cn.id}')" class="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-bold hover:bg-blue-700 shadow-lg shadow-blue-100 transition-all active:scale-95">
                    <i class="fas fa-paper-plane mr-2 text-xs"></i> KIRIM
                </button>
            </div>
            <button onclick="closeModal()" class="px-6 py-2 text-sm font-bold text-gray-500 hover:bg-gray-100 rounded-lg transition-all">TUTUP</button>
        </div>
    `;

    showModal(`Credit Note Detail - ${cn.noteNumber}`, printableHTML, footer, 'lg');
};

window.viewDebitNote = function (id) {
    const dn = db.findById('debitNotes', id);
    const supplier = db.findById('suppliers', dn.supplierId);
    const invoice = dn.invoiceId ? db.findById('purchaseInvoices', dn.invoiceId) : null;

    const printableHTML = `
        <div class="max-w-4xl mx-auto bg-white p-6 border border-gray-100 shadow-sm rounded-2xl">
            <div id="print-internal-header" class="flex justify-between items-start mb-6 pb-4 border-b-2 border-gray-50">
                <div>
                    <div class="bg-blue-600 text-white px-3 py-1 rounded text-[10px] font-black uppercase tracking-widest mb-2 inline-block">Debit Note</div>
                    <h2 class="text-4xl font-black text-slate-800 tracking-tight">${dn.noteNumber}</h2>
                    <p class="text-xs text-slate-400 mt-1 font-medium italic">Tanggal: <span class="text-blue-600 font-bold">${formatDate(dn.date).slice(0, 10)}</span></p>
                </div>
                <div class="text-right flex flex-col items-end">
                    ${CONFIG.logo ? `<img src="${CONFIG.logo}" class="h-10 w-auto object-contain mb-3">` : ''}
                    <h1 class="text-xl font-black text-slate-900 leading-none">${CONFIG.companyName}</h1>
                    <p class="text-[9px] text-slate-500 max-w-[220px] leading-relaxed mt-2 uppercase font-bold tracking-tight">${CONFIG.companyAddress}</p>
                </div>
            </div>

            <div class="grid grid-cols-2 gap-8 mb-6">
                <div class="bg-slate-50 p-5 rounded-2xl border border-slate-100 shadow-inner">
                    <h3 class="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                        <i class="fas fa-university text-orange-500 text-sm"></i> SUPPLIER
                    </h3>
                    <p class="text-lg font-black text-slate-800 leading-tight mb-1">${supplier ? supplier.name : 'Unknown Supplier'}</p>
                    <p class="text-xs text-slate-500 leading-relaxed font-medium italic">${supplier?.address || '-'}</p>
                    <p class="text-xs text-slate-600 font-bold mt-2">${supplier?.phone || '-'}</p>
                </div>
                <div class="text-right">
                    <h3 class="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-3 flex items-center justify-end gap-2">
                        REFERENSI <i class="fas fa-receipt text-blue-500 text-sm"></i>
                    </h3>
                    <p class="text-xs text-slate-500 font-bold uppercase tracking-tighter mb-1">Tagihan Terkait</p>
                    <p class="text-sm font-black text-slate-800 mb-4">${invoice ? invoice.invoiceNumber : 'Umum / Tanpa Invoice'}</p>
                    <p class="text-xs text-slate-500 font-bold uppercase tracking-tighter mb-1">Status Dokumen</p>
                    <span class="inline-block px-4 py-1 rounded-full text-[10px] font-black tracking-widest bg-blue-600 text-white shadow-sm uppercase tracking-tighter">Debit Authorization</span>
                </div>
            </div>

            <div class="mb-6">
                <table class="w-full text-left border-collapse mb-6">
                    <thead>
                        <tr class="bg-orange-50 border-y-2 border-orange-100">
                            <th class="py-3 px-4 text-xs font-black text-orange-900 uppercase tracking-widest">Deskripsi Penyesuaian</th>
                            <th class="py-3 px-4 text-xs font-black text-orange-900 uppercase tracking-widest text-right">Tipe Pajak</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr class="border-b border-gray-100">
                            <td class="py-4 px-4 text-sm font-medium text-slate-800">${dn.notes || 'Penyesuaian Dokumen'}</td>
                            <td class="py-4 px-4 text-sm font-bold text-slate-500 text-right">${(dn.taxType === 'TAX' || dn.taxType === 'A') ? 'Termasuk PPN' : 'Non-Tax'}</td>
                        </tr>
                    </tbody>
                </table>

                <div class="flex justify-end">
                    <div class="w-80 bg-slate-50 p-5 rounded-2xl border border-slate-100">
                        ${(dn.taxType === 'TAX' || dn.taxType === 'A') ? `
                            <div class="flex justify-between mb-3 border-b border-dashed border-slate-200 pb-2">
                                <span class="text-[10px] font-bold text-slate-500 uppercase tracking-widest">DPP (Dasar Pengenaan Pajak)</span>
                                <span class="text-sm font-bold text-slate-700">${formatCurrency(Math.round(dn.amount / 1.11))}</span>
                            </div>
                            <div class="flex justify-between mb-3 border-b border-slate-200 pb-3">
                                <span class="text-[10px] font-bold text-slate-500 uppercase tracking-widest">PPN (11%)</span>
                                <span class="text-sm font-bold text-slate-700">${formatCurrency(Math.round(dn.amount - (dn.amount / 1.11)))}</span>
                            </div>
                        ` : ''}
                        <div class="flex justify-between items-center">
                            <span class="text-xs font-black text-orange-900 uppercase tracking-widest">Total Pengurangan Hutang</span>
                            <span class="text-xl font-black text-blue-600">${formatCurrency(dn.amount)}</span>
                        </div>
                    </div>
                </div>
            </div>

            <div class="grid grid-cols-2 gap-8 mt-8 text-center">
                <div class="flex flex-col items-center">
                    <p class="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-10">Hormat Kami,</p>
                    <div class="w-40 h-px bg-slate-300 mb-2"></div>
                    <p class="text-xs font-black text-slate-800 uppercase tracking-tighter italic">( Administrasi Finance )</p>
                </div>
                <div class="flex flex-col items-center">
                    <p class="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-10">Disetujui Oleh,</p>
                    <div class="w-40 h-px bg-slate-300 mb-2"></div>
                    <p class="text-xs font-black text-slate-800 uppercase tracking-tighter italic">${supplier ? supplier.name : '( Tanda Tangan Supplier )'}</p>
                </div>
            </div>

            <div class="mt-8 pt-4 border-t border-slate-50 text-center">
                <p class="text-[8px] text-slate-300 font-black uppercase tracking-[0.5em]">Unity ERP - Digital Ledger Document</p>
            </div>
        </div>
    `;

    const footer = `
        <div class="flex w-full justify-between gap-4">
            <div class="flex gap-2">
                <button onclick='printHTML(\`${printableHTML.replace(/`/g, "\\`").replace(/\n/g, "")}\`, "Debit Note ${dn.noteNumber}")' class="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-bold hover:bg-blue-700 shadow-lg shadow-blue-100 transition-all active:scale-95">
                    <i class="fas fa-file-pdf mr-2 text-xs"></i> SAVE AS PDF
                </button>
                <button onclick="openSendDebitNoteModal('${dn.id}')" class="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-bold hover:bg-blue-700 shadow-lg shadow-blue-100 transition-all active:scale-95">
                    <i class="fas fa-paper-plane mr-2 text-xs"></i> KIRIM
                </button>
            </div>
            <button onclick="closeModal()" class="px-6 py-2 text-sm font-bold text-gray-500 hover:bg-gray-100 rounded-lg transition-all">TUTUP</button>
        </div>
    `;

    showModal(`Debit Note Detail - ${dn.noteNumber}`, printableHTML, footer, 'lg');
};

window.openSendCreditNoteModal = function(id) {
    const cn = db.findById('creditNotes', id);
    const customer = db.findById('customers', cn.customerId);
    if (!customer) return;

    const body = `
        <div class="p-4 text-center">
            <p class="text-gray-600 mb-6 font-medium">Pilih metode pengiriman untuk Credit Note <strong>${cn.noteNumber}</strong>:</p>
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <button onclick="sendWACreditNote('${id}'); closeModal();" class="flex flex-col items-center justify-center p-6 border-2 border-green-100 rounded-xl hover:border-green-500 hover:bg-green-50 transition-all group">
                    <div class="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                        <i class="fab fa-whatsapp text-3xl text-green-600"></i>
                    </div>
                    <span class="font-bold text-green-700">WhatsApp</span>
                    <span class="text-[10px] text-green-500 mt-1 uppercase font-bold tracking-wider">Kirim ke Aplikasi</span>
                </button>
                
                <button onclick="sendEmailCreditNote('${id}'); closeModal();" class="flex flex-col items-center justify-center p-6 border-2 border-blue-100 rounded-xl hover:border-blue-500 hover:bg-blue-50 transition-all group">
                    <div class="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                        <i class="fas fa-envelope text-3xl text-blue-600"></i>
                    </div>
                    <span class="font-bold text-blue-700">Email</span>
                    <span class="text-[10px] text-blue-500 mt-1 uppercase font-bold tracking-wider">Kirim via Gmail</span>
                </button>
            </div>
        </div>
    `;
    const footer = `<button onclick="closeModal()" class="w-full sm:w-auto px-4 py-2 bg-gray-100 text-gray-700 rounded-md text-sm font-bold hover:bg-gray-200 transition">Batal</button>`;
    showModal('Pilih Metode Pengiriman', body, footer);
};

window.sendWACreditNote = (id) => {
    const cn = db.findById('creditNotes', id);
    const customer = db.findById('customers', cn.customerId);
    if (!customer || !customer.phone) { showToast('Nomor telepon pelanggan belum diatur', 'error'); return; }
    let phone = customer.phone.replace(/[^0-9]/g, '');
    if (phone.startsWith('0')) phone = '62' + phone.substring(1);
    const message = `Halo ${customer.name},%0A%0ABerikut adalah dokumen Credit Note *${cn.noteNumber}* senilai *${formatCurrency(cn.amount)}*.%0A%0ATerima kasih,%0A*${CONFIG.companyName}*`;
    window.open(`https://wa.me/${phone}?text=${message}`, '_blank');
};

window.sendEmailCreditNote = (id) => {
    const cn = db.findById('creditNotes', id);
    const customer = db.findById('customers', cn.customerId);
    if (!customer || !customer.email) { showToast('Email pelanggan belum diatur. Lengkapi di data Master.', 'error'); return; }
    const subject = `Credit Note ${cn.noteNumber} - ${CONFIG.companyName}`;
    const bodyText = `Halo ${customer.name},\n\nTerlampir detail dokumen Credit Note ${cn.noteNumber} senilai ${formatCurrency(cn.amount)}.\n\nTerima kasih,\n${CONFIG.companyName}`;
    window.location.href = `mailto:${customer.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(bodyText)}`;
};

window.openSendDebitNoteModal = function(id) {
    const dn = db.findById('debitNotes', id);
    const supplier = db.findById('suppliers', dn.supplierId);
    if (!supplier) return;

    const body = `
        <div class="p-4 text-center">
            <p class="text-gray-600 mb-6 font-medium">Pilih metode pengiriman untuk Debit Note <strong>${dn.noteNumber}</strong>:</p>
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <button onclick="sendWADebitNote('${id}'); closeModal();" class="flex flex-col items-center justify-center p-6 border-2 border-green-100 rounded-xl hover:border-green-500 hover:bg-green-50 transition-all group">
                    <div class="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                        <i class="fab fa-whatsapp text-3xl text-green-600"></i>
                    </div>
                    <span class="font-bold text-green-700">WhatsApp</span>
                    <span class="text-[10px] text-green-500 mt-1 uppercase font-bold tracking-wider">Kirim ke Aplikasi</span>
                </button>
                
                <button onclick="sendEmailDebitNote('${id}'); closeModal();" class="flex flex-col items-center justify-center p-6 border-2 border-blue-100 rounded-xl hover:border-blue-500 hover:bg-blue-50 transition-all group">
                    <div class="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                        <i class="fas fa-envelope text-3xl text-blue-600"></i>
                    </div>
                    <span class="font-bold text-blue-700">Email</span>
                    <span class="text-[10px] text-blue-500 mt-1 uppercase font-bold tracking-wider">Kirim via Gmail</span>
                </button>
            </div>
        </div>
    `;
    const footer = `<button onclick="closeModal()" class="w-full sm:w-auto px-4 py-2 bg-gray-100 text-gray-700 rounded-md text-sm font-bold hover:bg-gray-200 transition">Batal</button>`;
    showModal('Pilih Metode Pengiriman', body, footer);
};

window.sendWADebitNote = (id) => {
    const dn = db.findById('debitNotes', id);
    const supplier = db.findById('suppliers', dn.supplierId);
    if (!supplier || !supplier.phone) { showToast('Nomor telepon supplier belum diatur', 'error'); return; }
    let phone = supplier.phone.replace(/[^0-9]/g, '');
    if (phone.startsWith('0')) phone = '62' + phone.substring(1);
    const message = `Halo ${supplier.name},%0A%0ABerikut adalah dokumen Debit Note *${dn.noteNumber}* senilai *${formatCurrency(dn.amount)}*.%0A%0ATerima kasih,%0A*${CONFIG.companyName}*`;
    window.open(`https://wa.me/${phone}?text=${message}`, '_blank');
};

window.sendEmailDebitNote = (id) => {
    const dn = db.findById('debitNotes', id);
    const supplier = db.findById('suppliers', dn.supplierId);
    if (!supplier || !supplier.email) { showToast('Email supplier belum diatur. Lengkapi di data Master.', 'error'); return; }
    const subject = `Debit Note ${dn.noteNumber} - ${CONFIG.companyName}`;
    const bodyText = `Halo ${supplier.name},\n\nTerlampir detail dokumen Debit Note ${dn.noteNumber} senilai ${formatCurrency(dn.amount)}.\n\nTerima kasih,\n${CONFIG.companyName}`;
    window.location.href = `mailto:${supplier.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(bodyText)}`;
};

// --- Financial Reports (New Dedicated Pages) ---

window._reportFilters = window._reportFilters || { startDate: '', endDate: '' };

function getReportDates() {
    if (!window._reportFilters.startDate) {
        const now = new Date();
        window._reportFilters.startDate = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
        window._reportFilters.endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0];
    }
    return window._reportFilters;
}

window.applyReportFilters = (targetFunc) => {
    window._reportFilters.startDate = document.getElementById('filter_rep_start').value;
    window._reportFilters.endDate = document.getElementById('filter_rep_end').value;
    window[targetFunc]();
};

function renderReportFilterUI(funcName) {
    const dates = getReportDates();
    return `
        <div class="bg-white rounded-xl shadow-sm border border-slate-100 mb-6 overflow-hidden">
            <div onclick="toggleRepFilter()" class="flex items-center justify-between p-4 cursor-pointer hover:bg-slate-50 transition-colors select-none">
                <h3 class="text-[10px] font-black text-slate-800 uppercase tracking-[0.2em] flex items-center gap-3">
                    <i class="fas fa-filter text-blue-600"></i> FILTER LAPORAN
                </h3>
                <div class="flex items-center gap-3">
                    <span class="text-[9px] font-bold text-slate-400 uppercase tracking-widest">${window._uiState.repFilterOpen ? 'Sembunyikan' : 'Tampilkan'}</span>
                    <i class="fas fa-chevron-${window._uiState.repFilterOpen ? 'up' : 'down'} text-slate-300 text-xs"></i>
                </div>
            </div>

            <div class="${window._uiState.repFilterOpen ? 'block' : 'hidden'} p-5 border-t border-slate-50 animate-in slide-in-from-top-2 duration-200">
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4 items-end">
                    <div>
                        <label class="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Dari Tanggal</label>
                        <input type="date" id="filter_rep_start" value="${dates.startDate}" class="w-full border-2 border-slate-100 rounded-lg px-3 py-2 text-sm font-bold text-slate-700 bg-slate-50/50 outline-none focus:border-blue-500 transition-all cursor-pointer">
                    </div>
                    <div>
                        <label class="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Sampai Tanggal</label>
                        <input type="date" id="filter_rep_end" value="${dates.endDate}" class="w-full border-2 border-slate-100 rounded-lg px-3 py-2 text-sm font-bold text-slate-700 bg-slate-50/50 outline-none focus:border-blue-500 transition-all cursor-pointer">
                    </div>
                </div>
                <div class="flex gap-2 pt-4 mt-4 border-t border-slate-50">
                    <button onclick="applyReportFilters('${funcName}')" class="bg-blue-600 hover:bg-slate-900 text-white px-8 py-2.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all shadow-lg active:scale-95">
                        <i class="fas fa-search mr-2"></i> TAMPILKAN DATA
                    </button>
                    <button onclick="printFinanceReport()" class="bg-gray-800 hover:bg-black text-white px-8 py-2.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all">
                        <i class="fas fa-print mr-2"></i> CETAK
                    </button>
                </div>
            </div>
        </div>
    `;
}

window.toggleRepFilter = function() {
    window._uiState.repFilterOpen = !window._uiState.repFilterOpen;
    // We don't know which report we are on, but a general re-render of current view would work
    // Or just manually toggle current DOM if we want performance.
    // For simplicity, we can reload current page via its stored name if we track it.
    // But most reports re-render automatically on filter change anyway.
    // Let's just do a manual toggle for report filter UI because it's a helper.
    const block = document.querySelector('[onclick="toggleRepFilter()"]').nextElementSibling;
    const span = document.querySelector('[onclick="toggleRepFilter()"] span');
    const icon = document.querySelector('[onclick="toggleRepFilter()"] i.fa-chevron-up, [onclick="toggleRepFilter()"] i.fa-chevron-down');
    
    if (block.classList.contains('hidden')) {
        block.classList.remove('hidden');
        block.classList.add('block');
        if (span) span.innerText = 'Sembunyikan';
        if (icon) { icon.classList.remove('fa-chevron-down'); icon.classList.add('fa-chevron-up'); }
    } else {
        block.classList.add('hidden');
        block.classList.remove('block');
        if (span) span.innerText = 'Tampilkan';
        if (icon) { icon.classList.remove('fa-chevron-up'); icon.classList.add('fa-chevron-down'); }
    }
};

// 1. LAPORAN HPP
window.renderFinanceHPP = function () {
    document.getElementById('pageTitle').innerText = 'Laporan Harga Pokok Penjualan (HPP)';
    const mc = document.getElementById('main-content');
    const dates = getReportDates();
    const from = new Date(dates.startDate); from.setHours(0,0,0,0);
    const to = new Date(dates.endDate); to.setHours(23,59,59,999);

    const entries = db.read('journalEntries').filter(e => {
        const d = new Date(e.date);
        return d >= from && d <= to;
    });

    let totalHPP = 0;
    entries.forEach(e => {
        e.items.forEach(item => {
            if (item.accountId === 'acc_cogs') {
                totalHPP += (parseFloat(item.debit) || 0) - (parseFloat(item.credit) || 0);
            }
        });
    });

    const filterHtml = renderReportFilterUI('renderFinanceHPP');

    mc.innerHTML = `
        ${filterHtml}
        <div class="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden printable-area max-w-4xl mx-auto">
             <div id="print-internal-header" class="p-8 border-b border-gray-100 bg-gray-50 text-center">
                <h3 class="text-xl font-bold text-gray-800 uppercase tracking-tight">LAPORAN HARGA POKOK PENJUALAN</h3>
                <p class="text-xs text-gray-500 font-medium uppercase tracking-widest mt-1">Periode: ${dates.startDate} s/d ${dates.endDate}</p>
            </div>
            <div class="p-8 space-y-6">
                <div class="flex justify-between items-center py-4 border-b border-gray-100">
                    <span class="text-sm font-medium text-gray-500 uppercase tracking-wider">Akumulasi HPP Terjurnal (COGS)</span>
                    <span class="text-lg font-bold text-gray-800">${formatCurrency(Math.abs(totalHPP))}</span>
                </div>
                
                <div class="bg-blue-50 p-6 rounded-xl border border-blue-100 text-center">
                    <span class="block text-xs font-semibold text-blue-700 uppercase tracking-widest mb-1">TOTAL HPP PRODUK TERJUAL</span>
                    <span class="text-2xl font-bold text-blue-800">${formatCurrency(Math.abs(totalHPP))}</span>
                </div>

                <p class="text-[11px] text-gray-400 mt-8 text-center font-medium leading-relaxed">Sistem menerapkan metode Perpetual Inventory. HPP dicatat secara real-time pada setiap transaksi Pengiriman Barang (DO) dan Retur Penjualan berdasarkan harga perolehan.</p>
            </div>
        </div>
    `;
};

// 2. LAPORAN LABA RUGI
window.renderFinanceProfitLoss = function () {
    document.getElementById('pageTitle').innerText = 'Laporan Laba Rugi';
    const mc = document.getElementById('main-content');
    const dates = getReportDates();
    const accounts = db.read('accounts');
    const from = new Date(dates.startDate); from.setHours(0, 0, 0, 0);
    const to = new Date(dates.endDate); to.setHours(23, 59, 59, 999);

    const getPeriodBalance = (accId) => {
        const entries = db.read('journalEntries').filter(e => {
            const d = new Date(e.date);
            return d >= from && d <= to;
        });
        let bal = 0;
        entries.forEach(e => {
            e.items.forEach(item => {
                if (item.accountId === accId) {
                    bal += (parseFloat(item.debit) || 0) - (parseFloat(item.credit) || 0);
                }
            });
        });
        // For P&L, credit balance on income is positive, debit balance on expense is positive.
        const acc = accounts.find(a => a.id === accId);
        if (acc.type === 'INCOME') return -bal; // Income usually has credit balance
        return bal; // Expenses usually have debit balance
    };

    const incomeAccs = accounts.filter(a => a.type === 'INCOME');
    const expenseAccs = accounts.filter(a => a.type === 'EXPENSE');

    const totalIncome = incomeAccs.reduce((sum, a) => sum + getPeriodBalance(a.id), 0);
    const totalExpense = expenseAccs.reduce((sum, a) => sum + getPeriodBalance(a.id), 0);
    const profitBeforeTax = totalIncome - totalExpense;
    const taxRate = (CONFIG.taxRate || 11) / 100;
    const taxAmount = profitBeforeTax > 0 ? profitBeforeTax * taxRate : 0;
    const netProfit = profitBeforeTax - taxAmount;

    // Helper to format with Rp or not
    const format = (val, showRp = true) => {
        if (val === 0) return '0,00';
        let f = formatCurrency(Math.abs(val)).replace('Rp ', '').trim();
        return (showRp ? 'Rp ' : '') + f;
    };

    const filterHtml = renderReportFilterUI('renderFinanceProfitLoss');

    mc.innerHTML = `
        ${filterHtml}
        <div class="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden printable-area max-w-4xl mx-auto p-12 font-serif text-gray-800">
            <!-- Header Section -->
            <div class="text-center mb-10">
                <h2 class="text-lg font-bold uppercase border-b-2 border-black inline-block px-4 pb-1">${CONFIG.companyName}</h2>
                <h1 class="text-xl font-bold mt-2">Laporan Laba Rugi</h1>
                <p class="text-sm italic">Periode: ${dates.startDate.split('-').reverse().join('/')} s/d ${dates.endDate.split('-').reverse().join('/')}</p>
            </div>

            <!-- Report Table -->
            <div class="w-full">
                <table class="w-full border-collapse">
                    <tbody>
                        <!-- PENDAPATAN SECTION -->
                        <tr class="font-bold border-t border-black">
                            <td class="py-2" colspan="3">Pendapatan</td>
                        </tr>
                        ${incomeAccs.map((a, idx) => `
                            <tr>
                                <td class="py-1 pl-4">${a.name}</td>
                                <td class="py-1 text-right w-48 ${idx === incomeAccs.length - 1 ? 'border-b border-black' : ''}">
                                    ${idx === 0 ? format(getPeriodBalance(a.id)) : format(getPeriodBalance(a.id), false)}
                                </td>
                                <td class="py-1 w-48"></td>
                            </tr>
                        `).join('')}
                        <tr class="font-bold">
                            <td class="py-2 pl-8">Total Pendapatan</td>
                            <td></td>
                            <td class="py-2 text-right">${format(totalIncome)}</td>
                        </tr>

                        <!-- BEBAN SECTION -->
                        <tr class="font-bold">
                            <td class="py-2" colspan="3">Beban</td>
                        </tr>
                        ${expenseAccs.map((a, idx) => `
                            <tr>
                                <td class="py-1 pl-4">${a.name}</td>
                                <td class="py-1 text-right w-48 ${idx === expenseAccs.length - 1 ? 'border-b border-black' : ''}">
                                    ${idx === 0 ? format(getPeriodBalance(a.id)) : format(getPeriodBalance(a.id), false)}
                                </td>
                                <td class="py-1 w-48"></td>
                            </tr>
                        `).join('')}
                        <tr class="font-bold">
                            <td class="py-2 pl-8">Total Beban</td>
                            <td></td>
                            <td class="py-2 text-right border-b border-black">${format(totalExpense)}</td>
                        </tr>

                        <!-- SUMMARY SECTION -->
                        <tr class="font-bold">
                            <td class="py-3">Laba Sebelum Pajak</td>
                            <td></td>
                            <td class="py-3 text-right">${format(profitBeforeTax)}</td>
                        </tr>
                        <tr>
                            <td class="py-1">Pajak (${CONFIG.taxRate || 11}%)</td>
                            <td></td>
                            <td class="py-1 text-right border-b border-black">${format(taxAmount)}</td>
                        </tr>
                        <tr class="font-bold text-lg">
                            <td class="py-4">Laba Bersih</td>
                            <td></td>
                            <td class="py-4 text-right border-b-4 border-double border-black">${format(netProfit)}</td>
                        </tr>
                    </tbody>
                </table>
            </div>

            <!-- Signature Section (Optional but adds to the look) -->
            <div class="mt-16 flex justify-end">
                <div class="text-center w-64">
                    <p class="text-sm mb-20">${CONFIG.companyAddress.split(',')[0]}, ${new Date().toLocaleDateString('id-ID', {day:'numeric', month:'long', year:'numeric'})}</p>
                    <p class="font-bold border-b border-black inline-block px-10">Manager Keuangan</p>
                </div>
            </div>
        </div>

        <style>
            @media print {
                .printable-area { border: none !important; box-shadow: none !important; p: 0 !important; }
                body { background: white !important; }
            }
        </style>
    `;
};

// 3. NERACA SALDO
window.renderFinanceTrialBalance = function () {
    document.getElementById('pageTitle').innerText = 'Neraca Saldo (Trial Balance)';
    const mc = document.getElementById('main-content');
    const dates = getReportDates();
    const from = new Date(dates.startDate); from.setHours(0,0,0,0);
    const to = new Date(dates.endDate); to.setHours(23,59,59,999);
    
    const accounts = db.read('accounts').sort((a,b) => a.code.localeCompare(b.code));
    const entries = db.read('journalEntries').filter(e => {
        const d = new Date(e.date);
        return d >= from && d <= to;
    });

    let totalDebit = 0;
    let totalCredit = 0;

    const tbRows = accounts.map(acc => {
        let debitSum = 0;
        let creditSum = 0;
        
        entries.forEach(e => {
            e.items.forEach(item => {
                if (item.accountId === acc.id) {
                    debitSum += parseFloat(item.debit) || 0;
                    creditSum += parseFloat(item.credit) || 0;
                }
            });
        });

        let balance = debitSum - creditSum;
        if (balance === 0 && debitSum === 0 && creditSum === 0) return '';
        
        let finalDebit = 0;
        let finalCredit = 0;

        if (acc.type === 'ASSET' || acc.type === 'EXPENSE') {
             if (balance >= 0) finalDebit = balance;
             else finalCredit = Math.abs(balance);
        } else {
             if (balance <= 0) finalCredit = Math.abs(balance);
             else finalDebit = balance;
        }

        totalDebit += finalDebit;
        totalCredit += finalCredit;

        return `
            <tr class="border-b border-gray-50 text-[11px]">
                <td class="px-4 py-3 font-mono text-gray-500">${acc.code}</td>
                <td class="px-4 py-3 font-semibold text-gray-700">${acc.name}</td>
                <td class="px-4 py-3 text-right font-mono text-gray-800">${finalDebit > 0 ? formatCurrency(finalDebit).replace('Rp ', '').trim() : '0'}</td>
                <td class="px-4 py-3 text-right font-mono text-gray-800">${finalCredit > 0 ? formatCurrency(finalCredit).replace('Rp ', '').trim() : '0'}</td>
            </tr>
        `;
    }).join('');

    const isBalanced = Math.abs(totalDebit - totalCredit) < 1;
    const filterHtml = renderReportFilterUI('renderFinanceTrialBalance');

    mc.innerHTML = `
        ${filterHtml}
        <div class="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden printable-area p-8 font-sans max-w-4xl mx-auto">
            <div class="flex justify-between items-start mb-12">
                <div class="text-xs text-gray-400 leading-relaxed uppercase font-bold tracking-tighter">
                    <h2 class="text-sm font-bold text-gray-800 mb-1">${CONFIG.companyName}</h2>
                    <p>${CONFIG.companyAddress.split(',').slice(0, 2).join(',')}</p>
                    <p>Indonesia</p>
                </div>
                <div class="text-right">
                    <h1 class="text-2xl font-bold text-gray-800">Neraca Saldo</h1>
                    <p class="text-[10px] text-gray-400 uppercase tracking-widest font-bold mt-1">Trial Balance Document</p>
                </div>
            </div>

            <div class="mb-2">
                <table class="w-full text-left border-collapse">
                    <thead class="bg-gray-100/50">
                        <tr>
                            <th class="px-4 py-2 text-center text-[10px] font-bold text-gray-700 border-b border-gray-200" colspan="4">
                                Periode: ${dates.startDate.split('-').reverse().join('/')} s/d ${dates.endDate.split('-').reverse().join('/')}
                            </th>
                        </tr>
                        <tr class="text-[10px] uppercase tracking-wider font-bold text-gray-800">
                            <th class="px-4 py-3 border-b border-gray-200">Kode Akun</th>
                            <th class="px-4 py-3 border-b border-gray-200">Nama Akun</th>
                            <th class="px-4 py-3 border-b border-gray-200 text-right">Debit (Rp)</th>
                            <th class="px-4 py-3 border-b border-gray-200 text-right">Kredit (Rp)</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${tbRows || '<tr><td colspan="4" class="px-4 py-12 text-center text-gray-400 italic">Tidak ada transaksi pada periode ini.</td></tr>'}
                        
                        <tr class="border-t-2 border-gray-200 font-bold text-xs text-gray-800 bg-gray-50/30">
                            <td class="px-4 py-4" colspan="2">TOTAL SALDO AKHIR</td>
                            <td class="px-4 py-4 text-right font-mono">${formatCurrency(totalDebit).replace('Rp ', '').trim()}</td>
                            <td class="px-4 py-4 text-right font-mono">${formatCurrency(totalCredit).replace('Rp ', '').trim()}</td>
                        </tr>
                    </tbody>
                </table>
            </div>
            
            ${!isBalanced ? `
            <div class="mt-4 p-3 bg-red-50 text-red-600 text-[10px] font-bold text-center border border-red-100 rounded-lg">
                <i class="fas fa-exclamation-triangle mr-2"></i> PERINGATAN: NERACA TIDAK SEIMBANG! SELISIH: ${formatCurrency(Math.abs(totalDebit - totalCredit))}
            </div>
            ` : ''}

            <div class="mt-20 flex justify-between items-end text-[10px] text-gray-400 italic">
                <p>Dokumen ini dihasilkan secara otomatis oleh sistem akuntansi Unity ERP.</p>
                <p>Halaman 1 dari 1</p>
            </div>
        </div>
    `;
};

window.printFinanceReport = function() {
    const area = document.querySelector('.printable-area');
    if (!area) { showToast('Tidak ada laporan untuk dicetak', 'error'); return; }
    const title = document.getElementById('pageTitle').innerText + '_' + Date.now();
    printHTML(area.outerHTML, title);
};

window.renderFinanceARAging = function () {
    document.getElementById('pageTitle').innerText = 'Laporan Umur Piutang (AR Aging)';
    const mc = document.getElementById('main-content');
    
    const invoices = db.read('salesInvoices');
    const payments = db.read('payments');
    const customers = db.read('customers');
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Grouping invoices by customer
    const agingData = {};

    invoices.forEach(inv => {
        const invPayments = payments.filter(p => p.invoiceId === inv.id);
        const totalPaid = invPayments.reduce((sum, p) => sum + (parseFloat(p.amount) || 0), 0);
        const balance = (parseFloat(inv.totalAmount) || 0) - totalPaid;

        if (balance <= 0) return; // Only process unpaid or partially paid

        const invDate = new Date(inv.date);
        invDate.setHours(0, 0, 0, 0);
        const diffTime = Math.abs(today - invDate);
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        const customerId = inv.customerId;
        if (!agingData[customerId]) {
            agingData[customerId] = {
                name: inv.customerName || customers.find(c => c.id === customerId)?.name || 'Unknown',
                buckets: { current: 0, d1_30: 0, d31_60: 0, d61_90: 0, d91_120: 0, older: 0 },
                total: 0
            };
        }

        if (diffDays === 0) agingData[customerId].buckets.current += balance;
        else if (diffDays <= 30) agingData[customerId].buckets.d1_30 += balance;
        else if (diffDays <= 60) agingData[customerId].buckets.d31_60 += balance;
        else if (diffDays <= 90) agingData[customerId].buckets.d61_90 += balance;
        else if (diffDays <= 120) agingData[customerId].buckets.d91_120 += balance;
        else agingData[customerId].buckets.older += balance;

        agingData[customerId].total += balance;
    });

    const agingRows = Object.values(agingData).map(data => `
        <tr class="border-b border-gray-50 text-xs">
            <td class="px-4 py-3 font-semibold text-gray-700">${data.name}</td>
            <td class="px-4 py-3 text-right text-gray-400 font-mono">${data.buckets.current > 0 ? formatCurrency(data.buckets.current).replace('Rp ', '').trim() : '0'}</td>
            <td class="px-4 py-3 text-right text-gray-400 font-mono">${data.buckets.d1_30 > 0 ? formatCurrency(data.buckets.d1_30).replace('Rp ', '').trim() : '0'}</td>
            <td class="px-4 py-3 text-right text-gray-400 font-mono">${data.buckets.d31_60 > 0 ? formatCurrency(data.buckets.d31_60).replace('Rp ', '').trim() : '0'}</td>
            <td class="px-4 py-3 text-right text-gray-800 font-bold font-mono">${data.buckets.d61_90 > 0 ? formatCurrency(data.buckets.d61_90).replace('Rp ', '').trim() : '0'}</td>
            <td class="px-4 py-3 text-right text-gray-400 font-mono">${data.buckets.d91_120 > 0 ? formatCurrency(data.buckets.d91_120).replace('Rp ', '').trim() : '0'}</td>
            <td class="px-4 py-3 text-right text-gray-400 font-mono">${data.buckets.older > 0 ? formatCurrency(data.buckets.older).replace('Rp ', '').trim() : '0'}</td>
            <td class="px-4 py-3 text-right font-bold text-gray-800 font-mono">${formatCurrency(data.total).replace('Rp ', '').trim()}</td>
        </tr>
    `).join('');

    const totals = Object.values(agingData).reduce((t, data) => {
        t.current += data.buckets.current;
        t.d1_30 += data.buckets.d1_30;
        t.d31_60 += data.buckets.d31_60;
        t.d61_90 += data.buckets.d61_90;
        t.d91_120 += data.buckets.d91_120;
        t.older += data.buckets.older;
        t.grandTotal += data.total;
        return t;
    }, { current: 0, d1_30: 0, d31_60: 0, d61_90: 0, d91_120: 0, older: 0, grandTotal: 0 });

    mc.innerHTML = `
        <div class="flex justify-end mb-4">
             <button onclick="printFinanceReport()" class="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-bold shadow-md hover:bg-blue-700 transition-all">
                <i class="fas fa-print mr-2"></i> Print Laporan
            </button>
        </div>

        <div class="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden printable-area p-8 font-sans max-w-6xl mx-auto">
            <div class="flex justify-between items-start mb-12">
                <div class="text-xs text-gray-500 leading-relaxed">
                    <h2 class="text-sm font-bold text-gray-800 mb-1">PT Tana Subur Nusantara</h2>
                    <p>Jl. Akses Tol Karawang Tim., Anggadita, Kec. Klari</p>
                    <p>Karawang JB 41371</p>
                    <p>Indonesia</p>
                    <p class="font-bold mt-2">NPWP:</p>
                </div>
                <div class="text-right">
                    <h1 class="text-2xl font-bold text-gray-800">Umur Piutang</h1>
                </div>
            </div>

            <div class="mb-2">
                <table class="w-full text-left border-collapse">
                    <thead class="bg-gray-100/50">
                        <tr>
                            <th class="px-4 py-2 text-center text-[10px] font-bold text-gray-700 border-b border-gray-200" colspan="8">
                                Sebagai ${new Date().toLocaleDateString('id-ID', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                            </th>
                        </tr>
                        <tr class="text-[10px] uppercase tracking-wider font-bold text-gray-800">
                            <th class="px-4 py-3 border-b border-gray-200">Tanggal Faktur</th>
                            <th class="px-4 py-3 border-b border-gray-200 text-right">Pada tanggal</th>
                            <th class="px-4 py-3 border-b border-gray-200 text-right">1-30</th>
                            <th class="px-4 py-3 border-b border-gray-200 text-right">31-60</th>
                            <th class="px-4 py-3 border-b border-gray-200 text-right">61-90</th>
                            <th class="px-4 py-3 border-b border-gray-200 text-right">91-120</th>
                            <th class="px-4 py-3 border-b border-gray-200 text-right">Lebih Tua</th>
                            <th class="px-4 py-3 border-b border-gray-200 text-right">Total</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr class="bg-gray-50/50">
                            <td colspan="8" class="px-4 py-2 text-[11px] font-bold text-gray-800">Umur Piutang</td>
                        </tr>
                        ${agingRows || '<tr><td colspan="8" class="px-4 py-8 text-center text-gray-400 italic">Tidak ada piutang aktif.</td></tr>'}
                        
                        <tr class="border-t-2 border-gray-200 font-bold text-xs text-gray-800">
                            <td class="px-4 py-4">Total Umur Piutang</td>
                            <td class="px-4 py-4 text-right font-mono">${totals.current > 0 ? formatCurrency(totals.current).replace('Rp ', '').trim() : '0'}</td>
                            <td class="px-4 py-4 text-right font-mono">${totals.d1_30 > 0 ? formatCurrency(totals.d1_30).replace('Rp ', '').trim() : '0'}</td>
                            <td class="px-4 py-4 text-right font-mono">${totals.d31_60 > 0 ? formatCurrency(totals.d31_60).replace('Rp ', '').trim() : '0'}</td>
                            <td class="px-4 py-4 text-right font-mono uppercase">${totals.d61_90 > 0 ? formatCurrency(totals.d61_90).replace('Rp ', '').trim() : '0'}</td>
                            <td class="px-4 py-4 text-right font-mono">${totals.d91_120 > 0 ? formatCurrency(totals.d91_120).replace('Rp ', '').trim() : '0'}</td>
                            <td class="px-4 py-4 text-right font-mono">${totals.older > 0 ? formatCurrency(totals.older).replace('Rp ', '').trim() : '0'}</td>
                            <td class="px-4 py-4 text-right font-mono">${formatCurrency(totals.grandTotal).replace('Rp ', '').trim()}</td>
                        </tr>
                    </tbody>
                </table>
            </div>
            
            <div class="mt-20 flex justify-between items-end text-[10px] text-gray-400">
                <div>
                     <p>Laporan ini dihasilkan secara otomatis oleh sistem.</p>
                </div>
            </div>
        </div>
    `;
};

// 5. LAPORAN UMUR UTANG (AP AGING)
window.renderFinanceAPAging = function () {
    document.getElementById('pageTitle').innerText = 'Laporan Umur Utang (AP Aging)';
    const mc = document.getElementById('main-content');
    
    const invoices = db.read('purchaseInvoices');
    const payments = db.read('supplierPayments');
    const suppliers = db.read('suppliers');
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Grouping invoices by supplier
    const agingData = {};

    invoices.forEach(inv => {
        const invPayments = payments.filter(p => p.invoiceId === inv.id);
        const totalPaid = invPayments.reduce((sum, p) => sum + (parseFloat(p.amount) || 0), 0);
        const balance = (parseFloat(inv.totalAmount) || 0) - totalPaid;

        if (balance <= 0) return; // Only process unpaid or partially paid

        const invDate = new Date(inv.date);
        invDate.setHours(0, 0, 0, 0);
        const diffTime = Math.abs(today - invDate);
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        const supplierId = inv.supplierId;
        if (!agingData[supplierId]) {
            const sup = suppliers.find(s => s.id === supplierId) || { name: 'Unknown' };
            agingData[supplierId] = {
                name: sup.name,
                buckets: { current: 0, d1_30: 0, d31_60: 0, d61_90: 0, d91_120: 0, older: 0 },
                total: 0
            };
        }

        if (diffDays === 0) agingData[supplierId].buckets.current += balance;
        else if (diffDays <= 30) agingData[supplierId].buckets.d1_30 += balance;
        else if (diffDays <= 60) agingData[supplierId].buckets.d31_60 += balance;
        else if (diffDays <= 90) agingData[supplierId].buckets.d61_90 += balance;
        else if (diffDays <= 120) agingData[supplierId].buckets.d91_120 += balance;
        else agingData[supplierId].buckets.older += balance;

        agingData[supplierId].total += balance;
    });

    const agingRows = Object.values(agingData).map(data => `
        <tr class="border-b border-gray-50 text-xs">
            <td class="px-4 py-3 font-semibold text-gray-700">${data.name}</td>
            <td class="px-4 py-3 text-right text-gray-400 font-mono">${data.buckets.current > 0 ? formatCurrency(data.buckets.current).replace('Rp ', '').trim() : '0'}</td>
            <td class="px-4 py-3 text-right text-gray-400 font-mono">${data.buckets.d1_30 > 0 ? formatCurrency(data.buckets.d1_30).replace('Rp ', '').trim() : '0'}</td>
            <td class="px-4 py-3 text-right text-gray-400 font-mono">${data.buckets.d31_60 > 0 ? formatCurrency(data.buckets.d31_60).replace('Rp ', '').trim() : '0'}</td>
            <td class="px-4 py-3 text-right text-gray-800 font-bold font-mono">${data.buckets.d61_90 > 0 ? formatCurrency(data.buckets.d61_90).replace('Rp ', '').trim() : '0'}</td>
            <td class="px-4 py-3 text-right text-gray-400 font-mono">${data.buckets.d91_120 > 0 ? formatCurrency(data.buckets.d91_120).replace('Rp ', '').trim() : '0'}</td>
            <td class="px-4 py-3 text-right text-gray-400 font-mono">${data.buckets.older > 0 ? formatCurrency(data.buckets.older).replace('Rp ', '').trim() : '0'}</td>
            <td class="px-4 py-3 text-right font-bold text-gray-800 font-mono">${formatCurrency(data.total).replace('Rp ', '').trim()}</td>
        </tr>
    `).join('');

    const totals = Object.values(agingData).reduce((t, data) => {
        t.current += data.buckets.current;
        t.d1_30 += data.buckets.d1_30;
        t.d31_60 += data.buckets.d31_60;
        t.d61_90 += data.buckets.d61_90;
        t.d91_120 += data.buckets.d91_120;
        t.older += data.buckets.older;
        t.grandTotal += data.total;
        return t;
    }, { current: 0, d1_30: 0, d31_60: 0, d61_90: 0, d91_120: 0, older: 0, grandTotal: 0 });

    mc.innerHTML = `
        <div class="flex justify-end mb-4">
             <button onclick="printFinanceReport()" class="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-bold shadow-md hover:bg-blue-700 transition-all">
                <i class="fas fa-print mr-2"></i> Print Laporan
            </button>
        </div>

        <div class="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden printable-area p-8 font-sans max-w-6xl mx-auto">
            <div class="flex justify-between items-start mb-12">
                <div class="text-xs text-gray-500 leading-relaxed">
                    <h2 class="text-sm font-bold text-gray-800 mb-1">${CONFIG.companyName}</h2>
                    <p>${CONFIG.companyAddress}</p>
                    <p>Indonesia</p>
                    <p class="font-bold mt-2">NPWP:</p>
                </div>
                <div class="text-right">
                    <h1 class="text-2xl font-bold text-gray-800 uppercase">Umur Utang Dagang</h1>
                </div>
            </div>

            <div class="mb-2">
                <table class="w-full text-left border-collapse">
                    <thead class="bg-gray-100/50">
                        <tr>
                            <th class="px-4 py-2 text-center text-[10px] font-bold text-gray-700 border-b border-gray-200" colspan="8">
                                Sebagai ${new Date().toLocaleDateString('id-ID', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                            </th>
                        </tr>
                        <tr class="text-[10px] uppercase tracking-wider font-bold text-gray-800">
                            <th class="px-4 py-3 border-b border-gray-200">Tanggal Faktur</th>
                            <th class="px-4 py-3 border-b border-gray-200 text-right">Pada tanggal</th>
                            <th class="px-4 py-3 border-b border-gray-200 text-right">1-30</th>
                            <th class="px-4 py-3 border-b border-gray-200 text-right">31-60</th>
                            <th class="px-4 py-3 border-b border-gray-200 text-right">61-90</th>
                            <th class="px-4 py-3 border-b border-gray-200 text-right">91-120</th>
                            <th class="px-4 py-3 border-b border-gray-200 text-right">Lebih Tua</th>
                            <th class="px-4 py-3 border-b border-gray-200 text-right">Total</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr class="bg-gray-50/50">
                            <td colspan="8" class="px-4 py-2 text-[11px] font-bold text-gray-800">Umur Utang Dagang</td>
                        </tr>
                        ${agingRows || '<tr><td colspan="8" class="px-4 py-8 text-center text-gray-400 italic">Tidak ada utang dagang aktif.</td></tr>'}
                        
                        <tr class="border-t-2 border-gray-200 font-bold text-xs text-gray-800">
                            <td class="px-4 py-4">Total Umur Utang Dagang</td>
                            <td class="px-4 py-4 text-right font-mono">${totals.current > 0 ? formatCurrency(totals.current).replace('Rp ', '').trim() : '0'}</td>
                            <td class="px-4 py-4 text-right font-mono">${totals.d1_30 > 0 ? formatCurrency(totals.d1_30).replace('Rp ', '').trim() : '0'}</td>
                            <td class="px-4 py-4 text-right font-mono">${totals.d31_60 > 0 ? formatCurrency(totals.d31_60).replace('Rp ', '').trim() : '0'}</td>
                            <td class="px-4 py-4 text-right font-mono uppercase">${totals.d61_90 > 0 ? formatCurrency(totals.d61_90).replace('Rp ', '').trim() : '0'}</td>
                            <td class="px-4 py-4 text-right font-mono">${totals.d91_120 > 0 ? formatCurrency(totals.d91_120).replace('Rp ', '').trim() : '0'}</td>
                            <td class="px-4 py-4 text-right font-mono">${totals.older > 0 ? formatCurrency(totals.older).replace('Rp ', '').trim() : '0'}</td>
                            <td class="px-4 py-4 text-right font-mono">${formatCurrency(totals.grandTotal).replace('Rp ', '').trim()}</td>
                        </tr>
                    </tbody>
                </table>
            </div>
            
            <div class="mt-20 flex justify-between items-end text-[10px] text-gray-400">
                <div>
                     <p>Laporan ini dihasilkan secara otomatis oleh sistem.</p>
                </div>
            </div>
        </div>
    `;
};




