// db.js - LocalStorage Database Wrapper Simulator

const DB_PREFIX = 'unityerp_';
const OLD_PREFIX = 'nexerp_';

// Core DB Functions
const db = {
    // Basic CRUD Operations
    getTables: () => {
        return ['units', 'products', 'warehouses', 'suppliers', 'customers',
            'purchaseRequests', 'purchaseOrders', 'purchaseInvoices', 'supplierPayments',
            'salesQuotations', 'purchaseRFQs', 'salesOrders', 'salesInvoices', 'payments',
            'boms', 'productionOrders', 'stockMovements',
            'inventoryItems', 'stockTransactions', 'notifications',
            'machines', 'bomHeaders', 'bomMaterials', 'manufacturingOrders', 'dailyProductionLogs', 'productionLineBatches',
            'accounts', 'expenses', 'journalEntries', 'bankAccounts', 'departments', 'creditNotes', 'debitNotes', // Finance Tables
            'salesReturns', 'productExchanges', 'deliveryOrders', 'inventoryJudgments', // Sales Return, Exchange & Delivery Tables
            'users', 'roles', 'systemLogs'];
    },

    // Initialize empty arrays for all tables if not exist
    init: () => {
        // One-time Migration from nexerp_ to unityerp_
        db.getTables().forEach(table => {
            const oldData = localStorage.getItem(OLD_PREFIX + table);
            const newData = localStorage.getItem(DB_PREFIX + table);
            if (oldData && !newData) {
                localStorage.setItem(DB_PREFIX + table, oldData);
                // We keep old data for safety, or we could remove it. 
                // Let's keep it for now but the app will use the new one.
            }
        });

        db.getTables().forEach(table => {
            if (!localStorage.getItem(DB_PREFIX + table)) {
                localStorage.setItem(DB_PREFIX + table, JSON.stringify([]));
            }
        });

        // Data Cleanup / Migration: Rename Stock Mixing (KARUNG) to Stock Mixing
        const items = db.read('inventoryItems');
        let itemChanged = false;
        items.forEach(it => {
            if (it.itemName === 'Stock Mixing (KARUNG)' || it.itemName === 'Stock Mixing') {
                it.itemName = 'Stock Mixing';
                it.category = 'MIXING_STOCK';
                itemChanged = true;
            }
            if (it.category === 'MIXING_STOCK' && it.itemName !== 'Stock Mixing') {
                it.category = 'FINISHED_GOODS';
                itemChanged = true;
            }
        });
        if (itemChanged) db.save('inventoryItems', items);

        // Migration: Populate productId for existing MOs by matching name
        const mos = db.read('productionOrders');
        let moChanged = false;
        mos.forEach(mo => {
            if (!mo.productId && mo.productName) {
                const p = items.find(i => i.itemName === mo.productName && i.category === 'FINISHED_GOODS');
                if (p) {
                    mo.productId = p.id;
                    moChanged = true;
                }
            }
        });
        // Migration: Consolidate all Mixing stock into a single 'Stock Mixing' item
        let mixingMaster = items.find(i => i.itemName === 'Stock Mixing');
        if (!mixingMaster) {
            mixingMaster = {
                id: db.uuid(),
                itemCode: 'FG-0015', // User's code from screenshot
                itemName: 'Stock Mixing',
                category: 'MIXING_STOCK',
                unit: 'SAK',
                status: 'ACTIVE',
                purchasePrice: 0,
                minStock: 0
            };
            items.push(mixingMaster);
            itemChanged = true;
        }

        if (mixingMaster) {
            const txs = db.read('stockTransactions');
            let txChanged = false;
            items.forEach(it => {
                if (it.itemName && it.itemName.includes('(Mixing)') && it.id !== mixingMaster.id) {
                    // Move all transactions from it.id to mixingMaster.id
                    txs.forEach(t => {
                        if (t.itemId === it.id) {
                            t.itemId = mixingMaster.id;
                            t.itemName = mixingMaster.itemName;
                            t.itemCode = mixingMaster.itemCode;
                            txChanged = true;
                        }
                    });
                    // Mark it for deletion
                    it._toDelete = true;
                }
            });
            if (txChanged) db.save('stockTransactions', txs);

            const finalItems = items.filter(i => !i._toDelete);
            if (finalItems.length !== items.length) {
                db.save('inventoryItems', finalItems);
                // Also update the local 'items' variable for any subsequent logic in init
                items.length = 0;
                items.push(...finalItems);
                itemChanged = true;
            }
        }

        if (moChanged) db.save('productionOrders', mos);

        // Migration: Move all (Oven Kering) stock/tx to genuine Finish Goods
        let cleanUpNeeded = false;
        items.forEach(it => {
            if (it.itemName && it.itemName.includes('(Oven Kering)')) {
                const baseName = it.itemName.replace(' (Oven Kering)', '').trim();
                const parent = items.find(i => i.itemName === baseName && i.category === 'FINISHED_GOODS');
                if (parent) {
                    const txs = db.read('stockTransactions');
                    let txMoved = false;
                    txs.forEach(t => {
                        if (t.itemId === it.id) {
                            t.itemId = parent.id;
                            t.itemName = parent.itemName;
                            t.itemCode = parent.itemCode;
                            txMoved = true;
                        }
                    });
                    if (txMoved) db.save('stockTransactions', txs);
                }
                it._toDelete = true;
                cleanUpNeeded = true;
            }
        });
        if (cleanUpNeeded) {
            const purged = items.filter(i => !i._toDelete);
            db.save('inventoryItems', purged);
            items.length = 0;
            items.push(...purged);
        }
    },

    read: (table) => {
        const data = localStorage.getItem(DB_PREFIX + table);
        return data ? JSON.parse(data) : [];
    },

    save: (table, data) => {
        localStorage.setItem(DB_PREFIX + table, JSON.stringify(data));
    },

    insert: (table, record) => {
        const data = db.read(table);
        const newRecord = {
            ...record,
            id: Date.now().toString() + Math.random().toString(36).substr(2, 5),
            createdAt: new Date().toISOString()
        };
        data.push(newRecord);
        db.save(table, data);
        return newRecord;
    },

    update: (table, id, updates) => {
        const data = db.read(table);
        const index = data.findIndex(item => item.id === id);
        if (index > -1) {
            data[index] = { ...data[index], ...updates, updatedAt: new Date().toISOString() };
            db.save(table, data);
            return data[index];
        }
        return null;
    },

    delete: (table, id) => {
        const data = db.read(table);
        const filtered = data.filter(item => item.id !== id);
        db.save(table, filtered);
    },

    findById: (table, id) => {
        return db.read(table).find(item => item.id === id);
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
        const prefix = category === 'RAW_MATERIAL' ? 'RM' : category === 'WIP' ? 'WIP' : 'FG';
        const existing = db.read('inventoryItems').filter(i => i.itemCode && i.itemCode.startsWith(prefix));
        const next = (existing.length + 1).toString().padStart(4, '0');
        return `${prefix}-${next}`;
    },

    // Auto-generate Transaction Number
    generateTxNo: (type) => {
        const prefix = type === 'IN' ? 'SI' : 'SO';
        const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
        const existing = db.read('stockTransactions').filter(t => t.txNo && t.txNo.startsWith(`${prefix}-${dateStr}`));
        const seq = (existing.length + 1).toString().padStart(3, '0');
        return `${prefix}-${dateStr}-${seq}`;
    },

    // Get current inventory stock for an inventoryItem at a specific location
    getInventoryStock: (itemId, location = null) => {
        const txs = db.read('stockTransactions').filter(t => {
            if (t.itemId !== itemId) return false;
            if (location && t.location !== location) return false;
            return true;
        });
        return txs.reduce((total, t) => {
            const qty = parseFloat(t.qty) || 0;
            if (t.type === 'IN') return total + qty;
            if (t.type === 'OUT' || t.type === 'SHRINKAGE') return total - qty;
            return total; // Ignore NG_IN or other historical-only types
        }, 0);
    },

    // Add inventory stock transaction
    addInventoryTransaction: (itemId, type, qty, reference, referenceId, notes, createdBy = 'Admin', location = 'WHS') => {
        const item = db.findById('inventoryItems', itemId);
        if (!item) return null;
        const txNo = db.generateTxNo(type);

        return db.insert('stockTransactions', {
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
            location        // 'WHS', 'MIXING', 'OVEN_BASAH', 'OVEN_KERING'
        });
    },

    // Validate stock is sufficient for OUT transaction
    validateInventoryStock: (itemId, requestedQty) => {
        return db.getInventoryStock(itemId) >= parseFloat(requestedQty);
    },

    // ─── PRODUCTION HELPERS ────────────────────────────────────

    generateMachineCode: () => {
        const machines = db.read('machines') || [];
        return 'MCH-' + (machines.length + 1).toString().padStart(3, '0');
    },

    generateMONumber: (dateStr) => {
        if (!dateStr) dateStr = new Date().toISOString().split('T')[0];
        const pureDate = dateStr.replace(/-/g, ''); // YYYYMMDD
        const orders = db.read('productionOrders') || [];
        const sameDay = orders.filter(o => o.date && o.date.startsWith(dateStr));
        const nextNum = (sameDay.length + 1).toString().padStart(3, '0');
        return `MO-${pureDate}-${nextNum}`;
    },

    generateBOMCode: () => {
        const existing = db.read('bomHeaders');
        const next = (existing.length + 1).toString().padStart(4, '0');
        return `BOM-${next}`;
    },

    generateMONumber: () => {
        const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
        const existing = db.read('manufacturingOrders').filter(m => m.moNumber && m.moNumber.includes(dateStr));
        const seq = (existing.length + 1).toString().padStart(3, '0');
        return `MO-${dateStr}-${seq}`;
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
    ensureWIPItem: (productId, stageLabel) => {
        const items = db.read('inventoryItems');
        // If Mixing, always use the unified 'Stock Mixing' item
        if (stageLabel.toLowerCase().includes('mixing')) {
            const joint = items.find(i => i.itemName === 'Stock Mixing');
            if (joint) return joint.id;
        }

        const product = db.findById('inventoryItems', productId);
        if (!product) return null;

        // If stageLabel is Finish Good, we return the Product ID directly
        if (stageLabel && stageLabel.toLowerCase().includes('finish good')) {
            return product.id;
        }

        const wipCode = `${product.itemCode}-WIP-${stageLabel.toUpperCase().replace(/\s+/g, '')}`;
        const existing = db.read('inventoryItems').find(i => i.itemCode === wipCode);
        if (existing) return existing.id;

        const newItem = db.insert('inventoryItems', {
            itemCode: wipCode,
            itemName: `${product.itemName} (${stageLabel})`,
            productId: product.id,
            category: 'WIP',
            unit: product.unit || 'Kg',
            minStock: 0,
            status: 'ACTIVE',
            createdAt: new Date().toISOString()
        });
        return newItem.id;
    },

    seedWIPItems: () => {
        const products = db.read('inventoryItems').filter(i => i.category === 'FINISHED_GOODS' && i.status === 'ACTIVE');
        const stages = ['Mixing', 'Oven Basah', 'Oven Kering'];
        products.forEach(p => {
            stages.forEach(s => db.ensureWIPItem(p.id, s));
        });
    },

    processStageTransition: (batchId, nextStage, data) => {
        const batch = db.findById('productionLineBatches', batchId);
        if (!batch) return null;

        const prevStage = batch.currentStage;
        const prevQty = batch.currentQty;
        let newQty = prevQty;

        const stageLabels = { 'MIXING': 'Mixing', 'OVEN_BASAH': 'Oven Basah', 'OVEN_KERING': 'Oven Kering' };

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
        const existing = db.read('journalEntries').filter(t => t.journalNo && t.journalNo.startsWith(`${prefix}-${dateStr}`));
        const seq = (existing.length + 1).toString().padStart(3, '0');
        return `${prefix}-${dateStr}-${seq}`;
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
                { id: 'acc_inv_rm', code: '1301', name: 'Persediaan Bahan Baku', type: 'ASSET', description: 'Stok Raw Material', status: 'ACTIVE' },
                { id: 'acc_inv_wip', code: '1303', name: 'Persediaan Barang Dalam Proses', type: 'ASSET', description: 'Stok WIP', status: 'ACTIVE' },
                { id: 'acc_inv_fg', code: '1302', name: 'Persediaan Barang Jadi', type: 'ASSET', description: 'Stok Finished Goods', status: 'ACTIVE' },

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
db.seedDefaultFinanceData();
db.seedDefaultUsersAndRoles();

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
