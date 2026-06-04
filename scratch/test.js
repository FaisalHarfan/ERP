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
window._coaFilters = window._coaFilters || { q: '', type: '' };
window._coaExpandedNodes = window._coaExpandedNodes || {};

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

    const accounts = db.read('accounts') || [];
    const journal = db.read('journalEntries') || [];
    const salesInvoices = db.read('salesInvoices') || [];
    const purchaseInvoices = db.read('purchaseInvoices') || [];
    const allPayments = db.read('payments') || [];
    const allSuppPayments = db.read('supplierPayments') || [];

    // 1. Calculate Summary Stats (ERPNext Style)
    const totalOutgoingBills = purchaseInvoices.reduce((sum, i) => sum + (parseFloat(i.totalAmount) || 0), 0);
    const totalIncomingBills = salesInvoices.reduce((sum, i) => sum + (parseFloat(i.totalAmount) || 0), 0);
    const totalIncomingPayment = allPayments.reduce((sum, p) => sum + (parseFloat(p.amount) || 0), 0);
    const totalOutgoingPayment = allSuppPayments.reduce((sum, p) => sum + (parseFloat(p.amount) || 0), 0);

    // 2. Profit and Loss Stats
    const totalIncomeThisYear = accounts.filter(a => a && a.type === 'INCOME').reduce((sum, a) => sum + Math.abs(db.getAccountBalance(a.id) || 0), 0);
    const totalExpenseThisYear = accounts.filter(a => a && a.type === 'EXPENSE').reduce((sum, a) => sum + Math.abs(db.getAccountBalance(a.id) || 0), 0);
    const profitThisYear = totalIncomeThisYear - totalExpenseThisYear;

    const summaryCard = (title, value) => `
        <div class="bg-white rounded-lg border border-gray-100 p-5 shadow-sm hover:shadow-md transition-shadow">
            <p class="text-xs font-semibold text-gray-500 mb-2">${title}</p>
            <h3 class="text-xl font-bold text-gray-800">${formatCurrency(value)}</h3>
        </div>`;

    const erpNextChart = (title, id, heightClass = 'h-64') => `
        <div class="bg-white rounded-lg border border-gray-100 shadow-sm p-6 flex flex-col">
            <div class="flex justify-between items-center mb-4">
                <h3 class="text-sm font-semibold text-gray-700">${title}</h3>
                <div class="flex gap-2">
                    <button class="text-gray-400 hover:text-gray-600"><i class="fas fa-filter text-xs"></i></button>
                    <button class="text-gray-400 hover:text-gray-600"><i class="fas fa-ellipsis-h text-xs"></i></button>
                </div>
            </div>
            <div class="relative w-full ${heightClass} flex-1">
                <canvas id="${id}"></canvas>
            </div>
        </div>`;

    mc.innerHTML = `
        <div class="space-y-6 pb-12 bg-[#f8f9fb] p-6 -m-6 animate-in fade-in duration-500">
            <!-- Breadcrumbs -->
            <div class="flex items-center text-xs text-gray-500 gap-2 mb-2">
                <i class="fas fa-home"></i> <span>/</span> <span>Dashboard</span> <span>/</span> <span class="font-bold text-gray-800">Accounts</span>
            </div>

            <!-- Top Summary Grid -->
            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                ${summaryCard('Total Outgoing Bills', totalOutgoingBills)}
                ${summaryCard('Total Incoming Bills', totalIncomingBills)}
                ${summaryCard('Total Incoming Payment', totalIncomingPayment)}
                ${summaryCard('Total Outgoing Payment', totalOutgoingPayment)}
            </div>

            <!-- Profit and Loss Panel -->
            <div class="bg-white rounded-lg border border-gray-100 shadow-sm p-8">
                <div class="flex justify-between items-center mb-8">
                    <h3 class="text-md font-semibold text-gray-700">Profit and Loss</h3>
                    <div class="flex gap-2">
                        <button class="p-1 px-2 border rounded text-xs text-gray-500 hover:bg-gray-50"><i class="fas fa-filter"></i></button>
                    </div>
                </div>
                <div class="grid grid-cols-3 text-center">
                    <div>
                        <p class="text-xs text-gray-500 mb-2">Total Income This Year</p>
                        <h4 class="text-lg font-bold text-gray-800">${formatCurrency(totalIncomeThisYear)}</h4>
                    </div>
                    <div>
                        <p class="text-xs text-gray-500 mb-2">Total Expense This Year</p>
                        <h4 class="text-lg font-bold text-gray-800">${formatCurrency(totalExpenseThisYear)}</h4>
                    </div>
                    <div>
                        <p class="text-xs text-gray-500 mb-2">Profit This Year</p>
                        <h4 class="text-lg font-bold ${profitThisYear >= 0 ? 'text-red-500' : 'text-blue-500'}">${formatCurrency(profitThisYear)}</h4>
                    </div>
                </div>
            </div>

            <!-- Charts Row 1: Bills Trend -->
            <div class="grid grid-cols-1 lg:grid-cols-2 gap-4">
                ${erpNextChart('Incoming Bills (Purchase Invoice)', 'chartIncomingBills')}
                ${erpNextChart('Outgoing Bills (Sales Invoice)', 'chartOutgoingBills')}
            </div>

            <!-- Charts Row 2: Ageing -->
            <div class="grid grid-cols-1 lg:grid-cols-2 gap-4">
                ${erpNextChart('Accounts Receivable Ageing', 'chartARAgeing')}
                ${erpNextChart('Accounts Payable Ageing', 'chartAPAgeing')}
            </div>

            <!-- Charts Row 3: Bank & Budget -->
            <div class="grid grid-cols-1 lg:grid-cols-2 gap-4">
                ${erpNextChart('Bank Balance', 'chartBankBalanceTrend')}
                ${erpNextChart('Budget Variance', 'chartBudgetVariance')}
            </div>
        </div>
    `;

    // Initialize ERPNext Style Charts
    setTimeout(() => initFinanceChartsERP(accounts, journal, salesInvoices, purchaseInvoices), 100);
};

window.initFinanceChartsERP = function(accounts, journal, salesInvoices, purchaseInvoices) {
    if (typeof Chart === 'undefined') return;

    const months = ['May 2025', 'Jul 2025', 'Sep 2025', 'Nov 2025', 'Jan 2026', 'Mar 2026', 'May 2026'];
    const chartOptions = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
            y: { beginAtZero: true, grid: { color: '#f0f0f0', drawBorder: false }, ticks: { color: '#888', font: { size: 10 } } },
            x: { grid: { display: false }, ticks: { color: '#888', font: { size: 9 } } }
        }
    };

    // 1. Incoming Bills Trend
    const ctxInc = document.getElementById('chartIncomingBills');
    if (ctxInc) {
        new Chart(ctxInc, {
            type: 'line',
            data: { labels: months, datasets: [{ data: [0,0,0,0,0,0,0], borderColor: '#cbd5e1', borderWidth: 1.5, pointRadius: 0, tension: 0.1 }] },
            options: chartOptions
        });
    }

    // 2. Outgoing Bills Trend
    const ctxOut = document.getElementById('chartOutgoingBills');
    if (ctxOut) {
        new Chart(ctxOut, {
            type: 'line',
            data: { labels: months, datasets: [{ data: [0,0,0,0,0,0,0], borderColor: '#cbd5e1', borderWidth: 1.5, pointRadius: 0, tension: 0.1 }] },
            options: chartOptions
        });
    }

    // 3. AR Ageing (Bar)
    const ctxAR = document.getElementById('chartARAgeing');
    if (ctxAR) {
        new Chart(ctxAR, {
            type: 'bar',
            data: {
                labels: ['<0', '0-30', '31-60'],
                datasets: [{
                    data: [0, 0, 0],
                    backgroundColor: ['#93c5fd', '#f9a8d4', '#3b82f6'],
                    barThickness: 15
                }]
            },
            options: { ...chartOptions, scales: { ...chartOptions.scales, y: { display: false } } }
        });
    }

    // 4. AP Ageing (Bar)
    const ctxAP = document.getElementById('chartAPAgeing');
    if (ctxAP) {
        new Chart(ctxAP, {
            type: 'bar',
            data: {
                labels: ['<0', '0-30', '31-60'],
                datasets: [{
                    data: [0, 0, 0],
                    backgroundColor: ['#93c5fd', '#f9a8d4', '#3b82f6'],
                    barThickness: 15
                }]
            },
            options: { ...chartOptions, scales: { ...chartOptions.scales, y: { display: false } } }
        });
    }

    // 5. Bank Balance Trend
    const ctxBank = document.getElementById('chartBankBalanceTrend');
    if (ctxBank) {
        new Chart(ctxBank, {
            type: 'line',
            data: { labels: ['31-05-2025', '31-07-2025', '30-09-2025', '30-11-2025', '31-01-2026', '31-03-2026', '31-05-2026'], datasets: [{ data: [0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5], borderColor: '#f43f5e', borderWidth: 1, pointRadius: 0 }] },
            options: chartOptions
        });
    }
};

