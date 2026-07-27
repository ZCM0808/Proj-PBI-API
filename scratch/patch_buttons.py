import re

with open('static/index.html', 'r', encoding='utf-8') as f:
    content = f.read()

# Fix AI chat close button consistency
content = content.replace(
    '<button type="button" class="close-btn" onclick="toggleAIChat()"><svg width="16" height="16"',
    '<button type="button" class="close-btn" title="Close" onclick="toggleAIChat()"><svg width="14" height="14"'
)

# Fix Save button consistency
content = content.replace(
    'class="btn-settings-save"',
    'class="btn-action-primary"'
)

# Cache busting
content = re.sub(r'script\.js\?v=\d+_[a-z0-9_]+', 'script.js?v=20260725_v11_consistent', content)

with open('static/index.html', 'w', encoding='utf-8') as f:
    f.write(content)

print("UI consistency patched!")
