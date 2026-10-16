/**
 * update_coa_names.js
 * 
 * Script AMAN untuk update nama COA dari final_coa_2026.json ke database.
 * Hanya mengupdate kolom 'name' berdasarkan 'code' yang sama.
 * TIDAK menghapus atau reset data apapun.
 * 
 * Cara jalankan:
 *   node server/update_coa_names.js
 */

require('dotenv').config();
const fs = require('fs');
const path = require('path');
const models = require('./models');

async function updateCOANames() {
    console.log('🔄 Starting COA Name Update...');
    console.log('   Sumber data: final_coa_2026.json');
    console.log('   Mode: UPDATE nama saja (tidak hapus data)\n');

    const coaPath = path.join(__dirname, '../final_coa_2026.json');
    if (!fs.existsSync(coaPath)) {
        console.error('❌ File final_coa_2026.json tidak ditemukan!');
        process.exit(1);
    }

    const coaData = JSON.parse(fs.readFileSync(coaPath, 'utf8'));

    // ─── 1. Update Account Types (nama saja) ───────────────────
    console.log('📁 Updating Account Types...');
    let atUpdated = 0, atSkipped = 0;
    for (const t of coaData.accountTypes) {
        const [, created] = await models.AccountType.update(
            { name: t.name, base_type: t.base_type || t.baseType },
            { where: { id: t.id } }
        ).then(([count]) => [count, false]).catch(() => [0, false]);
        if (created !== false) atUpdated++;
    }

    // Hitung jumlah yang diupdate
    let atCount = 0;
    for (const t of coaData.accountTypes) {
        const [count] = await models.AccountType.update(
            { name: t.name, base_type: t.base_type || t.baseType },
            { where: { id: t.id } }
        );
        if (count > 0) atCount++;
    }
    console.log(`   ✅ Account Types diproses: ${coaData.accountTypes.length}`);

    // ─── 2. Update Account names berdasarkan code ───────────────
    console.log('\n📒 Updating Account Names...');
    let updated = 0;
    let notFound = 0;
    let errors = 0;

    for (const a of coaData.accounts) {
        try {
            // Update berdasarkan ID dulu (lebih akurat), fallback ke code
            let [count] = await models.Account.update(
                { name: a.name },
                { where: { id: a.id } }
            );

            if (count === 0) {
                // Fallback: cari berdasarkan code
                [count] = await models.Account.update(
                    { name: a.name },
                    { where: { code: a.code } }
                );
            }

            if (count > 0) {
                updated++;
            } else {
                notFound++;
                console.log(`   ⚠️  Akun tidak ditemukan di DB: [${a.code}] ${a.name}`);
            }
        } catch (err) {
            errors++;
            console.error(`   ❌ Error update akun [${a.code}]: ${err.message}`);
        }
    }

    // ─── 3. Summary ─────────────────────────────────────────────
    console.log('\n═══════════════════════════════════════');
    console.log('📊 HASIL UPDATE COA NAMES:');
    console.log(`   Total akun di JSON : ${coaData.accounts.length}`);
    console.log(`   ✅ Berhasil diupdate: ${updated}`);
    console.log(`   ⚠️  Tidak ditemukan : ${notFound}`);
    console.log(`   ❌ Error            : ${errors}`);
    console.log('═══════════════════════════════════════');

    if (notFound > 0) {
        console.log('\n💡 Tip: Akun yang "tidak ditemukan" artinya ID/code di JSON tidak ada di DB.');
        console.log('   Kemungkinan akun baru yang belum pernah di-seed.');
        console.log('   Jalankan node server/seed_coa_2026.js jika ingin full reset COA.\n');
    }

    console.log('\n✅ Update selesai! Restart server tidak diperlukan.');
    console.log('   Data baru akan muncul setelah browser refresh.\n');
    process.exit(0);
}

updateCOANames().catch(err => {
    console.error('❌ Fatal error:', err);
    process.exit(1);
});
