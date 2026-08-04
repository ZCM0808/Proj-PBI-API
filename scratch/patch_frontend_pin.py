import re

with open('static/script.js', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Add togglePinBookmark
toggle_pin_logic = """
    function togglePinBookmark(ep, e) {
        if (e) e.stopPropagation();
        const bookmarks = getBookmarks();
        
        const cleanEpPath = (ep.path || '').replace("/v1.0/myorg", "");
        const index = bookmarks.findIndex(b => {
            const cleanBPath = (b.path || '').replace("/v1.0/myorg", "");
            return cleanBPath === cleanEpPath && (b.method || '').toUpperCase() === (ep.method || '').toUpperCase();
        });
        
        if (index >= 0) {
            bookmarks[index].isPinned = !bookmarks[index].isPinned;
            localStorage.setItem('pbi-bookmarks', JSON.stringify(bookmarks));
            fetch('/api/bookmarks', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(bookmarks) }).catch(console.error);
            window.lastToggledBookmarkId = ep.method + '_' + ep.path;
            const searchInput = document.getElementById('api-search-input');
            renderTree(searchInput ? searchInput.value : "");
            renderRightPanelBookmarkState(ep);
        }
    }
"""
if "togglePinBookmark" not in content:
    content = content.replace("function getBookmarkMeta", toggle_pin_logic + "\n    function getBookmarkMeta")

# 2. Update renderRightPanelBookmarkState
panel_logic_old = """    function renderRightPanelBookmarkState(ep) {
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

panel_logic_new = """    function renderRightPanelBookmarkState(ep) {
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
        
content = content.replace(panel_logic_old, panel_logic_new)

# 3. Update renderTree sorting
tree_sort_old = """        const bookmarks = rawBookmarks.map(bm => {
            return {
                path: bm.path,
                method: bm.method,
                summary: bm.summary || '',
                tags: bm.tags || [],
                operationId: bm.operationId || '',
                category: bm.category || 'Bookmarks'
            };
        });"""
        
tree_sort_new = """        const bookmarks = rawBookmarks.map(bm => {
            return {
                path: bm.path,
                method: bm.method,
                summary: bm.summary || '',
                tags: bm.tags || [],
                operationId: bm.operationId || '',
                category: bm.category || 'Bookmarks',
                isPinned: !!bm.isPinned
            };
        }).sort((a, b) => (b.isPinned ? 1 : 0) - (a.isPinned ? 1 : 0));"""

content = content.replace(tree_sort_old, tree_sort_new)

# 4. Render pin icon in tree
tree_render_old = """                            <div class="endpoint-item ${activeClass}" data-path="${ep.path}" data-method="${ep.method}">
                                <span class="method ${ep.method}">${ep.method}</span>
                                <span class="path" title="${ep.summary || ep.path}">${ep.operationId || ep.path}</span>"""
                                
tree_render_new = """                            <div class="endpoint-item ${activeClass}" data-path="${ep.path}" data-method="${ep.method}">
                                <span class="method ${ep.method}">${ep.method}</span>
                                <span class="path" title="${ep.summary || ep.path}">${ep.isPinned ? '📌 ' : ''}${ep.operationId || ep.path}</span>"""

content = content.replace(tree_render_old, tree_render_new)

with open('static/script.js', 'w', encoding='utf-8') as f:
    f.write(content)

print("Script.js patched for pinning functionality.")
