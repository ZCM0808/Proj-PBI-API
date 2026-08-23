const jsdom = require("jsdom");
const { JSDOM } = jsdom;
const fs = require("fs");

const dom = new JSDOM(`<!DOCTYPE html><html><body><div id="container"></div></body></html>`, { runScripts: "dangerously" });
const window = dom.window;
const document = window.document;

// Mock window.getSelection
window.getSelection = () => ({ removeAllRanges: () => {} });

// Load script.js
const scriptCode = fs.readFileSync("static/script.js", "utf-8");

// Mock UI elements needed by script.js initial execution
document.body.innerHTML = `
<div id="api-tree"></div>
<div id="total-api-count"></div>
<div id="selected-api-info"></div>
<div id="selected-api-name"></div>
<div id="selected-api-zh"></div>
<div id="selected-api-desc"></div>
<div id="wf-out-body"></div>
`;

try {
    window.eval(scriptCode);
} catch (e) {
    console.error("Script Eval Error:", e);
}

// Now test table sorting
const table = document.createElement('table');
table.setAttribute('data-table-id', 'test_table');
const thead = document.createElement('thead');
const trHead = document.createElement('tr');

const col0 = document.createElement('th');
col0.textContent = "ID";
const span0 = document.createElement('span');
span0.textContent = "ID";
col0.innerHTML = ''; col0.appendChild(span0);

const col1 = document.createElement('th');
col1.textContent = "Name";
const span1 = document.createElement('span');
span1.textContent = "Name";
col1.innerHTML = ''; col1.appendChild(span1);

trHead.appendChild(col0);
trHead.appendChild(col1);
thead.appendChild(trHead);
table.appendChild(thead);

const tbody = document.createElement('tbody');
for (let i = 0; i < 3; i++) {
    const tr = document.createElement('tr');
    const td0 = document.createElement('td'); td0.textContent = String(3 - i); // 3, 2, 1
    const td1 = document.createElement('td'); td1.textContent = "Name " + (3 - i);
    tr.appendChild(td0);
    tr.appendChild(td1);
    tbody.appendChild(tr);
}
table.appendChild(tbody);
document.body.appendChild(table);

console.log("Before sort:");
Array.from(tbody.querySelectorAll('tr')).forEach(tr => {
    console.log(tr.children[0].textContent, tr.children[1].textContent);
});

// Call sort
console.log("--- Clicking Col 0 ---");
try {
    window.sortTable(col0, { shiftKey: false }, 0);
} catch (e) {
    console.error("Sort Error:", e);
}

console.log("After sort:");
Array.from(tbody.querySelectorAll('tr')).forEach(tr => {
    console.log(tr.children[0].textContent, tr.children[1].textContent);
});

console.log("Col0 Header innerText:", col0.innerText || col0.textContent);

