import os
import re

SCRIPT_FILE = 'static/script.js'

with open(SCRIPT_FILE, 'r', encoding='utf-8') as f:
    js = f.read()

# 1. Add sortTable logic at the end of the file
sort_logic = """
// ==================== TABLE SORTING ====================
window.tableSortStates = {};

window.sortTable = function(thElement, event, colIndex) {
    const table = thElement.closest('table');
    const tableId = table.getAttribute('data-table-id') || 'default_table';
    const tbody = table.querySelector('tbody');
    const headers = Array.from(table.querySelectorAll('th'));
    
    if (!window.tableSortStates[tableId]) {
        window.tableSortStates[tableId] = [];
    }
    let sorts = window.tableSortStates[tableId];
    
    let existingIdx = sorts.findIndex(s => s.colIndex === colIndex);
    
    if (!event.shiftKey) {
        if (existingIdx >= 0) {
            const currentDir = sorts[existingIdx].dir;
            sorts = [{ colIndex: colIndex, dir: currentDir === 'asc' ? 'desc' : 'asc' }];
        } else {
            sorts = [{ colIndex: colIndex, dir: 'asc' }];
        }
    } else {
        if (existingIdx >= 0) {
            sorts[existingIdx].dir = sorts[existingIdx].dir === 'asc' ? 'desc' : 'asc';
        } else {
            sorts.push({ colIndex: colIndex, dir: 'asc' });
        }
    }
    window.tableSortStates[tableId] = sorts;
    
    headers.forEach((th, idx) => {
        let text = th.getAttribute('data-original-text');
        if (!text) {
            text = th.innerText.replace(/ [▲▼][\d]*$/, '');
            th.setAttribute('data-original-text', text);
        }
        
        let sortInfo = sorts.findIndex(s => s.colIndex === idx);
        if (sortInfo >= 0) {
            let s = sorts[sortInfo];
            let arrow = s.dir === 'asc' ? '▲' : '▼';
            let priority = sorts.length > 1 ? (sortInfo + 1) : '';
            th.innerText = `${text} ${arrow}${priority}`;
            th.style.color = 'var(--accent)';
        } else {
            th.innerText = text;
            th.style.color = '';
        }
    });
    
    let rows = Array.from(tbody.querySelectorAll('tr'));
    rows.sort((a, b) => {
        for (let s of sorts) {
            let cellA = a.children[s.colIndex].innerText.trim();
            let cellB = b.children[s.colIndex].innerText.trim();
            
            let numA = parseFloat(cellA);
            let numB = parseFloat(cellB);
            
            let cmp = 0;
            if (!isNaN(numA) && !isNaN(numB) && cellA === numA.toString()) {
                cmp = numA - numB;
            } else {
                cmp = cellA.localeCompare(cellB);
            }
            
            if (cmp !== 0) {
                return s.dir === 'asc' ? cmp : -cmp;
            }
        }
        return 0;
    });
    
    rows.forEach(r => tbody.appendChild(r));
};
"""

if "window.sortTable = function" not in js:
    js += sort_logic

# 2. Fix Check Perms Table
perms_table_old = """            <table style="width: 100%; border-collapse: collapse; font-size: 0.75rem; text-align: left;">
                <thead style="background: var(--bg-color); position: sticky; top: 0; z-index: 5;">
                    <tr>
                        <th style="padding: 8px 12px; border-bottom: 1px solid var(--panel-border); font-weight: 600;">Feature Name</th>
                        <th style="padding: 8px 12px; border-bottom: 1px solid var(--panel-border); font-weight: 600;">State</th>
                        <th style="padding: 8px 12px; border-bottom: 1px solid var(--panel-border); font-weight: 600;">Extended State</th>
                    </tr>
                </thead>
                <tbody>${rowsHtml}</tbody>
            </table>"""

