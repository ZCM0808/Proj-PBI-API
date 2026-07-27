import re

html_path = 'static/index.html'
with open(html_path, 'r', encoding='utf-8') as f:
    html = f.read()

pattern = r'<div class="wf-step-header" style="flex-wrap: nowrap; gap: 8px;">\s*<span class="wf-step-title" style="white-space: nowrap;">Step 2: Execute Query & Download \(CSV\)</span>'
replacement = '<div class="wf-step-header" style="flex-wrap: nowrap; gap: 8px; position: relative; z-index: 10;">\n                                  <span class="wf-step-title" style="white-space: nowrap;">Step 2: Execute Query & Download (CSV)</span>'

if re.search(pattern, html):
    html = re.sub(pattern, replacement, html)
    html = html.replace('v20260727_v68_ds_steps_v8', 'v20260727_v69_ds_steps_v9')
    with open(html_path, 'w', encoding='utf-8') as f:
        f.write(html)
    print("Fixed header z-index successfully.")
else:
    print("Pattern not found!")
