document.addEventListener('DOMContentLoaded', async () => {
    const methodSelect = document.getElementById('http-method');
    const endpointInput = document.getElementById('api-endpoint');
    const bodyInput = document.getElementById('request-body');
    const sendBtn = document.getElementById('send-btn');
    const responseOutput = document.getElementById('response-output');
    const responseStatus = document.getElementById('response-status');
    
    const apiTree = document.getElementById('api-tree');
    const searchInput = document.getElementById('api-search');

    let pbiApis = [];

    apiTree.innerHTML = '<div style="padding:1rem; text-align:center; color: var(--text-secondary);"><span class="loader"></span> 加载全部 API 中...</div>';

    try {
        const res = await fetch('/static/swagger.json');
        const swagger = await res.json();
        
        const categories = {};

        for (const [path, methods] of Object.entries(swagger.paths)) {
            for (const [method, details] of Object.entries(methods)) {
                if (!['get', 'post', 'put', 'patch', 'delete'].includes(method.toLowerCase())) continue;
                
                const category = details.tags && details.tags.length > 0 ? details.tags[0] : 'Others';
                
                if (!categories[category]) {
                    categories[category] = [];
                }
                
                let sampleBody = '';
                if (['post', 'put', 'patch'].includes(method.toLowerCase())) {
                    sampleBody = '{\n  // 请参考文档填入参数\n}'; 
                }

                categories[category].push({
                    name: details.summary || details.operationId || path,
                    method: method.toUpperCase(),
                    path: path.replace("https://api.powerbi.com/v1.0/myorg", ""), // clean path
                    body: sampleBody
                });
            }
        }

        pbiApis = Object.keys(categories).map(cat => ({
            category: cat,
            endpoints: categories[cat]
        }));
        
        pbiApis.sort((a, b) => a.category.localeCompare(b.category));
        
        renderTree();
    } catch (e) {
        console.error("Failed to load swagger", e);
        apiTree.innerHTML = '<div style="padding: 1rem; color: #ef4444;">无法加载完整的 API 列表，请刷新重试。</div>';
    }

    // 渲染 API 树
    function renderTree(searchTerm = "") {
        apiTree.innerHTML = '';
        
        pbiApis.forEach(category => {
            const filteredEndpoints = category.endpoints.filter(ep => {
                const term = searchTerm.toLowerCase();
                return ep.name.toLowerCase().includes(term) || 
                       ep.path.toLowerCase().includes(term) ||
                       ep.method.toLowerCase().includes(term);
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
            if (searchTerm) {
                listEl.style.display = 'flex';
            } else {
                listEl.style.display = 'none'; // 默认折叠以应对大量 API
            }
            
            filteredEndpoints.forEach(ep => {
                const itemEl = document.createElement('li');
                itemEl.className = 'api-item';
                
                const badge = document.createElement('span');
                badge.className = `method-badge method-${ep.method}`;
                badge.textContent = ep.method;
                
                const nameEl = document.createElement('span');
                nameEl.className = 'api-item-name';
                nameEl.textContent = ep.name;
                nameEl.title = ep.path;

                itemEl.appendChild(badge);
                itemEl.appendChild(nameEl);

                itemEl.addEventListener('click', () => {
                    document.querySelectorAll('.api-item').forEach(i => i.classList.remove('active'));
                    itemEl.classList.add('active');

                    endpointInput.value = ep.path;
                    methodSelect.value = ep.method;
                    
                    if (ep.body) {
                        try {
                            bodyInput.value = JSON.stringify(JSON.parse(ep.body), null, 2);
                        } catch(e) {
                            bodyInput.value = ep.body;
                        }
                    } else {
                        bodyInput.value = '';
                    }
                });

                listEl.appendChild(itemEl);
            });

            titleEl.addEventListener('click', () => {
                listEl.style.display = listEl.style.display === 'none' ? 'flex' : 'none';
            });

            categoryEl.appendChild(listEl);
            apiTree.appendChild(categoryEl);
        });
    }

    searchInput.addEventListener('input', (e) => {
        renderTree(e.target.value);
    });

    sendBtn.addEventListener('click', async () => {
        const method = methodSelect.value;
        const endpoint = endpointInput.value.trim();
        let bodyStr = bodyInput.value.trim();
        let body = null;
        
        if (!endpoint) {
            alert('请填写 API 路径');
            return;
        }

        if (bodyStr && !bodyStr.includes('请参考文档填入参数')) {
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
                responseOutput.textContent = JSON.stringify(data.data, null, 2);
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

    // 拖拽改变侧边栏宽度
    const resizer = document.getElementById('dragMe');
    const sidebar = document.querySelector('.sidebar');
    let isResizing = false;

    resizer.addEventListener('mousedown', (e) => {
        isResizing = true;
        document.body.style.cursor = 'col-resize';
        // 防止拖拽时选中文本
        document.body.style.userSelect = 'none';
    });

    document.addEventListener('mousemove', (e) => {
        if (!isResizing) return;
        
        // 获取容器的偏移量
        const containerOffsetLeft = document.querySelector('.app-container').offsetLeft;
        // 计算新宽度：鼠标位置 - 容器左边距 - 左侧 padding (16px)
        let newWidth = e.clientX - containerOffsetLeft - 16;
        
        // 限制最小和最大宽度
        if (newWidth < 200) newWidth = 200;
        if (newWidth > 800) newWidth = 800;
        
        sidebar.style.width = `${newWidth}px`;
    });

    document.addEventListener('mouseup', () => {
        if (isResizing) {
            isResizing = false;
            document.body.style.cursor = 'default';
            document.body.style.userSelect = 'auto';
        }
    });
});
