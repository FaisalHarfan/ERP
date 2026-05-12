// server/routes/sales.js — API untuk Modul Penjualan (Atomic Transactions)
const router = require('express').Router();
const { SalesOrder, DeliveryOrder, InventoryItem, StockTransaction, SystemLog, JournalEntry, SalesReturn, ProductExchange, InventoryJudgment, sequelize } = require('../models');
const { authenticateToken } = require('../middleware/auth');
const { v4: uuidv4 } = require('uuid');

function genId() { return Date.now().toString() + Math.random().toString(36).substr(2, 5); }

// ═══════════════════════════════════════════════
// SALES ORDER
// ═══════════════════════════════════════════════

router.post('/orders/:id/approve', authenticateToken, async (req, res) => {
    const t = await sequelize.transaction();
    try {
        const so = await SalesOrder.findByPk(req.params.id, { transaction: t });
        if (!so) throw new Error('Sales Order tidak ditemukan');
        if (so.status === 'CONFIRMED') throw new Error('Sales Order sudah dikonfirmasi');

        const totalAmount = parseFloat(so.total_amount || 0);
        const soNumber = so.so_number || '';

        await so.update({ status: 'CONFIRMED' }, { transaction: t });
        await JournalEntry.create({
            id: uuidv4(), date: so.date || new Date(),
            description: `Piutang Penjualan SO ${soNumber}`,
            reference_type: 'SO', reference_id: so.id,
            items: [{ accountId: 'acc_ar', debit: totalAmount, credit: 0 }, { accountId: 'acc_sales', debit: 0, credit: totalAmount }],
            total_debit: totalAmount, total_credit: totalAmount
        }, { transaction: t });
        await SystemLog.create({ user_id: req.user.userId, action: 'APPROVE_SALES_ORDER', details: `Konfirmasi SO ${soNumber}`, timestamp: new Date() }, { transaction: t });

        await t.commit();
        res.json({ success: true, message: 'Sales Order berhasil dikonfirmasi.' });
    } catch (err) {
        await t.rollback();
        res.status(400).json({ error: err.message });
    }
});

// ═══════════════════════════════════════════════
// DELIVERY ORDER
// ═══════════════════════════════════════════════

router.post('/delivery/:id/ship', authenticateToken, async (req, res) => {
    const t = await sequelize.transaction();
    try {
        const doRecord = await DeliveryOrder.findByPk(req.params.id, { transaction: t });
        if (!doRecord) throw new Error('Delivery Order tidak ditemukan');

        const doRaw = doRecord.dataValues;
        const doData = doRaw.data || doRaw;
        if ((doData.status || doRaw.status) === 'SHIPPED') throw new Error('Delivery Order sudah dikirim');

        const { driverName, vehicleNo } = req.body;
        const items = doData.items || [];
        const doNumber = doData.doNumber || doRaw.doNumber || '';
        const salesOrderId = doData.salesOrderId || doRaw.salesOrderId || '';
        let totalCogs = 0;

        for (const item of items) {
            if (item.inventoryItemId) {
                const invItem = await InventoryItem.findByPk(item.inventoryItemId, { transaction: t });
                if (invItem) {
                    await StockTransaction.create({
                        id: uuidv4(), 
                        txNo: doNumber,
                        date: new Date(), 
                        itemId: item.inventoryItemId,
                        type: 'OUT', qty: item.qty, reference: 'SALES_OUT', referenceId: doRecord.id,
                        notes: `Delivery Order ${doNumber}`,
                        createdBy: req.user.full_name || 'Admin Warehouse', location: 'WHS'
                    }, { transaction: t });
                    const price = parseFloat(invItem.purchase_price || 0);
                    if (price > 0) totalCogs += price * item.qty;
                }
            }
        }

        if (totalCogs > 0) {
            await JournalEntry.create({
                id: uuidv4(), date: new Date(), description: `HPP Pengiriman SJ ${doNumber}`,
                reference_type: 'DO', reference_id: doRecord.id,
                items: [{ accountId: 'acc_cogs', debit: totalCogs, credit: 0 }, { accountId: 'acc_inv_fg', debit: 0, credit: totalCogs }],
                total_debit: totalCogs, total_credit: totalCogs
            }, { transaction: t });
        }

        await doRecord.update({ data: { ...doData, status: 'SHIPPED', shippedAt: new Date().toISOString(), driverName: driverName || doData.driverName, vehicleNo: vehicleNo || doData.vehicleNo } }, { transaction: t });
        if (salesOrderId) {
            const so = await SalesOrder.findByPk(salesOrderId, { transaction: t });
            if (so) await so.update({ status: 'DELIVERED' }, { transaction: t });
        }
        await SystemLog.create({ user_id: req.user.userId, action: 'SHIP_DELIVERY_ORDER', details: `Pengiriman SJ: ${doNumber}`, timestamp: new Date() }, { transaction: t });

        await t.commit();
        res.json({ success: true, message: 'Pengiriman dikonfirmasi, stok dipotong, jurnal HPP dicatat.' });
    } catch (err) {
        await t.rollback();
        res.status(400).json({ error: err.message });
    }
});

