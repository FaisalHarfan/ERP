/**
 * purchase_reports.js - Handles Purchasing Analytics and Trend Reports
 */

// --- Purchasing Analytics ---
window.renderPurchaseAnalytics = () => {
    document.getElementById('pageTitle').innerText = 'Purchasing Analytics';
    const mainContent = document.getElementById('main-content');

    const now = new Date();
    const startOfYear = `${now.getFullYear()}-01-01`;
    const endOfYear = `${now.getFullYear()}-12-31`;

    mainContent.innerHTML = `
        <div class="space-y-4">
            <!-- Filter Bar -->
            <div class="bg-white border border-slate-100 rounded-xl shadow-sm p-5">
                <div class="flex flex-wrap items-center gap-5 mb-4">
                    <select id="pa_based_on" onchange="updatePurchaseAnalytics()"
                        class="border border-slate-300 rounded-lg px-5 py-2.5 text-base font-semibold text-slate-700 bg-white focus:outline-none focus:border-blue-400 cursor-pointer min-w-[150px]">
                        <option value="Supplier">Supplier</option>
                        <option value="Item">Item</option>
                    </select>

                    <select id="pa_value_field" onchange="updatePurchaseAnalytics()"
                        class="border border-slate-300 rounded-lg px-5 py-2.5 text-base font-semibold text-slate-700 bg-white focus:outline-none focus:border-blue-400 cursor-pointer min-w-[190px]">
                        <option value="all">All</option>
                        <option value="rfq">RFQ</option>
                        <option value="purchase_order" selected>Purchase Order</option>
                        <option value="purchase_invoice">Purchase Invoice</option>
                    </select>

                    <input type="date" id="pa_from" value="${startOfYear}" onchange="updatePurchaseAnalytics()"
                        class="border border-slate-300 rounded-lg px-5 py-2.5 text-base font-semibold text-slate-700 bg-white focus:outline-none focus:border-blue-400">

                    <input type="date" id="pa_to" value="${endOfYear}" onchange="updatePurchaseAnalytics()"
                        class="border border-slate-300 rounded-lg px-5 py-2.5 text-base font-semibold text-slate-700 bg-white focus:outline-none focus:border-blue-400">
                </div>

                <div class="flex flex-wrap items-center gap-5">
                    <select id="pa_period" onchange="updatePurchaseAnalytics()"
                        class="border border-slate-300 rounded-lg px-5 py-2.5 text-base font-semibold text-slate-700 bg-white focus:outline-none focus:border-blue-400 cursor-pointer min-w-[150px]">
                        <option value="Weekly">Weekly</option>
                        <option value="Monthly" selected>Monthly</option>
                        <option value="Quarterly">Quarterly</option>
                        <option value="Yearly">Yearly</option>
                    </select>
                </div>
            </div>

            <!-- Chart Card -->
            <div class="bg-white border border-slate-100 rounded-xl shadow-sm p-6">
                <div class="flex items-center justify-between mb-4">
                    <h3 id="pa_chart_title" class="text-sm font-bold text-slate-700">Purchasing Analytics</h3>
                </div>
                <div style="height:280px; position:relative;">
                    <canvas id="pa_chart"></canvas>
                </div>
            </div>

            <!-- Report Content -->
            <div class="bg-white border border-slate-100 rounded-xl shadow-sm overflow-hidden">
                <div class="px-5 py-3 border-b border-slate-50">
                    <h3 class="text-[10px] font-black text-slate-500 uppercase tracking-widest">Detail Data</h3>
                </div>
                <div class="overflow-x-auto">
                    <table class="w-full text-sm">
                        <thead class="bg-slate-50">
                            <tr id="pa_table_head"></tr>
                        </thead>
                        <tbody id="pa_table_body" class="divide-y divide-slate-50"></tbody>
                    </table>
                </div>
            </div>
        </div>
    `;
    updatePurchaseAnalytics();
};

