const { Account } = require('../server/models');

async function clearCOANames() {
    try {
        const accounts = await Account.findAll();
        console.log(`Found ${accounts.length} accounts in DB.`);
        
        for (const acc of accounts) {
            const oldName = acc.name;
            await acc.update({ name: '' });
            console.log(`- Cleared name for code: ${acc.code} (was "${oldName}")`);
        }
        
        console.log('\nSuccessfully cleared names of all accounts.');

    } catch (e) {
        console.error('Error:', e);
    } finally {
        process.exit();
    }
}

clearCOANames();
