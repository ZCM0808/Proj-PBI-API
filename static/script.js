const pbiApis = [
    {
        category: "Workspaces (Groups)",
        endpoints: [
            { name: "Get Workspaces", method: "GET", path: "/groups" },
            { name: "Create Workspace", method: "POST", path: "/groups", body: '{\n  "name": "New Workspace"\n}' },
            { name: "Get Workspace Users", method: "GET", path: "/groups/{groupId}/users" },
            { name: "Add Workspace User", method: "POST", path: "/groups/{groupId}/users", body: '{\n  "identifier": "user@example.com",\n  "groupUserAccessRight": "Member",\n  "principalType": "App"\n}' },
            { name: "Update Workspace User", method: "PUT", path: "/groups/{groupId}/users", body: '{\n  "identifier": "user@example.com",\n  "groupUserAccessRight": "Admin",\n  "principalType": "App"\n}' },
            { name: "Delete Workspace User", method: "DELETE", path: "/groups/{groupId}/users/{user}" },
            { name: "Update Workspace", method: "PATCH", path: "/groups/{groupId}", body: '{\n  "name": "Updated Workspace Name"\n}' },
            { name: "Delete Workspace", method: "DELETE", path: "/groups/{groupId}" },
        ]
    },
    {
        category: "Reports",
        endpoints: [
            { name: "Get Reports In Group", method: "GET", path: "/groups/{groupId}/reports" },
            { name: "Get Report In Group", method: "GET", path: "/groups/{groupId}/reports/{reportId}" },
            { name: "Clone Report", method: "POST", path: "/groups/{groupId}/reports/{reportId}/Clone", body: '{\n  "name": "Cloned Report Name",\n  "targetWorkspaceId": "00000000-0000-0000-0000-000000000000"\n}' },
            { name: "Delete Report In Group", method: "DELETE", path: "/groups/{groupId}/reports/{reportId}" },
            { name: "Export To File", method: "POST", path: "/groups/{groupId}/reports/{reportId}/ExportTo", body: '{\n  "format": "PDF"\n}' },
            { name: "Get Export Status", method: "GET", path: "/groups/{groupId}/reports/{reportId}/exports/{exportId}" },
            { name: "Rebind Report", method: "POST", path: "/groups/{groupId}/reports/{reportId}/Rebind", body: '{\n  "datasetId": "00000000-0000-0000-0000-000000000000"\n}' },
            { name: "Update Report Content", method: "POST", path: "/groups/{groupId}/reports/{reportId}/UpdateReportContent", body: '{\n  "sourceReport": {\n    "sourceReportId": "00000000-0000-0000-0000-000000000000",\n    "sourceWorkspaceId": "00000000-0000-0000-0000-000000000000"\n  },\n  "sourceType": "ExistingReport"\n}' },
        ]
    },
    {
        category: "Datasets",
        endpoints: [
            { name: "Get Datasets In Group", method: "GET", path: "/groups/{groupId}/datasets" },
            { name: "Get Dataset In Group", method: "GET", path: "/groups/{groupId}/datasets/{datasetId}" },
            { name: "Refresh Dataset", method: "POST", path: "/groups/{groupId}/datasets/{datasetId}/refreshes", body: '{\n  "notifyOption": "MailOnFailure"\n}' },
            { name: "Get Refresh History", method: "GET", path: "/groups/{groupId}/datasets/{datasetId}/refreshes" },
            { name: "Cancel Refresh", method: "DELETE", path: "/groups/{groupId}/datasets/{datasetId}/refreshes/{refreshId}" },
            { name: "Update Parameters", method: "POST", path: "/groups/{groupId}/datasets/{datasetId}/Default.UpdateParameters", body: '{\n  "updateDetails": [\n    {\n      "name": "DatabaseName",\n      "newValue": "NewDB"\n    }\n  ]\n}' },
            { name: "Get Parameters", method: "GET", path: "/groups/{groupId}/datasets/{datasetId}/parameters" },
            { name: "Execute Queries", method: "POST", path: "/datasets/{datasetId}/executeQueries", body: '{\n  "queries": [\n    {\n      "query": "EVALUATE VALUES(MyTable)"\n    }\n  ],\n  "serializerSettings": {\n    "includeNulls": true\n  }\n}' },
            { name: "Bind To Gateway", method: "POST", path: "/groups/{groupId}/datasets/{datasetId}/Default.BindToGateway", body: '{\n  "gatewayObjectId": "00000000-0000-0000-0000-000000000000",\n  "datasourceObjectIds": [\n    "00000000-0000-0000-0000-000000000000"\n  ]\n}' },
            { name: "Take Over Dataset", method: "POST", path: "/groups/{groupId}/datasets/{datasetId}/Default.TakeOver" },
        ]
    },
    {
        category: "Dashboards",
        endpoints: [
            { name: "Get Dashboards In Group", method: "GET", path: "/groups/{groupId}/dashboards" },
            { name: "Get Dashboard In Group", method: "GET", path: "/groups/{groupId}/dashboards/{dashboardId}" },
            { name: "Add Dashboard", method: "POST", path: "/groups/{groupId}/dashboards", body: '{\n  "name": "New Dashboard"\n}' },
            { name: "Clone Dashboard", method: "POST", path: "/groups/{groupId}/dashboards/{dashboardId}/Clone", body: '{\n  "name": "Cloned Dashboard",\n  "targetWorkspaceId": "00000000-0000-0000-0000-000000000000"\n}' },
            { name: "Get Tiles", method: "GET", path: "/groups/{groupId}/dashboards/{dashboardId}/tiles" },
            { name: "Clone Tile", method: "POST", path: "/groups/{groupId}/dashboards/{dashboardId}/tiles/{tileId}/Clone", body: '{\n  "targetDashboardId": "00000000-0000-0000-0000-000000000000"\n}' },
        ]
    },
    {
        category: "Gateways",
        endpoints: [
            { name: "Get Gateways", method: "GET", path: "/gateways" },
            { name: "Get Gateway", method: "GET", path: "/gateways/{gatewayId}" },
            { name: "Get Datasources", method: "GET", path: "/gateways/{gatewayId}/datasources" },
            { name: "Create Datasource", method: "POST", path: "/gateways/{gatewayId}/datasources", body: '{\n  "dataSourceName": "MyDataSource",\n  "dataSourceType": "Sql",\n  "connectionDetails": "{\\"server\\":\\"myserver\\",\\"database\\":\\"mydb\\"}",\n  "credentialDetails": {\n    "credentials": "{\\"credentialData\\":[{\\"name\\":\\"username\\",\\"value\\":\\"user\\"},{\\"name\\":\\"password\\",\\"value\\":\\"pass\\"}]}",\n    "credentialType": "Basic",\n    "encryptedConnection": "Encrypted",\n    "encryptionAlgorithm": "None",\n    "privacyLevel": "Private"\n  }\n}' },
            { name: "Delete Datasource", method: "DELETE", path: "/gateways/{gatewayId}/datasources/{datasourceId}" },
        ]
    },
    {
        category: "Dataflows",
        endpoints: [
            { name: "Get Dataflows", method: "GET", path: "/groups/{groupId}/dataflows" },
            { name: "Get Dataflow Data Sources", method: "GET", path: "/groups/{groupId}/dataflows/{dataflowId}/datasources" },
            { name: "Refresh Dataflow", method: "POST", path: "/groups/{groupId}/dataflows/{dataflowId}/refreshes", body: '{\n  "notifyOption": "MailOnFailure"\n}' },
            { name: "Update Dataflow", method: "PATCH", path: "/groups/{groupId}/dataflows/{dataflowId}", body: '{\n  "name": "New Name",\n  "description": "New Description"\n}' },
            { name: "Delete Dataflow", method: "DELETE", path: "/groups/{groupId}/dataflows/{dataflowId}" },
        ]
    },
    {
        category: "Admin",
        endpoints: [
            { name: "Get Groups As Admin", method: "GET", path: "/admin/groups?$top=100" },
            { name: "Get Activity Events", method: "GET", path: "/admin/activityevents?startDateTime='2024-01-01T00:00:00Z'&endDateTime='2024-01-01T23:59:59Z'" },
            { name: "Get Workspace Info", method: "POST", path: "/admin/workspaces/getInfo", body: '{\n  "workspaces": ["00000000-0000-0000-0000-000000000000"]\n}' },
            { name: "Get Scan Status", method: "GET", path: "/admin/workspaces/scanStatus/{scanId}" },
            { name: "Get Scan Result", method: "GET", path: "/admin/workspaces/scanResult/{scanId}" },
            { name: "Add User To Workspace", method: "POST", path: "/admin/groups/{groupId}/users", body: '{\n  "identifier": "user@example.com",\n  "groupUserAccessRight": "Admin",\n  "principalType": "App"\n}' },
        ]
    },
    {
        category: "Pipelines (Deployment)",
        endpoints: [
            { name: "Get Pipelines", method: "GET", path: "/pipelines" },
            { name: "Get Pipeline Stages", method: "GET", path: "/pipelines/{pipelineId}/stages" },
            { name: "Deploy All", method: "POST", path: "/pipelines/{pipelineId}/deployAll", body: '{\n  "sourceStageOrder": 0,\n  "isBackwardDeployment": false\n}' },
            { name: "Assign Workspace", method: "POST", path: "/pipelines/{pipelineId}/stages/{stageOrder}/assignWorkspace", body: '{\n  "workspaceId": "00000000-0000-0000-0000-000000000000"\n}' },
        ]
    }
];

