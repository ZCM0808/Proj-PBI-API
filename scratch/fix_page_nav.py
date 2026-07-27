import re

with open('static/script.js', 'r', encoding='utf-8') as f:
    script = f.read()

old_logic = """                const pages = await currentEmbeddedReport.getPages();
                const activePage = pages.find(p => p.name === pId);
                if (!activePage) throw new Error("Page not found in embedded report");
                
                const visuals = await activePage.getVisuals();"""

new_logic = """                const pages = await currentEmbeddedReport.getPages();
                const activePage = pages.find(p => p.name === pId);
                if (!activePage) throw new Error("Page not found in embedded report");
                
                // 自动让下方的报表跳转到用户选定的页面
                try {
                    await activePage.setActive();
                } catch (e) {
                    console.log("Failed to set active page", e);
                }
                
                const visuals = await activePage.getVisuals();"""

if "activePage.setActive" not in script:
    script = script.replace(old_logic, new_logic)

script = re.sub(r'script\.js\?v=\d+_[a-zA-Z0-9_]+', 'script.js?v=20260726_v34_page_nav', script)

with open('static/script.js', 'w', encoding='utf-8') as f:
    f.write(script)

with open('static/index.html', 'r', encoding='utf-8') as f:
    html = f.read()
html = re.sub(r'script\.js\?v=\d+_[a-zA-Z0-9_]+', 'script.js?v=20260726_v34_page_nav', html)
with open('static/index.html', 'w', encoding='utf-8') as f:
    f.write(html)
