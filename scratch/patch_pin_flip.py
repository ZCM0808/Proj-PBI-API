import re

with open('static/script.js', 'r', encoding='utf-8') as f:
    content = f.read()

old_logic = """    function togglePinBookmark(ep, e) {
        if (e) e.stopPropagation();
        const bookmarks = getBookmarks();
        
        const cleanEpPath = (ep.path || '').replace("/v1.0/myorg", "");
        const index = bookmarks.findIndex(b => {
            const cleanBPath = (b.path || '').replace("/v1.0/myorg", "");
            return cleanBPath === cleanEpPath && (b.method || '').toUpperCase() === (ep.method || '').toUpperCase();
        });
        
        if (index >= 0) {
            const isNowPinned = !bookmarks[index].isPinned;
            bookmarks[index].isPinned = isNowPinned;
            
            // Move newly pinned item to the very top (index 0)
            if (isNowPinned) {
                const pinnedItem = bookmarks.splice(index, 1)[0];
                bookmarks.unshift(pinnedItem);
            }
            
            localStorage.setItem('pbi-bookmarks', JSON.stringify(bookmarks));
            fetch('/api/bookmarks', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(bookmarks) }).catch(console.error);
            window.lastToggledBookmarkId = ep.method + '_' + ep.path;
            const searchInput = document.getElementById('api-search-input');
            renderTree(searchInput ? searchInput.value : "");
            renderRightPanelBookmarkState(ep);
        }
    }"""
    
new_logic = """    function togglePinBookmark(ep, e) {
        if (e) e.stopPropagation();
        
        // --- FLIP Animation Start: First ---
        let firstRect = null;
        let clickedItemEl = null;
        if (e && e.target) {
            clickedItemEl = e.target.closest('.api-item');
            if (clickedItemEl) {
                firstRect = clickedItemEl.getBoundingClientRect();
            }
        }
        
        const bookmarks = getBookmarks();
        
        const cleanEpPath = (ep.path || '').replace("/v1.0/myorg", "");
        const index = bookmarks.findIndex(b => {
            const cleanBPath = (b.path || '').replace("/v1.0/myorg", "");
            return cleanBPath === cleanEpPath && (b.method || '').toUpperCase() === (ep.method || '').toUpperCase();
        });
        
        if (index >= 0) {
            const isNowPinned = !bookmarks[index].isPinned;
            bookmarks[index].isPinned = isNowPinned;
            
            // Move newly pinned item to the very top (index 0)
            if (isNowPinned) {
                const pinnedItem = bookmarks.splice(index, 1)[0];
                bookmarks.unshift(pinnedItem);
            }
            
            localStorage.setItem('pbi-bookmarks', JSON.stringify(bookmarks));
            fetch('/api/bookmarks', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(bookmarks) }).catch(console.error);
            window.lastToggledBookmarkId = ep.method + '_' + ep.path;
            const searchInput = document.getElementById('api-search-input');
            
            // --- FLIP Animation: Re-render ---
            renderTree(searchInput ? searchInput.value : "");
            
            // --- FLIP Animation: Last, Invert, Play ---
            if (firstRect && isNowPinned) {
                // Since bookmarks are the first category, and this item was unshifted to index 0,
                // it is guaranteed to be the first .api-item in the first .api-category
                const newEl = document.querySelector('.api-category:first-child .api-list .api-item:first-child');
                if (newEl) {
                    const lastRect = newEl.getBoundingClientRect();
                    const deltaY = firstRect.top - lastRect.top;
                    
                    // Invert
                    newEl.style.transition = 'none';
                    newEl.style.transform = `translateY(${deltaY}px)`;
                    newEl.style.zIndex = '100'; 
                    newEl.style.position = 'relative';
                    newEl.style.boxShadow = '0 10px 25px rgba(0,0,0,0.5)';
                    newEl.style.backgroundColor = 'var(--overlay-20)';
                    
                    // Play
                    requestAnimationFrame(() => {
                        requestAnimationFrame(() => {
                            newEl.style.transition = 'transform 0.5s cubic-bezier(0.2, 0.8, 0.2, 1), box-shadow 0.5s ease, background-color 0.5s ease';
                            newEl.style.transform = 'translateY(0)';
                            newEl.style.boxShadow = 'none';
                            newEl.style.backgroundColor = 'transparent';
                            
                            // Cleanup
                            setTimeout(() => {
                                newEl.style.transition = '';
                                newEl.style.transform = '';
                                newEl.style.zIndex = '';
                                newEl.style.position = '';
                                newEl.style.boxShadow = '';
                                newEl.style.backgroundColor = '';
                            }, 550);
                        });
                    });
                }
            }
            
            renderRightPanelBookmarkState(ep);
        }
    }"""

content = content.replace(old_logic, new_logic)

with open('static/script.js', 'w', encoding='utf-8') as f:
    f.write(content)

print("togglePinBookmark logic updated with FLIP animation.")
