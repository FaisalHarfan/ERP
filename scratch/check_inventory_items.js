const { InventoryItem } = require('../server/models');

async function checkItems() {
    try {
        const items = await InventoryItem.findAll();
        console.log('Total items in DB:', items.length);
        const categories = {};
        items.forEach(i => {
            const cat = i.category;
            categories[cat] = (categories[cat] || 0) + 1;
        });
        console.log('Categories count:', categories);
        
        console.log('\nOven Basah / Oven Kering items:');
        items.forEach(i => {
            if (i.category === 'OVEN_BASAH_STOCK' || i.category === 'OVEN_KERING_STOCK') {
                console.log(`- [${i.category}] Code: ${i.itemCode} | Name: ${i.itemName}`);
            }
        });
    } catch (e) {
        console.error('Error:', e);
    } finally {
        process.exit();
    }
}

checkItems();
