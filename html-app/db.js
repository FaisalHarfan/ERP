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
            'users', 'roles', 'systemLogs'];
    },

    uuid: () => {
        return Date.now().toString() + Math.random().toString(36).substr(2, 5);
    },

    init: async () => {
        console.log("🚀 UnityERP: Database layer initialized (API Mode)");
        // Pre-sync essential tables
        await db.sync('users');
        await db.sync('roles');
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
        const pureDate = dateStr.replace(/-/g, ''); // YYYYMMDD
        const orders = db.read('productionOrders') || [];
        const searchPrefix = `MO-${pureDate}-`;
        
        let maxSeq = 0;
        orders.forEach(o => {
            if (o.moNumber && o.moNumber.startsWith(searchPrefix)) {
                const parts = o.moNumber.split('-');
                if (parts.length >= 3) {
                    const seq = parseInt(parts[2]);
                    if (!isNaN(seq) && seq > maxSeq) maxSeq = seq;
                }
            }
        });

        const nextSeq = maxSeq + 1;
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
        const items = db.read('inventoryItems');

        const product = db.findById('inventoryItems', productId);
        if (!product) return null;

        // If stageLabel is Finish Good, we return the Product ID directly
        const labelLower = stageLabel.toLowerCase();
        if (labelLower.includes('finish good')) {
            return product.id;
        }

        // Determine target category
        let category = 'WIP';
        if (labelLower.includes('oven basah')) category = 'OVEN_BASAH_STOCK';
        if (labelLower.includes('oven kering')) category = 'OVEN_KERING_STOCK';

        // Target Name: Sanitize by removing any existing stage suffix first
        const baseName = (product.itemName || '').replace(/\s*\([^)]+\)/g, '').trim();
        const targetName = `${baseName} (${stageLabel})`;

        // 1. SEARCH BY NAME & CATEGORY (Matches manual items created by user)
        const existingByName = items.find(i => {
            if (i.category !== category) return false;
            const iName = (i.itemName || i.item_name || '').toLowerCase().trim();
            const tName = targetName.toLowerCase().trim();
            const altName = `${baseName.toLowerCase()} (${labelLower})`;
            return iName === tName || iName === altName || iName.includes(baseName.toLowerCase());
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

        // Seed Default Accounts (COA)
        if (db.read('accounts').length === 0) {
            db.save('accounts', [
                // Assets (1000)
                { id: 'acc_cash', code: '1101', name: 'Kas Utama', type: 'ASSET', description: 'Kas tunai perusahaan', status: 'ACTIVE' },
                { id: 'acc_bank', code: '1102', name: 'Bank BCA', type: 'ASSET', description: 'Rekening Bank BCA', status: 'ACTIVE' },
                { id: 'acc_ar', code: '1201', name: 'Piutang Usaha', type: 'ASSET', description: 'Tagihan ke pelanggan', status: 'ACTIVE' },
                { id: 'acc_inv_rm', code: '1301', name: 'Persediaan Bahan Baku', type: 'ASSET', description: 'Stok Bahan Baku', status: 'ACTIVE' },
                { id: 'acc_inv_wip', code: '1303', name: 'Persediaan Barang Dalam Proses', type: 'ASSET', description: 'Stok WIP (Cancel)', status: 'ACTIVE' },
                { id: 'acc_inv_fg', code: '1302', name: 'Persediaan Barang Jadi', type: 'ASSET', description: 'Stok Gudang Jadi', status: 'ACTIVE' },

                // Liabilities (2000)
                { id: 'acc_ap', code: '2101', name: 'Hutang Usaha', type: 'LIABILITY', description: 'Hutang ke supplier', status: 'ACTIVE' },
                { id: 'acc_tax_payable', code: '2102', name: 'Hutang PPN (Tax Payable)', type: 'LIABILITY', description: 'Hutang Pajak Penjualan/Pembelian', status: 'ACTIVE' },

                // Equity (3000)
                { id: 'acc_equity', code: '3101', name: 'Modal Disetor', type: 'EQUITY', description: 'Modal awal', status: 'ACTIVE' },

                // Income (4000)
                { id: 'acc_sales', code: '4101', name: 'Pendapatan Penjualan', type: 'INCOME', description: 'Hasil penjualan produk', status: 'ACTIVE' },
                { id: 'acc_sales_return', code: '4102', name: 'Retur Penjualan', type: 'INCOME', description: 'Pengurang pendapatan (Retur)', status: 'ACTIVE' },

                // Expense (5000)
                { id: 'acc_cogs', code: '5101', name: 'Beban Pokok Penjualan (HPP)', type: 'EXPENSE', description: 'Cost of Goods Sold', status: 'ACTIVE' },
                { id: 'acc_purchase_return', code: '5102', name: 'Retur Pembelian', type: 'EXPENSE', description: 'Pengurang beban (Retur)', status: 'ACTIVE' },
                { id: 'acc_exp_prod', code: '5201', name: 'Biaya Produksi', type: 'EXPENSE', description: 'Biaya operasional produksi', status: 'ACTIVE' },
                { id: 'acc_exp_op', code: '5301', name: 'Biaya Operasional', type: 'EXPENSE', description: 'Listrik, Air, Wifi, dll', status: 'ACTIVE' },
                { id: 'acc_exp_mkt', code: '5302', name: 'Biaya Pemasaran', type: 'EXPENSE', description: 'Iklan dan promosi', status: 'ACTIVE' }
            ]);
        }

        // Seed Bank Accounts
        if (db.read('bankAccounts').length === 0) {
            db.save('bankAccounts', [
                { id: 'bank_cash', name: 'Kas Tunai', accountNumber: '-', bankName: 'Cash', accountId: 'acc_cash' },
                { id: 'bank_bca', name: 'BCA Utama', accountNumber: '1234567890', bankName: 'BCA', accountId: 'acc_bank' }
            ]);
        }

        // Seed Machines
        if (db.read('machines').length === 0) {
            db.save('machines', [
                { id: 'mch_01', code: 'MCH-001', name: 'Mesin 01', type: 'GENERAL', status: 'ACTIVE', createdAt: new Date().toISOString() },
                { id: 'mch_02', code: 'MCH-002', name: 'Mesin 02', type: 'GENERAL', status: 'ACTIVE', createdAt: new Date().toISOString() },
                { id: 'mch_03', code: 'OVN-001', name: 'Oven 01', type: 'OVEN', status: 'ACTIVE', createdAt: new Date().toISOString() },
                { id: 'mch_04', code: 'OVN-002', name: 'Oven 02', type: 'OVEN', status: 'ACTIVE', createdAt: new Date().toISOString() }
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
