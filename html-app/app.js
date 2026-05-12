// app.js - Main Application UI Logic

const CONFIG = {
    companyName: 'PT. Tana Subur Nusantara',
    companyAddress: 'J8WR+3JQ, Jl. Akses Tol Karawang Tim., Anggadita, Kec. Klari, Karawang, Jawa Barat 41371',
    companyPhone: '0267-12345678',
    companyEmail: 'info@tanasubur.co.id',
    currency: 'IDR',
    dateFormat: 'DD/MM/YYYY',
    timezone: 'Asia/Jakarta',
    language: 'id',
    taxRate: 11
};

// --- Shared Global State ---
window.currentFilters = {
    salesOrders: { start: '', end: '' },
    purchaseOrders: { start: '', end: '', supplier: '', category: '' },
    salesInvoices: { start: '', end: '', taxType: '', status: '' },
    supplierPayments: { start: '', end: '', supplier: '', status: '', kategori: '' },
    salesPayments: { start: '', end: '' },
    inventoryPOReceipt: { start: '', end: '', supplier: '', status: '' },
    inventoryDelivery: { start: '', end: '', customer: '', status: '' },
    purchaseReceivingHistory: { start: '', end: '', supplier: '' },
    purchaseReceivingPending: { start: '', end: '', supplier: '' },
    purchaseInvoices: { start: '', end: '', supplier: '', status: '' },
    purchaseRFQs: { start: '', end: '', supplier: '', status: '' },
    salesQuotations: { start: '', end: '', customer: '' },
    salesDeliveryOrders: { start: '', end: '', customer: '' },
    purchaseReports: { start: '', end: '' },
    inventoryShrinkage: { start: '', end: '' }
};

// --- Shared UI State (Accordion/Collapse) ---
window._uiState = {
    soFilterOpen: false,
    siFilterOpen: false,
    spFilterOpen: false,
    qtFilterOpen: false,
    srpFilterOpen: false,
    sretFilterOpen: false,
    sexchFilterOpen: false,
    srelFilterOpen: false, // Sales relations / reports
    doFilterOpen: false,
    poFilterOpen: false,
    piFilterOpen: false,
    prFilterOpen: false, // Purchase reports
    pgrFilterOpen: false, // Purchase GR
    ppFilterOpen: false,  // Purchase payments
    invMFilterOpen: false, // Inventory master
    invDLogFilterOpen: false, // Inventory daily logs
    invJFilterOpen: false, // Inventory judgment
    prodMOFilterOpen: false,
    prodSFilterOpen: false, // Prod stock master
    rfqFilterOpen: false,
    coaFilterOpen: false,
    shrinkFilterOpen: false,
    recFilterOpen: false,
    expFilterOpen: false
};

// --- Navigation History ---
window._navigationHistory = [];
window.pushCurrentToHistory = () => {
    if (window._currentView && (!window._navigationHistory.length || window._navigationHistory[window._navigationHistory.length - 1] !== window._currentView)) {
        window._navigationHistory.push(window._currentView);
    }
};

window.toggleSOFilter = () => { window._uiState.soFilterOpen = !window._uiState.soFilterOpen; renderSalesOrders(); };
window.toggleSIFilter = () => { window._uiState.siFilterOpen = !window._uiState.siFilterOpen; renderSalesInvoices(); };
window.toggleSPFilter = () => { window._uiState.spFilterOpen = !window._uiState.spFilterOpen; renderSalesPayments(); };
window.toggleQTFilter = () => { window._uiState.qtFilterOpen = !window._uiState.qtFilterOpen; renderSalesQuotations(); };
window.toggleInvMasterFilter = () => { window._uiState.invMasterFilterOpen = !window._uiState.invMasterFilterOpen; renderInventoryMaster(); };
window.toggleSRPFilter = () => { window._uiState.srpFilterOpen = !window._uiState.srpFilterOpen; renderSalesReports(); };
window.toggleDOFilter = () => { window._uiState.doFilterOpen = !window._uiState.doFilterOpen; if (window.renderSalesDeliveryOrders) window.renderSalesDeliveryOrders(); };
window.toggleSRETFilter = () => { window._uiState.sretFilterOpen = !window._uiState.sretFilterOpen; if (window.renderSalesReturns) window.renderSalesReturns(); };
window.toggleSEXCHFilter = () => { window._uiState.sexchFilterOpen = !window._uiState.sexchFilterOpen; if (window.renderProductExchanges) window.renderProductExchanges(); };
window.toggleInvJFilter = () => { window._uiState.invJFilterOpen = !window._uiState.invJFilterOpen; if (window.renderInventoryJudgment) window.renderInventoryJudgment(); };
window.toggleProdMOFilter = () => { window._uiState.prodMOFilterOpen = !window._uiState.prodMOFilterOpen; if (window.renderProductionMO) window.renderProductionMO(); };
window.toggleProdSFilter = () => { window._uiState.prodSFilterOpen = !window._uiState.prodSFilterOpen; if (window.renderProductionStockMaster) window.renderProductionStockMaster(); };
window.toggleRFQFilter = () => { window._uiState.rfqFilterOpen = !window._uiState.rfqFilterOpen; if (window.renderPurchaseRFQs) window.renderPurchaseRFQs(); };
window.togglePOFilter = () => { window._uiState.poFilterOpen = !window._uiState.poFilterOpen; if (window.renderPurchaseOrders) window.renderPurchaseOrders(); };
window.togglePIFilter = () => { window._uiState.piFilterOpen = !window._uiState.piFilterOpen; if (window.renderPurchaseInvoices) window.renderPurchaseInvoices(); };
window.toggleCOAFilter = () => { window._uiState.coaFilterOpen = !window._uiState.coaFilterOpen; if (window.renderFinanceAccounts) window.renderFinanceAccounts(); };
window.togglePGRFilter = () => { window._uiState.pgrFilterOpen = !window._uiState.pgrFilterOpen; if (window.renderPurchaseReceiving) window.renderPurchaseReceiving(); };
window.togglePPFilter = () => { window._uiState.ppFilterOpen = !window._uiState.ppFilterOpen; if (window.renderSupplierPayments) window.renderSupplierPayments(); };
window.togglePRFilter = () => { window._uiState.prFilterOpen = !window._uiState.prFilterOpen; if (window.renderPurchaseReports) window.renderPurchaseReports(); };
window.toggleShrinkFilter = () => { window._uiState.shrinkFilterOpen = !window._uiState.shrinkFilterOpen; if (window.renderInventoryShrinkageReport) window.renderInventoryShrinkageReport(); };

window.activeGRTab = 'pending'; // 'pending' or 'history'

window.activeDepartment = null; // Track current active department for sidebar filtering

const BREADCRUMB_MAP = {
    'launcher': [],
    'dashboard': ['Dashboard'],
    'sales-dashboard': ['Penjualan', 'Dashboard'],
    'sales-quotations': ['Penjualan', 'Quotations'],
    'sales-orders': ['Penjualan', 'Sales Orders'],
    'sales-invoices': ['Penjualan', 'Sales Invoices'],
    'sales-delivery-orders': ['Penjualan', 'Delivery Orders'],
    'sales-reports': ['Penjualan', 'Reports'],
    'sales-report-analytics': ['Penjualan', 'Reports', 'Sales Analytics'],
    'sales-region-report': ['Penjualan', 'Reports', 'Sales By Region'],
    'sales-report-address': ['Penjualan', 'Reports', 'Customer Addresses & Contacts'],
    'sales-report-trends': ['Penjualan', 'Reports', 'Sales Invoice Trends'],
    'sales-quotation-trends': ['Penjualan', 'Reports', 'Quotations Trends'],
    'sales-order-trends': ['Penjualan', 'Reports', 'Sales Orders Trends'],
    'sales-customers': ['Penjualan', 'Customers'],
    'sales-returns': ['Penjualan', 'Sales Returns'],
    'product-exchanges': ['Penjualan', 'Product Exchanges'],
    'purchase-dashboard': ['Pembelian', 'Dashboard'],
    'purchase-rfqs': ['Pembelian', 'Request For Quotation'],
    'purchase-orders': ['Pembelian', 'Purchase Orders'],
    'purchase-invoices': ['Pembelian', 'Purchase Invoice'],
    'purchase-receiving': ['Pembelian', 'Purchase Received'],
    'purchase-reports': ['Pembelian', 'Reports'],
    'purchase-report-analytics': ['Pembelian', 'Reports', 'Purchasing Analytics'],
    'master-suppliers': ['Pembelian', 'Reports', 'Supplier Addresses & Contacts'],
    'purchase-report-trends': ['Pembelian', 'Reports', 'Purchase Invoice Trends'],
    'purchase-rfq-trends': ['Pembelian', 'Reports', 'Request For Quotation Trends'],
    'purchase-order-trends': ['Pembelian', 'Reports', 'Purchase Orders Trends'],
    'inventory-dashboard': ['Logistik', 'Dashboard'],
    'inventory-master': ['Logistik', 'Master Items'],
    'inventory-logs': ['Logistik', 'Daily Logs'],
    'inventory-judgment': ['Logistik', 'Judgment'],
    'inventory-incoming-returns': ['Logistik', 'Penerimaan Retur'],
    'inventory-shrinkage': ['Produksi', 'Reports', 'Laporan Penyusutan'],
    'inventory-transfer': ['Logistik', 'Stock Transfer'],
    'production-dashboard': ['Produksi', 'Dashboard'],
    'production-mo': ['Produksi', 'Manufacturing Orders'],
    'production-wip-stock': ['Produksi', 'Reports', 'Mutasi Stock Bulanan'],
    'production-stock': ['Produksi', 'Master', 'Stock Master'],
    'production-bom': ['Produksi', 'Master', 'BOM'],
    'master-machines': ['Produksi', 'Master', 'Machine Master'],
    'production-reports': ['Produksi', 'Reports', 'Production Reports'],
    'finance-dashboard': ['Finance', 'Dashboard'],
    'finance-ar': ['Finance', 'Accounts Receivable'],
    'finance-ap': ['Finance', 'Accounts Payable'],
    'finance-journal': ['Finance', 'General Ledger'],
    'finance-coa': ['Finance', 'Chart of Accounts'],
    'settings-dashboard': ['Pengaturan', 'Overview'],
    'settings-users': ['Pengaturan', 'Users'],
    'settings-roles': ['Pengaturan', 'Roles'],
    'settings-company': ['Pengaturan', 'Company Profile']
};

window.renderBreadcrumb = (pathItems = [], badge = null) => {
    const container = document.getElementById('breadcrumb');
    if (!container) return;

    let html = `<i class="fas fa-home text-slate-400 hover:text-primary cursor-pointer transition-colors text-base" onclick="navigateTo('launcher')" title="Home"></i>`;
    
    if (pathItems.length > 0) {
        pathItems.forEach((item, idx) => {
            html += `<span class="mx-1.5 text-slate-300 font-light text-sm">/</span>`;
            const isLast = idx === pathItems.length - 1;
            if (isLast) {
                html += `<span id="pageTitle" class="text-slate-800 font-bold text-base tracking-tight">${item}</span>`;
            } else {
                html += `<span class="text-slate-500 hover:text-slate-800 transition-colors cursor-default text-base">${item}</span>`;
            }
        });
    } else {
        html += `<span class="mx-1.5 text-slate-300 font-light text-sm">/</span>`;
        html += `<span id="pageTitle" class="text-slate-800 font-bold text-base tracking-tight">Apps</span>`;
    }

    if (badge) {
        html += `<span class="ml-3 px-2 py-0.5 bg-orange-50 text-orange-600 text-[10px] font-bold rounded-full border border-orange-100 uppercase tracking-tighter shadow-sm animate-pulse">${badge}</span>`;
    }

    container.innerHTML = html;
};

// Helper untuk filter tanggal universal
function filterByDateRange(data, filterKey) {
    const filters = window.currentFilters[filterKey];
    if (!filters.start && !filters.end) return data;

    return data.filter(item => {
        const itemDate = new Date(item.date);
        itemDate.setHours(0, 0, 0, 0);

        if (filters.start) {
            const startDate = new Date(filters.start);
            startDate.setHours(0, 0, 0, 0);
            if (itemDate < startDate) return false;
        }

        if (filters.end) {
            const endDate = new Date(filters.end);
            endDate.setHours(23, 59, 59, 999);
            if (itemDate > endDate) return false;
        }

        return true;
    });
}

// --- View Router ---
const views = {
    'launcher': renderLauncher,
    'dashboard': renderDashboard,
    'sales-dashboard': renderSalesDashboard,
    'purchase-dashboard': renderPurchaseDashboard,
    'settings-dashboard': renderSettingsDashboard,
    'master-products': renderMasterProducts,
    'stock-card': renderStockCard,
    // Inventory Module (New)
    'inventory-dashboard': window.renderInventoryDashboard,
    'inventory-master': renderInventoryMaster,
    'inventory-stock-in': renderInventoryStockIn,
    'inventory-stock-out': renderInventoryStockOut,
    'inventory-delivery': window.renderWarehouseDeliveryOrders,  // Focused on WH process (picking/packing/shipping)
    'inventory-production': renderProductionBoard,
    'inventory-shrinkage': window.renderInventoryShrinkageReport,
    'inventory-monthly-report': window.renderMonthlyStockReport,
    'inventory-report': renderInventoryReport,
    'inventory-po-receipt': renderInventoryPOReceipt,
    // Purchase Module
    'master-suppliers': renderMasterSuppliers,
    'purchase-orders': renderPurchaseOrders,
    'purchase-invoices': renderPurchaseInvoices,
    'supplier-payments': renderSupplierPayments,
    'purchase-reports': renderPurchaseReports,
    'purchase-report-analytics': () => window.renderPurchaseAnalytics(),
    'purchase-report-trends': () => window.renderPurchaseInvoiceTrends(),
    'purchase-rfq-trends': () => window.renderPurchaseRFQTrends(),
    'purchase-order-trends': () => window.renderPurchaseOrderTrends(),
    'purchase-receiving': renderPurchaseReceiving,
    'purchase-receiving-history': () => { window.activeGRTab = 'history'; renderPurchaseReceiving(); },
    // Sales Module
    'sales-quotations': renderSalesQuotations,
    'sales-orders': renderSalesOrders,
    'sales-invoices': renderSalesInvoices,
    'sales-payments': renderSalesPayments,
    'sales-reports': renderSalesReports,
    'sales-report-analytics': renderSalesAnalytics,
    'sales-report-address': renderSalesReports,
    'sales-report-trends': renderSalesInvoiceTrends,
    'sales-quotation-trends': () => window.renderSalesQuotationTrends(),
    'sales-order-trends': () => window.renderSalesOrderTrends(),
    'sales-region-report': () => window.renderSalesRegionTrends(),
    'purchase-rfqs': renderPurchaseRFQs,
    'sales-customers': renderCustomerData,
    'sales-returns': () => window.renderSalesReturns(),
    'sales-exchanges': () => window.renderProductExchanges(),
    'sales-return-reports': window.renderSalesReturnReports,
    'sales-delivery-orders': window.renderSalesDeliveryOrders,
    // Production Module (New)
    'production-dashboard': renderProductionBoard,
    'production-bom': window.renderBOMManagement,
    'production-mo': window.renderProductionMO,
    'production-shift-report': () => window.renderProductionShiftReport(),
    'production-wip-stock': window.renderProductionWIPStock,
    'production-reports': window.renderProductionReports,
    'production-stock-master': window.renderProductionStockMaster,
    'master-machines': window.renderMachineMaster,
    // Finance Module (New)
    'finance-dashboard': window.renderFinanceDashboard,
    'finance-accounts': window.renderFinanceAccounts,

    'finance-ar': window.renderFinanceAR,
    'finance-ar-history': window.renderFinanceARHistory,
    'finance-ap': window.renderFinanceAP,
    'finance-ap-history': window.renderFinanceAPHistory,
    'finance-ar-aging': window.renderFinanceARAging,
    'finance-ap-aging': window.renderFinanceAPAging,
    'finance-partner-ledger': window.renderFinancePartnerLedger,
    'finance-expenses': window.renderFinanceExpenses,
    'finance-receipts': window.renderFinanceReceipts,
    'finance-journal': window.renderFinanceJournal,
    'finance-settings': window.renderFinanceSettings,
    'finance-credit-notes': window.renderFinanceCreditNotes,
    'finance-debit-notes': window.renderFinanceDebitNotes,
    'finance-hpp': window.renderFinanceHPP,
    'finance-rugilaba': window.renderFinanceProfitLoss,
    'finance-neracasaldo': window.renderFinanceTrialBalance,
    'inventory-judgment': window.renderInventoryJudgment,
    'inventory-conversion': window.renderInventoryConversion,
    'inventory-incoming-returns': () => window.renderIncomingReturns(),
    // Settings Module
    'settings-users': window.renderSettingsUsers,
    'settings-roles': window.renderSettingsRoles,
    'settings-company': window.renderSettingsCompany,
    'settings-system': window.renderSettingsSystem
};

// --- Access Control Mapping ---
// Maps view IDs to their corresponding permission module
const MODULE_VIEW_MAP = {
    'sales-quotations': 'penjualan', 'purchase-rfqs': 'pembelian', 'sales-orders': 'penjualan', 'sales-invoices': 'penjualan', 'sales-dashboard': 'penjualan', 'sales-dashboard': 'penjualan',
    'sales-payments': 'penjualan', 'sales-reports': 'penjualan', 'sales-customers': 'penjualan',
    'purchase-orders': 'pembelian', 'purchase-invoices': 'pembelian', 'purchase-dashboard': 'pembelian', 'purchase-dashboard': 'pembelian',
    'supplier-payments': 'pembelian', 'purchase-reports': 'pembelian', 'master-suppliers': 'pembelian', 'purchase-receiving': 'pembelian', 'purchase-receiving-history': 'pembelian',
    'master-products': 'logistik', 'stock-card': 'logistik',
    'inventory-dashboard': 'logistik', 'inventory-master': 'logistik', 'inventory-po-receipt': 'logistik', 'inventory-delivery': 'logistik', 'inventory-monthly-report': 'logistik', 'inventory-shrinkage': 'logistik', 'inventory-judgment': 'logistik',
    'inventory-card': 'logistik', 'inventory-shrinkage': 'produksi', 'inventory-monthly-report': 'logistik', 'inventory-conversion': 'logistik',
    'production-dashboard': 'produksi', 'production-bom': 'produksi', 'production-mo': 'produksi', 'production-shift-report': 'produksi', 'production-wip-stock': 'produksi', 'production-reports': 'produksi', 'production-stock-master': 'produksi', 'master-machines': 'produksi',
    'sales-returns': 'penjualan', 'sales-exchanges': 'penjualan', 'sales-return-reports': 'penjualan',
    'inventory-incoming-returns': 'logistik',
    'finance-dashboard': 'finance', 'finance-accounts': 'finance',
    'finance-ar': 'finance',
    'finance-ar-history': 'finance',
    'finance-ar-aging': 'finance',
    'finance-ap-aging': 'finance',
    'finance-partner-ledger': 'finance',
    'finance-ap': 'finance',
    'finance-ap-history': 'finance',
    'finance-receipts': 'finance',
    'finance-expenses': 'finance',
    'finance-journal': 'finance', 'finance-settings': 'finance',
    'finance-credit-notes': 'finance', 'finance-debit-notes': 'finance', 'finance-hpp': 'finance', 'finance-rugilaba': 'finance', 'finance-neracasaldo': 'finance',
    'settings-users': 'pengaturan', 'settings-roles': 'pengaturan', 'settings-company': 'pengaturan',
    'settings-system': 'pengaturan', 'settings-dashboard': 'pengaturan',
    'sales-delivery-orders': 'penjualan',
    'sales-region-report': 'penjualan'
};

// --- Global Auth Helpers ---
window.isCurrentUserAdmin = function () {
    try {
        const sess = JSON.parse(localStorage.getItem('unityerp_session') || '{}');
        // User admin has ID 'user_admin' or role 'role_admin' (case-insensitive)
        const userId = (sess.userId || '').toLowerCase();
        const roleId = (sess.roleId || '').toLowerCase();
        return userId === 'user_admin' || roleId === 'role_admin';
    } catch (e) {
        return false;
    }
};

function getModulePermission(module) {
    try {
        const sess = JSON.parse(localStorage.getItem('unityerp_session') || '{}');
        if (!sess.userId) return { view: false, edit: false };

        const user = db.findById('users', sess.userId);
        if (!user) return { view: false, edit: false };

        const roles = db.read('roles');
        const role = roles.find(r => r.id === user.roleId);
        const isAdmin = user.id === 'user_admin' || (role && role.id === 'role_admin');

        if (isAdmin) return { view: true, edit: true };

        // Per-user permissions override role permissions
        const perms = user.permissions || (role ? role.permissions : {}) || {};
        const p = perms[module] || { view: false, edit: false };
        return { view: !!p.view, edit: !!p.edit };
    } catch (e) {
        return { view: false, edit: false };
    }
}

// --- Sidebar Helper ---
function updateSidebarVisibility() {
    try {
        const sess = JSON.parse(localStorage.getItem('unityerp_session') || '{}');
        const user = db.findById('users', sess.userId);
        if (!user) return;

        const roles = db.read('roles');
        const role = roles.find(r => r.id === user.roleId);
        const isAdmin = user.id === 'user_admin' || role?.id === 'role_admin';

        // Load active department if not set
        if (!window.activeDepartment) {
            window.activeDepartment = localStorage.getItem('unityerp_active_dept');
        }

        // Get effective permissions
        const perms = user.permissions || role?.permissions || {};

        // 1. Hide/Show individual links based on permissions
        document.querySelectorAll('a[data-view]').forEach(link => {
            const viewId = link.dataset.view;
            const module = MODULE_VIEW_MAP[viewId];
            if (module && !isAdmin) {
                if (!perms[module]?.view) {
                    link.classList.add('hidden');
                } else {
                    link.classList.remove('hidden');
                }
            }
        });

        // 2. Tampilkan/Sembunyikan grup navigasi berdasarkan izin & departemen aktif
        document.querySelectorAll('.nav-group-parent').forEach(groupParent => {
            const innerGroup = groupParent.querySelector('[id$="-group"]');
            if (!innerGroup) return;
            const groupName = innerGroup.id.replace('-group', '');

            // Mapping izin
            const moduleMap = {
                'sales': 'penjualan', 'penjualan': 'penjualan',
                'purchase': 'pembelian', 'pembelian': 'pembelian',
                'inventory': 'logistik', 'logistik': 'logistik',
                'production': 'produksi', 'produksi': 'produksi',
                'finance': 'finance',
                'settings': 'pengaturan', 'pengaturan': 'pengaturan',
                'logistik': 'logistik', 'warehouse': 'logistik'
            };

            const module = moduleMap[groupName] || groupName;

            // Logic: Hide if:
            // 1. activeDepartment is null (Launcher)
            // 2. OR activeDepartment doesn't match this group
            // This applies even to Admins to keep the sidebar clean.
            const isDepartmentMatch = window.activeDepartment === groupName ||
                (groupName === 'sales' && window.activeDepartment === 'penjualan') ||
                (groupName === 'penjualan' && window.activeDepartment === 'sales') ||
                (groupName === 'purchase' && window.activeDepartment === 'pembelian') ||
                (groupName === 'pembelian' && window.activeDepartment === 'purchase') ||
                (groupName === 'inventory' && window.activeDepartment === 'logistik') ||
                (groupName === 'logistik' && window.activeDepartment === 'inventory') ||
                (groupName === 'production' && window.activeDepartment === 'produksi') ||
                (groupName === 'produksi' && window.activeDepartment === 'production') ||
                (groupName === 'settings' && window.activeDepartment === 'pengaturan') ||
                (groupName === 'pengaturan' && window.activeDepartment === 'settings');

            // Check if any children are visible (permissions)
            const children = innerGroup.querySelectorAll('a[data-view]');
            const visibleChildren = Array.from(children).filter(c => !c.classList.contains('hidden'));

            // Always hide if no active department (Launcher)
            // If active department, only show the matching group
            if (!window.activeDepartment || !isDepartmentMatch || (visibleChildren.length === 0 && !isAdmin)) {
                groupParent.classList.add('hidden');
            } else {
                groupParent.classList.remove('hidden');
            }
        });

        // 3. Launcher tiles visibility
        const appMapLauncher = {
            'penjualan': 'penjualan',
            'pembelian': 'pembelian',
            'logistik': 'logistik',
            'produksi': 'produksi',
            'finance': 'finance',
            'pengaturan': 'pengaturan'
        };
        document.querySelectorAll('button[onclick^="openApp"]').forEach(btn => {
            const match = btn.getAttribute('onclick').match(/'([^']+)'/);
            if (match && !isAdmin) {
                const appName = match[1];
                const module = appMapLauncher[appName]; // Fixed typo: was appMap
                if (module && !perms[module]?.view) {
                    btn.style.display = 'none'; // Use style.display to be sure it's hidden
                } else {
                    btn.style.display = '';
                }
            }
        });
    } catch (e) { console.error('Sidebar visibility error:', e); }
}
// Helper untuk Print
window.printHTML = (htmlContent, title, forceHideHeader = false) => {
    const printWindow = window.open('', '_blank', 'height=800,width=800');
    if (!printWindow) {
        alert('Mohon izinkan pop-ups untuk mencetak dokumen.');
        return;
    }
    
    // More robust check for internal header, but fallback to force flag
    const hasInternalHeader = forceHideHeader || htmlContent.includes('id="print-internal-header"') || htmlContent.includes("id='print-internal-header'");
    
    printWindow.document.write(`
        <html>
            <head>
                <title>${title}</title>
                <script src="https://cdn.tailwindcss.com"></script>
                <style>
                    body { font-family: 'Inter', sans-serif; padding: 1rem; background: white; color: black; }
                    @media print {
                        @page { margin: 5mm; size: auto; }
                        .no-print { display: none !important; }
                        body { padding: 0; margin: 0; }
                        #print-internal-header { margin: 0 !important; padding: 0 !important; }
                    }
                </style>
            </head>
            <body>
                ${!hasInternalHeader ? `
                <div class="flex justify-between items-start mb-8 pb-4 border-b-2 border-gray-100">
                    <div>
                        <h1 class="text-2xl font-bold uppercase text-gray-800">${title}</h1>
                        <p class="text-xs text-gray-500 mt-1">${CONFIG.companyName}</p>
                    </div>
                    ${CONFIG.logo ? `<img src="${CONFIG.logo}" class="h-16 w-auto object-contain">` : ''}
                </div>` : ''}
                ${htmlContent}
                <div class="mt-4 print:mt-2 pt-2 border-t border-gray-100 text-[10px] text-gray-400 flex justify-between">
                    <span>Dicetak pada: ${new Date().toLocaleString('id-ID')}</span>
                    <span>${CONFIG.companyName} - ERP System</span>
                </div>
                <script>
                    window.onload = () => {
                        setTimeout(() => { window.print(); window.close(); }, 500);
                    };
                </script>
            </body>
        </html>
    `);
    printWindow.document.close();
};

async function navigateTo(viewId, isBack = false) {
    // If a modal is open, close it automatically when navigating to a new page
    if (window._isModalOpen) {
        window._isModalOpen = false;
        document.getElementById('modal-container').innerHTML = '';
    }

    const sidebar = document.getElementById('sidebar');
    const mainContent = document.getElementById('main-content');

    // Track history
    if (!isBack) {
        // Loop protection: if we go back to a view already in history, truncate
        const existingIdx = window._navigationHistory.indexOf(viewId);
        if (existingIdx !== -1) {
            window._navigationHistory = window._navigationHistory.slice(0, existingIdx);
        } else if (window._currentView && window._currentView !== viewId) {
            window._navigationHistory.push(window._currentView);
        }
    }
    window._currentView = viewId;

    // Toggle sidebar visibility for launcher vs inner apps

    // Toggle sidebar visibility for launcher vs inner apps
    if (viewId === 'launcher') {
        window.activeDepartment = null; // Reset filter when in launcher
        localStorage.removeItem('unityerp_active_dept');
        sidebar.classList.add('hidden');
        sidebar.classList.remove('flex', 'md:block');
    } else {
        sidebar.classList.remove('hidden');
        sidebar.classList.add('flex');
    }

    // Update sidebar visibility based on permissions AND active department
    updateSidebarVisibility();

    // Update active nav link
    document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.classList.remove('active', 'text-white', 'bg-blue-600', 'text-primary');
        btn.classList.add('text-slate-600');

        if (btn.dataset.view === viewId) {
            btn.classList.add('active');
            btn.classList.remove('text-slate-600');
            btn.classList.add('text-slate-900');

            // Auto-expand parent group
            const parentGroup = btn.closest('.nav-group');
            if (parentGroup && parentGroup.id.endsWith('-group')) {
                parentGroup.classList.remove('hidden');
                const groupId = parentGroup.id.replace('-group', '');
                const parentBtn = document.querySelector(`button[onclick="toggleNavGroup('${groupId}')"]`);
                if (parentBtn) {
                    parentBtn.setAttribute('aria-expanded', 'true');
                    parentBtn.classList.add('text-slate-900', 'font-semibold');
                }
            }
        }
    });

    // Update Topbar
    // Maintenance Mode Guard
    const isMaintenance = localStorage.getItem('unityerp_maintenance_mode') === 'true';
    const sess = JSON.parse(localStorage.getItem('unityerp_session') || '{}');
    const userInfo = db.findById('users', sess.userId);
    const userRoles = db.read('roles');
    const userRole = userRoles.find(r => r.id === userInfo?.roleId);
    const isAdmin = userInfo?.id === 'user_admin' || userRole?.id === 'role_admin';

    if (isMaintenance && !isAdmin && viewId !== 'launcher') {
        const mainContent = document.getElementById('main-content');
        mainContent.innerHTML = `
            <div class="flex flex-col items-center justify-center h-full text-center py-20 px-4">
                <div class="w-20 h-20 rounded-full bg-orange-50 flex items-center justify-center mb-6 animate-pulse">
                    <i class="fas fa-tools text-orange-400 text-3xl"></i>
                </div>
                <h2 class="text-2xl font-bold text-gray-800 mb-2">Sistem Sedang Dalam Pemeliharaan</h2>
                <p class="text-gray-500 max-w-md mx-auto">
                    Kami sedang melakukan pembaruan rutin untuk meningkatkan layanan. 
                    Sistem akan segera kembali normal dalam beberapa saat.
                </p>
                <button onclick="window.location.reload()" class="mt-8 px-6 py-2 bg-orange-500 text-white rounded-lg font-semibold hover:bg-orange-600 transition-colors shadow-sm">
                    Coba Lagi
                </button>
            </div>
        `;
        return;
    }


    // Access Control Check
    const requiredModule = MODULE_VIEW_MAP[viewId];
    
    // --- DATABASE SYNC ---
    // Sync necessary tables before rendering
    const tableSyncMap = {
        'inventory-master': ['inventoryItems', 'stockTransactions'],
        'sales-customers': ['customers', 'inventoryItems', 'stockTransactions'],
        'sales-quotations': ['salesQuotations', 'customers', 'inventoryItems'],
        'sales-orders': ['salesOrders', 'customers', 'inventoryItems'],
        'sales-invoices': ['salesInvoices', 'customers', 'inventoryItems'],
        'purchase-requests': ['purchaseRequests', 'suppliers', 'inventoryItems'],
        'purchase-rfqs': ['purchaseRFQs', 'suppliers', 'inventoryItems'],
        'purchase-orders': ['purchaseOrders', 'suppliers', 'inventoryItems'],
        'purchase-invoices': ['purchaseInvoices', 'suppliers', 'inventoryItems'],
        'supplier-payments': ['supplierPayments', 'suppliers', 'accounts'],
        'production-dashboard': ['productionOrders', 'stockTransactions', 'inventoryItems'],
        'production-stock-master': ['inventoryItems', 'stockTransactions'],
        'production-bom': ['bomHeaders', 'bomMaterials', 'inventoryItems'],
        'production-mo': ['productionOrders', 'inventoryItems', 'bomHeaders', 'machines'],
        'production-wip-stock': ['inventoryItems', 'stockTransactions'],
        'production-reports': ['productionOrders', 'inventoryItems'],
        'master-machines': ['machines'],
        'finance-accounts': ['accounts'],
        'settings-users': ['users', 'roles'],
        'settings-roles': ['roles'],
        'sales-delivery-orders': ['deliveryOrders', 'salesOrders', 'customers', 'inventoryItems'],
        'sales-region-report': ['salesOrders', 'customers'],
        'sales-report-trends': ['salesInvoices', 'customers', 'inventoryItems'],
        'sales-quotation-trends': ['salesQuotations', 'customers', 'inventoryItems'],
        'sales-order-trends': ['salesOrders', 'customers', 'inventoryItems'],
        'sales-report-analytics': ['salesInvoices', 'salesOrders', 'customers', 'inventoryItems']
    };
    
    const tablesToSync = tableSyncMap[viewId] || [];
    if (tablesToSync.length > 0) {
        // Show loading state if needed, or just sync silently
        for (const table of tablesToSync) {
            await db.sync(table);
        }
    }

    if (requiredModule) {
        try {
            const sess = JSON.parse(localStorage.getItem('unityerp_session') || '{}');
            // Ensure users and roles are synced for permission checks
            await db.sync('users');
            await db.sync('roles');
            
            const user = db.findById('users', sess.userId);
            if (user && user.id !== 'user_admin') {
                const roles = db.read('roles');
                const role = roles.find(r => r.id === user.roleId);
                if (role?.id !== 'role_admin') {
                    // Per-user permissions take priority, fall back to role
                    const perms = user.permissions || role?.permissions || {};
                    if (!perms[requiredModule]?.view) {
                        mainContent.innerHTML = `
                            <div class="flex flex-col items-center justify-center h-64 text-center py-16">
                                <div class="w-16 h-16 rounded-full bg-red-50 flex items-center justify-center mb-4">
                                    <i class="fas fa-lock text-red-400 text-2xl"></i>
                                    </div>
                                <h3 class="text-lg font-semibold text-gray-700 mb-2">Akses Ditolak</h3>
                                <p class="text-sm text-gray-400">Anda tidak memiliki izin untuk mengakses halaman ini.<br>Hubungi Administrator untuk mendapatkan akses.</p>
                            </div>`;
                        return;
                    }
                }
            }
        } catch (e) { /* skip check on error */ }
    }

    // Render the view
    const mainContent2 = document.getElementById('main-content');
    mainContent2.innerHTML = ''; // clear

    // Set Breadcrumb
    const path = BREADCRUMB_MAP[viewId] || [viewId.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase())];
    renderBreadcrumb(path);

    if (views[viewId]) {
        views[viewId]();
    } else {
        mainContent.innerHTML = `<div class="p-8 text-center text-gray-500">View not found</div>`;
    }

    // Update Back Button Visibility & Icon
    const backBtn = document.getElementById('sidebarToggleBtn');
    if (backBtn) {
        if (viewId === 'launcher') {
            backBtn.innerHTML = '<i class="fas fa-bars text-xl"></i>';
            backBtn.title = "Toggle Sidebar";
        } else {
            backBtn.innerHTML = '<i class="fas fa-chevron-left text-xl"></i>';
            backBtn.title = "Go Back";
        }
    }

    // Update sidebar/launcher whenever we navigate to ensure it's in sync
    // MUST be called after render so elements are in DOM
    updateSidebarVisibility();

    // Close mobile menu if open (only on mobile screens)
    if (window.innerWidth < 768 && viewId !== 'launcher') {
        sidebar.classList.remove('translate-x-0');
        sidebar.classList.add('-translate-x-full');
    }
}

// Enterprise Nav Toggle
// Enterprise Nav Toggle
function toggleNavGroup(groupId) {
    // Logic removed as per "langsung gini aja" request
    // Groups are now always visible if they match the active department
}


function renderLauncher() {
    document.getElementById('pageTitle').innerText = 'Select Department';
    const mainContent = document.getElementById('main-content');

    mainContent.innerHTML = `
        <div class="h-full w-full flex flex-col items-center justify-center p-4 sm:p-8">
            <h2 class="text-3xl font-bold text-gray-800 mb-8 text-center">Tana Subur <span class="text-blue-600">Nusantara</span></h2>
            <div class="max-w-4xl mx-auto grid grid-cols-3 md:grid-cols-5 gap-4 w-full">
                <!-- Penjualan -->
                <button onclick="openApp('penjualan')" class="group flex flex-col items-center justify-center p-5 bg-white rounded-2xl shadow-sm hover:shadow-lg transition-all duration-300 border border-gray-100 transform hover:-translate-y-1">
                    <div class="w-12 h-12 flex items-center justify-center rounded-xl bg-gradient-to-br from-blue-400 to-blue-600 text-white mb-3 shadow-md group-hover:scale-110 transition-transform">
                        <i class="fas fa-file-invoice-dollar text-lg"></i>
                    </div>
                    <span class="font-semibold text-gray-700 text-sm group-hover:text-blue-600 transition-colors">Sales</span>
                </button>

                <!-- Pembelian -->
                <button onclick="openApp('pembelian')" class="group flex flex-col items-center justify-center p-5 bg-white rounded-2xl shadow-sm hover:shadow-lg transition-all duration-300 border border-gray-100 transform hover:-translate-y-1">
                    <div class="w-12 h-12 flex items-center justify-center rounded-xl bg-gradient-to-br from-indigo-400 to-indigo-600 text-white mb-3 shadow-md group-hover:scale-110 transition-transform">
                        <i class="fas fa-shopping-cart text-lg"></i>
                    </div>
                    <span class="font-semibold text-gray-700 text-sm group-hover:text-indigo-600 transition-colors">Purchasing</span>
                </button>

                <!-- Persediaan -->
                <button onclick="openApp('logistik')" class="relative group flex flex-col items-center justify-center p-5 bg-white rounded-2xl shadow-sm hover:shadow-lg transition-all duration-300 border border-gray-100 transform hover:-translate-y-1">
                    ${(() => { try { const items = db.read('inventoryItems') || []; const lowCount = items.filter(i => (db.getInventoryStock(i.id) || 0) < (i.minStock || 0)).length; return lowCount > 0 ? `<span class="absolute top-2 right-2 bg-red-500 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full">${formatNumber(lowCount)}</span>` : ''; } catch (e) { return ''; } })()}
                    <div class="w-12 h-12 flex items-center justify-center rounded-xl bg-gradient-to-br from-sky-400 to-sky-600 text-white mb-3 shadow-md group-hover:scale-110 transition-transform">
                        <i class="fas fa-boxes text-lg"></i>
                    </div>
                    <span class="font-semibold text-gray-700 text-sm group-hover:text-sky-600 transition-colors">Inventory</span>
                </button>

                <!-- Produksi -->
                <button onclick="openApp('produksi')" class="group flex flex-col items-center justify-center p-5 bg-white rounded-2xl shadow-sm hover:shadow-lg transition-all duration-300 border border-gray-100 transform hover:-translate-y-1">
                    <div class="w-12 h-12 flex items-center justify-center rounded-xl bg-gradient-to-br from-slate-400 to-slate-600 text-white mb-3 shadow-md group-hover:scale-110 transition-transform">
                        <i class="fas fa-industry text-lg"></i>
                    </div>
                    <span class="font-semibold text-gray-700 text-sm group-hover:text-slate-600 transition-colors">Manufacturing</span>
                </button>

                <!-- Finance -->
                <button onclick="openApp('finance')" class="group flex flex-col items-center justify-center p-5 bg-white rounded-2xl shadow-sm hover:shadow-lg transition-all duration-300 border border-gray-100 transform hover:-translate-y-1">
                    <div class="w-12 h-12 flex items-center justify-center rounded-xl bg-gradient-to-br from-orange-400 to-orange-600 text-white mb-3 shadow-md group-hover:scale-110 transition-transform">
                        <i class="fas fa-money-bill-wave text-lg"></i>
                    </div>
                    <span class="font-semibold text-gray-700 text-sm group-hover:text-orange-600 transition-colors">Finance</span>
                </button>

                <!-- Pengaturan -->
                <button onclick="openApp('pengaturan')" class="group flex flex-col items-center justify-center p-5 bg-white rounded-2xl shadow-sm hover:shadow-lg transition-all duration-300 border border-gray-100 transform hover:-translate-y-1">
                    <div class="w-12 h-12 flex items-center justify-center rounded-xl bg-gradient-to-br from-gray-400 to-gray-600 text-white mb-3 shadow-md group-hover:scale-110 transition-transform">
                        <i class="fas fa-cog text-lg"></i>
                    </div>
                    <span class="font-semibold text-gray-700 text-sm group-hover:text-gray-600 transition-colors">Settings</span>
                </button>
            </div>
            
            <!-- Launcher Footer Credit -->
            <div class="mt-20">
                <p class="text-xs font-bold uppercase tracking-[0.3em] text-slate-400">Powered By Unity<span class="text-blue-600">ERP</span></p>
            </div>
        </div>
    `;
}

window.openApp = (appName) => {
    window.activeDepartment = appName;
    localStorage.setItem('unityerp_active_dept', appName);

    // Expand the correct group in sidebar
    const groups = document.querySelectorAll('.nav-group');
    groups.forEach(group => {
        if (group.id === appName + '-group') {
            group.classList.remove('hidden');
        } else {
            group.classList.add('hidden');
        }
    });

    // Default routes per app
    if (appName === 'penjualan') navigateTo('sales-dashboard');
    else if (appName === 'pembelian') navigateTo('purchase-dashboard');
    else if (appName === 'logistik') navigateTo('inventory-dashboard');
    else if (appName === 'produksi') navigateTo('production-dashboard');
    else if (appName === 'finance') navigateTo('finance-dashboard');
    else if (appName === 'pengaturan') navigateTo('settings-dashboard');
};

// --- Modals ---
function showModal(title, bodyHtml, footerHtml, size = 'md') {
    const modalContainer = document.getElementById('modal-container');
    const sizeClasses = {
        'sm': 'max-w-md',
        'md': 'max-w-2xl',
        'lg': 'max-w-4xl',
        'xl': 'max-w-6xl',
        'full': 'max-w-none w-screen h-screen rounded-none m-0 pt-0'
    };
    const sizeClass = sizeClasses[size] || sizeClasses['md'];

    // Track modal state
    window._isModalOpen = true;
    
    // Save current breadcrumb to restore later
    const pageTitleEl = document.getElementById('pageTitle');
    window._previousBreadcrumbTitle = pageTitleEl ? pageTitleEl.innerText : '';
    
    // Update breadcrumb to show modal title
    const currentPath = BREADCRUMB_MAP[window._currentView] || [];
    renderBreadcrumb([...currentPath, title]);

    modalContainer.innerHTML = `
        <div class="fixed inset-0 top-16 bg-slate-900/40 backdrop-blur-[2px] flex items-center justify-center z-[150] ${size === 'xl' ? '' : 'p-4 sm:p-6'} animate-fade-in" id="modal-backdrop">
        <div class="bg-white shadow-2xl w-full ${sizeClass} flex flex-col ${size === 'xl' ? 'h-full border-0' : 'rounded-2xl max-h-[calc(100vh-120px)] border border-slate-200'} animate-slide-up overflow-hidden">
            <div class="flex justify-between items-center p-4 sm:px-6 sm:py-5 border-b border-gray-100 shrink-0">
                <h3 class="text-xl font-bold text-gray-800 tracking-tight flex items-center gap-3">
                    <span class="w-2 h-8 bg-blue-600 rounded-full"></span>
                    ${title}
                </h3>
                <button class="w-10 h-10 flex items-center justify-center rounded-full text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-all" onclick="closeModal()">
                    <i class="fas fa-times text-lg"></i>
                </button>
            </div>
            <div class="p-4 sm:p-8 overflow-y-auto flex-1 bg-white">
                ${bodyHtml}
            </div>
            <div class="px-4 py-4 sm:px-8 sm:flex sm:flex-row-reverse bg-slate-50 border-t border-slate-100 shrink-0 gap-3">
                ${footerHtml}
            </div>
        </div>
        </div>
        `;
}

function closeModal() {
    window._isModalOpen = false;
    document.getElementById('modal-container').innerHTML = '';
    
    // Restore breadcrumb
    if (window._currentView) {
        const path = BREADCRUMB_MAP[window._currentView] || [window._currentView.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase())];
        renderBreadcrumb(path);
    }
}

// --- Toasts (Notifications) ---
function showToast(message, type = 'success') {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    const bgColor = type === 'success' ? 'bg-green-50 border-green-200' : (type === 'info' ? 'bg-blue-50 border-blue-200' : 'bg-red-50 border-red-200');
    const textColor = type === 'success' ? 'text-green-800' : (type === 'info' ? 'text-blue-800' : 'text-red-800');
    const icon = type === 'success' ? 'fa-check-circle text-green-500' : (type === 'info' ? 'fa-info-circle text-blue-500' : 'fa-exclamation-circle text-red-500');

    toast.className = `flex items-center w-full max-w-xs p-4 mb-4 text-gray-500 ${bgColor} border rounded-lg shadow animate-slide-left`;
    toast.innerHTML = `
        <div class="inline-flex items-center justify-center flex-shrink-0 w-8 h-8 rounded-lg">
            <i class="fas ${icon}"></i>
        </div>
        <div class="ml-3 text-sm font-normal ${textColor}">${message}</div>
        <button type="button" class="ml-auto -mx-1.5 -my-1.5 bg-transparent text-gray-400 hover:text-gray-900 rounded-lg p-1.5 inline-flex h-8 w-8 transition-colors" onclick="this.parentElement.remove()">
            <span class="sr-only">Close</span>
            <i class="fas fa-times"></i>
        </button>
    `;
    container.appendChild(toast);
    setTimeout(() => toast.remove(), 4000);
}

// --- Formatting Helpers ---
window.formatCurrency = (amount) => {
    const num = parseFloat(amount) || 0;
    // Format with Indonesian locale: dots as thousand separator, comma as decimal
    const formatted = new Intl.NumberFormat('id-ID', {
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
    }).format(Math.round(num));
    return `Rp ${formatted}`;
};

// Format plain numbers with thousand separator dots (e.g. 1000 â†’ 1.000)
window.formatNumber = (num, decimals = 0) => {
    const n = parseFloat(num) || 0;
    return new Intl.NumberFormat('id-ID', {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals
    }).format(n);
};

window.formatDate = (isoString) => {
    if (!isoString) return '-';
    const date = new Date(isoString);
    const locale = CONFIG.language === 'en' ? 'en-US' : 'id-ID';

    // Simplistic mapping for common formats
    const options = { hour: '2-digit', minute: '2-digit' };
    if (CONFIG.dateFormat === 'YYYY-MM-DD') {
        const y = date.getFullYear();
        const m = String(date.getMonth() + 1).padStart(2, '0');
        const d = String(date.getDate()).padStart(2, '0');
        return `${y}-${m}-${d} ${date.toLocaleTimeString(locale, options)}`;
    } else if (CONFIG.dateFormat === 'MM/DD/YYYY') {
        return date.toLocaleDateString('en-US') + ' ' + date.toLocaleTimeString(locale, options);
    } else {
        // Default DD/MM/YYYY
        return date.toLocaleDateString('id-ID', { day: '2-digit', month: '2-digit', year: 'numeric' }) + ' ' + date.toLocaleTimeString(locale, options);
    }
};

// --- View Renderers (Placeholders) ---

// ------------------- SALES DASHBOARD --------------------------
// Global Dashboard Filter State
window.dashFilters = {
    period: 'Monthly',
    fiscalYear: new Date().getFullYear(),
    groupBy: 'item',
    includeClosed: false
};

window.poDashFilters = {
    period: 'Monthly',
    fiscalYear: new Date().getFullYear(),
    groupBy: 'item',
    supplier: '',
    includeCancelled: false
};

function renderSalesDashboard() {
    document.getElementById('pageTitle').innerText = 'Dashboard Penjualan';
    const mc = document.getElementById('main-content');
    
    let orders = db.read('salesOrders') || [];
    const customers = db.read('customers') || [];
    const invoices = db.read('salesInvoices') || [];
    
    const filters = window.dashFilters;
    const currentYear = filters.fiscalYear;
    
    // Apply Global Filter (Fiscal Year, Status & Company)
    let filteredOrders = orders.filter(o => {
        const d = new Date(o.date || o.createdAt);
        const yearMatch = d.getFullYear() === currentYear;
        const statusMatch = filters.includeClosed ? true : (o.status !== 'CANCELLED' && o.status !== 'COMPLETED' && o.status !== 'VOID');
        
        let companyMatch = true;
        if (filters.company) {
            const customer = customers.find(c => c.id === o.customerId);
            companyMatch = customer && customer.name.toLowerCase().includes(filters.company.toLowerCase());
        }
        
        return yearMatch && statusMatch && companyMatch;
    });

    // Filter Invoices as well
    let filteredInvoices = (invoices || []).filter(i => {
        if (!filters.company) return true;
        const cust = (customers || []).find(c => c.id === i.customerId);
        return cust && cust.name.toLowerCase().includes(filters.company.toLowerCase());
    });

    // Calculate Stats based on filtered data
    const annualSales = filteredOrders.reduce((sum, o) => sum + parseFloat(o.totalAmount || 0), 0);
    const soToDeliver = filteredOrders.filter(o => o.status === 'CONFIRMED').length;
    const soToBill = filteredInvoices.filter(i => i.status === 'UNPAID').length;
    const activeCustomers = filters.company ? (filteredOrders.length > 0 ? 1 : 0) : (customers || []).length;

    // Add Demo Data Trigger for empty state
    if (orders.length === 0) {
        mc.innerHTML = `
            <div class="flex flex-col items-center justify-center h-[60vh] text-center space-y-6 animate-fade-in">
                <div class="w-24 h-24 bg-blue-50 rounded-full flex items-center justify-center text-blue-500 shadow-inner">
                    <i class="fas fa-chart-line text-4xl"></i>
                </div>
                <div>
                    <h2 class="text-2xl font-bold text-gray-800">Dashboard Masih Kosong</h2>
                    <p class="text-gray-500 max-w-md mx-auto mt-2">Belum ada transaksi Sales Order yang tercatat. Anda bisa membuat SO baru atau gunakan tombol di bawah untuk mengisi data sampel demi keperluan demo.</p>
                </div>
                <div class="flex gap-4">
                    <button onclick="navigateTo('sales-orders')" class="px-6 py-2.5 bg-white border border-gray-200 text-gray-700 rounded-xl font-bold hover:bg-gray-50 transition-all">Buat Sales Order</button>
                    <button onclick="generateSampleSalesData()" class="px-6 py-2.5 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 shadow-lg shadow-blue-500/30 transition-all flex items-center gap-2">
                        <i class="fas fa-magic"></i> Isi Data Demo
                    </button>
                </div>
            </div>
        `;
        return;
    }

    const frappeCard = (title, value) => `
        <div class="bg-white rounded-xl border border-gray-100 p-5 flex flex-col justify-between shadow-[0_2px_10px_-3px_rgba(6,81,237,0.05)] h-[104px]">
            <div class="flex justify-between items-start mb-2">
                <span class="text-sm font-medium text-gray-500 hover:text-gray-700 cursor-pointer">${title}</span>
                <span class="text-gray-300 hover:text-gray-500 cursor-pointer text-lg leading-none">...</span>
            </div>
            <div class="text-[26px] font-semibold text-gray-800 tracking-tight leading-none">${value}</div>
        </div>`;

    const chartPanel = (title, id, heightClass = 'h-64', extraBody = '') => `
        <div class="bg-white rounded-xl border border-gray-100 shadow-[0_2px_10px_-3px_rgba(6,81,237,0.05)] p-5 flex flex-col">
            <div class="flex justify-between items-center mb-6">
                <h3 class="text-[15px] font-semibold text-gray-800">${title}</h3>
                <div class="flex gap-2">
                    <button onclick="openDashboardFilter('${title}')" class="w-7 h-7 rounded bg-gray-50 text-gray-400 hover:bg-gray-100 flex items-center justify-center transition-colors"><i class="fas fa-filter text-[10px]"></i></button>
                    <button onclick="openDashboardOptions('${title}')" class="w-7 h-7 rounded bg-gray-50 text-gray-400 hover:bg-gray-100 flex items-center justify-center transition-colors"><span class="leading-none pb-2 font-bold">...</span></button>
                </div>
            </div>
            ${id ? `<div class="relative w-full ${heightClass} flex-1"><canvas id="${id}"></canvas></div>` : ``}
            ${extraBody}
        </div>`;

    const noDataPanel = (title) => chartPanel(title, null, '', '<div class="bg-[#f8f9fa] flex items-center justify-center w-full h-48 rounded-lg"><span class="text-sm text-gray-400">No Data</span></div>');

    mc.innerHTML = `
        <div class="max-w-full mx-auto space-y-4 animate-fade-in pb-12 font-sans pt-2">
            <!-- KPI Grid -->
            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                ${frappeCard('Annual Sales', formatCurrency(annualSales))}
                ${frappeCard('Sales Orders to Deliver', soToDeliver)}
                ${frappeCard('Sales Orders to Bill', soToBill)}
                ${frappeCard('Active Customers', activeCustomers)}
            </div>

            <!-- Chart 1 -->
            ${chartPanel('Sales Order Trends', 'chartSOTrends', 'h-[320px]')}

            <!-- Chart Row 2 -->
            <div class="grid grid-cols-1 lg:grid-cols-2 gap-4">
                ${chartPanel('Top Customers', 'chartTopCustomers', 'h-[250px]')}
                ${noDataPanel('Sales Order Analysis')}
            </div>
        </div>
    `;

    // Ensure the DOM is updated before drawing
    requestAnimationFrame(() => {
        setTimeout(() => {
            if(window.initSalesCharts) window.initSalesCharts(filteredOrders, customers);
        }, 120);
    });
}

window.openDashboardFilter = (title) => {
    const isDetailed = title === 'Sales Order Trends' || title === 'Top Customers';
    const isAnalysis = title === 'Sales Order Analysis' || title === 'Sales Order Analyst';
    const filters = window.dashFilters;
    
    let body = '';
    
    if (isDetailed) {
        body = `
            <div class="space-y-4 font-sans text-gray-700">
                <div>
                    <label class="block text-sm font-medium text-gray-600 mb-1">Period</label>
                    <select id="dash_filter_period" class="w-full bg-gray-50 border border-gray-100 rounded-lg px-4 py-2 text-sm appearance-none cursor-pointer">
                        <option ${filters.period === 'Daily' ? 'selected' : ''}>Daily</option>
                        <option ${filters.period === 'Weekly' ? 'selected' : ''}>Weekly</option>
                        <option ${filters.period === 'Monthly' ? 'selected' : ''}>Monthly</option>
                        <option ${filters.period === 'Quarterly' ? 'selected' : ''}>Quarterly</option>
                        <option ${filters.period === 'Yearly' ? 'selected' : ''}>Yearly</option>
                    </select>
                </div>
                <div>
                    <label class="block text-sm font-medium text-gray-600 mb-1">Based On</label>
                    <div class="w-full bg-gray-50 border border-gray-100 rounded-lg px-4 py-2 text-sm text-gray-400">Item</div>
                </div>
                <div>
                    <label class="block text-sm font-medium text-gray-600 mb-1">Group By</label>
                    <select id="dash_filter_groupby" class="w-full bg-gray-50 border border-gray-100 rounded-lg px-4 py-2 text-sm text-gray-800 appearance-none cursor-pointer">
                        <option value="item" ${filters.groupBy === 'item' ? 'selected' : ''}>Item</option>
                        <option value="customer" ${filters.groupBy === 'customer' ? 'selected' : ''}>Customer</option>
                    </select>
                </div>
                <div>
                    <label class="block text-sm font-medium text-gray-600 mb-1">Fiscal Year</label>
                    <input type="number" id="dash_filter_fy" value="${filters.fiscalYear}" class="w-full bg-gray-50 border border-gray-100 rounded-lg px-4 py-2 text-sm text-gray-800">
                </div>
                <div>
                    <label class="block text-sm font-medium text-gray-600 mb-1">Company</label>
                    <input type="text" id="dash_filter_company" value="${filters.company || ''}" placeholder="Masukkan nama perusahaan..." class="w-full bg-gray-50 border border-gray-100 rounded-lg px-4 py-2 text-sm text-gray-800">
                </div>
                <div class="flex items-center gap-2 pt-2">
                    <input type="checkbox" id="include_closed" ${filters.includeClosed ? 'checked' : ''} class="w-4 h-4 rounded border-gray-300 text-black focus:ring-black">
                    <label for="include_closed" class="text-sm font-medium text-gray-600">Include Closed Orders</label>
                </div>
            </div>
        `;
    } else if (isAnalysis) {
        body = `
            <div class="space-y-4 font-sans text-gray-700">
                <div>
                    <label class="block text-sm font-medium text-gray-600 mb-1">Company</label>
                    <div class="relative">
                        <input type="text" id="dash_filter_company" value="${filters.company || ''}" placeholder="Cari nama perusahaan..." class="w-full bg-gray-50 border border-gray-100 rounded-lg px-4 py-2 text-sm text-gray-800">
                        <span class="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"><i class="fas fa-search text-[10px]"></i></span>
                    </div>
                </div>
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label class="block text-sm font-medium text-gray-600 mb-1">From Date <span class="text-red-400">*</span></label>
                        <input type="date" value="2026-03-16" class="w-full bg-gray-50 border border-gray-100 rounded-lg px-4 py-2 text-sm text-gray-800">
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-gray-600 mb-1">To Date <span class="text-red-400">*</span></label>
                        <input type="date" value="2026-04-16" class="w-full bg-gray-50 border border-gray-100 rounded-lg px-4 py-2 text-sm text-gray-800">
                    </div>
                </div>
                <div>
                    <label class="block text-sm font-medium text-gray-600 mb-1">Sales Order</label>
                    <input type="text" placeholder="Sales Order" class="w-full bg-gray-50 border border-gray-100 rounded-lg px-4 py-2 text-sm text-gray-800 placeholder-gray-300">
                </div>
                <div>
                    <label class="block text-sm font-medium text-gray-600 mb-1">Warehouse</label>
                    <input type="text" placeholder="Warehouse" class="w-full bg-gray-50 border border-gray-100 rounded-lg px-4 py-2 text-sm text-gray-800 placeholder-gray-300">
                </div>
                <div>
                    <label class="block text-sm font-medium text-gray-600 mb-1">Status</label>
                    <div class="w-full bg-gray-50 border border-gray-100 rounded-lg px-4 py-2 text-sm text-gray-400">2 values selected</div>
                </div>
                <div class="flex items-center gap-2 pt-2">
                    <input type="checkbox" id="group_by_so" class="w-4 h-4 rounded border-gray-300 text-black focus:ring-black">
                    <label for="group_by_so" class="text-sm font-medium text-gray-600">Group by Sales Order</label>
                </div>
            </div>
        `;
    } else {
        body = `
            <div class="space-y-4 font-sans text-gray-700">
                <div>
                    <label class="block text-sm font-medium text-gray-600 mb-1">Company</label>
                    <input type="text" id="dash_filter_company" value="${filters.company || ''}" placeholder="Masukkan nama perusahaan..." class="w-full bg-gray-50 border border-gray-100 rounded-lg px-4 py-2 text-sm text-gray-800">
                </div>
                <div>
                    <label class="block text-sm font-medium text-gray-600 mb-1">From Date</label>
                    <input type="date" value="2026-03-16" class="w-full bg-gray-50 border border-gray-100 rounded-lg px-4 py-2 text-sm text-gray-800">
                </div>
            </div>
        `;
    }

    const footer = `
        <div class="w-full flex justify-end">
            <button onclick="applyDashboardFilters()" class="bg-black text-white px-6 py-1.5 rounded-lg text-sm font-bold shadow-sm hover:opacity-90 transition-all active:scale-95">Set</button>
        </div>
    `;
    
    showModal(`Set Filters for ${title}`, body, footer, 'md');
};

window.applyDashboardFilters = () => {
    // Collect values if fields exist in current modal
    const period = document.getElementById('dash_filter_period')?.value;
    const fy = document.getElementById('dash_filter_fy')?.value;
    const gb = document.getElementById('dash_filter_groupby')?.value;
    const closed = document.getElementById('include_closed')?.checked;
    const company = document.getElementById('dash_filter_company')?.value;
    
    // Update global filter state only if elements were found
    if (period !== undefined) window.dashFilters.period = period;
    if (fy !== undefined) window.dashFilters.fiscalYear = parseInt(fy) || window.dashFilters.fiscalYear;
    if (gb !== undefined) window.dashFilters.groupBy = gb;
    if (closed !== undefined) window.dashFilters.includeClosed = closed;
    if (company !== undefined) window.dashFilters.company = company;
    
    showToast('Dashboard Filters Updated', 'success');
    closeModal();
    renderSalesDashboard();
};

// ── Purchase Dashboard Filter ─────────────────────────────────────────────
window.openPurchaseDashboardFilter = (title) => {
    const f = window.poDashFilters;
    const suppliers = db.read('suppliers') || [];
    const supOpts = suppliers.map(s => `<option value="${s.name}" ${f.supplier === s.name ? 'selected' : ''}>${s.name}</option>`).join('');

    const body = `
        <div class="space-y-4 font-sans text-gray-700">
            <div>
                <label class="block text-sm font-medium text-gray-600 mb-1">Period</label>
                <select id="po_filter_period" class="w-full bg-gray-50 border border-gray-100 rounded-lg px-4 py-2 text-sm appearance-none cursor-pointer">
                    <option ${f.period === 'Daily'     ? 'selected' : ''}>Daily</option>
                    <option ${f.period === 'Weekly'    ? 'selected' : ''}>Weekly</option>
                    <option ${f.period === 'Monthly'   ? 'selected' : ''}>Monthly</option>
                    <option ${f.period === 'Quarterly' ? 'selected' : ''}>Quarterly</option>
                    <option ${f.period === 'Yearly'    ? 'selected' : ''}>Yearly</option>
                </select>
            </div>
            <div>
                <label class="block text-sm font-medium text-gray-600 mb-1">Based On</label>
                <div class="w-full bg-gray-50 border border-gray-100 rounded-lg px-4 py-2 text-sm text-gray-400">Item</div>
            </div>
            <div>
                <label class="block text-sm font-medium text-gray-600 mb-1">Group By</label>
                <select id="po_filter_groupby" class="w-full bg-gray-50 border border-gray-100 rounded-lg px-4 py-2 text-sm text-gray-800 appearance-none cursor-pointer">
                    <option value="item"     ${f.groupBy === 'item'     ? 'selected' : ''}>Item</option>
                    <option value="supplier" ${f.groupBy === 'supplier' ? 'selected' : ''}>Supplier</option>
                </select>
            </div>
            <div>
                <label class="block text-sm font-medium text-gray-600 mb-1">Fiscal Year</label>
                <input type="number" id="po_filter_fy" value="${f.fiscalYear}" class="w-full bg-gray-50 border border-gray-100 rounded-lg px-4 py-2 text-sm text-gray-800">
            </div>
            <div>
                <label class="block text-sm font-medium text-gray-600 mb-1">Supplier</label>
                <select id="po_filter_supplier" class="w-full bg-gray-50 border border-gray-100 rounded-lg px-4 py-2 text-sm text-gray-800 appearance-none cursor-pointer">
                    <option value="">-- All Suppliers --</option>
                    ${supOpts}
                </select>
            </div>
            <div class="flex items-center gap-2 pt-2">
                <input type="checkbox" id="po_include_cancelled" ${f.includeCancelled ? 'checked' : ''} class="w-4 h-4 rounded border-gray-300 text-black focus:ring-black">
                <label for="po_include_cancelled" class="text-sm font-medium text-gray-600">Include Cancelled Orders</label>
            </div>
        </div>
    `;

    const footer = `
        <div class="w-full flex justify-end">
            <button onclick="applyPurchaseDashboardFilters()" class="bg-black text-white px-6 py-1.5 rounded-lg text-sm font-bold shadow-sm hover:opacity-90 transition-all active:scale-95">Set</button>
        </div>
    `;

    showModal(`Set Filters for ${title}`, body, footer, 'md');
};

window.applyPurchaseDashboardFilters = () => {
    const period    = document.getElementById('po_filter_period')?.value;
    const fy        = document.getElementById('po_filter_fy')?.value;
    const gb        = document.getElementById('po_filter_groupby')?.value;
    const supplier  = document.getElementById('po_filter_supplier')?.value;
    const cancelled = document.getElementById('po_include_cancelled')?.checked;

    if (period    !== undefined) window.poDashFilters.period           = period;
    if (fy        !== undefined) window.poDashFilters.fiscalYear       = parseInt(fy) || window.poDashFilters.fiscalYear;
    if (gb        !== undefined) window.poDashFilters.groupBy          = gb;
    if (supplier  !== undefined) window.poDashFilters.supplier         = supplier;
    if (cancelled !== undefined) window.poDashFilters.includeCancelled = cancelled;

    showToast('Filter updated', 'success');
    closeModal();
    renderPurchaseDashboard();
};

window.openDashboardOptions = (title) => {
    const body = `
        <div class="space-y-3">
            <button onclick="closeModal(); exportDashboardToExcel();" class="w-full flex items-center gap-4 p-4 hover:bg-slate-50 rounded-xl text-left transition-all border border-transparent hover:border-slate-100 group">
                <div class="w-10 h-10 rounded-lg bg-green-50 flex items-center justify-center text-green-600 group-hover:scale-110 transition-transform">
                    <i class="fas fa-file-excel text-lg"></i>
                </div>
                <div>
                    <p class="text-sm font-bold text-gray-800">Export to Excel</p>
                    <p class="text-[11px] text-gray-500">Download data mentah format .xlsx</p>
                </div>
            </button>
            <button onclick="closeModal(); setTimeout(exportDashboardToPDF, 300);" class="w-full flex items-center gap-4 p-4 hover:bg-slate-50 rounded-xl text-left transition-all border border-transparent hover:border-slate-100 group">
                <div class="w-10 h-10 rounded-lg bg-red-50 flex items-center justify-center text-red-600 group-hover:scale-110 transition-transform">
                    <i class="fas fa-file-pdf text-lg"></i>
                </div>
                <div>
                    <p class="text-sm font-bold text-gray-800">Export to PDF</p>
                    <p class="text-[11px] text-gray-500">Download ringkasan grafik format .pdf</p>
                </div>
            </button>
            <button onclick="closeModal(); setTimeout(() => window.print(), 300);" class="w-full flex items-center gap-4 p-4 hover:bg-slate-50 rounded-xl text-left transition-all border border-transparent hover:border-slate-100 group">
                <div class="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center text-gray-600 group-hover:scale-110 transition-transform">
                    <i class="fas fa-print text-lg"></i>
                </div>
                <div>
                    <p class="text-sm font-bold text-gray-800">Print Report</p>
                    <p class="text-[11px] text-gray-500">Cetak tampilan dashboard ini</p>
                </div>
            </button>
        </div>
    `;
    showModal('Opsi Dashboard', body, '', 'sm');
};

window.exportDashboardToExcel = () => {
    showToast('Menyiapkan file Excel...', 'info');
    const orders = db.read('salesOrders') || [];
    if (orders.length === 0) {
        showToast('Tidak ada data untuk diexport', 'error');
        return;
    }

    const customers = db.read('customers') || [];
    
    // Create CSV content
    let csv = "Nomor SO,Pelanggan,Tanggal,Total Amount,Status,Item,Jumlah,Harga,Subtotal\n";
    
    orders.forEach(o => {
        const cust = customers.find(c => c.id === o.customerId)?.name || '-';
        const date = o.date || o.createdAt || '-';
        const total = o.totalAmount || 0;
        const status = o.status || '-';
        
        if (o.items && o.items.length > 0) {
            o.items.forEach(item => {
                csv += `"${o.soNumber}","${cust}","${date}",${total},"${status}","${item.itemName}",${item.qty},${item.price},${item.subtotal}\n`;
            });
        } else {
            csv += `"${o.soNumber}","${cust}","${date}",${total},"${status}","-",0,0,0\n`;
        }
    });

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `sales_orders_export_${new Date().toISOString().split('T')[0]}.csv`);
    link.click();
    showToast('Download file Excel dimulai', 'success');
};

window.exportDashboardToPDF = () => {
    showToast('Mencetak dashboard ke PDF...', 'success');
    window.print();
};

window.generateSampleSalesData = () => {
    showToast('Menyiapkan data demo...', 'info');
    
    // Ensure we have at least 1 customer and 1 product
    let custs = db.read('customers');
    if (custs.length === 0) {
        db.insert('customers', { name: 'Toko Demo Utama', phone: '0812345678', address: 'Jakarta' });
        custs = db.read('customers');
    }
    
    let prods = db.read('inventoryItems').filter(x => x.category === 'FINISHED_GOODS');
    if (prods.length === 0) {
        db.insert('inventoryItems', { itemCode: 'DEMO-01', itemName: 'Produk Demo A', category: 'FINISHED_GOODS', unit: 'PCS', basePrice: 50000 });
        prods = db.read('inventoryItems').filter(x => x.category === 'FINISHED_GOODS');
    }

    const curYear = new Date().getFullYear();
    for (let m = 0; m < 6; m++) {
        db.insert('salesOrders', {
            soNumber: `SO-${curYear}-00${m+1}`,
            customerId: custs[0].id,
            date: new Date(curYear, m, 15).toISOString(),
            totalAmount: 2000000 + (Math.random() * 3000000),
            status: 'CONFIRMED',
            items: [{ itemId: prods[0].id, itemName: prods[0].itemName, qty: 20, price: prods[0].basePrice || 50000, subtotal: 1000000 }]
        });
    }
    
    db.insert('salesInvoices', {
        invNumber: `INV-${curYear}-Demo`,
        customerId: custs[0].id,
        date: new Date().toISOString(),
        totalAmount: 5000000,
        status: 'UNPAID'
    });

    showToast('Data demo berhasil dibuat!', 'success');
    renderSalesDashboard();
};

window.initSalesCharts = function(orders, customers) {
    if (typeof Chart === 'undefined') {
        console.warn('Chart.js not loaded yet');
        return;
    }

    const filters = window.dashFilters;
    const currentYear = filters.fiscalYear;
    
    // Helper to destroy existing charts if any (to prevent multiple instances on canvas re-render)
    const chartIds = ['chartSOTrends', 'chartTopCustomers'];
    chartIds.forEach(id => {
        const existing = Chart.getChart(id);
        if (existing) existing.destroy();
    });

    // 1. Sales Order Trends (Responds to Period)
    const ctxTrends = document.getElementById('chartSOTrends');
    if (ctxTrends) {
        let labels = [];
        let data = [];
        
        if (filters.period === 'Quarterly') {
            labels = ['Q1', 'Q2', 'Q3', 'Q4'];
            data = [0, 0, 0, 0];
            (orders || []).forEach(o => {
                const dStr = o.date || o.createdAt;
                if(!dStr) return;
                const m = new Date(dStr).getMonth();
                const q = Math.floor(m / 3);
                data[q]++;
            });
        } else if (filters.period === 'Weekly') {
            labels = ['Week 1', 'Week 2', 'Week 3', 'Week 4'];
            data = [0, 0, 0, 0];
            (orders || []).forEach(o => {
                const dStr = o.date || o.createdAt;
                if(!dStr) return;
                const d = new Date(dStr).getDate();
                const w = Math.min(3, Math.floor((d - 1) / 7));
                data[w]++;
            });
        } else {
            // Default Monthly
            labels = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
            data = new Array(12).fill(0);
            (orders || []).forEach(o => {
                const dStr = o.date || o.createdAt;
                if(!dStr) return;
                const m = new Date(dStr).getMonth();
                data[m]++;
            });
        }
        
        new Chart(ctxTrends, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Sales Orders',
                    data: data,
                    borderColor: '#f9a8d4',
                    borderWidth: 2,
                    tension: 0.1,
                    pointBackgroundColor: '#f9a8d4',
                    pointRadius: data.some(v => v > 0) ? 3 : 0,
                    fill: false
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { display: false } },
                scales: {
                    y: { 
                        beginAtZero: true, 
                        grid: { color: '#f3f4f6', drawBorder: false }, 
                        ticks: { stepSize: 1, color: '#9ca3af', font: {size: 11} },
                        border: {display: false}
                    },
                    x: { 
                        grid: { display: false, drawBorder: false }, 
                        ticks: { color: '#9ca3af', font: {size: 11} },
                        border: {display: false}
                    }
                }
            }
        });
    }

    // 2. Top Customers
    const ctxTop = document.getElementById('chartTopCustomers');
    if (ctxTop) {
        const custTotals = {};
        (orders || []).forEach(o => {
            custTotals[o.customerId] = (custTotals[o.customerId] || 0) + parseFloat(o.totalAmount || 0);
        });
        const sortedCust = Object.entries(custTotals).sort((a,b) => b[1] - a[1]).slice(0,5);
        const labels = sortedCust.map(x => {
            const c = (customers || []).find(c => c.id === x[0]);
            return c ? c.name.slice(0, 15) : 'Unknown';
        });
        const data = sortedCust.map(x => x[1]);

        if (data.length === 0) {
            const parent = ctxTop.parentElement;
            parent.innerHTML = '<div class="bg-[#f8f9fa] flex items-center justify-center w-full h-full rounded-lg"><span class="text-sm text-gray-400">No Data</span></div>';
        } else {
            new Chart(ctxTop, {
                type: 'bar',
                data: {
                    labels: labels,
                    datasets: [{
                        data: data,
                        backgroundColor: '#818cf8',
                        borderRadius: 4,
                        barThickness: 20
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    indexAxis: 'y',
                    plugins: { legend: { display: false } },
                    scales: {
                        x: { display: false, grid: {display: false} },
                        y: { grid: {display: false}, border: {display: false}, ticks: { color: '#6b7280', font: {size: 11} } }
                    }
                }
            });
        }
    }
}

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ PURCHASE DASHBOARD â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function renderPurchaseDashboard() {
    document.getElementById('pageTitle').innerText = 'Dashboard Pembelian';
    const mc = document.getElementById('main-content');

    const pos        = db.read('purchaseOrders')  || [];
    const invs       = db.read('purchaseInvoices') || [];
    const suppliers  = db.read('suppliers')        || [];
    const currentYear = new Date().getFullYear();

    // ── KPI ──────────────────────────────────────────────────────
    const annualPurchase  = pos
        .filter(p => p.status !== 'CANCELLED' && new Date(p.date || p.createdAt).getFullYear() === currentYear)
        .reduce((sum, p) => sum + parseFloat(p.totalAmount || 0), 0);
    const poToReceive     = pos.filter(p => ['APPROVED', 'PENDING'].includes(p.status)).length;
    const poToBill        = invs.filter(i => i.status === 'UNPAID').length;
    const activeSuppliers = suppliers.length;

    // ── Card / Panel templates (mirrors Sales Dashboard style) ────
    const frappeCard = (title, value) => `
        <div class="bg-white rounded-xl border border-gray-100 p-5 flex flex-col justify-between shadow-[0_2px_10px_-3px_rgba(6,81,237,0.05)] h-[104px]">
            <div class="flex justify-between items-start mb-2">
                <span class="text-sm font-medium text-gray-500 hover:text-gray-700 cursor-pointer">${title}</span>
                <span class="text-gray-300 hover:text-gray-500 cursor-pointer text-lg leading-none">...</span>
            </div>
            <div class="text-[26px] font-semibold text-gray-800 tracking-tight leading-none">${value}</div>
        </div>`;

    const chartPanel = (title, id, heightClass = 'h-64', extraBody = '', metaLine = '') => `
        <div class="bg-white rounded-xl border border-gray-100 shadow-[0_2px_10px_-3px_rgba(6,81,237,0.05)] p-5 flex flex-col">
            <div class="flex justify-between items-center mb-1">
                <h3 class="text-[15px] font-semibold text-gray-800">${title}</h3>
                <div class="flex gap-2">
                    <button onclick="openPurchaseDashboardFilter('${title}')" class="w-7 h-7 rounded bg-gray-50 text-gray-400 hover:bg-gray-100 flex items-center justify-center transition-colors"><i class="fas fa-filter text-[10px]"></i></button>
                    <button class="w-7 h-7 rounded bg-gray-50 text-gray-400 hover:bg-gray-100 flex items-center justify-center transition-colors"><span class="leading-none pb-2 font-bold">...</span></button>
                </div>
            </div>
            ${metaLine ? `<div class="text-[11px] text-blue-500 mb-4">${metaLine}</div>` : '<div class="mb-4"></div>'}
            ${id ? `<div class="relative w-full ${heightClass} flex-1"><canvas id="${id}"></canvas></div>` : ''}
            ${extraBody}
        </div>`;

    const noDataPanel = (title, meta = '') => chartPanel(
        title, null, '',
        '<div class="bg-[#f8f9fa] flex items-center justify-center w-full h-48 rounded-lg"><span class="text-sm text-gray-400">No Data</span></div>',
        meta
    );

    // ── Top Suppliers data ────────────────────────────────────────
    const poFiltersEarly = window.poDashFilters;
    const supTotals = {};
    pos.forEach(p => {
        if (!p.supplierId) return;                    // skip POs with no supplier
        if (p.status === 'CANCELLED' && !poFiltersEarly.includeCancelled) return;
        const d = new Date(p.date || p.createdAt || Date.now());
        if (d.getFullYear() !== (poFiltersEarly.fiscalYear || currentYear)) return;
        // Apply supplier filter if set
        if (poFiltersEarly.supplier) {
            const s = suppliers.find(x => x.id === p.supplierId) || suppliers.find(x => x.name === p.supplierId);
            const nm = s ? s.name : String(p.supplierId);
            if (!nm.toLowerCase().includes(poFiltersEarly.supplier.toLowerCase())) return;
        }
        supTotals[p.supplierId] = (supTotals[p.supplierId] || 0) + parseFloat(p.totalAmount || 0);
    });
    const sortedSuppliers = Object.entries(supTotals)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5);


    mc.innerHTML = `
        <div class="max-w-full mx-auto space-y-4 animate-fade-in pb-12 font-sans pt-2">

            <!-- KPI Grid -->
            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                ${frappeCard('Annual Purchase', formatCurrency(annualPurchase))}
                ${frappeCard('Purchase Orders to Receive', poToReceive)}
                ${frappeCard('Purchase Orders to Bill', poToBill)}
                ${frappeCard('Active Suppliers', activeSuppliers)}
            </div>

            <!-- Purchase Order Trends -->
            ${chartPanel('Purchase Order Trends', 'chartPOTrends', 'h-[320px]')}

            <!-- Top Suppliers chart + PO Analysis -->
            <div class="grid grid-cols-1 lg:grid-cols-2 gap-4">
                ${chartPanel('Top Suppliers', 'chartTopSuppliers', 'h-[250px]')}
                ${noDataPanel('Purchase Order Analysis')}
            </div>
        </div>
    `;

    // ── Draw Charts ───────────────────────────────────────────────
    const poFilters = poFiltersEarly;   // alias (already set above)
    setTimeout(() => {
        if (typeof Chart === 'undefined') return;

        // Destroy existing instances
        ['chartPOTrends', 'chartTopSuppliers'].forEach(id => {
            const ex = Chart.getChart(id);
            if (ex) ex.destroy();
        });

        // 1. PO Trends line chart
        const ctxTrends = document.getElementById('chartPOTrends');
        if (ctxTrends) {
            // Apply filters
            const fyYear = poFilters.fiscalYear || currentYear;
            let filtered = pos.filter(p => {
                if (!poFilters.includeCancelled && p.status === 'CANCELLED') return false;
                const d = new Date(p.date || p.createdAt || Date.now());
                if (d.getFullYear() !== fyYear) return false;
                if (poFilters.supplier) {
                    const sid = p.supplierId || '';
                    const sup = suppliers.find(x => x.id === sid) || suppliers.find(x => x.name === sid);
                    const supName = sup ? sup.name : sid;
                    if (!supName.toLowerCase().includes(poFilters.supplier.toLowerCase())) return false;
                }
                return true;
            });

            let labels, data;
            if (poFilters.period === 'Quarterly') {
                labels = ['Q1', 'Q2', 'Q3', 'Q4'];
                data = [0, 0, 0, 0];
                filtered.forEach(p => { const m = new Date(p.date || p.createdAt).getMonth(); data[Math.floor(m/3)]++; });
            } else if (poFilters.period === 'Weekly') {
                labels = ['Week 1', 'Week 2', 'Week 3', 'Week 4'];
                data = [0, 0, 0, 0];
                filtered.forEach(p => { const day = new Date(p.date || p.createdAt).getDate(); data[Math.min(3, Math.floor((day-1)/7))]++; });
            } else {
                labels = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
                data = new Array(12).fill(0);
                filtered.forEach(p => { const m = new Date(p.date || p.createdAt || Date.now()).getMonth(); data[m]++; });
            }

            new Chart(ctxTrends, {
                type: 'line',
                data: {
                    labels,
                    datasets: [{
                        label: 'Purchase Orders',
                        data,
                        borderColor: '#f9a8d4',
                        borderWidth: 2,
                        tension: 0.1,
                        pointBackgroundColor: '#f9a8d4',
                        pointRadius: data.some(v => v > 0) ? 3 : 0,
                        fill: false
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: { legend: { display: false } },
                    scales: {
                        y: {
                            beginAtZero: true,
                            grid: { color: '#f3f4f6', drawBorder: false },
                            ticks: { stepSize: 1, color: '#9ca3af', font: { size: 11 } },
                            border: { display: false }
                        },
                        x: {
                            grid: { display: false, drawBorder: false },
                            ticks: { color: '#9ca3af', font: { size: 11 } },
                            border: { display: false }
                        }
                    }
                }
            });
        }

        // 2. Top Suppliers horizontal bar chart
        const ctxTop = document.getElementById('chartTopSuppliers');
        if (ctxTop) {
            if (sortedSuppliers.length === 0) {
                const parent = ctxTop.parentElement;
                parent.innerHTML = '<div class="bg-[#f8f9fa] flex items-center justify-center w-full h-full rounded-lg"><span class="text-sm text-gray-400">No Data</span></div>';
            } else {
                const labels = sortedSuppliers.map(([sid]) => {
                    const s = suppliers.find(x => x.id === sid) || suppliers.find(x => x.name === sid);
                    return s ? s.name.slice(0, 18) : (sid ? String(sid).slice(0, 18) : 'Unknown');
                });
                const data = sortedSuppliers.map(([, total]) => total);

                new Chart(ctxTop, {
                    type: 'bar',
                    data: {
                        labels,
                        datasets: [{
                            data,
                            backgroundColor: '#818cf8',
                            borderRadius: 4,
                            barThickness: 20
                        }]
                    },
                    options: {
                        responsive: true,
                        maintainAspectRatio: false,
                        indexAxis: 'y',
                        plugins: { legend: { display: false } },
                        scales: {
                            x: { display: false, grid: { display: false } },
                            y: {
                                grid: { display: false },
                                border: { display: false },
                                ticks: { color: '#6b7280', font: { size: 11 } }
                            }
                        }
                    }
                });
            }
        }
    }, 100);
}


// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ SETTINGS DASHBOARD â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function renderSettingsDashboard() {
    document.getElementById('pageTitle').innerText = 'Dashboard Pengaturan';
    const mc = document.getElementById('main-content');

    const users = db.read('users') || [];
    const roles = db.read('roles') || [];
    const config = db.read('company_config') || {};

    mc.innerHTML = `
        <div class="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div onclick="navigateTo('settings-users')" class="bg-white p-6 rounded-xl border border-gray-100 shadow-sm cursor-pointer hover:border-blue-500 transition-all">
                <p class="text-xs font-bold text-gray-400 uppercase tracking-widest">User Aktif</p>
                <p class="text-3xl font-black text-blue-600 mt-1">${users.length}</p>
                <p class="text-xs text-blue-400 mt-2">Klik untuk manajemen user</p>
            </div>
            <div onclick="navigateTo('settings-roles')" class="bg-white p-6 rounded-xl border border-gray-100 shadow-sm cursor-pointer hover:border-purple-500 transition-all">
                <p class="text-xs font-bold text-gray-400 uppercase tracking-widest">Total Hak Akses (Roles)</p>
                <p class="text-3xl font-black text-purple-600 mt-1">${roles.length}</p>
                <p class="text-xs text-purple-400 mt-2">Klik untuk atur izin modul</p>
            </div>
            <div onclick="navigateTo('settings-company')" class="bg-white p-6 rounded-xl border border-gray-100 shadow-sm cursor-pointer hover:border-green-500 transition-all">
                <p class="text-xs font-bold text-gray-400 uppercase tracking-widest">Pruduktivitas Profil</p>
                <div class="flex items-center gap-2 mt-1">
                    <span class="text-3xl font-black text-green-600">${config.companyName ? 'OK' : 'EMPTY'}</span>
                    ${config.companyName ? '<i class="fas fa-check-circle text-green-500"></i>' : '<i class="fas fa-exclamation-circle text-orange-500"></i>'}
                </div>
                <p class="text-xs text-green-400 mt-2">Klik untuk edit data perusahaan</p>
            </div>
        </div>

        <div class="bg-blue-50 border border-blue-100 rounded-xl p-6">
            <h3 class="text-blue-800 font-bold mb-2 flex items-center gap-2"><i class="fas fa-info-circle"></i> Tips Pengaturan</h3>
            <p class="text-sm text-blue-700 leading-relaxed">Pastikan Profil Perusahaan (NPWP, Alamat, dan Telepon) sudah diisi dengan benar agar muncul di semua dokumen cetak Penawaran, PO, dan Invoice. Jangan lupa untuk berkala mengganti password User demi keamanan data.</p>
        </div>
    `;
}

function renderDashboard() {
    document.getElementById('pageTitle').innerText = 'Dashboard Overview';
    const mainContent = document.getElementById('main-content');

    // Calculate Summary
    const products = db.read('products');
    const po = db.read('purchaseOrders').filter(p => p.status === 'RECEIVED');
    const so = db.read('salesOrders').filter(s => s.status === 'DELIVERED');
    const prod = db.read('productionOrders').filter(p => p.status === 'COMPLETED');

    // Filter for current month
    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();

    const isCurrentMonth = (dateStr) => {
        if (!dateStr) return false;
        const d = new Date(dateStr);
        return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
    };

    const monthlyPo = po.filter(p => isCurrentMonth(p.date));
    const monthlySo = so.filter(s => isCurrentMonth(s.date));
    const monthlyProd = prod.filter(p => isCurrentMonth(p.completedAt || p.date));

    const totalPoThisMonth = monthlyPo.reduce((sum, p) => sum + (parseFloat(p.totalAmount) || 0), 0);
    const totalSoThisMonth = monthlySo.reduce((sum, s) => sum + (parseFloat(s.totalAmount) || 0), 0);

    // Calculate total stock value (Simple assumption: avg PO price * stock)-For MVP using fixed estimation
    // Usually requires actual costing method (FIFO/Average).
    let estimatedStockValue = 0;
    products.forEach(p => {
        estimatedStockValue += (db.getCurrentStock(p.id) * 50000); // 50k simple dummy valuation per item
    });

    mainContent.innerHTML = `
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-6">
            <!-- Card 1 -- >
            <div class="bg-white rounded-lg shadow-sm p-5 border border-gray-100 flex items-center">
                <div class="p-3 rounded-full bg-blue-100 text-blue-600 mr-4">
                    <i class="fas fa-boxes text-xl"></i>
                </div>
                <div>
                    <p class="text-sm text-gray-500 font-medium">Estimasi Nilai Stok</p>
                    <p class="text-xl font-bold text-gray-800">${formatCurrency(estimatedStockValue)}</p>
                </div>
            </div>

            <!-- Card 2 -- >
            <div class="bg-white rounded-lg shadow-sm p-5 border border-gray-100 flex items-center">
                <div class="p-3 rounded-full bg-red-100 text-red-600 mr-4">
                    <i class="fas fa-shopping-cart text-xl"></i>
                </div>
                <div>
                    <p class="text-sm text-gray-500 font-medium">Pembelian (+Bulan Ini)</p>
                    <p class="text-xl font-bold text-gray-800">${formatCurrency(totalPoThisMonth)}</p>
                </div>
            </div>

            <!-- Card 3 -- >
            <div class="bg-white rounded-lg shadow-sm p-5 border border-gray-100 flex items-center">
                <div class="p-3 rounded-full bg-green-100 text-green-600 mr-4">
                    <i class="fas fa-file-invoice-dollar text-xl"></i>
                </div>
                <div>
                    <p class="text-sm text-gray-500 font-medium">Penjualan (+Bulan Ini)</p>
                    <p class="text-xl font-bold text-gray-800">${formatCurrency(totalSoThisMonth)}</p>
                </div>
            </div>

            <!-- Card 4 -- >
        <div class="bg-white rounded-lg shadow-sm p-5 border border-gray-100 flex items-center">
            <div class="p-3 rounded-full bg-orange-100 text-orange-600 mr-4">
                <i class="fas fa-industry text-xl"></i>
            </div>
            <div>
                <p class="text-sm text-gray-500 font-medium">Produksi (+Bulan Ini)</p>
                <p class="text-xl font-bold text-gray-800">${monthlyProd.length} Batch Selesai</p>
            </div>
        </div>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <div class="bg-white rounded-lg shadow-sm border border-gray-100 p-6">
                <h3 class="text-lg font-semibold text-gray-800 mb-4 border-b pb-2"><i class="fas fa-chart-bar text-blue-500 mr-2"></i>Perbandingan Pembelian vs Penjualan</h3>

                <div class="mt-6">
                    <div class="flex justify-between text-sm mb-1">
                        <span class="text-gray-600">Total Pembelian (PO)</span>
                        <span class="font-bold text-red-600">${formatCurrency(totalPoThisMonth)}</span>
                    </div>
                    <div class="w-full bg-gray-200 rounded-full h-4 mb-4 mt-2">
                        <div class="bg-red-500 h-4 rounded-full" style="width: ${Math.min(100, (totalPoThisMonth / (totalPoThisMonth + totalSoThisMonth + 1)) * 100)}%"></div>
                    </div>

                    <div class="flex justify-between text-sm mb-1 mt-6">
                        <span class="text-gray-600">Total Penjualan (SO)</span>
                        <span class="font-bold text-green-600">${formatCurrency(totalSoThisMonth)}</span>
                    </div>
                    <div class="w-full bg-gray-200 rounded-full h-4 mt-2">
                        <div class="bg-green-500 h-4 rounded-full" style="width: ${Math.min(100, (totalSoThisMonth / (totalPoThisMonth + totalSoThisMonth + 1)) * 100)}%"></div>
                    </div>
                </div>
            </div>

            <div class="bg-white rounded-lg shadow-sm border border-gray-100 p-6">
                <h3 class="text-lg font-semibold text-gray-800 mb-4 border-b pb-2"><i class="fas fa-exclamation-triangle text-orange-500 mr-2"></i>Peringatan Stok Minimum</h3>
                <div class="overflow-y-auto max-h-56 pr-2 custom-scrollbar">
                    <ul class="space-y-3">
                        ${products.filter(p => db.getCurrentStock(p.id) < p.minStock).map(p => `
                            <li class="flex justify-between items-center p-3 bg-red-50 border border-red-100 rounded-md">
                                <div>
                                    <p class="font-medium text-red-800 text-sm">${p.name}</p>
                                    <p class="text-xs text-red-600">Min: ${formatNumber(p.minStock)} ${p.unit}</p>
                                </div>
                                <div class="text-right">
                                    <span class="px-2 py-1 bg-red-600 text-white rounded text-xs font-bold w-full inline-block text-center mt-1">Sisa: ${db.getCurrentStock(p.id)}</span>
                                </div>
                            </li>
                        `).join('') || '<li class="text-sm text-gray-500 p-4 text-center">Semua stok dalam keadaan aman.</li>'}
                    </ul>
        </div>
    `;
}

// --- Master Customers Module ---
function renderCustomerData() {
    const canEdit = getModulePermission('penjualan').edit;
    renderBreadcrumb(['Sales', 'Reports', 'Customer Addresses & Contacts']);
    document.getElementById('pageTitle').innerText = 'Customer Addresses & Contacts';
    const mainContent = document.getElementById('main-content');

    const customers = db.read('customers') || [];

    mainContent.innerHTML = `
        <div id="cust-list-view" class="space-y-4 animate-in fade-in duration-300">
            <!-- Structured Filter Bar -->
            <div class="bg-white rounded-xl shadow-sm border border-slate-100 p-5">
                <div class="flex flex-wrap items-center gap-4">
                    <!-- Search Input -->
                    <div class="flex-1 min-w-[250px] relative group">
                        <i class="fas fa-search absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-blue-500 transition-colors"></i>
                        <input type="text" id="cust_search" onkeyup="filterCustomerList()" placeholder="Search Name, Phone, Email..." 
                            class="w-full pl-12 pr-4 py-2.5 bg-slate-50 border border-transparent rounded-xl text-sm font-semibold text-slate-700 placeholder:text-slate-300 focus:bg-white focus:border-blue-300 focus:ring-4 focus:ring-blue-500/5 outline-none transition-all shadow-sm">
                    </div>

                    <!-- Region Filter -->
                    <div class="min-w-[160px]">
                        <select id="cust_filter_region" onchange="filterCustomerList()" 
                            class="w-full px-4 py-2.5 bg-slate-50 border border-transparent rounded-xl text-sm font-semibold text-slate-700 focus:bg-white focus:border-blue-300 outline-none transition-all cursor-pointer shadow-sm">
                            <option value="">All Regions</option>
                            ${[...new Set(customers.filter(c => c && c.region).map(c => c.region))].map(r => `<option value="${r}">${r}</option>`).join('')}
                        </select>
                    </div>

                    <!-- Actions -->
                    <div class="flex gap-3 ml-auto">
                        ${canEdit ? `
                        <button onclick="openCustomerModal()" class="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl transition-all text-sm font-bold shadow-lg shadow-blue-500/20 flex items-center gap-2 active:scale-95">
                            <i class="fas fa-plus"></i> New Customer
                        </button>
                        ` : ''}
                        <button onclick="exportCustomerCsv()" class="bg-white border border-slate-200 text-slate-600 px-5 py-2.5 rounded-xl hover:bg-slate-50 transition-all text-sm font-bold shadow-sm active:scale-95">
                            <i class="fas fa-download mr-2"></i> Export
                        </button>
                    </div>
                </div>
            </div>

            <!-- Customer Table Card -->
            <div class="bg-white rounded-xl shadow-sm border border-slate-100 overflow-visible">
                <div class="overflow-visible">
                    <table class="w-full text-left" id="customer_table">
                        <thead class="bg-slate-50/50 border-b border-slate-100">
                            <tr>
                                <th class="py-4 px-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Customer Information</th>
                                <th class="py-4 px-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Contact Details</th>
                                <th class="py-4 px-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Location</th>
                                <th class="py-4 px-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Shipping Address</th>
                                <th class="py-4 px-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody id="customer_table_body" class="divide-y divide-slate-50">
                            ${renderCustomerRows(customers)}
                        </tbody>
                    </table>
                </div>
                <div id="customer_empty_state" class="${customers.length === 0 ? '' : 'hidden'} py-20 flex flex-col items-center justify-center text-center">
                    <div class="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center text-slate-300 mb-4 text-2xl">
                        <i class="fas fa-users"></i>
                    </div>
                    <p class="text-sm font-medium text-slate-500">No customers found matching your filters.</p>
                </div>
            </div>
        </div>
        <div id="cust-form-view" class="hidden animate-in fade-in slide-in-from-bottom-4 duration-500"></div>
    `;
}

function renderCustomerRows(customers) {
    const canEdit = getModulePermission('penjualan').edit;
    if (customers.length === 0) return '';
    
    return customers.filter(c => c && c.name).map(c => `
        <tr class="hover:bg-slate-50/80 transition-colors group">
            <td class="py-4 px-5">
                <div class="flex items-center gap-3">
                    <div class="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center text-xs font-bold shrink-0">
                        ${(c.name || '??').substring(0,2).toUpperCase()}
                    </div>
                    <div>
                        <div class="text-sm font-bold text-slate-800">${c.name}</div>
                        <div class="text-[11px] text-slate-400 font-medium">${c.id}</div>
                    </div>
                </div>
            </td>
            <td class="py-4 px-5">
                <div class="text-sm text-slate-700 font-medium">${c.contactPerson || '-'}</div>
                <div class="text-[12px] text-slate-500">${c.email || '-'}</div>
                <div class="text-[12px] text-slate-500">${c.phone || '-'}</div>
            </td>
            <td class="py-4 px-5">
                <div class="text-sm text-slate-700 font-semibold">${c.region || '-'}</div>
                <div class="text-xs text-slate-500">${c.city || ''}</div>
            </td>
            <td class="py-4 px-5">
                <div class="text-xs text-slate-600 max-w-[200px] line-clamp-2">${c.shippingAddress || c.address || '-'}</div>
            </td>
            <td class="py-4 px-5 text-right">
                <div class="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onclick="viewCustomerHistory('${c.id}')" class="w-8 h-8 rounded-lg bg-slate-100 text-slate-500 hover:bg-indigo-50 hover:text-indigo-600 transition-all" title="History"><i class="fas fa-history text-xs"></i></button>
                    ${canEdit ? `
                    <button onclick="openCustomerModal('${c.id}')" class="w-8 h-8 rounded-lg bg-slate-100 text-slate-500 hover:bg-blue-50 hover:text-blue-600 transition-all" title="Edit"><i class="fas fa-edit text-xs"></i></button>
                    <button onclick="deleteCustomer('${c.id}')" class="w-8 h-8 rounded-lg bg-slate-100 text-slate-500 hover:bg-red-50 hover:text-red-600 transition-all" title="Delete"><i class="fas fa-trash text-xs"></i></button>
                    ` : ''}
                </div>
            </td>
        </tr>
    `).join('');
}

window.filterCustomerList = () => {
    const search = document.getElementById('cust_search')?.value.toLowerCase() || '';
    const region = document.getElementById('cust_filter_region')?.value || '';
    const customers = db.read('customers') || [];
    
    const filtered = customers.filter(c => {
        const matchesSearch = !search || 
            c.name.toLowerCase().includes(search) || 
            (c.phone || '').includes(search) || 
            (c.email || '').toLowerCase().includes(search) ||
            (c.contactPerson || '').toLowerCase().includes(search);
        
        const matchesRegion = !region || c.region === region;
        
        return matchesSearch && matchesRegion;
    });

    const tbody = document.getElementById('customer_table_body');
    const emptyState = document.getElementById('customer_empty_state');
    
    if (filtered.length === 0) {
        tbody.innerHTML = '';
        emptyState.classList.remove('hidden');
    } else {
        tbody.innerHTML = renderCustomerRows(filtered);
        emptyState.classList.add('hidden');
    }
};

window.exportCustomerCsv = () => {
    const customers = db.read('customers') || [];
    let csv = 'ID,Name,Contact Person,Phone,Email,Region,City,Address\n';
    customers.forEach(c => {
        csv += `"${c.id}","${c.name}","${c.contactPerson}","${c.phone}","${c.email}","${c.region}","${c.city}","${(c.address||'').replace(/\n/g,' ')}"\n`;
    });
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'customer_list.csv';
    a.click();
};

window.openCustomerModal = async (id = null, afterView = null) => {
    window._afterCustomerSave = afterView;
    let customer = { name: '', phone: '', email: '', address: '', contactPerson: '', region: '', city: '', paymentTerm: '', ppn: 11, shippingAddress: '' };
    if (id) {
        const found = db.findById('customers', id);
        if (found) customer = found;
    }

    const listView = document.getElementById('cust-list-view');
    const formView = document.getElementById('cust-form-view');
    
    // If not on customers page, navigate first
    if (!listView || !formView) {
        await navigateTo('sales-customers');
    }
    
    const lv = document.getElementById('cust-list-view');
    const fv = document.getElementById('cust-form-view');
    if (!lv || !fv) return;

    lv.classList.add('hidden');
    fv.classList.remove('hidden');

    fv.innerHTML = `
        <div class="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden -m-4 sm:-m-6 h-[calc(100vh-64px)] flex flex-col">
            <!-- Form Header -->
            <div class="px-8 py-5 border-b border-slate-100 flex items-center justify-between bg-white shrink-0 shadow-sm z-10">
                <div class="flex items-center gap-4">
                    <div class="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600">
                        <i class="fas fa-user-plus"></i>
                    </div>
                    <div>
                        <h3 class="text-lg font-black text-slate-800 tracking-tight">${id ? 'Edit Customer' : 'Tambah Customer Baru'}</h3>
                        <p class="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">Lengkapi informasi detail pelanggan</p>
                    </div>
                </div>
                <div class="flex items-center gap-3">
                    <button type="button" onclick="renderCustomerData()" class="px-6 py-2.5 bg-slate-100 text-slate-500 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-200 transition-all active:scale-95">
                        Batal
                    </button>
                    <button type="button" onclick="saveCustomer('${id || ''}')" class="px-8 py-2.5 bg-blue-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-blue-700 transition-all shadow-lg active:scale-95 flex items-center gap-2">
                        <i class="fas fa-check-circle"></i> Simpan Data Pelanggan
                    </button>
                </div>
            </div>

            <!-- Form Body -->
            <div class="flex-1 overflow-y-auto p-8 bg-slate-50/30 custom-scrollbar pb-20">
                <div class="max-w-5xl mx-auto space-y-8">
                    <!-- General Info -->
                    <div class="bg-white rounded-3xl p-8 border border-slate-100 shadow-sm space-y-6">
                        <h4 class="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                            <i class="fas fa-info-circle text-blue-600"></i> Informasi Perusahaan
                        </h4>
                        <div class="grid grid-cols-1 gap-6">
                            <div>
                                <label class="block text-sm font-semibold text-slate-600 mb-2">Customer / Company Name <span class="text-red-400">*</span></label>
                                <input type="text" id="cust_name" value="${customer.name}" placeholder="Masukkan nama lengkap perusahaan atau individu" class="w-full bg-slate-50 border-2 border-transparent rounded-xl px-4 py-3 text-sm font-bold text-slate-800 focus:bg-white focus:border-blue-400 outline-none transition-all">
                            </div>
                        </div>

                        <div class="grid grid-cols-1 md:grid-cols-3 gap-6 pt-4">
                            <div>
                                <label class="block text-sm font-semibold text-slate-600 mb-2">Contact Person <span class="text-red-400">*</span></label>
                                <input type="text" id="cust_cp" value="${customer.contactPerson || ''}" placeholder="Nama PIC" class="w-full bg-slate-50 border-2 border-transparent rounded-xl px-4 py-3 text-sm font-bold text-slate-800 focus:bg-white focus:border-blue-400 outline-none transition-all">
                            </div>
                            <div>
                                <label class="block text-sm font-semibold text-slate-600 mb-2">Email Address <span class="text-red-400">*</span></label>
                                <input type="email" id="cust_email" value="${customer.email || ''}" placeholder="email@perusahaan.com" class="w-full bg-slate-50 border-2 border-transparent rounded-xl px-4 py-3 text-sm font-bold text-slate-800 focus:bg-white focus:border-blue-400 outline-none transition-all">
                            </div>
                            <div>
                                <label class="block text-sm font-semibold text-slate-600 mb-2">Phone Number <span class="text-red-400">*</span></label>
                                <input type="text" id="cust_phone" value="${customer.phone}" placeholder="081x xxxx xxxx" class="w-full bg-slate-50 border-2 border-transparent rounded-xl px-4 py-3 text-sm font-bold text-slate-800 focus:bg-white focus:border-blue-400 outline-none transition-all">
                            </div>
                        </div>
                    </div>

                    <!-- Address & Location -->
                    <div class="bg-white rounded-3xl p-8 border border-slate-100 shadow-sm space-y-6">
                        <h4 class="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                            <i class="fas fa-map-marker-alt text-red-500"></i> Lokasi & Alamat
                        </h4>
                        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <label class="block text-sm font-semibold text-slate-600 mb-2">Wilayah / Daerah <span class="text-red-400">*</span></label>
                                <input type="text" id="cust_region" value="${customer.region || ''}" placeholder="Contoh: Jawa Barat" class="w-full bg-slate-50 border-2 border-transparent rounded-xl px-4 py-3 text-sm font-bold text-slate-800 focus:bg-white focus:border-blue-400 outline-none transition-all">
                            </div>
                            <div>
                                <label class="block text-sm font-semibold text-slate-600 mb-2">Kota <span class="text-red-400">*</span></label>
                                <input type="text" id="cust_city" value="${customer.city || ''}" placeholder="Contoh: Bandung" class="w-full bg-slate-50 border-2 border-transparent rounded-xl px-4 py-3 text-sm font-bold text-slate-800 focus:bg-white focus:border-blue-400 outline-none transition-all">
                            </div>
                        </div>
                        <div class="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4">
                            <div>
                                <label class="block text-sm font-semibold text-slate-600 mb-2">Alamat Penagihan (Billing) <span class="text-red-400">*</span></label>
                                <textarea id="cust_address" placeholder="Masukkan alamat lengkap penagihan..." class="w-full bg-slate-50 border-2 border-transparent rounded-xl px-4 py-3 h-24 text-sm font-bold text-slate-800 focus:bg-white focus:border-blue-400 outline-none transition-all resize-none">${customer.address}</textarea>
                            </div>
                            <div>
                                <label class="block text-sm font-semibold text-slate-600 mb-2">Alamat Pengiriman (Shipping) <span class="text-red-400">*</span></label>
                                <textarea id="cust_shipping" placeholder="Masukkan alamat lengkap pengiriman..." class="w-full bg-slate-50 border-2 border-transparent rounded-xl px-4 py-3 h-24 text-sm font-bold text-slate-800 focus:bg-white focus:border-blue-400 outline-none transition-all resize-none">${customer.shippingAddress || customer.address}</textarea>
                            </div>
                        </div>
                    </div>

                    <!-- Payment & Taxes -->
                    <div class="bg-white rounded-3xl p-8 border border-slate-100 shadow-sm space-y-6">
                        <h4 class="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                            <i class="fas fa-credit-card text-green-500"></i> Ketentuan Pembayaran & Pajak
                        </h4>
                        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <label class="block text-sm font-semibold text-slate-600 mb-2">Sistem Pembayaran (Payment Term) <span class="text-red-400">*</span></label>
                                <select id="cust_payment_term" class="w-full bg-slate-50 border-2 border-transparent rounded-xl px-4 py-3 text-sm font-bold text-slate-700 focus:bg-white focus:border-blue-400 outline-none cursor-pointer transition-all appearance-none">
                                    <option value="" ${!customer.paymentTerm ? 'selected' : ''}>-- Pilih Term --</option>
                                    <option value="Cash" ${customer.paymentTerm === 'Cash' ? 'selected' : ''}>Cash</option>
                                    <option value="Tempo 7 S/d 10 Hari" ${customer.paymentTerm === 'Tempo 7 S/d 10 Hari' ? 'selected' : ''}>Tempo 7 S/d 10 Hari</option>
                                    <option value="30 Hari" ${customer.paymentTerm === '30 Hari' ? 'selected' : ''}>30 Hari</option>
                                    <option value="45 Hari" ${customer.paymentTerm === '45 Hari' ? 'selected' : ''}>45 Hari</option>
                                </select>
                            </div>
                            <div>
                                <label class="block text-sm font-semibold text-slate-600 mb-2">Pajak (PPN %)</label>
                                <select id="cust_ppn" class="w-full bg-slate-50 border-2 border-transparent rounded-xl px-4 py-3 text-sm font-bold text-slate-700 focus:bg-white focus:border-blue-400 outline-none cursor-pointer transition-all appearance-none">
                                    <option value="0" ${customer.ppn == 0 ? 'selected' : ''}>0% (Tanpa Pajak)</option>
                                    <option value="11" ${(customer.ppn == 11 || customer.ppn === undefined || customer.ppn === null) ? 'selected' : ''}>11% (PPN)</option>
                                </select>
                            </div>
                        </div>
                    </div>
                    <!-- Special Product Prices Section -->
                    <div class="bg-white rounded-3xl p-8 border border-slate-100 shadow-sm space-y-6">
                        <h4 class="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                            <i class="fas fa-tags text-orange-500"></i> Special Prices & Products
                        </h4>
                        <div class="bg-slate-50 p-6 rounded-2xl border border-slate-100">
                            <div class="flex flex-wrap gap-4 mb-6">
                                <div class="flex-1 min-w-[300px] relative">
                                    <label class="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Pilih Produk</label>
                                    <div id="cust_cp_trigger" onclick="toggleItemProductDropdown('cust_cp')" class="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-400 cursor-pointer hover:bg-slate-50 transition-all flex justify-between items-center group h-[46px] shadow-sm">
                                        <span id="cust_cp_label" class="truncate pr-2">-- Cari Kode atau Nama Produk --</span>
                                        <i class="fas fa-chevron-down text-[10px] text-slate-300 group-hover:text-slate-400 transition-colors"></i>
                                    </div>
                                    <input type="hidden" id="cust_cp_item">
                                    
                                    <div id="cust_cp_item_dropdown" class="absolute z-[100] top-full left-0 right-0 mt-2 bg-white rounded-2xl shadow-2xl hidden border border-slate-100 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                                        <div class="p-3 border-b border-slate-50 bg-slate-50/50">
                                            <input type="text" id="cust_cp_item_dropdown_search" placeholder="Ketik kode atau nama..." onkeyup="filterItemProductList('cust_cp', this.value)" class="w-full px-4 py-2 bg-white border border-slate-200 rounded-lg text-xs font-bold outline-none focus:border-blue-400 transition-all">
                                        </div>
                                        <div class="max-h-60 overflow-y-auto p-1 custom-scrollbar" id="cust_cp_list_results">
                                            <!-- List will be populated here -->
                                        </div>
                                        <div class="p-2 border-t border-slate-50 bg-slate-50/10 space-y-1">
                                            <button type="button" onclick="renderMasterProducts()" class="w-full flex items-center gap-3 px-4 py-2.5 text-[10px] font-black text-slate-500 hover:bg-slate-50 hover:text-slate-900 rounded-xl transition-all uppercase tracking-widest">
                                                <div class="w-7 h-7 flex items-center justify-center bg-slate-100 rounded-lg">
                                                    <i class="fas fa-plus text-[10px]"></i>
                                                </div>
                                                Create a new Product
                                            </button>
                                            <button type="button" onclick="openAdvancedProductSearch('cust_cp')" class="w-full flex items-center gap-3 px-4 py-2.5 text-[10px] font-black text-slate-500 hover:bg-slate-50 hover:text-slate-900 rounded-xl transition-all uppercase tracking-widest">
                                                <div class="w-7 h-7 flex items-center justify-center bg-slate-100 rounded-lg">
                                                    <i class="fas fa-search text-[10px]"></i>
                                                </div>
                                                Advanced Search
                                            </button>
                                        </div>
                                    </div>
                                </div>
                                <div class="w-48">
                                    <label class="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Harga Kesepakatan (Rp)</label>
                                    <input type="number" id="cust_cp_price" placeholder="Harga (Rp)" min="0" class="w-full bg-white border border-slate-200 rounded-xl px-4 h-[46px] text-sm focus:border-blue-400 outline-none transition-all font-bold shadow-sm">
                                </div>
                                <div class="flex items-end">
                                    <button type="button" onclick="addCustomerProduct()" class="bg-blue-600 hover:bg-blue-700 text-white w-[46px] h-[46px] rounded-xl text-lg font-medium transition-all shadow-lg active:scale-95 flex items-center justify-center">
                                        <i class="fas fa-plus"></i>
                                    </button>
                                </div>
                            </div>

                            <div class="bg-white rounded-xl border border-slate-100 overflow-hidden shadow-sm">
                                <table class="w-full text-sm text-left border-collapse">
                                    <thead class="bg-slate-50/50 border-b border-slate-100">
                                        <tr>
                                            <th class="py-3 px-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Produk / Barang</th>
                                            <th class="py-3 px-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Harga (Rp)</th>
                                            <th class="py-3 px-4 w-16"></th>
                                        </tr>
                                    </thead>
                                    <tbody id="cust_cp_list" class="divide-y divide-slate-50">
                                        <!-- Items will be populated here -->
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;

    window.tempCustomerProducts = customer.commonProducts ? [...customer.commonProducts] : [];
    renderBreadcrumb(['Sales', 'Customers', id ? 'Edit Customer' : 'Tambah Customer Baru']);
    refreshCustomerProductsTable();
};

window.refreshCustomerProductsTable = () => {
    const list = document.getElementById('cust_cp_list');
    if (!list) return;
    const inventory = db.read('inventoryItems');
    if (window.tempCustomerProducts.length === 0) {
        list.innerHTML = '<tr><td colspan="3" class="py-4 text-center text-gray-400 text-xs">Belum ada produk yang disepakati</td></tr>';
        return;
    }
    list.innerHTML = window.tempCustomerProducts.map((p, idx) => {
        return `
            <tr class="border-b">
                <td class="py-2 px-2 text-gray-800">${p.itemName}</td>
                <td class="py-2 px-2 text-right font-bold text-blue-600">${formatNumber(p.price)}</td>
                <td class="py-2 px-2 text-right"><button type="button" onclick="removeCustomerProduct(${idx})" class="text-red-500 hover:text-red-700"><i class="fas fa-times"></i></button></td>
            </tr>
        `;
    }).join('');
};

window.addCustomerProduct = () => {
    const itemId = document.getElementById('cust_cp_item').value;
    const priceInput = document.getElementById('cust_cp_price');
    const label = document.getElementById('cust_cp_label');
    const price = parseFloat(priceInput.value) || 0;
    
    if (!itemId) { showToast('Pilih produk', 'error'); return; }

    const item = db.findById('inventoryItems', itemId);
    if (!item) return;

    const exists = window.tempCustomerProducts.findIndex(p => p.itemId === itemId);
    if (exists < 0) {
        window.tempCustomerProducts.push({ itemId, itemName: item.itemName, price });
    } else {
        window.tempCustomerProducts[exists].price = price;
    }
    
    // Clear inputs & Reset Label
    document.getElementById('cust_cp_item').value = '';
    label.innerText = '-- Cari Kode atau Nama Produk --';
    label.classList.remove('text-slate-800', 'font-bold');
    label.classList.add('text-slate-400');
    priceInput.value = '';
    
    refreshCustomerProductsTable();
};

window.removeCustomerProduct = (idx) => {
    window.tempCustomerProducts.splice(idx, 1);
    refreshCustomerProductsTable();
};

window.saveCustomer = async (id) => {
    const name = document.getElementById('cust_name').value.trim();
    const phone = document.getElementById('cust_phone').value.trim();
    const email = document.getElementById('cust_email').value.trim();
    const address = document.getElementById('cust_address').value.trim();
    const contactPerson = document.getElementById('cust_cp').value.trim();
    const shippingAddress = document.getElementById('cust_shipping').value.trim();
    const region = document.getElementById('cust_region').value.trim();
    const city = document.getElementById('cust_city').value.trim();
    const paymentTerm = document.getElementById('cust_payment_term').value;
    const ppn = parseInt(document.getElementById('cust_ppn').value) || 0;
    const commonProducts = window.tempCustomerProducts || [];

    if (!name) { showToast('Nama Customer harus diisi', 'error'); return; }
    if (!contactPerson) { showToast('PIC / Contact Person harus diisi', 'error'); return; }
    if (!phone) { showToast('Nomor Telepon harus diisi', 'error'); return; }
    if (!email) { showToast('Email harus diisi', 'error'); return; }
    if (!address) { showToast('Alamat Billing harus diisi', 'error'); return; }
    if (!shippingAddress) { showToast('Alamat Shipping harus diisi', 'error'); return; }
    if (!region) { showToast('Wilayah / Daerah harus diisi', 'error'); return; }
    if (!city) { showToast('Kota harus diisi', 'error'); return; }
    if (!paymentTerm) { showToast('Sistem Pembayaran harus dipilih', 'error'); return; }

    const data = { name, phone, email, address, contactPerson, shippingAddress, paymentTerm, region, city, ppn, commonProducts };

    try {
        if (id) {
            await db.update('customers', id, data);
            // Don't show toast yet, wait until everything is done
        } else {
            await db.insert('customers', data);
        }

        // Only navigate/refresh if the DB operation succeeded
        if (window._afterCustomerSave === 'SO') {
            await openSOModal();
        } else if (window._afterCustomerSave === 'QT') {
            await openQTModal();
        } else {
            renderCustomerData();
        }
        
        // Show success toast ONLY after successful render/nav
        showToast(id ? 'Data customer berhasil diperbarui' : 'Customer baru berhasil ditambahkan', 'success');
        window._afterCustomerSave = null;
        
    } catch (err) {
        console.error('Save customer error:', err);
        showToast('Gagal menyimpan data: ' + err.message, 'error');
        // We stay on the current view because we didn't call renderCustomerData() yet in case of early DB error
        // Or if renderCustomerData() failed, we already crashed but at least we know why.
    }
};

// ============================================================
// ===          CUSTOMER MANAGEMENT (SALES)                 ===

window.viewCustomerHistory = (customerId) => {
    const customer = db.findById('customers', customerId);
    if (!customer) return;

    const quotations = (db.read('salesQuotations') || []).filter(q => q.customerId === customerId);
    const orders = (db.read('salesOrders') || []).filter(o => o.customerId === customerId);
    const invoices = (db.read('salesInvoices') || []).filter(i => i.customerId === customerId);

    const body = `
        <div class="space-y-6">
            <div>
                <h4 class="text-sm font-bold text-gray-700 mb-3 border-b pb-1">Sales Quotations</h4>
                <div class="max-h-40 overflow-y-auto border rounded divide-y">
                    ${quotations.length ? quotations.map(q => `
                        <div class="p-2 text-xs flex justify-between hover:bg-gray-50 cursor-pointer" onclick="viewQuotation('${q.id}')">
                            <span>${q.quotationNumber}</span>
                            <span class="text-gray-500">${formatDate(q.createdAt).slice(0, 10)}</span>
                            <span class="font-bold">${formatCurrency(q.totalAmount)}</span>
                        </div>
                    `).join('') : '<p class="p-3 text-center text-gray-400 text-xs">No quotations found</p>'}
                </div>
            </div>
            <div>
                <h4 class="text-sm font-bold text-gray-700 mb-3 border-b pb-1">Sales Orders</h4>
                <div class="max-h-40 overflow-y-auto border rounded divide-y">
                    ${orders.length ? orders.map(o => `
                        <div class="p-2 text-xs flex justify-between hover:bg-gray-50 cursor-pointer" onclick="viewSO('${o.id}')">
                            <span>${o.soNumber}</span>
                            <span class="text-gray-500">${formatDate(o.createdAt).slice(0, 10)}</span>
                            <span class="font-bold">${formatCurrency(o.totalAmount)}</span>
                        </div>
                    `).join('') : '<p class="p-3 text-center text-gray-400 text-xs">No orders found</p>'}
                </div>
            </div>
            <div>
                <h4 class="text-sm font-bold text-gray-700 mb-3 border-b pb-1">Invoices</h4>
                <div class="max-h-40 overflow-y-auto border rounded divide-y">
                    ${invoices.length ? invoices.map(i => `
                        <div class="p-2 text-xs flex justify-between hover:bg-gray-50 cursor-pointer" onclick="viewInvoice('${i.id}')">
                            <span>${i.invoiceNumber}</span>
                            <span class="text-gray-500">${formatDate(i.createdAt).slice(0, 10)}</span>
                            <span class="font-bold text-blue-600">${formatCurrency(i.totalAmount)}</span>
                        </div>
                    `).join('') : '<p class="p-3 text-center text-gray-400 text-xs">No invoices found</p>'}
                </div>
            </div>
        </div>
    `;

    showModal(`History: ${customer.name}`, body, `<button onclick="closeModal()" class="px-4 py-2 bg-gray-600 text-white rounded text-sm hover:bg-gray-700">Close History</button>`, 'lg');
};

window.deleteCustomer = (id) => {
    if (confirm('Yakin ingin menghapus customer ini?')) {
        db.delete('customers', id);
        renderCustomerData();
    }
};


// ============================================================
// ===          PURCHASE MODULE                             ===
// ============================================================

// --- Shared Purchase Helpers ---
function formatCurrencyPurch(n) { return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(n || 0); }
function statusBadgePurch(status) {
    const map = {
        'DRAFT': 'bg-gray-100 text-gray-700',
        'APPROVED': 'bg-blue-100 text-blue-700',
        'RECEIVED': 'bg-green-100 text-green-700',
        'CANCELLED': 'bg-red-100 text-red-700',
        'UNPAID': 'bg-orange-100 text-orange-700',
        'PAID': 'bg-green-100 text-green-700',
    };
    return `<span class="px-2 py-1 rounded text-xs font-semibold ${map[status] || 'bg-gray-100 text-gray-600'}">${status}</span>`;
}

function toRomanPurch(num) {
    const lookup = { M: 1000, CM: 900, D: 500, CD: 400, C: 100, XC: 90, L: 50, XL: 40, X: 10, IX: 9, V: 5, IV: 4, I: 1 };
    let roman = '';
    for (let i in lookup) {
        while (num >= lookup[i]) {
            roman += i;
            num -= lookup[i];
        }
    }
    return roman;
}

function generatePurchaseOrderNumber(isTax = false, customDate = null) {
    const pos = db.read('purchaseOrders') || [];
    const date = customDate ? new Date(customDate) : new Date();
    const month = date.getMonth() + 1;
    const year = date.getFullYear();
    const romanMonth = toRomanPurch(month);
    const type = isTax ? 'A' : 'B';

    // Find the max sequence number for this specific type, month, and year
    let maxSeq = 0;
    pos.forEach(p => {
        if (!p.poNumber) return;
        const pDate = new Date(p.date || p.createdAt);
        // We only care about same month/year
        if (pDate.getMonth() + 1 === month && pDate.getFullYear() === year) {
            const parts = p.poNumber.split('-');
            if (parts.length >= 3 && parts[1] === type) {
                const suffixPart = parts[2].split('/')[0];
                const seq = parseInt(suffixPart);
                if (!isNaN(seq) && seq > maxSeq) maxSeq = seq;
            }
        }
    });

    let nextSeq = maxSeq + 1;
    let finalNumber = `PO-${type}-${String(nextSeq).padStart(3, '0')}/${romanMonth}/${year}`;

    // Ultimate uniqueness safety check
    while (pos.some(p => p.poNumber === finalNumber)) {
        nextSeq++;
        finalNumber = `PO-${type}-${String(nextSeq).padStart(3, '0')}/${romanMonth}/${year}`;
    }

    return finalNumber;
}

window.updatePODueDate = () => {
    const poDateVal = document.getElementById('po_date')?.value;
    const term = document.getElementById('po_payment_terms')?.value;
    const dueDateInput = document.getElementById('po_due_date');
    if (!poDateVal || !term || !dueDateInput) return;

    let days = 0;
    if (term === 'Cash' || term === 'COD') days = 0;
    else if (term === '7 S/d 10 Hari') days = 10;
    else if (term === '30 Hari') days = 30;
    else if (term === '45 Hari') days = 45;
    else if (term === '60 Hari') days = 60;

    const date = new Date(poDateVal);
    date.setDate(date.getDate() + days);
    dueDateInput.value = date.toISOString().split('T')[0];
};

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ MASTER SUPPLIERS â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function renderMasterSuppliers() {
    const canEdit = getModulePermission('pembelian').edit;
    renderBreadcrumb(['Purchasing', 'Reports', 'Supplier Addresses & Contacts']);
    document.getElementById('pageTitle').innerText = 'Supplier Addresses & Contacts';
    const mainContent = document.getElementById('main-content');

    const suppliers = db.read('suppliers') || [];

    mainContent.innerHTML = `
        <div class="space-y-4">
            <!-- Structured Filter Bar -->
            <div class="bg-white rounded-xl shadow-sm border border-slate-100 p-5">
                <div class="flex flex-wrap items-center gap-4">
                    <!-- Search Input -->
                    <div class="flex-1 min-w-[250px] relative group">
                        <i class="fas fa-search absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-indigo-500 transition-colors"></i>
                        <input type="text" id="sup_search" onkeyup="filterSupplierList()" placeholder="Search Supplier Name, PIC, Phone..." 
                            class="w-full pl-12 pr-4 py-2.5 bg-slate-50 border border-transparent rounded-xl text-sm font-semibold text-slate-700 placeholder:text-slate-300 focus:bg-white focus:border-indigo-300 focus:ring-4 focus:ring-indigo-500/5 outline-none transition-all">
                    </div>

                    <!-- Actions -->
                    <div class="flex gap-3 ml-auto">
                        <button onclick="renderSupplierForm()" class="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-xl transition-all text-sm font-bold shadow-lg shadow-indigo-500/20 flex items-center gap-2">
                            <i class="fas fa-plus"></i> New Supplier
                        </button>
                        <button onclick="exportSupplierCsv()" class="bg-white border border-slate-200 text-slate-600 px-5 py-2.5 rounded-xl hover:bg-slate-50 transition-all text-sm font-bold">
                            <i class="fas fa-download mr-2"></i> Export
                        </button>
                    </div>
                </div>
            </div>

            <!-- Supplier Table Card -->
            <div class="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
                <div class="overflow-x-auto">
                    <table class="w-full text-left" id="supplier_table">
                        <thead class="bg-slate-50/50 border-b border-slate-100">
                            <tr>
                                <th class="py-4 px-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Supplier Information</th>
                                <th class="py-4 px-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Contact Details</th>
                                <th class="py-4 px-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Category / Terms</th>
                                <th class="py-4 px-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Address</th>
                                <th class="py-4 px-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody id="supplier_table_body" class="divide-y divide-slate-50">
                            ${renderSupplierRows(suppliers)}
                        </tbody>
                    </table>
                </div>
                <div id="supplier_empty_state" class="hidden py-20 flex flex-col items-center justify-center text-center">
                    <div class="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center text-slate-300 mb-4 text-2xl">
                        <i class="fas fa-truck-loading"></i>
                    </div>
                    <p class="text-sm font-medium text-slate-500">No suppliers found matching your filters.</p>
                </div>
            </div>
        </div>
    `;
}

function renderSupplierRows(suppliers) {
    const canEdit = getModulePermission('pembelian').edit;
    if (suppliers.length === 0) return '';
    
    return suppliers.map(s => `
        <tr class="hover:bg-slate-50/80 transition-colors group">
            <td class="py-4 px-5">
                <div class="flex items-center gap-3">
                    <div class="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center text-xs font-bold shrink-0">
                        ${s.name.substring(0,2).toUpperCase()}
                    </div>
                    <div>
                        <div class="text-sm font-bold text-slate-800">${s.name}</div>
                        <div class="text-[11px] text-slate-400 font-medium">${s.id}</div>
                    </div>
                </div>
            </td>
            <td class="py-4 px-5">
                <div class="text-sm text-slate-700 font-medium">${s.contactPerson || s.contact_person || '-'}</div>
                <div class="text-[12px] text-slate-500">${s.email || '-'}</div>
                <div class="text-[12px] text-slate-500">${s.phone || '-'}</div>
            </td>
            <td class="py-4 px-5">
                <div class="text-sm text-slate-700 font-semibold">${s.category || 'General'}</div>
                <div class="text-xs text-slate-500">${s.paymentTerm || '-'}</div>
            </td>
            <td class="py-4 px-5">
                <div class="text-xs text-slate-600 max-w-[250px] line-clamp-2">${s.address || '-'}</div>
            </td>
            <td class="py-4 px-5 text-right">
                <div class="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onclick="renderSupplierForm('${s.id}')" class="w-8 h-8 rounded-lg bg-slate-100 text-slate-500 hover:bg-blue-50 hover:text-blue-600 transition-all" title="Edit"><i class="fas fa-edit text-xs"></i></button>
                    <button onclick="deleteSupplier('${s.id}')" class="w-8 h-8 rounded-lg bg-slate-100 text-slate-500 hover:bg-red-50 hover:text-red-600 transition-all" title="Delete"><i class="fas fa-trash text-xs"></i></button>
                </div>
            </td>
        </tr>
    `).join('');
}

window.filterSupplierList = () => {
    const search = document.getElementById('sup_search')?.value.toLowerCase() || '';
    const suppliers = db.read('suppliers') || [];
    
    const filtered = suppliers.filter(s => {
        const matchesSearch = !search || 
            s.name.toLowerCase().includes(search) || 
            (s.pic && s.pic.toLowerCase().includes(search)) || 
            (s.phone && s.phone.includes(search)) ||
            (s.email && s.email.toLowerCase().includes(search));
        return matchesSearch;
    });
    
    const tbody = document.getElementById('supplier_table_body');
    const emptyState = document.getElementById('supplier_empty_state');
    
    if (tbody) {
        tbody.innerHTML = renderSupplierRows(filtered);
        if (filtered.length === 0) {
            emptyState?.classList.remove('hidden');
        } else {
            emptyState?.classList.add('hidden');
        }
    }
};

window.exportSupplierCsv = () => {
    const suppliers = db.read('suppliers') || [];
    let csv = 'ID,Name,PIC,Phone,Email,Category,Terms,Address\n';
    suppliers.forEach(s => {
        csv += `"${s.id}","${s.name}","${s.pic}","${s.phone}","${s.email}","${s.category}","${s.paymentTerm}","${s.address.replace(/"/g, '""')}"\n`;
    });
    const blob = new Blob([csv], { type: 'text/csv' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'suppliers_master.csv';
    a.click();
};


window.renderSupplierForm = (id = null) => {
    const s = id ? db.findById('suppliers', id) : { name: '', phone: '', email: '', address: '', contactPerson: '', npwp: '', region: '', city: '', category: '', paymentTerm: '', commonProducts: [] };
    
    renderBreadcrumb(['Purchasing', 'Reports', 'Supplier Addresses & Contacts', id ? 'Edit Supplier' : 'Tambah Supplier']);
    document.getElementById('pageTitle').innerText = id ? 'Edit Supplier' : 'Tambah Supplier';
    const mainContent = document.getElementById('main-content');

    mainContent.innerHTML = `
        <div class="w-full space-y-6 animate-fade-in pb-20">
            <!-- Header Section -->
            <div class="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
                <div class="flex justify-between items-center mb-6">
                    <div class="flex items-center gap-4">
                        <div class="w-12 h-12 bg-indigo-50 rounded-xl flex items-center justify-center text-indigo-600">
                            <i class="fas fa-truck-loading text-xl"></i>
                        </div>
                        <div>
                            <h2 class="text-xl font-bold text-slate-800">${id ? 'Edit Data Supplier' : 'Tambah Supplier Baru'}</h2>
                            <p class="text-xs text-slate-500">Lengkapi informasi detail supplier di bawah ini.</p>
                        </div>
                    </div>
                    <div class="flex gap-3">
                        <button onclick="renderMasterSuppliers()" class="px-6 py-2.5 bg-slate-100 text-slate-600 rounded-xl text-sm font-bold hover:bg-slate-200 transition-all">Batal</button>
                        <button onclick="saveSupplier('${id || ''}')" class="px-8 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-bold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-500/20">Simpan Supplier</button>
                    </div>
                </div>

                <div class="space-y-4 font-sans">
                    <!-- Top Level -->
                    <div class="grid grid-cols-1 gap-6">
                        <div>
                            <label class="block text-sm font-medium text-slate-600 mb-1">Supplier / Company Name <span class="text-red-400">*</span></label>
                            <input type="text" id="sup_name" value="${s.name}" class="w-full bg-slate-50 border border-slate-100 rounded-xl px-4 py-3 text-sm text-slate-800 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-300 outline-none transition-all font-bold">
                        </div>
                    </div>

                    <!-- Contact Section -->
                    <div class="pt-5 mt-2 border-t border-slate-100">
                        <h4 class="text-sm font-semibold text-slate-800 mb-4 flex items-center gap-2">
                            <i class="fas fa-address-book text-indigo-400 text-xs"></i>
                            <span>Primary Contact Details</span>
                        </h4>
                        <div class="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-5">
                            <div>
                                <label class="block text-sm font-medium text-slate-600 mb-1">PIC (Contact Person) <span class="text-red-400">*</span></label>
                                <input type="text" id="sup_contact_person" value="${s.contactPerson || s.contact_person || ''}" placeholder="Nama PIC" class="w-full bg-slate-50 border border-slate-100 rounded-xl px-4 py-3 text-sm text-slate-800 focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all">
                            </div>
                            <div>
                                <label class="block text-sm font-medium text-slate-600 mb-1">NPWP Supplier</label>
                                <input type="text" id="sup_npwp" value="${s.npwp || ''}" placeholder="00.000.000.0-000.000" class="w-full bg-slate-50 border border-slate-100 rounded-xl px-4 py-3 text-sm text-slate-800 focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all">
                            </div>
                            <div>
                                <label class="block text-sm font-medium text-slate-600 mb-1">Email Address <span class="text-red-400">*</span></label>
                                <input type="email" id="sup_email" value="${s.email || ''}" placeholder="email@supplier.com" class="w-full bg-slate-50 border border-slate-100 rounded-xl px-4 py-3 text-sm text-slate-800 focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all">
                            </div>
                            <div>
                                <label class="block text-sm font-medium text-slate-600 mb-1">Phone Number <span class="text-red-400">*</span></label>
                                <input type="text" id="sup_phone" value="${s.phone || ''}" placeholder="0812..." class="w-full bg-slate-50 border border-slate-100 rounded-xl px-4 py-3 text-sm text-slate-800 focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all">
                            </div>
                        </div>
                    </div>

                    <!-- Address Section -->
                    <div class="pt-5 mt-2 border-t border-slate-100">
                        <h4 class="text-sm font-semibold text-slate-800 mb-4 flex items-center gap-2">
                            <i class="fas fa-map-marker-alt text-indigo-400 text-xs"></i>
                            <span>Address Details</span>
                        </h4>
                        <div class="grid grid-cols-1 gap-5">
                            <div>
                                <label class="block text-sm font-medium text-slate-600 mb-1">Full Address <span class="text-red-400">*</span></label>
                                <textarea id="sup_address" class="w-full bg-slate-50 border border-slate-100 rounded-xl px-4 py-3 h-24 text-sm text-slate-800 focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all resize-none">${s.address || ''}</textarea>
                            </div>
                        </div>
                    </div>

                    <!-- Purchasing & Tax Section -->
                    <div class="pt-5 mt-2 border-t border-slate-100">
                        <h4 class="text-sm font-semibold text-slate-800 mb-4 flex items-center gap-2">
                            <i class="fas fa-file-invoice-dollar text-indigo-400 text-xs"></i>
                            <span>Purchasing & Tax Details</span>
                        </h4>
                        <div class="grid grid-cols-1 md:grid-cols-3 gap-x-6 gap-y-5">
                            <div>
                                <label class="block text-sm font-medium text-slate-600 mb-1">Default Category</label>
                                <select id="sup_category" class="w-full bg-slate-50 border border-slate-100 rounded-xl px-4 py-3 text-sm text-slate-800 focus:ring-2 focus:ring-indigo-500/20 outline-none cursor-pointer transition-all">
                                    <option value="">-- Pilih Kategori --</option>
                                    <option value="Bahan Baku" ${s.category === 'Bahan Baku' ? 'selected' : ''}>Bahan Baku</option>
                                    <option value="Packaging" ${s.category === 'Packaging' ? 'selected' : ''}>Packaging</option>
                                    <option value="Perlengkapan" ${s.category === 'Perlengkapan' ? 'selected' : ''}>Perlengkapan</option>
                                    <option value="Service" ${s.category === 'Service' ? 'selected' : ''}>Service</option>
                                    <option value="Sparepart" ${s.category === 'Sparepart' ? 'selected' : ''}>Sparepart</option>
                                    <option value="Aktiva ( tetap )" ${s.category === 'Aktiva ( tetap )' ? 'selected' : ''}>Aktiva ( tetap )</option>
                                    <option value="Gas" ${s.category === 'Gas' ? 'selected' : ''}>Gas</option>
                                </select>
                            </div>
                            <div>
                                <label class="block text-sm font-medium text-slate-600 mb-1">Default Payment Term</label>
                                <select id="sup_payment_term" class="w-full bg-slate-50 border border-slate-100 rounded-xl px-4 py-3 text-sm text-slate-800 focus:ring-2 focus:ring-indigo-500/20 outline-none cursor-pointer transition-all">
                                    <option value="" ${!s.paymentTerm ? 'selected' : ''}>-- Pilih Term --</option>
                                    <option value="Cash" ${s.paymentTerm === 'Cash' ? 'selected' : ''}>Cash</option>
                                    <option value="COD" ${s.paymentTerm === 'COD' ? 'selected' : ''}>COD</option>
                                    <option value="7 S/d 10 Hari" ${s.paymentTerm === '7 S/d 10 Hari' ? 'selected' : ''}>7 S/d 10 Hari</option>
                                    <option value="30 Hari" ${s.paymentTerm === '30 Hari' ? 'selected' : ''}>30 Hari</option>
                                    <option value="45 Hari" ${s.paymentTerm === '45 Hari' ? 'selected' : ''}>45 Hari</option>
                                    <option value="60 Hari" ${s.paymentTerm === '60 Hari' ? 'selected' : ''}>60 Hari</option>
                                </select>
                            </div>
                            <div>
                                <label class="block text-sm font-medium text-slate-600 mb-1">Pajak (PPN %)</label>
                                <select id="sup_ppn" class="w-full bg-slate-50 border border-slate-100 rounded-xl px-4 py-3 text-sm text-slate-800 focus:ring-2 focus:ring-indigo-500/20 outline-none cursor-pointer transition-all">
                                    <option value="0" ${s.ppn == 0 ? 'selected' : ''}>0% (Tanpa Pajak)</option>
                                    <option value="11" ${(s.ppn == 11 || s.ppn === undefined) ? 'selected' : ''}>11% (PPN)</option>
                                </select>
                            </div>
                        </div>
                    </div>
                    
                    <!-- Master Produk Section -->
                    <div class="pt-5 mt-2 border-t border-slate-100">
                        <h4 class="text-sm font-semibold text-slate-800 mb-4 flex items-center gap-2">
                            <i class="fas fa-cubes text-indigo-400 text-xs"></i>
                            <span>Master Produk / Barang Supplier</span>
                        </h4>
                        <div class="bg-slate-50 p-6 rounded-2xl border border-slate-100">
                            <p class="text-[11px] text-indigo-600 mb-4 italic opacity-75 font-medium flex items-center gap-2">
                                <i class="fas fa-info-circle"></i>
                                Produk yang ditambahkan di sini akan otomatis dimuat saat membuat PO atau RFQ untuk supplier ini.
                            </p>
                            <div class="flex flex-wrap md:flex-nowrap gap-4 mb-6">
                                <div class="flex-1 min-w-[300px] relative">
                                    <label class="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Pilih Material / Barang</label>
                                    <div id="sup_cp_trigger" onclick="openProductSearch('sup_cp', ['RAW_MATERIAL', 'PACKAGING', 'SUPPLIES', 'SERVICE', 'SPAREPART', 'ASSET', 'GAS', 'OVEN_BASAH_STOCK', 'OVEN_KERING_STOCK', 'WIP'])" class="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-400 cursor-pointer hover:bg-slate-50 hover:border-indigo-200 transition-all flex justify-between items-center group min-h-[46px]">
                                        <span id="sup_cp_label" class="truncate pr-2">-- Cari Kode atau Nama Produk --</span>
                                        <i class="fas fa-chevron-down text-[10px] text-slate-300 group-hover:text-indigo-400 transition-colors"></i>
                                    </div>
                                    <input type="hidden" id="sup_cp_item">
                                    <div id="sup_cp_results_container" class="absolute z-[100] top-full left-0 right-0 mt-2 bg-white rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.15)] hidden border border-slate-100 overflow-hidden min-w-[350px]">
                                        <div class="p-4 border-b border-slate-50">
                                            <div class="relative">
                                                <i class="fas fa-search absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 text-sm"></i>
                                                <input type="text" id="sup_cp_search_input" placeholder="Ketik kode atau nama..." class="w-full bg-slate-50 border border-slate-100 rounded-xl pl-11 pr-4 py-2.5 text-sm focus:border-indigo-400 outline-none transition-all font-medium">
                                            </div>
                                        </div>
                                        <div id="sup_cp_results" class="max-h-[350px] overflow-y-auto custom-scrollbar"></div>
                                    </div>
                                </div>
                                <div class="flex items-end">
                                    <button type="button" onclick="addSupplierProduct()" class="bg-indigo-600 hover:bg-indigo-700 text-white px-6 h-[46px] rounded-xl text-sm font-bold transition-all shadow-md shadow-indigo-500/10 flex items-center justify-center gap-2">
                                        <i class="fas fa-plus"></i> Tambah
                                    </button>
                                </div>
                            </div>
                            <div class="overflow-x-auto">
                                <table class="w-full text-left">
                                    <thead class="text-slate-400 text-[10px] font-black uppercase tracking-widest border-b border-slate-200">
                                        <tr>
                                            <th class="pb-3 px-3">Barang / Material</th>
                                            <th class="pb-3 px-3">Satuan</th>
                                            <th class="pb-3 px-3 text-right">Aksi</th>
                                        </tr>
                                    </thead>
                                    <tbody id="sup_cp_list" class="divide-y divide-slate-100"></tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                </div>
                
                <!-- Bottom Actions -->
                <div class="mt-10 pt-8 border-t border-slate-100 flex justify-end gap-3">
                    <button onclick="renderMasterSuppliers()" class="px-8 py-3 bg-slate-100 text-slate-600 rounded-xl text-sm font-bold hover:bg-slate-200 transition-all">Batalkan Perubahan</button>
                    <button onclick="saveSupplier('${id || ''}')" class="px-12 py-3 bg-indigo-600 text-white rounded-xl text-sm font-bold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-500/25">Simpan Data Supplier</button>
                </div>
            </div>
        </div>`;
    
    window.tempSupplierProducts = s.commonProducts ? JSON.parse(JSON.stringify(s.commonProducts)) : [];
    refreshSupplierProductsTable();
};

window.refreshSupplierProductsTable = () => {
    const list = document.getElementById('sup_cp_list');
    if (!list) return;
    if (window.tempSupplierProducts.length === 0) {
        list.innerHTML = '<tr><td colspan="3" class="py-6 text-center text-slate-400 text-[11px] font-medium italic">Belum ada barang yang didaftarkan untuk supplier ini</td></tr>';
        return;
    }
    list.innerHTML = window.tempSupplierProducts.map((p, idx) => `
        <tr class="hover:bg-slate-50 transition-colors group">
            <td class="py-3 px-2 text-sm font-bold text-slate-700">${p.itemName}</td>
            <td class="py-3 px-2 text-xs font-semibold text-slate-500">${p.unit || 'PCS'}</td>
            <td class="py-3 px-2 text-right">
                <button type="button" onclick="removeSupplierProduct(${idx})" class="w-8 h-8 rounded-lg bg-red-50 text-red-500 hover:bg-red-500 hover:text-white transition-all">
                    <i class="fas fa-times text-xs"></i>
                </button>
            </td>
        </tr>
    `).join('');
};

window.addSupplierProduct = () => {
    const itemId = document.getElementById('sup_cp_item').value;
    const label = document.getElementById('sup_cp_label');
    const searchInput = document.getElementById('sup_cp_search_input');
    
    if (!itemId) { showToast('Pilih material/barang', 'error'); return; }

    const item = db.findById('inventoryItems', itemId);
    if (!item) return;

    const exists = window.tempSupplierProducts.findIndex(p => p.itemId === itemId);
    if (exists < 0) {
        window.tempSupplierProducts.push({ itemId, itemName: item.itemName, unit: item.unit || 'PCS' });
        showToast('Barang ditambahkan ke daftar', 'success');
    } else {
        showToast('Bahan sudah ada dalam daftar', 'info');
    }
    
    // Reset UI
    document.getElementById('sup_cp_item').value = '';
    if (label) {
        label.innerText = '-- Cari Kode atau Nama Produk --';
        label.classList.add('text-slate-400');
        label.classList.remove('text-slate-800', 'font-black');
    }
    if (searchInput) searchInput.value = '';
    
    refreshSupplierProductsTable();
};

window.removeSupplierProduct = (idx) => {
    window.tempSupplierProducts.splice(idx, 1);
    refreshSupplierProductsTable();
};

window.handleSupplierChange = (suppId, mode = 'PO') => {
    if (!suppId) return;
    const supp = db.findById('suppliers', suppId);
    if (!supp) return;

    if (mode === 'PO') {
        const catEl = document.getElementById('po_category');
        const catDispEl = document.getElementById('po_category_display');
        if (supp.category) {
            if (catEl) catEl.value = supp.category;
            if (catDispEl) catDispEl.value = supp.category;
        }

        const termEl = document.getElementById('po_payment_terms');
        if (termEl && supp.paymentTerm) {
            termEl.value = supp.paymentTerm;
            if(window.updatePODueDate) updatePODueDate();
        }
        
        const taxEl = document.getElementById('po_tax_rate');
        if (taxEl && (supp.ppn !== undefined && supp.ppn !== null)) {
            taxEl.value = parseInt(supp.ppn); // Convert 0.00 to 0 or 11.00 to 11
            // Sync badge TAX/NT dan nomor PO sesuai pajak supplier
            const isTax = parseInt(supp.ppn) > 0;
            const taxTypeEl = document.getElementById('po_tax_type');
            if (taxTypeEl) taxTypeEl.value = isTax ? 'A' : 'B';
            const dateVal = document.getElementById('po_date')?.value;
            const poNumEl = document.getElementById('po_number');
            if (poNumEl && typeof generatePurchaseOrderNumber === 'function') {
                poNumEl.value = generatePurchaseOrderNumber(isTax, dateVal);
            }
            if (window.renderPOItemsList) renderPOItemsList();
        }

        if (supp.commonProducts && supp.commonProducts.length > 0) {
            const inventory = db.read('inventoryItems');
            const newItems = [];
            for (const cp of supp.commonProducts) {
                const i = inventory.find(x => x.id === cp.itemId);
                if (i) {
                    newItems.push({
                        inventoryItemId: i.id,
                        itemCode: i.itemCode || '',
                        prodText: i.itemName,
                        unit: i.unit || cp.unit || 'PCS',
                        qty: 1,
                        price: cp.price || 0,
                        subtotal: 1 * (cp.price || 0)
                    });
                }
            }
            window.tempPOItems = newItems;
            if (window.renderPOItemsList) renderPOItemsList();
            showToast('Kategori, term, pajak & barang default supplier berhasil dimuat.', 'success');
        } else {
             if (supp.category || supp.paymentTerm) showToast('Kategori, term & pajak supplier berhasil dimuat.', 'info');
        }
    } else if (mode === 'RFQ') {
        const catEl = document.getElementById('rfq_category');
        const catDispEl = document.getElementById('rfq_category_display');
        if (supp.category) {
            if (catEl) catEl.value = supp.category;
            if (catDispEl) catDispEl.value = supp.category;
        }

        if (supp.commonProducts && supp.commonProducts.length > 0) {
            const inventory = db.read('inventoryItems');
            const newItems = [];
            for (const cp of supp.commonProducts) {
                const i = inventory.find(x => x.id === cp.itemId);
                if (i) {
                    newItems.push({
                        id: Date.now().toString() + Math.random().toString(36).substr(2, 5),
                        inventoryItemId: i.id,
                        itemCode: i.itemCode || '',
                        prodText: i.itemName,
                        prodUnit: i.unit || cp.unit || 'PCS',
                        qty: 1
                    });
                }
            }
            window.tempRFQItems = newItems;
            if (window.refreshPurchaseRFQItemsTable) refreshPurchaseRFQItemsTable();
            showToast('Kategori dan barang default supplier berhasil dimuat.', 'success');
        } else {
             if (supp.category) showToast('Kategori supplier berhasil dimuat.', 'info');
        }
    }
};

window.saveSupplier = async (id) => {
    const name = document.getElementById('sup_name').value.trim();
    if (!name) { showToast('Nama supplier harus diisi', 'error'); return; }
    const contact_person = document.getElementById('sup_contact_person').value.trim();
    const npwp = document.getElementById('sup_npwp').value.trim();
    const phone = document.getElementById('sup_phone').value.trim();
    const email = document.getElementById('sup_email').value.trim();
    const address = document.getElementById('sup_address').value.trim();
    const category = document.getElementById('sup_category').value;
    const paymentTerm = document.getElementById('sup_payment_term').value;
    const ppn = parseInt(document.getElementById('sup_ppn').value) || 0;
    const commonProducts = window.tempSupplierProducts || [];

    if (!contact_person) { showToast('PIC harus diisi', 'error'); return; }
    if (!phone) { showToast('Nomor Telepon harus diisi', 'error'); return; }
    if (!email) { showToast('Email harus diisi', 'error'); return; }
    if (!address) { showToast('Alamat harus diisi', 'error'); return; }

    const data = {
        name,
        contactPerson: contact_person,
        npwp,
        phone,
        email,
        address,
        category,
        paymentTerm,
        ppn,
        commonProducts,
    };
    
    showToast('Sedang menyimpan...', 'info');
    if (id) { 
        await db.update('suppliers', id, data); 
        showToast('Supplier diperbarui', 'success'); 
    } else { 
        await db.insert('suppliers', data); 
        showToast('Supplier ditambahkan', 'success'); 
    }
    renderMasterSuppliers();
};

// --- PRODUCT AUTOCOMPLETE COMPONENT (MATCHING IMAGE 7) ---
window.openProductSearch = (prefix, categoryFilter) => {
    const container = document.getElementById(`${prefix}_results_container`);
    const searchInput = document.getElementById(`${prefix}_search_input`);
    const results = document.getElementById(`${prefix}_results`);

    // Toggle container
    container.classList.toggle('hidden');
    if (!container.classList.contains('hidden')) {
        searchInput.value = '';
        searchInput.focus();
        renderProductSearchResults('', results, categoryFilter, prefix);
    }

    // Listener for input
    if (!searchInput.dataset.hasListener) {
        searchInput.addEventListener('input', (e) => {
            renderProductSearchResults(e.target.value.trim(), results, categoryFilter, prefix);
        });
        searchInput.dataset.hasListener = 'true';
    }

    // Close on click outside
    const clickOutside = (e) => {
        const trigger = document.getElementById(`${prefix}_trigger`);
        if (!container.contains(e.target) && !trigger.contains(e.target)) {
            container.classList.add('hidden');
            document.removeEventListener('mousedown', clickOutside);
        }
    };
    document.addEventListener('mousedown', clickOutside);
};

function renderProductSearchResults(query, container, categoryFilter, prefix) {
    const items = db.read('inventoryItems').filter(i => i.status !== 'INACTIVE');
    const filtered = items.filter(i => {
        const matchesQuery = !query || i.itemName.toLowerCase().includes(query.toLowerCase()) || i.itemCode.toLowerCase().includes(query.toLowerCase());
        
        // If it's a supplier product search, we might want to be more inclusive
        let matchesCategory = true;
        if (categoryFilter) {
            if (Array.isArray(categoryFilter)) {
                matchesCategory = categoryFilter.includes(i.category);
            } else {
                matchesCategory = i.category === categoryFilter;
            }
        }
        
        return matchesQuery && matchesCategory;
    }).slice(0, 15); // Show more results (15 instead of 5) for better usability

    if (filtered.length === 0) {
        container.innerHTML = `
            <div class="p-8 text-center bg-slate-50/30">
                <div class="w-12 h-12 bg-white rounded-2xl shadow-sm flex items-center justify-center mx-auto mb-3 border border-slate-100">
                    <i class="fas fa-box-open text-slate-200"></i>
                </div>
                <p class="text-xs text-slate-400 font-bold uppercase tracking-widest">No products found</p>
            </div>
            ${renderAutocompleteFooter()}
        `;
        return;
    }

    container.innerHTML = `
        <div class="p-2 space-y-1">
            ${filtered.map(item => {
                const stock = db.getInventoryStock(item.id);
                const price = item.purchasePrice || item.sellingPrice || 0;
                return `
                <div onclick="selectProductResult('${prefix}', '${item.id}', '${item.itemName}', '${item.unit || 'PCS'}')" 
                     class="p-4 rounded-2xl hover:bg-indigo-50/50 cursor-pointer transition-all group border border-transparent hover:border-indigo-100 flex justify-between items-center">
                    <div>
                        <div class="text-[13px] font-black text-slate-800 group-hover:text-indigo-600 transition-colors">${item.itemName}</div>
                        <div class="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-0.5">${item.itemCode}</div>
                    </div>
                    <div class="text-right">
                        <div class="text-[10px] font-black text-blue-600 uppercase tracking-tighter">STOCK: ${formatNumber(stock)}</div>
                        <div class="text-[11px] font-bold text-slate-400 mt-0.5">Rp ${formatNumber(price)}</div>
                    </div>
                </div>
                `;
            }).join('')}
        </div>
        ${renderAutocompleteFooter()}
    `;
}

function renderAutocompleteFooter() {
    return `
        <div class="border-t border-slate-100 p-3 bg-slate-50/30">
            <button type="button" onclick="renderInventoryItemForm()" class="w-full text-left px-4 py-3 rounded-2xl hover:bg-white hover:shadow-sm transition-all flex items-center gap-4 group">
                <div class="w-10 h-10 rounded-xl bg-white border border-slate-200 text-slate-400 flex items-center justify-center group-hover:border-blue-200 group-hover:text-blue-500 transition-all shadow-sm"><i class="fas fa-plus text-xs"></i></div>
                <span class="text-[11px] font-black text-slate-500 uppercase tracking-widest group-hover:text-slate-800 transition-colors">Create a New Product</span>
            </button>
            <button type="button" onclick="navigateTo('inventory-master')" class="w-full text-left px-4 py-3 rounded-2xl hover:bg-white hover:shadow-sm transition-all flex items-center gap-4 group mt-1">
                <div class="w-10 h-10 rounded-xl bg-white border border-slate-200 text-slate-400 flex items-center justify-center group-hover:border-indigo-200 group-hover:text-indigo-500 transition-all shadow-sm"><i class="fas fa-search text-xs"></i></div>
                <span class="text-[11px] font-black text-slate-500 uppercase tracking-widest group-hover:text-slate-800 transition-colors">Advanced Search</span>
            </button>
        </div>
    `;
}

window.selectProductResult = (prefix, id, name, unit) => {
    const hiddenInput = document.getElementById(`${prefix}_item`);
    const label = document.getElementById(`${prefix}_label`);
    const unitDisplay = document.getElementById(`${prefix}_unit_display`);
    
    if (hiddenInput) hiddenInput.value = id;
    if (label) {
        label.innerText = name;
        label.classList.remove('text-slate-400');
        label.classList.add('text-slate-800', 'font-black');
    }
    if (unitDisplay) unitDisplay.value = unit;

    // Trigger any onchange listeners if needed
    if (hiddenInput) {
        const event = new Event('change', { bubbles: true });
        hiddenInput.dispatchEvent(event);
    }

    document.getElementById(`${prefix}_results_container`).classList.add('hidden');
};

window.deleteSupplier = (id) => {
    if (confirm('Hapus supplier ini?')) { db.delete('suppliers', id); renderMasterSuppliers(); }
};

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ QUICK SUPPLIER CREATION HELPERS â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
window.toggleQuickSupplierForm = (context) => {
    const container = document.getElementById(`${context}_quick_supplier_container`);
    if (container) {
        container.classList.toggle('hidden');
        if (!container.classList.contains('hidden')) {
            const nameInput = document.getElementById(`${context}_sup_name`);
            if (nameInput) nameInput.focus();
        }
    }
};

window.saveQuickSupplier = (context) => {
    const nameInput = document.getElementById(`${context}_sup_name`);
    const phoneInput = document.getElementById(`${context}_sup_phone`);
    const name = nameInput.value.trim();
    const phone = phoneInput.value.trim();

    if (!name) { showToast('Nama supplier harus diisi', 'error'); return; }

    const newSupplier = { name, phone, email: '', address: '' };
    const id = db.insert('suppliers', newSupplier);
    showToast('Supplier baru ditambahkan');

    // Refresh dropdown in the current modal
    const select = document.getElementById(context === 'rfq' ? 'rfq_supplier_id' : 'po_supplier');
    if (select) {
        const suppliers = db.read('suppliers');
        select.innerHTML = (context === 'po' ? '<option value="">-- Pilih Supplier --</option>' : '') +
            suppliers.map(s => `<option value="${s.id}" ${s.id === id ? 'selected' : ''}>${s.name}</option>`).join('');
    }

    // Hide form
    window.toggleQuickSupplierForm(context);
    nameInput.value = '';
    phoneInput.value = '';
};

window.openPOForm = async (fromPrId = null, fromRfqId = null) => {
    // Only navigate if we're not already on the purchase orders page
    const listView = document.getElementById('po-list-view');
    const formView = document.getElementById('po-form-view');
    
    if (!listView || !formView) {
        if (window.navigateTo) await navigateTo('purchase-orders');
    }
    
    // Re-select after navigation
    const lv = document.getElementById('po-list-view');
    const fv = document.getElementById('po-form-view');
    if (!lv || !fv) return;

    lv.classList.add('hidden');
    fv.classList.remove('hidden');

    if (!window.tempPOItems) window.tempPOItems = [];
    if (!fromPrId && !fromRfqId) { window.tempPOItems = []; window.tempPOFromPR = null; window.tempPOFromRFQ = null; }
    if (fromRfqId) window.tempPOFromRFQ = fromRfqId;
    if (fromPrId) window.tempPOFromPR = fromPrId;

    renderBreadcrumb(['Purchasing', 'Purchase Orders', 'Buat PO Baru']);

    const suppliers = db.read('suppliers') || [];
    const todayStr = new Date().toISOString().split('T')[0];

    // Data handling for number generation
    const poNumberStr = generatePurchaseOrderNumber(false, todayStr);

    fv.innerHTML = `
        <div class="animate-in fade-in slide-in-from-bottom-2 duration-400 -m-4 sm:-m-6 h-[calc(100vh-64px)] flex flex-col overflow-hidden bg-white">
            <!-- Sticky Action Bar -->
            <div class="sticky top-0 z-40 bg-white border-b border-slate-100 px-8 py-4 flex items-center justify-between shrink-0 shadow-sm">
                <div></div>
                <div class="flex items-center gap-3">
                    <button type="button" onclick="closePOForm()" class="px-6 py-2.5 bg-slate-100 text-slate-500 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-200 transition-all active:scale-95">Batal</button>
                    <button type="button" onclick="savePO()" class="px-8 py-2.5 bg-blue-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-blue-700 transition-all shadow-lg active:scale-95 flex items-center gap-2">
                        <i class="fas fa-check-circle text-[10px]"></i> Simpan Purchase Order
                    </button>
                </div>
            </div>

            <!-- Scrollable Content -->
            <div class="flex-1 overflow-y-auto bg-slate-50/50 custom-scrollbar pb-32">
                <div class="w-full p-8 space-y-8">

                    <!-- Informasi Dasar -->
                    <div class="bg-white rounded-xl p-6 border border-slate-100 shadow-sm space-y-5">
                        <h3 class="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] flex items-center gap-2">
                            <i class="fas fa-info-circle text-blue-600"></i> Informasi Dasar
                        </h3>
                        <div class="grid grid-cols-1 sm:grid-cols-4 gap-x-4 gap-y-6">
                            <div>
                                <label class="block text-sm font-semibold text-slate-600 mb-2">No. Purchase Order <span class="text-red-400">*</span></label>
                                <div class="flex">
                                     <select id="po_tax_type" onchange="document.getElementById('po_number').value = generatePurchaseOrderNumber(this.value==='A', document.getElementById('po_date').value); renderPOItemsList()"
                                        class="border-none rounded-l-xl px-3 py-3 bg-slate-100 text-xs font-black text-slate-700 outline-none cursor-pointer">
                                        <option value="A">TAX</option>
                                        <option value="B" selected>NT</option>
                                     </select>
                                     <input type="text" id="po_number" value="${poNumberStr}" 
                                        class="w-full border-none rounded-r-xl px-4 py-3 bg-slate-50 font-bold text-slate-400 outline-none" readonly>
                                </div>
                            </div>
                            <div>
                                <label class="block text-sm font-semibold text-slate-600 mb-2">Supplier <span class="text-red-400">*</span></label>
                                <div class="relative" id="po_supplier_container">
                                    <input type="text" id="po_supplier_display" value="-- Pilih Supplier --" readonly
                                        onclick="toggleSupplierDropdown('po_supplier_dropdown')"
                                        class="w-full border-none rounded-xl px-4 py-3 bg-slate-100/80 font-bold text-slate-700 outline-none cursor-pointer">
                                    <input type="hidden" id="po_supplier_id" value="">
                                    <div id="po_supplier_dropdown" class="absolute left-0 mt-2 bg-white border border-slate-100 rounded-xl shadow-2xl z-[200] hidden overflow-hidden min-w-full animate-in fade-in zoom-in-95 duration-200">
                                        <div class="max-h-56 overflow-y-auto p-1">
                                            ${suppliers.map(s => `
                                                <div onclick="selectPurchaseSupplier('PO', '${s.id}', '${s.name.replace(/'/g, "\\'")}')"
                                                    class="px-4 py-2.5 text-sm font-bold text-slate-700 hover:bg-slate-50 rounded-xl cursor-pointer transition-colors m-0.5">
                                                    ${s.name}
                                                </div>
                                            `).join('')}
                                        </div>
                                        <div class="p-2 border-t border-slate-50 bg-white space-y-1">
                                            <button type="button" onclick="navigateToSupplierPage(); closePOForm();"
                                                class="flex items-center gap-3 w-full px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 transition-colors rounded-xl font-bold text-left group whitespace-nowrap">
                                                <div class="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-slate-500 group-hover:bg-blue-100 group-hover:text-blue-600 transition-colors shrink-0">
                                                    <i class="fas fa-plus text-xs"></i>
                                                </div>
                                                Tambah Supplier Baru
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <div>
                                <label class="block text-sm font-semibold text-slate-600 mb-2">Tanggal PO <span class="text-red-400">*</span></label>
                                <input type="date" id="po_date" value="${todayStr}" 
                                    onchange="updatePODueDate(); if(!window._editingPOId) document.getElementById('po_number').value = generatePurchaseOrderNumber(document.getElementById('po_tax_type').value==='A', this.value)"
                                    class="w-full border-none rounded-xl px-4 py-3 bg-slate-100/80 font-bold text-slate-800 outline-none">
                            </div>

                            <div>
                                <label class="block text-sm font-semibold text-slate-600 mb-2">Kategori <span class="text-red-400">*</span></label>
                                <select id="po_category" class="w-full border-none rounded-xl px-4 py-3 bg-slate-100/80 font-bold text-slate-700 outline-none cursor-pointer">
                                    <option value="" disabled selected>-- Pilih Kategori --</option>
                                    <option value="Bahan Baku">Bahan Baku</option>
                                    <option value="Packaging">Packaging</option>
                                    <option value="Perlengkapan">Perlengkapan</option>
                                    <option value="Service">Service</option>
                                    <option value="Sparepart">Sparepart</option>
                                    <option value="Aktiva ( tetap )">Aktiva ( tetap )</option>
                                    <option value="Gas">Gas</option>
                                </select>
                            </div>


                            <div>
                                <label class="block text-sm font-semibold text-slate-600 mb-2">Term Pembayaran <span class="text-red-400">*</span></label>
                                <select id="po_payment_terms" onchange="updatePODueDate()"
                                    class="w-full border-none rounded-xl px-4 py-3 bg-slate-100/80 font-bold text-slate-700 outline-none cursor-pointer">
                                    <option value="">-- Pilih Term --</option>
                                    <option value="Cash">Cash</option>
                                    <option value="COD">COD</option>
                                    <option value="7 S/d 10 Hari">7 S/d 10 Hari</option>
                                    <option value="30 Hari">30 Hari</option>
                                    <option value="45 Hari">45 Hari</option>
                                    <option value="60 Hari">60 Hari</option>
                                </select>
                            </div>
                            <div>
                                <label class="block text-sm font-semibold text-slate-600 mb-2">Tanggal Jatuh Tempo <span class="text-red-400">*</span></label>
                                <input type="date" id="po_due_date" value="${todayStr}"
                                    class="w-full border-none rounded-xl px-4 py-3 bg-slate-100/80 font-bold text-blue-600 outline-none">
                            </div>
                            <div>
                                <label class="block text-sm font-semibold text-slate-600 mb-2">ETD (Estimasi Tiba) <span class="text-red-400">*</span></label>
                                <input type="date" id="po_etd" min="${todayStr}"
                                    class="w-full border-none rounded-xl px-4 py-3 bg-slate-100/80 font-bold text-slate-800 outline-none">
                            </div>
                            <div>
                                <label class="block text-sm font-semibold text-slate-600 mb-2">Pajak (PPN %)</label>
                                <select id="po_tax_rate" onchange="
                                    const isTax = this.value !== '0';
                                    const taxTypeEl = document.getElementById('po_tax_type');
                                    if (taxTypeEl) taxTypeEl.value = isTax ? 'A' : 'B';
                                    const dateVal = document.getElementById('po_date')?.value;
                                    document.getElementById('po_number').value = generatePurchaseOrderNumber(isTax, dateVal);
                                    renderPOItemsList();"
                                    class="w-full border-none rounded-xl px-4 py-3 bg-slate-100/80 font-bold text-slate-700 outline-none cursor-pointer">
                                    <option value="0" ${CONFIG.taxRate == 0 ? 'selected' : ''}>0% (Tanpa Pajak)</option>
                                    <option value="11" ${(CONFIG.taxRate == 11 || !CONFIG.taxRate) ? 'selected' : ''}>11% (PPN)</option>
                                </select>
                            </div>
                        </div>
                    </div>

                    <!-- Item Pembelian -->
                    <div class="bg-white rounded-3xl p-8 border border-slate-100 shadow-sm space-y-4">
                        <h3 class="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] flex items-center gap-2">
                            <i class="fas fa-boxes text-blue-600"></i> Item Pembelian
                        </h3>
                        <!-- Add row -->
                        <div class="grid grid-cols-12 gap-3 items-end">
                            <div class="col-span-5 relative">
                                <label class="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Pilih Produk</label>
                                <input type="text" id="po_item_search" placeholder="-- Cari Kode atau Nama Produk --" autocomplete="off"
                                    onclick="toggleItemProductDropdown('po')" readonly
                                    class="w-full border-none rounded-xl px-4 py-3 bg-slate-100/80 font-bold text-slate-700 shadow-sm focus:ring-2 focus:ring-blue-500/20 outline-none transition-all cursor-pointer">
                                <input type="hidden" id="po_inv_item">
                                <div id="po_item_dropdown" class="absolute left-0 mt-2 w-full bg-white border border-slate-100 rounded-2xl shadow-2xl z-[200] hidden overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                                    <div class="p-3 border-b border-slate-50">
                                        <input type="text" id="po_item_dropdown_search" placeholder="Ketik kode atau nama..." onkeyup="filterItemProductList('po', this.value)" class="w-full px-4 py-2 bg-slate-50 border-none rounded-lg text-xs font-bold outline-none focus:ring-2 focus:ring-blue-500/20">
                                    </div>
                                    <div class="max-h-60 overflow-y-auto p-1" id="po_item_list"></div>
                                    <div class="p-2 border-t border-slate-50 bg-slate-50/10 space-y-1">
                                        <button type="button" onclick="renderMasterProducts()" class="w-full flex items-center gap-3 px-4 py-2.5 text-[10px] font-black text-slate-500 hover:bg-slate-50 hover:text-slate-900 rounded-xl transition-all uppercase tracking-widest">
                                            <div class="w-7 h-7 flex items-center justify-center bg-slate-100 rounded-lg"><i class="fas fa-plus text-[10px]"></i></div>
                                            Create a new Product
                                        </button>
                                        <button type="button" onclick="openAdvancedProductSearch('po')" class="w-full flex items-center gap-3 px-4 py-2.5 text-[10px] font-black text-slate-500 hover:bg-slate-50 hover:text-slate-900 rounded-xl transition-all uppercase tracking-widest">
                                            <div class="w-7 h-7 flex items-center justify-center bg-slate-100 rounded-lg"><i class="fas fa-search text-[10px]"></i></div>
                                            Advanced Search
                                        </button>
                                    </div>
                                </div>
                            </div>
                            <div class="col-span-2">
                                <label class="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Satuan</label>
                                <input id="po_unit" readonly placeholder="Unit"
                                    class="w-full border-none rounded-xl px-4 py-3 bg-slate-100/50 text-sm font-bold text-slate-500 outline-none">
                            </div>
                            <div class="col-span-2">
                                <label class="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Qty</label>
                                <input id="po_qty" type="number" min="1" placeholder="0"
                                    class="w-full border-none rounded-xl px-4 py-3 bg-slate-100/80 text-sm font-bold text-slate-700 outline-none">
                            </div>
                            <div class="col-span-2">
                                <label class="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Harga/unit</label>
                                <input id="po_price" type="number" min="0" placeholder="0"
                                    class="w-full border-none rounded-xl px-4 py-3 bg-slate-100/80 text-sm font-bold text-slate-700 outline-none">
                            </div>
                            <div class="col-span-1">
                                <button onclick="addPOItem()" class="w-full py-3 bg-blue-600 text-white rounded-xl text-sm font-black hover:bg-blue-700 transition-all shadow-md active:scale-95">+</button>
                            </div>
                        </div>

                        <!-- Items table -->
                        <div id="po_items_list" class="overflow-x-auto rounded-xl border border-slate-100"></div>
                        <div id="po_total_display" class="text-right font-black text-slate-800 pt-2"></div>

                        <!-- Notes -->
                        <div class="pt-4 border-t border-dashed border-slate-100">
                            <label class="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Catatan / Keterangan</label>
                            <textarea id="po_notes" rows="3" placeholder="Tambahkan instruksi pengiriman, spesifikasi teknis, atau catatan lainnya..."
                                class="w-full border-none rounded-xl px-4 py-3 bg-slate-100/80 text-sm text-slate-700 outline-none resize-none"></textarea>
                        </div>
                    </div>

                </div>
            </div>
        </div>
    `;

    setTimeout(() => { updatePODueDate(); renderPOItemsList(); }, 80);
};

window.closePOForm = () => {
    const listView = document.getElementById('po-list-view');
    const formView = document.getElementById('po-form-view');
    if (listView) listView.classList.remove('hidden');
    if (formView) formView.classList.add('hidden');
    renderBreadcrumb(['Purchasing', 'Purchase Orders']);
};

// Keep old name as alias
window.openPOModal = window.openPOForm;

window.onPOItemSelect = () => {
    const sel = document.getElementById('po_inv_item');
    const opt = sel?.selectedOptions[0];
    const unitEl = document.getElementById('po_unit');
    if (unitEl) unitEl.value = opt?.dataset.unit || '';
};

window.addPOItem = () => {
    const inventoryItemId = document.getElementById('po_inv_item').value;
    const searchVal = document.getElementById('po_item_search').value;
    
    let prodText = searchVal;
    let unit = document.getElementById('po_unit').value || '-';
    
    if (inventoryItemId) {
        const p = db.findById('inventoryItems', inventoryItemId);
        if (p) {
            prodText = p.itemName;
            unit = document.getElementById('po_unit').value || p.unit || '-';
        }
    }
    
    if (!inventoryItemId && !searchVal.trim()) { showToast('Pilih produk dari daftar', 'error'); return; }

    const qty = parseFloat(document.getElementById('po_qty').value);
    const price = parseFloat(document.getElementById('po_price').value) || 0;
    if (!qty || qty <= 0) { showToast('Qty harus diisi', 'error'); return; }
    window.tempPOItems.push({ inventoryItemId, prodText, unit, qty, price, subtotal: qty * price });
    
    // Reset
    document.getElementById('po_item_search').value = '';
    document.getElementById('po_inv_item').value = '';
    document.getElementById('po_unit').value = '';
    document.getElementById('po_qty').value = '';
    document.getElementById('po_price').value = '';
    renderPOItemsList();
};

function renderPOItemsList() {
    const el = document.getElementById('po_items_list');
    const totalNettoEl = document.getElementById('po_total_netto');
    const totalTaxEl = document.getElementById('po_total_tax');
    const grandTotalEl = document.getElementById('po_grand_total');

    if (!el) return;

    if (!(window.tempPOItems || []).length) {
        el.innerHTML = `
            <div class="p-12 text-center">
                <div class="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4 text-slate-300">
                    <i class="fas fa-shopping-cart text-2xl"></i>
                </div>
                <p class="text-slate-400 font-bold text-xs uppercase tracking-widest">Belum ada item ditambahkan</p>
            </div>
        `;
        if (totalNettoEl) totalNettoEl.innerText = 'Rp 0';
        if (totalTaxEl) totalTaxEl.innerText = 'Rp 0';
        if (grandTotalEl) grandTotalEl.innerText = 'Rp 0';
        return;
    }

    el.innerHTML = `
        <table class="w-full text-sm text-left border-collapse">
            <thead>
                <tr class="bg-slate-50 border-b border-slate-100 text-slate-400 text-[9px] uppercase font-black tracking-widest">
                    <th class="py-4 px-6 w-12 text-center">#</th>
                    <th class="py-4 px-6">Item Code / Product</th>
                    <th class="py-4 px-6 text-center">Qty</th>
                    <th class="py-4 px-6 text-center">Unit</th>
                    <th class="py-4 px-6 text-right">Unit Price</th>
                    <th class="py-4 px-6 text-right">Subtotal</th>
                    <th class="py-4 px-6 w-12 text-center"><i class="fas fa-cog"></i></th>
                </tr>
            </thead>
            <tbody class="divide-y divide-slate-50">
                ${(window.tempPOItems || []).map((i, idx) => `
                    <tr class="group hover:bg-slate-50/50 transition-colors">
                        <td class="py-4 px-6 text-center text-slate-400 font-bold text-xs">${idx + 1}</td>
                        <td class="py-4 px-6">
                            <div class="font-bold text-slate-700">${i.prodText || i.name}</div>
                            <div class="text-[10px] text-slate-400 font-medium">${i.inventoryItemId || 'Non-Inventory'}</div>
                        </td>
                        <td class="py-4 px-6 text-center">
                            <input type="number" step="0.01" value="${i.qty}" 
                                onchange="updatePOItemInline(${idx}, 'qty', this.value)"
                                class="w-20 border-none bg-slate-100/50 rounded-lg px-2 py-1.5 text-center font-bold text-slate-700 outline-none focus:ring-2 focus:ring-blue-500/20 transition-all">
                        </td>
                        <td class="py-4 px-6 text-center text-slate-500 font-bold text-xs">${i.unit || '-'}</td>
                        <td class="py-4 px-6 text-right">
                            <input type="number" step="1" value="${i.price}" 
                                onchange="updatePOItemInline(${idx}, 'price', this.value)"
                                class="w-32 border-none bg-slate-100/50 rounded-lg px-3 py-1.5 text-right font-bold text-slate-700 outline-none focus:ring-2 focus:ring-blue-500/20 transition-all">
                        </td>
                        <td class="py-4 px-6 text-right font-black text-slate-800">${formatCurrency(i.subtotal)}</td>
                        <td class="py-4 px-6 text-center">
                            <button onclick="removePOItem(${idx})" class="w-8 h-8 flex items-center justify-center rounded-lg text-red-400 hover:bg-red-50 hover:text-red-600 transition-all">
                                <i class="fas fa-trash-alt text-xs"></i>
                            </button>
                        </td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
    `;

    // Calculations
    const dpp = (window.tempPOItems || []).reduce((s, i) => s + i.subtotal, 0);
    const taxRateVal = document.getElementById('po_tax_rate')?.value || '0';
    const taxPct = parseFloat(taxRateVal) || 0;
    const taxAmount = Math.round(dpp * taxPct / 100);
    const grandTotal = dpp + taxAmount;

    if (totalNettoEl) totalNettoEl.innerText = formatCurrency(dpp);
    if (totalTaxEl) totalTaxEl.innerText = formatCurrency(taxAmount);
    if (grandTotalEl) grandTotalEl.innerText = formatCurrency(grandTotal);
}

window.updatePOItemInline = (idx, field, value) => {
    if (!window.tempPOItems[idx]) return;
    const val = parseFloat(value) || 0;
    window.tempPOItems[idx][field] = val;
    window.tempPOItems[idx].subtotal = window.tempPOItems[idx].qty * window.tempPOItems[idx].price;
    renderPOItemsList();
};

window.removePOItem = (idx) => { window.tempPOItems.splice(idx, 1); renderPOItemsList(); };

window.savePO = async () => {
    const supId = document.getElementById('po_supplier_id').value;
    const poNum = document.getElementById('po_number').value;
    const poDateEl = document.getElementById('po_date');
    const poEtdEl = document.getElementById('po_etd');
    const taxRateVal = document.getElementById('po_tax_rate').value;
    const taxType = document.getElementById('po_tax_type').value;
    const category = document.getElementById('po_category')?.value || '';

    if (!supId) { showToast('Pilih supplier', 'error'); return; }
    if (!category) { showToast('Pilih kategori pembelian', 'error'); return; }
    const paymentTerms = document.getElementById('po_payment_terms').value;
    const dueDate = document.getElementById('po_due_date').value;
    const notes = document.getElementById('po_notes')?.value || '';

    if (!poDateEl?.value) { showToast('Tanggal PO harus diisi', 'error'); return; }
    if (!paymentTerms) { showToast('Pilih Term Pembayaran', 'error'); return; }
    if (!dueDate) { showToast('Pilih Tanggal Jatuh Tempo', 'error'); return; }
    if (!poEtdEl?.value) { showToast('ETD (Estimasi Tiba) harus diisi', 'error'); return; }
    if (!taxRateVal) { showToast('Pilih tarif pajak', 'error'); return; }
    if (!window.tempPOItems.length) { showToast('Tambah minimal satu item', 'error'); return; }

    const dpp = window.tempPOItems.reduce((s, i) => s + i.subtotal, 0);
    let taxPct = parseFloat(taxRateVal) || 0;

    const taxAmount = Math.round(dpp * taxPct / 100);
    const total = dpp + taxAmount;

    const result = await db.insert('purchaseOrders', {
        poNumber: poNum,
        supplierId: supId,
        requestId: window.tempPOFromPR || window.tempPOFromRFQ || null,
        date: (poDateEl && poDateEl.value) ? new Date(poDateEl.value).toISOString() : new Date().toISOString(),
        paymentTerms,
        dueDate,
        etd: (poEtdEl && poEtdEl.value) ? poEtdEl.value : null,
        actualDeliveryDate: null,
        status: 'DRAFT',
        category: category,
        dppAmount: dpp,
        taxRate: taxRateVal,
        taxAmount: taxAmount,
        totalAmount: total,
        taxType: taxType,
        notes: notes,
        items: window.tempPOItems
    });

    if (window.tempPOFromRFQ) {
        await db.update('purchaseRFQs', window.tempPOFromRFQ, { status: 'PO_CREATED' });
    }

    if (!result) { showToast('Gagal menyimpan PO, coba lagi', 'error'); return; }
    window.tempPOItems = []; window.tempPOFromPR = null; window.tempPOFromRFQ = null;
    showToast('PO Draft berhasil dibuat!', 'success');
    closePOForm();
    await db.sync('purchaseOrders');
    renderPurchaseOrders();
};

window.approvePO = (id) => {
    if (confirm('Approve PO ini?')) { db.update('purchaseOrders', id, { status: 'APPROVED' }); showToast('PO di-approve'); renderPurchaseOrders(); }
};
window.cancelPO = (id) => {
    if (confirm('Batalkan PO ini?')) { db.update('purchaseOrders', id, { status: 'CANCELLED' }); showToast('PO dibatalkan'); renderPurchaseOrders(); }
};

window.generateNPBNumber = () => {
    const d = new Date();
    const dateStr = [
        String(d.getDate()).padStart(2, '0'),
        String(d.getMonth() + 1).padStart(2, '0'),
        d.getFullYear()
    ].join('');
    
    const pos = db.read('purchaseOrders') || [];
    let allReceipts = [];
    pos.forEach(po => {
        if(po.receipts) allReceipts.push(...po.receipts);
    });

    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = String(d.getFullYear());
    const monthYearStr = `${month}${year}`;

    let maxSeq = 0;
    allReceipts.forEach(r => {
        if (!r.npbNumber || !r.npbNumber.startsWith('NPB-')) return;
        const parts = r.npbNumber.split('-');
        if (parts.length < 3) return;
        
        // parts[1] is DDMMYYYY. slice(2) is MMYYYY
        if (parts[1].slice(2) === monthYearStr) {
            const seq = parseInt(parts[2]);
            if (!isNaN(seq) && seq > maxSeq) maxSeq = seq;
        }
    });

    let nextSeq = maxSeq + 1;
    let finalNumber = `NPB-${dateStr}-${String(nextSeq).padStart(3, '0')}`;
    
    while (allReceipts.some(r => r.npbNumber === finalNumber)) {
        nextSeq++;
        finalNumber = `NPB-${dateStr}-${String(nextSeq).padStart(3, '0')}`;
    }

    return finalNumber;
};

window.receiveGoodsPO = (id) => {
    const po = db.findById('purchaseOrders', id);
    if (!po) return;
    
    if (!['APPROVED', 'PARTIALLY RECEIVED'].includes(po.status)) {
        showToast('PO harus APPROVED atau PARTIAL sebelum terima barang', 'error');
        return;
    }

    const rows = (po.items || []).map((i, idx) => {
        const receivedSoFar = i.receivedQty || 0;
        const sisa = Math.max(0, i.qty - receivedSoFar);
        const isCompleted = sisa === 0;

        return `
        <tr class="group hover:bg-slate-50/50 transition-colors">
            <td class="py-5 px-6">
                <div class="flex items-center gap-4">
                    <div class="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-400 group-hover:bg-green-50 group-hover:text-green-600 transition-all border border-slate-200/50">
                        <i class="fas fa-box-open text-xs"></i>
                    </div>
                    <div>
                        <div class="font-black text-slate-800 text-sm uppercase tracking-tight">${i.prodText || i.itemName}</div>
                        <div class="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1 flex items-center gap-2">
                             <span>PESAN: ${invFmt(i.qty)}</span>
                             <span class="w-1 h-1 bg-slate-200 rounded-full"></span>
                             <span>TERIMA: ${invFmt(receivedSoFar)}</span>
                        </div>
                    </div>
                </div>
            </td>
            <td class="py-5 px-6 text-center">
                <div class="inline-flex items-center gap-2 px-3 py-1 bg-slate-50 rounded-full border border-slate-100">
                    <span class="text-xs font-black ${isCompleted ? 'text-slate-400' : 'text-blue-600'}">${invFmt(sisa)}</span>
                    <span class="text-[9px] font-black text-slate-400 uppercase tracking-widest">${i.unit || 'PCS'}</span>
                </div>
            </td>
            <td class="py-5 px-6 text-right">
                <div class="relative inline-block w-32">
                    <input type="number" id="recv_qty_${idx}" value="${sisa}" max="${sisa}" min="0" step="any"
                        ${isCompleted ? 'disabled' : ''}
                        class="w-full border-2 border-transparent bg-slate-100/80 rounded-xl px-4 py-2.5 text-center text-sm font-black text-slate-800 focus:bg-white focus:border-green-500/20 focus:ring-4 focus:ring-green-500/5 outline-none transition-all ${isCompleted ? 'opacity-30 cursor-not-allowed' : ''}">
                </div>
            </td>
        </tr>`;
    }).join('');

    const todayStr = new Date().toISOString().split('T')[0];
    const npbNum = window.generateNPBNumber();
    
    const body = `
        <div class="space-y-6">
            <!-- Summary Info Card -->
            <div class="bg-indigo-50/50 border border-indigo-100/50 p-8 rounded-[2rem] shadow-sm relative overflow-hidden group">
                <div class="absolute top-0 right-0 w-32 h-32 bg-indigo-500/5 rounded-full blur-3xl -mr-10 -mt-10"></div>
                <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 relative z-10">
                    <div class="space-y-2">
                        <label class="block text-[10px] font-black text-indigo-400 uppercase tracking-[0.2em] ml-1">No. NPB (Otomatis)</label>
                        <input type="text" id="recv_npb" value="${npbNum}" readonly 
                            class="w-full border-2 border-indigo-100/30 rounded-2xl px-5 py-3 text-sm font-black text-indigo-700 bg-white/50 outline-none cursor-not-allowed shadow-inner">
                    </div>
                    <div class="space-y-2">
                        <label class="block text-[10px] font-black text-indigo-400 uppercase tracking-[0.2em] ml-1">Tanggal Terima</label>
                        <input type="date" id="recv_date" value="${todayStr}" 
                            class="w-full border-2 border-transparent bg-white rounded-2xl px-5 py-3 text-sm font-black text-slate-700 focus:border-indigo-500/20 focus:ring-4 focus:ring-indigo-500/5 outline-none transition-all shadow-sm">
                    </div>
                    <div class="space-y-2">
                        <label class="block text-[10px] font-black text-indigo-400 uppercase tracking-[0.2em] ml-1">No. SJ Supplier</label>
                        <input type="text" id="recv_sj" placeholder="SJ-XXXXX" 
                            class="w-full border-2 border-transparent bg-white rounded-2xl px-5 py-3 text-sm font-black text-slate-700 focus:border-indigo-500/20 focus:ring-4 focus:ring-indigo-500/5 outline-none transition-all shadow-sm uppercase tracking-widest placeholder:text-slate-300">
                    </div>
                    <div class="space-y-2">
                        <label class="block text-[10px] font-black text-indigo-400 uppercase tracking-[0.2em] ml-1">Nama Penerima</label>
                        <input type="text" id="recv_notes" placeholder="Nama / Keterangan..." 
                            class="w-full border-2 border-transparent bg-white rounded-2xl px-5 py-3 text-sm font-black text-slate-700 focus:border-indigo-500/20 focus:ring-4 focus:ring-indigo-500/5 outline-none transition-all shadow-sm uppercase placeholder:text-slate-300">
                    </div>
                </div>
            </div>
            
            <div class="flex items-center gap-3 px-2">
                <i class="fas fa-info-circle text-indigo-400 text-xs"></i>
                <p class="text-[10px] font-bold text-slate-400 uppercase tracking-widest italic">Masukkan qty aktual yang diterima. Barang yang sudah 100% komplit tidak dapat diinput ulang.</p>
            </div>

            <!-- Items Table -->
            <div class="bg-white rounded-[2rem] border border-slate-100 shadow-sm overflow-hidden">
                <div class="overflow-x-auto">
                    <table class="w-full text-left border-collapse">
                        <thead class="bg-slate-50/50 border-b border-slate-100">
                            <tr class="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">
                                <th class="py-5 px-6">Produk Deskripsi</th>
                                <th class="py-5 px-6 text-center">Sisa Pesanan</th>
                                <th class="py-5 px-6 text-right w-40">Terima Hari Ini</th>
                            </tr>
                        </thead>
                        <tbody class="divide-y divide-slate-50">
                            ${rows}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>`;

    const formView = document.getElementById('gr-form-view');
    const listViewPending = document.getElementById('pgr-pending-list-view');
    const listViewHistory = document.getElementById('pgr-history-list-view');
    const listViewInventory = document.getElementById('por-list-view');
    
    if (!formView) {
        showModal(`Terima Barang - ${po.poNumber}`, body, `
            <div class="flex items-center justify-end gap-3 w-full px-4">
                <button onclick="closeModal()" class="px-6 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest hover:text-red-500 transition-all">Batal</button>
                <button onclick="confirmReceiveGoods('${id}')" class="bg-green-600 hover:bg-slate-900 text-white px-10 py-3.5 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] shadow-xl shadow-green-500/20 transition-all active:scale-95 flex items-center gap-3">
                    <i class="fas fa-check-circle"></i> KONFIRMASI TERIMA
                </button>
            </div>
        `, 'xl');
        return;
    }

    if (listViewPending) listViewPending.classList.add('hidden');
    if (listViewHistory) listViewHistory.classList.add('hidden');
    if (listViewInventory) listViewInventory.classList.add('hidden');
    
    formView.innerHTML = `
        <div class="animate-in fade-in slide-in-from-bottom-4 duration-500 -m-6 h-[calc(100vh-64px)] flex flex-col overflow-hidden bg-slate-50/20">
            <!-- Header Bar -->
            <div class="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200 px-8 py-4 flex justify-between items-center shrink-0 shadow-sm">
                <div class="flex items-center gap-6">
                    <div>
                        <h2 class="text-lg font-bold text-slate-800 uppercase tracking-tight">Terima Barang - <span class="text-blue-600">${po.poNumber}</span></h2>
                    </div>
                </div>
                <div class="flex items-center gap-4">
                    <button onclick="closeGRForm()" class="px-6 py-2.5 text-[10px] font-black text-slate-400 uppercase tracking-widest hover:text-slate-600 transition-all">BATAL</button>
                    <button onclick="confirmReceiveGoods('${id}')" class="px-8 py-2.5 bg-blue-600 text-white rounded-xl text-[10px] font-black uppercase tracking-[0.1em] hover:bg-slate-900 transition-all shadow-lg shadow-blue-500/20 active:scale-95 flex items-center gap-2">
                        <i class="fas fa-check-circle"></i> KONFIRMASI TERIMA
                    </button>
                </div>
            </div>
            
            <!-- Content Area -->
            <div class="flex-1 overflow-y-auto custom-scrollbar bg-white/30 pb-32">
                <div class="w-full px-10 py-10 max-w-7xl mx-auto">
                    ${body}
                </div>
            </div>
        </div>
    `;
    
    formView.classList.remove('hidden');
};

window.confirmReceiveGoods = async (id) => {
    const po = db.findById('purchaseOrders', id);
    const updatedItems = JSON.parse(JSON.stringify(po.items || []));
    let anyReceived = false;
    let sumReceivedAll = 0;
    let sumTargetAll = 0;
    const receivedItems = [];

    const recvDate = document.getElementById('recv_date')?.value || new Date().toISOString().split('T')[0];
    const recvNpb = document.getElementById('recv_npb')?.value || '';
    const recvSj = document.getElementById('recv_sj')?.value || '';
    const recvNotes = document.getElementById('recv_notes')?.value || '';

    updatedItems.forEach((item, idx) => {
        const recvInput = document.getElementById(`recv_qty_${idx}`);
        sumTargetAll += item.qty;

        if (!recvInput || recvInput.disabled) {
            sumReceivedAll += (item.receivedQty || 0);
            return;
        }

        const recvQty = parseFloat(recvInput.value) || 0;
        item.receivedQty = (item.receivedQty || 0) + recvQty;
        sumReceivedAll += item.receivedQty;

        if (recvQty > 0) {
            receivedItems.push({
                index: idx,
                prodText: item.prodText || item.itemName || '',
                qty: recvQty,
                unit: item.unit || '',
                inventoryItemId: item.inventoryItemId,
                price: item.price || 0
            });
            anyReceived = true;
        }
    });

    if (!anyReceived) { showToast('Tidak ada barang tambahan yang dimasukkan', 'error'); return; }

    try {
        // Use Phase 2 API for Atomic Transaction (Stock IN + Journal + Status Update)
        const result = await api.receivePOGoods(id, {
            receivedItems, recvDate, recvNpb, recvSj, recvNotes
        });

        // Optimistic UI update
        if (!po.receipts) po.receipts = [];
        po.receipts.push({
            id: Date.now().toString(),
            date: recvDate,
            npbNumber: recvNpb,
            suratJalan: recvSj,
            npb: recvNpb,
            notes: recvNotes,
            items: receivedItems
        });

        db.update('purchaseOrders', id, {
            status: result.newStatus,
            receivedAt: new Date(recvDate).toISOString(),
            actualDeliveryDate: result.isCompleted ? recvDate : (po.actualDeliveryDate || null),
            items: updatedItems,
            receipts: po.receipts
        });

        if (typeof addNotification === 'function') {
            const msg = result.isCompleted
                ? `PO ${po.poNumber} telah DITERIMA PENUH.`
                : `PO ${po.poNumber} DITERIMA SEBAGIAN - sisa ${result.remaining} unit.`;
            addNotification('Barang Diterima', msg);
        }
        showToast(result.message, result.isCompleted ? 'success' : 'info');
        if (window.closeGRForm) window.closeGRForm();
        else closeModal();
        // Refresh the current view
        if (window._porActiveTab && typeof renderInventoryPOReceipt === 'function') {
             renderInventoryPOReceipt();
        } else if (window.renderPurchaseReceiving && document.getElementById('pageTitle')?.innerText.includes('Received')) {
             renderPurchaseReceiving();
        } else if (window.renderPurchaseOrders) {
             renderPurchaseOrders();
        }
        // Auto-offer print NPB after save
        setTimeout(() => {
            if (confirm(`Barang berhasil diterima (${recvNpb}). Cetak NPB sekarang?`)) {
                printNPB(id);
            }
        }, 400);
    } catch (err) {
        showToast(err.message, 'error');
    }
};

window.viewPO = (id) => {
    const po = db.findById('purchaseOrders', id);
    const suppliers = db.read('suppliers');
    const sup = suppliers.find(s => s.id === po.supplierId) || { name: '-' };
    const itemRows = (po.items || []).map(i => `
        <tr class="border-b border-gray-100">
            <td class="py-2 px-2">${i.prodText}</td>
            <td class="py-2 px-2 text-right">${formatNumber(i.qty)} ${i.unit || ''}</td>
            <td class="py-2 px-2 text-right">${formatCurrency(i.price)}</td>
            <td class="py-2 px-2 text-right font-medium">${formatCurrency(i.subtotal)}</td>
        </tr>`).join('');

    // --- Delivery timeline section ---
    const today = new Date(); today.setHours(0, 0, 0, 0);
    let deliveryHtml = '';
    if (po.etd) {
        const etdDate = new Date(po.etd); etdDate.setHours(0, 0, 0, 0);
        let etdLabel = `<span class="font-medium text-gray-800">${po.etd.split('T')[0]}</span>`;
        let delayBadge = '';
        if (po.actualDeliveryDate) {
            const actDate = new Date(po.actualDeliveryDate); actDate.setHours(0, 0, 0, 0);
            const diffDays = Math.round((actDate - etdDate) / 86400000);
            if (diffDays <= 0) {
                delayBadge = `<span class="ml-2 px-2 py-0.5 bg-green-100 text-green-700 rounded text-xs font-semibold">âœ“ On Time${diffDays < 0 ? ' (' + Math.abs(diffDays) + ' hari lebih cepat)' : ''}</span>`;
            } else {
                delayBadge = `<span class="ml-2 px-2 py-0.5 bg-red-100 text-red-700 rounded text-xs font-semibold">âš  Delay ${diffDays} Hari</span>`;
            }
        } else if (po.status !== 'RECEIVED' && today > etdDate) {
            const overdue = Math.round((today - etdDate) / 86400000);
            delayBadge = `<span class="ml-2 px-2 py-0.5 bg-orange-100 text-orange-700 rounded text-xs font-semibold">âš  Terlambat ${overdue} Hari</span>`;
        }
        deliveryHtml = `
        <div class="my-4 p-3 bg-blue-50 border border-blue-100 rounded-lg text-sm">
            <h3 class="text-xs font-semibold text-blue-600 uppercase tracking-wider mb-2">Info Pengiriman & Pembayaran</h3>
            <div class="grid grid-cols-2 lg:grid-cols-5 gap-3">
                <div>
                    <p class="text-gray-500 text-xs">Tanggal PO</p>
                    <p class="font-medium text-gray-800">${po.date ? po.date.split('T')[0] : '-'}</p>
                </div>
                <div>
                    <p class="text-gray-500 text-xs">Term Pembayaran</p>
                    <p class="font-medium text-gray-800">${po.paymentTerms || '-'}</p>
                </div>
                <div>
                    <p class="text-gray-500 text-xs">Jatuh Tempo</p>
                    <p class="font-medium text-orange-600 font-bold">${po.dueDate ? po.dueDate.split('T')[0] : '-'}</p>
                </div>
                <div>
                    <p class="text-gray-500 text-xs">ETD (Estimasi Tiba)</p>
                    <p>${etdLabel}${po.actualDeliveryDate ? '' : delayBadge}</p>
                </div>
                <div>
                    <p class="text-gray-500 text-xs">Actual Delivery</p>
                    <p class="font-medium ${po.actualDeliveryDate ? 'text-green-700' : 'text-gray-400'}">${po.actualDeliveryDate ? po.actualDeliveryDate.split('T')[0] : 'Belum diterima'} ${po.actualDeliveryDate ? delayBadge : ''}</p>
                </div>
            </div>
        </div>`;
    }

    const poHasTax = (po.taxRate || 0) > 0;
    const poCompanyHeader = poHasTax
        ? `<div class="text-right" style="display:flex;align-items:center;gap:12px;justify-content:flex-end;">
                ${CONFIG.logo ? `<img src="${CONFIG.logo}" alt="Logo" style="height:48px;width:auto;object-fit:contain;">` : ''}
                <div>
                    <h1 class="text-xl font-bold text-blue-800">${CONFIG.companyName}</h1>
                    <p class="text-sm text-gray-500">${CONFIG.companyAddress || ''}</p>
                </div>
           </div>`
        : `<div class="text-right">
                <h1 class="text-xl font-bold text-blue-800">${CONFIG.companyName}</h1>
           </div>`;

    const printable = `<div class="max-w-4xl mx-auto bg-white p-6">
        <div class="flex justify-between items-start mb-6">
            <div><h2 class="text-3xl font-bold text-gray-800">PURCHASE ORDER</h2><p class="text-gray-500">${po.poNumber}</p></div>
            ${poCompanyHeader}
        </div>
        <div class="grid grid-cols-2 gap-8 mb-4">
            <div><h3 class="text-xs font-semibold text-gray-500 uppercase mb-1">Supplier</h3>
                <p class="font-medium">${sup.name}</p><p class="text-sm text-gray-600">${sup.phone || ''}</p>
                ${po.category ? `<p class="text-xs mt-1"><span class="font-semibold text-gray-500">Kategori:</span> <span class="font-bold text-indigo-600">${po.category}</span></p>` : ''}
            </div>
            <div class="text-right"><h3 class="text-xs font-semibold text-gray-500 uppercase mb-1">Detail</h3>
                <p class="text-sm">Tanggal PO: ${po.date ? po.date.split('T')[0] : '-'}</p>
                <p class="text-sm">Term Pembayaran: <strong>${po.paymentTerms || '-'}</strong></p>
                <p class="text-sm">Jatuh Tempo: <strong>${po.dueDate ? po.dueDate.split('T')[0] : '-'}</strong></p>
                ${po.etd ? `<p class="text-sm">ETD: <strong>${po.etd.split('T')[0]}</strong></p>` : ''}
                ${po.actualDeliveryDate ? `<p class="text-sm">Tiba: <strong>${po.actualDeliveryDate.split('T')[0]}</strong></p>` : ''}
                <p class="text-sm">Status: ${statusBadgePurch(po.status)}</p></div>
        </div>
        ${deliveryHtml}
        <table class="w-full border-collapse mb-6"><thead>
            <tr class="border-b-2 border-gray-800 text-sm"><th class="py-2 px-2">Produk</th><th class="py-2 px-2 text-right">Qty</th><th class="py-2 px-2 text-right">Harga</th><th class="py-2 px-2 text-right">Subtotal</th></tr>
        </thead><tbody>${itemRows}</tbody>
        <tfoot>
            <tr>
                <td colspan="3" class="py-2 px-2 text-right text-gray-500 font-medium">DPP (Sebelum Pajak):</td>
                <td class="py-2 px-2 text-right font-medium text-gray-800">${formatCurrency(po.dppAmount || po.totalAmount)}</td>
            </tr>
            <tr>
                <td colspan="3" class="py-1 px-2 text-right text-gray-500 font-medium">${(po.taxRate || 0)}% (PPN):</td>
                <td class="py-1 px-2 text-right font-medium text-orange-600">${formatCurrency(po.taxAmount || 0)}</td>
            </tr>
            <tr class="border-t-2 border-gray-800">
                <td colspan="3" class="py-3 px-2 text-right font-bold text-lg">Grand Total:</td>
                <td class="py-3 px-2 text-right font-bold text-blue-600 text-lg">${formatCurrency(po.totalAmount)}</td>
            </tr>
        </tfoot>
        </table>
        
        ${po.notes ? `<div class="mb-8 p-3 border border-gray-200 rounded-lg bg-gray-50/50">
            <h4 class="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Catatan / Keterangan:</h4>
            <p class="text-xs text-gray-700 whitespace-pre-wrap">${po.notes}</p>
        </div>` : ''}

        <div class="grid grid-cols-4 gap-4 mt-12 text-center">
            <div class="space-y-16">
                <p class="text-[10px] font-black text-gray-400 uppercase tracking-widest">Di Buat</p>
                <div class="border-b border-gray-300 w-3/4 mx-auto"></div>
            </div>
            <div class="space-y-16">
                <p class="text-[10px] font-black text-gray-400 uppercase tracking-widest">Di Ketahui</p>
                <div class="border-b border-gray-300 w-3/4 mx-auto"></div>
            </div>
            <div class="space-y-16">
                <p class="text-[10px] font-black text-gray-400 uppercase tracking-widest">Di Setujui</p>
                <div class="border-b border-gray-300 w-3/4 mx-auto"></div>
            </div>
            <div class="space-y-16">
                <p class="text-[10px] font-black text-gray-400 uppercase tracking-widest">Di Terima</p>
                <div class="border-b border-gray-300 w-3/4 mx-auto"></div>
            </div>
        </div>
    </div>`;
    const mainContent = document.getElementById('main-content');
    
    // Set breadcrumb
    renderBreadcrumb(['Purchasing', 'Purchase Orders', 'Detail ' + po.poNumber]);

    mainContent.innerHTML = `
        <div class="animate-in fade-in slide-in-from-bottom-2 duration-400 -m-6 h-[calc(100vh-64px)] flex flex-col overflow-hidden bg-white">
            <!-- Record Header / Action Bar (STICKY AREA) -->
            <div class="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200 px-8 py-5 flex items-center justify-between shrink-0 shadow-sm">
                <div class="flex items-center gap-6">
                    <div>
                        <h2 class="text-xl font-black text-slate-800 tracking-tight">Detail PO</h2>
                        <p class="text-xs text-slate-500 font-mono mt-0.5">${po.poNumber}</p>
                    </div>
                    <div class="w-px h-8 bg-slate-200"></div>
                    <div class="px-4 py-1.5 rounded-full bg-blue-600 text-white text-[10px] font-black tracking-widest uppercase shadow-sm shadow-blue-600/20">
                        ${po.status}
                    </div>
                </div>
                
                <div class="flex items-center gap-3">
                    <button onclick='printHTML(\`${printable.replace(/`/g, "\\`").replace(/\n/g, "")}\`, "PO ${po.poNumber}", true)' 
                        class="px-6 py-2.5 bg-white border border-slate-200 text-slate-700 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-50 hover:border-slate-300 transition-all flex items-center gap-2 active:scale-95 shadow-sm">
                        <i class="fas fa-print text-slate-400"></i> Print PDF
                    </button>
                    <button onclick="openSendPOModal('${po.id}')" 
                        class="px-6 py-2.5 bg-blue-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-blue-700 transition-all flex items-center gap-2 active:scale-95 shadow-md shadow-blue-600/20">
                        <i class="fas fa-paper-plane mr-1 text-blue-200 text-[9px]"></i> Kirim
                    </button>
                    <div class="w-px h-6 bg-slate-200 mx-2"></div>
                    <button onclick="renderPurchaseOrders()" class="px-6 py-2.5 bg-slate-900 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-black transition-all shadow-md active:scale-95 group">
                        Kembali <i class="fas fa-times ml-2 text-slate-400 group-hover:text-white"></i>
                    </button>
                </div>
            </div>

            <!-- Scrollable Content Area -->
            <div class="flex-1 overflow-y-auto bg-slate-50/50 custom-scrollbar pb-24 pt-8">
                ${printable}
            </div>
        </div>
    `;
};

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ PURCHASE INVOICES â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€


// ─────────────────────── PRINT NPB ──────────────────────────────
window.printNPB = function(poId, receiptId = null) {
    const po = db.findById('purchaseOrders', poId);
    if (!po) { showToast('Purchase Order tidak ditemukan.', 'error'); return; }
    if (!po.receipts || po.receipts.length === 0) { showToast('Belum ada riwayat penerimaan.', 'error'); return; }

    const receipt = receiptId ? po.receipts.find(r => r.id === receiptId) : po.receipts[po.receipts.length - 1];
    if (!receipt) { showToast('Data NPB tidak ditemukan.', 'error'); return; }

    const sup = db.findById('suppliers', po.supplierId) || { name: 'Supplier' };
    const cfg = JSON.parse(localStorage.getItem('unityerp_company_config') || '{}');
    const company = {
        name: cfg.companyName || (typeof CONFIG !== 'undefined' ? CONFIG.companyName : 'PT. NAMA PERUSAHAAN'),
        address: cfg.companyAddress || (typeof CONFIG !== 'undefined' ? CONFIG.companyAddress : 'Jl. Alamat Perusahaan'),
        phone: cfg.companyPhone || (typeof CONFIG !== 'undefined' ? CONFIG.companyPhone : '-'),
        email: cfg.companyEmail || (typeof CONFIG !== 'undefined' ? CONFIG.companyEmail : '-'),
        logo: cfg.logo || (typeof CONFIG !== 'undefined' ? CONFIG.logo : '')
    };

    const isNonTax = po.taxRate == 0 || (po.poNumber && po.poNumber.includes('-B-'));
    const npbNo = receipt.npbNumber || receipt.npb || '-';
    
    const itemsTable = `
        <table style="width:100%;border-collapse:collapse;margin-top:20px;">
            <thead>
                <tr style="background:#f1f5f9;border-bottom:2px solid #334155;">
                    <th style="padding:10px 8px;text-align:center;font-size:10px;text-transform:uppercase;width:40px">No</th>
                    <th style="padding:10px 8px;text-align:left;font-size:10px;text-transform:uppercase">Deskripsi Barang</th>
                    <th style="padding:10px 8px;text-align:center;font-size:10px;text-transform:uppercase;width:80px">Diterima</th>
                    <th style="padding:10px 8px;text-align:center;font-size:10px;text-transform:uppercase;width:80px">Satuan</th>
                    <th style="padding:10px 8px;text-align:center;font-size:10px;text-transform:uppercase;width:100px">Keterangan</th>
                </tr>
            </thead>
            <tbody>
                ${(receipt.items || []).map((item, i) => `
                    <tr style="border-bottom:1px solid #e2e8f0;">
                        <td style="padding:6px 8px;text-align:center;font-size:10px;">${i+1}</td>
                        <td style="padding:6px 8px;text-align:left;font-size:10px;">
                            <div style="font-weight:bold;text-transform:uppercase">${item.prodText || item.name || '-'}</div>
                        </td>
                        <td style="padding:6px 8px;text-align:center;font-size:11px;font-weight:900">${(item.receivedQty || item.qty || 0).toLocaleString('id-ID')}</td>
                        <td style="padding:6px 8px;text-align:center;font-size:10px;font-weight:bold;color:#64748b">${item.unit || 'PCS'}</td>
                        <td style="padding:6px 8px;text-align:center;font-size:10px;color:#334155">-</td>
                    </tr>
                `).join('')}
                 ${[...Array(Math.max(0, 5 - (receipt.items?.length || 0)))].map(() => `
                    <tr style="border-bottom:1px solid #e2e8f0;height:25px">
                        <td style="padding:6px 8px;">&nbsp;</td>
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
            <title>NPB ${npbNo}</title>
            <style>
                @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;700;900&display=swap');
                * { margin:0; padding:0; box-sizing:border-box; font-family:'Inter', sans-serif; }
                body { padding:20px; color:#1e293b; background:#e2e8f0; margin:0; }
                .header { display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:15px; border-bottom:3px solid #0f172a; padding-bottom:10px; }
                .company-name { font-size:20px; font-weight:900; color:#0f172a; text-transform:uppercase; letter-spacing:-0.5px; }
                .company-info { font-size:9px; color:#64748b; margin-top:3px; line-height:1.4; font-weight:500; }
                .doc-type { text-align:right; }
                .doc-type h1 { font-size:20px; font-weight:900; color:#0f172a; margin:0; line-height:1; }
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
                .page { background:#fff; padding:30px; border:1px solid #cbd5e1; border-radius:8px; box-shadow:0 4px 20px rgba(0,0,0,0.1); }
                @media print { body { padding:0; background:#fff; } .page { margin:0; padding:0; border:none; border-radius:0; box-shadow:none; } }
            </style>
        </head>
        <body>
            <div class="page">
                <div class="header">
                    <div style="display:flex;align-items:center;gap:15px;">
                        ${(!isNonTax && company.logo) ? `<img src="${company.logo}" alt="Logo" style="height:50px;width:auto;object-fit:contain;">` : ''}
                        <div>
                            <div class="company-name">${company.name}</div>
                            ${!isNonTax ? `<div class="company-info">${company.address}<br>Tel: ${company.phone} | Email: ${company.email}</div>` : ''}
                        </div>
                    </div>
                    <div class="doc-type">
                        <h1>NOTA PENERIMAAN BARANG</h1>
                        <div class="doc-no">${npbNo}</div>
                    </div>
                </div>

                <div style="display:grid;grid-template-columns:1fr 1fr;gap:30px;">
                    <div>
                        <table class="meta-table">
                            <tr><td class="label">Penerima</td><td style="width:10px">:</td><td class="value">${receipt.receiver || 'Gudang Internal'}</td></tr>
                            <tr><td class="label">Tanggal Terima</td><td style="width:10px">:</td><td class="value">${(receipt.date || po.date).split('T')[0]}</td></tr>
                            <tr><td class="label">Ref. PO</td><td style="width:10px">:</td><td class="value" style="color:#2563eb">${po.poNumber}</td></tr>
                        </table>
                    </div>
                    <div>
                        <table class="meta-table">
                            <tr><td class="label">Supplier</td><td style="width:10px">:</td><td class="value">${sup.name}</td></tr>
                            <tr><td class="label">No. Surat Jalan</td><td style="width:10px">:</td><td class="value">${receipt.suratJalan || receipt.sjNumber || '-'}</td></tr>
                        </table>
                    </div>
                </div>

                ${itemsTable}

                ${receipt.notes ? `
                <div class="notes">
                    <strong>Keterangan:</strong><br>
                    ${receipt.notes}
                </div>
                ` : ''}

                <div class="signatures">
                    <div class="sig-box">
                        <div class="sig-title">Pengirim (Supplier)</div>
                        <div class="sig-line"></div>
                        <div class="sig-name">Nama & Tanda Tangan</div>
                    </div>
                    <div class="sig-box">
                        <div class="sig-title">Penerima (Gudang)</div>
                        <div class="sig-line"></div>
                        <div class="sig-name">${receipt.receiver || 'Bagian Gudang'}</div>
                    </div>
                    <div class="sig-box">
                        <div class="sig-title">Mengetahui</div>
                        <div class="sig-line"></div>
                        <div class="sig-name">Purchasing / Admin</div>
                    </div>
                </div>
            </div>
        </body>
        </html>
    `;

    const printWindow = window.open('', '_blank');
    if (printWindow) {
        printWindow.document.write(printHtml);
        printWindow.document.close();
        printWindow.focus();
        setTimeout(() => {
            printWindow.print();
        }, 500);
    } else {
        showToast('Pop-up diblokir oleh browser. Izinkan pop-up untuk mencetak.', 'error');
    }
};

window.createPurchaseInvoice = (poId) => {
    openPurchaseInvoiceForm(poId);
};

window.openPurchaseOrderSelectionForInvoice = () => {
    const pos = db.read('purchaseOrders').filter(po =>
        (po.status === 'RECEIVED' || po.status === 'PARTIALLY RECEIVED')
    );
    const invoices = db.read('purchaseInvoices');
    const eligiblePOs = pos.filter(po => !invoices.some(inv => inv.purchaseOrderId === po.id));
    const suppliers = db.read('suppliers');

    if (!eligiblePOs.length) {
        showToast('No eligible Purchase Orders found that haven\'t been invoiced.', 'info');
        return;
    }

    const rows = eligiblePOs.map(po => {
        const sup = suppliers.find(s => s.id === po.supplierId) || { name: 'Unknown' };
        return `
            <tr class="border-b border-gray-100 hover:bg-gray-50 cursor-pointer" onclick="openPurchaseInvoiceForm('${po.id}')">
                <td class="py-3 px-4 text-sm font-medium text-blue-600">${po.poNumber}</td>
                <td class="py-3 px-4 text-sm text-gray-600">${formatDate(po.date).slice(0, 11)}</td>
                <td class="py-3 px-4 text-sm text-gray-800">${sup.name}</td>
                <td class="py-3 px-4 text-sm text-right font-semibold">${formatCurrency(po.totalAmount)}</td>
                <td class="py-3 px-4 text-sm text-center">
                    <button class="text-purple-600 hover:text-purple-800 font-bold text-xs">Select</button>
                </td>
            </tr>
        `;
    }).join('');

    const body = `
        <div class="mb-4">
            <p class="text-sm text-gray-500 mb-4">Select a Purchase Order to create a payment request/invoice.</p>
            <div class="max-h-[400px] overflow-y-auto border rounded-lg">
                <table class="w-full text-left border-collapse">
                    <thead class="sticky top-0 bg-gray-50 shadow-sm">
                        <tr class="border-b">
                            <th class="py-2 px-4 text-xs font-bold uppercase text-gray-500">PO Number</th>
                            <th class="py-2 px-4 text-xs font-bold uppercase text-gray-500">Date</th>
                            <th class="py-2 px-4 text-xs font-bold uppercase text-gray-500">Supplier</th>
                            <th class="py-2 px-4 text-xs font-bold uppercase text-gray-500 text-right">Total</th>
                            <th class="py-2 px-4 text-xs font-bold uppercase text-gray-500 text-center"></th>
                        </tr>
                    </thead>
                    <tbody>${rows}</tbody>
                </table>
            </div>
        </div>
    `;

    showModal('Select Purchase Order', body, `<button onclick="closeModal()" class="w-full sm:w-auto inline-flex justify-center rounded-md border border-gray-300 px-4 py-2 bg-white text-gray-700 text-sm font-medium">Cancel</button>`, 'lg');
};

window.openPurchaseInvoiceForm = (poId = null, receiptId = null) => {
    const allPOs = db.read('purchaseOrders').filter(po => po.receipts && po.receipts.length > 0);
    const invoices = db.read('purchaseInvoices') || [];
    const suppliers = db.read('suppliers');
    
    window.tempUninvoicedReceipts = [];
    allPOs.forEach(po => {
        (po.receipts || []).forEach((rcpt, idx) => {
            const isInv = invoices.some(inv => inv.purchaseOrderId === po.id && inv.receiptId === rcpt.id);
            if (!isInv) {
                const supplierName = (suppliers.find(s => s.id === po.supplierId) || { name: '-' }).name;
                window.tempUninvoicedReceipts.push({
                    po: po,
                    receipt: rcpt,
                    idx: idx + 1,
                    supplierId: po.supplierId,
                    supplierName: supplierName
                });
            }
        });
    });

    const uniqueSuppliers = [...new Map(window.tempUninvoicedReceipts.map(item => [item.supplierId, {id: item.supplierId, name: item.supplierName}])).values()];

    const today = new Date().toISOString().split('T')[0];
    const po = poId ? db.findById('purchaseOrders', poId) : null;
    let preselectedSupplierId = po ? po.supplierId : '';
    let preselectedSupplierName = '-- Semua Supplier --';
    if (preselectedSupplierId) {
        const s = uniqueSuppliers.find(x => x.id === preselectedSupplierId);
        if (s) preselectedSupplierName = s.name;
    }

    const supplierOptionsHtml = `
        <div class="max-h-56 overflow-y-auto p-1">
            <div onclick="selectPurchaseInvoiceSupplier('', '-- Semua Supplier --')"
                class="px-4 py-2.5 text-sm font-bold text-slate-700 hover:bg-slate-50 rounded-xl cursor-pointer transition-colors m-0.5">
                -- Semua Supplier --
            </div>
            ${uniqueSuppliers.map(s => `
                <div onclick="selectPurchaseInvoiceSupplier('${s.id}', '${s.name.replace(/'/g, "\\'")}')"
                    class="px-4 py-2.5 text-sm font-bold text-slate-700 hover:bg-slate-50 rounded-xl cursor-pointer transition-colors m-0.5">
                    ${s.name}
                </div>
            `).join('')}
        </div>
        <div class="p-2 border-t border-slate-50 bg-white space-y-1">
            <button type="button" onclick="openAdvancedSupplierSearch('PINV')"
                class="w-full flex items-center gap-3 px-4 py-3 text-sm font-bold text-slate-700 hover:bg-slate-50 rounded-xl transition-all">
                <div class="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-slate-400">
                    <i class="fas fa-search"></i>
                </div>
                Advanced Search
            </button>
        </div>
    `;

    const body = `
        <div class="space-y-5">
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                    <label class="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Pilih Supplier</label>
                    <div class="relative" id="pinv_supplier_container">
                        <input type="text" id="pinv_supplier_display" value="${preselectedSupplierName}" readonly
                            onclick="toggleSupplierDropdown('pinv_supplier_dropdown')"
                            class="w-full border-2 border-slate-100 rounded-xl px-4 py-3 bg-slate-50 font-bold text-slate-700 outline-none cursor-pointer">
                        <input type="hidden" id="pinv_supplier_id" value="${preselectedSupplierId}">
                        <div id="pinv_supplier_dropdown" class="absolute left-0 mt-2 bg-white border border-slate-100 rounded-xl shadow-2xl z-[200] hidden overflow-hidden min-w-full animate-in fade-in zoom-in-95 duration-200">
                            ${supplierOptionsHtml}
                        </div>
                    </div>
                </div>
                <div>
                    <label class="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Pilih Nomor PO / Penerimaan Barang</label>
                    <div class="relative" id="pinv_po_container">
                        <input type="text" id="pinv_po_display" value="-- Silakan Pilih Penerimaan Barang --" readonly
                            onclick="togglePurchaseInvoicePoDropdown()"
                            class="w-full border-2 border-slate-100 rounded-xl px-4 py-3 bg-slate-50 font-bold text-slate-700 outline-none cursor-pointer">
                        <input type="hidden" id="pinv_po_id">
                        <div id="pinv_po_dropdown" class="absolute left-0 mt-2 bg-white border border-slate-100 rounded-xl shadow-2xl z-[200] hidden overflow-hidden min-w-full animate-in fade-in zoom-in-95 duration-200">
                            <div class="p-3 border-b border-slate-50">
                                <input type="text" id="pinv_po_dropdown_search" placeholder="Cari NPB atau PO..." onkeyup="filterPurchaseInvoicePoList(this.value)" class="w-full px-4 py-2 bg-slate-50 border-none rounded-lg text-xs font-bold outline-none focus:ring-2 focus:ring-blue-500/20">
                            </div>
                            <div class="max-h-60 overflow-y-auto p-1" id="pinv_po_list">
                                <!-- Populated dynamically -->
                            </div>
                        </div>
                    </div>
                    <input type="hidden" id="pinv_receipt_total" value="0">
                </div>
            </div>

            <div class="grid grid-cols-2 gap-4">
                <div>
                    <label class="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Supplier Invoice No.</label>
                    <input type="text" id="pinv_number" class="w-full border-2 border-slate-200 rounded-xl px-4 py-3 text-sm font-bold text-slate-700 focus:border-blue-500 outline-none transition-all placeholder:text-slate-300 bg-white" placeholder="e.g. INV/2024/001">
                </div>
                <div>
                    <label class="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Invoice Receipt Date</label>
                    <input type="date" id="pinv_date" value="${today}" class="w-full border-2 border-slate-100 rounded-xl px-4 py-3 text-sm font-bold text-slate-700 focus:border-blue-500 outline-none transition-all">
                </div>
                <div>
                    <label class="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Payment Terms</label>
                    <select id="pinv_terms" onchange="calculatePurchaseInvoiceDueDate()" class="w-full border-2 border-slate-100 rounded-xl px-4 py-3 text-sm font-bold text-slate-700 focus:border-blue-500 outline-none transition-all">
                        <option value="0">Cash / COD</option>
                        <option value="7">Net 7 Days</option>
                        <option value="15">Net 15 Days</option>
                        <option value="30">Net 30 Days</option>
                        <option value="45">Net 45 Days</option>
                        <option value="60">Net 60 Days</option>
                    </select>
                </div>
                <div>
                    <label class="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Due Date</label>
                    <input type="date" id="pinv_due_date" value="${today}" class="w-full border-2 border-slate-100 rounded-xl px-4 py-3 text-sm font-black text-blue-600 bg-blue-50/50 outline-none cursor-not-allowed" readonly>
                </div>
            </div>
            <div id="pinv_po_detail_card" class="p-4 bg-indigo-50 border-2 border-indigo-100 rounded-2xl ${po ? '' : 'hidden'} transition-all duration-500">
                <div class="flex justify-between items-center mb-2">
                    <span id="pinv_po_num_label" class="text-[10px] font-black text-indigo-600 uppercase tracking-widest">PO DETAIL: ${po?.poNumber || ''}</span>
                    <span id="pinv_po_date_label" class="text-[9px] font-bold text-slate-400 uppercase">${po ? formatDate(po.date).slice(0, 11) : ''}</span>
                </div>
                <div class="flex justify-between items-end">
                    <p class="text-xs text-slate-500 font-bold uppercase tracking-tight">Total Tagihan:</p>
                    <p id="pinv_po_amount_label" class="text-xl font-black text-indigo-700">${po ? formatCurrency(po.totalAmount) : ''}</p>
                </div>
            </div>

            <div class="pt-2">
                <label class="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 border-b border-slate-100 pb-2">Informasi Transfer Bank Supplier</label>
                <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                        <label class="block text-[9px] font-black text-slate-400 uppercase mb-1 ml-1">Nama Bank</label>
                        <input type="text" id="pinv_bank_name" class="w-full border border-slate-200 rounded-lg px-3 py-2 text-xs font-bold text-slate-600" placeholder="Contoh: BCA">
                    </div>
                    <div>
                        <label class="block text-[9px] font-black text-slate-400 uppercase mb-1 ml-1">Nomor Rekening</label>
                        <input type="text" id="pinv_bank_account" class="w-full border border-slate-200 rounded-lg px-3 py-2 text-xs font-bold text-slate-600" placeholder="123456789">
                    </div>
                    <div>
                        <label class="block text-[9px] font-black text-slate-400 uppercase mb-1 ml-1">Atas Nama</label>
                        <input type="text" id="pinv_bank_holder" class="w-full border border-slate-200 rounded-lg px-3 py-2 text-xs font-bold text-slate-600" placeholder="Nama Pemilik">
                    </div>
                </div>
            </div>

            <div>
                <label class="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Upload Invoice (PDF/Image)</label>
                <div class="border-2 border-slate-100 border-dashed rounded-2xl p-4 text-center bg-slate-50/50 hover:border-blue-400 transition-colors group cursor-pointer relative">
                    <input type="file" id="pinv_file" class="hidden" onchange="updateInvoiceFileDisplay(this)" accept="image/*,application/pdf">
                    <label for="pinv_file" class="cursor-pointer">
                        <i id="pinv_file_icon" class="fas fa-file-invoice text-slate-300 text-2xl mb-2 group-hover:text-blue-500 transition-colors"></i>
                        <p id="pinv_file_name" class="text-[10px] font-black text-slate-400 uppercase tracking-widest group-hover:text-blue-600">Klik untuk upload dokumen</p>
                    </label>
                </div>
            </div>
        </div>
    `;

    document.getElementById('pageTitle').innerText = 'Create Supplier Invoice';
    renderBreadcrumb(['Purchasing', 'Purchase Invoice', 'Create Supplier Invoice']);
    
    document.getElementById('main-content').innerHTML = `
        <div class="animate-in fade-in slide-in-from-bottom-2 duration-400 -m-6 h-[calc(100vh-64px)] flex flex-col overflow-hidden bg-slate-50/50">
            <div class="sticky top-0 z-40 bg-white border-b border-slate-100 px-8 py-4 flex justify-end items-center gap-3 shrink-0 shadow-sm">
                <button onclick="renderPurchaseInvoices()" class="px-6 py-2.5 bg-slate-100 text-slate-500 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-200 transition-all active:scale-95">Batal</button>
                <button onclick="submitPurchaseInvoice()" class="px-8 py-2.5 bg-blue-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-blue-700 transition-all shadow-lg active:scale-95 flex items-center gap-2">
                    <i class="fas fa-check"></i> Submit Invoice
                </button>
            </div>
            
            <div class="flex-1 overflow-y-auto custom-scrollbar pb-32">
                <div class="w-full px-8 py-8 max-w-7xl mx-auto space-y-8">
                    <div class="bg-white rounded-3xl p-8 border border-slate-100 shadow-sm">
                        <h3 class="text-[10px] font-black text-blue-600 uppercase tracking-widest mb-6 flex items-center gap-2">
                            <i class="fas fa-file-invoice"></i> Detail Tagihan Supplier
                        </h3>
                        
                        ${body}
                    </div>
                </div>
            </div>
        </div>
    `;

    // Trigger initial population based on supplier selection
    filterInvoiceReceiptsBySupplier(preselectedSupplierId);

    // If PO was pre-selected, trigger update
    if (poId) {
        const matchReceipt = window.tempUninvoicedReceipts.find(r => r.po.id === poId);
        if (matchReceipt) {
            const val = `${matchReceipt.po.id}|${matchReceipt.receipt.id}`;
            const npbDisp = matchReceipt.receipt.npbNumber || matchReceipt.receipt.npb || matchReceipt.receipt.date;
            const sjDisp = matchReceipt.receipt.suratJalan ? ` | SJ: ${matchReceipt.receipt.suratJalan}` : '';
            const displayText = `${matchReceipt.po.poNumber} - Penerimaan ke-${matchReceipt.idx} (NPB: ${npbDisp}${sjDisp}) - ${matchReceipt.supplierName}`;
            selectPurchaseInvoicePo(val, displayText);
        }
    }
};

window.selectPurchaseInvoiceSupplier = (id, name) => {
    document.getElementById('pinv_supplier_id').value = id;
    document.getElementById('pinv_supplier_display').value = name;
    document.getElementById('pinv_supplier_dropdown').classList.add('hidden');
    filterInvoiceReceiptsBySupplier(id);
};

window.filterInvoiceReceiptsBySupplier = (supplierId) => {
    const listEl = document.getElementById('pinv_po_list');
    const displayEl = document.getElementById('pinv_po_display');
    const idEl = document.getElementById('pinv_po_id');
    if (!listEl || !displayEl || !idEl) return;

    const filtered = supplierId 
        ? window.tempUninvoicedReceipts.filter(r => r.supplierId === supplierId)
        : window.tempUninvoicedReceipts;

    const options = filtered.map(r => {
        const val = `${r.po.id}|${r.receipt.id}`;
        const npbDisp = r.receipt.npbNumber || r.receipt.npb || r.receipt.date;
        const sjDisp = r.receipt.suratJalan ? ` | SJ: ${r.receipt.suratJalan}` : '';
        const displayText = `${r.po.poNumber} - Penerimaan ke-${r.idx} (NPB: ${npbDisp}${sjDisp}) - ${r.supplierName}`;
        
        return `<div onclick="selectPurchaseInvoicePo('${val}', '${displayText.replace(/'/g, "\\'")}')" 
                    class="px-4 py-2.5 text-sm font-bold text-slate-700 hover:bg-slate-50 rounded-xl cursor-pointer transition-colors m-0.5">
                    ${displayText}
                </div>`;
    }).join('');

    listEl.innerHTML = options || `<div class="px-4 py-2.5 text-sm text-slate-400 italic">Tidak ada penerimaan barang yang tersedia</div>`;
    displayEl.value = '-- Silakan Pilih Penerimaan Barang --';
    idEl.value = '';
    updatePurchaseInvoiceDetails('');
};

window.filterPurchaseInvoicePoList = (query) => {
    const q = query.toLowerCase();
    const items = document.querySelectorAll('#pinv_po_list > div');
    items.forEach(item => {
        if (item.classList.contains('px-4')) {
            const text = item.innerText.toLowerCase();
            item.style.display = text.includes(q) ? '' : 'none';
        }
    });
};

window.togglePurchaseInvoicePoDropdown = () => {
    const el = document.getElementById('pinv_po_dropdown');
    if (!el) return;
    const isHidden = el.classList.contains('hidden');
    if (isHidden) {
        el.classList.remove('hidden');
        const searchInput = document.getElementById('pinv_po_dropdown_search');
        if (searchInput) {
            searchInput.value = '';
            filterPurchaseInvoicePoList('');
            setTimeout(() => searchInput.focus(), 50);
        }
    }
    const container = el.closest('#pinv_po_container');
    const closeHandler = (e) => {
        if (container && !container.contains(e.target)) {
            el.classList.add('hidden');
            document.removeEventListener('click', closeHandler);
        }
    };
    if (isHidden) setTimeout(() => document.addEventListener('click', closeHandler), 10);
};

window.selectPurchaseInvoicePo = (val, displayText) => {
    document.getElementById('pinv_po_id').value = val;
    document.getElementById('pinv_po_display').value = displayText;
    document.getElementById('pinv_po_dropdown').classList.add('hidden');
    updatePurchaseInvoiceDetails(val);
};

window.calculatePurchaseInvoiceDueDate = () => {
    const poId = document.getElementById('pinv_po_id')?.value;
    const termInput = document.getElementById('pinv_terms');
    const dueInput = document.getElementById('pinv_due_date');
    if (!termInput || !dueInput) return;

    let startDate = new Date();
    if (poId) {
        const po = db.findById('purchaseOrders', poId);
        if (po && po.actualDeliveryDate) startDate = new Date(po.actualDeliveryDate);
    }

    const days = parseInt(termInput.value) || 0;
    startDate.setDate(startDate.getDate() + days);
    dueInput.value = startDate.toISOString().split('T')[0];
};

window.updatePurchaseInvoiceDetails = (val) => {
    const card = document.getElementById('pinv_po_detail_card');
    const numEl = document.getElementById('pinv_po_num_label');
    const dateEl = document.getElementById('pinv_po_date_label');
    const amountEl = document.getElementById('pinv_po_amount_label');

    if (!val) {
        if (card) card.classList.add('hidden');
        return;
    }

    const [poId, receiptId] = val.split('|');
    const po = db.findById('purchaseOrders', poId);
    if (!po) return;
    
    const receipt = (po.receipts || []).find(r => r.id === receiptId);
    if (!receipt) return;

    const receiptDpp = receipt.items.reduce((sum, item) => sum + (item.qty * (item.price || 0)), 0);
    const taxPct = parseFloat(po.taxRate) || 0;
    const receiptTax = Math.round(receiptDpp * taxPct / 100);
    const receiptTotal = receiptDpp + receiptTax;

    if (card) card.classList.remove('hidden');
    if (numEl) numEl.innerText = `PO DETAIL: ${po.poNumber} (NPB: ${receipt.npb || '-'})`;
    if (dateEl) dateEl.innerText = formatDate(receipt.date).slice(0, 11);
    
    // Show breakdown
    if (amountEl) {
        let text = '';
        if (taxPct > 0) {
            text += `<span class="text-xs font-semibold text-slate-500 block mb-1">DPP: ${formatCurrency(receiptDpp)}</span>`;
            text += `<span class="text-xs font-semibold text-slate-500 block mb-2">PPN (${taxPct}%): ${formatCurrency(receiptTax)}</span>`;
        }
        text += `<span class="text-xl font-black text-indigo-700 block">${formatCurrency(receiptTotal)}</span>`;
        amountEl.innerHTML = text;
    }

    document.getElementById('pinv_receipt_total').value = receiptTotal;

    // Auto-set payment terms from PO
    const termEl = document.getElementById('pinv_terms');
    if (termEl && po.paymentTerms) {
        // Parse payment terms string like '60 Hari' or 'Net 30 Days' -> extract days
        const match = String(po.paymentTerms).match(/(\d+)/);
        const days = match ? parseInt(match[1]) : 0;
        termEl.value = days;
    }

    // Auto-calc due date from receipt date + payment terms
    const dueInput = document.getElementById('pinv_due_date');
    if (dueInput && receipt.date) {
        const termEl2 = document.getElementById('pinv_terms');
        const days = parseInt(termEl2?.value || '0');
        const startDate = new Date(receipt.date);
        startDate.setDate(startDate.getDate() + days);
        dueInput.value = startDate.toISOString().split('T')[0];
    }
};

window.submitPurchaseInvoice = async () => {
    const val = document.getElementById('pinv_po_id').value;
    if (!val) { showToast('Silakan pilih Penerimaan Barang', 'error'); return; }

    await savePurchaseInvoice(val);
};

window.updateInvoiceFileDisplay = (input) => {
    const fileName = input.files[0] ? input.files[0].name : 'Klik untuk upload dokumen';
    const icon = document.getElementById('pinv_file_icon');
    const label = document.getElementById('pinv_file_name');
    
    if (label) label.innerText = fileName;
    if (icon && input.files[0]) {
        icon.classList.remove('text-slate-300');
        icon.classList.add('text-blue-500');
    }
};

window.updatePurchaseInvoiceDueDate = (val) => {
    const termInput = document.getElementById('pinv_terms');
    const dueInput = document.getElementById('pinv_due_date');
    if (!termInput || !dueInput || !val) return;

    const [poId, receiptId] = val.split('|');
    const po = db.findById('purchaseOrders', poId);
    if (!po) return;
    
    const receipt = (po.receipts || []).find(r => r.id === receiptId);
    const startDateObj = receipt ? new Date(receipt.date) : new Date();

    const days = parseInt(termInput.value) || 0;
    startDateObj.setDate(startDateObj.getDate() + days);

    dueInput.value = startDateObj.toISOString().split('T')[0];
};

window.savePurchaseInvoice = async (val) => {
    const [poId, receiptId] = val.split('|');
    const po = db.findById('purchaseOrders', poId);
    const invNum = document.getElementById('pinv_number').value;
    const invDate = document.getElementById('pinv_date').value;
    const invTerms = document.getElementById('pinv_terms').value;
    const invDueDate = document.getElementById('pinv_due_date').value;
    const fileInput = document.getElementById('pinv_file');

    // Bank Details
    const bankName = document.getElementById('pinv_bank_name') ? document.getElementById('pinv_bank_name').value : '';
    const bankAccount = document.getElementById('pinv_bank_account') ? document.getElementById('pinv_bank_account').value : '';
    const bankHolder = document.getElementById('pinv_bank_holder') ? document.getElementById('pinv_bank_holder').value : '';

    if (!invNum) { showToast('Nomor Invoice harus diisi', 'error'); return; }

    let attachmentData = null;
    if (fileInput && fileInput.files.length > 0) {
        const file = fileInput.files[0];
        if (file.size > 2 * 1024 * 1024) {
            showToast('File terlalu besar (maks 2MB)', 'error');
            return;
        }
        attachmentData = await new Promise((resolve) => {
            const reader = new FileReader();
            reader.onload = (e) => resolve(e.target.result);
            reader.readAsDataURL(file);
        });
    }

    const receiptTotal = parseFloat(document.getElementById('pinv_receipt_total').value) || 0;

    const inv = await db.insert('purchaseInvoices', {
        invNumber: invNum,
        purchaseOrderId: poId,
        receiptId: receiptId,
        supplierId: po.supplierId,
        date: new Date(invDate).toISOString(),
        dueDate: new Date(invDueDate).toISOString(),
        paymentTerms: invTerms,
        totalAmount: receiptTotal,
        status: 'UNPAID',
        attachment: attachmentData,
        createdAt: new Date().toISOString(),
        bankName: bankName,
        bankAccount: bankAccount,
        bankHolder: bankHolder
    });

    if (inv) {
        showToast('Supplier Invoice submitted to Finance!', 'success');
        renderPurchaseInvoices();
    } else {
        showToast('Gagal menyimpan invoice', 'error');
    }
};

window.viewPurchaseInvoice = (id) => {
    const inv = db.findById('purchaseInvoices', id);
    const po = db.findById('purchaseOrders', inv.purchaseOrderId);
    const suppliers = db.read('suppliers');
    const sup = suppliers.find(s => s.id === inv.supplierId) || { name: '-' };
    const supPayments = db.read('supplierPayments').filter(p => p.invoiceId === id);
    const paid = supPayments.reduce((s, p) => s + parseFloat(p.amount), 0);
    const payRows = supPayments.length ? supPayments.map(p => `
        <tr class="border-b text-sm"><td class="py-2">${formatDate(p.date).slice(0, 11)}</td>
        <td class="py-2">${p.method}</td><td class="py-2">${p.referenceNote || '-'}</td>
        <td class="py-2 text-right text-green-600 font-medium">${formatCurrency(p.amount)}</td></tr>`).join('')
        : `<tr><td colspan="4" class="py-2 text-gray-500 italic text-sm">Belum ada pembayaran.</td></tr>`;
    const body = `<div class="space-y-4 text-sm">
        <div class="grid grid-cols-2 lg:grid-cols-4 gap-2 bg-gray-50 p-3 rounded">
            <div><p class="text-gray-500">Invoice No.</p><p class="font-bold">${inv.invNumber || inv.invoiceNumber || '-'}</p></div>
            <div><p class="text-gray-500">Invoice Date</p><p class="font-medium">${formatDate(inv.date).slice(0, 11)}</p></div>
            <div><p class="text-gray-500 text-red-600">Due Date</p><p class="font-bold text-red-600">${inv.dueDate ? formatDate(inv.dueDate).slice(0, 11) : '-'}</p></div>
            <div class="text-right"><p class="text-gray-500">Status</p>${statusBadgePurch(inv.status)}</div>
            <div><p class="text-gray-500">Supplier</p><p class="font-medium">${sup.name}</p></div>
            <div><p class="text-gray-500">Ref. PO</p><p class="font-medium">${po?.poNumber || '-'}</p></div>
            <div><p class="text-gray-500">Terms</p><p class="font-medium">${inv.paymentTerms ? inv.paymentTerms + ' Days' : 'Cash'}</p></div>
        </div>
        
        ${(inv.bankName || inv.bankAccount || inv.bankHolder) ? `
        <div class="bg-blue-50/50 p-3 rounded border border-blue-100">
            <p class="text-xs font-semibold text-gray-700 mb-2 border-b border-blue-100 pb-1">Informasi Rekening Bank Supplier</p>
            <div class="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <div><p class="text-xs text-gray-500 focus:outline-none">Nama Bank</p><p class="font-medium text-sm text-gray-800">${inv.bankName || '-'}</p></div>
                <div><p class="text-xs text-gray-500">Nomor Rekening</p><p class="font-medium text-sm text-gray-800">${inv.bankAccount || '-'}</p></div>
                <div><p class="text-xs text-gray-500">Atas Nama</p><p class="font-medium text-sm text-gray-800">${inv.bankHolder || '-'}</p></div>
            </div>
        </div>
        ` : ''}

        <div><p class="font-semibold text-gray-700 border-b pb-1 mb-2">Riwayat Pembayaran</p>
            <table class="w-full"><thead><tr class="text-xs text-gray-500 border-b">
                <th class="py-1">Tanggal</th><th class="py-1">Metode</th><th class="py-1">Referensi</th><th class="py-1 text-right">Jumlah</th>
            </tr></thead><tbody>${payRows}</tbody></table>
        </div>
        <div class="bg-blue-50 p-3 rounded border border-blue-100">
            <div class="flex justify-between"><span class="text-gray-600">Total Tagihan:</span><span class="font-bold">${formatCurrency(inv.totalAmount)}</span></div>
            <div class="flex justify-between"><span class="text-gray-600">Total Terbayar:</span><span class="text-green-600 font-bold">${formatCurrency(paid)}</span></div>
            <div class="flex justify-between border-t border-blue-200 pt-1 mt-1"><span class="font-bold">Sisa Hutang:</span><span class="text-red-600 font-bold text-lg">${formatCurrency(inv.totalAmount - paid)}</span></div>
        </div>
        ${inv.attachment ? `
        <div class="mt-4">
            <p class="font-semibold text-gray-700 border-b pb-1 mb-2">Lampiran Tagihan</p>
            <div class="border rounded-lg overflow-hidden bg-gray-100 flex justify-center p-2">
                ${inv.attachment.startsWith('data:image')
                ? `<img src="${inv.attachment}" class="max-w-full h-auto cursor-pointer" onclick="window.open('${inv.attachment}')">`
                : `<div class="p-8 text-center"><i class="fas fa-file-pdf text-4xl text-red-500 mb-2"></i><br><a href="${inv.attachment}" download="invoice-${inv.invNumber || inv.invoiceNumber}" class="text-blue-600 underline">Unduh Lampiran</a></div>`}
            </div>
        </div>` : ''}
    </div>`;
    showModal(`Detail Invoice - ${inv.invNumber || inv.invoiceNumber || '-'}`, body, `<button onclick="closeModal()" class="w-full sm:w-auto inline-flex justify-center rounded-md border border-gray-300 px-4 py-2 bg-white text-gray-700 text-sm font-medium">Tutup</button>`);
};

// --- Purchase Invoice Attachment Helpers ---
window.triggerInvoiceUpload = (id) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*,application/pdf';
    input.onchange = (e) => handleInvoiceFile(e, id);
    input.click();
};

window.handleInvoiceFile = (e, id) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
        showToast('File terlalu besar (maks 2MB)', 'error');
        return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
        db.update('purchaseInvoices', id, { attachment: event.target.result });
        showToast('Lampiran berhasil diunggah');
        renderPurchaseInvoices();
    };
    reader.readAsDataURL(file);
};

window.removeInvoiceAttachment = (id) => {
    if (confirm('Hapus lampiran ini?')) {
        db.update('purchaseInvoices', id, { attachment: null });
        showToast('Lampiran dihapus');
        renderPurchaseInvoices();
    }
};

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ SUPPLIER PAYMENTS â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function renderSupplierPayments(prefillInvoiceId = null) {
    document.getElementById('pageTitle').innerText = 'Supplier Payment';
    const mainContent = document.getElementById('main-content');
    const allPayments = db.read('supplierPayments').sort((a, b) => new Date(b.date) - new Date(a.date));
    const allInvoices = db.read('purchaseInvoices');
    const suppliers = db.read('suppliers');

    const basePayments = allPayments;
    let filteredPayments = basePayments;
    let bannerHtml = '';
    if (prefillInvoiceId) {
        window.currentSupPayInvoiceId = prefillInvoiceId;
        const inv = allInvoices.find(i => i.id === prefillInvoiceId);
        if (inv) {
            const sup = suppliers.find(s => s.id === inv.supplierId) || { name: '-' };
            const invPaid = allPayments.filter(p => p.invoiceId === inv.id).reduce((s, p) => s + parseFloat(p.amount), 0);
            filteredPayments = allPayments.filter(p => p.invoiceId === inv.id);
            bannerHtml = `<div class="mb-6 bg-blue-50 border border-blue-100 rounded-lg p-4 sm:p-6 shadow-sm">
                <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4">
                    <div><h3 class="text-blue-800 font-bold text-lg">Rekap Hutang: ${inv.invNumber || inv.invoiceNumber || '-'}</h3>
                        <p class="text-blue-600 text-sm">Supplier: <span class="font-semibold">${sup.name}</span></p></div>
                    <button onclick="renderSupplierPayments(null)" class="mt-2 sm:mt-0 text-blue-700 hover:text-blue-900 text-sm font-medium underline">
                        <i class="fas fa-list mr-1"></i>Tampilkan Semua</button>
                </div>
                <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div class="bg-white p-3 rounded border border-blue-100"><p class="text-gray-500 text-xs uppercase font-semibold">Total Hutang</p><p class="text-gray-800 font-bold text-lg">${formatCurrency(inv.totalAmount)}</p></div>
                    <div class="bg-white p-3 rounded border border-blue-100"><p class="text-gray-500 text-xs uppercase font-semibold">Total Dibayar</p><p class="text-green-600 font-bold text-lg">${formatCurrency(invPaid)}</p></div>
                    <div class="bg-white p-3 rounded border border-blue-100"><p class="text-gray-500 text-xs uppercase font-semibold">Sisa Hutang</p><p class="text-red-600 font-bold text-lg">${formatCurrency(inv.totalAmount - invPaid)}</p></div>
                </div></div>`;
        }
    }

    filteredPayments = filterByDateRange(filteredPayments, 'supplierPayments');

    // Extra filters (supplier, status, kategori) â€” read from persisted state
    const filterSup = window.currentFilters.supplierPayments.supplier || '';
    const filterStatus = window.currentFilters.supplierPayments.status || '';
    const filterKat = window.currentFilters.supplierPayments.kategori || '';

    if (filterSup || filterStatus || filterKat) {
        filteredPayments = filteredPayments.filter(p => {
            const inv = allInvoices.find(i => i.id === p.invoiceId);
            if (!inv) return false;
            if (filterSup && inv.supplierId !== filterSup) return false;
            if (filterStatus && inv.status !== filterStatus) return false;
            if (filterKat) {
                const po = (db.read('purchaseOrders') || []).find(po => po.id === inv.purchaseOrderId);
                if (!po || po.category !== filterKat) return false;
            }
            return true;
        });
    }

    // --- Total summary calculation ---
    const totalPaid = filteredPayments.reduce((s, p) => s + parseFloat(p.amount || 0), 0);
    const touchedInvIds = new Set(filteredPayments.map(p => p.invoiceId));
    let totalUnpaidBalance = 0;
    touchedInvIds.forEach(invId => {
        const inv = allInvoices.find(i => i.id === invId);
        if (!inv) return;
        const paidForInv = allPayments.filter(p => p.invoiceId === invId).reduce((s, p) => s + parseFloat(p.amount || 0), 0);
        totalUnpaidBalance += Math.max(0, (inv.totalAmount || 0) - paidForInv);
    });

    let rows = filteredPayments.map(p => {
        const inv = allInvoices.find(i => i.id === p.invoiceId) || { invoiceNumber: '-', supplierId: null };
        const sup = suppliers.find(s => s.id === inv.supplierId) || { name: '-' };
        return `<tr class="border-b border-gray-100 hover:bg-gray-50">
            <td class="py-3 px-4 text-sm font-medium text-gray-800">${p.paymentNumber}</td>
            <td class="py-3 px-4 text-sm text-gray-600">${formatDate(p.date).slice(0, 11)}</td>
            <td class="py-3 px-4 text-sm text-blue-600">${inv.invoiceNumber}</td>
            <td class="py-3 px-4 text-sm text-gray-800">${sup.name}</td>
            <td class="py-3 px-4 text-sm text-gray-600">${p.method}</td>
            <td class="py-3 px-4 text-sm text-gray-500">${p.referenceNote || p.notes || '-'}</td>
            <td class="py-3 px-4 text-sm text-green-600 font-bold text-right">${formatCurrency(p.amount)}</td>
            <td class="py-3 px-4 text-sm text-right">
                ${p.receiptBase64 ? `<button onclick="viewSupPayReceipt('${p.id}')" class="text-blue-500 hover:text-blue-700 p-1.5 px-3 bg-blue-50 rounded" title="Lihat Bukti Transfer"><i class="fas fa-file-invoice mr-1"></i> Bukti</button>` : `<span class="text-gray-300">-</span>`}
            </td>
        </tr>`;
    }).join('');
    if (!rows) rows = `<tr><td colspan="7" class="py-4 text-center text-gray-500">Belum ada data pembayaran${prefillInvoiceId ? ' untuk invoice ini' : ''}</td></tr>`;

    // --- Total summary HTML ---
    const totalSummaryHtml = !prefillInvoiceId ? `
        <div class="mt-5 grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div class="bg-green-50 border border-green-100 rounded-xl p-4 flex items-center gap-4">
                <div class="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center text-green-600">
                    <i class="fas fa-check-circle text-lg"></i>
                </div>
                <div>
                    <p class="text-green-600 text-xs font-bold uppercase tracking-wider">Total Sudah Dibayar</p>
                    <p class="text-green-800 font-bold text-xl mt-0.5">${formatCurrency(totalPaid)}</p>
                    <p class="text-green-400 text-[10px]">${filteredPayments.length} transaksi</p>
                </div>
            </div>
            <div class="bg-red-50 border border-red-100 rounded-xl p-4 flex items-center gap-4">
                <div class="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center text-red-600">
                    <i class="fas fa-clock text-lg"></i>
                </div>
                <div>
                    <p class="text-red-600 text-xs font-bold uppercase tracking-wider">Sisa Hutang (Unpaid)</p>
                    <p class="text-red-800 font-bold text-xl mt-0.5">${formatCurrency(totalUnpaidBalance)}</p>
                    <p class="text-red-400 text-[10px]">${touchedInvIds.size} invoice terkait</p>
                </div>
            </div>
            <div class="bg-blue-50 border border-blue-100 rounded-xl p-4 flex items-center gap-4">
                <div class="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600">
                    <i class="fas fa-wallet text-lg"></i>
                </div>
                <div>
                    <p class="text-blue-600 text-xs font-bold uppercase tracking-wider">Total Nilai Invoice</p>
                    <p class="text-blue-800 font-bold text-xl mt-0.5">${formatCurrency(totalPaid + totalUnpaidBalance)}</p>
                    <p class="text-blue-400 text-[10px]">Paid + Unpaid</p>
                </div>
            </div>
        </div>` : '';

    let filterHtml = '';
    if (!prefillInvoiceId) {
        filterHtml = `
        <!-- Standardized Accordion Filter (Supplier Payment) -->
        <div class="bg-white rounded-xl shadow-sm border border-slate-100 mb-5 overflow-hidden">
            <div onclick="togglePPFilter()" class="flex items-center justify-between p-4 cursor-pointer hover:bg-slate-50 transition-colors select-none">
                <h3 class="text-[10px] font-black text-slate-800 uppercase tracking-[0.2em] flex items-center gap-3">
                    <i class="fas fa-filter text-blue-600"></i> FILTER PENCARIAN
                    ${(!window._uiState.ppFilterOpen && (window.currentFilters.supplierPayments.start || window.currentFilters.supplierPayments.end || filterSup || filterStatus || filterKat)) ? `<span class="ml-2 px-2 py-0.5 bg-blue-50 text-blue-600 rounded-full text-[9px] font-bold">Filter Aktif</span>` : ''}
                </h3>
                <div class="flex items-center gap-3">
                    <span class="text-[9px] font-bold text-slate-400 uppercase tracking-widest">${window._uiState.ppFilterOpen ? 'Sembunyikan' : 'Tampilkan'}</span>
                    <i class="fas fa-chevron-${window._uiState.ppFilterOpen ? 'up' : 'down'} text-slate-300 text-xs"></i>
                </div>
            </div>

            <div class="${window._uiState.ppFilterOpen ? 'block' : 'hidden'} p-5 border-t border-slate-50 animate-in slide-in-from-top-2 duration-200">
                <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-4 items-end mb-4">
                    <div class="space-y-1.5">
                        <label class="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Dari Tanggal</label>
                        <input type="date" id="spay_start_date" value="${window.currentFilters.supplierPayments.start}" class="w-full border-2 border-slate-100 rounded-lg px-3 py-2 text-sm font-bold text-slate-700 bg-slate-50/50 focus:bg-white focus:border-blue-500 outline-none transition-all">
                    </div>
                    <div class="space-y-1.5">
                        <label class="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Sampai Tanggal</label>
                        <input type="date" id="spay_end_date" value="${window.currentFilters.supplierPayments.end}" class="w-full border-2 border-slate-100 rounded-lg px-3 py-2 text-sm font-bold text-slate-700 bg-slate-50/50 focus:bg-white focus:border-blue-500 outline-none transition-all">
                    </div>
                    <div class="space-y-1.5">
                        <label class="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Supplier</label>
                        <select id="spay_filter_supplier" class="w-full border-2 border-slate-100 rounded-lg px-3 py-2 text-sm font-bold text-slate-700 bg-slate-50/50 focus:bg-white focus:border-blue-500 outline-none transition-all appearance-none cursor-pointer">
                            <option value="">Semua Supplier</option>
                            ${suppliers.map(s => `<option value="${s.id}" ${window.currentFilters.supplierPayments.supplier === s.id ? 'selected' : ''}>${s.name}</option>`).join('')}
                        </select>
                    </div>
                    <div class="space-y-1.5">
                        <label class="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Status Invoice</label>
                        <select id="spay_filter_status" class="w-full border-2 border-slate-100 rounded-lg px-3 py-2 text-sm font-bold text-slate-700 bg-slate-50/50 focus:bg-white focus:border-blue-500 outline-none transition-all appearance-none cursor-pointer">
                            <option value="">Semua Status</option>
                            <option value="PAID" ${window.currentFilters.supplierPayments.status === 'PAID' ? 'selected' : ''}>PAID</option>
                            <option value="UNPAID" ${window.currentFilters.supplierPayments.status === 'UNPAID' ? 'selected' : ''}>UNPAID</option>
                        </select>
                    </div>
                    <div class="space-y-1.5">
                        <label class="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Kategori</label>
                        <select id="spay_filter_kategori" class="w-full border-2 border-slate-100 rounded-lg px-3 py-2 text-sm font-bold text-slate-700 bg-slate-50/50 focus:bg-white focus:border-blue-500 outline-none transition-all appearance-none cursor-pointer">
                            <option value="">Semua Kategori</option>
                            <option value="Bahan Baku" ${window.currentFilters.supplierPayments.kategori === 'Bahan Baku' ? 'selected' : ''}>Bahan Baku</option>
                            <option value="Packaging" ${window.currentFilters.supplierPayments.kategori === 'Packaging' ? 'selected' : ''}>Packaging</option>
                            <option value="Perlengkapan" ${window.currentFilters.supplierPayments.kategori === 'Perlengkapan' ? 'selected' : ''}>Perlengkapan</option>
                            <option value="Service" ${window.currentFilters.supplierPayments.kategori === 'Service' ? 'selected' : ''}>Service</option>
                            <option value="Sparepart" ${window.currentFilters.supplierPayments.kategori === 'Sparepart' ? 'selected' : ''}>Sparepart</option>
                            <option value="Aktiva ( tetap )" ${window.currentFilters.supplierPayments.kategori === 'Aktiva ( tetap )' ? 'selected' : ''}>Aktiva ( tetap )</option>
                            <option value="Gas" ${window.currentFilters.supplierPayments.kategori === 'Gas' ? 'selected' : ''}>Gas</option>
                        </select>
                    </div>
                </div>
                <div class="flex gap-2 mt-4 pt-4 border-t border-slate-100">
                    <button onclick="applySupPayFilter()" class="bg-blue-600 hover:bg-slate-900 text-white px-8 py-2.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all shadow-lg active:scale-95 flex items-center gap-2">
                        <i class="fas fa-search text-xs"></i> TAMPILKAN DATA
                    </button>
                    <button onclick="resetSupPayFilter()" class="bg-slate-50 hover:bg-slate-100 text-slate-400 px-5 py-2.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all shadow-sm">
                        <i class="fas fa-undo mr-1.5"></i> RESET
                    </button>
                </div>
            </div>
        </div>`;
    }

    mainContent.innerHTML = `
        ${bannerHtml}
        ${filterHtml}
        <div class="bg-white rounded-lg shadow-sm border border-gray-100">
            <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center p-4 sm:p-6 border-b border-gray-100 gap-4">
                <div>
                    <h2 class="text-lg font-semibold text-gray-800">Supplier Payment History</h2>
                    <p class="text-xs text-gray-500 mt-1">Total: ${filteredPayments.length} transaksi</p>
                </div>
            </div>
            <div class="overflow-x-auto">
                <table class="w-full text-left border-collapse">
                    <thead><tr class="bg-gray-50 border-b border-gray-200">
                        <th class="py-3 px-4 text-xs font-semibold text-gray-600 uppercase">No. Bukti</th>
                        <th class="py-3 px-4 text-xs font-semibold text-gray-600 uppercase">Tanggal</th>
                        <th class="py-3 px-4 text-xs font-semibold text-gray-600 uppercase">No. Invoice</th>
                        <th class="py-3 px-4 text-xs font-semibold text-gray-600 uppercase">Supplier</th>
                        <th class="py-3 px-4 text-xs font-semibold text-gray-600 uppercase">Metode</th>
                        <th class="py-3 px-4 text-xs font-semibold text-gray-600 uppercase">Referensi</th>
                        <th class="py-3 px-4 text-xs font-semibold text-gray-600 uppercase text-right">Jumlah</th>
                        <th class="py-3 px-4 text-xs font-semibold text-gray-600 uppercase text-right">Bukti TF</th>
                    </tr></thead>
                    <tbody>${rows}</tbody>
                </table>
            </div>
        </div>
        ${totalSummaryHtml}`;
    if (prefillInvoiceId) {
        const inv = allInvoices.find(i => i.id === prefillInvoiceId);
        if (inv && inv.status === 'UNPAID') setTimeout(() => openSupplierPaymentModal(prefillInvoiceId), 100);
    }
}

window.viewSupPayReceipt = (id) => {
    const payment = db.findById('supplierPayments', id);
    if (!payment || !payment.receiptBase64) return;
    const isPdf = payment.receiptBase64.startsWith('data:application/pdf');
    let content = '';
    if (isPdf) {
        content = `<iframe src="${payment.receiptBase64}" class="w-full h-[600px] rounded-lg" frameborder="0"></iframe>`;
    } else {
        content = `<div class="flex justify-center max-h-[80vh] overflow-y-auto"><img src="${payment.receiptBase64}" class="max-w-full h-auto rounded-lg shadow-sm border border-gray-100 object-contain" alt="Bukti Transfer"></div>`;
    }
    showModal(`Bukti Transfer - ${payment.paymentNumber}`, content, `<button onclick="closeModal()" class="w-full sm:w-auto inline-flex justify-center rounded-md border border-gray-300 px-4 py-2 bg-white text-gray-700 text-sm font-medium hover:bg-gray-50">Tutup</button>`, 'xl');
};

window.openSupplierPaymentModal = (invoiceId = null) => {
    if (invoiceId) window.currentSupPayInvoiceId = invoiceId;
    const allInvoices = db.read('purchaseInvoices');
    const allPayments = db.read('supplierPayments');
    const suppliers = db.read('suppliers');
    const unpaidInvoices = allInvoices.filter(i => i.status === 'UNPAID');
    if (!unpaidInvoices.length) { showToast('Tidak ada invoice yang belum dibayar', 'error'); return; }
    const invOpts = unpaidInvoices.map(inv => {
        const sup = suppliers.find(s => s.id === inv.supplierId) || { name: '-' };
        const paid = allPayments.filter(p => p.invoiceId === inv.id).reduce((s, p) => s + parseFloat(p.amount), 0);
        const balance = inv.totalAmount - paid;
        const sel = inv.id === window.currentSupPayInvoiceId ? 'selected' : '';
        return `<option value="${inv.id}" data-balance="${balance}" ${sel}>${inv.invoiceNumber} - ${sup.name} (Sisa: ${formatCurrency(balance)})</option>`;
    }).join('');
    const body = `<div class="space-y-4">
        <div><label class="block text-sm font-medium text-gray-700 mb-1">Pilih Invoice</label>
            <select id="spay_inv" class="w-full border border-gray-300 rounded px-3 py-2 bg-white" onchange="updateSupPayAmount()">
                <option value="" disabled ${!window.currentSupPayInvoiceId ? 'selected' : ''}>Pilih Invoice...</option>${invOpts}
            </select></div>
        <div><label class="block text-sm font-medium text-gray-700 mb-1">Tanggal Bayar</label>
            <input type="date" id="spay_date" value="${new Date().toISOString().split('T')[0]}" class="w-full border border-gray-300 rounded px-3 py-2"></div>
        <div><label class="block text-sm font-medium text-gray-700 mb-1">Metode</label>
            <select id="spay_method" class="w-full border border-gray-300 rounded px-3 py-2 bg-white">
                <option>Transfer Bank</option><option>Tunai</option><option>Giro/Cek</option>
            </select></div>
        <div><label class="block text-sm font-medium text-gray-700 mb-1">Nomor Referensi / Keterangan</label>
            <input id="spay_ref" placeholder="No. Transfer / Cek..." class="w-full border border-gray-300 rounded px-3 py-2"></div>
        <div><label class="block text-sm font-medium text-gray-700 mb-1">Jumlah Bayar</label>
            <input type="number" id="spay_amount" min="1" class="w-full border border-gray-300 rounded px-3 py-2 text-lg font-bold"></div>
    </div>`;
    const footer = `
        <button onclick="saveSupplierPayment()" class="w-full sm:w-auto inline-flex justify-center rounded-md bg-green-600 px-4 py-2 text-white text-sm font-medium hover:bg-green-700 sm:ml-3">Bayar</button>
        <button onclick="closeModal()" class="mt-3 sm:mt-0 w-full sm:w-auto inline-flex justify-center rounded-md border border-gray-300 px-4 py-2 bg-white text-gray-700 text-sm font-medium sm:ml-3">Batal</button>`;
    showModal('Bayar Hutang Supplier', body, footer);
    setTimeout(() => updateSupPayAmount(), 100);
};

window.updateSupPayAmount = () => {
    const sel = document.getElementById('spay_inv');
    if (sel && sel.selectedIndex >= 0 && sel.options[sel.selectedIndex]?.value) {
        document.getElementById('spay_amount').value = sel.options[sel.selectedIndex].dataset.balance;
    }
};

window.saveSupplierPayment = async () => {
    const allInvoices = db.read('purchaseInvoices');
    const allPayments = db.read('supplierPayments');
    const invoiceId = document.getElementById('spay_inv').value;
    const amount = parseFloat(document.getElementById('spay_amount').value);
    const method = document.getElementById('spay_method').value;
    const ref = document.getElementById('spay_ref').value.trim();
    const date = document.getElementById('spay_date').value;
    if (!invoiceId) { showToast('Pilih invoice', 'error'); return; }
    if (!amount || amount <= 0) { showToast('Jumlah tidak valid', 'error'); return; }
    const inv = allInvoices.find(i => i.id === invoiceId);
    const paid = allPayments.filter(p => p.invoiceId === inv.id).reduce((s, p) => s + parseFloat(p.amount), 0);
    const balance = inv.totalAmount - paid;
    if (amount > balance + 1) { showToast(`Melebihi sisa hutang (${formatCurrency(balance)})`, 'error'); return; }

    try {
        // Use Phase 2 API for Atomic Transaction (Payment + Journal + Invoice Status)
        const result = await api.paySupplierInvoice(invoiceId, {
            amount, method, referenceNote: ref, date: new Date(date).toISOString()
        });

        // Optimistic UI update
        db.insert('supplierPayments', {
            paymentNumber: 'SPAY-' + Date.now().toString().slice(-6),
            invoiceId, date: new Date(date).toISOString(), method, referenceNote: ref, amount
        });

        if (result.isPaid) {
            db.update('purchaseInvoices', inv.id, { status: 'PAID' });
        }

        showToast(result.message, 'success');
        window.currentSupPayInvoiceId = null;
        closeModal(); renderSupplierPayments(invoiceId);
    } catch (err) {
        showToast(err.message, 'error');
    }
};

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ PURCHASE REPORTS â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function renderPurchaseReports() {
    document.getElementById('pageTitle').innerText = 'Laporan Pembelian';
    const mainContent = document.getElementById('main-content');

    // Default: bulan ini
    const now = new Date();
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
    const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0];

    const suppliers = db.read('suppliers');
    const products = db.read('inventoryItems').filter(i => i.category === 'RAW_MATERIAL');

    const supOpts = suppliers.map(s => `<option value="${s.id}">${s.name}</option>`).join('');
    const prodOpts = products.map(p => `<option value="${p.id}">${p.itemName}</option>`).join('');

    mainContent.innerHTML = `
        <!-- Standardized Accordion Filter (Purchase Report) -->
        <div class="bg-white rounded-xl shadow-sm border border-slate-100 mb-5 overflow-hidden">
            <div onclick="togglePRFilter()" class="flex items-center justify-between p-4 cursor-pointer hover:bg-slate-50 transition-colors select-none">
                <h3 class="text-[10px] font-black text-slate-800 uppercase tracking-[0.2em] flex items-center gap-3">
                    <i class="fas fa-filter text-blue-600"></i> FILTER PENCARIAN
                    ${(!window._uiState.prFilterOpen && (document.getElementById('pr_filter_supplier')?.value || document.getElementById('pr_filter_product')?.value || document.getElementById('pr_filter_category')?.value)) ? `<span class="ml-2 px-2 py-0.5 bg-blue-50 text-blue-600 rounded-full text-[9px] font-bold">Filter Aktif</span>` : ''}
                </h3>
                <div class="flex items-center gap-3">
                    <span class="text-[9px] font-bold text-slate-400 uppercase tracking-widest">${window._uiState.prFilterOpen ? 'Sembunyikan' : 'Tampilkan'}</span>
                    <i class="fas fa-chevron-${window._uiState.prFilterOpen ? 'up' : 'down'} text-slate-300 text-xs"></i>
                </div>
            </div>

            <div class="${window._uiState.prFilterOpen ? 'block' : 'hidden'} p-5 border-t border-slate-50 animate-in slide-in-from-top-2 duration-200">
                <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 items-end mb-4">
                    <div class="space-y-1.5">
                        <label class="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Dari Tanggal</label>
                        <input type="date" id="pr_from" value="${firstDay}" class="w-full border-2 border-slate-100 rounded-lg px-3 py-2 text-sm font-bold text-slate-700 bg-slate-50/50 focus:bg-white focus:border-blue-500 outline-none transition-all">
                    </div>
                    <div class="space-y-1.5">
                        <label class="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Sampai Tanggal</label>
                        <input type="date" id="pr_to" value="${lastDay}" class="w-full border-2 border-slate-100 rounded-lg px-3 py-2 text-sm font-bold text-slate-700 bg-slate-50/50 focus:bg-white focus:border-blue-500 outline-none transition-all">
                    </div>
                    <div class="space-y-1.5">
                        <label class="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Supplier</label>
                        <select id="pr_filter_supplier" class="w-full border-2 border-slate-100 rounded-lg px-3 py-2 text-sm font-bold text-slate-700 bg-slate-50/50 focus:bg-white focus:border-blue-500 outline-none transition-all appearance-none cursor-pointer">
                            <option value="">Semua Supplier</option>
                            ${supOpts}
                        </select>
                    </div>
                    <div class="space-y-1.5">
                        <label class="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Produk</label>
                        <select id="pr_filter_product" class="w-full border-2 border-slate-100 rounded-lg px-3 py-2 text-sm font-bold text-slate-700 bg-slate-50/50 focus:bg-white focus:border-blue-500 outline-none transition-all appearance-none cursor-pointer">
                            <option value="">Semua Produk</option>
                            ${prodOpts}
                        </select>
                    </div>
                    <div class="space-y-1.5">
                        <label class="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Kategori</label>
                        <select id="pr_filter_category" class="w-full border-2 border-slate-100 rounded-lg px-3 py-2 text-sm font-bold text-slate-700 bg-slate-50/50 focus:bg-white focus:border-blue-500 outline-none transition-all appearance-none cursor-pointer">
                            <option value="">Semua Kategori</option>
                            <option value="Bahan Baku">Bahan Baku</option>
                            <option value="Packaging">Packaging</option>
                            <option value="Perlengkapan">Perlengkapan</option>
                            <option value="Service">Service</option>
                            <option value="Sparepart">Sparepart</option>
                            <option value="Aktiva ( tetap )">Aktiva ( tetap )</option>
                            <option value="Gas">Gas</option>
                        </select>
                    </div>
                </div>
                <div class="flex gap-2 mt-4 pt-4 border-t border-slate-100">
                    <button onclick="runPurchaseReport()" class="bg-blue-600 hover:bg-slate-900 text-white px-8 py-2.5 rounded-lg text-[10px] font-black uppercase tracking-widest shadow-lg active:scale-95 transition-all flex items-center gap-2">
                        <i class="fas fa-search text-xs"></i> JALANKAN LAPORAN
                    </button>
                </div>
            </div>
        <div id="purchase_report_output"></div>`;

    // Auto-run on load
    setTimeout(() => runPurchaseReport(), 50);
}

window.runPurchaseReport = () => {
    const fromVal = document.getElementById('pr_from')?.value;
    const toVal = document.getElementById('pr_to')?.value;
    if (!fromVal || !toVal) { showToast('Pilih rentang tanggal terlebih dahulu', 'error'); return; }

    const from = new Date(fromVal); from.setHours(0, 0, 0, 0);
    const to = new Date(toVal); to.setHours(23, 59, 59, 999);

    const allPOs = db.read('purchaseOrders');
    const suppliers = db.read('suppliers');
    const purchaseInvoices = db.read('purchaseInvoices');
    const payments = db.read('supplierPayments');

    const filterSupplier = document.getElementById('pr_filter_supplier')?.value;
    const filterProduct = document.getElementById('pr_filter_product')?.value;
    const filterCategory = document.getElementById('pr_filter_category')?.value;

    // Filter by date range and selected supplier/product/category
    const pos = allPOs.filter(po => {
        const d = po.actualDeliveryDate ? new Date(po.actualDeliveryDate) : null;
        const inDateRange = d && d >= from && d <= to;
        if (!inDateRange) return false;

        if (filterSupplier && po.supplierId !== filterSupplier) return false;

        if (filterProduct) {
            const hasProduct = (po.items || []).some(item => item.inventoryItemId === filterProduct);
            if (!hasProduct) return false;
        }

        if (filterCategory && po.category !== filterCategory) return false;

        return true;
    });

    const received = pos.filter(p => p.status === 'RECEIVED');
    const totalNilaiPO = pos.reduce((s, p) => s + (p.totalAmount || 0), 0);
    const totalReceived = received.reduce((s, p) => s + (p.totalAmount || 0), 0);

    // Hutang dalam rentang ini
    const relatedInvIds = new Set(pos.map(p => p.id));
    const unpaidInvoices = purchaseInvoices.filter(i => relatedInvIds.has(i.purchaseOrderId) && i.status !== 'CANCELLED');
    const totalDebt = unpaidInvoices.reduce((s, i) => {
        const paid = payments.filter(p => p.invoiceId === i.id).reduce((ss, p) => ss + parseFloat(p.amount || 0), 0);
        return s + Math.max(0, (i.totalAmount || 0) - paid);
    }, 0);

    // Unique suppliers in range
    const uniqueSuppliers = new Set(pos.map(p => p.supplierId)).size;

    // --- Summary Cards ---
    const summaryHtml = `
        <div class="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <div class="bg-blue-50 border border-blue-100 rounded-xl p-4">
                <p class="text-blue-600 text-xs font-semibold uppercase tracking-wider">Total PO</p>
                <p class="text-2xl font-bold text-blue-800 mt-1">${pos.length}</p>
                <p class="text-blue-400 text-xs mt-1">${received.length} sudah diterima</p>
            </div>
            <div class="bg-green-50 border border-green-100 rounded-xl p-4">
                <p class="text-green-600 text-xs font-semibold uppercase tracking-wider">Nilai Pembelian</p>
                <p class="text-2xl font-bold text-green-800 mt-1">${formatCurrency(totalNilaiPO)}</p>
                <p class="text-green-400 text-xs mt-1">Received: ${formatCurrency(totalReceived)}</p>
            </div>
            <div class="bg-red-50 border border-red-100 rounded-xl p-4">
                <p class="text-red-600 text-xs font-semibold uppercase tracking-wider">Hutang Supplier</p>
                <p class="text-2xl font-bold text-red-800 mt-1">${formatCurrency(totalDebt)}</p>
                <p class="text-red-400 text-xs mt-1">${unpaidInvoices.filter(i => i.status === 'UNPAID').length} invoice belum lunas</p>
            </div>
            <div class="bg-purple-50 border border-purple-100 rounded-xl p-4">
                <p class="text-purple-600 text-xs font-semibold uppercase tracking-wider">Jumlah Supplier</p>
                <p class="text-2xl font-bold text-purple-800 mt-1">${uniqueSuppliers}</p>
                <p class="text-purple-400 text-xs mt-1">Aktif dalam periode ini</p>
            </div>
        </div>`;

    // --- Top Supplier ---
    const supTotals = {};
    pos.forEach(po => { supTotals[po.supplierId] = (supTotals[po.supplierId] || 0) + po.totalAmount; });
    const supRows = Object.entries(supTotals).sort((a, b) => b[1] - a[1]).map(([sid, total], idx) => {
        const sup = suppliers.find(s => s.id === sid) || { name: 'Unknown' };
        const medals = ['ðŸ¥‡', 'ðŸ¥ˆ', 'ðŸ¥‰'];
        return `<tr class="border-b border-gray-100 hover:bg-gray-50">
            <td class="py-2 px-4 text-sm">${medals[idx] || (idx + 1)} ${sup.name}</td>
            <td class="py-2 px-4 text-sm text-right font-semibold text-gray-800">${formatCurrency(total)}</td>
        </tr>`;
    }).join('') || `<tr><td colspan="2" class="py-4 text-center text-gray-400 text-sm">Belum ada data</td></tr>`;

    // --- Top Items Dibeli (dari prodText) ---
    const itemQtys = {};
    pos.forEach(po => (po.items || []).forEach(i => {
        const key = i.prodText || i.itemName || 'Unknown';
        if (!itemQtys[key]) itemQtys[key] = { qty: 0, unit: i.unit || '' };
        itemQtys[key].qty += (i.qty || 0);
    }));
    const itemRows = Object.entries(itemQtys).sort((a, b) => b[1].qty - a[1].qty).slice(0, 8).map(([name, data], idx) => {
        return `<tr class="border-b border-gray-100 hover:bg-gray-50">
            <td class="py-2 px-4 text-sm">${idx + 1}. ${name}</td>
            <td class="py-2 px-4 text-sm text-right font-semibold text-gray-800">${new Intl.NumberFormat('id-ID').format(data.qty)} ${data.unit}</td>
        </tr>`;
    }).join('') || `<tr><td colspan="2" class="py-4 text-center text-gray-400 text-sm">Belum ada data</td></tr>`;

    // --- Detail Table PO ---
    const detailRows = pos.sort((a, b) => new Date(b.actualDeliveryDate) - new Date(a.actualDeliveryDate)).map(po => {
        const sup = suppliers.find(s => s.id === po.supplierId) || { name: '-' };
        const inv = purchaseInvoices.find(i => i.purchaseOrderId === po.id && i.status !== 'CANCELLED');
        const statusColor = {
            'RECEIVED': 'bg-green-100 text-green-700',
            'PARTIALLY RECEIVED': 'bg-orange-100 text-orange-700',
            'APPROVED': 'bg-blue-100 text-blue-700',
            'DRAFT': 'bg-gray-100 text-gray-600',
            'CANCELLED': 'bg-red-100 text-red-600'
        }[po.status] || 'bg-gray-100 text-gray-600';
        const catColorMap = {
            'Bahan Baku': 'bg-green-100 text-green-700',
            'Packaging': 'bg-purple-100 text-purple-700',
            'Perlengkapan': 'bg-yellow-100 text-yellow-700',
            'Service': 'bg-blue-100 text-blue-700',
            'Sparepart': 'bg-orange-100 text-orange-700',
            'Aktiva ( tetap )': 'bg-teal-100 text-teal-700',
            'Gas': 'bg-rose-100 text-rose-700',
        };
        const catBadge = po.category
            ? `<span class="px-2 py-0.5 rounded text-[10px] font-bold ${catColorMap[po.category] || 'bg-gray-100 text-gray-600'}">${po.category}</span>`
            : `<span class="text-gray-300 text-[10px]">-</span>`;
        return `<tr class="border-b border-gray-100 hover:bg-gray-50 text-sm">
            <td class="py-2 px-3 font-medium text-blue-600 cursor-pointer hover:underline" onclick="viewPO('${po.id}')" title="Klik untuk lihat & print PDF">${po.poNumber}</td>
            <td class="py-2 px-3 text-gray-600">${po.actualDeliveryDate ? formatDate(po.actualDeliveryDate).slice(0, 11) : '<span class="text-gray-400 text-xs italic">Belum tiba</span>'}</td>
            <td class="py-2 px-3 text-gray-800">${sup.name}</td>
            <td class="py-2 px-3">${catBadge}</td>
            <td class="py-2 px-3 text-right font-semibold text-gray-800">${formatCurrency(po.totalAmount)}</td>
            <td class="py-2 px-3"><span class="px-2 py-0.5 rounded text-xs font-semibold ${statusColor}">${po.status}</span></td>
            <td class="py-2 px-3 text-center">${inv ? `<span class="px-2 py-0.5 bg-purple-100 text-purple-700 rounded text-xs font-semibold">Invoiced</span>` : `<span class="text-gray-400 text-xs">-</span>`}</td>
        </tr>`;
    }).join('') || `<tr><td colspan="7" class="py-4 text-center text-gray-400">Tidak ada PO dalam rentang tanggal ini</td></tr>`;

    document.getElementById('purchase_report_output').innerHTML = `
        ${summaryHtml}
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
            <div class="bg-white rounded-xl shadow-sm border border-gray-100">
                <div class="p-4 border-b border-gray-100"><h3 class="font-semibold text-gray-800">Top Supplier</h3></div>
                <table class="w-full"><tbody>${supRows}</tbody></table>
            </div>
            <div class="bg-white rounded-xl shadow-sm border border-gray-100">
                <div class="p-4 border-b border-gray-100"><h3 class="font-semibold text-gray-800">Top Item Dibeli</h3></div>
                <table class="w-full"><tbody>${itemRows}</tbody></table>
            </div>
        </div>
        <div class="bg-white rounded-xl shadow-sm border border-gray-100">
            <div class="p-4 border-b border-gray-100 flex justify-between items-center">
                <h3 class="font-semibold text-gray-800">Detail Purchase Orders</h3>
                <span class="text-xs text-gray-500">${pos.length} PO ditemukan</span>
            </div>
            <div class="overflow-x-auto">
                <table class="w-full text-left border-collapse">
                    <thead><tr class="bg-gray-50 border-b border-gray-200">
                        <th class="py-2 px-3 text-xs font-semibold text-gray-600 uppercase">No. PO</th>
                        <th class="py-2 px-3 text-xs font-semibold text-gray-600 uppercase">Tgl Kedatangan</th>
                        <th class="py-2 px-3 text-xs font-semibold text-gray-600 uppercase">Supplier</th>
                        <th class="py-2 px-3 text-xs font-semibold text-gray-600 uppercase">Kategori</th>
                        <th class="py-2 px-3 text-xs font-semibold text-gray-600 uppercase text-right">Total</th>
                        <th class="py-2 px-3 text-xs font-semibold text-gray-600 uppercase">Status</th>
                        <th class="py-2 px-3 text-xs font-semibold text-gray-600 uppercase text-center">Invoice</th>
                    </tr></thead>
                    <tbody>${detailRows}</tbody>
                </table>
            </div>
        </div>`;
};


// Stubs for other views
// --- Master Products Module ---
function renderMasterProducts() {
    const canEdit = getModulePermission('logistik').edit;
    document.getElementById('pageTitle').innerText = 'Master Produk';
    const mainContent = document.getElementById('main-content');

    // Fetch from inventoryItems, filtered for Finished Goods (Consistent with user request)
    const allItems = db.read('inventoryItems') || [];
    const products = allItems.filter(i => {
        const cat = (i.category || '').toUpperCase();
        return (cat.includes('FINISH') || cat.includes('JADI') || cat.includes('FG')) && i.status !== 'INACTIVE';
    });

    let rows = products.map(p => {
        const stock = db.getInventoryStock(p.id);
        return `
        <tr class="border-b border-gray-100 group hover:bg-slate-50 transition-colors">
            <td class="py-4 px-4 text-xs text-slate-400 font-mono font-bold">${p.itemCode}</td>
            <td class="py-4 px-4 text-sm text-slate-800 font-bold">${p.itemName}</td>
            <td class="py-4 px-4">
                <span class="px-2 py-1 bg-green-50 text-green-700 rounded-md text-[10px] font-black uppercase tracking-widest border border-green-100">
                    ${p.category === 'FINISHED_GOODS' ? 'Gudang Jadi' : p.category}
                </span>
            </td>
            <td class="py-4 px-4 text-xs font-black text-slate-400 uppercase tracking-widest">${p.unit}</td>
            <td class="py-4 px-4 text-sm text-slate-800 font-black text-right">${formatNumber(p.minStock)}</td>
            <td class="py-4 px-4 text-sm text-right">
                ${canEdit ? `
                <div class="flex justify-end gap-1 opacity-100 sm:opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onclick="renderInventoryItemForm('${p.id}')" class="p-2 text-blue-500 hover:bg-blue-50 rounded-lg transition-all" title="Edit"><i class="fas fa-edit"></i></button>
                    <button onclick="deleteInventoryItem('${p.id}')" class="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-all" title="Delete"><i class="fas fa-trash-alt"></i></button>
                </div>
                ` : '<span class="text-slate-300 text-[10px] font-bold uppercase italic">No Access</span>'}
            </td>
        </tr>
        `;
    }).join('');

    if (products.length === 0) {
        rows = `<tr><td colspan="6" class="py-12 text-center text-slate-400 italic font-medium uppercase tracking-widest text-xs">Belum ada data produk jadi / gudang jadi</td></tr>`;
    }

    mainContent.innerHTML = `
        <div class="bg-white rounded-lg shadow-sm border border-gray-100">
            <div class="flex justify-between items-center p-4 sm:p-6 border-b border-gray-100">
                <h2 class="text-lg font-semibold text-gray-800">Daftar Produk</h2>
                <div class="flex gap-2">
                    ${canEdit ? `
                    <button onclick="renderInventoryItemForm()" class="bg-blue-600 hover:bg-slate-900 text-white px-5 py-2.5 rounded-xl transition-all text-[10px] font-black uppercase tracking-widest shadow-lg active:scale-95">
                        <i class="fas fa-plus mr-2"></i>Tambah Produk
                    </button>
                    ` : `
                    <span class="text-xs font-medium text-orange-500 bg-orange-50 border border-orange-100 px-3 py-1.5 rounded-lg flex items-center gap-2">
                        <i class="fas fa-info-circle"></i> Mode Lihat Saja
                    </span>
                    `}
                </div>
            </div>
            <div class="overflow-x-auto">
                <table class="w-full text-left border-collapse">
                    <thead>
                        <tr class="bg-gray-50 border-b border-gray-200">
                            <th class="py-3 px-4 text-xs font-semibold text-gray-600 uppercase tracking-wider">Kode</th>
                            <th class="py-3 px-4 text-xs font-semibold text-gray-600 uppercase tracking-wider">Nama Produk</th>
                            <th class="py-3 px-4 text-xs font-semibold text-gray-600 uppercase tracking-wider">Tipe</th>
                            <th class="py-3 px-4 text-xs font-semibold text-gray-600 uppercase tracking-wider">Satuan</th>
                            <th class="py-3 px-4 text-xs font-semibold text-gray-600 uppercase tracking-wider text-right">Min. Stok</th>
                            <th class="py-3 px-4 text-xs font-semibold text-gray-600 uppercase tracking-wider text-right">Aksi</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${rows}
                    </tbody>
                </table>
            </div>
        </div>
        `;

    // Attach functions to window so inline onclick works
    window.openProductModal = (id = null) => {
        const p = id ? db.findById('products', id) : null;
        const unitOpts = units.map(u => `<option value="${u.code}" ${p && p.unit === u.code ? 'selected' : ''}> ${u.name} (${u.code})</option> `).join('');

        const body = `
        <form id="productForm" class="space-y-4">
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                    <label class="block text-sm font-medium text-gray-700 mb-1">Kode Produk</label>
                    <input type="text" id="p_code" required value="${p ? p.code : ''}" class="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
                </div>
                <div>
                    <label class="block text-sm font-medium text-gray-700 mb-1">Nama Produk</label>
                    <input type="text" id="p_name" required value="${p ? p.name : ''}" class="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
                </div>
                <div>
                    <label class="block text-sm font-medium text-gray-700 mb-1">Tipe</label>
                    <select id="p_type" class="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500">
                        <option value="RAW_MATERIAL" ${p && p.type === 'RAW_MATERIAL' ? 'selected' : ''}>Raw Material (Bahan Baku)</option>
                        <option value="WIP" ${p && p.type === 'WIP' ? 'selected' : ''}>WIP (Barang Setengah Jadi)</option>
                        <option value="FINISHED_GOODS" ${p && p.type === 'FINISHED_GOODS' ? 'selected' : ''}>Finished Goods (Barang Jadi)</option>
                    </select>
                </div>
                <div>
                    <label class="block text-sm font-medium text-gray-700 mb-1">Satuan</label>
                    <select id="p_unit" class="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500">
                        ${unitOpts}
                    </select>
                </div>
                <div>
                    <label class="block text-sm font-medium text-gray-700 mb-1">Minimum Stok</label>
                    <input type="number" id="p_minstock" min="0" required value="${p ? p.minStock : '0'}" class="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500">
                </div>
            </div>
            </form>
        `;

        const footer = `
        <button type="button" onclick="saveProduct('${id || ''}')" class="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-blue-600 text-base font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:ml-3 sm:w-auto sm:text-sm">
            Simpan
            </button>
        <button type="button" onclick="closeModal()" class="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm">
            Batal
        </button>
    `;

        showModal(id ? 'Edit Produk' : 'Tambah Produk Baru', body, footer);
    };

    window.saveProduct = (id) => {
        const code = document.getElementById('p_code').value;
        const name = document.getElementById('p_name').value;
        const type = document.getElementById('p_type').value;
        const unit = document.getElementById('p_unit').value;
        const minStock = parseFloat(document.getElementById('p_minstock').value) || 0;

        if (!code || !name) { showToast('Kode dan Nama harus diisi', 'error'); return; }

        const data = { code, name, type, unit, minStock };
        if (id) {
            db.update('products', id, data);
            showToast('Produk berhasil diperbarui');
        } else {
            db.insert('products', data);
            showToast('Produk baru berhasil ditambahkan');
        }
        closeModal();
        renderMasterProducts(); // refresh
    };

    window.editProduct = (id) => openProductModal(id);
    window.deleteProduct = (id) => {
        if (confirm('Yakin ingin menghapus produk ini?')) {
            db.delete('products', id);
            showToast('Produk terhapus');
            renderMasterProducts();
        }
    };
}
// --- Inventory Module (Stock Card & Recap) ---
function renderStockCard(activeTab = 'recap') {
    document.getElementById('pageTitle').innerText = 'Inventaris & Stok';
    const mainContent = document.getElementById('main-content');

    // Tabs UI
    const tabRecapClass = activeTab === 'recap' ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300';
    const tabCardClass = activeTab === 'card' ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300';
    const tabSalesClass = activeTab === 'sales' ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300';

    let contentHtml = '';

    if (activeTab === 'recap') {
        const products = db.read('products');
        let rows = products.map(p => {
            const currentStock = db.getCurrentStock(p.id);
            const isLow = currentStock < p.minStock;
            const stockColor = isLow ? 'text-red-600 font-bold' : 'text-gray-800 font-medium';
            const alertBadge = isLow ? `<span class="ml-2 px-2 py-0.5 bg-red-100 text-red-700 rounded text-[10px] uppercase font-bold"> Low Stock</span> ` : '';

            return `
        <tr class="border-b border-gray-100 ${isLow ? 'bg-red-50/30' : ''}">
                    <td class="py-3 px-4 text-sm text-gray-800">${p.code}</td>
                    <td class="py-3 px-4 text-sm text-gray-800">${p.name} ${alertBadge}</td>
                    <td class="py-3 px-4 text-sm text-gray-600">${p.type}</td>
                    <td class="py-3 px-4 text-sm ${stockColor} text-right">${currentStock} ${p.unit}</td>
                    <td class="py-3 px-4 text-sm text-gray-500 text-right">${formatNumber(p.minStock)}</td>
                </tr>
        `;
        }).join('');

        if (products.length === 0) rows = `<tr > <td colspan="5" class="py-4 text-center text-gray-500">Belum ada data produk</td></tr> `;

        contentHtml = `
        <div class="overflow-x-auto">
            <table class="w-full text-left border-collapse">
                <thead>
                    <tr class="bg-gray-50 border-b border-gray-200">
                        <th class="py-3 px-4 text-xs font-semibold text-gray-600 uppercase tracking-wider">Kode</th>
                        <th class="py-3 px-4 text-xs font-semibold text-gray-600 uppercase tracking-wider">Nama Produk</th>
                        <th class="py-3 px-4 text-xs font-semibold text-gray-600 uppercase tracking-wider">Tipe</th>
                        <th class="py-3 px-4 text-xs font-semibold text-gray-600 uppercase tracking-wider text-right">Stok Aktual</th>
                        <th class="py-3 px-4 text-xs font-semibold text-gray-600 uppercase tracking-wider text-right">Min. Stok</th>
                    </tr>
                </thead>
                <tbody>${rows}</tbody>
            </table>
            </div>
        `;
    } else if (activeTab === 'card') {
        // Stock Card (New: using stockTransactions)
        const txs = db.read('stockTransactions').sort((a, b) => new Date(b.date) - new Date(a.date));
        const items = db.read('inventoryItems');

        let rows = txs.map(t => {
            const item = items.find(i => i.id === t.itemId) || { itemName: t.itemName || 'Unknown', unit: t.unit || '' };

            // Color logic based on transaction type
            let typeColor = 'text-gray-600 bg-gray-50';
            let icon = 'fa-dot-circle';
            if (t.type === 'IN') { typeColor = 'text-green-600 bg-green-50'; icon = 'fa-arrow-down'; }
            else if (t.type === 'OUT' || t.type === 'SHRINKAGE') { typeColor = 'text-red-600 bg-red-50'; icon = 'fa-arrow-up'; }
            else if (t.type === 'NG_IN') { typeColor = 'text-orange-600 bg-orange-50'; icon = 'fa-exclamation-triangle'; }

            return `
                <tr class="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                    <td class="py-3 px-4 text-xs font-mono text-gray-500">${t.date ? t.date.slice(0, 16).replace('T', ' ') : '-'}</td>
                    <td class="py-3 px-4 text-sm font-medium text-gray-800">${item.itemName}</td>
                    <td class="py-3 px-4 text-xs font-bold text-gray-400 uppercase tracking-widest">${t.location || 'WHS'}</td>
                    <td class="py-3 px-4 text-sm text-center">
                        <span class="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${typeColor}">
                            <i class="fas ${icon} mr-1"></i>${t.type}
                        </span>
                    </td>
                    <td class="py-3 px-4 text-sm text-right font-black ${t.type === 'IN' ? 'text-green-600' : t.type === 'NG_IN' ? 'text-orange-600' : 'text-red-600'}">
                        ${t.type === 'IN' || t.type === 'NG_IN' ? '+' : '-'}${invFmt(t.qty)} <span class="text-[10px] font-normal text-gray-400 ml-1 uppercase">${item.unit || ''}</span>
                    </td>
                    <td class="py-3 px-4 text-xs text-gray-500 font-medium">${t.reference || '-'}</td>
                    <td class="py-3 px-4 text-xs text-gray-400 italic">${t.notes || '-'}</td>
                </tr>
            `;
        }).join('');

        if (txs.length === 0) rows = `<tr><td colspan="7" class="py-8 text-center text-gray-400 italic">Belum ada pergerakan stok (Transaksi kosong).</td></tr>`;

        contentHtml = `
            <div class="overflow-x-auto">
                <table class="w-full text-left border-collapse">
                    <thead class="bg-gray-50 text-gray-400 text-[10px] uppercase font-black tracking-widest">
                        <tr>
                            <th class="py-3 px-4 border-b border-gray-200">Tanggal/Jam</th>
                            <th class="py-3 px-4 border-b border-gray-200">Item</th>
                            <th class="py-3 px-4 border-b border-gray-200">Gudang</th>
                            <th class="py-3 px-4 border-b border-gray-200 text-center">Tipe</th>
                            <th class="py-3 px-4 border-b border-gray-200 text-right">Kuantitas</th>
                            <th class="py-3 px-4 border-b border-gray-200">Ref</th>
                            <th class="py-3 px-4 border-b border-gray-200">Keterangan</th>
                        </tr>
                    </thead>
                    <tbody class="divide-y divide-gray-100">${rows}</tbody>
                </table>
            </div>
        `;
    } else if (activeTab === 'sales') {
        const sos = db.read('salesOrders').filter(so => so.status !== 'DELIVERED').sort((a, b) => new Date(b.date) - new Date(a.date));
        const customers = db.read('customers');

        let rows = sos.map(so => {
            const customer = customers.find(c => c.id === so.customerId) || { name: 'Unknown' };
            return `
                <tr class="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                    <td class="py-3 px-4 text-sm font-medium text-blue-600">${so.soNumber}</td>
                    <td class="py-3 px-4 text-sm text-gray-600">${formatDate(so.date).slice(0, 11)}</td>
                    <td class="py-3 px-4 text-sm text-gray-800">${customer.name}</td>
                    <td class="py-3 px-4 text-sm text-gray-800 text-right font-medium">${formatCurrency(so.totalAmount)}</td>
                    <td class="py-3 px-4 text-sm">
                        <span class="px-2 py-1 ${so.status === 'CONFIRMED' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-700'} rounded text-xs font-semibold">${so.status}</span>
                    </td>
                    <td class="py-3 px-4 text-sm text-right">
                        <button onclick="viewSO('${so.id}')" class="text-gray-500 hover:text-gray-700" title="Detail"><i class="fas fa-eye"></i></button>
                    </td>
                </tr>
            `;
        }).join('');

        if (sos.length === 0) rows = `<tr><td colspan="6" class="py-4 text-center text-gray-500">Tidak ada pesanan keluar yang menunggu pengiriman</td></tr>`;

        contentHtml = `
            <div class="overflow-x-auto">
                <table class="w-full text-left border-collapse">
                    <thead>
                        <tr class="bg-gray-50 border-b border-gray-200">
                            <th class="py-3 px-4 text-xs font-semibold text-gray-600 uppercase tracking-wider">No. SO</th>
                            <th class="py-3 px-4 text-xs font-semibold text-gray-600 uppercase tracking-wider">Tanggal</th>
                            <th class="py-3 px-4 text-xs font-semibold text-gray-600 uppercase tracking-wider">Customer</th>
                            <th class="py-3 px-4 text-xs font-semibold text-gray-600 uppercase tracking-wider text-right">Total</th>
                            <th class="py-3 px-4 text-xs font-semibold text-gray-600 uppercase tracking-wider">Status</th>
                            <th class="py-3 px-4 text-xs font-semibold text-gray-600 uppercase tracking-wider text-right">Aksi</th>
                        </tr>
                    </thead>
                    <tbody>${rows}</tbody>
                </table>
            </div>
        `;
    }

    mainContent.innerHTML = `
        <div class="bg-white rounded-lg shadow-sm border border-gray-100">
            <div class="border-b border-gray-200">
                <nav class="-mb-px flex space-x-8 px-6" aria-label="Tabs">
                    <button onclick="renderStockCard('recap')" class="${tabRecapClass} whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm">
                        Rekap Saldo Stok
                    </button>
                    <button onclick="renderStockCard('card')" class="${tabCardClass} whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm">
                        Kartu Stok (Riwayat)
                    </button>
                    <button onclick="renderStockCard('sales')" class="${tabSalesClass} whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm">
                        Pesanan Keluar (Sales Order)
                    </button>
                </nav>
            </div>
            ${contentHtml}
        </div>
    `;

    // Make renderStockCard globally accessible for tab switching
    window.renderStockCard = renderStockCard;
}
// --- Purchase Orders Module ---
function renderPurchaseOrders() {
    const canEdit = getModulePermission('pembelian').edit;
    document.getElementById('pageTitle').innerText = 'Purchase Order';
    const mainContent = document.getElementById('main-content');

    const statusOrder = {
        'DRAFT': 1,
        'APPROVED': 2,
        'PARTIALLY RECEIVED': 3,
        'RECEIVED': 4,
        'CANCELLED': 5
    };
    let pos = (db.read('purchaseOrders') || []).sort((a, b) => {
        const orderA = statusOrder[a.status] || 99;
        const orderB = statusOrder[b.status] || 99;
        if (orderA !== orderB) return orderA - orderB;
        return new Date(b.date || 0) - new Date(a.date || 0);
    });
    let filters = window.currentFilters.purchaseOrders || {};
    const suppliers = db.read('suppliers') || [];

    // Filter Logic
    if (filters.start) { const d = new Date(filters.start); d.setHours(0, 0, 0, 0); pos = pos.filter(po => new Date(po.date) >= d); }
    if (filters.end) { const d = new Date(filters.end); d.setHours(23, 59, 59, 999); pos = pos.filter(po => new Date(po.date) <= d); }
    if (filters.supplier) { pos = pos.filter(po => po.supplierId === filters.supplier); }
    if (filters.category) { pos = pos.filter(po => po.category === filters.category); }

    let rows = pos.map(po => {
        const supplier = suppliers.find(s => s.id === po.supplierId) || { name: 'Unknown' };

        let statusBadge = '';
        if (po.status === 'DRAFT') statusBadge = '<span class="px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs font-semibold">DRAFT</span>';
        if (po.status === 'APPROVED') statusBadge = '<span class="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs font-semibold">APPROVED</span>';
        if (po.status === 'PARTIALLY RECEIVED') statusBadge = '<span class="px-2 py-1 bg-orange-100 text-orange-700 rounded text-xs font-semibold">PARTIAL</span>';
        if (po.status === 'RECEIVED') statusBadge = '<span class="px-2 py-1 bg-green-100 text-green-700 rounded text-xs font-semibold">RECEIVED</span>';
        if (po.status === 'CANCELLED') statusBadge = '<span class="px-2 py-1 bg-red-100 text-red-700 rounded text-xs font-semibold">CANCELLED</span>';

        // Action buttons based on status — "Pilih Aksi..." dropdown
        let poOptions = `<option value="view">Lihat Detail</option>`;

        if (canEdit && po.status === 'DRAFT') {
            poOptions += `<option value="send">Kirim ke Supplier</option>`;
            poOptions += `<option value="approve">Approve</option>`;
            poOptions += `<option value="delete">Hapus</option>`;
        } else if (canEdit && (po.status === 'APPROVED' || po.status === 'PARTIALLY RECEIVED')) {
            poOptions += `<option value="send">Kirim Ulang</option>`;
            poOptions += `<option value="delete">Hapus</option>`;
        } else if (po.status === 'RECEIVED') {
            poOptions += `<option value="send">Kirim Ulang</option>`;
        } else if (po.status === 'CANCELLED') {
            poOptions += `<option value="delete">Hapus</option>`;
        }

        let actions = `
            <div class="inline-block relative w-full md:w-[140px]">
                <select class="w-full bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 font-bold text-xs rounded-lg pl-3 pr-8 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer appearance-none transition-all shadow-sm" onchange="handlePOAction(this, '${po.id}')">
                    <option value="" disabled selected>Pilih Aksi...</option>
                    ${poOptions}
                </select>
                <div class="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3 text-slate-400">
                    <i class="fas fa-chevron-down text-[10px]"></i>
                </div>
            </div>
        `;



        // ETD cell with delay indicator
        const today2 = new Date(); today2.setHours(0, 0, 0, 0);
        let etdCell = '<span class="text-gray-400 text-xs">-</span>';
        if (po.etd) {
            const etdDate = new Date(po.etd); etdDate.setHours(0, 0, 0, 0);
            if (po.status === 'RECEIVED' && po.actualDeliveryDate) {
                const actDate = new Date(po.actualDeliveryDate); actDate.setHours(0, 0, 0, 0);
                const diff = Math.round((actDate - etdDate) / 86400000);
                etdCell = diff <= 0
                    ? `<span class="text-green-600 font-medium text-xs">${po.etd}</span><br><span class="text-green-500 text-[10px]"><i class="fas fa-check text-[8px] mr-1"></i> On Time</span>`
                    : `<span class="text-gray-600 text-xs">${po.etd}</span><br><span class="text-red-500 text-[10px]"><i class="fas fa-exclamation-triangle text-[8px] mr-1"></i> Delay ${diff}h</span>`;
            } else if (po.status !== 'RECEIVED' && today2 > etdDate) {
                const overdue = Math.round((today2 - etdDate) / 86400000);
                etdCell = `<span class="text-red-600 font-medium text-xs">${po.etd}</span><br><span class="text-orange-500 text-[10px]"><i class="fas fa-exclamation-triangle text-[8px] mr-1"></i> Terlambat ${overdue}h</span>`;
            } else {
                etdCell = `<span class="text-gray-700 text-xs">${po.etd}</span>`;
            }
        }

        const catColorMap = {
            'Bahan Baku': 'bg-green-100 text-green-700',
            'Packaging': 'bg-purple-100 text-purple-700',
            'Perlengkapan': 'bg-yellow-100 text-yellow-700',
            'Service': 'bg-blue-100 text-blue-700',
            'Sparepart': 'bg-orange-100 text-orange-700',
            'Aktiva ( tetap )': 'bg-teal-100 text-teal-700',
            'Gas': 'bg-rose-100 text-rose-700',
        };
        const catBadge = po.category
            ? `<span class="px-2 py-0.5 rounded text-[10px] font-bold whitespace-nowrap ${catColorMap[po.category] || 'bg-gray-100 text-gray-600'}">${po.category}</span>`
            : `<span class="text-gray-300 text-[10px]">-</span>`;

        return `
            <tr class="border-b border-gray-100 hover:bg-slate-50 transition-colors">
                <td class="py-4 px-6 whitespace-nowrap">
                    <button onclick="viewPO('${po.id}')" class="text-blue-700 hover:text-blue-800 font-mono text-sm font-bold transition-colors cursor-pointer outline-none bg-blue-50/80 px-3.5 py-1.5 rounded-lg border border-blue-200 shadow-sm">
                        ${po.poNumber.toUpperCase()}
                    </button>
                </td>
                <td class="py-4 px-6 text-sm text-slate-500 font-medium">${formatDate(po.date).split(' ')[0]}</td>
                <td class="py-4 px-6 text-sm text-slate-900 font-bold tracking-tight">${supplier.name}</td>
                <td class="py-4 px-6">${catBadge}</td>
                <td class="py-4 px-6 text-sm text-slate-800 font-bold text-right">${formatCurrency(po.totalAmount)}</td>
                <td class="py-4 px-6 text-center">${statusBadge}</td>
                <td class="py-4 px-6 text-right whitespace-nowrap">
                    <div class="flex items-center justify-end gap-2 px-1">
                        ${actions}
                    </div>
                </td>
            </tr>
        `;
    }).join('');

    if (pos.length === 0) rows = `<tr > <td colspan="7" class="py-4 text-center text-gray-500">Belum ada Purchase Order</td></tr> `;

    mainContent.innerHTML = `
        <div id="po-list-view" class="animate-in fade-in duration-300 h-[calc(100vh-64px)] flex flex-col bg-slate-50 -m-4 sm:-m-6">
            <!-- Full Width Fixed Filter Bar -->
            <div class="bg-white border-b border-gray-200 shrink-0 z-40 shadow-sm relative">
                <div class="flex flex-wrap md:flex-nowrap justify-between items-center px-6 py-4 gap-4">
                    <div class="flex items-center gap-3 flex-1">
                        <div class="flex-1 max-w-md relative">
                            <i class="fas fa-search absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 text-sm cursor-text pointer-events-none"></i>
                            <input type="text" id="po_global_search" onkeyup="filterPOTable()" placeholder="Search Purchase Orders..." 
                                class="w-full pl-11 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm font-medium text-slate-700 placeholder:text-slate-400 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:bg-white outline-none transition-all">
                        </div>
                        
                        <!-- Date Filter Dropdown Trigger -->
                        <div class="relative" id="po_date_filter_container">
                            <button onclick="togglePODateDropdown()" class="flex items-center bg-slate-50 border border-slate-200 rounded-xl overflow-hidden hover:bg-slate-100 transition-all shadow-sm h-[38px] group p-0">
                                <span class="bg-slate-100 border-r border-slate-200 px-3 h-full flex items-center text-slate-600 transition-colors">
                                    <i class="fas fa-sort-amount-up text-[13px]"></i>
                                </span>
                                <span class="px-4 text-[14px] font-medium text-blue-600">Date</span>
                                <span class="pr-3 pl-1 text-slate-500 justify-center flex items-center">
                                    <i class="fas fa-chevron-down text-[11px]"></i>
                                </span>
                            </button>
                            
                            <!-- Dropdown Content -->
                            <div id="po_date_dropdown" class="absolute left-0 mt-2 w-72 bg-white border border-slate-100 rounded-2xl shadow-xl z-[200] hidden p-5 animate-in fade-in zoom-in-95 duration-200">
                                <h4 class="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Filter Berdasarkan Tanggal</h4>
                                <div class="space-y-4">
                                    <div>
                                        <label class="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Dari Tanggal</label>
                                        <input type="date" id="po_header_start" value="${filters.start || ''}" class="w-full border border-slate-100 rounded-xl px-3 py-2 text-sm font-bold text-slate-700 bg-slate-50/50 focus:bg-white focus:border-blue-500 outline-none transition-all">
                                    </div>
                                    <div>
                                        <label class="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Sampai Tanggal</label>
                                        <input type="date" id="po_header_end" value="${filters.end || ''}" class="w-full border border-slate-100 rounded-xl px-3 py-2 text-sm font-bold text-slate-700 bg-slate-50/50 focus:bg-white focus:border-blue-500 outline-none transition-all">
                                    </div>
                                    <div class="flex gap-2 pt-2">
                                        <button onclick="applyPOHeaderDateFilter()" class="flex-1 bg-blue-600 text-white py-2.5 rounded-xl text-[11px] font-black uppercase tracking-widest hover:bg-blue-700 transition-all shadow-md active:scale-95">Apply</button>
                                        <button onclick="resetPOHeaderDateFilter()" class="flex-1 bg-slate-50 text-slate-500 py-2.5 rounded-xl text-[11px] font-black uppercase tracking-widest hover:bg-slate-100 transition-all">Reset</button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div class="flex items-center gap-2">
                        <button onclick="openPOForm()" class="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2 rounded-lg transition-all text-sm font-medium shadow-sm flex items-center gap-2 active:scale-95">
                            <i class="fas fa-plus"></i> Buat PO Baru
                        </button>
                    </div>
                </div>
            </div>

            <!-- Table Container wrapper -->
            <div class="flex-1 overflow-auto">
                <table class="w-full text-left border-collapse" id="po_table">
                    <thead class="bg-slate-50 sticky top-0 z-30 shadow-[0_1px_0_#e2e8f0]">
                        <tr class="bg-gray-50/50">
                            <th class="py-3 px-6 text-[10px] font-black text-slate-400 uppercase tracking-widest whitespace-nowrap">No. PO</th>
                            <th class="py-3 px-6 text-[10px] font-black text-slate-400 uppercase tracking-widest whitespace-nowrap">Tanggal</th>
                            <th class="py-3 px-6 text-[10px] font-black text-slate-400 uppercase tracking-widest whitespace-nowrap">Supplier</th>
                            <th class="py-3 px-6 text-[10px] font-black text-slate-400 uppercase tracking-widest whitespace-nowrap">Kategori</th>
                            <th class="py-3 px-6 text-[10px] font-black text-slate-400 uppercase tracking-widest whitespace-nowrap text-right">Total</th>
                            <th class="py-3 px-6 text-[10px] font-black text-slate-400 uppercase tracking-widest whitespace-nowrap">Status</th>
                            <th class="py-3 px-6 text-[10px] font-black text-slate-400 uppercase tracking-widest whitespace-nowrap text-right">Aksi</th>
                        </tr>
                    </thead>
                    <tbody class="divide-y divide-slate-100 bg-white">${rows}</tbody>
                </table>
            </div>
            
            <div class="bg-slate-50 border-t border-slate-200 p-2 text-center text-[10px] font-black text-slate-400 tracking-widest uppercase shrink-0">
                TOTAL: ${pos.length} BARIS
            </div>
        </div>

        <!-- PO Form View -->
        <div id="po-form-view" class="hidden"></div>
    `;
}

window.filterPOTable = () => {
    const input = document.getElementById('po_global_search');
    if(!input) return;
    const filter = input.value.toLowerCase();
    const table = document.getElementById('po_table');
    const tr = table.getElementsByTagName('tr');

    for (let i = 1; i < tr.length; i++) {
        let textContent = tr[i].textContent || tr[i].innerText;
        if (textContent.toLowerCase().indexOf(filter) > -1) {
            tr[i].style.display = '';
        } else {
            tr[i].style.display = 'none';
        }
    }
};

window.togglePODateDropdown = () => {
    const el = document.getElementById('po_date_dropdown');
    if (el) el.classList.toggle('hidden');
};

window.applyPOHeaderDateFilter = () => {
    window.currentFilters.purchaseOrders = {
        ...window.currentFilters.purchaseOrders,
        start: document.getElementById('po_header_start').value,
        end: document.getElementById('po_header_end').value
    };
    renderPurchaseOrders();
};

window.resetPOHeaderDateFilter = () => {
    window.currentFilters.purchaseOrders = { 
        ...window.currentFilters.purchaseOrders,
        start: '', end: '' 
    };
    renderPurchaseOrders();
};

window.openSendPOModal = (id) => {
    const po = db.findById('purchaseOrders', id);
    const supplier = db.findById('suppliers', po.supplierId);

    const body = `
        <div class="p-6 text-center">
            <h3 class="text-lg font-bold text-gray-800 mb-2">Kirim Purchase Order</h3>
            <p class="text-gray-500 mb-8 text-sm">Pilih metode pengiriman untuk PO <strong>${po.poNumber}</strong></p>
            
            <div class="grid grid-cols-1 sm:grid-cols-3 gap-5">
                <button onclick="sendPOWhatsApp('${id}'); closeModal();" class="flex flex-col items-center justify-center p-6 border-2 border-green-50 rounded-2xl hover:border-green-500 hover:bg-green-50 transition-all group shadow-sm">
                    <div class="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4 group-hover:scale-110 transition-transform shadow-inner">
                        <i class="fab fa-whatsapp text-3xl text-green-600"></i>
                    </div>
                    <span class="font-black text-green-700 text-xs uppercase tracking-widest">WhatsApp</span>
                </button>
                
                <button onclick="sendPOEmail('${id}'); closeModal();" class="flex flex-col items-center justify-center p-6 border-2 border-blue-50 rounded-2xl hover:border-blue-500 hover:bg-blue-50 transition-all group shadow-sm">
                    <div class="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mb-4 group-hover:scale-110 transition-transform shadow-inner">
                        <i class="fas fa-envelope text-3xl text-blue-600"></i>
                    </div>
                    <span class="font-black text-blue-700 text-xs uppercase tracking-widest">Email</span>
                </button>

                <button onclick='printPOFromSend("${id}")' class="flex flex-col items-center justify-center p-6 border-2 border-purple-50 rounded-2xl hover:border-purple-500 hover:bg-purple-50 transition-all group shadow-sm">
                    <div class="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mb-4 group-hover:scale-110 transition-transform shadow-inner">
                        <i class="fas fa-file-pdf text-3xl text-purple-600"></i>
                    </div>
                    <span class="font-black text-purple-700 text-xs uppercase tracking-widest">PDF / Cetak</span>
                </button>
            </div>
        </div>
    `;

    showModal('', body, `<button onclick="closeModal()" class="w-full sm:w-auto px-6 py-2.5 bg-gray-100 text-gray-600 rounded-xl text-sm font-black uppercase tracking-widest hover:bg-gray-200 transition">Tutup</button>`, 'lg');
};

window.printPOFromSend = (id) => {
    closeModal();
    viewPO(id);
    setTimeout(() => {
        const printBtn = document.querySelector('button[onclick^="printHTML"]');
        if (printBtn) printBtn.click();
    }, 500);
};

window.sendPOWhatsApp = (id) => {
    const po = db.findById('purchaseOrders', id);
    const supplier = db.findById('suppliers', po.supplierId);
    if (!supplier?.phone) { showToast('Nomor WhatsApp supplier tidak ditemukan', 'error'); return; }

    let phone = supplier.phone.replace(/[^0-9]/g, '');
    if (phone.startsWith('0')) phone = '62' + phone.substring(1);

    const itemsStr = (po.items || []).map(i => `• *${i.prodText}*: ${formatNumber(i.qty)} ${i.unit || ''}`).join('%0A');
    const message = `Halo ${supplier.name},%0A%0AKami mengirimkan *Purchase Order (PO)* nomor *${po.poNumber}*:%0A%0A${itemsStr}%0A%0ATotal: *${formatCurrency(po.totalAmount)}*%0ATerm: *${po.paymentTerms || '-'}*%0AJatuh Tempo: *${po.dueDate || '-'}*%0A%0AMohon segera diproses. Terima kasih!%0A*${CONFIG.companyName}*`;

    window.open(`https://wa.me/${phone}?text=${message}`, '_blank');
};

window.sendPOEmail = (id) => {
    const po = db.findById('purchaseOrders', id);
    const supplier = db.findById('suppliers', po.supplierId);
    if (!supplier?.email) { showToast('Email supplier tidak ditemukan', 'error'); return; }

    const itemsStr = (po.items || []).map(i => `- ${i.prodText}: ${formatNumber(i.qty)} ${i.unit || ''}`).join('\n');
    const subject = `Purchase Order ${po.poNumber} - ${CONFIG.companyName}`;
    const mailBody = `Halo ${supplier.name},\n\nTerlampir detil Purchase Order nomor ${po.poNumber}:\n\n${itemsStr}\n\nTotal: ${formatCurrency(po.totalAmount)}\nTerm: ${po.paymentTerms || '-'}\nJatuh Tempo: ${po.dueDate || '-'}\n\nMohon untuk segera diproses dan dikonfirmasi.\n\nTerima kasih,\n${CONFIG.companyName}`;

    window.location.href = `mailto:${supplier.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(mailBody)}`;
};

function renderPurchaseReceiving() {
    const mainContent = document.getElementById('main-content');
    const tab = window.activeGRTab || 'pending';
    const suppliers = db.read('suppliers');

    document.getElementById('pageTitle').innerText = 'Purchase Received';

    // --- TAB NAVIGATION UI ---
    let tabsHtml = `
        <div class="flex items-center gap-1 bg-slate-100 p-1.5 rounded-2xl w-fit border border-slate-200/60 shadow-inner overflow-hidden">
            <button onclick="window.activeGRTab='pending'; renderPurchaseReceiving();" 
                class="px-8 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all duration-300 flex items-center gap-2 ${tab === 'pending' ? 'bg-white text-blue-600 shadow-md scale-100 border border-slate-100' : 'text-slate-400 hover:text-slate-600 hover:bg-white/40 opacity-70'}">
                <i class="fas fa-truck-loading"></i> Antrian Gudang
            </button>
            <button onclick="window.activeGRTab='history'; renderPurchaseReceiving();" 
                class="px-8 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all duration-300 flex items-center gap-2 ${tab === 'history' ? 'bg-white text-green-600 shadow-md scale-100 border border-slate-100' : 'text-slate-400 hover:text-slate-600 hover:bg-white/40 opacity-70'}">
                <i class="fas fa-history"></i> Riwayat Selesai
            </button>
        </div>
    `;

    if (tab === 'pending') {
        const canEdit = getModulePermission('pembelian').edit;
        const filters = window.currentFilters.purchaseReceivingPending;
        const supOptions = suppliers.map(s => `<option value="${s.id}" ${filters.supplier === s.id ? 'selected' : ''}>${s.name}</option>`).join('');

        let pos = db.read('purchaseOrders').filter(po => ['APPROVED', 'PARTIALLY RECEIVED'].includes(po.status)).sort((a, b) => new Date(b.date) - new Date(a.date));

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
                        <button onclick="viewPO('${po.id}')" class="text-blue-700 hover:text-blue-800 font-mono text-sm font-bold transition-colors cursor-pointer outline-none bg-blue-50/80 px-3.5 py-1.5 rounded-lg border border-blue-200 shadow-sm">
                            ${po.poNumber.toUpperCase()}
                        </button>
                    </td>
                    <td class="py-4 px-6 text-sm text-slate-500 font-medium">${formatDate(po.date).split(' ')[0]}</td>
                    <td class="py-4 px-6 text-sm text-slate-900 font-bold tracking-tight">${supplier.name}</td>
                    <td class="py-4 px-6">
                        <div class="flex items-center gap-3">
                            <div class="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden" style="min-width:100px">
                                <div class="h-full bg-blue-500 rounded-full transition-all duration-1000" style="width: ${progressPct}%"></div>
                            </div>
                            <span class="text-[10px] font-black text-slate-500 tracking-tighter w-12 text-right">${receivedQty}/${totalQty}</span>
                        </div>
                    </td>
                    <td class="py-4 px-6 text-center">
                        <span class="px-3 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest border border-blue-100 bg-blue-50 text-blue-600">${po.status}</span>
                    </td>
                    <td class="py-4 px-6 text-right whitespace-nowrap">
                        ${canEdit ? `
                        <button onclick="receiveGoodsPO('${po.id}')" class="bg-blue-600 hover:bg-slate-900 text-white px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-blue-200 transition-all active:scale-95 flex items-center gap-2 ml-auto">
                            <i class="fas fa-box-open"></i> TERIMA
                        </button>
                        ` : ''}
                    </td>
                </tr>`;
        }).join('');

        if (pos.length === 0) rows = `<tr><td colspan="6" class="py-32 text-center text-slate-300 font-black uppercase tracking-widest opacity-40 italic"><i class="fas fa-truck-loading text-5xl mb-4"></i><br>Tidak ada antrian penerimaan barang</td></tr>`;

        mainContent.innerHTML = `
            <div id="pgr-pending-list-view" class="animate-in fade-in duration-300 h-[calc(100vh-64px)] flex flex-col bg-slate-50 -m-4 sm:-m-6">
                <!-- Full Width Fixed Header Bar -->
                <div class="bg-white border-b border-gray-200 shrink-0 z-40 shadow-sm relative">
                    <div class="flex flex-wrap md:flex-nowrap justify-between items-center px-6 py-4 gap-4">
                        <div class="flex items-center gap-3 flex-1">
                            <div class="flex-1 max-w-md relative">
                                <i class="fas fa-search absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 text-sm cursor-text pointer-events-none"></i>
                                <input type="text" id="pgr_pending_search" onkeyup="filterPGRTable()" placeholder="Search Pending Receiving..." 
                                    class="w-full pl-11 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm font-medium text-slate-700 placeholder:text-slate-400 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:bg-white outline-none transition-all">
                            </div>
                            
                            <!-- Date Filter Dropdown Trigger -->
                            <div class="relative" id="pgr_pending_date_filter_container">
                                <button onclick="togglePGRPendingDateDropdown()" class="flex items-center bg-slate-50 border border-slate-200 rounded-xl overflow-hidden hover:bg-slate-100 transition-all shadow-sm h-[38px] group p-0">
                                    <span class="bg-slate-100 border-r border-slate-200 px-3 h-full flex items-center text-slate-600 transition-colors">
                                        <i class="fas fa-sort-amount-up text-[13px]"></i>
                                    </span>
                                    <span class="px-4 text-[14px] font-medium text-blue-600">Date</span>
                                    <span class="pr-3 pl-1 text-slate-500 justify-center flex items-center">
                                        <i class="fas fa-chevron-down text-[11px]"></i>
                                    </span>
                                </button>
                                
                                <!-- Dropdown Content -->
                                <div id="pgr_pending_date_dropdown" class="absolute left-0 mt-2 w-72 bg-white border border-slate-100 rounded-2xl shadow-xl z-[200] hidden p-5 animate-in fade-in zoom-in-95 duration-200">
                                    <h4 class="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Filter Berdasarkan Tanggal</h4>
                                    <div class="space-y-4">
                                        <div>
                                            <label class="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Dari Tanggal</label>
                                            <input type="date" id="pgr_pending_header_start" value="${filters.start || ''}" class="w-full border border-slate-100 rounded-xl px-3 py-2 text-sm font-bold text-slate-700 bg-slate-50/50 focus:bg-white focus:border-blue-500 outline-none transition-all">
                                        </div>
                                        <div>
                                            <label class="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Sampai Tanggal</label>
                                            <input type="date" id="pgr_pending_header_end" value="${filters.end || ''}" class="w-full border border-slate-100 rounded-xl px-3 py-2 text-sm font-bold text-slate-700 bg-slate-50/50 focus:bg-white focus:border-blue-500 outline-none transition-all">
                                        </div>
                                        <div class="flex gap-2 pt-2">
                                            <button onclick="applyPGRPendingHeaderDateFilter()" class="flex-1 bg-blue-600 text-white py-2.5 rounded-xl text-[11px] font-black uppercase tracking-widest hover:bg-blue-700 transition-all shadow-md active:scale-95">Apply</button>
                                            <button onclick="resetPGRPendingHeaderDateFilter()" class="flex-1 bg-slate-50 text-slate-500 py-2.5 rounded-xl text-[11px] font-black uppercase tracking-widest hover:bg-slate-100 transition-all">Reset</button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div class="px-6 pb-4">
                        ${tabsHtml}
                    </div>
                </div>

                <div class="flex-1 overflow-auto">
                    <table class="w-full text-left border-collapse" id="pgr_table">
                        <thead class="bg-slate-50 sticky top-0 z-30 shadow-[0_1px_0_#e2e8f0]">
                            <tr class="bg-slate-50/50 border-b border-slate-100">
                                <th class="py-4 px-6 text-[10px] font-black text-slate-400 uppercase tracking-widest whitespace-nowrap">No. PO</th>
                                <th class="py-4 px-6 text-[10px] font-black text-slate-400 uppercase tracking-widest whitespace-nowrap">Tgl Order</th>
                                <th class="py-4 px-6 text-[10px] font-black text-slate-400 uppercase tracking-widest whitespace-nowrap">Supplier</th>
                                <th class="py-4 px-6 text-[10px] font-black text-slate-400 uppercase tracking-widest whitespace-nowrap">Progres Terima</th>
                                <th class="py-4 px-6 text-[10px] font-black text-slate-400 uppercase tracking-widest whitespace-nowrap text-center">Status</th>
                                <th class="py-4 px-6 text-[10px] font-black text-slate-400 uppercase tracking-widest whitespace-nowrap text-right">Aksi</th>
                            </tr>
                        </thead>
                        <tbody class="divide-y divide-slate-100 bg-white">${rows}</tbody>
                    </table>
                </div>
                
                <div class="bg-slate-50 border-t border-slate-200 p-2 text-center text-[10px] font-black text-slate-400 tracking-widest uppercase shrink-0">
                    TOTAL: ${pos.length} DOKUMEN MENUNGGU
                </div>
            </div>`;
    } else {
        // --- HISTORY TAB ---
        const filters = window.currentFilters.purchaseReceivingHistory;
        const supOptions = suppliers.map(s => `<option value="${s.id}" ${filters.supplier === s.id ? 'selected' : ''}>${s.name}</option>`).join('');

        let pos = db.read('purchaseOrders').filter(po => po.status === 'RECEIVED').sort((a, b) => new Date(b.actualDeliveryDate || b.date) - new Date(a.actualDeliveryDate || a.date));

        // Apply Date & Supplier Filters
        if (filters.start) { const d = new Date(filters.start); d.setHours(0, 0, 0, 0); pos = pos.filter(po => new Date(po.actualDeliveryDate || po.date) >= d); }
        if (filters.end) { const d = new Date(filters.end); d.setHours(23, 59, 59, 999); pos = pos.filter(po => new Date(po.actualDeliveryDate || po.date) <= d); }
        if (filters.supplier) { pos = pos.filter(po => po.supplierId === filters.supplier); }

        let rows = pos.map(po => {
            const supplier = suppliers.find(s => s.id === po.supplierId) || { name: 'Unknown' };
            const hasInvoice = db.read('purchaseInvoices').some(inv => inv.poId === po.id);

            const invoiceBtn = !hasInvoice
                ? `<button onclick="openPurchaseInvoiceForm('${po.id}')" class="bg-purple-600 hover:bg-slate-900 text-white px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-purple-200 transition-all active:scale-95 mr-2">
                    <i class="fas fa-file-invoice mr-1"></i> Invoice
                   </button>`
                : `<span class="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest border border-green-100 bg-green-50 text-green-600 mr-2">
                    <i class="fas fa-check-circle"></i> Invoiced
                   </span>`;

            return `
                <tr class="border-b border-slate-50 hover:bg-slate-50/50 transition-colors group">
                    <td class="py-4 px-6 whitespace-nowrap">
                        <button onclick="viewPO('${po.id}')" class="text-blue-700 hover:text-blue-800 font-mono text-sm font-bold transition-colors cursor-pointer outline-none bg-blue-50/80 px-3.5 py-1.5 rounded-lg border border-blue-200 shadow-sm">
                            ${po.poNumber.toUpperCase()}
                        </button>
                    </td>
                    <td class="py-4 px-6 text-sm text-green-600 font-medium text-center">
                        <span class="bg-green-50/80 px-3 py-1.5 rounded-lg font-mono border border-green-100 shadow-sm">${formatDate(po.actualDeliveryDate || po.date).split(' ')[0]}</span>
                    </td>
                    <td class="py-4 px-6 text-sm text-slate-900 font-bold tracking-tight">${supplier.name}</td>
                    <td class="py-4 px-6 text-sm text-right font-black text-slate-500 uppercase">${(po.items || []).length} SKU Selesai</td>
                    <td class="py-4 px-6 text-center">
                        <span class="px-3 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest border border-green-100 bg-green-50 text-green-600 shadow-sm">RECEIVED</span>
                    </td>
                    <td class="py-4 px-6 text-right flex items-center justify-end whitespace-nowrap">
                        ${invoiceBtn}
                        <button onclick="printNPB('${po.id}')" class="bg-white text-slate-400 hover:text-blue-600 hover:bg-blue-50 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border border-slate-100 hover:border-blue-200 flex items-center gap-2 mr-2 group/print">
                            <i class="fas fa-print group-hover/print:scale-110 transition-transform"></i> Cetak NPB
                        </button>
                        <button onclick="viewPO('${po.id}')" class="text-slate-400 hover:text-slate-800 transition-colors p-2 rounded-lg hover:bg-slate-100">
                            <i class="fas fa-eye text-lg"></i>
                        </button>
                    </td>
                </tr>`;
        }).join('');

        if (pos.length === 0) rows = `<tr><td colspan="6" class="py-32 text-center text-slate-300 font-black uppercase tracking-widest opacity-40"><i class="fas fa-history text-5xl mb-4"></i><br>Belum ada riwayat penerimaan barang</td></tr>`;

        mainContent.innerHTML = `
            <div id="pgr-history-list-view" class="animate-in fade-in duration-300 h-[calc(100vh-64px)] flex flex-col bg-slate-50 -m-4 sm:-m-6">
                <!-- Full Width Fixed Header Bar -->
                <div class="bg-white border-b border-gray-200 shrink-0 z-40 shadow-sm relative">
                    <div class="flex flex-wrap md:flex-nowrap justify-between items-center px-6 py-4 gap-4">
                        <div class="flex items-center gap-3 flex-1">
                            <div class="flex-1 max-w-md relative">
                                <i class="fas fa-search absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 text-sm cursor-text pointer-events-none"></i>
                                <input type="text" id="pgr_history_search" onkeyup="filterPGRTable()" placeholder="Search Receiving History..." 
                                    class="w-full pl-11 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm font-medium text-slate-700 placeholder:text-slate-400 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:bg-white outline-none transition-all">
                            </div>
                            
                            <!-- Date Filter Dropdown Trigger -->
                            <div class="relative" id="pgr_history_date_filter_container">
                                <button onclick="togglePGRHistoryDateDropdown()" class="flex items-center bg-slate-50 border border-slate-200 rounded-xl overflow-hidden hover:bg-slate-100 transition-all shadow-sm h-[38px] group p-0">
                                    <span class="bg-slate-100 border-r border-slate-200 px-3 h-full flex items-center text-slate-600 transition-colors">
                                        <i class="fas fa-sort-amount-up text-[13px]"></i>
                                    </span>
                                    <span class="px-4 text-[14px] font-medium text-blue-600">Date</span>
                                    <span class="pr-3 pl-1 text-slate-500 justify-center flex items-center">
                                        <i class="fas fa-chevron-down text-[11px]"></i>
                                    </span>
                                </button>
                                
                                <!-- Dropdown Content -->
                                <div id="pgr_history_date_dropdown" class="absolute left-0 mt-2 w-72 bg-white border border-slate-100 rounded-2xl shadow-xl z-[200] hidden p-5 animate-in fade-in zoom-in-95 duration-200">
                                    <h4 class="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Filter Berdasarkan Tanggal</h4>
                                    <div class="space-y-4">
                                        <div>
                                            <label class="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Dari Tanggal</label>
                                            <input type="date" id="pgr_history_header_start" value="${filters.start || ''}" class="w-full border border-slate-100 rounded-xl px-3 py-2 text-sm font-bold text-slate-700 bg-slate-50/50 focus:bg-white focus:border-blue-500 outline-none transition-all">
                                        </div>
                                        <div>
                                            <label class="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Sampai Tanggal</label>
                                            <input type="date" id="pgr_history_header_end" value="${filters.end || ''}" class="w-full border border-slate-100 rounded-xl px-3 py-2 text-sm font-bold text-slate-700 bg-slate-50/50 focus:bg-white focus:border-blue-500 outline-none transition-all">
                                        </div>
                                        <div class="flex gap-2 pt-2">
                                            <button onclick="applyPGRHistoryHeaderDateFilter()" class="flex-1 bg-blue-600 text-white py-2.5 rounded-xl text-[11px] font-black uppercase tracking-widest hover:bg-blue-700 transition-all shadow-md active:scale-95">Apply</button>
                                            <button onclick="resetPGRHistoryHeaderDateFilter()" class="flex-1 bg-slate-50 text-slate-500 py-2.5 rounded-xl text-[11px] font-black uppercase tracking-widest hover:bg-slate-100 transition-all">Reset</button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div class="px-6 pb-4">
                        ${tabsHtml}
                    </div>
                </div>

                <div class="flex-1 overflow-auto">
                    <table class="w-full text-left border-collapse" id="pgr_table">
                        <thead class="bg-slate-50 sticky top-0 z-30 shadow-[0_1px_0_#e2e8f0]">
                            <tr class="bg-slate-50/50 border-b border-slate-100">
                                <th class="py-4 px-6 text-[10px] font-black text-slate-400 uppercase tracking-widest whitespace-nowrap">No. PO</th>
                                <th class="py-4 px-6 text-[10px] font-black text-slate-400 uppercase tracking-widest whitespace-nowrap text-center">Tgl Selesai</th>
                                <th class="py-4 px-6 text-[10px] font-black text-slate-400 uppercase tracking-widest whitespace-nowrap">Supplier</th>
                                <th class="py-4 px-6 text-[10px] font-black text-slate-400 uppercase tracking-widest whitespace-nowrap text-right">Hasil Terima</th>
                                <th class="py-4 px-6 text-[10px] font-black text-slate-400 uppercase tracking-widest whitespace-nowrap text-center">Status</th>
                                <th class="py-4 px-6 text-[10px] font-black text-slate-400 uppercase tracking-widest whitespace-nowrap text-right">Aksi</th>
                            </tr>
                        </thead>
                        <tbody class="divide-y divide-slate-100 bg-white">${rows}</tbody>
                    </table>
                </div>

                <div class="bg-slate-50 border-t border-slate-200 p-2 text-center text-[10px] font-black text-slate-400 tracking-widest uppercase shrink-0">
                    TOTAL: ${pos.length} RIWAYAT SELESAI
                </div>
            </div>`;
    }
    
    // Add gr-form-view container at the end if it doesn't exist in mainContent
    mainContent.innerHTML += '\n<div id="gr-form-view" class="hidden"></div>';
}

window.closeGRForm = () => {
    const listViewPending = document.getElementById('pgr-pending-list-view');
    const listViewHistory = document.getElementById('pgr-history-list-view');
    const listViewInventory = document.getElementById('por-list-view');
    const formView = document.getElementById('gr-form-view');
    
    if (listViewPending) listViewPending.classList.remove('hidden');
    if (listViewHistory) listViewHistory.classList.remove('hidden');
    if (listViewInventory) listViewInventory.classList.remove('hidden');
    if (formView) {
        formView.classList.add('hidden');
        formView.innerHTML = '';
    }
};

window.filterPGRTable = () => {
    const input = document.getElementById('pgr_pending_search') || document.getElementById('pgr_history_search');
    if(!input) return;
    const filter = input.value.toLowerCase();
    const table = document.getElementById('pgr_table');
    const tr = table.getElementsByTagName('tr');

    for (let i = 1; i < tr.length; i++) {
        let textContent = tr[i].textContent || tr[i].innerText;
        if (textContent.toLowerCase().indexOf(filter) > -1) {
            tr[i].style.display = '';
        } else {
            tr[i].style.display = 'none';
        }
    }
};

window.togglePGRPendingDateDropdown = () => {
    const el = document.getElementById('pgr_pending_date_dropdown');
    if (el) el.classList.toggle('hidden');
};

window.applyPGRPendingHeaderDateFilter = () => {
    window.currentFilters.purchaseReceivingPending = {
        ...window.currentFilters.purchaseReceivingPending,
        start: document.getElementById('pgr_pending_header_start').value,
        end: document.getElementById('pgr_pending_header_end').value
    };
    renderPurchaseReceiving();
};

window.resetPGRPendingHeaderDateFilter = () => {
    window.currentFilters.purchaseReceivingPending = { 
        ...window.currentFilters.purchaseReceivingPending,
        start: '', end: '' 
    };
    renderPurchaseReceiving();
};

window.togglePGRHistoryDateDropdown = () => {
    const el = document.getElementById('pgr_history_date_dropdown');
    if (el) el.classList.toggle('hidden');
};

window.applyPGRHistoryHeaderDateFilter = () => {
    window.currentFilters.purchaseReceivingHistory = {
        ...window.currentFilters.purchaseReceivingHistory,
        start: document.getElementById('pgr_history_header_start').value,
        end: document.getElementById('pgr_history_header_end').value
    };
    renderPurchaseReceiving();
};

window.resetPGRHistoryHeaderDateFilter = () => {
    window.currentFilters.purchaseReceivingHistory = { 
        ...window.currentFilters.purchaseReceivingHistory,
        start: '', end: '' 
    };
    renderPurchaseReceiving();
};

// --- Purchase Orders Helper Functions ---
window.deletePO = (id) => {
    if (confirm('Yakin ingin menghapus Purchase Order ini?')) {
        db.delete('purchaseOrders', id);
        showToast('Purchase Order berhasil dihapus');
        renderPurchaseOrders();
    }
};

window.handlePOAction = (selectEl, poId) => {
    const action = selectEl.value;
    selectEl.value = ''; // reset to placeholder
    if (!action) return;

    if (action === 'view')    return viewPO(poId);
    if (action === 'send')    return openSendPOModal(poId);
    if (action === 'approve') return updatePOStatus(poId, 'APPROVED');
    if (action === 'delete')  return deletePO(poId);
};

window.updatePOStatus = (id, newStatus) => {
    db.update('purchaseOrders', id, { status: newStatus });
    showToast(`Status PO diubah ke ${newStatus}`);
    renderPurchaseOrders();
};




function renderPurchaseInvoices() {
    // Sync fresh data from DB first, then re-render
    db.sync('purchaseInvoices').then(() => _renderPurchaseInvoicesList());
}

function _renderPurchaseInvoicesList() {
    const mainContent = document.getElementById('main-content');
    const filters = window.currentFilters.purchaseInvoices;
    const suppliers = db.read('suppliers');
    const supOptions = suppliers.map(s => `<option value="${s.id}" ${filters.supplier === s.id ? 'selected' : ''}>${s.name}</option>`).join('');

    document.getElementById('pageTitle').innerText = 'Purchase Invoice';

    const statusOrder = {
        'UNPAID': 1,
        'PENDING': 1,
        'PARTIAL': 2,
        'PARTIALLY PAID': 2,
        'PAID': 3
    };

    let invs = db.read('purchaseInvoices').sort((a, b) => {
        const orderA = statusOrder[a.status] || 99;
        const orderB = statusOrder[b.status] || 99;
        if (orderA !== orderB) return orderA - orderB;
        return new Date(b.date) - new Date(a.date);
    });

    // Apply Filters
    if (filters.start) { const d = new Date(filters.start); d.setHours(0, 0, 0, 0); invs = invs.filter(i => new Date(i.date) >= d); }
    if (filters.end) { const d = new Date(filters.end); d.setHours(23, 59, 59, 999); invs = invs.filter(i => new Date(i.date) <= d); }
    if (filters.supplier) { invs = invs.filter(i => i.supplierId === filters.supplier); }
    if (filters.status) { invs = invs.filter(i => i.status === filters.status); }

    let rows = invs.map(inv => {
        const sup = suppliers.find(s => s.id === inv.supplierId) || { name: 'Unknown' };
        let statusColor = 'bg-slate-50 text-slate-500 border-slate-200';
        if (inv.status === 'PAID') statusColor = 'bg-emerald-50 text-emerald-600 border-emerald-100';
        else if (inv.status === 'PARTIAL' || inv.status === 'PARTIALLY PAID') statusColor = 'bg-blue-50 text-blue-600 border-blue-100';
        else if (inv.status === 'UNPAID') statusColor = 'bg-red-50 text-red-600 border-red-100';
        else if (inv.status === 'PENDING') statusColor = 'bg-orange-50 text-orange-600 border-orange-100';

        return `
            <tr class="border-b border-gray-100 hover:bg-slate-50 transition-colors group">
                <td class="py-4 px-6 whitespace-nowrap">
                    <button onclick="viewPurchaseInvoice('${inv.id}')" class="text-blue-700 hover:text-blue-800 font-mono text-sm font-bold transition-colors cursor-pointer outline-none bg-blue-50/80 px-3.5 py-1.5 rounded-lg border border-blue-200 shadow-sm">
                        ${(inv.invNumber || inv.invoiceNumber || '-').toUpperCase()}
                    </button>
                </td>
                <td class="py-4 px-6 text-sm text-slate-500 font-medium">${formatDate(inv.date).split(' ')[0]}</td>
                <td class="py-4 px-6 text-sm text-slate-900 font-bold tracking-tight">${sup.name}</td>
                <td class="py-4 px-6 text-sm text-slate-800 font-bold text-right">${formatCurrency(inv.totalAmount)}</td>
                <td class="py-4 px-6 text-center">
                    <span class="px-3 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest border shadow-sm ${statusColor}">${inv.status}</span>
                </td>
                <td class="py-4 px-6 text-right whitespace-nowrap">
                    <div class="flex items-center justify-end gap-1">
                        ${inv.attachment ? `
                        <button onclick="viewPurchaseInvoice('${inv.id}')" class="text-blue-500 hover:text-blue-700 p-2 rounded-lg hover:bg-blue-50 transition-colors" title="Lihat Lampiran">
                            <i class="fas fa-paperclip"></i>
                        </button>` : ''}
                        <button onclick="viewPurchaseInvoice('${inv.id}')" class="text-slate-400 hover:text-blue-600 transition-colors p-2 rounded-lg hover:bg-slate-50" title="Detail Tagihan">
                            <i class="fas fa-eye text-lg"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `;
    }).join('');

    if (invs.length === 0) rows = `<tr><td colspan="6" class="py-32 text-center text-slate-300 font-black uppercase tracking-widest opacity-40 italic"><i class="fas fa-file-invoice-dollar text-5xl mb-4"></i><br>Tidak ada tagihan supplier ditemukan</td></tr>`;

    mainContent.innerHTML = `
        <div id="pinv-list-view" class="animate-in fade-in duration-300 h-[calc(100vh-64px)] flex flex-col bg-slate-50 -m-4 sm:-m-6">
            <!-- Full Width Fixed Filter Bar -->
            <div class="bg-white border-b border-gray-200 shrink-0 z-40 shadow-sm relative">
                <div class="flex flex-wrap md:flex-nowrap justify-between items-center px-6 py-4 gap-4">
                    <div class="flex items-center gap-3 flex-1">
                        <div class="flex-1 max-w-md relative">
                            <i class="fas fa-search absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 text-sm cursor-text pointer-events-none"></i>
                            <input type="text" id="pinv_global_search" onkeyup="filterPINVTable()" placeholder="Search Purchase Invoices..." 
                                class="w-full pl-11 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm font-medium text-slate-700 placeholder:text-slate-400 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:bg-white outline-none transition-all">
                        </div>
                        
                        <!-- Date Filter Dropdown Trigger -->
                        <div class="relative" id="pinv_date_filter_container">
                            <button onclick="togglePINVDateDropdown()" class="flex items-center bg-slate-50 border border-slate-200 rounded-xl overflow-hidden hover:bg-slate-100 transition-all shadow-sm h-[38px] group p-0">
                                <span class="bg-slate-100 border-r border-slate-200 px-3 h-full flex items-center text-slate-600 transition-colors">
                                    <i class="fas fa-sort-amount-up text-[13px]"></i>
                                </span>
                                <span class="px-4 text-[14px] font-medium text-blue-600">Date</span>
                                <span class="pr-3 pl-1 text-slate-500 justify-center flex items-center">
                                    <i class="fas fa-chevron-down text-[11px]"></i>
                                </span>
                            </button>
                            
                            <!-- Dropdown Content -->
                            <div id="pinv_date_dropdown" class="absolute left-0 mt-2 w-72 bg-white border border-slate-100 rounded-2xl shadow-xl z-[200] hidden p-5 animate-in fade-in zoom-in-95 duration-200">
                                <h4 class="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Filter Berdasarkan Tanggal</h4>
                                <div class="space-y-4">
                                    <div>
                                        <label class="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Dari Tanggal</label>
                                        <input type="date" id="pinv_header_start" value="${filters.start || ''}" class="w-full border border-slate-100 rounded-xl px-3 py-2 text-sm font-bold text-slate-700 bg-slate-50/50 focus:bg-white focus:border-blue-500 outline-none transition-all">
                                    </div>
                                    <div>
                                        <label class="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Sampai Tanggal</label>
                                        <input type="date" id="pinv_header_end" value="${filters.end || ''}" class="w-full border border-slate-100 rounded-xl px-3 py-2 text-sm font-bold text-slate-700 bg-slate-50/50 focus:bg-white focus:border-blue-500 outline-none transition-all">
                                    </div>
                                    <div class="flex gap-2 pt-2">
                                        <button onclick="applyPINVHeaderDateFilter()" class="flex-1 bg-blue-600 text-white py-2.5 rounded-xl text-[11px] font-black uppercase tracking-widest hover:bg-blue-700 transition-all shadow-md active:scale-95">Apply</button>
                                        <button onclick="resetPINVHeaderDateFilter()" class="flex-1 bg-slate-50 text-slate-500 py-2.5 rounded-xl text-[11px] font-black uppercase tracking-widest hover:bg-slate-100 transition-all">Reset</button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div class="flex items-center gap-2">
                        <button onclick="openPurchaseInvoiceForm()" class="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2 rounded-lg transition-all text-sm font-medium shadow-sm flex items-center gap-2 active:scale-95">
                            <i class="fas fa-plus"></i> Input Invoice
                        </button>
                    </div>
                </div>
            </div>

            <!-- Table Container wrapper -->
            <div class="flex-1 overflow-auto">
                <table class="w-full text-left border-collapse" id="pinv_table">
                    <thead class="bg-slate-50 sticky top-0 z-30 shadow-[0_1px_0_#e2e8f0]">
                        <tr class="bg-gray-50/50 border-b border-slate-100">
                            <th class="py-3 px-6 text-[10px] font-black text-slate-400 uppercase tracking-widest whitespace-nowrap">No. Invoice</th>
                            <th class="py-3 px-6 text-[10px] font-black text-slate-400 uppercase tracking-widest whitespace-nowrap">Tanggal</th>
                            <th class="py-3 px-6 text-[10px] font-black text-slate-400 uppercase tracking-widest whitespace-nowrap">Supplier</th>
                            <th class="py-3 px-6 text-[10px] font-black text-slate-400 uppercase tracking-widest whitespace-nowrap text-right">Total Tagihan</th>
                            <th class="py-3 px-6 text-[10px] font-black text-slate-400 uppercase tracking-widest whitespace-nowrap text-center">Status</th>
                            <th class="py-3 px-6 text-[10px] font-black text-slate-400 uppercase tracking-widest whitespace-nowrap text-right">Aksi</th>
                        </tr>
                    </thead>
                    <tbody class="divide-y divide-slate-100 bg-white font-sans">${rows}</tbody>
                </table>
            </div>
            
            <div class="bg-slate-50 border-t border-slate-200 p-2 text-center text-[10px] font-black text-slate-400 tracking-widest uppercase shrink-0">
                TOTAL: ${invs.length} BARIS
            </div>
        </div>
    `;
}

window.filterPINVTable = () => {
    const input = document.getElementById('pinv_global_search');
    if(!input) return;
    const filter = input.value.toLowerCase();
    const table = document.getElementById('pinv_table');
    const tr = table.getElementsByTagName('tr');

    for (let i = 1; i < tr.length; i++) {
        let textContent = tr[i].textContent || tr[i].innerText;
        if (textContent.toLowerCase().indexOf(filter) > -1) {
            tr[i].style.display = '';
        } else {
            tr[i].style.display = 'none';
        }
    }
};

window.togglePINVDateDropdown = () => {
    const el = document.getElementById('pinv_date_dropdown');
    if (el) el.classList.toggle('hidden');
};

window.applyPINVHeaderDateFilter = () => {
    window.currentFilters.purchaseInvoices = {
        ...window.currentFilters.purchaseInvoices,
        start: document.getElementById('pinv_header_start').value,
        end: document.getElementById('pinv_header_end').value
    };
    renderPurchaseInvoices();
};

window.resetPINVHeaderDateFilter = () => {
    window.currentFilters.purchaseInvoices = { 
        ...window.currentFilters.purchaseInvoices,
        start: '', end: '' 
    };
    renderPurchaseInvoices();
};

window.navigateToReceivingHistory = () => {
    window.activeGRTab = 'history';
    navigateTo('purchase-receiving');
};

// --- Sales Quotations Module ---
window.handleSalesAction = (selectEl, id) => {
    const act = selectEl.value;
    if (!act) return;
    selectEl.value = ""; // Reset for next use
    
    if (act === 'view') viewQT(id);
    else if (act === 'edit') openQTModal(id);
    else if (act === 'confirm') updateQTStatus(id, 'CONFIRMED');
    else if (act === 'send') openSendQTModal(id);
    else if (act === 'delete') deleteQT(id);
    else if (act === 'makeso') convertQTtoSO(id);
};

function renderSalesQuotations() {
    const canEdit = getModulePermission('penjualan').edit;
    renderBreadcrumb(['Sales', 'Quotations']);
    const mainContent = document.getElementById('main-content');

    const filters = window.currentFilters.salesQuotations;
    const statusOrder = { 'DRAFT': 0, 'SENT': 1, 'CONFIRMED': 2, 'SO_CREATED': 3, 'CANCELLED': 4 };
    let qts = db.read('salesQuotations').sort((a, b) => {
        const sa = statusOrder[a.status] ?? 99;
        const sb = statusOrder[b.status] ?? 99;
        if (sa !== sb) return sa - sb;
        return new Date(b.date) - new Date(a.date);
    });
    const customers = db.read('customers');
    const custOptions = customers.map(c => `<option value="${c.id}" ${filters.customer === c.id ? 'selected' : ''}>${c.name}</option>`).join('');

    // Apply Filters
    if (filters.start) {
        const d = new Date(filters.start); d.setHours(0, 0, 0, 0);
        qts = qts.filter(q => new Date(q.date) >= d);
    }
    if (filters.end) {
        const d = new Date(filters.end); d.setHours(23, 59, 59, 999);
        qts = qts.filter(q => new Date(q.date) <= d);
    }
    if (filters.customer) {
        qts = qts.filter(q => q.customerId === filters.customer);
    }

    let rows = qts.map(qt => {
        const customerNameDisplay = qt.customerName || (customers.find(c => c.id === qt.customerId) || { name: 'Unknown' }).name;
        let statusColor = 'bg-gray-100 text-gray-700';
        if (qt.status === 'SENT') statusColor = 'bg-blue-100 text-blue-700';
        if (qt.status === 'CONFIRMED') statusColor = 'bg-green-100 text-green-700';
        if (qt.status === 'CANCELLED') statusColor = 'bg-red-100 text-red-700';
        if (qt.status === 'SO_CREATED') statusColor = 'bg-purple-100 text-purple-700';

        let options = '';

        if (canEdit && qt.status === 'DRAFT') {
            options += `<option value="confirm">Konfirmasi</option>`;
            options += `<option value="edit">Edit</option>`;
            options += `<option value="send">Kirim Quotation</option>`;
            options += `<option value="delete">Hapus</option>`;
        } else if (canEdit && qt.status === 'SENT') {
            options += `<option value="confirm">Konfirmasi</option>`;
            options += `<option value="edit">Edit</option>`;
            options += `<option value="send">Kirim Ulang</option>`;
            options += `<option value="delete">Hapus</option>`;
        } else if (canEdit && qt.status === 'CONFIRMED') {
            options += `<option value="makeso">Buat Sales Order</option>`;
            options += `<option value="edit">Edit</option>`;
            options += `<option value="send">Kirim Ulang</option>`;
            options += `<option value="delete">Hapus</option>`;
        } else if (canEdit && qt.status === 'SO_CREATED') {
            options += `<option value="edit">Edit</option>`;
            options += `<option value="send">Kirim Ulang</option>`;
            options += `<option value="delete">Hapus</option>`;
        } else if (qt.status === 'SO_CREATED') {
            options += `<option value="send">Kirim Ulang</option>`;
        }

        let actionHtml = `
            <div class="inline-block relative w-full md:w-[130px]">
                <select class="w-full bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 font-bold text-xs rounded-lg pl-3 pr-8 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer appearance-none transition-all shadow-sm" onchange="handleSalesAction(this, '${qt.id}')">
                    <option value="" disabled selected>Pilih Aksi...</option>
                    <option value="view">Lihat Detail</option>
                    ${options}
                </select>
                <div class="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3 text-slate-400">
                    <i class="fas fa-chevron-down text-[10px]"></i>
                </div>
            </div>
        `;

        return `
            <tr class="border-b border-gray-100 hover:bg-slate-50 transition-colors">
                <td class="py-4 px-4">
                    <input type="checkbox" class="qt-row-checkbox w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer">
                </td>
                <td class="py-4 px-4 text-sm text-slate-900 font-bold tracking-tight">${customerNameDisplay}</td>
                <td class="py-4 px-4">
                    <span class="px-3 py-1 rounded-full text-[10px] font-bold tracking-tight shadow-sm border ${qt.status === 'DRAFT' ? 'bg-orange-50 text-orange-600 border-orange-100' : statusColor}">
                        ${qt.status === 'DRAFT' ? 'Open' : (qt.status === 'SO_CREATED' ? 'CREATED' : qt.status)}
                    </span>
                </td>
                <td class="py-4 px-4 text-sm text-slate-500 font-medium">${qt.date.split('T')[0].split('-').reverse().join('-')}</td>
                <td class="py-4 px-4 text-sm text-slate-800 font-bold text-right">${formatCurrency(qt.totalAmount)}</td>
                <td class="py-4 px-4">
                    <button onclick="viewQT('${qt.id}')" class="text-slate-700 hover:text-blue-600 font-mono text-[11px] font-bold transition-colors cursor-pointer outline-none">
                        ${qt.qtNumber}
                    </button>
                </td>
                <td class="py-4 px-4 text-right">
                    ${actionHtml}
                </td>
            </tr>
        `;
    }).join('');

    if (qts.length === 0) rows = `<tr><td colspan="6" class="py-24 text-center text-gray-400 font-bold uppercase tracking-widest"><i class="fas fa-search-minus text-4xl mb-3 opacity-20"></i><br>Tidak ada Quotation ditemukan</td></tr>`;

    mainContent.innerHTML = `
        <div id="qt-list-view" class="animate-in fade-in duration-300 h-[calc(100vh-64px)] flex flex-col bg-slate-50 -m-4 sm:-m-6">
            <!-- Full Width Fixed Filter Bar -->
            <div class="bg-white border-b border-gray-200 shrink-0 z-40 shadow-sm">
                <div class="flex flex-wrap md:flex-nowrap justify-between items-center px-6 py-4 gap-4">
                    <div class="flex items-center gap-3 flex-1">
                        <div class="flex-1 max-w-md relative">
                            <i class="fas fa-search absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 text-sm"></i>
                            <input type="text" id="qt_global_search" onkeyup="filterQTTable()" placeholder="Search or type a command" 
                                class="w-full pl-11 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-600 placeholder:text-slate-300 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/5 outline-none transition-all shadow-sm">
                        </div>
                        
                        <!-- Date Filter Dropdown Trigger -->
                        <div class="relative" id="qt_date_filter_container">
                            <button onclick="toggleQTDateDropdown()" class="flex items-center bg-slate-50 border border-slate-200 rounded-lg overflow-hidden hover:bg-slate-100 transition-all shadow-sm h-[42px] group">
                                <span class="bg-slate-200/60 border-r border-slate-200 px-3 h-full flex items-center text-slate-700 transition-colors">
                                    <i class="fas fa-sort-amount-up text-sm"></i>
                                </span>
                                <span class="px-4 text-sm font-medium text-blue-700">Date</span>
                                <span class="pr-3 text-slate-600">
                                    <i class="fas fa-chevron-down text-[12px]"></i>
                                </span>
                            </button>
                            
                            <!-- Dropdown Content -->
                            <div id="qt_date_dropdown" class="absolute left-0 mt-2 w-72 bg-white border border-slate-100 rounded-2xl shadow-2xl z-[200] hidden p-5 animate-in fade-in zoom-in-95 duration-200">
                                <h4 class="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Filter Berdasarkan Tanggal</h4>
                                <div class="space-y-4">
                                    <div>
                                        <label class="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Dari Tanggal</label>
                                        <input type="date" id="qt_header_start" value="${filters.start}" class="w-full border-2 border-slate-50 rounded-xl px-3 py-2 text-sm font-bold text-slate-700 focus:border-blue-500 outline-none transition-all bg-slate-50/50">
                                    </div>
                                    <div>
                                        <label class="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Sampai Tanggal</label>
                                        <input type="date" id="qt_header_end" value="${filters.end}" class="w-full border-2 border-slate-50 rounded-xl px-3 py-2 text-sm font-bold text-slate-700 focus:border-blue-500 outline-none transition-all bg-slate-50/50">
                                    </div>
                                    <div class="flex gap-2 pt-2">
                                        <button onclick="applyQTHeaderDateFilter()" class="flex-1 bg-blue-600 text-white py-2 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-blue-700 transition-all shadow-lg active:scale-95">Apply</button>
                                        <button onclick="resetQTHeaderDateFilter()" class="flex-1 bg-slate-50 text-slate-400 py-2 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-slate-100 transition-all">Reset</button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    ${canEdit ? `
                    <button onclick="openQTModal()" class="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-xl transition-all text-[10px] font-black uppercase tracking-widest shadow-lg active:scale-95">
                        <i class="fas fa-plus mr-2"></i>Buat Quotation
                    </button>
                    ` : `
                    <span class="text-[10px] font-black text-blue-500 bg-blue-50 border border-blue-100 px-4 py-2 rounded-xl uppercase tracking-widest">Mode Lihat Saja</span>
                    `}
                </div>
            </div>

            <!-- Content Area -->
            <div class="p-4 sm:p-6 flex-1 overflow-y-auto">
                <div class="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                    <div class="overflow-x-auto min-h-[400px]">
                        <table class="w-full text-left border-collapse">
                            <thead class="sticky top-0 z-20">
                                <tr class="bg-slate-50 border-b border-slate-100 text-slate-500 font-semibold uppercase text-[10px] tracking-wider shadow-sm">
                                    <th class="px-6 py-4 w-10">
                                        <input type="checkbox" id="selectAllQT" onclick="toggleSelectAllQT(this)" class="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer">
                                    </th>
                                    <th class="px-4 py-4">Customer Name</th>
                                    <th class="px-4 py-4">Status</th>
                                    <th class="px-4 py-4">Date</th>
                                    <th class="px-4 py-4 text-right">Grand Total</th>
                                    <th class="px-4 py-4">ID</th>
                                    <th class="px-4 py-4 text-right w-[150px]">Aksi</th>
                                </tr>
                            </thead>
                            <tbody class="divide-y divide-gray-100 font-sans">${rows}</tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
        <div id="qt-form-view" class="hidden"></div>
    `;

}

window._uiState = window._uiState || {
    qtFilterOpen: false,
    soFilterOpen: false,
    siFilterOpen: false,
    spFilterOpen: false,
    srpFilterOpen: false,
    srFilterOpen: false,
    exFilterOpen: false,
    doFilterOpen: false,
    judFilterOpen: false,
    invMasterFilterOpen: false
};

window.toggleQTFilter = () => {
    window._uiState.qtFilterOpen = !window._uiState.qtFilterOpen;
    renderSalesQuotations();
};

window.toggleSOFilter = () => {
    window._uiState.soFilterOpen = !window._uiState.soFilterOpen;
    renderSalesOrders();
};

window.toggleSIFilter = () => {
    window._uiState.siFilterOpen = !window._uiState.siFilterOpen;
    renderSalesInvoices();
};

window.toggleSPFilter = () => {
    window._uiState.spFilterOpen = !window._uiState.spFilterOpen;
    renderSalesPayments();
};

window.toggleSRPFilter = () => {
    window._uiState.srpFilterOpen = !window._uiState.srpFilterOpen;
    renderSalesReports();
};

window.applyQTFilter = () => {
    window.currentFilters.salesQuotations = {
        start: document.getElementById('qt_f_start').value,
        end: document.getElementById('qt_f_end').value,
        customer: document.getElementById('qt_f_customer').value
    };
    renderSalesQuotations();
};

window.resetQTFilter = () => {
    window.currentFilters.salesQuotations = { start: '', end: '', customer: '' };
    renderSalesQuotations();
};

// --- Sales Quotations Helper Functions ---
function generateQTNumber(customDate = null) {
    const qts = db.read('salesQuotations') || [];
    const date = customDate ? new Date(customDate) : new Date();
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    const dateStr = `${day}${month}${year}`;
    const monthYearStr = `${month}${year}`;

    // Find the max sequence number for this specific month/year across all days
    let maxSeq = 0;
    qts.forEach(q => {
        if (!q.qtNumber || !q.qtNumber.startsWith('QT-')) return;
        const parts = q.qtNumber.split('-');
        if (parts.length < 3) return;
        
        // parts[1] is DDMMYYYY. slice(2) is MMYYYY
        if (parts[1].slice(2) === monthYearStr) {
            const seq = parseInt(parts[2]);
            if (!isNaN(seq) && seq > maxSeq) maxSeq = seq;
        }
    });

    let nextSeq = maxSeq + 1;
    let finalNumber = `QT-${dateStr}-${String(nextSeq).padStart(3, '0')}`;
    
    // Safety check: ensure absolute uniqueness
    while (qts.some(q => q.qtNumber === finalNumber)) {
        nextSeq++;
        finalNumber = `QT-${dateStr}-${String(nextSeq).padStart(3, '0')}`;
    }

    return finalNumber;
}

window.openQTModal = async (qtId = null) => {
    // Only navigate if we're not already on the quotations page
    // This prevents redundant re-rendering when clicking the button on the same page
    const listView = document.getElementById('qt-list-view');
    const formView = document.getElementById('qt-form-view');
    
    if (!listView || !formView) {
        if (window.navigateTo) await navigateTo('sales-quotations');
    }
    
    // Re-select after navigation
    const lv = document.getElementById('qt-list-view');
    const fv = document.getElementById('qt-form-view');
    if (!lv || !fv) return;

    lv.classList.add('hidden');
    fv.classList.remove('hidden');

    window._editingQTId = qtId;
    const qt = qtId ? db.findById('salesQuotations', qtId) : null;
    
    // Reset temp items
    window.tempQTItems = qt ? (Array.isArray(qt.items) ? JSON.parse(JSON.stringify(qt.items)) : []) : [];

    renderBreadcrumb(['Sales', 'Quotations', qt ? 'Edit Quotation' : 'Buat Quotation']);

    formView.innerHTML = `
        <div class="animate-in fade-in slide-in-from-bottom-2 duration-400 -m-6 h-[calc(100vh-64px)] flex flex-col overflow-hidden bg-white">
            <!-- Record Header / Action Bar (STICKY AREA) -->
            <div class="sticky top-0 z-40 bg-white border-b border-slate-100 px-8 py-5 flex items-center justify-between shrink-0 shadow-sm">
                <div class="flex items-center gap-6">
                    <div>
                    </div>
                </div>
                
                <div class="flex items-center gap-3">
                    <button type="button" onclick="renderSalesQuotations()" class="px-6 py-2.5 bg-slate-100 text-slate-500 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-200 transition-all active:scale-95">
                        Batal
                    </button>
                    <button type="button" onclick="saveNewQT()" class="px-8 py-2.5 bg-blue-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-blue-700 transition-all shadow-lg active:scale-95 flex items-center gap-2">
                        <i class="fas fa-check-circle text-[10px]"></i> ${qt ? 'Simpan Perubahan' : 'Simpan Draft Quotation'}
                    </button>
                </div>
            </div>

            <!-- Scrollable Content Area -->
            <div class="flex-1 overflow-y-auto bg-slate-50/50 custom-scrollbar pb-32">
                <div class="w-full p-8 space-y-8">
                    <!-- Basic Information Card -->
                    <div class="bg-white rounded-3xl p-8 border border-slate-100 shadow-sm space-y-6">
                        <h3 class="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
                            <i class="fas fa-info-circle text-blue-600"></i> Informasi Dasar
                        </h3>
                        <div class="grid grid-cols-1 sm:grid-cols-4 gap-6">
                            <div>
                                <label class="block text-sm font-semibold text-slate-600 mb-2">No. Quotation <span class="text-red-400">*</span></label>
                                <input type="text" id="qt_number" value="${qt ? qt.qtNumber : generateQTNumber()}" 
                                    class="w-full border-none rounded-xl px-4 py-3 bg-slate-100/80 font-bold text-slate-800 outline-none transition-all" readonly>
                            </div>
                            <div>
                                <label class="block text-sm font-semibold text-slate-600 mb-2">Customer <span class="text-red-400">*</span></label>
                                <div class="relative" id="qt_customer_container">
                                    <input type="text" id="qt_customer_search" value="${qt ? (db.findById('customers', qt.customerId)?.name || '-- Pilih Customer --') : '-- Pilih Customer --'}" readonly
                                        onclick="toggleCustomerDropdown('qt_customer_dropdown')"
                                        class="w-full border-none rounded-xl px-4 py-3 bg-slate-100/80 font-bold text-slate-800 cursor-pointer focus:ring-2 focus:ring-blue-500/10 outline-none transition-all">
                                    <input type="hidden" id="qt_customer_id" value="${qt ? qt.customerId : ''}">
                                    
                                    <div id="qt_customer_dropdown" class="absolute left-0 mt-2 bg-white border border-slate-100 rounded-xl shadow-2xl z-[200] hidden overflow-hidden animate-in fade-in zoom-in-95 duration-200 min-w-[280px]">
                                        <div class="max-h-60 overflow-y-auto p-1" id="qt_customer_list">
                                            ${db.read('customers').map(c => `
                                                <div onclick="selectCustomer('QT', '${c.id}', '${c.name.replace(/'/g, "\\'")}')" 
                                                    class="px-4 py-2.5 text-sm font-bold text-slate-700 hover:bg-slate-50 rounded-xl cursor-pointer transition-colors m-0.5 ${qt && qt.customerId === c.id ? 'bg-slate-50' : ''}">
                                                    ${c.name}
                                                </div>
                                            `).join('')}
                                        </div>
                                        <div class="p-2 border-t border-slate-50 bg-white space-y-1">
                                            <button type="button" onclick="openCustomerModal(null, 'QT'); toggleCustomerDropdown('qt_customer_dropdown')" 
                                                class="flex items-center gap-3 w-full px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 transition-colors rounded-xl font-bold text-left group whitespace-nowrap">
                                                <div class="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-slate-500 group-hover:bg-blue-100 group-hover:text-blue-600 transition-colors shrink-0">
                                                    <i class="fas fa-plus text-xs"></i>
                                                </div>
                                                Create a new Customer
                                            </button>
                                            <button type="button" onclick="openAdvancedCustomerSearch('QT')" 
                                                class="flex items-center gap-3 w-full px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 transition-colors rounded-xl font-bold text-left group whitespace-nowrap">
                                                <div class="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-slate-500 group-hover:bg-blue-100 group-hover:text-blue-600 transition-colors shrink-0">
                                                    <i class="fas fa-search text-xs"></i>
                                                </div>
                                                Advanced Search
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <div>
                                <label class="block text-sm font-semibold text-slate-600 mb-2">Date <span class="text-red-400">*</span></label>
                                <input type="date" id="qt_date" value="${qt ? qt.date.split('T')[0] : new Date().toISOString().split('T')[0]}" 
                                    onchange="if(!window._editingQTId) document.getElementById('qt_number').value = generateQTNumber(this.value)"
                                    class="w-full border-none rounded-xl px-4 py-3 bg-slate-100/80 font-bold text-slate-800 focus:ring-2 focus:ring-blue-500/10 outline-none transition-all">
                            </div>
                            <div>
                                <label class="block text-sm font-semibold text-slate-600 mb-2">Pajak (PPN %)</label>
                                <select id="qt_tax_rate" onchange="refreshQTItemsTable()" class="w-full border-none rounded-xl px-4 py-3 bg-slate-100/80 font-bold text-slate-800 focus:ring-2 focus:ring-blue-500/10 outline-none transition-all cursor-pointer">
                                    <option value="0" ${qt && qt.taxRate == 0 ? 'selected' : ''}>0% (Tanpa Pajak)</option>
                                    <option value="11" ${!qt || (qt && qt.taxRate == 11) ? 'selected' : ''}>11% (PPN)</option>
                                </select>
                            </div>
                            <div>
                                <label class="block text-sm font-semibold text-slate-600 mb-2">Term Pembayaran <span class="text-red-400">*</span></label>
                                <select id="qt_payment_term" class="w-full border-none rounded-xl px-4 py-3 bg-slate-100/80 font-bold text-slate-700 focus:ring-2 focus:ring-blue-500/10 outline-none transition-all cursor-pointer">
                                    <option value="" ${!qt || !qt.paymentTerms ? 'selected' : ''}>-- Pilih Term --</option>
                                    <option value="Cash" ${qt && qt.paymentTerms === 'Cash' ? 'selected' : ''}>Cash</option>
                                    <option value="Tempo 7 S/d 10 Hari" ${qt && qt.paymentTerms === 'Tempo 7 S/d 10 Hari' ? 'selected' : ''}>Tempo 7 S/d 10 Hari</option>
                                    <option value="30 Hari" ${qt && qt.paymentTerms === '30 Hari' ? 'selected' : ''}>30 Hari</option>
                                    <option value="45 Hari" ${qt && qt.paymentTerms === '45 Hari' ? 'selected' : ''}>45 Hari</option>
                                </select>
                            </div>
                        </div>
                    </div>

                    <!-- Items Section -->
                    <div class="bg-white rounded-3xl p-8 border border-slate-100 shadow-sm space-y-6">
                        <div class="flex items-center justify-between mb-4">
                            <h3 class="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] flex items-center gap-2">
                                <i class="fas fa-boxes text-blue-600"></i> Manifest Barang
                            </h3>
                        </div>

                        <div class="bg-slate-50 p-6 rounded-2xl border border-slate-100 flex flex-wrap items-end gap-4 mb-6">
                            <div class="flex-1 min-w-[300px] relative">
                                <label class="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Pilih Produk</label>
                                <input type="text" id="qt_item_search" placeholder="-- Cari Kode atau Nama Produk --" autocomplete="off"
                                    onclick="toggleItemProductDropdown('qt')" readonly
                                    class="w-full border-none rounded-xl px-4 py-2.5 bg-white font-bold text-slate-700 shadow-sm focus:ring-2 focus:ring-blue-500/20 outline-none transition-all cursor-pointer">
                                <input type="hidden" id="qt_item_name"> <!-- Will store ID -->
                                
                                <div id="qt_item_dropdown" class="absolute left-0 mt-2 w-full bg-white border border-slate-100 rounded-2xl shadow-2xl z-[200] hidden overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                                    <div class="p-3 border-b border-slate-50">
                                        <input type="text" id="qt_item_dropdown_search" placeholder="Ketik kode atau nama..." onkeyup="filterItemProductList('qt', this.value)" class="w-full px-4 py-2 bg-slate-50 border-none rounded-lg text-xs font-bold outline-none focus:ring-2 focus:ring-blue-500/20">
                                    </div>
                                    <div class="max-h-60 overflow-y-auto p-1" id="qt_item_list">
                                        <!-- Items here -->
                                    </div>
                                    <div class="p-2 border-t border-slate-50 bg-slate-50/10 space-y-1">
                                        <button onclick="renderMasterProducts()" class="w-full flex items-center gap-3 px-4 py-2.5 text-[10px] font-black text-slate-500 hover:bg-slate-50 hover:text-slate-900 rounded-xl transition-all uppercase tracking-widest">
                                            <div class="w-7 h-7 flex items-center justify-center bg-slate-100 rounded-lg">
                                                <i class="fas fa-plus text-[10px]"></i>
                                            </div>
                                            Create a new Product
                                        </button>
                                        <button onclick="openAdvancedProductSearch('qt')" class="w-full flex items-center gap-3 px-4 py-2.5 text-[10px] font-black text-slate-500 hover:bg-slate-50 hover:text-slate-900 rounded-xl transition-all uppercase tracking-widest">
                                            <div class="w-7 h-7 flex items-center justify-center bg-slate-100 rounded-lg">
                                                <i class="fas fa-search text-[10px]"></i>
                                            </div>
                                            Advanced Search
                                        </button>
                                    </div>
                                </div>
                            </div>
                            <div class="w-24">
                                <label class="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Qty</label>
                                <input type="number" id="qt_item_qty" placeholder="0" class="w-full border-none rounded-xl px-4 py-2.5 bg-white font-bold text-slate-700 shadow-sm focus:ring-2 focus:ring-blue-500/20 outline-none transition-all">
                            </div>
                            <div class="w-44">
                                <label class="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Price</label>
                                <input type="number" id="qt_item_price" placeholder="0.00" class="w-full border-none rounded-xl px-4 py-2.5 bg-white font-bold text-slate-700 shadow-sm focus:ring-2 focus:ring-blue-500/20 outline-none transition-all">
                            </div>
                            <button type="button" onclick="addQTItemRow()" class="h-[46px] px-6 bg-blue-600 border border-blue-500 text-white rounded-xl flex items-center gap-2 font-black text-[10px] uppercase tracking-widest hover:bg-blue-700 transition-all shadow-lg active:scale-95">
                                <i class="fas fa-plus"></i> Tambah
                            </button>
                        </div>
                        
                        <div class="overflow-hidden border border-slate-100 rounded-2xl shadow-sm">
                            <table class="w-full text-sm text-left border-collapse">
                                <thead>
                                    <tr class="bg-slate-50 border-b border-slate-100 text-slate-400 text-[9px] uppercase font-black tracking-widest">
                                        <th class="py-4 px-4 w-12 text-center"></th>
                                        <th class="py-4 px-6 w-12 text-center">#</th>
                                        <th class="py-4 px-6">Item Code / Product</th>
                                        <th class="py-4 px-6 text-right">Qty</th>
                                        <th class="py-4 px-6 text-right">Rate</th>
                                        <th class="py-4 px-6 text-right">Amount</th>
                                        <th class="py-4 px-6 w-12 text-center"><i class="fas fa-cog"></i></th>
                                    </tr>
                                </thead>
                                <tbody id="qt_items_list" class="divide-y divide-slate-50"></tbody>
                            </table>
                        </div>

                        <div class="grid grid-cols-1 md:grid-cols-2 gap-8 pt-6">
                            <div>
                                <label class="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Catatan Tambahan</label>
                                <textarea id="qt_notes" class="w-full border-none rounded-2xl px-5 py-4 bg-slate-50 font-medium text-slate-800 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all h-32" placeholder="Tulis catatan di sini...">${qt ? (qt.notes || '') : ''}</textarea>
                            </div>
                            <div class="bg-slate-50 rounded-2xl p-6 border border-slate-100 space-y-3 mt-4">
                                <div class="flex justify-between items-center pb-3 border-b border-slate-200">
                                    <span class="text-[10px] font-black uppercase tracking-widest text-slate-400">Subtotal</span>
                                    <span id="qt_subtotal_display" class="text-sm font-bold text-slate-700">Rp 0</span>
                                </div>
                                <div class="flex justify-between items-center pt-2">
                                    <span class="text-xs font-black uppercase tracking-widest text-slate-900">Grand Total</span>
                                    <span id="qt_total_display" class="text-2xl font-black text-blue-700">Rp 0</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;

    if (qt) refreshQTItemsTable();
};

window.addQTItemRow = () => {
    const inventoryItemId = document.getElementById('qt_item_name').value;
    const searchVal = document.getElementById('qt_item_search').value;

    let prodText = searchVal;
    let itemCode = '';
    let prodUnit = 'PCS';

    if (inventoryItemId) {
        const p = db.findById('inventoryItems', inventoryItemId);
        if (p) {
            prodText = p.itemName;
            itemCode = p.itemCode;
            prodUnit = p.unit || 'PCS';
        }
    }

    const qty = parseFloat(document.getElementById('qt_item_qty').value);
    const price = parseFloat(document.getElementById('qt_item_price').value);

    if (!prodText) { showToast('Pilih produk atau ketik nama produk', 'error'); return; }
    if (!qty || !price) { showToast('Qty dan Harga Jual harus diisi', 'error'); return; }

    const subtotal = qty * price;
    window.tempQTItems.push({ 
        id: Date.now().toString(), 
        inventoryItemId, 
        itemCode,
        productId: null, 
        prodText, 
        prodUnit, 
        qty, 
        price, 
        subtotal 
    });

    document.getElementById('qt_item_name').value = '';
    document.getElementById('qt_item_search').value = '';
    document.getElementById('qt_item_qty').value = '';
    document.getElementById('qt_item_price').value = '';
    refreshQTItemsTable();
};

window.editQTItemRow = (itemId) => {
    const item = window.tempQTItems.find(i => i.id === itemId);
    if (!item) return;
    document.getElementById('qt_item_name').value = item.inventoryItemId || '';
    document.getElementById('qt_item_search').value = item.prodText;
    document.getElementById('qt_item_qty').value = item.qty;
    document.getElementById('qt_item_price').value = item.price;
    window.tempQTItems = window.tempQTItems.filter(i => i.id !== itemId);
    refreshQTItemsTable();
    document.getElementById('qt_item_qty').focus();
    document.getElementById('qt_item_qty').select();
};

window.removeQTItemRow = (itemId) => {
    if(!confirm('Hapus item ini dari daftar?')) return;
    window.tempQTItems = window.tempQTItems.filter(i => i.id !== itemId);
    refreshQTItemsTable();
};

window.refreshQTItemsTable = () => {
    const tbody = document.getElementById('qt_items_list');
    let total = 0;
    
    if (window.tempQTItems.length === 0) {
        tbody.innerHTML = `<tr><td colspan="7" class="py-10 text-center text-slate-400 italic bg-slate-50/30">Belum ada item ditambahkan</td></tr>`;
    } else {
        tbody.innerHTML = window.tempQTItems.map((item, idx) => {
            total += item.subtotal;
            return `
                    <tr class="hover:bg-slate-50/50 transition-colors">
                        <td class="py-3 px-4 w-12"><input type="checkbox" class="rounded border-slate-300"></td>
                        <td class="py-3 px-2 text-slate-400 text-center">${idx + 1}</td>
                        <td class="py-3 px-4 font-bold text-slate-800">${item.itemCode || '---'}</td>
                        <td class="py-3 px-4 text-right font-bold text-slate-700">${formatNumber(item.qty)}</td>
                        <td class="py-3 px-4 text-right font-bold text-slate-700">${formatNumber(item.price)}</td>
                        <td class="py-3 px-4 text-right text-slate-500">${formatNumber(item.subtotal)}</td>
                        <td class="py-3 px-4 text-center">
                            <div class="flex items-center justify-center gap-2">
                                <button type="button" class="w-7 h-7 flex items-center justify-center bg-blue-50 text-blue-500 hover:bg-blue-600 hover:text-white rounded-lg transition-all" onclick="editQTItemRow('${item.id}')" title="Edit Item">
                                    <i class="fas fa-pencil-alt text-[10px]"></i>
                                </button>
                                <button type="button" class="w-7 h-7 flex items-center justify-center bg-red-50 text-red-400 hover:bg-red-500 hover:text-white rounded-lg transition-all" onclick="removeQTItemRow('${item.id}')" title="Hapus Item">
                                    <i class="fas fa-trash text-[10px]"></i>
                                </button>
                            </div>
                        </td>
                    </tr>
                `;
        }).join('');
    }
    const fmt = v => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(v);

    const grandTotalBeforeTax = total;
    const taxRate = parseFloat(document.getElementById('qt_tax_rate')?.value) || 0;
    const taxAmt = Math.round(grandTotalBeforeTax * taxRate / 100);
    const grandTotal = grandTotalBeforeTax + taxAmt;

    const subtotalEl = document.getElementById('qt_subtotal_display');
    if (subtotalEl) subtotalEl.innerText = fmt(total);

    // Create or update tax row if needed - adding it before total
    let totalRow = document.getElementById('qt_total_display').parentElement;
    let taxRow = document.getElementById('qt_tax_row');
    if (!taxRow) {
        taxRow = document.createElement('div');
        taxRow.id = 'qt_tax_row';
        taxRow.className = 'flex justify-between items-center pb-3 border-b border-slate-200';
        taxRow.innerHTML = `<span class="text-[10px] font-black uppercase tracking-widest text-orange-500">PPN (${taxRate}%):</span><span id="qt_tax_display" class="text-sm font-bold text-orange-600"></span>`;
        totalRow.parentNode.insertBefore(taxRow, totalRow);
    }
    document.getElementById('qt_tax_display').innerText = fmt(taxAmt);
    document.getElementById('qt_tax_row').querySelector('span').innerText = `PPN (${taxRate}%):`;
    taxRow.style.display = taxRate === 0 ? 'none' : 'flex';

    document.getElementById('qt_total_display').innerText = fmt(grandTotal);
    
    // Sync globals for saving
    window._qtTaxAmount = taxAmt;
    window._qtTaxRate = taxRate;
    window._qtDiscountAmt = 0;
    window._qtDiscountDesc = '';
    window._qtDiscountType = '';
    window._qtDiscountValue = '';
};


window.saveNewQT = async () => {
    try {
        if (!window.tempQTItems || window.tempQTItems.length === 0) {
            showToast('QT harus memiliki minimal 1 item', 'error');
            return;
        }

        const qtNumber = document.getElementById('qt_number')?.value;
        const customerId = document.getElementById('qt_customer_id')?.value;
        const qtDate = document.getElementById('qt_date')?.value;
        const validTill = document.getElementById('qt_valid_till')?.value;
        const notes = document.getElementById('qt_notes')?.value || '';
        const paymentTerms = document.getElementById('qt_payment_term')?.value || '';

        if (!qtNumber) { showToast('No. Quotation harus ada', 'error'); return; }
        if (!customerId) { showToast('Pilih Customer', 'error'); return; }
        if (!qtDate) { showToast('Pilih Tanggal Quotation', 'error'); return; }
        const taxRate = document.getElementById('qt_tax_rate')?.value;
        if (taxRate === undefined || taxRate === '') { showToast('Pilih Pajak', 'error'); return; }

        // Final sequence check just before saving
        let finalQTNumber = qtNumber;
        const existing = db.read('salesQuotations') || [];
        if (existing.some(q => q.qtNumber === qtNumber)) {
            finalQTNumber = generateQTNumber();
        }

        const rawTotal = window.tempQTItems.reduce((sum, item) => sum + (parseFloat(item.subtotal) || 0), 0);
        const finalTaxRate = window._qtTaxRate || parseFloat(document.getElementById('qt_tax_rate')?.value) || 0;
        const taxAmount = window._qtTaxAmount || Math.round(rawTotal * finalTaxRate / 100);
        const totalAmount = rawTotal + taxAmount;

        const safeIsoDate = (val) => {
            if (!val || val === '') return null;
            const d = new Date(val);
            return isNaN(d.getTime()) ? null : d.toISOString();
        };

        const qtData = {
            qtNumber: finalQTNumber,
            date: qtDate ? new Date(qtDate).toISOString() : new Date().toISOString(),
            validUntil: (validTill && validTill !== '') ? new Date(validTill).toISOString() : null,
            customerId,
            status: window._editingQTId ? (existing.find(q => q.id === window._editingQTId)?.status || 'DRAFT') : 'DRAFT',
            subtotal: rawTotal,
            taxRate: finalTaxRate,
            taxAmount: taxAmount,
            totalAmount: totalAmount,
            paymentTerms: paymentTerms,
            discountType: '',
            discountValue: '',
            discountAmount: 0,
            discountDescription: '',
            items: window.tempQTItems,
            notes: notes
        };

        let res;
        if (window._editingQTId) {
            res = await db.update('salesQuotations', window._editingQTId, qtData);
        } else {
            res = await db.insert('salesQuotations', qtData);
        }

        if (res) {
            showToast(window._editingQTId ? `Quotation ${finalQTNumber} berhasil diperbarui.` : `Quotation ${finalQTNumber} berhasil dibuat.`);
            window._editingQTId = null;
            window._qtDiscountAmt = 0; window._qtDiscountDesc = ''; window._qtDiscountType = ''; window._qtDiscountValue = '';
            renderSalesQuotations();
        } else {
            // Error is already shown by db.js/api.js via toast
            console.error('[App] Save QT failed - result is null');
        }
    } catch (err) {
        console.error('Save QT Error:', err);
        showToast('Gagal menyimpan quotation: ' + err.message, 'error');
    }
};

window.updateQTStatus = (id, newStatus) => {
    db.update('salesQuotations', id, { status: newStatus });
    showToast(`QT status updated to ${newStatus}`);
    renderSalesQuotations();
};

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ PURCHASE RFQ MODULE â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function renderPurchaseRFQs() {
    const canEdit = getModulePermission('pembelian').edit;
    document.getElementById('pageTitle').innerText = 'Request For Quotation (RFQ) - Pembelian';
    const mainContent = document.getElementById('main-content');

    const filters = window.currentFilters.purchaseRFQs;
    const suppliers = db.read('suppliers');
    const supOptions = suppliers.map(s => `<option value="${s.id}" ${filters.supplier === s.id ? 'selected' : ''}>${s.name}</option>`).join('');

    const statusWeight = { 'DRAFT': 0, 'SENT': 1, 'CONFIRMED': 2, 'PO_CREATED': 3, 'CANCELLED': 4 };
    let rfqs = db.read('purchaseRFQs').sort((a, b) => {
        const weightA = statusWeight[a.status] !== undefined ? statusWeight[a.status] : 99;
        const weightB = statusWeight[b.status] !== undefined ? statusWeight[b.status] : 99;
        if (weightA !== weightB) return weightA - weightB;
        return new Date(b.date) - new Date(a.date);
    });

    // Apply Filters
    if (filters.start) {
        const d = new Date(filters.start); d.setHours(0, 0, 0, 0);
        rfqs = rfqs.filter(r => new Date(r.date) >= d);
    }
    if (filters.end) {
        const d = new Date(filters.end); d.setHours(23, 59, 59, 999);
        rfqs = rfqs.filter(r => new Date(r.date) <= d);
    }
    if (filters.supplier) {
        rfqs = rfqs.filter(r => r.supplierId === filters.supplier);
    }
    if (filters.status) {
        rfqs = rfqs.filter(r => r.status === filters.status);
    }

    let rows = rfqs.map(rfq => {
        const supplier = suppliers.find(s => s.id === rfq.supplierId) || { name: 'Unknown' };
        let statusColor = 'bg-gray-100 text-gray-700';
        if (rfq.status === 'SENT') statusColor = 'bg-blue-100 text-blue-700';
        if (rfq.status === 'CONFIRMED') statusColor = 'bg-green-100 text-green-700';
        if (rfq.status === 'PO_CREATED') statusColor = 'bg-purple-100 text-purple-700';
        if (rfq.status === 'CANCELLED') statusColor = 'bg-red-100 text-red-700';

        let options = `<option value="view">Lihat Detail</option>`;

        if (canEdit && rfq.status === 'DRAFT') {
            options += `<option value="edit">Edit</option>`;
            options += `<option value="send">Kirim ke Supplier</option>`;
            options += `<option value="confirm">Confirm</option>`;
            options += `<option value="delete">Hapus</option>`;
        } else if (canEdit && rfq.status === 'SENT') {
            options += `<option value="send">Kirim Ulang</option>`;
            options += `<option value="confirm">Confirm</option>`;
            options += `<option value="delete">Hapus</option>`;
        } else if (canEdit && rfq.status === 'CONFIRMED') {
            options += `<option value="create_po">Buat Purchase Order</option>`;
            options += `<option value="delete">Hapus</option>`;
        } else if (rfq.status === 'PO_CREATED') {
            options += `<option value="delete">Hapus</option>`;
        }

        let actionHtml = `
            <div class="inline-block relative w-full md:w-[140px]">
                <select class="w-full bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 font-bold text-xs rounded-lg pl-3 pr-8 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer appearance-none transition-all shadow-sm" onchange="handleRFQAction(this, '${rfq.id}')">
                    <option value="" disabled selected>Pilih Aksi...</option>
                    ${options}
                </select>
                <div class="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3 text-slate-400">
                    <i class="fas fa-chevron-down text-[10px]"></i>
                </div>
            </div>
        `;

        const rfqNumDisplay = (rfq.rfqNumber || 'RFQ-???').toUpperCase();
        const rfqDateDisplay = rfq.date ? formatDate(rfq.date).split(' ')[0] : '-';
        const itemCount = Array.isArray(rfq.items) ? rfq.items.length : 0;

        return `
            <tr class="border-b border-gray-100 hover:bg-slate-50 transition-colors">
                <td class="py-4 px-6 whitespace-nowrap">
                    <button onclick="viewPurchaseRFQ('${rfq.id}')" class="text-blue-700 hover:text-blue-800 font-mono text-sm font-bold transition-colors cursor-pointer outline-none bg-blue-50/80 px-3.5 py-1.5 rounded-lg border border-blue-200 shadow-sm">
                        ${rfqNumDisplay}
                    </button>
                </td>
                <td class="py-4 px-6 text-sm text-slate-500 font-medium">${rfqDateDisplay}</td>
                <td class="py-4 px-6 text-sm text-slate-900 font-bold tracking-tight">${supplier.name}</td>
                <td class="py-4 px-6 text-[11px] text-slate-500 font-bold uppercase tracking-widest">${rfq.category || '-'}</td>
                <td class="py-4 px-6 text-right">
                    <span class="text-sm font-bold text-slate-800">${itemCount}</span>
                    <span class="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Items</span>
                </td>
                <td class="py-4 px-6 text-center">
                    <span class="px-3 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest shadow-sm border border-black/5 ${statusColor}">
                        ${rfq.status === 'PO_CREATED' ? 'PO Created' : rfq.status}
                    </span>
                </td>
                <td class="py-4 px-6 text-right whitespace-nowrap">
                    <div class="flex items-center justify-end gap-2 px-1">
                        ${actionHtml}
                    </div>
                </td>
            </tr>
        `;
    }).join('');

    if (rfqs.length === 0) rows = `<tr><td colspan="7" class="py-24 text-center text-gray-400 font-bold uppercase tracking-widest"><i class="fas fa-search-minus text-4xl mb-3 opacity-20"></i><br>Tidak ada RFQ ditemukan</td></tr>`;

    mainContent.innerHTML = `
        <div id="rfq-list-view" class="animate-in fade-in duration-300 h-[calc(100vh-64px)] flex flex-col bg-slate-50 -m-4 sm:-m-6">
            <!-- Full Width Fixed Filter Bar -->
            <div class="bg-white border-b border-gray-200 shrink-0 z-40 shadow-sm relative">
                <div class="flex flex-wrap md:flex-nowrap justify-between items-center px-6 py-4 gap-4">
                    <div class="flex items-center gap-3 flex-1">
                        <div class="flex-1 max-w-md relative">
                            <i class="fas fa-search absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 text-sm cursor-text pointer-events-none"></i>
                            <input type="text" id="rfq_global_search" onkeyup="filterRFQTable()" placeholder="Search Purchase RFQs..." 
                                class="w-full pl-11 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm font-medium text-slate-700 placeholder:text-slate-400 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:bg-white outline-none transition-all">
                        </div>
                        
                        <!-- Date Filter Dropdown Trigger -->
                        <div class="relative" id="rfq_date_filter_container">
                            <button onclick="toggleRFQDateDropdown()" class="flex items-center bg-slate-50 border border-slate-200 rounded-xl overflow-hidden hover:bg-slate-100 transition-all shadow-sm h-[38px] group p-0">
                                <span class="bg-slate-100 border-r border-slate-200 px-3 h-full flex items-center text-slate-600 transition-colors">
                                    <i class="fas fa-sort-amount-up text-[13px]"></i>
                                </span>
                                <span class="px-4 text-[14px] font-medium text-blue-600">Date</span>
                                <span class="pr-3 pl-1 text-slate-500 justify-center flex items-center">
                                    <i class="fas fa-chevron-down text-[11px]"></i>
                                </span>
                            </button>
                            
                            <!-- Dropdown Content -->
                            <div id="rfq_date_dropdown" class="absolute left-0 mt-2 w-72 bg-white border border-slate-100 rounded-2xl shadow-xl z-[200] hidden p-5 animate-in fade-in zoom-in-95 duration-200">
                                <h4 class="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Filter Berdasarkan Tanggal</h4>
                                <div class="space-y-4">
                                    <div>
                                        <label class="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Dari Tanggal</label>
                                        <input type="date" id="rfq_header_start" value="${filters.start || ''}" class="w-full border border-slate-100 rounded-xl px-3 py-2 text-sm font-bold text-slate-700 bg-slate-50/50 focus:bg-white focus:border-blue-500 outline-none transition-all">
                                    </div>
                                    <div>
                                        <label class="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Sampai Tanggal</label>
                                        <input type="date" id="rfq_header_end" value="${filters.end || ''}" class="w-full border border-slate-100 rounded-xl px-3 py-2 text-sm font-bold text-slate-700 bg-slate-50/50 focus:bg-white focus:border-blue-500 outline-none transition-all">
                                    </div>
                                    <div class="flex gap-2 pt-2">
                                        <button onclick="applyRFQHeaderDateFilter()" class="flex-1 bg-blue-600 text-white py-2.5 rounded-xl text-[11px] font-black uppercase tracking-widest hover:bg-blue-700 transition-all shadow-md active:scale-95">Apply</button>
                                        <button onclick="resetRFQHeaderDateFilter()" class="flex-1 bg-slate-50 text-slate-500 py-2.5 rounded-xl text-[11px] font-black uppercase tracking-widest hover:bg-slate-100 transition-all">Reset</button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div class="flex items-center gap-2">
                        ${canEdit ? `
                        <button onclick="openRFQForm()" class="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2 rounded-lg transition-all text-sm font-medium shadow-sm flex items-center gap-2 active:scale-95">
                            <i class="fas fa-plus"></i> Buat RFQ Baru
                        </button>
                        ` : `
                        <span class="text-[10px] font-black text-blue-500 bg-blue-50 border border-blue-100 px-4 py-2 rounded-xl uppercase tracking-widest">Mode Lihat Saja</span>
                        `}
                    </div>
                </div>
            </div>

            <!-- Table Container wrapper -->
            <div class="flex-1 overflow-auto">
                <table class="w-full text-left border-collapse" id="rfq_table">
                    <thead class="bg-slate-50 sticky top-0 z-30 shadow-[0_1px_0_#e2e8f0]">
                        <tr class="bg-slate-50/80 border-b border-gray-200">
                            <th class="py-3 px-6 text-[10px] font-black text-slate-500 uppercase tracking-widest whitespace-nowrap">No. RFQ</th>
                            <th class="py-3 px-6 text-[10px] font-black text-slate-500 uppercase tracking-widest whitespace-nowrap">Tanggal</th>
                            <th class="py-3 px-6 text-[10px] font-black text-slate-500 uppercase tracking-widest whitespace-nowrap">Supplier</th>
                            <th class="py-3 px-6 text-[10px] font-black text-slate-500 uppercase tracking-widest whitespace-nowrap">Kategori</th>
                            <th class="py-3 px-6 text-[10px] font-black text-slate-500 uppercase tracking-widest whitespace-nowrap text-right">Qty Item</th>
                            <th class="py-3 px-6 text-[10px] font-black text-slate-500 uppercase tracking-widest whitespace-nowrap text-center">Status</th>
                            <th class="py-3 px-6 text-[10px] font-black text-slate-500 uppercase tracking-widest whitespace-nowrap text-right">Aksi</th>
                        </tr>
                    </thead>
                    <tbody class="divide-y divide-gray-100 bg-white font-sans">${rows}</tbody>
                </table>
            </div>

            <div class="bg-slate-50 border-t border-slate-200 p-2 text-center text-[10px] font-black text-slate-400 tracking-widest uppercase shrink-0">
                TOTAL: ${rfqs.length} BARIS
            </div>
        </div>

        <!-- RFQ Form View (hidden by default, shown by openRFQForm) -->
        <div id="rfq-form-view" class="hidden"></div>
    `;
}

window.handleRFQAction = (selectEl, rfqId) => {
    const action = selectEl.value;
    selectEl.value = ''; // reset back to placeholder
    if (!action) return;

    if (action === 'view')      return viewPurchaseRFQ(rfqId);
    if (action === 'edit')      return openRFQForm(rfqId);
    if (action === 'send')      return openSendPurchaseRFQModal(rfqId);
    if (action === 'confirm')   return updatePurchaseRFQStatus(rfqId, 'CONFIRMED');
    if (action === 'create_po') return convertRFQtoPO(rfqId);
    if (action === 'delete')    return deletePurchaseRFQ(rfqId);
};

window.filterRFQTable = () => {
    const input = document.getElementById('rfq_global_search');
    if(!input) return;
    const filter = input.value.toLowerCase();
    const table = document.getElementById('rfq_table');
    const tr = table.getElementsByTagName('tr');

    for (let i = 1; i < tr.length; i++) {
        let textContent = tr[i].textContent || tr[i].innerText;
        if (textContent.toLowerCase().indexOf(filter) > -1) {
            tr[i].style.display = '';
        } else {
            tr[i].style.display = 'none';
        }
    }
};

window.toggleRFQDateDropdown = () => {
    const el = document.getElementById('rfq_date_dropdown');
    if (el) el.classList.toggle('hidden');
};

window.applyRFQHeaderDateFilter = () => {
    window.currentFilters.purchaseRFQs = {
        ...window.currentFilters.purchaseRFQs,
        start: document.getElementById('rfq_header_start').value,
        end: document.getElementById('rfq_header_end').value
    };
    renderPurchaseRFQs();
};

window.resetRFQHeaderDateFilter = () => {
    window.currentFilters.purchaseRFQs = { 
        ...window.currentFilters.purchaseRFQs,
        start: '', end: '' 
    };
    renderPurchaseRFQs();
};

function generatePurchaseRFQNumber(customDate = null) {
    const rfqs = db.read('purchaseRFQs') || [];
    const date = customDate ? new Date(customDate) : new Date();
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    const dateStr = `${day}${month}${year}`;
    const monthYearStr = `${month}${year}`;

    // Find the max sequence number for this specific month/year across all days
    let maxSeq = 0;
    rfqs.forEach(r => {
        if (!r.rfqNumber || !r.rfqNumber.startsWith('RFQ-')) return;
        const parts = r.rfqNumber.split('-');
        if (parts.length < 3) return;
        
        // parts[1] is DDMMYYYY. slice(2) is MMYYYY
        if (parts[1].slice(2) === monthYearStr) {
            const seq = parseInt(parts[2]);
            if (!isNaN(seq) && seq > maxSeq) maxSeq = seq;
        }
    });

    let nextSeq = maxSeq + 1;
    let finalNumber = `RFQ-${dateStr}-${String(nextSeq).padStart(3, '0')}`;
    
    // Safety check: ensure absolute uniqueness in case of manual edits or deletions
    while (rfqs.some(r => r.rfqNumber === finalNumber)) {
        nextSeq++;
        finalNumber = `RFQ-${dateStr}-${String(nextSeq).padStart(3, '0')}`;
    }

    return finalNumber;
}

window.onRFQCategoryChange = () => {
    // Legacy function. Item clearing is now handled directly in selectPurchaseCategory.
};

window.openRFQForm = async (rfqId = null) => {
    // Navigate if needed
    const listView = document.getElementById('rfq-list-view');
    const formView = document.getElementById('rfq-form-view');
    
    if (!listView || !formView) {
        if (window.navigateTo) await navigateTo('purchase-rfq');
    }
    
    const lv = document.getElementById('rfq-list-view');
    const fv = document.getElementById('rfq-form-view');
    if (!lv || !fv) return;

    lv.classList.add('hidden');
    fv.classList.remove('hidden');

    const rfq = rfqId ? db.findById('purchaseRFQs', rfqId) : null;
    window._editingRFQId = rfqId;
    window.tempRFQItems = rfq && Array.isArray(rfq.items) ? [...rfq.items] : [];

    renderBreadcrumb(['Purchasing', 'Request For Quotation', rfqId ? 'Edit RFQ' : 'Buat RFQ Baru']);

    const suppliers = db.read('suppliers') || [];
    const todayStr = new Date().toISOString().split('T')[0];
    const rfqNumberStr = rfq && rfq.rfqNumber ? rfq.rfqNumber : generatePurchaseRFQNumber(todayStr);

    fv.innerHTML = `
        <div class="animate-in fade-in slide-in-from-bottom-2 duration-400 -m-4 sm:-m-6 h-[calc(100vh-64px)] flex flex-col overflow-hidden bg-white">
            <!-- Sticky Action Bar -->
            <div class="sticky top-0 z-40 bg-white border-b border-slate-100 px-8 py-4 flex items-center justify-between shrink-0 shadow-sm">
                <div></div>
                <div class="flex items-center gap-3">
                    <button type="button" onclick="closeRFQForm()" class="px-6 py-2.5 bg-slate-100 text-slate-500 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-200 transition-all active:scale-95">Batal</button>
                    <button type="button" onclick="saveNewPurchaseRFQ()" class="px-8 py-2.5 bg-blue-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-blue-700 transition-all shadow-lg active:scale-95 flex items-center gap-2">
                        <i class="fas fa-check-circle text-[10px]"></i> Simpan Draft RFQ
                    </button>
                </div>
            </div>

            <!-- Scrollable Content -->
            <div class="flex-1 overflow-y-auto bg-slate-50/50 custom-scrollbar pb-32">
                <div class="w-full p-8 space-y-8">

                    <!-- Informasi Dasar -->
                    <div class="bg-white rounded-3xl p-8 border border-slate-100 shadow-sm space-y-6">
                        <h3 class="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] flex items-center gap-2">
                            <i class="fas fa-info-circle text-blue-600"></i> Informasi Dasar
                        </h3>
                        <div class="grid grid-cols-1 sm:grid-cols-4 gap-6">
                            <div>
                                <label class="block text-sm font-semibold text-slate-600 mb-2">No. RFQ <span class="text-red-400">*</span></label>
                                <input type="text" id="rfq_number" value="${rfqNumberStr}"
                                    class="w-full border-none rounded-xl px-4 py-3 bg-slate-100/80 font-bold text-slate-800 outline-none" readonly>
                            </div>
                            <div>
                                <label class="block text-sm font-semibold text-slate-600 mb-2">Supplier <span class="text-red-400">*</span></label>
                                <div class="relative" id="rfq_supplier_container">
                                    <input type="text" id="rfq_supplier_display" value="${rfq ? (suppliers.find(s => s.id === rfq.supplierId)?.name || '-- Pilih Supplier --') : '-- Pilih Supplier --'}" readonly
                                        onclick="toggleSupplierDropdown('rfq_supplier_dropdown')"
                                        class="w-full border-none rounded-xl px-4 py-3 bg-slate-100/80 font-bold text-slate-700 outline-none cursor-pointer">
                                    <input type="hidden" id="rfq_supplier_id" value="${rfq ? rfq.supplierId : ''}">
                                    <div id="rfq_supplier_dropdown" class="absolute left-0 mt-2 bg-white border border-slate-100 rounded-xl shadow-2xl z-[200] hidden overflow-hidden min-w-full animate-in fade-in zoom-in-95 duration-200">
                                        <div class="max-h-56 overflow-y-auto p-1">
                                            ${suppliers.map(s => `
                                                <div onclick="selectPurchaseSupplier('RFQ', '${s.id}', '${s.name.replace(/'/g, "\\'")}')"
                                                    class="px-4 py-2.5 text-sm font-bold text-slate-700 hover:bg-slate-50 rounded-xl cursor-pointer transition-colors m-0.5">
                                                    ${s.name}
                                                </div>
                                            `).join('')}
                                        </div>
                                        <div class="p-2 border-t border-slate-50 bg-white space-y-1">
                                            <button type="button" onclick="navigateToSupplierPage(); closeRFQForm();"
                                                class="flex items-center gap-3 w-full px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 transition-colors rounded-xl font-bold text-left group whitespace-nowrap">
                                                <div class="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-slate-500 group-hover:bg-blue-100 group-hover:text-blue-600 transition-colors shrink-0">
                                                    <i class="fas fa-plus text-xs"></i>
                                                </div>
                                                Tambah Supplier Baru
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <div>
                                <label class="block text-sm font-semibold text-slate-600 mb-2">Tanggal RFQ <span class="text-red-400">*</span></label>
                                <input type="date" id="rfq_date" value="${rfq ? rfq.date : todayStr}"
                                    onchange="if(!window._editingRFQId) document.getElementById('rfq_number').value = generatePurchaseRFQNumber(this.value)"
                                    class="w-full border-none rounded-xl px-4 py-3 bg-slate-100/80 font-bold text-slate-800 outline-none">
                            </div>
                            <div>
                                <label class="block text-sm font-semibold text-slate-600 mb-2">Kategori <span class="text-red-400">*</span></label>
                                <select id="rfq_category" class="w-full border-none rounded-xl px-4 py-3 bg-slate-100/80 font-bold text-slate-700 outline-none cursor-pointer">
                                    <option value="" disabled ${!rfq ? 'selected' : ''}>-- Pilih Kategori --</option>
                                    <option value="Bahan Baku" ${rfq?.category === 'Bahan Baku' ? 'selected' : ''}>Bahan Baku</option>
                                    <option value="Packaging" ${rfq?.category === 'Packaging' ? 'selected' : ''}>Packaging</option>
                                    <option value="Perlengkapan" ${rfq?.category === 'Perlengkapan' ? 'selected' : ''}>Perlengkapan</option>
                                    <option value="Service" ${rfq?.category === 'Service' ? 'selected' : ''}>Service</option>
                                    <option value="Sparepart" ${rfq?.category === 'Sparepart' ? 'selected' : ''}>Sparepart</option>
                                    <option value="Aktiva ( tetap )" ${rfq?.category === 'Aktiva ( tetap )' ? 'selected' : ''}>Aktiva ( tetap )</option>
                                    <option value="Gas" ${rfq?.category === 'Gas' ? 'selected' : ''}>Gas</option>
                                </select>
                            </div>
                        </div>
                    </div>

                    <!-- Manifest Barang -->
                    <div class="bg-white rounded-3xl p-8 border border-slate-100 shadow-sm space-y-6">
                        <h3 class="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] flex items-center gap-2">
                            <i class="fas fa-boxes text-blue-600"></i> Manifest Barang
                        </h3>
                        <div class="flex flex-wrap gap-4 items-end">
                            <div class="flex-1 min-w-[300px] relative">
                                <label class="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Pilih Produk</label>
                                <input type="text" id="rfq_item_search" placeholder="-- Cari Kode atau Nama Produk --" autocomplete="off"
                                    onclick="toggleItemProductDropdown('rfq')" readonly
                                    class="w-full border-none rounded-xl px-4 py-2.5 bg-white font-bold text-slate-700 shadow-sm focus:ring-2 focus:ring-blue-500/20 outline-none transition-all cursor-pointer">
                                <input type="hidden" id="rfq_item_id">

                                <div id="rfq_item_dropdown" class="absolute left-0 mt-2 w-full bg-white border border-slate-100 rounded-2xl shadow-2xl z-[200] hidden overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                                    <div class="p-3 border-b border-slate-50">
                                        <input type="text" id="rfq_item_dropdown_search" placeholder="Ketik kode atau nama..." onkeyup="filterItemProductList('rfq', this.value)" class="w-full px-4 py-2 bg-slate-50 border-none rounded-lg text-xs font-bold outline-none focus:ring-2 focus:ring-blue-500/20">
                                    </div>
                                    <div class="max-h-60 overflow-y-auto p-1" id="rfq_item_list"></div>
                                    <div class="p-2 border-t border-slate-50 bg-slate-50/10 space-y-1">
                                        <button type="button" onclick="renderMasterProducts()" class="w-full flex items-center gap-3 px-4 py-2.5 text-[10px] font-black text-slate-500 hover:bg-slate-50 hover:text-slate-900 rounded-xl transition-all uppercase tracking-widest">
                                            <div class="w-7 h-7 flex items-center justify-center bg-slate-100 rounded-lg"><i class="fas fa-plus text-[10px]"></i></div>
                                            Tambah Produk Baru
                                        </button>
                                    </div>
                                </div>
                            </div>
                            <div class="w-24">
                                <label class="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Qty</label>
                                <input type="number" id="rfq_item_qty" value="1" min="1" class="w-full border-none rounded-xl px-4 py-2.5 bg-white font-bold text-slate-700 shadow-sm focus:ring-2 focus:ring-blue-500/20 outline-none transition-all">
                            </div>
                            <button type="button" onclick="addPurchaseRFQItemRow()"
                                class="h-[46px] px-6 bg-blue-600 border border-blue-500 text-white rounded-xl flex items-center gap-2 font-black text-[10px] uppercase tracking-widest hover:bg-blue-700 transition-all shadow-lg active:scale-95">
                                <i class="fas fa-plus"></i> Tambah
                            </button>
                        </div>

                        <!-- Items table -->
                        <div class="overflow-hidden border border-slate-100 rounded-2xl shadow-sm">
                            <table class="w-full text-sm text-left border-collapse">
                                <thead>
                                    <tr class="bg-slate-50 border-b border-slate-100 text-slate-400 text-[9px] uppercase font-black tracking-widest">
                                        <th class="py-4 px-4 w-12 text-center"></th>
                                        <th class="py-4 px-6 w-12 text-center">#</th>
                                        <th class="py-4 px-6">Item Code / Product</th>
                                        <th class="py-4 px-6 text-right">Qty</th>
                                        <th class="py-4 px-6 w-12 text-center"><i class="fas fa-cog"></i></th>
                                    </tr>
                                </thead>
                                <tbody id="rfq_items_list" class="divide-y divide-slate-50"></tbody>
                            </table>
                        </div>

                        <!-- Notes -->
                        <div class="pt-4 border-t border-dashed border-slate-100">
                            <label class="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Catatan / Keterangan</label>
                            <textarea id="rfq_notes" rows="3" placeholder="Tambahkan instruksi pengiriman, spesifikasi teknis, atau catatan lainnya..."
                                class="w-full border-none rounded-xl px-4 py-3 bg-slate-100/80 text-sm text-slate-700 outline-none resize-none shadow-sm transition-all">${rfq && rfq.notes ? rfq.notes : ''}</textarea>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;

    refreshPurchaseRFQItemsTable();
};

window.closeRFQForm = () => {
    const listView = document.getElementById('rfq-list-view');
    const formView = document.getElementById('rfq-form-view');
    if (listView) listView.classList.remove('hidden');
    if (formView) formView.classList.add('hidden');
    renderBreadcrumb(['Purchasing', 'Request For Quotation']);
};

// Keep old name as alias for backward compat
window.openPurchaseRFQModal = window.openRFQForm;

window.convertRFQtoPO = (rfqId) => {
    const rfq = db.findById('purchaseRFQs', rfqId);
    if (!rfq) return;

    // Prefill tempPOItems based on RFQ items
    window.tempPOItems = rfq.items.map(it => ({
        ...it,
        unit: it.unit || it.prodUnit, // Map the unit from RFQ
        price: it.price || 0,
        subtotal: (it.price || 0) * (it.qty || 0)
    }));

    // Open PO Form with RFQ link
    window.openPOForm(null, rfqId);

    // Initial prefill values via timeout to ensure DOM is ready
    setTimeout(() => {
        const supplier = db.findById('suppliers', rfq.supplierId);
        if (supplier) {
            window.selectPurchaseSupplier('PO', supplier.id, supplier.name);
        }

        const catSel = document.getElementById('po_category');
        const catDisp = document.getElementById('po_category_display');
        if (catSel && catDisp) {
            const catVal = rfq.category || 'Bahan Baku';
            catSel.value = catVal;
            catDisp.value = catVal;
        }

        const poNotes = document.getElementById('po_notes');
        if (poNotes) poNotes.value = `Ditransfer dari RFQ No: ${rfq.rfqNumber}`;

        renderPOItemsList();
    }, 200);
};

window.addPurchaseRFQItemRow = () => {
    const inventoryItemId = document.getElementById('rfq_item_id').value;
    const searchVal = document.getElementById('rfq_item_search').value;

    let prodText = searchVal;
    let itemCode = '';
    let prodUnit = 'PCS';

    if (inventoryItemId) {
        const p = db.findById('inventoryItems', inventoryItemId);
        if (p) {
            prodText = p.itemName;
            itemCode = p.itemCode;
            prodUnit = p.unit || 'PCS';
        }
    }

    if (!inventoryItemId && !searchVal.trim()) { showToast('Pilih produk dari daftar', 'error'); return; }
    const qtyVal = parseFloat(document.getElementById('rfq_item_qty').value);
    if (!qtyVal || qtyVal <= 0) { showToast('Qty harus diisi', 'error'); return; }

    window.tempRFQItems.push({
        id: Date.now().toString(),
        inventoryItemId,
        prodText,
        itemCode,
        prodUnit,
        qty: qtyVal
    });

    // Reset
    document.getElementById('rfq_item_search').value = '';
    document.getElementById('rfq_item_id').value = '';
    document.getElementById('rfq_item_qty').value = '';
    refreshPurchaseRFQItemsTable();
};

window.removePurchaseRFQItemRow = (itemId) => {
    window.tempRFQItems = window.tempRFQItems.filter(i => i.id !== itemId);
    refreshPurchaseRFQItemsTable();
};

window.editPurchaseRFQItemRow = (itemId) => {
    const item = window.tempRFQItems.find(i => i.id === itemId);
    if (!item) return;
    // Prefill the add row fields
    const searchEl = document.getElementById('rfq_item_search');
    const idEl = document.getElementById('rfq_item_id');
    const qtyEl = document.getElementById('rfq_item_qty');
    if (searchEl) searchEl.value = item.itemCode ? `${item.itemCode} - ${item.prodText}` : item.prodText;
    if (idEl) idEl.value = item.inventoryItemId || '';
    if (qtyEl) { qtyEl.value = item.qty; qtyEl.focus(); }
    // Remove from list so user re-adds after editing
    window.tempRFQItems = window.tempRFQItems.filter(i => i.id !== itemId);
    refreshPurchaseRFQItemsTable();
};

window.refreshPurchaseRFQItemsTable = () => {
    const tbody = document.getElementById('rfq_items_list');
    if (!tbody) return;
    if (window.tempRFQItems.length === 0) {
        tbody.innerHTML = `<tr><td colspan="5" class="py-16 text-center">
            <div class="flex flex-col items-center gap-3 text-slate-300">
                <i class="fas fa-box-open text-4xl"></i>
                <span class="text-sm font-black uppercase tracking-widest">Belum ada item</span>
            </div>
        </td></tr>`;
        return;
    }
    tbody.innerHTML = window.tempRFQItems.map((item, idx) => `
        <tr class="hover:bg-blue-50/20 transition-colors group">
            <td class="py-4 px-4 text-center">
                <input type="checkbox" class="w-4 h-4 rounded accent-blue-600">
            </td>
            <td class="py-4 px-6 text-[11px] font-black text-slate-400">${idx + 1}</td>
            <td class="py-4 px-6">
                ${item.itemCode
                    ? `<div class="font-black text-slate-800 text-sm">${item.itemCode}</div><div class="text-xs text-slate-500 mt-0.5">${item.prodText}</div>`
                    : `<div class="font-black text-slate-800 text-sm">${item.prodText}</div>`
                }
            </td>
            <td class="py-4 px-6 text-right font-bold text-slate-700">${formatNumber(item.qty)} <span class="text-slate-400 font-normal text-xs">${item.prodUnit}</span></td>
            <td class="py-4 px-6 text-center">
                <div class="flex items-center justify-center gap-1">
                    <button onclick="editPurchaseRFQItemRow('${item.id}')" class="w-7 h-7 rounded-lg bg-blue-50 text-blue-400 hover:bg-blue-500 hover:text-white transition-all flex items-center justify-center" title="Edit">
                        <i class="fas fa-pencil-alt text-xs"></i>
                    </button>
                    <button onclick="removePurchaseRFQItemRow('${item.id}')" class="w-7 h-7 rounded-lg bg-red-50 text-red-400 hover:bg-red-500 hover:text-white transition-all flex items-center justify-center" title="Hapus">
                        <i class="fas fa-trash text-xs"></i>
                    </button>
                </div>
            </td>
        </tr>
    `).join('');
};

window.saveNewPurchaseRFQ = async () => {
    if (window.tempRFQItems.length === 0) { showToast('RFQ harus memiliki minimal 1 item', 'error'); return; }

    const rfqNumber = document.getElementById('rfq_number').value;
    const supplierId = document.getElementById('rfq_supplier_id').value;
    const rfqDate = document.getElementById('rfq_date').value;
    const category = document.getElementById('rfq_category').value;
    const notes = document.getElementById('rfq_notes')?.value || '';

    if (!supplierId) { showToast('Pilih Supplier', 'error'); return; }
    if (!rfqDate) { showToast('Pilih Tanggal RFQ', 'error'); return; }
    if (!category) { showToast('Pilih Kategori Pembelian', 'error'); return; }

    showToast('Sedang menyimpan...', 'info');

    if (window._editingRFQId) {
        await db.update('purchaseRFQs', window._editingRFQId, {
            rfqNumber,
            date: new Date(rfqDate).toISOString(),
            supplierId,
            category,
            items: window.tempRFQItems,
            notes
        });
        showToast('RFQ Berhasil Diperbarui!', 'success');
    } else {
        const result = await db.insert('purchaseRFQs', {
            rfqNumber,
            date: new Date(rfqDate).toISOString(),
            supplierId,
            category,
            status: 'DRAFT',
            items: window.tempRFQItems,
            notes
        });
        if (!result) { showToast('Gagal menyimpan RFQ, coba lagi', 'error'); return; }
        showToast('RFQ Berhasil Disimpan!', 'success');
    }

    window._editingRFQId = null;
    closeRFQForm();
    await db.sync('purchaseRFQs');
    renderPurchaseRFQs();
};

window.updatePurchaseRFQStatus = (id, newStatus) => {
    db.update('purchaseRFQs', id, { status: newStatus });
    showToast(`Status RFQ diperbarui ke ${newStatus}`);
    renderPurchaseRFQs();
};

window.deletePurchaseRFQ = (id) => {
    if (confirm('Yakin hapus RFQ ini?')) {
        db.delete('purchaseRFQs', id);
        renderPurchaseRFQs();
    }
};

window.viewPurchaseRFQ = (id) => {
    const rfq = db.findById('purchaseRFQs', id);
    const supplier = db.findById('suppliers', rfq.supplierId);

    const detailHTML = `
        <div class="space-y-6 bg-white p-4" id="print-internal-header">
            <div class="flex justify-between items-start border-b-2 border-gray-800 pb-4">
                <div>
                    <h2 class="text-2xl font-black text-gray-800 tracking-tight">REQUEST FOR QUOTATION</h2>
                    <p class="text-blue-600 font-mono font-bold">${rfq.rfqNumber}</p>
                </div>
                <div class="text-right">
                    <p class="font-black text-gray-900 text-lg">${CONFIG.companyName}</p>
                </div>
            </div>
            
            <div class="grid grid-cols-2 gap-8 py-4">
                <div class="space-y-1">
                    <h3 class="text-[10px] font-black text-gray-400 uppercase tracking-widest">Supplier:</h3>
                    <p class="font-bold text-gray-900 text-base">${supplier ? supplier.name : '-'}</p>
                    <p class="text-sm text-gray-600 leading-relaxed">${supplier ? (supplier.address || '') : ''}</p>
                    ${supplier?.phone ? `<p class="text-sm text-gray-600"><i class="fas fa-phone mr-1 text-xs"></i> ${supplier.phone}</p>` : ''}
                </div>
                <div class="space-y-2 text-right">
                    <div class="inline-block bg-gray-50 p-3 rounded-lg border border-gray-100">
                        <table class="text-sm">
                            <tr><td class="text-gray-500 pr-4">Tanggal:</td><td class="font-bold text-gray-800">${formatDate(rfq.date).slice(0, 11)}</td></tr>
                            <tr><td class="text-gray-500 pr-4">Kategori:</td><td class="font-bold text-gray-800">${rfq.category || '-'}</td></tr>
                            <tr><td class="text-gray-500 pr-4">Status:</td><td><span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-700 uppercase">${rfq.status === 'PO_CREATED' ? 'PO Created' : rfq.status}</span></td></tr>
                        </table>
                    </div>
                </div>
            </div>
            
            <div class="border rounded-xl overflow-hidden border-gray-200">
                <table class="w-full text-left border-collapse">
                    <thead>
                        <tr class="bg-gray-50 border-b-2 border-gray-800 text-gray-800 text-xs font-black uppercase tracking-wider">
                            <th class="py-3 px-4">#</th>
                            <th class="py-3 px-4">Deskripsi Produk / Item</th>
                            <th class="py-3 px-4 text-right">Jumlah (Qty)</th>
                        </tr>
                    </thead>
                    <tbody class="text-sm divide-y divide-gray-100">
                        ${(rfq.items || []).map((i, idx) => `
                            <tr class="hover:bg-gray-50/50 transition-colors">
                                <td class="py-3 px-4 text-gray-400 font-medium">${idx + 1}</td>
                                <td class="py-3 px-4 font-semibold text-gray-800">${i.prodText || '-'}</td>
                                <td class="py-3 px-4 text-right font-bold text-gray-900">${formatNumber(i.qty || 0)} ${i.prodUnit || ''}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
            
            <div class="mt-8 pt-6 border-t border-gray-100">
                <p class="text-xs text-gray-500 leading-relaxed">
                    <span class="font-bold text-gray-700 italic block mb-1">Catatan:</span>
                    Mohon ketersediaan Bapak/Ibu untuk memberikan penawaran harga terbaik untuk item-item tersebut di atas. 
                    Penawaran dapat dikirimkan kembali melalui Email atau WhatsApp kami. Terima kasih atas kerjasamanya.
                </p>
            </div>

            <div class="mt-12 grid grid-cols-2 gap-4 text-center">
                <div class="h-32 flex flex-col justify-between">
                    <p class="text-xs font-bold text-gray-400 uppercase tracking-widest">Hormat Kami,</p>
                    <p class="text-sm font-bold text-gray-800 border-t border-gray-200 pt-2 inline-block mx-auto min-w-[150px]">${CONFIG.companyName}</p>
                </div>
                <div class="h-32 flex flex-col justify-between">
                    <p class="text-xs font-bold text-gray-400 uppercase tracking-widest">Supplier,</p>
                    <p class="text-sm font-bold text-gray-800 border-t border-gray-200 pt-2 inline-block mx-auto min-w-[150px]">( ____________________ )</p>
                </div>
            </div>
        </div>
    `;

    const footer = `
        <div class="flex flex-wrap gap-2 w-full sm:w-auto">
            <button onclick='printHTML(\`${detailHTML.replace(/`/g, "\\`").replace(/\n/g, "")}\`, "RFQ ${rfq.rfqNumber}", true)' class="flex-1 sm:flex-none inline-flex justify-center items-center px-4 py-2 bg-purple-600 text-white rounded-md font-bold text-sm shadow-sm hover:bg-purple-700 transition">
                <i class="fas fa-file-pdf mr-2"></i> Cetak RFQ (PDF)
            </button>
            <button onclick="openSendPurchaseRFQModal('${rfq.id}')" class="flex-1 sm:flex-none inline-flex justify-center items-center px-4 py-2 bg-blue-600 text-white rounded-md font-bold text-sm shadow-sm hover:bg-blue-700 transition">
                <i class="fas fa-paper-plane mr-2"></i> Kirim RFQ
            </button>
            <button onclick="closeModal()" class="flex-1 sm:flex-none inline-flex justify-center items-center px-4 py-2 bg-white border text-gray-600 rounded-md font-bold text-sm hover:bg-gray-50 transition">
                Tutup
            </button>
        </div>
    `;

    showModal(`RFQ Detail - ${rfq.rfqNumber}`, detailHTML, footer, 'xl');
};

window.openSendPurchaseRFQModal = (id) => {
    const rfq = db.findById('purchaseRFQs', id);
    const supplier = db.findById('suppliers', rfq.supplierId);

    const itemRows = rfq.items.map(i => `
        <tr>
            <td style="padding:10px 12px;font-weight:600;color:#1e293b;border-bottom:1px solid #f1f5f9;">${i.itemCode ? `<strong>${i.itemCode}</strong> – ` : ''}${i.prodText}</td>
            <td style="padding:10px 12px;text-align:right;font-weight:700;color:#1e293b;border-bottom:1px solid #f1f5f9;">${formatNumber(i.qty)} ${i.prodUnit}</td>
        </tr>
    `).join('');

    // === NON-PAJAK: minimal header – only company name ===
    const detailHTMLSimple = `
        <div style="font-family:Arial,sans-serif;max-width:700px;margin:0 auto;padding:32px;" id="print-internal-header">
            <div style="border-bottom:2px solid #1e293b;padding-bottom:16px;margin-bottom:24px;display:flex;justify-content:space-between;align-items:flex-end;">
                <div>
                    <h2 style="font-size:22px;font-weight:900;color:#1e293b;margin:0;">REQUEST FOR QUOTATION</h2>
                    <p style="color:#2563eb;font-family:monospace;font-weight:700;margin:4px 0 0;">${rfq.rfqNumber}</p>
                </div>
                <div style="text-align:right;">
                    <p style="font-weight:900;font-size:16px;color:#1e293b;margin:0;">${CONFIG.companyName}</p>
                </div>
            </div>
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:32px;margin-bottom:24px;">
                <div>
                    <p style="font-size:10px;font-weight:900;color:#94a3b8;text-transform:uppercase;letter-spacing:0.1em;margin:0 0 4px;">Supplier:</p>
                    <p style="font-weight:700;font-size:15px;color:#1e293b;margin:0;">${supplier ? supplier.name : '-'}</p>
                    <p style="font-size:12px;color:#64748b;margin:4px 0 0;">${supplier ? (supplier.address || '') : ''}</p>
                </div>
                <div style="text-align:right;">
                    <p style="font-size:13px;font-weight:700;color:#1e293b;margin:0;">Tanggal: ${formatDate(rfq.date).slice(0, 11)}</p>
                </div>
            </div>
            <table style="width:100%;border-collapse:collapse;border:1px solid #e2e8f0;border-radius:8px;overflow:hidden;">
                <thead>
                    <tr style="background:#f8fafc;border-bottom:2px solid #1e293b;">
                        <th style="padding:10px 12px;text-align:left;font-size:11px;font-weight:900;color:#1e293b;text-transform:uppercase;letter-spacing:0.05em;">Deskripsi Produk / Item</th>
                        <th style="padding:10px 12px;text-align:right;font-size:11px;font-weight:900;color:#1e293b;text-transform:uppercase;letter-spacing:0.05em;">Jumlah (Qty)</th>
                    </tr>
                </thead>
                <tbody>${itemRows}</tbody>
            </table>
            <div style="margin-top:32px;padding-top:16px;border-top:1px solid #f1f5f9;">
                <p style="font-size:11px;color:#94a3b8;font-style:italic;">Catatan: Mohon berikan penawaran harga terbaik untuk item tersebut di atas.</p>
            </div>
        </div>
    `;

    // === DENGAN PAJAK: full header – logo + full address ===
    const detailHTMLFull = `
        <div style="font-family:Arial,sans-serif;max-width:700px;margin:0 auto;padding:32px;" id="print-internal-header">
            <div style="border-bottom:2px solid #1e293b;padding-bottom:16px;margin-bottom:24px;display:flex;justify-content:space-between;align-items:flex-end;">
                <div>
                    <h2 style="font-size:22px;font-weight:900;color:#1e293b;margin:0;">REQUEST FOR QUOTATION</h2>
                    <p style="color:#2563eb;font-family:monospace;font-weight:700;margin:4px 0 0;">${rfq.rfqNumber}</p>
                </div>
                <div style="text-align:right;display:flex;align-items:center;gap:12px;">
                    ${CONFIG.logo ? `<img src="${CONFIG.logo}" alt="Logo" style="height:48px;width:auto;object-fit:contain;">` : ''}
                    <div>
                        <p style="font-weight:900;font-size:16px;color:#1e293b;margin:0;">${CONFIG.companyName}</p>
                        <p style="font-size:11px;color:#64748b;margin:4px 0 0;max-width:220px;">${CONFIG.companyAddress || ''}</p>
                    </div>
                </div>
            </div>
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:32px;margin-bottom:24px;">
                <div>
                    <p style="font-size:10px;font-weight:900;color:#94a3b8;text-transform:uppercase;letter-spacing:0.1em;margin:0 0 4px;">Supplier:</p>
                    <p style="font-weight:700;font-size:15px;color:#1e293b;margin:0;">${supplier ? supplier.name : '-'}</p>
                    <p style="font-size:12px;color:#64748b;margin:4px 0 0;">${supplier ? (supplier.address || '') : ''}</p>
                </div>
                <div style="text-align:right;">
                    <p style="font-size:13px;font-weight:700;color:#1e293b;margin:0;">Tanggal: ${formatDate(rfq.date).slice(0, 11)}</p>
                </div>
            </div>
            <table style="width:100%;border-collapse:collapse;border:1px solid #e2e8f0;border-radius:8px;overflow:hidden;">
                <thead>
                    <tr style="background:#f8fafc;border-bottom:2px solid #1e293b;">
                        <th style="padding:10px 12px;text-align:left;font-size:11px;font-weight:900;color:#1e293b;text-transform:uppercase;letter-spacing:0.05em;">Deskripsi Produk / Item</th>
                        <th style="padding:10px 12px;text-align:right;font-size:11px;font-weight:900;color:#1e293b;text-transform:uppercase;letter-spacing:0.05em;">Jumlah (Qty)</th>
                    </tr>
                </thead>
                <tbody>${itemRows}</tbody>
            </table>
            <div style="margin-top:32px;padding-top:16px;border-top:1px solid #f1f5f9;">
                <p style="font-size:11px;color:#94a3b8;font-style:italic;">Catatan: Mohon berikan penawaran harga terbaik untuk item tersebut di atas.</p>
            </div>
        </div>
    `;

    // Store templates on window for onclick access
    // RFQ always prints without PPN (simple header — no logo/address)
    window._rfqPrint = detailHTMLSimple;

    const body = `
        <div class="p-4 text-center">
            <p class="text-gray-600 mb-6 font-medium">Pilih metode pengiriman untuk RFQ <strong>${rfq.rfqNumber}</strong>:</p>
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-lg mx-auto">
                <button onclick="sendPurchaseRFQWA('${id}'); closeModal();" class="flex flex-col items-center justify-center p-6 border-2 border-green-100 rounded-xl hover:border-green-500 hover:bg-green-50 transition-all group shadow-sm">
                    <div class="w-14 h-14 bg-green-100 rounded-full flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                        <i class="fab fa-whatsapp text-2xl text-green-600"></i>
                    </div>
                    <span class="font-bold text-green-700 text-sm">WhatsApp</span>
                </button>

                <button onclick="sendPurchaseRFQEmail('${id}'); closeModal();" class="flex flex-col items-center justify-center p-6 border-2 border-blue-100 rounded-xl hover:border-blue-500 hover:bg-blue-50 transition-all group shadow-sm">
                    <div class="w-14 h-14 bg-blue-100 rounded-full flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                        <i class="fas fa-envelope text-2xl text-blue-600"></i>
                    </div>
                    <span class="font-bold text-blue-700 text-sm">Email</span>
                </button>
            </div>
        </div>
    `;
    showModal('Kirim RFQ ke Supplier', body, `<button onclick="closeModal()" class="w-full sm:w-auto px-4 py-2 bg-gray-100 text-gray-700 rounded-md text-sm font-bold hover:bg-gray-200 transition">Batal</button>`, 'lg');
};

window.sendPurchaseRFQWA = (id) => {
    const rfq = db.findById('purchaseRFQs', id);
    const supplier = db.findById('suppliers', rfq.supplierId);
    if (!supplier?.phone) { showToast('No. HP supplier tidak ditemukan', 'error'); return; }

    let phone = supplier.phone.replace(/[^0-9]/g, '');
    if (phone.startsWith('0')) phone = '62' + phone.substring(1);

    const itemsStr = rfq.items.map(i => `- ${i.prodText}: ${formatNumber(i.qty)} ${i.prodUnit}`).join('%0A');
    const message = `Halo ${supplier.name},%0A%0AKami memerlukan penawaran harga (RFQ) *${rfq.rfqNumber}* untuk item berikut:%0A%0A${itemsStr}%0A%0AMohon segera informasikan harga terbaik Anda.%0A%0ATerima kasih,%0A*${CONFIG.companyName}*`;

    window.open(`https://wa.me/${phone}?text=${message}`, '_blank');
    if (rfq.status === 'DRAFT') {
        db.update('purchaseRFQs', id, { status: 'SENT' });
        renderPurchaseRFQs();
    }
};

window.sendPurchaseRFQEmail = (id) => {
    const rfq = db.findById('purchaseRFQs', id);
    const supplier = db.findById('suppliers', rfq.supplierId);
    if (!supplier?.email) { showToast('Email supplier tidak ditemukan', 'error'); return; }

    const itemsStr = rfq.items.map(i => `- ${i.prodText}: ${formatNumber(i.qty)} ${i.prodUnit}`).join('\n');
    const subject = `RFQ ${rfq.rfqNumber} - ${CONFIG.companyName}`;
    const mailBody = `Halo ${supplier.name},\n\nKami membutuhkan penawaran harga (RFQ) nomor ${rfq.rfqNumber} untuk detail produk di bawah ini:\n\n${itemsStr}\n\nMohon untuk membalas email ini dengan penawaran harga terbaik Anda.\n\nTerima kasih,\n${CONFIG.companyName}`;

    window.location.href = `mailto:${supplier.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(mailBody)}`;
    if (rfq.status === 'DRAFT') {
        db.update('purchaseRFQs', id, { status: 'SENT' });
        renderPurchaseRFQs();
    }
};



window.deleteQT = (id) => {
    if (confirm('Yakin hapus QT ini?')) {
        db.delete('salesQuotations', id);
        renderSalesQuotations();
    }
};

window.viewQT = (id) => {
    const qt = db.findById('salesQuotations', id);
    const customer = db.findById('customers', qt.customerId);
    const mainContent = document.getElementById('main-content');
    
    // Set breadcrumb
    renderBreadcrumb(['Sales', 'Quotations', 'Detail ' + qt.qtNumber]);

    const printableHTML = `
           <div class="max-w-5xl mx-auto bg-white p-6 sm:p-10 print:p-2 shadow-sm border border-slate-100 print:border-none rounded-3xl print:rounded-none my-6 print:m-0" id="print-internal-header">
                <div class="flex justify-between items-start mb-10">
                    <div>
                        <h2 class="text-4xl font-black text-slate-900 tracking-tight">QUOTATION</h2>
                        <p class="text-slate-400 mt-2 font-mono text-lg">${qt.qtNumber}</p>
                    </div>
                    <div class="flex items-start gap-4">
                        ${CONFIG.logo ? `<img src="${CONFIG.logo}" alt="Logo" class="h-16 w-auto object-contain">` : ``}
                        <div class="text-right">
                            <h1 class="text-xl font-black text-slate-900 uppercase tracking-tight">${CONFIG.companyName}</h1>
                            <p class="text-xs text-slate-400 max-w-xs ml-auto leading-relaxed mt-1">${CONFIG.companyAddress}</p>
                        </div>
                    </div>
                </div>
                </div>
                
                <div class="grid grid-cols-2 gap-12 mb-8 print:mb-4">
                    <div class="space-y-4">
                        <h3 class="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Customer / Recipient</h3>
                        <div class="p-5 bg-slate-50 rounded-2xl border border-slate-100">
                            <p class="font-black text-slate-900 text-lg mb-1">${customer ? customer.name : (qt.customerName || '-')}</p>
                            ${customer && customer.phone ? `<p class="text-sm font-bold text-slate-500">${customer.phone}</p>` : ''}
                            ${customer && (customer.address || qt.notes) ? `
                                <div class="mt-4 pt-4 border-t border-slate-200">
                                    <p class="text-sm text-slate-600 leading-relaxed font-medium italic">"${customer?.address || 'No specific shipping address provided.'}"</p>
                                </div>
                            ` : ''}
                        </div>
                    </div>
                    <div class="text-right space-y-4">
                        <h3 class="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Quotation Info</h3>
                        <div class="space-y-2">
                             <div class="flex justify-end gap-4 items-center">
                                <span class="text-xs font-bold text-slate-400">TANGGAL:</span>
                                <span class="text-sm font-black text-slate-800 uppercase">${formatDate(qt.date).slice(0, 11)}</span>
                            </div>
                            ${qt.validUntil ? `
                            <div class="flex justify-end gap-4 items-center">
                                <span class="text-xs font-bold text-slate-400">VALID UNTIL:</span>
                                <span class="text-sm font-black text-red-500 uppercase">${qt.validUntil}</span>
                            </div>` : ''}
                            <div class="flex justify-end gap-4 items-center mt-4">
                                <span class="text-[10px] font-black px-3 py-1 rounded-full bg-slate-900 text-white uppercase tracking-widest">${qt.status}</span>
                            </div>
                        </div>
                    </div>
                </div>

                <table class="w-full text-left mb-8 print:mb-4 border-collapse">
                    <thead>
                        <tr class="bg-slate-50 text-slate-500 text-[10px] uppercase font-black tracking-widest border-y border-slate-100 print:bg-white">
                            <th class="py-5 px-4 print:py-2">Deskripsi Produk</th>
                            <th class="py-5 px-4 text-right print:py-2">Quantity</th>
                            <th class="py-5 px-4 text-right print:py-2">Rate</th>
                            <th class="py-5 px-4 text-right print:py-2">Amount</th>
                        </tr>
                    </thead>
                    <tbody class="text-slate-700">
                        ${qt.items.map(i => `
                            <tr class="border-b border-slate-50 hover:bg-slate-50/50 transition-colors group">
                                <td class="py-6 px-4 print:py-2">
                                    <div class="font-black text-slate-900 text-sm group-hover:text-blue-600 transition-colors uppercase select-all">${i.prodText.split(' (')[0]}</div>
                                    <div class="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">Item Code: ${i.prodCode || 'N/A'}</div>
                                </td>
                                <td class="py-6 px-4 text-right font-black text-slate-800 print:py-2">${formatNumber(i.qty)}</td>
                                <td class="py-6 px-4 text-right font-bold text-slate-500 print:py-2">${formatCurrency(i.price)}</td>
                                <td class="py-6 px-4 text-right font-black text-slate-900 print:py-2">${formatCurrency(i.subtotal)}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                    <tfoot class="bg-slate-50/50">
                        <tr>
                            <td colspan="3" class="py-4 px-4 text-right text-[10px] font-black text-slate-400 uppercase tracking-widest">Subtotal (Gross)</td>
                            <td class="py-4 px-4 text-right text-sm font-black text-slate-800">${formatCurrency(qt.items.reduce((sum, i) => sum + (parseFloat(i.subtotal) || 0), 0))}</td>
                        </tr>
                        ${qt.taxAmount > 0 ? `
                        <tr>
                            <td colspan="3" class="py-4 px-4 text-right text-[10px] font-black text-orange-400 uppercase tracking-widest">PPN (${qt.taxRate}%)</td>
                            <td class="py-4 px-4 text-right text-sm font-black text-orange-600">${formatCurrency(qt.taxAmount)}</td>
                        </tr>
                        ` : ''}
                        <tr>
                            <td colspan="2"></td>
                            <td class="py-4 px-4 text-right font-black text-slate-400 uppercase tracking-[0.2em] text-[10px]">Grand Total</td>
                            <td class="py-4 px-4 text-right font-black text-blue-700 text-3xl tracking-tighter border-t-2 border-slate-900">${formatCurrency(qt.totalAmount)}</td>
                        </tr>
                    </tfoot>
                </table>
           </div>
        `;

    mainContent.innerHTML = `
        <div class="animate-in fade-in slide-in-from-bottom-2 duration-400 -m-6 h-[calc(100vh-64px)] flex flex-col overflow-hidden bg-white">
            <!-- Record Header / Action Bar (STICKY AREA) -->
            <div class="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200 px-8 py-5 flex items-center justify-between shrink-0 shadow-sm">
                <div class="flex items-center gap-6">

                    <div>
                    </div>
                    <div class="ml-4 px-4 py-1.5 rounded-full bg-slate-900 text-white text-[10px] font-black tracking-widest uppercase">
                        ${qt.status}
                    </div>
                </div>
                
                <div class="flex items-center gap-3">
                    <button onclick='printHTML(\`${printableHTML.replace(/`/g, "\\`").replace(/\n/g, "")}\`, "Quotation ${qt.qtNumber}")' 
                        class="px-6 py-2.5 bg-slate-100 text-slate-700 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-200 transition-all flex items-center gap-2 active:scale-95">
                        <i class="fas fa-print text-slate-400"></i> Print PDF
                    </button>
                    <button onclick="openSendQTModal('${qt.id}')" 
                        class="px-6 py-2.5 bg-blue-50 text-blue-600 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-blue-600 hover:text-white transition-all flex items-center gap-2 active:scale-95 shadow-sm">
                        <i class="fas fa-paper-plane mr-1 text-[9px]"></i> Kirim
                    </button>
                    <div class="w-px h-6 bg-slate-200 mx-2"></div>
                    <button onclick="renderSalesQuotations()" class="px-6 py-2.5 bg-slate-900 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-black transition-all shadow-xl active:scale-95 group">
                        Tutup <i class="fas fa-times ml-2 text-slate-400 group-hover:text-white"></i>
                    </button>
                </div>
            </div>

            <!-- Scrollable Content Area -->
            <div class="flex-1 overflow-y-auto bg-slate-50/50 custom-scrollbar pb-24">
                ${printableHTML}
            </div>
        </div>
    `;
};

window.openSendQTModal = (id) => {
    const qt = db.findById('salesQuotations', id);
    const body = `
        <div class="p-4 text-center">
            <p class="text-gray-600 mb-6 font-medium">Pilih metode pengiriman untuk Quotation <strong>${qt.qtNumber}</strong>:</p>
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <button onclick="sendWA('${id}'); closeModal();" class="flex flex-col items-center justify-center p-6 border-2 border-green-100 rounded-xl hover:border-green-500 hover:bg-green-50 transition-all group">
                    <div class="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                        <i class="fab fa-whatsapp text-3xl text-green-600"></i>
                    </div>
                    <span class="font-bold text-green-700">WhatsApp</span>
                    <span class="text-[10px] text-green-500 mt-1 uppercase font-bold tracking-wider">Kirim ke Aplikasi</span>
                </button>
                
                <button onclick="sendEmail('${id}'); closeModal();" class="flex flex-col items-center justify-center p-6 border-2 border-blue-100 rounded-xl hover:border-blue-500 hover:bg-blue-50 transition-all group">
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

window.sendWA = (id) => {
    const qt = db.findById('salesQuotations', id);
    const customer = db.findById('customers', qt.customerId);
    if (!customer || !customer.phone) {
        showToast('Nomor telepon pelanggan tidak ditemukan', 'error');
        return;
    }

    let phone = customer.phone.replace(/[^0-9]/g, '');
    if (phone.startsWith('0')) phone = '62' + phone.substring(1);

    const message = `Halo ${customer.name},%0A%0ABerikut adalah Quotation *${qt.qtNumber}* senilai *${formatCurrency(qt.totalAmount)}*.%0A%0ASilakan hubungi kami untuk informasi lebih lanjut.%0A%0ATerima kasih,%0A*${CONFIG.companyName}*`;

    window.open(`https://wa.me/${phone}?text=${message}`, '_blank');

    // Auto-update status to SENT if it was DRAFT
    if (qt.status === 'DRAFT') {
        db.update('salesQuotations', id, { status: 'SENT' });
        renderSalesQuotations();
    }
};

window.sendEmail = (id) => {
    const qt = db.findById('salesQuotations', id);
    const customer = db.findById('customers', qt.customerId);
    if (!customer || !customer.email) {
        showToast('Email pelanggan tidak ditemukan. Mohon lengkapi data master customer.', 'error');
        return;
    }

    const subject = `Quotation ${qt.qtNumber} - ${CONFIG.companyName}`;
    const body = `Halo ${customer.name},\n\nTerlampir detail quotation ${qt.qtNumber} senilai ${formatCurrency(qt.totalAmount)}.\n\nSilakan hubungi kami kembali untuk konsep kerja sama selanjutnya.\n\nTerima kasih,\n${CONFIG.companyName}`;

    const mailtoUrl = `mailto:${customer.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    window.location.href = mailtoUrl;

    // Auto-update status to SENT if it was DRAFT
    if (qt.status === 'DRAFT') {
        db.update('salesQuotations', id, { status: 'SENT' });
        renderSalesQuotations();
    }
};



window.openSendSOModal = (id) => {
    const so = db.findById('salesOrders', id);
    const body = `
        <div class="p-4 text-center">
            <p class="text-gray-600 mb-6 font-medium">Pilih metode pengiriman untuk Sales Order <strong>${so.soNumber}</strong>:</p>
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <button onclick="sendWASO('${id}'); closeModal();" class="flex flex-col items-center justify-center p-6 border-2 border-green-100 rounded-xl hover:border-green-500 hover:bg-green-50 transition-all group">
                    <div class="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                        <i class="fab fa-whatsapp text-3xl text-green-600"></i>
                    </div>
                    <span class="font-bold text-green-700">WhatsApp</span>
                    <span class="text-[10px] text-green-500 mt-1 uppercase font-bold tracking-wider">Kirim ke Aplikasi</span>
                </button>
                
                <button onclick="sendEmailSO('${id}'); closeModal();" class="flex flex-col items-center justify-center p-6 border-2 border-blue-100 rounded-xl hover:border-blue-500 hover:bg-blue-50 transition-all group">
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
    showModal('Pilih Metode Pengiriman SO', body, footer);
};

window.sendWASO = (id) => {
    const so = db.findById('salesOrders', id);
    const customer = db.findById('customers', so.customerId);
    if (!customer || !customer.phone) {
        showToast('Nomor telepon pelanggan tidak ditemukan', 'error');
        return;
    }

    let phone = customer.phone.replace(/[^0-9]/g, '');
    if (phone.startsWith('0')) phone = '62' + phone.substring(1);

    const message = `Halo ${customer.name},%0A%0ABerikut adalah Sales Order *${so.soNumber}* senilai *${formatCurrency(so.totalAmount)}*.%0A%0ATerima kasih,%0A*${CONFIG.companyName}*`;

    window.open(`https://wa.me/${phone}?text=${message}`, '_blank');
};

window.sendEmailSO = (id) => {
    const so = db.findById('salesOrders', id);
    const customer = db.findById('customers', so.customerId);
    if (!customer || !customer.email) {
        showToast('Email pelanggan tidak ditemukan. Mohon lengkapi data master customer.', 'error');
        return;
    }

    const subject = `Sales Order ${so.soNumber} - ${CONFIG.companyName}`;
    const body = `Halo ${customer.name},\n\nTerlampir detail Sales Order ${so.soNumber} senilai ${formatCurrency(so.totalAmount)}.\n\nTerima kasih,\n${CONFIG.companyName}`;

    const mailtoUrl = `mailto:${customer.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    window.location.href = mailtoUrl;
};


window.convertQTtoSO = (qtId) => {
    const qt = db.findById('salesQuotations', qtId);
    if (!qt) return;

    // Track the source quotation
    window._qtBeingConverted = qtId;

    // First, navigate to Sales Order module to initialize the SO form container
    renderSalesOrders();

    // Now open the modal/form with prefilled data
    window.openSOModal(qt);
    showToast('Silakan cek dan sesuaikan data Sales Order ini.', 'info');
};

// --- Sales Orders Module ---
window.handleSOAction = (selectEl, id) => {
    const act = selectEl.value;
    if (!act) return;
    selectEl.value = ""; // Reset for next use
    
    if (act === 'view') viewSO(id);
    else if (act === 'edit') openSOModal(db.findById('salesOrders', id)); // Logic handles edit if object passed
    else if (act === 'confirm') updateSOStatus(id, 'CONFIRMED');
    else if (act === 'send') openSendSOModal(id);
    else if (act === 'delete') deleteSO(id);
};

window.filterSOTable = () => {
    const q = (document.getElementById('so_global_search')?.value || '').toLowerCase();
    const rows = document.querySelectorAll('#so_main_table tbody tr');
    rows.forEach(row => {
        const text = row.innerText.toLowerCase();
        row.style.display = text.includes(q) ? '' : 'none';
    });
};

window.toggleSODateDropdown = () => {
    const d = document.getElementById('so_date_dropdown');
    d?.classList.toggle('hidden');
};

window.applySOHeaderDateFilter = () => {
    const s = document.getElementById('so_header_start')?.value;
    const e = document.getElementById('so_header_end')?.value;
    window.currentFilters.salesOrders.start = s || '';
    window.currentFilters.salesOrders.end = e || '';
    document.getElementById('so_date_dropdown')?.classList.add('hidden');
    renderSalesOrders();
};

window.resetSOHeaderDateFilter = () => {
    window.currentFilters.salesOrders.start = '';
    window.currentFilters.salesOrders.end = '';
    document.getElementById('so_date_dropdown')?.classList.add('hidden');
    renderSalesOrders();
};

window.toggleSelectAllSO = (master) => {
    const checkboxes = document.querySelectorAll(".so-row-checkbox");
    checkboxes.forEach(cb => {
        cb.checked = master.checked;
    });
};

window.handleSOAction = (selectEl, id) => {
    const act = selectEl.value;
    if (!act) return;
    selectEl.value = ""; // Reset for next use
    
    if (act === 'view') viewSO(id);
    else if (act === 'edit') openSOModal(db.findById('salesOrders', id)); 
    else if (act === 'confirm') updateSOStatus(id, 'CONFIRMED');
    else if (act === 'send') openSendSOModal(id);
    else if (act === 'delete') deleteSO(id);
};

window.filterSOTable = () => {
    const q = (document.getElementById('so_global_search')?.value || '').toLowerCase();
    const rows = document.querySelectorAll('#so_main_table tbody tr');
    rows.forEach(row => {
        const text = row.innerText.toLowerCase();
        row.style.display = text.includes(q) ? '' : 'none';
    });
};

window.toggleSODateDropdown = () => {
    const d = document.getElementById('so_date_dropdown');
    d?.classList.toggle('hidden');
};

window.applySOHeaderDateFilter = () => {
    const s = document.getElementById('so_header_start')?.value;
    const e = document.getElementById('so_header_end')?.value;
    window.currentFilters.salesOrders.start = s || '';
    window.currentFilters.salesOrders.end = e || '';
    document.getElementById('so_date_dropdown')?.classList.add('hidden');
    renderSalesOrders();
};

window.resetSOHeaderDateFilter = () => {
    window.currentFilters.salesOrders.start = '';
    window.currentFilters.salesOrders.end = '';
    document.getElementById('so_date_dropdown')?.classList.add('hidden');
    renderSalesOrders();
};

window.toggleSelectAllSO = (master) => {
    const checkboxes = document.querySelectorAll(".so-row-checkbox");
    checkboxes.forEach(cb => {
        cb.checked = master.checked;
    });
};

function renderSalesOrders() {
    const canEdit = getModulePermission('penjualan').edit;
    renderBreadcrumb(['Sales', 'Sales Orders']);
    const mainContent = document.getElementById('main-content');

    const soStatusOrder = { 'DRAFT': 0, 'CONFIRMED': 1, 'DELIVERED': 2 };
    let sos = db.read('salesOrders').sort((a, b) => {
        const sa = soStatusOrder[a.status] ?? 99;
        const sb = soStatusOrder[b.status] ?? 99;
        if (sa !== sb) return sa - sb;
        return new Date(b.date) - new Date(a.date);
    });
    const customers = db.read('customers');
    const filters = window.currentFilters.salesOrders || { start: '', end: '', customer: '' };

    // Apply Filters
    if (filters.start) {
        const d = new Date(filters.start); d.setHours(0, 0, 0, 0);
        sos = sos.filter(q => new Date(q.date) >= d);
    }
    if (filters.end) {
        const d = new Date(filters.end); d.setHours(23, 59, 59, 999);
        sos = sos.filter(q => new Date(q.date) <= d);
    }

    let rows = sos.map(so => {
        const customer = customers.find(c => c.id === so.customerId) || { name: 'Unknown' };
        
        let statusBadge = '';
        if (so.status === 'DRAFT') statusBadge = '<span class="px-3 py-1 bg-orange-50 text-orange-600 border border-orange-100 rounded-full text-[10px] font-bold tracking-tight shadow-sm">Open</span>';
        if (so.status === 'CONFIRMED') statusBadge = '<span class="px-3 py-1 bg-blue-50 text-blue-600 border border-blue-100 rounded-full text-[10px] font-bold tracking-tight shadow-sm">CONFIRMED</span>';
        if (so.status === 'DELIVERED') statusBadge = '<span class="px-3 py-1 bg-green-50 text-green-600 border border-green-100 rounded-full text-[10px] font-bold tracking-tight shadow-sm">DELIVERED</span>';

        let options = '';
        if (canEdit && so.status === 'DRAFT') {
            options += `<option value="confirm">Konfirmasi</option>`;
            options += `<option value="edit">Edit</option>`;
            options += `<option value="delete">Hapus</option>`;
        } else if (canEdit && so.status === 'CONFIRMED') {
            options += `<option value="edit">Edit</option>`;
            options += `<option value="delete">Hapus</option>`;
        }
        
        let actionHtml = `
            <div class="inline-block relative w-full md:w-[130px]">
                <select class="w-full bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 font-bold text-xs rounded-lg pl-3 pr-8 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer appearance-none transition-all shadow-sm" onchange="handleSOAction(this, '${so.id}')">
                    <option value="" disabled selected>Pilih Aksi...</option>
                    <option value="view">Lihat Detail</option>
                    <option value="send">Kirim</option>
                    ${options}
                </select>
                <div class="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3 text-slate-400">
                    <i class="fas fa-chevron-down text-[10px]"></i>
                </div>
            </div>
        `;

        return `
            <tr class="border-b border-gray-100 hover:bg-slate-50 transition-colors">
                <td class="py-4 px-4 w-10">
                    <input type="checkbox" class="so-row-checkbox w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer">
                </td>
                <td class="py-4 px-4 text-sm text-slate-900 font-bold tracking-tight">${customer.name}</td>
                <td class="py-4 px-4">${statusBadge}</td>
                <td class="py-4 px-4 text-sm text-slate-500 font-medium">${so.date.split('T')[0].split('-').reverse().join('-')}</td>
                <td class="py-4 px-4 text-sm text-slate-800 font-bold text-right">${formatCurrency(so.totalAmount)}</td>
                <td class="py-4 px-4">
                    <button onclick="viewSO('${so.id}')" class="text-slate-700 hover:text-blue-600 font-mono text-[11px] font-bold transition-colors cursor-pointer outline-none">
                        ${so.soNumber}
                    </button>
                </td>
                <td class="py-4 px-4 text-right">
                    ${actionHtml}
                </td>
            </tr>
        `;
    }).join('');

    if (sos.length === 0) rows = `<tr><td colspan="7" class="py-24 text-center text-gray-400 font-bold uppercase tracking-widest"><i class="fas fa-receipt text-4xl mb-3 opacity-20"></i><br>Tidak ada Sales Order ditemukan</td></tr>`;

    mainContent.innerHTML = `
        <div id="so-list-view" class="animate-in fade-in duration-300 h-[calc(100vh-64px)] flex flex-col bg-slate-50 -m-4 sm:-m-6">
            <!-- Full Width Fixed Filter Bar -->
            <div class="bg-white border-b border-gray-200 shrink-0 z-40 shadow-sm relative">
                <div class="flex flex-wrap md:flex-nowrap justify-between items-center px-6 py-4 gap-4">
                    <div class="flex items-center gap-3 flex-1">
                        <div class="flex-1 max-w-md relative">
                            <i class="fas fa-search absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 text-sm"></i>
                            <input type="text" id="so_global_search" onkeyup="filterSOTable()" placeholder="Search Sales Orders..." 
                                class="w-full pl-11 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-700 placeholder:text-slate-300 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/5 outline-none transition-all">
                        </div>
                        
                        <!-- Date Filter Dropdown Trigger -->
                        <div class="relative" id="so_date_filter_container">
                            <button onclick="toggleSODateDropdown()" class="flex items-center bg-slate-50 border border-slate-200 rounded-lg overflow-hidden hover:bg-slate-100 transition-all shadow-sm h-[42px] group">
                                <span class="bg-slate-200/60 border-r border-slate-200 px-3 h-full flex items-center text-slate-700 transition-colors">
                                    <i class="fas fa-sort-amount-up text-sm"></i>
                                </span>
                                <span class="px-4 text-sm font-medium text-blue-700">Date</span>
                                <span class="pr-3 text-slate-600">
                                    <i class="fas fa-chevron-down text-[12px]"></i>
                                </span>
                            </button>
                            
                            <!-- Dropdown Content -->
                            <div id="so_date_dropdown" class="absolute left-0 mt-2 w-80 bg-white border border-slate-100 rounded-2xl shadow-2xl z-[200] hidden p-6 animate-in fade-in zoom-in-95 duration-200">
                                <h4 class="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-4">Filter Pesanan</h4>
                                <div class="space-y-4">
                                    <div class="grid grid-cols-2 gap-3">
                                        <div>
                                            <label class="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Dari</label>
                                            <input type="date" id="so_header_start" value="${filters.start}" class="w-full border-2 border-slate-50 rounded-xl px-3 py-2 text-sm font-bold text-slate-700 bg-slate-50/50">
                                        </div>
                                        <div>
                                            <label class="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Ke</label>
                                            <input type="date" id="so_header_end" value="${filters.end}" class="w-full border-2 border-slate-50 rounded-xl px-3 py-2 text-sm font-bold text-slate-700 bg-slate-50/50">
                                        </div>
                                    </div>
                                    <div class="flex gap-2 pt-2">
                                        <button onclick="applySOHeaderDateFilter()" class="flex-1 bg-blue-600 text-white py-2 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-blue-700 transition-all shadow-lg active:scale-95">Apply</button>
                                        <button onclick="resetSOHeaderDateFilter()" class="flex-1 bg-slate-50 text-slate-400 py-2 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-slate-100 transition-all">Reset</button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div class="flex items-center gap-2">
                        <button onclick="openSOModal()" class="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2.5 rounded-xl transition-all text-[10px] font-black uppercase tracking-widest shadow-xl active:scale-95 flex items-center gap-2">
                            <i class="fas fa-plus"></i>Buat SO Baru
                        </button>
                    </div>
                </div>
            </div>

            <!-- Content Area -->
            <div class="p-4 sm:p-6 flex-1 overflow-y-auto">
                <div class="mb-3 flex justify-between items-center">
                    <p class="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total: ${sos.length} pesanan</p>
                </div>
                <div class="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                    <div class="overflow-x-auto min-h-[400px]">
                        <table class="w-full text-left border-collapse" id="so_main_table">
                            <thead class="sticky top-0 z-20">
                            <tr class="bg-slate-50 border-b border-slate-100 text-slate-500 font-semibold uppercase text-[10px] tracking-wider shadow-sm">
                                <th class="px-4 py-3.5 w-10">
                                    <input type="checkbox" id="selectAllSO" onclick="toggleSelectAllSO(this)" class="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer">
                                </th>
                                <th class="px-4 py-3.5">Customer Name</th>
                                <th class="px-4 py-3.5">Status</th>
                                <th class="px-4 py-3.5">Date</th>
                                <th class="px-4 py-3.5 text-right font-bold">Grand Total</th>
                                <th class="px-4 py-3.5">ID SO</th>
                                <th class="px-4 py-3.5 text-right w-[150px]">Aksi</th>
                            </tr>
                        </thead>
                        <tbody class="divide-y divide-gray-100 font-sans">${rows}</tbody>
                    </table>
                </div>
                </div>
            </div>
        </div>
        <div id="so-form-view" class="hidden"></div>
    `;
}

function romanize(num) {
    const roman = ["", "I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X", "XI", "XII"];
    return roman[num] || "";
}

function generateSONumber(isTax, customDate = null) {
    const sos = db.read('salesOrders') || [];
    const date = customDate ? new Date(customDate) : new Date();
    const month = date.getMonth() + 1;
    const year = date.getFullYear();
    const romanMonth = romanize(month);
    const type = isTax ? 'A' : 'B';

    let maxSeq = 0;
    sos.forEach(s => {
        if (!s.soNumber) return;
        const mainParts = s.soNumber.split('/');
        if (mainParts.length < 3) return;
        
        // Check if month and year match (romanMonth and year string)
        if (mainParts[1] === romanMonth && mainParts[2] === String(year)) {
            const prefixParts = mainParts[0].split('-');
            if (prefixParts.length >= 3 && prefixParts[1] === type) {
                const seq = parseInt(prefixParts[2]);
                if (!isNaN(seq) && seq > maxSeq) maxSeq = seq;
            }
        }
    });

    let nextSeq = maxSeq + 1;
    let finalNumber = `SO-${type}-${String(nextSeq).padStart(3, '0')}/${romanMonth}/${year}`;
    
    while (sos.some(s => s.soNumber === finalNumber)) {
        nextSeq++;
        finalNumber = `SO-${type}-${String(nextSeq).padStart(3, '0')}/${romanMonth}/${year}`;
    }

    return finalNumber;
}

window.openSOModal = (qtToConvert = null) => {
    // Hide list, show form view
    const listView = document.getElementById('so-list-view');
    const formView = document.getElementById('so-form-view');
    if (!listView || !formView) return;

    renderBreadcrumb(['Sales', 'Sales Orders', 'Buat Sales Order']);

    listView.classList.add('hidden');
    formView.classList.remove('hidden');

    window._qtBeingConverted = qtToConvert ? qtToConvert.id : null;
    let defaultCustId = '';
    
    if (qtToConvert) {
        let custId = qtToConvert.customerId;
        if (qtToConvert.customerName && !custId) {
            const existingCust = db.read('customers').find(c => c.name.toLowerCase() === qtToConvert.customerName.toLowerCase());
            if (existingCust) {
                custId = existingCust.id;
            } else {
                const newCust = db.insert('customers', { name: qtToConvert.customerName, phone: '', address: '' });
                custId = newCust.id;
            }
        }
        defaultCustId = custId;
        window.tempSOItems = qtToConvert.items.map(i => ({ ...i }));
    } else {
        window.tempSOItems = [];
    }

    const freshCustomers = db.read('customers');
    const cusOptions = freshCustomers.map(c => `<option value="${c.id}" ${c.id === defaultCustId ? 'selected' : ''}>${c.name}</option>`).join('');

    formView.innerHTML = `
        <div class="animate-in fade-in slide-in-from-bottom-2 duration-400 -m-6 h-[calc(100vh-64px)] flex flex-col overflow-hidden bg-white">
            <!-- Sticky Header / Action Bar -->
            <div class="sticky top-0 z-40 bg-white border-b border-slate-100 px-8 py-5 flex items-center justify-between shrink-0 shadow-sm">
                <div class="flex items-center gap-6">

                    <div>
                    </div>
                </div>
                
                <div class="flex items-center gap-3">
                    <button onclick="renderSalesOrders()" class="px-6 py-2.5 bg-slate-100 text-slate-500 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-200 transition-all active:scale-95">
                        Batal
                    </button>
                    <button onclick="saveNewSO()" class="px-8 py-2.5 bg-blue-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-blue-700 transition-all shadow-lg active:scale-95 flex items-center gap-2">
                        <i class="fas fa-check-circle text-[10px]"></i> Simpan Sales Order
                    </button>
                </div>
            </div>

            <!-- Scrollable Content -->
            <div class="flex-1 overflow-y-auto bg-slate-50/30 p-8 custom-scrollbar pb-32">
                <div class="w-full space-y-8">
                    <!-- Basic Information Card -->
                    <div class="bg-white rounded-3xl p-8 border border-slate-100 shadow-sm space-y-6">
                        <h3 class="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
                            <i class="fas fa-info-circle text-blue-600"></i> Informasi Dasar
                        </h3>
                        
                        <div class="grid grid-cols-1 sm:grid-cols-4 gap-6">
                            <div>
                                <label class="block text-sm font-semibold text-slate-600 mb-2">No. Sales Order <span class="text-red-400">*</span></label>
                                <div class="flex">
                                     <select id="so_is_tax" onchange="updateSONumberPreview()" class="border-none rounded-l-xl px-3 py-3 bg-slate-100 text-xs font-black text-slate-700 outline-none cursor-pointer">
                                        <option value="true">TAX</option>
                                        <option value="false">NT</option>
                                     </select>
                                     <input type="text" id="so_number" value="${generateSONumber(true, new Date().toISOString().split('T')[0])}" 
                                        class="w-full border-none rounded-r-xl px-4 py-3 bg-slate-50 font-bold text-slate-400 outline-none" readonly>
                                </div>
                            </div>
                            <div>
                                <label class="block text-sm font-semibold text-slate-600 mb-2">Customer <span class="text-red-400">*</span></label>
                                <div class="relative" id="so_customer_container">
                                    <input type="text" id="so_customer_search" value="${qtToConvert ? (db.findById('customers', defaultCustId)?.name || '-- Pilih Customer --') : '-- Pilih Customer --'}" readonly
                                        onclick="toggleCustomerDropdown('so_customer_dropdown')"
                                        class="w-full border-none rounded-xl px-4 py-3 bg-slate-100 font-bold text-slate-800 cursor-pointer focus:ring-2 focus:ring-blue-500/10 outline-none transition-all">
                                    <input type="hidden" id="so_customer_id" value="${defaultCustId}">
                                    
                                    <div id="so_customer_dropdown" class="absolute left-0 mt-2 bg-white border border-slate-100 rounded-xl shadow-2xl z-[200] hidden overflow-hidden animate-in fade-in zoom-in-95 duration-200 min-w-[280px]">
                                        <div class="max-h-60 overflow-y-auto p-1" id="so_customer_list">
                                            ${db.read('customers').map(c => `
                                                <div onclick="selectCustomer('SO', '${c.id}', '${c.name.replace(/'/g, "\\'")}')" 
                                                    class="px-4 py-2.5 text-sm font-bold text-slate-700 hover:bg-slate-50 rounded-xl cursor-pointer transition-colors m-0.5 ${defaultCustId === c.id ? 'bg-slate-50' : ''}">
                                                    ${c.name}
                                                </div>
                                            `).join('')}
                                        </div>
                                        <div class="p-2 border-t border-slate-50 bg-white space-y-1">
                                            <button type="button" onclick="openCustomerModal(null, 'SO'); toggleCustomerDropdown('so_customer_dropdown')" 
                                                class="flex items-center gap-3 w-full px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 transition-colors rounded-xl font-bold text-left group whitespace-nowrap">
                                                <div class="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-slate-500 group-hover:bg-blue-100 group-hover:text-blue-600 transition-colors shrink-0">
                                                    <i class="fas fa-plus text-xs"></i>
                                                </div>
                                                Create a new Customer
                                            </button>
                                            <button type="button" onclick="openAdvancedCustomerSearch('SO')" 
                                                class="flex items-center gap-3 w-full px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 transition-colors rounded-xl font-bold text-left group whitespace-nowrap">
                                                <div class="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-slate-500 group-hover:bg-blue-100 group-hover:text-blue-600 transition-colors shrink-0">
                                                    <i class="fas fa-search text-xs"></i>
                                                </div>
                                                Advanced Search
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <div>
                                <label class="block text-sm font-semibold text-slate-600 mb-2">Tanggal Sales Order <span class="text-red-400">*</span></label>
                                <input type="date" id="so_date" value="${new Date().toISOString().split('T')[0]}" 
                                    onchange="if(!window._editingSOId) document.getElementById('so_number').value = generateSONumber(document.getElementById('so_is_tax').value==='true', this.value)"
                                    class="w-full border-none rounded-xl px-4 py-3 bg-slate-100 font-bold text-slate-800 focus:ring-2 focus:ring-blue-500/10 outline-none transition-all">
                            </div>
                            <div>
                                <label class="block text-sm font-semibold text-slate-600 mb-2">Sales / Pembuat <span class="text-red-400">*</span></label>
                                <input type="text" id="so_sales_name" placeholder="Nama Sales" 
                                    class="w-full border-none rounded-xl px-4 py-3 bg-slate-100 font-bold text-slate-800 focus:ring-2 focus:ring-blue-500/10 outline-none transition-all">
                            </div>
                        </div>

                        <div class="grid grid-cols-1 sm:grid-cols-3 gap-6">
                            <div>
                                <label class="block text-sm font-semibold text-slate-600 mb-2">Term Pembayaran <span class="text-red-400">*</span></label>
                                <select id="so_payment_terms" onchange="updateSODueDate()" class="w-full border-none rounded-xl px-4 py-3 bg-slate-100 font-bold text-slate-800 focus:ring-2 focus:ring-blue-500/10 outline-none transition-all cursor-pointer">
                                    <option value="">-- Pilih Term --</option>
                                    <option value="Cash" ${qtToConvert?.paymentTerms === 'Cash' ? 'selected' : ''}>Cash</option>
                                    <option value="Tempo 7 S/d 10 Hari" ${qtToConvert?.paymentTerms === 'Tempo 7 S/d 10 Hari' ? 'selected' : ''}>Tempo 7 S/d 10 Hari</option>
                                    <option value="30 Hari" ${qtToConvert?.paymentTerms === '30 Hari' ? 'selected' : ''}>30 Hari</option>
                                    <option value="45 Hari" ${qtToConvert?.paymentTerms === '45 Hari' ? 'selected' : ''}>45 Hari</option>
                                </select>
                            </div>
                            <div>
                                <label class="block text-sm font-semibold text-slate-600 mb-2">Tgl. Jatuh Tempo <span class="text-red-400">*</span></label>
                                <input type="date" id="so_due_date" 
                                    class="w-full border-none rounded-xl px-4 py-3 bg-slate-100 font-bold text-slate-800 focus:ring-2 focus:ring-blue-500/10 outline-none transition-all">
                            </div>
                            <div>
                                <label class="block text-sm font-semibold text-slate-600 mb-2">Pajak (PPN %)</label>
                                <select id="so_tax_rate" onchange="recalcSOTotal()" class="w-full border-none rounded-xl px-4 py-3 bg-slate-100 font-bold text-slate-800 focus:ring-2 focus:ring-blue-500/10 outline-none transition-all cursor-pointer">
                                    <option value="0" ${qtToConvert ? (qtToConvert.taxRate == 0 ? 'selected' : '') : (CONFIG.taxRate == 0 ? 'selected' : '')}>0% (Tanpa Pajak)</option>
                                    <option value="11" ${qtToConvert ? (qtToConvert.taxRate == 11 ? 'selected' : '') : ((CONFIG.taxRate == 11 || !CONFIG.taxRate) ? 'selected' : '')}>11% (PPN)</option>
                                </select>
                            </div>
                        </div>
                    </div>

                    <!-- Items Card -->
                    <div class="bg-white rounded-3xl p-8 border border-slate-100 shadow-sm">
                        <h3 class="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-6 flex items-center gap-2">
                            <i class="fas fa-list-ul text-blue-600"></i> Daftar Item Produk
                        </h3>

                        <div class="bg-slate-50/50 p-6 rounded-2xl border border-slate-100 flex flex-wrap gap-4 mb-8">
                            <div class="flex-1 min-w-[300px] relative">
                                <label class="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Pilih Produk</label>
                                <input type="text" id="so_inv_item_search" placeholder="-- Cari Kode atau Nama Produk --" autocomplete="off"
                                    onclick="toggleItemProductDropdown('so')" readonly
                                    class="w-full border-2 border-slate-100 rounded-xl px-4 py-2.5 text-sm bg-white font-bold text-slate-700 outline-none transition-all focus:border-blue-500 cursor-pointer">
                                <input type="hidden" id="so_inv_item"> <!-- Will store ID -->
                                
                                <div id="so_inv_item_dropdown" class="absolute left-0 mt-2 w-full bg-white border border-slate-100 rounded-2xl shadow-2xl z-[200] hidden overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                                    <div class="p-3 border-b border-slate-50">
                                        <input type="text" id="so_inv_item_dropdown_search" placeholder="Ketik kode atau nama..." onkeyup="filterItemProductList('so', this.value)" class="w-full px-4 py-2 bg-slate-50 border-none rounded-lg text-xs font-bold outline-none focus:ring-2 focus:ring-blue-500/20">
                                    </div>
                                    <div class="max-h-60 overflow-y-auto p-1" id="so_inv_item_list">
                                        <!-- Items here -->
                                    </div>
                                    <div class="p-2 border-t border-slate-50 bg-slate-50/10 space-y-1">
                                        <button onclick="renderMasterProducts()" class="w-full flex items-center gap-3 px-4 py-2.5 text-[10px] font-black text-slate-500 hover:bg-slate-50 hover:text-slate-900 rounded-xl transition-all uppercase tracking-widest">
                                            <div class="w-7 h-7 flex items-center justify-center bg-slate-100 rounded-lg">
                                                <i class="fas fa-plus text-[10px]"></i>
                                            </div>
                                            Create a new Product
                                        </button>
                                        <button onclick="openAdvancedProductSearch('so')" class="w-full flex items-center gap-3 px-4 py-2.5 text-[10px] font-black text-slate-500 hover:bg-slate-50 hover:text-slate-900 rounded-xl transition-all uppercase tracking-widest">
                                            <div class="w-7 h-7 flex items-center justify-center bg-slate-100 rounded-lg">
                                                <i class="fas fa-search text-[10px]"></i>
                                            </div>
                                            Advanced Search
                                        </button>
                                    </div>
                                </div>
                                <div id="so_inv_stock_info" class="text-[10px] mt-2 hidden"></div>
                            </div>
                            <div class="w-32">
                                <label class="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Quantity</label>
                                <input type="number" id="so_item_qty" placeholder="0" class="w-full border-2 border-slate-100 rounded-xl px-4 py-2.5 text-sm font-bold text-slate-700 outline-none transition-all focus:border-blue-500">
                            </div>
                            <div class="w-48">
                                <label class="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Rate (Harga)</label>
                                <input type="number" id="so_item_price" placeholder="0.00" class="w-full border-2 border-slate-100 rounded-xl px-4 py-2.5 text-sm font-bold text-slate-700 outline-none transition-all focus:border-blue-500">
                            </div>
                            <div class="flex items-end">
                                <button type="button" onclick="addSOItemRow()" class="h-[46px] px-6 bg-blue-600 hover:bg-blue-700 text-white rounded-xl flex items-center justify-center gap-2 shadow-lg transition-all active:scale-95 text-[10px] font-black uppercase tracking-widest">
                                    <i class="fas fa-plus"></i> Tambah
                                </button>
                            </div>
                        </div>
                        
                        <div class="overflow-hidden border border-slate-100 rounded-2xl shadow-sm">
                            <table class="w-full text-sm text-left border-collapse">
                                <thead>
                                    <tr class="bg-gray-50/50 border-b border-slate-100 text-slate-500 font-bold text-[10px] uppercase tracking-widest">
                                        <th class="py-4 px-6 w-12 text-center"></th>
                                        <th class="py-4 px-6 w-12 text-center">No.</th>
                                        <th class="py-4 px-2">Item Description</th>
                                        <th class="py-4 px-6 text-right">Qty</th>
                                        <th class="py-4 px-6 text-right">Rate</th>
                                        <th class="py-4 px-6 text-right">Total</th>
                                        <th class="py-4 px-6 w-12 text-center"><i class="fas fa-cog"></i></th>
                                    </tr>
                                </thead>
                                <tbody id="so_items_list" class="divide-y divide-slate-50"></tbody>
                            </table>
                        </div>

                        <!-- Notes & Totals Grid -->
                        <div class="grid grid-cols-1 lg:grid-cols-2 gap-12 mt-10 p-4">
                            <div>
                                <label class="block text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-3 ml-1">Keterangan / Internal Notes</label>
                                <textarea id="so_notes" class="w-full border-2 border-slate-50 rounded-2xl px-5 py-4 text-sm h-32 focus:border-blue-500 outline-none transition-all bg-slate-50/50 placeholder:text-slate-300 font-medium leading-relaxed" placeholder="Tambahkan catatan khusus untuk order ini...">${qtToConvert?.notes || ''}</textarea>
                            </div>

                            <div class="space-y-4 pt-2">
                                <div class="flex justify-between items-center px-4">
                                    <span class="text-slate-400 font-bold uppercase text-[10px] tracking-widest">Net Amount (DPP):</span>
                                    <span id="so_dpp_display" class="font-bold text-slate-700 text-lg">Rp 0</span>
                                </div>
                                <div class="flex justify-between items-center px-4" id="so_tax_row">
                                    <span class="text-orange-400 font-bold uppercase text-[10px] tracking-widest" id="so_tax_label">Tax (PPN 11%):</span>
                                    <span id="so_tax_display" class="font-bold text-orange-600 text-lg">Rp 0</span>
                                </div>
                                <div class="h-px bg-slate-100 mx-4 mt-4"></div>
                                <div class="flex justify-between items-center px-4 pt-4">
                                    <span class="text-slate-900 font-black uppercase text-[11px] tracking-[0.2em]">Grand Total:</span>
                                    <span id="so_total_display" class="font-black text-slate-900 text-4xl tracking-tighter">Rp 0</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;

    setTimeout(() => {
        if (qtToConvert) {
            // Ambil data dari master Customer
            const cust = db.findById('customers', defaultCustId);
            if (cust) {
                // Set Pajak dari Customer
                const taxEl = document.getElementById('so_tax_rate');
                if (taxEl && cust.ppn !== undefined) {
                    taxEl.value = String(cust.ppn);
                }
                // Set Term Pembayaran dari Customer
                const termEl = document.getElementById('so_payment_terms');
                if (termEl && cust.paymentTerm) {
                    termEl.value = cust.paymentTerm;
                }
            }
            refreshSOItemsTable();
        }
        if(window.recalcSOTotal) recalcSOTotal();
        if(window.updateSODueDate) updateSODueDate();
    }, 100);
};


window.updateSODueDate = () => {
    const soDateVal = document.getElementById('so_date')?.value;
    const term = document.getElementById('so_payment_terms')?.value;
    const dueDateInput = document.getElementById('so_due_date');
    if (!soDateVal || !term || !dueDateInput) return;

    let days = 0;
    if (term === 'Cash') days = 0;
    else if (term === 'Tempo 7 S/d 10 Hari') days = 10;
    else if (term === '30 Hari') days = 30;
    else if (term === '45 Hari') days = 45;

    const date = new Date(soDateVal);
    date.setDate(date.getDate() + days);
    dueDateInput.value = date.toISOString().split('T')[0];
};

window.updateSONumberPreview = () => {
    const isTax = document.getElementById('so_is_tax').value === 'true';
    document.getElementById('so_number').value = generateSONumber(isTax);

    // Sync Tax Rate with Prefix
    const taxRateEl = document.getElementById('so_tax_rate');
    if (taxRateEl && !window._editingSOId) {
        if (isTax && taxRateEl.value === '0') {
            taxRateEl.value = '11';
            if (window.recalcSOTotal) recalcSOTotal();
        } else if (!isTax && taxRateEl.value !== '0') {
            taxRateEl.value = '0';
            if (window.recalcSOTotal) recalcSOTotal();
        }
    }
};

window.onSOItemSelect = () => {
    const sel = document.getElementById('so_inv_item');
    const opt = sel?.selectedOptions[0];
    const info = document.getElementById('so_inv_stock_info');
    if (!opt?.value) { if (info) info.classList.add('hidden'); return; }
    const stock = parseFloat(opt.dataset.stock) || 0;
    const unit = opt.dataset.unit || '';
    if (info) {
        info.classList.remove('hidden');
        info.innerHTML = `<i class="fas fa-info-circle mr-1"></i>Stok tersedia: <strong>${formatNumber(stock)} ${unit}</strong>`;
        info.className = `text-[10px] mt-3 mb-2 ${stock <= 0 ? 'text-red-600' : 'text-blue-600'} font-bold`;
    }
};

window.onQTItemSelect = () => {
    // Pricing is manual now per requirement
};

window.onSalesCustomerSelect = async (selectId, mode) => {
    const custId = document.getElementById(selectId).value;
    console.log(`[Debug] Selecting customer for ${mode}, ID: ${custId}`);
    if (!custId) return;
    
    // Force a sync for this specific customer record to be sure
    await db.sync('customers');
    
    const cust = db.findById('customers', custId);
    console.log(`[Debug] Customer data found:`, cust);
    if (!cust) return;

    // Set PPN
    const taxRateEl = document.getElementById(mode === 'QT' ? 'qt_tax_rate' : 'so_tax_rate');
    if (taxRateEl) {
        // Robust check for PPN: check cust.ppn, then cust.tax_rate, fallback to 11 if both are invalid (null/undefined)
        let ppnVal = 11;
        if (cust.ppn !== undefined && cust.ppn !== null && cust.ppn !== '') {
            ppnVal = parseInt(cust.ppn);
        } else if (cust.tax_rate !== undefined && cust.tax_rate !== null && cust.tax_rate !== '') {
            ppnVal = parseInt(cust.tax_rate);
        }
        
        // Final sanity check: if value is not 0 or 11, default to 11 to avoid blank dropdown
        if (isNaN(ppnVal) || (ppnVal !== 0 && ppnVal !== 11)) {
            ppnVal = 11;
        }

        taxRateEl.value = ppnVal.toString();
        console.log(`[Debug] Set PPN to: ${ppnVal}`);
        if (mode === 'SO' && window.recalcSOTotal) recalcSOTotal();
        if (mode === 'QT' && window.refreshQTItemsTable) refreshQTItemsTable();
    }

    // Set Payment Terms (for SO and QT)
    const pTerm = cust.paymentTerm || cust.payment_term;
    console.log(`[Debug] Payment term found: ${pTerm}`);
    if (mode === 'SO') {
        const termEl = document.getElementById('so_payment_terms');
        if (termEl && pTerm) {
            termEl.value = pTerm;
            console.log(`[Debug] Set SO Payment Term to: ${pTerm}`);
            if(window.updateSODueDate) updateSODueDate();
        }
    } else if (mode === 'QT') {
        const termEl = document.getElementById('qt_payment_term');
        if (termEl && pTerm) {
            termEl.value = pTerm;
            console.log(`[Debug] Set QT Payment Term to: ${pTerm}`);
        }
    }

    // Set Common Products & Special Prices (otomatis tanpa konfirmasi)
    const cProds = cust.commonProducts || cust.common_products;
    console.log(`[Debug] Common products found:`, cProds);
    if (cProds && Array.isArray(cProds) && cProds.length > 0) {
        const inventory = db.read('inventoryItems');
        const newItems = [];
        
        for (const cp of cProds) {
            const i = inventory.find(x => x.id == cp.itemId || x.id == cp.item_id);
            if (i) {
                newItems.push({
                    id: Date.now().toString() + Math.random().toString(36).substr(2, 5),
                    inventoryItemId: i.id,
                    itemCode: i.itemCode || '',
                    productId: null,
                    prodText: i.itemName,
                    prodUnit: i.unit || 'Kg',
                    qty: 1,
                    price: parseFloat(cp.price) || 0,
                    subtotal: parseFloat(cp.price) || 0
                });
            }
        }
        
        console.log(`[Debug] Final items to load:`, newItems);

        if (mode === 'QT') {
            window.tempQTItems = newItems;
            if(window.refreshQTItemsTable) refreshQTItemsTable();
        } else if (mode === 'SO') {
            window.tempSOItems = newItems;
            if(window.refreshSOItemsTable) refreshSOItemsTable();
        }
        showToast('Produk & harga khusus berhasil dimuat.', 'success');
    } else {
        console.log(`[Debug] No common products to load for this customer.`);
    }
};

window.toggleItemProductDropdown = function (prefix) {
    let dropId = `${prefix}_item_dropdown`;
    // Compatibility for older hardcoded prefixes
    if (prefix === 'so') dropId = 'so_inv_item_dropdown';
    
    const dropdown = document.getElementById(dropId);
    if (!dropdown) return;
    const isOpen = !dropdown.classList.contains('hidden');
    
    // Close other dropdowns
    document.querySelectorAll('[id$="_dropdown"]').forEach(el => {
        if (el.id !== dropdown.id) el.classList.add('hidden');
    });

    if (!isOpen) {
        dropdown.classList.remove('hidden');
        let searchId = `${prefix}_item_dropdown_search`;
        if (prefix === 'so') searchId = 'so_inv_item_dropdown_search';
        
        const searchInput = document.getElementById(searchId);
        if (searchInput) { searchInput.value = ''; searchInput.focus(); }
        filterItemProductList(prefix, '');
        
        // Add click-outside to close handler
        const closeHandler = (e) => {
            if (dropdown.parentElement && !dropdown.parentElement.contains(e.target)) {
                dropdown.classList.add('hidden');
                document.removeEventListener('click', closeHandler);
            }
        };
        setTimeout(() => document.addEventListener('click', closeHandler), 10);
    }
};

window.filterItemProductList = function (prefix, val) {
    let containerId = `${prefix}_item_list`;
    if (prefix === 'so') containerId = 'so_inv_item_list';
    if (prefix === 'cust_cp') containerId = 'cust_cp_list_results'; // Match the ID in Customer template

    const container = document.getElementById(containerId);
    if (!container) return;
    const search = val.toLowerCase();
    const allItems = db.read('inventoryItems') || [];
    
    let products;
    if (prefix === 'rfq' || prefix === 'po') {
        const catInput = document.getElementById(prefix + '_category');
        const selectedCat = catInput ? catInput.value : '';
        if (!selectedCat) {
            container.innerHTML = `
                <div class="px-5 py-8 text-center flex flex-col items-center gap-3">
                    <div class="w-12 h-12 rounded-full bg-slate-50 flex items-center justify-center text-slate-300 shadow-inner">
                        <i class="fas fa-exclamation-circle text-xl"></i>
                    </div>
                    <div class="text-[10px] font-black text-slate-400 uppercase tracking-widest">Pilih Kategori Terlebih Dahulu</div>
                </div>
            `;
            return;
        }

        const catMap = {
            'Bahan Baku': 'RAW_MATERIAL',
            'Packaging': 'PACKAGING',
            'Perlengkapan': 'SUPPLIES',
            'Service': 'SERVICE',
            'Sparepart': 'SPAREPART',
            'Aktiva ( tetap )': 'ASSET',
            'Gas': 'GAS'
        };
        const targetInternalCat = catMap[selectedCat];

        // For purchasing: strictly show products matching selected category OR if no category mapping found but category matches literally
        products = allItems.filter(i => {
            if (i.status === 'INACTIVE') return false;
            return i.category === targetInternalCat || i.category === selectedCat;
        });
    } else {
        // For sales: show finished goods
        products = allItems.filter(i => {
            const cat = (i.category || '').toUpperCase();
            return (cat.includes('FINISH') || cat.includes('JADI') || cat.includes('FG')) && i.status !== 'INACTIVE';
        });
    }
    
    container.innerHTML = products
        .filter(p => (p.itemName || '').toLowerCase().includes(search) || (p.itemCode || '').toLowerCase().includes(search))
        .map(p => {
            const stk = db.getInventoryStock(p.id);
            const priceDisplay = (prefix === 'rfq' || prefix === 'po') ? '' : `<div class="text-[9px] text-slate-400 font-bold">${formatCurrency(p.sellingPrice || 0)}</div>`;
            return `
                <div onclick="selectItemProduct('${prefix}', '${p.id}', '${p.itemCode} - ${p.itemName.replace(/'/g, "\\'")}',${ prefix === 'rfq' ? 0 : (p.sellingPrice || 0)}, '${p.unit || 'PCS'}', ${stk})" 
                    class="px-4 py-3 text-xs font-bold text-slate-600 hover:bg-blue-50 hover:text-blue-600 rounded-xl cursor-pointer transition-colors m-0.5">
                    <div class="flex justify-between items-center">
                        <div class="flex flex-col gap-0.5">
                            <span class="text-slate-800">${p.itemName}</span>
                            <span class="text-[9px] text-slate-300 uppercase font-black tracking-widest">${p.itemCode}</span>
                        </div>
                        <div class="text-right">
                             <div class="text-[9px] text-blue-500 font-black uppercase">Stock: ${stk}</div>
                             ${priceDisplay}
                        </div>
                    </div>
                </div>
            `;
        }).join('') || '';
    
    // Add "Use as Free Text" option if there is search text
    if (search.length > 0) {
        container.innerHTML = `
            <div onclick="selectItemFreeText('${prefix}')" 
                class="px-4 py-3 bg-blue-50/50 hover:bg-blue-100/50 border-b border-blue-100/50 mb-1 cursor-pointer transition-all">
                <div class="flex items-center gap-3">
                    <div class="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center shadow-md">
                        <i class="fas fa-keyboard text-xs"></i>
                    </div>
                    <div>
                        <div class="text-[10px] font-black text-blue-600 uppercase tracking-widest">Gunakan Teks Bebas</div>
                        <div class="text-[11px] font-bold text-slate-700 italic">"${val}"</div>
                    </div>
                </div>
            </div>
            ${container.innerHTML}
        `;
    }

    if (!container.innerHTML) {
        container.innerHTML = '<div class="px-5 py-8 text-center text-[10px] font-bold text-slate-300 italic uppercase tracking-widest">Produk tidak ditemukan</div>';
    }
};

window.selectItemFreeText = function (prefix) {
    if (prefix === 'qt') {
        const val = document.getElementById('qt_item_dropdown_search').value;
        document.getElementById('qt_item_name').value = '';
        document.getElementById('qt_item_search').value = val;
        document.getElementById('qt_item_dropdown').classList.add('hidden');
        document.getElementById('qt_item_qty').focus();
    } else if (prefix === 'rfq') {
        const val = document.getElementById('rfq_item_dropdown_search').value;
        document.getElementById('rfq_item_id').value = '';
        document.getElementById('rfq_item_search').value = val;
        document.getElementById('rfq_item_dropdown').classList.add('hidden');
        document.getElementById('rfq_item_qty').focus();
    } else if (prefix === 'po') {
        const val = document.getElementById('po_item_dropdown_search').value;
        document.getElementById('po_inv_item').value = '';
        document.getElementById('po_item_search').value = val;
        document.getElementById('po_item_dropdown').classList.add('hidden');
        document.getElementById('po_qty').focus();
    } else {
        const val = document.getElementById('so_inv_item_dropdown_search').value;
        document.getElementById('so_inv_item').value = '';
        document.getElementById('so_inv_item_search').value = val;
        document.getElementById('so_inv_item_dropdown').classList.add('hidden');
        document.getElementById('so_inv_stock_info').classList.add('hidden');
        document.getElementById('so_item_qty').focus();
    }
};

window.openAdvancedProductSearch = function (prefix, subId = null) {
    if (prefix === 'qt') document.getElementById('qt_item_dropdown')?.classList.add('hidden');
    else if (prefix === 'rfq') document.getElementById('rfq_item_dropdown')?.classList.add('hidden');
    else if (prefix === 'po') document.getElementById('po_item_dropdown')?.classList.add('hidden');
    else if (prefix === 'so') document.getElementById('so_inv_item_dropdown')?.classList.add('hidden');
    else if (prefix === 'cust_cp') document.getElementById('cust_cp_item_dropdown')?.classList.add('hidden');
    else if (prefix === 'sj_kosong' && subId) document.getElementById(`doi_dropdown_${subId}`)?.classList.add('hidden');

    const allItems = db.read('inventoryItems') || [];
    let products;

    if (prefix === 'rfq') {
        const catInput = document.getElementById('rfq_category');
        const selectedCat = catInput ? catInput.value : '';
        if (!selectedCat) {
            showToast('Pilih Kategori Terlebih Dahulu', 'warning');
            return;
        }

        const catMap = {
            'Bahan Baku': 'RAW_MATERIAL',
            'Packaging': 'PACKAGING',
            'Perlengkapan': 'SUPPLIES',
            'Service': 'SERVICE',
            'Sparepart': 'SPAREPART',
            'Aktiva ( tetap )': 'ASSET',
            'Gas': 'GAS'
        };
        const targetInternalCat = catMap[selectedCat];

        products = allItems.filter(i => i.status !== 'INACTIVE' && i.category === targetInternalCat);
    } else {
        products = allItems.filter(i => {
            const cat = (i.category || '').toUpperCase();
            return (cat.includes('FINISH') || cat.includes('JADI') || cat.includes('FG')) && i.status !== 'INACTIVE';
        });
    }

    const body = `
        <div class="space-y-6">
            <div class="relative">
                <i class="fas fa-search absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"></i>
                <input type="text" id="adv_prod_search_input" onkeyup="filterAdvancedProductTable()" placeholder="Cari Nama atau Kode Produk..." 
                    class="w-full pl-12 pr-4 py-4 bg-slate-50 border-none rounded-2xl text-sm font-bold text-slate-700 outline-none focus:ring-4 focus:ring-blue-500/10 transition-all">
            </div>

            <div class="bg-white rounded-2xl border border-slate-100 overflow-hidden shadow-sm">
                <table class="w-full text-left border-collapse">
                    <thead>
                        <tr class="bg-slate-50/50 border-b border-slate-50">
                            <th class="py-4 px-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Kode Produk</th>
                            <th class="py-4 px-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Nama Produk</th>
                            <th class="py-4 px-6 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Stok</th>
                            <th class="py-4 px-6 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Aksi</th>
                        </tr>
                    </thead>
                    <tbody id="adv_prod_table_body">
                        ${products.map(p => {
                            const stock = db.getInventoryStock(p.id);
                            return `
                            <tr class="border-b border-slate-50 hover:bg-slate-50/50 transition-colors group">
                                <td class="py-4 px-6 text-xs font-bold text-slate-400 font-mono tracking-tight">${p.itemCode}</td>
                                <td class="py-4 px-6 text-sm font-black text-slate-700">${p.itemName}</td>
                                <td class="py-4 px-6 text-sm font-bold text-slate-500 text-right"><span class="px-2 py-0.5 bg-slate-100 rounded text-[10px] font-black">${stock} ${p.unit}</span></td>
                                <td class="py-4 px-6 text-right">
                                    <button onclick="selectProductFromAdvanced('${prefix}', '${p.id}', '${p.itemName.replace(/'/g, "\\'")}', '${p.sellingPrice || 0}', '${p.unit}', '${stock}', '${subId || ''}')" 
                                        class="px-5 py-2 bg-blue-600 hover:bg-slate-900 text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shadow-md active:scale-95">
                                        Pilih
                                    </button>
                                </td>
                            </tr>
                            `;
                        }).join('')}
                    </tbody>
                </table>
            </div>
        </div>
    `;

    showModal('Advanced Product Search', body, `<button onclick="closeModal()" class="px-8 py-2 bg-slate-900 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-800 transition-all">Close</button>`, 'lg');
};

window.filterAdvancedProductTable = () => {
    const q = document.getElementById('adv_prod_search_input').value.toLowerCase();
    const rows = document.querySelectorAll('#adv_prod_table_body tr');
    rows.forEach(row => {
        const text = row.innerText.toLowerCase();
        row.style.display = text.includes(q) ? '' : 'none';
    });
};

window.selectProductFromAdvanced = (prefix, id, name, price, unit, stock, subId) => {
    if (prefix === 'sj_kosong') {
        const actualId = subId || window._currentBlankDOFocusId;
        if (typeof selectBlankDOProduct === 'function') {
            selectBlankDOProduct(actualId, name, unit);
        }
    } else {
        selectItemProduct(prefix, id, name, price, unit, stock);
    }
    closeModal();
};

window.selectItemProduct = function (prefix, id, displayText, price, unit, stock) {
    if (prefix === 'qt') {
        document.getElementById('qt_item_name').value = id;
        document.getElementById('qt_item_search').value = displayText;
        document.getElementById('qt_item_price').value = price;
        document.getElementById('qt_item_dropdown').classList.add('hidden');
        document.getElementById('qt_item_qty').focus();
    } else if (prefix === 'rfq') {
        document.getElementById('rfq_item_id').value = id;
        document.getElementById('rfq_item_search').value = displayText;
        document.getElementById('rfq_item_dropdown').classList.add('hidden');
        document.getElementById('rfq_item_qty').focus();
    } else if (prefix === 'po') {
        document.getElementById('po_inv_item').value = id;
        document.getElementById('po_item_search').value = displayText;
        document.getElementById('po_unit').value = unit;
        document.getElementById('po_price').value = price;
        document.getElementById('po_item_dropdown').classList.add('hidden');
        document.getElementById('po_qty').focus();
    } else if (prefix === 'cust_cp') {
        document.getElementById('cust_cp_item').value = id;
        document.getElementById('cust_cp_label').innerText = displayText;
        document.getElementById('cust_cp_label').classList.remove('text-slate-400');
        document.getElementById('cust_cp_label').classList.add('text-slate-800', 'font-bold');
        document.getElementById('cust_cp_price').value = price;
        document.getElementById('cust_cp_item_dropdown').classList.add('hidden');
    } else {
        document.getElementById('so_inv_item').value = id;
        document.getElementById('so_inv_item_search').value = displayText;
        document.getElementById('so_item_price').value = price;
        document.getElementById('so_inv_item_dropdown').classList.add('hidden');
        
        const stockInfo = document.getElementById('so_inv_stock_info');
        if (stockInfo) {
            stockInfo.innerHTML = `<span class="px-3 py-1 bg-blue-50 text-blue-600 rounded-lg font-black uppercase tracking-widest border border-blue-100">Stock tersedia: ${stock} ${unit}</span>`;
            stockInfo.classList.remove('hidden');
        }
        
        document.getElementById('so_item_qty').focus();
    }
};

window.addSOItemRow = () => {
    const inventoryItemId = document.getElementById('so_inv_item').value;
    const searchVal = document.getElementById('so_inv_item_search').value;
    
    let prodText = searchVal;
    let prodUnit = 'PCS';
    
    if (inventoryItemId) {
        const p = db.findById('inventoryItems', inventoryItemId);
        if (p) {
            prodText = p.itemName;
            prodUnit = p.unit || 'PCS';
        }
    }

    const qty = parseFloat(document.getElementById('so_item_qty').value);
    const price = parseFloat(document.getElementById('so_item_price').value);

    if (!prodText) { showToast('Pilih produk atau ketik nama produk', 'error'); return; }
    if (!qty || !price) { showToast('Qty dan Harga Jual harus diisi', 'error'); return; }

    const subtotal = qty * price;
    window.tempSOItems.push({ 
        id: Date.now().toString(), 
        inventoryItemId, 
        productId: null, 
        prodText, 
        prodUnit, 
        qty, 
        price, 
        subtotal 
    });

    document.getElementById('so_inv_item').value = '';
    document.getElementById('so_inv_item_search').value = '';
    document.getElementById('so_item_qty').value = '';
    document.getElementById('so_item_price').value = '';
    
    const info = document.getElementById('so_inv_stock_info');
    if (info) info.classList.add('hidden');
    
    refreshSOItemsTable();
};

window.editSOItemRow = (itemId) => {
    const item = window.tempSOItems.find(i => i.id === itemId);
    if (!item) return;
    document.getElementById('so_inv_item').value = item.inventoryItemId || '';
    document.getElementById('so_inv_item_search').value = item.prodText;
    document.getElementById('so_item_qty').value = item.qty;
    document.getElementById('so_item_price').value = item.price;
    window.tempSOItems = window.tempSOItems.filter(i => i.id !== itemId);
    refreshSOItemsTable();
    document.getElementById('so_item_qty').focus();
    document.getElementById('so_item_qty').select();
};

window.removeSOItemRow = (itemId) => {
    if(!confirm('Hapus item ini dari daftar?')) return;
    window.tempSOItems = window.tempSOItems.filter(i => i.id !== itemId);
    refreshSOItemsTable();
};

window.refreshSOItemsTable = () => {
    const tbody = document.getElementById('so_items_list');
    let total = 0;
    
    if (window.tempSOItems.length === 0) {
        tbody.innerHTML = `<tr><td colspan="7" class="py-10 text-center text-slate-400 italic bg-slate-50/30">Belum ada item ditambahkan</td></tr>`;
    } else {
        tbody.innerHTML = window.tempSOItems.map((item, idx) => {
            total += item.subtotal;
            return `
                    <tr class="hover:bg-slate-50/50 transition-colors">
                        <td class="py-3 px-4 w-12"><input type="checkbox" class="rounded border-slate-300"></td>
                        <td class="py-3 px-2 text-slate-400 text-center">${idx + 1}</td>
                        <td class="py-3 px-4 font-bold text-slate-800">${item.itemCode || item.prodText.split(' (')[0]}</td>
                        <td class="py-3 px-4 text-right font-bold text-slate-700">${formatNumber(item.qty)} ${item.prodUnit || ''}</td>
                        <td class="py-3 px-4 text-right font-bold text-slate-700">${formatNumber(item.price)}</td>
                        <td class="py-3 px-4 text-right text-slate-500">${formatNumber(item.subtotal)}</td>
                        <td class="py-3 px-4 text-center">
                            <div class="flex items-center justify-center gap-2">
                                <button type="button" class="w-7 h-7 flex items-center justify-center bg-blue-50 text-blue-500 hover:bg-blue-600 hover:text-white rounded-lg transition-all" onclick="editSOItemRow('${item.id}')" title="Edit Item">
                                    <i class="fas fa-pencil-alt text-[10px]"></i>
                                </button>
                                <button type="button" class="w-7 h-7 flex items-center justify-center bg-red-50 text-red-400 hover:bg-red-500 hover:text-white rounded-lg transition-all" onclick="removeSOItemRow('${item.id}')" title="Hapus Item">
                                    <i class="fas fa-trash text-[10px]"></i>
                                </button>
                            </div>
                        </td>
                    </tr>
                `;
        }).join('');
    }
    // Store raw total
    window._soRawTotal = total;
    recalcSOTotal();
};

window.recalcSOTotal = () => {
    const dpp = window._soRawTotal || 0;
    const sel = document.getElementById('so_tax_rate');
    const taxValue = sel ? sel.value : '11';
    const taxPct = parseFloat(taxValue) || 0;
    const fmt = v => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(v);

    const dppAfterDisc = dpp;
    const taxAmt = Math.round(dppAfterDisc * taxPct / 100);
    const grand = dppAfterDisc + taxAmt;

    if (document.getElementById('so_dpp_display')) document.getElementById('so_dpp_display').innerText = fmt(dpp);
    if (document.getElementById('so_tax_display')) document.getElementById('so_tax_display').innerText = fmt(taxAmt);
    if (document.getElementById('so_tax_label')) document.getElementById('so_tax_label').innerText = `PPN (${taxPct}%):`;
    if (document.getElementById('so_total_display')) document.getElementById('so_total_display').innerText = fmt(grand);

    if (taxRow) taxRow.style.display = taxPct === 0 ? 'none' : 'flex';

    // Sync SO Number Type (A/B) with Tax
    const taxTypeEl = document.getElementById('so_is_tax');
    if (taxTypeEl && !window._editingSOId) {
        const shouldBeTax = taxPct > 0;
        if (taxTypeEl.value !== String(shouldBeTax)) {
            taxTypeEl.value = String(shouldBeTax);
            if (window.updateSONumberPreview) updateSONumberPreview();
        }
    }

    // Store computed values
    window._soDiscountAmt = 0;
    window._soDiscountDesc = '';
    window._soDiscountType = '';
    window._soDiscountValue = '';
};



window.saveNewSO = async () => {
    if (window.tempSOItems.length === 0) { showToast('SO harus memiliki minimal 1 item', 'error'); return; }

    const soNumberInitial = document.getElementById('so_number')?.value;
    const isTax = document.getElementById('so_is_tax')?.value === 'true';
    const customerId = document.getElementById('so_customer_id')?.value;
    const soDate = document.getElementById('so_date')?.value;
    const salesName = document.getElementById('so_sales_name')?.value;
    const paymentTerms = document.getElementById('so_payment_terms')?.value;
    const dueDate = document.getElementById('so_due_date')?.value;
    const taxRateRaw = document.getElementById('so_tax_rate')?.value;

    if (!customerId) { showToast('Pilih Customer', 'error'); return; }
    if (!soDate) { showToast('Pilih Tanggal SO', 'error'); return; }
    if (!salesName) { showToast('Isi Nama Sales', 'error'); return; }
    if (!paymentTerms) { showToast('Pilih Term Pembayaran', 'error'); return; }
    if (!dueDate) { showToast('Pilih Tanggal Jatuh Tempo', 'error'); return; }
    if (taxRateRaw === undefined || taxRateRaw === '') { showToast('Pilih Pajak', 'error'); return; }

    // Recalculate number at save to ensure shared sequence is up to date
    let soNumber = soNumberInitial;
    const existing = db.read('salesOrders') || [];
    if (existing.some(s => s.soNumber === soNumberInitial)) {
        soNumber = generateSONumber(isTax);
    }

    const taxRate = window._soTaxRate || parseFloat(taxRateRaw) || 0;
    const taxLabel = document.getElementById('so_tax_rate')?.selectedOptions[0]?.text || `${taxRate}%`;
    const dpp = window.tempSOItems.reduce((sum, item) => sum + item.subtotal, 0);
    const notes = document.getElementById('so_notes')?.value || '';
    const taxAmount = window._soTaxAmount || Math.round(dpp * taxRate / 100);
    const totalAmount = dpp + taxAmount;

    await db.insert('salesOrders', {
        soNumber,
        quotationId: window._qtBeingConverted || null,
        date: new Date(soDate).toISOString(),
        salesName: salesName || '-',
        isTax,
        customerId,
        paymentTerms,
        dueDate: dueDate ? new Date(dueDate).toISOString() : null,
        taxRate: taxRate,
        taxLabel,
        taxAmount,
        dpp,
        discountType: '',
        discountValue: '',
        discountAmount: 0,
        discountDescription: '',
        status: 'DRAFT',
        totalAmount,
        items: window.tempSOItems,
        notes
    });

    if (window._qtBeingConverted) {
        await db.update('salesQuotations', window._qtBeingConverted, { status: 'SO_CREATED' });
        window._qtBeingConverted = null;
    }

    // Reset discount state
    window._soDiscountAmt = 0;
    window._soDiscountDesc = '';
    window._soDiscountType = '';
    window._soDiscountValue = '';

    showToast('SO Draft berhasil disimpan');
    
    // BACK TO LIST
    renderSalesOrders();
};


window.updateSOStatus = async (id, newStatus) => {
    try {
        if (newStatus === 'CONFIRMED') {
            // Use Phase 2 API for Atomic Transaction (creates Journal + updates Status)
            await api.approveSalesOrder(id);
            
            // Optimistic UI update
            db.update('salesOrders', id, { status: 'CONFIRMED' });
            
            if (typeof addNotification === 'function') {
                const so = db.findById('salesOrders', id);
                addNotification(
                    'Pesanan Baru Siap Kirim',
                    `SO ${so ? so.soNumber : id} telah di-konfirmasi Sales. Siap diproses kirim.`
                );
            }
        } else {
            // Fallback for other statuses (DRAFT, dll) via Hybrid Sync
            db.update('salesOrders', id, { status: newStatus });
        }
        
        showToast(`SO status updated to ${newStatus} `);
        renderSalesOrders();
    } catch (err) {
        showToast(err.message, 'error');
    }
};

// Fungsi pengiriman SO dihapus dari Sales. Dialihkan ke Inventory (Surat Jalan/Pengiriman).

window.deleteSO = (id) => {
    if (confirm('Yakin hapus SO ini?')) {
        db.delete('salesOrders', id);
        renderSalesOrders();
    }
}

window.viewSO = (id) => {
    const so = db.findById('salesOrders', id);
    const customer = db.findById('customers', so.customerId);
    const mainContent = document.getElementById('main-content');
    
    // Set breadcrumb
    renderBreadcrumb(['Sales', 'Sales Orders', 'Detail ' + so.soNumber]);

    const printableHTML = `
           <div class="max-w-5xl mx-auto bg-white p-6 sm:p-10 print:p-2 shadow-sm border border-slate-100 print:border-none rounded-3xl print:rounded-none my-6 print:m-0" id="print-internal-header">
                <div class="flex justify-between items-start mb-10">
                    <div>
                        <h2 class="text-4xl font-black text-slate-900 tracking-tight">SALES ORDER</h2>
                        <p class="text-slate-400 mt-2 font-mono text-lg">${so.soNumber}</p>
                    </div>
                    <div class="flex items-start gap-4">
                        ${CONFIG.logo ? `<img src="${CONFIG.logo}" alt="Logo" class="h-16 w-auto object-contain">` : ''}
                        <div class="text-right">
                            <h1 class="text-xl font-black text-slate-900 uppercase tracking-tight">${CONFIG.companyName}</h1>
                            <p class="text-xs text-slate-400 max-w-xs ml-auto leading-relaxed mt-1">${CONFIG.companyAddress}</p>
                        </div>
                    </div>
                </div>
                
                <div class="grid grid-cols-2 gap-12 mb-8 print:mb-4">
                    <div class="space-y-4">
                        <h3 class="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Customer</h3>
                        <div class="p-5 bg-slate-50 rounded-2xl border border-slate-100">
                            <p class="font-black text-slate-900 text-lg mb-1">${customer ? customer.name : '-'}</p>
                            ${customer && customer.phone ? `<p class="text-sm font-bold text-slate-500">${customer.phone}</p>` : ''}
                            
                            ${(() => {
                                if (!customer) return '';
                                const bill = customer.address ? customer.address.trim() : '';
                                const ship = customer.shippingAddress ? customer.shippingAddress.trim() : '';
                                
                                if (!bill && !ship) return '';
                                
                                if (bill.toLowerCase() === ship.toLowerCase() || (bill && !ship) || (!bill && ship)) {
                                    const combined = bill || ship;
                                    return `
                                    <div class="mt-4 pt-4 border-t border-slate-200">
                                        <p class="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1 shadow-sm px-2 py-1 bg-white inline-block rounded-md border border-slate-100">Shipping & Billing Address</p>
                                        <p class="text-sm text-slate-600 leading-relaxed font-medium italic mt-1">${combined}</p>
                                    </div>`;
                                } else {
                                    return `
                                    <div class="mt-4 pt-4 border-t border-slate-200">
                                        <p class="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1 shadow-sm px-2 py-1 bg-white inline-block rounded-md border border-slate-100">Billing Address</p>
                                        <p class="text-xs text-slate-600 leading-relaxed font-medium italic mt-1 mb-3">${bill}</p>
                                        
                                        <p class="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1 shadow-sm px-2 py-1 bg-white inline-block rounded-md border border-slate-100">Shipping Address</p>
                                        <p class="text-xs text-slate-600 leading-relaxed font-medium italic mt-1">${ship}</p>
                                    </div>`;
                                }
                            })()}
                        </div>
                    </div>
                    <div class="text-right space-y-4">
                        <h3 class="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Order Logistics</h3>
                        <div class="space-y-2">
                             <div class="flex justify-end gap-4 items-center">
                                <span class="text-xs font-bold text-slate-400">TANGGAL SO:</span>
                                <span class="text-sm font-black text-slate-800 uppercase">${formatDate(so.date).slice(0, 11)}</span>
                            </div>
                            <div class="flex justify-end gap-4 items-center">
                                <span class="text-xs font-bold text-slate-400">SALES:</span>
                                <span class="text-sm font-black text-slate-600 uppercase italic">${so.salesName || '-'}</span>
                            </div>
                            <div class="flex justify-end gap-4 items-center">
                                <span class="text-xs font-bold text-slate-400">TERM:</span>
                                <span class="text-sm font-black text-slate-800 uppercase">${so.paymentTerms || '-'}</span>
                            </div>
                            <div class="flex justify-end gap-4 items-center mt-4">
                                <span class="text-[10px] font-black px-4 py-1.5 rounded-full bg-slate-900 text-white uppercase tracking-widest shadow-lg">${so.status}</span>
                            </div>
                        </div>
                    </div>
                </div>

                ${so.notes ? `
                <div class="mb-12 p-6 bg-slate-50 rounded-3xl border border-slate-100 relative overflow-hidden">
                    <div class="absolute top-0 left-0 w-1.5 h-full bg-blue-500"></div>
                    <h3 class="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2">Keterangan / Internal Notes</h3>
                    <p class="text-sm text-slate-700 leading-relaxed font-medium whitespace-pre-wrap">${so.notes}</p>
                </div>
                ` : ''}
                
                <table class="w-full text-left mb-8 print:mb-4 border-collapse">
                    <thead>
                        <tr class="bg-slate-50 text-slate-500 text-[10px] uppercase font-black tracking-widest border-y border-slate-100 print:bg-white">
                            <th class="py-5 px-4 font-black print:py-2">Item Description</th>
                            <th class="py-5 px-4 text-right font-black print:py-2">Quantity</th>
                            <th class="py-5 px-4 text-right font-black print:py-2">Rate</th>
                            <th class="py-5 px-4 text-right font-black print:py-2">Total</th>
                        </tr>
                    </thead>
                    <tbody class="text-slate-700">
                        ${so.items.map(i => `
                            <tr class="border-b border-slate-50 hover:bg-slate-50/50 transition-colors group">
                                <td class="py-6 px-4 print:py-2">
                                    <div class="font-black text-slate-900 text-sm group-hover:text-blue-600 transition-colors uppercase">${i.prodText.split(' (')[0]}</div>
                                    <div class="text-[9px] text-slate-300 font-bold uppercase tracking-widest mt-0.5">Stock Item: ${i.inventoryItemId?.slice(0, 8) || 'N/A'}</div>
                                </td>
                                <td class="py-6 px-4 text-right font-black text-slate-800 print:py-2">${formatNumber(i.qty)}</td>
                                <td class="py-6 px-4 text-right font-bold text-slate-500 print:py-2">${formatCurrency(i.price)}</td>
                                <td class="py-6 px-4 text-right font-black text-slate-900 print:py-2">${formatCurrency(i.subtotal)}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                    <tfoot class="bg-slate-50/20">
                        <tr>
                            <td colspan="3" class="py-4 px-4 text-right text-[10px] font-black text-slate-400 uppercase tracking-widest">Net Value (DPP)</td>
                            <td class="py-4 px-4 text-right text-sm font-black text-slate-800">${formatCurrency(so.dpp || so.totalAmount)}</td>
                        </tr>
                        ${so.taxAmount > 0 ? `
                        <tr>
                            <td colspan="3" class="py-4 px-4 text-right text-[10px] font-black text-orange-400 uppercase tracking-widest">Tax Provision (${so.taxRate || 11}%)</td>
                            <td class="py-4 px-4 text-right text-sm font-black text-orange-600">${formatCurrency(so.taxAmount)}</td>
                        </tr>
                        ` : ''}
                        <tr>
                            <td colspan="2"></td>
                            <td class="py-4 px-4 text-right font-black text-slate-400 uppercase tracking-[0.2em] text-[10px]">Total Order Amount</td>
                            <td class="py-4 px-4 text-right font-black text-blue-700 text-3xl tracking-tighter border-t-2 border-slate-900">
                                ${formatCurrency(so.totalAmount)}
                            </td>
                        </tr>
                    </tfoot>
                </table>
           </div>
        `;

    mainContent.innerHTML = `
        <div class="animate-in fade-in slide-in-from-bottom-2 duration-400 -m-6 h-[calc(100vh-64px)] flex flex-col overflow-hidden bg-white">
            <!-- Record Header / Action Bar (STICKY AREA) -->
            <div class="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200 px-8 py-5 flex items-center justify-between shrink-0 shadow-sm">
                <div class="flex items-center gap-6">

                    <div>
                    </div>
                </div>
                
                <div class="flex items-center gap-3">
                    <button onclick='printHTML(\`${printableHTML.replace(/`/g, "\\`").replace(/\n/g, "")}\`, "Sales Order ${so.soNumber}")' 
                        class="px-6 py-2.5 bg-slate-100 text-slate-700 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-200 transition-all flex items-center gap-2 active:scale-95">
                        <i class="fas fa-file-pdf text-slate-400"></i> Print / Save PDF
                    </button>
                    <button onclick="openSendSOModal('${so.id}')" 
                        class="px-6 py-2.5 bg-blue-50 text-blue-600 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-blue-600 hover:text-white transition-all flex items-center gap-2 active:scale-95 shadow-sm">
                        <i class="fas fa-paper-plane mr-1 text-[9px]"></i> Kirim Dokumen
                    </button>
                    <div class="w-px h-6 bg-slate-200 mx-2"></div>
                    <button onclick="renderSalesOrders()" class="px-6 py-2.5 bg-slate-900 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-black transition-all shadow-xl active:scale-95 group">
                        Tutup Order <i class="fas fa-times ml-2 text-slate-400 group-hover:text-white"></i>
                    </button>
                </div>
            </div>

            <!-- Scrollable Content Area -->
            <div class="flex-1 overflow-y-auto bg-slate-50/50 custom-scrollbar pb-24">
                ${printableHTML}
            </div>
        </div>
    `;
};

// --- Create Invoice Logic ---
window.generateInvoiceNumber = (isTax, customDate = null) => {
    const invoices = db.read('salesInvoices') || [];
    const date = customDate ? new Date(customDate) : new Date();
    const month = date.getMonth() + 1;
    const year = date.getFullYear();
    const romanMonth = romanize(month);
    const type = isTax ? 'A' : 'B';

    let maxSeq = 0;
    invoices.forEach(inv => {
        if (!inv.invoiceNumber) return;
        const parts = inv.invoiceNumber.split('/');
        if (parts.length < 3) return;
        
        if (parts[1] === romanMonth && parts[2] === String(year)) {
            const prefixParts = parts[0].split('-');
            if (prefixParts.length >= 3 && prefixParts[1] === type) {
                const seq = parseInt(prefixParts[2]);
                if (!isNaN(seq) && seq > maxSeq) maxSeq = seq;
            }
        }
    });

    let nextSeq = maxSeq + 1;
    let finalNumber = `INV-${type}-${String(nextSeq).padStart(3, '0')}/${romanMonth}/${year}`;
    
    while (invoices.some(inv => inv.invoiceNumber === finalNumber)) {
        nextSeq++;
        finalNumber = `INV-${type}-${String(nextSeq).padStart(3, '0')}/${romanMonth}/${year}`;
    }

    return finalNumber;
};

window.openInvoiceModal = (soId = null, customerId = null) => {
    // Hide list, show form view
    const listView = document.getElementById('si-list-view');
    const formView = document.getElementById('si-form-view');
    if (!listView || !formView) {
        // Fallback for direct navigation if views aren't ready
        renderSalesInvoices();
        setTimeout(() => openInvoiceModal(soId, customerId), 100);
        return;
    }

    renderBreadcrumb(['Sales', 'Sales Invoices', 'Buat Sales Invoice']);

    // Langsung render form ke main-content agar tidak ada konten tembus
    const mainContent = document.getElementById('main-content');
    mainContent.innerHTML = `<div id="si-list-view" class="hidden"></div><div id="si-form-view" class="w-full"></div>`;
    const newFormView = document.getElementById('si-form-view');

    const allSOs = db.read('salesOrders') || [];
    const invoices = db.read('salesInvoices') || [];
    const customers = db.read('customers') || [];

    let so = soId ? db.findById('salesOrders', soId) : null;
    const initialCustomer = (so ? (customers.find(c => c.id === so.customerId)) : (customerId ? db.findById('customers', customerId) : null)) || null;
    
    // Filter valid SOs for the initial SO if provided
    const relatedDO = so ? db.read('deliveryOrders').find(d => d.salesOrderId === so.id && d.status === 'SHIPPED') : null;
    const isSOTaxed = so ? (parseFloat(so.taxAmount) || 0) > 0 : false;
    const defaultTaxRate = isSOTaxed ? 11 : 0;
    const initialInvNumber = generateInvoiceNumber(isSOTaxed);

    let itemsPreview = '<tr><td colspan="5" class="py-16 text-center text-slate-400 italic bg-white flex flex-col items-center justify-center border-2 border-dashed border-slate-100 rounded-3xl m-8"><div class="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-4"><i class="fas fa-file-invoice text-2xl"></i></div><p class="font-bold uppercase tracking-widest text-[10px]">Silakan pilih Customer & Sales Order terlebih dahulu...</p></td></tr>';
    if (so) {
        itemsPreview = (so.items || []).map(item => {
            const doItem = relatedDO ? relatedDO.items.find(di => di.inventoryItemId === item.inventoryItemId) : null;
            const kemasan = doItem?.kemasan || '-';
            const colly = doItem?.colly || '-';
            return `
                <tr class="border-t hover:bg-slate-50/50 transition-colors">
                    <td class="px-8 py-5">
                        <div class="text-sm font-bold text-slate-800">${item.prodText}</div>
                        ${kemasan !== '-' ? `<div class="text-[10px] text-slate-400 font-bold uppercase tracking-wide mt-1">Kemasan: ${kemasan}</div>` : ''}
                    </td>
                    <td class="px-8 py-5 text-center font-black text-sm text-blue-600">${colly}</td>
                    <td class="px-8 py-5 text-right text-sm font-bold text-slate-700">${formatNumber(item.qty)} ${item.prodUnit}</td>
                    <td class="px-8 py-5 text-right text-sm font-mono font-bold text-slate-500">${formatCurrency(item.price || 0)}</td>
                    <td class="px-8 py-5 text-right text-sm font-black font-mono text-slate-900 bg-slate-50/30">${formatCurrency(item.subtotal || 0)}</td>
                </tr>
            `;
        }).join('');
    }

    const baseSubtotal = so ? (so.items || []).reduce((sum, item) => sum + (parseFloat(item.subtotal) || 0), 0) : 0;
    let defaultDiscType = so ? so.discountType || '' : '';
    let defaultDiscValue = so ? so.discountValue || '' : '';
    let inheritedDiscountAmount = so ? so.discountAmount || 0 : 0;

    newFormView.innerHTML = `
        <div class="animate-in fade-in duration-300 flex flex-col bg-white" style="height: calc(100vh - 64px); overflow: hidden;">
            <!-- Header / Action Bar -->
            <div class="border-b border-slate-200 px-8 py-5 flex items-center justify-between shrink-0" style="background: #ffffff; box-shadow: 0 1px 3px rgba(0,0,0,0.06);">
                <div class="flex items-center gap-6">
                    <div class="flex flex-col">
                        <h2 class="text-lg font-black text-slate-800 tracking-tight flex items-center gap-3 uppercase">
                            <span class="w-1.5 h-6 bg-blue-600 rounded-full"></span>
                            BUAT <span class="text-blue-600">SALES INVOICE</span>
                        </h2>
                    </div>
                </div>
                
                <div class="flex items-center gap-3">
                    <button onclick="renderSalesInvoices()" class="px-6 py-2.5 bg-slate-100 text-slate-500 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-200 transition-all active:scale-95">
                        Batal
                    </button>
                    <button onclick="saveNewInvoice()" class="px-8 py-2.5 bg-blue-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-blue-700 transition-all shadow-lg active:scale-95 flex items-center gap-2">
                        <i class="fas fa-check-circle text-[10px]"></i> Konfirmasi & Simpan Invoice
                    </button>
                </div>
            </div>

            <!-- Content Area - Scrollable -->
            <div class="flex-1 overflow-y-auto bg-slate-50/30 px-8 py-5 pb-32">
                <div class="w-full space-y-6">
                    
                    <input type="hidden" id="inv_so_id" value="${so ? so.id : ''}">
                    <input type="hidden" id="inv_customer_id" value="${so ? so.customerId : ''}">
                    <input type="hidden" id="inv_base_subtotal" value="${baseSubtotal}">

                    <!-- Section: Header Info -->
                    <div class="bg-white rounded-3xl px-8 py-6 border border-slate-100 shadow-sm space-y-6">
                        <div class="grid grid-cols-1 md:grid-cols-2 gap-10">
                            <!-- Customer Selection -->
                            <div class="space-y-3">
                                <label class="block text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Customer / Mitra Dagang <span class="text-red-400">*</span></label>
                                <div class="relative" id="inv_customer_container">
                                    <input type="text" id="inv_customer_search" value="${initialCustomer ? initialCustomer.name : '-- Pilih Customer --'}" readonly
                                        onclick="toggleCustomerDropdown('inv_customer_dropdown')"
                                        class="w-full border-none rounded-xl px-5 py-3.5 bg-slate-100/80 font-bold text-slate-800 shadow-sm focus:ring-4 focus:ring-blue-500/10 outline-none transition-all text-base cursor-pointer">
                                    
                                    <div id="inv_customer_dropdown" class="absolute left-0 mt-2 bg-white border border-slate-100 rounded-2xl shadow-2xl z-[200] hidden overflow-hidden animate-in fade-in zoom-in-95 duration-200 min-w-[320px]">
                                        <div class="max-h-60 overflow-y-auto p-1" id="inv_customer_list">
                                            ${customers.map(c => `
                                                <div onclick="selectCustomer('INV', '${c.id}', '${c.name.replace(/'/g, "\\'")}')" 
                                                    class="px-5 py-3 text-sm font-bold text-slate-700 hover:bg-blue-50 rounded-xl cursor-pointer transition-colors m-0.5 ${initialCustomer && initialCustomer.id === c.id ? 'bg-blue-50 text-blue-600' : ''}">
                                                    ${c.name}
                                                </div>
                                            `).join('')}
                                        </div>
                                        <div class="p-3 border-t border-slate-50 bg-slate-50/30 space-y-1.5 font-sans">
                                            <button type="button" onclick="openCustomerModal(null, 'INV'); toggleCustomerDropdown('inv_customer_dropdown')" 
                                                class="flex items-center gap-4 w-full px-5 py-2.5 text-sm text-slate-700 hover:bg-white hover:shadow-sm transition-all rounded-xl font-bold text-left group whitespace-nowrap">
                                                <div class="w-8 h-8 rounded-lg bg-white flex items-center justify-center text-slate-400 group-hover:bg-blue-600 group-hover:text-white transition-all shadow-sm shrink-0">
                                                    <i class="fas fa-plus text-xs"></i>
                                                </div>
                                                Create a new Customer
                                            </button>
                                            <button type="button" onclick="openAdvancedCustomerSearch('INV')" 
                                                class="flex items-center gap-4 w-full px-5 py-2.5 text-sm text-slate-700 hover:bg-white hover:shadow-sm transition-all rounded-xl font-bold text-left group whitespace-nowrap">
                                                <div class="w-8 h-8 rounded-lg bg-white flex items-center justify-center text-slate-400 group-hover:bg-blue-600 group-hover:text-white transition-all shadow-sm shrink-0">
                                                    <i class="fas fa-search text-xs"></i>
                                                </div>
                                                Advanced Search
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <!-- SO Selection -->
                            <div class="space-y-3">
                                <label class="block text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Referensi Sales Order (Selesai Kirim)</label>
                                <select id="inv_source_so" onchange="openInvoiceModal(this.value)" class="w-full border-none rounded-xl px-5 py-3.5 bg-slate-100/80 font-bold text-slate-800 shadow-sm focus:ring-4 focus:ring-blue-500/10 outline-none transition-all cursor-pointer text-base ${!initialCustomer ? 'opacity-50 pointer-events-none' : ''}">
                                    <option value="" disabled ${!so ? 'selected' : ''}>${initialCustomer ? '-- Pilih Sales Order (Status: Delivered) --' : '-- Pilih Customer Dahulu --'}</option>
                                    ${(() => {
                                        if (!initialCustomer) return '';
                                        const custSOs = allSOs.filter(s => {
                                            if (s.customerId !== initialCustomer.id) return false;
                                            if (s.status !== 'DELIVERED') return false;
                                            const hasInvoice = invoices.some(inv => inv.salesOrderId === s.id && inv.status !== 'CANCELLED');
                                            return !hasInvoice || s.id === (so?.id);
                                        });
                                        return custSOs.map(s => `<option value="${s.id}" ${soId === s.id ? 'selected' : ''}>SO-${s.soNumber} (${formatCurrency(s.totalAmount)})</option>`).join('');
                                    })()}
                                </select>
                            </div>
                        </div>

                        <div class="grid grid-cols-1 md:grid-cols-5 gap-6 pt-4">
                            <div class="space-y-3 max-w-[140px]">
                                <label class="block text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Nomor Faktur</label>
                                <input type="text" id="inv_number" value="${initialInvNumber}" class="w-full px-4 py-3.5 bg-slate-50 border-2 border-slate-50 rounded-xl font-bold text-slate-400 font-mono outline-none text-[11px]" readonly>
                            </div>
                            <div class="space-y-3">
                                <label class="block text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Tanggal <span class="text-red-400">*</span></label>
                                <input type="date" id="inv_date" value="${new Date().toISOString().split('T')[0]}" 
                                    onchange="updateInvDueDate(); if(!window._editingInvId) document.getElementById('inv_number').value = generateInvoiceNumber(document.getElementById('inv_tax_rate').value==='11', this.value)" 
                                    class="w-full px-4 py-3.5 bg-slate-100/80 border-2 border-transparent rounded-xl font-bold text-slate-800 focus:bg-white focus:border-blue-500 focus:ring-0 outline-none transition-all text-xs cursor-pointer">
                            </div>
                            <div class="space-y-3">
                                <label class="block text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Term</label>
                                <select id="inv_due_date_term" onchange="updateInvDueDate()" class="w-full px-4 py-3.5 bg-slate-100/80 border-2 border-transparent rounded-xl font-bold text-slate-800 focus:bg-white focus:border-blue-500 outline-none transition-all cursor-pointer text-xs">
                                    <option value="0">Cash (COD)</option>
                                    <option value="10" selected>Tempo 7-10 Hari</option>
                                    <option value="30">30 Hari</option>
                                    <option value="45">45 Hari</option>
                                </select>
                            </div>
                            <div class="space-y-3 text-red-600">
                                <label class="block text-[10px] font-black text-red-400 uppercase tracking-[0.2em] ml-1">Jatuh Tempo</label>
                                <input type="date" id="inv_due_date" class="w-full px-4 py-3 bg-red-50/50 border-2 border-transparent rounded-xl font-black text-red-700 focus:bg-white focus:border-red-500 outline-none transition-all text-xs cursor-pointer">
                            </div>
                            <div class="space-y-3">
                                <label class="block text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Pajak (PPN%)</label>
                                <select id="inv_tax_rate" onchange="refreshInvoiceCalculation(); if(!window._editingInvId) document.getElementById('inv_number').value = generateInvoiceNumber(this.value==='11', document.getElementById('inv_date').value)" class="w-full px-4 py-3.5 bg-slate-100/80 border-2 border-transparent rounded-xl font-bold text-slate-800 focus:bg-white focus:border-blue-500 outline-none transition-all cursor-pointer text-xs">
                                    <option value="0" ${defaultTaxRate === 0 ? 'selected' : ''}>0% (Non-PPN)</option>
                                    <option value="11" ${defaultTaxRate > 0 ? 'selected' : ''}>11% (PPN)</option>
                                </select>
                            </div>
                        </div>
                    </div>
                    
                    <!-- Section: Items Table -->
                    <div class="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden min-h-[300px] flex flex-col">
                        <div class="px-8 py-5 bg-slate-50/50 border-b border-slate-100 flex items-center justify-between">
                            <h4 class="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] flex items-center gap-3">
                                <i class="fas fa-list-ul text-blue-600"></i> Manifest Barang (Invoice)
                                ${so ? `<span class="bg-blue-600 text-white font-black px-3 py-1 rounded-lg italic tracking-tight text-[9px] transform -rotate-1 shadow-sm ml-2">Refer To SO-${so.soNumber}</span>` : ''}
                            </h4>
                        </div>
                        <div class="overflow-x-auto flex-1">
                            <table class="w-full text-sm text-left border-collapse">
                                <thead>
                                    <tr class="bg-slate-50/20 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 font-sans">
                                        <th class="px-8 py-4">Nama Produk / Deskripsi Item</th>
                                        <th class="px-8 py-4 text-center">Colly</th>
                                        <th class="px-8 py-4 text-right">Qty / Unit</th>
                                        <th class="px-8 py-4 text-right">Satuan Harga</th>
                                        <th class="px-8 py-4 text-right">Subtotal</th>
                                    </tr>
                                </thead>
                                <tbody class="divide-y divide-slate-50">
                                    ${itemsPreview}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    <!-- Section: Notes & Totals -->
                    <div class="grid grid-cols-1 lg:grid-cols-2 gap-12 items-start">
                        <!-- Notes -->
                        <div class="bg-white rounded-3xl p-8 border border-slate-100 shadow-sm space-y-4">
                            <label class="block text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Keterangan / Internal Payment Notes</label>
                            <textarea id="inv_notes" class="w-full px-8 py-6 bg-slate-50 border-2 border-slate-50 rounded-2xl text-slate-700 h-40 focus:bg-white focus:border-blue-500 outline-none transition-all resize-none shadow-inner font-medium text-base" placeholder="Tambahkan instruksi pembayaran, nomor rekening, atau catatan internal di sini..."></textarea>
                        </div>
                        
                        <!-- Totals Card -->
                        <div class="bg-white rounded-3xl p-10 border border-slate-100 shadow-2xl space-y-6 relative overflow-hidden group">
                           <div class="absolute top-0 right-0 w-48 h-48 bg-blue-50/50 rounded-full -mr-24 -mt-24 transition-transform group-hover:scale-110 duration-700"></div>
                            
                            <div class="space-y-4 relative z-10">
                                <div class="flex justify-between items-center px-2">
                                    <span class="text-xs font-black text-slate-400 uppercase tracking-[0.1em]">Total DPP (Subtotal):</span>
                                    <span class="font-black text-slate-800 text-xl font-mono">${formatCurrency(baseSubtotal)}</span>
                                </div>
                                
                                <div class="bg-slate-50/80 rounded-3xl p-8 border border-slate-100 space-y-5 shadow-inner">
                                    <!-- Subsidi Selector -->
                                    <div class="flex justify-between items-center gap-4">
                                        <div class="flex items-center gap-4 flex-wrap flex-1">
                                            <span class="text-[10px] font-black text-slate-400 uppercase tracking-widest min-w-[120px] w-auto lg:w-[140px]">Subsidi / Potongan:</span>
                                            <input type="text" id="inv_subsidy_desc" placeholder="Keterangan (Cth: Subsidi Countainer)" class="border-none rounded-xl px-3 py-1.5 text-[11px] font-black bg-white shadow-sm ring-1 ring-slate-100 outline-none hover:ring-blue-500 transition-all flex-1" oninput="refreshInvoiceCalculation()">
                                        </div>
                                        <div class="shrink-0 text-right">
                                            <input type="text" id="inv_subsidy_amount" placeholder="0" oninput="refreshInvoiceCalculation()" class="border-none ring-2 ring-blue-500/10 rounded-xl px-4 py-2 text-sm w-28 text-right font-black outline-none focus:ring-blue-500 shadow-sm bg-white">
                                        </div>
                                    </div>
                                    <div class="flex justify-between items-center text-orange-600 font-black px-2 text-sm" id="inv_subsidy_row" style="display:none">
                                        <span id="inv_subsidy_label" class="uppercase text-[10px] w-[140px]">Subsidi:</span>
                                        <span id="inv_subsidy_display" class="font-mono text-right">- Rp 0</span>
                                    </div>
                                    <div class="flex justify-between items-center px-2 text-slate-800 font-black text-sm" id="inv_subtotal_after_subsidy_row" style="display:none">
                                        <span class="uppercase text-[10px] tracking-widest text-slate-400">Jumlah:</span>
                                        <span id="inv_subtotal_after_subsidy_display" class="font-mono text-right text-base">Rp 0</span>
                                    </div>

                                    <div class="border-t border-slate-200/40 my-2" id="inv_subsidy_divider" style="display:none"></div>

                                    <!-- Discount Selector -->
                                    <div class="flex justify-between items-center gap-4">
                                        <div class="flex items-center gap-4 flex-wrap flex-1">
                                            <span class="text-[10px] font-black text-slate-400 uppercase tracking-widest min-w-[120px] w-auto lg:w-[140px]">Adjustment Discount:</span>
                                            <select id="inv_discount_type" onchange="refreshInvoiceCalculation()" class="border-none rounded-xl px-3 py-1.5 text-[11px] font-black bg-white shadow-sm ring-1 ring-slate-100 outline-none appearance-none hover:ring-blue-500 cursor-pointer transition-all">
                                                <option value="" ${!defaultDiscType ? 'selected' : ''}>Tanpa Diskon</option>
                                                <option value="cash" ${defaultDiscType === 'cash' ? 'selected' : ''}>Persentase (%)</option>
                                                <option value="cash_flat" ${defaultDiscType === 'cash_flat' ? 'selected' : ''}>Flat Amount (Rp)</option>
                                            </select>
                                        </div>
                                        <div id="inv_discount_detail" class="${!defaultDiscType ? 'hidden' : 'block'} shrink-0 text-right">
                                            <input type="text" id="inv_discount_value" value="${defaultDiscValue}" oninput="refreshInvoiceCalculation()" class="border-none ring-2 ring-blue-500/10 rounded-xl px-4 py-2 text-sm w-28 text-right font-black outline-none focus:ring-blue-500 shadow-sm bg-white">
                                        </div>
                                    </div>

                                    <div class="flex justify-between items-center text-emerald-600 font-black px-2 text-sm" id="inv_discount_row" style="display:${inheritedDiscountAmount > 0 ? 'flex' : 'none'}">
                                        <span id="inv_discount_label" class="uppercase text-[10px] w-[140px]">Potongan Khusus:</span>
                                        <span id="inv_discount_display" class="font-mono text-right">- ${formatCurrency(inheritedDiscountAmount)}</span>
                                    </div>
                                    
                                    <div class="border-t border-slate-200/40 my-2"></div>

                                    <!-- Tax Selector -->
                                    <div class="flex justify-between items-center gap-4">
                                       <div class="flex items-center gap-4 flex-wrap flex-1">
                                           <span id="inv_tax_label" class="text-[10px] font-black text-slate-400 uppercase tracking-widest min-w-[120px] w-auto lg:w-[140px]">Pajak Pertambahan Nilai:</span>
                                           <select id="inv_tax_rate" onchange="refreshInvoiceCalculation()" class="border-none rounded-xl px-3 py-1.5 text-[11px] font-black bg-white shadow-sm ring-1 ring-slate-100 outline-none cursor-pointer hover:ring-blue-500 transition-all">
                                               <option value="0" ${defaultTaxRate === 0 ? 'selected' : ''}>Non PPN (0%)</option>
                                               <option value="11" ${defaultTaxRate > 0 ? 'selected' : ''}>PPN Luar (11%)</option>
                                           </select>
                                       </div>
                                       <div class="flex items-center justify-end shrink-0" id="inv_tax_row">
                                           <span id="inv_tax_display" class="font-black text-orange-600 font-mono text-base">+ Rp 0</span>
                                       </div>
                                    </div>
                                </div>

                                <div class="pt-6 border-t border-slate-100 flex justify-between items-center px-2">
                                    <span class="text-slate-800 font-black text-xl uppercase tracking-tighter">TOTAL TAGIHAN:</span>
                                    <span id="inv_total_display" class="font-black text-blue-700 text-4xl font-mono tracking-tighter drop-shadow-sm transition-all duration-300">Rp 0</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;


    setTimeout(() => {
        refreshInvoiceCalculation();
        updateInvDueDate();
        // Scroll to top of content
        formView.scrollTop = 0;
    }, 100);
};


window.onInvCustomerSelect = (customerId) => {
    openInvoiceModal(null, customerId);
};

window.updateInvDueDate = () => {
    const invDateVal = document.getElementById('inv_date')?.value;
    const termDays = parseInt(document.getElementById('inv_due_date_term')?.value) || 0;
    const dueDateInput = document.getElementById('inv_due_date');
    if (!invDateVal || !dueDateInput) return;

    const date = new Date(invDateVal);
    date.setDate(date.getDate() + termDays);
    dueDateInput.value = date.toISOString().split('T')[0];
};

window.refreshInvoiceCalculation = () => {
    const baseSubtotal = parseFloat(document.getElementById('inv_base_subtotal').value) || 0;

    const discType = document.getElementById('inv_discount_type').value;
    const discVal = document.getElementById('inv_discount_value').value.trim();

    const discDetailContainer = document.getElementById('inv_discount_detail');
    if (!discType) {
        discDetailContainer.classList.add('hidden');
        document.getElementById('inv_discount_value').value = '';
    } else {
        discDetailContainer.classList.remove('hidden');
        discDetailContainer.classList.add('flex');
    }

    const subsidyDesc = document.getElementById('inv_subsidy_desc')?.value.trim() || 'Subsidi';
    const subsidyAmtStr = document.getElementById('inv_subsidy_amount')?.value.trim() || '0';
    const subsidyAmt = parseFloat(subsidyAmtStr.replace(/[^0-9]/g, '')) || 0;

    const subtotalAfterSubsidy = Math.max(0, baseSubtotal - subsidyAmt);

    let discAmt = 0;
    let discDesc = '';

    if (discType === 'cash' && discVal) {
        const pct = parseFloat(discVal) || 0;
        discAmt = Math.round(subtotalAfterSubsidy * pct / 100);
        discDesc = `Cash Disc. ${pct}%`;
    } else if (discType === 'cash_flat' && discVal) {
        discAmt = parseFloat(discVal.replace(/[^0-9]/g, '')) || 0;
        discDesc = 'Cash Discount';
    } else if (discType === 'other' && discVal) {
        discDesc = discVal;
        discAmt = 0;
    }

    const grandTotalBeforeTax = Math.max(0, subtotalAfterSubsidy - discAmt);

    const taxRateStr = document.getElementById('inv_tax_rate').value;
    const taxRate = parseFloat(taxRateStr) || 0;
    const isTax = taxRate > 0;
    const taxAmt = Math.round(grandTotalBeforeTax * taxRate / 100);

    const grandTotal = grandTotalBeforeTax + taxAmt;

    const discRow = document.getElementById('inv_discount_row');
    if (discAmt > 0) {
        discRow.style.display = 'flex';
        document.getElementById('inv_discount_label').innerText = discDesc + ':';
        document.getElementById('inv_discount_display').innerText = '- ' + formatCurrency(discAmt);
    } else {
        discRow.style.display = 'none';
    }

    const subsidyRow = document.getElementById('inv_subsidy_row');
    const subsidyDivider = document.getElementById('inv_subsidy_divider');
    const subtotalAfterRow = document.getElementById('inv_subtotal_after_subsidy_row');
    const subtotalAfterDisplay = document.getElementById('inv_subtotal_after_subsidy_display');

    if (subsidyRow && subsidyAmt > 0) {
        subsidyRow.style.display = 'flex';
        if(subsidyDivider) subsidyDivider.style.display = 'block';
        if(subtotalAfterRow) subtotalAfterRow.style.display = 'flex';
        if(subtotalAfterDisplay) subtotalAfterDisplay.innerText = formatCurrency(subtotalAfterSubsidy);
        document.getElementById('inv_subsidy_label').innerText = subsidyDesc + ':';
        document.getElementById('inv_subsidy_display').innerText = '- ' + formatCurrency(subsidyAmt);
    } else if (subsidyRow) {
        subsidyRow.style.display = 'none';
        if(subsidyDivider) subsidyDivider.style.display = 'none';
        if(subtotalAfterRow) subtotalAfterRow.style.display = 'none';
    }

    const nsfpRow = document.getElementById('inv_nsfp_row');
    if (isTax && nsfpRow) {
        nsfpRow.style.display = 'flex';
    } else if (nsfpRow) {
        nsfpRow.style.display = 'none';
        document.getElementById('inv_nsfp').value = '';
    }

    const invTaxRow = document.getElementById('inv_tax_row');
    if (invTaxRow) invTaxRow.style.display = taxRate === 0 ? 'none' : 'flex';
    const taxLabel = document.getElementById('inv_tax_label');
    if (taxLabel) taxLabel.innerText = `Tax / PPN (${taxRate}%):`;
    const taxDisplay = document.getElementById('inv_tax_display');
    if (taxDisplay) taxDisplay.innerText = '+ ' + formatCurrency(taxAmt);
    
    const totalDisplay = document.getElementById('inv_total_display');
    if (totalDisplay) totalDisplay.innerText = formatCurrency(grandTotal);

    const currentInvNumberEl = document.getElementById('inv_number');
    if (currentInvNumberEl) {
        currentInvNumberEl.value = generateInvoiceNumber(isTax);
    }

    window._invCalcState = {
        subsidyAmount: subsidyAmt,
        subsidyDescription: subsidyDesc,
        discountAmount: discAmt,
        discountType: discType,
        discountValue: discVal,
        discountDescription: discDesc,
        taxRate: taxRate,
        taxAmount: taxAmt,
        totalAmount: grandTotal,
        isTax: isTax,
        nsfp: isTax ? (document.getElementById('inv_nsfp')?.value.trim() || '') : ''
    };
};

window.saveNewInvoice = async () => {
    const soId = document.getElementById('inv_so_id').value;
    const so = db.findById('salesOrders', soId);
    if (!so) return;

    const invoiceNumber = document.getElementById('inv_number').value;
    const invDateStr = document.getElementById('inv_date').value;
    const dueDateStr = document.getElementById('inv_due_date')?.value;
    const notes = document.getElementById('inv_notes').value;

    if (!invDateStr || !dueDateStr) {
        showToast('Tanggal Transaksi dan Jatuh Tempo harus diisi', 'error');
        return;
    }

    const invDate = new Date(invDateStr);
    const dueDate = new Date(dueDateStr);

    const relatedDO = db.read('deliveryOrders').find(d => d.salesOrderId === so.id && d.status === 'SHIPPED');

    const calcState = window._invCalcState;
    if (!calcState) return;

    const existing = db.read('salesInvoices') || [];
    let finalInvoiceNumber = invoiceNumber;
    if (existing.some(i => i.invoiceNumber === invoiceNumber)) {
        finalInvoiceNumber = generateInvoiceNumber(calcState.isTax);
    }

    const inv = await db.insert('salesInvoices', {
        invoiceNumber: finalInvoiceNumber,
        salesOrderId: so.id,
        customerId: so.customerId,
        date: invDate.toISOString(),
        dueDate: dueDate.toISOString(),
        totalAmount: calcState.totalAmount,
        taxType: calcState.isTax ? 'Pajak' : 'Non-Pajak',
        taxRate: calcState.taxRate,
        taxAmount: calcState.taxAmount,
        discountType: calcState.discountType,
        discountValue: calcState.discountValue,
        discountAmount: calcState.discountAmount,
        discountDescription: calcState.discountDescription,
        subsidyAmount: calcState.subsidyAmount,
        subsidyDescription: calcState.subsidyDescription,
        nsfp: calcState.nsfp,
        notes: notes,
        status: 'UNPAID',
        items: so.items.map(i => {
            const doItem = relatedDO ? relatedDO.items.find(di => di.inventoryItemId === i.inventoryItemId) : null;
            return {
                ...i,
                kemasan: doItem?.kemasan || '-',
                colly: doItem?.colly || '-'
            };
        })
    });

    if (typeof db.addJournalEntry === 'function' && inv) {
        await db.addJournalEntry({
            date: inv.date,
            journalNo: inv.invoiceNumber,
            description: `Invoice Penjualan ${inv.invoiceNumber} (SO ${so.soNumber})`,
            referenceType: 'SALES_INVOICE',
            referenceId: inv.id,
            items: [
                { accountId: 'acc_ar', debit: inv.totalAmount, credit: 0 },
                { accountId: 'acc_sales', debit: 0, credit: (inv.totalAmount - inv.taxAmount) },
                ...(inv.taxAmount > 0 ? [{ accountId: 'acc_tax_payable', debit: 0, credit: inv.taxAmount }] : [])
            ]
        });
    }

    closeModal();
    showToast('Invoice berhasil dibuat secara manual!', 'success');
    navigateTo('sales-invoices');
};

// --- Sales Invoices Module ---
window.handleSIAction = (selectEl, id) => {
    const act = selectEl.value;
    if (!act) return;
    selectEl.value = ""; // Reset for next use
    
    if (act === 'view') viewInvoice(id);
    else if (act === 'print') window.printSalesInvoiceLandscape(id);
    else if (act === 'cancel') cancelInvoice(id);
};

window.onInvCustomerSelect = (customerId) => {
    openInvoiceModal(null, customerId);
};

window.filterSITable = () => {
    const q = (document.getElementById('si_global_search')?.value || '').toLowerCase();
    const rows = document.querySelectorAll('#si_main_table tbody tr');
    
    let sumTagihan = 0;
    let sumPaid = 0;

    rows.forEach(row => {
        const text = row.innerText.toLowerCase();
        const isVisible = text.includes(q);
        row.style.display = isVisible ? '' : 'none';
        
        if (isVisible) {
            sumTagihan += parseFloat(row.dataset.amount || 0);
            sumPaid += parseFloat(row.dataset.paid || 0);
        }
    });

    // Update Footer Values dynamically
    const footerTagihan = document.getElementById('si_footer_total_tagihan');
    const footerTerbayar = document.getElementById('si_footer_total_terbayar');
    const footerGrand = document.getElementById('si_footer_grand_total');
    
    if (footerTagihan) footerTagihan.innerText = formatCurrency(sumTagihan);
    if (footerTerbayar) footerTerbayar.innerText = formatCurrency(sumPaid);
    if (footerGrand) footerGrand.innerText = formatCurrency(sumTagihan - sumPaid);
};

window.toggleSIDateDropdown = () => {
    const d = document.getElementById('si_date_dropdown');
    d?.classList.toggle('hidden');
};

window.applySIHeaderDateFilter = () => {
    const s = document.getElementById('si_header_start')?.value;
    const e = document.getElementById('si_header_end')?.value;
    window.currentFilters.salesInvoices.start = s || '';
    window.currentFilters.salesInvoices.end = e || '';
    document.getElementById('si_date_dropdown')?.classList.add('hidden');
    renderSalesInvoices();
};

window.resetSIHeaderDateFilter = () => {
    window.currentFilters.salesInvoices.start = '';
    window.currentFilters.salesInvoices.end = '';
    document.getElementById('si_date_dropdown')?.classList.add('hidden');
    renderSalesInvoices();
};

window.toggleSelectAllSI = (master) => {
    const checkboxes = document.querySelectorAll(".si-row-checkbox");
    checkboxes.forEach(cb => {
        cb.checked = master.checked;
    });
};

function renderSalesInvoices() {
    document.getElementById('pageTitle').innerText = 'Sales Invoices';
    const mainContent = document.getElementById('main-content');
    
    // Setup List vs Form view containers
    mainContent.innerHTML = `
        <div id="si-list-view" class="h-full flex flex-col space-y-6 animate-in fade-in duration-500 font-sans">
            <!-- Filter & Action Bar (Fraction Style) -->
            <div class="bg-white border-b border-gray-100 shrink-0 z-40 shadow-[0_2px_15px_-3px_rgba(0,0,0,0.04)] rounded-3xl">
                <div class="flex flex-wrap md:flex-nowrap justify-between items-center px-8 py-5 gap-4">
                    <div class="flex items-center gap-4 flex-1">
                        <div class="flex-1 max-w-lg relative group">
                            <i class="fas fa-search absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-blue-500 transition-colors"></i>
                            <input type="text" id="si_global_search" onkeyup="filterSITable()" placeholder="Cari No. Invoice, Nama Customer, atau Tipe Faktur..." 
                                class="w-full pl-12 pr-6 py-3.5 bg-slate-50 border-none rounded-2xl text-sm font-bold text-slate-700 placeholder:text-slate-300 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all shadow-inner">
                        </div>
                        
                        <div class="relative">
                            <button onclick="toggleSIDateDropdown()" class="flex items-center bg-slate-50 border border-slate-200 rounded-lg overflow-hidden hover:bg-slate-100 transition-all shadow-sm h-[44px] group">
                                <span class="bg-slate-200/40 border-r border-slate-200 px-3 h-full flex items-center text-slate-500 transition-colors">
                                    <i class="fas fa-sort-amount-up text-sm"></i>
                                </span>
                                <span class="px-4 text-sm font-semibold text-blue-600">Date</span>
                                <span class="pr-3 text-slate-400">
                                    <i class="fas fa-chevron-down text-[11px]"></i>
                                </span>
                            </button>
                            
                            <div id="si_date_dropdown" class="absolute left-0 mt-3 w-80 bg-white border border-slate-100 rounded-3xl shadow-[0_20px_50px_-10px_rgba(0,0,0,0.1)] z-[200] hidden p-6 animate-in fade-in zoom-in-95 duration-200">
                                <h4 class="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
                                    <span class="w-1 h-3 bg-blue-600 rounded-full"></span> Date Range Filter
                                </h4>
                                <div class="space-y-4">
                                    <div class="grid grid-cols-2 gap-3 font-sans">
                                        <div>
                                            <label class="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Start Date</label>
                                            <input type="date" id="si_header_start" class="w-full border-2 border-slate-50 rounded-xl px-3 py-2 text-xs font-bold text-slate-700 bg-slate-50/50 outline-none focus:border-blue-500/20">
                                        </div>
                                        <div>
                                            <label class="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">End Date</label>
                                            <input type="date" id="si_header_end" class="w-full border-2 border-slate-50 rounded-xl px-3 py-2 text-xs font-bold text-slate-700 bg-slate-50/50 outline-none focus:border-blue-500/20">
                                        </div>
                                    </div>
                                    <div class="flex gap-2 pt-2 uppercase text-[10px] font-black tracking-[0.1em]">
                                        <button onclick="applySIHeaderDateFilter()" class="flex-1 bg-blue-600 text-white py-3 rounded-xl hover:bg-blue-700 shadow-lg shadow-blue-500/20 active:scale-95 transition-all">Apply Filter</button>
                                        <button onclick="resetSIHeaderDateFilter()" class="flex-1 bg-slate-100 text-slate-500 py-3 rounded-xl hover:bg-slate-200 active:scale-95 transition-all">Reset</button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div class="flex items-center gap-3">
                        <button onclick="openInvoiceModal()" class="bg-blue-600 hover:bg-slate-900 text-white px-6 py-2.5 rounded-xl transition-all text-[10px] font-black uppercase tracking-widest shadow-lg shadow-blue-600/10 active:scale-95 flex items-center gap-2">
                            <i class="fas fa-plus text-sm"></i> Buat Invoice
                        </button>
                    </div>
                </div>
            </div>

            <!-- Main Table Block (Premium Style) -->
            <div class="bg-white rounded-[32px] border border-slate-100 shadow-[0_10px_30px_-15px_rgba(0,0,0,0.05)] flex-1 flex flex-col min-h-0 overflow-hidden">
                <div class="overflow-x-auto flex-1 custom-scrollbar">
                    <table class="w-full text-sm text-left border-collapse" id="si_main_table">
                        <thead class="sticky top-0 z-20 bg-white/95 backdrop-blur-md shadow-sm">
                            <tr class="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] border-b border-slate-100">
                                <th class="py-6 px-10 w-12 text-center">
                                    <input type="checkbox" onchange="toggleSelectAllSI(this)" class="w-5 h-5 rounded-lg border-slate-200 text-blue-600 focus:ring-blue-500/20 cursor-pointer shadow-sm">
                                </th>
                                <th class="py-6 px-4">Informasi Faktur</th>
                                <th class="py-6 px-4">Tanggal Pelunasan</th>
                                <th class="py-6 px-4 text-right">Tagihan Bruto</th>
                                <th class="py-6 px-4 text-right">Sudah Bayar</th>
                                <th class="py-6 px-4 text-right">Sisa Hutang</th>
                                <th class="py-6 px-6 text-center">Status</th>
                                <th class="py-6 px-8 text-center">Aksi</th>
                            </tr>
                        </thead>
                        <tbody class="divide-y divide-slate-50 uppercase text-[10px] font-black">
                            <!-- Invoiced dynamically -->
                        </tbody>
                    </table>

                    <!-- Totals Summary Bar (Minimalist) -->
                    <div class="px-10 py-6 flex items-center justify-between border-t border-slate-50 bg-white rounded-b-[32px]">
                        <div>
                            <p class="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1 opacity-70">Total Outstanding</p>
                            <p class="text-2xl font-black font-mono tracking-tighter text-slate-800" id="si_footer_grand_total">Rp 0</p>
                        </div>
                        
                        <div class="flex gap-12 text-right items-center">
                            <div class="flex flex-col">
                                <span class="text-[10px] font-black text-slate-300 uppercase tracking-widest mb-1">Total Tagihan</span>
                                <span class="text-sm font-bold font-mono text-slate-500" id="si_footer_total_tagihan">Rp 0</span>
                            </div>
                            <div class="flex flex-col">
                                <span class="text-[10px] font-black text-slate-300 uppercase tracking-widest mb-1">Total Terbayar</span>
                                <span class="text-sm font-bold font-mono text-slate-500" id="si_footer_total_terbayar">Rp 0</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <div id="si-form-view" class="hidden w-full bg-slate-50 min-h-full">
            <!-- Form View Content -->
        </div>
    `;

    const tbody = mainContent.querySelector('#si_main_table tbody');
    const filters_data = window.currentFilters.salesInvoices || { start: '', end: '' };

    const invStatusOrder = { 'UNPAID': 0, 'PARTIAL': 1, 'PAID': 2 };
    let invoices = db.read('salesInvoices').sort((a, b) => {
        const sa = invStatusOrder[a.status] ?? 99;
        const sb = invStatusOrder[b.status] ?? 99;
        if (sa !== sb) return sa - sb;
        return new Date(b.date) - new Date(a.date);
    });
    const customers = db.read('customers');
    const payments = db.read('payments');

    // Filter Logic
    if (filters_data.start) {
        const d = new Date(filters_data.start); d.setHours(0,0,0,0);
        invoices = invoices.filter(x => new Date(x.date) >= d);
    }
    if (filters_data.end) {
        const d = new Date(filters_data.end); d.setHours(23,59,59,999);
        invoices = invoices.filter(x => new Date(x.date) <= d);
    }

    if (invoices.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="8" class="py-40 text-center">
                    <div class="flex flex-col items-center justify-center opacity-30 select-none">
                        <div class="w-24 h-24 bg-slate-100 rounded-full flex items-center justify-center mb-6">
                            <i class="fas fa-file-invoice text-4xl text-slate-400"></i>
                        </div>
                        <h3 class="text-lg font-black text-slate-600 uppercase tracking-[0.2em] mb-1">Data Tidak Ditemukan</h3>
                        <p class="text-xs font-bold text-slate-400 uppercase tracking-widest">Belum ada faktur yang tercatat atau cocok dengan filter</p>
                    </div>
                </td>
            </tr>
        `;
        return;
    }

    let pageTagihan = 0;
    let pagePaid = 0;

    tbody.innerHTML = invoices.map(inv => {
        const customer = customers.find(c => c.id === inv.customerId) || { name: 'Unknown Customer' };
        const invPayments = payments.filter(p => p.invoiceId === inv.id);
        const totalPaid = invPayments.reduce((sum, p) => sum + parseFloat(p.amount), 0);
        const balance = inv.totalAmount - totalPaid;

        pageTagihan += (parseFloat(inv.totalAmount) || 0);
        pagePaid += totalPaid;

        let statusBadge = '';
        if (inv.status === 'UNPAID') statusBadge = '<span class="px-4 py-1.5 bg-red-50 text-red-600 border border-red-100 rounded-xl text-[10px] font-black tracking-widest shadow-sm">UNPAID</span>';
        else if (inv.status === 'PAID') statusBadge = '<span class="px-4 py-1.5 bg-emerald-50 text-emerald-600 border border-emerald-100 rounded-xl text-[10px] font-black tracking-widest shadow-sm">PAID</span>';
        else if (inv.status === 'PARTIAL') statusBadge = '<span class="px-4 py-1.5 bg-blue-50 text-blue-600 border border-blue-100 rounded-xl text-[10px] font-black tracking-widest shadow-sm uppercase">Partial</span>';
        else if (inv.status === 'CANCELLED') statusBadge = '<span class="px-4 py-1.5 bg-slate-50 text-slate-400 border border-slate-100 rounded-xl text-[10px] font-bold tracking-widest uppercase">Cancelled</span>';

        return `
            <tr class="hover:bg-blue-50/20 transition-all group duration-300" data-amount="${inv.totalAmount}" data-paid="${totalPaid}">
                <td class="py-6 px-10 text-center">
                    <input type="checkbox" class="si-row-checkbox w-5 h-5 rounded-lg border-slate-200 text-blue-600 focus:ring-blue-500/10 cursor-pointer shadow-sm">
                </td>
                <td class="py-6 px-4">
                    <div class="flex flex-col">
                        <span class="font-black text-slate-800 tracking-tight text-sm">${inv.invoiceNumber}</span>
                        <span class="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">${customer.name}</span>
                    </div>
                </td>
                <td class="py-6 px-4">
                    <div class="flex flex-col">
                        <span class="text-xs font-bold text-slate-700">${new Date(inv.date).toLocaleDateString('id-ID', {day:'2-digit', month:'short', year:'numeric'})}</span>
                        <span class="text-[9px] font-black text-red-400 uppercase mt-0.5 italic">Jatuh Tempo: ${new Date(inv.dueDate).toLocaleDateString('id-ID', {day:'2-digit', month:'short'})}</span>
                    </div>
                </td>
                <td class="py-6 px-4 text-right font-black text-slate-900 font-mono text-sm tracking-tighter">${formatCurrency(inv.totalAmount)}</td>
                <td class="py-6 px-4 text-right font-bold text-emerald-600 font-mono text-sm tracking-tighter">${formatCurrency(totalPaid)}</td>
                <td class="py-6 px-4 text-right font-black ${balance > 0 ? 'text-red-500' : 'text-slate-400'} font-mono text-sm tracking-tighter">${formatCurrency(balance)}</td>
                <td class="py-6 px-6 text-center">${statusBadge}</td>
                <td class="py-6 px-8 text-right relative font-sans">
                    <div class="inline-block relative w-full md:w-[130px]">
                        <select onchange="handleSIAction(this, '${inv.id}')" class="w-full bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 font-bold text-xs rounded-lg pl-3 pr-8 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer appearance-none transition-all shadow-sm">
                            <option value="" disabled selected>Pilih Aksi...</option>
                            <option value="view">Lihat Detail</option>
                            <option value="print">Cetak Invoice</option>
                            <option value="cancel">Batalkan SI</option>
                        </select>
                        <div class="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3 text-slate-400">
                            <i class="fas fa-chevron-down text-[10px]"></i>
                        </div>
                    </div>
                </td>
            </tr>
        `;
    }).join('');

    // Re-apply search filter and update totals
    filterSITable();
}

window.openInvoiceFromSOSelectorModal = () => {
    const salesOrders = db.read('salesOrders') || [];
    const invoices = db.read('salesInvoices') || [];
    const customers = db.read('customers') || [];

    // Filter valid SOs (Only Delivered, not fully invoiced yet)
    let validSOs = salesOrders.filter(so => {
        if (so.status !== 'DELIVERED') return false;
        // Check if there's already an invoice for this SO
        const hasInvoice = invoices.some(inv => inv.salesOrderId === so.id && inv.status !== 'CANCELLED');
        return !hasInvoice;
    });

    if (validSOs.length === 0) {
        showToast('Tidak ada Sales Order (Status Delivered) yang bisa dibuatkan Invoice.', 'error');
        return;
    }

    const soOptions = validSOs.map(so => {
        const customer = customers.find(c => c.id === so.customerId) || { name: 'Unknown' };
        return `<option value="${so.id}">SO-${so.soNumber} - ${customer.name} (${formatCurrency(so.totalAmount)})</option>`;
    }).join('');

    const body = `
        <div class="space-y-4">
            <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">Pilih Sales Order</label>
                <select id="selector_so_id" class="w-full border border-gray-300 rounded px-3 py-2 bg-white">
                    <option value="" disabled selected>Pilih SO...</option>
                    ${soOptions}
                </select>
            </div>
        </div>
    `;

    const footer = `
        <button type="button" onclick="const soId = document.getElementById('selector_so_id').value; if(soId) { closeModal(); setTimeout(() => openInvoiceModal(soId), 200); } else { showToast('Pilih SO terlebih dahulu', 'error'); }" class="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-purple-600 text-white font-medium focus:outline-none sm:ml-3 sm:w-auto sm:text-sm">Lanjut Buat</button>
        <button type="button" onclick="closeModal()" class="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-gray-700 font-medium sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm">Batal</button>
    `;

    showModal('Pilih Sales Order untuk Invoice', body, footer);
};

window.cancelInvoice = (id) => {
    if (confirm('Yakin ingin membatalkan invoice ini?')) {
        db.update('salesInvoices', id, { status: 'CANCELLED' });
        showToast('Invoice dibatalkan');
        renderSalesInvoices();
    }
};

window.printSalesInvoiceLandscape = function(id) {
    const inv = db.findById('salesInvoices', id);
    if (!inv) return;
    const so = db.findById('salesOrders', inv.salesOrderId);
    const customer = db.findById('customers', inv.customerId);

    const cfg = JSON.parse(localStorage.getItem('unityerp_company_config') || '{}');
    const company = {
        name: cfg.companyName || (typeof CONFIG !== 'undefined' ? CONFIG.companyName : 'PT. NAMA PERUSAHAAN'),
        address: cfg.companyAddress || (typeof CONFIG !== 'undefined' ? CONFIG.companyAddress : 'Jl. Alamat Perusahaan'),
        phone: cfg.companyPhone || (typeof CONFIG !== 'undefined' ? CONFIG.companyPhone : '-'),
        email: cfg.companyEmail || (typeof CONFIG !== 'undefined' ? CONFIG.companyEmail : '-'),
        logo: cfg.logo || (typeof CONFIG !== 'undefined' ? CONFIG.logo : '')
    };

    const itemsTable = `
        <table style="width:100%;border-collapse:collapse;margin-top:10px; margin-bottom:10px;">
            <thead>
                <tr style="background:#f1f5f9;border-bottom:2px solid #334155;">
                    <th style="padding:6px 8px;text-align:center;font-size:10px;text-transform:uppercase;width:40px">No</th>
                    <th style="padding:6px 8px;text-align:left;font-size:10px;text-transform:uppercase">Deskripsi Barang</th>
                    <th style="padding:6px 8px;text-align:center;font-size:10px;text-transform:uppercase;width:70px">Qty</th>
                    <th style="padding:6px 8px;text-align:right;font-size:10px;text-transform:uppercase;width:100px">Harga (Rp)</th>
                    <th style="padding:6px 8px;text-align:right;font-size:10px;text-transform:uppercase;width:120px">Total (Rp)</th>
                </tr>
            </thead>
            <tbody>
                ${(inv.items || []).map((item, i) => `
                    <tr style="border-bottom:1px solid #e2e8f0;">
                        <td style="padding:4px 8px;text-align:center;font-size:10px;">${i+1}</td>
                        <td style="padding:4px 8px;text-align:left;font-size:10px;">
                            <div style="font-weight:bold;text-transform:uppercase">${item.prodText ? item.prodText.split(' (')[0] : (item.name || '-')}</div>
                            ${item.kemasan && item.kemasan !== '-' ? `<div style="font-size:8px;color:#64748b;font-style:italic;margin-top:2px;">Kemasan: ${item.kemasan === '800 Gram' ? '4 KG (800 Gram)' : item.kemasan}</div>` : ''}
                        </td>
                        <td style="padding:4px 8px;text-align:center;font-size:11px;font-weight:900">${(item.qty || 0).toLocaleString('id-ID')}</td>
                        <td style="padding:4px 8px;text-align:right;font-size:11px;font-weight:500;">${formatCurrency(item.price)}</td>
                        <td style="padding:4px 8px;text-align:right;font-size:11px;font-weight:bold;">${formatCurrency(item.subtotal)}</td>
                    </tr>
                `).join('')}
                 ${[...Array(Math.max(0, 5 - (inv.items?.length || 0)))].map(() => `
                    <tr style="border-bottom:1px solid #e2e8f0;height:20px">
                        <td style="padding:4px 8px;">&nbsp;</td><td style="padding:4px 8px;"></td><td style="padding:4px 8px;"></td><td style="padding:4px 8px;"></td><td style="padding:4px 8px;"></td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
    `;

    const baseSubtotal = (inv.items || []).reduce((sum, item) => sum + (parseFloat(item.subtotal) || 0), 0);
    const subtotalAfterSubsidy = Math.max(0, baseSubtotal - (inv.subsidyAmount || 0));

    const totalsBlock = `
        <table style="width: 250px; border-collapse:collapse; font-size:10px; margin-left: auto;">
            <tr>
                <td style="padding:3px; text-align:right; color:#64748b; font-weight:bold;">Jumlah:</td>
                <td style="padding:3px; text-align:right; font-weight:bold;">${formatCurrency(baseSubtotal)}</td>
            </tr>
            ${inv.subsidyAmount > 0 ? `
            <tr>
                <td style="padding:3px; text-align:right; color:#64748b; font-weight:bold;">${inv.subsidyDescription || 'Subsidi'}:</td>
                <td style="padding:3px; text-align:right; font-weight:bold;">${formatCurrency(inv.subsidyAmount)}</td>
            </tr>
            <tr style="border-top: 1px solid #e2e8f0;">
                <td style="padding:3px; text-align:right; color:#64748b; font-weight:bold;">Jumlah:</td>
                <td style="padding:3px; text-align:right; font-weight:bold;">${formatCurrency(subtotalAfterSubsidy)}</td>
            </tr>` : ''}
            ${inv.discountAmount > 0 ? `
            <tr>
                <td style="padding:3px; text-align:right; color:#64748b; font-weight:bold;">${inv.discountDescription || 'Discount'}:</td>
                <td style="padding:3px; text-align:right; font-weight:bold;">${formatCurrency(inv.discountAmount)}</td>
            </tr>` : ''}
            ${inv.taxAmount > 0 ? `
            <tr>
                <td style="padding:3px; text-align:right; color:#ea580c; font-weight:bold;">PPN (${inv.taxRate || 11}%):</td>
                <td style="padding:3px; text-align:right; color:#ea580c; font-weight:bold;">${formatCurrency(inv.taxAmount)}</td>
            </tr>` : ''}
            <tr style="border-top: 2px solid #0f172a;">
                <td style="padding:5px 3px; text-align:right; font-weight:900; font-size:12px;">TOTAL:</td>
                <td style="padding:5px 3px; text-align:right; font-weight:900; font-size:14px; color:#0f172a;">${formatCurrency(inv.totalAmount)}</td>
            </tr>
        </table>
    `;

    const printHtml = `
        <!DOCTYPE html>
        <html>
        <head>
            <title>Invoice ${inv.invoiceNumber}</title>
            <style>
                @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;700;900&display=swap');
                * { margin:0; padding:0; box-sizing:border-box; font-family:'Inter', sans-serif; }
                body { padding:20px; color:#1e293b; background:#fff; margin:0; }
                .header { display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:15px; border-bottom:3px solid #0f172a; padding-bottom:10px; }
                .company-name { font-size:20px; font-weight:900; color:#0f172a; text-transform:uppercase; letter-spacing:-0.5px; }
                .company-info { font-size:9px; color:#64748b; margin-top:3px; line-height:1.4; font-weight:500; }
                .doc-type { text-align:right; }
                .doc-type h1 { font-size:24px; font-weight:900; color:#2563eb; margin:0; line-height:1; }
                .doc-no { font-size:12px; font-weight:700; color:#0f172a; margin-top:3px; font-family:monospace; }
                .meta-table { width:100%; border-collapse:collapse; margin-bottom:10px; }
                .meta-table td { padding:3px 0; font-size:10px; vertical-align:top; }
                .label { font-weight:bold; color:#64748b; text-transform:uppercase; font-size:8px; width:100px; }
                .value { font-weight:700; color:#0f172a; text-transform:uppercase; }
                .signatures { margin-top:15px; display:flex; justify-content:space-between; gap:20px; text-align:center; }
                .sig-box { border:1px solid #e2e8f0; border-radius:8px; padding:10px; flex:1; }
                .sig-title { font-size:9px; font-weight:900; color:#94a3b8; text-transform:uppercase; margin-bottom:40px; letter-spacing:1px; }
                .sig-line { border-top:2px solid #0f172a; width:80%; margin:0 auto 3px; }
                .sig-name { font-size:10px; font-weight:700; color:#0f172a; }
                @page { size: landscape; margin: 10mm; }
                @media print { body { padding:0; } .sig-box { border:1px solid #000; } .header { border-bottom:2px solid #000; } }
            </style>
        </head>
        <body>
            <div class="header">
                <div>
                    <div class="company-name">${company.name}</div>
                    <div class="company-info">${company.address}<br>Tel: ${company.phone} | ${company.email}</div>
                </div>
                <div class="doc-type">
                    <h1>SALES INVOICE</h1>
                    <div class="doc-no"># ${inv.invoiceNumber}</div>
                </div>
            </div>

            <div style="display:grid; grid-template-columns:1fr 1fr; gap:40px; margin-bottom:10px;">
                <table class="meta-table">
                    <tr><td class="label">Ditagihkan Ke</td><td class="value" style="font-size:14px;color:#2563eb">${customer?.name || '-'}</td></tr>
                    <tr><td class="label">Alamat</td><td class="value" style="font-weight:500;color:#475569">${customer?.address || '-'}</td></tr>
                    <tr><td class="label">Ref SO</td><td class="value">${so?.soNumber || '-'}</td></tr>
                </table>
                <table class="meta-table">
                    <tr><td class="label">Tanggal Faktur</td><td class="value">${formatDate(inv.date).slice(0, 11)}</td></tr>
                    <tr><td class="label">Jatuh Tempo</td><td class="value" style="color:#dc2626">${inv.dueDate ? formatDate(inv.dueDate).slice(0, 11) : '-'}</td></tr>
                    <tr><td class="label">Status</td><td class="value">${inv.status}</td></tr>
                </table>
            </div>

            ${itemsTable}

            <div style="display:grid; grid-template-columns:1fr 1fr; gap:40px;">
                <div>
                    ${inv.notes ? `<div style="font-size:9px; color:#475569; padding:10px; background:#f8fafc; border:1px solid #e2e8f0; border-left:3px solid #64748b; border-radius:6px;"><strong>Catatan Tambahan:</strong><br>${inv.notes}</div>` : ''}
                </div>
                <div>
                    ${totalsBlock}
                </div>
            </div>

            <div class="signatures">
                <div class="sig-box">
                    <div class="sig-title">Diterima Oleh</div>
                    <div class="sig-line"></div>
                    <div class="sig-name">Nama Terang & Ttd</div>
                </div>
                <div class="sig-box" style="border:none;">
                    <!-- Spacer -->
                </div>
                <div class="sig-box">
                    <div class="sig-title">Hormat Kami</div>
                    <div class="sig-line"></div>
                    <div class="sig-name">${company.name}</div>
                </div>
            </div>
        </body>
        </html>
    `;

    const pw = window.open('', '_blank', 'width=800,height=600');
    if (pw) {
        pw.document.write(printHtml);
        pw.document.close();
        pw.onload = () => { pw.focus(); pw.print(); };
    }
};

window.viewInvoice = (id) => {
    const inv = db.findById('salesInvoices', id);
    const so = db.findById('salesOrders', inv.salesOrderId);
    const customer = db.findById('customers', inv.customerId);

    const invPayments = db.read('payments').filter(p => p.invoiceId === inv.id);
    const totalPaid = invPayments.reduce((sum, p) => sum + parseFloat(p.amount), 0);

    const printableHTML = `
           <div class="max-w-4xl mx-auto bg-white p-6 shadow-sm rounded-xl border border-gray-100 mb-4">
                <!-- Header: Premium Look -->
                <div id="print-internal-header" class="flex justify-between items-start mb-8 print:mb-4 pb-6 print:pb-2 border-b-2 border-gray-50">
                    <div>
                        <div class="bg-blue-600 text-white px-3 py-1 rounded text-[10px] font-black uppercase tracking-widest mb-2 inline-block shadow-sm">Sales Invoice</div>
                        <h2 class="text-4xl font-black text-slate-800 tracking-tight">${inv.invoiceNumber}</h2>
                        <p class="text-sm text-slate-400 mt-1 font-medium italic">Referensi SO: <span class="text-blue-600 font-bold">${so ? so.soNumber : '-'}</span></p>
                    </div>
                    <div class="flex items-start gap-4">
                        ${CONFIG.logo ? `<img src="${CONFIG.logo}" class="h-16 w-auto object-contain drop-shadow-sm">` : ''}
                        <div class="text-right flex flex-col items-end">
                            <h1 class="text-xl font-black text-slate-900 leading-none">${CONFIG.companyName}</h1>
                            <p class="text-[10px] text-slate-500 max-w-[220px] leading-relaxed mt-2 uppercase font-bold tracking-tight">${CONFIG.companyAddress}</p>
                            <div class="flex gap-2 mt-2">
                                <span class="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full font-bold">${CONFIG.companyPhone}</span>
                                <span class="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full font-bold">${CONFIG.companyEmail}</span>
                            </div>
                        </div>
                    </div>
                </div>
                
                <!-- Info Section -->
                <div class="grid grid-cols-2 gap-12 mb-10 print:mb-4">
                    <div class="bg-slate-50 p-5 rounded-2xl border border-slate-100 shadow-inner">
                        <h3 class="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                            <i class="fas fa-user-tie text-blue-500"></i> DITAGIHKAN KE
                        </h3>
                        <p class="text-lg font-black text-slate-800 leading-tight mb-1">${customer ? customer.name : '-'}</p>
                        <p class="text-sm text-slate-600 font-bold mb-3">${customer?.phone || '-'}</p>
                        <div class="h-px bg-slate-200 w-12 mb-3"></div>
                        <p class="text-xs text-slate-500 leading-relaxed font-medium italic">${customer?.address || '-'}</p>
                    </div>
                    
                    <div class="flex flex-col justify-between">
                        <div>
                             <h3 class="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 flex items-center justify-end gap-2 text-right">
                                DETAIL INVOICE <i class="fas fa-receipt text-orange-500"></i>
                            </h3>
                            <div class="space-y-2 text-right">
                                <p class="text-xs text-slate-500 font-bold uppercase tracking-tighter">Tanggal Penerbitan</p>
                                <p class="text-sm font-black text-slate-800 mb-2">${formatDate(inv.date).slice(0, 11)}</p>
                                
                                <p class="text-[10px] text-slate-500 font-bold uppercase tracking-tighter">Tanggal Jatuh Tempo</p>
                                <p class="text-sm font-black text-red-600 mb-4">${inv.dueDate ? formatDate(inv.dueDate).slice(0, 11) : '-'}</p>

                                <div class="flex justify-end gap-2">
                                    <div class="text-right">
                                        <p class="text-[10px] text-slate-400 font-bold uppercase mb-1">Status Pembayaran</p>
                                        <span class="inline-block px-4 py-1.5 rounded-full text-xs font-black tracking-widest shadow-sm ${inv.status === 'PAID' ? 'bg-green-500 text-white' : 'bg-red-500 text-white'}">${inv.status}</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                        ${inv.isTax && inv.nsfp ? `
                        <div class="mt-4 bg-orange-50 border-r-4 border-orange-500 p-3 text-right shadow-sm">
                             <p class="text-[9px] font-black text-orange-400 uppercase tracking-widest mb-1">Nomor Seri Faktur Pajak (NSFP)</p>
                             <p class="text-xs font-black text-orange-700 font-mono tracking-tighter">${inv.nsfp}</p>
                        </div>` : ''}
                    </div>
                </div>
                
                <!-- Items Table -->
                <div class="overflow-hidden rounded-2xl border border-slate-100 shadow-sm mb-8 print:mb-2">
                    <table class="w-full text-left border-collapse">
                        <thead>
                            <tr class="bg-slate-800 text-white text-[10px] uppercase font-black tracking-widest">
                                <th class="py-4 px-4 print:py-2">Produk / Layanan</th>
                                <th class="py-4 px-4 text-center print:py-2">Colly</th>
                                <th class="py-4 px-4 text-center print:py-2">Qty</th>
                                <th class="py-4 px-4 text-right print:py-2">Harga Satuan</th>
                                <th class="py-4 px-4 text-right print:py-2">Subtotal</th>
                            </tr>
                        </thead>
                        <tbody class="text-slate-700 text-sm divide-y divide-slate-50 print:divide-none">
                            ${inv.items ? inv.items.map(i => `
                                <tr class="hover:bg-slate-50/50 transition-colors text-[11px]">
                                    <td class="py-3 px-4 print:py-1">
                                        <div class="font-bold text-slate-800">${i.prodText.split(' (')[0]}</div>
                                        ${i.kemasan && i.kemasan !== '-' ? `<div class="text-[9px] text-slate-400 italic">Kemasan: ${i.kemasan === '800 Gram' ? '4 KG (800 Gram)' : i.kemasan}</div>` : ''}
                                    </td>
                                    <td class="py-3 px-4 text-center font-bold text-blue-600 print:py-1">${i.colly || '-'}</td>
                                    <td class="py-3 px-4 text-center font-bold text-slate-500 print:py-1">${formatNumber(i.qty)}</td>
                                    <td class="py-3 px-4 text-right font-medium text-slate-600 print:py-1">${formatCurrency(i.price)}</td>
                                    <td class="py-3 px-4 text-right font-black text-slate-800 print:py-1">${formatCurrency(i.subtotal)}</td>
                                </tr>
                            `).join('') : '<tr><td colspan="5" class="py-8 text-center italic text-slate-400 font-medium">Tidak ada item terdaftar</td></tr>'}
                        </tbody>
                        <tfoot class="bg-slate-50/80">
                            <!-- Raw Subtotal (Items) -->
                            <tr class="border-t-2 border-slate-200">
                                <td colspan="4" class="py-3 px-4 text-right text-[10px] font-black uppercase tracking-wider text-slate-400">Subtotal:</td>
                                <td class="py-3 px-4 text-right font-bold text-slate-700">${formatCurrency((inv.totalAmount - (inv.taxAmount || 0)) + (inv.discountAmount || 0))}</td>
                            </tr>
                            
                            <!-- Discount -->
                            ${inv.discountAmount > 0 ? `
                            <tr class="text-green-600">
                                <td colspan="4" class="py-2 px-4 text-right text-[10px] font-black uppercase tracking-wider italic">${inv.discountDescription || 'Discount'}:</td>
                                <td class="py-2 px-4 text-right font-bold">- ${formatCurrency(inv.discountAmount)}</td>
                            </tr>
                            ` : ''}

                            <!-- DPP -->
                            ${(inv.taxAmount > 0 || inv.discountAmount > 0) ? `
                            <tr class="bg-slate-100/50">
                                <td colspan="4" class="py-2 px-4 text-right text-[10px] font-black uppercase tracking-wider text-slate-500">DPP (Tax Base):</td>
                                <td class="py-2 px-4 text-right font-black text-slate-800">${formatCurrency(inv.totalAmount - (inv.taxAmount || 0))}</td>
                            </tr>
                            ` : ''}

                            <!-- Tax -->
                            ${inv.taxAmount > 0 ? `
                            <tr class="text-orange-600">
                                <td colspan="4" class="py-2 px-4 text-right text-[10px] font-black uppercase tracking-wider">PPN (${inv.taxRate || 11}%):</td>
                                <td class="py-2 px-4 text-right font-bold">${formatCurrency(inv.taxAmount)}</td>
                            </tr>
                            ` : ''}

                            <!-- Grand Total -->
                             <tr class="bg-slate-900 text-white shadow-xl">
                                <td colspan="4" class="py-5 px-4 print:py-2 text-right text-sm font-black uppercase tracking-[0.2em] italic">Grand Total:</td>
                                <td class="py-5 px-4 print:py-2 text-right font-black text-2xl">${formatCurrency(inv.totalAmount)}</td>
                            </tr>
                            
                            <!-- Payments info if any -->
                            ${totalPaid > 0 ? `
                            <tr class="bg-green-600 text-white">
                                <td colspan="4" class="py-3 px-4 text-right text-[10px] font-black uppercase tracking-wider">Total Terbayar:</td>
                                <td class="py-3 px-4 text-right font-black border-t border-green-500">${formatCurrency(totalPaid)}</td>
                            </tr>
                            <tr class="bg-red-600 text-white">
                                <td colspan="3" class="py-4 px-4 text-right text-xs font-black uppercase tracking-widest">Sisa / Balance:</td>
                                <td class="py-4 px-4 text-right font-black text-xl shadow-lg">${formatCurrency(inv.totalAmount - totalPaid)}</td>
                            </tr>
                            ` : ''}
                        </tfoot>
                    </table>
                </div>

                ${invPayments.length > 0 ? `
                <div class="mt-12 bg-white rounded-2xl border border-slate-100 p-6 shadow-sm">
                    <h3 class="text-xs font-black text-slate-800 uppercase tracking-widest mb-4 flex items-center justify-between">
                        <span>Riwayat Pembayaran</span>
                        <span class="h-0.5 bg-slate-100 flex-1 ml-4 rounded-full"></span>
                    </h3>
                    <table class="w-full text-left text-sm">
                        <thead>
                            <tr class="text-slate-400 text-[10px] uppercase font-black tracking-widest border-b pb-2">
                                <th class="py-2">Tanggal</th>
                                <th class="py-2">Metode</th>
                                <th class="py-2 text-right">Jumlah</th>
                            </tr>
                        </thead>
                        <tbody class="divide-y divide-slate-50">
                            ${invPayments.map(p => `
                                <tr class="hover:bg-slate-50 transition-colors">
                                    <td class="py-3 text-slate-500 font-bold">${formatDate(p.date).slice(0, 11)}</td>
                                    <td class="py-3"><span class="px-3 py-1 bg-slate-100 text-slate-600 rounded-full text-[10px] font-black uppercase">${p.method}</span></td>
                                    <td class="py-3 text-right font-black text-green-600 tracking-tighter">${formatCurrency(p.amount)}</td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
                ` : ''}
                
                <div class="mt-12 print:mt-4 border-t-2 border-dashed border-slate-100 pt-6 print:pt-2 text-center">
                    <p class="text-[10px] text-slate-400 font-black uppercase tracking-[0.3em]">Thank you for your business!</p>
                </div>
           </div>
        `;

    const message = `Halo ${customer?.name || 'Customer'},\n\nBerikut adalah tagihan untuk Invoice ${inv.invoiceNumber} senilai *${formatCurrency(inv.totalAmount)}*.\n\nMohon untuk segera melakukan pembayaran sesuai dengan kesepakatan.\n\nTerima kasih,\n${CONFIG.companyName}`;
    const waLink = `https://wa.me/?text=${encodeURIComponent(message)}`;
    const emailLink = `mailto:${customer?.email || ''}?subject=Sales%20Invoice%20${inv.invoiceNumber}&body=${encodeURIComponent(message)}`;

    const footer = `
        <div class="flex flex-wrap gap-3 w-full sm:w-auto justify-end items-center mt-2 px-4 py-2 bg-slate-50 rounded-xl border border-slate-100">
            ${inv.isTax ? `<button onclick="printFakturPajak('${inv.id}')" class="group relative flex items-center px-5 py-2.5 bg-orange-600 text-white rounded-lg text-xs font-black hover:bg-orange-700 transition-all shadow-md hover:shadow-orange-200 active:scale-95"><i class="fas fa-receipt mr-2 group-hover:rotate-12 transition-transform"></i> TAX INVOICE</button>` : ''}
            <a href="${emailLink}" target="_blank" class="flex items-center px-5 py-2.5 bg-slate-800 text-white rounded-lg text-xs font-black hover:bg-slate-900 transition-all shadow-md active:scale-95"><i class="fas fa-envelope mr-2"></i> EMAIL</a>
            <a href="${waLink}" target="_blank" class="flex items-center px-5 py-2.5 bg-green-600 text-white rounded-lg text-xs font-black hover:bg-green-700 transition-all shadow-md hover:shadow-green-200 active:scale-95"><i class="fab fa-whatsapp mr-2 text-base"></i> WHATSAPP</a>
            <button onclick='printHTML(\`${printableHTML.replace(/`/g, "\\`").replace(/\n/g, "")}\`, "Invoice ${inv.invoiceNumber}")' class="group flex items-center px-5 py-2.5 bg-blue-600 text-white rounded-lg text-xs font-black hover:bg-blue-700 transition-all shadow-md hover:shadow-blue-200 active:scale-95"><i class="fas fa-file-pdf mr-2 group-hover:-translate-y-0.5 transition-transform"></i> SAVE AS PDF</button>
            <div class="h-6 w-px bg-slate-300 mx-1 hidden sm:block"></div>
            <button onclick="closeModal()" class="px-6 py-2.5 border-2 border-slate-200 bg-white text-slate-400 rounded-lg text-xs font-black hover:bg-slate-50 hover:text-slate-600 hover:border-slate-300 transition-all active:scale-95">TUTUP</button>
        </div>
    `;

    showModal(`Detail Invoice ${inv.invoiceNumber}`, printableHTML, footer);
};

window.printFakturPajak = (invoiceId) => {
    const inv = db.findById('salesInvoices', invoiceId);
    if (!inv) return;
    const so = db.findById('salesOrders', inv.salesOrderId);
    const customer = db.findById('customers', inv.customerId);

    const baseSubtotal = inv.items.reduce((s, i) => s + i.subtotal, 0);
    const dpp = Math.max(0, baseSubtotal - (inv.discountAmount || 0));

    // Construct items rows
    const itemRows = inv.items.map((item, idx) => `
        <tr>
            <td style="border: 1px solid #000; padding: 5px; text-align: center;">${idx + 1}</td>
            <td style="border: 1px solid #000; padding: 5px;">${item.prodText.split(' (')[0]}</td>
            <td style="border: 1px solid #000; padding: 5px; text-align: right;">${formatCurrency(item.price)}</td>
            <td style="border: 1px solid #000; padding: 5px; text-align: center;">${formatNumber(item.qty)}</td>
            <td style="border: 1px solid #000; padding: 5px; text-align: right;">${formatCurrency(item.subtotal)}</td>
        </tr>
    `).join('');

    const htmlFaktur = `
        <div style="font-family: Arial, sans-serif; font-size: 12px; width: 800px; margin: 0 auto;">
            <div style="text-align: center; margin-bottom: 20px; border-bottom: 2px solid #000; padding-bottom: 10px;">
                <h1 style="font-size: 20px; font-weight: bold; margin: 0;">FAKTUR PAJAK</h1>
            </div>
            
            <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px; border: 1px solid #000;">
                <tr>
                    <td style="padding: 5px; width: 150px; font-weight: bold; border-bottom: 1px solid #000;">Kode dan Nomor Seri</td>
                    <td style="padding: 5px; border-bottom: 1px solid #000;">: <span style="font-size: 16px; font-weight: bold;">${inv.nsfp || '-'}</span></td>
                </tr>
            </table>

            <table style="width: 100%; border-collapse: collapse; border: 1px solid #000;">
                <!-- Pengusaha Kena Pajak (Penjual) -->
                <tr>
                    <td colspan="2" style="padding: 5px; font-weight: bold; border-bottom: 1px solid #000; background-color: #f3f4f6;">Pengusaha Kena Pajak</td>
                </tr>
                <tr>
                    <td style="padding: 10px; width: 150px;">
                        ${CONFIG.logo ? `<img src="${CONFIG.logo}" style="height: 50px; width: auto; object-fit: contain;">` : ''}
                    </td>
                    <td style="padding: 5px;">
                        <div style="font-weight: bold; font-size: 14px;">${CONFIG.companyName}</div>
                        <div>${CONFIG.companyAddress}</div>
                    </td>
                </tr>
                <tr>
                    <td style="padding: 5px; border-bottom: 1px solid #000;">NPWP</td>
                    <td style="padding: 5px; border-bottom: 1px solid #000;">: -</td>
                </tr>

                <!-- Pembeli Barang Kena Pajak / Penerima Jasa -->
                <tr>
                    <td colspan="2" style="padding: 5px; font-weight: bold; border-bottom: 1px solid #000; background-color: #f3f4f6;">Pembeli Barang Kena Pajak / Penerima Jasa Kena Pajak</td>
                </tr>
                <tr>
                    <td style="padding: 5px;">Nama</td>
                    <td style="padding: 5px;">: ${customer ? customer.name : '-'}</td>
                </tr>
                <tr>
                    <td style="padding: 5px;">Alamat</td>
                    <td style="padding: 5px;">: ${customer && customer.address ? customer.address : '-'}</td>
                </tr>
                <tr>
                    <td style="padding: 5px; border-bottom: 1px solid #000;">NPWP/NIK</td>
                    <td style="padding: 5px; border-bottom: 1px solid #000;">: -</td>
                </tr>
            </table>

            <table style="width: 100%; border-collapse: collapse; border: 1px solid #000; border-top: 0;">
                <thead>
                    <tr style="background-color: #f3f4f6;">
                        <th style="border: 1px solid #000; padding: 5px; width: 40px; text-align: center;">No.</th>
                        <th style="border: 1px solid #000; padding: 5px; text-align: left;">Nama Barang / Jasa Kena Pajak</th>
                        <th style="border: 1px solid #000; padding: 5px; text-align: right; width: 100px;">Harga Satuan</th>
                        <th style="border: 1px solid #000; padding: 5px; text-align: center; width: 60px;">Jumlah</th>
                        <th style="border: 1px solid #000; padding: 5px; text-align: right; width: 140px;">Harga Jual / Penggantian (Rp)</th>
                    </tr>
                </thead>
                <tbody>
                    ${itemRows}
                </tbody>
            </table>

            <table style="width: 100%; border-collapse: collapse; border: 1px solid #000; border-top: 0;">
                <tr>
                    <td style="border: 1px solid #000; padding: 5px; text-align: left;" colspan="4">Harga Jual / Penggantian</td>
                    <td style="border: 1px solid #000; padding: 5px; text-align: right; width: 140px; font-weight: bold;">${formatCurrency(baseSubtotal)}</td>
                </tr>
                <tr>
                    <td style="border: 1px solid #000; padding: 5px; text-align: left;" colspan="4">Dikurangi Potongan Harga / Diskon</td>
                    <td style="border: 1px solid #000; padding: 5px; text-align: right; width: 140px;">${formatCurrency(inv.discountAmount || 0)}</td>
                </tr>
                <tr>
                    <td style="border: 1px solid #000; padding: 5px; text-align: left;" colspan="4">Dikurangi Uang Muka yang telah diterima</td>
                    <td style="border: 1px solid #000; padding: 5px; text-align: right; width: 140px;">Rp 0,00</td>
                </tr>
                <tr>
                    <td style="border: 1px solid #000; padding: 5px; text-align: left; font-weight: bold;" colspan="4">Dasar Pengenaan Pajak (DPP)</td>
                    <td style="border: 1px solid #000; padding: 5px; text-align: right; width: 140px; font-weight: bold;">${formatCurrency(dpp)}</td>
                </tr>
                <tr>
                    <td style="border: 1px solid #000; padding: 5px; text-align: left; font-weight: bold;" colspan="4">PPN = ${inv.taxRate || 0}% x Dasar Pengenaan Pajak</td>
                    <td style="border: 1px solid #000; padding: 5px; text-align: right; width: 140px; font-weight: bold;">${formatCurrency(inv.taxAmount || 0)}</td>
                </tr>
            </table>
            
            <div style="margin-top: 40px; text-align: right;">
                <p style="margin: 0; margin-bottom: 60px;">Jakarta, ${formatDate(inv.createdAt).slice(0, 11)}</p>
                <div style="display: inline-block; border-bottom: 1px solid #000; width: 200px; text-align: center;">
                    <strong>[ ${CONFIG.companyName} ]</strong>
                </div>
                <p style="margin: 5px 0 0 0; text-align: center; width: 200px; display: inline-block;">Pejabat Berwenang</p>
            </div>
        </div>
    `;

    printHTML(htmlFaktur, `Faktur_Pajak_${inv.invoiceNumber.replace(/\//g, '_')}`);
};

// To be implemented soon in Payments module
window.openPaymentModal = (invoiceId) => {
    window.currentPaymentInvoiceId = invoiceId;
    renderSalesPayments(invoiceId);
};

// --- Sales Payments Module ---
function renderSalesPayments(prefillInvoiceId = null) {
    document.getElementById('pageTitle').innerText = 'Sales Payment';
    const mainContent = document.getElementById('main-content');

    const payments = db.read('payments').sort((a, b) => new Date(b.date) - new Date(a.date));
    const invoices = db.read('salesInvoices');
    const customers = db.read('customers');

    let filteredPayments = payments;

    // Apply Date Filter
    if (!prefillInvoiceId) {
        filteredPayments = filterByDateRange(payments, 'salesPayments');
    }

    let recapBannerHtml = '';

    if (prefillInvoiceId) {
        window.currentPaymentInvoiceId = prefillInvoiceId;
        const inv = invoices.find(i => i.id === prefillInvoiceId);
        if (inv) {
            const customer = customers.find(c => c.id === inv.customerId) || { name: 'Unknown' };
            const invPayments = payments.filter(p => p.invoiceId === inv.id);
            const totalPaid = invPayments.reduce((sum, p) => sum + parseFloat(p.amount), 0);
            const balance = inv.totalAmount - totalPaid;

            filteredPayments = invPayments;

            recapBannerHtml = `
                <div class="mb-6 bg-blue-50 border border-blue-100 rounded-lg p-4 sm:p-6 shadow-sm">
                    <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4">
                        <div>
                            <h3 class="text-blue-800 font-bold text-lg">Rekap Pembayaran: ${inv.invoiceNumber}</h3>
                            <p class="text-blue-600 text-sm">Customer: <span class="font-semibold">${customer.name}</span></p>
                        </div>
                        <button onclick="renderSalesPayments(null)" class="mt-2 sm:mt-0 text-blue-700 hover:text-blue-900 text-sm font-medium underline">
                            <i class="fas fa-list mr-1"></i>Tampilkan Semua Data
                        </button>
                    </div>
                    <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <div class="bg-white p-3 rounded border border-blue-100">
                            <p class="text-gray-500 text-xs uppercase font-semibold">Total Tagihan</p>
                            <p class="text-gray-800 font-bold text-lg">${formatCurrency(inv.totalAmount)}</p>
                        </div>
                        <div class="bg-white p-3 rounded border border-blue-100">
                            <p class="text-gray-500 text-xs uppercase font-semibold">Total Terbayar</p>
                            <p class="text-green-600 font-bold text-lg">${formatCurrency(totalPaid)}</p>
                        </div>
                        <div class="bg-white p-3 rounded border border-blue-100">
                            <p class="text-gray-500 text-xs uppercase font-semibold">Sisa Tagihan</p>
                            <p class="text-red-600 font-bold text-lg">${formatCurrency(balance)}</p>
                        </div>
                    </div>
                </div>
            `;
        }
    }

    let rows = filteredPayments.map(p => {
        const inv = invoices.find(i => i.id === p.invoiceId) || { invoiceNumber: 'Unknown', customerId: null };
        const customer = customers.find(c => c.id === inv.customerId) || { name: 'Unknown' };

        return `
            <tr class="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                <td class="py-3 px-4 text-sm font-medium text-gray-800">${p.paymentNumber}</td>
                <td class="py-3 px-4 text-sm text-gray-800">${formatDate(p.date).slice(0, 11)}</td>
                <td class="py-3 px-4 text-sm text-blue-600">${inv.invoiceNumber}</td>
                <td class="py-3 px-4 text-sm text-gray-800">${customer.name}</td>
                <td class="py-3 px-4 text-sm text-gray-800">${p.method}</td>
                <td class="py-3 px-4 text-sm">
                    ${p.proofReference ? `<span class="px-2 py-0.5 bg-blue-50 text-blue-600 rounded text-[10px] font-bold"><i class="fas fa-paperclip mr-1"></i>${p.proofReference}</span>` : '<span class="text-gray-400 italic text-[10px]">No Proof</span>'}
                </td>
                <td class="py-3 px-4 text-sm text-green-600 font-bold text-right">${formatCurrency(p.amount)}</td>
            </tr>
        `;
    }).join('');

    if (filteredPayments.length === 0) rows = `<tr><td colspan="7" class="py-12 text-center text-gray-400 italic font-bold uppercase tracking-widest"><i class="fas fa-receipt text-3xl mb-2 opacity-10"></i><br>Belum ada data pembayaran ${prefillInvoiceId ? 'untuk invoice ini' : ''}</td></tr>`;

    let filterHtml = '';
    if (!prefillInvoiceId) {
        filterHtml = `
        <div class="bg-white rounded-xl shadow-sm border border-slate-100 mb-5 sticky top-0 z-30 transition-all">
            <div onclick="toggleSPFilter()" class="flex items-center justify-between p-4 cursor-pointer hover:bg-slate-50 transition-colors select-none backdrop-blur-md bg-white/90 rounded-xl">
                <h3 class="text-[10px] font-black text-slate-800 uppercase tracking-[0.2em] flex items-center gap-3">
                    <i class="fas fa-filter text-blue-600"></i> FILTER PENCARIAN
                    ${(!window._uiState.spFilterOpen && (window.currentFilters.salesPayments.start || window.currentFilters.salesPayments.end)) ?
                `<span class="ml-2 px-2 py-0.5 bg-blue-50 text-blue-600 rounded-full text-[9px] font-bold">Filter Aktif</span>` : ''}
                </h3>
                <div class="flex items-center gap-3">
                    <span class="text-[9px] font-bold text-slate-400 uppercase tracking-widest">${window._uiState.spFilterOpen ? 'Sembunyikan' : 'Tampilkan'}</span>
                    <i class="fas fa-chevron-${window._uiState.spFilterOpen ? 'up' : 'down'} text-slate-300 text-xs"></i>
                </div>
            </div>

            <div class="${window._uiState.spFilterOpen ? 'block' : 'hidden'} p-5 border-t border-slate-50 animate-in slide-in-from-top-2 duration-200">
                <div class="flex flex-wrap gap-4 items-end">
                    <div class="flex-1 min-w-[200px]">
                        <label class="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Dari Tanggal</label>
                        <input type="date" id="sales_pay_start_date" value="${window.currentFilters.salesPayments.start}" 
                            class="w-full border-2 border-slate-100 rounded-lg px-3 py-2 text-sm font-bold text-slate-700 focus:border-blue-500 outline-none transition-all bg-slate-50/50 focus:bg-white">
                    </div>
                    <div class="flex-1 min-w-[200px]">
                        <label class="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Sampai Tanggal</label>
                        <input type="date" id="sales_pay_end_date" value="${window.currentFilters.salesPayments.end}" 
                            class="w-full border-2 border-slate-100 rounded-lg px-3 py-2 text-sm font-bold text-slate-700 focus:border-blue-500 outline-none transition-all bg-slate-50/50 focus:bg-white">
                    </div>
                </div>
                <div class="flex gap-2 pt-4 mt-4 border-t border-slate-50">
                    <button onclick="applySalesPayFilter()" class="bg-blue-600 hover:bg-slate-900 text-white px-8 py-2.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all shadow-lg active:scale-95">
                        <i class="fas fa-search mr-2"></i> TAMPILKAN LAPORAN
                    </button>
                    <button onclick="resetSalesPayFilter()" class="bg-slate-50 hover:bg-slate-100 text-slate-400 px-5 py-2.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all">
                        <i class="fas fa-undo mr-2"></i> RESET
                    </button>
                </div>
            </div>
        </div>`;
    }

    mainContent.innerHTML = `
        ${recapBannerHtml}
        ${filterHtml}
        <div class="bg-white rounded-lg shadow-sm border border-gray-100">
            <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center p-4 sm:p-6 border-b border-gray-100 gap-4">
                <div>
                    <h2 class="text-lg font-semibold text-gray-800">Sales Payment History</h2>
                    <p class="text-xs text-gray-500 mt-1">Total: ${filteredPayments.length} transaksi</p>
                </div>
            </div>
            <div class="overflow-x-auto">
                <table class="w-full text-left border-collapse">
                    <thead>
                        <tr class="bg-gray-50 border-b border-gray-200">
                            <th class="py-3 px-4 text-xs font-semibold text-gray-600 uppercase tracking-wider">No. Bukti</th>
                            <th class="py-3 px-4 text-xs font-semibold text-gray-600 uppercase tracking-wider">Tanggal</th>
                            <th class="py-3 px-4 text-xs font-semibold text-gray-600 uppercase tracking-wider">No. Invoice</th>
                            <th class="py-3 px-4 text-xs font-semibold text-gray-600 uppercase tracking-wider">Customer</th>
                            <th class="py-3 px-4 text-xs font-semibold text-gray-600 uppercase tracking-wider">Metode</th>
                            <th class="py-3 px-4 text-xs font-semibold text-gray-600 uppercase tracking-wider">Bukti TF</th>
                            <th class="py-3 px-4 text-xs font-semibold text-gray-600 uppercase tracking-wider text-right">Jumlah</th>
                        </tr>
                    </thead>
                    <tbody>${rows}</tbody>
                </table>
            </div>
        </div>
    `;

    // Auto-open modal if coming from 'Bayar' button
    if (prefillInvoiceId) {
        const inv = invoices.find(i => i.id === prefillInvoiceId);
        if (inv && inv.status === 'UNPAID') {
            setTimeout(() => openNewPaymentModal(), 100);
        }
    }
}


// --- Sales Payments Helper Functions ---
window.openNewPaymentModal = () => {
    const invoices = db.read('salesInvoices');
    const payments = db.read('payments');
    const customers = db.read('customers');

    // Find unpaid invoices
    const unpaidInvoices = invoices.filter(inv => inv.status === 'UNPAID');
    if (unpaidInvoices.length === 0) {
        showToast('Tidak ada invoice yang belum dibayar (UNPAID).', 'error');
        return;
    }

    const invOptions = unpaidInvoices.map(inv => {
        const customer = customers.find(c => c.id === inv.customerId) || { name: 'Unknown' };
        const invPayments = payments.filter(p => p.invoiceId === inv.id);
        const totalPaid = invPayments.reduce((sum, p) => sum + parseFloat(p.amount), 0);
        const balance = inv.totalAmount - totalPaid;

        const selected = inv.id === window.currentPaymentInvoiceId ? 'selected' : '';
        return `<option value="${inv.id}" data-balance="${balance}" ${selected}>${inv.invoiceNumber} - ${customer.name} (Sisa: ${formatCurrency(balance)})</option>`;
    }).join('');

    const body = `
            <div class="space-y-4">
                <div>
                    <label class="block text-sm font-medium text-gray-700 mb-1">Pilih Invoice</label>
                    <select id="pay_invoice_id" class="w-full border border-gray-300 rounded px-3 py-2 bg-white" onchange="updatePaymentDefaultAmount()">
                        <option value="" disabled ${!window.currentPaymentInvoiceId ? 'selected' : ''}>Pilih Invoice...</option>
                        ${invOptions}
                    </select>
                </div>
                <div>
                    <label class="block text-sm font-medium text-gray-700 mb-1">Tanggal Bayar</label>
                    <input type="date" id="pay_date" value="${new Date().toISOString().split('T')[0]}" class="w-full border border-gray-300 rounded px-3 py-2 bg-gray-50">
                </div>
                <div>
                    <label class="block text-sm font-medium text-gray-700 mb-1">Metode Pembayaran</label>
                    <select id="pay_method" class="w-full border border-gray-300 rounded px-3 py-2 bg-white">
                        <option value="Transfer Bank">Transfer Bank</option>
                        <option value="Tunai">Tunai / Cash</option>
                        <option value="Giro/Cek">Giro / Cek</option>
                    </select>
                </div>
                <div>
                    <label class="block text-sm font-medium text-gray-700 mb-1">Jumlah Bayar</label>
                    <input type="number" id="pay_amount" placeholder="0" min="1" class="w-full border border-gray-300 rounded px-3 py-2 text-lg font-bold">
                </div>
                <div>
                    <label class="block text-sm font-medium text-gray-700 mb-1">Bukti Pembayaran (Nama File / Reference)</label>
                    <input type="text" id="pay_proof" placeholder="Misal: transfer_bca_1103.jpg" class="w-full border border-gray-300 rounded px-3 py-2 text-sm italic">
                </div>
                <div>
                    <label class="block text-sm font-medium text-gray-700 mb-1">Catatan</label>
                    <textarea id="pay_notes" placeholder="Catatan tambahan..." rows="2" class="w-full border border-gray-300 rounded px-3 py-2 text-sm"></textarea>
                </div>
            </div>
        `;

    const footer = `
            <button type="button" onclick="saveNewPayment()" class="w-full justify-center rounded-md bg-green-600 px-4 py-2 text-white font-medium hover:bg-green-700 sm:ml-3 sm:w-auto text-sm shadow-sm transition-colors">Proses Pembayaran</button>
            <button type="button" onclick="closeModal()" class="mt-3 w-full justify-center rounded-md border border-gray-300 bg-white px-4 py-2 text-gray-700 font-medium hover:bg-gray-50 sm:mt-0 sm:ml-3 sm:w-auto text-sm transition-colors">Batal</button>
        `;

    showModal('Terima Pembayaran', body, footer);
    setTimeout(() => updatePaymentDefaultAmount(), 100); // init default value based on selection
};

window.updatePaymentDefaultAmount = () => {
    const select = document.getElementById('pay_invoice_id');
    if (select && select.selectedIndex >= 0 && select.options[select.selectedIndex].value !== "") {
        const balance = select.options[select.selectedIndex].dataset.balance;
        document.getElementById('pay_amount').value = balance; // Auto-fill sisa tagihan
    }
};

window.saveNewPayment = async () => {
    const invoices = db.read('salesInvoices');
    const payments = db.read('payments');

    const invoiceId = document.getElementById('pay_invoice_id').value;
    const method = document.getElementById('pay_method').value;
    const inputAmount = parseFloat(document.getElementById('pay_amount').value);
    const dateInput = document.getElementById('pay_date').value;
    const proofRef = document.getElementById('pay_proof').value.trim();
    const notes = document.getElementById('pay_notes').value.trim();

    if (!invoiceId) { showToast('Pilih invoice terlebih dahulu', 'error'); return; }
    if (!inputAmount || inputAmount <= 0) { showToast('Jumlah bayar tidak valid', 'error'); return; }

    const inv = invoices.find(i => i.id === invoiceId);
    if (!inv) return;

    // Validasi tidak melebihi sisa
    const invPayments = payments.filter(p => p.invoiceId === inv.id);
    const totalPaid = invPayments.reduce((sum, p) => sum + parseFloat(p.amount), 0);
    const balance = inv.totalAmount - totalPaid;

    if (inputAmount > balance + 1) { // +1 to workaround float precision issues if any
        showToast(`Jumlah bayar melebihi sisa tagihan (${formatCurrency(balance)})`, 'error');
        return;
    }

    // Save Payment
    const payment = await db.insert('payments', {
        paymentNumber: 'PAY-' + Date.now().toString().slice(-6),
        invoiceId: inv.id,
        date: dateInput ? new Date(dateInput).toISOString() : new Date().toISOString(),
        method: method,
        amount: inputAmount,
        proofReference: proofRef,
        notes: notes
    });

    // Otomatis buat Jurnal: Debit Kas/Bank, Kredit Piutang
    if (typeof db.addJournalEntry === 'function' && payment) {
        let debitAccount = '11110'; // Default: Kas
        if (method === 'Transfer Bank') debitAccount = '11110'; // Default: Bank BCA (as seeded)

        await db.addJournalEntry({
            date: payment.date,
            description: `Pelunasan Invoice ${inv.invoiceNumber} (${method}) ${proofRef ? '- Proof: ' + proofRef : ''}`,
            reference: payment.paymentNumber,
            items: [
                { accountId: method === 'Transfer Bank' ? 'acc_bank' : 'acc_cash', debit: inputAmount, credit: 0 },
                { accountId: 'acc_ar', debit: 0, credit: inputAmount } // Piutang Usaha
            ]
        });
    }

    // Check if fully paid
    const newTotalPaid = totalPaid + inputAmount;
    if (newTotalPaid >= inv.totalAmount - 1) {
        await db.update('salesInvoices', inv.id, { status: 'PAID' });
        showToast('Pembayaran berhasil! Invoice LUNAS.', 'success');
    } else {
        showToast('Pembayaran berhasil dicatat.', 'success');
    }

    window.currentPaymentInvoiceId = null;
    closeModal();

    // Re-render the contextual view if we came from an invoice
    renderSalesPayments(invoiceId);
};

// If param was passed, auto-open modal

// --- Sales Reports Module ---
function renderSalesReports() {
    document.getElementById('pageTitle').innerText = 'Sales Report';
    const mainContent = document.getElementById('main-content');

    // Default date range: current month
    const now = new Date();
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);
    const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().slice(0, 10);

    mainContent.innerHTML = `
        <div class="space-y-6">
            <!-- Filter Panel -->
            <div class="bg-white rounded-xl shadow-sm border border-slate-100 mb-5 overflow-hidden">
                <div onclick="toggleSRPFilter()" class="flex items-center justify-between p-4 cursor-pointer hover:bg-slate-50 transition-colors select-none">
                    <h3 class="text-[10px] font-black text-slate-800 uppercase tracking-[0.2em] flex items-center gap-3">
                        <i class="fas fa-filter text-blue-600"></i> FILTER PENCARIAN
                        ${(!window._uiState.srpFilterOpen) ?
            `<span class="ml-2 px-2 py-0.5 bg-blue-50 text-blue-600 rounded-full text-[9px] font-bold">Filter Aktif</span>` : ''}
                    </h3>
                    <div class="flex items-center gap-3">
                        <span class="text-[9px] font-bold text-slate-400 uppercase tracking-widest">${window._uiState.srpFilterOpen ? 'Sembunyikan' : 'Tampilkan'}</span>
                        <i class="fas fa-chevron-${window._uiState.srpFilterOpen ? 'up' : 'down'} text-slate-300 text-xs"></i>
                    </div>
                </div>

                <div class="${window._uiState.srpFilterOpen ? 'block' : 'hidden'} p-5 border-t border-slate-50 animate-in slide-in-from-top-2 duration-200">
                    <div class="flex flex-wrap items-end gap-3">
                        <div class="flex-1 min-w-[150px]">
                            <label class="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Dari Tanggal</label>
                            <input type="date" id="report_from" value="${firstDay}" class="w-full border-2 border-slate-100 rounded-lg px-3 py-2 text-sm font-bold text-slate-700 focus:border-blue-500 outline-none transition-all bg-slate-50/50 focus:bg-white">
                        </div>
                        <div class="flex-1 min-w-[150px]">
                            <label class="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Sampai Tanggal</label>
                            <input type="date" id="report_to" value="${lastDay}" class="w-full border-2 border-slate-100 rounded-lg px-3 py-2 text-sm font-bold text-slate-700 focus:border-blue-500 outline-none transition-all bg-slate-50/50 focus:bg-white">
                        </div>
                        <div class="flex-1 min-w-[150px]">
                            <label class="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Wilayah</label>
                            <select id="report_region" class="w-full border-2 border-slate-100 rounded-lg px-3 py-2 text-sm font-bold text-slate-700 focus:border-blue-500 outline-none transition-all bg-slate-50/50 focus:bg-white cursor-pointer font-sans">
                                <option value="">-- Semua Wilayah --</option>
                                ${(() => {
            const regions = [...new Set(db.read('customers').map(c => c.region).filter(Boolean))].sort();
            return regions.map(r => `<option value="${r}">${r}</option>`).join('');
        })()}
                            </select>
                        </div>
                        <div class="flex-1 min-w-[150px]">
                            <label class="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Customer</label>
                            <select id="report_customer_id" class="w-full border-2 border-slate-100 rounded-lg px-3 py-2 text-sm font-bold text-slate-700 focus:border-blue-500 outline-none transition-all bg-slate-50/50 focus:bg-white cursor-pointer font-sans">
                                <option value="">-- Semua Customer --</option>
                                ${db.read('customers').map(c => `<option value="${c.id}">${c.name}</option>`).join('')}
                            </select>
                        </div>
                        <div class="flex-1 min-w-[150px]">
                            <label class="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Produk</label>
                            <select id="report_product_id" class="w-full border-2 border-slate-100 rounded-lg px-3 py-2 text-sm font-bold text-slate-700 focus:border-blue-500 outline-none transition-all bg-slate-50/50 focus:bg-white cursor-pointer font-sans">
                                <option value="">-- Semua Produk --</option>
                                ${(() => {
            const invItems = db.read('inventoryItems').filter(i => i.category === 'FINISHED_GOODS');
            const fromInv = invItems.map(i => ({ id: i.id, name: i.itemName }));
            const soldItems = [];
            db.read('salesOrders').forEach(so => {
                (so.items || []).forEach(item => {
                    const actualId = item.inventoryItemId || item.productId;
                    const actualName = item.prodText || item.itemName;
                    if (actualId && !fromInv.some(fi => fi.id === actualId)) {
                        if (!soldItems.some(si => si.id === actualId)) {
                            soldItems.push({ id: actualId, name: actualName });
                        }
                    } else if (!actualId && actualName) {
                        if (!soldItems.some(si => si.name === actualName)) {
                            soldItems.push({ id: actualName, name: actualName });
                        }
                    }
                });
            });
            const combined = [...fromInv, ...soldItems].sort((a, b) => a.name.localeCompare(b.name));
            const unique = [];
            const seenNames = new Set();
            combined.forEach(p => {
                if (!seenNames.has(p.name)) {
                    seenNames.add(p.name);
                    unique.push(p);
                }
            });
            return unique.map(p => `<option value="${p.id}">${p.name}</option>`).join('');
        })()}
                            </select>
                        </div>
                        <button onclick="runSalesReport()" class="bg-blue-600 hover:bg-slate-900 text-white px-8 py-2.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all shadow-lg active:scale-95">
                            <i class="fas fa-search mr-2"></i> TAMPILKAN LAPORAN
                        </button>
                    </div>
                </div>
            </div>
            <!-- Report Output -->
            <div id="sales_report_output"></div>
        </div>
    `;

    // Auto-render on load
    runSalesReport();
}

// ─── Sales Analytics ────────────────────────────────────────────────
function renderSalesAnalytics() {
    document.getElementById('pageTitle').innerText = 'Sales Analytics';
    const mainContent = document.getElementById('main-content');

    const now = new Date();
    const startOfYear = `${now.getFullYear()}-01-01`;
    const endOfYear = `${now.getFullYear()}-12-31`;

    mainContent.innerHTML = `
        <div class="space-y-4">
            <!-- Filter Bar -->
            <div class="bg-white border border-slate-100 rounded-xl shadow-sm p-5">
                <!-- Row 1: Based On | Value Field | Date From | Date To | Company -->
                <div class="flex flex-wrap items-center gap-5 mb-4">
                    <!-- Based On -->
                    <select id="sa_based_on" onchange="updateSalesAnalytics()"
                        class="border border-slate-300 rounded-lg px-5 py-2.5 text-base font-semibold text-slate-700 bg-white focus:outline-none focus:border-blue-400 cursor-pointer min-w-[150px]">
                        <option value="Customer">Customer</option>
                        <option value="Item">Item</option>
                        <option value="Invoice">Sales Invoice</option>
                    </select>

                    <!-- Value Field (doc type) -->
                    <select id="sa_value_field" onchange="updateSalesAnalytics()"
                        class="border border-slate-300 rounded-lg px-5 py-2.5 text-base font-semibold text-slate-700 bg-white focus:outline-none focus:border-blue-400 cursor-pointer min-w-[190px]">
                        <option value="all">All</option>
                        <option value="quotation">Quotation</option>
                        <option value="sales_order">Sales Order</option>
                        <option value="delivery_note">Delivery Note</option>
                        <option value="sales_invoice">Sales Invoice</option>
                        <option value="sales_invoice_due">Sales Invoice (due)</option>
                        <option value="payment_entry">Payment Entry</option>
                    </select>

                    <!-- Date From -->
                    <input type="date" id="sa_from" value="${startOfYear}"
                        onchange="updateSalesAnalytics()"
                        class="border border-slate-300 rounded-lg px-5 py-2.5 text-base font-semibold text-slate-700 bg-white focus:outline-none focus:border-blue-400">

                    <!-- Date To -->
                    <input type="date" id="sa_to" value="${endOfYear}"
                        onchange="updateSalesAnalytics()"
                        class="border border-slate-300 rounded-lg px-5 py-2.5 text-base font-semibold text-slate-700 bg-white focus:outline-none focus:border-blue-400">


                </div>

                <!-- Row 2: Period | Tree | Aggregate -->
                <div class="flex flex-wrap items-center gap-5">
                    <!-- Period -->
                    <select id="sa_period" onchange="updateSalesAnalytics()"
                        class="border border-slate-300 rounded-lg px-5 py-2.5 text-base font-semibold text-slate-700 bg-white focus:outline-none focus:border-blue-400 cursor-pointer min-w-[150px]">
                        <option value="Weekly">Weekly</option>
                        <option value="Monthly" selected>Monthly</option>
                        <option value="Quarterly">Quarterly</option>
                        <option value="Yearly">Yearly</option>
                    </select>

                    <!-- Tree -->
                    <select id="sa_tree" onchange="updateSalesAnalytics()"
                        class="border border-slate-300 rounded-lg px-5 py-2.5 text-base font-semibold text-slate-700 bg-white focus:outline-none focus:border-blue-400 cursor-pointer min-w-[190px]">
                        <option value="">Select</option>
                        <option value="Customer Group">Customer Group</option>
                        <option value="Region">Region</option>
                        <option value="Item Group">Item Group</option>
                    </select>

                    <!-- Aggregate checkbox -->
                    <label class="flex items-start gap-2.5 text-sm text-slate-600 cursor-pointer ml-1">
                        <input type="checkbox" id="sa_aggregate" onchange="updateSalesAnalytics()" class="mt-0.5 w-4 h-4 accent-blue-500">
                        <span class="leading-5">Show Aggregate<br>Value from<br>Subsidiary<br>Companies</span>
                    </label>
                </div>
            </div>

            <!-- Chart Card -->
            <div class="bg-white border border-slate-100 rounded-xl shadow-sm p-6">
                <div class="flex items-center justify-between mb-4">
                    <h3 id="sa_chart_title" class="text-sm font-bold text-slate-700">Sales Analytics - By Customer (Monthly)</h3>
                    <div class="flex gap-2">
                        <button onclick="exportSalesAnalyticsCsv()" class="text-xs px-3 py-1.5 border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50 transition-colors">
                            <i class="fas fa-download mr-1"></i>Export
                        </button>
                    </div>
                </div>
                <div style="height:280px; position:relative;">
                    <canvas id="sa_chart"></canvas>
                </div>
            </div>

            <!-- Data Table -->
            <div class="bg-white border border-slate-100 rounded-xl shadow-sm overflow-hidden">
                <div class="px-5 py-3 border-b border-slate-50">
                    <h3 class="text-[10px] font-black text-slate-500 uppercase tracking-widest">Detail Data</h3>
                </div>
                <div class="overflow-x-auto">
                    <table class="w-full text-sm">
                        <thead class="bg-slate-50">
                            <tr id="sa_table_head"></tr>
                        </thead>
                        <tbody id="sa_table_body" class="divide-y divide-slate-50"></tbody>
                    </table>
                </div>
            </div>
        </div>
    `;

    // Init chart
    window._saChart = null;
    updateSalesAnalytics();
}

window.updateSalesAnalytics = () => {
    const basedOn   = document.getElementById('sa_based_on')?.value || 'Customer';
    const valueField= document.getElementById('sa_value_field')?.value || 'amount';
    const period    = document.getElementById('sa_period')?.value || 'Monthly';
    const fromStr   = document.getElementById('sa_from')?.value;
    const toStr     = document.getElementById('sa_to')?.value;

    const from = fromStr ? new Date(fromStr) : new Date(new Date().getFullYear(), 0, 1);
    const to   = toStr   ? new Date(toStr)   : new Date(new Date().getFullYear(), 11, 31);
    from.setHours(0,0,0,0); to.setHours(23,59,59,999);

    // Build period buckets
    const buckets = [];
    if (period === 'Weekly') {
        let cur = new Date(from);
        // Align to Monday
        cur.setDate(cur.getDate() - ((cur.getDay()+6)%7));
        while (cur <= to) {
            const end = new Date(cur); end.setDate(end.getDate()+6);
            buckets.push({ label: `W${getWeekNumber(cur)} ${cur.getFullYear()}`, start: new Date(cur), end: new Date(end) });
            cur.setDate(cur.getDate()+7);
        }
    } else if (period === 'Monthly') {
        const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
        let y = from.getFullYear(), m = from.getMonth();
        const toY = to.getFullYear(), toM = to.getMonth();
        while (y < toY || (y===toY && m<=toM)) {
            const s = new Date(y, m, 1); const e = new Date(y, m+1, 0, 23, 59, 59);
            buckets.push({ label: months[m], start: s, end: e });
            m++; if (m>11){m=0;y++;}
        }
    } else if (period === 'Quarterly') {
        let y = from.getFullYear(); let q = Math.floor(from.getMonth()/3);
        const toY = to.getFullYear(); const toQ = Math.floor(to.getMonth()/3);
        while (y < toY || (y===toY && q<=toQ)) {
            const s = new Date(y, q*3, 1); const e = new Date(y, q*3+3, 0, 23, 59, 59);
            buckets.push({ label: `Q${q+1} ${y}`, start: s, end: e });
            q++; if(q>3){q=0;y++;}
        }
    } else { // Yearly
        for (let y = from.getFullYear(); y <= to.getFullYear(); y++) {
            buckets.push({ label: String(y), start: new Date(y,0,1), end: new Date(y,11,31,23,59,59) });
        }
    }

    // Aggregate data per bucket based on document type and breakdown
    const salesOrders   = db.read('salesOrders') || [];
    const salesInvoices = db.read('salesInvoices') || [];
    const salesQuotations = db.read('salesQuotations') || [];
    const deliveryOrders = db.read('deliveryOrders') || [];
    const salesPayments  = db.read('salesPayments') || [];
    const customers = db.read('customers') || [];
    const inventoryItems = db.read('inventoryItems') || [];

    const getDocDate = (doc) => doc.date || doc.createdAt || doc.invoiceDate || '';
    const getDocValue = (doc) => (doc.totalAmount || doc.grandTotal || doc.amount || 0);

    // Filter documents by overall date range
    const filterByRange = (docs) => docs.filter(doc => {
        const d = new Date(getDocDate(doc));
        return d >= from && d <= to;
    });

    let targetDocs = [];
    switch (valueField) {
        case 'quotation': targetDocs = filterByRange(salesQuotations); break;
        case 'sales_order': targetDocs = filterByRange(salesOrders); break;
        case 'delivery_note': targetDocs = filterByRange(deliveryOrders); break;
        case 'sales_invoice': targetDocs = filterByRange(salesInvoices); break;
        case 'sales_invoice_due': 
            targetDocs = filterByRange(salesInvoices).filter(inv => inv.status === 'UNPAID' || inv.status === 'PARTIAL'); 
            break;
        case 'payment_entry': targetDocs = filterByRange(salesPayments); break;
        default: targetDocs = filterByRange(salesOrders);
    }

    // Determine Groups for multi-line chart
    // If "Based On" is Customer or Item, we'll show Top 5.
    let groups = ['Overall'];
    if (basedOn === 'Customer') {
        const totals = {};
        targetDocs.forEach(d => {
            const name = customers.find(c => c.id === d.customerId)?.name || 'Unknown';
            totals[name] = (totals[name] || 0) + getDocValue(d);
        });
        groups = Object.keys(totals).sort((a,b) => totals[b] - totals[a]).slice(0, 5);
    } else if (basedOn === 'Item') {
        const totals = {};
        targetDocs.forEach(d => {
            (d.items || []).forEach(it => {
                const name = it.itemName || 'Unknown';
                totals[name] = (totals[name] || 0) + (parseFloat(it.subtotal) || 0);
            });
        });
        groups = Object.keys(totals).sort((a,b) => totals[b] - totals[a]).slice(0, 5);
    }

    const datasets = groups.map((g, idx) => {
        const color = ['#f472b6', '#60a5fa', '#34d399', '#fbbf24', '#a78bfa'][idx];
        const bucketData = buckets.map(b => {
            let sum = 0;
            targetDocs.forEach(d => {
                const dt = new Date(getDocDate(d));
                if (dt >= b.start && dt <= b.end) {
                    if (g === 'Overall') sum += getDocValue(d);
                    else if (basedOn === 'Customer') {
                        const cName = customers.find(c => c.id === d.customerId)?.name || 'Unknown';
                        if (cName === g) sum += getDocValue(d);
                    } else if (basedOn === 'Item') {
                        (d.items || []).forEach(it => { if (it.itemName === g) sum += (parseFloat(it.subtotal) || 0); });
                    }
                }
            });
            return sum;
        });

        return {
            label: g,
            data: bucketData,
            borderColor: color,
            backgroundColor: color + '15',
            pointBackgroundColor: color,
            pointBorderColor: '#fff',
            pointBorderWidth: 2,
            pointRadius: groups.length > 1 ? 3 : 5,
            tension: 0.3,
            fill: groups.length === 1,
            borderWidth: 2
        };
    });

    // Update chart title
    const title = document.getElementById('sa_chart_title');
    if (title) title.textContent = `Sales Analytics - By ${basedOn} (${period})`;

    // Draw chart
    const ctx = document.getElementById('sa_chart');
    if (!ctx) return;
    if (window._saChart) window._saChart.destroy();

    window._saChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: buckets.map(b => b.label),
            datasets: datasets
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: { mode: 'index', intersect: false },
            plugins: {
                legend: { display: groups.length > 1, position: 'top', align: 'end', labels: { boxWidth: 10, font: { size: 10, weight: 'bold' } } },
                tooltip: { callbacks: { label: ctx => ` ${ctx.dataset.label}: Rp ${formatNumber(ctx.parsed.y)}` } }
            },
            scales: {
                x: { grid: { color: 'rgba(51, 65, 85, 0.05)' }, ticks: { color: '#94a3b8', font: { size: 10 } } },
                y: { grid: { color: 'rgba(51, 65, 85, 0.05)' }, ticks: { color: '#94a3b8', font: { size: 10 }, callback: v => formatNumber(v) } }
            }
        }
    });

    // Update table (Aggregate Overall for Table)
    const thead = document.getElementById('sa_table_head');
    const tbody = document.getElementById('sa_table_body');
    if (!thead || !tbody) return;
    
    thead.innerHTML = `
        <th class="px-6 py-3 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Period</th>
        <th class="px-6 py-3 text-right text-[10px] font-black text-slate-400 uppercase tracking-widest">Total Value (Rp)</th>
    `;
    
    const overallData = buckets.map((b, i) => datasets.reduce((sum, ds) => sum + ds.data[i], 0));
    const grandTotal = overallData.reduce((sum, v) => sum + v, 0);

    tbody.innerHTML = buckets.map((b, i) => `
        <tr class="hover:bg-slate-50 transition-colors">
            <td class="px-6 py-3 text-sm text-slate-600 font-semibold">${b.label}</td>
            <td class="px-6 py-3 text-sm text-slate-800 font-mono text-right">${formatNumber(overallData[i])}</td>
        </tr>
    `).join('') + `
        <tr class="bg-blue-50/30 border-t-2 border-blue-100 font-black">
            <td class="px-6 py-4 text-sm text-blue-800 uppercase tracking-widest">Total Summary</td>
            <td class="px-6 py-4 text-sm text-right text-blue-700 font-mono">Rp ${formatNumber(grandTotal)}</td>
        </tr>
    `;
};

function getWeekNumber(d) {
    const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
    const dayNum = date.getUTCDay() || 7;
    date.setUTCDate(date.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
    return Math.ceil((((date - yearStart) / 86400000) + 1) / 7);
}

window.exportSalesAnalyticsCsv = () => {
    const period = document.getElementById('sa_period')?.value || 'Monthly';
    const basedOn = document.getElementById('sa_based_on')?.value || 'Customer';
    const rows = document.querySelectorAll('#sa_table_body tr');
    let csv = 'Period,Value\n';
    rows.forEach(r => {
        const cells = r.querySelectorAll('td');
        csv += `"${cells[0]?.textContent}","${cells[1]?.textContent}"\n`;
    });
    const blob = new Blob([csv], { type: 'text/csv' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `sales_analytics_${basedOn}_${period}.csv`;
    a.click();
};
// ─── End Sales Analytics ─────────────────────────────────────────────

// ─── Sales Invoice Trends ───────────────────────────────────────
function renderSalesInvoiceTrends() {
    document.getElementById('pageTitle').innerText = 'Sales Invoice Trends';
    const mainContent = document.getElementById('main-content');
    const currentYear = new Date().getFullYear();

    mainContent.innerHTML = `
        <div class="min-h-full flex flex-col font-sans bg-white">
            <!-- ERPNext-style compact header -->
            <div class="flex flex-wrap items-center gap-3 px-4 py-3 border-b border-gray-200 bg-white shadow-sm shrink-0">
                <select id="sit_period" onchange="updateSalesInvoiceTrends()"
                    class="bg-gray-100 border-none rounded-md px-3 py-1.5 text-[13px] text-gray-700 focus:outline-none hover:bg-gray-200 cursor-pointer outline-none">
                    <option value="Monthly" selected>Monthly</option>
                    <option value="Quarterly">Quarterly</option>
                    <option value="Half-Yearly">Half-Yearly</option>
                    <option value="Yearly">Yearly</option>
                </select>

                <select id="sit_based_on" onchange="updateSalesInvoiceTrends()"
                    class="bg-gray-100 border-none rounded-md px-3 py-1.5 text-[13px] text-gray-700 focus:outline-none hover:bg-gray-200 cursor-pointer outline-none">
                    <option value="Item">Item</option>
                    <option value="Customer">Customer</option>
                    <option value="Territory">Territory</option>
                </select>

                <select id="sit_group_by" class="bg-gray-100 border-none rounded-md px-3 py-1.5 text-[13px] text-gray-400 focus:outline-none cursor-not-allowed outline-none" disabled>
                    <option value="">Group By</option>
                </select>
                
                <input type="number" id="sit_year" value="${currentYear}" onchange="updateSalesInvoiceTrends()"
                    class="bg-gray-100 border-none rounded-md px-3 py-1.5 text-[13px] text-gray-700 focus:outline-none hover:bg-gray-200 outline-none w-24">

                <div class="flex-1"></div>
                <button onclick="exportSITrendsCsv()" class="bg-gray-100 border border-gray-200 rounded-md px-3 py-1.5 text-[13px] text-gray-700 transition-colors hover:bg-gray-200 shadow-sm">
                    Export
                </button>
            </div>
            
            <!-- Report Cache Message -->
            <div class="px-5 mt-4 mb-2 text-[13px] text-gray-500 font-medium flex items-center gap-2">
                <div class="w-2 h-2 rounded-full bg-[#e65c00]"></div>
                This report was generated just now.
            </div>

            <!-- Chart Area -->
            <div class="bg-white px-8 pt-8 pb-4 shrink-0 border-b border-gray-200 relative">
                <div style="height: 250px;">
                    <canvas id="sit_chart"></canvas>
                </div>
            </div>

            <!-- Trends Table Wrapper -->
            <div class="w-full overflow-x-auto bg-white border border-gray-200 border-t-0 border-x-0 relative">
                <table class="w-full text-left border-collapse" id="sit_table">
                    <thead class="bg-[#f9fafb] sticky top-0 z-20 shadow-[0_1px_0_#e5e7eb]">
                        <tr id="sit_thead" class="text-[13px] text-gray-600 border-b border-gray-200"></tr>
                    </thead>
                    <tbody id="sit_tbody" class="divide-y divide-gray-100 text-[13px] text-gray-800"></tbody>
                </table>
            </div>
            
            <!-- Help text footer -->
            <div class="px-5 py-3 bg-white border-t border-gray-200 shrink-0 flex justify-between items-center w-full mt-auto">
                <p class="text-[13px] text-gray-500">For comparison, use >5, <10 or =324. For ranges, use 5:10 (for values between 5 & 10).</p>
                <p class="text-[12px] text-gray-500 font-medium tracking-wide">Execution Time: ${(Math.random() * 0.05 + 0.01).toFixed(6)} sec</p>
            </div>
        </div>
    `;
    updateSalesInvoiceTrends();
}

window.updateSalesInvoiceTrends = () => {
    const year      = parseInt(document.getElementById('sit_year')?.value || new Date().getFullYear());
    const basedOn   = document.getElementById('sit_based_on')?.value || 'Item';
    const period    = document.getElementById('sit_period')?.value || 'Monthly';
    
    // Config periods based on period dropdown
    let periods = [];
    if (period === 'Monthly') periods = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    else if (period === 'Quarterly') periods = ['Q1', 'Q2', 'Q3', 'Q4'];
    else if (period === 'Half-Yearly') periods = ['H1', 'H2'];
    else if (period === 'Yearly') periods = [year.toString()];
    
    const invoices  = db.read('salesInvoices') || [];
    const customers = db.read('customers') || [];

    // Filter by year
    const yearInvs = invoices.filter(inv => {
        const d = new Date(inv.date || inv.createdAt);
        return d.getFullYear() === year;
    });

    // Build pivot: rowKey => { label, currency, periods: [{qty, amt}] }
    const pivot = {};
    const chartTotalAmt = Array(periods.length).fill(0);

    yearInvs.forEach(inv => {
        const date = new Date(inv.date || inv.createdAt);
        const monthIdx = date.getMonth();
        let pIdx = 0;
        
        if (period === 'Monthly') pIdx = monthIdx;
        else if (period === 'Quarterly') pIdx = Math.floor(monthIdx / 3);
        else if (period === 'Half-Yearly') pIdx = Math.floor(monthIdx / 6);
        else if (period === 'Yearly') pIdx = 0;
        const currency = 'IDR';

        chartTotalAmt[pIdx] += parseFloat(inv.totalAmount || inv.grandTotal || 0);

        if (basedOn.includes('Item')) {
            (inv.items || []).forEach(item => {
                const key   = item.inventoryItemId || item.productId || item.prodText || item.itemName || 'Unknown';
                const label = item.prodText || item.itemName || '-';
                const code  = item.inventoryItemId || item.productId || key;
                if (!pivot[key]) {
                    pivot[key] = { label, code, currency, periods: Array(periods.length).fill(null).map(() => ({qty:0, amt:0})) };
                }
                pivot[key].periods[pIdx].qty += parseFloat(item.qty) || 0;
                pivot[key].periods[pIdx].amt += parseFloat(item.subtotal) || 0;
            });
        } else {
            // Customer based
            const cust = customers.find(c => c.id === inv.customerId);
            const key   = inv.customerId || 'unknown';
            const label = cust?.name || inv.customerName || key;
            if (!pivot[key]) {
                pivot[key] = { label, code: key, currency, periods: Array(periods.length).fill(null).map(() => ({qty:0, amt:0})) };
            }
            (inv.items || []).forEach(item => {
                pivot[key].periods[pIdx].qty += parseFloat(item.qty) || 0;
            });
            pivot[key].periods[pIdx].amt += parseFloat(inv.totalAmount || inv.grandTotal || 0);
        }
    });

    const rows = Object.values(pivot);

    const chartColors = ['#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#f97316', '#ec4899', '#84cc16', '#14b8a6', '#6366f1'];
    const datasets = [{
        label: 'Total Invoice Value',
        data: chartTotalAmt,
        borderColor: '#9ca3af',
        borderDash: [5, 5],
        backgroundColor: 'transparent',
        pointBackgroundColor: '#9ca3af',
        pointBorderColor: '#fff',
        pointHoverBackgroundColor: '#fff',
        pointHoverBorderColor: '#9ca3af',
        borderWidth: 2,
        pointRadius: 0,
        pointHoverRadius: 6,
        tension: 0,
    }];

    const sortedRows = [...rows].sort((a, b) => b.periods.reduce((sum, v) => sum + v.amt, 0) - a.periods.reduce((sum, v) => sum + v.amt, 0));
    sortedRows.slice(0, 10).forEach((row, i) => {
        const color = chartColors[i % chartColors.length];
        datasets.push({
            label: row.label,
            data: row.periods.map(p => p.amt),
            borderColor: color,
            backgroundColor: 'transparent',
            pointBackgroundColor: color,
            pointBorderColor: '#fff',
            pointHoverBackgroundColor: '#fff',
            pointHoverBorderColor: color,
            borderWidth: 2,
            pointRadius: 0,
            pointHoverRadius: 6,
            tension: 0,
        });
    });

    // Draw Chart
    const ctx = document.getElementById('sit_chart');
    if (ctx) {
        if (window._sitChart) window._sitChart.destroy();
        window._sitChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: periods,
                datasets: datasets
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                interaction: { mode: 'index', intersect: false },
                plugins: {
                    legend: { display: true, position: 'bottom', labels: { boxWidth: 10, usePointStyle: true, font: { size: 10 } } },
                    tooltip: {
                        callbacks: {
                            label: c => ' ' + c.dataset.label + ': Rp ' + new Intl.NumberFormat('id-ID').format(c.parsed.y)
                        }
                    }
                },
                scales: {
                    x: { grid: { color: 'transparent', drawBorder: false }, ticks: { color: '#6b7280', font: { size: 10 } } },
                    y: {
                        grid: { color: '#f3f4f6', strokeDash: [3, 3] },
                        border: { display: false },
                        ticks: { 
                            color: '#6b7280', font: { size: 10 },
                            callback: v => {
                                if(v >= 1000000) return (v/1000000).toFixed(0) + ' M';
                                if(v >= 1000) return (v/1000).toFixed(0) + ' K';
                                return v;
                            }
                        },
                        beginAtZero: true
                    }
                }
            }
        });
    }

    // Thead
    const thead = document.getElementById('sit_thead');
    if (!thead) return;
    
    thead.innerHTML = `
        <th class="w-10 px-3 py-2 border-r border-[#e5e7eb] font-medium text-center"></th>
        <th class="min-w-[200px] px-3 py-2 border-r border-[#e5e7eb] font-medium">${basedOn}</th>
        <th class="px-3 py-2 border-r border-[#e5e7eb] font-medium">Currency</th>
        ${periods.map(p => `
            <th class="px-3 py-2 border-r border-[#e5e7eb] text-right font-medium">${p} (Qty)</th>
            <th class="px-3 py-2 border-r border-[#e5e7eb] text-right font-medium">${p} (Amt)</th>
        `).join('')}
    `;

    // Tbody
    const tbody = document.getElementById('sit_tbody');
    if (!tbody) return;

    // Grand totals
    const totQty = Array(periods.length).fill(0);
    const totAmt = Array(periods.length).fill(0);
    rows.forEach(row => {
        row.periods.forEach((m, i) => { totQty[i] += m.qty; totAmt[i] += m.amt; });
    });

    const formatNum = v => new Intl.NumberFormat('id-ID', { maximumFractionDigits: 3 }).format(v || 0);

    // Data rows
    tbody.innerHTML = rows.length === 0
        ? `<tr><td colspan="${3 + periods.length * 2}" class="text-center text-gray-500 py-10">No Data Available</td></tr>`
        : rows.map(row => `
        <tr class="hover:bg-gray-50 transition-colors group">
            <td class="px-3 py-2 border-r border-[#e5e7eb] bg-[#f9fafb] text-xs text-gray-400 text-center select-none w-10"></td>
            <td class="px-3 py-2 border-r border-[#e5e7eb] whitespace-nowrap">${row.label}</td>
            <td class="px-3 py-2 border-r border-[#e5e7eb] whitespace-nowrap text-gray-500">${row.currency}</td>
            ${row.periods.map(m => `
                <td class="px-3 py-2 border-r border-[#e5e7eb] text-right whitespace-nowrap">${formatNum(m.qty)}</td>
                <td class="px-3 py-2 border-r border-[#e5e7eb] text-right whitespace-nowrap"><span class="text-gray-400 text-[11px] mr-1">Rp</span>${formatNum(m.amt)}</td>
            `).join('')}
        </tr>
    `).join('');

    // Total row
    const totalRow = document.createElement('tr');
    totalRow.className = 'border-t border-[#e5e7eb] bg-[#f9fafb]';
    totalRow.innerHTML = `
        <td class="px-3 py-2 border-r border-[#e5e7eb] text-gray-500 font-medium text-xs text-center w-10">1</td>
        <td class="px-3 py-2 border-r border-[#e5e7eb] font-semibold">Total</td>
        <td class="px-3 py-2 border-r border-[#e5e7eb]"></td>
        ${totQty.map((q, i) => `
            <td class="px-3 py-2 border-r border-[#e5e7eb] text-right font-medium">${formatNum(q)}</td>
            <td class="px-3 py-2 border-r border-[#e5e7eb] text-right font-medium"><span class="text-gray-400 text-[11px] mr-1">Rp</span>${formatNum(totAmt[i])}</td>
        `).join('')}
    `;
    
    // set index for rows
    Array.from(tbody.children).forEach((tr, i) => {
        if(tr !== totalRow && tr.children[0] && tr.children.length > 1) {
            tr.children[0].innerHTML = i + 1;
        }
    });

    tbody.appendChild(totalRow);
};

window.exportSITrendsCsv = () => {
    const table = document.getElementById('sit_table');
    if (!table) return;
    let csv = '';
    // Skip the filter row (index 1 of thead)
    const trs = Array.from(table.querySelectorAll('tr'));
    trs.forEach(row => {
        if (row.id === 'sit_filter_row') return;
        const cells = [...row.querySelectorAll('th,td')].map(c => `"${c.textContent.trim().replace(/"/g, '""')}"`);
        csv += cells.join(',') + '\n';
    });
    const blob = new Blob([csv], { type: 'text/csv' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `sales_invoice_trends_${document.getElementById('sit_year')?.value || ''}.csv`;
    a.click();
};
// ─── Sales Quotation Trends ──────────────────────────────────

// ─── Sales Quotation Trends ──────────────────────────────────
window.renderSalesQuotationTrends = () => {
    document.getElementById('pageTitle').innerText = 'Quotations Trends';
    const mainContent = document.getElementById('main-content');
    const currentYear = new Date().getFullYear();

    mainContent.innerHTML = `
        <div class="min-h-full flex flex-col font-sans bg-white">
            <!-- ERPNext-style compact header -->
            <div class="flex flex-wrap items-center gap-3 px-4 py-3 border-b border-gray-200 bg-white shadow-sm shrink-0">
                <select id="sqt_period" onchange="updateSalesQuotationTrends()"
                    class="bg-gray-100 border-none rounded-md px-3 py-1.5 text-[13px] text-gray-700 focus:outline-none hover:bg-gray-200 cursor-pointer outline-none">
                    <option value="Monthly" selected>Monthly</option>
                    <option value="Quarterly">Quarterly</option>
                    <option value="Half-Yearly">Half-Yearly</option>
                    <option value="Yearly">Yearly</option>
                </select>

                <select id="sqt_based_on" onchange="updateSalesQuotationTrends()"
                    class="bg-gray-100 border-none rounded-md px-3 py-1.5 text-[13px] text-gray-700 focus:outline-none hover:bg-gray-200 cursor-pointer outline-none">
                    <option value="Item">Item</option>
                    <option value="Customer">Customer</option>
                    <option value="Territory">Territory</option>
                </select>

                <select id="sqt_group_by" class="bg-gray-100 border-none rounded-md px-3 py-1.5 text-[13px] text-gray-400 focus:outline-none cursor-not-allowed outline-none" disabled>
                    <option value="">Group By</option>
                </select>
                
                <input type="number" id="sqt_year" value="${currentYear}" onchange="updateSalesQuotationTrends()"
                    class="bg-gray-100 border-none rounded-md px-3 py-1.5 text-[13px] text-gray-700 focus:outline-none hover:bg-gray-200 outline-none w-24">

                <input type="text" id="sqt_customer" placeholder="Customer Name" onkeyup="updateSalesQuotationTrends()"
                    class="bg-gray-100 border-none rounded-md px-3 py-1.5 text-[13px] text-gray-700 focus:outline-none hover:bg-gray-200 outline-none w-48">

                <label class="flex items-center gap-2 text-[13px] text-gray-700 cursor-pointer ml-2">
                    <input type="checkbox" id="sqt_include_closed" onchange="updateSalesQuotationTrends()" class="rounded border-gray-300 text-blue-600 outline-none">
                    Include Closed Orders
                </label>

                <div class="flex-1"></div>
                <button onclick="exportSQTrendsCsv()" class="bg-gray-100 border border-gray-200 rounded-md px-3 py-1.5 text-[13px] text-gray-700 transition-colors hover:bg-gray-200 shadow-sm">
                    Export
                </button>
            </div>

            <!-- Report Cache Message -->
            <div class="px-8 mt-4 text-[13px] text-gray-500 font-medium flex items-center gap-2">
                <div class="w-2 h-2 rounded-full bg-[#e65c00]"></div>
                This report was generated just now.
            </div>

            <!-- Chart Area -->
            <div class="bg-white px-8 pt-8 pb-4 shrink-0 border-b border-gray-200 relative">
                <div style="height: 250px;">
                    <canvas id="sqt_chart"></canvas>
                </div>
            </div>

            <!-- Trends Table Wrapper -->
            <div class="w-full overflow-x-auto bg-white relative">
                <table class="w-full text-left border-collapse" id="sqt_table">
                    <thead class="bg-[#f9fafb] sticky top-0 z-20 shadow-[0_1px_0_#e5e7eb]">
                        <tr id="sqt_thead" class="text-[13px] text-gray-600 border-b border-gray-200"></tr>
                    </thead>
                    <tbody id="sqt_tbody" class="divide-y divide-gray-100 text-[13px] text-gray-800"></tbody>
                </table>
            </div>
            
            <!-- Help text footer -->
            <div class="px-4 py-3 bg-white border-t border-gray-200 shrink-0">
                <p class="text-[13px] text-gray-500">For comparison, use >5, <10 or =324. For ranges, use 5:10 (for values between 5 & 10).</p>
            </div>
        </div>
    `;
    updateSalesQuotationTrends();
};

window.updateSalesQuotationTrends = () => {
    const year          = parseInt(document.getElementById('sqt_year')?.value || new Date().getFullYear());
    const basedOn       = document.getElementById('sqt_based_on')?.value || 'Item';
    const period        = document.getElementById('sqt_period')?.value || 'Monthly';
    const custFilter    = (document.getElementById('sqt_customer')?.value || '').toLowerCase();
    const includeClosed = document.getElementById('sqt_include_closed')?.checked;
    
    let periods = [];
    if (period === 'Monthly') periods = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    else if (period === 'Quarterly') periods = ['Q1', 'Q2', 'Q3', 'Q4'];
    else if (period === 'Half-Yearly') periods = ['H1', 'H2'];
    else if (period === 'Yearly') periods = [year.toString()];
    
    let quotations = db.read('salesQuotations') || [];
    const customers = db.read('customers') || [];

    // Apply Filter logic
    quotations = quotations.filter(qt => {
        const d = new Date(qt.date || qt.createdAt);
        if (d.getFullYear() !== year) return false;
        
        // Status filter: by default, exclude rejected/canceled unless implemented. Let's say closed is completely shipped or closed manually.
        // Assuming 'CLOSED' or 'REJECTED' might be statuses.
        if (!includeClosed && (qt.status === 'CLOSED' || qt.status === 'REJECTED' || qt.status === 'CANCELED')) return false;
        
        // Customer text filter
        if (custFilter) {
            const cust = customers.find(c => c.id === qt.customerId);
            const cName = (cust?.name || qt.customerName || qt.customerId || '').toLowerCase();
            if (!cName.includes(custFilter)) return false;
        }
        return true;
    });

    const pivot = {};
    const chartTotalAmt = Array(periods.length).fill(0); // For the line chart (total amount per period)

    quotations.forEach(qt => {
        const date = new Date(qt.date || qt.createdAt);
        const monthIdx = date.getMonth();
        let pIdx = 0;
        
        if (period === 'Monthly') pIdx = monthIdx;
        else if (period === 'Quarterly') pIdx = Math.floor(monthIdx / 3);
        else if (period === 'Half-Yearly') pIdx = Math.floor(monthIdx / 6);
        else if (period === 'Yearly') pIdx = 0;
        
        const currency = 'IDR';

        chartTotalAmt[pIdx] += parseFloat(qt.totalAmount || qt.grandTotal || 0);

        if (basedOn.includes('Item')) {
            (qt.items || []).forEach(item => {
                const key   = item.inventoryItemId || item.productId || item.prodText || item.itemName || 'Unknown';
                const label = item.prodText || item.itemName || '-';
                const code  = item.inventoryItemId || item.productId || key;
                if (!pivot[key]) {
                    pivot[key] = { label, code, currency, periods: Array(periods.length).fill(null).map(() => ({qty:0, amt:0})) };
                }
                pivot[key].periods[pIdx].qty += parseFloat(item.qty) || 0;
                pivot[key].periods[pIdx].amt += parseFloat(item.subtotal) || 0;
            });
        } else {
            const cust = customers.find(c => c.id === qt.customerId);
            const key   = qt.customerId || 'unknown';
            const label = cust?.name || qt.customerName || key;
            if (!pivot[key]) {
                pivot[key] = { label, code: key, currency, periods: Array(periods.length).fill(null).map(() => ({qty:0, amt:0})) };
            }
            (qt.items || []).forEach(item => {
                pivot[key].periods[pIdx].qty += parseFloat(item.qty) || 0;
            });
            pivot[key].periods[pIdx].amt += parseFloat(qt.totalAmount || qt.grandTotal || 0);
        }
    });

    const rows = Object.values(pivot);

    const chartColors = ['#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#f97316', '#ec4899', '#84cc16', '#14b8a6', '#6366f1'];
    const datasets = [{
        label: 'Total Quotation Value',
        data: chartTotalAmt,
        borderColor: '#9ca3af',
        borderDash: [5, 5],
        backgroundColor: 'transparent',
        pointBackgroundColor: '#9ca3af',
        pointBorderColor: '#fff',
        pointHoverBackgroundColor: '#fff',
        pointHoverBorderColor: '#9ca3af',
        borderWidth: 2,
        pointRadius: 0,
        pointHoverRadius: 6,
        tension: 0,
    }];

    const sortedRows = [...rows].sort((a, b) => b.periods.reduce((sum, v) => sum + v.amt, 0) - a.periods.reduce((sum, v) => sum + v.amt, 0));
    sortedRows.slice(0, 10).forEach((row, i) => {
        const color = chartColors[i % chartColors.length];
        datasets.push({
            label: row.label,
            data: row.periods.map(p => p.amt),
            borderColor: color,
            backgroundColor: 'transparent',
            pointBackgroundColor: color,
            pointBorderColor: '#fff',
            pointHoverBackgroundColor: '#fff',
            pointHoverBorderColor: color,
            borderWidth: 2,
            pointRadius: 0,
            pointHoverRadius: 6,
            tension: 0,
        });
    });

    // Draw Chart
    const ctx = document.getElementById('sqt_chart');
    if (ctx) {
        if (window._sqtChart) window._sqtChart.destroy();
        window._sqtChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: periods,
                datasets: datasets
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                interaction: { mode: 'index', intersect: false },
                plugins: {
                    legend: { display: true, position: 'bottom', labels: { boxWidth: 10, usePointStyle: true, font: { size: 10 } } },
                    tooltip: {
                        callbacks: {
                            label: c => ' ' + c.dataset.label + ': Rp ' + new Intl.NumberFormat('id-ID').format(c.parsed.y)
                        }
                    }
                },
                scales: {
                    x: {
                        grid: { color: 'transparent', drawBorder: false },
                        ticks: { color: '#6b7280', font: { size: 10 } }
                    },
                    y: {
                        grid: { color: '#f3f4f6', strokeDash: [3, 3] },
                        border: { display: false },
                        ticks: { 
                            color: '#6b7280', 
                            font: { size: 10 },
                            callback: v => {
                                if(v >= 1000000) return (v/1000000).toFixed(0) + ' M';
                                if(v >= 1000) return (v/1000).toFixed(0) + ' K';
                                return v;
                            }
                        },
                        beginAtZero: true
                    }
                }
            }
        });
    }

    // Thead
    const thead = document.getElementById('sqt_thead');
    if (!thead) return;
    
    thead.innerHTML = `
        <th class="w-10 px-3 py-2 border-r border-[#e5e7eb] font-medium text-center"></th>
        <th class="min-w-[200px] px-3 py-2 border-r border-[#e5e7eb] font-medium">${basedOn}</th>
        <th class="px-3 py-2 border-r border-[#e5e7eb] font-medium">Currency</th>
        ${periods.map(p => `
            <th class="px-3 py-2 border-r border-[#e5e7eb] text-right font-medium">${p} (Qty)</th>
            <th class="px-3 py-2 border-r border-[#e5e7eb] text-right font-medium">${p} (Amt)</th>
        `).join('')}
    `;

    const tbody = document.getElementById('sqt_tbody');
    if (!tbody) return;

    const totQty = Array(periods.length).fill(0);
    const totAmt = Array(periods.length).fill(0);
    rows.forEach(row => {
        row.periods.forEach((m, i) => { totQty[i] += m.qty; totAmt[i] += m.amt; });
    });

    const formatNum = v => new Intl.NumberFormat('id-ID', { maximumFractionDigits: 3 }).format(v || 0);

    tbody.innerHTML = rows.length === 0
        ? `<tr><td colspan="${3 + periods.length * 2}" class="text-center text-gray-500 py-10">No Data Available</td></tr>`
        : rows.map(row => `
        <tr class="hover:bg-gray-50 transition-colors group">
            <td class="px-3 py-2 border-r border-[#e5e7eb] bg-[#f9fafb] text-xs text-gray-400 text-center select-none w-10"></td>
            <td class="px-3 py-2 border-r border-[#e5e7eb] whitespace-nowrap">${row.label}</td>
            <td class="px-3 py-2 border-r border-[#e5e7eb] whitespace-nowrap text-gray-500">${row.currency}</td>
            ${row.periods.map(m => `
                <td class="px-3 py-2 border-r border-[#e5e7eb] text-right whitespace-nowrap">${formatNum(m.qty)}</td>
                <td class="px-3 py-2 border-r border-[#e5e7eb] text-right whitespace-nowrap"><span class="text-gray-400 text-[11px] mr-1">Rp</span>${formatNum(m.amt)}</td>
            `).join('')}
        </tr>
    `).join('');

    const totalRow = document.createElement('tr');
    totalRow.className = 'border-t border-[#e5e7eb] bg-[#f9fafb]';
    totalRow.innerHTML = `
        <td class="px-3 py-2 border-r border-[#e5e7eb] text-gray-500 font-medium text-xs text-center w-10">1</td>
        <td class="px-3 py-2 border-r border-[#e5e7eb] font-semibold">Total</td>
        <td class="px-3 py-2 border-r border-[#e5e7eb]"></td>
        ${totQty.map((q, i) => `
            <td class="px-3 py-2 border-r border-[#e5e7eb] text-right font-medium">${formatNum(q)}</td>
            <td class="px-3 py-2 border-r border-[#e5e7eb] text-right font-medium"><span class="text-gray-400 text-[11px] mr-1">Rp</span>${formatNum(totAmt[i])}</td>
        `).join('')}
    `;
    
    Array.from(tbody.children).forEach((tr, i) => {
        if(tr !== totalRow && tr.children[0] && tr.children.length > 1) {
            tr.children[0].innerHTML = i + 1;
        }
    });

    tbody.appendChild(totalRow);
};

window.exportSQTrendsCsv = () => {
    const table = document.getElementById('sqt_table');
    if (!table) return;
    let csv = '';
    const trs = Array.from(table.querySelectorAll('tr'));
    trs.forEach(row => {
        if (row.id === 'sqt_filter_row') return;
        const cells = [...row.querySelectorAll('th,td')].map(c => `"${c.textContent.trim().replace(/"/g, '""')}"`);
        csv += cells.join(',') + '\n';
    });
    const blob = new Blob([csv], { type: 'text/csv' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `sales_quotation_trends_${document.getElementById('sqt_year')?.value || ''}.csv`;
    a.click();
};

// ─── Sales Order Trends ───────────────────────────────────────
window.renderSalesOrderTrends = () => {
    document.getElementById('pageTitle').innerText = 'Sales Orders Trends';
    const mainContent = document.getElementById('main-content');
    const currentYear = new Date().getFullYear();

    mainContent.innerHTML = `
        <div class="min-h-full flex flex-col font-sans bg-white">
            <!-- ERPNext-style compact header -->
            <div class="flex flex-wrap items-center gap-3 px-4 py-3 border-b border-gray-200 bg-white shadow-sm shrink-0">
                <select id="sot_period" onchange="updateSalesOrderTrends()"
                    class="bg-gray-100 border-none rounded-md px-3 py-1.5 text-[13px] text-gray-700 focus:outline-none hover:bg-gray-200 cursor-pointer outline-none">
                    <option value="Monthly" selected>Monthly</option>
                    <option value="Quarterly">Quarterly</option>
                    <option value="Half-Yearly">Half-Yearly</option>
                    <option value="Yearly">Yearly</option>
                </select>

                <select id="sot_based_on" onchange="updateSalesOrderTrends()"
                    class="bg-gray-100 border-none rounded-md px-3 py-1.5 text-[13px] text-gray-700 focus:outline-none hover:bg-gray-200 cursor-pointer outline-none">
                    <option value="Item">Item</option>
                    <option value="Customer">Customer</option>
                    <option value="Territory">Territory</option>
                </select>

                <select id="sot_group_by" class="bg-gray-100 border-none rounded-md px-3 py-1.5 text-[13px] text-gray-400 focus:outline-none cursor-not-allowed outline-none" disabled>
                    <option value="">Group By</option>
                </select>
                
                <input type="number" id="sot_year" value="${currentYear}" onchange="updateSalesOrderTrends()"
                    class="bg-gray-100 border-none rounded-md px-3 py-1.5 text-[13px] text-gray-700 focus:outline-none hover:bg-gray-200 outline-none w-24">

                <input type="text" id="sot_customer" placeholder="Customer Name" onkeyup="updateSalesOrderTrends()"
                    class="bg-gray-100 border-none rounded-md px-3 py-1.5 text-[13px] text-gray-700 focus:outline-none hover:bg-gray-200 outline-none w-48">

                <label class="flex items-center gap-2 text-[13px] text-gray-700 cursor-pointer ml-2">
                    <input type="checkbox" id="sot_include_closed" onchange="updateSalesOrderTrends()" class="rounded border-gray-300 text-blue-600 outline-none">
                    Include Closed Orders
                </label>

                <div class="flex-1"></div>
                <button onclick="exportSOTrendsCsv()" class="bg-gray-100 border border-gray-200 rounded-md px-3 py-1.5 text-[13px] text-gray-700 transition-colors hover:bg-gray-200 shadow-sm">
                    Export
                </button>
            </div>

            <!-- Report Cache Message -->
            <div class="px-8 mt-4 text-[13px] text-gray-500 font-medium flex items-center gap-2">
                <div class="w-2 h-2 rounded-full bg-[#e65c00]"></div>
                This report was generated just now.
            </div>

            <!-- Chart Area -->
            <div class="bg-white px-8 pt-8 pb-4 shrink-0 border-b border-gray-200 relative">
                <div style="height: 250px;">
                    <canvas id="sot_chart"></canvas>
                </div>
            </div>

            <!-- Trends Table Wrapper -->
            <div class="w-full overflow-x-auto bg-white relative">
                <table class="w-full text-left border-collapse" id="sot_table">
                    <thead class="bg-[#f9fafb] sticky top-0 z-20 shadow-[0_1px_0_#e5e7eb]">
                        <tr id="sot_thead" class="text-[13px] text-gray-600 border-b border-gray-200"></tr>
                    </thead>
                    <tbody id="sot_tbody" class="divide-y divide-gray-100 text-[13px] text-gray-800"></tbody>
                </table>
            </div>
            
            <!-- Help text footer -->
            <div class="px-5 py-3 bg-white border-t border-gray-200 shrink-0 flex justify-between items-center w-full mt-auto">
                <p class="text-[13px] text-gray-500">For comparison, use >5, <10 or =324. For ranges, use 5:10 (for values between 5 & 10).</p>
                <p class="text-[12px] text-gray-500 font-medium tracking-wide">Execution Time: ${(Math.random() * 0.05 + 0.01).toFixed(6)} sec</p>
            </div>
        </div>
    `;
    updateSalesOrderTrends();
};

window.updateSalesOrderTrends = () => {
    const year          = parseInt(document.getElementById('sot_year')?.value || new Date().getFullYear());
    const basedOn       = document.getElementById('sot_based_on')?.value || 'Item';
    const period        = document.getElementById('sot_period')?.value || 'Monthly';
    const custFilter    = (document.getElementById('sot_customer')?.value || '').toLowerCase();
    const includeClosed = document.getElementById('sot_include_closed')?.checked;
    
    let periods = [];
    if (period === 'Monthly') periods = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    else if (period === 'Quarterly') periods = ['Q1', 'Q2', 'Q3', 'Q4'];
    else if (period === 'Half-Yearly') periods = ['H1', 'H2'];
    else if (period === 'Yearly') periods = [year.toString()];
    
    let orders = db.read('salesOrders') || [];
    const customers = db.read('customers') || [];

    // Apply Filter logic
    orders = orders.filter(so => {
        const d = new Date(so.date || so.createdAt);
        if (d.getFullYear() !== year) return false;
        
        if (!includeClosed && (so.status === 'CLOSED' || so.status === 'REJECTED' || so.status === 'CANCELED')) return false;
        
        if (custFilter) {
            const cust = customers.find(c => c.id === so.customerId);
            const cName = (cust?.name || so.customerName || so.customerId || '').toLowerCase();
            if (!cName.includes(custFilter)) return false;
        }
        return true;
    });

    const pivot = {};
    const chartTotalAmt = Array(periods.length).fill(0); 

    orders.forEach(so => {
        const date = new Date(so.date || so.createdAt);
        const monthIdx = date.getMonth();
        let pIdx = 0;
        
        if (period === 'Monthly') pIdx = monthIdx;
        else if (period === 'Quarterly') pIdx = Math.floor(monthIdx / 3);
        else if (period === 'Half-Yearly') pIdx = Math.floor(monthIdx / 6);
        else if (period === 'Yearly') pIdx = 0;
        
        const currency = 'IDR';

        chartTotalAmt[pIdx] += parseFloat(so.totalAmount || so.grandTotal || 0);

        if (basedOn.includes('Item')) {
            (so.items || []).forEach(item => {
                const key   = item.inventoryItemId || item.productId || item.prodText || item.itemName || 'Unknown';
                const label = item.prodText || item.itemName || '-';
                if (!pivot[key]) {
                    pivot[key] = { label, currency, periods: Array(periods.length).fill(null).map(() => ({qty:0, amt:0})) };
                }
                pivot[key].periods[pIdx].qty += parseFloat(item.qty) || 0;
                pivot[key].periods[pIdx].amt += parseFloat(item.subtotal) || 0;
            });
        } else {
            const cust = customers.find(c => c.id === so.customerId);
            const key   = so.customerId || 'unknown';
            const label = cust?.name || so.customerName || key;
            if (!pivot[key]) {
                pivot[key] = { label, currency, periods: Array(periods.length).fill(null).map(() => ({qty:0, amt:0})) };
            }
            (so.items || []).forEach(item => {
                pivot[key].periods[pIdx].qty += parseFloat(item.qty) || 0;
            });
            pivot[key].periods[pIdx].amt += parseFloat(so.totalAmount || so.grandTotal || 0);
        }
    });

    const rows = Object.values(pivot);

    const chartColors = ['#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#f97316', '#ec4899', '#84cc16', '#14b8a6', '#6366f1'];
    const datasets = [{
        label: 'Total Order Value',
        data: chartTotalAmt,
        borderColor: '#9ca3af',
        borderDash: [5, 5],
        backgroundColor: 'transparent',
        pointBackgroundColor: '#9ca3af',
        pointBorderColor: '#fff',
        pointHoverBackgroundColor: '#fff',
        pointHoverBorderColor: '#9ca3af',
        borderWidth: 2,
        pointRadius: 0,
        pointHoverRadius: 6,
        tension: 0,
    }];

    const sortedRows = [...rows].sort((a, b) => b.periods.reduce((sum, v) => sum + v.amt, 0) - a.periods.reduce((sum, v) => sum + v.amt, 0));
    sortedRows.slice(0, 10).forEach((row, i) => {
        const color = chartColors[i % chartColors.length];
        datasets.push({
            label: row.label,
            data: row.periods.map(p => p.amt),
            borderColor: color,
            backgroundColor: 'transparent',
            pointBackgroundColor: color,
            pointBorderColor: '#fff',
            pointHoverBackgroundColor: '#fff',
            pointHoverBorderColor: color,
            borderWidth: 2,
            pointRadius: 0,
            pointHoverRadius: 6,
            tension: 0,
        });
    });

    // Draw Chart
    const ctx = document.getElementById('sot_chart');
    if (ctx) {
        if (window._sotChart) window._sotChart.destroy();
        window._sotChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: periods,
                datasets: datasets
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                interaction: { mode: 'index', intersect: false },
                plugins: {
                    legend: { display: true, position: 'bottom', labels: { boxWidth: 10, usePointStyle: true, font: { size: 10 } } },
                    tooltip: {
                        callbacks: {
                            label: c => ' ' + c.dataset.label + ': Rp ' + new Intl.NumberFormat('id-ID').format(c.parsed.y)
                        }
                    }
                },
                scales: {
                    x: { grid: { color: 'transparent', drawBorder: false }, ticks: { color: '#6b7280', font: { size: 10 } } },
                    y: {
                        grid: { color: '#f3f4f6', strokeDash: [3, 3] },
                        border: { display: false },
                        ticks: { 
                            color: '#6b7280', font: { size: 10 },
                            callback: v => {
                                if(v >= 1000000) return (v/1000000).toFixed(0) + ' M';
                                if(v >= 1000) return (v/1000).toFixed(0) + ' K';
                                return v;
                            }
                        },
                        beginAtZero: true
                    }
                }
            }
        });
    }

    // Thead
    const thead = document.getElementById('sot_thead');
    if (!thead) return;
    
    thead.innerHTML = `
        <th class="w-10 px-3 py-2 border-r border-[#e5e7eb] font-medium text-center"></th>
        <th class="min-w-[200px] px-3 py-2 border-r border-[#e5e7eb] font-medium">${basedOn}</th>
        <th class="px-3 py-2 border-r border-[#e5e7eb] font-medium">Currency</th>
        ${periods.map(p => `
            <th class="px-3 py-2 border-r border-[#e5e7eb] text-right font-medium">${p} (Qty)</th>
            <th class="px-3 py-2 border-r border-[#e5e7eb] text-right font-medium">${p} (Amt)</th>
        `).join('')}
    `;

    const tbody = document.getElementById('sot_tbody');
    if (!tbody) return;

    const totQty = Array(periods.length).fill(0);
    const totAmt = Array(periods.length).fill(0);
    rows.forEach(row => {
        row.periods.forEach((m, i) => { totQty[i] += m.qty; totAmt[i] += m.amt; });
    });

    const formatNum = v => new Intl.NumberFormat('id-ID', { maximumFractionDigits: 3 }).format(v || 0);

    tbody.innerHTML = rows.length === 0
        ? `<tr><td colspan="${3 + periods.length * 2}" class="text-center text-gray-500 py-10">No Data Available</td></tr>`
        : rows.map(row => `
        <tr class="hover:bg-gray-50 transition-colors group">
            <td class="px-3 py-2 border-r border-[#e5e7eb] bg-[#f9fafb] text-xs text-gray-400 text-center select-none w-10"></td>
            <td class="px-3 py-2 border-r border-[#e5e7eb] whitespace-nowrap">${row.label}</td>
            <td class="px-3 py-2 border-r border-[#e5e7eb] whitespace-nowrap text-gray-500">${row.currency}</td>
            ${row.periods.map(m => `
                <td class="px-3 py-2 border-r border-[#e5e7eb] text-right whitespace-nowrap">${formatNum(m.qty)}</td>
                <td class="px-3 py-2 border-r border-[#e5e7eb] text-right whitespace-nowrap"><span class="text-gray-400 text-[11px] mr-1">Rp</span>${formatNum(m.amt)}</td>
            `).join('')}
        </tr>
    `).join('');

    const totalRow = document.createElement('tr');
    totalRow.className = 'border-t border-[#e5e7eb] bg-[#f9fafb]';
    totalRow.innerHTML = `
        <td class="px-3 py-2 border-r border-[#e5e7eb] text-gray-500 font-medium text-xs text-center w-10">1</td>
        <td class="px-3 py-2 border-r border-[#e5e7eb] font-semibold">Total</td>
        <td class="px-3 py-2 border-r border-[#e5e7eb]"></td>
        ${totQty.map((q, i) => `
            <td class="px-3 py-2 border-r border-[#e5e7eb] text-right font-medium">${formatNum(q)}</td>
            <td class="px-3 py-2 border-r border-[#e5e7eb] text-right font-medium"><span class="text-gray-400 text-[11px] mr-1">Rp</span>${formatNum(totAmt[i])}</td>
        `).join('')}
    `;
    
    Array.from(tbody.children).forEach((tr, i) => {
        if(tr !== totalRow && tr.children[0] && tr.children.length > 1) {
            tr.children[0].innerHTML = i + 1;
        }
    });

    tbody.appendChild(totalRow);
};

window.exportSOTrendsCsv = () => {
    const table = document.getElementById('sot_table');
    if (!table) return;
    let csv = '';
    const trs = Array.from(table.querySelectorAll('tr'));
    trs.forEach(row => {
        const cells = [...row.querySelectorAll('th,td')].map(c => `"${c.textContent.trim().replace(/"/g, '""')}"`);
        csv += cells.join(',') + '\n';
    });
    const blob = new Blob([csv], { type: 'text/csv' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `sales_order_trends_${document.getElementById('sot_year')?.value || ''}.csv`;
    a.click();
};

window.renderSalesRegionTrends = () => {
    document.getElementById('pageTitle').innerText = 'Sales By Region';
    const mainContent = document.getElementById('main-content');
    const currentYear = new Date().getFullYear();

    mainContent.innerHTML = `
        <div class="min-h-full flex flex-col font-sans bg-white">
            <!-- ERPNext-style compact header -->
            <div class="flex flex-wrap items-center gap-3 px-4 py-3 border-b border-gray-200 bg-white shadow-sm shrink-0">
                <select id="srt_period" onchange="updateSalesRegionTrends()"
                    class="bg-gray-100 border-none rounded-md px-3 py-1.5 text-[13px] text-gray-700 focus:outline-none hover:bg-gray-200 cursor-pointer outline-none">
                    <option value="Monthly" selected>Monthly</option>
                    <option value="Quarterly">Quarterly</option>
                    <option value="Half-Yearly">Half-Yearly</option>
                    <option value="Yearly">Yearly</option>
                </select>

                <select id="srt_based_on" class="bg-gray-100 border-none rounded-md px-3 py-1.5 text-[13px] text-gray-400 focus:outline-none cursor-not-allowed outline-none" disabled>
                    <option value="Region">Region</option>
                </select>

                <input type="number" id="srt_year" value="${currentYear}" onchange="updateSalesRegionTrends()"
                    class="bg-gray-100 border-none rounded-md px-3 py-1.5 text-[13px] text-gray-700 focus:outline-none hover:bg-gray-200 outline-none w-24">

                <label class="flex items-center gap-2 text-[13px] text-gray-700 cursor-pointer ml-2">
                    <input type="checkbox" id="srt_include_closed" onchange="updateSalesRegionTrends()" class="rounded border-gray-300 text-blue-600 outline-none">
                    Include Closed Orders
                </label>

                <div class="flex-1"></div>
                <button onclick="exportSalesRegionCsv()" class="bg-gray-100 border border-gray-200 rounded-md px-3 py-1.5 text-[13px] text-gray-700 transition-colors hover:bg-gray-200 shadow-sm">
                    Export
                </button>
            </div>

            <!-- Report Cache Message -->
            <div class="px-8 mt-4 text-[13px] text-gray-500 font-medium flex items-center gap-2">
                <div class="w-2 h-2 rounded-full bg-[#e65c00]"></div>
                This report was generated just now.
            </div>

            <!-- Chart Area -->
            <div class="bg-white px-8 pt-8 pb-4 shrink-0 border-b border-gray-200 relative">
                <div style="height: 250px;">
                    <canvas id="srt_chart"></canvas>
                </div>
            </div>

            <!-- Trends Table Wrapper -->
            <div class="w-full overflow-x-auto bg-white relative">
                <table class="w-full text-left border-collapse" id="srt_table">
                    <thead class="bg-[#f9fafb] sticky top-0 z-20 shadow-[0_1px_0_#e5e7eb]">
                        <tr id="srt_thead" class="text-[13px] text-gray-600 border-b border-gray-200"></tr>
                    </thead>
                    <tbody id="srt_tbody" class="divide-y divide-gray-100 text-[13px] text-gray-800"></tbody>
                </table>
            </div>
            
            <!-- Help text footer -->
            <div class="px-5 py-3 bg-white border-t border-gray-200 shrink-0 flex justify-between items-center w-full mt-auto">
                <p class="text-[13px] text-gray-500">Sales volume in Quantity (Kg) per region based on Customer Master data.</p>
                <p class="text-[12px] text-gray-500 font-medium tracking-wide">Execution Time: ${(Math.random() * 0.05 + 0.01).toFixed(6)} sec</p>
            </div>
        </div>
    `;
    updateSalesRegionTrends();
};

window.updateSalesRegionTrends = () => {
    const year          = parseInt(document.getElementById('srt_year')?.value || new Date().getFullYear());
    const period        = document.getElementById('srt_period')?.value || 'Monthly';
    const includeClosed = document.getElementById('srt_include_closed')?.checked;
    
    let periods = [];
    if (period === 'Monthly') periods = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    else if (period === 'Quarterly') periods = ['Q1', 'Q2', 'Q3', 'Q4'];
    else if (period === 'Half-Yearly') periods = ['H1', 'H2'];
    else if (period === 'Yearly') periods = [year.toString()];
    
    let orders = db.read('salesOrders') || [];
    const customers = db.read('customers') || [];

    // Apply Filter logic
    orders = orders.filter(so => {
        const d = new Date(so.date || so.createdAt);
        if (d.getFullYear() !== year) return false;
        
        if (!includeClosed && (so.status === 'CLOSED' || so.status === 'REJECTED' || so.status === 'CANCELED')) return false;
        return true;
    });

    const pivot = {};
    const chartTotalQty = Array(periods.length).fill(0); 

    orders.forEach(so => {
        const date = new Date(so.date || so.createdAt);
        const monthIdx = date.getMonth();
        let pIdx = 0;
        
        if (period === 'Monthly') pIdx = monthIdx;
        else if (period === 'Quarterly') pIdx = Math.floor(monthIdx / 3);
        else if (period === 'Half-Yearly') pIdx = Math.floor(monthIdx / 6);
        else if (period === 'Yearly') pIdx = 0;
        
        const cust = customers.find(c => c.id === so.customerId);
        let region = cust?.region || cust?.city || 'Unknown';
        if (region.trim() === '') region = 'Unknown';

        if (!pivot[region]) {
            pivot[region] = { periods: Array(periods.length).fill(0) };
        }

        let orderQty = 0;
        (so.items || []).forEach(item => {
            const q = parseFloat(item.qty) || 0;
            pivot[region].periods[pIdx] += q;
            orderQty += q;
        });
        
        chartTotalQty[pIdx] += orderQty;
    });

    const rows = Object.entries(pivot).map(([region, data]) => ({ region, periods: data.periods }));

    const chartColors = ['#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#f97316', '#ec4899', '#84cc16', '#14b8a6', '#6366f1'];
    const datasets = [{
        label: 'Total Qty (Kg)',
        data: chartTotalQty,
        borderColor: '#9ca3af',
        borderDash: [5, 5],
        backgroundColor: 'transparent',
        pointBackgroundColor: '#9ca3af',
        pointBorderColor: '#fff',
        pointHoverBackgroundColor: '#fff',
        pointHoverBorderColor: '#9ca3af',
        borderWidth: 2,
        pointRadius: 0,
        pointHoverRadius: 6,
        tension: 0,
    }];

    const sortedRows = [...rows].sort((a, b) => b.periods.reduce((sum, v) => sum + v, 0) - a.periods.reduce((sum, v) => sum + v, 0));
    sortedRows.slice(0, 10).forEach((row, i) => {
        const color = chartColors[i % chartColors.length];
        datasets.push({
            label: row.region,
            data: row.periods,
            borderColor: color,
            backgroundColor: 'transparent',
            pointBackgroundColor: color,
            pointBorderColor: '#fff',
            pointHoverBackgroundColor: '#fff',
            pointHoverBorderColor: color,
            borderWidth: 2,
            pointRadius: 0,
            pointHoverRadius: 6,
            tension: 0,
        });
    });

    // Draw Chart
    const ctx = document.getElementById('srt_chart');
    if (ctx) {
        if (window._srtChart) window._srtChart.destroy();
        window._srtChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: periods,
                datasets: datasets
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                interaction: { mode: 'index', intersect: false },
                plugins: {
                    legend: { display: true, position: 'bottom', labels: { boxWidth: 10, usePointStyle: true, font: { size: 10 } } },
                    tooltip: {
                        callbacks: {
                            label: c => ' ' + c.dataset.label + ': ' + new Intl.NumberFormat('id-ID').format(c.parsed.y) + ' Kg'
                        }
                    }
                },
                scales: {
                    x: { grid: { color: 'transparent', drawBorder: false }, ticks: { color: '#6b7280', font: { size: 10 } } },
                    y: {
                        grid: { color: '#f3f4f6', strokeDash: [3, 3] },
                        border: { display: false },
                        ticks: { 
                            color: '#6b7280', font: { size: 10 },
                            callback: v => {
                                if(v >= 1000000) return (v/1000000).toFixed(0) + ' M';
                                if(v >= 1000) return (v/1000).toFixed(0) + ' K';
                                return v;
                            }
                        },
                        beginAtZero: true
                    }
                }
            }
        });
    }

    // Thead
    const thead = document.getElementById('srt_thead');
    if (!thead) return;
    
    thead.innerHTML = `
        <th class="w-10 px-3 py-2 border-r border-[#e5e7eb] font-medium text-center"></th>
        <th class="min-w-[200px] px-3 py-2 border-r border-[#e5e7eb] font-medium">Region</th>
        ${periods.map(p => `
            <th class="px-3 py-2 border-r border-[#e5e7eb] text-right font-medium">${p} (Qty Kg)</th>
        `).join('')}
    `;

    const tbody = document.getElementById('srt_tbody');
    if (!tbody) return;

    const totQty = Array(periods.length).fill(0);
    rows.forEach(row => {
        row.periods.forEach((qty, i) => { totQty[i] += qty; });
    });

    const formatNum = v => new Intl.NumberFormat('id-ID', { maximumFractionDigits: 3 }).format(v || 0);

    tbody.innerHTML = rows.length === 0
        ? `<tr><td colspan="${2 + periods.length}" class="text-center text-gray-500 py-10">No Data Available</td></tr>`
        : rows.map(row => `
        <tr class="hover:bg-gray-50 transition-colors group">
            <td class="px-3 py-2 border-r border-[#e5e7eb] bg-[#f9fafb] text-xs text-gray-400 text-center select-none w-10"></td>
            <td class="px-3 py-2 border-r border-[#e5e7eb] whitespace-nowrap">${row.region}</td>
            ${row.periods.map(qty => `
                <td class="px-3 py-2 border-r border-[#e5e7eb] text-right whitespace-nowrap">${formatNum(qty)}</td>
            `).join('')}
        </tr>
    `).join('');

    const totalRow = document.createElement('tr');
    totalRow.className = 'border-t border-[#e5e7eb] bg-[#f9fafb]';
    totalRow.innerHTML = `
        <td class="px-3 py-2 border-r border-[#e5e7eb] text-gray-500 font-medium text-xs text-center w-10">1</td>
        <td class="px-3 py-2 border-r border-[#e5e7eb] font-semibold">Total</td>
        ${totQty.map((q) => `
            <td class="px-3 py-2 border-r border-[#e5e7eb] text-right font-medium">${formatNum(q)}</td>
        `).join('')}
    `;
    
    Array.from(tbody.children).forEach((tr, i) => {
        if(tr !== totalRow && tr.children[0] && tr.children.length > 1) {
            tr.children[0].innerHTML = i + 1;
        }
    });

    tbody.appendChild(totalRow);
};

window.exportSalesRegionCsv = () => {
    const table = document.getElementById('srt_table');
    if (!table) return;
    let csv = '';
    const trs = Array.from(table.querySelectorAll('tr'));
    trs.forEach(row => {
        const cells = [...row.querySelectorAll('th,td')].map(c => `"${c.textContent.trim().replace(/"/g, '""')}"`);
        csv += cells.join(',') + '\n';
    });
    const blob = new Blob([csv], { type: 'text/csv' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `sales_region_report_${document.getElementById('srt_year')?.value || ''}.csv`;
    a.click();
};

window.runSalesReport = () => {
    const fromStr = document.getElementById('report_from').value;
    const toStr = document.getElementById('report_to').value;
    const filterProdId = document.getElementById('report_product_id').value;
    const filterCustId = document.getElementById('report_customer_id').value;
    const filterRegion = document.getElementById('report_region').value;
    if (!fromStr || !toStr) { showToast('Isi tanggal dari dan sampai', 'error'); return; }

    const from = new Date(fromStr); from.setHours(0, 0, 0, 0);
    const to = new Date(toStr); to.setHours(23, 59, 59, 999);

    let sos = db.read('salesOrders').filter(so => {
        const d = new Date(so.date);
        return d >= from && d <= to;
    });

    const customers = db.read('customers');

    // Sub-filter by Region
    if (filterRegion) {
        sos = sos.filter(so => {
            const cust = customers.find(c => c.id === so.customerId);
            return cust && cust.region === filterRegion;
        });
    }

    // Sub-filter by Customer
    if (filterCustId) {
        sos = sos.filter(so => so.customerId === filterCustId);
    }

    // Sub-filter by Product
    if (filterProdId) {
        sos = sos.filter(so => (so.items || []).some(item =>
            item.inventoryItemId === filterProdId ||
            item.productId === filterProdId ||
            item.prodText === filterProdId ||
            item.itemName === filterProdId
        ));
    }

    const invoices = db.read('salesInvoices');
    const selectedCust = filterCustId ? customers.find(c => c.id === filterCustId) : null;

    // Summary stats
    const totalOrders = sos.length;
    const confirmedOrders = sos.filter(s => ['CONFIRMED', 'DELIVERED'].includes(s.status)).length;
    const totalRevenue = sos.filter(s => s.status !== 'DRAFT').reduce((sum, s) => sum + (s.totalAmount || 0), 0);

    // Top products
    const prodMap = {};
    sos.forEach(so => {
        (so.items || []).forEach(item => {
            const key = item.prodText || item.itemName || 'Unknown';
            if (!prodMap[key]) prodMap[key] = { name: key, unit: item.prodUnit || '', qty: 0, revenue: 0 };
            prodMap[key].qty += parseFloat(item.qty) || 0;
            prodMap[key].revenue += parseFloat(item.subtotal) || 0;
        });
    });
    const topProducts = Object.values(prodMap).sort((a, b) => b.qty - a.qty).slice(0, 10);

    // Per-order rows
    const orderRows = sos.map(so => {
        const cust = customers.find(c => c.id === so.customerId) || { name: 'Unknown' };
        let statusBadge = `<span class="px-2 py-0.5 rounded text-xs font-semibold bg-gray-100 text-gray-600">${so.status}</span>`;
        if (so.status === 'CONFIRMED') statusBadge = `<span class="px-2 py-0.5 rounded text-xs font-semibold bg-blue-100 text-blue-700">CONFIRMED</span>`;
        if (so.status === 'DELIVERED') statusBadge = `<span class="px-2 py-0.5 rounded text-xs font-semibold bg-green-100 text-green-700">DELIVERED</span>`;

        const inv = invoices.find(i => i.salesOrderId === so.id);
        const invLink = inv ? `<a href="#" onclick="viewInvoice('${inv.id}'); return false;" class="text-blue-600 font-bold hover:underline">${inv.invoiceNumber}</a>` : '<span class="text-gray-400">-</span>';

        return `<tr class="border-b border-gray-100 hover:bg-gray-50 text-sm">
            <td class="py-2 px-4 font-medium">${invLink}</td>
            <td class="py-2 px-4 text-gray-600">${formatDate(so.date).slice(0, 11)}</td>
            <td class="py-2 px-4 text-gray-800">${cust.name}</td>
            <td class="py-2 px-4 text-right font-medium text-gray-800">${formatCurrency(so.totalAmount)}</td>
            <td class="py-2 px-4 text-center">${statusBadge}</td>
        </tr>`;
    }).join('') || `<tr><td colspan="5" class="py-6 text-center text-gray-500 text-sm">Tidak ada order dalam rentang tanggal ini.</td></tr>`;

    const topProdRows = topProducts.map((p, idx) => `
        <tr class="border-b border-gray-100 hover:bg-gray-50 text-sm">
            <td class="py-2 px-4">
                <span class="inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold mr-2 ${idx === 0 ? 'bg-yellow-100 text-yellow-700' : idx === 1 ? 'bg-gray-200 text-gray-600' : idx === 2 ? 'bg-orange-100 text-orange-700' : 'bg-indigo-50 text-blue-600'}">${idx + 1}</span>
                ${p.name}
            </td>
            <td class="py-2 px-4 text-right font-bold text-blue-700">${p.qty.toLocaleString('id-ID')} ${p.unit}</td>
            <td class="py-2 px-4 text-right text-gray-700">${formatCurrency(p.revenue)}</td>
        </tr>
    `).join('') || `<tr><td colspan="3" class="py-6 text-center text-gray-500 text-sm">Tidak ada data produk.</td></tr>`;

    document.getElementById('sales_report_output').innerHTML = `
        ${selectedCust ? `
        <div class="bg-indigo-50 border border-indigo-100 rounded-xl p-4 mb-6 flex items-center gap-4">
            <div class="bg-indigo-600 text-white w-12 h-12 rounded-full flex items-center justify-center text-xl shadow-md">
                <i class="fas fa-user-tie"></i>
            </div>
            <div>
                <h4 class="text-lg font-bold text-indigo-900">${selectedCust.name}</h4>
                <p class="text-sm text-indigo-700">${selectedCust.contactPerson ? `PIC: ${selectedCust.contactPerson} | ` : ''}${selectedCust.phone || 'No Phone'}</p>
            </div>
            <div class="ml-auto">
                <button onclick="viewCustomerHistory('${selectedCust.id}')" class="bg-white text-indigo-600 border border-indigo-200 px-4 py-2 rounded-lg text-sm font-bold hover:bg-indigo-600 hover:text-white transition-all shadow-sm">
                    <i class="fas fa-history mr-2"></i>Full History
                </button>
            </div>
        </div>
        ` : ''}

        <!-- Summary Cards -->
        <div class="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
            <div class="bg-white rounded-xl shadow-sm border border-gray-100 p-5 flex items-center gap-4">
                <div class="rounded-full bg-blue-100 p-3"><i class="fas fa-shopping-cart text-blue-600 text-lg"></i></div>
                <div>
                    <p class="text-xs text-gray-500 font-medium">${filterCustId ? 'Order Customer' : 'Total Order Masuk'}</p>
                    <p class="text-2xl font-bold text-gray-800">${totalOrders}</p>
                    <p class="text-xs text-gray-400">${confirmedOrders} dikonfirmasi/dikirim</p>
                </div>
            </div>
            <div class="bg-white rounded-xl shadow-sm border border-gray-100 p-5 flex items-center gap-4">
                <div class="rounded-full bg-green-100 p-3"><i class="fas fa-chart-line text-green-600 text-lg"></i></div>
                <div>
                    <p class="text-xs text-gray-500 font-medium">${filterCustId ? 'Nilai Transaksi' : 'Total Omzet'}</p>
                    <p class="text-2xl font-bold text-gray-800">${formatCurrency(totalRevenue)}</p>
                    <p class="text-xs text-gray-400">dari ${fromStr} s/d ${toStr}</p>
                </div>
            </div>
            <div class="bg-white rounded-xl shadow-sm border border-gray-100 p-5 flex items-center gap-4">
                <div class="rounded-full ${filterProdId ? 'bg-orange-100' : 'bg-purple-100'} p-3"><i class="fas fa-box ${filterProdId ? 'text-orange-600' : 'text-purple-600'} text-lg"></i></div>
                <div>
                    <p class="text-xs text-gray-500 font-medium">${filterProdId ? 'Total Qty Terjual' : 'Jenis Produk Terjual'}</p>
                    <p class="text-2xl font-bold text-gray-800">${filterProdId ? (prodMap[Object.keys(prodMap)[0]]?.qty || 0).toLocaleString('id-ID') : Object.keys(prodMap).length}</p>
                    <p class="text-xs text-gray-400">${filterProdId ? (prodMap[Object.keys(prodMap)[0]]?.unit || '') : 'produk berbeda'}</p>
                </div>
            </div>
        </div>

        <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <!-- Top Products -->
            <div class="bg-white rounded-xl shadow-sm border border-gray-100">
                <div class="p-5 border-b border-gray-100">
                    <h3 class="text-base font-semibold text-gray-800"><i class="fas fa-trophy mr-2 text-yellow-500"></i>Produk Terlaris ${filterCustId ? 'oleh Customer' : ''}</h3>
                </div>
                <div class="overflow-x-auto">
                    <table class="w-full">
                        <thead>
                            <tr class="bg-gray-50 text-xs uppercase tracking-wider text-gray-500 border-b border-gray-200">
                                <th class="py-3 px-4 text-left">Produk</th>
                                <th class="py-3 px-4 text-right">Total Qty</th>
                                <th class="py-3 px-4 text-right">Omzet</th>
                            </tr>
                        </thead>
                        <tbody>${topProdRows}</tbody>
                    </table>
                </div>
            </div>

            <!-- Order List -->
            <div class="bg-white rounded-xl shadow-sm border border-gray-100">
                <div class="p-5 border-b border-gray-100">
                    <h3 class="text-base font-semibold text-gray-800"><i class="fas fa-list-alt mr-2 text-blue-500"></i>Daftar Pesanan ${filterCustId ? 'Customer' : ''}</h3>
                </div>
                <div class="overflow-x-auto">
                    <table class="w-full">
                        <thead>
                            <tr class="bg-gray-50 text-xs uppercase tracking-wider text-gray-500 border-b border-gray-200">
                                <th class="py-3 px-4 text-left">No. INV</th>
                                <th class="py-3 px-4 text-left">Tanggal</th>
                                <th class="py-3 px-4 text-left">Customer</th>
                                <th class="py-3 px-4 text-right">Total</th>
                                <th class="py-3 px-4 text-center">Status</th>
                            </tr>
                        </thead>
                        <tbody>${orderRows}</tbody>
                    </table>
                </div>
            </div>
        </div>
    `;
};


// --- Bill of Material (BOM) Module ---
function renderBOM() {
    document.getElementById('pageTitle').innerText = 'Bill of Material (BOM)';
    const mainContent = document.getElementById('main-content');

    const boms = db.read('boms');
    const products = db.read('products');

    let rows = boms.map(bom => {
        const fg = products.find(p => p.id === bom.productId) || { name: 'Unknown', unit: '' };

        return `
        <tr class="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                <td class="py-3 px-4 text-sm font-medium text-purple-600">${bom.bomNumber}</td>
                <td class="py-3 px-4 text-sm text-gray-800">${fg.name}</td>
                <td class="py-3 px-4 text-sm text-gray-600">1 ${fg.unit}</td>
                <td class="py-3 px-4 text-sm text-gray-800 text-center">${bom.shrinkagePct || 0}%</td>
                <td class="py-3 px-4 text-sm text-center">${bom.items.length} Item</td>
                <td class="py-3 px-4 text-sm text-right">
                    <button onclick="viewBOM('${bom.id}')" class="text-gray-500 hover:text-gray-700 mr-2" title="Detail"><i class="fas fa-eye"></i></button>
                    <button onclick="deleteBOM('${bom.id}')" class="text-red-500 hover:text-red-700" title="Delete"><i class="fas fa-trash"></i></button>
                </td>
            </tr>
        `;
    }).join('');

    if (boms.length === 0) rows = `<tr > <td colspan="6" class="py-4 text-center text-gray-500">Belum ada Master BOM</td></tr> `;

    mainContent.innerHTML = `
        <div class="bg-white rounded-lg shadow-sm border border-gray-100">
            <div class="flex justify-between items-center p-4 sm:p-6 border-b border-gray-100">
                <h2 class="text-lg font-semibold text-gray-800">Daftar Bill of Material</h2>
                <button onclick="openLegacyBOMModal()" class="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-md transition-colors text-sm font-medium">
                    <i class="fas fa-plus mr-2"></i>Buat BOM Baru
                </button>
            </div>
            <div class="overflow-x-auto">
                <table class="w-full text-left border-collapse">
                    <thead>
                        <tr class="bg-gray-50 border-b border-gray-200">
                            <th class="py-3 px-4 text-xs font-semibold text-gray-600 uppercase tracking-wider">No. BOM</th>
                            <th class="py-3 px-4 text-xs font-semibold text-gray-600 uppercase tracking-wider">Produk Jadi (FG)</th>
                            <th class="py-3 px-4 text-xs font-semibold text-gray-600 uppercase tracking-wider">Qty Hasil</th>
                            <th class="py-3 px-4 text-xs font-semibold text-gray-600 uppercase tracking-wider text-center">Shrinkage %</th>
                            <th class="py-3 px-4 text-xs font-semibold text-gray-600 uppercase tracking-wider text-center">Komponen</th>
                            <th class="py-3 px-4 text-xs font-semibold text-gray-600 uppercase tracking-wider text-right">Aksi</th>
                        </tr>
                    </thead>
                    <tbody>${rows}</tbody>
                </table>
            </div>
        </div>
        `;

}

// --- BOM Helper Functions ---
window.openLegacyBOMModal = () => {
    const fg = products.filter(p => p.type === 'FINISHED_GOODS' || p.type === 'WIP');
    const rm = products.filter(p => p.type === 'RAW_MATERIAL' || p.type === 'WIP');

    const fgOptions = fg.map(p => `<option value="${p.id}" data-unit="${p.unit}"> ${p.code} - ${p.name}</option> `).join('');
    const rmOptions = rm.map(p => `<option value="${p.id}" data-unit="${p.unit}"> ${p.code} - ${p.name}</option> `).join('');

    const body = `
        <div class="space-y-4">
                <div class="grid grid-cols-2 gap-4">
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-1">No. BOM</label>
                        <input type="text" id="bom_number" value="BOM-${Date.now().toString().slice(-6)}" class="w-full border border-gray-300 rounded px-3 py-2 bg-gray-50" readonly>
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-1">Penyusutan Default (Shrinkage %)</label>
                        <div class="relative">
                            <input type="number" id="bom_shrinkage" value="0" min="0" max="100" class="w-full border border-gray-300 rounded px-3 py-2">
                            <div class="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-gray-500">%</div>
                        </div>
                    </div>
                </div>
                <div>
                    <label class="block text-sm font-medium text-gray-700 mb-1">Produk Jadi (Hasil 1 Satuan)</label>
                    <select id="bom_product" class="w-full border border-gray-300 rounded px-3 py-2 bg-white">${fgOptions}</select>
                </div>
                
                <div class="border-t border-gray-200 pt-4 mt-4">
                    <h4 class="text-md font-medium text-gray-800 mb-2">Komponen Bahan Baku</h4>
                    <p class="text-xs text-gray-500 mb-2">Masukkan kebutuhan riil bahan baku untuk menghasilkan 1 satuan Produk Jadi di atas.</p>
                    <div class="flex space-x-2 mb-2">
                        <select id="bom_item_prod" class="flex-1 border border-gray-300 rounded px-2 py-1 text-sm">${rmOptions}</select>
                        <input type="number" id="bom_item_qty" placeholder="Qty Dibutuhkan" step="0.01" min="0.01" class="w-32 border border-gray-300 rounded px-2 py-1 text-sm">
                        <button type="button" onclick="addBOMItemRow()" class="bg-gray-800 text-white px-3 py-1 rounded text-sm"><i class="fas fa-plus"></i></button>
                    </div>
                    
                    <table class="w-full text-sm text-left border mb-2">
                        <thead class="bg-gray-50">
                            <tr><th>Bahan Baku</th><th class="text-right">Qty Teoritis</th><th></th></tr>
                        </thead>
                        <tbody id="bom_items_list"></tbody>
                    </table>
                </div>
            </div>
        `;

    const footer = `
        <button type="button" onclick="saveNewBOM()" class="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-purple-600 text-white font-medium focus:outline-none sm:ml-3 sm:w-auto sm:text-sm"> Simpan Master BOM</button>
            <button type="button" onclick="closeModal()" class="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-gray-700 font-medium sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm">Batal</button>
    `;

    window.tempBOMItems = [];
    showModal('Buat Standar BOM', body, footer, 'xl');
};

window.addBOMItemRow = () => {
    const prodSelect = document.getElementById('bom_item_prod');
    const prodId = prodSelect.value;
    const prodText = prodSelect.options[prodSelect.selectedIndex].text;
    const prodUnit = prodSelect.options[prodSelect.selectedIndex].dataset.unit;

    const qty = parseFloat(document.getElementById('bom_item_qty').value);

    if (!prodId || !qty) { showToast('Bahan baku dan Qty harus diisi', 'error'); return; }

    window.tempBOMItems.push({ id: Date.now().toString(), productId: prodId, prodText, prodUnit, qty });

    document.getElementById('bom_item_qty').value = '';
    refreshBOMItemsTable();
};

window.removeBOMItemRow = (itemId) => {
    window.tempBOMItems = window.tempBOMItems.filter(i => i.id !== itemId);
    refreshBOMItemsTable();
};

window.refreshBOMItemsTable = () => {
    const tbody = document.getElementById('bom_items_list');
    tbody.innerHTML = window.tempBOMItems.map(item => `
        <tr class="border-t">
                <td class="px-2 py-1">${item.prodText}</td>
                <td class="px-2 py-1 text-right">${formatNumber(item.qty)} ${item.prodUnit}</td>
                <td class="px-2 py-1 text-center"><button class="text-red-500" onclick="removeBOMItemRow('${item.id}')"><i class="fas fa-times"></i></button></td>
            </tr>
        `).join('');
};

window.saveNewBOM = () => {
    if (window.tempBOMItems.length === 0) { showToast('BOM harus memiliki minimal 1 bahan baku', 'error'); return; }

    const bomNumber = document.getElementById('bom_number').value;
    const productId = document.getElementById('bom_product').value;
    const shrinkagePct = parseFloat(document.getElementById('bom_shrinkage').value) || 0;

    // Ensure BOM for this product doesn't already exist (for simple validation)
    const existing = db.read('boms').find(b => b.productId === productId);
    if (existing) {
        if (!confirm('BOM untuk produk ini sudah ada. Lanjutkan untuk membuat versi baru?')) return;
    }

    db.insert('boms', {
        bomNumber,
        productId,
        shrinkagePct,
        items: window.tempBOMItems
    });

    showToast('Master BOM berhasil disimpan');
    closeModal();
    renderBOM();
};

window.deleteLegacyBOM = (id) => {
    if (confirm('Yakin hapus BOM ini?')) {
        db.delete('boms', id);
        renderBOM();
    }
}

window.viewBOM = (id) => {
    const bom = db.findById('boms', id);
    const fg = products.find(p => p.id === bom.productId) || { name: 'Unknown', unit: '' };

    const body = `
        <div class="mb-4">
                <p><strong>No. BOM:</strong> ${bom.bomNumber}</p>
                <p><strong>Produk Hasil:</strong> 1 ${fg.unit} ${fg.name}</p>
                <p><strong>Estimasi Penyusutan (Shrinkage):</strong> ${bom.shrinkagePct || 0}%</p>
            </div>
            <h5 class="font-bold mb-2">Komposisi (Untuk hasil 1 ${fg.unit}):</h5>
            <table class="w-full text-sm text-left border">
                <thead class="bg-gray-50 border-b">
                    <tr><th class="p-2">Material</th><th class="p-2 text-right">Kebutuhan (Qty)</th></tr>
                </thead>
                <tbody>
                    ${bom.items.map(i => `<tr><td class="p-2 border-b">${i.prodText}</td><td class="p-2 border-b text-right">${formatNumber(i.qty)} ${i.prodUnit}</td></tr>`).join('')}
                </tbody>
            </table>
    `;
    showModal(`Detail BOM-${fg.name} `, body, ` <button onclick="closeModal()" class="w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-gray-700 font-medium sm:text-sm"> Tutup</button> `);
}

// --- Production Orders Module ---
function renderProductionOrders() {
    document.getElementById('pageTitle').innerText = 'Production Orders';
    const mainContent = document.getElementById('main-content');

    const productions = db.read('productionOrders').sort((a, b) => new Date(b.date) - new Date(a.date));
    const boms = db.read('boms');
    const products = db.read('products');

    let rows = productions.map(prod => {
        const bom = boms.find(b => b.id === prod.bomId);
        const fg = bom ? products.find(p => p.id === bom.productId) : null;
        const fgName = fg ? fg.name : 'Unknown';

        let statusBadge = '';
        if (prod.status === 'PLANNED') statusBadge = '<span class="px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs font-semibold">PLANNED</span>';
        if (prod.status === 'IN_PROGRESS') statusBadge = '<span class="px-2 py-1 bg-yellow-100 text-yellow-700 rounded text-xs font-semibold">IN PROGRESS</span>';
        if (prod.status === 'COMPLETED') statusBadge = '<span class="px-2 py-1 bg-green-100 text-green-700 rounded text-xs font-semibold">COMPLETED</span>';

        let actions = `<button onclick="viewProduction('${prod.id}')" class="text-gray-500 hover:text-gray-700 mr-2" title="Detail"> <i class="fas fa-eye"></i></button> `;

        if (prod.status === 'PLANNED') {
            actions += `
        <button onclick="startProduction('${prod.id}')" class="text-yellow-600 hover:text-yellow-800 font-bold text-xs bg-yellow-50 px-2 py-1 rounded border border-yellow-200 mr-2"> Start</button>
            <button onclick="deleteProduction('${prod.id}')" class="text-red-500 hover:text-red-700" title="Delete"><i class="fas fa-trash"></i></button>
    `;
        } else if (prod.status === 'IN_PROGRESS') {
            actions += `<button onclick="openCompleteProductionModal('${prod.id}')" class="text-green-600 hover:text-green-800 font-bold text-xs bg-green-50 px-2 py-1 rounded border border-green-200"> Complete & Report</button> `;
        }

        return `
        <tr class="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                <td class="py-3 px-4 text-sm font-medium text-orange-600">${prod.prodNumber}</td>
                <td class="py-3 px-4 text-sm text-gray-600">${formatDate(prod.date).slice(0, 11)}</td>
                <td class="py-3 px-4 text-sm text-gray-800 font-medium">${fgName}</td>
                <td class="py-3 px-4 text-sm text-gray-800 text-right">${prod.targetQty} ${fg ? fg.unit : ''}</td>
                <td class="py-3 px-4 text-sm text-center">${statusBadge}</td>
                <td class="py-3 px-4 text-sm text-right">${actions}</td>
            </tr>
        `;
    }).join('');

    if (productions.length === 0) rows = `<tr > <td colspan="6" class="py-4 text-center text-gray-500">Belum ada Order Produksi</td></tr> `;

    mainContent.innerHTML = `
        <div class="bg-white rounded-lg shadow-sm border border-gray-100">
            <div class="flex justify-between items-center p-4 sm:p-6 border-b border-gray-100">
                <h2 class="text-lg font-semibold text-gray-800">Daftar Production Order</h2>
                <button onclick="openProductionModal()" class="bg-orange-600 hover:bg-orange-700 text-white px-4 py-2 rounded-md transition-colors text-sm font-medium">
                    <i class="fas fa-plus mr-2"></i>Rencana Produksi Baru
                </button>
            </div>
            <div class="overflow-x-auto">
                <table class="w-full text-left border-collapse">
                    <thead>
                        <tr class="bg-gray-50 border-b border-gray-200">
                            <th class="py-3 px-4 text-xs font-semibold text-gray-600 uppercase tracking-wider">No. Produksi</th>
                            <th class="py-3 px-4 text-xs font-semibold text-gray-600 uppercase tracking-wider">Tanggal</th>
                            <th class="py-3 px-4 text-xs font-semibold text-gray-600 uppercase tracking-wider">Target Produk (FG)</th>
                            <th class="py-3 px-4 text-xs font-semibold text-gray-600 uppercase tracking-wider text-right">Target Qty</th>
                            <th class="py-3 px-4 text-xs font-semibold text-gray-600 uppercase tracking-wider text-center">Status</th>
                            <th class="py-3 px-4 text-xs font-semibold text-gray-600 uppercase tracking-wider text-right">Aksi</th>
                        </tr>
                    </thead>
                    <tbody>${rows}</tbody>
                </table>
            </div>
        </div>
        `;

}

// --- Production Helper Functions ---
window.openProductionModal = () => {
    const bomOptions = boms.map(b => {
        const p = products.find(x => x.id === b.productId);
        return p ? `<option value="${b.id}"> ${b.bomNumber} - ${p.name}</option> ` : '';
    }).join('');

    const body = `
        <div class="space-y-4">
                <div class="grid grid-cols-2 gap-4">
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-1">No. Produksi</label>
                        <input type="text" id="prod_number" value="PRD-${Date.now().toString().slice(-6)}" class="w-full border border-gray-300 rounded px-3 py-2 bg-gray-50" readonly>
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-1">Tanggal Rencana</label>
                        <input type="date" id="prod_date" value="${new Date().toISOString().split('T')[0]}" class="w-full border border-gray-300 rounded px-3 py-2">
                    </div>
                </div>
                <div>
                    <label class="block text-sm font-medium text-gray-700 mb-1">Pilih Resep (BOM)</label>
                    <select id="prod_bom" class="w-full border border-gray-300 rounded px-3 py-2 bg-white" onchange="window.calculateProdEstimation()">${bomOptions}</select>
                </div>
                <div>
                    <label class="block text-sm font-medium text-gray-700 mb-1">Target Quantity Hasil (FG)</label>
                    <input type="number" id="prod_target_qty" min="1" value="1" class="w-full border border-gray-300 rounded px-3 py-2" onchange="window.calculateProdEstimation()" onkeyup="window.calculateProdEstimation()">
                </div>
                
                <div class="border-t border-gray-200 pt-4 mt-4 bg-orange-50 p-4 rounded-md">
                    <h4 class="text-md font-medium text-orange-800 mb-2"><i class="fas fa-calculator mr-2"></i>Estimasi Kebutuhan Bahan (Termasuk Penyusutan)</h4>
                    <div id="prod_estimation_result" class="text-sm">Silakan pilih BOM dan Target Qty.</div>
                </div>
            </div>
        `;

    const footer = `
        <button type="button" onclick="saveNewProduction()" class="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-orange-600 text-white font-medium focus:outline-none sm:ml-3 sm:w-auto sm:text-sm"> Simpan Rencana</button>
            <button type="button" onclick="closeModal()" class="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-gray-700 font-medium sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm">Batal</button>
    `;

    showModal('Buat SPK Produksi', body, footer, 'xl');
    setTimeout(() => window.calculateProdEstimation(), 100);
};

window.calculateProdEstimation = () => {
    const bomId = document.getElementById('prod_bom').value;
    const targetQty = parseFloat(document.getElementById('prod_target_qty').value) || 0;
    const resultDiv = document.getElementById('prod_estimation_result');

    if (!bomId || targetQty <= 0) { resultDiv.innerHTML = '-'; return; }

    const bom = db.findById('boms', bomId);
    const shrinkage = bom.shrinkagePct || 0;

    let html = `
        <p class="mb-2 text-orange-700 font-medium"> BOM Shrinkage: ${shrinkage}%</p>
            <table class="w-full text-left bg-white border border-orange-200 rounded">
                <thead class="bg-orange-100/50">
                    <tr><th class="p-2 border-b">Bahan Baku</th><th class="p-2 border-b text-right">Kebutuhan Dasar</th><th class="p-2 border-b text-right">+ Shrinkage</th><th class="p-2 border-b text-right font-bold">Total Kebutuhan</th></tr>
                </thead>
                <tbody>
                    `;

    bom.items.forEach(item => {
        const baseNeed = item.qty * targetQty;
        const shrinkValue = baseNeed * (shrinkage / 100);
        const totalNeed = baseNeed + shrinkValue;

        html += `<tr>
                        <td class="p-2 border-b">${item.prodText}</td>
                        <td class="p-2 border-b text-right">${baseNeed.toFixed(2)}</td>
                        <td class="p-2 border-b text-right text-red-500">${shrinkValue.toFixed(2)}</td>
                        <td class="p-2 border-b text-right font-bold">${totalNeed.toFixed(2)}</td>
                    </tr>`;
    });

    html += `</tbody></table>`;
    resultDiv.innerHTML = html;
};

window.saveNewProduction = () => {
    const prodNumber = document.getElementById('prod_number').value;
    const bomId = document.getElementById('prod_bom').value;
    const targetQty = parseFloat(document.getElementById('prod_target_qty').value);
    const date = document.getElementById('prod_date').value;

    if (!bomId || !targetQty) { showToast('Data tidak lengkap', 'error'); return; }

    db.insert('productionOrders', {
        prodNumber,
        date: date ? new Date(date).toISOString() : new Date().toISOString(),
        bomId,
        targetQty,
        status: 'PLANNED'
    });

    showToast('Rencana Produksi Tersimpan');
    closeModal();
    renderProductionOrders();
};

// Very Important: Validates RAW MATERIAL stock BEFORE starting production
window.startProduction = (id) => {
    const prod = db.findById('productionOrders', id);
    if (!prod) return;

    const bom = db.findById('boms', prod.bomId);
    const shrinkage = bom.shrinkagePct || 0;

    const stockErrors = [];

    // 1. Calculate Required Stock and Validate
    bom.items.forEach(item => {
        const baseNeed = item.qty * prod.targetQty;
        const totalNeed = baseNeed + (baseNeed * (shrinkage / 100)); // Effective RM Usage

        const hasEnough = db.validateStockSufficiency(item.productId, totalNeed);
        if (!hasEnough) {
            stockErrors.push(`${item.prodText}-Butuh: ${totalNeed.toFixed(2)}, Tersedia: ${db.getCurrentStock(item.productId)} `);
        }
    });

    if (stockErrors.length > 0) {
        alert("GAGAL MULAI PRODUKSI (Stok Bahan Baku Tidak Cukup):\n\n" + stockErrors.join("\n"));
        return;
    }

    if (confirm('Mulai produksi? Bahan baku akan di-reserve.')) {
        db.update('productionOrders', id, { status: 'IN_PROGRESS' });
        showToast('Produksi dimulai!', 'success');
        renderProductionOrders();
    }
};

// Report actual usage and cut stock
window.openCompleteProductionModal = (id) => {
    const prod = db.findById('productionOrders', id);
    const bom = db.findById('boms', prod.bomId);
    const shrinkage = bom.shrinkagePct || 0;

    let itemsHtml = '';
    bom.items.forEach(item => {
        const baseNeed = item.qty * prod.targetQty;
        const calculatedNeed = baseNeed + (baseNeed * (shrinkage / 100)); // Default suggested

        itemsHtml += `
        <tr class="border-b">
                    <td class="p-2 font-medium">${item.prodText}</td>
                    <td class="p-2 text-right text-gray-500">${calculatedNeed.toFixed(2)}</td>
                    <td class="p-2">
                        <input type="number" step="0.01" class="actual-usage-input w-full border border-gray-300 rounded px-2 py-1 text-right" 
                            data-prodid="${item.productId}" data-unit="${item.prodUnit}" value="${calculatedNeed.toFixed(2)}">
                    </td>
                </tr>
        `;
    });

    const body = `
        <div class="mb-4 bg-orange-50 p-4 border border-orange-100 rounded">
                <p><strong>Produksi:</strong> ${prod.prodNumber}</p>
                <p><strong>Target Hasil:</strong> ${prod.targetQty}</p>
            </div>
            <p class="text-sm text-gray-600 mb-2">Konfirmasi Penggunaan Bahan Baku Riil (Actual Usage). Anda dapat mengubah angka jika penggunaan riil berbeda dari kalkulasi sistem.</p>
            
            <table class="w-full text-sm text-left border mb-4">
                <thead class="bg-gray-50 border-b">
                    <tr><th class="p-2">Material</th><th class="p-2 text-right">Kalkulasi Sistem (Termasuk Waste)</th><th class="p-2">Penggunaan Riil (Actual)</th></tr>
                </thead>
                <tbody>${itemsHtml}</tbody>
            </table>

            <div class="border-t pt-4">
                <label class="block text-sm font-medium text-gray-700 mb-1">Hasil Produksi Aktual (FG)</label>
                <input type="number" id="actual_fg_qty" value="${prod.targetQty}" min="1" class="w-full border border-gray-300 rounded px-3 py-2 text-xl font-bold text-green-700">
            </div>
    `;

    const footer = `
        <button type="button" onclick="completeProduction('${id}')" class="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-green-600 text-white font-medium focus:outline-none sm:ml-3 sm:w-auto sm:text-sm"> Posting Hasil & Potong Stok</button>
            <button type="button" onclick="closeModal()" class="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-gray-700 font-medium sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm">Batal</button>
    `;

    showModal('Laporan Selesai Produksi', body, footer);
};

window.completeProduction = (id) => {
    const prod = db.findById('productionOrders', id);
    const bom = db.findById('boms', prod.bomId);

    const actualFgQty = parseFloat(document.getElementById('actual_fg_qty').value);
    if (!actualFgQty) { showToast('Hasil produksi aktual harus diisi', 'error'); return; }

    // Gather actual usage input
    const inputs = document.querySelectorAll('.actual-usage-input');
    const actualUsages = [];
    let validationFailed = false;

    inputs.forEach(input => {
        const val = parseFloat(input.value);
        const pId = input.dataset.prodid;
        if (isNaN(val) || val <= 0) validationFailed = true;

        // Strict Validation Again: Can't report usage more than physical stock
        if (!db.validateStockSufficiency(pId, val)) {
            alert(`Penggunaan aktual untuk material ID ${pId} melebihi dari sisa stok di gudang!`);
            validationFailed = true;
        }

        actualUsages.push({ productId: pId, qty: val });
    });

    if (validationFailed) return;

    if (!confirm('Data final? Stok bahan baku akan dipotong dan stok barang jadi akan ditambah.')) return;

    // 1. Deduct RM Stock
    actualUsages.forEach(usage => {
        db.addInventoryTransaction(
            usage.productId,
            'OUT',
            usage.qty,
            'PRODUCTION_OUT',
            prod.id,
            `Pemakaian untuk produksi ${prod.prodNumber} (Actual)`
        );
    });

    // 2. Add FG Stock
    db.addInventoryTransaction(
        bom.productId,
        'IN',
        actualFgQty,
        'PRODUCTION_IN',
        prod.id,
        `Hasil produksi ${prod.prodNumber} `
    );

    // 3. Mark complete
    db.update('productionOrders', id, {
        status: 'COMPLETED',
        actualFgQty: actualFgQty,
        actualUsages: actualUsages,
        completedAt: new Date().toISOString()
    });

    // 4. Otomatis buat Jurnal: Debit FG/WIP, Kredit RM/WIP
    if (typeof db.addJournalEntry === 'function') {
        let totalCost = 0;
        actualUsages.forEach(usage => {
            const item = db.findById('inventoryItems', usage.productId);
            totalCost += (item.purchasePrice || 0) * usage.qty;
        });

        if (totalCost > 0) {
            const fgItem = db.findById('inventoryItems', bom.productId);
            let debitAcc = 'acc_inv_fg';
            if (fgItem.category === 'WIP') debitAcc = 'acc_inv_wip';

            db.addJournalEntry({
                date: new Date().toISOString(),
                description: `Penyelesaian Produksi ${prod.prodNumber} (${fgItem.itemName})`,
                referenceId: prod.id,
                referenceType: 'PRODUCTION_MO',
                items: [
                    { accountId: debitAcc, debit: totalCost, credit: 0 },
                    { accountId: 'acc_inv_rm', debit: 0, credit: totalCost } // Asumsi RM keluar
                ]
            });
        }
    }

    showToast('Produksi Selesai! Stok Gudang otomatis terupdate.', 'success');
    closeModal();
    renderProductionOrders();
};

window.deleteProduction = (id) => {
    if (confirm('Yakin hapus rencana produksi ini?')) {
        db.delete('productionOrders', id);
        renderProductionOrders();
    }
};

window.viewProduction = (id) => {
    const prod = db.findById('productionOrders', id);
    const bom = db.findById('boms', prod.bomId);
    const fg = products.find(p => p.id === bom.productId) || { name: 'Unknown', unit: '' };

    const body = `
        <div class="mb-4">
                <p><strong>No. Produksi:</strong> ${prod.prodNumber}</p>
                <p><strong>Status:</strong> ${prod.status}</p>
                <p><strong>Target Produk:</strong> ${fg.name}</p>
                <p><strong>Target Qty:</strong> ${prod.targetQty} ${fg.unit}</p>
            </div>
        ${prod.status === 'COMPLETED' ? `
                <div class="bg-green-50 p-4 rounded border border-green-200 mb-4">
                    <h5 class="font-bold text-green-800 border-b border-green-200 pb-2 mb-2">Laporan Hasil Produksi</h5>
                    <p><strong>Hasil Akhir FG:</strong> <span class="text-xl font-bold">${prod.actualFgQty} ${fg.unit}</span></p>
                    <p class="mt-2 text-sm text-gray-600">Material terpakai (Actual):</p>
                    <ul class="list-disc pl-5 mt-1 text-sm text-gray-700">
                        ${prod.actualUsages.map(u => {
        const p = products.find(x => x.id === u.productId);
        return `<li>${p.name}: ${formatNumber(u.qty)} ${p.unit}</li>`;
    }).join('')}
                    </ul>
                </div>
            ` : '<p class="text-gray-500 italic">Produksi belum selesai.</p>'
        }
    `;

    showModal(`Detail Produksi-${prod.prodNumber} `, body, ` <button onclick="closeModal()" class="w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-gray-700 font-medium sm:text-sm"> Tutup</button> `);
};

// --- Initialization ---
document.addEventListener('DOMContentLoaded', () => {

    // Notification Logic
    window.renderNotifications = () => {
        const notifs = db.read('notifications').sort((a, b) => new Date(b.date) - new Date(a.date));
        const unreadCount = notifs.filter(n => !n.isRead).length;

        const badge = document.getElementById('notif-badge');
        if (badge) {
            if (unreadCount > 0) {
                badge.innerText = unreadCount > 99 ? '99+' : unreadCount;
                badge.classList.remove('hidden');
            } else {
                badge.classList.add('hidden');
            }
        }

        const list = document.getElementById('notif-list');
        if (list) {
            if (notifs.length === 0) {
                list.innerHTML = `<div class="p-4 text-center text-sm text-gray-500">Tidak ada notifikasi</div>`;
            } else {
                list.innerHTML = notifs.slice(0, 50).map(n => `
                    <div class="px-4 py-3 border-b border-gray-50 hover:bg-slate-50 transition-colors ${!n.isRead ? 'bg-blue-50/50' : ''}">
                        <div class="flex justify-between items-start mb-1">
                            <span class="text-xs font-semibold ${!n.isRead ? 'text-blue-600' : 'text-gray-600'}">${n.title}</span>
                            <span class="text-[10px] text-gray-400">${formatDate(n.date).slice(0, 11)}</span>
                        </div>
                        <p class="text-xs text-gray-600 line-clamp-2">${n.message}</p>
                    </div>
                `).join('');
            }
        }
    };

    window.addNotification = (title, message) => {
        db.insert('notifications', {
            title,
            message,
            date: new Date().toISOString(),
            isRead: false
        });
        if (typeof renderNotifications === 'function') renderNotifications();
    };

    window.toggleNotificationDropdown = (e) => {
        e.stopPropagation();
        const dropdown = document.getElementById('notif-dropdown');
        if (dropdown) dropdown.classList.toggle('hidden');
    };

    window.markAllNotifRead = () => {
        const notifs = db.read('notifications');
        let updated = false;
        notifs.forEach(n => {
            if (!n.isRead) {
                n.isRead = true;
                updated = true;
            }
        });
        if (updated) {
            db.save('notifications', notifs);
            renderNotifications();
        }
    };

    // Sidebar Toggle Logic moved inside DOMContentLoaded for better state context
    const sidebar = document.getElementById('sidebar');
    const toggleBtn = document.getElementById('sidebarToggleBtn');

    if (toggleBtn && sidebar) {
        toggleBtn.addEventListener('click', () => {
            if (window._currentView && window._currentView !== 'launcher') {
                window.goBack();
                return;
            }

            // Fallback to toggle for launcher
            const nowCollapsed = sidebar.classList.contains('w-64');
            if (nowCollapsed) {
                sidebar.classList.remove('w-64');
                sidebar.classList.add('w-20');
            } else {
                sidebar.classList.remove('w-20');
                sidebar.classList.add('w-64');
            }
            localStorage.setItem('sidebar-collapsed', nowCollapsed);
        });
    }

    window.goBack = () => {
        // If modal is open, back button should close it first
        if (window._isModalOpen) {
            closeModal();
            return;
        }

        // Intercept back button for Sales Module Form Views
        const qtForm = document.getElementById('qt-form-view');
        if (qtForm && !qtForm.classList.contains('hidden')) {
            if (window.renderSalesQuotations) { renderSalesQuotations(); return; }
        }

        const soForm = document.getElementById('so-form-view');
        if (soForm && !soForm.classList.contains('hidden')) {
            if (window.renderSalesOrders) { renderSalesOrders(); return; }
        }

        const siForm = document.getElementById('si-form-view');
        if (siForm && !siForm.classList.contains('hidden')) {
            if (window.renderSalesInvoices) { renderSalesInvoices(); return; }
        }

        const sdoForm = document.getElementById('sdo-form-view');
        if (sdoForm && !sdoForm.classList.contains('hidden')) {
            if (window.renderSalesDeliveryOrders) { renderSalesDeliveryOrders(); return; }
        }

        // Intercept back button for Purchasing Module Form Views
        const rfqForm = document.getElementById('rfq-form-view');
        if (rfqForm && !rfqForm.classList.contains('hidden')) {
            if (window.closeRFQForm) { closeRFQForm(); return; }
        }

        const poFormView = document.getElementById('po-form-view');
        if (poFormView && !poFormView.classList.contains('hidden')) {
            if (window.renderPurchaseOrders) { renderPurchaseOrders(); return; }
        }


        if (window._navigationHistory.length > 0) {
            const lastView = window._navigationHistory.pop();
            navigateTo(lastView, true);
        } else {
            navigateTo('launcher');
        }
    };

    renderNotifications();

    // Event listeners for Navigation (DELEGATED for dynamic elements)
    document.addEventListener('click', (e) => {
        const btn = e.target.closest('.nav-btn');
        if (btn && btn.dataset.view) {
            e.preventDefault();
            navigateTo(btn.dataset.view);
        }
    });

    // Mobile menu toggle
    const mobileMenuBtn = document.getElementById('mobileMenuBtn');

    // Mobile setup: Hide sidebar by default on small screens
    if (window.innerWidth < 768) {
        sidebar.classList.add('-translate-x-full', 'absolute');
    }

    if (mobileMenuBtn) {
        mobileMenuBtn.addEventListener('click', () => {
            if (sidebar.classList.contains('-translate-x-full')) {
                sidebar.classList.remove('-translate-x-full');
                sidebar.classList.add('translate-x-0', 'absolute', 'shadow-2xl');
            } else {
                sidebar.classList.add('-translate-x-full');
            }
        });
    }

    // Load initial view
    navigateTo('launcher');
    window.navigateTo = navigateTo;
});

// --- Date Filter Event Handlers ---
window.applySOFilter = () => {
    window.currentFilters.salesOrders.start = document.getElementById('so_start_date').value;
    window.currentFilters.salesOrders.end = document.getElementById('so_end_date').value;
    window.currentFilters.salesOrders.customer = document.getElementById('so_customer_id').value;
    renderSalesOrders();
};
window.resetSOFilter = () => {
    window.currentFilters.salesOrders = { start: '', end: '', customer: '' };
    renderSalesOrders();
};

window.applyPOFilter = () => {
    window.currentFilters.purchaseOrders.start = document.getElementById('po_start_date').value;
    window.currentFilters.purchaseOrders.end = document.getElementById('po_end_date').value;
    window.currentFilters.purchaseOrders.supplier = document.getElementById('po_filter_supplier').value;
    window.currentFilters.purchaseOrders.category = document.getElementById('po_filter_category').value;
    renderPurchaseOrders();
};
window.resetPOFilter = () => {
    window.currentFilters.purchaseOrders.start = '';
    window.currentFilters.purchaseOrders.end = '';
    window.currentFilters.purchaseOrders.supplier = '';
    window.currentFilters.purchaseOrders.category = '';
    renderPurchaseOrders();
};

window.applyInvFilter = () => {
    window.currentFilters.salesInvoices.start = document.getElementById('inv_start_date').value;
    window.currentFilters.salesInvoices.end = document.getElementById('inv_end_date').value;
    window.currentFilters.salesInvoices.customer = document.getElementById('inv_filter_customer').value;
    window.currentFilters.salesInvoices.taxType = document.getElementById('inv_filter_type').value;
    window.currentFilters.salesInvoices.status = document.getElementById('inv_filter_status').value;
    renderSalesInvoices();
};
window.resetInvFilter = () => {
    window.currentFilters.salesInvoices = { start: '', end: '', customer: '', taxType: '', status: '' };
    renderSalesInvoices();
};

window.applySupPayFilter = () => {
    window.currentFilters.supplierPayments.start = document.getElementById('spay_start_date')?.value || '';
    window.currentFilters.supplierPayments.end = document.getElementById('spay_end_date')?.value || '';
    window.currentFilters.supplierPayments.supplier = document.getElementById('spay_filter_supplier')?.value || '';
    window.currentFilters.supplierPayments.status = document.getElementById('spay_filter_status')?.value || '';
    window.currentFilters.supplierPayments.kategori = document.getElementById('spay_filter_kategori')?.value || '';
    renderSupplierPayments();
};
window.resetSupPayFilter = () => {
    window.currentFilters.supplierPayments = { start: '', end: '', supplier: '', status: '', kategori: '' };
    renderSupplierPayments();
};

window.applySalesPayFilter = () => {
    window.currentFilters.salesPayments.start = document.getElementById('sales_pay_start_date').value;
    window.currentFilters.salesPayments.end = document.getElementById('sales_pay_end_date').value;
    renderSalesPayments();
};
window.resetSalesPayFilter = () => {
    window.currentFilters.salesPayments.start = '';
    window.currentFilters.salesPayments.end = '';
    renderSalesPayments();
};

// --- Category Dropdown Helpers ---
window.toggleCategoryDropdown = (id) => {
    const el = document.getElementById(id);
    if (!el) return;
    const isHidden = el.classList.contains('hidden');
    document.querySelectorAll('[id$="_category_dropdown"]').forEach(d => d.classList.add('hidden'));
    if (isHidden) el.classList.remove('hidden');
    const container = el.closest('[id$="_category_container"]');
    const closeHandler = (e) => {
        if (container && !container.contains(e.target)) {
            el.classList.add('hidden');
            document.removeEventListener('click', closeHandler);
        }
    };
    if (isHidden) setTimeout(() => document.addEventListener('click', closeHandler), 10);
};

window.selectPurchaseCategory = (context, value) => {
    const prefix = context === 'RFQ' ? 'rfq' : 'po';
    const hiddenEl  = document.getElementById(`${prefix}_category`);
    const displayEl = document.getElementById(`${prefix}_category_display`);
    const dropEl    = document.getElementById(`${prefix}_category_dropdown`);

    if (hiddenEl)  hiddenEl.value  = value;
    if (displayEl) displayEl.value = value;
    if (dropEl)    dropEl.classList.add('hidden');

    // Reset item selection when category changes
    const itemSearchEl = document.getElementById(`${prefix}_item_search`);
    const itemIdEl = document.getElementById(prefix === 'po' ? 'po_inv_item' : `${prefix}_item_id`);
    if (itemSearchEl) itemSearchEl.value = '';
    if (itemIdEl) itemIdEl.value = '';
    
    // Also reset unit and price for PO
    if (prefix === 'po') {
        const unitEl = document.getElementById('po_unit');
        const priceEl = document.getElementById('po_price');
        if (unitEl) unitEl.value = '';
        if (priceEl) priceEl.value = '';
    }
};

// --- Supplier Dropdown Helpers (Purchase RFQ / PO) ---
window.toggleSupplierDropdown = (id) => {
    const el = document.getElementById(id);
    if (!el) return;
    const isHidden = el.classList.contains('hidden');
    document.querySelectorAll('[id$="_supplier_dropdown"]').forEach(d => d.classList.add('hidden'));
    if (isHidden) el.classList.remove('hidden');
    const container = el.closest('[id$="_supplier_container"]');
    const closeHandler = (e) => {
        if (container && !container.contains(e.target)) {
            el.classList.add('hidden');
            document.removeEventListener('click', closeHandler);
        }
    };
    if (isHidden) setTimeout(() => document.addEventListener('click', closeHandler), 10);
};

window.selectPurchaseSupplier = (context, id, name) => {
    if (context === 'PINV') {
        if (window.selectPurchaseInvoiceSupplier) window.selectPurchaseInvoiceSupplier(id, name);
        return;
    }
    // context = 'RFQ' or 'PO'
    const prefix = context === 'RFQ' ? 'rfq' : 'po';
    const hiddenId  = context === 'RFQ' ? 'rfq_supplier_id' : 'po_supplier_id';
    const displayId = `${prefix}_supplier_display`;
    const dropId    = `${prefix}_supplier_dropdown`;

    const hiddenEl  = document.getElementById(hiddenId);
    const displayEl = document.getElementById(displayId);
    const dropEl    = document.getElementById(dropId);

    if (hiddenEl)  hiddenEl.value  = id;
    if (displayEl) displayEl.value = name;
    if (dropEl)    dropEl.classList.add('hidden');

    // Call supplier change handler if exists
    if (typeof handleSupplierChange === 'function') handleSupplierChange(id, context);
};

window.openAdvancedSupplierSearch = (context) => {
    const prefix = context === 'PINV' ? 'pinv' : (context === 'RFQ' ? 'rfq' : 'po');
    const dropEl = document.getElementById(`${prefix}_supplier_dropdown`);
    if (dropEl) dropEl.classList.add('hidden');

    const suppliers = db.read('suppliers') || [];
    const body = `
        <div class="space-y-4">
            <div class="relative">
                <i class="fas fa-search absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"></i>
                <input type="text" id="adv_supplier_search_input" oninput="filterAdvancedSupplierTable()" placeholder="Cari Nama atau Kontak Supplier..."
                    class="w-full pl-12 pr-4 py-3 bg-slate-50 border-2 border-slate-100 rounded-xl focus:border-blue-500 outline-none transition-all font-medium">
            </div>
            <div class="overflow-hidden border border-slate-100 rounded-xl max-h-[400px] overflow-y-auto">
                <table class="w-full text-sm text-left">
                    <thead class="bg-slate-50 text-slate-500 font-semibold uppercase text-[10px] tracking-wider sticky top-0 z-10">
                        <tr>
                            <th class="px-4 py-3">Nama Supplier</th>
                            <th class="px-4 py-3">Kontak</th>
                            <th class="px-4 py-3 text-right">Aksi</th>
                        </tr>
                    </thead>
                    <tbody id="adv_supplier_table_body" class="divide-y divide-slate-50">
                        ${suppliers.map(s => `
                            <tr class="hover:bg-blue-50/30 transition-colors">
                                <td class="px-4 py-3 font-bold text-slate-700">${s.name}</td>
                                <td class="px-4 py-3 text-slate-500">${s.phone || s.contact || '-'}</td>
                                <td class="px-4 py-3 text-right">
                                    <button onclick="selectPurchaseSupplier('${context}', '${s.id}', '${s.name.replace(/'/g, "\\'")}'); closeModal();"
                                        class="px-3 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-bold hover:bg-blue-700 transition-all active:scale-95 shadow-sm">
                                        Pilih
                                    </button>
                                </td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        </div>
    `;
    showModal('Advanced Supplier Search', body, `<button onclick="closeModal()" class="px-6 py-2 bg-slate-100 text-slate-600 rounded-lg text-sm font-bold hover:bg-slate-200 transition-all">Tutup</button>`, 'lg');
};

window.filterAdvancedSupplierTable = () => {
    const q = document.getElementById('adv_supplier_search_input')?.value.toLowerCase() || '';
    document.querySelectorAll('#adv_supplier_table_body tr').forEach(tr => {
        tr.style.display = tr.textContent.toLowerCase().includes(q) ? '' : 'none';
    });
};

// --- Custom Dropdown Helpers ---

window.toggleCustomerDropdown = (id) => {
    const el = document.getElementById(id);
    if (!el) return;
    const isHidden = el.classList.contains('hidden');
    // Hide all first
    document.querySelectorAll('[id$="_customer_dropdown"]').forEach(d => d.classList.add('hidden'));
    if (isHidden) el.classList.remove('hidden');
    
    // Close on click outside
    const closeHandler = (e) => {
        if (!e.target.closest('#qt_customer_container')) {
            el.classList.add('hidden');
            document.removeEventListener('click', closeHandler);
        }
    };
    if (isHidden) setTimeout(() => document.addEventListener('click', closeHandler), 10);
};

window.selectCustomer = (prefix, id, name) => {
    const idInput = document.getElementById(`${prefix.toLowerCase()}_customer_id`);
    const searchInput = document.getElementById(`${prefix.toLowerCase()}_customer_search`);
    const dropdown = document.getElementById(`${prefix.toLowerCase()}_customer_dropdown`);
    
    if (idInput) idInput.value = id;
    if (searchInput) searchInput.value = name;
    if (dropdown) dropdown.classList.add('hidden');
    
    // Close overlay if exists (for modal context)
    const overlay = document.getElementById('customer_selection_overlay');
    if (overlay) overlay.remove();

    // Close modal if it was an "Advanced Search" modal (for full-page context)
    if (!overlay && document.getElementById('adv_customer_search_input')) {
        closeModal();
    }
    
    if (prefix === 'QT' || prefix === 'SO') {
        if (typeof onSalesCustomerSelect === 'function') {
            onSalesCustomerSelect(`${prefix.toLowerCase()}_customer_id`, prefix);
        }
    } else if (prefix === 'INV') {
        if (typeof onInvCustomerSelect === 'function') {
            onInvCustomerSelect(id);
        }
    }
};

window.openAdvancedCustomerSearch = (prefix) => {
    // Hide the dropdown if it's open
    const dropdown = document.getElementById(`${prefix.toLowerCase()}_customer_dropdown`);
    if (dropdown) dropdown.classList.add('hidden');

    const customers = db.read('customers') || [];
    const body = `
        <div class="space-y-4">
            <div class="relative">
                <i class="fas fa-search absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"></i>
                <input type="text" id="adv_customer_search_input" onkeyup="filterAdvancedCustomerTable()" placeholder="Cari Nama, Alamat, atau Kontak..." 
                    class="w-full pl-12 pr-4 py-3 bg-slate-50 border-2 border-slate-100 rounded-xl focus:border-blue-500 outline-none transition-all font-medium">
            </div>
            <div class="overflow-hidden border border-slate-100 rounded-xl max-h-[400px] overflow-y-auto">
                <table class="w-full text-sm text-left">
                    <thead class="bg-slate-50 text-slate-500 font-semibold uppercase text-[10px] tracking-wider sticky top-0 z-10">
                        <tr>
                            <th class="px-4 py-3">Nama Customer</th>
                            <th class="px-4 py-3">Alamat</th>
                            <th class="px-4 py-3">Kontak</th>
                            <th class="px-4 py-3 text-right">Aksi</th>
                        </tr>
                    </thead>
                    <tbody id="adv_customer_table_body" class="divide-y divide-slate-50">
                        ${customers.map(c => `
                            <tr class="hover:bg-blue-50/30 transition-colors">
                                <td class="px-4 py-3 font-bold text-slate-700">${c.name}</td>
                                <td class="px-4 py-3 text-slate-500 truncate max-w-[200px]">${c.address || '-'}</td>
                                <td class="px-4 py-3 text-slate-500">${c.phone || '-'}</td>
                                <td class="px-4 py-3 text-right">
                                    <button onclick="selectCustomer('${prefix}', '${c.id}', '${c.name.replace(/'/g, "\\'")}')" 
                                        class="px-3 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-bold hover:bg-blue-700 transition-all active:scale-95 shadow-sm">
                                        Pilih
                                    </button>
                                </td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        </div>
    `;
    
    const modalBackdrop = document.getElementById('modal-backdrop');
    if (modalBackdrop) {
        // Nested Selection Overlay for when already in a modal (e.g. Sales Invoice)
        const selectionOverlay = document.createElement('div');
        selectionOverlay.id = 'customer_selection_overlay';
        selectionOverlay.className = 'absolute inset-0 bg-white z-[300] p-6 animate-slide-up flex flex-col';
        selectionOverlay.innerHTML = `
            <div class="flex items-center justify-between mb-6 shrink-0">
                <h3 class="text-xl font-black text-slate-800 tracking-tight flex items-center gap-3">
                    <i class="fas fa-search text-blue-600"></i> Advanced Customer Search
                </h3>
                <button onclick="document.getElementById('customer_selection_overlay').remove()" class="w-10 h-10 flex items-center justify-center rounded-full text-slate-400 hover:bg-slate-100 transition-all">
                    <i class="fas fa-times text-lg"></i>
                </button>
            </div>
            <div class="flex-1 overflow-y-auto">
                ${body}
            </div>
        `;
        const modalContent = modalBackdrop.querySelector('.bg-white');
        if (modalContent) {
            modalContent.style.position = 'relative';
            modalContent.appendChild(selectionOverlay);
        }
    } else {
        // Standard modal for when in full-page forms (e.g. QT, SO)
        showModal('Advanced Customer Search', body, `<button onclick="closeModal()" class="px-8 py-2 bg-slate-900 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-800 transition-all">Close</button>`, 'lg');
    }
};

window.filterAdvancedCustomerTable = () => {
    const q = document.getElementById('adv_customer_search_input').value.toLowerCase();
    const rows = document.querySelectorAll('#adv_customer_table_body tr');
    rows.forEach(row => {
        const text = row.innerText.toLowerCase();
        row.style.display = text.includes(q) ? '' : 'none';
    });
};




window.filterQTTable = () => {
    const q = (document.getElementById('qt_global_search')?.value || '').toLowerCase();
    const rows = document.querySelectorAll('tbody tr');
    rows.forEach(row => {
        const text = row.innerText.toLowerCase();
        row.style.display = text.includes(q) ? '' : 'none';
    });
};

window.toggleQTDateDropdown = () => {
    const d = document.getElementById('qt_date_dropdown');
    d?.classList.toggle('hidden');
};

window.applyQTHeaderDateFilter = () => {
    const s = document.getElementById('qt_header_start')?.value;
    const e = document.getElementById('qt_header_end')?.value;
    
    // Update global filter state
    window.currentFilters.salesQuotations.start = s || '';
    window.currentFilters.salesQuotations.end = e || '';
    
    // Close dropdown
    document.getElementById('qt_date_dropdown')?.classList.add('hidden');
    
    // Re-render
    renderSalesQuotations();
};

window.resetQTHeaderDateFilter = () => {
    window.currentFilters.salesQuotations.start = '';
    window.currentFilters.salesQuotations.end = '';
    document.getElementById('qt_date_dropdown')?.classList.add('hidden');
    renderSalesQuotations();
};

window.addEventListener('click', (e) => {
    const c = document.getElementById('qt_date_filter_container');
    if (c && !c.contains(e.target)) {
        document.getElementById('qt_date_dropdown')?.classList.add('hidden');
    }
});

window.toggleSelectAllQT = (master) => {
    const checkboxes = document.querySelectorAll(".qt-row-checkbox");
    checkboxes.forEach(cb => {
        cb.checked = master.checked;
    });
};

/**
 * ── DYNAMIC BRANDING ──────────────────────────────────────────
 * Updates the sidebar logo and company name based on CONFIG.
 */
window.renderAppBranding = () => {
    const logoMain = document.getElementById('sidebar-logo-main');
    const logoCollapsed = document.getElementById('sidebar-logo-collapsed');
    
    if (CONFIG.logo) {
        if (logoMain) logoMain.src = CONFIG.logo;
        if (logoCollapsed) logoCollapsed.src = CONFIG.logo;
    }
};

// Initial branding call
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => window.renderAppBranding());
} else {
    window.renderAppBranding();
}
