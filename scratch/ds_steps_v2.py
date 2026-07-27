import sys
import re

html_path = 'static/index.html'
with open(html_path, 'r', encoding='utf-8') as f:
    html = f.read()

# Replace the entire wf-config-export_dataset_tables pane
pattern = r'<div id="wf-config-export_dataset_tables" class="wf-config-pane" style="display: none;">(.*?)</div>\s*(<div id="wf-config-export_visual")'

replacement = """<div id="wf-config-export_dataset_tables" class="wf-config-pane" style="display: none;">
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 8px;">
                        <div>
                            <label style="font-size: 0.85rem; color: var(--text-secondary);">Workspace ID</label>
                            <select id="wf-ds-workspace" class="wf-input"></select>
                        </div>
                        <div>
                            <label style="font-size: 0.85rem; color: var(--text-secondary);">Dataset ID</label>
                            <select id="wf-ds-dataset" class="wf-input"></select>
                        </div>
                    </div>
                    
                    <div class="wf-steps-container" style="display: flex; flex-direction: column; gap: 12px; margin-top: 8px;">
                        <!-- Step 1 -->
                        <div class="wf-step" id="wf-ds-step-1">
                            <div class="wf-step-header">
                                <span class="wf-step-title">Step 1: Fetch Available Tables</span>
                                <button id="wf-ds-btn-step1" class="btn-action-secondary wf-step-btn" onclick="window.loadDatasetTablesStep1(this)">Run Step 1</button>
                            </div>
                            <div style="position: relative;">
                                <pre id="wf-out-ds-step1" class="wf-console">Input: Ready to fetch tables...</pre>
                                <button type="button" class="wf-copy-btn" onclick="copyWfConsole('ds-step1', this)" title="Copy Output">
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
                                </button>
                            </div>
                        </div>
                        
                        <!-- Step 2 -->
                        <div class="wf-step" id="wf-ds-step-2">
                            <div class="wf-step-header">
                                <span class="wf-step-title">Step 2: Execute Query & Download (CSV)</span>
                                <div style="display: flex; gap: 8px; align-items: center;">
                                    <select id="wf-ds-table" class="wf-input" style="height: 28px; width: 160px; font-size: 0.75rem; padding: 0 4px;">
                                        <option value="">-- Run Step 1 First --</option>
                                    </select>
                                    <button id="wf-ds-btn-step2" class="btn-action-secondary wf-step-btn" onclick="window.executeDatasetStep2(this)">Run Step 2</button>
                                </div>
                            </div>
                            <div style="position: relative;">
                                <pre id="wf-out-ds-step2" class="wf-console">Waiting for Step 1...</pre>
                                <button type="button" class="wf-copy-btn" onclick="copyWfConsole('ds-step2', this)" title="Copy Output">
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
                \\2"""

# We need to find where wf-config-export_dataset_tables ends and wf-config-export_visual begins.
# Let's use a simpler replace strategy.
import re
new_html = re.sub(pattern, replacement, html, flags=re.DOTALL)
new_html = new_html.replace('v20260727_v61_ds_steps', 'v20260727_v62_ds_steps_v2')

with open(html_path, 'w', encoding='utf-8') as f:
    f.write(new_html)

# Now for script.js
js_path = 'static/script.js'
with open(js_path, 'r', encoding='utf-8') as f:
    js = f.read()

# We need to remove the old window.loadDatasetTables function
js = re.sub(r'window\.loadDatasetTables\s*=\s*async\s*function\(btn\)\s*\{.*?\n};\s*', '', js, flags=re.DOTALL)

