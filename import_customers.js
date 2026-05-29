/**
 * import_customers.js
 * Import 85 customer dari DATABASE EXISTING.xlsx
 * common_products dipetakan ke item code FG-xxxx yang sudah ada di DB
 *
 * Jalankan: node import_customers.js
 */

require('dotenv').config();
const { Sequelize, DataTypes } = require('sequelize');

const sequelize = new Sequelize(
    process.env.DB_NAME || 'unityerp',
    process.env.DB_USER || 'postgres',
    process.env.DB_PASSWORD || '',
    { host: process.env.DB_HOST || 'localhost', port: parseInt(process.env.DB_PORT) || 5432, dialect: 'postgres', logging: false }
);

const Customer = sequelize.define('customers', {
    id:               { type: DataTypes.STRING(50), primaryKey: true },
    name:             { type: DataTypes.STRING(200), allowNull: false },
    phone:            DataTypes.STRING(50),
    address:          DataTypes.TEXT,
    shipping_address: DataTypes.TEXT,
    region:           DataTypes.STRING(100),
    payment_term:     DataTypes.STRING(100),
    ppn:              DataTypes.DECIMAL(5,2),
    common_products:  { type: DataTypes.JSONB, defaultValue: [] }
}, { timestamps: true, underscored: true });

const InventoryItem = sequelize.define('inventory_items', {
    id:       { type: DataTypes.STRING(50), primaryKey: true },
    itemCode: { type: DataTypes.STRING(50), field: 'item_code' },
    itemName: { type: DataTypes.STRING(200), field: 'item_name' },
    unit:     DataTypes.STRING(20),
}, { timestamps: true, underscored: true });

function genId() {
    return Date.now().toString() + Math.random().toString(36).substr(2, 5);
}

// ─── MAPPING: nama produk dari Excel → FG-xxxx ───────────────────
// Berdasarkan hasil check_products.js
const PRODUCT_MAP = {
    // Bocah Tani
    'POTATO BOCAH TANI KOTAK 6 CM 1 x 25 KG':          'FG-0001',
    'POTATO BOCAH TANI KOTAK 6 CM 1 x 5 KG':           'FG-0004',
    'POTATO BOCAH TANI KOTAK 6 CM 5 x 5 KG':           'FG-0005',
    'POTATO BOCAH TANI BUNCIS 2.8 CM 1 x 25 KG':       'FG-0011',
    'POTATO BOCAH TANI STIK POKEN AYAM 6 CM 1 x 25 KG':'FG-0014',
    'POTATO BOCAH TANI BULAT SUPER 1 x 25 KG':         'FG-0017',
    'POTATO BOCAH TANI RING MERAH 1 x 5 KG':           'FG-0027',
    'POTATO BOCAH TANI STIK BAWANG 6 CM 1 x 5 KG':     'FG-0038',
    'POTATO BOCAH TANI STIK BAWANG 6 CM 1 x 25 KG':    'FG-0042',
    'POTATO BOCAH TANI SEMPRONG 1 x 5 KG':             'FG-0065',
    'POTATO BOCAH TANI KOTAK 3 CM 1 x 25 KG':          'FG-0072',
    'POTATO BOCAH TANI KOTAK 4 CM 1 x 25 KG':          'FG-0073',
    'POTATO BOCAH TANI SLIM 3.5 CM 1 x 25 KG':         'FG-0075',
    'POTATO BOCAH TANI TOPOKI PUTIH 3 CM 1 x 25 KG':   'FG-0077',
    'POTATO BOCAH TANI TOPOKI MERAH 3 CM 1 x 25 KG':   'FG-0078',
    'POTATO BOCAH TANI TOPOKI MERAH 1 x 5 KG':         'FG-0096',
    'POTATO BOCAH TANI BUNCIS 2.8 CM 1 x 5 KG':        'FG-0086',
    'POTATO BOCAH TANI STIK BAWANG 3 CM 1 x 25 KG':    'FG-0131',
    'POTATO BOCAH TANI STIK POKEN 6 CM 1 x 5 KG':      'FG-0119',
    'POTATO BOCAH TANI STIK POKEN 6 CM 1 x 25 KG':     'FG-0138',
    'POTATO BOCAH TANI TOPOKI PUTIH 3 CM 1 x 5 KG':    'FG-0120',
    'POTATO BOCAH TANI KENTANG IRIS 2 CM 1 x 5 KG':    'FG-0118',
    'POTATO BOCAH TANI KENTANG IRIS 2 CM 1 x 25 KG':   'FG-0161',
    'POTATO BOCAH TANI / TW 6.5 CM 1 x 25 KG':         'FG-0094',
    // Ibu Tani
    'POTATO IBU TANI KOTAK 6 CM 1 x 25 KG':            'FG-0007',
    'POTATO IBU TANI KOTAK 6 CM 1 x 5 KG':             'FG-0030',
    'POTATO IBU TANI BUNCIS 2.8 CM 1 x 25 KG':         'FG-0074',
    'POTATO IBU TANI SLIM 3.5 CM 1 x 25 KG':           'FG-0081',
    'POTATO IBU TANI STIK POKEN AYAM 3.5 CM 1 x 25 KG':'FG-0130',
    'POTATO IBU TANI KOTAK KUNING 6 CM 1 x 25 KG':     'FG-0173',
    'POTATO IBU TANI KOTAK 6 CM 5 x 5 KG':             'FG-0194',
    // Bapak Tani
    'POTATO BAPAK TANI BULAT 1 x 5 KG':                'FG-0025',
    'POTATO BAPAK TANI KOTAK 6 CM 1 x 25 KG':          'FG-0034',
    'POTATO BAPAK TANI KOTAK 6 CM 1 x 5 KG':           'FG-0043',
    'POTATO BAPAK TANI SUPER 1 x 25 KG':               'FG-0056',
    'POTATO BAPAK TANI POKEN AYAM 6 CM 1 x 5 KG':      'FG-0057',
    'POTATO BAPAK TANI BULAT 1 x 25 KG':               'FG-0162',
    'POTATO BAPAK TANI KOTAK 6 CM 5 x 800 GR':         'FG-0201',
    // Cangkul Mas
    'POTATO CANGKUL MAS KOTAK 6 CM 1 x 25 KG':         'FG-0016',
    'POTATO CANGKUL MAS KOTAK 6 CM 1 x 5 KG':          'FG-0029',
    'POTATO CANGKUL MAS KUKU MAUNG 2.5 CM 1 x 25 KG':  'FG-0032',
    'POTATO CANGKUL MAS BUNCIS 2.8 CM 1 x 25 KG':      'FG-0036',
    'POTATO CANGKUL MAS BUNCIS MERAH 3.5 CM 1 x 25 KG':'FG-0040',
    'POTATO CANGKUL MAS KOTAK 6 CM 5 x 5 KG':          'FG-0063',
    'POTATO CANGKUL MAS / TW 6.5 CM 1 x 25 KG':        'FG-0095',
    'POTATO CANGKUL MAS / TW 6 CM 1 x 25 KG':          'FG-0100',
    'POTATO CANGKUL MAS TR KOTAK 6 CM 1 x 25 KG':      'FG-0121',
    'POTATO CANGKUL MAS STIK BAWANG TW 6 CM 1 x 25 KG':'FG-0122',
    'POTATO CANGKUL MAS STIK BAWANG KUNING 6 CM 1 x 25 KG': 'FG-0159',
    'POTATO CANGKUL MAS KERANG KUNING 1 x 25 KG':      'FG-0160',
    'POTATO CANGKUL MAS KUKU MAUNG 2.5 CM 1 x 5 KG':   'FG-0184',
    'POTATO CANGKUL MAS STIK BAWANG 3 CM 1 x 25 KG':   'FG-0193',
    // Tugu Jogja
    'POTATO TUGU JOGJA KOTAK 6 CM 1 x 25 KG':          'FG-0012',
    'POTATO TUGU JOGJA KOTAK 6 CM 1 x 5 KG':           'FG-0013',
    'POTATO TUGU JOGJA KOTAK 6 CM 5 x 5 KG':           'FG-0020',
    'POTATO TUGU JOGJA BULAT 1 x 5 KG':                'FG-0026',
    'POTATO TUGU JOGJA SEMPRONG 1 x 5 KG':             'FG-0068',
    'POTATO TUGU JOGJA SEMPRONG 1 x 25 KG':            'FG-0085',
    // Panen Raya
    'POTATO PANEN RAYA STIK BAWANG 3 CM 1 x 25 KG':    'FG-0055',
    'POTATO PANEN RAYA KOTAK / TW 6 CM 1 x 25 KG':     'FG-0097',
    'POTATO PANEN RAYA KOTAK 6 CM 1 x 5 KG':           'FG-0098',
    'POTATO PANEN RAYA BULAT 1 x 5 KG':                'FG-0101',
    'POTATO PANEN RAYA KERANG KUNING 1 x 5 KG':        'FG-0102',
    'POTATO PANEN RAYA KERANG KUNING 1 x 25 KG':       'FG-0103',
    'POTATO PANEN RAYA KOTAK 5 x 5 KG':                'FG-0104',
    'POTATO PANEN RAYA SEMPRONG 5 x 5 KG':             'FG-0105',
    'POTATO PANEN RAYA KOTAK 6 CM 6 x 5 KG':           'FG-0113',
    'POTATO PANEN RAYA SEMPRONG 6 x 5 KG':             'FG-0114',
    'POTATO PANEN RAYA KERANG KUNING 5 x 5 KG':        'FG-0115',
    'POTATO PANEN RAYA SEMPRONG PELANGI 5 x 5 KG':     'FG-0116',
    'POTATO PANEN RAYA SEMPRONG 1 x 5 KG':             'FG-0117',
    'POTATO PANEN RAYA KOTAK TW 6 CM 1 x 5 KG':        'FG-0125',
    'POTATO PANEN RAYA STIK BAWANG 6 CM 1 x 5 KG':     'FG-0126',
    'POTATO PANEN RAYA KERANG MERAH 1 x 5 KG':         'FG-0127',
    'POTATO PANEN RAYA STIK POKEN PELANGI 6 CM 5 x 5 KG': 'FG-0128',
    'POTATO PANEN RAYA TOPOKI MERAH 3 CM 1 x 5 KG':    'FG-0129',
    'POTATO PANEN RAYA KOTAK 6 CM 5 x 800 GR':         'FG-0132',
    'POTATO PANEN RAYA STIK POKEN PELANGI 6 CM 1 x 25 KG': 'FG-0139',
    'POTATO PANEN RAYA KOTAK TW 6 CM 5 x 5 KG':        'FG-0163',
    'POTATO PANEN RAYA KUNING KOTAK 6 CM 1 x 25 KG':   'FG-0164',
    'POTATO PANEN RAYA BUNCIS 2.8 CM 1 x 5 KG':        'FG-0166',
    'POTATO PANEN RAYA STIK POKEN PELANGI 6 CM 1 x 5 KG': 'FG-0172',
    'POTATO PANEN RAYA STIK POKEN PELANGI 6 CM 5 x 800 GR': 'FG-0179',
    'POTATO PANEN RAYA SEMPRONG PELANGI 1 x 5 KG':     'FG-0180',
    'POTATO PANEN RAYA SEMPRONG 1 x 25 KG':            'FG-0185',
    'POTATO PANEN RAYA STIK BAWANG 6 CM 1 x 25 KG':    'FG-0187',
    'POTATO PANEN RAYA KERANG MERAH 1 x 25 KG':        'FG-0188',
    'POTATO PANEN RAYA KUKU MAUNG 2.5 CM 1 x 25 KG':   'FG-0189',
    'POTATO PANEN RAYA KUKU MAUNG MERAH 2.5 CM 1 x 5 KG': 'FG-0190',
    'POTATO PANEN RAYA SEMPRONG PELANGI 1 x 25 KG':    'FG-0191',
    'POTATO PANEN RAYA KOTAK TW 6 CM 1 x 25 KG':       'FG-0200',
    'POTATO PANEN RAYA KERANG MERAH 5 x 5 KG':         'FG-0202',
};

