const fs = require('fs');
const path = require('path');
const models = require('./models');

async function seedCOA2026() {
    console.log('🚀 Starting COA 2026 Seeding in PostgreSQL...');
    const coaData = JSON.parse(fs.readFileSync(path.join(__dirname, '../final_coa_2026.json'), 'utf8'));

    // 1. Account Types
    console.log('📁 Seeding Account Types...');
    for (const t of coaData.accountTypes) {
        await models.AccountType.upsert({
            id: t.id,
            name: t.name,
            base_type: t.base_type || t.baseType,
            baseType: t.base_type || t.baseType
        });
    }
    console.log(`✅ ${coaData.accountTypes.length} Account Types seeded.`);

    // 2. Clear old accounts table (or truncate)
    console.log('🗑️ Resetting Accounts table...');
    // Delete in reverse or force truncate
    try {
        await models.sequelize.query('TRUNCATE TABLE accounts CASCADE;');
    } catch (e) {
        await models.Account.destroy({ where: {}, truncate: true, cascade: true });
    }

    // 3. Insert Parent Groups first, then Child Accounts
    const groups = coaData.accounts.filter(a => a.isGroup);
    const leafs = coaData.accounts.filter(a => !a.isGroup);

    console.log(`📥 Inserting ${groups.length} Parent Groups...`);
    for (const g of groups) {
        await models.Account.create({
            id: g.id,
            code: g.code,
            name: g.name,
            type: g.type,
            parentId: g.parentId || null,
            isGroup: true,
            status: g.status || 'ACTIVE',
            opening_balance: 0
        });
    }

    console.log(`📥 Inserting ${leafs.length} Leaf Accounts...`);
    for (const l of leafs) {
        await models.Account.create({
            id: l.id,
            code: l.code,
            name: l.name,
            type: l.type,
            parentId: l.parentId || null,
            isGroup: false,
            status: l.status || 'ACTIVE',
            opening_balance: 0
        });
    }

    // 4. Update Bank Accounts to point to valid new accounts
    const bcas = await models.BankAccount.findAll();
    for (const ba of bcas) {
        if (ba.id === 'bank_cash') {
            await ba.update({ account_id: 'acc_1101_01' });
        } else {
            await ba.update({ account_id: 'acc_1102_01' });
        }
    }

    console.log(`🎉 COA 2026 Seeding Completed! Total: ${coaData.accounts.length} accounts & groups.`);
    process.exit(0);
}

seedCOA2026().catch(err => {
    console.error('❌ Error during COA 2026 seeding:', err);
    process.exit(1);
});
