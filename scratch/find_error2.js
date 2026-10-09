const fs = require('fs');
const acorn = require('acorn');
const code = fs.readFileSync('html-app/finance.js', 'utf8');

let braceStack = [];
let tokens = Array.from(acorn.tokenizer(code, {ecmaVersion: 2020, locations: true}));
let unmatched = [];

for (let i = 0; i < tokens.length; i++) {
    let t = tokens[i];
    if (t.type.label === '{') {
        braceStack.push({type: '{', loc: t.loc, start: t.start});
    } else if (t.type.label === '}') {
        if (braceStack.length > 0 && braceStack[braceStack.length - 1].type === '{') {
            braceStack.pop();
        } else {
            unmatched.push("Unmatched } at line " + t.loc.start.line);
        }
    } else if (t.type.label === '(') {
        braceStack.push({type: '(', loc: t.loc, start: t.start});
    } else if (t.type.label === ')') {
        if (braceStack.length > 0 && braceStack[braceStack.length - 1].type === '(') {
            braceStack.pop();
        } else {
            unmatched.push("Unmatched ) at line " + t.loc.start.line);
        }
    }
}

if (unmatched.length > 0) {
    console.log(unmatched.slice(0, 10).join('\n'));
}

if (braceStack.length > 0) {
    console.log("Unclosed tokens:");
    for (let b of braceStack) {
        console.log("  " + b.type + " at line " + b.loc.start.line);
    }
} else {
    console.log("All structural braces are matched!");
}