window.renderFinanceAccounts = function () {
    document.getElementById('pageTitle').innerText = 'Chart of Accounts (COA)';
    const mc = document.getElementById('main-content');
    
    let accounts = db.read('accounts');
    let q = (window._coaFilters?.q || '').toLowerCase();
    let filteredAccounts = accounts;
    
    if (q) {
        // Find matches
        const matches = accounts.filter(a => 
            a.name.toLowerCase().includes(q) || 
            (a.code && a.code.toLowerCase().includes(q))
        );
        
        // Ensure parents are included for matches
        const matchIds = new Set(matches.map(m => m.id));
        const finalIds = new Set();
        
        const includeParents = (nodeId) => {
            if (!nodeId || finalIds.has(nodeId)) return;
            finalIds.add(nodeId);
            const node = accounts.find(a => a.id === nodeId);
            if (node && node.parentId) includeParents(node.parentId);
        };
        
        matches.forEach(m => includeParents(m.id));
        filteredAccounts = accounts.filter(a => finalIds.has(a.id));
        
        // Auto-expand all when searching
        filteredAccounts.forEach(a => { if (a.isGroup) window._coaExpandedNodes[a.id] = true; });
    }

    const buildTree = (list) => {
        const map = {}, roots = [];
        list.forEach((node, index) => {
            map[node.id] = index;
            node.children = [];
        });
        list.forEach((node) => {
            if (node.parentId && map[node.parentId] !== undefined) {
                list[map[node.parentId]].children.push(node);
            } else {
                roots.push(node);
            }
        });
        if (roots.length === list.length && list.length > 0) {
            const types = ['ASSET', 'LIABILITY', 'EQUITY', 'INCOME', 'EXPENSE'];
            const typeRoots = types.map(t => ({
                id: `root_${t}`,
                name: t.charAt(0) + t.slice(1).toLowerCase(),
                code: '',
                type: t,
                isGroup: true,
                children: list.filter(a => a.type === t)
            }));
            return typeRoots;
        }
        return roots;
    };

    const treeData = buildTree(JSON.parse(JSON.stringify(filteredAccounts)));

    const renderNode = (node, depth = 0) => {
        const isGroup = node.isGroup || (node.children && node.children.length > 0);
        const isExpanded = window._coaExpandedNodes[node.id] || false;
        const balance = node.id.startsWith('root_') ? 0 : db.getAccountBalance(node.id);
        const balanceFormatted = formatCurrency(Math.abs(balance));
        const balanceType = balance >= 0 ? 'Dr' : 'Cr';
        
        // Highlight match
        const nameText = node.name;
        const codeText = node.code || '';
        let displayHTML = `${codeText ? `<span class="text-slate-400 font-mono text-[11px] mr-2">${codeText}</span>` : ''}${nameText}`;
        
        if (q) {
            const regex = new RegExp(`(${q})`, 'gi');
            displayHTML = displayHTML.replace(regex, '<mark class="bg-yellow-200 text-slate-900">$1</mark>');
        }
        
        return `
            <div class="group border-b border-gray-50 hover:bg-blue-50/20 transition-all">
                <div class="flex items-center py-3 px-4" style="padding-left: ${depth * 24 + 16}px">
                    <div class="w-8 flex items-center justify-center">
                        ${isGroup ? `
                            <button onclick="toggleCOANode('${node.id}', event)" class="w-6 h-6 flex items-center justify-center text-slate-400 hover:text-blue-600 transition-colors mr-1">
                                <i class="fas fa-chevron-right text-[10px] transition-transform duration-200 ${isExpanded ? 'rotate-90' : ''}"></i>
                            </button>
                            <i class="fas fa-folder text-yellow-500 text-sm"></i>
                        ` : `
                            <i class="far fa-file-alt text-slate-300 text-sm ml-7"></i>
                        `}
                    </div>
                    <div class="flex-1 flex items-center gap-3 ml-2">
                        <div class="flex flex-col">
                            <span class="text-sm font-semibold text-gray-700 cursor-pointer hover:text-blue-600 transition-colors" onclick="${isGroup ? `toggleCOANode('${node.id}', event)` : `viewAccountLedger('${node.id}')`}">
                                ${displayHTML}
                            </span>
                        </div>
                        ${isGroup ? `
                        <div class="hidden group-hover:flex items-center gap-1 animate-in fade-in zoom-in duration-200">
                            <button onclick="editAccount('${node.id}')" class="px-2 py-0.5 text-[10px] bg-white border border-slate-200 rounded-md hover:bg-slate-50 text-slate-600 shadow-sm">Edit</button>
                            <button onclick="deleteAccount('${node.id}')" class="px-2 py-0.5 text-[10px] bg-white border border-slate-200 rounded-md hover:bg-slate-50 text-red-500 shadow-sm">Delete</button>
                            <button onclick="addChildAccount('${node.id}')" class="px-2 py-0.5 text-[10px] bg-white border border-slate-200 rounded-md hover:bg-slate-50 text-blue-600 shadow-sm">Add Child</button>
                            <button onclick="viewAccountLedger('${node.id}')" class="px-2 py-0.5 text-[10px] bg-white border border-slate-200 rounded-md hover:bg-slate-50 text-slate-600 shadow-sm">Ledger</button>
                        </div>
                        ` : ''}
                    </div>
                    <div class="text-right">
                        <span class="text-sm font-bold ${balance >= 0 ? 'text-blue-600' : 'text-red-500'}">${balanceFormatted}</span>
                        <span class="text-[10px] text-gray-400 font-bold ml-1">${balanceType}</span>
                    </div>
                </div>
                <div class="node-children ${isExpanded ? 'block' : 'hidden'}">
                    ${(node.children || []).map(child => renderNode(child, depth + 1)).join('')}
                </div>
            </div>
        `;
    };

    mc.innerHTML = `
        <div class="max-w-5xl mx-auto space-y-6 pb-20 animate-in fade-in duration-500">
            <!-- Modern Search Bar Filter -->
            <div class="flex flex-col md:flex-row items-center justify-between gap-4">
                <div class="relative w-full md:w-96 group">
                    <div class="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                        <i class="fas fa-search text-slate-400 group-focus-within:text-blue-500 transition-colors"></i>
                    </div>
                    <input type="text" id="coaSearchInput" value="${window._coaFilters.q || ''}" 
                        onkeyup="if(event.key==='Enter') applyCOASearch()"
                        placeholder="Search accounts by name or code..." 
                        class="block w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all shadow-sm">
                </div>
                <div class="flex items-center gap-2">
                    <button onclick="expandAllCOA()" class="px-3 py-2 bg-white border border-slate-200 rounded-xl text-[10px] font-bold text-slate-600 hover:bg-slate-50 transition-all flex items-center gap-2 shadow-sm">
                        <i class="fas fa-expand-arrows-alt"></i> EXPAND
                    </button>
                    <button onclick="collapseAllCOA()" class="px-3 py-2 bg-white border border-slate-200 rounded-xl text-[10px] font-bold text-slate-600 hover:bg-slate-50 transition-all flex items-center gap-2 shadow-sm">
                        <i class="fas fa-compress-arrows-alt"></i> COLLAPSE
                    </button>
                </div>
            </div>

            <!-- Tree Container -->
            <div class="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                <div class="p-4 border-b border-slate-100 bg-slate-50/50 flex justify-between text-[10px] font-black text-slate-400 uppercase tracking-widest">
                    <span>Account Name</span>
                    <span>Balance</span>
                </div>
                <div class="divide-y divide-slate-50">
                    ${treeData.map(root => renderNode(root)).join('') || '<div class="p-12 text-center text-slate-400 italic">No accounts found.</div>'}
                </div>
            </div>
            
            <!-- Floating Add Button -->
            <div class="fixed bottom-8 right-8">
                <button onclick="openAccountModal()" class="w-14 h-14 bg-blue-600 text-white rounded-full shadow-2xl flex items-center justify-center hover:bg-blue-700 hover:scale-110 transition-all ring-4 ring-white">
                    <i class="fas fa-plus text-xl"></i>
                </button>
            </div>
        </div>
    `;

    // Focus search input after render
    const input = document.getElementById('coaSearchInput');
    if (input) {
        input.focus();
        const val = input.value;
        input.value = '';
        input.value = val;
    }
};

