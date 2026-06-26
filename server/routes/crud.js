// server/routes/crud.js — Generic CRUD endpoints for all tables
// This replaces the frontend's db.read/insert/update/delete calls
const router = require('express').Router();
const { authenticateToken, requirePermission } = require('../middleware/auth');
const models = require('../models');

// Helper: generate ID matching frontend format
function generateId() {
    return Date.now().toString() + Math.random().toString(36).substr(2, 5);
}

// Helper: convert camelCase table name to model
function getModel(tableName) {
    return models.TABLE_MAP[tableName] || null;
}

// ─── Permission Map ────────────────────────────────────────────────────────
// Maps each table to its required permission module.
// Tables listed as BLOCKED cannot be accessed via generic CRUD at all
// (they have dedicated routes with stricter validation).
// Tables listed as PUBLIC are accessible to any authenticated user.
const TABLE_PERMISSION_MAP = {
    // ── BLOCKED: handled by /api/settings ──
    users:      'BLOCKED',
    roles:      'BLOCKED',
    systemLogs: 'BLOCKED',

    // ── Master data (logistik manages products/warehouses) ──
    units:       'logistik',
    warehouses:  'logistik',
    departments: 'pengaturan',

    // ── Sales ──
    customers:       'penjualan',
    salesQuotations: 'penjualan',
    salesOrders:     'penjualan',
    salesInvoices:   'penjualan',
    payments:        'penjualan',
    deliveryOrders:  'penjualan',
    salesReturns:    'penjualan',
    productExchanges:'penjualan',

    // ── Purchase ──
    suppliers:        'pembelian',
    purchaseRFQs:     'pembelian',
    purchaseOrders:   'pembelian',
    purchaseInvoices: 'pembelian',
    supplierPayments: 'pembelian',
    purchaseRequests: 'pembelian',

    // ── Inventory / Logistik ──
    inventoryItems:      'logistik',
    stockTransactions:   'logistik',
    stockMovements:      'logistik',
    inventoryJudgments:  'logistik',
    inventoryConversions:'logistik',
    packBreakdowns:      'logistik',

    // ── Production ──
    machines:             'produksi',
    bomHeaders:           'produksi',
    bomMaterials:         'produksi',
    manufacturingOrders:  'produksi',
    dailyProductionLogs:  'produksi',
    productionLineBatches:'produksi',
    productionOrders:     'produksi',
    boms:                 'produksi',

    // ── Finance ──
    accounts:       'finance',
    journalEntries: 'finance',
    expenses:       'finance',
    receipts:       'finance',
    bankAccounts:   'finance',
    creditNotes:    'finance',
    debitNotes:     'finance',
    accountTypes:   'finance',

    // ── Public: any authenticated user ──
    notifications: 'PUBLIC',
};

/**
 * Middleware: enforce table-level permission on generic CRUD.
 * - BLOCKED tables → 403 always
 * - PUBLIC tables  → pass through (only needs valid token)
 * - Others         → delegate to requirePermission(module, permType)
 */
function tablePermission(permType) {
    return async (req, res, next) => {
        const table = req.params.table;
        const mapping = TABLE_PERMISSION_MAP[table];

        // Table not in map → unknown, deny by default
        if (mapping === undefined) {
            return res.status(403).json({
                error: `Akses ke tabel '${table}' tidak diizinkan melalui endpoint ini.`
            });
        }

        if (mapping === 'BLOCKED') {
            return res.status(403).json({
                error: `Tabel '${table}' tidak dapat diakses melalui endpoint generik. Gunakan endpoint khusus.`
            });
        }

        if (mapping === 'PUBLIC') {
            return next(); // any authenticated user is fine
        }

        // Delegate to the standard requirePermission middleware
        return requirePermission(mapping, permType)(req, res, next);
    };
}

// Helper: detect if model uses "id + data JSONB" pattern
// These models store all fields inside a single `data` JSONB column
function isJsonbModel(model) {
    const attrs = Object.keys(model.rawAttributes);
    // Models with only id, data, created_at, updated_at are JSONB models
    const coreAttrs = attrs.filter(a => !['created_at', 'updated_at', 'createdAt', 'updatedAt'].includes(a));
    return coreAttrs.length === 2 && coreAttrs.includes('id') && coreAttrs.includes('data');
}

// Helper: wrap payload for JSONB models — puts all non-id fields into `data`
function wrapForJsonbModel(payload) {
    const { id, created_at, updated_at, createdAt, updatedAt, ...rest } = payload;
    const result = { data: rest };
    if (id) result.id = id;
    return result;
}

// Helper: merge updates into existing JSONB data
function mergeJsonbUpdates(existingData, updates) {
    const { id, created_at, updated_at, createdAt, updatedAt, ...rest } = updates;
    return { data: { ...existingData, ...rest } };
}

// ─── GET /api/data/:table — Read all records ───
router.get('/:table', authenticateToken, tablePermission('view'), async (req, res) => {
    try {
        const model = getModel(req.params.table);
        if (!model) return res.status(404).json({ error: `Tabel '${req.params.table}' tidak ditemukan` });

        const records = await model.findAll({ order: [['created_at', 'DESC']] });

        // Transform to match frontend expected format (camelCase)
        const data = records.map(r => {
            const raw = r.toJSON();
            if (raw.data && typeof raw.data === 'object') {
                const { data: jsonData, ...rest } = raw;
                return toCamelCase({ ...jsonData, ...rest });
            }
            return toCamelCase(raw);
        });

        res.json(data);
    } catch (err) {
        console.error(`GET /${req.params.table} error:`, err);
        res.status(500).json({ error: err.message });
    }
});

