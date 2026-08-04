import re

with open('static/script.js', 'r', encoding='utf-8') as f:
    content = f.read()

# Replace the HTML generation for the pin button
html_old = """                let pinBtnHtml = '';
                if (category.category === "⭐ 收藏夹 (Bookmarks)") {
                    const pinClass = ep.isPinned ? 'pinned' : 'unpinned';
                    pinBtnHtml = `<span class="tree-pin-btn ${pinClass}" title="Toggle Pin" style="margin-right: 2px;">📌</span>`;
                }"""
                
html_new = """                let pinBtnHtml = '';
                if (category.category === "⭐ 收藏夹 (Bookmarks)") {
                    const pinClass = ep.isPinned ? 'pinned' : 'unpinned';
                    const pinIcon = ep.isPinned ? '📍' : '📌';
                    pinBtnHtml = `<span class="tree-pin-btn ${pinClass}" title="Toggle Pin" style="margin-right: 2px; font-size: 1.1rem;">${pinIcon}</span>`;
                }"""

content = content.replace(html_old, html_new)

with open('static/script.js', 'w', encoding='utf-8') as f:
    f.write(content)

print("Script.js patched for explicit emoji swapping.")
