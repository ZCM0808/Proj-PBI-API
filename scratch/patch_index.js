const fs = require('fs');
let html = fs.readFileSync('static/index.html', 'utf8');
html = html.replace(/script\.js\?v=.*?\"/g, 'script.js?v=20260813_v232"');
html = html.replace(/style\.css\?v=.*?\"/g, 'style.css?v=20260813_v232"');
fs.writeFileSync('static/index.html', html);
console.log('index patched');
