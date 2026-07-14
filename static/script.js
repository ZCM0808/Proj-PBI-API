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

    let currentApiType = 'powerbi';
    let currentActiveFlag = 'ALL';

    function updateBaseUrlHint(apiType) {
        const hintEl = document.getElementById('base-url-hint');
        if (hintEl) {
            if (apiType === 'fabric') {
                hintEl.textContent = 'https://api.fabric.microsoft.com/v1.0';
            } else {
                hintEl.textContent = 'https://api.powerbi.com/v1.0/myorg';
            }
        }
        
        // 动态同步更新侧边栏最底部的全局 API 文档链接和文字
        const globalDocLink = document.getElementById('global-doc-link');
        if (globalDocLink) {
            if (apiType === 'fabric') {
                globalDocLink.href = 'https://learn.microsoft.com/en-us/rest/api/fabric/';
                globalDocLink.innerHTML = '查看官方 Fabric API 文档 &rarr;';
            } else {
                globalDocLink.href = 'https://learn.microsoft.com/en-us/rest/api/power-bi/';
                globalDocLink.innerHTML = '查看官方 Power BI API 文档 &rarr;';
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
            
            let category = rawCategory.toLowerCase().replace(/\s+/g, '-');
            if (!category || category === 'others') {
                return 'https://learn.microsoft.com/en-us/rest/api/power-bi/';
            }

            return `https://learn.microsoft.com/en-us/rest/api/power-bi/${category}/${slug}`;
        }
    }

    // 智能在 Free Mode 下监听 URL 输入，切换前缀提示
    document.addEventListener('DOMContentLoaded', () => {
        const endpointInput = document.getElementById('api-endpoint');
        if (endpointInput) {
            endpointInput.addEventListener('input', () => {
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
    });

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
        
        renderTree();
    } catch (e) {
        console.error("Failed to load swagger", e);
        apiTree.innerHTML = `<div style="padding: 1rem; color: #ef4444;">无法加载完整的 API 列表，请刷新重试。<br><br><small style="color:var(--text-secondary);">${e.stack || e.message || e}</small></div>`;
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
            isDetailsCollapsed = false;
        } else {
            selectedApiContent.style.display = 'none';
            toggleInfoBtn.innerHTML = '&#9633;'; // 正方形符号代表最大化/还原
            toggleInfoBtn.title = '还原';
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
                return ep.name.toLowerCase().includes(term) || 
                       ep.path.toLowerCase().includes(term) ||
                       ep.method.toLowerCase().includes(term) ||
                       zhName.includes(term);
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
                
                // 渲染微缩 Flag 标志
                const flagEl = document.createElement('span');
                flagEl.style.fontSize = '0.55rem';
                flagEl.style.padding = '1px 4px';
                flagEl.style.borderRadius = '4px';
                flagEl.style.marginLeft = '6px';
                flagEl.style.background = 'rgba(255,255,255,0.08)';
                flagEl.style.color = 'var(--text-secondary)';
                flagEl.style.border = '1px solid rgba(255,255,255,0.1)';
                flagEl.style.display = 'inline-block';
                flagEl.style.verticalAlign = 'middle';
                flagEl.textContent = ep.flag === 'DataFactory' ? 'DF' : (ep.flag === 'Lakehouse' ? 'LH' : (ep.flag === 'Warehouse' ? 'WH' : (ep.flag === 'Notebook' ? 'NB' : ep.flag)));
                
                if (ep.flag === 'PBI') {
                    flagEl.style.color = '#F2C811';
                    flagEl.style.borderColor = 'rgba(242, 200, 17, 0.3)';
                    flagEl.style.background = 'rgba(242, 200, 17, 0.05)';
                } else if (ep.flag === 'Lakehouse') {
                    flagEl.style.color = '#38bdf8';
                    flagEl.style.borderColor = 'rgba(56, 189, 248, 0.3)';
                    flagEl.style.background = 'rgba(56, 189, 248, 0.05)';
                } else if (ep.flag === 'Warehouse') {
                    flagEl.style.color = '#a78bfa';
                    flagEl.style.borderColor = 'rgba(167, 139, 250, 0.3)';
                    flagEl.style.background = 'rgba(167, 139, 250, 0.05)';
                } else if (ep.flag === 'KQL') {
                    flagEl.style.color = '#f43f5e';
                    flagEl.style.borderColor = 'rgba(244, 63, 94, 0.3)';
                    flagEl.style.background = 'rgba(244, 63, 94, 0.05)';
                } else if (ep.flag === 'Notebook') {
                    flagEl.style.color = '#34d399';
                    flagEl.style.borderColor = 'rgba(52, 211, 153, 0.3)';
                    flagEl.style.background = 'rgba(52, 211, 153, 0.05)';
                } else if (ep.flag === 'Core') {
                    flagEl.style.color = '#fb923c';
                    flagEl.style.borderColor = 'rgba(251, 146, 60, 0.3)';
                    flagEl.style.background = 'rgba(251, 146, 60, 0.05)';
                } else if (ep.flag === 'DataFactory') {
                    flagEl.style.color = '#ec4899';
                    flagEl.style.borderColor = 'rgba(236, 72, 153, 0.3)';
                    flagEl.style.background = 'rgba(236, 72, 153, 0.05)';
                }

                // 显示中文翻译在列表上（也可以只显示英文，这里展示双语）
                const zhTranslated = translateApiName(ep.name);
                nameEl.innerHTML = `<div style="display:flex; align-items:center;"><span>${ep.name}</span></div><div style="font-size:0.7rem; color:var(--text-secondary); margin-top:2px;">${zhTranslated}</div>`;
                nameEl.querySelector('div').appendChild(flagEl);
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
                    methodSelect.value = originalMethod;
                    methodSelect.disabled = true; // 锁定 Method
                    bodyInput.value = originalBody;
                    
                    // 恢复 Unlock 按钮状态
                    document.getElementById('toggle-method-btn').innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg><span>Unlock</span>';

                    // 展示详细信息面板
                    selectedApiInfo.style.display = 'block';
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
                    // 同步底部全局文档链接为当前选中 API 的精确文档页面
                    const globalDocLink = document.getElementById('global-doc-link');
                    if (globalDocLink) {
                        globalDocLink.href = docUrl;
                        globalDocLink.innerHTML = `查看 ${ep.name} 官方文档 &rarr;`;
                    }
                    selectedApiName.textContent = ep.name;
                    
                    // 动态更新标题 Badge
                    updateRequestMode('api', `Bound to: ${ep.name}`);
                    selectedApiZh.textContent = zhTranslated;

                    // 渲染描述与警示前置条件
                    let finalDescHtml = ep.description ? ep.description.replace(/\n/g, '<br>') : '<span style="color:var(--text-secondary)">暂无描述</span>';
                    
                    if (ep.prerequisites && ep.prerequisites.length > 0) {
                        const prereqItems = ep.prerequisites.map(p => `<li style="margin-bottom: 6px;">${p.replace(/\n/g, '<br>').replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')}</li>`).join('');
                        const alertBox = `
                            <div style="margin-top: 16px; padding: 12px 16px; background: rgba(210, 153, 34, 0.1); border-left: 4px solid #d29922; border-radius: 4px;">
                                <div style="color: #d29922; font-weight: bold; margin-bottom: 8px; font-size: 0.9rem; display: flex; align-items: center; gap: 6px;">
                                    <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor"><path fill-rule="evenodd" d="M8.22 1.754a.25.25 0 00-.44 0L1.698 13.132a.25.25 0 00.22.368h12.164a.25.25 0 00.22-.368L8.22 1.754zm-1.763-.707c.659-1.234 2.427-1.234 3.086 0l6.082 11.378A1.75 1.75 0 0114.082 15H1.918a1.75 1.75 0 01-1.543-2.575L6.457 1.047zM9 11a1 1 0 11-2 0 1 1 0 012 0zm-.25-5.25a.75.75 0 00-1.5 0v2.5a.75.75 0 001.5 0v-2.5z"></path></svg>
                                    运行前置条件 (Prerequisites)
                                </div>
                                <ul style="margin: 0; padding-left: 24px; color: #c9d1d9; font-size: 0.85rem; line-height: 1.5;">
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
                    toggleAllBtn.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 15l-6-6-6 6"></path></svg>';
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
                list.style.display = allExpanded ? 'flex' : 'none';
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
            
            toggleAllBtn.innerHTML = allExpanded ? 
                '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 15l-6-6-6 6"></path></svg>' : // 展开时的向上收起箭头
                '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 9l6 6 6-6"></path></svg>';  // 折叠时的向下展开箭头
        });
    }

    async function executeRequest() {
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
                responseOutput.style.color = '#a78bfa';
                window.currentJsonResponse = data.data;
                const toggleBtn = document.getElementById('view-toggle-btn');
                if (toggleBtn) {
                    toggleBtn.style.display = 'block';
                    toggleBtn.textContent = 'Raw View';
                }
                if (typeof renderJsonTree === 'function') {
                    renderJsonTree(data.data, responseOutput);
                }
            } else {
                responseStatus.textContent = `Error`;
                responseStatus.className = 'response-status status-error';
                responseOutput.textContent = JSON.stringify(data.error || data, null, 2);
                window.currentJsonResponse = data.error || data;
                const toggleBtn = document.getElementById('view-toggle-btn');
                if (toggleBtn) {
                    toggleBtn.style.display = 'block';
                    toggleBtn.textContent = 'Raw View';
                }
                if (typeof renderJsonTree === 'function') {
                    renderJsonTree(window.currentJsonResponse, responseOutput);
                }
            }

        } catch (err) {
            responseStatus.textContent = `Network Error`;
            responseStatus.className = 'response-status status-error';
            responseOutput.textContent = err.message;
            responseOutput.style.color = '#ef4444';
            window.currentJsonResponse = null;
            const toggleBtn = document.getElementById('view-toggle-btn');
            if (toggleBtn) toggleBtn.style.display = 'none';
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

    sendBtn.addEventListener('click', () => {
        const method = methodSelect.value;
        const endpoint = endpointInput.value.trim();
        
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
                modal.offsetHeight; // 强制触发 DOM 重绘以触发 CSS 过渡动画
                modal.classList.add('show');
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
            hideModalWithAnimation();
            executeRequest();
        });
    }

    // 复制 cURL 请求绑定
    const copyBtn = document.getElementById('copy-btn');
    if (copyBtn) {
        copyBtn.addEventListener('click', () => {
            const method = methodSelect.value;
            const endpoint = endpointInput.value.trim();
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
                const btnText = copyBtn.querySelector('span');
                const origText = btnText.textContent;
                btnText.textContent = 'Copied!';
                copyBtn.style.borderColor = '#10b981';
                copyBtn.style.color = '#10b981';
                setTimeout(() => {
                    btnText.textContent = origText;
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
                item.style.cssText = 'padding: 10px 12px; border-bottom: 1px solid rgba(255,255,255,0.05); cursor: pointer; display: flex; flex-direction: column; gap: 6px; transition: background 0.2s;';
                item.onmouseover = () => item.style.background = 'rgba(255,255,255,0.05)';
                item.onmouseout = () => item.style.background = 'transparent';
                
                const topRow = document.createElement('div');
                topRow.style.cssText = 'display: flex; justify-content: space-between; align-items: flex-start; gap: 8px;';
                
                const methodUrl = document.createElement('div');
                methodUrl.style.cssText = 'flex: 1; word-break: break-all;';
                const methodColor = h.method === 'GET' ? '#3b82f6' : (h.method === 'POST' ? '#10b981' : (h.method === 'DELETE' ? '#ef4444' : '#f59e0b'));
                
                // 识别并展示前缀，不再显示 API 描述名称
                const prefix = h.api_type === 'fabric' ? 'https://api.fabric.microsoft.com/v1.0' : 'https://api.powerbi.com/v1.0/myorg';
                const prefixText = h.api_type === 'fabric' ? 'Fabric' : 'Power BI';
                const badgeColor = h.api_type === 'fabric' ? '#38bdf8' : '#F2C811';
                
                const modeHtml = `<div style="display: inline-block; padding: 1px 6px; border-radius: 4px; border: 1px solid ${badgeColor}33; color: ${badgeColor}; background: ${badgeColor}0d; font-size: 0.65rem; margin-bottom: 6px; font-weight: 500;">${prefixText}</div><br>`;
                
                methodUrl.innerHTML = `${modeHtml}<span style="color: ${methodColor}; font-weight: bold; margin-right: 8px; font-size: 0.8rem;">${h.method}</span><span style="font-size: 0.75rem; color: #8b949e; font-family: 'Fira Code', monospace; display: block; margin-top: 4px; line-height: 1.4;"><span style="color: #6e7681; opacity: 0.7;">${prefix}</span>${h.url}</span>`;
                
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
                    if (historySearchInput) historySearchInput.value = '';
                    
                    updateRequestMode('free', 'Free Mode (From History)');
                    endpointInput.dispatchEvent(new Event('input'));
                };
                
                historyListContainer.appendChild(item);
            });
        } else {
            historyListContainer.innerHTML = '<div style="padding: 16px; color: #6e7681; font-size: 0.85rem; text-align: center;">📜 暂无记录 (No Records Found)</div>';
        }
    };

        if (historySearchInput) {
        historySearchInput.addEventListener('input', (e) => loadReqHistory(e.target.value));
        historySearchInput.addEventListener('click', (e) => e.stopPropagation());
    }

    if (historyClearAll) {
        historyClearAll.onmouseover = () => historyClearAll.style.background = 'rgba(255,107,107,0.1)';
        historyClearAll.onmouseout = () => historyClearAll.style.background = '#1f2428';
        historyClearAll.onclick = () => {
            if(confirm('确定要清空所有请求历史记录吗？(Are you sure to clear all request history?)')) {
                localStorage.removeItem('apiReqHistory');
                if (historySearchInput) historySearchInput.value = '';
                loadReqHistory();
                if (historyReqDropdown) historyReqDropdown.style.display = 'none';
            }
        };
    }
    
    if (historyReqBtn && historyReqDropdown) {
        historyReqBtn.addEventListener('click', () => {
            if (historyReqDropdown.style.display === 'none') {
                if (historySearchInput) historySearchInput.value = '';
                loadReqHistory();
                historyReqDropdown.style.display = 'flex';
                if (historySearchInput) setTimeout(() => historySearchInput.focus(), 50);
            } else {
                historyReqDropdown.style.display = 'none';
            }
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

    let minAllowedHeight = 150;
    vResizer.addEventListener('mousedown', (e) => {
        isVerticalResizing = true;
        startY = e.clientY;
        startHeight = requestBuilder.getBoundingClientRect().height;
        const oldH = requestBuilder.style.height; requestBuilder.style.height = 'auto'; minAllowedHeight = requestBuilder.scrollHeight; requestBuilder.style.height = oldH;
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
            const baseHeight = startHeight + delta;
            
            const finalHeight = Math.max(minAllowedHeight, Math.min(baseHeight, window.innerHeight - 150));
            if (true) {
                requestBuilder.style.height = finalHeight + 'px';
                
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

document.addEventListener('DOMContentLoaded', () => {
    const toggleBtn = document.getElementById('view-toggle-btn');
    if(toggleBtn) {
        toggleBtn.addEventListener('click', () => {
            const out = document.getElementById('response-output');
            if(!window.currentJsonResponse) return;
            if(toggleBtn.textContent === 'Raw View') {
                out.innerHTML = syntaxHighlight(window.currentJsonResponse);
                out.className = 'json-viewer';
                toggleBtn.textContent = 'Tree View';
            } else {
                renderJsonTree(window.currentJsonResponse, out);
                toggleBtn.textContent = 'Raw View';
            }
        });
    }
});

function renderJsonTree(data, container) {
    container.innerHTML = '';
    container.className = 'json-tree-container';
    container.appendChild(createJsonNode(data, true, null, 0));
}

function createJsonNode(value, isLast, keyName, depth = 0) {
    const wrapper = document.createElement('div');
    wrapper.className = 'json-line';
    
    const contentSpan = document.createElement('span');
    if (keyName !== null) {
        const keySpan = document.createElement('span');
        keySpan.className = 'json-key';
        keySpan.textContent = '"' + keyName + '": ';
        contentSpan.appendChild(keySpan);
    }
    
    if (value === null) {
        const valSpan = document.createElement('span');
        valSpan.className = 'json-null';
        valSpan.textContent = 'null';
        contentSpan.appendChild(valSpan);
        if (!isLast) contentSpan.appendChild(document.createTextNode(','));
        wrapper.appendChild(contentSpan);
        return wrapper;
    }
    
    if (typeof value !== 'object') {
        const type = typeof value;
        const valSpan = document.createElement('span');
        valSpan.className = 'json-' + type;
        valSpan.textContent = type === 'string' ? '"' + value + '"' : String(value);
        contentSpan.appendChild(valSpan);
        if (!isLast) contentSpan.appendChild(document.createTextNode(','));
        wrapper.appendChild(contentSpan);
        return wrapper;
    }
    
    const isArray = Array.isArray(value);
    const openChar = isArray ? '[' : '{';
    const closeChar = isArray ? ']' : '}';
    const keys = Object.keys(value);
    
    if (keys.length === 0) {
        contentSpan.appendChild(document.createTextNode(openChar + closeChar + (isLast ? '' : ',')));
        wrapper.appendChild(contentSpan);
        return wrapper;
    }
    
    const toggle = document.createElement('span');
    toggle.className = 'json-toggle';
    
    contentSpan.appendChild(document.createTextNode(openChar));
    
    const collapsedText = document.createElement('span');
    collapsedText.className = 'json-collapsed-text json-hidden';
    collapsedText.textContent = (isArray ? ' Array(' + keys.length + ') ' : ' ... ') + closeChar + (isLast ? '' : ',');
    
    const childrenContainer = document.createElement('div');
    childrenContainer.className = isArray ? 'json-array' : 'json-dict';
    
    let isRendered = false;
    const maxItems = 500;
    
    function renderChildren() {
        if (isRendered) return;
        isRendered = true;
        const renderKeys = keys.slice(0, maxItems);
        renderKeys.forEach((k, i) => {
            const childIsLast = (i === keys.length - 1);
            childrenContainer.appendChild(createJsonNode(value[k], childIsLast, isArray ? null : k, depth + 1));
        });
        if (keys.length > maxItems) {
            const moreSpan = document.createElement('div');
            moreSpan.style.color = '#8b949e';
            moreSpan.style.fontStyle = 'italic';
            moreSpan.textContent = '... and ' + (keys.length - maxItems) + ' more items hidden to prevent browser crash ...';
            childrenContainer.appendChild(moreSpan);
        }
    }
    
    const footer = document.createElement('div');
    footer.textContent = closeChar + (isLast ? '' : ',');
    
    const autoExpand = depth < 2;
    
    if (!autoExpand) {
        childrenContainer.classList.add('json-hidden');
        footer.classList.add('json-hidden');
        collapsedText.classList.remove('json-hidden');
        toggle.textContent = '\u25b6';
    } else {
        renderChildren();
        toggle.textContent = '\u25bc';
    }
    
    toggle.onclick = () => {
        const isCollapsed = childrenContainer.classList.contains('json-hidden');
        if (isCollapsed) {
            renderChildren();
            childrenContainer.classList.remove('json-hidden');
            footer.classList.remove('json-hidden');
            collapsedText.classList.add('json-hidden');
            toggle.textContent = '\u25bc';
        } else {
            childrenContainer.classList.add('json-hidden');
            footer.classList.add('json-hidden');
            collapsedText.classList.remove('json-hidden');
            toggle.textContent = '\u25b6';
        }
    };
    collapsedText.onclick = toggle.onclick;
    
    wrapper.appendChild(toggle);
    wrapper.appendChild(contentSpan);
    wrapper.appendChild(collapsedText);
    wrapper.appendChild(childrenContainer);
    wrapper.appendChild(footer);
    
    return wrapper;
}
