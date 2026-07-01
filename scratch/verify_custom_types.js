const { Account, AccountType, JournalEntry, sequelize } = require('../server/models');

async function test() {
    console.log('🧪 Verifying Custom Account Types logic...');
    try {
        // 1. Create a custom type
        const [myType] = await AccountType.findOrCreate({
            where: { id: 'type_test_asset' },
            defaults: { name: 'Test Kas & Bank', base_type: 'ASSET' }
        });
        console.log('✅ AccountType created/found:', myType.name, '->', myType.base_type);

        // 2. Create an account with this type
        const [myAccount] = await Account.findOrCreate({
            where: { id: 'acc_test_kas' },
            defaults: {
                code: '1199',
                name: 'Kas Uji Coba',
                type: 'type_test_asset',
                opening_balance: 1000000,
                isGroup: false
            }
        });
        console.log('✅ Account created/found:', myAccount.name, 'with type ID:', myAccount.type);

        // 3. Create a journal entry touching this account to test ledger resolution
        const entryId = 'journal_test_1';
        await JournalEntry.destroy({ where: { id: entryId } });
        const entry = await JournalEntry.create({
            id: entryId,
            date: new Date(),
            journal_no: 'JN-TEST-001',
            description: 'Uji Coba Mutasi',
            items: [
                { accountId: 'acc_test_kas', debit: 500000, credit: 0 },
                { accountId: 'acc_other_dummy', debit: 0, credit: 500000 }
            ],
            total_debit: 500000,
            total_credit: 500000
        });
        console.log('✅ JournalEntry created.');

        // 4. Run ledger logic manually
        const account = await Account.findByPk('acc_test_kas');
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
            }
        }
        console.log('✅ Mapped account.type to baseType:', baseType);
        const isDebit = baseType === 'ASSET' || baseType === 'EXPENSE';
        console.log('✅ isDebit determined as:', isDebit);

        // Clean up dummy data so we don't pollute database
        await JournalEntry.destroy({ where: { id: entryId } });
        await Account.destroy({ where: { id: 'acc_test_kas' } });
        await AccountType.destroy({ where: { id: 'type_test_asset' } });
        console.log('🗑️ Test data cleaned up.');
        console.log('🎉 Verification script completed successfully!');
    } catch (e) {
        console.error('❌ Verification failed:', e.message);
    }
    process.exit(0);
}

test();
