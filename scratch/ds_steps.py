import sys

# 1. Modify index.html
html_path = 'static/index.html'
with open(html_path, 'r', encoding='utf-8') as f:
    html = f.read()

insertion = """
                    <div class="wf-steps-container" style="display: flex; flex-direction: column; gap: 12px; margin-top: 8px;">
                        <div class="wf-step active" id="wf-ds-step-1">
                            <div class="wf-step-header">
                                <span class="wf-step-title">Step 1: Execute DAX Query (executeQueries)</span>
                            </div>
                            <div style="position: relative;">
                                <pre id="wf-out-ds-step1" class="wf-console">Ready to query...</pre>
                            </div>
                        </div>
                        <div class="wf-step" id="wf-ds-step-2">
                            <div class="wf-step-header">
                                <span class="wf-step-title">Step 2: Parse & Download CSV</span>
                            </div>
                            <div style="position: relative;">
                                <pre id="wf-out-ds-step2" class="wf-console">Waiting for query results...</pre>
                            </div>
                        </div>
                    </div>
"""

# Find the end of wf-config-export_dataset_tables pane.
target = """                            </div>
                        </div>
                    </div>
                </div>"""
replacement = f"""                            </div>
                        </div>
                    </div>{insertion}                </div>"""
html = html.replace(target, replacement)

# Bump cache to v61
html = html.replace('v20260727_v60_fix_btn_id', 'v20260727_v61_ds_steps')

with open(html_path, 'w', encoding='utf-8') as f:
    f.write(html)


# 2. Modify script.js
js_path = 'static/script.js'
with open(js_path, 'r', encoding='utf-8') as f:
    js = f.read()

import re

# We need to replace the entire window.executeExportDataset function
new_func = """window.executeExportDataset = async function() {
    const ws = document.getElementById('wf-ds-workspace').value;
    const ds = document.getElementById('wf-ds-dataset').value;
    const tb = document.getElementById('wf-ds-table').value;
    
    const step1Console = document.getElementById('wf-out-ds-step1');
    const step2Console = document.getElementById('wf-out-ds-step2');
    const step1Div = document.getElementById('wf-ds-step-1');
    const step2Div = document.getElementById('wf-ds-step-2');
    
    if(!ws || !ds || !tb) {
        step1Console.innerText = '❌ Please Select Workspace, Dataset, and Table Name.';
        return;
    }
    
    const clientId = document.getElementById('set-client').value.trim();
    const clientSecret = document.getElementById('set-secret').value.trim();
    const tenantId = document.getElementById('set-tenant').value.trim();
    
    step1Div.classList.add('active');
    step2Div.classList.remove('active');
    step1Console.innerText = '⏳ Executing DAX query... (This may take a few seconds)';
    step2Console.innerText = 'Waiting for Step 1...';
    
    try {
        const payload = {
            pbi_client_id: clientId,
            pbi_client_secret: clientSecret,
            pbi_tenant_id: tenantId,
            query: `EVALUATE '${tb}'`
        };
        
        const res = await fetch(`/api/export_dataset/${ws}/${ds}`, {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify(payload)
        });
        
        const data = await res.json();
        
        if(data.success) {
            const rows = data.results;
            step1Console.innerText = `✅ Query successful. Retrieved ${rows.length} rows.`;
            
            step2Div.classList.add('active');
            step2Console.innerText = '⏳ Formatting data to CSV and initiating download...';
            
            if(!rows || rows.length === 0) {
                step2Console.innerText = '⚠️ Dataset table is empty. No CSV downloaded.';
                return;
            }
            
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
            a.download = `Export_${tb}.csv`;
            a.click();
            URL.revokeObjectURL(url);
            
            step2Console.innerText = `✅ Success! Downloaded: Export_${tb}.csv`;
            
        } else {
            step1Console.innerText = '❌ Query Failed:\\n' + data.message;
        }
    } catch(err) {
        step1Console.innerText = '❌ Network Error:\\n' + err.message;
    }
};"""

js_cleaned = re.sub(r'window\.executeExportDataset\s*=\s*async\s*function\(\)\s*\{.*?\n};\s*', new_func + '\n\n', js, flags=re.DOTALL)

with open(js_path, 'w', encoding='utf-8') as f:
    f.write(js_cleaned)

print("HTML and JS modified.")
