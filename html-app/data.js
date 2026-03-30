// data.js - Seed data for initial run

const seedData = () => {
    // Check if products already exist, if so skip seeding
    const unitsData = db.read('units');
    if (unitsData.length > 0) return;

    console.log("Seeding initial data...");

    // 1. Seed Units
    const units = [
        { code: 'KG', name: 'Kilogram' },
        { code: 'GR', name: 'Gram' },
        { code: 'L', name: 'Liter' },
        { code: 'PCS', name: 'Pieces' },
        { code: 'BOX', name: 'Box' }
    ];

    units.forEach(u => db.insert('units', u));

    // 2. Seed Customers
    const customers = [
        { name: 'Toko Sejahtera', phone: '#1b91f023456789', address: 'Jl. Merdeka No. 10, Jakarta' },
        { name: 'Catering Berkah', phone: '087766554433', address: 'Komp. Graha Asri Blok B5, Bekasi' },
        { name: 'IndoFood Sukses', phone: '021-555666', address: 'Kawasan Industri Jababeka, Cikarang' }
    ];

    customers.forEach(c => db.insert('customers', c));

    // 3. Seed Accounts
    const accounts = [
        { code: '1101', name: 'Kas Kecil', type: 'ASSET' },
        { code: '1102', name: 'Bank BCA', type: 'ASSET' },
        { code: '4101', name: 'Pendapatan Penjualan', type: 'INCOME' },
        { code: '5101', name: 'Beban Operasional', type: 'EXPENSE' },
        { code: '5102', name: 'Beban Gaji', type: 'EXPENSE' }
    ];

    accounts.forEach(a => db.insert('accounts', a));

    console.log("Seeding completed.");
};

// Hook Reset button
document.addEventListener('DOMContentLoaded', () => {
    // Run seed
    seedData();

    // Reset button logic
    const resetBtn = document.getElementById('resetDataBtn');
    if (resetBtn) {
        resetBtn.addEventListener('click', () => {
            if (confirm("Anda yakin ingin mereset seluruh database? Semua transaksi akan hilang!")) {
                db.resetAll();
                seedData(); // re-seed
                alert("Database berhasil direset ke state awal.");
                window.location.reload();
            }
        });
    }
});