window.toggleCOANode = function(id, event) {
    if (event) event.stopPropagation();
    window._coaExpandedNodes[id] = !window._coaExpandedNodes[id];
    renderFinanceAccounts();
};

window.expandAllCOA = function() {
    const accounts = db.read('accounts') || [];
    accounts.forEach(a => {
        if (a.isGroup) window._coaExpandedNodes[a.id] = true;
    });
    // Add roots
    ['root_ASSET', 'root_LIABILITY', 'root_EQUITY', 'root_INCOME', 'root_EXPENSE'].forEach(r => window._coaExpandedNodes[r] = true);
    renderFinanceAccounts();
};

window.collapseAllCOA = function() {
    window._coaExpandedNodes = {};
    renderFinanceAccounts();
};

window.addChildAccount = function(parentId) {
    openAccountModal(null, parentId);
};

window.viewAccountLedger = function(accountId) {
    navigateTo('finance-journal', { accountId: accountId });
};

window.updateCOAFilters = function() {
    window._coaFilters = {
        accountId: document.getElementById('coaFilterAccountId')?.value || '',
        type: document.getElementById('coaFilterType')?.value || ''
    };
    renderFinanceAccounts();
};

window.openAccountModal = function (accountId = null, parentId = null) {
    let acc = null;
    if (accountId) {
        acc = db.findById('accounts', accountId);
    }
    const accounts = db.read('accounts') || [];
    
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
                    <label class="block text-xs font-bold text-gray-500 mb-1">Akun Induk (Parent)</label>
                    <select id="accParentId" class="w-full border border-gray-200 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none">
                        <option value="">-- Tanpa Induk --</option>
                        ${accounts.filter(a => a.isGroup).map(a => `<option value="${a.id}" ${(acc ? acc.parentId : parentId) === a.id ? 'selected' : ''}>${a.code} - ${a.name}</option>`).join('')}
                    </select>
                </div>
            </div>
            <div class="flex items-center gap-2 py-2">
                <input type="checkbox" id="accIsGroup" ${acc && acc.isGroup ? 'checked' : ''} class="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500">
                <label for="accIsGroup" class="text-sm font-bold text-gray-700">Akun ini adalah Group (Bisa punya anak)</label>
            </div>
            <div>
                <label class="block text-xs font-bold text-gray-500 mb-1">Saldo Awal</label>
                <input type="number" id="accOpeningBalance" value="${acc && acc.openingBalance !== undefined ? acc.openingBalance : ''}" class="w-full border border-gray-200 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none" placeholder="0">
            </div>
            <div>
                <label class="block text-xs font-bold text-gray-500 mb-1">Deskripsi</label>
                <textarea id="accDescription" class="w-full border border-gray-200 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none" rows="2" placeholder="Penjelasan singkat penggunaan akun...">${acc && acc.description ? acc.description : ''}</textarea>
            </div>
        </form>
    `;
    const footer = `
        <button onclick="saveAccount()" class="px-6 py-2 bg-blue-600 text-white rounded-lg text-sm font-bold shadow-md hover:bg-blue-700 transition-colors">${acc ? 'Update Akun' : 'Simpan Akun'}</button>
        <button onclick="closeModal()" class="px-4 py-2 bg-gray-100 text-gray-600 rounded-lg text-sm font-bold mr-2">Batal</button>
    `;
    showModal(acc ? 'Edit Akun' : 'Tambah Akun Baru', body, footer);
};

window.saveAccount = async function () {
    const editId = document.getElementById('editAccountId')?.value;
    const code = document.getElementById('accCode').value;
    const name = document.getElementById('accName').value;
    const type = document.getElementById('accType').value;
    const parentId = document.getElementById('accParentId').value;
    const isGroup = document.getElementById('accIsGroup').checked;
    const description = document.getElementById('accDescription').value;
    const openingBalanceStr = document.getElementById('accOpeningBalance')?.value;
    const openingBalance = openingBalanceStr ? parseFloat(openingBalanceStr) : 0;

    if (!code || !name) return alert('Mohon isi kode dan nama akun.');

    try {
        await api.saveAccount({ id: editId, code, name, type, parentId, isGroup, description, openingBalance, status: 'ACTIVE' });
        showToast(editId ? 'Akun berhasil diupdate' : 'Akun berhasil ditambahkan');
        closeModal();
        renderFinanceAccounts();
    } catch (err) {
        showToast(err.message, 'error');
    }
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

window.viewAccountMutasi = async function(accountId, startDate = '', endDate = '') {
    const acc = db.findById('accounts', accountId);
    if (!acc) return;
    
    try {
        const { ledger } = await api.getLedger(accountId, { startDate, endDate });
        const filteredLedger = ledger;

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
                                    <td class="px-4 py-3 text-gray-400 whitespace-nowrap font-medium">${l.date ? l.date.slice(0, 10).split('-').reverse().join('/') : '-'}</td>
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
    } catch (err) {
        showToast(err.message, 'error');
    }
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
    document.getElementById('pageTitle').innerText = 'Pengeluaran Kas & Bank';
    const mc = document.getElementById('main-content');
    
    window._uiState.expenseActiveTab = window._uiState.expenseActiveTab || 'list';
    const activeTab = window._uiState.expenseActiveTab;

    window._expenseFilters = window._expenseFilters || { q: '', start: '', end: '', coaId: '' };
    const f = window._expenseFilters;
    
    let expenses = db.read('expenses') || [];
    if (f.q) {
        const q = f.q.toLowerCase();
        expenses = expenses.filter(e => e.expenseNo.toLowerCase().includes(q) || e.description.toLowerCase().includes(q));
    }
    if (f.start) expenses = expenses.filter(e => e.date >= f.start);
    if (f.end) expenses = expenses.filter(e => e.date <= f.end);

    const totalAmount = expenses.reduce((sum, e) => sum + (parseFloat(e.amount) || 0), 0);

    let contentHtml = '';
    // Reusable Filter Bar
    const filterBarHtml = `
        <div class="bg-white rounded-2xl shadow-sm border border-slate-100 p-3 flex flex-col md:flex-row items-center gap-3 mb-4">
            <div class="relative flex-1 group w-full">
                <i class="fas fa-search absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-blue-500 transition-colors"></i>
                <input type="text" onkeyup="if(event.key==='Enter') { window._expenseFilters.q=this.value; renderFinanceExpenses(); }"
                    value="${f.q || ''}" placeholder="Cari di ${activeTab === 'list' ? 'Daftar' : 'Riwayat'}..." 
                    class="w-full pl-11 pr-4 py-2.5 bg-slate-50/50 rounded-xl border border-slate-100 focus:border-blue-500 focus:bg-white text-sm font-semibold text-slate-700 outline-none transition-all">
            </div>
            <div class="flex items-center gap-3 w-full md:w-auto px-1">
                <div class="px-5 py-1.5 bg-red-50 rounded-xl border border-red-100 flex flex-col items-center justify-center min-w-[160px] h-10 shadow-sm">
                    <span class="text-[9px] font-black text-red-400 uppercase tracking-widest leading-none mb-0.5">Total ${activeTab === 'list' ? 'Item' : 'Riwayat'}</span>
                    <span class="text-sm font-black text-red-700 leading-none">${formatCurrency(totalAmount)}</span>
                </div>
                ${activeTab === 'list' ? `
                <button onclick="openExpenseModal()" class="flex items-center justify-center gap-2 px-6 h-10 bg-blue-600 hover:bg-slate-900 text-white rounded-xl text-sm font-bold shadow-lg shadow-blue-200 transition-all active:scale-95 whitespace-nowrap">
                    <i class="fas fa-plus"></i> INPUT PENGELUARAN
                </button>` : ''}
            </div>
        </div>
    `;

    if (activeTab === 'list') {
        contentHtml = filterBarHtml + `
            <div class="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                <div class="overflow-x-auto">
                    <table class="w-full text-left border-collapse">
                        <thead>
                            <tr class="bg-slate-50/50">
                                <th class="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">TGL & REFERENSI</th>
                                <th class="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">KEBUTUHAN</th>
                                <th class="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">KATEGORI (COA)</th>
                                <th class="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">KAS / BANK</th>
                                <th class="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 text-right">JUMLAH</th>
                                <th class="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 text-right">AKSI</th>
                            </tr>
                        </thead>
                        <tbody class="divide-y divide-slate-50">
                            ${expenses.map(e => `
                                <tr class="hover:bg-slate-50/50 transition-colors group">
                                    <td class="px-6 py-4">
                                        <div class="text-[10px] text-slate-400 font-bold mb-1">${formatDate(e.date).slice(0, 10)}</div>
                                        <div class="inline-flex items-center px-2 py-1 bg-red-50 text-red-600 rounded-lg font-bold text-[10px] border border-red-100">${e.expenseNo}</div>
                                    </td>
                                    <td class="px-6 py-4">
                                        <div class="text-sm font-bold text-slate-700">${e.description}</div>
                                        <div class="text-[10px] text-slate-400 mt-0.5 font-medium italic opacity-70">${e.method || 'Tunai'}</div>
                                    </td>
                                    <td class="px-6 py-4">
                                        <span class="px-3 py-1 bg-slate-100 text-slate-600 rounded-full text-[9px] font-black uppercase tracking-widest">${db.findById('accounts', e.toAccountId)?.name || '-'}</span>
                                    </td>
                                    <td class="px-6 py-4">
                                        <span class="text-xs font-bold text-slate-600 uppercase flex items-center gap-2">
                                            <i class="fas fa-university text-slate-300 text-[10px]"></i>
                                            ${db.findById('accounts', e.fromAccountId)?.name || '-'}
                                        </span>
                                    </td>
                                    <td class="px-6 py-4 text-right font-black text-red-600">${formatCurrency(e.amount)}</td>
                                    <td class="px-6 py-4 text-right">
                                        <button onclick="handleExpenseAction('view', '${e.id}')" class="w-8 h-8 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-blue-600 transition-all">
                                            <i class="fas fa-eye"></i>
                                        </button>
                                    </td>
                                </tr>
                            `).join('') || '<tr><td colspan="6" class="px-6 py-10 text-center text-slate-400 italic">Tidak ada data.</td></tr>'}
                        </tbody>
                    </table>
                </div>
            </div>
        `;
    } else if (activeTab === 'history') {
        contentHtml = filterBarHtml + `
            <div class="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden animate-in slide-in-from-bottom-4 duration-500">
                <table class="w-full text-left border-collapse">
                    <thead>
                        <tr class="bg-slate-50/50">
                            <th class="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">TANGGAL</th>
                            <th class="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">NOMOR</th>
                            <th class="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">KETERANGAN</th>
                            <th class="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 text-right">JUMLAH</th>
                        </tr>
                    </thead>
                    <tbody class="divide-y divide-slate-50">
                        ${expenses.map(e => `
                            <tr class="hover:bg-slate-50 transition-colors">
                                <td class="px-6 py-4 text-sm text-slate-600">${formatDate(e.date)}</td>
                                <td class="px-6 py-4 font-bold text-slate-700">${e.expenseNo}</td>
                                <td class="px-6 py-4 text-sm text-slate-500">${e.description}</td>
                                <td class="px-6 py-4 text-right font-black text-red-600">${formatCurrency(e.amount)}</td>
                            </tr>
                        `).join('') || '<tr><td colspan="4" class="px-6 py-10 text-center text-slate-400">Belum ada riwayat.</td></tr>'}
                    </tbody>
                </table>
            </div>
        `;
    }

    mc.innerHTML = `
        <div class="flex flex-col gap-4 animate-in fade-in duration-500">
            <div class="flex items-center gap-8 border-b border-slate-200 mb-2 px-2">
                <button onclick="window._uiState.expenseActiveTab='list'; renderFinanceExpenses()" 
                    class="pb-3 text-sm font-bold transition-all relative ${activeTab === 'list' ? 'text-blue-600' : 'text-slate-400 hover:text-slate-600'}">
                    Daftar Pengeluaran
                    ${activeTab === 'list' ? '<div class="absolute -bottom-[1px] left-0 w-full h-[3px] bg-blue-600 rounded-full shadow-sm"></div>' : ''}
                </button>
                <button onclick="window._uiState.expenseActiveTab='history'; renderFinanceExpenses()" 
                    class="pb-3 text-sm font-bold transition-all relative ${activeTab === 'history' ? 'text-blue-600' : 'text-slate-400 hover:text-slate-600'}">
                    Riwayat Pengeluaran
                    ${activeTab === 'history' ? '<div class="absolute -bottom-[1px] left-0 w-full h-[3px] bg-blue-600 rounded-full shadow-sm"></div>' : ''}
                </button>
            </div>
            ${contentHtml}
        </div>
    `;
};

window.renderFinanceReceipts = function () {
    document.getElementById('pageTitle').innerText = 'Penerimaan Kas & Bank';
    const mc = document.getElementById('main-content');
    
    window._uiState.receiptActiveTab = window._uiState.receiptActiveTab || 'list';
    const activeTab = window._uiState.receiptActiveTab;

    window._receiptFilters = window._receiptFilters || { q: '', start: '', end: '', coaId: '' };
    const f = window._receiptFilters;
    
    let receipts = db.read('receipts') || [];
    if (f.q) {
        const q = f.q.toLowerCase();
        receipts = receipts.filter(r => r.receiptNo.toLowerCase().includes(q) || r.description.toLowerCase().includes(q));
    }
    if (f.start) receipts = receipts.filter(r => r.date >= f.start);
    if (f.end) receipts = receipts.filter(r => r.date <= f.end);

    const totalAmount = receipts.reduce((sum, r) => sum + (parseFloat(r.amount) || 0), 0);

    let contentHtml = '';
    // Reusable Filter Bar
    const filterBarHtml = `
        <div class="bg-white rounded-2xl shadow-sm border border-slate-100 p-3 flex flex-col md:flex-row items-center gap-3 mb-4">
            <div class="relative flex-1 group w-full">
                <i class="fas fa-search absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-blue-500 transition-colors"></i>
                <input type="text" onkeyup="if(event.key==='Enter') { window._receiptFilters.q=this.value; renderFinanceReceipts(); }"
                    value="${f.q || ''}" placeholder="Cari di ${activeTab === 'list' ? 'Daftar' : 'Riwayat'}..." 
                    class="w-full pl-11 pr-4 py-2.5 bg-slate-50/50 rounded-xl border border-slate-100 focus:border-blue-500 focus:bg-white text-sm font-semibold text-slate-700 outline-none transition-all">
            </div>
            <div class="flex items-center gap-3 w-full md:w-auto px-1">
                <div class="px-5 py-1.5 bg-blue-50 rounded-xl border border-blue-100 flex flex-col items-center justify-center min-w-[160px] h-10 shadow-sm">
                    <span class="text-[9px] font-black text-blue-400 uppercase tracking-widest leading-none mb-0.5">Total ${activeTab === 'list' ? 'Item' : 'Riwayat'}</span>
                    <span class="text-sm font-black text-blue-700 leading-none">${formatCurrency(totalAmount)}</span>
                </div>
                ${activeTab === 'list' ? `
                <button onclick="openReceiptModal()" class="flex items-center justify-center gap-2 px-6 h-10 bg-blue-600 hover:bg-slate-900 text-white rounded-xl text-sm font-bold shadow-lg shadow-blue-200 transition-all active:scale-95 whitespace-nowrap">
                    <i class="fas fa-plus"></i> INPUT PENERIMAAN
                </button>` : ''}
            </div>
        </div>
    `;

    if (activeTab === 'list') {
        contentHtml = filterBarHtml + `
            <div class="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                <div class="overflow-x-auto">
                    <table class="w-full text-left border-collapse">
                        <thead>
                            <tr class="bg-slate-50/50">
                                <th class="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">TGL & REFERENSI</th>
                                <th class="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">KETERANGAN</th>
                                <th class="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">SUMBER (COA)</th>
                                <th class="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 text-right">JUMLAH</th>
                                <th class="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 text-right">AKSI</th>
                            </tr>
                        </thead>
                        <tbody class="divide-y divide-slate-50">
                            ${receipts.map(r => `
                                <tr class="hover:bg-slate-50/50 transition-colors group">
                                    <td class="px-6 py-4">
                                        <div class="text-[10px] text-slate-400 font-bold mb-1">${formatDate(r.date).slice(0, 10)}</div>
                                        <div class="inline-flex items-center px-2 py-1 bg-blue-50 text-blue-600 rounded-lg font-bold text-[10px] border border-blue-100">${r.receiptNo}</div>
                                    </td>
                                    <td class="px-6 py-4">
                                        <div class="text-sm font-bold text-slate-700">${r.description}</div>
                                        <div class="text-[10px] text-slate-400 mt-0.5 font-medium italic opacity-70">${r.method || 'Transfer'}</div>
                                    </td>
                                    <td class="px-6 py-4">
                                        <span class="px-3 py-1 bg-slate-100 text-slate-600 rounded-full text-[9px] font-black uppercase tracking-widest">${db.findById('accounts', r.sourceAccountId)?.name || '-'}</span>
                                    </td>
                                    <td class="px-6 py-4 text-right font-black text-blue-600">${formatCurrency(r.amount)}</td>
                                    <td class="px-6 py-4 text-right">
                                        <button onclick="handleReceiptAction('view', '${r.id}')" class="w-8 h-8 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-blue-600 transition-all">
                                            <i class="fas fa-eye"></i>
                                        </button>
                                    </td>
                                </tr>
                            `).join('') || '<tr><td colspan="5" class="px-6 py-10 text-center text-slate-400 italic">Tidak ada data.</td></tr>'}
                        </tbody>
                    </table>
                </div>
            </div>
        `;
    } else if (activeTab === 'history') {
        contentHtml = filterBarHtml + `
            <div class="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden animate-in slide-in-from-bottom-4 duration-500">
                <table class="w-full text-left border-collapse">
                    <thead>
                        <tr class="bg-slate-50/50">
                            <th class="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">TANGGAL</th>
                            <th class="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">NOMOR</th>
                            <th class="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">KETERANGAN</th>
                            <th class="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 text-right">JUMLAH</th>
                        </tr>
                    </thead>
                    <tbody class="divide-y divide-slate-50">
                        ${receipts.map(r => `
                            <tr class="hover:bg-slate-50 transition-colors">
                                <td class="px-6 py-4 text-sm text-slate-600">${formatDate(r.date)}</td>
                                <td class="px-6 py-4 font-bold text-slate-700">${r.receiptNo}</td>
                                <td class="px-6 py-4 text-sm text-slate-500">${r.description}</td>
                                <td class="px-6 py-4 text-right font-black text-blue-600">${formatCurrency(r.amount)}</td>
                            </tr>
                        `).join('') || '<tr><td colspan="4" class="px-6 py-10 text-center text-slate-400">Belum ada riwayat.</td></tr>'}
                    </tbody>
                </table>
            </div>
        `;
    }

    mc.innerHTML = `
        <div class="flex flex-col gap-4 animate-in fade-in duration-500">
            <div class="flex items-center gap-8 border-b border-slate-200 mb-2 px-2">
                <button onclick="window._uiState.receiptActiveTab='list'; renderFinanceReceipts()" 
                    class="pb-3 text-sm font-bold transition-all relative ${activeTab === 'list' ? 'text-blue-600' : 'text-slate-400 hover:text-slate-600'}">
                    Daftar Penerimaan
                    ${activeTab === 'list' ? '<div class="absolute -bottom-[1px] left-0 w-full h-[3px] bg-blue-600 rounded-full shadow-sm"></div>' : ''}
                </button>
                <button onclick="window._uiState.receiptActiveTab='history'; renderFinanceReceipts()" 
                    class="pb-3 text-sm font-bold transition-all relative ${activeTab === 'history' ? 'text-blue-600' : 'text-slate-400 hover:text-slate-600'}">
                    Riwayat Penerimaan
                    ${activeTab === 'history' ? '<div class="absolute -bottom-[1px] left-0 w-full h-[3px] bg-blue-600 rounded-full shadow-sm"></div>' : ''}
                </button>
            </div>
            ${contentHtml}
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
    const mc = document.getElementById('main-content');
    window.renderBreadcrumb(['Finance', 'Penerimaan Kas & Bank', 'Catat Penerimaan']);
    const assetAccounts = db.read('accounts').filter(a => a.type === 'ASSET' && a.code.startsWith('11'));
    const allAccounts = db.read('accounts');

    mc.innerHTML = `
        <div class="-mx-4 -mt-4 sm:-mx-6 sm:-mt-6 mb-6 bg-white border-b border-slate-200 px-6 py-3 flex items-center justify-end gap-3 sticky top-0 z-10">
            <button onclick="renderFinanceReceipts()" class="px-5 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100 rounded-lg transition-all">BATAL</button>
            <button onclick="saveReceipt()" class="flex items-center gap-2 px-6 py-2 text-sm font-bold bg-blue-600 text-white rounded-xl hover:bg-blue-700 shadow-lg shadow-blue-200 transition-all active:scale-95">
                <span class="w-2 h-2 rounded-full bg-white inline-block"></span> SIMPAN PENERIMAAN
            </button>
        </div>
        <div class="space-y-6">
            <div class="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                <div class="px-8 py-4 border-b border-slate-100">
                    <span class="text-[10px] font-black text-blue-600 uppercase tracking-widest">
                        <i class="fas fa-circle text-[6px] mr-1"></i> INFORMASI PENERIMAAN
                    </span>
                </div>
                <div class="px-8 py-6">
                    <div class="grid grid-cols-1 gap-5">
                        <div class="grid grid-cols-2 gap-5">
                            <div>
                                <label class="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Tanggal Terima <span class="text-red-400">*</span></label>
                                <input type="date" id="recDate" value="${new Date().toISOString().slice(0,10)}" class="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-semibold text-slate-700 outline-none focus:border-blue-500 focus:bg-white transition-all">
                            </div>
                            <div>
                                <label class="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Jumlah Diterima (IDR) <span class="text-red-400">*</span></label>
                                <input type="text" id="recAmount" oninput="this.value=formatAmountInput(this.value)" placeholder="0" class="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold text-blue-600 outline-none focus:border-blue-500 focus:bg-white transition-all">
                            </div>
                        </div>
                        <div class="grid grid-cols-2 gap-5">
                            <div>
                                <label class="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Masuk ke (Kas/Bank Penerima) <span class="text-red-400">*</span></label>
                                <select id="recTargetAccount" class="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-semibold text-slate-700 outline-none focus:border-blue-500 focus:bg-white transition-all">
                                    ${assetAccounts.map(a => `<option value="${a.id}">${a.name} (${a.code})</option>`).join('')}
                                </select>
                            </div>
                            <div>
                                <label class="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Sumber COA (Asal Dana) <span class="text-red-400">*</span></label>
                                <select id="recSourceAccount" class="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-semibold text-slate-700 outline-none focus:border-blue-500 focus:bg-white transition-all">
                                    <option value="">- Pilih Akun Sumber -</option>
                                    ${allAccounts.map(a => `<option value="${a.id}">${a.code} - ${a.name}</option>`).join('')}
                                </select>
                            </div>
                        </div>
                        <div class="grid grid-cols-2 gap-5">
                            <div>
                                <label class="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Metode Penerimaan</label>
                                <select id="recMethod" class="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-semibold text-slate-700 outline-none focus:border-blue-500 focus:bg-white transition-all">
                                    <option value="Transfer">Transfer Bank</option>
                                    <option value="Tunai">Tunai / Cash</option>
                                    <option value="Cek/Giro">Cek / Giro</option>
                                </select>
                            </div>
                            <div>
                                <label class="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Keterangan Transaksi</label>
                                <textarea id="recDesc" rows="2" placeholder="Tuliskan alasan atau detail penerimaan dana..." class="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-700 outline-none focus:border-blue-500 focus:bg-white transition-all resize-none"></textarea>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;

window.saveReceipt = async function () {
    const date = document.getElementById('recDate').value;
    const amountVal = document.getElementById('recAmount').value;
    const amount = parseAmountInput(amountVal);
    const targetAccountId = document.getElementById('recTargetAccount').value;
    const sourceAccountId = document.getElementById('recSourceAccount').value;
    const method = document.getElementById('recMethod').value;
    const description = document.getElementById('recDesc').value;

    if (!amount || amount <= 0) return showToast('Mohon isi jumlah penerimaan.', 'error');
    if (!sourceAccountId) return showToast('Mohon pilih akun sumber (COA).', 'error');

    try {
        await api.saveReceipt({ date, amount, targetAccountId, sourceAccountId, method, description });
        showToast('Penerimaan berhasil dicatat', 'success');
        renderFinanceReceipts();
    } catch (err) {
        showToast(err.message, 'error');
    }
};

window.openExpenseModal = function () {
    const mc = document.getElementById('main-content');
    window.renderBreadcrumb(['Finance', 'Pengeluaran Kas & Bank', 'Catat Pengeluaran']);
    const assetAccounts = db.read('accounts').filter(a => a.type === 'ASSET' && a.code.startsWith('11'));
    const expenseAccounts = db.read('accounts').filter(a => a.type === 'EXPENSE');
    const depts = db.read('departments');

    mc.innerHTML = `
        <div class="-mx-4 -mt-4 sm:-mx-6 sm:-mt-6 mb-6 bg-white border-b border-slate-200 px-6 py-3 flex items-center justify-end gap-3 sticky top-0 z-10">
            <button onclick="renderFinanceExpenses()" class="px-5 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100 rounded-lg transition-all">BATAL</button>
            <button onclick="saveExpense()" class="flex items-center gap-2 px-6 py-2 text-sm font-bold bg-rose-600 text-white rounded-xl hover:bg-rose-700 shadow-lg shadow-rose-200 transition-all active:scale-95">
                <span class="w-2 h-2 rounded-full bg-white inline-block"></span> SIMPAN PENGELUARAN
            </button>
        </div>
        <div class="space-y-6">
            <div class="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                <div class="px-8 py-4 border-b border-slate-100">
                    <span class="text-[10px] font-black text-rose-500 uppercase tracking-widest">
                        <i class="fas fa-circle text-[6px] mr-1"></i> INFORMASI PENGELUARAN
                    </span>
                </div>
                <div class="px-8 py-6">
                    <div class="grid grid-cols-1 gap-5">
                        <div class="grid grid-cols-2 gap-5">
                            <div>
                                <label class="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Tanggal Dibayar <span class="text-red-400">*</span></label>
                                <input type="date" id="expDate" value="${new Date().toISOString().slice(0,10)}" class="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-semibold text-slate-700 outline-none focus:border-rose-500 focus:bg-white transition-all">
                            </div>
                            <div>
                                <label class="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Jumlah Dibayar (IDR) <span class="text-red-400">*</span></label>
                                <input type="text" id="expAmount" oninput="this.value=formatAmountInput(this.value)" placeholder="0" class="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold text-rose-600 outline-none focus:border-rose-500 focus:bg-white transition-all">
                            </div>
                        </div>
                        <div class="grid grid-cols-2 gap-5">
                            <div>
                                <label class="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Kas/Bank Pengeluaran <span class="text-red-400">*</span></label>
                                <select id="expFromAccount" class="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-semibold text-slate-700 outline-none focus:border-rose-500 focus:bg-white transition-all">
                                    ${assetAccounts.map(a => `<option value="${a.id}">${a.name} (${a.code})</option>`).join('')}
                                </select>
                            </div>
                            <div>
                                <label class="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">COA (Kategori Biaya) <span class="text-red-400">*</span></label>
                                <select id="expToAccount" class="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-semibold text-slate-700 outline-none focus:border-rose-500 focus:bg-white transition-all">
                                    ${expenseAccounts.map(a => `<option value="${a.id}">${a.name} (${a.code})</option>`).join('')}
                                </select>
                            </div>
                        </div>
                        <div class="grid grid-cols-2 gap-5">
                            <div>
                                <label class="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Metode Pembayaran</label>
                                <select id="expMethod" class="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-semibold text-slate-700 outline-none focus:border-rose-500 focus:bg-white transition-all">
                                    <option value="Transfer">Transfer Bank</option>
                                    <option value="Tunai">Tunai / Cash</option>
                                    <option value="Cek/Giro">Cek / Giro</option>
                                </select>
                            </div>
                            <div>
                                <label class="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Departemen Alokasi</label>
                                <select id="expDept" class="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-semibold text-slate-700 outline-none focus:border-rose-500 focus:bg-white transition-all">
                                    <option value="">- Pilih Departemen -</option>
                                    ${depts.map(d => `<option value="${d.id}">${d.name}</option>`).join('')}
                                </select>
                            </div>
                        </div>
                        <div>
                            <label class="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Kebutuhan / Keterangan</label>
                            <textarea id="expDesc" rows="3" placeholder="Tuliskan tujuan atau kebutuhan pengeluaran dana..." class="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-700 outline-none focus:border-rose-500 focus:bg-white transition-all resize-none"></textarea>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;
};


