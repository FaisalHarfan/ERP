// scratch/parse_excel_coa.js
const fs = require('fs');
const path = require('path');

const csvData = `Kode,Nama Akun,Kode Induk,Kategori,Tipe,Level,Status,Catatan
1,AKTIVA,,AKTIVA,ASET,1,Kelompok,
10,AKTIVA LANCAR,1,AKTIVA,ASET,2,Kelompok,
11,KAS & BANK,10,AKTIVA,ASET,3,Kelompok,
111,KAS OPERASIONAL,11,AKTIVA,ASET,4,Akun,
112,BCA TSN_1188 (IDR),11,AKTIVA,ASET,4,Akun,
113,BCA PTC_2130 (IDR),11,AKTIVA,ASET,4,Akun,
114,BRI PTC_6505 (IDR),11,AKTIVA,ASET,4,Akun,
119,POS SILANG ANTAR BANK,11,AKTIVA,ASET,4,Akun,
12,PIUTANG USAHA,10,AKTIVA,ASET,3,Kelompok,
121,PIUTANG USAHA (IDR),12,AKTIVA,ASET,4,Akun,
13,PIUTANG LAIN-2,10,AKTIVA,ASET,3,Kelompok,
131,PIUTANG KARYAWAN,13,AKTIVA,ASET,4,Akun,
132,PIUTANG DIREKSI,13,AKTIVA,ASET,4,Akun,
133,PIUTANG KEPADA PEMEGANG SAHAM,13,AKTIVA,ASET,4,Akun,
14,PEMBAYARAN DIMUKA,10,AKTIVA,ASET,3,Kelompok,
141,UM PEMBELIAN,14,AKTIVA,ASET,4,Kelompok,
1411,UM PEMBELIAN BAHAN,141,AKTIVA,ASET,5,Akun,
1412,UM PEMBELIAN AKTIVA TETAP,141,AKTIVA,ASET,5,Akun,
142,PAJAK DIBAYAR DIMUKA,14,AKTIVA,ASET,4,Kelompok,
1421,PPN MASUKAN,142,AKTIVA,ASET,5,Akun,
1422,PPh pasal 25 / 29,142,AKTIVA,ASET,5,Akun,
1423,PPh pasal 4 ayat 2,142,AKTIVA,ASET,5,Akun,
1424,PPh pasal 23,142,AKTIVA,ASET,5,Akun,
1425,PPh pasal 21 / 26,142,AKTIVA,ASET,5,Akun,
1426,PPh pasal 22,142,AKTIVA,ASET,5,Akun,
143,BIAYA DIBAYAR DIMUKA,14,AKTIVA,ASET,4,Kelompok,
1431,UM SEWA,143,AKTIVA,ASET,5,Akun,
15,PERSEDIAAN,10,AKTIVA,ASET,3,Kelompok,
151,PERSEDIAAN BAHAN BAKU,15,AKTIVA,ASET,4,Akun,
152,PERSEDIAAN PACKAGING / BAHAN PENOLONG,15,AKTIVA,ASET,4,Akun,
153,PERSEDIAAN BARANG DALAM PROSES,15,AKTIVA,ASET,4,Akun,
154,PERSEDIAAN BARANG JADI,15,AKTIVA,ASET,4,Akun,
17,AKTIVA TETAP,10,AKTIVA,ASET,3,Kelompok,
1711,TANAH,17,AKTIVA,ASET,4,Akun,
1721,BANGUNAN,17,AKTIVA,ASET,4,Akun,
1722,AKUMULASI PENYUSUTAN BANGUNAN,17,AKTIVA,ASET,4,Akun,Kontra-aset
1731,MESIN-MESIN,17,AKTIVA,ASET,4,Akun,
1732,AKUMULASI PENYUSUTAN MESIN-MESIN,17,AKTIVA,ASET,4,Akun,Kontra-aset
1741,KENDARAAN,17,AKTIVA,ASET,4,Akun,
1742,AKUMULASI PENYUSUTAN KENDARAAN,17,AKTIVA,ASET,4,Akun,Kontra-aset
1751,KOMPUTER,17,AKTIVA,ASET,4,Akun,
1752,AKUMULASI PENYUSUTAN KOMPUTER,17,AKTIVA,ASET,4,Akun,Kontra-aset
1761,PERALATAN PABRIK / KANTOR,17,AKTIVA,ASET,4,Akun,
1762,AKUMULASI PENYUSUTAN PERALATAN PABRIK / KANTOR,17,AKTIVA,ASET,4,Akun,Kontra-aset
1771,FURNITURE KANTOR,17,AKTIVA,ASET,4,Akun,
1772,AKUMULASI PENYUSUTAN FURNITURE KANTOR,17,AKTIVA,ASET,4,Akun,Kontra-aset
18,AKTIVA LAINNYA,10,AKTIVA,ASET,3,Kelompok,
1811,JAMINAN SEWA GUDANG PABRIK,18,AKTIVA,ASET,4,Akun,
1812,APLIKASI ERP,18,AKTIVA,ASET,4,Akun,
2,KEWAJIBAN,,KEWAJIBAN,KEWAJIBAN,1,Kelompok,
20,HUTANG LANCAR,2,KEWAJIBAN,KEWAJIBAN,2,Kelompok,
21,HUTANG USAHA (IDR),20,KEWAJIBAN,KEWAJIBAN,3,Akun,
22,HUTANG BANK,20,KEWAJIBAN,KEWAJIBAN,3,Akun,Belum ada rincian
23,HUTANG PAJAK,20,KEWAJIBAN,KEWAJIBAN,3,Kelompok,
231,PPN KELUARAN,23,KEWAJIBAN,KEWAJIBAN,4,Akun,
232,HUTANG PPN YMH DIBAYAR,23,KEWAJIBAN,KEWAJIBAN,4,Akun,
233,PPh pasal 21 / 26,23,KEWAJIBAN,KEWAJIBAN,4,Akun,
234,PPh pasal 25 / 29,23,KEWAJIBAN,KEWAJIBAN,4,Akun,
235,PPh pasal 4 (2),23,KEWAJIBAN,KEWAJIBAN,4,Akun,
236,PPh pasal 22,23,KEWAJIBAN,KEWAJIBAN,4,Akun,
237,PPh pasal 23,23,KEWAJIBAN,KEWAJIBAN,4,Akun,
24,HUTANG BIAYA / BIAYA OPERASIONAL YANG MASIH HARUS DIBAYAR (YADIB),20,KEWAJIBAN,KEWAJIBAN,3,Kelompok,
241,YADIB - BIAYA PABRIKASI,24,KEWAJIBAN,KEWAJIBAN,4,Akun,
242,YADIB - BIAYA PENJUALAN,24,KEWAJIBAN,KEWAJIBAN,4,Akun,
243,YADIB - BIAYA ADM & UMUM,24,KEWAJIBAN,KEWAJIBAN,4,Akun,
244,YADIB - BIAYA LAIN-2,24,KEWAJIBAN,KEWAJIBAN,4,Akun,
25,PENDAPATAN DITERIMA DIMUKA,20,KEWAJIBAN,KEWAJIBAN,3,Kelompok,
251,UANG MUKA DARI CUSTOMER (PELANGGAN),25,KEWAJIBAN,KEWAJIBAN,4,Akun,
26,HUTANG LEASING,20,KEWAJIBAN,KEWAJIBAN,3,Akun,Belum ada rincian
27,HUTANG LAIN-LAIN,20,KEWAJIBAN,KEWAJIBAN,3,Kelompok,
271,HUTANG KEPADA BPR RHEKSA,27,KEWAJIBAN,KEWAJIBAN,4,Akun,
272,HUTANG KEPADA PEMEGANG SAHAM,27,KEWAJIBAN,KEWAJIBAN,4,Akun,
273,HUTANG DEVIDEN,27,KEWAJIBAN,KEWAJIBAN,4,Akun,
29,HUTANG JANGKA PANJANG,20,KEWAJIBAN,KEWAJIBAN,3,Akun,Belum ada rincian
3,MODAL & EKUITAS,,MODAL,EKUITAS,1,Kelompok,
31,MODAL SAHAM,3,MODAL,EKUITAS,2,Akun,
32,MODAL DISETOR,3,MODAL,EKUITAS,2,Akun,
36,LABA RUGI DITAHAN,3,MODAL,EKUITAS,2,Akun,
37,LABA RUGI TAHUN BERJALAN,3,MODAL,EKUITAS,2,Akun,
39,OPENING BALANCE EQUITY,3,MODAL,EKUITAS,2,Akun,
40,PENDAPATAN,,PENDAPATAN,PENDAPATAN,1,Kelompok,
4101,PENJUALAN SNACK,40,PENDAPATAN,PENDAPATAN,2,Akun,
4201,RETUR PENJUALAN SNACK,40,PENDAPATAN,PENDAPATAN,2,Akun,Kontra-pendapatan (normal debit)
4301,POTONGAN PENJUALAN,40,PENDAPATAN,PENDAPATAN,2,Akun,Kontra-pendapatan (normal debit)
4701,PENJUALAN LAINNYA,40,PENDAPATAN,PENDAPATAN,2,Kelompok,
4701.01,PENJUALAN BAHAN BAKU,4701,PENDAPATAN,PENDAPATAN,3,Akun,
4701.02,PENJUALAN BAHAN PENOLONG,4701,PENDAPATAN,PENDAPATAN,3,Akun,
4701.03,PENJUALAN BUMBU JADI,4701,PENDAPATAN,PENDAPATAN,3,Akun,
50,HARGA POKOK PENJUALAN,,HPP,BEBAN,1,Kelompok,
5101,HARGA POKOK PENJUALAN,50,HPP,BEBAN,2,Akun,
5201,HARGA POKOK PENJUALAN LAINNYA,50,HPP,BEBAN,2,Akun,
5301,RETUR HPP,50,HPP,BEBAN,2,Akun,
5401,BARANG DALAM PROSES,50,HPP,BEBAN,2,Kelompok,
5401.01,BDP AWAL,5401,HPP,BEBAN,3,Akun,
5401.02,BDP AKHIR,5401,HPP,BEBAN,3,Akun,
5501,BARANG JADI,50,HPP,BEBAN,2,Kelompok,
5501.01,BARANG JADI AWAL,5501,HPP,BEBAN,3,Akun,
5501.02,BARANG JADI AKHIR,5501,HPP,BEBAN,3,Akun,
5701,BIAYA PRODUKSI / PABRIKASI,50,HPP,BEBAN,2,Kelompok,
5701.01,BIAYA GAJI TK LANGSUNG,5701,HPP,BEBAN,3,Akun,
5701.02,THR / BONUS TK LANGSUNG,5701,HPP,BEBAN,3,Akun,
5701.03,BPJS TK LANGSUNG,5701,HPP,BEBAN,3,Akun,KODE DOBEL dengan 5701.03 Pemakaian Bahan Baku
5701.04,PENGOBATAN TK LANGSUNG,5701,HPP,BEBAN,3,Akun,
5701.03,PEMAKAIAN BAHAN BAKU / BAHAN PENOLONG,5701,HPP,BEBAN,3,Akun,KODE DOBEL dengan 5701.03 BPJS TK Langsung
5702.01,PEMAKAIAN ELPIJI,5701,HPP,BEBAN,3,Akun,
5703.01,PLN,5701,HPP,BEBAN,3,Akun,
5704.01,PEMAKAIAN SPARE PARTS,5701,HPP,BEBAN,3,Akun,
5705.01,PEMELIHARAAN MESIN-2 PRODUKSI,5701,HPP,BEBAN,3,Akun,
5706.01,BEBAN PRODUKSI LAINNYA,5701,HPP,BEBAN,3,Akun,
5707.01,ONGKOS ANGKUT PEMBELIAN BAHAN,5701,HPP,BEBAN,3,Akun,
5708.01,PENYUSUTAN MESIN-2 PRODUKSI,5701,HPP,BEBAN,3,Akun,
60,BIAYA PENJUALAN & PEMASARAN,,BIAYA PENJUALAN,BEBAN,1,Kelompok,
6101.01,BIAYA GAJI,60,BIAYA PENJUALAN,BEBAN,2,Akun,
6101.02,THR,60,BIAYA PENJUALAN,BEBAN,2,Akun,
6102,BIAYA KOMISI & INSENTIF,60,BIAYA PENJUALAN,BEBAN,2,Kelompok,
6102.01,(NAMA AKUN KOSONG),6102,BIAYA PENJUALAN,BEBAN,3,Akun,Nama kosong - perlu diisi
6102.02,(NAMA AKUN KOSONG),6102,BIAYA PENJUALAN,BEBAN,3,Akun,Nama kosong - perlu diisi
6103,BIAYA ANGKUT,60,BIAYA PENJUALAN,BEBAN,2,Akun,
6104,BIAYA OPERASIONAL,60,BIAYA PENJUALAN,BEBAN,2,Kelompok,
6104.01,BIOPS TEAM SALES,6104,BIAYA PENJUALAN,BEBAN,3,Akun,
6104.02,(NAMA AKUN KOSONG),6104,BIAYA PENJUALAN,BEBAN,3,Akun,Nama kosong - perlu diisi
6105,BIAYA PERJALANAN DINAS (LUAR KOTA),60,BIAYA PENJUALAN,BEBAN,2,Akun,
6106,BIAYA PROMOSI & IKLAN,60,BIAYA PENJUALAN,BEBAN,2,Akun,
6107,BIAYA TELEPON / PULSA HP (SALES),60,BIAYA PENJUALAN,BEBAN,2,Akun,
6108,(NAMA AKUN KOSONG),60,BIAYA PENJUALAN,BEBAN,2,Akun,Nama kosong - perlu diisi
70,BIAYA ADMINISTRASI & UMUM,,BIAYA ADM & UMUM,BEBAN,1,Kelompok,
7101.01,BIAYA GAJI (OFFICE),70,BIAYA ADM & UMUM,BEBAN,2,Akun,
7101.02,THR (OFFICE),70,BIAYA ADM & UMUM,BEBAN,2,Akun,
6200.09,Tunjangan Pengobatan,70,BIAYA ADM & UMUM,BEBAN,2,Akun,
6200.1,Tunjangan Lain-lain,70,BIAYA ADM & UMUM,BEBAN,2,Akun,
6300.01,Biaya Sales & Marketing,70,BIAYA ADM & UMUM,BEBAN,2,Akun,
6300.02,Biaya Sumbangan,70,BIAYA ADM & UMUM,BEBAN,2,Akun,
6300.03,Biaya Pameran Promosi & Iklan,70,BIAYA ADM & UMUM,BEBAN,2,Akun,
6300.04,Biaya Fee & Komisi,70,BIAYA ADM & UMUM,BEBAN,2,Akun,
6300.05,Biaya Sample Barang,70,BIAYA ADM & UMUM,BEBAN,2,Akun,
6400.01,Biaya Bahan Bakar /Toll/ Parkir,70,BIAYA ADM & UMUM,BEBAN,2,Akun,
6400.02,Biaya Ticket & Airport Tax,70,BIAYA ADM & UMUM,BEBAN,2,Akun,
6400.03,Biaya Visa/Paspor,70,BIAYA ADM & UMUM,BEBAN,2,Akun,
6400.04,Biaya Hotel,70,BIAYA ADM & UMUM,BEBAN,2,Akun,
6400.05,Biaya Transpor Lokal,70,BIAYA ADM & UMUM,BEBAN,2,Akun,
6400.06,Biaya Makan & Minum,70,BIAYA ADM & UMUM,BEBAN,2,Akun,
6400.07,Biaya Surat/Pajak Kendaraan,70,BIAYA ADM & UMUM,BEBAN,2,Akun,
6400.08,Biaya Pemeliharaan/Perbaikan Kendaraan,70,BIAYA ADM & UMUM,BEBAN,2,Akun,
6400.09,Biaya Listrik / Air,70,BIAYA ADM & UMUM,BEBAN,2,Akun,
6400.1,Biaya Telepon & Internet,70,BIAYA ADM & UMUM,BEBAN,2,Akun,
6400.11,Biaya Kebersihan & Keamanan Kantor,70,BIAYA ADM & UMUM,BEBAN,2,Akun,
6400.12,Biaya Alat Tulis Kantor,70,BIAYA ADM & UMUM,BEBAN,2,Akun,
6400.13,Biaya Pos/Kurir,70,BIAYA ADM & UMUM,BEBAN,2,Akun,Kemungkinan sama dengan 6400.18
6400.14,Biaya Photocopy Cetak Laminating,70,BIAYA ADM & UMUM,BEBAN,2,Akun,
6400.15,Biaya Perlengkapan Kantor,70,BIAYA ADM & UMUM,BEBAN,2,Akun,
6400.16,Perlengkapan Produksi,70,BIAYA ADM & UMUM,BEBAN,2,Akun,Sebaiknya masuk biaya produksi (5701)
6400.17,Biaya Perbaikan dan Pemeliharaan Kantor,70,BIAYA ADM & UMUM,BEBAN,2,Akun,
6400.18,Biaya Kurir/Pos,70,BIAYA ADM & UMUM,BEBAN,2,Akun,Kemungkinan sama dengan 6400.13
6500.01,Biaya Perizinan,70,BIAYA ADM & UMUM,BEBAN,2,Akun,
6500.02,Biaya Pajak Bumi Bangunan Kantor,70,BIAYA ADM & UMUM,BEBAN,2,Akun,
6500.03,Biaya Sanksi/Denda pajak,70,BIAYA ADM & UMUM,BEBAN,2,Akun,
6500.04,Biaya Notaris/ Konsultan,70,BIAYA ADM & UMUM,BEBAN,2,Akun,
7100.01,Biaya Penyusutan Tanah & Bangunan,70,BIAYA ADM & UMUM,BEBAN,2,Akun,
7100.02,Biaya Penyusutan Kendaraan,70,BIAYA ADM & UMUM,BEBAN,2,Akun,
7100.03,Biaya Penyusutan Mesin,70,BIAYA ADM & UMUM,BEBAN,2,Akun,Sebaiknya masuk biaya produksi (5708.01)
7100.04,Biaya Penyusutan Peralatan Kantor,70,BIAYA ADM & UMUM,BEBAN,2,Akun,
7100.05,Biaya Penyusutan Furniture,70,BIAYA ADM & UMUM,BEBAN,2,Akun,
7200.01,Biaya Bunga Bank,70,BIAYA ADM & UMUM,BEBAN LAINNYA,2,Akun,
7200.02,Biaya Administrasi Bank,70,BIAYA ADM & UMUM,BEBAN LAINNYA,2,Akun,
7200.03,Pajak Bunga,70,BIAYA ADM & UMUM,BEBAN LAINNYA,2,Akun,
7200.04,Biaya Lain-lain,70,BIAYA ADM & UMUM,BEBAN LAINNYA,2,Akun,
8100.01,Pendapat Bunga,,PENDAPATAN LAINNYA,PENDAPATAN LAINNYA,1,Akun,
8100.02,Laba / Rugi Penjualan Aktiva Tetap,,PENDAPATAN LAINNYA,PENDAPATAN LAINNYA,1,Akun,
8100.03,Pendapatan Lain-lain,,PENDAPATAN LAINNYA,PENDAPATAN LAINNYA,1,Akun,
910001,Laba / Rugi Terealisasi,,LAIN-LAIN,BEBAN,1,Akun,Tipe asli di file: Beban - perlu dicek
910002,Laba / Rugi Belum Terealisasi,,LAIN-LAIN,BEBAN,1,Akun,Tipe asli di file: Beban - perlu dicek
999,Barang Dalam Perjalanan,,LAIN-LAIN,ASET,1,Akun,Tipe asli di file: Aktiva Lancar Lainnya`;

