import sys

js_path = 'static/script.js'
with open(js_path, 'r', encoding='utf-8') as f:
    js = f.read()

js = js.replace("getElementById('run-workflow-btn')", "getElementById('wf-btn-runall')")

with open(js_path, 'w', encoding='utf-8') as f:
    f.write(js)
print("Replaced run-workflow-btn with wf-btn-runall")
