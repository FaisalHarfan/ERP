// server/routes/purchase.js — API untuk Modul Pembelian (Atomic Transactions)
const router = require('express').Router();
const { PurchaseOrder, InventoryItem, StockTransaction, JournalEntry, PurchaseInvoice, SupplierPayment, SystemLog, BankAccount, sequelize } = require('../models');
const { authenticateToken, requirePermission } = require('../middleware/auth');
const { v4: uuidv4 } = require('uuid');

/**
 * POST /api/purchase/orders/:id/receive
 * Penerimaan Barang dari PO (Goods Receipt) — Atomic Transaction
 * 1. Update receivedQty per item
 * 2. Buat Stock Transaction IN untuk setiap item yang diterima
 * 3. Buat Jurnal Akuntansi (Debit Persediaan, Kredit Hutang Usaha)
 * 4. Update status PO (PARTIALLY RECEIVED / RECEIVED)
 */
router.post('/orders/:id/receive', authenticateToken, requirePermission('pembelian', 'edit'), async (req, res) => {
    const t = await sequelize.transaction();
    try {
        const poId = (req.params.id || '').replace(/___/g, '/');
        // The PO model uses JSONB `data` column OR explicit columns.
        // The generic CRUD stores entire objects, so let's handle both patterns.
        let po = await PurchaseOrder.findByPk(poId, { transaction: t });
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
                    txNo: poData.po_number || poData.poNumber || '',
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
router.post('/payments/:invoiceId/pay', authenticateToken, requirePermission('pembelian', 'edit'), async (req, res) => {
    const t = await sequelize.transaction();
    try {
        const inv = await PurchaseInvoice.findByPk(req.params.invoiceId, { transaction: t });
        if (!inv) throw new Error('Invoice tidak ditemukan');

        const { amount, method, referenceNote, date, bankAccountId } = req.body;
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
            bank_account_id: bankAccountId,
            notes: `Pembayaran untuk ${inv.inv_number || ''}`
        }, { transaction: t });

        // Resolve credit account from BankAccount settings
        let creditAccount = 'acc_cash'; // Default fallback
        if (bankAccountId) {
            const bank = await BankAccount.findByPk(bankAccountId);
            if (bank && bank.account_id) {
                creditAccount = bank.account_id;
            } else {
                creditAccount = method === 'Transfer Bank' ? 'acc_bank' : 'acc_cash';
            }
        } else {
            creditAccount = method === 'Transfer Bank' ? 'acc_bank' : 'acc_cash';
        }

        // 2. Create Journal Entry
        await JournalEntry.create({
            id: uuidv4(),
            date: date ? new Date(date) : new Date(),
            description: `Pembayaran Hutang INV ${inv.inv_number || ''} (${method || 'Cash'})`,
            reference_type: 'SUPPLIER_PAYMENT',
            reference_id: paymentId,
            items: [
                { accountId: 'acc_ap', debit: amount, credit: 0 },
                { accountId: creditAccount, debit: 0, credit: amount }
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

/**
 * POST /api/purchase/orders/:id(*)/adjust-receipt
 * Penyesuaian Penerimaan (Khusus Admin)
 */
router.post('/orders/:id/adjust-receipt', authenticateToken, requirePermission('pembelian', 'edit'), async (req, res) => {
    const roleId = (req.user.roleId || req.user.role_id || '').toLowerCase();
    const userId = (req.user.userId || req.user.id || '').toLowerCase();
    if (roleId !== 'role_admin' && userId !== 'user_admin') {
        return res.status(403).json({ error: 'Hanya Admin yang dapat menyesuaikan penerimaan barang' });
    }

    const { items: adjustments, reason, date } = req.body;
    const adjDate = date ? new Date(date) : new Date();

    if (!adjustments || !Array.isArray(adjustments)) {
        return res.status(400).json({ error: 'Data item tidak valid' });
    }
    const poId = (req.params.id || '').replace(/___/g, '/');
    if (!reason) {
        return res.status(400).json({ error: 'Alasan penyesuaian wajib diisi' });
    }

    const t = await sequelize.transaction();
    try {
        let po = await PurchaseOrder.findByPk(poId, { transaction: t });
        if (!po) throw new Error('Purchase Order tidak ditemukan');

        let poData = po.dataValues;
        let poItems = poData.items || [];
        if (typeof poItems === 'string') poItems = JSON.parse(poItems);

        let receipts = poData.receipts || [];
        if (typeof receipts === 'string') receipts = JSON.parse(receipts);

        const adjustmentItems = [];
        let totalAdjustmentValue = 0; // For journal entry

        for (const adj of adjustments) {
            const index = parseInt(adj.index);
            const newQty = parseFloat(adj.newReceivedQty);

            if (isNaN(index) || isNaN(newQty) || !poItems[index]) continue;

            const oldQty = parseFloat(poItems[index].receivedQty || 0);
            const diff = newQty - oldQty;

            if (diff !== 0) {
                // Update item's receivedQty
                poItems[index].receivedQty = newQty;
                
                const inventoryItemId = poItems[index].inventoryItemId || poItems[index].id;
                const prodText = poItems[index].prodText;
                const price = parseFloat(poItems[index].price || 0);

                adjustmentItems.push({
                    index,
                    inventoryItemId,
                    prodText,
                    oldQty,
                    newQty,
                    diff,
                    price
                });

                // Calculate financial impact
                totalAdjustmentValue += (diff * price);

                // Create StockTransaction
                if (inventoryItemId) {
                    await StockTransaction.create({
                        id: uuidv4(),
                        txNo: poData.po_number || poData.poNumber || '',
                        date: adjDate,
                        itemId: inventoryItemId,
                        type: diff > 0 ? 'IN' : 'OUT',
                        qty: Math.abs(diff),
                        reference: 'PO_ADJUSTMENT',
                        referenceId: po.id,
                        notes: `Penyesuaian PO ${poData.po_number || poData.poNumber || ''} - ${prodText || ''}. Alasan: ${reason}`,
                        createdBy: req.user.name || req.user.full_name || 'SystemAdmin',
                        location: 'WHS'
                    }, { transaction: t });
                }
            }
        }

        if (adjustmentItems.length === 0) {
            throw new Error('Tidak ada perubahan kuantitas untuk disesuaikan');
        }

        // Add to receipts array to maintain history
        const adjustmentRecord = {
            id: 'ADJ-' + uuidv4().split('-')[0].toUpperCase(),
            date: adjDate.toISOString(),
            items: adjustmentItems.map(a => ({
                index: a.index,
                inventoryItemId: a.inventoryItemId,
                prodText: a.prodText,
                diff: a.diff,
                qty: Math.abs(a.diff),
                price: a.price
            })),
            isAdjustment: true,
            reason: reason,
            user: req.user.name || req.user.full_name || 'SystemAdmin'
        };
        receipts.push(adjustmentRecord);

        // Recalculate PO Status
        let sumReceivedAll = 0;
        let sumTargetAll = 0;
        poItems.forEach(item => {
            sumTargetAll += (item.qty || 0);
            sumReceivedAll += (item.receivedQty || 0);
        });

        let newStatus = poData.status;
        if (sumReceivedAll <= 0) {
            newStatus = 'APPROVED';
        } else if (sumReceivedAll < sumTargetAll) {
            newStatus = 'PARTIALLY RECEIVED';
        } else {
            newStatus = 'RECEIVED';
        }

        // Adjust Journal Entry if there is a financial impact
        if (totalAdjustmentValue !== 0) {
            const entryNo = 'JRN-' + Math.floor(Math.random() * 1000000);
            
            let accountDebit = '';
            let accountCredit = '';
            let amount = Math.abs(totalAdjustmentValue);

            if (totalAdjustmentValue > 0) {
                // Increase stock: Debit Inventory, Credit AP
                accountDebit = '113000'; // Persediaan Barang
                accountCredit = '211000'; // Hutang Dagang
            } else {
                // Decrease stock: Debit AP, Credit Inventory
                accountDebit = '211000'; // Hutang Dagang
                accountCredit = '113000'; // Persediaan Barang
            }

            await JournalEntry.create({
                id: uuidv4(),
                entry_no: entryNo,
                date: adjDate,
                description: `Penyesuaian Penerimaan PO ${poData.po_number || poData.poNumber}: ${reason}`,
                account_id: accountDebit,
                type: 'DEBIT',
                amount: amount,
                reference_type: 'PO',
                reference_id: po.id
            }, { transaction: t });

            await JournalEntry.create({
                id: uuidv4(),
                entry_no: entryNo,
                date: adjDate,
                description: `Penyesuaian Penerimaan PO ${poData.po_number || poData.poNumber}: ${reason}`,
                account_id: accountCredit,
                type: 'CREDIT',
                amount: amount,
                reference_type: 'PO',
                reference_id: po.id
            }, { transaction: t });
        }

        // System Log
        await SystemLog.create({
            user_id: req.user.userId || req.user.id,
            action: 'ADJUST_PO_RECEIPT',
            details: `Penyesuaian PO ${poData.po_number || poData.poNumber}. Alasan: ${reason}`,
            timestamp: new Date()
        }, { transaction: t });

        // Update PO
        await po.update({
            status: newStatus,
            items: poItems,
            receipts: receipts,
        }, { transaction: t });

        try {
            await sequelize.query(
                `UPDATE purchase_orders SET status = :status, items = :items, receipts = :receipts WHERE id = :id`,
                {
                    replacements: { status: newStatus, items: JSON.stringify(poItems), receipts: JSON.stringify(receipts), id: po.id },
                    transaction: t
                }
            );
        } catch (e) { }

        await t.commit();
        res.json({ success: true, newStatus, message: 'Penyesuaian penerimaan berhasil.' });
    } catch (err) {
        await t.rollback();
        console.error('Error adjusting receipt:', err);
        res.status(400).json({ error: err.message });
    }
});

module.exports = router;