const lines = csvData.trim().split('\n');
const header = lines[0].split(',');

// Map known system ID codes
const SYSTEM_CODE_MAP = {
    '111': 'acc_cash',
    '112': 'acc_bank',
    '121': 'acc_ar',
    '151': 'acc_inv_rm',
    '153': 'acc_inv_wip',
    '154': 'acc_inv_fg',
    '21': 'acc_ap',
    '232': 'acc_tax_payable',
    '32': 'acc_equity',
    '4101': 'acc_sales',
    '4201': 'acc_sales_return',
    '5101': 'acc_cogs'
};

const TYPE_MAP = {
    'ASET': 'ASSET',
    'KEWAJIBAN': 'LIABILITY',
    'EKUITAS': 'EQUITY',
    'MODAL': 'EQUITY',
    'PENDAPATAN': 'INCOME',
    'BEBAN': 'EXPENSE',
    'BEBAN LAINNYA': 'EXPENSE',
    'PENDAPATAN LAINNYA': 'INCOME'
};

// First pass: create code to ID mapping
const codeToId = {};

// We can add root groups for 80 and 90 so 8100.xx and 9100xx are neatly under folders
const extraGroups = [
    {
        code: '80',
        name: 'PENDAPATAN LAINNYA',
        parentCode: null,
        type: 'INCOME',
        isGroup: true,
        level: 1,
        status: 'Kelompok',
        description: 'Pendapatan di luar operasional utama'
    },
    {
        code: '90',
        name: 'BEBAN & POS LAIN-LAIN',
        parentCode: null,
        type: 'EXPENSE',
        isGroup: true,
        level: 1,
        status: 'Kelompok',
        description: 'Beban dan pos lain-lain'
    }
];

