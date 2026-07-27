import sys
import re

js_path = 'static/script.js'
with open(js_path, 'r', encoding='utf-8') as f:
    js = f.read()

# I will replace the entire window.loadDatasetTables function
old_func_pattern = re.compile(r"window\.loadDatasetTables\s*=\s*async\s*function\(btn\)\s*\{.*?^\};", re.MULTILINE | re.DOTALL)

new_func = """window.loadDatasetTables = async function(btn) {
    const origHtml = btn.innerHTML;
    btn.innerHTML = '⏳...';
    btn.disabled = true;
    
    try {
        const ws = document.getElementById('wf-ds-workspace').value;
        const ds = document.getElementById('wf-ds-dataset').value;
        if(!ws || !ds) {
            btn.innerHTML = '❌ Select WS/DS';
            setTimeout(() => { btn.innerHTML = origHtml; btn.disabled = false; }, 2000);
            return;
        }
        
        const clientId = document.getElementById('set-client').value.trim();
        const clientSecret = document.getElementById('set-secret').value.trim();
        const tenantId = document.getElementById('set-tenant').value.trim();
        if (!clientId || !clientSecret || !tenantId) {
            btn.innerHTML = '❌ Missing Auth';
            setTimeout(() => { btn.innerHTML = origHtml; btn.disabled = false; }, 2000);
            return;
        }
        
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
            btn.innerHTML = '✅ Loaded!';
            setTimeout(() => { btn.innerHTML = origHtml; btn.disabled = false; }, 2000);
        } else {
            btn.innerHTML = '❌ Error';
            alert(data.message);
            setTimeout(() => { btn.innerHTML = origHtml; btn.disabled = false; }, 2000);
        }
    } catch (e) {
        btn.innerHTML = '❌ Net Err';
        setTimeout(() => { btn.innerHTML = origHtml; btn.disabled = false; }, 2000);
    }
};"""

if old_func_pattern.search(js):
    js = old_func_pattern.sub(new_func, js)
else:
    js += "\n" + new_func

with open(js_path, 'w', encoding='utf-8') as f:
    f.write(js)
