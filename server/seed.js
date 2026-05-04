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

    // 4. Default Chart of Accounts
    const existingAccounts = await models.Account.count();
    if (existingAccounts === 0) {
        await models.Account.bulkCreate([
            { id: 'acc_cash', code: '1101', name: 'Kas Utama', type: 'ASSET', description: 'Kas tunai perusahaan' },
            { id: 'acc_bank', code: '1102', name: 'Bank BCA', type: 'ASSET', description: 'Rekening Bank BCA' },
            { id: 'acc_ar', code: '1201', name: 'Piutang Usaha', type: 'ASSET', description: 'Tagihan ke pelanggan' },
            { id: 'acc_inv_rm', code: '1301', name: 'Persediaan Bahan Baku', type: 'ASSET', description: 'Stok Bahan Baku' },
            { id: 'acc_inv_fg', code: '1302', name: 'Persediaan Barang Jadi', type: 'ASSET', description: 'Stok Gudang Jadi' },
            { id: 'acc_inv_wip', code: '1303', name: 'Persediaan Barang Dalam Proses', type: 'ASSET', description: 'Stok WIP' },
            { id: 'acc_ap', code: '2101', name: 'Hutang Usaha', type: 'LIABILITY', description: 'Hutang ke supplier' },
            { id: 'acc_tax_payable', code: '2102', name: 'Hutang PPN (Tax Payable)', type: 'LIABILITY', description: 'Hutang Pajak' },
            { id: 'acc_ar_overpay', code: '2103', name: 'Piutang Usaha Lebih Bayar', type: 'LIABILITY', description: 'Kelebihan pembayaran' },
            { id: 'acc_equity', code: '3101', name: 'Modal Disetor', type: 'EQUITY', description: 'Modal awal' },
            { id: 'acc_sales', code: '4101', name: 'Pendapatan Penjualan', type: 'INCOME', description: 'Hasil penjualan' },
            { id: 'acc_sales_return', code: '4102', name: 'Retur Penjualan', type: 'INCOME', description: 'Pengurang pendapatan' },
            { id: 'acc_cogs', code: '5101', name: 'Beban Pokok Penjualan (HPP)', type: 'EXPENSE', description: 'Cost of Goods Sold' },
            { id: 'acc_purchase_return', code: '5102', name: 'Retur Pembelian', type: 'EXPENSE', description: 'Pengurang beban' },
            { id: 'acc_exp_prod', code: '5201', name: 'Biaya Produksi', type: 'EXPENSE', description: 'Biaya operasional produksi' },
            { id: 'acc_exp_op', code: '5301', name: 'Biaya Operasional', type: 'EXPENSE', description: 'Listrik, Air, dll' },
            { id: 'acc_exp_mkt', code: '5302', name: 'Biaya Pemasaran', type: 'EXPENSE', description: 'Iklan dan promosi' }
        ]);
        console.log('  ✅ Chart of Accounts seeded');
    }

    // 5. Bank Accounts
    const existingBanks = await models.BankAccount.count();
    if (existingBanks === 0) {
        await models.BankAccount.bulkCreate([
            { id: 'bank_cash', name: 'Kas Tunai', account_number: '-', bank_name: 'Cash', account_id: 'acc_cash' },
            { id: 'bank_bca', name: 'BCA Utama', account_number: '1234567890', bank_name: 'BCA', account_id: 'acc_bank' }
        ]);
        console.log('  ✅ Bank Accounts seeded');
    }

    // 6. Machines
    const existingMachines = await models.Machine.count();
    if (existingMachines === 0) {
        await models.Machine.bulkCreate([
            { id: 'mch_01', code: 'MCH-001', name: 'Mesin 01', type: 'MACHINE', status: 'ACTIVE' },
            { id: 'mch_02', code: 'MCH-002', name: 'Mesin 02', type: 'MACHINE', status: 'ACTIVE' },
            { id: 'mch_03', code: 'OVN-001', name: 'Oven 01', type: 'OVEN', status: 'ACTIVE' },
            { id: 'mch_04', code: 'OVN-002', name: 'Oven 02', type: 'OVEN', status: 'ACTIVE' }
        ]);
        console.log('  ✅ Machines seeded');
    }

    console.log('🌱 Seeding complete!');
}

module.exports = seedDefaults;