window.updatePurchaseAnalytics = () => {
    const basedOn = document.getElementById('pa_based_on')?.value || 'Supplier';
    const valueField = document.getElementById('pa_value_field')?.value || 'purchase_order';
    const period = document.getElementById('pa_period')?.value || 'Monthly';
    const fromStr = document.getElementById('pa_from')?.value;
    const toStr = document.getElementById('pa_to')?.value;

    const from = fromStr ? new Date(fromStr) : new Date(new Date().getFullYear(), 0, 1);
    const to = toStr ? new Date(toStr) : new Date(new Date().getFullYear(), 11, 31);
    from.setHours(0,0,0,0); to.setHours(23,59,59,999);

    // Build period buckets
    const buckets = [];
    if (period === 'Weekly') {
        let cur = new Date(from);
        cur.setDate(cur.getDate() - ((cur.getDay()+6)%7));
        while (cur <= to) {
            const end = new Date(cur); end.setDate(end.getDate()+6);
            buckets.push({ label: `W${Math.ceil(cur.getDate()/7)} ${cur.getFullYear()}`, start: new Date(cur), end: new Date(end) });
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

    const purchaseOrders = db.read('purchaseOrders') || [];
    const purchaseInvoices = db.read('purchaseInvoices') || [];
    const purchaseRFQs = db.read('purchaseRFQs') || [];
    const suppliers = db.read('suppliers') || [];

    const getDocDate = (doc) => doc.date || doc.createdAt || '';
    const getDocValue = (doc) => (doc.totalAmount || doc.grandTotal || 0);

    const filterByRange = (docs) => docs.filter(doc => {
        const d = new Date(getDocDate(doc));
        return d >= from && d <= to;
    });

    let targetDocs = [];
    switch (valueField) {
        case 'rfq': targetDocs = filterByRange(purchaseRFQs); break;
        case 'purchase_order': targetDocs = filterByRange(purchaseOrders); break;
        case 'purchase_invoice': targetDocs = filterByRange(purchaseInvoices); break;
        default: targetDocs = filterByRange(purchaseOrders);
    }

    let groups = ['Overall'];
    if (basedOn === 'Supplier') {
        const totals = {};
        targetDocs.forEach(d => {
            const name = suppliers.find(s => s.id === d.supplierId)?.name || 'Unknown';
            totals[name] = (totals[name] || 0) + getDocValue(d);
        });
        groups = Object.keys(totals).sort((a,b) => totals[b] - totals[a]).slice(0, 5);
        if (groups.length === 0) groups = ['Overall'];
    } else if (basedOn === 'Item') {
        const totals = {};
        targetDocs.forEach(d => {
            (d.items || []).forEach(it => {
                const name = it.itemName || it.prodText || 'Unknown';
                totals[name] = (totals[name] || 0) + (parseFloat(it.subtotal) || 0);
            });
        });
        groups = Object.keys(totals).sort((a,b) => totals[b] - totals[a]).slice(0, 5);
        if (groups.length === 0) groups = ['Overall'];
    }

    const datasets = groups.map((g, idx) => {
        const color = ['#6366f1', '#f472b6', '#34d399', '#fbbf24', '#a78bfa'][idx];
        const bucketData = buckets.map(b => {
            let sum = 0;
            targetDocs.forEach(d => {
                const dt = new Date(getDocDate(d));
                if (dt >= b.start && dt <= b.end) {
                    if (g === 'Overall') sum += getDocValue(d);
                    else if (basedOn === 'Supplier') {
                        const sName = suppliers.find(s => s.id === d.supplierId)?.name || 'Unknown';
                        if (sName === g) sum += getDocValue(d);
                    } else if (basedOn === 'Item') {
                        (d.items || []).forEach(it => { if ((it.itemName || it.prodText) === g) sum += (parseFloat(it.subtotal) || 0); });
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

    const title = document.getElementById('pa_chart_title');
    if (title) title.textContent = `Purchasing Analytics - By ${basedOn} (${period})`;

    const ctx = document.getElementById('pa_chart');
    if (ctx && typeof Chart !== 'undefined') {
        if (window._paChart) window._paChart.destroy();
        window._paChart = new Chart(ctx, {
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
    }

    const thead = document.getElementById('pa_table_head');
    const tbody = document.getElementById('pa_table_body');
    if (thead && tbody) {
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
    }
};

// --- Purchase Invoice Trends ---
window.renderPurchaseInvoiceTrends = () => {
    document.getElementById('pageTitle').innerText = 'Purchase Invoice Trends';
    const mainContent = document.getElementById('main-content');
    const currentYear = new Date().getFullYear();

    mainContent.innerHTML = `
        <div class="h-full flex flex-col font-sans bg-white">
            <div class="flex flex-wrap items-center gap-3 px-4 py-3 border-b border-gray-200 bg-white shadow-sm shrink-0">
                <select id="pit_period" onchange="updatePurchaseInvoiceTrends()"
                    class="bg-gray-100 border-none rounded-md px-3 py-1.5 text-[13px] text-gray-700 focus:outline-none hover:bg-gray-200 cursor-pointer outline-none">
                    <option value="Monthly" selected>Monthly</option>
                    <option value="Quarterly">Quarterly</option>
                    <option value="Half-Yearly">Half-Yearly</option>
                    <option value="Yearly">Yearly</option>
                </select>

                <select id="pit_based_on" onchange="updatePurchaseInvoiceTrends()"
                    class="bg-gray-100 border-none rounded-md px-3 py-1.5 text-[13px] text-gray-700 focus:outline-none hover:bg-gray-200 cursor-pointer outline-none">
                    <option value="Item">Item</option>
                    <option value="Supplier">Supplier</option>
                </select>

                <input type="number" id="pit_year" value="${currentYear}" onchange="updatePurchaseInvoiceTrends()"
                    class="bg-gray-100 border-none rounded-md px-3 py-1.5 text-[13px] text-gray-700 focus:outline-none hover:bg-gray-200 outline-none w-24">

                <div class="flex-1"></div>
            </div>

            <div class="bg-white px-8 pt-8 pb-4 shrink-0 border-b border-gray-200 relative">
                <div style="height: 250px;">
                    <canvas id="pit_chart"></canvas>
                </div>
            </div>

            <div class="flex-1 overflow-auto bg-white relative">
                <table class="w-full text-left border-collapse" id="pit_table">
                    <thead class="bg-[#f9fafb] sticky top-0 z-20 shadow-[0_1px_0_#e5e7eb]">
                        <tr id="pit_thead" class="text-[13px] text-gray-600 border-b border-gray-200"></tr>
                    </thead>
                    <tbody id="pit_tbody" class="divide-y divide-gray-100 text-[13px] text-gray-800"></tbody>
                </table>
            </div>
        </div>
    `;
    updatePurchaseInvoiceTrends();
};

window.updatePurchaseInvoiceTrends = () => {
    const year = parseInt(document.getElementById('pit_year')?.value || new Date().getFullYear());
    const basedOn = document.getElementById('pit_based_on')?.value || 'Item';
    const period = document.getElementById('pit_period')?.value || 'Monthly';
    
    let periods = [];
    if (period === 'Monthly') periods = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    else if (period === 'Quarterly') periods = ['Q1', 'Q2', 'Q3', 'Q4'];
    else if (period === 'Half-Yearly') periods = ['H1', 'H2'];
    else if (period === 'Yearly') periods = [year.toString()];
    
    const invoices = db.read('purchaseInvoices').filter(inv => {
        const d = new Date(inv.date);
        return d.getFullYear() === year;
    });

    const chartTotalAmt = Array(periods.length).fill(0);
    const pivot = {};

    invoices.forEach(inv => {
        const date = new Date(inv.date);
        const monthIdx = date.getMonth();
        let pIdx = 0;
        
        if (period === 'Monthly') pIdx = monthIdx;
        else if (period === 'Quarterly') pIdx = Math.floor(monthIdx / 3);
        else if (period === 'Half-Yearly') pIdx = Math.floor(monthIdx / 6);
        else if (period === 'Yearly') pIdx = 0;
        
        chartTotalAmt[pIdx] += (inv.totalAmount || 0);

        const supplier = db.findById('suppliers', inv.supplierId);
        const label = supplier ? supplier.name : 'Unknown';
        const key = inv.supplierId || 'unknown';

        if (!pivot[key]) pivot[key] = { label, periods: Array(periods.length).fill(0) };
        pivot[key].periods[pIdx] += (inv.totalAmount || 0);
    });

    const ctx = document.getElementById('pit_chart');
    if (ctx && typeof Chart !== 'undefined') {
        if (window._pitChart) window._pitChart.destroy();
        window._pitChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: periods,
                datasets: [{
                    label: 'Total Purchase Invoice Value',
                    data: chartTotalAmt,
                    borderColor: '#6366f1',
                    backgroundColor: 'rgba(99, 102, 241, 0.1)',
                    fill: true,
                    tension: 0.4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false },
                    tooltip: { callbacks: { label: ctx => ` Rp ${formatNumber(ctx.parsed.y)}` } }
                }
            }
        });
    }

    const thead = document.getElementById('pit_thead');
    const tbody = document.getElementById('pit_tbody');
    if (thead && tbody) {
        thead.innerHTML = `
            <th class="px-4 py-2 border-r border-gray-200 font-medium">${basedOn}</th>
            ${periods.map(p => `<th class="px-4 py-2 border-r border-gray-200 text-right font-medium">${p}</th>`).join('')}
        `;

        const rows = Object.values(pivot);
        tbody.innerHTML = rows.length === 0
            ? `<tr><td colspan="${1 + periods.length}" class="text-center py-10 text-gray-400">No data available</td></tr>`
            : rows.map(row => `
                <tr>
                    <td class="px-4 py-2 border-r border-gray-200 font-semibold">${row.label}</td>
                    ${row.periods.map(amt => `<td class="px-4 py-2 border-r border-gray-200 text-right font-mono">${formatNumber(amt)}</td>`).join('')}
                </tr>
            `).join('');
    }
};

// --- Request For Quotation Trends ---
window.renderPurchaseRFQTrends = () => {
    document.getElementById('pageTitle').innerText = 'Request For Quotation Trends';
    const mainContent = document.getElementById('main-content');
    const currentYear = new Date().getFullYear();

    mainContent.innerHTML = `
        <div class="h-full flex flex-col font-sans bg-white">
            <div class="flex flex-wrap items-center gap-3 px-4 py-3 border-b border-gray-200 bg-white shadow-sm shrink-0">
                <select id="rfqt_period" onchange="updatePurchaseRFQTrends()"
                    class="bg-gray-100 border-none rounded-md px-3 py-1.5 text-[13px] text-gray-700 focus:outline-none hover:bg-gray-200 cursor-pointer outline-none">
                    <option value="Monthly" selected>Monthly</option>
                    <option value="Quarterly">Quarterly</option>
                    <option value="Yearly">Yearly</option>
                </select>
                <select id="rfqt_based_on" onchange="updatePurchaseRFQTrends()"
                    class="bg-gray-100 border-none rounded-md px-3 py-1.5 text-[13px] text-gray-700 focus:outline-none hover:bg-gray-200 cursor-pointer outline-none">
                    <option value="Item">Item</option>
                    <option value="Supplier">Supplier</option>
                </select>
                <input type="number" id="rfqt_year" value="${currentYear}" onchange="updatePurchaseRFQTrends()"
                    class="bg-gray-100 border-none rounded-md px-3 py-1.5 text-[13px] text-gray-700 focus:outline-none hover:bg-gray-200 outline-none w-24">
            </div>

            <div class="bg-white px-8 pt-8 pb-4 shrink-0 border-b border-gray-200 relative">
                <div style="height: 250px;">
                    <canvas id="rfqt_chart"></canvas>
                </div>
            </div>

            <div class="flex-1 overflow-auto bg-white relative">
                <table class="w-full text-left border-collapse" id="rfqt_table">
                    <thead class="bg-[#f9fafb] sticky top-0 z-20 shadow-[0_1px_0_#e5e7eb]">
                        <tr id="rfqt_thead" class="text-[13px] text-gray-600 border-b border-gray-200"></tr>
                    </thead>
                    <tbody id="rfqt_tbody" class="divide-y divide-gray-100 text-[13px] text-gray-800"></tbody>
                </table>
            </div>
        </div>
    `;
    updatePurchaseRFQTrends();
};

window.updatePurchaseRFQTrends = () => {
    const year = parseInt(document.getElementById('rfqt_year')?.value || new Date().getFullYear());
    const basedOn = document.getElementById('rfqt_based_on')?.value || 'Item';
    const period = document.getElementById('rfqt_period')?.value || 'Monthly';
    
    let periods = (period === 'Monthly') ? ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'] : (period === 'Quarterly' ? ['Q1','Q2','Q3','Q4'] : [year.toString()]);
    
    const rfqs = db.read('purchaseRFQs').filter(r => new Date(r.date).getFullYear() === year);
    const chartData = Array(periods.length).fill(0);
    const pivot = {};

    rfqs.forEach(r => {
        const d = new Date(r.date);
        const pIdx = period === 'Monthly' ? d.getMonth() : (period === 'Quarterly' ? Math.floor(d.getMonth()/3) : 0);
        chartData[pIdx] += (r.totalAmount || 0);

        const supplier = db.findById('suppliers', r.supplierId);
        const label = supplier ? supplier.name : 'Unknown';
        if (!pivot[label]) pivot[label] = Array(periods.length).fill(0);
        pivot[label][pIdx] += (r.totalAmount || 0);
    });

    const ctx = document.getElementById('rfqt_chart');
    if (ctx && typeof Chart !== 'undefined') {
        if (window._rfqtChart) window._rfqtChart.destroy();
        window._rfqtChart = new Chart(ctx, {
            type: 'line',
            data: { labels: periods, datasets: [{ label: 'Total RFQ Value', data: chartData, borderColor: '#f472b6', backgroundColor: 'rgba(244, 114, 182, 0.1)', fill: true, tension: 0.4 }] },
            options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } } }
        });
    }

    const thead = document.getElementById('rfqt_thead');
    const tbody = document.getElementById('rfqt_tbody');
    if (thead && tbody) {
        thead.innerHTML = `<th class="px-4 py-2 border-r border-gray-200 font-medium">${basedOn}</th>` + periods.map(p => `<th class="px-4 py-2 border-r border-gray-200 text-right font-medium">${p}</th>`).join('');
        tbody.innerHTML = Object.keys(pivot).map(label => `<tr><td class="px-4 py-2 border-r border-gray-200 font-semibold">${label}</td>${pivot[label].map(v => `<td class="px-4 py-2 border-r border-gray-200 text-right font-mono">${formatNumber(v)}</td>`).join('')}</tr>`).join('');
    }
};

// --- Purchase Orders Trends ---
window.renderPurchaseOrderTrends = () => {
    document.getElementById('pageTitle').innerText = 'Purchase Orders Trends';
    const mainContent = document.getElementById('main-content');
    const currentYear = new Date().getFullYear();

    mainContent.innerHTML = `
        <div class="h-full flex flex-col font-sans bg-white">
            <div class="flex flex-wrap items-center gap-3 px-4 py-3 border-b border-gray-200 bg-white shadow-sm shrink-0">
                <select id="pot_period" onchange="updatePurchaseOrderTrends()"
                    class="bg-gray-100 border-none rounded-md px-3 py-1.5 text-[13px] text-gray-700 focus:outline-none hover:bg-gray-200 cursor-pointer outline-none">
                    <option value="Monthly" selected>Monthly</option>
                    <option value="Quarterly">Quarterly</option>
                    <option value="Yearly">Yearly</option>
                </select>
                <select id="pot_based_on" onchange="updatePurchaseOrderTrends()"
                    class="bg-gray-100 border-none rounded-md px-3 py-1.5 text-[13px] text-gray-700 focus:outline-none hover:bg-gray-200 cursor-pointer outline-none">
                    <option value="Item">Item</option>
                    <option value="Supplier">Supplier</option>
                </select>
                <input type="number" id="pot_year" value="${currentYear}" onchange="updatePurchaseOrderTrends()"
                    class="bg-gray-100 border-none rounded-md px-3 py-1.5 text-[13px] text-gray-700 focus:outline-none hover:bg-gray-200 outline-none w-24">
            </div>

            <div class="bg-white px-8 pt-8 pb-4 shrink-0 border-b border-gray-200 relative">
                <div style="height: 250px;">
                    <canvas id="pot_chart"></canvas>
                </div>
            </div>

            <div class="flex-1 overflow-auto bg-white relative">
                <table class="w-full text-left border-collapse" id="pot_table">
                    <thead class="bg-[#f9fafb] sticky top-0 z-20 shadow-[0_1px_0_#e5e7eb]">
                        <tr id="pot_thead" class="text-[13px] text-gray-600 border-b border-gray-200"></tr>
                    </thead>
                    <tbody id="pot_tbody" class="divide-y divide-gray-100 text-[13px] text-gray-800"></tbody>
                </table>
            </div>
        </div>
    `;
    updatePurchaseOrderTrends();
};

window.updatePurchaseOrderTrends = () => {
    const year = parseInt(document.getElementById('pot_year')?.value || new Date().getFullYear());
    const basedOn = document.getElementById('pot_based_on')?.value || 'Item';
    const period = document.getElementById('pot_period')?.value || 'Monthly';
    
    let periods = (period === 'Monthly') ? ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'] : (period === 'Quarterly' ? ['Q1','Q2','Q3','Q4'] : [year.toString()]);
    
    const pos = db.read('purchaseOrders').filter(p => new Date(p.date).getFullYear() === year);
    const chartData = Array(periods.length).fill(0);
    const pivot = {};

    pos.forEach(p => {
        const d = new Date(p.date);
        const pIdx = period === 'Monthly' ? d.getMonth() : (period === 'Quarterly' ? Math.floor(d.getMonth()/3) : 0);
        chartData[pIdx] += (p.totalAmount || 0);

        const supplier = db.findById('suppliers', p.supplierId);
        const label = supplier ? supplier.name : 'Unknown';
        if (!pivot[label]) pivot[label] = Array(periods.length).fill(0);
        pivot[label][pIdx] += (p.totalAmount || 0);
    });

    const ctx = document.getElementById('pot_chart');
    if (ctx && typeof Chart !== 'undefined') {
        if (window._potChart) window._potChart.destroy();
        window._potChart = new Chart(ctx, {
            type: 'line',
            data: { labels: periods, datasets: [{ label: 'Total PO Value', data: chartData, borderColor: '#6366f1', backgroundColor: 'rgba(99, 102, 241, 0.1)', fill: true, tension: 0.4 }] },
            options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } } }
        });
    }

    const thead = document.getElementById('pot_thead');
    const tbody = document.getElementById('pot_tbody');
    if (thead && tbody) {
        thead.innerHTML = `<th class="px-4 py-2 border-r border-gray-200 font-medium">${basedOn}</th>` + periods.map(p => `<th class="px-4 py-2 border-r border-gray-200 text-right font-medium">${p}</th>`).join('');
        tbody.innerHTML = Object.keys(pivot).map(label => `<tr><td class="px-4 py-2 border-r border-gray-200 font-semibold">${label}</td>${pivot[label].map(v => `<td class="px-4 py-2 border-r border-gray-200 text-right font-mono">${formatNumber(v)}</td>`).join('')}</tr>`).join('');
    }
};
