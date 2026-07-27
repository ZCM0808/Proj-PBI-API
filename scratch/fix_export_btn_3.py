import sys

js_path = 'static/script.js'
with open(js_path, 'r', encoding='utf-8') as f:
    js = f.read()

import re

# I will rewrite the entire window.executeExportDataset to use button UI feedback instead of alerts!
old_func_pattern = re.compile(r'window\.executeExportDataset = async function\(\) \{.*?\};(?=\n\n\n?document\.addEventListener)', re.MULTILINE | re.DOTALL)

new_func = """window.executeExportDataset = async function() {
    const ws = document.getElementById('wf-ds-workspace').value;
    const ds = document.getElementById('wf-ds-dataset').value;
    const tb = document.getElementById('wf-ds-table').value;
    const btn = document.getElementById('run-workflow-btn');
    const origHtml = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg> Run Full Workflow';
    
    if(!ws || !ds || !tb) {
        window.skipWfBtnReset = true;
        btn.innerHTML = '❌ Please Select Table';
        setTimeout(() => { btn.innerHTML = origHtml; btn.disabled = false; }, 2000);
        return;
    }
    
    const clientId = document.getElementById('set-client').value.trim();
    const clientSecret = document.getElementById('set-secret').value.trim();
    const tenantId = document.getElementById('set-tenant').value.trim();
    
    btn.innerHTML = '⏳ Exporting...';
    btn.disabled = true;
    
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
            if(!rows || rows.length === 0) {
                window.skipWfBtnReset = true;
                btn.innerHTML = '⚠️ Table Empty';
                setTimeout(() => { btn.innerHTML = origHtml; btn.disabled = false; }, 2000);
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
                    return `"${val.toString().replace(/"/g, '""')}"`;
                }).join(",") + "\\n";
            });
            
            const blob = new Blob(['\\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `${tb}_export.csv`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            
            window.skipWfBtnReset = true;
            btn.innerHTML = `✅ Exported ${rows.length} rows!`;
            setTimeout(() => { btn.innerHTML = origHtml; btn.disabled = false; }, 3000);
        } else {
            window.skipWfBtnReset = true;
            btn.innerHTML = '❌ ' + (data.message.substring(0, 20) + '...');
            console.error("Export Failed:", data.message);
            setTimeout(() => { btn.innerHTML = origHtml; btn.disabled = false; }, 4000);
        }
    } catch(err) {
        window.skipWfBtnReset = true;
        btn.innerHTML = '❌ Network Error';
        console.error("Export Network Error:", err);
        setTimeout(() => { btn.innerHTML = origHtml; btn.disabled = false; }, 2000);
    }
};"""

if old_func_pattern.search(js):
    js = old_func_pattern.sub(new_func, js)
    with open(js_path, 'w', encoding='utf-8') as f:
        f.write(js)
    print("Successfully replaced window.executeExportDataset!")
else:
    print("Could not find the function using regex!")
