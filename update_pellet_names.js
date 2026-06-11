require('dotenv').config();
const { Sequelize, DataTypes } = require('sequelize');

console.log('\n===========================================');
console.log('  UPDATE NAMA PRODUK PELLET DARI EXCEL');
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
    category: DataTypes.STRING(50),
    unit: DataTypes.STRING(20),
    description: DataTypes.TEXT
}, { timestamps: true, underscored: true });

function convertToKG(packFormat) {
    const match = packFormat.match(/(\d+)\s*x\s*(\d+(?:\.\d+)?)\s*(kg|gr)/i);
    if (!match) return 0;
    const qty = parseFloat(match[1]);
    const size = parseFloat(match[2]);
    const unit = match[3].toLowerCase();
    return unit === 'gr' ? (qty * size) / 1000 : qty * size;
}

// Data dari Excel sheet "PROGRAM" - Nama yang lebih detail
const PRODUCT_NAMES = [
    { no: 1, name: 'Pellet Potato Bocah Tani Kotak 6 cm', pack: '1 x 25 kg' },
    { no: 2, name: 'Pellet Potato Bocah Tani Kotak 6 cm', pack: '1 x 5 kg' },
    { no: 3, name: 'Pellet Potato Bocah Tani Kotak 2.8 cm', pack: '1 x 25 kg' },
    { no: 4, name: 'Pellet Potato Tugu Jogja Kotak 6 cm', pack: '1 x 25 kg' },
    { no: 5, name: 'Pellet Potato Tugu Jogja Kotak 6 cm', pack: '1 x 5 kg' },
    { no: 6, name: 'Pellet Potato Cangkul Mas Kotak 6 cm', pack: '1 x 25 kg' },
    { no: 7, name: 'Pellet Potato Cangkul Mas Kotak 6 cm', pack: '1 x 5 kg' },
    { no: 8, name: 'Pellet Potato Cangkul Mas Kotak 6.5 cm', pack: '1 x 25 kg' },
    { no: 9, name: 'Pellet Potato Panji Milenium Kotak Lurus 6 cm', pack: '1 x 25 kg' },
    { no: 10, name: 'Pellet Potato Panji Milenium Kotak Lurus 6 cm', pack: '1 x 5 kg' },
    { no: 11, name: 'Pellet Potato Panji Milenium Kotak Lurus Pelangi 6 cm', pack: '1 x 25 kg' },
    { no: 12, name: 'Pellet Potato Panji Milenium Kotak Lurus Pelangi 6 cm', pack: '1 x 5 kg' },
    { no: 13, name: 'Pellet Potato Kuku Maung Panen Raya Kuning 2.5 cm', pack: '1 x 25 kg' },
    { no: 14, name: 'Pellet Potato Kuku Maung Panen Raya Merah 2.5 cm', pack: '1 x 25 kg' },
    { no: 15, name: 'Pellet Potato Bapak Tani Bulat 6 cm', pack: '1 x 25 kg' },
    { no: 16, name: 'Pellet Potato Bapak Tani Bulat 6 cm', pack: '1 x 5 kg' },
    { no: 17, name: 'Pellet Potato Bapak Tani Kotak 6 cm', pack: '1 x 25 kg' },
    { no: 18, name: 'Pellet Potato Bapak Tani Kotak 6 cm', pack: '1 x 5 kg' },
    { no: 19, name: 'Pellet Potato Bocah Tani Krispi 4.5 cm', pack: '1 x 25 kg' },
    { no: 20, name: 'Pellet Potato Panen Raya Kotak 6 cm', pack: '1 x 25 kg' },
    { no: 21, name: 'Pellet Potato Panen Raya Kotak 6 cm', pack: '1 x 5 kg' },
    { no: 22, name: 'Pellet Potato Panen Raya Bulat 6 cm', pack: '1 x 25 kg' },
    { no: 23, name: 'Pellet Potato Panen Raya Bulat 6 cm', pack: '1 x 5 kg' },
    { no: 24, name: 'Pellet Potato Panen Raya Kotak Putih', pack: '1 x 25 kg' },
    { no: 25, name: 'Pellet Potato Panen Raya Kotak Putih', pack: '1 x 5 kg' },
    { no: 26, name: 'Pellet Potato Panen Raya Kotak Putih', pack: '5 x 5 kg' },
    { no: 27, name: 'Pellet Potato Ibu Tani Kotak 6 cm', pack: '1 x 25 kg' },
    { no: 28, name: 'Pellet Potato Ibu Tani Kotak 6 cm', pack: '1 x 5 kg' },
    { no: 29, name: 'Pellet Stik Bawang Bocah Tani 6 cm', pack: '1 x 25 kg' },
    { no: 30, name: 'Pellet Stik Bawang Bocah Tani 6 cm', pack: '1 x 5 kg' },
    { no: 31, name: 'Pellet Stik Bawang Cangkul Mas 3 cm', pack: '1 x 25 kg' },
    { no: 32, name: 'Pellet Stik Bawang Panen Raya 6 cm', pack: '1 x 25 kg' },
    { no: 33, name: 'Pellet Stik Bawang Panen Raya 6 cm', pack: '1 x 5 kg' },
    { no: 34, name: 'Pellet Stik Bawang Cangkul Mas Putih 6 cm', pack: '1 x 25 kg' },
    { no: 35, name: 'Pellet Kerang Kuning Panen Raya', pack: '1 x 25 kg' },
    { no: 36, name: 'Pellet Kerang Kuning Panen Raya', pack: '1 x 5 kg' },
    { no: 37, name: 'Pellet Kerang Kuning Cangkul Mas', pack: '1 x 25 kg' },
    { no: 38, name: 'Pellet Kerang Merah Panen Raya', pack: '1 x 25 kg' },
    { no: 39, name: 'Pellet Potato Mahkota Mas Kerang Merah', pack: '1 x 5 kg' },
    { no: 40, name: 'Pellet Potato Semprong Panen Raya 6 cm', pack: '1 x 25 kg' },
    { no: 41, name: 'Pellet Potato Semprong Panen Raya 6 cm', pack: '1 x 5 kg' },
    { no: 42, name: 'Pellet Potato Semprong Tugu Jogja 6 cm', pack: '1 x 25 kg' },
    { no: 43, name: 'Pellet Potato Semprong Tugu Jogja 6 cm', pack: '1 x 5 kg' },
    { no: 44, name: 'Pellet Potato Semprong Pelangi Panen Raya', pack: '1 x 25 kg' },
    { no: 45, name: 'Pellet Potato Semprong Mini Panen Raya', pack: '1 x 25 kg' },
    { no: 46, name: 'Pellet Kentang Iris Miring Panen Raya 2 cm', pack: '1 x 25 kg' },
    { no: 47, name: 'Pellet Kentang Iris Panen Raya Kuning 4 cm', pack: '1 x 25 kg' },
    { no: 48, name: 'Pellet Kentang Iris Bocah Tani 2 cm', pack: '1 x 25 kg' },
    { no: 49, name: 'Pellet Potato Buncis Merah 3.5 cm', pack: '1 x 25 kg' },
    { no: 50, name: 'Pellet Potato Panji Milenium Buncis Merah 3.5 cm', pack: '1 x 5 kg' },
    { no: 51, name: 'Pellet Stik Poken Ayam 5 cm', pack: '1 x 25 kg' },
    { no: 52, name: 'Pellet Stik Poken Pelangi Panen Raya', pack: '1 x 25 kg' },
    { no: 53, name: 'Pellet Stik Poken Pelangi Panen Raya', pack: '1 x 5 kg' },
    { no: 54, name: 'Pellet Potato Eyang Tani Export 4.5 cm', pack: '1 x 25 kg' },
    { no: 55, name: 'Pellet Potato Eyang Tani Kondang Kotak 6 cm', pack: '1 x 25 kg' },
    { no: 56, name: 'Pellet Potato Eyang Tani Kondang Bulat 6 cm', pack: '1 x 25 kg' },
    { no: 57, name: 'Pellet Potato Eyang Tani Kondang Kotak 6 cm', pack: '1 x 5 kg' },
    { no: 58, name: 'Pellet Potato Eyang Tani Kondang Bulat 6 cm', pack: '1 x 5 kg' },
    { no: 59, name: 'Pellet Potato Buncis Cangkul Mas 2.8 cm', pack: '1 x 25 kg' },
    { no: 60, name: 'Pellet Potato Buncis Cangkul Mas 2.8 cm', pack: '1 x 5 kg' },
    { no: 61, name: 'Pellet Potato Topoki Merah Bocah Tani 3.5 cm', pack: '1 x 25 kg' },
    { no: 62, name: 'Pellet Potato Topoki Merah Cangkul Mas 3.5 cm', pack: '1 x 25 kg' },
    { no: 63, name: 'Pellet Potato Topoki Merah Panen Raya 3.5 cm', pack: '1 x 25 kg' },
    { no: 64, name: 'Pellet Ulir Kuning', pack: '1 x 15 kg' },
    { no: 65, name: 'Pellet Potatozz Ulir Kuning', pack: '1 x 5 kg' },
    { no: 66, name: 'Pellet Potato Raja Sultan Semprong 6 cm', pack: '1 x 5 kg' },
    { no: 67, name: 'Pellet Potato Panji Milenium Semprong 6 cm', pack: '1 x 5 kg' },
    { no: 68, name: 'Pellet Potato Panji Milenium Kotak Miring 6 cm', pack: '1 x 5 kg' },
    { no: 69, name: 'Pellet Potato Mahkota Mas Kotak 6 cm', pack: '1 x 5 kg' },
    { no: 70, name: 'Pellet Potato Mahkota Mas Kerang Kuning', pack: '1 x 5 kg' },
    { no: 71, name: 'Pellet Potato Bless Kotak 6 cm', pack: '6 x 5 kg' },
    { no: 72, name: 'Pellet Potato Kerang Merah Panen Raya', pack: '5 x 5 kg' },
    { no: 73, name: 'Pellet Potato Panen Raya Poken Pelangi', pack: '5 x 5 kg' },
    { no: 74, name: 'Pellet Potato Panen Raya Kerang Kuning', pack: '5 x 5 kg' },
    { no: 75, name: 'Pellet Potato Panen Raya Kentang Iris 4 cm', pack: '5 x 5 kg' },
    { no: 76, name: 'Pellet Potato Panen Raya Kotak Putih 6 cm', pack: '5 x 5 kg' },
    { no: 77, name: 'Pellet Potato Vania Kotak Kuning 6 cm', pack: '5 x 5 kg' },
    { no: 78, name: 'Pellet Potato Johan Semprong Pelangi', pack: '5 x 5 kg' },
    { no: 79, name: 'Pellet Potato Bless Semprong 6 cm', pack: '6 x 5 kg' },
    { no: 80, name: 'Pellet Kentang Iris Panen Raya 4 cm', pack: '1 x 5 kg' },
    { no: 81, name: 'Pellet Potato Panen Raya Bulat 5.5 cm', pack: '1 x 25 kg' },
    { no: 82, name: 'Pellet Potato Panen Raya Kotak 5.5 cm', pack: '1 x 25 kg' }
];

