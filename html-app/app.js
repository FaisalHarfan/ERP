// app.js - Main Application UI Logic

const CONFIG = {
    companyName: 'PT. Tana Subur Nusantara',
    companyAddress: 'J8WR+3JQ, Jl. Akses Tol Karawang Tim., Anggadita, Kec. Klari, Karawang, Jawa Barat 41371',
    companyPhone: '0267-12345678',
    companyEmail: 'info@tanasubur.co.id'
};

// --- View Router ---
const views = {
    'launcher': renderLauncher,
    'dashboard': renderDashboard,
    'master-products': renderMasterProducts,
    'stock-card': renderStockCard,
    // Inventory Module (New)
    'inventory-master': renderInventoryMaster,
    'inventory-stock-in': renderInventoryStockIn,
    'inventory-stock-out': renderInventoryStockOut,
    'inventory-delivery': renderInventoryDelivery,
    'inventory-production': renderInventoryProduction,
    'inventory-card': renderInventoryCard,
    'inventory-report': renderInventoryReport,
    'inventory-po-receipt': renderInventoryPOReceipt,
    // Purchase Module
    'master-suppliers': renderMasterSuppliers,
    'purchase-requests': renderPurchaseRequests,
    'purchase-orders': renderPurchaseOrders,
    'purchase-invoices': renderPurchaseInvoices,
    'supplier-payments': renderSupplierPayments,
    'purchase-reports': renderPurchaseReports,
    // Sales Module
    'sales-quotations': renderSalesQuotations,
    'sales-orders': renderSalesOrders,
    'sales-invoices': renderSalesInvoices,
    'sales-payments': renderSalesPayments,
    'sales-reports': renderSalesReports,
    'master-customers': renderMasterCustomers,
    // Production Module (New)
    'production-dashboard': renderProductionDashboard,
    'production-machines': renderProductionMachines,
    'production-bom': renderProductionBOM,
    'production-mo': renderProductionMO,
    'production-log': renderProductionLog
};
// Helper untuk Print
window.printHTML = (htmlContent, title) => {
    const printWindow = window.open('', '_blank', 'height=800,width=800');
    if (!printWindow) {
        alert('Mohon izinkan pop-ups untuk mencetak dokumen.');
        return;
    }
    printWindow.document.write(`
        <html>
            <head>
                <title>${title}</title>
                <script src="https://cdn.tailwindcss.com"></script>
                <style>
                    body { font-family: 'Inter', sans-serif; padding: 2rem; background: white; color: black; }
                    @media print {
                        .no-print { display: none !important; }
                        body { padding: 0; }
                    }
                </style>
            </head>
            <body>
                ${htmlContent}
                <script>
                    setTimeout(() => {
                        window.print();
                        window.close();
                    }, 500);
                </script>
            </body>
        </html>
    `);
    printWindow.document.close();
};

function navigateTo(viewId) {
    const sidebar = document.getElementById('sidebar');
    const homeBtn = document.getElementById('homeBtn');

    // Toggle sidebar visibility for launcher vs inner apps
    if (viewId === 'launcher') {
        sidebar.classList.add('hidden');
        sidebar.classList.remove('flex', 'md:block');
        if (homeBtn) homeBtn.classList.add('hidden');
    } else {
        sidebar.classList.remove('hidden');
        sidebar.classList.add('flex');
        if (homeBtn) homeBtn.classList.remove('hidden');
    }

    // Update active nav link
    document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.classList.remove('active', 'bg-blue-600', 'text-white');
        btn.classList.add('hover:bg-slate-800', 'hover:text-white');
        if (btn.dataset.view === viewId) {
            btn.classList.add('active', 'bg-blue-600', 'text-white');
            btn.classList.remove('hover:bg-slate-800', 'hover:text-white');
        }
    });

    // Render the view
    const mainContent = document.getElementById('main-content');
    mainContent.innerHTML = ''; // clear

    if (views[viewId]) {
        views[viewId]();
    } else {
        mainContent.innerHTML = `<div class="p-8 text-center text-gray-500">View not found</div>`;
    }

    // Close mobile menu if open (only on mobile screens)
    if (window.innerWidth < 768 && viewId !== 'launcher') {
        sidebar.classList.remove('translate-x-0');
        sidebar.classList.add('-translate-x-full');
    }
}

function renderLauncher() {
    document.getElementById('pageTitle').innerText = 'Pilih Departemen';
    const mainContent = document.getElementById('main-content');

    mainContent.innerHTML = `
        <div class="h-full w-full flex flex-col items-center justify-center p-4 sm:p-8">
            <h2 class="text-4xl font-bold text-gray-800 mb-12 text-center">Nex<span class="text-blue-600">ERP</span></h2>
            <div class="max-w-4xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-6 sm:gap-10 w-full">
                <!-- Penjualan -->
                <button onclick="openApp('sales')" class="group flex flex-col items-center justify-center p-8 bg-white rounded-2xl shadow-sm hover:shadow-xl transition-all duration-300 border border-gray-100 transform hover:-translate-y-2 aspect-square">
                    <div class="w-20 h-20 flex items-center justify-center rounded-2xl bg-gradient-to-br from-green-400 to-green-600 text-white mb-4 shadow-lg group-hover:scale-110 transition-transform">
                        <i class="fas fa-file-invoice-dollar text-3xl"></i>
                    </div>
                    <span class="font-semibold text-gray-800 text-lg group-hover:text-green-600 transition-colors">Penjualan</span>
                </button>
                
                <!-- Pembelian -->
                <button onclick="openApp('purchase')" class="group flex flex-col items-center justify-center p-8 bg-white rounded-2xl shadow-sm hover:shadow-xl transition-all duration-300 border border-gray-100 transform hover:-translate-y-2 aspect-square">
                    <div class="w-20 h-20 flex items-center justify-center rounded-2xl bg-gradient-to-br from-purple-400 to-purple-600 text-white mb-4 shadow-lg group-hover:scale-110 transition-transform">
                        <i class="fas fa-shopping-cart text-3xl"></i>
                    </div>
                    <span class="font-semibold text-gray-800 text-lg group-hover:text-purple-600 transition-colors">Pembelian</span>
                </button>

                <!-- Persediaan -->
                <button onclick="openApp('inventory')" class="relative group flex flex-col items-center justify-center p-8 bg-white rounded-2xl shadow-sm hover:shadow-xl transition-all duration-300 border border-gray-100 transform hover:-translate-y-2 aspect-square">
                    ${(() => { const items = db.read('inventoryItems'); const lowCount = items.filter(i => db.getInventoryStock(i.id) < i.minStock).length; return lowCount > 0 ? `<span class="absolute top-3 right-3 bg-red-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">${lowCount} LOW</span>` : ''; })()}
                    <div class="w-20 h-20 flex items-center justify-center rounded-2xl bg-gradient-to-br from-blue-400 to-blue-600 text-white mb-4 shadow-lg group-hover:scale-110 transition-transform">
                        <i class="fas fa-boxes text-3xl"></i>
                    </div>
                    <span class="font-semibold text-gray-800 text-lg group-hover:text-blue-600 transition-colors">Persediaan</span>
                </button>

                <!-- Produksi -->
                <button onclick="openApp('production')" class="group flex flex-col items-center justify-center p-8 bg-white rounded-2xl shadow-sm hover:shadow-xl transition-all duration-300 border border-gray-100 transform hover:-translate-y-2 aspect-square">
                    <div class="w-20 h-20 flex items-center justify-center rounded-2xl bg-gradient-to-br from-orange-400 to-orange-600 text-white mb-4 shadow-lg group-hover:scale-110 transition-transform">
                        <i class="fas fa-industry text-3xl"></i>
                    </div>
                    <span class="font-semibold text-gray-800 text-lg group-hover:text-orange-600 transition-colors">Produksi</span>
                </button>
            </div>
        </div>
    `;
}

window.openApp = (appName) => {
    // Hide all nav groups
    document.querySelectorAll('.nav-group').forEach(el => el.classList.add('hidden'));

    // Show specific target group
    const targetGroup = document.querySelector(`.nav-group.${appName}`);
    if (targetGroup) targetGroup.classList.remove('hidden');

    // Default routes per app
    if (appName === 'sales') navigateTo('sales-quotations');
    else if (appName === 'purchase') navigateTo('purchase-orders');
    else if (appName === 'inventory') navigateTo('inventory-master');
    else if (appName === 'production') navigateTo('production-dashboard');
};

// --- Modals ---
function showModal(title, bodyHtml, footerHtml) {
    const modalContainer = document.getElementById('modal-container');
    modalContainer.innerHTML = `
        <div class="fixed inset-0 bg-gray-900 bg-opacity-50 flex items-center justify-center z-50 p-4 animate-fade-in" id="modal-backdrop">
        <div class="bg-white rounded-lg shadow-xl w-full max-w-2xl flex flex-col max-h-[90vh] animate-slide-up">
            <div class="flex justify-between items-center p-4 sm:p-6 border-b border-gray-200">
                <h3 class="text-xl font-semibold text-gray-800">${title}</h3>
                <button class="text-gray-400 hover:text-gray-600 transition-colors" onclick="closeModal()">
                    <i class="fas fa-times text-xl"></i>
                </button>
            </div>
            <div class="p-4 sm:p-6 overflow-y-auto flex-1">
                ${bodyHtml}
            </div>
            <div class="px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse bg-gray-50 border-t border-gray-200 rounded-b-lg">
                ${footerHtml}
            </div>
        </div>
        </div>
        `;
}

function closeModal() {
    document.getElementById('modal-container').innerHTML = '';
}