const PRODUCT_MAP2 = {
    // Eyang Tani
    'POTATO EYANG TANI KOTAK 6 CM 1 x 25 KG':          'FG-0033',
    'POTATO EYANG TANI KOTAK 6 CM 1 x 5 KG':           'FG-0090',
    'POTATO EYANG TANI BULAT 6 CM 1 x 5 KG':           'FG-0099',
    'POTATO EYANG TANI KOTAK 4.5 CM 1 x 25 KG':        'FG-0165',
    'POTATO EYANG TANI KOTAK 4.5 CM 1 x 5 KG':         'FG-0181',
    // Panji Milenium
    'POTATO PANJI MILENIUM KOTAK 1 x 5 KG':            'FG-0019',
    'POTATO PANJI MILENIUM / M 1 x 5 KG':              'FG-0035',
    'POTATO PANJI MILENIUM ULIR 1 x 5 KG':             'FG-0054',
    'POTATO PANJI MILENIUM IMPALA PELANGI 1 x 5 KG':   'FG-0058',
    'POTATO PANJI MILENIUM SEMPRONG 1 x 5 KG':         'FG-0060',
    'POTATO PANJI MILENIUM BUNCIS MERAH 1 x 5 KG':     'FG-0062',
    'POTATO PANJI MILENIUM PELANGI 1 x 5 KG':          'FG-0039',
    'POTATO PANJI MILENIUM KERANG KUNING 1 x 5 KG':    'FG-0064',
    'POTATO PANJI MILENIUM BULAT 1 x 25 KG':           'FG-0067',
    'POTATO PANJI MILENIUM STIK KENTANG BAWANG 1 x 5 KG': 'FG-0041',
    'POTATO PANJI MILENIUM / M 2.8 CM 1 x 5 KG':       'FG-0112',
    'POTATO PANJI MILENIUM BULAT 6 CM 1 x 5 KG':       'FG-0169',
    'POTATO PANJI MILENIUM ULIR 5 x 5 KG':             'FG-0197',
    // 878
    'POTATO 878 KOTAK 6 CM 1 x 5 KG':                  'FG-0028',
    'POTATO 878 KOTAK 6 CM 5 x 5 KG':                  'FG-0037',
    'POTATO 878 BUNCIS 2.8 CM 1 x 25 KG':              'FG-0061',
    'POTATO 878 KOTAK 6 CM 1 x 25 KG':                 'FG-0089',
    'POTATO 878 SEMPRONG 6 CM 1 x 5 KG':               'FG-0170',
    'POTATO 878 STIK POKEN PELANGI 6 CM 1 x 5 KG':     'FG-0171',
    // Bless
    'POTATO BLESS KOTAK 6 CM 6 x 5 KG':                'FG-0044',
    'POTATO BLESS KOTAK PELANGI 6 CM 6 x 5 KG':        'FG-0045',
    'POTATO BLESS BUNCIS 2.8 CM 1 x 5 KG':             'FG-0046',
    'POTATO BLESS KUKU MAUNG 2.5 CM 6 x 5 KG':         'FG-0047',
    'POTATO BLESS KERANG KUNING 1 x 5 KG':             'FG-0048',
    'POTATO BLESS KERANG PELANGI 1 x 5 KG':            'FG-0049',
    'POTATO BLESS KERANG UDANG 1 x 5 KG':              'FG-0050',
    'POTATO BLESS STIK BAWANG 6 CM 1 x 5 KG':          'FG-0052',
    'POTATO BLESS SEMPRONG 6 CM 6 x 5 KG':             'FG-0182',
    'POTATO BLESS SEMPRONG PELANGI 6 CM 6 x 5 KG':     'FG-0183',
    // Vania
    'POTATO VANIA KOTAK 6 CM 5 x 5 KG':                'FG-0059',
    'POTATO VANIA KOTAK PELANGI 5 x 5 KG':             'FG-0079',
    // Raja Sultan
    'POTATO RAJA SULTAN KOTAK 6 CM 1 x 5 KG':          'FG-0082',
    'POTATO RAJA SULTAN SEMPRONG 1 x 5 KG':            'FG-0083',
    'POTATO RAJA SULTAN STIK BAWANG 6 CM 5 x 5 KG':    'FG-0084',
    'POTATO RAJA SULTAN STIK BAWANG 6 CM 1 x 5 KG':    'FG-0092',
    'POTATO RAJA SULTAN BUNCIS 2.8 CM 1 x 5 KG':       'FG-0140',
    // Kerang / Kerupuk
    'POTATO KERANG MERAH UDANG 1 x 25 KG':             'FG-0023',
    'POTATO KERUPUK BOLONG 1 x 5 KG':                  'FG-0021',
    'POTATO KERUPUK BOLONG 1 x 25 KG':                 'FG-0022',
    'POTATO RING PREMIUM 1 x 5 KG':                    'FG-0088',
    'STIK POKEN UDANG 1 x 25 KG':                      'FG-0152',
    // Usman
    'POTATO USMAN KOTAK TW 6 CM 1 x 5 KG':             'FG-0123',
    'POTATO USMAN KOTAK PELANGI 6 CM 1 x 5 KG':        'FG-0124',
    // Mekar Jaya
    'POTATO MEKAR JAYA KOTAK PUTIH 6 CM 1 x 5 KG':     'FG-0144',
    'POTATO MEKAR JAYA KOTAK KUNING 6 CM 1 x 5 KG':    'FG-0145',
    'POTATO MEKAR JAYA BUNCIS 2.8 CM 1 x 5 KG':        'FG-0146',
    'POTATO MEKAR JAYA STIK POKEN PELANGI 6 CM 1 x 5 KG': 'FG-0147',
    'POTATO MEKAR JAYA KERANG KUNING 1 x 5 KG':        'FG-0148',
    'POTATO MEKAR JAYA STIK BAWANG KUNING 6 CM 1 x 5 KG': 'FG-0149',
    'POTATO MEKAR JAYA KENTANG IRIS 4 CM 1 x 5 KG':    'FG-0150',
    'POTATO MEKAR JAYA SEMPRONG PELANGI 6 CM 1 x 5 KG':'FG-0151',
    // HR
    'POTATO HR KENTANG IRIS 2 CM 5 x 5 KG':            'FG-0153',
    'POTATO HR KOTAK 6 CM 5 x 5 KG':                   'FG-0154',
    'POTATO HR KERANG KUNING 5 x 5 KG':                'FG-0155',
    'POTATO HR KENTANG IRIS 2 CM 5 x 800 GR':          'FG-0156',
    'POTATO HR KOTAK 6 CM 5 x 800 GR':                 'FG-0157',
    'POTATO HR KERANG KUNING 5 x 800 GR':              'FG-0158',
    // Aneka Kerupuk Johan
    'POTATO ANEKA KERUPUK JOHAN KOTAK 5 x 5 KG':       'FG-0107',
    // Aneka Kerupuk TB
    'POTATO ANEKA KERUPUK TB KOTAK 6 CM 1 x 5 KG':     'FG-0167',
    'POTATO ANEKA KERUPUK TB KOTAK 6 CM 5 x 800 GR':   'FG-0168',
    // Mahkota Mas
    'POTATO MAHKOTA MAS KOTAK KUNING 1 x 5 KG':        'FG-0174',
    'POTATO MAHKOTA MAS KOTAK KUNING 5 x 800 GR':      'FG-0175',
    // FJS
    'POTATO FJS IBU TANI KOTAK 6 CM 5 x 5 KG':         'FG-0176',
    'POTATO FJS SEMPRONG 6 CM 5 x 5 KG':               'FG-0177',
    'POTATO FJS SEMPRONG PELANGI 6 CM 5 x 5 KG':       'FG-0178',
    // Stik Kentang
    'POTATO STIK KENTANG BAWANG PUTIH 1 x 25 KG':      'FG-0066',
    // Ulir
    'POTATO ULIR KUNING 1 x 15 KG':                    'FG-0137',
};

