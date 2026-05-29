/**
 * import_products.js
 * Import 209 produk PT. Tana Subur Nusantara ke inventory_items
 * Item code format: FG-0001, FG-0002, ... (sesuai konvensi project)
 *
 * Jalankan: node import_products.js
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
    purchasePrice: { type: DataTypes.DECIMAL(15,2), defaultValue: 0, field: 'purchase_price' },
    minStock:      { type: DataTypes.DECIMAL(15,2), defaultValue: 0, field: 'min_stock' },
    status:        { type: DataTypes.STRING(20), defaultValue: 'ACTIVE' },
    description:   DataTypes.TEXT
}, { timestamps: true, underscored: true });

function genId() {
    return Date.now().toString() + Math.random().toString(36).substr(2, 5);
}

// Tentukan unit berdasarkan nama produk
function getUnit(name) {
    if (/5 x 800 gr|6 ball|5 pack/i.test(name)) return 'KARTON';
    if (/5 x 5 kg|6 x 5 kg|5 x 4 kg/i.test(name)) return 'KARTON';
    if (/1 x 25 kg/i.test(name)) return 'SAK';
    if (/1 x 15 kg/i.test(name)) return 'SAK';
    if (/1 x 5 kg/i.test(name)) return 'SAK';
    return 'SAK';
}

// 209 produk sesuai urutan di DAFTAR NAMA PRODUK.xlsx
// no = nomor urut (akan jadi FG-0001 s/d FG-0209)
const PRODUCTS = [
    { no:   1, name: 'POTATO BOCAH TANI KOTAK 6 CM 1 x 25 KG' },
    { no:   2, name: 'POTATO BOCAH TANI / N 1 x 25 KG' },
    { no:   3, name: 'POTATO BOCAH TANI / E 1 x 25 KG' },
    { no:   4, name: 'POTATO BOCAH TANI KOTAK 6 CM 1 x 5 KG' },
    { no:   5, name: 'POTATO BOCAH TANI KOTAK 6 CM 5 x 5 KG' },
    { no:   6, name: 'POTATO BOCAH TANI / TR 1 x 25 KG' },
    { no:   7, name: 'POTATO IBU TANI KOTAK 6 CM 1 x 25 KG' },
    { no:   8, name: 'POTATO BOCAH TANI / TR SUPER 1 x 25 KG' },
    { no:   9, name: 'POTATO BOCAH TANI SUPER 2.8 CM 1 x 25 KG' },
    { no:  10, name: 'POTATO BOCAH TANI SUPER 1 x 25 KG' },
    { no:  11, name: 'POTATO BOCAH TANI BUNCIS 2.8 CM 1 x 25 KG' },
    { no:  12, name: 'POTATO TUGU JOGJA KOTAK 6 CM 1 x 25 KG' },
    { no:  13, name: 'POTATO TUGU JOGJA KOTAK 6 CM 1 x 5 KG' },
    { no:  14, name: 'POTATO BOCAH TANI STIK POKEN AYAM 6 CM 1 x 25 KG' },
    { no:  15, name: 'POTATO TUGU JOGJA / N 1 x 25 KG' },
    { no:  16, name: 'POTATO CANGKUL MAS KOTAK 6 CM 1 x 25 KG' },
    { no:  17, name: 'POTATO BOCAH TANI BULAT SUPER 1 x 25 KG' },
    { no:  18, name: 'POTATO BOCAH TANI SUPER 4 CM 1 x 25 KG' },
    { no:  19, name: 'POTATO PANJI MILENIUM KOTAK 1 x 5 KG' },
    { no:  20, name: 'POTATO TUGU JOGJA KOTAK 6 CM 5 x 5 KG' },
    { no:  21, name: 'POTATO KERUPUK BOLONG 1 x 5 KG' },
    { no:  22, name: 'POTATO KERUPUK BOLONG 1 x 25 KG' },
    { no:  23, name: 'POTATO KERANG MERAH UDANG 1 x 25 KG' },
    { no:  24, name: 'POTATO KERANG MERAH UDANG 1 x 25 KG (var)' },
    { no:  25, name: 'POTATO BAPAK TANI BULAT 1 x 5 KG' },
    { no:  26, name: 'POTATO TUGU JOGJA BULAT 1 x 5 KG' },
    { no:  27, name: 'POTATO BOCAH TANI RING MERAH 1 x 5 KG' },
    { no:  28, name: 'POTATO 878 KOTAK 6 CM 1 x 5 KG' },
    { no:  29, name: 'POTATO CANGKUL MAS KOTAK 6 CM 1 x 5 KG' },
    { no:  30, name: 'POTATO IBU TANI KOTAK 6 CM 1 x 5 KG' },
    { no:  31, name: 'POTATO BOCAH TANI KERANG MERAH UDANG 1 x 5 KG' },
    { no:  32, name: 'POTATO CANGKUL MAS KUKU MAUNG 2.5 CM 1 x 25 KG' },
    { no:  33, name: 'POTATO EYANG TANI KOTAK 6 CM 1 x 25 KG' },
    { no:  34, name: 'POTATO BAPAK TANI KOTAK 6 CM 1 x 25 KG' },
    { no:  35, name: 'POTATO PANJI MILENIUM / M 1 x 5 KG' },
    { no:  36, name: 'POTATO CANGKUL MAS BUNCIS 2.8 CM 1 x 25 KG' },
    { no:  37, name: 'POTATO 878 KOTAK 6 CM 5 x 5 KG' },
    { no:  38, name: 'POTATO BOCAH TANI STIK BAWANG 6 CM 1 x 5 KG' },
    { no:  39, name: 'POTATO PANJI MILENIUM PELANGI 1 x 5 KG' },
    { no:  40, name: 'POTATO CANGKUL MAS BUNCIS MERAH 3.5 CM 1 x 25 KG' },
    { no:  41, name: 'POTATO PANJI MILENIUM STIK KENTANG BAWANG 1 x 5 KG' },
    { no:  42, name: 'POTATO BOCAH TANI STIK BAWANG 6 CM 1 x 25 KG' },
    { no:  43, name: 'POTATO BAPAK TANI KOTAK 6 CM 1 x 5 KG' },
    { no:  44, name: 'POTATO BLESS KOTAK 6 CM 6 x 5 KG' },
    { no:  45, name: 'POTATO BLESS KOTAK PELANGI 6 CM 6 x 5 KG' },
    { no:  46, name: 'POTATO BLESS BUNCIS 2.8 CM 1 x 5 KG' },
    { no:  47, name: 'POTATO BLESS KUKU MAUNG 2.5 CM 6 x 5 KG' },
    { no:  48, name: 'POTATO BLESS KERANG KUNING 1 x 5 KG' },
    { no:  49, name: 'POTATO BLESS KERANG PELANGI 1 x 5 KG' },
    { no:  50, name: 'POTATO BLESS KERANG UDANG 1 x 5 KG' },
];

const PRODUCTS2 = [
    { no:  51, name: 'POTATO BLESS KERUPUK BOLONG 1 x 5 KG' },
    { no:  52, name: 'POTATO BLESS STIK BAWANG 6 CM 1 x 5 KG' },
    { no:  53, name: 'POTATO BLESS IMPALA PELANGI 1 x 5 KG' },
    { no:  54, name: 'POTATO PANJI MILENIUM ULIR 1 x 5 KG' },
    { no:  55, name: 'POTATO PANEN RAYA STIK BAWANG 3 CM 1 x 25 KG' },
    { no:  56, name: 'POTATO BAPAK TANI SUPER 1 x 25 KG' },
    { no:  57, name: 'POTATO BAPAK TANI POKEN AYAM 6 CM 1 x 5 KG' },
    { no:  58, name: 'POTATO PANJI MILENIUM IMPALA PELANGI 1 x 5 KG' },
    { no:  59, name: 'POTATO VANIA KOTAK 6 CM 5 x 5 KG' },
    { no:  60, name: 'POTATO PANJI MILENIUM SEMPRONG 1 x 5 KG' },
    { no:  61, name: 'POTATO 878 BUNCIS 2.8 CM 1 x 25 KG' },
    { no:  62, name: 'POTATO PANJI MILENIUM BUNCIS MERAH 1 x 5 KG' },
    { no:  63, name: 'POTATO CANGKUL MAS KOTAK 6 CM 5 x 5 KG' },
    { no:  64, name: 'POTATO PANJI MILENIUM KERANG KUNING 1 x 5 KG' },
    { no:  65, name: 'POTATO BOCAH TANI SEMPRONG 1 x 5 KG' },
    { no:  66, name: 'POTATO STIK KENTANG BAWANG PUTIH 1 x 25 KG' },
    { no:  67, name: 'POTATO PANJI MILENIUM BULAT 1 x 25 KG' },
    { no:  68, name: 'POTATO TUGU JOGJA SEMPRONG 1 x 5 KG' },
    { no:  69, name: 'POTATO BOCAH TANI KOTAK 6 CM JAGUNG 1 x 5 KG' },
    { no:  70, name: 'POTATO BOCAH TANI STIK BAWANG 6 CM 5 x 5 KG' },
    { no:  71, name: 'POTATO BOCAH TANI / N 5 x 5 KG' },
    { no:  72, name: 'POTATO BOCAH TANI KOTAK 3 CM 1 x 25 KG' },
    { no:  73, name: 'POTATO BOCAH TANI KOTAK 4 CM 1 x 25 KG' },
    { no:  74, name: 'POTATO IBU TANI BUNCIS 2.8 CM 1 x 25 KG' },
    { no:  75, name: 'POTATO BOCAH TANI SLIM 3.5 CM 1 x 25 KG' },
    { no:  76, name: 'POTATO BOCAH TANI KERANG MERAH UDANG 5 x 5 KG' },
    { no:  77, name: 'POTATO BOCAH TANI TOPOKI PUTIH 3 CM 1 x 25 KG' },
    { no:  78, name: 'POTATO BOCAH TANI TOPOKI MERAH 3 CM 1 x 25 KG' },
    { no:  79, name: 'POTATO VANIA KOTAK PELANGI 5 x 5 KG' },
    { no:  80, name: 'POTATO BOCAH TANI KOTAK 3.5 CM 1 x 25 KG' },
    { no:  81, name: 'POTATO IBU TANI SLIM 3.5 CM 1 x 25 KG' },
    { no:  82, name: 'POTATO RAJA SULTAN KOTAK 6 CM 1 x 5 KG' },
    { no:  83, name: 'POTATO RAJA SULTAN SEMPRONG 1 x 5 KG' },
    { no:  84, name: 'POTATO RAJA SULTAN STIK BAWANG 6 CM 5 x 5 KG' },
    { no:  85, name: 'POTATO TUGU JOGJA SEMPRONG 1 x 25 KG' },
    { no:  86, name: 'POTATO BOCAH TANI BUNCIS 2.8 CM 1 x 5 KG' },
    { no:  87, name: 'POTATO CANGKUL MAS BUNCIS 1.8 CM 1 x 25 KG' },
    { no:  88, name: 'POTATO RING PREMIUM 1 x 5 KG' },
    { no:  89, name: 'POTATO 878 KOTAK 6 CM 1 x 25 KG' },
    { no:  90, name: 'POTATO EYANG TANI KOTAK 6 CM 1 x 5 KG' },
    { no:  91, name: 'POTATO BOCAH TANI KOTAK 3 CM 1 x 25 KG (var)' },
    { no:  92, name: 'POTATO RAJA SULTAN STIK BAWANG 6 CM 1 x 5 KG' },
    { no:  93, name: 'POTATO BOCAH TANI KUKU MAUNG 5 x 5 KG' },
    { no:  94, name: 'POTATO BOCAH TANI / TW 6.5 CM 1 x 25 KG' },
    { no:  95, name: 'POTATO CANGKUL MAS / TW 6.5 CM 1 x 25 KG' },
    { no:  96, name: 'POTATO BOCAH TANI TOPOKI MERAH 1 x 5 KG' },
    { no:  97, name: 'POTATO PANEN RAYA KOTAK / TW 6 CM 1 x 25 KG' },
    { no:  98, name: 'POTATO PANEN RAYA KOTAK 6 CM 1 x 5 KG' },
    { no:  99, name: 'POTATO EYANG TANI BULAT 6 CM 1 x 5 KG' },
    { no: 100, name: 'POTATO CANGKUL MAS / TW 6 CM 1 x 25 KG' },
];

const PRODUCTS3 = [
    { no: 101, name: 'POTATO PANEN RAYA BULAT 1 x 5 KG' },
    { no: 102, name: 'POTATO PANEN RAYA KERANG KUNING 1 x 5 KG' },
    { no: 103, name: 'POTATO PANEN RAYA KERANG KUNING 1 x 25 KG' },
    { no: 104, name: 'POTATO PANEN RAYA KOTAK 5 x 5 KG' },
    { no: 105, name: 'POTATO PANEN RAYA SEMPRONG 5 x 5 KG' },
    { no: 106, name: 'POTATO ANEKA KERUPUK JOHAN ULIR 5 x 4 KG' },
    { no: 107, name: 'POTATO ANEKA KERUPUK JOHAN KOTAK 5 x 5 KG' },
    { no: 108, name: 'POTATO BOCAH TANI RING MERAH 5 x 5 KG' },
    { no: 109, name: 'POTATO BOCAH TANI BUNCIS 2.8 CM 5 x 5 KG' },
    { no: 110, name: 'POTATO BOCAH TANI TOPOKI MERAH PUTIH 1 x 25 KG' },
    { no: 111, name: 'POTATO BOCAH TANI BUNCIS MERAH 3.5 CM 1 x 5 KG' },
    { no: 112, name: 'POTATO PANJI MILENIUM / M 2.8 CM 1 x 5 KG' },
    { no: 113, name: 'POTATO PANEN RAYA KOTAK 6 CM 6 x 5 KG' },
    { no: 114, name: 'POTATO PANEN RAYA SEMPRONG 6 x 5 KG' },
    { no: 115, name: 'POTATO PANEN RAYA KERANG KUNING 5 x 5 KG' },
    { no: 116, name: 'POTATO PANEN RAYA SEMPRONG PELANGI 5 x 5 KG' },
    { no: 117, name: 'POTATO PANEN RAYA SEMPRONG 1 x 5 KG' },
    { no: 118, name: 'POTATO BOCAH TANI KENTANG IRIS 2 CM 1 x 5 KG' },
    { no: 119, name: 'POTATO BOCAH TANI STIK POKEN 6 CM 1 x 5 KG' },
    { no: 120, name: 'POTATO BOCAH TANI TOPOKI PUTIH 3 CM 1 x 5 KG' },
    { no: 121, name: 'POTATO CANGKUL MAS TR KOTAK 6 CM 1 x 25 KG' },
    { no: 122, name: 'POTATO CANGKUL MAS STIK BAWANG TW 6 CM 1 x 25 KG' },
    { no: 123, name: 'POTATO USMAN KOTAK TW 6 CM 1 x 5 KG' },
    { no: 124, name: 'POTATO USMAN KOTAK PELANGI 6 CM 1 x 5 KG' },
    { no: 125, name: 'POTATO PANEN RAYA KOTAK TW 6 CM 1 x 5 KG' },
    { no: 126, name: 'POTATO PANEN RAYA STIK BAWANG 6 CM 1 x 5 KG' },
    { no: 127, name: 'POTATO PANEN RAYA KERANG MERAH 1 x 5 KG' },
    { no: 128, name: 'POTATO PANEN RAYA STIK POKEN PELANGI 6 CM 5 x 5 KG' },
    { no: 129, name: 'POTATO PANEN RAYA TOPOKI MERAH 3 CM 1 x 5 KG' },
    { no: 130, name: 'POTATO IBU TANI STIK POKEN AYAM 3.5 CM 1 x 25 KG' },
    { no: 131, name: 'POTATO BOCAH TANI STIK BAWANG 3 CM 1 x 25 KG' },
    { no: 132, name: 'POTATO PANEN RAYA KOTAK 6 CM 5 x 800 GR' },
    { no: 133, name: 'POTATO BAPAK TANI BULAT 6 CM 5 x 800 GR' },
    { no: 134, name: 'POTATO BAPAK TANI BULAT STIK POKEN AYAM 6 CM 5 x 800 GR' },
    { no: 135, name: 'POTATO BAPAK TANI STIK POKEN UDANG 6 CM 5 x 800 GR' },
    { no: 136, name: 'POTATO BAPAK TANI STIK POKEN UDANG 6 CM 1 x 5 KG' },
    { no: 137, name: 'POTATO ULIR KUNING 1 x 15 KG' },
    { no: 138, name: 'POTATO BOCAH TANI STIK POKEN 6 CM 1 x 25 KG' },
    { no: 139, name: 'POTATO PANEN RAYA STIK POKEN PELANGI 6 CM 1 x 25 KG' },
    { no: 140, name: 'POTATO RAJA SULTAN BUNCIS 2.8 CM 1 x 5 KG' },
    { no: 141, name: 'POTATO RAJA SULTAN KENTANG IRIS 2 CM 5 x 800 GR' },
    { no: 142, name: 'POTATO RAJA SULTAN BUNCIS 2.8 CM 5 x 800 GR' },
    { no: 143, name: 'POTATO RAJA SULTAN STIK BAWANG 6 CM 5 x 800 GR' },
    { no: 144, name: 'POTATO MEKAR JAYA KOTAK PUTIH 6 CM 1 x 5 KG' },
    { no: 145, name: 'POTATO MEKAR JAYA KOTAK KUNING 6 CM 1 x 5 KG' },
    { no: 146, name: 'POTATO MEKAR JAYA BUNCIS 2.8 CM 1 x 5 KG' },
    { no: 147, name: 'POTATO MEKAR JAYA STIK POKEN PELANGI 6 CM 1 x 5 KG' },
    { no: 148, name: 'POTATO MEKAR JAYA KERANG KUNING 1 x 5 KG' },
    { no: 149, name: 'POTATO MEKAR JAYA STIK BAWANG KUNING 6 CM 1 x 5 KG' },
    { no: 150, name: 'POTATO MEKAR JAYA KENTANG IRIS 4 CM 1 x 5 KG' },
];

const PRODUCTS4 = [
    { no: 151, name: 'POTATO MEKAR JAYA SEMPRONG PELANGI 6 CM 1 x 5 KG' },
    { no: 152, name: 'STIK POKEN UDANG 1 x 25 KG' },
    { no: 153, name: 'POTATO HR KENTANG IRIS 2 CM 5 x 5 KG' },
    { no: 154, name: 'POTATO HR KOTAK 6 CM 5 x 5 KG' },
    { no: 155, name: 'POTATO HR KERANG KUNING 5 x 5 KG' },
    { no: 156, name: 'POTATO HR KENTANG IRIS 2 CM 5 x 800 GR' },
    { no: 157, name: 'POTATO HR KOTAK 6 CM 5 x 800 GR' },
    { no: 158, name: 'POTATO HR KERANG KUNING 5 x 800 GR' },
    { no: 159, name: 'POTATO CANGKUL MAS STIK BAWANG KUNING 6 CM 1 x 25 KG' },
    { no: 160, name: 'POTATO CANGKUL MAS KERANG KUNING 1 x 25 KG' },
    { no: 161, name: 'POTATO BOCAH TANI KENTANG IRIS 2 CM 1 x 25 KG' },
    { no: 162, name: 'POTATO BAPAK TANI BULAT 1 x 25 KG' },
    { no: 163, name: 'POTATO PANEN RAYA KOTAK TW 6 CM 5 x 5 KG' },
    { no: 164, name: 'POTATO PANEN RAYA KUNING KOTAK 6 CM 1 x 25 KG' },
    { no: 165, name: 'POTATO EYANG TANI KOTAK 4.5 CM 1 x 25 KG' },
    { no: 166, name: 'POTATO PANEN RAYA BUNCIS 2.8 CM 1 x 5 KG' },
    { no: 167, name: 'POTATO ANEKA KERUPUK TB KOTAK 6 CM 1 x 5 KG' },
    { no: 168, name: 'POTATO ANEKA KERUPUK TB KOTAK 6 CM 5 x 800 GR' },
    { no: 169, name: 'POTATO PANJI MILENIUM BULAT 6 CM 1 x 5 KG' },
    { no: 170, name: 'POTATO 878 SEMPRONG 6 CM 1 x 5 KG' },
    { no: 171, name: 'POTATO 878 STIK POKEN PELANGI 6 CM 1 x 5 KG' },
    { no: 172, name: 'POTATO PANEN RAYA STIK POKEN PELANGI 6 CM 1 x 5 KG' },
    { no: 173, name: 'POTATO IBU TANI KOTAK KUNING 6 CM 1 x 25 KG' },
    { no: 174, name: 'POTATO MAHKOTA MAS KOTAK KUNING 1 x 5 KG' },
    { no: 175, name: 'POTATO MAHKOTA MAS KOTAK KUNING 5 x 800 GR' },
    { no: 176, name: 'POTATO FJS IBU TANI KOTAK 6 CM 5 x 5 KG' },
    { no: 177, name: 'POTATO FJS SEMPRONG 6 CM 5 x 5 KG' },
    { no: 178, name: 'POTATO FJS SEMPRONG PELANGI 6 CM 5 x 5 KG' },
    { no: 179, name: 'POTATO PANEN RAYA STIK POKEN PELANGI 6 CM 5 x 800 GR' },
    { no: 180, name: 'POTATO PANEN RAYA SEMPRONG PELANGI 1 x 5 KG' },
    { no: 181, name: 'POTATO EYANG TANI KOTAK 4.5 CM 1 x 5 KG' },
    { no: 182, name: 'POTATO BLESS SEMPRONG 6 CM 6 x 5 KG' },
    { no: 183, name: 'POTATO BLESS SEMPRONG PELANGI 6 CM 6 x 5 KG' },
    { no: 184, name: 'POTATO CANGKUL MAS KUKU MAUNG 2.5 CM 1 x 5 KG' },
    { no: 185, name: 'POTATO PANEN RAYA SEMPRONG 1 x 25 KG' },
    { no: 186, name: 'POTATO PANEN RAYA KENTANG IRIS KUNING 4 CM 1 x 25 KG' },
    { no: 187, name: 'POTATO PANEN RAYA STIK BAWANG 6 CM 1 x 25 KG' },
    { no: 188, name: 'POTATO PANEN RAYA KERANG MERAH 1 x 25 KG' },
    { no: 189, name: 'POTATO PANEN RAYA KUKU MAUNG 2.5 CM 1 x 25 KG' },
    { no: 190, name: 'POTATO PANEN RAYA KUKU MAUNG MERAH 2.5 CM 1 x 5 KG' },
    { no: 191, name: 'POTATO PANEN RAYA SEMPRONG PELANGI 1 x 25 KG' },
    { no: 192, name: 'POTATO PANEN RAYA KUKU MAUNG MERAH 2.5 CM 1 x 25 KG' },
    { no: 193, name: 'POTATO CANGKUL MAS STIK BAWANG 3 CM 1 x 25 KG' },
    { no: 194, name: 'POTATO IBU TANI KOTAK 6 CM 5 x 5 KG' },
    { no: 195, name: 'POTATO PANEN RAYA KENTANG IRIS MIRING 2 CM 5 x 5 KG' },
    { no: 196, name: 'POTATO PANEN RAYA KENTANG IRIS 4 CM 5 x 5 KG' },
    { no: 197, name: 'POTATO PANJI MILENIUM ULIR 5 x 5 KG' },
    { no: 198, name: 'POTATO PANEN RAYA KUKU MAUNG MERAH 2.5 CM 5 x 5 KG' },
    { no: 199, name: 'POTATO PANEN RAYA KUKU MAUNG 2.5 CM 5 x 5 KG' },
    { no: 200, name: 'POTATO PANEN RAYA KOTAK TW 6 CM 1 x 25 KG' },
    { no: 201, name: 'POTATO BAPAK TANI KOTAK 6 CM 5 x 800 GR' },
    { no: 202, name: 'POTATO PANEN RAYA KERANG MERAH 5 x 5 KG' },
    { no: 203, name: 'POTATO PANEN RAYA TW KOTAK 6 CM 6 BALL 5 PACK x 800 GR' },
    { no: 204, name: 'POTATO PANEN RAYA KERANG KUNING 6 BALL 5 PACK x 800 GR' },
    { no: 205, name: 'POTATO PANEN RAYA KERANG MERAH 6 BALL 5 PACK x 800 GR' },
    { no: 206, name: 'POTATO PANEN RAYA SEMPRONG PELANGI 6 BALL 5 PACK x 800 GR' },
    { no: 207, name: 'POTATO PANEN RAYA KENTANG IRIS 4 CM 6 BALL 5 PACK x 800 GR' },
    { no: 208, name: 'POTATO PANEN RAYA STIK POKEN PELANGI 6 BALL 5 PACK x 800 GR' },
    { no: 209, name: 'POTATO HR KENTANG IRIS 4 CM 5 x 5 KG' },
];

const ALL_PRODUCTS = [...PRODUCTS, ...PRODUCTS2, ...PRODUCTS3, ...PRODUCTS4];

async function main() {
    try {
        await sequelize.authenticate();
        console.log('✅ Koneksi database berhasil\n');
        console.log(`📦 Mengimport ${ALL_PRODUCTS.length} produk...\n`);

        let created = 0, skipped = 0, errors = 0;

        for (const p of ALL_PRODUCTS) {
            // Item code: FG-0001 s/d FG-0209 sesuai nomor urut di daftar
            const itemCode = `FG-${String(p.no).padStart(4, '0')}`;

            try {
                // Cek duplikat berdasarkan item_code
                const existing = await InventoryItem.findOne({ where: { itemCode } });
                if (existing) {
                    console.log(`   ⏭  Skip ${itemCode} — sudah ada: ${existing.itemName || existing.item_name}`);
                    skipped++;
                    continue;
                }

                await InventoryItem.create({
                    id:            genId(),
                    itemCode:      itemCode,
                    itemName:      p.name,
                    category:      'FINISHED_GOODS',
                    unit:          getUnit(p.name),
                    purchasePrice: 0,
                    minStock:      0,
                    status:        'ACTIVE',
                    description:   `No. urut: ${p.no}`
                });

                console.log(`   ✅ ${itemCode} — ${p.name}`);
                created++;

            } catch (err) {
                console.error(`   ❌ Error ${itemCode}: ${err.message}`);
                errors++;
            }
        }

        console.log('\n══════════════════════════════════════');
        console.log(`🎉 Import selesai!`);
        console.log(`   ✅ Berhasil dibuat : ${created}`);
        console.log(`   ⏭  Dilewati (duplikat): ${skipped}`);
        console.log(`   ❌ Error            : ${errors}`);
        console.log('══════════════════════════════════════');

    } catch (err) {
        console.error('❌ Gagal koneksi database:', err.message);
        if (err.original) console.error('   Detail:', err.original.message);
    } finally {
        await sequelize.close();
    }
}

main();
