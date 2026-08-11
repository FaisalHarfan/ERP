// Initialize Global States and Filters
window.getBaseType = function(type) {
    if (!type) return 'ASSET';
    const customTypes = db.read('accountTypes') || [];
    const match = customTypes.find(t => t.id === type || t.name.toLowerCase() === type.toLowerCase());
    if (match && (match.base_type || match.baseType)) {
        return (match.base_type || match.baseType).toUpperCase();
    }
    const t = type.toUpperCase();
    if (t.includes('ASSET') || t.includes('ASET') || t.includes('HARTA') || t.includes('KAS') || t.includes('BANK')) return 'ASSET';
    if (t.includes('LIABILITY') || t.includes('LIABILITAS') || t.includes('HUTANG') || t.includes('KEWAJIBAN')) return 'LIABILITY';
    if (t.includes('EQUITY') || t.includes('EKUITAS') || t.includes('MODAL')) return 'EQUITY';
    if (t.includes('INCOME') || t.includes('PENDAPATAN') || t.includes('PENJUALAN')) return 'INCOME';
    if (t.includes('EXPENSE') || t.includes('BEBAN') || t.includes('BIAYA')) return 'EXPENSE';
    return 'ASSET'; // default fallback
};

window._uiState = window._uiState || {};
window._apFilters = window._apFilters || { status: 'BELUM_LUNAS', supplierId: '', startDate: '', endDate: '' };
window._apHistoryFilters = window._apHistoryFilters || { supplierId: '', date: '', method: '' };
window._arFilters = window._arFilters || { customer: '', date: '' };
window._arHistoryFilters = window._arHistoryFilters || { customer: '', date: '', method: '' };
window._journalFilters = window._journalFilters || { q: '' };
window._expenseFilters = window._expenseFilters || { q: '', dateFrom: '', dateTo: '', sortOrder: 'desc' };
window._receiptFilters = window._receiptFilters || { q: '', dateFrom: '', dateTo: '', sortOrder: 'desc' };
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
window._uiState.expenseActiveTab = window._uiState.expenseActiveTab || 'list';
window._uiState.recFilterOpen = window._uiState.recFilterOpen ?? false;
window._uiState.receiptActiveTab = window._uiState.receiptActiveTab || 'list';
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

// Format date as DD/MM/YYYY (date only, no time)
window.formatDateOnly = function(isoString) {
    if (!isoString) return '-';
    try {
        // Handle YYYY-MM-DD and ISO datetime strings
        const dateStr = isoString.split('T')[0];
        const parts = dateStr.split('-');
        if (parts.length === 3) {
            return `${parts[2]}/${parts[1]}/${parts[0]}`;
        }
        const date = new Date(isoString);
        if (isNaN(date.getTime())) return isoString;
        const d = String(date.getDate()).padStart(2, '0');
        const m = String(date.getMonth() + 1).padStart(2, '0');
        const y = date.getFullYear();
        return `${d}/${m}/${y}`;
    } catch (e) {
        return isoString;
    }
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
    const totalOutgoingBills = purchaseInvoices.filter(i => i.status !== 'CANCELLED').reduce((sum, i) => sum + (parseFloat(i.totalAmount) || 0), 0);
    const totalIncomingBills = salesInvoices.filter(i => i.status !== 'CANCELLED').reduce((sum, i) => sum + (parseFloat(i.totalAmount) || 0), 0);
    const totalIncomingPayment = allPayments.reduce((sum, p) => sum + (parseFloat(p.amount) || 0), 0);
    const totalOutgoingPayment = allSuppPayments.reduce((sum, p) => sum + (parseFloat(p.amount) || 0), 0);

    // 2. Profit and Loss Stats
    const totalIncomeThisYear = accounts.filter(a => a && getBaseType(a.type) === 'INCOME').reduce((sum, a) => sum + Math.abs(db.getAccountBalance(a.id) || 0), 0);
    const totalExpenseThisYear = accounts.filter(a => a && getBaseType(a.type) === 'EXPENSE').reduce((sum, a) => sum + Math.abs(db.getAccountBalance(a.id) || 0), 0);
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

    // Dynamically calculate the last 7 months labels
    const getPastMonths = () => {
        const list = [];
        const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        const today = new Date();
        for (let i = 6; i >= 0; i--) {
            const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
            list.push(`${monthNames[d.getMonth()]} ${d.getFullYear()}`);
        }
        return list;
    };
    const months = getPastMonths();

    const getMonthLabel = (dateStr) => {
        if (!dateStr) return null;
        const date = new Date(dateStr);
        if (isNaN(date.getTime())) return null;
        const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        return `${monthNames[date.getMonth()]} ${date.getFullYear()}`;
    };

    const getMonthData = (invoices) => {
        const dataMap = {};
        months.forEach(m => dataMap[m] = 0);
        invoices.forEach(inv => {
            const dateStr = inv.date || inv.createdAt;
            if (!dateStr) return;
            const lbl = getMonthLabel(dateStr);
            if (lbl && lbl in dataMap) {
                dataMap[lbl] += (parseFloat(inv.totalAmount) || parseFloat(inv.grandTotal) || 0);
            }
        });
        return months.map(m => dataMap[m]);
    };

    const chartOptions = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
            y: { beginAtZero: true, grid: { color: '#f0f0f0', drawBorder: false }, ticks: { color: '#888', font: { size: 10 } } },
            x: { grid: { display: false }, ticks: { color: '#888', font: { size: 9 } } }
        }
    };

    // 1. Incoming Bills Trend (Purchase Invoices)
    const ctxInc = document.getElementById('chartIncomingBills');
    if (ctxInc) {
        new Chart(ctxInc, {
            type: 'line',
            data: {
                labels: months,
                datasets: [{
                    data: getMonthData(purchaseInvoices),
                    borderColor: '#3b82f6',
                    borderWidth: 2,
                    pointRadius: 2,
                    tension: 0.2,
                    fill: true,
                    backgroundColor: 'rgba(59, 130, 246, 0.05)'
                }]
            },
            options: chartOptions
        });
    }

    // 2. Outgoing Bills Trend (Sales Invoices)
    const ctxOut = document.getElementById('chartOutgoingBills');
    if (ctxOut) {
        new Chart(ctxOut, {
            type: 'line',
            data: {
                labels: months,
                datasets: [{
                    data: getMonthData(salesInvoices),
                    borderColor: '#10b981',
                    borderWidth: 2,
                    pointRadius: 2,
                    tension: 0.2,
                    fill: true,
                    backgroundColor: 'rgba(16, 185, 129, 0.05)'
                }]
            },
            options: chartOptions
        });
    }

    // Read latest payments
    const payments = db.read('payments') || [];
    const suppPayments = db.read('supplierPayments') || [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // 3. AR Ageing (Bar)
    const arBuckets = { current: 0, d1_30: 0, d31_60: 0, d61_90: 0, older: 0 };
    salesInvoices.forEach(inv => {
        const invPayments = payments.filter(p => p.invoiceId === inv.id);
        const totalPaid = invPayments.reduce((sum, p) => sum + (parseFloat(p.amount) || 0), 0);
        const balance = (parseFloat(inv.totalAmount) || 0) - totalPaid;

        if (balance <= 0) return;

        const invDate = new Date(inv.date || inv.createdAt);
        invDate.setHours(0, 0, 0, 0);
        const diffTime = Math.abs(today - invDate);
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        if (diffDays === 0) arBuckets.current += balance;
        else if (diffDays <= 30) arBuckets.d1_30 += balance;
        else if (diffDays <= 60) arBuckets.d31_60 += balance;
        else if (diffDays <= 90) arBuckets.d61_90 += balance;
        else arBuckets.older += balance;
    });

    const ctxAR = document.getElementById('chartARAgeing');
    if (ctxAR) {
        new Chart(ctxAR, {
            type: 'bar',
            data: {
                labels: ['Current', '1-30 Days', '31-60 Days', '61-90 Days', '90+ Days'],
                datasets: [{
                    data: [arBuckets.current, arBuckets.d1_30, arBuckets.d31_60, arBuckets.d61_90, arBuckets.older],
                    backgroundColor: ['#10b981', '#60a5fa', '#fbbf24', '#f87171', '#ef4444'],
                    barThickness: 20,
                    borderRadius: 4
                }]
            },
            options: {
                ...chartOptions,
                plugins: { legend: { display: false } }
            }
        });
    }

    // 4. AP Ageing (Bar)
    const apBuckets = { current: 0, d1_30: 0, d31_60: 0, d61_90: 0, older: 0 };
    purchaseInvoices.forEach(inv => {
        const invPayments = suppPayments.filter(p => p.invoiceId === inv.id);
        const totalPaid = invPayments.reduce((sum, p) => sum + (parseFloat(p.amount) || 0), 0);
        const balance = (parseFloat(inv.totalAmount) || 0) - totalPaid;

        if (balance <= 0) return;

        const invDate = new Date(inv.date || inv.createdAt);
        invDate.setHours(0, 0, 0, 0);
        const diffTime = Math.abs(today - invDate);
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        if (diffDays === 0) apBuckets.current += balance;
        else if (diffDays <= 30) apBuckets.d1_30 += balance;
        else if (diffDays <= 60) apBuckets.d31_60 += balance;
        else if (diffDays <= 90) apBuckets.d61_90 += balance;
        else apBuckets.older += balance;
    });

    const ctxAP = document.getElementById('chartAPAgeing');
    if (ctxAP) {
        new Chart(ctxAP, {
            type: 'bar',
            data: {
                labels: ['Current', '1-30 Days', '31-60 Days', '61-90 Days', '90+ Days'],
                datasets: [{
                    data: [apBuckets.current, apBuckets.d1_30, apBuckets.d31_60, apBuckets.d61_90, apBuckets.older],
                    backgroundColor: ['#10b981', '#60a5fa', '#fbbf24', '#f87171', '#ef4444'],
                    barThickness: 20,
                    borderRadius: 4
                }]
            },
            options: {
                ...chartOptions,
                plugins: { legend: { display: false } }
            }
        });
    }

    // 5. Bank Balance Trend (Line)
    const bankBalanceData = months.map(m => {
        const parts = m.split(' ');
        const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        const monthIdx = monthNames.indexOf(parts[0]);
        const year = parseInt(parts[1]);
        const endDate = new Date(year, monthIdx + 1, 0, 23, 59, 59, 999);

        let balance = 0;
        const bankAccountIds = accounts.filter(a => a.id === 'acc_cash' || a.id === 'acc_bank' || a.name.toLowerCase().includes('bank') || a.name.toLowerCase().includes('kas')).map(a => a.id);
        
        accounts.forEach(a => {
            if (bankAccountIds.includes(a.id)) {
                balance += (parseFloat(a.openingBalance) || 0);
            }
        });

        journal.forEach(entry => {
            const entryDate = new Date(entry.date);
            if (entryDate <= endDate) {
                entry.items.forEach(item => {
                    if (bankAccountIds.includes(item.accountId)) {
                        balance += (parseFloat(item.debit) || 0) - (parseFloat(item.credit) || 0);
                    }
                });
            }
        });

        return balance;
    });

    const ctxBank = document.getElementById('chartBankBalanceTrend');
    if (ctxBank) {
        new Chart(ctxBank, {
            type: 'line',
            data: {
                labels: months,
                datasets: [{
                    data: bankBalanceData,
                    borderColor: '#f43f5e',
                    borderWidth: 2,
                    pointRadius: 2,
                    tension: 0.2,
                    fill: true,
                    backgroundColor: 'rgba(244, 63, 94, 0.05)'
                }]
            },
            options: chartOptions
        });
    }

    // 6. Budget Variance (Bar)
    const expenseAccounts = accounts.filter(a => getBaseType(a.type) === 'EXPENSE');
    const expLabels = expenseAccounts.map(a => a.name);
    const expActuals = expenseAccounts.map(a => {
        let balance = 0;
        journal.forEach(entry => {
            entry.items.forEach(item => {
                if (item.accountId === a.id) {
                    balance += (parseFloat(item.debit) || 0) - (parseFloat(item.credit) || 0);
                }
            });
        });
        return Math.abs(balance);
    });
    const expBudgets = expActuals.map(act => Math.max(act * 1.25, 10000000));

    const ctxBudget = document.getElementById('chartBudgetVariance');
    if (ctxBudget) {
        new Chart(ctxBudget, {
            type: 'bar',
            data: {
                labels: expLabels,
                datasets: [
                    { label: 'Budget', data: expBudgets, backgroundColor: '#cbd5e1', barThickness: 12, borderRadius: 3 },
                    { label: 'Actual', data: expActuals, backgroundColor: '#3b82f6', barThickness: 12, borderRadius: 3 }
                ]
            },
            options: {
                ...chartOptions,
                plugins: { legend: { display: true, position: 'top', labels: { boxWidth: 8, font: { size: 9 } } } }
            }
        });
    }
};

