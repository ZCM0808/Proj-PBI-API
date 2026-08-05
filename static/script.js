
window.expandConsole = function(id) {
    const consoleEl = document.getElementById(id);
    if (!consoleEl) return;
    const chevron = document.getElementById(id + '-chevron');
    if (consoleEl.classList.contains('collapsed-console')) {
        consoleEl.classList.remove('collapsed-console');
        if (chevron) chevron.style.transform = 'rotate(90deg)';
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
// Global Context Management Functions
window.addListRow = function(containerId, alias = "", id = "") {
    const container = document.getElementById(containerId);
    if (!container) return;
    const type = containerId === 'workspace-list' ? 'groups' : (containerId === 'dataset-list' ? 'datasets' : 'reports');
    const typeStr = containerId.split('-')[0];
    
    const row = document.createElement('div');
    row.style.cssText = "display: flex; gap: 8px; align-items: center;";
    row.innerHTML = `
        <input type="radio" name="${containerId}-radio" style="cursor: pointer; margin-right: 4px;" title="选中为默认/活动 (Set as Default/Active)">
        <input type="text" class="settings-input alias-input" placeholder="Alias (e.g. DEV)" value="${alias}" style="flex: 1; min-width: 0; padding: 4px 8px; font-size: 0.75rem;">
        <input type="text" class="settings-input id-input" placeholder="GUID" value="${id}" style="flex: 2; min-width: 0; padding: 4px 8px; font-size: 0.75rem;">
        <button type="button" onclick="if(this.parentElement.parentElement.children.length > 1) { this.parentElement.remove(); } else { alert('必须保留至少一个输入框！(At least one row must be kept)'); }" style="color: var(--error-light); background: transparent; border: none; cursor: pointer; font-size: 1.2rem; line-height: 1; padding: 0 4px; opacity: 0.3; transition: opacity 0.2s;" onmouseover="this.style.opacity='1'" onmouseout="this.style.opacity='0.3'">&times;</button>
    `;
    container.appendChild(row);
    
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
        alert(`✅ 验证成功 (Valid)\n名称: ${result.name}`);
    });
};

