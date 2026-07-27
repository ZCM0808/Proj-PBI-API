import sys
import re

js_path = 'static/script.js'
with open(js_path, 'r', encoding='utf-8') as f:
    js = f.read()

# Remove frontend auth check in window.loadDatasetTables
load_tables_auth_check = """        const clientId = document.getElementById('set-client').value.trim();
        const clientSecret = document.getElementById('set-secret').value.trim();
        const tenantId = document.getElementById('set-tenant').value.trim();
        if (!clientId || !clientSecret || !tenantId) {
            btn.innerHTML = '❌ Missing Auth';
            setTimeout(() => { btn.innerHTML = origHtml; btn.disabled = false; }, 2000);
            return;
        }"""

if load_tables_auth_check in js:
    js = js.replace(load_tables_auth_check, """        const clientId = document.getElementById('set-client').value.trim();
        const clientSecret = document.getElementById('set-secret').value.trim();
        const tenantId = document.getElementById('set-tenant').value.trim();""")
    print("Removed auth check in loadDatasetTables")

# Also remove auth check in executeExportDataset
export_auth_check = """    const clientId = document.getElementById('set-client').value.trim();
    const clientSecret = document.getElementById('set-secret').value.trim();
    const tenantId = document.getElementById('set-tenant').value.trim();
    if (!clientId || !clientSecret || !tenantId) {
        alert("请在 Global Settings 中填写 Auth Credentials！");
        return;
    }"""

if export_auth_check in js:
    js = js.replace(export_auth_check, """    const clientId = document.getElementById('set-client').value.trim();
    const clientSecret = document.getElementById('set-secret').value.trim();
    const tenantId = document.getElementById('set-tenant').value.trim();""")
    print("Removed auth check in executeExportDataset")

with open(js_path, 'w', encoding='utf-8') as f:
    f.write(js)
