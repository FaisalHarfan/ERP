const acorn = require('acorn');
const fs = require('fs');
try {
    acorn.parse(fs.readFileSync('html-app/finance.js', 'utf8'), {ecmaVersion: 2020});
    console.log('OK');
} catch (e) {
    if (e.loc) {
        console.error('Parse error:', e.message, 'at line:', e.loc.line, 'col:', e.loc.column);
    } else {
        console.error('Parse error:', e);
    }
}
