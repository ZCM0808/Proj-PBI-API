import os

STYLE_FILE = 'static/style.css'
JS_FILE = 'static/snapshots.js'

# 1. Append CSS
css_block = """
/* Snapshot Dropdown */
.snapshot-dropdown-trigger {
    display: flex; justify-content: space-between; align-items: center;
    background: var(--input-bg);
    border: 1px solid var(--panel-border);
    padding: 6px 10px; border-radius: 6px;
    font-size: 0.8rem; color: var(--text-primary);
    cursor: pointer; transition: all 0.2s;
}
.snapshot-dropdown-trigger:hover {
    border-color: var(--accent);
}
.snapshot-dropdown-menu {
    position: absolute; top: 100%; left: 0; right: 0;
    margin-top: 4px;
    background: var(--bg-primary);
    border: 1px solid var(--panel-border);
    border-radius: 6px;
    box-shadow: 0 4px 12px rgba(0,0,0,0.3);
    z-index: 100;
    max-height: 220px;
    overflow-y: auto;
    opacity: 0; transform: translateY(-5px);
    transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
    pointer-events: none;
    display: flex; flex-direction: column;
}
.snapshot-dropdown-menu.show {
    opacity: 1; transform: translateY(0); pointer-events: auto;
}
.snapshot-dropdown-item {
    display: flex; justify-content: space-between; align-items: center;
    padding: 8px 10px; border-bottom: 1px solid var(--panel-border);
    font-size: 0.75rem; color: var(--text-secondary);
    cursor: pointer; transition: background 0.2s;
}
.snapshot-dropdown-item:last-child { border-bottom: none; }
.snapshot-dropdown-item:hover {
    background: var(--overlay-10); color: var(--text-primary);
}
.snapshot-dropdown-item.active {
    background: rgba(167, 139, 250, 0.1); color: #a78bfa; border-left: 3px solid #a78bfa;
}
.dropdown-item-name {
    flex-grow: 1; outline: none; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; padding-right: 8px;
}
.dropdown-item-name[contenteditable="true"] {
    background: var(--input-bg); padding: 2px 4px; border-radius: 4px; border: 1px solid var(--accent); color: var(--text-primary);
}
.dropdown-item-actions {
    display: flex; gap: 4px; opacity: 0; transition: opacity 0.2s; flex-shrink: 0;
}
.snapshot-dropdown-item:hover .dropdown-item-actions,
.snapshot-dropdown-item.active .dropdown-item-actions {
    opacity: 1;
}
.dropdown-chevron {
    width: 16px; height: 16px; fill: currentColor; transition: transform 0.2s;
}
.dropdown-chevron.open { transform: rotate(180deg); }
"""

with open(STYLE_FILE, 'r', encoding='utf-8') as f:
    content = f.read()

if '.snapshot-dropdown-trigger' not in content:
    with open(STYLE_FILE, 'a', encoding='utf-8') as f:
        f.write("\n" + css_block)
    print("Patched style.css")