window.saveExpense = async function () {
    const date = document.getElementById('expDate').value;
    const amountVal = document.getElementById('expAmount').value;
    const amount = parseAmountInput(amountVal);
    const fromAccountId = document.getElementById('expFromAccount').value;
    const toAccountId = document.getElementById('expToAccount').value;
    const departmentId = document.getElementById('expDept').value;
    const method = document.getElementById('expMethod').value;
    const description = document.getElementById('expDesc').value;

    if (!amount || amount <= 0) return showToast('Mohon isi jumlah pengeluaran.', 'error');

    try {
        await api.saveExpense({ date, amount, fromAccountId, toAccountId, departmentId, description, method });
        showToast('Pengeluaran berhasil dicatat', 'success');
        renderFinanceExpenses();
    } catch (err) {
        showToast(err.message, 'error');
    }
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

window.saveManualJournal = async function() {
    const date = document.getElementById('mj_date').value;
    const description = document.getElementById('mj_desc').value;
    const departmentId = document.getElementById('mj_dept').value;
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
        const accountId = row.querySelector('.mj-acc-select').value;
        const debit = parseFloat(row.querySelector('.mj-debit').value || 0);
        const credit = parseFloat(row.querySelector('.mj-credit').value || 0);
        
        if (accountId && (debit > 0 || credit > 0)) {
            items.push({ accountId, debit, credit });
        }
    });

    if (!description) return alert('Keterangan jurnal harus diisi');
    if (items.length < 2) return alert('Minimal harus ada 2 akun (Debit & Kredit)');
    
    const totalDebit = items.reduce((s, i) => s + i.debit, 0);
    const totalCredit = items.reduce((s, i) => s + i.credit, 0);
    
    if (Math.abs(totalDebit - totalCredit) > 0.1) {
        return alert('Total Debit dan Kredit tidak seimbang!');
    }

    try {
        await api.createJournalEntry({
            date,
            description,
            items,
            referenceType: 'MANUAL',
            departmentId,
            partnerId,
            partnerName
        });
        closeModal();
        showToast('Jurnal berhasil diposting');
        renderFinanceJournal();
    } catch (err) {
        showToast(err.message, 'error');
    }
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
    document.getElementById('pageTitle').innerText = 'Receivables (AR)';
    const mc = document.getElementById('main-content');
    
    // Ensure state
    window._uiState.arActiveTab = window._uiState.arActiveTab || 'unpaid';
    window._arFilters = window._arFilters || { q: '', status: '', dateFrom: '', dateTo: '', sortOrder: 'desc' };
    window._arHistoryFilters = window._arHistoryFilters || { q: '', customer: '', date: '', dateFrom: '', dateTo: '' };
    
    const activeTab = window._uiState.arActiveTab;
    const allPayments = db.read('payments') || [];
    const allInvoices = db.read('salesInvoices') || [];

    const tabs = [
        { id: 'unpaid', label: 'Antrean Piutang', icon: 'fa-clock' },
        { id: 'history', label: 'Riwayat Penerimaan', icon: 'fa-history' }
    ];

    let contentHtml = '';

    if (activeTab === 'unpaid') {
        const q = (window._arFilters.q || '').toLowerCase();
        let invoices = allInvoices.filter(i => i.status === 'UNPAID' || i.status === 'PARTIAL');

        // Apply Search
        if (q) {
            invoices = invoices.filter(i => {
                const cName = (i.customerName || db.findById('customers', i.customerId)?.name || '').toLowerCase();
                return i.invoiceNumber.toLowerCase().includes(q) || cName.includes(q);
            });
        }

        // Apply Date Range Filter
        if (window._arFilters.dateFrom || window._arFilters.dateTo) {
            invoices = invoices.filter(i => {
                let ok = true;
                if (window._arFilters.dateFrom && i.date < window._arFilters.dateFrom) ok = false;
                if (window._arFilters.dateTo && i.date > window._arFilters.dateTo) ok = false;
                return ok;
            });
        }

        // Apply Sorting
        const order = window._arFilters.sortOrder === 'asc' ? 1 : -1;
        invoices.sort((a, b) => (a.date > b.date ? 1 : -1) * order);

        const totalAR = invoices.reduce((sum, i) => {
            const paid = allPayments.filter(p => p.invoiceId === i.id).reduce((s, p) => s + (parseFloat(p.amount) || 0), 0);
            return sum + (parseFloat(i.totalAmount) - paid);
        }, 0);

        contentHtml = `
            <!-- Unified Filter & Action Box -->
            <div class="bg-white rounded-2xl shadow-sm border border-slate-100 p-3 flex flex-col md:flex-row items-center gap-3 mb-6">
                <div class="relative flex-1 group w-full">
                    <i class="fas fa-search absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-blue-500 transition-colors"></i>
                    <input type="text" id="arSearchInput" 
                        onkeyup="if(event.key==='Enter') applyARSearch()"
                        value="${window._arFilters.q || ''}"
                        placeholder="Cari No. Faktur atau Nama Pelanggan..." 
                        class="w-full pl-11 pr-4 py-2.5 bg-slate-50/50 rounded-xl border border-slate-100 focus:border-blue-500 focus:bg-white text-sm font-semibold text-slate-700 outline-none transition-all"
                    >
                </div>
                
                <div class="flex items-center gap-3 w-full md:w-auto px-1">
                    <div class="relative flex items-center h-10 bg-white border border-slate-200 rounded-xl shadow-sm overflow-visible">
                        <button onclick="window._arFilters.sortOrder = window._arFilters.sortOrder === 'asc' ? 'desc' : 'asc'; renderFinanceAR()" 
                            class="w-10 h-full flex items-center justify-center bg-slate-50 border-r border-slate-200 text-slate-400 hover:text-blue-600 transition-all">
                            <i class="fas fa-sort-amount-${window._arFilters.sortOrder === 'asc' ? 'up' : 'down'}-alt text-xs"></i>
                        </button>
                        <div onclick="window._uiState.arDatePopoverOpen = !window._uiState.arDatePopoverOpen; renderFinanceAR()" 
                            class="relative flex items-center h-full px-4 cursor-pointer hover:bg-slate-50 transition-all group min-w-[100px]">
                            <span class="text-sm font-bold text-blue-600 mr-3">Date</span>
                            <i class="fas fa-chevron-down text-blue-300 text-[10px] transition-transform ${window._uiState.arDatePopoverOpen ? 'rotate-180' : ''}"></i>
                        </div>

                        <div class="${window._uiState.arDatePopoverOpen ? 'block' : 'hidden'} absolute top-full left-0 mt-3 w-80 bg-white rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.15)] border border-slate-100 p-6 z-[100] animate-in fade-in zoom-in-95 duration-200">
                            <div class="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-5">FILTER RANGE</div>
                            <div class="grid grid-cols-2 gap-4 mb-6">
                                <div class="space-y-1.5">
                                    <label class="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">DARI</label>
                                    <input type="date" id="arDateFrom" value="${window._arFilters.dateFrom || ''}" class="w-full bg-slate-50 border-none rounded-xl px-4 py-3 text-sm font-bold text-slate-700 outline-none">
                                </div>
                                <div class="space-y-1.5">
                                    <label class="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">KE</label>
                                    <input type="date" id="arDateTo" value="${window._arFilters.dateTo || ''}" class="w-full bg-slate-50 border-none rounded-xl px-4 py-3 text-sm font-bold text-slate-700 outline-none">
                                </div>
                            </div>
                            <div class="flex gap-3">
                                <button onclick="applyARDateRange()" class="flex-1 bg-blue-600 text-white py-3.5 rounded-2xl text-xs font-black uppercase tracking-widest shadow-lg shadow-blue-200">APPLY</button>
                                <button onclick="resetARDateRange()" class="flex-1 bg-slate-50 text-slate-400 py-3.5 rounded-2xl text-xs font-black uppercase tracking-widest">RESET</button>
                            </div>
                        </div>
                    </div>

                    <div class="px-5 py-1.5 bg-orange-50 rounded-xl border border-orange-100 flex flex-col items-center justify-center min-w-[160px] h-10 shadow-sm shadow-orange-50">
                        <span class="text-[9px] font-black text-orange-400 uppercase tracking-widest leading-none mb-0.5">Total Outstanding</span>
                        <span class="text-sm font-black text-orange-700 leading-none">${formatCurrency(totalAR)}</span>
                    </div>

                    <button onclick="openFinanceARPaymentModal()" class="flex items-center justify-center gap-2 px-6 h-10 bg-blue-600 hover:bg-slate-900 text-white rounded-xl text-sm font-bold shadow-lg shadow-blue-200 transition-all active:scale-95 whitespace-nowrap">
                        <i class="fas fa-plus"></i> INPUT PELUNASAN
                    </button>
                </div>
            </div>

            <div class="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">
                TOTAL: ${invoices.length} PIUTANG AKTIF
            </div>

            <!-- Table View -->
            <div class="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                <div class="overflow-x-auto">
                    <table class="w-full text-left border-collapse">
                        <thead>
                            <tr class="bg-slate-50/50">
                                <th class="px-4 py-4 w-10">
                                    <input type="checkbox" class="rounded border-slate-300 text-blue-600 focus:ring-blue-500">
                                </th>
                                <th class="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">Customer Name</th>
                                <th class="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 text-center">Status</th>
                                <th class="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 text-center">Date</th>
                                <th class="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 text-right">Balance</th>
                                <th class="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">No. Invoice</th>
                                <th class="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 text-right">Aksi</th>
                            </tr>
                        </thead>
                        <tbody class="divide-y divide-slate-50">
                            ${invoices.map(i => {
                                const paid = allPayments.filter(p => p.invoiceId === i.id).reduce((s, p) => s + (parseFloat(p.amount) || 0), 0);
                                const balance = parseFloat(i.totalAmount) - paid;
                                
                                // Status Pill Style
                                let statusClass = 'bg-slate-100 text-slate-600 border-slate-200';
                                if (i.status === 'PAID') statusClass = 'bg-emerald-50 text-emerald-600 border border-emerald-200';
                                else if (i.status === 'PARTIAL') statusClass = 'bg-amber-50 text-amber-600 border border-amber-200';
                                else if (i.status === 'UNPAID') statusClass = 'bg-rose-50 text-rose-600 border border-rose-200';

                                return `
                                <tr class="hover:bg-slate-50/50 transition-colors group">
                                    <td class="px-4 py-4">
                                        <input type="checkbox" class="rounded border-slate-300 text-blue-600 focus:ring-blue-500">
                                    </td>
                                    <td class="px-6 py-4">
                                        <div class="text-sm font-bold text-slate-800">${i.customerName || db.findById('customers', i.customerId)?.name || 'Unknown'}</div>
                                    </td>
                                    <td class="px-6 py-4 text-center">
                                        <span class="px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-wider border ${statusClass}">
                                            ${i.status}
                                        </span>
                                    </td>
                                    <td class="px-6 py-4 text-center text-xs font-bold text-slate-600">
                                        ${i.date ? i.date.split('-').reverse().join('-') : '-'}
                                    </td>
                                    <td class="px-6 py-4 text-right">
                                        <div class="text-sm font-bold text-slate-800">${formatCurrency(balance)}</div>
                                    </td>
                                    <td class="px-6 py-4">
                                        <div class="px-3 py-1 bg-blue-50 text-blue-600 border border-blue-100 rounded-lg text-[10px] font-black w-fit hover:bg-blue-600 hover:text-white transition-all cursor-pointer">
                                            ${i.invoiceNumber}
                                        </div>
                                    </td>
                                    <td class="px-6 py-4 text-right">
                                        <div class="flex justify-end">
                                            <div class="relative group/action">
                                                <select onchange="handleARAction(this.value, '${i.id}')" class="appearance-none bg-slate-50 border border-slate-200 rounded-lg pl-3 pr-8 py-1.5 text-[10px] font-bold text-slate-600 outline-none cursor-pointer hover:bg-white hover:border-blue-300 transition-all shadow-sm">
                                                    <option value="">Pilih Aksi...</option>
                                                    <option value="view">Detail Faktur</option>
                                                    <option value="pay">Input Bayar</option>
                                                </select>
                                                <div class="absolute inset-y-0 right-0 flex items-center pr-2 pointer-events-none text-slate-400">
                                                    <i class="fas fa-chevron-down text-[8px]"></i>
                                                </div>
                                            </div>
                                        </div>
                                    </td>
                                </tr>
                            `}).join('') || `
                                <tr>
                                    <td colspan="7" class="px-6 py-20 text-center text-slate-400 italic">
                                        Tidak ada data piutang ditemukan.
                                    </td>
                                </tr>
                            `}
                        </tbody>
                    </table>
                </div>
            </div>

        `;
    } else {
        const q = (window._arHistoryFilters.q || '').toLowerCase();
        let payments = [...allPayments].sort((a, b) => new Date(b.date) - new Date(a.date));
        
        // Apply History Search
        if (q) {
            payments = payments.filter(p => {
                const inv = db.findById('salesInvoices', p.invoiceId);
                const cName = (inv?.customerName || db.findById('customers', inv?.customerId)?.name || '').toLowerCase();
                return p.paymentNumber.toLowerCase().includes(q) || cName.includes(q);
            });
        }

        // Apply History Date Range
        if (window._arHistoryFilters.dateFrom || window._arHistoryFilters.dateTo) {
            payments = payments.filter(p => {
                let ok = true;
                if (window._arHistoryFilters.dateFrom && p.date < window._arHistoryFilters.dateFrom) ok = false;
                if (window._arHistoryFilters.dateTo && p.date > window._arHistoryFilters.dateTo) ok = false;
                return ok;
            });
        }

        contentHtml = `
            <!-- History Filter Row -->
            <div class="flex flex-col md:flex-row items-center justify-between gap-4 bg-white p-4 rounded-xl border border-slate-200 shadow-sm mb-6">
                <div class="flex items-center gap-4 w-full md:w-auto flex-1">
                    <div class="relative flex-1 md:flex-none md:w-80 group">
                        <div class="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                            <i class="fas fa-search text-slate-400 group-focus-within:text-blue-500 transition-colors"></i>
                        </div>
                        <input type="text" id="arHistSearchInput" value="${window._arHistoryFilters.q || ''}" 
                            onkeyup="if(event.key==='Enter') applyARHistSearch()"
                            placeholder="Cari No. Ref atau Pelanggan..." 
                            class="block w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all">
                    </div>
                    
                    <!-- History Date Pop-over -->
                    <div class="relative flex items-center bg-white border border-slate-200 rounded-xl overflow-visible shadow-sm h-10">
                        <div class="w-10 h-full flex items-center justify-center bg-slate-50 border-r border-slate-200 text-slate-500">
                            <i class="fas fa-calendar-alt text-xs"></i>
                        </div>
                        <div onclick="window._uiState.arHistDatePopoverOpen = !window._uiState.arHistDatePopoverOpen; renderFinanceAR()" 
                            class="relative flex items-center h-full px-4 cursor-pointer hover:bg-slate-50 transition-all group min-w-[100px]">
                            <span class="text-sm font-bold text-blue-600 mr-3">Date</span>
                            <i class="fas fa-chevron-down text-blue-300 text-[10px] transition-transform ${window._uiState.arHistDatePopoverOpen ? 'rotate-180' : ''}"></i>
                        </div>

                        <div class="${window._uiState.arHistDatePopoverOpen ? 'block' : 'hidden'} absolute top-full left-0 mt-3 w-80 bg-white rounded-3xl shadow-[0_20px_50px_rgba(0,0,0,0.2)] border border-slate-100 p-6 z-[100]">
                            <div class="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-5">FILTER RIWAYAT</div>
                            <div class="grid grid-cols-2 gap-4 mb-6">
                                <div class="space-y-1.5">
                                    <label class="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">DARI</label>
                                    <input type="date" id="arHistDateFrom" value="${window._arHistoryFilters.dateFrom || ''}" class="w-full bg-slate-50 border-none rounded-2xl px-4 py-3 text-sm font-bold text-slate-700 outline-none">
                                </div>
                                <div class="space-y-1.5">
                                    <label class="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">KE</label>
                                    <input type="date" id="arHistDateTo" value="${window._arHistoryFilters.dateTo || ''}" class="w-full bg-slate-50 border-none rounded-2xl px-4 py-3 text-sm font-bold text-slate-700 outline-none">
                                </div>
                            </div>
                            <div class="flex gap-3">
                                <button onclick="applyARHistDateRange()" class="flex-1 bg-blue-600 text-white py-3.5 rounded-2xl text-xs font-black uppercase tracking-widest shadow-lg shadow-blue-200">APPLY</button>
                                <button onclick="resetARHistDateRange()" class="flex-1 bg-slate-50 text-slate-400 py-3.5 rounded-2xl text-xs font-black uppercase tracking-widest">RESET</button>
                            </div>
                        </div>
                    </div>
                </div>
                <div class="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                    TOTAL: ${payments.length} PENERIMAAN
                </div>
            </div>

            <div class="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                <table class="w-full text-left border-collapse">
                    <thead>
                        <tr class="bg-slate-50/50">
                            <th class="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">Tanggal</th>
                            <th class="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">No. Ref</th>
                            <th class="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">Faktur</th>
                            <th class="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">Customer</th>
                            <th class="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 text-right">Jumlah</th>
                        </tr>
                    </thead>
                    <tbody class="divide-y divide-slate-50">
                        ${payments.map(p => {
                            const inv = db.findById('salesInvoices', p.invoiceId) || { invoiceNumber: '-', customerId: null };
                            const cName = inv.customerName || db.findById('customers', inv.customerId)?.name || '-';
                            return `
                                <tr class="hover:bg-slate-50/50 transition-colors group">
                                    <td class="px-6 py-4 text-xs font-bold text-slate-500">${p.date.split('-').reverse().join('-')}</td>
                                    <td class="px-6 py-4">
                                        <div class="text-sm font-black text-slate-700">${p.paymentNumber}</div>
                                    </td>
                                    <td class="px-6 py-4">
                                        <div class="text-[10px] font-black px-2 py-1 bg-slate-100 text-slate-500 rounded-md w-fit">${inv.invoiceNumber}</div>
                                    </td>
                                    <td class="px-6 py-4 text-sm font-bold text-slate-600">${cName}</td>
                                    <td class="px-6 py-4 text-right font-black text-emerald-600">${formatCurrency(p.amount)}</td>
                                </tr>
                            `;
                        }).join('') || '<tr><td colspan="5" class="px-6 py-12 text-center text-slate-400 italic">Belum ada riwayat.</td></tr>'}
                    </tbody>
                </table>
            </div>
        `;
    }

    mc.innerHTML = `
        <div class="space-y-6">
            <div class="flex items-center gap-8 border-b border-slate-200 mb-6 px-2">
                ${tabs.map(t => `
                    <button onclick="window._uiState.arActiveTab='${t.id}'; renderFinanceAR()" 
                        class="pb-4 text-sm font-bold transition-all relative ${activeTab === t.id ? 'text-blue-600' : 'text-slate-400 hover:text-slate-600'}">
                        ${t.label}
                        ${activeTab === t.id ? '<div class="absolute -bottom-[1px] left-0 w-full h-[3px] bg-blue-600 rounded-full shadow-[0_2px_10px_rgba(37,99,235,0.3)]"></div>' : ''}
                    </button>
                `).join('')}
            </div>
            ${contentHtml}
        </div>
    `;

    // Maintain search focus
    const input = document.getElementById('arSearchInput');
    if (input) {
        input.focus();
        const val = input.value; input.value = ''; input.value = val;
    }
};

