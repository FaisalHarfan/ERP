const { InventoryItem } = require('./server/models');

async function checkExact() {
    try {
        const items = await InventoryItem.findAll();
        console.log('Exact data for items with "Tani":');
        items.forEach(i => {
            const data = i.toJSON();
            if (data.item_name && data.item_name.includes('Tani')) {
                console.log(`- ID: [${data.id}] | Name: [${data.item_name}] | Cat: [${data.category}] | Status: [${data.status}]`);
            }
        });

    } catch (error) {
        console.error('Error:', error);
    } finally {
        process.exit();
    }
}

checkExact();
