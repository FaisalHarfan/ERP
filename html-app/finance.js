// finance.js - Finance Module Logic

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
    const totalAR = db.read('salesInvoices').filter(i => i.status === 'UNPAID').reduce((sum, i) => sum + (parseFloat(i.totalAmount) || 0), 0);
    const totalAP = db.read('purchaseInvoices').filter(i => i.status === 'UNPAID').reduce((sum, i) => sum + (parseFloat(i.totalAmount) || 0), 0);

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
    const accounts = db.read('accounts');

    mc.innerHTML = `
        <div class="flex flex-col gap-6">
            <div class="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                <div class="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                    <div>
                        <h3 class="font-bold text-gray-700 text-lg">Daftar Akun</h3>
                        <p class="text-xs text-gray-500">Kelola kategori keuangan perusahaan</p>
                    </div>
                    <button onclick="openAccountModal()" class="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-bold hover:bg-blue-700 transition-colors shadow-sm">
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
                                            <button class="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:bg-blue-50 hover:text-blue-600 transition-all"><i class="fas fa-edit text-xs"></i></button>
                                            <button onclick="deleteAccount('${a.id}')" class="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:bg-red-50 hover:text-red-600 transition-all"><i class="fas fa-trash text-xs"></i></button>
                                        </div>
                                    </td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    `;
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

window.openAccountModal = function () {
    const body = `
        <form id="accountForm" class="space-y-4">
            <div class="grid grid-cols-2 gap-4">
                <div>
                    <label class="block text-xs font-bold text-gray-500 mb-1">Kode Akun</label>
                    <input type="text" id="accCode" class="w-full border border-gray-200 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none" placeholder="Misal: 1101" required>
                </div>
                <div>
                    <label class="block text-xs font-bold text-gray-500 mb-1">Nama Akun</label>
                    <input type="text" id="accName" class="w-full border border-gray-200 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none" placeholder="Misal: Kas Utama" required>
                </div>
            </div>
            <div>
                <label class="block text-xs font-bold text-gray-500 mb-1">Tipe Akun</label>
                <select id="accType" class="w-full border border-gray-200 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none">
                    <option value="ASSET">Aset (Harta)</option>
                    <option value="LIABILITY">Liabilitas (Hutang)</option>
                    <option value="EQUITY">Ekuitas (Modal)</option>
                    <option value="INCOME">Pendapatan</option>
                    <option value="EXPENSE">Beban/Biaya</option>
                </select>
            </div>
            <div>
                <label class="block text-xs font-bold text-gray-500 mb-1">Deskripsi</label>
                <textarea id="accDesc" class="w-full border border-gray-200 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none" rows="2" placeholder="Penjelasan singkat penggunaan akun..."></textarea>
            </div>
        </form>
    `;
    const footer = `
        <button onclick="saveAccount()" class="px-6 py-2 bg-blue-600 text-white rounded-lg text-sm font-bold shadow-md hover:bg-blue-700 transition-colors">Simpan Akun</button>
        <button onclick="closeModal()" class="px-4 py-2 bg-gray-100 text-gray-600 rounded-lg text-sm font-bold mr-2">Batal</button>
    `;
    showModal('Tambah Akun Baru', body, footer);
};

window.saveAccount = function () {
    const code = document.getElementById('accCode').value;
    const name = document.getElementById('accName').value;
    const type = document.getElementById('accType').value;
    const description = document.getElementById('accDesc').value;

    if (!code || !name) return alert('Mohon isi kode dan nama akun.');

    db.insert('accounts', { code, name, type, description, status: 'ACTIVE' });
    closeModal();
    showToast('Akun berhasil ditambahkan');
    renderFinanceAccounts();
};

