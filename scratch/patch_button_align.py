import re

with open('static/script.js', 'r', encoding='utf-8') as f:
    content = f.read()

old_snippet1 = """            const rect = saveSettingsBtn.getBoundingClientRect();
            saveSettingsBtn.style.minWidth = rect.width + 'px';
            saveSettingsBtn.style.minHeight = rect.height + 'px';
            saveSettingsBtn.style.boxSizing = 'border-box';"""
new_snippet1 = """            const rect = saveSettingsBtn.getBoundingClientRect();
            saveSettingsBtn.style.width = rect.width + 'px';
            saveSettingsBtn.style.height = rect.height + 'px';
            saveSettingsBtn.style.boxSizing = 'border-box';
            saveSettingsBtn.style.justifyContent = 'center';"""
            
if old_snippet1 in content:
    content = content.replace(old_snippet1, new_snippet1)
else:
    print("Could not find height snippet 1")

old_reset1 = """                            saveSettingsBtn.style.minWidth = '';
                            saveSettingsBtn.style.minHeight = '';
                            saveSettingsBtn.style.boxSizing = '';
                            saveSettingsBtn.textContent = '💾 保存配置 (Save & Apply)';"""
new_reset1 = """                            saveSettingsBtn.style.width = '';
                            saveSettingsBtn.style.height = '';
                            saveSettingsBtn.style.boxSizing = '';
                            saveSettingsBtn.style.justifyContent = '';
                            saveSettingsBtn.textContent = '💾 保存配置 (Save & Apply)';"""
content = content.replace(old_reset1, new_reset1)

old_reset2 = """                    saveSettingsBtn.style.minWidth = '';
                    saveSettingsBtn.style.minHeight = '';
                    saveSettingsBtn.style.boxSizing = '';
                    saveSettingsBtn.textContent = '💾 保存配置 (Save & Apply)';"""
new_reset2 = """                    saveSettingsBtn.style.width = '';
                    saveSettingsBtn.style.height = '';
                    saveSettingsBtn.style.boxSizing = '';
                    saveSettingsBtn.style.justifyContent = '';
                    saveSettingsBtn.textContent = '💾 保存配置 (Save & Apply)';"""
content = content.replace(old_reset2, new_reset2)

with open('static/script.js', 'w', encoding='utf-8') as f:
    f.write(content)

with open('static/index.html', 'r', encoding='utf-8') as f:
    html = f.read()
html = html.replace('v203', 'v204')
with open('static/index.html', 'w', encoding='utf-8') as f:
    f.write(html)

print("Button width, height and alignment fixed. Version bumped to v204.")