// ═══════════════════════════════════════════════
// SALES RETURN
// Flow: Sales buat (PENDING) → Sales approve (APPROVED) → Inventory terima (GOODS_RECEIVED)
// ═══════════════════════════════════════════════

/**
 * POST /api/sales/returns
 * Sales buat Sales Return baru — status PENDING
 */
router.post('/returns', authenticateToken, async (req, res) => {
    const t = await sequelize.transaction();
    try {
        const { soId, soNumber, customerId, items, refundMethod, reason, notes } = req.body;
        console.log(`[SALES_RETURN] Creating return for SO ${soNumber}. Items:`, items?.length);
        if (!soId || !items || !Array.isArray(items) || items.length === 0) {
            throw new Error('soId and items array are required');
        }

        const returnNumber = 'RET-' + new Date().getFullYear().toString().slice(-2) + Date.now().toString().slice(-6);
        const results = [];

        for (const item of items) {
            const { productId, productName, qtyReturned, unitPrice, condition } = item;
            const totalRefund = parseFloat(qtyReturned) * parseFloat(unitPrice || 0);

            const ret = await SalesReturn.create({
                id: genId(), 
                return_number: returnNumber, 
                date: new Date(),
                so_id: soId, 
                so_number: soNumber || '', 
                customer_id: customerId || '',
                product_id: productId, 
                product_name: productName || '',
                qty_returned: parseFloat(qtyReturned), 
                unit_price: parseFloat(unitPrice || 0),
                total_refund: totalRefund,
                condition: condition || 'Good', 
                refund_method: refundMethod || 'Cash',
                reason: reason || '', 
                notes: notes || '', 
                status: 'APPROVED'
            }, { transaction: t });
            results.push(ret);
        }

        await SystemLog.create({ 
            user_id: req.user.userId, 
            action: 'CREATE_SALES_RETURN', 
            details: `Sales Return ${returnNumber} dibuat (${items.length} item) untuk SO ${soNumber}` 
        }, { transaction: t });

        await t.commit();
        res.status(201).json({ success: true, returnNumber, count: results.length });
    } catch (err) {
        await t.rollback();
        res.status(400).json({ error: err.message });
    }
});

/**
 * POST /api/sales/returns/:id/approve
 * Sales setujui → PENDING → APPROVED
 */
router.post('/returns/:id/approve', authenticateToken, async (req, res) => {
    const t = await sequelize.transaction();
    try {
        const ret = await SalesReturn.findByPk(req.params.id, { transaction: t });
        if (!ret) throw new Error('Sales Return tidak ditemukan');
        if (ret.status !== 'PENDING') throw new Error(`Status harus PENDING, saat ini: ${ret.status}`);

        await ret.update({ status: 'APPROVED' }, { transaction: t });
        await SystemLog.create({ user_id: req.user.userId, action: 'APPROVE_SALES_RETURN', details: `Sales Return ${ret.return_number} disetujui, menunggu Inventory` }, { transaction: t });

        await t.commit();
        res.json({ success: true, message: `Return ${ret.return_number} disetujui. Inventory akan menerima barang.` });
    } catch (err) {
        await t.rollback();
        res.status(400).json({ error: err.message });
    }
});

/**
 * POST /api/sales/returns/:id/reject
 */
router.post('/returns/:id/reject', authenticateToken, async (req, res) => {
    const t = await sequelize.transaction();
    try {
        const ret = await SalesReturn.findByPk(req.params.id, { transaction: t });
        if (!ret) throw new Error('Sales Return tidak ditemukan');

        await ret.update({ status: 'REJECTED' }, { transaction: t });
        await SystemLog.create({ user_id: req.user.userId, action: 'REJECT_SALES_RETURN', details: `Sales Return ${ret.return_number} ditolak` }, { transaction: t });

        await t.commit();
        res.json({ success: true, message: `Return ${ret.return_number} ditolak.` });
    } catch (err) {
        await t.rollback();
        res.status(400).json({ error: err.message });
    }
});