perms_table_new = """            <table data-table-id="perms" style="width: 100%; border-collapse: collapse; font-size: 0.75rem; text-align: left;">
                <thead>
                    <tr>
                        <th onclick="window.sortTable(this, event, 0)" style="background: #11141a; position: sticky; top: 0; z-index: 5; padding: 8px 12px; border-bottom: 1px solid var(--panel-border); font-weight: 600; cursor: pointer; user-select: none; transition: background 0.2s;" onmouseover="this.style.background='#1e222d'" onmouseout="this.style.background='#11141a'">Feature Name</th>
                        <th onclick="window.sortTable(this, event, 1)" style="background: #11141a; position: sticky; top: 0; z-index: 5; padding: 8px 12px; border-bottom: 1px solid var(--panel-border); font-weight: 600; cursor: pointer; user-select: none; transition: background 0.2s;" onmouseover="this.style.background='#1e222d'" onmouseout="this.style.background='#11141a'">State</th>
                        <th onclick="window.sortTable(this, event, 2)" style="background: #11141a; position: sticky; top: 0; z-index: 5; padding: 8px 12px; border-bottom: 1px solid var(--panel-border); font-weight: 600; cursor: pointer; user-select: none; transition: background 0.2s;" onmouseover="this.style.background='#1e222d'" onmouseout="this.style.background='#11141a'">Extended State</th>
                    </tr>
                </thead>
                <tbody>${rowsHtml}</tbody>
            </table>"""

if perms_table_old in js:
    js = js.replace(perms_table_old, perms_table_new)
else:
    # Use regex if exact match fails
    js = re.sub(
        r'<table style="width: 100%; border-collapse: collapse; font-size: 0\.75rem; text-align: left;">\s*<thead.*?>\s*<tr>\s*<th.*?>Feature Name</th>\s*<th.*?>State</th>\s*<th.*?>Extended State</th>\s*</tr>\s*</thead>\s*<tbody>\$\{rowsHtml\}</tbody>\s*</table>',
        perms_table_new.strip(),
        js,
        flags=re.DOTALL
    )

# 3. Fix RVC Table
rvc_table_old = """            <table style="width: 100%; border-collapse: collapse; font-size: 0.75rem; text-align: left;">
                <thead style="background: var(--bg-color); position: sticky; top: 0; z-index: 5;">
                    <tr>
                        <th style="padding: 8px 12px; border-bottom: 1px solid var(--panel-border); font-weight: 600;">Time Window</th>
                        <th style="padding: 8px 12px; border-bottom: 1px solid var(--panel-border); font-weight: 600;">User Info</th>
                        <th style="padding: 8px 12px; border-bottom: 1px solid var(--panel-border); font-weight: 600;">Client IPs</th>
                    </tr>
                </thead>
                <tbody>${rowsHtml}</tbody>
            </table>"""

rvc_table_new = """            <table data-table-id="rvc" style="width: 100%; border-collapse: collapse; font-size: 0.75rem; text-align: left;">
                <thead>
                    <tr>
                        <th onclick="window.sortTable(this, event, 0)" style="background: #11141a; position: sticky; top: 0; z-index: 5; padding: 8px 12px; border-bottom: 1px solid var(--panel-border); font-weight: 600; cursor: pointer; user-select: none; transition: background 0.2s;" onmouseover="this.style.background='#1e222d'" onmouseout="this.style.background='#11141a'">Time Window</th>
                        <th onclick="window.sortTable(this, event, 1)" style="background: #11141a; position: sticky; top: 0; z-index: 5; padding: 8px 12px; border-bottom: 1px solid var(--panel-border); font-weight: 600; cursor: pointer; user-select: none; transition: background 0.2s;" onmouseover="this.style.background='#1e222d'" onmouseout="this.style.background='#11141a'">User Info</th>
                        <th onclick="window.sortTable(this, event, 2)" style="background: #11141a; position: sticky; top: 0; z-index: 5; padding: 8px 12px; border-bottom: 1px solid var(--panel-border); font-weight: 600; cursor: pointer; user-select: none; transition: background 0.2s;" onmouseover="this.style.background='#1e222d'" onmouseout="this.style.background='#11141a'">Client IPs</th>
                    </tr>
                </thead>
                <tbody>${rowsHtml}</tbody>
            </table>"""

if rvc_table_old in js:
    js = js.replace(rvc_table_old, rvc_table_new)
else:
    js = re.sub(
        r'<table style="width: 100%; border-collapse: collapse; font-size: 0\.75rem; text-align: left;">\s*<thead.*?>\s*<tr>\s*<th.*?>Time Window</th>\s*<th.*?>User Info</th>\s*<th.*?>Client IPs</th>\s*</tr>\s*</thead>\s*<tbody>\$\{rowsHtml\}</tbody>\s*</table>',
        rvc_table_new.strip(),
        js,
        flags=re.DOTALL
    )

with open(SCRIPT_FILE, 'w', encoding='utf-8') as f:
    f.write(js)

print("Sorting added and headers patched!")
