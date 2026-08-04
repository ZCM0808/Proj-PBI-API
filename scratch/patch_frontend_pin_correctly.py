import re

with open('static/script.js', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Add isPinned when merging bookmarks
merge_old = """                if (found) return { ...found, category: cat.category };"""
merge_new = """                if (found) return { ...found, category: cat.category, isPinned: !!bm.isPinned };"""
content = content.replace(merge_old, merge_new)

# 2. Add pin HTML logic
html_old = """                    if (alias) metaHtml += `<span class="bm-alias">${alias}</span>`;
                    tags.forEach(t => metaHtml += `<span class="bm-tag">${t}</span>`);
                    editBtnHtml = `<button class="bm-edit-btn" title="Edit alias & tags">✏️</button>`;
                }
                
                const metaRowClass = metaHtml ? 'bm-meta-row has-content' : 'bm-meta-row empty';

                nameEl.innerHTML = `
                    <div style="display:flex; align-items:center; margin-bottom: 4px; flex-wrap: wrap; gap: 4px;">
                        <strong style="color:var(--text-primary); font-weight: 600; font-size: 0.85rem;">${primaryName}</strong>
                        ${categoryBadgeHtml}
                        ${editBtnHtml}
                    </div>"""
                    
html_new = """                    if (alias) metaHtml += `<span class="bm-alias">${alias}</span>`;
                    tags.forEach(t => metaHtml += `<span class="bm-tag">${t}</span>`);
                    editBtnHtml = `<button class="bm-edit-btn" title="Edit alias & tags">✏️</button>`;
                }
                
                let pinBtnHtml = '';
                if (category.category === "⭐ 收藏夹 (Bookmarks)") {
                    const opacity = ep.isPinned ? '1.0' : '0.2';
                    pinBtnHtml = `<span class="tree-pin-btn" title="Toggle Pin" style="cursor:pointer; opacity:${opacity}; font-size:1.0rem; padding:0; user-select:none;">📌</span>`;
                }
                
                const metaRowClass = metaHtml ? 'bm-meta-row has-content' : 'bm-meta-row empty';

                nameEl.innerHTML = `
                    <div style="display:flex; align-items:center; margin-bottom: 4px; flex-wrap: wrap; gap: 4px;">
                        ${pinBtnHtml}
                        <strong style="color:var(--text-primary); font-weight: 600; font-size: 0.85rem;">${primaryName}</strong>
                        ${categoryBadgeHtml}
                        ${editBtnHtml}
                    </div>"""
content = content.replace(html_old, html_new)

# 3. Add to nameEl event listener
event_old = """                // Bind edit button
                const editBtn = nameEl.querySelector('.bm-edit-btn');"""
                
event_new = """                // Bind pin button
                const pinBtn = nameEl.querySelector('.tree-pin-btn');
                if (pinBtn) {
                    pinBtn.onclick = (e) => {
                        e.stopPropagation();
                        togglePinBookmark(ep, e);
                    };
                }

                // Bind edit button
                const editBtn = nameEl.querySelector('.bm-edit-btn');"""
content = content.replace(event_old, event_new)

with open('static/script.js', 'w', encoding='utf-8') as f:
    f.write(content)

print("Script.js successfully patched for tree pin button.")