window.renderFinanceAccounts = function () {
    document.getElementById('pageTitle').innerText = 'Chart of Accounts (COA)';
    const mc = document.getElementById('main-content');
    
    let accounts = db.read('accounts');
    let q = (window._coaFilters?.q || '').toLowerCase();
    const accountTypes = db.read('accountTypes') || [];
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

    const getCalculatedBalance = (node) => {
        if (!node) return 0;
        if (!node.id.startsWith('type_') && !node.isGroup) {
            return db.getAccountBalance(node.id);
        }
        let total = 0;
        if (node.children && node.children.length > 0) {
            node.children.forEach(child => {
                total += getCalculatedBalance(child);
            });
        }
        return total;
    };

    const buildTree = (list) => {
        const typeRoots = {};
        accountTypes.forEach(t => {
            typeRoots[t.id] = {
                id: `type_${t.id}`,
                name: t.name,
                isGroup: true,
                children: []
            };
        });

        const unknownRoot = {
            id: 'type_unknown',
            name: 'Tanpa Tipe',
            isGroup: true,
            children: []
        };

        const accountMap = {};
        list.forEach(acc => {
            accountMap[acc.id] = { ...acc, children: [] };
        });

        list.forEach(acc => {
            const node = accountMap[acc.id];
            if (acc.parentId && accountMap[acc.parentId] !== undefined) {
                accountMap[acc.parentId].children.push(node);
            } else {
                const typeId = acc.type;
                if (typeRoots[typeId]) {
                    typeRoots[typeId].children.push(node);
                } else {
                    const match = accountTypes.find(t => t.name.toLowerCase() === (typeId || '').toLowerCase());
                    if (match && typeRoots[match.id]) {
                        typeRoots[match.id].children.push(node);
                    } else {
                        unknownRoot.children.push(node);
                    }
                }
            }
        });

        const finalRoots = Object.values(typeRoots);
        if (unknownRoot.children.length > 0) {
            finalRoots.push(unknownRoot);
        }

        if (q) {
            return finalRoots.filter(r => r.children && r.children.length > 0);
        }
        return finalRoots;
    };

    const treeData = buildTree(JSON.parse(JSON.stringify(filteredAccounts)));

    const renderNode = (node, depth = 0) => {
        const isGroup = node.isGroup || (node.children && node.children.length > 0);
        const isExpanded = window._coaExpandedNodes[node.id] || false;
        const balance = getCalculatedBalance(node);
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

        const isVirtual = node.id.startsWith('type_');
        
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
                        
                        <!-- Dropdown Aksi -->
                        <div class="relative inline-block text-left">
                            <button onclick="toggleCOAActionDropdown('${node.id}', event)" class="opacity-0 group-hover:opacity-100 transition-opacity p-1 text-slate-400 hover:text-blue-600 hover:bg-slate-100 rounded-lg flex items-center justify-center w-6 h-6 shadow-sm border border-slate-100 bg-white" title="Pilihan Aksi">
                                <i class="fas fa-ellipsis-v text-[10px]"></i>
                            </button>
                            <div id="dropdown-${node.id}" class="coa-dropdown hidden absolute left-0 mt-1 w-32 bg-white rounded-xl border border-slate-200 shadow-xl z-50 py-1.5 text-xs text-left animate-in fade-in slide-in-from-top-1 duration-150">
                                ${isVirtual ? `
                                    <button onclick="editAccountType('${node.id.replace('type_', '')}'); hideCOAActionDropdowns(event);" class="w-full text-left px-3 py-1.5 text-slate-700 hover:bg-slate-50 transition-colors flex items-center gap-2 font-semibold">
                                        <i class="fas fa-edit text-slate-400 w-4 text-center"></i> Edit Tipe
                                    </button>
                                ` : `
                                    <button onclick="editAccount('${node.id}'); hideCOAActionDropdowns(event);" class="w-full text-left px-3 py-1.5 text-slate-700 hover:bg-slate-50 transition-colors flex items-center gap-2 font-semibold">
                                        <i class="fas fa-edit text-slate-400 w-4 text-center"></i> Edit
                                    </button>
                                    <button onclick="deleteAccount('${node.id}'); hideCOAActionDropdowns(event);" class="w-full text-left px-3 py-1.5 text-red-600 hover:bg-red-50/50 transition-colors flex items-center gap-2 font-semibold">
                                        <i class="fas fa-trash-alt text-red-400 w-4 text-center"></i> Delete
                                    </button>
                                `}
                                <button onclick="addChildAccount('${node.id}'); hideCOAActionDropdowns(event);" class="w-full text-left px-3 py-1.5 text-blue-600 hover:bg-blue-50/50 transition-colors flex items-center gap-2 font-semibold">
                                    <i class="fas fa-plus text-blue-400 w-4 text-center"></i> Add Child
                                </button>
                                <button onclick="viewAccountLedger('${node.id}'); hideCOAActionDropdowns(event);" class="w-full text-left px-3 py-1.5 text-slate-700 hover:bg-slate-50 transition-colors flex items-center gap-2 font-semibold">
                                    <i class="fas fa-file-invoice text-slate-400 w-4 text-center"></i> Ledger
                                </button>
                            </div>
                        </div>
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
                    <button onclick="openManageAccountTypesModal()" class="px-3 py-2 bg-slate-800 text-white rounded-xl text-[10px] font-bold hover:bg-slate-900 transition-all flex items-center gap-2 shadow-sm">
                        <i class="fas fa-tags"></i> KELOLA TIPE AKUN
                    </button>
                </div>
            </div>

            <!-- Tree Container -->
            <div class="bg-white rounded-xl border border-slate-200 shadow-sm overflow-visible">
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

window.toggleCOAActionDropdown = function(id, event) {
    if (event) {
        event.stopPropagation();
        event.preventDefault();
    }
    const dropdown = document.getElementById(`dropdown-${id}`);
    if (!dropdown) return;
    
    const wasHidden = dropdown.classList.contains('hidden');
    document.querySelectorAll('.coa-dropdown').forEach(d => d.classList.add('hidden'));
    
    if (wasHidden) {
        dropdown.classList.remove('hidden');
    }
};

window.hideCOAActionDropdowns = function(event) {
    if (event) {
        event.stopPropagation();
    }
    document.querySelectorAll('.coa-dropdown').forEach(d => d.classList.add('hidden'));
};

// Global click listener to close dropdowns when clicking anywhere outside
if (!window._coaDropdownListenerAdded) {
    document.addEventListener('click', () => {
        document.querySelectorAll('.coa-dropdown').forEach(d => d.classList.add('hidden'));
    });
    window._coaDropdownListenerAdded = true;
}

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
    viewAccountMutasi(accountId);
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
    const accountTypes = db.read('accountTypes') || [];
    
    let defaultType = accountTypes[0]?.id || 'type_asset';
    let cleanParentId = parentId || '';
    
    if (cleanParentId) {
        const parentAcc = accounts.find(a => a.id === cleanParentId);
        if (parentAcc && parentAcc.type) {
            defaultType = parentAcc.type;
        }
    }

    const selectedType = acc ? acc.type : defaultType;
    const cleanSelectedType = selectedType === 'ASSET' ? 'type_asset' :
                              selectedType === 'LIABILITY' ? 'type_liability' :
                              selectedType === 'EQUITY' ? 'type_equity' :
                              selectedType === 'INCOME' ? 'type_income' :
                              selectedType === 'EXPENSE' ? 'type_expense' : selectedType;

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
                    <div class="flex gap-2">
                        <select id="accType" class="flex-1 border border-gray-200 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none" required>
                            ${accountTypes.map(t => `<option value="${t.id}" ${cleanSelectedType === t.id ? 'selected' : ''}>${t.name}</option>`).join('')}
                        </select>
                        <button type="button" onclick="toggleNewAccountTypeForm()" class="px-3 bg-blue-50 border border-blue-200 hover:bg-blue-100 text-blue-600 rounded-lg transition-colors flex items-center justify-center" title="Tambah Tipe Akun Baru">
                            <i class="fas fa-plus"></i>
                        </button>
                    </div>
                    <!-- Inline Add Account Type Form Card (Initially Hidden) -->
                    <div id="newAccountTypeCard" class="hidden border border-blue-100 bg-blue-50/30 rounded-xl p-3.5 mt-3 space-y-3 shadow-inner">
                        <p class="text-xs font-bold text-blue-800 uppercase tracking-wider">Tambah Tipe Akun Baru</p>
                        <div class="space-y-2">
                            <div>
                                <label class="block text-[10px] font-bold text-slate-500 mb-1">Nama Tipe Akun</label>
                                <input type="text" id="newTypeName" class="w-full border border-gray-200 rounded-lg p-2 text-xs focus:ring-2 focus:ring-blue-500 outline-none bg-white" placeholder="Misal: Kas & Bank">
                            </div>
                            <div>
                                <label class="block text-[10px] font-bold text-slate-500 mb-1">Kategori Dasar (Base Type)</label>
                                <select id="newTypeBase" class="w-full border border-gray-200 rounded-lg p-2 text-xs focus:ring-2 focus:ring-blue-500 outline-none bg-white">
                                    <option value="ASSET">Asset (Harta)</option>
                                    <option value="LIABILITY">Liabilitas (Hutang)</option>
                                    <option value="EQUITY">Ekuitas (Modal)</option>
                                    <option value="INCOME">Pendapatan</option>
                                    <option value="EXPENSE">Beban/Biaya</option>
                                </select>
                            </div>
                            <div class="flex justify-end gap-2 pt-1">
                                <button type="button" onclick="toggleNewAccountTypeForm()" class="px-3 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 text-[10px] font-bold rounded-md transition-colors">Batal</button>
                                <button type="button" onclick="saveNewAccountTypeInline()" class="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-[10px] font-bold rounded-md shadow-sm transition-colors">Simpan</button>
                            </div>
                        </div>
                    </div>
                </div>
                <div>
                    <label class="block text-xs font-bold text-gray-500 mb-1">Akun Induk (Parent)</label>
                    <select id="accParentId" class="w-full border border-gray-200 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none">
                        <option value="">-- Tanpa Induk --</option>
                        ${accounts.filter(a => a.isGroup).map(a => `<option value="${a.id}" ${(acc ? acc.parentId : cleanParentId) === a.id ? 'selected' : ''}>${a.code} - ${a.name}</option>`).join('')}
                    </select>
                </div>
            </div>
            <div class="flex items-center gap-2 py-2">
                <input type="checkbox" id="accIsGroup" ${acc && acc.isGroup ? 'checked' : ''} class="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500">
                <label for="accIsGroup" class="text-sm font-bold text-gray-700">Akun ini adalah Group (Bisa punya anak)</label>
            </div>
            <div>
                <label class="block text-xs font-bold text-gray-500 mb-1">Saldo Awal</label>
                <input type="text" id="accOpeningBalance" oninput="this.value = formatAmountInput(this.value)" value="${acc && acc.openingBalance !== undefined ? formatAmountInput(acc.openingBalance) : ''}" class="w-full border border-gray-200 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none" placeholder="0">
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
    const openingBalance = openingBalanceStr ? parseAmountInput(openingBalanceStr) : 0;

    if (!code || !name) return alert('Mohon isi kode dan nama akun.');

    try {
        await api.saveAccount({ id: editId, code, name, type, parentId, isGroup, description, openingBalance, status: 'ACTIVE' });
        showToast(editId ? 'Akun berhasil diupdate' : 'Akun berhasil ditambahkan');
        await db.sync('accounts');
        closeModal();
        renderFinanceAccounts();
    } catch (err) {
        showToast(err.message, 'error');
    }
};

window.toggleNewAccountTypeForm = function() {
    const card = document.getElementById('newAccountTypeCard');
    if (card) {
        card.classList.toggle('hidden');
        document.getElementById('newTypeName').value = '';
    }
};

window.saveNewAccountTypeInline = async function() {
    const name = document.getElementById('newTypeName')?.value?.trim();
    const baseType = document.getElementById('newTypeBase')?.value;

    if (!name) return alert('Mohon isi nama tipe akun.');

    try {
        const result = await db.insert('accountTypes', { name, baseType });
        if (result) {
            showToast('Tipe akun berhasil ditambahkan', 'success');
            // Re-populate select dropdown
            const select = document.getElementById('accType');
            if (select) {
                const types = db.read('accountTypes') || [];
                select.innerHTML = types.map(t => `<option value="${t.id}" ${t.id === result.id ? 'selected' : ''}>${t.name}</option>`).join('');
            }
            toggleNewAccountTypeForm();
        } else {
            showToast('Gagal menambahkan tipe akun', 'error');
        }
    } catch (e) {
        showToast(e.message, 'error');
    }
};

window.openManageAccountTypesModal = function() {
    const types = db.read('accountTypes') || [];
    const accounts = db.read('accounts') || [];

    const body = `
        <div class="space-y-6">
            <!-- Add Form -->
            <div class="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
                <p class="text-xs font-black text-slate-400 uppercase tracking-widest">Tambah Tipe Akun Baru</p>
                <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                        <label class="block text-[10px] font-bold text-gray-500 mb-1">Nama Tipe Akun</label>
                        <input type="text" id="manageTypeName" class="w-full border border-gray-200 rounded-lg p-2 text-xs focus:ring-2 focus:ring-blue-500 outline-none bg-white" placeholder="Misal: Kas & Bank">
                    </div>
                    <div>
                        <label class="block text-[10px] font-bold text-gray-500 mb-1">Kategori Dasar (Base Type)</label>
                        <select id="manageTypeBase" class="w-full border border-gray-200 rounded-lg p-2 text-xs focus:ring-2 focus:ring-blue-500 outline-none bg-white">
                            <option value="ASSET">Asset (Harta)</option>
                            <option value="LIABILITY">Liabilitas (Hutang)</option>
                            <option value="EQUITY">Ekuitas (Modal)</option>
                            <option value="INCOME">Pendapatan</option>
                            <option value="EXPENSE">Beban/Biaya</option>
                        </select>
                    </div>
                </div>
                <div class="flex justify-end pt-1">
                    <button onclick="saveManageAccountType()" class="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold shadow-sm transition-colors">
                        Tambah Tipe
                    </button>
                </div>
            </div>

            <!-- List Table -->
            <div class="space-y-2">
                <p class="text-xs font-black text-slate-400 uppercase tracking-widest">Daftar Tipe Akun</p>
                <div class="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
                    <table class="w-full text-left border-collapse">
                        <thead>
                            <tr class="bg-slate-50 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-200">
                                <th class="px-4 py-3">Nama Tipe Akun</th>
                                <th class="px-4 py-3">Kategori Dasar</th>
                                <th class="px-4 py-3 text-right">Aksi</th>
                            </tr>
                        </thead>
                        <tbody class="divide-y divide-slate-100 text-xs font-medium text-slate-700" id="manageTypesTableBody">
                            ${types.map(t => {
                                const inUse = accounts.some(a => a.type === t.id || a.type === t.name);
                                return `
                                <tr>
                                    <td class="px-4 py-3.5 font-bold">${t.name}</td>
                                    <td class="px-4 py-3.5">
                                        <span class="px-2 py-1 rounded-md text-[10px] font-bold 
                                            ${t.baseType === 'ASSET' ? 'bg-blue-50 text-blue-600' :
                                              t.baseType === 'LIABILITY' ? 'bg-red-50 text-red-600' :
                                              t.baseType === 'EQUITY' ? 'bg-purple-50 text-purple-600' :
                                              t.baseType === 'INCOME' ? 'bg-green-50 text-green-600' :
                                              'bg-orange-50 text-orange-600'}">
                                            ${t.baseType}
                                        </span>
                                    </td>
                                    <td class="px-4 py-3.5 text-right">
                                        ${inUse ? `
                                            <span class="text-[10px] text-slate-400 italic">Sedang Digunakan</span>
                                        ` : `
                                            <button onclick="deleteManageAccountType('${t.id}')" class="text-red-500 hover:text-red-700 font-bold hover:underline">Hapus</button>
                                        `}
                                    </td>
                                </tr>`;
                            }).join('')}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    `;

    const footer = `
        <button onclick="closeModal()" class="px-5 py-2 bg-gray-100 text-slate-600 rounded-lg text-xs font-bold transition-all hover:bg-gray-200">Tutup</button>
    `;

    showModal('Kelola Tipe Akun', body, footer);
};

window.saveManageAccountType = async function() {
    const name = document.getElementById('manageTypeName')?.value?.trim();
    const baseType = document.getElementById('manageTypeBase')?.value;

    if (!name) return alert('Mohon isi nama tipe akun.');

    try {
        const result = await db.insert('accountTypes', { name, baseType });
        if (result) {
            showToast('Tipe akun berhasil ditambahkan', 'success');
            // Refresh modal
            openManageAccountTypesModal();
        } else {
            showToast('Gagal menambahkan tipe akun', 'error');
        }
    } catch (e) {
        showToast(e.message, 'error');
    }
};

window.deleteManageAccountType = async function(id) {
    if (!confirm('Yakin ingin menghapus tipe akun ini?')) return;

    try {
        await db.delete('accountTypes', id);
        showToast('Tipe akun berhasil dihapus', 'info');
        openManageAccountTypesModal();
    } catch (e) {
        showToast(e.message, 'error');
    }
};

window.editAccountType = function(typeId) {
    const customTypes = db.read('accountTypes') || [];
    const t = customTypes.find(type => type.id === typeId);
    if (!t) return showToast('Tipe akun tidak ditemukan.', 'error');

    const body = `
        <div class="space-y-4">
            <div>
                <label class="block text-xs font-bold text-gray-500 mb-1">Nama Tipe Akun</label>
                <input type="text" id="editTypeName" value="${t.name}" class="w-full border border-gray-200 rounded-lg p-2.5 text-xs focus:ring-2 focus:ring-blue-500 outline-none bg-white font-semibold text-slate-750">
            </div>
            <div>
                <label class="block text-xs font-bold text-gray-500 mb-1">Kategori Dasar (Base Type)</label>
                <select id="editTypeBase" class="w-full border border-gray-200 rounded-lg p-2.5 text-xs focus:ring-2 focus:ring-blue-500 outline-none bg-white">
                    <option value="ASSET" ${t.base_type === 'ASSET' || t.baseType === 'ASSET' ? 'selected' : ''}>Asset (Harta)</option>
                    <option value="LIABILITY" ${t.base_type === 'LIABILITY' || t.baseType === 'LIABILITY' ? 'selected' : ''}>Liabilitas (Hutang)</option>
                    <option value="EQUITY" ${t.base_type === 'EQUITY' || t.baseType === 'EQUITY' ? 'selected' : ''}>Ekuitas (Modal)</option>
                    <option value="INCOME" ${t.base_type === 'INCOME' || t.baseType === 'INCOME' ? 'selected' : ''}>Pendapatan</option>
                    <option value="EXPENSE" ${t.base_type === 'EXPENSE' || t.baseType === 'EXPENSE' ? 'selected' : ''}>Beban/Biaya</option>
                </select>
            </div>
        </div>
    `;

    const footer = `
        <button onclick="closeModal()" class="px-4 py-2 bg-gray-100 text-slate-600 rounded-lg text-xs font-bold hover:bg-gray-200 mr-2 transition-all">Batal</button>
        <button onclick="saveEditAccountType('${typeId}')" class="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold transition-all shadow-sm">Simpan</button>
    `;

    showModal('Edit Tipe Akun', body, footer);
};

window.saveEditAccountType = async function(typeId) {
    const name = document.getElementById('editTypeName')?.value?.trim();
    const baseType = document.getElementById('editTypeBase')?.value;

    if (!name) return alert('Nama tipe akun tidak boleh kosong.');

    try {
        const customTypes = db.read('accountTypes') || [];
        const index = customTypes.findIndex(t => t.id === typeId);
        if (index !== -1) {
            customTypes[index].name = name;
            customTypes[index].base_type = baseType;
            customTypes[index].baseType = baseType;
            await db.update('accountTypes', typeId, customTypes[index]);
            showToast('Tipe akun berhasil diperbarui', 'success');
            closeModal();
            renderFinanceAccounts();
        }
    } catch (e) {
        showToast(e.message, 'error');
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
    let acc = null;
    const isVirtual = accountId.startsWith('type_');
    
    if (isVirtual) {
        const typeId = accountId.replace('type_', '');
        const customTypes = db.read('accountTypes') || [];
        const t = customTypes.find(type => type.id === typeId);
        if (t) {
            acc = {
                id: accountId,
                code: 'Kategori',
                name: t.name
            };
        }
    } else {
        acc = db.findById('accounts', accountId);
    }
    
    if (!acc) return;
    
    try {
        const { ledger } = await api.getLedger(accountId, { startDate, endDate });
        const filteredLedger = ledger;

        const body = `
            <div class="space-y-6">
                <!-- Filter & Action Header -->
                <div class="flex flex-col sm:flex-row justify-between items-start sm:items-end p-5 bg-slate-50/80 border border-slate-100 rounded-2xl gap-4 no-print">
                    <div class="flex flex-wrap items-end gap-3 w-full sm:w-auto">
                        <div class="flex flex-col">
                            <label class="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Dari Tanggal</label>
                            <input type="date" id="mutasi_start" value="${startDate}" class="border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-700 outline-none focus:border-slate-800 transition-all bg-white shadow-sm">
                        </div>
                        <div class="flex flex-col">
                            <label class="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Sampai Tanggal</label>
                            <input type="date" id="mutasi_end" value="${endDate}" class="border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-700 outline-none focus:border-slate-800 transition-all bg-white shadow-sm">
                        </div>
                        <button onclick="applyMutasiFilter('${accountId}')" class="bg-slate-800 hover:bg-slate-950 text-white px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 shadow-sm active:scale-95">
                            <i class="fas fa-filter"></i> FILTER
                        </button>
                    </div>
                    <div class="flex gap-2 w-full sm:w-auto">
                        <button onclick="exportMutasiToPDF('${accountId}', '${startDate}', '${endDate}')" class="flex-1 sm:flex-none border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all flex items-center justify-center gap-2 shadow-sm active:scale-95">
                            <i class="fas fa-file-pdf text-red-500"></i> CETAK PDF
                        </button>
                    </div>
                </div>

                <!-- Account Information Card -->
                <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center bg-gradient-to-r from-slate-50 to-white p-5 rounded-2xl border border-slate-100 shadow-sm gap-3">
                    <div>
                        <h4 class="text-base font-extrabold text-slate-850 tracking-wide">${acc.code} — ${acc.name}</h4>
                        <p class="text-[10px] text-slate-500 uppercase font-black tracking-widest mt-1">Periode: <span class="text-slate-800 font-bold">${startDate || 'Awal'} s/d ${endDate || 'Sekarang'}</span></p>
                    </div>
                    <div class="text-left sm:text-right bg-white px-4 py-2 border border-slate-100 rounded-xl shadow-inner">
                        <p class="text-[9px] text-slate-400 uppercase font-black tracking-widest">Saldo Akhir Periode</p>
                        <p class="text-xl font-black text-slate-800 mt-0.5">${formatCurrency(Math.abs(filteredLedger[0]?.balance || 0))}</p>
                    </div>
                </div>

                <!-- Ledger Table -->
                <div class="overflow-hidden border border-slate-100 rounded-2xl shadow-sm bg-white">
                    <div class="overflow-x-auto">
                        <table id="mutasiTable" class="w-full text-left text-xs border-collapse">
                            <thead class="bg-slate-50/80 text-slate-500 uppercase tracking-wider text-[9px] font-black border-b border-slate-100">
                                <tr>
                                    <th class="px-5 py-3.5">Tanggal</th>
                                    <th class="px-5 py-3.5">Ref / Jurnal</th>
                                    <th class="px-5 py-3.5">Keterangan</th>
                                    <th class="px-5 py-3.5 text-right uppercase">Debit</th>
                                    <th class="px-5 py-3.5 text-right uppercase">Kredit</th>
                                    <th class="px-5 py-3.5 text-right uppercase">Saldo</th>
                                </tr>
                            </thead>
                            <tbody class="divide-y divide-slate-50 text-slate-700">
                                ${filteredLedger.map(l => `
                                    <tr class="hover:bg-slate-50/40 transition-colors">
                                        <td class="px-5 py-3.5 text-slate-450 whitespace-nowrap font-semibold">${l.date ? l.date.slice(0, 10).split('-').reverse().join('/') : '-'}</td>
                                        <td class="px-5 py-3.5 font-bold text-slate-800 whitespace-nowrap">${l.journalNo || '-'}</td>
                                        <td class="px-5 py-3.5 text-slate-600 min-w-[200px] font-medium">${l.description}</td>
                                        <td class="px-5 py-3.5 text-right font-bold ${l.debit > 0 ? 'text-slate-850' : 'text-slate-300'}">${l.debit > 0 ? formatCurrency(l.debit).replace('Rp ', '') : '-'}</td>
                                        <td class="px-5 py-3.5 text-right font-bold ${l.credit > 0 ? 'text-slate-850' : 'text-slate-300'}">${l.credit > 0 ? formatCurrency(l.credit).replace('Rp ', '') : '-'}</td>
                                        <td class="px-5 py-3.5 text-right font-black text-slate-800 bg-slate-50/30">${formatCurrency(Math.abs(l.balance)).replace('Rp ', '')}</td>
                                    </tr>
                                `).join('') || '<tr><td colspan="6" class="px-5 py-12 text-center text-slate-400 font-medium">Belum ada riwayat mutasi pada periode ini.</td></tr>'}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        `;
        
        const footer = `
            <button onclick="closeModal()" class="px-6 py-2.5 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-bold transition-all shadow-md active:scale-95">Tutup</button>
        `;
        
        showModal(`Mutasi Buku Besar`, body, footer, 'full');
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
    window._expenseFilters = window._expenseFilters || { q: '', dateFrom: '', dateTo: '', sortOrder: 'desc' };

    const activeTab = window._uiState.expenseActiveTab;
    const f = window._expenseFilters;

    let expenses = db.read('expenses') || [];

    if (f.q) {
        const q = f.q.toLowerCase();
        expenses = expenses.filter(e =>
            (e.expenseNo || '').toLowerCase().includes(q) ||
            (e.description || '').toLowerCase().includes(q) ||
            (e.method || '').toLowerCase().includes(q) ||
            (db.findById('accounts', e.toAccountId)?.name || '').toLowerCase().includes(q) ||
            (db.findById('accounts', e.fromAccountId)?.name || '').toLowerCase().includes(q)
        );
    }

    if (f.dateFrom || f.dateTo) {
        expenses = expenses.filter(e => {
            let ok = true;
            const eDate = (e.date || '').split('T')[0];
            if (f.dateFrom && eDate < f.dateFrom) ok = false;
            if (f.dateTo && eDate > f.dateTo) ok = false;
            return ok;
        });
    }

    const defaultExpSort = (arr) => [...arr].sort((a, b) => ((b.date || '') > (a.date || '') ? 1 : -1));
    expenses = window.applyTableSort(expenses, 'fin_exp', defaultExpSort);

    const totalAmount = expenses.reduce((sum, e) => sum + (parseFloat(e.amount) || 0), 0);

    // Filter bar - same pattern as AR/AP
    const filterBarHtml = `
        <div class="bg-white rounded-2xl shadow-sm border border-slate-100 p-3 flex flex-col md:flex-row items-center gap-3">
            <div class="relative flex-1 group w-full">
                <i class="fas fa-search absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-blue-500 transition-colors"></i>
                <input type="text" id="expenseSearchInput"
                    onkeyup="if(event.key==='Enter') applyExpenseSearch()"
                    value="${f.q || ''}"
                    placeholder="Cari No. Pengeluaran, Kebutuhan, Kategori, atau Kas/Bank..."
                    class="w-full pl-11 pr-4 py-2.5 bg-slate-50/50 rounded-xl border border-slate-100 focus:border-blue-500 focus:bg-white text-sm font-semibold text-slate-700 outline-none transition-all"
                >
            </div>
            <div class="flex items-center gap-3 w-full md:w-auto px-1">
                <div class="relative flex items-center h-10 bg-white border border-slate-200 rounded-xl shadow-sm overflow-visible">
                    <button onclick="window._expenseFilters.sortOrder = window._expenseFilters.sortOrder === 'asc' ? 'desc' : 'asc'; renderFinanceExpenses()"
                        class="w-10 h-full flex items-center justify-center bg-slate-50 border-r border-slate-200 text-slate-400 hover:text-blue-600 transition-all">
                        <i class="fas fa-sort-amount-${f.sortOrder === 'asc' ? 'up' : 'down'}-alt text-xs"></i>
                    </button>
                    <div onclick="window._uiState.expenseDatePopoverOpen = !window._uiState.expenseDatePopoverOpen; renderFinanceExpenses()"
                        class="relative flex items-center h-full px-4 cursor-pointer hover:bg-slate-50 transition-all group min-w-[100px]">
                        <span class="text-sm font-bold text-blue-600 mr-3">Date</span>
                        <i class="fas fa-chevron-down text-blue-300 text-[10px] transition-transform ${window._uiState.expenseDatePopoverOpen ? 'rotate-180' : ''}"></i>
                    </div>
                    <div class="${window._uiState.expenseDatePopoverOpen ? 'block' : 'hidden'} absolute top-full left-0 mt-3 w-80 bg-white rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.15)] border border-slate-100 p-6 z-[100] animate-in fade-in zoom-in-95 duration-200">
                        <div class="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-5">FILTER RANGE</div>
                        <div class="grid grid-cols-2 gap-4 mb-6">
                            <div class="space-y-1.5">
                                <label class="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">DARI</label>
                                <input type="date" id="expenseDateFrom" value="${f.dateFrom || ''}" class="w-full bg-slate-50 border-none rounded-xl px-4 py-3 text-sm font-bold text-slate-700 outline-none">
                            </div>
                            <div class="space-y-1.5">
                                <label class="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">KE</label>
                                <input type="date" id="expenseDateTo" value="${f.dateTo || ''}" class="w-full bg-slate-50 border-none rounded-xl px-4 py-3 text-sm font-bold text-slate-700 outline-none">
                            </div>
                        </div>
                        <div class="flex gap-3">
                            <button onclick="applyExpenseDateRange()" class="flex-1 bg-blue-600 text-white py-3.5 rounded-2xl text-xs font-black uppercase tracking-widest shadow-lg shadow-blue-200">APPLY</button>
                            <button onclick="resetExpenseDateRange()" class="flex-1 bg-slate-50 text-slate-400 py-3.5 rounded-2xl text-xs font-black uppercase tracking-widest">RESET</button>
                        </div>
                    </div>
                </div>
                <button onclick="openExpenseModal()" class="flex items-center justify-center gap-2 px-6 h-10 bg-blue-600 hover:bg-slate-900 text-white rounded-xl text-sm font-bold shadow-lg shadow-blue-200 transition-all active:scale-95 whitespace-nowrap">
                    <i class="fas fa-plus"></i> INPUT PENGELUARAN
                </button>
            </div>
        </div>
    `;

    // Pill tabs - same pattern as AR/AP
    const tabsHtml = `
        <div class="flex items-center gap-1 bg-slate-100 p-1.5 rounded-2xl w-fit border border-slate-200/60 shadow-inner overflow-hidden">
            <button onclick="window._uiState.expenseActiveTab='list'; renderFinanceExpenses();"
                class="px-8 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all duration-300 flex items-center gap-2 ${activeTab === 'list' ? 'bg-white text-blue-600 shadow-md scale-100 border border-slate-100' : 'text-slate-400 hover:text-slate-600 hover:bg-white/40 opacity-70'}">
                <i class="fas fa-list-ul"></i> Daftar Pengeluaran
            </button>
            <button onclick="window._uiState.expenseActiveTab='history'; renderFinanceExpenses();"
                class="px-8 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all duration-300 flex items-center gap-2 ${activeTab === 'history' ? 'bg-white text-red-600 shadow-md scale-100 border border-slate-100' : 'text-slate-400 hover:text-slate-600 hover:bg-white/40 opacity-70'}">
                <i class="fas fa-history"></i> Riwayat Pengeluaran
            </button>
        </div>
    `;

    let tableHtml = '';
    if (activeTab === 'list') {
        tableHtml = `
            <div class="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                <div class="overflow-x-auto">
                    <table class="w-full text-left border-collapse">
                        <thead class="bg-slate-50/50 sticky top-0">
                            <tr>
                                ${window.sortTh('fin_exp','paidTo','string','Pengeluaran Kepada','renderFinanceExpenses')}
                                ${window.sortTh('fin_exp','description','string','Kebutuhan / Deskripsi','renderFinanceExpenses')}
                                <th class="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">Kategori (COA)</th>
                                <th class="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">Kas / Bank</th>
                                ${window.sortTh('fin_exp','amount','number','Jumlah','renderFinanceExpenses','text-right')}
                                <th class="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 text-right">Aksi</th>
                            </tr>
                        </thead>
                        <tbody class="divide-y divide-slate-50">
                            ${expenses.map(e => `
                                <tr class="hover:bg-slate-50/50 transition-colors group">
                                    <td class="px-6 py-4 text-sm font-bold text-slate-800">
                                        ${e.paid_to || e.paidTo || '-'}
                                    </td>
                                    <td class="px-6 py-4">
                                        <div class="text-[10px] text-slate-400 font-bold mb-1">${formatDateOnly(e.date)}</div>
                                        <div class="text-sm font-bold text-slate-700">${e.description}</div>
                                        <div class="text-[10px] text-slate-400 mt-1 font-medium italic opacity-70">${e.method || 'Tunai'}</div>
                                    </td>
                                    <td class="px-6 py-4">
                                        <span class="px-3 py-1 bg-slate-100 text-slate-600 rounded-full text-[9px] font-black uppercase tracking-widest">${db.findById('accounts', e.toAccountId)?.name || '-'}</span>
                                    </td>
                                    <td class="px-6 py-4">
                                        <span class="text-xs font-bold text-slate-600 flex items-center gap-2">
                                            <i class="fas fa-university text-slate-400 text-[10px]"></i>
                                            ${db.findById('accounts', e.fromAccountId)?.name || '-'}
                                        </span>
                                    </td>
                                    <td class="px-6 py-4 text-right font-black text-red-600">${formatCurrency(e.amount)}</td>
                                    <td class="px-6 py-4 text-right overflow-visible">
                                        <div class="flex justify-end overflow-visible">
                                            <button onclick="handleExpenseAction('view', '${e.id}')" class="w-8 h-8 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-blue-600 transition-all flex items-center justify-center">
                                                <i class="fas fa-eye text-sm"></i>
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            `).join('') || `
                                <tr>
                                    <td colspan="8" class="px-6 py-20 text-center text-slate-400 italic">
                                        <div class="flex flex-col items-center justify-center space-y-3 py-6">
                                            <i class="fas fa-file-invoice text-slate-200 text-5xl"></i>
                                            <span class="text-sm font-bold text-slate-400 uppercase tracking-widest">TIDAK ADA DATA PENGELUARAN</span>
                                        </div>
                                    </td>
                                </tr>
                            `}
                        </tbody>
                    </table>
                </div>
                <div class="px-10 py-6 flex items-center justify-between border-t border-slate-100 bg-slate-50/50">
                    <div>
                        <p class="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1 opacity-70">Total Pengeluaran</p>
                        <p class="text-2xl font-black font-mono tracking-tighter text-red-600">${formatCurrency(totalAmount)}</p>
                    </div>
                </div>
            </div>
        `;
    } else {
        tableHtml = `
            <div class="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden animate-in slide-in-from-bottom-4 duration-500">
                <table class="w-full text-left border-collapse">
                    <thead>
                        <tr class="bg-slate-50/50">
                            <th class="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">Tanggal</th>
                            <th class="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">Nomor</th>
                            <th class="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">Keterangan</th>
                            <th class="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 text-right">Jumlah</th>
                        </tr>
                    </thead>
                    <tbody class="divide-y divide-slate-50">
                        ${expenses.map(e => `
                            <tr class="hover:bg-slate-50/50 transition-colors">
                                <td class="px-6 py-4 text-xs font-bold text-slate-500">${formatDateOnly(e.date)}</td>
                                <td class="px-6 py-4 font-bold text-slate-700">${e.expenseNo}</td>
                                <td class="px-6 py-4 text-sm text-slate-600">${e.description}</td>
                                <td class="px-6 py-4 text-right font-black text-red-600">${formatCurrency(e.amount)}</td>
                            </tr>
                        `).join('') || `
                            <tr>
                                <td colspan="4" class="px-6 py-20 text-center text-slate-400 italic">
                                    <div class="flex flex-col items-center justify-center space-y-3 py-6">
                                        <i class="fas fa-history text-slate-200 text-5xl"></i>
                                        <span class="text-sm font-bold text-slate-400 uppercase tracking-widest">BELUM ADA RIWAYAT PENGELUARAN</span>
                                    </div>
                                </td>
                            </tr>
                        `}
                    </tbody>
                </table>
                <div class="px-10 py-6 flex items-center justify-between border-t border-slate-100 bg-slate-50/50">
                    <div>
                        <p class="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1 opacity-70">Total Dikeluarkan</p>
                        <p class="text-2xl font-black font-mono tracking-tighter text-red-600">${formatCurrency(totalAmount)}</p>
                    </div>
                </div>
            </div>
        `;
    }

    mc.innerHTML = `
        <div class="space-y-6">
            ${filterBarHtml}
            ${tabsHtml}
            <div class="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
                TOTAL: ${expenses.length} TRANSAKSI
            </div>
            ${tableHtml}
        </div>
    `;

    const input = document.getElementById('expenseSearchInput');
    if (input) { input.focus(); const val = input.value; input.value = ''; input.value = val; }
};

window.renderFinanceReceipts = function () {
    document.getElementById('pageTitle').innerText = 'Penerimaan Kas & Bank';
    const mc = document.getElementById('main-content');

    window._uiState.receiptActiveTab = window._uiState.receiptActiveTab || 'list';
    window._receiptFilters = window._receiptFilters || { q: '', dateFrom: '', dateTo: '', sortOrder: 'desc' };

    const activeTab = window._uiState.receiptActiveTab;
    const f = window._receiptFilters;

    let receipts = db.read('receipts') || [];

    if (f.q) {
        const q = f.q.toLowerCase();
        receipts = receipts.filter(r =>
            (r.receiptNo || r.no || '').toLowerCase().includes(q) ||
            (r.description || '').toLowerCase().includes(q) ||
            (r.method || '').toLowerCase().includes(q) ||
            (db.findById('accounts', r.sourceAccountId)?.name || '').toLowerCase().includes(q) ||
            (db.findById('accounts', r.targetAccountId)?.name || '').toLowerCase().includes(q)
        );
    }

    if (f.dateFrom || f.dateTo) {
        receipts = receipts.filter(r => {
            let ok = true;
            const rDate = (r.date || '').split('T')[0];
            if (f.dateFrom && rDate < f.dateFrom) ok = false;
            if (f.dateTo && rDate > f.dateTo) ok = false;
            return ok;
        });
    }
    const defaultRecSort = (arr) => [...arr].sort((a, b) => ((b.date || '') > (a.date || '') ? 1 : -1));
    receipts = receipts.map(r => ({ ...r, receiptNum: r.receiptNo || r.no || '' }));
    receipts = window.applyTableSort(receipts, 'fin_rec', defaultRecSort);

    const totalAmount = receipts.reduce((sum, r) => sum + (parseFloat(r.amount) || 0), 0);

    // Filter bar - same pattern as AR/AP
    const filterBarHtml = `
        <div class="bg-white rounded-2xl shadow-sm border border-slate-100 p-3 flex flex-col md:flex-row items-center gap-3">
            <div class="relative flex-1 group w-full">
                <i class="fas fa-search absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-blue-500 transition-colors"></i>
                <input type="text" id="recSearchInput"
                    onkeyup="if(event.key==='Enter') applyRecSearch()"
                    value="${f.q || ''}"
                    placeholder="Cari No. Penerimaan, Keterangan, COA, atau Kas/Bank..."
                    class="w-full pl-11 pr-4 py-2.5 bg-slate-50/50 rounded-xl border border-slate-100 focus:border-blue-500 focus:bg-white text-sm font-semibold text-slate-700 outline-none transition-all"
                >
            </div>
            <div class="flex items-center gap-3 w-full md:w-auto px-1">
                <div class="relative flex items-center h-10 bg-white border border-slate-200 rounded-xl shadow-sm overflow-visible">
                    <button onclick="window._receiptFilters.sortOrder = window._receiptFilters.sortOrder === 'asc' ? 'desc' : 'asc'; renderFinanceReceipts()"
                        class="w-10 h-full flex items-center justify-center bg-slate-50 border-r border-slate-200 text-slate-400 hover:text-blue-600 transition-all">
                        <i class="fas fa-sort-amount-${f.sortOrder === 'asc' ? 'up' : 'down'}-alt text-xs"></i>
                    </button>
                    <div onclick="window._uiState.recDatePopoverOpen = !window._uiState.recDatePopoverOpen; renderFinanceReceipts()"
                        class="relative flex items-center h-full px-4 cursor-pointer hover:bg-slate-50 transition-all group min-w-[100px]">
                        <span class="text-sm font-bold text-blue-600 mr-3">Date</span>
                        <i class="fas fa-chevron-down text-blue-300 text-[10px] transition-transform ${window._uiState.recDatePopoverOpen ? 'rotate-180' : ''}"></i>
                    </div>
                    <div class="${window._uiState.recDatePopoverOpen ? 'block' : 'hidden'} absolute top-full left-0 mt-3 w-80 bg-white rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.15)] border border-slate-100 p-6 z-[100] animate-in fade-in zoom-in-95 duration-200">
                        <div class="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-5">FILTER RANGE</div>
                        <div class="grid grid-cols-2 gap-4 mb-6">
                            <div class="space-y-1.5">
                                <label class="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">DARI</label>
                                <input type="date" id="recDateFrom" value="${f.dateFrom || ''}" class="w-full bg-slate-50 border-none rounded-xl px-4 py-3 text-sm font-bold text-slate-700 outline-none">
                            </div>
                            <div class="space-y-1.5">
                                <label class="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">KE</label>
                                <input type="date" id="recDateTo" value="${f.dateTo || ''}" class="w-full bg-slate-50 border-none rounded-xl px-4 py-3 text-sm font-bold text-slate-700 outline-none">
                            </div>
                        </div>
                        <div class="flex gap-3">
                            <button onclick="applyRecDateRange()" class="flex-1 bg-blue-600 text-white py-3.5 rounded-2xl text-xs font-black uppercase tracking-widest shadow-lg shadow-blue-200">APPLY</button>
                            <button onclick="resetRecDateRange()" class="flex-1 bg-slate-50 text-slate-400 py-3.5 rounded-2xl text-xs font-black uppercase tracking-widest">RESET</button>
                        </div>
                    </div>
                </div>
                <button onclick="openReceiptModal()" class="flex items-center justify-center gap-2 px-6 h-10 bg-blue-600 hover:bg-slate-900 text-white rounded-xl text-sm font-bold shadow-lg shadow-blue-200 transition-all active:scale-95 whitespace-nowrap">
                    <i class="fas fa-plus"></i> INPUT PENERIMAAN
                </button>
            </div>
        </div>
    `;

    // Pill tabs - same pattern as AR/AP
    const tabsHtml = `
        <div class="flex items-center gap-1 bg-slate-100 p-1.5 rounded-2xl w-fit border border-slate-200/60 shadow-inner overflow-hidden">
            <button onclick="window._uiState.receiptActiveTab='list'; renderFinanceReceipts();"
                class="px-8 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all duration-300 flex items-center gap-2 ${activeTab === 'list' ? 'bg-white text-blue-600 shadow-md scale-100 border border-slate-100' : 'text-slate-400 hover:text-slate-600 hover:bg-white/40 opacity-70'}">
                <i class="fas fa-file-invoice-dollar"></i> Daftar Penerimaan
            </button>
            <button onclick="window._uiState.receiptActiveTab='history'; renderFinanceReceipts();"
                class="px-8 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all duration-300 flex items-center gap-2 ${activeTab === 'history' ? 'bg-white text-green-600 shadow-md scale-100 border border-slate-100' : 'text-slate-400 hover:text-slate-600 hover:bg-white/40 opacity-70'}">
                <i class="fas fa-history"></i> Riwayat Penerimaan
            </button>
        </div>
    `;

    let tableHtml = '';
    if (activeTab === 'list') {
        tableHtml = `
            <div class="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                <div class="overflow-x-auto">
                    <table class="w-full text-left border-collapse">
                        <thead class="bg-slate-50/50 sticky top-0">
                            <tr>
                                ${window.sortTh('fin_rec','receivedFrom','string','Penerimaan Dari','renderFinanceReceipts')}
                                ${window.sortTh('fin_rec','description','string','Keterangan','renderFinanceReceipts')}
                                <th class="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">Sumber (COA)</th>
                                <th class="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">Kas / Bank Penerima</th>
                                ${window.sortTh('fin_rec','amount','number','Jumlah','renderFinanceReceipts','text-right')}
                                <th class="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 text-right">Aksi</th>
                            </tr>
                        </thead>
                        <tbody class="divide-y divide-slate-50">
                            ${receipts.map(r => `
                                <tr class="hover:bg-slate-50/50 transition-colors group">
                                    <td class="px-6 py-4 text-sm font-bold text-slate-800">
                                        ${r.received_from || r.receivedFrom || '-'}
                                    </td>
                                    <td class="px-6 py-4">
                                        <div class="text-[10px] text-slate-400 font-bold mb-1">${formatDateOnly(r.date)}</div>
                                        <div class="text-sm font-bold text-slate-700">${r.description}</div>
                                        <div class="text-[10px] text-slate-400 mt-1 font-medium italic opacity-70">${r.method || 'Transfer'}</div>
                                    </td>
                                    <td class="px-6 py-4">
                                        <span class="px-3 py-1 bg-slate-100 text-slate-600 rounded-full text-[9px] font-black uppercase tracking-widest">${db.findById('accounts', r.sourceAccountId)?.name || '-'}</span>
                                    </td>
                                    <td class="px-6 py-4">
                                        <span class="text-xs font-bold text-slate-600 flex items-center gap-2">
                                            <i class="fas fa-university text-slate-400 text-[10px]"></i>
                                            ${db.findById('accounts', r.targetAccountId)?.name || '-'}
                                        </span>
                                    </td>
                                    <td class="px-6 py-4 text-right font-black text-blue-600">${formatCurrency(r.amount)}</td>
                                    <td class="px-6 py-4 text-right overflow-visible">
                                        <div class="flex justify-end overflow-visible">
                                            <button onclick="handleReceiptAction('view', '${r.id}')" class="w-8 h-8 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-blue-600 transition-all flex items-center justify-center">
                                                <i class="fas fa-eye"></i>
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            `).join('') || `
                                <tr>
                                    <td colspan="7" class="px-6 py-20 text-center text-slate-400 italic">
                                        <div class="flex flex-col items-center justify-center space-y-3 py-6">
                                            <i class="fas fa-file-invoice-dollar text-slate-200 text-5xl"></i>
                                            <span class="text-sm font-bold text-slate-400 uppercase tracking-widest">TIDAK ADA DATA PENERIMAAN</span>
                                        </div>
                                    </td>
                                </tr>
                            `}
                        </tbody>
                    </table>
                </div>
                <div class="px-10 py-6 flex items-center justify-between border-t border-slate-100 bg-slate-50/50">
                    <div>
                        <p class="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1 opacity-70">Total Penerimaan</p>
                        <p class="text-2xl font-black font-mono tracking-tighter text-blue-600">${formatCurrency(totalAmount)}</p>
                    </div>
                </div>
            </div>
        `;
    } else {
        tableHtml = `
            <div class="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden animate-in slide-in-from-bottom-4 duration-500">
                <table class="w-full text-left border-collapse">
                    <thead>
                        <tr class="bg-slate-50/50">
                            <th class="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">Tanggal</th>
                            <th class="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">Nomor</th>
                            <th class="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">Keterangan</th>
                            <th class="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 text-right">Jumlah</th>
                        </tr>
                    </thead>
                    <tbody class="divide-y divide-slate-50">
                        ${receipts.map(r => `
                            <tr class="hover:bg-slate-50/50 transition-colors">
                                <td class="px-6 py-4 text-xs font-bold text-slate-500">${formatDateOnly(r.date)}</td>
                                <td class="px-6 py-4 font-bold text-slate-700">${r.receiptNo || r.no || '-'}</td>
                                <td class="px-6 py-4 text-sm text-slate-600">${r.description}</td>
                                <td class="px-6 py-4 text-right font-black text-blue-600">${formatCurrency(r.amount)}</td>
                            </tr>
                        `).join('') || `
                            <tr>
                                <td colspan="4" class="px-6 py-20 text-center text-slate-400 italic">
                                    <div class="flex flex-col items-center justify-center space-y-3 py-6">
                                        <i class="fas fa-history text-slate-200 text-5xl"></i>
                                        <span class="text-sm font-bold text-slate-400 uppercase tracking-widest">BELUM ADA RIWAYAT PENERIMAAN</span>
                                    </div>
                                </td>
                            </tr>
                        `}
                    </tbody>
                </table>
                <div class="px-10 py-6 flex items-center justify-between border-t border-slate-100 bg-slate-50/50">
                    <div>
                        <p class="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1 opacity-70">Total Diterima</p>
                        <p class="text-2xl font-black font-mono tracking-tighter text-blue-600">${formatCurrency(totalAmount)}</p>
                    </div>
                </div>
            </div>
        `;
    }

    mc.innerHTML = `
        <div class="space-y-6">
            ${filterBarHtml}
            ${tabsHtml}
            <div class="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
                TOTAL: ${receipts.length} TRANSAKSI
            </div>
            ${tableHtml}
        </div>
    `;

    const input = document.getElementById('recSearchInput');
    if (input) { input.focus(); const val = input.value; input.value = ''; input.value = val; }
};

window.applyExpenseSearch = function() { window._expenseFilters.q = document.getElementById('expenseSearchInput')?.value || ''; renderFinanceExpenses(); };
window.applyExpenseDateRange = function() { window._expenseFilters.dateFrom = document.getElementById('expenseDateFrom')?.value || ''; window._expenseFilters.dateTo = document.getElementById('expenseDateTo')?.value || ''; window._uiState.expenseDatePopoverOpen = false; renderFinanceExpenses(); };
window.resetExpenseDateRange = function() { window._expenseFilters.dateFrom = ''; window._expenseFilters.dateTo = ''; window._uiState.expenseDatePopoverOpen = false; renderFinanceExpenses(); };
window.applyRecSearch = function() { window._receiptFilters.q = document.getElementById('recSearchInput')?.value || ''; renderFinanceReceipts(); };
window.applyRecDateRange = function() { window._receiptFilters.dateFrom = document.getElementById('recDateFrom')?.value || ''; window._receiptFilters.dateTo = document.getElementById('recDateTo')?.value || ''; window._uiState.recDatePopoverOpen = false; renderFinanceReceipts(); };
window.resetRecDateRange = function() { window._receiptFilters.dateFrom = ''; window._receiptFilters.dateTo = ''; window._uiState.recDatePopoverOpen = false; renderFinanceReceipts(); };

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
    
    const bankAccounts = db.read('bankAccounts') || [];
    let assetAccounts = [];
    if (bankAccounts.length > 0) {
        assetAccounts = bankAccounts.map(ba => {
            const coaAcc = db.findById('accounts', ba.accountId || ba.account_id);
            return {
                id: coaAcc ? coaAcc.id : (ba.accountId || ba.account_id),
                name: ba.name,
                code: ba.accountNumber || ba.account_number || (coaAcc ? coaAcc.code : '')
            };
        });
    } else {
        assetAccounts = db.read('accounts').filter(a => getBaseType(a.type) === 'ASSET' && a.code.startsWith('11'));
    }
    const allAccounts = db.read('accounts');

    mc.innerHTML = `
        <div class="-mx-4 -mt-4 sm:-mx-6 sm:-mt-6 mb-6 bg-white border-b border-slate-200 px-6 py-3 flex items-center justify-end gap-3 sticky top-0 z-10">
            <button onclick="renderFinanceReceipts()" class="px-5 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100 rounded-lg transition-all">BATAL</button>
            <button onclick="saveReceipt()" class="flex items-center gap-2 px-6 py-2 text-sm font-bold bg-blue-600 text-white rounded-xl hover:bg-blue-700 shadow-lg shadow-blue-200 transition-all active:scale-95">
                <span class="w-2 h-2 rounded-full bg-white inline-block"></span> SIMPAN PENERIMAAN
            </button>
        </div>
        <div class="space-y-6">
            <div class="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-visible">
                <div class="px-8 py-4 border-b border-slate-100">
                    <span class="text-[10px] font-black text-blue-600 uppercase tracking-widest">
                        <i class="fas fa-circle text-[6px] mr-1"></i> INFORMASI PENERIMAAN
                    </span>
                </div>
                <div class="px-8 py-6">
                    <div class="grid grid-cols-1 gap-5">
                        <div>
                            <label class="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Penerimaan Dari <span class="text-red-400">*</span></label>
                            <input type="text" id="recReceivedFrom" placeholder="Nama pengirim / Asal dana..." class="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-semibold text-slate-700 outline-none focus:border-blue-500 focus:bg-white transition-all">
                        </div>
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
                                <div class="relative" id="rec_target_account_dropdown_wrapper">
                                    <!-- Trigger -->
                                    <button type="button" id="rec_target_account_trigger"
                                        onclick="toggleFinanceDropdown('rec_target_account_dropdown')"
                                        class="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-semibold text-slate-700 outline-none focus:border-blue-500 focus:bg-white transition-all flex items-center justify-between hover:border-blue-400">
                                        <span id="rec_target_account_label" class="text-slate-700">${assetAccounts[0] ? `${assetAccounts[0].name} (${assetAccounts[0].code})` : '-- Pilih Kas/Bank --'}</span>
                                        <i class="fas fa-chevron-down text-slate-300 text-xs transition-transform" id="rec_target_account_chevron"></i>
                                    </button>
                                    <input type="hidden" id="recTargetAccount" value="${assetAccounts[0] ? assetAccounts[0].id : ''}">
                                    <!-- Dropdown Panel -->
                                    <div id="rec_target_account_dropdown" class="hidden absolute top-full left-0 right-0 mt-2 bg-white rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.15)] border border-slate-100 z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                                        <!-- Search -->
                                        <div class="p-3 border-b border-slate-100">
                                            <div class="relative">
                                                <i class="fas fa-search absolute left-3 top-1/2 -translate-y-1/2 text-slate-300 text-xs"></i>
                                                <input type="text" id="rec_target_account_search_input" placeholder="Cari Kas/Bank..." oninput="filterFinanceDropdown('rec_target_account', this.value)"
                                                    class="w-full pl-9 pr-4 py-2 bg-slate-50 rounded-xl border border-slate-100 text-sm font-semibold text-slate-700 outline-none focus:border-blue-400">
                                            </div>
                                        </div>
                                        <!-- Options List -->
                                        <div id="rec_target_account_options" class="max-h-56 overflow-y-auto py-1">
                                            ${assetAccounts.map(a => `<div class="px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-blue-50 hover:text-blue-700 cursor-pointer transition-colors" onclick="selectFinanceDropdown('rec_target_account', '${a.id}', '${a.name} (${a.code})')">${a.name} (${a.code})</div>`).join('')}
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <div>
                                <label class="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Sumber COA (Asal Dana) <span class="text-red-400">*</span></label>
                                <div class="relative" id="rec_source_account_dropdown_wrapper">
                                    <!-- Trigger -->
                                    <button type="button" id="rec_source_account_trigger"
                                        onclick="toggleFinanceDropdown('rec_source_account_dropdown')"
                                        class="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-semibold text-slate-700 outline-none focus:border-blue-500 focus:bg-white transition-all flex items-center justify-between hover:border-blue-400">
                                        <span id="rec_source_account_label" class="text-slate-400">- Pilih Akun Sumber -</span>
                                        <i class="fas fa-chevron-down text-slate-300 text-xs transition-transform" id="rec_source_account_chevron"></i>
                                    </button>
                                    <input type="hidden" id="recSourceAccount" value="">
                                    <!-- Dropdown Panel -->
                                    <div id="rec_source_account_dropdown" class="hidden absolute top-full left-0 right-0 mt-2 bg-white rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.15)] border border-slate-100 z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                                        <!-- Search -->
                                        <div class="p-3 border-b border-slate-100">
                                            <div class="relative">
                                                <i class="fas fa-search absolute left-3 top-1/2 -translate-y-1/2 text-slate-300 text-xs"></i>
                                                <input type="text" id="rec_source_account_search_input" placeholder="Cari Akun..." oninput="filterFinanceDropdown('rec_source_account', this.value)"
                                                    class="w-full pl-9 pr-4 py-2 bg-slate-50 rounded-xl border border-slate-100 text-sm font-semibold text-slate-700 outline-none focus:border-blue-400">
                                            </div>
                                        </div>
                                        <!-- Options List -->
                                        <div id="rec_source_account_options" class="max-h-56 overflow-y-auto py-1">
                                            ${allAccounts.map(a => `<div class="px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-blue-50 hover:text-blue-700 cursor-pointer transition-colors" onclick="selectFinanceDropdown('rec_source_account', '${a.id}', '${a.code} - ${a.name}')">${a.code} - ${a.name}</div>`).join('')}
                                        </div>
                                    </div>
                                </div>
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
                                <textarea id="recDesc" rows="3" placeholder="Tuliskan alasan atau detail penerimaan dana..." class="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-700 outline-none focus:border-blue-500 focus:bg-white transition-all resize-none"></textarea>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;
};

window.saveReceipt = async function () {
    const date = document.getElementById('recDate').value;
    const amountVal = document.getElementById('recAmount').value;
    const amount = parseAmountInput(amountVal);
    const targetAccountId = document.getElementById('recTargetAccount').value;
    const sourceAccountId = document.getElementById('recSourceAccount').value;
    const method = document.getElementById('recMethod').value;
    const description = document.getElementById('recDesc').value;
    const receivedFrom = document.getElementById('recReceivedFrom').value;

    if (!amount || amount <= 0) return showToast('Mohon isi jumlah penerimaan.', 'error');
    if (!sourceAccountId) return showToast('Mohon pilih akun sumber (COA).', 'error');

    try {
        await api.saveReceipt({ date, amount, targetAccountId, sourceAccountId, method, description, receivedFrom });
        showToast('Penerimaan berhasil dicatat', 'success');
        await db.sync('receipts');
        await db.sync('journalEntries');
        await db.sync('accounts');
        renderFinanceReceipts();
    } catch (err) {
        showToast(err.message, 'error');
    }
};

window.openExpenseModal = function () {
    const mc = document.getElementById('main-content');
    window.renderBreadcrumb(['Finance', 'Pengeluaran Kas & Bank', 'Catat Pengeluaran']);
    
    const bankAccounts = db.read('bankAccounts') || [];
    let assetAccounts = [];
    if (bankAccounts.length > 0) {
        assetAccounts = bankAccounts.map(ba => {
            const coaAcc = db.findById('accounts', ba.accountId || ba.account_id);
            return {
                id: coaAcc ? coaAcc.id : (ba.accountId || ba.account_id),
                name: ba.name,
                code: ba.accountNumber || ba.account_number || (coaAcc ? coaAcc.code : '')
            };
        });
    } else {
        assetAccounts = db.read('accounts').filter(a => getBaseType(a.type) === 'ASSET' && a.code.startsWith('11'));
    }
    const expenseAccounts = db.read('accounts').filter(a => getBaseType(a.type) === 'EXPENSE');
    const depts = db.read('departments');

    mc.innerHTML = `
        <div class="-mx-4 -mt-4 sm:-mx-6 sm:-mt-6 mb-6 bg-white border-b border-slate-200 px-6 py-3 flex items-center justify-end gap-3 sticky top-0 z-10">
            <button onclick="renderFinanceExpenses()" class="px-5 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100 rounded-lg transition-all">BATAL</button>
            <button onclick="saveExpense()" class="flex items-center gap-2 px-6 py-2 text-sm font-bold bg-blue-600 text-white rounded-xl hover:bg-blue-700 shadow-lg shadow-blue-200 transition-all active:scale-95">
                <span class="w-2 h-2 rounded-full bg-white inline-block"></span> SIMPAN PENGELUARAN
            </button>
        </div>
        <div class="space-y-6">
            <div class="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-visible">
                <div class="px-8 py-4 border-b border-slate-100">
                    <span class="text-[10px] font-black text-blue-600 uppercase tracking-widest">
                        <i class="fas fa-circle text-[6px] mr-1"></i> INFORMASI PENGELUARAN
                    </span>
                </div>
                <div class="px-8 py-6">
                    <div class="grid grid-cols-1 gap-5">
                        <div>
                            <label class="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Pengeluaran Kepada <span class="text-red-400">*</span></label>
                            <input type="text" id="expPaidTo" placeholder="Nama penerima / Pihak luar..." class="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-semibold text-slate-700 outline-none focus:border-blue-500 focus:bg-white transition-all">
                        </div>
                        <div class="grid grid-cols-2 gap-5">
                            <div>
                                <label class="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Tanggal Dibayar <span class="text-red-400">*</span></label>
                                <input type="date" id="expDate" value="${new Date().toISOString().slice(0,10)}" class="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-semibold text-slate-700 outline-none focus:border-blue-500 focus:bg-white transition-all">
                            </div>
                            <div>
                                <label class="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Jumlah Dibayar (IDR) <span class="text-red-400">*</span></label>
                                <input type="text" id="expAmount" oninput="this.value=formatAmountInput(this.value)" placeholder="0" class="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold text-blue-600 outline-none focus:border-blue-500 focus:bg-white transition-all">
                            </div>
                        </div>
                        <div class="grid grid-cols-2 gap-5">
                            <div>
                                <label class="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Kas/Bank Pengeluaran <span class="text-red-400">*</span></label>
                                <div class="relative" id="exp_from_account_dropdown_wrapper">
                                    <!-- Trigger -->
                                    <button type="button" id="exp_from_account_trigger"
                                        onclick="toggleFinanceDropdown('exp_from_account_dropdown')"
                                        class="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-semibold text-slate-700 outline-none focus:border-blue-500 focus:bg-white transition-all flex items-center justify-between hover:border-blue-400">
                                        <span id="exp_from_account_label" class="text-slate-700">${assetAccounts[0] ? `${assetAccounts[0].name} (${assetAccounts[0].code})` : '-- Pilih Kas/Bank --'}</span>
                                        <i class="fas fa-chevron-down text-slate-300 text-xs transition-transform" id="exp_from_account_chevron"></i>
                                    </button>
                                    <input type="hidden" id="expFromAccount" value="${assetAccounts[0] ? assetAccounts[0].id : ''}">
                                    <!-- Dropdown Panel -->
                                    <div id="exp_from_account_dropdown" class="hidden absolute top-full left-0 right-0 mt-2 bg-white rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.15)] border border-slate-100 z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                                        <!-- Search -->
                                        <div class="p-3 border-b border-slate-100">
                                            <div class="relative">
                                                <i class="fas fa-search absolute left-3 top-1/2 -translate-y-1/2 text-slate-300 text-xs"></i>
                                                <input type="text" id="exp_from_account_search_input" placeholder="Cari Kas/Bank..." oninput="filterFinanceDropdown('exp_from_account', this.value)"
                                                    class="w-full pl-9 pr-4 py-2 bg-slate-50 rounded-xl border border-slate-100 text-sm font-semibold text-slate-700 outline-none focus:border-blue-400">
                                            </div>
                                        </div>
                                        <!-- Options List -->
                                        <div id="exp_from_account_options" class="max-h-56 overflow-y-auto py-1">
                                            ${assetAccounts.map(a => `<div class="px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-blue-50 hover:text-blue-700 cursor-pointer transition-colors" onclick="selectFinanceDropdown('exp_from_account', '${a.id}', '${a.name} (${a.code})')">${a.name} (${a.code})</div>`).join('')}
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <div>
                                <label class="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">COA (Kategori Biaya) <span class="text-red-400">*</span></label>
                                <div class="relative" id="exp_to_account_dropdown_wrapper">
                                    <!-- Trigger -->
                                    <button type="button" id="exp_to_account_trigger"
                                        onclick="toggleFinanceDropdown('exp_to_account_dropdown')"
                                        class="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-semibold text-slate-700 outline-none focus:border-blue-500 focus:bg-white transition-all flex items-center justify-between hover:border-blue-400">
                                        <span id="exp_to_account_label" class="text-slate-400">- Pilih Kategori Biaya -</span>
                                        <i class="fas fa-chevron-down text-slate-300 text-xs transition-transform" id="exp_to_account_chevron"></i>
                                    </button>
                                    <input type="hidden" id="expToAccount" value="">
                                    <!-- Dropdown Panel -->
                                    <div id="exp_to_account_dropdown" class="hidden absolute top-full left-0 right-0 mt-2 bg-white rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.15)] border border-slate-100 z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                                        <!-- Search -->
                                        <div class="p-3 border-b border-slate-100">
                                            <div class="relative">
                                                <i class="fas fa-search absolute left-3 top-1/2 -translate-y-1/2 text-slate-300 text-xs"></i>
                                                <input type="text" id="exp_to_account_search_input" placeholder="Cari Kategori Biaya..." oninput="filterFinanceDropdown('exp_to_account', this.value)"
                                                    class="w-full pl-9 pr-4 py-2 bg-slate-50 rounded-xl border border-slate-100 text-sm font-semibold text-slate-700 outline-none focus:border-blue-400">
                                            </div>
                                        </div>
                                        <!-- Options List -->
                                        <div id="exp_to_account_options" class="max-h-56 overflow-y-auto py-1">
                                            ${expenseAccounts.map(a => `<div class="px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-blue-50 hover:text-blue-700 cursor-pointer transition-colors" onclick="selectFinanceDropdown('exp_to_account', '${a.id}', '${a.name} (${a.code})')">${a.name} (${a.code})</div>`).join('')}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div class="grid grid-cols-2 gap-5">
                            <div>
                                <label class="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Metode Pembayaran</label>
                                <select id="expMethod" class="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-semibold text-slate-700 outline-none focus:border-blue-500 focus:bg-white transition-all">
                                    <option value="Transfer">Transfer Bank</option>
                                    <option value="Tunai">Tunai / Cash</option>
                                    <option value="Cek/Giro">Cek / Giro</option>
                                </select>
                            </div>
                            <div>
                                <label class="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Departemen Alokasi</label>
                                <select id="expDept" class="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-semibold text-slate-700 outline-none focus:border-blue-500 focus:bg-white transition-all">
                                    <option value="">- Pilih Departemen -</option>
                                    ${depts.map(d => `<option value="${d.id}">${d.name}</option>`).join('')}
                                </select>
                            </div>
                        </div>
                        <div>
                            <label class="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Kebutuhan / Keterangan</label>
                            <textarea id="expDesc" rows="3" placeholder="Tuliskan tujuan atau kebutuhan pengeluaran dana..." class="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-700 outline-none focus:border-blue-500 focus:bg-white transition-all resize-none"></textarea>
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
    const paidTo = document.getElementById('expPaidTo').value;

    if (!paidTo) return showToast('Mohon isi nama penerima pengeluaran.', 'error');
    if (!amount || amount <= 0) return showToast('Mohon isi jumlah pengeluaran.', 'error');
    if (!toAccountId) return showToast('Mohon pilih COA (Kategori Biaya).', 'error');

    try {
        await api.saveExpense({ date, amount, fromAccountId, toAccountId, departmentId, description, method, paidTo });
        showToast('Pengeluaran berhasil dicatat', 'success');
        await db.sync('expenses');
        await db.sync('journalEntries');
        await db.sync('accounts');
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
                                        <div class="px-2 py-1 bg-blue-100 text-blue-700 rounded font-bold text-[9px]">${j.journal_no || j.journalNo || (j.reference_type ? `${j.reference_type}-${j.id.slice(0, 8).toUpperCase()}` : `JRN-${j.id.slice(0, 8).toUpperCase()}`)}</div>
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

    let filterBarHtml = '';
    let tableHtml = '';
    let totalCount = 0;
    let totalLabelText = '';

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

        // Enrich with computed fields for sortTh
        invoices = invoices.map(i => {
            const paid = allPayments.filter(p => p.invoiceId === i.id).reduce((s, p) => s + (parseFloat(p.amount) || 0), 0);
            return { ...i, customerName: i.customerName || db.findById('customers', i.customerId)?.name || '', balance: parseFloat(i.totalAmount) - paid };
        });
        const defaultARSort = (arr) => [...arr].sort((a, b) => ((b.date || '') > (a.date || '') ? 1 : -1));
        invoices = window.applyTableSort(invoices, 'fin_ar', defaultARSort);

        let totalAROutstanding = 0;
        let totalARTagihan = 0;
        let totalARTerbayar = 0;

        invoices.forEach(i => {
            const paid = allPayments.filter(p => p.invoiceId === i.id).reduce((s, p) => s + (parseFloat(p.amount) || 0), 0);
            const balance = parseFloat(i.totalAmount) - paid;
            totalARTagihan += parseFloat(i.totalAmount) || 0;
            totalARTerbayar += paid;
            totalAROutstanding += balance;
        });
        const totalAR = totalAROutstanding;

        totalCount = invoices.length;
        totalLabelText = 'DOKUMEN MENUNGGU';

        filterBarHtml = `
            <!-- Unified Filter & Action Box -->
            <div class="bg-white rounded-2xl shadow-sm border border-slate-100 p-3 flex flex-col md:flex-row items-center gap-3">
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

                    <button onclick="openFinanceARPaymentModal()" class="flex items-center justify-center gap-2 px-6 h-10 bg-blue-600 hover:bg-slate-900 text-white rounded-xl text-sm font-bold shadow-lg shadow-blue-200 transition-all active:scale-95 whitespace-nowrap">
                        <i class="fas fa-plus"></i> INPUT PELUNASAN
                    </button>
                </div>
            </div>
        `;

        tableHtml = `
            <div class="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                <div class="overflow-x-auto">
                    <table class="w-full text-left border-collapse">
                        <thead class="bg-slate-50/50 sticky top-0">
                            <tr>
                                ${window.sortTh('fin_ar','customerName','string','Customer Name','renderFinanceAR')}
                                ${window.sortTh('fin_ar','status','string','Status','renderFinanceAR','text-center')}
                                ${window.sortTh('fin_ar','date','date','Date','renderFinanceAR','text-center')}
                                ${window.sortTh('fin_ar','balance','number','Balance','renderFinanceAR','text-right')}
                                ${window.sortTh('fin_ar','invoiceNumber','string','No. Invoice','renderFinanceAR')}
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

                                const dropdownOptions = [
                                    ['view', 'Detail Faktur', 'fas fa-eye'],
                                    ['pay', 'Input Bayar', 'fas fa-money-bill-wave']
                                ];
                                const actionHtml = window.renderActionsDropdownHtml(`ar-${i.id}`, 'handleARAction', dropdownOptions);

                                return `
                                <tr class="hover:bg-slate-50/50 transition-colors group">

                                    <td class="px-6 py-4">
                                        <div class="text-sm font-bold text-slate-800">${i.customerName || db.findById('customers', i.customerId)?.name || 'Unknown'}</div>
                                    </td>
                                    <td class="px-6 py-4 text-center">
                                        <span class="px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-wider border ${statusClass}">
                                            ${i.status}
                                        </span>
                                    </td>
                                    <td class="px-6 py-4 text-center text-xs font-bold text-slate-600">
                                        ${formatDateOnly(i.date)}
                                    </td>
                                    <td class="px-6 py-4 text-right">
                                        <div class="text-sm font-bold text-slate-800">${formatCurrency(balance)}</div>
                                    </td>
                                    <td class="px-6 py-4">
                                        <div class="px-3 py-1 bg-blue-50 text-blue-600 border border-blue-100 rounded-lg text-[10px] font-black w-fit hover:bg-blue-600 hover:text-white transition-all cursor-pointer">
                                            ${i.invoiceNumber}
                                        </div>
                                    </td>
                                    <td class="px-6 py-4 text-right overflow-visible">
                                        <div class="flex justify-end overflow-visible">
                                            ${actionHtml}
                                        </div>
                                    </td>
                                </tr>
                            `}).join('') || `
                                <tr>
                                    <td colspan="7" class="px-6 py-20 text-center text-slate-400 italic">
                                        <div class="flex flex-col items-center justify-center space-y-3 py-6">
                                            <i class="fas fa-file-invoice-dollar text-slate-300 text-5xl"></i>
                                            <span class="text-sm font-bold text-slate-400 uppercase tracking-widest">TIDAK ADA ANTRIAN PIUTANG</span>
                                        </div>
                                    </td>
                                </tr>
                            `}
                        </tbody>
                    </table>
                </div>

                <!-- Totals Summary Bar (Minimalist) -->
                <div class="px-10 py-6 flex items-center justify-between border-t border-slate-100 bg-slate-50/50">
                    <div>
                        <p class="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1 opacity-70">Total Outstanding</p>
                        <p class="text-2xl font-black font-mono tracking-tighter text-slate-800">${formatCurrency(totalAROutstanding)}</p>
                    </div>
                    
                    <div class="flex gap-12 text-right items-center">
                        <div class="flex flex-col">
                            <span class="text-[10px] font-black text-slate-300 uppercase tracking-widest mb-1">Total Tagihan</span>
                            <span class="text-sm font-bold font-mono text-slate-500">${formatCurrency(totalARTagihan)}</span>
                        </div>
                        <div class="flex flex-col">
                            <span class="text-[10px] font-black text-slate-300 uppercase tracking-widest mb-1">Total Terbayar</span>
                            <span class="text-sm font-bold font-mono text-slate-500">${formatCurrency(totalARTerbayar)}</span>
                        </div>
                    </div>
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
                const refNo = (p.paymentNumber || p.reference || '').toLowerCase();
                const method = (p.method || '').toLowerCase();
                const notes = (p.notes || '').toLowerCase();
                return refNo.includes(q) || cName.includes(q) || method.includes(q) || notes.includes(q);
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

        const totalReceived = payments.reduce((sum, p) => sum + (parseFloat(p.amount) || 0), 0);
        totalCount = payments.length;
        totalLabelText = 'DOKUMEN SELESAI';

        filterBarHtml = `
            <!-- History Filter Row -->
            <div class="flex flex-col md:flex-row items-center justify-between gap-4 bg-white p-3 rounded-2xl border border-slate-100 shadow-sm">
                <div class="flex items-center gap-3 w-full md:w-auto flex-1">
                    <div class="relative flex-1 md:flex-none md:w-80 group">
                        <div class="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                            <i class="fas fa-search text-slate-400 group-focus-within:text-blue-500 transition-colors"></i>
                        </div>
                        <input type="text" id="arHistSearchInput" value="${window._arHistoryFilters.q || ''}" 
                            onkeyup="if(event.key==='Enter') applyARHistSearch()"
                            placeholder="Cari Metode, Catatan atau Pelanggan..." 
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
            </div>
        `;

        tableHtml = `
            <div class="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                <table class="w-full text-left border-collapse">
                    <thead>
                        <tr class="bg-slate-50/50">
                            <th class="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">Tanggal</th>
                            <th class="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">Metode & Catatan</th>
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
                                    <td class="px-6 py-4 text-xs font-bold text-slate-500">${formatDateOnly(p.date)}</td>
                                    <td class="px-6 py-4">
                                        <div class="text-sm font-bold text-slate-700">${p.method || '-'}</div>
                                        ${p.notes ? `<div class="text-[10px] text-slate-450 font-medium mt-0.5">${p.notes}</div>` : ''}
                                    </td>
                                    <td class="px-6 py-4">
                                        <div class="text-[10px] font-black px-2 py-1 bg-slate-100 text-slate-500 rounded-md w-fit">${inv.invoiceNumber}</div>
                                    </td>
                                    <td class="px-6 py-4 text-sm font-bold text-slate-600">${cName}</td>
                                    <td class="px-6 py-4 text-right font-black text-emerald-600">${formatCurrency(p.amount)}</td>
                                </tr>
                            `;
                        }).join('') || `
                            <tr>
                                <td colspan="5" class="px-6 py-20 text-center text-slate-400 italic">
                                    <div class="flex flex-col items-center justify-center space-y-3 py-6">
                                        <i class="fas fa-history text-slate-200 text-5xl"></i>
                                        <span class="text-sm font-bold text-slate-400 uppercase tracking-widest">BELUM ADA RIWAYAT PENERIMAAN</span>
                                    </div>
                                </td>
                            </tr>
                        `}
                    </tbody>
                </table>

                <!-- Totals Summary Bar (Minimalist) -->
                <div class="px-10 py-6 flex items-center justify-between border-t border-slate-100 bg-slate-50/50">
                    <div>
                        <p class="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1 opacity-70">Total Diterima</p>
                        <p class="text-2xl font-black font-mono tracking-tighter text-emerald-600">${formatCurrency(totalReceived)}</p>
                    </div>
                </div>
            </div>
        `;
    }

    const tabsHtml = `
        <div class="flex items-center gap-1 bg-slate-100 p-1.5 rounded-2xl w-fit border border-slate-200/60 shadow-inner overflow-hidden">
            <button onclick="window._uiState.arActiveTab='unpaid'; renderFinanceAR();" 
                class="px-8 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all duration-300 flex items-center gap-2 ${activeTab === 'unpaid' ? 'bg-white text-blue-600 shadow-md scale-100 border border-slate-100' : 'text-slate-400 hover:text-slate-600 hover:bg-white/40 opacity-70'}">
                <i class="fas fa-file-invoice-dollar"></i> Antrean Piutang
            </button>
            <button onclick="window._uiState.arActiveTab='history'; renderFinanceAR();" 
                class="px-8 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all duration-300 flex items-center gap-2 ${activeTab === 'history' ? 'bg-white text-green-600 shadow-md scale-100 border border-slate-100' : 'text-slate-400 hover:text-slate-600 hover:bg-white/40 opacity-70'}">
                <i class="fas fa-history"></i> Riwayat Penerimaan
            </button>
        </div>
    `;

    mc.innerHTML = `
        <div class="space-y-6">
            ${filterBarHtml}
            ${tabsHtml}
            <div class="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">
                TOTAL: ${totalCount} ${totalLabelText}
            </div>
            ${tableHtml}
        </div>
    `;

    // Maintain search focus
    const inputId = activeTab === 'unpaid' ? 'arSearchInput' : 'arHistSearchInput';
    const input = document.getElementById(inputId);
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
    window._arHistoryFilters = { q: '', customer: '', date: '', dateFrom: '', dateTo: '' };
    renderFinanceAR();
};

window.handleARAction = function(action, id) {
    if (!action) return;
    const cleanId = typeof id === 'string' ? id.replace(/^[a-z]+-/, '') : id;
    if (action === 'view') navigateTo('sales-invoices', { invoiceId: cleanId });
    else if (action === 'pay') openFinanceARPaymentModal(cleanId);
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

// --- Custom Finance Dropdown Helpers ---
window.toggleFinanceDropdown = function(dropdownId) {
    const dropdown = document.getElementById(dropdownId);
    if (!dropdown) return;
    const isHidden = dropdown.classList.contains('hidden');
    // Close all open finance dropdowns first
    document.querySelectorAll('[id$="_dropdown"]').forEach(d => {
        if (d !== dropdown) {
            d.classList.add('hidden');
        }
    });
    dropdown.classList.toggle('hidden', !isHidden);
    // Focus search input if opening
    if (isHidden) {
        const searchInput = dropdown.querySelector('input[type="text"]');
        if (searchInput) setTimeout(() => searchInput.focus(), 50);
    }
};

window.selectFinanceDropdown = function(prefix, value, label, callbackFnName, extraParam) {
    // Set hidden input
    let hiddenInputId = '';
    if (prefix === 'ar_customer') hiddenInputId = 'far_customer_id';
    else if (prefix === 'ap_supplier') hiddenInputId = 'fap_supplier_id';
    else if (prefix === 'ar_invoice') hiddenInputId = 'far_invoice_id';
    else if (prefix === 'ap_invoice') hiddenInputId = 'fap_invoice_id';
    else if (prefix === 'rec_target_account') hiddenInputId = 'recTargetAccount';
    else if (prefix === 'rec_source_account') hiddenInputId = 'recSourceAccount';
    else if (prefix === 'exp_from_account') hiddenInputId = 'expFromAccount';
    else if (prefix === 'exp_to_account') hiddenInputId = 'expToAccount';
    
    const hiddenInput = document.getElementById(hiddenInputId);
    if (hiddenInput) {
        hiddenInput.value = value;
        if (extraParam !== undefined) {
            hiddenInput.dataset.balance = extraParam;
        }
    }
    // Update label
    const labelEl = document.getElementById(prefix + '_label');
    if (labelEl) {
        labelEl.textContent = label;
        labelEl.classList.remove('text-slate-400');
        labelEl.classList.add('text-slate-700');
    }
    // Close dropdown
    const dropdown = document.getElementById(prefix + '_dropdown');
    if (dropdown) dropdown.classList.add('hidden');
    // Call callback
    if (callbackFnName && typeof window[callbackFnName] === 'function') {
        window[callbackFnName]();
    }
};

window.filterFinanceDropdown = function(prefix, query) {
    const optionsContainer = document.getElementById(prefix + '_options');
    if (!optionsContainer) return;
    const q = query.toLowerCase();
    optionsContainer.querySelectorAll('div').forEach(item => {
        const text = item.textContent.toLowerCase();
        item.style.display = text.includes(q) ? '' : 'none';
    });
};

// Close dropdowns when clicking outside
document.addEventListener('click', function(e) {
    if (!e.target.closest('[id$="_dropdown_wrapper"]') && !e.target.closest('[id$="_dropdown"]')) {
        document.querySelectorAll('[id$="_dropdown"]:not(.hidden)').forEach(d => {
            d.classList.add('hidden');
        });
    }
}, true);

// --- Finance AR Payment Feature ---
window.openFinanceARPaymentModal = () => {
    const mc = document.getElementById('main-content');
    window.renderBreadcrumb(['Finance', 'Data Piutang (AR)', 'Input Pelunasan']);
    const invoices = db.read('salesInvoices');
    const payments = db.read('payments');
    const customers = db.read('customers');
    const assetAccounts = db.read('accounts').filter(a => getBaseType(a.type) === 'ASSET' && a.code.startsWith('11'));

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
                    <input type="text" id="far_amount" placeholder="0" oninput="this.value=formatAmountInput(this.value)" class="w-full border border-gray-300 rounded px-3 py-2 text-lg font-bold text-blue-600">
                </div>
                <div>
                    <label class="block text-sm font-medium text-gray-700 mb-1" title="Input jika ada kelebihan nominal transfer">Uang Lebih Titipan (Rp)</label>
                    <input type="text" id="far_overpay" placeholder="0" value="0" oninput="this.value=formatAmountInput(this.value)" class="w-full border border-gray-300 rounded px-3 py-2 text-lg font-bold text-green-600">
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

    mc.innerHTML = `
        <!-- Action Bar: full-width white bar like Quotation form -->
        <div class="-mx-4 -mt-4 sm:-mx-6 sm:-mt-6 mb-6 bg-white border-b border-slate-200 px-6 py-3 flex items-center justify-end gap-3 sticky top-0 z-10">
            <button onclick="renderFinanceAR()" class="px-5 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100 rounded-lg transition-all">BATAL</button>
            <button onclick="saveFinanceARPayment()" class="flex items-center gap-2 px-6 py-2 text-sm font-bold bg-blue-600 text-white rounded-xl hover:bg-blue-700 shadow-lg shadow-blue-200 transition-all active:scale-95">
                <span class="w-2 h-2 rounded-full bg-white inline-block"></span> PROSES PELUNASAN
            </button>
        </div>
        <div class="space-y-6">
            <!-- Section: Informasi Pelunasan -->
            <div class="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                <div class="px-8 py-4 border-b border-slate-100">
                    <span class="text-[10px] font-black text-blue-600 uppercase tracking-widest">
                        <i class="fas fa-circle text-[6px] mr-1"></i> INFORMASI PELUNASAN
                    </span>
                </div>
                <div class="px-8 py-6">
                    <div class="grid grid-cols-1 gap-5">
                        <!-- Customer Custom Dropdown -->
                        <div>
                            <label class="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Customer <span class="text-red-400">*</span></label>
                            <div class="relative" id="ar_customer_dropdown_wrapper">
                                <!-- Trigger -->
                                <button type="button" id="ar_customer_trigger"
                                    onclick="toggleFinanceDropdown('ar_customer_dropdown')"
                                    class="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-semibold text-slate-700 outline-none focus:border-blue-500 focus:bg-white transition-all flex items-center justify-between hover:border-blue-400">
                                    <span id="ar_customer_label" class="text-slate-400">-- Pilih Customer --</span>
                                    <i class="fas fa-chevron-down text-slate-300 text-xs transition-transform" id="ar_customer_chevron"></i>
                                </button>
                                <input type="hidden" id="far_customer_id">
                                <!-- Dropdown Panel -->
                                <div id="ar_customer_dropdown" class="hidden absolute top-full left-0 right-0 mt-2 bg-white rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.15)] border border-slate-100 z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                                    <!-- Search -->
                                    <div class="p-3 border-b border-slate-100">
                                        <div class="relative">
                                            <i class="fas fa-search absolute left-3 top-1/2 -translate-y-1/2 text-slate-300 text-xs"></i>
                                            <input type="text" id="ar_customer_search_input" placeholder="Cari customer..." oninput="filterFinanceDropdown('ar_customer', this.value)"
                                                class="w-full pl-9 pr-4 py-2 bg-slate-50 rounded-xl border border-slate-100 text-sm font-semibold text-slate-700 outline-none focus:border-blue-400">
                                        </div>
                                    </div>
                                    <!-- Options List -->
                                    <div id="ar_customer_options" class="max-h-56 overflow-y-auto py-1">
                                        ${customerIdsWithUnpaid.map(cId => {
                                            const c = customers.find(x => x.id === cId) || { name: 'Unknown', id: cId };
                                            return `<div class="px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-blue-50 hover:text-blue-700 cursor-pointer transition-colors" onclick="selectFinanceDropdown('ar_customer', '${cId}', '${c.name}', 'updateARInvoicesByCustomer')">${c.name}</div>`;
                                        }).join('')}
                                    </div>
                                    <!-- Footer Actions -->
                                    <div class="border-t border-slate-100 py-1">
                                        <div onclick="navigateTo('customers-new')" class="px-4 py-3 flex items-center gap-3 text-sm font-semibold text-slate-500 hover:bg-slate-50 cursor-pointer transition-colors">
                                            <span class="w-7 h-7 rounded-lg bg-slate-100 flex items-center justify-center text-slate-500 text-xs"><i class="fas fa-plus"></i></span>
                                            Buat Customer Baru
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <!-- Faktur Custom Dropdown -->
                        <div>
                            <label class="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Pilih Faktur Piutang (AR) <span class="text-red-400">*</span></label>
                            <div class="relative" id="ar_invoice_dropdown_wrapper">
                                <!-- Trigger -->
                                <button type="button" id="ar_invoice_trigger" disabled
                                    onclick="toggleFinanceDropdown('ar_invoice_dropdown')"
                                    class="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-semibold text-slate-700 outline-none focus:border-blue-500 focus:bg-white transition-all flex items-center justify-between hover:border-blue-400 disabled:opacity-50 disabled:cursor-not-allowed">
                                    <span id="ar_invoice_label" class="text-slate-400">-- Pilih Customer terlebih dahulu --</span>
                                    <i class="fas fa-chevron-down text-slate-300 text-xs transition-transform" id="ar_invoice_chevron"></i>
                                </button>
                                <input type="hidden" id="far_invoice_id">
                                <!-- Dropdown Panel -->
                                <div id="ar_invoice_dropdown" class="hidden absolute top-full left-0 right-0 mt-2 bg-white rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.15)] border border-slate-100 z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                                    <!-- Search -->
                                    <div class="p-3 border-b border-slate-100">
                                        <div class="relative">
                                            <i class="fas fa-search absolute left-3 top-1/2 -translate-y-1/2 text-slate-300 text-xs"></i>
                                            <input type="text" id="ar_invoice_search_input" placeholder="Cari Faktur/Invoice..." oninput="filterFinanceDropdown('ar_invoice', this.value)"
                                                class="w-full pl-9 pr-4 py-2 bg-slate-50 rounded-xl border border-slate-100 text-sm font-semibold text-slate-700 outline-none focus:border-blue-400">
                                        </div>
                                    </div>
                                    <!-- Options List -->
                                    <div id="ar_invoice_options" class="max-h-56 overflow-y-auto py-1">
                                        <!-- Dynamically Populated -->
                                    </div>
                                </div>
                            </div>
                        </div>
                        <!-- Tanggal & Kas/Bank -->
                        <div class="grid grid-cols-2 gap-5">
                            <div>
                                <label class="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Tanggal Terima <span class="text-red-400">*</span></label>
                                <input type="date" id="far_date" value="${new Date().toISOString().split('T')[0]}" class="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-semibold text-slate-700 outline-none focus:border-blue-500 focus:bg-white transition-all">
                            </div>
                            <div>
                                <label class="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Masuk ke Kas/Bank <span class="text-red-400">*</span></label>
                                <select id="far_account_id" class="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-semibold text-slate-700 outline-none focus:border-blue-500 focus:bg-white transition-all">
                                    ${assetAccounts.map(a => `<option value="${a.id}">${a.name} (${a.code})</option>`).join('')}
                                </select>
                            </div>
                        </div>
                        <!-- Metode -->
                        <div class="grid grid-cols-2 gap-5">
                            <div>
                                <label class="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Metode Pembayaran</label>
                                <select id="far_method" class="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-semibold text-slate-700 outline-none focus:border-blue-500 focus:bg-white transition-all">
                                    <option>Transfer Bank</option>
                                    <option>Tunai / Cash</option>
                                    <option>Giro / Cek</option>
                                </select>
                            </div>
                        </div>
                        <!-- Alokasi & Uang Lebih -->
                        <div class="grid grid-cols-2 gap-5">
                            <div>
                                <label class="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Alokasi Piutang (Rp) <span class="text-red-400">*</span></label>
                                <input type="text" id="far_amount" placeholder="0" oninput="this.value=formatAmountInput(this.value)" class="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold text-blue-600 outline-none focus:border-blue-500 focus:bg-white transition-all">
                            </div>
                            <div>
                                <label class="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Uang Lebih Titipan (Rp)</label>
                                <input type="text" id="far_overpay" placeholder="0" value="0" oninput="this.value=formatAmountInput(this.value)" class="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold text-emerald-600 outline-none focus:border-blue-500 focus:bg-white transition-all">
                            </div>
                        </div>
                        <!-- Catatan -->
                        <div>
                            <label class="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Catatan</label>
                            <textarea id="far_notes" rows="2" placeholder="Catatan tambahan..." class="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-700 outline-none focus:border-blue-500 focus:bg-white transition-all resize-none"></textarea>
                        </div>
                        <!-- Upload -->
                        <div>
                            <label class="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Upload Bukti Pembayaran <span class="text-slate-300 font-normal">(Opsional)</span></label>
                            <input type="file" id="far_proof_file" accept="image/*,application/pdf" class="w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-bold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 border border-slate-200 rounded-xl bg-slate-50 p-1">
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;
};

window.updateARInvoicesByCustomer = () => {
    const customerId = document.getElementById('far_customer_id').value;
    const hiddenInput = document.getElementById('far_invoice_id');
    const triggerBtn = document.getElementById('ar_invoice_trigger');
    const labelEl = document.getElementById('ar_invoice_label');
    const optionsContainer = document.getElementById('ar_invoice_options');
    const amountInput = document.getElementById('far_amount');

    // Reset values first
    if (hiddenInput) {
        hiddenInput.value = '';
        delete hiddenInput.dataset.balance;
    }
    if (amountInput) amountInput.value = '0';

    if (!customerId) {
        if (labelEl) {
            labelEl.textContent = '-- Pilih Customer terlebih dahulu --';
            labelEl.classList.add('text-slate-400');
            labelEl.classList.remove('text-slate-700');
        }
        if (triggerBtn) triggerBtn.disabled = true;
        if (optionsContainer) optionsContainer.innerHTML = '';
        return;
    }

    const invoices = db.read('salesInvoices').filter(inv => (inv.status === 'UNPAID' || inv.status === 'PARTIAL') && inv.customerId === customerId);
    const payments = db.read('payments');

    if (invoices.length === 0) {
        if (labelEl) {
            labelEl.textContent = 'Tidak ada faktur UNPAID untuk customer ini';
            labelEl.classList.add('text-slate-400');
            labelEl.classList.remove('text-slate-700');
        }
        if (triggerBtn) triggerBtn.disabled = true;
        if (optionsContainer) optionsContainer.innerHTML = '';
        return;
    }

    if (labelEl) {
        labelEl.textContent = 'Pilih Invoice...';
        labelEl.classList.add('text-slate-400');
        labelEl.classList.remove('text-slate-700');
    }
    if (triggerBtn) triggerBtn.disabled = false;

    const itemsHtml = invoices.map(inv => {
        const invPayments = payments.filter(p => p.invoiceId === inv.id);
        const totalPaid = invPayments.reduce((sum, p) => sum + parseFloat(p.amount), 0);
        const balance = inv.totalAmount - totalPaid;
        const displayLabel = `${inv.invoiceNumber} (Sisa: ${formatCurrency(balance)})`;
        return `<div class="px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-blue-50 hover:text-blue-700 cursor-pointer transition-colors" 
            onclick="selectFinanceDropdown('ar_invoice', '${inv.id}', '${displayLabel}', 'updateFinanceARPaymentDefaultAmount', '${balance}')">${displayLabel}</div>`;
    }).join('');

    if (optionsContainer) optionsContainer.innerHTML = itemsHtml;
};

window.updateFinanceARPaymentDefaultAmount = () => {
    const hiddenInput = document.getElementById('far_invoice_id');
    if (hiddenInput && hiddenInput.value) {
        const balance = hiddenInput.dataset.balance || '0';
        document.getElementById('far_amount').value = formatAmountInput(balance);
    }
};

window.saveFinanceARPayment = async () => {
    const invoiceId = document.getElementById('far_invoice_id').value;
    const dateInput = document.getElementById('far_date').value;
    const accountId = document.getElementById('far_account_id').value;
    const method = document.getElementById('far_method').value;
    const inputAmount = parseAmountInput(document.getElementById('far_amount').value);
    const overpayAmount = parseAmountInput(document.getElementById('far_overpay').value) || 0;
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
        reference: paymentNumber,  // DB column name compatibility
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
    renderFinanceAR();
};

window.renderFinanceAP = function () {
    document.getElementById('pageTitle').innerText = 'Data Hutang (AP)';
    const mc = document.getElementById('main-content');
    
    // Ensure state
    window._uiState.apActiveTab = window._uiState.apActiveTab || 'unpaid';
    window._apFilters = window._apFilters || { q: '', status: '', dateFrom: '', dateTo: '', sortOrder: 'desc' };
    window._apHistoryFilters = window._apHistoryFilters || { q: '', dateFrom: '', dateTo: '' };
    
    const activeTab = window._uiState.apActiveTab;
    const allInvoices = db.read('purchaseInvoices') || [];
    const allPayments = db.read('supplierPayments') || [];
    const suppliers = db.read('suppliers') || [];

    const tabs = [
        { id: 'unpaid', label: 'Antrean Hutang', icon: 'fa-clock' },
        { id: 'history', label: 'Riwayat Pembayaran', icon: 'fa-history' }
    ];

    let contentHtml = '';

    if (activeTab === 'unpaid') {
        const q = (window._apFilters.q || '').toLowerCase();
        let invoices = allInvoices.filter(i => i.status === 'UNPAID' || i.status === 'PARTIAL');

        // Apply Search
        if (q) {
            invoices = invoices.filter(i => {
                const sName = (suppliers.find(s => s.id === i.supplierId || s.name === i.supplierId)?.name || '').toLowerCase();
                const invNum = (i.invNumber || i.invoiceNumber || '').toLowerCase();
                return invNum.includes(q) || sName.includes(q);
            });
        }

        // Apply Date Range Filter
        if (window._apFilters.dateFrom || window._apFilters.dateTo) {
            invoices = invoices.filter(i => {
                let ok = true;
                if (window._apFilters.dateFrom && i.date < window._apFilters.dateFrom) ok = false;
                if (window._apFilters.dateTo && i.date > window._apFilters.dateTo) ok = false;
                return ok;
            });
        }

        // Enrich with computed fields for sortTh
        invoices = invoices.map(i => {
            const paid = allPayments.filter(p => p.invoiceId === i.id).reduce((s, p) => s + (parseFloat(p.amount) || 0), 0);
            const supp = suppliers.find(s => s.id === i.supplierId || s.name === i.supplierId) || { name: i.supplierId };
            return { ...i, supplierName: supp.name, balance: parseFloat(i.totalAmount) - paid };
        });
        const defaultAPSort = (arr) => [...arr].sort((a, b) => ((b.date || '') > (a.date || '') ? 1 : -1));
        invoices = window.applyTableSort(invoices, 'fin_ap', defaultAPSort);

        let totalAPOutstanding = 0;
        let totalAPTagihan = 0;
        let totalAPTerbayar = 0;

        invoices.forEach(i => {
            const paid = allPayments.filter(p => p.invoiceId === i.id).reduce((s, p) => s + (parseFloat(p.amount) || 0), 0);
            const balance = parseFloat(i.totalAmount) - paid;
            totalAPTagihan += parseFloat(i.totalAmount) || 0;
            totalAPTerbayar += paid;
            totalAPOutstanding += balance;
        });
        const totalAP = totalAPOutstanding;

        contentHtml = `
            <!-- Unified Filter & Action Box -->
            <div class="bg-white rounded-2xl shadow-sm border border-slate-100 p-3 flex flex-col md:flex-row items-center gap-3 mb-6">
                <div class="relative flex-1 group w-full">
                    <i class="fas fa-search absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-blue-500 transition-colors"></i>
                    <input type="text" id="apSearchInput" 
                        onkeyup="if(event.key==='Enter') applyAPSearch()"
                        value="${window._apFilters.q || ''}"
                        placeholder="Cari No. Tagihan atau Nama Supplier..." 
                        class="w-full pl-11 pr-4 py-2.5 bg-slate-50/50 rounded-xl border border-slate-100 focus:border-blue-500 focus:bg-white text-sm font-semibold text-slate-700 outline-none transition-all"
                    >
                </div>
                
                <div class="flex items-center gap-3 w-full md:w-auto px-1">
                    <div class="relative flex items-center h-10 bg-white border border-slate-200 rounded-xl shadow-sm overflow-visible">
                        <button onclick="window._apFilters.sortOrder = window._apFilters.sortOrder === 'asc' ? 'desc' : 'asc'; renderFinanceAP()" 
                            class="w-10 h-full flex items-center justify-center bg-slate-50 border-r border-slate-200 text-slate-400 hover:text-blue-600 transition-all">
                            <i class="fas fa-sort-amount-${window._apFilters.sortOrder === 'asc' ? 'up' : 'down'}-alt text-xs"></i>
                        </button>
                        <div onclick="window._uiState.apDatePopoverOpen = !window._uiState.apDatePopoverOpen; renderFinanceAP()" 
                            class="relative flex items-center h-full px-4 cursor-pointer hover:bg-slate-50 transition-all group min-w-[100px]">
                            <span class="text-sm font-bold text-blue-600 mr-3">Date</span>
                            <i class="fas fa-chevron-down text-blue-300 text-[10px] transition-transform ${window._uiState.apDatePopoverOpen ? 'rotate-180' : ''}"></i>
                        </div>

                        <div class="${window._uiState.apDatePopoverOpen ? 'block' : 'hidden'} absolute top-full left-0 mt-3 w-80 bg-white rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.15)] border border-slate-100 p-6 z-[100] animate-in fade-in zoom-in-95 duration-200">
                            <div class="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-5">FILTER RANGE</div>
                            <div class="grid grid-cols-2 gap-4 mb-6">
                                <div class="space-y-1.5">
                                    <label class="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">DARI</label>
                                    <input type="date" id="apDateFrom" value="${window._apFilters.dateFrom || ''}" class="w-full bg-slate-50 border-none rounded-xl px-4 py-3 text-sm font-bold text-slate-700 outline-none">
                                </div>
                                <div class="space-y-1.5">
                                    <label class="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">KE</label>
                                    <input type="date" id="apDateTo" value="${window._apFilters.dateTo || ''}" class="w-full bg-slate-50 border-none rounded-xl px-4 py-3 text-sm font-bold text-slate-700 outline-none">
                                </div>
                            </div>
                            <div class="flex gap-3">
                                <button onclick="applyAPDateRange()" class="flex-1 bg-blue-600 text-white py-3.5 rounded-2xl text-xs font-black uppercase tracking-widest shadow-lg shadow-blue-200">APPLY</button>
                                <button onclick="resetAPDateRange()" class="flex-1 bg-slate-50 text-slate-400 py-3.5 rounded-2xl text-xs font-black uppercase tracking-widest">RESET</button>
                            </div>
                        </div>
                    </div>

                    <button onclick="openFinanceAPPaymentModal()" class="flex items-center justify-center gap-2 px-6 h-10 bg-blue-600 hover:bg-slate-900 text-white rounded-xl text-sm font-bold shadow-lg shadow-blue-200 transition-all active:scale-95 whitespace-nowrap">
                        <i class="fas fa-plus"></i> INPUT PEMBAYARAN
                    </button>
                </div>
            </div>

            <!-- Tab Navigation Container -->
            <div class="flex items-center gap-1 bg-slate-100 p-1.5 rounded-2xl w-fit border border-slate-200/60 shadow-inner overflow-hidden mb-6">
                <button onclick="window._uiState.apActiveTab='unpaid'; renderFinanceAP();" 
                    class="px-8 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all duration-300 flex items-center gap-2 bg-white text-blue-600 shadow-md scale-100 border border-slate-100">
                    <i class="fas fa-file-invoice"></i> Antrean Hutang
                </button>
                <button onclick="window._uiState.apActiveTab='history'; renderFinanceAP();" 
                    class="px-8 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all duration-300 flex items-center gap-2 text-slate-400 hover:text-slate-600 hover:bg-white/40 opacity-70">
                    <i class="fas fa-history"></i> Riwayat Pembayaran
                </button>
            </div>

            <div class="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">
                TOTAL: ${invoices.length} DOKUMEN MENUNGGU
            </div>

            <div class="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                <div class="overflow-x-auto">
                    <table class="w-full text-left border-collapse">
                        <thead class="bg-slate-50/50 sticky top-0">
                            <tr>
                                ${window.sortTh('fin_ap','supplierName','string','Supplier Name','renderFinanceAP')}
                                ${window.sortTh('fin_ap','status','string','Status','renderFinanceAP','text-center')}
                                ${window.sortTh('fin_ap','date','date','Jatuh Tempo','renderFinanceAP','text-center')}
                                ${window.sortTh('fin_ap','balance','number','Sisa Hutang','renderFinanceAP','text-right')}
                                ${window.sortTh('fin_ap','invNumber','string','No. Tagihan','renderFinanceAP')}
                                <th class="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 text-right">Aksi</th>
                            </tr>
                        </thead>
                        <tbody class="divide-y divide-slate-50">
                            ${invoices.map(i => {
                                const paid = allPayments.filter(p => p.invoiceId === i.id).reduce((s, p) => s + (parseFloat(p.amount) || 0), 0);
                                const balance = parseFloat(i.totalAmount) - paid;
                                const supp = suppliers.find(s => s.id === i.supplierId || s.name === i.supplierId) || { name: i.supplierId };
                                
                                let statusClass = 'bg-slate-100 text-slate-600 border-slate-200';
                                if (i.status === 'PAID') statusClass = 'bg-emerald-50 text-emerald-600 border border-emerald-200';
                                else if (i.status === 'PARTIAL') statusClass = 'bg-amber-50 text-amber-600 border border-amber-200';
                                else if (i.status === 'UNPAID') statusClass = 'bg-rose-50 text-rose-600 border border-rose-200';

                                const dropdownOptions = [
                                    ['view', 'Detail', 'fas fa-eye'],
                                    ['pay', 'Bayar', 'fas fa-money-bill-wave']
                                ];
                                const actionHtml = window.renderActionsDropdownHtml(`ap-${i.id}`, 'handleAPAction', dropdownOptions);

                                return `
                                <tr class="hover:bg-slate-50/50 transition-colors group">

                                    <td class="px-6 py-4">
                                        <div class="text-sm font-bold text-slate-800">${supp.name}</div>
                                    </td>
                                    <td class="px-6 py-4 text-center">
                                        <span class="px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-wider border ${statusClass}">
                                            ${i.status}
                                        </span>
                                    </td>
                                    <td class="px-6 py-4 text-center text-xs font-bold text-slate-600">
                                        ${formatDateOnly(i.dueDate)}
                                    </td>
                                    <td class="px-6 py-4 text-right">
                                        <div class="text-sm font-bold text-slate-800">${formatCurrency(balance)}</div>
                                    </td>
                                    <td class="px-6 py-4">
                                        <div class="px-3 py-1 bg-slate-50 text-slate-600 border border-slate-200 rounded-lg text-[10px] font-black w-fit">
                                            ${i.invNumber || i.invoiceNumber || '-'}
                                        </div>
                                    </td>
                                    <td class="px-6 py-4 text-right overflow-visible">
                                        <div class="flex justify-end overflow-visible">
                                            ${actionHtml}
                                        </div>
                                    </td>
                                </tr>
                            `}).join('') || `
                                <tr>
                                    <td colspan="7" class="px-6 py-20 text-center text-slate-400 italic">
                                        <div class="flex flex-col items-center justify-center space-y-3 py-6">
                                            <i class="fas fa-file-invoice text-slate-300 text-5xl"></i>
                                            <span class="text-sm font-bold text-slate-400 uppercase tracking-widest">TIDAK ADA ANTRIAN HUTANG</span>
                                        </div>
                                    </td>
                                </tr>
                            `}
                        </tbody>
                    </table>
                </div>

                <!-- Totals Summary Bar (Minimalist) -->
                <div class="px-10 py-6 flex items-center justify-between border-t border-slate-100 bg-slate-50/50">
                    <div>
                        <p class="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1 opacity-70">Total Outstanding</p>
                        <p class="text-2xl font-black font-mono tracking-tighter text-slate-800">${formatCurrency(totalAPOutstanding)}</p>
                    </div>
                    
                    <div class="flex gap-12 text-right items-center">
                        <div class="flex flex-col">
                            <span class="text-[10px] font-black text-slate-300 uppercase tracking-widest mb-1">Total Tagihan</span>
                            <span class="text-sm font-bold font-mono text-slate-500">${formatCurrency(totalAPTagihan)}</span>
                        </div>
                        <div class="flex flex-col">
                            <span class="text-[10px] font-black text-slate-300 uppercase tracking-widest mb-1">Total Terbayar</span>
                            <span class="text-sm font-bold font-mono text-slate-500">${formatCurrency(totalAPTerbayar)}</span>
                        </div>
                    </div>
                </div>
            </div>
        `;

    } else {
        const q = (window._apHistoryFilters.q || '').toLowerCase();
        let payments = [...allPayments].sort((a, b) => new Date(b.date) - new Date(a.date));
        
        if (q) {
            payments = payments.filter(p => {
                const inv = db.findById('purchaseInvoices', p.invoiceId);
                const sName = (suppliers.find(s => s.id === inv?.supplierId || s.name === inv?.supplierId)?.name || '').toLowerCase();
                const refNo = (p.paymentNumber || p.reference || '').toLowerCase();
                const method = (p.method || '').toLowerCase();
                const notes = (p.notes || '').toLowerCase();
                return refNo.includes(q) || sName.includes(q) || method.includes(q) || notes.includes(q);
            });
        }

        if (window._apHistoryFilters.dateFrom || window._apHistoryFilters.dateTo) {
            payments = payments.filter(p => {
                let ok = true;
                if (window._apHistoryFilters.dateFrom && p.date < window._apHistoryFilters.dateFrom) ok = false;
                if (window._apHistoryFilters.dateTo && p.date > window._apHistoryFilters.dateTo) ok = false;
                return ok;
            });
        }

        const totalPaid = payments.reduce((sum, p) => sum + (parseFloat(p.amount) || 0), 0);

        contentHtml = `
            <div class="flex flex-col md:flex-row items-center justify-between gap-4 bg-white p-3 rounded-2xl border border-slate-100 shadow-sm mb-6">
                <div class="flex items-center gap-3 w-full md:w-auto flex-1">
                    <div class="relative flex-1 md:flex-none md:w-80 group">
                        <div class="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                            <i class="fas fa-search text-slate-400 group-focus-within:text-blue-500 transition-colors"></i>
                        </div>
                        <input type="text" id="apHistSearchInput" value="${window._apHistoryFilters.q || ''}" 
                            onkeyup="if(event.key==='Enter') applyAPHistSearch()"
                            placeholder="Cari Metode, Catatan atau Supplier..." 
                            class="block w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all">
                    </div>
                    
                    <div class="relative flex items-center bg-white border border-slate-200 rounded-xl overflow-visible shadow-sm h-10">
                        <div class="w-10 h-full flex items-center justify-center bg-slate-50 border-r border-slate-200 text-slate-500">
                            <i class="fas fa-calendar-alt text-xs"></i>
                        </div>
                        <div onclick="window._uiState.apHistDatePopoverOpen = !window._uiState.apHistDatePopoverOpen; renderFinanceAP()" 
                            class="relative flex items-center h-full px-4 cursor-pointer hover:bg-slate-50 transition-all group min-w-[100px]">
                            <span class="text-sm font-bold text-blue-600 mr-3">Date</span>
                            <i class="fas fa-chevron-down text-blue-300 text-[10px] transition-transform ${window._uiState.apHistDatePopoverOpen ? 'rotate-180' : ''}"></i>
                        </div>

                        <div class="${window._uiState.apHistDatePopoverOpen ? 'block' : 'hidden'} absolute top-full left-0 mt-3 w-80 bg-white rounded-3xl shadow-[0_20px_50px_rgba(0,0,0,0.2)] border border-slate-100 p-6 z-[100]">
                            <div class="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-5">FILTER RIWAYAT</div>
                            <div class="grid grid-cols-2 gap-4 mb-6">
                                <div class="space-y-1.5">
                                    <label class="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">DARI</label>
                                    <input type="date" id="apHistDateFrom" value="${window._apHistoryFilters.dateFrom || ''}" class="w-full bg-slate-50 border-none rounded-2xl px-4 py-3 text-sm font-bold text-slate-700 outline-none">
                                </div>
                                <div class="space-y-1.5">
                                    <label class="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">KE</label>
                                    <input type="date" id="apHistDateTo" value="${window._apHistoryFilters.dateTo || ''}" class="w-full bg-slate-50 border-none rounded-2xl px-4 py-3 text-sm font-bold text-slate-700 outline-none">
                                </div>
                            </div>
                            <div class="flex gap-3">
                                <button onclick="applyAPHistDateRange()" class="flex-1 bg-blue-600 text-white py-3.5 rounded-2xl text-xs font-black uppercase tracking-widest shadow-lg shadow-blue-200">APPLY</button>
                                <button onclick="resetAPHistDateRange()" class="flex-1 bg-slate-50 text-slate-400 py-3.5 rounded-2xl text-xs font-black uppercase tracking-widest">RESET</button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Tab Navigation Container -->
            <div class="flex items-center gap-1 bg-slate-100 p-1.5 rounded-2xl w-fit border border-slate-200/60 shadow-inner overflow-hidden mb-6">
                <button onclick="window._uiState.apActiveTab='unpaid'; renderFinanceAP();" 
                    class="px-8 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all duration-300 flex items-center gap-2 text-slate-400 hover:text-slate-600 hover:bg-white/40 opacity-70">
                    <i class="fas fa-file-invoice"></i> Antrean Hutang
                </button>
                <button onclick="window._uiState.apActiveTab='history'; renderFinanceAP();" 
                    class="px-8 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all duration-300 flex items-center gap-2 bg-white text-green-600 shadow-md scale-100 border border-slate-100">
                    <i class="fas fa-history"></i> Riwayat Pembayaran
                </button>
            </div>

            <div class="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">
                TOTAL: ${payments.length} DOKUMEN SELESAI
            </div>

            <div class="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                <table class="w-full text-left border-collapse">
                    <thead>
                        <tr class="bg-slate-50/50">
                            <th class="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">Tanggal</th>
                            <th class="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">Metode & Catatan</th>
                            <th class="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">Tagihan</th>
                            <th class="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">Supplier</th>
                            <th class="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 text-right">Jumlah</th>
                        </tr>
                    </thead>
                    <tbody class="divide-y divide-slate-50">
                        ${payments.map(p => {
                            const inv = db.findById('purchaseInvoices', p.invoiceId) || { invNumber: '-', invoiceNumber: '-', supplierId: null };
                            const supp = suppliers.find(s => s.id === inv.supplierId || s.name === inv.supplierId) || { name: '-' };
                            return `
                                <tr class="hover:bg-slate-50/50 transition-colors group">
                                    <td class="px-6 py-4 text-xs font-bold text-slate-500">${formatDateOnly(p.date)}</td>
                                    <td class="px-6 py-4">
                                        <div class="text-sm font-bold text-slate-700">${p.method || '-'}</div>
                                        ${p.notes ? `<div class="text-[10px] text-slate-455 font-medium mt-0.5">${p.notes}</div>` : ''}
                                    </td>
                                    <td class="px-6 py-4 text-xs text-slate-500 font-bold">${inv.invNumber || inv.invoiceNumber || '-'}</td>
                                    <td class="px-6 py-4 text-sm font-bold text-slate-600">${supp.name}</td>
                                    <td class="px-6 py-4 text-right font-black text-rose-600">${formatCurrency(p.amount)}</td>
                                </tr>
                            `;
                        }).join('') || `
                            <tr>
                                <td colspan="5" class="px-6 py-20 text-center text-slate-400 italic">
                                    <div class="flex flex-col items-center justify-center space-y-3 py-6">
                                        <i class="fas fa-history text-slate-200 text-5xl"></i>
                                        <span class="text-sm font-bold text-slate-400 uppercase tracking-widest">BELUM ADA RIWAYAT PEMBAYARAN</span>
                                    </div>
                                </td>
                            </tr>
                        `}
                    </tbody>
                </table>

                <!-- Totals Summary Bar (Minimalist) -->
                <div class="px-10 py-6 flex items-center justify-between border-t border-slate-100 bg-slate-50/50">
                    <div>
                        <p class="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1 opacity-70">Total Dibayar</p>
                        <p class="text-2xl font-black font-mono tracking-tighter text-rose-600">${formatCurrency(totalPaid)}</p>
                    </div>
                </div>
            </div>
        `;
    }

    mc.innerHTML = `
        <div class="space-y-6">
            ${contentHtml}
        </div>
    `;

    // Maintain focus
    const inputId = activeTab === 'unpaid' ? 'apSearchInput' : 'apHistSearchInput';
    const input = document.getElementById(inputId);
    if (input) {
        input.focus();
        const val = input.value; input.value = ''; input.value = val;
    }
};

window.applyAPSearch = function() {
    window._apFilters.q = document.getElementById('apSearchInput')?.value || '';
    renderFinanceAP();
};

window.applyAPDateRange = function() {
    window._apFilters.dateFrom = document.getElementById('apDateFrom')?.value || '';
    window._apFilters.dateTo = document.getElementById('apDateTo')?.value || '';
    window._uiState.apDatePopoverOpen = false;
    renderFinanceAP();
};

window.resetAPDateRange = function() {
    window._apFilters.dateFrom = '';
    window._apFilters.dateTo = '';
    window._uiState.apDatePopoverOpen = false;
    renderFinanceAP();
};

window.applyAPHistSearch = function() {
    window._apHistoryFilters.q = document.getElementById('apHistSearchInput')?.value || '';
    renderFinanceAP();
};

window.applyAPHistDateRange = function() {
    window._apHistoryFilters.dateFrom = document.getElementById('apHistDateFrom')?.value || '';
    window._apHistoryFilters.dateTo = document.getElementById('apHistDateTo')?.value || '';
    window._uiState.apHistDatePopoverOpen = false;
    renderFinanceAP();
};

window.resetAPHistDateRange = function() {
    window._apHistoryFilters.q = '';
    window._apHistoryFilters.dateFrom = '';
    window._apHistoryFilters.dateTo = '';
    window._uiState.apHistDatePopoverOpen = false;
    renderFinanceAP();
};

window.handleAPAction = function(action, id) {
    if (!action) return;
    const cleanId = typeof id === 'string' ? id.replace(/^[a-z]+-/, '') : id;
    if (action === 'view') navigateTo('purchase-invoices', { invoiceId: cleanId });
    else if (action === 'pay') openFinanceAPPaymentModal(cleanId);
};

// --- Finance AP Payment Feature ---
window.openFinanceAPPaymentModal = () => {
    const mc = document.getElementById('main-content');
    window.renderBreadcrumb(['Finance', 'Data Hutang (AP)', 'Input Pembayaran']);
    const invoices = db.read('purchaseInvoices').filter(i => i.status === 'UNPAID' || i.status === 'PARTIAL');
    const payments = db.read('supplierPayments');
    const suppliers = db.read('suppliers');
    const assetAccounts = db.read('accounts').filter(a => getBaseType(a.type) === 'ASSET' && a.code.startsWith('11'));

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
                    <input type="text" id="fap_amount" placeholder="0" oninput="this.value=formatAmountInput(this.value)" class="w-full border border-gray-300 rounded px-3 py-2 text-lg font-bold text-red-600">
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

    mc.innerHTML = `
        <!-- Action Bar: full-width white bar like Quotation form -->
        <div class="-mx-4 -mt-4 sm:-mx-6 sm:-mt-6 mb-6 bg-white border-b border-slate-200 px-6 py-3 flex items-center justify-end gap-3 sticky top-0 z-10">
            <button onclick="renderFinanceAP()" class="px-5 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100 rounded-lg transition-all">BATAL</button>
            <button onclick="saveFinanceAPPayment()" class="flex items-center gap-2 px-6 py-2 text-sm font-bold bg-blue-600 text-white rounded-xl hover:bg-blue-700 shadow-lg shadow-blue-200 transition-all active:scale-95">
                <span class="w-2 h-2 rounded-full bg-white inline-block"></span> PROSES PEMBAYARAN
            </button>
        </div>
        <div class="space-y-6">
            <div class="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                <div class="px-8 py-4 border-b border-slate-100">
                    <span class="text-[10px] font-black text-blue-600 uppercase tracking-widest">
                        <i class="fas fa-circle text-[6px] mr-1"></i> INFORMASI PEMBAYARAN
                    </span>
                </div>
                <div class="px-8 py-6">
                    <div class="grid grid-cols-1 gap-5">
                        <!-- Supplier Custom Dropdown -->
                        <div>
                            <label class="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Supplier <span class="text-red-400">*</span></label>
                            <div class="relative" id="ap_supplier_dropdown_wrapper">
                                <!-- Trigger -->
                                <button type="button" id="ap_supplier_trigger"
                                    onclick="toggleFinanceDropdown('ap_supplier_dropdown')"
                                    class="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-semibold text-slate-700 outline-none focus:border-blue-500 focus:bg-white transition-all flex items-center justify-between hover:border-blue-400">
                                    <span id="ap_supplier_label" class="text-slate-400">-- Pilih Supplier --</span>
                                    <i class="fas fa-chevron-down text-slate-300 text-xs transition-transform" id="ap_supplier_chevron"></i>
                                </button>
                                <input type="hidden" id="fap_supplier_id">
                                <!-- Dropdown Panel -->
                                <div id="ap_supplier_dropdown" class="hidden absolute top-full left-0 right-0 mt-2 bg-white rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.15)] border border-slate-100 z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                                    <!-- Search -->
                                    <div class="p-3 border-b border-slate-100">
                                        <div class="relative">
                                            <i class="fas fa-search absolute left-3 top-1/2 -translate-y-1/2 text-slate-300 text-xs"></i>
                                            <input type="text" id="ap_supplier_search_input" placeholder="Cari supplier..." oninput="filterFinanceDropdown('ap_supplier', this.value)"
                                                class="w-full pl-9 pr-4 py-2 bg-slate-50 rounded-xl border border-slate-100 text-sm font-semibold text-slate-700 outline-none focus:border-blue-400">
                                        </div>
                                    </div>
                                    <!-- Options List -->
                                    <div id="ap_supplier_options" class="max-h-56 overflow-y-auto py-1">
                                        ${supplierIdsWithUnpaid.map(sId => {
                                            const s = suppliers.find(x => x.id === sId || x.name === sId);
                                            const displayName = s ? s.name : (sId || 'Unknown Supplier');
                                            return `<div class="px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-blue-50 hover:text-blue-700 cursor-pointer transition-colors" onclick="selectFinanceDropdown('ap_supplier', '${sId}', '${displayName}', 'updateAPInvoicesBySupplier')">${displayName}</div>`;
                                        }).join('')}
                                    </div>
                                    <!-- Footer Actions -->
                                    <div class="border-t border-slate-100 py-1">
                                        <div onclick="navigateTo('suppliers-new')" class="px-4 py-3 flex items-center gap-3 text-sm font-semibold text-slate-500 hover:bg-slate-50 cursor-pointer transition-colors">
                                            <span class="w-7 h-7 rounded-lg bg-slate-100 flex items-center justify-center text-slate-500 text-xs"><i class="fas fa-plus"></i></span>
                                            Buat Supplier Baru
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <!-- Tagihan Custom Dropdown -->
                        <div>
                            <label class="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Pilih Tagihan Supplier (AP) <span class="text-red-400">*</span></label>
                            <div class="relative" id="ap_invoice_dropdown_wrapper">
                                <!-- Trigger -->
                                <button type="button" id="ap_invoice_trigger" disabled
                                    onclick="toggleFinanceDropdown('ap_invoice_dropdown')"
                                    class="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-semibold text-slate-700 outline-none focus:border-blue-500 focus:bg-white transition-all flex items-center justify-between hover:border-blue-400 disabled:opacity-50 disabled:cursor-not-allowed">
                                    <span id="ap_invoice_label" class="text-slate-400">-- Pilih Supplier terlebih dahulu --</span>
                                    <i class="fas fa-chevron-down text-slate-300 text-xs transition-transform" id="ap_invoice_chevron"></i>
                                </button>
                                <input type="hidden" id="fap_invoice_id">
                                <!-- Dropdown Panel -->
                                <div id="ap_invoice_dropdown" class="hidden absolute top-full left-0 right-0 mt-2 bg-white rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.15)] border border-slate-100 z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                                    <!-- Search -->
                                    <div class="p-3 border-b border-slate-100">
                                        <div class="relative">
                                            <i class="fas fa-search absolute left-3 top-1/2 -translate-y-1/2 text-slate-300 text-xs"></i>
                                            <input type="text" id="ap_invoice_search_input" placeholder="Cari tagihan/invoice..." oninput="filterFinanceDropdown('ap_invoice', this.value)"
                                                class="w-full pl-9 pr-4 py-2 bg-slate-50 rounded-xl border border-slate-100 text-sm font-semibold text-slate-700 outline-none focus:border-blue-400">
                                        </div>
                                    </div>
                                    <!-- Options List -->
                                    <div id="ap_invoice_options" class="max-h-56 overflow-y-auto py-1">
                                        <!-- Dynamically Populated -->
                                    </div>
                                </div>
                            </div>
                        </div>
                        <!-- Tanggal & Kas/Bank -->
                        <div class="grid grid-cols-2 gap-5">
                            <div>
                                <label class="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Tanggal Bayar <span class="text-red-400">*</span></label>
                                <input type="date" id="fap_date" value="${new Date().toISOString().split('T')[0]}" class="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-semibold text-slate-700 outline-none focus:border-blue-500 focus:bg-white transition-all">
                            </div>
                            <div>
                                <label class="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Bayar Dari (Kas/Bank) <span class="text-red-400">*</span></label>
                                <select id="fap_account_id" onchange="updateFinanceAPPaymentDefaultAmount()" class="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-semibold text-slate-700 outline-none focus:border-blue-500 focus:bg-white transition-all">
                                    ${assetAccounts.map(a => `<option value="${a.id}">${a.name} (${a.code})</option>`).join('')}
                                </select>
                                <div id="fap_balance_info" class="mt-1 text-[10px] font-bold text-slate-400">Saldo: <span id="fap_current_balance">${formatCurrency(db.getAccountBalance(assetAccounts[0]?.id))}</span></div>
                            </div>
                        </div>
                        <!-- Metode & Jumlah -->
                        <div class="grid grid-cols-2 gap-5">
                            <div>
                                <label class="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Metode Pembayaran</label>
                                <select id="fap_method" class="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-semibold text-slate-700 outline-none focus:border-blue-500 focus:bg-white transition-all">
                                    <option>Transfer Bank</option>
                                    <option>Tunai / Cash</option>
                                </select>
                            </div>
                            <div>
                                <label class="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Jumlah Bayar (Rp) <span class="text-red-400">*</span></label>
                                <input type="text" id="fap_amount" placeholder="0" oninput="this.value=formatAmountInput(this.value)" class="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold text-rose-600 outline-none focus:border-blue-500 focus:bg-white transition-all">
                            </div>
                        </div>
                        <!-- Bank Info Supplier -->
                        <div id="fap_bank_info" class="hidden p-4 bg-blue-50 border border-blue-100 rounded-xl">
                            <p class="text-[10px] font-black text-blue-600 uppercase tracking-widest mb-3">Detail Rekening Penerima (Supplier)</p>
                            <div class="grid grid-cols-3 gap-3">
                                <div><p class="text-[10px] text-slate-400">Bank</p><p id="fap_bank_name" class="text-sm font-bold text-slate-700">-</p></div>
                                <div><p class="text-[10px] text-slate-400">No. Rekening</p><p id="fap_bank_account" class="text-sm font-bold text-slate-700">-</p></div>
                                <div><p class="text-[10px] text-slate-400">Atas Nama</p><p id="fap_bank_holder" class="text-sm font-bold text-slate-700">-</p></div>
                            </div>
                        </div>
                        <!-- Catatan -->
                        <div>
                            <label class="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Catatan / No. Referensi Bank</label>
                            <textarea id="fap_notes" rows="2" placeholder="No. Referensi Bank / Catatan tambahan..." class="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-700 outline-none focus:border-blue-500 focus:bg-white transition-all resize-none"></textarea>
                        </div>
                        <!-- Upload -->
                        <div>
                            <label class="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Upload Bukti Transfer <span class="text-slate-300 font-normal">(Opsional)</span></label>
                            <input type="file" id="fap_receipt" accept="image/*,application/pdf" class="w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-bold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 border border-slate-200 rounded-xl bg-slate-50 p-1">
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;
};

window.updateAPInvoicesBySupplier = () => {
    const supplierId = document.getElementById('fap_supplier_id').value;
    const hiddenInput = document.getElementById('fap_invoice_id');
    const triggerBtn = document.getElementById('ap_invoice_trigger');
    const labelEl = document.getElementById('ap_invoice_label');
    const optionsContainer = document.getElementById('ap_invoice_options');
    const amountInput = document.getElementById('fap_amount');

    // Reset values first
    if (hiddenInput) {
        hiddenInput.value = '';
        delete hiddenInput.dataset.balance;
    }
    if (amountInput) amountInput.value = '0';
    updateFinanceAPPaymentDefaultAmount();

    if (!supplierId) {
        if (labelEl) {
            labelEl.textContent = '-- Pilih Supplier terlebih dahulu --';
            labelEl.classList.add('text-slate-400');
            labelEl.classList.remove('text-slate-700');
        }
        if (triggerBtn) triggerBtn.disabled = true;
        if (optionsContainer) optionsContainer.innerHTML = '';
        return;
    }

    const invoices = db.read('purchaseInvoices').filter(inv => (inv.status === 'UNPAID' || inv.status === 'PARTIAL') && inv.supplierId === supplierId);
    const payments = db.read('supplierPayments');

    if (invoices.length === 0) {
        if (labelEl) {
            labelEl.textContent = 'Tidak ada tagihan UNPAID untuk supplier ini';
            labelEl.classList.add('text-slate-400');
            labelEl.classList.remove('text-slate-700');
        }
        if (triggerBtn) triggerBtn.disabled = true;
        if (optionsContainer) optionsContainer.innerHTML = '';
        return;
    }

    if (labelEl) {
        labelEl.textContent = 'Pilih Tagihan...';
        labelEl.classList.add('text-slate-400');
        labelEl.classList.remove('text-slate-700');
    }
    if (triggerBtn) triggerBtn.disabled = false;

    const itemsHtml = invoices.map(inv => {
        const invPayments = payments.filter(p => p.invoiceId === inv.id);
        const totalPaid = invPayments.reduce((sum, p) => sum + parseFloat(p.amount), 0);
        const balance = inv.totalAmount - totalPaid;
        
        // Ambil No. NPB (Nota Penerimaan Barang)
        const po = db.findById('purchaseOrders', inv.purchaseOrderId);
        const receipt = po ? (po.receipts || []).find(r => r.id === inv.receiptId) : null;
        const npbNo = receipt ? (receipt.npbNumber || receipt.npb || '-') : '-';

        const displayLabel = `${inv.invNumber || inv.invoiceNumber || '-'} (NPB: ${npbNo}) (Sisa: ${formatCurrency(balance)})`;
        return `<div class="px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-blue-50 hover:text-blue-700 cursor-pointer transition-colors" 
            onclick="selectFinanceDropdown('ap_invoice', '${inv.id}', '${displayLabel}', 'updateFinanceAPPaymentDefaultAmount', '${balance}')">${displayLabel}</div>`;
    }).join('');

    if (optionsContainer) optionsContainer.innerHTML = itemsHtml;
};

window.updateFinanceAPPaymentDefaultAmount = () => {
    const hiddenInput = document.getElementById('fap_invoice_id');
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

    if (hiddenInput && hiddenInput.value) {
        const balance = hiddenInput.dataset.balance || '0';
        document.getElementById('fap_amount').value = formatAmountInput(balance);

        const invId = hiddenInput.value;
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
    const inputAmount = parseAmountInput(document.getElementById('fap_amount').value);
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
        reference: paymentNumber,  // DB column name compatibility
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
            description: `Pelunasan Hutang (AP) ke ${db.findById('suppliers', inv.supplierId)?.name || 'Supplier'} - ${inv.invNumber || inv.invoiceNumber || '-'}`,
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
    const accounts = db.read('accounts').filter(a => getBaseType(a.type) === 'ASSET');

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
                                    <td class="px-6 py-4">
                                        <div class="font-bold text-gray-800">${ba.name} <span class="text-[10px] font-normal text-gray-400 ml-1">(${ba.bankName})</span></div>
                                        ${ba.accountHolder ? `<div class="text-[10px] text-slate-400 mt-0.5">Atas Nama: <span class="font-semibold text-slate-500">${ba.accountHolder}</span></div>` : ''}
                                    </td>
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
    const accounts = db.read('accounts').filter(a => getBaseType(a.type) === 'ASSET');

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
                <label class="block text-sm font-medium text-gray-700 mb-1">Atas Nama (Account Holder)</label>
                <input type="text" id="ba_holder" value="${ba?.accountHolder || ''}" placeholder="Cth: PT. Tana Subur Nusantara" class="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500">
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
        accountHolder: document.getElementById('ba_holder').value.trim(),
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
    
    window._uiState.creditNoteActiveTab = window._uiState.creditNoteActiveTab || 'list';
    const activeTab = window._uiState.creditNoteActiveTab;

    window._cnFilters = window._cnFilters || { q: '', dateFrom: '', dateTo: '', sortOrder: 'desc' };
    const f = window._cnFilters;
    
    let notes = db.read('creditNotes') || [];
    if (f.q) {
        const q = f.q.toLowerCase();
        notes = notes.filter(n => {
            const cName = (db.findById('customers', n.customerId)?.name || '').toLowerCase();
            return (n.noteNumber || '').toLowerCase().includes(q) || (n.notes && n.notes.toLowerCase().includes(q)) || cName.includes(q);
        });
    }

    if (f.dateFrom || f.dateTo) {
        notes = notes.filter(n => {
            let ok = true;
            const nDate = (n.date || '').slice(0, 10);
            if (f.dateFrom && nDate < f.dateFrom) ok = false;
            if (f.dateTo && nDate > f.dateTo) ok = false;
            return ok;
        });
    }

    const defaultCNSort = (arr) => [...arr].sort((a, b) => ((b.date || '') > (a.date || '') ? 1 : -1));
    notes = window.applyTableSort(notes, 'fin_cn', defaultCNSort);

    const totalAmount = notes.reduce((sum, n) => sum + (parseFloat(n.amount) || 0), 0);

    let contentHtml = '';
    // Reusable Filter Bar exactly styled like AP/AR with Date popover instead of Total badge
    const filterBarHtml = `
        <div class="bg-white rounded-2xl shadow-sm border border-slate-100 p-3 flex flex-col md:flex-row items-center gap-3 mb-6">
            <div class="relative flex-1 group w-full">
                <i class="fas fa-search absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-blue-500 transition-colors"></i>
                <input type="text" id="cnSearchInput" onkeyup="if(event.key==='Enter') { window._cnFilters.q=this.value; renderFinanceCreditNotes(); }"
                    value="${f.q || ''}" placeholder="Cari No. Credit Note, Keterangan, atau Pelanggan..." 
                    class="w-full pl-11 pr-4 py-2.5 bg-slate-50/50 rounded-xl border border-slate-100 focus:border-blue-500 focus:bg-white text-sm font-semibold text-slate-700 outline-none transition-all">
            </div>
            <div class="flex items-center gap-3 w-full md:w-auto px-1">
                <div class="relative flex items-center h-10 bg-white border border-slate-200 rounded-xl shadow-sm overflow-visible">
                    <div onclick="window._uiState.cnDatePopoverOpen = !window._uiState.cnDatePopoverOpen; renderFinanceCreditNotes()" 
                        class="relative flex items-center h-full px-4 cursor-pointer hover:bg-slate-50 transition-all group min-w-[100px]">
                        <span class="text-xs font-bold text-blue-600 mr-3">Date</span>
                        <i class="fas fa-chevron-down text-blue-300 text-[10px] transition-transform ${window._uiState.cnDatePopoverOpen ? 'rotate-180' : ''}"></i>
                    </div>

                    <div class="${window._uiState.cnDatePopoverOpen ? 'block' : 'hidden'} absolute top-full left-0 mt-3 w-80 bg-white rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.15)] border border-slate-100 p-6 z-[100] animate-in fade-in zoom-in-95 duration-200">
                        <div class="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-5">FILTER RANGE</div>
                        <div class="grid grid-cols-2 gap-4 mb-6">
                            <div class="space-y-1.5">
                                <label class="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">DARI</label>
                                <input type="date" id="cnDateFrom" value="${f.dateFrom || ''}" class="w-full bg-slate-50 border-none rounded-xl px-4 py-3 text-sm font-bold text-slate-700 outline-none">
                            </div>
                            <div class="space-y-1.5">
                                <label class="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">KE</label>
                                <input type="date" id="cnDateTo" value="${f.dateTo || ''}" class="w-full bg-slate-50 border-none rounded-xl px-4 py-3 text-sm font-bold text-slate-700 outline-none">
                            </div>
                        </div>
                        <div class="flex gap-3">
                            <button onclick="applyCNDateRange()" class="flex-1 bg-blue-600 text-white py-3.5 rounded-2xl text-xs font-black uppercase tracking-widest shadow-lg shadow-blue-200">APPLY</button>
                            <button onclick="resetCNDateRange()" class="flex-1 bg-slate-50 text-slate-400 py-3.5 rounded-2xl text-xs font-black uppercase tracking-widest">RESET</button>
                        </div>
                    </div>
                </div>
                ${activeTab === 'list' ? `
                <button onclick="openCreditNoteModal()" class="flex items-center justify-center gap-2 px-6 h-10 bg-blue-600 hover:bg-slate-900 text-white rounded-xl text-sm font-bold shadow-lg shadow-blue-200 transition-all active:scale-95 whitespace-nowrap">
                    <i class="fas fa-plus"></i> BUAT CREDIT NOTE
                </button>` : ''}
            </div>
        </div>
    `;

    if (activeTab === 'list') {
        contentHtml = `
            <div class="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                <div class="overflow-x-auto">
                    <table class="w-full text-left border-collapse">
                        <thead>
                            <tr class="bg-slate-50/50">
                                ${window.sortTh('fin_cn', 'date', 'date', 'Tgl & Referensi', 'renderFinanceCreditNotes')}
                                ${window.sortTh('fin_cn', 'notes', 'string', 'Keterangan', 'renderFinanceCreditNotes')}
                                ${window.sortTh('fin_cn', 'customerId', 'string', 'Pelanggan', 'renderFinanceCreditNotes')}
                                ${window.sortTh('fin_cn', 'amount', 'number', 'Jumlah', 'renderFinanceCreditNotes', 'text-right')}
                                <th class="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 text-right">Aksi</th>
                            </tr>
                        </thead>
                        <tbody class="divide-y divide-slate-50">
                            ${notes.map(n => {
                                const dropdownOptions = [
                                    ['view', 'Detail', 'fas fa-eye']
                                ];
                                const actionHtml = window.renderActionsDropdownHtml(`cn-${n.id}`, 'handleCreditNoteAction', dropdownOptions);
                                return `
                                <tr class="hover:bg-slate-50/50 transition-colors group">
                                    <td class="px-6 py-4">
                                        <div class="text-[10px] text-slate-400 font-bold mb-1">${formatDate(n.date).slice(0, 10)}</div>
                                        <div class="inline-flex items-center px-2 py-1 bg-blue-50 text-blue-600 rounded-lg font-bold text-[10px] border border-blue-100">${n.noteNumber}</div>
                                    </td>
                                    <td class="px-6 py-4">
                                        <div class="text-sm font-bold text-slate-700">${n.notes || '-'}</div>
                                    </td>
                                    <td class="px-6 py-4">
                                        <span class="px-3 py-1 bg-slate-100 text-slate-600 rounded-full text-[9px] font-black uppercase tracking-widest">${db.findById('customers', n.customerId)?.name || 'N/A'}</span>
                                    </td>
                                    <td class="px-6 py-4 text-right font-black text-blue-600">${formatCurrency(n.amount)}</td>
                                    <td class="px-6 py-4 text-right overflow-visible">
                                        <div class="flex justify-end overflow-visible">
                                            ${actionHtml}
                                        </div>
                                    </td>
                                </tr>
                            `}).join('') || '<tr><td colspan="5" class="px-6 py-10 text-center text-slate-400 italic">Tidak ada data.</td></tr>'}
                        </tbody>
                    </table>
                </div>
                <!-- Totals Summary Bar (Minimalist) at the bottom -->
                <div class="px-10 py-6 flex items-center justify-between border-t border-slate-100 bg-slate-50/50">
                    <div>
                        <p class="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1 opacity-70">Total Credit Note</p>
                        <p class="text-2xl font-black font-mono tracking-tighter text-blue-600">${formatCurrency(totalAmount)}</p>
                    </div>
                </div>
            </div>
        `;
    } else if (activeTab === 'history') {
        contentHtml = `
            <div class="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden animate-in slide-in-from-bottom-4 duration-500">
                <div class="overflow-x-auto">
                    <table class="w-full text-left border-collapse">
                        <thead>
                            <tr class="bg-slate-50/50">
                                ${window.sortTh('fin_cn', 'date', 'date', 'Tanggal', 'renderFinanceCreditNotes')}
                                ${window.sortTh('fin_cn', 'noteNumber', 'string', 'Nomor', 'renderFinanceCreditNotes')}
                                ${window.sortTh('fin_cn', 'notes', 'string', 'Keterangan', 'renderFinanceCreditNotes')}
                                ${window.sortTh('fin_cn', 'amount', 'number', 'Jumlah', 'renderFinanceCreditNotes', 'text-right')}
                            </tr>
                        </thead>
                        <tbody class="divide-y divide-slate-50">
                            ${notes.map(n => `
                                <tr class="hover:bg-slate-50 transition-colors">
                                    <td class="px-6 py-4 text-sm text-slate-600">${formatDate(n.date).slice(0, 10)}</td>
                                    <td class="px-6 py-4 font-bold text-slate-700">${n.noteNumber}</td>
                                    <td class="px-6 py-4 text-sm text-slate-500">${n.notes || '-'}</td>
                                    <td class="px-6 py-4 text-right font-black text-blue-600">${formatCurrency(n.amount)}</td>
                                </tr>
                            `).join('') || '<tr><td colspan="4" class="px-6 py-10 text-center text-slate-400">Belum ada riwayat.</td></tr>'}
                        </tbody>
                    </table>
                </div>
                <!-- Totals Summary Bar (Minimalist) at the bottom -->
                <div class="px-10 py-6 flex items-center justify-between border-t border-slate-100 bg-slate-50/50">
                    <div>
                        <p class="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1 opacity-70">Total Credit Note (Riwayat)</p>
                        <p class="text-2xl font-black font-mono tracking-tighter text-blue-600">${formatCurrency(totalAmount)}</p>
                    </div>
                </div>
            </div>
        `;
    }

    const tabsHtml = `
        <div class="flex items-center gap-1 bg-slate-100 p-1.5 rounded-2xl w-fit border border-slate-200/60 shadow-inner overflow-hidden mb-6">
            <button onclick="window._uiState.creditNoteActiveTab='list'; renderFinanceCreditNotes();" 
                class="px-8 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all duration-300 flex items-center gap-2 ${activeTab === 'list' ? 'bg-white text-blue-600 shadow-md scale-100 border border-slate-100' : 'text-slate-400 hover:text-slate-600 hover:bg-white/40 opacity-70'}">
                <i class="fas fa-file-invoice-dollar"></i> Daftar Credit Note
            </button>
            <button onclick="window._uiState.creditNoteActiveTab='history'; renderFinanceCreditNotes();" 
                class="px-8 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all duration-300 flex items-center gap-2 ${activeTab === 'history' ? 'bg-white text-green-600 shadow-md scale-100 border border-slate-100' : 'text-slate-400 hover:text-slate-600 hover:bg-white/40 opacity-70'}">
                <i class="fas fa-history"></i> Riwayat Jurnal
            </button>
        </div>
    `;

    mc.innerHTML = `
        <div class="space-y-6 animate-in fade-in duration-500">
            ${filterBarHtml}
            ${tabsHtml}
            <div class="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">
                TOTAL: ${notes.length} DOKUMEN
            </div>
            ${contentHtml}
        </div>
    `;
};

window.applyCNDateRange = function() {
    window._cnFilters.dateFrom = document.getElementById('cnDateFrom')?.value || '';
    window._cnFilters.dateTo = document.getElementById('cnDateTo')?.value || '';
    window._uiState.cnDatePopoverOpen = false;
    renderFinanceCreditNotes();
};

window.resetCNDateRange = function() {
    window._cnFilters.dateFrom = '';
    window._cnFilters.dateTo = '';
    window._uiState.cnDatePopoverOpen = false;
    renderFinanceCreditNotes();
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
    const type = isTax ? 'A' : 'B';
    
    // Find max sequence for same type, month and year
    let maxSeq = 0;
    records.forEach(s => {
        if (!s.noteNumber) return;
        // CN-A-001/III/2026
        const mainParts = s.noteNumber.split('/');
        if (mainParts.length < 3) return;
        
        const prefixParts = mainParts[0].split('-');
        const romanPart = mainParts[1];
        const yearPartStr = mainParts[2];
        
        // Check same type, month (roman), and year
        if (prefixParts.length >= 3 && 
            prefixParts[1] === type && 
            romanPart === romanMonth && 
            yearPartStr === String(year)) {
            const seq = parseInt(prefixParts[2]);
            if (!isNaN(seq) && seq > maxSeq) maxSeq = seq;
        }
    });

    const nextSeq = maxSeq + 1;
    const seqStr = String(nextSeq).padStart(3, '0');
    return `CN-${type}-${seqStr}/${romanMonth}/${year}`;
};

window.generateDebitNoteNumber = function(isTax) {
    const records = db.read('debitNotes') || [];
    const now = new Date();
    const month = now.getMonth() + 1;
    const year = now.getFullYear();
    const romanMonth = romanizeFinanceList(month);
    const type = isTax ? 'A' : 'B';
    
    // Find max sequence for same type, month and year
    let maxSeq = 0;
    records.forEach(s => {
        if (!s.noteNumber) return;
        // DN-A-001/III/2026
        const mainParts = s.noteNumber.split('/');
        if (mainParts.length < 3) return;
        
        const prefixParts = mainParts[0].split('-');
        const romanPart = mainParts[1];
        const yearPartStr = mainParts[2];
        
        // Check same type, month (roman), and year
        if (prefixParts.length >= 3 && 
            prefixParts[1] === type && 
            romanPart === romanMonth && 
            yearPartStr === String(year)) {
            const seq = parseInt(prefixParts[2]);
            if (!isNaN(seq) && seq > maxSeq) maxSeq = seq;
        }
    });

    const nextSeq = maxSeq + 1;
    const seqStr = String(nextSeq).padStart(3, '0');
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
    const mc = document.getElementById('main-content');
    const customers = db.read('customers');
    const bankAccounts = db.read('bankAccounts') || [];
    
    mc.innerHTML = `
        <div class="-mx-4 -mt-4 sm:-mx-6 sm:-mt-6 mb-6 bg-white border-b border-slate-200 px-6 py-3 flex items-center justify-end gap-3 sticky top-0 z-10">
            <button onclick="renderFinanceCreditNotes()" class="px-5 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100 rounded-lg transition-all">BATAL</button>
            <button onclick="saveCreditNote()" class="flex items-center gap-2 px-6 py-2 text-sm font-bold bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 shadow-lg shadow-indigo-200 transition-all active:scale-95">
                <span class="w-2 h-2 rounded-full bg-white inline-block"></span> SIMPAN CREDIT NOTE
            </button>
        </div>
        <div class="space-y-6 animate-in fade-in duration-500">
            <div class="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                <div class="px-8 py-4 border-b border-slate-100">
                    <span class="text-[10px] font-black text-indigo-600 uppercase tracking-widest">
                        <i class="fas fa-circle text-[6px] mr-1"></i> INFORMASI CREDIT NOTE
                    </span>
                </div>
                <div class="px-8 py-6">
                    <div class="grid grid-cols-1 gap-5">
                        <div class="grid grid-cols-2 gap-5">
                            <div>
                                <label class="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Pelanggan <span class="text-red-400">*</span></label>
                                <select id="cn_customer" class="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-semibold text-slate-700 outline-none focus:border-indigo-500 focus:bg-white transition-all" onchange="updateCNInvoiceList()">
                                    <option value="">-- Pilih Pelanggan --</option>
                                    ${customers.map(c => `<option value="${c.id}">${c.name}</option>`).join('')}
                                </select>
                            </div>
                            <div>
                                <label class="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Pilih Tagihan (Opsional)</label>
                                <select id="cn_invoice" class="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-semibold text-slate-700 outline-none focus:border-indigo-500 focus:bg-white transition-all">
                                    <option value="">-- Pilih Pelanggan Dahulu --</option>
                                </select>
                            </div>
                        </div>
                        <div class="grid grid-cols-2 gap-5">
                            <div>
                                <label class="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Tanggal <span class="text-red-400">*</span></label>
                                <input type="date" id="cn_date" class="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-semibold text-slate-700 outline-none focus:border-indigo-500 focus:bg-white transition-all" value="${new Date().toISOString().split('T')[0]}" required>
                            </div>
                            <div>
                                <label class="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">No. Credit Note <span class="text-red-400">*</span></label>
                                <div class="flex">
                                     <select id="cn_is_tax" onchange="updateCNNumberPreview()" class="border border-slate-200 border-r-0 rounded-l-xl px-4 py-3 bg-slate-50 text-sm font-semibold focus:outline-none focus:ring-0 text-slate-700 transition-all">
                                         <option value="true">TAX</option>
                                         <option value="false">NT</option>
                                     </select>
                                     <input type="text" id="cn_number" value="${generateCreditNoteNumber(true)}" class="w-full bg-slate-50 border border-slate-200 rounded-r-xl px-4 py-3 text-sm font-mono focus:outline-none text-slate-700 focus:border-indigo-500 focus:bg-white transition-all" readonly>
                                </div>
                            </div>
                        </div>
                        <div class="grid grid-cols-2 gap-5">
                            <div>
                                <label class="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Jumlah Pemotongan (Amount) <span class="text-red-400">*</span></label>
                                <input type="text" id="cn_amount" oninput="this.value=formatAmountInput(this.value)" class="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold text-red-600 outline-none focus:border-indigo-500 focus:bg-white transition-all" placeholder="0">
                            </div>
                            <div>
                                <label class="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Refund Via Rekening Kas/Bank (Opsional)</label>
                                <select id="cn_bank_account_id" class="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-semibold text-slate-700 outline-none focus:border-indigo-500 focus:bg-white transition-all">
                                    <option value="">-- Potong Piutang Usaha (Default) --</option>
                                    ${bankAccounts.map(ba => `<option value="${ba.id}">${ba.name} (${ba.bankName || ''} - ${ba.accountNumber || ba.account_number || ''})</option>`).join('')}
                                </select>
                            </div>
                        </div>
                        <div>
                            <label class="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Alasan / Catatan</label>
                            <textarea id="cn_notes" rows="3" class="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-semibold text-slate-700 outline-none focus:border-indigo-500 focus:bg-white transition-all resize-none" placeholder="Contoh: Barang rusak / Retur unit..."></textarea>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;
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
    const amountVal = document.getElementById('cn_amount').value;
    const amount = parseAmountInput(amountVal) || 0;
    const notes = document.getElementById('cn_notes').value.trim();
    const invoiceId = document.getElementById('cn_invoice').value;
    const dateInput = document.getElementById('cn_date')?.value || new Date().toISOString().split('T')[0];
    const isTax = document.getElementById('cn_is_tax')?.value === 'true';
    const taxType = isTax ? 'A' : 'B';
    const noteNumberStr = document.getElementById('cn_number')?.value;
    const bankAccountId = document.getElementById('cn_bank_account_id')?.value || '';

    if (!customerId || amount <= 0) { showToast('Mohon pilih pelanggan dan isi jumlah yang valid.', 'error'); return; }
    
    // Convert local date to ISO for storage or store as YYYY-MM-DD directly
    const isoDate = new Date(dateInput).toISOString();
    const noteNumber = noteNumberStr || ('CN-' + Date.now().toString().slice(-6));
    
    const cn = db.insert('creditNotes', { 
        noteNumber, 
        date: isoDate, 
        customerId, 
        amount, 
        notes, 
        invoiceId, 
        taxType,
        bank_account_id: bankAccountId,
        bankAccountId: bankAccountId
    });
    
    if (typeof db.addJournalEntry === 'function' && cn) {
        let creditAccount = 'acc_ar'; // Default fallback
        if (bankAccountId) {
            const selectedBank = db.findById('bankAccounts', bankAccountId);
            if (selectedBank && (selectedBank.accountId || selectedBank.account_id)) {
                creditAccount = selectedBank.accountId || selectedBank.account_id;
            }
        }
        
        db.addJournalEntry({
            description: `Credit Note ${noteNumber} - ${notes}`,
            referenceId: cn.id, referenceType: 'CREDIT_NOTE',
            items: [
                { accountId: 'acc_sales_return', debit: amount, credit: 0 },
                { accountId: creditAccount, debit: 0, credit: amount }
            ]
        });
    }
    showToast('Credit Note berhasil disimpan dan Jurnal dibuat.');
    renderFinanceCreditNotes();
};

// --- DEBIT NOTES (Purchase Returns / Adjustments) ---
window.renderFinanceDebitNotes = function () {
    document.getElementById('pageTitle').innerText = 'Debit Notes (Penyesuaian Hutang)';
    const mc = document.getElementById('main-content');
    
    window._uiState.debitNoteActiveTab = window._uiState.debitNoteActiveTab || 'list';
    const activeTab = window._uiState.debitNoteActiveTab;

    window._dnFilters = window._dnFilters || { q: '', dateFrom: '', dateTo: '', sortOrder: 'desc' };
    const f = window._dnFilters;
    
    let notes = db.read('debitNotes') || [];
    if (f.q) {
        const q = f.q.toLowerCase();
        notes = notes.filter(n => {
            const sName = (db.findById('suppliers', n.supplierId)?.name || '').toLowerCase();
            return (n.noteNumber || '').toLowerCase().includes(q) || (n.notes && n.notes.toLowerCase().includes(q)) || sName.includes(q);
        });
    }

    if (f.dateFrom || f.dateTo) {
        notes = notes.filter(n => {
            let ok = true;
            const nDate = (n.date || '').slice(0, 10);
            if (f.dateFrom && nDate < f.dateFrom) ok = false;
            if (f.dateTo && nDate > f.dateTo) ok = false;
            return ok;
        });
    }

    const defaultDNSort = (arr) => [...arr].sort((a, b) => ((b.date || '') > (a.date || '') ? 1 : -1));
    notes = window.applyTableSort(notes, 'fin_dn', defaultDNSort);

    const totalAmount = notes.reduce((sum, n) => sum + (parseFloat(n.amount) || 0), 0);

    let contentHtml = '';
    // Reusable Filter Bar exactly styled like AP/AR with Date popover instead of Total badge
    const filterBarHtml = `
        <div class="bg-white rounded-2xl shadow-sm border border-slate-100 p-3 flex flex-col md:flex-row items-center gap-3 mb-6">
            <div class="relative flex-1 group w-full">
                <i class="fas fa-search absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-blue-500 transition-colors"></i>
                <input type="text" id="dnSearchInput" onkeyup="if(event.key==='Enter') { window._dnFilters.q=this.value; renderFinanceDebitNotes(); }"
                    value="${f.q || ''}" placeholder="Cari No. Debit Note, Keterangan, atau Supplier..." 
                    class="w-full pl-11 pr-4 py-2.5 bg-slate-50/50 rounded-xl border border-slate-100 focus:border-blue-500 focus:bg-white text-sm font-semibold text-slate-700 outline-none transition-all">
            </div>
            <div class="flex items-center gap-3 w-full md:w-auto px-1">
                <div class="relative flex items-center h-10 bg-white border border-slate-200 rounded-xl shadow-sm overflow-visible">
                    <div onclick="window._uiState.dnDatePopoverOpen = !window._uiState.dnDatePopoverOpen; renderFinanceDebitNotes()" 
                        class="relative flex items-center h-full px-4 cursor-pointer hover:bg-slate-50 transition-all group min-w-[100px]">
                        <span class="text-xs font-bold text-blue-600 mr-3">Date</span>
                        <i class="fas fa-chevron-down text-blue-300 text-[10px] transition-transform ${window._uiState.dnDatePopoverOpen ? 'rotate-180' : ''}"></i>
                    </div>

                    <div class="${window._uiState.dnDatePopoverOpen ? 'block' : 'hidden'} absolute top-full left-0 mt-3 w-80 bg-white rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.15)] border border-slate-100 p-6 z-[100] animate-in fade-in zoom-in-95 duration-200">
                        <div class="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-5">FILTER RANGE</div>
                        <div class="grid grid-cols-2 gap-4 mb-6">
                            <div class="space-y-1.5">
                                <label class="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">DARI</label>
                                <input type="date" id="dnDateFrom" value="${f.dateFrom || ''}" class="w-full bg-slate-50 border-none rounded-xl px-4 py-3 text-sm font-bold text-slate-700 outline-none">
                            </div>
                            <div class="space-y-1.5">
                                <label class="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">KE</label>
                                <input type="date" id="dnDateTo" value="${f.dateTo || ''}" class="w-full bg-slate-50 border-none rounded-xl px-4 py-3 text-sm font-bold text-slate-700 outline-none">
                            </div>
                        </div>
                        <div class="flex gap-3">
                            <button onclick="applyDNDateRange()" class="flex-1 bg-blue-600 text-white py-3.5 rounded-2xl text-xs font-black uppercase tracking-widest shadow-lg shadow-blue-200">APPLY</button>
                            <button onclick="resetDNDateRange()" class="flex-1 bg-slate-50 text-slate-400 py-3.5 rounded-2xl text-xs font-black uppercase tracking-widest">RESET</button>
                        </div>
                    </div>
                </div>
                ${activeTab === 'list' ? `
                <button onclick="openDebitNoteModal()" class="flex items-center justify-center gap-2 px-6 h-10 bg-blue-600 hover:bg-slate-900 text-white rounded-xl text-sm font-bold shadow-lg shadow-blue-200 transition-all active:scale-95 whitespace-nowrap">
                    <i class="fas fa-plus"></i> BUAT DEBIT NOTE
                </button>` : ''}
            </div>
        </div>
    `;

    if (activeTab === 'list') {
        contentHtml = `
            <div class="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                <div class="overflow-x-auto">
                    <table class="w-full text-left border-collapse">
                        <thead>
                            <tr class="bg-slate-50/50">
                                ${window.sortTh('fin_dn', 'date', 'date', 'Tgl & Referensi', 'renderFinanceDebitNotes')}
                                ${window.sortTh('fin_dn', 'notes', 'string', 'Keterangan', 'renderFinanceDebitNotes')}
                                ${window.sortTh('fin_dn', 'supplierId', 'string', 'Supplier', 'renderFinanceDebitNotes')}
                                ${window.sortTh('fin_dn', 'amount', 'number', 'Jumlah', 'renderFinanceDebitNotes', 'text-right')}
                                <th class="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 text-right">Aksi</th>
                            </tr>
                        </thead>
                        <tbody class="divide-y divide-slate-50">
                            ${notes.map(n => {
                                const dropdownOptions = [
                                    ['view', 'Detail', 'fas fa-eye']
                                ];
                                const actionHtml = window.renderActionsDropdownHtml(`dn-${n.id}`, 'handleDebitNoteAction', dropdownOptions);
                                return `
                                <tr class="hover:bg-slate-50/50 transition-colors group">
                                    <td class="px-6 py-4">
                                        <div class="text-[10px] text-slate-400 font-bold mb-1">${formatDate(n.date).slice(0, 10)}</div>
                                        <div class="inline-flex items-center px-2 py-1 bg-blue-50 text-blue-600 rounded-lg font-bold text-[10px] border border-blue-100">${n.noteNumber}</div>
                                    </td>
                                    <td class="px-6 py-4">
                                        <div class="text-sm font-bold text-slate-700">${n.notes || '-'}</div>
                                    </td>
                                    <td class="px-6 py-4">
                                        <span class="px-3 py-1 bg-slate-100 text-slate-600 rounded-full text-[9px] font-black uppercase tracking-widest">${db.findById('suppliers', n.supplierId)?.name || 'N/A'}</span>
                                    </td>
                                    <td class="px-6 py-4 text-right font-black text-blue-600">${formatCurrency(n.amount)}</td>
                                    <td class="px-6 py-4 text-right overflow-visible">
                                        <div class="flex justify-end overflow-visible">
                                            ${actionHtml}
                                        </div>
                                    </td>
                                </tr>
                            `}).join('') || '<tr><td colspan="5" class="px-6 py-10 text-center text-slate-400 italic">Tidak ada data.</td></tr>'}
                        </tbody>
                    </table>
                </div>
                <!-- Totals Summary Bar (Minimalist) at the bottom -->
                <div class="px-10 py-6 flex items-center justify-between border-t border-slate-100 bg-slate-50/50">
                    <div>
                        <p class="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1 opacity-70">Total Debit Note</p>
                        <p class="text-2xl font-black font-mono tracking-tighter text-blue-600">${formatCurrency(totalAmount)}</p>
                    </div>
                </div>
            </div>
        `;
    } else if (activeTab === 'history') {
        contentHtml = `
            <div class="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden animate-in slide-in-from-bottom-4 duration-500">
                <div class="overflow-x-auto">
                    <table class="w-full text-left border-collapse">
                        <thead>
                            <tr class="bg-slate-50/50">
                                ${window.sortTh('fin_dn', 'date', 'date', 'Tanggal', 'renderFinanceDebitNotes')}
                                ${window.sortTh('fin_dn', 'noteNumber', 'string', 'Nomor', 'renderFinanceDebitNotes')}
                                ${window.sortTh('fin_dn', 'notes', 'string', 'Keterangan', 'renderFinanceDebitNotes')}
                                ${window.sortTh('fin_dn', 'amount', 'number', 'Jumlah', 'renderFinanceDebitNotes', 'text-right')}
                            </tr>
                        </thead>
                        <tbody class="divide-y divide-slate-50">
                            ${notes.map(n => `
                                <tr class="hover:bg-slate-50 transition-colors">
                                    <td class="px-6 py-4 text-sm text-slate-600">${formatDate(n.date).slice(0, 10)}</td>
                                    <td class="px-6 py-4 font-bold text-slate-700">${n.noteNumber}</td>
                                    <td class="px-6 py-4 text-sm text-slate-500">${n.notes || '-'}</td>
                                    <td class="px-6 py-4 text-right font-black text-blue-600">${formatCurrency(n.amount)}</td>
                                </tr>
                            `).join('') || '<tr><td colspan="4" class="px-6 py-10 text-center text-slate-400">Belum ada riwayat.</td></tr>'}
                        </tbody>
                    </table>
                </div>
                <!-- Totals Summary Bar (Minimalist) at the bottom -->
                <div class="px-10 py-6 flex items-center justify-between border-t border-slate-100 bg-slate-50/50">
                    <div>
                        <p class="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1 opacity-70">Total Debit Note (Riwayat)</p>
                        <p class="text-2xl font-black font-mono tracking-tighter text-blue-600">${formatCurrency(totalAmount)}</p>
                    </div>
                </div>
            </div>
        `;
    }

    const tabsHtml = `
        <div class="flex items-center gap-1 bg-slate-100 p-1.5 rounded-2xl w-fit border border-slate-200/60 shadow-inner overflow-hidden mb-6">
            <button onclick="window._uiState.debitNoteActiveTab='list'; renderFinanceDebitNotes();" 
                class="px-8 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all duration-300 flex items-center gap-2 ${activeTab === 'list' ? 'bg-white text-blue-600 shadow-md scale-100 border border-slate-100' : 'text-slate-400 hover:text-slate-600 hover:bg-white/40 opacity-70'}">
                <i class="fas fa-file-invoice-dollar"></i> Daftar Debit Note
            </button>
            <button onclick="window._uiState.debitNoteActiveTab='history'; renderFinanceDebitNotes();" 
                class="px-8 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all duration-300 flex items-center gap-2 ${activeTab === 'history' ? 'bg-white text-green-600 shadow-md scale-100 border border-slate-100' : 'text-slate-400 hover:text-slate-600 hover:bg-white/40 opacity-70'}">
                <i class="fas fa-history"></i> Riwayat Jurnal
            </button>
        </div>
    `;

    mc.innerHTML = `
        <div class="space-y-6 animate-in fade-in duration-500">
            ${filterBarHtml}
            ${tabsHtml}
            <div class="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">
                TOTAL: ${notes.length} DOKUMEN
            </div>
            ${contentHtml}
        </div>
    `;
};

window.applyDNDateRange = function() {
    window._dnFilters.dateFrom = document.getElementById('dnDateFrom')?.value || '';
    window._dnFilters.dateTo = document.getElementById('dnDateTo')?.value || '';
    window._uiState.dnDatePopoverOpen = false;
    renderFinanceDebitNotes();
};

window.resetDNDateRange = function() {
    window._dnFilters.dateFrom = '';
    window._dnFilters.dateTo = '';
    window._uiState.dnDatePopoverOpen = false;
    renderFinanceDebitNotes();
};

window.updateDNFilters = function() {
    window._dnFilters = {
        supplier: document.getElementById('dnFilterSupplier')?.value || '',
        date: document.getElementById('dnFilterDate')?.value || ''
    };
    renderFinanceDebitNotes();
};

window.openDebitNoteModal = function () {
    const mc = document.getElementById('main-content');
    const suppliers = db.read('suppliers');
    const bankAccounts = db.read('bankAccounts') || [];
    
    mc.innerHTML = `
        <div class="-mx-4 -mt-4 sm:-mx-6 sm:-mt-6 mb-6 bg-white border-b border-slate-200 px-6 py-3 flex items-center justify-end gap-3 sticky top-0 z-10">
            <button onclick="renderFinanceDebitNotes()" class="px-5 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100 rounded-lg transition-all">BATAL</button>
            <button onclick="saveDebitNote()" class="flex items-center gap-2 px-6 py-2 text-sm font-bold bg-blue-600 text-white rounded-xl hover:bg-blue-700 shadow-lg shadow-blue-200 transition-all active:scale-95">
                <span class="w-2 h-2 rounded-full bg-white inline-block"></span> SIMPAN DEBIT NOTE
            </button>
        </div>
        <div class="space-y-6 animate-in fade-in duration-500">
            <div class="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                <div class="px-8 py-4 border-b border-slate-100">
                    <span class="text-[10px] font-black text-blue-600 uppercase tracking-widest">
                        <i class="fas fa-circle text-[6px] mr-1"></i> INFORMASI DEBIT NOTE
                    </span>
                </div>
                <div class="px-8 py-6">
                    <div class="grid grid-cols-1 gap-5">
                        <div class="grid grid-cols-2 gap-5">
                            <div>
                                <label class="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Supplier <span class="text-red-400">*</span></label>
                                <select id="dn_supplier" class="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-semibold text-slate-700 outline-none focus:border-blue-500 focus:bg-white transition-all" onchange="updateDNInvoiceList()">
                                    <option value="">-- Pilih Supplier --</option>
                                    ${suppliers.map(s => `<option value="${s.id}">${s.name}</option>`).join('')}
                                </select>
                            </div>
                            <div>
                                <label class="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Pilih Tagihan (Opsional)</label>
                                <select id="dn_invoice" class="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-semibold text-slate-700 outline-none focus:border-blue-500 focus:bg-white transition-all">
                                    <option value="">-- Pilih Supplier Dahulu --</option>
                                </select>
                            </div>
                        </div>
                        <div class="grid grid-cols-2 gap-5">
                            <div>
                                <label class="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Tanggal <span class="text-red-400">*</span></label>
                                <input type="date" id="dn_date" class="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-semibold text-slate-700 outline-none focus:border-blue-500 focus:bg-white transition-all" value="${new Date().toISOString().split('T')[0]}" required>
                            </div>
                            <div>
                                <label class="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">No. Debit Note <span class="text-red-400">*</span></label>
                                <div class="flex">
                                     <select id="dn_is_tax" onchange="updateDNNumberPreview()" class="border border-slate-200 border-r-0 rounded-l-xl px-4 py-3 bg-slate-50 text-sm font-semibold focus:outline-none focus:ring-0 text-slate-700 transition-all">
                                        <option value="true">TAX</option>
                                        <option value="false">NT</option>
                                     </select>
                                     <input type="text" id="dn_number" value="${generateDebitNoteNumber(true)}" class="w-full bg-slate-50 border border-slate-200 rounded-r-xl px-4 py-3 text-sm font-mono focus:outline-none text-slate-700 focus:border-blue-500 focus:bg-white transition-all" readonly>
                                </div>
                            </div>
                        </div>
                        <div class="grid grid-cols-2 gap-5">
                            <div>
                                <label class="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Jumlah Pemotongan (Amount) <span class="text-red-400">*</span></label>
                                <input type="text" id="dn_amount" oninput="this.value=formatAmountInput(this.value)" class="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold text-green-600 outline-none focus:border-blue-500 focus:bg-white transition-all" placeholder="0">
                            </div>
                            <div>
                                <label class="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Refund Via Rekening Kas/Bank (Opsional)</label>
                                <select id="dn_bank_account_id" class="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-semibold text-slate-700 outline-none focus:border-blue-500 focus:bg-white transition-all">
                                    <option value="">-- Potong Hutang Usaha (Default) --</option>
                                    ${bankAccounts.map(ba => `<option value="${ba.id}">${ba.name} (${ba.bankName || ''} - ${ba.accountNumber || ba.account_number || ''})</option>`).join('')}
                                </select>
                            </div>
                        </div>
                        <div>
                            <label class="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Alasan / Catatan</label>
                            <textarea id="dn_notes" rows="3" class="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-semibold text-slate-700 outline-none focus:border-blue-500 focus:bg-white transition-all resize-none" placeholder="Contoh: Retur bahan baku / Koreksi harga..."></textarea>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;
};

window.updateDNInvoiceList = function () {
    const supplierId = document.getElementById('dn_supplier').value;
    const invSelect = document.getElementById('dn_invoice');
    if (!supplierId) { invSelect.innerHTML = '<option value="">-- Pilih Supplier Dahulu --</option>'; return; }
    const invoices = db.read('purchaseInvoices').filter(i => i.supplierId === supplierId);
    invSelect.innerHTML = '<option value="">-- Tidak Terkait Tagihan Spesifik --</option>' +
        invoices.map(i => `<option value="${i.id}">${i.invNumber || i.invoiceNumber || '-'} (Total: ${formatCurrency(i.totalAmount)})</option>`).join('');
};

window.saveDebitNote = function () {
    const supplierId = document.getElementById('dn_supplier').value;
    const amountVal = document.getElementById('dn_amount').value;
    const amount = parseAmountInput(amountVal) || 0;
    const notes = document.getElementById('dn_notes').value.trim();
    const invoiceId = document.getElementById('dn_invoice').value;
    const dateInput = document.getElementById('dn_date')?.value || new Date().toISOString().split('T')[0];
    const isTax = document.getElementById('dn_is_tax')?.value === 'true';
    const taxType = isTax ? 'A' : 'B';
    const noteNumberStr = document.getElementById('dn_number')?.value;
    const bankAccountId = document.getElementById('dn_bank_account_id')?.value || '';

    if (!supplierId || amount <= 0) { showToast('Mohon pilih supplier dan isi jumlah yang valid.', 'error'); return; }
    
    const isoDate = new Date(dateInput).toISOString();
    const noteNumber = noteNumberStr || ('DN-' + Date.now().toString().slice(-6));
    
    const dn = db.insert('debitNotes', { 
        noteNumber, 
        date: isoDate, 
        supplierId, 
        amount, 
        notes, 
        invoiceId, 
        taxType,
        bank_account_id: bankAccountId,
        bankAccountId: bankAccountId
    });
    
    if (typeof db.addJournalEntry === 'function' && dn) {
        let debitAccount = 'acc_ap'; // Default fallback
        if (bankAccountId) {
            const selectedBank = db.findById('bankAccounts', bankAccountId);
            if (selectedBank && (selectedBank.accountId || selectedBank.account_id)) {
                debitAccount = selectedBank.accountId || selectedBank.account_id;
            }
        }
        
        db.addJournalEntry({
            description: `Debit Note ${noteNumber} - ${notes}`,
            referenceId: dn.id, referenceType: 'DEBIT_NOTE',
            items: [
                { accountId: debitAccount, debit: amount, credit: 0 },
                { accountId: 'acc_purchase_return', debit: 0, credit: amount }
            ]
        });
    }
    showToast('Debit Note berhasil disimpan dan Jurnal dibuat.');
    renderFinanceDebitNotes();
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
                    <p class="text-sm font-black text-slate-800 mb-4">${invoice ? (invoice.invNumber || invoice.invoiceNumber || '-') : 'Umum / Tanpa Invoice'}</p>
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
        if (getBaseType(acc.type) === 'INCOME') return -bal; // Income usually has credit balance
        return bal; // Expenses usually have debit balance
    };

    const incomeAccs = accounts.filter(a => getBaseType(a.type) === 'INCOME');
    const expenseAccs = accounts.filter(a => getBaseType(a.type) === 'EXPENSE');

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

        const baseT = getBaseType(acc.type);
        if (baseT === 'ASSET' || baseT === 'EXPENSE') {
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

window.handleCreditNoteAction = function (action, id) {
    if (action === 'view') {
        viewCreditNote(id);
    }
};

window.handleDebitNoteAction = function (action, id) {
    if (action === 'view') {
        viewDebitNote(id);
    }
};




