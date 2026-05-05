// data.js - Seed data for initial run

const seedData = () => {
    // Disabled as per user request - use system UI for manual entry
    return;
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

    // 4. Seed Inventory Items for Sales Demo
    const items = [
        { itemCode: 'FG-001', itemName: 'Sambal Terasi 250g', category: 'FINISHED_GOODS', unit: 'PCS', basePrice: 25000, status: 'ACTIVE' },
        { itemCode: 'FG-002', itemName: 'Kecap Manis 500ml', category: 'FINISHED_GOODS', unit: 'PCS', basePrice: 18000, status: 'ACTIVE' },
        { itemCode: 'FG-003', itemName: 'Garam Industri', category: 'FINISHED_GOODS', unit: 'KG', basePrice: 5000, status: 'ACTIVE' }
    ];
    items.forEach(i => db.insert('inventoryItems', i));

    // 5. Seed sales orders for dashboard trend visual
    const custs = db.read('customers');
    const products = db.read('inventoryItems');
    if (custs.length > 0 && products.length > 0) {
        const curYear = new Date().getFullYear();
        // Seed some history orders
        for (let m = 0; m < 5; m++) {
            const date = new Date(curYear, m, 15).toISOString();
            db.insert('salesOrders', {
                soNumber: `SO-${curYear}-00${m+1}`,
                customerId: custs[m % custs.length].id,
                date: date,
                totalAmount: 1500000 + (m * 200000),
                status: 'CONFIRMED',
                items: [{ itemId: products[0].id, itemName: products[0].itemName, qty: 10, price: 25000, subtotal: 250000 }]
            });
        }
        // Seed some invoices
        db.insert('salesInvoices', {
            invNumber: `INV-${curYear}-001`,
            customerId: custs[0].id,
            date: new Date().toISOString(),
            totalAmount: 5000000,
            status: 'UNPAID'
        });
    }

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
