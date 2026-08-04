import re

with open('static/script.js', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Fix sorting
sort_old = """            }
            return bm;
        });
        
        // 伪造一个书签分类"""
        
sort_new = """            }
            return bm;
        }).sort((a, b) => (b.isPinned ? 1 : 0) - (a.isPinned ? 1 : 0));
        
        // 伪造一个书签分类"""
        
content = content.replace(sort_old, sort_new)

# 2. Fix HTML class and inline styles for tree-pin-btn
html_old = """                let pinBtnHtml = '';
                if (category.category === "⭐ 收藏夹 (Bookmarks)") {
                    const opacity = ep.isPinned ? '1.0' : '0.2';
                    pinBtnHtml = `<span class="tree-pin-btn" title="Toggle Pin" style="cursor:pointer; opacity:${opacity}; font-size:1.0rem; padding:0; user-select:none;">📌</span>`;
                }"""
                
html_new = """                let pinBtnHtml = '';
                if (category.category === "⭐ 收藏夹 (Bookmarks)") {
                    const pinClass = ep.isPinned ? 'pinned' : 'unpinned';
                    pinBtnHtml = `<span class="tree-pin-btn ${pinClass}" title="Toggle Pin" style="margin-right: 2px;">📌</span>`;
                }"""

content = content.replace(html_old, html_new)

with open('static/script.js', 'w', encoding='utf-8') as f:
    f.write(content)

print("Script.js patched for pin sorting and CSS classes.")