/**
 * POST /api/sales/returns/:id/receive
 * INVENTORY terima & inspeksi — APPROVED → GOODS_RECEIVED
 * Good → RETURN_IN ke stok dengan keterangan mutasi lengkap
 * Damaged → InventoryJudgment + NG_IN
 */
router.post('/returns/:id/receive', authenticateToken, async (req, res) => {
    const t = await sequelize.transaction();
    try {
        const ret = await SalesReturn.findByPk(req.params.id, { transaction: t });
        if (!ret) throw new Error('Sales Return tidak ditemukan');
        if (ret.status !== 'APPROVED') throw new Error(`Status harus APPROVED, saat ini: ${ret.status}`);

        const { receivedQty, receivedCondition, receivedNotes } = req.body;
        const qty = parseFloat(receivedQty);
        if (!qty || qty <= 0) throw new Error('Qty aktual harus lebih dari 0');

        const invItem = await InventoryItem.findByPk(ret.product_id, { transaction: t });
        if (!invItem) throw new Error(`Inventory item tidak ditemukan: ${ret.product_id}`);

        const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
        const countTx = await StockTransaction.count({ transaction: t });
        const txNo = `RT-${dateStr}-${(countTx + 1).toString().padStart(3, '0')}`;
        const byUser = req.user.full_name || req.user.email || 'Inventory';

        if (receivedCondition === 'Good') {
            await StockTransaction.create({
                id: genId(), txNo: txNo, date: new Date(),
                itemId: invItem.id, itemCode: invItem.itemCode || invItem.item_code, itemName: invItem.itemName || invItem.item_name,
                type: 'RETURN_IN', qty,
                reference: 'SALES_RETURN', referenceId: ret.id,
                notes: `Return dari ${ret.return_number} | SO: ${ret.so_number} | Kondisi: Bagus${receivedNotes ? ' | ' + receivedNotes : ''}`,
                createdBy: byUser, location: 'WHS'
            }, { transaction: t });
        } else {
            await InventoryJudgment.create({
                id: genId(),
                data: { date: new Date().toISOString().split('T')[0], itemId: invItem.id, itemName: invItem.item_name, qty, location: 'WHS', status: 'DAMAGE (RUSAK FISIK)', notes: `Retur Rusak dari ${ret.return_number} | SO: ${ret.so_number}${receivedNotes ? ' | ' + receivedNotes : ''}`, createdBy: byUser }
            }, { transaction: t });
            await StockTransaction.create({
                id: genId() + 'ng', txNo: txNo + '-NG', date: new Date(),
                itemId: invItem.id, itemCode: invItem.itemCode || invItem.item_code, itemName: invItem.itemName || invItem.item_name,
                type: 'NG_IN', qty, reference: 'SALES_RETURN', referenceId: ret.id,
                notes: `Return Rusak (NG) dari ${ret.return_number} | SO: ${ret.so_number}`,
                createdBy: byUser, location: 'WHS'
            }, { transaction: t });
        }

        await ret.update({ status: 'GOODS_RECEIVED', received_at: new Date(), received_qty: qty, received_condition: receivedCondition, received_notes: receivedNotes || '' }, { transaction: t });
        await SystemLog.create({ user_id: req.user.userId, action: 'RECEIVE_SALES_RETURN', details: `Inventory terima Return ${ret.return_number}: qty=${qty}, kondisi=${receivedCondition}` }, { transaction: t });

        await t.commit();
        const condLabel = receivedCondition === 'Good' ? 'Bagus → stok bertambah (RETURN_IN)' : 'Rusak → masuk Judgment';
        res.json({ success: true, message: `Barang retur diterima. ${condLabel}.` });
    } catch (err) {
        await t.rollback();
        console.error('Error receiving return:', err);
        res.status(400).json({ error: err.message });
    }
});

// ═══════════════════════════════════════════════
// PRODUCT EXCHANGE (TUKAR GULING)
// Flow: Sales buat (PENDING) → Sales approve (APPROVED) → Inventory terima retur (RETURN_RECEIVED) → Kirim pengganti (COMPLETED)
// ═══════════════════════════════════════════════

/**
 * POST /api/sales/exchanges
 * Sales buat Tukar Guling — status PENDING
 */