// Gabungkan semua mapping
const ALL_PRODUCT_MAP = { ...PRODUCT_MAP, ...PRODUCT_MAP2 };

// ─── DATA CUSTOMERS ───────────────────────────────────────────────
// products: array of { name: nama produk sesuai PRODUCT_MAP, price, unit }
const CUSTOMERS = [
  { name: 'CV. HARMONI KARYA TOYS', phone: '081382305001', region: 'BOGOR', term: '', ppn: false,
    address: 'Jl. Raya Tenjo Kec. Tenjo Kab. Bogor (Depan Pom Bensin Pagar warna Merah)',
    products: [
      { name: 'POTATO BOCAH TANI TOPOKI MERAH 3 CM 1 x 25 KG', price: 14864.86 },
      { name: 'POTATO CANGKUL MAS KOTAK 6 CM 1 x 25 KG', price: 13963.96 },
    ]},
  { name: 'H. UMI', phone: '081317665095', region: 'SERANG', term: '30 HARI', ppn: false,
    address: 'Kaligandu Kec. Serang, Kota Serang, Banten',
    products: [
      { name: 'POTATO PANEN RAYA KOTAK TW 6 CM 1 x 5 KG', price: 15000 },
      { name: 'POTATO BOCAH TANI STIK BAWANG 6 CM 1 x 5 KG', price: 15000 },
      { name: 'POTATO PANEN RAYA KERANG MERAH 1 x 5 KG', price: 15000 },
      { name: 'POTATO PANEN RAYA TOPOKI MERAH 3 CM 1 x 5 KG', price: 15000 },
      { name: 'POTATO PANEN RAYA STIK POKEN PELANGI 6 CM 1 x 5 KG', price: 15000 },
    ]},
  { name: 'TOKO USMAN', phone: '087884160032', region: 'SERANG', term: '', ppn: false,
    address: 'Kaligandu Kec. Serang, Kota Serang, Banten',
    products: [
      { name: 'POTATO USMAN KOTAK TW 6 CM 1 x 5 KG', price: 15000 },
      { name: 'POTATO USMAN KOTAK PELANGI 6 CM 1 x 5 KG', price: 15000 },
    ]},
  { name: 'AGUNG SARI', phone: '081958746953', region: 'BEKASI', term: '', ppn: false,
    address: 'Jl. Raya Narogong KM 11 Pangkalan 1A No 40 Bekasi',
    products: [
      { name: 'POTATO IBU TANI KOTAK 6 CM 1 x 25 KG', price: 17500 },
      { name: 'POTATO KERANG MERAH UDANG 1 x 25 KG', price: 15000 },
      { name: 'POTATO 878 KOTAK 6 CM 1 x 5 KG', price: 14500 },
      { name: 'POTATO PANEN RAYA KOTAK / TW 6 CM 1 x 25 KG', price: 14500 },
      { name: 'POTATO BOCAH TANI TOPOKI MERAH 3 CM 1 x 25 KG', price: 16500 },
      { name: 'POTATO BOCAH TANI STIK BAWANG 6 CM 1 x 25 KG', price: 16500 },
      { name: 'POTATO BOCAH TANI BUNCIS 2.8 CM 1 x 25 KG', price: 15500 },
      { name: 'POTATO BAPAK TANI BULAT 1 x 25 KG', price: 19000 },
      { name: 'POTATO PANEN RAYA KOTAK / TW 6 CM 1 x 25 KG', price: 14500 },
      { name: 'POTATO BOCAH TANI KOTAK 6 CM 1 x 25 KG', price: 16500 },
      { name: 'POTATO BAPAK TANI KOTAK 6 CM 1 x 25 KG', price: 19000 },
      { name: 'POTATO IBU TANI KOTAK 6 CM 1 x 25 KG', price: 19500 },
    ]},
  { name: 'BAPAK SUWARNO', phone: '081286037473', region: 'BOGOR', term: '', ppn: false,
    address: 'Jl. Kartika Jaya 5 RT 01 RW 02 Kp. Kadupukur, Ds. Cikeas Udik Kec. Gunung Putri Kab. Bogor',
    products: [
      { name: 'POTATO CANGKUL MAS KOTAK 6 CM 1 x 25 KG', price: 16000 },
      { name: 'POTATO BOCAH TANI TOPOKI MERAH 3 CM 1 x 25 KG', price: 16500 },
    ]},
  { name: 'TOKO KRIUK', phone: '08111918195', region: 'TANGGERANG', term: '30 HARI', ppn: false,
    address: 'Jl. Mahkota Mas No 1 Blok K1 RT 03 RW 10, Cikokol Tangerang',
    products: [
      { name: 'POTATO IBU TANI KOTAK 6 CM 1 x 25 KG', price: 17500 },
    ]},
  { name: 'CV. JOLIE JAYA SNACK', phone: '08121106405', region: 'BOGOR', term: '30 HARI', ppn: false,
    address: 'Kp Bambu Duri Rt 2 Rw 2 No 10 Kel. Tonjong, Kec. Tajur Halang Bogor',
    products: [
      { name: 'POTATO BOCAH TANI KOTAK 6 CM 1 x 25 KG', price: 16000 },
    ]},
  { name: 'NANA', phone: '081380868776', region: 'TANGGERANG', term: '', ppn: false,
    address: 'Jl. Raya Malang Nengah - Ancol, Kp. Cirendeu, Cikareo, Kec. Solear, Kab. Tangerang Banten 15730',
    products: [
      { name: 'POTATO BOCAH TANI KOTAK 6 CM 1 x 25 KG', price: 16500 },
      { name: 'POTATO BOCAH TANI STIK BAWANG 6 CM 1 x 25 KG', price: 16500 },
      { name: 'POTATO KERANG MERAH UDANG 1 x 25 KG', price: 16500 },
      { name: 'POTATO PANEN RAYA STIK POKEN PELANGI 6 CM 1 x 25 KG', price: 14500 },
    ]},
  { name: 'BPK. LUNGGA WIJAYA', phone: '0818971471', region: 'TANGGERANG', term: '', ppn: false,
    address: 'Jl. Daan Mogot KM 19 Ruko Smart Market Blok B6-B7 Tangerang',
    products: [
      { name: 'POTATO PANEN RAYA KOTAK 6 CM 1 x 5 KG', price: 15000 },
      { name: 'POTATO PANEN RAYA BUNCIS 2.8 CM 1 x 5 KG', price: 16000 },
      { name: 'POTATO PANEN RAYA STIK POKEN PELANGI 6 CM 1 x 5 KG', price: 15000 },
    ]},
  { name: 'RAJA DUA ELANG', phone: '081387727197', region: 'TANGGERANG', term: '', ppn: false,
    address: 'Jl. Raya Peusar Kec. Panongan Ds Peusar, Kp. Cogreg RT 04 RW 01',
    products: [
      { name: 'POTATO BOCAH TANI KOTAK 6 CM 1 x 25 KG', price: 16500 },
    ]},
];

