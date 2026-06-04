const { InventoryItem } = require('../server/models');

async function main() {
    try {
        const items = await InventoryItem.findAll();
        console.log(JSON.stringify(items.map(i => i.toJSON()), null, 2));
    } catch (e) {
        console.error(e);
    } finally {
        process.exit();
    }
}
main();
