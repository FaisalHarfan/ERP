const DB_PREFIX = 'unityerp_';
const _dbCache = {}; // In-memory cache for fast synchronous reading

const db = {
    // New: Sync a table from PostgreSQL to memory cache
    sync: async (table) => {
        try {
            if (!window.api) return [];
            console.log(`[DB] Syncing table: ${table}...`);
            const data = await window.api.read(table);
            if (!Array.isArray(data)) {
                console.warn(`[DB] Data for ${table} is not an array:`, data);
                _dbCache[table] = [];
            } else {
                _dbCache[table] = data;
                console.log(`[DB] Synced ${data.length} records for ${table}.`);
            }
            return _dbCache[table];
        } catch (e) {
            console.error(`[DB] Failed to sync table ${table}:`, e);
            showToast(`Gagal sinkronisasi data ${table}`, 'error');
            return _dbCache[table] || [];
        }
    },

    read: (table) => {
        // Now reads from memory cache which is synced from PostgreSQL
        return _dbCache[table] ? [..._dbCache[table]] : [];
    },

    save: (table, data) => {
        // Helper to manually set cache (used in migrations/seeds)
        _dbCache[table] = Array.isArray(data) ? [...data] : [data];
        return _dbCache[table];
    },

    insert: async (table, record) => {
        if (!window.api) {
            console.error('[DB] API not initialized');
            return null;
        }
        try {
            console.log(`[DB] Inserting record into ${table}:`, record);
            const result = await window.api.insert(table, record);
            if (result) {
                if (!_dbCache[table]) _dbCache[table] = [];
                _dbCache[table].push(result);
                console.log(`[DB] Successfully inserted into ${table}. ID: ${result.id}`);
                return result;
            } else {
                console.error(`[DB] Insert into ${table} returned null result.`);
                return null;
            }
        } catch (err) {
            console.error(`[DB] Insert into ${table} threw error:`, err);
            return null;
        }
    },

    update: async (table, id, updates) => {
        if (!window.api) return null;
        const result = await window.api.update(table, id, updates);
        // Update local cache - merge updates into existing record to prevent data loss
        if (_dbCache[table]) {
            const idx = _dbCache[table].findIndex(item => item.id === id);
            if (idx > -1) {
                // If result is the full object, use it. Otherwise, merge updates into cache.
                const updatedRecord = (result && typeof result === 'object' && result.id) ? result : { ..._dbCache[table][idx], ...updates };
                _dbCache[table][idx] = updatedRecord;
                return updatedRecord;
            }
        }
        return result;
    },

    delete: async (table, id) => {
        if (!window.api) return null;
        await window.api.delete(table, id);
        // Update local cache
        if (_dbCache[table]) {
            _dbCache[table] = _dbCache[table].filter(item => item.id !== id);
        }
    },

    findById: (table, id) => {
        const data = db.read(table);
        // Support both camelCase (id, itemId) and snake_case (item_id)
        return data.find(item => 
            item.id == id || 
            item.itemId == id || 
            item.item_id == id ||
            item.productId == id ||
            item.product_id == id
        ) || null;
    },

    getTables: () => {
        return ['units', 'products', 'warehouses', 'suppliers', 'customers',
            'purchaseRequests', 'purchaseOrders', 'purchaseInvoices', 'supplierPayments',
            'salesQuotations', 'purchaseRFQs', 'salesOrders', 'salesInvoices', 'payments',
            'boms', 'productionOrders', 'stockMovements',
            'inventoryItems', 'stockTransactions', 'notifications',
            'machines', 'bomHeaders', 'bomMaterials', 'manufacturingOrders', 'dailyProductionLogs', 'productionLineBatches',
            'accounts', 'expenses', 'journalEntries', 'bankAccounts', 'departments', 'creditNotes', 'debitNotes',
            'salesReturns', 'productExchanges', 'deliveryOrders', 'inventoryJudgments', 'inventoryConversions', 'packBreakdowns',
            'accountTypes'];
        // users, roles, systemLogs dikecualikan — BLOCKED di generic CRUD, pakai /api/settings
    },

    uuid: () => {
        return Date.now().toString() + Math.random().toString(36).substr(2, 5);
    },

    init: async () => {
        console.log("🚀 UnityERP: Database layer initialized (API Mode)");
        // users dan roles tidak di-sync via generic CRUD (BLOCKED)
        // permissions dibaca dari session yang di-verify oleh /api/auth/verify
    },


    logSystemActivity: (action, details = '') => {
        const sess = JSON.parse(localStorage.getItem('unityerp_session') || '{}');
        return db.insert('systemLogs', {
            userId: sess.userId || 'system',
            userEmail: sess.email || 'system',
            action,
            details,
            timestamp: new Date().toISOString()
        });
    },

    // --- Business Logic Functions ---

    // Calculate current stock for a product
    // Direction: IN adds to stock, OUT subtracts from stock
    getCurrentStock: (productId) => {
        const movements = db.read('stockMovements').filter(m => m.productId === productId);
        return movements.reduce((total, move) => {
            const qty = parseFloat(move.qty) || 0;
            return move.type === 'IN' ? total + qty : total - qty;
        }, 0);
    },

    // Legacy stock movement (kept for backward compatibility, but redirects to Inventory if possible)
    addStockMovement: (productId, type, qty, referenceType, referenceId, notes = '') => {
        // Try to find if this productId exists in inventoryItems
        const invItem = db.read('inventoryItems').find(i => i.productId === productId || i.id === productId);
        if (invItem) {
            return db.addInventoryTransaction(invItem.id, type, qty, referenceType, referenceId, notes);
        }
        // Fallback to old table if not in inventory master
        return db.insert('stockMovements', {
            date: new Date().toISOString(),
            productId,
            type, // 'IN' or 'OUT'
            qty: parseFloat(qty),
            referenceType, // 'PURCHASE', 'SALES', 'PRODUCTION_IN', 'PRODUCTION_OUT'
            referenceId,
            notes,
            createdBy: 'Admin'
        });
    },

    // Validation: Check if we have enough stock before Sales or Production
    validateStockSufficiency: (productId, requestedQty) => {
        const current = db.getCurrentStock(productId);
        return current >= parseFloat(requestedQty);
    },

    // Clear entire DB (for hard reset)
    resetAll: () => {
        db.getTables().forEach(table => {
            localStorage.removeItem(DB_PREFIX + table);
        });
        db.init();
    },

    // ─── INVENTORY HELPERS ───────────────────────────────────── 

    // Auto-generate Item Code by category prefix 
    generateItemCode: (category) => {
        const prefixes = {
            RAW_MATERIAL: 'RM',
            FINISHED_GOODS: 'FG',
            SPAREPART: 'SP',
            PACKAGING: 'PK',
            SERVICE: 'SV',
            GAS: 'GAS',
            ASSET: 'AKT',
            SUPPLIES: 'SUP',
            OVEN_BASAH_STOCK: 'OB',
            OVEN_KERING_STOCK: 'OK',
            BULK_STOCK: 'BK',
            WIP: 'WIP'
        };
        
        const prefix = prefixes[category] || 'ITM';
        const existing = db.read('inventoryItems').filter(i => i.itemCode && i.itemCode.startsWith(`${prefix}-`));
        
        let maxSeq = 0;
        existing.forEach(item => {
            const parts = item.itemCode.split('-');
            if (parts.length >= 2) {
                const seq = parseInt(parts[1]);
                if (!isNaN(seq) && seq > maxSeq) maxSeq = seq;
            }
        });

        const next = (maxSeq + 1).toString().padStart(4, '0');
        let finalCode = `${prefix}-${next}`;
        
        // Safety check
        while (db.read('inventoryItems').some(i => i.itemCode === finalCode)) {
            maxSeq++;
            finalCode = `${prefix}-${(maxSeq + 1).toString().padStart(4, '0')}`;
        }
        
        return finalCode;
    },

    // Auto-generate Transaction Number
    generateTxNo: (type) => {
        const prefix = type === 'IN' ? 'SI' : 'SO';
        const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
        const transactions = db.read('stockTransactions');
        const searchPrefix = `${prefix}-${dateStr}-`;
        
        let maxSeq = 0;
        transactions.forEach(t => {
            if (t.txNo && t.txNo.startsWith(searchPrefix)) {
                const parts = t.txNo.split('-');
                if (parts.length >= 3) {
                    const seq = parseInt(parts[2]);
                    if (!isNaN(seq) && seq > maxSeq) maxSeq = seq;
                }
            }
        });

        const nextSeq = maxSeq + 1;
        let finalNo = `${prefix}-${dateStr}-${nextSeq.toString().padStart(3, '0')}`;
        
        while (transactions.some(t => t.txNo === finalNo)) {
            maxSeq++;
            finalNo = `${prefix}-${dateStr}-${(maxSeq + 1).toString().padStart(3, '0')}`;
        }
        
        return finalNo;
    },

    // Get current inventory stock for an inventoryItem at a specific location
    getInventoryStock: (itemId, location = null) => {
        const item = db.findById('inventoryItems', itemId);
        const txs = db.read('stockTransactions').filter(t => {
            if (t.itemId !== itemId) return false;
            
            let tLoc = t.location;
            if (tLoc === 'WHS' || !tLoc) {
                if (item && item.category === 'OVEN_BASAH_STOCK') tLoc = 'OVEN_BASAH';
                else if (item && item.category === 'OVEN_KERING_STOCK') tLoc = 'OVEN_KERING';
                else tLoc = 'WHS';
            }

            if (location && tLoc !== location) return false;
            return true;
        });
        return txs.reduce((total, t) => {
            const qty = parseFloat(t.qty) || 0;
            const type = (t.type || '').toUpperCase();
            if (['IN', 'ADJUST_IN', 'PRODUCTION_IN', 'RETURN_IN'].includes(type)) return total + qty;
            if (['OUT', 'SHRINKAGE', 'ADJUST_OUT', 'PRODUCTION_OUT', 'SALES_OUT', 'WASTE'].includes(type)) return total - qty;
            
            // Fallback for generic types
            if (type === 'IN') return total + qty;
            if (type === 'OUT' || type === 'SHRINKAGE') return total - qty;
            return total;
        }, 0);
    },

    addInventoryTransaction: (itemId, type, qty, reference, referenceId, notes, createdBy = 'Admin', location = null) => {
        const item = db.findById('inventoryItems', itemId);
        if (!item) return null;
        const txNo = db.generateTxNo(type);

        let finalLoc = location;
        if (!finalLoc || finalLoc === 'WHS') {
            if (item.category === 'OVEN_BASAH_STOCK') finalLoc = 'OVEN_BASAH';
            else if (item.category === 'OVEN_KERING_STOCK') finalLoc = 'OVEN_KERING';
            else finalLoc = 'WHS';
        }

        const tx = db.insert('stockTransactions', {
            txNo,
            date: new Date().toISOString(),
            itemId,
            itemCode: item.itemCode,
            itemName: item.itemName,
            type,
            qty: parseFloat(qty),
            reference,      // 'PO', 'SO', 'PRODUCTION_IN', 'PRODUCTION_OUT', 'MANUAL', 'SALES_OUT', 'STAGE_TRANSFER'
            referenceId,
            notes,
            createdBy,
            location: finalLoc        // 'WHS', 'OVEN_BASAH', 'OVEN_KERING'
        });

        return tx;
    },

    // Validate stock is sufficient for OUT transaction
    validateInventoryStock: (itemId, requestedQty) => {
        return db.getInventoryStock(itemId) >= parseFloat(requestedQty);
    },

    // ─── PRODUCTION HELPERS ────────────────────────────────────

    generateMachineCode: () => {
        const machines = db.read('machines') || [];
        let maxSeq = 0;
        machines.forEach(m => {
            if (m.code && m.code.startsWith('MCH-')) {
                const seq = parseInt(m.code.split('-')[1]);
                if (!isNaN(seq) && seq > maxSeq) maxSeq = seq;
            }
        });
        
        const next = (maxSeq + 1).toString().padStart(3, '0');
        let finalCode = `MCH-${next}`;
        
        while (machines.some(m => m.code === finalCode)) {
            maxSeq++;
            finalCode = `MCH-${(maxSeq + 1).toString().padStart(3, '0')}`;
        }
        
        return finalCode;
    },

    generateMONumber: (dateStr) => {
        if (!dateStr) dateStr = new Date().toISOString().split('T')[0];
        const inputDate = new Date(dateStr);
        const month = String(inputDate.getMonth() + 1).padStart(2, '0');
        const year = inputDate.getFullYear();
        const monthYearStr = `${month}${year}`;
        
        const orders = db.read('productionOrders') || [];
        
        // Find the max sequence number for this specific month/year (changed from daily to monthly reset)
        let maxSeq = 0;
        orders.forEach(o => {
            if (!o.moNumber || !o.moNumber.startsWith('MO-')) return;
            
            // Parse date from MO to check if same month/year
            const moDate = new Date(o.date || o.createdAt);
            const moMonth = String(moDate.getMonth() + 1).padStart(2, '0');
            const moYear = moDate.getFullYear();
            const moMonthYearStr = `${moMonth}${moYear}`;
            
            // Only count sequence from same month/year
            if (moMonthYearStr === monthYearStr) {
                const parts = o.moNumber.split('-');
                if (parts.length >= 3) {
                    const seq = parseInt(parts[2]);
                    if (!isNaN(seq) && seq > maxSeq) maxSeq = seq;
                }
            }
        });

        const nextSeq = maxSeq + 1;
        const pureDate = dateStr.replace(/-/g, ''); // YYYYMMDD for display format
        let finalNo = `MO-${pureDate}-${nextSeq.toString().padStart(3, '0')}`;
        
        while (orders.some(o => o.moNumber === finalNo)) {
            maxSeq++;
            finalNo = `MO-${pureDate}-${(maxSeq + 1).toString().padStart(3, '0')}`;
        }
        
        return finalNo;
    },

    generateBOMCode: () => {
        const existing = db.read('bomHeaders') || [];
        let maxSeq = 0;
        existing.forEach(b => {
            if (b.bomCode && b.bomCode.startsWith('BOM-')) {
                const seq = parseInt(b.bomCode.split('-')[1]);
                if (!isNaN(seq) && seq > maxSeq) maxSeq = seq;
            }
        });
        
        const next = (maxSeq + 1).toString().padStart(4, '0');
        let finalCode = `BOM-${next}`;
        
        while (existing.some(b => b.bomCode === finalCode)) {
            maxSeq++;
            finalCode = `BOM-${(maxSeq + 1).toString().padStart(4, '0')}`;
        }
        
        return finalCode;
    },

    // Sum qty produced from all daily logs for a given MO
    getMOQtyProduced: (moId) => {
        const logs = db.read('dailyProductionLogs').filter(l => l.moId === moId);
        return logs.reduce((sum, l) => sum + (parseFloat(l.qtyProduced) || 0), 0);
    },

    // Sum qty produced today on a machine to check capacity
    getMachineCapacityUsed: (machineId, date) => {
        const dateStr = date ? date.split('T')[0] : new Date().toISOString().split('T')[0];
        const logs = db.read('dailyProductionLogs').filter(l => l.machineId === machineId && l.date === dateStr);
        return logs.reduce((sum, l) => sum + (parseFloat(l.qtyProduced) || 0), 0);
    },

    // ─── PRODUCTION LINE (STREAMLINED) HELPERS ────────────────
    ensureWIPItem: (productId, stageLabel, autoCreate = false) => {
        const items = db.read('inventoryItems') || [];

        const product = db.findById('inventoryItems', productId);
        if (!product) return null;

        // If stageLabel is Finish Good, we return the Product ID directly
        const labelLower = (stageLabel || '').toLowerCase();
        if (labelLower.includes('finish good')) {
            return product.id;
        }

        // Determine target category
        let category = 'WIP';
        if (labelLower.includes('oven basah') || labelLower.includes('ekstrusi') || labelLower.includes('extrusi')) category = 'OVEN_BASAH_STOCK';
        if (labelLower.includes('oven kering')) category = 'OVEN_KERING_STOCK';

        // 0. If product itself is already in this category, return it
        if (product.category === category) {
            return product.id;
        }

        // 0b. Check BOM for specified WIP input item
        const boms = db.read('boms') || db.read('bomHeaders') || [];
        const productBom = boms.find(b => b.productId === productId || b.product_id === productId || b.id === product.bomId);
        if (productBom) {
            const bomItems = productBom.items || productBom.components || [];
            const bomWip = bomItems.find(bi => {
                const bItemId = bi.itemId || bi.inventoryItemId || bi.item_id || bi.id;
                const bItem = items.find(it => it.id === bItemId);
                return bItem && bItem.category === category;
            });
            if (bomWip) {
                const matchedId = bomWip.itemId || bomWip.inventoryItemId || bomWip.item_id || bomWip.id;
                if (matchedId) return matchedId;
            }
        }

        // Target Name & Sanitization (keep exact dimensions/specs, only strip existing stage tags)
        const baseName = (product.itemName || product.item_name || '').replace(/\s*\([^)]+\)/g, '').trim();
        const targetName = `${baseName} (${stageLabel})`;

        // 1. EXACT BASE NAME MATCH (Preserving dimensions like 5.5 cm, 7 cm, etc.)
        const existingByName = items.find(i => {
            if (i.category !== category) return false;
            const iName = (i.itemName || i.item_name || '').toLowerCase().trim();
            const tName = targetName.toLowerCase().trim();
            const altName = `${baseName.toLowerCase()} (${labelLower})`;
            const cleanIName = iName.replace(/\s*\([^)]+\)/g, '').trim();
            const cleanBase = baseName.toLowerCase();
            return iName === tName || iName === altName || cleanIName === cleanBase;
        });
        if (existingByName) return existingByName.id;

        // 2. SEARCH BY AUTO-GEN CODE (Old logic fallback)
        const wipCode = `${product.itemCode || ''}-WIP-${stageLabel.toUpperCase().replace(/\s+/g, '')}`;
        const existingByCode = items.find(i => i.itemCode && i.itemCode === wipCode);
        if (existingByCode) return existingByCode.id;

        // 3. Auto-create if requested
        if (autoCreate) {
            const newItem = db.insert('inventoryItems', {
                itemCode: db.generateItemCode(category),
                itemName: targetName,
                category,
                unit: product.unit || 'Kg',
                status: 'ACTIVE',
                description: `WIP item auto-created for ${product.itemName} - ${stageLabel}`
            });
            return newItem.id;
        }

        return null;
    },

    seedWIPItems: () => {
        // Disabled as per user request to prevent auto-creation of items
    },

    processStageTransition: (batchId, nextStage, data) => {
        const batch = db.findById('productionLineBatches', batchId);
        if (!batch) return null;

        const prevStage = batch.currentStage;
        const prevQty = batch.currentQty;
        let newQty = prevQty;

        const stageLabels = { 'OVEN_BASAH': 'Oven Basah', 'OVEN_KERING': 'Oven Kering' };

        if (nextStage === 'OVEN_BASAH') {
            newQty = parseFloat(data.qty) || prevQty;
        } else if (nextStage === 'OVEN_KERING') {
            const shrinkPct = parseFloat(data.shrinkPct) || 0;
            newQty = prevQty * (1 - (shrinkPct / 100));
        }

        const transition = {
            fromStage: prevStage,
            toStage: nextStage,
            fromQty: prevQty,
            toQty: newQty,
            note: data.note || '',
            timestamp: new Date().toISOString()
        };

        const updates = {
            currentStage: nextStage,
            currentQty: newQty,
            history: [...(batch.history || []), transition]
        };

        // --- INVENTORY TRACKING PER STAGE ---
        if (prevStage && prevStage !== 'COMPLETED') {
            const prevWipId = db.ensureWIPItem(batch.productId, stageLabels[prevStage] || prevStage);
            db.addInventoryTransaction(prevWipId, 'OUT', prevQty, 'PRODUCTION_LINE', batch.id, `Pindah Tahap: ${prevStage} -> ${nextStage}`);
        }

        if (nextStage === 'COMPLETED') {
            updates.status = 'COMPLETED';
            updates.completedAt = new Date().toISOString();
            db.addInventoryTransaction(batch.productId, 'IN', newQty, 'PRODUCTION_LINE', batch.id, `Batch Selesai: ${batch.batchNo}`);
        } else {
            const nextWipId = db.ensureWIPItem(batch.productId, stageLabels[nextStage] || nextStage);
            db.addInventoryTransaction(nextWipId, 'IN', newQty, 'PRODUCTION_LINE', batch.id, `Masuk Tahap: ${nextStage}`);
        }

        return db.update('productionLineBatches', batchId, updates);
    },

    // --- Finance Helpers ---
    generateFinanceTxNo: (type) => {
        const prefixMap = {
            'EXPENSE': 'EXP',
            'PAYMENT': 'PAY',
            'JOURNAL': 'JRN',
            'AR': 'INV',
            'AP': 'BILL',
            'BANK': 'TRF'
        };
        const prefix = prefixMap[type] || 'JRN';
        const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
        const searchPrefix = `${prefix}-${dateStr}-`;
        const existing = db.read('journalEntries');
        
        let maxSeq = 0;
        existing.forEach(t => {
            if (t.journalNo && t.journalNo.startsWith(searchPrefix)) {
                const parts = t.journalNo.split('-');
                if (parts.length >= 3) {
                    const seq = parseInt(parts[2]);
                    if (!isNaN(seq) && seq > maxSeq) maxSeq = seq;
                }
            }
        });

        const nextSeq = maxSeq + 1;
        let finalNo = `${prefix}-${dateStr}-${nextSeq.toString().padStart(3, '0')}`;
        
        while (existing.some(t => t.journalNo === finalNo)) {
            maxSeq++;
            finalNo = `${prefix}-${dateStr}-${(maxSeq + 1).toString().padStart(3, '0')}`;
        }
        
        return finalNo;
    },

    addJournalEntry: ({ date, journalNo, description, items, referenceType = '', referenceId = '', departmentId = '' }) => {
        // items: [{ accountId, debit, credit }]
        const entry = db.insert('journalEntries', {
            date: date || new Date().toISOString(),
            journalNo: journalNo || db.generateFinanceTxNo('JOURNAL'),
            description: description || 'Journal Entry',
            referenceType,
            referenceId,
            departmentId,
            items: items || [],
            totalDebit: (items || []).reduce((sum, item) => sum + (parseFloat(item.debit) || 0), 0),
            totalCredit: (items || []).reduce((sum, item) => sum + (parseFloat(item.credit) || 0), 0)
        });

        return entry;
    },

    getAccountBalance: (accountId) => {
        const account = db.findById('accounts', accountId);
        const openingBalance = account ? (parseFloat(account.openingBalance) || 0) : 0;
        const entries = db.read('journalEntries');
        let balance = openingBalance;
        entries.forEach(entry => {
            entry.items.forEach(item => {
                if (item.accountId === accountId) {
                    balance += (parseFloat(item.debit) || 0) - (parseFloat(item.credit) || 0);
                }
            });
        });
        return balance;
    },

    seedDefaultFinanceData: () => {
        // Seed Departments
        if (db.read('departments').length === 0) {
            db.save('departments', [
                { id: 'dept_sales', name: 'Sales' },
                { id: 'dept_prod', name: 'Production' },
                { id: 'dept_inv', name: 'Inventory' },
                { id: 'dept_fin', name: 'Finance' },
                { id: 'dept_hr', name: 'HR' },
                { id: 'dept_mgm', name: 'Management' }
            ]);
        }

        // Seed Default Account Types & Accounts (COA 2026)
        if (!db.read('accountTypes') || db.read('accountTypes').length === 0) {
            db.save('accountTypes', [
    {
        "id": "type_asset",
        "name": "Aset / Aktiva",
        "base_type": "ASSET",
        "baseType": "ASSET"
    },
    {
        "id": "type_liability",
        "name": "Liabilitas / Hutang",
        "base_type": "LIABILITY",
        "baseType": "LIABILITY"
    },
    {
        "id": "type_equity",
        "name": "Ekuitas / Modal",
        "base_type": "EQUITY",
        "baseType": "EQUITY"
    },
    {
        "id": "type_income",
        "name": "Pendapatan",
        "base_type": "INCOME",
        "baseType": "INCOME"
    },
    {
        "id": "type_cogs",
        "name": "Harga Pokok Penjualan",
        "base_type": "EXPENSE",
        "baseType": "EXPENSE"
    },
    {
        "id": "type_expense",
        "name": "Beban / Biaya Operasional",
        "base_type": "EXPENSE",
        "baseType": "EXPENSE"
    },
    {
        "id": "type_other_income",
        "name": "Pendapatan Lainnya",
        "base_type": "INCOME",
        "baseType": "INCOME"
    },
    {
        "id": "type_other_expense",
        "name": "Beban Lainnya",
        "base_type": "EXPENSE",
        "baseType": "EXPENSE"
    }
]);
        }
        if (!db.read('accounts') || db.read('accounts').length === 0) {
            db.save('accounts', [
    {
        "id": "acc_grp_11",
        "code": "11",
        "name": "KAS & BANK",
        "type": "type_asset",
        "baseType": "ASSET",
        "parentId": null,
        "isGroup": true,
        "status": "ACTIVE"
    },
    {
        "id": "acc_grp_1101",
        "code": "1101",
        "name": "KAS",
        "type": "type_asset",
        "baseType": "ASSET",
        "parentId": "acc_grp_11",
        "isGroup": true,
        "status": "ACTIVE"
    },
    {
        "id": "acc_1101_01",
        "code": "1101.01",
        "name": "KAS",
        "type": "type_asset",
        "accountType": "Kas/Bank",
        "baseType": "ASSET",
        "parentId": "acc_grp_1101",
        "isGroup": false,
        "status": "ACTIVE"
    },
    {
        "id": "acc_grp_1102",
        "code": "1102",
        "name": "BANK",
        "type": "type_asset",
        "baseType": "ASSET",
        "parentId": "acc_grp_11",
        "isGroup": true,
        "status": "ACTIVE"
    },
    {
        "id": "acc_1102_01",
        "code": "1102.01",
        "name": "BANK BCA TSN IDR_1188",
        "type": "type_asset",
        "accountType": "Kas/Bank",
        "baseType": "ASSET",
        "parentId": "acc_grp_1102",
        "isGroup": false,
        "status": "ACTIVE"
    },
    {
        "id": "acc_1102_07",
        "code": "1102.07",
        "name": "BANK BCA PTC IDR_2130",
        "type": "type_asset",
        "accountType": "Kas/Bank",
        "baseType": "ASSET",
        "parentId": "acc_grp_1102",
        "isGroup": false,
        "status": "ACTIVE"
    },
    {
        "id": "acc_1102_08",
        "code": "1102.08",
        "name": "BANK BRI PTC IDR_6505",
        "type": "type_asset",
        "accountType": "Kas/Bank",
        "baseType": "ASSET",
        "parentId": "acc_grp_1102",
        "isGroup": false,
        "status": "ACTIVE"
    },
    {
        "id": "acc_grp_1103",
        "code": "1103",
        "name": "AYAT SILANG",
        "type": "type_asset",
        "baseType": "ASSET",
        "parentId": "acc_grp_11",
        "isGroup": true,
        "status": "ACTIVE"
    },
    {
        "id": "acc_1103_01",
        "code": "1103.01",
        "name": "AYAT SILANG KAS - BANK",
        "type": "type_asset",
        "accountType": "Kas/Bank",
        "baseType": "ASSET",
        "parentId": "acc_grp_1103",
        "isGroup": false,
        "status": "ACTIVE"
    },
    {
        "id": "acc_grp_1201",
        "code": "1201",
        "name": "PIUTANG USAHA",
        "type": "type_asset",
        "baseType": "ASSET",
        "parentId": "acc_grp_11",
        "isGroup": true,
        "status": "ACTIVE"
    },
    {
        "id": "acc_1201_01",
        "code": "1201.01",
        "name": "PIUTANG USAHA",
        "type": "type_asset",
        "accountType": "Piutang Usaha",
        "baseType": "ASSET",
        "parentId": "acc_grp_1201",
        "isGroup": false,
        "status": "ACTIVE"
    },
    {
        "id": "acc_1201_02",
        "code": "1201.02",
        "name": "PIUTANG USAHA RAGU-2",
        "type": "type_asset",
        "accountType": "Piutang Usaha",
        "baseType": "ASSET",
        "parentId": "acc_grp_1201",
        "isGroup": false,
        "status": "ACTIVE"
    },
    {
        "id": "acc_grp_1202",
        "code": "1202",
        "name": "PIUTANG KARYAWAN",
        "type": "type_asset",
        "baseType": "ASSET",
        "parentId": "acc_grp_11",
        "isGroup": true,
        "status": "ACTIVE"
    },
    {
        "id": "acc_1202_01",
        "code": "1202.01",
        "name": "PIUTANG KARYAWAN TETAP",
        "type": "type_asset",
        "accountType": "Aktiva Lancar Lainnya",
        "baseType": "ASSET",
        "parentId": "acc_grp_1202",
        "isGroup": false,
        "status": "ACTIVE"
    },
    {
        "id": "acc_1202_02",
        "code": "1202.02",
        "name": "PIUTANG KARYAWAN LAINNYA",
        "type": "type_asset",
        "accountType": "Aktiva Lancar Lainnya",
        "baseType": "ASSET",
        "parentId": "acc_grp_1202",
        "isGroup": false,
        "status": "ACTIVE"
    },
    {
        "id": "acc_1202_07",
        "code": "1202.07",
        "name": "PIUTANG DIREKSI",
        "type": "type_asset",
        "accountType": "Aktiva Lancar Lainnya",
        "baseType": "ASSET",
        "parentId": "acc_grp_1202",
        "isGroup": false,
        "status": "ACTIVE"
    },
    {
        "id": "acc_1202_08",
        "code": "1202.08",
        "name": "PIUTANG PEMEGANG SAHAM",
        "type": "type_asset",
        "accountType": "Aktiva Lancar Lainnya",
        "baseType": "ASSET",
        "parentId": "acc_grp_1202",
        "isGroup": false,
        "status": "ACTIVE"
    },
    {
        "id": "acc_grp_13",
        "code": "13",
        "name": "PERSEDIAAN",
        "type": "type_asset",
        "baseType": "ASSET",
        "parentId": null,
        "isGroup": true,
        "status": "ACTIVE"
    },
    {
        "id": "acc_1301_01",
        "code": "1301.01",
        "name": "PERSEDIAAN BAHAN BAKU",
        "type": "type_asset",
        "accountType": "Persediaan",
        "baseType": "ASSET",
        "parentId": "acc_grp_13",
        "isGroup": false,
        "status": "ACTIVE"
    },
    {
        "id": "acc_1301_02",
        "code": "1301.02",
        "name": "PERSEDIAAN BAHAN PEMBANTU",
        "type": "type_asset",
        "accountType": "Persediaan",
        "baseType": "ASSET",
        "parentId": "acc_grp_13",
        "isGroup": false,
        "status": "ACTIVE"
    },
    {
        "id": "acc_1301_03",
        "code": "1301.03",
        "name": "PERSEDIAAN BAHAN DALAM PROSES",
        "type": "type_asset",
        "accountType": "Persediaan",
        "baseType": "ASSET",
        "parentId": "acc_grp_13",
        "isGroup": false,
        "status": "ACTIVE"
    },
    {
        "id": "acc_1301_04",
        "code": "1301.04",
        "name": "PERSEDIAAN BARANG JADI",
        "type": "type_asset",
        "accountType": "Persediaan",
        "baseType": "ASSET",
        "parentId": "acc_grp_13",
        "isGroup": false,
        "status": "ACTIVE"
    },
    {
        "id": "acc_1302_01",
        "code": "1302.01",
        "name": "PERSEDIAAN SPARE PARTS - MESIN EXTRUDER",
        "type": "type_asset",
        "accountType": "Persediaan",
        "baseType": "ASSET",
        "parentId": "acc_grp_13",
        "isGroup": false,
        "status": "ACTIVE"
    },
    {
        "id": "acc_1302_02",
        "code": "1302.02",
        "name": "PERSEDIAAN SPARE PARTS - MESIN LAINNYA",
        "type": "type_asset",
        "accountType": "Persediaan",
        "baseType": "ASSET",
        "parentId": "acc_grp_13",
        "isGroup": false,
        "status": "ACTIVE"
    },
    {
        "id": "acc_1303_01",
        "code": "1303.01",
        "name": "PERSEDIAAN ELPIJI",
        "type": "type_asset",
        "accountType": "Persediaan",
        "baseType": "ASSET",
        "parentId": "acc_grp_13",
        "isGroup": false,
        "status": "ACTIVE"
    },
    {
        "id": "acc_1303_02",
        "code": "1303.02",
        "name": "PERSEDIAAN BAHAN BAKAR & PELUMAS",
        "type": "type_asset",
        "accountType": "Persediaan",
        "baseType": "ASSET",
        "parentId": "acc_grp_13",
        "isGroup": false,
        "status": "ACTIVE"
    },
    {
        "id": "acc_grp_14",
        "code": "14",
        "name": "PEMBAYARAN DIMUKA",
        "type": "type_asset",
        "baseType": "ASSET",
        "parentId": null,
        "isGroup": true,
        "status": "ACTIVE"
    },
    {
        "id": "acc_grp_1401",
        "code": "1401",
        "name": "UANG MUKA PEMBELIAN",
        "type": "type_asset",
        "baseType": "ASSET",
        "parentId": "acc_grp_14",
        "isGroup": true,
        "status": "ACTIVE"
    },
    {
        "id": "acc_1401_01",
        "code": "1401.01",
        "name": "UM PEMBELIAN AKTIVA TETAP",
        "type": "type_asset",
        "accountType": "Aktiva Lancar Lainnya",
        "baseType": "ASSET",
        "parentId": "acc_grp_1401",
        "isGroup": false,
        "status": "ACTIVE"
    },
    {
        "id": "acc_1401_02",
        "code": "1401.02",
        "name": "UM PEMBELIAN PERSEDIAAN",
        "type": "type_asset",
        "accountType": "Aktiva Lancar Lainnya",
        "baseType": "ASSET",
        "parentId": "acc_grp_1401",
        "isGroup": false,
        "status": "ACTIVE"
    },
    {
        "id": "acc_grp_1402",
        "code": "1402",
        "name": "PAJAK DIBAYAR DIMUKA",
        "type": "type_asset",
        "baseType": "ASSET",
        "parentId": "acc_grp_14",
        "isGroup": true,
        "status": "ACTIVE"
    },
    {
        "id": "acc_1402_01",
        "code": "1402.01",
        "name": "UM PPh Psl 21 / 26",
        "type": "type_asset",
        "accountType": "Aktiva Lancar Lainnya",
        "baseType": "ASSET",
        "parentId": "acc_grp_1402",
        "isGroup": false,
        "status": "ACTIVE"
    },
    {
        "id": "acc_1402_02",
        "code": "1402.02",
        "name": "UM PPh Psl 22",
        "type": "type_asset",
        "accountType": "Aktiva Lancar Lainnya",
        "baseType": "ASSET",
        "parentId": "acc_grp_1402",
        "isGroup": false,
        "status": "ACTIVE"
    },
    {
        "id": "acc_1402_03",
        "code": "1402.03",
        "name": "UM PPh Psl 23",
        "type": "type_asset",
        "accountType": "Aktiva Lancar Lainnya",
        "baseType": "ASSET",
        "parentId": "acc_grp_1402",
        "isGroup": false,
        "status": "ACTIVE"
    },
    {
        "id": "acc_1402_04",
        "code": "1402.04",
        "name": "UM PPh Psl 25 / 29",
        "type": "type_asset",
        "accountType": "Aktiva Lancar Lainnya",
        "baseType": "ASSET",
        "parentId": "acc_grp_1402",
        "isGroup": false,
        "status": "ACTIVE"
    },
    {
        "id": "acc_1402_05",
        "code": "1402.05",
        "name": "UM PPh Psl 4 (2)",
        "type": "type_asset",
        "accountType": "Aktiva Lancar Lainnya",
        "baseType": "ASSET",
        "parentId": "acc_grp_1402",
        "isGroup": false,
        "status": "ACTIVE"
    },
    {
        "id": "acc_grp_1403",
        "code": "1403",
        "name": "BIAYA DIBAYAR DIMUKA",
        "type": "type_asset",
        "baseType": "ASSET",
        "parentId": "acc_grp_14",
        "isGroup": true,
        "status": "ACTIVE"
    },
    {
        "id": "acc_1403_01",
        "code": "1403.01",
        "name": "BDD - BIAYA SEWA",
        "type": "type_asset",
        "accountType": "Aktiva Lancar Lainnya",
        "baseType": "ASSET",
        "parentId": "acc_grp_1403",
        "isGroup": false,
        "status": "ACTIVE"
    },
    {
        "id": "acc_grp_1409",
        "code": "1409",
        "name": "PIUTANG LAIN-2",
        "type": "type_asset",
        "baseType": "ASSET",
        "parentId": "acc_grp_14",
        "isGroup": true,
        "status": "ACTIVE"
    },
    {
        "id": "acc_1409_01",
        "code": "1409.01",
        "name": "BPJS KETENAGAKERJAAN",
        "type": "type_asset",
        "accountType": "Aktiva Lancar Lainnya",
        "baseType": "ASSET",
        "parentId": "acc_grp_1409",
        "isGroup": false,
        "status": "ACTIVE"
    },
    {
        "id": "acc_1409_02",
        "code": "1409.02",
        "name": "BPJS KESEHATAN",
        "type": "type_asset",
        "accountType": "Aktiva Lancar Lainnya",
        "baseType": "ASSET",
        "parentId": "acc_grp_1409",
        "isGroup": false,
        "status": "ACTIVE"
    },
    {
        "id": "acc_grp_1410",
        "code": "1410",
        "name": "BIAYA DITANGGUHKAN",
        "type": "type_asset",
        "baseType": "ASSET",
        "parentId": "acc_grp_14",
        "isGroup": true,
        "status": "ACTIVE"
    },
    {
        "id": "acc_1410_01",
        "code": "1410.01",
        "name": "Biaya Ditangguhkan",
        "type": "type_asset",
        "accountType": "Aktiva Lancar Lainnya",
        "baseType": "ASSET",
        "parentId": "acc_grp_1410",
        "isGroup": false,
        "status": "ACTIVE"
    },
    {
        "id": "acc_1410_02",
        "code": "1410.02",
        "name": "Proyek Dalam Pengerjaan",
        "type": "type_asset",
        "accountType": "Aktiva Lancar Lainnya",
        "baseType": "ASSET",
        "parentId": "acc_grp_1410",
        "isGroup": false,
        "status": "ACTIVE"
    },
    {
        "id": "acc_grp_15",
        "code": "15",
        "name": "AKTIVA TETAP",
        "type": "type_asset",
        "baseType": "ASSET",
        "parentId": null,
        "isGroup": true,
        "status": "ACTIVE"
    },
    {
        "id": "acc_1501_01",
        "code": "1501.01",
        "name": "TANAH",
        "type": "type_asset",
        "accountType": "Aktiva Tetap",
        "baseType": "ASSET",
        "parentId": "acc_grp_15",
        "isGroup": false,
        "status": "ACTIVE"
    },
    {
        "id": "acc_1501_02",
        "code": "1501.02",
        "name": "BANGUNAN",
        "type": "type_asset",
        "accountType": "Aktiva Tetap",
        "baseType": "ASSET",
        "parentId": "acc_grp_15",
        "isGroup": false,
        "status": "ACTIVE"
    },
    {
        "id": "acc_1501_03",
        "code": "1501.03",
        "name": "MESIN-MESIN",
        "type": "type_asset",
        "accountType": "Aktiva Tetap",
        "baseType": "ASSET",
        "parentId": "acc_grp_15",
        "isGroup": false,
        "status": "ACTIVE"
    },
    {
        "id": "acc_1501_04",
        "code": "1501.04",
        "name": "KENDARAAN",
        "type": "type_asset",
        "accountType": "Aktiva Tetap",
        "baseType": "ASSET",
        "parentId": "acc_grp_15",
        "isGroup": false,
        "status": "ACTIVE"
    },
    {
        "id": "acc_1501_05",
        "code": "1501.05",
        "name": "PERLENGKAPAN KANTOR",
        "type": "type_asset",
        "accountType": "Aktiva Tetap",
        "baseType": "ASSET",
        "parentId": "acc_grp_15",
        "isGroup": false,
        "status": "ACTIVE"
    },
    {
        "id": "acc_1502_01",
        "code": "1502.01",
        "name": "AKUMULASI PENYUSUTAN BANGUNAN",
        "type": "type_asset",
        "accountType": "Aktiva Tetap",
        "baseType": "ASSET",
        "parentId": "acc_grp_15",
        "isGroup": false,
        "status": "ACTIVE"
    },
    {
        "id": "acc_1502_02",
        "code": "1502.02",
        "name": "AKUMULASI PENYUSUTAN MESIN-MESIN",
        "type": "type_asset",
        "accountType": "Aktiva Tetap",
        "baseType": "ASSET",
        "parentId": "acc_grp_15",
        "isGroup": false,
        "status": "ACTIVE"
    },
    {
        "id": "acc_1502_03",
        "code": "1502.03",
        "name": "AKUMULASI PENYUSUTAN KENDARAAN",
        "type": "type_asset",
        "accountType": "Aktiva Tetap",
        "baseType": "ASSET",
        "parentId": "acc_grp_15",
        "isGroup": false,
        "status": "ACTIVE"
    },
    {
        "id": "acc_1502_04",
        "code": "1502.04",
        "name": "AKUMULASI PENYUSUTAN PERLENGKAPAN KANTOR",
        "type": "type_asset",
        "accountType": "Aktiva Tetap",
        "baseType": "ASSET",
        "parentId": "acc_grp_15",
        "isGroup": false,
        "status": "ACTIVE"
    },
    {
        "id": "acc_grp_21",
        "code": "21",
        "name": "HUTANG LANCAR",
        "type": "type_liability",
        "baseType": "LIABILITY",
        "parentId": null,
        "isGroup": true,
        "status": "ACTIVE"
    },
    {
        "id": "acc_grp_2101",
        "code": "2101",
        "name": "HUTANG USAHA",
        "type": "type_liability",
        "baseType": "LIABILITY",
        "parentId": "acc_grp_21",
        "isGroup": true,
        "status": "ACTIVE"
    },
    {
        "id": "acc_2101_01",
        "code": "2101.01",
        "name": "HUTANG USAHA IDR",
        "type": "type_liability",
        "accountType": "Hutang Usaha",
        "baseType": "LIABILITY",
        "parentId": "acc_grp_2101",
        "isGroup": false,
        "status": "ACTIVE"
    },
    {
        "id": "acc_grp_22",
        "code": "22",
        "name": "HUTANG BANK",
        "type": "type_liability",
        "baseType": "LIABILITY",
        "parentId": null,
        "isGroup": true,
        "status": "ACTIVE"
    },
    {
        "id": "acc_2201_01",
        "code": "2201.01",
        "name": "HUTANG PINJAMAN BPR",
        "type": "type_liability",
        "accountType": "Hutang Lancar Lainnya",
        "baseType": "LIABILITY",
        "parentId": "acc_grp_22",
        "isGroup": false,
        "status": "ACTIVE"
    },
    {
        "id": "acc_grp_23",
        "code": "23",
        "name": "HUTANG PAJAK",
        "type": "type_liability",
        "baseType": "LIABILITY",
        "parentId": null,
        "isGroup": true,
        "status": "ACTIVE"
    },
    {
        "id": "acc_grp_2301",
        "code": "2301",
        "name": "PAJAK PERTAMBAHAN NILAI (PPN)",
        "type": "type_liability",
        "baseType": "LIABILITY",
        "parentId": "acc_grp_23",
        "isGroup": true,
        "status": "ACTIVE"
    },
    {
        "id": "acc_2301_01",
        "code": "2301.01",
        "name": "PPN MASUKAN",
        "type": "type_liability",
        "accountType": "Hutang Lancar Lainnya",
        "baseType": "LIABILITY",
        "parentId": "acc_grp_2301",
        "isGroup": false,
        "status": "ACTIVE"
    },
    {
        "id": "acc_2301_02",
        "code": "2301.02",
        "name": "PPN KELUARAN",
        "type": "type_liability",
        "accountType": "Hutang Lancar Lainnya",
        "baseType": "LIABILITY",
        "parentId": "acc_grp_2301",
        "isGroup": false,
        "status": "ACTIVE"
    },
    {
        "id": "acc_2301_03",
        "code": "2301.03",
        "name": "HUTANG PPN YMH DIBAYAR",
        "type": "type_liability",
        "accountType": "Hutang Lancar Lainnya",
        "baseType": "LIABILITY",
        "parentId": "acc_grp_2301",
        "isGroup": false,
        "status": "ACTIVE"
    },
    {
        "id": "acc_2302_01",
        "code": "2302.01",
        "name": "PPh pasal 21 / 26",
        "type": "type_liability",
        "accountType": "Hutang Lancar Lainnya",
        "baseType": "LIABILITY",
        "parentId": "acc_grp_23",
        "isGroup": false,
        "status": "ACTIVE"
    },
    {
        "id": "acc_2303_01",
        "code": "2303.01",
        "name": "PPh pasal 25 / 29",
        "type": "type_liability",
        "accountType": "Hutang Lancar Lainnya",
        "baseType": "LIABILITY",
        "parentId": "acc_grp_23",
        "isGroup": false,
        "status": "ACTIVE"
    },
    {
        "id": "acc_2304_01",
        "code": "2304.01",
        "name": "PPh pasal 4 (2)",
        "type": "type_liability",
        "accountType": "Hutang Lancar Lainnya",
        "baseType": "LIABILITY",
        "parentId": "acc_grp_23",
        "isGroup": false,
        "status": "ACTIVE"
    },
    {
        "id": "acc_2305_01",
        "code": "2305.01",
        "name": "PPh pasal 22",
        "type": "type_liability",
        "accountType": "Hutang Lancar Lainnya",
        "baseType": "LIABILITY",
        "parentId": "acc_grp_23",
        "isGroup": false,
        "status": "ACTIVE"
    },
    {
        "id": "acc_2306_01",
        "code": "2306.01",
        "name": "PPh pasal 23",
        "type": "type_liability",
        "accountType": "Hutang Lancar Lainnya",
        "baseType": "LIABILITY",
        "parentId": "acc_grp_23",
        "isGroup": false,
        "status": "ACTIVE"
    },
    {
        "id": "acc_grp_24",
        "code": "24",
        "name": "HUTANG BIAYA OPERASIONAL YANG MASIH HARUS DIBAYAR (YADIB)",
        "type": "type_liability",
        "baseType": "LIABILITY",
        "parentId": null,
        "isGroup": true,
        "status": "ACTIVE"
    },
    {
        "id": "acc_2401_01",
        "code": "2401.01",
        "name": "YADIB - BIAYA PABRIKASI",
        "type": "type_liability",
        "accountType": "Hutang Lancar Lainnya",
        "baseType": "LIABILITY",
        "parentId": "acc_grp_24",
        "isGroup": false,
        "status": "ACTIVE"
    },
    {
        "id": "acc_2402_01",
        "code": "2402.01",
        "name": "YADIB - BIAYA PENJUALAN",
        "type": "type_liability",
        "accountType": "Hutang Lancar Lainnya",
        "baseType": "LIABILITY",
        "parentId": "acc_grp_24",
        "isGroup": false,
        "status": "ACTIVE"
    },
    {
        "id": "acc_2403_01",
        "code": "2403.01",
        "name": "YADIB - BIAYA ADM & UMUM",
        "type": "type_liability",
        "accountType": "Hutang Lancar Lainnya",
        "baseType": "LIABILITY",
        "parentId": "acc_grp_24",
        "isGroup": false,
        "status": "ACTIVE"
    },
    {
        "id": "acc_2404_01",
        "code": "2404.01",
        "name": "YADIB - BIAYA LAIN-2",
        "type": "type_liability",
        "accountType": "Hutang Lancar Lainnya",
        "baseType": "LIABILITY",
        "parentId": "acc_grp_24",
        "isGroup": false,
        "status": "ACTIVE"
    },
    {
        "id": "acc_grp_25",
        "code": "25",
        "name": "PENDAPATAN DITERIMA DIMUKA",
        "type": "type_liability",
        "baseType": "LIABILITY",
        "parentId": null,
        "isGroup": true,
        "status": "ACTIVE"
    },
    {
        "id": "acc_grp_26",
        "code": "26",
        "name": "HUTANG LEASING",
        "type": "type_liability",
        "baseType": "LIABILITY",
        "parentId": null,
        "isGroup": true,
        "status": "ACTIVE"
    },
    {
        "id": "acc_grp_27",
        "code": "27",
        "name": "HUTANG LAIN-LAIN",
        "type": "type_liability",
        "baseType": "LIABILITY",
        "parentId": null,
        "isGroup": true,
        "status": "ACTIVE"
    },
    {
        "id": "acc_2701_01",
        "code": "2701.01",
        "name": "BPJS KETENAGAKERJAAN",
        "type": "type_liability",
        "accountType": "Hutang Lancar Lainnya",
        "baseType": "LIABILITY",
        "parentId": "acc_grp_27",
        "isGroup": false,
        "status": "ACTIVE"
    },
    {
        "id": "acc_2701_02",
        "code": "2701.02",
        "name": "BPJS KESEHATAN",
        "type": "type_liability",
        "accountType": "Hutang Lancar Lainnya",
        "baseType": "LIABILITY",
        "parentId": "acc_grp_27",
        "isGroup": false,
        "status": "ACTIVE"
    },
    {
        "id": "acc_grp_29",
        "code": "29",
        "name": "HUTANG JANGKA PANJANG",
        "type": "type_liability",
        "baseType": "LIABILITY",
        "parentId": null,
        "isGroup": true,
        "status": "ACTIVE"
    },
    {
        "id": "acc_2901_01",
        "code": "2901.01",
        "name": "HUTANG KEPADA PEMEGANG SAHAM",
        "type": "type_liability",
        "accountType": "Hutang Lancar Lainnya",
        "baseType": "LIABILITY",
        "parentId": "acc_grp_29",
        "isGroup": false,
        "status": "ACTIVE"
    },
    {
        "id": "acc_2902_01",
        "code": "2902.01",
        "name": "HUTANG DEVIDEN",
        "type": "type_liability",
        "accountType": "Hutang Lancar Lainnya",
        "baseType": "LIABILITY",
        "parentId": "acc_grp_29",
        "isGroup": false,
        "status": "ACTIVE"
    },
    {
        "id": "acc_grp_30",
        "code": "30",
        "name": "MODAL & EKUITAS",
        "type": "type_equity",
        "baseType": "EQUITY",
        "parentId": null,
        "isGroup": true,
        "status": "ACTIVE"
    },
    {
        "id": "acc_3101_01",
        "code": "3101.01",
        "name": "MODAL SAHAM",
        "type": "type_equity",
        "accountType": "Modal & Ekuitas",
        "baseType": "EQUITY",
        "parentId": "acc_grp_30",
        "isGroup": false,
        "status": "ACTIVE"
    },
    {
        "id": "acc_3201_01",
        "code": "3201.01",
        "name": "LABA RUGI DITAHAN",
        "type": "type_equity",
        "accountType": "Modal & Ekuitas",
        "baseType": "EQUITY",
        "parentId": "acc_grp_30",
        "isGroup": false,
        "status": "ACTIVE"
    },
    {
        "id": "acc_3201_02",
        "code": "3201.02",
        "name": "LABA RUGI TAHUN BERJALAN",
        "type": "type_equity",
        "accountType": "Modal & Ekuitas",
        "baseType": "EQUITY",
        "parentId": "acc_grp_30",
        "isGroup": false,
        "status": "ACTIVE"
    },
    {
        "id": "acc_grp_40",
        "code": "40",
        "name": "PENDAPATAN",
        "type": "type_income",
        "baseType": "INCOME",
        "parentId": null,
        "isGroup": true,
        "status": "ACTIVE"
    },
    {
        "id": "acc_grp_4101",
        "code": "4101",
        "name": "PENJUALAN SNACK",
        "type": "type_income",
        "baseType": "INCOME",
        "parentId": "acc_grp_40",
        "isGroup": true,
        "status": "ACTIVE"
    },
    {
        "id": "acc_grp_4201",
        "code": "4201",
        "name": "RETUR PENJUALAN SNACK",
        "type": "type_income",
        "baseType": "INCOME",
        "parentId": "acc_grp_40",
        "isGroup": true,
        "status": "ACTIVE"
    },
    {
        "id": "acc_grp_4301",
        "code": "4301",
        "name": "POTONGAN PENJUALAN",
        "type": "type_income",
        "baseType": "INCOME",
        "parentId": "acc_grp_40",
        "isGroup": true,
        "status": "ACTIVE"
    },
    {
        "id": "acc_grp_4701",
        "code": "4701",
        "name": "PENJUALAN LAINNYA",
        "type": "type_income",
        "baseType": "INCOME",
        "parentId": "acc_grp_40",
        "isGroup": true,
        "status": "ACTIVE"
    },
    {
        "id": "acc_4701_01",
        "code": "4701.01",
        "name": "PENJUALAN BAHAN BAKU",
        "type": "type_income",
        "accountType": "INCOME",
        "baseType": "INCOME",
        "parentId": "acc_grp_4701",
        "isGroup": false,
        "status": "ACTIVE"
    },
    {
        "id": "acc_4701_02",
        "code": "4701.02",
        "name": "PENJUALAN BAHAN PENOLONG",
        "type": "type_income",
        "accountType": "INCOME",
        "baseType": "INCOME",
        "parentId": "acc_grp_4701",
        "isGroup": false,
        "status": "ACTIVE"
    },
    {
        "id": "acc_4701_03",
        "code": "4701.03",
        "name": "PENJUALAN BUMBU JADI",
        "type": "type_income",
        "accountType": "INCOME",
        "baseType": "INCOME",
        "parentId": "acc_grp_4701",
        "isGroup": false,
        "status": "ACTIVE"
    },
    {
        "id": "acc_grp_50",
        "code": "50",
        "name": "HARGA POKOK PENJUALAN",
        "type": "type_cogs",
        "baseType": "EXPENSE",
        "parentId": null,
        "isGroup": true,
        "status": "ACTIVE"
    },
    {
        "id": "acc_grp_5101",
        "code": "5101",
        "name": "HARGA POKOK PENJUALAN",
        "type": "type_cogs",
        "baseType": "EXPENSE",
        "parentId": "acc_grp_50",
        "isGroup": true,
        "status": "ACTIVE"
    },
    {
        "id": "acc_grp_5201",
        "code": "5201",
        "name": "HARGA POKOK PENJUALAN LAINNYA",
        "type": "type_cogs",
        "baseType": "EXPENSE",
        "parentId": "acc_grp_50",
        "isGroup": true,
        "status": "ACTIVE"
    },
    {
        "id": "acc_grp_5301",
        "code": "5301",
        "name": "RETUR HPP",
        "type": "type_cogs",
        "baseType": "EXPENSE",
        "parentId": "acc_grp_50",
        "isGroup": true,
        "status": "ACTIVE"
    },
    {
        "id": "acc_grp_5401",
        "code": "5401",
        "name": "BARANG DALAM PROSES",
        "type": "type_cogs",
        "baseType": "EXPENSE",
        "parentId": "acc_grp_50",
        "isGroup": true,
        "status": "ACTIVE"
    },
    {
        "id": "acc_5401_01",
        "code": "5401.01",
        "name": "BDP AWAL",
        "type": "type_cogs",
        "accountType": "EXPENSE",
        "baseType": "EXPENSE",
        "parentId": "acc_grp_5401",
        "isGroup": false,
        "status": "ACTIVE"
    },
    {
        "id": "acc_5401_02",
        "code": "5401.02",
        "name": "BDP AKHIR",
        "type": "type_cogs",
        "accountType": "EXPENSE",
        "baseType": "EXPENSE",
        "parentId": "acc_grp_5401",
        "isGroup": false,
        "status": "ACTIVE"
    },
    {
        "id": "acc_grp_5501",
        "code": "5501",
        "name": "BARANG JADI",
        "type": "type_cogs",
        "baseType": "EXPENSE",
        "parentId": "acc_grp_50",
        "isGroup": true,
        "status": "ACTIVE"
    },
    {
        "id": "acc_5501_01",
        "code": "5501.01",
        "name": "BARANG JADI AWAL",
        "type": "type_cogs",
        "accountType": "EXPENSE",
        "baseType": "EXPENSE",
        "parentId": "acc_grp_5501",
        "isGroup": false,
        "status": "ACTIVE"
    },
    {
        "id": "acc_5501_02",
        "code": "5501.02",
        "name": "BARANG JADI AKHIR",
        "type": "type_cogs",
        "accountType": "EXPENSE",
        "baseType": "EXPENSE",
        "parentId": "acc_grp_5501",
        "isGroup": false,
        "status": "ACTIVE"
    },
    {
        "id": "acc_grp_5701",
        "code": "5701",
        "name": "BIAYA PRODUKSI / PABRIKASI",
        "type": "type_cogs",
        "baseType": "EXPENSE",
        "parentId": "acc_grp_50",
        "isGroup": true,
        "status": "ACTIVE"
    },
    {
        "id": "acc_5701_01",
        "code": "5701.01",
        "name": "BIAYA GAJI TK LANGSUNG",
        "type": "type_cogs",
        "accountType": "EXPENSE",
        "baseType": "EXPENSE",
        "parentId": "acc_grp_5701",
        "isGroup": false,
        "status": "ACTIVE"
    },
    {
        "id": "acc_5701_02",
        "code": "5701.02",
        "name": "THR / BONUS TK LANGSUNG",
        "type": "type_cogs",
        "accountType": "EXPENSE",
        "baseType": "EXPENSE",
        "parentId": "acc_grp_5701",
        "isGroup": false,
        "status": "ACTIVE"
    },
    {
        "id": "acc_5701_03",
        "code": "5701.03",
        "name": "BPJS TK LANGSUNG",
        "type": "type_cogs",
        "accountType": "EXPENSE",
        "baseType": "EXPENSE",
        "parentId": "acc_grp_5701",
        "isGroup": false,
        "status": "ACTIVE"
    },
    {
        "id": "acc_5701_04",
        "code": "5701.04",
        "name": "PENGOBATAN TK LANGSUNG",
        "type": "type_cogs",
        "accountType": "EXPENSE",
        "baseType": "EXPENSE",
        "parentId": "acc_grp_5701",
        "isGroup": false,
        "status": "ACTIVE"
    },
    {
        "id": "acc_5702_01",
        "code": "5702.01",
        "name": "PEMAKAIAN ELPIJI",
        "type": "type_cogs",
        "accountType": "EXPENSE",
        "baseType": "EXPENSE",
        "parentId": "acc_grp_50",
        "isGroup": false,
        "status": "ACTIVE"
    },
    {
        "id": "acc_5703_01",
        "code": "5703.01",
        "name": "PLN",
        "type": "type_cogs",
        "accountType": "EXPENSE",
        "baseType": "EXPENSE",
        "parentId": "acc_grp_50",
        "isGroup": false,
        "status": "ACTIVE"
    },
    {
        "id": "acc_5704_01",
        "code": "5704.01",
        "name": "PEMAKAIAN SPARE PARTS",
        "type": "type_cogs",
        "accountType": "EXPENSE",
        "baseType": "EXPENSE",
        "parentId": "acc_grp_50",
        "isGroup": false,
        "status": "ACTIVE"
    },
    {
        "id": "acc_5705_01",
        "code": "5705.01",
        "name": "PEMELIHARAAN MESIN-2 PRODUKSI",
        "type": "type_cogs",
        "accountType": "EXPENSE",
        "baseType": "EXPENSE",
        "parentId": "acc_grp_50",
        "isGroup": false,
        "status": "ACTIVE"
    },
    {
        "id": "acc_5706_01",
        "code": "5706.01",
        "name": "BEBAN PRODUKSI LAINNYA",
        "type": "type_cogs",
        "accountType": "EXPENSE",
        "baseType": "EXPENSE",
        "parentId": "acc_grp_50",
        "isGroup": false,
        "status": "ACTIVE"
    },
    {
        "id": "acc_5707_01",
        "code": "5707.01",
        "name": "ONGKOS ANGKUT PEMBELIAN BAHAN",
        "type": "type_cogs",
        "accountType": "EXPENSE",
        "baseType": "EXPENSE",
        "parentId": "acc_grp_50",
        "isGroup": false,
        "status": "ACTIVE"
    },
    {
        "id": "acc_5708_01",
        "code": "5708.01",
        "name": "PENYUSUTAN MESIN-2 PRODUKSI",
        "type": "type_cogs",
        "accountType": "EXPENSE",
        "baseType": "EXPENSE",
        "parentId": "acc_grp_50",
        "isGroup": false,
        "status": "ACTIVE"
    },
    {
        "id": "acc_grp_60",
        "code": "60",
        "name": "BIAYA PENJUALAN & PEMASARAN",
        "type": "type_expense",
        "baseType": "EXPENSE",
        "parentId": null,
        "isGroup": true,
        "status": "ACTIVE"
    },
    {
        "id": "acc_6101_01",
        "code": "6101.01",
        "name": "BIAYA GAJI",
        "type": "type_expense",
        "accountType": "EXPENSE",
        "baseType": "EXPENSE",
        "parentId": "acc_grp_60",
        "isGroup": false,
        "status": "ACTIVE"
    },
    {
        "id": "acc_6101_02",
        "code": "6101.02",
        "name": "THR",
        "type": "type_expense",
        "accountType": "EXPENSE",
        "baseType": "EXPENSE",
        "parentId": "acc_grp_60",
        "isGroup": false,
        "status": "ACTIVE"
    },
    {
        "id": "acc_grp_6102",
        "code": "6102",
        "name": "BIAYA KOMISI & INSENTIF",
        "type": "type_expense",
        "baseType": "EXPENSE",
        "parentId": "acc_grp_60",
        "isGroup": true,
        "status": "ACTIVE"
    },
    {
        "id": "acc_6102_01",
        "code": "6102.01",
        "name": "Akun 6102.01",
        "type": "type_expense",
        "accountType": "EXPENSE",
        "baseType": "EXPENSE",
        "parentId": "acc_grp_6102",
        "isGroup": false,
        "status": "ACTIVE"
    },
    {
        "id": "acc_6102_02",
        "code": "6102.02",
        "name": "Akun 6102.02",
        "type": "type_expense",
        "accountType": "EXPENSE",
        "baseType": "EXPENSE",
        "parentId": "acc_grp_6102",
        "isGroup": false,
        "status": "ACTIVE"
    },
    {
        "id": "acc_grp_6103",
        "code": "6103",
        "name": "BIAYA ANGKUT",
        "type": "type_expense",
        "baseType": "EXPENSE",
        "parentId": "acc_grp_60",
        "isGroup": true,
        "status": "ACTIVE"
    },
    {
        "id": "acc_grp_6104",
        "code": "6104",
        "name": "BIAYA OPERASIONAL",
        "type": "type_expense",
        "baseType": "EXPENSE",
        "parentId": "acc_grp_60",
        "isGroup": true,
        "status": "ACTIVE"
    },
    {
        "id": "acc_6104_01",
        "code": "6104.01",
        "name": "BIOPS TEAM SALES",
        "type": "type_expense",
        "accountType": "EXPENSE",
        "baseType": "EXPENSE",
        "parentId": "acc_grp_6104",
        "isGroup": false,
        "status": "ACTIVE"
    },
    {
        "id": "acc_6104_02",
        "code": "6104.02",
        "name": "Akun 6104.02",
        "type": "type_expense",
        "accountType": "EXPENSE",
        "baseType": "EXPENSE",
        "parentId": "acc_grp_6104",
        "isGroup": false,
        "status": "ACTIVE"
    },
    {
        "id": "acc_grp_6105",
        "code": "6105",
        "name": "BIAYA PERJALANAN DINAS (LUAR KOTA)",
        "type": "type_expense",
        "baseType": "EXPENSE",
        "parentId": "acc_grp_60",
        "isGroup": true,
        "status": "ACTIVE"
    },
    {
        "id": "acc_grp_6106",
        "code": "6106",
        "name": "BIAYA PROMOSI & IKLAN",
        "type": "type_expense",
        "baseType": "EXPENSE",
        "parentId": "acc_grp_60",
        "isGroup": true,
        "status": "ACTIVE"
    },
    {
        "id": "acc_grp_6107",
        "code": "6107",
        "name": "BIAYA TELEPON / PULSA HP (SALES)",
        "type": "type_expense",
        "baseType": "EXPENSE",
        "parentId": "acc_grp_60",
        "isGroup": true,
        "status": "ACTIVE"
    },
    {
        "id": "acc_grp_6108",
        "code": "6108",
        "name": "Grup 6108",
        "type": "type_expense",
        "baseType": "EXPENSE",
        "parentId": "acc_grp_60",
        "isGroup": true,
        "status": "ACTIVE"
    },
    {
        "id": "acc_grp_70",
        "code": "70",
        "name": "BIAYA ADMINISTRASI & UMUM",
        "type": "type_expense",
        "baseType": "EXPENSE",
        "parentId": null,
        "isGroup": true,
        "status": "ACTIVE"
    },
    {
        "id": "acc_7101_01",
        "code": "7101.01",
        "name": "BIAYA GAJI (OFFICE)",
        "type": "type_expense",
        "accountType": "EXPENSE",
        "baseType": "EXPENSE",
        "parentId": "acc_grp_70",
        "isGroup": false,
        "status": "ACTIVE"
    },
    {
        "id": "acc_7101_02",
        "code": "7101.02",
        "name": "THR (OFFICE)",
        "type": "type_expense",
        "accountType": "EXPENSE",
        "baseType": "EXPENSE",
        "parentId": "acc_grp_70",
        "isGroup": false,
        "status": "ACTIVE"
    },
    {
        "id": "acc_5100_01",
        "code": "5100.01",
        "name": "Barang Jadi & Penolong",
        "type": "type_cogs",
        "accountType": "Harga Pokok Penjualan",
        "baseType": "EXPENSE",
        "parentId": "acc_grp_70",
        "isGroup": false,
        "status": "ACTIVE"
    },
    {
        "id": "acc_5101_01",
        "code": "5101.01",
        "name": "Harga Pokok Penjualan",
        "type": "type_cogs",
        "accountType": "Harga Pokok Penjualan",
        "baseType": "EXPENSE",
        "parentId": "acc_grp_70",
        "isGroup": false,
        "status": "ACTIVE"
    },
    {
        "id": "acc_5102_01",
        "code": "5102.01",
        "name": "Biaya Angkut / Logistik",
        "type": "type_cogs",
        "accountType": "Harga Pokok Penjualan",
        "baseType": "EXPENSE",
        "parentId": "acc_grp_70",
        "isGroup": false,
        "status": "ACTIVE"
    },
    {
        "id": "acc_5102_02",
        "code": "5102.02",
        "name": "Upah Tenaga Kerja Langsung",
        "type": "type_cogs",
        "accountType": "Harga Pokok Penjualan",
        "baseType": "EXPENSE",
        "parentId": "acc_grp_70",
        "isGroup": false,
        "status": "ACTIVE"
    },
    {
        "id": "acc_5102_03",
        "code": "5102.03",
        "name": "Biaya Sewa",
        "type": "type_cogs",
        "accountType": "Harga Pokok Penjualan",
        "baseType": "EXPENSE",
        "parentId": "acc_grp_70",
        "isGroup": false,
        "status": "ACTIVE"
    },
    {
        "id": "acc_5102_04",
        "code": "5102.04",
        "name": "Biaya Listrik / Air",
        "type": "type_cogs",
        "accountType": "Harga Pokok Penjualan",
        "baseType": "EXPENSE",
        "parentId": "acc_grp_70",
        "isGroup": false,
        "status": "ACTIVE"
    },
    {
        "id": "acc_5102_05",
        "code": "5102.05",
        "name": "Bahan Bakar",
        "type": "type_cogs",
        "accountType": "Harga Pokok Penjualan",
        "baseType": "EXPENSE",
        "parentId": "acc_grp_70",
        "isGroup": false,
        "status": "ACTIVE"
    },
    {
        "id": "acc_6200_01",
        "code": "6200.01",
        "name": "Gaji",
        "type": "type_expense",
        "accountType": "Beban",
        "baseType": "EXPENSE",
        "parentId": "acc_grp_70",
        "isGroup": false,
        "status": "ACTIVE"
    },
    {
        "id": "acc_6200_02",
        "code": "6200.02",
        "name": "Uang Makan",
        "type": "type_expense",
        "accountType": "Beban",
        "baseType": "EXPENSE",
        "parentId": "acc_grp_70",
        "isGroup": false,
        "status": "ACTIVE"
    },
    {
        "id": "acc_6200_03",
        "code": "6200.03",
        "name": "Lembur",
        "type": "type_expense",
        "accountType": "Beban",
        "baseType": "EXPENSE",
        "parentId": "acc_grp_70",
        "isGroup": false,
        "status": "ACTIVE"
    },
    {
        "id": "acc_6200_04",
        "code": "6200.04",
        "name": "THR",
        "type": "type_expense",
        "accountType": "Beban",
        "baseType": "EXPENSE",
        "parentId": "acc_grp_70",
        "isGroup": false,
        "status": "ACTIVE"
    },
    {
        "id": "acc_6200_05",
        "code": "6200.05",
        "name": "Bonus",
        "type": "type_expense",
        "accountType": "Beban",
        "baseType": "EXPENSE",
        "parentId": "acc_grp_70",
        "isGroup": false,
        "status": "ACTIVE"
    },
    {
        "id": "acc_6200_06",
        "code": "6200.06",
        "name": "Iuran BPJS Kesehataan",
        "type": "type_expense",
        "accountType": "Beban",
        "baseType": "EXPENSE",
        "parentId": "acc_grp_70",
        "isGroup": false,
        "status": "ACTIVE"
    },
    {
        "id": "acc_6200_07",
        "code": "6200.07",
        "name": "Iuran BPJS Ketenagakerjaan",
        "type": "type_expense",
        "accountType": "Beban",
        "baseType": "EXPENSE",
        "parentId": "acc_grp_70",
        "isGroup": false,
        "status": "ACTIVE"
    },
    {
        "id": "acc_6200_08",
        "code": "6200.08",
        "name": "PPh psl 21",
        "type": "type_expense",
        "accountType": "Beban",
        "baseType": "EXPENSE",
        "parentId": "acc_grp_70",
        "isGroup": false,
        "status": "ACTIVE"
    },
    {
        "id": "acc_6200_09",
        "code": "6200.09",
        "name": "Tunjangan Pengobatan",
        "type": "type_expense",
        "accountType": "Beban",
        "baseType": "EXPENSE",
        "parentId": "acc_grp_70",
        "isGroup": false,
        "status": "ACTIVE"
    },
    {
        "id": "acc_6200_10",
        "code": "6200.10",
        "name": "Tunjangan Lain-lain",
        "type": "type_expense",
        "accountType": "Beban",
        "baseType": "EXPENSE",
        "parentId": "acc_grp_70",
        "isGroup": false,
        "status": "ACTIVE"
    },
    {
        "id": "acc_6300_01",
        "code": "6300.01",
        "name": "Biaya Sales & Marketing",
        "type": "type_expense",
        "accountType": "Beban",
        "baseType": "EXPENSE",
        "parentId": "acc_grp_70",
        "isGroup": false,
        "status": "ACTIVE"
    },
    {
        "id": "acc_6300_02",
        "code": "6300.02",
        "name": "Biaya Sumbangan",
        "type": "type_expense",
        "accountType": "Beban",
        "baseType": "EXPENSE",
        "parentId": "acc_grp_70",
        "isGroup": false,
        "status": "ACTIVE"
    },
    {
        "id": "acc_6300_03",
        "code": "6300.03",
        "name": "Biaya Pameran Promosi & Iklan",
        "type": "type_expense",
        "accountType": "Beban",
        "baseType": "EXPENSE",
        "parentId": "acc_grp_70",
        "isGroup": false,
        "status": "ACTIVE"
    },
    {
        "id": "acc_6300_04",
        "code": "6300.04",
        "name": "Biaya Fee & Komisi",
        "type": "type_expense",
        "accountType": "Beban",
        "baseType": "EXPENSE",
        "parentId": "acc_grp_70",
        "isGroup": false,
        "status": "ACTIVE"
    },
    {
        "id": "acc_6300_05",
        "code": "6300.05",
        "name": "Biaya Sample Barang",
        "type": "type_expense",
        "accountType": "Beban",
        "baseType": "EXPENSE",
        "parentId": "acc_grp_70",
        "isGroup": false,
        "status": "ACTIVE"
    },
    {
        "id": "acc_6400_01",
        "code": "6400.01",
        "name": "Biaya Bahan Bakar /Toll/ Parkir",
        "type": "type_expense",
        "accountType": "Beban",
        "baseType": "EXPENSE",
        "parentId": "acc_grp_70",
        "isGroup": false,
        "status": "ACTIVE"
    },
    {
        "id": "acc_6400_02",
        "code": "6400.02",
        "name": "Biaya Ticket & Airport Tax",
        "type": "type_expense",
        "accountType": "Beban",
        "baseType": "EXPENSE",
        "parentId": "acc_grp_70",
        "isGroup": false,
        "status": "ACTIVE"
    },
    {
        "id": "acc_6400_03",
        "code": "6400.03",
        "name": "Biaya Visa/Paspor",
        "type": "type_expense",
        "accountType": "Beban",
        "baseType": "EXPENSE",
        "parentId": "acc_grp_70",
        "isGroup": false,
        "status": "ACTIVE"
    },
    {
        "id": "acc_6400_04",
        "code": "6400.04",
        "name": "Biaya Hotel",
        "type": "type_expense",
        "accountType": "Beban",
        "baseType": "EXPENSE",
        "parentId": "acc_grp_70",
        "isGroup": false,
        "status": "ACTIVE"
    },
    {
        "id": "acc_6400_05",
        "code": "6400.05",
        "name": "Biaya Transpor Lokal",
        "type": "type_expense",
        "accountType": "Beban",
        "baseType": "EXPENSE",
        "parentId": "acc_grp_70",
        "isGroup": false,
        "status": "ACTIVE"
    },
    {
        "id": "acc_6400_06",
        "code": "6400.06",
        "name": "Biaya Makan & Minum",
        "type": "type_expense",
        "accountType": "Beban",
        "baseType": "EXPENSE",
        "parentId": "acc_grp_70",
        "isGroup": false,
        "status": "ACTIVE"
    },
    {
        "id": "acc_6400_07",
        "code": "6400.07",
        "name": "Biaya Surat/Pajak Kendaraan",
        "type": "type_expense",
        "accountType": "Beban",
        "baseType": "EXPENSE",
        "parentId": "acc_grp_70",
        "isGroup": false,
        "status": "ACTIVE"
    },
    {
        "id": "acc_6400_08",
        "code": "6400.08",
        "name": "Biaya Pemeliharaan/Perbaikan Kendaraan",
        "type": "type_expense",
        "accountType": "Beban",
        "baseType": "EXPENSE",
        "parentId": "acc_grp_70",
        "isGroup": false,
        "status": "ACTIVE"
    },
    {
        "id": "acc_6400_09",
        "code": "6400.09",
        "name": "Biaya Listrik / Air",
        "type": "type_expense",
        "accountType": "Beban",
        "baseType": "EXPENSE",
        "parentId": "acc_grp_70",
        "isGroup": false,
        "status": "ACTIVE"
    },
    {
        "id": "acc_6400_10",
        "code": "6400.10",
        "name": "Biaya Telepon & Internet",
        "type": "type_expense",
        "accountType": "Beban",
        "baseType": "EXPENSE",
        "parentId": "acc_grp_70",
        "isGroup": false,
        "status": "ACTIVE"
    },
    {
        "id": "acc_6400_11",
        "code": "6400.11",
        "name": "Biaya Kebersihan & Keamanan Kantor",
        "type": "type_expense",
        "accountType": "Beban",
        "baseType": "EXPENSE",
        "parentId": "acc_grp_70",
        "isGroup": false,
        "status": "ACTIVE"
    },
    {
        "id": "acc_6400_12",
        "code": "6400.12",
        "name": "Biaya Alat Tulis Kantor",
        "type": "type_expense",
        "accountType": "Beban",
        "baseType": "EXPENSE",
        "parentId": "acc_grp_70",
        "isGroup": false,
        "status": "ACTIVE"
    },
    {
        "id": "acc_6400_13",
        "code": "6400.13",
        "name": "Biaya Pos/Kurir",
        "type": "type_expense",
        "accountType": "Beban",
        "baseType": "EXPENSE",
        "parentId": "acc_grp_70",
        "isGroup": false,
        "status": "ACTIVE"
    },
    {
        "id": "acc_6400_14",
        "code": "6400.14",
        "name": "Biaya Photocopy, Cetak, Laminating",
        "type": "type_expense",
        "accountType": "Beban",
        "baseType": "EXPENSE",
        "parentId": "acc_grp_70",
        "isGroup": false,
        "status": "ACTIVE"
    },
    {
        "id": "acc_6400_15",
        "code": "6400.15",
        "name": "Biaya Perlengkapan Kantor",
        "type": "type_expense",
        "accountType": "Beban",
        "baseType": "EXPENSE",
        "parentId": "acc_grp_70",
        "isGroup": false,
        "status": "ACTIVE"
    },
    {
        "id": "acc_6400_16",
        "code": "6400.16",
        "name": "Perlengkapan Produksi",
        "type": "type_expense",
        "accountType": "Beban",
        "baseType": "EXPENSE",
        "parentId": "acc_grp_70",
        "isGroup": false,
        "status": "ACTIVE"
    },
    {
        "id": "acc_6400_17",
        "code": "6400.17",
        "name": "Biaya Perbaikan dan Pemeliharaan Kantor",
        "type": "type_expense",
        "accountType": "Beban",
        "baseType": "EXPENSE",
        "parentId": "acc_grp_70",
        "isGroup": false,
        "status": "ACTIVE"
    },
    {
        "id": "acc_6400_18",
        "code": "6400.18",
        "name": "Biaya Kurir/Pos",
        "type": "type_expense",
        "accountType": "Beban",
        "baseType": "EXPENSE",
        "parentId": "acc_grp_70",
        "isGroup": false,
        "status": "ACTIVE"
    },
    {
        "id": "acc_6500_01",
        "code": "6500.01",
        "name": "Biaya Perizinan",
        "type": "type_expense",
        "accountType": "Beban",
        "baseType": "EXPENSE",
        "parentId": "acc_grp_70",
        "isGroup": false,
        "status": "ACTIVE"
    },
    {
        "id": "acc_6500_02",
        "code": "6500.02",
        "name": "Biaya Pajak Bumi Bangunan Kantor",
        "type": "type_expense",
        "accountType": "Beban",
        "baseType": "EXPENSE",
        "parentId": "acc_grp_70",
        "isGroup": false,
        "status": "ACTIVE"
    },
    {
        "id": "acc_6500_03",
        "code": "6500.03",
        "name": "Biaya Sanksi/Denda pajak",
        "type": "type_expense",
        "accountType": "Beban",
        "baseType": "EXPENSE",
        "parentId": "acc_grp_70",
        "isGroup": false,
        "status": "ACTIVE"
    },
    {
        "id": "acc_6500_04",
        "code": "6500.04",
        "name": "Biaya Notaris/ Konsultan",
        "type": "type_expense",
        "accountType": "Beban",
        "baseType": "EXPENSE",
        "parentId": "acc_grp_70",
        "isGroup": false,
        "status": "ACTIVE"
    },
    {
        "id": "acc_7100_01",
        "code": "7100.01",
        "name": "Biaya Penyusutan Tanah & Bangunan",
        "type": "type_expense",
        "accountType": "Beban",
        "baseType": "EXPENSE",
        "parentId": "acc_grp_70",
        "isGroup": false,
        "status": "ACTIVE"
    },
    {
        "id": "acc_7100_02",
        "code": "7100.02",
        "name": "Biaya Penyusutan Kendaraan",
        "type": "type_expense",
        "accountType": "Beban",
        "baseType": "EXPENSE",
        "parentId": "acc_grp_70",
        "isGroup": false,
        "status": "ACTIVE"
    },
    {
        "id": "acc_7100_03",
        "code": "7100.03",
        "name": "Biaya Penyusutan Mesin",
        "type": "type_expense",
        "accountType": "Beban",
        "baseType": "EXPENSE",
        "parentId": "acc_grp_70",
        "isGroup": false,
        "status": "ACTIVE"
    },
    {
        "id": "acc_7100_04",
        "code": "7100.04",
        "name": "Biaya Penyusutan Peralatan Kantor",
        "type": "type_expense",
        "accountType": "Beban",
        "baseType": "EXPENSE",
        "parentId": "acc_grp_70",
        "isGroup": false,
        "status": "ACTIVE"
    },
    {
        "id": "acc_7100_05",
        "code": "7100.05",
        "name": "Biaya Penyusutan Furniture",
        "type": "type_expense",
        "accountType": "Beban",
        "baseType": "EXPENSE",
        "parentId": "acc_grp_70",
        "isGroup": false,
        "status": "ACTIVE"
    },
    {
        "id": "acc_7200_01",
        "code": "7200.01",
        "name": "Biaya Bunga Bank",
        "type": "type_expense",
        "accountType": "Beban Lainnya",
        "baseType": "EXPENSE",
        "parentId": "acc_grp_70",
        "isGroup": false,
        "status": "ACTIVE"
    },
    {
        "id": "acc_7200_02",
        "code": "7200.02",
        "name": "Biaya Administrasi Bank",
        "type": "type_expense",
        "accountType": "Beban Lainnya",
        "baseType": "EXPENSE",
        "parentId": "acc_grp_70",
        "isGroup": false,
        "status": "ACTIVE"
    },
    {
        "id": "acc_7200_03",
        "code": "7200.03",
        "name": "Pajak Bunga",
        "type": "type_expense",
        "accountType": "Beban Lainnya",
        "baseType": "EXPENSE",
        "parentId": "acc_grp_70",
        "isGroup": false,
        "status": "ACTIVE"
    },
    {
        "id": "acc_7200_04",
        "code": "7200.04",
        "name": "Biaya Lain-lain",
        "type": "type_expense",
        "accountType": "Beban Lainnya",
        "baseType": "EXPENSE",
        "parentId": "acc_grp_70",
        "isGroup": false,
        "status": "ACTIVE"
    },
    {
        "id": "acc_8100_01",
        "code": "8100.01",
        "name": "Pendapat Bunga",
        "type": "type_other_income",
        "accountType": "Pendapatan Lainnya",
        "baseType": "INCOME",
        "parentId": "acc_grp_70",
        "isGroup": false,
        "status": "ACTIVE"
    },
    {
        "id": "acc_8100_02",
        "code": "8100.02",
        "name": "Laba / Rugi Penjualan Aktiva Tetap",
        "type": "type_other_income",
        "accountType": "Pendapatan Lainnya",
        "baseType": "INCOME",
        "parentId": "acc_grp_70",
        "isGroup": false,
        "status": "ACTIVE"
    },
    {
        "id": "acc_8100_03",
        "code": "8100.03",
        "name": "Pendapatan Lain-lain",
        "type": "type_other_income",
        "accountType": "Pendapatan Lainnya",
        "baseType": "INCOME",
        "parentId": "acc_grp_70",
        "isGroup": false,
        "status": "ACTIVE"
        }
            ]);
        }
    },

    // ─── SETTINGS / USER HELPERS ───────────────────────────────
    seedDefaultUsersAndRoles: () => {
        const defaultModules = ['penjualan', 'pembelian', 'logistik', 'produksi', 'finance', 'pengaturan'];
        const defaultPermissions = {};
        defaultModules.forEach(m => { defaultPermissions[m] = { view: true, edit: true }; });

        if (db.read('roles').length === 0) {
            db.save('roles', [
                { id: 'role_admin', name: 'Administrator', isSystem: true, permissions: defaultPermissions, createdAt: new Date().toISOString() },
                { id: 'role_user', name: 'User', isSystem: false, permissions: { penjualan: { view: true, edit: true }, pembelian: { view: true, edit: true }, logistik: { view: true, edit: true }, produksi: { view: true, edit: true }, finance: { view: true, edit: true }, pengaturan: { view: false, edit: false } }, createdAt: new Date().toISOString() }
            ]);
        }

        if (db.read('users').length === 0) {
            db.save('users', [
                { id: 'user_admin', fullName: 'Administrator', username: 'admin', email: 'admin@tanasubur.co.id', password: 'admin123', roleId: 'role_admin', status: 'AKTIF', avatar: 'AD', createdAt: new Date().toISOString() }
            ]);
        }
    }
};

