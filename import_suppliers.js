/**
 * import_suppliers.js
 * Import supplier SPAREPART & SERVICE beserta item-itemnya
 * dari SUPLIER TSN.xlsx
 *
 * Jalankan: node import_suppliers.js
 */

require('dotenv').config();
const { Sequelize, DataTypes, Op } = require('sequelize');

const sequelize = new Sequelize(
    process.env.DB_NAME || 'unityerp',
    process.env.DB_USER || 'postgres',
    process.env.DB_PASSWORD || '',
    { host: process.env.DB_HOST || 'localhost', port: parseInt(process.env.DB_PORT) || 5432, dialect: 'postgres', logging: false }
);

const Supplier = sequelize.define('suppliers', {
    id:              { type: DataTypes.STRING(50), primaryKey: true },
    name:            { type: DataTypes.STRING(200), allowNull: false },
    phone:           DataTypes.STRING(50),
    address:         DataTypes.TEXT,
    contact_person:  DataTypes.STRING(200),
    payment_term:    DataTypes.STRING(100),
    category:        DataTypes.STRING(100),
    common_products: { type: DataTypes.JSONB, defaultValue: [] }
}, { timestamps: true, underscored: true });

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

async function getNextCode(prefix) {
    const items = await InventoryItem.findAll({
        where: { itemCode: { [Op.like]: `${prefix}-%` } }
    });
    let max = 0;
    items.forEach(i => {
        const n = parseInt((i.itemCode || '').split('-')[1]);
        if (!isNaN(n) && n > max) max = n;
    });
    return `${prefix}-${String(max + 1).padStart(4, '0')}`;
}

// ─── ITEMS: SPAREPART (SP) ────────────────────────────────────────
const SPAREPART_ITEMS = [
    'ALAT TEHNIK',
    'ALAT LISTRIK',
    'GARAM KROSOK',
    'BEARING',
    'BAUT',
    'NOZZLE',
    'BELT',
    'ROLLER',
    'CANVAS KUNING SIRIP MERAH',
    'HEATER BAND',
    'BURNER GAS',
    'PISAU MESIN',
    'INVERTER',
    'COOLING TOWER',
    'POMPA AIR',
    'BENANG JAHIT KARUNG',
    'PERCETAKAN FORMULIR',
    'MATERIAL BANGUNAN',
];

// ─── ITEMS: SERVICE (SV) ─────────────────────────────────────────
const SERVICE_ITEMS = [
    'SERVICE GULUNG DINAMO',
    'SERVICE TIMBANGAN',
    'SERVICE INVERTER',
    'BENGKEL BUBUT',
    'SERVICE DINAMO / REDUCER / GEAR BOX',
    'SERVICE MESIN JAHIT KARUNG',
];

