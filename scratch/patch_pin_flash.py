import re

with open('static/script.js', 'r', encoding='utf-8') as f:
    content = f.read()

old_logic = """    function togglePinBookmark(ep, e) {
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
            
            if (isNowPinned && clickedItemEl) {
                // Elegant Collapse Animation for old item
                clickedItemEl.style.transition = 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)';
                clickedItemEl.style.transform = 'scale(0.95) translateX(-15px)';
                clickedItemEl.style.opacity = '0';
                clickedItemEl.style.maxHeight = '0px';
                clickedItemEl.style.paddingTop = '0px';
                clickedItemEl.style.paddingBottom = '0px';
                clickedItemEl.style.marginTop = '0px';
                clickedItemEl.style.marginBottom = '0px';
                clickedItemEl.style.borderWidth = '0px';
                clickedItemEl.style.overflow = 'hidden';
                
                setTimeout(() => {
                    renderTree(searchInput ? searchInput.value : "");
                    // Elegant Expand & Bounce Animation for new item at top
                    const newEl = document.querySelector('.api-category:first-child .api-list .api-item:first-child');
                    if (newEl) {
                        const originalHeight = newEl.offsetHeight;
                        newEl.style.transition = 'none';
                        newEl.style.maxHeight = '0px';
                        newEl.style.opacity = '0';
                        newEl.style.transform = 'translateY(-20px) scale(0.95)';
                        newEl.style.overflow = 'hidden';
                        newEl.style.backgroundColor = 'var(--overlay-10)';
                        
                        requestAnimationFrame(() => {
                            requestAnimationFrame(() => {
                                // Bouncy spring curve
                                newEl.style.transition = 'all 0.5s cubic-bezier(0.34, 1.56, 0.64, 1)';
                                newEl.style.maxHeight = (originalHeight + 50) + 'px';
                                newEl.style.opacity = '1';
                                newEl.style.transform = 'translateY(0) scale(1)';
                                newEl.style.backgroundColor = 'transparent';
                                
                                setTimeout(() => {
                                    newEl.style.transition = '';
                                    newEl.style.maxHeight = '';
                                    newEl.style.overflow = '';
                                    newEl.style.transform = '';
                                    newEl.style.backgroundColor = '';
                                }, 500);
                            });
                        });
                    }
                    renderRightPanelBookmarkState(ep);
                }, 280);
            } else {
                renderTree(searchInput ? searchInput.value : "");
                renderRightPanelBookmarkState(ep);
            }
        }
    }"""
    
new_logic = """    function togglePinBookmark(ep, e) {
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
            
            // 立即渲染，没有任何阻碍动画
            renderTree(searchInput ? searchInput.value : "");
            renderRightPanelBookmarkState(ep);
            
            if (isNowPinned) {
                // 定位到第一个元素
                const newEl = document.querySelector('.api-category:first-child .api-list .api-item:first-child');
                if (newEl) {
                    // 跳转至元素
                    newEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    
                    // 闪烁两次以提供明确的成功反馈
                    newEl.style.animation = 'flashBlink 0.4s ease-in-out 2';
                    setTimeout(() => {
                        newEl.style.animation = '';
                    }, 850);
                }
            }
        }
    }"""

content = content.replace(old_logic, new_logic)

with open('static/script.js', 'w', encoding='utf-8') as f:
    f.write(content)

print("togglePinBookmark updated with jump & flash animation.")