window.renderFinanceExpenses = function () {
    document.getElementById('pageTitle').innerText = 'Manajemen Pengeluaran & Biaya';
    const mc = document.getElementById('main-content');
    const expenses = db.read('expenses');

    mc.innerHTML = `
        <div class="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <div class="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                <div>
                    <h3 class="font-bold text-gray-700 text-lg">Riwayat Biaya</h3>
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
                            <th class="px-6 py-3 border-b border-gray-100">Keterangan</th>
                            <th class="px-6 py-3 border-b border-gray-100">Departemen</th>
                            <th class="px-6 py-3 border-b border-gray-100">Akun (Kas)</th>
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
                                <td class="px-6 py-4 text-gray-600">${e.description}</td>
                                <td class="px-6 py-4">
                                    <span class="px-2 py-0.5 bg-gray-100 text-gray-600 rounded-md text-[10px] uppercase font-bold">
                                        ${db.findById('departments', e.departmentId)?.name || '-'}
                                    </span>
                                </td>
                                <td class="px-6 py-4 text-gray-600 text-xs">${db.findById('accounts', e.fromAccountId)?.name || '-'}</td>
                                <td class="px-6 py-4 text-right font-bold text-red-600">${formatCurrency(e.amount)}</td>
                            </tr>
                        `).join('') || '<tr><td colspan="5" class="px-6 py-12 text-center text-gray-400 italic">Belum ada pengeluaran yang dicatat.</td></tr>'}
                    </tbody>
                </table>
            </div>
        </div>
    `;
};

window.openExpenseModal = function () {
    const assetAccounts = db.read('accounts').filter(a => a.type === 'ASSET' && a.code.startsWith('11'));
    const expenseAccounts = db.read('accounts').filter(a => a.type === 'EXPENSE');
    const depts = db.read('departments');

    const body = `
        <form id="expenseForm" class="space-y-4">
            <div class="grid grid-cols-2 gap-4">
                <div>
                    <label class="block text-xs font-bold text-gray-500 mb-1">Tanggal</label>
                    <input type="date" id="expDate" class="w-full border border-gray-200 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none" value="${new Date().toISOString().slice(0, 10)}">
                </div>
                <div>
                    <label class="block text-xs font-bold text-gray-500 mb-1">Jumlah (IDR)</label>
                    <input type="number" id="expAmount" class="w-full border border-gray-200 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none" placeholder="0" required>
                </div>
            </div>
            <div class="grid grid-cols-2 gap-4">
                <div>
                    <label class="block text-xs font-bold text-gray-500 mb-1">Bayar Dari (Kas/Bank)</label>
                    <select id="expFromAccount" class="w-full border border-gray-200 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none">
                        ${assetAccounts.map(a => `<option value="${a.id}">${a.name} (${a.code})</option>`).join('')}
                    </select>
                </div>
                <div>
                    <label class="block text-xs font-bold text-gray-500 mb-1">Departemen</label>
                    <select id="expDept" class="w-full border border-gray-200 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none">
                        <option value="">- Pilih Departemen -</option>
                        ${depts.map(d => `<option value="${d.id}">${d.name}</option>`).join('')}
                    </select>
                </div>
            </div>
            <div>
                <label class="block text-xs font-bold text-gray-500 mb-1">Kategori Biaya</label>
                <select id="expToAccount" class="w-full border border-gray-200 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none">
                    ${expenseAccounts.map(a => `<option value="${a.id}">${a.name} (${a.code})</option>`).join('')}
                </select>
            </div>
            <div>
                <label class="block text-xs font-bold text-gray-500 mb-1">Keterangan</label>
                <textarea id="expDesc" class="w-full border border-gray-200 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none" rows="2" placeholder="Misal: Bayar Listrik Kantor Maret 2024"></textarea>
            </div>
        </form>
    `;
    const footer = `
        <button onclick="saveExpense()" class="px-6 py-2 bg-red-600 text-white rounded-lg text-sm font-bold shadow-md hover:bg-red-700 transition-colors">Simpan Pengeluaran</button>
        <button onclick="closeModal()" class="px-4 py-2 bg-gray-100 text-gray-600 rounded-lg text-sm font-bold mr-2">Batal</button>
    `;
    showModal('Catat Pengeluaran Baru', body, footer);
};

window.saveExpense = function () {
    const date = document.getElementById('expDate').value;
    const amount = parseFloat(document.getElementById('expAmount').value);
    const fromAccId = document.getElementById('expFromAccount').value;
    const toAccId = document.getElementById('expToAccount').value;
    const deptId = document.getElementById('expDept').value;
    const desc = document.getElementById('expDesc').value;

    if (!amount || amount <= 0) return alert('Mohon isi jumlah pengeluaran.');

    const expenseNo = db.generateFinanceTxNo('EXPENSE');
    const expense = db.insert('expenses', {
        date, expenseNo, amount, fromAccountId: fromAccId, toAccountId: toAccId, departmentId: deptId, description: desc
    });

    // Create Journal Entry
    db.addJournalEntry({
        date, 
        journalNo: expenseNo, 
        description: desc, 
        items: [
            { accountId: toAccId, debit: amount, credit: 0 },
            { accountId: fromAccId, debit: 0, credit: amount }
        ], 
        referenceType: 'EXPENSE', 
        referenceId: expense.id, 
        departmentId: deptId
    });

    closeModal();
    showToast('Pengeluaran berhasil dicatat');
    renderFinanceExpenses();
};

window.renderFinanceJournal = function () {
    document.getElementById('pageTitle').innerText = 'Jurnal Umum (General Journal)';
    const mc = document.getElementById('main-content');
    const journal = db.read('journalEntries');

    mc.innerHTML = `
        <div class="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <div class="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                <div>
                     <h3 class="font-bold text-gray-700 text-lg">Semua Transaksi</h3>
                     <p class="text-xs text-gray-500 italic">Audit trail semua transaksi akuntansi</p>
                </div>
                <!-- Manual Journal Button (Placeholder) -->
                <button class="px-4 py-2 bg-gray-800 text-white rounded-lg text-sm font-bold opacity-50 cursor-not-allowed">
                    <i class="fas fa-plus mr-2"></i>Entri Jurnal
                </button>
            </div>
            <div class="overflow-x-auto">
                <table class="w-full text-left border-collapse table-fixed">
                    <thead class="bg-gray-50 text-slate-500 text-[11px] uppercase tracking-wider font-semibold">
                        <tr>
                            <th class="px-6 py-3 border-b border-gray-100 w-32">Keterangan</th>
                            <th class="px-6 py-3 border-b border-gray-100 w-64">Akun & Departemen</th>
                            <th class="px-6 py-3 border-b border-gray-100 text-right w-32">Debit</th>
                            <th class="px-6 py-3 border-b border-gray-100 text-right w-32">Kredit</th>
                        </tr>
                    </thead>
                    <tbody class="text-xs divide-y divide-gray-100">
                        ${journal.map(j => `
                            <tr class="bg-slate-50/50">
                                <td class="px-6 py-4" colspan="2">
                                    <div class="flex items-center gap-3">
                                        <div class="px-2 py-1 bg-blue-100 text-blue-700 rounded font-bold text-[9px]">${j.journalNo}</div>
                                        <div>
                                            <span class="font-bold text-gray-800">${j.description}</span>
                                            <span class="ml-2 text-[10px] text-gray-400">${formatDate(j.date).slice(0, 10)}</span>
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
                                        ${item.debit > 0 ? formatCurrency(item.debit) : '-'}
                                    </td>
                                    <td class="px-6 py-2 text-right ${item.credit > 0 ? 'font-bold text-gray-800' : 'text-gray-300'}">
                                        ${item.credit > 0 ? formatCurrency(item.credit) : '-'}
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

window.renderFinanceAR = function () {
    document.getElementById('pageTitle').innerText = 'Data Piutang (AR)';
    const mc = document.getElementById('main-content');
    const invoices = db.read('salesInvoices').filter(i => i.status === 'UNPAID');
    const payments = db.read('payments').sort((a, b) => new Date(b.date) - new Date(a.date));

    // Summary stats for AR
    const totalAR = invoices.reduce((sum, i) => sum + (parseFloat(i.totalAmount) || 0), 0);

    mc.innerHTML = `
        <div class="space-y-8">
            <div class="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                <div class="p-6 border-b border-gray-100 bg-gray-50/50 flex justify-between items-center">
                    <div>
                        <h3 class="font-bold text-gray-700">Daftar Faktur Penjualan Belum Lunas</h3>
                        <p class="text-xs text-gray-500">Total piutang aktif: <span class="font-bold text-orange-600">${formatCurrency(totalAR)}</span></p>
                    </div>
                    <button onclick="openFinanceARPaymentModal()" class="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-bold shadow-sm hover:bg-blue-700 transition-colors">
                        <i class="fas fa-plus mr-1"></i> Input Pelunasan Piutang
                    </button>
                </div>
                <div class="overflow-x-auto">
                    <table class="w-full text-left border-collapse">
                        <thead class="bg-gray-50 text-slate-500 text-[11px] uppercase tracking-wider font-semibold">
                            <tr>
                                <th class="px-6 py-3 border-b border-gray-100">Faktur</th>
                                <th class="px-6 py-3 border-b border-gray-100">Customer</th>
                                <th class="px-6 py-3 border-b border-gray-100">Tgl Jatuh Tempo</th>
                                <th class="px-6 py-3 border-b border-gray-100 text-right">Total</th>
                                <th class="px-6 py-3 border-b border-gray-100">Status</th>
                            </tr>
                        </thead>
                        <tbody class="text-sm divide-y divide-gray-100">
                            ${invoices.map(i => `
                                <tr>
                                    <td class="px-6 py-4">
                                        <div class="font-bold text-gray-800">${i.invoiceNumber}</div>
                                        <div class="text-[10px] text-gray-400">${formatDate(i.date).slice(0, 10)}</div>
                                    </td>
                                    <td class="px-6 py-4">
                                        <div class="text-gray-700 font-medium">${i.customerName || db.findById('customers', i.customerId)?.name || 'Unknown'}</div>
                                    </td>
                                    <td class="px-6 py-4 text-gray-600">${i.dueDate || '-'}</td>
                                    <td class="px-6 py-4 text-right font-bold text-blue-600">${formatCurrency(i.totalAmount)}</td>
                                    <td class="px-6 py-4">
                                        <span class="px-2 py-1 bg-red-100 text-red-700 rounded-full text-[10px] font-bold">UNPAID</span>
                                    </td>
                                </tr>
                            `).join('') || '<tr><td colspan="5" class="px-6 py-12 text-center text-gray-400">Tidak ada piutang aktif saat ini.</td></tr>'}
                        </tbody>
                    </table>
                </div>
            </div>

            <!-- PAYMENT HISTORY (RECEIVED FROM SALES) -->
            <div class="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                <div class="p-6 border-b border-gray-100 bg-slate-50/50">
                    <h3 class="font-bold text-gray-700 flex items-center gap-2">
                        <i class="fas fa-history text-green-500"></i> Riwayat Penerimaan Pembayaran (Sales)
                    </h3>
                    <p class="text-xs text-gray-500">Daftar pembayaran yang telah di-upload oleh tim Sales</p>
                </div>
                <div class="overflow-x-auto">
                    <table class="w-full text-left border-collapse">
                        <thead class="bg-gray-50 text-slate-500 text-[11px] uppercase tracking-wider font-semibold">
                            <tr>
                                <th class="px-6 py-3 border-b border-gray-100">Tgl & Ref</th>
                                <th class="px-6 py-3 border-b border-gray-100">Faktur</th>
                                <th class="px-6 py-3 border-b border-gray-100">Customer</th>
                                <th class="px-6 py-3 border-b border-gray-100">Metode</th>
                                <th class="px-6 py-3 border-b border-gray-100">Bukti Upload</th>
                                <th class="px-6 py-3 border-b border-gray-100 text-right">Jumlah</th>
                            </tr>
                        </thead>
                        <tbody class="text-sm divide-y divide-gray-100">
                            ${payments.map(p => {
                                const inv = db.findById('salesInvoices', p.invoiceId) || { invoiceNumber: '-', customerId: null };
                                const cust = db.findById('customers', inv.customerId) || { name: '-' };
                                return `
                                <tr class="hover:bg-green-50/30 transition-colors">
                                    <td class="px-6 py-4">
                                        <div class="text-[10px] text-gray-400 font-bold">${formatDate(p.date).slice(0, 10)}</div>
                                        <div class="font-bold text-gray-800">${p.paymentNumber}</div>
                                    </td>
                                    <td class="px-6 py-4 text-gray-600 font-medium">${inv.invoiceNumber}</td>
                                    <td class="px-6 py-4 text-gray-600">${cust.name}</td>
                                    <td class="px-6 py-4"><span class="px-2 py-0.5 bg-gray-100 rounded text-[10px] font-bold">${p.method}</span></td>
                                    <td class="px-6 py-4">
                                        ${p.proofReference ? `
                                            <a href="#" class="text-blue-600 font-bold hover:underline flex items-center gap-1" onclick="alert('Membuka file: ${p.proofReference}'); return false;">
                                                <i class="fas fa-image text-xs"></i> Lihat Bukti
                                            </a>
                                            <span class="text-[9px] text-gray-400 block mt-0.5">${p.proofReference}</span>
                                        ` : '<span class="text-gray-300 italic text-xs">Tidak ada bukti</span>'}
                                    </td>
                                    <td class="px-6 py-4 text-right font-bold text-green-600">${formatCurrency(p.amount)}</td>
                                </tr>
                            `}).join('') || '<tr><td colspan="6" class="px-6 py-12 text-center text-gray-400">Belum ada riwayat pembayaran.</td></tr>'}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    `;
};

// --- Finance AR Payment Feature ---
window.openFinanceARPaymentModal = () => {
    const invoices = db.read('salesInvoices');
    const payments = db.read('payments');
    const customers = db.read('customers');
    const assetAccounts = db.read('accounts').filter(a => a.type === 'ASSET' && a.code.startsWith('11'));

    const unpaidInvoices = invoices.filter(inv => inv.status === 'UNPAID');
    if (unpaidInvoices.length === 0) {
        showToast('Tidak ada invoice piutang yang belum dibayar.', 'error');
        return;
    }

    const invOptions = unpaidInvoices.map(inv => {
        const customer = customers.find(c => c.id === inv.customerId) || { name: 'Unknown' };
        const invPayments = payments.filter(p => p.invoiceId === inv.id);
        const totalPaid = invPayments.reduce((sum, p) => sum + parseFloat(p.amount), 0);
        const balance = inv.totalAmount - totalPaid;
        return `<option value="${inv.id}" data-balance="${balance}">${inv.invoiceNumber} - ${customer.name} (Sisa: ${formatCurrency(balance)})</option>`;
    }).join('');

    const body = `
        <div class="space-y-4">
            <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">Pilih Faktur Piutang (AR)</label>
                <select id="far_invoice_id" class="w-full border border-gray-300 rounded px-3 py-2 bg-white" onchange="updateFinanceARPaymentDefaultAmount()">
                    <option value="" disabled selected>Pilih Invoice...</option>
                    ${invOptions}
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
                <div>
                    <label class="block text-sm font-medium text-gray-700 mb-1">Jumlah Diterima (Rp)</label>
                    <input type="number" id="far_amount" placeholder="0" class="w-full border border-gray-300 rounded px-3 py-2 text-lg font-bold">
                </div>
            </div>
            <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">Lampiran Bukti Transfer (Opsional)</label>
                <div class="mt-1 flex justify-center px-4 pt-4 pb-4 border-2 border-dashed border-gray-300 rounded-md hover:border-blue-400 transition-colors bg-white">
                    <div class="space-y-1 text-center">
                        <i class="fas fa-paperclip text-gray-400 text-2xl mb-1"></i>
                        <div class="flex flex-col items-center text-sm text-gray-600">
                            <label for="far_proof_file" class="relative cursor-pointer bg-white rounded-md font-medium text-blue-600 hover:text-blue-500 mb-1">
                                <span id="far_proof_name_display" class="border border-blue-600 px-3 py-1 rounded text-xs">Pilih file</span>
                                <input id="far_proof_file" type="file" class="sr-only" onchange="const t = document.getElementById('far_proof_name_display'); if(this.files && this.files.length) { t.innerText = this.files[0].name; t.classList.replace('text-blue-600', 'text-green-600'); t.classList.replace('border-blue-600', 'border-green-600'); } else { t.innerText = 'Pilih file'; }">
                            </label>
                        </div>
                    </div>
                </div>
            </div>
            <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">Catatan</label>
                <textarea id="far_notes" placeholder="Catatan tambahan..." rows="2" class="w-full border border-gray-300 rounded px-3 py-2 text-sm"></textarea>
            </div>
        </div>
    `;

    const footer = `
        <button type="button" onclick="saveFinanceARPayment()" class="w-full sm:w-auto justify-center rounded-md bg-green-600 px-4 py-2 text-white font-medium hover:bg-green-700 text-sm shadow-sm transition-colors">Proses Pelunasan</button>
        <button type="button" onclick="closeModal()" class="mt-3 w-full sm:w-auto justify-center rounded-md border border-gray-300 bg-white px-4 py-2 text-gray-700 font-medium hover:bg-gray-50 text-sm transition-colors">Batal</button>
    `;

    showModal('Input Pelunasan Piutang (AR)', body, footer);
};

window.updateFinanceARPaymentDefaultAmount = () => {
    const select = document.getElementById('far_invoice_id');
    if (select && select.selectedIndex > 0) {
        const balance = select.options[select.selectedIndex].dataset.balance;
        document.getElementById('far_amount').value = balance;
    }
};

window.saveFinanceARPayment = () => {
    const invoiceId = document.getElementById('far_invoice_id').value;
    const dateInput = document.getElementById('far_date').value;
    const accountId = document.getElementById('far_account_id').value;
    const method = document.getElementById('far_method').value;
    const inputAmount = parseFloat(document.getElementById('far_amount').value);
    const proofRef = document.getElementById('far_proof_file')?.files?.length ? document.getElementById('far_proof_file').files[0].name : '';
    const notes = document.getElementById('far_notes').value.trim();

    if (!invoiceId) { showToast('Pilih invoice terlebih dahulu', 'error'); return; }
    if (!accountId) { showToast('Pilih akun Kas/Bank', 'error'); return; }
    if (!inputAmount || inputAmount <= 0) { showToast('Jumlah pelunasan tidak valid', 'error'); return; }

    const inv = db.findById('salesInvoices', invoiceId);
    if (!inv) return;

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
        method,
        proofReference: proofRef,
        notes,
        status: 'COMPLETED',
        createdAt: new Date().toISOString()
    });

    const newTotalPaid = totalPaid + inputAmount;
    if (newTotalPaid >= inv.totalAmount - 1) {
        db.update('salesInvoices', inv.id, { status: 'PAID' });
    }

    if (typeof db.addJournalEntry === 'function') {
        db.addJournalEntry({
            date: new Date(dateInput).toISOString(),
            journalNo: paymentNumber,
            description: `Pelunasan Piutang (AR) ${inv.invoiceNumber} via ${method}`,
            items: [
                { accountId: accountId, debit: inputAmount, credit: 0 },
                { accountId: 'acc_ar', debit: 0, credit: inputAmount }
            ]
        });
    }

    showToast('Pelunasan piutang berhasil dicatat', 'success');
    closeModal();
    renderFinanceAR();
};

window.renderFinanceAP = function () {
    document.getElementById('pageTitle').innerText = 'Data Hutang (AP)';
    const mc = document.getElementById('main-content');
    const invoices = db.read('purchaseInvoices').filter(i => i.status === 'UNPAID');

    mc.innerHTML = `
        <div class="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <div class="p-6 border-b border-gray-100 bg-gray-50/50">
                <h3 class="font-bold text-gray-700">Daftar Tagihan Supplier Belum Dibayar</h3>
                <p class="text-xs text-gray-500">Total kewajiban pembayaran perusahaan</p>
            </div>
            <div class="overflow-x-auto">
                <table class="w-full text-left border-collapse">
                    <thead class="bg-gray-50 text-slate-500 text-[11px] uppercase tracking-wider font-semibold">
                        <tr>
                            <th class="px-6 py-3 border-b border-gray-100">Tagihan</th>
                            <th class="px-6 py-3 border-b border-gray-100">Supplier</th>
                            <th class="px-6 py-3 border-b border-gray-100">Tgl Jatuh Tempo</th>
                            <th class="px-6 py-3 border-b border-gray-100 text-right">Total</th>
                            <th class="px-6 py-3 border-b border-gray-100">Status</th>
                        </tr>
                    </thead>
                    <tbody class="text-sm divide-y divide-gray-100">
                        ${invoices.map(i => `
                            <tr>
                                <td class="px-6 py-4">
                                    <div class="font-bold text-gray-800">${i.invoiceNumber}</div>
                                    <div class="text-[10px] text-gray-400">${formatDate(i.date).slice(0, 10)}</div>
                                </td>
                                <td class="px-6 py-4 text-gray-700">
                                    ${db.findById('suppliers', i.supplierId)?.name || 'Supplier'}
                                </td>
                                <td class="px-6 py-4 text-gray-600">${i.dueDate || '-'}</td>
                                <td class="px-6 py-4 text-right font-bold text-orange-600">${formatCurrency(i.totalAmount)}</td>
                                <td class="px-6 py-4">
                                    <span class="px-2 py-1 bg-red-100 text-red-700 rounded-full text-[10px] font-bold">UNPAID</span>
                                </td>
                            </tr>
                        `).join('') || '<tr><td colspan="5" class="px-6 py-12 text-center text-gray-400">Tidak ada hutang aktif saat ini.</td></tr>'}
                    </tbody>
                </table>
            </div>
        </div>
    `;
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
    const notes = db.read('creditNotes');

    mc.innerHTML = `
        <div class="space-y-4">
            <div class="flex justify-between items-center bg-white p-4 rounded-xl shadow-sm border border-gray-100">
                <div>
                    <h3 class="text-lg font-bold text-gray-800">Riwayat Credit Note</h3>
                    <p class="text-xs text-gray-500 font-medium">Dokumen untuk pengurangan piutang pelanggan (Retur/Diskon).</p>
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
                            </tr>
                        `).join('') || '<tr><td colspan="5" class="px-6 py-12 text-center text-gray-400 italic">Belum ada data Credit Note.</td></tr>'}
                    </tbody>
                </table>
            </div>
        </div>
    `;
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
    if (!customerId || amount <= 0) { showToast('Mohon pilih pelanggan dan isi jumlah yang valid.', 'error'); return; }
    const noteNumber = 'CN-' + Date.now().toString().slice(-6);
    const cn = db.insert('creditNotes', { noteNumber, date: new Date().toISOString(), customerId, amount, notes, invoiceId });
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
    const notes = db.read('debitNotes');

    mc.innerHTML = `
        <div class="space-y-4">
            <div class="flex justify-between items-center bg-white p-4 rounded-xl shadow-sm border border-gray-100">
                <div>
                    <h3 class="text-lg font-bold text-gray-800">Riwayat Debit Note</h3>
                    <p class="text-xs text-gray-500 font-medium">Dokumen untuk pengurangan hutang ke supplier (Retur Pembelian).</p>
                </div>
                <button onclick="openDebitNoteModal()" class="bg-orange-600 hover:bg-orange-700 text-white px-4 py-2 rounded-lg text-sm font-bold shadow-sm transition-all flex items-center gap-2">
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
                            </tr>
                        `).join('') || '<tr><td colspan="5" class="px-6 py-12 text-center text-gray-400 italic">Belum ada data Debit Note.</td></tr>'}
                    </tbody>
                </table>
            </div>
        </div>
    `;
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
        <button onclick="saveDebitNote()" class="bg-orange-600 text-white px-6 py-2 rounded-lg text-sm font-bold hover:bg-orange-700 transition-all shadow-md">Simpan Debit Note</button>
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
    if (!supplierId || amount <= 0) { showToast('Mohon pilih supplier dan isi jumlah yang valid.', 'error'); return; }
    const noteNumber = 'DN-' + Date.now().toString().slice(-6);
    const dn = db.insert('debitNotes', { noteNumber, date: new Date().toISOString(), supplierId, amount, notes, invoiceId });
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