// ─── DATA SUPPLIER SPAREPART & PERLENGKAPAN ──────────────────────
// items: array nama item yang disupply (harus ada di SPAREPART_ITEMS atau SERVICE_ITEMS)
const SUPPLIERS_SPAREPART = [
    { name: 'TK. ABADHI', address: 'Tuparev, Karawang', pic: 'JHON', phone: '089608299947',
      term: '', category: 'SPAREPART',
      items: ['ALAT TEHNIK'] },
    { name: 'SUMBER TANI', address: 'Johar, Karawang', pic: '', phone: '085183385797',
      term: '', category: 'SPAREPART',
      items: ['ALAT TEHNIK', 'BEARING'] },
    { name: 'TK JOHAR LISTRIK', address: 'Johar, Karawang', pic: '', phone: '082181888711',
      term: '', category: 'SPAREPART',
      items: ['ALAT LISTRIK'] },
    { name: 'PD JAYA LTC', address: 'Glodok, Jakarta', pic: 'ROSMA', phone: '081958688882',
      term: '', category: 'SPAREPART',
      items: ['ALAT LISTRIK'] },
    { name: 'MISTER REMPAH', address: 'Pasar Johar, Karawang', pic: '', phone: '085182151012',
      term: '', category: 'SPAREPART',
      items: ['GARAM KROSOK'] },
    { name: 'TOKO DELI BEARINGS', address: 'Johar, Karawang', pic: '', phone: '081210498588',
      term: '', category: 'SPAREPART',
      items: ['BEARING'] },
    { name: 'UTAMA BEARINDO', address: 'Glodok, Jakarta', pic: 'JULIUS', phone: '0811142605',
      term: '', category: 'SPAREPART',
      items: ['BEARING'] },
    { name: 'ASIAN BEARINDO', address: 'Jakarta', pic: 'SUKMA', phone: '08111096258',
      term: '', category: 'SPAREPART',
      items: ['BEARING'] },
    { name: 'TOKO GLOBAL BAUT', address: 'Klari, Karawang', pic: '', phone: '081325750569',
      term: '', category: 'SPAREPART',
      items: ['BAUT'] },
    { name: 'DANESTA YON', address: 'Tuparev, Karawang', pic: '', phone: '(0267) 405481',
      term: '', category: 'SPAREPART',
      items: ['BAUT'] },
    { name: 'TOKO KONDANG JAYA', address: 'Kondang', pic: '', phone: '081282447708',
      term: '', category: 'SPAREPART',
      items: ['MATERIAL BANGUNAN'] },
    { name: 'TOKO PRIMA JAYA', address: 'Klari, Karawang', pic: '', phone: '082298014949',
      term: '', category: 'SPAREPART',
      items: ['MATERIAL BANGUNAN'] },
    { name: 'MEGA BAJA', address: 'Klari, Karawang', pic: '', phone: '0881847440',
      term: '', category: 'SPAREPART',
      items: ['MATERIAL BANGUNAN'] },
    { name: 'SUMBER TIMUR', address: 'Kosambi', pic: '', phone: '087788194960',
      term: '', category: 'SPAREPART',
      items: ['MATERIAL BANGUNAN'] },
    { name: 'BINA BANGUNAN', address: 'Klari, Karawang', pic: '', phone: '085718754289',
      term: '', category: 'SPAREPART',
      items: ['MATERIAL BANGUNAN'] },
    { name: 'MAJU RAYA', address: 'Klari, Karawang', pic: '', phone: '082120000821',
      term: '', category: 'SPAREPART',
      items: ['MATERIAL BANGUNAN'] },
    { name: 'TWINTECH PRECISION', address: 'Cikarang', pic: 'YESI', phone: '8988276764',
      term: '', category: 'SPAREPART',
      items: ['NOZZLE'] },
    { name: 'CV. BING AN SEJAHTERA', address: 'Kediri', pic: 'EDI', phone: '81259412222',
      term: '', category: 'SPAREPART',
      items: ['NOZZLE'] },
    { name: 'CV. GEMILANG TEKNIK ABADI', address: 'Tangerang', pic: 'YUNUS', phone: '51212072419',
      term: '', category: 'SPAREPART',
      items: ['NOZZLE'] },
    { name: 'PERCETAKAN MANDIRI GRAVIS', address: 'Kosambi', pic: '', phone: '081314282954',
      term: '', category: 'SPAREPART',
      items: ['PERCETAKAN FORMULIR'] },
    { name: 'PT. MULTI MITRA', address: 'Cikarang', pic: 'WAHYU', phone: '081316806928',
      term: '', category: 'SPAREPART',
      items: ['BELT', 'HEATER BAND'] },
    { name: 'PT. SEKAWAN', address: 'Cikarang', pic: 'ARI', phone: '085718711655',
      term: '', category: 'SPAREPART',
      items: ['ROLLER'] },
    { name: 'CENTRAL BELT', address: 'Glodok, Jakarta', pic: 'ROSITA', phone: '085894703014',
      term: '', category: 'SPAREPART',
      items: ['CANVAS KUNING SIRIP MERAH'] },
    { name: 'PT. PARAGON SPESIAL METAL', address: 'Cikarang', pic: 'HAFIZ', phone: '08974463111',
      term: '', category: 'SPAREPART',
      items: ['PISAU MESIN'] },
    { name: 'SATRIA TEKNIK', address: 'Cikarang', pic: 'TIKNO', phone: '081380948513',
      term: '', category: 'SPAREPART',
      items: ['PISAU MESIN'] },
    { name: 'PT. SANSIRA NUSA PERKASA', address: 'Anggadita', pic: 'IWAN', phone: '081513338149',
      term: '', category: 'SPAREPART',
      items: ['PISAU MESIN'] },
    { name: 'PRABU TEKNIK', address: 'Bekasi', pic: '', phone: '083180753055',
      term: '', category: 'SPAREPART',
      items: ['INVERTER'] },
    { name: 'STARPACK INVERTER', address: 'Surabaya', pic: '', phone: '085186653737',
      term: '', category: 'SPAREPART',
      items: ['INVERTER'] },
    { name: 'UD. MAJU TEKNIK MANDIRI', address: 'Jakarta', pic: '', phone: '085281851703',
      term: '', category: 'SPAREPART',
      items: ['COOLING TOWER'] },
    { name: 'MR. POMPA', address: 'Tuparev, Karawang', pic: '', phone: '082210100089',
      term: '', category: 'SPAREPART',
      items: ['POMPA AIR'] },
    { name: 'MITRA POMPA', address: 'Johar, Karawang', pic: '', phone: '081310808006',
      term: '', category: 'SPAREPART',
      items: ['POMPA AIR'] },
    { name: 'SUMBER KARUNG', address: 'Johar, Karawang', pic: '', phone: '87788322409',
      term: '', category: 'SPAREPART',
      items: ['BENANG JAHIT KARUNG'] },
];

