const fs = require('fs');
const acorn = require('acorn');
const code = fs.readFileSync('html-app/finance.js', 'utf8');

let low = 0;
let high = code.length;
let lastError = null;

// Find the first prefix of the code that fails with something OTHER than "Unexpected token" at the end.
// Actually, if a brace is missing, acorn will ALWAYS fail at the very end of the file because it keeps parsing hoping to find the closing brace.
// So we must find where the UNCLOSED block STARTS.

// Let's use Acorn's tokenizer to count structural braces.
let depth = 0;
let braceStack = [];
let tokens = Array.from(acorn.tokenizer(code, {ecmaVersion: 2020}));

for (let i = 0; i < tokens.length; i++) {
    let t = tokens[i];
    if (t.type.label === '{') {
        braceStack.push({type: '{', loc: t.loc, start: t.start});
    } else if (t.type.label === '}') {
        if (braceStack.length > 0 && braceStack[braceStack.length - 1].type === '{') {
            braceStack.pop();
        } else {
            console.log("Unmatched } at", t.loc);
        }
    } else if (t.type.label === '(') {
        braceStack.push({type: '(', loc: t.loc, start: t.start});
    } else if (t.type.label === ')') {
        if (braceStack.length > 0 && braceStack[braceStack.length - 1].type === '(') {
            braceStack.pop();
        } else {
            console.log("Unmatched ) at", t.loc);
        }
    }
}

if (braceStack.length > 0) {
    console.log("Unclosed tokens:");
    for (let b of braceStack) {
        let line = code.substring(0, b.start).split('\n').length;
        console.log("  " + b.type + " at line " + line);
    }
} else {
    console.log("All structural braces are matched!");
}
