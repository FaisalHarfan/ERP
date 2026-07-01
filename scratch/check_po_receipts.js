const { PurchaseOrder } = require('../server/models');

async function checkPOs() {
    try {
        const pos = await PurchaseOrder.findAll();
        console.log('PO Receipts Status:');
        pos.forEach(p => {
            const data = p.toJSON();
            const receipts = data.receipts || [];
            console.log(`- PO: ${data.po_number || data.poNumber} | Status: ${data.status} | Receipts Count: ${receipts.length}`);
            if (receipts.length > 0) {
                console.log('  Receipts:', JSON.stringify(receipts, null, 2));
            }
        });
    } catch (error) {
        console.error('Error:', error);
    } finally {
        process.exit();
    }
}

checkPOs();
