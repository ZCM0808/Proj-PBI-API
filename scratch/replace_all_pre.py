import re
with open('static/index.html', 'r', encoding='utf-8') as f:
    html = f.read()

html = re.sub(r'<pre (id="wf-out-.*?")', r'<div \1', html)
html = html.replace('</pre>', '</div>')

# also bump version
v_match = re.search(r'style\.css\?v=20260730_v(\d+)', html)
if v_match:
    new_v = int(v_match.group(1)) + 1
    html = re.sub(r'style\.css\?v=20260730_v\d+', f'style.css?v=20260730_v{new_v}', html)
    html = re.sub(r'script\.js\?v=20260730_v\d+', f'script.js?v=20260730_v{new_v}', html)

with open('static/index.html', 'w', encoding='utf-8') as f:
    f.write(html)
print("done")