// --- Toasts (Notifications) ---
function showToast(message, type = 'success') {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    const bgColor = type === 'success' ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200';
    const textColor = type === 'success' ? 'text-green-800' : 'text-red-800';
    const icon = type === 'success' ? 'fa-check-circle text-green-500' : 'fa-exclamation-circle text-red-500';

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
const formatCurrency = (amount) => {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(amount);
};
const formatDate = (isoString) => {
    if (!isoString) return '-';
    const date = new Date(isoString);
    return date.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
};

// --- View Renderers (Placeholders) ---

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
                                    <p class="text-xs text-red-600">Min: ${p.minStock} ${p.unit}</p>
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
function renderMasterCustomers() {
    document.getElementById('pageTitle').innerText = 'Master Customers';
    const mainContent = document.getElementById('main-content');

    const customers = db.read('customers');

    let rows = customers.map(c => `
        <tr class="border-b border-gray-100 hover:bg-gray-50 transition-colors">
            <td class="py-3 px-4 text-sm font-medium text-gray-800">${c.name}</td>
            <td class="py-3 px-4 text-sm text-gray-600">${c.phone || '-'}</td>
            <td class="py-3 px-4 text-sm text-gray-600 text-sm whitespace-pre-wrap">${c.address || '-'}</td>
            <td class="py-3 px-4 text-sm text-right">
                <button onclick="openCustomerModal('${c.id}')" class="text-blue-600 hover:text-blue-800 mr-2" title="Edit"><i class="fas fa-edit"></i></button>
                <button onclick="deleteCustomer('${c.id}')" class="text-red-500 hover:text-red-700" title="Hapus"><i class="fas fa-trash"></i></button>
            </td>
        </tr>
    `).join('');

    if (customers.length === 0) rows = `<tr><td colspan="4" class="py-4 text-center text-gray-500">Belum ada data customer</td></tr>`;

    mainContent.innerHTML = `
        <div class="bg-white rounded-lg shadow-sm border border-gray-100">
            <div class="flex justify-between items-center p-4 sm:p-6 border-b border-gray-100">
                <h2 class="text-lg font-semibold text-gray-800">Daftar Customer</h2>
                <button onclick="openCustomerModal()" class="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md transition-colors text-sm font-medium">
                    <i class="fas fa-plus mr-2"></i>Tambah Customer
                </button>
            </div>
            <div class="overflow-x-auto">
                <table class="w-full text-left border-collapse">
                    <thead>
                        <tr class="bg-gray-50 border-b border-gray-200">
                            <th class="py-3 px-4 text-xs font-semibold text-gray-600 uppercase tracking-wider w-1/4">Nama Perusahaan/Orang</th>
                            <th class="py-3 px-4 text-xs font-semibold text-gray-600 uppercase tracking-wider w-1/5">No. Telepon</th>
                            <th class="py-3 px-4 text-xs font-semibold text-gray-600 uppercase tracking-wider">Alamat</th>
                            <th class="py-3 px-4 text-xs font-semibold text-gray-600 uppercase tracking-wider text-right">Aksi</th>
                        </tr>
                    </thead>
                    <tbody>${rows}</tbody>
                </table>
            </div>
        </div>
    `;
}

window.openCustomerModal = (id = null) => {
    let customer = { name: '', phone: '', address: '' };
    if (id) {
        customer = db.findById('customers', id);
    }

    const body = `
        <div class="space-y-4">
            <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">Nama Customer / PT</label>
                <input type="text" id="cust_name" value="${customer.name}" class="w-full border border-gray-300 rounded px-3 py-2">
            </div>
            <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">No. Telepon</label>
                <input type="text" id="cust_phone" value="${customer.phone}" class="w-full border border-gray-300 rounded px-3 py-2">
            </div>
            <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">Alamat Lengkap</label>
                <textarea id="cust_address" class="w-full border border-gray-300 rounded px-3 py-2 h-24">${customer.address}</textarea>
            </div>
        </div>
    `;

    const footer = `
        <button type="button" onclick="saveCustomer('${id || ''}')" class="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-blue-600 text-white font-medium focus:outline-none sm:ml-3 sm:w-auto sm:text-sm">Simpan</button>
        <button type="button" onclick="closeModal()" class="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-gray-700 font-medium sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm">Batal</button>
    `;

    showModal(id ? 'Edit Customer' : 'Tambah Customer Baru', body, footer);
};

window.saveCustomer = (id) => {
    const name = document.getElementById('cust_name').value.trim();
    const phone = document.getElementById('cust_phone').value.trim();
    const address = document.getElementById('cust_address').value.trim();

    if (!name) { showToast('Nama harus diisi', 'error'); return; }

    if (id) {
        db.update('customers', id, { name, phone, address });
        showToast('Data customer berhasil diperbarui');
    } else {
        db.insert('customers', { name, phone, address });
        showToast('Customer baru berhasil ditambahkan');
    }

    closeModal();
    renderMasterCustomers();
};

window.deleteCustomer = (id) => {
    if (confirm('Yakin ingin menghapus customer ini?')) {
        db.delete('customers', id);
        renderMasterCustomers();
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

// ─────────────────── MASTER SUPPLIERS ───────────────────────
function renderMasterSuppliers() {
    document.getElementById('pageTitle').innerText = 'Master Supplier';
    const mainContent = document.getElementById('main-content');
    const suppliers = db.read('suppliers');

    let rows = suppliers.map(s => `
        <tr class="border-b border-gray-100 hover:bg-gray-50">
            <td class="py-3 px-4 text-sm font-medium text-gray-800">${s.name}</td>
            <td class="py-3 px-4 text-sm text-gray-600">${s.phone || '-'}</td>
            <td class="py-3 px-4 text-sm text-gray-600">${s.email || '-'}</td>
            <td class="py-3 px-4 text-sm text-gray-600 whitespace-pre-wrap">${s.address || '-'}</td>
            <td class="py-3 px-4 text-sm text-right">
                <button onclick="openSupplierModal('${s.id}')" class="text-blue-500 hover:text-blue-700 mr-2"><i class="fas fa-edit"></i></button>
                <button onclick="deleteSupplier('${s.id}')" class="text-red-500 hover:text-red-700"><i class="fas fa-trash"></i></button>
            </td>
        </tr>`).join('');
    if (!rows) rows = `<tr><td colspan="5" class="py-4 text-center text-gray-500">Belum ada supplier</td></tr>`;

    mainContent.innerHTML = `
        <div class="bg-white rounded-lg shadow-sm border border-gray-100">
            <div class="flex justify-between items-center p-4 sm:p-6 border-b border-gray-100">
                <h2 class="text-lg font-semibold text-gray-800">Daftar Supplier</h2>
                <button onclick="openSupplierModal()" class="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm font-medium">
                    <i class="fas fa-plus mr-2"></i>Tambah Supplier
                </button>
            </div>
            <div class="overflow-x-auto">
                <table class="w-full text-left border-collapse">
                    <thead>
                        <tr class="bg-gray-50 border-b border-gray-200">
                            <th class="py-3 px-4 text-xs font-semibold text-gray-600 uppercase">Nama</th>
                            <th class="py-3 px-4 text-xs font-semibold text-gray-600 uppercase">Telepon</th>
                            <th class="py-3 px-4 text-xs font-semibold text-gray-600 uppercase">Email</th>
                            <th class="py-3 px-4 text-xs font-semibold text-gray-600 uppercase">Alamat</th>
                            <th class="py-3 px-4 text-xs font-semibold text-gray-600 uppercase text-right">Aksi</th>
                        </tr>
                    </thead>
                    <tbody>${rows}</tbody>
                </table>
            </div>
        </div>`;
}

window.openSupplierModal = (id = null) => {
    const s = id ? db.findById('suppliers', id) : { name: '', phone: '', email: '', address: '' };
    const body = `<div class="space-y-4">
        <div><label class="block text-sm font-medium text-gray-700 mb-1">Nama Supplier / PT</label>
            <input id="sup_name" value="${s.name}" class="w-full border border-gray-300 rounded px-3 py-2"></div>
        <div class="grid grid-cols-2 gap-3">
            <div><label class="block text-sm font-medium text-gray-700 mb-1">Telepon</label>
                <input id="sup_phone" value="${s.phone || ''}" class="w-full border border-gray-300 rounded px-3 py-2"></div>
            <div><label class="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <input id="sup_email" value="${s.email || ''}" class="w-full border border-gray-300 rounded px-3 py-2"></div>
        </div>
        <div><label class="block text-sm font-medium text-gray-700 mb-1">Alamat Lengkap</label>
            <textarea id="sup_address" class="w-full border border-gray-300 rounded px-3 py-2 h-20">${s.address || ''}</textarea></div>
    </div>`;
    const footer = `
        <button onclick="saveSupplier('${id || ''}')" class="w-full sm:w-auto inline-flex justify-center rounded-md bg-blue-600 px-4 py-2 text-white text-sm font-medium hover:bg-blue-700 sm:ml-3">Simpan</button>
        <button onclick="closeModal()" class="mt-3 sm:mt-0 w-full sm:w-auto inline-flex justify-center rounded-md border border-gray-300 px-4 py-2 bg-white text-gray-700 text-sm font-medium hover:bg-gray-50 sm:ml-3">Batal</button>`;
    showModal(id ? 'Edit Supplier' : 'Tambah Supplier', body, footer);
};

window.saveSupplier = (id) => {
    const name = document.getElementById('sup_name').value.trim();
    if (!name) { showToast('Nama supplier harus diisi', 'error'); return; }
    const data = {
        name, phone: document.getElementById('sup_phone').value.trim(),
        email: document.getElementById('sup_email').value.trim(),
        address: document.getElementById('sup_address').value.trim()
    };
    if (id) { db.update('suppliers', id, data); showToast('Supplier diperbarui'); }
    else { db.insert('suppliers', data); showToast('Supplier ditambahkan'); }
    closeModal(); renderMasterSuppliers();
};

window.deleteSupplier = (id) => {
    if (confirm('Hapus supplier ini?')) { db.delete('suppliers', id); renderMasterSuppliers(); }
};

// ─────────────────── PURCHASE REQUESTS ──────────────────────
function renderPurchaseRequests() {
    document.getElementById('pageTitle').innerText = 'Purchase Request';
    const mainContent = document.getElementById('main-content');
    const requests = db.read('purchaseRequests').sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    let rows = requests.map(r => {
        let actions = `<button onclick="viewPR('${r.id}')" class="text-gray-500 hover:text-gray-700 mr-2" title="Detail"><i class="fas fa-eye"></i></button>`;
        if (r.status === 'DRAFT') {
            actions += `<button onclick="approvePR('${r.id}')" class="text-blue-500 hover:text-blue-700 mr-2" title="Approve"><i class="fas fa-check-circle"></i></button>`;
            actions += `<button onclick="deletePR('${r.id}')" class="text-red-400 hover:text-red-600" title="Hapus"><i class="fas fa-trash"></i></button>`;
        }
        if (r.status === 'APPROVED') {
            actions += `<button onclick="convertPRtoPO('${r.id}')" class="text-white bg-indigo-600 hover:bg-indigo-700 text-xs px-2 py-1 rounded font-medium">→ Buat PO</button>`;
        }
        return `<tr class="border-b border-gray-100 hover:bg-gray-50">
            <td class="py-3 px-4 text-sm font-medium text-indigo-600">${r.requestNumber}</td>
            <td class="py-3 px-4 text-sm text-gray-600">${formatDate(r.date).slice(0, 11)}</td>
            <td class="py-3 px-4 text-sm text-gray-800">${r.requestedBy || '-'}</td>
            <td class="py-3 px-4 text-sm">${statusBadgePurch(r.status)}</td>
            <td class="py-3 px-4 text-sm text-right">${actions}</td>
        </tr>`;
    }).join('');
    if (!rows) rows = `<tr><td colspan="5" class="py-4 text-center text-gray-500">Belum ada Purchase Request</td></tr>`;

    mainContent.innerHTML = `
        <div class="bg-white rounded-lg shadow-sm border border-gray-100">
            <div class="flex justify-between items-center p-4 sm:p-6 border-b border-gray-100">
                <h2 class="text-lg font-semibold text-gray-800">Daftar Purchase Request</h2>
                <button onclick="openPRModal()" class="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-md text-sm font-medium">
                    <i class="fas fa-plus mr-2"></i>Buat PR
                </button>
            </div>
            <div class="overflow-x-auto">
                <table class="w-full text-left border-collapse">
                    <thead><tr class="bg-gray-50 border-b border-gray-200">
                        <th class="py-3 px-4 text-xs font-semibold text-gray-600 uppercase">No. PR</th>
                        <th class="py-3 px-4 text-xs font-semibold text-gray-600 uppercase">Tanggal</th>
                        <th class="py-3 px-4 text-xs font-semibold text-gray-600 uppercase">Diminta Oleh</th>
                        <th class="py-3 px-4 text-xs font-semibold text-gray-600 uppercase">Status</th>
                        <th class="py-3 px-4 text-xs font-semibold text-gray-600 uppercase text-right">Aksi</th>
                    </tr></thead>
                    <tbody>${rows}</tbody>
                </table>
            </div>
        </div>`;
}

window.openPRModal = () => {
    window.tempPRItems = [];
    const body = `<div class="space-y-4">
        <div class="grid grid-cols-2 gap-3">
            <div><label class="block text-sm font-medium text-gray-700 mb-1">No. PR</label>
                <input id="pr_number" value="PR-${Date.now().toString().slice(-6)}" class="w-full border border-gray-300 rounded px-3 py-2 bg-gray-50" readonly></div>
            <div><label class="block text-sm font-medium text-gray-700 mb-1">Diminta Oleh</label>
                <input id="pr_by" placeholder="Nama / Divisi" class="w-full border border-gray-300 rounded px-3 py-2"></div>
        </div>
        <div class="border-t pt-4">
            <p class="text-sm font-medium text-gray-700 mb-2">Item Permintaan</p>
            <div class="grid grid-cols-12 gap-2 mb-2">
                <input id="pr_item_name" placeholder="Nama bahan/barang" class="col-span-6 border border-gray-300 rounded px-3 py-2 text-sm">
                <input id="pr_qty" type="number" min="1" placeholder="Qty" class="col-span-3 border border-gray-300 rounded px-3 py-2 text-sm">
                <input id="pr_unit" placeholder="Satuan" class="col-span-2 border border-gray-300 rounded px-3 py-2 text-sm">
                <button onclick="addPRItem()" class="col-span-1 bg-indigo-600 text-white rounded text-sm font-bold">+</button>
            </div>
            <div id="pr_items_list" class="space-y-1 text-sm"></div>
        </div>
    </div>`;
    const footer = `
        <button onclick="savePR()" class="w-full sm:w-auto inline-flex justify-center rounded-md bg-indigo-600 px-4 py-2 text-white text-sm font-medium hover:bg-indigo-700 sm:ml-3">Simpan PR</button>
        <button onclick="closeModal()" class="mt-3 sm:mt-0 w-full sm:w-auto inline-flex justify-center rounded-md border border-gray-300 px-4 py-2 bg-white text-gray-700 text-sm font-medium sm:ml-3">Batal</button>`;
    showModal('Buat Purchase Request', body, footer);
};

window.addPRItem = () => {
    const name = document.getElementById('pr_item_name').value.trim();
    const qty = parseFloat(document.getElementById('pr_qty').value);
    const unit = document.getElementById('pr_unit').value.trim();
    if (!name) { showToast('Nama item harus diisi', 'error'); return; }
    if (!qty || qty <= 0) { showToast('Qty harus diisi', 'error'); return; }
    window.tempPRItems.push({ prodText: name, qty, unit: unit || '-' });
    // Clear inputs for next item
    document.getElementById('pr_item_name').value = '';
    document.getElementById('pr_qty').value = '';
    document.getElementById('pr_unit').value = '';
    document.getElementById('pr_item_name').focus();
    renderPRItemsList();
};

function renderPRItemsList() {
    const el = document.getElementById('pr_items_list');
    if (!el) return;
    if (!window.tempPRItems.length) { el.innerHTML = ''; return; }
    el.innerHTML = `
        <table class="w-full border-collapse mt-1">
            <thead><tr class="bg-indigo-50 text-xs text-indigo-700 uppercase">
                <th class="py-2 px-3 text-left">#</th>
                <th class="py-2 px-3 text-left">Nama Barang</th>
                <th class="py-2 px-3 text-center">Qty</th>
                <th class="py-2 px-3 text-center">Satuan</th>
                <th class="py-2 px-3"></th>
            </tr></thead>
            <tbody>${window.tempPRItems.map((i, idx) => `
                <tr class="border-b border-gray-100 hover:bg-gray-50">
                    <td class="py-2 px-3 text-gray-500 text-sm">${idx + 1}</td>
                    <td class="py-2 px-3 text-sm font-medium text-gray-800">${i.prodText}</td>
                    <td class="py-2 px-3 text-sm text-center">${i.qty}</td>
                    <td class="py-2 px-3 text-sm text-center text-gray-600">${i.unit}</td>
                    <td class="py-2 px-3 text-center"><button onclick="removePRItem(${idx})" class="text-red-400 hover:text-red-600"><i class="fas fa-times"></i></button></td>
                </tr>`).join('')}
            </tbody>
        </table>`;
}

window.removePRItem = (idx) => { window.tempPRItems.splice(idx, 1); renderPRItemsList(); };

window.savePR = () => {
    const num = document.getElementById('pr_number').value;
    const by = document.getElementById('pr_by').value.trim();
    if (!window.tempPRItems.length) { showToast('Tambahkan minimal satu item', 'error'); return; }
    db.insert('purchaseRequests', { requestNumber: num, date: new Date().toISOString(), requestedBy: by, status: 'DRAFT', items: window.tempPRItems });
    showToast('Purchase Request berhasil dibuat'); closeModal(); renderPurchaseRequests();
};

window.approvePR = (id) => {
    if (confirm('Approve PR ini?')) { db.update('purchaseRequests', id, { status: 'APPROVED' }); showToast('PR di-approve'); renderPurchaseRequests(); }
};
window.deletePR = (id) => {
    if (confirm('Hapus PR ini?')) { db.delete('purchaseRequests', id); renderPurchaseRequests(); }
};

window.viewPR = (id) => {
    const pr = db.findById('purchaseRequests', id);
    const rows = (pr.items || []).map(i => `<tr><td class="py-2 px-2">${i.prodText}</td><td class="py-2 px-2 text-right">${i.qty}</td></tr>`).join('');
    const body = `<div class="space-y-3 text-sm">
        <div class="grid grid-cols-2 gap-2 bg-gray-50 p-3 rounded">
            <div><p class="text-gray-500">No. PR</p><p class="font-bold">${pr.requestNumber}</p></div>
            <div><p class="text-gray-500">Status</p>${statusBadgePurch(pr.status)}</div>
            <div><p class="text-gray-500">Tanggal</p><p>${formatDate(pr.date).slice(0, 11)}</p></div>
            <div><p class="text-gray-500">Diminta Oleh</p><p>${pr.requestedBy || '-'}</p></div>
        </div>
        <table class="w-full border-collapse"><thead>
            <tr class="border-b-2 border-gray-800 text-xs uppercase"><th class="py-2 px-2">Produk</th><th class="py-2 px-2 text-right">Qty</th></tr>
        </thead><tbody>${rows}</tbody></table>
    </div>`;
    showModal(`Detail PR - ${pr.requestNumber}`, body, `<button onclick="closeModal()" class="w-full sm:w-auto inline-flex justify-center rounded-md border border-gray-300 px-4 py-2 bg-white text-gray-700 text-sm font-medium">Tutup</button>`);
};

window.convertPRtoPO = (prId) => {
    if (!confirm('Buat Purchase Order dari PR ini?')) return;
    const pr = db.findById('purchaseRequests', prId);
    db.update('purchaseRequests', prId, { status: 'CONVERTED' });
    window.tempPOItems = pr.items.map(i => ({ ...i, price: 0, subtotal: 0 }));
    window.tempPOFromPR = prId;
    navigateTo('purchase-orders');
    setTimeout(() => openPOModal(prId), 100);
};


// ─────────────────── PURCHASE ORDERS ────────────────────────
function renderPurchaseOrders() {
    document.getElementById('pageTitle').innerText = 'Purchase Orders';
    const mainContent = document.getElementById('main-content');
    const pos = db.read('purchaseOrders').sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    const suppliers = db.read('suppliers');
    const purchaseInvoices = db.read('purchaseInvoices');

    let rows = pos.map(po => {
        const sup = suppliers.find(s => s.id === po.supplierId) || { name: '-' };
        const existInv = purchaseInvoices.find(i => i.purchaseOrderId === po.id && i.status !== 'CANCELLED');
        let actions = `<button onclick="viewPO('${po.id}')" class="text-gray-500 hover:text-gray-700 mr-2" title="Detail"><i class="fas fa-eye"></i></button>`;
        if (po.status === 'DRAFT') {
            actions += `<button onclick="approvePO('${po.id}')" class="text-blue-500 hover:text-blue-700 mr-2" title="Approve"><i class="fas fa-check-circle"></i></button>`;
            actions += `<button onclick="cancelPO('${po.id}')" class="text-red-400 hover:text-red-600 mr-2" title="Batal"><i class="fas fa-ban"></i></button>`;
        }


        if (po.status === 'RECEIVED' && !existInv) {
            actions += `<button onclick="createPurchaseInvoice('${po.id}')" class="text-white bg-purple-600 hover:bg-purple-700 text-xs px-2 py-1 rounded font-medium">Buat Invoice</button>`;
        } else if (existInv) {
            actions += `<span class="text-purple-600 text-xs font-medium border border-purple-200 bg-purple-50 px-2 py-1 rounded">Invoiced</span>`;
        }
        let statusDisplay = statusBadgePurch(po.status);
        if (po.status === 'PARTIALLY RECEIVED') {
            const totalOrdered = (po.items || []).reduce((s, i) => s + i.qty, 0);
            const totalReceived = (po.items || []).reduce((s, i) => s + (i.receivedQty || 0), 0);
            statusDisplay += `<div class="text-xs text-orange-600 font-medium mt-0.5">Diterima ${totalReceived}/${totalOrdered}</div>`;
        }
        return `<tr class="border-b border-gray-100 hover:bg-gray-50">
            <td class="py-3 px-4 text-sm font-medium text-blue-600">${po.poNumber}</td>
            <td class="py-3 px-4 text-sm text-gray-600">${formatDate(po.date).slice(0, 11)}</td>
            <td class="py-3 px-4 text-sm text-gray-800">${sup.name}</td>
            <td class="py-3 px-4 text-sm text-gray-800 text-right font-medium">${formatCurrency(po.totalAmount)}</td>
            <td class="py-3 px-4 text-sm">${statusDisplay}</td>
            <td class="py-3 px-4 text-sm text-right whitespace-nowrap">${actions}</td>
        </tr>`;
    }).join('');
    if (!rows) rows = `<tr><td colspan="6" class="py-4 text-center text-gray-500">Belum ada Purchase Order</td></tr>`;

    mainContent.innerHTML = `
        <div class="bg-white rounded-lg shadow-sm border border-gray-100">
            <div class="flex justify-between items-center p-4 sm:p-6 border-b border-gray-100">
                <h2 class="text-lg font-semibold text-gray-800">Daftar Purchase Order</h2>
                <button onclick="openPOModal()" class="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm font-medium">
                    <i class="fas fa-plus mr-2"></i>Buat PO Baru
                </button>
            </div>
            <div class="overflow-x-auto">
                <table class="w-full text-left border-collapse">
                    <thead><tr class="bg-gray-50 border-b border-gray-200">
                        <th class="py-3 px-4 text-xs font-semibold text-gray-600 uppercase">No. PO</th>
                        <th class="py-3 px-4 text-xs font-semibold text-gray-600 uppercase">Tanggal</th>
                        <th class="py-3 px-4 text-xs font-semibold text-gray-600 uppercase">Supplier</th>
                        <th class="py-3 px-4 text-xs font-semibold text-gray-600 uppercase text-right">Total</th>
                        <th class="py-3 px-4 text-xs font-semibold text-gray-600 uppercase">Status</th>
                        <th class="py-3 px-4 text-xs font-semibold text-gray-600 uppercase text-right">Aksi</th>
                    </tr></thead>
                    <tbody>${rows}</tbody>
                </table>
            </div>
        </div>`;
}

window.openPOModal = (fromPrId = null) => {
    const suppliers = db.read('suppliers');
    if (!window.tempPOItems) window.tempPOItems = [];
    if (!fromPrId) { window.tempPOItems = []; window.tempPOFromPR = null; }

    const supOpts = suppliers.map(s => `<option value="${s.id}">${s.name}</option>`).join('');

    const todayStr = new Date().toISOString().split('T')[0];
    const body = `<div class="space-y-4">
        <div class="grid grid-cols-2 gap-3">
            <div><label class="block text-sm font-medium text-gray-700 mb-1">No. PO</label>
                <input id="po_number" value="PO-${Date.now().toString().slice(-6)}" class="w-full border border-gray-300 rounded px-3 py-2 bg-gray-50" readonly></div>
            <div><label class="block text-sm font-medium text-gray-700 mb-1">Supplier</label>
                <select id="po_supplier" class="w-full border border-gray-300 rounded px-3 py-2 bg-white">
                    <option value="">-- Pilih Supplier --</option>${supOpts}
                </select></div>
            <div><label class="block text-sm font-medium text-gray-700 mb-1">Tanggal PO</label>
                <input type="date" id="po_date" value="${todayStr}" class="w-full border border-gray-300 rounded px-3 py-2 bg-white"></div>
            <div><label class="block text-sm font-medium text-gray-700 mb-1">ETD <span class="text-xs text-gray-400">(Estimasi Tiba)</span></label>
                <input type="date" id="po_etd" min="${todayStr}" class="w-full border border-gray-300 rounded px-3 py-2 bg-white"></div>
        </div>
        <div class="border-t pt-4">
            <p class="text-sm font-medium text-gray-700 mb-2">Item Pembelian <span class="text-xs text-gray-400">(Raw Material dari Gudang)</span></p>
            <div class="grid grid-cols-12 gap-2 mb-2">
                <select id="po_inv_item" onchange="onPOItemSelect()" class="col-span-5 border border-gray-300 rounded px-2 py-2 text-sm bg-white">
                    <option value="">-- Pilih Item (Raw Material) --</option>
                    ${(() => { const items = db.read('inventoryItems').filter(i => i.category === 'RAW_MATERIAL' && i.status !== 'INACTIVE'); return items.length ? items.map(i => `<option value="${i.id}" data-name="${i.itemName}" data-unit="${i.unit}">${i.itemCode} — ${i.itemName}</option>`).join('') : '<option disabled>Belum ada Raw Material di Gudang</option>'; })()}
                </select>
                <input id="po_unit" readonly placeholder="Satuan" class="col-span-2 border border-gray-200 rounded px-2 py-2 text-sm bg-gray-50 text-gray-500">
                <input id="po_qty" type="number" min="1" placeholder="Qty" class="col-span-2 border border-gray-300 rounded px-2 py-2 text-sm">
                <input id="po_price" type="number" min="0" placeholder="Harga/unit" class="col-span-2 border border-gray-300 rounded px-2 py-2 text-sm">
                <button onclick="addPOItem()" class="col-span-1 bg-blue-600 text-white rounded text-sm font-bold">+</button>
            </div>
            <div id="po_items_list" class="text-sm"></div>
            <div id="po_total_display" class="text-right font-bold text-gray-800 mt-2 pt-2 border-t text-sm"></div>
        </div>
    </div>`;
    const footer = `
        <button onclick="savePO()" class="w-full sm:w-auto inline-flex justify-center rounded-md bg-blue-600 px-4 py-2 text-white text-sm font-medium hover:bg-blue-700 sm:ml-3">Simpan PO Draft</button>
        <button onclick="closeModal()" class="mt-3 sm:mt-0 w-full sm:w-auto inline-flex justify-center rounded-md border border-gray-300 px-4 py-2 bg-white text-gray-700 text-sm font-medium sm:ml-3">Batal</button>`;
    showModal('Buat Purchase Order', body, footer);
    renderPOItemsList();
};

window.onPOItemSelect = () => {
    const sel = document.getElementById('po_inv_item');
    const opt = sel?.selectedOptions[0];
    const unitEl = document.getElementById('po_unit');
    if (unitEl) unitEl.value = opt?.dataset.unit || '';
};

window.addPOItem = () => {
    const sel = document.getElementById('po_inv_item');
    const opt = sel?.selectedOptions[0];
    const inventoryItemId = sel?.value;
    const name = opt?.dataset.name || '';
    const unit = document.getElementById('po_unit').value || opt?.dataset.unit || '-';
    const qty = parseFloat(document.getElementById('po_qty').value);
    const price = parseFloat(document.getElementById('po_price').value) || 0;
    if (!inventoryItemId) { showToast('Pilih item dari daftar', 'error'); return; }
    if (!qty || qty <= 0) { showToast('Qty harus diisi', 'error'); return; }
    window.tempPOItems.push({ inventoryItemId, prodText: name, unit, qty, price, subtotal: qty * price });
    // Reset
    sel.value = '';
    document.getElementById('po_unit').value = '';
    document.getElementById('po_qty').value = '';
    document.getElementById('po_price').value = '';
    renderPOItemsList();
};

function renderPOItemsList() {
    const el = document.getElementById('po_items_list');
    const totEl = document.getElementById('po_total_display');
    if (!el) return;
    if (!(window.tempPOItems || []).length) { el.innerHTML = ''; if (totEl) totEl.innerHTML = ''; return; }
    el.innerHTML = `
        <table class="w-full border-collapse mt-1">
            <thead><tr class="bg-blue-50 text-xs text-blue-700 uppercase">
                <th class="py-2 px-3 text-left">#</th>
                <th class="py-2 px-3 text-left">Nama Barang</th>
                <th class="py-2 px-3 text-center">Satuan</th>
                <th class="py-2 px-3 text-right">Qty</th>
                <th class="py-2 px-3 text-right">Harga/unit</th>
                <th class="py-2 px-3 text-right">Subtotal</th>
                <th class="py-2 px-3"></th>
            </tr></thead>
            <tbody>${(window.tempPOItems || []).map((i, idx) => `
                <tr class="border-b border-gray-100 hover:bg-gray-50">
                    <td class="py-2 px-3 text-gray-400 text-sm">${idx + 1}</td>
                    <td class="py-2 px-3 text-sm font-medium text-gray-800">${i.prodText}</td>
                    <td class="py-2 px-3 text-sm text-center text-gray-600">${i.unit}</td>
                    <td class="py-2 px-3 text-sm text-right">${i.qty}</td>
                    <td class="py-2 px-3 text-sm text-right">${formatCurrency(i.price)}</td>
                    <td class="py-2 px-3 text-sm text-right font-medium">${formatCurrency(i.subtotal)}</td>
                    <td class="py-2 px-3 text-center"><button onclick="removePOItem(${idx})" class="text-red-400 hover:text-red-600"><i class="fas fa-times"></i></button></td>
                </tr>`).join('')}
            </tbody>
        </table>`;
    const total = (window.tempPOItems || []).reduce((s, i) => s + i.subtotal, 0);
    if (totEl) totEl.innerHTML = `<span class="text-blue-700">Total: ${formatCurrency(total)}</span>`;
}

window.removePOItem = (idx) => { window.tempPOItems.splice(idx, 1); renderPOItemsList(); };

window.savePO = () => {
    const supId = document.getElementById('po_supplier').value;
    const poNum = document.getElementById('po_number').value;
    const poDateEl = document.getElementById('po_date');
    const poEtdEl = document.getElementById('po_etd');
    if (!supId) { showToast('Pilih supplier', 'error'); return; }
    if (!window.tempPOItems.length) { showToast('Tambah minimal satu item', 'error'); return; }
    const total = window.tempPOItems.reduce((s, i) => s + i.subtotal, 0);
    const newPO = db.insert('purchaseOrders', {
        poNumber: poNum, supplierId: supId, requestId: window.tempPOFromPR || null,
        date: (poDateEl && poDateEl.value) ? new Date(poDateEl.value).toISOString() : new Date().toISOString(),
        etd: (poEtdEl && poEtdEl.value) ? poEtdEl.value : null,
        actualDeliveryDate: null,
        status: 'DRAFT', totalAmount: total,
        items: window.tempPOItems
    });
    window.tempPOItems = []; window.tempPOFromPR = null;
    showToast('PO Draft berhasil dibuat!', 'success');
    closeModal();
    renderPurchaseOrders();
};

window.approvePO = (id) => {
    if (confirm('Approve PO ini?')) { db.update('purchaseOrders', id, { status: 'APPROVED' }); showToast('PO di-approve'); renderPurchaseOrders(); }
};
window.cancelPO = (id) => {
    if (confirm('Batalkan PO ini?')) { db.update('purchaseOrders', id, { status: 'CANCELLED' }); showToast('PO dibatalkan'); renderPurchaseOrders(); }
};

window.receiveGoodsPO = (id) => {
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
            <td class="py-2 px-2">${i.prodText}
                <div class="text-[10px] text-gray-400">Total Pesan: ${i.qty} | Sudah Terima: ${receivedSoFar}</div>
            </td>
            <td class="py-2 px-2 text-right"><span class="font-bold text-blue-600">${sisa}</span></td>
            <td class="py-2 px-2 text-right">
                <input type="number" id="recv_qty_${idx}" value="${sisa}" max="${sisa}" min="0" 
                    ${sisa === 0 ? 'disabled' : ''}
                    class="w-20 border border-gray-300 rounded px-2 py-1 text-center text-sm ${sisa === 0 ? 'bg-gray-100' : ''}">
            </td>
        </tr>`;
    }).join('');

    const body = `<div class="text-sm">
        <p class="text-gray-500 mb-3">Masukkan qty aktual yang diterima. (Barang yang sudah diterima 100% tidak bisa diinput lagi).</p>
        <table class="w-full"><thead><tr class="border-b-2 border-gray-800 text-xs uppercase">
            <th class="py-2 px-2 text-left">Produk</th>
            <th class="py-2 px-2 text-right">Sisa Qty</th>
            <th class="py-2 px-2 text-right">Terima Hari Ini</th>
        </tr></thead><tbody>${rows}</tbody></table>
    </div>`;

    const footer = `
        <button onclick="confirmReceiveGoods('${id}')" class="w-full sm:w-auto inline-flex justify-center rounded-md bg-green-600 px-4 py-2 text-white text-sm font-medium hover:bg-green-700 sm:ml-3">Konfirmasi Terima</button>
        <button onclick="closeModal()" class="mt-3 sm:mt-0 w-full sm:w-auto inline-flex justify-center rounded-md border border-gray-300 px-4 py-2 bg-white text-gray-700 text-sm font-medium sm:ml-3">Batal</button>`;

    showModal(`Terima Barang - ${po.poNumber}`, body, footer);
};

window.confirmReceiveGoods = (id) => {
    const po = db.findById('purchaseOrders', id);
    // Always work on a deep copy so we can mutate safely
    const updatedItems = JSON.parse(JSON.stringify(po.items || []));
    let anyReceived = false;
    let sumReceivedAll = 0;
    let sumTargetAll = 0;
    const receivedItems = [];

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
            // Use inventoryItemId if available, fallback to productId
            const stockItemId = item.inventoryItemId || item.productId || null;
            if (stockItemId) {
                try { db.addStockMovement(stockItemId, 'IN', recvQty, 'PURCHASE', id, `Penerimaan partial PO ${po.poNumber}`); } catch (e) { console.warn('addStockMovement error:', e); }
            }
            receivedItems.push({ prodText: item.prodText || item.itemName || '', qty: recvQty, unit: item.unit || '', inventoryItemId: item.inventoryItemId });
            anyReceived = true;
        }
    });

    if (!anyReceived) { showToast('Tidak ada barang tambahan yang dimasukkan', 'error'); return; }

    const isCompleted = sumReceivedAll >= sumTargetAll;
    const newStatus = isCompleted ? 'RECEIVED' : 'PARTIALLY RECEIVED';
    const today = new Date().toISOString().split('T')[0];

    db.update('purchaseOrders', id, {
        status: newStatus,
        receivedAt: new Date().toISOString(),
        actualDeliveryDate: isCompleted ? today : (po.actualDeliveryDate || null),
        items: updatedItems  // Save deep-copied updated items with new receivedQty
    });

    if (typeof addNotification === 'function') {
        const msg = isCompleted ? `PO ${po.poNumber} telah DITERIMA PENUH.` : `PO ${po.poNumber} DITERIMA SEBAGIAN — sisa ${sumTargetAll - sumReceivedAll} unit belum diterima.`;
        addNotification('Barang Diterima', msg);
    }

    if (!isCompleted && typeof syncInventoryFromPOReceipt === 'function') {
        syncInventoryFromPOReceipt(id, po.poNumber, receivedItems);
    } else if (isCompleted && typeof syncInventoryFromPOReceipt === 'function') {
        syncInventoryFromPOReceipt(id, po.poNumber, receivedItems);
    }

    const toastMsg = isCompleted
        ? `✅ Semua barang diterima! PO selesai.`
        : `📦 Terima sebagian berhasil! Sisa ${sumTargetAll - sumReceivedAll} unit. Klik "Terima Barang" lagi untuk input sisanya.`;
    showToast(toastMsg, isCompleted ? 'success' : 'info');
    closeModal();
    renderPurchaseOrders();
};

window.viewPO = (id) => {
    const po = db.findById('purchaseOrders', id);
    const suppliers = db.read('suppliers');
    const sup = suppliers.find(s => s.id === po.supplierId) || { name: '-' };
    const itemRows = (po.items || []).map(i => `
        <tr class="border-b border-gray-100">
            <td class="py-2 px-2">${i.prodText}</td>
            <td class="py-2 px-2 text-right">${i.qty} ${i.unit || ''}</td>
            <td class="py-2 px-2 text-right">${formatCurrency(i.price)}</td>
            <td class="py-2 px-2 text-right font-medium">${formatCurrency(i.subtotal)}</td>
        </tr>`).join('');

    // --- Delivery timeline section ---
    const today = new Date(); today.setHours(0, 0, 0, 0);
    let deliveryHtml = '';
    if (po.etd) {
        const etdDate = new Date(po.etd); etdDate.setHours(0, 0, 0, 0);
        let etdLabel = `<span class="font-medium text-gray-800">${po.etd}</span>`;
        let delayBadge = '';
        if (po.actualDeliveryDate) {
            const actDate = new Date(po.actualDeliveryDate); actDate.setHours(0, 0, 0, 0);
            const diffDays = Math.round((actDate - etdDate) / 86400000);
            if (diffDays <= 0) {
                delayBadge = `<span class="ml-2 px-2 py-0.5 bg-green-100 text-green-700 rounded text-xs font-semibold">✓ On Time${diffDays < 0 ? ' (' + Math.abs(diffDays) + ' hari lebih cepat)' : ''}</span>`;
            } else {
                delayBadge = `<span class="ml-2 px-2 py-0.5 bg-red-100 text-red-700 rounded text-xs font-semibold">⚠ Delay ${diffDays} Hari</span>`;
            }
        } else if (po.status !== 'RECEIVED' && today > etdDate) {
            const overdue = Math.round((today - etdDate) / 86400000);
            delayBadge = `<span class="ml-2 px-2 py-0.5 bg-orange-100 text-orange-700 rounded text-xs font-semibold">⚠ Terlambat ${overdue} Hari</span>`;
        }
        deliveryHtml = `
        <div class="my-4 p-3 bg-blue-50 border border-blue-100 rounded-lg text-sm">
            <h3 class="text-xs font-semibold text-blue-600 uppercase tracking-wider mb-2">Info Pengiriman</h3>
            <div class="grid grid-cols-3 gap-3">
                <div>
                    <p class="text-gray-500 text-xs">Tanggal PO</p>
                    <p class="font-medium text-gray-800">${po.date ? po.date.split('T')[0] : '-'}</p>
                </div>
                <div>
                    <p class="text-gray-500 text-xs">ETD (Estimasi Tiba)</p>
                    <p>${etdLabel}${po.actualDeliveryDate ? '' : delayBadge}</p>
                </div>
                <div>
                    <p class="text-gray-500 text-xs">Actual Delivery</p>
                    <p class="font-medium ${po.actualDeliveryDate ? 'text-green-700' : 'text-gray-400'}">${po.actualDeliveryDate || 'Belum diterima'} ${po.actualDeliveryDate ? delayBadge : ''}</p>
                </div>
            </div>
        </div>`;
    }

    const printable = `<div class="max-w-4xl mx-auto bg-white p-6">
        <div class="flex justify-between items-start mb-6">
            <div><h2 class="text-3xl font-bold text-gray-800">PURCHASE ORDER</h2><p class="text-gray-500">${po.poNumber}</p></div>
            <div class="text-right"><h1 class="text-xl font-bold text-blue-800">${CONFIG.companyName}</h1>
                <p class="text-sm text-gray-500">${CONFIG.companyAddress}</p></div>
        </div>
        <div class="grid grid-cols-2 gap-8 mb-4">
            <div><h3 class="text-xs font-semibold text-gray-500 uppercase mb-1">Supplier</h3>
                <p class="font-medium">${sup.name}</p><p class="text-sm text-gray-600">${sup.phone || ''}</p></div>
            <div class="text-right"><h3 class="text-xs font-semibold text-gray-500 uppercase mb-1">Detail</h3>
                <p class="text-sm">Tanggal PO: ${po.date ? po.date.split('T')[0] : '-'}</p>
                ${po.etd ? `<p class="text-sm">ETD: <strong>${po.etd}</strong></p>` : ''}
                ${po.actualDeliveryDate ? `<p class="text-sm">Tiba: <strong>${po.actualDeliveryDate}</strong></p>` : ''}
                <p class="text-sm">Status: ${statusBadgePurch(po.status)}</p></div>
        </div>
        ${deliveryHtml}
        <table class="w-full border-collapse mb-6"><thead>
            <tr class="border-b-2 border-gray-800 text-sm"><th class="py-2 px-2">Produk</th><th class="py-2 px-2 text-right">Qty</th><th class="py-2 px-2 text-right">Harga</th><th class="py-2 px-2 text-right">Subtotal</th></tr>
        </thead><tbody>${itemRows}</tbody>
        <tfoot><tr><td colspan="3" class="py-3 px-2 text-right font-bold">Total:</td>
            <td class="py-3 px-2 text-right font-bold text-blue-600 border-t-2 border-gray-800">${formatCurrency(po.totalAmount)}</td></tr></tfoot>
        </table></div>`;
    const footer = `
        <button onclick='printHTML(\`${printable.replace(/`/g, "\\`").replace(/\n/g, "")}\`, "PO ${po.poNumber}")' class="w-full sm:w-auto inline-flex justify-center items-center rounded-md bg-purple-600 px-4 py-2 text-white text-sm font-medium hover:bg-purple-700 sm:ml-3 mr-2"><i class="fas fa-file-pdf mr-2"></i>Print/PDF</button>
        <button onclick="closeModal()" class="w-full sm:w-auto inline-flex justify-center rounded-md border border-gray-300 px-4 py-2 bg-white text-gray-700 text-sm font-medium">Tutup</button>`;
    showModal(`Detail PO - ${po.poNumber}`, printable, footer);
};

// ─────────────────── PURCHASE INVOICES ──────────────────────
function renderPurchaseInvoices() {
    document.getElementById('pageTitle').innerText = 'Supplier Invoice';
    const mainContent = document.getElementById('main-content');
    const invoices = db.read('purchaseInvoices').sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    const suppliers = db.read('suppliers');
    const supPayments = db.read('supplierPayments');

    let rows = invoices.map(inv => {
        const sup = suppliers.find(s => s.id === inv.supplierId) || { name: '-' };
        const paid = supPayments.filter(p => p.invoiceId === inv.id).reduce((s, p) => s + parseFloat(p.amount), 0);
        const balance = inv.totalAmount - paid;
        let actions = `<button onclick="viewPurchaseInvoice('${inv.id}')" class="text-gray-500 hover:text-gray-700 mr-2" title="Detail"><i class="fas fa-eye"></i></button>`;
        if (inv.status === 'UNPAID' && balance > 0)
            actions += `<button onclick="openSupplierPaymentModal('${inv.id}')" class="text-white bg-green-600 hover:bg-green-700 text-xs px-2 py-1 rounded font-medium">Bayar</button>`;
        return `<tr class="border-b border-gray-100 hover:bg-gray-50">
            <td class="py-3 px-4 text-sm font-medium text-purple-600">${inv.invoiceNumber}</td>
            <td class="py-3 px-4 text-sm text-gray-600">${formatDate(inv.date).slice(0, 11)}</td>
            <td class="py-3 px-4 text-sm text-gray-800">${sup.name}</td>
            <td class="py-3 px-4 text-sm text-gray-800 text-right">${formatCurrency(inv.totalAmount)}</td>
            <td class="py-3 px-4 text-sm text-green-600 text-right">${formatCurrency(paid)}</td>
            <td class="py-3 px-4 text-sm text-red-600 text-right font-medium">${formatCurrency(balance)}</td>
            <td class="py-3 px-4 text-sm">${statusBadgePurch(inv.status)}</td>
            <td class="py-3 px-4 text-sm text-right">${actions}</td>
        </tr>`;
    }).join('');
    if (!rows) rows = `<tr><td colspan="8" class="py-4 text-center text-gray-500">Belum ada Supplier Invoice</td></tr>`;

    mainContent.innerHTML = `
        <div class="bg-white rounded-lg shadow-sm border border-gray-100">
            <div class="flex justify-between items-center p-4 sm:p-6 border-b border-gray-100">
                <h2 class="text-lg font-semibold text-gray-800">Daftar Supplier Invoice</h2>
            </div>
            <div class="overflow-x-auto">
                <table class="w-full text-left border-collapse">
                    <thead><tr class="bg-gray-50 border-b border-gray-200">
                        <th class="py-3 px-4 text-xs font-semibold text-gray-600 uppercase">No. Invoice</th>
                        <th class="py-3 px-4 text-xs font-semibold text-gray-600 uppercase">Tanggal</th>
                        <th class="py-3 px-4 text-xs font-semibold text-gray-600 uppercase">Supplier</th>
                        <th class="py-3 px-4 text-xs font-semibold text-gray-600 uppercase text-right">Total</th>
                        <th class="py-3 px-4 text-xs font-semibold text-gray-600 uppercase text-right">Terbayar</th>
                        <th class="py-3 px-4 text-xs font-semibold text-gray-600 uppercase text-right">Sisa</th>
                        <th class="py-3 px-4 text-xs font-semibold text-gray-600 uppercase">Status</th>
                        <th class="py-3 px-4 text-xs font-semibold text-gray-600 uppercase text-right">Aksi</th>
                    </tr></thead>
                    <tbody>${rows}</tbody>
                </table>
            </div>
        </div>`;
}

window.createPurchaseInvoice = (poId) => {
    const po = db.findById('purchaseOrders', poId);
    if (!po) return;
    const inv = db.insert('purchaseInvoices', {
        invoiceNumber: 'PINV-' + Date.now().toString().slice(-6),
        purchaseOrderId: poId, supplierId: po.supplierId,
        date: new Date().toISOString(), totalAmount: po.totalAmount, status: 'UNPAID'
    });
    showToast('Supplier Invoice berhasil dibuat!', 'success');
    navigateTo('purchase-invoices');
    setTimeout(() => viewPurchaseInvoice(inv.id), 100);
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
        <div class="grid grid-cols-2 gap-2 bg-gray-50 p-3 rounded">
            <div><p class="text-gray-500">No. Invoice</p><p class="font-bold text-lg">${inv.invoiceNumber}</p></div>
            <div class="text-right"><p class="text-gray-500">Status</p>${statusBadgePurch(inv.status)}</div>
            <div><p class="text-gray-500">Supplier</p><p class="font-medium">${sup.name}</p></div>
            <div class="text-right"><p class="text-gray-500">Ref. PO</p><p class="font-medium">${po?.poNumber || '-'}</p></div>
        </div>
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
    </div>`;
    showModal(`Detail Invoice - ${inv.invoiceNumber}`, body, `<button onclick="closeModal()" class="w-full sm:w-auto inline-flex justify-center rounded-md border border-gray-300 px-4 py-2 bg-white text-gray-700 text-sm font-medium">Tutup</button>`);
};

// ─────────────────── SUPPLIER PAYMENTS ──────────────────────
function renderSupplierPayments(prefillInvoiceId = null) {
    document.getElementById('pageTitle').innerText = 'Pembayaran Supplier';
    const mainContent = document.getElementById('main-content');
    const allPayments = db.read('supplierPayments').sort((a, b) => new Date(b.date) - new Date(a.date));
    const allInvoices = db.read('purchaseInvoices');
    const suppliers = db.read('suppliers');

    let filteredPayments = allPayments;
    let bannerHtml = '';
    if (prefillInvoiceId) {
        window.currentSupPayInvoiceId = prefillInvoiceId;
        const inv = allInvoices.find(i => i.id === prefillInvoiceId);
        if (inv) {
            const sup = suppliers.find(s => s.id === inv.supplierId) || { name: '-' };
            const invPaid = allPayments.filter(p => p.invoiceId === inv.id).reduce((s, p) => s + parseFloat(p.amount), 0);
            filteredPayments = allPayments.filter(p => p.invoiceId === inv.id);
            bannerHtml = `<div class="mb-6 bg-orange-50 border border-orange-100 rounded-lg p-4 sm:p-6 shadow-sm">
                <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4">
                    <div><h3 class="text-orange-800 font-bold text-lg">Rekap Hutang: ${inv.invoiceNumber}</h3>
                        <p class="text-orange-600 text-sm">Supplier: <span class="font-semibold">${sup.name}</span></p></div>
                    <button onclick="renderSupplierPayments(null)" class="mt-2 sm:mt-0 text-orange-700 hover:text-orange-900 text-sm font-medium underline">
                        <i class="fas fa-list mr-1"></i>Tampilkan Semua</button>
                </div>
                <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div class="bg-white p-3 rounded border border-orange-100"><p class="text-gray-500 text-xs uppercase font-semibold">Total Hutang</p><p class="text-gray-800 font-bold text-lg">${formatCurrency(inv.totalAmount)}</p></div>
                    <div class="bg-white p-3 rounded border border-orange-100"><p class="text-gray-500 text-xs uppercase font-semibold">Total Dibayar</p><p class="text-green-600 font-bold text-lg">${formatCurrency(invPaid)}</p></div>
                    <div class="bg-white p-3 rounded border border-orange-100"><p class="text-gray-500 text-xs uppercase font-semibold">Sisa Hutang</p><p class="text-red-600 font-bold text-lg">${formatCurrency(inv.totalAmount - invPaid)}</p></div>
                </div></div>`;
        }
    }

    let rows = filteredPayments.map(p => {
        const inv = allInvoices.find(i => i.id === p.invoiceId) || { invoiceNumber: '-', supplierId: null };
        const sup = suppliers.find(s => s.id === inv.supplierId) || { name: '-' };
        return `<tr class="border-b border-gray-100 hover:bg-gray-50">
            <td class="py-3 px-4 text-sm font-medium text-gray-800">${p.paymentNumber}</td>
            <td class="py-3 px-4 text-sm text-gray-600">${formatDate(p.date).slice(0, 11)}</td>
            <td class="py-3 px-4 text-sm text-purple-600">${inv.invoiceNumber}</td>
            <td class="py-3 px-4 text-sm text-gray-800">${sup.name}</td>
            <td class="py-3 px-4 text-sm text-gray-600">${p.method}</td>
            <td class="py-3 px-4 text-sm text-gray-500">${p.referenceNote || '-'}</td>
            <td class="py-3 px-4 text-sm text-green-600 font-bold text-right">${formatCurrency(p.amount)}</td>
        </tr>`;
    }).join('');
    if (!rows) rows = `<tr><td colspan="7" class="py-4 text-center text-gray-500">Belum ada data pembayaran${prefillInvoiceId ? ' untuk invoice ini' : ''}</td></tr>`;

    mainContent.innerHTML = `
        ${bannerHtml}
        <div class="bg-white rounded-lg shadow-sm border border-gray-100">
            <div class="flex justify-between items-center p-4 sm:p-6 border-b border-gray-100">
                <h2 class="text-lg font-semibold text-gray-800">Riwayat Pembayaran Supplier</h2>
                <button onclick="openSupplierPaymentModal()" class="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-md text-sm font-medium">
                    <i class="fas fa-plus mr-2"></i>Bayar Hutang
                </button>
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
                    </tr></thead>
                    <tbody>${rows}</tbody>
                </table>
            </div>
        </div>`;
    if (prefillInvoiceId) {
        const inv = allInvoices.find(i => i.id === prefillInvoiceId);
        if (inv && inv.status === 'UNPAID') setTimeout(() => openSupplierPaymentModal(prefillInvoiceId), 100);
    }
}

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

window.saveSupplierPayment = () => {
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
    db.insert('supplierPayments', { paymentNumber: 'SPAY-' + Date.now().toString().slice(-6), invoiceId, date: new Date(date).toISOString(), method, referenceNote: ref, amount });
    const newPaid = paid + amount;
    if (newPaid >= inv.totalAmount - 1) { db.update('purchaseInvoices', inv.id, { status: 'PAID' }); showToast('Pembayaran berhasil! Invoice LUNAS.', 'success'); }
    else showToast('Pembayaran berhasil dicatat.', 'success');
    window.currentSupPayInvoiceId = null;
    closeModal(); renderSupplierPayments(invoiceId);
};

// ─────────────────── PURCHASE REPORTS ───────────────────────
function renderPurchaseReports() {
    document.getElementById('pageTitle').innerText = 'Laporan Pembelian';
    const mainContent = document.getElementById('main-content');

    // Default: bulan ini
    const now = new Date();
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
    const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0];

    mainContent.innerHTML = `
        <div class="bg-white rounded-xl shadow-sm border border-gray-100 p-5 mb-5">
            <h2 class="text-lg font-semibold text-gray-800 mb-4">Laporan Pembelian</h2>
            <div class="flex flex-wrap gap-3 items-end">
                <div>
                    <label class="block text-xs font-medium text-gray-500 mb-1">Dari Tanggal</label>
                    <input type="date" id="pr_from" value="${firstDay}" class="border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
                </div>
                <div>
                    <label class="block text-xs font-medium text-gray-500 mb-1">Sampai Tanggal</label>
                    <input type="date" id="pr_to" value="${lastDay}" class="border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
                </div>
                <button onclick="runPurchaseReport()" class="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2 rounded-lg text-sm font-semibold transition-colors flex items-center gap-2">
                    <i class="fas fa-search"></i> Tampilkan Laporan
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

    // Filter by date range
    const pos = allPOs.filter(po => {
        const d = new Date(po.date);
        return d >= from && d <= to;
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
        const medals = ['🥇', '🥈', '🥉'];
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
    const detailRows = pos.sort((a, b) => new Date(b.date) - new Date(a.date)).map(po => {
        const sup = suppliers.find(s => s.id === po.supplierId) || { name: '-' };
        const inv = purchaseInvoices.find(i => i.purchaseOrderId === po.id && i.status !== 'CANCELLED');
        const statusColor = {
            'RECEIVED': 'bg-green-100 text-green-700',
            'PARTIALLY RECEIVED': 'bg-orange-100 text-orange-700',
            'APPROVED': 'bg-blue-100 text-blue-700',
            'DRAFT': 'bg-gray-100 text-gray-600',
            'CANCELLED': 'bg-red-100 text-red-600'
        }[po.status] || 'bg-gray-100 text-gray-600';
        return `<tr class="border-b border-gray-100 hover:bg-gray-50 text-sm">
            <td class="py-2 px-3 font-medium text-blue-600">${po.poNumber}</td>
            <td class="py-2 px-3 text-gray-600">${formatDate(po.date).slice(0, 11)}</td>
            <td class="py-2 px-3 text-gray-800">${sup.name}</td>
            <td class="py-2 px-3 text-right font-semibold text-gray-800">${formatCurrency(po.totalAmount)}</td>
            <td class="py-2 px-3"><span class="px-2 py-0.5 rounded text-xs font-semibold ${statusColor}">${po.status}</span></td>
            <td class="py-2 px-3 text-center">${inv ? `<span class="px-2 py-0.5 bg-purple-100 text-purple-700 rounded text-xs font-semibold">Invoiced</span>` : `<span class="text-gray-400 text-xs">-</span>`}</td>
        </tr>`;
    }).join('') || `<tr><td colspan="6" class="py-4 text-center text-gray-400">Tidak ada PO dalam rentang tanggal ini</td></tr>`;

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
                        <th class="py-2 px-3 text-xs font-semibold text-gray-600 uppercase">Tanggal</th>
                        <th class="py-2 px-3 text-xs font-semibold text-gray-600 uppercase">Supplier</th>
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
    document.getElementById('pageTitle').innerText = 'Master Produk';
    const mainContent = document.getElementById('main-content');

    const products = db.read('products');
    const units = db.read('units');

    let rows = products.map(p => `
        <tr class="border-b border-gray-100">
            <td class="py-3 px-4 text-sm text-gray-800 font-medium">${p.code}</td>
            <td class="py-3 px-4 text-sm text-gray-800">${p.name}</td>
            <td class="py-3 px-4 text-sm text-gray-600">
                <span class="px-2 py-1 bg-slate-100 text-slate-700 rounded text-xs">${p.type}</span>
            </td>
            <td class="py-3 px-4 text-sm text-gray-600">${p.unit}</td>
            <td class="py-3 px-4 text-sm text-gray-600 text-right">${p.minStock}</td>
            <td class="py-3 px-4 text-sm text-right">
                <button onclick="editProduct('${p.id}')" class="text-blue-500 hover:text-blue-700 mr-2"><i class="fas fa-edit"></i></button>
                <button onclick="deleteProduct('${p.id}')" class="text-red-500 hover:text-red-700"><i class="fas fa-trash"></i></button>
            </td>
        </tr>
        `).join('');

    if (products.length === 0) {
        rows = `<tr > <td colspan="6" class="py-4 text-center text-gray-500">Belum ada data produk</td></tr> `;
    }

    mainContent.innerHTML = `
        <div class="bg-white rounded-lg shadow-sm border border-gray-100">
            <div class="flex justify-between items-center p-4 sm:p-6 border-b border-gray-100">
                <h2 class="text-lg font-semibold text-gray-800">Daftar Produk</h2>
                <button onclick="openProductModal()" class="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md transition-colors text-sm font-medium">
                    <i class="fas fa-plus mr-2"></i>Tambah Produk
                </button>
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
                    <td class="py-3 px-4 text-sm text-gray-500 text-right">${p.minStock}</td>
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
        // Stock Card (Movements)
        const movements = db.read('stockMovements').sort((a, b) => new Date(b.date) - new Date(a.date));
        const products = db.read('products');

        let rows = movements.map(m => {
            const product = products.find(p => p.id === m.productId) || { name: 'Unknown', unit: '' };
            const typeColor = m.type === 'IN' ? 'text-green-600 bg-green-50' : 'text-red-600 bg-red-50';
            const icon = m.type === 'IN' ? 'fa-arrow-down' : 'fa-arrow-up';

            return `
        <tr class="border-b border-gray-100">
                    <td class="py-3 px-4 text-sm text-gray-500">${formatDate(m.date)}</td>
                    <td class="py-3 px-4 text-sm text-gray-800 font-medium">${product.name}</td>
                    <td class="py-3 px-4 text-sm">
                        <span class="px-2 py-1 rounded text-xs font-semibold ${typeColor}">
                            <i class="fas ${icon} mr-1"></i>${m.type}
                        </span>
                    </td>
                    <td class="py-3 px-4 text-sm text-gray-800 text-right font-medium">${m.qty} ${product.unit}</td>
                    <td class="py-3 px-4 text-sm text-gray-600">${m.referenceType}</td>
                    <td class="py-3 px-4 text-sm text-gray-500 truncate max-w-[150px]" title="${m.notes}">${m.notes || '-'}</td>
                </tr>
        `;
        }).join('');

        if (movements.length === 0) rows = `<tr > <td colspan="6" class="py-4 text-center text-gray-500">Belum ada pergerakan stok</td></tr> `;

        contentHtml = `
        <div class="overflow-x-auto">
            <table class="w-full text-left border-collapse">
                <thead>
                    <tr class="bg-gray-50 border-b border-gray-200">
                        <th class="py-3 px-4 text-xs font-semibold text-gray-600 uppercase tracking-wider">Tanggal</th>
                        <th class="py-3 px-4 text-xs font-semibold text-gray-600 uppercase tracking-wider">Produk</th>
                        <th class="py-3 px-4 text-xs font-semibold text-gray-600 uppercase tracking-wider">Tipe</th>
                        <th class="py-3 px-4 text-xs font-semibold text-gray-600 uppercase tracking-wider text-right">Qty</th>
                        <th class="py-3 px-4 text-xs font-semibold text-gray-600 uppercase tracking-wider">Referensi</th>
                        <th class="py-3 px-4 text-xs font-semibold text-gray-600 uppercase tracking-wider">Keterangan</th>
                    </tr>
                </thead>
                <tbody>${rows}</tbody>
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
    document.getElementById('pageTitle').innerText = 'Purchase Orders';
    const mainContent = document.getElementById('main-content');

    const pos = db.read('purchaseOrders').sort((a, b) => new Date(b.date) - new Date(a.date));
    const suppliers = db.read('suppliers');

    let rows = pos.map(po => {
        const supplier = suppliers.find(s => s.id === po.supplierId) || { name: 'Unknown' };

        let statusBadge = '';
        if (po.status === 'DRAFT') statusBadge = '<span class="px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs font-semibold">DRAFT</span>';
        if (po.status === 'APPROVED') statusBadge = '<span class="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs font-semibold">APPROVED</span>';
        if (po.status === 'RECEIVED') statusBadge = '<span class="px-2 py-1 bg-green-100 text-green-700 rounded text-xs font-semibold">RECEIVED</span>';

        // Action buttons based on status
        let actions = `<button onclick="viewPO('${po.id}')" class="text-gray-500 hover:text-gray-700 mr-2" title="Detail"> <i class="fas fa-eye"></i></button> `;

        if (po.status === 'DRAFT') {
            actions += `
        <button onclick="updatePOStatus('${po.id}', 'APPROVED')" class="text-blue-500 hover:text-blue-700 mr-2" title="Approve"> <i class="fas fa-check"></i></button>
            <button onclick="deletePO('${po.id}')" class="text-red-500 hover:text-red-700" title="Delete"><i class="fas fa-trash"></i></button>
    `;
        } else if (po.status === 'APPROVED') {
            actions += `<button onclick="receiveGoodsPO('${po.id}')" class="text-green-600 hover:text-green-800 font-bold text-xs bg-green-50 px-2 py-1 rounded border border-green-200"> Set To Received</button> `;
        }

        // ETD cell with delay indicator
        const today2 = new Date(); today2.setHours(0, 0, 0, 0);
        let etdCell = '<span class="text-gray-400 text-xs">-</span>';
        if (po.etd) {
            const etdDate = new Date(po.etd); etdDate.setHours(0, 0, 0, 0);
            if (po.status === 'RECEIVED' && po.actualDeliveryDate) {
                const actDate = new Date(po.actualDeliveryDate); actDate.setHours(0, 0, 0, 0);
                const diff = Math.round((actDate - etdDate) / 86400000);
                etdCell = diff <= 0
                    ? `<span class="text-green-600 font-medium text-xs">${po.etd}</span><br><span class="text-green-500 text-[10px]">✓ On Time</span>`
                    : `<span class="text-gray-600 text-xs">${po.etd}</span><br><span class="text-red-500 text-[10px]">⚠ Delay ${diff}h</span>`;
            } else if (po.status !== 'RECEIVED' && today2 > etdDate) {
                const overdue = Math.round((today2 - etdDate) / 86400000);
                etdCell = `<span class="text-red-600 font-medium text-xs">${po.etd}</span><br><span class="text-orange-500 text-[10px]">⚠ Terlambat ${overdue}h</span>`;
            } else {
                etdCell = `<span class="text-gray-700 text-xs">${po.etd}</span>`;
            }
        }

        return `
        <tr class="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                <td class="py-3 px-4 text-sm font-medium text-blue-600">${po.poNumber}</td>
                <td class="py-3 px-4 text-sm text-gray-600">${formatDate(po.date).slice(0, 11)}</td>
                <td class="py-3 px-4 text-sm">${etdCell}</td>
                <td class="py-3 px-4 text-sm text-gray-800">${supplier.name}</td>
                <td class="py-3 px-4 text-sm text-gray-800 text-right font-medium">${formatCurrency(po.totalAmount)}</td>
                <td class="py-3 px-4 text-sm">${statusBadge}</td>
                <td class="py-3 px-4 text-sm text-right">${actions}</td>
            </tr>
        `;
    }).join('');

    if (pos.length === 0) rows = `<tr > <td colspan="7" class="py-4 text-center text-gray-500">Belum ada Purchase Order</td></tr> `;

    mainContent.innerHTML = `
        <div class="bg-white rounded-lg shadow-sm border border-gray-100">
            <div class="flex justify-between items-center p-4 sm:p-6 border-b border-gray-100">
                <h2 class="text-lg font-semibold text-gray-800">Daftar Purchase Order</h2>
                <button onclick="openPOModal()" class="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md transition-colors text-sm font-medium">
                    <i class="fas fa-plus mr-2"></i>Buat PO Baru
                </button>
            </div>
            <div class="overflow-x-auto">
                <table class="w-full text-left border-collapse">
                    <thead>
                        <tr class="bg-gray-50 border-b border-gray-200">
                            <th class="py-3 px-4 text-xs font-semibold text-gray-600 uppercase tracking-wider">No. PO</th>
                            <th class="py-3 px-4 text-xs font-semibold text-gray-600 uppercase tracking-wider">Tanggal</th>
                            <th class="py-3 px-4 text-xs font-semibold text-gray-600 uppercase tracking-wider">ETD</th>
                            <th class="py-3 px-4 text-xs font-semibold text-gray-600 uppercase tracking-wider">Supplier</th>
                            <th class="py-3 px-4 text-xs font-semibold text-gray-600 uppercase tracking-wider text-right">Total</th>
                            <th class="py-3 px-4 text-xs font-semibold text-gray-600 uppercase tracking-wider">Status</th>
                            <th class="py-3 px-4 text-xs font-semibold text-gray-600 uppercase tracking-wider text-right">Aksi</th>
                        </tr>
                    </thead>
                    <tbody>${rows}</tbody>
                </table>
            </div>
        </div>
        `;

}

// --- Purchase Orders Helper Functions ---
window.deletePO = (id) => {
    if (confirm('Yakin ingin menghapus Purchase Order ini?')) {
        db.delete('purchaseOrders', id);
        showToast('Purchase Order berhasil dihapus');
        renderPurchaseOrders();
    }
};

window.updatePOStatus = (id, newStatus) => {
    db.update('purchaseOrders', id, { status: newStatus });
    showToast(`Status PO diubah ke ${newStatus}`);
    renderPurchaseOrders();
};




// --- Sales Quotations Module ---
function renderSalesQuotations() {
    document.getElementById('pageTitle').innerText = 'Sales Quotation';
    const mainContent = document.getElementById('main-content');
    const qts = db.read('salesQuotations');
    const customers = db.read('customers');

    let rows = qts.map(qt => {
        const customerNameDisplay = qt.customerName || (customers.find(c => c.id === qt.customerId) || { name: 'Unknown' }).name;
        let statusColor = 'bg-gray-100 text-gray-700';
        if (qt.status === 'SENT') statusColor = 'bg-blue-100 text-blue-700';
        if (qt.status === 'CONFIRMED') statusColor = 'bg-green-100 text-green-700';
        if (qt.status === 'CANCELLED') statusColor = 'bg-red-100 text-red-700';
        if (qt.status === 'SO_CREATED') statusColor = 'bg-purple-100 text-purple-700';

        let actionHtml = `
            <button onclick="viewQT('${qt.id}')" class="text-gray-500 hover:text-gray-700 mr-2" title="Detail"><i class="fas fa-eye"></i></button>
            <button onclick="deleteQT('${qt.id}')" class="text-red-500 hover:text-red-700" title="Delete"><i class="fas fa-trash"></i></button>
        `;

        if (qt.status === 'DRAFT') {
            actionHtml = `
                <button onclick="updateQTStatus('${qt.id}', 'SENT')" class="text-blue-500 hover:text-blue-700 mr-2 border border-blue-500 px-2 py-1 rounded text-xs" title="Mark as Sent">Kirim</button>
                <button onclick="updateQTStatus('${qt.id}', 'CONFIRMED')" class="text-green-500 hover:text-green-700 mr-2 border border-green-500 px-2 py-1 rounded text-xs" title="Confirm QT">Confirm</button>
                <button onclick="updateQTStatus('${qt.id}', 'CANCELLED')" class="text-red-500 hover:text-red-700 mr-2 border border-red-500 px-2 py-1 rounded text-xs" title="Cancel QT">Cancel</button>
                ${actionHtml}
            `;
        } else if (qt.status === 'SENT') {
            actionHtml = `
                <button onclick="updateQTStatus('${qt.id}', 'CONFIRMED')" class="text-green-500 hover:text-green-700 mr-2 border border-green-500 px-2 py-1 rounded text-xs" title="Confirm QT">Confirm</button>
                <button onclick="updateQTStatus('${qt.id}', 'CANCELLED')" class="text-red-500 hover:text-red-700 mr-2 border border-red-500 px-2 py-1 rounded text-xs" title="Cancel QT">Cancel</button>
                ${actionHtml}
            `;
        } else if (qt.status === 'CONFIRMED') {
            actionHtml = `
                <button onclick="convertQTtoSO('${qt.id}')" class="text-white hover:bg-orange-600 bg-orange-500 mr-2 px-2 py-1 rounded text-xs shadow-sm" title="Create Sales Order">Buat SO</button>
                ${actionHtml}
            `;
        } else if (qt.status === 'SO_CREATED') {
            actionHtml = `
                <span class="inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-semibold bg-purple-100 text-purple-700 mr-2"><i class="fas fa-check-circle"></i> SO Dibuat</span>
                <button onclick="viewQT('${qt.id}')" class="text-gray-500 hover:text-gray-700" title="Detail"><i class="fas fa-eye"></i></button>
            `;
        }

        return `
            <tr class="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                <td class="py-3 px-4 text-sm font-medium text-blue-600">${qt.qtNumber}</td>
                <td class="py-3 px-4 text-sm text-gray-800">${formatDate(qt.date)}</td>
                <td class="py-3 px-4 text-sm text-gray-800">${customerNameDisplay}</td>
                <td class="py-3 px-4 text-sm text-gray-800 text-right">${formatCurrency(qt.totalAmount)}</td>
                <td class="py-3 px-4 text-sm text-center"><span class="px-2 py-1 rounded text-xs font-semibold ${statusColor}">${qt.status}</span></td>
                <td class="py-3 px-4 text-sm text-right whitespace-nowrap">${actionHtml}</td>
            </tr>
        `;
    }).join('');

    if (qts.length === 0) rows = `<tr><td colspan="6" class="py-4 text-center text-gray-500">Belum ada Quotation</td></tr>`;

    mainContent.innerHTML = `
        <div class="bg-white rounded-lg shadow-sm border border-gray-100">
            <div class="flex justify-between items-center p-4 sm:p-6 border-b border-gray-100">
                <h2 class="text-lg font-semibold text-gray-800">Sales Quotation</h2>
                <button onclick="openQTModal()" class="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md transition-colors text-sm font-medium">
                    <i class="fas fa-plus mr-2"></i>Buat Quotation
                </button>
            </div>
            <div class="overflow-x-auto">
                <table class="w-full text-left border-collapse">
                    <thead>
                        <tr class="bg-gray-50 border-b border-gray-200">
                            <th class="py-3 px-4 text-xs font-semibold text-gray-600 uppercase tracking-wider">No. Penawaran</th>
                            <th class="py-3 px-4 text-xs font-semibold text-gray-600 uppercase tracking-wider">Tanggal</th>
                            <th class="py-3 px-4 text-xs font-semibold text-gray-600 uppercase tracking-wider">Customer</th>
                            <th class="py-3 px-4 text-xs font-semibold text-gray-600 uppercase tracking-wider text-right">Total</th>
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

// --- Sales Quotations Helper Functions ---
window.openQTModal = () => {
    const fgProducts = db.read('inventoryItems').filter(i => i.category === 'FINISHED_GOODS' && i.status !== 'INACTIVE');
    const prodOptions = fgProducts.map(p => `<option value="${p.id}" data-name="${p.itemName}" data-unit="${p.unit}">${p.itemCode} - ${p.itemName}</option>`).join('');

    const body = `
            <div class="space-y-4">
                <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-1">No. QT</label>
                        <input type="text" id="qt_number" value="QT-${Date.now().toString().slice(-6)}" class="w-full border border-gray-300 rounded px-3 py-2 bg-gray-50" readonly>
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-1">Customer</label>
                        <select id="qt_customer_id" class="w-full border border-gray-300 rounded px-3 py-2 bg-white focus:ring-blue-500 focus:border-blue-500">
                            ${db.read('customers').map(c => `<option value="${c.id}">${c.name}</option>`).join('')}
                        </select>
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-1">Berlaku Hingga</label>
                        <input type="date" id="qt_valid_until" class="w-full border border-gray-300 rounded px-3 py-2 bg-white">
                    </div>
                </div>
                
                <div class="border-t border-gray-200 pt-4 mt-4">
                    <h4 class="text-md font-medium text-gray-800 mb-2">Item Quotation</h4>
                    <div class="flex space-x-2 mb-2">
                        <select id="qt_item_name" class="flex-1 border border-gray-300 rounded px-2 py-1 text-sm bg-white">
                            <option value="">-- Pilih Produk --</option>
                            ${prodOptions}
                        </select>
                        <input type="number" id="qt_item_qty" placeholder="Qty" min="1" class="w-20 border border-gray-300 rounded px-2 py-1 text-sm">
                        <input type="number" id="qt_item_price" placeholder="Harga Satuan" min="1" class="w-32 border border-gray-300 rounded px-2 py-1 text-sm">
                        <button type="button" onclick="addQTItemRow()" class="bg-gray-800 text-white px-3 py-1 rounded text-sm"><i class="fas fa-plus"></i></button>
                    </div>
                    
                    <table class="w-full text-sm text-left border mb-2">
                        <thead class="bg-gray-50">
                            <tr><th>Produk</th><th class="text-right">Qty</th><th class="text-right">Harga</th><th class="text-right">Subtotal</th><th></th></tr>
                        </thead>
                        <tbody id="qt_items_list"></tbody>
                    </table>
                    <div class="text-right text-lg font-bold text-gray-800">Total: Rp <span id="qt_total_display">0</span></div>
                </div>
            </div>
        `;

    const footer = `
            <button type="button" onclick="saveNewQT()" class="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-blue-600 text-white font-medium focus:outline-none sm:ml-3 sm:w-auto sm:text-sm">Simpan QT Draft</button>
            <button type="button" onclick="closeModal()" class="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-gray-700 font-medium sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm">Batal</button>
        `;

    window.tempQTItems = [];
    showModal('Buat Sales Quotation', body, footer);
};

window.addQTItemRow = () => {
    const sel = document.getElementById('qt_item_name');
    const opt = sel?.selectedOptions[0];
    const inventoryItemId = sel?.value;
    const prodText = opt?.dataset.name || '';
    const prodUnit = opt?.dataset.unit || 'PCS';

    const qty = parseFloat(document.getElementById('qt_item_qty').value);
    const price = parseFloat(document.getElementById('qt_item_price').value);

    if (!inventoryItemId) { showToast('Pilih produk dari daftar', 'error'); return; }
    if (!qty || !price) { showToast('Qty dan Harga Satuan harus diisi', 'error'); return; }

    const subtotal = qty * price;
    window.tempQTItems.push({ id: Date.now().toString(), inventoryItemId, productId: null, prodText, prodUnit, qty, price, subtotal });

    sel.value = '';
    document.getElementById('qt_item_qty').value = '';
    document.getElementById('qt_item_price').value = '';
    refreshQTItemsTable();
};

window.removeQTItemRow = (itemId) => {
    window.tempQTItems = window.tempQTItems.filter(i => i.id !== itemId);
    refreshQTItemsTable();
};

window.refreshQTItemsTable = () => {
    const tbody = document.getElementById('qt_items_list');
    let total = 0;
    tbody.innerHTML = window.tempQTItems.map(item => {
        total += item.subtotal;
        return `
                <tr class="border-t">
                    <td class="px-2 py-1">${item.prodText.split(' (')[0]}</td>
                    <td class="px-2 py-1 text-right">${item.qty} ${item.prodUnit}</td>
                    <td class="px-2 py-1 text-right">${item.price}</td>
                    <td class="px-2 py-1 text-right">${item.subtotal}</td>
                    <td class="px-2 py-1 text-center"><button class="text-red-500" onclick="removeQTItemRow('${item.id}')"><i class="fas fa-times"></i></button></td>
                </tr>
            `;
    }).join('');
    document.getElementById('qt_total_display').innerText = new Intl.NumberFormat('id-ID').format(total);
};

window.saveNewQT = () => {
    if (window.tempQTItems.length === 0) { showToast('QT harus memiliki minimal 1 item', 'error'); return; }

    const qtNumber = document.getElementById('qt_number').value;
    const customerId = document.getElementById('qt_customer_id').value;
    const validUntil = document.getElementById('qt_valid_until').value;
    const totalAmount = window.tempQTItems.reduce((sum, item) => sum + item.subtotal, 0);

    if (!customerId) { showToast('Customer harus dipilih', 'error'); return; }

    db.insert('salesQuotations', {
        qtNumber,
        date: new Date().toISOString(),
        validUntil,
        customerId,
        status: 'DRAFT',
        totalAmount,
        items: window.tempQTItems
    });

    showToast('QT Draft berhasil disimpan');
    closeModal();
    renderSalesQuotations();
};

window.updateQTStatus = (id, newStatus) => {
    db.update('salesQuotations', id, { status: newStatus });
    showToast(`QT status updated to ${newStatus}`);
    renderSalesQuotations();
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

    const printableHTML = `
           <div class="max-w-4xl mx-auto bg-white p-2 sm:p-6 mb-4">
                <div class="flex justify-between items-start mb-6">
                    <div>
                        <h2 class="text-3xl font-bold text-gray-800">SALES QUOTATION</h2>
                        <p class="text-gray-500 mt-1">${qt.qtNumber}</p>
                    </div>
                    <div class="text-right">
                        <h1 class="text-xl font-bold text-blue-800">${CONFIG.companyName}</h1>
                        <p class="text-sm text-gray-500">${CONFIG.companyAddress}</p>
                        <p class="text-xs text-gray-400">${CONFIG.companyPhone} | ${CONFIG.companyEmail}</p>
                    </div>
                </div>
                
                <div class="grid grid-cols-2 gap-8 mb-8">
                        <h3 class="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-2">Customer</h3>
                        <p class="font-medium text-gray-800">${customer ? customer.name : (qt.customerName || '-')}</p>
                        ${customer && customer.phone ? `<p class="text-sm text-gray-600">${customer.phone}</p>` : ''}
                        ${customer && customer.address ? `<p class="text-sm text-gray-600 whitespace-pre-wrap">${customer.address}</p>` : ''}
                    </div>
                    <div class="text-right">
                        <h3 class="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-2">Detail Penawaran</h3>
                        <p class="text-gray-800 text-sm mb-1">Tanggal: ${formatDate(qt.date).slice(0, 11)}</p>
                        ${qt.validUntil ? `<p class="text-gray-800 text-sm mb-1">Berlaku Hingga: <span class="font-medium">${qt.validUntil}</span></p>` : ''}
                        ${qt.paymentTerms ? (() => { const d1 = new Date(qt.date); const d2 = new Date(qt.paymentTerms); const days = Math.round((d2 - d1) / 86400000); return `<p class="text-gray-800 text-sm mb-1">Jatuh Tempo Pembayaran: <span class="font-medium">Net ${days} Hari (${qt.paymentTerms})</span></p>`; })() : ''}
                        <p class="text-gray-800 text-sm mt-2">Status: <span class="font-medium px-2 py-1 rounded bg-gray-100 text-gray-800">${qt.status}</span></p>
                    </div>
                </div>
                
                <table class="w-full text-left mb-8 border-collapse">
                    <thead>
                        <tr class="border-b-2 border-gray-800 text-gray-800 text-sm">
                            <th class="py-3 px-2">Produk</th>
                            <th class="py-3 px-2 text-right">Qty</th>
                            <th class="py-3 px-2 text-right">Harga Satuan</th>
                            <th class="py-3 px-2 text-right">Subtotal</th>
                        </tr>
                    </thead>
                    <tbody class="text-gray-700 text-sm">
                        ${qt.items.map(i => `
                            <tr class="border-b border-gray-200">
                                <td class="py-3 px-2">${i.prodText.split(' (')[0]}</td>
                                <td class="py-3 px-2 text-right">${i.qty}</td>
                                <td class="py-3 px-2 text-right">${formatCurrency(i.price)}</td>
                                <td class="py-3 px-2 text-right">${formatCurrency(i.subtotal)}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                    <tfoot>
                        <tr>
                            <td colspan="3" class="py-4 px-2 text-right font-bold text-gray-800">Total:</td>
                            <td class="py-4 px-2 text-right font-bold text-blue-600 text-lg border-t-2 border-gray-800">${formatCurrency(qt.totalAmount)}</td>
                        </tr>
                    </tfoot>
                </table>
           </div>
        `;

    const footer = `
            <button onclick='printHTML(\`${printableHTML.replace(/`/g, "\\`").replace(/\n/g, "")}\`, "Quotation ${qt.qtNumber}")' class="w-full sm:w-auto inline-flex justify-center items-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-purple-600 text-white font-medium hover:bg-purple-700 sm:text-sm mr-0 mb-3 sm:mb-0 sm:mr-3 transition-colors"> <i class="fas fa-file-pdf mr-2"></i> Print / Save PDF</button>
            <button onclick="closeModal()" class="w-full sm:w-auto inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-gray-700 font-medium hover:bg-gray-50 transition-colors sm:text-sm"> Tutup</button>
        `;

    showModal(`Detail QT-${qt.qtNumber} `, printableHTML, footer);
};

window.convertQTtoSO = (qtId) => {
    if (!confirm('Buat Sales Order otomatis dari Quotation ini?')) return;
    const qt = db.findById('salesQuotations', qtId);

    let custId = qt.customerId;

    const newSO = db.insert('salesOrders', {
        soNumber: 'SO-' + Date.now().toString().slice(-6),
        quotationId: qt.id,
        date: new Date().toISOString(),
        customerId: custId,
        paymentTerms: qt.paymentTerms || '',
        status: 'DRAFT',
        totalAmount: qt.totalAmount,
        items: qt.items
    });

    db.update('salesQuotations', qtId, { status: 'SO_CREATED' });
    showToast('Sales Order berhasil dibuat!', 'success');
    navigateTo('sales-orders');
    setTimeout(() => viewSO(newSO.id), 100);
    renderSalesQuotations();
};

// --- Sales Orders Module ---
function renderSalesOrders() {
    document.getElementById('pageTitle').innerText = 'Sales Orders';
    const mainContent = document.getElementById('main-content');

    // SO Logic is almost identical to PO but deducts stock on DELIVERED and validates stock first
    const sos = db.read('salesOrders').sort((a, b) => new Date(b.date) - new Date(a.date));
    const customers = db.read('customers');
    const invoices = db.read('salesInvoices');

    let rows = sos.map(so => {
        const customer = customers.find(c => c.id === so.customerId) || { name: 'Unknown' };
        const existingInvoice = invoices.find(inv => inv.salesOrderId === so.id && inv.status !== 'CANCELLED');

        let statusBadge = '';
        if (so.status === 'DRAFT') statusBadge = '<span class="px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs font-semibold">DRAFT</span>';
        if (so.status === 'CONFIRMED') statusBadge = '<span class="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs font-semibold">CONFIRMED</span>';
        if (so.status === 'DELIVERED') statusBadge = '<span class="px-2 py-1 bg-green-100 text-green-700 rounded text-xs font-semibold">DELIVERED</span>';

        let actions = `<button onclick="viewSO('${so.id}')" class="text-gray-500 hover:text-gray-700 mr-2" title="Detail"> <i class="fas fa-eye"></i></button> `;

        if (so.status === 'DRAFT') {
            actions += `
                <button onclick="updateSOStatus('${so.id}', 'CONFIRMED')" class="text-blue-500 hover:text-blue-700 mr-2" title="Confirm"> <i class="fas fa-check"></i></button>
                <button onclick="deleteSO('${so.id}')" class="text-red-500 hover:text-red-700" title="Delete"><i class="fas fa-trash"></i></button>
            `;
        }
        if ((so.status === 'CONFIRMED' || so.status === 'DELIVERED') && !existingInvoice) {
            actions += `<button onclick="createInvoiceFromSO('${so.id}')" class="text-white hover:bg-purple-700 font-bold text-xs bg-purple-600 px-2 py-1 rounded shadow-sm" title="Buat Invoice">Buat Invoice</button>`;
        } else if (existingInvoice) {
            actions += `<button onclick="navigateTo('sales-invoices')" class="text-purple-600 font-semibold text-xs border border-purple-200 bg-purple-50 px-2 py-1 rounded" title="Lihat Invoice">Invoiced</button>`;
        }

        return `
        <tr class="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                <td class="py-3 px-4 text-sm font-medium text-blue-600">${so.soNumber}</td>
                <td class="py-3 px-4 text-sm text-gray-600">${formatDate(so.date).slice(0, 11)}</td>
                <td class="py-3 px-4 text-sm text-gray-800">${customer.name}</td>
                <td class="py-3 px-4 text-sm text-gray-800 text-right font-medium">${formatCurrency(so.totalAmount)}</td>
                <td class="py-3 px-4 text-sm">${statusBadge}</td>
                <td class="py-3 px-4 text-sm text-right">${actions}</td>
            </tr>
        `;
    }).join('');

    if (sos.length === 0) rows = `<tr > <td colspan="6" class="py-4 text-center text-gray-500">Belum ada Sales Order</td></tr> `;

    mainContent.innerHTML = `
        <div class="bg-white rounded-lg shadow-sm border border-gray-100">
            <div class="flex justify-between items-center p-4 sm:p-6 border-b border-gray-100">
                <h2 class="text-lg font-semibold text-gray-800">Daftar Sales Order</h2>
                <button onclick="openSOModal()" class="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md transition-colors text-sm font-medium">
                    <i class="fas fa-plus mr-2"></i>Buat SO Baru
                </button>
            </div>
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
        </div>
        `;

}

// --- Sales Orders Helper Functions ---
window.openSOModal = (qtToConvert = null) => {
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
    const cusOptions = freshCustomers.map(c => `<option value="${c.id}" ${c.id === defaultCustId ? 'selected' : ''}> ${c.name}</option> `).join('');

    const body = `
        <div class="space-y-4">
                <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-1">No. SO</label>
                        <input type="text" id="so_number" value="SO-${Date.now().toString().slice(-6)}" class="w-full border border-gray-300 rounded px-3 py-2 bg-gray-50" readonly>
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-1">Customer</label>
                        <select id="so_customer" class="w-full border border-gray-300 rounded px-3 py-2 bg-white">${cusOptions}</select>
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-1">Tgl. Jatuh Tempo</label>
                        <input type="date" id="so_payment_terms" value="${qtToConvert && qtToConvert.paymentTerms ? qtToConvert.paymentTerms : ''}" class="w-full border border-gray-300 rounded px-3 py-2 bg-white">
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-1">Pajak</label>
                        <select id="so_tax_rate" onchange="recalcSOTotal()" class="w-full border border-gray-300 rounded px-3 py-2 bg-white">
                            <option value="0">0% (Tanpa Pajak)</option>
                            <option value="11">11% (PPN)</option>
                            <option value="12" selected>12% (PPN)</option>
                            <option value="20">20% (STLG)</option>
                            <option value="12_ppn_pemungut">12% Pemungut PPN</option>
                        </select>
                    </div>
                </div>
                
                <div class="border-t border-gray-200 pt-4 mt-4">
                    <h4 class="text-md font-medium text-gray-800 mb-2">Item Penjualan <span class="text-xs text-gray-400 font-normal">(Finished Goods dari Gudang)</span></h4>
                    <div class="flex space-x-2 mb-2 flex-wrap gap-y-2">
                        <select id="so_inv_item" onchange="onSOItemSelect()" class="flex-1 min-w-[200px] border border-gray-300 rounded px-2 py-1.5 text-sm bg-white">
                            <option value="">-- Pilih Item (Finished Goods) --</option>
                            ${(() => { const items = db.read('inventoryItems').filter(i => i.category === 'FINISHED_GOODS' && i.status !== 'INACTIVE'); return items.length ? items.map(i => { const stk = db.getInventoryStock(i.id); return `<option value="${i.id}" data-name="${i.itemName}" data-unit="${i.unit}" data-stock="${stk}">${i.itemCode} — ${i.itemName} (Stok: ${stk} ${i.unit})</option>`; }).join('') : '<option disabled>Belum ada Finished Goods di Gudang</option>'; })()}
                        </select>
                        <input id="so_item_qty" type="number" placeholder="Qty" min="1" class="w-20 border border-gray-300 rounded px-2 py-1 text-sm">
                        <input id="so_item_price" type="number" placeholder="Harga Jual" min="1" class="w-32 border border-gray-300 rounded px-2 py-1 text-sm">
                        <button type="button" onclick="addSOItemRow()" class="bg-gray-800 text-white px-3 py-1 rounded text-sm"><i class="fas fa-plus"></i></button>
                    </div>
                    <div id="so_inv_stock_info" class="text-xs text-blue-600 mb-2 hidden"></div>
                    
                    <table class="w-full text-sm text-left border mb-2">
                        <thead class="bg-gray-50">
                            <tr><th>Produk</th><th class="text-right">Qty</th><th class="text-right">Harga</th><th class="text-right">Subtotal</th><th></th></tr>
                        </thead>
                        <tbody id="so_items_list"></tbody>
                    </table>
                    <div class="border-t border-gray-100 pt-2 mt-2 space-y-1 text-right text-sm">
                        <div class="flex justify-end gap-4">
                            <span class="text-gray-500">DPP (Sebelum Pajak):</span>
                            <span id="so_dpp_display" class="font-medium text-gray-700 w-36 text-right">Rp 0</span>
                        </div>
                        <div class="flex justify-end gap-4">
                            <span class="text-gray-500" id="so_tax_label">PPN (12%):</span>
                            <span id="so_tax_display" class="font-medium text-orange-600 w-36 text-right">Rp 0</span>
                        </div>
                        <div class="flex justify-end gap-4 border-t pt-1">
                            <span class="text-gray-800 font-bold">Grand Total:</span>
                            <span id="so_total_display" class="font-bold text-gray-900 text-lg w-36 text-right">Rp 0</span>
                        </div>
                    </div>
                </div>
            </div>
    `;

    const footer = `
        <button type="button" onclick="saveNewSO()" class="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-blue-600 text-white font-medium focus:outline-none sm:ml-3 sm:w-auto sm:text-sm"> Simpan SO Draft</button>
            <button type="button" onclick="closeModal()" class="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-gray-700 font-medium sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm">Batal</button>
    `;

    showModal('Buat Sales Order', body, footer);
    if (qtToConvert) refreshSOItemsTable();
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
        info.innerHTML = `<i class="fas fa-info-circle mr-1"></i>Stok tersedia: <strong>${stock} ${unit}</strong>`;
        info.className = `text-xs mb-2 ${stock <= 0 ? 'text-red-600' : 'text-blue-600'}`;
    }
};

window.addSOItemRow = () => {
    const sel = document.getElementById('so_inv_item');
    const opt = sel?.selectedOptions[0];
    const inventoryItemId = sel?.value;
    const prodText = opt?.dataset.name || '';
    const prodUnit = opt?.dataset.unit || 'PCS';
    const qty = parseFloat(document.getElementById('so_item_qty').value);
    const price = parseFloat(document.getElementById('so_item_price').value);

    if (!inventoryItemId) { showToast('Pilih produk dari daftar', 'error'); return; }
    if (!qty || !price) { showToast('Qty dan Harga Jual harus diisi', 'error'); return; }

    // Cek stok
    const currentStock = parseFloat(opt.dataset.stock) || 0;
    if (qty > currentStock) {
        if (!confirm(`Stok "${prodText}" hanya ${currentStock} ${prodUnit}, tapi kamu mau jual ${qty}. Lanjut tetap buat SO?`)) return;
    }

    const subtotal = qty * price;
    window.tempSOItems.push({ id: Date.now().toString(), inventoryItemId, productId: null, prodText, prodUnit, qty, price, subtotal });

    sel.value = '';
    document.getElementById('so_item_qty').value = '';
    document.getElementById('so_item_price').value = '';
    const info = document.getElementById('so_inv_stock_info');
    if (info) info.classList.add('hidden');
    refreshSOItemsTable();
};

window.removeSOItemRow = (itemId) => {
    window.tempSOItems = window.tempSOItems.filter(i => i.id !== itemId);
    refreshSOItemsTable();
};

window.refreshSOItemsTable = () => {
    const tbody = document.getElementById('so_items_list');
    let total = 0;
    tbody.innerHTML = window.tempSOItems.map(item => {
        total += item.subtotal;
        return `
        <tr class="border-t">
                <td class="px-2 py-1">${item.prodText.split(' (')[0]}</td>
                <td class="px-2 py-1 text-right">${item.qty} ${item.prodUnit}</td>
                <td class="px-2 py-1 text-right">${item.price}</td>
                <td class="px-2 py-1 text-right">${item.subtotal}</td>
                <td class="px-2 py-1 text-center"><button class="text-red-500" onclick="removeSOItemRow('${item.id}')"><i class="fas fa-times"></i></button></td>
            </tr>
        `;
    }).join('');
    // Store raw total
    window._soRawTotal = total;
    recalcSOTotal();
};

window.recalcSOTotal = () => {
    const dpp = window._soRawTotal || 0;
    const sel = document.getElementById('so_tax_rate');
    const taxValue = sel ? sel.value : '12';
    const taxPct = parseFloat(taxValue) || 0;
    const taxAmt = Math.round(dpp * taxPct / 100);
    const grand = dpp + taxAmt;
    const fmt = v => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(v);
    if (document.getElementById('so_dpp_display')) document.getElementById('so_dpp_display').innerText = fmt(dpp);
    if (document.getElementById('so_tax_display')) document.getElementById('so_tax_display').innerText = fmt(taxAmt);
    if (document.getElementById('so_tax_label')) document.getElementById('so_tax_label').innerText = `PPN (${taxPct}%):`;
    if (document.getElementById('so_total_display')) document.getElementById('so_total_display').innerText = fmt(grand);
};

window.saveNewSO = () => {
    if (window.tempSOItems.length === 0) { showToast('SO harus memiliki minimal 1 item', 'error'); return; }

    const soNumber = document.getElementById('so_number').value;
    const customerId = document.getElementById('so_customer').value;
    const paymentTerms = document.getElementById('so_payment_terms').value;
    const taxRateRaw = document.getElementById('so_tax_rate')?.value || '12';
    const taxPct = parseFloat(taxRateRaw) || 0;
    const taxLabel = document.getElementById('so_tax_rate')?.selectedOptions[0]?.text || `${taxPct}%`;
    const dpp = window.tempSOItems.reduce((sum, item) => sum + item.subtotal, 0);
    const taxAmount = Math.round(dpp * taxPct / 100);
    const totalAmount = dpp + taxAmount;

    db.insert('salesOrders', {
        soNumber,
        date: new Date().toISOString(),
        customerId,
        paymentTerms,
        taxRate: taxPct,
        taxLabel,
        taxAmount,
        dpp,
        status: 'DRAFT',
        totalAmount,
        items: window.tempSOItems
    });

    showToast('SO Draft berhasil disimpan');
    closeModal();
    renderSalesOrders();
};

window.updateSOStatus = (id, newStatus) => {
    db.update('salesOrders', id, { status: newStatus });
    const so = db.findById('salesOrders', id);
    if (newStatus === 'CONFIRMED' && so) {
        if (typeof addNotification === 'function') {
            addNotification(
                'Pesanan Baru Siap Kirim',
                `SO ${so.soNumber} telah di-konfirmasi Sales. Siap diproses kirim.`
            );
        }
    }
    showToast(`SO status updated to ${newStatus} `);
    renderSalesOrders();
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

    const printableHTML = `
           <div class="max-w-4xl mx-auto bg-white p-2 sm:p-6 mb-4">
                <div class="flex justify-between items-start mb-6">
                    <div>
                        <h2 class="text-3xl font-bold text-gray-800">SALES ORDER</h2>
                        <p class="text-gray-500 mt-1">${so.soNumber}</p>
                    </div>
                    <div class="text-right">
                        <h1 class="text-xl font-bold text-blue-800">${CONFIG.companyName}</h1>
                        <p class="text-sm text-gray-500">${CONFIG.companyAddress}</p>
                        <p class="text-xs text-gray-400">${CONFIG.companyPhone} | ${CONFIG.companyEmail}</p>
                    </div>
                </div>
                
                <div class="grid grid-cols-2 gap-8 mb-8">
                    <div>
                        <h3 class="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-2">Customer</h3>
                        <p class="font-medium text-gray-800">${customer ? customer.name : '-'}</p>
                        ${customer && customer.phone ? `<p class="text-sm text-gray-600">${customer.phone}</p>` : ''}
                        ${customer && customer.address ? `<p class="text-sm text-gray-600 whitespace-pre-wrap">${customer.address}</p>` : ''}
                    </div>
                    <div class="text-right">
                        <h3 class="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-2">Detail Pesanan</h3>
                        <p class="text-gray-800 text-sm mb-1">Tanggal: ${formatDate(so.date).slice(0, 11)}</p>
                        ${so.paymentTerms ? (() => { const d1 = new Date(so.date); const d2 = new Date(so.paymentTerms); const days = Math.round((d2 - d1) / 86400000); return `<p class="text-gray-800 text-sm mb-1">Jatuh Tempo Pembayaran: <span class="font-medium">Net ${days} Hari (${so.paymentTerms})</span></p>`; })() : ''}
                        <p class="text-gray-800 text-sm mt-2">Status: <span class="font-medium px-2 py-1 rounded bg-gray-100 text-gray-800">${so.status}</span></p>
                    </div>
                </div>
                
                <table class="w-full text-left mb-8 border-collapse">
                    <thead>
                        <tr class="border-b-2 border-gray-800 text-gray-800 text-sm">
                            <th class="py-3 px-2">Produk</th>
                            <th class="py-3 px-2 text-right">Qty</th>
                            <th class="py-3 px-2 text-right">Harga Satuan</th>
                            <th class="py-3 px-2 text-right">Subtotal</th>
                        </tr>
                    </thead>
                    <tbody class="text-gray-700 text-sm">
                        ${so.items.map(i => `
                            <tr class="border-b border-gray-200">
                                <td class="py-3 px-2">${i.prodText.split(' (')[0]}</td>
                                <td class="py-3 px-2 text-right">${i.qty}</td>
                                <td class="py-3 px-2 text-right">${formatCurrency(i.price)}</td>
                                <td class="py-3 px-2 text-right">${formatCurrency(i.subtotal)}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                    <tfoot>
                        ${so.dpp != null ? `
                        <tr>
                            <td colspan="3" class="py-2 px-2 text-right text-sm text-gray-600">DPP (Sebelum Pajak):</td>
                            <td class="py-2 px-2 text-right text-sm text-gray-800 font-medium">${formatCurrency(so.dpp)}</td>
                        </tr>
                        <tr>
                            <td colspan="3" class="py-2 px-2 text-right text-sm text-gray-600">${so.taxLabel || `PPN (${so.taxRate || 0}%)`}:</td>
                            <td class="py-2 px-2 text-right text-sm text-orange-600 font-medium">${formatCurrency(so.taxAmount || 0)}</td>
                        </tr>` : ''}
                        <tr>
                            <td colspan="3" class="py-4 px-2 text-right font-bold text-gray-800">Grand Total:</td>
                            <td class="py-4 px-2 text-right font-bold text-blue-600 text-lg border-t-2 border-gray-800">${formatCurrency(so.totalAmount)}</td>
                        </tr>
                    </tfoot>
                </table>
           </div>
        `;

    const footer = `
            <button onclick='printHTML(\`${printableHTML.replace(/`/g, "\\`").replace(/\n/g, "")}\`, "Sales Order ${so.soNumber}")' class="w-full sm:w-auto inline-flex justify-center items-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-purple-600 text-white font-medium hover:bg-purple-700 sm:text-sm mr-0 mb-3 sm:mb-0 sm:mr-3 transition-colors"> <i class="fas fa-file-pdf mr-2"></i> Print / Save PDF</button>
            <button onclick="closeModal()" class="w-full sm:w-auto inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-gray-700 font-medium hover:bg-gray-50 transition-colors sm:text-sm"> Tutup</button>
        `;

    showModal(`Detail SO-${so.soNumber} `, printableHTML, footer);
};

// --- Create Invoice Logic ---
window.createInvoiceFromSO = (soId) => {
    if (!confirm('Buat Invoice untuk pesanan ini?')) return;
    const so = db.findById('salesOrders', soId);

    db.insert('salesInvoices', {
        invoiceNumber: 'INV-' + Date.now().toString().slice(-6),
        salesOrderId: so.id,
        customerId: so.customerId,
        date: new Date().toISOString(),
        totalAmount: so.totalAmount,
        status: 'UNPAID'
    });

    showToast('Invoice berhasil dibuat!', 'success');
    navigateTo('sales-invoices');
};

// --- Sales Invoices Module ---
function renderSalesInvoices() {
    document.getElementById('pageTitle').innerText = 'Sales Invoices';
    const mainContent = document.getElementById('main-content');

    const invoices = db.read('salesInvoices').sort((a, b) => new Date(b.date) - new Date(a.date));
    const customers = db.read('customers');
    const payments = db.read('payments');

    let rows = invoices.map(inv => {
        const customer = customers.find(c => c.id === inv.customerId) || { name: 'Unknown' };

        // Calculate paid amount
        const invPayments = payments.filter(p => p.invoiceId === inv.id);
        const totalPaid = invPayments.reduce((sum, p) => sum + parseFloat(p.amount), 0);
        const balance = inv.totalAmount - totalPaid;

        let statusBadge = '';
        if (inv.status === 'UNPAID') statusBadge = '<span class="px-2 py-1 bg-red-100 text-red-700 rounded text-xs font-semibold">UNPAID</span>';
        if (inv.status === 'PAID') statusBadge = '<span class="px-2 py-1 bg-green-100 text-green-700 rounded text-xs font-semibold">PAID</span>';
        if (inv.status === 'CANCELLED') statusBadge = '<span class="px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs font-semibold">CANCELLED</span>';

        let actionHtml = `<button onclick="viewInvoice('${inv.id}')" class="text-gray-500 hover:text-gray-700 mr-2" title="Detail"><i class="fas fa-eye"></i></button>`;

        if (inv.status === 'UNPAID' && balance > 0) {
            actionHtml += `<button onclick="openPaymentModal('${inv.id}')" class="text-white hover:bg-green-700 bg-green-600 px-2 py-1 rounded text-xs shadow-sm mr-2" title="Bayar">Bayar</button>`;
            actionHtml += `<button onclick="cancelInvoice('${inv.id}')" class="text-red-500 hover:text-red-700" title="Batalkan"><i class="fas fa-times-circle"></i></button>`;
        }

        return `
            <tr class="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                <td class="py-3 px-4 text-sm font-medium text-purple-600">${inv.invoiceNumber}</td>
                <td class="py-3 px-4 text-sm text-gray-800">${formatDate(inv.date).slice(0, 11)}</td>
                <td class="py-3 px-4 text-sm text-gray-800">${customer.name}</td>
                <td class="py-3 px-4 text-sm text-gray-800 text-right">${formatCurrency(inv.totalAmount)}</td>
                <td class="py-3 px-4 text-sm text-gray-800 text-right text-green-600">${formatCurrency(totalPaid)}</td>
                <td class="py-3 px-4 text-sm text-center">${statusBadge}</td>
                <td class="py-3 px-4 text-sm text-right whitespace-nowrap">${actionHtml}</td>
            </tr>
        `;
    }).join('');

    if (invoices.length === 0) rows = `<tr><td colspan="7" class="py-4 text-center text-gray-500">Belum ada Invoice</td></tr>`;

    mainContent.innerHTML = `
        <div class="bg-white rounded-lg shadow-sm border border-gray-100">
            <div class="flex justify-between items-center p-4 sm:p-6 border-b border-gray-100">
                <h2 class="text-lg font-semibold text-gray-800">Daftar Invoice Penjualan</h2>
            </div>
            <div class="overflow-x-auto">
                <table class="w-full text-left border-collapse">
                    <thead>
                        <tr class="bg-gray-50 border-b border-gray-200">
                            <th class="py-3 px-4 text-xs font-semibold text-gray-600 uppercase tracking-wider">No. INV</th>
                            <th class="py-3 px-4 text-xs font-semibold text-gray-600 uppercase tracking-wider">Tanggal</th>
                            <th class="py-3 px-4 text-xs font-semibold text-gray-600 uppercase tracking-wider">Customer</th>
                            <th class="py-3 px-4 text-xs font-semibold text-gray-600 uppercase tracking-wider text-right">Total Tagihan</th>
                            <th class="py-3 px-4 text-xs font-semibold text-gray-600 uppercase tracking-wider text-right">Terbayar</th>
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

window.cancelInvoice = (id) => {
    if (confirm('Yakin ingin membatalkan invoice ini?')) {
        db.update('salesInvoices', id, { status: 'CANCELLED' });
        showToast('Invoice dibatalkan');
        renderSalesInvoices();
    }
};

window.viewInvoice = (id) => {
    const inv = db.findById('salesInvoices', id);
    const so = db.findById('salesOrders', inv.salesOrderId);
    const customer = db.findById('customers', inv.customerId);

    const invPayments = db.read('payments').filter(p => p.invoiceId === inv.id);
    const totalPaid = invPayments.reduce((sum, p) => sum + parseFloat(p.amount), 0);

    const printableHTML = `
           <div class="max-w-4xl mx-auto bg-white p-2 sm:p-6 mb-4">
                <div class="flex justify-between items-start mb-6">
                    <div>
                        <h2 class="text-3xl font-bold text-gray-800">INVOICE</h2>
                        <p class="text-gray-500 mt-1">${inv.invoiceNumber}</p>
                    </div>
                    <div class="text-right">
                        <h1 class="text-xl font-bold text-blue-800">${CONFIG.companyName}</h1>
                        <p class="text-sm text-gray-500">${CONFIG.companyAddress}</p>
                        <p class="text-xs text-gray-400">${CONFIG.companyPhone} | ${CONFIG.companyEmail}</p>
                    </div>
                </div>
                
                <div class="grid grid-cols-2 gap-8 mb-8">
                    <div>
                        <h3 class="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-2">Ditagihkan Ke</h3>
                        <p class="font-medium text-gray-800">${customer ? customer.name : '-'}</p>
                        ${customer && customer.phone ? `<p class="text-sm text-gray-600">${customer.phone}</p>` : ''}
                        ${customer && customer.address ? `<p class="text-sm text-gray-600 whitespace-pre-wrap">${customer.address}</p>` : ''}
                    </div>
                    <div class="text-right">
                        <h3 class="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-2">Detail Invoice</h3>
                        <p class="text-gray-800 text-sm mb-1">Tanggal: ${formatDate(inv.createdAt).slice(0, 11)}</p>
                        <p class="text-gray-800 text-sm mb-1">Ref. SO: ${so ? so.soNumber : '-'}</p>
                        <p class="text-gray-800 text-sm">Status: <span class="font-medium px-2 py-1 rounded ${inv.status === 'PAID' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}">${inv.status}</span></p>
                    </div>
                </div>
                
                <table class="w-full text-left mb-8 border-collapse">
                    <thead>
                        <tr class="border-b-2 border-gray-800 text-gray-800 text-sm">
                            <th class="py-3 px-2">Produk</th>
                            <th class="py-3 px-2 text-right">Qty</th>
                            <th class="py-3 px-2 text-right">Harga Satuan</th>
                            <th class="py-3 px-2 text-right">Subtotal</th>
                        </tr>
                    </thead>
                    <tbody class="text-gray-700 text-sm">
                        ${so && so.items ? so.items.map(i => `
                            <tr class="border-b border-gray-200">
                                <td class="py-3 px-2">${i.prodText.split(' (')[0]}</td>
                                <td class="py-3 px-2 text-right">${i.qty}</td>
                                <td class="py-3 px-2 text-right">${formatCurrency(i.price)}</td>
                                <td class="py-3 px-2 text-right">${formatCurrency(i.subtotal)}</td>
                            </tr>
                        `).join('') : '<tr><td colspan="4" class="py-4 text-center italic text-gray-400">Tidak ada item</td></tr>'}
                    </tbody>
                    <tfoot>
                        <tr>
                            <td colspan="3" class="py-4 px-2 text-right font-bold text-gray-800">Total Tagihan:</td>
                            <td class="py-4 px-2 text-right font-bold text-gray-800 border-t-2 border-gray-800">${formatCurrency(inv.totalAmount)}</td>
                        </tr>
                        <tr>
                            <td colspan="3" class="py-2 px-2 text-right font-semibold text-green-600">Total Terbayar:</td>
                            <td class="py-2 px-2 text-right font-semibold text-green-600">${formatCurrency(totalPaid)}</td>
                        </tr>
                        <tr>
                            <td colspan="3" class="py-2 px-2 text-right font-bold text-red-600 italic">Sisa Tagihan:</td>
                            <td class="py-2 px-2 text-right font-bold text-red-600 text-lg border-t border-red-200 bg-red-50">${formatCurrency(inv.totalAmount - totalPaid)}</td>
                        </tr>
                    </tfoot>
                </table>

                ${invPayments.length > 0 ? `
                <div class="mt-8">
                    <h3 class="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-2 border-b pb-1">Riwayat Pembayaran</h3>
                    <table class="w-full text-left text-sm">
                        <thead>
                            <tr class="text-gray-600 border-b">
                                <th class="py-2">Tanggal</th>
                                <th class="py-2">Metode</th>
                                <th class="py-2 text-right">Jumlah</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${invPayments.map(p => `
                                <tr class="border-b border-gray-100">
                                    <td class="py-2">${formatDate(p.date).slice(0, 11)}</td>
                                    <td class="py-2">${p.method}</td>
                                    <td class="py-2 text-right font-medium text-green-600">${formatCurrency(p.amount)}</td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
                ` : ''}
           </div>
        `;

    const footer = `
            <button onclick='printHTML(\`${printableHTML.replace(/`/g, "\\`").replace(/\n/g, "")}\`, "Invoice ${inv.invoiceNumber}")' class="w-full sm:w-auto inline-flex justify-center items-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-purple-600 text-white font-medium hover:bg-purple-700 sm:text-sm mr-0 mb-3 sm:mb-0 sm:mr-3 transition-colors"> <i class="fas fa-file-pdf mr-2"></i> Print / Save PDF</button>
            <button onclick="closeModal()" class="w-full sm:w-auto inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-gray-700 font-medium hover:bg-gray-50 transition-colors sm:text-sm"> Tutup</button>
        `;

    showModal(`Detail Invoice ${inv.invoiceNumber}`, printableHTML, footer);
};

// To be implemented soon in Payments module
window.openPaymentModal = (invoiceId) => {
    window.currentPaymentInvoiceId = invoiceId;
    renderSalesPayments(invoiceId);
};

// --- Sales Payments Module ---
function renderSalesPayments(prefillInvoiceId = null) {
    document.getElementById('pageTitle').innerText = 'Sales Payments';
    const mainContent = document.getElementById('main-content');

    const payments = db.read('payments').sort((a, b) => new Date(b.date) - new Date(a.date));
    const invoices = db.read('salesInvoices');
    const customers = db.read('customers');

    let filteredPayments = payments;
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
                <div class="mb-6 bg-purple-50 border border-purple-100 rounded-lg p-4 sm:p-6 shadow-sm">
                    <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4">
                        <div>
                            <h3 class="text-purple-800 font-bold text-lg">Rekap Pembayaran: ${inv.invoiceNumber}</h3>
                            <p class="text-purple-600 text-sm">Customer: <span class="font-semibold">${customer.name}</span></p>
                        </div>
                        <button onclick="renderSalesPayments(null)" class="mt-2 sm:mt-0 text-purple-700 hover:text-purple-900 text-sm font-medium underline">
                            <i class="fas fa-list mr-1"></i>Tampilkan Semua Data
                        </button>
                    </div>
                    <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <div class="bg-white p-3 rounded border border-purple-100">
                            <p class="text-gray-500 text-xs uppercase font-semibold">Total Tagihan</p>
                            <p class="text-gray-800 font-bold text-lg">${formatCurrency(inv.totalAmount)}</p>
                        </div>
                        <div class="bg-white p-3 rounded border border-purple-100">
                            <p class="text-gray-500 text-xs uppercase font-semibold">Total Terbayar</p>
                            <p class="text-green-600 font-bold text-lg">${formatCurrency(totalPaid)}</p>
                        </div>
                        <div class="bg-white p-3 rounded border border-purple-100">
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
                <td class="py-3 px-4 text-sm text-purple-600">${inv.invoiceNumber}</td>
                <td class="py-3 px-4 text-sm text-gray-800">${customer.name}</td>
                <td class="py-3 px-4 text-sm text-gray-800">${p.method}</td>
                <td class="py-3 px-4 text-sm text-green-600 font-bold text-right">${formatCurrency(p.amount)}</td>
            </tr>
        `;
    }).join('');

    if (filteredPayments.length === 0) rows = `<tr><td colspan="6" class="py-4 text-center text-gray-500">Belum ada data pembayaran ${prefillInvoiceId ? 'untuk invoice ini' : ''}</td></tr>`;

    mainContent.innerHTML = `
        ${recapBannerHtml}
        <div class="bg-white rounded-lg shadow-sm border border-gray-100">
            <div class="flex justify-between items-center p-4 sm:p-6 border-b border-gray-100">
                <h2 class="text-lg font-semibold text-gray-800">Riwayat Pembayaran</h2>
                <button onclick="openNewPaymentModal()" class="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-md transition-colors text-sm font-medium">
                    <i class="fas fa-plus mr-2"></i>Terima Pembayaran
                </button>
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

window.saveNewPayment = () => {
    const invoices = db.read('salesInvoices');
    const payments = db.read('payments');

    const invoiceId = document.getElementById('pay_invoice_id').value;
    const method = document.getElementById('pay_method').value;
    const inputAmount = parseFloat(document.getElementById('pay_amount').value);
    const dateInput = document.getElementById('pay_date').value;

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
    db.insert('payments', {
        paymentNumber: 'PAY-' + Date.now().toString().slice(-6),
        invoiceId: inv.id,
        date: dateInput ? new Date(dateInput).toISOString() : new Date().toISOString(),
        method: method,
        amount: inputAmount
    });

    // Check if fully paid
    const newTotalPaid = totalPaid + inputAmount;
    if (newTotalPaid >= inv.totalAmount - 1) {
        db.update('salesInvoices', inv.id, { status: 'PAID' });
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
    document.getElementById('pageTitle').innerText = 'Sales Reports';
    const mainContent = document.getElementById('main-content');

    // Default date range: current month
    const now = new Date();
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);
    const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().slice(0, 10);

    mainContent.innerHTML = `
        <div class="space-y-6">
            <!-- Filter Panel -->
            <div class="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
                <h3 class="text-sm font-semibold text-gray-600 uppercase tracking-wider mb-4"><i class="fas fa-filter mr-2 text-blue-500"></i>Filter Laporan</h3>
                <div class="flex flex-wrap items-end gap-4">
                    <div>
                        <label class="block text-xs font-medium text-gray-500 mb-1">Dari Tanggal</label>
                        <input type="date" id="report_from" value="${firstDay}" class="border border-gray-300 rounded px-3 py-2 text-sm bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
                    </div>
                    <div>
                        <label class="block text-xs font-medium text-gray-500 mb-1">Sampai Tanggal</label>
                        <input type="date" id="report_to" value="${lastDay}" class="border border-gray-300 rounded px-3 py-2 text-sm bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
                    </div>
                    <button onclick="runSalesReport()" class="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2 rounded-lg text-sm font-medium transition-colors shadow-sm">
                        <i class="fas fa-search mr-2"></i>Tampilkan Laporan
                    </button>
                </div>
            </div>
            <!-- Report Output -->
            <div id="sales_report_output"></div>
        </div>
    `;

    // Auto-render on load
    runSalesReport();
}

window.runSalesReport = () => {
    const fromStr = document.getElementById('report_from').value;
    const toStr = document.getElementById('report_to').value;
    if (!fromStr || !toStr) { showToast('Isi tanggal dari dan sampai', 'error'); return; }

    const from = new Date(fromStr); from.setHours(0, 0, 0, 0);
    const to = new Date(toStr); to.setHours(23, 59, 59, 999);

    const sos = db.read('salesOrders').filter(so => {
        const d = new Date(so.date);
        return d >= from && d <= to;
    });

    const customers = db.read('customers');
    const invoices = db.read('salesInvoices');

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
        const hasInv = invoices.find(i => i.salesOrderId === so.id);
        return `<tr class="border-b border-gray-100 hover:bg-gray-50 text-sm">
            <td class="py-2 px-4 font-medium text-blue-600">${so.soNumber}</td>
            <td class="py-2 px-4 text-gray-600">${formatDate(so.date).slice(0, 11)}</td>
            <td class="py-2 px-4 text-gray-800">${cust.name}</td>
            <td class="py-2 px-4 text-right font-medium text-gray-800">${formatCurrency(so.totalAmount)}</td>
            <td class="py-2 px-4 text-center">${statusBadge}</td>
            <td class="py-2 px-4 text-center">${hasInv ? '<span class="text-green-600 text-xs font-medium">✓ Invoice</span>' : '<span class="text-gray-400 text-xs">-</span>'}</td>
        </tr>`;
    }).join('') || `<tr><td colspan="6" class="py-6 text-center text-gray-500 text-sm">Tidak ada order dalam rentang tanggal ini.</td></tr>`;

    const topProdRows = topProducts.map((p, idx) => `
        <tr class="border-b border-gray-100 hover:bg-gray-50 text-sm">
            <td class="py-2 px-4">
                <span class="inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold mr-2 ${idx === 0 ? 'bg-yellow-100 text-yellow-700' : idx === 1 ? 'bg-gray-200 text-gray-600' : idx === 2 ? 'bg-orange-100 text-orange-700' : 'bg-blue-50 text-blue-600'}">${idx + 1}</span>
                ${p.name}
            </td>
            <td class="py-2 px-4 text-right font-bold text-blue-700">${p.qty.toLocaleString('id-ID')} ${p.unit}</td>
            <td class="py-2 px-4 text-right text-gray-700">${formatCurrency(p.revenue)}</td>
        </tr>
    `).join('') || `<tr><td colspan="3" class="py-6 text-center text-gray-500 text-sm">Tidak ada data produk.</td></tr>`;

    document.getElementById('sales_report_output').innerHTML = `
        <!-- Summary Cards -->
        <div class="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
            <div class="bg-white rounded-xl shadow-sm border border-gray-100 p-5 flex items-center gap-4">
                <div class="rounded-full bg-blue-100 p-3"><i class="fas fa-shopping-cart text-blue-600 text-lg"></i></div>
                <div>
                    <p class="text-xs text-gray-500 font-medium">Total Order Masuk</p>
                    <p class="text-2xl font-bold text-gray-800">${totalOrders}</p>
                    <p class="text-xs text-gray-400">${confirmedOrders} dikonfirmasi/dikirim</p>
                </div>
            </div>
            <div class="bg-white rounded-xl shadow-sm border border-gray-100 p-5 flex items-center gap-4">
                <div class="rounded-full bg-green-100 p-3"><i class="fas fa-chart-line text-green-600 text-lg"></i></div>
                <div>
                    <p class="text-xs text-gray-500 font-medium">Total Omzet</p>
                    <p class="text-2xl font-bold text-gray-800">${formatCurrency(totalRevenue)}</p>
                    <p class="text-xs text-gray-400">dari ${fromStr} s/d ${toStr}</p>
                </div>
            </div>
            <div class="bg-white rounded-xl shadow-sm border border-gray-100 p-5 flex items-center gap-4">
                <div class="rounded-full bg-purple-100 p-3"><i class="fas fa-box text-purple-600 text-lg"></i></div>
                <div>
                    <p class="text-xs text-gray-500 font-medium">Jenis Produk Terjual</p>
                    <p class="text-2xl font-bold text-gray-800">${Object.keys(prodMap).length}</p>
                    <p class="text-xs text-gray-400">produk berbeda</p>
                </div>
            </div>
        </div>

        <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <!-- Top Products -->
            <div class="bg-white rounded-xl shadow-sm border border-gray-100">
                <div class="p-5 border-b border-gray-100">
                    <h3 class="text-base font-semibold text-gray-800"><i class="fas fa-trophy mr-2 text-yellow-500"></i>Produk Terlaris</h3>
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
                    <h3 class="text-base font-semibold text-gray-800"><i class="fas fa-list-alt mr-2 text-blue-500"></i>Daftar Pesanan</h3>
                </div>
                <div class="overflow-x-auto">
                    <table class="w-full">
                        <thead>
                            <tr class="bg-gray-50 text-xs uppercase tracking-wider text-gray-500 border-b border-gray-200">
                                <th class="py-3 px-4 text-left">No. SO</th>
                                <th class="py-3 px-4 text-left">Tanggal</th>
                                <th class="py-3 px-4 text-left">Customer</th>
                                <th class="py-3 px-4 text-right">Total</th>
                                <th class="py-3 px-4 text-center">Status</th>
                                <th class="py-3 px-4 text-center">Invoice</th>
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
    showModal('Buat Master BOM Baru', body, footer);
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
                <td class="px-2 py-1 text-right">${item.qty} ${item.prodUnit}</td>
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
                    ${bom.items.map(i => `<tr><td class="p-2 border-b">${i.prodText}</td><td class="p-2 border-b text-right">${i.qty} ${i.prodUnit}</td></tr>`).join('')}
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

    showModal('Buat Rencana Produksi', body, footer);
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
        return `<li>${p.name}: ${u.qty} ${p.unit}</li>`;
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

    // Close dropdown when clicking outside
    document.addEventListener('click', (e) => {
        const dropdown = document.getElementById('notif-dropdown');
        const bellBtn = e.target.closest('button[onclick="toggleNotificationDropdown(event)"]');
        if (dropdown && !dropdown.classList.contains('hidden') && !bellBtn && !dropdown.contains(e.target)) {
            dropdown.classList.add('hidden');
        }
    });

    renderNotifications();

    // Event listeners for Navigation
    document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            navigateTo(e.currentTarget.dataset.view);
        });
    });

    // Mobile menu toggle
    const mobileMenuBtn = document.getElementById('mobileMenuBtn');
    const sidebar = document.getElementById('sidebar');

    // Mobile setup: Hide sidebar by default on small screens
    if (window.innerWidth < 768) {
        sidebar.classList.add('-translate-x-full', 'absolute');
    }

    mobileMenuBtn.addEventListener('click', () => {
        if (sidebar.classList.contains('-translate-x-full')) {
            sidebar.classList.remove('-translate-x-full');
            sidebar.classList.add('translate-x-0', 'absolute', 'shadow-2xl');
        } else {
            sidebar.classList.add('-translate-x-full');
        }
    });

    // Load initial view
    navigateTo('launcher');
});
