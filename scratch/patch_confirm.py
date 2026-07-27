import re

with open('static/script.js', 'r', encoding='utf-8') as f:
    script = f.read()

# Fix showCustomConfirm
replacement = """
            document.getElementById('custom-confirm-cancel-btn').onclick = () => close(false);
            document.getElementById('custom-confirm-ok-btn').onclick = () => close(true);
            
            // Animation logic to show
            modal.style.visibility = 'visible';
            modal.style.opacity = '1';
            content.style.transform = 'scale(1)';
        });
"""

script = re.sub(
    r"\s*document\.getElementById\('custom-confirm-cancel-btn'\)\.onclick = \(\) => close\(false\);\s*document\.getElementById\('custom-confirm-ok-btn'\)\.onclick = \(\) => close\(true\);\s*(modal\.style\.display = 'flex';)?\s*\}\);",
    replacement,
    script
)

# Fix close method in showCustomConfirm
script = re.sub(
    r"\s*const close = \(result\) => \{\s*modal\.style\.display = 'none';\s*resolve\(result\);\s*\};",
    """
            const close = (result) => {
                modal.style.opacity = '0';
                content.style.transform = 'scale(0.95)';
                setTimeout(() => { modal.style.visibility = 'hidden'; }, 250);
                resolve(result);
            };
""",
    script
)

script = re.sub(r'script\.js\?v=\d+_[a-z0-9_]+', 'script.js?v=20260725_v14_fixConfirm', script)

with open('static/script.js', 'w', encoding='utf-8') as f:
    f.write(script)

# Cache busting in HTML
with open('static/index.html', 'r', encoding='utf-8') as f:
    html = f.read()
html = re.sub(r'script\.js\?v=\d+_[a-z0-9_]+', 'script.js?v=20260725_v14_fixConfirm', html)
with open('static/index.html', 'w', encoding='utf-8') as f:
    f.write(html)

print("showCustomConfirm patched!")
