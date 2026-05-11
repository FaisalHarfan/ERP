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
            item_code: { [Op.like]: `${prefix}-%` }
        }
    });

    let maxSeq = 0;
    items.forEach(item => {
        const parts = item.item_code.split('-');
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
            item_code: itemCode,
            item_name: itemName,
            category,
            unit,
            min_stock: minStock || 0,
            purchase_price: purchasePrice || 0,
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
                tx_no: txNo,
                date: new Date(),
                item_id: newItem.id,
                item_code: newItem.item_code,
                item_name: newItem.item_name,
                type: 'IN',
                qty: parseFloat(initialStock),
                reference: 'MANUAL',
                notes: 'Initial stock on item creation',
                created_by: req.user.email,
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
        if (itemName !== undefined) updates.item_name = itemName;
        if (unit !== undefined) updates.unit = unit;
        if (minStock !== undefined) updates.min_stock = minStock;
        if (purchasePrice !== undefined) updates.purchase_price = purchasePrice;
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
        const { itemId, type, qty, reference, notes, location } = req.body;
        
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
        const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
        const count = await StockTransaction.count({ where: { type }, transaction: t });
        const prefix = type === 'IN' ? 'SI' : 'SO';
        const txNo = `${prefix}-${dateStr}-${(count + 1).toString().padStart(3, '0')}`;

        const newTx = await StockTransaction.create({
            id: generateId(),
            tx_no: txNo,
            date: new Date(),
            item_id: item.id,
            item_code: item.item_code,
            item_name: item.item_name,
            type: type,
            qty: parseFloat(qty),
            reference: reference || 'MANUAL',
            notes: notes || 'Manual Transaction',
            created_by: req.user.email,
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

module.exports = router;
