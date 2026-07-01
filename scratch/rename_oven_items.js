const { InventoryItem } = require('../server/models');

async function renameItems() {
    try {
        const items = await InventoryItem.findAll({
            where: {
                category: ['OVEN_BASAH_STOCK', 'OVEN_KERING_STOCK']
            }
        });

        console.log(`Found ${items.length} oven items to process.`);
        let updated = 0;

        for (const item of items) {
            const oldName = item.itemName;
            // Remove " (Oven Basah)" or " (Oven Kering)" or "(Oven Basah)" or "(Oven Kering)"
            let newName = oldName
                .replace(/\s*\(Oven Basah\)/gi, '')
                .replace(/\s*\(Oven Kering\)/gi, '')
                .trim();

            if (newName !== oldName) {
                await item.update({ itemName: newName });
                console.log(`- Renamed: "${oldName}" -> "${newName}"`);
                updated++;
            }
        }

        console.log(`\nSuccessfully renamed ${updated} items.`);

    } catch (e) {
        console.error('Error:', e);
    } finally {
        process.exit();
    }
}

renameItems();
