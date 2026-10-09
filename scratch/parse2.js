const acorn = require('acorn');
const fs = require('fs');
const code = fs.readFileSync('html-app/finance.js', 'utf8');
try {
    for (let i = 1; i <= code.length; i++) {
        try {
            acorn.parse(code.substring(0, i), {ecmaVersion: 2020});
        } catch (e) {
            if (e.message.includes('Unexpected token') && i === code.length) {
                // Ignore unexpected EOF if it's the last char
            } else if (!e.message.includes('Unexpected token')) {
                // If it's something else like "Unterminated template literal"
                console.log('Error at substring length', i, ':', e.message);
            }
        }
    }
} catch (e) {
    console.log("fatal", e);
}
