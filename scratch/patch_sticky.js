const fs = require('fs');

let css = fs.readFileSync('static/style.css', 'utf8');

if (!css.includes('.data-table thead th')) {
    css += `\n
/* Unified table styles to ensure headers are perfectly sticky */
.data-table thead {
    position: sticky !important;
    top: 0 !important;
    z-index: 10 !important;
}
.data-table thead th {
    position: sticky !important;
    top: 0 !important;
    background: var(--bg-color, #11141a) !important;
    z-index: 10 !important;
    box-shadow: 0 1px 0 var(--panel-border) !important;
}
`;
    fs.writeFileSync('static/style.css', css);
}

// Remove the inline static !important from index.html
let html = fs.readFileSync('static/index.html', 'utf8');
html = html.replace(/styleStr \+= '#wf-out-rvc-table thead \{ position: static !important; \}';/g, '');
html = html.replace(/v230_forced/g, 'v231_sticky');
fs.writeFileSync('static/index.html', html);
console.log('patched');
