const fs = require('fs');
const code = fs.readFileSync('html-app/finance.js', 'utf8');

// A very simple brace counter that ignores comments and strings
let cleanCode = code
    .replace(/\/\*[\s\S]*?\*\//g, '') // remove block comments
    .replace(/\/\/.*/g, '') // remove line comments
    .replace(/`(?:\\.|[^`\\])*`/g, '') // remove template literals
    .replace(/'(?:\\.|[^'\\])*'/g, '') // remove single quotes
    .replace(/"(?:\\.|[^"\\])*"/g, ''); // remove double quotes

let lines = cleanCode.split('\n');
let originalLines = code.split('\n');
let depth = 0;
let lastUnclosedLine = -1;
let history = [];

for(let i = 0; i < lines.length; i++) {
    for(let j = 0; j < lines[i].length; j++) {
        if(lines[i][j] === '{') {
            depth++;
            history.push(i + 1);
        } else if(lines[i][j] === '}') {
            depth--;
            history.pop();
        }
    }
}

console.log('Final depth:', depth);
if(depth > 0) {
    console.log('Unclosed braces opened at lines:', history.slice(-5));
} else if (depth < 0) {
    console.log('Too many closing braces');
}