// Initialize DB on load
db.init();
window.db = db;
// Migration: Ensure machines have types (Strict overwrite for Oven)
const mchs = db.read('machines');
let mchChanged = false;
mchs.forEach(m => {
    const isOven = m.name.toLowerCase().includes('oven');
    const correctType = isOven ? 'OVEN' : 'MACHINE';
    if (m.type !== correctType) {
        m.type = correctType;
        mchChanged = true;
    }
});
if (mchChanged) db.save('machines', mchs);

// db.seedDefaultFinanceData();
// db.seedDefaultUsersAndRoles();

// Migrate legacy users: add email if missing
(function migrateUsersToEmail() {
    const users = db.read('users');
    let changed = false;
    users.forEach(u => {
        if (!u.email) {
            u.email = u.id === 'user_admin' ? 'admin@tanasubur.co.id'
                : (u.username ? u.username + '@erp.local' : 'user' + u.id + '@erp.local');
            changed = true;
        }
    });
    if (changed) db.save('users', users);
})();

// Migrate accounts: add 'Piutang Usaha Lebih Bayar' if missing
(function migrateAccountsOverpay() {
    const accounts = db.read('accounts');
    if (accounts.length > 0 && !accounts.find(a => a.id === 'acc_ar_overpay')) {
        accounts.push({
            id: 'acc_ar_overpay',
            code: '2103', // Liability
            name: 'Piutang Usaha Lebih Bayar',
            type: 'LIABILITY',
            description: 'Kelebihan pembayaran dari customer (titipan)',
            status: 'ACTIVE'
        });
        db.save('accounts', accounts);
    }
})();

