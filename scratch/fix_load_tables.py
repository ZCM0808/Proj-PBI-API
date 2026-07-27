import sys

js_path = 'static/script.js'
with open(js_path, 'r', encoding='utf-8') as f:
    js = f.read()

# Replace the entire DOMContentLoaded block for loadBtn
import re

pattern = re.compile(r"document\.addEventListener\('DOMContentLoaded',\s*\(\)\s*=>\s*\{\s*const loadBtn\s*=\s*document\.getElementById\('load-tables-btn'\);\s*if\(loadBtn\)\s*\{\s*loadBtn\.addEventListener\('click',\s*async\s*\(\)\s*=>\s*\{", re.MULTILINE)

match = pattern.search(js)
if match:
    # Instead of doing a complex regex replace, I will just append the new function
    # and not worry about the old one since the button ID is removed anyway.
    pass

new_func = """
window.loadDatasetTables = async function(btn) {
    const ws = document.getElementById('wf-ds-workspace').value;
    const ds = document.getElementById('wf-ds-dataset').value;
    if(!ws || !ds) {
        alert("请先选择 Workspace 和 Dataset！(Select Workspace & Dataset first)");
        return;
    }
    
    const clientId = document.getElementById('set-client').value.trim();
    const clientSecret = document.getElementById('set-secret').value.trim();
    const tenantId = document.getElementById('set-tenant').value.trim();
    if (!clientId || !clientSecret || !tenantId) {
        alert("请在 Global Settings 中填写 Auth Credentials！");
        return;
    }
    
    await window.animateVerifyBtn(btn, async () => {
        const payload = {
            pbi_client_id: clientId,
            pbi_client_secret: clientSecret,
            pbi_tenant_id: tenantId,
            query: "EVALUATE FILTER(INFO.TABLES(), [IsHidden] = FALSE)"
        };
        
        const res = await fetch(`/api/export_dataset/${ws}/${ds}`, {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify(payload)
        });
        
        const data = await res.json();
        if(data.success) {
            const sel = document.getElementById('wf-ds-table');
            sel.innerHTML = '';
            data.results.forEach(t => {
                const NameKey = Object.keys(t).find(k => k.endsWith('Name]') || k === 'Name');
                const opt = document.createElement('option');
                opt.value = t[NameKey];
                opt.textContent = t[NameKey];
                sel.appendChild(opt);
            });
            return { success: true, message: `加载了 ${data.results.length} 张表` };
        } else {
            return { success: false, message: data.message };
        }
    }, (res) => {
        // Success callback
    });
};
"""

if 'window.loadDatasetTables = async function' not in js:
    js += "\n" + new_func
    with open(js_path, 'w', encoding='utf-8') as f:
        f.write(js)
        print("Injected window.loadDatasetTables")