document.addEventListener('DOMContentLoaded', () => {
    const methodSelect = document.getElementById('http-method');
    const endpointInput = document.getElementById('api-endpoint');
    const bodyInput = document.getElementById('request-body');
    const sendBtn = document.getElementById('send-btn');
    const responseOutput = document.getElementById('response-output');
    const responseStatus = document.getElementById('response-status');
    
    const apiTree = document.getElementById('api-tree');
    const searchInput = document.getElementById('api-search');

    // 渲染 API 树
    function renderTree(searchTerm = "") {
        apiTree.innerHTML = '';
        
        pbiApis.forEach(category => {
            // 过滤 endpoints
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
            
            filteredEndpoints.forEach(ep => {
                const itemEl = document.createElement('li');
                itemEl.className = 'api-item';
                
                const badge = document.createElement('span');
                badge.className = `method-badge method-${ep.method}`;
                badge.textContent = ep.method;
                
                const nameEl = document.createElement('span');
                nameEl.className = 'api-item-name';
                nameEl.textContent = ep.name;

                itemEl.appendChild(badge);
                itemEl.appendChild(nameEl);

                itemEl.addEventListener('click', () => {
                    // 更新 UI 状态
                    document.querySelectorAll('.api-item').forEach(i => i.classList.remove('active'));
                    itemEl.classList.add('active');

                    // 填入数据
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

            // 简单的折叠逻辑
            titleEl.addEventListener('click', () => {
                listEl.style.display = listEl.style.display === 'none' ? 'flex' : 'none';
            });

            categoryEl.appendChild(listEl);
            apiTree.appendChild(categoryEl);
        });
    }

    // 初始化渲染
    renderTree();

    // 搜索监听
    searchInput.addEventListener('input', (e) => {
        renderTree(e.target.value);
    });

    // 发送请求
    sendBtn.addEventListener('click', async () => {
        const method = methodSelect.value;
        const endpoint = endpointInput.value.trim();
        let bodyStr = bodyInput.value.trim();
        let body = null;
        
        if (!endpoint) {
            alert('请填写 API 路径');
            return;
        }

        if (bodyStr) {
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
});
