// server/routes/production.js — API untuk Modul Produksi (Atomic Transactions)
const router = require('express').Router();
const { ProductionOrder, InventoryItem, StockTransaction, SystemLog, sequelize } = require('../models');
const { authenticateToken, requirePermission } = require('../middleware/auth');
const { v4: uuidv4 } = require('uuid');

// Helper to generate IDs (compatible with previous migrations)
function generateId() {
    return uuidv4();
}

/**
 * Helper to ensure WIP Item exists
 * Equivalent to db.ensureWIPItem in frontend
 */
async function ensureWIPItem(productId, stageLabel, t) {
    const product = await InventoryItem.findByPk(productId, { transaction: t });
    if (!product) return null;

    const labelLower = stageLabel.toLowerCase();
    if (labelLower.includes('finish good')) {
        return product.id;
    }

    // Determine target category
    let category = 'WIP';
    if (labelLower.includes('oven basah')) category = 'OVEN_BASAH_STOCK';
    if (labelLower.includes('oven kering')) category = 'OVEN_KERING_STOCK';

    // Target Name
    const baseName = (product.itemName || '').replace(/\s*\([^)]+\)/g, '').trim();
    const targetName = `${baseName} (${stageLabel})`;

    // 1. Search by name & category
    const existing = await InventoryItem.findOne({
        where: {
            category: category,
            itemName: { [sequelize.Sequelize.Op.iLike]: targetName }
        },
        transaction: t
    });

    if (existing) return existing.id;

    // 2. Auto-create if not found
    // Item code generation is handled inline below
    
    const prefix = category === 'RAW_MATERIAL' ? 'RM' : (['OVEN_BASAH_STOCK', 'OVEN_KERING_STOCK', 'WIP'].includes(category) ? 'WIP' : 'FG');
    const lastItem = await InventoryItem.findOne({
        where: { itemCode: { [sequelize.Sequelize.Op.like]: `${prefix}-%` } },
        order: [['itemCode', 'DESC']],
        transaction: t
    });
    
    let nextSeq = 1;
    if (lastItem && lastItem.itemCode) {
        const parts = lastItem.itemCode.split('-');
        if (parts.length >= 2) {
            const seq = parseInt(parts[1]);
            if (!isNaN(seq)) nextSeq = seq + 1;
        }
    }
    const itemCode = `${prefix}-${nextSeq.toString().padStart(4, '0')}`;

    const newItem = await InventoryItem.create({
        id: generateId(),
        itemCode: itemCode,
        itemName: targetName,
        category,
        unit: product.unit || 'Kg',
        status: 'ACTIVE',
        description: `WIP item auto-created for ${product.itemName} - ${stageLabel}`
    }, { transaction: t });

    return newItem.id;
}

/**
 * POST /api/production/orders/start
 * Mulai Produksi (Create MO)
 */
router.post('/orders/start', authenticateToken, requirePermission('produksi', 'edit'), async (req, res) => {
    const t = await sequelize.transaction();
    try {
        const moData = req.body;
        if (!moData.moNumber || !moData.stage) {
            throw new Error('Nomor MO dan Tahap wajib diisi');
        }

        // Simpan MO ke database
        // Model ProductionOrder menggunakan hybrid JSONB 'data'
        const mo = await ProductionOrder.create({
            id: moData.id || generateId(),
            data: moData // Simpan semua data dari frontend
        }, { transaction: t });

        // Catat Log
        await SystemLog.create({
            user_id: req.user.userId,
            user_email: req.user.email,
            action: 'START_MO',
            details: `Memulai MO ${moData.moNumber} tahap ${moData.stage}`
        }, { transaction: t });

        await t.commit();
        res.status(201).json({ success: true, id: mo.id, moNumber: moData.moNumber });
    } catch (err) {
        await t.rollback();
        console.error('Error starting MO:', err);
        res.status(400).json({ error: err.message });
    }
});

/**
 * POST /api/production/orders/:id/complete
 * Selesaikan Produksi (Finalize MO) — Atomic Transaction
 * 1. Update status MO ke DONE
 * 2. Kurangi stok bahan baku (OUT) — Jika Oven Basah
 * 3. Tambah stok hasil produksi (IN) — WIP atau FG
 */