// ─── DATA SUPPLIER SERVICE ────────────────────────────────────────
const SUPPLIERS_SERVICE = [
    { name: 'BENGKEL H. UCI', address: 'Teluk Jambe, Karawang', pic: 'H. UCI', phone: '081387017830',
      term: '', category: 'SERVICE',
      items: ['SERVICE GULUNG DINAMO'] },
    { name: 'GRIYA INDUKSI', address: 'Teluk Jambe, Karawang', pic: 'ANO', phone: '81381024403',
      term: '', category: 'SERVICE',
      items: ['SERVICE GULUNG DINAMO'] },
    { name: 'SINAR SURYA ELEKTRONIK', address: 'Klari, Karawang', pic: '', phone: '081285336717',
      term: '', category: 'SERVICE',
      items: ['SERVICE TIMBANGAN'] },
    { name: 'KODIRIN SERVICE', address: 'Karawang', pic: 'KODIRIN', phone: '81286728260',
      term: '', category: 'SERVICE',
      items: ['SERVICE TIMBANGAN', 'SERVICE INVERTER'] },
    { name: 'ZQA', address: 'Bekasi', pic: '', phone: '083180753055',
      term: '', category: 'SERVICE',
      items: ['SERVICE INVERTER'] },
    { name: 'BUBUT AJAT', address: 'Kosambi, Karawang', pic: 'AJAT', phone: '083138177710',
      term: '', category: 'SERVICE',
      items: ['BENGKEL BUBUT'] },
    { name: 'MULYO R. TEKNIK', address: 'Bandung', pic: 'ARDIANTO', phone: '85233459992',
      term: '', category: 'SERVICE',
      items: ['BENGKEL BUBUT'] },
    { name: 'CV. SATRIA TEKNIK', address: 'Cikarang', pic: 'TIKNO', phone: '81380948513',
      term: '', category: 'SERVICE',
      items: ['BENGKEL BUBUT'] },
    { name: 'BENGKEL LESTARI', address: 'Anggadita', pic: 'DARYONO', phone: '85693881097',
      term: '', category: 'SERVICE',
      items: ['BENGKEL BUBUT'] },
    { name: 'CV. ANZO JAYA PERKASA', address: 'Karawang', pic: 'AJAT', phone: '083138177710',
      term: '', category: 'SERVICE',
      items: ['BENGKEL BUBUT'] },
    { name: 'BENGKEL HARUN', address: 'Karawang', pic: 'HARUN', phone: '085785964494',
      term: '', category: 'SERVICE',
      items: ['BENGKEL BUBUT'] },
    { name: 'SUMBER REJEKI', address: 'Bekasi', pic: 'DANDI', phone: '081321128495',
      term: '', category: 'SERVICE',
      items: ['SERVICE DINAMO / REDUCER / GEAR BOX'] },
    { name: 'TOKO KARUNG JOHAR', address: 'Johar, Karawang', pic: '', phone: '89635797877',
      term: '', category: 'SERVICE',
      items: ['SERVICE MESIN JAHIT KARUNG'] },
    { name: 'SERVICE NEWLONG', address: 'Tuparev, Karawang', pic: '', phone: '81318243353',
      term: '', category: 'SERVICE',
      items: ['SERVICE MESIN JAHIT KARUNG'] },
];

