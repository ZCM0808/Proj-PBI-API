import re

with open('static/script.js', 'r', encoding='utf-8') as f:
    content = f.read()

old_logic = """        if (index >= 0) {
            bookmarks[index].isPinned = !bookmarks[index].isPinned;
            localStorage.setItem('pbi-bookmarks', JSON.stringify(bookmarks));"""
            
new_logic = """        if (index >= 0) {
            const isNowPinned = !bookmarks[index].isPinned;
            bookmarks[index].isPinned = isNowPinned;
            
            // Move newly pinned item to the very top (index 0)
            if (isNowPinned) {
                const pinnedItem = bookmarks.splice(index, 1)[0];
                bookmarks.unshift(pinnedItem);
            }
            
            localStorage.setItem('pbi-bookmarks', JSON.stringify(bookmarks));"""

content = content.replace(old_logic, new_logic)

with open('static/script.js', 'w', encoding='utf-8') as f:
    f.write(content)

print("togglePinBookmark logic updated to move pinned item to the top.")
