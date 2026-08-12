// server/routes/inventory.js — API untuk Modul Inventori
const router = require('express').Router();
const { InventoryItem, StockTransaction, SystemLog, sequelize } = require('../models');
const { authenticateToken, requirePermission } = require('../middleware/auth');
const { Op } = require('sequelize');

// Helper generator
function generateId() {
    return Date.now().toString() + Math.random().toString(36).substr(2, 5);
}

// Auto-generate Item Code based on category
async function generateItemCode(category) {
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
    
    // Find all items with this prefix
    const items = await InventoryItem.findAll({
        where: {
            itemCode: { [Op.like]: `${prefix}-%` }
        }
    });

    let maxSeq = 0;
    items.forEach(item => {
        const parts = (item.itemCode || '').split('-');
        if (parts.length >= 2) {
            const seq = parseInt(parts[1]);
            if (!isNaN(seq) && seq > maxSeq) maxSeq = seq;
        }
    });

    const next = (maxSeq + 1).toString().padStart(4, '0');
    return `${prefix}-${next}`;
}

// ─── INVENTORY ITEMS ──────────────────────────────────────────────

router.get('/items', authenticateToken, requirePermission('logistik', 'view'), async (req, res) => {
    try {
        // Gunakan raw query untuk mendapatkan sum of stock sekalian
        const query = `
            SELECT i.*, 
            COALESCE((
                SELECT SUM(
                    CASE 
                        WHEN t.type IN ('IN', 'ADJUST_IN', 'PRODUCTION_IN', 'RETURN_IN') THEN t.qty 
                        WHEN t.type IN ('OUT', 'SHRINKAGE', 'ADJUST_OUT', 'PRODUCTION_OUT', 'SALES_OUT', 'WASTE') THEN -t.qty 
                        ELSE 0 
                    END
                )
                FROM stock_transactions t WHERE t.item_id = i.id
            ), 0) as current_stock
            FROM inventory_items i
            ORDER BY i.created_at DESC
        `;
        const [results] = await sequelize.query(query);

        res.json(results.map(it => ({
            id: it.id,
            itemCode: it.item_code,
            itemName: it.item_name,
            category: it.category,
            unit: it.unit,
            minStock: parseFloat(it.min_stock) || 0,
            purchasePrice: parseFloat(it.purchase_price) || 0,
            status: it.status,
            description: it.description,
            createdAt: it.created_at,
            currentStock: parseFloat(it.current_stock) || 0
        })));
    } catch (err) {
        console.error('Error GET /items:', err);
        res.status(500).json({ error: 'Gagal mengambil data inventory items' });
    }
});

router.post('/items', authenticateToken, requirePermission('logistik', 'edit'), async (req, res) => {
    // Gunakan transaksi untuk menjamin Item dan Initial Stock masuk secara atomic
    const t = await sequelize.transaction();
    try {
        const { itemName, category, unit, minStock, purchasePrice, status, initialStock } = req.body;
        
        if (!itemName || !category || !unit) {
            await t.rollback();
            return res.status(400).json({ error: 'Nama, kategori, dan satuan wajib diisi' });
        }

        const itemCode = await generateItemCode(category);
        const newItem = await InventoryItem.create({
            id: generateId(),
            itemCode,
            itemName,
            category,
            unit,
            minStock: minStock || 0,
            purchasePrice: purchasePrice || 0,
            status: status || 'ACTIVE'
        }, { transaction: t });

        // Jika ada stok awal, otomatis buat transaksinya
        if (initialStock && initialStock > 0) {
            // Generate TX Number (SI-YYYYMMDD-001)
            const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
            const count = await StockTransaction.count({ where: { type: 'IN' }, transaction: t });
            const txNo = `SI-${dateStr}-${(count + 1).toString().padStart(3, '0')}`;

            await StockTransaction.create({
                id: generateId(),
                txNo,
                date: new Date(),
                itemId: newItem.id,
                itemCode: newItem.itemCode,
                itemName: newItem.itemName,
                type: 'IN',
                qty: parseFloat(initialStock),
                reference: 'MANUAL',
                notes: 'Initial stock on item creation',
                createdBy: req.user.email,
                location: 'WHS'
            }, { transaction: t });
        }

        await SystemLog.create({
            user_id: req.user.userId,
            user_email: req.user.email,
            action: 'CREATE_INVENTORY_ITEM',
            details: `Membuat item: ${itemName} (${itemCode})`
        }, { transaction: t });

        await t.commit();
        res.status(201).json({
            id: newItem.id,
            itemCode: newItem.item_code,
            itemName: newItem.item_name,
            category: newItem.category,
            unit: newItem.unit,
            status: newItem.status
        });
    } catch (err) {
        await t.rollback();
        console.error(err);
        res.status(500).json({ error: 'Gagal membuat item inventory' });
    }
});