window.applyARSearch = function() {
    window._arFilters.q = document.getElementById('arSearchInput')?.value || '';
    renderFinanceAR();
};

window.applyARHistFilters = function() {
    window._arHistoryFilters = {
        customer: document.getElementById('arHistFilterCustomer')?.value || '',
        date: document.getElementById('arHistFilterDate')?.value || ''
    };
    renderFinanceAR();
};

window.resetARHistoryFilters = function() {
    window._arHistoryFilters = { customer: '', date: '' };
    renderFinanceAR();
};

window.handleARAction = function(action, id) {
    if (!action) return;
    if (action === 'view') navigateTo('sales-invoices', { invoiceId: id });
    else if (action === 'pay') openFinanceARPaymentModal(id);
};

window.applyARSearch = function() {
    window._arFilters.q = document.getElementById('arSearchInput')?.value || '';
    renderFinanceAR();
};

window.applyARDateRange = function() {
    window._arFilters.dateFrom = document.getElementById('arDateFrom')?.value || '';
    window._arFilters.dateTo = document.getElementById('arDateTo')?.value || '';
    window._uiState.arDatePopoverOpen = false;
    renderFinanceAR();
};

window.resetARDateRange = function() {
    window._arFilters.dateFrom = '';
    window._arFilters.dateTo = '';
    window._uiState.arDatePopoverOpen = false;
    renderFinanceAR();
};

window.applyARHistSearch = function() {
    window._arHistoryFilters.q = document.getElementById('arHistSearchInput')?.value || '';
    renderFinanceAR();
};

window.applyARHistDateRange = function() {
    window._arHistoryFilters.dateFrom = document.getElementById('arHistDateFrom')?.value || '';
    window._arHistoryFilters.dateTo = document.getElementById('arHistDateTo')?.value || '';
    window._uiState.arHistDatePopoverOpen = false;
    renderFinanceAR();
};

window.resetARHistDateRange = function() {
    window._arHistoryFilters.q = '';
    window._arHistoryFilters.dateFrom = '';
    window._arHistoryFilters.dateTo = '';
    window._uiState.arHistDatePopoverOpen = false;
    renderFinanceAR();
};
;

// --- Finance AR Payment Feature ---
window.openFinanceARPaymentModal = () => {
    const mc = document.getElementById('main-content');
    window.renderBreadcrumb(['Finance', 'Data Piutang (AR)', 'Input Pelunasan']);
    const invoices = db.read('salesInvoices');
    const payments = db.read('payments');
    const customers = db.read('customers');
