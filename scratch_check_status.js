const { InventoryItem } = require('./server/models');

async function checkStatus() {
    try {
        const items = await InventoryItem.findAll({
            where: {
                item_name: ['Bapak Tani (Oven Basah)', 'Ibu Tani (Oven Basah)']
            }
        });
        console.log('Status of Tani items:');
        items.forEach(i => {
            const data = i.toJSON();
            console.log(`- ${data.item_name} (${data.item_code}) - Category: ${data.category} - Status: ${data.status}`);
        });

    } catch (error) {
        console.error('Error:', error);
    } finally {
        process.exit();
    }
}

checkStatus();