const CUSTOMERS2 = [
  { name: 'BAPAK HERDIN', phone: '081381444564', region: 'BOGOR', term: 'CASH', ppn: false,
    address: 'Perum Griya Wana Karya Permai Blok H1 No 4 Bubulak. Bogor',
    products: [
      { name: 'POTATO PANEN RAYA KOTAK 6 CM 1 x 5 KG', price: 15000 },
      { name: 'POTATO PANEN RAYA KERANG MERAH 1 x 5 KG', price: 15000 },
      { name: 'POTATO BOCAH TANI TOPOKI MERAH 1 x 5 KG', price: 17000 },
      { name: 'POTATO PANEN RAYA SEMPRONG 1 x 5 KG', price: 15000 },
      { name: 'POTATO CANGKUL MAS KOTAK 6 CM 1 x 5 KG', price: 16000 },
    ]},
  { name: 'PT. ALUR CERITA PANGAN', phone: '085362885570', region: 'BANDUNG', term: '30 HARI', ppn: false,
    address: 'Jl. Raya Gadobangkong No. 104, Kec. Ngamprah, Kab. Bandung Barat',
    products: [
      { name: 'POTATO BAPAK TANI KOTAK 6 CM 1 x 25 KG', price: 17117.12 },
    ]},
  { name: 'IBU SARI', phone: '081322129900', region: 'BANDUNG', term: '', ppn: false,
    address: 'Jl. Aruman No 1 RT 06 RW 07 Kel. Cibabat, Kec. Cimahi Utara Kota Cimahi Jawa Barat 40513',
    products: [
      { name: 'POTATO IBU TANI KOTAK 6 CM 1 x 25 KG', price: 17500 },
      { name: 'POTATO CANGKUL MAS KERANG KUNING 1 x 25 KG', price: 14500 },
      { name: 'POTATO IBU TANI KOTAK KUNING 6 CM 1 x 25 KG', price: 15000 },
    ]},
  { name: 'TOKO MATAHARI PAGI', phone: '081323138999', region: 'TASIKMALAYA', term: '', ppn: false,
    address: 'Ruko Permata Cikurubuk Blok J No 8, Kel. Linggajaya Kec. Mangkubumi Kota Tasikmalaya',
    products: [
      { name: 'POTATO PANEN RAYA KOTAK 6 CM 1 x 5 KG', price: 15000 },
      { name: 'POTATO PANEN RAYA STIK BAWANG 6 CM 1 x 5 KG', price: 15000 },
      { name: 'POTATO PANEN RAYA STIK POKEN PELANGI 6 CM 1 x 5 KG', price: 15000 },
      { name: 'POTATO PANEN RAYA KERANG KUNING 1 x 5 KG', price: 15000 },
    ]},
  { name: 'UD. PANCA REZEKI PANGAN', phone: '082125005902', region: 'CIREBON', term: '30 HARI', ppn: false,
    address: 'Jl. Raya Rawa Urip KM 14 No. 18B (Sebelah Pabrik Semen Garuda)',
    products: [
      { name: 'POTATO BOCAH TANI TOPOKI MERAH 3 CM 1 x 25 KG', price: 16500 },
      { name: 'POTATO PANEN RAYA STIK BAWANG 3 CM 1 x 25 KG', price: 15000 },
    ]},
  { name: 'FELIX', phone: '087778882014', region: 'BANDUNG', term: '', ppn: false,
    address: 'Jl. Bodogol 31 Ciwastra Bandung',
    products: [
      { name: 'POTATO PANJI MILENIUM BUNCIS MERAH 1 x 5 KG', price: 16500 },
      { name: 'POTATO PANJI MILENIUM PELANGI 1 x 5 KG', price: 14500 },
      { name: 'POTATO PANJI MILENIUM KOTAK 1 x 5 KG', price: 14250 },
      { name: 'POTATO PANJI MILENIUM SEMPRONG 1 x 5 KG', price: 17000 },
      { name: 'POTATO PANJI MILENIUM / M 1 x 5 KG', price: 14250 },
      { name: 'POTATO PANJI MILENIUM ULIR 1 x 5 KG', price: 14250 },
      { name: 'POTATO CANGKUL MAS BUNCIS MERAH 3.5 CM 1 x 25 KG', price: 16000 },
      { name: 'POTATO PANJI MILENIUM KERANG KUNING 1 x 5 KG', price: 14250 },
    ]},
  { name: 'TOKO BUKIT SHAFA', phone: '082220432800', region: 'CIREBON', term: '30 HARI', ppn: false,
    address: 'Jl. Syekh Datul Kahfi No 14 Waru Lor, Kec. Weru Kab. Cirebon Jawa Barat 45154',
    products: [
      { name: 'POTATO BOCAH TANI STIK BAWANG 6 CM 1 x 5 KG', price: 17000 },
      { name: 'POTATO BOCAH TANI KENTANG IRIS 2 CM 1 x 5 KG', price: 17000 },
      { name: 'POTATO 878 KOTAK 6 CM 1 x 5 KG', price: 14500 },
    ]},
  { name: 'TOKO ANEKA KERUPUK 94', phone: '085920009494', region: 'CIREBON', term: '30 HARI', ppn: false,
    address: 'Jl. Raya Plered No 94 Cirebon (samping Bank Panin)',
    products: [
      { name: 'POTATO PANEN RAYA KOTAK 6 CM 1 x 5 KG', price: 14500 },
      { name: 'POTATO BOCAH TANI STIK BAWANG 6 CM 1 x 5 KG', price: 17000 },
      { name: 'POTATO BOCAH TANI BUNCIS 2.8 CM 1 x 5 KG', price: 16000 },
    ]},
  { name: 'MEKAR JAYA KERUPUK', phone: '085321088120', region: 'CIREBON', term: '', ppn: false,
    address: 'Panembahan Kec. Plered, Kab. Cirebon Jawa Barat 45154',
    products: [
      { name: 'POTATO MEKAR JAYA KOTAK PUTIH 6 CM 1 x 5 KG', price: 16000 },
      { name: 'POTATO MEKAR JAYA KOTAK KUNING 6 CM 1 x 5 KG', price: 16000 },
      { name: 'POTATO MEKAR JAYA BUNCIS 2.8 CM 1 x 5 KG', price: 16000 },
      { name: 'POTATO MEKAR JAYA STIK POKEN PELANGI 6 CM 1 x 5 KG', price: 16000 },
      { name: 'POTATO MEKAR JAYA KERANG KUNING 1 x 5 KG', price: 16000 },
      { name: 'POTATO MEKAR JAYA STIK BAWANG KUNING 6 CM 1 x 5 KG', price: 16000 },
      { name: 'POTATO MEKAR JAYA KENTANG IRIS 4 CM 1 x 5 KG', price: 16000 },
      { name: 'POTATO MEKAR JAYA SEMPRONG PELANGI 6 CM 1 x 5 KG', price: 16000 },
      { name: 'POTATO BAPAK TANI KOTAK 6 CM 1 x 5 KG', price: 19500 },
    ]},
  { name: 'HJ. DONNY', phone: '087720103763', region: 'CIANJUR', term: '30 HARI', ppn: false,
    address: 'Cirumput Kampung Pasir Peundeuy RT 01 RW 01, Kec. Cugenang (Pabrik Sukro)',
    products: [
      { name: 'POTATO BOCAH TANI KOTAK 6 CM 1 x 25 KG', price: 16500 },
      { name: 'POTATO BOCAH TANI KOTAK 3 CM 1 x 25 KG', price: 16500 },
      { name: 'POTATO IBU TANI STIK POKEN AYAM 3.5 CM 1 x 25 KG', price: 17500 },
      { name: 'POTATO BOCAH TANI STIK BAWANG 3 CM 1 x 25 KG', price: 16500 },
    ]},
];

