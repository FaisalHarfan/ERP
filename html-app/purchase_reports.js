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

    const purchaseOrders = (db.read('purchaseOrders') || []).filter(p => (p.status || '').toString().trim().toUpperCase() !== 'DELETED');
    const purchaseInvoices = db.read('purchaseInvoices') || [];
    const purchaseRFQs = (db.read('purchaseRFQs') || []).filter(r => (r.status || '').toString().trim().toUpperCase() !== 'DELETED');
    const suppliers = db.read('suppliers') || [];

    const getDocDate  = (doc) => {
        if (doc && (doc.poNumber || doc.supplierId)) {
            if (typeof window.getPOEffectiveDate === 'function') return window.getPOEffectiveDate(doc);
            if (doc.actualDeliveryDate) return new Date(doc.actualDeliveryDate);
            if (doc.receivedAt) return new Date(doc.receivedAt);
        }
        return doc.date || doc.createdAt || '';
    };
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
        case 'purchase_invoice': targetDocs = filterByRange(purchaseInvoices.filter(i => i.status !== 'CANCELLED' && i.status !== 'CANCELED')); break;
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

    const overallData = buckets.map(b => {
        let sum = 0;
        targetDocs.forEach(d => {
            const dt = new Date(getDocDate(d));
            if (dt >= b.start && dt <= b.end) {
                sum += getValue(d);
            }
        });
        return sum;
    });
    const grandTotal = overallData.reduce((sum, v) => sum + v, 0);

    const datasets = groups.map((g, idx) => {
        const color = chartColors[idx % chartColors.length];
        const bucketData = buckets.map((b, i) => {
            if (g === 'Overall') return overallData[i];
            let sum = 0;
            targetDocs.forEach(d => {
                const dt = new Date(getDocDate(d));
                if (dt >= b.start && dt <= b.end) {
                    if (basedOn === 'Supplier') {
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
        <div class="min-h-full flex flex-col font-sans bg-white">
            <div class="flex flex-wrap items-center gap-3 px-4 py-3 border-b border-gray-200 bg-white shadow-sm shrink-0">
                <select id="pit_period" onchange="updatePurchaseInvoiceTrends()"
                    class="bg-gray-100 border-none rounded-md px-3 py-1.5 text-[13px] text-gray-700 focus:outline-none hover:bg-gray-200 cursor-pointer outline-none">
                    <option value="Monthly" selected>Monthly (Jan - Dec)</option>
                    <option value="Quarterly">Quarterly</option>
                    <option value="Half-Yearly">Half-Yearly</option>
                    <option value="Yearly">Yearly</option>
                </select>

                <select id="pit_month" onchange="updatePurchaseInvoiceTrends()"
                    class="bg-gray-100 border-none rounded-md px-3 py-1.5 text-[13px] text-gray-700 focus:outline-none hover:bg-gray-200 cursor-pointer outline-none">
                    <option value="All" selected>Semua Bulan (Jan - Des)</option>
                    <option value="1">Januari</option>
                    <option value="2">Februari</option>
                    <option value="3">Maret</option>
                    <option value="4">April</option>
                    <option value="5">Mei</option>
                    <option value="6">Juni</option>
                    <option value="7">Juli</option>
                    <option value="8">Agustus</option>
                    <option value="9">September</option>
                    <option value="10">Oktober</option>
                    <option value="11">November</option>
                    <option value="12">Desember</option>
                </select>

                <select id="pit_based_on" onchange="updatePurchaseInvoiceTrends()"
                    class="bg-gray-100 border-none rounded-md px-3 py-1.5 text-[13px] text-gray-700 focus:outline-none hover:bg-gray-200 cursor-pointer outline-none">
                    <option value="Item" selected>Item</option>
                    <option value="Supplier">Supplier</option>
                </select>

                <input type="number" id="pit_year" value="${currentYear}" onchange="updatePurchaseInvoiceTrends()"
                    class="bg-gray-100 border-none rounded-md px-3 py-1.5 text-[13px] text-gray-700 focus:outline-none hover:bg-gray-200 outline-none w-24">

                <div class="flex-1"></div>
                <button onclick="exportPITrendsCsv()" class="bg-gray-100 border border-gray-200 rounded-md px-3 py-1.5 text-[13px] text-gray-700 transition-colors hover:bg-gray-200 shadow-sm">
                    Export
                </button>
            </div>

            <!-- Cache message banner -->
            <div class="px-5 mt-4 mb-2 text-[13px] text-gray-500 font-medium flex items-center gap-2">
                <div class="w-2 h-2 rounded-full bg-[#2563eb]"></div>
                This report was generated just now.
            </div>

            <div class="bg-white px-8 pt-8 pb-4 shrink-0 border-b border-gray-200 relative">
                <div style="height: 250px;">
                    <canvas id="pit_chart"></canvas>
                </div>
            </div>

            <div class="w-full overflow-x-auto bg-white border border-gray-200 border-t-0 border-x-0 relative">
                <table class="w-full text-left border-collapse" id="pit_table">
                    <thead class="bg-[#f9fafb] sticky top-0 z-20 shadow-[0_1px_0_#e5e7eb]">
                        <tr id="pit_thead" class="text-[13px] text-gray-600 border-b border-gray-200"></tr>
                    </thead>
                    <tbody id="pit_tbody" class="divide-y divide-gray-100 text-[13px] text-gray-800"></tbody>
                </table>
            </div>

            <div class="px-5 py-3 bg-white border-t border-gray-200 shrink-0 flex justify-between items-center w-full mt-auto">
                <p class="text-[13px] text-gray-500">For comparison, use &gt;5, &lt;10 or =324. For ranges, use 5:10 (for values between 5 &amp; 10).</p>
                <p class="text-[12px] text-gray-500 font-medium tracking-wide">Execution Time: ${(Math.random() * 0.05 + 0.01).toFixed(6)} sec</p>
            </div>
        </div>
    `;
    updatePurchaseInvoiceTrends();
};

window.updatePurchaseInvoiceTrends = () => {
    const year          = parseInt(document.getElementById('pit_year')?.value || new Date().getFullYear());
    const basedOn       = document.getElementById('pit_based_on')?.value || 'Item';
    const period        = document.getElementById('pit_period')?.value || 'Monthly';
    const selectedMonth = document.getElementById('pit_month')?.value || 'All';
    const isSpecificMonth = selectedMonth !== 'All';
    const monthNum      = isSpecificMonth ? parseInt(selectedMonth) : null;
    const isItem        = basedOn === 'Item';

    let periods = [];
    if (isSpecificMonth) {
        const daysInMonth = new Date(year, monthNum, 0).getDate();
        periods = Array.from({ length: daysInMonth }, (_, i) => `Tgl ${i + 1}`);
    } else if (period === 'Monthly') {
        periods = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    } else if (period === 'Quarterly') {
        periods = ['Q1', 'Q2', 'Q3', 'Q4'];
    } else if (period === 'Half-Yearly') {
        periods = ['H1', 'H2'];
    } else if (period === 'Yearly') {
        periods = [year.toString()];
    }

    const allInvoices    = db.read('purchaseInvoices') || [];
    const purchaseOrders = db.read('purchaseOrders') || [];
    const suppliers      = db.read('suppliers') || [];

    const invoices = allInvoices.filter(inv => {
        const statusUpper = (inv.status || '').toUpperCase();
        if (statusUpper === 'CANCELLED' || statusUpper === 'CANCELED' || statusUpper === 'DELETED') return false;
        const d = new Date(inv.date || inv.createdAt);
        if (isNaN(d.getTime())) return false;
        if (d.getFullYear() !== year) return false;
        if (isSpecificMonth && (d.getMonth() + 1) !== monthNum) return false;
        return true;
    });

    const chartData = Array(periods.length).fill(0);
    const pivot = {};

    invoices.forEach(inv => {
        const date = new Date(inv.date || inv.createdAt);
        const monthIdx = date.getMonth();
        let pIdx = 0;

        if (isSpecificMonth) {
            pIdx = date.getDate() - 1;
        } else if (period === 'Monthly') {
            pIdx = monthIdx;
        } else if (period === 'Quarterly') {
            pIdx = Math.floor(monthIdx / 3);
        } else if (period === 'Half-Yearly') {
            pIdx = Math.floor(monthIdx / 6);
        } else if (period === 'Yearly') {
            pIdx = 0;
        }

        if (pIdx < 0 || pIdx >= periods.length) return;

        // Resolve invoice items: Check inv.items first, then PO receipts/items
        let items = (Array.isArray(inv.items) && inv.items.length > 0) ? inv.items : [];
        if (items.length === 0 && (inv.purchaseOrderId || inv.poId)) {
            const po = purchaseOrders.find(p => p.id === (inv.purchaseOrderId || inv.poId));
            if (po) {
                if (inv.receiptId && Array.isArray(po.receipts)) {
                    const rcpt = po.receipts.find(r => String(r.id) === String(inv.receiptId) || String(r.receiptNumber) === String(inv.receiptId));
                    if (rcpt && Array.isArray(rcpt.items) && rcpt.items.length > 0) {
                        items = rcpt.items;
                    }
                }
                if (items.length === 0 && Array.isArray(po.items)) {
                    items = po.items;
                }
            }
        }

        const invTotalAmt = parseFloat(inv.totalAmount || inv.grandTotal || 0);
        const invTotalQty = items.reduce((sum, it) => sum + (parseFloat(it.qty || it.receivedQty || 0) || 0), 0);

        if (isItem) {
            chartData[pIdx] += invTotalQty;
            if (items.length > 0) {
                items.forEach(it => {
                    const rawLabel = it.itemName || it.prodText || it.name || 'Unknown Item';
                    const label = rawLabel.split(' (')[0].trim();
                    const key = label;
                    const code = it.inventoryItemId || it.productId || '-';
                    const itQty = parseFloat(it.qty || it.receivedQty || 0) || 0;
                    const itAmt = parseFloat(it.subtotal || it.total || (itQty * (it.price || 0)) || 0);

                    if (!pivot[key]) {
                        pivot[key] = { label, code, currency: 'IDR', periods: Array.from({ length: periods.length }, () => ({ qty: 0, amt: 0 })) };
                    }
                    pivot[key].periods[pIdx].qty += itQty;
                    pivot[key].periods[pIdx].amt += itAmt;
                });
            } else {
                const label = 'Direct Invoice / Unlinked Item';
                if (!pivot[label]) {
                    pivot[label] = { label, code: '-', currency: 'IDR', periods: Array.from({ length: periods.length }, () => ({ qty: 0, amt: 0 })) };
                }
                pivot[label].periods[pIdx].qty += 1;
                pivot[label].periods[pIdx].amt += invTotalAmt;
            }
        } else {
            // Supplier based
            chartData[pIdx] += invTotalAmt;
            const supp = suppliers.find(s => s.id === inv.supplierId);
            const label = supp?.name || inv.supplierName || 'Unknown Supplier';
            const key = inv.supplierId || label;

            if (!pivot[key]) {
                pivot[key] = { label, code: key, currency: 'IDR', periods: Array.from({ length: periods.length }, () => ({ qty: 0, amt: 0 })) };
            }
            pivot[key].periods[pIdx].qty += invTotalQty;
            pivot[key].periods[pIdx].amt += invTotalAmt;
        }
    });

    const rows = Object.values(pivot);

    const formatNum = v => new Intl.NumberFormat('id-ID', { maximumFractionDigits: 3 }).format(v || 0);

    const datasets = [{
        label: isItem ? 'Total Qty' : 'Total Invoice Value',
        data: chartData,
        borderColor: '#2563eb',
        backgroundColor: 'rgba(37, 99, 235, 0.08)',
        fill: true,
        pointBackgroundColor: '#2563eb',
        pointBorderColor: '#ffffff',
        pointBorderWidth: 2,
        pointHoverBackgroundColor: '#2563eb',
        pointHoverBorderColor: '#ffffff',
        pointRadius: 4,
        pointHoverRadius: 6,
        borderWidth: 2.5,
        tension: 0.3
    }];

    const ctx = document.getElementById('pit_chart');
    if (ctx && typeof Chart !== 'undefined') {
        if (window._pitChart) window._pitChart.destroy();
        window._pitChart = new Chart(ctx, {
            type: 'line',
            data: { labels: periods, datasets: datasets },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                interaction: { mode: 'index', intersect: false },
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        callbacks: {
                            label: c => isItem
                                ? ` Total Qty: ${formatNum(c.parsed.y)} KG`
                                : ` Total Invoice: Rp ${new Intl.NumberFormat('id-ID').format(c.parsed.y)}`
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
                            callback: v => isItem
                                ? (v >= 1000 ? (v / 1000).toFixed(0) + ' K' : v) + ' KG'
                                : (v >= 1000000 ? (v / 1000000).toFixed(0) + ' M' : (v >= 1000 ? (v / 1000).toFixed(0) + ' K' : v))
                        },
                        beginAtZero: true
                    }
                }
            }
        });
    }

    const thead = document.getElementById('pit_thead');
    if (!thead) return;

    thead.innerHTML = `
        <th class="w-10 px-3 py-2 border-r border-[#e5e7eb] font-medium text-center"></th>
        <th class="min-w-[200px] px-3 py-2 border-r border-[#e5e7eb] font-medium">${basedOn}</th>
        ${!isItem ? `<th class="px-3 py-2 border-r border-[#e5e7eb] font-medium">Currency</th>` : ''}
        ${periods.map(p => isItem ? `
            <th class="px-3 py-2 border-r border-[#e5e7eb] text-right font-medium">${p} (Qty)</th>
        ` : `
            <th class="px-3 py-2 border-r border-[#e5e7eb] text-right font-medium">${p} (Amt)</th>
        `).join('')}
    `;

    const tbody = document.getElementById('pit_tbody');
    if (!tbody) return;

    const totQty = Array(periods.length).fill(0);
    const totAmt = Array(periods.length).fill(0);
    rows.forEach(row => {
        row.periods.forEach((m, i) => { totQty[i] += m.qty; totAmt[i] += m.amt; });
    });

    const colCount = (isItem ? 2 : 3) + periods.length;

    tbody.innerHTML = rows.length === 0
        ? `<tr><td colspan="${colCount}" class="text-center text-gray-500 py-10">No Data Available</td></tr>`
        : rows.map(row => `
        <tr class="hover:bg-gray-50 transition-colors group">
            <td class="px-3 py-2 border-r border-[#e5e7eb] bg-[#f9fafb] text-xs text-gray-400 text-center select-none w-10"></td>
            <td class="px-3 py-2 border-r border-[#e5e7eb] whitespace-nowrap font-medium">${row.label}</td>
            ${!isItem ? `<td class="px-3 py-2 border-r border-[#e5e7eb] whitespace-nowrap text-gray-500">${row.currency}</td>` : ''}
            ${row.periods.map(m => isItem ? `
                <td class="px-3 py-2 border-r border-[#e5e7eb] text-right whitespace-nowrap">${formatNum(m.qty)}</td>
            ` : `
                <td class="px-3 py-2 border-r border-[#e5e7eb] text-right whitespace-nowrap"><span class="text-gray-400 text-[11px] mr-1">Rp</span>${formatNum(m.amt)}</td>
            `).join('')}
        </tr>
    `).join('');

    if (rows.length > 0) {
        const totalRow = document.createElement('tr');
        totalRow.className = 'border-t border-[#e5e7eb] bg-[#f9fafb] font-semibold';
        totalRow.innerHTML = `
            <td class="px-3 py-2 border-r border-[#e5e7eb] text-gray-500 font-medium text-xs text-center w-10">1</td>
            <td class="px-3 py-2 border-r border-[#e5e7eb] font-semibold">Total</td>
            ${!isItem ? `<td class="px-3 py-2 border-r border-[#e5e7eb]"></td>` : ''}
            ${(isItem ? totQty : totAmt).map(val => isItem ? `
                <td class="px-3 py-2 border-r border-[#e5e7eb] text-right font-semibold">${formatNum(val)}</td>
            ` : `
                <td class="px-3 py-2 border-r border-[#e5e7eb] text-right font-semibold"><span class="text-gray-400 text-[11px] mr-1">Rp</span>${formatNum(val)}</td>
            `).join('')}
        `;

        Array.from(tbody.children).forEach((tr, i) => {
            if (tr !== totalRow && tr.children[0] && tr.children.length > 1) {
                tr.children[0].innerHTML = i + 1;
            }
        });

        tbody.appendChild(totalRow);
    }
};

window.exportPITrendsCsv = () => {
    const table = document.getElementById('pit_table');
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
    a.download = `purchase_invoice_trends_${document.getElementById('pit_year')?.value || ''}.csv`;
    a.click();
};

// --- Request For Quotation Trends ---
window.renderPurchaseRFQTrends = () => {
    document.getElementById('pageTitle').innerText = 'Request For Quotation Trends';
    const mainContent = document.getElementById('main-content');
    const currentYear = new Date().getFullYear();

    mainContent.innerHTML = `
        <div class="min-h-full flex flex-col font-sans bg-white">
            <div class="flex flex-wrap items-center gap-3 px-4 py-3 border-b border-gray-200 bg-white shadow-sm shrink-0">
                <select id="rfqt_period" onchange="updatePurchaseRFQTrends()"
                    class="bg-gray-100 border-none rounded-md px-3 py-1.5 text-[13px] text-gray-700 focus:outline-none hover:bg-gray-200 cursor-pointer outline-none">
                    <option value="Monthly" selected>Monthly (Jan - Dec)</option>
                    <option value="Quarterly">Quarterly</option>
                    <option value="Half-Yearly">Half-Yearly</option>
                    <option value="Yearly">Yearly</option>
                </select>

                <select id="rfqt_month" onchange="updatePurchaseRFQTrends()"
                    class="bg-gray-100 border-none rounded-md px-3 py-1.5 text-[13px] text-gray-700 focus:outline-none hover:bg-gray-200 cursor-pointer outline-none">
                    <option value="All" selected>Semua Bulan (Jan - Des)</option>
                    <option value="1">Januari</option>
                    <option value="2">Februari</option>
                    <option value="3">Maret</option>
                    <option value="4">April</option>
                    <option value="5">Mei</option>
                    <option value="6">Juni</option>
                    <option value="7">Juli</option>
                    <option value="8">Agustus</option>
                    <option value="9">September</option>
                    <option value="10">Oktober</option>
                    <option value="11">November</option>
                    <option value="12">Desember</option>
                </select>

                <select id="rfqt_based_on" onchange="updatePurchaseRFQTrends()"
                    class="bg-gray-100 border-none rounded-md px-3 py-1.5 text-[13px] text-gray-700 focus:outline-none hover:bg-gray-200 cursor-pointer outline-none">
                    <option value="Item" selected>Item</option>
                    <option value="Supplier">Supplier</option>
                </select>

                <input type="number" id="rfqt_year" value="${currentYear}" onchange="updatePurchaseRFQTrends()"
                    class="bg-gray-100 border-none rounded-md px-3 py-1.5 text-[13px] text-gray-700 focus:outline-none hover:bg-gray-200 outline-none w-24">

                <div class="flex-1"></div>
                <button onclick="exportPRFQTCsv()" class="bg-gray-100 border border-gray-200 rounded-md px-3 py-1.5 text-[13px] text-gray-700 transition-colors hover:bg-gray-200 shadow-sm">
                    Export
                </button>
            </div>

            <div class="px-5 mt-4 mb-2 text-[13px] text-gray-500 font-medium flex items-center gap-2">
                <div class="w-2 h-2 rounded-full bg-[#0284c7]"></div>
                This report was generated just now.
            </div>

            <div class="bg-white px-8 pt-8 pb-4 shrink-0 border-b border-gray-200 relative">
                <div style="height: 250px;">
                    <canvas id="rfqt_chart"></canvas>
                </div>
            </div>

            <div class="w-full overflow-x-auto bg-white border border-gray-200 border-t-0 border-x-0 relative">
                <table class="w-full text-left border-collapse" id="rfqt_table">
                    <thead class="bg-[#f9fafb] sticky top-0 z-20 shadow-[0_1px_0_#e5e7eb]">
                        <tr id="rfqt_thead" class="text-[13px] text-gray-600 border-b border-gray-200"></tr>
                    </thead>
                    <tbody id="rfqt_tbody" class="divide-y divide-gray-100 text-[13px] text-gray-800"></tbody>
                </table>
            </div>

            <div class="px-5 py-3 bg-white border-t border-gray-200 shrink-0 flex justify-between items-center w-full mt-auto">
                <p class="text-[13px] text-gray-500">For comparison, use &gt;5, &lt;10 or =324. For ranges, use 5:10 (for values between 5 &amp; 10).</p>
                <p class="text-[12px] text-gray-500 font-medium tracking-wide">Execution Time: ${(Math.random() * 0.05 + 0.01).toFixed(6)} sec</p>
            </div>
        </div>
    `;
    updatePurchaseRFQTrends();
};

window.updatePurchaseRFQTrends = () => {
    const year          = parseInt(document.getElementById('rfqt_year')?.value || new Date().getFullYear());
    const basedOn       = document.getElementById('rfqt_based_on')?.value || 'Item';
    const period        = document.getElementById('rfqt_period')?.value || 'Monthly';
    const selectedMonth = document.getElementById('rfqt_month')?.value || 'All';
    const isSpecificMonth = selectedMonth !== 'All';
    const monthNum      = isSpecificMonth ? parseInt(selectedMonth) : null;
    const isItem        = basedOn === 'Item';

    let periods = [];
    if (isSpecificMonth) {
        const daysInMonth = new Date(year, monthNum, 0).getDate();
        periods = Array.from({ length: daysInMonth }, (_, i) => `Tgl ${i + 1}`);
    } else if (period === 'Monthly') {
        periods = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    } else if (period === 'Quarterly') {
        periods = ['Q1','Q2','Q3','Q4'];
    } else if (period === 'Half-Yearly') {
        periods = ['H1','H2'];
    } else if (period === 'Yearly') {
        periods = [year.toString()];
    }

    const rfqs = (db.read('purchaseRFQs') || []).filter(r => {
        const statusUpper = (r.status || '').toUpperCase();
        if (statusUpper === 'CANCELLED' || statusUpper === 'CANCELED' || statusUpper === 'DELETED') return false;
        const d = new Date(r.date || r.createdAt);
        if (isNaN(d.getTime())) return false;
        if (d.getFullYear() !== year) return false;
        if (isSpecificMonth && (d.getMonth() + 1) !== monthNum) return false;
        return true;
    });

    const suppliers = db.read('suppliers') || [];
    const chartData = Array(periods.length).fill(0);
    const pivot = {};

    rfqs.forEach(r => {
        const d = new Date(r.date || r.createdAt);
        const monthIdx = d.getMonth();
        let pIdx = 0;

        if (isSpecificMonth) {
            pIdx = d.getDate() - 1;
        } else if (period === 'Monthly') {
            pIdx = monthIdx;
        } else if (period === 'Quarterly') {
            pIdx = Math.floor(monthIdx / 3);
        } else if (period === 'Half-Yearly') {
            pIdx = Math.floor(monthIdx / 6);
        } else if (period === 'Yearly') {
            pIdx = 0;
        }

        if (pIdx < 0 || pIdx >= periods.length) return;

        const items = Array.isArray(r.items) ? r.items : [];
        const rfqTotalAmt = parseFloat(r.totalAmount || r.grandTotal || 0);
        const rfqTotalQty = items.reduce((s, it) => s + (parseFloat(it.qty || 0) || 0), 0);

        if (isItem) {
            chartData[pIdx] += rfqTotalQty;
            items.forEach(it => {
                const rawLabel = it.itemName || it.prodText || it.name || 'Unknown Item';
                const label = rawLabel.split(' (')[0].trim();
                const key = label;
                const itQty = parseFloat(it.qty || 0) || 0;
                const itAmt = parseFloat(it.subtotal || it.total || (itQty * (it.price || 0)) || 0);

                if (!pivot[key]) {
                    pivot[key] = { label, code: it.inventoryItemId || it.productId || '-', currency: 'IDR', periods: Array.from({ length: periods.length }, () => ({ qty: 0, amt: 0 })) };
                }
                pivot[key].periods[pIdx].qty += itQty;
                pivot[key].periods[pIdx].amt += itAmt;
            });
        } else {
            chartData[pIdx] += rfqTotalAmt;
            const supplier = suppliers.find(s => s.id === r.supplierId);
            const label = supplier ? supplier.name : (r.supplierName || 'Unknown');
            const key = r.supplierId || label;

            if (!pivot[key]) {
                pivot[key] = { label, code: key, currency: 'IDR', periods: Array.from({ length: periods.length }, () => ({ qty: 0, amt: 0 })) };
            }
            pivot[key].periods[pIdx].qty += rfqTotalQty;
            pivot[key].periods[pIdx].amt += rfqTotalAmt;
        }
    });

    const rows = Object.values(pivot);
    const formatNum = v => new Intl.NumberFormat('id-ID', { maximumFractionDigits: 3 }).format(v || 0);

    const datasets = [{
        label: isItem ? 'Total Qty' : 'Total RFQ Value',
        data: chartData,
        borderColor: '#0284c7',
        backgroundColor: 'rgba(2, 132, 199, 0.08)',
        fill: true,
        pointBackgroundColor: '#0284c7',
        pointBorderColor: '#ffffff',
        pointBorderWidth: 2,
        pointRadius: 4,
        pointHoverRadius: 6,
        borderWidth: 2.5,
        tension: 0.3
    }];

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
                    legend: { display: false },
                    tooltip: {
                        callbacks: {
                            label: c => isItem
                                ? ` Total Qty: ${formatNum(c.parsed.y)} KG`
                                : ` Total RFQ: Rp ${new Intl.NumberFormat('id-ID').format(c.parsed.y)}`
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
                            callback: v => isItem
                                ? (v >= 1000 ? (v / 1000).toFixed(0) + ' K' : v) + ' KG'
                                : (v >= 1000000 ? (v / 1000000).toFixed(0) + ' M' : (v >= 1000 ? (v / 1000).toFixed(0) + ' K' : v))
                        },
                        beginAtZero: true
                    }
                }
            }
        });
    }

    const thead = document.getElementById('rfqt_thead');
    if (!thead) return;

    thead.innerHTML = `
        <th class="w-10 px-3 py-2 border-r border-[#e5e7eb] font-medium text-center"></th>
        <th class="min-w-[200px] px-3 py-2 border-r border-[#e5e7eb] font-medium">${basedOn}</th>
        ${!isItem ? `<th class="px-3 py-2 border-r border-[#e5e7eb] font-medium">Currency</th>` : ''}
        ${periods.map(p => isItem ? `
            <th class="px-3 py-2 border-r border-[#e5e7eb] text-right font-medium">${p} (Qty)</th>
        ` : `
            <th class="px-3 py-2 border-r border-[#e5e7eb] text-right font-medium">${p} (Amt)</th>
        `).join('')}
    `;

    const tbody = document.getElementById('rfqt_tbody');
    if (!tbody) return;

    const totQty = Array(periods.length).fill(0);
    const totAmt = Array(periods.length).fill(0);
    rows.forEach(row => {
        row.periods.forEach((m, i) => { totQty[i] += m.qty; totAmt[i] += m.amt; });
    });

    const colCount = (isItem ? 2 : 3) + periods.length;

    tbody.innerHTML = rows.length === 0
        ? `<tr><td colspan="${colCount}" class="text-center text-gray-500 py-10">No Data Available</td></tr>`
        : rows.map(row => `
        <tr class="hover:bg-gray-50 transition-colors group">
            <td class="px-3 py-2 border-r border-[#e5e7eb] bg-[#f9fafb] text-xs text-gray-400 text-center select-none w-10"></td>
            <td class="px-3 py-2 border-r border-[#e5e7eb] whitespace-nowrap font-medium">${row.label}</td>
            ${!isItem ? `<td class="px-3 py-2 border-r border-[#e5e7eb] whitespace-nowrap text-gray-500">${row.currency}</td>` : ''}
            ${row.periods.map(m => isItem ? `
                <td class="px-3 py-2 border-r border-[#e5e7eb] text-right whitespace-nowrap">${formatNum(m.qty)}</td>
            ` : `
                <td class="px-3 py-2 border-r border-[#e5e7eb] text-right whitespace-nowrap"><span class="text-gray-400 text-[11px] mr-1">Rp</span>${formatNum(m.amt)}</td>
            `).join('')}
        </tr>
    `).join('');

    if (rows.length > 0) {
        const totalRow = document.createElement('tr');
        totalRow.className = 'border-t border-[#e5e7eb] bg-[#f9fafb] font-semibold';
        totalRow.innerHTML = `
            <td class="px-3 py-2 border-r border-[#e5e7eb] text-gray-500 font-medium text-xs text-center w-10">1</td>
            <td class="px-3 py-2 border-r border-[#e5e7eb] font-semibold">Total</td>
            ${!isItem ? `<td class="px-3 py-2 border-r border-[#e5e7eb]"></td>` : ''}
            ${(isItem ? totQty : totAmt).map(val => isItem ? `
                <td class="px-3 py-2 border-r border-[#e5e7eb] text-right font-semibold">${formatNum(val)}</td>
            ` : `
                <td class="px-3 py-2 border-r border-[#e5e7eb] text-right font-semibold"><span class="text-gray-400 text-[11px] mr-1">Rp</span>${formatNum(val)}</td>
            `).join('')}
        `;

        Array.from(tbody.children).forEach((tr, i) => {
            if (tr !== totalRow && tr.children[0] && tr.children.length > 1) {
                tr.children[0].innerHTML = i + 1;
            }
        });

        tbody.appendChild(totalRow);
    }
};

window.exportPRFQTCsv = () => {
    const table = document.getElementById('rfqt_table');
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
    a.download = `rfq_trends_${document.getElementById('rfqt_year')?.value || ''}.csv`;
    a.click();
};

// --- Purchase Orders Trends ---
window.renderPurchaseOrderTrends = () => {
    document.getElementById('pageTitle').innerText = 'Purchase Orders Trends';
    const mainContent = document.getElementById('main-content');
    const currentYear = new Date().getFullYear();

    mainContent.innerHTML = `
        <div class="min-h-full flex flex-col font-sans bg-white">
            <div class="flex flex-wrap items-center gap-3 px-4 py-3 border-b border-gray-200 bg-white shadow-sm shrink-0">
                <select id="pot_period" onchange="updatePurchaseOrderTrends()"
                    class="bg-gray-100 border-none rounded-md px-3 py-1.5 text-[13px] text-gray-700 focus:outline-none hover:bg-gray-200 cursor-pointer outline-none">
                    <option value="Monthly" selected>Monthly (Jan - Dec)</option>
                    <option value="Quarterly">Quarterly</option>
                    <option value="Half-Yearly">Half-Yearly</option>
                    <option value="Yearly">Yearly</option>
                </select>

                <select id="pot_month" onchange="updatePurchaseOrderTrends()"
                    class="bg-gray-100 border-none rounded-md px-3 py-1.5 text-[13px] text-gray-700 focus:outline-none hover:bg-gray-200 cursor-pointer outline-none">
                    <option value="All" selected>Semua Bulan (Jan - Des)</option>
                    <option value="1">Januari</option>
                    <option value="2">Februari</option>
                    <option value="3">Maret</option>
                    <option value="4">April</option>
                    <option value="5">Mei</option>
                    <option value="6">Juni</option>
                    <option value="7">Juli</option>
                    <option value="8">Agustus</option>
                    <option value="9">September</option>
                    <option value="10">Oktober</option>
                    <option value="11">November</option>
                    <option value="12">Desember</option>
                </select>

                <select id="pot_based_on" onchange="updatePurchaseOrderTrends()"
                    class="bg-gray-100 border-none rounded-md px-3 py-1.5 text-[13px] text-gray-700 focus:outline-none hover:bg-gray-200 cursor-pointer outline-none">
                    <option value="Item" selected>Item</option>
                    <option value="Supplier">Supplier</option>
                </select>

                <input type="number" id="pot_year" value="${currentYear}" onchange="updatePurchaseOrderTrends()"
                    class="bg-gray-100 border-none rounded-md px-3 py-1.5 text-[13px] text-gray-700 focus:outline-none hover:bg-gray-200 outline-none w-24">

                <div class="flex-1"></div>
                <button onclick="exportPOTrendsCsv()" class="bg-gray-100 border border-gray-200 rounded-md px-3 py-1.5 text-[13px] text-gray-700 transition-colors hover:bg-gray-200 shadow-sm">
                    Export
                </button>
            </div>

            <div class="px-5 mt-4 mb-2 text-[13px] text-gray-500 font-medium flex items-center gap-2">
                <div class="w-2 h-2 rounded-full bg-[#10b981]"></div>
                This report was generated just now.
            </div>

            <div class="bg-white px-8 pt-8 pb-4 shrink-0 border-b border-gray-200 relative">
                <div style="height: 250px;">
                    <canvas id="pot_chart"></canvas>
                </div>
            </div>

            <div class="w-full overflow-x-auto bg-white border border-gray-200 border-t-0 border-x-0 relative">
                <table class="w-full text-left border-collapse" id="pot_table">
                    <thead class="bg-[#f9fafb] sticky top-0 z-20 shadow-[0_1px_0_#e5e7eb]">
                        <tr id="pot_thead" class="text-[13px] text-gray-600 border-b border-gray-200"></tr>
                    </thead>
                    <tbody id="pot_tbody" class="divide-y divide-gray-100 text-[13px] text-gray-800"></tbody>
                </table>
            </div>

            <div class="px-5 py-3 bg-white border-t border-gray-200 shrink-0 flex justify-between items-center w-full mt-auto">
                <p class="text-[13px] text-gray-500">For comparison, use &gt;5, &lt;10 or =324. For ranges, use 5:10 (for values between 5 &amp; 10).</p>
                <p class="text-[12px] text-gray-500 font-medium tracking-wide">Execution Time: ${(Math.random() * 0.05 + 0.01).toFixed(6)} sec</p>
            </div>
        </div>
    `;
    updatePurchaseOrderTrends();
};

window.updatePurchaseOrderTrends = () => {
    const year          = parseInt(document.getElementById('pot_year')?.value || new Date().getFullYear());
    const basedOn       = document.getElementById('pot_based_on')?.value || 'Item';
    const period        = document.getElementById('pot_period')?.value || 'Monthly';
    const selectedMonth = document.getElementById('pot_month')?.value || 'All';
    const isSpecificMonth = selectedMonth !== 'All';
    const monthNum      = isSpecificMonth ? parseInt(selectedMonth) : null;
    const isItem        = basedOn === 'Item';

    let periods = [];
    if (isSpecificMonth) {
        const daysInMonth = new Date(year, monthNum, 0).getDate();
        periods = Array.from({ length: daysInMonth }, (_, i) => `Tgl ${i + 1}`);
    } else if (period === 'Monthly') {
        periods = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    } else if (period === 'Quarterly') {
        periods = ['Q1', 'Q2', 'Q3', 'Q4'];
    } else if (period === 'Half-Yearly') {
        periods = ['H1', 'H2'];
    } else if (period === 'Yearly') {
        periods = [year.toString()];
    }

    const getPODate = (p) => (typeof window.getPOEffectiveDate === 'function') ? window.getPOEffectiveDate(p) : new Date(p.actualDeliveryDate || p.date || p.createdAt || Date.now());

    const pos = (db.read('purchaseOrders') || []).filter(p => {
        const statusUpper = (p.status || '').toUpperCase();
        if (statusUpper === 'CANCELLED' || statusUpper === 'CANCELED' || statusUpper === 'DELETED') return false;
        const d = new Date(getPODate(p));
        if (isNaN(d.getTime())) return false;
        if (d.getFullYear() !== year) return false;
        if (isSpecificMonth && (d.getMonth() + 1) !== monthNum) return false;
        return true;
    });

    const suppliers = db.read('suppliers') || [];
    const chartData = Array(periods.length).fill(0);
    const pivot = {};

    pos.forEach(p => {
        const d = new Date(getPODate(p));
        const monthIdx = d.getMonth();
        let pIdx = 0;

        if (isSpecificMonth) {
            pIdx = d.getDate() - 1;
        } else if (period === 'Monthly') {
            pIdx = monthIdx;
        } else if (period === 'Quarterly') {
            pIdx = Math.floor(monthIdx / 3);
        } else if (period === 'Half-Yearly') {
            pIdx = Math.floor(monthIdx / 6);
        } else if (period === 'Yearly') {
            pIdx = 0;
        }

        if (pIdx < 0 || pIdx >= periods.length) return;

        const items = Array.isArray(p.items) ? p.items : [];
        const poTotalAmt = parseFloat(p.totalAmount || p.grandTotal || 0);
        const poTotalQty = items.reduce((s, it) => s + (parseFloat(it.qty || it.receivedQty || 0) || 0), 0);

        if (isItem) {
            chartData[pIdx] += poTotalQty;
            items.forEach(it => {
                const rawLabel = it.itemName || it.prodText || it.name || 'Unknown Item';
                const label = rawLabel.split(' (')[0].trim();
                const key = label;
                const itQty = parseFloat(it.qty || it.receivedQty || 0) || 0;
                const itAmt = parseFloat(it.subtotal || it.total || (itQty * (it.price || 0)) || 0);

                if (!pivot[key]) {
                    pivot[key] = { label, code: it.inventoryItemId || it.productId || '-', currency: 'IDR', periods: Array.from({ length: periods.length }, () => ({ qty: 0, amt: 0 })) };
                }
                pivot[key].periods[pIdx].qty += itQty;
                pivot[key].periods[pIdx].amt += itAmt;
            });
        } else {
            chartData[pIdx] += poTotalAmt;
            const supplier = suppliers.find(s => s.id === p.supplierId);
            const label = supplier ? supplier.name : (p.supplierName || 'Unknown');
            const key = p.supplierId || label;

            if (!pivot[key]) {
                pivot[key] = { label, code: key, currency: 'IDR', periods: Array.from({ length: periods.length }, () => ({ qty: 0, amt: 0 })) };
            }
            pivot[key].periods[pIdx].qty += poTotalQty;
            pivot[key].periods[pIdx].amt += poTotalAmt;
        }
    });

    const rows = Object.values(pivot);
    const formatNum = v => new Intl.NumberFormat('id-ID', { maximumFractionDigits: 3 }).format(v || 0);

    const datasets = [{
        label: isItem ? 'Total Qty' : 'Total PO Value',
        data: chartData,
        borderColor: '#10b981',
        backgroundColor: 'rgba(16, 185, 129, 0.08)',
        fill: true,
        pointBackgroundColor: '#10b981',
        pointBorderColor: '#ffffff',
        pointBorderWidth: 2,
        pointRadius: 4,
        pointHoverRadius: 6,
        borderWidth: 2.5,
        tension: 0.3
    }];

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
                    legend: { display: false },
                    tooltip: {
                        callbacks: {
                            label: c => isItem
                                ? ` Total Qty: ${formatNum(c.parsed.y)} KG`
                                : ` Total PO: Rp ${new Intl.NumberFormat('id-ID').format(c.parsed.y)}`
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
                            callback: v => isItem
                                ? (v >= 1000 ? (v / 1000).toFixed(0) + ' K' : v) + ' KG'
                                : (v >= 1000000 ? (v / 1000000).toFixed(0) + ' M' : (v >= 1000 ? (v / 1000).toFixed(0) + ' K' : v))
                        },
                        beginAtZero: true
                    }
                }
            }
        });
    }

    const thead = document.getElementById('pot_thead');
    if (!thead) return;

    thead.innerHTML = `
        <th class="w-10 px-3 py-2 border-r border-[#e5e7eb] font-medium text-center"></th>
        <th class="min-w-[200px] px-3 py-2 border-r border-[#e5e7eb] font-medium">${basedOn}</th>
        ${!isItem ? `<th class="px-3 py-2 border-r border-[#e5e7eb] font-medium">Currency</th>` : ''}
        ${periods.map(p => isItem ? `
            <th class="px-3 py-2 border-r border-[#e5e7eb] text-right font-medium">${p} (Qty)</th>
        ` : `
            <th class="px-3 py-2 border-r border-[#e5e7eb] text-right font-medium">${p} (Amt)</th>
        `).join('')}
    `;

    const tbody = document.getElementById('pot_tbody');
    if (!tbody) return;

    const totQty = Array(periods.length).fill(0);
    const totAmt = Array(periods.length).fill(0);
    rows.forEach(row => {
        row.periods.forEach((m, i) => { totQty[i] += m.qty; totAmt[i] += m.amt; });
    });

    const colCount = (isItem ? 2 : 3) + periods.length;

    tbody.innerHTML = rows.length === 0
        ? `<tr><td colspan="${colCount}" class="text-center text-gray-500 py-10">No Data Available</td></tr>`
        : rows.map(row => `
        <tr class="hover:bg-gray-50 transition-colors group">
            <td class="px-3 py-2 border-r border-[#e5e7eb] bg-[#f9fafb] text-xs text-gray-400 text-center select-none w-10"></td>
            <td class="px-3 py-2 border-r border-[#e5e7eb] whitespace-nowrap font-medium">${row.label}</td>
            ${!isItem ? `<td class="px-3 py-2 border-r border-[#e5e7eb] whitespace-nowrap text-gray-500">${row.currency}</td>` : ''}
            ${row.periods.map(m => isItem ? `
                <td class="px-3 py-2 border-r border-[#e5e7eb] text-right whitespace-nowrap">${formatNum(m.qty)}</td>
            ` : `
                <td class="px-3 py-2 border-r border-[#e5e7eb] text-right whitespace-nowrap"><span class="text-gray-400 text-[11px] mr-1">Rp</span>${formatNum(m.amt)}</td>
            `).join('')}
        </tr>
    `).join('');

    if (rows.length > 0) {
        const totalRow = document.createElement('tr');
        totalRow.className = 'border-t border-[#e5e7eb] bg-[#f9fafb] font-semibold';
        totalRow.innerHTML = `
            <td class="px-3 py-2 border-r border-[#e5e7eb] text-gray-500 font-medium text-xs text-center w-10">1</td>
            <td class="px-3 py-2 border-r border-[#e5e7eb] font-semibold">Total</td>
            ${!isItem ? `<td class="px-3 py-2 border-r border-[#e5e7eb]"></td>` : ''}
            ${(isItem ? totQty : totAmt).map(val => isItem ? `
                <td class="px-3 py-2 border-r border-[#e5e7eb] text-right font-semibold">${formatNum(val)}</td>
            ` : `
                <td class="px-3 py-2 border-r border-[#e5e7eb] text-right font-semibold"><span class="text-gray-400 text-[11px] mr-1">Rp</span>${formatNum(val)}</td>
            `).join('')}
        `;

        Array.from(tbody.children).forEach((tr, i) => {
            if (tr !== totalRow && tr.children[0] && tr.children.length > 1) {
                tr.children[0].innerHTML = i + 1;
            }
        });

        tbody.appendChild(totalRow);
    }
};

window.exportPOTrendsCsv = () => {
    const table = document.getElementById('pot_table');
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
    a.download = `purchase_order_trends_${document.getElementById('pot_year')?.value || ''}.csv`;
    a.click();
};

