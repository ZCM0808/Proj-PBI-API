import sys

js_path = 'static/script.js'
with open(js_path, 'r', encoding='utf-8') as f:
    js = f.read()

new_func_start = """window.executeExportDataset = async function() {
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
    }"""

import re
js = re.sub(r'window\.executeExportDataset = async function\(\) \{.*?if\(!ws \|\| !ds \|\| !tb\) \{.*?return;\s*\}', new_func_start, js, flags=re.DOTALL)

with open(js_path, 'w', encoding='utf-8') as f:
    f.write(js)
print("Replaced executeExportDataset")
