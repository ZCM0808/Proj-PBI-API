import sys

js_path = 'static/script.js'
with open(js_path, 'r', encoding='utf-8') as f:
    js = f.read()

# Remove the undefined function call
if "window.populateWfDropdowns('wf-ds-workspace', 'wf-ds-dataset');" in js:
    js = js.replace("window.populateWfDropdowns('wf-ds-workspace', 'wf-ds-dataset');", "")

# Find where fillSelect is called and insert new calls
fill_block = """            fillSelect('wf-exp-workspace', 'pbi_workspaces');
            fillSelect('wf-exp-report', 'pbi_reports');
            fillSelect('wf-vis-workspace', 'pbi_workspaces');
            fillSelect('wf-vis-report', 'pbi_reports');"""
            
new_fill_block = fill_block + """
            fillSelect('wf-ds-workspace', 'pbi_workspaces');
            fillSelect('wf-ds-dataset', 'pbi_datasets');"""

if "fillSelect('wf-ds-workspace'" not in js:
    js = js.replace(fill_block, new_fill_block)

# Find where active workspace is selected and add for new dropdowns
active_block = """            if (activeW) document.getElementById('wf-exp-workspace').value = activeW;
            if (activeR) document.getElementById('wf-exp-report').value = activeR;"""

new_active_block = active_block + """
            if (activeW) document.getElementById('wf-vis-workspace').value = activeW;
            if (activeR) document.getElementById('wf-vis-report').value = activeR;
            if (activeW) document.getElementById('wf-ds-workspace').value = activeW;
            const activeD = document.getElementById('active-dataset')?.value;
            if (activeD) document.getElementById('wf-ds-dataset').value = activeD;"""

if "wf-ds-workspace').value = activeW;" not in js:
    js = js.replace(active_block, new_active_block)

with open(js_path, 'w', encoding='utf-8') as f:
    f.write(js)

print("Fixed dropdown population in JS")
