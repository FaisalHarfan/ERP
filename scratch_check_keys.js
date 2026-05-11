const { InventoryItem } = require('./server/models');

async function checkKeys() {
    try {
        const items = await InventoryItem.findAll();
        items.forEach(i => {
            const data = i.toJSON();
            if (data.item_name && data.item_name.includes('Tani')) {
                console.log(`Item: ${data.item_name} | Keys: ${Object.keys(data).join(', ')}`);
            } else if (data.itemName && data.itemName.includes('Tani')) {
                console.log(`Item: ${data.itemName} | Keys: ${Object.keys(data).join(', ')}`);
            }
        });

    } catch (error) {
        console.error('Error:', error);
    } finally {
        process.exit();
    }
}

checkKeys();
