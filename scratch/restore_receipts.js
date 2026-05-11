
const { Sequelize } = require('sequelize');
const seq = new Sequelize('tanasubur', 'postgres', 'Faisal2807', {
    host: 'localhost',
    port: 5432,
    dialect: 'postgres',
    logging: false
});

async function run() {
    try {
        await seq.authenticate();
        console.log('Connected.');
        
        const [pos] = await seq.query("SELECT id, items, po_number FROM purchase_orders WHERE status IN ('PARTIALLY RECEIVED', 'RECEIVED') AND (receipts IS NULL OR receipts = '[]')");
        
        for (const po of pos) {
            let items = po.items;
            if (typeof items === 'string') items = JSON.parse(items);
            
            const receivedItems = (items || []).filter(i => (i.receivedQty || 0) > 0).map(i => ({
                prodText: i.prodText || i.itemName || 'Item',
                qty: i.receivedQty,
                unit: i.unit || '',
                price: i.price || 0
            }));
            
            if (receivedItems.length > 0) {
                const dummyReceipt = [{
                    id: 'REC-' + Date.now(),
                    date: new Date().toISOString().split('T')[0],
                    npbNumber: 'NPB-RESTORED-' + po.po_number,
                    npb: 'NPB-RESTORED-' + po.po_number,
                    notes: 'Auto-restored receipt data',
                    items: receivedItems
                }];
                
                console.log(`Restoring receipts for ${po.po_number}...`);
                await seq.query('UPDATE purchase_orders SET receipts = :receipts WHERE id = :id', {
                    replacements: {
                        receipts: JSON.stringify(dummyReceipt),
                        id: po.id
                    }
                });
            }
        }
        console.log('Finished.');
        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}

run();
