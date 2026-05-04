// server/routes/sales.js — API untuk Modul Penjualan (Atomic Transactions)
const router = require('express').Router();
const { SalesOrder, DeliveryOrder, InventoryItem, StockTransaction, SystemLog, JournalEntry, sequelize } = require('../models');
const { authenticateToken } = require('../middleware/auth');
const { v4: uuidv4 } = require('uuid');

/**
 * POST /api/sales/orders/:id/approve
 * Konfirmasi Sales Order — Membuat Jurnal Piutang vs Penjualan
 */
router.post('/orders/:id/approve', authenticateToken, async (req, res) => {
    const t = await sequelize.transaction();
    try {
        // SO uses explicit columns
        const so = await SalesOrder.findByPk(req.params.id, { transaction: t });
        if (!so) throw new Error('Sales Order tidak ditemukan');

        const soData = so.dataValues;
        const currentStatus = soData.status || '';
        if (currentStatus === 'CONFIRMED') throw new Error('Sales Order sudah dikonfirmasi sebelumnya');

        const totalAmount = parseFloat(soData.total_amount || soData.totalAmount || 0);
        const soNumber = soData.so_number || soData.soNumber || '';

        // 1. Update Status SO
        await so.update({ status: 'CONFIRMED' }, { transaction: t });

        // 2. Buat Jurnal Akuntansi (Piutang Debit, Penjualan Kredit)
        await JournalEntry.create({
            id: uuidv4(),
            date: soData.date || new Date(),
            description: `Piutang Penjualan SO ${soNumber}`,
            reference_type: 'SO',
            reference_id: so.id,
            items: [
                { accountId: 'acc_ar', debit: totalAmount, credit: 0 },
                { accountId: 'acc_sales', debit: 0, credit: totalAmount }
            ],
            total_debit: totalAmount,
            total_credit: totalAmount
        }, { transaction: t });

        // 3. Catat Log Sistem
        await SystemLog.create({
            id: uuidv4(),
            user_id: req.user.id,
            action: 'APPROVE_SALES_ORDER',
            details: `Mengkonfirmasi Sales Order: ${soNumber} dengan nilai ${totalAmount}`,
            timestamp: new Date()
        }, { transaction: t });

        await t.commit();
        res.json({ success: true, message: 'Sales Order berhasil dikonfirmasi dan jurnal dicatat.' });
    } catch (err) {
        await t.rollback();
        console.error('Error approving SO:', err);
        res.status(400).json({ error: err.message });
    }
});

/**
 * POST /api/sales/delivery/:id/ship
 * Konfirmasi Pengiriman (DO) — Potong Stok + Jurnal HPP
 * Note: DeliveryOrder model uses JSONB `data` column
 */
router.post('/delivery/:id/ship', authenticateToken, async (req, res) => {
    const t = await sequelize.transaction();
    try {
        const doRecord = await DeliveryOrder.findByPk(req.params.id, { transaction: t });
        if (!doRecord) throw new Error('Delivery Order tidak ditemukan');

        // DO uses JSONB `data` column — get full data
        const doRaw = doRecord.dataValues;
        const doData = doRaw.data || doRaw;
        
        if ((doData.status || doRaw.status) === 'SHIPPED') throw new Error('Delivery Order sudah dikirim');

        const { driverName, vehicleNo } = req.body;
        const items = doData.items || [];
        const doNumber = doData.doNumber || doRaw.doNumber || '';
        const salesOrderId = doData.salesOrderId || doRaw.salesOrderId || '';

        let totalCogs = 0;

        // 1. Potong Stok untuk setiap item
        for (const item of items) {
            if (item.inventoryItemId) {
                const invItem = await InventoryItem.findByPk(item.inventoryItemId, { transaction: t });
                if (invItem) {
                    await StockTransaction.create({
                        id: uuidv4(),
                        date: new Date(),
                        item_id: item.inventoryItemId,
                        type: 'OUT',
                        qty: item.qty,
                        reference: 'SALES_OUT',
                        reference_id: doRecord.id,
                        notes: `Delivery Order ${doNumber}`,
                        created_by: req.user.name || req.user.full_name || 'Admin Warehouse',
                        location: 'WHS'
                    }, { transaction: t });

                    // Hitung total COGS (HPP)
                    const purchasePrice = parseFloat(invItem.base_price || invItem.purchasePrice || 0);
                    if (purchasePrice > 0) {
                        totalCogs += (purchasePrice * item.qty);
                    }
                }
            }
        }

        // 2. Jurnal HPP jika ada
        if (totalCogs > 0) {
            await JournalEntry.create({
                id: uuidv4(),
                date: new Date(),
                description: `HPP Pengiriman SJ ${doNumber}`,
                reference_type: 'DO',
                reference_id: doRecord.id,
                items: [
                    { accountId: 'acc_cogs', debit: totalCogs, credit: 0 },
                    { accountId: 'acc_inv_fg', debit: 0, credit: totalCogs }
                ],
                total_debit: totalCogs,
                total_credit: totalCogs
            }, { transaction: t });
        }

        // 3. Update DO status — uses JSONB `data` column
        const updatedData = {
            ...doData,
            status: 'SHIPPED',
            shippedAt: new Date().toISOString(),
            driverName: driverName || doData.driverName,
            vehicleNo: vehicleNo || doData.vehicleNo
        };
        await doRecord.update({ data: updatedData }, { transaction: t });

        // 4. Update SO status if linked
        if (salesOrderId) {
            const so = await SalesOrder.findByPk(salesOrderId, { transaction: t });
            if (so) {
                await so.update({ status: 'DELIVERED' }, { transaction: t });
            }
        }

        // 5. Log
        await SystemLog.create({
            id: uuidv4(),
            user_id: req.user.id,
            action: 'SHIP_DELIVERY_ORDER',
            details: `Mengkonfirmasi pengiriman SJ: ${doNumber}`,
            timestamp: new Date()
        }, { transaction: t });

        await t.commit();
        res.json({ success: true, message: 'Pengiriman berhasil dikonfirmasi, stok dipotong, dan jurnal HPP dicatat.' });
    } catch (err) {
        await t.rollback();
        console.error('Error shipping DO:', err);
        res.status(400).json({ error: err.message });
    }
});

module.exports = router;
