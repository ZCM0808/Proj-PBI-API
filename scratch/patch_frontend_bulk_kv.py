import re

with open('static/script.js', 'r', encoding='utf-8') as f:
    content = f.read()

# Patch 1: Override localStorage.setItem
interceptor = """    // --- KV Store Interceptor ---
    const originalSetItem = localStorage.setItem;
    localStorage.setItem = function(key, value) {
        originalSetItem.apply(this, arguments);
        const ignoredKeys = ['pbi-sidebar-width', 'pbi-request-height', 'pbi-details-collapsed', 'apiReqHistory', 'pbi-bookmarks'];
        if (!ignoredKeys.includes(key)) {
            fetch(`/api/db/kv/${key}`, { 
                method: 'POST', 
                headers: {'Content-Type': 'application/json'}, 
                body: JSON.stringify({value: value}) 
            }).catch(e => console.error('KV sync error:', e));
        }
    };
    // ----------------------------
"""

if "KV Store Interceptor" not in content:
    content = content.replace("document.addEventListener('DOMContentLoaded', () => {", "document.addEventListener('DOMContentLoaded', () => {\n" + interceptor)


# Patch 2: Add bulk KV sync in syncStateFromBackend
bulk_sync = """
        // Sync Bulk KV (Everything else)
        fetch('/api/db/kv')
            .then(res => res.json())
            .then(data => {
                if (data.success && data.data !== null) {
                    for (const [key, value] of Object.entries(data.data)) {
                        originalSetItem.call(localStorage, key, value);
                    }
                }
            }).catch(e => console.error('Backend bulk KV sync failed', e));"""

if "Sync Bulk KV" not in content:
    content = content.replace("syncStateFromBackend() {\n", "syncStateFromBackend() {\n" + bulk_sync)

with open('static/script.js', 'w', encoding='utf-8') as f:
    f.write(content)

print("Frontend bulk KV interceptor and sync added.")
