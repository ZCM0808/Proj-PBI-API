import sys

js_path = 'static/script.js'
with open(js_path, 'r', encoding='utf-8') as f:
    js = f.read()

old_func_start = """window.executeExportDataset = async function() {
    const ws = document.getElementById('wf-ds-workspace').value;
    const ds = document.getElementById('wf-ds-dataset').value;
    const tb = document.getElementById('wf-ds-table').value;
    
    if(!ws || !ds || !tb) {
        alert("请选择 Workspace, Dataset 和 Table!(Please select Workspace, Dataset, and Table.)");
        return;
    }"""

new_func_start = """window.executeExportDataset = async function() {
    const ws = document.getElementById('wf-ds-workspace').value;
    const ds = document.getElementById('wf-ds-dataset').value;
    const tb = document.getElementById('wf-ds-table').value;
    const btn = document.getElementById('run-workflow-btn');
    const origHtml = btn.innerHTML;
    
    if(!ws || !ds || !tb) {
        btn.innerHTML = '❌ Please Select Table';
        setTimeout(() => { btn.innerHTML = origHtml; btn.disabled = false; }, 2000);
        // Throw an error so the caller's finally block doesn't immediately reset the UI
        throw new Error("Missing fields");
    }"""

if "alert(\"" in old_func_start or "alert" in js:
    # Use regex to replace the first part
    import re
    js = re.sub(r'window\.executeExportDataset = async function\(\) \{.*?if\(!ws \|\| !ds \|\| !tb\) \{.*?return;\s*\}', new_func_start, js, flags=re.DOTALL)
    
    with open(js_path, 'w', encoding='utf-8') as f:
        f.write(js)
    print("Replaced executeExportDataset")
