// server/routes/purchase.js — API untuk Modul Pembelian (Atomic Transactions)
const router = require('express').Router();
const { PurchaseOrder, InventoryItem, StockTransaction, JournalEntry, PurchaseInvoice, SupplierPayment, SystemLog, sequelize } = require('../models');
const { authenticateToken } = require('../middleware/auth');
const { v4: uuidv4 } = require('uuid');

/**
 * POST /api/purchase/orders/:id/receive
 * Penerimaan Barang dari PO (Goods Receipt) — Atomic Transaction
 * 1. Update receivedQty per item
 * 2. Buat Stock Transaction IN untuk setiap item yang diterima
 * 3. Buat Jurnal Akuntansi (Debit Persediaan, Kredit Hutang Usaha)
 * 4. Update status PO (PARTIALLY RECEIVED / RECEIVED)
 */
router.post('/orders/:id/receive', authenticateToken, async (req, res) => {
    const t = await sequelize.transaction();
    try {
        // The PO model uses JSONB `data` column OR explicit columns.
        // The generic CRUD stores entire objects, so let's handle both patterns.
        let po = await PurchaseOrder.findByPk(req.params.id, { transaction: t });
        if (!po) throw new Error('Purchase Order tidak ditemukan');

        // PO data can be stored in `data` JSONB or in explicit columns
        // The CRUD endpoint stores raw JSON, check which pattern
        let poData = po.dataValues;
        
        const { receivedItems, recvDate, recvNpb, recvSj, recvNotes } = req.body;
        
        if (!receivedItems || !Array.isArray(receivedItems) || receivedItems.length === 0) {
            throw new Error('Tidak ada item yang diterima');
        }

        // Get existing items from PO (could be in `items` column or in `data.items`)
        let poItems = poData.items || [];
        if (typeof poItems === 'string') poItems = JSON.parse(poItems);
        
        let totalValueReceived = 0;
        let sumReceivedAll = 0;
        let sumTargetAll = 0;

        // Deep copy items for update
        const updatedItems = JSON.parse(JSON.stringify(poItems));

        // Process each received item
        for (const recvItem of receivedItems) {
            const { index, qty, inventoryItemId, prodText, price } = recvItem;
            
            if (!qty || qty <= 0) continue;

            // Update receivedQty in the PO item
            if (index !== undefined && updatedItems[index]) {
                updatedItems[index].receivedQty = (updatedItems[index].receivedQty || 0) + qty;
            }

            // Create Stock Transaction IN
            if (inventoryItemId) {
                await StockTransaction.create({
                    id: uuidv4(),
                    date: recvDate ? new Date(recvDate) : new Date(),
                    itemId: inventoryItemId,
                    type: 'IN',
                    qty: qty,
                    reference: 'PO',
                    referenceId: po.id,
                    notes: `Penerimaan PO ${poData.po_number || poData.poNumber || ''} - ${prodText || ''}${recvNpb ? ' (NPB: ' + recvNpb + ')' : ''}`,
                    createdBy: req.user.name || req.user.full_name || 'System',
                    location: 'WHS'
                }, { transaction: t });
            }

            totalValueReceived += (qty * (price || 0));
        }

        // Calculate totals for status determination
        updatedItems.forEach(item => {
            sumTargetAll += (item.qty || 0);
            sumReceivedAll += (item.receivedQty || 0);
        });

        const isCompleted = sumReceivedAll >= sumTargetAll;
        const newStatus = isCompleted ? 'RECEIVED' : 'PARTIALLY RECEIVED';

        // Build receipts array
        let receipts = poData.receipts || [];
        if (typeof receipts === 'string') receipts = JSON.parse(receipts);
        receipts.push({
            id: uuidv4(),
            date: recvDate || new Date().toISOString().split('T')[0],
            npbNumber: recvNpb || '',
            suratJalan: recvSj || '',
            npb: recvNpb || '',
            notes: recvNotes || '',
            items: receivedItems.filter(r => r.qty > 0)
        });

        // Update PO
        await po.update({
            status: newStatus,
            items: updatedItems,
            receipts: receipts,
            // Use Sequelize literal for fields that may not exist in model schema
        }, { transaction: t });

        // Also update raw data fields if they exist
        try {
            await sequelize.query(
                `UPDATE purchase_orders SET 
                    status = :status,
                    items = :items,
                    receipts = :receipts
                WHERE id = :id`,
                {
                    replacements: {
                        status: newStatus,
                        items: JSON.stringify(updatedItems),
                        receipts: JSON.stringify(receipts),
                        id: po.id
                    },
                    transaction: t
                }
            );
        } catch (e) {
            // Columns may not exist, that's okay
            console.log('Direct SQL update skipped:', e.message);
        }

        // Create Journal Entry: Debit Inventory, Credit AP
        if (totalValueReceived > 0) {
            // Determine inventory account based on first item's category
            let invAccount = 'acc_inv_rm'; // Default Raw Material
            if (receivedItems[0]?.inventoryItemId) {
                const firstItem = await InventoryItem.findByPk(receivedItems[0].inventoryItemId, { transaction: t });
                if (firstItem) {
                    const cat = (firstItem.category || '').toUpperCase();
                    if (cat.includes('FINISH') || cat === 'FINISHED_GOODS' || cat === 'FG') {
                        invAccount = 'acc_inv_fg';
                    }
                }
            }

            await JournalEntry.create({
                id: uuidv4(),
                date: recvDate ? new Date(recvDate) : new Date(),
                description: `Penerimaan Barang PO ${poData.po_number || poData.poNumber || ''}${recvNpb ? ' (NPB: ' + recvNpb + ')' : ''}`,
                reference_type: 'PO',
                reference_id: po.id,
                items: [
                    { accountId: invAccount, debit: totalValueReceived, credit: 0 },
                    { accountId: 'acc_ap', debit: 0, credit: totalValueReceived }
                ],
                total_debit: totalValueReceived,
                total_credit: totalValueReceived
            }, { transaction: t });
        }

        // System Log
        await SystemLog.create({
            user_id: req.user.userId,
            action: 'RECEIVE_PO_GOODS',
            details: `Menerima barang untuk PO ${poData.po_number || poData.poNumber || ''}: ${receivedItems.length} item, total ${totalValueReceived}`,
            timestamp: new Date()
        }, { transaction: t });

        await t.commit();
        
        const sisa = sumTargetAll - sumReceivedAll;
        res.json({
            success: true,
            isCompleted,
            newStatus,
            remaining: sisa,
            message: isCompleted
                ? 'Semua barang diterima! PO selesai.'
                : `Diterima sebagian. Sisa ${sisa} unit.`
        });
    } catch (err) {
        await t.rollback();
        console.error('Error receiving PO goods:', err);
        res.status(400).json({ error: err.message });
    }
});

