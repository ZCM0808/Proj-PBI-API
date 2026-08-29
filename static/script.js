
// Global Fetch Interceptor for 401 Unauthorized
const originalFetch = window.fetch;
window.fetch = async function(...args) {
    const response = await originalFetch.apply(window, args);
    if (response.status === 401 && !window.location.pathname.includes('/login')) {
        window.location.href = '/login';
    }
    return response;
};

// ─── 全局 Workflow 输出框自动滚动机制 ─────────────────────────────
// 规则：每当 .wf-console 有新内容时，自动将滚动位置设到底部上方两行距离处，
// 让用户始终能看到最新输出行，同时感知到"还有更多内容在上方"。
// 两行距离 = 约 2 × 1.5em × 13px ≈ 40px
const WF_CONSOLE_SCROLL_BOTTOM_MARGIN = 40; // px，约两行行高

function wfConsoleScrollToLatest(el) {
    if (!el || el.classList.contains('collapsed-console')) return;
    // scrollTop 设到 scrollHeight - clientHeight - margin，留出底部两行空间
    const target = el.scrollHeight - el.clientHeight - WF_CONSOLE_SCROLL_BOTTOM_MARGIN;
    el.scrollTop = Math.max(0, target);
}

// 用 MutationObserver 批量监听页面内所有 .wf-console 元素的内容变化
function attachWfConsoleObservers() {
    document.querySelectorAll('.wf-console').forEach(el => {
        if (el._wfObserver) return; // 避免重复绑定
        const obs = new MutationObserver(() => wfConsoleScrollToLatest(el));
        obs.observe(el, { childList: true, characterData: true, subtree: true });
        el._wfObserver = obs;
    });
}

// 页面加载后首次绑定
document.addEventListener('DOMContentLoaded', () => {
    attachWfConsoleObservers();
    // 动态注入 overflow-y: auto 到所有 .wf-console（防止 CSS 未设导致无法滚动）
    const style = document.createElement('style');
    style.textContent = `.wf-console { overflow-y: auto !important; }`;
    document.head.appendChild(style);
});

// 对外暴露，供动态新增 wf-console 元素后手动触发重绑定
window.attachWfConsoleObservers = attachWfConsoleObservers;
// ──────────────────────────────────────────────────────────────────

// ─── Workflow 自定义命名 & 参数持久化 ──────────────────────────────
// 存储结构：
//   pbi-wf-names  = { "export_report": "我的导出任务", ... }
//   pbi-wf-params-{type} = { field_id: value, ... }

function getWfNames() {
    try { return JSON.parse(localStorage.getItem('pbi-wf-names') || '{}'); } catch(e) { return {}; }
}

function saveWfNames(names) {
    localStorage.setItem('pbi-wf-names', JSON.stringify(names));
}

// 将自定义名称应用到 <select> 所有 <option>
window.applyWfNames = function() {
    const names = getWfNames();
    const sel = document.getElementById('wf-selector');
    if (!sel) return;
    sel.querySelectorAll('option').forEach(opt => {
        const custom = names[opt.value];
        if (custom && custom.trim()) {
            // 保留原始内置名（存在 dataset-default 属性里），显示自定义名
            if (!opt.dataset.defaultName) opt.dataset.defaultName = opt.textContent;
            opt.textContent = custom;
        } else if (opt.dataset.defaultName) {
            // 无自定义名时恢复原始内置名
            opt.textContent = opt.dataset.defaultName;
        }
    });
};

// 开始重命名：显示输入框，预填当前名称
window.startWfRename = function() {
    const sel = document.getElementById('wf-selector');
    const bar = document.getElementById('wf-rename-bar');
    const input = document.getElementById('wf-rename-input');
    if (!sel || !bar || !input) return;
    const currentText = sel.options[sel.selectedIndex]?.textContent || '';
    input.value = currentText;
    bar.style.display = 'flex';
    input.focus();
    input.select();
    // 回车保存
    input.onkeydown = (e) => {
        if (e.key === 'Enter') window.saveWfRename();
        if (e.key === 'Escape') window.cancelWfRename();
    };
};

// 保存重命名
window.saveWfRename = function() {
    const sel = document.getElementById('wf-selector');
    const bar = document.getElementById('wf-rename-bar');
    const input = document.getElementById('wf-rename-input');
    if (!sel || !bar || !input) return;
    const wfType = sel.value;
    const newName = input.value.trim();
    const names = getWfNames();
    if (newName) {
        names[wfType] = newName;
    } else {
        delete names[wfType]; // 空名称 = 恢复默认
    }
    saveWfNames(names);
    window.applyWfNames();
    bar.style.display = 'none';
    window.showNotification && window.showNotification(
        newName ? `已将此 Workflow 重命名为「${newName}」` : '已恢复默认名称', 'success'
    );
};

// 取消重命名
window.cancelWfRename = function() {
    const bar = document.getElementById('wf-rename-bar');
    if (bar) bar.style.display = 'none';
};

// ── 参数持久化：保存当前 WF 的表单参数快照 ──
const WF_PARAM_FIELDS = {
    export_report:             ['wf-exp-workspace', 'wf-exp-report', 'wf-exp-format'],
    export_visual:             ['wf-vis-workspace', 'wf-vis-report'],
    export_dataset_tables:     ['wf-ds-workspace', 'wf-ds-dataset'],
    report_view_count:         ['wf-rvc-workspace', 'wf-rvc-report', 'wf-rvc-start', 'wf-rvc-end'],
    dataset_partitions_manager:[],
    xmla_interactive_refresh:     ['wf-xmla-endpoint', 'wf-xmla-token', 'wf-xmla-dataset', 'wf-xmla-table', 'wf-xmla-partition', 'wf-xmla-type'],
    check_permissions:         [],
    global_user_manager:       [],
    smart_pipeline:            [],
    local_model_query:         ['local-dax-editor'],
};

window.saveWfParams = function(wfType) {
    const fields = WF_PARAM_FIELDS[wfType];
    if (!fields || fields.length === 0) return;
    const snapshot = {};
    fields.forEach(id => {
        const el = document.getElementById(id);
        if (el) snapshot[id] = el.value;
    });
    localStorage.setItem(`pbi-wf-params-${wfType}`, JSON.stringify(snapshot));
};

window.restoreWfParams = function(wfType) {
    const fields = WF_PARAM_FIELDS[wfType];
    if (!fields || fields.length === 0) return;
    try {
        const snapshot = JSON.parse(localStorage.getItem(`pbi-wf-params-${wfType}`) || '{}');
        fields.forEach(id => {
            const el = document.getElementById(id);
            if (el && snapshot[id] !== undefined) el.value = snapshot[id];
        });
    } catch(e) {}
};
// ──────────────────────────────────────────────────────────────────

window.expandConsole = function(id) {
    const consoleEl = document.getElementById(id);
    if (!consoleEl) return;
    const chevron = document.getElementById(id + '-chevron');
    if (consoleEl.classList.contains('collapsed-console')) {
        consoleEl.classList.remove('collapsed-console');
        if (chevron) chevron.style.transform = 'rotate(90deg)';
        // 展开后延迟一帧让 DOM 渲染，再滚到最新输出位置
        requestAnimationFrame(() => wfConsoleScrollToLatest(consoleEl));
    }
};

window.toggleConsole = function(id) {
    const consoleEl = document.getElementById(id);
    if (!consoleEl) return;
    
    const chevronId = id + '-chevron';
    const chevron = document.getElementById(chevronId);
    
    if (consoleEl.classList.contains('collapsed-console')) {
        consoleEl.classList.remove('collapsed-console');
        if (chevron) chevron.style.transform = 'rotate(90deg)';
        // 展开后延迟一帧让 DOM 渲染，再滚到最新输出位置
        requestAnimationFrame(() => wfConsoleScrollToLatest(consoleEl));
    } else {
        consoleEl.classList.add('collapsed-console');
        if (chevron) chevron.style.transform = 'rotate(0deg)';
    }
};


window.animateVerifyBtn = async function(btn, promiseFunc, successCallback) {
    const originalText = btn.innerHTML;
    const originalWidth = btn.style.width;
    btn.disabled = true;
    btn.innerHTML = '⏳';
    btn.style.transition = 'all 0.3s ease';
    btn.style.width = 'auto';

    const resetBtn = () => {
        btn.innerHTML = originalText;
        btn.style.width = originalWidth;
        btn.style.background = '';
        btn.style.color = '';
        btn.style.borderColor = '';
        btn.disabled = false;
    };

    try {
        const result = await promiseFunc();
        if (result.success) {
            btn.innerHTML = '✅ Success';
            btn.style.background = 'var(--status-success-bg, rgba(16, 185, 129, 0.2))';
            btn.style.color = 'var(--success, var(--success))';
            btn.style.borderColor = 'var(--success, var(--success))';
            
            btn.style.transform = 'scale(1.1)';
            setTimeout(() => btn.style.transform = 'scale(1)', 200);
            setTimeout(resetBtn, 2500);
            
            if (successCallback) successCallback(result);
        } else {
            btn.innerHTML = '❌ Failed';
            btn.style.background = 'var(--status-error-bg, var(--status-error-bg))';
            btn.style.color = 'var(--error, var(--error))';
            btn.style.borderColor = 'var(--error, var(--error))';
            
            btn.style.transform = 'translateX(-4px)';
            setTimeout(() => btn.style.transform = 'translateX(4px)', 100);
            setTimeout(() => btn.style.transform = 'translateX(-4px)', 200);
            setTimeout(() => btn.style.transform = 'translateX(4px)', 300);
            setTimeout(() => btn.style.transform = 'translateX(0)', 400);

            setTimeout(() => {
                resetBtn();
                alert(result.message);
            }, 2500);
        }
    } catch (err) {
        btn.innerHTML = '❌ Error';
        btn.style.background = 'var(--status-error-bg, var(--status-error-bg))';
        btn.style.color = 'var(--error, var(--error))';
        btn.style.borderColor = 'var(--error, var(--error))';
        setTimeout(() => {
            resetBtn();
            alert('网络错误: ' + err);
        }, 2500);
    }
};


window.closeModalWithAnimation = function(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.add('closing');
        setTimeout(() => {
            modal.style.display = 'none';
            modal.classList.remove('closing');
        }, 200);
    }
};
window.updateListCounts = function() {
    ['workspace-list', 'dataset-list', 'report-list'].forEach(id => {
        const container = document.getElementById(id);
        const countSpan = document.getElementById(id.replace('-list', '-count'));
        if (container && countSpan) {
            const validRows = Array.from(container.children).filter(row => {
                const input = row.querySelector('.id-input');
                return input && input.value.trim().length > 0;
            }).length;
            countSpan.textContent = `(${validRows} rows)`;
        }
    });
};

window.toggleSettingsSection = function(listId, labelEl) {
    const list = document.getElementById(listId);
    const headerBar = document.querySelector(`.grid-header-bar[data-list-id="${listId}"]`);
    const icon = labelEl ? labelEl.querySelector('.collapse-icon') : null;
    
    if (!list) return;
    const isHidden = list.style.display === 'none';
    
    if (isHidden) {
        list.style.display = 'flex';
        if (headerBar) headerBar.style.display = 'flex';
        if (icon) icon.textContent = '▼';
    } else {
        list.style.display = 'none';
        if (headerBar) headerBar.style.display = 'none';
        if (icon) icon.textContent = '▶';
    }
};

// Global Context Management Functions
window.addListRow = function(containerId, alias = "", id = "", itemType = "", itemState = "") {
    const container = document.getElementById(containerId);
    if (!container) return;
    const type = containerId === 'workspace-list' ? 'groups' : (containerId === 'dataset-list' ? 'datasets' : 'reports');
    const typeStr = containerId.split('-')[0];
    
    const row = document.createElement('div');
    row.style.cssText = "display: flex; gap: 8px; align-items: center;";
    
    // Auto-infer type/state from alias or ID if not explicitly provided (e.g. historical data in localStorage)
    if (!itemType && alias && String(alias).toLowerCase().includes('personal')) {
        itemType = 'PersonalGroup';
    } else if (!itemType && id) {
        itemType = 'Workspace';
    }
    if (!itemState && id) {
        itemState = 'Active';
    }

    // Construct badges if itemType or itemState exist
    let badgesHtml = '';
    if (itemType || itemState) {
        const isPersonal = String(itemType).toLowerCase().includes('personal');
        const isDeleted = String(itemState).toLowerCase().includes('delete');
        
        const typeBadgeStyle = isPersonal
            ? 'background: rgba(245, 158, 11, 0.15); color: #f59e0b; border: 1px solid rgba(245, 158, 11, 0.3);'
            : 'background: rgba(59, 130, 246, 0.15); color: #60a5fa; border: 1px solid rgba(59, 130, 246, 0.3);';
            
        const stateBadgeStyle = isDeleted
            ? 'background: rgba(239, 68, 68, 0.15); color: #ef4444; border: 1px solid rgba(239, 68, 68, 0.3);'
            : 'background: rgba(16, 185, 129, 0.15); color: #10b981; border: 1px solid rgba(16, 185, 129, 0.3);';

        if (itemType) {
            badgesHtml += `<span class="badge-type" style="font-size: 0.65rem; padding: 2px 6px; border-radius: 4px; font-weight: 500; white-space: nowrap; ${typeBadgeStyle}">${itemType}</span>`;
        }
        if (itemState) {
            badgesHtml += `<span class="badge-state" style="font-size: 0.65rem; padding: 2px 6px; border-radius: 4px; font-weight: 500; white-space: nowrap; ${stateBadgeStyle}">${itemState}</span>`;
        }
    }

    const namePlaceholder = containerId === 'workspace-list' ? '工作区 (Workspace)' : (containerId === 'dataset-list' ? '数据集 (Dataset)' : '报表 (Report)');
    const isReadOnly = alias ? 'readonly' : '';
    const readOnlyStyle = alias ? 'background: var(--overlay-5); cursor: default;' : '';
    const readOnlyTitle = alias ? ' title="资源名称为只读项 (Read-only)"' : '';

    const isIdReadOnly = id ? 'readonly' : '';
    const idReadOnlyStyle = id ? 'background: var(--overlay-5); cursor: default;' : '';
    const idReadOnlyTitle = id ? ' title="GUID 标识符为只读项 (Read-only)"' : '';

    row.innerHTML = `
        <input type="radio" name="${containerId}-radio" style="cursor: pointer; flex-shrink: 0;" title="选中为默认/活动 (Set as Default/Active)">
        <div class="cell-with-copy alias-cell" style="width: 180px; min-width: 120px; flex-shrink: 0;">
            <input type="text" class="settings-input alias-input" placeholder="${namePlaceholder}" value="${alias}" ${isReadOnly} ${readOnlyTitle} style="width: 100%; padding: 4px 26px 4px 8px; font-size: 0.75rem; ${readOnlyStyle}">
            <button type="button" class="cell-copy-btn" onclick="window.handleCopyAction(this, this.previousElementSibling.value, this.parentElement)" title="复制名称 (Copy Name)">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
            </button>
        </div>
        <div class="cell-with-copy id-cell" style="width: 320px; min-width: 200px; flex-shrink: 0;">
            <input type="text" class="settings-input id-input" placeholder="GUID" value="${id}" ${isIdReadOnly} ${idReadOnlyTitle} style="width: 100%; font-family: monospace; font-size: 0.75rem; padding: 4px 26px 4px 8px; ${idReadOnlyStyle}" data-type="${itemType}" data-state="${itemState}">
            <button type="button" class="cell-copy-btn" onclick="window.handleCopyAction(this, this.previousElementSibling.value, this.parentElement)" title="复制 GUID (Copy GUID)">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
            </button>
        </div>
        <div class="row-badges type-input" style="display: flex; gap: 4px; align-items: center; width: 160px; min-width: 140px; flex-shrink: 0; justify-content: flex-start;">${badgesHtml}</div>
        <button type="button" onclick="if(this.parentElement.parentElement.children.length > 1) { this.parentElement.remove(); } else { alert('必须保留至少一个输入框！(At least one row must be kept)'); }" style="color: var(--error-light); background: transparent; border: none; cursor: pointer; font-size: 1.2rem; line-height: 1; padding: 0 4px; opacity: 0.3; transition: opacity 0.2s; flex-shrink: 0;" onmouseover="this.style.opacity='1'" onmouseout="this.style.opacity='0.3'">&times;</button>
    `;
    container.appendChild(row);
    
    // Synchronize initial column widths if previously resized
    ['alias', 'id', 'type'].forEach(col => {
        const hdr = document.querySelector(`.grid-header-bar[data-list-id="${containerId}"] .grid-col-header[data-col="${col}"]`);
        if (hdr && hdr.style.width) {
            const targetEl = row.querySelector(`.${col}-cell`) || row.querySelector(`.${col}-input`);
            if (targetEl) targetEl.style.width = hdr.style.width;
        }
    });
    
    window.updateListCounts();
    
    // Add event listener to delete button for live count update
    const delBtn = row.querySelector('button');
    if (delBtn) {
        const origOnClick = delBtn.onclick;
        delBtn.onclick = function(e) {
            if (origOnClick) origOnClick.call(this, e);
            window.updateListCounts();
        };
    }
    
    // Input listeners to update title counts dynamically
    const inputs = row.querySelectorAll('input');
    inputs.forEach(inp => inp.addEventListener('input', () => window.updateListCounts()));
    
    const radio = row.querySelector('input[type="radio"]');
    const idInput = row.querySelector('.id-input');
    const aliasInput = row.querySelector('.alias-input');
    
    radio.addEventListener('change', () => {
        if (radio.checked && idInput.value.trim()) {
            const currentId = idInput.value.trim();
            const currentAlias = aliasInput.value.trim();
            localStorage.setItem(`pbi-active-${typeStr}`, currentId);
            if (window.selectCustomOption) {
                window.selectCustomOption(typeStr, currentId, currentAlias);
            }
        }
    });

    const activeId = localStorage.getItem(`pbi-active-${typeStr}`);
    const existingRadios = container.querySelectorAll(`input[name="${containerId}-radio"]`);
    
    if (activeId && id === activeId) {
        radio.checked = true;
    } else if (!activeId && existingRadios.length === 1) {
        radio.checked = true;
    }
};

// Global Resizable Column Logic
window.initColumnResize = function(e, listId, colKey) {
    e.stopPropagation();
    e.preventDefault();
    
    const headerBar = document.querySelector(`.grid-header-bar[data-list-id="${listId}"]`);
    const headerCol = headerBar ? headerBar.querySelector(`.grid-col-header[data-col="${colKey}"]`) : null;
    const container = document.getElementById(listId);
    
    if (!headerCol || !container) return;
    
    const minW = colKey === 'alias' ? 120 : (colKey === 'id' ? 200 : 140);
    const startX = e.clientX;
    const startWidth = headerCol.offsetWidth;
    
    // Calculate max width so the rightmost delete button and padding never overflow the modal/headerBar width
    const containerWidth = headerBar.clientWidth || 840;
    // Calculate current width of OTHER columns and fixed elements (18px radio + 20px delete button + gaps)
    let otherColsWidth = 18 + 20 + 24; // 18px radio + 20px delBtn + 3*8px gaps
    headerBar.querySelectorAll('.grid-col-header').forEach(hdr => {
        if (hdr !== headerCol) {
            otherColsWidth += hdr.offsetWidth;
        }
    });
    const maxW = Math.max(minW, containerWidth - otherColsWidth);
    
    const resizer = e.target;
    if (resizer) resizer.classList.add('resizing');
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
    
    const onMouseMove = (moveEvent) => {
        const deltaX = moveEvent.clientX - startX;
        const newWidth = Math.min(maxW, Math.max(minW, startWidth + deltaX));
        
        // Update header width
        headerCol.style.width = newWidth + 'px';
        headerCol.style.flex = 'none';
        
        // Update all corresponding row elements in real-time
        const rowElements = container.querySelectorAll(`.${colKey}-cell, .${colKey}-input`);
        rowElements.forEach(el => {
            el.style.width = newWidth + 'px';
            el.style.flex = 'none';
        });
    };
    
    const onMouseUp = () => {
        if (resizer) resizer.classList.remove('resizing');
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
        window.removeEventListener('mousemove', onMouseMove);
        window.removeEventListener('mouseup', onMouseUp);
    };
    
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
};

// Global Sort State for Global Settings Lists: Map of containerId -> Array<{col: string, asc: boolean}>
window._settingsSortState = {};

window.sortSettingsList = function(containerId, colKey, event) {
    const container = document.getElementById(containerId);
    if (!container) return;
    
    if (!window._settingsSortState[containerId]) {
        window._settingsSortState[containerId] = [];
    }
    let sortState = window._settingsSortState[containerId];
    
    const isShift = event && event.shiftKey;
    const existing = sortState.find(s => s.col === colKey);
    
    if (isShift) {
        if (existing) {
            existing.asc = !existing.asc;
        } else {
            sortState.push({ col: colKey, asc: true });
        }
    } else {
        if (existing && sortState.length === 1) {
            existing.asc = !existing.asc;
        } else {
            window._settingsSortState[containerId] = [{ col: colKey, asc: true }];
            sortState = window._settingsSortState[containerId];
        }
    }

    // Update Header Icons & Visual Feedback
    const headerBar = document.querySelector(`.grid-header-bar[data-list-id="${containerId}"]`);
    if (headerBar) {
        headerBar.querySelectorAll('.grid-col-header').forEach(hdr => {
            const colName = hdr.getAttribute('data-col');
            const iconSpan = hdr.querySelector('.sort-icon');
            const s = sortState.find(st => st.col === colName);
            if (s) {
                let arrow = s.asc ? ' ↑' : ' ↓';
                if (sortState.length > 1) {
                    const priority = sortState.indexOf(s) + 1;
                    arrow += `<sub style="font-size:0.6rem;opacity:0.8;">${priority}</sub>`;
                }
                iconSpan.innerHTML = arrow;
                hdr.style.color = 'var(--accent)';
            } else {
                iconSpan.innerHTML = '';
                hdr.style.color = 'var(--text-secondary)';
            }
        });
    }

    // Collect DOM Rows and Sort
    const rowsArr = Array.from(container.children);
    rowsArr.sort((a, b) => {
        for (let s of sortState) {
            let va = '';
            let vb = '';
            if (s.col === 'alias') {
                va = a.querySelector('.alias-input')?.value.trim() || '';
                vb = b.querySelector('.alias-input')?.value.trim() || '';
            } else if (s.col === 'id') {
                va = a.querySelector('.id-input')?.value.trim() || '';
                vb = b.querySelector('.id-input')?.value.trim() || '';
            } else if (s.col === 'type') {
                va = a.querySelector('.id-input')?.getAttribute('data-type') || '';
                vb = b.querySelector('.id-input')?.getAttribute('data-type') || '';
            }
            
            let cmp = va.localeCompare(vb, undefined, { numeric: true, sensitivity: 'base' });
            if (cmp !== 0) {
                return s.asc ? cmp : -cmp;
            }
        }
        return 0;
    });

    // Re-append sorted rows
    rowsArr.forEach(row => container.appendChild(row));
};

window.verifySelectedGuid = async function(type, containerId, btn) {
    await window.animateVerifyBtn(btn, async () => {
        const container = document.getElementById(containerId);
        if (!container) return { success: false, message: '内部错误: 容器不存在 (Container not found)' };
        
        const selectedRadio = container.querySelector(`input[type="radio"]:checked`);
        if (!selectedRadio) {
            return { success: false, message: '请先选中一行记录 (Please select a record to verify)' };
        }
        
        const row = selectedRadio.parentElement;
        const input = row.querySelector('.id-input');
        const guid = input.value.trim();
        if (!guid) {
            return { success: false, message: '请先输入有效的 GUID！(Please enter a GUID to verify)' };
        }
        
        const clientId = document.getElementById('set-client').value.trim();
        const clientSecret = document.getElementById('set-secret').value.trim();
        const tenantId = document.getElementById('set-tenant').value.trim();
        const workspaceId = document.getElementById('active-workspace')?.value || '';

        if (!clientId || !clientSecret || !tenantId) {
            return { success: false, message: '请先填写 TENANT_ID, CLIENT_ID, 和 CLIENT_SECRET！(Missing credentials)' };
        }

        const res = await fetch('/api/test/guid', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                pbi_client_id: clientId,
                pbi_client_secret: clientSecret,
                pbi_tenant_id: tenantId,
                type: type,
                guid: guid,
                workspace_id: workspaceId
            })
        });
        return await res.json();
    }, (result) => {
        const container = document.getElementById(containerId);
        const selectedRadio = container ? container.querySelector(`input[type="radio"]:checked`) : null;
        if (selectedRadio) {
            const row = selectedRadio.parentElement;
            const input = row.querySelector('.id-input');
            const aliasInput = row.querySelector('.alias-input');
            if (input && !aliasInput.value.trim() && result.name) {
                aliasInput.value = result.name;
            }
            if (input) {
                input.setAttribute('data-type', result.type || '');
                input.setAttribute('data-state', result.state || '');
            }
            const badgesContainer = row.querySelector('.row-badges');
            if (badgesContainer && (result.type || result.state)) {
                const itemType = result.type || '';
                const itemState = result.state || '';
                const isPersonal = String(itemType).toLowerCase().includes('personal');
                const isDeleted = String(itemState).toLowerCase().includes('delete');
                
                const typeBadgeStyle = isPersonal
                    ? 'background: rgba(245, 158, 11, 0.15); color: #f59e0b; border: 1px solid rgba(245, 158, 11, 0.3);'
                    : 'background: rgba(59, 130, 246, 0.15); color: #60a5fa; border: 1px solid rgba(59, 130, 246, 0.3);';
                    
                const stateBadgeStyle = isDeleted
                    ? 'background: rgba(239, 68, 68, 0.15); color: #ef4444; border: 1px solid rgba(239, 68, 68, 0.3);'
                    : 'background: rgba(16, 185, 129, 0.15); color: #10b981; border: 1px solid rgba(16, 185, 129, 0.3);';

                let bHtml = '';
                if (itemType) bHtml += `<span class="badge-type" style="font-size: 0.65rem; padding: 1px 4px; border-radius: 3px; font-weight: 500; white-space: nowrap; ${typeBadgeStyle}">${itemType}</span>`;
                if (itemState) bHtml += `<span class="badge-state" style="font-size: 0.65rem; padding: 1px 4px; border-radius: 3px; font-weight: 500; white-space: nowrap; ${stateBadgeStyle}">${itemState}</span>`;
                badgesContainer.innerHTML = bHtml;
            }
        }
        alert(`✅ 验证成功 (Valid)\n名称: ${result.name}${result.type ? '\n类型: ' + result.type : ''}${result.state ? '\n状态: ' + result.state : ''}`);
    });
};

window.scanItems = async function(type, btn) {
    
    const originalText = btn.innerHTML;
    btn.innerHTML = '⏳ Scanning...';
    btn.disabled = true;
    
    let workspaceId = document.getElementById('active-workspace')?.value || '';
    // 如果没有活跃工作区，先尝试从工作区列表中提取
    if (!workspaceId) {
        const wList = window.getListData('workspace-list');
        if (wList.length > 0) workspaceId = wList[0].id;
    }
    
    // 如果扫描的是 workspaces，清空 workspace_id 进行全局扫描
    if (type === 'workspaces') {
        workspaceId = '';
    }
    
    try {
        const res = await fetch(`/api/scan/${type}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                pbi_client_id: document.getElementById('set-client').value.trim(),
                pbi_client_secret: document.getElementById('set-secret').value.trim(),
                pbi_tenant_id: document.getElementById('set-tenant').value.trim(),
                  pbi_tenant_name: document.getElementById('set-tenant-name') ? document.getElementById('set-tenant-name').value.trim() : '',
                workspace_id: workspaceId
            })
        });
        const data = await res.json();
        
        if (data.success && data.data && data.data.length > 0) {
            const modal = document.getElementById('scan-modal');
            const title = document.getElementById('scan-modal-title');
            const container = document.getElementById('scan-results-container');
            const addBtn = document.getElementById('scan-modal-add-btn');
            
            title.textContent = `🔍 Scan Results: ${type.charAt(0).toUpperCase() + type.slice(1)} (${data.data.length} found)`;
            container.innerHTML = '';
            
            data.data.forEach(item => {
                const row = document.createElement('label');
                row.style.cssText = 'display: flex; align-items: center; gap: 8px; cursor: pointer; padding: 6px 8px; border-radius: 4px; transition: background 0.2s;';
                row.onmouseover = () => row.style.background = 'var(--overlay-5)';
                row.onmouseout = () => row.style.background = 'transparent';
                
                const typeStr = item.type || '';
                const stateStr = item.state || '';
                
                // Styling badges based on workspace type & state
                const isPersonal = typeStr.toLowerCase().includes('personal');
                const isDeleted = stateStr.toLowerCase().includes('delete');
                
                const typeBadgeStyle = isPersonal
                    ? 'background: rgba(245, 158, 11, 0.15); color: #f59e0b; border: 1px solid rgba(245, 158, 11, 0.3);'
                    : 'background: rgba(59, 130, 246, 0.15); color: #60a5fa; border: 1px solid rgba(59, 130, 246, 0.3);';
                    
                const stateBadgeStyle = isDeleted
                    ? 'background: rgba(239, 68, 68, 0.15); color: #ef4444; border: 1px solid rgba(239, 68, 68, 0.3);'
                    : 'background: rgba(16, 185, 129, 0.15); color: #10b981; border: 1px solid rgba(16, 185, 129, 0.3);';

                const badgesHtml = `
                    <span style="font-size: 0.68rem; padding: 1px 5px; border-radius: 3px; font-weight: 500; ${typeBadgeStyle}">${typeStr}</span>
                    <span style="font-size: 0.68rem; padding: 1px 5px; border-radius: 3px; font-weight: 500; ${stateBadgeStyle}">${stateStr}</span>
                `;

                row.innerHTML = `
                    <input type="checkbox" value="${item.id}" data-name="${item.name.replace(/"/g, '&quot;')}" data-type="${typeStr}" data-state="${stateStr}" ${isDeleted ? '' : 'checked'}>
                    <span style="flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-size: 0.8rem;" title="${item.name}">${item.name}</span>
                    ${badgesHtml}
                    <span style="color: var(--text-secondary); font-size: 0.7rem; font-family: monospace;">${item.id}</span>
                `;
                container.appendChild(row);
            });
            
            modal.style.display = 'flex';
            
            addBtn.onclick = () => {
                const checked = container.querySelectorAll('input[type="checkbox"]:checked');
                const targetListId = type === 'workspaces' ? 'workspace-list' : (type === 'datasets' ? 'dataset-list' : 'report-list');
                
                const listContainer = document.getElementById(targetListId);
                const currentInputs = listContainer.querySelectorAll('.id-input');
                if (currentInputs.length === 1 && !currentInputs[0].value) {
                    listContainer.innerHTML = '';
                }

                const existingGuids = new Set(Array.from(listContainer.querySelectorAll('.id-input')).map(input => input.value.trim()));

                checked.forEach(cb => {
                    const guid = cb.value;
                    const itemType = cb.getAttribute('data-type') || '';
                    const itemState = cb.getAttribute('data-state') || '';
                    if (!existingGuids.has(guid)) {
                        window.addListRow(targetListId, cb.getAttribute('data-name'), guid, itemType, itemState);
                        existingGuids.add(guid);
                    }
                });
                modal.style.display = 'none';
            };
        } else {
            alert(`No ${type} found, or scan failed.\nMessage: ` + (data.error || 'Empty result'));
        }
    } catch (e) {
        alert('Scan Error: ' + e);
    } finally {
        btn.innerHTML = originalText;
        btn.disabled = false;
    }
};

window.getListData = function(containerId) {
    const container = document.getElementById(containerId);
    if (!container) return [];
    const rows = container.children;
    const data = [];
    for (let row of rows) {
        const aliasInput = row.querySelector('.alias-input');
        const idInput = row.querySelector('.id-input');
        if (!aliasInput || !idInput) continue;
        const alias = aliasInput.value.trim();
        const id = idInput.value.trim();
        const type = idInput.getAttribute('data-type') || '';
        const state = idInput.getAttribute('data-state') || '';
        if (alias || id) data.push({ alias, id, type, state });
    }
    return data;
};

window.toggleCustomSelect = function(type) {
    const optionsDiv = document.getElementById(`options-${type}`);
    if (!optionsDiv) return;
    const isVisible = optionsDiv.style.display === 'block';
    
    // Close all custom selects
    document.querySelectorAll('.custom-select-options').forEach(el => el.style.display = 'none');
    document.querySelectorAll('.custom-select-trigger').forEach(el => el.style.borderColor = 'var(--panel-border)');
    
    if (!isVisible) {
        optionsDiv.style.display = 'block';
        const trigger = document.getElementById(`trigger-${type}`);
        if (trigger) trigger.style.borderColor = 'var(--accent)';
    }
};

window.closeWithAnimation = function(element, callback = null) {
    if (!element || element.style.display === 'none' || element.classList.contains('is-closing')) return;
    element.classList.add('is-closing');
    setTimeout(() => {
        element.style.display = 'none';
        element.classList.remove('is-closing');
        if (callback) callback();
    }, 200);
};

window.addEventListener('click', (e) => {
    // 1. Close Custom Selects (Context Toolbar dropdowns)
    if (!e.target.closest('.custom-select-wrapper')) {
        document.querySelectorAll('.custom-select-options').forEach(el => el.style.display = 'none');
        document.querySelectorAll('.custom-select-trigger').forEach(el => el.style.borderColor = 'var(--panel-border)');
    }

    // 2. Close History Dropdown
    const historyReqBtn = document.getElementById('history-request-btn');
    const historyReqDropdown = document.getElementById('request-history-dropdown');
    if (historyReqBtn && historyReqDropdown && historyReqDropdown.style.display !== 'none' && !historyReqDropdown.classList.contains('is-closing')) {
        if (!historyReqBtn.contains(e.target) && !historyReqDropdown.contains(e.target)) {
            window.closeWithAnimation(historyReqDropdown);
        }
    }

    // 3. Auto-Minimize Current Selection Window
    const selectedApiInfo = document.getElementById('selected-api-info');
    const selectedApiContent = document.getElementById('selected-api-content');
    const toggleInfoBtn = document.getElementById('toggle-info-btn');
    // Don't close if they click the info-header-row itself (it has its own toggle logic)
    const infoHeaderRow = document.getElementById('info-header-row');
    
    if (selectedApiInfo && selectedApiContent && selectedApiContent.style.display === 'block' && !selectedApiContent.classList.contains('is-closing')) {
        // If click is outside the panel entirely AND not on a tree node (which updates the selection)
        if (!selectedApiInfo.contains(e.target) && !e.target.closest('#api-tree') && (!infoHeaderRow || !infoHeaderRow.contains(e.target))) {
            window.closeWithAnimation(selectedApiContent, () => {
                if (toggleInfoBtn) {
                    toggleInfoBtn.innerHTML = '&#9633;';
                    toggleInfoBtn.title = '还原';
                }
            });
            localStorage.setItem('pbi-details-collapsed', 'true');
        }
    }
}, true); // Use capture phase to prevent stopPropagation from hiding the click

window.selectCustomOption = function(type, id, alias, skipCascade = false) {
    const input = document.getElementById(`active-${type}`);
    const trigger = document.getElementById(`trigger-${type}`);
    if (!input || !trigger) return;
    
    const nameEl = trigger.querySelector('.cs-name');
    const idEl = trigger.querySelector('.cs-id');
    
    input.value = id;
    if (id) {
        nameEl.textContent = alias;
        idEl.textContent = id;
        idEl.style.display = 'block';
    } else {
        nameEl.textContent = '-- None --';
        idEl.style.display = 'none';
    }
    
    // Persist selection
    localStorage.setItem(`pbi-active-${type}`, id);
    
    document.getElementById(`options-${type}`).style.display = 'none';
    trigger.style.borderColor = 'var(--panel-border)';

    if (type === 'workspace' && id && !skipCascade) {
        const cascadeFetch = async (itemType) => {
            try {
                let cachedSettings = typeof backendSettingsCache !== 'undefined' ? backendSettingsCache : {};
                const reqBody = {
                    pbi_client_id: document.getElementById('set-client')?.value?.trim() || cachedSettings.CLIENT_ID || '',
                    pbi_client_secret: document.getElementById('set-secret')?.value?.trim() || cachedSettings.CLIENT_SECRET || '',
                    pbi_tenant_id: document.getElementById('set-tenant')?.value?.trim() || cachedSettings.TENANT_ID || '',
                    workspace_id: id
                };
                if (!reqBody.pbi_client_id || !reqBody.pbi_client_secret) return;
                
                const targetType = itemType === 'datasets' ? 'dataset' : 'report';
                const triggerTarget = document.getElementById(`trigger-${targetType}`);
                if (triggerTarget) {
                    triggerTarget.querySelector('.cs-name').textContent = '⏳ Loading...';
                }
                
                const res = await fetch(`/api/scan/${itemType}`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(reqBody)
                });
                const data = await res.json();
                if (data.success && data.data) {
                    const formatted = data.data.map(item => ({ alias: item.name, id: item.id }));
                    window._populateDropdown(targetType, formatted);
                } else {
                    window._populateDropdown(targetType, JSON.parse(localStorage.getItem(`pbi_${itemType}`) || '[]'));
                }
            } catch (e) {
                console.error('Cascade error:', e);
            }
        };
        cascadeFetch('datasets');
        cascadeFetch('reports');
    }
};

window._populateDropdown = function(type, data) {
    const input = document.getElementById(`active-${type}`);
    const optionsDiv = document.getElementById(`options-${type}`);
    if (!input || !optionsDiv) return;
    
    const savedVal = localStorage.getItem(`pbi-active-${type}`);
    const currentVal = savedVal !== null ? savedVal : input.value;
    
    let html = `<div onclick="selectCustomOption('${type}', '', '')" style="padding: 6px 8px; cursor: pointer; transition: background 0.2s; border-bottom: 1px solid var(--panel-border);" onmouseover="this.style.background='var(--overlay-10)'" onmouseout="this.style.background='transparent'">
        <div style="color: var(--text-secondary); font-size: 0.75rem;">-- None --</div>
    </div>`;
    
    data.forEach(item => {
        const safeAlias = (item.alias || '').replace(/'/g, "\\'").replace(/"/g, '&quot;');
        const safeId = item.id.replace(/'/g, "\\'");
        html += `<div onclick="selectCustomOption('${type}', '${safeId}', '${safeAlias}')" style="padding: 6px 8px; cursor: pointer; transition: background 0.2s; border-bottom: 1px solid var(--panel-border);" onmouseover="this.style.background='var(--overlay-10)'" onmouseout="this.style.background='transparent'">
            <div style="color: var(--text-primary); font-size: 0.75rem; font-weight: 500; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${item.alias}</div>
            <div style="color: var(--text-secondary); font-size: 0.65rem; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${item.id}</div>
        </div>`;
    });
    
    optionsDiv.innerHTML = html;
    
    if (data.some(d => d.id === currentVal)) {
        const selected = data.find(d => d.id === currentVal);
        selectCustomOption(type, selected.id, selected.alias, true);
    } else if (data.length > 0) {
        selectCustomOption(type, data[0].id, data[0].alias, true);
    } else {
        selectCustomOption(type, '', '', true);
    }
};

window.renderContextDropdowns = function() {
    const wData = JSON.parse(localStorage.getItem('pbi_workspaces') || '[]');
    const dData = JSON.parse(localStorage.getItem('pbi_datasets') || '[]');
    const rData = JSON.parse(localStorage.getItem('pbi_reports') || '[]');

    window._populateDropdown('workspace', wData);
    window._populateDropdown('dataset', dData);
    window._populateDropdown('report', rData);
};

window.renderEnvIdentity = async function() {
    const appName = localStorage.getItem('pbi_app_name');
    const tenantId = localStorage.getItem('pbi_tenant_id');
    const tenantName = localStorage.getItem('pbi_tenant_name');
    const tenantEl = document.getElementById('display-tenant');
    const clientEl = document.getElementById('display-client');
    const authModeEl = document.getElementById('display-auth-mode');
    const authModeIcon = document.getElementById('display-auth-mode-icon');
    const authModeText = document.getElementById('display-auth-mode-text');
    
    if (tenantEl) {
        if (tenantId) {
            tenantEl.style.display = 'inline-flex';
            tenantEl.querySelector('strong').textContent = tenantName || tenantId;
        } else {
            tenantEl.style.display = 'none';
        }
    }
    if (clientEl) {
        clientEl.style.display = 'inline-flex';
        if (appName) {
            clientEl.querySelector('strong').textContent = appName;
            clientEl.querySelector('strong').style.color = 'var(--text-primary)';
            clientEl.title = "";
        } else {
            clientEl.querySelector('strong').textContent = 'Unknown (Verify Required)';
            clientEl.querySelector('strong').style.color = 'var(--text-secondary)';
            clientEl.title = "Please go to Settings and click 'Verify Connection' to fetch the App Name";
        }
    }

    // Fetch and render auth mode badge (same data source as Workflow title)
    if (authModeEl) {
        try {
            const res = await fetch('/api/auth-info');
            const data = await res.json();
            if (data && data.success) {
                const isPersonal = data.auth_mode === 'personal';
                if (isPersonal) {
                    const userName = data.username || 'User';
                    if (authModeIcon) authModeIcon.textContent = '👤';
                    if (authModeText) {
                        authModeText.textContent = `Personal (${userName})`;
                        authModeText.style.color = '#38bdf8';
                    }
                    authModeEl.title = `当前认证: Personal Auth (个人委派用户认证) - ${data.username || ''}`;
                } else {
                    const appDisplayName = data.app_name || (data.client_id ? `App (${data.client_id.substring(0, 8)}...)` : 'App');
                    if (authModeIcon) authModeIcon.textContent = '🛡️';
                    if (authModeText) {
                        authModeText.textContent = `Service Principal (${appDisplayName})`;
                        authModeText.style.color = 'var(--accent)';
                    }
                    authModeEl.title = `当前认证: Service Principal (Azure 应用程序认证) - ${data.client_id || ''}`;
                }
                authModeEl.style.display = 'inline-flex';
            } else {
                authModeEl.style.display = 'none';
            }
        } catch (e) {
            authModeEl.style.display = 'none';
        }
    }

};

window.getInjectedEndpoint = function(endpoint) {
    let newEndpoint = endpoint;
    const ws = document.getElementById('active-workspace')?.value;
    const ds = document.getElementById('active-dataset')?.value;
    const rp = document.getElementById('active-report')?.value;
    
    if (ws) {
        newEndpoint = newEndpoint.replace(/\{workspaceId\}/gi, ws)
                                 .replace(/\{\{workspaceId\}\}/gi, ws)
                                 .replace(/\{groupId\}/gi, ws)
                                 .replace(/\{\{groupId\}\}/gi, ws);
    }
    if (ds) {
        newEndpoint = newEndpoint.replace(/\{datasetId\}/gi, ds)
                                 .replace(/\{\{datasetId\}\}/gi, ds);
    }
    if (rp) {
        newEndpoint = newEndpoint.replace(/\{reportId\}/gi, rp)
                                 .replace(/\{\{reportId\}\}/gi, rp);
    }
    return newEndpoint;
};

// 递归根据 Swagger Schema 提取并生成 Mock 请求体数据
function generateMock(schema, definitions, level = 0) {
    if (level > 4) return "..."; // 防止循环引用无限递归
    
    if (schema.$ref) {
        const defName = schema.$ref.split('/').pop();
        if (definitions && definitions[defName]) {
            return generateMock(definitions[defName], definitions, level + 1);
        }
        return "string";
    }
    
    // 支持 Swagger 的 allOf 继承结构
    if (schema.allOf) {
        let mergedObj = {};
        for (const subSchema of schema.allOf) {
            const subMock = generateMock(subSchema, definitions, level + 1);
            if (typeof subMock === 'object' && !Array.isArray(subMock)) {
                mergedObj = { ...mergedObj, ...subMock };
            }
        }
        return mergedObj;
    }
    
    if (schema.type === 'object' || schema.properties) {
        const obj = {};
        for (const [key, prop] of Object.entries(schema.properties || {})) {
            obj[key] = generateMock(prop, definitions, level + 1);
        }
        return obj;
    }
    
    if (schema.type === 'array') {
        if (schema.items) {
            return [generateMock(schema.items, definitions, level + 1)];
        }
        return [];
    }
    
    if (schema.type === 'string') return "string";
    if (schema.type === 'integer' || schema.type === 'number') return 0;
    if (schema.type === 'boolean') return false;
    
    return "";
}

function formatApiName(path, method) {
    // 处理特定格式的端点名
    return path.split('/').pop().replace(/([A-Z])/g, ' $1').trim() || path;
}

// JSON 语法高亮引擎
function syntaxHighlight(json) {
    if (typeof json != 'string') {
         json = JSON.stringify(json, undefined, 2);
    }
    json = json.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    return json.replace(/("(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*"(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?)/g, function (match) {
        let cls = 'number';
        if (/^"/.test(match)) {
            if (/:$/.test(match)) {
                cls = 'key';
            } else {
                cls = 'string';
            }
        } else if (/true|false/.test(match)) {
            cls = 'boolean';
        } else if (/null/.test(match)) {
            cls = 'null';
        }
        return '<span class="' + cls + '">' + match + '</span>';
    });
}

// 简单的翻译字典，用于启发式翻译 API 名称
function translateApiName(name) {
    if (!name) return "";
    
    // 如果存在全局翻译字典，优先精确匹配整个句子
    if (window.API_TRANSLATIONS && window.API_TRANSLATIONS[name] && window.API_TRANSLATIONS[name] !== name) {
        return window.API_TRANSLATIONS[name];
    }
    
    let res = name;
    
    // 先处理 CamelCase (如 GetGroups -> Get Groups)
    res = res.replace(/([a-z])([A-Z])/g, '$1 $2');
    // 把下划线和连字符替换为空格，防止 \b 词边界匹配失效（因为下划线算作单词字符）
    res = res.replace(/[_-]/g, ' ');

    const dict = {
        // 优先匹配长短语
        'In Group': '在当前工作区中', 'To Group': '到工作区', 'As Admin': '作为管理员',
        
        'Get': '获取', 'Post': '提交', 'Put': '设置', 'Patch': '更新', 'Delete': '删除',
        'Update': '更新', 'Create': '创建', 'Add': '添加', 'Remove': '移除', 'Refresh': '刷新',
        'Export': '导出', 'Import': '导入', 'Clone': '克隆', 'Bind': '绑定', 'Unbind': '解绑',
        'Take Over': '接管', 'Execute': '执行', 'Discover': '发现', 'Cancel': '取消', 'Assign': '分配',
        'Unassign': '取消分配', 'Generate': '生成', 'Restore': '还原', 'Scan': '扫描', 'Embed': '嵌入',
        
        'Workspaces': '工作区', 'Workspace': '工作区', 'Groups': '工作区', 'Group': '工作区',
        'Datasets': '数据集', 'Dataset': '数据集', 'Reports': '报表', 'Report': '报表',
        'Dashboards': '仪表板', 'Dashboard': '仪表板', 'Dataflows': '数据流', 'Dataflow': '数据流',
        'Datamarts': '数据市场', 'Datamart': '数据市场', 'Gateways': '网关', 'Gateway': '网关',
        'Datasources': '数据源', 'Datasource': '数据源', 'Capacities': '容量', 'Capacity': '容量',
        'Apps': '应用', 'App': '应用', 'Users': '用户', 'User': '用户', 'Profiles': '配置文件',
        'Profile': '配置文件', 'Pipelines': '部署管道', 'Pipeline': '部署管道', 'Parameters': '参数',
        'Parameter': '参数', 'Tiles': '磁贴', 'Tile': '磁贴', 'Queries': '查询', 'Query': '查询',
        'Subscriptions': '订阅', 'Subscription': '订阅', 'Scorecards': '计分卡', 'Scorecard': '计分卡',
        'Goals': '目标', 'Goal': '目标', 'Artifacts': '工件', 'Activity': '活动记录', 'Tenant': '租户',
        'History': '历史记录', 'Status': '状态', 'Details': '详情', 'Info': '信息', 'Result': '结果',
        'Events': '事件', 'Pages': '页面', 'Page': '页面', 'Token': '令牌', 'Imports': '导入任务',
        'Exports': '导出任务', 'Orphaned': '孤立的', 'Widowed': '无主的', 'Admin': '管理',
        'Available': '可用的', 'Features': '功能', 'In': '在'
    };

    for (const [en, zh] of Object.entries(dict)) {
        const regex = new RegExp(`\\b${en}\\b`, 'gi');
        res = res.replace(regex, zh);
    }
    
    return res;
}

document.addEventListener('DOMContentLoaded', async () => {
    let expandedCategories = new Set();
    const methodSelect = document.getElementById('http-method');
    const endpointInput = document.getElementById('api-endpoint');
    const bodyInput = document.getElementById('request-body');
    const sendBtn = document.getElementById('send-btn');
    const responseOutput = document.getElementById('response-output');
    const responseStatus = document.getElementById('response-status');
    
    const apiTree = document.getElementById('api-tree');
    const searchInput = document.getElementById('api-search-input');
    
    // 新增 UI 元素
    const totalApiCountEl = document.getElementById('total-api-count');
    const selectedApiInfo = document.getElementById('selected-api-info');
    const selectedApiName = document.getElementById('selected-api-name');
    const selectedApiZh = document.getElementById('selected-api-zh');
    const selectedApiDesc = document.getElementById('selected-api-desc');

    let pbiApis = [];
    let totalApisCalculated = 0;
    
    // 用于保存当前选中的项，以防搜索导致 DOM 重绘后丢失选中状态
    let currentSelectedId = null;
    
    // 记录选中时的初始状态以支持回滚
    let originalMethod = 'GET';
    let originalPath = '';
    let originalBody = '';
    let originalCategoryHtml = '';

    let currentApiType = 'powerbi';
    let currentActiveFlag = 'ALL';
    
    let currentParamFilters = [];
    let allApiParams = new Set();

    // Theme logic
    const themeBtn = document.getElementById('theme-toggle-btn');
    const sunIcon = document.getElementById('theme-icon-sun');
    const moonIcon = document.getElementById('theme-icon-moon');
    
    function updateThemeIcons() {
        if (!sunIcon || !moonIcon) return;
        if (document.documentElement.getAttribute('data-theme') === 'light') {
            sunIcon.style.display = 'block';
            moonIcon.style.display = 'none';
        } else {
            sunIcon.style.display = 'none';
            moonIcon.style.display = 'block';
        }
    }
    updateThemeIcons();
    
    // Listen to OS theme changes if user hasn't explicitly overridden it
    if (window.matchMedia) {
        window.matchMedia('(prefers-color-scheme: light)').addEventListener('change', e => {
            if (!localStorage.getItem('pbi-theme')) {
                const newTheme = e.matches ? 'light' : 'dark';
                if (newTheme === 'light') {
                    document.documentElement.setAttribute('data-theme', 'light');
                } else {
                    document.documentElement.removeAttribute('data-theme');
                }
                updateThemeIcons();
            }
        });
    }

    if (themeBtn) {
        themeBtn.addEventListener('click', () => {
            document.documentElement.classList.add('theme-transitioning');
            // Force a reflow to ensure the browser registers the transition class before theme vars change
            document.documentElement.offsetHeight;
            
            const currentTheme = document.documentElement.getAttribute('data-theme');
            const newTheme = currentTheme === 'light' ? 'dark' : 'light';
            if (newTheme === 'light') {
                document.documentElement.setAttribute('data-theme', 'light');
            } else {
                document.documentElement.removeAttribute('data-theme');
            }
            localStorage.setItem('pbi-theme', newTheme);
            updateThemeIcons();
            setTimeout(() => {
                document.documentElement.classList.remove('theme-transitioning');
            }, 500);
        });
    }

    function updateBaseUrlHint(apiType) {
        const hintEl = document.getElementById('base-url-hint');
        if (hintEl) {
            if (apiType === 'fabric') {
                hintEl.textContent = 'https://api.fabric.microsoft.com/v1';
            } else {
                hintEl.textContent = 'https://api.powerbi.com/v1.0/myorg';
            }
        }
        
    }

    function getOfficialDocUrl(ep) {
        let isFabric = ep.isFabric;
        
        // 智能根据 path 兜底猜测 (防范 LocalStorage 书签老数据缺失 isFabric 属性)
        const pathLower = (ep.path || '').toLowerCase();
        if (pathLower.includes('/lakehouses') || 
            pathLower.includes('/warehouses') || 
            pathLower.includes('/notebooks') || 
            pathLower.includes('/kqldatabases') ||
            pathLower.includes('/items') ||
            pathLower.includes('/fabrics') ||
            pathLower.includes('/pipelines') ||
            (pathLower.startsWith('/workspaces') && !pathLower.includes('/admin/workspaces'))) {
            isFabric = true;
        }

        // 将 ep.name (summary) 转换为 URL slug: "List Data Factory Pipelines" -> "list-data-factory-pipelines"
        let slug = (ep.name || '').toLowerCase()
            .replace(/[^a-z0-9\s-]/g, '')
            .trim()
            .replace(/\s+/g, '-');

        if (isFabric) {
            // Fabric 文档 URL 结构: /rest/api/fabric/{service}/{resource-group}/{operation-slug}
            // 微软的 service 名称与 Swagger tag 不完全一致，需要映射
            const category = (ep.category || ep.flag || '').toLowerCase();
            
            // Swagger tag -> 微软文档 service 名映射
            const serviceMap = {
                'datafactory': 'datapipeline',
                'kql': 'kqldatabase',
                'lakehouse': 'lakehouse',
                'warehouse': 'warehouse',
                'notebook': 'notebook',
                'core': 'core'
            };
            const service = serviceMap[category] || 'core';
            
            // 微软 Learn 的 slug 不会重复 service 关键词
            // 例如 "List Data Factory Pipelines" -> slug 应为 "list-data-pipelines" (去掉 "factory-")
            // 例如 "List Lakehouse Tables" -> slug 应为 "list-tables" (去掉 "lakehouse-")
            const redundantWords = {
                'datafactory': ['factory-', 'data-factory-'],
                'lakehouse': ['lakehouse-'],
                'warehouse': ['warehouse-'],
                'notebook': ['notebook-'],
                'kql': ['kql-']
            };
            if (redundantWords[category]) {
                for (const word of redundantWords[category]) {
                    slug = slug.replace(word, '');
                }
            }
            
            // 根据 path 路径推断 resource-group（微软文档的二级分类）
            let resourceGroup = 'items';
            if (pathLower.includes('/workspaces') && !pathLower.includes('/lakehouses') &&
                !pathLower.includes('/warehouses') && !pathLower.includes('/notebooks') &&
                !pathLower.includes('/kqldatabases') && !pathLower.includes('/pipelines') &&
                !pathLower.includes('/items')) {
                resourceGroup = 'workspaces';
            } else if (pathLower.includes('/tables')) {
                resourceGroup = 'tables';
            }
            
            if (!slug) {
                return `https://learn.microsoft.com/en-us/rest/api/fabric/${service}`;
            }
            return `https://learn.microsoft.com/en-us/rest/api/fabric/${service}/${resourceGroup}/${slug}`;
        } else {
            let rawCategory = ep.category || '';
            if (!rawCategory && ep.flag) {
                rawCategory = ep.flag;
            }
            // CamelCase 拆分: "AvailableFeatures" -> "available-features", "PushDatasets" -> "push-datasets"
            let category = rawCategory
                .replace(/([a-z])([A-Z])/g, '$1-$2')
                .replace(/([A-Z]+)([A-Z][a-z])/g, '$1-$2')
                .toLowerCase()
                .replace(/\s+/g, '-');
            if (!category || category === 'others' || category === 'pbi') {
                return 'https://learn.microsoft.com/en-us/rest/api/power-bi/';
            }
            
            // Power BI 使用 operationId 的后半段作为 URL slug
            // 例如 "AvailableFeatures_GetAvailableFeatures" -> "get-available-features"
            let pbiSlug = slug;
            if (ep.operationId) {
                pbiSlug = ep.operationId
                    .replace(/([a-z])([A-Z])/g, '$1-$2')
                    .replace(/([A-Z]+)([A-Z][a-z])/g, '$1-$2')
                    .replace(/_/g, '-')
                    .toLowerCase();
            }

            return `https://learn.microsoft.com/en-us/rest/api/power-bi/${category}/${pbiSlug}`;
        }
    }



    // 智能在 Free Mode 下监听 URL 输入，切换前缀提示

        try {
            const res = await fetch('/api/settings');
            const data = await res.json();

            
            if (data.PBI_WORKSPACES) {
                localStorage.setItem('pbi_workspaces', JSON.stringify(data.PBI_WORKSPACES));
            }
            if (data.PBI_DATASETS) {
                localStorage.setItem('pbi_datasets', JSON.stringify(data.PBI_DATASETS));
            }
            if (data.PBI_REPORTS) {
                localStorage.setItem('pbi_reports', JSON.stringify(data.PBI_REPORTS));
            }
            if (data.TENANT_ID) {
                localStorage.setItem('pbi_tenant_id', data.TENANT_ID);
            }
        } catch (e) {
            console.error('Failed to pre-fetch settings:', e);
        }

        window.renderContextDropdowns();
        window.renderEnvIdentity();
        
        // 初始化 DOM 元素
        if (endpointInput) {
            endpointInput.addEventListener('input', () => {
                updateParamHints(endpointInput.value);
                const badge = document.getElementById('request-mode-badge');
                if (badge && badge.textContent.includes('Free Mode')) {
                    const val = endpointInput.value.toLowerCase();
                    if (val.includes('/lakehouses') || 
                        val.includes('/warehouses') || 
                        val.includes('/notebooks') || 
                        val.includes('/kqldatabases') ||
                        val.includes('/items') ||
                        val.includes('/fabrics') ||
                        (val.startsWith('/workspaces') && !val.includes('/admin/workspaces'))) {
                        updateBaseUrlHint('fabric');
                    } else {
                        updateBaseUrlHint('powerbi');
                    }
                }
            });
        }

        
                
        const formatBtn = document.getElementById('format-req-body-btn');
        if (formatBtn) {
            const originalFormatHTML = formatBtn.innerHTML;
            formatBtn.addEventListener('click', () => {
                const bodyInputBox = document.getElementById('request-body');
                if (!bodyInputBox) return;
                const val = bodyInputBox.value.trim();
                if (!val) {
                    alert('请先输入需要格式化的 JSON (Please input JSON to format first)!');
                    return;
                }
                try {
                    bodyInputBox.value = JSON.stringify(JSON.parse(val), null, 2);
                                        
                    formatBtn.innerHTML = '<span style="font-size: 12px; padding: 0 4px;">Formatted!</span>';
                    formatBtn.style.color = 'var(--accent)';
                    setTimeout(() => {
                        formatBtn.innerHTML = originalFormatHTML;
                        formatBtn.style.color = '';
                    }, 2000);
                } catch (e) {
                    alert('JSON 格式有误 (Invalid JSON format):\n' + e.message);
                }
            });
        }

    apiTree.innerHTML = '<div style="padding:1rem; text-align:center; color: var(--text-secondary);"><span class="loader"></span> 加载全部 API 中...</div>';

    try {
        let swagger = { paths: {}, definitions: {} };
        let fabricSwagger = { paths: {} };

        try {
            const [resPbi, resFabric] = await Promise.all([
                fetch('/static/swagger.json').catch(e => { console.error("Failed to load Power BI Swagger:", e); return null; }),
                fetch('/static/fabric_swagger.json').catch(e => { console.warn("Failed to load Fabric Swagger:", e); return null; })
            ]);

            if (resPbi && resPbi.ok) {
                swagger = await resPbi.json();
            } else if (resPbi) {
                console.error("Failed to load Power BI Swagger: server returned status", resPbi.status);
            }

            if (resFabric && resFabric.ok) {
                fabricSwagger = await resFabric.json();
            } else if (resFabric) {
                console.warn("Failed to load Fabric Swagger: server returned status", resFabric.status);
            }
        } catch (e) {
            console.error("Error during parallel swagger fetch:", e);
        }
        
        // Injections removed per user request

        const categories = {};
        const definitions = swagger.definitions || {};

        // 1. 解析 Power BI API
        for (const [path, methods] of Object.entries(swagger.paths)) {
            for (const [method, details] of Object.entries(methods)) {
                if (!['get', 'post', 'put', 'patch', 'delete'].includes(method.toLowerCase())) continue;
                
                const category = details.tags && details.tags.length > 0 ? details.tags[0] : 'Others';
                
                if (!categories[category]) {
                    categories[category] = [];
                }
                
                let sampleBodyObj = null;
                if (details.parameters) {
                    const bodyParam = details.parameters.find(p => p.in === 'body');
                    if (bodyParam && bodyParam.schema) {
                        sampleBodyObj = generateMock(bodyParam.schema, definitions);
                    }
                }
                
                let prerequisites = [];
                if (path.includes('/admin/')) {
                    prerequisites.push('🔒 **Admin API 特权**：调用者必须是 **全局/Fabric 管理员 (Global Admin)**，或者在 Tenant 设置中开启了 "**Allow service principals to use read-only admin APIs**" 才能由 **Service Principal** 身份调用。');
                }
                if (path.includes('/capacities') || path.includes('/exportTo')) {
                    prerequisites.push('💎 **Premium 容量限制**：当前目标必须挂载于 **Premium (P/A SKU)** 或 **Fabric (F SKU)** 容量节点下。');
                }
                
                const descStr = details.description || '';
                const permMatch = descStr.match(/## Permissions\n+([\s\S]*?)(?=##|$)/);
                if (permMatch) {
                    let permText = permMatch[1].trim()
                        .replace(/service principal/gi, '**service principal**')
                        .replace(/delegated permissions/gi, '**delegated permissions**')
                        .replace(/Fabric administrator/gi, '**Fabric administrator**')
                        .replace(/Power BI admin/gi, '**Power BI admin**');
                    prerequisites.push('🔑 **官方要求**：' + permText);
                }
                
                const scopeMatch = descStr.match(/## Required Scope\n+([\s\S]*?)(?=##|$)/);
                if (scopeMatch) {
                    let scopeText = scopeMatch[1].trim()
                        .replace(/Tenant\.Read\.All/gi, '**Tenant.Read.All**')
                        .replace(/Tenant\.ReadWrite\.All/gi, '**Tenant.ReadWrite.All**');
                    prerequisites.push('🎯 **权限范围 (Scope)**：' + scopeText);
                }

                let sampleBody = '';
                if (sampleBodyObj) {
                    sampleBody = JSON.stringify(sampleBodyObj, null, 2);
                } else if (['post', 'put', 'patch'].includes(method.toLowerCase())) {
                    sampleBody = '{\n  // 当前接口无需请求体，或官方文档未指明\n}'; 
                }

                categories[category].push({
                    name: details.summary || details.operationId || path,
                    operationId: details.operationId || '',
                    description: descStr,
                    method: method.toUpperCase(),
                    path: path.replace("/v1.0/myorg", ""), // clean path
                    body: sampleBody,
                    prerequisites: prerequisites,
                    flag: 'PBI',
                    isFabric: false,
                    category: category
                });
                totalApisCalculated++;
            }
        }

        // 2. 解析 Fabric API
        if (fabricSwagger && fabricSwagger.paths) {
            for (const [path, methods] of Object.entries(fabricSwagger.paths)) {
                for (const [method, details] of Object.entries(methods)) {
                    if (!['get', 'post', 'put', 'patch', 'delete'].includes(method.toLowerCase())) continue;
                    
                    const category = details.tags && details.tags.length > 0 ? details.tags[0] : 'Fabric';
                    
                    if (!categories[category]) {
                        categories[category] = [];
                    }
                    
                    let sampleBody = '';
                    if (details.parameters) {
                        const bodyParam = details.parameters.find(p => p.in === 'body');
                        if (bodyParam && bodyParam.schema) {
                            sampleBody = JSON.stringify(generateMock(bodyParam.schema, definitions), null, 2);
                        }
                    }
                    
                    let flag = 'Core';
                    if (category === 'Lakehouse') flag = 'Lakehouse';
                    else if (category === 'Warehouse') flag = 'Warehouse';
                    else if (category === 'Notebook') flag = 'Notebook';
                    else if (category === 'KQL') flag = 'KQL';
                    else if (category === 'DataFactory') flag = 'DataFactory';
                    
                    categories[category].push({
                        name: details.summary || details.operationId || path,
                        description: details.description || '',
                        method: method.toUpperCase(),
                        path: path,
                        body: sampleBody,
                        prerequisites: [],
                        flag: flag,
                        isFabric: true,
                        category: category
                    });
                    totalApisCalculated++;
                }
            }
        }

        // 更新总数
        totalApiCountEl.textContent = totalApisCalculated;

        pbiApis = Object.keys(categories).map(cat => ({
            category: cat,
            endpoints: categories[cat]
        }));
        pbiApis.sort((a, b) => a.category.localeCompare(b.category));
        
        // 提取所有必需参数并初始化 Filter 下拉框
        pbiApis.forEach(cat => {
            cat.endpoints.forEach(ep => {
                const matches = ep.path.match(/\{([^}]+)\}/g);
                if (matches) {
                    matches.forEach(m => allApiParams.add(m.replace(/[{}]/g, '')));
                }
            });
        });
        const paramOptionsContainer = document.getElementById('param-filter-options');
        const triggerLabel = document.getElementById('param-filter-label');
        if (paramOptionsContainer) paramOptionsContainer.innerHTML = '';
        if (paramOptionsContainer && allApiParams.size > 0) {
            const sortedParams = Array.from(allApiParams).sort();
            const totalParams = sortedParams.length;
            
            triggerLabel.textContent = `🔍 过滤必需的参数 (0/${totalParams})...`;
            
            // Prevent clicks inside the dropdown from bubbling up and closing it
            paramOptionsContainer.addEventListener('click', (e) => {
                e.stopPropagation();
            });
            
            // Add search input inside the dropdown
            const searchBox = document.createElement('div');
            searchBox.style.cssText = "padding: 6px; border-bottom: 1px solid var(--panel-border); position: sticky; top: 0; background: var(--dropdown-bg); z-index: 10;";
            const paramSearchInput = document.createElement('input');
            paramSearchInput.type = 'search';
            paramSearchInput.placeholder = 'Search parameters...';
            paramSearchInput.className = "modern-input";
            paramSearchInput.addEventListener("click", e => e.stopPropagation()); paramSearchInput.addEventListener("mousedown", e => e.stopPropagation()); searchBox.appendChild(paramSearchInput);
            paramOptionsContainer.appendChild(searchBox);
            
            paramSearchInput.addEventListener('input', (e) => {
                const term = e.target.value.toLowerCase();
                const labels = paramOptionsContainer.querySelectorAll('.param-option-label');
                labels.forEach(label => {
                    const paramText = label.getAttribute('data-param').toLowerCase();
                    label.style.display = paramText.includes(term) ? 'flex' : 'none';
                });
            });
            
            sortedParams.forEach(param => {
                const label = document.createElement('label');
                label.className = 'param-option-label';
                label.setAttribute('data-param', param);
                label.style.cssText = "display: flex; align-items: center; gap: 8px; padding: 6px 10px; cursor: pointer; border-bottom: 1px solid var(--panel-border); font-size: 0.8rem; color: var(--text-primary); transition: background 0.2s;";
                label.onmouseover = () => label.style.background = 'var(--overlay-10)';
                label.onmouseout = () => label.style.background = 'transparent';
                
                const checkbox = document.createElement('input');
                checkbox.type = 'checkbox';
                checkbox.value = param;
                checkbox.style.cursor = 'pointer';
                checkbox.addEventListener('change', (e) => {
                    if (e.target.checked) {
                        currentParamFilters.push(param);
                    } else {
                        currentParamFilters = currentParamFilters.filter(p => p !== param);
                    }
                    if (currentParamFilters.length > 0) {
                        triggerLabel.innerHTML = `<span style="color: var(--accent); font-weight: bold;">[${currentParamFilters.length}/${totalParams}]</span> <span style="font-size:0.75rem;">${currentParamFilters.join(', ')}</span>`;
                        const clearBtn = document.getElementById('param-filter-clear');
                        if (clearBtn) clearBtn.style.display = 'inline-flex';
                    } else {
                        triggerLabel.textContent = `🔍 过滤必需的参数 (0/${totalParams})...`;
                        const clearBtn = document.getElementById('param-filter-clear');
                        if (clearBtn) clearBtn.style.display = 'none';
                    }
                    const searchInput = document.getElementById('api-search-input');
                    renderTree(searchInput ? searchInput.value : "");
                });
                
                let displayParam = '{' + param + '}';
                if (param === 'groupId') {
                    displayParam += ' <span style="color: var(--text-secondary); font-size: 0.7rem;">(Workspace)</span>';
                }
                
                label.appendChild(checkbox);
                const textSpan = document.createElement('span');
                textSpan.innerHTML = displayParam;
                label.appendChild(textSpan);
                paramOptionsContainer.appendChild(label);
            });
        }

        const paramFilterTrigger = document.getElementById('param-filter-trigger');
        if (paramFilterTrigger) {
            paramFilterTrigger.addEventListener('click', (e) => {
                e.stopPropagation();
                const opts = document.getElementById('param-filter-options');
                opts.style.display = opts.style.display === 'none' ? 'block' : 'none';
            });
            document.addEventListener('click', (e) => {
                const opts = document.getElementById('param-filter-options');
                if (opts && !paramFilterTrigger.contains(e.target) && !opts.contains(e.target)) {
                    opts.style.display = 'none';
                }
            });
        }
        
        renderTree();
    } catch (e) {
        console.error("Failed to load swagger", e);
        apiTree.innerHTML = `<div style="padding: 1rem; color: var(--error);">无法加载完整的 API 列表，请刷新重试。<br><br><small style="color:var(--text-secondary);">${e.stack || e.message || e}</small></div>`;
    }

    // 绑定最小化/最大化面板事件
    const toggleInfoBtn = document.getElementById('toggle-info-btn');
    let activeApiElement = null;
    let isDetailsCollapsed = localStorage.getItem('pbi-details-collapsed') === 'true';

    function updateRequestMode(mode, text) {
        const badge = document.getElementById('request-mode-badge');
        if (!badge) return;
        badge.innerHTML = text;
        if (mode === 'free') {
            badge.style.pointerEvents = 'auto';
            badge.style.color = 'var(--accent)';
            badge.style.borderColor = 'var(--info-border)';
            badge.style.background = 'var(--info-bg)';
            
            // Set category to Custom
            const catBadge = document.getElementById('right-panel-category-badge');
            if (catBadge) {
                catBadge.innerHTML = `<span style="font-size: 0.75rem; padding: 3px 10px; border-radius: 12px; background: var(--overlay-8); color: var(--accent); border: none; display: inline-flex; align-items: center; gap: 5px; font-weight: 600; cursor: default;"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M2 12h4l2-9 5 18 3-9h6"></path></svg>Custom</span>`;
            }



        } else if (mode === 'history') {
            badge.style.color = 'var(--badge-custom-text)';
            badge.style.borderColor = 'rgba(167, 139, 250, 0.5)';
            badge.style.background = 'var(--badge-custom-bg)';
            badge.style.pointerEvents = 'none';
        } else {
            badge.style.pointerEvents = 'auto';
            badge.style.color = 'var(--success)';
            badge.style.borderColor = 'rgba(16, 185, 129, 0.5)';
            badge.style.background = 'rgba(16, 185, 129, 0.1)';
        }
    }

    const selectedApiContent = document.getElementById('selected-api-content');
    const infoHeaderRow = document.getElementById('info-header-row');
    
    infoHeaderRow.addEventListener('click', (e) => {
        if (selectedApiContent.style.display === 'none' || selectedApiContent.classList.contains('is-closing')) {
            selectedApiContent.classList.remove('is-closing');
            selectedApiContent.style.display = 'block';
            toggleInfoBtn.innerHTML = '&minus;';
            toggleInfoBtn.title = '最小化';
            isDetailsCollapsed = false;
        } else {
            window.closeWithAnimation(selectedApiContent, () => {
                toggleInfoBtn.innerHTML = '&#9633;'; // 正方形符号代表最大化/还原
                toggleInfoBtn.title = '还原';
            });
            isDetailsCollapsed = true;
        }
        localStorage.setItem('pbi-details-collapsed', isDetailsCollapsed);
    });

    // 绑定 Flag 过滤点击事件
    document.querySelectorAll('.flag-badge').forEach(badge => {
        badge.addEventListener('click', () => {
            document.querySelectorAll('.flag-badge').forEach(b => b.classList.remove('active'));
            badge.classList.add('active');
            currentActiveFlag = badge.getAttribute('data-flag');
            const searchInput = document.getElementById('api-search-input');
            renderTree(searchInput ? searchInput.value : "");
        });
    });
    
    // ── Default bookmarks (seeded once; user can remove freely afterward) ────
    const DEFAULT_BOOKMARKS_VERSION = 'v2';
    const DEFAULT_BOOKMARKS = [
        { operationId: 'Datasets_UpdateDataset',        method: 'PATCH', path: '/v1.0/myorg/datasets/{datasetId}',                                                   summary: 'Updates the properties for the specified dataset from My workspace.',     tags: ['Datasets'], category: 'official' },
        { operationId: 'Datasets_RefreshDataset',       method: 'POST',  path: '/v1.0/myorg/datasets/{datasetId}/refreshes',                                          summary: 'Triggers a refresh for the specified dataset from My workspace.',         tags: ['Datasets'], category: 'official' },
        { operationId: 'Datasets_UpdateParameters',     method: 'POST',  path: '/v1.0/myorg/datasets/{datasetId}/Default.UpdateParameters',                           summary: 'Updates the parameters values for the specified dataset from My workspace.', tags: ['Datasets'], category: 'official' },
        { operationId: 'Datasets_UpdateDatasetInGroup', method: 'PATCH', path: '/v1.0/myorg/groups/{groupId}/datasets/{datasetId}',                                    summary: 'Updates the properties for the specified dataset from the specified workspace.', tags: ['Datasets'], category: 'official' },
        { operationId: 'Datasets_RefreshDatasetInGroup',method: 'POST',  path: '/v1.0/myorg/groups/{groupId}/datasets/{datasetId}/refreshes',                         summary: 'Triggers a refresh for the specified dataset from the specified workspace.', tags: ['Datasets'], category: 'official' },
        { operationId: 'Datasets_UpdateParametersInGroup', method: 'POST', path: '/v1.0/myorg/groups/{groupId}/datasets/{datasetId}/Default.UpdateParameters',       summary: 'Updates the parameters values for the specified dataset from the specified workspace.', tags: ['Datasets'], category: 'official' },
        { operationId: 'Datasets_UpdateDatasourcesInGroup', method: 'POST', path: '/v1.0/myorg/groups/{groupId}/datasets/{datasetId}/Default.UpdateDatasources',     summary: 'Updates the data sources of the specified dataset from the specified workspace.', tags: ['Datasets'], category: 'official' },
        { operationId: 'Admin_GetActivityEvents',       method: 'GET',   path: '/v1.0/myorg/admin/activityevents',                                                    summary: 'Returns a list of audit activity events for a tenant (ViewReport usage).', tags: ['Admin'], category: 'official' },
        { operationId: 'Datasets_GetTables', method: 'GET', path: '/v1.0/myorg/datasets/{datasetId}/tables', summary: 'Returns a list of tables within the specified dataset from **My workspace**.', tags: ['PushDatasets'], category: 'official' },
        { operationId: 'Datasets_PutTable', method: 'PUT', path: '/v1.0/myorg/datasets/{datasetId}/tables/{tableName}', summary: 'Updates the metadata and schema for the specified table within the specified dataset from **My workspace**.', tags: ['PushDatasets'], category: 'official' },
        { operationId: 'Datasets_PostRows', method: 'POST', path: '/v1.0/myorg/datasets/{datasetId}/tables/{tableName}/rows', summary: 'Adds new data rows to the specified table within the specified dataset from **My workspace**.', tags: ['PushDatasets'], category: 'official' },
        { operationId: 'Datasets_DeleteRows', method: 'DELETE', path: '/v1.0/myorg/datasets/{datasetId}/tables/{tableName}/rows', summary: 'Deletes all rows from the specified table within the specified dataset from **My workspace**.', tags: ['PushDatasets'], category: 'official' },
        { operationId: 'Datasets_GetTablesInGroup', method: 'GET', path: '/v1.0/myorg/groups/{groupId}/datasets/{datasetId}/tables', summary: 'Returns a list of tables within the specified dataset from the specified workspace.', tags: ['PushDatasets'], category: 'official' },
        { operationId: 'Datasets_PutTableInGroup', method: 'PUT', path: '/v1.0/myorg/groups/{groupId}/datasets/{datasetId}/tables/{tableName}', summary: 'Updates the metadata and schema for the specified table within the specified dataset from the specified workspace.', tags: ['PushDatasets'], category: 'official' },
        { operationId: 'Datasets_PostRowsInGroup', method: 'POST', path: '/v1.0/myorg/groups/{groupId}/datasets/{datasetId}/tables/{tableName}/rows', summary: 'Adds new data rows to the specified table within the specified dataset from the specified workspace.', tags: ['PushDatasets'], category: 'official' },
        { operationId: 'Datasets_DeleteRowsInGroup', method: 'DELETE', path: '/v1.0/myorg/groups/{groupId}/datasets/{datasetId}/tables/{tableName}/rows', summary: 'Deletes all rows from the specified table within the specified dataset from the specified workspace.', tags: ['PushDatasets'], category: 'official' },
    ];

    function seedDefaultBookmarks() {
        const seeded = localStorage.getItem('pbi-bookmarks-seeded');
        if (seeded === DEFAULT_BOOKMARKS_VERSION) return; // already seeded this version
        const existing = [];
        try {
            const raw = localStorage.getItem('pbi-bookmarks');
            if (raw) existing.push(...JSON.parse(raw));
        } catch (e) { /* ignore */ }
        DEFAULT_BOOKMARKS.forEach(nb => {
            const cleanNew = nb.path.replace('/v1.0/myorg', '');
            const already = existing.some(b => {
                const cleanB = (b.path || '').replace('/v1.0/myorg', '');
                return cleanB === cleanNew && (b.method || '').toUpperCase() === nb.method.toUpperCase();
            });
            if (!already) existing.push(nb);
        });
        localStorage.setItem('pbi-bookmarks', JSON.stringify(existing));
        localStorage.setItem('pbi-bookmarks-seeded', DEFAULT_BOOKMARKS_VERSION);
    }
    seedDefaultBookmarks();

    function syncStateFromBackend() {

        // Sync Bulk KV (Everything else)
        fetch('/api/db/kv')
            .then(res => res.json())
            .then(data => {
                if (data.success && data.data !== null) {
                    for (const [key, value] of Object.entries(data.data)) {
                        Storage.prototype.setItem.call(localStorage, key, value);
                    }
                }
            }).catch(e => console.error('Backend bulk KV sync failed', e));        // Sync Bookmarks
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
                    Storage.prototype.setItem.call(localStorage, 'pbi-theme', data.data);
                    if (data.data === 'light') {
                        document.documentElement.setAttribute('data-theme', 'light');
                    } else {
                        document.documentElement.removeAttribute('data-theme');
                    }
                    if (typeof updateThemeIcons === 'function') {
                        updateThemeIcons();
                    }
                }
            }).catch(e => console.error('Backend theme sync failed', e));
    }
    syncStateFromBackend();
    function getBookmarks() {
        try {
            const data = localStorage.getItem('pbi-bookmarks');
            return data ? JSON.parse(data) : [];
        } catch (e) {
            console.error('Bookmarks parse error:', e);
            return [];
        }
    }


    function toggleBookmark(ep, e) {
        if (e) e.stopPropagation();
        const bookmarks = getBookmarks();
        
        // 使用强健的清洗比对来防止遗留脏数据导致的取消收藏失败
        const cleanEpPath = (ep.path || '').replace("/v1.0/myorg", "");
        const index = bookmarks.findIndex(b => {
            const cleanBPath = (b.path || '').replace("/v1.0/myorg", "");
            return cleanBPath === cleanEpPath && 
                   (b.method || '').toUpperCase() === (ep.method || '').toUpperCase();
        });
        
        if (index >= 0) {
            bookmarks.splice(index, 1);
        } else {
            bookmarks.push(ep);
        }
        localStorage.setItem('pbi-bookmarks', JSON.stringify(bookmarks));
        fetch('/api/bookmarks', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(bookmarks) }).catch(console.error);
        window.lastToggledBookmarkId = ep.method + '_' + ep.path;
        const searchInput = document.getElementById('api-search-input');
        renderTree(searchInput ? searchInput.value : "");
    }


    
    function togglePinBookmark(ep, e) {
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
    }

    function getBookmarkMeta(path, method) {
        const cleanPath = (path || '').replace("/v1.0/myorg", "");
        return getBookmarks().find(b => 
            (b.path || '').replace("/v1.0/myorg", "") === cleanPath && 
            (b.method || '').toUpperCase() === (method || '').toUpperCase()
        );
    }

    // Right panel state management
    function renderRightPanelBookmarkState(ep) {
        const bmSection = document.getElementById('right-panel-bm-section');
        const starBtn = document.getElementById('right-panel-bm-star');
        const metaContainer = document.getElementById('right-panel-bm-meta');
        
        if (!bmSection) return;
        
        const bmData = getBookmarkMeta(ep.path, ep.method);
        const isBookmarked = !!bmData;
        
        bmSection.style.display = 'flex';
        
        starBtn.className = isBookmarked ? 'bookmark-btn active' : 'bookmark-btn';
        if (window.lastToggledBookmarkId === (ep.method + '_' + ep.path)) {
            starBtn.classList.add('pop-anim');
        }
        starBtn.innerHTML = isBookmarked ? '★' : '☆';
        starBtn.title = isBookmarked ? "取消收藏" : "加入收藏";
        
        starBtn.onclick = (e) => {
            e.stopPropagation();
            toggleBookmark(ep, e);
            renderRightPanelBookmarkState(ep); // Refresh right panel
        };
        
        if (isBookmarked) {
            let metaHtml = '';
            const alias = bmData.alias || '';
            const tags = bmData.userTags || [];
            
            if (alias) {
                metaHtml += `<span class="bm-alias" title="Alias">${alias}</span>`;
            }
            tags.forEach(t => {
                metaHtml += `<span class="bm-tag">${t}</span>`;
            });
            
            metaContainer.innerHTML = metaHtml;
            metaContainer.style.display = 'flex';
        } else {
            metaContainer.innerHTML = '';
            metaContainer.style.display = 'none';
        }

        let locateBtn = document.getElementById('right-panel-locate-btn');
        if (!locateBtn) {
            locateBtn = document.createElement('button');
            locateBtn.id = 'right-panel-locate-btn';
            locateBtn.className = 'btn-action-icon';
            locateBtn.title = 'Locate in API Tree';
            locateBtn.innerHTML = '🎯 Locate in Tree';
            locateBtn.style.fontSize = '0.75rem';
            locateBtn.style.whiteSpace = 'nowrap';
            document.getElementById('right-panel-bm-body').appendChild(locateBtn);
        }
        locateBtn.onclick = () => {
            const searchInput = document.getElementById('api-search-input');
            if (searchInput && searchInput.value) {
                searchInput.value = ''; // clear search so tree is fully visible
                renderTree('');
            }
            // Locate element by tracking the unique string
            const items = document.querySelectorAll('.api-item');
            let targetItem = null;
            // The active item is what is currently opened
            for (let item of items) {
                if (item.classList.contains('active')) {
                    targetItem = item;
                    break;
                }
            }
            
            if (targetItem) {
                let parent = targetItem.parentElement;
                while (parent && !parent.classList.contains('api-category')) {
                    parent = parent.parentElement;
                }
                if (parent) {
                    const list = parent.querySelector('.api-list');
                    if (list && list.style.display === 'none') {
                        list.style.display = 'block';
                        parent.querySelector('.api-category-title').classList.remove('collapsed');
                    }
                }
                targetItem.scrollIntoView({ behavior: 'smooth', block: 'center' });
                targetItem.style.transition = 'background 0.5s';
                targetItem.style.background = 'var(--accent-glow)';
                setTimeout(() => targetItem.style.background = '', 1000);
            }
        };
    }

    // 渲染 API 树
    function renderTree(searchTerm = "") {
        apiTree.innerHTML = '';
        
        const rawBookmarks = getBookmarks();
        // 用最新加载的 API 列表去映射书签，以防旧版本 LocalStorage 书签缺少 operationId 和 category，甚至由于遗留 Bug 带有未清洗的旧 Path
        const bookmarks = rawBookmarks.map(bm => {
            const cleanBmPath = (bm.path || '').replace("/v1.0/myorg", "");
            for (const cat of pbiApis) {
                const found = cat.endpoints.find(e => 
                    e.path === cleanBmPath && 
                    e.method.toUpperCase() === (bm.method || '').toUpperCase()
                );
                if (found) return { ...found, category: cat.category, isPinned: !!bm.isPinned };
            }
            return bm;
        }).sort((a, b) => (b.isPinned ? 1 : 0) - (a.isPinned ? 1 : 0));
        
        // 伪造一个书签分类
        const categoryList = [];
        if (bookmarks.length > 0) {
            categoryList.push({
                category: "⭐ 收藏夹 (Bookmarks)",
                endpoints: bookmarks
            });
        }
        categoryList.push(...pbiApis);
        
        categoryList.forEach(category => {
            // 如果处于书签筛选模式，只保留并渲染“收藏夹”虚拟目录
            if (currentActiveFlag === 'BOOKMARK' && category.category !== "⭐ 收藏夹 (Bookmarks)") {
                return;
            }

            const filteredEndpoints = category.endpoints.filter(ep => {
                // Flag 快速筛选
                if (currentActiveFlag !== 'ALL' && currentActiveFlag !== 'BOOKMARK' && ep.flag !== currentActiveFlag) {
                    return false;
                }
                const term = searchTerm.toLowerCase();
                const zhName = translateApiName(ep.name).toLowerCase();
                const matchesSearch = ep.name.toLowerCase().includes(term) || 
                       (ep.operationId && ep.operationId.toLowerCase().includes(term)) ||
                       ep.path.toLowerCase().includes(term) ||
                       ep.method.toLowerCase().includes(term) ||
                       zhName.includes(term);
                       
                if (!matchesSearch) return false;
                
                // URL Parameter 快速筛选 (AND 关系，必须包含所有选中的参数)
                if (currentParamFilters.length > 0) {
                    const hasAllParams = currentParamFilters.every(param => ep.path.includes('{' + param + '}'));
                    if (!hasAllParams) return false;
                }
                
                return true;
            });

            if (filteredEndpoints.length === 0) return;

            const categoryEl = document.createElement('div');
            categoryEl.className = 'api-category';
            
            // 翻译分类标题以防范 Pipelines 命名混淆
            function getCategoryDisplayTitle(catName) {
                const nameUpper = catName.toUpperCase();
                if (nameUpper === 'PIPELINES') {
                    return '📋 Pipelines (Deployment / PBI 部署管道)';
                } else if (nameUpper === 'DATAFACTORY') {
                    return '🏭 Data Factory (DF / 数据工厂)';
                } else if (nameUpper === 'LAKEHOUSE') {
                    return '🌊 Lakehouse (LH / 湖仓)';
                } else if (nameUpper === 'WAREHOUSE') {
                    return '🧱 Warehouse (WH / 数据仓库)';
                } else if (nameUpper === 'NOTEBOOK') {
                    return '📓 Notebook (NB / 笔记本)';
                } else if (nameUpper === 'KQL') {
                    return '📊 KQL Database (KQL数据库)';
                }
                return catName;
            }

            const titleEl = document.createElement('div');
            titleEl.className = 'api-category-title';
            titleEl.innerHTML = `<span>${getCategoryDisplayTitle(category.category)}</span> <span>${filteredEndpoints.length}</span>`;
            categoryEl.appendChild(titleEl);

            const listEl = document.createElement('ul');
            listEl.className = 'api-list';
            if (searchTerm || expandedCategories.has(category.category)) {
                listEl.style.display = 'flex';
                listEl.classList.add('expanded');
                titleEl.classList.add('active'); 
            } else {
                listEl.style.display = 'none';
            }
            
            titleEl.addEventListener('click', () => {
                const isHidden = !listEl.classList.contains('expanded');
                if (isHidden) {
                    listEl.style.display = 'flex';
                    listEl.style.maxHeight = '0px';
                    void listEl.offsetWidth;
                    listEl.style.maxHeight = listEl.scrollHeight + 'px';
                    
                    listEl.classList.add('expanded');
                    titleEl.classList.add('active');
                    expandedCategories.add(category.category);
                    
                    setTimeout(() => {
                        if (listEl.classList.contains('expanded')) {
                            listEl.style.maxHeight = 'none';
                        }
                    }, 400);
                } else {
                    listEl.style.maxHeight = listEl.scrollHeight + 'px';
                    void listEl.offsetWidth;
                    listEl.style.maxHeight = '0px';
                    
                    listEl.classList.remove('expanded');
                    titleEl.classList.remove('active');
                    expandedCategories.delete(category.category);
                    setTimeout(() => {
                        if (!listEl.classList.contains('expanded')) {
                            listEl.style.display = 'none';
                        }
                    }, 400);
                }
            });
            
            filteredEndpoints.forEach(ep => {
                const itemEl = document.createElement('li');
                itemEl.className = 'api-item';
                itemEl.dataset.path = ep.path;
                
                const badge = document.createElement('span');
                badge.className = `method-badge method-${ep.method}`;
                badge.textContent = ep.method;
                
                const nameEl = document.createElement('div');
                nameEl.className = 'api-item-name';
                nameEl.style.flex = '1';
                
                // 渲染微缩 Flag 标志
                const flagEl = document.createElement('span');
                flagEl.style.fontSize = '0.55rem';
                flagEl.style.padding = '1px 4px';
                flagEl.style.borderRadius = '4px';
                flagEl.style.marginLeft = '6px';
                flagEl.style.background = 'rgba(255,255,255,0.08)';
                flagEl.style.color = 'var(--text-secondary)';
                flagEl.style.border = '1px solid var(--overlay-10)';
                flagEl.style.display = 'inline-block';
                flagEl.style.verticalAlign = 'middle';
                flagEl.textContent = ep.flag === 'DataFactory' ? 'DF' : (ep.flag === 'Lakehouse' ? 'LH' : (ep.flag === 'Warehouse' ? 'WH' : (ep.flag === 'Notebook' ? 'NB' : ep.flag)));
                
                if (ep.flag === 'PBI') {
                    flagEl.style.color = '#F2C811';
                    flagEl.style.borderColor = 'rgba(242, 200, 17, 0.3)';
                    flagEl.style.background = 'rgba(242, 200, 17, 0.05)';
                } else if (ep.flag === 'Lakehouse') {
                    flagEl.style.color = 'var(--info)';
                    flagEl.style.borderColor = 'rgba(56, 189, 248, 0.3)';
                    flagEl.style.background = 'rgba(56, 189, 248, 0.05)';
                } else if (ep.flag === 'Warehouse') {
                    flagEl.style.color = 'var(--badge-custom-text)';
                    flagEl.style.borderColor = 'var(--badge-custom-bg)';
                    flagEl.style.background = 'rgba(167, 139, 250, 0.05)';
                } else if (ep.flag === 'KQL') {
                    flagEl.style.color = 'var(--error)';
                    flagEl.style.borderColor = 'var(--status-error-bg)';
                    flagEl.style.background = 'var(--status-error-bg)';
                } else if (ep.flag === 'Notebook') {
                    flagEl.style.color = 'var(--success-light)';
                    flagEl.style.borderColor = 'var(--success-light)';
                    flagEl.style.background = 'var(--status-success-bg)';
                } else if (ep.flag === 'Core') {
                    flagEl.style.color = 'var(--warning)';
                    flagEl.style.borderColor = 'var(--warning-light)';
                    flagEl.style.background = 'var(--overlay-10)';
                } else if (ep.flag === 'DataFactory') {
                    flagEl.style.color = 'var(--badge-custom-text)';
                    flagEl.style.borderColor = 'var(--badge-custom-bg)';
                    flagEl.style.background = 'var(--badge-custom-bg)';
                }

                // 显示中文翻译在列表上（也可以只显示英文，这里展示双语）
                const zhTranslated = translateApiName(ep.name);
                
                let categoryBadgeHtml = '';
                if (category.category === "⭐ 收藏夹 (Bookmarks)" && ep.category) {
                    categoryBadgeHtml = `<span style="font-size:0.6rem; padding:2px 6px; border-radius:10px; background:var(--badge-custom-bg); color:var(--badge-custom-text); margin-left:8px; border:1px solid rgba(167, 139, 250, 0.25); font-weight:600;">${ep.category}</span>`;
                }
                
                const primaryName = ep.operationId ? ep.operationId : ep.name;
                const englishDesc = ep.name || "No description";
                let chineseDesc = zhTranslated || "暂无描述";
                
                const bmData = getBookmarkMeta(ep.path, ep.method);
                const isBookmarked = !!bmData;
                let metaHtml = '';
                
                if (isBookmarked) {
                    const alias = bmData.alias || '';
                    const tags = bmData.userTags || [];
                    if (alias) metaHtml += `<span class="bm-alias">${alias}</span>`;
                    tags.forEach(t => metaHtml += `<span class="bm-tag">${t}</span>`);
                }
                
                let pinBtnHtml = '';
                if (category.category === "⭐ 收藏夹 (Bookmarks)") {
                    const pinClass = ep.isPinned ? 'pinned' : 'unpinned';
                    const pinIcon = ep.isPinned ? '📍' : '📌';
                    pinBtnHtml = `<span class="tree-pin-btn ${pinClass}" title="Toggle Pin" style="margin-right: 2px; font-size: 1.1rem;">${pinIcon}</span>`;
                }
                
                const metaRowClass = metaHtml ? 'bm-meta-row has-content' : 'bm-meta-row empty';

                nameEl.innerHTML = `
                    <div style="display:flex; align-items:center; margin-bottom: 4px; flex-wrap: wrap; gap: 4px;">
                        ${pinBtnHtml}
                        <strong style="color:var(--text-primary); font-weight: 600; font-size: 0.85rem;">${primaryName}</strong>
                        ${categoryBadgeHtml}
                    </div>
                    <div style="font-size:0.7rem; color:var(--text-secondary); margin-bottom: 2px; line-height: 1.3;">
                        <span style="opacity: 0.6; margin-right: 4px; font-weight: bold;">EN:</span>${englishDesc}
                    </div>
                    <div style="font-size:0.7rem; color:var(--text-secondary); line-height: 1.3;">
                        <span style="opacity: 0.6; margin-right: 4px; font-weight: bold;">ZH:</span>${chineseDesc}
                    </div>
                    <div class="${metaRowClass}">${metaHtml}</div>
                    <div class="bm-editor-panel" style="display:none;"></div>
                `;
                nameEl.querySelector('div').appendChild(flagEl);
                nameEl.title = ep.path;

                // 收藏按钮
                const starBtn = document.createElement('button');
                starBtn.className = isBookmarked ? 'bookmark-btn active' : 'bookmark-btn';
                if (window.lastToggledBookmarkId === (ep.method + '_' + ep.path)) {
                    starBtn.classList.add('pop-anim');
                }
                starBtn.innerHTML = isBookmarked ? '★' : '☆';
                starBtn.title = isBookmarked ? "取消收藏" : "加入收藏";
                starBtn.onclick = (e) => toggleBookmark(ep, e);

                const insertNoteBtn = document.createElement('button');
                insertNoteBtn.className = 'bookmark-btn hover-action-btn';
                insertNoteBtn.innerHTML = '📝';
                insertNoteBtn.title = "Insert API Link to Note";
                insertNoteBtn.onclick = (e) => {
                    e.stopPropagation();
                    insertSpecificApiIntoNote(ep.method, ep.path);
                };

                let editBtn = null;
                if (isBookmarked) {
                    editBtn = document.createElement('button');
                    editBtn.className = 'bookmark-btn hover-action-btn bm-edit-btn';
                    editBtn.innerHTML = '✏️';
                    editBtn.title = "Edit alias & tags";
                }

                itemEl.appendChild(badge);
                itemEl.appendChild(nameEl);
                itemEl.appendChild(insertNoteBtn);
                if (editBtn) itemEl.appendChild(editBtn);
                itemEl.appendChild(starBtn);
                
                // Bind pin button
                const pinBtn = nameEl.querySelector('.tree-pin-btn');
                if (pinBtn) {
                    pinBtn.onclick = (e) => {
                        e.stopPropagation();
                        togglePinBookmark(ep, e);
                    };
                }

                // Bind edit button
                const editBtnElement = itemEl.querySelector('.bm-edit-btn');
                if (editBtnElement) {
                    editBtnElement.onclick = (e) => {
                        e.stopPropagation(); // prevent selecting the item
                        const editorPanel = nameEl.querySelector('.bm-editor-panel');
                        if (editorPanel.style.display === 'flex') {
                            editorPanel.style.display = 'none';
                            return;
                        }
                        
                        document.querySelectorAll('.bm-editor-panel').forEach(p => p.style.display = 'none');
                        editorPanel.style.display = 'flex';
                        
                        // Setup datalist for tag suggestions
                        let datalist = document.getElementById('all-tags-datalist');
                        if (!datalist) {
                            datalist = document.createElement('datalist');
                            datalist.id = 'all-tags-datalist';
                            document.body.appendChild(datalist);
                        }
                        const allTags = new Set();
                        getBookmarks().forEach(b => (b.userTags || []).forEach(t => allTags.add(t)));
                        datalist.innerHTML = '';
                        allTags.forEach(t => {
                            const opt = document.createElement('option');
                            opt.value = t;
                            datalist.appendChild(opt);
                        });

                        let currentTags = [...(bmData.userTags || [])];
                        editorPanel.innerHTML = `
                            <div class="bm-field-label">Alias</div>
                            <input type="text" class="bm-alias-input" value="${bmData.alias || ''}" placeholder="Give this API a short name...">
                            <div class="bm-field-label">Tags</div>
                            <div class="bm-tags-chips">
                                <input type="text" class="bm-tag-input-field" list="all-tags-datalist" placeholder="Add tag + Enter">
                            </div>
                            <div class="bm-editor-footer">
                                <button class="btn-bm-cancel">Cancel</button>
                                <button class="btn-bm-save">Save</button>
                            </div>
                        `;
                        
                        const tagsChipsContainer = editorPanel.querySelector('.bm-tags-chips');
                        const tagInput = editorPanel.querySelector('.bm-tag-input-field');
                        
                        function renderLocalTags() {
                            tagsChipsContainer.innerHTML = '';
                            currentTags.forEach((t, i) => {
                                const chip = document.createElement('div');
                                chip.className = 'bm-tag-chip';
                                chip.innerHTML = `<span>${t}</span><button class="chip-remove" type="button" data-index="${i}">&times;</button>`;
                                tagsChipsContainer.appendChild(chip);
                            });
                            tagsChipsContainer.appendChild(tagInput);
                            
                            tagsChipsContainer.querySelectorAll('.chip-remove').forEach(btn => {
                                btn.onclick = (ev) => {
                                    ev.stopPropagation();
                                    const idx = parseInt(ev.currentTarget.getAttribute('data-index'));
                                    currentTags.splice(idx, 1);
                                    renderLocalTags();
                                };
                            });
                        }
                        renderLocalTags();
                        
                        tagInput.onkeydown = (ev) => {
                            if (ev.key === 'Enter') {
                                ev.preventDefault();
                                ev.stopPropagation();
                                const val = tagInput.value.trim();
                                if (val && !currentTags.includes(val)) {
                                    currentTags.push(val);
                                    tagInput.value = '';
                                    renderLocalTags();
                                }
                            } else if (ev.key === 'Backspace' && tagInput.value === '' && currentTags.length > 0) {
                                currentTags.pop();
                                renderLocalTags();
                            }
                        };
                        tagInput.onclick = (ev) => ev.stopPropagation();
                        
                        const aliasInput = editorPanel.querySelector('.bm-alias-input');
                        aliasInput.onclick = (ev) => ev.stopPropagation();
                        aliasInput.onkeydown = (ev) => ev.stopPropagation(); // prevent tree selection interference
                        
                        editorPanel.querySelector('.btn-bm-cancel').onclick = (ev) => {
                            ev.stopPropagation();
                            editorPanel.style.display = 'none';
                        };
                        
                        editorPanel.querySelector('.btn-bm-save').onclick = (ev) => {
                            ev.stopPropagation();
                            if (tagInput.value.trim()) {
                                if (!currentTags.includes(tagInput.value.trim())) currentTags.push(tagInput.value.trim());
                            }
                            updateBookmarkMeta(bmData.path, bmData.method, aliasInput.value.trim(), currentTags);
                        };
                    };
                }

                const uniqueId = ep.method + '_' + ep.path;
                
                if (currentSelectedId === uniqueId) {
                    itemEl.classList.add('active');
                    activeApiElement = itemEl;
                    endpointInput.value = ep.path;
                    updateParamHints(ep.path);
                    methodSelect.value = ep.method;
                    methodSelect.disabled = true; // 锁定 Method
                    bodyInput.value = ep.body;
                                    }

                itemEl.addEventListener('click', () => {
                    document.querySelectorAll('.api-item').forEach(i => i.classList.remove('active'));
                    itemEl.classList.add('active');
                    activeApiElement = itemEl;
                    currentSelectedId = uniqueId;

                    // 保存初始状态
                    originalMethod = ep.method;
                    originalPath = ep.path;
                    if (originalPath === '/admin/workspaces/getInfo') {
                        originalPath += '?lineage=true&datasourceDetails=true&datasetSchema=true&datasetExpressions=true&getArtifactUsers=true';
                    } else if (originalPath === '/admin/workspaces/modified') {
                        originalPath += '?modifiedSince=2024-01-01T00:00:00.0000000Z&excludePersonalWorkspaces=true';
                    }
                    // 动态猜测以校正 LocalStorage 老历史脏数据丢失 isFabric 属性
                    let isFabricForNode = ep.isFabric;
                    const pathLower = (ep.path || '').toLowerCase();
                    if (pathLower.includes('/lakehouses') || 
                        pathLower.includes('/warehouses') || 
                        pathLower.includes('/notebooks') || 
                        pathLower.includes('/kqldatabases') ||
                        pathLower.includes('/items') ||
                        pathLower.includes('/fabrics') ||
                        pathLower.includes('/pipelines') ||
                        (pathLower.startsWith('/workspaces') && !pathLower.includes('/admin/workspaces'))) {
                        isFabricForNode = true;
                    }
                    currentApiType = isFabricForNode ? 'fabric' : 'powerbi'; // 记录是 Power BI 还是 Fabric API
                    updateBaseUrlHint(currentApiType);
                    
                    if (ep.body) {
                        try {
                            originalBody = JSON.stringify(JSON.parse(ep.body), null, 2);
                        } catch(e) {
                            originalBody = ep.body;
                        }
                    } else {
                        originalBody = '';
                    }

                    // 填入数据
                    endpointInput.value = originalPath;
                    updateParamHints(originalPath);
                    methodSelect.value = originalMethod;
                    methodSelect.disabled = true; // 锁定 Method
                    bodyInput.value = originalBody;
                                        
                    // 恢复 Unlock 按钮状态
                    document.getElementById('toggle-method-btn').innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg><span>Unlock</span>';

                    // 展示详细信息面板
                    selectedApiInfo.style.display = 'block';
                    renderRightPanelBookmarkState(ep);
                    if (isDetailsCollapsed) {
                        selectedApiContent.style.display = 'none';
                        toggleInfoBtn.innerHTML = '&#9633;';
                        toggleInfoBtn.title = '还原';
                    } else {
                        selectedApiContent.style.display = 'block';
                        toggleInfoBtn.innerHTML = '&minus;';
                        toggleInfoBtn.title = '最小化';
                    }
                    
                    const docUrl = getOfficialDocUrl(ep);

                    const docBtn = document.getElementById('official-doc-btn');
                    if (docBtn) {
                        docBtn.href = docUrl;
                    }
                    
                    const displayApiName = ep.operationId ? ep.operationId : ep.name;
                    selectedApiName.textContent = displayApiName;
                    
                    const rightPanelCatContainer = document.getElementById('right-panel-category-container');
                    const rightPanelCatBadge = document.getElementById('right-panel-category-badge');
                    if (rightPanelCatContainer && rightPanelCatBadge) {
                        const trueCategory = ep.category || category.category;
                        if (trueCategory && trueCategory !== "⭐ 收藏夹 (Bookmarks)") {
                            rightPanelCatBadge.innerHTML = `<span style="font-size: 0.75rem; padding: 3px 10px; border-radius: 12px; background: var(--badge-custom-bg); color: var(--badge-custom-text); border: none; display: inline-flex; align-items: center; gap: 5px; font-weight: 600; cursor: default;"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path></svg>${trueCategory}</span>`;
                        } else {
                            rightPanelCatBadge.innerHTML = `<span style="font-size: 0.75rem; padding: 3px 10px; border-radius: 12px; background: var(--overlay-8); color: var(--accent); border: none; display: inline-flex; align-items: center; gap: 5px; font-weight: 600; cursor: default;"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M2 12h4l2-9 5 18 3-9h6"></path></svg>Custom</span>`;
                        }



                        originalCategoryHtml = rightPanelCatBadge.innerHTML;
                    }
                    
                    // 动态更新标题 Badge
                    updateRequestMode('api', `Bound to: ${displayApiName}`);
                    selectedApiZh.textContent = zhTranslated;

                    // 渲染描述与警示前置条件
                    let finalDescHtml = ep.description ? ep.description.replace(/\n/g, '<br>') : '<span style="color:var(--text-secondary)">暂无描述</span>';
                    
                    if (originalPath.toLowerCase().includes('{scanid}')) {
                        finalDescHtml = '<div style="margin-bottom: 12px; padding: 10px; background: var(--badge-get-bg); border-left: 3px solid var(--badge-get-text); border-radius: 4px; color: var(--text-primary); font-size: 0.85rem;"><strong style="color: var(--badge-get-text);">💡 提示 (Tip):</strong> 你需要先调用 <strong>WorkspaceInfo GetInfo</strong> 接口获得 <code>scanId</code>，然后将其替换到上方 URL 路径中的 <code>{scanId}</code> 位置。</div>' + finalDescHtml;
                    }

                    if (ep.prerequisites && ep.prerequisites.length > 0) {
                        const prereqItems = ep.prerequisites.map(p => `<li style="margin-bottom: 6px;">${p.replace(/\n/g, '<br>').replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')}</li>`).join('');
                        const alertBox = `
                            <div style="margin-top: 16px; padding: 12px 16px; background: rgba(210, 153, 34, 0.1); border-left: 4px solid #d29922; border-radius: 4px;">
                                <div style="color: var(--error); font-weight: bold; margin-bottom: 8px; font-size: 0.9rem; display: flex; align-items: center; gap: 6px;">
                                    <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor"><path fill-rule="evenodd" d="M8.22 1.754a.25.25 0 00-.44 0L1.698 13.132a.25.25 0 00.22.368h12.164a.25.25 0 00.22-.368L8.22 1.754zm-1.763-.707c.659-1.234 2.427-1.234 3.086 0l6.082 11.378A1.75 1.75 0 0114.082 15H1.918a1.75 1.75 0 01-1.543-2.575L6.457 1.047zM9 11a1 1 0 11-2 0 1 1 0 012 0zm-.25-5.25a.75.75 0 00-1.5 0v2.5a.75.75 0 001.5 0v-2.5z"></path></svg>
                                    运行前置条件 (Prerequisites)
                                </div>
                                <ul style="margin: 0; padding-left: 24px; color: var(--text-primary); font-size: 0.85rem; line-height: 1.5;">
                                    ${prereqItems}
                                </ul>
                            </div>
                        `;
                        finalDescHtml = alertBox + '<div style="margin-top: 12px; opacity: 0.8; font-size: 0.85rem;">' + finalDescHtml + '</div>';
                    }
                    
                    selectedApiDesc.innerHTML = finalDescHtml;
                    selectedApiDesc.title = ep.description; // Hover to see full
                });

                listEl.appendChild(itemEl);
            });

            categoryEl.appendChild(listEl);
            apiTree.appendChild(categoryEl);
        });
        window.lastToggledBookmarkId = null;
    }

    // 搜索过滤逻辑 (Global Smart Search)
    const apiSearchInput = document.getElementById('api-search-input');
    if (apiSearchInput) {
        apiSearchInput.addEventListener('input', (e) => {
            renderTree(e.target.value);
            // 搜索时如果输入了关键字，自动切换为全部展开图标（因为搜索会强制展开结果）
            if (e.target.value.trim() !== '') {
                allExpanded = true;
                if (toggleAllBtn) {
                    toggleAllBtn.classList.add('expanded');
                }
            }
        });
    }

    // 全部折叠 / 展开逻辑
    let allExpanded = false; // 初始大多是折叠状态
    const toggleAllBtn = document.getElementById('toggle-all-categories-btn');
    if (toggleAllBtn) {
        toggleAllBtn.addEventListener('click', () => {
            allExpanded = !allExpanded;
            const categoryLists = document.querySelectorAll('.api-list');
            const categoryTitles = document.querySelectorAll('.api-category-title');
            categoryLists.forEach(list => {
                if (allExpanded) {
                    list.style.display = 'flex';
                    list.style.maxHeight = '0px';
                    void list.offsetWidth;
                    list.style.maxHeight = list.scrollHeight + 'px';
                    list.classList.add('expanded');
                    setTimeout(() => {
                        if (list.classList.contains('expanded')) {
                            list.style.maxHeight = 'none';
                        }
                    }, 400);
                } else {
                    list.style.maxHeight = list.scrollHeight + 'px';
                    void list.offsetWidth;
                    list.style.maxHeight = '0px';
                    list.classList.remove('expanded');
                    setTimeout(() => {
                        if (!list.classList.contains('expanded')) {
                            list.style.display = 'none';
                        }
                    }, 400);
                }
            });
            
            categoryTitles.forEach(title => {
                title.classList.toggle('active', allExpanded);
                const catNameEl = title.querySelector('span');
                if (catNameEl) {
                    const catName = catNameEl.textContent;
                    if (allExpanded) {
                        expandedCategories.add(catName);
                    } else {
                        expandedCategories.delete(catName);
                    }
                }
            });
            
            toggleAllBtn.classList.toggle('expanded', allExpanded);
        });
    }

    async function executeRequest() {
        const method = methodSelect.value;
        const endpoint = window.getInjectedEndpoint(endpointInput.value.trim());
        let bodyStr = bodyInput.value.trim();
        let body = null;
        
        if (!endpoint) {
            alert('请填写 API 路径');
            return;
        }

        // 获取 body 时忽略提示文本
        if (bodyStr && !bodyStr.includes('当前接口无需请求体')) {
            try {
                body = JSON.parse(bodyStr);
            } catch (e) {
                alert('请求体不是合法的 JSON 格式:\n' + e.message);
                return;
            }
        }


        sendBtn.disabled = true;
        sendBtn.innerHTML = '<span class="loader"></span> <span>Sending...</span>';
        responseStatus.textContent = 'Sending request...';
        responseStatus.className = 'response-status';
        responseOutput.style.color = '';
        responseOutput.textContent = '...';

        try {
            let apiTypeToSend = currentApiType;
            // 智能识别 Free Mode 路径类型
            const badge = document.getElementById('request-mode-badge');
            if (badge && badge.textContent.includes('Free Mode')) {
                const lowerEndpoint = endpoint.toLowerCase();
                if (lowerEndpoint.includes('/lakehouses') || 
                    lowerEndpoint.includes('/warehouses') || 
                    lowerEndpoint.includes('/notebooks') || 
                    lowerEndpoint.includes('/kqldatabases') ||
                    lowerEndpoint.includes('/items') ||
                    lowerEndpoint.includes('/fabrics') ||
                    (lowerEndpoint.startsWith('/workspaces') && !lowerEndpoint.includes('/admin/workspaces'))) {
                    apiTypeToSend = 'fabric';
                } else {
                    apiTypeToSend = 'powerbi';
                }
            }

            const res = await fetch('/api/proxy', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    method,
                    endpoint,
                    body,
                    api_type: apiTypeToSend
                })
            });

            const data = await res.json();
            
            if (data.success) {
                if (data.data && data.data._fallback_applied && window.showNotification) {
                    window.showNotification("注意：检测到 Personal Workspace，已自动静默降级为个人路由接口。", "info");
                }
                
                responseStatus.textContent = `Success`;
                responseStatus.className = 'response-status status-success';
                // 注入高亮的 JSON 树状视图
                responseOutput.innerHTML = syntaxHighlight(data.data);
                responseOutput.className = 'json-viewer';
                responseOutput.style.color = 'var(--badge-custom-text)';
                window.currentJsonResponse = data.data;
                window.currentTablePath = "";
                const toggleGroup = document.getElementById('view-mode-toggles');
                if (toggleGroup) toggleGroup.style.display = 'flex';
                
                // Default to Tree or Table view
                if (Array.isArray(data.data) || (data.data && Array.isArray(data.data.value))) {
                    updateViewMode('table');
                } else {
                    updateViewMode('tree');
                }

                // 仅在成功时存入请求历史
                if (endpoint) {
                    try {
                        let reqHistory = JSON.parse(localStorage.getItem('apiReqHistory') || '[]');
                        
                        // 1. 清洗掉 3 天前（72小时）的老历史记录
                        const threeDaysAgo = Date.now() - 3 * 24 * 60 * 60 * 1000;
                        reqHistory = reqHistory.filter(h => {
                            const ts = h.timestamp || (h.time ? new Date(h.time).getTime() : Date.now());
                            return ts >= threeDaysAgo;
                        });

                        // 2. 智能提取 api_type
                        let apiTypeForHistory = currentApiType;
                        const badge = document.getElementById('request-mode-badge');
                        if (badge && badge.textContent.includes('Free Mode')) {
                            const lowerEndpoint = endpoint.toLowerCase();
                            if (lowerEndpoint.includes('/lakehouses') || 
                                lowerEndpoint.includes('/warehouses') || 
                                lowerEndpoint.includes('/notebooks') || 
                                lowerEndpoint.includes('/kqldatabases') ||
                                lowerEndpoint.includes('/items') ||
                                lowerEndpoint.includes('/fabrics') ||
                                (lowerEndpoint.startsWith('/workspaces') && !lowerEndpoint.includes('/admin/workspaces'))) {
                                apiTypeForHistory = 'fabric';
                            } else {
                                apiTypeForHistory = 'powerbi';
                            }
                        }

                        // 3. 构建历史数据项，允许重复且带时间戳
                        const reqData = { 
                            method: method, 
                            url: endpoint, 
                            body: bodyStr, 
                            time: new Date().toLocaleString(), 
                            timestamp: Date.now(), 
                            api_type: apiTypeForHistory 
                        };

                        reqHistory.unshift(reqData);
                        // 限制最多保留 100 条历史，防止 LocalStorage 被填满
                        if (reqHistory.length > 100) reqHistory.pop();
                        
                        localStorage.setItem('apiReqHistory', JSON.stringify(reqHistory));
                    } catch (e) {
                        console.error('History save error:', e);
                        localStorage.removeItem('apiReqHistory');
                    }
                }
            } else {
                responseStatus.textContent = `Error`;
                responseStatus.className = 'response-status status-error';
                responseOutput.textContent = JSON.stringify(data.error || data, null, 2);
                window.currentJsonResponse = data.error || data;
                window.currentTablePath = "";
                const toggleGroup = document.getElementById('view-mode-toggles');
                if (toggleGroup) toggleGroup.style.display = 'flex';
                
                updateViewMode('tree');
            }

        } catch (err) {
            responseStatus.textContent = `Network Error`;
            responseStatus.className = 'response-status status-error';
            responseOutput.textContent = err.message;
            responseOutput.style.color = 'var(--error)';
            window.currentJsonResponse = null;
            const toggleGroup = document.getElementById('view-mode-toggles');
            if (toggleGroup) toggleGroup.style.display = 'none';
        } finally {
            sendBtn.disabled = false;
            sendBtn.innerHTML = `
                <span>Send Request</span>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z"/></svg>
            `;
        }
    }

    // Unlock 和 Reset 按钮逻辑
    const toggleMethodBtn = document.getElementById('toggle-method-btn');
    const resetRequestBtn = document.getElementById('reset-request-btn');

    // 复制按钮逻辑
    const copyReqBodyBtn = document.getElementById('copy-req-body-btn');
    if (copyReqBodyBtn) {
        const origReqBodyBtnHTML = copyReqBodyBtn.innerHTML;
        copyReqBodyBtn.addEventListener('click', async () => {
            const bodyContent = document.getElementById('request-body').value;
            if (bodyContent) {
                try {
                    await navigator.clipboard.writeText(bodyContent);
                    
                    window.flashCopiedElement(document.getElementById('graphql-editor-container').style.display !== 'none' ? document.getElementById('graphql-editor-container') : document.getElementById('req-body-container'));
                    copyReqBodyBtn.innerHTML = '<span style="font-size: 12px; padding: 0 4px;">Copied!</span>';
                    copyReqBodyBtn.style.color = 'var(--accent)';
                    setTimeout(() => {
                        copyReqBodyBtn.innerHTML = origReqBodyBtnHTML;
                        copyReqBodyBtn.style.color = '';
                    }, 2000);
                } catch(e) {
                    console.error('Failed to copy', e);
                }
            }
        });
    }



    toggleMethodBtn.addEventListener('click', () => {
        methodSelect.disabled = !methodSelect.disabled;
        if (methodSelect.disabled) {
            toggleMethodBtn.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg><span>Unlock</span>';
        } else {
            toggleMethodBtn.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 9.9-1"></path></svg><span>Lock</span>';
        }
    });

    resetRequestBtn.addEventListener('click', () => {
        if (!originalPath) return; // 没有选中过任何 API 则不重置
        methodSelect.value = originalMethod;
        methodSelect.disabled = true;
        toggleMethodBtn.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg><span>Unlock</span>';
        endpointInput.value = originalPath;
        updateParamHints(originalPath);
        bodyInput.value = originalBody;
        
        // 恢复 UI 状态
        selectedApiInfo.style.display = 'block';
        if (activeApiElement) {
            activeApiElement.classList.add('active');
        }
        
        // 恢复标题和 Category
        const apiName = document.getElementById('selected-api-name').textContent;
        if (apiName) {
            updateRequestMode('api', `Bound to: ${apiName}`);
        }
        const rightPanelCatBadge = document.getElementById('right-panel-category-badge');
        if (rightPanelCatBadge && originalCategoryHtml) {
            rightPanelCatBadge.innerHTML = originalCategoryHtml;
        }
    });

    sendBtn.addEventListener('click', () => {
        const method = methodSelect.value;
        const endpoint = window.getInjectedEndpoint(endpointInput.value.trim());
        
        if (!endpoint) {
            alert('请填写 API 路径');
            return;
        }

        const isWriteOperation = ['POST', 'DELETE', 'PUT', 'PATCH'].includes(method.toUpperCase());
        
        if (isWriteOperation) {
            const modal = document.getElementById('confirm-modal');
            const badge = document.getElementById('confirm-method-badge');
            const pathText = document.getElementById('confirm-path-text');
            
            if (modal && badge && pathText) {
                badge.textContent = method;
                badge.className = `method-badge method-${method}`;
                pathText.textContent = endpoint;
                
                modal.style.display = 'flex';
                modal.offsetHeight; // force reflow
                modal.classList.add('show');
                proceedBtn.disabled = false; // re-enable button
                proceedBtn.style.opacity = '1';
            } else {
                executeRequest();
            }
        } else {
            executeRequest();
        }
    });

    // 绑定弹窗控制
    const modal = document.getElementById('confirm-modal');
    const cancelBtn = document.getElementById('confirm-cancel-btn');
    const proceedBtn = document.getElementById('confirm-proceed-btn');
    
    function hideModalWithAnimation() {
        if (modal) {
            modal.classList.remove('show');
            setTimeout(() => {
                modal.style.display = 'none';
            }, 220); // 配合 CSS 0.22s 磨砂过渡
        }
    }
    
    if (modal && cancelBtn && proceedBtn) {
        cancelBtn.addEventListener('click', () => {
            hideModalWithAnimation();
        });
        proceedBtn.addEventListener('click', () => {
            proceedBtn.disabled = true; // Extreme Boundary Defense: prevent double submit
            proceedBtn.style.opacity = '0.5';
            hideModalWithAnimation();
            executeRequest();
        });
    }

    // 复制 cURL 请求绑定
    const copyBtn = document.getElementById('copy-btn');
    if (copyBtn) {
        copyBtn.addEventListener('click', () => {
            const method = methodSelect.value;
            const endpoint = window.getInjectedEndpoint(endpointInput.value.trim());
            const body = bodyInput.value.trim();
            const token = document.getElementById('token-input')?.value.trim() || '';
            
            const baseUrl = currentApiType === 'fabric' ? 'https://api.fabric.microsoft.com/v1.0' : 'https://api.powerbi.com/v1.0/myorg';
            const absoluteUrl = `${baseUrl}${endpoint}`;
            
            let curlCmd = 'curl -X ' + method + ' "' + absoluteUrl + '"';
            curlCmd += ' \\\n  -H "Content-Type: application/json"';
            if (token) {
                curlCmd += ' \\\n  -H "Authorization: Bearer ' + token + '"';
            }
            if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(method) && body) {
                const escapedBody = body.replace(/'/g, "'\\''");
                curlCmd += ' \\\n  -d \'' + escapedBody + '\'';
            }
            
            window.handleCopyAction(copyBtn, curlCmd);
        });
    }


    // 新建空白请求 (New Request)
    const newRequestBtn = document.getElementById('new-request-btn');
    if (newRequestBtn) {
        newRequestBtn.addEventListener('click', () => {
            methodSelect.disabled = false;
            methodSelect.value = 'GET';
            endpointInput.value = '';
            updateParamHints('');
            endpointInput.dispatchEvent(new Event('input'));
            bodyInput.value = '';
            toggleMethodBtn.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg><span>Unlock</span>';
            // 取消当前选中的 API 样式，但保留 original 数据以便 Reset
            document.querySelectorAll('.api-item').forEach(el => el.classList.remove('active'));
            selectedApiInfo.style.display = 'none';
            responseOutput.textContent = '// Response will appear here...';
            responseStatus.textContent = 'Ready';
            responseStatus.className = 'response-status';
            endpointInput.focus();
            
            // 恢复为自由模式
            updateRequestMode('free', 'Free Mode');
        });
    }

    // 请求历史记录 (History)
    const historyReqBtn = document.getElementById('history-request-btn');
    const historyReqDropdown = document.getElementById('request-history-dropdown');
    const historyListContainer = document.getElementById('history-list-container');
    const historySearchInput = document.getElementById('history-search-input');
    const historyClearAll = document.getElementById('history-clear-all');
    
const loadReqHistory = (searchTerm = "") => {
        let history = [];
        try {
            history = JSON.parse(localStorage.getItem('apiReqHistory') || '[]');
        } catch(e) {
            localStorage.removeItem('apiReqHistory');
        }
        
        // 1. 在展示前先执行一次 3 天内数据的清洗
        const threeDaysAgo = Date.now() - 3 * 24 * 60 * 60 * 1000;
        let cleaned = false;
        history = history.filter(h => {
            const ts = h.timestamp || (h.time ? new Date(h.time).getTime() : Date.now());
            if (ts < threeDaysAgo) {
                cleaned = true;
                return false;
            }
            return true;
        });
        if (cleaned) {
            try {
                localStorage.setItem('apiReqHistory', JSON.stringify(history));
            } catch(e) {}
        }
        
        if (searchTerm) {
            const term = searchTerm.toLowerCase();
            history = history.filter(h => 
                h.url.toLowerCase().includes(term) || 
                h.method.toLowerCase().includes(term) || 
                (h.body && h.body.toLowerCase().includes(term)) ||
                (h.time && h.time.toLowerCase().includes(term))
            );
        }

        if (!historyListContainer) return;
        historyListContainer.innerHTML = '';
        
        if (history.length > 0) {
            history.forEach(h => {
                const item = document.createElement('div');
                item.style.cssText = 'padding: 10px 12px; border-bottom: 1px solid var(--panel-border); cursor: pointer; display: flex; flex-direction: column; gap: 6px; transition: background 0.2s;';
                item.onmouseover = () => item.style.background = 'var(--overlay-10)';
                item.onmouseout = () => item.style.background = 'transparent';
                
                const topRow = document.createElement('div');
                topRow.style.cssText = 'display: flex; justify-content: space-between; align-items: flex-start; gap: 8px;';
                
                const methodUrl = document.createElement('div');
                methodUrl.style.cssText = 'flex: 1;';
                const methodColor = h.method === 'GET' ? 'var(--info-dark)' : (h.method === 'POST' ? 'var(--success)' : (h.method === 'DELETE' ? 'var(--error)' : 'var(--warning)'));
                
                // 识别并展示前缀，不再显示 API 描述名称
                const prefix = h.api_type === 'fabric' ? 'https://api.fabric.microsoft.com/v1.0' : 'https://api.powerbi.com/v1.0/myorg';
                const prefixText = h.api_type === 'fabric' ? 'Fabric' : 'Power BI';
                const badgeColor = h.api_type === 'fabric' ? 'var(--info)' : '#F2C811';
                
                const modeHtml = `<span style="display: inline-block; padding: 1px 6px; border-radius: 4px; border: 1px solid ${badgeColor}33; color: ${badgeColor}; background: ${badgeColor}0d; font-size: 0.65rem; font-weight: 500;">${prefixText}</span>`;
                
                methodUrl.innerHTML = `<div style="display: flex; flex-wrap: wrap; align-items: center; gap: 6px;">
                    ${modeHtml}
                    <span style="color: ${methodColor}; font-weight: bold; font-size: 0.8rem;">${h.method}</span>
                    <span style="font-size: 0.75rem; color: var(--text-primary); font-family: 'Fira Code', monospace; word-break: break-all; line-height: 1.4;">
                        <span style="color: var(--text-secondary); opacity: 0.7;">${prefix}</span>${h.url}
                    </span>
                </div>`;
                
                const rightCol = document.createElement('div');
                rightCol.style.cssText = 'display: flex; flex-direction: column; align-items: flex-end; gap: 4px;';
                
                const insertNoteHistoryBtn = document.createElement('span');
                insertNoteHistoryBtn.innerHTML = '📝';
                insertNoteHistoryBtn.title = 'Insert API Link to Note';
                insertNoteHistoryBtn.style.cssText = 'font-size: 1rem; color: var(--text-secondary); cursor: pointer; padding: 0 4px; border-radius: 4px; line-height: 1; margin-top: -1px; margin-right: 4px; transition: all 0.2s;';
                insertNoteHistoryBtn.onmouseover = () => { insertNoteHistoryBtn.style.color = 'var(--accent)'; insertNoteHistoryBtn.style.background = 'var(--badge-custom-bg)'; };
                insertNoteHistoryBtn.onmouseout = () => { insertNoteHistoryBtn.style.color = 'var(--text-secondary)'; insertNoteHistoryBtn.style.background = 'transparent'; };
                insertNoteHistoryBtn.onclick = (e) => {
                    e.stopPropagation();
                    insertSpecificApiIntoNote(h.method, h.url);
                };
                rightCol.appendChild(insertNoteHistoryBtn);

                const delBtn = document.createElement('span');
                delBtn.innerHTML = '&times;';
                delBtn.title = '删除此条记录';
                delBtn.style.cssText = 'font-size: 1.1rem; color: var(--text-secondary); cursor: pointer; padding: 0 4px; border-radius: 4px; line-height: 1; margin-top: -2px; transition: all 0.2s;';
                delBtn.onmouseover = () => { delBtn.style.color = 'var(--error)'; delBtn.style.background = 'var(--status-error-bg)'; };
                delBtn.onmouseout = () => { delBtn.style.color = 'var(--text-secondary)'; delBtn.style.background = 'transparent'; };
                delBtn.onclick = async (e) => {
                    e.stopPropagation();
                    try {
                        let currHistory = JSON.parse(localStorage.getItem('apiReqHistory') || '[]');
                        // 用 timestamp 和 url 唯一删除
                        currHistory = currHistory.filter(curr => {
                            if (h.timestamp && curr.timestamp) {
                                return curr.timestamp !== h.timestamp || curr.url !== h.url;
                            }
                            return curr.time !== h.time || curr.url !== h.url;
                        });
                        localStorage.setItem('apiReqHistory', JSON.stringify(currHistory));
                    } catch(e) {}
                    loadReqHistory(historySearchInput ? historySearchInput.value : "");
                };
                
                rightCol.appendChild(delBtn);
                
                const topRowRight = document.createElement('div');
                topRowRight.style.cssText = 'display: flex; align-items: center; gap: 4px;';
                topRowRight.appendChild(insertNoteHistoryBtn);
                topRowRight.appendChild(delBtn);
                rightCol.innerHTML = ''; // clear previous append
                rightCol.appendChild(topRowRight);
                
                topRow.appendChild(methodUrl);
                topRow.appendChild(rightCol);
                item.appendChild(topRow);
                
                if (h.body) {
                    const bodyPreview = document.createElement('div');
                    bodyPreview.style.cssText = 'font-size: 0.75rem; color: var(--text-secondary); font-family: "Fira Code", monospace; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; background: var(--input-bg); padding: 4px 6px; border-radius: 4px;';
                    bodyPreview.textContent = h.body;
                    item.appendChild(bodyPreview);
                }
                
                // bottom row for time
                const bottomRow = document.createElement('div');
                bottomRow.style.cssText = 'display: flex; justify-content: flex-end; margin-top: 2px;';
                
                const timeSpan = document.createElement('span');
                timeSpan.style.cssText = 'font-size: 0.65rem; color: rgba(110, 118, 129, 0.7);';
                timeSpan.textContent = h.time || '';
                
                bottomRow.appendChild(timeSpan);
                item.appendChild(bottomRow);
                
                item.onclick = () => {
                    methodSelect.value = h.method;
                    endpointInput.value = h.url;
                    updateParamHints(h.url);
                    bodyInput.value = h.body || '';
                                        methodSelect.disabled = true;
                    window.closeWithAnimation(historyReqDropdown);
                    if (historySearchInput) historySearchInput.value = '';
                    
                    updateRequestMode('history', '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="margin-right:4px;vertical-align:middle;"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg> Historical Request');
                    endpointInput.dispatchEvent(new Event('input'));
                };
                
                historyListContainer.appendChild(item);
            });
        } else {
            historyListContainer.innerHTML = '<div style="padding: 16px; color: var(--text-secondary); font-size: 0.85rem; text-align: center;">📜 暂无记录 (No Records Found)</div>';
        }
    };

        if (historySearchInput) {
        historySearchInput.addEventListener('input', (e) => loadReqHistory(e.target.value));
        historySearchInput.addEventListener('click', (e) => e.stopPropagation());
    }

    if (historyClearAll) {
        historyClearAll.onmouseover = () => historyClearAll.style.background = 'var(--status-error-bg)';
        historyClearAll.onmouseout = () => historyClearAll.style.background = 'var(--panel-bg)';
        historyClearAll.onclick = async () => {
            if(await showCustomConfirm('确定要清空所有请求历史记录吗？(Are you sure to clear all request history?)')) {
                localStorage.removeItem('apiReqHistory');
                if (historySearchInput) historySearchInput.value = '';
                loadReqHistory();
                if (historyReqDropdown) historyReqDropdown.style.display = 'none';
            }
        };
    }
    
    if (historyReqBtn && historyReqDropdown) {
        historyReqBtn.addEventListener('click', () => {
            if (historyReqDropdown.style.display === 'none' || historyReqDropdown.classList.contains('is-closing')) {
                if (historySearchInput) historySearchInput.value = '';
                loadReqHistory();
                historyReqDropdown.classList.remove('is-closing');
                historyReqDropdown.style.display = 'flex';
                if (historySearchInput) setTimeout(() => historySearchInput.focus(), 50);
            } else {
                window.closeWithAnimation(historyReqDropdown);
            }
        });
    }

    // --- Modal FLIP & Drag Helper ---
    window.centerModal = function(modalContent) {
        if (!modalContent) return;
        const parent = modalContent.parentElement;
        
        // Always reset to center! User explicitly requested:
        // "在关闭后再次打开时必须自动重置回居中位置"
        if (parent) {
            parent.style.alignItems = 'center';
            parent.style.justifyContent = 'center';
        }
        modalContent.style.position = 'relative';
        modalContent.style.top = '0px';
        modalContent.style.left = '0px';
        modalContent.style.margin = 'auto';
        modalContent.style.transform = 'none';
        modalContent.style.animation = ''; // Do NOT kill animation, allow CSS to handle it
        
        // CLEAR translation state so makeDraggable doesn't read stale values
        modalContent.removeAttribute('data-translate-x');
        modalContent.removeAttribute('data-translate-y');
        modalContent.removeAttribute('data-drag-top');
        modalContent.removeAttribute('data-drag-left');
    };

    window.makeDraggable = makeDraggable;
    function makeDraggable(modalContent, dragHandle) {
        let isDragging = false;
        let startMouseX, startMouseY;
        let currentTranslateX = 0, currentTranslateY = 0;
        let initialTranslateX = 0, initialTranslateY = 0;
        let baseX = 0, baseY = 0, modalWidth = 0, modalHeight = 0;

        

        let rafId = null;
        const SNAP_THRESHOLD = 15; // 15px snapping distance

        const onMouseMove = (e) => {
            if (!isDragging) return;
            const dx = e.clientX - startMouseX;
            const dy = e.clientY - startMouseY;

            let proposedTranslateX = initialTranslateX + dx;
            let proposedTranslateY = initialTranslateY + dy;

            // Calculate absolute position
            let proposedLeft = baseX + proposedTranslateX;
            let proposedTop = baseY + proposedTranslateY;
            let proposedRight = proposedLeft + modalWidth;
            let proposedBottom = proposedTop + modalHeight;

            // Edge Snapping Logic
            if (Math.abs(proposedLeft) < SNAP_THRESHOLD) {
                proposedTranslateX -= proposedLeft; // Snap to left edge (0)
            } else if (Math.abs(window.innerWidth - proposedRight) < SNAP_THRESHOLD) {
                proposedTranslateX += (window.innerWidth - proposedRight); // Snap to right edge
            }

            if (Math.abs(proposedTop) < SNAP_THRESHOLD) {
                proposedTranslateY -= proposedTop; // Snap to top edge (0)
            } else if (Math.abs(window.innerHeight - proposedBottom) < SNAP_THRESHOLD) {
                proposedTranslateY += (window.innerHeight - proposedBottom); // Snap to bottom edge
            }

            currentTranslateX = proposedTranslateX;
            currentTranslateY = proposedTranslateY;

            if (!rafId) {
                rafId = requestAnimationFrame(() => {
                    modalContent.style.transform = `translate3d(${currentTranslateX}px, ${currentTranslateY}px, 0)`;
                    rafId = null;
                });
            }
        };

        const onMouseUp = () => {
            if (isDragging) {
                isDragging = false;
                document.body.style.cursor = '';
                document.body.style.userSelect = '';
                modalContent.setAttribute('data-translate-y', currentTranslateY);
                modalContent.setAttribute('data-translate-x', currentTranslateX);

                // Hide drag shield
                const shield = modalContent.querySelector('.drag-shield');
                if (shield) shield.style.display = 'none';

                document.querySelectorAll('iframe').forEach(f => f.style.pointerEvents = '');
                modalContent.style.backdropFilter = '';
                modalContent.style.webkitBackdropFilter = '';
                modalContent.style.boxShadow = '';
                modalContent.style.transition = '';

                window.removeEventListener('mousemove', onMouseMove);
                window.removeEventListener('mouseup', onMouseUp, true);
                document.removeEventListener('mousemove', onMouseMove);
                document.removeEventListener('mouseup', onMouseUp, true);
            }
        };

        modalContent.addEventListener('mousedown', (e) => {
            if (['INPUT', 'BUTTON', 'TEXTAREA', 'SELECT', 'A'].includes(e.target.tagName) || e.target.closest('button, input, select, textarea, a, td, th, table, details, summary')) return;
            if (e.offsetX > e.target.clientWidth || e.offsetY > e.target.clientHeight) return; // Ignore scrollbar clicks

            // Read previous translation state to avoid jumping on subsequent drags
            const dt = modalContent.getAttribute('data-translate-y');
            const dl = modalContent.getAttribute('data-translate-x');
            if (dt) currentTranslateY = parseFloat(dt);
            else currentTranslateY = 0;
            
            if (dl) currentTranslateX = parseFloat(dl);
            else currentTranslateX = 0;

            isDragging = true;
            document.body.style.cursor = 'grabbing';
            startMouseX = e.clientX;
            startMouseY = e.clientY;
            initialTranslateX = currentTranslateX;
            initialTranslateY = currentTranslateY;

            const rect = modalContent.getBoundingClientRect();
            baseX = rect.left - initialTranslateX;
            baseY = rect.top - initialTranslateY;
            modalWidth = rect.width;
            modalHeight = rect.height;

            // Kill CSS keyframe animation and transitions to prevent drag lag
            modalContent.style.animation = 'none';
            modalContent.style.transition = 'none'; // Force kill transition
            modalContent.style.setProperty('transition', 'none', 'important');
            
            // Create a full transparent drag shield over modal to eliminate 100% of iframe hover & GPU backdrop recalculation lag
            let shield = modalContent.querySelector('.drag-shield');
            if (!shield) {
                shield = document.createElement('div');
                shield.className = 'drag-shield';
                shield.style.cssText = 'position: absolute; top: 0; left: 0; width: 100%; height: 100%; z-index: 999999; background: transparent; cursor: grabbing;';
                modalContent.appendChild(shield);
            } else {
                shield.style.display = 'block';
            }

            document.querySelectorAll('iframe').forEach(f => f.style.pointerEvents = 'none');
            modalContent.style.backdropFilter = 'none';
            modalContent.style.webkitBackdropFilter = 'none';
            modalContent.style.boxShadow = 'none';

            document.body.style.userSelect = 'none';

            window.addEventListener('mousemove', onMouseMove, { passive: true });
            window.addEventListener('mouseup', onMouseUp, true);
        });
    }

    window.setupFLIPModal = function setupFLIPModal(btnOpen, btnClose, modalOverlay, onLoadCallback = null) {
        if (!btnOpen || !btnClose || !modalOverlay) return;
        const modalContent = modalOverlay.querySelector('.modal-content');
        const modalHeader = modalOverlay.querySelector('.modal-header');

        if (modalContent && modalHeader) {
            makeDraggable(modalContent, modalHeader);
        }

        btnOpen.addEventListener('click', async () => { console.log('FLIPModal CLICKED', btnOpen.id);
            if (onLoadCallback) {
                onLoadCallback();
            }
            // Reset drag position on open
            if (modalContent) {
                window.centerModal(modalContent);
            }
            // CSS handles the animation via @keyframes modalPopUp on .modal-content
            modalOverlay.style.display = 'flex';
        });

        btnClose.addEventListener('click', () => {
            window.closeModalWithAnimation(modalOverlay.id);
        });
    }

    // Global modal click outside to close
    document.querySelectorAll('.modal-overlay, .confirm-modal-overlay').forEach(modal => {
        modal.addEventListener('mousedown', (e) => {
            if (e.target === modal) {
                const closeBtn = modal.querySelector('.close-btn') || 
                                 modal.querySelector('#confirm-cancel-btn') || 
                                 modal.querySelector('#close-modal-btn');
                                 
                if (closeBtn) {
                    closeBtn.click();
                } else {
                    const closeBtnByOnClick = modal.querySelector('button[onclick*="style.display=\'none\'"]');
                    if (closeBtnByOnClick) closeBtnByOnClick.click();
                    else modal.style.display = 'none';
                }
            }
        });
    });

    // Pipeline Modal Logic
    const btnSmartOps = document.getElementById('btn-smart-ops');
    const pipelineModal = document.getElementById('pipeline-modal');
    const closePipelineBtn = document.getElementById('close-modal-btn');
    const startPipelineBtn = document.getElementById('start-pipeline-btn');
    const terminal = document.getElementById('pipeline-terminal');

    if (btnSmartOps) {
        setupFLIPModal(btnSmartOps, closePipelineBtn, pipelineModal);

        startPipelineBtn.addEventListener('click', () => {
            terminal.innerHTML = '';
            startPipelineBtn.disabled = true;
            startPipelineBtn.textContent = '运行中 (Running)...';
            startPipelineBtn.style.opacity = '0.5';

            const ws = document.getElementById('active-workspace')?.value || '';
            const ds = document.getElementById('active-dataset')?.value || '';
            const rp = document.getElementById('active-report')?.value || '';
            const params = new URLSearchParams({ workspace_id: ws, dataset_id: ds, report_id: rp });

            const evtSource = new EventSource(`/api/pipeline/run?${params.toString()}`);
            
            evtSource.onmessage = function(event) {
                const data = JSON.parse(event.data);
                const line = document.createElement('div');
                line.className = 'terminal-line';
                
                let cls = 'info';
                if (data.status === 'success') cls = 'success';
                else if (data.status === 'warning') cls = 'warning';
                else if (data.status === 'error') cls = 'error';
                
                const timeStr = new Date().toLocaleTimeString('en-US', {hour12: false});
                line.innerHTML = `<span style="color: var(--text-secondary)">[${timeStr}]</span> <span class="${cls}">${data.message}</span>`;
                terminal.appendChild(line);
                // 统一规则：滚到底部上方两行距离处（约40px），让用户始终能看到最新输出
                terminal.scrollTop = Math.max(0, terminal.scrollHeight - terminal.clientHeight - 40);
                
                if (data.status === 'error' || data.status === 'success') {
                    evtSource.close();
                    startPipelineBtn.disabled = false;
                    startPipelineBtn.innerHTML = '✨ 再次执行全链路扫描 (Run Again)';
                    startPipelineBtn.style.opacity = '1';
                }
            };

            evtSource.onerror = function(err) {
                console.error('SSE Error:', err);
                const line = document.createElement('div');
                line.className = 'terminal-line error';
                line.textContent = '[系统] 与服务器的流式连接断开。';
                terminal.appendChild(line);
                evtSource.close();
                startPipelineBtn.disabled = false;
                startPipelineBtn.innerHTML = '✨ 再次执行全链路扫描 (Run Again)';
                startPipelineBtn.style.opacity = '1';
            };
        });
    }


    // Test Harness Modal Logic

    const btnTestHarness = document.getElementById('btn-test-harness');
    const testHarnessModal = document.getElementById('test-harness-modal');
    const closeHarnessBtn = testHarnessModal ? testHarnessModal.querySelector('.close-modal') : null;
    const btnHarnessExecute = document.getElementById('btn-harness-execute');
    const btnHarnessSelectAll = document.getElementById('btn-harness-select-all');
    const btnHarnessClearAll = document.getElementById('btn-harness-clear-all');
    const harnessTestList = document.getElementById('harness-test-list');

    if (btnTestHarness && testHarnessModal) {
        const loadHarnessTests = async () => {
            if (harnessTestList.querySelectorAll('.harness-test-cb').length > 0) return;
            try {
                harnessTestList.innerHTML = '<p>Loading tests...</p>';
                const res = await fetch('/api/harness/tests');
                const data = await res.json();
                if (data.success) {
                    harnessTestList.innerHTML = '';
                    data.tests.forEach((test, idx) => {
                        const label = document.createElement('label');
                        label.style.display = 'flex';
                        label.style.alignItems = 'center';
                        label.style.gap = '8px';
                        label.style.cursor = 'pointer';
                        
                        const cb = document.createElement('input');
                        cb.type = 'checkbox';
                        cb.className = 'harness-test-cb';
                        cb.dataset.name = test.name;
                        cb.dataset.type = test.type;
                        
                        cb.addEventListener('change', window.updateHarnessStats);
                        const text = document.createElement('span');
                        text.textContent = `[${test.type}] ${test.name}`;
                        text.style.fontSize = '0.85rem';
                        
                        label.appendChild(cb);
                        label.appendChild(text);
                        harnessTestList.appendChild(label);
                    });
                    if (window.updateHarnessStats) window.updateHarnessStats();
                } else {
                    harnessTestList.innerHTML = `<p style="color: var(--danger-color);">Error loading tests: ${data.error}</p>`;
                }
            } catch (err) {
                harnessTestList.innerHTML = `<p style="color: var(--danger-color);">Error loading tests: ${err.message}</p>`;
            }
        };

        console.log('BINDING btnTestHarness:', !!btnTestHarness);
window.setupFLIPModal(btnTestHarness, closeHarnessBtn, testHarnessModal, loadHarnessTests);
        
        btnHarnessSelectAll?.addEventListener('click', () => {
            document.querySelectorAll('.harness-test-cb').forEach(cb => cb.checked = true);
            if (window.updateHarnessStats) window.updateHarnessStats();
        });
        
        btnHarnessClearAll?.addEventListener('click', () => {
            document.querySelectorAll('.harness-test-cb').forEach(cb => cb.checked = false);
            if (window.updateHarnessStats) window.updateHarnessStats();
        });
        
        btnHarnessExecute?.addEventListener('click', async () => {
            const selected = Array.from(document.querySelectorAll('.harness-test-cb:checked')).map(cb => ({
                name: cb.dataset.name,
                type: cb.dataset.type
            }));
            
            if (selected.length === 0) {
                window.showCustomAlert('Please select at least one test to execute.', 'warning');
                return;
            }
            
            btnHarnessExecute.disabled = true;
            const originalText = btnHarnessExecute.innerHTML;
            const originalMainText = btnTestHarness ? btnTestHarness.innerHTML : '';
            const spinnerHtml = '<span class="spinner" style="display:inline-block; width:12px; height:12px; border:2px solid var(--text-primary); border-top-color:transparent; border-radius:50%; animation:spin 1s linear infinite;"></span>';
            btnHarnessExecute.innerHTML = `${spinnerHtml} Running tests...`;
            if (btnTestHarness) {
                btnTestHarness.innerHTML = spinnerHtml;
            }
            btnHarnessExecute.innerHTML = '<span class="spinner" style="display:inline-block; width:12px; height:12px; border:2px solid var(--text-primary); border-top-color:transparent; border-radius:50%; animation:spin 1s linear infinite;"></span> Running tests...';
            
            try {
                const res = await fetch('/api/harness/run', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ tests: selected })
                });
                const data = await res.json();
                
                // keep modal open so results popup over it
                
                if (data.success) {
                    const htmlContent = `<div style="font-size: 14px; margin-bottom: 10px; color: var(--text-primary);">
<strong>Tests executed successfully!</strong>
</div>
<details style="background: var(--bg-color); padding: 8px; border-radius: 4px; border: 1px solid var(--panel-border);">
<summary style="cursor: pointer; font-weight: bold; color: var(--accent); user-select: none;">Click to view detailed logs</summary>
<pre style="margin-top: 10px; white-space: pre-wrap; font-size: 12px; max-height: 300px; overflow-y: auto; color: var(--text-secondary); background: transparent; border: none;">${data.logs.substring(0, 5000)}${data.logs.length > 5000 ? '\\n... (truncated)' : ''}</pre>
</details>`;
                    window.showCustomAlert(htmlContent, '✅ Tests executed', true);
                } else {
                    const htmlContent = `<div style="font-size: 14px; margin-bottom: 10px; color: var(--danger);">
<strong>Tests execution failed.</strong>
</div>
<details style="background: var(--bg-color); padding: 8px; border-radius: 4px; border: 1px solid var(--danger);">
<summary style="cursor: pointer; font-weight: bold; color: var(--danger); user-select: none;">Click to view detailed error logs</summary>
<pre style="margin-top: 10px; white-space: pre-wrap; font-size: 12px; max-height: 300px; overflow-y: auto; color: var(--text-secondary); background: transparent; border: none;">${data.error}</pre>
</details>`;
                    window.showCustomAlert(htmlContent, '❌ Execution Failed', true);
                }
            } catch (err) {
                window.showCustomAlert(`❌ Error executing tests: ${err.message}`, 'error');
            } finally {
                btnHarnessExecute.disabled = false;
                btnHarnessExecute.innerHTML = originalText;
                if (btnTestHarness) {
                    btnTestHarness.innerHTML = originalMainText;
                }
            }
        });
    }
    




    // Settings Modal Logic
    const btnSettings = document.getElementById('btn-settings');
    const settingsModal = document.getElementById('settings-modal');
    const closeSettingsBtn = document.getElementById('close-settings-btn');
    const saveSettingsBtn = document.getElementById('save-settings-btn');

    if (btnSettings && settingsModal) {


        const loadSettings = async () => {
            try {
                const res = await fetch('/api/settings');
                const data = await res.json();
                document.getElementById('set-sql').value = data.SQL_CONN_STR || '';
                // Load local storage lists
                const loadList = (containerId, key, serverList) => {
                    const container = document.getElementById(containerId);
                    if (!container) return;
                    container.innerHTML = '';
                    
                    let items = [];
                    // Prefer server list if available and local is empty
                    const localItems = JSON.parse(localStorage.getItem(key) || '[]');
                    if (localItems.length > 0) {
                        items = localItems;
                    } else if (serverList && serverList.length > 0) {
                        items = serverList;
                        localStorage.setItem(key, JSON.stringify(items));
                        window.renderContextDropdowns();
                    }
                    
                    if (items.length === 0) {
                        window.addListRow(containerId); // one empty row default
                    } else {
                        items.forEach(item => window.addListRow(containerId, item.alias || item.name, item.id, item.type || "", item.state || ""));
                    }
                };
                loadList('workspace-list', 'pbi_workspaces', data.PBI_WORKSPACES);
                loadList('dataset-list', 'pbi_datasets', data.PBI_DATASETS);
                loadList('report-list', 'pbi_reports', data.PBI_REPORTS);
                document.getElementById('set-client').value = data.CLIENT_ID || '';
                document.getElementById('set-secret').value = data.CLIENT_SECRET || '';
                document.getElementById('set-username').value = data.USERNAME || '';
                document.getElementById('set-password').value = data.PASSWORD || '';
                document.getElementById('set-tenant').value = data.TENANT_ID || '';
                
                const authModeRadios = document.getElementsByName('pbi_auth_mode');
                let activeAuthMode = 'service_principal';
                for (let radio of authModeRadios) {
                    if (radio.value === (data.AUTH_MODE || 'service_principal')) {
                        radio.checked = true;
                        activeAuthMode = radio.value;
                        break;
                    }
                }
                window.updateAuthModeVisibility(activeAuthMode);

            } catch (err) {
                console.error('Failed to load settings:', err);
            }
        };

        window.updateAuthModeVisibility = function(mode) {
            if (!mode) {
                const checked = document.querySelector('input[name="pbi_auth_mode"]:checked');
                mode = checked ? checked.value : 'service_principal';
            }
            const spFields = document.getElementById('auth-sp-fields');
            const personalFields = document.getElementById('auth-personal-fields');
            
            if (mode === 'service_principal') {
                if (spFields) {
                    spFields.style.display = 'block';
                    void spFields.offsetWidth;
                    spFields.style.maxHeight = '600px';
                    spFields.style.opacity = '1';
                    spFields.style.pointerEvents = 'auto';
                    spFields.style.transform = 'translateY(0)';
                }
                if (personalFields) {
                    personalFields.style.maxHeight = '0px';
                    personalFields.style.opacity = '0';
                    personalFields.style.pointerEvents = 'none';
                    personalFields.style.transform = 'translateY(-6px)';
                    setTimeout(() => {
                        const current = document.querySelector('input[name="pbi_auth_mode"]:checked');
                        if (current && current.value === 'service_principal') {
                            personalFields.style.display = 'none';
                        }
                    }, 300);
                }
            } else {
                if (personalFields) {
                    personalFields.style.display = 'block';
                    void personalFields.offsetWidth;
                    personalFields.style.maxHeight = '600px';
                    personalFields.style.opacity = '1';
                    personalFields.style.pointerEvents = 'auto';
                    personalFields.style.transform = 'translateY(0)';
                }
                if (spFields) {
                    spFields.style.maxHeight = '0px';
                    spFields.style.opacity = '0';
                    spFields.style.pointerEvents = 'none';
                    spFields.style.transform = 'translateY(-6px)';
                    setTimeout(() => {
                        const current = document.querySelector('input[name="pbi_auth_mode"]:checked');
                        if (current && current.value === 'personal') {
                            spFields.style.display = 'none';
                        }
                    }, 300);
                }
            }
            if (window.updateWorkflowAuthBadge) window.updateWorkflowAuthBadge();
        };

        setupFLIPModal(btnSettings, closeSettingsBtn, settingsModal, loadSettings);

        const toggleSecretBtn = document.getElementById('toggle-secret-btn');
        const setSecretInput = document.getElementById('set-secret');
        const eyeIconShow = document.getElementById('eye-icon-show');
        const eyeIconHide = document.getElementById('eye-icon-hide');
        if (toggleSecretBtn && setSecretInput && eyeIconShow && eyeIconHide) {
            toggleSecretBtn.addEventListener('click', () => {
                if (setSecretInput.type === 'password') {
                    setSecretInput.type = 'text';
                    eyeIconShow.style.display = 'none';
                    eyeIconHide.style.display = 'block';
                } else {
                    setSecretInput.type = 'password';
                    eyeIconShow.style.display = 'block';
                    eyeIconHide.style.display = 'none';
                }
            });
        }

        const verifySettingsBtn = document.getElementById('verify-settings-btn');
        if (verifySettingsBtn) {
            verifySettingsBtn.addEventListener('click', async () => {
                const clientId = document.getElementById('set-client').value.trim();
                const clientSecret = document.getElementById('set-secret').value.trim();
                const username = document.getElementById('set-username').value.trim();
                const password = document.getElementById('set-password').value.trim();
                const tenantId = document.getElementById('set-tenant').value.trim();
                
                let authMode = 'service_principal';
                const authModeRadios = document.getElementsByName('pbi_auth_mode');
                for (let radio of authModeRadios) {
                    if (radio.checked) authMode = radio.value;
                }
                
                if (authMode === 'personal' && (!clientId || !tenantId || !username || !password)) {
                    alert("Personal Auth 需要填写 TENANT_ID, CLIENT_ID, USERNAME 和 PASSWORD！");
                    return;
                } else if (authMode === 'service_principal' && (!clientId || !tenantId || !clientSecret)) {
                    alert("Service Principal 需要填写 TENANT_ID, CLIENT_ID 和 CLIENT_SECRET！");
                    return;
                }

                const originalText = verifySettingsBtn.textContent;
                const originalWidth = verifySettingsBtn.style.width;
                verifySettingsBtn.disabled = true;
                verifySettingsBtn.textContent = '⏳';
                verifySettingsBtn.style.transition = 'all 0.3s ease';
                verifySettingsBtn.style.width = 'auto';

                const resetBtn = () => {
                    verifySettingsBtn.textContent = originalText;
                    verifySettingsBtn.style.width = originalWidth;
                    verifySettingsBtn.style.background = '';
                    verifySettingsBtn.style.color = '';
                    verifySettingsBtn.style.borderColor = '';
                    verifySettingsBtn.disabled = false;
                };

                try {
                    const res = await fetch('/api/settings/verify', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            pbi_client_id: clientId,
                            pbi_client_secret: clientSecret,
                            pbi_username: username,
                            pbi_password: password,
                            pbi_tenant_id: tenantId,
                            pbi_auth_mode: authMode
                        })
                    });
                    const result = await res.json();
                    
                    if (result.success) {
                        verifySettingsBtn.innerHTML = '✅ Success';
                        verifySettingsBtn.style.background = 'var(--status-success-bg, rgba(16, 185, 129, 0.2))';
                        verifySettingsBtn.style.color = 'var(--success, var(--success))';
                        verifySettingsBtn.style.borderColor = 'var(--success, var(--success))';
                        
                        // Add pop animation
                        verifySettingsBtn.style.transform = 'scale(1.1)';
                        setTimeout(() => verifySettingsBtn.style.transform = 'scale(1)', 200);
                        
                        setTimeout(resetBtn, 2500);

                        if (window.saveAuthSnapshot) {
                            window.saveAuthSnapshot(result.app_name || "Auto-Saved Profile");
                        }
                        if (result.app_name) {
                            localStorage.setItem('pbi_app_name', result.app_name);
                        }
                        if (result.tenant_name) {
                            localStorage.setItem('pbi_tenant_name', result.tenant_name);
                            const tnameInput = document.getElementById('set-tenant-name');
                            if (tnameInput && !tnameInput.value.trim()) {
                                tnameInput.value = result.tenant_name;
                            }
                        }
                        localStorage.setItem('pbi_tenant_id', tenantId);
                        const tname = document.getElementById('set-tenant-name') ? document.getElementById('set-tenant-name').value.trim() : '';
                        localStorage.setItem('pbi_tenant_name', tname);
                        window.renderEnvIdentity();
                    } else {
                        verifySettingsBtn.innerHTML = '❌ Failed';
                        verifySettingsBtn.style.background = 'var(--status-error-bg, var(--status-error-bg))';
                        verifySettingsBtn.style.color = 'var(--error, var(--error))';
                        verifySettingsBtn.style.borderColor = 'var(--error, var(--error))';
                        
                        // Add shake animation manually
                        verifySettingsBtn.style.transform = 'translateX(-4px)';
                        setTimeout(() => verifySettingsBtn.style.transform = 'translateX(4px)', 100);
                        setTimeout(() => verifySettingsBtn.style.transform = 'translateX(-4px)', 200);
                        setTimeout(() => verifySettingsBtn.style.transform = 'translateX(4px)', 300);
                        setTimeout(() => verifySettingsBtn.style.transform = 'translateX(0)', 400);

                        setTimeout(() => {
                            resetBtn();
                            alert(result.message); // Still show error detail after animation
                        }, 2500);
                    }
                } catch (err) {
                    verifySettingsBtn.innerHTML = '❌ Error';
                    verifySettingsBtn.style.background = 'var(--status-error-bg, var(--status-error-bg))';
                    verifySettingsBtn.style.color = 'var(--error, var(--error))';
                    verifySettingsBtn.style.borderColor = 'var(--error, var(--error))';
                    setTimeout(() => {
                        resetBtn();
                        alert('网络错误: ' + err);
                    }, 2500);
                }
            });
        }

        const verifySqlBtn = document.getElementById('verify-sql-btn');
        if (verifySqlBtn) {
            verifySqlBtn.addEventListener('click', async () => {
                const sqlConn = document.getElementById('set-sql').value.replace(/\r?\n|\r/g, '').trim();

                if (!sqlConn) {
                    alert("请先填写 SQL_CONN_STR！");
                    return;
                }

                await window.animateVerifyBtn(verifySqlBtn, async () => {
                    const res = await fetch('/api/settings/verify-sql', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            pbi_sql_conn: sqlConn
                        })
                    });
                    return await res.json();
                });
            });
        }

        const settingsForm = document.getElementById('settings-form');
        settingsForm.addEventListener('submit', async (e) => {
            e.preventDefault(); // 阻止页面刷新，但允许浏览器捕获 submit 以保存表单历史
            const rect = saveSettingsBtn.getBoundingClientRect();
            saveSettingsBtn.style.width = rect.width + 'px';
            saveSettingsBtn.style.height = rect.height + 'px';
            saveSettingsBtn.style.boxSizing = 'border-box';
            saveSettingsBtn.style.justifyContent = 'center';
            saveSettingsBtn.disabled = true;
            saveSettingsBtn.textContent = '保存中...';
            
            // Save lists to local storage
            localStorage.setItem('pbi_workspaces', JSON.stringify(window.getListData('workspace-list')));
            localStorage.setItem('pbi_datasets', JSON.stringify(window.getListData('dataset-list')));
            localStorage.setItem('pbi_reports', JSON.stringify(window.getListData('report-list')));
            window.renderContextDropdowns();
            
            let authMode = 'service_principal';
            const authModeRadios = document.getElementsByName('pbi_auth_mode');
            for (let radio of authModeRadios) {
                if (radio.checked) authMode = radio.value;
            }
            
            const payload = {
                SQL_CONN_STR: document.getElementById('set-sql').value.replace(/\r?\n|\r/g, '').trim(),
                CLIENT_ID: document.getElementById('set-client').value.trim(),
                CLIENT_SECRET: document.getElementById('set-secret').value.trim(),
                USERNAME: document.getElementById('set-username').value.trim(),
                PASSWORD: document.getElementById('set-password').value.trim(),
                TENANT_ID: document.getElementById('set-tenant').value.trim(),
                TENANT_NAME: document.getElementById('set-tenant-name') ? document.getElementById('set-tenant-name').value.trim() : '',
                AUTH_MODE: authMode,
                PBI_WORKSPACES: window.getListData('workspace-list'),
                PBI_DATASETS: window.getListData('dataset-list'),
                PBI_REPORTS: window.getListData('report-list')
            };

            try {
                const res = await fetch('/api/settings', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });
                const result = await res.json();
                if (result.success) {
                    backendSettingsCache = { ...backendSettingsCache, ...payload };
                    saveSettingsBtn.textContent = '✅ 已保存';
                    
                    // Trigger UI updates for auth badges
                    if (window.renderEnvIdentity) window.renderEnvIdentity();
                    if (window.updateWorkflowAuthBadge) window.updateWorkflowAuthBadge();

                    setTimeout(() => {
                        settingsModal.classList.add('fade-out');
                        setTimeout(() => {
                            settingsModal.style.display = 'none';
                            settingsModal.classList.remove('fade-out');
                            saveSettingsBtn.disabled = false;
                            saveSettingsBtn.style.width = '';
                            saveSettingsBtn.style.height = '';
                            saveSettingsBtn.style.boxSizing = '';
                            saveSettingsBtn.style.justifyContent = '';
                            saveSettingsBtn.textContent = '💾 保存配置 (Save & Apply)';
                        }, 250);
                    }, 800);
                } else {
                    alert('保存失败: ' + result.message);
                    saveSettingsBtn.disabled = false;
                    saveSettingsBtn.style.width = '';
                    saveSettingsBtn.style.height = '';
                    saveSettingsBtn.style.boxSizing = '';
                    saveSettingsBtn.style.justifyContent = '';
                    saveSettingsBtn.textContent = '💾 保存配置 (Save & Apply)';
                }
            } catch (err) {
                alert('网络错误: ' + err);
                saveSettingsBtn.disabled = false;
                saveSettingsBtn.style.width = '';
                saveSettingsBtn.textContent = '💾 保存配置 (Save & Apply)';
            }
        });
    }

    // Pre-fetch settings asynchronously so export button click is fully synchronous to avoid browser popup blockers
    let backendSettingsCache = {};
    fetch('/api/settings').then(res => res.json()).then(data => { backendSettingsCache = data; }).catch(console.error);

    // Export/Import Local Data Logic
    const exportLocalBtn = document.getElementById('export-local-btn');
    const importLocalBtn = document.getElementById('import-local-btn');
    const importLocalFile = document.getElementById('import-local-file');
    
    if (exportLocalBtn) {
        exportLocalBtn.addEventListener('click', () => {
            const backendSettings = backendSettingsCache;
            const data = {
                bookmarks: localStorage.getItem('pbi-bookmarks'),
                history: localStorage.getItem('apiReqHistory'),
                workspaces: localStorage.getItem('pbi_workspaces') || JSON.stringify(backendSettings.PBI_WORKSPACES || []),
                datasets: localStorage.getItem('pbi_datasets') || JSON.stringify(backendSettings.PBI_DATASETS || []),
                reports: localStorage.getItem('pbi_reports') || JSON.stringify(backendSettings.PBI_REPORTS || []),
                tenantId: backendSettings.TENANT_ID || localStorage.getItem('pbi_tenant_id'),
                tenantName: backendSettings.TENANT_NAME || localStorage.getItem('pbi_tenant_name'),
                appName: localStorage.getItem('pbi_app_name'),
                clientId: backendSettings.CLIENT_ID,
                clientSecret: backendSettings.CLIENT_SECRET,
                authMode: backendSettings.AUTH_MODE,
                username: backendSettings.USERNAME,
                password: backendSettings.PASSWORD,
                sqlConnStr: backendSettings.SQL_CONN_STR
            };
            const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            
            // 动态获取当前域名，如果是本地则包含 localhost，如果是线上则包含 onrender 等
            let envName = window.location.hostname;
            if (envName === '127.0.0.1') envName = 'localhost';
            envName = envName.replace(/[^a-zA-Z0-9-]/g, '_'); // 过滤掉域名中的点号等特殊字符
            
            a.download = `pbi_backup_${envName}_${new Date().getTime()}.json`;
            a.click();
            URL.revokeObjectURL(url);
        });
    }

    if (importLocalBtn && importLocalFile) {
        importLocalBtn.addEventListener('click', () => {
            importLocalFile.click();
        });

        importLocalFile.addEventListener('change', async (e) => {
            const file = e.target.files[0];
            if (!file) return;

            const reader = new FileReader();
            reader.onload = async (event) => {
                try {
                    const data = JSON.parse(event.target.result);
                    if (data.bookmarks) {
                        localStorage.setItem('pbi-bookmarks', data.bookmarks);
                        await fetch('/api/bookmarks', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: data.bookmarks }).catch(e=>console.error(e));
                    }
                    if (data.history) localStorage.setItem('apiReqHistory', data.history);
                    if (data.workspaces) localStorage.setItem('pbi_workspaces', data.workspaces);
                    if (data.datasets) localStorage.setItem('pbi_datasets', data.datasets);
                    if (data.reports) localStorage.setItem('pbi_reports', data.reports);
                    if (data.tenantId) localStorage.setItem('pbi_tenant_id', data.tenantId);
                    if (data.appName) localStorage.setItem('pbi_app_name', data.appName);

                    // Fetch existing settings so we don't overwrite with empty
                    const res = await fetch('/api/settings');
                    const existing = await res.json();
                    
                    const payload = {
                        CLIENT_ID: data.clientId !== undefined ? data.clientId : existing.CLIENT_ID,
                        CLIENT_SECRET: data.clientSecret !== undefined ? data.clientSecret : existing.CLIENT_SECRET,
                        USERNAME: data.username !== undefined ? data.username : existing.USERNAME,
                        PASSWORD: data.password !== undefined ? data.password : existing.PASSWORD,
                        TENANT_ID: data.tenantId !== undefined ? data.tenantId : existing.TENANT_ID,
                        TENANT_NAME: data.tenantName !== undefined ? data.tenantName : existing.TENANT_NAME,
                        SQL_CONN_STR: data.sqlConnStr !== undefined ? data.sqlConnStr : existing.SQL_CONN_STR,
                        AUTH_MODE: data.authMode !== undefined ? data.authMode : existing.AUTH_MODE,
                        PBI_WORKSPACES: data.workspaces ? JSON.parse(data.workspaces) : existing.PBI_WORKSPACES,
                        PBI_DATASETS: data.datasets ? JSON.parse(data.datasets) : existing.PBI_DATASETS,
                        PBI_REPORTS: data.reports ? JSON.parse(data.reports) : existing.PBI_REPORTS
                    };

                    await fetch('/api/settings', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(payload)
                    });
                    
                    // 导入后瞬间刷新页面，不再阻塞等待用户点击
                    window.location.reload();
                } catch (err) {
                    alert('导入失败：文件格式错误或已损坏。');
                    console.error('Import error:', err);
                }
            };
            reader.readAsText(file);
            // Reset input value to allow importing the same file again
            importLocalFile.value = '';
        });
    }

    // 拖拽改变侧边栏宽度
    const resizer = document.getElementById('dragMe');
    const sidebar = document.querySelector('.sidebar');
    let isResizing = false;

    // 垂直拖拽改变 Request 窗口高度
    const vResizer = document.getElementById('vertical-resizer');
    const requestBuilder = document.querySelector('.request-builder');
    let isVerticalResizing = false;
    let startY = 0;
    let startHeight = 0;

    // --- 恢复布局状态 ---
    const savedSidebarWidth = localStorage.getItem('pbi-sidebar-width');
    if (savedSidebarWidth) {
        sidebar.style.width = savedSidebarWidth;
        sidebar.style.minWidth = savedSidebarWidth; document.documentElement.style.setProperty('--sidebar-width', savedSidebarWidth);
    }
    const bodyEditorContainer = document.querySelector('.body-editor-container');
    const savedRequestHeight = localStorage.getItem('pbi-request-height');
    if (savedRequestHeight) {
        bodyEditorContainer.style.height = savedRequestHeight;
        bodyEditorContainer.style.flex = 'none';
    }
    // --- 结束恢复 ---

    resizer.addEventListener('mousedown', (e) => {
        isResizing = true;
        resizer.classList.add('active');
        document.body.style.cursor = 'col-resize';
        document.body.style.userSelect = 'none';
    });

    let minAllowedHeight = 150;
    vResizer.addEventListener('mousedown', (e) => {
        isVerticalResizing = true;
        
        startY = e.clientY;
        startHeight = bodyEditorContainer.getBoundingClientRect().height;
        minAllowedHeight = 100;
        vResizer.classList.add('active');
        document.body.style.cursor = 'row-resize';
        document.body.style.userSelect = 'none';
    });

    document.addEventListener('mousemove', (e) => {
        if (isResizing) {
            const containerOffsetLeft = document.querySelector('.app-container').offsetLeft;
            let newWidth = e.clientX - containerOffsetLeft - 16;
            if (newWidth < 200) newWidth = 200;
            if (newWidth > 600) newWidth = 600;
            sidebar.style.width = `${newWidth}px`;
            sidebar.style.minWidth = `${newWidth}px`;
            document.documentElement.style.setProperty('--sidebar-width', `${newWidth}px`);
        }
        
        if (isVerticalResizing) {
            const maxClientY = window.innerHeight - 250; // Leave enough space for response container + paddings/gaps
            let delta = e.clientY - startY;
            
            if (startY > maxClientY) {
                // We are already in the overflow/forbidden zone when drag started.
                // Prevent snapping. Just block downward movement.
                if (delta > 0) {
                    delta = 0;
                }
            } else {
                // Normal case. Clamp the mouse position to maxClientY.
                const clampedY = Math.min(e.clientY, maxClientY);
                delta = clampedY - startY;
            }
            
            const baseHeight = startHeight + delta;
            const finalHeight = Math.max(minAllowedHeight, baseHeight);
            bodyEditorContainer.style.height = finalHeight + 'px';
            bodyEditorContainer.style.flex = 'none';
        }
    });

    document.addEventListener('mouseup', () => {
        if (isResizing) {
            isResizing = false;
            resizer.classList.remove('active');
            document.body.style.cursor = 'default';
            document.body.style.userSelect = 'auto';
            localStorage.setItem('pbi-sidebar-width', sidebar.style.width);
        }
        if (isVerticalResizing) {
            isVerticalResizing = false;
            vResizer.classList.remove('active');
            document.body.style.cursor = 'default';
            document.body.style.userSelect = 'auto';
            localStorage.setItem('pbi-request-height', bodyEditorContainer.style.height);
        }
    });
});

function renderJsonTable(data, container, nodePath = '') {
    container.innerHTML = '';
    
    let arr = null;
    let targetData = data;
    
    if (nodePath) {
        const parts = nodePath.split('.');
        for (let p of parts) {
            if (targetData && targetData[p] !== undefined) {
                targetData = targetData[p];
            } else {
                targetData = null;
                break;
            }
        }
    }
    
    if (Array.isArray(targetData)) {
        arr = targetData;
    } else if (targetData && typeof targetData === 'object' && Array.isArray(targetData.value)) {
        arr = targetData.value;
    }
    
    if (arr && arr.length > 0 && typeof arr[0] === 'object') {
        const keys = new Set();
        arr.forEach(item => {
            if(item && typeof item === 'object') {
                Object.keys(item).forEach(k => keys.add(k));
            }
        });
        const allColumns = Array.from(keys);
        
        if (!container._jsonSelectedCols || container._jsonNodePath !== nodePath) {
            container._jsonSelectedCols = new Set(allColumns);
            container._jsonNodePath = nodePath;
        }
        
        container.innerHTML = '';
        const wrapper = document.createElement('div');
        wrapper.style.cssText = "width: 100%; font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; font-size: 0.8rem; display: flex; flex-direction: column;";
        
        const infoHeader = document.createElement('div');
        infoHeader.style.cssText = "display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; font-weight: 600; font-size: 0.85rem; flex-wrap: wrap; gap: 8px;";
        
        const leftDiv = document.createElement('div');
        leftDiv.style.cssText = "display: flex; align-items: center; gap: 10px;";
        const titleSpan = document.createElement('span');
        titleSpan.textContent = nodePath ? "Table Path: " + nodePath : "JSON Table View";
        titleSpan.style.color = "var(--accent)";
        
        const dropdownDiv = document.createElement('div');
        dropdownDiv.style.cssText = 'position:relative;display:inline-block;z-index:10;';
        
        const dropdownBtn = document.createElement('button');
        dropdownBtn.className = 'wf-input';
        dropdownBtn.style.cssText = 'padding:4px 10px;font-size:0.75rem;cursor:pointer;display:flex;align-items:center;gap:6px;background:var(--bg-color);border:1px solid var(--panel-border);color:var(--text-primary);border-radius:4px;';
        
        const dropdownList = document.createElement('div');
        dropdownList.style.cssText = 'display:none;position:absolute;top:100%;left:0;margin-top:4px;background:var(--dropdown-bg, #1a1a24);border:1px solid var(--panel-border);border-radius:6px;box-shadow:0 8px 24px rgba(0,0,0,0.8);max-height:220px;overflow-y:auto;width:240px;padding:6px;z-index:2000;';
        
        dropdownBtn.onclick = (e) => {
            e.stopPropagation();
            dropdownList.style.display = dropdownList.style.display === 'block' ? 'none' : 'block';
        };
        document.addEventListener('click', (e) => {
            if (!dropdownDiv.contains(e.target)) dropdownList.style.display = 'none';
        });
        
        dropdownDiv.appendChild(dropdownBtn);
        dropdownDiv.appendChild(dropdownList);
        leftDiv.appendChild(titleSpan);
        leftDiv.appendChild(dropdownDiv);
        
        const statsSpan = document.createElement('span');
        statsSpan.style.cssText = "color: var(--text-secondary); background: var(--overlay-5); padding: 4px 8px; border-radius: 4px; border: 1px solid var(--panel-border);";
        
        infoHeader.appendChild(leftDiv);
        infoHeader.appendChild(statsSpan);
        wrapper.appendChild(infoHeader);
        
        const tableContainer = document.createElement('div');
        tableContainer.style.cssText = "width: 100%; overflow-x: auto;";
        wrapper.appendChild(tableContainer);
        container.appendChild(wrapper);

        const renderTableAndDropdown = () => {
            let listHtml = `<div style="display:flex;justify-content:space-between;padding:4px 6px;border-bottom:1px solid var(--overlay-10);margin-bottom:4px;">
                <span style="color:var(--accent);cursor:pointer;font-weight:bold;" onclick="this.parentElement.parentElement._selectAll(true)">Select All</span>
                <span style="color:var(--text-secondary);cursor:pointer;" onclick="this.parentElement.parentElement._selectAll(false)">Deselect All</span>
            </div>`;
            allColumns.forEach(col => {
                const checked = container._jsonSelectedCols.has(col) ? 'checked' : '';
                listHtml += `<label style="display:flex;align-items:center;gap:6px;padding:4px 6px;cursor:pointer;font-size:0.75rem;border-radius:4px;" onmouseover="this.style.background='var(--overlay-5)'" onmouseout="this.style.background='transparent'">
                    <input type="checkbox" ${checked} value="${col.replace(/"/g, '&quot;')}" style="cursor:pointer;" onchange="this.parentElement.parentElement._toggleCol(this.value, this.checked)">
                    <span style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap;" title="${col}">${col}</span>
                </label>`;
            });
            dropdownList.innerHTML = listHtml;
            
            dropdownList._toggleCol = (col, isChecked) => {
                if (isChecked) container._jsonSelectedCols.add(col);
                else container._jsonSelectedCols.delete(col);
                renderTableAndDropdown();
            };
            dropdownList._selectAll = (selectAll) => {
                if (selectAll) container._jsonSelectedCols = new Set(allColumns);
                else container._jsonSelectedCols.clear();
                renderTableAndDropdown();
            };
            
            const activeCols = allColumns.filter(c => container._jsonSelectedCols.has(c));
            dropdownBtn.innerHTML = `Select Columns (${activeCols.length}/${allColumns.length}) <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 9l6 6 6-6"/></svg>`;
            statsSpan.textContent = `${arr.length} rows × ${activeCols.length} cols`;
            
            tableContainer.innerHTML = '';
            if (activeCols.length === 0) {
                tableContainer.innerHTML = '<div style="padding:20px;text-align:center;color:var(--text-secondary);">No columns selected to display.</div>';
                return;
            }
            
            const table = document.createElement('table');
            table.className = 'data-table json-rendered-table';
            table.style.cssText = "width: 100%; border-collapse: collapse; text-align: left; table-layout: fixed;";
            
            const thead = document.createElement('thead');
            thead.style.cssText = "position: sticky; top: 0; background: var(--bg-color); z-index: 5;";
            const trHead = document.createElement('tr');
            activeCols.forEach((col, idx) => {
                const th = document.createElement('th');
                th.style.cssText = "position: relative; padding: 8px 12px; border-bottom: 1px solid var(--panel-border); font-weight: 600; cursor: pointer; user-select: none; min-width: 80px; width: 180px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;";
                th.title = col + " (Click to sort, Drag right edge to resize)";
                
                const titleSpan = document.createElement('span');
                titleSpan.textContent = col;
                th.onclick = (e) => window.sortTable(th, e, idx);
                th.appendChild(titleSpan);
                
                // Add column resizer handle
                const resizer = document.createElement('span');
                resizer.className = 'col-resizer';
                resizer.onclick = (e) => e.stopPropagation();
                resizer.onmousedown = (e) => {
                    e.stopPropagation();
                    e.preventDefault();
                    const startX = e.clientX;
                    const startWidth = th.offsetWidth;
                    resizer.classList.add('resizing');
                    document.body.style.cursor = 'col-resize';
                    document.body.style.userSelect = 'none';
                    
                    const onMouseMove = (moveEvent) => {
                        const newWidth = Math.max(60, startWidth + (moveEvent.clientX - startX));
                        th.style.width = newWidth + 'px';
                    };
                    const onMouseUp = () => {
                        resizer.classList.remove('resizing');
                        document.body.style.cursor = '';
                        document.body.style.userSelect = '';
                        window.removeEventListener('mousemove', onMouseMove);
                        window.removeEventListener('mouseup', onMouseUp);
                    };
                    window.addEventListener('mousemove', onMouseMove);
                    window.addEventListener('mouseup', onMouseUp);
                };
                th.appendChild(resizer);
                trHead.appendChild(th);
            });
            thead.appendChild(trHead);
            table.appendChild(thead);
            
            const tbody = document.createElement('tbody');
            arr.forEach(item => {
                const tr = document.createElement('tr');
                tr.style.cssText = "transition: background 0.15s ease; cursor: default;";
                tr.onmouseover = () => tr.style.background = "var(--overlay-5)";
                tr.onmouseout = () => tr.style.background = "transparent";
                activeCols.forEach(col => {
                    const td = document.createElement('td');
                    td.className = 'interactive-cell';
                    td.style.cssText = "border: 1px solid var(--panel-border); padding: 6px 10px; color: var(--text-primary); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; cursor: pointer; transition: background 0.15s ease, border-color 0.15s ease;";
                    let val = item ? item[col] : undefined;
                    let strVal = '';
                    if (typeof val === 'object' && val !== null) {
                        strVal = JSON.stringify(val);
                    } else {
                        strVal = val !== undefined && val !== null ? String(val) : '';
                    }
                    td.textContent = strVal;
                    td.title = `${col}: ${strVal} (Click to copy/view)`;
                    
                    // Click cell to copy or open full view if content is long
                    td.onclick = (e) => {
                        e.stopPropagation();
                        if (navigator.clipboard && strVal) {
                            navigator.clipboard.writeText(strVal).then(() => {
                                if (window.showNotification) {
                                    window.showNotification(`Copied [${col}]: ${strVal.substring(0, 30)}${strVal.length > 30 ? '...' : ''}`, 'success');
                                }
                            });
                        }
                    };
                    
                    td.onmouseover = () => {
                        td.style.background = "var(--overlay-10)";
                        td.style.borderColor = "var(--accent)";
                    };
                    td.onmouseout = () => {
                        td.style.background = "transparent";
                        td.style.borderColor = "var(--panel-border)";
                    };
                    
                    tr.appendChild(td);
                });
                tbody.appendChild(tr);
            });
            table.appendChild(tbody);
            tableContainer.appendChild(table);
        };
        
        renderTableAndDropdown();
    } else {
        const wrapper = document.createElement('div');
        wrapper.style.cssText = "width: 100%; overflow-x: auto; font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; font-size: 0.8rem;";
        
        if (nodePath) {
            const title = document.createElement('div');
            title.textContent = "Table Path: " + nodePath;
            title.style.cssText = "margin-bottom: 8px; font-weight: 600; color: var(--accent); font-size: 0.9rem;";
            wrapper.appendChild(title);
        }
        
        const table = document.createElement('table');
        table.className = 'data-table';
        table.style.cssText = "width: 100%; border-collapse: collapse; text-align: left;";
        
        const thead = document.createElement('thead');
        thead.style.cssText = "position: sticky; top: 0; background: var(--bg-color); z-index: 5;";
        const trHead = document.createElement('tr');
        ['Key', 'Value'].forEach((col, idx) => {
            const th = document.createElement('th');
            th.textContent = col;
            th.style.cssText = `padding: 8px 12px; border-bottom: 1px solid var(--panel-border); font-weight: 600; cursor: pointer; user-select: none; resize: horizontal; overflow: hidden; min-width: 50px; max-width: 250px; white-space: nowrap; text-overflow: ellipsis; ${idx === 0 ? 'width: 30%;' : ''}`;
            th.title = "Click to sort, Shift+Click for multi-sort, Drag right edge to resize";
            th.onclick = (e) => window.sortTable(th, e, idx);
            trHead.appendChild(th);
        });
        thead.appendChild(trHead);
        table.appendChild(thead);
        
        const tbody = document.createElement('tbody');
        if (Array.isArray(targetData) && targetData.length === 0) {
            container.innerHTML = `<div style="padding: 16px; color: var(--text-secondary);">
                <span>&#9432; The array at <b>${nodePath || 'root'}</b> is empty.</span>
            </div>`;
            return;
        }
        const entries = Object.entries(targetData || {});
        if (entries.length === 0) {
            container.innerHTML = `<div style="padding: 16px; color: var(--text-secondary);">No data found at node path '${nodePath}'. Please check the path or select from the dropdown.</div>`;
            return;
        }
        for (const [k, v] of entries) {
            const tr = document.createElement('tr');
            tr.style.cssText = "transition: background 0.2s; cursor: default;";
            tr.onmouseover = () => tr.style.background = "rgba(255,255,255,0.02)";
            tr.onmouseout = () => tr.style.background = "transparent";
            
            const th = document.createElement('td');
            th.textContent = k;
            th.style.cssText = "border: 1px solid var(--panel-border); padding: 8px; color: var(--accent); font-weight: 500; white-space: nowrap;";
            
            const td = document.createElement('td');
            td.style.cssText = "border: 1px solid var(--panel-border); padding: 8px; color: var(--text-primary); max-width: 500px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;";
            if (typeof v === 'object' && v !== null) {
                td.textContent = JSON.stringify(v);
            } else {
                td.textContent = v !== undefined && v !== null ? String(v) : '';
            }
            td.title = td.textContent;
            
            tr.appendChild(th);
            tr.appendChild(td);
            tbody.appendChild(tr);
        }
        table.appendChild(tbody);
        wrapper.appendChild(table);
        container.appendChild(wrapper);
    }
}

let responseEditor = null;

window.currentTablePath = window.currentTablePath || "";
window.updateViewMode = function(mode, tablePath) {
    if (!window.currentJsonResponse) return;

    if (mode === 'table' && tablePath !== undefined) {
        window.currentTablePath = tablePath;
    }
    const out = document.getElementById('response-output');
    const btns = document.querySelectorAll('.view-mode-btn');
    
    btns.forEach(b => {
        if (b.getAttribute('data-mode') === mode) {
            b.style.background = 'var(--accent)';
            b.style.color = 'var(--accent-text)';
        } else {
            b.style.background = 'transparent';
            b.style.color = 'var(--text-secondary)';
        }
    });

    const expandToggles = document.getElementById('tree-expand-toggles');
    if (expandToggles) {
        expandToggles.style.display = mode === 'tree' ? 'flex' : 'none';
    }

    if (mode === 'tree') {
        window.treeAllExpanded = false;
        const toggleBtn = document.getElementById('tree-toggle-all-btn');
        if (toggleBtn) {
            toggleBtn.classList.remove('expanded');
        }
        
        out.innerHTML = '';
        out.className = 'response-body';
        out.style.height = '100%';
        out.style.overflow = 'auto'; // ensure scrolling works
        renderCustomJsonTree(window.currentJsonResponse, out);
    } else {
        out.innerHTML = '';
        if (mode === 'raw') {
            out.innerHTML = syntaxHighlight(window.currentJsonResponse);
            out.className = 'json-viewer';
        } else if (mode === 'table') {
            out.className = 'response-body';
            renderJsonTable(window.currentJsonResponse, out, window.currentTablePath);
        }
    }
};

const viewModeBtns = document.querySelectorAll('.view-mode-btn');
viewModeBtns.forEach(btn => {
    btn.addEventListener('click', (e) => {
        updateViewMode(e.target.getAttribute('data-mode'));
    });
});

function updateParamHints(endpointUrl) {
    const hintWrapper = document.getElementById('param-hint-wrapper');
    const hintContainer = document.getElementById('param-hint-container');
    if (!hintContainer || !hintWrapper) return;
    
    const matches = endpointUrl.match(/\{([a-zA-Z0-9_]+)\}/g);
    if (!matches || matches.length === 0) {
        hintWrapper.style.display = 'none';
        return;
    }
    
    const hints = window.PARAM_HINTS || {};
    
    let html = '<ul style="margin: 0; padding-left: 18px; font-size: 0.8rem;">';
    matches.forEach(m => {
        if (hints[m]) {
            html += `<li><b>${m}</b>: ${hints[m]}</li>`;
        } else {
            html += `<li><b>${m}</b>: 请参考上游相关 API 获取该 ID</li>`;
        }
    });
    html += '</ul>';
    hintContainer.innerHTML = html;
    hintWrapper.open = false; // 默认闭合折叠！
    hintWrapper.style.display = 'block';
}






function renderCustomJsonTree(data, container) {
    container.innerHTML = '';
    container.style.fontFamily = 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace';
    container.style.fontSize = '0.85rem';
    container.style.lineHeight = '1.5';
    container.style.color = 'var(--syntax-bracket, #d4d4d4)';
    container.style.padding = '10px';
    container.style.overflow = 'auto';
    container.style.background = 'transparent';

    function createValueSpan(val) {
        const span = document.createElement('span');
        if (val === null) {
            span.textContent = 'null';
            span.style.color = 'var(--syntax-bool, #569cd6)';
        } else if (typeof val === 'boolean') {
            span.textContent = val.toString();
            span.style.color = 'var(--syntax-bool, #569cd6)';
        } else if (typeof val === 'number') {
            span.textContent = val.toString();
            span.style.color = 'var(--syntax-number, #b5cea8)';
        } else if (typeof val === 'string') {
            span.textContent = '"' + val + '"';
            span.style.color = 'var(--syntax-string, #ce9178)';
        }
        return span;
    }

    function createNode(key, obj, path, depth, isLast) {
        const wrapper = document.createElement('div');
        wrapper.style.paddingLeft = depth === 0 ? '0' : '20px';
        wrapper.style.position = 'relative';

        const keySpan = document.createElement('span');
        if (key !== null) {
            keySpan.textContent = '"' + key + '": ';
            keySpan.style.color = 'var(--syntax-key, #9cdcfe)';
        }

        if (obj === null || typeof obj !== 'object') {
            wrapper.appendChild(keySpan);
            wrapper.appendChild(createValueSpan(obj));
            if (!isLast) {
                const comma = document.createElement('span');
                comma.textContent = ',';
                wrapper.appendChild(comma);
            }
            return wrapper;
        }

        const isArray = Array.isArray(obj);
        const keys = Object.keys(obj);
        const isEmpty = keys.length === 0;

        const toggle = document.createElement('span');
        toggle.style.cursor = 'pointer';
        toggle.style.fontSize = '0.6rem';
        toggle.style.color = '#888';
        toggle.style.position = 'absolute';
        toggle.style.left = depth === 0 ? '-12px' : '4px';
        toggle.style.top = '4px';
        toggle.style.userSelect = 'none';
        toggle.style.transition = 'color 0.2s, transform 0.2s';
        
        toggle.onmouseover = () => {
            toggle.style.color = 'var(--accent)';
            toggle.style.transform = 'scale(1.2)';
        };
        toggle.onmouseout = () => {
            toggle.style.color = '#888';
            toggle.style.transform = 'scale(1)';
        };

        const headContainer = document.createElement('div');
        headContainer.style.display = 'inline-flex';
        headContainer.style.alignItems = 'center';

        const bracketOpen = document.createElement('span');
        bracketOpen.textContent = isArray ? '[' : '{';
        
        const tableBtn = document.createElement('button');
        tableBtn.innerHTML = '📊 View as Table';
        tableBtn.title = 'View this node as a Table';
        tableBtn.style.cssText = 'margin-left: 8px; padding: 2px 6px; font-size: 0.65rem; background: var(--badge-custom-bg); border: 1px solid var(--badge-custom-bg); color: var(--badge-custom-text); border-radius: 4px; cursor: pointer; display: none; transition: all 0.2s; white-space: nowrap;';
        tableBtn.onmouseover = () => tableBtn.style.background = 'var(--badge-custom-bg)';
        tableBtn.onmouseout = () => tableBtn.style.background = 'var(--badge-custom-bg)';
        
        headContainer.appendChild(keySpan);
        headContainer.appendChild(bracketOpen);
        if (!isEmpty) headContainer.appendChild(tableBtn);

        headContainer.onmouseover = (e) => {
            e.stopPropagation();
            if (!isEmpty) tableBtn.style.display = 'inline-block';
        };
        headContainer.onmouseout = () => {
            if (!isEmpty) tableBtn.style.display = 'none';
        };

        tableBtn.onclick = (e) => {
            e.stopPropagation();
            if (window.updateViewMode) {
                window.updateViewMode('table', path);
            }
        };

        const content = document.createElement('div');
        const bracketCloseWrapper = document.createElement('div');
        bracketCloseWrapper.style.paddingLeft = depth === 0 ? '0' : '20px';
        const bracketClose = document.createElement('span');
        bracketClose.textContent = (isArray ? ']' : '}') + (isLast ? '' : ',');
        bracketCloseWrapper.appendChild(bracketClose);

        if (isEmpty) {
            wrapper.appendChild(headContainer);
            bracketCloseWrapper.style.paddingLeft = '0';
            bracketCloseWrapper.style.display = 'inline';
            wrapper.appendChild(bracketCloseWrapper);
            return wrapper;
        }

        let isCollapsed = depth >= 2; // Auto collapse at depth 2
        let rendered = false;

        function renderChildren() {
            if (rendered) return;
            keys.forEach((k, i) => {
                const childPath = path ? path + '.' + k : k;
                content.appendChild(createNode(isArray ? null : k, obj[k], childPath, depth + 1, i === keys.length - 1));
            });
            rendered = true;
        }

        function updateState() {
            toggle.textContent = isCollapsed ? '▶' : '▼';
            content.style.display = isCollapsed ? 'none' : 'block';
            bracketCloseWrapper.style.display = isCollapsed ? 'none' : 'block';
            bracketOpen.textContent = isCollapsed 
                ? (isArray ? '[' + keys.length + ' items]' : '{...}') + (isLast ? '' : ',')
                : (isArray ? '[' : '{');
            if (!isCollapsed) renderChildren();
        }

        toggle.onclick = () => {
            isCollapsed = !isCollapsed;
            updateState();
        };

        wrapper.appendChild(toggle);
        wrapper.appendChild(headContainer);
        wrapper.appendChild(content);
        wrapper.appendChild(bracketCloseWrapper);

        updateState();
        
        wrapper._expandDeep = () => {
            if (isCollapsed) {
                isCollapsed = false;
                updateState();
            }
            if (rendered) {
                Array.from(content.children).forEach(c => {
                    if (c._expandDeep) c._expandDeep();
                });
            }
        };
        
        wrapper._collapseDeep = () => {
            if (!isCollapsed && depth > 0) { // Keep root expanded
                isCollapsed = true;
                updateState();
            }
            if (rendered) {
                Array.from(content.children).forEach(c => {
                    if (c._collapseDeep) c._collapseDeep();
                });
            }
        };

        return wrapper;
    }

    const rootNode = createNode(null, data, '', 0, true);
    container.appendChild(rootNode);
    container._expandAll = () => rootNode._expandDeep && rootNode._expandDeep();
    container._collapseAll = () => rootNode._collapseDeep && rootNode._collapseDeep();
}

const toggleBtn = document.getElementById('tree-toggle-all-btn');
if (toggleBtn) {
    toggleBtn.addEventListener('click', () => {
        window.treeAllExpanded = !window.treeAllExpanded;
        const out = document.getElementById('response-output');
        if (out) {
            if (window.treeAllExpanded && out._expandAll) {
                out._expandAll();
            } else if (!window.treeAllExpanded && out._collapseAll) {
                out._collapseAll();
            }
        }
        toggleBtn.innerHTML = window.treeAllExpanded ? 
            '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 15l-6-6-6 6"></path></svg>' : // 展开时的向上收起箭头
            '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 9l6 6 6-6"></path></svg>';  // 折叠时的向下展开箭头
    });
}


// --- Keep Awake (Anti-Sleep) Logic ---
let keepAwakeInterval = null;
const btnKeepAwake = document.getElementById('btn-keep-awake');
if (btnKeepAwake) {
    btnKeepAwake.addEventListener('click', () => {
        if (keepAwakeInterval) {
            clearInterval(keepAwakeInterval);
            keepAwakeInterval = null;
            btnKeepAwake.classList.remove('awake-active');
            btnKeepAwake.style.background = '';
            btnKeepAwake.style.borderColor = '';
            btnKeepAwake.title = 'Toggle Anti-Sleep (Keep Render Awake)';
            console.log('Anti-Sleep disabled');
        } else {
            // Ping every 10 minutes (600,000 ms) to prevent 15-minute Render sleep
            keepAwakeInterval = setInterval(() => {
                // Use a timestamp to completely bypass browser disk cache
                fetch('/?_ping=' + Date.now(), { cache: 'no-store' }).catch(() => {});
                console.log('Anti-Sleep ping sent.');
            }, 600000);
            btnKeepAwake.classList.add('awake-active');
            btnKeepAwake.style.background = '';
            btnKeepAwake.style.borderColor = '';
            btnKeepAwake.title = 'Anti-Sleep is ON (Pinging every 10m)';
            console.log('Anti-Sleep enabled');
        }
    });
}

// ===== 退出登录 (Logout) =====
const btnLogout = document.getElementById('btn-logout');
if (btnLogout) {
    btnLogout.addEventListener('click', async () => {
        const confirmed = await window.showCustomConfirm('确定要退出登录吗？', '🔒 退出登录');
        if (!confirmed) return;
        try {
            await fetch('/api/logout', { method: 'POST' });
        } catch (_) { /* ignore */ }
        // 渐隐退出动画
        document.body.style.transition = 'opacity 0.4s ease';
        document.body.style.opacity = '0';
        setTimeout(() => { window.location.href = '/login'; }, 420);
    });
}

// ===== Session 倒计时提醒与 MFA 无缝续期逻辑 =====
(function initSessionStatusTracker() {
    if (window.location.pathname.includes('/login')) return;

    let warningPrompted = false;

    async function checkSession() {
        try {
            const res = await fetch('/api/session-status');
            if (res.status === 401) {
                window.location.href = '/login';
                return;
            }
            const data = await res.json();
            if (!data.success) return;

            // 若在开发模式下，显示 DEV MODE 徽章
            if (data.is_dev_mode) {
                const mainDevBadge = document.getElementById('main-dev-badge');
                if (mainDevBadge) mainDevBadge.style.display = 'inline-block';
            }

            const remaining = data.remaining_seconds;
            const mode = data.mode;

            // 倒计时 10 分钟 (600秒) 内，触发弹窗提醒
            if (remaining <= 600 && remaining > 0 && !warningPrompted) {
                warningPrompted = true;
                const minutesLeft = Math.ceil(remaining / 60);

                if (mode === 'mfa') {
                    // MFA 模式：提示用户输入新 6 位口令完成续期
                    const inputCode = prompt(`⏱️ 您的 MFA 会话将在 ${minutesLeft} 分钟内到期！\n\n请输入手机 Authenticator 上最新的 6 位动态验证码，可延长 3 小时使用时间：`);
                    if (inputCode && inputCode.trim().length === 6) {
                        try {
                            const renewRes = await fetch('/api/renew-mfa-session', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ mfa_code: inputCode.trim() })
                            });
                            const renewData = await renewRes.json();
                            if (renewData.success) {
                                alert('✅ 会话续期成功！已增加 3 小时使用时长。');
                                warningPrompted = false; // 重置提醒标志
                            } else {
                                alert('❌ 续期失败：' + (renewData.message || '动态码无效'));
                            }
                        } catch (e) {
                            alert('网络错误，续期失败。');
                        }
                    }
                } else {
                    // 密码一模式：友情提醒到期
                    alert(`⏱️ 提示：您当前通过密码一登录，会话将在 ${minutesLeft} 分钟内到期。到期后请使用 MFA 动态口令解锁更长使用时间。`);
                }
            }
        } catch (_) { /* ignore background check error */ }
    }

    // 每 1 分钟检查一次 Session 状态
    setInterval(checkSession, 60000);
    checkSession();
})();

let easyMDE = null;

window.openNoteModal = function() {
    const noteModal = document.getElementById('modal-note');
    if (noteModal.style.display === 'flex') {
        window.closeNoteModal();
        return;
    }
    // Reset drag position
    const noteContent = noteModal.querySelector('.modal-content');
    if (noteContent) {
        window.centerModal(noteContent);
        noteContent.style.top = '0px';
    }
    noteModal.style.display = 'flex';

    // Explicitly prevent internal clicks/dblclicks from bubble closing
    if (noteContent && !noteContent.dataset.stopBound) {
        noteContent.dataset.stopBound = "true";
    }

    // Only close if user explicitly clicked on the dark backdrop overlay itself
    if (!noteModal.dataset.clickBound) {
        noteModal.addEventListener('click', (e) => {
            if (e.target === noteModal) {
                window.closeNoteModal();
            }
        });
        noteModal.dataset.clickBound = "true";
    }

    // Initialize EasyMDE if not already done (using note-editor ID)
    if (!easyMDE) {
        const textarea = document.getElementById('note-editor');
        if (textarea) {
            easyMDE = new EasyMDE({
                element: textarea,
                spellChecker: false,
                autosave: {
                    enabled: true,
                    uniqueId: "quick-note-autosave",
                    delay: 1000,
                },
                status: ["autosave", "lines", "words", "cursor"],
                minHeight: "340px",
                placeholder: "Start typing your note here... (Markdown is supported)",
                toolbar: ['bold', 'italic', 'heading', '|', 'quote', 'unordered-list', 'ordered-list', '|', 'link', 'image', '|', 'preview', 'side-by-side', 'fullscreen']
            });
        }

        // Initialize drag helper
        const noteHeader = noteModal.querySelector('.modal-header');
        if (noteContent && noteHeader && window.makeDraggable) {
            window.makeDraggable(noteContent, noteHeader);
        }

        // Attach Drop & Paste listeners to CodeMirror for seamless file/image uploads
        if (easyMDE && easyMDE.codemirror) {
            const cm = easyMDE.codemirror;
            cm.on('drop', (editor, e) => {
                if (e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files.length > 0) {
                    e.preventDefault();
                    for (let file of e.dataTransfer.files) {
                        window.uploadFileToNote(file);
                    }
                }
            });
            cm.on('paste', (editor, e) => {
                if (e.clipboardData && e.clipboardData.files && e.clipboardData.files.length > 0) {
                    e.preventDefault();
                    for (let file of e.clipboardData.files) {
                        window.uploadFileToNote(file);
                    }
                }
            });
        }
    } else {
        // Just refresh to avoid layout issues in display:none modals
        setTimeout(() => easyMDE.codemirror.refresh(), 100);
    }

    // Load history
    window.searchNotes();
};

window.uploadFileToNote = async function(file) {
    if (!file) return;
    const formData = new FormData();
    formData.append('file', file);
    
    if (window.showNotification) {
        window.showNotification(`⏳ 正在上传附件 [${file.name}]...`, 'info');
    }
    
    try {
        const res = await fetch('/api/notes/upload', {
            method: 'POST',
            body: formData
        });
        const data = await res.json();
        if (data.success && data.markdown) {
            if (typeof easyMDE !== 'undefined' && easyMDE) {
                const cm = easyMDE.codemirror;
                const cursor = cm.getCursor();
                cm.replaceRange(`\n${data.markdown}\n`, cursor);
                cm.focus();
            }
            if (window.showNotification) {
                window.showNotification(`✅ 附件 [${file.name}] 上传成功并已插入笔记！`, 'success');
            }
        } else {
            throw new Error(data.error || 'Upload failed');
        }
    } catch (err) {
        console.error('Note file upload error:', err);
        if (window.showNotification) {
            window.showNotification(`❌ 上传失败: ${err.message}`, 'error');
        }
    }
};

window.handleNoteFileUpload = function(event) {
    const files = event.target.files;
    if (!files || files.length === 0) return;
    for (let file of files) {
        window.uploadFileToNote(file);
    }
    event.target.value = '';
};

window.closeNoteModal = function() {
    window.closeModalWithAnimation('modal-note');
};

window.insertLinkedApiIntoNote = function() {
    const endpointInput = document.getElementById('endpoint-input');
    const methodSelect = document.getElementById('method-select');
    
    if (!endpointInput || !endpointInput.value.trim()) {
        alert("No API is currently selected in the main workspace!");
        return;
    }
    
    const endpoint = endpointInput.value.trim();
    const method = methodSelect ? methodSelect.value : 'GET';
    const linkText = `\n> **Linked API:** \`[${method}] ${endpoint}\`\n`;
    
    if (typeof easyMDE !== 'undefined' && easyMDE) {
        const cm = easyMDE.codemirror;
        const cursor = cm.getCursor();
        cm.replaceRange(linkText, cursor);
        cm.focus();
    }
};

window.insertSpecificApiIntoNote = function(method, endpoint) {
    const modal = document.getElementById('modal-note');
    if (modal && (modal.style.display === 'none' || modal.style.display === '')) {
        // Open scratchpad if closed
        window.openNoteModal();
    }
    
    const linkText = `\n> **Linked API:** \`[${method}] ${endpoint}\`\n`;
    
    if (typeof easyMDE !== 'undefined' && easyMDE) {
        const cm = easyMDE.codemirror;
        const cursor = cm.getCursor();
        cm.replaceRange(linkText, cursor);
        cm.focus();
    }
};

let searchNoteTimeout = null;
window.debounceSearchNotes = function() {
    if (searchNoteTimeout) clearTimeout(searchNoteTimeout);
    searchNoteTimeout = setTimeout(window.searchNotes, 300);
};

window.searchNotes = async function() {
    const q = document.getElementById('note-search').value.trim();
    const listEl = document.getElementById('note-history-list');
    if (!listEl) return;
    
    listEl.innerHTML = '<div style="text-align: center; color: var(--text-secondary); font-size: 0.8rem; margin-top: 20px;">Searching...</div>';
    
    try {
        const response = await fetch('/api/search-notes?q=' + encodeURIComponent(q));
        const data = await response.json();
        
        if (!data.success) throw new Error(data.error);
        
        if (!data.results || data.results.length === 0) {
            listEl.innerHTML = '<div style="text-align: center; color: var(--text-secondary); font-size: 0.8rem; margin-top: 20px;">No notes found.</div>';
            return;
        }
        
        listEl.innerHTML = '';
        data.results.forEach(note => {
            const item = document.createElement('div');
            item.style.padding = '10px';
            item.style.background = 'var(--input-bg)';
            item.style.borderRadius = '6px';
            item.style.border = '1px solid var(--panel-border)';
            item.style.cursor = 'pointer';
            item.style.transition = 'all 0.2s';
            
            const dateStr = new Date(note.mtime * 1000).toLocaleString();
            
            // Highlight search term in snippet if any
            let snippetHtml = note.snippet.replace(/</g, '&lt;').replace(/>/g, '&gt;');
            if (q) {
                const regex = new RegExp(q, 'gi');
                snippetHtml = snippetHtml.replace(regex, match => `<span style="background: var(--badge-custom-bg); color: white; padding: 0 2px; border-radius: 2px;">${match}</span>`);
            }
            
            item.innerHTML = `
                <div style="display: flex; justify-content: space-between; align-items: flex-start; gap: 8px;">
                    <div style="font-weight: 500; font-size: 0.9rem; margin-bottom: 4px; color: var(--text-primary); word-break: break-all; flex: 1;">📄 ${note.filename}</div>
                    <button class="btn-delete-note" style="background: none; border: none; padding: 2px 6px; cursor: pointer; color: var(--error); border-radius: 4px; display: flex; align-items: center; justify-content: center; font-size: 0.8rem; opacity: 0.6; transition: all 0.2s;" title="Delete Note">❌</button>
                </div>
                <div style="font-size: 0.75rem; color: var(--text-secondary); margin-bottom: 6px;">🕒 ${dateStr}</div>
                <div style="font-size: 0.8rem; color: var(--text-secondary); display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; text-overflow: ellipsis; line-height: 1.4;">${snippetHtml}</div>
            `;
            
            item.onmouseover = () => { item.style.background = 'var(--overlay-10)'; item.style.borderColor = 'var(--badge-custom-text)'; };
            item.onmouseout = () => { item.style.background = 'var(--input-bg)'; item.style.borderColor = 'var(--panel-border)'; };
            
            const delBtn = item.querySelector('.btn-delete-note');
            delBtn.onmouseover = (e) => { e.stopPropagation(); delBtn.style.opacity = '1'; delBtn.style.background = 'rgba(239, 68, 68, 0.15)'; };
            delBtn.onmouseout = (e) => { e.stopPropagation(); delBtn.style.opacity = '0.6'; delBtn.style.background = 'none'; };
            delBtn.onclick = async (e) => {
                e.stopPropagation();
                if (await showCustomConfirm(`Are you sure you want to delete notes/${note.filename}? This will delete the file locally and push the deletion to GitHub.`)) {
                    window.deleteMarkdownNote(note.filename);
                }
            };
            
            item.onclick = () => {
                document.getElementById('note-filename').value = note.filename;
                if (easyMDE) {
                    easyMDE.value(note.content);
                }
            };
            
            listEl.appendChild(item);
        });
    } catch (e) {
        listEl.innerHTML = `<div style="text-align: center; color: var(--error); font-size: 0.8rem; margin-top: 20px;">Error loading history</div>`;
    }
};

window.deleteMarkdownNote = async function(filename) {
    try {
        const response = await fetch('/api/delete-note', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ filename })
        });
        const data = await response.json();
        if (data.success) {
            alert(data.message || "Note deleted successfully!");
            if (document.getElementById('note-filename').value.trim() === filename) {
                document.getElementById('note-filename').value = '';
                if (easyMDE) easyMDE.value('');
            }
            window.searchNotes();
        } else {
            alert("Error deleting note: " + data.error);
        }
    } catch (e) {
        alert("Error deleting note: " + e.message);
    }
};

window.createNewNote = function() {
    document.getElementById('note-filename').value = '';
    if (easyMDE) {
        easyMDE.value('');
    }
};

window._lastNoteErrorDetail = '';

window.showNoteErrorDetail = function() {
    if (!window._lastNoteErrorDetail) return;
    
    let modal = document.getElementById('note-error-detail-modal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'note-error-detail-modal';
        modal.className = 'modal-overlay';
        modal.style.cssText = 'display:flex; position:fixed; inset:0; background:rgba(0,0,0,0.6); z-index:30000; align-items:center; justify-content:center; opacity:0; transition:opacity 0.2s;';
        modal.innerHTML = `
            <div class="modal-content glass-panel" style="max-width:550px; width:90%; padding:20px; position:relative; background:var(--modal-bg);">
                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px; border-bottom:1px solid var(--panel-border); padding-bottom:8px;">
                    <h4 style="margin:0; color:var(--error); display:flex; align-items:center; gap:6px;">⚠️ Note Save/Push Traceback Detail</h4>
                    <button type="button" class="close-btn" onclick="document.getElementById('note-error-detail-modal').style.display='none'" title="Close"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 6L6 18M6 6l12 12"></path></svg></button>
                </div>
                <div class="input-with-copy" style="position:relative; margin-bottom:16px;">
                    <textarea id="note-error-detail-text" readonly style="width:100%; height:160px; font-family:'Fira Code',monospace; font-size:0.8rem; background:var(--input-bg); color:var(--error); padding:10px 36px 10px 10px; border-radius:6px; border:1px solid var(--error); resize:vertical;"></textarea>
                    <button type="button" class="wf-copy-btn" onclick="window.handleCopyAction(this, document.getElementById('note-error-detail-text').value)" title="Copy Error Traceback" style="top:8px; right:8px; z-index:10; opacity:1; pointer-events:auto;">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
                    </button>
                </div>
                <div style="display:flex; justify-content:flex-end;">
                    <button type="button" class="btn-action-secondary" onclick="document.getElementById('note-error-detail-modal').style.display='none'">Close</button>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
    }
    
    document.getElementById('note-error-detail-text').value = window._lastNoteErrorDetail;
    modal.style.display = 'flex';
    requestAnimationFrame(() => { modal.style.opacity = '1'; });
};

window.saveMarkdownNote = async function() {
    if (!easyMDE) return;
    const content = easyMDE.value().trim();
    if (!content) {
        if (window.showNotification) window.showNotification("Note content cannot be empty!", "error");
        return;
    }
    const filename = document.getElementById('note-filename').value.trim();
    
    const btn = document.getElementById('btn-save-note');
    const errWrapper = document.getElementById('note-error-wrapper');
    const errMsg = document.getElementById('note-error-msg');
    
    if (errWrapper) errWrapper.style.display = 'none';
    window._lastNoteErrorDetail = '';

    btn.disabled = true;
    btn.innerHTML = '<span class="loader" style="width:12px;height:12px;border-width:2px;"></span> Saving & Pushing...';
    
    try {
        const response = await fetch('/api/save-note', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ filename, content })
        });
        const data = await response.json();
        
        if (data.success) {
            if (data.filename) {
                document.getElementById('note-filename').value = data.filename;
            }
            if (window.showNotification) {
                window.showNotification(data.message || "Note saved & pushed successfully!", "success");
            }
            // Refresh note history
            window.searchNotes();
        } else {
            window._lastNoteErrorDetail = data.error || 'Unknown error occurred while saving note.';
            if (errWrapper && errMsg) {
                errMsg.textContent = data.local_saved ? 'Git Push Failed (Saved locally)' : 'Save Note Failed';
                errWrapper.style.display = 'inline-flex';
            }
            if (window.showNotification) {
                window.showNotification("Save/Push Note Error! Click '❗' for details.", "error");
            }
        }
    } catch (e) {
        window._lastNoteErrorDetail = e.message || String(e);
        if (errWrapper && errMsg) {
            errMsg.textContent = 'Network/Server Error';
            errWrapper.style.display = 'inline-flex';
        }
        if (window.showNotification) {
            window.showNotification("Network Error! Click '❗' for details.", "error");
        }
    } finally {
        btn.disabled = false;
        btn.innerHTML = '<span id="save-note-icon">💾</span> Save & Push to GitHub';
    }
};



window.updateHarnessStats = function() {
    const statsSpan = document.getElementById('harness-stats');
    if (!statsSpan) return;
    const checkboxes = document.querySelectorAll('.harness-test-cb');
    const total = checkboxes.length;
    const checked = Array.from(checkboxes).filter(cb => cb.checked).length;
    statsSpan.textContent = `Selected: ${checked} / Total: ${total}`;
};


    // Custom Dialog Modal System (Alert/Confirm) replacing native popups
    window.showCustomAlert = function(message, title = "🔔 System Message", isHtml = false) {
        return new Promise((resolve) => {
            const modal = document.getElementById('custom-dialog-modal');
            const titleEl = document.getElementById('custom-dialog-title');
            const msgEl = document.getElementById('custom-dialog-message');
            const buttonsEl = document.getElementById('custom-dialog-buttons');
            const content = modal.querySelector('.modal-content');
            
            titleEl.innerHTML = title;
            if (isHtml) msgEl.innerHTML = message;
            else msgEl.textContent = message;
            
            // Reset position to center
            window.centerModal(content);
            
            buttonsEl.innerHTML = `
                <button class="btn-action-primary" id="custom-alert-ok-btn">
                    OK
                </button>
            `;
            
            const close = () => {
                modal.style.display = 'none';
                resolve();
            };
            
            document.getElementById('custom-alert-ok-btn').onclick = close;
            modal.querySelector('.close-btn').onclick = close;
            
            modal.style.display = 'flex';
        });
    };

    window.showCustomConfirm = function(message, title = "❓ Confirm Action") {
        return new Promise((resolve) => {
            const modal = document.getElementById('custom-dialog-modal');
            const titleEl = document.getElementById('custom-dialog-title');
            const msgEl = document.getElementById('custom-dialog-message');
            const buttonsEl = document.getElementById('custom-dialog-buttons');
            const content = modal.querySelector('.modal-content');
            
            titleEl.innerHTML = title;
            msgEl.textContent = message;
            
            // Reset position to center
            window.centerModal(content);
            
            buttonsEl.innerHTML = `
                <button class="btn-cancel" id="custom-confirm-cancel-btn">
                    Cancel
                </button>
                <button class="btn-action-primary" id="custom-confirm-ok-btn">
                    Confirm
                </button>
            `;
            const close = (result) => {
                modal.classList.add('closing');
                setTimeout(() => { 
                    modal.style.display = 'none';
                    modal.classList.remove('closing');
                    resolve(result);
                }, 150);
            };

            
            document.getElementById('custom-confirm-cancel-btn').onclick = () => close(false);
            document.getElementById('custom-confirm-ok-btn').onclick = function() {
                this.disabled = true;
                this.style.opacity = '0.5';
                close(true);
            };
            modal.querySelector('.close-btn').onclick = () => close(false);
            
            // Animation logic
            modal.style.display = 'flex';
        });
    };

    window.showCustomPrompt = function(message, defaultText = "", title = "✏️ Input Required") {
        return new Promise((resolve) => {
            const modal = document.getElementById('custom-dialog-modal');
            const titleEl = document.getElementById('custom-dialog-title');
            const msgEl = document.getElementById('custom-dialog-message');
            const buttonsEl = document.getElementById('custom-dialog-buttons');
            const content = modal.querySelector('.modal-content');
            
            titleEl.innerHTML = title;
            msgEl.innerHTML = '<div>' + message + '</div><input type="text" id="custom-prompt-input" class="modern-input" style="width: 100%; margin-top: 10px; padding: 8px 12px; border-radius: 6px; border: 1px solid var(--panel-border); background: var(--input-bg); color: var(--text-primary);" value="' + defaultText + '">';
            
            window.centerModal(content);
            
            buttonsEl.innerHTML = '<button class="btn-cancel" id="custom-prompt-cancel-btn">Cancel</button><button class="btn-action-primary" id="custom-prompt-ok-btn">OK</button>';
            
            const close = (val) => {
                modal.classList.add('closing');
                setTimeout(() => { 
                    modal.style.display = 'none';
                    modal.classList.remove('closing');
                    resolve(val);
                }, 150);
            };
            
            const input = document.getElementById('custom-prompt-input');
            
            document.getElementById('custom-prompt-ok-btn').onclick = () => close(input.value);
            document.getElementById('custom-prompt-cancel-btn').onclick = () => close(null);
            modal.querySelector('.close-btn').onclick = () => close(null);
            
            input.onkeypress = (e) => {
                if (e.key === 'Enter') close(input.value);
            };
            
            modal.style.display = 'flex';
            
            setTimeout(() => input.focus(), 100);
            setTimeout(() => input.select(), 150);
        });
    };

    window.showCustomDialog = function(title = "Dialog", contentHtml = "") {
        return new Promise((resolve) => {
            const modal = document.getElementById('custom-dialog-modal');
            const titleEl = document.getElementById('custom-dialog-title');
            const msgEl = document.getElementById('custom-dialog-message');
            const buttonsEl = document.getElementById('custom-dialog-buttons');
            const content = modal.querySelector('.modal-content');
            
            titleEl.innerHTML = title;
            if (typeof contentHtml === 'string' && contentHtml.trim().startsWith('<')) {
                msgEl.innerHTML = contentHtml;
            } else {
                msgEl.textContent = contentHtml;
            }
            
            // Reset position to center
            window.centerModal(content);
            
            buttonsEl.innerHTML = `
                <button class="btn-action-primary" id="custom-dialog-ok-btn">
                    Close
                </button>
            `;
            
            const close = () => {
                modal.classList.add('closing');
                setTimeout(() => { 
                    modal.style.display = 'none';
                    modal.classList.remove('closing');
                }, 200);
                resolve();
            };
            
            document.getElementById('custom-dialog-ok-btn').onclick = close;
            modal.querySelector('.close-btn').onclick = close;
            
            modal.style.display = 'flex';
        });
    };

    const customModal = document.getElementById('custom-dialog-modal');
    if (customModal && window.makeDraggable) {
        const customContent = customModal.querySelector('.modal-content');
        const customHeader = customModal.querySelector('.modal-header');
        if (customContent && customHeader) {
            window.makeDraggable(customContent, customHeader);
        }
    }

    // Global override of standard window.alert
    window.alert = function(message) {
        window.window.showCustomAlert(message);
    };

    // --- AI Chat Logic ---
    
    // Initialize AI chat draggable
    const aiWin = document.getElementById('ai-chat-window');
    const aiHeader = document.getElementById('ai-chat-header');
    if (aiWin && aiHeader && window.makeDraggable) {
        window.makeDraggable(aiWin, aiHeader);
    }

    window.toggleAIChat = function() {
        const win = document.getElementById('ai-chat-window');
        
        if (win.style.opacity === '0' || !win.style.opacity) {
            win.style.left = '';
            win.style.top = '';
            win.style.right = '20px';
            win.style.bottom = '80px';

            win.style.opacity = '1';
            win.style.transform = 'scale(1) translateY(0)';
            win.style.visibility = 'visible';
            win.style.pointerEvents = 'auto';
            setTimeout(() => document.getElementById('ai-chat-input').focus(), 250);
        } else {
            win.style.opacity = '0';
            win.style.transform = 'scale(0.9) translateY(10px)';
            win.style.visibility = 'hidden';
            win.style.pointerEvents = 'none';
        }
    };

    // Close AI window when clicking outside
    document.addEventListener('mousedown', function(e) {
        const win = document.getElementById('ai-chat-window');
        const fab = document.getElementById('ai-chat-fab');
        if (win && win.style.opacity === '1') {
            if (!win.contains(e.target) && !fab.contains(e.target)) {
                window.toggleAIChat();
            }
        }
    });

    window.aiSessionId = window.aiSessionId || null;

    window.isAutoApprove = false;
    window.toggleAutoApprove = function() {
        window.isAutoApprove = !window.isAutoApprove;
        const btn = document.getElementById('ai-auto-approve-btn');
        const icon = document.getElementById('auto-approve-icon');
        const text = document.getElementById('auto-approve-text');
        if (window.isAutoApprove) {
            btn.style.borderColor = 'var(--success)';
            btn.style.color = 'var(--success)';
            btn.title = 'Auto-Approve ON (Click to disable)';
            icon.textContent = '🔓';
            text.textContent = 'Auto-Approve';
            btn.style.transform = 'scale(1.05)';
            setTimeout(() => btn.style.transform = 'scale(1)', 150);
        } else {
            btn.style.borderColor = 'var(--panel-border)';
            btn.style.color = 'var(--text-secondary)';
            btn.title = 'Approval Mode (Click to auto-approve)';
            icon.textContent = '🔒';
            text.textContent = 'Approval Mode';
            btn.style.transform = 'scale(0.95)';
            setTimeout(() => btn.style.transform = 'scale(1)', 150);
        }
    };


    window.sendAiMessage = async function() {
        const input = document.getElementById('ai-chat-input');
        const text = input.value.trim();
        if (!text) return;

        const msgs = document.getElementById('ai-chat-messages');

        // Append User Message with smooth entry animation
        const userDiv = document.createElement('div');
        userDiv.style.cssText = 'align-self: flex-end; background: var(--info-dark); color: white; padding: 10px 14px; border-radius: 12px; border-bottom-right-radius: 2px; max-width: 85%; opacity: 0; transform: translateY(10px); transition: all 0.3s ease-out;';
        userDiv.textContent = text;
        msgs.appendChild(userDiv);
        
        // Trigger reflow to ensure CSS transition works
        void userDiv.offsetWidth;
        userDiv.style.opacity = '1';
        userDiv.style.transform = 'translateY(0)';

        input.value = '';
        msgs.scrollTop = Math.max(0, msgs.scrollHeight - msgs.clientHeight * 0.66);

        await window.handleAiStream('/api/chat', { message: text, session_id: window.aiSessionId });
    };

    window.handleAiStream = async function(url, payload) {
        const msgs = document.getElementById('ai-chat-messages');
        const loadingDiv = document.createElement('div');
        loadingDiv.style.cssText = 'align-self: flex-start; background: var(--overlay-10); padding: 10px 14px; border-radius: 12px; border-bottom-left-radius: 2px; max-width: 85%; color: var(--text-secondary); opacity: 0; transform: translateY(10px); transition: all 0.3s ease-out;';
        loadingDiv.textContent = 'Thinking...';
        msgs.appendChild(loadingDiv);
        
        void loadingDiv.offsetWidth;
        loadingDiv.style.opacity = '1';
        loadingDiv.style.transform = 'translateY(0)';
        msgs.scrollTop = Math.max(0, msgs.scrollHeight - msgs.clientHeight * 0.66);

        try {
            const res = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (!res.ok) {
                const data = await res.json();
                loadingDiv.textContent = "Sorry, unable to connect to AI: " + (data.message || "未知错误");
                loadingDiv.style.color = "var(--error)";
                return;
            }

            loadingDiv.textContent = '';
            loadingDiv.style.color = 'var(--text-primary)';
            let fullText = '';

            const reader = res.body.getReader();
            const decoder = new TextDecoder("utf-8");
            let buffer = '';

            while (true) {
                const { value, done } = await reader.read();
                if (done) {
                    if (buffer.trim()) processStreamLine(buffer);
                    break;
                }
                
                buffer += decoder.decode(value, { stream: true });
                const lines = buffer.split('\n');
                buffer = lines.pop();
                
                for (const line of lines) {
                    processStreamLine(line);
                }
            }

            function processStreamLine(line) {
                if (line.trim().startsWith('data: ')) {
                    const dataStr = line.replace('data: ', '').trim();
                    if (dataStr === '[DONE]') return;
                    if (!dataStr) return;
                    
                    try {
                        const data = JSON.parse(dataStr);
                        if (data.success) {
                            if (data.type === 'session_info') {
                                window.aiSessionId = data.session_id;
                            } else if (data.type === 'tool_request') {
                                // Hide the empty text bubble when a tool is requested
                                if (!fullText.trim()) {
                                    loadingDiv.style.display = 'none';
                                }
                                
                                const toolCard = document.createElement('div');
                                toolCard.style.cssText = 'align-self: flex-start; background: var(--overlay-10); border: 1px solid var(--warning); padding: 12px; border-radius: 12px; max-width: 85%; color: var(--text-primary); margin-top: 8px; opacity: 0; transform: scale(0.95); transition: all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);';
                                toolCard.innerHTML = `
                                    <div style="font-weight: bold; margin-bottom: 8px; color: var(--warning); display: flex; align-items: center; gap: 6px;">
                                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>
                                        AI Requests High-Risk Tool Execution
                                    </div>
                                    <div style="font-size: 0.85rem; margin-bottom: 4px;">Tool Name: <code style="background: var(--shadow-light); padding: 2px 6px; border-radius: 4px;">${data.name}</code></div>
                                    <pre style="background: var(--input-bg); padding: 8px; border-radius: 6px; font-size: 0.8rem; overflow-x: auto; margin-bottom: 12px; white-space: pre-wrap; color: var(--info-light, #a5d6ff);">${JSON.stringify(data.args, null, 2)}</pre>
                                    <div style="display: flex; gap: 8px;">
                                        <button class="approve-btn" style="flex: 1; background: var(--success); color: white; border: none; padding: 6px 0; border-radius: 6px; cursor: pointer; font-size: 0.85rem; font-weight: bold; transition: all 0.2s;" onmouseover="this.style.transform='scale(1.05)'; this.style.boxShadow='0 4px 12px var(--status-success-bg)'" onmouseout="this.style.transform='scale(1)'; this.style.boxShadow='none'">✅ Approve</button>
                                        <button class="reject-btn" style="flex: 1; background: var(--error); color: white; border: none; padding: 6px 0; border-radius: 6px; cursor: pointer; font-size: 0.85rem; font-weight: bold; transition: all 0.2s;" onmouseover="this.style.transform='scale(1.05)'; this.style.boxShadow='0 4px 12px var(--status-error-bg)'" onmouseout="this.style.transform='scale(1)'; this.style.boxShadow='none'">❌ Reject</button>
                                    </div>
                                `;
                                msgs.appendChild(toolCard);
                                
                                void toolCard.offsetWidth;
                                toolCard.style.opacity = '1';
                                toolCard.style.transform = 'scale(1)';
                                msgs.scrollTop = Math.max(0, msgs.scrollHeight - msgs.clientHeight * 0.66);

                                const btnApprove = toolCard.querySelector('.approve-btn');
                                const btnReject = toolCard.querySelector('.reject-btn');
                                
                                const handleAction = (approved) => {
                                    btnApprove.disabled = true;
                                    btnReject.disabled = true;
                                    btnApprove.style.opacity = '0.4';
                                    btnReject.style.opacity = '0.4';
                                    btnApprove.style.cursor = 'not-allowed';
                                    btnReject.style.cursor = 'not-allowed';
                                    btnApprove.innerHTML = approved ? 'Executing...' : 'Rejected';
                                    
                                    const actionPayload = {
                                        session_id: window.aiSessionId,
                                        tool_name: data.name,
                                        tool_args: data.args,
                                        approved: approved
                                    };
                                    // Make the call to approve endpoint and resume chat
                                    window.handleAiStream('/api/tool/approve', actionPayload);
                                };

                                btnApprove.onclick = () => handleAction(true);
                                btnReject.onclick = () => handleAction(false);
                            } else if (data.type === 'text') {
                                fullText += data.text;
                                if (typeof marked !== 'undefined') {
                                    loadingDiv.innerHTML = marked.parse(fullText);
                                } else {
                                    loadingDiv.textContent = fullText;
                                }
                                msgs.scrollTop = Math.max(0, msgs.scrollHeight - msgs.clientHeight * 0.66);
                            }
                        } else {
                            loadingDiv.textContent = "Sorry, an error occurred: " + (data.message || "未知错误");
                            loadingDiv.style.color = "var(--error)";
                        }
                    } catch (e) {
                        // ignore incomplete json parses gracefully
                    }
                }
            }
        } catch (e) {
            loadingDiv.textContent = "Network request failed. Unable to connect to AI.";
            loadingDiv.style.color = "var(--error)";
        }
        msgs.scrollTop = Math.max(0, msgs.scrollHeight - msgs.clientHeight * 0.66);
    };

    // --- Workflow Modal Logic ---
    const btnWorkflows = document.getElementById('btn-workflows');
    const workflowModal = document.getElementById('workflow-modal');
    const closeWorkflowBtn = document.getElementById('close-workflow-btn');
    const wfContent = document.getElementById('workflow-modal-content');
    
    let currentExportId = null;
    // isWorkflowRunning 已废弃，改由 runningWorkflows Set 按 wfType 独立跟踪（见 wf-selector change 处理器）

    if (btnWorkflows && workflowModal) {


        btnWorkflows.addEventListener('click', () => {
            if (window.makeDraggable && !wfContent.hasAttribute('data-drag-init')) {
                window.makeDraggable(wfContent, wfContent.querySelector('.modal-header'));
                wfContent.setAttribute('data-drag-init', 'true');
            }
            
            window.centerModal(wfContent);
            workflowModal.style.visibility = 'visible';
            workflowModal.style.opacity = '1';
            workflowModal.style.display = 'flex';
            if (window.updateWorkflowAuthBadge) window.updateWorkflowAuthBadge();

            
            // Helper: Filter reports dropdown by selected workspace
            const updateReportsForWorkspace = (wSelectId, rSelectId) => {
                const wSelect = document.getElementById(wSelectId);
                const rSelect = document.getElementById(rSelectId);
                if (!wSelect || !rSelect) return;
                
                const selectedWId = wSelect.value;
                const reports = JSON.parse(localStorage.getItem('pbi_reports') || '[]');
                const currentRVal = rSelect.value;
                
                rSelect.innerHTML = '<option value="">-- Select Report --</option>';
                let matchFound = false;
                
                reports.forEach(item => {
                    // Match report if workspace_id matches or if no workspace is explicitly specified on report item
                    const opt = document.createElement('option');
                    opt.value = item.id;
                    opt.textContent = `${item.alias || item.name || "Unnamed"} (${item.id})`;
                    rSelect.appendChild(opt);
                    if (item.id === currentRVal) matchFound = true;
                });
                
                if (matchFound) {
                    rSelect.value = currentRVal;
                } else if (rSelect.options.length > 1) {
                    rSelect.selectedIndex = 1; // Auto select first available report
                }
            };

            const fillSelect = (selectId, storageKey) => {
                const select = document.getElementById(selectId);
                if(!select) return;
                select.innerHTML = '<option value="">-- Select --</option>';
                const items = JSON.parse(localStorage.getItem(storageKey) || '[]');
                items.forEach(item => {
                    const opt = document.createElement('option');
                    opt.value = item.id;
                    opt.textContent = `${item.alias || item.name || "Unnamed"} (${item.id})`;
                    select.appendChild(opt);
                });
            };
            fillSelect('wf-exp-workspace', 'pbi_workspaces');
            fillSelect('wf-exp-report', 'pbi_reports');
            fillSelect('wf-vis-workspace', 'pbi_workspaces');
            fillSelect('wf-vis-report', 'pbi_reports');
            fillSelect('wf-ds-workspace', 'pbi_workspaces');
            fillSelect('wf-ds-dataset', 'pbi_datasets');
            fillSelect('wf-rvc-workspace', 'pbi_workspaces');
            fillSelect('wf-rvc-report', 'pbi_reports');
            
            // Set Default Workspace for wf-vis-workspace if empty (Default to WorkSpace_DEV or first active workspace)
            const visWSelect = document.getElementById('wf-vis-workspace');
            if (visWSelect && !visWSelect.value) {
                const workspaces = JSON.parse(localStorage.getItem('pbi_workspaces') || '[]');
                const devW = workspaces.find(w => w.alias === 'WorkSpace_DEV' || w.id === '2c51e061-0f9f-4d02-bed0-c169019e5d83') || workspaces[0];
                if (devW) {
                    visWSelect.value = devW.id;
                }
            }

            const visRSelect = document.getElementById('wf-vis-report');
            const reports = JSON.parse(localStorage.getItem('pbi_reports') || '[]');
            const azReport = reports.find(r => r.alias === 'AstraZeneca_SFE' || r.id === '5c6df788-fcc6-4758-ba9c-42bc1b969666') || reports[0];
            if (visRSelect && !visRSelect.value && azReport) {
                visRSelect.value = azReport.id;
            }

            const activeW = document.getElementById('active-workspace')?.value;
            const activeR = document.getElementById('active-report')?.value;
            if (activeW) document.getElementById('wf-exp-workspace').value = activeW;
            if (activeR) document.getElementById('wf-exp-report').value = activeR;
            
            if (activeW) document.getElementById('wf-ds-workspace').value = activeW;
            const activeD = document.getElementById('active-dataset')?.value;
            if (activeD) document.getElementById('wf-ds-dataset').value = activeD;
            if (activeW) document.getElementById('wf-rvc-workspace').value = activeW;
            if (activeR) document.getElementById('wf-rvc-report').value = activeR;

            if (document.getElementById('wf-selector')?.value === 'export_visual') {
                setTimeout(() => {
                    if (window.loadExportVisualPages) window.loadExportVisualPages();
                }, 300);
            }
        });

        closeWorkflowBtn.addEventListener('click', () => {
            if(window.closeModalWithAnimation) {
                window.closeModalWithAnimation('workflow-modal');
            } else {
                workflowModal.style.display = 'none';
            }
        });




        const logToConsole = (step, msg) => {
            const out = document.getElementById(`wf-out-step${step}`);
            out.textContent += `\n[${new Date().toLocaleTimeString()}] ${msg}`;
                    setTimeout(() => { out.scrollTop = Math.max(0, out.scrollHeight - out.clientHeight * 0.66); }, 10);
            setTimeout(() => { out.scrollTop = Math.max(0, out.scrollHeight - out.clientHeight * 0.66); }, 50);
        };
        const resetConsole = (step, initialMsg) => {
            const out = document.getElementById(`wf-out-step${step}`);
            out.textContent = initialMsg;
        };
        const setStepActive = (step) => {
            [1, 2, 3].forEach(s => document.getElementById(`wf-step-${s}`).classList.remove('active'));
            if (step) document.getElementById(`wf-step-${step}`).classList.add('active');
        };

        const executeStep1 = async () => {
    if(window.expandConsole) window.expandConsole('wf-out-step1');
            resetConsole(1, "Input: Sending POST request...");
            setStepActive(1);
            const wId = document.getElementById('wf-exp-workspace').value.trim();
            const rId = document.getElementById('wf-exp-report').value.trim();
            const format = document.getElementById('wf-exp-format').value;
            
            if (!wId || !rId) {
                logToConsole(1, "Error: Workspace ID and Report ID are required.");
                return false;
            }

            try {
                logToConsole(1, `Endpoint: /groups/${wId}/reports/${rId}/ExportTo\nFormat: ${format}`);
                const res = await fetch('/api/proxy', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        endpoint: `/groups/${wId}/reports/${rId}/ExportTo`,
                        method: 'POST',
                        body: { format: format }
                    })
                });
                const data = await res.json();
                
                if (data.error || (data.status && data.status >= 400)) {
                    logToConsole(1, `API Error: ${JSON.stringify(data, null, 2)}`);
                    return false;
                }
                
                logToConsole(1, `Success! Response: \n${JSON.stringify(data, null, 2)}`);
                const exportId = (data.data && data.data.id) ? data.data.id : data.id;
                if (exportId) {
                    currentExportId = exportId;
                    logToConsole(1, `\nExtracted exportId: ${currentExportId}\nReady for Step 2.`);
                    document.getElementById('wf-btn-step2').disabled = false;
                    return true;
                } else {
                    logToConsole(1, `Could not find 'id' in response.`);
                    return false;
                }
            } catch (err) {
                logToConsole(1, `Exception: ${err.message}`);
                return false;
            }
        };

        const executeStep2 = async (isAuto = false) => {
            if (!currentExportId) {
                logToConsole(2, "Error: No exportId found. Please run Step 1 first.");
                return false;
            }
            if (!isAuto) resetConsole(2, `Polling status for exportId: ${currentExportId}...`);
            setStepActive(2);
            const wId = document.getElementById('wf-exp-workspace').value.trim();
            const rId = document.getElementById('wf-exp-report').value.trim();
            
            try {
                logToConsole(2, `GET /groups/${wId}/reports/${rId}/exports/${currentExportId}`);
                const res = await fetch('/api/proxy', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        endpoint: `/groups/${wId}/reports/${rId}/exports/${currentExportId}`,
                        method: 'GET'
                    })
                });
                const data = await res.json();
                logToConsole(2, `Status response: ${JSON.stringify(data)}`);
                
                const status = (data.data && data.data.status) ? data.data.status : data.status;
                if (status === 'Succeeded') {
                    logToConsole(2, `\nExport Succeeded! Ready for Step 3.`);
                    document.getElementById('wf-btn-step3').disabled = false;
                    return true;
                } else if (status === 'Failed') {
                    logToConsole(2, `\nExport Failed! Check Power BI service.`);
                    return false;
                } else {
                    // Running or NotStarted
                    if (isAuto) {
                        logToConsole(2, `Wait 3s and retry...`);
                        await new Promise(r => setTimeout(r, 3000));
                        return await executeStep2(true);
                    }
                    return false;
                }
            } catch (err) {
                logToConsole(2, `Exception: ${err.message}`);
                return false;
            }
        };

        const executeStep3 = async () => {
    if(window.expandConsole) window.expandConsole('wf-out-step3');
            resetConsole(3, `Downloading file for exportId: ${currentExportId}...`);
            setStepActive(3);
            const wId = document.getElementById('wf-exp-workspace').value.trim();
            const rId = document.getElementById('wf-exp-report').value.trim();
            
            try {
                logToConsole(3, `GET /groups/${wId}/reports/${rId}/exports/${currentExportId}/file`);
                // Use proxy to get raw response stream
                // Note: since our proxy returns JSON by default if we don't stream, we should tell proxy to fetch raw data.
                // Wait, our proxy doesn't handle binary download easily. 
                // We will send a fetch and then process it.
                logToConsole(3, `Calling /api/download endpoint for raw binary stream...`);
                const res = await fetch('/api/download', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        endpoint: `/groups/${wId}/reports/${rId}/exports/${currentExportId}/file`,
                        method: 'GET'
                    })
                });
                // If it returns a binary stream, the proxy might fail because it tries to return JSON.
                // Since this is a demonstration of the workflow UI, we'll log whatever we get.
                if (res.headers.get('content-type')?.includes('json')) {
                    const data = await res.json();
                    if (data.error) {
                        logToConsole(3, `Download API Error: ${data.error}`);
                        return false;
                    }
                    logToConsole(3, `Proxy JSON Output (Unexpected): ${JSON.stringify(data).substring(0, 500)}`);
                    return false;
                } else {
                    const blob = await res.blob();
                    logToConsole(3, `Received Blob: size=${blob.size}, type=${blob.type}`);
                    // trigger download
                    const url = window.URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.style.display = 'none';
                    a.href = url;
                    a.download = `ExportedReport_${rId}`;
                    document.body.appendChild(a);
                    a.click();
                    window.URL.revokeObjectURL(url);
                    logToConsole(3, `File download triggered! Workflow Complete! 🎉`);
                }
                setStepActive(null);
                return true;
            } catch (err) {
                logToConsole(3, `Exception: ${err.message}`);
                return false;
            }
        };

        
        const wfSelector = document.getElementById('wf-selector');
        
        // 每个 workflow 独立维护 running 状态，避免切换时按钮卡死
        const runningWorkflows = new Set();
        
        function setRunBtnState(wfType) {
            const btn = document.getElementById('wf-btn-runall');
            if (!btn) return;
            if (runningWorkflows.has(wfType)) {
                btn.disabled = true;
                btn.innerHTML = '<svg class="spinning" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" style="display:inline-block;animation:spin 0.8s linear infinite;"><path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67"/></svg>';
            } else {
                btn.disabled = false;
                btn.innerHTML = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><polygon points="6 3 20 12 6 21 6 3"></polygon></svg>';
            }
        }
        
        wfSelector.addEventListener('change', (e) => {
            // 保存切换前 WF 的参数快照
            const prevVal = wfSelector.dataset.prevVal;
            if (prevVal) window.saveWfParams && window.saveWfParams(prevVal);
            wfSelector.dataset.prevVal = e.target.value;
            
            // 关闭重命名输入框
            window.cancelWfRename && window.cancelWfRename();
            
            const val = e.target.value;
            // Hide all first
            document.getElementById('wf-config-export_report').style.display = 'none';
            document.getElementById('wf-export-wrapper').style.display = 'none';
            document.getElementById('wf-config-smart_pipeline').style.display = 'none';
            document.getElementById('wf-config-export_visual').style.display = 'none';
            document.getElementById('wf-config-export_dataset_tables').style.display = 'none';
            document.getElementById('wf-config-report_view_count').style.display = 'none';
            document.getElementById('wf-config-check_permissions').style.display = 'none';
            const dpmPane = document.getElementById('wf-config-dataset_partitions_manager'); if(dpmPane) dpmPane.style.display = 'none';
            const gumPane = document.getElementById('wf-config-global_user_manager'); if(gumPane) gumPane.style.display = 'none';
            const xmlaPane = document.getElementById('wf-config-xmla_interactive_refresh'); if(xmlaPane) xmlaPane.style.display = 'none';
            const localQPane = document.getElementById('wf-container-local_model_query'); if(localQPane) localQPane.style.display = 'none';
            
            if (val === 'smart_pipeline') {
                document.getElementById('wf-config-smart_pipeline').style.display = 'block';
                document.getElementById('wf-btn-runall').style.display = 'flex';
            } else if (val === 'xmla_interactive_refresh') {
                if (xmlaPane) xmlaPane.style.display = 'block';
                document.getElementById('wf-btn-runall').style.display = 'flex';
            } else if (val === 'dataset_partitions_manager') {
                if (dpmPane) dpmPane.style.display = 'block';
                document.getElementById('wf-btn-runall').style.display = 'flex';
                // ❌ 已移除：不再自动扫描，用户需点击 Run 才触发
            } else if (val === 'export_dataset_tables') {
                document.getElementById('wf-config-export_dataset_tables').style.display = 'block';
                document.getElementById('wf-btn-runall').style.display = 'flex';
            } else if (val === 'global_user_manager') {
                  document.getElementById('wf-config-global_user_manager').style.display = 'block';
                  document.getElementById('wf-btn-runall').style.display = 'flex';
              } else if (val === 'check_permissions') {
                document.getElementById('wf-config-check_permissions').style.display = 'block';
                document.getElementById('wf-btn-runall').style.display = 'flex';
            } else if (val === 'local_model_query') {
                document.getElementById('wf-container-local_model_query').style.display = 'block';
                document.getElementById('wf-btn-runall').style.display = 'flex';
                window.fetchLocalModelInstances();
                window.updateLocalDaxTemplate(); // Init template
            } else if (val === 'export_visual') {
                document.getElementById('wf-config-export_visual').style.display = 'block';
                document.getElementById('wf-btn-runall').style.display = 'flex';
                loadPages();
            } else if (val === 'report_view_count') {
                document.getElementById('wf-config-report_view_count').style.display = 'block';
                document.getElementById('wf-btn-runall').style.display = 'flex';
                const endD = new Date();
                const startD = new Date();
                startD.setDate(startD.getDate() - 7);
                document.getElementById('wf-rvc-start').value = startD.toISOString().split('T')[0];
                document.getElementById('wf-rvc-end').value = endD.toISOString().split('T')[0];
            } else {
                document.getElementById('wf-config-export_report').style.display = 'block';
                document.getElementById('wf-export-wrapper').style.display = 'block';
                document.getElementById('wf-btn-runall').style.display = 'flex';
            }
            
            // 切换 workflow 时，根据该 wf 是否在运行来恢复/保持按钮状态
            setRunBtnState(val);
            
            // 恢复此 WF 上次保存的参数（延迟一帧确保 DOM 已显示）
            requestAnimationFrame(() => window.restoreWfParams && window.restoreWfParams(val));
            
            // 持久化：记住用户上次选择的 workflow
            try { localStorage.setItem('pbi-last-workflow', val); } catch(e) {}
        });
        
        // 应用自定义 WF 名称（需在 selector 初始化之后立即执行）
        window.applyWfNames && window.applyWfNames();
        
        // 恢复上次选中的 workflow（跨刷新持久化）
        const savedWf = localStorage.getItem('pbi-last-workflow');
        if (savedWf && wfSelector.querySelector(`option[value="${savedWf}"]`)) {
            wfSelector.value = savedWf;
            wfSelector.dataset.prevVal = savedWf;
            wfSelector.dispatchEvent(new Event('change')); // 触发 change 以渲染对应面板
        }

        document.getElementById('wf-btn-step1').onclick = executeStep1;
        document.getElementById('wf-btn-step2').onclick = () => executeStep2(false);
        document.getElementById('wf-btn-step3').onclick = executeStep3;

        
        // --- Export Visual Data Logic ---
        let currentEmbeddedReport = null;

        const loadPages = async () => {
            const wId = document.getElementById('wf-vis-workspace').value;
            const rId = document.getElementById('wf-vis-report').value;
            const pageSelect = document.getElementById('wf-vis-page');
            const visSelect = document.getElementById('wf-vis-visual');
            const embedContainer = document.getElementById('pbi-embed-container');
            const out = document.getElementById('wf-out-vis');
            
            pageSelect.innerHTML = '<option value="">Loading pages...</option>';
            visSelect.innerHTML = '<option value="">-- Select Page First --</option>';
            
            if (!wId || !rId) return;
            
            try {
                // 1. Fetch Embed Token & URL
                out.textContent = `[${new Date().toLocaleTimeString()}] Requesting Embed Token...\n`;
                const res = await fetch('/api/embed_info', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ workspace_id: wId, report_id: rId })
                });
                const data = await res.json();
                if (!data.success) {
                    out.textContent += `Notice: Embed token generation error: ${data.error}. Falling back to Power BI REST API Mode...\n`;
                    setTimeout(() => { out.scrollTop = Math.max(0, out.scrollHeight - out.clientHeight * 0.66); }, 10);
                    await fetchPagesViaRestApi(wId, rId);
                    return;
                }
                
                out.textContent += `Token received. Initializing Power BI Embedded iframe...\n`;
                    setTimeout(() => { out.scrollTop = Math.max(0, out.scrollHeight - out.clientHeight * 0.66); }, 10);
                const embedWrapper = document.getElementById('pbi-embed-wrapper');
                if (embedWrapper) embedWrapper.style.display = 'block';
                embedContainer.style.display = 'block';
                
                // 2. Embed the report
                const models = window['powerbi-client'].models;
                const tokenType = (data.tokenType === 'Aad') ? models.TokenType.Aad : models.TokenType.Embed;
                const config = {
                    type: 'report',
                    tokenType: tokenType,
                    accessToken: data.embedToken,
                    embedUrl: data.embedUrl,
                    id: rId,
                    settings: {
                        panes: { filters: { visible: false }, pageNavigation: { visible: true } },
                        layoutType: models.LayoutType.FitToPage
                    }
                };
                
                // Reset container
                powerbi.reset(embedContainer);
                currentEmbeddedReport = powerbi.embed(embedContainer, config);
                
                currentEmbeddedReport.off("pageChanged");
                currentEmbeddedReport.on("pageChanged", function (event) {
                    const newPage = event.detail.newPage;
                    if (newPage && newPage.name) {
                        const pageSelect = document.getElementById('wf-vis-page');
                        const fsPageSelect = document.getElementById('pbi-fs-page-select');
                        if (pageSelect && pageSelect.value !== newPage.name) pageSelect.value = newPage.name;
                        if (fsPageSelect && fsPageSelect.value !== newPage.name) fsPageSelect.value = newPage.name;
                    }
                });
                
                currentEmbeddedReport.off("loaded");
                currentEmbeddedReport.on("loaded", async function () {
                    out.textContent += `Report rendered in UI! Fetching Pages via JS SDK...\n`;
                    setTimeout(() => { out.scrollTop = Math.max(0, out.scrollHeight - out.clientHeight * 0.66); }, 10);
                    try {
                        const pages = await currentEmbeddedReport.getPages();
                        populatePagesDropdown(pages);
                    } catch (e) {
                        out.textContent += `JS SDK getPages failed, trying REST API fallback...\n`;
                        await fetchPagesViaRestApi(wId, rId);
                    }
                });
                
                currentEmbeddedReport.off("error");
                currentEmbeddedReport.on("error", async function (event) {
                    const errMsg = (event.detail && event.detail.message) ? event.detail.message : JSON.stringify(event.detail || event);
                    out.textContent += `Embed Event/Error: ${errMsg}\n`;
                    setTimeout(() => { out.scrollTop = Math.max(0, out.scrollHeight - out.clientHeight * 0.66); }, 10);
                    // Fallback to REST API if page dropdown is still loading/empty
                    if (pageSelect.value === '' || pageSelect.innerHTML.includes('Loading')) {
                        await fetchPagesViaRestApi(wId, rId);
                    }
                });

            } catch (err) {
                out.textContent += `Exception: ${err.message}\nTrying REST API fallback...\n`;
                setTimeout(() => { out.scrollTop = Math.max(0, out.scrollHeight - out.clientHeight * 0.66); }, 10);
                await fetchPagesViaRestApi(wId, rId);
            }
        };

        const populatePagesDropdown = (pages) => {
            const pageSelect = document.getElementById('wf-vis-page');
            const fsPageSelect = document.getElementById('pbi-fs-page-select');
            
            pageSelect.innerHTML = '<option value="">-- Select a Page --</option>';
            pageSelect.innerHTML += '<option value="ALL">🌟 ALL PAGES (全部页面) 🌟</option>';
            
            if (fsPageSelect) fsPageSelect.innerHTML = '<option value="">-- Select a Page --</option>';
            
            if (Array.isArray(pages) && pages.length > 0) {
                pages.forEach(p => {
                    const opt = document.createElement('option');
                    opt.value = p.name; // This is the internal name
                    const dName = p.displayName || p.name || 'Unnamed Page';
                    opt.textContent = dName + ' (' + p.name + ')';
                    pageSelect.appendChild(opt);

                    if (fsPageSelect) {
                        const fsOpt = document.createElement('option');
                        fsOpt.value = p.name;
                        fsOpt.textContent = dName;
                        fsPageSelect.appendChild(fsOpt);
                    }
                });
            }
        };

        window.switchEmbedPage = async function(pageName) {
            if (!currentEmbeddedReport || !pageName) return;
            try {
                const pages = await currentEmbeddedReport.getPages();
                const targetPage = pages.find(p => p.name === pageName);
                if (targetPage) {
                    await targetPage.setActive();
                    // Sync workflow page select if different
                    const pageSelect = document.getElementById('wf-vis-page');
                    if (pageSelect && pageSelect.value !== pageName) pageSelect.value = pageName;
                    const fsPageSelect = document.getElementById('pbi-fs-page-select');
                    if (fsPageSelect && fsPageSelect.value !== pageName) fsPageSelect.value = pageName;
                }
            } catch (e) {
                console.error("switchEmbedPage error:", e);
            }
        };

        window.refreshEmbeddedReport = async function(btn) {
            if (!currentEmbeddedReport) return;
            const svgIcon = btn ? btn.querySelector('svg') : null;
            if (svgIcon) svgIcon.classList.add('spinning');
            try {
                await currentEmbeddedReport.refresh();
                if (window.showNotification) window.showNotification("Report data refreshed!", "success");
            } catch (e) {
                console.error("refreshEmbeddedReport error:", e);
                if (window.showNotification) window.showNotification("Refresh notice: " + (e.message || "Updated"), "info");
            } finally {
                if (svgIcon) {
                    setTimeout(() => svgIcon.classList.remove('spinning'), 600);
                }
            }
        };

        const fetchPagesViaRestApi = async (wId, rId) => {
            const pageSelect = document.getElementById('wf-vis-page');
            const out = document.getElementById('wf-out-vis');
            try {
                const res = await fetch('/api/proxy', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ endpoint: `/groups/${wId}/reports/${rId}/pages`, method: 'GET' })
                });
                const data = await res.json();
                const payload = data.data || data;
                const pages = payload.value || payload;
                if (Array.isArray(pages) && pages.length > 0) {
                    out.textContent += `[REST API Fallback] Loaded ${pages.length} pages via Power BI REST API.\n`;
                    populatePagesDropdown(pages);
                } else {
                    out.textContent += `[REST API Fallback] No pages returned or permission restricted.\n`;
                    pageSelect.innerHTML = '<option value="">No pages found</option>';
                }
            } catch (err) {
                out.textContent += `REST API fallback error: ${err.message}\n`;
                pageSelect.innerHTML = '<option value="">Error loading pages</option>';
            }
        };

        const loadVisuals = async () => {
            const pId = document.getElementById('wf-vis-page').value;
            const visSelect = document.getElementById('wf-vis-visual');
            visSelect.innerHTML = '<option value="">Loading visuals...</option>';
            
            if (!pId) return;
            
            if (pId === 'ALL' || !currentEmbeddedReport) {
                visSelect.innerHTML = '<option value="ALL">🌟 ALL VISUALS ON THIS PAGE (全部视觉对象) 🌟</option>';
                return;
            }
            
            try {
                const pages = await currentEmbeddedReport.getPages();
                const activePage = pages.find(p => p.name === pId);
                if (!activePage) throw new Error("Page not found in embedded report");
                
                // 自动让下方的报表跳转到用户选定的页面
                try {
                    await activePage.setActive();
                } catch (e) {
                    console.log("Failed to set active page", e);
                }
                
                const visuals = await activePage.getVisuals();
                visSelect.innerHTML = '<option value="">-- Select a Visual --</option>';
                visSelect.innerHTML += '<option value="ALL">🌟 ALL VISUALS ON THIS PAGE 🌟</option>';
                if (Array.isArray(visuals) && visuals.length > 0) {
                    visuals.forEach(v => {
                        const opt = document.createElement('option');
                        opt.value = v.name;
                        const vTitle = v.title ? v.title : (v.type ? `[${v.type}]` : 'Unnamed Visual');
                        opt.textContent = vTitle + ' (' + v.name + ')';
                        visSelect.appendChild(opt);
                    });
                }
            } catch (err) {
                visSelect.innerHTML = '<option value="ALL">🌟 ALL VISUALS ON THIS PAGE (全部视觉对象) 🌟</option>';
            }
        };

        window.loadExportVisualPages = loadPages;

        document.getElementById('wf-vis-report').addEventListener('change', () => {
            loadPages();
        });
        document.getElementById('wf-vis-workspace').addEventListener('change', () => {
            loadPages();
        });
        document.getElementById('wf-vis-page').addEventListener('change', loadVisuals);

        const executeExportVisual = async () => {
            const out = document.getElementById('wf-out-vis');
            window.expandConsole('wf-out-vis');
            
            const modeToggle = document.querySelector('input[name="wf-vis-mode"]:checked');
            const mode = modeToggle ? modeToggle.value : 'export';
            
            // Allow empty selection to default to 'ALL'
            let pId = document.getElementById('wf-vis-page').value;
            if (!pId) pId = 'ALL';
            
            let visId = document.getElementById('wf-vis-visual').value;
            if (!visId) visId = 'ALL';
            
            const wsId = document.getElementById('wf-vis-workspace').value;
            const reportId = document.getElementById('wf-vis-report').value;
            const expTypeStr = document.getElementById('wf-vis-type').value;
            const rows = parseInt(document.getElementById('wf-vis-rows').value) || 100000;
            
            if (mode === 'analyze') {
                if (!currentEmbeddedReport) {
                    if (window.showNotification) window.showNotification("Error: Please select Workspace and Report, and wait for report to render.", "error");
                    out.textContent += `[${new Date().toLocaleTimeString()}] Error: Embedded report not ready.\n`;
                    setTimeout(() => { out.scrollTop = Math.max(0, out.scrollHeight - out.clientHeight * 0.66); }, 10);
                    return;
                }
                
                if (window.showNotification) window.showNotification("Analyzing Dependencies via JS SDK... Check console below.", "info");
                out.textContent += `[${new Date().toLocaleTimeString()}] Analyzing Visual Dependencies via JS SDK (Frontend)...\n`;
                setTimeout(() => { out.scrollTop = Math.max(0, out.scrollHeight - out.clientHeight * 0.66); }, 10);
                
                let dataList = [];
                
                try {
                    const pages = await currentEmbeddedReport.getPages();
                    const targetPages = (pId === 'ALL') ? pages : pages.filter(p => p.name === pId);
                    
                    if (targetPages.length === 0) {
                        out.textContent += `Error: Page not found.\n`;
                        return;
                    }
                    
                    for (let page of targetPages) {
                        out.textContent += `\n📄 Page: [${page.displayName}]\n`;
                        setTimeout(() => { out.scrollTop = Math.max(0, out.scrollHeight - out.clientHeight * 0.66); }, 10);
                        
                        await page.setActive();
                        await new Promise(r => setTimeout(r, 1500)); // wait for visuals to load
                        
                        const visuals = await page.getVisuals();
                        const targetVisuals = (visId === 'ALL') ? visuals : visuals.filter(v => v.name === visId);
                        
                        for (let v of targetVisuals) {
                            const vName = v.title || v.name || v.type;
                            out.textContent += `  📊 Visual: [${vName}] (Type: ${v.type})\n`;
                            
                            let hasFields = false;
                            
                            try {
                                const caps = await v.getCapabilities();
                                if (caps && caps.dataRoles) {
                                    for (let role of caps.dataRoles) {
                                        try {
                                            const fields = await v.getDataFields(role.name);
                                            if (fields && fields.length > 0) {
                                                out.textContent += `    🔹 Role '${role.name}':\n`;
                                                for (let f of fields) {
                                                    let fStr = JSON.stringify(f);
                                                    if (f.column) fStr = `'${f.table}'[${f.column}] (Column)`;
                                                    else if (f.measure) fStr = `'${f.table}'[${f.measure}] (Measure)`;
                                                    else if (f.hierarchyLevel) fStr = `'${f.table}'[${f.hierarchyLevel.hierarchy}].[${f.hierarchyLevel.level}] (Hierarchy)`;
                                                    
                                                    if (f.aggregation) {
                                                        fStr += ` {Agg: ${f.aggregation.Function || f.aggregation}}`;
                                                    }
                                                    out.textContent += `       - ${fStr}\n`;
                                                    dataList.push({ page: page.displayName, visual: vName, type: v.type, role: role.name, field: fStr });
                                                    hasFields = true;
                                                }
                                            }
                                        } catch (e) {
                                            // skip
                                        }
                                    }
                                }
                            } catch(e) {
                                out.textContent += `    (Capabilities inaccessible in View mode. Attempting CSV Header Fallback...)\n`;
                                try {
                                    const models = window['powerbi-client'].models;
                                    const res = await v.exportData(models.ExportDataType.Summarized, 1);
                                    if (res && res.data) {
                                        const firstLine = res.data.split('\n')[0];
                                        const headers = firstLine.split(',').map(h => h.replace(/^"|"$/g, ''));
                                        out.textContent += `    🔹 Detected Fields (from Export):\n`;
                                        headers.forEach(h => {
                                            if (h.trim() && h.trim() !== '""') {
                                                out.textContent += `       - ${h}\n`;
                                                dataList.push({ page: page.displayName, visual: vName, type: v.type, role: '(Export Data Fallback)', field: h });
                                                hasFields = true;
                                            }
                                        });
                                    }
                                } catch (e2) {
                                    out.textContent += `    (Fallback failed: ${e2.message})\n`;
                                }
                            }
                            
                            if (!hasFields) {
                                dataList.push({ page: page.displayName, visual: vName, type: v.type, role: '-', field: '(No bound data / Unsupported)' });
                            }
                        }
                    }
                    
                    out.textContent += `\n> Task Completed. Generating table modal...\n`;
                    
                                        
                    window._lastDependencyData = dataList;
                    out.innerHTML += `\n<button onclick="window.openDependencyResultModal()" style="display:inline-flex; align-items:center; gap:5px; margin-top:10px; color:var(--accent); font-weight:bold; background:none; border:none; cursor:pointer; text-decoration:underline dotted; padding:0;">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"/></svg>
                        Visual Dependency Tree Table Results
                    </button>\n`;
                    
                    if (!window.openDependencyResultModal) {
                        window.openDependencyResultModal = function() {
                            const data = window._lastDependencyData || [];
                            if (window.showUniversalDataModal) {
                                window.showUniversalDataModal({
                                    modalId: 'dependency-tree-modal',
                                    title: 'Visual Dependency Tree',
                                    data: data,
                                    columns: ['page', 'visual', 'type', 'role', 'field'],
                                    enableSearch: true,
                                    enableColumnFilter: true,
                                    cellRenderer: (col, val) => {
                                        if (col === 'field') return `<span style="font-family:monospace; color:#38bdf8;">${val}</span>`;
                                        return undefined;
                                    }
                                });
                            }
                        };
                    }
                    
                    // Automatically open it once for convenience (since they asked for it to pop up like other workflows, but other workflows pop up on button click OR auto if run completes)
                    // Let's auto-open it just in case, or just leave the button. The prompt says "通过点击类似xxx弹出表格弹窗", so they WANT to click the button to pop it up.
                    
                    if (window.showNotification) window.showNotification("Dependency Analysis Completed! Click the link below to view table.", "success");
                } catch (err) {
                    out.textContent += `\n❌ SDK Error: ${err.message}\n`;
                    if (window.showNotification) window.showNotification("Analysis Failed", "error");
                }
                setTimeout(() => { out.scrollTop = Math.max(0, out.scrollHeight - out.clientHeight * 0.66); }, 10);
                return;
            }

            out.textContent = `[${new Date().toLocaleTimeString()}] Triggering JS SDK exportData() -> Excel...\n`;
            
            if (!currentEmbeddedReport) {
                out.textContent += `Error: Embedded report not ready.\n`;
                setTimeout(() => { out.scrollTop = Math.max(0, out.scrollHeight - out.clientHeight * 0.66); }, 10);
                return;
            }
            
            try {
                const models = window['powerbi-client'].models;
                const exportType = (expTypeStr === 'Summarized') ? models.ExportDataType.Summarized : models.ExportDataType.Underlying;
                
                const wb = XLSX.utils.book_new();
                let fileCount = 0;
                
                const pages = await currentEmbeddedReport.getPages();
                const targetPages = (pId === 'ALL') ? pages : pages.filter(p => p.name === pId);
                
                if (targetPages.length === 0) {
                    out.textContent += `Error: Page not found.\n`;
                    return;
                }

                for (let page of targetPages) {
                    out.textContent += `\n> Navigating to Page: [${page.displayName}]...\n`;
                    setTimeout(() => { out.scrollTop = Math.max(0, out.scrollHeight - out.clientHeight * 0.66); }, 10);
                    await page.setActive();
                    await new Promise(r => setTimeout(r, 1500)); // wait for visuals to load
                    
                    const visuals = await page.getVisuals();
                    const targetVisuals = (visId === 'ALL') ? visuals : visuals.filter(v => v.name === visId);
                    
                    if (targetVisuals.length === 0) {
                        out.textContent += `  - No matching visuals found on this page.\n`;
                        continue;
                    }

                    for (let v of targetVisuals) {
                        const vName = v.title || v.name || v.type;
                        out.textContent += `  - Visual [${vName}]: Extracting...`;
                        setTimeout(() => { out.scrollTop = Math.max(0, out.scrollHeight - out.clientHeight * 0.66); }, 10);
                        try {
                            const result = await v.exportData(exportType, rows);
                            
                            // Parse CSV to Excel Worksheet
                            const tempWb = XLSX.read(result.data, {type: 'string'});
                            const ws = tempWb.Sheets[tempWb.SheetNames[0]];
                            
                            // Generate safe Sheet Name (Max 31 chars, no invalid chars)
                            let rawSheetName = (pId === 'ALL') ? `${page.displayName}_${vName}` : vName;
                            let sheetName = rawSheetName.replace(/[\\\/\*\?\:\[\]]/g, '').trim();
                            if (sheetName.length > 31) sheetName = sheetName.substring(0, 31).trim();
                            if (!sheetName) sheetName = "Sheet";
                            
                            // Ensure uniqueness
                            if (wb.SheetNames.includes(sheetName)) {
                                let suffix = 1;
                                while(wb.SheetNames.includes(sheetName.substring(0, 27) + "_" + suffix)) suffix++;
                                sheetName = sheetName.substring(0, 27) + "_" + suffix;
                            }
                            
                            XLSX.utils.book_append_sheet(wb, ws, sheetName);
                            fileCount++;
                            out.textContent += ` OK (Appended to Sheet: ${sheetName})\n`;
                            setTimeout(() => { out.scrollTop = Math.max(0, out.scrollHeight - out.clientHeight * 0.66); }, 10);
                        } catch (e) {
                            out.textContent += ` SKIPPED (No data or unsupported)\n`;
                            setTimeout(() => { out.scrollTop = Math.max(0, out.scrollHeight - out.clientHeight * 0.66); }, 10);
                        }
                    }
                }
                
                if (fileCount > 0) {
                    out.textContent += `\nData successfully extracted (${fileCount} sheets)! Generating Excel file...\n`;
                    setTimeout(() => { out.scrollTop = Math.max(0, out.scrollHeight - out.clientHeight * 0.66); }, 10);
                    XLSX.writeFile(wb, `PowerBI_Export_${expTypeStr}.xlsx`);
                    out.textContent += `\nExcel file downloaded: PowerBI_Export_${expTypeStr}.xlsx 🎉\n`;
                    setTimeout(() => { out.scrollTop = Math.max(0, out.scrollHeight - out.clientHeight * 0.66); }, 10);
                } else {
                    out.textContent += `\nWARNING: No exportable data found in the selected targets.\n`;
                    setTimeout(() => { out.scrollTop = Math.max(0, out.scrollHeight - out.clientHeight * 0.66); }, 10);
                }
                
            } catch (err) {
                out.textContent += `Exception during export: ${err.message || JSON.stringify(err)}\n`;
                setTimeout(() => { out.scrollTop = Math.max(0, out.scrollHeight - out.clientHeight * 0.66); }, 10);
            }
        };

        window.togglePbiEmbedFullscreen = function() {
            const embedWrapper = document.getElementById('pbi-embed-wrapper');
            const maxBtn = document.getElementById('pbi-embed-max-btn');
            
            if (!embedWrapper) return;
            
            const isFs = document.fullscreenElement || document.webkitFullscreenElement;
            
            if (!isFs) {
                if (embedWrapper.requestFullscreen) embedWrapper.requestFullscreen().catch(() => {});
                else if (embedWrapper.webkitRequestFullscreen) embedWrapper.webkitRequestFullscreen();
                if (maxBtn) maxBtn.title = "Restore / Normal Preview";
            } else {
                if (document.exitFullscreen) document.exitFullscreen().catch(() => {});
                else if (document.webkitExitFullscreen) document.webkitExitFullscreen();
                if (maxBtn) maxBtn.title = "Maximize / Fullscreen Preview";
            }
        };

        // --- End Export Visual Data Logic ---

        window.triggerWorkflowRun = async function() {
            const btn = document.getElementById('wf-btn-runall');
            const wfType = document.getElementById('wf-selector') ? document.getElementById('wf-selector').value : '';
            if (!wfType) return;
            
            // 检查当前 wf 是否已在运行
            if (runningWorkflows.has(wfType)) return;
            
            runningWorkflows.add(wfType);
            if (btn) {
                btn.disabled = true;
                btn.innerHTML = '<svg class="spinning" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" style="display:inline-block;animation:spin 0.8s linear infinite;"><path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67"/></svg>';
            }
            
            try {
                if (wfType === 'local_model_query') {
                    await window.runLocalModelWorkflow();
                } else if (wfType === 'export_report') {
                    const s1 = await executeStep1();
                    if (s1) {
                        const s2 = await executeStep2(true); // pass true for auto-polling
                        if (s2) {
                            await executeStep3();
                        }
                    }
                } else if (wfType === 'export_dataset_tables') {
                    await window.executeExportDataset();
                } else if (wfType === 'dataset_partitions_manager') {
                    await window.scanDatasetPartitions();
                } else if (wfType === 'xmla_interactive_refresh') {
                    if (window.runXmlaRefreshWorkflow) await window.runXmlaRefreshWorkflow();
                } else if (wfType === 'export_visual') {
                    await executeExportVisual();
                } else if (wfType === 'report_view_count') {
                    if (window.runRvcWorkflow) await window.runRvcWorkflow();
                } else if (wfType === 'check_permissions') {
                    if (window.runCheckPermsWorkflow) await window.runCheckPermsWorkflow();
                } else if (wfType === 'global_user_manager') {
                    if (window.runGlobalUserManager) {
                        await window.runGlobalUserManager();
                    } else {
                        console.error('runGlobalUserManager is not defined');
                    }
                } else if (wfType === 'smart_pipeline') {
                    const pipelineBtn = document.getElementById('start-pipeline-btn');
                    if (pipelineBtn) pipelineBtn.click();
                }
            } catch(wfErr) {
                console.error("Workflow execution error:", wfErr);
                window.showNotification && window.showNotification("Workflow error: " + (wfErr.message || wfErr), "error");
            } finally {
                runningWorkflows.delete(wfType);
                if (btn && !window.skipWfBtnReset && document.getElementById('wf-selector')?.value === wfType) {
                    btn.disabled = false;
                    btn.innerHTML = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><polygon points="6 3 20 12 6 21 6 3"></polygon></svg>';
                }
                window.skipWfBtnReset = false;
            }
        };

        const runAllBtn = document.getElementById('wf-btn-runall');
        if (runAllBtn) runAllBtn.onclick = window.triggerWorkflowRun;
    }
    // --- End Workflow Modal Logic ---





document.addEventListener('DOMContentLoaded', () => {
    // --- KV Store Interceptor ---
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

    const loadBtn = document.getElementById('load-tables-btn');
    if(loadBtn) {
        loadBtn.addEventListener('click', async () => {
            const ws = document.getElementById('wf-ds-workspace').value;
            const ds = document.getElementById('wf-ds-dataset').value;
            if(!ws || !ds) {
                alert("请先选择 Workspace 和 Dataset！(Select Workspace & Dataset first)");
                return;
            }
            
            const clientId = document.getElementById('set-client').value.trim();
            const clientSecret = document.getElementById('set-secret').value.trim();
            const tenantId = document.getElementById('set-tenant').value.trim();
            if (!clientId || !clientSecret || !tenantId) {
                alert("请在 Global Settings 中填写 Auth Credentials！");
                return;
            }
            
            await window.animateVerifyBtn(loadBtn, async () => {
                const payload = {
                    pbi_client_id: clientId,
                    pbi_client_secret: clientSecret,
                    pbi_tenant_id: tenantId,
                    query: "EVALUATE FILTER(INFO.TABLES(), [IsHidden] = FALSE)"
                };
                
                const res = await fetch(`/api/export_dataset/${ws}/${ds}`, {
                    method: 'POST',
                    headers: {'Content-Type': 'application/json'},
                    body: JSON.stringify(payload)
                });
                
                const data = await res.json();
                if(data.success) {
                    const sel = document.getElementById('wf-ds-table');
                    sel.innerHTML = '';
                    data.results.forEach(t => {
                        const NameKey = Object.keys(t).find(k => k.endsWith('Name]') || k === 'Name');
                        const opt = document.createElement('option');
                        opt.value = t[NameKey];
                        opt.textContent = t[NameKey];
                        sel.appendChild(opt);
                    });
                    return { success: true, message: `加载了 ${data.results.length} 张表` };
                } else {
                    return { success: false, message: data.message };
                }
            }, (res) => {
                // Success callback, do nothing special except the animation
            });
        });
    }
});




window.loadDatasetTablesStep1 = async function(btn) {
    window.expandConsole('wf-out-ds-step1');
    if (btn) btn.disabled = true;
    const ws = document.getElementById('wf-ds-workspace').value;
    const ds = document.getElementById('wf-ds-dataset').value;
    const consoleOut = document.getElementById('wf-out-ds-step1');
    const select = document.getElementById('wf-ds-table');
    const step1Div = document.getElementById('wf-ds-step-1');
    
    if(!ws || !ds) {
        consoleOut.innerText = '❌ Error: Please select Workspace and Dataset first.';
        setTimeout(() => { consoleOut.scrollTop = Math.max(0, consoleOut.scrollHeight - consoleOut.clientHeight * 0.66); }, 10);
        if (btn) btn.disabled = false;
        return false;
    }
    
    step1Div.classList.add('active');
    
    const clientId = document.getElementById('set-client').value.trim();
    const clientSecret = document.getElementById('set-secret').value.trim();
    const tenantId = document.getElementById('set-tenant').value.trim();
    
    const query = "EVALUATE SUMMARIZE(COLUMNSTATISTICS(), [Table Name])";
    
    const requestStr = `[POST] /api/export_dataset/${ws}/${ds}\nHeaders: { "Content-Type": "application/json" }\nBody:\n{\n  "pbi_client_id": "${clientId ? '***' : ''}",\n  "pbi_tenant_id": "${tenantId ? '***' : ''}",\n  "query": "${query}"\n}\n\n⏳ Request sent, waiting for response...`;

    consoleOut.innerText = requestStr;
    setTimeout(() => { consoleOut.scrollTop = Math.max(0, consoleOut.scrollHeight - consoleOut.clientHeight * 0.66); }, 10);
    
    try {
        const payload = { pbi_client_id: clientId, pbi_client_secret: clientSecret, pbi_tenant_id: tenantId, query: query };
        const res = await fetch(`/api/export_dataset/${ws}/${ds}`, {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify(payload)
        });
        
        const data = await res.json();
        if(data.success) {
            const rows = data.results;
            const tables = [];
            rows.forEach(r => {
                const val = r["Table Name"] || r["[Table Name]"];
                if(val && !val.startsWith("LocalDateTable_") && !val.startsWith("DateTableTemplate_")) {
                    tables.push(val);
                }
            });
            
            consoleOut.innerText = requestStr.replace('⏳ Request sent, waiting for response...', '') + 
                `\n✅ Success! Status: 200 OK\nRetrieved ${tables.length} valid tables.\n\nResponse Preview:\n` + JSON.stringify(tables, null, 2);
            setTimeout(() => { consoleOut.scrollTop = Math.max(0, consoleOut.scrollHeight - consoleOut.clientHeight * 0.66); }, 10);
            
            const optionsUl = document.getElementById('wf-ds-table-options');
            const displaySpan = document.getElementById('wf-ds-table-display');
            const triggerDiv = document.getElementById('wf-ds-table-trigger');
            const container = document.getElementById('wf-ds-table-container');
            
            window.selectedDsTables = [];
            optionsUl.innerHTML = '';
            if(tables.length === 0) {
                optionsUl.innerHTML = '<li style="padding: 8px 12px; font-size: 0.85rem; cursor: not-allowed; color: var(--text-secondary);">-- No Tables Found --</li>';
                displaySpan.innerText = '-- No Tables Found --';
                displaySpan.style.color = 'var(--text-secondary)';
                triggerDiv.style.cursor = 'not-allowed';
            } else {
                const selectAllLi = document.createElement('li');
                selectAllLi.style.cssText = 'padding: 8px 12px; font-size: 0.85rem; cursor: pointer; color: var(--text-primary); transition: background 0.15s ease; border-radius: 4px; margin: 0 4px; border-bottom: 1px solid var(--panel-border); font-weight: bold; position: sticky; top: 0; background: var(--dropdown-bg); z-index: 2;';
                selectAllLi.innerHTML = `<label style="display: flex; align-items: center; gap: 8px; cursor: pointer; margin: 0; width: 100%;"><input type="checkbox" id="wf-ds-table-select-all" style="cursor: pointer;"> Select All Tables</label>`;
                
                selectAllLi.querySelector('input').onclick = (e) => {
                    const checked = e.target.checked;
                    const checkboxes = optionsUl.querySelectorAll('.wf-ds-table-cb');
                    checkboxes.forEach(cb => cb.checked = checked);
                    window.updateDsTableDisplay();
                };
                selectAllLi.onclick = (e) => {
                    if (e.target.tagName !== 'INPUT') {
                        const cb = selectAllLi.querySelector('input');
                        cb.checked = !cb.checked;
                        cb.onclick({target: cb});
                    }
                };
                optionsUl.appendChild(selectAllLi);
                
                tables.forEach(t => {
                    const li = document.createElement('li');
                    li.style.cssText = 'padding: 8px 12px; font-size: 0.85rem; cursor: pointer; color: var(--text-primary); transition: background 0.15s ease; border-radius: 4px; margin: 0 4px;';
                    li.innerHTML = `<label style="display: flex; align-items: center; gap: 8px; cursor: pointer; margin: 0; width: 100%;"><input type="checkbox" value="${t.replace(/"/g, '&quot;')}" class="wf-ds-table-cb" style="cursor: pointer;"> ${t}</label>`;
                    li.onmouseover = () => li.style.background = 'var(--overlay-10)';
                    li.onmouseout = () => li.style.background = 'transparent';
                    li.querySelector('input').onclick = (e) => {
                        window.updateDsTableDisplay();
                    };
                    li.onclick = (e) => {
                        if (e.target.tagName !== 'INPUT') {
                            const cb = li.querySelector('input');
                            cb.checked = !cb.checked;
                            window.updateDsTableDisplay();
                        }
                    };
                    optionsUl.appendChild(li);
                });
                
                document.getElementById('wf-ds-export-format').disabled = false;
                document.getElementById('wf-ds-export-format').style.cursor = 'pointer';
                
                // Highlight step 2 UI
                document.getElementById('wf-ds-step-2').classList.add('active');
                document.getElementById('wf-out-ds-step2').innerText = "✅ Step 1 complete. Ready to execute Step 2.";
                container.style.opacity = '1';
                triggerDiv.style.cursor = 'pointer';
                displaySpan.innerText = '-- Select Tables --';
                displaySpan.style.color = 'var(--text-secondary)';
            }
            if (btn) btn.disabled = false;
            return true;
        } else {
            consoleOut.innerText = requestStr.replace('⏳ Request sent, waiting for response...', '') + 
                `\n❌ Failed:\n` + data.message;
            setTimeout(() => { consoleOut.scrollTop = Math.max(0, consoleOut.scrollHeight - consoleOut.clientHeight * 0.66); }, 10);
        }
    } catch(err) {
        consoleOut.innerText = requestStr.replace('⏳ Request sent, waiting for response...', '') + 
            `\n❌ Network Error:\n` + err.message;
            setTimeout(() => { consoleOut.scrollTop = Math.max(0, consoleOut.scrollHeight - consoleOut.clientHeight * 0.66); }, 10);
    }
    if (btn) btn.disabled = false;
    return false;
};

window.executeDatasetStep2 = async function(btn) {
    window.expandConsole('wf-out-ds-step2');
    if (btn) btn.disabled = true;
    const ws = document.getElementById('wf-ds-workspace').value;
    const ds = document.getElementById('wf-ds-dataset').value;
    const selectedTables = window.selectedDsTables || [];
    const exportFormat = document.getElementById('wf-ds-export-format').value;
    const consoleOut = document.getElementById('wf-out-ds-step2');
    const step2Div = document.getElementById('wf-ds-step-2');
    
    if(!ws || !ds || selectedTables.length === 0) {
        consoleOut.innerText = '❌ Error: Please ensure Step 1 is complete and at least one Table is selected.';
        setTimeout(() => { consoleOut.scrollTop = Math.max(0, consoleOut.scrollHeight - consoleOut.clientHeight * 0.66); }, 10);
        if (btn) btn.disabled = false;
        return false;
    }
    
    step2Div.classList.add('active');
    
    const clientId = document.getElementById('set-client').value.trim();
    const clientSecret = document.getElementById('set-secret').value.trim();
    const tenantId = document.getElementById('set-tenant').value.trim();
    
    consoleOut.innerText = `⏳ Starting export of ${selectedTables.length} table(s) as ${exportFormat}...`;
    setTimeout(() => { consoleOut.scrollTop = Math.max(0, consoleOut.scrollHeight - consoleOut.clientHeight * 0.66); }, 10);
    
    let zip = null;
    let wb = null;
    if (exportFormat === 'CSV') {
        zip = new JSZip();
    } else {
        wb = XLSX.utils.book_new();
    }
    
    let successCount = 0;
    
    for (let i = 0; i < selectedTables.length; i++) {
        const tb = selectedTables[i];
        consoleOut.innerText += `\n\n[${i+1}/${selectedTables.length}] ⏳ Fetching table: '${tb}'...`;
        setTimeout(() => { consoleOut.scrollTop = Math.max(0, consoleOut.scrollHeight - consoleOut.clientHeight * 0.66); }, 10);
        
        const query = `EVALUATE '${tb}'`;
        const payload = { pbi_client_id: clientId, pbi_client_secret: clientSecret, pbi_tenant_id: tenantId, query: query };
        
        try {
            const res = await fetch(`/api/export_dataset/${ws}/${ds}`, {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify(payload)
            });
            
            const data = await res.json();
            
            if(data.success) {
                const rows = data.results;
                consoleOut.innerText += `\n✓ Status: 200 OK. Retrieved ${rows.length} rows.`;
        setTimeout(() => { consoleOut.scrollTop = Math.max(0, consoleOut.scrollHeight - consoleOut.clientHeight * 0.66); }, 10);
                
                if(!rows || rows.length === 0) {
                    consoleOut.innerText += `\n⚠️ Table is empty. Skipping...`;
        setTimeout(() => { consoleOut.scrollTop = Math.max(0, consoleOut.scrollHeight - consoleOut.clientHeight * 0.66); }, 10);
                    continue;
                }
                
                const cleanKey = (k) => {
                    const match = k.match(/\[(.*?)\]/);
                    return match ? match[1] : k;
                };
                
                if (exportFormat === 'CSV') {
                    const rawKeys = Object.keys(rows[0]);
                    let csv = rawKeys.map(k => `"${cleanKey(k).replace(/"/g, '""')}"`).join(",") + "\n";
                    rows.forEach(r => {
                        csv += rawKeys.map(k => {
                            let val = r[k];
                            if (val === null || val === undefined) val = '';
                            return `"${String(val).replace(/"/g, '""')}"`;
                        }).join(",") + "\n";
                    });
                    const csvData = new Uint8Array([0xEF, 0xBB, 0xBF, ...new TextEncoder().encode(csv)]);
                    zip.file(`${tb.replace(/[^a-zA-Z0-9_-]/g, '_')}.csv`, csvData);
                    successCount++;
                } else {
                    const cleanRows = rows.map(r => {
                        let newObj = {};
                        Object.keys(r).forEach(k => {
                            newObj[cleanKey(k)] = r[k];
                        });
                        return newObj;
                    });
                    const wsSheet = XLSX.utils.json_to_sheet(cleanRows);
                    let safeName = tb.replace(/[\\/\?\*\[\]\:]/g, '_').substring(0, 31);
                    if (wb.SheetNames.includes(safeName)) {
                        safeName = safeName.substring(0, 27) + '_' + i;
                    }
                    XLSX.utils.book_append_sheet(wb, wsSheet, safeName);
                    successCount++;
                }
                
            } else {
                consoleOut.innerText += `\n❌ Query Failed: ${data.message}`;
        setTimeout(() => { consoleOut.scrollTop = Math.max(0, consoleOut.scrollHeight - consoleOut.clientHeight * 0.66); }, 10);
            }
        } catch(err) {
            consoleOut.innerText += `\n❌ Network Error: ${err.message}`;
        setTimeout(() => { consoleOut.scrollTop = Math.max(0, consoleOut.scrollHeight - consoleOut.clientHeight * 0.66); }, 10);
        }
    }
    
    if (successCount > 0) {
        consoleOut.innerText += `\n\n⏳ Generating final ${exportFormat} file...`;
        setTimeout(() => { consoleOut.scrollTop = Math.max(0, consoleOut.scrollHeight - consoleOut.clientHeight * 0.66); }, 10);
        if (exportFormat === 'CSV') {
            zip.generateAsync({type:"blob"}).then(function(content) {
                const url = URL.createObjectURL(content);
                const a = document.createElement('a');
                a.href = url;
                a.download = `Export_Tables_${ds}.zip`;
                a.click();
                URL.revokeObjectURL(url);
                consoleOut.innerText += `\n✓ Download initiated: ${a.download}`;
        setTimeout(() => { consoleOut.scrollTop = Math.max(0, consoleOut.scrollHeight - consoleOut.clientHeight * 0.66); }, 10);
                if (btn) btn.disabled = false;
            });
            return true; // async generation
        } else {
            XLSX.writeFile(wb, `Export_Tables_${ds}.xlsx`);
            consoleOut.innerText += `\n✓ Download initiated: Export_Tables_${ds}.xlsx`;
        setTimeout(() => { consoleOut.scrollTop = Math.max(0, consoleOut.scrollHeight - consoleOut.clientHeight * 0.66); }, 10);
        }
    } else {
        consoleOut.innerText += `\n\n⚠️ No data was exported.`;
        setTimeout(() => { consoleOut.scrollTop = Math.max(0, consoleOut.scrollHeight - consoleOut.clientHeight * 0.66); }, 10);
    }
    
    if (btn) btn.disabled = false;
    return (successCount > 0);
};

window.executeExportDataset = async function() {
    const step1Btn = document.getElementById('wf-ds-btn-step1');
    const step2Btn = document.getElementById('wf-ds-btn-step2');
    
    if (!window.selectedDsTables || window.selectedDsTables.length === 0) {
        const step1Ok = await window.loadDatasetTablesStep1(step1Btn);
        if (!step1Ok) return;
        
        // Auto-select all tables
        const selectAllCb = document.getElementById('wf-ds-table-select-all');
        if (selectAllCb) {
            selectAllCb.click();
        }
    }
    
    if (window.selectedDsTables && window.selectedDsTables.length > 0) {
        await window.executeDatasetStep2(step2Btn);
    }
};


document.addEventListener('click', function(e) {
    const wrapper = document.getElementById('wf-ds-table-wrapper');
    if (wrapper && !wrapper.contains(e.target)) {
        const options = document.getElementById('wf-ds-table-options');
        const svg = wrapper.querySelector('svg');
        if (options && options.classList.contains('open')) {
            options.classList.remove('open');
            options.style.opacity = '0';
            options.style.visibility = 'hidden';
            options.style.transform = 'translateY(8px)';
            if (svg) svg.style.transform = '';
        }
    }
});

window.toggleDsTableDropdown = function(e) {
    const trigger = document.getElementById('wf-ds-table-trigger');
    if (trigger.style.cursor === 'not-allowed') return;
    const options = document.getElementById('wf-ds-table-options');
    const svg = trigger.querySelector('svg');
    if (options.classList.contains('open')) {
        options.classList.remove('open');
        options.style.opacity = '0';
        options.style.visibility = 'hidden';
        options.style.transform = 'translateY(8px)';
        if (svg) svg.style.transform = '';
    } else {
        options.classList.add('open');
        options.style.opacity = '1';
        options.style.visibility = 'visible';
        options.style.transform = 'translateY(0)';
        if (svg) svg.style.transform = 'rotate(180deg)';
    }
};


window.updateDsTableDisplay = function() {
    const checkboxes = document.querySelectorAll('.wf-ds-table-cb:checked');
    const displaySpan = document.getElementById('wf-ds-table-display');
    const selectAllCb = document.getElementById('wf-ds-table-select-all');
    const allCheckboxes = document.querySelectorAll('.wf-ds-table-cb');
    
    if (selectAllCb) {
        selectAllCb.checked = checkboxes.length === allCheckboxes.length && allCheckboxes.length > 0;
    }
    
    window.selectedDsTables = Array.from(checkboxes).map(cb => cb.value);
    
    if (window.selectedDsTables.length === 0) {
        displaySpan.innerText = '-- Select Tables --';
        displaySpan.style.color = 'var(--text-secondary)';
    } else if (window.selectedDsTables.length === 1) {
        displaySpan.innerText = window.selectedDsTables[0];
        displaySpan.style.color = 'var(--text-primary)';
    } else {
        displaySpan.innerText = `${window.selectedDsTables.length} table(s) selected`;
        displaySpan.style.color = 'var(--text-primary)';
    }
};

window.selectDsTable = function(val, text) {
    document.getElementById('wf-ds-table').value = val;
    const display = document.getElementById('wf-ds-table-display');
    display.innerText = text;
    display.style.color = 'var(--text-primary)';
    
    // Auto close
    const options = document.getElementById('wf-ds-table-options');
    const svg = document.querySelector('#wf-ds-table-trigger svg');
    options.classList.remove('open');
    options.style.opacity = '0';
    options.style.visibility = 'hidden';
    options.style.transform = 'translateY(8px)';
    if (svg) svg.style.transform = '';
};

window.runRvcWorkflow = async function() {
    const reportId = document.getElementById('wf-rvc-report').value;
    const startStr = document.getElementById('wf-rvc-start').value;
    const endStr = document.getElementById('wf-rvc-end').value;
    const statusDiv = document.getElementById('wf-rvc-status');
    const containersDiv = document.getElementById('wf-rvc-containers');
    const logsDiv = document.getElementById('wf-out-rvc-logs');
    const tableDiv = document.getElementById('wf-out-rvc-table');
    
    if(!reportId || !startStr || !endStr) {
        statusDiv.textContent = 'Error: Please select a report and date range.';
        statusDiv.style.color = 'var(--error)';
        return;
    }
    statusDiv.style.color = 'var(--text-secondary)';
    
    let dStart = new Date(startStr);
    let dEnd = new Date(endStr);
    if(dStart > dEnd) {
        statusDiv.textContent = 'Error: Start Date must be before End Date.';
        statusDiv.style.color = 'var(--error)';
        return;
    }
    
    const diffDays = Math.ceil((dEnd - dStart) / (1000 * 60 * 60 * 24));
    if(diffDays > 30) {
        const proceed = await window.showCustomConfirm('Date range is larger than 30 days. This will make many API calls. Continue?');
        if(!proceed) return;
    }

    containersDiv.style.display = 'flex';
    logsDiv.innerHTML = '';
    window.expandConsole('wf-out-rvc-logs'); // 点击 Run 时自动展开
    
    const appendLog = (msg) => {
        const div = document.createElement('div');
        div.textContent = msg;
        logsDiv.appendChild(div);
        setTimeout(() => { logsDiv.scrollTop = Math.max(0, logsDiv.scrollHeight - logsDiv.clientHeight * 0.66); }, 10);
    };

    appendLog(`[INIT] Fetching Activity Events from ${startStr} to ${endStr}...`);
    statusDiv.textContent = `Running analysis...`;
    
    const wrap = document.getElementById('wf-rvc-result-wrap');
    if (wrap) wrap.style.display = 'none';

    let totalViews = 0;
    window._rvcDateStats = {}; // dateIso -> [events...]
    
    window.openRvcResultModal = function() {
        const sortedDates = Object.keys(window._rvcDateStats).sort();
        const data = sortedDates.map(d => {
            const count = window._rvcDateStats[d].length;
            return {
                Date: d,
                "View Count": count
            };
        });
        
        if (data.length === 0) {
            if(window.showNotification) window.showNotification('No activity events found.', 'info');
            return;
        }
        
        if (window.showUniversalDataModal) {
            window.showUniversalDataModal({
                modalId: 'rvc-summary-modal',
                title: 'Activity Events Summary',
                data: data,
                columns: ['Date', 'View Count'],
                cellRenderer: (col, val, row) => {
                    if (col === 'View Count' && val > 0) {
                        return `<span style="cursor: pointer; text-decoration: underline; text-underline-offset: 2px; color: var(--info);" onclick="window.showViewDetails('${row.Date}')">${val}</span>`;
                    }
                    return undefined;
                }
            });
        }
    };

    window.showViewDetails = function(dateIso) {
        const events = window._rvcDateStats[dateIso] || [];
        if (events.length === 0) {
            if (window.showNotification) window.showNotification('No details found', 'info');
            return;
        }

        // Sort events by CreationTime descending by default
        events.sort((a, b) => new Date(b.CreationTime + (b.CreationTime.endsWith('Z') ? '' : 'Z')) - new Date(a.CreationTime + (a.CreationTime.endsWith('Z') ? '' : 'Z')));

        const mappedData = events.map(e => {
            let timeStr = e.CreationTime || '';
            if(timeStr) {
                if(!timeStr.endsWith('Z')) timeStr += 'Z';
                const d = new Date(timeStr);
                d.setUTCHours(d.getUTCHours() + 8); // Shift to UTC+8
                const pad = n => n.toString().padStart(2, '0');
                timeStr = `${d.getUTCFullYear()}-${pad(d.getUTCMonth()+1)}-${pad(d.getUTCDate())} ${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}:${pad(d.getUTCSeconds())}`;
            }
            
            return {
                'Time (UTC+8)': timeStr,
                'User ID': e.UserId || e.UserKey || 'Unknown',
                'Report Name': e.ItemName || 'Unknown Report',
                'Access Route': e.ConsumptionMethod || 'Direct/Unknown',
                'Client IP': e.ClientIP || 'Unknown IP',
                'Status': (e.IsSuccess === true || e.IsSuccess === 'true') ? 'Success' : 'Failed'
            };
        });

        if (window.showUniversalDataModal) {
            window.showUniversalDataModal({
                modalId: `rvc-details-modal`,
                title: `Report View Details (${dateIso})`,
                data: mappedData,
                columns: ['Time (UTC+8)', 'User ID', 'Report Name', 'Access Route', 'Client IP', 'Status'],
                cellRenderer: (col, val) => {
                    if (col === 'Status') {
                        return val === 'Success' 
                            ? `<span style="color: var(--success); font-weight: 500;">Success</span>` 
                            : `<span style="color: var(--error); font-weight: 500;">Failed</span>`;
                    }
                    return undefined;
                }
            });
        }
    };

    

window.toggleRvcLogs = function() {
        const logsDiv = document.getElementById('wf-out-rvc-logs');
        const chevron = document.getElementById('wf-rvc-logs-chevron');
        const copyBtn = document.getElementById('wf-rvc-logs-copybtn');
        if(logsDiv.style.maxHeight === '0px') {
            logsDiv.style.maxHeight = '250px';
            logsDiv.style.padding = '12px 32px 20px 12px'; // Restoring padding (20px bottom as defined in inline style)
            logsDiv.style.borderWidth = '1px';
            logsDiv.style.opacity = '1';
            chevron.style.transform = 'rotate(90deg)';
            copyBtn.style.display = 'block';
        } else {
            logsDiv.style.maxHeight = '0px';
            logsDiv.style.padding = '0px';
            logsDiv.style.borderWidth = '0px';
            logsDiv.style.opacity = '0';
            chevron.style.transform = 'rotate(0deg)';
            copyBtn.style.display = 'none';
        }
    };

    const btn = document.getElementById('btn-run-rvc');
    if (btn) {
        btn.disabled = true;
        btn.innerHTML = 'Running...';
    }
    
    try {
        const datesToProcess = [];
        let currentDate = new Date(dStart);
        while(currentDate <= dEnd) {
            datesToProcess.push(currentDate.toISOString().split('T')[0]);
            currentDate.setDate(currentDate.getDate() + 1);
        }

        appendLog(`[INIT] Starting parallel fetch for ${datesToProcess.length} days...`);

        const processDay = async (dateIso) => {
            appendLog(`[FETCH] Requesting events for ${dateIso}...`);
            const startDateTime = `'${dateIso}T00:00:00Z'`;
            const endDateTime = `'${dateIso}T23:59:59Z'`;
            let url = `/admin/activityevents?startDateTime=${startDateTime}&endDateTime=${endDateTime}`;
            
            let continuationUri = url;
            let pageCount = 1;
            while(continuationUri) {
                let endpoint = continuationUri;
                if(endpoint.startsWith('http')) {
                    try {
                        const u = new URL(endpoint);
                        endpoint = u.pathname + u.search;
                        if(endpoint.startsWith('/v1.0/myorg')) {
                            endpoint = endpoint.substring('/v1.0/myorg'.length);
                        }
                    } catch(e) {
                        console.error('Invalid continuationUri:', endpoint);
                    }
                }
                const res = await fetch('/api/proxy', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ endpoint: endpoint, method: 'GET' })
                });
                
                if(!res.ok) {
                    appendLog(`[ERROR] ${dateIso}: ${res.status} ${res.statusText}`);
                    return;
                }
                
                const resData = await res.json();
                if (resData.success === false) {
                    appendLog(`[ERROR] Proxy Error for ${dateIso}: ${resData.error || resData.message}`);
                    return;
                }
                const payload = resData.data || resData;
                const events = payload.activityEventEntities || [];
                
                let foundToday = 0;
                for(const e of events) {
                    const activity = (e.Activity || '').toLowerCase();
                    const rId = (e.ReportId || e.ItemIdentifier || '').toLowerCase();
                    const targetId = reportId.toLowerCase();
                    
                    if(activity === "viewreport" && rId === targetId) {
                        foundToday++;
                        totalViews++;
                        if(!window._rvcDateStats[dateIso]) window._rvcDateStats[dateIso] = [];
                        window._rvcDateStats[dateIso].push(e);
                    }
                }
                appendLog(`  -> [${dateIso}] Page ${pageCount}: Scanned ${events.length} events, found ${foundToday} target views.`);
                continuationUri = payload.continuationUri || null;
                pageCount++;
                
                if (foundToday > 0 || window._rvcDateStats[dateIso] !== undefined) {
                    const stats = document.getElementById('wf-rvc-stats');
                    if (stats && wrap) {
                        wrap.style.display = 'block';
                        stats.textContent = `Found ${totalViews} views so far...`;
                    }
                }
            }
        };

        // Execute all days in parallel
        await Promise.all(datesToProcess.map(d => processDay(d)));
        
        appendLog(`[DONE] Analysis Complete. Total Views: ${totalViews}`);
        statusDiv.textContent = `Analysis Complete: ${totalViews} total views.`;
        statusDiv.style.color = 'var(--success)';
        
        const stats = document.getElementById('wf-rvc-stats');
        if (wrap && stats) {
            wrap.style.display = 'block';
            stats.textContent = `${totalViews} Views Found`;
        }
        
    } catch (e) {
        appendLog(`[EXCEPTION] ${e.message}`);
        statusDiv.textContent = `Exception: ${e.message}`;
        statusDiv.style.color = 'var(--error)';
    } finally {
        if(btn) {
            btn.disabled = false;
            btn.innerHTML = 'Run Analysis';
        }
    }
};



window.flashCopiedElement = function(element) {
    if (!element) return;
    element.classList.remove('flash-success-anim');
    void element.offsetWidth; // trigger reflow
    element.classList.add('flash-success-anim');
    setTimeout(() => {
        element.classList.remove('flash-success-anim');
    }, 220);
};

window.handleCopyAction = function(targetEl, text, customFlashTarget = null) {
    let copyText = (text !== undefined && text !== null && text !== '') ? text : '';
    
    // 智能提取输入框/文本区域/下拉框的文本或占位符
    if (targetEl) {
        // 如果未传 text 或传进来的是空字符串
        if (!copyText) {
            const container = targetEl.closest('.input-with-copy, .body-editor-container, .endpoint-input, div');
            const input = targetEl.previousElementSibling || container?.querySelector('input, select, textarea');
            if (input) {
                if (input.tagName === 'SELECT') {
                    if (input.options && input.options[input.selectedIndex]) {
                        // 优先复制用户在界面上看到的直观名称文本（例如 "[Cloud] 销售数据集 (生产工作区)"）
                        copyText = input.options[input.selectedIndex].text || input.value;
                    }
                } else {
                    copyText = input.value || input.placeholder || '';
                }
            }
        }
    }
    
    // 强制转换为字符串并清理首尾空行（若依然为空，尝试从触发源附近抓取 placeholder）
    copyText = String(copyText || '');
    if (!copyText && targetEl) {
        const anyInput = targetEl.parentElement?.querySelector('input, textarea');
        if (anyInput && anyInput.placeholder) copyText = anyInput.placeholder;
    }

    // 1. Target Flash (被复制的目标对象高亮闪烁)
    let flashTarget = customFlashTarget || targetEl.closest('.input-with-copy, pre, textarea, .panel, .body-editor-container, .endpoint-input') || targetEl.previousElementSibling;
    if (targetEl.id === 'copy-btn') {
        flashTarget = document.querySelector('.endpoint-input') || document.getElementById('api-endpoint');
    } else if (targetEl.id === 'copy-req-body-btn') {
        flashTarget = document.getElementById('request-body') || document.querySelector('.body-editor-container');
    } else if (targetEl.id === 'copy-res-body-btn') {
        const table = document.querySelector('.response-body table.json-rendered-table, .response-body table');
        const tree = document.getElementById('response-json-tree');
        const raw = document.getElementById('response-output');
        
        if (table && table.offsetWidth > 0) {
            // 表格模式：精准闪烁表格本身（外框）
            flashTarget = table.closest('div[style*="overflow"]') || table;
        } else if (tree && tree.offsetWidth > 0) {
            // 树形模式：闪烁树结构容器
            flashTarget = tree;
        } else if (raw && raw.offsetWidth > 0) {
            // Raw 文本模式：闪烁 <pre>/<code> 框
            flashTarget = raw.parentElement || raw;
        } else {
            flashTarget = document.querySelector('.response-body');
        }
    }
    if (flashTarget) window.flashCopiedElement(flashTarget);
    
    // 2. Button Flash (复制按钮本身闪烁)
    window.flashCopiedElement(targetEl);

    // 3. Icon Checkmark Feedback (图标变绿打钩)
    const svgEl = targetEl.querySelector('svg');
    let origSVG = null;
    let origHTML = null;
    
    if (svgEl) {
        origSVG = svgEl.outerHTML;
        svgEl.outerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--success)" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>';
    } else {
        origHTML = targetEl.innerHTML;
        targetEl.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--success)" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>';
    }
    
    const origColor = targetEl.style.color;
    const origBorder = targetEl.style.borderColor;
    targetEl.style.color = 'var(--success)';
    targetEl.style.borderColor = 'var(--success)';

    const doCopy = () => {
        if (navigator.clipboard) {
            navigator.clipboard.writeText(copyText).catch(e => console.error(e));
        }
        if (window.showNotification) {
            window.showNotification('Copied to clipboard!', 'success');
        }
    };
    doCopy();

    // 快速恢复原状 (350ms 极短间隔)
    setTimeout(() => { 
        if (origSVG) {
            const newSvg = targetEl.querySelector('svg');
            if (newSvg) newSvg.outerHTML = origSVG;
        } else if (origHTML !== null) {
            targetEl.innerHTML = origHTML;
        }
        targetEl.style.color = origColor;
        targetEl.style.borderColor = origBorder;
    }, 350);
};




window.runCheckPermsWorkflow = async function() {
    const logsDiv = document.getElementById('wf-out-perms-logs');
    const tableDiv = document.getElementById('wf-out-perms-table');
    const statusDiv = document.getElementById('wf-perms-status');
    const btn = document.getElementById('btn-run-check-perms');
    
    if (btn) {
        btn.disabled = true;
        btn.innerHTML = 'Running...';
    }
    
    if (logsDiv) {
        logsDiv.innerHTML = '';
        window.expandConsole('wf-out-perms-logs'); // 点击 Run 时自动展开
    }
    
    const appendLog = (msg) => {
        if (!logsDiv) return;
        const div = document.createElement('div');
        div.textContent = msg;
        logsDiv.appendChild(div);
        setTimeout(() => { logsDiv.scrollTop = Math.max(0, logsDiv.scrollHeight - logsDiv.clientHeight * 0.66); }, 10);
    };

    if (statusDiv) {
        statusDiv.textContent = `Fetching /availableFeatures...`;
        statusDiv.style.color = 'var(--text-secondary)';
    }
    appendLog(`[INIT] Calling GET /v1.0/myorg/availableFeatures ...`);
    
    try {
        const res = await fetch('/api/proxy', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ endpoint: '/availableFeatures', method: 'GET' })
        });
        
        if(!res.ok) {
            if (statusDiv) {
                statusDiv.textContent = `Error: ${res.status} ${res.statusText}`;
                statusDiv.style.color = 'var(--error)';
            }
            appendLog(`[ERROR] Failed to fetch: ${res.status} ${res.statusText}`);
            if (btn) {
                btn.disabled = false;
                btn.innerHTML = 'Run Check';
            }
            return;
        }
        
        const data = await res.json();
        const payload = data.data || data;
        const featuresArray = payload.features;
        
        if (featuresArray && Array.isArray(featuresArray)) {
            appendLog(`[SUCCESS] Loaded ${featuresArray.length} features. Ready for table view.`);
            
            // Save data globally for the modal
            window._lastPermsData = featuresArray;
            
            // Show the result wrapper with the 'Click to expand' button
            const wrap = document.getElementById('wf-perms-result-wrap');
            if (wrap) wrap.style.display = 'block';
            
            const stats = document.getElementById('wf-perms-stats');
            if (stats) stats.textContent = featuresArray.length + ' Features';
            
        } else {
            appendLog(`[WARN] No features array found. Raw response below:\n` + JSON.stringify(data, null, 2));
            if (statusDiv) {
                statusDiv.textContent = `Loaded JSON format (No features array found).`;
                statusDiv.style.color = 'var(--warning)';
            }
        }
        
    } catch (e) {
        appendLog(`[EXCEPTION] ${e.message}`);
        if (statusDiv) {
            statusDiv.textContent = `Exception: ${e.message}`;
            statusDiv.style.color = 'var(--error)';
        }
    } finally {
        if (btn) {
            btn.disabled = false;
            btn.innerHTML = 'Run Check';
        }
    }
};

window.openPermsResultModal = function() {
    const data = window._lastPermsData || [];
    if (!data || data.length === 0) {
        if(window.showNotification) window.showNotification('No permissions data found. Run check first.', 'info');
        return;
    }
    
    const formattedData = data.map(f => ({
        'Feature Name': f.name || 'Unknown',
        'State': f.state || 'N/A',
        'Extended State': f.extendedState || 'N/A'
    }));
    
    if (window.showUniversalDataModal) {
        window.showUniversalDataModal({
            title: 'Permissions & Features',
            data: formattedData,
            columns: ['Feature Name', 'State', 'Extended State'],
            enableSearch: true,
            enableColumnFilter: true,
            cellRenderer: (col, val, row) => {
                if (col === 'State') {
                    if (val === 'Enabled') return `<span style="color:var(--success);font-weight:500;">Enabled</span>`;
                    if (val === 'Disabled') return `<span style="color:var(--error);font-weight:500;">Disabled</span>`;
                }
                return undefined;
            }
        });
    } else {
        console.error("Universal modal script not loaded.");
    }
};

// ==================== TABLE SORTING ====================
window.tableSortStates = {};

window.sortTable = function(thElement, event, colIndex) {
    try {
        if (event && event.shiftKey) {
            window.getSelection()?.removeAllRanges();
        }
        
        const table = thElement.closest('table');
        if (!table) return;
        
        const tbody = table.querySelector('tbody');
        if (!tbody) return;
        
        // Dynamically assign a unique table ID if missing
        if (!table.hasAttribute('data-table-id')) {
            table.setAttribute('data-table-id', 'table_' + Math.random().toString(36).substr(2, 9));
        }
        const tableId = table.getAttribute('data-table-id');
        const headers = Array.from(table.querySelectorAll('th'));
        
        if (!window.tableSortStates) window.tableSortStates = {};
        if (!window.tableSortStates[tableId]) window.tableSortStates[tableId] = [];
        
        let sorts = window.tableSortStates[tableId];
        let existingIdx = sorts.findIndex(s => s.colIndex === colIndex);
        
        if (!event || !event.shiftKey) {
            if (existingIdx >= 0) {
                const currentDir = sorts[existingIdx].dir;
                sorts = [{ colIndex: colIndex, dir: currentDir === 'asc' ? 'desc' : 'asc' }];
            } else {
                sorts = [{ colIndex: colIndex, dir: 'asc' }];
            }
        } else {
            if (existingIdx >= 0) {
                sorts[existingIdx].dir = sorts[existingIdx].dir === 'asc' ? 'desc' : 'asc';
            } else {
                sorts.push({ colIndex: colIndex, dir: 'asc' });
            }
        }
        window.tableSortStates[tableId] = sorts;
        
        headers.forEach((th, idx) => {
            let targetNode = th.querySelector('span:not(.col-resizer)');
            if (!targetNode) targetNode = th;
            
            let text = targetNode.getAttribute('data-original-text');
            if (!text) {
                text = targetNode.textContent.replace(/\s*[\u25B2\u25BC][\d]*$/, '').trim();
                targetNode.setAttribute('data-original-text', text);
            }
            
            let sortInfo = sorts.findIndex(s => s.colIndex === idx);
            if (sortInfo >= 0) {
                let s = sorts[sortInfo];
                let arrow = s.dir === 'asc' ? '\u25B2' : '\u25BC';
                let priority = sorts.length > 1 ? (sortInfo + 1) : '';
                targetNode.textContent = `${text} ${arrow}${priority}`;
                targetNode.style.color = 'var(--accent)';
            } else {
                targetNode.textContent = text;
                targetNode.style.color = '';
            }
        });
        
        let rows = Array.from(tbody.querySelectorAll('tr'));
        rows.sort((a, b) => {
            for (let s of sorts) {
                let tdA = a.children[s.colIndex];
                let tdB = b.children[s.colIndex];
                if (!tdA || !tdB) continue;
                
                let cellA = (tdA.textContent || '').trim();
                let cellB = (tdB.textContent || '').trim();
                
                let numA = parseFloat(cellA);
                let numB = parseFloat(cellB);
                
                let cmp = 0;
                const isNumA = !isNaN(numA) && numA.toString() === cellA;
                const isNumB = !isNaN(numB) && numB.toString() === cellB;
                
                if (isNumA && isNumB) {
                    cmp = numA - numB;
                } else {
                    cmp = cellA.localeCompare(cellB, undefined, {numeric: true, sensitivity: 'base'});
                }
                
                if (cmp !== 0) {
                    return s.dir === 'asc' ? cmp : -cmp;
                }
            }
            return 0;
        });
        
        const parent = tbody.parentNode;
        const nextSibling = tbody.nextSibling;
        parent.removeChild(tbody);
        rows.forEach(r => tbody.appendChild(r));
        if (nextSibling) {
            parent.insertBefore(tbody, nextSibling);
        } else {
            parent.appendChild(tbody);
        }
        
    } catch (err) {
        console.error("Sorting failed:", err);
    }
};

// --- Global User Manager Logic ---
window.gumData = [];
window.gumWorkspaces = [];

window.runGlobalUserManager = async function() {
    const logsDiv = document.getElementById('wf-out-gum-logs');
    const tableDiv = document.getElementById('wf-out-gum-table');
    const statsSpan = document.getElementById('wf-gum-stats');
    
    if (logsDiv) {
        logsDiv.innerHTML = '';
        window.expandConsole('wf-out-gum-logs'); // 点击 Run 时自动展开（只展开，不折叠）
    }
    if (tableDiv) tableDiv.innerHTML = 'Scanning workspaces...';
    if (statsSpan) statsSpan.textContent = '';
    window.gumData = [];
    window.gumWorkspaces = [];

    
    const appendLog = (msg) => {
        const div = document.createElement('div');
        div.style.marginBottom = '2px';
        div.style.paddingLeft = '10px';
        div.style.borderLeft = '2px solid var(--accent)';
        div.textContent = msg;
        logsDiv.appendChild(div);
        logsDiv.scrollTop = Math.max(0, logsDiv.scrollHeight - logsDiv.clientHeight * 0.66);
    };

    try {
        const isAdminMode = document.getElementById('gum-admin-mode')?.checked;
        
        appendLog(`[1] Fetching workspaces (${isAdminMode ? 'Admin Mode: All Workspaces' : 'Standard Mode: Assigned Only'})...`);
        
        const wsEndpoint = isAdminMode ? '/admin/groups?$top=5000&$expand=users' : '/groups?$top=100';
        
        const wsRes = await fetch('/api/proxy', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ endpoint: wsEndpoint, method: 'GET' })
        });
        
        const wsData = await wsRes.json();
        
        if (!wsRes.ok || (wsData && wsData.success === false)) {
            const errDetail = (wsData && (wsData.error || wsData.message)) ? (wsData.error || wsData.message) : wsRes.statusText;
            if (isAdminMode) {
                appendLog(`[ERROR] Admin Scan failed: ${errDetail}. Ensure Service Principal has Tenant.Read.All and is enabled in Power BI Admin Portal.`);
            } else {
                appendLog(`[ERROR] Fetch Workspaces failed: ${errDetail}`);
            }
            return;
        }
        
        const wsPayload = wsData.data || wsData;
        const workspaces = Array.isArray(wsPayload) ? wsPayload : (wsPayload.value || []);
        window.gumWorkspaces = workspaces;
        appendLog(`[OK] Found ${workspaces.length} workspaces. Starting user processing...`);

        
        let processed = 0;
        let totalUsers = 0;
        
        if (isAdminMode) {
            // In Admin mode, $expand=users provides all users immediately! No need to loop requests.
            appendLog(`[2] Extracting users from Admin API response (Instant Mode)...`);
            for (const ws of workspaces) {
                const users = ws.users || [];
                for (const u of users) {
                    window.gumData.push({
                        wsId: ws.id,
                        wsName: ws.name,
                        identifier: u.identifier,
                        principalType: u.principalType,
                        role: u.groupUserAccessRight
                    });
                    totalUsers++;
                }
            }
        } else {
            // Standard mode requires looping over each workspace
            for (const ws of workspaces) {
                processed++;
                appendLog(`[${processed}/${workspaces.length}] Scanning users for: ${ws.name}`);
                try {
                    const uRes = await fetch('/api/proxy', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ endpoint: `/groups/${ws.id}/users`, method: 'GET' })
                    });
                    if (uRes.ok) {
                        const uData = await uRes.json();
                        const uPayload = uData.data || uData;
                        const users = uPayload.value || [];
                        for (const u of users) {
                            window.gumData.push({
                                wsId: ws.id,
                                wsName: ws.name,
                                identifier: u.identifier,
                                principalType: u.principalType,
                                role: u.groupUserAccessRight
                            });
                            totalUsers++;
                        }
                    } else {
                        appendLog(`   -> Failed: HTTP ${uRes.status}`);
                    }
                } catch (err) {
                    appendLog(`   -> Error: ${err.message}`);
                }
                // Add a slight delay to avoid rate limiting
                await new Promise(r => setTimeout(r, 100));
            }
        }
        
        appendLog(`\n[DONE] Scan complete! Found ${totalUsers} user permission records across ${workspaces.length} workspaces.`);
        window.filterGumTable();
        
    } catch (e) {
        appendLog(`[EXCEPTION] ${e.message || e}`);
    }
};

window.filterGumTable = function() {
    const term = (document.getElementById('wf-gum-search').value || '').toLowerCase();
    const statsSpan = document.getElementById('wf-gum-stats');
    const resultWrap = document.getElementById('wf-gum-result-wrap');
    
    const filtered = (window.gumData || []).filter(d => 
        (d.wsName || '').toLowerCase().includes(term) ||
        (d.identifier || '').toLowerCase().includes(term) ||
        (d.role || '').toLowerCase().includes(term) ||
        (d.principalType || '').toLowerCase().includes(term)
    );
    
    window._lastGumFiltered = filtered;
    if (statsSpan) statsSpan.textContent = `${filtered.length} records`;
    if (resultWrap) resultWrap.style.display = 'block';
    
    // If modal is currently open, refresh it live
    if (document.getElementById('gum-result-expand-overlay')) {
        window.renderGumModalTable();
    }
};

window.openGumResultModal = function() {
    const data = window._lastGumFiltered || window.gumData || [];
    if (!data || data.length === 0) {
        window.showNotification('No permissions records to display. Run scan first.', 'info');
        return;
    }

    const mappedData = data.map(d => ({
        'Workspace': d.wsName,
        'User / Principal': d.identifier,
        'Type': d.principalType,
        'Role': d.role,
        'Actions': '', // placeholder
        
        _wsId: d.wsId,
        _identifier: d.identifier
    }));

    if (window.showUniversalDataModal) {
        window.showUniversalDataModal({
            title: 'Global Workspace Permissions',
            data: mappedData,
            columns: ['Workspace', 'User / Principal', 'Type', 'Role', 'Actions'],
            cellRenderer: (col, val, row) => {
                if (col === 'Type') {
                    return '<span style="padding:2px 6px;border-radius:4px;background:var(--overlay-10);font-size:0.75rem;">' + val + '</span>';
                }
                if (col === 'Role') {
                    return '<span style="font-weight:bold;color:var(--accent);">' + val + '</span>';
                }
                if (col === 'Actions') {
                    return '<button class="btn-action-danger" style="padding: 2px 6px; font-size: 0.7rem;" onclick="if(window.removeGumUser) window.removeGumUser(\'' + row._wsId + '\', \'' + row._identifier + '\')">Remove</button>';
                }
                return undefined;
            }
        });
    }
};
window.editGumUser = function(wsId, wsName, identifier, principalType, currentRole) {
    document.getElementById('gum-edit-ws-id').value = wsId;
    document.getElementById('gum-edit-ws-name').value = wsName;
    document.getElementById('gum-edit-identifier').value = identifier;
    document.getElementById('gum-edit-principal-type').value = principalType;
    document.getElementById('gum-edit-role').value = currentRole;
    document.getElementById('gum-edit-modal').style.display = 'flex';
};

window.submitGumEdit = async function() {
    const wsId = document.getElementById('gum-edit-ws-id').value;
    const identifier = document.getElementById('gum-edit-identifier').value;
    const principalType = document.getElementById('gum-edit-principal-type').value;
    const newRole = document.getElementById('gum-edit-role').value;
    const logsDiv = document.getElementById('wf-out-gum-logs');
    
    document.getElementById('gum-edit-modal').style.display = 'none';
    
    // Log the action
    const div = document.createElement('div');
    div.style.paddingLeft = '10px';
    div.style.borderLeft = '2px solid var(--warning)';
    div.textContent = `[UPDATE] Changing role of ${identifier} to ${newRole} ...`;
    logsDiv.appendChild(div);
    
    try {
        const body = {
            identifier: identifier,
            groupUserAccessRight: newRole,
            principalType: principalType
        };
        
        const res = await fetch('/api/proxy', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ endpoint: `/groups/${wsId}/users`, method: 'PUT', body: body })
        });
        
        if (res.ok) {
            div.textContent += " OK (Updated)";
            div.style.borderLeft = '2px solid var(--success)';
            // Update local state and re-render
            const rec = window.gumData.find(d => d.wsId === wsId && d.identifier === identifier);
            if(rec) rec.role = newRole;
            window.filterGumTable();
        } else {
            const errJson = await res.json().catch(()=>({}));
            div.textContent += ` FAILED: ${res.status} ${JSON.stringify(errJson)}`;
            div.style.borderLeft = '2px solid var(--error)';
        }
    } catch(err) {
        div.textContent += ` EXCEPTION: ${err.message}`;
        div.style.borderLeft = '2px solid var(--error)';
    }
    logsDiv.scrollTop = Math.max(0, logsDiv.scrollHeight - logsDiv.clientHeight * 0.66);
};

window.deleteGumUser = async function(wsId, identifier, wsName) {
    const proceed = await window.showCustomConfirm(`Are you sure you want to completely REMOVE access for:\n${identifier}\nfrom workspace [${wsName}]?`);
    if (!proceed) return;
    
    const logsDiv = document.getElementById('wf-out-gum-logs');
    
    const div = document.createElement('div');
    div.style.paddingLeft = '10px';
    div.style.borderLeft = '2px solid var(--error)';
    div.textContent = `[DELETE] Removing ${identifier} from ${wsName} ...`;
    logsDiv.appendChild(div);
    
    try {
        const res = await fetch('/api/proxy', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ endpoint: `/groups/${wsId}/users/${encodeURIComponent(identifier)}`, method: 'DELETE' })
        });
        
        if (res.ok) {
            div.textContent += " OK (Removed)";
            // Remove from local state
            window.gumData = window.gumData.filter(d => !(d.wsId === wsId && d.identifier === identifier));
            window.filterGumTable();
        } else {
            div.textContent += ` FAILED: ${res.status}`;
        }
    } catch(err) {
        div.textContent += ` EXCEPTION: ${err.message}`;
    }
    logsDiv.scrollTop = Math.max(0, logsDiv.scrollHeight - logsDiv.clientHeight * 0.66);
};

window.openGumAddUserModal = function() {
    const sel = document.getElementById('gum-add-ws-id');
    sel.innerHTML = '<option value="">Select a Workspace...</option>';
    
    if (!window.gumWorkspaces || window.gumWorkspaces.length === 0) {
        alert('Please run the "Scan" first to populate the workspaces list!');
        return;
    }
    
    // Populate workspaces sorted by name
    const wses = [...window.gumWorkspaces].sort((a,b) => (a.name||'').localeCompare(b.name||''));
    for(const ws of wses) {
        const opt = document.createElement('option');
        opt.value = ws.id;
        opt.textContent = ws.name;
        sel.appendChild(opt);
    }
    
    document.getElementById('gum-add-identifier').value = '';
    document.getElementById('gum-add-role').value = 'Viewer';
    document.getElementById('gum-add-modal').style.display = 'flex';
};

window.submitGumAddUser = async function() {
    const wsId = document.getElementById('gum-add-ws-id').value;
    const identifier = document.getElementById('gum-add-identifier').value.trim();
    const principalType = document.getElementById('gum-add-principal-type').value;
    const newRole = document.getElementById('gum-add-role').value;
    
    if(!wsId) { alert('Please select a workspace!'); return; }
    if(!identifier) { alert('Please enter an email/identifier!'); return; }
    
    document.getElementById('gum-add-modal').style.display = 'none';
    
    const logsDiv = document.getElementById('wf-out-gum-logs');
    window.expandConsole('wf-out-gum-logs'); // ensure logs are visible
    
    const div = document.createElement('div');
    div.style.paddingLeft = '10px';
    div.style.borderLeft = '2px solid var(--accent)';
    div.textContent = `[ADD] Adding ${identifier} to workspace [${wsId}] as ${newRole}...`;
    logsDiv.appendChild(div);
    
    try {
        const body = {
            identifier: identifier,
            groupUserAccessRight: newRole,
            principalType: principalType
        };
        
        // Use POST to add a user
        const res = await fetch('/api/proxy', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ endpoint: `/groups/${wsId}/users`, method: 'POST', body: body })
        });
        
        if (res.ok) {
            div.textContent += " OK (Added)";
            div.style.borderLeft = '2px solid var(--success)';
            
            // Re-fetch that specific workspace's users to update the table immediately!
            try {
                const uRes = await fetch('/api/proxy', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ endpoint: `/groups/${wsId}/users`, method: 'GET' })
                });
                if(uRes.ok) {
                    const uData = await uRes.json();
                    const uPayload = uData.data || uData;
                    const users = uPayload.value || [];
                    
                    // Remove old records for this workspace
                    window.gumData = window.gumData.filter(d => d.wsId !== wsId);
                    
                    // Add fresh records
                    const wsName = window.gumWorkspaces.find(w => w.id === wsId)?.name || 'Unknown';
                    for(const u of users) {
                        window.gumData.push({
                            wsId: wsId,
                            wsName: wsName,
                            identifier: u.identifier,
                            principalType: u.principalType,
                            role: u.groupUserAccessRight
                        });
                    }
                    window.filterGumTable();
                }
            } catch(e) {}
            
        } else {
            const errJson = await res.json().catch(()=>({}));
            div.textContent += ` FAILED: ${res.status} ${JSON.stringify(errJson)}`;
            div.style.borderLeft = '2px solid var(--error)';
        }
    } catch(err) {
        div.textContent += ` EXCEPTION: ${err.message}`;
        div.style.borderLeft = '2px solid var(--error)';
    }
    setTimeout(() => { logsDiv.scrollTop = Math.max(0, logsDiv.scrollHeight - logsDiv.clientHeight * 0.66); }, 50);
};

window.gumAutocompleteTimer = null;
window.handleGumAddIdentifierInput = function(e) {
    const val = e.target.value.trim();
    const dropdown = document.getElementById('gum-add-autocomplete');
    
    if (val.length < 2) {
        dropdown.style.display = 'none';
        return;
    }
    
    if (window.gumAutocompleteTimer) clearTimeout(window.gumAutocompleteTimer);
    
    window.gumAutocompleteTimer = setTimeout(async () => {
        dropdown.innerHTML = '<div style="padding: 8px; font-size: 0.8rem; color: var(--text-secondary);">Searching...</div>';
        dropdown.style.display = 'block';
        
        try {
            const res = await fetch(`/api/graph_users?query=${encodeURIComponent(val)}`);
            const data = await res.json();
            
            if (data.success && data.users && data.users.length > 0) {
                dropdown.innerHTML = '';
                for (const u of data.users) {
                    const div = document.createElement('div');
                    div.style.padding = '8px';
                    div.style.borderBottom = '1px solid var(--overlay-10)';
                    div.style.cursor = 'pointer';
                    div.style.fontSize = '0.8rem';
                    div.innerHTML = `<strong>${u.displayName}</strong> <span style="color: var(--text-secondary); font-size: 0.75rem;">(${u.userPrincipalName})</span>`;
                    div.onmouseover = () => div.style.background = 'var(--overlay-10)';
                    div.onmouseout = () => div.style.background = 'transparent';
                    div.onclick = () => {
                        document.getElementById('gum-add-identifier').value = u.userPrincipalName;
                        dropdown.style.display = 'none';
                    };
                    dropdown.appendChild(div);
                }
            } else if (data.success) {
                dropdown.innerHTML = '<div style="padding: 8px; font-size: 0.8rem; color: var(--text-secondary);">No matching users found</div>';
            } else {
                dropdown.innerHTML = `<div style="padding: 8px; font-size: 0.8rem; color: var(--error);">Error: ${data.error || 'Check Graph API permissions'}</div>`;
            }
        } catch(err) {
            dropdown.innerHTML = `<div style="padding: 8px; font-size: 0.8rem; color: var(--error);">Network Error</div>`;
        }
    }, 500); // 500ms debounce
};

// Close autocomplete when clicking outside
document.addEventListener('click', function(e) {
    const ac = document.getElementById('gum-add-autocomplete');
    const input = document.getElementById('gum-add-identifier');
    if (ac && input && !ac.contains(e.target) && e.target !== input) {
        ac.style.display = 'none';
    }
});

window.scanLocalPBI = async function(btn) {
    if(btn.disabled) return;
    btn.disabled = true;
    const oldText = btn.textContent;
    btn.textContent = 'Scanning...';
    const select = document.getElementById('wf-local-instance');
    
    try {
        const res = await fetch('/api/local_pbi/scan');
        const data = await res.json();
        
        select.innerHTML = '';
        if(data.instances && data.instances.length > 0) {
            window.localPBIInstances = data.instances;
            data.instances.forEach(inst => {
                const opt = document.createElement('option');
                opt.value = inst.port;
                opt.textContent = `Port: ${inst.port} | DB: ${inst.database}`;
                select.appendChild(opt);
            });
            document.getElementById('wf-local-btn-run').disabled = false;
        } else {
            select.innerHTML = '<option value="">No local PBI instances found</option>';
            document.getElementById('wf-local-btn-run').disabled = true;
        }
    } catch(e) {
        alert("Error scanning local instances: " + e);
    }
    btn.disabled = false;
    btn.textContent = oldText;
};

window.runLocalDAX = async function(btn) {
    if(btn.disabled) return;
    const port = document.getElementById('wf-local-instance').value;
    const query = document.getElementById('wf-local-dax-query').value.trim();
    if(!port || !query) {
        alert("Please scan for instances and enter a query.");
        return;
    }
    
    btn.disabled = true;
    const oldText = btn.textContent;
    btn.textContent = 'Executing...';
    
    const logsDiv = document.getElementById('wf-out-local');
    const tableDiv = document.getElementById('wf-out-local-table');
    window.expandConsole('wf-out-local');
    
    const appendLog = (msg) => {
        logsDiv.innerHTML += `<div>${msg}</div>`;
        logsDiv.scrollTop = logsDiv.scrollHeight;
    };
    
    logsDiv.innerHTML = '';
    tableDiv.innerHTML = '';
    appendLog(`[INIT] Running DAX on localhost:${port}...`);
    
    try {
        const res = await fetch('/api/local_pbi/query', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({port: port, query: query})
        });
        const data = await res.json();
        
        if(data.error) {
            appendLog(`<span style="color:var(--error)">[ERROR] ${data.error}</span>`);
        } else if(data.columns && data.rows) {
            appendLog(`[SUCCESS] Returned ${data.rows.length} rows, ${data.columns.length} columns.`);
            
            // Render table
            window.renderJsonViewer(data.rows, tableDiv, "DAX Result");
        } else {
            appendLog(`[INFO] Query executed successfully, but no standard resultset returned.`);
        }
    } catch(e) {
        appendLog(`<span style="color:var(--error)">[ERROR] ${e.message}</span>`);
    }
    
    btn.disabled = false;
    btn.textContent = oldText;
};

// Local & Cloud Model DAX Diagnostics Logic
window.fetchLocalModelInstances = async function() {
    const sel = document.getElementById('local-model-instance');
    const err = document.getElementById('local-model-instance-error');
    const refreshBtn = document.getElementById('wf-local-instance-refresh-btn');
    if(!sel) return;
    
    if (err) err.style.display = 'none';
    if (refreshBtn) refreshBtn.classList.add('spinning');
    
    // 1. 获取并格式化云端数据（从 LocalStorage、上下文或 Workspace 列表中提取）
    const renderDropdown = (localInstances = null) => {
        const prevSelected = sel.value;
        sel.innerHTML = '';
        
        // ── 分组 1: 本地 Power BI Desktop 实例 ──
        const localGroup = document.createElement('optgroup');
        localGroup.label = "💻 Local Power BI Desktop Instances";
        
        if (localInstances === null) {
            const scanningOpt = document.createElement('option');
            scanningOpt.value = "";
            scanningOpt.disabled = true;
            scanningOpt.textContent = "⏳ Scanning local instances...";
            localGroup.appendChild(scanningOpt);
        } else if (Array.isArray(localInstances) && localInstances.length > 0) {
            localInstances.forEach(inst => {
                const opt = document.createElement('option');
                opt.value = `local:${inst.port}`;
                opt.textContent = `[Local] ${inst.name || 'PBI Desktop'} (Port: ${inst.port})`;
                localGroup.appendChild(opt);
            });
        } else {
            const emptyOpt = document.createElement('option');
            emptyOpt.value = "";
            emptyOpt.disabled = true;
            emptyOpt.textContent = "No local PBI Desktop instances detected";
            localGroup.appendChild(emptyOpt);
        }
        sel.appendChild(localGroup);
        
        // ── 分组 2: 云端 Power BI 数据集 (XMLA / REST) ──
        const cloudGroup = document.createElement('optgroup');
        cloudGroup.label = "☁️ Power BI Cloud Datasets (XMLA / REST)";
        
        let workspaces = [];
        let datasets = [];
        try { workspaces = window.getListData ? window.getListData('workspace-list') : []; } catch(e) {}
        if (!workspaces.length) {
            try { workspaces = JSON.parse(localStorage.getItem('pbi_workspaces') || '[]'); } catch(e) {}
        }
        try { datasets = window.getListData ? window.getListData('dataset-list') : []; } catch(e) {}
        if (!datasets.length) {
            try { datasets = JSON.parse(localStorage.getItem('pbi_datasets') || '[]'); } catch(e) {}
        }
        
        // 兜底：如果 Toolbar 上有当前活跃的 Workspace/Dataset
        const activeWs = document.getElementById('active-workspace')?.value || '';
        const activeDs = document.getElementById('active-dataset')?.value || '';
        const activeWsName = document.getElementById('trigger-workspace')?.querySelector('.cs-name')?.textContent || 'Current Workspace';
        const activeDsName = document.getElementById('trigger-dataset')?.querySelector('.cs-name')?.textContent || 'Current Dataset';
        
        let cloudCount = 0;
        const addedKeys = new Set();
        
        // 注入当前活跃选择项
        if (activeDs && activeDs !== '-- None --') {
            const opt = document.createElement('option');
            opt.value = `cloud:${activeWs}:${activeDs}`;
            opt.textContent = `[Cloud] ${activeDsName} (${activeWsName})`;
            cloudGroup.appendChild(opt);
            addedKeys.add(`${activeWs}:${activeDs}`);
            cloudCount++;
        }
        
        if (Array.isArray(datasets) && datasets.length > 0) {
            datasets.forEach(ds => {
                const dsId = ds.id || ds.guid || '';
                const dsName = ds.alias || ds.name || dsId;
                if (!dsId || addedKeys.has(`${activeWs}:${dsId}`)) return;
                
                const wsId = ds.workspaceId || ds.groupId || activeWs || (workspaces[0] ? (workspaces[0].id || workspaces[0].guid) : '');
                const wsObj = workspaces.find(w => (w.id === wsId || w.guid === wsId));
                const wsName = wsObj ? (wsObj.alias || wsObj.name || 'Workspace') : (activeWsName || 'Workspace');
                
                const opt = document.createElement('option');
                opt.value = `cloud:${wsId}:${dsId}`;
                opt.textContent = `[Cloud] ${dsName} (${wsName})`;
                cloudGroup.appendChild(opt);
                addedKeys.add(`${wsId}:${dsId}`);
                cloudCount++;
            });
        }
        
        if (cloudCount === 0) {
            const emptyCloud = document.createElement('option');
            emptyCloud.value = "";
            emptyCloud.disabled = true;
            emptyCloud.textContent = "No cloud datasets found (Select workspace/dataset in top bar)";
            cloudGroup.appendChild(emptyCloud);
        }
        sel.appendChild(cloudGroup);
        
        // 恢复之前选中的值或选中首个有效项
        if (prevSelected && sel.querySelector(`option[value="${prevSelected}"]`)) {
            sel.value = prevSelected;
        } else {
            const firstValid = sel.querySelector('option:not([disabled])');
            if (firstValid) sel.value = firstValid.value;
        }
    };

    // 立即秒级同步呈现云端模型，消除任何等待
    renderDropdown(null);
    
    // 异步后台探测本地 PBI 实例（带 8 秒超时，适配 ADOMD 与 PowerShell 进程探测）
    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 8000);
        
        const res = await fetch('/api/local-model/instances', { 
            method: 'POST',
            signal: controller.signal 
        });
        clearTimeout(timeoutId);
        
        if (res.ok) {
            const json = await res.json();
            renderDropdown(json.success && Array.isArray(json.instances) ? json.instances : []);
        } else {
            renderDropdown([]);
        }
    } catch (e) {
        renderDropdown([]);
    } finally {
        if (refreshBtn) {
            setTimeout(() => refreshBtn.classList.remove('spinning'), 300);
        }
    }
};

window.updateLocalDaxTemplate = function() {
    const sel = document.getElementById('local-dax-template');
    const editor = document.getElementById('local-dax-editor');
    if (!sel || !editor) return;
    
    const val = sel.value;
    if (val === 'tables') {
        editor.value = "EVALUATE INFO.TABLES()";
    } else if (val === 'measures') {
        editor.value = "EVALUATE INFO.MEASURES()";
    } else if (val === 'columns') {
        editor.value = "EVALUATE INFO.COLUMNS()";
    } else if (val === 'partitions') {
        editor.value = "EVALUATE INFO.PARTITIONS()";
    } else if (val === 'custom') {
        if (!editor.value) {
            editor.value = "EVALUATE\n    TOPN(10, 'Sales')";
        }
    }
};

window.runLocalModelWorkflow = async function() {
    const out = document.getElementById('wf-local-status');
    const resultWrap = document.getElementById('wf-local-result-wrap');
    const resultDiv = document.getElementById('wf-local-result');
    const statsSpan = document.getElementById('wf-local-result-stats');
    const editor = document.getElementById('local-dax-editor');
    const instSel = document.getElementById('local-model-instance');

    if (!editor || !editor.value.trim()) {
        window.showNotification('Please enter a DAX query', 'error');
        if (out) {
            out.style.display = 'block';
            out.textContent = '❌ Please enter a DAX query before running.';
            out.style.color = 'var(--error)';
        }
        return;
    }

    const targetVal = instSel ? instSel.value : '';
    if (!targetVal) {
        window.showNotification('Please select a Target Model Instance', 'error');
        if (out) {
            out.style.display = 'block';
            out.textContent = '❌ Please select a Target Model Instance first.';
            out.style.color = 'var(--error)';
        }
        return;
    }

    let payload = { query: editor.value };
    if (targetVal.startsWith('cloud:')) {
        const parts = targetVal.split(':');
        payload.workspace_id = parts[1] || document.getElementById('active-workspace')?.value || '';
        payload.dataset_id = parts[2] || document.getElementById('active-dataset')?.value || '';
    } else if (targetVal.startsWith('local:')) {
        payload.port = parseInt(targetVal.split(':')[1]);
    } else if (!isNaN(parseInt(targetVal))) {
        payload.port = parseInt(targetVal);
    }

    if (out) {
        out.style.display = 'block';
        out.textContent = targetVal.startsWith('cloud:') ? 'Executing DAX against Cloud Model (Trying XMLA Endpoint -> Silent REST Fallback)...' : 'Executing DAX query against local model...';
        out.style.color = 'var(--text-secondary)';
    }
    if (resultWrap) resultWrap.style.display = 'none';
    if (resultDiv) resultDiv.innerHTML = '';
    if (statsSpan) statsSpan.textContent = '';

    try {
        const res = await fetch('/api/local-model/dax', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        const json = await res.json();

        if (json.success) {
            const data = json.data;

            // Empty result
            if (!data || (Array.isArray(data) && data.length === 0)) {
                if (out) {
                    out.textContent = '✅ Query executed — no rows returned.';
                    out.style.color = 'var(--success)';
                }
                return;
            }

            // Normalise to array
            const rows = Array.isArray(data) ? data : [data];

            // Collect columns and clean bracket-prefixed names from DAX INFO.* functions
            const colSetRaw = new Set();
            rows.forEach(r => { if (r && typeof r === 'object') Object.keys(r).forEach(k => colSetRaw.add(k)); });
            const rawCols = Array.from(colSetRaw);

            const SKIP_PATTERNS = [
                /^\[?TableID\]?$/i,
                /^\[?PartitionID\]?$/i,
                /^\[?AttributeHierarchyID\]?$/i,
                /^\[?DependsOnID\]?$/i,
                /^\[?ObjectID\]?$/i,
                /^\[?CalculationGroupID\]?$/i,
            ];
            const filteredCols = rawCols.filter(c => !SKIP_PATTERNS.some(p => p.test(c)));
            const columns = filteredCols.length > 0 ? filteredCols : rawCols;
            const displayNames = columns.map(c => c.replace(/^\[|\]$/g, ''));

            if (columns.length === 0) {
                if (out) {
                    out.textContent = '✅ Query executed — result is not tabular.';
                    out.style.color = 'var(--success)';
                }
                return;
            }

            window._lastDaxResult = { rows, columns, displayNames };

            if (resultWrap) resultWrap.style.display = 'block';
            if (statsSpan) statsSpan.textContent = `${rows.length} rows × ${columns.length} cols`;

            const channelInfo = json.channel ? ` (${json.channel})` : '';
            if (out) {
                out.textContent = `✅ Query executed — ${rows.length} rows returned${channelInfo}. Click "DAX Query Results" above to view table.`;
                out.style.color = 'var(--success)';
            }

        } else {
            if (out) {
                out.textContent = 'Error: ' + (json.error || 'Unknown error');
                out.style.color = 'var(--error)';
            }
        }
    } catch (e) {
        if (out) {
            out.textContent = 'Error: ' + e.message;
            out.style.color = 'var(--error)';
        }
    }
};


// === Local Model DAX: Collapse/Expand the editor section ===
window._localDaxEditorOpen = true;
window.toggleLocalDaxEditor = function(e) {
    if (e && e.stopPropagation) e.stopPropagation();
    const body = document.getElementById('wf-local-dax-body');
    const chevron = document.getElementById('wf-local-dax-chevron');
    const copyBtn = document.getElementById('wf-local-dax-copy-btn');
    if (!body) return;
    window._localDaxEditorOpen = !window._localDaxEditorOpen;
    const open = window._localDaxEditorOpen;
    if (open) {
        body.style.display = 'block';
        if (chevron) chevron.style.transform = 'rotate(0deg)';
        if (copyBtn) { copyBtn.style.opacity = '1'; copyBtn.style.pointerEvents = 'auto'; }
    } else {
        body.style.display = 'none';
        if (chevron) chevron.style.transform = 'rotate(-90deg)';
        if (copyBtn) { copyBtn.style.opacity = '0'; copyBtn.style.pointerEvents = 'none'; }
    }
};

// === DAX Query Results: Open resizable popup modal via Universal Modal ===
window.openDaxResultModal = function() {
    const data = window._lastDaxResult;
    if (!data || !data.rows || data.rows.length === 0) {
        window.showNotification('No results to expand yet.', 'info');
        return;
    }

    if (window.showUniversalDataModal) {
        window.showUniversalDataModal({
            title: 'DAX Query Results',
            data: data.rows,
            columns: data.columns,
            displayNames: data.displayNames,
            enableSearch: true,
            enableColumnFilter: true
        });
    } else {
        console.error("Universal modal script not loaded.");
    }
};



// Override native alert to use our custom modal
window.alert = function(msg) {
    if (window.showCustomAlert) {
        window.window.showCustomAlert(msg);
    } else {
        console.log("ALERT:", msg);
    }
};

// --- Dataset Partitions Manager & Targeted Refresh Logic ---
window.dpmPartitionsCache = [];

window.scanDatasetPartitions = async function(btnEl) {
    const out = document.getElementById('wf-out-dpm-logs');
    const statsEl = document.getElementById('wf-dpm-stats');

    if (!out) return;

    // Auto expand execution log console when starting
    if (out.classList.contains('collapsed-console')) {
        out.classList.remove('collapsed-console');
        const chevron = document.getElementById('wf-out-dpm-logs-chevron');
        if (chevron) chevron.style.transform = 'rotate(90deg)';
    }

    out.textContent = `[${new Date().toLocaleTimeString()}] Starting scan of all accessible workspaces, datasets & table partitions...\n`;
    window.dpmPartitionsCache = [];
    if (statsEl) statsEl.textContent = '';

    try {
        // 1. Fetch workspaces
        out.textContent += `Step 1/3: Fetching workspaces list...\n`;
        const wsRes = await fetch('/api/proxy', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ endpoint: '/groups', method: 'GET' })
        });
        const wsJson = await wsRes.json();
        const workspaces = (wsJson.data && wsJson.data.value) ? wsJson.data.value : [];
        out.textContent += `Found ${workspaces.length} accessible workspaces.\n`;

        let totalPartitions = 0;

        for (const ws of workspaces) {
            out.textContent += `Scanning Workspace: ${ws.name} (${ws.id})...\n`;
            
            // 2. Fetch datasets in workspace
            const dsRes = await fetch('/api/proxy', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ endpoint: `/groups/${ws.id}/datasets`, method: 'GET' })
            });
            const dsJson = await dsRes.json();
            const datasets = (dsJson.data && dsJson.data.value) ? dsJson.data.value : [];

            for (const ds of datasets) {
                out.textContent += `  └─ Dataset: ${ds.name} (${ds.id})...\n`;
                
                // 3. Fetch tables in dataset
                const tblRes = await fetch('/api/proxy', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ endpoint: `/groups/${ws.id}/datasets/${ds.id}/tables`, method: 'GET' })
                });
                const tblJson = await tblRes.json();
                const tables = (tblJson.data && tblJson.data.value) ? tblJson.data.value : [];

                if (tables.length === 0) {
                    // Try direct dataset partitions info or push item without sub-tables
                    window.dpmPartitionsCache.push({
                        workspaceId: ws.id,
                        workspaceName: ws.name,
                        datasetId: ds.id,
                        datasetName: ds.name,
                        tableName: "Full Model",
                        partitionName: "Default / All Partitions",
                        mode: "Import",
                        canRefresh: true
                    });
                    totalPartitions++;
                    continue;
                }

                for (const tbl of tables) {
                    // 4. Fetch partitions for table
                    const partRes = await fetch('/api/proxy', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ endpoint: `/groups/${ws.id}/datasets/${ds.id}/tables/${tbl.name}/partitions`, method: 'GET' })
                    });
                    const partJson = await partRes.json();
                    const partitions = (partJson.data && partJson.data.value) ? partJson.data.value : [];

                    if (partitions.length === 0) {
                        window.dpmPartitionsCache.push({
                            workspaceId: ws.id,
                            workspaceName: ws.name,
                            datasetId: ds.id,
                            datasetName: ds.name,
                            tableName: tbl.name,
                            partitionName: `${tbl.name}_Partition`,
                            mode: "Import",
                            canRefresh: true
                        });
                        totalPartitions++;
                    } else {
                        for (const part of partitions) {
                            window.dpmPartitionsCache.push({
                                workspaceId: ws.id,
                                workspaceName: ws.name,
                                datasetId: ds.id,
                                datasetName: ds.name,
                                tableName: tbl.name,
                                partitionName: part.name || part.id || `${tbl.name}_Part`,
                                mode: part.mode || "Import",
                                canRefresh: true
                            });
                            totalPartitions++;
                        }
                    }
        // Deduplicate cache entries by unique key (workspaceId + datasetId + tableName + partitionName)
                } // end for (const tbl of tables)
            } // end for (const ds of datasets)
        } // end for (const ws of workspaces)
        const uniqueMap = new Map();
        for (const item of window.dpmPartitionsCache) {
            const key = `${item.workspaceId}_${item.datasetId}_${item.tableName}_${item.partitionName}`;
            if (!uniqueMap.has(key)) {
                uniqueMap.set(key, item);
            }
        }
        window.dpmPartitionsCache = Array.from(uniqueMap.values());
        totalPartitions = window.dpmPartitionsCache.length;

        out.textContent += `\nScan Complete! Successfully indexed ${totalPartitions} dataset partitions. 🎉\n`;
        if (statsEl) statsEl.textContent = `Indexed: ${totalPartitions} partitions`;
        const wrap = document.getElementById('wf-dpm-result-wrap');
        if (wrap) wrap.style.display = 'block';

    } catch (err) {
        out.textContent += `Error during partition scan: ${err.message || JSON.stringify(err)}\n`;
    }
};

window.openDpmResultModal = function() {
    if (!window.dpmPartitionsCache || window.dpmPartitionsCache.length === 0) {
        if (window.showCustomAlert) window.showCustomAlert('No dataset partition data available. Please click "Scan Partitions" first.');
        return;
    }
    const cols = ['workspaceName', 'datasetName', 'tableName', 'partitionName', 'mode', 'actions'];
    const displayNames = ['Workspace', 'Dataset', 'Table Name', 'Partition Name', 'Refresh Mode', 'Actions'];
    if (window.showUniversalDataModal) {
        window.showUniversalDataModal({
            title: '⚡ Dataset Partitions & Targeted Refresh Manager',
            data: window.dpmPartitionsCache,
            columns: cols,
            displayNames: displayNames,
            enableSearch: true,
            enableColumnFilter: true,
            cellRenderer: function(col, val, row) {
                if (col === 'actions') {
                    const itemIdx = window.dpmPartitionsCache.indexOf(row);
                    return `
                        <div style="display: flex; gap: 6px; align-items: center;">
                            <button type="button" class="btn-wf-sm btn-wf-secondary" style="padding: 3px 8px; font-size: 0.75rem; white-space: nowrap;" onclick="window.refreshDpmPartition(this, ${itemIdx})">⚡ Refresh</button>
                            <button type="button" class="btn-wf-sm btn-wf-secondary" style="padding: 3px 8px; font-size: 0.75rem; white-space: nowrap; color: var(--accent);" onclick="window.openPartitionRefreshHistoryModal(this, ${itemIdx})" title="View Refresh History Log">📜 History</button>
                        </div>
                    `;
                }
                return undefined;
            }
        });
    }
};

window.openPartitionRefreshHistoryModal = async function(btnEl, itemIdx) {
    const item = window.dpmPartitionsCache[itemIdx];
    if (!item) return;

    if (btnEl) {
        btnEl.disabled = true;
        btnEl.innerHTML = '<span class="loader" style="width: 10px; height: 10px; border-width: 1px;"></span> Loading...';
    }

    try {
        const res = await fetch('/api/proxy', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                endpoint: `/groups/${item.workspaceId}/datasets/${item.datasetId}/refreshes?$top=20`,
                method: 'GET'
            })
        });
        const json = await res.json();
        const refreshes = (json.data && json.data.value) ? json.data.value : [];

        const formattedData = refreshes.map(r => ({
            id: r.id || r.requestId || '-',
            refreshType: r.refreshType || 'ViaApi',
            startTime: r.startTime ? new Date(r.startTime).toLocaleString() : '-',
            endTime: r.endTime ? new Date(r.endTime).toLocaleString() : '-',
            duration: (r.startTime && r.endTime) ? Math.round((new Date(r.endTime) - new Date(r.startTime))/1000) + 's' : '-',
            status: r.status || 'Unknown',
            error: r.serviceExceptionJson ? (JSON.parse(r.serviceExceptionJson).errorCode || 'Error') : 'None'
        }));

        if (window.showUniversalDataModal) {
            window.showUniversalDataModal({
                modalId: 'refresh-history-modal-overlay',
                title: `📜 Refresh History: ${item.datasetName} (${item.partitionName})`,
                data: formattedData,
                columns: ['id', 'refreshType', 'startTime', 'endTime', 'duration', 'status', 'error'],
                displayNames: ['Refresh ID', 'Trigger Type', 'Start Time', 'End Time', 'Duration', 'Status', 'Error Info'],
                enableSearch: true,
                enableColumnFilter: true
            });
        }
    } catch(err) {
        if (window.showCustomAlert) window.showCustomAlert(`Failed to load refresh history: ${err.message}`);
    } finally {
        if (btnEl) {
            btnEl.disabled = false;
            btnEl.innerHTML = '📜 History';
        }
    }
};

window.renderDpmTable = function(items) {
    const tbody = document.getElementById('wf-dpm-tbody');
    if (!tbody) return;
    tbody.innerHTML = '';

    if (items.length === 0) {
        tbody.innerHTML = `<tr><td colspan="4" style="padding: 16px; text-align: center; color: var(--text-secondary);">No dataset partitions found matching filter.</td></tr>`;
        return;
    }

    items.forEach((item, idx) => {
        const tr = document.createElement('tr');
        tr.style.borderBottom = '1px solid var(--panel-border)';
        tr.innerHTML = `
            <td style="padding: 8px 12px;">
                <div style="font-weight: bold; color: var(--text-primary);">${item.datasetName}</div>
                <div style="font-size: 0.72rem; color: var(--text-secondary);">${item.workspaceName} / ${item.tableName}</div>
            </td>
            <td style="padding: 8px 12px; font-family: monospace; color: var(--accent); font-weight: 500;">
                ${item.partitionName}
            </td>
            <td style="padding: 8px 12px;">
                <span class="badge" style="background: var(--input-bg-light); border: 1px solid var(--panel-border); font-size: 0.7rem; padding: 2px 6px; border-radius: 4px;">${item.mode}</span>
            </td>
            <td style="padding: 8px 12px;">
                <button type="button" class="btn-wf-sm btn-wf-secondary" style="padding: 4px 8px; font-size: 0.75rem; white-space: nowrap;" onclick="window.refreshDpmPartition(this, ${idx})">
                    ⚡ Refresh Partition
                </button>
            </td>
        `;
        tbody.appendChild(tr);
    });
};

window.filterDpmPartitions = function() {
    const q = (document.getElementById('wf-dpm-search').value || '').toLowerCase().trim();
    if (!q) {
        window.renderDpmTable(window.dpmPartitionsCache);
        return;
    }
    const filtered = window.dpmPartitionsCache.filter(item => 
        item.workspaceName.toLowerCase().includes(q) ||
        item.datasetName.toLowerCase().includes(q) ||
        item.tableName.toLowerCase().includes(q) ||
        item.partitionName.toLowerCase().includes(q)
    );
    window.renderDpmTable(filtered);
};

window.refreshDpmPartition = async function(btnEl, itemIdx) {
    const item = window.dpmPartitionsCache[itemIdx];
    const out = document.getElementById('wf-out-dpm-logs');
    if (!item || !out) return;

    if (btnEl) {
        btnEl.disabled = true;
        btnEl.innerHTML = '<span class="loader" style="width: 10px; height: 10px; border-width: 1px;"></span> Executing...';
    }

    out.textContent += `\n[${new Date().toLocaleTimeString()}] Triggering targeted refresh for Partition "${item.partitionName}" (Table: ${item.tableName}, Dataset: ${item.datasetName})...\n`;

    try {
        const payload = {
            endpoint: `/groups/${item.workspaceId}/datasets/${item.datasetId}/refreshes`,
            method: 'POST',
            body: {
                type: "Full",
                commitMode: "Transactional",
                objects: [
                    {
                        table: item.tableName,
                        partition: item.partitionName
                    }
                ]
            }
        };

        const res = await fetch('/api/proxy', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        const data = await res.json();

        if (data.success && (data.data.status_code === 202 || data.data.status_code === 200)) {
            out.textContent += `Success: Refresh command submitted for partition "${item.partitionName}". HTTP ${data.data.status_code} Accepted! 🎉\n`;
            if (window.showNotification) window.showNotification(`Partition "${item.partitionName}" refresh initiated!`, 'success');
        } else {
            // Fallback for standard dataset refresh if table partition API returns notice
            out.textContent += `Notice: Specialized partition API response: ${JSON.stringify(data.data)}. Triggering standard dataset refresh fallback...\n`;
            const fallbackRes = await fetch('/api/proxy', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    endpoint: `/groups/${item.workspaceId}/datasets/${item.datasetId}/refreshes`,
                    method: 'POST'
                })
            });
            const fallbackData = await fallbackRes.json();
            out.textContent += `Fallback Dataset Refresh Submitted: HTTP ${fallbackData.data ? fallbackData.data.status_code : 'OK'}\n`;
            if (window.showNotification) window.showNotification(`Dataset refresh fallback triggered for ${item.datasetName}`, 'info');
        }

        // Start polling refresh status
        out.textContent += `Polling refresh status for dataset ${item.datasetName}...\n`;
        let attempts = 0;
        const maxAttempts = 15;
        const pollInterval = setInterval(async () => {
            attempts++;
            try {
                const statusRes = await fetch('/api/proxy', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        endpoint: `/groups/${item.workspaceId}/datasets/${item.datasetId}/refreshes?$top=1`,
                        method: 'GET'
                    })
                });
                const statusJson = await statusRes.json();
                const latest = (statusJson.data && statusJson.data.value && statusJson.data.value.length > 0) ? statusJson.data.value[0] : null;
                
                if (latest) {
                    out.textContent += `[Poll ${attempts}/${maxAttempts}] Current Status: ${latest.status}\n`;
                    out.scrollTop = out.scrollHeight;
                    if (latest.status === 'Completed') {
                        clearInterval(pollInterval);
                        out.textContent += `✅ Refresh Completed Successfully! (End Time: ${latest.endTime || 'Just now'})\n`;
                        if (window.showNotification) window.showNotification(`Partition "${item.partitionName}" refreshed successfully! 🎉`, 'success');
                        if (btnEl) {
                            btnEl.disabled = false;
                            btnEl.innerHTML = '✅ Done';
                            setTimeout(() => { btnEl.innerHTML = '⚡ Refresh Partition'; }, 3000);
                        }
                        return;
                    } else if (latest.status === 'Failed') {
                        clearInterval(pollInterval);
                        out.textContent += `❌ Refresh Failed! Error: ${latest.serviceExceptionJson || 'Unknown'}\n`;
                        if (window.showNotification) window.showNotification(`Refresh failed for "${item.partitionName}"`, 'error');
                        if (btnEl) {
                            btnEl.disabled = false;
                            btnEl.innerHTML = '❌ Failed';
                            setTimeout(() => { btnEl.innerHTML = '⚡ Refresh Partition'; }, 3000);
                        }
                        return;
                    }
                }
            } catch(e) {}

            if (attempts >= maxAttempts) {
                clearInterval(pollInterval);
                out.textContent += `Polling timeout. Refresh is still running in background on Power BI Service.\n`;
                if (btnEl) {
                    btnEl.disabled = false;
                    btnEl.innerHTML = '⚡ Refresh Partition';
                }
            }
        }, 3000);

    } catch (err) {
        out.textContent += `Error triggering partition refresh: ${err.message || JSON.stringify(err)}\n`;
        if (btnEl) {
            btnEl.disabled = false;
            btnEl.innerHTML = '⚡ Refresh Partition';
        }
    } finally {
        out.scrollTop = out.scrollHeight;
    }
};

// =========================================================================
// MSAL.js Interactive Popup & Device Code Flow (MFA Fallback) Controller
// =========================================================================
let _currentDevicePollTimer = null;
let _currentDeviceFlowId = null;

window.updateWorkflowAuthBadge = async function() {
    const badgeEl = document.getElementById('wf-header-auth-badge');
    if (!badgeEl) return;
    
    try {
        const res = await fetch('/api/auth-info');
        const data = await res.json();
        if (data && data.success) {
            const isPersonal = data.auth_mode === 'personal';
            if (isPersonal) {
                const userDisplayName = data.username ? data.username : 'User';
                badgeEl.textContent = `· Personal (${userDisplayName})`;
                badgeEl.title = `当前认证: Personal Auth (个人委派用户认证) - ${data.username || ''}`;
            } else {
                const appDisplayName = data.app_name || (data.client_id ? `App (${data.client_id.substring(0, 8)}...)` : 'App');
                badgeEl.textContent = `· Service Principal (${appDisplayName})`;
                badgeEl.title = `当前认证: Service Principal (Azure 应用程序认证) - ${data.client_id || ''}`;
            }
        }
    } catch (e) {
        console.warn('Failed to load auth info badge:', e);
    }
};

window.closeDeviceCodeModal = function() {
    const modal = document.getElementById('device-code-modal');
    if (modal) {
        window.closeModalWithAnimation('device-code-modal');
    }
    if (_currentDevicePollTimer) {
        clearInterval(_currentDevicePollTimer);
        _currentDevicePollTimer = null;
    }
    if (_currentDeviceFlowId) {
        fetch('/api/auth/device-code/cancel', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ flow_id: _currentDeviceFlowId })
        }).catch(() => {});
        _currentDeviceFlowId = null;
    }
};

window.copyDeviceCode = function(btn) {
    const valEl = document.getElementById('device-code-value');
    if (!valEl) return;
    const text = valEl.textContent.trim();
    if (window.handleCopyAction && btn) {
        window.handleCopyAction(btn, text, valEl);
    } else {
        navigator.clipboard.writeText(text);
        if (window.showNotification) window.showNotification("✅ 验证码已复制到剪贴板！", "success");
    }
};

window.acquireMfaTokenWithFallback = async function(targetInputId = 'wf-xmla-token', onTokenAcquired = null) {
    const targetInput = document.getElementById(targetInputId);
    
    // 采用微软官方跨租户零重定向依赖的 Device Code Flow (设备代码流)
    // 优势: 100% 免疫 AADSTS50011 (Redirect URI Mismatch) 与 AADSTS50020 (Tenant Mismatch)，原生支持任意企业账号
    try {
        if (window.showNotification) window.showNotification("📱 正在初始化微软设备代码认证...", "info");
        
        const initRes = await fetch('/api/auth/device-code/init', { method: 'POST' });
        const initData = await initRes.json();
        
        if (!initData || !initData.success || !initData.user_code) {
            alert("❌ 初始化设备代码流失败: " + (initData?.message || "网络异常"));
            return null;
        }
        
        _currentDeviceFlowId = initData.flow_id;
        const codeValEl = document.getElementById('device-code-value');
        const codeLinkEl = document.getElementById('device-code-link');
        const modal = document.getElementById('device-code-modal');
        const modalContent = modal ? modal.querySelector('.modal-content') : null;
        
        if (codeValEl) codeValEl.textContent = initData.user_code;
        if (codeLinkEl && initData.verification_uri) {
            codeLinkEl.href = initData.verification_uri;
        }
        
        if (modal) {
            modal.style.display = 'flex';
            modal.style.visibility = 'visible';
            modal.style.opacity = '1';
            if (modalContent) window.centerModal(modalContent);
        }
        
        // 自动复制设备码到剪贴板，极大提升用户体验
        try {
            await navigator.clipboard.writeText(initData.user_code);
            if (window.showNotification) {
                window.showNotification(`📋 验证码 [${initData.user_code}] 已自动复制到剪贴板！`, "success");
            }
        } catch (_) {}
        
        // 启动高频轮询检查
        return new Promise((resolve) => {
            if (_currentDevicePollTimer) clearInterval(_currentDevicePollTimer);
            _currentDevicePollTimer = setInterval(async () => {
                try {
                    const pollRes = await fetch(`/api/auth/device-code/poll?flow_id=${_currentDeviceFlowId}`);
                    const pollData = await pollRes.json();
                    
                    if (pollData.status === 'completed' && pollData.token) {
                        clearInterval(_currentDevicePollTimer);
                        _currentDevicePollTimer = null;
                        window.closeDeviceCodeModal();
                        
                        const token = pollData.token;
                        if (targetInput) targetInput.value = token;
                        const badge = document.getElementById('wf-xmla-token-badge');
                        if (badge) badge.style.display = 'inline-flex';
                        if (window.showNotification) window.showNotification("🎉 个人 MFA 验证成功，Token 已自动填入！", "success");
                        if (onTokenAcquired) onTokenAcquired(token);
                        resolve(token);
                    } else if (pollData.status === 'error') {
                        clearInterval(_currentDevicePollTimer);
                        _currentDevicePollTimer = null;
                        alert("❌ 设备流认证失败: " + pollData.message);
                        window.closeDeviceCodeModal();
                        resolve(null);
                    }
                } catch (_) {}
            }, 2500);
        });
    } catch (err) {
        alert("❌ 发起认证异常: " + err.message);
        return null;
    }
};

// =========================================================================
// XMLA Interactive Refresh Workflow Client JS Handler
// =========================================================================
window.initXmlaWorkflow = function() {
    const btnAuth = document.getElementById('wf-xmla-auth-btn');
    const tokenInput = document.getElementById('wf-xmla-token');
    const endpointInput = document.getElementById('wf-xmla-endpoint');
    const btnScanDs = document.getElementById('wf-xmla-btn-scan-ds');
    const btnScanTbl = document.getElementById('wf-xmla-btn-scan-tbl');
    const selDs = document.getElementById('wf-xmla-dataset');
    const selTbl = document.getElementById('wf-xmla-table');
    const selPart = document.getElementById('wf-xmla-partition');
    const manualBox = document.getElementById('wf-xmla-manual-box');
    const manualTableInput = document.getElementById('wf-xmla-manual-table');
    const manualPartInput = document.getElementById('wf-xmla-manual-partition');
    const logsEl = document.getElementById('wf-out-xmla-logs');
    const statusEl = document.getElementById('wf-xmla-status');

    if (!btnAuth || btnAuth._inited) return;
    btnAuth._inited = true;

    // 智能联动：如果 XMLA endpoint 完全为空，尝试从活动工作区中填充
    const syncActiveWorkspaceToXmla = () => {
        if (!endpointInput) return;
        const activeWsName = document.querySelector('#trigger-workspace .cs-name')?.textContent?.trim();
        if (activeWsName && activeWsName !== '-- None --' && !endpointInput.value.trim()) {
            endpointInput.value = `powerbi://api.powerbi.com/v1.0/myorg/${encodeURIComponent(activeWsName)}`;
        }
    };
    syncActiveWorkspaceToXmla();

    const updateTokenBadge = (hasToken) => {
        const badge = document.getElementById('wf-xmla-token-badge');
        if (badge) {
            badge.style.display = hasToken ? 'inline-flex' : 'none';
        }
    };

    const SPIN_ICON = '<svg class="spinning" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" style="display:inline-block;vertical-align:middle;animation:spin 0.8s linear infinite;"><path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67"/></svg>';
    const AUTH_ICON = '<svg width="14" height="14" viewBox="0 0 24 24" fill="#f59e0b" stroke="#f59e0b" stroke-width="1"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon></svg>';

    // 自动尝试获取已缓存的 Token (静默读取)
    const autoFetchToken = async (silent = true) => {
        try {
            if (btnAuth && !silent) btnAuth.innerHTML = SPIN_ICON;
            const res = await fetch('/api/xmla/get-token');
            const data = await res.json();
            if (btnAuth && !silent) btnAuth.innerHTML = AUTH_ICON;
            if (data && data.success && data.token) {
                tokenInput.value = data.token;
                updateTokenBadge(true);
                if (!silent && window.showNotification) window.showNotification("✅ 已成功提取未过期的 Access Token！", "success");
                return data.token;
            } else {
                const r2 = await fetch('/api/check-permissions');
                const d2 = await r2.json();
                if (d2 && d2.token) {
                    tokenInput.value = d2.token;
                    updateTokenBadge(true);
                    if (!silent && window.showNotification) window.showNotification("✅ 已提取全局 Access Token！", "success");
                    return d2.token;
                }
            }
        } catch (e) {
            if (btnAuth && !silent) btnAuth.innerHTML = AUTH_ICON;
            if (!silent && window.showNotification) window.showNotification("❌ 提取 Token 异常: " + e.message, "error");
        }
        const currentVal = tokenInput.value.trim();
        updateTokenBadge(Boolean(currentVal));
        return currentVal;
    };

    // 1. 个人认证按钮 (支持 MSAL 网页弹窗登录 + Device Code Flow 智能轮换)
    btnAuth.addEventListener('click', async () => {
        btnAuth.innerHTML = SPIN_ICON;
        try {
            await window.acquireMfaTokenWithFallback('wf-xmla-token', (token) => {
                updateTokenBadge(Boolean(token));
            });
        } finally {
            btnAuth.innerHTML = AUTH_ICON;
        }
    });

    // 2. 扫描模型 (Datasets)
    const scanDatasets = async (silent = false) => {
        let token = tokenInput.value.trim();
        if (!token) token = await autoFetchToken(true);
        const endpoint = endpointInput.value.trim();
        
        btnScanDs.innerHTML = SPIN_ICON;
        try {
            const res = await fetch('/api/xmla/scan-datasets', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ xmla_endpoint: endpoint, access_token: token })
            });
            const data = await res.json();
            btnScanDs.innerHTML = "🔄";
            if (data.success) {
                if (data.token && !tokenInput.value) {
                    tokenInput.value = data.token;
                    updateTokenBadge(true);
                }
                selDs.innerHTML = '<option value="">-- 请选择模型 --</option>';
                data.datasets.forEach(ds => {
                    const opt = document.createElement('option');
                    opt.value = ds.name;
                    opt.setAttribute('data-id', ds.id || '');
                    opt.dataset.id = ds.id || '';
                    opt.textContent = ds.name;
                    selDs.appendChild(opt);
                });
                window._xmla_datasets_cache = data.datasets;
                if (!silent && window.showNotification) {
                    window.showNotification(`✅ 成功扫描到 ${data.datasets.length} 个模型！`, "success");
                }
                // 智能联动：优先自动选择上次使用的模型 (例如 Carman PA Hypers)
                const lastDs = localStorage.getItem('pbi_xmla_last_dataset') || 'Carman PA Hypers';
                if (lastDs && data.datasets.some(d => d.name === lastDs)) {
                    selDs.value = lastDs;
                } else if (selDs.options.length > 1 && !selDs.value) {
                    selDs.selectedIndex = 1;
                }
                if (selDs.value) {
                    selDs.dispatchEvent(new Event('change'));
                }
            } else {
                if (!silent) alert("❌ 扫描模型失败: " + data.message);
            }
        } catch (e) {
            btnScanDs.innerHTML = "🔄";
            if (!silent) alert("❌ 请求异常: " + e.message);
        }
    };
    btnScanDs.addEventListener('click', () => scanDatasets(false));

    // 3. 扫描数据表 (Tables) 核心函数
    window.loadXmlaTablesForDataset = async function(isSilent = false) {
        let token = tokenInput.value.trim();
        if (!token) token = await autoFetchToken(true);
        const endpoint = endpointInput.value.trim();
        const dsName = selDs.value;
        if (!dsName) {
            selTbl.innerHTML = '<option value="">-- 请先选择模型 --</option>';
            selPart.innerHTML = '<option value="">-- 全表刷新 (包含所有分区) --</option>';
            return;
        }

        let dsId = selDs.options[selDs.selectedIndex]?.getAttribute('data-id') || selDs.options[selDs.selectedIndex]?.dataset?.id || "";
        if (!dsId && window._xmla_datasets_cache) {
            const found = window._xmla_datasets_cache.find(d => d.name === dsName);
            if (found) dsId = found.id;
        }

        btnScanTbl.innerHTML = SPIN_ICON;
        selTbl.disabled = true;
        selTbl.innerHTML = '<option value="">🔄 正在深度扫描模型数据表与分区 (大型模型预计 10-15s)...</option>';
        selPart.innerHTML = '<option value="">-- 全表刷新 (包含所有分区) --</option>';

        try {
            const res = await fetch('/api/xmla/scan-tables', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ xmla_endpoint: endpoint, access_token: token, dataset_name: dsName, dataset_id: dsId })
            });
            const data = await res.json();
            btnScanTbl.innerHTML = "🔄";
            selTbl.disabled = false;

            if (data.success) {
                selTbl.innerHTML = '<option value="">-- 请选择表 --</option>';
                window._xmla_tables_cache = data.tables || [];

                if (data.tables && data.tables.length > 0) {
                    if (manualBox) manualBox.style.display = 'none';
                    data.tables.forEach(t => {
                        const opt = document.createElement('option');
                        opt.value = t.name;
                        const partCount = (t.partitions && t.partitions.length) ? t.partitions.length : 1;
                        opt.textContent = `${t.name} (${partCount} 个分区)`;
                        selTbl.appendChild(opt);
                    });

                    // 智能联动：优先自动选择上次选中的表名
                    const lastTbl = localStorage.getItem('pbi_xmla_last_table');
                    if (lastTbl && data.tables.some(t => t.name === lastTbl)) {
                        selTbl.value = lastTbl;
                    } else if (selTbl.options.length > 1) {
                        selTbl.selectedIndex = 1;
                    }
                    selTbl.dispatchEvent(new Event('change'));

                    if (!isSilent && window.showNotification) {
                        window.showNotification(`✅ 成功扫描并解包 ${data.tables.length} 张数据表！`, "success");
                    }
                } else {
                    if (manualBox) manualBox.style.display = 'block';
                    selTbl.innerHTML = '<option value="">⚠️ 自动枚举受限 (请在下方直接输入表名)</option>';
                    if (!isSilent) {
                        if (window.showNotification) window.showNotification("⚠️ 自动枚举受限，已自动为您展开下方手动指定表名输入框。", "warning");
                    }
                }
            } else {
                selTbl.innerHTML = '<option value="">❌ 扫描失败 (可使用下方手动表名)</option>';
                if (manualBox) manualBox.style.display = 'block';
                if (!isSilent) alert("❌ 扫描表失败: " + (data.message || "未知错误"));
            }
        } catch (e) {
            btnScanTbl.innerHTML = "🔄";
            selTbl.disabled = false;
            selTbl.innerHTML = '<option value="">❌ 请求异常</option>';
            if (manualBox) manualBox.style.display = 'block';
            if (!isSilent) alert("❌ 请求异常: " + e.message);
        }
    };

    // 绑定扫描表按钮
    btnScanTbl.addEventListener('click', () => window.loadXmlaTablesForDataset(false));

    // 绑定导出字段按钮 (单表 / 全模型)
    const btnExportFields = document.getElementById('wf-xmla-btn-export-fields');
    if (btnExportFields) btnExportFields.addEventListener('click', () => window.exportXmlaTableFields(false));

    const btnExportModelFields = document.getElementById('wf-xmla-btn-export-model-fields');
    if (btnExportModelFields) btnExportModelFields.addEventListener('click', () => window.exportXmlaTableFields(true));

    // 关键联动：模型下拉框改变时，记录到 localStorage 并自动触发扫描数据表！
    selDs.addEventListener('change', () => {
        if (selDs.value) localStorage.setItem('pbi_xmla_last_dataset', selDs.value);
        window.loadXmlaTablesForDataset(true);
    });

    // 页面初始化时自动尝试预热 Token 并拉取模型
    autoFetchToken(true).then((tok) => {
        if (tok && (!selDs.options || selDs.options.length <= 1)) {
            scanDatasets(true);
        }
    });

    // 联动更新分区下拉框并记录最后选择的表
    selTbl.addEventListener('change', () => {
        const tblName = selTbl.value;
        if (tblName) localStorage.setItem('pbi_xmla_last_table', tblName);
        selPart.innerHTML = '<option value="">-- 全表刷新 (包含所有分区) --</option>';
        if (window._xmla_tables_cache) {
            const tObj = window._xmla_tables_cache.find(t => t.name === tblName);
            if (tObj && tObj.partitions && tObj.partitions.length > 0) {
                tObj.partitions.forEach(p => {
                    const opt = document.createElement('option');
                    opt.value = p.name;
                    opt.textContent = `分区: ${p.name} (模式: ${p.mode || 'import'})`;
                    selPart.appendChild(opt);
                });
            }
        }
    });

    // 4. 工作流执行器：触发 XMLA 定向刷新与云端状态审计
    window.runXmlaRefreshWorkflow = async function() {
        let token = tokenInput.value.trim();
        if (!token) token = await autoFetchToken(false);
        const endpoint = endpointInput.value.trim();
        const dsName = selDs.value;
        let tblName = selTbl.value;
        let partName = selPart.value;
        const refType = document.getElementById('wf-xmla-type')?.value || 'full';

        if (!token) {
            if (window.showNotification) window.showNotification("❌ 缺少 Access Token，请先获取认证凭据！", "error");
            else alert("❌ 缺少 Access Token，请先获取认证凭据！");
            return;
        }
        if (!dsName) {
            if (window.showNotification) window.showNotification("❌ 请先在第 1 步下拉框中选择要刷新的语义模型！", "error");
            else alert("❌ 请先在第 1 步下拉框中选择要刷新的语义模型！");
            return;
        }

        // 如果下拉框没有有效表名，检查手动输入框
        if (!tblName && manualBox && manualBox.style.display !== 'none') {
            tblName = manualTableInput?.value.trim();
            if (manualPartInput?.value.trim()) partName = manualPartInput.value.trim();
        }

        if (!tblName) {
            if (window.showNotification) window.showNotification("❌ 请选择或手动输入要刷新的目标数据表名！", "error");
            else alert("❌ 请选择或手动输入要刷新的目标数据表名！");
            return;
        }

        let dsId = selDs.options[selDs.selectedIndex]?.getAttribute('data-id') || selDs.options[selDs.selectedIndex]?.dataset?.id || "";
        if (!dsId && window._xmla_datasets_cache) {
            const found = window._xmla_datasets_cache.find(d => d.name === dsName);
            if (found) dsId = found.id;
        }

        // 展开控制台
        if (window.expandConsole) window.expandConsole('wf-out-xmla-logs');
        if (logsEl) {
            logsEl.innerText = `[${new Date().toLocaleTimeString()}] 🚀 准备向 Power BI 发起 XMLA / TMSL 定向刷新...\n` +
                               `• 语义模型: ${dsName} (${dsId || 'Auto'})\n` +
                               `• 目标数据表: ${tblName}\n` +
                               `• 目标分区: ${partName || '全表所有分区'}\n` +
                               `• 刷新类型: ${refType}\n` +
                               `• XMLA 端点: ${endpoint}\n` +
                               `--------------------------------------------------------------------------\n`;
        }
        if (statusEl) statusEl.innerHTML = `<span style="display:inline-flex;align-items:center;gap:6px;">${SPIN_ICON} 正在下发 XMLA / TMSL 刷新指令...</span>`;

        try {
            const payload = {
                xmla_endpoint: endpoint,
                access_token: token,
                dataset_name: dsName,
                dataset_id: dsId,
                table_name: tblName,
                partition_name: partName || null,
                refresh_type: refType
            };

            const resp = await fetch('/api/xmla/trigger-refresh', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            const resData = await resp.json();

            if (resData.success) {
                if (statusEl) statusEl.innerHTML = `<span style="color: var(--success); font-weight: bold;">✅ 刷新指令已成功下发 (${resData.method})！</span> 正在查询最新云端审计与行数...`;
                if (logsEl) {
                    logsEl.innerText += `[${new Date().toLocaleTimeString()}] ✅ ${resData.message} (通道: ${resData.method})\n` +
                                        `[${new Date().toLocaleTimeString()}] 🔄 正在拉取模型云端刷新历史与数据表真实行数...\n`;
                    logsEl.scrollTop = logsEl.scrollHeight;
                }

                // 轮询查询云端刷新状态与行数
                setTimeout(async () => {
                    try {
                        const statusReq = await fetch('/api/xmla/refresh-status', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                                xmla_endpoint: endpoint,
                                access_token: token,
                                dataset_name: tblName, // 用于 COUNTROWS
                                dataset_id: dsId
                            })
                        });
                        const sData = await statusReq.json();
                        if (sData.success && logsEl) {
                            logsEl.innerText += `\n📊 模型 [${dsName}] 最新云端刷新记录 (UTC+8 北京时间):\n`;
                            logsEl.innerText += `==========================================================================\n`;
                            if (sData.history && sData.history.length > 0) {
                                sData.history.forEach((h, i) => {
                                    const stIcon = h.status === 'Completed' ? '✅ 成功' : (h.status === 'Failed' ? '❌ 失败' : '🔄 进行中');
                                    logsEl.innerText += `[#${i + 1}] 起止: ${h.startTime} 至 ${h.endTime}\n` +
                                                        `     耗时: ${h.duration} | 类型: ${h.refreshType || 'Unknown'} | 状态: ${stIcon}\n`;
                                    if (h.error) logsEl.innerText += `     明细: ${h.error}\n`;
                                    logsEl.innerText += `--------------------------------------------------------------------------\n`;
                                });
                            }
                            if (sData.row_count !== null && sData.row_count !== undefined) {
                                logsEl.innerText += `📈 目标表 [${tblName}] 当前真实总行数: ${Number(sData.row_count).toLocaleString()} 行\n`;
                            }
                            logsEl.innerText += `==========================================================================\n`;
                            logsEl.scrollTop = logsEl.scrollHeight;
                        }
                    } catch (e) {
                        if (logsEl) logsEl.innerText += `[WARN] 状态审计查询略过: ${e.message}\n`;
                    }
                }, 2000);

                if (window.showNotification) window.showNotification(`✅ 局部刷新指令已成功下发至 ${tblName}！`, "success");
            } else {
                if (statusEl) statusEl.innerHTML = `<span style="color: var(--danger); font-weight: bold;">❌ 刷新下发失败</span>`;
                if (logsEl) {
                    logsEl.innerText += `[${new Date().toLocaleTimeString()}] ❌ 刷新失败: ${resData.message}\n`;
                    logsEl.scrollTop = logsEl.scrollHeight;
                }
                if (window.showNotification) window.showNotification("❌ 刷新指令下发失败: " + resData.message, "error");
            }
        } catch (e) {
            if (statusEl) statusEl.innerHTML = `<span style="color: var(--danger);">❌ 请求异常: ${e.message}</span>`;
            if (logsEl) {
                logsEl.innerText += `[${new Date().toLocaleTimeString()}] ❌ 异常: ${e.message}\n`;
                logsEl.scrollTop = logsEl.scrollHeight;
            }
        }
    };
};

document.addEventListener('DOMContentLoaded', () => {
    setTimeout(window.initXmlaWorkflow, 500);
});

// 纯展开/折叠 Token 输入框（不改变编辑锁定状态）
window.toggleXmlaTokenVisibility = function() {
    const tokenContainer = document.getElementById('wf-xmla-token-container');
    const chevron = document.getElementById('wf-xmla-token-chevron');
    if (!tokenContainer) return;

    const isCurrentlyCollapsed = tokenContainer.style.display === 'none';
    if (isCurrentlyCollapsed) {
        tokenContainer.style.display = 'block';
        if (chevron) chevron.style.transform = 'rotate(90deg)';
    } else {
        tokenContainer.style.display = 'none';
        if (chevron) chevron.style.transform = 'rotate(0deg)';
    }
};

// 解锁编辑 Token — 需要二次弹窗确认
window.unlockXmlaTokenWithConfirm = async function() {
    const tokenInput = document.getElementById('wf-xmla-token');
    const tokenContainer = document.getElementById('wf-xmla-token-container');
    const lockBtn = document.getElementById('wf-xmla-toggle-lock-btn');
    const chevron = document.getElementById('wf-xmla-token-chevron');
    if (!tokenInput || !lockBtn) return;

    const isLocked = tokenInput.hasAttribute('readonly');

    if (isLocked) {
        // 解锁需要二次确认
        let confirmed = false;
        if (window.showCustomConfirm) {
            confirmed = await window.showCustomConfirm(
                '手动修改 Token 可能导致认证失败，建议优先使用【⚡】自动获取。确认解锁编辑？',
                '⚠️ 解锁 Access Token'
            );
        } else {
            confirmed = confirm('⚠️ 确认解锁 Access Token 编辑？\n\n手动修改 Token 可能导致认证失败，建议优先使用【⚡】自动获取。');
        }

        if (confirmed) {
            if (tokenContainer) tokenContainer.style.display = 'block';
            if (chevron) chevron.style.transform = 'rotate(90deg)';
            tokenInput.removeAttribute('readonly');
            tokenInput.style.opacity = '1';
            tokenInput.style.borderColor = 'var(--accent)';
            tokenInput.style.background = '';
            lockBtn.innerHTML = '🔓';
            lockBtn.title = '锁定 Token';
            lockBtn.style.color = 'var(--accent)';
            lockBtn.style.borderColor = 'var(--accent)';
            tokenInput.focus();
        }
    } else {
        // 已解锁 → 直接锁定（无需确认）
        tokenInput.setAttribute('readonly', 'true');
        tokenInput.style.opacity = '0.85';
        tokenInput.style.borderColor = 'var(--panel-border)';
        tokenInput.style.background = 'var(--input-bg-readonly, rgba(255,255,255,0.03))';
        lockBtn.innerHTML = '🔒';
        lockBtn.title = '解锁手动编辑 Token';
        lockBtn.style.color = 'var(--text-secondary)';
        lockBtn.style.borderColor = 'var(--overlay-20)';
    }
};

// 导出单个表或整个模型的字段/列元数据
window.exportXmlaTableFields = async function(forEntireModel = false) {
    const tokenInput = document.getElementById('wf-xmla-token');
    const endpointInput = document.getElementById('wf-xmla-endpoint');
    const selDs = document.getElementById('wf-xmla-dataset');
    const selTbl = document.getElementById('wf-xmla-table');
    const logsEl = document.getElementById('wf-out-xmla-logs');

    const token = tokenInput ? tokenInput.value.trim() : '';
    const endpoint = endpointInput ? endpointInput.value.trim() : '';
    const dsName = selDs ? selDs.value : '';
    const tblName = forEntireModel ? '' : (selTbl ? selTbl.value : '');

    if (!dsName) {
        if (window.showNotification) window.showNotification('❌ 请先选择 Dataset (Model)！', 'error');
        return;
    }
    if (!forEntireModel && !tblName) {
        if (window.showNotification) window.showNotification('❌ 请先选择要导出字段的 Table，或点击模型旁的 📋 导出整模字段！', 'error');
        return;
    }

    let dsId = '';
    if (selDs && selDs.options[selDs.selectedIndex]) {
        dsId = selDs.options[selDs.selectedIndex].getAttribute('data-id') || selDs.options[selDs.selectedIndex].dataset?.id || '';
    }
    if (!dsId && window._xmla_datasets_cache) {
        const found = window._xmla_datasets_cache.find(d => d.name === dsName);
        if (found) dsId = found.id;
    }

    const btnExport = document.getElementById(forEntireModel ? 'wf-xmla-btn-export-model-fields' : 'wf-xmla-btn-export-fields');
    const SPIN_ICON = '<svg class="spinning" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" style="display:inline-block;vertical-align:middle;animation:spin 0.8s linear infinite;"><path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67"/></svg>';
    if (btnExport) { btnExport.disabled = true; btnExport.innerHTML = SPIN_ICON; }

    // 展开控制台
    if (window.expandConsole) window.expandConsole('wf-out-xmla-logs');
    if (logsEl) {
        logsEl.innerText += `\n[${new Date().toLocaleTimeString()}] 📋 正在导出 ${forEntireModel ? `模型 [${dsName}] 全部表与字段` : `表 [${tblName}]`} 的元数据...\n`;
        logsEl.scrollTop = logsEl.scrollHeight;
    }

    try {
        const res = await fetch('/api/xmla/scan-tables', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ xmla_endpoint: endpoint, access_token: token, dataset_name: dsName, dataset_id: dsId })
        });
        const data = await res.json();

        if (data.success && data.tables && data.tables.length > 0) {
            if (forEntireModel) {
                // 导出整个模型的全部字段
                let allFieldData = [];
                let counter = 1;
                data.tables.forEach(t => {
                    const cols = t.columns || [];
                    if (cols.length > 0) {
                        cols.forEach(col => {
                            allFieldData.push({
                                '#': counter++,
                                tableName: t.name,
                                columnName: col.name || col.columnName || '-',
                                dataType: col.dataType || col.type || '-',
                                isHidden: col.isHidden ? '✅ Hidden' : '',
                                cardinality: col.cardinality || '-',
                                min: col.min || '',
                                max: col.max || ''
                            });
                        });
                    } else {
                        allFieldData.push({
                            '#': counter++,
                            tableName: t.name,
                            columnName: '(Table Partition Only)',
                            dataType: t.partitions?.[0]?.mode || 'Import',
                            isHidden: '',
                            cardinality: '-',
                            min: '',
                            max: ''
                        });
                    }
                });

                if (logsEl) {
                    logsEl.innerText += `✅ 成功导出模型 [${dsName}] 的 ${data.tables.length} 张表，共 ${allFieldData.length} 个字段元数据！\n`;
                    logsEl.scrollTop = logsEl.scrollHeight;
                }

                if (window.showUniversalDataModal && allFieldData.length > 0) {
                    window.showUniversalDataModal({
                        title: `📋 ${dsName} — 模型全量表与字段元数据 (${allFieldData.length} 字段, ${data.tables.length} 表)`,
                        data: allFieldData,
                        columns: ['#', 'tableName', 'columnName', 'dataType', 'isHidden', 'cardinality'],
                        displayNames: ['#', 'Table Name', 'Column Name', 'Data Type', 'Hidden', 'Cardinality'],
                        enableSearch: true,
                        enableColumnFilter: true
                    });
                }
                if (window.showNotification) {
                    window.showNotification(`📋 成功导出模型 [${dsName}] 全量 ${allFieldData.length} 个字段元数据！`, 'success');
                }
            } else {
                // 导出单个表的字段
                const targetTable = data.tables.find(t => t.name === tblName);
                if (targetTable) {
                    const columns = targetTable.columns || [];
                    const partitions = targetTable.partitions || [];

                    const fieldData = columns.map((col, i) => ({
                        '#': i + 1,
                        tableName: tblName,
                        columnName: col.name || col.columnName || '-',
                        dataType: col.dataType || col.type || '-',
                        isHidden: col.isHidden ? '✅ Hidden' : '',
                        cardinality: col.cardinality || '-',
                        min: col.min || '',
                        max: col.max || ''
                    }));

                    const partitionData = partitions.map((p, i) => ({
                        '#': i + 1,
                        partitionName: p.name || '-',
                        mode: p.mode || 'Import',
                        source: p.sourceType || p.source || ''
                    }));

                    if (logsEl) {
                        logsEl.innerText += `✅ 成功提取 [${tblName}] 的 ${columns.length} 个列字段 和 ${partitions.length} 个分区信息！\n`;
                        logsEl.scrollTop = logsEl.scrollHeight;
                    }

                    if (window.showUniversalDataModal && fieldData.length > 0) {
                        window.showUniversalDataModal({
                            title: `📋 ${dsName} ▸ ${tblName} — 列字段元数据 (${fieldData.length} 字段)`,
                            data: fieldData,
                            columns: ['#', 'columnName', 'dataType', 'isHidden', 'cardinality'],
                            displayNames: ['#', 'Column Name', 'Data Type', 'Hidden', 'Cardinality'],
                            enableSearch: true,
                            enableColumnFilter: true
                        });
                    } else if (fieldData.length === 0 && window.showUniversalDataModal && partitionData.length > 0) {
                        window.showUniversalDataModal({
                            title: `📋 ${dsName} ▸ ${tblName} — 分区信息 (${partitionData.length} partitions)`,
                            data: partitionData,
                            columns: ['#', 'partitionName', 'mode', 'source'],
                            displayNames: ['#', 'Partition Name', 'Mode', 'Source'],
                            enableSearch: true,
                            enableColumnFilter: true
                        });
                    }

                    if (window.showNotification) {
                        window.showNotification(`📋 已导出 [${tblName}] 的 ${fieldData.length || partitionData.length} 项元数据！`, 'success');
                    }
                } else {
                    if (logsEl) logsEl.innerText += `❌ 在扫描结果中未找到表 [${tblName}]。\n`;
                    if (window.showNotification) window.showNotification(`❌ 未找到表 [${tblName}]`, 'error');
                }
            }
        } else {
            if (logsEl) logsEl.innerText += `❌ 扫描元数据失败: ${data.message || '未知错误'}\n`;
            if (window.showNotification) window.showNotification(`❌ 扫描元数据失败: ${data.message || '未知错误'}`, 'error');
        }
    } catch (err) {
        if (logsEl) logsEl.innerText += `❌ 导出字段异常: ${err.message}\n`;
        if (window.showNotification) window.showNotification(`❌ 导出字段异常: ${err.message}`, 'error');
    } finally {
        if (btnExport) {
            btnExport.disabled = false;
            btnExport.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>';
        }
        if (logsEl) logsEl.scrollTop = logsEl.scrollHeight;
    }
};

// 查询模型/数据表/分区的历史刷新记录与状态
window.queryXmlaRefreshHistory = async function(scope = 'model') {
    const tokenInput = document.getElementById('wf-xmla-token');
    const endpointInput = document.getElementById('wf-xmla-endpoint');
    const selDs = document.getElementById('wf-xmla-dataset');
    const selTbl = document.getElementById('wf-xmla-table');
    const selPart = document.getElementById('wf-xmla-partition');
    const logsEl = document.getElementById('wf-out-xmla-logs');

    const token = tokenInput ? tokenInput.value.trim() : '';
    const endpoint = endpointInput ? endpointInput.value.trim() : '';
    const dsName = selDs ? selDs.value : '';
    const tblName = selTbl ? selTbl.value : '';
    const partName = selPart ? selPart.value : '';

    if (!dsName) {
        if (window.showNotification) window.showNotification('❌ 请先选择 Dataset (Model)！', 'error');
        return;
    }
    if ((scope === 'table' || scope === 'partition') && !tblName) {
        if (window.showNotification) window.showNotification('❌ 请先选择要查询的数据表 Table！', 'error');
        return;
    }

    let dsId = '';
    if (selDs && selDs.options[selDs.selectedIndex]) {
        dsId = selDs.options[selDs.selectedIndex].getAttribute('data-id') || selDs.options[selDs.selectedIndex].dataset?.id || '';
    }
    if (!dsId && window._xmla_datasets_cache) {
        const found = window._xmla_datasets_cache.find(d => d.name === dsName);
        if (found) dsId = found.id;
    }

    const btnHistory = document.getElementById(scope === 'model' ? 'wf-xmla-btn-history-ds' : (scope === 'table' ? 'wf-xmla-btn-history-tbl' : 'wf-xmla-btn-history-part'));
    const originalContent = btnHistory ? btnHistory.innerHTML : '';
    const SPIN_ICON = '<svg class="spinning" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" style="display:inline-block;vertical-align:middle;animation:spin 0.8s linear infinite;"><path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67"/></svg>';
    if (btnHistory) { btnHistory.disabled = true; btnHistory.innerHTML = SPIN_ICON; }

    if (window.expandConsole) window.expandConsole('wf-out-xmla-logs');
    if (logsEl) {
        logsEl.innerText += `\n[${new Date().toLocaleTimeString()}] 📜 正在查询 [${dsName}${tblName ? ` ▸ ${tblName}` : ''}${partName ? ` ▸ ${partName}` : ''}] 的云端刷新审计历史...\n`;
        logsEl.scrollTop = logsEl.scrollHeight;
    }

    try {
        const res = await fetch('/api/xmla/refresh-status', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                xmla_endpoint: endpoint,
                access_token: token,
                dataset_name: tblName || dsName,
                dataset_id: dsId
            })
        });
        const data = await res.json();

        if (data.success && data.history && data.history.length > 0) {
            const tableRows = data.history.map((h, i) => ({
                '#': i + 1,
                status: h.status === 'Completed' ? '✅ Completed' : (h.status === 'Failed' ? '❌ Failed' : (h.status === 'Unknown' ? 'ℹ️ Unknown' : '🔄 In Progress')),
                refreshType: h.refreshType || 'ViaApi',
                startTime: h.startTime || '-',
                endTime: h.endTime || '进行中...',
                duration: h.duration || '-',
                error: h.error || '-'
            }));

            if (logsEl) {
                logsEl.innerText += `✅ 成功获取 ${data.history.length} 条历史刷新审计记录！\n`;
                if (data.row_count !== null && data.row_count !== undefined) {
                    logsEl.innerText += `📈 目标表当前实时行数: ${Number(data.row_count).toLocaleString()} 行\n`;
                }
                logsEl.scrollTop = logsEl.scrollHeight;
            }

            let titlePrefix = '📜 语义模型';
            if (scope === 'table') titlePrefix = `📜 数据表 [${tblName}] (归属模型: ${dsName})`;
            else if (scope === 'partition') titlePrefix = `📜 分区 [${partName || '全表'}] (模型: ${dsName} ▸ 表: ${tblName})`;
            else titlePrefix = `📜 模型 [${dsName}] 云端刷新历史审计`;

            if (data.row_count !== null && data.row_count !== undefined) {
                titlePrefix += ` — 实时行数: ${Number(data.row_count).toLocaleString()} 行`;
            }

            if (window.showUniversalDataModal) {
                window.showUniversalDataModal({
                    title: `${titlePrefix} (最近 ${tableRows.length} 次刷新)`,
                    data: tableRows,
                    columns: ['#', 'status', 'refreshType', 'startTime', 'endTime', 'duration', 'error'],
                    displayNames: ['#', 'Status (状态)', 'Type (类型)', 'Start Time (UTC+8)', 'End Time (UTC+8)', 'Duration (耗时)', 'Error Details (异常明细)'],
                    enableSearch: true,
                    enableColumnFilter: true
                });
            }
            if (window.showNotification) {
                window.showNotification(`📜 成功获取 [${dsName}] 的 ${tableRows.length} 条历史刷新审计！`, 'success');
            }
        } else {
            const noHistMsg = `⚠️ 暂未查询到 [${dsName}] 的云端刷新审计记录 (可能未曾通过 API/计划刷新，或权限受限)。`;
            if (logsEl) {
                logsEl.innerText += `${noHistMsg}\n`;
                logsEl.scrollTop = logsEl.scrollHeight;
            }
            if (window.showNotification) window.showNotification(noHistMsg, 'warning');
        }
    } catch (err) {
        if (logsEl) logsEl.innerText += `❌ 查询刷新历史异常: ${err.message}\n`;
        if (window.showNotification) window.showNotification(`❌ 查询异常: ${err.message}`, 'error');
    } finally {
        if (btnHistory) { btnHistory.disabled = false; btnHistory.innerHTML = originalContent; }
        if (logsEl) logsEl.scrollTop = logsEl.scrollHeight;
    }
};
