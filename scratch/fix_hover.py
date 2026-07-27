import re

# Fix index.html
html_path = 'static/index.html'
with open(html_path, 'r', encoding='utf-8') as f:
    html = f.read()

# Replace the yellow accent hover with overlay-10
css_pattern = re.compile(r'#wf-ds-table-options li:hover\s*{\s*background-color: var\(--accent\) !important;\s*color: var\(--accent-text\) !important;\s*}')
new_css = """#wf-ds-table-options li:hover {
                        background-color: var(--overlay-10) !important;
                    }"""

if css_pattern.search(html):
    html = css_pattern.sub(new_css, html)
    html = html.replace('v20260727_v71_ds_steps_v11', 'v20260727_v72_ds_steps_v12')
    with open(html_path, 'w', encoding='utf-8') as f:
        f.write(html)
    print("Fixed CSS hover in index.html")
else:
    print("CSS pattern not found in index.html!")

# Fix script.js
js_path = 'static/script.js'
with open(js_path, 'r', encoding='utf-8') as f:
    js = f.read()

# Replace var(--bg-hover) with var(--overlay-10)
js = js.replace("'var(--bg-hover)'", "'var(--overlay-10)'")

with open(js_path, 'w', encoding='utf-8') as f:
    f.write(js)
print("Fixed JS onmouseover in script.js")
