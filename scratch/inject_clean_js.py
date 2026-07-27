import re

js_path = 'static/script.js'
with open(js_path, 'r', encoding='utf-8') as f:
    js = f.read()

# Strip out the corrupted functions entirely
js = re.sub(r'window\.loadDatasetTablesStep1\s*=\s*async\s*function\(btn\)\s*\{.*?\n};\s*', '', js, flags=re.DOTALL)
js = re.sub(r'window\.executeDatasetStep2\s*=\s*async\s*function\(btn\)\s*\{.*?\n};\s*', '', js, flags=re.DOTALL)
js = re.sub(r'window\.executeExportDataset\s*=\s*async\s*function\(\)\s*\{.*?\n};\s*', '', js, flags=re.DOTALL)

clean_js = r"""
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
    
    const requestStr = `[POST] /api/export_dataset/${ws}/${ds}\nHeaders: { "Content-Type": "application/json" }\nBody:\n{\n  "pbi_client_id": "${clientId ? '***' : ''}",\n  "pbi_tenant_id": "${tenantId ? '***' : ''}",\n  "query": "${query}"\n}\n\n⏳ Request sent, waiting for response...`;

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
                `\n✅ Success! Status: 200 OK\nRetrieved ${tables.length} valid tables.\n\nResponse Preview:\n` + JSON.stringify(tables, null, 2);
            
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
                `\n❌ Failed:\n` + data.message;
        }
    } catch(err) {
        consoleOut.innerText = requestStr.replace('⏳ Request sent, waiting for response...', '') + 
            `\n❌ Network Error:\n` + err.message;
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
    
    const requestStr = `[POST] /api/export_dataset/${ws}/${ds}\nHeaders: { "Content-Type": "application/json" }\nBody:\n{\n  "pbi_client_id": "${clientId ? '***' : ''}",\n  "pbi_tenant_id": "${tenantId ? '***' : ''}",\n  "query": "${query}"\n}\n\n⏳ Request sent, querying data from Power BI (this may take up to 60s)...`;

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
            let successLog = `\n✅ Success! Status: 200 OK\nRetrieved ${rows.length} rows from table '${tb}'.`;
            
            if(!rows || rows.length === 0) {
                consoleOut.innerText = requestStr.replace('⏳ Request sent, querying data from Power BI (this may take up to 60s)...', '') + 
                    successLog + '\n⚠️ Dataset table is empty. No CSV generated.';
                if (btn) btn.disabled = false;
                return true;
            }
            
            successLog += '\n\n⏳ Formatting CSV and generating download blob...';
            consoleOut.innerText = requestStr.replace('⏳ Request sent, querying data from Power BI (this may take up to 60s)...', '') + successLog;
            
            const cleanKey = (k) => {
                const match = k.match(/\[(.*?)\]/);
                return match ? match[1] : k;
            };
            const rawKeys = Object.keys(rows[0]);
            let csv = rawKeys.map(k => `"${cleanKey(k).replace(/"/g, '""')}"`).join(",") + "\n";
            rows.forEach(r => {
                csv += rawKeys.map(k => {
                    let val = r[k];
                    if (val === null || val === undefined) val = '';
                    return `"${String(val).replace(/"/g, '""')}"`;
                }).join(",") + "\n";
            });
            
            const blob = new Blob([new Uint8Array([0xEF, 0xBB, 0xBF]), csv], { type: 'text/csv;charset=utf-8;' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `Export_${tb.replace(/[^a-zA-Z0-9_-]/g, '_')}.csv`;
            a.click();
            URL.revokeObjectURL(url);
            
            consoleOut.innerText += `\n✅ Download initiated: ${a.download}`;
            if (btn) btn.disabled = false;
            return true;
            
        } else {
            consoleOut.innerText = requestStr.replace('⏳ Request sent, querying data from Power BI (this may take up to 60s)...', '') + 
                `\n❌ Query Failed:\n` + data.message;
        }
    } catch(err) {
        consoleOut.innerText = requestStr.replace('⏳ Request sent, querying data from Power BI (this may take up to 60s)...', '') + 
            `\n❌ Network Error:\n` + err.message;
    }
    if (btn) btn.disabled = false;
    return false;
};

window.executeExportDataset = async function() {
    const step1Btn = document.getElementById('wf-ds-btn-step1');
    const step2Btn = document.getElementById('wf-ds-btn-step2');
    const select = document.getElementById('wf-ds-table');
    
    if (!select.value) {
        const step1Ok = await window.loadDatasetTablesStep1(step1Btn);
        if (!step1Ok) return;
        
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

js += "\n" + clean_js

with open(js_path, 'w', encoding='utf-8') as f:
    f.write(js)

print("HTML and JS refactored completely.")
