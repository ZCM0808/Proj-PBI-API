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
    const searchInput = document.getElementById('api-search');
    
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

    apiTree.innerHTML = '<div style="padding:1rem; text-align:center; color: var(--text-secondary);"><span class="loader"></span> 加载全部 API 中...</div>';

    try {
        const res = await fetch('/static/swagger.json');
        const swagger = await res.json();
        
        const categories = {};
        const definitions = swagger.definitions || {};

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
                
                let sampleBody = '';
                if (sampleBodyObj) {
                    // 生成有具体字段含义的 JSON
                    sampleBody = JSON.stringify(sampleBodyObj, null, 2);
                } else if (['post', 'put', 'patch'].includes(method.toLowerCase())) {
                    sampleBody = '{\n  // 当前接口无需请求体，或官方文档未指明\n}'; 
                }

                categories[category].push({
                    name: details.summary || details.operationId || path,
                    description: details.description || '无详细描述',
                    method: method.toUpperCase(),
                    path: path.replace("/v1.0/myorg", ""), // clean path
                    body: sampleBody
                });
                totalApisCalculated++;
            }
        }

        // 更新总数
        totalApiCountEl.textContent = totalApisCalculated;

        pbiApis = Object.keys(categories).map(cat => ({
            category: cat,
            endpoints: categories[cat]
        }));
        
        pbiApis.sort((a, b) => a.category.localeCompare(b.category));
        
        renderTree();
    } catch (e) {
        console.error("Failed to load swagger", e);
        apiTree.innerHTML = `<div style="padding: 1rem; color: #ef4444;">无法加载完整的 API 列表，请刷新重试。<br><br><small style="color:var(--text-secondary);">${e.stack || e.message || e}</small></div>`;
    }

    // 绑定最小化/最大化面板事件
    const toggleInfoBtn = document.getElementById('toggle-info-btn');
    let activeApiElement = null;

    function updateRequestMode(mode, text) {
        const badge = document.getElementById('request-mode-badge');
        if (!badge) return;
        badge.innerHTML = text;
        if (mode === 'free') {
            badge.style.color = 'var(--accent)';
            badge.style.borderColor = 'rgba(62, 166, 255, 0.5)';
            badge.style.background = 'rgba(62, 166, 255, 0.1)';
        } else {
            badge.style.color = '#10b981';
            badge.style.borderColor = 'rgba(16, 185, 129, 0.5)';
            badge.style.background = 'rgba(16, 185, 129, 0.1)';
        }
    }

    const selectedApiContent = document.getElementById('selected-api-content');
    
    toggleInfoBtn.addEventListener('click', () => {
        if (selectedApiContent.style.display === 'none') {
            selectedApiContent.style.display = 'block';
            toggleInfoBtn.innerHTML = '&minus;';
            toggleInfoBtn.title = '最小化';
        } else {
            selectedApiContent.style.display = 'none';
            toggleInfoBtn.innerHTML = '&#9633;'; // 正方形符号代表最大化/还原
            toggleInfoBtn.title = '还原';
        }
    });
    
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
        const index = bookmarks.findIndex(b => b.path === ep.path && b.method === ep.method);
        if (index >= 0) {
            bookmarks.splice(index, 1);
        } else {
            bookmarks.push(ep);
        }
        localStorage.setItem('pbi-bookmarks', JSON.stringify(bookmarks));
        const searchInput = document.getElementById('api-search-input');
        renderTree(searchInput ? searchInput.value : "");
    }

    // 渲染 API 树
    function renderTree(searchTerm = "") {
        apiTree.innerHTML = '';
        
        const bookmarks = getBookmarks();
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
            const filteredEndpoints = category.endpoints.filter(ep => {
                const term = searchTerm.toLowerCase();
                const zhName = translateApiName(ep.name).toLowerCase();
                return ep.name.toLowerCase().includes(term) || 
                       ep.path.toLowerCase().includes(term) ||
                       ep.method.toLowerCase().includes(term) ||
                       zhName.includes(term);
            });

            if (filteredEndpoints.length === 0) return;

            const categoryEl = document.createElement('div');
            categoryEl.className = 'api-category';
            
            const titleEl = document.createElement('div');
            titleEl.className = 'api-category-title';
            titleEl.innerHTML = `<span>${category.category}</span> <span>${filteredEndpoints.length}</span>`;
            categoryEl.appendChild(titleEl);

            const listEl = document.createElement('ul');
            listEl.className = 'api-list';
            if (searchTerm || expandedCategories.has(category.category) || category.category === "⭐ 收藏夹 (Bookmarks)") {
                listEl.style.display = 'flex';
                titleEl.classList.add('active'); // 添加三角旋转状态（如果 CSS 里有写的话）
            } else {
                listEl.style.display = 'none'; // 默认折叠以应对大量 API
            }
            
            titleEl.addEventListener('click', () => {
                const isHidden = listEl.style.display === 'none';
                listEl.style.display = isHidden ? 'flex' : 'none';
                titleEl.classList.toggle('active', isHidden);
                if (isHidden) {
                    expandedCategories.add(category.category);
                } else {
                    expandedCategories.delete(category.category);
                }
            });
            
            filteredEndpoints.forEach(ep => {
                const itemEl = document.createElement('li');
                itemEl.className = 'api-item';
                itemEl.dataset.path = ep.path;
                
                const badge = document.createElement('span');
                badge.className = `method-badge method-${ep.method}`;
                badge.textContent = ep.method;
                
                const nameEl = document.createElement('span');
                nameEl.className = 'api-item-name';
                
                // 显示中文翻译在列表上（也可以只显示英文，这里展示双语）
                const zhTranslated = translateApiName(ep.name);
                nameEl.innerHTML = `<div>${ep.name}</div><div style="font-size:0.7rem; color:var(--text-secondary); margin-top:2px;">${zhTranslated}</div>`;
                nameEl.title = ep.path;

                // 收藏按钮
                const starBtn = document.createElement('button');
                const isBookmarked = getBookmarks().some(b => b.path === ep.path && b.method === ep.method);
                starBtn.className = isBookmarked ? 'bookmark-btn active' : 'bookmark-btn';
                starBtn.innerHTML = isBookmarked ? '★' : '☆';
                starBtn.title = isBookmarked ? "取消收藏" : "加入收藏";
                starBtn.onclick = (e) => toggleBookmark(ep, e);

                itemEl.appendChild(badge);
                itemEl.appendChild(nameEl);
                itemEl.appendChild(starBtn);

                const uniqueId = ep.method + '_' + ep.path;
                
                if (currentSelectedId === uniqueId) {
                    itemEl.classList.add('active');
                    activeApiElement = itemEl;
                }

                itemEl.addEventListener('click', () => {
                    document.querySelectorAll('.api-item').forEach(i => i.classList.remove('active'));
                    itemEl.classList.add('active');
                    activeApiElement = itemEl;
                    currentSelectedId = uniqueId;

                    // 保存初始状态
                    originalMethod = ep.method;
                    originalPath = ep.path;
                    
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
                    methodSelect.value = originalMethod;
                    methodSelect.disabled = true; // 锁定 Method
                    bodyInput.value = originalBody;
                    
                    // 恢复 Unlock 按钮状态
                    document.getElementById('toggle-method-btn').innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg><span>Unlock</span>';

                    // 展示详细信息面板
                    selectedApiInfo.style.display = 'block';
                    selectedApiContent.style.display = 'block'; // 点击新 API 时自动展开
                    toggleInfoBtn.innerHTML = '&minus;';
                    selectedApiName.textContent = ep.name;
                    
                    // 动态更新标题 Badge
                    updateRequestMode('api', `Bound to: ${ep.name}`);
                    selectedApiZh.textContent = zhTranslated;
                    selectedApiDesc.textContent = ep.description;
                    selectedApiDesc.title = ep.description; // Hover to see full
                });

                listEl.appendChild(itemEl);
            });

            categoryEl.appendChild(listEl);
            apiTree.appendChild(categoryEl);
        });
    }

    // 搜索过滤逻辑 (Global Smart Search)
    const apiSearchInput = document.getElementById('api-search-input');
    if (apiSearchInput) {
        apiSearchInput.addEventListener('input', (e) => {
            renderTree(e.target.value);
        });
    }

    sendBtn.addEventListener('click', async () => {
        const method = methodSelect.value;
        const endpoint = endpointInput.value.trim();
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

        // 存入请求历史
        if (endpoint) {
            try {
                let reqHistory = JSON.parse(localStorage.getItem('apiReqHistory') || '[]');
                const reqData = { method: method, url: endpoint, body: bodyStr, time: new Date().toLocaleString() };
                // 简单去重：如果最新的和这次一模一样，就不重复存
                if (reqHistory.length === 0 || reqHistory[0].method !== method || reqHistory[0].url !== endpoint || reqHistory[0].body !== bodyStr) {
                    reqHistory.unshift(reqData);
                    if (reqHistory.length > 20) reqHistory.pop();
                    localStorage.setItem('apiReqHistory', JSON.stringify(reqHistory));
                }
            } catch (e) {
                console.error('History save error:', e);
                localStorage.removeItem('apiReqHistory');
            }
        }

        sendBtn.disabled = true;
        sendBtn.innerHTML = '<span class="loader"></span> <span>Sending...</span>';
        responseStatus.textContent = 'Sending request...';
        responseStatus.className = 'response-status';
        responseOutput.textContent = '...';

        try {
            const res = await fetch('/api/proxy', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    method,
                    endpoint,
                    body
                })
            });

            const data = await res.json();
            
            if (data.success) {
                responseStatus.textContent = `Success`;
                responseStatus.className = 'response-status status-success';
                // 注入高亮的 JSON 树状视图
                responseOutput.innerHTML = syntaxHighlight(data.data);
                responseOutput.className = 'json-viewer';
                responseOutput.style.color = '#a78bfa';
            } else {
                responseStatus.textContent = `Error`;
                responseStatus.className = 'response-status status-error';
                responseOutput.textContent = JSON.stringify(data.error || data, null, 2);
                responseOutput.style.color = '#ef4444';
            }

        } catch (err) {
            responseStatus.textContent = `Network Error`;
            responseStatus.className = 'response-status status-error';
            responseOutput.textContent = err.message;
            responseOutput.style.color = '#ef4444';
        } finally {
            sendBtn.disabled = false;
            sendBtn.innerHTML = `
                <span>Send Request</span>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z"/></svg>
            `;
        }
    });

    // Unlock 和 Reset 按钮逻辑
    const toggleMethodBtn = document.getElementById('toggle-method-btn');
    const resetRequestBtn = document.getElementById('reset-request-btn');

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
        bodyInput.value = originalBody;
        
        // 恢复 UI 状态
        selectedApiInfo.style.display = 'block';
        if (activeApiElement) {
            activeApiElement.classList.add('active');
        }
        
        // 恢复标题
        const apiName = document.getElementById('selected-api-name').textContent;
        if (apiName) {
            updateRequestMode('api', `Bound to: ${apiName}`);
        }
    });

    // 新建空白请求 (New Request)
    const newRequestBtn = document.getElementById('new-request-btn');
    if (newRequestBtn) {
        newRequestBtn.addEventListener('click', () => {
            methodSelect.disabled = false;
            methodSelect.value = 'GET';
            endpointInput.value = '';
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
    
    const loadReqHistory = () => {
        let history = [];
        try {
            history = JSON.parse(localStorage.getItem('apiReqHistory') || '[]');
        } catch(e) {
            localStorage.removeItem('apiReqHistory');
        }
        historyReqDropdown.innerHTML = '';
        if (history.length > 0) {
            history.forEach(h => {
                const item = document.createElement('div');
                item.style.cssText = 'padding: 10px 12px; border-bottom: 1px solid rgba(255,255,255,0.05); cursor: pointer; display: flex; flex-direction: column; gap: 6px; transition: background 0.2s;';
                item.onmouseover = () => item.style.background = 'rgba(255,255,255,0.05)';
                item.onmouseout = () => item.style.background = 'transparent';
                
                const topRow = document.createElement('div');
                topRow.style.cssText = 'display: flex; justify-content: space-between; align-items: flex-start; gap: 8px;';
                
                const methodUrl = document.createElement('div');
                methodUrl.style.cssText = 'flex: 1; word-break: break-all;';
                const methodColor = h.method === 'GET' ? '#3b82f6' : (h.method === 'POST' ? '#10b981' : (h.method === 'DELETE' ? '#ef4444' : '#f59e0b'));
                methodUrl.innerHTML = `<span style="color: ${methodColor}; font-weight: bold; margin-right: 8px; font-size: 0.8rem;">${h.method}</span><span style="color: #c9d1d9; font-size: 0.85rem; font-family: 'Fira Code', monospace;">${h.url}</span>`;
                
                const rightCol = document.createElement('div');
                rightCol.style.cssText = 'display: flex; flex-direction: column; align-items: flex-end; gap: 4px;';
                
                const timeSpan = document.createElement('span');
                timeSpan.style.cssText = 'font-size: 0.7rem; color: #6e7681;';
                timeSpan.textContent = h.time || '';
                
                const delBtn = document.createElement('span');
                delBtn.innerHTML = '&times;';
                delBtn.title = '删除此条记录';
                delBtn.style.cssText = 'font-size: 1.1rem; color: #6e7681; cursor: pointer; padding: 0 4px; border-radius: 4px; line-height: 1;';
                delBtn.onmouseover = () => { delBtn.style.color = '#ff6b6b'; delBtn.style.background = 'rgba(255,107,107,0.1)'; };
                delBtn.onmouseout = () => { delBtn.style.color = '#6e7681'; delBtn.style.background = 'transparent'; };
                delBtn.onclick = (e) => {
                    e.stopPropagation();
                    try {
                        let currHistory = JSON.parse(localStorage.getItem('apiReqHistory') || '[]');
                        currHistory = currHistory.filter(curr => curr.time !== h.time || curr.url !== h.url);
                        localStorage.setItem('apiReqHistory', JSON.stringify(currHistory));
                    } catch(e) {}
                    loadReqHistory();
                };
                
                rightCol.appendChild(delBtn);
                rightCol.appendChild(timeSpan);
                topRow.appendChild(methodUrl);
                topRow.appendChild(rightCol);
                item.appendChild(topRow);
                
                if (h.body) {
                    const bodyPreview = document.createElement('div');
                    bodyPreview.style.cssText = 'font-size: 0.75rem; color: #8b949e; font-family: "Fira Code", monospace; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; background: rgba(0,0,0,0.2); padding: 4px 6px; border-radius: 4px;';
                    bodyPreview.textContent = h.body;
                    item.appendChild(bodyPreview);
                }
                
                item.onclick = () => {
                    methodSelect.value = h.method;
                    endpointInput.value = h.url;
                    bodyInput.value = h.body || '';
                    methodSelect.disabled = false;
                    historyReqDropdown.style.display = 'none';
                    
                    // 从历史记录加载，视为自由模式
                    updateRequestMode('free', 'Free Mode (From History)');
                };
                
                historyReqDropdown.appendChild(item);
            });
            
            const clearAll = document.createElement('div');
            clearAll.style.cssText = 'padding: 10px 12px; color: #ff6b6b; cursor: pointer; font-size: 0.8rem; text-align: center; transition: background 0.2s;';
            clearAll.textContent = '❌ 清空所有请求历史 (Clear All)';
            clearAll.onmouseover = () => clearAll.style.background = 'rgba(255,107,107,0.1)';
            clearAll.onmouseout = () => clearAll.style.background = 'transparent';
            clearAll.onclick = () => {
                if(confirm('确定要清空所有自由请求历史记录吗？(Are you sure to clear all request history?)')) {
                    localStorage.removeItem('apiReqHistory');
                    loadReqHistory();
                    historyReqDropdown.style.display = 'none';
                }
            };
            historyReqDropdown.appendChild(clearAll);
            
        } else {
            historyReqDropdown.innerHTML = '<div style="padding: 16px; color: #6e7681; font-size: 0.85rem; text-align: center;">📜 暂无请求历史 (No Request History)</div>';
        }
    };
    
    if (historyReqBtn && historyReqDropdown) {
        historyReqBtn.addEventListener('click', () => {
            loadReqHistory();
            historyReqDropdown.style.display = historyReqDropdown.style.display === 'none' ? 'block' : 'none';
        });
        document.addEventListener('click', (e) => {
            if (!historyReqBtn.contains(e.target) && !historyReqDropdown.contains(e.target)) {
                historyReqDropdown.style.display = 'none';
            }
        });
    }

    // --- Modal FLIP & Drag Helper ---
    function makeDraggable(modalContent, dragHandle) {
        let isDragging = false;
        let startX, startY, initialLeft, initialTop;
        
        modalContent.style.position = 'relative';
        dragHandle.style.cursor = 'grab';

        dragHandle.addEventListener('mousedown', (e) => {
            isDragging = true;
            dragHandle.style.cursor = 'grabbing';
            startX = e.clientX;
            startY = e.clientY;
            
            const style = window.getComputedStyle(modalContent);
            initialLeft = parseInt(style.left, 10) || 0;
            initialTop = parseInt(style.top, 10) || 0;
            
            document.body.style.userSelect = 'none';
        });

        document.addEventListener('mousemove', (e) => {
            if (!isDragging) return;
            const dx = e.clientX - startX;
            const dy = e.clientY - startY;
            modalContent.style.left = `${initialLeft + dx}px`;
            modalContent.style.top = `${initialTop + dy}px`;
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
        let isAnimating = false;

        makeDraggable(modalContent, modalHeader);

        btnOpen.addEventListener('click', async () => {
            if (isAnimating) return;
            isAnimating = true;
            
            if (onLoadCallback) {
                await onLoadCallback();
            }

            modalContent.style.left = '0px';
            modalContent.style.top = '0px';
            
            const btnRect = btnOpen.getBoundingClientRect();
            
            modalOverlay.style.display = 'flex';
            requestAnimationFrame(() => {
                const finalRect = modalContent.getBoundingClientRect();
                
                const scaleX = btnRect.width / finalRect.width;
                const scaleY = btnRect.height / finalRect.height;
                const translateX = btnRect.left - finalRect.left;
                const translateY = btnRect.top - finalRect.top;
                
                modalOverlay.animate([
                    { opacity: 0 },
                    { opacity: 1 }
                ], { duration: 300, fill: 'forwards' });
                
                const contentAnim = modalContent.animate([
                    { 
                        transform: `translate(${translateX}px, ${translateY}px) scale(${scaleX}, ${scaleY})`,
                        transformOrigin: 'top left',
                        opacity: 0
                    },
                    { 
                        transform: 'translate(0, 0) scale(1, 1)',
                        transformOrigin: 'top left',
                        opacity: 1
                    }
                ], {
                    duration: 400,
                    easing: 'cubic-bezier(0.2, 0.8, 0.2, 1)'
                });
                
                contentAnim.onfinish = () => { isAnimating = false; };
            });
        });

        btnClose.addEventListener('click', () => {
            if (isAnimating) return;
            isAnimating = true;
            
            const btnRect = btnOpen.getBoundingClientRect();
            const finalRect = modalContent.getBoundingClientRect();
            
            const scaleX = btnRect.width / finalRect.width;
            const scaleY = btnRect.height / finalRect.height;
            const translateX = btnRect.left - finalRect.left;
            const translateY = btnRect.top - finalRect.top;
            
            modalOverlay.animate([
                { opacity: 1 },
                { opacity: 0 }
            ], { duration: 350, fill: 'forwards' });
            
            const contentAnim = modalContent.animate([
                { 
                    transform: 'translate(0, 0) scale(1, 1)',
                    transformOrigin: 'top left',
                    opacity: 1
                },
                { 
                    transform: `translate(${translateX}px, ${translateY}px) scale(${scaleX}, ${scaleY})`,
                    transformOrigin: 'top left',
                    opacity: 0
                }
            ], {
                duration: 350,
                easing: 'cubic-bezier(0.4, 0, 0.2, 1)'
            });
            
            contentAnim.onfinish = () => {
                modalOverlay.style.display = 'none';
                isAnimating = false;
            };
        });
    }

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

            const evtSource = new EventSource('/api/pipeline/run');
            
            evtSource.onmessage = function(event) {
                const data = JSON.parse(event.data);
                const line = document.createElement('div');
                line.className = 'terminal-line';
                
                let cls = 'info';
                if (data.status === 'success') cls = 'success';
                else if (data.status === 'warning') cls = 'warning';
                else if (data.status === 'error') cls = 'error';
                
                const timeStr = new Date().toLocaleTimeString('en-US', {hour12: false});
                line.innerHTML = `<span style="color:#8b949e">[${timeStr}]</span> <span class="${cls}">${data.message}</span>`;
                terminal.appendChild(line);
                terminal.scrollTop = terminal.scrollHeight; // Auto-scroll
                
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
        const loadSQLHistory = () => {
            const historyBtn = document.getElementById('sql-history-btn');
            const historyDropdown = document.getElementById('sql-history-dropdown');
            if (!historyBtn || !historyDropdown) return;
            
            let history = [];
            try {
                history = JSON.parse(localStorage.getItem('sqlHistory') || '[]');
            } catch(e) {
                localStorage.removeItem('sqlHistory');
            }
            historyDropdown.innerHTML = '';
            
            if (history.length > 0) {
                historyBtn.style.display = 'block';
                history.forEach(h => {
                    const item = document.createElement('div');
                    item.style.cssText = 'display: flex; justify-content: space-between; align-items: center; padding: 8px 12px; border-bottom: 1px solid rgba(255,255,255,0.1); cursor: pointer; color: var(--text-secondary); font-size: 0.8rem; transition: background 0.2s;';
                    item.onmouseover = () => item.style.background = 'rgba(255,255,255,0.05)';
                    item.onmouseout = () => item.style.background = 'transparent';
                    
                    const textSpan = document.createElement('span');
                    textSpan.textContent = h.length > 35 ? h.substring(0, 35) + '...' : h;
                    textSpan.title = h;
                    textSpan.style.flex = '1';
                    textSpan.style.overflow = 'hidden';
                    textSpan.style.textOverflow = 'ellipsis';
                    textSpan.style.whiteSpace = 'nowrap';
                    textSpan.onclick = () => {
                        document.getElementById('set-sql').value = h;
                        historyDropdown.style.display = 'none';
                    };
                    
                    const delBtn = document.createElement('span');
                    delBtn.innerHTML = '&times;';
                    delBtn.title = '删除此条记录 (Remove)';
                    delBtn.style.cssText = 'margin-left: 8px; font-size: 1.1rem; color: var(--text-secondary); cursor: pointer; padding: 0 4px; border-radius: 4px;';
                    delBtn.onmouseover = () => { delBtn.style.color = '#ff6b6b'; delBtn.style.background = 'rgba(255,107,107,0.1)'; };
                    delBtn.onmouseout = () => { delBtn.style.color = 'var(--text-secondary)'; delBtn.style.background = 'transparent'; };
                    delBtn.onclick = (e) => {
                        e.stopPropagation(); // 防止触发选中事件
                        let currHistory = JSON.parse(localStorage.getItem('sqlHistory') || '[]');
                        currHistory = currHistory.filter(curr => curr !== h);
                        localStorage.setItem('sqlHistory', JSON.stringify(currHistory));
                        loadSQLHistory(); // 重新渲染下拉框
                    };
                    
                    item.appendChild(textSpan);
                    item.appendChild(delBtn);
                    historyDropdown.appendChild(item);
                });
                
                const clearAll = document.createElement('div');
                clearAll.style.cssText = 'padding: 8px 12px; color: #ff6b6b; cursor: pointer; font-size: 0.8rem; text-align: center; transition: background 0.2s;';
                clearAll.textContent = '❌ 清空全部历史 (Clear All)';
                clearAll.onmouseover = () => clearAll.style.background = 'rgba(255,107,107,0.1)';
                clearAll.onmouseout = () => clearAll.style.background = 'transparent';
                clearAll.onclick = () => {
                    if(confirm('确定要清空所有 SQL 连接历史记录吗？(Are you sure to clear all history?)')) {
                        localStorage.removeItem('sqlHistory');
                        loadSQLHistory();
                        historyDropdown.style.display = 'none';
                    }
                };
                historyDropdown.appendChild(clearAll);
            } else {
                historyBtn.style.display = 'none';
                historyDropdown.style.display = 'none';
            }
        };

        const loadSettings = async () => {
            try {
                const res = await fetch('/api/settings');
                const data = await res.json();
                document.getElementById('set-sql').value = data.SQL_CONN_STR || '';
                document.getElementById('set-workspace').value = data.WORKSPACE_ID || '';
                document.getElementById('set-dataset').value = data.DATASET_ID || '';
                document.getElementById('set-report').value = data.REPORT_ID || '';
                document.getElementById('set-client').value = data.CLIENT_ID || '';
                document.getElementById('set-secret').value = data.CLIENT_SECRET || '';
                document.getElementById('set-tenant').value = data.TENANT_ID || '';
                
                loadSQLHistory();
            } catch (err) {
                console.error('Failed to load settings:', err);
            }
        };

        // 绑定下拉框开关逻辑
        const historyBtn = document.getElementById('sql-history-btn');
        const historyDropdown = document.getElementById('sql-history-dropdown');
        if (historyBtn && historyDropdown) {
            historyBtn.onclick = () => {
                historyDropdown.style.display = historyDropdown.style.display === 'none' ? 'block' : 'none';
            };
            document.addEventListener('click', (e) => {
                if (!historyBtn.contains(e.target) && !historyDropdown.contains(e.target)) {
                    historyDropdown.style.display = 'none';
                }
            });
        }

        setupFLIPModal(btnSettings, closeSettingsBtn, settingsModal, loadSettings);

        const settingsForm = document.getElementById('settings-form');
        settingsForm.addEventListener('submit', async (e) => {
            e.preventDefault(); // 阻止页面刷新，但允许浏览器捕获 submit 以保存表单历史
            saveSettingsBtn.disabled = true;
            saveSettingsBtn.textContent = '保存中...';
            
            const payload = {
                SQL_CONN_STR: document.getElementById('set-sql').value.replace(/\r?\n|\r/g, '').trim(),
                WORKSPACE_ID: document.getElementById('set-workspace').value.trim(),
                DATASET_ID: document.getElementById('set-dataset').value.trim(),
                REPORT_ID: document.getElementById('set-report').value.trim(),
                CLIENT_ID: document.getElementById('set-client').value.trim(),
                CLIENT_SECRET: document.getElementById('set-secret').value.trim(),
                TENANT_ID: document.getElementById('set-tenant').value.trim()
            };

            // 存入自定义的 SQL 历史记录
            if (payload.SQL_CONN_STR) {
                try {
                    let history = JSON.parse(localStorage.getItem('sqlHistory') || '[]');
                    history = history.filter(h => h !== payload.SQL_CONN_STR);
                    history.unshift(payload.SQL_CONN_STR);
                    if (history.length > 5) history.pop();
                    localStorage.setItem('sqlHistory', JSON.stringify(history));
                } catch(e) {
                    localStorage.removeItem('sqlHistory');
                }
                loadSQLHistory(); // 更新视图
            }

            try {
                const res = await fetch('/api/settings', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });
                const result = await res.json();
                if (result.success) {
                    saveSettingsBtn.textContent = '✅ 已保存';
                    setTimeout(() => {
                        settingsModal.style.display = 'none';
                        saveSettingsBtn.disabled = false;
                        saveSettingsBtn.textContent = '💾 保存配置 (Save & Apply)';
                    }, 1000);
                } else {
                    alert('保存失败: ' + result.message);
                    saveSettingsBtn.disabled = false;
                    saveSettingsBtn.textContent = '💾 保存配置 (Save & Apply)';
                }
            } catch (err) {
                alert('网络错误: ' + err);
                saveSettingsBtn.disabled = false;
                saveSettingsBtn.textContent = '💾 保存配置 (Save & Apply)';
            }
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
        sidebar.style.minWidth = savedSidebarWidth;
    }
    const savedRequestHeight = localStorage.getItem('pbi-request-height');
    if (savedRequestHeight) {
        requestBuilder.style.height = savedRequestHeight;
        requestBuilder.style.flex = 'none';
    }
    // --- 结束恢复 ---

    resizer.addEventListener('mousedown', (e) => {
        isResizing = true;
        resizer.classList.add('active');
        document.body.style.cursor = 'col-resize';
        document.body.style.userSelect = 'none';
    });

    vResizer.addEventListener('mousedown', (e) => {
        isVerticalResizing = true;
        startY = e.clientY;
        startHeight = requestBuilder.getBoundingClientRect().height;
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
        }
        
        if (isVerticalResizing) {
            const delta = e.clientY - startY;
            const newHeight = startHeight + delta;
            if (newHeight > 150 && newHeight < window.innerHeight - 150) {
                requestBuilder.style.height = `${newHeight}px`;
                requestBuilder.style.flex = 'none'; // 取消默认的 flex 行为，强制使用 height
            }
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
            localStorage.setItem('pbi-request-height', requestBuilder.style.height);
        }
    });
});
