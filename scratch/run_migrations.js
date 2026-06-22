const sequelize = require('../server/config/database');

async function run() {
    console.log('🔄 Memulai migrasi kolom bank dan rekening...');
    try {
        // Cek/tambah kolom di table bank_accounts
        try {
            await sequelize.query('ALTER TABLE bank_accounts ADD COLUMN IF NOT EXISTS account_holder VARCHAR(200);');
            console.log('✅ Kolom "account_holder" berhasil ditambahkan ke tabel "bank_accounts" (atau sudah ada).');
        } catch (e) {
            console.error('❌ Gagal menambahkan kolom ke tabel bank_accounts:', e.message);
        }

        // Cek/tambah kolom di table sales_invoices
        const columns = [
            { name: 'bank_account_id', type: 'VARCHAR(50)' },
            { name: 'bank_name', type: 'VARCHAR(100)' },
            { name: 'bank_account', type: 'VARCHAR(100)' },
            { name: 'bank_holder', type: 'VARCHAR(200)' }
        ];

        for (const col of columns) {
            try {
                await sequelize.query(`ALTER TABLE sales_invoices ADD COLUMN IF NOT EXISTS ${col.name} ${col.type};`);
                console.log(`✅ Kolom "${col.name}" berhasil ditambahkan ke tabel "sales_invoices" (atau sudah ada).`);
            } catch (e) {
                console.error(`❌ Gagal menambahkan kolom ${col.name} ke tabel sales_invoices:`, e.message);
            }
        }

        console.log('🎉 Migrasi database selesai dengan sukses!');
    } catch (err) {
        console.error('❌ Terjadi kesalahan saat migrasi:', err.message);
    }
    process.exit(0);
}

run();