const CUSTOMERS3 = [
  { name: 'BPK. ISHAQ', phone: '087837535346', region: 'BOYOLALI', term: 'CASH', ppn: false,
    address: 'Dusun II Doplang Kec. Teras Kab. Boyolali Jawa Tengah 57372',
    products: [{ name: 'POTATO BOCAH TANI KOTAK 6 CM 1 x 25 KG', price: 17000 }]},
  { name: 'GIOK', phone: '082136535857', region: 'SOLO', term: '30 HARI', ppn: false,
    address: 'Jl. Sultan Syahrir No 187 Solo RT 8 Karang Anyar Solo 57712',
    products: [
      { name: 'POTATO BOCAH TANI KOTAK 6 CM 1 x 5 KG', price: 16500 },
      { name: 'POTATO BOCAH TANI BUNCIS 2.8 CM 1 x 5 KG', price: 16500 },
      { name: 'POTATO BOCAH TANI STIK BAWANG 6 CM 1 x 5 KG', price: 16500 },
      { name: 'POTATO 878 KOTAK 6 CM 1 x 5 KG', price: 15000 },
    ]},
  { name: 'UD. BINTANG BAMBU', phone: '089688512126', region: 'PURWOKERTO', term: '30 HARI', ppn: false,
    address: 'Jl. Raya Karang Salam Beji No 5B, Karang Alam Utara Unwiku (Seberang Mumpuni Foto Copy)',
    products: [
      { name: 'POTATO 878 KOTAK 6 CM 1 x 5 KG', price: 15000 },
      { name: 'POTATO TUGU JOGJA SEMPRONG 1 x 5 KG', price: 17000 },
      { name: 'POTATO 878 SEMPRONG 6 CM 1 x 5 KG', price: 15000 },
      { name: 'POTATO 878 STIK POKEN PELANGI 6 CM 1 x 5 KG', price: 15000 },
    ]},
  { name: 'UD. ARISTA JAYA', phone: '082138817944', region: 'PURWOKERTO', term: 'CASH', ppn: false,
    address: 'Dusun III Kedondong, Kec. Sokaraja, Kab. Banyumas Jawa Tengah',
    products: [
      { name: 'POTATO MAHKOTA MAS KOTAK KUNING 1 x 5 KG', price: 0 },
      { name: 'POTATO MAHKOTA MAS KOTAK KUNING 5 x 800 GR', price: 0 },
    ]},
  { name: 'BPK. SUDARNO', phone: '085291032549', region: 'PURWOKERTO', term: 'CASH', ppn: false,
    address: 'Dusun 1 Taman Sari Kec. Karanglewas, Kab. Banyumas Jawa Tengah',
    products: [
      { name: 'POTATO PANEN RAYA KOTAK 6 CM 1 x 5 KG', price: 15000 },
      { name: 'POTATO PANEN RAYA KOTAK 6 CM 5 x 800 GR', price: 13000 },
      { name: 'POTATO ANEKA KERUPUK TB KOTAK 6 CM 1 x 5 KG', price: 15000 },
      { name: 'POTATO ANEKA KERUPUK TB KOTAK 6 CM 5 x 800 GR', price: 13000 },
    ]},
  { name: 'BPK. TOHARI', phone: '081225463386', region: 'SOLO', term: '30 HARI', ppn: false,
    address: 'Jl. Gunung Slamet 2 Dukuhan Nayu RT 02 RW 30, Kel. Kadipiro Kec. Banjarsari Kota Surakarta',
    products: [
      { name: 'POTATO CANGKUL MAS KOTAK 6 CM 1 x 25 KG', price: 15500 },
      { name: 'POTATO BOCAH TANI STIK BAWANG 6 CM 1 x 25 KG', price: 16500 },
    ]},
  { name: 'BAPAK JOKO', phone: '081311055375', region: 'KENDAL', term: '30 HARI', ppn: false,
    address: 'Krajan RT 01 RW 01 Kedung Sari Singorojo Kendal',
    products: [{ name: 'POTATO CANGKUL MAS KOTAK 6 CM 1 x 25 KG', price: 15500 }]},
  { name: 'BPK. RHISANG', phone: '082220022070', region: 'KLATEN', term: '30 HARI', ppn: false,
    address: 'Sidowayah Kec. Polanharjo, Kab. Klaten Jawa Tengah',
    products: [
      { name: 'POTATO BOCAH TANI STIK BAWANG 6 CM 1 x 5 KG', price: 17000 },
      { name: 'POTATO BOCAH TANI TOPOKI MERAH 1 x 5 KG', price: 17000 },
      { name: 'POTATO IBU TANI KOTAK 6 CM 1 x 5 KG', price: 18000 },
      { name: 'POTATO BOCAH TANI STIK BAWANG 6 CM 1 x 25 KG', price: 16500 },
    ]},
  { name: 'YUYUN', phone: '082221030216', region: 'SOLO', term: '30 HARI', ppn: false,
    address: 'Tuban Kidul RT 03 RW 05 Tuban, Gondangrejo Karanganyar Jawa Tengah',
    products: [
      { name: 'POTATO CANGKUL MAS KOTAK 6 CM 1 x 25 KG', price: 15500 },
      { name: 'POTATO BOCAH TANI TOPOKI MERAH 3 CM 1 x 25 KG', price: 16500 },
      { name: 'POTATO BOCAH TANI STIK BAWANG 6 CM 1 x 25 KG', price: 16500 },
    ]},
  { name: 'KERUPUK MENTAH SOLO', phone: '081325488816', region: 'SRAGEN', term: '30 HARI', ppn: false,
    address: 'Dukuh Wonorejo, Jambangan Kab. Sragen', products: []},
];

const CUSTOMERS4 = [
  { name: 'BAPAK AGUNG RUBIYANTO', phone: '08122846270', region: 'LASEM', term: '30 HARI', ppn: false,
    address: 'Jl. Babaggan Gang 4 No. 8, Lasem Jawa Tengah',
    products: [{ name: 'POTATO CANGKUL MAS / TW 6.5 CM 1 x 25 KG', price: 15500 }]},
  { name: 'BAPAK ANDI', phone: '082138700980', region: 'KLATEN', term: '30 HARI', ppn: false,
    address: 'Dukuh Timbul Rejo RT 04 RW 05 Kel. Karanganom, Klaten Utara, Kab. Klaten',
    products: [{ name: 'POTATO CANGKUL MAS KOTAK 6 CM 1 x 25 KG', price: 15500 }]},
  { name: 'PT. DUA KELINCI', phone: '(0295) 381407', region: 'KUDUS', term: '', ppn: false,
    address: 'Jl. Raya Pati - Kudus KM 6,3 Pati 59163',
    products: [
      { name: 'POTATO BAPAK TANI KOTAK 6 CM 1 x 25 KG', price: 18000 },
      { name: 'POTATO EYANG TANI KOTAK 6 CM 1 x 25 KG', price: 23500 },
    ]},
  { name: 'SUWARNO', phone: '082189211168', region: 'SOLO', term: '30 HARI', ppn: false,
    address: 'Desa Watu Burik RT 02 RW 14 Kel. Wonorejo, Kec. Ngondang Rejo Kab. Karanganyar',
    products: [
      { name: 'POTATO BAPAK TANI KOTAK 6 CM 1 x 25 KG', price: 19000 },
      { name: 'POTATO BOCAH TANI BUNCIS 2.8 CM 1 x 25 KG', price: 15500 },
      { name: 'POTATO BOCAH TANI STIK BAWANG 6 CM 1 x 25 KG', price: 16500 },
    ]},
  { name: 'PT. MISI ANAK BANGSA', phone: '89615158823', region: 'SOLO', term: '30 HARI', ppn: true,
    address: 'Jl. Melon Raya No 29 Karangasem Laweyan, Surakarta Jawa Tengah',
    products: [
      { name: 'POTATO BOCAH TANI TOPOKI MERAH 3 CM 1 x 25 KG', price: 14864.86 },
      { name: 'POTATO BOCAH TANI STIK BAWANG 6 CM 1 x 25 KG', price: 14864.86 },
    ]},
  { name: 'BAPAK ERWAN', phone: '', region: 'MAGELANG', term: '', ppn: false,
    address: '',
    products: [
      { name: 'POTATO IBU TANI KOTAK 6 CM 1 x 25 KG', price: 17000 },
      { name: 'POTATO CANGKUL MAS KOTAK 6 CM 1 x 25 KG', price: 15500 },
    ]},
  { name: 'LEBAH JAYA SNACK', phone: '081391444152', region: 'BANYUMAS', term: '30 HARI', ppn: false,
    address: 'Jl. Raya Babakan, Dusun II, Babakan, Kec. Karanglewas, Kab. Banyumas',
    products: [{ name: 'POTATO CANGKUL MAS KOTAK 6 CM 1 x 25 KG', price: 15500 }]},
  { name: 'TOKO TOP ASLIE', phone: '0816688353', region: 'KLATEN', term: '', ppn: false,
    address: 'Tegalmas, Prawatan, Jogonalan Rt 01 Rw 12, Klaten Jawa Tengah 57452',
    products: [
      { name: 'POTATO CANGKUL MAS KOTAK 6 CM 1 x 25 KG', price: 15500 },
      { name: 'POTATO BOCAH TANI BUNCIS 2.8 CM 1 x 25 KG', price: 15500 },
      { name: 'POTATO BOCAH TANI STIK BAWANG 6 CM 1 x 25 KG', price: 16500 },
    ]},
  { name: 'TOKO SONNY', phone: '08122633246', region: 'TEMANGGUNG', term: '30 HARI', ppn: false,
    address: 'Jl. Cendrawasih 98 RT 03 RW 06 Kel. Kebonsari Kec. Temanggung Jawa Tengah',
    products: [{ name: 'POTATO BOCAH TANI STIK BAWANG 6 CM 1 x 25 KG', price: 16500 }]},
  { name: 'PT. SURYA PERMATA MULIA', phone: '08122551811', region: 'SALATIGA', term: '30 HARI', ppn: false,
    address: 'Jl. Dr. Muwardi 45A, Kutowinangun Kidul (Sebelah Alfamart Salatiga)',
    products: [{ name: 'POTATO PANEN RAYA STIK BAWANG 3 CM 1 x 25 KG', price: 15000 }]},
];