// ─── COA 2026 MIGRATION ─────────────────────────────────────────
(function migrateToCOA2026() {
    const MIGRATION_KEY = 'unityerp_coa_2026_applied_v1';
    if (!localStorage.getItem(MIGRATION_KEY)) {
        console.log('[DB] Applying COA 2026 Structure...');
        const newAccountTypes = [
    {
        "id": "type_asset",
        "name": "Aset / Aktiva",
        "base_type": "ASSET",
        "baseType": "ASSET"
    },
    {
        "id": "type_liability",
        "name": "Liabilitas / Hutang",
        "base_type": "LIABILITY",
        "baseType": "LIABILITY"
    },
    {
        "id": "type_equity",
        "name": "Ekuitas / Modal",
        "base_type": "EQUITY",
        "baseType": "EQUITY"
    },
    {
        "id": "type_income",
        "name": "Pendapatan",
        "base_type": "INCOME",
        "baseType": "INCOME"
    },
    {
        "id": "type_cogs",
        "name": "Harga Pokok Penjualan",
        "base_type": "EXPENSE",
        "baseType": "EXPENSE"
    },
    {
        "id": "type_expense",
        "name": "Beban / Biaya Operasional",
        "base_type": "EXPENSE",
        "baseType": "EXPENSE"
    },
    {
        "id": "type_other_income",
        "name": "Pendapatan Lainnya",
        "base_type": "INCOME",
        "baseType": "INCOME"
    },
    {
        "id": "type_other_expense",
        "name": "Beban Lainnya",
        "base_type": "EXPENSE",
        "baseType": "EXPENSE"
    }
];
        const newAccounts = [
    {
        "id": "acc_grp_11",
        "code": "11",
        "name": "KAS & BANK",
        "type": "type_asset",
        "baseType": "ASSET",
        "parentId": null,
        "isGroup": true,
        "status": "ACTIVE"
    },
    {
        "id": "acc_grp_1101",
        "code": "1101",
        "name": "KAS",
        "type": "type_asset",
        "baseType": "ASSET",
        "parentId": "acc_grp_11",
        "isGroup": true,
        "status": "ACTIVE"
    },
    {
        "id": "acc_1101_01",
        "code": "1101.01",
        "name": "KAS",
        "type": "type_asset",
        "accountType": "Kas/Bank",
        "baseType": "ASSET",
        "parentId": "acc_grp_1101",
        "isGroup": false,
        "status": "ACTIVE"
    },
    {
        "id": "acc_grp_1102",
        "code": "1102",
        "name": "BANK",
        "type": "type_asset",
        "baseType": "ASSET",
        "parentId": "acc_grp_11",
        "isGroup": true,
        "status": "ACTIVE"
    },
    {
        "id": "acc_1102_01",
        "code": "1102.01",
        "name": "BANK BCA TSN IDR_1188",
        "type": "type_asset",
        "accountType": "Kas/Bank",
        "baseType": "ASSET",
        "parentId": "acc_grp_1102",
        "isGroup": false,
        "status": "ACTIVE"
    },
    {
        "id": "acc_1102_07",
        "code": "1102.07",
        "name": "BANK BCA PTC IDR_2130",
        "type": "type_asset",
        "accountType": "Kas/Bank",
        "baseType": "ASSET",
        "parentId": "acc_grp_1102",
        "isGroup": false,
        "status": "ACTIVE"
    },
    {
        "id": "acc_1102_08",
        "code": "1102.08",
        "name": "BANK BRI PTC IDR_6505",
        "type": "type_asset",
        "accountType": "Kas/Bank",
        "baseType": "ASSET",
        "parentId": "acc_grp_1102",
        "isGroup": false,
        "status": "ACTIVE"
    },
    {
        "id": "acc_grp_1103",
        "code": "1103",
        "name": "AYAT SILANG",
        "type": "type_asset",
        "baseType": "ASSET",
        "parentId": "acc_grp_11",
        "isGroup": true,
        "status": "ACTIVE"
    },
    {
        "id": "acc_1103_01",
        "code": "1103.01",
        "name": "AYAT SILANG KAS - BANK",
        "type": "type_asset",
        "accountType": "Kas/Bank",
        "baseType": "ASSET",
        "parentId": "acc_grp_1103",
        "isGroup": false,
        "status": "ACTIVE"
    },
    {
        "id": "acc_grp_1201",
        "code": "1201",
        "name": "PIUTANG USAHA",
        "type": "type_asset",
        "baseType": "ASSET",
        "parentId": "acc_grp_11",
        "isGroup": true,
        "status": "ACTIVE"
    },
    {
        "id": "acc_1201_01",
        "code": "1201.01",
        "name": "PIUTANG USAHA",
        "type": "type_asset",
        "accountType": "Piutang Usaha",
        "baseType": "ASSET",
        "parentId": "acc_grp_1201",
        "isGroup": false,
        "status": "ACTIVE"
    },
    {
        "id": "acc_1201_02",
        "code": "1201.02",
        "name": "PIUTANG USAHA RAGU-2",
        "type": "type_asset",
        "accountType": "Piutang Usaha",
        "baseType": "ASSET",
        "parentId": "acc_grp_1201",
        "isGroup": false,
        "status": "ACTIVE"
    },
    {
        "id": "acc_grp_1202",
        "code": "1202",
        "name": "PIUTANG KARYAWAN",
        "type": "type_asset",
        "baseType": "ASSET",
        "parentId": "acc_grp_11",
        "isGroup": true,
        "status": "ACTIVE"
    },
    {
        "id": "acc_1202_01",
        "code": "1202.01",
        "name": "PIUTANG KARYAWAN TETAP",
        "type": "type_asset",
        "accountType": "Aktiva Lancar Lainnya",
        "baseType": "ASSET",
        "parentId": "acc_grp_1202",
        "isGroup": false,
        "status": "ACTIVE"
    },
    {
        "id": "acc_1202_02",
        "code": "1202.02",
        "name": "PIUTANG KARYAWAN LAINNYA",
        "type": "type_asset",
        "accountType": "Aktiva Lancar Lainnya",
        "baseType": "ASSET",
        "parentId": "acc_grp_1202",
        "isGroup": false,
        "status": "ACTIVE"
    },
    {
        "id": "acc_1202_07",
        "code": "1202.07",
        "name": "PIUTANG DIREKSI",
        "type": "type_asset",
        "accountType": "Aktiva Lancar Lainnya",
        "baseType": "ASSET",
        "parentId": "acc_grp_1202",
        "isGroup": false,
        "status": "ACTIVE"
    },
    {
        "id": "acc_1202_08",
        "code": "1202.08",
        "name": "PIUTANG PEMEGANG SAHAM",
        "type": "type_asset",
        "accountType": "Aktiva Lancar Lainnya",
        "baseType": "ASSET",
        "parentId": "acc_grp_1202",
        "isGroup": false,
        "status": "ACTIVE"
    },
    {
        "id": "acc_grp_13",
        "code": "13",
        "name": "PERSEDIAAN",
        "type": "type_asset",
        "baseType": "ASSET",
        "parentId": null,
        "isGroup": true,
        "status": "ACTIVE"
    },
    {
        "id": "acc_1301_01",
        "code": "1301.01",
        "name": "PERSEDIAAN BAHAN BAKU",
        "type": "type_asset",
        "accountType": "Persediaan",
        "baseType": "ASSET",
        "parentId": "acc_grp_13",
        "isGroup": false,
        "status": "ACTIVE"
    },
    {
        "id": "acc_1301_02",
        "code": "1301.02",
        "name": "PERSEDIAAN BAHAN PEMBANTU",
        "type": "type_asset",
        "accountType": "Persediaan",
        "baseType": "ASSET",
        "parentId": "acc_grp_13",
        "isGroup": false,
        "status": "ACTIVE"
    },
    {
        "id": "acc_1301_03",
        "code": "1301.03",
        "name": "PERSEDIAAN BAHAN DALAM PROSES",
        "type": "type_asset",
        "accountType": "Persediaan",
        "baseType": "ASSET",
        "parentId": "acc_grp_13",
        "isGroup": false,
        "status": "ACTIVE"
    },
    {
        "id": "acc_1301_04",
        "code": "1301.04",
        "name": "PERSEDIAAN BARANG JADI",
        "type": "type_asset",
        "accountType": "Persediaan",
        "baseType": "ASSET",
        "parentId": "acc_grp_13",
        "isGroup": false,
        "status": "ACTIVE"
    },
    {
        "id": "acc_1302_01",
        "code": "1302.01",
        "name": "PERSEDIAAN SPARE PARTS - MESIN EXTRUDER",
        "type": "type_asset",
        "accountType": "Persediaan",
        "baseType": "ASSET",
        "parentId": "acc_grp_13",
        "isGroup": false,
        "status": "ACTIVE"
    },
    {
        "id": "acc_1302_02",
        "code": "1302.02",
        "name": "PERSEDIAAN SPARE PARTS - MESIN LAINNYA",
        "type": "type_asset",
        "accountType": "Persediaan",
        "baseType": "ASSET",
        "parentId": "acc_grp_13",
        "isGroup": false,
        "status": "ACTIVE"
    },
    {
        "id": "acc_1303_01",
        "code": "1303.01",
        "name": "PERSEDIAAN ELPIJI",
        "type": "type_asset",
        "accountType": "Persediaan",
        "baseType": "ASSET",
        "parentId": "acc_grp_13",
        "isGroup": false,
        "status": "ACTIVE"
    },
    {
        "id": "acc_1303_02",
        "code": "1303.02",
        "name": "PERSEDIAAN BAHAN BAKAR & PELUMAS",
        "type": "type_asset",
        "accountType": "Persediaan",
        "baseType": "ASSET",
        "parentId": "acc_grp_13",
        "isGroup": false,
        "status": "ACTIVE"
    },
    {
        "id": "acc_grp_14",
        "code": "14",
        "name": "PEMBAYARAN DIMUKA",
        "type": "type_asset",
        "baseType": "ASSET",
        "parentId": null,
        "isGroup": true,
        "status": "ACTIVE"
    },
    {
        "id": "acc_grp_1401",
        "code": "1401",
        "name": "UANG MUKA PEMBELIAN",
        "type": "type_asset",
        "baseType": "ASSET",
        "parentId": "acc_grp_14",
        "isGroup": true,
        "status": "ACTIVE"
    },
    {
        "id": "acc_1401_01",
        "code": "1401.01",
        "name": "UM PEMBELIAN AKTIVA TETAP",
        "type": "type_asset",
        "accountType": "Aktiva Lancar Lainnya",
        "baseType": "ASSET",
        "parentId": "acc_grp_1401",
        "isGroup": false,
        "status": "ACTIVE"
    },
    {
        "id": "acc_1401_02",
        "code": "1401.02",
        "name": "UM PEMBELIAN PERSEDIAAN",
        "type": "type_asset",
        "accountType": "Aktiva Lancar Lainnya",
        "baseType": "ASSET",
        "parentId": "acc_grp_1401",
        "isGroup": false,
        "status": "ACTIVE"
    },
    {
        "id": "acc_grp_1402",
        "code": "1402",
        "name": "PAJAK DIBAYAR DIMUKA",
        "type": "type_asset",
        "baseType": "ASSET",
        "parentId": "acc_grp_14",
        "isGroup": true,
        "status": "ACTIVE"
    },
    {
        "id": "acc_1402_01",
        "code": "1402.01",
        "name": "UM PPh Psl 21 / 26",
        "type": "type_asset",
        "accountType": "Aktiva Lancar Lainnya",
        "baseType": "ASSET",
        "parentId": "acc_grp_1402",
        "isGroup": false,
        "status": "ACTIVE"
    },
    {
        "id": "acc_1402_02",
        "code": "1402.02",
        "name": "UM PPh Psl 22",
        "type": "type_asset",
        "accountType": "Aktiva Lancar Lainnya",
        "baseType": "ASSET",
        "parentId": "acc_grp_1402",
        "isGroup": false,
        "status": "ACTIVE"
    },
    {
        "id": "acc_1402_03",
        "code": "1402.03",
        "name": "UM PPh Psl 23",
        "type": "type_asset",
        "accountType": "Aktiva Lancar Lainnya",
        "baseType": "ASSET",
        "parentId": "acc_grp_1402",
        "isGroup": false,
        "status": "ACTIVE"
    },
    {
        "id": "acc_1402_04",
        "code": "1402.04",
        "name": "UM PPh Psl 25 / 29",
        "type": "type_asset",
        "accountType": "Aktiva Lancar Lainnya",
        "baseType": "ASSET",
        "parentId": "acc_grp_1402",
        "isGroup": false,
        "status": "ACTIVE"
    },
    {
        "id": "acc_1402_05",
        "code": "1402.05",
        "name": "UM PPh Psl 4 (2)",
        "type": "type_asset",
        "accountType": "Aktiva Lancar Lainnya",
        "baseType": "ASSET",
        "parentId": "acc_grp_1402",
        "isGroup": false,
        "status": "ACTIVE"
    },
    {
        "id": "acc_grp_1403",
        "code": "1403",
        "name": "BIAYA DIBAYAR DIMUKA",
        "type": "type_asset",
        "baseType": "ASSET",
        "parentId": "acc_grp_14",
        "isGroup": true,
        "status": "ACTIVE"
    },
    {
        "id": "acc_1403_01",
        "code": "1403.01",
        "name": "BDD - BIAYA SEWA",
        "type": "type_asset",
        "accountType": "Aktiva Lancar Lainnya",
        "baseType": "ASSET",
        "parentId": "acc_grp_1403",
        "isGroup": false,
        "status": "ACTIVE"
    },
    {
        "id": "acc_grp_1409",
        "code": "1409",
        "name": "PIUTANG LAIN-2",
        "type": "type_asset",
        "baseType": "ASSET",
        "parentId": "acc_grp_14",
        "isGroup": true,
        "status": "ACTIVE"
    },
    {
        "id": "acc_1409_01",
        "code": "1409.01",
        "name": "BPJS KETENAGAKERJAAN",
        "type": "type_asset",
        "accountType": "Aktiva Lancar Lainnya",
        "baseType": "ASSET",
        "parentId": "acc_grp_1409",
        "isGroup": false,
        "status": "ACTIVE"
    },
    {
        "id": "acc_1409_02",
        "code": "1409.02",
        "name": "BPJS KESEHATAN",
        "type": "type_asset",
        "accountType": "Aktiva Lancar Lainnya",
        "baseType": "ASSET",
        "parentId": "acc_grp_1409",
        "isGroup": false,
        "status": "ACTIVE"
    },
    {
        "id": "acc_grp_1410",
        "code": "1410",
        "name": "BIAYA DITANGGUHKAN",
        "type": "type_asset",
        "baseType": "ASSET",
        "parentId": "acc_grp_14",
        "isGroup": true,
        "status": "ACTIVE"
    },
    {
        "id": "acc_1410_01",
        "code": "1410.01",
        "name": "Biaya Ditangguhkan",
        "type": "type_asset",
        "accountType": "Aktiva Lancar Lainnya",
        "baseType": "ASSET",
        "parentId": "acc_grp_1410",
        "isGroup": false,
        "status": "ACTIVE"
    },
    {
        "id": "acc_1410_02",
        "code": "1410.02",
        "name": "Proyek Dalam Pengerjaan",
        "type": "type_asset",
        "accountType": "Aktiva Lancar Lainnya",
        "baseType": "ASSET",
        "parentId": "acc_grp_1410",
        "isGroup": false,
        "status": "ACTIVE"
    },
    {
        "id": "acc_grp_15",
        "code": "15",
        "name": "AKTIVA TETAP",
        "type": "type_asset",
        "baseType": "ASSET",
        "parentId": null,
        "isGroup": true,
        "status": "ACTIVE"
    },
    {
        "id": "acc_1501_01",
        "code": "1501.01",
        "name": "TANAH",
        "type": "type_asset",
        "accountType": "Aktiva Tetap",
        "baseType": "ASSET",
        "parentId": "acc_grp_15",
        "isGroup": false,
        "status": "ACTIVE"
    },
    {
        "id": "acc_1501_02",
        "code": "1501.02",
        "name": "BANGUNAN",
        "type": "type_asset",
        "accountType": "Aktiva Tetap",
        "baseType": "ASSET",
        "parentId": "acc_grp_15",
        "isGroup": false,
        "status": "ACTIVE"
    },
    {
        "id": "acc_1501_03",
        "code": "1501.03",
        "name": "MESIN-MESIN",
        "type": "type_asset",
        "accountType": "Aktiva Tetap",
        "baseType": "ASSET",
        "parentId": "acc_grp_15",
        "isGroup": false,
        "status": "ACTIVE"
    },
    {
        "id": "acc_1501_04",
        "code": "1501.04",
        "name": "KENDARAAN",
        "type": "type_asset",
        "accountType": "Aktiva Tetap",
        "baseType": "ASSET",
        "parentId": "acc_grp_15",
        "isGroup": false,
        "status": "ACTIVE"
    },
    {
        "id": "acc_1501_05",
        "code": "1501.05",
        "name": "PERLENGKAPAN KANTOR",
        "type": "type_asset",
        "accountType": "Aktiva Tetap",
        "baseType": "ASSET",
        "parentId": "acc_grp_15",
        "isGroup": false,
        "status": "ACTIVE"
    },
    {
        "id": "acc_1502_01",
        "code": "1502.01",
        "name": "AKUMULASI PENYUSUTAN BANGUNAN",
        "type": "type_asset",
        "accountType": "Aktiva Tetap",
        "baseType": "ASSET",
        "parentId": "acc_grp_15",
        "isGroup": false,
        "status": "ACTIVE"
    },
    {
        "id": "acc_1502_02",
        "code": "1502.02",
        "name": "AKUMULASI PENYUSUTAN MESIN-MESIN",
        "type": "type_asset",
        "accountType": "Aktiva Tetap",
        "baseType": "ASSET",
        "parentId": "acc_grp_15",
        "isGroup": false,
        "status": "ACTIVE"
    },
    {
        "id": "acc_1502_03",
        "code": "1502.03",
        "name": "AKUMULASI PENYUSUTAN KENDARAAN",
        "type": "type_asset",
        "accountType": "Aktiva Tetap",
        "baseType": "ASSET",
        "parentId": "acc_grp_15",
        "isGroup": false,
        "status": "ACTIVE"
    },
    {
        "id": "acc_1502_04",
        "code": "1502.04",
        "name": "AKUMULASI PENYUSUTAN PERLENGKAPAN KANTOR",
        "type": "type_asset",
        "accountType": "Aktiva Tetap",
        "baseType": "ASSET",
        "parentId": "acc_grp_15",
        "isGroup": false,
        "status": "ACTIVE"
    },
    {
        "id": "acc_grp_21",
        "code": "21",
        "name": "HUTANG LANCAR",
        "type": "type_liability",
        "baseType": "LIABILITY",
        "parentId": null,
        "isGroup": true,
        "status": "ACTIVE"
    },
    {
        "id": "acc_grp_2101",
        "code": "2101",
        "name": "HUTANG USAHA",
        "type": "type_liability",
        "baseType": "LIABILITY",
        "parentId": "acc_grp_21",
        "isGroup": true,
        "status": "ACTIVE"
    },
    {
        "id": "acc_2101_01",
        "code": "2101.01",
        "name": "HUTANG USAHA IDR",
        "type": "type_liability",
        "accountType": "Hutang Usaha",
        "baseType": "LIABILITY",
        "parentId": "acc_grp_2101",
        "isGroup": false,
        "status": "ACTIVE"
    },
    {
        "id": "acc_grp_22",
        "code": "22",
        "name": "HUTANG BANK",
        "type": "type_liability",
        "baseType": "LIABILITY",
        "parentId": null,
        "isGroup": true,
        "status": "ACTIVE"
    },
    {
        "id": "acc_2201_01",
        "code": "2201.01",
        "name": "HUTANG PINJAMAN BPR",
        "type": "type_liability",
        "accountType": "Hutang Lancar Lainnya",
        "baseType": "LIABILITY",
        "parentId": "acc_grp_22",
        "isGroup": false,
        "status": "ACTIVE"
    },
    {
        "id": "acc_grp_23",
        "code": "23",
        "name": "HUTANG PAJAK",
        "type": "type_liability",
        "baseType": "LIABILITY",
        "parentId": null,
        "isGroup": true,
        "status": "ACTIVE"
    },
    {
        "id": "acc_grp_2301",
        "code": "2301",
        "name": "PAJAK PERTAMBAHAN NILAI (PPN)",
        "type": "type_liability",
        "baseType": "LIABILITY",
        "parentId": "acc_grp_23",
        "isGroup": true,
        "status": "ACTIVE"
    },
    {
        "id": "acc_2301_01",
        "code": "2301.01",
        "name": "PPN MASUKAN",
        "type": "type_liability",
        "accountType": "Hutang Lancar Lainnya",
        "baseType": "LIABILITY",
        "parentId": "acc_grp_2301",
        "isGroup": false,
        "status": "ACTIVE"
    },
    {
        "id": "acc_2301_02",
        "code": "2301.02",
        "name": "PPN KELUARAN",
        "type": "type_liability",
        "accountType": "Hutang Lancar Lainnya",
        "baseType": "LIABILITY",
        "parentId": "acc_grp_2301",
        "isGroup": false,
        "status": "ACTIVE"
    },
    {
        "id": "acc_2301_03",
        "code": "2301.03",
        "name": "HUTANG PPN YMH DIBAYAR",
        "type": "type_liability",
        "accountType": "Hutang Lancar Lainnya",
        "baseType": "LIABILITY",
        "parentId": "acc_grp_2301",
        "isGroup": false,
        "status": "ACTIVE"
    },
    {
        "id": "acc_2302_01",
        "code": "2302.01",
        "name": "PPh pasal 21 / 26",
        "type": "type_liability",
        "accountType": "Hutang Lancar Lainnya",
        "baseType": "LIABILITY",
        "parentId": "acc_grp_23",
        "isGroup": false,
        "status": "ACTIVE"
    },
    {
        "id": "acc_2303_01",
        "code": "2303.01",
        "name": "PPh pasal 25 / 29",
        "type": "type_liability",
        "accountType": "Hutang Lancar Lainnya",
        "baseType": "LIABILITY",
        "parentId": "acc_grp_23",
        "isGroup": false,
        "status": "ACTIVE"
    },
    {
        "id": "acc_2304_01",
        "code": "2304.01",
        "name": "PPh pasal 4 (2)",
        "type": "type_liability",
        "accountType": "Hutang Lancar Lainnya",
        "baseType": "LIABILITY",
        "parentId": "acc_grp_23",
        "isGroup": false,
        "status": "ACTIVE"
    },
    {
        "id": "acc_2305_01",
        "code": "2305.01",
        "name": "PPh pasal 22",
        "type": "type_liability",
        "accountType": "Hutang Lancar Lainnya",
        "baseType": "LIABILITY",
        "parentId": "acc_grp_23",
        "isGroup": false,
        "status": "ACTIVE"
    },
    {
        "id": "acc_2306_01",
        "code": "2306.01",
        "name": "PPh pasal 23",
        "type": "type_liability",
        "accountType": "Hutang Lancar Lainnya",
        "baseType": "LIABILITY",
        "parentId": "acc_grp_23",
        "isGroup": false,
        "status": "ACTIVE"
    },
    {
        "id": "acc_grp_24",
        "code": "24",
        "name": "HUTANG BIAYA OPERASIONAL YANG MASIH HARUS DIBAYAR (YADIB)",
        "type": "type_liability",
        "baseType": "LIABILITY",
        "parentId": null,
        "isGroup": true,
        "status": "ACTIVE"
    },
    {
        "id": "acc_2401_01",
        "code": "2401.01",
        "name": "YADIB - BIAYA PABRIKASI",
        "type": "type_liability",
        "accountType": "Hutang Lancar Lainnya",
        "baseType": "LIABILITY",
        "parentId": "acc_grp_24",
        "isGroup": false,
        "status": "ACTIVE"
    },
    {
        "id": "acc_2402_01",
        "code": "2402.01",
        "name": "YADIB - BIAYA PENJUALAN",
        "type": "type_liability",
        "accountType": "Hutang Lancar Lainnya",
        "baseType": "LIABILITY",
        "parentId": "acc_grp_24",
        "isGroup": false,
        "status": "ACTIVE"
    },
    {
        "id": "acc_2403_01",
        "code": "2403.01",
        "name": "YADIB - BIAYA ADM & UMUM",
        "type": "type_liability",
        "accountType": "Hutang Lancar Lainnya",
        "baseType": "LIABILITY",
        "parentId": "acc_grp_24",
        "isGroup": false,
        "status": "ACTIVE"
    },
    {
        "id": "acc_2404_01",
        "code": "2404.01",
        "name": "YADIB - BIAYA LAIN-2",
        "type": "type_liability",
        "accountType": "Hutang Lancar Lainnya",
        "baseType": "LIABILITY",
        "parentId": "acc_grp_24",
        "isGroup": false,
        "status": "ACTIVE"
    },
    {
        "id": "acc_grp_25",
        "code": "25",
        "name": "PENDAPATAN DITERIMA DIMUKA",
        "type": "type_liability",
        "baseType": "LIABILITY",
        "parentId": null,
        "isGroup": true,
        "status": "ACTIVE"
    },
    {
        "id": "acc_grp_26",
        "code": "26",
        "name": "HUTANG LEASING",
        "type": "type_liability",
        "baseType": "LIABILITY",
        "parentId": null,
        "isGroup": true,
        "status": "ACTIVE"
    },
    {
        "id": "acc_grp_27",
        "code": "27",
        "name": "HUTANG LAIN-LAIN",
        "type": "type_liability",
        "baseType": "LIABILITY",
        "parentId": null,
        "isGroup": true,
        "status": "ACTIVE"
    },
    {
        "id": "acc_2701_01",
        "code": "2701.01",
        "name": "BPJS KETENAGAKERJAAN",
        "type": "type_liability",
        "accountType": "Hutang Lancar Lainnya",
        "baseType": "LIABILITY",
        "parentId": "acc_grp_27",
        "isGroup": false,
        "status": "ACTIVE"
    },
    {
        "id": "acc_2701_02",
        "code": "2701.02",
        "name": "BPJS KESEHATAN",
        "type": "type_liability",
        "accountType": "Hutang Lancar Lainnya",
        "baseType": "LIABILITY",
        "parentId": "acc_grp_27",
        "isGroup": false,
        "status": "ACTIVE"
    },
    {
        "id": "acc_grp_29",
        "code": "29",
        "name": "HUTANG JANGKA PANJANG",
        "type": "type_liability",
        "baseType": "LIABILITY",
        "parentId": null,
        "isGroup": true,
        "status": "ACTIVE"
    },
    {
        "id": "acc_2901_01",
        "code": "2901.01",
        "name": "HUTANG KEPADA PEMEGANG SAHAM",
        "type": "type_liability",
        "accountType": "Hutang Lancar Lainnya",
        "baseType": "LIABILITY",
        "parentId": "acc_grp_29",
        "isGroup": false,
        "status": "ACTIVE"
    },
    {
        "id": "acc_2902_01",
        "code": "2902.01",
        "name": "HUTANG DEVIDEN",
        "type": "type_liability",
        "accountType": "Hutang Lancar Lainnya",
        "baseType": "LIABILITY",
        "parentId": "acc_grp_29",
        "isGroup": false,
        "status": "ACTIVE"
    },
    {
        "id": "acc_grp_30",
        "code": "30",
        "name": "MODAL & EKUITAS",
        "type": "type_equity",
        "baseType": "EQUITY",
        "parentId": null,
        "isGroup": true,
        "status": "ACTIVE"
    },
    {
        "id": "acc_3101_01",
        "code": "3101.01",
        "name": "MODAL SAHAM",
        "type": "type_equity",
        "accountType": "Modal & Ekuitas",
        "baseType": "EQUITY",
        "parentId": "acc_grp_30",
        "isGroup": false,
        "status": "ACTIVE"
    },
    {
        "id": "acc_3201_01",
        "code": "3201.01",
        "name": "LABA RUGI DITAHAN",
        "type": "type_equity",
        "accountType": "Modal & Ekuitas",
        "baseType": "EQUITY",
        "parentId": "acc_grp_30",
        "isGroup": false,
        "status": "ACTIVE"
    },
    {
        "id": "acc_3201_02",
        "code": "3201.02",
        "name": "LABA RUGI TAHUN BERJALAN",
        "type": "type_equity",
        "accountType": "Modal & Ekuitas",
        "baseType": "EQUITY",
        "parentId": "acc_grp_30",
        "isGroup": false,
        "status": "ACTIVE"
    },
    {
        "id": "acc_grp_40",
        "code": "40",
        "name": "PENDAPATAN",
        "type": "type_income",
        "baseType": "INCOME",
        "parentId": null,
        "isGroup": true,
        "status": "ACTIVE"
    },
    {
        "id": "acc_grp_4101",
        "code": "4101",
        "name": "PENJUALAN SNACK",
        "type": "type_income",
        "baseType": "INCOME",
        "parentId": "acc_grp_40",
        "isGroup": true,
        "status": "ACTIVE"
    },
    {
        "id": "acc_grp_4201",
        "code": "4201",
        "name": "RETUR PENJUALAN SNACK",
        "type": "type_income",
        "baseType": "INCOME",
        "parentId": "acc_grp_40",
        "isGroup": true,
        "status": "ACTIVE"
    },
    {
        "id": "acc_grp_4301",
        "code": "4301",
        "name": "POTONGAN PENJUALAN",
        "type": "type_income",
        "baseType": "INCOME",
        "parentId": "acc_grp_40",
        "isGroup": true,
        "status": "ACTIVE"
    },
    {
        "id": "acc_grp_4701",
        "code": "4701",
        "name": "PENJUALAN LAINNYA",
        "type": "type_income",
        "baseType": "INCOME",
        "parentId": "acc_grp_40",
        "isGroup": true,
        "status": "ACTIVE"
    },
    {
        "id": "acc_4701_01",
        "code": "4701.01",
        "name": "PENJUALAN BAHAN BAKU",
        "type": "type_income",
        "accountType": "INCOME",
        "baseType": "INCOME",
        "parentId": "acc_grp_4701",
        "isGroup": false,
        "status": "ACTIVE"
    },
    {
        "id": "acc_4701_02",
        "code": "4701.02",
        "name": "PENJUALAN BAHAN PENOLONG",
        "type": "type_income",
        "accountType": "INCOME",
        "baseType": "INCOME",
        "parentId": "acc_grp_4701",
        "isGroup": false,
        "status": "ACTIVE"
    },
    {
        "id": "acc_4701_03",
        "code": "4701.03",
        "name": "PENJUALAN BUMBU JADI",
        "type": "type_income",
        "accountType": "INCOME",
        "baseType": "INCOME",
        "parentId": "acc_grp_4701",
        "isGroup": false,
        "status": "ACTIVE"
    },
    {
        "id": "acc_grp_50",
        "code": "50",
        "name": "HARGA POKOK PENJUALAN",
        "type": "type_cogs",
        "baseType": "EXPENSE",
        "parentId": null,
        "isGroup": true,
        "status": "ACTIVE"
    },
    {
        "id": "acc_grp_5101",
        "code": "5101",
        "name": "HARGA POKOK PENJUALAN",
        "type": "type_cogs",
        "baseType": "EXPENSE",
        "parentId": "acc_grp_50",
        "isGroup": true,
        "status": "ACTIVE"
    },
    {
        "id": "acc_grp_5201",
        "code": "5201",
        "name": "HARGA POKOK PENJUALAN LAINNYA",
        "type": "type_cogs",
        "baseType": "EXPENSE",
        "parentId": "acc_grp_50",
        "isGroup": true,
        "status": "ACTIVE"
    },
    {
        "id": "acc_grp_5301",
        "code": "5301",
        "name": "RETUR HPP",
        "type": "type_cogs",
        "baseType": "EXPENSE",
        "parentId": "acc_grp_50",
        "isGroup": true,
        "status": "ACTIVE"
    },
    {
        "id": "acc_grp_5401",
        "code": "5401",
        "name": "BARANG DALAM PROSES",
        "type": "type_cogs",
        "baseType": "EXPENSE",
        "parentId": "acc_grp_50",
        "isGroup": true,
        "status": "ACTIVE"
    },
    {
        "id": "acc_5401_01",
        "code": "5401.01",
        "name": "BDP AWAL",
        "type": "type_cogs",
        "accountType": "EXPENSE",
        "baseType": "EXPENSE",
        "parentId": "acc_grp_5401",
        "isGroup": false,
        "status": "ACTIVE"
    },
    {
        "id": "acc_5401_02",
        "code": "5401.02",
        "name": "BDP AKHIR",
        "type": "type_cogs",
        "accountType": "EXPENSE",
        "baseType": "EXPENSE",
        "parentId": "acc_grp_5401",
        "isGroup": false,
        "status": "ACTIVE"
    },
    {
        "id": "acc_grp_5501",
        "code": "5501",
        "name": "BARANG JADI",
        "type": "type_cogs",
        "baseType": "EXPENSE",
        "parentId": "acc_grp_50",
        "isGroup": true,
        "status": "ACTIVE"
    },
    {
        "id": "acc_5501_01",
        "code": "5501.01",
        "name": "BARANG JADI AWAL",
        "type": "type_cogs",
        "accountType": "EXPENSE",
        "baseType": "EXPENSE",
        "parentId": "acc_grp_5501",
        "isGroup": false,
        "status": "ACTIVE"
    },
    {
        "id": "acc_5501_02",
        "code": "5501.02",
        "name": "BARANG JADI AKHIR",
        "type": "type_cogs",
        "accountType": "EXPENSE",
        "baseType": "EXPENSE",
        "parentId": "acc_grp_5501",
        "isGroup": false,
        "status": "ACTIVE"
    },
    {
        "id": "acc_grp_5701",
        "code": "5701",
        "name": "BIAYA PRODUKSI / PABRIKASI",
        "type": "type_cogs",
        "baseType": "EXPENSE",
        "parentId": "acc_grp_50",
        "isGroup": true,
        "status": "ACTIVE"
    },
    {
        "id": "acc_5701_01",
        "code": "5701.01",
        "name": "BIAYA GAJI TK LANGSUNG",
        "type": "type_cogs",
        "accountType": "EXPENSE",
        "baseType": "EXPENSE",
        "parentId": "acc_grp_5701",
        "isGroup": false,
        "status": "ACTIVE"
    },
    {
        "id": "acc_5701_02",
        "code": "5701.02",
        "name": "THR / BONUS TK LANGSUNG",
        "type": "type_cogs",
        "accountType": "EXPENSE",
        "baseType": "EXPENSE",
        "parentId": "acc_grp_5701",
        "isGroup": false,
        "status": "ACTIVE"
    },
    {
        "id": "acc_5701_03",
        "code": "5701.03",
        "name": "BPJS TK LANGSUNG",
        "type": "type_cogs",
        "accountType": "EXPENSE",
        "baseType": "EXPENSE",
        "parentId": "acc_grp_5701",
        "isGroup": false,
        "status": "ACTIVE"
    },
    {
        "id": "acc_5701_04",
        "code": "5701.04",
        "name": "PENGOBATAN TK LANGSUNG",
        "type": "type_cogs",
        "accountType": "EXPENSE",
        "baseType": "EXPENSE",
        "parentId": "acc_grp_5701",
        "isGroup": false,
        "status": "ACTIVE"
    },
    {
        "id": "acc_5702_01",
        "code": "5702.01",
        "name": "PEMAKAIAN ELPIJI",
        "type": "type_cogs",
        "accountType": "EXPENSE",
        "baseType": "EXPENSE",
        "parentId": "acc_grp_50",
        "isGroup": false,
        "status": "ACTIVE"
    },
    {
        "id": "acc_5703_01",
        "code": "5703.01",
        "name": "PLN",
        "type": "type_cogs",
        "accountType": "EXPENSE",
        "baseType": "EXPENSE",
        "parentId": "acc_grp_50",
        "isGroup": false,
        "status": "ACTIVE"
    },
    {
        "id": "acc_5704_01",
        "code": "5704.01",
        "name": "PEMAKAIAN SPARE PARTS",
        "type": "type_cogs",
        "accountType": "EXPENSE",
        "baseType": "EXPENSE",
        "parentId": "acc_grp_50",
        "isGroup": false,
        "status": "ACTIVE"
    },
    {
        "id": "acc_5705_01",
        "code": "5705.01",
        "name": "PEMELIHARAAN MESIN-2 PRODUKSI",
        "type": "type_cogs",
        "accountType": "EXPENSE",
        "baseType": "EXPENSE",
        "parentId": "acc_grp_50",
        "isGroup": false,
        "status": "ACTIVE"
    },
    {
        "id": "acc_5706_01",
        "code": "5706.01",
        "name": "BEBAN PRODUKSI LAINNYA",
        "type": "type_cogs",
        "accountType": "EXPENSE",
        "baseType": "EXPENSE",
        "parentId": "acc_grp_50",
        "isGroup": false,
        "status": "ACTIVE"
    },
    {
        "id": "acc_5707_01",
        "code": "5707.01",
        "name": "ONGKOS ANGKUT PEMBELIAN BAHAN",
        "type": "type_cogs",
        "accountType": "EXPENSE",
        "baseType": "EXPENSE",
        "parentId": "acc_grp_50",
        "isGroup": false,
        "status": "ACTIVE"
    },
    {
        "id": "acc_5708_01",
        "code": "5708.01",
        "name": "PENYUSUTAN MESIN-2 PRODUKSI",
        "type": "type_cogs",
        "accountType": "EXPENSE",
        "baseType": "EXPENSE",
        "parentId": "acc_grp_50",
        "isGroup": false,
        "status": "ACTIVE"
    },
    {
        "id": "acc_grp_60",
        "code": "60",
        "name": "BIAYA PENJUALAN & PEMASARAN",
        "type": "type_expense",
        "baseType": "EXPENSE",
        "parentId": null,
        "isGroup": true,
        "status": "ACTIVE"
    },
    {
        "id": "acc_6101_01",
        "code": "6101.01",
        "name": "BIAYA GAJI",
        "type": "type_expense",
        "accountType": "EXPENSE",
        "baseType": "EXPENSE",
        "parentId": "acc_grp_60",
        "isGroup": false,
        "status": "ACTIVE"
    },
    {
        "id": "acc_6101_02",
        "code": "6101.02",
        "name": "THR",
        "type": "type_expense",
        "accountType": "EXPENSE",
        "baseType": "EXPENSE",
        "parentId": "acc_grp_60",
        "isGroup": false,
        "status": "ACTIVE"
    },
    {
        "id": "acc_grp_6102",
        "code": "6102",
        "name": "BIAYA KOMISI & INSENTIF",
        "type": "type_expense",
        "baseType": "EXPENSE",
        "parentId": "acc_grp_60",
        "isGroup": true,
        "status": "ACTIVE"
    },
    {
        "id": "acc_6102_01",
        "code": "6102.01",
        "name": "Akun 6102.01",
        "type": "type_expense",
        "accountType": "EXPENSE",
        "baseType": "EXPENSE",
        "parentId": "acc_grp_6102",
        "isGroup": false,
        "status": "ACTIVE"
    },
    {
        "id": "acc_6102_02",
        "code": "6102.02",
        "name": "Akun 6102.02",
        "type": "type_expense",
        "accountType": "EXPENSE",
        "baseType": "EXPENSE",
        "parentId": "acc_grp_6102",
        "isGroup": false,
        "status": "ACTIVE"
    },
    {
        "id": "acc_grp_6103",
        "code": "6103",
        "name": "BIAYA ANGKUT",
        "type": "type_expense",
        "baseType": "EXPENSE",
        "parentId": "acc_grp_60",
        "isGroup": true,
        "status": "ACTIVE"
    },
    {
        "id": "acc_grp_6104",
        "code": "6104",
        "name": "BIAYA OPERASIONAL",
        "type": "type_expense",
        "baseType": "EXPENSE",
        "parentId": "acc_grp_60",
        "isGroup": true,
        "status": "ACTIVE"
    },
    {
        "id": "acc_6104_01",
        "code": "6104.01",
        "name": "BIOPS TEAM SALES",
        "type": "type_expense",
        "accountType": "EXPENSE",
        "baseType": "EXPENSE",
        "parentId": "acc_grp_6104",
        "isGroup": false,
        "status": "ACTIVE"
    },
    {
        "id": "acc_6104_02",
        "code": "6104.02",
        "name": "Akun 6104.02",
        "type": "type_expense",
        "accountType": "EXPENSE",
        "baseType": "EXPENSE",
        "parentId": "acc_grp_6104",
        "isGroup": false,
        "status": "ACTIVE"
    },
    {
        "id": "acc_grp_6105",
        "code": "6105",
        "name": "BIAYA PERJALANAN DINAS (LUAR KOTA)",
        "type": "type_expense",
        "baseType": "EXPENSE",
        "parentId": "acc_grp_60",
        "isGroup": true,
        "status": "ACTIVE"
    },
    {
        "id": "acc_grp_6106",
        "code": "6106",
        "name": "BIAYA PROMOSI & IKLAN",
        "type": "type_expense",
        "baseType": "EXPENSE",
        "parentId": "acc_grp_60",
        "isGroup": true,
        "status": "ACTIVE"
    },
    {
        "id": "acc_grp_6107",
        "code": "6107",
        "name": "BIAYA TELEPON / PULSA HP (SALES)",
        "type": "type_expense",
        "baseType": "EXPENSE",
        "parentId": "acc_grp_60",
        "isGroup": true,
        "status": "ACTIVE"
    },
    {
        "id": "acc_grp_6108",
        "code": "6108",
        "name": "Grup 6108",
        "type": "type_expense",
        "baseType": "EXPENSE",
        "parentId": "acc_grp_60",
        "isGroup": true,
        "status": "ACTIVE"
    },
    {
        "id": "acc_grp_70",
        "code": "70",
        "name": "BIAYA ADMINISTRASI & UMUM",
        "type": "type_expense",
        "baseType": "EXPENSE",
        "parentId": null,
        "isGroup": true,
        "status": "ACTIVE"
    },
    {
        "id": "acc_7101_01",
        "code": "7101.01",
        "name": "BIAYA GAJI (OFFICE)",
        "type": "type_expense",
        "accountType": "EXPENSE",
        "baseType": "EXPENSE",
        "parentId": "acc_grp_70",
        "isGroup": false,
        "status": "ACTIVE"
    },
    {
        "id": "acc_7101_02",
        "code": "7101.02",
        "name": "THR (OFFICE)",
        "type": "type_expense",
        "accountType": "EXPENSE",
        "baseType": "EXPENSE",
        "parentId": "acc_grp_70",
        "isGroup": false,
        "status": "ACTIVE"
    },
    {
        "id": "acc_5100_01",
        "code": "5100.01",
        "name": "Barang Jadi & Penolong",
        "type": "type_cogs",
        "accountType": "Harga Pokok Penjualan",
        "baseType": "EXPENSE",
        "parentId": "acc_grp_70",
        "isGroup": false,
        "status": "ACTIVE"
    },
    {
        "id": "acc_5101_01",
        "code": "5101.01",
        "name": "Harga Pokok Penjualan",
        "type": "type_cogs",
        "accountType": "Harga Pokok Penjualan",
        "baseType": "EXPENSE",
        "parentId": "acc_grp_70",
        "isGroup": false,
        "status": "ACTIVE"
    },
    {
        "id": "acc_5102_01",
        "code": "5102.01",
        "name": "Biaya Angkut / Logistik",
        "type": "type_cogs",
        "accountType": "Harga Pokok Penjualan",
        "baseType": "EXPENSE",
        "parentId": "acc_grp_70",
        "isGroup": false,
        "status": "ACTIVE"
    },
    {
        "id": "acc_5102_02",
        "code": "5102.02",
        "name": "Upah Tenaga Kerja Langsung",
        "type": "type_cogs",
        "accountType": "Harga Pokok Penjualan",
        "baseType": "EXPENSE",
        "parentId": "acc_grp_70",
        "isGroup": false,
        "status": "ACTIVE"
    },
    {
        "id": "acc_5102_03",
        "code": "5102.03",
        "name": "Biaya Sewa",
        "type": "type_cogs",
        "accountType": "Harga Pokok Penjualan",
        "baseType": "EXPENSE",
        "parentId": "acc_grp_70",
        "isGroup": false,
        "status": "ACTIVE"
    },
    {
        "id": "acc_5102_04",
        "code": "5102.04",
        "name": "Biaya Listrik / Air",
        "type": "type_cogs",
        "accountType": "Harga Pokok Penjualan",
        "baseType": "EXPENSE",
        "parentId": "acc_grp_70",
        "isGroup": false,
        "status": "ACTIVE"
    },
    {
        "id": "acc_5102_05",
        "code": "5102.05",
        "name": "Bahan Bakar",
        "type": "type_cogs",
        "accountType": "Harga Pokok Penjualan",
        "baseType": "EXPENSE",
        "parentId": "acc_grp_70",
        "isGroup": false,
        "status": "ACTIVE"
    },
    {
        "id": "acc_6200_01",
        "code": "6200.01",
        "name": "Gaji",
        "type": "type_expense",
        "accountType": "Beban",
        "baseType": "EXPENSE",
        "parentId": "acc_grp_70",
        "isGroup": false,
        "status": "ACTIVE"
    },
    {
        "id": "acc_6200_02",
        "code": "6200.02",
        "name": "Uang Makan",
        "type": "type_expense",
        "accountType": "Beban",
        "baseType": "EXPENSE",
        "parentId": "acc_grp_70",
        "isGroup": false,
        "status": "ACTIVE"
    },
    {
        "id": "acc_6200_03",
        "code": "6200.03",
        "name": "Lembur",
        "type": "type_expense",
        "accountType": "Beban",
        "baseType": "EXPENSE",
        "parentId": "acc_grp_70",
        "isGroup": false,
        "status": "ACTIVE"
    },
    {
        "id": "acc_6200_04",
        "code": "6200.04",
        "name": "THR",
        "type": "type_expense",
        "accountType": "Beban",
        "baseType": "EXPENSE",
        "parentId": "acc_grp_70",
        "isGroup": false,
        "status": "ACTIVE"
    },
    {
        "id": "acc_6200_05",
        "code": "6200.05",
        "name": "Bonus",
        "type": "type_expense",
        "accountType": "Beban",
        "baseType": "EXPENSE",
        "parentId": "acc_grp_70",
        "isGroup": false,
        "status": "ACTIVE"
    },
    {
        "id": "acc_6200_06",
        "code": "6200.06",
        "name": "Iuran BPJS Kesehataan",
        "type": "type_expense",
        "accountType": "Beban",
        "baseType": "EXPENSE",
        "parentId": "acc_grp_70",
        "isGroup": false,
        "status": "ACTIVE"
    },
    {
        "id": "acc_6200_07",
        "code": "6200.07",
        "name": "Iuran BPJS Ketenagakerjaan",
        "type": "type_expense",
        "accountType": "Beban",
        "baseType": "EXPENSE",
        "parentId": "acc_grp_70",
        "isGroup": false,
        "status": "ACTIVE"
    },
    {
        "id": "acc_6200_08",
        "code": "6200.08",
        "name": "PPh psl 21",
        "type": "type_expense",
        "accountType": "Beban",
        "baseType": "EXPENSE",
        "parentId": "acc_grp_70",
        "isGroup": false,
        "status": "ACTIVE"
    },
    {
        "id": "acc_6200_09",
        "code": "6200.09",
        "name": "Tunjangan Pengobatan",
        "type": "type_expense",
        "accountType": "Beban",
        "baseType": "EXPENSE",
        "parentId": "acc_grp_70",
        "isGroup": false,
        "status": "ACTIVE"
    },
    {
        "id": "acc_6200_10",
        "code": "6200.10",
        "name": "Tunjangan Lain-lain",
        "type": "type_expense",
        "accountType": "Beban",
        "baseType": "EXPENSE",
        "parentId": "acc_grp_70",
        "isGroup": false,
        "status": "ACTIVE"
    },
    {
        "id": "acc_6300_01",
        "code": "6300.01",
        "name": "Biaya Sales & Marketing",
        "type": "type_expense",
        "accountType": "Beban",
        "baseType": "EXPENSE",
        "parentId": "acc_grp_70",
        "isGroup": false,
        "status": "ACTIVE"
    },
    {
        "id": "acc_6300_02",
        "code": "6300.02",
        "name": "Biaya Sumbangan",
        "type": "type_expense",
        "accountType": "Beban",
        "baseType": "EXPENSE",
        "parentId": "acc_grp_70",
        "isGroup": false,
        "status": "ACTIVE"
    },
    {
        "id": "acc_6300_03",
        "code": "6300.03",
        "name": "Biaya Pameran Promosi & Iklan",
        "type": "type_expense",
        "accountType": "Beban",
        "baseType": "EXPENSE",
        "parentId": "acc_grp_70",
        "isGroup": false,
        "status": "ACTIVE"
    },
    {
        "id": "acc_6300_04",
        "code": "6300.04",
        "name": "Biaya Fee & Komisi",
        "type": "type_expense",
        "accountType": "Beban",
        "baseType": "EXPENSE",
        "parentId": "acc_grp_70",
        "isGroup": false,
        "status": "ACTIVE"
    },
    {
        "id": "acc_6300_05",
        "code": "6300.05",
        "name": "Biaya Sample Barang",
        "type": "type_expense",
        "accountType": "Beban",
        "baseType": "EXPENSE",
        "parentId": "acc_grp_70",
        "isGroup": false,
        "status": "ACTIVE"
    },
    {
        "id": "acc_6400_01",
        "code": "6400.01",
        "name": "Biaya Bahan Bakar /Toll/ Parkir",
        "type": "type_expense",
        "accountType": "Beban",
        "baseType": "EXPENSE",
        "parentId": "acc_grp_70",
        "isGroup": false,
        "status": "ACTIVE"
    },
    {
        "id": "acc_6400_02",
        "code": "6400.02",
        "name": "Biaya Ticket & Airport Tax",
        "type": "type_expense",
        "accountType": "Beban",
        "baseType": "EXPENSE",
        "parentId": "acc_grp_70",
        "isGroup": false,
        "status": "ACTIVE"
    },
    {
        "id": "acc_6400_03",
        "code": "6400.03",
        "name": "Biaya Visa/Paspor",
        "type": "type_expense",
        "accountType": "Beban",
        "baseType": "EXPENSE",
        "parentId": "acc_grp_70",
        "isGroup": false,
        "status": "ACTIVE"
    },
    {
        "id": "acc_6400_04",
        "code": "6400.04",
        "name": "Biaya Hotel",
        "type": "type_expense",
        "accountType": "Beban",
        "baseType": "EXPENSE",
        "parentId": "acc_grp_70",
        "isGroup": false,
        "status": "ACTIVE"
    },
    {
        "id": "acc_6400_05",
        "code": "6400.05",
        "name": "Biaya Transpor Lokal",
        "type": "type_expense",
        "accountType": "Beban",
        "baseType": "EXPENSE",
        "parentId": "acc_grp_70",
        "isGroup": false,
        "status": "ACTIVE"
    },
    {
        "id": "acc_6400_06",
        "code": "6400.06",
        "name": "Biaya Makan & Minum",
        "type": "type_expense",
        "accountType": "Beban",
        "baseType": "EXPENSE",
        "parentId": "acc_grp_70",
        "isGroup": false,
        "status": "ACTIVE"
    },
    {
        "id": "acc_6400_07",
        "code": "6400.07",
        "name": "Biaya Surat/Pajak Kendaraan",
        "type": "type_expense",
        "accountType": "Beban",
        "baseType": "EXPENSE",
        "parentId": "acc_grp_70",
        "isGroup": false,
        "status": "ACTIVE"
    },
    {
        "id": "acc_6400_08",
        "code": "6400.08",
        "name": "Biaya Pemeliharaan/Perbaikan Kendaraan",
        "type": "type_expense",
        "accountType": "Beban",
        "baseType": "EXPENSE",
        "parentId": "acc_grp_70",
        "isGroup": false,
        "status": "ACTIVE"
    },
    {
        "id": "acc_6400_09",
        "code": "6400.09",
        "name": "Biaya Listrik / Air",
        "type": "type_expense",
        "accountType": "Beban",
        "baseType": "EXPENSE",
        "parentId": "acc_grp_70",
        "isGroup": false,
        "status": "ACTIVE"
    },
    {
        "id": "acc_6400_10",
        "code": "6400.10",
        "name": "Biaya Telepon & Internet",
        "type": "type_expense",
        "accountType": "Beban",
        "baseType": "EXPENSE",
        "parentId": "acc_grp_70",
        "isGroup": false,
        "status": "ACTIVE"
    },
    {
        "id": "acc_6400_11",
        "code": "6400.11",
        "name": "Biaya Kebersihan & Keamanan Kantor",
        "type": "type_expense",
        "accountType": "Beban",
        "baseType": "EXPENSE",
        "parentId": "acc_grp_70",
        "isGroup": false,
        "status": "ACTIVE"
    },
    {
        "id": "acc_6400_12",
        "code": "6400.12",
        "name": "Biaya Alat Tulis Kantor",
        "type": "type_expense",
        "accountType": "Beban",
        "baseType": "EXPENSE",
        "parentId": "acc_grp_70",
        "isGroup": false,
        "status": "ACTIVE"
    },
    {
        "id": "acc_6400_13",
        "code": "6400.13",
        "name": "Biaya Pos/Kurir",
        "type": "type_expense",
        "accountType": "Beban",
        "baseType": "EXPENSE",
        "parentId": "acc_grp_70",
        "isGroup": false,
        "status": "ACTIVE"
    },
    {
        "id": "acc_6400_14",
        "code": "6400.14",
        "name": "Biaya Photocopy, Cetak, Laminating",
        "type": "type_expense",
        "accountType": "Beban",
        "baseType": "EXPENSE",
        "parentId": "acc_grp_70",
        "isGroup": false,
        "status": "ACTIVE"
    },
    {
        "id": "acc_6400_15",
        "code": "6400.15",
        "name": "Biaya Perlengkapan Kantor",
        "type": "type_expense",
        "accountType": "Beban",
        "baseType": "EXPENSE",
        "parentId": "acc_grp_70",
        "isGroup": false,
        "status": "ACTIVE"
    },
    {
        "id": "acc_6400_16",
        "code": "6400.16",
        "name": "Perlengkapan Produksi",
        "type": "type_expense",
        "accountType": "Beban",
        "baseType": "EXPENSE",
        "parentId": "acc_grp_70",
        "isGroup": false,
        "status": "ACTIVE"
    },
    {
        "id": "acc_6400_17",
        "code": "6400.17",
        "name": "Biaya Perbaikan dan Pemeliharaan Kantor",
        "type": "type_expense",
        "accountType": "Beban",
        "baseType": "EXPENSE",
        "parentId": "acc_grp_70",
        "isGroup": false,
        "status": "ACTIVE"
    },
    {
        "id": "acc_6400_18",
        "code": "6400.18",
        "name": "Biaya Kurir/Pos",
        "type": "type_expense",
        "accountType": "Beban",
        "baseType": "EXPENSE",
        "parentId": "acc_grp_70",
        "isGroup": false,
        "status": "ACTIVE"
    },
    {
        "id": "acc_6500_01",
        "code": "6500.01",
        "name": "Biaya Perizinan",
        "type": "type_expense",
        "accountType": "Beban",
        "baseType": "EXPENSE",
        "parentId": "acc_grp_70",
        "isGroup": false,
        "status": "ACTIVE"
    },
    {
        "id": "acc_6500_02",
        "code": "6500.02",
        "name": "Biaya Pajak Bumi Bangunan Kantor",
        "type": "type_expense",
        "accountType": "Beban",
        "baseType": "EXPENSE",
        "parentId": "acc_grp_70",
        "isGroup": false,
        "status": "ACTIVE"
    },
    {
        "id": "acc_6500_03",
        "code": "6500.03",
        "name": "Biaya Sanksi/Denda pajak",
        "type": "type_expense",
        "accountType": "Beban",
        "baseType": "EXPENSE",
        "parentId": "acc_grp_70",
        "isGroup": false,
        "status": "ACTIVE"
    },
    {
        "id": "acc_6500_04",
        "code": "6500.04",
        "name": "Biaya Notaris/ Konsultan",
        "type": "type_expense",
        "accountType": "Beban",
        "baseType": "EXPENSE",
        "parentId": "acc_grp_70",
        "isGroup": false,
        "status": "ACTIVE"
    },
    {
        "id": "acc_7100_01",
        "code": "7100.01",
        "name": "Biaya Penyusutan Tanah & Bangunan",
        "type": "type_expense",
        "accountType": "Beban",
        "baseType": "EXPENSE",
        "parentId": "acc_grp_70",
        "isGroup": false,
        "status": "ACTIVE"
    },
    {
        "id": "acc_7100_02",
        "code": "7100.02",
        "name": "Biaya Penyusutan Kendaraan",
        "type": "type_expense",
        "accountType": "Beban",
        "baseType": "EXPENSE",
        "parentId": "acc_grp_70",
        "isGroup": false,
        "status": "ACTIVE"
    },
    {
        "id": "acc_7100_03",
        "code": "7100.03",
        "name": "Biaya Penyusutan Mesin",
        "type": "type_expense",
        "accountType": "Beban",
        "baseType": "EXPENSE",
        "parentId": "acc_grp_70",
        "isGroup": false,
        "status": "ACTIVE"
    },
    {
        "id": "acc_7100_04",
        "code": "7100.04",
        "name": "Biaya Penyusutan Peralatan Kantor",
        "type": "type_expense",
        "accountType": "Beban",
        "baseType": "EXPENSE",
        "parentId": "acc_grp_70",
        "isGroup": false,
        "status": "ACTIVE"
    },
    {
        "id": "acc_7100_05",
        "code": "7100.05",
        "name": "Biaya Penyusutan Furniture",
        "type": "type_expense",
        "accountType": "Beban",
        "baseType": "EXPENSE",
        "parentId": "acc_grp_70",
        "isGroup": false,
        "status": "ACTIVE"
    },
    {
        "id": "acc_7200_01",
        "code": "7200.01",
        "name": "Biaya Bunga Bank",
        "type": "type_expense",
        "accountType": "Beban Lainnya",
        "baseType": "EXPENSE",
        "parentId": "acc_grp_70",
        "isGroup": false,
        "status": "ACTIVE"
    },
    {
        "id": "acc_7200_02",
        "code": "7200.02",
        "name": "Biaya Administrasi Bank",
        "type": "type_expense",
        "accountType": "Beban Lainnya",
        "baseType": "EXPENSE",
        "parentId": "acc_grp_70",
        "isGroup": false,
        "status": "ACTIVE"
    },
    {
        "id": "acc_7200_03",
        "code": "7200.03",
        "name": "Pajak Bunga",
        "type": "type_expense",
        "accountType": "Beban Lainnya",
        "baseType": "EXPENSE",
        "parentId": "acc_grp_70",
        "isGroup": false,
        "status": "ACTIVE"
    },
    {
        "id": "acc_7200_04",
        "code": "7200.04",
        "name": "Biaya Lain-lain",
        "type": "type_expense",
        "accountType": "Beban Lainnya",
        "baseType": "EXPENSE",
        "parentId": "acc_grp_70",
        "isGroup": false,
        "status": "ACTIVE"
    },
    {
        "id": "acc_8100_01",
        "code": "8100.01",
        "name": "Pendapat Bunga",
        "type": "type_other_income",
        "accountType": "Pendapatan Lainnya",
        "baseType": "INCOME",
        "parentId": "acc_grp_70",
        "isGroup": false,
        "status": "ACTIVE"
    },
    {
        "id": "acc_8100_02",
        "code": "8100.02",
        "name": "Laba / Rugi Penjualan Aktiva Tetap",
        "type": "type_other_income",
        "accountType": "Pendapatan Lainnya",
        "baseType": "INCOME",
        "parentId": "acc_grp_70",
        "isGroup": false,
        "status": "ACTIVE"
    },
    {
        "id": "acc_8100_03",
        "code": "8100.03",
        "name": "Pendapatan Lain-lain",
        "type": "type_other_income",
        "accountType": "Pendapatan Lainnya",
        "baseType": "INCOME",
        "parentId": "acc_grp_70",
        "isGroup": false,
        "status": "ACTIVE"
    }
];
        db.save('accountTypes', newAccountTypes);
        db.save('accounts', newAccounts);
        localStorage.setItem(MIGRATION_KEY, 'true');
        console.log('[DB] COA 2026 applied successfully! Total accounts & groups:', newAccounts.length);
    }
})();