async function updateNames() {
    try {
        console.log('📡 Menghubungkan ke database...');
        await sequelize.authenticate();
        console.log('✅ Database terhubung!\n');
        
        console.log(`🔄 Mengupdate nama ${PRODUCT_NAMES.length} produk...\n`);
        
        let updated = 0;
        let notFound = 0;
        
        for (const p of PRODUCT_NAMES) {
            const itemCode = `FG-${String(p.no).padStart(4, '0')}`;
            const totalKG = convertToKG(p.pack);
            const newName = `${p.name} ${p.pack}`;
            
            try {
                const product = await InventoryItem.findOne({ where: { itemCode } });
                
                if (!product) {
                    console.log(`   ⚠️  ${itemCode} tidak ditemukan di database`);
                    notFound++;
                    continue;
                }
                
                const oldName = product.itemName;
                product.itemName = newName;
                product.description = `Kemasan: ${p.pack} | Total: ${totalKG} KG`;
                await product.save();
                
                console.log(`   ✅ ${itemCode} - ${newName}`);
                updated++;
                
            } catch (err) {
                console.error(`   ❌ ${itemCode} - Error: ${err.message}`);
            }
        }
        
        console.log('\n===========================================');
        console.log('🎉 UPDATE SELESAI!');
        console.log('===========================================');
        console.log(`✅ Berhasil diupdate   : ${updated} produk`);
        console.log(`⚠️  Tidak ditemukan    : ${notFound} produk`);
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

updateNames();