const CUSTOMERS5 = [
  { name: 'LAUTAN SNACK INDONESIA', phone: '082331850472', region: 'KUDUS', term: '', ppn: false,
    address: 'Jl. Raya Besito KM 4 Peganjaran Kudus, Kec. Bae Jawa Tengah',
    products: [
      { name: 'POTATO BAPAK TANI KOTAK 6 CM 1 x 25 KG', price: 19000 },
      { name: 'POTATO IBU TANI KOTAK 6 CM 1 x 25 KG', price: 17500 },
      { name: 'POTATO CANGKUL MAS KOTAK 6 CM 1 x 25 KG', price: 15500 },
      { name: 'POTATO IBU TANI BUNCIS 2.8 CM 1 x 25 KG', price: 17500 },
    ]},
  { name: 'TOKO DELISA SNACK', phone: '085786661432', region: 'BREBES', term: '', ppn: false,
    address: 'Jatirokeh RT 01 RW 04 Kec. Songgom, Kab. Brebes Jawa Tengah',
    products: [{ name: 'POTATO CANGKUL MAS KOTAK 6 CM 1 x 25 KG', price: 16500 }]},
  { name: 'SUMBER BARU', phone: '081327327027', region: 'PURWOKERTO', term: '30 HARI', ppn: false,
    address: 'Pasar Induk Ajibarang Blok B 50 Purwokerto, Banyumas (Sebelah Apotik masuk)',
    products: [{ name: 'POTATO 878 KOTAK 6 CM 1 x 5 KG', price: 15000 }]},
  { name: 'PT. LEGONG BALI NUSANTARA', phone: '082231369073', region: 'SIDOARJO', term: '30 HARI', ppn: false,
    address: 'Jl. Jati Utara Gang Balai Desa No. 15, Ds Jati Sidoarjo (Gerbang Hijau Tosca)',
    products: [{ name: 'POTATO EYANG TANI KOTAK 4.5 CM 1 x 25 KG', price: 28828.83 }]},
  { name: 'CV. LUMBUNG PANGAN JAYA', phone: '081380678789', region: 'SIDOARJO', term: '', ppn: false,
    address: 'Jl. Raya Kebraon Kav 47 Kebraon 2, Kahuripan Nirwana Blok CA 31 No 9, Sumput Sidoarjo',
    products: [{ name: 'POTATO PANEN RAYA KOTAK 6 CM 1 x 5 KG', price: 13063.06 }]},
  { name: 'BAPAK H. VIKAR', phone: '082132379666', region: 'SIDOARJO', term: 'CASH', ppn: false,
    address: 'Desa Jati Tani RT 09 RW 03 Keret, Kec. Krembung Kab. Sidoarjo Jawa Timur',
    products: [{ name: 'POTATO PANEN RAYA KOTAK 6 CM 1 x 5 KG', price: 14500 }]},
  { name: 'KERUPUK MENTAH NUSANTARA', phone: '081216080845', region: 'MOJOKERTO', term: '', ppn: false,
    address: 'Juminong, Pesanggrahan, Kab. Mojokerto Jawa Timur 61383',
    products: [
      { name: 'POTATO BOCAH TANI KOTAK 6 CM 1 x 5 KG', price: 17000 },
      { name: 'POTATO CANGKUL MAS KOTAK 6 CM 1 x 5 KG', price: 16000 },
      { name: 'POTATO IBU TANI KOTAK 6 CM 1 x 5 KG', price: 18000 },
      { name: 'POTATO BOCAH TANI KOTAK 6 CM 1 x 25 KG', price: 16500 },
    ]},
  { name: 'PT. KRISPI INDUSTRI INDONESIA', phone: '081235367588', region: 'MOJOKERTO', term: '', ppn: false,
    address: 'Jl. Raya Trawas KM 6.5 Dusun Banyuurip Rt 01 Rw 01 Mojorejo, Pungging Jawa Timur',
    products: [{ name: 'POTATO BOCAH TANI KOTAK 4 CM 1 x 25 KG', price: 15765.77 }]},
  { name: 'TOKO NOVAL JAYA MAKMUR', phone: '081332671492', region: 'GRESIK', term: '', ppn: false,
    address: 'Jl. Raya Morowudi Wetan Kec. Cerme, Kel. Morowudi Gresik',
    products: [{ name: 'POTATO CANGKUL MAS KOTAK 6 CM 1 x 25 KG', price: 15500 }]},
  { name: 'UD. AJI JAYA MAKMUR', phone: '081330110899', region: 'GRESIK', term: '', ppn: false,
    address: 'Jl. Raya Morowudi No 50 Kec. Cerme, Kab. Gresik Jawa Timur',
    products: [{ name: 'POTATO IBU TANI KOTAK 6 CM 1 x 25 KG', price: 17500 }]},
];

const CUSTOMERS6 = [
  { name: 'BAPAK HASANUDIN', phone: '08125274246', region: 'MALANG', term: '', ppn: false,
    address: 'Jl. Abdul Rahman Saleh No.16, Pakis Malang Jawa Timur',
    products: [
      { name: 'POTATO BOCAH TANI TOPOKI MERAH 3 CM 1 x 25 KG', price: 16500 },
      { name: 'POTATO BOCAH TANI STIK BAWANG 6 CM 1 x 25 KG', price: 16500 },
      { name: 'POTATO BOCAH TANI TOPOKI PUTIH 3 CM 1 x 25 KG', price: 16500 },
      { name: 'POTATO PANEN RAYA STIK BAWANG 3 CM 1 x 25 KG', price: 14500 },
      { name: 'POTATO BOCAH TANI BUNCIS 2.8 CM 1 x 25 KG', price: 15500 },
      { name: 'POTATO BAPAK TANI KOTAK 6 CM 1 x 25 KG', price: 19000 },
      { name: 'POTATO BOCAH TANI TOPOKI MERAH 1 x 5 KG', price: 17000 },
    ]},
  { name: 'BAPAK BAMBANG', phone: '081252053117', region: 'MALANG', term: '', ppn: false,
    address: 'Jl. KH Wahid Hasyim No 25 Rt 01/02, Madyoresso Talok Kec. Turen Malang',
    products: [
      { name: 'POTATO PANEN RAYA STIK BAWANG 3 CM 1 x 25 KG', price: 14500 },
      { name: 'POTATO BOCAH TANI KOTAK 6 CM 1 x 25 KG', price: 16500 },
      { name: 'POTATO IBU TANI KOTAK 6 CM 1 x 25 KG', price: 17500 },
      { name: 'POTATO BAPAK TANI KOTAK 6 CM 1 x 25 KG', price: 19000 },
    ]},
  { name: 'BAPAK SUBHAN NURIS', phone: '081233174888', region: 'MALANG', term: '', ppn: false,
    address: 'Jl. Gunung Ceneng 1 RT 06 RW 03, Kel. Turen Kec. Turen Kab. Malang Jawa Timur',
    products: [
      { name: 'POTATO BOCAH TANI STIK BAWANG 6 CM 1 x 5 KG', price: 17000 },
      { name: 'POTATO BOCAH TANI TOPOKI MERAH 1 x 5 KG', price: 17000 },
      { name: 'POTATO IBU TANI KOTAK 6 CM 1 x 5 KG', price: 18000 },
      { name: 'POTATO BOCAH TANI STIK BAWANG 6 CM 1 x 25 KG', price: 16500 },
    ]},
  { name: 'BAPAK LUKMAN', phone: '085258111926', region: 'JOMBANG', term: '30 HARI', ppn: false,
    address: 'Jl. Raya Perak No. 253 Perak Kec. Perak, Kab. Jombang Jawa Timur 61461',
    products: [
      { name: 'POTATO BOCAH TANI KOTAK 6 CM 1 x 5 KG', price: 16500 },
      { name: 'POTATO TUGU JOGJA KOTAK 6 CM 1 x 5 KG', price: 17000 },
    ]},
  { name: 'SETIA 5 JAYA', phone: '08123598652', region: 'SURABAYA', term: '30 HARI', ppn: false,
    address: 'Jl. Kapasari, Kapasan Kec. Simokerto, Surabaya Jawa Timur',
    products: [
      { name: 'POTATO BOCAH TANI TOPOKI MERAH 3 CM 1 x 25 KG', price: 16500 },
      { name: 'POTATO BAPAK TANI KOTAK 6 CM 1 x 25 KG', price: 19000 },
    ]},
  { name: 'AGUNG JAYA', phone: '081335662858', region: 'KEDIRI', term: '', ppn: false,
    address: 'Jl. Ngasinan No. 1 Desa Rejomulyo (Dekat SMA 6 Kediri) Depan Futsal 68129',
    products: [
      { name: 'POTATO PANEN RAYA KOTAK / TW 6 CM 1 x 25 KG', price: 15000 },
      { name: 'POTATO CANGKUL MAS STIK BAWANG KUNING 6 CM 1 x 25 KG', price: 16000 },
      { name: 'POTATO CANGKUL MAS STIK BAWANG TW 6 CM 1 x 25 KG', price: 16000 },
    ]},
  { name: 'ISTANA KERUPUK', phone: '', region: 'MALANG', term: 'CASH', ppn: false,
    address: '', products: []},
  { name: 'TOKO WIJAYA KERUPUK', phone: '08133414616', region: 'KEDIRI', term: '30 HARI', ppn: false,
    address: 'Pasar Pamenang Baru, Pare, Kediri Jawa Timur',
    products: [
      { name: 'POTATO PANEN RAYA KOTAK 6 CM 1 x 5 KG', price: 15000 },
      { name: 'POTATO PANEN RAYA KERANG MERAH 1 x 5 KG', price: 15000 },
      { name: 'POTATO PANEN RAYA SEMPRONG 1 x 5 KG', price: 15000 },
      { name: 'POTATO PANEN RAYA KOTAK 6 CM 5 x 800 GR', price: 15000 },
      { name: 'POTATO PANEN RAYA SEMPRONG PELANGI 1 x 5 KG', price: 15000 },
      { name: 'POTATO PANEN RAYA STIK BAWANG 6 CM 1 x 5 KG', price: 15000 },
    ]},
  { name: 'BAPAK YOHANES', phone: '081372607359', region: 'TJ. PINANG', term: '', ppn: false,
    address: 'EXP: PT. PELNAS KOTA DJAWAI - Jl. Maritim 2 Pel. Sunda Kelapa Gud. 04 Pintu 1',
    products: [{ name: 'POTATO BOCAH TANI KOTAK 3 CM 1 x 25 KG', price: 16500 }]},
  { name: 'HAVANA', phone: '08127536508', region: 'PEKAN BARU', term: '', ppn: false,
    address: 'Jl. Kenanga No. 68 Blok D Pekanbaru - EXP: Surya Global Sejahtera',
    products: [{ name: 'POTATO BOCAH TANI KOTAK 6 CM 5 x 5 KG', price: 16500 }]},
];

