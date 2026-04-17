function renderSalesDashboard() {
    document.getElementById('pageTitle').innerText = 'Dashboard Penjualan';
    const mc = document.getElementById('main-content');
    
    const orders = db.read('salesOrders') || [];
    const customers = db.read('customers') || [];
    const invoices = db.read('salesInvoices') || [];
    const currentYear = new Date().getFullYear();
    
    // Calculate Stats
    const annualSales = orders.filter(o => o.status !== 'CANCELLED' && new Date(o.date || o.createdAt).getFullYear() === currentYear)
                              .reduce((sum, o) => sum + parseFloat(o.totalAmount || 0), 0);
    const soToDeliver = orders.filter(o => o.status === 'CONFIRMED').length; // Simple metric for SO to deliver
    const soToBill = invoices.filter(i => i.status === 'UNPAID').length; // Simplification for demo
    const activeCustomers = customers.length;

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
                    <button class="w-7 h-7 rounded bg-gray-50 text-gray-400 hover:bg-gray-100 flex items-center justify-center transition-colors"><i class="fas fa-filter text-[10px]"></i></button>
                    <button class="w-7 h-7 rounded bg-gray-50 text-gray-400 hover:bg-gray-100 flex items-center justify-center transition-colors"><span class="leading-none pb-2 font-bold">...</span></button>
                </div>
            </div>
            ${id ? `<div class="relative w-full ${heightClass} flex-1"><canvas id="${id}"></canvas></div>` : ``}
            ${extraBody}
        </div>`;

    const noDataPanel = (title) => chartPanel(title, null, '', '<div class="bg-[#f8f9fa] flex items-center justify-center w-full h-48 rounded-lg"><span class="text-sm text-gray-400">No Data</span></div>');

    mc.innerHTML = `
        <div class="max-w-full mx-auto space-y-4 animate-fade-in pb-12 font-sans pt-2">
            <!-- KPIS Grid -->
            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                ${frappeCard('Annual Sales', formatCurrency(annualSales))}
                ${frappeCard('Sales Orders to Deliver', soToDeliver)}
                ${frappeCard('Sales Orders to Bill', soToBill)}
                ${frappeCard('Active Customers', activeCustomers)}
            </div>

            <!-- CHart 1 -->
            ${chartPanel('Sales Order Trends', 'chartSOTrends', 'h-[320px]')}

            <!-- Chart Row 2 -->
            <div class="grid grid-cols-1 lg:grid-cols-2 gap-4">
                ${chartPanel('Top Customers', 'chartTopCustomers', 'h-[250px]')}
                ${noDataPanel('Sales Order Analysis')}
            </div>

            <!-- Chart Row 3 -->
            ${chartPanel('Item-wise Annual Sales', 'chartItemSales', 'h-[300px]')}
        </div>
    `;

    setTimeout(() => {
        if(window.initSalesCharts) window.initSalesCharts(orders, customers);
    }, 100);
}

window.initSalesCharts = function(orders, customers) {
    if (typeof Chart === 'undefined') return;

    const currentYear = new Date().getFullYear();
    
    // 1. Sales Order Trends
    const ctxTrends = document.getElementById('chartSOTrends');
    if (ctxTrends && orders.length > 0) {
        const monthlyData = new Array(12).fill(0);
        orders.forEach(o => {
            if(o.status === 'CANCELLED') return;
            const d = new Date(o.date || o.createdAt || Date.now());
            if(d.getFullYear() === currentYear) {
                monthlyData[d.getMonth()] += 1;
            }
        });
        new Chart(ctxTrends, {
            type: 'line',
            data: {
                labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
                datasets: [{
                    label: 'Sales Orders',
                    data: monthlyData,
                    borderColor: '#f9a8d4', // pink-300 to match screenshot exactly
                    borderWidth: 2,
                    tension: 0.1,
                    pointBackgroundColor: '#f9a8d4',
                    pointRadius: monthlyData.some(v => v > 0) ? 3 : 0, // hide dots if empty
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
        orders.forEach(o => {
            if(o.status === 'CANCELLED') return;
            const d = new Date(o.date || o.createdAt || Date.now());
            if(d.getFullYear() === currentYear) {
                custTotals[o.customerId] = (custTotals[o.customerId] || 0) + parseFloat(o.totalAmount || 0);
            }
        });
        const sortedCust = Object.entries(custTotals).sort((a,b) => b[1] - a[1]).slice(0,5);
        const labels = sortedCust.map(x => {
            const c = customers.find(c => c.id === x[0]);
            return c ? c.name.slice(0, 15) : 'Unknown';
        });
        const data = sortedCust.map(x => x[1]);

        if (data.length === 0) {
            // Emulate empty state
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

    // 3. Item-wise Annual Sales
    const ctxItems = document.getElementById('chartItemSales');
    if (ctxItems) {
        const itemTotals = {};
        orders.forEach(o => {
            if(o.status === 'CANCELLED' || !o.items) return;
            const d = new Date(o.date || o.createdAt || Date.now());
            if(d.getFullYear() === currentYear) {
                o.items.forEach(itm => {
                    itemTotals[itm.itemName] = (itemTotals[itm.itemName] || 0) + parseFloat(itm.subtotal || 0);
                });
            }
        });
        const sortedItems = Object.entries(itemTotals).sort((a,b) => b[1] - a[1]).slice(0,10);
        const iLabels = sortedItems.map(x => x[0].slice(0, 20));
        const iData = sortedItems.map(x => x[1]);

        if (iData.length === 0) {
            const parent = ctxItems.parentElement;
            parent.innerHTML = '<div class="bg-[#f8f9fa] flex items-center justify-center w-full h-full rounded-lg"><span class="text-sm text-gray-400">No Data</span></div>';
        } else {
            new Chart(ctxItems, {
                type: 'bar',
                data: {
                    labels: iLabels,
                    datasets: [{
                        data: iData,
                        backgroundColor: '#38bdf8',
                        borderRadius: 4,
                        barThickness: 20
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: { legend: { display: false } },
                    scales: {
                        y: { display: false, grid: {display: false} },
                        x: { grid: {display: false}, border: {display: false}, ticks: { color: '#6b7280', font: {size: 11} } }
                    }
                }
            });
        }
    }
}
