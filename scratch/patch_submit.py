import re

with open('static/script.js', 'r', encoding='utf-8') as f:
    script = f.read()

# Disable proceedBtn on click
replacement = """        proceedBtn.addEventListener('click', () => {
            proceedBtn.disabled = true; // Extreme Boundary Defense: prevent double submit
            proceedBtn.style.opacity = '0.5';
            hideModalWithAnimation();
            executeRequest();
        });"""

script = re.sub(
    r"        proceedBtn\.addEventListener\('click', \(\) => \{\s*hideModalWithAnimation\(\);\s*executeRequest\(\);\s*\}\);",
    replacement,
    script
)

# Enable proceedBtn when shown
replacement2 = """                modal.style.display = 'flex';
                modal.offsetHeight; // force reflow
                modal.classList.add('show');
                proceedBtn.disabled = false; // re-enable button
                proceedBtn.style.opacity = '1';"""

script = re.sub(
    r"                modal\.style\.display = 'flex';\s*modal\.offsetHeight;\s*//\s*.*?\s*modal\.classList\.add\('show'\);",
    replacement2,
    script
)

# Also fix the double submit for other Custom Confirm dialogs (showCustomConfirm ok button)
# In showCustomConfirm:
# document.getElementById('custom-confirm-ok-btn').onclick = () => close(true);
replacement3 = """            document.getElementById('custom-confirm-ok-btn').onclick = function() {
                this.disabled = true;
                this.style.opacity = '0.5';
                close(true);
            };"""

script = re.sub(
    r"            document\.getElementById\('custom-confirm-ok-btn'\)\.onclick = \(\) => close\(true\);",
    replacement3,
    script
)


script = re.sub(r'script\.js\?v=\d+_[a-z0-9_]+', 'script.js?v=20260725_v16_doubleSubmit', script)

with open('static/script.js', 'w', encoding='utf-8') as f:
    f.write(script)

with open('static/index.html', 'r', encoding='utf-8') as f:
    html = f.read()
html = re.sub(r'script\.js\?v=\d+_[a-z0-9_]+', 'script.js?v=20260725_v16_doubleSubmit', html)
with open('static/index.html', 'w', encoding='utf-8') as f:
    f.write(html)

print("Double submit and concurrency bounds fixed!")