router.post('/exchanges', authenticateToken, async (req, res) => {
    const t = await sequelize.transaction();
    try {
        const { soId, soNumber, customerId, returnedProductId, returnedProductName, returnedQty, returnedPrice, returnedCondition, replacementProductId, replacementProductName, replacementQty, replacementPrice, priceDifference, reason } = req.body;
        if (!soId || !returnedProductId || !replacementProductId) throw new Error('soId, returnedProductId, replacementProductId wajib diisi');

        const exchangeNumber = 'EX-' + new Date().getFullYear().toString().slice(-2) + Date.now().toString().slice(-6);
        const ex = await ProductExchange.create({
            id: genId(), exchange_number: exchangeNumber, date: new Date(),
            so_id: soId, so_number: soNumber || '', customer_id: customerId || '',
            returned_product_id: returnedProductId, returned_product_name: returnedProductName || '',
            returned_qty: parseFloat(returnedQty || 0),
            replacement_product_id: replacementProductId, replacement_product_name: replacementProductName || '',
            replacement_qty: parseFloat(replacementQty || 0),
            price_difference: parseFloat(priceDifference || 0),
            reason: reason || '', status: 'APPROVED',
            data: { returnedPrice, replacementPrice, returnedCondition }
        }, { transaction: t });

        await SystemLog.create({ user_id: req.user.userId, action: 'CREATE_PRODUCT_EXCHANGE', details: `Tukar Guling ${exchangeNumber} dibuat untuk SO ${soNumber}` }, { transaction: t });
        await t.commit();
        res.status(201).json({ success: true, id: ex.id, exchangeNumber });
    } catch (err) {
        await t.rollback();
        res.status(400).json({ error: err.message });
    }
});

/**
 * POST /api/sales/exchanges/:id/approve
 * Sales approve → PENDING → APPROVED
 */
router.post('/exchanges/:id/approve', authenticateToken, async (req, res) => {
    const t = await sequelize.transaction();
    try {
        const ex = await ProductExchange.findByPk(req.params.id, { transaction: t });
        if (!ex) throw new Error('Product Exchange tidak ditemukan');
        if (ex.status !== 'PENDING') throw new Error(`Status harus PENDING, saat ini: ${ex.status}`);

        await ex.update({ status: 'APPROVED' }, { transaction: t });
        await SystemLog.create({ user_id: req.user.userId, action: 'APPROVE_PRODUCT_EXCHANGE', details: `Tukar Guling ${ex.exchange_number} disetujui` }, { transaction: t });

        await t.commit();
        res.json({ success: true, message: `Exchange ${ex.exchange_number} disetujui.` });
    } catch (err) {
        await t.rollback();
        res.status(400).json({ error: err.message });
    }
});

