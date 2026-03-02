// db.js - LocalStorage Database Wrapper Simulator

const DB_PREFIX = 'nexerp_';

// Core DB Functions
const db = {
    // Basic CRUD Operations
    getTables: () => {
        return ['units', 'products', 'warehouses', 'suppliers', 'customers',
            'purchaseRequests', 'purchaseOrders', 'purchaseInvoices', 'supplierPayments',
            'salesQuotations', 'salesOrders', 'salesInvoices', 'payments',
            'boms', 'productionOrders', 'stockMovements',
            'inventoryItems', 'stockTransactions', 'notifications',
            'machines', 'bomHeaders', 'bomMaterials', 'manufacturingOrders', 'dailyProductionLogs'];
    },

    // Initialize empty arrays for all tables if not exist
    init: () => {
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

    // Inject a stock movement record automatically (from PO, SO, Production)
    addStockMovement: (productId, type, qty, referenceType, referenceId, notes = '') => {
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

    // Get current inventory stock for an inventoryItem
    getInventoryStock: (itemId) => {
        const txs = db.read('stockTransactions').filter(t => t.itemId === itemId);
        return txs.reduce((total, t) => {
            return t.type === 'IN' ? total + parseFloat(t.qty) : total - parseFloat(t.qty);
        }, 0);
    },

    // Add inventory stock transaction
    addInventoryTransaction: (itemId, type, qty, reference, referenceId, notes, createdBy = 'Admin') => {
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
            reference,      // 'PO', 'SO', 'PRODUCTION_IN', 'PRODUCTION_OUT', 'MANUAL'
            referenceId,
            notes,
            createdBy
        });
    },

    // Validate stock is sufficient for OUT transaction
    validateInventoryStock: (itemId, requestedQty) => {
        return db.getInventoryStock(itemId) >= parseFloat(requestedQty);
    },

    // ─── PRODUCTION HELPERS ────────────────────────────────────

    generateMachineCode: () => {
        const existing = db.read('machines');
        const next = (existing.length + 1).toString().padStart(3, '0');
        return `MCH-${next}`;
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
    }
};

// Initialize DB on load
db.init();
