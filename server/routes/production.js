// server/routes/production.js — API untuk Modul Produksi (Atomic Transactions)
const router = require('express').Router();
const { ProductionOrder, InventoryItem, StockTransaction, SystemLog, sequelize } = require('../models');
const { authenticateToken, requirePermission } = require('../middleware/auth');
const { v4: uuidv4 } = require('uuid');

// Helper to generate IDs (compatible with previous migrations)
function generateId() {
    return uuidv4();
}

function getPackSizeFromName(itemName) {
    // Sesuai instruksi: Packaging selalu 25 Kg dari Oven Kering
    return 25;
}


/**
 * Helper to ensure WIP Item exists
 * Equivalent to db.ensureWIPItem in frontend
 */
async function ensureWIPItem(productId, stageLabel, t) {
    const product = await InventoryItem.findByPk(productId, { transaction: t });
    if (!product) {
        throw new Error(`Data master produk tidak ditemukan. Mungkin produk ini sudah dihapus dari master data. Harap hapus MO ini dan buat ulang.`);
    }

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

    // 1. Search by name & category (ACTIVE only)
    const existing = await InventoryItem.findOne({
        where: {
            category: category,
            status: { [sequelize.Sequelize.Op.ne]: 'INACTIVE' },
            [sequelize.Sequelize.Op.or]: [
                { itemName: { [sequelize.Sequelize.Op.iLike]: targetName } },
                { itemName: { [sequelize.Sequelize.Op.iLike]: baseName } }
            ]
        },
        transaction: t
    });

    if (existing) return existing.id;

    // 2. Auto-create if not found
    // Use same prefix mapping as inventory.js generateItemCode()
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

    // Find ALL items with this prefix and compute max sequence (same as inventory.js)
    const allPrefixItems = await InventoryItem.findAll({
        where: { itemCode: { [sequelize.Sequelize.Op.like]: `${prefix}-%` } },
        transaction: t
    });

    let maxSeq = 0;
    allPrefixItems.forEach(item => {
        const parts = (item.itemCode || '').split('-');
        if (parts.length >= 2) {
            const seq = parseInt(parts[1]);
            if (!isNaN(seq) && seq > maxSeq) maxSeq = seq;
        }
    });

    const itemCode = `${prefix}-${(maxSeq + 1).toString().padStart(4, '0')}`;

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
        const txDate = updates.completedAt ? new Date(updates.completedAt) : (updates.partialDate ? new Date(updates.partialDate) : new Date());

        // --- 1. PROSES OVEN BASAH ---
        if (stage === 'OVEN_BASAH') {
            if (updates.isPartial) {
                const partialDate = updates.partialDate ? new Date(updates.partialDate) : new Date();
                
                // Reduce raw materials used in this run
                if (updates.partialInputItems && Array.isArray(updates.partialInputItems)) {
                    for (const item of updates.partialInputItems) {
                        const qtyVal = parseFloat(item.qty);
                        if (isNaN(qtyVal) || qtyVal <= 0) continue;
                        await StockTransaction.create({
                            id: generateId(),
                            txNo: moNumber,
                            date: partialDate,
                            itemId: item.inventoryItemId,
                            itemName: item.itemName,
                            type: 'OUT',
                            qty: qtyVal,
                            reference: 'PRODUCTION_OUT',
                            referenceId: moRecord.id,
                            notes: `PARTIAL Oven Basah MO ${moNumber}: Consumed for ${mo.productName}. Notes: ${updates.notes || ''}`,
                            createdBy: req.user.email,
                            location: 'WHS'
                        }, { transaction: t });
                    }
                }

                // Add products produced in this run
                if (updates.partialOutputProducts && Array.isArray(updates.partialOutputProducts)) {
                    for (const op of updates.partialOutputProducts) {
                        const qtyVal = parseFloat(op.qty);
                        if (isNaN(qtyVal) || qtyVal <= 0) continue;
                        const wipItemId = await ensureWIPItem(op.itemId, 'Oven Basah', t);
                        const targetName = op.itemName + ' (Oven Basah)';
                        
                        await StockTransaction.create({
                            id: generateId(),
                            txNo: moNumber,
                            date: partialDate,
                            itemId: wipItemId,
                            itemName: targetName,
                            type: 'IN',
                            qty: qtyVal,
                            reference: 'PRODUCTION_IN',
                            referenceId: moRecord.id,
                            notes: `PARTIAL Oven Basah MO ${moNumber}: Produced ${targetName}. Notes: ${updates.notes || ''}`,
                            createdBy: req.user.email,
                            location: 'OVEN_BASAH'
                        }, { transaction: t });
                    }
                }

                // Update MO history
                const currentHistory = moRecord.data.history || [];
                const historyEntry = {
                    id: generateId(),
                    date: updates.partialDate || new Date().toISOString().split('T')[0],
                    inputItems: updates.partialInputItems || [],
                    outputProducts: updates.partialOutputProducts || [],
                    notes: updates.notes || '',
                    createdBy: req.user.email
                };
                currentHistory.push(historyEntry);

                // Recalculate cumulative outputQty and outputProducts
                const cumulativeOutput = {};
                currentHistory.forEach(h => {
                    (h.outputProducts || []).forEach(op => {
                        const val = parseFloat(op.qty);
                        if (!isNaN(val)) {
                            cumulativeOutput[op.itemId] = (cumulativeOutput[op.itemId] || 0) + val;
                        }
                    });
                });

                // Update outputProducts for the MO
                const updatedOutputProducts = Object.entries(cumulativeOutput).map(([itemId, qty]) => {
                    const originalOP = (mo.outputProducts || []).find(op => op.itemId === itemId) || 
                                     (mo.targetProducts || []).find(tp => tp.itemId === itemId) || {};
                    return {
                        itemId,
                        itemName: originalOP.itemName || '',
                        qty
                    };
                });

                const totalOutputQty = Object.values(cumulativeOutput).reduce((sum, q) => sum + q, 0);

                // Update mo object
                mo.history = currentHistory;
                mo.outputProducts = updatedOutputProducts;
                mo.outputQty = totalOutputQty;
                mo.outputSacks = totalOutputQty; // in Kg
                if (updatedOutputProducts.length > 0) {
                    mo.outputItemId = updatedOutputProducts[0].itemId;
                }
                
                if (updates.status === 'DONE') {
                    mo.status = 'DONE';
                    mo.completedAt = updates.partialDate || new Date().toISOString();
                } else {
                    mo.status = 'PARTIAL';
                }
                
                mo.notes = (moRecord.data.notes || '') + (updates.notes ? `\n[PARTIAL ${historyEntry.date}]: ` + updates.notes : '');


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
                        txNo: moNumber,
                        date: txDate,
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

                    // IN ke Gudang Jadi (WHS) & Oven Kering WIP (Auto-Pack Split)
                    const fgItem = await InventoryItem.findOne({
                        where: {
                            category: 'FINISHED_GOODS',
                            status: { [sequelize.Sequelize.Op.ne]: 'INACTIVE' },
                            itemName: { [sequelize.Sequelize.Op.iLike]: tp.itemName.trim() }
                        },
                        transaction: t
                    });
                    const fgItemId = fgItem ? fgItem.id : tp.itemId;
                    const packSize = getPackSizeFromName(tp.itemName);
                    const outputQty = parseFloat(tp.outputQty);
                    const packedQty = Math.floor(outputQty / packSize) * packSize;
                    const looseQty = outputQty % packSize;

                    if (packedQty > 0) {
                        await StockTransaction.create({
                            id: generateId(),
                            txNo: moNumber,
                            date: txDate,
                            itemId: fgItemId,
                            itemName: tp.itemName,
                            type: 'IN',
                            qty: packedQty,
                            reference: 'PRODUCTION_IN',
                            referenceId: moRecord.id,
                            notes: `FINISH Oven Kering MO ${moNumber}: Auto-packed to Finished Goods (${packedQty / packSize} Sacks)`,
                            createdBy: req.user.email,
                            location: 'WHS'
                        }, { transaction: t });
                    }

                    if (looseQty > 0 || packedQty === 0) {
                        const finalLooseQty = (packedQty === 0) ? outputQty : looseQty;
                        await StockTransaction.create({
                            id: generateId(),
                            txNo: moNumber,
                            date: txDate,
                            itemId: outputWipId,
                            itemName: tp.itemName + ' (Oven Kering)',
                            type: 'IN',
                            qty: finalLooseQty,
                            reference: 'PRODUCTION_IN',
                            referenceId: moRecord.id,
                            notes: packedQty === 0
                                ? `FINISH Oven Kering MO ${moNumber}: Produced Oven Kering WIP (less than ${packSize} Kg)`
                                : `FINISH Oven Kering MO ${moNumber}: Remaining loose stock`,
                            createdBy: req.user.email,
                            location: 'OVEN_KERING'
                        }, { transaction: t });
                    }
                }
            }
        }

        // --- 3. PROSES PACKING ---
        else if (stage === 'PACKING') {
            if (mo.targetProducts && Array.isArray(mo.targetProducts) && mo.targetProducts.length > 0) {
                for (const tp of mo.targetProducts) {
                    const inputWipId = await ensureWIPItem(tp.itemId, 'Oven Kering', t);
                    const outputItemId = tp.itemId; // Final Finished Good
                    
                    const inputQty = parseFloat(tp.inputQtyActual || tp.qty || 0);
                    const outputQty = parseFloat(tp.outputQtyActual || inputQty || 0);
                    const outputSacks = parseFloat(tp.outputSacks || 0);
                    
                    // OUT dari Oven Kering
                    await StockTransaction.create({
                        id: generateId(),
                        txNo: moNumber,
                        date: txDate,
                        itemId: inputWipId,
                        itemName: tp.itemName + ' (Oven Kering)',
                        type: 'OUT',
                        qty: inputQty,
                        reference: 'PRODUCTION_OUT',
                        referenceId: moRecord.id,
                        notes: `FINISH Packing MO ${moNumber}: Consumed ${tp.itemName} from Oven Kering`,
                        createdBy: req.user.email,
                        location: 'OVEN_KERING'
                    }, { transaction: t });

                    // IN ke Gudang Jadi (WHS)
                    await StockTransaction.create({
                        id: generateId(),
                        txNo: moNumber,
                        date: txDate,
                        itemId: outputItemId,
                        itemName: tp.itemName,
                        type: 'IN',
                        qty: outputQty,
                        reference: 'PRODUCTION_IN',
                        referenceId: moRecord.id,
                        notes: `FINISH Packing MO ${moNumber}: Produced Finished Goods ${tp.itemName} (${outputSacks} Sacks)`,
                        createdBy: req.user.email,
                        location: 'WHS'
                    }, { transaction: t });
                }
            } else {
                // Fallback to single product if targetProducts doesn't exist
                const inputWipId = mo.inputItemId; // Biasanya WIP Oven Kering
                const outputItemId = mo.outputItemId; // Final Finished Good
                const inputQty = parseFloat(mo.inputQty || 0);
                
                // OUT dari Oven Kering
                await StockTransaction.create({
                    id: generateId(),
                    txNo: moNumber,
                    date: txDate,
                    itemId: inputWipId,
                    type: 'OUT',
                    qty: inputQty,
                    reference: 'PRODUCTION_OUT',
                    referenceId: moRecord.id,
                    notes: `FINISH Packing MO ${moNumber}: Consumed from Oven Kering`,
                    createdBy: req.user.email,
                    location: 'OVEN_KERING'
                }, { transaction: t });

                // IN ke Gudang Jadi (WHS)
                await StockTransaction.create({
                    id: generateId(),
                    txNo: moNumber,
                    date: txDate,
                    itemId: outputItemId,
                    type: 'IN',
                    qty: inputQty,
                    reference: 'PRODUCTION_IN',
                    referenceId: moRecord.id,
                    notes: `FINISH Packing MO ${moNumber}: Produced Finished Goods`,
                    createdBy: req.user.email,
                    location: 'WHS'
                }, { transaction: t });
            }
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

router.post('/mutate-wip-to-fg', authenticateToken, requirePermission('produksi', 'edit'), async (req, res) => {
    const t = await sequelize.transaction();
    try {
        const { wipItemId, fgItemId, qty, sacks, packSize, date, notes } = req.body;
        if (!wipItemId || !fgItemId || !qty) {
            await t.rollback();
            return res.status(400).json({ error: 'Data mutasi tidak lengkap' });
        }

        const wipItem = await InventoryItem.findByPk(wipItemId, { transaction: t });
        const fgItem = await InventoryItem.findByPk(fgItemId, { transaction: t });

        if (!wipItem || !fgItem) {
            await t.rollback();
            return res.status(404).json({ error: 'Barang tidak ditemukan' });
        }

        const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
        const txDate = date ? new Date(date) : new Date();

        // 1. OUT from Oven Kering WIP
        await StockTransaction.create({
            id: generateId(),
            txNo: `MUT-OUT-${dateStr}-${Math.floor(Math.random() * 1000).toString().padStart(3, '0')}`,
            date: txDate,
            itemId: wipItem.id,
            itemCode: wipItem.itemCode,
            itemName: wipItem.itemName,
            type: 'OUT',
            qty: parseFloat(qty),
            reference: 'PRODUCTION_MUTATION',
            notes: notes || `Mutasi Oven Kering ke Gudang: ${sacks} Sak @${packSize} Kg (Total ${qty} Kg)`,
            createdBy: req.user.email,
            location: 'OVEN_KERING'
        }, { transaction: t });

        // 2. IN to Finished Goods
        await StockTransaction.create({
            id: generateId(),
            txNo: `MUT-IN-${dateStr}-${Math.floor(Math.random() * 1000).toString().padStart(3, '0')}`,
            date: txDate,
            itemId: fgItem.id,
            itemCode: fgItem.itemCode,
            itemName: fgItem.itemName,
            type: 'IN',
            qty: parseFloat(qty),
            reference: 'PRODUCTION_MUTATION',
            notes: notes || `Mutasi Oven Kering ke Gudang: ${sacks} Sak @${packSize} Kg (Total ${qty} Kg)`,
            createdBy: req.user.email,
            location: 'WHS'
        }, { transaction: t });

        // Log Aktivitas
        await SystemLog.create({
            user_id: req.user.userId,
            user_email: req.user.email,
            action: 'WIP_MUTATION',
            details: `Mutasi WIP ${wipItem.itemName} ke FG ${fgItem.itemName} sebanyak ${qty} Kg`
        }, { transaction: t });

        await t.commit();
        res.status(201).json({ success: true });
    } catch (err) {
        await t.rollback();
        console.error('Error mutating WIP to FG:', err);
        res.status(500).json({ error: 'Gagal melakukan mutasi stok' });
    }
});

module.exports = router;
