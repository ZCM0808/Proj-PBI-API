import re

with open('static/script.js', 'r', encoding='utf-8') as f:
    content = f.read()

# Patch 1: Sync history and theme on startup (inside syncBookmarksFromBackend)
sync_logic_old = """    function syncBookmarksFromBackend() {
        fetch('/api/bookmarks')
            .then(res => res.json())
            .then(data => {
                if (data.success && data.data !== null) {
                    localStorage.setItem('pbi-bookmarks', JSON.stringify(data.data));
                    const searchInput = document.getElementById('api-search-input');
                    if (typeof renderTree === 'function') {
                        renderTree(searchInput ? searchInput.value : "");
                    }
                }
            })
            .catch(e => console.error('Backend bookmarks sync failed', e));
    }
    syncBookmarksFromBackend();"""

sync_logic_new = """    function syncStateFromBackend() {
        // Sync Bookmarks
        fetch('/api/bookmarks')
            .then(res => res.json())
            .then(data => {
                if (data.success && data.data !== null) {
                    localStorage.setItem('pbi-bookmarks', JSON.stringify(data.data));
                    const searchInput = document.getElementById('api-search-input');
                    if (typeof renderTree === 'function') {
                        renderTree(searchInput ? searchInput.value : "");
                    }
                }
            }).catch(e => console.error('Backend bookmarks sync failed', e));

        // Sync History
        fetch('/api/db/history')
            .then(res => res.json())
            .then(data => {
                if (data.success && data.data !== null) {
                    localStorage.setItem('apiReqHistory', JSON.stringify(data.data));
                    if (typeof renderHistory === 'function') renderHistory();
                }
            }).catch(e => console.error('Backend history sync failed', e));

        // Sync Theme
        fetch('/api/db/kv/pbi-theme')
            .then(res => res.json())
            .then(data => {
                if (data.success && data.data !== null) {
                    localStorage.setItem('pbi-theme', data.data);
                    if (data.data === 'dark') {
                        document.documentElement.setAttribute('data-theme', 'dark');
                    } else {
                        document.documentElement.removeAttribute('data-theme');
                    }
                }
            }).catch(e => console.error('Backend theme sync failed', e));
    }
    syncStateFromBackend();"""

content = content.replace(sync_logic_old, sync_logic_new)

# Patch 2: Sync history on change (inside addHistory)
add_history_old = """    function addHistory(url, method, status, timeMs, reqBody, resBody) {
        const h = {
            id: Date.now(),
            url, method, status, timeMs,
            reqBody,
            resBody,
            timestamp: new Date().toISOString()
        };
        const history = getHistory();
        history.unshift(h);
        if (history.length > 50) history.pop();
        localStorage.setItem('apiReqHistory', JSON.stringify(history));
        renderHistory();
    }"""

add_history_new = """    function addHistory(url, method, status, timeMs, reqBody, resBody) {
        const h = {
            id: Date.now(),
            url, method, status, timeMs,
            reqBody,
            resBody,
            timestamp: new Date().toISOString()
        };
        const history = getHistory();
        history.unshift(h);
        if (history.length > 50) history.pop();
        localStorage.setItem('apiReqHistory', JSON.stringify(history));
        fetch('/api/db/history', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(history) }).catch(console.error);
        renderHistory();
    }"""

content = content.replace(add_history_old, add_history_new)

# Patch 3: Sync theme on change (inside theme toggler)
theme_toggle_old = """        if (isDark) {
            document.documentElement.removeAttribute('data-theme');
            localStorage.setItem('pbi-theme', 'light');
        } else {
            document.documentElement.setAttribute('data-theme', 'dark');
            localStorage.setItem('pbi-theme', 'dark');
        }"""

theme_toggle_new = """        if (isDark) {
            document.documentElement.removeAttribute('data-theme');
            localStorage.setItem('pbi-theme', 'light');
            fetch('/api/db/kv/pbi-theme', { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({value: 'light'}) }).catch(console.error);
        } else {
            document.documentElement.setAttribute('data-theme', 'dark');
            localStorage.setItem('pbi-theme', 'dark');
            fetch('/api/db/kv/pbi-theme', { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({value: 'dark'}) }).catch(console.error);
        }"""

content = content.replace(theme_toggle_old, theme_toggle_new)

with open('static/script.js', 'w', encoding='utf-8') as f:
    f.write(content)

print("Frontend KV + History sync patched.")
