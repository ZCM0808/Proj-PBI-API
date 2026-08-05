import re

with open('static/script.js', 'r', encoding='utf-8') as f:
    content = f.read()

old_code = """        settingsForm.addEventListener('submit', async (e) => {
            e.preventDefault(); // 阻止默认，改为纯异步 submit 防止页面刷新
            saveSettingsBtn.disabled = true;
            saveSettingsBtn.textContent = '保存中...';"""

new_code = """        settingsForm.addEventListener('submit', async (e) => {
            e.preventDefault(); // 阻止默认，改为纯异步 submit 防止页面刷新
            
            // Fix button width to prevent shrinking when text changes
            const originalWidth = saveSettingsBtn.offsetWidth;
            saveSettingsBtn.style.width = originalWidth + 'px';
            
            saveSettingsBtn.disabled = true;
            saveSettingsBtn.textContent = '保存中...';"""

content = content.replace(old_code, new_code)

old_code2 = """                if (result.success) {
                    backendSettingsCache = { ...backendSettingsCache, ...payload };
                    saveSettingsBtn.textContent = '✓ 已保存';
                    setTimeout(() => {
                        settingsModal.style.display = 'none';
                        saveSettingsBtn.disabled = false;
                        saveSettingsBtn.textContent = '保存 全局配置 (Save & Apply)';
                    }, 1000);
                } else {
                    alert('保存失败: ' + result.message);
                    saveSettingsBtn.disabled = false;
                    saveSettingsBtn.textContent = '保存 全局配置 (Save & Apply)';
                }"""

new_code2 = """                if (result.success) {
                    backendSettingsCache = { ...backendSettingsCache, ...payload };
                    saveSettingsBtn.textContent = '✓ 已保存';
                    setTimeout(() => {
                        settingsModal.style.display = 'none';
                        saveSettingsBtn.disabled = false;
                        saveSettingsBtn.style.width = '';
                        saveSettingsBtn.textContent = '保存 全局配置 (Save & Apply)';
                    }, 1000);
                } else {
                    alert('保存失败: ' + result.message);
                    saveSettingsBtn.disabled = false;
                    saveSettingsBtn.style.width = '';
                    saveSettingsBtn.textContent = '保存 全局配置 (Save & Apply)';
                }"""
                
content = content.replace(old_code2, new_code2)

with open('static/script.js', 'w', encoding='utf-8') as f:
    f.write(content)

print("Fixed button width shrinking in settings form.")
