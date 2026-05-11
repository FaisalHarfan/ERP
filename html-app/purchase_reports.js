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

    const getDocDate  = (doc) => doc.date || doc.createdAt || '';
    const getDocQty   = (doc) => (doc.items || []).reduce((sum, it) => sum + parseFloat(it.qty || it.receivedQty || 0), 0);
    const getDocAmt   = (doc) => parseFloat(doc.totalAmount || doc.grandTotal || 0);
    const isSupplier  = basedOn === 'Supplier';
    const getValue    = isSupplier ? getDocAmt : getDocQty;
    const getItemVal  = (it) => isSupplier ? parseFloat(it.subtotal || (it.qty * (it.price||0)) || 0) : parseFloat(it.qty || it.receivedQty || 0);
    const unit        = isSupplier ? '' : ' KG';
    const fmtVal      = (v) => isSupplier ? 'Rp ' + formatNumber(v) : formatNumber(v) + ' KG';

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
            totals[name] = (totals[name] || 0) + getValue(d);
        });
        groups = Object.keys(totals).sort((a,b) => totals[b] - totals[a]).slice(0, 10);
        if (groups.length === 0) groups = ['Overall'];
        targetDocs.forEach(d => {
            (d.items || []).forEach(it => {
                const name = it.itemName || it.prodText || 'Unknown';
                totals[name] = (totals[name] || 0) + getItemVal(it);
            });
        });
        groups = Object.keys(totals).sort((a,b) => totals[b] - totals[a]).slice(0, 10);
        if (groups.length === 0) groups = ['Overall'];
    }

    const chartColors = ['#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#f97316', '#ec4899', '#84cc16', '#14b8a6', '#6366f1'];
    const datasets = groups.map((g, idx) => {
        const color = chartColors[idx % chartColors.length];
        const bucketData = buckets.map(b => {
            let sum = 0;
            targetDocs.forEach(d => {
                const dt = new Date(getDocDate(d));
                if (dt >= b.start && dt <= b.end) {
                    if (g === 'Overall') sum += getValue(d);
                    else if (basedOn === 'Supplier') {
                        const sName = suppliers.find(s => s.id === d.supplierId)?.name || 'Unknown';
                        if (sName === g) sum += getValue(d);
                    } else if (basedOn === 'Item') {
                        (d.items || []).forEach(it => { if ((it.itemName || it.prodText) === g) sum += getItemVal(it); });
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
                    tooltip: { callbacks: { label: ctx => ` ${ctx.dataset.label}: ${fmtVal(ctx.parsed.y)}` } }
                },
                scales: {
                    x: { grid: { color: 'rgba(51, 65, 85, 0.05)' }, ticks: { color: '#94a3b8', font: { size: 10 } } },
                    y: { grid: { color: 'rgba(51, 65, 85, 0.05)' }, ticks: { color: '#94a3b8', font: { size: 10 }, callback: v => isSupplier ? formatNumber(v) : formatNumber(v) + ' KG' } }
                }
            }
        });
    }

    const thead = document.getElementById('pa_table_head');
    const tbody = document.getElementById('pa_table_body');
    if (thead && tbody) {
        thead.innerHTML = `
            <th class="px-6 py-3 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Period</th>
            <th class="px-6 py-3 text-right text-[10px] font-black text-slate-400 uppercase tracking-widest">Total ${isSupplier ? 'Value (Rp)' : 'Qty (KG)'}</th>
        `;
        
        const overallData = buckets.map((b, i) => datasets.reduce((sum, ds) => sum + ds.data[i], 0));
        const grandTotal = overallData.reduce((sum, v) => sum + v, 0);

        tbody.innerHTML = buckets.map((b, i) => `
            <tr class="hover:bg-slate-50 transition-colors">
                <td class="px-6 py-3 text-sm text-slate-600 font-semibold">${b.label}</td>
                <td class="px-6 py-3 text-sm text-slate-800 font-mono text-right">${fmtVal(overallData[i])}</td>
            </tr>
        `).join('') + `
            <tr class="bg-blue-50/30 border-t-2 border-blue-100 font-black">
                <td class="px-6 py-4 text-sm text-blue-800 uppercase tracking-widest">Total Summary</td>
                <td class="px-6 py-4 text-sm text-right text-blue-700 font-mono">${fmtVal(grandTotal)}</td>
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
        const d = new Date(inv.date || inv.createdAt);
        return d.getFullYear() === year;
    });

    const isSupplier = basedOn === 'Supplier';
    const chartTotal = Array(periods.length).fill(0);
    const pivot = {};

    invoices.forEach(inv => {
        const date = new Date(inv.date || inv.createdAt);
        const monthIdx = date.getMonth();
        let pIdx = 0;
        
        if (period === 'Monthly') pIdx = monthIdx;
        else if (period === 'Quarterly') pIdx = Math.floor(monthIdx / 3);
        else if (period === 'Half-Yearly') pIdx = Math.floor(monthIdx / 6);
        else if (period === 'Yearly') pIdx = 0;
        
        const invQty = (inv.items || []).reduce((s, it) => s + parseFloat(it.qty || 0), 0);
        const invAmt = parseFloat(inv.totalAmount || inv.grandTotal || 0);
        const val = isSupplier ? invAmt : invQty;

        chartTotal[pIdx] += val;

        if (isSupplier) {
            const supplier = db.read('suppliers')?.find(s => s.id === inv.supplierId);
            const label = supplier ? supplier.name : (inv.supplierName || 'Unknown');
            const key = inv.supplierId || label;
            if (!pivot[key]) pivot[key] = { label, periods: Array(periods.length).fill(0) };
            pivot[key].periods[pIdx] += val;
        } else {
            (inv.items || []).forEach(it => {
                const label = it.itemName || it.prodText || 'Unknown';
                const key = it.inventoryItemId || it.productId || label;
                if (!pivot[key]) pivot[key] = { label, periods: Array(periods.length).fill(0) };
                pivot[key].periods[pIdx] += parseFloat(it.qty || 0);
            });
        }
    });

    const chartColors = ['#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#f97316', '#ec4899', '#84cc16', '#14b8a6', '#6366f1'];
    const datasets = [{
        label: `Total ${isSupplier ? 'Value' : 'Qty'}`,
        data: chartTotal,
        borderColor: '#9ca3af',
        borderDash: [5, 5],
        backgroundColor: 'transparent',
        pointBackgroundColor: '#9ca3af',
        borderWidth: 2,
        pointRadius: 3,
        tension: 0.3
    }];

    const sortedRows = Object.values(pivot).sort((a, b) => b.periods.reduce((sum, v) => sum + v, 0) - a.periods.reduce((sum, v) => sum + v, 0));
    sortedRows.slice(0, 10).forEach((row, i) => {
        const color = chartColors[i % chartColors.length];
        datasets.push({
            label: row.label,
            data: row.periods,
            borderColor: color,
            backgroundColor: 'transparent',
            pointBackgroundColor: color,
            borderWidth: 2,
            pointRadius: 3,
            tension: 0.3
        });
    });

    const ctx = document.getElementById('pit_chart');
    if (ctx && typeof Chart !== 'undefined') {
        if (window._pitChart) window._pitChart.destroy();
        window._pitChart = new Chart(ctx, {
            type: 'line',
            data: { labels: periods, datasets: datasets },
            options: {
                responsive: true, maintainAspectRatio: false,
                interaction: { mode: 'index', intersect: false },
                plugins: {
                    legend: { display: true, position: 'bottom', labels: { boxWidth: 10, usePointStyle: true, font: { size: 10 } } },
                    tooltip: { callbacks: { label: ctx => ` ${ctx.dataset.label}: ${isSupplier ? 'Rp ' : ''}${formatNumber(ctx.parsed.y)}${isSupplier ? '' : ' KG'}` } }
                },
                scales: {
                    y: { ticks: { callback: v => (isSupplier ? 'Rp ' : '') + formatNumber(v) + (isSupplier ? '' : ' KG') } }
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
        const grandTotals = Array(periods.length).fill(0);
        rows.forEach(r => r.periods.forEach((v, i) => grandTotals[i] += v));

        tbody.innerHTML = rows.length === 0
            ? `<tr><td colspan="${1 + periods.length}" class="text-center py-10 text-gray-400">No data available</td></tr>`
            : sortedRows.map(row => `
                <tr class="hover:bg-gray-50">
                    <td class="px-4 py-2 border-r border-gray-200 font-semibold">${row.label}</td>
                    ${row.periods.map(v => `<td class="px-4 py-2 border-r border-gray-200 text-right font-mono">${isSupplier ? 'Rp ' : ''}${formatNumber(v)}${isSupplier ? '' : ' KG'}</td>`).join('')}
                </tr>
            `).join('') + `
                <tr class="bg-gray-100 font-bold border-t-2 border-gray-300">
                    <td class="px-4 py-2 border-r border-gray-200">Total</td>
                    ${grandTotals.map(v => `<td class="px-4 py-2 border-r border-gray-200 text-right font-mono">${isSupplier ? 'Rp ' : ''}${formatNumber(v)}${isSupplier ? '' : ' KG'}</td>`).join('')}
                </tr>
            `;
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
    
    const rfqs = db.read('purchaseRFQs').filter(r => new Date(r.date || r.createdAt).getFullYear() === year);
    const isSupplier = basedOn === 'Supplier';
    const chartData = Array(periods.length).fill(0);
    const pivot = {};

    rfqs.forEach(r => {
        const d = new Date(r.date || r.createdAt);
        const pIdx = period === 'Monthly' ? d.getMonth() : (period === 'Quarterly' ? Math.floor(d.getMonth()/3) : 0);
        
        const rfqQty = (r.items || []).reduce((s, it) => s + parseFloat(it.qty || 0), 0);
        const rfqAmt = parseFloat(r.totalAmount || r.grandTotal || 0);
        const val = isSupplier ? rfqAmt : rfqQty;

        chartData[pIdx] += val;

        if (isSupplier) {
            const supplier = db.read('suppliers')?.find(s => s.id === r.supplierId);
            const label = supplier ? supplier.name : (r.supplierName || 'Unknown');
            if (!pivot[label]) pivot[label] = Array(periods.length).fill(0);
            pivot[label][pIdx] += val;
        } else {
            (r.items || []).forEach(it => {
                const label = it.itemName || it.prodText || 'Unknown';
                if (!pivot[label]) pivot[label] = Array(periods.length).fill(0);
                pivot[label][pIdx] += parseFloat(it.qty || 0);
            });
        }
    });

    const chartColors = ['#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#f97316', '#ec4899', '#84cc16', '#14b8a6', '#6366f1'];
    const datasets = [{
        label: `Total ${isSupplier ? 'Value' : 'Qty'}`,
        data: chartData,
        borderColor: '#9ca3af',
        borderDash: [5, 5],
        backgroundColor: 'transparent',
        borderWidth: 2,
        pointRadius: 3,
        tension: 0.3
    }];

    const sortedLabels = Object.keys(pivot).sort((a, b) => pivot[b].reduce((s, v) => s + v, 0) - pivot[a].reduce((s, v) => s + v, 0));
    sortedLabels.slice(0, 10).forEach((label, i) => {
        const color = chartColors[i % chartColors.length];
        datasets.push({
            label: label,
            data: pivot[label],
            borderColor: color,
            backgroundColor: 'transparent',
            borderWidth: 2,
            pointRadius: 3,
            tension: 0.3
        });
    });

    const ctx = document.getElementById('rfqt_chart');
    if (ctx && typeof Chart !== 'undefined') {
        if (window._rfqtChart) window._rfqtChart.destroy();
        window._rfqtChart = new Chart(ctx, {
            type: 'line',
            data: { labels: periods, datasets: datasets },
            options: { 
                responsive: true, 
                maintainAspectRatio: false, 
                interaction: { mode: 'index', intersect: false },
                plugins: { 
                    legend: { display: true, position: 'bottom', labels: { boxWidth: 10, usePointStyle: true, font: { size: 10 } } },
                    tooltip: { callbacks: { label: ctx => ` ${ctx.dataset.label}: ${isSupplier ? 'Rp ' : ''}${formatNumber(ctx.parsed.y)}${isSupplier ? '' : ' KG'}` } }
                },
                scales: {
                    y: { ticks: { callback: v => (isSupplier ? 'Rp ' : '') + formatNumber(v) + (isSupplier ? '' : ' KG') } }
                }
            }
        });
    }

    const thead = document.getElementById('rfqt_thead');
    const tbody = document.getElementById('rfqt_tbody');
    if (thead && tbody) {
        thead.innerHTML = `<th class="px-4 py-2 border-r border-gray-200 font-medium">${basedOn}</th>` + periods.map(p => `<th class="px-4 py-2 border-r border-gray-200 text-right font-medium">${p}</th>`).join('');
        
        const grandTotals = Array(periods.length).fill(0);
        Object.keys(pivot).forEach(l => pivot[l].forEach((v, i) => grandTotals[i] += v));

        tbody.innerHTML = Object.keys(pivot).map(label => `
            <tr class="hover:bg-gray-50">
                <td class="px-4 py-2 border-r border-gray-200 font-semibold">${label}</td>
                ${pivot[label].map(v => `<td class="px-4 py-2 border-r border-gray-200 text-right font-mono">${isSupplier ? 'Rp ' : ''}${formatNumber(v)}${isSupplier ? '' : ' KG'}</td>`).join('')}
            </tr>
        `).join('') + `
            <tr class="bg-gray-100 font-bold border-t-2 border-gray-300">
                <td class="px-4 py-2 border-r border-gray-200">Total</td>
                ${grandTotals.map(v => `<td class="px-4 py-2 border-r border-gray-200 text-right font-mono">${isSupplier ? 'Rp ' : ''}${formatNumber(v)}${isSupplier ? '' : ' KG'}</td>`).join('')}
            </tr>
        `;
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
    
    const pos = db.read('purchaseOrders').filter(p => new Date(p.date || p.createdAt).getFullYear() === year);
    const isSupplier = basedOn === 'Supplier';
    const chartData = Array(periods.length).fill(0);
    const pivot = {};

    pos.forEach(p => {
        const d = new Date(p.date || p.createdAt);
        const pIdx = period === 'Monthly' ? d.getMonth() : (period === 'Quarterly' ? Math.floor(d.getMonth()/3) : 0);
        
        const poQty = (p.items || []).reduce((s, it) => s + parseFloat(it.qty || 0), 0);
        const poAmt = parseFloat(p.totalAmount || p.grandTotal || 0);
        const val = isSupplier ? poAmt : poQty;

        chartData[pIdx] += val;

        if (isSupplier) {
            const supplier = db.read('suppliers')?.find(s => s.id === p.supplierId);
            const label = supplier ? supplier.name : (p.supplierName || 'Unknown');
            if (!pivot[label]) pivot[label] = Array(periods.length).fill(0);
            pivot[label][pIdx] += val;
        } else {
            (p.items || []).forEach(it => {
                const label = it.itemName || it.prodText || 'Unknown';
                if (!pivot[label]) pivot[label] = Array(periods.length).fill(0);
                pivot[label][pIdx] += parseFloat(it.qty || 0);
            });
        }
    });

    const chartColors = ['#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#f97316', '#ec4899', '#84cc16', '#14b8a6', '#6366f1'];
    const datasets = [{
        label: `Total ${isSupplier ? 'Value' : 'Qty'}`,
        data: chartData,
        borderColor: '#9ca3af',
        borderDash: [5, 5],
        backgroundColor: 'transparent',
        borderWidth: 2,
        pointRadius: 3,
        tension: 0.3
    }];

    const sortedLabels = Object.keys(pivot).sort((a, b) => pivot[b].reduce((s, v) => s + v, 0) - pivot[a].reduce((s, v) => s + v, 0));
    sortedLabels.slice(0, 10).forEach((label, i) => {
        const color = chartColors[i % chartColors.length];
        datasets.push({
            label: label,
            data: pivot[label],
            borderColor: color,
            backgroundColor: 'transparent',
            borderWidth: 2,
            pointRadius: 3,
            tension: 0.3
        });
    });

    const ctx = document.getElementById('pot_chart');
    if (ctx && typeof Chart !== 'undefined') {
        if (window._potChart) window._potChart.destroy();
        window._potChart = new Chart(ctx, {
            type: 'line',
            data: { labels: periods, datasets: datasets },
            options: { 
                responsive: true, 
                maintainAspectRatio: false, 
                interaction: { mode: 'index', intersect: false },
                plugins: { 
                    legend: { display: true, position: 'bottom', labels: { boxWidth: 10, usePointStyle: true, font: { size: 10 } } },
                    tooltip: { callbacks: { label: ctx => ` ${ctx.dataset.label}: ${isSupplier ? 'Rp ' : ''}${formatNumber(ctx.parsed.y)}${isSupplier ? '' : ' KG'}` } }
                },
                scales: {
                    y: { ticks: { callback: v => (isSupplier ? 'Rp ' : '') + formatNumber(v) + (isSupplier ? '' : ' KG') } }
                }
            }
        });
    }

    const thead = document.getElementById('pot_thead');
    const tbody = document.getElementById('pot_tbody');
    if (thead && tbody) {
        thead.innerHTML = `<th class="px-4 py-2 border-r border-gray-200 font-medium">${basedOn}</th>` + periods.map(p => `<th class="px-4 py-2 border-r border-gray-200 text-right font-medium">${p}</th>`).join('');
        
        const grandTotals = Array(periods.length).fill(0);
        Object.keys(pivot).forEach(l => pivot[l].forEach((v, i) => grandTotals[i] += v));

        tbody.innerHTML = Object.keys(pivot).map(label => `
            <tr class="hover:bg-gray-50">
                <td class="px-4 py-2 border-r border-gray-200 font-semibold">${label}</td>
                ${pivot[label].map(v => `<td class="px-4 py-2 border-r border-gray-200 text-right font-mono">${isSupplier ? 'Rp ' : ''}${formatNumber(v)}${isSupplier ? '' : ' KG'}</td>`).join('')}
            </tr>
        `).join('') + `
            <tr class="bg-gray-100 font-bold border-t-2 border-gray-300">
                <td class="px-4 py-2 border-r border-gray-200">Total</td>
                ${grandTotals.map(v => `<td class="px-4 py-2 border-r border-gray-200 text-right font-mono">${isSupplier ? 'Rp ' : ''}${formatNumber(v)}${isSupplier ? '' : ' KG'}</td>`).join('')}
            </tr>
        `;
    }
};