const CUSTOMERS7 = [
  { name: 'BAPAK RUDY', phone: '085102772079', region: 'PALEMBANG', term: '30 HARI', ppn: false,
    address: 'Jl. Sosial Jompo Lr. Bersama 2 Rt 14 Rw 02 No 623 Km5, Komplek Osaka Palembang - EXP: Taruna Jayasarana Sempurna',
    products: [{ name: 'POTATO CANGKUL MAS KOTAK 6 CM 1 x 25 KG', price: 15500 }]},
  { name: 'TOKO DORISMAN', phone: '081536282928', region: 'MEDAN', term: '30 HARI', ppn: false,
    address: 'Jl. Bulan No.22, Pusat Ps, Kec. Medan Kota, Kota Medan, Sumatra Utara 20232 - EXP: Sumber Rezeki',
    products: [{ name: 'POTATO TUGU JOGJA KOTAK 6 CM 5 x 5 KG', price: 17000 }]},
  { name: 'CV. DETOX CENTER', phone: '085261938900', region: 'MEDAN', term: '30 HARI', ppn: true,
    address: 'Jl. Rotan Baru No 4, Medan 20112 - EXP: PT DJAT FORWARDER',
    products: [
      { name: 'POTATO PANEN RAYA KOTAK 5 x 5 KG', price: 12612.61 },
      { name: 'POTATO PANEN RAYA SEMPRONG 5 x 5 KG', price: 12612.61 },
    ]},
  { name: 'BAPAK FENDI', phone: '081367706703', region: 'BANGKA', term: '30 HARI', ppn: false,
    address: 'Jl. Basuki Rachmat No 37 Kel. Sriwijaya, Kec. Girimaya Pangkalpinang Bangka - EXP: Bintang Jaya',
    products: [
      { name: 'POTATO PANEN RAYA KOTAK 6 CM 6 x 5 KG', price: 14000 },
      { name: 'POTATO PANEN RAYA SEMPRONG 6 x 5 KG', price: 14000 },
    ]},
  { name: 'TOKO DAVID', phone: '081993313722', region: 'PADANG', term: '30 HARI', ppn: false,
    address: 'Jl. KP. Sebelah No. 23 Padang 25118 - EXP: Sumber Utama',
    products: [
      { name: 'POTATO PANEN RAYA KOTAK 5 x 5 KG', price: 14000 },
      { name: 'POTATO PANEN RAYA SEMPRONG 5 x 5 KG', price: 14000 },
      { name: 'POTATO PANEN RAYA KERANG KUNING 5 x 5 KG', price: 14000 },
      { name: 'POTATO PANEN RAYA SEMPRONG PELANGI 5 x 5 KG', price: 14000 },
    ]},
  { name: 'BAPAK HERMAN', phone: '081278730007', region: 'BANGKA', term: '30 HARI', ppn: false,
    address: 'Jl. Kalamaya No 249 Bacang Pangkal Pinang, Bukit Intan Kota Pangkal Pinang, Bangka Belitung - EXP: Bintang Jaya',
    products: [
      { name: 'POTATO HR KENTANG IRIS 2 CM 5 x 5 KG', price: 14000 },
      { name: 'POTATO HR KOTAK 6 CM 5 x 5 KG', price: 14000 },
      { name: 'POTATO HR KERANG KUNING 5 x 5 KG', price: 14000 },
      { name: 'POTATO HR KENTANG IRIS 2 CM 5 x 800 GR', price: 14000 },
      { name: 'POTATO HR KOTAK 6 CM 5 x 800 GR', price: 14000 },
      { name: 'POTATO HR KERANG KUNING 5 x 800 GR', price: 14000 },
    ]},
  { name: 'TOKO JOHAN', phone: '081368922922', region: 'JAMBI', term: '30 HARI', ppn: false,
    address: 'Jl. Ir Sutami No 44 Pasar Jambi, Kel. Orang Kayo Hitam 36111 - EXP: Sumber Rezeki',
    products: [
      { name: 'POTATO ANEKA KERUPUK JOHAN KOTAK 5 x 5 KG', price: 14000 },
      { name: 'POTATO PANEN RAYA KUNING KOTAK 6 CM 1 x 25 KG', price: 13500 },
      { name: 'POTATO PANEN RAYA SEMPRONG 5 x 5 KG', price: 14000 },
      { name: 'POTATO PANEN RAYA SEMPRONG PELANGI 5 x 5 KG', price: 14000 },
    ]},
  { name: 'BAPAK IKSAN ARGO', phone: '081215318999', region: 'LAMPUNG', term: 'CASH', ppn: false,
    address: 'Jl. Raya Srimulyo I No 12 RT 06 RW 04, Ds Pemanggilan Kec. Natar Kab. Lampung Selatan - EXP: Cahaya Mas',
    products: [
      { name: 'POTATO CANGKUL MAS KUKU MAUNG 2.5 CM 1 x 25 KG', price: 15500 },
      { name: 'POTATO BOCAH TANI KENTANG IRIS 2 CM 1 x 25 KG', price: 16500 },
    ]},
  { name: 'PUTRA BAKTI MANDIRI', phone: '085252242020', region: 'PONTIANAK', term: '30 HARI', ppn: true,
    address: 'EXP: Wahana Lintas Nusantara - Depo Temas, Jl Tembang No.51T Tanjung Priok',
    products: [
      { name: 'POTATO VANIA KOTAK PELANGI 5 x 5 KG', price: 13288.29 },
      { name: 'POTATO VANIA KOTAK 6 CM 5 x 5 KG', price: 13288.29 },
    ]},
  { name: 'BAPAK ALEX MAP', phone: '0811565085', region: 'PONTIANAK', term: '30 HARI', ppn: false,
    address: 'Jl. Paris 2 Dazhil Symponi A7, Pontianak Tenggara Benua Melayu Barat - EXP: PT. Ponti Jaya Express',
    products: [
      { name: 'POTATO PANEN RAYA KOTAK TW 6 CM 5 x 5 KG', price: 15000 },
      { name: 'POTATO PANEN RAYA KOTAK 6 CM 5 x 800 GR', price: 13000 },
    ]},
];

