require('dotenv').config();
const { Client } = require('pg');

async function seed() {
    const client = new Client({
        host: process.env.DB_HOST,
        port: process.env.DB_PORT,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME
    });

    try {
        await client.connect();
        
        // 1. BCA Pajak (PT Tana Subur Nusantara)
        // Check if bank_bca_pajak exists, if not insert, else update
        const checkPajak = await client.query("SELECT id FROM bank_accounts WHERE id = 'bank_bca_pajak'");
        if (checkPajak.rows.length === 0) {
            await client.query(`
                INSERT INTO bank_accounts (id, name, account_number, bank_name, account_id, created_at, updated_at, account_holder)
                VALUES ('bank_bca_pajak', 'BCA Pajak (PT Tana Subur Nusantara)', '522 487 1188', 'BCA', 'acc_bank', NOW(), NOW(), 'PT TANA SUBUR NUSANTARA')
            `);
            console.log('Inserted BCA Pajak');
        } else {
            await client.query(`
                UPDATE bank_accounts 
                SET name = 'BCA Pajak (PT Tana Subur Nusantara)', account_number = '522 487 1188', bank_name = 'BCA', account_holder = 'PT TANA SUBUR NUSANTARA', updated_at = NOW()
                WHERE id = 'bank_bca_pajak'
            `);
            console.log('Updated BCA Pajak');
        }

        // 2. BCA Non-Pajak (Petrico)
        const checkBcaNonPajak = await client.query("SELECT id FROM bank_accounts WHERE id = 'bank_bca_non_pajak'");
        if (checkBcaNonPajak.rows.length === 0) {
            await client.query(`
                INSERT INTO bank_accounts (id, name, account_number, bank_name, account_id, created_at, updated_at, account_holder)
                VALUES ('bank_bca_non_pajak', 'BCA Non-Pajak (Petrico)', '522 2142 130', 'BCA', 'acc_bank', NOW(), NOW(), 'PETRICO WIJAYANTO')
            `);
            console.log('Inserted BCA Non-Pajak');
        } else {
            await client.query(`
                UPDATE bank_accounts 
                SET name = 'BCA Non-Pajak (Petrico)', account_number = '522 2142 130', bank_name = 'BCA', account_holder = 'PETRICO WIJAYANTO', updated_at = NOW()
                WHERE id = 'bank_bca_non_pajak'
            `);
            console.log('Updated BCA Non-Pajak');
        }

        // 3. BRI Non-Pajak (Petrico)
        const checkBriNonPajak = await client.query("SELECT id FROM bank_accounts WHERE id = 'bank_bri_non_pajak'");
        if (checkBriNonPajak.rows.length === 0) {
            await client.query(`
                INSERT INTO bank_accounts (id, name, account_number, bank_name, account_id, created_at, updated_at, account_holder)
                VALUES ('bank_bri_non_pajak', 'BRI Non-Pajak (Petrico)', '0319 0108 0976 505', 'BRI', 'acc_bank', NOW(), NOW(), 'PETRICO WIJAYANTO')
            `);
            console.log('Inserted BRI Non-Pajak');
        } else {
            await client.query(`
                UPDATE bank_accounts 
                SET name = 'BRI Non-Pajak (Petrico)', account_number = '0319 0108 0976 505', bank_name = 'BRI', account_holder = 'PETRICO WIJAYANTO', updated_at = NOW()
                WHERE id = 'bank_bri_non_pajak'
            `);
            console.log('Updated BRI Non-Pajak');
        }

        console.log('Seeding finished successfully.');
    } catch (err) {
        console.error(err);
    } finally {
        await client.end();
    }
}
seed();