extraGroups.forEach(g => {
    codeToId[g.code] = 'acc_grp_' + g.code;
});

const rows = [];
let dupCount = {};

for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    
    // Parse CSV line taking commas into account
    // Regex or simple split if no internal comma in values (some notes have commas, but notes is last column)
    const parts = line.split(',');
    const code = parts[0].trim();
    const name = parts[1].trim();
    const parentCode = parts[2].trim() || null;
    const category = parts[3].trim();
    const rawType = parts[4].trim();
    const level = parseInt(parts[5].trim(), 10) || 1;
    const status = parts[6].trim();
    const notes = parts.slice(7).join(',').trim();

    // ID generation
    let id = SYSTEM_CODE_MAP[code];
    if (!id) {
        let cleanCode = code.replace(/[^a-zA-Z0-9]/g, '_');
        if (codeToId[code]) {
            dupCount[code] = (dupCount[code] || 1) + 1;
            id = `acc_${cleanCode}_${dupCount[code]}`;
        } else {
            id = status === 'Kelompok' ? `acc_grp_${cleanCode}` : `acc_${cleanCode}`;
        }
    }
    codeToId[code] = id;

    rows.push({
        code,
        name,
        parentCode,
        category,
        rawType,
        level,
        status,
        notes,
        tempId: id
    });
}

