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

    // 4b. Default Account Types
    const defaultTypes = [
        { id: 'type_asset', name: 'Asset (Harta)', base_type: 'ASSET' },
        { id: 'type_liability', name: 'Liabilitas (Hutang)', base_type: 'LIABILITY' },
        { id: 'type_equity', name: 'Ekuitas (Modal)', base_type: 'EQUITY' },
        { id: 'type_income', name: 'Pendapatan', base_type: 'INCOME' },
        { id: 'type_expense', name: 'Beban/Biaya', base_type: 'EXPENSE' }
    ];
    for (const t of defaultTypes) {
        await models.AccountType.findOrCreate({
            where: { id: t.id },
            defaults: t
        });
    }
    console.log('  ✅ Default Account Types seeded');

    // 4. Default Chart of Accounts
    const defaultAccounts = [
        { id: 'acc_cash', code: '1101', name: 'Kas Utama', type: 'type_asset', description: 'Kas tunai perusahaan' },
        { id: 'acc_bank', code: '1102', name: 'Bank BCA', type: 'type_asset', description: 'Rekening Bank BCA' },
        { id: 'acc_ar', code: '1201', name: 'Piutang Usaha (AR)', type: 'type_asset', description: 'Tagihan ke pelanggan' },
        { id: 'acc_inv_rm', code: '1301', name: 'Persediaan Bahan Baku', type: 'type_asset', description: 'Stok Bahan Baku' },
        { id: 'acc_inv_fg', code: '1302', name: 'Persediaan Barang Jadi', type: 'type_asset', description: 'Stok Gudang Jadi' },
        { id: 'acc_inv_wip', code: '1303', name: 'Persediaan Barang Setengah Jadi', type: 'type_asset', description: 'Stok WIP' },
        { id: 'acc_ap', code: '2101', name: 'Hutang Usaha (AP)', type: 'type_liability', description: 'Hutang ke supplier' },
        { id: 'acc_tax_payable', code: '2102', name: 'Hutang Pajak', type: 'type_liability', description: 'Hutang Pajak' },
        { id: 'acc_ar_overpay', code: '2103', name: 'Kelebihan Pembayaran Pelanggan', type: 'type_liability', description: 'Kelebihan pembayaran' },
        { id: 'acc_equity', code: '3101', name: 'Modal Saham', type: 'type_equity', description: 'Modal awal' },
        { id: 'acc_sales', code: '4101', name: 'Pendapatan Penjualan', type: 'type_income', description: 'Hasil penjualan' },
        { id: 'acc_sales_return', code: '4102', name: 'Retur Penjualan', type: 'type_income', description: 'Pengurang pendapatan' },
        { id: 'acc_cogs', code: '5101', name: 'Harga Pokok Penjualan (HPP)', type: 'type_expense', description: 'Cost of Goods Sold' },
        { id: 'acc_purchase_return', code: '5102', name: 'Retur Pembelian', type: 'type_expense', description: 'Pengurang beban' },
        { id: 'acc_exp_prod', code: '5201', name: 'Biaya Produksi', type: 'type_expense', description: 'Biaya operasional produksi' },
        { id: 'acc_exp_op', code: '5301', name: 'Biaya Operasional', type: 'type_expense', description: 'Listrik, Air, dll' },
        { id: 'acc_exp_mkt', code: '5302', name: 'Biaya Pemasaran', type: 'type_expense', description: 'Iklan dan promosi' }
    ];
    for (const a of defaultAccounts) {
        await models.Account.findOrCreate({
            where: { id: a.id },
            defaults: a
        });
    }
    console.log('  ✅ Chart of Accounts seeded');

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