const ALL_SUPPLIERS = [...SUPPLIERS_SPAREPART, ...SUPPLIERS_SERVICE];

// ─── MAIN ─────────────────────────────────────────────────────────
async function main() {
    try {
        await sequelize.authenticate();
        console.log('✅ Koneksi database berhasil\n');

        // ── 1. Import Items (SPAREPART + SERVICE) ──────────────────
        console.log('🔧 Import inventory items...');
        const itemCodeMap = {}; // nama item → { id, itemCode, itemName, unit }

        for (const name of SPAREPART_ITEMS) {
            const existing = await InventoryItem.findOne({ where: { itemName: name, category: 'SPAREPART' } });
            if (existing) {
                itemCodeMap[name] = existing;
                console.log(`   ⏭  Skip SP: ${name}`);
                continue;
            }
            const code = await getNextCode('SP');
            const item = await InventoryItem.create({
                id: genId(), itemCode: code, itemName: name,
                category: 'SPAREPART', unit: 'PCS',
                purchasePrice: 0, minStock: 0, status: 'ACTIVE'
            });
            itemCodeMap[name] = item;
            console.log(`   ✅ ${code} — ${name}`);
            await new Promise(r => setTimeout(r, 5)); // hindari id collision
        }

        for (const name of SERVICE_ITEMS) {
            const existing = await InventoryItem.findOne({ where: { itemName: name, category: 'SERVICE' } });
            if (existing) {
                itemCodeMap[name] = existing;
                console.log(`   ⏭  Skip SV: ${name}`);
                continue;
            }
            const code = await getNextCode('SV');
            const item = await InventoryItem.create({
                id: genId(), itemCode: code, itemName: name,
                category: 'SERVICE', unit: 'JOB',
                purchasePrice: 0, minStock: 0, status: 'ACTIVE'
            });
            itemCodeMap[name] = item;
            console.log(`   ✅ ${code} — ${name}`);
            await new Promise(r => setTimeout(r, 5));
        }

        // ── 2. Import Suppliers ────────────────────────────────────
        console.log('\n🏭 Import suppliers...');
        let created = 0, skipped = 0;

        for (const s of ALL_SUPPLIERS) {
            const existing = await Supplier.findOne({ where: { name: s.name } });
            if (existing) {
                console.log(`   ⏭  Skip: ${s.name}`);
                skipped++;
                continue;
            }

            const commonProducts = (s.items || []).map(itemName => {
                const item = itemCodeMap[itemName];
                if (!item) return null;
                return {
                    itemId:   item.id,
                    itemCode: item.itemCode || item.item_code,
                    itemName: item.itemName || item.item_name,
                    price:    0,
                    unit:     item.unit
                };
            }).filter(Boolean);

            await Supplier.create({
                id:             genId(),
                name:           s.name,
                phone:          s.phone || '',
                address:        s.address || '',
                contact_person: s.pic || '',
                payment_term:   s.term || '',
                category:       s.category,
                common_products: commonProducts
            });

            console.log(`   ✅ ${s.name} [${s.category}] (${commonProducts.length} item)`);
            created++;
            await new Promise(r => setTimeout(r, 5));
        }

        console.log('\n══════════════════════════════════════════════');
        console.log('🎉 Import selesai!');
        console.log(`   🔧 Items SP: ${SPAREPART_ITEMS.length}, SV: ${SERVICE_ITEMS.length}`);
        console.log(`   🏭 Supplier dibuat: ${created}, dilewati: ${skipped}`);
        console.log('══════════════════════════════════════════════');

    } catch (err) {
        console.error('❌ Error:', err.message);
        if (err.original) console.error('   Detail:', err.original.message);
    } finally {
        await sequelize.close();
    }
}

main();
