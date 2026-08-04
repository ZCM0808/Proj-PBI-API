import re

with open('static/script.js', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Clean up renderRightPanelBookmarkState
panel_old = """    function renderRightPanelBookmarkState(ep) {
        const bmSection = document.getElementById('right-panel-bm-section');
        const starBtn = document.getElementById('right-panel-bm-star');
        const pinBtn = document.getElementById('right-panel-bm-pin');
        const metaContainer = document.getElementById('right-panel-bm-meta');
        
        if (!bmSection) return;
        
        const bmData = getBookmarkMeta(ep.path, ep.method);
        const isBookmarked = !!bmData;
        const isPinned = isBookmarked && !!bmData.isPinned;
        
        bmSection.style.display = 'flex';
        
        starBtn.className = isBookmarked ? 'bookmark-btn active' : 'bookmark-btn';
        if (pinBtn) {
            pinBtn.style.display = isBookmarked ? 'inline-block' : 'none';
            pinBtn.className = isPinned ? 'bookmark-btn active' : 'bookmark-btn';
        }
        
        if (window.lastToggledBookmarkId === (ep.method + '_' + ep.path)) {
            starBtn.classList.add('pop-anim');
        }
        
        starBtn.onclick = (e) => {
            e.stopPropagation();
            toggleBookmark(ep, e);
            renderRightPanelBookmarkState(ep); // Refresh right panel
        };
        
        if (pinBtn) {
            pinBtn.onclick = (e) => {
                e.stopPropagation();
                togglePinBookmark(ep, e);
            };
        }"""
        
panel_new = """    function renderRightPanelBookmarkState(ep) {
        const bmSection = document.getElementById('right-panel-bm-section');
        const starBtn = document.getElementById('right-panel-bm-star');
        const metaContainer = document.getElementById('right-panel-bm-meta');
        
        if (!bmSection) return;
        
        const bmData = getBookmarkMeta(ep.path, ep.method);
        const isBookmarked = !!bmData;
        
        bmSection.style.display = 'flex';
        
        starBtn.className = isBookmarked ? 'bookmark-btn active' : 'bookmark-btn';
        
        if (window.lastToggledBookmarkId === (ep.method + '_' + ep.path)) {
            starBtn.classList.add('pop-anim');
        }
        
        starBtn.onclick = (e) => {
            e.stopPropagation();
            toggleBookmark(ep, e);
            renderRightPanelBookmarkState(ep); // Refresh right panel
        };"""

content = content.replace(panel_old, panel_new)

# 2. Update renderTree endpoint item HTML
tree_render_old = """                            <div class="endpoint-item ${activeClass}" data-path="${ep.path}" data-method="${ep.method}">
                                <span class="method ${ep.method}">${ep.method}</span>
                                <span class="path" title="${ep.summary || ep.path}">${ep.isPinned ? '📌 ' : ''}${ep.operationId || ep.path}</span>"""

tree_render_new = """                            <div class="endpoint-item ${activeClass}" data-path="${ep.path}" data-method="${ep.method}">
                                ${category === '⭐ 收藏夹' ? `<span class="tree-pin-btn" title="Toggle Pin" style="cursor: pointer; opacity: ${ep.isPinned ? '1' : '0.2'}; margin-right: 4px;">📌</span>` : ''}
                                <span class="method ${ep.method}">${ep.method}</span>
                                <span class="path" title="${ep.summary || ep.path}">${ep.operationId || ep.path}</span>"""

content = content.replace(tree_render_old, tree_render_new)

# 3. Inject event delegation for tree-pin-btn
event_old = """        if (item) {
            const method = item.getAttribute('data-method');
            const path = item.getAttribute('data-path');"""
            
event_new = """        if (e.target.classList.contains('tree-pin-btn')) {
            e.stopPropagation();
            const parent = e.target.closest('.endpoint-item');
            if (parent) {
                const ep = {
                    method: parent.getAttribute('data-method'),
                    path: parent.getAttribute('data-path')
                };
                togglePinBookmark(ep, e);
            }
            return;
        }
        
        if (item) {
            const method = item.getAttribute('data-method');
            const path = item.getAttribute('data-path');"""

content = content.replace(event_old, event_new)

with open('static/script.js', 'w', encoding='utf-8') as f:
    f.write(content)

print("Script.js patched for tree pin button.")
