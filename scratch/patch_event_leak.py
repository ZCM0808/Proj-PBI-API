import re

with open('static/script.js', 'r', encoding='utf-8') as f:
    content = f.read()

# Remove the inline makeDraggable from showCustomAlert and showCustomConfirm
content = re.sub(
    r'\s*if\s*\(\s*window\.makeDraggable\s*\)\s*\{\s*window\.makeDraggable\(\s*content\s*,\s*modal\.querySelector\(\'.modal-header\'\)\s*\);\s*\}',
    '',
    content
)

# Add the one-time initialization for custom-dialog-modal at the end or near other draggable inits
init_code = """
    // Initialize custom dialog draggable ONCE
    const customModal = document.getElementById('custom-dialog-modal');
    if (customModal && window.makeDraggable) {
        const customContent = customModal.querySelector('.modal-content');
        const customHeader = customModal.querySelector('.modal-header');
        if (customContent && customHeader) {
            window.makeDraggable(customContent, customHeader);
        }
    }
"""

if 'Initialize custom dialog draggable ONCE' not in content:
    content = content.replace(
        "// Global override of standard window.alert",
        init_code + "\n    // Global override of standard window.alert"
    )

# Cache busting
content = re.sub(r'script\.js\?v=\d+_[a-z0-9_]+', 'script.js?v=20260725_v12_leakfix', content)

with open('static/script.js', 'w', encoding='utf-8') as f:
    f.write(content)

with open('static/index.html', 'r', encoding='utf-8') as f:
    html = f.read()
html = re.sub(r'script\.js\?v=\d+_[a-z0-9_]+', 'script.js?v=20260725_v12_leakfix', html)
with open('static/index.html', 'w', encoding='utf-8') as f:
    f.write(html)

print("Event listener leak patched!")
