import re

# 1. Update index.html for custom-dialog-modal transition
with open('static/index.html', 'r', encoding='utf-8') as f:
    html = f.read()

# Make custom-dialog-modal animated
replacement = '    <div id="custom-dialog-modal" class="modal-overlay" style="display: flex; z-index: 100000; opacity: 0; visibility: hidden; transition: opacity 0.25s ease;">\n        <div class="modal-content glass-panel" style="width: 90%; max-width: 400px; padding: 20px; position: relative; transform: scale(0.95); transition: transform 0.25s cubic-bezier(0.175, 0.885, 0.32, 1.275);" id="custom-dialog-content">'

html = re.sub(
    r'    <div id="custom-dialog-modal" class="modal-overlay" style="display: none; z-index: 100000;">\n        <div class="modal-content glass-panel" style="width: 90%; max-width: 400px; padding: 20px; position: relative;" id="custom-dialog-content">',
    replacement,
    html
)

html = re.sub(r'script\.js\?v=\d+_[a-z0-9_]+', 'script.js?v=20260725_v13_animated', html)

with open('static/index.html', 'w', encoding='utf-8') as f:
    f.write(html)

# 2. Update script.js for custom-dialog-modal animation logic
with open('static/script.js', 'r', encoding='utf-8') as f:
    script = f.read()

# Update showCustomAlert
alert_logic = """
            // Animation logic
            modal.style.visibility = 'visible';
            modal.style.opacity = '1';
            content.style.transform = 'scale(1)';
            
            const close = () => {
                modal.style.opacity = '0';
                content.style.transform = 'scale(0.95)';
                setTimeout(() => { modal.style.visibility = 'hidden'; }, 250);
                resolve();
            };
"""

script = re.sub(
    r'\s*modal\.style\.display = \'flex\';\s*const close = \(\) => \{\s*modal\.style\.display = \'none\';\s*resolve\(\);\s*\};',
    alert_logic,
    script
)

# Replace again for showCustomConfirm
script = re.sub(
    r'\s*modal\.style\.display = \'flex\';\s*const close = \(result\) => \{\s*modal\.style\.display = \'none\';\s*resolve\(result\);\s*\};',
    """
            // Animation logic
            modal.style.visibility = 'visible';
            modal.style.opacity = '1';
            content.style.transform = 'scale(1)';
            
            const close = (result) => {
                modal.style.opacity = '0';
                content.style.transform = 'scale(0.95)';
                setTimeout(() => { modal.style.visibility = 'hidden'; }, 250);
                resolve(result);
            };
""",
    script
)

script = re.sub(r'script\.js\?v=\d+_[a-z0-9_]+', 'script.js?v=20260725_v13_animated', script)

with open('static/script.js', 'w', encoding='utf-8') as f:
    f.write(script)

print("Custom dialog animations patched!")