const accounts = [];

// Add extra groups 80 and 90 first
extraGroups.forEach(g => {
    accounts.push({
        id: codeToId[g.code],
        code: g.code,
        name: g.name,
        type: g.type,
        baseType: g.type,
        parentId: null,
        isGroup: true,
        status: 'ACTIVE',
        description: g.description,
        opening_balance: 0
    });
});

rows.forEach(r => {
    let parentId = null;
    if (r.parentCode) {
        parentId = codeToId[r.parentCode] || null;
    } else {
        // Check if level 1 without parent belongs to 80 or 90
        if (r.code.startsWith('8100')) {
            parentId = codeToId['80'];
        } else if (r.code.startsWith('9100') || r.code === '999') {
            parentId = codeToId['90'];
        }
    }

    const type = TYPE_MAP[r.rawType] || 'ASSET';
    const isGroup = r.status.toLowerCase() === 'kelompok';

    accounts.push({
        id: r.tempId,
        code: r.code,
        name: r.name,
        type: type,
        baseType: type,
        parentId: parentId,
        isGroup: isGroup,
        status: 'ACTIVE',
        description: r.notes || '',
        opening_balance: 0
    });
});

console.log(`Parsed ${accounts.length} accounts from CSV.`);
console.log('Sample root accounts:');
console.log(accounts.filter(a => !a.parentId).map(a => `${a.code} - ${a.name}`));

fs.writeFileSync(path.join(__dirname, 'parsed_coa.json'), JSON.stringify(accounts, null, 2));
