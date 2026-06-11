const models = require('../server/models');
(async () => {
    try {
        const id = '1780971124728yh93d';
        console.log("Fetching Delivery Order with ID:", id);
        const record = await models.DeliveryOrder.findByPk(id);
        if (!record) {
            console.error("Delivery Order not found");
            process.exit(1);
        }
        console.log("Current status:", record.status);
        console.log("Attempting to update status to CANCELLED...");
        await record.update({ status: 'CANCELLED' });
        console.log("Successfully updated! New status:", record.status);
    } catch (e) {
        console.error("Error updating Delivery Order:", e);
    }
    process.exit(0);
})();
