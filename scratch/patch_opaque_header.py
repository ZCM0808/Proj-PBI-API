import re

with open('static/script.js', 'r', encoding='utf-8') as f:
    js = f.read()

target = """<thead style="position: sticky; top: 0; background: var(--panel-bg); z-index: 5;">"""
replacement = """<thead style="position: sticky; top: 0; background: var(--bg-color); z-index: 5;">"""

if target in js:
    js = js.replace(target, replacement)
    with open('static/script.js', 'w', encoding='utf-8') as f:
        f.write(js)
    print("JS patched with opaque background!")
else:
    print("Target not found in JS!")

# Make sure we also patch index.html version number
with open('static/index.html', 'r', encoding='utf-8') as f:
    html = f.read()
html = re.sub(r'v149', 'v150', html)
with open('static/index.html', 'w', encoding='utf-8') as f:
    f.write(html)
