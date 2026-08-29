// server/seed.js — Seed default data (admin user, roles, accounts, etc.)
const bcrypt = require('bcryptjs');
const models = require('./models');

async function seedDefaults() {
    console.log('🌱 Seeding default data...');

    // 1. Roles
    const existingRoles = await models.Role.count();
    if (existingRoles === 0) {
        const defaultPerms = {};
        ['penjualan', 'pembelian', 'logistik', 'produksi', 'finance', 'pengaturan'].forEach(m => {
            defaultPerms[m] = { view: true, edit: true };
        });

        await models.Role.bulkCreate([
            { id: 'role_admin', name: 'Administrator', is_system: true, permissions: defaultPerms },
            {
                id: 'role_user', name: 'User', is_system: false,
                permissions: {
                    penjualan: { view: true, edit: true },
                    pembelian: { view: true, edit: true },
                    logistik: { view: true, edit: true },
                    produksi: { view: true, edit: true },
                    finance: { view: true, edit: true },
                    pengaturan: { view: false, edit: false }
                }
            }
        ]);
        console.log('  ✅ Roles seeded');
    }

    // 2. Admin User
    const existingUsers = await models.User.count();
    if (existingUsers === 0) {
        const hash = await bcrypt.hash('admin123', 10);
        await models.User.create({
            id: 'user_admin',
            full_name: 'Administrator',
            username: 'admin',
            email: 'admin@tanasubur.co.id',
            password_hash: hash,
            role_id: 'role_admin',
            status: 'AKTIF',
            avatar: 'AD'
        });
        console.log('  ✅ Admin user seeded (email: admin@tanasubur.co.id / pass: admin123)');
    }

    // 3. Departments
    const existingDepts = await models.Department.count();
    if (existingDepts === 0) {
        await models.Department.bulkCreate([
            { id: 'dept_sales', name: 'Sales' },
            { id: 'dept_prod', name: 'Production' },
            { id: 'dept_inv', name: 'Inventory' },
            { id: 'dept_fin', name: 'Finance' },
            { id: 'dept_hr', name: 'HR' },
            { id: 'dept_mgm', name: 'Management' }
        ]);
        console.log('  ✅ Departments seeded');
    }

    // 4b. Default Account Types & COA 2026
    try {
        const fs = require('fs');
        const path = require('path');
        const coaPath = path.join(__dirname, '../final_coa_2026.json');
        if (fs.existsSync(coaPath)) {
            const coaData = JSON.parse(fs.readFileSync(coaPath, 'utf8'));
            for (const t of coaData.accountTypes) {
                await models.AccountType.findOrCreate({
                    where: { id: t.id },
                    defaults: { id: t.id, name: t.name, base_type: t.base_type || t.baseType, baseType: t.base_type || t.baseType }
                });
            }
            console.log('  ✅ Default Account Types seeded');

            const existingAccs = await models.Account.count();
            if (existingAccs === 0) {
                for (const a of coaData.accounts) {
                    await models.Account.create({
                        id: a.id,
                        code: a.code,
                        name: a.name,
                        type: a.type,
                        parentId: a.parentId || null,
                        isGroup: !!a.isGroup,
                        status: a.status || 'ACTIVE',
                        opening_balance: 0
                    });
                }
                console.log(`  ✅ Chart of Accounts (COA 2026) seeded (${coaData.accounts.length} items)`);
            }
        }
    } catch (coaErr) {
        console.warn('  ⚠️ COA 2026 auto-seed warning:', coaErr.message);
    }

    // 5. Bank Accounts
    const existingBanks = await models.BankAccount.count();
    if (existingBanks === 0) {
        await models.BankAccount.bulkCreate([
            { id: 'bank_cash', name: 'Kas Tunai', account_number: '-', bank_name: 'Cash', account_id: 'acc_cash' }
        ]);
        console.log('  ✅ Bank Accounts seeded');
    }

    // 6. Migration: Sync existing item codes with new prefix rules
    console.log('🔄 Checking for item code prefix updates...');
    const items = await models.InventoryItem.findAll();
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

    let updateCount = 0;
    for (const it of items) {
        if (!it.item_code || !it.category) continue;
        const correctPrefix = prefixes[it.category] || 'ITM';
        const currentParts = it.item_code.split('-');
        const currentPrefix = currentParts[0];
        
        if (currentPrefix !== correctPrefix) {
            const seq = currentParts[1] || '0001';
            const newCode = `${correctPrefix}-${seq}`;
            
            // Check if new code already exists to avoid unique constraint violation
            const conflict = await models.InventoryItem.findOne({ where: { item_code: newCode } });
            if (!conflict) {
                await it.update({ item_code: newCode });
                // Sync related stock transactions
                await models.StockTransaction.update(
                    { item_code: newCode },
                    { where: { item_id: it.id } }
                );
                updateCount++;
            }
        }
    }
    if (updateCount > 0) console.log(`  ✅ Migrated ${updateCount} item codes to new prefixes.`);

    console.log('🌱 Seeding complete!');
}

module.exports = seedDefaults;
