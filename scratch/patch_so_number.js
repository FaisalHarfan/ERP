const fs = require('fs');

let code = fs.readFileSync('html-app/app.js', 'utf8');

// Normalize CRLF → LF for easier search
const codeNorm = code.replace(/\r\n/g, '\n');

// Find the function and replace just the critical logic lines
// Old: only check year+month and only same type
// New: check only year, count both A and B

const oldLogic = `    let maxSeq = 0;\n    sos.forEach(s => {\n        if (!s.soNumber) return;\n        const mainParts = s.soNumber.split('/');\n        if (mainParts.length < 3) return;\n        \n        // Check if month and year match (romanMonth and year string)\n        if (mainParts[1] === romanMonth && mainParts[2] === String(year)) {\n            const prefixParts = mainParts[0].split('-');\n            if (prefixParts.length >= 3 && prefixParts[1] === type) {\n                const seq = parseInt(prefixParts[2]);\n                if (!isNaN(seq) && seq > maxSeq) maxSeq = seq;\n            }\n        }\n    });`;

const newLogic = `    // Shared counter: A dan B pakai urutan yang sama, reset per tahun (bukan per bulan)\n    let maxSeq = 0;\n    sos.forEach(s => {\n        if (!s.soNumber) return;\n        const mainParts = s.soNumber.split('/');\n        if (mainParts.length < 3) return;\n        \n        // Cek hanya tahun -- urutan berjalan terus sepanjang tahun\n        if (mainParts[2] === String(year)) {\n            const prefixParts = mainParts[0].split('-');\n            // Hitung semua SO tahun ini, baik A maupun B\n            if (prefixParts.length >= 3 && (prefixParts[1] === 'A' || prefixParts[1] === 'B')) {\n                const seq = parseInt(prefixParts[2]);\n                if (!isNaN(seq) && seq > maxSeq) maxSeq = seq;\n            }\n        }\n    });`;

if (!codeNorm.includes(oldLogic)) {
    console.error('ERROR: Target logic not found in app.js!');
    console.error('Looking for:');
    console.error(oldLogic);
    process.exit(1);
}

const result = codeNorm.replace(oldLogic, newLogic);

// Restore CRLF line endings
fs.writeFileSync('html-app/app.js', result.replace(/\n/g, '\r\n'), 'utf8');
console.log('SUCCESS: generateSONumber patched to shared yearly sequence!');