# We need to replace the old window.executeExportDataset function
new_js_logic = """
window.loadDatasetTablesStep1 = async function(btn) {
    if (btn) btn.disabled = true;
    const ws = document.getElementById('wf-ds-workspace').value;
    const ds = document.getElementById('wf-ds-dataset').value;
    const consoleOut = document.getElementById('wf-out-ds-step1');
    const select = document.getElementById('wf-ds-table');
    const step1Div = document.getElementById('wf-ds-step-1');
    
    if(!ws || !ds) {
        consoleOut.innerText = '❌ Error: Please select Workspace and Dataset first.';
        if (btn) btn.disabled = false;
        return false;
    }
    
    step1Div.classList.add('active');
    
    const clientId = document.getElementById('set-client').value.trim();
    const clientSecret = document.getElementById('set-secret').value.trim();
    const tenantId = document.getElementById('set-tenant').value.trim();
    
    const query = "EVALUATE SUMMARIZE(COLUMNSTATISTICS(), [Table Name])";
    
    const requestStr = `[POST] /api/export_dataset/${ws}/${ds}
Headers: { "Content-Type": "application/json" }
Body:
{
  "pbi_client_id": "${clientId ? '***' : ''}",
  "pbi_tenant_id": "${tenantId ? '***' : ''}",
  "query": "${query}"
}

⏳ Request sent, waiting for response...`;

    consoleOut.innerText = requestStr;
    
    try {
        const payload = { pbi_client_id: clientId, pbi_client_secret: clientSecret, pbi_tenant_id: tenantId, query: query };
        const res = await fetch(`/api/export_dataset/${ws}/${ds}`, {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify(payload)
        });
        
        const data = await res.json();
        if(data.success) {
            const rows = data.results;
            const tables = [];
            rows.forEach(r => {
                const val = r["Table Name"] || r["[Table Name]"];
                if(val && !val.startsWith("LocalDateTable_") && !val.startsWith("DateTableTemplate_")) {
                    tables.push(val);
                }
            });
            
            consoleOut.innerText = requestStr.replace('⏳ Request sent, waiting for response...', '') + 
                `\\n✅ Success! Status: 200 OK\\nRetrieved ${tables.length} valid tables.\\n\\nResponse Preview:\\n` + JSON.stringify(tables, null, 2);
            
            select.innerHTML = '';
            if(tables.length === 0) {
                select.innerHTML = '<option value="">-- No Tables Found --</option>';
            } else {
                tables.forEach(t => {
                    const opt = document.createElement('option');
                    opt.value = t;
                    opt.innerText = t;
                    select.appendChild(opt);
                });
                document.getElementById('wf-ds-step-2').classList.add('active');
                document.getElementById('wf-out-ds-step2').innerText = "✅ Step 1 complete. Ready to execute Step 2.";
            }
            if (btn) btn.disabled = false;
            return true;
        } else {
            consoleOut.innerText = requestStr.replace('⏳ Request sent, waiting for response...', '') + 
                `\\n❌ Failed:\\n` + data.message;
        }
    } catch(err) {
        consoleOut.innerText = requestStr.replace('⏳ Request sent, waiting for response...', '') + 
            `\\n❌ Network Error:\\n` + err.message;
    }
    if (btn) btn.disabled = false;
    return false;
};

window.executeDatasetStep2 = async function(btn) {
    if (btn) btn.disabled = true;
    const ws = document.getElementById('wf-ds-workspace').value;
    const ds = document.getElementById('wf-ds-dataset').value;
    const tb = document.getElementById('wf-ds-table').value;
    const consoleOut = document.getElementById('wf-out-ds-step2');
    const step2Div = document.getElementById('wf-ds-step-2');
    
    if(!ws || !ds || !tb) {
        consoleOut.innerText = '❌ Error: Please ensure Step 1 is complete and a Table is selected.';
        if (btn) btn.disabled = false;
        return false;
    }
    
    step2Div.classList.add('active');
    
    const clientId = document.getElementById('set-client').value.trim();
    const clientSecret = document.getElementById('set-secret').value.trim();
    const tenantId = document.getElementById('set-tenant').value.trim();
    
    const query = `EVALUATE '${tb}'`;
    
    const requestStr = `[POST] /api/export_dataset/${ws}/${ds}
Headers: { "Content-Type": "application/json" }
Body:
{
  "pbi_client_id": "${clientId ? '***' : ''}",
  "pbi_tenant_id": "${tenantId ? '***' : ''}",
  "query": "${query}"
}

⏳ Request sent, querying data from Power BI (this may take up to 60s)...`;

    consoleOut.innerText = requestStr;
    
    try {
        const payload = { pbi_client_id: clientId, pbi_client_secret: clientSecret, pbi_tenant_id: tenantId, query: query };
        const res = await fetch(`/api/export_dataset/${ws}/${ds}`, {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify(payload)
        });
        
        const data = await res.json();
        
        if(data.success) {
            const rows = data.results;
            let successLog = `\\n✅ Success! Status: 200 OK\\nRetrieved ${rows.length} rows from table '${tb}'.`;
            
            if(!rows || rows.length === 0) {
                consoleOut.innerText = requestStr.replace('⏳ Request sent, querying data from Power BI (this may take up to 60s)...', '') + 
                    successLog + '\\n⚠️ Dataset table is empty. No CSV generated.';
                if (btn) btn.disabled = false;
                return true;
            }
            
            successLog += '\\n\\n⏳ Formatting CSV and generating download blob...';
            consoleOut.innerText = requestStr.replace('⏳ Request sent, querying data from Power BI (this may take up to 60s)...', '') + successLog;
            
            const cleanKey = (k) => {
                const match = k.match(/\\[(.*?)\\]/);
                return match ? match[1] : k;
            };
            const rawKeys = Object.keys(rows[0]);
            let csv = rawKeys.map(k => `"${cleanKey(k).replace(/"/g, '""')}"`).join(",") + "\\n";
            rows.forEach(r => {
                csv += rawKeys.map(k => {
                    let val = r[k];
                    if (val === null || val === undefined) val = '';
                    return `"${String(val).replace(/"/g, '""')}"`;
                }).join(",") + "\\n";
            });
            
            const blob = new Blob([new Uint8Array([0xEF, 0xBB, 0xBF]), csv], { type: 'text/csv;charset=utf-8;' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `Export_${tb.replace(/[^a-zA-Z0-9_-]/g, '_')}.csv`;
            a.click();
            URL.revokeObjectURL(url);
            
            consoleOut.innerText += `\\n✅ Download initiated: ${a.download}`;
            if (btn) btn.disabled = false;
            return true;
            
        } else {
            consoleOut.innerText = requestStr.replace('⏳ Request sent, querying data from Power BI (this may take up to 60s)...', '') + 
                `\\n❌ Query Failed:\\n` + data.message;
        }
    } catch(err) {
        consoleOut.innerText = requestStr.replace('⏳ Request sent, querying data from Power BI (this may take up to 60s)...', '') + 
            `\\n❌ Network Error:\\n` + err.message;
    }
    if (btn) btn.disabled = false;
    return false;
};

window.executeExportDataset = async function() {
    // Top-level "Run Full Workflow" orchestration for Export Dataset
    const step1Btn = document.getElementById('wf-ds-btn-step1');
    const step2Btn = document.getElementById('wf-ds-btn-step2');
    
    // Check if table is already populated and selected. If so, skip step 1 to save time.
    const select = document.getElementById('wf-ds-table');
    if (!select.value) {
        const step1Ok = await window.loadDatasetTablesStep1(step1Btn);
        if (!step1Ok) return;
        
        // Auto-select first valid table if exists
        if (select.options.length > 0 && select.options[0].value) {
            select.selectedIndex = 0;
        } else if (select.options.length > 1) {
            select.selectedIndex = 1;
        }
    }
    
    if (select.value) {
        await window.executeDatasetStep2(step2Btn);
    }
};
"""

js = re.sub(r'window\.executeExportDataset\s*=\s*async\s*function\(\)\s*\{.*?\n};\s*', new_js_logic + '\n', js, flags=re.DOTALL)

with open(js_path, 'w', encoding='utf-8') as f:
    f.write(js)

print("HTML and JS refactored completely.")
