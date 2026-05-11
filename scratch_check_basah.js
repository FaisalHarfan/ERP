const { InventoryItem } = require('./server/models');

async function checkBasah() {
    try {
        const allItems = await InventoryItem.findAll();
        console.log('All "Tani" items found:');
        allItems.forEach(i => {
            const data = i.toJSON();
            if ((data.item_name && data.item_name.includes('Tani')) || (data.itemName && data.itemName.includes('Tani'))) {
                console.log(`- ${data.item_name || data.itemName} (${data.item_code || data.itemCode}) - Category: ${data.category}`);
            }
        });

    } catch (error) {
        console.error('Error:', error);
    } finally {
        process.exit();
    }
}

checkBasah();