router.post('/orders/:id/complete', authenticateToken, requirePermission('produksi', 'edit'), async (req, res) => {
    const t = await sequelize.transaction();
    try {
        const moRecord = await ProductionOrder.findByPk(req.params.id, { transaction: t });
        if (!moRecord) throw new Error('MO tidak ditemukan');

        const updates = req.body; // Mengandung status: 'DONE', outputQty, dll
        const mo = { ...moRecord.data, ...updates };

        const stage = mo.stage;
        const moNumber = mo.moNumber;

        // --- 1. PROSES OVEN BASAH ---
        if (stage === 'OVEN_BASAH') {
            // Kurangi Bahan Baku (OUT)
            if (mo.inputItems && Array.isArray(mo.inputItems)) {
                for (const item of mo.inputItems) {
                    await StockTransaction.create({
                        id: generateId(),
                        txNo: `PRD-OUT-${Date.now().toString().slice(-6)}`,
                        date: new Date(),
                        itemId: item.inventoryItemId,
                        itemName: item.itemName,
                        type: 'OUT',
                        qty: parseFloat(item.qty),
                        reference: 'PRODUCTION_OUT',
                        referenceId: moRecord.id,
                        notes: `FINISH Oven Basah MO ${moNumber}: Consumed for ${mo.productName}`,
                        createdBy: req.user.email,
                        location: 'WHS'
                    }, { transaction: t });
                }
            }

            // Tambah Hasil Produksi ke WIP Oven Basah (IN)
            if (mo.outputProducts && Array.isArray(mo.outputProducts)) {
                for (const op of mo.outputProducts) {
                    const wipItemId = await ensureWIPItem(op.itemId, 'Oven Basah', t);
                    const targetName = op.itemName + ' (Oven Basah)';
                    
                    await StockTransaction.create({
                        id: generateId(),
                        txNo: `PRD-IN-${Date.now().toString().slice(-6)}`,
                        date: new Date(),
                        itemId: wipItemId,
                        itemName: targetName,
                        type: 'IN',
                        qty: parseFloat(op.qty),
                        reference: 'PRODUCTION_IN',
                        referenceId: moRecord.id,
                        notes: `FINISH Oven Basah MO ${moNumber}: Produced ${targetName}`,
                        createdBy: req.user.email,
                        location: 'OVEN_BASAH'
                    }, { transaction: t });
                }
            }
        }

        // --- 2. PROSES OVEN KERING ---
        else if (stage === 'OVEN_KERING') {
            if (mo.targetProducts && Array.isArray(mo.targetProducts)) {
                for (const tp of mo.targetProducts) {
                    const inputWipId = await ensureWIPItem(tp.itemId, 'Oven Basah', t);
                    const outputWipId = await ensureWIPItem(tp.itemId, 'Oven Kering', t);
                    
                    // OUT dari Oven Basah
                    await StockTransaction.create({
                        id: generateId(),
                        txNo: `PRD-OUT-${Date.now().toString().slice(-6)}`,
                        date: new Date(),
                        itemId: inputWipId,
                        itemName: tp.itemName + ' (Oven Basah)',
                        type: 'OUT',
                        qty: parseFloat(tp.qty),
                        reference: 'PRODUCTION_OUT',
                        referenceId: moRecord.id,
                        notes: `FINISH Oven Kering MO ${moNumber}: Consumed ${tp.itemName}`,
                        createdBy: req.user.email,
                        location: 'OVEN_BASAH'
                    }, { transaction: t });

                    // IN ke Oven Kering
                    await StockTransaction.create({
                        id: generateId(),
                        txNo: `PRD-IN-${Date.now().toString().slice(-6)}`,
                        date: new Date(),
                        itemId: outputWipId,
                        itemName: tp.itemName + ' (Oven Kering)',
                        type: 'IN',
                        qty: parseFloat(tp.outputQty),
                        reference: 'PRODUCTION_IN',
                        referenceId: moRecord.id,
                        notes: `FINISH Oven Kering MO ${moNumber}: Produced ${tp.itemName}`,
                        createdBy: req.user.email,
                        location: 'OVEN_KERING'
                    }, { transaction: t });
                }
            }
        }

        // --- 3. PROSES PACKING ---
        else if (stage === 'PACKING') {
            const inputWipId = mo.inputItemId; // Biasanya WIP Oven Kering
            const outputItemId = mo.outputItemId; // Final Finished Good
            
            // OUT dari Oven Kering
            await StockTransaction.create({
                id: generateId(),
                txNo: `PRD-OUT-${Date.now().toString().slice(-6)}`,
                date: new Date(),
                itemId: inputWipId,
                type: 'OUT',
                qty: parseFloat(mo.inputQty),
                reference: 'PRODUCTION_OUT',
                referenceId: moRecord.id,
                notes: `FINISH Packing MO ${moNumber}: Consumed from Oven Kering`,
                createdBy: req.user.email,
                location: 'OVEN_KERING'
            }, { transaction: t });

            // IN ke Gudang Jadi (WHS)
            await StockTransaction.create({
                id: generateId(),
                txNo: `PRD-IN-${Date.now().toString().slice(-6)}`,
                date: new Date(),
                itemId: outputItemId,
                type: 'IN',
                qty: parseFloat(mo.inputQty),
                reference: 'PRODUCTION_IN',
                referenceId: moRecord.id,
                notes: `FINISH Packing MO ${moNumber}: Produced Finished Goods`,
                createdBy: req.user.email,
                location: 'WHS'
            }, { transaction: t });
        }

        // Update MO Record
        await moRecord.update({ data: mo }, { transaction: t });

        // Log Aktivitas
        await SystemLog.create({
            user_id: req.user.userId,
            user_email: req.user.email,
            action: 'COMPLETE_MO',
            details: `Menyelesaikan MO ${moNumber} tahap ${stage}`
        }, { transaction: t });

        await t.commit();
        res.json({ success: true, message: `MO ${moNumber} berhasil diselesaikan.` });
    } catch (err) {
        await t.rollback();
        console.error('Error completing MO:', err);
        res.status(400).json({ error: err.message });
    }
});

/**
 * DELETE /api/production/orders/:id
 */
router.delete('/orders/:id', authenticateToken, requirePermission('produksi', 'edit'), async (req, res) => {
    try {
        const mo = await ProductionOrder.findByPk(req.params.id);
        if (!mo) throw new Error('MO tidak ditemukan');

        const moNumber = mo.data?.moNumber || req.params.id;
        await mo.destroy();

        await SystemLog.create({
            user_id: req.user.userId,
            user_email: req.user.email,
            action: 'DELETE_MO',
            details: `Menghapus MO ${moNumber}`
        });

        res.json({ success: true });
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

module.exports = router;
