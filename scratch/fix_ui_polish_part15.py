import os
import re

SCRIPT_FILE = 'static/script.js'

with open(SCRIPT_FILE, 'r', encoding='utf-8') as f:
    js = f.read()

# 1. Fix RVC Table styling (Remove green box and fix border-collapse)
rvc_pattern = re.compile(r'tableContainer\.innerHTML = `.*?<table data-table-id="rvc".*?</table>`;', re.DOTALL)
new_rvc_table = """tableContainer.innerHTML = `
    <table data-table-id="rvc" style="width: 100%; border-collapse: separate; border-spacing: 0; font-size: 0.75rem; text-align: left; display: none;">
        <thead>
            <tr>
                <th onclick="window.sortTable(this, event, 0)" style="background: #11141a; position: sticky; top: 0; z-index: 5; padding: 8px 12px; border-bottom: 1px solid var(--panel-border); font-weight: 600; cursor: pointer; user-select: none; transition: background 0.2s;" onmouseover="this.style.background='#1e222d'" onmouseout="this.style.background='#11141a'">Date</th>
                <th onclick="window.sortTable(this, event, 1)" style="background: #11141a; position: sticky; top: 0; z-index: 5; padding: 8px 12px; border-bottom: 1px solid var(--panel-border); font-weight: 600; cursor: pointer; user-select: none; transition: background 0.2s;" onmouseover="this.style.background='#1e222d'" onmouseout="this.style.background='#11141a'">View Count</th>
            </tr>
        </thead>
        <tbody id="rvc-dynamic-tbody"></tbody>
    </table>`;"""
js = rvc_pattern.sub(new_rvc_table, js)

# 2. Fix RVC Row styling (Remove green box)
rvc_row_pattern = re.compile(r'rowsHtml \+= `\s*<tr.*?</tr>\s*`;', re.DOTALL)
new_rvc_row = """rowsHtml += `
                <tr style="transition: background 0.2s;" onmouseover="this.style.background='var(--overlay-10)'" onmouseout="this.style.background='transparent'">
                    <td style="padding: 6px 12px; color: var(--text-primary); font-family: monospace; border-bottom: 1px solid var(--panel-border);">${d}</td>
                    <td style="padding: 6px 12px; color: var(--info); font-weight: 500; border-bottom: 1px solid var(--panel-border);">${count}</td>
                </tr>
            `;"""
js = rvc_row_pattern.sub(new_rvc_row, js)

# 3. Fix Check Perms Table styling (Fix border-collapse)
perms_pattern = re.compile(r'tableDiv\.innerHTML = `.*?<table data-table-id="perms".*?</table>`;', re.DOTALL)
new_perms_table = """tableDiv.innerHTML = `
            <table data-table-id="perms" style="width: 100%; border-collapse: separate; border-spacing: 0; font-size: 0.75rem; text-align: left;">
                <thead>
                    <tr>
                        <th onclick="window.sortTable(this, event, 0)" style="background: #11141a; position: sticky; top: 0; z-index: 5; padding: 8px 12px; border-bottom: 1px solid var(--panel-border); font-weight: 600; cursor: pointer; user-select: none; transition: background 0.2s;" onmouseover="this.style.background='#1e222d'" onmouseout="this.style.background='#11141a'">Feature Name</th>
                        <th onclick="window.sortTable(this, event, 1)" style="background: #11141a; position: sticky; top: 0; z-index: 5; padding: 8px 12px; border-bottom: 1px solid var(--panel-border); font-weight: 600; cursor: pointer; user-select: none; transition: background 0.2s;" onmouseover="this.style.background='#1e222d'" onmouseout="this.style.background='#11141a'">State</th>
                        <th onclick="window.sortTable(this, event, 2)" style="background: #11141a; position: sticky; top: 0; z-index: 5; padding: 8px 12px; border-bottom: 1px solid var(--panel-border); font-weight: 600; cursor: pointer; user-select: none; transition: background 0.2s;" onmouseover="this.style.background='#1e222d'" onmouseout="this.style.background='#11141a'">Extended State</th>
                    </tr>
                </thead>
                <tbody id="perms-dynamic-tbody"></tbody>
            </table>`;"""
js = perms_pattern.sub(new_perms_table, js)

# 4. Fix Check Perms Row styling (Add border-bottom to td instead of tr)
perms_row_pattern = re.compile(r'tr\.style\.cssText = "border-bottom: 1px solid var\(--panel-border\); transition: background 0\.2s;";\s*tr\.onmouseover = \(\) => tr\.style\.background=\'var\(--overlay-10\)\';\s*tr\.onmouseout = \(\) => tr\.style\.background=\'transparent\';\s*tr\.innerHTML = `.*?`;', re.DOTALL)
new_perms_row = """tr.style.cssText = "transition: background 0.2s;";
                tr.onmouseover = () => tr.style.background='var(--overlay-10)';
                tr.onmouseout = () => tr.style.background='transparent';
                tr.innerHTML = `
                    <td style="padding: 8px 12px; color: var(--text-primary); font-family: monospace; border-bottom: 1px solid var(--panel-border);">${name}</td>
                    <td style="padding: 8px 12px; border-bottom: 1px solid var(--panel-border);">${stateHtml}</td>
                    <td style="padding: 8px 12px; color: var(--text-secondary); border-bottom: 1px solid var(--panel-border);">${extState}</td>
                `;"""
js = perms_row_pattern.sub(new_perms_row, js)

with open(SCRIPT_FILE, 'w', encoding='utf-8') as f:
    f.write(js)

print("Removed green box and fixed border-collapse sticky bug!")
