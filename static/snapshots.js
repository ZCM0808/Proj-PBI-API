// Auth Snapshots Logic
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
            editBtn.innerHTML = '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"></path></svg>';
            editBtn.title = "Rename";
            editBtn.type = "button";
            
            const delBtn = document.createElement('button');
            delBtn.className = 'chip-btn delete';
            delBtn.innerHTML = '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>';
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
            delBtn.onclick = async (e) => {
                e.stopPropagation();
                const proceed = await window.showCustomConfirm(`删除快照 "${snap.name}"?`);
                if (proceed) {
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
                if (window.updateAuthModeVisibility) {
                    window.updateAuthModeVisibility(snap.authMode || 'service_principal');
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

    window.saveAuthSnapshot = function(customName = null, isManual = false) {
        const config = getCurrentConfig();
        if (!config.clientId || !config.tenantId) {
            console.warn('Cannot save snapshot: Missing Client ID or Tenant ID.');
            return;
        }
        
        // Auto-save logic: if identical config exists, do NOT overwrite its name, just activate it.
        if (!isManual) {
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
                saveSnapshots();
                renderSnapshots();
                return;
            }
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
            btnSave.onclick = async () => {
                const name = window.showCustomPrompt 
                    ? await window.showCustomPrompt('为当前配置起一个名字:', `Profile ${snapshots.length + 1}`)
                    : prompt('为当前配置起一个名字:', `Profile ${snapshots.length + 1}`);
                if (name !== null) window.saveAuthSnapshot(name.trim() || undefined, true);
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
