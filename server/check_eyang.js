require('dotenv').config();
const { Op } = require('sequelize');
const { sequelize, InventoryItem, StockTransaction } = require('./models');

async function check() {
    try {
        const items = await InventoryItem.findAll({
            where: { itemName: { [Op.iLike]: '%eyang tani%' } },
            raw: true
        });
        console.log("=== ITEMS ===");
        console.log(items.map(i => `${i.id} | ${i.itemName} | ${i.category} | ${i.status}`).join('\n'));
        
        const txs = await StockTransaction.findAll({
            where: { itemName: { [Op.iLike]: '%eyang tani%' } },
            raw: true
        });
        console.log("=== TRANSACTIONS ===");
        console.log(txs.map(t => `${t.itemId} | ${t.itemName} | qty: ${t.qty} | loc: ${t.location}`).join('\n'));
    } catch (e) {
        console.error("Error:", e);
    } finally {
        process.exit(0);
    }
}
check();