window.scanItems = async function(type, btn) {
    
    const originalText = btn.innerHTML;
    btn.innerHTML = '⏳ Scanning...';
    btn.disabled = true;
    
    let workspaceId = document.getElementById('active-workspace')?.value || '';
    if (!workspaceId) {
        const wList = window.getListData('workspace-list');
        if (wList.length > 0) workspaceId = wList[0].id;
    }
    
    try {
        const res = await fetch(`/api/scan/${type}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                pbi_client_id: document.getElementById('set-client').value.trim(),
                pbi_client_secret: document.getElementById('set-secret').value.trim(),
                pbi_tenant_id: document.getElementById('set-tenant').value.trim(),
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
                row.style.cssText = 'display: flex; align-items: center; gap: 8px; cursor: pointer; padding: 4px; border-radius: 4px; transition: background 0.2s;';
                row.onmouseover = () => row.style.background = 'var(--overlay-5)';
                row.onmouseout = () => row.style.background = 'transparent';
                
                row.innerHTML = `
                    <input type="checkbox" value="${item.id}" data-name="${item.name.replace(/"/g, '&quot;')}" checked>
                    <span style="flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-size: 0.8rem;" title="${item.name}">${item.name}</span>
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
                    if (!existingGuids.has(guid)) {
                        window.addListRow(targetListId, cb.getAttribute('data-name'), guid);
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
        const alias = row.querySelector('.alias-input').value.trim();
        const id = row.querySelector('.id-input').value.trim();
        if (alias || id) data.push({ alias, id });
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

window.renderEnvIdentity = function() {
    const appName = localStorage.getItem('pbi_app_name');
    const tenantId = localStorage.getItem('pbi_tenant_id');
    const tenantEl = document.getElementById('display-tenant');
    const clientEl = document.getElementById('display-client');
    
    if (tenantEl) {
        if (tenantId) {
            tenantEl.style.display = 'inline-flex';
            tenantEl.querySelector('strong').textContent = tenantId;
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
            sunIcon.style.display = 'none';
            moonIcon.style.display = 'block';
        } else {
            sunIcon.style.display = 'block';
            moonIcon.style.display = 'none';
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
            const resPbi = await fetch('/static/swagger.json');
            if (resPbi.ok) {
                swagger = await resPbi.json();
            } else {
                console.error("Failed to load Power BI Swagger: server returned status", resPbi.status);
            }
        } catch (e) {
            console.error("Failed to load Power BI Swagger:", e);
        }

        try {
            const resFabric = await fetch('/static/fabric_swagger.json');
            if (resFabric.ok) {
                fabricSwagger = await resFabric.json();
            } else {
                console.warn("Failed to load Fabric Swagger: server returned status", resFabric.status);
            }
        } catch (e) {
            console.warn("Failed to load Fabric Swagger:", e);
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
                        originalSetItem.call(localStorage, key, value);
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
                    localStorage.setItem('pbi-theme', data.data);
                    if (data.data === 'dark') {
                        document.documentElement.setAttribute('data-theme', 'dark');
                    } else {
                        document.documentElement.removeAttribute('data-theme');
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
                let editBtnHtml = '';
                
                if (isBookmarked) {
                    const alias = bmData.alias || '';
                    const tags = bmData.userTags || [];
                    if (alias) metaHtml += `<span class="bm-alias">${alias}</span>`;
                    tags.forEach(t => metaHtml += `<span class="bm-tag">${t}</span>`);
                    editBtnHtml = `<button class="bm-edit-btn" title="Edit alias & tags">✏️</button>`;
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
                        ${editBtnHtml}
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
                insertNoteBtn.className = 'bookmark-btn';
                insertNoteBtn.innerHTML = '📝';
                insertNoteBtn.title = "Insert API Link to Note";
                insertNoteBtn.onclick = (e) => {
                    e.stopPropagation();
                    insertSpecificApiIntoNote(ep.method, ep.path);
                };

                itemEl.appendChild(badge);
                itemEl.appendChild(nameEl);
                itemEl.appendChild(insertNoteBtn);
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
                const editBtn = nameEl.querySelector('.bm-edit-btn');
                if (editBtn) {
                    editBtn.onclick = (e) => {
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

    const copyResBodyBtn = document.getElementById('copy-res-body-btn');
    if (copyResBodyBtn) {
        const origResBodyBtnHTML = copyResBodyBtn.innerHTML;
        copyResBodyBtn.addEventListener('click', async () => {
            if (window.currentJsonResponse) {
                try {
                    await navigator.clipboard.writeText(JSON.stringify(window.currentJsonResponse, null, 2));
                    copyResBodyBtn.innerHTML = '<span style="font-size: 12px; padding: 0 4px;">Copied!</span>';
                    copyResBodyBtn.style.color = 'var(--accent)';
                    setTimeout(() => {
                        copyResBodyBtn.innerHTML = origResBodyBtnHTML;
                        copyResBodyBtn.style.color = '';
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
        const origMainCopyBtnHTML = copyBtn.innerHTML;
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
            
            navigator.clipboard.writeText(curlCmd).then(() => {
                copyBtn.innerHTML = '<span style="font-size: 12px; font-weight: bold;">Copied!</span>';
                copyBtn.style.borderColor = 'var(--success)';
                copyBtn.style.color = 'var(--success)';
                setTimeout(() => {
                    copyBtn.innerHTML = origMainCopyBtnHTML;
                    copyBtn.style.borderColor = '';
                    copyBtn.style.color = '';
                }, 1200);
            }).catch(err => {
                console.error('Copy failed:', err);
            });
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
        const savedTop = modalContent.getAttribute('data-drag-top');
        const savedLeft = modalContent.getAttribute('data-drag-left');
        if (savedTop !== null && savedLeft !== null) {
            if (parent) {
                parent.style.alignItems = 'flex-start';
                parent.style.justifyContent = 'flex-start';
            }
            modalContent.style.position = 'fixed';
            modalContent.style.top = savedTop;
            modalContent.style.left = savedLeft;
            modalContent.style.margin = '0';
            modalContent.style.transform = 'none';
            modalContent.style.animation = 'none';
        } else {
            // Un-dragged state: Freeze top-left origin firmly at 60px from viewport top
            if (parent) {
                parent.style.alignItems = 'flex-start';
                parent.style.justifyContent = 'center';
            }
            modalContent.style.position = 'relative';
            modalContent.style.top = '0px';
            modalContent.style.left = '0px';
            modalContent.style.margin = '0 auto';
            modalContent.style.transform = 'none';
            modalContent.style.animation = 'none';
        }
    };

    window.makeDraggable = makeDraggable;
    function makeDraggable(modalContent, dragHandle) {
        let isDragging = false;
        let startMouseX, startMouseY;
        let initialPageTop = 0, initialPageLeft = 0;

        dragHandle.style.cursor = 'grab';

        dragHandle.addEventListener('mousedown', (e) => {
            if (window.innerWidth <= 768) return; // Prevent drag on mobile
            isDragging = true;
            dragHandle.style.cursor = 'grabbing';
            startMouseX = e.clientX;
            startMouseY = e.clientY;

            // 1. Disable parent overlay Flex centering so layout Reflow never recalculates center lines
            const parent = modalContent.parentElement;
            if (parent) {
                parent.style.alignItems = 'flex-start';
                parent.style.justifyContent = 'flex-start';
            }

            // 2. Kill CSS keyframe animation to prevent animation re-evaluation
            modalContent.style.animation = 'none';

            // 3. Capture absolute physics viewport rect
            const rect = modalContent.getBoundingClientRect();
            initialPageTop = rect.top;
            initialPageLeft = rect.left;

            // 4. Lock coordinates
            modalContent.style.position = 'fixed';
            modalContent.style.top = `${initialPageTop}px`;
            modalContent.style.left = `${initialPageLeft}px`;
            modalContent.style.margin = '0';
            modalContent.style.transform = 'none';
            modalContent.setAttribute('data-drag-top', `${initialPageTop}px`);
            modalContent.setAttribute('data-drag-left', `${initialPageLeft}px`);

            document.body.style.userSelect = 'none';
        });

        document.addEventListener('mousemove', (e) => {
            if (!isDragging) return;
            const dx = e.clientX - startMouseX;
            const dy = e.clientY - startMouseY;

            let newTop = initialPageTop + dy;
            let newLeft = initialPageLeft + dx;

            modalContent.style.top = `${newTop}px`;
            modalContent.style.left = `${newLeft}px`;
            modalContent.setAttribute('data-drag-top', `${newTop}px`);
            modalContent.setAttribute('data-drag-left', `${newLeft}px`);
        });

        document.addEventListener('mouseup', () => {
            if (isDragging) {
                isDragging = false;
                dragHandle.style.cursor = 'grab';
                document.body.style.userSelect = '';
            }
        });
    }

    function setupFLIPModal(btnOpen, btnClose, modalOverlay, onLoadCallback = null) {
        if (!btnOpen || !btnClose || !modalOverlay) return;
        const modalContent = modalOverlay.querySelector('.modal-content');
        const modalHeader = modalOverlay.querySelector('.modal-header');

        if (modalContent && modalHeader) {
            makeDraggable(modalContent, modalHeader);
        }

        btnOpen.addEventListener('click', async () => {
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
                terminal.scrollTop = Math.max(0, terminal.scrollHeight - terminal.clientHeight * 0.66); // Auto-scroll
                
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
                        items.forEach(item => window.addListRow(containerId, item.alias || item.name, item.id));
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
                for (let radio of authModeRadios) {
                    if (radio.value === (data.AUTH_MODE || 'service_principal')) {
                        radio.checked = true;
                        break;
                    }
                }

            } catch (err) {
                console.error('Failed to load settings:', err);
            }
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
                        localStorage.setItem('pbi_tenant_id', tenantId);
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
            saveSettingsBtn.style.minWidth = rect.width + 'px';
            saveSettingsBtn.style.minHeight = rect.height + 'px';
            saveSettingsBtn.style.boxSizing = 'border-box';
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
                    setTimeout(() => {
                        settingsModal.classList.add('fade-out');
                        setTimeout(() => {
                            settingsModal.style.display = 'none';
                            settingsModal.classList.remove('fade-out');
                            saveSettingsBtn.disabled = false;
                            saveSettingsBtn.style.minWidth = '';
                            saveSettingsBtn.style.minHeight = '';
                            saveSettingsBtn.style.boxSizing = '';
                            saveSettingsBtn.textContent = '💾 保存配置 (Save & Apply)';
                        }, 250);
                    }, 800);
                } else {
                    alert('保存失败: ' + result.message);
                    saveSettingsBtn.disabled = false;
                    saveSettingsBtn.style.minWidth = '';
                    saveSettingsBtn.style.minHeight = '';
                    saveSettingsBtn.style.boxSizing = '';
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
    container.className = 'json-table-viewer';
    
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
            table.className = 'data-table';
            table.style.cssText = "width: 100%; border-collapse: collapse; text-align: left;";
            
            const thead = document.createElement('thead');
            thead.style.cssText = "position: sticky; top: 0; background: var(--bg-color); z-index: 5;";
            const trHead = document.createElement('tr');
            activeCols.forEach((col, idx) => {
                const th = document.createElement('th');
                th.textContent = col;
                th.style.cssText = "padding: 8px 12px; border-bottom: 1px solid var(--panel-border); font-weight: 600; cursor: pointer; user-select: none; resize: horizontal; overflow: hidden; min-width: 50px; max-width: 250px; white-space: nowrap; text-overflow: ellipsis;";
                th.title = col + " (Click to sort, Drag right edge to resize)";
                th.onclick = (e) => window.sortTable(th, e, idx);
                trHead.appendChild(th);
            });
            thead.appendChild(trHead);
            table.appendChild(thead);
            
            const tbody = document.createElement('tbody');
            arr.forEach(item => {
                const tr = document.createElement('tr');
                tr.style.cssText = "transition: background 0.2s; cursor: default;";
                tr.onmouseover = () => tr.style.background = "rgba(255,255,255,0.02)";
                tr.onmouseout = () => tr.style.background = "transparent";
                activeCols.forEach(col => {
                    const td = document.createElement('td');
                    td.style.cssText = "border: 1px solid var(--panel-border); padding: 8px; color: var(--text-primary); max-width: 300px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;";
                    let val = item ? item[col] : undefined;
                    if (typeof val === 'object' && val !== null) {
                        td.textContent = JSON.stringify(val);
                    } else {
                        td.textContent = val !== undefined && val !== null ? String(val) : '';
                    }
                    td.title = td.textContent;
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

    // Explicitly bind click-outside mousedown listener to guarantee closing when overlay is clicked
    if (!noteModal.dataset.clickBound) {
        // Handle both mousedown and click for maximum responsiveness on the backdrop
        const handleBackdropClose = (e) => {
            if (e.target === noteModal) {
                window.closeNoteModal();
            }
        };
        noteModal.addEventListener('mousedown', handleBackdropClose);
        noteModal.addEventListener('click', handleBackdropClose);
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
                maxHeight: "350px",
                placeholder: "Start typing your note here... (Markdown is supported)",
                toolbar: ['bold', 'italic', 'heading', '|', 'quote', 'unordered-list', 'ordered-list', '|', 'link', 'image', '|', 'preview', 'side-by-side', 'fullscreen']
            });
        }

        // Initialize drag helper
        const noteHeader = noteModal.querySelector('.modal-header');
        if (noteContent && noteHeader && window.makeDraggable) {
            window.makeDraggable(noteContent, noteHeader);
        }
    } else {
        // Just refresh to avoid layout issues in display:none modals
        setTimeout(() => easyMDE.codemirror.refresh(), 100);
    }

    // Load history
    window.searchNotes();
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
                    <button type="button" onclick="document.getElementById('note-error-detail-modal').style.display='none'" style="background:none; border:none; color:var(--text-secondary); cursor:pointer; font-size:1.2rem;">✕</button>
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



// Global document listener to close Note window when clicking any blank area outside of it
document.addEventListener('mousedown', (e) => {
    const noteModal = document.getElementById('modal-note');
    if (noteModal && noteModal.style.display === 'flex') {
        const noteContent = noteModal.querySelector('.modal-content');
        if (noteContent && !noteContent.contains(e.target)) {
            // Do not close if clicking the custom alert/confirm dialog
            if (e.target.closest('#custom-dialog-modal')) {
                return;
            }
            // Do not close if clicking the button that opens it
            const btnNote = document.getElementById('btn-note');
            if (btnNote && btnNote.contains(e.target)) {
                return;
            }
            // Do not close if clicking any "Insert API" button in the tree or history
            if (e.target.closest('.bookmark-btn') || e.target.title === 'Insert API Link to Note') {
                return;
            }
            window.closeNoteModal();
        }
    }
});


    // Custom Dialog Modal System (Alert/Confirm) replacing native popups
    window.showCustomAlert = function(message, title = "🔔 System Message") {
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
                <button class="btn-action-secondary" id="custom-alert-ok-btn" style="padding: 0.5rem 1.25rem;">
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
                <button class="btn-action-secondary" id="custom-confirm-cancel-btn" style="padding: 0.5rem 1.25rem;">
                    Cancel
                </button>
                <button class="btn-action-primary" id="custom-confirm-ok-btn" style="padding: 0.5rem 1.25rem; border: none; background: var(--accent); color: var(--accent-text);">
                    Confirm
                </button>
            `;
            const close = (result) => {
                modal.style.opacity = '0';
                content.style.transform = 'scale(0.95)';
                setTimeout(() => { modal.style.visibility = 'hidden'; }, 250);
                resolve(result);
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
            modal.style.visibility = 'visible';
            modal.style.opacity = '1';
            content.style.transform = 'scale(1)';
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
                <button class="btn-action-secondary" id="custom-dialog-ok-btn" style="padding: 0.5rem 1.25rem;">
                    Close
                </button>
            `;
            
            const close = () => {
                modal.style.opacity = '0';
                content.style.transform = 'scale(0.95)';
                setTimeout(() => { 
                    modal.style.visibility = 'hidden'; 
                    modal.style.display = 'none';
                }, 250);
                resolve();
            };
            
            document.getElementById('custom-dialog-ok-btn').onclick = close;
            modal.querySelector('.close-btn').onclick = close;
            
            modal.style.display = 'flex';
            modal.style.visibility = 'visible';
            modal.style.opacity = '1';
            content.style.transform = 'scale(1)';
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
        window.showCustomAlert(message);
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
            btn.title = '免审模式已开启 (点击关闭)';
            icon.textContent = '🔓';
            text.textContent = '免审模式';
            btn.style.transform = 'scale(1.05)';
            setTimeout(() => btn.style.transform = 'scale(1)', 150);
        } else {
            btn.style.borderColor = 'var(--panel-border)';
            btn.style.color = 'var(--text-secondary)';
            btn.title = '审批模式已开启 (点击开启免审)';
            icon.textContent = '🔒';
            text.textContent = '审批模式';
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
        loadingDiv.textContent = '思考中...';
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
                loadingDiv.textContent = "抱歉，无法连接到 AI：" + (data.message || "未知错误");
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
                                        AI 请求执行高危操作
                                    </div>
                                    <div style="font-size: 0.85rem; margin-bottom: 4px;">工具名称: <code style="background: var(--shadow-light); padding: 2px 6px; border-radius: 4px;">${data.name}</code></div>
                                    <pre style="background: var(--input-bg); padding: 8px; border-radius: 6px; font-size: 0.8rem; overflow-x: auto; margin-bottom: 12px; white-space: pre-wrap; color: var(--info-light, #a5d6ff);">${JSON.stringify(data.args, null, 2)}</pre>
                                    <div style="display: flex; gap: 8px;">
                                        <button class="approve-btn" style="flex: 1; background: var(--success); color: white; border: none; padding: 6px 0; border-radius: 6px; cursor: pointer; font-size: 0.85rem; font-weight: bold; transition: all 0.2s;" onmouseover="this.style.transform='scale(1.05)'; this.style.boxShadow='0 4px 12px var(--status-success-bg)'" onmouseout="this.style.transform='scale(1)'; this.style.boxShadow='none'">✅ 批准执行</button>
                                        <button class="reject-btn" style="flex: 1; background: var(--error); color: white; border: none; padding: 6px 0; border-radius: 6px; cursor: pointer; font-size: 0.85rem; font-weight: bold; transition: all 0.2s;" onmouseover="this.style.transform='scale(1.05)'; this.style.boxShadow='0 4px 12px var(--status-error-bg)'" onmouseout="this.style.transform='scale(1)'; this.style.boxShadow='none'">❌ 拒绝</button>
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
                                    btnApprove.innerHTML = approved ? '执行中...' : '已拒绝';
                                    
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
                            loadingDiv.textContent = "抱歉，发生错误：" + (data.message || "未知错误");
                            loadingDiv.style.color = "var(--error)";
                        }
                    } catch (e) {
                        // ignore incomplete json parses gracefully
                    }
                }
            }
        } catch (e) {
            loadingDiv.textContent = "网络请求失败，无法连接到 AI。";
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
    let isWorkflowRunning = false;

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

            
            // Auto-fill active workspace/report if available
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
            
            // Auto trigger loadPages if there's a selection
            setTimeout(loadPages, 500);


            const activeW = document.getElementById('active-workspace')?.value;
            const activeR = document.getElementById('active-report')?.value;
            if (activeW) document.getElementById('wf-exp-workspace').value = activeW;
            if (activeR) document.getElementById('wf-exp-report').value = activeR;
            if (activeW) document.getElementById('wf-vis-workspace').value = activeW;
            if (activeR) document.getElementById('wf-vis-report').value = activeR;
            if (activeW) document.getElementById('wf-ds-workspace').value = activeW;
            const activeD = document.getElementById('active-dataset')?.value;
            if (activeD) document.getElementById('wf-ds-dataset').value = activeD;
            if (activeW) document.getElementById('wf-rvc-workspace').value = activeW;
            if (activeR) document.getElementById('wf-rvc-report').value = activeR;

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
        wfSelector.addEventListener('change', (e) => {
            const val = e.target.value;
            // Hide all first
            document.getElementById('wf-config-export_report').style.display = 'none';
            document.getElementById('wf-export-wrapper').style.display = 'none';
            document.getElementById('wf-config-smart_pipeline').style.display = 'none';
            document.getElementById('wf-config-export_visual').style.display = 'none';
            document.getElementById('wf-config-export_dataset_tables').style.display = 'none';
            document.getElementById('wf-config-report_view_count').style.display = 'none';
            document.getElementById('wf-config-check_permissions').style.display = 'none';
              const gumPane = document.getElementById('wf-config-global_user_manager'); if(gumPane) gumPane.style.display = 'none';
            const localQPane = document.getElementById('wf-container-local_model_query'); if(localQPane) localQPane.style.display = 'none';
            
            if (val === 'smart_pipeline') {
                document.getElementById('wf-config-smart_pipeline').style.display = 'block';
                document.getElementById('wf-btn-runall').style.display = 'flex';
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
                if (!window._fetchedLocalInstances) {
                    window.fetchLocalModelInstances();
                    window._fetchedLocalInstances = true;
                }
                window.updateLocalDaxTemplate(); // Init template
            } else if (val === 'export_visual') {
                document.getElementById('wf-config-export_visual').style.display = 'block';
                document.getElementById('wf-btn-runall').style.display = 'flex';
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
        });

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
                    out.textContent += `Error getting embed info: ${data.error}\n`;
                    setTimeout(() => { out.scrollTop = Math.max(0, out.scrollHeight - out.clientHeight * 0.66); }, 10);
                    pageSelect.innerHTML = '<option value="">Error</option>';
                    return;
                }
                
                out.textContent += `Token received. Initializing Power BI Embedded iframe...\n`;
                    setTimeout(() => { out.scrollTop = Math.max(0, out.scrollHeight - out.clientHeight * 0.66); }, 10);
                embedContainer.style.display = 'block';
                
                // 2. Embed the report
                const models = window['powerbi-client'].models;
                const config = {
                    type: 'report',
                    tokenType: models.TokenType.Embed,
                    accessToken: data.embedToken,
                    embedUrl: data.embedUrl,
                    id: rId,
                    permissions: models.Permissions.Read,
                    settings: {
                        panes: { filters: { visible: false }, pageNavigation: { visible: false } }
                    }
                };
                
                // Reset container
                powerbi.reset(embedContainer);
                currentEmbeddedReport = powerbi.embed(embedContainer, config);
                
                currentEmbeddedReport.off("loaded");
                currentEmbeddedReport.on("loaded", async function () {
                    out.textContent += `Report rendered in UI! Fetching Pages via JS SDK...\n`;
                    setTimeout(() => { out.scrollTop = Math.max(0, out.scrollHeight - out.clientHeight * 0.66); }, 10);
                    const pages = await currentEmbeddedReport.getPages();
                    pageSelect.innerHTML = '<option value="">-- Select a Page --</option>';
                    pageSelect.innerHTML += '<option value="ALL">🌟 ALL PAGES (全部页面) 🌟</option>';
                    pages.forEach(p => {
                        const opt = document.createElement('option');
                        opt.value = p.name; // This is the internal name
                        opt.textContent = p.displayName + ' (' + p.name + ')';
                        pageSelect.appendChild(opt);
                    });
                });
                
                currentEmbeddedReport.off("error");
                currentEmbeddedReport.on("error", function (event) {
                    out.textContent += `Embed Error: ${event.detail.message}\n`;
                    setTimeout(() => { out.scrollTop = Math.max(0, out.scrollHeight - out.clientHeight * 0.66); }, 10);
                });

            } catch (err) {
                out.textContent += `Exception: ${err.message}\n`;
                    setTimeout(() => { out.scrollTop = Math.max(0, out.scrollHeight - out.clientHeight * 0.66); }, 10);
                pageSelect.innerHTML = '<option value="">Error loading pages</option>';
            }
        };

        const loadVisuals = async () => {
            const pId = document.getElementById('wf-vis-page').value;
            const visSelect = document.getElementById('wf-vis-visual');
            visSelect.innerHTML = '<option value="">Loading visuals...</option>';
            
            if (!pId || !currentEmbeddedReport) return;
            
            if (pId === 'ALL') {
                visSelect.innerHTML = '<option value="ALL">🌟 ALL VISUALS IN ALL PAGES 🌟</option>';
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
                visuals.forEach(v => {
                    const opt = document.createElement('option');
                    opt.value = v.name;
                    const vTitle = v.title ? v.title : (v.type ? `[${v.type}]` : 'Unnamed Visual');
                    opt.textContent = vTitle + ' (' + v.name + ')';
                    visSelect.appendChild(opt);
                });
            } catch (err) {
                visSelect.innerHTML = '<option value="">Error loading visuals</option>';
            }
        };

        document.getElementById('wf-vis-workspace').addEventListener('change', loadPages);
        document.getElementById('wf-vis-report').addEventListener('change', loadPages);
        document.getElementById('wf-vis-page').addEventListener('change', loadVisuals);

        const executeExportVisual = async () => {
            const out = document.getElementById('wf-out-vis');
            out.textContent = `[${new Date().toLocaleTimeString()}] Triggering JS SDK exportData() -> Excel...\n`;
            
            const pId = document.getElementById('wf-vis-page').value;
            const visId = document.getElementById('wf-vis-visual').value;
            const expTypeStr = document.getElementById('wf-vis-type').value;
            const rows = parseInt(document.getElementById('wf-vis-rows').value) || 100000;
            
            if (!pId || !visId || !currentEmbeddedReport) {
                out.textContent += `Error: Please select page and visual.\n`;
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
                
                for (let page of targetPages) {
                    out.textContent += `\n> Navigating to Page: [${page.displayName}]...\n`;
                    setTimeout(() => { out.scrollTop = Math.max(0, out.scrollHeight - out.clientHeight * 0.66); }, 10);
                    await page.setActive();
                    await new Promise(r => setTimeout(r, 1500)); // wait for visuals to load
                    
                    const visuals = await page.getVisuals();
                    const targetVisuals = (visId === 'ALL') ? visuals : visuals.filter(v => v.name === visId);
                    
                    for (let visual of targetVisuals) {
                        const vName = visual.title || visual.type || visual.name;
                        out.textContent += `  - Visual [${vName}]: Extracting...`;
                    setTimeout(() => { out.scrollTop = Math.max(0, out.scrollHeight - out.clientHeight * 0.66); }, 10);
                        try {
                            const result = await visual.exportData(exportType, rows);
                            
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

        // --- End Export Visual Data Logic ---

        document.getElementById('wf-btn-runall').onclick = async function() {
            if (isWorkflowRunning) return;
            isWorkflowRunning = true;
            this.disabled = true;
            this.innerHTML = '<span class="loader" style="width: 12px; height: 12px; border-width: 2px;"></span> Running...';
            
            try {
                const wfType = document.getElementById('wf-selector').value;
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

                    // Smart Pipeline trigger
                }
            } finally {
                isWorkflowRunning = false;
                if (!window.skipWfBtnReset) {
                    this.disabled = false;
                    this.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg> Run Full Workflow';
                }
                window.skipWfBtnReset = false;
            }
        };
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
        if(!confirm('Date range is larger than 30 days. This will make many API calls. Continue?')) return;
    }

    containersDiv.style.display = 'flex';
    logsDiv.innerHTML = '';
    
    const appendLog = (msg) => {
        const div = document.createElement('div');
        div.textContent = msg;
        logsDiv.appendChild(div);
        setTimeout(() => { logsDiv.scrollTop = Math.max(0, logsDiv.scrollHeight - logsDiv.clientHeight * 0.66); }, 10);
    };

    appendLog(`[INIT] Fetching Activity Events from ${startStr} to ${endStr}...`);
    statusDiv.textContent = `Running analysis...`;
    
    // Setup dynamic table skeleton (2 Columns)
    tableDiv.innerHTML = `
    <table data-table-id="rvc" class="data-table" style="width: 100%; border-collapse: collapse; font-size: 0.75rem; text-align: left;">
        <thead style="position: sticky; top: 0; background: var(--bg-color); z-index: 5;">
            <tr>
                <th onclick="window.sortTable(this, event, 0)" style="padding: 8px 12px; border-bottom: 1px solid var(--panel-border); font-weight: 600; cursor: pointer; user-select: none; resize: horizontal; overflow: hidden; min-width: 50px;" title="Click to sort, Shift+Click for multi-sort, Drag right edge to resize">Date</th>
                <th onclick="window.sortTable(this, event, 1)" style="padding: 8px 12px; border-bottom: 1px solid var(--panel-border); font-weight: 600; cursor: pointer; user-select: none; resize: horizontal; overflow: hidden; min-width: 50px;" title="Click to sort, Shift+Click for multi-sort, Drag right edge to resize">View Count</th>
            </tr>
        </thead>
        <tbody id="rvc-dynamic-tbody"></tbody>
    </table>`;
    const tbody = document.getElementById('rvc-dynamic-tbody');
    
    let totalViews = 0;
    window._rvcDateStats = {}; // dateIso -> [events...]
    
    const renderTableRows = () => {
        let rowsHtml = '';
        const sortedDates = Object.keys(window._rvcDateStats).sort(); // Chronological
        
        for(const d of sortedDates) {
            const eventsArr = window._rvcDateStats[d];
            const count = eventsArr.length;
            rowsHtml += `
                <tr style="transition: background 0.2s;" onmouseover="this.style.background='var(--overlay-10)'" onmouseout="this.style.background='transparent'">
                    <td style="padding: 6px 12px; color: var(--text-primary); font-family: monospace; border-bottom: 1px solid var(--panel-border);">${d}</td>
                    <td style="padding: 6px 12px; color: var(--info); font-weight: 500; border-bottom: 1px solid var(--panel-border);">
                        ${count > 0 ? `<span style="cursor: pointer; text-decoration: underline; text-underline-offset: 2px;" onclick="window.showViewDetails('${d}')">${count}</span>` : count}
                    </td>
                </tr>
            `;
        }
        tbody.innerHTML = rowsHtml;
    };

    window.showViewDetails = function(dateIso) {
        // Reset sorting state for this table
        if (window.tableSortStates) {
            window.tableSortStates['drilldown'] = [];
        }
        
        const events = window._rvcDateStats[dateIso] || [];
        const tbody = document.getElementById('view-details-tbody');
        let html = '';
        if (events.length === 0) {
            html = '<tr><td colspan="4" style="text-align: center; padding: 10px;">No details found</td></tr>';
        } else {
            // Sort events by CreationTime descending by default
            events.sort((a, b) => new Date(b.CreationTime + (b.CreationTime.endsWith('Z') ? '' : 'Z')) - new Date(a.CreationTime + (a.CreationTime.endsWith('Z') ? '' : 'Z')));
            for(const e of events) {
                let timeStr = e.CreationTime || '';
                if(timeStr) {
                    if(!timeStr.endsWith('Z')) timeStr += 'Z';
                    const d = new Date(timeStr);
                    d.setUTCHours(d.getUTCHours() + 8); // Shift to UTC+8
                    const pad = n => n.toString().padStart(2, '0');
                    timeStr = `${d.getUTCFullYear()}-${pad(d.getUTCMonth()+1)}-${pad(d.getUTCDate())} ${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}:${pad(d.getUTCSeconds())}`;
                }
                const time = timeStr;
                const user = e.UserId || e.UserKey || 'Unknown';
                const reportName = e.ItemName || 'Unknown Report';
                const ip = e.ClientIP || 'Unknown IP';
                const accessRoute = e.ConsumptionMethod || 'Direct/Unknown';
                const status = (e.IsSuccess === true || e.IsSuccess === 'true') ? '<span style="color: var(--success);">Success</span>' : '<span style="color: var(--error);">Failed</span>';
                
                html += `
                <tr style="border-bottom: 1px solid var(--panel-border);">
                    <td style="padding: 6px 12px; color: var(--text-secondary);">${time}</td>
                    <td style="padding: 6px 12px; color: var(--text-primary);">${user}</td>
                    <td style="padding: 6px 12px; color: var(--text-primary);">${reportName}</td>
                    <td style="padding: 6px 12px; color: var(--text-secondary);">${accessRoute}</td>
                    <td style="padding: 6px 12px; color: var(--text-secondary);">${ip}</td>
                    <td style="padding: 6px 12px; font-weight: 500;">${status}</td>
                </tr>
                `;
            }
        }
        
        // Reset sort visual cues on headers
        const table = document.querySelector('table[data-table-id="drilldown"]');
        if (table) {
            const headers = table.querySelectorAll('th');
            headers.forEach(th => {
                if(th.getAttribute('data-original-text')) {
                    th.textContent = th.getAttribute('data-original-text');
                } else {
                    th.setAttribute('data-original-text', th.textContent);
                }
            });
        }
        
        tbody.innerHTML = html;
        document.getElementById('view-details-title').textContent = `View Details - ${dateIso} (${events.length})`;
        
        // Ensure draggable is initialized
        const modalContent = document.getElementById('view-details-modal-content');
        const modalHeader = document.getElementById('view-details-modal-header');
        if (window.makeDraggable && !modalContent.hasAttribute('data-drag-init')) {
            window.makeDraggable(modalContent, modalHeader);
            modalContent.setAttribute('data-drag-init', 'true');
        }
        window.centerModal(modalContent);
        
        const modal = document.getElementById('view-details-modal');
        modal.style.display = 'flex';
        // force reflow
        void modal.offsetWidth;
        modal.style.visibility = 'visible';
        modal.style.opacity = '1';
    };

    window.copyViewDetails = function(btn) {
        const tbody = document.getElementById('view-details-tbody');
        if(!tbody) return;
        const rows = Array.from(tbody.querySelectorAll('tr'));
        
        // Format as TSV
        const lines = ["Time (UTC+8)\tUser ID\tReport Name\tAccess Route\tClient IP\tStatus"];
        rows.forEach(tr => {
            const cells = Array.from(tr.querySelectorAll('td')).map(td => td.innerText.trim());
            if (cells.length > 1) {
                lines.push(cells.join('\t'));
            }
        });
        const text = lines.join('\n');
        
        window.handleCopyAction(btn, text);
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
    btn.disabled = true;
    btn.innerHTML = 'Running...';
    
    try {
        let currentDate = new Date(dStart);
        while(currentDate <= dEnd) {
            const dateIso = currentDate.toISOString().split('T')[0];
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
                    appendLog(`[ERROR] ${res.status} ${res.statusText}`);
                    statusDiv.textContent = `Error: ${res.status} ${res.statusText}`;
                    statusDiv.style.color = 'var(--error)';
                    btn.disabled = false;
                    btn.innerHTML = 'Run Analysis';
                    return;
                }
                
                const resData = await res.json();
                if (resData.success === false) {
                    appendLog(`[ERROR] Proxy Error: ${resData.error || resData.message}`);
                    statusDiv.textContent = `Error: ${resData.error || resData.message}`;
                    statusDiv.style.color = 'var(--error)';
                    btn.disabled = false;
                    btn.innerHTML = 'Run Analysis';
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
                appendLog(`  -> Page ${pageCount}: Scanned ${events.length} events, found ${foundToday} target report views.`);
                continuationUri = payload.continuationUri || null;
                pageCount++;
                
                // Dynamically update the table as data flows in!
                if (foundToday > 0 || window._rvcDateStats[dateIso] !== undefined) {
                    renderTableRows();
                    
                }
            }
            currentDate.setDate(currentDate.getDate() + 1);
        }
        
        appendLog(`[DONE] Analysis Complete. Total Views: ${totalViews}`);
        statusDiv.textContent = `Analysis Complete: ${totalViews} total views.`;
        statusDiv.style.color = 'var(--success)';
        
    } catch (e) {
        appendLog(`[EXCEPTION] ${e.message}`);
        statusDiv.textContent = `Exception: ${e.message}`;
        statusDiv.style.color = 'var(--error)';
    } finally {
        btn.disabled = false;
        btn.innerHTML = 'Run Analysis';
    }
};


window.handleCopyAction = function(targetEl, text) {
    if(!text) return;
    navigator.clipboard.writeText(text).then(() => {
        const iconWrapper = targetEl.querySelector('.copy-icon-wrapper');
        const iconContainer = targetEl.querySelector('svg') || targetEl;
        const isSelfButton = targetEl.tagName === 'BUTTON' || targetEl.classList.contains('wf-copy-btn');
        
        if (isSelfButton) {
            const origHTML = targetEl.innerHTML;
            targetEl.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--success)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>';
            targetEl.style.color = 'var(--success)';
            setTimeout(() => { 
                targetEl.innerHTML = origHTML; 
                targetEl.style.color = '';
            }, 1500);
        } else if (iconWrapper) {
            const origHTML = iconWrapper.innerHTML;
            const origBg = iconWrapper.style.background;
            const origBorder = iconWrapper.style.borderColor;
            
            iconWrapper.innerHTML = '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="var(--success)" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>';
            iconWrapper.style.background = 'var(--status-success-bg)';
            iconWrapper.style.borderColor = 'var(--success)';
            
            if (window.showNotification) window.showNotification('Copied to clipboard!', 'success');
            setTimeout(() => { 
                iconWrapper.innerHTML = origHTML;
                iconWrapper.style.background = origBg;
                iconWrapper.style.borderColor = origBorder;
            }, 1500);
        } else if (iconContainer) {
            const origColor = iconContainer.style.color || '';
            const origStroke = iconContainer.getAttribute('stroke') || '';
            iconContainer.style.color = 'var(--success)';
            iconContainer.setAttribute('stroke', 'var(--success)');
            if (window.showNotification) window.showNotification('Copied to clipboard!', 'success');
            setTimeout(() => { 
                iconContainer.style.color = origColor; 
                if (origStroke) iconContainer.setAttribute('stroke', origStroke); else iconContainer.removeAttribute('stroke');
            }, 1500);
        } else {
            if (window.showNotification) window.showNotification('Copied to clipboard!', 'success');
        }
    }).catch(err => {
        alert('Failed to copy: ' + err);
    });
};




window.runCheckPermsWorkflow = async function() {
    const logsDiv = document.getElementById('wf-out-perms-logs');
    const tableDiv = document.getElementById('wf-out-perms-table');
    const statusDiv = document.getElementById('wf-perms-status');
    const btn = document.getElementById('btn-run-check-perms');
    
    btn.disabled = true;
    btn.innerHTML = 'Running...';
    
    logsDiv.innerHTML = '';
    
    const appendLog = (msg) => {
        const div = document.createElement('div');
        div.textContent = msg;
        logsDiv.appendChild(div);
        setTimeout(() => { logsDiv.scrollTop = Math.max(0, logsDiv.scrollHeight - logsDiv.clientHeight * 0.66); }, 10);
    };

    statusDiv.textContent = `Fetching /availableFeatures...`;
    statusDiv.style.color = 'var(--text-secondary)';
    appendLog(`[INIT] Calling GET /v1.0/myorg/availableFeatures ...`);
    
    try {
        const res = await fetch('/api/proxy', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ endpoint: '/availableFeatures', method: 'GET' })
        });
        
        if(!res.ok) {
            statusDiv.textContent = `Error: ${res.status} ${res.statusText}`;
            statusDiv.style.color = 'var(--error)';
            appendLog(`[ERROR] Failed to fetch: ${res.status} ${res.statusText}`);
            btn.disabled = false;
            btn.innerHTML = 'Run Check';
            return;
        }
        
        const data = await res.json();
        const payload = data.data || data;
        const featuresArray = payload.features;
        
        if (featuresArray && Array.isArray(featuresArray)) {
            appendLog(`[SUCCESS] Loaded ${featuresArray.length} features. Rendering table row by row...`);
            
            // Render table skeleton
            tableDiv.innerHTML = `
            <table data-table-id="perms" class="data-table" style="width: 100%; border-collapse: collapse; font-size: 0.75rem; text-align: left;">
                <thead style="position: sticky; top: 0; background: var(--bg-color); z-index: 5;">
                    <tr>
                        <th onclick="window.sortTable(this, event, 0)" style="padding: 8px 12px; border-bottom: 1px solid var(--panel-border); font-weight: 600; cursor: pointer; user-select: none; resize: horizontal; overflow: hidden; min-width: 50px;" title="Click to sort, Shift+Click for multi-sort, Drag right edge to resize">Feature Name</th>
                        <th onclick="window.sortTable(this, event, 1)" style="padding: 8px 12px; border-bottom: 1px solid var(--panel-border); font-weight: 600; cursor: pointer; user-select: none; resize: horizontal; overflow: hidden; min-width: 50px;" title="Click to sort, Shift+Click for multi-sort, Drag right edge to resize">State</th>
                        <th onclick="window.sortTable(this, event, 2)" style="padding: 8px 12px; border-bottom: 1px solid var(--panel-border); font-weight: 600; cursor: pointer; user-select: none; resize: horizontal; overflow: hidden; min-width: 50px;" title="Click to sort, Shift+Click for multi-sort, Drag right edge to resize">Extended State</th>
                    </tr>
                </thead>
                <tbody id="perms-dynamic-tbody"></tbody>
            </table>`;
            const tbody = document.getElementById('perms-dynamic-tbody');
            
            // Dynamically append rows
            for(let i=0; i<featuresArray.length; i++) {
                const f = featuresArray[i];
                const name = f.name || 'Unknown';
                const state = f.state || 'N/A';
                const extState = f.extendedState || 'N/A';
                
                let stateHtml = state;
                if(state === 'Enabled') {
                    stateHtml = `<span style="color: var(--success); font-weight: 500;">${state}</span>`;
                } else if(state === 'Disabled') {
                    stateHtml = `<span style="color: var(--error); font-weight: 500;">${state}</span>`;
                }
                
                const tr = document.createElement('tr');
                tr.style.cssText = "transition: background 0.2s;";
                tr.onmouseover = () => tr.style.background='var(--overlay-10)';
                tr.onmouseout = () => tr.style.background='transparent';
                tr.innerHTML = `
                    <td style="padding: 8px 12px; color: var(--text-primary); font-family: monospace; border-bottom: 1px solid var(--panel-border);">${name}</td>
                    <td style="padding: 8px 12px; border-bottom: 1px solid var(--panel-border);">${stateHtml}</td>
                    <td style="padding: 8px 12px; color: var(--text-secondary); border-bottom: 1px solid var(--panel-border);">${extState}</td>
                `;
                tbody.appendChild(tr);
            }
            appendLog(`[DONE] Table rendering complete.`);
            statusDiv.textContent = `Successfully loaded ${featuresArray.length} features.`;
            statusDiv.style.color = 'var(--success)';
        } else {
            appendLog(`[WARN] No features array found. Raw response below:
` + JSON.stringify(data, null, 2));
            statusDiv.textContent = `Loaded JSON format (No features array found).`;
            statusDiv.style.color = 'var(--warning)';
        }
        
    } catch (e) {
        appendLog(`[EXCEPTION] ${e.message}`);
        statusDiv.textContent = `Exception: ${e.message}`;
        statusDiv.style.color = 'var(--error)';
    } finally {
        btn.disabled = false;
        btn.innerHTML = 'Run Check';
    }
};

// ==================== TABLE SORTING ====================
window.tableSortStates = {};

window.sortTable = function(thElement, event, colIndex) {
    if (event.shiftKey) {
        window.getSelection()?.removeAllRanges();
    }
    const table = thElement.closest('table');

    const tableId = table.getAttribute('data-table-id') || 'default_table';
    const tbody = table.querySelector('tbody');
    const headers = Array.from(table.querySelectorAll('th'));
    
    if (!window.tableSortStates[tableId]) {
        window.tableSortStates[tableId] = [];
    }
    let sorts = window.tableSortStates[tableId];
    
    let existingIdx = sorts.findIndex(s => s.colIndex === colIndex);
    
    if (!event.shiftKey) {
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
        let text = th.getAttribute('data-original-text');
        if (!text) {
            text = th.innerText.replace(/ [▲▼][\d]*$/, '');
            th.setAttribute('data-original-text', text);
        }
        
        let sortInfo = sorts.findIndex(s => s.colIndex === idx);
        if (sortInfo >= 0) {
            let s = sorts[sortInfo];
            let arrow = s.dir === 'asc' ? '▲' : '▼';
            let priority = sorts.length > 1 ? (sortInfo + 1) : '';
            th.innerText = `${text} ${arrow}${priority}`;
            th.style.color = 'var(--accent)';
        } else {
            th.innerText = text;
            th.style.color = '';
        }
    });
    
    let rows = Array.from(tbody.querySelectorAll('tr'));
    rows.sort((a, b) => {
        for (let s of sorts) {
            let cellA = a.children[s.colIndex].innerText.trim();
            let cellB = b.children[s.colIndex].innerText.trim();
            
            let numA = parseFloat(cellA);
            let numB = parseFloat(cellB);
            
            let cmp = 0;
            if (!isNaN(numA) && !isNaN(numB) && cellA === numA.toString()) {
                cmp = numA - numB;
            } else {
                cmp = cellA.localeCompare(cellB);
            }
            
            if (cmp !== 0) {
                return s.dir === 'asc' ? cmp : -cmp;
            }
        }
        return 0;
    });
    
    rows.forEach(r => tbody.appendChild(r));
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
        if (logsDiv.classList.contains('collapsed-console')) {
            window.toggleConsole('wf-out-gum-logs');
        }
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

    if (!window._gumSelectedCols) {
        window._gumSelectedCols = new Set(['Workspace', 'User / Principal', 'Type', 'Role', 'Actions']);
    }

    let overlay = document.getElementById('gum-result-expand-overlay');
    if (overlay) {
        window.renderGumModalTable();
        overlay.style.display = 'flex';
        requestAnimationFrame(() => {
            overlay.style.opacity = '1';
            overlay.querySelector('.dax-expand-panel').style.transform = 'scale(1)';
        });
        return;
    }

    overlay = document.createElement('div');
    overlay.id = 'gum-result-expand-overlay';
    overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.55);display:flex;align-items:center;justify-content:center;z-index:20000;opacity:0;transition:opacity 0.25s;';
    
    const panel = document.createElement('div');
    panel.className = 'dax-expand-panel';
    panel.style.cssText = [
        'position:relative','background:var(--bg-color)','border:1px solid var(--panel-border)',
        'border-radius:10px','box-shadow:0 24px 80px rgba(0,0,0,0.5)',
        'width:88vw','height:80vh','min-width:450px','min-height:300px',
        'display:flex','flex-direction:column','overflow:hidden',
        'resize:both','transform:scale(0.94)','transition:transform 0.25s'
    ].join(';');

    const hdr = document.createElement('div');
    hdr.style.cssText = 'padding:10px 16px;border-bottom:1px solid var(--panel-border);display:flex;align-items:center;justify-content:space-between;background:var(--input-bg-light);flex-shrink:0;';
    hdr.innerHTML = `
        <div style="font-weight:bold;font-size:0.9rem;color:var(--accent);display:flex;align-items:center;gap:8px;">
            <span>🌐 Global Workspace Permissions Table</span>
            <span id="gum-modal-stats" style="font-size:0.75rem;font-weight:normal;color:var(--text-secondary);">(${data.length} records)</span>
        </div>
        <div style="display:flex;align-items:center;gap:8px;">
            <button type="button" class="wf-copy-btn" style="position:relative;top:auto;right:auto;transform:none;" onclick="window.handleCopyAction(this, document.getElementById('gum-result-expand-body').innerText)" title="Copy Table Text">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
            </button>
            <button type="button" onclick="window.closeGumResultModal()" style="background:none;border:none;color:var(--text-secondary);cursor:pointer;font-size:1.1rem;line-height:1;padding:2px 6px;" title="Close">✕</button>
        </div>
    `;



    // Filter Bar with Column Dropdown
    const filterBar = document.createElement('div');
    filterBar.style.cssText = 'padding:6px 16px;background:var(--overlay-5);border-bottom:1px solid var(--overlay-10);display:flex;align-items:center;gap:10px;font-size:0.75rem;flex-shrink:0;position:relative;z-index:20;';
    
    const allGumCols = ['Workspace', 'User / Principal', 'Type', 'Role', 'Actions'];
    filterBar.innerHTML = `
        <span style="font-weight:bold;color:var(--text-secondary);">Visible Fields:</span>
        <div style="position:relative;display:inline-block;">
            <button type="button" id="gum-col-dropdown-btn" class="wf-input" style="padding:4px 10px;font-size:0.75rem;cursor:pointer;display:flex;align-items:center;gap:6px;background:var(--bg-color);" onclick="window.toggleGumColDropdown(event)">
                Select Columns (${window._gumSelectedCols.size}/5)
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 9l6 6 6-6"/></svg>
            </button>
            <div id="gum-col-dropdown-list" style="display:none;position:absolute;top:100%;left:0;margin-top:4px;background:var(--dropdown-bg, #1a1a24);border:1px solid var(--panel-border);border-radius:6px;box-shadow:0 8px 24px rgba(0,0,0,0.8);max-height:220px;overflow-y:auto;width:200px;padding:6px;z-index:3000;">
                <div style="display:flex;justify-content:space-between;padding:4px 6px;border-bottom:1px solid var(--overlay-10);margin-bottom:4px;">
                    <span style="color:var(--accent);cursor:pointer;font-weight:bold;" onclick="window.toggleAllGumCols(true)">Select All</span>
                    <span style="color:var(--text-secondary);cursor:pointer;" onclick="window.toggleAllGumCols(false)">Deselect All</span>
                </div>
                <div id="gum-col-items"></div>
            </div>
        </div>
    `;

    const body = document.createElement('div');
    body.id = 'gum-result-expand-body';
    body.style.cssText = 'flex:1;overflow:auto;padding:12px;';

    panel.appendChild(hdr);
    panel.appendChild(filterBar);
    panel.appendChild(body);
    overlay.appendChild(panel);
    document.body.appendChild(overlay);

    window.renderGumModalTable();

    requestAnimationFrame(() => {
        overlay.style.opacity = '1';
        panel.style.transform = 'scale(1)';
    });
};

window.toggleGumColDropdown = function(e) {
    if (e) e.stopPropagation();
    const drop = document.getElementById('gum-col-dropdown-list');
    if (!drop) return;
    const isVis = drop.style.display === 'block';
    drop.style.display = isVis ? 'none' : 'block';
    if (!isVis) window.renderGumColItems();
};

// Global click listener to close dropdowns when clicking outside
document.addEventListener('click', function(e) {
    const gumDrop = document.getElementById('gum-col-dropdown-list');
    const gumBtn = document.getElementById('gum-col-dropdown-btn');
    if (gumDrop && gumDrop.style.display === 'block') {
        if (!gumDrop.contains(e.target) && !gumBtn?.contains(e.target)) {
            gumDrop.style.display = 'none';
        }
    }
    const daxDrop = document.getElementById('dax-col-dropdown-list');
    const daxBtn = document.getElementById('dax-col-dropdown-btn');
    if (daxDrop && daxDrop.style.display === 'block') {
        if (!daxDrop.contains(e.target) && !daxBtn?.contains(e.target)) {
            daxDrop.style.display = 'none';
        }
    }
});


window.renderGumColItems = function() {
    const container = document.getElementById('gum-col-items');
    if (!container) return;
    const allCols = ['Workspace', 'User / Principal', 'Type', 'Role', 'Actions'];
    let html = '';
    allCols.forEach(col => {
        const checked = window._gumSelectedCols.has(col) ? 'checked' : '';
        html += `
            <label style="display:flex;align-items:center;gap:6px;padding:3px 6px;cursor:pointer;font-size:0.75rem;color:var(--text-primary);user-select:none;">
                <input type="checkbox" ${checked} onchange="window.toggleGumCol('${col}', this.checked)" style="cursor:pointer;" />
                <span>${col}</span>
            </label>
        `;
    });
    container.innerHTML = html;
};

window.toggleGumCol = function(colName, isChecked) {
    if (!window._gumSelectedCols) window._gumSelectedCols = new Set();
    if (isChecked) {
        window._gumSelectedCols.add(colName);
    } else {
        window._gumSelectedCols.delete(colName);
    }
    const btn = document.getElementById('gum-col-dropdown-btn');
    if (btn) btn.innerHTML = `Select Columns (${window._gumSelectedCols.size}/5) <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 9l6 6 6-6"/></svg>`;
    window.renderGumModalTable();
};

window.toggleAllGumCols = function(selectAll) {
    const allCols = ['Workspace', 'User / Principal', 'Type', 'Role', 'Actions'];
    if (selectAll) {
        window._gumSelectedCols = new Set(allCols);
    } else {
        window._gumSelectedCols = new Set();
    }
    window.renderGumColItems();
    const btn = document.getElementById('gum-col-dropdown-btn');
    if (btn) btn.innerHTML = `Select Columns (${window._gumSelectedCols.size}/5) <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 9l6 6 6-6"/></svg>`;
    window.renderGumModalTable();
};

window.closeGumResultModal = function() {
    const overlay = document.getElementById('gum-result-expand-overlay');
    if (!overlay) return;
    overlay.style.opacity = '0';
    const panel = overlay.querySelector('.dax-expand-panel');
    if (panel) panel.style.transform = 'scale(0.94)';
    setTimeout(() => { overlay.style.display = 'none'; }, 250);
};

window.renderGumModalTable = function() {
    const data = window._lastGumFiltered || window.gumData || [];
    const body = document.getElementById('gum-result-expand-body');
    const stats = document.getElementById('gum-modal-stats');
    if (!body) return;

    if (stats) stats.textContent = `(${data.length} records)`;

    const selectedCols = window._gumSelectedCols || new Set(['Workspace', 'User / Principal', 'Type', 'Role', 'Actions']);

    if (data.length === 0 || selectedCols.size === 0) {
        body.innerHTML = '<div style="padding:20px;text-align:center;color:var(--text-secondary);">No columns selected or no records to display.</div>';
        return;
    }

    const tableId = 'gum-result-table-modal';
    if (!window.tableSortStates) window.tableSortStates = {};
    window.tableSortStates[tableId] = [];

    const allCols = ['Workspace', 'User / Principal', 'Type', 'Role', 'Actions'];
    const colIndices = [];
    allCols.forEach((col, idx) => {
        if (selectedCols.has(col)) colIndices.push({ name: col, index: idx });
    });

    let html = `
    <table id="${tableId}" data-table-id="${tableId}" class="data-table" style="width: 100%; border-collapse: collapse;">
        <thead style="position: sticky; top: 0; background: var(--bg-color); z-index: 5;">
            <tr>`;

    colIndices.forEach((cObj, sortIdx) => {
        if (cObj.name === 'Actions') {
            html += `<th style="padding: 8px 12px; text-align: left; border-bottom: 2px solid var(--overlay-10); width: 100px;">Actions</th>`;
        } else {
            html += `<th style="padding: 8px 12px; text-align: left; border-bottom: 2px solid var(--overlay-10); cursor: pointer; user-select: none; resize: horizontal; overflow: hidden; min-width: 80px;" onclick="window.sortTable(this, event, ${sortIdx})" title="Click to sort, Shift+Click for multi-sort, Drag right edge to resize">${cObj.name}</th>`;
        }
    });

    html += `</tr></thead><tbody>`;

    for (const d of data) {
        html += `<tr style="border-bottom: 1px solid var(--overlay-10);" onmouseover="this.style.background='var(--overlay-5)'" onmouseout="this.style.background='transparent'">`;
        
        colIndices.forEach(cObj => {
            if (cObj.name === 'Workspace') {
                html += `<td style="padding: 8px 12px; font-size: 0.85rem; max-width: 200px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;" title="${d.wsName}">${d.wsName}</td>`;
            } else if (cObj.name === 'User / Principal') {
                html += `<td style="padding: 8px 12px; font-size: 0.85rem; word-break: break-all;" title="${d.identifier}">${d.identifier}</td>`;
            } else if (cObj.name === 'Type') {
                html += `<td style="padding: 8px 12px; font-size: 0.85rem;"><span style="padding:2px 6px;border-radius:4px;background:var(--overlay-10);font-size:0.75rem;">${d.principalType}</span></td>`;
            } else if (cObj.name === 'Role') {
                html += `<td style="padding: 8px 12px; font-size: 0.85rem; font-weight: bold; color: var(--accent);">${d.role}</td>`;
            } else if (cObj.name === 'Actions') {
                html += `<td style="padding: 8px 12px; font-size: 0.85rem;">
                    <button class="btn-action-danger" style="padding: 2px 6px; font-size: 0.7rem;" onclick="if(window.removeGumUser) window.removeGumUser('${d.wsId}', '${d.identifier}')">Remove</button>
                </td>`;
            }
        });

        html += `</tr>`;
    }

    html += `</tbody></table>`;
    body.innerHTML = html;
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
    if (!confirm(`Are you sure you want to completely REMOVE access for:\n${identifier}\nfrom workspace [${wsName}]?`)) return;
    
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

// Local Model Logic
window.fetchLocalModelInstances = async function() {
    const sel = document.getElementById('local-model-instance');
    const err = document.getElementById('local-model-instance-error');
    if(!sel || !err) return;
    
    sel.innerHTML = '<option value="">Fetching instances...</option>';
    err.style.display = 'none';
    
    try {
        const res = await fetch('/api/local-model/instances', { method: 'POST' });
        const json = await res.json();
        if(json.success && json.instances.length > 0) {
            sel.innerHTML = '';
            json.instances.forEach(inst => {
                const opt = document.createElement('option');
                opt.value = inst.port;
                opt.textContent = inst.name;
                sel.appendChild(opt);
            });
        } else {
            sel.innerHTML = '<option value="">No local instances found</option>';
            if(json.error) {
                err.textContent = json.error;
                err.style.display = 'block';
            }
        }
    } catch (e) {
        sel.innerHTML = '<option value="">Error fetching instances</option>';
        err.textContent = e.message;
        err.style.display = 'block';
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
        if (!editor.value || editor.value.includes("INFO.")) {
            editor.value = "EVALUATE\n    TOPN(10, 'YourTableName')";
        }
    }
};

window.runLocalModelWorkflow = async function() {
    const btn = document.getElementById('wf-btn-runall');
    const out = document.getElementById('wf-local-status');
    const resultWrap = document.getElementById('wf-local-result-wrap');
    const resultDiv = document.getElementById('wf-local-result');
    const statsSpan = document.getElementById('wf-local-result-stats');
    const editor = document.getElementById('local-dax-editor');
    const instSel = document.getElementById('local-model-instance');

    if (!editor.value.trim()) {
        window.showNotification('Please enter a DAX query', 'error');
        return;
    }

    let port = null;
    if (instSel && instSel.value) {
        port = parseInt(instSel.value);
    }

    btn.disabled = true;
    btn.innerHTML = '<span class="loader" style="width:12px;height:12px;border-width:2px;"></span> Running...';
    out.style.display = 'block';
    out.textContent = 'Executing DAX query against local model...';
    out.style.color = 'var(--text-secondary)';
    resultWrap.style.display = 'none';
    resultDiv.innerHTML = '';
    statsSpan.textContent = '';

    try {
        const res = await fetch('/api/local-model/dax', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ query: editor.value, port: port })
        });
        const json = await res.json();

        if (json.success) {
            const data = json.data;

            // Empty result
            if (!data || (Array.isArray(data) && data.length === 0)) {
                out.textContent = '✅ Query executed — no rows returned.';
                out.style.color = 'var(--success)';
                return;
            }

            // Normalise to array
            const rows = Array.isArray(data) ? data : [data];

            // Collect columns and clean bracket-prefixed names from DAX INFO.* functions
            // e.g. "[Table Name]" → "Table Name", "[Expression]" → "Expression"
            const colSetRaw = new Set();
            rows.forEach(r => { if (r && typeof r === 'object') Object.keys(r).forEach(k => colSetRaw.add(k)); });
            const rawCols = Array.from(colSetRaw);

            // Filter out known redundant/internal columns (GUID-like, ID-only columns if others exist)
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

            // Clean display names: strip surrounding brackets "[Table Name]" → "Table Name"
            const displayNames = columns.map(c => c.replace(/^\[|\]$/g, ''));

            if (columns.length === 0) {
                out.textContent = '✅ Query executed — result is not tabular.';
                out.style.color = 'var(--success)';
                return;
            }

            // --- Build standard project table ---
            const tableId = 'local-dax-result-table';
            if (!window.tableSortStates) window.tableSortStates = {};
            window.tableSortStates[tableId] = [];

            let html = `<table data-table-id="${tableId}" class="data-table" style="width:100%;border-collapse:collapse;font-size:0.82rem;">
                <thead style="position:sticky;top:0;background:var(--bg-color);z-index:5;">
                    <tr>`;
            displayNames.forEach((name, idx) => {
                html += `<th onclick="window.sortTable(this,event,${idx})"
                    style="padding:8px 12px;border-bottom:1px solid var(--panel-border);font-weight:600;cursor:pointer;user-select:none;resize:horizontal;overflow:hidden;min-width:60px;white-space:nowrap;"
                    title="Click to sort · Shift+Click multi-sort · Drag right edge to resize">${name}</th>`;
            });
            html += `</tr></thead><tbody>`;

            rows.forEach(item => {
                html += `<tr style="border-bottom:1px solid var(--overlay-10);" onmouseover="this.style.background='var(--overlay-5)'" onmouseout="this.style.background='transparent'">`;
                columns.forEach(col => {
                    let val = item ? item[col] : '';
                    if (val === null || val === undefined) val = '';
                    if (typeof val === 'object') val = JSON.stringify(val);
                    const escaped = String(val).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
                    html += `<td style="padding:6px 12px;color:var(--text-primary);max-width:300px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;" title="${escaped}">${escaped}</td>`;
                });
                html += `</tr>`;
            });
            html += `</tbody></table>`;

            // Save raw tabular data for column selector and modal rendering
            window._lastDaxResult = { rows, columns, displayNames };

            resultDiv.innerHTML = ''; // Keep main panel clean, no direct table rendering
            statsSpan.textContent = `${rows.length} rows × ${columns.length} cols`;
            resultWrap.style.display = 'block';

            out.textContent = `✅ Query executed — ${rows.length} rows returned. Click "DAX Query Results" above to view table.`;
            out.style.color = 'var(--success)';

        } else {
            out.textContent = 'Error: ' + (json.error || 'Unknown error');
            out.style.color = 'var(--error)';
        }
    } catch (e) {
        out.textContent = 'Error: ' + e.message;
        out.style.color = 'var(--error)';
    } finally {
        if (btn) {
            btn.disabled = false;
            btn.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg> Run Full Workflow';
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



// === Render Table with Column Visibility ===
window.renderDaxModalTable = function() {
    const data = window._lastDaxResult;
    const body = document.getElementById('dax-result-expand-body');
    if (!data || !body) return;

    const selectedCols = window._daxSelectedCols || new Set(data.columns);
    const visibleIndices = [];
    data.columns.forEach((col, idx) => {
        if (selectedCols.has(col)) visibleIndices.push(idx);
    });

    if (visibleIndices.length === 0) {
        body.innerHTML = '<div style="padding:20px;text-align:center;color:var(--text-secondary);">No columns selected to display.</div>';
        return;
    }

    const tableId = 'local-dax-result-table-modal';
    if (!window.tableSortStates) window.tableSortStates = {};
    window.tableSortStates[tableId] = [];

    let html = `<table id="${tableId}" data-table-id="${tableId}" class="data-table" style="width:100%;border-collapse:collapse;font-size:0.82rem;">
        <thead style="position:sticky;top:0;background:var(--bg-color);z-index:5;">
            <tr>`;
    visibleIndices.forEach((colIdx, sortIdx) => {
        const name = data.displayNames[colIdx];
        html += `<th onclick="window.sortTable(this,event,${sortIdx})"
            style="padding:8px 12px;border-bottom:1px solid var(--panel-border);font-weight:600;cursor:pointer;user-select:none;resize:horizontal;overflow:hidden;min-width:60px;white-space:nowrap;"
            title="Click to sort · Shift+Click multi-sort · Drag right edge to resize">${name}</th>`;
    });
    html += `</tr></thead><tbody>`;

    data.rows.forEach(item => {
        html += `<tr style="border-bottom:1px solid var(--overlay-10);" onmouseover="this.style.background='var(--overlay-5)'" onmouseout="this.style.background='transparent'">`;
        visibleIndices.forEach(colIdx => {
            const col = data.columns[colIdx];
            let val = item ? item[col] : '';
            if (val === null || val === undefined) val = '';
            if (typeof val === 'object') val = JSON.stringify(val);
            const escaped = String(val).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
            html += `<td style="padding:6px 12px;color:var(--text-primary);max-width:300px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;" title="${escaped}">${escaped}</td>`;
        });
        html += `</tr>`;
    });
    html += `</tbody></table>`;

    body.innerHTML = html;
};

// === DAX Query Results: Open resizable popup modal with Dropdown Column Selector ===
window.openDaxResultModal = function() {
    const data = window._lastDaxResult;
    if (!data || !data.rows || data.rows.length === 0) {
        window.showNotification('No results to expand yet.', 'info');
        return;
    }

    if (!window._daxSelectedCols) {
        window._daxSelectedCols = new Set(data.columns);
    }

    let overlay = document.getElementById('dax-result-expand-overlay');
    if (overlay) {
        window.renderDaxModalTable();
        overlay.style.display = 'flex';
        requestAnimationFrame(() => {
            overlay.style.opacity = '1';
            overlay.querySelector('.dax-expand-panel').style.transform = 'scale(1)';
        });
        return;
    }

    // Create overlay
    overlay = document.createElement('div');
    overlay.id = 'dax-result-expand-overlay';
    overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.55);display:flex;align-items:center;justify-content:center;z-index:20000;opacity:0;transition:opacity 0.25s;';
    
    // Panel
    const panel = document.createElement('div');
    panel.className = 'dax-expand-panel';
    panel.style.cssText = [
        'position:relative','background:var(--bg-color)','border:1px solid var(--panel-border)',
        'border-radius:10px','box-shadow:0 24px 80px rgba(0,0,0,0.5)',
        'width:88vw','height:80vh','min-width:450px','min-height:300px',
        'display:flex','flex-direction:column','overflow:hidden',
        'resize:both','transform:scale(0.94)','transition:transform 0.25s'
    ].join(';');

    // Header
    const statsText = `${data.rows.length} rows × ${data.columns.length} cols`;
    const hdr = document.createElement('div');
    hdr.style.cssText = 'display:flex;align-items:center;justify-content:space-between;padding:10px 16px;border-bottom:1px solid var(--overlay-10);cursor:move;user-select:none;flex-shrink:0;background:var(--bg-color);';
    hdr.innerHTML = `
        <span style="font-size:0.85rem;font-weight:bold;color:var(--text-primary);display:flex;align-items:center;gap:8px;">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" stroke-width="2"><path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"/></svg>
            DAX Query Results
            <span id="dax-expand-stats" style="color:var(--accent);font-weight:normal;font-size:0.75rem;">${statsText}</span>
        </span>
        <div style="display:flex;align-items:center;gap:8px;">
            <button class="wf-copy-btn" style="position:relative;top:auto;right:auto;transform:none;"
                onclick="window.handleCopyAction(this,document.getElementById('dax-result-expand-body').innerText)"
                title="Copy Table">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
            </button>
            <button class="close-btn" id="dax-expand-close" title="Close">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 6L6 18M6 6l12 12"/></svg>
            </button>
        </div>`;


    // Column Filter Dropdown List
    const filterBar = document.createElement('div');
    filterBar.style.cssText = 'padding:6px 16px;background:var(--overlay-5);border-bottom:1px solid var(--overlay-10);display:flex;align-items:center;gap:10px;font-size:0.75rem;flex-shrink:0;position:relative;z-index:20;';
    
    filterBar.innerHTML = `
        <span style="font-weight:bold;color:var(--text-secondary);">Visible Fields:</span>
        <div style="position:relative;display:inline-block;">
            <button type="button" id="dax-col-dropdown-btn" class="wf-input" style="padding:4px 10px;font-size:0.75rem;cursor:pointer;display:flex;align-items:center;gap:6px;background:var(--bg-color);">
                Select Columns (${window._daxSelectedCols.size}/${data.columns.length})
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 9l6 6 6-6"/></svg>
            </button>
            <div id="dax-col-dropdown-list" style="display:none;position:absolute;top:100%;left:0;margin-top:4px;background:var(--dropdown-bg, #1a1a24);border:1px solid var(--panel-border);border-radius:6px;box-shadow:0 8px 24px rgba(0,0,0,0.8);max-height:220px;overflow-y:auto;width:240px;padding:6px;z-index:3000;">
                <div style="display:flex;justify-content:space-between;padding:4px 6px;border-bottom:1px solid var(--overlay-10);margin-bottom:4px;">
                    <span style="color:var(--accent);cursor:pointer;font-weight:bold;" onclick="window.toggleAllDaxCols(true)">Select All</span>
                    <span style="color:var(--text-secondary);cursor:pointer;" onclick="window.toggleAllDaxCols(false)">Deselect All</span>
                </div>
                <div id="dax-col-items"></div>
            </div>
        </div>
    `;

    panel.appendChild(hdr);
    panel.appendChild(filterBar);

    // Body
    const body = document.createElement('div');
    body.id = 'dax-result-expand-body';
    body.style.cssText = 'flex:1;overflow:auto;padding:12px;white-space:normal;';
    panel.appendChild(body);
    overlay.appendChild(panel);
    document.body.appendChild(overlay);

    // Render Dropdown List Items
    const renderColItems = () => {
        const container = document.getElementById('dax-col-items');
        if (!container) return;
        let html = '';
        data.columns.forEach((col, idx) => {
            const checked = window._daxSelectedCols.has(col) ? 'checked' : '';
            html += `<label style="display:flex;align-items:center;gap:6px;padding:4px 6px;cursor:pointer;font-size:0.75rem;border-radius:4px;" onmouseover="this.style.background='var(--overlay-5)'" onmouseout="this.style.background='transparent'">
                <input type="checkbox" ${checked} onchange="window.toggleDaxColumn('${col}', this.checked)" style="cursor:pointer;">
                <span style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap;" title="${data.displayNames[idx]}">${data.displayNames[idx]}</span>
            </label>`;
        });
        container.innerHTML = html;
        document.getElementById('dax-col-dropdown-btn').innerHTML = `Select Columns (${window._daxSelectedCols.size}/${data.columns.length}) <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 9l6 6 6-6"/></svg>`;
    };

    window.toggleDaxColumn = function(colName, isChecked) {
        if (isChecked) window._daxSelectedCols.add(colName);
        else window._daxSelectedCols.delete(colName);
        renderColItems();
        window.renderDaxModalTable();
    };

    window.toggleAllDaxCols = function(selectAll) {
        if (selectAll) {
            window._daxSelectedCols = new Set(data.columns);
        } else {
            window._daxSelectedCols.clear();
        }
        renderColItems();
        window.renderDaxModalTable();
    };

    // Toggle Dropdown Menu
    const dropdownBtn = document.getElementById('dax-col-dropdown-btn');
    const dropdownList = document.getElementById('dax-col-dropdown-list');
    dropdownBtn.onclick = (e) => {
        e.stopPropagation();
        const isOpen = dropdownList.style.display === 'block';
        dropdownList.style.display = isOpen ? 'none' : 'block';
    };
    document.addEventListener('click', (e) => {
        if (dropdownList && !filterBar.contains(e.target)) {
            dropdownList.style.display = 'none';
        }
    });

    renderColItems();
    window.renderDaxModalTable();

    // Animate in
    requestAnimationFrame(() => {
        overlay.style.opacity = '1';
        panel.style.transform = 'scale(1)';
    });

    // Close
    const closeModal = () => {
        overlay.style.opacity = '0';
        panel.style.transform = 'scale(0.94)';
        setTimeout(() => { overlay.style.display = 'none'; }, 250);
    };
    document.getElementById('dax-expand-close').onclick = closeModal;
    overlay.addEventListener('click', (e) => { if (e.target === overlay) closeModal(); });
};
