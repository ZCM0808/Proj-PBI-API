import re

with open('static/script.js', 'r', encoding='utf-8') as f:
    content = f.read()

# Fix the shrinking button issue
start_idx = content.find("saveSettingsBtn.disabled = true;\n            saveSettingsBtn.textContent = '保存中...';")
if start_idx != -1:
    old_snippet1 = "saveSettingsBtn.disabled = true;\n            saveSettingsBtn.textContent = '保存中...';"
    new_snippet1 = """const originalWidth = saveSettingsBtn.getBoundingClientRect().width;
            saveSettingsBtn.style.width = originalWidth + 'px';
            saveSettingsBtn.disabled = true;
            saveSettingsBtn.textContent = '保存中...';"""
    content = content.replace(old_snippet1, new_snippet1, 1)

# Fix the modal close animation and reset button width
old_snippet2 = """                    setTimeout(() => {
                        settingsModal.style.display = 'none';
                        saveSettingsBtn.disabled = false;
                        saveSettingsBtn.textContent = '💾 保存配置 (Save & Apply)';
                    }, 1000);"""
new_snippet2 = """                    setTimeout(() => {
                        settingsModal.classList.add('fade-out');
                        setTimeout(() => {
                            settingsModal.style.display = 'none';
                            settingsModal.classList.remove('fade-out');
                            saveSettingsBtn.disabled = false;
                            saveSettingsBtn.style.width = '';
                            saveSettingsBtn.textContent = '💾 保存配置 (Save & Apply)';
                        }, 250);
                    }, 800);"""
content = content.replace(old_snippet2, new_snippet2, 1)

# Also fix the error case button reset
old_snippet3 = """                    alert('保存失败: ' + result.message);
                    saveSettingsBtn.disabled = false;
                    saveSettingsBtn.textContent = '💾 保存配置 (Save & Apply)';"""
new_snippet3 = """                    alert('保存失败: ' + result.message);
                    saveSettingsBtn.disabled = false;
                    saveSettingsBtn.style.width = '';
                    saveSettingsBtn.textContent = '💾 保存配置 (Save & Apply)';"""
content = content.replace(old_snippet3, new_snippet3, 1)

old_snippet4 = """                alert('网络错误: ' + err);
                saveSettingsBtn.disabled = false;
                saveSettingsBtn.textContent = '💾 保存配置 (Save & Apply)';"""
new_snippet4 = """                alert('网络错误: ' + err);
                saveSettingsBtn.disabled = false;
                saveSettingsBtn.style.width = '';
                saveSettingsBtn.textContent = '💾 保存配置 (Save & Apply)';"""
content = content.replace(old_snippet4, new_snippet4, 1)


# Fix the "X" button and backdrop click close animation
# Search for `closeSettingsBtn.onclick` or `window.onclick` related to settingsModal
# Using regex to replace the exact lines
old_close = """        closeSettingsBtn.onclick = () => {
            settingsModal.style.display = 'none';
        };"""
new_close = """        closeSettingsBtn.onclick = () => {
            settingsModal.classList.add('fade-out');
            setTimeout(() => {
                settingsModal.style.display = 'none';
                settingsModal.classList.remove('fade-out');
            }, 250);
        };"""
content = content.replace(old_close, new_close)

with open('static/script.js', 'w', encoding='utf-8') as f:
    f.write(content)

print("script.js patched with fix for shrinking button and modal animation.")
