// server/routes/finance.js
const router = require('express').Router();
const { authenticateToken, requirePermission } = require('../middleware/auth');
const { Account, JournalEntry, Expense, Receipt, SystemLog, AccountType, sequelize } = require('../models');

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
        const { id, code, name, type, description, openingBalance, parentId, isGroup, status } = req.body;
        
        if (id) {
            const acc = await Account.findByPk(id);
            if (!acc) return res.status(404).json({ error: 'Account not found' });
            await acc.update({
                code,
                name,
                type,
                description,
                opening_balance: openingBalance,
                parentId: parentId || null,
                isGroup: isGroup || false,
                status
            });
            res.json(acc);
        } else {
            const acc = await Account.create({
                id: generateId(),
                code,
                name,
                type,
                description,
                opening_balance: openingBalance || 0,
                parentId: parentId || null,
                isGroup: isGroup || false,
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

// Helper: Get current balance for an account dynamically based on transactions and opening balance
async function getAccountBalance(accountId) {
    const account = await Account.findByPk(accountId);
    if (!account) return 0;
    
    let baseType = 'ASSET';
    if (account.type) {
        const accType = await AccountType.findOne({
            where: {
                [sequelize.Sequelize.Op.or]: [
                    { id: account.type },
                    { name: account.type }
                ]
            }
        });
        if (accType) {
            baseType = accType.base_type;
        } else {
            const typeUpper = account.type.toUpperCase();
            if (typeUpper.includes('ASSET') || typeUpper.includes('ASET') || typeUpper.includes('HARTA')) baseType = 'ASSET';
            else if (typeUpper.includes('LIABILITY') || typeUpper.includes('LIABILITAS') || typeUpper.includes('HUTANG') || typeUpper.includes('KEWAJIBAN')) baseType = 'LIABILITY';
            else if (typeUpper.includes('EQUITY') || typeUpper.includes('EKUITAS') || typeUpper.includes('MODAL')) baseType = 'EQUITY';
            else if (typeUpper.includes('INCOME') || typeUpper.includes('PENDAPATAN') || typeUpper.includes('PENJUALAN')) baseType = 'INCOME';
            else if (typeUpper.includes('EXPENSE') || typeUpper.includes('BEBAN') || typeUpper.includes('BIAYA')) baseType = 'EXPENSE';
        }
    }
    const isDebit = baseType === 'ASSET' || baseType === 'EXPENSE';

    const allEntries = await JournalEntry.findAll({
        where: sequelize.literal(`items @> '[{"accountId": "${accountId}"}]'`)
    });

    let balance = parseFloat(account.opening_balance) || 0;
    allEntries.forEach(j => {
        const journalItems = j.items;
        journalItems.forEach(item => {
            if (item.accountId === accountId) {
                const debit = parseFloat(item.debit) || 0;
                const credit = parseFloat(item.credit) || 0;
                if (isDebit) {
                    balance += (debit - credit);
                } else {
                    balance += (credit - debit);
                }
            }
        });
    });
    return balance;
}

// ─── EXPENSE RECORDING (Atomic: Expense + Journal) ───
router.post('/expenses', authenticateToken, requirePermission('finance', 'edit'), async (req, res) => {
    const t = await sequelize.transaction();
    try {
        const { date, amount, fromAccountId, toAccountId, departmentId, description, method, paidTo } = req.body;

        // Validation: check if Cash/Bank account has sufficient balance
        const balance = await getAccountBalance(fromAccountId);
        if (balance < amount) {
            return res.status(400).json({ error: 'Saldo Kas/Bank tidak mencukupi untuk melakukan pengeluaran ini!' });
        }

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
            method,
            paid_to: paidTo
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
        const { date, amount, targetAccountId, sourceAccountId, method, description, receivedFrom } = req.body;
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
            method,
            received_from: receivedFrom
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
router.get('/ledger/:accountId', authenticateToken, requirePermission('finance', 'view'), async (req, res) => {
    try {
        const { accountId } = req.params;
        const { startDate, endDate } = req.query;

        let isVirtual = false;
        let targetAccountIds = [];
        let accountCode = '';
        let accountName = '';
        let openingBalance = 0;
        let baseType = 'ASSET';

        if (accountId.startsWith('type_')) {
            isVirtual = true;
            const typeId = accountId.replace('type_', '');
            const accType = await AccountType.findByPk(typeId);
            if (!accType) return res.status(404).json({ error: 'Account type not found' });
            
            accountName = accType.name;
            accountCode = 'Kategori';
            baseType = accType.base_type;
            
            // Find all direct accounts under this type
            const allTypeAccounts = await Account.findAll({
                where: {
                    [sequelize.Sequelize.Op.or]: [
                        { type: typeId },
                        { type: accType.name }
                    ]
                }
            });
            
            // Recursively get all children ids for all accounts of this type
            const allAccountsList = await Account.findAll();
            const getDescendantIds = (accs) => {
                let ids = accs.map(a => a.id);
                let checkList = [...ids];
                while (checkList.length > 0) {
                    const currentId = checkList.shift();
                    const children = allAccountsList.filter(a => a.parentId === currentId);
                    children.forEach(c => {
                        if (!ids.includes(c.id)) {
                            ids.push(c.id);
                            checkList.push(c.id);
                        }
                    });
                }
                return ids;
            };
            
            targetAccountIds = getDescendantIds(allTypeAccounts);
            openingBalance = allTypeAccounts.reduce((sum, a) => sum + (parseFloat(a.opening_balance) || 0), 0);
        } else {
            const account = await Account.findByPk(accountId);
            if (!account) return res.status(404).json({ error: 'Account not found' });

            accountName = account.name;
            accountCode = account.code;
            openingBalance = parseFloat(account.opening_balance) || 0;

            // Resolve account type base_type
            if (account.type) {
                const accType = await AccountType.findOne({
                    where: {
                        [sequelize.Sequelize.Op.or]: [
                            { id: account.type },
                            { name: account.type }
                        ]
                    }
                });
                if (accType) {
                    baseType = accType.base_type;
                } else {
                    const typeUpper = account.type.toUpperCase();
                    if (typeUpper.includes('ASSET') || typeUpper.includes('ASET') || typeUpper.includes('HARTA')) baseType = 'ASSET';
                    else if (typeUpper.includes('LIABILITY') || typeUpper.includes('LIABILITAS') || typeUpper.includes('HUTANG') || typeUpper.includes('KEWAJIBAN')) baseType = 'LIABILITY';
                    else if (typeUpper.includes('EQUITY') || typeUpper.includes('EKUITAS') || typeUpper.includes('MODAL')) baseType = 'EQUITY';
                    else if (typeUpper.includes('INCOME') || typeUpper.includes('PENDAPATAN') || typeUpper.includes('PENJUALAN')) baseType = 'INCOME';
                    else if (typeUpper.includes('EXPENSE') || typeUpper.includes('BEBAN') || typeUpper.includes('BIAYA')) baseType = 'EXPENSE';
                }
            }

            if (account.isGroup) {
                const allAccountsList = await Account.findAll();
                targetAccountIds = [account.id];
                let checkList = [account.id];
                while (checkList.length > 0) {
                    const currentId = checkList.shift();
                    const children = allAccountsList.filter(a => a.parentId === currentId);
                    children.forEach(c => {
                        if (!targetAccountIds.includes(c.id)) {
                            targetAccountIds.push(c.id);
                            checkList.push(c.id);
                        }
                    });
                }
            } else {
                targetAccountIds = [account.id];
            }
        }

        const isDebit = baseType === 'ASSET' || baseType === 'EXPENSE';

        if (targetAccountIds.length === 0) {
            return res.json({
                account: { code: accountCode, name: accountName, type: baseType },
                ledger: []
            });
        }

        // Fetch all journal entries that touch any of the target accounts
        const allEntries = await JournalEntry.findAll({
            where: sequelize.literal(`EXISTS (
                SELECT 1 FROM jsonb_array_elements(items) AS item 
                WHERE item->>'accountId' IN (${targetAccountIds.map(id => `'${id}'`).join(',')})
            )`),
            order: [['date', 'ASC']]
        });

        let runningBalance = openingBalance;
        const ledger = [];

        // Initial Balance Entry
        ledger.push({
            date: new Date(),
            journalNo: '-',
            description: 'Saldo Awal',
            debit: 0,
            credit: 0,
            balance: runningBalance
        });

        allEntries.forEach(j => {
            const journalItems = j.items;
            let entryDebit = 0;
            let entryCredit = 0;

            journalItems.forEach(item => {
                if (targetAccountIds.includes(item.accountId)) {
                    entryDebit += parseFloat(item.debit) || 0;
                    entryCredit += parseFloat(item.credit) || 0;
                }
            });

            if (entryDebit > 0 || entryCredit > 0) {
                if (isDebit) {
                    runningBalance += (entryDebit - entryCredit);
                } else {
                    runningBalance += (entryCredit - entryDebit);
                }

                ledger.push({
                    date: j.date,
                    journalNo: j.journal_no || (j.reference_type ? `${j.reference_type}-${j.id.slice(0, 8).toUpperCase()}` : `JRN-${j.id.slice(0, 8).toUpperCase()}`),
                    description: j.description,
                    debit: entryDebit,
                    credit: entryCredit,
                    balance: runningBalance
                });
            }
        });

        // Apply filters in memory
        let filteredLedger = ledger;
        if (startDate) filteredLedger = filteredLedger.filter(l => l.date >= new Date(startDate) || l.description === 'Saldo Awal');
        if (endDate) filteredLedger = filteredLedger.filter(l => l.date <= new Date(endDate) || l.description === 'Saldo Awal');

        res.json({
            account: { code: accountCode, name: accountName, type: baseType },
            ledger: filteredLedger.reverse()
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
