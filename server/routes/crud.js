// server/routes/crud.js — Generic CRUD endpoints for all tables
// This replaces the frontend's db.read/insert/update/delete calls
const router = require('express').Router();
const { authenticateToken } = require('../middleware/auth');
const models = require('../models');

// Helper: generate ID matching frontend format
function generateId() {
    return Date.now().toString() + Math.random().toString(36).substr(2, 5);
}

// Helper: convert camelCase table name to model
function getModel(tableName) {
    return models.TABLE_MAP[tableName] || null;
}

// ─── GET /api/data/:table — Read all records ───
router.get('/:table', authenticateToken, async (req, res) => {
    try {
        const model = getModel(req.params.table);
        if (!model) return res.status(404).json({ error: `Tabel '${req.params.table}' tidak ditemukan` });

        const records = await model.findAll({ order: [['created_at', 'DESC']] });

        // Transform to match frontend expected format (camelCase)
        const data = records.map(r => {
            const raw = r.toJSON();
            return toCamelCase(raw);
        });

        res.json(data);
    } catch (err) {
        console.error(`GET /${req.params.table} error:`, err);
        res.status(500).json({ error: err.message });
    }
});

// ─── GET /api/data/:table/:id — Read one record ───
router.get('/:table/:id', authenticateToken, async (req, res) => {
    try {
        const model = getModel(req.params.table);
        if (!model) return res.status(404).json({ error: `Tabel '${req.params.table}' tidak ditemukan` });

        const record = await model.findByPk(req.params.id);
        if (!record) return res.status(404).json({ error: 'Record tidak ditemukan' });

        res.json(toCamelCase(record.toJSON()));
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ─── POST /api/data/:table — Insert new record ───
router.post('/:table', authenticateToken, async (req, res) => {
    try {
        const model = getModel(req.params.table);
        if (!model) return res.status(404).json({ error: `Tabel '${req.params.table}' tidak ditemukan` });

        const data = toSnakeCase(req.body);
        if (!data.id) data.id = generateId();

        const record = await model.create(data);
        res.status(201).json(toCamelCase(record.toJSON()));
    } catch (err) {
        console.error(`POST /${req.params.table} error:`, err);
        res.status(500).json({ error: err.message });
    }
});

// ─── PUT /api/data/:table/:id — Update record ───
router.put('/:table/:id', authenticateToken, async (req, res) => {
    try {
        const model = getModel(req.params.table);
        if (!model) return res.status(404).json({ error: `Tabel '${req.params.table}' tidak ditemukan` });

        const record = await model.findByPk(req.params.id);
        if (!record) return res.status(404).json({ error: 'Record tidak ditemukan' });

        const updates = toSnakeCase(req.body);
        updates.updated_at = new Date();
        await record.update(updates);

        res.json(toCamelCase(record.toJSON()));
    } catch (err) {
        console.error(`PUT /${req.params.table}/${req.params.id} error:`, err);
        res.status(500).json({ error: err.message });
    }
});

// ─── DELETE /api/data/:table/:id — Delete record ───
router.delete('/:table/:id', authenticateToken, async (req, res) => {
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
router.post('/:table/bulk', authenticateToken, async (req, res) => {
    try {
        const model = getModel(req.params.table);
        if (!model) return res.status(404).json({ error: `Tabel '${req.params.table}' tidak ditemukan` });

        const records = req.body;
        if (!Array.isArray(records)) return res.status(400).json({ error: 'Body harus berupa array' });

        // Upsert each record
        const results = [];
        for (const rec of records) {
            const data = toSnakeCase(rec);
            if (!data.id) data.id = generateId();
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
        if (value && typeof value === 'object' && !Array.isArray(value) &&
            !['items', 'permissions', 'data', 'history'].includes(key)) {
            result[snakeKey] = toSnakeCase(value);
        } else {
            result[snakeKey] = value;
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