router.put('/items/:id', authenticateToken, requirePermission('logistik', 'edit'), async (req, res) => {
    try {
        const item = await InventoryItem.findByPk(req.params.id);
        if (!item) return res.status(404).json({ error: 'Item tidak ditemukan' });

        const { itemName, category, unit, minStock, purchasePrice, status } = req.body;

        const updates = {};
        if (itemName !== undefined) updates.itemName = itemName;
        if (unit !== undefined) updates.unit = unit;
        if (minStock !== undefined) updates.minStock = minStock;
        if (purchasePrice !== undefined) updates.purchasePrice = purchasePrice;
        if (status !== undefined) updates.status = status;

        // Jika kategori berubah, item code harus digenerate ulang (business rule lama)
        if (category !== undefined && category !== item.category) {
            updates.category = category;
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
            const newPrefix = prefixes[category] || 'ITM';
            const oldPrefix = item.item_code ? item.item_code.split('-')[0] : '';
            if (oldPrefix !== newPrefix) {
                updates.item_code = await generateItemCode(category);
                
                // Catatan: Seharusnya ada update ke stockTransactions di sini, 
                // tapi karena stockTransactions memiliki item_id yang berelasi, 
                // idealnya kode barang direferensikan via join, bukan disimpan duplicate.
                // Namun untuk maintain backward compatibility struktur lama:
                await StockTransaction.update(
                    { item_code: updates.item_code },
                    { where: { item_id: item.id } }
                );
            }
        }

        await item.update(updates);
        res.json({ success: true, id: item.id });
    } catch (err) {
        res.status(500).json({ error: 'Gagal mengupdate item' });
    }
});

router.delete('/items/:id', authenticateToken, requirePermission('logistik', 'edit'), async (req, res) => {
    const t = await sequelize.transaction();
    try {
        const item = await InventoryItem.findByPk(req.params.id);
        if (!item) {
            await t.rollback();
            return res.status(404).json({ error: 'Item tidak ditemukan' });
        }

        // Deep clean: Delete related stock transactions (Cascade)
        await StockTransaction.destroy({
            where: { item_id: req.params.id },
            transaction: t
        });

        // Delete the item
        await item.destroy({ transaction: t });

        await SystemLog.create({
            user_id: req.user.userId,
            user_email: req.user.email,
            action: 'DELETE_INVENTORY_ITEM',
            details: `Menghapus item: ${item.item_name}`
        }, { transaction: t });

        await t.commit();
        res.json({ success: true });
    } catch (err) {
        await t.rollback();
        console.error(err);
        res.status(500).json({ error: 'Gagal menghapus item (mungkin karena konstrain relasi)' });
    }
});

// ─── INVENTORY TRANSACTIONS (Fase 2) ────────────────────────────────

router.post('/transactions', authenticateToken, requirePermission('logistik', 'edit'), async (req, res) => {
    const t = await sequelize.transaction();
    try {
        const { itemId, type, qty, reference, notes, location, date } = req.body;
        
        if (!itemId || !type || !qty) {
            await t.rollback();
            return res.status(400).json({ error: 'Data transaksi tidak lengkap' });
        }

        const item = await InventoryItem.findByPk(itemId, { transaction: t });
        if (!item) {
            await t.rollback();
            return res.status(404).json({ error: 'Item tidak ditemukan' });
        }

        // Generate TX Number
        const txDate = date ? new Date(date) : new Date();
        const dateStr = txDate.toISOString().slice(0, 10).replace(/-/g, '');
        const count = await StockTransaction.count({ where: { type }, transaction: t });
        const prefix = type === 'IN' ? 'SI' : 'SO';
        const txNo = `${prefix}-${dateStr}-${(count + 1).toString().padStart(3, '0')}`;

        const newTx = await StockTransaction.create({
            id: generateId(),
            txNo: txNo,
            date: txDate,
            itemId: item.id,
            itemCode: item.itemCode,
            itemName: item.itemName,
            type: type,
            qty: parseFloat(qty),
            reference: reference || 'MANUAL',
            notes: notes || 'Manual Transaction',
            createdBy: req.user.email,
            location: location || 'WHS'
        }, { transaction: t });

        await SystemLog.create({
            user_id: req.user.userId,
            user_email: req.user.email,
            action: 'INVENTORY_TRANSACTION',
            details: `Transaksi ${type} untuk ${item.item_name} qty: ${qty}`
        }, { transaction: t });

        await t.commit();
        res.status(201).json(newTx);
    } catch (err) {
        await t.rollback();
        console.error('Error creating transaction:', err);
        res.status(500).json({ error: 'Gagal membuat transaksi stok' });
    }
});

