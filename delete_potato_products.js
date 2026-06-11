/**
 * delete_potato_products.js
 * Script untuk cek dan hapus produk yang nama depannya "POTATO"
 * 
 * Mode:
 * - CHECK: node delete_potato_products.js check    (lihat dulu tanpa hapus)
 * - DELETE: node delete_potato_products.js delete  (hapus permanen)
 */

require('dotenv').config();
const { Sequelize, DataTypes, Op } = require('sequelize');

const sequelize = new Sequelize(
    process.env.DB_NAME || 'unityerp',
    process.env.DB_USER || 'postgres',
    process.env.DB_PASSWORD || '',
    {
        host: process.env.DB_HOST || 'localhost',
        port: parseInt(process.env.DB_PORT) || 5432,
        dialect: 'postgres',
        logging: false
    }
);

const InventoryItem = sequelize.define('inventory_items', {
    id:            { type: DataTypes.STRING(50), primaryKey: true },
    itemCode:      { type: DataTypes.STRING(50), unique: true, field: 'item_code' },
    itemName:      { type: DataTypes.STRING(200), allowNull: false, field: 'item_name' },
    category:      DataTypes.STRING(50),
    unit:          DataTypes.STRING(20),
    status:        DataTypes.STRING(20)
}, { timestamps: true, underscored: true });

async function main() {
    const mode = (process.argv[2] || 'check').toLowerCase();
    
    if (!['check', 'delete'].includes(mode)) {
        console.log('❌ Mode tidak valid!');
        console.log('');
        console.log('Cara pakai:');
        console.log('  node delete_potato_products.js check    (cek dulu)');
        console.log('  node delete_potato_products.js delete   (hapus)');
        process.exit(1);
    }

    try {
        await sequelize.authenticate();
        console.log('✅ Koneksi database berhasil\n');

        // Cari semua item yang:
        // 1. Nama depannya POTATO (case insensitive)
        // 2. DAN kategorinya mengandung "Gudang" atau "Jadi" (case insensitive)
        const potatoItems = await InventoryItem.findAll({
            where: {
                [Op.and]: [
                    {
                        itemName: {
                            [Op.iLike]: 'POTATO%'  // Case insensitive LIKE
                        }
                    },
                    {
                        [Op.or]: [
                            {
                                category: {
                                    [Op.iLike]: '%Gudang%'  // Mengandung "Gudang"
                                }
                            },
                            {
                                category: {
                                    [Op.iLike]: 'FINISHED%'  // Atau "FINISHED_GOODS"
                                }
                            }
                        ]
                    }
                ]
            },
            order: [['itemCode', 'ASC']]
        });

        if (potatoItems.length === 0) {
            console.log('✅ Tidak ada produk dengan nama depan "POTATO" dan kategori "GUDANG JADI"');
            return;
        }

        console.log(`📦 Ditemukan ${potatoItems.length} produk (nama: POTATO* + kategori: GUDANG JADI):\n`);
        
        // Tampilkan daftar dengan kategori
        potatoItems.forEach((item, idx) => {
            console.log(`${(idx + 1).toString().padStart(4, ' ')}. [${item.itemCode}] ${item.itemName}`);
            console.log(`       Kategori: ${item.category || 'N/A'}`);
        });

        console.log('\n══════════════════════════════════════════════');

        if (mode === 'check') {
            console.log('ℹ️  MODE: CEK SAJA (tidak menghapus)');
            console.log('');
            console.log('Untuk menghapus semua produk di atas, jalankan:');
            console.log('  node delete_potato_products.js delete');
            console.log('══════════════════════════════════════════════');
        } else if (mode === 'delete') {
            console.log('⚠️  MODE: HAPUS PERMANEN');
            console.log('');
            console.log('Menghapus produk...');
            
            let deleted = 0, errors = 0;
            
            for (const item of potatoItems) {
                try {
                    await item.destroy();
                    console.log(`   ✅ Dihapus: [${item.itemCode}] ${item.itemName}`);
                    deleted++;
                } catch (err) {
                    console.error(`   ❌ Gagal hapus [${item.itemCode}]: ${err.message}`);
                    errors++;
                }
            }
            
            console.log('\n══════════════════════════════════════════════');
            console.log('🎉 SELESAI!');
            console.log(`   ✅ Berhasil dihapus: ${deleted}`);
            console.log(`   ❌ Gagal           : ${errors}`);
            console.log('══════════════════════════════════════════════');
        }

    } catch (err) {
        console.error('❌ Error:', err.message);
        if (err.original) console.error('   Detail:', err.original.message);
    } finally {
        await sequelize.close();
    }
}

main();
