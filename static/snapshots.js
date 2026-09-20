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
            const modeIcon = snap.authMode === 'interactive' ? '🌐 ' : (snap.authMode === 'personal' ? '👤 ' : '🛡️ ');
            nameSpan.textContent = modeIcon + snap.name;
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
                nameSpan.textContent = snap.name; // 编辑时去掉前缀 icon
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
                        nameSpan.textContent = modeIcon + snap.name; // 恢复原名
                    } else {
                        snap.name = newName;
                        saveSnapshots();
                        renderSnapshots(); // re-render to update trigger text if active
                    }
                } else {
                    nameSpan.textContent = modeIcon + snap.name; // revert
                }
            };
            
            editBtn.onclick = startEdit;
            nameSpan.ondblclick = startEdit;
            nameSpan.onblur = finishEdit;
            nameSpan.onkeydown = (e) => {
                if (e.key === 'Enter') { e.preventDefault(); finishEdit(); }
                if (e.key === 'Escape') { nameSpan.textContent = modeIcon + snap.name; finishEdit(); }
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
            item.onclick = async (e) => {
                if (nameSpan.contentEditable === 'true') return;
                activeSnapshotId = snap.id;
                saveSnapshots();
                renderSnapshots();
                closeDropdown();
                
                if (snap.authMode === 'interactive') {
                    if (window.switchAuthSettingsTab) window.switchAuthSettingsTab('interactive');
                    const intTenant = document.getElementById('set-interactive-tenant');
                    const intUser = document.getElementById('set-interactive-username');
                    if (intTenant) intTenant.value = snap.tenantId || '';
                    if (intUser) intUser.value = snap.username || '';
                    const setTenant = document.getElementById('set-tenant');
                    const setUser = document.getElementById('set-username');
                    const setClient = document.getElementById('set-client');
                    if (setTenant) setTenant.value = snap.tenantId || '';
                    if (setUser) setUser.value = snap.username || '';
                    if (setClient) setClient.value = snap.clientId || '04b07795-8ddb-461a-bbee-02f9e1bf7b46';

                    // 自动激活该交互快照（本地已持有 MSAL 刷新令牌，免去二次扫码交互！）
                    try {
                        const res = await fetch('/api/auth-mode', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                                auth_mode: 'interactive',
                                tenant_id: snap.tenantId,
                                username: snap.username
                            })
                        });
                        const data = await res.json();
                        if (data.success) {
                            if (window.showNotification) {
                                window.showNotification(`🎉 已切换至快照 [${snap.name}]，已连接本地安全凭据！`, 'success', 3500);
                            }
                            if (window.renderGlobalTopbar) await window.renderGlobalTopbar();
                            if (window.renderEnvIdentity) await window.renderEnvIdentity();
                            if (window.updateWorkflowAuthBadge) await window.updateWorkflowAuthBadge();
                            if (window.updateAuthCardsVisualStatus) await window.updateAuthCardsVisualStatus();
                            if (window.syncWorkspacesAfterAuthSwitch) await window.syncWorkspacesAfterAuthSwitch();
                        }
                    } catch(err) {
                        console.warn('Failed to auto-activate interactive snapshot:', err);
                    }
                } else {
                    if (window.switchAuthSettingsTab) window.switchAuthSettingsTab('legacy');
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
                }
                
                // Trigger flash animation for micro-interaction feedback
                ['set-client', 'set-secret', 'set-username', 'set-password', 'set-tenant', 'set-interactive-tenant', 'set-interactive-username'].forEach(id => {
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

        // 动态同步更新按钮可用性
        const btnUpdate = document.getElementById('btn-update-snapshot');
        if (btnUpdate) {
            if (activeSnap) {
                btnUpdate.disabled = false;
                btnUpdate.style.opacity = '1';
                btnUpdate.style.cursor = 'pointer';
                btnUpdate.title = `更新覆盖当前快照: ${activeSnap.name} (Update Current Profile)`;
            } else {
                btnUpdate.disabled = true;
                btnUpdate.style.opacity = '0.38';
                btnUpdate.style.cursor = 'not-allowed';
                btnUpdate.title = '未选定任何快照（请先从下拉菜单选择一个快照进行更新）';
            }
        }
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
        const isInteractiveTab = (window._currentAuthSettingsTab === 'interactive');
        if (isInteractiveTab) {
            const tenantId = (document.getElementById('set-interactive-tenant')?.value || document.getElementById('set-tenant')?.value || '7d97f400-69b4-4df4-a009-c9806ec70783').trim();
            const username = (document.getElementById('set-interactive-username')?.value || document.getElementById('set-username')?.value || 'carman_zhao@vfc.com').trim();
            return {
                clientId: '04b07795-8ddb-461a-bbee-02f9e1bf7b46',
                clientSecret: '',
                username: username,
                password: '',
                tenantId: tenantId,
                authMode: 'interactive'
            };
        }
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
        if (!config.tenantId) {
            console.warn('Cannot save snapshot: Missing Tenant ID.');
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

        let defaultPrefix = 'Profile';
        if (config.authMode === 'interactive') {
            const userShort = config.username ? config.username.split('@')[0] : 'User';
            defaultPrefix = `交互凭据 (${userShort})`;
        } else if (config.authMode === 'personal') {
            const userShort = config.username ? config.username.split('@')[0] : 'User';
            defaultPrefix = `个人账密 (${userShort})`;
        } else {
            defaultPrefix = `应用主体 (SP ${snapshots.length + 1})`;
        }

        let finalName = customName || defaultPrefix;
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

    window.updateCurrentAuthSnapshot = function() {
        if (!activeSnapshotId) {
            if (typeof window.showNotification === 'function') {
                window.showNotification('请先在下拉列表中选择一个要更新的快照！', 'warning');
            } else {
                alert('请先在下拉列表中选择一个要更新的快照！');
            }
            return;
        }
        const snap = snapshots.find(s => s.id === activeSnapshotId);
        if (!snap) return;

        const config = getCurrentConfig();
        if (!config.tenantId) {
            alert('更新失败：TENANT_ID 不能为空！');
            return;
        }

        // 原地覆盖更新配置（保留原 snap.name 与 snap.id）
        Object.assign(snap, config);
        saveSnapshots();
        renderSnapshots();

        if (typeof window.showNotification === 'function') {
            window.showNotification(`✅ 已成功更新快照 [${snap.name}] 的凭据配置！`, 'success');
        } else {
            alert(`✅ 已成功更新快照 [${snap.name}] 的凭据配置！`);
        }

        const btnUpdate = document.getElementById('btn-update-snapshot');
        if (btnUpdate) {
            btnUpdate.style.transform = 'scale(1.18)';
            setTimeout(() => { btnUpdate.style.transform = ''; }, 220);
        }
    };

    window.saveNewAuthSnapshot = async function() {
        const config = getCurrentConfig();
        if (!config.tenantId) {
            alert('保存失败：TENANT_ID 不能为空！');
            return;
        }
        let defaultName = `Profile ${snapshots.length + 1}`;
        if (config.authMode === 'interactive') {
            const prefix = config.username ? config.username.split('@')[0] : 'User';
            defaultName = `交互凭据 (${prefix})`;
        } else if (config.authMode === 'personal') {
            const prefix = config.username ? config.username.split('@')[0] : 'User';
            defaultName = `个人账密 (${prefix})`;
        } else {
            defaultName = `应用主体 (SP ${snapshots.length + 1})`;
        }

        const name = window.showCustomPrompt 
            ? await window.showCustomPrompt('为新配置快照输入名称:', defaultName)
            : prompt('为新配置快照输入名称:', defaultName);
        if (name !== null) {
            window.saveAuthSnapshot(name.trim() || undefined, true);
            if (typeof window.showNotification === 'function') {
                window.showNotification(`✅ 已成功创建新快照 [${name.trim() || defaultName}]！`, 'success');
            }
            const btnCreate = document.getElementById('btn-create-snapshot');
            if (btnCreate) {
                btnCreate.style.transform = 'scale(1.18)';
                setTimeout(() => { btnCreate.style.transform = ''; }, 220);
            }
        }
    };

    // Initialize
    setTimeout(() => {
        const btnUpdate = document.getElementById('btn-update-snapshot');
        if (btnUpdate) {
            btnUpdate.onclick = window.updateCurrentAuthSnapshot;
        }

        const btnCreate = document.getElementById('btn-create-snapshot');
        if (btnCreate) {
            btnCreate.onclick = window.saveNewAuthSnapshot;
        }

        const btnSave = document.getElementById('btn-save-snapshot');
        if (btnSave) {
            btnSave.onclick = window.saveNewAuthSnapshot;
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