router.post('/exchanges/:id/reject', authenticateToken, async (req, res) => {
    try {
        const ex = await ProductExchange.findByPk(req.params.id);
        if (!ex) return res.status(404).json({ error: 'Data tidak ditemukan' });
        if (ex.status !== 'PENDING') return res.status(400).json({ error: 'Hanya dokumen PENDING yang bisa ditolak' });

        await ex.update({ status: 'REJECTED' });
        res.json({ message: 'Tukar Guling ditolak', data: ex });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

/**
 * POST /api/sales/exchanges/:id/receive
 * INVENTORY terima barang retur — APPROVED → RETURN_RECEIVED
 */
router.post('/exchanges/:id/receive', authenticateToken, async (req, res) => {
    const t = await sequelize.transaction();
    try {
        const ex = await ProductExchange.findByPk(req.params.id, { transaction: t });
        if (!ex) throw new Error('Product Exchange tidak ditemukan');
        if (ex.status !== 'APPROVED') throw new Error(`Status harus APPROVED, saat ini: ${ex.status}`);

        const { receivedQty, receivedCondition, receivedNotes } = req.body;
        const qty = parseFloat(receivedQty);
        if (!qty || qty <= 0) throw new Error('Qty aktual harus lebih dari 0');

        const invItem = await InventoryItem.findByPk(ex.returned_product_id, { transaction: t });
        if (!invItem) throw new Error('Item retur tidak ditemukan');

        const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
        const countTx = await StockTransaction.count({ transaction: t });
        const txNo = `RT-${dateStr}-${(countTx + 1).toString().padStart(3, '0')}`;
        const byUser = req.user.full_name || req.user.email || 'Inventory';

        if (receivedCondition === 'Good') {
            await StockTransaction.create({
                id: genId(), txNo: txNo, date: new Date(),
                itemId: invItem.id, itemCode: invItem.itemCode || invItem.item_code, itemName: invItem.itemName || invItem.item_name,
                type: 'RETURN_IN', qty, reference: 'EXCHANGE_RETURN', referenceId: ex.id,
                notes: `Return Tukar Guling dari ${ex.exchange_number} | SO: ${ex.so_number} | Kondisi: Bagus${receivedNotes ? ' | ' + receivedNotes : ''}`,
                createdBy: byUser, location: 'WHS'
            }, { transaction: t });
        } else {
            await InventoryJudgment.create({
                id: genId(),
                data: { date: new Date().toISOString().split('T')[0], itemId: invItem.id, itemName: invItem.item_name, qty, location: 'WHS', status: 'DAMAGE (RUSAK FISIK)', notes: `Retur Rusak Tukar Guling ${ex.exchange_number} | SO: ${ex.so_number}`, createdBy: byUser }
            }, { transaction: t });
            await StockTransaction.create({
                id: genId() + 'ng', txNo: txNo + '-NG', date: new Date(),
                itemId: invItem.id, itemCode: invItem.itemCode || invItem.item_code, itemName: invItem.itemName || invItem.item_name,
                type: 'NG_IN', qty, reference: 'EXCHANGE_RETURN', referenceId: ex.id,
                notes: `Retur NG Tukar Guling ${ex.exchange_number}`,
                createdBy: byUser, location: 'WHS'
            }, { transaction: t });
        }

        await ex.update({ status: 'RETURN_RECEIVED', received_at: new Date() }, { transaction: t });
        await SystemLog.create({ user_id: req.user.userId, action: 'RECEIVE_EXCHANGE_RETURN', details: `Inventory terima retur tukar guling ${ex.exchange_number}: qty=${qty}, kondisi=${receivedCondition}` }, { transaction: t });

        await t.commit();
        res.json({ success: true, message: 'Barang retur tukar guling diterima.' });
    } catch (err) {
        await t.rollback();
        res.status(400).json({ error: err.message });
    }
});

/**
 * POST /api/sales/exchanges/:id/ship
 * Kirim barang pengganti — RETURN_RECEIVED → COMPLETED
 */
router.post('/exchanges/:id/ship', authenticateToken, async (req, res) => {
    const t = await sequelize.transaction();
    try {
        const ex = await ProductExchange.findByPk(req.params.id, { transaction: t });
        if (!ex) throw new Error('Product Exchange tidak ditemukan');
        if (ex.status !== 'RETURN_RECEIVED') throw new Error(`Status harus RETURN_RECEIVED, saat ini: ${ex.status}`);

        const repItem = await InventoryItem.findByPk(ex.replacement_product_id, { transaction: t });
        if (!repItem) throw new Error('Item pengganti tidak ditemukan');

        const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
        const countTx = await StockTransaction.count({ transaction: t });
        const txNo = `DO-${dateStr}-${(countTx + 1).toString().padStart(3, '0')}`;

        await StockTransaction.create({
            id: genId(), txNo: txNo, date: new Date(),
            itemId: repItem.id, itemCode: repItem.itemCode || repItem.item_code, itemName: repItem.itemName || repItem.item_name,
            type: 'OUT', qty: parseFloat(ex.replacement_qty),
            reference: 'SALES_OUT', referenceId: ex.id,
            notes: `Kirim Pengganti Tukar Guling ${ex.exchange_number} | SO: ${ex.so_number}`,
            createdBy: req.user.full_name || req.user.email || 'Inventory', location: 'WHS'
        }, { transaction: t });

        const diff = parseFloat(ex.price_difference || 0);
        if (diff !== 0) {
            const absDiff = Math.abs(diff);
            await JournalEntry.create({
                id: uuidv4(), date: new Date(), description: `Selisih Tukar Guling ${ex.exchange_number}`,
                reference_type: 'PRODUCT_EXCHANGE', reference_id: ex.id,
                items: diff > 0
                    ? [{ accountId: 'acc_ar', debit: absDiff, credit: 0 }, { accountId: 'acc_sales', debit: 0, credit: absDiff }]
                    : [{ accountId: 'acc_sales_return', debit: absDiff, credit: 0 }, { accountId: 'acc_cash', debit: 0, credit: absDiff }],
                total_debit: absDiff, total_credit: absDiff
            }, { transaction: t });
        }

        await ex.update({ status: 'COMPLETED', shipped_at: new Date() }, { transaction: t });
        await SystemLog.create({ user_id: req.user.userId, action: 'SHIP_EXCHANGE_REPLACEMENT', details: `Pengganti Tukar Guling ${ex.exchange_number} dikirim` }, { transaction: t });

        await t.commit();
        res.json({ success: true, message: `Barang pengganti dikirim. Tukar Guling ${ex.exchange_number} selesai.` });
    } catch (err) {
        await t.rollback();
        res.status(400).json({ error: err.message });
    }
});

module.exports = router;
