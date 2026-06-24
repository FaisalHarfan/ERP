require('dotenv').config();
const { Sequelize, DataTypes } = require('sequelize');

console.log('\n======================================================');
/// ======================================================
console.log('  IMPORT OVEN BASAH & OVEN KERING STOCKS FROM FINISHED GOODS');
console.log('======================================================\n');

// Database connection
const sequelize = new Sequelize(
    process.env.DB_NAME,
    process.env.DB_USER,
    process.env.DB_PASSWORD,
    {
        host: process.env.DB_HOST,
        port: parseInt(process.env.DB_PORT),
        dialect: 'postgres',
        logging: false
    }
);

// Model definition
const InventoryItem = sequelize.define('inventory_items', {
    id: { type: DataTypes.STRING(50), primaryKey: true },
    itemCode: { type: DataTypes.STRING(50), unique: true, field: 'item_code' },
    itemName: { type: DataTypes.STRING(200), allowNull: false, field: 'item_name' },
    category: DataTypes.STRING(50),
    unit: DataTypes.STRING(20),
    purchasePrice: { type: DataTypes.DECIMAL(15,2), defaultValue: 0, field: 'purchase_price' },
    minStock: { type: DataTypes.DECIMAL(15,2), defaultValue: 0, field: 'min_stock' },
    status: { type: DataTypes.STRING(20), defaultValue: 'ACTIVE' },
    description: DataTypes.TEXT
}, { timestamps: true, underscored: true });

function genId() {
    return Date.now().toString() + Math.random().toString(36).substring(2, 7);
}

async function main() {
    try {
        console.log('📡 Menghubungkan ke database...');
        await sequelize.authenticate();
        console.log('✅ Database terhubung!\n');

        // Get all Finished Goods
        const fgs = await InventoryItem.findAll({ where: { category: 'FINISHED_GOODS' } });
        console.log(`📦 Ditemukan ${fgs.length} produk Finished Goods (Pellet).`);

        // Find max sequence for OB and OK
        const allItems = await InventoryItem.findAll();
        let maxOB = 0;
        let maxOK = 0;

        allItems.forEach(item => {
            if (item.itemCode) {
                if (item.itemCode.startsWith('OB-')) {
                    const seq = parseInt(item.itemCode.split('-')[1]);
                    if (!isNaN(seq) && seq > maxOB) maxOB = seq;
                } else if (item.itemCode.startsWith('OK-')) {
                    const seq = parseInt(item.itemCode.split('-')[1]);
                    if (!isNaN(seq) && seq > maxOK) maxOK = seq;
                }
            }
        });

        console.log(`📊 Sequence terakhir di database: OB-${String(maxOB).padStart(4, '0')} | OK-${String(maxOK).padStart(4, '0')}`);

        let nextOB = maxOB + 1;
        let nextOK = maxOK + 1;
        let createdOB = 0, skippedOB = 0;
        let createdOK = 0, skippedOK = 0;

        for (const fg of fgs) {
            const baseName = fg.itemName.replace(/\s*\([^)]+\)/g, '').trim();
            
            // 1. Process Oven Basah
            const obName = `${baseName} (Oven Basah)`;
            const existingOB = await InventoryItem.findOne({
                where: {
                    itemName: obName,
                    category: 'OVEN_BASAH_STOCK'
                }
            });

            if (existingOB) {
                skippedOB++;
            } else {
                const obCode = `OB-${String(nextOB++).padStart(4, '0')}`;
                await InventoryItem.create({
                    id: genId(),
                    itemCode: obCode,
                    itemName: obName,
                    category: 'OVEN_BASAH_STOCK',
                    unit: 'KG',
                    purchasePrice: 0,
                    minStock: 0,
                    status: 'ACTIVE',
                    description: `Auto-generated Oven Basah stock for ${fg.itemName}`
                });
                console.log(`   ✅ Created: ${obCode} - ${obName}`);
                createdOB++;
            }

            // 2. Process Oven Kering
            const okName = `${baseName} (Oven Kering)`;
            const existingOK = await InventoryItem.findOne({
                where: {
                    itemName: okName,
                    category: 'OVEN_KERING_STOCK'
                }
            });

            if (existingOK) {
                skippedOK++;
            } else {
                const okCode = `OK-${String(nextOK++).padStart(4, '0')}`;
                await InventoryItem.create({
                    id: genId(),
                    itemCode: okCode,
                    itemName: okName,
                    category: 'OVEN_KERING_STOCK',
                    unit: 'KG',
                    purchasePrice: 0,
                    minStock: 0,
                    status: 'ACTIVE',
                    description: `Auto-generated Oven Kering stock for ${fg.itemName}`
                });
                console.log(`   ✅ Created: ${okCode} - ${okName}`);
                createdOK++;
            }
        }

        console.log('\n======================================================');
        console.log('🎉 PROSES IMPORT SELESAI!');
        console.log('======================================================');
        console.log(`💧 OVEN BASAH  -> Dibuat: ${createdOB} | Dilewati: ${skippedOB}`);
        console.log(`🔥 OVEN KERING -> Dibuat: ${createdOK} | Dilewati: ${skippedOK}`);
        console.log('======================================================\n');

    } catch (err) {
        console.error('❌ Error:', err.message);
        if (err.stack) console.error(err.stack);
    } finally {
        await sequelize.close();
        console.log('👋 Koneksi database ditutup\n');
    }
}

main();
