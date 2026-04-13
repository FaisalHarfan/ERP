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
            'salesReturns', 'productExchanges', 'deliveryOrders', 'inventoryJudgments', 'inventoryConversions', 'packBreakdowns', // Sales Return, Exchange, Delivery, Conversion & Pack Breakdown Tables
            'users', 'roles', 'systemLogs'];
    },

    uuid: () => {
        return Date.now().toString() + Math.random().toString(36).substr(2, 5);
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
        const stageCats = ['MIXING_STOCK', 'OVEN_BASAH_STOCK', 'OVEN_KERING_STOCK', 'WIP'];
        const prefix = category === 'RAW_MATERIAL' ? 'RM' : (category === 'FINISHED_GOODS' ? 'FG' : (stageCats.includes(category) ? 'WIP' : 'FG'));
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
            const type = (t.type || '').toUpperCase();
            if (['IN', 'ADJUST_IN', 'PRODUCTION_IN', 'RETURN_IN'].includes(type)) return total + qty;
            if (['OUT', 'SHRINKAGE', 'ADJUST_OUT', 'PRODUCTION_OUT', 'SALES_OUT', 'WASTE'].includes(type)) return total - qty;
            
            // Fallback for generic types
            if (type === 'IN') return total + qty;
            if (type === 'OUT' || type === 'SHRINKAGE') return total - qty;
            return total;
        }, 0);
    },

    addInventoryTransaction: (itemId, type, qty, reference, referenceId, notes, createdBy = 'Admin', location = 'WHS') => {
        const item = db.findById('inventoryItems', itemId);
        if (!item) return null;
        const txNo = db.generateTxNo(type);

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
            location        // 'WHS', 'MIXING', 'OVEN_BASAH', 'OVEN_KERING'
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
        const isMixing = stageLabel.toLowerCase().includes('mixing');
        
        // If Mixing, always use the unified 'Campuran' item (tracks sacks)
        if (isMixing) {
            let joint = items.find(i => i.itemName === 'Campuran' || i.itemName === 'Stock Mixing');
            if (joint) return joint.id;
            
            // Create if missing
            const newItem = db.insert('inventoryItems', {
                itemCode: 'MIX-STK-GEN',
                itemName: 'Campuran',
                category: 'MIXING_STOCK',
                unit: 'SAK',
                minStock: 0,
                status: 'ACTIVE',
                createdAt: new Date().toISOString()
            });
            return newItem.id;
        }

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
        if (labelLower.includes('mixing')) category = 'MIXING_STOCK';

        // Target Name: Sanitize by removing any existing stage suffix first
        const baseName = product.itemName.replace(/\s*\([^)]+\)/g, '').trim();
        const targetName = `${baseName} (${stageLabel})`;

        // 1. SEARCH BY NAME & CATEGORY (Matches manual items created by user)
        const existingByName = items.find(i => 
            i.category === category && 
            (i.itemName.toLowerCase() === targetName.toLowerCase() || i.itemName.toLowerCase() === `${baseName.toLowerCase()} (${labelLower})`)
        );
        if (existingByName) return existingByName.id;

        // 2. SEARCH BY AUTO-GEN CODE (Old logic fallback)
        const wipCode = `${product.itemCode}-WIP-${stageLabel.toUpperCase().replace(/\s+/g, '')}`;
        const existingByCode = items.find(i => i.itemCode === wipCode);
        if (existingByCode) return existingByCode.id;

        // 3. Return null if nothing found (Prevent auto-creation as per user request)
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
// Migration: Ensure machines have types (Strict overwrite for Oven)
const mchs = db.read('machines');
let mchChanged = false;
mchs.forEach(m => {
    const isOven = m.name.toLowerCase().includes('oven');
    const correctType = isOven ? 'OVEN' : 'MIXING';
    if (m.type !== correctType) {
        m.type = correctType;
        mchChanged = true;
    }
});
if (mchChanged) db.save('machines', mchs);

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
