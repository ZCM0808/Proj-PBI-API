import re

with open('static/index.html', 'r', encoding='utf-8') as f:
    content = f.read()

# Fix scan-modal width
content = re.sub(r'style="width:\s*500px;', 'style="width: 90%; max-width: 500px;', content)

# Fix custom-dialog-content width
content = re.sub(r'style="width:\s*400px;', 'style="width: 90%; max-width: 400px;', content)

# Fix ai-chat-window width and position for mobile
content = re.sub(
    r'right:\s*30px;\s*width:\s*350px;', 
    'right: 10px; width: calc(100vw - 20px); max-width: 380px;', 
    content
)

# Also fix the FAB button position to match
content = re.sub(
    r'right:\s*30px;\s*width:\s*56px;\s*height:\s*56px;',
    'right: 15px; width: 56px; height: 56px;',
    content
)

# Cache busting
content = re.sub(r'script\.js\?v=\d+_[a-z0-9_]+', 'script.js?v=20260725_v9_mobile', content)

with open('static/index.html', 'w', encoding='utf-8') as f:
    f.write(content)
print("Mobile responsiveness patched!")
