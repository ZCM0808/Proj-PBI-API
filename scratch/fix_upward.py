import re

html_path = 'static/index.html'
with open(html_path, 'r', encoding='utf-8') as f:
    html = f.read()

# Change top: calc(...) to bottom: calc(...), and translateY(-8px) to translateY(8px)
pattern = re.compile(r'top: calc\(100% \+ 4px\); bottom: auto; left: 0; width: 100%; max-height: 200px; overflow-y: auto; background: var\(--dropdown-bg\); border: 1px solid var\(--panel-border\); border-radius: 4px; padding: 4px 0; margin: 0; list-style: none; z-index: 1000; opacity: 0; visibility: hidden; transform: translateY\(-8px\);')
replacement = 'bottom: calc(100% + 4px); top: auto; left: 0; width: 100%; max-height: 200px; overflow-y: auto; background: var(--dropdown-bg); border: 1px solid var(--panel-border); border-radius: 4px; padding: 4px 0; margin: 0; list-style: none; z-index: 1000; opacity: 0; visibility: hidden; transform: translateY(8px);'

if pattern.search(html):
    html = pattern.sub(replacement, html)
    html = html.replace('v20260727_v69_ds_steps_v9', 'v20260727_v70_ds_steps_v10')
    with open(html_path, 'w', encoding='utf-8') as f:
        f.write(html)
    print("HTML updated to UPWARD popup successfully.")
else:
    print("Pattern not found in HTML!")

js_path = 'static/script.js'
with open(js_path, 'r', encoding='utf-8') as f:
    js = f.read()

# Change translateY(-8px) back to translateY(8px) for dropdown animations
js = js.replace("options.style.transform = 'translateY(-8px)';", "options.style.transform = 'translateY(8px)';")

with open(js_path, 'w', encoding='utf-8') as f:
    f.write(js)
print("JS updated to UPWARD popup successfully.")
