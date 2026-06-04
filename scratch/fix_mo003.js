/**
 * Script Koreksi Data Stok MO-20260526-003
 * 
 * Masalah: MO-003 (PACKING) dengan 2 produk (Ibu Tani + Bapak Tani)
 * hanya mencatat transaksi untuk Ibu Tani saja (39.980 Kg total),
 * sedangkan seharusnya masing-masing produk punya transaksi sendiri.
 * 
 * Koreksi yang dilakukan:
 * 1. Update transaksi OUT lama dari 39.980 → 19.980 (Ibu Tani Oven Kering)
 * 2. Update transaksi IN  lama dari 39.980 → 19.980 (Ibu Tani FG)
 * 3. Tambah transaksi OUT 20.000 untuk Bapak Tani (Oven Kering)
 * 4. Tambah transaksi IN  20.000 untuk Bapak Tani (Finished Goods)
 */

const { StockTransaction, sequelize } = require('../server/models');
const { v4: uuidv4 } = require('uuid');

// MO-003 data
const MO_ID = 'f2eaad83-b272-45df-9d13-b8c65d2844bd';
const MO_NUMBER = 'MO-20260526-003';

// Item IDs (sesuai database)
const IBU_TANI_OVEN_KERING_ID = '1778659531511no5dm';
const IBU_TANI_FG_ID          = '177796366376969ta0';
const BAPAK_TANI_OVEN_KERING_ID = '1778304272368tw2ox';
const BAPAK_TANI_FG_ID          = '1777963648693k602r';

// Wrong transaction IDs (dari hasil cek sebelumnya)
const WRONG_OUT_TX_ID = '5baa1623-6f64-4cb7-a209-3dd65d09cb4c'; // OUT 39.980 Ibu Tani OK
const WRONG_IN_TX_ID  = 'b49d7131-65e4-4bed-b27f-0903d6384fe7'; // IN  39.980 Ibu Tani FG

async function fixMO003() {
    const t = await sequelize.transaction();
    try {
        console.log('🔧 Memulai koreksi transaksi MO-003...\n');

        // 1. Update OUT Ibu Tani Oven Kering: 39.980 → 19.980
        const outTx = await StockTransaction.findByPk(WRONG_OUT_TX_ID, { transaction: t });
        if (!outTx) throw new Error(`TX OUT ${WRONG_OUT_TX_ID} tidak ditemukan!`);
        await outTx.update({
            qty: 19980,
            itemName: 'Ibu Tani (Oven Kering)',
            notes: `FINISH Packing MO ${MO_NUMBER}: Consumed Ibu Tani from Oven Kering [CORRECTED]`
        }, { transaction: t });
        console.log(`✅ [1/4] Updated OUT Ibu Tani (Oven Kering): 39.980 → 19.980 Kg`);

        // 2. Update IN Ibu Tani FG: 39.980 → 19.980
        const inTx = await StockTransaction.findByPk(WRONG_IN_TX_ID, { transaction: t });
        if (!inTx) throw new Error(`TX IN ${WRONG_IN_TX_ID} tidak ditemukan!`);
        await inTx.update({
            qty: 19980,
            itemName: 'Ibu Tani',
            notes: `FINISH Packing MO ${MO_NUMBER}: Produced Finished Goods Ibu Tani [CORRECTED]`
        }, { transaction: t });
        console.log(`✅ [2/4] Updated IN Ibu Tani (FG): 39.980 → 19.980 Kg`);

        // 3. Tambah OUT Bapak Tani Oven Kering: 20.000
        await StockTransaction.create({
            id: uuidv4(),
            txNo: `PRD-OUT-FIX-${Date.now().toString().slice(-6)}`,
            date: new Date('2026-05-26T03:58:31.000Z'),
            itemId: BAPAK_TANI_OVEN_KERING_ID,
            itemName: 'Bapak Tani (Oven Kering)',
            type: 'OUT',
            qty: 20000,
            reference: 'PRODUCTION_OUT',
            referenceId: MO_ID,
            notes: `FINISH Packing MO ${MO_NUMBER}: Consumed Bapak Tani from Oven Kering [CORRECTION ADDED]`,
            createdBy: 'system-correction',
            location: 'OVEN_KERING'
        }, { transaction: t });
        console.log(`✅ [3/4] Added OUT Bapak Tani (Oven Kering): 20.000 Kg`);

        // 4. Tambah IN Bapak Tani FG: 20.000
        await StockTransaction.create({
            id: uuidv4(),
            txNo: `PRD-IN-FIX-${Date.now().toString().slice(-6)}`,
            date: new Date('2026-05-26T03:58:31.000Z'),
            itemId: BAPAK_TANI_FG_ID,
            itemName: 'Bapak Tani',
            type: 'IN',
            qty: 20000,
            reference: 'PRODUCTION_IN',
            referenceId: MO_ID,
            notes: `FINISH Packing MO ${MO_NUMBER}: Produced Finished Goods Bapak Tani [CORRECTION ADDED]`,
            createdBy: 'system-correction',
            location: 'WHS'
        }, { transaction: t });
        console.log(`✅ [4/4] Added IN Bapak Tani (FG): 20.000 Kg`);

        await t.commit();
        console.log('\n🎉 Koreksi berhasil! Semua transaksi sudah diperbaiki.');
        console.log('\nRingkasan stok setelah koreksi:');
        console.log('  Ibu Tani (Oven Kering):   -19.980 Kg (keluar ke Packing)');
        console.log('  Bapak Tani (Oven Kering): -20.000 Kg (keluar ke Packing)');
        console.log('  Ibu Tani (FG/Gudang Jadi): +19.980 Kg (masuk ke inventory)');
        console.log('  Bapak Tani (FG/Gudang Jadi): +20.000 Kg (masuk ke inventory)');

    } catch (err) {
        await t.rollback();
        console.error('❌ Error saat koreksi, rollback dilakukan:', err.message);
        throw err;
    } finally {
        process.exit();
    }
}

fixMO003();