// ─── GET /api/data/:table/:id — Read one record ───
router.get('/:table/:id', authenticateToken, tablePermission('view'), async (req, res) => {
    try {
        const model = getModel(req.params.table);
        if (!model) return res.status(404).json({ error: `Tabel '${req.params.table}' tidak ditemukan` });

        const record = await model.findByPk(req.params.id);
        if (!record) return res.status(404).json({ error: 'Record tidak ditemukan' });

        const raw = record.toJSON();
        let responseData;
        if (raw.data && typeof raw.data === 'object') {
            const { data: jsonData, ...rest } = raw;
            responseData = toCamelCase({ ...jsonData, ...rest });
        } else {
            responseData = toCamelCase(raw);
        }

        res.json(responseData);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ─── POST /api/data/:table — Insert new record ───
router.post('/:table', authenticateToken, tablePermission('edit'), async (req, res) => {
    try {
        const model = getModel(req.params.table);
        if (!model) return res.status(404).json({ error: `Tabel '${req.params.table}' tidak ditemukan` });

        let data = toSnakeCase(req.body);
        if (!data.id) data.id = generateId();

        // For JSONB models (id + data only), wrap payload into `data` field
        if (isJsonbModel(model)) {
            data = wrapForJsonbModel(data);
        }

        const record = await model.create(data);
        res.status(201).json(toCamelCase(record.toJSON()));
    } catch (err) {
        console.error(`POST /${req.params.table} error:`, err);
        res.status(500).json({ error: err.message });
    }
});

// ─── PUT /api/data/:table/:id — Update record ───
router.put('/:table/:id', authenticateToken, tablePermission('edit'), async (req, res) => {
    try {
        const model = getModel(req.params.table);
        if (!model) return res.status(404).json({ error: `Tabel '${req.params.table}' tidak ditemukan` });

        const record = await model.findByPk(req.params.id);
        if (!record) return res.status(404).json({ error: 'Record tidak ditemukan' });

        let updates = toSnakeCase(req.body);
        updates.updated_at = new Date();

        // For JSONB models, merge updates into existing data
        if (isJsonbModel(model)) {
            const existingData = record.data || {};
            updates = mergeJsonbUpdates(existingData, updates);
            updates.updated_at = new Date();
        }

        await record.update(updates);

        res.json(toCamelCase(record.toJSON()));
    } catch (err) {
        console.error(`PUT /${req.params.table}/${req.params.id} error:`, err);
        res.status(500).json({ error: err.message });
    }
});

// ─── DELETE /api/data/:table/:id — Delete record ───
router.delete('/:table/:id', authenticateToken, tablePermission('edit'), async (req, res) => {
    try {
        const model = getModel(req.params.table);
        if (!model) return res.status(404).json({ error: `Tabel '${req.params.table}' tidak ditemukan` });

        const record = await model.findByPk(req.params.id);
        if (!record) return res.status(404).json({ error: 'Record tidak ditemukan' });

        await record.destroy();
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ─── POST /api/data/:table/bulk — Save entire table (for migration) ───
router.post('/:table/bulk', authenticateToken, tablePermission('edit'), async (req, res) => {
    try {
        const model = getModel(req.params.table);
        if (!model) return res.status(404).json({ error: `Tabel '${req.params.table}' tidak ditemukan` });

        const records = req.body;
        if (!Array.isArray(records)) return res.status(400).json({ error: 'Body harus berupa array' });

        // Upsert each record
        const results = [];
        const isJsonb = isJsonbModel(model);
        for (const rec of records) {
            let data = toSnakeCase(rec);
            if (!data.id) data.id = generateId();

            // For JSONB models (id + data only), wrap payload
            if (isJsonb) {
                data = wrapForJsonbModel(data);
            }

            const [record] = await model.upsert(data);
            results.push(record);
        }

        res.json({ inserted: results.length });
    } catch (err) {
        console.error(`BULK /${req.params.table} error:`, err);
        res.status(500).json({ error: err.message });
    }
});

// ═══════════════════════════════════════════════
// Utility: camelCase ↔ snake_case converters
// ═══════════════════════════════════════════════
function toSnakeCase(obj) {
    if (!obj || typeof obj !== 'object' || Array.isArray(obj)) return obj;
    const result = {};
    for (const [key, value] of Object.entries(obj)) {
        const snakeKey = key.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
        // Don't convert nested JSONB objects
        let processedValue;
        if (value && typeof value === 'object' && !Array.isArray(value) &&
            !['items', 'permissions', 'data', 'history'].includes(key)) {
            processedValue = toSnakeCase(value);
        } else {
            processedValue = value;
        }
        // Keep BOTH camelCase and snake_case keys so Sequelize models
        // with either naming convention work correctly:
        // - Models using camelCase attributes + field mapping (e.g., productName -> 'product_name')
        // - Models using snake_case directly as attributes (e.g., is_system)
        result[key] = processedValue;
        if (snakeKey !== key) {
            result[snakeKey] = processedValue;
        }
    }
    return result;
}

function toCamelCase(obj) {
    if (!obj || typeof obj !== 'object' || Array.isArray(obj)) return obj;
    const result = {};
    for (const [key, value] of Object.entries(obj)) {
        const camelKey = key.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
        result[camelKey] = value;
    }
    return result;
}

module.exports = router;
