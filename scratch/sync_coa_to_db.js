// scratch/sync_coa_to_db.js
const fs = require('fs');
const path = require('path');
const { Account, AccountType, sequelize } = require('../server/models');

async function syncCOA() {
    console.log('🔄 Starting COA sync from Excel CSV...');
    
    // Read parsed accounts
    const parsedAccountsPath = path.join(__dirname, 'parsed_coa.json');
    if (!fs.existsSync(parsedAccountsPath)) {
        throw new Error('parsed_coa.json not found!');
    }
    const accounts = JSON.parse(fs.readFileSync(parsedAccountsPath, 'utf8'));

    // Also update final_coa_2026.json
    const coaFile = path.join(__dirname, '../final_coa_2026.json');
    let accountTypes = [
        { id: 'type_asset', name: 'Aset / Aktiva', base_type: 'ASSET', baseType: 'ASSET' },
        { id: 'type_liability', name: 'Liabilitas / Hutang', base_type: 'LIABILITY', baseType: 'LIABILITY' },
        { id: 'type_equity', name: 'Ekuitas / Modal', base_type: 'EQUITY', baseType: 'EQUITY' },
        { id: 'type_income', name: 'Pendapatan', base_type: 'INCOME', baseType: 'INCOME' },
        { id: 'type_cogs', name: 'Harga Pokok Penjualan', base_type: 'EXPENSE', baseType: 'EXPENSE' },
        { id: 'type_expense', name: 'Beban / Biaya Operasional', base_type: 'EXPENSE', baseType: 'EXPENSE' },
        { id: 'type_other_income', name: 'Pendapatan Lainnya', base_type: 'INCOME', baseType: 'INCOME' },
        { id: 'type_other_expense', name: 'Beban Lainnya', base_type: 'EXPENSE', baseType: 'EXPENSE' }
    ];
    if (fs.existsSync(coaFile)) {
        try {
            const existing = JSON.parse(fs.readFileSync(coaFile, 'utf8'));
            if (existing.accountTypes && existing.accountTypes.length > 0) {
                accountTypes = existing.accountTypes;
            }
        } catch (e) {}
    }

    fs.writeFileSync(coaFile, JSON.stringify({
        accountTypes,
        accounts
    }, null, 2));
    console.log(`✅ Saved ${accounts.length} accounts to final_coa_2026.json`);

    // Sync to PostgreSQL
    const t = await sequelize.transaction();
    try {
        // Truncate / delete current accounts
        await sequelize.query('TRUNCATE TABLE accounts CASCADE;', { transaction: t });
        console.log('  🗑️ Cleared existing accounts table');

        // Insert new accounts
        for (const a of accounts) {
            await Account.create({
                id: a.id,
                code: a.code,
                name: a.name,
                type: a.type,
                description: a.description || null,
                status: a.status || 'ACTIVE',
                opening_balance: a.opening_balance || 0,
                parentId: a.parentId || null,
                isGroup: !!a.isGroup
            }, { transaction: t });
        }

        await t.commit();
        console.log(`✅ Successfully inserted ${accounts.length} accounts into PostgreSQL table!`);
    } catch (err) {
        await t.rollback();
        console.error('❌ Failed to sync to DB:', err);
        throw err;
    } finally {
        await sequelize.close();
    }
}

syncCOA().then(() => {
    console.log('🎉 Done!');
    process.exit(0);
}).catch(err => {
    console.error(err);
    process.exit(1);
});
