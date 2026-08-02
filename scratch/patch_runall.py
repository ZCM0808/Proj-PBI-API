import re

with open('static/script.js', 'r', encoding='utf-8') as f:
    js = f.read()

target = """                } else if (wfType === 'export_visual') {
                    await executeExportVisual();
                } else if (wfType === 'smart_pipeline') {"""

replacement = """                } else if (wfType === 'export_visual') {
                    await executeExportVisual();
                } else if (wfType === 'report_view_count') {
                    if (window.runRvcWorkflow) await window.runRvcWorkflow();
                } else if (wfType === 'check_permissions') {
                    if (window.runCheckPermsWorkflow) await window.runCheckPermsWorkflow();
                } else if (wfType === 'smart_pipeline') {"""

if target in js:
    js = js.replace(target, replacement)
    
    # bump version in index.html
    with open('static/index.html', 'r', encoding='utf-8') as f:
        html = f.read()
    html = re.sub(r'v135', 'v136', html)
    with open('static/index.html', 'w', encoding='utf-8') as f:
        f.write(html)
        
    with open('static/script.js', 'w', encoding='utf-8') as f:
        f.write(js)
    print("Patched successfully")
else:
    print("Target not found")