/**
 * POST /api/purchase/payments/:invoiceId/pay
 * Pembayaran Supplier — Atomic Transaction
 * 1. Buat record SupplierPayment
 * 2. Buat Jurnal (Debit Hutang Usaha, Kredit Kas/Bank)
 * 3. Update status PurchaseInvoice jika lunas
 */
router.post('/payments/:invoiceId/pay', authenticateToken, async (req, res) => {
    const t = await sequelize.transaction();
    try {
        const inv = await PurchaseInvoice.findByPk(req.params.invoiceId, { transaction: t });
        if (!inv) throw new Error('Invoice tidak ditemukan');

        const { amount, method, referenceNote, date } = req.body;
        if (!amount || amount <= 0) throw new Error('Jumlah pembayaran tidak valid');

        // Cari total yang sudah dibayar
        const existingPayments = await SupplierPayment.findAll({
            where: { invoice_id: inv.id },
            transaction: t
        });
        const paid = existingPayments.reduce((sum, p) => sum + parseFloat(p.amount || 0), 0);
        const invTotal = parseFloat(inv.total_amount || inv.dataValues.totalAmount || 0);
        const balance = invTotal - paid;

        if (amount > balance + 1) {
            throw new Error(`Melebihi sisa hutang (${balance})`);
        }

        // 1. Create Payment Record
        const paymentId = uuidv4();
        await SupplierPayment.create({
            id: paymentId,
            invoice_id: inv.id,
            date: date ? new Date(date) : new Date(),
            amount: amount,
            method: method || 'Cash',
            reference: referenceNote || '',
            notes: `Pembayaran untuk ${inv.inv_number || ''}`
        }, { transaction: t });

        // 2. Create Journal Entry
        await JournalEntry.create({
            id: uuidv4(),
            date: date ? new Date(date) : new Date(),
            description: `Pembayaran Hutang INV ${inv.inv_number || ''} (${method || 'Cash'})`,
            reference_type: 'SUPPLIER_PAYMENT',
            reference_id: paymentId,
            items: [
                { accountId: 'acc_ap', debit: amount, credit: 0 },
                { accountId: method === 'Transfer Bank' ? 'acc_bank' : 'acc_cash', debit: 0, credit: amount }
            ],
            total_debit: amount,
            total_credit: amount
        }, { transaction: t });

        // 3. Update invoice status if fully paid
        const newPaid = paid + amount;
        if (newPaid >= invTotal - 1) {
            await inv.update({ status: 'PAID' }, { transaction: t });
        }

        // 4. System Log
        await SystemLog.create({
            user_id: req.user.userId,
            action: 'SUPPLIER_PAYMENT',
            details: `Pembayaran ${amount} untuk invoice ${inv.inv_number || inv.id}`,
            timestamp: new Date()
        }, { transaction: t });

        await t.commit();
        res.json({
            success: true,
            isPaid: newPaid >= invTotal - 1,
            message: newPaid >= invTotal - 1 ? 'Pembayaran berhasil! Invoice LUNAS.' : 'Pembayaran berhasil dicatat.'
        });
    } catch (err) {
        await t.rollback();
        console.error('Error processing payment:', err);
        res.status(400).json({ error: err.message });
    }
});

module.exports = router;
