// server/routes/finance.js
const router = require('express').Router();
const { authenticateToken, requirePermission } = require('../middleware/auth');
const { Account, JournalEntry, Expense, Receipt, SystemLog, sequelize } = require('../models');

// Helper: Generate Finance Tx No (Simplified)
function generateTxNo(type) {
    const prefix = type === 'RECEIPT' ? 'REC' : (type === 'EXPENSE' ? 'EXP' : 'JN');
    return `${prefix}-${Date.now().toString().slice(-7)}`;
}

// Helper: Generate ID
function generateId() {
    return Date.now().toString() + Math.random().toString(36).substr(2, 5);
}

// ─── CHARTS OF ACCOUNTS ───
router.post('/accounts', authenticateToken, requirePermission('finance', 'edit'), async (req, res) => {
    try {
        const { id, code, name, type, description, openingBalance, status } = req.body;
        
        if (id) {
            const acc = await Account.findByPk(id);
            if (!acc) return res.status(404).json({ error: 'Account not found' });
            await acc.update({ code, name, type, description, opening_balance: openingBalance, status });
            res.json(acc);
        } else {
            const acc = await Account.create({
                id: generateId(),
                code, name, type, description,
                opening_balance: openingBalance || 0,
                status: status || 'ACTIVE'
            });
            res.status(201).json(acc);
        }
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ─── MANUAL JOURNAL ENTRY ───
router.post('/journal', authenticateToken, requirePermission('finance', 'edit'), async (req, res) => {
    const t = await sequelize.transaction();
    try {
        const { date, journalNo, description, items, referenceType, referenceId, departmentId, partnerId, partnerName } = req.body;
        
        // Validation: Sum of debits must equal sum of credits
        const totalDebit = items.reduce((sum, it) => sum + (parseFloat(it.debit) || 0), 0);
        const totalCredit = items.reduce((sum, it) => sum + (parseFloat(it.credit) || 0), 0);
        
        if (Math.abs(totalDebit - totalCredit) > 0.01) {
            return res.status(400).json({ error: 'Journal tidak balance! Debit must equal Credit.' });
        }

        const entry = await JournalEntry.create({
            id: generateId(),
            date: date || new Date(),
            journal_no: journalNo || generateTxNo('JOURNAL'),
            description: description || 'Manual Journal Entry',
            reference_type: referenceType,
            reference_id: referenceId,
            department_id: departmentId,
            partner_id: partnerId,
            partner_name: partnerName,
            items,
            total_debit: totalDebit,
            total_credit: totalCredit
        }, { transaction: t });

        await SystemLog.create({
            user_id: req.user.userId,
            user_email: req.user.email,
            action: 'CREATE_JOURNAL',
            details: `Created Journal ${entry.journal_no}: ${description}`
        }, { transaction: t });

        await t.commit();
        res.status(201).json(entry);
    } catch (err) {
        await t.rollback();
        res.status(500).json({ error: err.message });
    }
});

// ─── EXPENSE RECORDING (Atomic: Expense + Journal) ───
router.post('/expenses', authenticateToken, requirePermission('finance', 'edit'), async (req, res) => {
    const t = await sequelize.transaction();
    try {
        const { date, amount, fromAccountId, toAccountId, departmentId, description, method } = req.body;
        const expenseNo = generateTxNo('EXPENSE');
        const expenseId = generateId();

        // 1. Create Expense
        const expense = await Expense.create({
            id: expenseId,
            expense_no: expenseNo,
            date: date || new Date(),
            description,
            amount,
            from_account_id: fromAccountId,
            to_account_id: toAccountId,
            department_id: departmentId,
            method
        }, { transaction: t });

        // 2. Create Journal Entry
        // Debit: Expense Account (To), Credit: Cash/Bank (From)
        const journal = await JournalEntry.create({
            id: generateId(),
            date: date || new Date(),
            journal_no: expenseNo,
            description: description || `Pengeluaran - ${expenseNo}`,
            reference_type: 'EXPENSE',
            reference_id: expenseId,
            department_id: departmentId,
            items: [
                { accountId: toAccountId, debit: amount, credit: 0 },
                { accountId: fromAccountId, debit: 0, credit: amount }
            ],
            total_debit: amount,
            total_credit: amount
        }, { transaction: t });

        await expense.update({ journal_id: journal.id }, { transaction: t });

        await SystemLog.create({
            user_id: req.user.userId,
            user_email: req.user.email,
            action: 'CREATE_EXPENSE',
            details: `Expense ${expenseNo} for ${amount} recorded.`
        }, { transaction: t });

        await t.commit();
        res.status(201).json(expense);
    } catch (err) {
        await t.rollback();
        res.status(500).json({ error: err.message });
    }
});

// ─── RECEIPT RECORDING (Atomic: Receipt + Journal) ───
router.post('/receipts', authenticateToken, requirePermission('finance', 'edit'), async (req, res) => {
    const t = await sequelize.transaction();
    try {
        const { date, amount, targetAccountId, sourceAccountId, method, description } = req.body;
        const receiptNo = generateTxNo('RECEIPT');
        const receiptId = generateId();

        // 1. Create Receipt
        const receipt = await Receipt.create({
            id: receiptId,
            receipt_no: receiptNo,
            date: date || new Date(),
            description,
            amount,
            target_account_id: targetAccountId,
            source_account_id: sourceAccountId,
            method
        }, { transaction: t });

        // 2. Create Journal Entry
        // Debit: Cash/Bank (Target), Credit: Income/Source COA
        const journal = await JournalEntry.create({
            id: generateId(),
            date: date || new Date(),
            journal_no: receiptNo,
            description: description || `Penerimaan - ${receiptNo}`,
            reference_type: 'RECEIPT',
            reference_id: receiptId,
            items: [
                { accountId: targetAccountId, debit: amount, credit: 0 },
                { accountId: sourceAccountId, debit: 0, credit: amount }
            ],
            total_debit: amount,
            total_credit: amount
        }, { transaction: t });

        await receipt.update({ journal_id: journal.id }, { transaction: t });

        await SystemLog.create({
            user_id: req.user.userId,
            user_email: req.user.email,
            action: 'CREATE_RECEIPT',
            details: `Receipt ${receiptNo} for ${amount} recorded.`
        }, { transaction: t });

        await t.commit();
        res.status(201).json(receipt);
    } catch (err) {
        await t.rollback();
        res.status(500).json({ error: err.message });
    }
});

// ─── LEDGER / MUTASI ───
router.get('/ledger/:accountId', authenticateToken, async (req, res) => {
    try {
        const { accountId } = req.params;
        const { startDate, endDate } = req.query;

        const account = await Account.findByPk(accountId);
        if (!account) return res.status(404).json({ error: 'Account not found' });

        // Fetch all journal entries that touch this account
        // Optimization: In a huge DB, we might want to use a specific JournalItem table
        // but currently we store items as JSONB in JournalEntry.
        const allEntries = await JournalEntry.findAll({
            where: sequelize.literal(`items @> '[{"accountId": "${accountId}"}]'`),
            order: [['date', 'ASC']]
        });

        let runningBalance = parseFloat(account.opening_balance) || 0;
        const ledger = [];

        // Initial Balance Entry
        ledger.push({
            date: account.createdAt,
            journalNo: '-',
            description: 'Saldo Awal',
            debit: 0,
            credit: 0,
            balance: runningBalance
        });

        allEntries.forEach(j => {
            const journalItems = j.items;
            journalItems.forEach(item => {
                if (item.accountId === accountId) {
                    const debit = parseFloat(item.debit) || 0;
                    const credit = parseFloat(item.credit) || 0;

                    // Normal Balance Logic
                    if (['ASSET', 'EXPENSE'].includes(account.type)) {
                        runningBalance += (debit - credit);
                    } else {
                        runningBalance += (credit - debit);
                    }

                    ledger.push({
                        date: j.date,
                        journalNo: j.journal_no,
                        description: j.description,
                        debit,
                        credit,
                        balance: runningBalance
                    });
                }
            });
        });

        // Apply filters in memory (for simplicity, or we could refine the query)
        let filteredLedger = ledger;
        if (startDate) filteredLedger = filteredLedger.filter(l => l.date >= new Date(startDate) || l.description === 'Saldo Awal');
        if (endDate) filteredLedger = filteredLedger.filter(l => l.date <= new Date(endDate) || l.description === 'Saldo Awal');

        res.json({
            account: { code: account.code, name: account.name, type: account.type },
            ledger: filteredLedger.reverse() // Newest first for display
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