# 2. Rewrite snapshots.js
js_content = """// Auth Snapshots Logic
(function() {
    let snapshots = JSON.parse(localStorage.getItem('pbi_auth_snapshots') || '[]');
    let activeSnapshotId = localStorage.getItem('pbi_active_snapshot_id');
    let dropdownOpen = false;

    function saveSnapshots() {
        localStorage.setItem('pbi_auth_snapshots', JSON.stringify(snapshots));
        if (activeSnapshotId) {
            localStorage.setItem('pbi_active_snapshot_id', activeSnapshotId);
        } else {
            localStorage.removeItem('pbi_active_snapshot_id');
        }
    }

    function renderSnapshots() {
        const menu = document.getElementById('snapshot-dropdown-menu');
        const triggerText = document.getElementById('active-snapshot-text');
        if (!menu || !triggerText) return;
        
        menu.innerHTML = '';
        
        if (snapshots.length === 0) {
            triggerText.textContent = "尚未保存任何快照...";
            triggerText.style.color = "var(--text-tertiary)";
            menu.innerHTML = '<div style="padding: 12px; font-size:0.75rem; color:var(--text-tertiary); text-align:center; font-style:italic;">No snapshots saved yet.</div>';
            return;
        }

        const activeSnap = snapshots.find(s => s.id === activeSnapshotId);
        if (activeSnap) {
            triggerText.textContent = activeSnap.name;
            triggerText.style.color = "var(--text-primary)";
            triggerText.style.fontStyle = "normal";
            triggerText.style.fontWeight = "bold";
        } else {
            triggerText.textContent = "选择或保存快照...";
            triggerText.style.color = "var(--text-secondary)";
            triggerText.style.fontStyle = "italic";
            triggerText.style.fontWeight = "normal";
        }

        snapshots.forEach(snap => {
            const item = document.createElement('div');
            item.className = 'snapshot-dropdown-item' + (snap.id === activeSnapshotId ? ' active' : '');
            
            const nameSpan = document.createElement('span');
            nameSpan.className = 'dropdown-item-name';
            nameSpan.textContent = snap.name;
            nameSpan.title = "Double click to rename";
            
            const actions = document.createElement('div');
            actions.className = 'dropdown-item-actions';
            
            const editBtn = document.createElement('button');
            editBtn.className = 'chip-btn';
            editBtn.innerHTML = '✏️';
            editBtn.title = "Rename";
            editBtn.type = "button";
            
            const delBtn = document.createElement('button');
            delBtn.className = 'chip-btn delete';
            delBtn.innerHTML = '❌';
            delBtn.title = "Delete";
            delBtn.type = "button";

            // Rename Logic
            const startEdit = (e) => {
                e.stopPropagation();
                nameSpan.contentEditable = 'true';
                nameSpan.focus();
                const sel = window.getSelection();
                sel.selectAllChildren(nameSpan);
                sel.collapseToEnd();
            };
            
            const finishEdit = () => {
                nameSpan.contentEditable = 'false';
                const newName = nameSpan.textContent.trim();
                
                if (newName && newName !== snap.name) {
                    const isDuplicate = snapshots.some(s => s.id !== snap.id && s.name.toLowerCase() === newName.toLowerCase());
                    if (isDuplicate) {
                        alert(`别名 "${newName}" 已存在，请换一个名称！`);
                        nameSpan.textContent = snap.name; // 恢复原名
                    } else {
                        snap.name = newName;
                        saveSnapshots();
                        renderSnapshots(); // re-render to update trigger text if active
                    }
                } else {
                    nameSpan.textContent = snap.name; // revert
                }
            };
            
            editBtn.onclick = startEdit;
            nameSpan.ondblclick = startEdit;
            nameSpan.onblur = finishEdit;
            nameSpan.onkeydown = (e) => {
                if (e.key === 'Enter') { e.preventDefault(); finishEdit(); }
                if (e.key === 'Escape') { nameSpan.textContent = snap.name; finishEdit(); }
            };
            // Prevent clicking name from triggering item click if editing
            nameSpan.onclick = (e) => {
                if (nameSpan.contentEditable === 'true') e.stopPropagation();
            }

            // Delete Logic
            delBtn.onclick = (e) => {
                e.stopPropagation();
                if (confirm(`删除快照 "${snap.name}"?`)) {
                    snapshots = snapshots.filter(s => s.id !== snap.id);
                    if (activeSnapshotId === snap.id) activeSnapshotId = null;
                    saveSnapshots();
                    renderSnapshots();
                }
            };

            // Apply Logic
            item.onclick = (e) => {
                if (nameSpan.contentEditable === 'true') return;
                activeSnapshotId = snap.id;
                saveSnapshots();
                renderSnapshots();
                closeDropdown();
                
                // Fill form
                document.getElementById('set-client').value = snap.clientId || '';
                document.getElementById('set-secret').value = snap.clientSecret || '';
                document.getElementById('set-username').value = snap.username || '';
                document.getElementById('set-password').value = snap.password || '';
                document.getElementById('set-tenant').value = snap.tenantId || '';
                
                const authModeRadios = document.getElementsByName('pbi_auth_mode');
                for (let radio of authModeRadios) {
                    radio.checked = (radio.value === snap.authMode);
                }
                
                // Trigger flash animation for micro-interaction feedback
                ['set-client', 'set-secret', 'set-username', 'set-password', 'set-tenant'].forEach(id => {
                    const el = document.getElementById(id);
                    if(el && el.value) {
                        el.classList.remove('snapshot-flash');
                        void el.offsetWidth; // trigger reflow
                        el.classList.add('snapshot-flash');
                    }
                });
            };

            item.appendChild(nameSpan);
            actions.appendChild(editBtn);
            actions.appendChild(delBtn);
            item.appendChild(actions);
            menu.appendChild(item);
        });
    }

    function toggleDropdown(e) {
        if(e) e.stopPropagation();
        const menu = document.getElementById('snapshot-dropdown-menu');
        const chevron = document.querySelector('.dropdown-chevron');
        if (!menu) return;
        
        dropdownOpen = !dropdownOpen;
        if (dropdownOpen) {
            menu.style.display = 'flex';
            // small delay to allow display:flex to apply before opacity transition
            requestAnimationFrame(() => {
                menu.classList.add('show');
                if(chevron) chevron.classList.add('open');
            });
        } else {
            closeDropdown();
        }
    }

    function closeDropdown() {
        dropdownOpen = false;
        const menu = document.getElementById('snapshot-dropdown-menu');
        const chevron = document.querySelector('.dropdown-chevron');
        if (menu) {
            menu.classList.remove('show');
            if(chevron) chevron.classList.remove('open');
            setTimeout(() => {
                if(!dropdownOpen) menu.style.display = 'none';
            }, 200); // match css transition time
        }
    }

    function getCurrentConfig() {
        let authMode = 'service_principal';
        const authModeRadios = document.getElementsByName('pbi_auth_mode');
        for (let radio of authModeRadios) {
            if (radio.checked) authMode = radio.value;
        }
        return {
            clientId: document.getElementById('set-client').value.trim(),
            clientSecret: document.getElementById('set-secret').value.trim(),
            username: document.getElementById('set-username').value.trim(),
            password: document.getElementById('set-password').value.trim(),
            tenantId: document.getElementById('set-tenant').value.trim(),
            authMode: authMode
        };
    }

    window.saveAuthSnapshot = function(customName = null) {
        const config = getCurrentConfig();
        if (!config.clientId || !config.tenantId) {
            console.warn('Cannot save snapshot: Missing Client ID or Tenant ID.');
            return;
        }
        
        // Check if identical config exists
        const existing = snapshots.find(s => 
            s.clientId === config.clientId && 
            s.clientSecret === config.clientSecret &&
            s.username === config.username &&
            s.password === config.password &&
            s.tenantId === config.tenantId &&
            s.authMode === config.authMode
        );

        if (existing) {
            activeSnapshotId = existing.id;
            if (customName && customName !== existing.name) {
                let finalName = customName;
                let counter = 1;
                while (snapshots.some(s => s.id !== existing.id && s.name.toLowerCase() === finalName.toLowerCase())) {
                    finalName = `${customName} (${counter})`;
                    counter++;
                }
                existing.name = finalName;
            }
            saveSnapshots();
            renderSnapshots();
            return;
        }

        let finalName = customName || `Profile ${snapshots.length + 1}`;
        let counter = 1;
        let baseName = finalName;
        while (snapshots.some(s => s.name.toLowerCase() === finalName.toLowerCase())) {
            finalName = `${baseName} (${counter})`;
            counter++;
        }

        const newSnap = {
            id: 'snap_' + Date.now() + '_' + Math.floor(Math.random()*1000),
            name: finalName,
            ...config
        };
        snapshots.push(newSnap);
        activeSnapshotId = newSnap.id;
        saveSnapshots();
        renderSnapshots();
    };

    // Initialize
    setTimeout(() => {
        const btnSave = document.getElementById('btn-save-snapshot');
        if (btnSave) {
            btnSave.onclick = () => {
                const name = prompt('为当前配置起一个名字:', `Profile ${snapshots.length + 1}`);
                if (name !== null) window.saveAuthSnapshot(name.trim() || undefined);
            };
        }
        
        const trigger = document.getElementById('snapshot-dropdown-trigger');
        if (trigger) {
            trigger.onclick = toggleDropdown;
        }
        
        // Close dropdown when clicking outside
        document.addEventListener('click', (e) => {
            const wrapper = document.getElementById('snapshot-dropdown-wrapper');
            if (wrapper && !wrapper.contains(e.target)) {
                closeDropdown();
            }
        });
        
        renderSnapshots();
    }, 500);
})();
"""

with open(JS_FILE, 'w', encoding='utf-8') as f:
    f.write(js_content)
print("Patched snapshots.js")
