import re

with open('static/script.js', 'r', encoding='utf-8') as f:
    content = f.read()

old_logic = """        if (index >= 0) {
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
    
new_logic = """        if (index >= 0) {
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

content = content.replace(old_logic, new_logic)

with open('static/script.js', 'w', encoding='utf-8') as f:
    f.write(content)

print("togglePinBookmark updated with elegant collapse/expand animation.")
