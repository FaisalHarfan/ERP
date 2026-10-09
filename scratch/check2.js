const fs = require('fs');
const code = fs.readFileSync('html-app/finance.js', 'utf8');

// Strip comments and strings safely by using a simple tokenizer
let tokens = [];
let i = 0;
while (i < code.length) {
    if (code.slice(i, i+2) === '//') {
        while (i < code.length && code[i] !== '\n') i++;
    } else if (code.slice(i, i+2) === '/*') {
        i += 2;
        while (i < code.length && code.slice(i, i+2) !== '*/') i++;
        i += 2;
    } else if (code[i] === "'" || code[i] === '"' || code[i] === '`') {
        let quote = code[i];
        i++;
        while (i < code.length) {
            if (code[i] === '\\') i += 2;
            else if (code[i] === quote) { i++; break; }
            else if (quote === '`' && code.slice(i, i+2) === '${') {
                // Nested template literal expression
                tokens.push('{');
                i += 2;
                // Note: this simple tokenizer doesn't handle nested template literals perfectly,
                // but let's just push the { so it balances with the } inside the expression
            }
            else i++;
        }
    } else {
        if (code[i] === '{' || code[i] === '}') {
            tokens.push({char: code[i], pos: i});
        }
        i++;
    }
}

let depth = 0;
let history = [];
for (let t of tokens) {
    if (t.char === '{') {
        depth++;
        history.push(t.pos);
    } else {
        depth--;
        history.pop();
    }
}

console.log('Final depth:', depth);
if (depth > 0) {
    history.forEach(pos => {
        let line = code.substring(0, pos).split('\n').length;
        console.log('Unclosed { at line', line);
    });
}
