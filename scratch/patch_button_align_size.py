import re

with open('static/index.html', 'r', encoding='utf-8') as f:
    content = f.read()

old_btn = '<button type="submit" id="save-settings-btn" class="btn-action-primary">'
new_btn = '<button type="submit" id="save-settings-btn" class="btn-action-primary" style="font-size: 0.8rem; border: 1px solid transparent; padding: 4px 12px;">'

content = content.replace(old_btn, new_btn)

# Bump cache
content = content.replace('v204', 'v205')

with open('static/index.html', 'w', encoding='utf-8') as f:
    f.write(content)

print("index.html patched: save-settings-btn style aligned with import/export.")
