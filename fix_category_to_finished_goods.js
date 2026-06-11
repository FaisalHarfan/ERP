require('dotenv').config();
const { Sequelize, DataTypes } = require('sequelize');

console.log('\n===========================================');
console.log('  FIX KATEGORI: GUDANG JADI -> FINISHED_GOODS');
console.log('===========================================\n');

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

const InventoryItem = sequelize.define('inventory_items', {
    id: { type: DataTypes.STRING(50), primaryKey: true },
    itemCode: { type: DataTypes.STRING(50), field: 'item_code' },
    itemName: { type: DataTypes.STRING(200), field: 'item_name' },
    category: DataTypes.STRING(50)
}, { timestamps: true, underscored: true });

async function fixCategories() {
    try {
        console.log('📡 Menghubungkan ke database...');
        await sequelize.authenticate();
        console.log('✅ Database terhubung!\n');
        
        console.log('🔍 Mencari produk dengan kategori "GUDANG JADI"...\n');
        
        const products = await InventoryItem.findAll({
            where: {
                category: 'GUDANG JADI'
            },
            order: [['itemCode', 'ASC']]
        });
        
        console.log(`📦 Ditemukan ${products.length} produk\n`);
        
        if (products.length === 0) {
            console.log('⚠️  Tidak ada produk yang perlu diupdate\n');
            return;
        }
        
        console.log('🔄 Mengupdate kategori menjadi "FINISHED_GOODS"...\n');
        
        let updated = 0;
        for (const product of products) {
            product.category = 'FINISHED_GOODS';
            await product.save();
            
            console.log(`   ✅ ${product.itemCode} - GUDANG JADI → FINISHED_GOODS`);
            updated++;
        }
        
        console.log('\n===========================================');
        console.log('🎉 UPDATE SELESAI!');
        console.log('===========================================');
        console.log(`✅ Berhasil diupdate: ${updated} produk`);
        console.log('   Kategori baru    : FINISHED_GOODS');
        console.log('   (Tampil sebagai "Gudang Jadi" di frontend)');
        console.log('===========================================\n');
        
    } catch (err) {
        console.error('\n❌ ERROR:', err.message);
        if (err.stack) console.error(err.stack);
        process.exit(1);
    } finally {
        await sequelize.close();
        console.log('👋 Koneksi database ditutup\n');
    }
}

fixCategories();
