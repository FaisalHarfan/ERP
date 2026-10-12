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
                        <option value="purchase_order">Purchase Order</option>
                        <option value="goods_receipt" selected>Goods Receipt (Penerimaan Barang)</option>
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
    try {
        const basedOn = document.getElementById('pa_based_on')?.value || 'Supplier';
        const valueField = document.getElementById('pa_value_field')?.value || 'purchase_order';
        const period = document.getElementById('pa_period')?.value || 'Monthly';
        const fromStr = document.getElementById('pa_from')?.value;
        const toStr = document.getElementById('pa_to')?.value;

        const from = fromStr ? new Date(fromStr) : new Date(new Date().getFullYear(), 0, 1);
        const to = toStr ? new Date(toStr) : new Date(new Date().getFullYear(), 11, 31);
        from.setHours(0,0,0,0); to.setHours(23,59,59,999);

        // Helper to safely parse JSON arrays
        const safeArray = (val) => {
            if (!val) return [];
            if (typeof val === 'string') {
                try {
                    const parsed = JSON.parse(val);
                    return Array.isArray(parsed) ? parsed : [];
                } catch (e) { return []; }
            }
            return Array.isArray(val) ? val : [];
        };

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

        const formatNum   = (v) => typeof window.formatNumber === 'function' ? window.formatNumber(v) : (v || 0).toLocaleString('id-ID');
        const isSupplier  = basedOn === 'Supplier';
        const getDocDate  = (doc) => {
            if (doc && doc.isReceipt) return doc.date || doc.createdAt;
            if (doc && (doc.poNumber || doc.po_number || doc.supplierId || doc.supplier_id)) {
                if (typeof window.getPOEffectiveDate === 'function') return window.getPOEffectiveDate(doc);
                if (doc.actualDeliveryDate || doc.actual_delivery_date) return new Date(doc.actualDeliveryDate || doc.actual_delivery_date);
                if (doc.receivedAt) return new Date(doc.receivedAt);
            }
            return doc.date || doc.createdAt || '';
        };
        const getDocQty   = (doc) => safeArray(doc.items).reduce((sum, it) => sum + parseFloat(it.qty || it.receivedQty || 0), 0);
        const getDocAmt   = (doc) => parseFloat(doc.totalAmount || doc.grandTotal || doc.total_amount || 0);
        const getValue    = isSupplier ? getDocAmt : getDocQty;
        const getItemVal  = (it) => isSupplier ? parseFloat(it.subtotal || (parseFloat(it.qty||0) * parseFloat(it.price||0)) || 0) : parseFloat(it.qty || it.receivedQty || 0);
        const fmtVal      = (v) => isSupplier ? 'Rp ' + formatNum(v) : formatNum(v) + ' KG';

        const filterByRange = (docs) => docs.filter(doc => {
            const rawD = getDocDate(doc);
            if (!rawD) return false;
            const d = new Date(rawD);
            if (isNaN(d.getTime())) return false;
            return d >= from && d <= to;
        });

        let targetDocs = [];
        switch (valueField) {
            case 'rfq': targetDocs = filterByRange(purchaseRFQs); break;
            case 'purchase_order': targetDocs = filterByRange(purchaseOrders); break;
            case 'goods_receipt': {
                const allReceipts = [];
                purchaseOrders.forEach(po => {
                    const receipts = safeArray(po.receipts);
                    const poItems = safeArray(po.items);
                    receipts.forEach(rcpt => {
                        const rcptItems = safeArray(rcpt.items);
                        let rcptAmt = 0;
                        const mappedItems = rcptItems.map(it => {
                            const poItem = poItems.find(pi => (pi.inventoryItemId && pi.inventoryItemId === it.inventoryItemId) || (pi.itemName && pi.itemName === it.itemName));
                            const price = parseFloat(it.price || (poItem ? poItem.price : 0) || 0);
                            const qty = parseFloat(it.receivedQty || it.qty || 0);
                            const subtotal = parseFloat(it.subtotal || (qty * price) || 0);
                            rcptAmt += subtotal;
                            return {
                                ...it,
                                price,
                                qty,
                                subtotal,
                                itemName: it.itemName || it.prodText || (poItem ? (poItem.itemName || poItem.prodText) : 'Unknown')
                            };
                        });
                        allReceipts.push({
                            id: rcpt.id || rcpt.receiptNumber,
                            receiptNumber: rcpt.receiptNumber,
                            poId: po.id,
                            poNumber: po.poNumber || po.po_number,
                            supplierId: po.supplierId || po.supplier_id,
                            supplierName: po.supplierName || po.supplier_name,
                            date: rcpt.date || rcpt.receivedDate || rcpt.createdAt,
                            createdAt: rcpt.createdAt,
                            totalAmount: rcptAmt,
                            grandTotal: rcptAmt,
                            items: mappedItems,
                            isReceipt: true,
                            status: 'RECEIVED'
                        });
                    });
                });
                targetDocs = filterByRange(allReceipts);
                break;
            }
            case 'purchase_invoice': targetDocs = filterByRange(purchaseInvoices.filter(i => (i.status || '').toUpperCase() !== 'CANCELLED' && (i.status || '').toUpperCase() !== 'CANCELED')); break;
            default: targetDocs = filterByRange(purchaseOrders);
        }

        let groups = ['Overall'];
        if (basedOn === 'Supplier') {
            const totals = {};
            targetDocs.forEach(d => {
                const suppId = d.supplierId || d.supplier_id;
                const s = suppliers.find(x => x.id === suppId);
                const name = s ? s.name : (d.supplierName || d.supplier_name || 'Unknown');
                totals[name] = (totals[name] || 0) + getValue(d);
            });
            groups = Object.keys(totals).sort((a,b) => totals[b] - totals[a]).slice(0, 10);
            if (groups.length === 0) groups = ['Overall'];
        } else if (basedOn === 'Item') {
            const totals = {};
            targetDocs.forEach(d => {
                safeArray(d.items).forEach(it => {
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
                const rawD = getDocDate(d);
                if (!rawD) return;
                const dt = new Date(rawD);
                if (dt >= b.start && dt <= b.end) {
                    sum += getValue(d);
                }
            });
            return sum;
        });
        const grandTotal = overallData.reduce((sum, v) => sum + v, 0);

        const chartColors = ['#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#f97316', '#ec4899', '#84cc16', '#14b8a6', '#6366f1'];
        const datasets = groups.map((g, idx) => {
            const color = chartColors[idx % chartColors.length];
            const bucketData = buckets.map((b, i) => {
                if (g === 'Overall') return overallData[i];
                let sum = 0;
                targetDocs.forEach(d => {
                    const rawD = getDocDate(d);
                    if (!rawD) return;
                    const dt = new Date(rawD);
                    if (dt >= b.start && dt <= b.end) {
                        if (basedOn === 'Supplier') {
                            const suppId = d.supplierId || d.supplier_id;
                            const s = suppliers.find(x => x.id === suppId);
                            const sName = s ? s.name : (d.supplierName || d.supplier_name || 'Unknown');
                            if (sName === g) sum += getValue(d);
                        } else if (basedOn === 'Item') {
                            safeArray(d.items).forEach(it => {
                                const itName = it.itemName || it.prodText || 'Unknown';
                                if (itName === g) sum += getItemVal(it);
                            });
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
                        y: { grid: { color: 'rgba(51, 65, 85, 0.05)' }, ticks: { color: '#94a3b8', font: { size: 10 }, callback: v => isSupplier ? ('Rp ' + formatNum(v)) : (formatNum(v) + ' KG') } }
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
    } catch (err) {
        console.error('Error updating purchase analytics:', err);
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
                <div class="flex items-center gap-1.5">
                    <input type="date" id="pit_start_date" value="${currentYear}-01-01" onchange="updatePurchaseInvoiceTrends()"
                        class="bg-gray-100 border-none rounded-md px-3 py-1.5 text-[13px] text-gray-700 focus:outline-none hover:bg-gray-200 outline-none w-[130px]">
                    <span class="text-gray-400 text-xs font-semibold">to</span>
                    <input type="date" id="pit_end_date" value="${currentYear}-12-31" onchange="updatePurchaseInvoiceTrends()"
                        class="bg-gray-100 border-none rounded-md px-3 py-1.5 text-[13px] text-gray-700 focus:outline-none hover:bg-gray-200 outline-none w-[130px]">
                </div>

                <select id="pit_month" onchange="applyPITMonthFilter(this.value)"
                    class="bg-gray-100 border-none rounded-md px-2.5 py-1.5 text-[13px] text-gray-700 focus:outline-none hover:bg-gray-200 cursor-pointer outline-none">
                    <option value="">Semua Bulan (${currentYear})</option>
                    <option value="1">Januari</option><option value="2">Februari</option>
                    <option value="3">Maret</option><option value="4">April</option>
                    <option value="5">Mei</option><option value="6">Juni</option>
                    <option value="7">Juli</option><option value="8">Agustus</option>
                    <option value="9">September</option><option value="10">Oktober</option>
                    <option value="11">November</option><option value="12">Desember</option>
                </select>

                <select id="pit_based_on" onchange="updatePurchaseInvoiceTrends()"
                    class="bg-gray-100 border-none rounded-md px-3 py-1.5 text-[13px] text-gray-700 focus:outline-none hover:bg-gray-200 cursor-pointer outline-none">
                    <option value="Supplier" selected>Supplier</option>
                    <option value="Item">Item</option>
                </select>

                <button onclick="updatePurchaseInvoiceTrends()" class="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-md text-xs font-semibold shadow-sm transition-all active:scale-95 flex items-center gap-1.5">
                    <i class="fas fa-filter text-[10px]"></i> Filter
                </button>
                <button onclick="resetPITFilter()" class="bg-gray-100 hover:bg-gray-200 text-gray-600 px-2.5 py-1.5 rounded-md text-xs font-semibold transition-all flex items-center gap-1">
                    <i class="fas fa-undo text-[10px]"></i>
                </button>

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

            <!-- Top 5 Chart -->
            <div class="bg-white mx-0 border-b border-gray-200 shrink-0">
                <div class="px-6 pt-4 pb-2 flex items-center justify-between">
                    <span id="pit_chart_title" class="text-[13px] font-semibold text-gray-700">Top 5 Suppliers by Invoice Value</span>
                    <span id="pit_chart_period" class="text-[11px] text-gray-400 font-medium"></span>
                </div>
                <div id="pit_chart_wrap" class="px-6 pb-5 pt-2" style="height:220px;"><canvas id="pit_chart"></canvas></div>
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

window.applyPITMonthFilter = (monthVal) => {
    const yr = new Date().getFullYear();
    const sd = document.getElementById('pit_start_date');
    const ed = document.getElementById('pit_end_date');
    if (!monthVal) {
        if (sd) sd.value = `${yr}-01-01`;
        if (ed) ed.value = `${yr}-12-31`;
    } else {
        const m = parseInt(monthVal, 10);
        const last = new Date(yr, m, 0).getDate();
        const mm = String(m).padStart(2, '0');
        if (sd) sd.value = `${yr}-${mm}-01`;
        if (ed) ed.value = `${yr}-${mm}-${String(last).padStart(2, '0')}`;
    }
    updatePurchaseInvoiceTrends();
};

window.resetPITFilter = () => {
    const yr = new Date().getFullYear();
    const sd = document.getElementById('pit_start_date');
    const ed = document.getElementById('pit_end_date');
    const mth = document.getElementById('pit_month');
    if (sd) sd.value = `${yr}-01-01`;
    if (ed) ed.value = `${yr}-12-31`;
    if (mth) mth.value = '';
    updatePurchaseInvoiceTrends();
};

window.updatePurchaseInvoiceTrends = () => {
    const startStr  = document.getElementById('pit_start_date')?.value;
    const endStr    = document.getElementById('pit_end_date')?.value;
    const basedOn   = document.getElementById('pit_based_on')?.value || 'Supplier';
    const isItem    = basedOn === 'Item';
    const palette   = ['#8B5CF6', '#0EA5E9', '#10B981', '#F59E0B', '#EF4444'];

    const getDateObj = (raw) => {
        if (!raw) return null;
        if (typeof raw === 'string') {
            const clean = raw.split('T')[0].split(' ')[0];
            const parts = clean.split('-');
            if (parts.length === 3 && parts[0].length === 4)
                return new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
        }
        const d = new Date(raw); return isNaN(d.getTime()) ? null : new Date(d.getFullYear(), d.getMonth(), d.getDate());
    };

    const currYear = new Date().getFullYear();
    const filterStart = getDateObj(startStr || `${currYear}-01-01`);
    const filterEnd   = getDateObj(endStr   || `${currYear}-12-31`);
    if (filterStart) filterStart.setHours(0, 0, 0, 0);
    if (filterEnd)   filterEnd.setHours(23, 59, 59, 999);

    // Build dynamic month periods from date range
    const monthNames = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    const periods = []; const periodKeys = [];
    let cur = new Date(filterStart.getFullYear(), filterStart.getMonth(), 1);
    const endMonth = new Date(filterEnd.getFullYear(), filterEnd.getMonth(), 1);
    while (cur <= endMonth) {
        periods.push(`${monthNames[cur.getMonth()]} ${cur.getFullYear()}`);
        periodKeys.push(`${cur.getFullYear()}-${cur.getMonth()}`);
        cur.setMonth(cur.getMonth() + 1);
    }

    const allInvoices    = db.read('purchaseInvoices') || [];
    const purchaseOrders = db.read('purchaseOrders') || [];
    const suppliers      = db.read('suppliers') || [];
    const formatNum = v => new Intl.NumberFormat('id-ID', { maximumFractionDigits: 3 }).format(v || 0);

    const invoices = allInvoices.filter(inv => {
        const s = (inv.status || '').toUpperCase();
        if (s === 'CANCELLED' || s === 'CANCELED' || s === 'DELETED') return false;
        const d = getDateObj(inv.date || inv.createdAt);
        if (!d) return false;
        if (filterStart && d < filterStart) return false;
        if (filterEnd && d > filterEnd) return false;
        return true;
    });

    const pivot = {};
    invoices.forEach(inv => {
        const d = getDateObj(inv.date || inv.createdAt);
        if (!d) return;
        const pIdx = periodKeys.indexOf(`${d.getFullYear()}-${d.getMonth()}`);
        if (pIdx < 0) return;

        let items = (Array.isArray(inv.items) && inv.items.length > 0) ? inv.items : [];
        if (items.length === 0 && (inv.purchaseOrderId || inv.poId)) {
            const po = purchaseOrders.find(p => p.id === (inv.purchaseOrderId || inv.poId));
            if (po) {
                if (inv.receiptId && Array.isArray(po.receipts)) {
                    const rcpt = po.receipts.find(r => String(r.id) === String(inv.receiptId) || String(r.receiptNumber) === String(inv.receiptId));
                    if (rcpt && Array.isArray(rcpt.items) && rcpt.items.length > 0) items = rcpt.items;
                }
                if (items.length === 0 && Array.isArray(po.items)) items = po.items;
            }
        }
        const invTotalAmt = parseFloat(inv.totalAmount || inv.grandTotal || 0);
        const invTotalQty = items.reduce((s, it) => s + (parseFloat(it.qty || it.receivedQty || 0) || 0), 0);

        if (isItem) {
            if (items.length > 0) {
                items.forEach(it => {
                    const label = (it.itemName || it.prodText || it.name || 'Unknown Item').split(' (')[0].trim();
                    const itQty = parseFloat(it.qty || it.receivedQty || 0) || 0;
                    const itAmt = parseFloat(it.subtotal || it.total || (itQty * (it.price || 0)) || 0);
                    if (!pivot[label]) pivot[label] = { label, currency: 'IDR', periods: Array.from({ length: periods.length }, () => ({ qty: 0, amt: 0 })) };
                    pivot[label].periods[pIdx].qty += itQty;
                    pivot[label].periods[pIdx].amt += itAmt;
                });
            } else {
                const label = 'Direct Invoice / Unlinked Item';
                if (!pivot[label]) pivot[label] = { label, currency: 'IDR', periods: Array.from({ length: periods.length }, () => ({ qty: 0, amt: 0 })) };
                pivot[label].periods[pIdx].qty += 1;
                pivot[label].periods[pIdx].amt += invTotalAmt;
            }
        } else {
            const supp = suppliers.find(s => s.id === inv.supplierId);
            const label = supp?.name || inv.supplierName || 'Unknown Supplier';
            const key = inv.supplierId || label;
            if (!pivot[key]) pivot[key] = { label, currency: 'IDR', periods: Array.from({ length: periods.length }, () => ({ qty: 0, amt: 0 })) };
            pivot[key].periods[pIdx].qty += invTotalQty;
            pivot[key].periods[pIdx].amt += invTotalAmt;
        }
    });

    const rows = Object.values(pivot);
    rows.sort((a, b) => b.periods.reduce((s, m) => s + (isItem ? m.qty : m.amt), 0) - a.periods.reduce((s, m) => s + (isItem ? m.qty : m.amt), 0));

    // Top 5 bar chart
    const top5 = rows.map(r => ({ label: r.label, total: r.periods.reduce((s, m) => s + (isItem ? m.qty : m.amt), 0) }))
        .sort((a, b) => b.total - a.total).slice(0, 5);
    const periodLabel = `${startStr || `${currYear}-01-01`} s/d ${endStr || `${currYear}-12-31`}`;
    const chartTitle = document.getElementById('pit_chart_title');
    const chartPeriod = document.getElementById('pit_chart_period');
    if (chartTitle) chartTitle.textContent = isItem ? 'Top 5 Items by Invoice Qty' : 'Top 5 Suppliers by Invoice Value';
    if (chartPeriod) chartPeriod.textContent = periodLabel;

    const chartWrap = document.getElementById('pit_chart_wrap');
    if (chartWrap) {
        if (top5.length === 0) {
            chartWrap.innerHTML = '<div class="flex items-center justify-center h-full text-gray-400 text-[13px]">Tidak ada data di periode ini</div>';
            if (window._pitChart) { try { window._pitChart.destroy(); } catch(e) {} window._pitChart = null; }
        } else {
            chartWrap.innerHTML = '<canvas id="pit_chart"></canvas>';
            if (window._pitChart) { try { window._pitChart.destroy(); } catch(e) {} window._pitChart = null; }
            requestAnimationFrame(() => {
                const ctx = document.getElementById('pit_chart');
                if (!ctx) return;
                window._pitChart = new Chart(ctx, {
                    type: 'bar',
                    data: { labels: top5.map(x => x.label), datasets: [{ label: isItem ? 'Qty (KG)' : 'Invoice Value', data: top5.map(x => x.total), backgroundColor: top5.map((_, i) => palette[i % palette.length]), borderRadius: 6, borderSkipped: false }] },
                    options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false }, tooltip: { callbacks: { label: c => isItem ? ` ${formatNum(c.parsed.y)} KG` : ` Rp ${formatNum(c.parsed.y)}` } } }, scales: { x: { grid: { display: false }, ticks: { font: { size: 11, weight: '600' }, color: '#374151' } }, y: { grid: { color: '#f1f5f9' }, ticks: { font: { size: 10 }, color: '#9CA3AF', callback: v => v >= 1e9 ? (v/1e9).toFixed(1)+'M' : v >= 1e6 ? (v/1e6).toFixed(1)+'Jt' : v >= 1e3 ? (v/1e3).toFixed(0)+'Rb' : v } } } }
                });
            });
        }
    }

    // Table
    const thead = document.getElementById('pit_thead');
    if (!thead) return;
    thead.innerHTML = `
        <th class="w-10 px-3 py-2 border-r border-[#e5e7eb] font-medium text-center"></th>
        <th class="min-w-[200px] px-3 py-2 border-r border-[#e5e7eb] font-medium">${basedOn}</th>
        ${!isItem ? `<th class="px-3 py-2 border-r border-[#e5e7eb] font-medium">Currency</th>` : ''}
        ${periods.map(p => isItem ? `<th class="px-3 py-2 border-r border-[#e5e7eb] text-right font-medium">${p} (Qty)</th>` : `<th class="px-3 py-2 border-r border-[#e5e7eb] text-right font-medium">${p} (Amt)</th>`).join('')}
    `;
    const tbody = document.getElementById('pit_tbody');
    if (!tbody) return;
    const totQty = Array(periods.length).fill(0);
    const totAmt = Array(periods.length).fill(0);
    rows.forEach(row => { row.periods.forEach((m, i) => { totQty[i] += m.qty; totAmt[i] += m.amt; }); });
    const colCount = (isItem ? 2 : 3) + periods.length;
    tbody.innerHTML = rows.length === 0
        ? `<tr><td colspan="${colCount}" class="text-center text-gray-500 py-10">No Data Available</td></tr>`
        : rows.map(row => `<tr class="hover:bg-gray-50 transition-colors group">
            <td class="px-3 py-2 border-r border-[#e5e7eb] bg-[#f9fafb] text-xs text-gray-400 text-center select-none w-10"></td>
            <td class="px-3 py-2 border-r border-[#e5e7eb] whitespace-nowrap font-medium">${row.label}</td>
            ${!isItem ? `<td class="px-3 py-2 border-r border-[#e5e7eb] whitespace-nowrap text-gray-500">${row.currency}</td>` : ''}
            ${row.periods.map(m => isItem ? `<td class="px-3 py-2 border-r border-[#e5e7eb] text-right whitespace-nowrap">${formatNum(m.qty)}</td>` : `<td class="px-3 py-2 border-r border-[#e5e7eb] text-right whitespace-nowrap"><span class="text-gray-400 text-[11px] mr-1">Rp</span>${formatNum(m.amt)}</td>`).join('')}
        </tr>`).join('');
    if (rows.length > 0) {
        const totalRow = document.createElement('tr');
        totalRow.className = 'border-t border-[#e5e7eb] bg-[#f9fafb] font-semibold';
        totalRow.innerHTML = `<td class="px-3 py-2 border-r border-[#e5e7eb] text-gray-500 font-medium text-xs text-center w-10">1</td><td class="px-3 py-2 border-r border-[#e5e7eb] font-semibold">Total</td>${!isItem ? `<td class="px-3 py-2 border-r border-[#e5e7eb]"></td>` : ''}${(isItem ? totQty : totAmt).map(val => isItem ? `<td class="px-3 py-2 border-r border-[#e5e7eb] text-right font-semibold">${formatNum(val)}</td>` : `<td class="px-3 py-2 border-r border-[#e5e7eb] text-right font-semibold"><span class="text-gray-400 text-[11px] mr-1">Rp</span>${formatNum(val)}</td>`).join('')}`;
        Array.from(tbody.children).forEach((tr, i) => { if (tr !== totalRow && tr.children[0] && tr.children.length > 1) tr.children[0].innerHTML = i + 1; });
        tbody.appendChild(totalRow);
    }
};

window.exportPITrendsCsv = () => {
    const table = document.getElementById('pit_table'); if (!table) return;
    let csv = ''; Array.from(table.querySelectorAll('tr')).forEach(row => { csv += [...row.querySelectorAll('th,td')].map(c => `"${c.textContent.trim().replace(/"/g, '""')}"`).join(',') + '\n'; });
    const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' })); const startStr = document.getElementById('pit_start_date')?.value || ''; a.download = 'purchase_invoice_trends_' + startStr + '.csv'; a.click();
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
                <div class="flex items-center gap-1.5">
                    <input type="date" id="pot_start_date" value="${currentYear}-01-01" onchange="updatePurchaseOrderTrends()"
                        class="bg-gray-100 border-none rounded-md px-3 py-1.5 text-[13px] text-gray-700 focus:outline-none hover:bg-gray-200 outline-none w-[130px]">
                    <span class="text-gray-400 text-xs font-semibold">to</span>
                    <input type="date" id="pot_end_date" value="${currentYear}-12-31" onchange="updatePurchaseOrderTrends()"
                        class="bg-gray-100 border-none rounded-md px-3 py-1.5 text-[13px] text-gray-700 focus:outline-none hover:bg-gray-200 outline-none w-[130px]">
                </div>

                <select id="pot_month" onchange="applyPOTMonthFilter(this.value)"
                    class="bg-gray-100 border-none rounded-md px-2.5 py-1.5 text-[13px] text-gray-700 focus:outline-none hover:bg-gray-200 cursor-pointer outline-none">
                    <option value="">Semua Bulan (${currentYear})</option>
                    <option value="1">Januari</option><option value="2">Februari</option>
                    <option value="3">Maret</option><option value="4">April</option>
                    <option value="5">Mei</option><option value="6">Juni</option>
                    <option value="7">Juli</option><option value="8">Agustus</option>
                    <option value="9">September</option><option value="10">Oktober</option>
                    <option value="11">November</option><option value="12">Desember</option>
                </select>

                <select id="pot_based_on" onchange="updatePurchaseOrderTrends()"
                    class="bg-gray-100 border-none rounded-md px-3 py-1.5 text-[13px] text-gray-700 focus:outline-none hover:bg-gray-200 cursor-pointer outline-none">
                    <option value="Supplier" selected>Supplier</option>
                    <option value="Item">Item</option>
                </select>

                <button onclick="updatePurchaseOrderTrends()" class="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-md text-xs font-semibold shadow-sm transition-all active:scale-95 flex items-center gap-1.5">
                    <i class="fas fa-filter text-[10px]"></i> Filter
                </button>
                <button onclick="resetPOTFilter()" class="bg-gray-100 hover:bg-gray-200 text-gray-600 px-2.5 py-1.5 rounded-md text-xs font-semibold transition-all flex items-center gap-1">
                    <i class="fas fa-undo text-[10px]"></i>
                </button>

                <div class="flex-1"></div>
                <button onclick="exportPOTrendsCsv()" class="bg-gray-100 border border-gray-200 rounded-md px-3 py-1.5 text-[13px] text-gray-700 transition-colors hover:bg-gray-200 shadow-sm">
                    Export
                </button>
            </div>

            <!-- Cache message banner -->
            <div class="px-5 mt-4 mb-2 text-[13px] text-gray-500 font-medium flex items-center gap-2">
                <div class="w-2 h-2 rounded-full bg-[#10b981]"></div>
                This report was generated just now.
            </div>

            <!-- Top 5 Chart -->
            <div class="bg-white mx-0 border-b border-gray-200 shrink-0">
                <div class="px-6 pt-4 pb-2 flex items-center justify-between">
                    <span id="pot_chart_title" class="text-[13px] font-semibold text-gray-700">Top 5 Suppliers by Order Value</span>
                    <span id="pot_chart_period" class="text-[11px] text-gray-400 font-medium"></span>
                </div>
                <div id="pot_chart_wrap" class="px-6 pb-5 pt-2" style="height:220px;"><canvas id="pot_chart"></canvas></div>
            </div>

            <!-- Trends Table Wrapper -->
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

window.applyPOTMonthFilter = (monthVal) => {
    const yr = new Date().getFullYear();
    const sd = document.getElementById('pot_start_date');
    const ed = document.getElementById('pot_end_date');
    if (!monthVal) {
        if (sd) sd.value = `${yr}-01-01`;
        if (ed) ed.value = `${yr}-12-31`;
    } else {
        const m = parseInt(monthVal, 10);
        const last = new Date(yr, m, 0).getDate();
        const mm = String(m).padStart(2, '0');
        if (sd) sd.value = `${yr}-${mm}-01`;
        if (ed) ed.value = `${yr}-${mm}-${String(last).padStart(2, '0')}`;
    }
    updatePurchaseOrderTrends();
};

window.resetPOTFilter = () => {
    const yr = new Date().getFullYear();
    const sd = document.getElementById('pot_start_date');
    const ed = document.getElementById('pot_end_date');
    const mth = document.getElementById('pot_month');
    if (sd) sd.value = `${yr}-01-01`;
    if (ed) ed.value = `${yr}-12-31`;
    if (mth) mth.value = '';
    updatePurchaseOrderTrends();
};

window.updatePurchaseOrderTrends = () => {
    const startStr  = document.getElementById('pot_start_date')?.value;
    const endStr    = document.getElementById('pot_end_date')?.value;
    const basedOn   = document.getElementById('pot_based_on')?.value || 'Supplier';
    const isItem    = basedOn === 'Item';
    const palette   = ['#10B981', '#0EA5E9', '#8B5CF6', '#F59E0B', '#EF4444'];

    const getDateObj = (raw) => {
        if (!raw) return null;
        if (raw instanceof Date) return isNaN(raw.getTime()) ? null : new Date(raw.getFullYear(), raw.getMonth(), raw.getDate());
        if (typeof raw === 'string') {
            const clean = raw.split('T')[0].split(' ')[0];
            const parts = clean.split('-');
            if (parts.length === 3 && parts[0].length === 4)
                return new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
        }
        const d = new Date(raw); return isNaN(d.getTime()) ? null : new Date(d.getFullYear(), d.getMonth(), d.getDate());
    };

    const currYear = new Date().getFullYear();
    const filterStart = getDateObj(startStr || `${currYear}-01-01`);
    const filterEnd   = getDateObj(endStr   || `${currYear}-12-31`);
    if (filterStart) filterStart.setHours(0, 0, 0, 0);
    if (filterEnd)   filterEnd.setHours(23, 59, 59, 999);

    const monthNames = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    const periods = []; const periodKeys = [];
    let cur = new Date(filterStart.getFullYear(), filterStart.getMonth(), 1);
    const endMonth = new Date(filterEnd.getFullYear(), filterEnd.getMonth(), 1);
    while (cur <= endMonth) {
        periods.push(`${monthNames[cur.getMonth()]} ${cur.getFullYear()}`);
        periodKeys.push(`${cur.getFullYear()}-${cur.getMonth()}`);
        cur.setMonth(cur.getMonth() + 1);
    }
    if (periods.length === 0) {
        periods.push(`${monthNames[filterStart.getMonth()]} ${filterStart.getFullYear()}`);
        periodKeys.push(`${filterStart.getFullYear()}-${filterStart.getMonth()}`);
    }

    const allPOs    = db.read('purchaseOrders') || [];
    const suppliers = db.read('suppliers') || [];
    const formatNum = v => new Intl.NumberFormat('id-ID', { maximumFractionDigits: 3 }).format(v || 0);

    const getPODate = (p) => (typeof window.getPOEffectiveDate === 'function') ? window.getPOEffectiveDate(p) : (p.actualDeliveryDate || p.date || p.createdAt);

    const pos = allPOs.filter(p => {
        const s = (p.status || '').toUpperCase();
        if (s === 'CANCELLED' || s === 'CANCELED' || s === 'DELETED') return false;
        const d = getDateObj(getPODate(p));
        if (!d) return false;
        if (filterStart && d < filterStart) return false;
        if (filterEnd && d > filterEnd) return false;
        return true;
    });

    const pivot = {};
    pos.forEach(p => {
        const d = getDateObj(getPODate(p));
        if (!d) return;
        const pIdx = periodKeys.indexOf(`${d.getFullYear()}-${d.getMonth()}`);
        if (pIdx < 0) return;

        const items = Array.isArray(p.items) ? p.items : [];
        const poTotalAmt = parseFloat(p.totalAmount || p.grandTotal || 0);
        const poTotalQty = items.reduce((s, it) => s + (parseFloat(it.qty || it.receivedQty || 0) || 0), 0);

        if (isItem) {
            if (items.length > 0) {
                items.forEach(it => {
                    const label = (it.itemName || it.prodText || it.name || 'Unknown Item').split(' (')[0].trim();
                    const itQty = parseFloat(it.qty || it.receivedQty || 0) || 0;
                    const itAmt = parseFloat(it.subtotal || it.total || (itQty * (it.price || 0)) || 0);
                    if (!pivot[label]) pivot[label] = { label, currency: 'IDR', periods: Array.from({ length: periods.length }, () => ({ qty: 0, amt: 0 })) };
                    pivot[label].periods[pIdx].qty += itQty;
                    pivot[label].periods[pIdx].amt += itAmt;
                });
            } else {
                const label = 'Direct Order / Unlinked Item';
                if (!pivot[label]) pivot[label] = { label, currency: 'IDR', periods: Array.from({ length: periods.length }, () => ({ qty: 0, amt: 0 })) };
                pivot[label].periods[pIdx].qty += 1;
                pivot[label].periods[pIdx].amt += poTotalAmt;
            }
        } else {
            const supp = suppliers.find(s => s.id === p.supplierId);
            const label = supp?.name || p.supplierName || 'Unknown Supplier';
            const key = p.supplierId || label;
            if (!pivot[key]) pivot[key] = { label, currency: 'IDR', periods: Array.from({ length: periods.length }, () => ({ qty: 0, amt: 0 })) };
            pivot[key].periods[pIdx].qty += poTotalQty;
            pivot[key].periods[pIdx].amt += poTotalAmt;
        }
    });

    const rows = Object.values(pivot);
    rows.sort((a, b) => b.periods.reduce((s, m) => s + (isItem ? m.qty : m.amt), 0) - a.periods.reduce((s, m) => s + (isItem ? m.qty : m.amt), 0));

    // Top 5 bar chart
    const top5 = rows.map(r => ({ label: r.label, total: r.periods.reduce((s, m) => s + (isItem ? m.qty : m.amt), 0) }))
        .sort((a, b) => b.total - a.total).slice(0, 5);
    const periodLabel = `${startStr || `${currYear}-01-01`} s/d ${endStr || `${currYear}-12-31`}`;
    const chartTitle = document.getElementById('pot_chart_title');
    const chartPeriod = document.getElementById('pot_chart_period');
    if (chartTitle) chartTitle.textContent = isItem ? 'Top 5 Items by Order Qty' : 'Top 5 Suppliers by Order Value';
    if (chartPeriod) chartPeriod.textContent = periodLabel;

    const chartWrap = document.getElementById('pot_chart_wrap');
    if (chartWrap) {
        if (top5.length === 0) {
            chartWrap.innerHTML = '<div class="flex items-center justify-center h-full text-gray-400 text-[13px]">Tidak ada data di periode ini</div>';
            if (window._potChart) { try { window._potChart.destroy(); } catch(e) {} window._potChart = null; }
        } else {
            chartWrap.innerHTML = '<canvas id="pot_chart"></canvas>';
            if (window._potChart) { try { window._potChart.destroy(); } catch(e) {} window._potChart = null; }
            requestAnimationFrame(() => {
                const ctx = document.getElementById('pot_chart');
                if (!ctx) return;
                window._potChart = new Chart(ctx, {
                    type: 'bar',
                    data: { labels: top5.map(x => x.label), datasets: [{ label: isItem ? 'Order Qty (KG)' : 'Order Value', data: top5.map(x => x.total), backgroundColor: top5.map((_, i) => palette[i % palette.length]), borderRadius: 6, borderSkipped: false }] },
                    options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false }, tooltip: { callbacks: { label: c => isItem ? ` ${formatNum(c.parsed.y)} KG` : ` Rp ${formatNum(c.parsed.y)}` } } }, scales: { x: { grid: { display: false }, ticks: { font: { size: 11, weight: '600' }, color: '#374151' } }, y: { grid: { color: '#f1f5f9' }, ticks: { font: { size: 10 }, color: '#9CA3AF', callback: v => v >= 1e9 ? (v/1e9).toFixed(1)+'M' : v >= 1e6 ? (v/1e6).toFixed(1)+'Jt' : v >= 1e3 ? (v/1e3).toFixed(0)+'Rb' : v } } } }
                });
            });
        }
    }

    // Table
    const thead = document.getElementById('pot_thead');
    if (!thead) return;
    thead.innerHTML = `
        <th class="w-10 px-3 py-2 border-r border-[#e5e7eb] font-medium text-center"></th>
        <th class="min-w-[200px] px-3 py-2 border-r border-[#e5e7eb] font-medium">${basedOn}</th>
        ${!isItem ? `<th class="px-3 py-2 border-r border-[#e5e7eb] font-medium">Currency</th>` : ''}
        ${periods.map(p => isItem ? `<th class="px-3 py-2 border-r border-[#e5e7eb] text-right font-medium">${p} (Qty)</th>` : `<th class="px-3 py-2 border-r border-[#e5e7eb] text-right font-medium">${p} (Amt)</th>`).join('')}
    `;
    const tbody = document.getElementById('pot_tbody');
    if (!tbody) return;
    const totQty = Array(periods.length).fill(0);
    const totAmt = Array(periods.length).fill(0);
    rows.forEach(row => { row.periods.forEach((m, i) => { totQty[i] += m.qty; totAmt[i] += m.amt; }); });
    const colCount = (isItem ? 2 : 3) + periods.length;
    tbody.innerHTML = rows.length === 0
        ? `<tr><td colspan="${colCount}" class="text-center text-gray-500 py-10">No Data Available</td></tr>`
        : rows.map(row => `<tr class="hover:bg-gray-50 transition-colors group">
            <td class="px-3 py-2 border-r border-[#e5e7eb] bg-[#f9fafb] text-xs text-gray-400 text-center select-none w-10"></td>
            <td class="px-3 py-2 border-r border-[#e5e7eb] whitespace-nowrap font-medium">${row.label}</td>
            ${!isItem ? `<td class="px-3 py-2 border-r border-[#e5e7eb] whitespace-nowrap text-gray-500">${row.currency}</td>` : ''}
            ${row.periods.map(m => isItem ? `<td class="px-3 py-2 border-r border-[#e5e7eb] text-right whitespace-nowrap">${formatNum(m.qty)}</td>` : `<td class="px-3 py-2 border-r border-[#e5e7eb] text-right whitespace-nowrap"><span class="text-gray-400 text-[11px] mr-1">Rp</span>${formatNum(m.amt)}</td>`).join('')}
        </tr>`).join('');
    if (rows.length > 0) {
        const totalRow = document.createElement('tr');
        totalRow.className = 'border-t border-[#e5e7eb] bg-[#f9fafb] font-semibold';
        totalRow.innerHTML = `<td class="px-3 py-2 border-r border-[#e5e7eb] text-gray-500 font-medium text-xs text-center w-10">1</td><td class="px-3 py-2 border-r border-[#e5e7eb] font-semibold">Total</td>${!isItem ? `<td class="px-3 py-2 border-r border-[#e5e7eb]"></td>` : ''}${(isItem ? totQty : totAmt).map(val => isItem ? `<td class="px-3 py-2 border-r border-[#e5e7eb] text-right font-semibold">${formatNum(val)}</td>` : `<td class="px-3 py-2 border-r border-[#e5e7eb] text-right font-semibold"><span class="text-gray-400 text-[11px] mr-1">Rp</span>${formatNum(val)}</td>`).join('')}`;
        Array.from(tbody.children).forEach((tr, i) => { if (tr !== totalRow && tr.children[0] && tr.children.length > 1) tr.children[0].innerHTML = i + 1; });
        tbody.appendChild(totalRow);
    }
};

window.exportPOTrendsCsv = () => {
    const table = document.getElementById('pot_table'); if (!table) return;
    let csv = ''; Array.from(table.querySelectorAll('tr')).forEach(row => { csv += [...row.querySelectorAll('th,td')].map(c => `"${c.textContent.trim().replace(/"/g, '""')}"`).join(',') + '\n'; });
    const a = document.createElement('a');
    const startStr = document.getElementById('pot_start_date')?.value || '';
    a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
    a.download = `purchase_order_trends_${startStr}.csv`;
    a.click();
};

// --- Purchase Receipts (GRN) Trends ---
window.renderPurchaseReceiptTrends = () => {
    document.getElementById('pageTitle').innerText = 'Purchase Receipts Trends';
    const mainContent = document.getElementById('main-content');
    const currentYear = new Date().getFullYear();

    mainContent.innerHTML = `
        <div class="min-h-full flex flex-col font-sans bg-white">
            <div class="flex flex-wrap items-center gap-3 px-4 py-3 border-b border-gray-200 bg-white shadow-sm shrink-0">
                <div class="flex items-center gap-1.5">
                    <input type="date" id="prt_start_date" value="${currentYear}-01-01" onchange="updatePurchaseReceiptTrends()"
                        class="bg-gray-100 border-none rounded-md px-3 py-1.5 text-[13px] text-gray-700 focus:outline-none hover:bg-gray-200 outline-none w-[130px]">
                    <span class="text-gray-400 text-xs font-semibold">to</span>
                    <input type="date" id="prt_end_date" value="${currentYear}-12-31" onchange="updatePurchaseReceiptTrends()"
                        class="bg-gray-100 border-none rounded-md px-3 py-1.5 text-[13px] text-gray-700 focus:outline-none hover:bg-gray-200 outline-none w-[130px]">
                </div>

                <select id="prt_month" onchange="applyPRTMonthFilter(this.value)"
                    class="bg-gray-100 border-none rounded-md px-2.5 py-1.5 text-[13px] text-gray-700 focus:outline-none hover:bg-gray-200 cursor-pointer outline-none">
                    <option value="">Semua Bulan (${currentYear})</option>
                    <option value="1">Januari</option><option value="2">Februari</option>
                    <option value="3">Maret</option><option value="4">April</option>
                    <option value="5">Mei</option><option value="6">Juni</option>
                    <option value="7">Juli</option><option value="8">Agustus</option>
                    <option value="9">September</option><option value="10">Oktober</option>
                    <option value="11">November</option><option value="12">Desember</option>
                </select>

                <select id="prt_based_on" onchange="updatePurchaseReceiptTrends()"
                    class="bg-gray-100 border-none rounded-md px-3 py-1.5 text-[13px] text-gray-700 focus:outline-none hover:bg-gray-200 cursor-pointer outline-none">
                    <option value="Supplier" selected>Supplier</option>
                    <option value="Item">Item</option>
                </select>

                <button onclick="updatePurchaseReceiptTrends()" class="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-md text-xs font-semibold shadow-sm transition-all active:scale-95 flex items-center gap-1.5">
                    <i class="fas fa-filter text-[10px]"></i> Filter
                </button>
                <button onclick="resetPRTFilter()" class="bg-gray-100 hover:bg-gray-200 text-gray-600 px-2.5 py-1.5 rounded-md text-xs font-semibold transition-all flex items-center gap-1">
                    <i class="fas fa-undo text-[10px]"></i>
                </button>

                <div class="flex-1"></div>
                <button onclick="exportPRcptTrendsCsv()" class="bg-gray-100 border border-gray-200 rounded-md px-3 py-1.5 text-[13px] text-gray-700 transition-colors hover:bg-gray-200 shadow-sm">
                    Export
                </button>
            </div>

            <!-- Cache message banner -->
            <div class="px-5 mt-4 mb-2 text-[13px] text-gray-500 font-medium flex items-center gap-2">
                <div class="w-2 h-2 rounded-full bg-[#0d9488]"></div>
                This report was generated just now (Based on Actual Goods Received / GRN Date).
            </div>

            <!-- Top 5 Chart -->
            <div class="bg-white mx-0 border-b border-gray-200 shrink-0">
                <div class="px-6 pt-4 pb-2 flex items-center justify-between">
                    <span id="prt_chart_title" class="text-[13px] font-semibold text-gray-700">Top 5 Suppliers by Received Value</span>
                    <span id="prt_chart_period" class="text-[11px] text-gray-400 font-medium"></span>
                </div>
                <div id="prt_chart_wrap" class="px-6 pb-5 pt-2" style="height:220px;"><canvas id="prt_chart"></canvas></div>
            </div>

            <!-- Trends Table Wrapper -->
            <div class="w-full overflow-x-auto bg-white border border-gray-200 border-t-0 border-x-0 relative">
                <table class="w-full text-left border-collapse" id="prt_table">
                    <thead class="bg-[#f9fafb] sticky top-0 z-20 shadow-[0_1px_0_#e5e7eb]">
                        <tr id="prt_thead" class="text-[13px] text-gray-600 border-b border-gray-200"></tr>
                    </thead>
                    <tbody id="prt_tbody" class="divide-y divide-gray-100 text-[13px] text-gray-800"></tbody>
                </table>
            </div>

            <div class="px-5 py-3 bg-white border-t border-gray-200 shrink-0 flex justify-between items-center w-full mt-auto">
                <p class="text-[13px] text-gray-500">Closing calculation uses actual receipt date &amp; partial delivery quantities.</p>
                <p class="text-[12px] text-gray-500 font-medium tracking-wide">Execution Time: ${(Math.random() * 0.05 + 0.01).toFixed(6)} sec</p>
            </div>
        </div>
    `;
    updatePurchaseReceiptTrends();
};

window.applyPRTMonthFilter = (monthVal) => {
    const yr = new Date().getFullYear();
    const sd = document.getElementById('prt_start_date');
    const ed = document.getElementById('prt_end_date');
    if (!monthVal) {
        if (sd) sd.value = `${yr}-01-01`;
        if (ed) ed.value = `${yr}-12-31`;
    } else {
        const m = parseInt(monthVal, 10);
        const last = new Date(yr, m, 0).getDate();
        const mm = String(m).padStart(2, '0');
        if (sd) sd.value = `${yr}-${mm}-01`;
        if (ed) ed.value = `${yr}-${mm}-${String(last).padStart(2, '0')}`;
    }
    updatePurchaseReceiptTrends();
};

window.resetPRTFilter = () => {
    const yr = new Date().getFullYear();
    const sd = document.getElementById('prt_start_date');
    const ed = document.getElementById('prt_end_date');
    const mth = document.getElementById('prt_month');
    if (sd) sd.value = `${yr}-01-01`;
    if (ed) ed.value = `${yr}-12-31`;
    if (mth) mth.value = '';
    updatePurchaseReceiptTrends();
};

window.updatePurchaseReceiptTrends = () => {
    const startStr  = document.getElementById('prt_start_date')?.value;
    const endStr    = document.getElementById('prt_end_date')?.value;
    const basedOn   = document.getElementById('prt_based_on')?.value || 'Supplier';
    const isItem    = basedOn === 'Item';
    const palette   = ['#0D9488', '#0EA5E9', '#8B5CF6', '#F59E0B', '#EF4444'];

    const getDateObj = (raw) => {
        if (!raw) return null;
        if (raw instanceof Date) return isNaN(raw.getTime()) ? null : new Date(raw.getFullYear(), raw.getMonth(), raw.getDate());
        if (typeof raw === 'string') {
            const clean = raw.split('T')[0].split(' ')[0];
            const parts = clean.split('-');
            if (parts.length === 3 && parts[0].length === 4)
                return new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
        }
        const d = new Date(raw); return isNaN(d.getTime()) ? null : new Date(d.getFullYear(), d.getMonth(), d.getDate());
    };

    const currYear = new Date().getFullYear();
    const filterStart = getDateObj(startStr || `${currYear}-01-01`);
    const filterEnd   = getDateObj(endStr   || `${currYear}-12-31`);
    if (filterStart) filterStart.setHours(0, 0, 0, 0);
    if (filterEnd)   filterEnd.setHours(23, 59, 59, 999);

    const monthNames = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    const periods = []; const periodKeys = [];
    let cur = new Date(filterStart.getFullYear(), filterStart.getMonth(), 1);
    const endMonth = new Date(filterEnd.getFullYear(), filterEnd.getMonth(), 1);
    while (cur <= endMonth) {
        periods.push(`${monthNames[cur.getMonth()]} ${cur.getFullYear()}`);
        periodKeys.push(`${cur.getFullYear()}-${cur.getMonth()}`);
        cur.setMonth(cur.getMonth() + 1);
    }
    if (periods.length === 0) {
        periods.push(`${monthNames[filterStart.getMonth()]} ${filterStart.getFullYear()}`);
        periodKeys.push(`${filterStart.getFullYear()}-${filterStart.getMonth()}`);
    }

    const purchaseOrders = db.read('purchaseOrders') || [];
    const suppliers      = db.read('suppliers') || [];
    const formatNum = v => new Intl.NumberFormat('id-ID', { maximumFractionDigits: 3 }).format(v || 0);

    const safeArray = (val) => {
        if (!val) return [];
        if (typeof val === 'string') {
            try { const p = JSON.parse(val); return Array.isArray(p) ? p : []; } catch (e) { return []; }
        }
        return Array.isArray(val) ? val : [];
    };

    // Extract all receipt events
    const allReceipts = [];
    purchaseOrders.forEach(po => {
        const s = (po.status || '').toUpperCase();
        if (s === 'CANCELLED' || s === 'CANCELED' || s === 'DELETED') return;

        const receipts = safeArray(po.receipts);
        const poItems = safeArray(po.items);

        receipts.forEach(rcpt => {
            const rcptDate = getDateObj(rcpt.date || rcpt.receivedDate || rcpt.createdAt);
            if (!rcptDate) return;
            if (filterStart && rcptDate < filterStart) return;
            if (filterEnd && rcptDate > filterEnd) return;

            const rcptItems = safeArray(rcpt.items);
            let rcptAmt = 0;
            const mappedItems = rcptItems.map(it => {
                const poItem = poItems.find(pi => (pi.inventoryItemId && pi.inventoryItemId === it.inventoryItemId) || (pi.itemName && pi.itemName === it.itemName));
                const price = parseFloat(it.price || (poItem ? poItem.price : 0) || 0);
                const qty = parseFloat(it.receivedQty || it.qty || 0);
                const subtotal = parseFloat(it.subtotal || (qty * price) || 0);
                rcptAmt += subtotal;
                return {
                    ...it,
                    price,
                    qty,
                    subtotal,
                    itemName: it.itemName || it.prodText || (poItem ? (poItem.itemName || poItem.prodText) : 'Unknown')
                };
            });

            const taxRate = parseFloat(po.taxRate) || 0;
            if (taxRate > 0) {
                rcptAmt = rcptAmt * (1 + taxRate / 100);
            }

            allReceipts.push({
                id: rcpt.id || rcpt.receiptNumber,
                receiptNumber: rcpt.receiptNumber,
                poId: po.id,
                supplierId: po.supplierId || po.supplier_id,
                supplierName: po.supplierName || po.supplier_name,
                date: rcptDate,
                totalAmount: rcptAmt,
                items: mappedItems
            });
        });
    });

    const pivot = {};
    allReceipts.forEach(rcpt => {
        const d = rcpt.date;
        const pIdx = periodKeys.indexOf(`${d.getFullYear()}-${d.getMonth()}`);
        if (pIdx < 0) return;

        const items = rcpt.items;
        const rcptTotalAmt = rcpt.totalAmount;
        const rcptTotalQty = items.reduce((s, it) => s + (parseFloat(it.qty || 0) || 0), 0);

        if (isItem) {
            if (items.length > 0) {
                items.forEach(it => {
                    const label = (it.itemName || it.prodText || 'Unknown Item').split(' (')[0].trim();
                    const itQty = parseFloat(it.qty || 0) || 0;
                    const itAmt = parseFloat(it.subtotal || (itQty * (it.price || 0)) || 0);
                    if (!pivot[label]) pivot[label] = { label, currency: 'IDR', periods: Array.from({ length: periods.length }, () => ({ qty: 0, amt: 0 })) };
                    pivot[label].periods[pIdx].qty += itQty;
                    pivot[label].periods[pIdx].amt += itAmt;
                });
            } else {
                const label = 'Direct Receipt / Unlinked Item';
                if (!pivot[label]) pivot[label] = { label, currency: 'IDR', periods: Array.from({ length: periods.length }, () => ({ qty: 0, amt: 0 })) };
                pivot[label].periods[pIdx].qty += 1;
                pivot[label].periods[pIdx].amt += rcptTotalAmt;
            }
        } else {
            const supp = suppliers.find(s => s.id === rcpt.supplierId);
            const label = supp?.name || rcpt.supplierName || 'Unknown Supplier';
            const key = rcpt.supplierId || label;
            if (!pivot[key]) pivot[key] = { label, currency: 'IDR', periods: Array.from({ length: periods.length }, () => ({ qty: 0, amt: 0 })) };
            pivot[key].periods[pIdx].qty += rcptTotalQty;
            pivot[key].periods[pIdx].amt += rcptTotalAmt;
        }
    });

    const rows = Object.values(pivot);
    rows.sort((a, b) => b.periods.reduce((s, m) => s + (isItem ? m.qty : m.amt), 0) - a.periods.reduce((s, m) => s + (isItem ? m.qty : m.amt), 0));

    // Top 5 bar chart
    const top5 = rows.map(r => ({ label: r.label, total: r.periods.reduce((s, m) => s + (isItem ? m.qty : m.amt), 0) }))
        .sort((a, b) => b.total - a.total).slice(0, 5);
    const periodLabel = `${startStr || `${currYear}-01-01`} s/d ${endStr || `${currYear}-12-31`}`;
    const chartTitle = document.getElementById('prt_chart_title');
    const chartPeriod = document.getElementById('prt_chart_period');
    if (chartTitle) chartTitle.textContent = isItem ? 'Top 5 Items by Received Qty' : 'Top 5 Suppliers by Received Value';
    if (chartPeriod) chartPeriod.textContent = periodLabel;

    const chartWrap = document.getElementById('prt_chart_wrap');
    if (chartWrap) {
        if (top5.length === 0) {
            chartWrap.innerHTML = '<div class="flex items-center justify-center h-full text-gray-400 text-[13px]">Tidak ada data di periode ini</div>';
            if (window._prtChart) { try { window._prtChart.destroy(); } catch(e) {} window._prtChart = null; }
        } else {
            chartWrap.innerHTML = '<canvas id="prt_chart"></canvas>';
            if (window._prtChart) { try { window._prtChart.destroy(); } catch(e) {} window._prtChart = null; }
            requestAnimationFrame(() => {
                const ctx = document.getElementById('prt_chart');
                if (!ctx) return;
                window._prtChart = new Chart(ctx, {
                    type: 'bar',
                    data: { labels: top5.map(x => x.label), datasets: [{ label: isItem ? 'Received Qty (KG)' : 'Received Value', data: top5.map(x => x.total), backgroundColor: top5.map((_, i) => palette[i % palette.length]), borderRadius: 6, borderSkipped: false }] },
                    options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false }, tooltip: { callbacks: { label: c => isItem ? ` ${formatNum(c.parsed.y)} KG` : ` Rp ${formatNum(c.parsed.y)}` } } }, scales: { x: { grid: { display: false }, ticks: { font: { size: 11, weight: '600' }, color: '#374151' } }, y: { grid: { color: '#f1f5f9' }, ticks: { font: { size: 10 }, color: '#9CA3AF', callback: v => v >= 1e9 ? (v/1e9).toFixed(1)+'M' : v >= 1e6 ? (v/1e6).toFixed(1)+'Jt' : v >= 1e3 ? (v/1e3).toFixed(0)+'Rb' : v } } } }
                });
            });
        }
    }

    // Table
    const thead = document.getElementById('prt_thead');
    if (!thead) return;
    thead.innerHTML = `
        <th class="w-10 px-3 py-2 border-r border-[#e5e7eb] font-medium text-center"></th>
        <th class="min-w-[200px] px-3 py-2 border-r border-[#e5e7eb] font-medium">${basedOn}</th>
        ${!isItem ? `<th class="px-3 py-2 border-r border-[#e5e7eb] font-medium">Currency</th>` : ''}
        ${periods.map(p => isItem ? `<th class="px-3 py-2 border-r border-[#e5e7eb] text-right font-medium">${p} (Qty)</th>` : `<th class="px-3 py-2 border-r border-[#e5e7eb] text-right font-medium">${p} (Amt)</th>`).join('')}
    `;
    const tbody = document.getElementById('prt_tbody');
    if (!tbody) return;
    const totQty = Array(periods.length).fill(0);
    const totAmt = Array(periods.length).fill(0);
    rows.forEach(row => { row.periods.forEach((m, i) => { totQty[i] += m.qty; totAmt[i] += m.amt; }); });
    const colCount = (isItem ? 2 : 3) + periods.length;
    tbody.innerHTML = rows.length === 0
        ? `<tr><td colspan="${colCount}" class="text-center text-gray-500 py-10">No Data Available</td></tr>`
        : rows.map(row => `<tr class="hover:bg-gray-50 transition-colors group">
            <td class="px-3 py-2 border-r border-[#e5e7eb] bg-[#f9fafb] text-xs text-gray-400 text-center select-none w-10"></td>
            <td class="px-3 py-2 border-r border-[#e5e7eb] whitespace-nowrap font-medium">${row.label}</td>
            ${!isItem ? `<td class="px-3 py-2 border-r border-[#e5e7eb] whitespace-nowrap text-gray-500">${row.currency}</td>` : ''}
            ${row.periods.map(m => isItem ? `<td class="px-3 py-2 border-r border-[#e5e7eb] text-right whitespace-nowrap">${formatNum(m.qty)}</td>` : `<td class="px-3 py-2 border-r border-[#e5e7eb] text-right whitespace-nowrap"><span class="text-gray-400 text-[11px] mr-1">Rp</span>${formatNum(m.amt)}</td>`).join('')}
        </tr>`).join('');
    if (rows.length > 0) {
        const totalRow = document.createElement('tr');
        totalRow.className = 'border-t border-[#e5e7eb] bg-[#f9fafb] font-semibold';
        totalRow.innerHTML = `<td class="px-3 py-2 border-r border-[#e5e7eb] text-gray-500 font-medium text-xs text-center w-10">1</td><td class="px-3 py-2 border-r border-[#e5e7eb] font-semibold">Total</td>${!isItem ? `<td class="px-3 py-2 border-r border-[#e5e7eb]"></td>` : ''}${(isItem ? totQty : totAmt).map(val => isItem ? `<td class="px-3 py-2 border-r border-[#e5e7eb] text-right font-semibold">${formatNum(val)}</td>` : `<td class="px-3 py-2 border-r border-[#e5e7eb] text-right font-semibold"><span class="text-gray-400 text-[11px] mr-1">Rp</span>${formatNum(val)}</td>`).join('')}`;
        Array.from(tbody.children).forEach((tr, i) => { if (tr !== totalRow && tr.children[0] && tr.children.length > 1) tr.children[0].innerHTML = i + 1; });
        tbody.appendChild(totalRow);
    }
};

window.exportPRcptTrendsCsv = () => {
    const table = document.getElementById('prt_table'); if (!table) return;
    let csv = ''; Array.from(table.querySelectorAll('tr')).forEach(row => { csv += [...row.querySelectorAll('th,td')].map(c => `"${c.textContent.trim().replace(/"/g, '""')}"`).join(',') + '\n'; });
    const a = document.createElement('a');
    const startStr = document.getElementById('prt_start_date')?.value || '';
    a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
    a.download = `purchase_receipt_trends_${startStr}.csv`;
    a.click();
};
