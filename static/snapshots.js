// Auth Snapshots Logic
(function() {
    let snapshots = JSON.parse(localStorage.getItem('pbi_auth_snapshots') || '[]');
    let activeSnapshotId = localStorage.getItem('pbi_active_snapshot_id');

    function saveSnapshots() {
        localStorage.setItem('pbi_auth_snapshots', JSON.stringify(snapshots));
        if (activeSnapshotId) {
            localStorage.setItem('pbi_active_snapshot_id', activeSnapshotId);
        } else {
            localStorage.removeItem('pbi_active_snapshot_id');
        }
    }

    function renderSnapshots() {
        const container = document.getElementById('snapshot-chips-container');
        if (!container) return;
        container.innerHTML = '';
        
        if (snapshots.length === 0) {
            container.innerHTML = '<span style="font-size:0.7rem; color:var(--text-tertiary); font-style:italic;">No snapshots saved yet.</span>';
            return;
        }

        snapshots.forEach(snap => {
            const chip = document.createElement('div');
            chip.className = 'snapshot-chip' + (snap.id === activeSnapshotId ? ' active' : '');
            
            const nameSpan = document.createElement('span');
            nameSpan.className = 'snapshot-chip-name';
            nameSpan.textContent = snap.name;
            nameSpan.title = "Double click to rename";
            
            const actions = document.createElement('div');
            actions.className = 'snapshot-chip-actions';
            
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
                    snap.name = newName;
                    saveSnapshots();
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

            // Delete Logic
            delBtn.onclick = (e) => {
                e.stopPropagation();
                if (confirm(`Delete snapshot "${snap.name}"?`)) {
                    snapshots = snapshots.filter(s => s.id !== snap.id);
                    if (activeSnapshotId === snap.id) activeSnapshotId = null;
                    saveSnapshots();
                    renderSnapshots();
                }
            };

            // Apply Logic
            chip.onclick = (e) => {
                if (nameSpan.contentEditable === 'true') return;
                activeSnapshotId = snap.id;
                saveSnapshots();
                renderSnapshots();
                
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

            chip.appendChild(nameSpan);
            actions.appendChild(editBtn);
            actions.appendChild(delBtn);
            chip.appendChild(actions);
            container.appendChild(chip);
        });
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
            if (customName && customName !== existing.name && !existing.name.includes("Auto-Saved")) {
                existing.name = customName;
            } else if (customName && existing.name.includes("Auto-Saved")) {
                existing.name = customName;
            }
            saveSnapshots();
            renderSnapshots();
            return;
        }

        const newSnap = {
            id: 'snap_' + Date.now() + '_' + Math.floor(Math.random()*1000),
            name: customName || `Profile ${snapshots.length + 1}`,
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
                const name = prompt('Enter a name for this config snapshot:', `Profile ${snapshots.length + 1}`);
                if (name !== null) window.saveAuthSnapshot(name.trim() || undefined);
            };
        }
        renderSnapshots();
    }, 500);
})();