// ─── RENUMBER ITEM CODES ──────────────────────────────────────────
// Re-sequence all item codes per category so they are sequential (e.g. FG-0001, FG-0002, ...)
// Items are sorted by created_at to preserve creation order.
// Uses 2-pass approach to avoid unique constraint conflicts.
router.post('/renumber', authenticateToken, requirePermission('logistik', 'edit'), async (req, res) => {
    const t = await sequelize.transaction();
    try {
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

        const changes = []; // Track old→new for logging

        // Collect all renumber plans first
        const renumberPlans = []; // { item, oldCode, newCode }

        for (const [category, prefix] of Object.entries(prefixes)) {
            const items = await InventoryItem.findAll({
                where: { category: category },
                order: [['created_at', 'ASC']],
                transaction: t
            });

            let seq = 1;
            for (const item of items) {
                const newCode = `${prefix}-${seq.toString().padStart(4, '0')}`;
                const oldCode = item.itemCode || item.item_code;

                if (oldCode !== newCode) {
                    renumberPlans.push({ item, oldCode, newCode, itemName: item.itemName || item.item_name });
                }
                seq++;
            }
        }

        if (renumberPlans.length === 0) {
            await t.rollback();
            return res.json({ success: true, message: 'Semua item code sudah berurutan', totalUpdated: 0, changes: [] });
        }

        // PASS 1: Assign temporary codes to avoid unique constraint conflicts
        for (let i = 0; i < renumberPlans.length; i++) {
            const plan = renumberPlans[i];
            const tempCode = `TEMP-RENUM-${i}`;
            await plan.item.update({ itemCode: tempCode }, { transaction: t });
        }

        // PASS 2: Assign final sequential codes and update all references
        for (const plan of renumberPlans) {
            const { item, oldCode, newCode, itemName } = plan;

            // Update inventory_items to final code
            await item.update({ itemCode: newCode }, { transaction: t });

            // Update stock_transactions that reference this item (by item_id, not by code)
            await StockTransaction.update(
                { itemCode: newCode },
                { where: { itemId: item.id }, transaction: t }
            );

            // Update JSONB items in related tables that store itemCode
            const jsonbTables = [
                'sales_quotations', 'sales_orders', 'sales_invoices',
                'delivery_orders', 'purchase_orders', 'purchase_invoices'
            ];
            for (const table of jsonbTables) {
                try {
                    const [rows] = await sequelize.query(
                        `SELECT id, items FROM ${table} WHERE items::text LIKE :pattern`,
                        {
                            replacements: { pattern: `%${oldCode}%` },
                            transaction: t
                        }
                    );
                    for (const row of rows) {
                        if (!Array.isArray(row.items)) continue;
                        let changed = false;
                        const updatedItems = row.items.map(it => {
                            if (it.itemCode === oldCode) {
                                changed = true;
                                return { ...it, itemCode: newCode };
                            }
                            return it;
                        });
                        if (changed) {
                            await sequelize.query(
                                `UPDATE ${table} SET items = :items WHERE id = :id`,
                                {
                                    replacements: { items: JSON.stringify(updatedItems), id: row.id },
                                    transaction: t
                                }
                            );
                        }
                    }
                } catch (tableErr) {
                    // Table might not exist, skip silently
                }
            }

            changes.push({ oldCode, newCode, itemName });
        }

        // Log the operation
        await SystemLog.create({
            user_id: req.user.userId,
            user_email: req.user.email,
            action: 'RENUMBER_ITEM_CODES',
            details: `Renumber ${changes.length} item codes. Changes: ${changes.map(c => `${c.oldCode}→${c.newCode}`).join(', ')}`
        }, { transaction: t });

        await t.commit();
        res.json({
            success: true,
            message: `Berhasil menomori ulang ${changes.length} item`,
            totalUpdated: changes.length,
            changes: changes.map(c => ({
                itemName: c.itemName,
                oldCode: c.oldCode,
                newCode: c.newCode
            }))
        });
    } catch (err) {
        await t.rollback();
        console.error('Error renumbering:', err);
        res.status(500).json({ error: 'Gagal menomori ulang: ' + err.message });
    }
});

module.exports = router;

