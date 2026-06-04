const { StockTransaction } = require('../server/models');
const { Op } = require('sequelize');

async function main() {
    try {
        const txs = await StockTransaction.findAll({
            where: {
                createdAt: {
                    [Op.gte]: new Date('2026-05-26T00:00:00.000Z')
                }
            },
            order: [['createdAt', 'DESC']]
        });
        txs.forEach(t => {
            const d = t.toJSON();
            console.log(`No: ${d.txNo}, Date: ${d.date}, ItemId: ${d.itemId}, Name: ${d.itemName}, Type: ${d.type}, Qty: ${d.qty}, Ref: ${d.reference}, RefId: ${d.referenceId}`);
        });
    } catch (e) {
        console.error(e);
    } finally {
        process.exit();
    }
}
main();