const CUSTOMERS8 = [
  { name: 'TRITAMA JAYA PERKASA', phone: '081256844589', region: 'PONTIANAK', term: '30 HARI', ppn: false,
    address: 'Jl. Wan Sagaf No. 12B Sebelah BSM, Pontianak Kalimantan Barat - EXP: Tesa Logistics',
    products: [{ name: 'POTATO 878 KOTAK 6 CM 5 x 5 KG', price: 15000 }]},
  { name: 'BAPAK OKTAVIANUS / GRAHA MAKMUR', phone: '087885057228', region: 'PONTIANAK', term: '30 HARI', ppn: false,
    address: 'Jl. Purnama 1 Kamp. Purnama Permai Blok D No 1 Parit Tokaya Pontianak - EXP: Berlian',
    products: [
      { name: 'POTATO BLESS KOTAK 6 CM 6 x 5 KG', price: 14500 },
      { name: 'POTATO BLESS KOTAK PELANGI 6 CM 6 x 5 KG', price: 14500 },
      { name: 'POTATO BLESS KUKU MAUNG 2.5 CM 6 x 5 KG', price: 14500 },
      { name: 'POTATO BLESS SEMPRONG 6 CM 6 x 5 KG', price: 14500 },
      { name: 'POTATO BLESS SEMPRONG PELANGI 6 CM 6 x 5 KG', price: 14500 },
    ]},
  { name: 'BAPAK KOMAR', phone: '08125665665', region: 'SINGKAWANG', term: '', ppn: false,
    address: 'Jl. Veteran GG Pasundan No 78, Singkawang Tengah Kalimantan Barat - EXP: PT Radika Indo Sampurna',
    products: [
      { name: 'POTATO BOCAH TANI TOPOKI MERAH 3 CM 1 x 25 KG', price: 16500 },
      { name: 'POTATO KERANG MERAH UDANG 1 x 25 KG', price: 16500 },
    ]},
  { name: 'H. ALI', phone: '085248366446', region: 'BANJARMASIN', term: '30 HARI', ppn: false,
    address: 'Jl. Ahmad Yani KM 11 Banjarmasin (Samping Hotel Aston) - EXP: Raand Putra Borneo',
    products: [
      { name: 'POTATO RAJA SULTAN STIK BAWANG 6 CM 1 x 5 KG', price: 17000 },
      { name: 'POTATO RAJA SULTAN KOTAK 6 CM 1 x 5 KG', price: 16500 },
      { name: 'POTATO RAJA SULTAN SEMPRONG 1 x 5 KG', price: 16500 },
      { name: 'POTATO RAJA SULTAN BUNCIS 2.8 CM 1 x 5 KG', price: 16000 },
    ]},
  { name: 'BAPAK H. TAUFIK', phone: '085100580106', region: 'BANJARMASIN', term: '30 HARI', ppn: false,
    address: 'Pasar Lima Harum Manis 2, Banjarmasin - EXP: PT. Jaya Baru Malanti',
    products: [
      { name: 'POTATO BOCAH TANI KOTAK 6 CM 1 x 5 KG', price: 17000 },
      { name: 'POTATO BOCAH TANI STIK BAWANG 6 CM 1 x 5 KG', price: 17000 },
      { name: 'POTATO BOCAH TANI BUNCIS 2.8 CM 1 x 5 KG', price: 16000 },
      { name: 'POTATO BOCAH TANI SEMPRONG 1 x 5 KG', price: 17000 },
    ]},
  { name: 'CV AGUNG KARYA SENTOSA', phone: '08128522978', region: 'MAKASAR', term: '30 HARI', ppn: true,
    address: 'Ir. Sutami No 17A Parang Loe, Tamalanrea, Kota Makassar Sulawesi Selatan - EXP: Kitrans',
    products: [
      { name: 'POTATO BOCAH TANI KOTAK 6 CM 1 x 25 KG', price: 16486.48 },
      { name: 'POTATO STIK KENTANG BAWANG PUTIH 1 x 25 KG', price: 18486.47 },
    ]},
  { name: 'BINTANG MUJUR ABADI', phone: '08194135828', region: 'MAKASAR', term: '30 HARI', ppn: true,
    address: 'Jl. Salodong No. 68, Makassar - EXP: Kitrans',
    products: [
      { name: 'POTATO BOCAH TANI STIK BAWANG 6 CM 1 x 25 KG', price: 16486.49 },
      { name: 'POTATO BOCAH TANI KOTAK 6 CM 1 x 25 KG', price: 16486.49 },
    ]},
  { name: 'BAPAK RONAL', phone: '0811468525', region: 'MAKASAR', term: '30 HARI', ppn: false,
    address: 'Jl. Kamino No. 5, Makassar - EXP: Surya Raya',
    products: [
      { name: 'POTATO BAPAK TANI BULAT 1 x 5 KG', price: 19500 },
      { name: 'POTATO BOCAH TANI STIK BAWANG 6 CM 1 x 5 KG', price: 17000 },
      { name: 'POTATO BAPAK TANI KOTAK 6 CM 1 x 5 KG', price: 19500 },
      { name: 'POTATO EYANG TANI KOTAK 6 CM 1 x 5 KG', price: 24000 },
      { name: 'POTATO EYANG TANI BULAT 6 CM 1 x 5 KG', price: 24000 },
      { name: 'POTATO BOCAH TANI RING MERAH 1 x 5 KG', price: 17000 },
    ]},
  { name: 'BAPAK BASKARA', phone: '085299254019', region: 'PALU', term: '30 HARI', ppn: false,
    address: 'Jl. Kemiri No 37 I Palu Barat, Sulawesi Tengah - EXP: PT. Samas Agung Trans',
    products: [
      { name: 'POTATO TUGU JOGJA KOTAK 6 CM 1 x 5 KG', price: 17000 },
      { name: 'POTATO BOCAH TANI STIK BAWANG 6 CM 1 x 5 KG', price: 17000 },
      { name: 'POTATO BOCAH TANI STIK POKEN 6 CM 1 x 5 KG', price: 17000 },
      { name: 'POTATO TUGU JOGJA SEMPRONG 1 x 5 KG', price: 17000 },
      { name: 'POTATO PANEN RAYA STIK POKEN PELANGI 6 CM 1 x 5 KG', price: 15000 },
      { name: 'POTATO BOCAH TANI TOPOKI MERAH 1 x 5 KG', price: 17000 },
      { name: 'POTATO PANEN RAYA STIK POKEN PELANGI 6 CM 5 x 800 GR', price: 13000 },
    ]},
  { name: 'FAJAR JAYA SENTOSA', phone: '08128088197', region: 'BEKASI', term: 'CASH', ppn: true,
    address: 'Kampung Tambun Permata RT 03 RW 08, Pusaka Rakyat, Tarumajaya Kab. Bekasi',
    products: [
      { name: 'POTATO FJS IBU TANI KOTAK 6 CM 5 x 5 KG', price: 16216.22 },
      { name: 'POTATO FJS SEMPRONG 6 CM 5 x 5 KG', price: 15315.32 },
      { name: 'POTATO FJS SEMPRONG PELANGI 6 CM 5 x 5 KG', price: 15315.32 },
    ]},
];

const CUSTOMERS9 = [
  { name: 'TOKO YURIAN JAYA', phone: '081382077389', region: 'BEKASI', term: '30 HARI', ppn: false,
    address: 'Jl. Prof Moh. Yamin Blok Paya No. 12 Rt 002/003, Duren Jaya Bekasi Timur',
    products: [
      { name: 'POTATO PANEN RAYA SEMPRONG 1 x 25 KG', price: 15000 },
      { name: 'POTATO PANEN RAYA STIK BAWANG 6 CM 1 x 25 KG', price: 15000 },
      { name: 'POTATO PANEN RAYA KUNING KOTAK 6 CM 1 x 25 KG', price: 15000 },
      { name: 'POTATO PANEN RAYA KERANG KUNING 1 x 25 KG', price: 15000 },
    ]},
  { name: 'H. ORI MAKARONI', phone: '081258742213', region: 'SERANG', term: '30 HARI', ppn: false,
    address: 'Serang Timur Cilampang Rt 02 Rw 07 Kel. Unyur, Serang Banten',
    products: [
      { name: 'POTATO BOCAH TANI TOPOKI MERAH 3 CM 1 x 25 KG', price: 17000 },
      { name: 'POTATO PANEN RAYA KUKU MAUNG 2.5 CM 1 x 25 KG', price: 15000 },
    ]},
  { name: 'BAPAK SANTOSO', phone: '085215474849', region: 'TANGGERANG', term: '30 HARI', ppn: false,
    address: 'Pondok Kacang Barat Rt 002, Rw 002, No.8, Kec. Pondok Aren Tangerang Selatan',
    products: [
      { name: 'POTATO BOCAH TANI TOPOKI MERAH 3 CM 1 x 25 KG', price: 17000 },
      { name: 'POTATO CANGKUL MAS KOTAK 6 CM 1 x 25 KG', price: 16000 },
      { name: 'POTATO PANEN RAYA KUNING KOTAK 6 CM 1 x 25 KG', price: 15000 },
    ]},
  { name: 'H. UUN', phone: '08583968189', region: 'SERANG', term: '', ppn: false,
    address: 'Ciagel, Kec. Kragilan, Kab. Serang Banten 42185',
    products: [{ name: 'POTATO BOCAH TANI KOTAK 6 CM 1 x 25 KG', price: 17000 }]},
  { name: 'TOKO JVJ', phone: '085810588122', region: 'TANGGERANG', term: '', ppn: false,
    address: 'Jl. Aria Jaya Santika, Kp. Kadongdong Rt 03, Rw 04. No.28 Ds. Pasir Nangka, Tiga Raksa, Kab. Tangerang',
    products: []},
];

const ALL_CUSTOMERS = [
    ...CUSTOMERS,  ...CUSTOMERS2, ...CUSTOMERS3, ...CUSTOMERS4,
    ...CUSTOMERS5, ...CUSTOMERS6, ...CUSTOMERS7, ...CUSTOMERS8, ...CUSTOMERS9
];

// ─── MAIN ─────────────────────────────────────────────────────────
async function main() {
    try {
        await sequelize.authenticate();
        console.log('✅ Koneksi database berhasil\n');

        // Load semua inventory items ke memory untuk lookup cepat
        const allItems = await InventoryItem.findAll({ where: { category: 'FINISHED_GOODS' } });
        const itemByCode = {};
        allItems.forEach(i => { itemByCode[i.itemCode] = i; });

        console.log(`📦 ${allItems.length} produk ditemukan di DB\n`);
        console.log(`👥 Mengimport ${ALL_CUSTOMERS.length} customer...\n`);

        let created = 0, skipped = 0, notFound = [];

        for (const c of ALL_CUSTOMERS) {
            const existing = await Customer.findOne({ where: { name: c.name } });
            if (existing) {
                console.log(`   ⏭  Skip: ${c.name}`);
                skipped++;
                continue;
            }

            // Bangun common_products — petakan nama produk ke FG-xxxx
            const commonProducts = [];
            for (const p of (c.products || [])) {
                const fgCode = ALL_PRODUCT_MAP[p.name];
                if (!fgCode) {
                    notFound.push({ customer: c.name, product: p.name });
                    continue;
                }
                const item = itemByCode[fgCode];
                if (!item) {
                    notFound.push({ customer: c.name, product: p.name, code: fgCode, reason: 'tidak ada di DB' });
                    continue;
                }
                commonProducts.push({
                    itemId:   item.id,
                    itemCode: item.itemCode,
                    itemName: item.itemName,
                    price:    p.price || 0,
                    unit:     item.unit
                });
            }

            await Customer.create({
                id:               genId(),
                name:             c.name,
                phone:            c.phone || '',
                address:          c.address || '',
                shipping_address: c.address || '',
                region:           c.region || '',
                payment_term:     c.term || '',
                ppn:              c.ppn ? 11.00 : 0,
                common_products:  commonProducts
            });

            console.log(`   ✅ ${c.name} (${commonProducts.length} produk)`);
            created++;
        }

        console.log('\n══════════════════════════════════════════════');
        console.log('🎉 Import customer selesai!');
        console.log(`   ✅ Berhasil dibuat    : ${created}`);
        console.log(`   ⏭  Dilewati (duplikat): ${skipped}`);
        if (notFound.length > 0) {
            console.log(`\n⚠️  Produk tidak ditemukan di mapping (${notFound.length}):`);
            notFound.forEach(n => console.log(`   - [${n.customer}] "${n.product}" ${n.reason || '(tidak ada di PRODUCT_MAP)'}`));
        }
        console.log('══════════════════════════════════════════════');

    } catch (err) {
        console.error('❌ Error:', err.message);
        if (err.original) console.error('   Detail:', err.original.message);
    } finally {
        await sequelize.close();
    }
}

main();
