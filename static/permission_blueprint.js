/**
 * Power BI 6-Layer Permission Flow & What-If Simulation Blueprint Engine
 * 极速 120 FPS 硬件加速渲染、静态几何映射（0 Reflow）、rAF 节流调度、鼠标锚点缩放、智能防丢全景聚焦、与明亮/暗黑双主题深度适配。
 */
(function() {
    'use strict';

    // 预设用户主体数据矩阵
    const USER_PRESETS = {
        'preset_admin': {
            id: 'preset_admin',
            name: 'Sarah Connor',
            upn: 'sarah.connor@contoso.com',
            roleTag: 'Workspace Admin',
            roleColor: '#60a5fa',
            description: '组织租户与工作区最高管理员，具备全部特权穿透能力',
            state: {
                isGuestUser: false,
                isTenantAdmin: true,
                tenantAllowExport: true,
                tenantAllowWebModeling: true,
                capacityType: 'fabric_f64',
                workspaceRole: 'Admin',
                isModelOwner: true,
                isInStrictMode: true,
                hasAccessToAllDataConnections: true,
                gatewayOnline: true,
                sharePermission: 'ReadBuild',
                hasAppAccess: true,
                rlsEnabled: true,
                rlsRoleAssigned: 'Region_East',
                olsEnabled: true,
                maskedFields: 'Salary, Margin'
            }
        },
        'preset_developer': {
            id: 'preset_developer',
            name: 'Alex Developer',
            upn: 'alex.developer@contoso.com',
            roleTag: 'Contributor',
            roleColor: '#34d399',
            description: '报表核心开发者，具有工作区 Contributor 权限，可穿透豁免 RLS/OLS',
            state: {
                isGuestUser: false,
                tenantAllowExport: true,
                tenantAllowWebModeling: true,
                capacityType: 'fabric_f64',
                workspaceRole: 'Contributor',
                isModelOwner: false,
                isInStrictMode: true,
                hasAccessToAllDataConnections: true,
                gatewayOnline: true,
                sharePermission: 'ReadBuild',
                hasAppAccess: true,
                rlsEnabled: true,
                rlsRoleAssigned: 'Region_East',
                olsEnabled: true,
                maskedFields: 'Salary, Margin'
            }
        },
        'preset_member': {
            id: 'preset_member',
            name: 'David Member',
            upn: 'david.member@contoso.com',
            roleTag: 'Workspace Member',
            roleColor: '#818cf8',
            description: '工作区协同业务人员，可添加协作者并重命名报表',
            state: {
                isGuestUser: false,
                tenantAllowExport: true,
                tenantAllowWebModeling: true,
                capacityType: 'fabric_f64',
                workspaceRole: 'Member',
                isModelOwner: false,
                isInStrictMode: true,
                hasAccessToAllDataConnections: true,
                gatewayOnline: true,
                sharePermission: 'ReadBuild',
                hasAppAccess: true,
                rlsEnabled: true,
                rlsRoleAssigned: 'Region_East',
                olsEnabled: true,
                maskedFields: 'Salary, Margin'
            }
        },
        'preset_viewer_rls': {
            id: 'preset_viewer_rls',
            name: 'Emma Viewer',
            upn: 'emma.viewer@contoso.com',
            roleTag: 'Viewer (RLS Restricted)',
            roleColor: '#fbbf24',
            description: '普通只读查看者，严格受 L5 RLS 与 L6 OLS 控制，无穿透特权',
            state: {
                isGuestUser: false,
                tenantAllowExport: true,
                tenantAllowWebModeling: false,
                capacityType: 'fabric_f64',
                workspaceRole: 'Viewer',
                isModelOwner: false,
                isInStrictMode: true,
                hasAccessToAllDataConnections: false,
                gatewayOnline: true,
                sharePermission: 'Read',
                hasAppAccess: true,
                rlsEnabled: true,
                rlsRoleAssigned: 'Region_East',
                olsEnabled: true,
                maskedFields: 'Salary, Margin'
            }
        },
        'preset_build_user': {
            id: 'preset_build_user',
            name: 'Bob Analyst',
            upn: 'bob.analyst@contoso.com',
            roleTag: 'Direct Share + Build',
            roleColor: '#c084fc',
            description: '无工作区角色，仅通过单品级共享获得 Read + Build 权限',
            state: {
                isGuestUser: false,
                tenantAllowExport: true,
                tenantAllowWebModeling: false,
                capacityType: 'pro_shared',
                workspaceRole: 'None',
                isModelOwner: false,
                isInStrictMode: true,
                hasAccessToAllDataConnections: false,
                gatewayOnline: true,
                sharePermission: 'ReadBuild',
                hasAppAccess: false,
                rlsEnabled: true,
                rlsRoleAssigned: 'Region_West',
                olsEnabled: true,
                maskedFields: 'Salary, Margin'
            }
        },
        'preset_read_only': {
            id: 'preset_read_only',
            name: 'Grace Consumer',
            upn: 'grace.consumer@contoso.com',
            roleTag: 'Direct Share (Read Only)',
            roleColor: '#94a3b8',
            description: '无工作区角色，仅被授予单份报表链接只读访问',
            state: {
                isGuestUser: false,
                tenantAllowExport: false,
                tenantAllowWebModeling: false,
                capacityType: 'pro_shared',
                workspaceRole: 'None',
                isModelOwner: false,
                isInStrictMode: true,
                hasAccessToAllDataConnections: false,
                gatewayOnline: true,
                sharePermission: 'Read',
                hasAppAccess: false,
                rlsEnabled: true,
                rlsRoleAssigned: 'Unassigned',
                olsEnabled: true,
                maskedFields: 'Salary, Margin'
            }
        },
        'preset_guest': {
            id: 'preset_guest',
            name: 'Tom Guest (External)',
            upn: 'tom.guest@externalpartner.com',
            roleTag: 'B2B Guest User',
            roleColor: '#f43f5e',
            description: '跨租户外部访客，严格受租户外部共享策略限制',
            state: {
                isGuestUser: true,
                tenantAllowExport: false,
                tenantAllowWebModeling: false,
                capacityType: 'pro_shared',
                workspaceRole: 'Viewer',
                isModelOwner: false,
                isInStrictMode: true,
                hasAccessToAllDataConnections: false,
                gatewayOnline: true,
                sharePermission: 'Read',
                hasAppAccess: true,
                rlsEnabled: true,
                rlsRoleAssigned: 'Region_East',
                olsEnabled: true,
                maskedFields: 'Salary, Margin'
            }
        }
    };

    // 预设模型数据字典
    const MODEL_DEFINITIONS = {
        'model_sales': {
            id: 'model_sales',
            name: 'Enterprise Sales & Margin Model',
            workspaceName: 'Production Analytics',
            capacity: 'Fabric F64 Premium',
            tables: ['Dim_Customer', 'Dim_Product', 'Fact_Sales', 'Security_Matrix'],
            hasRLS: true,
            hasOLS: true,
            users: [
                { upn: 'sarah.connor@contoso.com', role: 'Admin', presetId: 'preset_admin' },
                { upn: 'alex.developer@contoso.com', role: 'Contributor', presetId: 'preset_developer' },
                { upn: 'david.member@contoso.com', role: 'Member', presetId: 'preset_member' },
                { upn: 'emma.viewer@contoso.com', role: 'Viewer', presetId: 'preset_viewer_rls' },
                { upn: 'bob.analyst@contoso.com', role: 'Build User', presetId: 'preset_build_user' }
            ]
        },
        'model_finance': {
            id: 'model_finance',
            name: 'Financial Core Ledger',
            workspaceName: 'Finance Corporate Hub',
            capacity: 'Fabric F64 Premium',
            tables: ['GL_Accounts', 'Cost_Centers', 'Journal_Entries'],
            hasRLS: true,
            hasOLS: false,
            users: [
                { upn: 'sarah.connor@contoso.com', role: 'Admin', presetId: 'preset_admin' },
                { upn: 'alex.developer@contoso.com', role: 'Contributor', presetId: 'preset_developer' },
                { upn: 'grace.consumer@contoso.com', role: 'Direct Share', presetId: 'preset_read_only' }
            ]
        },
        'model_hr': {
            id: 'model_hr',
            name: 'HR Payroll Confidential',
            workspaceName: 'HR & People Operations',
            capacity: 'PPU (Premium Per User)',
            tables: ['Employee', 'Compensation', 'Performance'],
            hasRLS: true,
            hasOLS: true,
            users: [
                { upn: 'sarah.connor@contoso.com', role: 'Admin', presetId: 'preset_admin' },
                { upn: 'emma.viewer@contoso.com', role: 'Viewer (Restricted)', presetId: 'preset_viewer_rls' }
            ]
        },
        'model_inventory': {
            id: 'model_inventory',
            name: 'Supply Chain & Inventory',
            workspaceName: 'Operations Logistics',
            capacity: 'Pro Shared Capacity',
            tables: ['Warehouse', 'Stock_Levels', 'Shipments'],
            hasRLS: false,
            hasOLS: false,
            users: [
                { upn: 'alex.developer@contoso.com', role: 'Contributor', presetId: 'preset_developer' },
                { upn: 'bob.analyst@contoso.com', role: 'Build User', presetId: 'preset_build_user' },
                { upn: 'tom.guest@externalpartner.com', role: 'Guest Viewer', presetId: 'preset_guest' }
            ]
        }
    };

    // 默认蓝图拓扑节点坐标定义 (居中舒展布局)
    const DEFAULT_NODE_COORDS = {
        'node_tenant': { x: 60, y: 80 },
        'node_conn': { x: 60, y: 530 },
        'node_capacity': { x: 440, y: 80 },
        'node_gac': { x: 440, y: 490 },
        'node_workspace': { x: 820, y: 80 },
        'node_sharing': { x: 820, y: 530 },
        'node_rls': { x: 1220, y: 80 },
        'node_ols': { x: 1220, y: 530 },
        'node_pipeline': { x: 1620, y: 80 }
    };

    // 端口几何静态相对偏移表 (彻底消除 getBoundingClientRect 重排)
    const PORT_OFFSETS = {
        'port_out_tenant': { nodeId: 'node_tenant', relX: 320, relY: 58 },
        'port_in_capacity_tenant': { nodeId: 'node_capacity', relX: 0, relY: 58 },
        'port_out_capacity': { nodeId: 'node_capacity', relX: 320, relY: 58 },
        'port_in_ws_capacity': { nodeId: 'node_workspace', relX: 0, relY: 58 },
        'port_out_ws_role': { nodeId: 'node_workspace', relX: 320, relY: 58 },
        'port_out_ws_bypass': { nodeId: 'node_workspace', relX: 320, relY: 82 },
        'port_in_gac_ws': { nodeId: 'node_gac', relX: 0, relY: 58 },
        'port_in_gac_conn': { nodeId: 'node_gac', relX: 0, relY: 82 },
        'port_out_gac_editor': { nodeId: 'node_gac', relX: 320, relY: 58 },
        'port_out_conn_stream': { nodeId: 'node_conn', relX: 320, relY: 58 },
        'port_in_share_ws': { nodeId: 'node_sharing', relX: 0, relY: 58 },
        'port_out_share_stream': { nodeId: 'node_sharing', relX: 320, relY: 58 },
        'port_in_rls_item': { nodeId: 'node_rls', relX: 0, relY: 58 },
        'port_in_rls_bypass': { nodeId: 'node_rls', relX: 0, relY: 82 },
        'port_out_rls_filtered': { nodeId: 'node_rls', relX: 320, relY: 58 },
        'port_in_ols_rls': { nodeId: 'node_ols', relX: 0, relY: 58 },
        'port_in_ols_bypass': { nodeId: 'node_ols', relX: 0, relY: 82 },
        'port_out_ols_final': { nodeId: 'node_ols', relX: 320, relY: 58 },
        'port_in_pipeline_ws': { nodeId: 'node_pipeline', relX: 0, relY: 58 },
        'port_out_pipeline_prod': { nodeId: 'node_pipeline', relX: 320, relY: 58 }
    };

    // 蓝图运行时单例
    class PermissionBlueprintEngine {
        constructor() {
            this.activePresetKey = 'preset_developer';
            this.currentModelKey = 'model_sales';
            this.currentWorkspaceId = '';
            this.currentWorkspaceName = '';
            this.perspective = 'user';
            this.pulseActive = true;
            this.isAuditOpen = true;

            // 画布平移与缩放
            this.zoom = 0.88;
            this.panX = 35;
            this.panY = 25;
            this.isPanning = false;
            this.startX = 0;
            this.startY = 0;

            // 拖拽与硬件加速 rAF 节流调度
            this.draggedNodeId = null;
            this.dragOffset = { x: 0, y: 0 };
            this.cachedContentRect = null;
            this.rafPending = false;
            this.pendingDrag = null;
            this.pendingPan = null;

            // 默认基准中立状态（未选定特定用户主体）
            this.activePresetKey = null;
            this.currentState = {
                isGuestUser: false,
                tenantAllowExport: true,
                tenantAllowWebModeling: false,
                capacityType: 'fabric_f64',
                workspaceRole: 'Viewer',
                isModelOwner: false,
                isInStrictMode: false,
                hasAccessToAllDataConnections: true,
                gatewayOnline: true,
                sharePermission: 'Read',
                hasAppAccess: true,
                rlsEnabled: true,
                rlsRoleAssigned: 'Region_Assigned',
                olsEnabled: false,
                maskedFields: 'Salary, Margin'
            };
            this.nodePositions = this.loadNodePositionsFromStorage();

            // DOM 引用
            this.viewportEl = null;
            this.contentEl = null;
            this.svgEl = null;
            this.wiresGroupEl = null;
            this.isInitialized = false;
            this.hasCenteredOnce = false;
            this.whatIfOverrides = {};
            this.activeFeatureCapsule = 'all';
            this.syncSeq = 0;
        }

        // 统一顶栏与蓝图模型的同步入口
        async syncGlobalModel(isUserTriggered = false) {
            await this.fetchRealModelAndUsers();
            this.populateModelSelect();
        }

        // 设置当前选中的功能场景胶囊 (导出、GAC、RLS、OLS、建模构建)
        setFeatureCapsule(capsuleKey) {
            this.activeFeatureCapsule = capsuleKey || 'all';
            const capsuleContainer = document.getElementById('pb-feature-capsules');
            if (capsuleContainer) {
                const btns = capsuleContainer.querySelectorAll('.pb-capsule-btn');
                btns.forEach(b => {
                    if (b.getAttribute('data-capsule') === this.activeFeatureCapsule) {
                        b.classList.add('active');
                    } else {
                        b.classList.remove('active');
                    }
                });
            }
            this.renderEffectivePermissionsCard();
        }

        // 核心直连顶栏：从全局顶栏 (GTB) 实时同步选定的工作区和语义模型并驱动推演与矩阵重算
        syncFromGtb() {
            const selectedWsIds = Array.from(window.selectedGtbWorkspaceIds || []);
            const selectedDsIds = Array.from(window.selectedGtbDatasetIds || []);
            // 🚨 严格以顶栏选择为唯一依据：顶栏没选就是没选，绝不背着顶栏从 localStorage 偷取旧工作区
            const wsId = selectedWsIds.length > 0 ? selectedWsIds[0] : '';
            const dsId = selectedDsIds.length > 0 ? selectedDsIds[0] : '';

            const wsList = window.getMergedGtbWorkspaces ? window.getMergedGtbWorkspaces() : JSON.parse(localStorage.getItem('pbi_workspaces') || '[]');
            const wsObj = wsId ? wsList.find(w => String(w.id).toLowerCase() === String(wsId).toLowerCase()) : null;
            this.currentWorkspaceId = wsId;
            this.currentWorkspaceName = wsObj ? (wsObj.alias || wsObj.name || wsObj.displayName || wsObj.id) : '';

            const dsList = window.getMergedGtbDatasets ? window.getMergedGtbDatasets() : JSON.parse(localStorage.getItem('pbi_datasets') || '[]');
            const dsObj = dsList.find(d => String(d.id).toLowerCase() === String(dsId).toLowerCase());
            if (dsObj) {
                const mKey = `real_model_${dsObj.id}`;
                if (!MODEL_DEFINITIONS[mKey]) {
                    MODEL_DEFINITIONS[mKey] = {
                        id: mKey,
                        name: `🟢 [Direct Lake] ${dsObj.name || dsObj.alias || dsObj.id}`,
                        rawName: dsObj.name || dsObj.alias || dsObj.id,
                        workspaceId: dsObj.workspaceId || wsId,
                        workspaceName: this.currentWorkspaceName,
                        capacity: 'Fabric F64 容量',
                        storageMode: 'Direct Lake',
                        tables: ['Real_Facts', 'Dim_Customer', 'Security_RLS'],
                        hasRLS: Boolean(dsObj.isEffectiveIdentityRequired || dsObj.hasRLS),
                        hasOLS: false,
                        isReal: true
                    };
                }
                this.currentModelKey = mKey;
            } else if (!dsId) {
                this.currentModelKey = '';
            }

            const syncWsName = document.getElementById('pb-sync-ws-name');
            if (syncWsName) {
                syncWsName.innerHTML = this.currentWorkspaceName
                    ? `<strong style="color: #34d399;">${this.currentWorkspaceName}</strong>`
                    : '<span style="color: var(--text-secondary);">尚未选择 (请在顶栏选择)</span>';
            }

            this.renderNodes();
            this.recalculateAndRenderWires();
            this.renderEffectivePermissionsCard();
            this.updateAuditReport();
            if (this.activeMainTab === 'matrix') {
                this.renderMatrix();
            } else if (this.activeMainTab === 'user_assets') {
                this.renderUserAssetsMatrix();
            }
        }

        // 模块首次激活或切换时调用
        onActivate() {
            if (!this.isInitialized) {
                this.initDOM();
                this.isInitialized = true;
            }
            this.syncFromGtb();
            this.populateWorkspaceSelect();
            this.populateModelSelect();
            this.populatePresetSelect();
            this.autoFetchTenantUsers();
            this.renderModelUsersList();
            this.renderNodes();
            this.recalculateAndRenderWires();
            this.updateAuditReport();
            this.renderEffectivePermissionsCard();
            this.syncNodePositionsFromDatabase();

            // 首次激活且视图可见时，在下一帧确保包围盒居中
            if (!this.hasCenteredOnce) {
                this.hasCenteredOnce = true;
                requestAnimationFrame(() => {
                    this.locateAndFitAllNodes(false);
                });
            }

            // 恢复或默认激活主视图 Tab（支持记忆上次所选视图，如全景资产链路）
            let initialTab = this.activeMainTab || 'blueprint';
            try {
                const savedTab = localStorage.getItem('pb-active-main-tab');
                if (savedTab && ['blueprint', 'matrix', 'user_assets'].includes(savedTab)) {
                    initialTab = savedTab;
                }
            } catch(e) {}
            this.switchMainTab(initialTab);
        }

        switchMainTab(tab) {
            this.activeMainTab = tab || 'blueprint';
            try {
                localStorage.setItem('pb-active-main-tab', this.activeMainTab);
            } catch(e) {}
            const canvasEl = document.getElementById('pb-canvas-viewport');
            const matrixEl = document.getElementById('pb-matrix-container');
            const userAssetsEl = document.getElementById('pb-user-assets-container');
            const bpTabBtn = document.getElementById('pb-tab-blueprint-btn');
            const mxTabBtn = document.getElementById('pb-tab-matrix-btn');
            const userAssetsTabBtn = document.getElementById('pb-tab-user-assets-btn');
            const bpToolbar = document.getElementById('pb-blueprint-toolbar');
            const mxToolbar = document.getElementById('pb-matrix-toolbar');
            const userAssetsToolbar = document.getElementById('pb-user-assets-toolbar');

            if (this.activeMainTab === 'user_assets') {
                if (canvasEl) canvasEl.style.display = 'none';
                if (matrixEl) matrixEl.style.display = 'none';
                if (userAssetsEl) userAssetsEl.style.display = 'flex';
                if (bpTabBtn) bpTabBtn.classList.remove('active');
                if (mxTabBtn) mxTabBtn.classList.remove('active');
                if (userAssetsTabBtn) userAssetsTabBtn.classList.add('active');
                if (bpToolbar) bpToolbar.style.display = 'none';
                if (mxToolbar) mxToolbar.style.display = 'none';
                if (userAssetsToolbar) userAssetsToolbar.style.display = 'flex';
                this.renderUserAssetsMatrix();
            } else if (this.activeMainTab === 'matrix') {
                if (canvasEl) canvasEl.style.display = 'none';
                if (matrixEl) matrixEl.style.display = 'grid';
                if (userAssetsEl) userAssetsEl.style.display = 'none';
                if (bpTabBtn) bpTabBtn.classList.remove('active');
                if (mxTabBtn) mxTabBtn.classList.add('active');
                if (userAssetsTabBtn) userAssetsTabBtn.classList.remove('active');
                if (bpToolbar) bpToolbar.style.display = 'none';
                if (mxToolbar) mxToolbar.style.display = 'flex';
                if (userAssetsToolbar) userAssetsToolbar.style.display = 'none';
                this.renderMatrix();
            } else {
                if (canvasEl) canvasEl.style.display = 'block';
                if (matrixEl) matrixEl.style.display = 'none';
                if (userAssetsEl) userAssetsEl.style.display = 'none';
                if (bpTabBtn) bpTabBtn.classList.add('active');
                if (mxTabBtn) mxTabBtn.classList.remove('active');
                if (userAssetsTabBtn) userAssetsTabBtn.classList.remove('active');
                if (bpToolbar) bpToolbar.style.display = 'flex';
                if (mxToolbar) mxToolbar.style.display = 'none';
                if (userAssetsToolbar) userAssetsToolbar.style.display = 'none';
                this.renderNodes();
                this.recalculateAndRenderWires();
                requestAnimationFrame(() => {
                    this.locateAndFitAllNodes(false);
                });
            }
        }

        initDOM() {
            this.viewportEl = document.getElementById('pb-canvas-viewport');
            this.contentEl = document.getElementById('pb-canvas-content');
            this.svgEl = document.getElementById('pb-svg-wires');
            this.wiresGroupEl = document.getElementById('pb-wires-group');
            this.nodesLayerEl = document.getElementById('pb-nodes-layer');

            if (!this.viewportEl || !this.contentEl) return;

            // 绑定视口鼠标拖拽平移
            this.viewportEl.addEventListener('mousedown', (e) => {
                if (e.target.closest('.pb-blueprint-node') || e.target.closest('button') || e.target.closest('select') || e.target.closest('input') || e.target.closest('#pb-radar-notice')) {
                    return;
                }
                this.isPanning = true;
                this.startX = e.clientX - this.panX;
                this.startY = e.clientY - this.panY;
                this.viewportEl.style.cursor = 'grabbing';
            });

            // 120 FPS 高性能鼠标移动调度
            window.addEventListener('mousemove', (e) => {
                if (this.isPanning) {
                    this.pendingPan = { x: e.clientX - this.startX, y: e.clientY - this.startY };
                    this.scheduleRAF();
                } else if (this.draggedNodeId) {
                    if (!this.cachedContentRect) {
                        this.cachedContentRect = this.contentEl.getBoundingClientRect();
                    }
                    const newX = (e.clientX - this.cachedContentRect.left) / this.zoom - this.dragOffset.x;
                    const newY = (e.clientY - this.cachedContentRect.top) / this.zoom - this.dragOffset.y;
                    this.pendingDrag = { nodeId: this.draggedNodeId, x: Math.round(newX), y: Math.round(newY) };
                    this.scheduleRAF();
                }
            });

            window.addEventListener('mouseup', () => {
                if (this.isPanning) {
                    this.isPanning = false;
                    if (this.viewportEl) this.viewportEl.style.cursor = 'grab';
                    this.checkRadarVisibility();
                }
                if (this.draggedNodeId) {
                    this.draggedNodeId = null;
                    this.cachedContentRect = null;
                    this.checkRadarVisibility();
                    this.saveNodePositionsToStorage();
                }
            });

            // 工业级平滑缩放：以鼠标当前指针为原点进行几何锚定缩放
            this.viewportEl.addEventListener('wheel', (e) => {
                e.preventDefault();
                const delta = e.deltaY > 0 ? -0.06 : 0.06;
                this.zoomAtPoint(delta, e.clientX, e.clientY);
            }, { passive: false });

            // 抽屉拖拽初始化
            this.initDrawerDraggable();
            this.renderModelUsersList();

            // 绑定全局点击自动关闭侧边栏自定义下拉框
            document.addEventListener('click', (e) => {
                if (!e.target.closest('.pb-dropdown-box')) {
                    this.closeAllDropdowns();
                }
            });

            // 监听全局主题切换
            const themeObserver = new MutationObserver(() => {
                this.recalculateAndRenderWires();
            });
            themeObserver.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme', 'class'] });

            // ── 实时视口尺寸感知 (窗口缩放、分栏拖拽、全屏侧边栏折叠逐帧自适应) ─────
            let _rafFitPending = false;
            const _scheduleRefit = () => {
                const vp = document.getElementById('pb-canvas-viewport');
                if (!vp || vp.style.display === 'none' || (window.getComputedStyle && window.getComputedStyle(vp).display === 'none')) return;
                if (_rafFitPending) return;
                _rafFitPending = true;
                requestAnimationFrame(() => {
                    _rafFitPending = false;
                    this.syncCenterToViewport();
                });
            };

            if (typeof ResizeObserver !== 'undefined' && this.viewportEl) {
                const _vpObserver = new ResizeObserver(_scheduleRefit);
                _vpObserver.observe(this.viewportEl);
            }

            window.addEventListener('resize', _scheduleRefit, { passive: true });
        }

        // rAF 高性能硬件加速渲染管线
        scheduleRAF() {
            if (this.rafPending) return;
            this.rafPending = true;
            requestAnimationFrame(() => {
                this.rafPending = false;
                if (this.pendingPan) {
                    this.panX = this.pendingPan.x;
                    this.panY = this.pendingPan.y;
                    this.updateCanvasTransform();
                    this.pendingPan = null;
                }
                if (this.pendingDrag) {
                    const { nodeId, x, y } = this.pendingDrag;
                    this.nodePositions[nodeId] = { x, y };
                    const nodeEl = document.getElementById(nodeId);
                    if (nodeEl) {
                        nodeEl.style.left = `${x}px`;
                        nodeEl.style.top = `${y}px`;
                    }
                    // 增量高频更新直接关联连线 (0 DOM Reflow)
                    this.updateConnectedWirePaths(nodeId);
                    this.pendingDrag = null;
                }
            });
        }

        initDrawerDraggable() {
            const drawer = document.getElementById('pb-audit-drawer');
            const header = document.getElementById('pb-audit-drawer-header');
            if (!drawer || !header) return;

            let isDragging = false;
            let startX = 0, startY = 0, startLeft = 0, startTop = 0;

            header.addEventListener('mousedown', (e) => {
                if (e.target.closest('button')) return;
                isDragging = true;
                startX = e.clientX;
                startY = e.clientY;
                const rect = drawer.getBoundingClientRect();
                startLeft = rect.left;
                startTop = rect.top;
                header.style.cursor = 'grabbing';
            });

            window.addEventListener('mousemove', (e) => {
                if (!isDragging) return;
                const dx = e.clientX - startX;
                const dy = e.clientY - startY;
                drawer.style.left = `${startLeft + dx}px`;
                drawer.style.top = `${startTop + dy}px`;
                drawer.style.right = 'auto';
                drawer.style.bottom = 'auto';
            });

            window.addEventListener('mouseup', () => {
                if (isDragging) {
                    isDragging = false;
                    header.style.cursor = 'move';
                }
            });
        }

        updateCanvasTransform() {
            if (!this.contentEl) return;
            this.contentEl.style.transform = `translate(${this.panX}px, ${this.panY}px) scale(${this.zoom})`;
            const label = document.getElementById('pb-zoom-label');
            if (label) label.textContent = `${Math.round(this.zoom * 100)}%`;
        }

        // 鼠标为中心的自然缩放
        zoomAtPoint(delta, clientX, clientY) {
            const nextZoom = Math.min(1.8, Math.max(0.35, this.zoom + delta));
            const newZoom = parseFloat(nextZoom.toFixed(2));
            if (newZoom === this.zoom) return;

            const vpRect = this.viewportEl.getBoundingClientRect();
            const mouseX = clientX - vpRect.left;
            const mouseY = clientY - vpRect.top;

            // 计算缩放前鼠标指向的世界坐标
            const worldX = (mouseX - this.panX) / this.zoom;
            const worldY = (mouseY - this.panY) / this.zoom;

            // 保持鼠标下的世界点不动，计算新的 panX 和 panY
            this.panX = Math.round(mouseX - worldX * newZoom);
            this.panY = Math.round(mouseY - worldY * newZoom);
            this.zoom = newZoom;

            this.updateCanvasTransform();
            this.checkRadarVisibility();
        }

        zoomCanvas(delta) {
            if (!this.viewportEl) return;
            const vpRect = this.viewportEl.getBoundingClientRect();
            this.zoomAtPoint(delta, vpRect.left + vpRect.width / 2, vpRect.top + vpRect.height / 2);
        }

        fitCanvas() {
            this.locateAndFitAllNodes(true);
        }

        // 🎯 毫秒级原生无感居中同步：保持当前 zoom 绝对固定，让卡片质心严格锁定视口物理中心
        syncCenterToViewport() {
            const vp = document.getElementById('pb-canvas-viewport');
            if (!vp || vp.style.display === 'none' || (window.getComputedStyle && window.getComputedStyle(vp).display === 'none')) return;
            if (!this.contentEl) return;

            let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
            for (const id in this.nodePositions) {
                const pos = this.nodePositions[id];
                if (pos.x < minX) minX = pos.x;
                if (pos.y < minY) minY = pos.y;
                if (pos.x > maxX) maxX = pos.x;
                if (pos.y > maxY) maxY = pos.y;
            }
            if (minX === Infinity) return;

            // 8 大节点整体真实几何质心 (Card Width: 320, Height: 260)
            const boxCenterX = (minX + maxX + 320) / 2;
            const boxCenterY = (minY + maxY + 260) / 2;

            const vpW = vp.clientWidth;
            const vpH = vp.clientHeight;
            if (vpW < 100 || vpH < 100) return;

            // 严格保持用户当前 zoom 不变！彻底消除由小数缩放反复量化导致的心跳抖动与左右来回拉扯
            this.panX = Math.round(vpW / 2 - boxCenterX * this.zoom);
            this.panY = Math.round(vpH / 2 - boxCenterY * this.zoom);

            // 必须使用原生 0 延迟 (style.transition = '')，确保与侧边栏过渡每一帧 100% 绝对锁步
            this.contentEl.style.transition = '';
            this.updateCanvasTransform();
            this.checkRadarVisibility();
        }

        onZenModeChange() {
            this.syncCenterToViewport();
        }

        // 🎯 核心防丢保障：一键计算所有节点的最小包围盒并自动居中聚焦召回
        locateAndFitAllNodes(showToast = true, animate = true) {
            if (!this.isInitialized) {
                this.initDOM();
                this.isInitialized = true;
            }
            if (!this.nodesLayerEl || !this.nodesLayerEl.children.length) {
                this.renderNodes();
                this.recalculateAndRenderWires();
            }

            let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
            for (const id in this.nodePositions) {
                const pos = this.nodePositions[id];
                if (pos.x < minX) minX = pos.x;
                if (pos.y < minY) minY = pos.y;
                if (pos.x > maxX) maxX = pos.x;
                if (pos.y > maxY) maxY = pos.y;
            }

            if (minX === Infinity) {
                this.nodePositions = this.loadNodePositionsFromStorage();
                this.renderNodes();
                this.locateAndFitAllNodes(showToast, animate);
                return;
            }

            // 节点尺寸 320x300，加入周围 80px 的呼吸感 padding
            const pad = 80;
            const boxW = (maxX + 320) - minX + pad * 2;
            const boxH = (maxY + 320) - minY + pad * 2;

            let vpW = this.viewportEl ? this.viewportEl.clientWidth : 0;
            let vpH = this.viewportEl ? this.viewportEl.clientHeight : 0;
            if (!vpW || vpW < 200) {
                vpW = Math.max(800, window.innerWidth - 300);
            }
            if (!vpH || vpH < 200) {
                vpH = Math.max(600, window.innerHeight - 100);
            }

            const fitZoom = Math.min(1.05, Math.max(0.42, Math.min(vpW / boxW, vpH / boxH)));
            this.zoom = parseFloat(fitZoom.toFixed(2));

            this.panX = Math.round((vpW - boxW * this.zoom) / 2 - (minX - pad) * this.zoom);
            this.panY = Math.round((vpH - boxH * this.zoom) / 2 - (minY - pad) * this.zoom);

            if (this.contentEl) {
                if (animate) {
                    if (this._transitionTimeout) clearTimeout(this._transitionTimeout);
                    this.contentEl.style.transition = 'transform 0.32s cubic-bezier(0.16, 1, 0.3, 1)';
                    this.updateCanvasTransform();
                    this._transitionTimeout = setTimeout(() => {
                        if (this.contentEl) this.contentEl.style.transition = '';
                    }, 340);
                } else {
                    if (this._transitionTimeout) clearTimeout(this._transitionTimeout);
                    this.contentEl.style.transition = '';
                    this.updateCanvasTransform();
                }
            } else {
                this.updateCanvasTransform();
            }

            this.checkRadarVisibility();

            if (showToast && typeof window.showNotification === 'function') {
                window.showNotification('🎯 已成功聚焦并召回所有蓝图卡片至视口中央！', 'success');
            }
        }

        // 雷达检测：当所有节点均完全漂出可见视口时，中央自动升起提示气泡
        checkRadarVisibility() {
            const noticeEl = document.getElementById('pb-radar-notice');
            if (!noticeEl || !this.viewportEl) return;

            const vpW = this.viewportEl.clientWidth;
            const vpH = this.viewportEl.clientHeight;

            let anyVisible = false;
            for (const id in this.nodePositions) {
                const pos = this.nodePositions[id];
                const screenX = pos.x * this.zoom + this.panX;
                const screenY = pos.y * this.zoom + this.panY;
                const screenW = 320 * this.zoom;
                const screenH = 260 * this.zoom;

                if (screenX + screenW > 0 && screenX < vpW && screenY + screenH > 0 && screenY < vpH) {
                    anyVisible = true;
                    break;
                }
            }

            noticeEl.style.display = anyVisible ? 'none' : 'flex';
        }

        // ── 节点排版坐标持久化 (localStorage + SQLite 数据库双写联动) ──────────────────
        loadNodePositionsFromStorage() {
            try {
                const saved = localStorage.getItem('pbi-blueprint-node-positions');
                if (saved) {
                    const parsed = JSON.parse(saved);
                    if (parsed && typeof parsed === 'object' && Object.keys(parsed).length > 0) {
                        return Object.assign(JSON.parse(JSON.stringify(DEFAULT_NODE_COORDS)), parsed);
                    }
                }
            } catch (e) {
                console.warn('Failed to load node positions from localStorage:', e);
            }
            return JSON.parse(JSON.stringify(DEFAULT_NODE_COORDS));
        }

        async syncNodePositionsFromDatabase() {
            const syncSeq = ++this.syncSeq;
            try {
                const resp = await fetch('/api/db/kv/pbi-blueprint-node-positions');
                if (!resp.ok || syncSeq !== this.syncSeq) return;
                const json = await resp.json();
                if (syncSeq !== this.syncSeq) return;
                if (json.success && json.data) {
                    const parsed = typeof json.data === 'string' ? JSON.parse(json.data) : json.data;
                    if (parsed && typeof parsed === 'object' && Object.keys(parsed).length > 0) {
                        const merged = Object.assign(JSON.parse(JSON.stringify(DEFAULT_NODE_COORDS)), parsed);
                        const currentStr = JSON.stringify(this.nodePositions);
                        const newStr = JSON.stringify(merged);
                        if (currentStr !== newStr && syncSeq === this.syncSeq) {
                            this.nodePositions = merged;
                            localStorage.setItem('pbi-blueprint-node-positions', newStr);
                            this.renderNodes();
                            this.recalculateAndRenderWires();
                        }
                    }
                }
            } catch (e) {
                console.warn('Failed to sync node positions from DB:', e);
            }
        }

        saveNodePositionsToStorage() {
            try {
                if (this.nodePositions) {
                    const jsonStr = JSON.stringify(this.nodePositions);
                    localStorage.setItem('pbi-blueprint-node-positions', jsonStr);
                    // 异步双写写入后端 SQLite 数据库 (kv_store 表)
                    fetch('/api/db/kv/pbi-blueprint-node-positions', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ value: jsonStr })
                    }).catch(err => console.warn('Failed to sync node positions to DB:', err));
                }
            } catch (e) {
                console.warn('Failed to save node positions to localStorage:', e);
            }
        }

        async resetNodePositions() {
            this.syncSeq = (this.syncSeq || 0) + 1;
            if (!this.isInitialized) {
                this.initDOM();
                this.isInitialized = true;
            }
            try {
                localStorage.removeItem('pbi-blueprint-node-positions');
            } catch (e) {}
            // 同步清空后端 SQLite 数据库对应记录
            try {
                await fetch('/api/db/kv/pbi-blueprint-node-positions', {
                    method: 'DELETE'
                });
            } catch (e) {
                console.warn('Failed to delete node positions from DB:', e);
            }
            this.nodePositions = JSON.parse(JSON.stringify(DEFAULT_NODE_COORDS));
            this.renderNodes();
            this.recalculateAndRenderWires();
            this.locateAndFitAllNodes(false);
            try {
                localStorage.removeItem('pbi-blueprint-node-positions');
            } catch (e) {}
            if (typeof window.showNotification === 'function') {
                window.showNotification('已重置蓝图排版并自动平移居中！', 'info');
            }
        }

        // HTML 按钮调用的公开别名（与 resetNodePositions 完全等价）
        async resetLayout() {
            await this.resetNodePositions();
        }

        togglePulse() {
            this.pulseActive = !this.pulseActive;
            const dot = document.getElementById('pb-pulse-dot');
            if (dot) {
                dot.style.background = this.pulseActive ? '#34d399' : '#64748b';
                dot.style.boxShadow = this.pulseActive ? '0 0 6px #34d399' : 'none';
            }
            if (this.wiresGroupEl) {
                this.wiresGroupEl.classList.toggle('pb-wires-static', !this.pulseActive);
            }
        }

        toggleAuditDrawer(forceState) {
            const drawer = document.getElementById('pb-audit-drawer');
            if (!drawer) return;
            if (typeof forceState === 'boolean') {
                this.isAuditOpen = forceState;
            } else {
                this.isAuditOpen = !this.isAuditOpen;
            }
            drawer.style.display = this.isAuditOpen ? 'flex' : 'none';
        }

        switchPerspective(mode) {
            this.perspective = mode;
            const tabUser = document.getElementById('pb-tab-user');
            const tabModel = document.getElementById('pb-tab-model');
            const userPrincipalCard = document.getElementById('pb-user-principal-card');
            const modelSelectCard = document.getElementById('pb-model-select-card');
            const modelUsersCard = document.getElementById('pb-model-users-card');
            const scenariosCard = document.getElementById('pb-scenarios-card');

            // 核心面板一体化合并：用户与模型同时保持可见，支持随时跨模型推演
            if (userPrincipalCard) userPrincipalCard.style.display = 'block';
            if (scenariosCard) scenariosCard.style.display = 'block';
            if (modelSelectCard) modelSelectCard.style.display = 'block';
            if (modelUsersCard) modelUsersCard.style.display = 'block';

            if (mode === 'user') {
                if (tabUser) tabUser.classList.add('active');
                if (tabModel) tabModel.classList.remove('active');

                // 沙盒画布反馈：微聚焦 L1 用户主体节点
                const userNode = document.getElementById('node_tenant');
                if (userNode) {
                    userNode.classList.add('pb-node-focus-pulse');
                    setTimeout(() => userNode.classList.remove('pb-node-focus-pulse'), 800);
                }

                if (typeof window.showNotification === 'function') {
                    window.showNotification('🔗 联合推演模式：已开启用户主体与目标模型的实时权限关联推演', 'info');
                }
            } else {
                if (tabModel) tabModel.classList.add('active');
                if (tabUser) tabUser.classList.remove('active');

                // 聚焦模型：微聚焦 L3 工作区与模型节点，并刷新模型用户分布
                const wsNode = document.getElementById('node_workspace');
                if (wsNode) {
                    wsNode.classList.add('pb-node-focus-pulse');
                    setTimeout(() => wsNode.classList.remove('pb-node-focus-pulse'), 800);
                }
                this.renderModelUsersList();

                if (typeof window.showNotification === 'function') {
                    window.showNotification('📊 聚焦目标模型：可直接在下方列表中下钻切换模拟主体', 'info');
                }
            }
        }

        // 取消/清空当前模拟用户主体，恢复中立 6 层通用基准拓扑
        clearSimulatedUser() {
            this.activePresetKey = null;
            const selectEl = document.getElementById('pb-user-preset-select');
            if (selectEl) selectEl.value = 'none';
            const customBox = document.getElementById('pb-custom-user-box');
            if (customBox) customBox.style.display = 'none';

            const userDisplayText = document.getElementById('pb-user-display-text');
            if (userDisplayText) {
                userDisplayText.textContent = '-- 选择模拟用户主体 (当前: 通用基准) --';
                userDisplayText.title = '通用中立基准拓扑';
            }

            const userListContainer = document.getElementById('pb-user-list');
            if (userListContainer) {
                userListContainer.querySelectorAll('.gtb-ws-item').forEach(it => it.classList.remove('selected'));
            }

            this.closeAllDropdowns();

            const upnLabel = document.getElementById('pb-current-upn-label');
            const badgeTag = document.getElementById('pb-badge-role-tag');
            if (upnLabel) {
                upnLabel.innerHTML = '<span style="color: var(--text-secondary); font-weight: normal;">（未选定模拟主体 · 展现通用 6 层基准流向）</span>';
            }
            if (badgeTag) {
                badgeTag.textContent = '通用基准';
                badgeTag.style.color = '#94a3b8';
                badgeTag.style.borderColor = '#94a3b840';
            }

            // 状态重置为无特权穿透的中立基准状态
            this.currentState = {
                isGuestUser: false,
                tenantAllowExport: true,
                tenantAllowWebModeling: false,
                capacityType: 'fabric_f64',
                workspaceRole: 'Viewer',
                isModelOwner: false,
                isInStrictMode: false,
                hasAccessToAllDataConnections: true,
                gatewayOnline: true,
                sharePermission: 'Read',
                hasAppAccess: false,
                rlsEnabled: true,
                rlsRoleAssigned: 'Region_East',
                olsEnabled: false,
                maskedFields: 'Salary, Margin'
            };

            this.renderNodes();
            this.recalculateAndRenderWires();
            this.updateAuditReport();
            this.renderEffectivePermissionsCard();
            this.renderModelUsersList();
            if (this.activeMainTab === 'matrix') {
                this.renderMatrix();
            }

            if (typeof window.showNotification === 'function') {
                window.showNotification('✕ 已清空模拟用户主体，当前蓝图已恢复中立通用基准拓扑', 'info');
            }
        }

        // 侧边栏自定义下拉框展开/收起控制器 (对齐顶栏 GTB 下拉框标准)
        toggleDropdown(type, event) {
            if (event) event.stopPropagation();
            const types = ['user', 'ws', 'model'];
            const targetDropdown = document.getElementById(`pb-${type}-dropdown`);
            const targetTrigger = document.getElementById(`pb-${type}-trigger`);
            const targetBox = document.getElementById(`pb-${type}-dropdown-box`);
            const targetCard = targetBox ? targetBox.closest('.pb-control-card') : null;
            if (!targetDropdown) return;
            const isVisible = targetDropdown.style.display === 'flex';

            this.closeAllDropdowns();

            if (!isVisible) {
                targetDropdown.style.display = 'flex';
                if (targetTrigger) targetTrigger.classList.add('active');
                if (targetBox) targetBox.classList.add('open');
                if (targetCard) targetCard.classList.add('dropdown-active');
                const searchInput = document.getElementById(`pb-${type}-search-input`);
                if (searchInput) {
                    searchInput.value = '';
                    setTimeout(() => searchInput.focus(), 50);
                }
                if (type === 'user') {
                    this.filterUsers('');
                    const hasReal = Object.values(USER_PRESETS).some(u => u.id.startsWith('real_'));
                    if (!hasReal) {
                        this.autoFetchTenantUsers();
                    }
                }
                if (type === 'ws') this.filterWorkspaces('');
                if (type === 'model') this.filterModels('');
            }
        }

        closeAllDropdowns() {
            ['user', 'ws', 'model'].forEach(t => {
                const d = document.getElementById(`pb-${t}-dropdown`);
                const tr = document.getElementById(`pb-${t}-trigger`);
                const b = document.getElementById(`pb-${t}-dropdown-box`);
                const c = b ? b.closest('.pb-control-card') : null;
                if (d) d.style.display = 'none';
                if (tr) tr.classList.remove('active');
                if (b) b.classList.remove('open');
                if (c) c.classList.remove('dropdown-active');
            });
        }

        populateWorkspaceSelect() {
            const wsSelect = document.getElementById('pb-ws-select');
            const wsListContainer = document.getElementById('pb-ws-list');
            const wsDisplayText = document.getElementById('pb-ws-display-text');
            const wsStatText = document.getElementById('pb-ws-stat-text');

            if (!wsSelect && !wsListContainer) return;

            let wsList = [];
            if (typeof window.getMergedGtbWorkspaces === 'function') {
                try {
                    wsList = window.getMergedGtbWorkspaces();
                } catch (e) { wsList = []; }
            }
            if (!wsList || wsList.length === 0) {
                try {
                    wsList = JSON.parse(localStorage.getItem('pbi_workspaces') || '[]');
                } catch (e) { wsList = []; }
            }

            // 获取全局功能区选中的工作区 ID 集合 (Set)
            const selectedGtbIds = new Set();
            if (window.selectedGtbWorkspaceIds && window.selectedGtbWorkspaceIds.size > 0) {
                window.selectedGtbWorkspaceIds.forEach(id => {
                    if (id) selectedGtbIds.add(String(id).toLowerCase().trim());
                });
            } else {
                try {
                    const saved = JSON.parse(localStorage.getItem('pbi-selected-workspaces') || '[]');
                    if (Array.isArray(saved)) {
                        saved.forEach(id => {
                            if (id) selectedGtbIds.add(String(id).toLowerCase().trim());
                        });
                    }
                } catch (e) {}
            }

            // 深度补全：如果全局功能区选定的工作区不在 wsList 中，从候选列表补全
            if (selectedGtbIds.size > 0) {
                const existingIds = new Set(wsList.map(w => String(w.id || '').toLowerCase()));
                const candidateLists = [window.allWorkspaces, window.gumWorkspaces];
                for (const cl of candidateLists) {
                    if (Array.isArray(cl)) {
                        for (const w of cl) {
                            if (w && w.id && selectedGtbIds.has(String(w.id).toLowerCase()) && !existingIds.has(String(w.id).toLowerCase())) {
                                existingIds.add(String(w.id).toLowerCase());
                                wsList.push({ id: w.id, name: w.name || w.alias || w.displayName || w.id });
                            }
                        }
                    }
                }
            }

            // 🚨 严禁在未选择时自动添加旧工作区兜底，严格遵从顶栏选择结果
            const seen = new Set();
            const realGroup = [];
            const gtbSelectedGroup = [];
            const otherRealGroup = [];

            for (const w of wsList) {
                if (!w || !w.id) continue;
                const wName = (w.name || w.alias || w.displayName || w.id).trim();
                const idLower = String(w.id).toLowerCase();

                // 严格过滤：排除所有个人私有域 (PersonalGroup / PersonalWorkspace / my / My Workspace / 我的工作区)
                const isPersonal = (w.type === 'PersonalGroup') || 
                                   (/^PersonalWorkspace/i.test(wName)) || 
                                   (/^Personal Workspace/i.test(wName)) ||
                                   (/^(my|my workspace|我的工作区)$/i.test(wName)) ||
                                   (String(w.alias || '').trim().toLowerCase() === 'my');
                if (isPersonal) continue;

                // 排除其他域残留：严格隔离开发测试域 (WorkSpace_DEV 等)
                const isDevWorkspace = (idLower === '2c51e061-0f9f-4d02-bed0-c169019e5d83') || (/^workspace_dev$/i.test(wName));
                const isCurrentActiveDev = activeGlobalWsId && (activeGlobalWsId.toLowerCase() === '2c51e061-0f9f-4d02-bed0-c169019e5d83' || activeGlobalWsId.toLowerCase() === 'workspace_dev');
                
                // 只要当前活跃/预选的不是该开发测试空间，绝不允许其跨域混入
                if (isDevWorkspace && !isCurrentActiveDev) {
                    continue;
                }

                if (!seen.has(idLower)) {
                    seen.add(idLower);
                    const item = { id: w.id, name: wName, isReal: true, type: w.type };
                    realGroup.push(item);
                    if (selectedGtbIds.has(idLower)) {
                        gtbSelectedGroup.push(item);
                    } else {
                        otherRealGroup.push(item);
                    }
                }
            }

            let html = '';
            let listHtml = '';

            const appendGroupHtml = (title, items, isGtb) => {
                if (!items || items.length === 0) return;
                html += `<optgroup label="${title}">`;
                listHtml += `<div class="gtb-ws-group-title">${title}</div>`;
                for (const w of items) {
                    const isSelected = (this.currentWorkspaceId && String(this.currentWorkspaceId).toLowerCase() === String(w.id).toLowerCase());
                    const searchText = `${w.name} ${w.id}`.toLowerCase();
                    html += `<option value="${w.id}">${isGtb ? '🌟 ' : ''}${w.name}</option>`;
                    listHtml += `
                        <div class="gtb-ws-item ${isSelected ? 'selected' : ''}" data-search-text="${searchText}" onclick="window.PermissionBlueprint.selectWorkspace('${w.id}')">
                            <div class="gtb-ws-item-left">
                                <div class="gtb-ws-item-names">
                                    <div class="gtb-ws-item-title" title="${w.name}">${isGtb ? '🌟 ' : '🏢 '}${w.name}</div>
                                    <div class="gtb-ws-item-sub" title="${w.id}">${w.id}</div>
                                </div>
                            </div>
                        </div>
                    `;
                }
                html += '</optgroup>';
            };

            // 严格对齐当前工作范围：若顶栏已选定工作区，仅呈现当前作用域内的工作区，绝不展示未选中的其他工作区 (如测试开发域)
            if (gtbSelectedGroup.length > 0) {
                appendGroupHtml(`🌟 当前范围选定工作区 (${gtbSelectedGroup.length} 个)`, gtbSelectedGroup, true);
            } else if (realGroup.length > 0) {
                appendGroupHtml(`🏢 租户组织工作区 (${realGroup.length} 个)`, realGroup, false);
            }

            if (wsSelect) wsSelect.innerHTML = html;
            if (wsListContainer) wsListContainer.innerHTML = listHtml || '<div style="font-size: 0.72rem; color: var(--text-secondary); text-align: center; padding: 16px 0;">暂无可用的工作区</div>';

            // 严格对齐实际选择，绝不擅自降级或默认选中首个工作区！未选择即保持未选空状态
            const availableGroup = gtbSelectedGroup.length > 0 ? gtbSelectedGroup : realGroup;
            const isCurrentValid = availableGroup.some(w => String(w.id).toLowerCase() === String(this.currentWorkspaceId || '').toLowerCase());

            if (gtbSelectedGroup.length > 0) {
                this.currentWorkspaceId = gtbSelectedGroup[0].id;
                this.currentWorkspaceName = gtbSelectedGroup[0].name;
            } else if (activeGlobalWsId && activeGlobalWsId !== 'all' && activeGlobalWsId !== 'none' && activeGlobalWsId !== '') {
                const found = realGroup.find(w => String(w.id).toLowerCase() === String(activeGlobalWsId).toLowerCase());
                if (found) {
                    this.currentWorkspaceId = found.id;
                    this.currentWorkspaceName = found.name;
                } else if (!isCurrentValid) {
                    this.currentWorkspaceId = '';
                    this.currentWorkspaceName = '';
                }
            } else if (!isCurrentValid) {
                this.currentWorkspaceId = '';
                this.currentWorkspaceName = '';
            }

            if (wsSelect) {
                wsSelect.value = this.currentWorkspaceId || '';
            }
            if (wsDisplayText) {
                wsDisplayText.textContent = this.currentWorkspaceName ? `🏢 ${this.currentWorkspaceName}` : '-- 选择目标工作区 --';
                wsDisplayText.title = this.currentWorkspaceName || '';
            }
            if (wsStatText) {
                const totalCount = gtbSelectedGroup.length > 0 ? gtbSelectedGroup.length : realGroup.length;
                wsStatText.textContent = `共 ${totalCount} 个组织工作区`;
            }
        }

        selectWorkspace(wsId) {
            this.currentWorkspaceId = wsId || '';
            const wsSelect = document.getElementById('pb-ws-select');
            const wsDisplayText = document.getElementById('pb-ws-display-text');
            const wsListContainer = document.getElementById('pb-ws-list');

            if (!wsId) {
                this.currentWorkspaceName = '';
                if (wsSelect) wsSelect.value = '';
                if (wsDisplayText) {
                    wsDisplayText.textContent = '-- 选择目标工作区 --';
                    wsDisplayText.title = '';
                }
                if (wsListContainer) {
                    wsListContainer.querySelectorAll('.gtb-ws-item').forEach(it => it.classList.remove('selected'));
                }
            } else {
                if (wsSelect) {
                    wsSelect.value = wsId;
                    if (wsSelect.selectedIndex >= 0) {
                        this.currentWorkspaceName = wsSelect.options[wsSelect.selectedIndex].text.replace(/^[🌟🏢]\s*/, '');
                    }
                }
                if (wsDisplayText) {
                    wsDisplayText.textContent = `🏢 ${this.currentWorkspaceName || wsId}`;
                    wsDisplayText.title = this.currentWorkspaceName || wsId;
                }
                if (wsListContainer) {
                    const items = wsListContainer.querySelectorAll('.gtb-ws-item');
                    items.forEach(it => {
                        const matches = it.getAttribute('data-search-text')?.includes(String(wsId).toLowerCase());
                        if (matches) it.classList.add('selected');
                        else it.classList.remove('selected');
                    });
                }
            }

            this.closeAllDropdowns();

            const syncWsName = document.getElementById('pb-sync-ws-name');
            if (syncWsName) {
                syncWsName.innerHTML = this.currentWorkspaceName ? `<strong style="color: #34d399;">${this.currentWorkspaceName}</strong>` : '<span style="color: var(--text-secondary);">尚未选择</span>';
            }
            const modelWsName = document.getElementById('pb-model-ws-name');
            if (modelWsName) {
                modelWsName.textContent = this.currentWorkspaceName || '未指定工作区';
            }

            // 切换工作区后实时联动更新语义模型下拉框列表 (按当前工作区过滤)
            this.populateModelSelect();
            this.renderEffectivePermissionsCard();
            if (this.activeMainTab === 'matrix') {
                this.renderMatrix();
            } else if (this.activeMainTab === 'user_assets') {
                this.renderUserAssetsMatrix();
            }

            if (typeof window.showNotification === 'function') {
                if (this.currentWorkspaceName) {
                    window.showNotification(`🏢 已切换目标工作区为：${this.currentWorkspaceName}`, 'info');
                } else {
                    window.showNotification('🏢 已清空目标工作区', 'info');
                }
            }
        }

        filterUsers(term = '') {
            const q = (term || '').toLowerCase().trim();
            const listEl = document.getElementById('pb-user-list');
            if (listEl) {
                const items = listEl.querySelectorAll('.gtb-ws-item');
                items.forEach(it => {
                    const text = (it.getAttribute('data-search-text') || '').toLowerCase();
                    it.style.display = (!q || text.includes(q)) ? 'flex' : 'none';
                });
            }
            const selectEl = document.getElementById('pb-user-preset-select');
            if (selectEl) {
                const options = selectEl.querySelectorAll('option');
                options.forEach(opt => {
                    if (opt.value === 'none' || opt.value === 'custom') {
                        opt.hidden = false;
                        return;
                    }
                    const text = (opt.textContent || '').toLowerCase();
                    opt.hidden = Boolean(q && !text.includes(q));
                });
                const groups = selectEl.querySelectorAll('optgroup');
                groups.forEach(g => {
                    const visibleOpts = Array.from(g.querySelectorAll('option')).filter(o => !o.hidden);
                    g.hidden = visibleOpts.length === 0;
                });
            }
        }

        filterWorkspaces(term = '') {
            const q = (term || '').toLowerCase().trim();
            const listEl = document.getElementById('pb-ws-list');
            if (listEl) {
                const items = listEl.querySelectorAll('.gtb-ws-item');
                items.forEach(it => {
                    const text = (it.getAttribute('data-search-text') || '').toLowerCase();
                    it.style.display = (!q || text.includes(q)) ? 'flex' : 'none';
                });
            }
            const selectEl = document.getElementById('pb-ws-select');
            if (selectEl) {
                const options = selectEl.querySelectorAll('option');
                options.forEach(opt => {
                    const text = (opt.textContent || '').toLowerCase();
                    const val = (opt.value || '').toLowerCase();
                    opt.hidden = Boolean(q && !text.includes(q) && !val.includes(q));
                });
                const groups = selectEl.querySelectorAll('optgroup');
                groups.forEach(g => {
                    const visibleOpts = Array.from(g.querySelectorAll('option')).filter(o => !o.hidden);
                    g.hidden = visibleOpts.length === 0;
                });
            }
        }

        filterModels(term = '') {
            const q = (term || '').toLowerCase().trim();
            const listEl = document.getElementById('pb-model-list');
            if (listEl) {
                const items = listEl.querySelectorAll('.gtb-ws-item');
                items.forEach(it => {
                    const text = (it.getAttribute('data-search-text') || '').toLowerCase();
                    it.style.display = (!q || text.includes(q)) ? 'flex' : 'none';
                });
            }
            const selectEl = document.getElementById('pb-model-select');
            if (selectEl) {
                const options = selectEl.querySelectorAll('option');
                options.forEach(opt => {
                    if (!opt.value) {
                        opt.hidden = false;
                        return;
                    }
                    // 严格只匹配模型自身名称，杜绝所属工作区名称包含关键字导致所有模型被查出
                    const modelName = (opt.getAttribute('data-model-name') || opt.textContent.split('(')[0] || '').toLowerCase();
                    opt.hidden = Boolean(q && !modelName.includes(q));
                });
                const groups = selectEl.querySelectorAll('optgroup');
                groups.forEach(g => {
                    const visibleOpts = Array.from(g.querySelectorAll('option')).filter(o => !o.hidden);
                    g.hidden = visibleOpts.length === 0;
                });
            }
        }

        resetWorkspace() {
            const searchInput = document.getElementById('pb-ws-search-input');
            if (searchInput) searchInput.value = '';
            this.filterWorkspaces('');
            this.selectWorkspace('');
        }

        resetModel() {
            const selectEl = document.getElementById('pb-model-select');
            const searchInput = document.getElementById('pb-model-search-input');
            if (searchInput) searchInput.value = '';
            this.filterModels('');
            if (selectEl) {
                const firstValid = Array.from(selectEl.options).find(o => Boolean(o.value));
                if (firstValid) {
                    selectEl.value = firstValid.value;
                    this.selectModel(firstValid.value);
                } else {
                    selectEl.selectedIndex = 0;
                }
            }
            this.closeAllDropdowns();
        }

        togglePermTier(titleEl) {
            const tierEl = titleEl.closest('.pb-perm-tier');
            if (!tierEl) return;
            const tierKey = tierEl.getAttribute('data-tier');
            this.collapsedTiers = this.collapsedTiers || new Set();
            if (this.collapsedTiers.has(tierKey)) {
                this.collapsedTiers.delete(tierKey);
                tierEl.classList.remove('collapsed');
            } else {
                this.collapsedTiers.add(tierKey);
                tierEl.classList.add('collapsed');
            }
        }

        populateModelSelect() {
            const selectEl = document.getElementById('pb-model-select');
            const modelListContainer = document.getElementById('pb-model-list');
            const modelDisplayText = document.getElementById('pb-model-display-text');
            const modelStatText = document.getElementById('pb-model-stat-text');

            // 1. 自动从系统本地缓存 (pbi_datasets) 中动态注入所有真实语义模型并识别其真实运行模式
            try {
                const storedDs = JSON.parse(localStorage.getItem('pbi_datasets') || '[]');
                if (Array.isArray(storedDs)) {
                    for (const ds of storedDs) {
                        if (!ds || !ds.id) continue;
                        const dsName = ds.name || ds.displayName || ds.id;
                        // 严格过滤：剔除含有“已选”或“个模型”等统计字符串的脏项
                        if (dsName.includes('已选') || dsName.includes('个模型') || dsName.includes('个数据集')) continue;

                        const mKey = `real_model_${ds.id}`;
                        // 智能识别真实存储模式 (Storage Mode)
                        let storageMode = 'Direct Lake 湖仓';
                        if (ds.targetStorageMode && ds.targetStorageMode.toLowerCase().includes('import')) {
                            storageMode = 'Import 导入';
                        } else if (ds.isDirectQuery || (ds.targetStorageMode && ds.targetStorageMode.toLowerCase().includes('directquery'))) {
                            storageMode = 'DirectQuery 直连';
                        } else if (ds.isEffectiveIdentityRequired || ds.hasRLS) {
                            storageMode = 'Direct Lake (RLS)';
                        }

                        MODEL_DEFINITIONS[mKey] = {
                            id: mKey,
                            name: `🟢 [${storageMode}] ${dsName}`,
                            rawName: dsName,
                            workspaceId: ds.workspaceId || '',
                            workspaceName: ds.workspaceName || '',
                            capacity: ds.configuredBy ? 'Fabric F64 容量' : '组织共享容量',
                            storageMode: storageMode,
                            tables: ['Real_Facts', 'Dim_Customer', 'Security_RLS'],
                            hasRLS: Boolean(ds.isEffectiveIdentityRequired || ds.hasRLS),
                            hasOLS: false,
                            isReal: true
                        };
                    }
                }
            } catch (e) {
                // ignore
            }

            const allModels = Object.values(MODEL_DEFINITIONS);
            const validModels = allModels.filter(m => {
                if (!m || !m.name) return false;
                const n = m.name;
                return !n.includes('已选') && !n.includes('个模型') && !n.includes('个数据集');
            });

            // 严格按当前选定工作区联动过滤模型：杜绝跨工作区混杂其他无关域 (如 WorkSpace_DEV)
            const curWsId = this.currentWorkspaceId ? String(this.currentWorkspaceId).toLowerCase().trim() : '';
            const curWsName = this.currentWorkspaceName ? String(this.currentWorkspaceName).toLowerCase().trim() : '';

            // 属于当前工作区的模型集
            let scopedModels = validModels.filter(m => {
                if (!curWsId && !curWsName) return true;
                const mWsId = String(m.workspaceId || '').toLowerCase().trim();
                const mWsName = String(m.workspaceName || '').toLowerCase().trim();
                if (curWsId && mWsId && mWsId === curWsId) return true;
                if (curWsName && mWsName && (mWsName === curWsName || curWsName.includes(mWsName) || mWsName.includes(curWsName))) return true;
                return false;
            });

            // 优先展示当前工作区绑定的真实模型；若当前工作区无专属模型，绝不拿其他域的 demo 模型充数
            const realScoped = scopedModels.filter(m => m.id.startsWith('real_model_'));
            let displayList = [];
            if (realScoped.length > 0) {
                displayList = realScoped;
            } else if (scopedModels.length > 0) {
                displayList = scopedModels;
            } else if (!curWsId && !curWsName) {
                // 仅在完全没有选定任何目标工作区时，才作为沙盒演示展示基础语义模型
                displayList = validModels.filter(m => !m.id.startsWith('real_model_'));
            } else {
                displayList = [];
            }

            let html = '';
            let listHtml = '';

            if (displayList.length > 0) {
                const title = realScoped.length > 0 ? `🏢 当前工作区真实模型 (${realScoped.length} 个)` : `🗄️ 基础语义模型 (${displayList.length} 个)`;
                html += `<optgroup label="${title}">`;
                listHtml += `<div class="gtb-ws-group-title">${title}</div>`;

                for (const m of displayList) {
                    const isSelected = (this.currentModelKey && String(this.currentModelKey) === String(m.id));
                    // 仅搜索模型名 (包括 rawName 与显示名)，严格杜绝包含工作区名导致输入工作区名带出所有模型
                    const searchText = `${m.name} ${m.rawName || ''}`.toLowerCase();
                    html += `<option value="${m.id}" data-model-name="${(m.rawName || m.name).toLowerCase()}">${m.name} (${m.workspaceName || '生产工作区'})</option>`;
                    listHtml += `
                        <div class="gtb-ws-item ${isSelected ? 'selected' : ''}" data-model-key="${m.id}" data-search-text="${searchText}" onclick="window.PermissionBlueprint.selectModel('${m.id}')">
                            <div class="gtb-ws-item-left">
                                <div class="gtb-ws-item-names">
                                    <div class="gtb-ws-item-title" title="${m.name}">${m.name}</div>
                                    <div class="gtb-ws-item-sub" title="${m.workspaceName || ''}">所属工作区: ${m.workspaceName || '全局'}</div>
                                </div>
                            </div>
                        </div>
                    `;
                }
                html += '</optgroup>';
            } else {
                html += '<option value="">-- 当前工作区暂未缓存真实模型，请点击右上方同步 --</option>';
                listHtml += '<div style="font-size: 0.72rem; color: var(--text-secondary); text-align: center; padding: 16px 0;">暂无可用的语义模型</div>';
            }

            if (selectEl) selectEl.innerHTML = html;
            if (modelListContainer) modelListContainer.innerHTML = listHtml;

            // 严格对齐当前作用域可用模型：与顶栏 GTB 选中的模型保持 100% 同步
            const activeGtbDsId = localStorage.getItem('pbi-active-dataset') || (document.getElementById('gtb-select-dataset') ? document.getElementById('gtb-select-dataset').value : '');
            const targetRealKey = (activeGtbDsId && activeGtbDsId !== 'all') ? `real_model_${activeGtbDsId}` : '';

            const isCurrentInDisplay = displayList.some(m => String(m.id) === String(this.currentModelKey));
            if (targetRealKey && displayList.some(m => String(m.id) === String(targetRealKey))) {
                this.currentModelKey = targetRealKey;
            } else if (targetRealKey && displayList.length > 0) {
                this.currentModelKey = displayList[0].id;
            } else if (!targetRealKey) {
                this.currentModelKey = '';
            }

            if (selectEl && this.currentModelKey) {
                selectEl.value = this.currentModelKey;
            }

            const currentModel = MODEL_DEFINITIONS[this.currentModelKey];
            if (modelDisplayText) {
                modelDisplayText.textContent = currentModel ? `🗄️ ${currentModel.name}` : '-- 选择目标语义模型 --';
                modelDisplayText.title = currentModel ? currentModel.name : '';
            }
            if (modelStatText) {
                modelStatText.textContent = `共 ${displayList.length} 个可用语义模型`;
            }
        }

        // What-If 权限演练：切换指定层级开关
        toggleWhatIfSetting(field, explicitVal) {
            this.whatIfOverrides = this.whatIfOverrides || {};
            const s = this.currentState;
            let baseVal = s[field];
            if (baseVal === undefined) {
                const defaults = {
                    shareExternal: !s.isGuestUser,
                    xmlaEndpoint: true,
                    largeDataset: s.capacityType === 'fabric_f64',
                    autoScale: s.capacityType === 'fabric_f64',
                    queryRate: s.capacityType === 'fabric_f64' ? '120/min' : '60/min',
                    aiCopilot: s.capacityType === 'fabric_f64',
                    directLake: s.capacityType === 'fabric_f64',
                    manageMembers: s.workspaceRole === 'Admin',
                    editDelete: ['Admin', 'Member', 'Contributor'].includes(s.workspaceRole),
                    publishApp: ['Admin', 'Member'].includes(s.workspaceRole),
                    gatewayAdmin: s.workspaceRole === 'Admin',
                    canReadModel: ['Admin', 'Member', 'Contributor', 'Viewer'].includes(s.workspaceRole) || s.sharePermission !== 'None',
                    writePermission: ['Admin', 'Member', 'Contributor'].includes(s.workspaceRole),
                    resharePermission: ['Admin', 'Member'].includes(s.workspaceRole) || (s.sharePermission && String(s.sharePermission).includes('Reshare')),
                    dataSourceAuth: s.hasAccessToAllDataConnections,
                    crossFiltering: true,
                    unassignedDenied: s.rlsRoleAssigned === 'Unassigned',
                    gacMashupGate: !(s.isInStrictMode && !s.hasAccessToAllDataConnections),
                    maskedFieldsActive: Boolean(s.olsEnabled && !['Admin', 'Member', 'Contributor'].includes(s.workspaceRole)),
                    reportView: ['Admin', 'Member', 'Contributor', 'Viewer'].includes(s.workspaceRole) || s.sharePermission !== 'None' || s.hasAppAccess,
                    reportEdit: ['Admin', 'Member', 'Contributor'].includes(s.workspaceRole),
                    exportUnderlying: (['Admin', 'Member', 'Contributor'].includes(s.workspaceRole) || (s.sharePermission && String(s.sharePermission).includes('Build'))) && s.tenantAllowExport,
                    powerQueryEdit: ['Admin', 'Member', 'Contributor'].includes(s.workspaceRole) && s.hasAccessToAllDataConnections && s.gatewayOnline
                };
                baseVal = defaults[field] !== undefined ? defaults[field] : true;
            }
            const currentEffectiveVal = (this.whatIfOverrides[field] !== undefined) ? this.whatIfOverrides[field] : baseVal;

            let newVal;
            if (explicitVal !== undefined) {
                newVal = explicitVal;
            } else if (typeof currentEffectiveVal === 'boolean') {
                newVal = !currentEffectiveVal;
            } else {
                newVal = !Boolean(currentEffectiveVal);
            }

            // 若切回了原始基准值，彻底从 overrides 中清除，避免残留连线与波及影响
            if (newVal === baseVal) {
                delete this.whatIfOverrides[field];
            } else {
                this.whatIfOverrides[field] = newVal;
            }

            // 实时触发联动计算与界面全景重渲染
            this.renderMatrix();
            this.renderEffectivePermissionsCard();
            this.updateAuditReport();

            if (typeof window.showNotification === 'function') {
                const labelMap = {
                    tenantAllowExport: 'L1 导出策略',
                    tenantAllowWebModeling: 'L1 Web建模',
                    shareExternal: 'L1 组织外部共享',
                    isGuestUser: 'L1 访客/内部身份',
                    xmlaEndpoint: 'L1 XMLA读写终结点',
                    isInStrictMode: 'L1 GAC策略模式',
                    capacityType: 'L2 容量规格',
                    largeDataset: 'L2 大数据集格式',
                    autoScale: 'L2 弹性自动缩放',
                    queryRate: 'L2 DirectQuery速率',
                    aiCopilot: 'L2 Copilot/AI增强',
                    directLake: 'L2 Direct Lake极速湖仓',
                    workspaceRole: 'L3 工作区角色',
                    manageMembers: 'L3 成员管理特许',
                    editDelete: 'L3 资产增删改',
                    publishApp: 'L3 发布组织应用',
                    gatewayAdmin: 'L3 网关凭据托管',
                    hasAccessToAllDataConnections: 'L3/L4 连接通道鉴权',
                    canReadModel: 'L4 模型只读',
                    sharePermission: 'L4 构建/衍生权限',
                    writePermission: 'L4 模型架构写回',
                    resharePermission: 'L4 第三方重新共享',
                    dataSourceAuth: 'L4 数据源直连鉴权',
                    gatewayOnline: 'L4 网关在线状态',
                    rlsEnabled: 'L5 RLS规则总开关',
                    rlsRoleAssigned: 'L5 生效过滤角色',
                    daxIdentityType: 'L5 DAX主体身份',
                    crossFiltering: 'L5 跨表双向过滤',
                    unassignedDenied: 'L5 未授权行隔离',
                    gacMashupGate: 'L5 Mashup数据门禁',
                    olsEnabled: 'L6 OLS敏感列安全',
                    maskedFieldsActive: 'L6 敏感列掩蔽',
                    reportView: 'L6 报表查看',
                    reportEdit: 'L6 视觉设计编辑',
                    exportUnderlying: 'L6 底层明细导出',
                    powerQueryEdit: 'L6 Power Query编辑'
                };
                const label = labelMap[field] || field;
                window.showNotification(`⚡ What-If 演练变更: [${label}] -> ${newVal}，已计算联动波及影响！`, 'info');
            }
        }

        // 重置全部 What-If 演练覆盖，恢复基准状态
        resetWhatIf() {
            this.whatIfOverrides = {};
            this.renderMatrix();
            this.renderEffectivePermissionsCard();
            this.updateAuditReport();

            if (typeof window.showNotification === 'function') {
                window.showNotification('↺ 已重置全部 What-If 模拟演练，恢复初始基准权限设置', 'success');
            }
        }

        // 计算当前 What-If 状态对各层级的具体级联波及效应
        calculateWhatIfImpacts() {
            const overrides = this.whatIfOverrides || {};
            const s = this.currentState;
            const eff = (k) => (overrides[k] !== undefined ? overrides[k] : s[k]);

            const role = eff('workspaceRole');
            const isPrivileged = ['Admin', 'Member', 'Contributor'].includes(role);
            const canBuild = isPrivileged || (eff('sharePermission') && String(eff('sharePermission')).includes('Build'));
            const tenantAllowExport = eff('tenantAllowExport');
            const tenantAllowWebModeling = eff('tenantAllowWebModeling');
            const gatewayOnline = eff('gatewayOnline');
            const rlsEnabled = eff('rlsEnabled');
            const olsEnabled = eff('olsEnabled');
            const isFabric = eff('capacityType') === 'fabric_f64';
            const isInStrictMode = eff('isInStrictMode');
            const hasAccessToAllDataConnections = eff('hasAccessToAllDataConnections');
            const isGuestUser = eff('isGuestUser');

            const impacts = {};

            // 1. 若 L1 租户禁止导出 -> 联动波及阻断 L6 明细导出
            if (overrides['tenantAllowExport'] !== undefined) {
                if (!tenantAllowExport) {
                    impacts['exportUnderlying'] = { from: 'L1', fromTier: 1, fromField: 'tenantAllowExport', toTier: 6, type: 'danger', reason: 'L1 租户策略收紧强制阻断了 L6 导出底层明细数据' };
                } else if (canBuild) {
                    impacts['exportUnderlying'] = { from: 'L1', fromTier: 1, fromField: 'tenantAllowExport', toTier: 6, type: 'success', reason: 'L1 租户策略放行使得构建者可导出数据' };
                }
            }

            // 2. 若 L1 Web 建模被禁用 -> 联动阻断 L6 报表编辑与建模
            if (overrides['tenantAllowWebModeling'] !== undefined) {
                if (!tenantAllowWebModeling) {
                    impacts['reportEdit'] = { from: 'L1', fromTier: 1, fromField: 'tenantAllowWebModeling', toTier: 6, type: 'danger', reason: 'L1 租户禁止 Web 建模，阻断了浏览器端在线设计编辑' };
                }
            }

            // 2.1 若 L1 XMLA 终结点读写支持发生 What-If 调整 -> 联动影响 L4 模型架构写回
            if (overrides['xmlaEndpoint'] !== undefined) {
                const xmla = eff('xmlaEndpoint');
                if (!xmla) {
                    impacts['writePermission'] = { from: 'L1', fromTier: 1, fromField: 'xmlaEndpoint', toTier: 4, type: 'danger', reason: 'L1 租户禁用 XMLA 终结点读写，阻断外部建模工具写回架构' };
                } else if (isPrivileged) {
                    impacts['writePermission'] = { from: 'L1', fromTier: 1, fromField: 'xmlaEndpoint', toTier: 4, type: 'success', reason: 'L1 租户启用 XMLA 终结点读写，允许特权主体外部客户端写回' };
                }
            }

            // 3. 若 L1 访客主体发生变更 -> 联动影响 L1 外部共享与 L5 DAX 身份
            if (overrides['isGuestUser'] !== undefined) {
                if (isGuestUser) {
                    impacts['shareExternal'] = { from: 'L1', fromTier: 1, fromField: 'isGuestUser', toTier: 1, type: 'warn', reason: '外部访客身份触发安全策略，组织外部共享被限制' };
                    impacts['daxIdentity'] = { from: 'L1', fromTier: 1, fromField: 'isGuestUser', toTier: 5, type: 'warn', reason: '外部访客 UPN 含有外链标识，触发动态跨租户身份校验' };
                }
            }

            // 3.1 若 L1 组织外部共享被调整 -> 联动波及 L4 向第三方重新共享
            if (overrides['shareExternal'] !== undefined) {
                const ext = eff('shareExternal');
                if (!ext) {
                    impacts['resharePermission'] = { from: 'L1', fromTier: 1, fromField: 'shareExternal', toTier: 4, type: 'warn', reason: 'L1 租户禁止组织外部共享，向外部第三方重新共享被阻断' };
                }
            }

            // 4. 若 L1 GAC 隔离策略切换为严格门禁 -> 联动阻断工作区连接审查与数据源直连鉴权、L5 Mashup 门禁及 L6 Power Query 编辑
            if (overrides['isInStrictMode'] !== undefined) {
                if (isInStrictMode) {
                    impacts['gacConnection'] = { from: 'L1', fromTier: 1, fromField: 'isInStrictMode', toTier: 3, type: 'warn', reason: 'L1 GAC 开启严格门禁，工作区数据连接通道处于严格审查隔离' };
                    if (!isPrivileged) {
                        impacts['dataSourceAuth'] = { from: 'L1', fromTier: 1, fromField: 'isInStrictMode', toTier: 4, type: 'danger', reason: 'L1 GAC 严格门禁启用，直连凭据鉴权受到隔离阻断' };
                        impacts['gacMashupGate'] = { from: 'L1', fromTier: 1, fromField: 'isInStrictMode', toTier: 5, type: 'danger', reason: 'L1 GAC 细粒度隔离策略强制拦截了跨源数据流动' };
                        impacts['powerQueryEdit'] = { from: 'L1', fromTier: 1, fromField: 'isInStrictMode', toTier: 6, type: 'danger', reason: 'L1 GAC 严格门禁阻断了跨数据源 Mashup，网页端 Power Query 无法执行' };
                    }
                } else {
                    impacts['gacConnection'] = { from: 'L1', fromTier: 1, fromField: 'isInStrictMode', toTier: 3, type: 'success', reason: 'L1 GAC 切换为宽松模式，工作区连接通道放行' };
                    impacts['dataSourceAuth'] = { from: 'L1', fromTier: 1, fromField: 'isInStrictMode', toTier: 4, type: 'success', reason: 'L1 切换为宽松模式，数据源直连鉴权放行' };
                    impacts['gacMashupGate'] = { from: 'L1', fromTier: 1, fromField: 'isInStrictMode', toTier: 5, type: 'success', reason: 'L1 门禁放行，允许跨源数据融合流动' };
                    impacts['powerQueryEdit'] = { from: 'L1', fromTier: 1, fromField: 'isInStrictMode', toTier: 6, type: 'success', reason: 'L1 门禁放行，恢复网页端在线编辑能力' };
                }
            }

            // 5. 若 L2 容量规格发生 What-If 调整
            if (overrides['capacityType'] !== undefined) {
                if (!isFabric) {
                    impacts['largeDataset'] = { from: 'L2', fromTier: 2, fromField: 'capacityType', toTier: 2, type: 'warn', reason: '降级为 Pro 共享容量，失去大数据集格式支持' };
                    impacts['autoScale'] = { from: 'L2', fromTier: 2, fromField: 'capacityType', toTier: 2, type: 'warn', reason: 'Pro 共享容量不支持弹性按需自动缩放' };
                    impacts['aiCopilot'] = { from: 'L2', fromTier: 2, fromField: 'capacityType', toTier: 2, type: 'warn', reason: 'Copilot 与 AI 增强功能仅在 Fabric F64+ 容量中可用' };
                    impacts['directLake'] = { from: 'L2', fromTier: 2, fromField: 'capacityType', toTier: 2, type: 'warn', reason: 'Direct Lake 极速湖仓模式仅支持 Fabric 专用容量' };
                } else {
                    impacts['largeDataset'] = { from: 'L2', fromTier: 2, fromField: 'capacityType', toTier: 2, type: 'success', reason: '升级为 Fabric F64 容量，已解锁大数据集格式支持' };
                    impacts['directLake'] = { from: 'L2', fromTier: 2, fromField: 'capacityType', toTier: 2, type: 'success', reason: '升级为 Fabric F64 容量，已启用 Direct Lake 极速湖仓' };
                }
            }

            // 6. 若 L3 工作区角色发生 What-If 调整
            if (overrides['workspaceRole'] !== undefined) {
                if (!isPrivileged) {
                    impacts['activeRlsRole'] = { from: 'L3', fromTier: 3, fromField: 'workspaceRole', toTier: 5, type: 'warn', reason: '降为非特权角色后丧失特权穿透，L5 RLS 行隔离重新生效' };
                    impacts['maskedStatus'] = { from: 'L3', fromTier: 3, fromField: 'workspaceRole', toTier: 6, type: 'warn', reason: '降为非特权角色后无法旁路 OLS，L6 敏感列掩蔽生效' };
                    impacts['editDelete'] = { from: 'L3', fromTier: 3, fromField: 'workspaceRole', toTier: 3, type: 'danger', reason: '工作区资产编辑与删除权限被立即撤销' };
                    impacts['reportEdit'] = { from: 'L3', fromTier: 3, fromField: 'workspaceRole', toTier: 6, type: 'danger', reason: '报表设计与编辑权限被收回' };
                    impacts['writePermission'] = { from: 'L3', fromTier: 3, fromField: 'workspaceRole', toTier: 4, type: 'danger', reason: '失去语义模型架构写回与重构权限' };
                } else {
                    impacts['activeRlsRole'] = { from: 'L3', fromTier: 3, fromField: 'workspaceRole', toTier: 5, type: 'success', reason: '晋升为工作区特权角色，L5 RLS 安全规则被特权穿透绕过' };
                    impacts['maskedStatus'] = { from: 'L3', fromTier: 3, fromField: 'workspaceRole', toTier: 6, type: 'success', reason: '晋升为工作区特权角色，L6 敏感列全部无遮挡开放' };
                    impacts['editDelete'] = { from: 'L3', fromTier: 3, fromField: 'workspaceRole', toTier: 3, type: 'success', reason: '获得工作区资产增删改完全权限' };
                    impacts['reportEdit'] = { from: 'L3', fromTier: 3, fromField: 'workspaceRole', toTier: 6, type: 'success', reason: '获得报表在线与桌面端设计编辑权限' };
                    impacts['writePermission'] = { from: 'L3', fromTier: 3, fromField: 'workspaceRole', toTier: 4, type: 'success', reason: '获得语义模型架构写回与重构特许' };
                }
            }

            // 7. 若 L3 数据连接通道 / 凭据发生 What-If 调整 -> 联动波及 L4、L5、L6
            if (overrides['hasAccessToAllDataConnections'] !== undefined) {
                if (!hasAccessToAllDataConnections) {
                    impacts['dataSourceAuth'] = { from: 'L3', fromTier: 3, fromField: 'hasAccessToAllDataConnections', toTier: 4, type: 'danger', reason: '数据连接通道收回导致直连凭据鉴权失败' };
                    impacts['gacMashupGate'] = { from: 'L3', fromTier: 3, fromField: 'hasAccessToAllDataConnections', toTier: 5, type: 'danger', reason: '无直连凭据且处于严格门禁下，GAC Mashup 数据流被拦截' };
                    impacts['powerQueryEdit'] = { from: 'L3', fromTier: 3, fromField: 'hasAccessToAllDataConnections', toTier: 6, type: 'danger', reason: '数据源凭据不完整导致网页端 Power Query 无法执行' };
                } else {
                    impacts['dataSourceAuth'] = { from: 'L3', fromTier: 3, fromField: 'hasAccessToAllDataConnections', toTier: 4, type: 'success', reason: '连接凭据恢复，数据源直连鉴权通过' };
                    impacts['gacMashupGate'] = { from: 'L3', fromTier: 3, fromField: 'hasAccessToAllDataConnections', toTier: 5, type: 'success', reason: '直连通道畅通，Mashup 数据流通过门禁' };
                    impacts['powerQueryEdit'] = { from: 'L3', fromTier: 3, fromField: 'hasAccessToAllDataConnections', toTier: 6, type: 'success', reason: '直连凭据已具备，允许网页端 Power Query 执行' };
                }
            }

            // 7.1 若 L4 数据源直连鉴权发生 What-If 调整 -> 联动波及 L5、L6
            if (overrides['dataSourceAuth'] !== undefined) {
                const dsAuth = eff('dataSourceAuth');
                if (!dsAuth) {
                    impacts['gacMashupGate'] = { from: 'L4', fromTier: 4, fromField: 'dataSourceAuth', toTier: 5, type: 'danger', reason: '数据源直连鉴权失败，导致 L5 Mashup 门禁拦截' };
                    impacts['powerQueryEdit'] = { from: 'L4', fromTier: 4, fromField: 'dataSourceAuth', toTier: 6, type: 'danger', reason: '数据源直连鉴权失败，网页端 Power Query 无法执行' };
                }
            }

            // 7.2 若 L5 GAC Mashup 门禁发生 What-If 调整 -> 联动波及 L6
            if (overrides['gacMashupGate'] !== undefined) {
                const mashupGate = eff('gacMashupGate');
                if (!mashupGate) {
                    impacts['powerQueryEdit'] = { from: 'L5', fromTier: 5, fromField: 'gacMashupGate', toTier: 6, type: 'danger', reason: 'L5 GAC Mashup 数据门禁拦截，导致 L6 网页端编辑不可用' };
                }
            }

            // 8. 若 L4 网关状态发生 What-If 调整
            if (overrides['gatewayOnline'] !== undefined) {
                if (!gatewayOnline) {
                    impacts['powerQueryEdit'] = { from: 'L4', fromTier: 4, fromField: 'gatewayOnline', toTier: 6, type: 'danger', reason: '网关离线导致 L6 报表 Power Query 网页端编辑不可用' };
                    impacts['dataSourceAuth'] = { from: 'L4', fromTier: 4, fromField: 'gatewayOnline', toTier: 4, type: 'danger', reason: '网关离线导致数据源直连鉴权不可达' };
                } else {
                    impacts['powerQueryEdit'] = { from: 'L4', fromTier: 4, fromField: 'gatewayOnline', toTier: 6, type: 'success', reason: '网关恢复在线，符合条件的主体可在线编辑查询' };
                }
            }

            // 9. 若 L4 构建权限发生 What-If 调整
            if (overrides['sharePermission'] !== undefined) {
                if (!canBuild) {
                    impacts['exportUnderlying'] = { from: 'L4', fromTier: 4, fromField: 'sharePermission', toTier: 6, type: 'danger', reason: '失去 Build 权限导致 L6 明细导出被立即阻断' };
                    impacts['buildPermission'] = { from: 'L4', fromTier: 4, fromField: 'sharePermission', toTier: 4, type: 'danger', reason: '单品共享降级导致失去衍生报表构建能力' };
                }
            }

            // 9.1 若 L4 语义模型读取权限发生 What-If 调整
            if (overrides['canReadModel'] !== undefined) {
                const canRead = eff('canReadModel');
                if (!canRead) {
                    impacts['reportView'] = { from: 'L4', fromTier: 4, fromField: 'canReadModel', toTier: 6, type: 'danger', reason: '失去模型 Read 权限，L6 报表前端渲染触发 403 拒绝访问' };
                } else {
                    impacts['reportView'] = { from: 'L4', fromTier: 4, fromField: 'canReadModel', toTier: 6, type: 'success', reason: '模型 Read 权限恢复，L6 报表允许打开' };
                }
            }

            // 10. 若 L5 RLS 规则发生 What-If 调整
            if (overrides['rlsEnabled'] !== undefined) {
                if (!rlsEnabled) {
                    impacts['activeRlsRole'] = { from: 'L5', fromTier: 5, fromField: 'rlsEnabled', toTier: 5, type: 'success', reason: 'RLS 停用后所有用户均可见模型全量数据行' };
                } else {
                    impacts['activeRlsRole'] = { from: 'L5', fromTier: 5, fromField: 'rlsEnabled', toTier: 5, type: 'warn', reason: 'RLS 启用后受限角色将根据分配安全角色执行行过滤' };
                }
            }

            // 10.1 若 L5 RLS 安全角色分配发生 What-If 调整
            if (overrides['rlsRoleAssigned'] !== undefined) {
                const assigned = eff('rlsRoleAssigned');
                if (assigned === 'Unassigned' && !isPrivileged) {
                    impacts['reportView'] = { from: 'L5', fromTier: 5, fromField: 'rlsRoleAssigned', toTier: 6, type: 'danger', reason: 'L5 RLS 角色未分配，导致普通访客在 L6 查看报表时触发 403 拒绝访问' };
                    impacts['unassignedDenied'] = { from: 'L5', fromTier: 5, fromField: 'rlsRoleAssigned', toTier: 5, type: 'danger', reason: '未分配任何有效 RLS 角色，行级别数据全部拦截' };
                } else if (assigned !== 'Unassigned') {
                    impacts['reportView'] = { from: 'L5', fromTier: 5, fromField: 'rlsRoleAssigned', toTier: 6, type: 'success', reason: `已分配 ${assigned} 安全角色，恢复报表行过滤查看` };
                }
            }

            // 11. 若 L6 OLS 规则发生 What-If 调整
            if (overrides['olsEnabled'] !== undefined) {
                if (!olsEnabled) {
                    impacts['maskedStatus'] = { from: 'L6', fromTier: 6, fromField: 'olsEnabled', toTier: 6, type: 'success', reason: 'OLS 停用后薪资、利润率等所有受控敏感列全面开放可见' };
                } else {
                    impacts['maskedStatus'] = { from: 'L6', fromTier: 6, fromField: 'olsEnabled', toTier: 6, type: 'warn', reason: 'OLS 启用后受限用户将无法查看或使用敏感受控字段' };
                }
            }

            return impacts;
        }

        _registerRealUser(u) {
            if (!u) return;
            const email = (u.emailAddress || u.userPrincipalName || u.identifier || '').trim();
            if (!email) return;
            const cleanKey = `real_${email.replace(/[^a-zA-Z0-9_]/g, '_')}`;
            const role = u.groupUserAccessRight || u.role || 'Member';
            const isGroup = u.principalType === 'Group';
            const name = u.displayName || email.split('@')[0];

            USER_PRESETS[cleanKey] = {
                id: cleanKey,
                name: name,
                upn: email,
                rawRole: role,
                principalType: u.principalType || 'User',
                roleTag: `${role} (${isGroup ? 'Security Group' : 'Org Member'})`,
                roleColor: role === 'Admin' ? '#60a5fa' : (role === 'Contributor' ? '#34d399' : (role === 'Member' ? '#818cf8' : '#fbbf24')),
                state: {
                    isGuestUser: Boolean(email.includes('#ext#') || u.userType === 'Guest'),
                    tenantAllowExport: true,
                    tenantAllowWebModeling: role === 'Admin' || role === 'Member',
                    capacityType: 'fabric_f64',
                    workspaceRole: role,
                    isModelOwner: role === 'Admin',
                    isInStrictMode: false,
                    hasAccessToAllDataConnections: true,
                    gatewayOnline: true,
                    sharePermission: role === 'Admin' ? 'ReadWrite' : (role === 'Contributor' ? 'ReadWrite' : 'Read'),
                    hasAppAccess: true,
                    rlsEnabled: role === 'Viewer',
                    rlsRoleAssigned: role === 'Viewer' ? 'Region_East' : 'All_Access',
                    olsEnabled: false,
                    maskedFields: role === 'Viewer' ? 'Salary, Margin' : 'None'
                }
            };
        }

        async autoFetchTenantUsers() {
            if (this._isFetchingUsers) return;
            this._isFetchingUsers = true;

            // 1. 先从 localStorage 载入已缓存的用户集合 (0ms 瞬时呈现)
            let cachedUsers = [];
            try {
                cachedUsers = JSON.parse(localStorage.getItem('pbi_cached_tenant_users') || '[]');
            } catch (e) {
                cachedUsers = [];
            }
            if (Array.isArray(cachedUsers) && cachedUsers.length > 0) {
                for (const u of cachedUsers) {
                    this._registerRealUser(u);
                }
                this.populatePresetSelect();
            }

            // 2. 尝试从全局配置或当前已登录的主体中注入自身身份
            const liveUser = document.getElementById('set-username')?.value || document.getElementById('set-interactive-username')?.value || localStorage.getItem('pbi_user_name') || '';
            if (liveUser) {
                this._registerRealUser({
                    displayName: liveUser.split('@')[0],
                    emailAddress: liveUser,
                    groupUserAccessRight: 'Admin',
                    principalType: 'User'
                });
            }

            // 3. 异步并发拉取：优先 scan-users，同时多源工作区聚合
            try {
                const scanRes = await fetch('/api/workflow/scan-users', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({})
                });
                if (scanRes.ok) {
                    const scanData = await scanRes.json();
                    if (scanData.success && Array.isArray(scanData.users) && scanData.users.length > 0) {
                        for (const u of scanData.users) {
                            this._registerRealUser({
                                displayName: u.displayName || u.userPrincipalName?.split('@')[0] || u.identifier,
                                emailAddress: u.userPrincipalName || u.emailAddress || u.identifier,
                                groupUserAccessRight: u.groupUserAccessRight || u.role || 'Member',
                                principalType: u.principalType || 'User'
                            });
                        }
                    }
                }
            } catch (e) {}

            // 4. 工作区用户并发聚合扫描 (针对当前组织工作区，多源保底)
            const rawWsData = window.cleanseCrossDomainWorkspaces ? window.cleanseCrossDomainWorkspaces(window.getMergedGtbWorkspaces ? window.getMergedGtbWorkspaces() : []) : [];
            const wsToScan = rawWsData.slice(0, 15);
            if (wsToScan.length > 0) {
                const scanTasks = wsToScan.map(async (ws) => {
                    try {
                        const res = await fetch('/api/proxy', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                                endpoint: `/groups/${ws.id}/users`,
                                method: 'GET'
                            })
                        });
                        const data = await res.json();
                        const users = (data && data.success && data.data && Array.isArray(data.data.value)) ? data.data.value : [];
                        return users;
                    } catch (e) {
                        return [];
                    }
                });

                const results = await Promise.allSettled(scanTasks);
                for (const r of results) {
                    if (r.status === 'fulfilled' && Array.isArray(r.value)) {
                        for (const u of r.value) {
                            this._registerRealUser(u);
                        }
                    }
                }
            }

            // 5. 持久化最新真实用户快照
            const allRealPresets = Object.values(USER_PRESETS).filter(u => u.id.startsWith('real_'));
            try {
                localStorage.setItem('pbi_cached_tenant_users', JSON.stringify(allRealPresets.map(p => ({
                    displayName: p.name,
                    emailAddress: p.upn,
                    groupUserAccessRight: p.rawRole || 'Viewer',
                    principalType: p.principalType || 'User'
                }))));
            } catch (e) {}

            this._isFetchingUsers = false;
            this.populatePresetSelect();
            if (this.activeMainTab === 'user_assets') {
                this.renderUserAssetsMatrix();
            }
        }

        populatePresetSelect() {
            const selectEl = document.getElementById('pb-user-preset-select');
            const userListContainer = document.getElementById('pb-user-list');
            const userDisplayText = document.getElementById('pb-user-display-text');
            const userStatText = document.getElementById('pb-user-stat-text');
            const roleBadge = document.getElementById('pb-badge-role-tag');

            // 如果当前处于虚拟预设用户，自动重置为通用中立基准
            if (this.activePresetKey && !this.activePresetKey.startsWith('real_') && !this.activePresetKey.startsWith('custom_')) {
                this.activePresetKey = null;
            }

            const allPresets = Object.values(USER_PRESETS);
            const realUsers = allPresets.filter(u => u.id.startsWith('real_'));

            let html = '';
            let listHtml = '';

            const appendUserGroup = (title, users) => {
                if (!users || users.length === 0) return;
                html += `<optgroup label="${title}">`;
                listHtml += `<div class="gtb-ws-group-title">${title}</div>`;

                for (const u of users) {
                    const isSelected = (this.activePresetKey && String(this.activePresetKey) === String(u.id));
                    const searchText = `${u.name} ${u.upn} ${u.roleTag || ''}`.toLowerCase();
                    html += `<option value="${u.id}">${u.name} (${u.roleTag}) - ${u.upn}</option>`;
                    listHtml += `
                        <div class="gtb-ws-item ${isSelected ? 'selected' : ''}" data-preset-id="${u.id}" data-search-text="${searchText}" onclick="window.PermissionBlueprint.selectUserPreset('${u.id}')">
                            <div class="gtb-ws-item-left">
                                <div class="gtb-ws-item-names">
                                    <div class="gtb-ws-item-title" title="${u.name}">${u.name} <span class="api-count-badge" style="font-size: 0.58rem; padding: 0 4px; color: ${u.roleColor || '#818cf8'}; border-color: ${u.roleColor || '#818cf8'}40;">${u.roleTag}</span></div>
                                    <div class="gtb-ws-item-sub" title="${u.upn}">${u.upn}</div>
                                </div>
                            </div>
                        </div>
                    `;
                }
                html += '</optgroup>';
            };

            if (realUsers.length > 0) {
                html += '<option value="none">-- 请选择真实用户主体 --</option>';
                appendUserGroup('🏢 真实租户/工作区授权用户', realUsers);
            } else {
                html += '<option value="none">-- 正在全量拉取组织成员... --</option>';
                if (!listHtml) {
                    listHtml = '<div style="font-size: 0.72rem; color: var(--text-secondary); text-align: center; padding: 24px 10px;">🔄 正在扫描组织成员...</div>';
                }
            }

            if (userStatText) {
                userStatText.textContent = realUsers.length > 0 ? `共 ${realUsers.length} 个组织成员` : '正在拉取用户...';
            }

            if (selectEl) {
                selectEl.innerHTML = html;
                const currentVal = this.activePresetKey || selectEl.value;
                if (currentVal && selectEl.querySelector(`option[value="${currentVal}"]`)) {
                    selectEl.value = currentVal;
                }
            }

            if (userListContainer) {
                userListContainer.innerHTML = listHtml;
            }

            if (this.activePresetKey && USER_PRESETS[this.activePresetKey]) {
                const p = USER_PRESETS[this.activePresetKey];
                if (userDisplayText) {
                    userDisplayText.textContent = `🎯 ${p.name} (${p.roleTag})`;
                    userDisplayText.title = `${p.name} - ${p.upn}`;
                }
                if (roleBadge) {
                    roleBadge.textContent = p.roleTag;
                    roleBadge.style.color = p.roleColor || '#818cf8';
                    roleBadge.style.borderColor = `${p.roleColor || '#818cf8'}40`;
                }
            } else {
                if (userDisplayText) {
                    userDisplayText.textContent = '-- 选择模拟用户主体 (当前: 通用基准) --';
                    userDisplayText.title = '通用中立基准拓扑';
                }
                if (roleBadge) {
                    roleBadge.textContent = '通用基准';
                    roleBadge.style.color = 'var(--text-secondary)';
                    roleBadge.style.borderColor = 'var(--overlay-10)';
                }
            }

            if (userStatText) {
                userStatText.textContent = realUsers.length > 0 ? `共 ${realUsers.length} 个授权主体` : '暂无缓存成员';
            }
        }

        renderQuickUsersList() {
            // 已合入主选择器下拉列表，此处保留空函数以提供向后兼容
        }

        toggleCustomInput() {
            const box = document.getElementById('pb-custom-user-box');
            if (!box) return;
            const isHidden = box.style.display === 'none' || !box.style.display;
            box.style.display = isHidden ? 'block' : 'none';
            if (isHidden) {
                const input = document.getElementById('pb-custom-upn');
                if (input) input.focus();
            }
        }

        applyCustomUpn() {
            const input = document.getElementById('pb-custom-upn');
            const val = input ? input.value.trim() : '';
            if (!val) {
                if (typeof window.showNotification === 'function') {
                    window.showNotification('请输入有效的企业邮箱或 UPN', 'warning');
                }
                return;
            }

            const cleanId = `custom_${val.replace(/[^a-zA-Z0-9_]/g, '_')}`;
            USER_PRESETS[cleanId] = {
                id: cleanId,
                name: val.split('@')[0],
                upn: val,
                roleTag: 'Custom Principal (Guest/Viewer)',
                roleColor: '#38bdf8',
                description: '手动输入指定的测试主体 UPN',
                state: {
                    isGuestUser: val.includes('#ext#') || val.toLowerCase().includes('external') || val.includes('#'),
                    tenantAllowExport: true,
                    tenantAllowWebModeling: false,
                    capacityType: 'fabric_f64',
                    workspaceRole: 'Viewer',
                    isModelOwner: false,
                    isInStrictMode: false,
                    hasAccessToAllDataConnections: false,
                    gatewayOnline: true,
                    sharePermission: 'Read',
                    hasAppAccess: false,
                    rlsEnabled: true,
                    rlsRoleAssigned: 'Region_Assigned',
                    olsEnabled: false,
                    maskedFields: 'Salary, Margin'
                }
            };

            this.populatePresetSelect();
            this.selectUserPreset(cleanId);

            if (typeof window.showNotification === 'function') {
                window.showNotification(`已应用并模拟自定义用户: ${val}`, 'success');
            }
        }

        selectUserPreset(presetKey) {
            if (presetKey === 'none') {
                this.clearSimulatedUser();
                return;
            }

            this.activePresetKey = presetKey;
            const selectEl = document.getElementById('pb-user-preset-select');
            if (selectEl && selectEl.value !== presetKey) {
                selectEl.value = presetKey;
            }

            const preset = USER_PRESETS[presetKey];
            if (!preset) return;

            const userDisplayText = document.getElementById('pb-user-display-text');
            const roleBadge = document.getElementById('pb-selected-user-role-badge') || document.getElementById('pb-badge-role-tag');
            const userListContainer = document.getElementById('pb-user-list');

            if (userDisplayText) {
                userDisplayText.textContent = `🎯 ${preset.name} (${preset.roleTag})`;
                userDisplayText.title = `${preset.name} - ${preset.upn}`;
            }

            if (roleBadge) {
                roleBadge.textContent = preset.roleTag;
                roleBadge.style.color = preset.roleColor || '#818cf8';
                roleBadge.style.borderColor = `${preset.roleColor || '#818cf8'}40`;
            }

            if (userListContainer) {
                const items = userListContainer.querySelectorAll('.gtb-ws-item');
                items.forEach(it => {
                    const matches = it.getAttribute('data-preset-id') === presetKey;
                    if (matches) it.classList.add('selected');
                    else it.classList.remove('selected');
                });
            }

            this.closeAllDropdowns();

            const upnLabel = document.getElementById('pb-current-upn-label');
            if (upnLabel) {
                upnLabel.textContent = preset.upn;
            }

            // 基础权限深拷贝
            this.currentState = JSON.parse(JSON.stringify(preset.state));

            // 跨模型关联计算：如果该用户在当前选中的目标模型中有特定角色配置，实时生效该模型角色的特权或限制
            const currentModel = MODEL_DEFINITIONS[this.currentModelKey];
            if (currentModel && Array.isArray(currentModel.users)) {
                const userInModel = currentModel.users.find(u => u.presetId === presetKey || u.upn.toLowerCase() === preset.upn.toLowerCase());
                if (userInModel) {
                    this.applyModelPermissionToState(userInModel.role, currentModel);
                }
            }

            this.renderNodes();
            this.recalculateAndRenderWires();
            this.updateAuditReport();
            this.renderEffectivePermissionsCard();
            this.renderModelUsersList();
            if (this.activeMainTab === 'matrix') {
                this.renderMatrix();
            } else if (this.activeMainTab === 'user_assets') {
                this.renderUserAssetsMatrix();
            }

            if (typeof window.showNotification === 'function') {
                window.showNotification(`✨ 已切换模拟主体为：${preset.name} (${preset.roleTag})`, 'success');
            }
        }

        updateCustomUpn(val) {
            const upnLabel = document.getElementById('pb-current-upn-label');
            if (upnLabel) upnLabel.textContent = val || 'custom.user@contoso.com';
            this.updateAuditReport();
            this.renderEffectivePermissionsCard();
        }

        selectModel(modelKey) {
            this.currentModelKey = modelKey;
            const model = MODEL_DEFINITIONS[modelKey];
            if (!model) return;

            this.currentWorkspaceName = model.workspaceName;
            const wsLabel = document.getElementById('pb-model-ws-name');
            if (wsLabel) wsLabel.textContent = model.workspaceName;

            const modelSelect = document.getElementById('pb-model-select');
            if (modelSelect) modelSelect.value = modelKey;

            const modelDisplayText = document.getElementById('pb-model-display-text');
            if (modelDisplayText) {
                modelDisplayText.textContent = `🗄️ ${model.name}`;
                modelDisplayText.title = model.name;
            }

            const modelListContainer = document.getElementById('pb-model-list');
            if (modelListContainer) {
                const items = modelListContainer.querySelectorAll('.gtb-ws-item');
                items.forEach(it => {
                    const matches = it.getAttribute('data-model-key') === modelKey;
                    if (matches) it.classList.add('selected');
                    else it.classList.remove('selected');
                });
            }

            this.closeAllDropdowns();

            const wsSelect = document.getElementById('pb-ws-select');
            if (wsSelect && model.workspaceId && wsSelect.querySelector(`option[value="${model.workspaceId}"]`)) {
                wsSelect.value = model.workspaceId;
            }

            // 跨模型核心关联：当切换目标模型时，若当前正模拟某位用户，重算该用户在该模型中的有效权限
            if (this.activePresetKey && USER_PRESETS[this.activePresetKey]) {
                const preset = USER_PRESETS[this.activePresetKey];
                this.currentState = JSON.parse(JSON.stringify(preset.state));

                const userInModel = model.users ? model.users.find(u => u.presetId === this.activePresetKey || u.upn.toLowerCase() === preset.upn.toLowerCase()) : null;
                if (userInModel) {
                    this.applyModelPermissionToState(userInModel.role, model);
                } else if (!['Admin', 'Member', 'Contributor'].includes(preset.state.workspaceRole)) {
                    // 若非工作区特权角色且无此模型单品权限
                    this.currentState.sharePermission = 'None';
                }
            }

            const drillBanner = document.getElementById('pb-model-drill-banner');
            if (drillBanner) drillBanner.style.display = 'none';
            this.renderModelUsersList();
            this.renderNodes();
            this.recalculateAndRenderWires();
            this.updateAuditReport();
            this.renderEffectivePermissionsCard();
            if (this.activeMainTab === 'matrix') {
                this.renderMatrix();
            } else if (this.activeMainTab === 'user_assets') {
                this.renderUserAssetsMatrix();
            }

            if (typeof window.showNotification === 'function') {
                window.showNotification(`🗄️ 已切换目标语义模型为：${model.name}，并重算当前用户对该模型的有效权限`, 'info');
            }
        }

        applyModelPermissionToState(role, model) {
            if (role === 'Admin') {
                this.currentState.workspaceRole = 'Admin';
                this.currentState.isModelOwner = true;
                this.currentState.sharePermission = 'ReadBuild';
                this.currentState.rlsEnabled = false;
                this.currentState.olsEnabled = false;
            } else if (role === 'Contributor' || role === 'Editor') {
                this.currentState.workspaceRole = 'Contributor';
                this.currentState.isModelOwner = false;
                this.currentState.sharePermission = 'ReadBuild';
                this.currentState.rlsEnabled = false;
                this.currentState.olsEnabled = false;
            } else if (role === 'Member') {
                this.currentState.workspaceRole = 'Member';
                this.currentState.isModelOwner = false;
                this.currentState.sharePermission = 'ReadBuild';
                this.currentState.rlsEnabled = false;
                this.currentState.olsEnabled = false;
            } else if (role.includes('Build') || role.includes('Direct Share + Build')) {
                this.currentState.sharePermission = 'ReadBuild';
                this.currentState.rlsEnabled = !!model.hasRLS;
                this.currentState.olsEnabled = !!model.hasOLS;
            } else if (role.includes('Read') || role.includes('Direct Share')) {
                this.currentState.sharePermission = 'Read';
                this.currentState.rlsEnabled = !!model.hasRLS;
                this.currentState.olsEnabled = !!model.hasOLS;
            } else if (role.includes('Viewer')) {
                this.currentState.workspaceRole = 'Viewer';
                this.currentState.sharePermission = 'Read';
                this.currentState.rlsEnabled = !!model.hasRLS;
                this.currentState.olsEnabled = !!model.hasOLS;
            }
        }

        async fetchRealModelAndUsers() {

            // 从 localStorage 读取工作区全集
            let wsList = [];
            try {
                wsList = JSON.parse(localStorage.getItem('pbi_workspaces') || '[]');
            } catch (e) {
                wsList = [];
            }

            // 🚨 严格以顶栏当前真实勾选的工作区为准！未选则坚决为空，绝不擅自 fallback
            const gtbSelectedWsId = (window.selectedGtbWorkspaceIds && window.selectedGtbWorkspaceIds.size > 0) ? Array.from(window.selectedGtbWorkspaceIds)[0] : '';
            let wsId = gtbSelectedWsId || '';
            let dsId = (window.selectedGtbDatasetIds && window.selectedGtbDatasetIds.size > 0) ? Array.from(window.selectedGtbDatasetIds)[0] : '';
            let wsName = '';
            let dsName = '';

            let currentWsObj = wsId ? wsList.find(w => String(w.id).toLowerCase() === String(wsId).toLowerCase()) : null;
            if (currentWsObj) {
                wsName = currentWsObj.name || currentWsObj.alias || currentWsObj.displayName || wsId;
            }

            // 同步回写引擎状态，保持界面展示绝对一致
            this.currentWorkspaceId = wsId;
            this.currentWorkspaceName = wsName;

            let targetWsId = wsId;
            let targetWsName = wsName || wsId;

            if (!targetWsId) {
                if (typeof window.showNotification === 'function') {
                    window.showNotification('💡 请先在上方顶栏选择要审计的真实工作区（Workspace）！', 'warning');
                }
                return;
            }

            const btnSync = document.getElementById('pb-btn-sync-real');
            const originalBtnText = btnSync ? btnSync.innerHTML : '';
            if (btnSync) {
                btnSync.disabled = true;
                btnSync.innerHTML = '<span class="spinner" style="display:inline-block;width:12px;height:12px;border:2px solid #fff;border-top-color:transparent;border-radius:50%;animation:spin 0.8s linear infinite;"></span> 同步中...';
            }

            if (typeof window.showNotification === 'function') {
                window.showNotification(`🔄 正在连接微软 Power BI 真实环境抓取 [${targetWsName || targetWsId}] 的所有授权用户...`, 'info');
            }

            try {
                // 1. 调用 proxy 抓取工作区真实用户与直接角色
                let res = await fetch('/api/proxy', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        endpoint: `/groups/${targetWsId}/users`,
                        method: 'GET'
                    })
                });
                let data = await res.json();

                let realUsers = [];
                const usersArray = (data && data.success && data.data && Array.isArray(data.data.value)) ? data.data.value : [];

                if (usersArray.length > 0) {
                    realUsers = usersArray.map(u => {
                        const email = u.emailAddress || u.userPrincipalName || u.identifier || (u.displayName ? `${u.displayName}@tenant.com` : 'unknown@org.com');
                        const role = u.groupUserAccessRight || 'Viewer';
                        const isGroup = u.principalType === 'Group';
                        const cleanKey = `real_${email.replace(/[^a-zA-Z0-9_]/g, '_')}`;

                        // 注册到 USER_PRESETS 中，供沙盒完整流转模拟
                        USER_PRESETS[cleanKey] = {
                            id: cleanKey,
                            name: u.displayName || email.split('@')[0],
                            upn: email,
                            roleTag: `${role} (${isGroup ? 'Security Group' : 'Org Member'})`,
                            roleColor: role === 'Admin' ? '#60a5fa' : (role === 'Contributor' ? '#34d399' : (role === 'Member' ? '#818cf8' : '#fbbf24')),
                            description: `真实组织工作区 [${targetWsName}] 授权主体 (权限等级: ${role})`,
                            state: {
                                isGuestUser: email.includes('#ext#') || email.toLowerCase().includes('external') || email.includes('#'),
                                tenantAllowExport: true,
                                tenantAllowWebModeling: ['Admin', 'Member', 'Contributor'].includes(role),
                                capacityType: 'fabric_f64',
                                workspaceRole: role,
                                isModelOwner: role === 'Admin',
                                isInStrictMode: false,
                                hasAccessToAllDataConnections: true,
                                gatewayOnline: true,
                                sharePermission: 'ReadBuild',
                                hasAppAccess: true,
                                rlsEnabled: !['Admin', 'Member', 'Contributor'].includes(role),
                                rlsRoleAssigned: 'Region_Assigned',
                                olsEnabled: false,
                                maskedFields: 'Salary, Margin'
                            }
                        };

                        return {
                            upn: email,
                            role: `${role}`,
                            presetId: cleanKey,
                            isGroup: isGroup
                        };
                    });
                }

                // 如果工作区尚未分配成员或接口未返回，realUsers 保持为空，不伪造预设虚拟用户
                if (realUsers.length === 0) {
                    realUsers = [];
                }

                // 2. 动态注册真实模型至 MODEL_DEFINITIONS
                const modelKey = `real_model_${dsId || targetWsId}`;
                // 严格过滤：若 dsName 包含多选汇总文本（如“已选 2 个模型”），回退为精准资产命名
                const isDirtyDsName = !dsName || dsName.includes('已选') || dsName.includes('个模型') || dsName.includes('个数据集');
                const cleanDsName = isDirtyDsName ? '' : dsName;
                const finalModelName = cleanDsName ? `🟢 真实模型: ${cleanDsName}` : `🟢 真实工作区资产 (${targetWsName})`;

                MODEL_DEFINITIONS[modelKey] = {
                    id: modelKey,
                    name: finalModelName,
                    workspaceName: targetWsName || '生产工作区',
                    capacity: '真实租户环境 (Fabric / Premium)',
                    tables: ['Real_Model_Data', 'Security_Mapping'],
                    hasRLS: true,
                    hasOLS: false,
                    users: realUsers
                };

                this.currentModelKey = modelKey;

                // 3. 更新同步指示条与工作区标签
                const wsLabel = document.getElementById('pb-model-ws-name');
                if (wsLabel) wsLabel.textContent = targetWsName;

                const syncWsNameEl = document.getElementById('pb-sync-ws-name');
                if (syncWsNameEl) {
                    syncWsNameEl.innerHTML = `<strong style="color: #34d399;">${targetWsName}</strong> (已载入 <strong>${realUsers.length}</strong> 位真实成员)`;
                }

                // 4. 刷新界面：更新工作区、模型与预设下拉框选项、多层级有效权限卡片与审计报告
                this.populateWorkspaceSelect();
                this.populateModelSelect();
                this.populatePresetSelect();
                this.renderModelUsersList();
                this.renderEffectivePermissionsCard();
                this.updateAuditReport();

                if (typeof window.showNotification === 'function') {
                    window.showNotification(`🎉 真实数据同步成功！已载入 [${targetWsName}] 的 ${realUsers.length} 位真实租户成员，可直接在上方下拉选单中选取推演！`, 'success');
                }
            } catch (err) {
                console.warn('Fetch real model error:', err);
                const syncWsNameEl = document.getElementById('pb-sync-ws-name');
                if (syncWsNameEl && targetWsName) {
                    syncWsNameEl.innerHTML = `<strong style="color: #34d399;">${targetWsName}</strong>`;
                }
                if (typeof window.showNotification === 'function') {
                    window.showNotification(`⚠️ 真实数据抓取提示: ${err.message || '网络或凭据异常'}，已保留预设环境供离线推演`, 'warning');
                }
            } finally {
                if (btnSync) {
                    btnSync.disabled = false;
                    btnSync.innerHTML = originalBtnText;
                }
            }
        }

        async syncGlobalModel(forceFetch = true) {
            if (forceFetch) {
                return await this.fetchRealModelAndUsers();
            }

            const gtbModelNameEl = document.getElementById('gtb-ds-display-text');
            const gtbWsNameEl = document.getElementById('gtb-ws-display-text');

            let rawMName = gtbModelNameEl ? gtbModelNameEl.textContent.trim() : '';
            const isDirty = !rawMName || rawMName.includes('已选') || rawMName.includes('个模型') || rawMName.includes('个数据集') || rawMName.includes('--');
            const mName = isDirty ? '组织数据集' : rawMName;
            const wName = gtbWsNameEl ? gtbWsNameEl.textContent.trim() : '当前选中工作区';

            const wsLabel = document.getElementById('pb-model-ws-name');
            if (wsLabel) wsLabel.textContent = wName;

            const syncWsNameEl = document.getElementById('pb-sync-ws-name');
            if (syncWsNameEl) syncWsNameEl.textContent = wName;

            this.populateModelSelect();

            if (typeof window.showNotification === 'function') {
                window.showNotification(`已同步全局上下文: ${mName} (${wName})`, 'info');
            }
        }

        renderModelUsersList() {
            const listEl = document.getElementById('pb-model-user-list');
            const countEl = document.getElementById('pb-model-user-count');
            if (!listEl) return;

            const model = MODEL_DEFINITIONS[this.currentModelKey];
            if (!model || !Array.isArray(model.users) || model.users.length === 0) {
                if (countEl) countEl.textContent = '0 位关联用户';
                listEl.innerHTML = '<div style="padding: 12px; font-size: 0.75rem; color: var(--text-secondary); text-align: center;">当前模型暂无已同步成员</div>';
                return;
            }
            if (countEl) countEl.textContent = `${model.users.length} 位关联用户`;

            const currentUpn = this.activePresetKey && USER_PRESETS[this.activePresetKey] ? USER_PRESETS[this.activePresetKey].upn.toLowerCase() : '';

            listEl.innerHTML = model.users.map(u => {
                const isSelected = (this.activePresetKey && u.presetId === this.activePresetKey) || (currentUpn && u.upn.toLowerCase() === currentUpn);
                const activeStyle = isSelected ? 'border: 1px solid var(--accent); background: rgba(99, 102, 241, 0.16); box-shadow: 0 0 8px rgba(99, 102, 241, 0.3);' : '';

                return `
                <div class="pb-model-user-row ${isSelected ? 'active-simulated' : ''}" onclick="window.PermissionBlueprint.loadUserFromModel('${u.presetId}')" style="display: flex; justify-content: space-between; align-items: center; padding: 6px 8px; border-radius: 6px; cursor: pointer; transition: all 0.2s; ${activeStyle}" title="点击直接模拟该用户在当前模型中的 6 层有效权限">
                    <div style="display: flex; flex-direction: column; min-width: 0;">
                        <div style="display: flex; align-items: center; gap: 4px;">
                            <span style="font-size: 0.73rem; font-weight: 600; color: var(--text-primary); white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${u.upn}</span>
                            ${isSelected ? '<span style="color: var(--accent); font-size: 0.66rem; font-weight: bold;">✓ 模拟中</span>' : ''}
                        </div>
                        <span style="font-size: 0.65rem; color: var(--text-secondary);">身份类别: ${USER_PRESETS[u.presetId] ? USER_PRESETS[u.presetId].name : u.role}</span>
                    </div>
                    <span class="gtb-auth-badge" style="font-size: 0.65rem; padding: 2px 6px;">${u.role}</span>
                </div>
                `;
            }).join('');
        }

        loadUserFromModel(presetId) {
            const selectEl = document.getElementById('pb-user-preset-select');
            if (selectEl) {
                selectEl.value = presetId;
            }
            this.selectUserPreset(presetId);

            // 在模型卡片顶部展示下钻提示
            const drillBanner = document.getElementById('pb-model-drill-banner');
            const drillUserName = document.getElementById('pb-drill-user-name');
            if (drillBanner && drillUserName && USER_PRESETS[presetId]) {
                drillUserName.textContent = `${USER_PRESETS[presetId].name} (${USER_PRESETS[presetId].roleTag})`;
                drillBanner.style.display = 'flex';
            }

            if (typeof window.showNotification === 'function') {
                window.showNotification(`🔍 已下钻推演模型用户: ${USER_PRESETS[presetId].upn}，拓扑链路已实时重算`, 'success');
            }
        }

        exitModelUserDrilldown(showToast = true) {
            const drillBanner = document.getElementById('pb-model-drill-banner');
            if (drillBanner) drillBanner.style.display = 'none';
            this.clearSimulatedUser();
            if (showToast && typeof window.showNotification === 'function') {
                window.showNotification('已退出用户下钻，恢复当前模型的通用基准拓扑', 'info');
            }
        }

        resetSimulation() {
            this.selectUserPreset(this.activePresetKey);
            if (typeof window.showNotification === 'function') {
                window.showNotification('已重置为默认权限基准！', 'info');
            }
        }

        applyScenario(scenarioType) {
            if (scenarioType === 'strict_gac_break') {
                this.currentState.workspaceRole = 'Contributor';
                this.currentState.isModelOwner = false;
                this.currentState.isInStrictMode = true;
                this.currentState.hasAccessToAllDataConnections = false;
                if (typeof window.showNotification === 'function') {
                    window.showNotification('⚠️ 场景已激活：GAC严格模式生效且缺失底层连接，已阻断 Power Query 编辑！', 'warning');
                }
            } else if (scenarioType === 'bypass_rls_contributor') {
                this.currentState.workspaceRole = 'Contributor';
                this.currentState.rlsEnabled = true;
                this.currentState.olsEnabled = true;
                if (typeof window.showNotification === 'function') {
                    window.showNotification('✨ 场景已激活：Contributor 角色触发特权穿透，全面豁免 RLS/OLS 限制！', 'success');
                }
            } else if (scenarioType === 'ols_mask_denied') {
                this.currentState.workspaceRole = 'Viewer';
                this.currentState.olsEnabled = true;
                this.currentState.maskedFields = 'Salary, Profit_Margin';
                if (typeof window.showNotification === 'function') {
                    window.showNotification('🔒 场景已激活：Viewer 访问包含敏感列的报表，触发 OLS 掩蔽拒绝访问！', 'warning');
                }
            }
            this.renderNodes();
            this.recalculateAndRenderWires();
            this.updateAuditReport();
            this.renderEffectivePermissionsCard();
        }

        updateStateField(key, val) {
            this.currentState[key] = val;
            this.recalculateAndRenderWires();
            this.updateAuditReport();
            this.renderEffectivePermissionsCard();
        }

        renderNodes() {
            if (!this.nodesLayerEl) return;
            const s = this.currentState;

            const nodesData = [
                // Node 1: L1 租户策略
                {
                    id: 'node_tenant',
                    title: 'L1: 租户策略与安全主体',
                    subtitle: 'Tenant Policies & Identity',
                    badge: s.isGuestUser ? 'B2B Guest 访客' : '组织内部成员',
                    badgeColor: s.isGuestUser ? '#f43f5e' : '#60a5fa',
                    inputs: [],
                    outputs: [{ id: 'out_tenant', label: '租户策略流 (Tenant Policy)' }],
                    contentHtml: `
                        <div class="pb-node-field">
                            <label>身份类型 (Identity)</label>
                            <select class="modern-input" onchange="window.PermissionBlueprint.updateStateField('isGuestUser', this.value === 'true')">
                                <option value="false" ${!s.isGuestUser ? 'selected' : ''}>🏢 租户内部成员 (Member)</option>
                                <option value="true" ${s.isGuestUser ? 'selected' : ''}>🌐 Azure AD B2B 外部访客 (Guest)</option>
                            </select>
                        </div>
                        <div class="pb-node-field">
                            <label>租户级允许导出数据 (Export Data)</label>
                            <input type="checkbox" ${s.tenantAllowExport ? 'checked' : ''} onchange="window.PermissionBlueprint.updateStateField('tenantAllowExport', this.checked)">
                        </div>
                        <div class="pb-node-field">
                            <label>允许 Web 端数据建模 (Web Modeling)</label>
                            <input type="checkbox" ${s.tenantAllowWebModeling ? 'checked' : ''} onchange="window.PermissionBlueprint.updateStateField('tenantAllowWebModeling', this.checked)">
                        </div>
                        <div class="pb-node-field">
                            <label>允许外部嵌入 (Embed for External)</label>
                            <input type="checkbox" ${s.tenantAllowEmbed !== false ? 'checked' : ''} onchange="window.PermissionBlueprint.updateStateField('tenantAllowEmbed', this.checked)">
                        </div>
                        <div class="pb-node-field">
                            <label>数据集认证权限 (Certification)</label>
                            <input type="checkbox" ${s.tenantAllowCertify !== false ? 'checked' : ''} onchange="window.PermissionBlueprint.updateStateField('tenantAllowCertify', this.checked)">
                        </div>
                    `
                },

                // Node 2: L2 容量许可
                {
                    id: 'node_capacity',
                    title: 'L2: 容量许可与引擎环境',
                    subtitle: 'Capacity & Licensing Level',
                    badge: s.capacityType === 'fabric_f64' ? 'Fabric / Premium' : 'Pro Shared 共享',
                    badgeColor: s.capacityType === 'fabric_f64' ? '#34d399' : '#fbbf24',
                    inputs: [{ id: 'in_capacity_tenant', label: '租户凭据 (Tenant Auth)' }],
                    outputs: [{ id: 'out_capacity', label: '计算资源环境 (Capacity Env)' }],
                    contentHtml: `
                        <div class="pb-node-field">
                            <label>工作区容量归属 (Capacity Assigned)</label>
                            <select class="modern-input" onchange="window.PermissionBlueprint.updateStateField('capacityType', this.value)">
                                <option value="fabric_f64" ${s.capacityType === 'fabric_f64' ? 'selected' : ''}>⚡ Fabric F64 / P1 (支持 XMLA 读写 & 开放 Web 建模)</option>
                                <option value="pro_shared" ${s.capacityType === 'pro_shared' ? 'selected' : ''}>📦 Pro 共享容量 (不支持大模型与 XMLA 写入)</option>
                            </select>
                        </div>
                        <div class="pb-node-alert alert-normal">
                            说明：非 Premium 容量将禁用部分高级 XMLA 写入与大规模并行刷新特性。
                        </div>
                    `
                },

                // Node 3: L3 工作区角色与特权穿透
                {
                    id: 'node_workspace',
                    title: 'L3: 工作区角色与特权穿透',
                    subtitle: 'Workspace Roles & Privilege Bypass',
                    badge: s.workspaceRole,
                    badgeColor: ['Admin', 'Member', 'Contributor'].includes(s.workspaceRole) ? '#f59e0b' : '#60a5fa',
                    inputs: [{ id: 'in_ws_capacity', label: '工作区环境 (Workspace)' }],
                    outputs: [
                        { id: 'out_ws_role', label: '工作区权限流 (Role Stream)' },
                        { id: 'out_ws_bypass', label: '特权穿透豁免 (Privilege Bypass ⚡)' }
                    ],
                    contentHtml: `
                        <div class="pb-node-field">
                            <label>工作区角色分配 (Workspace Role)</label>
                            <select class="modern-input" onchange="window.PermissionBlueprint.updateStateField('workspaceRole', this.value)">
                                <option value="Admin" ${s.workspaceRole === 'Admin' ? 'selected' : ''}>👑 Admin (管理员: 全部权限)</option>
                                <option value="Member" ${s.workspaceRole === 'Member' ? 'selected' : ''}>🤝 Member (成员: 共享/发布)</option>
                                <option value="Contributor" ${s.workspaceRole === 'Contributor' ? 'selected' : ''}>🛠️ Contributor (协作者: 编辑内容)</option>
                                <option value="Viewer" ${s.workspaceRole === 'Viewer' ? 'selected' : ''}>👁️ Viewer (查看者: 纯只读)</option>
                                <option value="None" ${s.workspaceRole === 'None' ? 'selected' : ''}>🚫 None (无工作区角色)</option>
                            </select>
                        </div>
                        <div class="pb-node-alert ${['Admin', 'Member', 'Contributor'].includes(s.workspaceRole) ? 'alert-bypass' : 'alert-normal'}">
                            ${['Admin', 'Member', 'Contributor'].includes(s.workspaceRole)
                                ? '<strong>⚡ 特权穿透激活：</strong> Contributor 及以上具有工作区编辑权，自动<strong>绕过豁免 RLS 与 OLS</strong> 限制！'
                                : '<span>Viewer 角色不具备编辑权，必须<strong>严格受下游 L5 RLS 与 L6 OLS 过滤与掩蔽</strong>。</span>'}
                        </div>
                    `
                },

                // Node 4: 微观流转 - GAC 严格模式与 MashupEditor 门禁
                {
                    id: 'node_gac',
                    title: '微观流转: GAC 严格模式门禁',
                    subtitle: 'Power Query & MashupEditor Gate',
                    badge: s.isModelOwner ? 'Model Owner (豁免)' : (s.isInStrictMode ? '严格模式开启' : '普通模式'),
                    badgeColor: s.isModelOwner ? '#34d399' : (s.isInStrictMode ? '#a78bfa' : '#60a5fa'),
                    inputs: [
                        { id: 'in_gac_ws', label: '编辑能力 (Editor Right)' },
                        { id: 'in_gac_conn', label: '连接凭据 (Data Connection)' }
                    ],
                    outputs: [{ id: 'out_gac_editor', label: 'PQ Transform 访问权' }],
                    contentHtml: `
                        <div class="pb-node-field">
                            <label>是否为模型创建者/所有者 (isModelOwner)</label>
                            <input type="checkbox" ${s.isModelOwner ? 'checked' : ''} onchange="window.PermissionBlueprint.updateStateField('isModelOwner', this.checked)">
                        </div>
                        <div class="pb-node-field">
                            <label>是否开启严格模式 (isInStrictMode)</label>
                            <input type="checkbox" ${s.isInStrictMode ? 'checked' : ''} onchange="window.PermissionBlueprint.updateStateField('isInStrictMode', this.checked)">
                        </div>
                        <div class="pb-node-alert alert-gac">
                            <div style="font-weight: 600; margin-bottom: 2px;">📐 GAC.md 核心判定公式：</div>
                            <code>CanEditPQ = isModelOwner || (isInStrictMode && hasAccessToAllDataConnections)</code>
                        </div>
                    `
                },

                // Node 5: 底层数据源连接与网关门禁
                {
                    id: 'node_conn',
                    title: '底层门禁: 数据源与网关连接',
                    subtitle: 'Data Connections & Gateway Gate',
                    badge: s.hasAccessToAllDataConnections ? '连接已授权' : '连接缺失 403',
                    badgeColor: s.hasAccessToAllDataConnections ? '#34d399' : '#ef4444',
                    inputs: [],
                    outputs: [{ id: 'out_conn_stream', label: '连接凭据流 (Connection Stream)' }],
                    contentHtml: `
                        <div class="pb-node-field">
                            <label>拥有全部底层连接权限 (hasAccessToAllDataConnections)</label>
                            <input type="checkbox" ${s.hasAccessToAllDataConnections ? 'checked' : ''} onchange="window.PermissionBlueprint.updateStateField('hasAccessToAllDataConnections', this.checked)">
                        </div>
                        <div class="pb-node-field">
                            <label>企业网关连通就绪 (Gateway Online)</label>
                            <input type="checkbox" ${s.gatewayOnline ? 'checked' : ''} onchange="window.PermissionBlueprint.updateStateField('gatewayOnline', this.checked)">
                        </div>
                        <div class="pb-node-field">
                            <label>连接所有者/管理员 (Connection Owner)</label>
                            <input type="checkbox" ${s.isConnectionOwner ? 'checked' : ''} onchange="window.PermissionBlueprint.updateStateField('isConnectionOwner', this.checked)">
                        </div>
                        <div class="pb-node-field">
                            <label>允许共享连接 (Share Connection)</label>
                            <input type="checkbox" ${s.canShareConnection ? 'checked' : ''} onchange="window.PermissionBlueprint.updateStateField('canShareConnection', this.checked)">
                        </div>
                        <div class="pb-node-alert alert-normal">
                            若在 GAC 严格模式下缺失底层连接权限，即使是工作区管理员也无法打开 Power Query 编辑器！
                        </div>
                    `
                },

                // Node 6: L4 单品级共享与资产授权
                {
                    id: 'node_sharing',
                    title: 'L4: 单品级共享与 Build 权限',
                    subtitle: 'Item Sharing & App Access',
                    badge: s.sharePermission,
                    badgeColor: '#60a5fa',
                    inputs: [{ id: 'in_share_ws', label: '工作区发布资产' }],
                    outputs: [{ id: 'out_share_stream', label: '单品访问权 (Item Access)' }],
                    contentHtml: `
                        <div class="pb-node-field">
                            <label>单品级共享授予 (Item Share Permission)</label>
                            <select class="modern-input" onchange="window.PermissionBlueprint.updateStateField('sharePermission', this.value)">
                                <option value="ReadBuild" ${s.sharePermission === 'ReadBuild' ? 'selected' : ''}>📄 Read + Build (只读且允许新建下游)</option>
                                <option value="Read" ${s.sharePermission === 'Read' ? 'selected' : ''}>👁️ Read Only (仅只读)</option>
                                <option value="None" ${s.sharePermission === 'None' ? 'selected' : ''}>🚫 None (未单独共享)</option>
                            </select>
                        </div>
                        <div class="pb-node-field">
                            <label>包含在发布的 Power BI App 中 (App Access)</label>
                            <input type="checkbox" ${s.hasAppAccess ? 'checked' : ''} onchange="window.PermissionBlueprint.updateStateField('hasAppAccess', this.checked)">
                        </div>
                    `
                },

                // Node 7: L5 行级别安全性计算引擎
                {
                    id: 'node_rls',
                    title: 'L5: 行级别安全性计算引擎',
                    subtitle: 'Row-Level Security (RLS)',
                    badge: s.rlsEnabled ? (s.rlsRoleAssigned || '已配置') : '未启用 RLS',
                    badgeColor: s.rlsEnabled ? '#fbbf24' : '#94a3b8',
                    inputs: [
                        { id: 'in_rls_item', label: '数据访问流 (Data Stream)' },
                        { id: 'in_rls_bypass', label: '特权穿透总线 (Bypass Bus)' }
                    ],
                    outputs: [{ id: 'out_rls_filtered', label: '行切片数据流 (Row Filtered)' }],
                    contentHtml: `
                        <div class="pb-node-field">
                            <label>语义模型定义 RLS 规则 (RLS Active)</label>
                            <input type="checkbox" ${s.rlsEnabled ? 'checked' : ''} onchange="window.PermissionBlueprint.updateStateField('rlsEnabled', this.checked)">
                        </div>
                        <div class="pb-node-field">
                            <label>已分配的 RLS 角色切片 (Security Role)</label>
                            <select class="modern-input" onchange="window.PermissionBlueprint.updateStateField('rlsRoleAssigned', this.value)">
                                <option value="Region_East" ${s.rlsRoleAssigned === 'Region_East' ? 'selected' : ''}>🌎 Region == 'East' (仅东部数据)</option>
                                <option value="Region_West" ${s.rlsRoleAssigned === 'Region_West' ? 'selected' : ''}>🌍 Region == 'West' (仅西部数据)</option>
                                <option value="Unassigned" ${s.rlsRoleAssigned === 'Unassigned' ? 'selected' : ''}>❌ 未分配角色 (无任何数据权限)</option>
                            </select>
                        </div>
                    `
                },

                // Node 8: L6 对象与字段级别安全性
                {
                    id: 'node_ols',
                    title: 'L6: 对象与字段级别安全性',
                    subtitle: 'Object-Level Security (OLS)',
                    badge: s.olsEnabled ? '敏感列掩蔽生效' : '全部列开放',
                    badgeColor: s.olsEnabled ? '#c084fc' : '#94a3b8',
                    inputs: [
                        { id: 'in_ols_rls', label: '切片数据流 (Sliced Rows)' },
                        { id: 'in_ols_bypass', label: '特权穿透总线 (Bypass Bus)' }
                    ],
                    outputs: [{ id: 'out_ols_final', label: '最终有效数据 (Final Effective)' }],
                    contentHtml: `
                        <div class="pb-node-field">
                            <label>模型定义 OLS 掩蔽保护 (OLS Active)</label>
                            <input type="checkbox" ${s.olsEnabled ? 'checked' : ''} onchange="window.PermissionBlueprint.updateStateField('olsEnabled', this.checked)">
                        </div>
                        <div class="pb-node-field">
                            <label>受限敏感字段 (Masked Columns)</label>
                            <input type="text" class="modern-input" value="${s.maskedFields || 'Salary, Margin'}" onchange="window.PermissionBlueprint.updateStateField('maskedFields', this.value)">
                        </div>
                        <div class="pb-node-alert alert-normal">
                            受限字段将在 DAX 查询与前端报表视觉对象中直接引发引用错误或完全隐藏。
                        </div>
                    `
                },

                // Node 9: L8 部署管道与 ALM 生命周期
                {
                    id: 'node_pipeline',
                    title: 'L8: 部署管道与 ALM 生命周期',
                    subtitle: 'Deployment Pipeline & ALM',
                    badge: s.isPipelineAdmin ? 'Pipeline Admin' : 'Deployer',
                    badgeColor: s.isPipelineAdmin ? '#34d399' : '#fbbf24',
                    inputs: [{ id: 'in_pipeline_ws', label: '工作区资产流 (Workspace Assets)' }],
                    outputs: [{ id: 'out_pipeline_prod', label: '生产部署流 (Prod Deploy)' }],
                    contentHtml: `
                        <div class="pb-node-field">
                            <label>管道管理员 (Pipeline Admin)</label>
                            <input type="checkbox" ${s.isPipelineAdmin ? 'checked' : ''} onchange="window.PermissionBlueprint.updateStateField('isPipelineAdmin', this.checked)">
                        </div>
                        <div class="pb-node-field">
                            <label>允许反向部署 (Backward Deploy)</label>
                            <input type="checkbox" ${s.allowBackwardDeploy ? 'checked' : ''} onchange="window.PermissionBlueprint.updateStateField('allowBackwardDeploy', this.checked)">
                        </div>
                        <div class="pb-node-alert alert-normal">
                            管道管理员可执行阶段流转部署、架构差异比对、部署规则配置及管道生命周期管理。
                        </div>
                    `
                }
            ];

            this.nodesLayerEl.innerHTML = nodesData.map(n => {
                const pos = this.nodePositions[n.id] || { x: 60, y: 80 };
                return `
                    <div id="${n.id}" class="pb-blueprint-node glass-panel" style="left: ${pos.x}px; top: ${pos.y}px;">
                        <div class="pb-node-header" onmousedown="window.PermissionBlueprint.startNodeDrag(event, '${n.id}')">
                            <div style="display: flex; flex-direction: column; min-width: 0;">
                                <span class="pb-node-title">${n.title}</span>
                                <span class="pb-node-subtitle">${n.subtitle}</span>
                            </div>
                            <span class="gtb-auth-badge" style="background: ${n.badgeColor}22; color: ${n.badgeColor}; border: 1px solid ${n.badgeColor}40; font-size: 0.65rem; padding: 2px 6px;">${n.badge}</span>
                        </div>

                        <div class="pb-node-ports-row">
                            <div class="pb-input-ports">
                                ${n.inputs.map(inp => `
                                    <div class="pb-port pb-port-in" id="port_${inp.id}" title="${inp.label}">
                                        <span class="pb-port-dot"></span>
                                        <span class="pb-port-text">${inp.label}</span>
                                    </div>
                                `).join('')}
                            </div>
                            <div class="pb-output-ports">
                                ${n.outputs.map(out => `
                                    <div class="pb-port pb-port-out" id="port_${out.id}" title="${out.label}">
                                        <span class="pb-port-text">${out.label}</span>
                                        <span class="pb-port-dot"></span>
                                    </div>
                                `).join('')}
                            </div>
                        </div>

                        <div class="pb-node-body">
                            ${n.contentHtml}
                        </div>
                    </div>
                `;
            }).join('');
        }

        startNodeDrag(e, nodeId) {
            if (e.target.closest('select') || e.target.closest('input') || e.target.closest('button')) return;
            this.draggedNodeId = nodeId;
            const nodeEl = document.getElementById(nodeId);
            if (!nodeEl || !this.contentEl) return;
            this.cachedContentRect = this.contentEl.getBoundingClientRect();
            this.dragOffset = {
                x: (e.clientX - this.cachedContentRect.left) / this.zoom - (this.nodePositions[nodeId] ? this.nodePositions[nodeId].x : 0),
                y: (e.clientY - this.cachedContentRect.top) / this.zoom - (this.nodePositions[nodeId] ? this.nodePositions[nodeId].y : 0)
            };
            e.stopPropagation();
        }

        // 高性能几何计算 (0 getBoundingClientRect)
        getPortCenter(portId) {
            const meta = PORT_OFFSETS[portId];
            if (meta && this.nodePositions[meta.nodeId]) {
                const nodePos = this.nodePositions[meta.nodeId];
                return { x: nodePos.x + meta.relX, y: nodePos.y + meta.relY };
            }
            // 动态回退
            const el = document.getElementById(portId);
            if (!el || !this.contentEl) return { x: 0, y: 0 };
            const dot = el.querySelector('.pb-port-dot') || el;
            const dotRect = dot.getBoundingClientRect();
            const contentRect = this.contentEl.getBoundingClientRect();
            return {
                x: (dotRect.left + dotRect.width / 2 - contentRect.left) / this.zoom,
                y: (dotRect.top + dotRect.height / 2 - contentRect.top) / this.zoom
            };
        }

        // 连线拓扑定义计算
        getWiresConfig() {
            const s = this.currentState;
            const isPrivilegeBypass = ['Admin', 'Member', 'Contributor'].includes(s.workspaceRole);
            const canEditReport = isPrivilegeBypass;

            const canViewReport = Boolean(
                ['Admin', 'Member', 'Contributor', 'Viewer'].includes(s.workspaceRole) ||
                s.sharePermission !== 'None' ||
                s.hasAppAccess
            );

            const isLight = document.documentElement.getAttribute('data-theme') === 'light' || document.body.classList.contains('light-theme');
            const colorPass = isLight ? '#2563eb' : '#60a5fa';
            const colorBypass = isLight ? '#d97706' : '#f59e0b';
            const colorStrict = isLight ? '#7c3aed' : '#a78bfa';
            const colorBlock = isLight ? '#dc2626' : '#ef4444';
            const colorInactive = isLight ? 'rgba(0, 0, 0, 0.15)' : 'rgba(255, 255, 255, 0.1)';

            return [
                {
                    id: 0,
                    from: 'port_out_tenant',
                    to: 'port_in_capacity_tenant',
                    fromNode: 'node_tenant',
                    toNode: 'node_capacity',
                    status: 'pass',
                    style: colorPass,
                    marker: 'pb-arrow-normal',
                    label: '租户凭据授权'
                },
                {
                    id: 1,
                    from: 'port_out_capacity',
                    to: 'port_in_ws_capacity',
                    fromNode: 'node_capacity',
                    toNode: 'node_workspace',
                    status: 'pass',
                    style: colorPass,
                    marker: 'pb-arrow-normal',
                    label: s.capacityType === 'fabric_f64' ? 'Fabric 计算环境' : 'Pro 共享计算'
                },
                {
                    id: 2,
                    from: 'port_out_ws_role',
                    to: 'port_in_gac_ws',
                    fromNode: 'node_workspace',
                    toNode: 'node_gac',
                    status: canEditReport ? 'pass' : 'blocked',
                    style: canEditReport ? colorPass : colorBlock,
                    marker: canEditReport ? 'pb-arrow-normal' : 'pb-arrow-blocked',
                    label: canEditReport ? '工作区编辑授权' : '无编辑权(只读)'
                },
                {
                    id: 3,
                    from: 'port_out_conn_stream',
                    to: 'port_in_gac_conn',
                    fromNode: 'node_conn',
                    toNode: 'node_gac',
                    status: (s.hasAccessToAllDataConnections && s.gatewayOnline) ? 'strict' : 'blocked',
                    style: (s.hasAccessToAllDataConnections && s.gatewayOnline) ? colorStrict : colorBlock,
                    marker: (s.hasAccessToAllDataConnections && s.gatewayOnline) ? 'pb-arrow-strict' : 'pb-arrow-blocked',
                    label: (s.hasAccessToAllDataConnections && s.gatewayOnline) ? '底层连接凭据齐全' : '缺失数据源连接 403'
                },
                {
                    id: 4,
                    from: 'port_out_ws_role',
                    to: 'port_in_share_ws',
                    fromNode: 'node_workspace',
                    toNode: 'node_sharing',
                    status: 'pass',
                    style: colorPass,
                    marker: 'pb-arrow-normal',
                    label: '资产分发流'
                },
                {
                    id: 5,
                    from: 'port_out_share_stream',
                    to: 'port_in_rls_item',
                    fromNode: 'node_sharing',
                    toNode: 'node_rls',
                    status: canViewReport ? 'pass' : 'blocked',
                    style: canViewReport ? colorPass : colorBlock,
                    marker: canViewReport ? 'pb-arrow-normal' : 'pb-arrow-blocked',
                    label: canViewReport ? '数据读取权' : '未授权'
                },
                {
                    id: 6,
                    from: 'port_out_ws_bypass',
                    to: 'port_in_rls_bypass',
                    fromNode: 'node_workspace',
                    toNode: 'node_rls',
                    status: isPrivilegeBypass ? 'bypass' : 'inactive',
                    style: isPrivilegeBypass ? colorBypass : colorInactive,
                    marker: isPrivilegeBypass ? 'pb-arrow-bypass' : '',
                    label: isPrivilegeBypass ? '⚡ 特权穿透: 豁免 RLS' : '无穿透'
                },
                {
                    id: 7,
                    from: 'port_out_rls_filtered',
                    to: 'port_in_ols_rls',
                    fromNode: 'node_rls',
                    toNode: 'node_ols',
                    status: (canViewReport && (isPrivilegeBypass || s.rlsRoleAssigned !== 'Unassigned')) ? 'pass' : 'blocked',
                    style: (canViewReport && (isPrivilegeBypass || s.rlsRoleAssigned !== 'Unassigned')) ? colorPass : colorBlock,
                    marker: (canViewReport && (isPrivilegeBypass || s.rlsRoleAssigned !== 'Unassigned')) ? 'pb-arrow-normal' : 'pb-arrow-blocked',
                    label: isPrivilegeBypass ? '全量数据穿透' : (s.rlsRoleAssigned === 'Unassigned' ? 'RLS 过滤阻断' : '行切片就绪')
                },
                {
                    id: 8,
                    from: 'port_out_ws_bypass',
                    to: 'port_in_ols_bypass',
                    fromNode: 'node_workspace',
                    toNode: 'node_ols',
                    status: isPrivilegeBypass ? 'bypass' : 'inactive',
                    style: isPrivilegeBypass ? colorBypass : colorInactive,
                    marker: isPrivilegeBypass ? 'pb-arrow-bypass' : '',
                    label: isPrivilegeBypass ? '⚡ 特权穿透: 豁免 OLS' : '无穿透'
                }
            ];
        }

        // 仅增量更新直接相连的几条 SVG Path，绝不重建 DOM
        updateConnectedWirePaths(nodeId) {
            const wires = this.getWiresConfig();
            wires.forEach((w) => {
                if (w.fromNode === nodeId || w.toNode === nodeId) {
                    const p1 = this.getPortCenter(w.from);
                    const p2 = this.getPortCenter(w.to);
                    if (p1.x === 0 && p1.y === 0) return;

                    const dx = Math.max(40, Math.abs(p2.x - p1.x) * 0.5);
                    const pathD = `M ${p1.x} ${p1.y} C ${p1.x + dx} ${p1.y}, ${p2.x - dx} ${p2.y}, ${p2.x} ${p2.y}`;

                    const mainPath = document.getElementById(`pb_wire_main_${w.id}`);
                    const glowPath = document.getElementById(`pb_wire_glow_${w.id}`);
                    const textEl = document.getElementById(`pb_wire_text_${w.id}`);

                    if (mainPath) mainPath.setAttribute('d', pathD);
                    if (glowPath) glowPath.setAttribute('d', pathD);
                    if (textEl) {
                        textEl.setAttribute('x', (p1.x + p2.x) / 2);
                        textEl.setAttribute('y', (p1.y + p2.y) / 2 - 8);
                    }
                }
            });
        }

        // 全量初次构建或状态重算
        recalculateAndRenderWires() {
            if (!this.wiresGroupEl) return;
            const wires = this.getWiresConfig();

            let pathsHtml = '';
            wires.forEach((w) => {
                const p1 = this.getPortCenter(w.from);
                const p2 = this.getPortCenter(w.to);
                if (p1.x === 0 && p1.y === 0) return;

                const dx = Math.max(40, Math.abs(p2.x - p1.x) * 0.5);
                const pathD = `M ${p1.x} ${p1.y} C ${p1.x + dx} ${p1.y}, ${p2.x - dx} ${p2.y}, ${p2.x} ${p2.y}`;

                let strokeDash = '';
                let strokeClass = 'pb-wire-path';
                let strokeWidth = 2.4;

                if (w.status === 'bypass') {
                    strokeClass += ' pb-wire-bypass';
                    strokeWidth = 3.2;
                } else if (w.status === 'blocked') {
                    strokeDash = 'stroke-dasharray="6, 4"';
                    strokeClass += ' pb-wire-blocked';
                } else if (w.status === 'inactive') {
                    strokeWidth = 1.2;
                }

                const midX = (p1.x + p2.x) / 2;
                const midY = (p1.y + p2.y) / 2 - 8;

                pathsHtml += `
                    <g class="pb-wire-group" id="pb_wire_group_${w.id}" data-wire="${w.id}">
                        <path id="pb_wire_glow_${w.id}" d="${pathD}" fill="none" stroke="${w.style}" stroke-width="${strokeWidth + 4}" stroke-opacity="0.14" />
                        <path id="pb_wire_main_${w.id}" d="${pathD}" fill="none" stroke="${w.style}" stroke-width="${strokeWidth}" ${strokeDash} class="${strokeClass}" ${w.marker ? `marker-end="url(#${w.marker})"` : ''} />
                        <text id="pb_wire_text_${w.id}" x="${midX}" y="${midY}" fill="${w.style}" font-size="9" text-anchor="middle" font-family="'Inter', sans-serif" font-weight="600" opacity="0.88" style="pointer-events: none; text-shadow: 0 1px 3px rgba(0,0,0,0.8);">${w.label}</text>
                    </g>
                `;
            });

            this.wiresGroupEl.innerHTML = pathsHtml;
            this.checkRadarVisibility();
        }

        updateAuditReport() {
            const resultsEl = document.getElementById('pb-audit-results');
            if (!resultsEl) return;
            const s = this.currentState;

            const isPrivilegeBypass = ['Admin', 'Member', 'Contributor'].includes(s.workspaceRole);
            const canEditReport = isPrivilegeBypass;

            const canViewReport = Boolean(
                ['Admin', 'Member', 'Contributor', 'Viewer'].includes(s.workspaceRole) ||
                s.sharePermission !== 'None' ||
                s.hasAppAccess
            );

            const canEditPQ = Boolean(
                canEditReport && (
                    s.isModelOwner || (s.isInStrictMode && s.hasAccessToAllDataConnections && s.gatewayOnline)
                )
            );
            let pqReason = '';
            if (!canEditReport) {
                pqReason = '被拒绝：该用户在工作区仅为 Viewer 或无工作区角色，不具备编辑权限。';
            } else if (s.isModelOwner) {
                pqReason = '允许访问：该用户是语义模型的所有者 (Model Owner)，享有豁免特权放行。';
            } else if (s.isInStrictMode) {
                if (s.hasAccessToAllDataConnections && s.gatewayOnline) {
                    pqReason = '允许访问：GAC 严格模式开启，已验证用户拥有所有底层数据源连接凭据且网关在线。';
                } else {
                    pqReason = '被拒绝拦截：GAC 严格模式已启用，但用户缺少底层数据源连接凭据或网关离线，被微软阻止进入 MashupEditor！';
                }
            } else {
                pqReason = '允许访问：GAC 未开启严格模式，按常规工作区编辑权限放行。';
            }

            let rlsResult = '';
            let rlsClass = 'success';
            if (!s.rlsEnabled) {
                rlsResult = '全量可见 (未启用 RLS 规则)';
            } else if (isPrivilegeBypass) {
                rlsResult = '全量可见 (⚡ Contributor+ 特权穿透，完全绕过 RLS 过滤)';
            } else if (s.rlsRoleAssigned === 'Unassigned') {
                rlsResult = '无数据权限 403 (未分配任何生效的 RLS 角色)';
                rlsClass = 'danger';
            } else {
                rlsResult = `受限切片: 仅可见 ${s.rlsRoleAssigned} 相关数据行`;
                rlsClass = 'warning';
            }

            let olsResult = '';
            let olsClass = 'success';
            if (!s.olsEnabled) {
                olsResult = '全部字段可见 (未启用 OLS 保护)';
            } else if (isPrivilegeBypass) {
                olsResult = '全部字段可见 (⚡ Contributor+ 特权穿透，完全绕过 OLS 掩蔽)';
            } else {
                olsResult = `受限掩蔽: 敏感字段 [${s.maskedFields}] 将报字段不可见或查询错误`;
                olsClass = 'warning';
            }

            let exportResult = '';
            if (!s.tenantAllowExport) {
                exportResult = '全面禁止导出 (受组织租户策略 L1 强力封锁)';
            } else if (s.sharePermission === 'ReadBuild' || isPrivilegeBypass) {
                exportResult = '允许导出底层数据与汇总数据 (具备 Build 权限)';
            } else if (canViewReport) {
                exportResult = '仅允许导出汇总数据 (Summarized Data Only)';
            } else {
                exportResult = '无导出权限';
            }

            resultsEl.innerHTML = `
                <div class="pb-audit-card ${canViewReport ? 'pass' : 'fail'}">
                    <div class="pb-audit-card-head">
                        <span class="pb-audit-card-title">1. 报表查看与访问权 (View Report)</span>
                        <span class="gtb-auth-badge ${canViewReport ? 'badge-pass' : 'badge-fail'}">${canViewReport ? '✓ 允许' : '✕ 拒绝'}</span>
                    </div>
                    <div class="pb-audit-card-desc">
                        ${canViewReport ? '命中了工作区角色或单品分享/应用权限，可正常打开前端报表。' : '用户没有任何资产访问路径，访问报表将抛出 404/401。'}
                    </div>
                </div>

                <div class="pb-audit-card ${canEditReport ? 'pass' : 'fail'}">
                    <div class="pb-audit-card-head">
                        <span class="pb-audit-card-title">2. 报表编辑与在线建模 (Edit Report)</span>
                        <span class="gtb-auth-badge ${canEditReport ? 'badge-pass' : 'badge-fail'}">${canEditReport ? '✓ 允许' : '✕ 拒绝'}</span>
                    </div>
                    <div class="pb-audit-card-desc">
                        ${canEditReport ? `工作区角色为 ${s.workspaceRole}，具备报表与语义模型编辑权限。` : '仅只读查看权限，界面不提供 Edit / Save 按钮。'}
                    </div>
                </div>

                <div class="pb-audit-card ${canEditPQ ? 'pass' : 'fail'}">
                    <div class="pb-audit-card-head">
                        <span class="pb-audit-card-title">3. Power Query / GAC 严格门禁 (Transform Data)</span>
                        <span class="gtb-auth-badge ${canEditPQ ? 'badge-pass' : 'badge-fail'}">${canEditPQ ? '✓ 允许进入' : '✕ 严格拦截'}</span>
                    </div>
                    <div class="pb-audit-card-desc">
                        <strong>判定细节：</strong>${pqReason}
                    </div>
                </div>

                <div class="pb-audit-card ${rlsClass}">
                    <div class="pb-audit-card-head">
                        <span class="pb-audit-card-title">4. L5 行级别安全性切片 (RLS Effective Filter)</span>
                        <span class="gtb-auth-badge badge-${rlsClass}">${rlsResult.includes('全量') ? '全量穿透' : (rlsClass === 'danger' ? '无数据' : '切片过滤')}</span>
                    </div>
                    <div class="pb-audit-card-desc">
                        ${rlsResult}
                    </div>
                </div>

                <div class="pb-audit-card ${olsClass}">
                    <div class="pb-audit-card-head">
                        <span class="pb-audit-card-title">5. L6 对象与字段级安全性 (OLS Masked Scope)</span>
                        <span class="gtb-auth-badge badge-${olsClass}">${olsResult.includes('全部') ? '全字段可见' : '字段掩蔽'}</span>
                    </div>
                    <div class="pb-audit-card-desc">
                        ${olsResult}
                    </div>
                </div>

                <div class="pb-audit-card ${exportResult.includes('全面禁止') ? 'fail' : 'pass'}">
                    <div class="pb-audit-card-head">
                        <span class="pb-audit-card-title">6. 数据导出与下游生成 (Data Export & Build)</span>
                        <span class="gtb-auth-badge ${exportResult.includes('全面禁止') ? 'badge-fail' : 'badge-pass'}">${exportResult.includes('底层') ? '全权导出' : (exportResult.includes('全面禁止') ? '禁止' : '仅汇总')}</span>
                    </div>
                    <div class="pb-audit-card-desc">
                        ${exportResult}
                    </div>
                </div>
            `;
        }

        renderEffectivePermissionsCard() {
            const container = document.getElementById('pb-effective-permissions-content');
            const summaryBadge = document.getElementById('pb-perm-summary-badge');
            if (!container) return;

            const s = this.currentState;
            const model = MODEL_DEFINITIONS[this.currentModelKey] || MODEL_DEFINITIONS['model_sales'];
            const wsName = this.currentWorkspaceName || (model ? model.workspaceName : 'Production Analytics');

            const role = s.workspaceRole; // 'Admin' | 'Member' | 'Contributor' | 'Viewer' | 'None'
            const isAdmin = role === 'Admin';
            const isMember = role === 'Member';
            const isContributor = role === 'Contributor';
            const isViewer = role === 'Viewer';
            const isPrivileged = ['Admin', 'Member', 'Contributor'].includes(role);
            const canBuild = isPrivileged || (s.sharePermission && s.sharePermission.includes('Build'));
            const canReadModel = isPrivileged || s.sharePermission !== 'None' || isViewer;

            // 顶栏概要标签
            if (summaryBadge) {
                if (isAdmin) {
                    summaryBadge.textContent = '全权掌管 (Admin)';
                    summaryBadge.style.background = 'rgba(239, 68, 68, 0.15)';
                    summaryBadge.style.color = '#f87171';
                } else if (isPrivileged) {
                    summaryBadge.textContent = '特权穿透 (Bypass)';
                    summaryBadge.style.background = 'rgba(245, 158, 11, 0.15)';
                    summaryBadge.style.color = '#fbbf24';
                } else if (isViewer) {
                    summaryBadge.textContent = '受限只读 (Viewer)';
                    summaryBadge.style.background = 'rgba(56, 189, 248, 0.15)';
                    summaryBadge.style.color = '#38bdf8';
                } else {
                    summaryBadge.textContent = '通用权限基准';
                    summaryBadge.style.background = 'rgba(148, 163, 184, 0.15)';
                    summaryBadge.style.color = '#94a3b8';
                }
            }

            const capsule = this.activeFeatureCapsule || 'all';
            let rowsHtml = '';

            if (capsule === 'export') {
                // 导出场景下各层级穿透判定
                const t1Ok = s.tenantAllowExport;
                const t2Ok = s.capacityType === 'fabric_f64';
                const t3Ok = isPrivileged;
                const t4Ok = canBuild;
                const t5Ok = isPrivileged || !s.rlsEnabled || s.rlsRoleAssigned !== 'Unassigned';
                const t6Ok = t1Ok && t4Ok;

                rowsHtml = `
                    <div class="pb-overview-row">
                        <span class="pb-overview-tier">🏢 L1 租户导出策略</span>
                        <span class="pb-matrix-status ${t1Ok ? 'enabled' : 'disabled'}">${t1Ok ? '✅ 策略允许' : '❌ 租户收紧阻断'}</span>
                    </div>
                    <div class="pb-overview-row">
                        <span class="pb-overview-tier">⚡ L2 底层导出吞吐</span>
                        <span class="pb-matrix-status ${t2Ok ? 'enabled' : 'warn'}">${t2Ok ? '⚡ Direct Lake 高吞吐' : '💼 Pro 共享限流'}</span>
                    </div>
                    <div class="pb-overview-row">
                        <span class="pb-overview-tier">📁 L3 工作区导出特权</span>
                        <span class="pb-matrix-status ${t3Ok ? 'enabled' : (isViewer ? 'warn' : 'disabled')}">${t3Ok ? '👑 协同导出' : (isViewer ? '👁️ 只读导出汇总' : '🚫 无权限')}</span>
                    </div>
                    <div class="pb-overview-row">
                        <span class="pb-overview-tier">🗄️ L4 Build 衍生构建</span>
                        <span class="pb-matrix-status ${t4Ok ? 'enabled' : 'disabled'}">${t4Ok ? '⚡ 具备明细导出权' : '❌ 缺少 Build 权限'}</span>
                    </div>
                    <div class="pb-overview-row">
                        <span class="pb-overview-tier">🛡️ L5 RLS 导出受控行</span>
                        <span class="pb-matrix-status ${t5Ok ? (isPrivileged ? 'bypassed' : 'warn') : 'disabled'}">${isPrivileged ? '⚡ 全量导出' : (s.rlsEnabled ? `🔒 仅限 ${s.rlsRoleAssigned}` : '✅ 全量数据')}</span>
                    </div>
                    <div class="pb-overview-row" style="background: rgba(99,102,241,0.06); border-radius: 4px; padding: 6px 4px;">
                        <span class="pb-overview-tier" style="font-weight:700; color:var(--text-primary);">🎯 L6 最终底层导出能力</span>
                        <span class="pb-matrix-status ${t6Ok ? 'enabled' : 'disabled'}">${t6Ok ? '✅ 最终放行导出' : '❌ 最终阻断导出'}</span>
                    </div>
                `;
            } else if (capsule === 'gac') {
                // GAC 细粒度访问控制各层级穿透判定
                const inStrict = s.isInStrictMode;
                const hasConn = s.hasAccessToAllDataConnections;
                const dsAuth = hasConn && (!inStrict || isPrivileged);
                const mashupOk = isPrivileged || (!inStrict || hasConn);
                const pqOk = isPrivileged && hasConn && s.gatewayOnline;

                rowsHtml = `
                    <div class="pb-overview-row">
                        <span class="pb-overview-tier">🏢 L1 GAC 隔离策略模式</span>
                        <span class="pb-matrix-status ${inStrict ? 'enabled' : 'warn'}">${inStrict ? '🛡️ 严格门禁启用' : '⚠️ 宽松信任模式'}</span>
                    </div>
                    <div class="pb-overview-row">
                        <span class="pb-overview-tier">⚡ L2 容量网关通道</span>
                        <span class="pb-matrix-status ${s.capacityType === 'fabric_f64' ? 'enabled' : 'warn'}">${s.capacityType === 'fabric_f64' ? '⚡ 专属租户通道' : '💼 共享网关通道'}</span>
                    </div>
                    <div class="pb-overview-row">
                        <span class="pb-overview-tier">📁 L3 网关直连凭据通道</span>
                        <span class="pb-matrix-status ${hasConn ? 'enabled' : 'disabled'}">${hasConn ? '✅ 全权直连凭据' : '❌ 凭据隔离受限'}</span>
                    </div>
                    <div class="pb-overview-row">
                        <span class="pb-overview-tier">🗄️ L4 数据源凭据鉴权</span>
                        <span class="pb-matrix-status ${dsAuth ? 'enabled' : 'disabled'}">${dsAuth ? '✅ 直连鉴权通过' : '❌ GAC 拦截阻断'}</span>
                    </div>
                    <div class="pb-overview-row">
                        <span class="pb-overview-tier">🛡️ L5 GAC Mashup 门禁</span>
                        <span class="pb-matrix-status ${mashupOk ? (isPrivileged ? 'bypassed' : 'enabled') : 'disabled'}">${mashupOk ? (isPrivileged ? '⚡ 特权放行' : '✅ 门禁通过') : '❌ 门禁拦截'}</span>
                    </div>
                    <div class="pb-overview-row" style="background: rgba(99,102,241,0.06); border-radius: 4px; padding: 6px 4px;">
                        <span class="pb-overview-tier" style="font-weight:700; color:var(--text-primary);">🎯 L6 网页端 Power Query</span>
                        <span class="pb-matrix-status ${pqOk ? 'enabled' : 'disabled'}">${pqOk ? '✅ 凭据畅通允许' : '❌ GAC 隔离不可用'}</span>
                    </div>
                `;
            } else if (capsule === 'rls') {
                // RLS 行级数据安全
                const isGuest = s.isGuestUser;
                const rlsOn = s.rlsEnabled;
                const rRole = s.rlsRoleAssigned;

                rowsHtml = `
                    <div class="pb-overview-row">
                        <span class="pb-overview-tier">🏢 L1 主体合规源判定</span>
                        <span class="pb-matrix-status ${isGuest ? 'warn' : 'enabled'}">${isGuest ? '⚠️ 外部访客 (B2B)' : '✅ 内部企业成员'}</span>
                    </div>
                    <div class="pb-overview-row">
                        <span class="pb-overview-tier">⚡ L2 动态 DAX 计算吞吐</span>
                        <span class="pb-matrix-status ${s.capacityType === 'fabric_f64' ? 'enabled' : 'warn'}">${s.capacityType === 'fabric_f64' ? '⚡ 120次/分并发' : '⚠️ 60次/分并发'}</span>
                    </div>
                    <div class="pb-overview-row">
                        <span class="pb-overview-tier">📁 L3 工作区特权穿透</span>
                        <span class="pb-matrix-status ${isPrivileged ? 'bypassed' : 'warn'}">${isPrivileged ? '⚡ 穿透免校验' : '🔒 受安全规则约束'}</span>
                    </div>
                    <div class="pb-overview-row">
                        <span class="pb-overview-tier">🗄️ L4 语义模型访问门禁</span>
                        <span class="pb-matrix-status ${canReadModel ? 'enabled' : 'disabled'}">${canReadModel ? '✅ 模型读取通过' : '❌ 拒绝访问'}</span>
                    </div>
                    <div class="pb-overview-row">
                        <span class="pb-overview-tier">🛡️ L5 生效过滤安全角色</span>
                        <span class="pb-matrix-status ${isPrivileged ? 'bypassed' : (rlsOn ? (rRole === 'Unassigned' ? 'disabled' : 'warn') : 'enabled')}">${isPrivileged ? '⚡ 特权穿透' : (rlsOn ? (rRole === 'Unassigned' ? '❌ 403 阻断' : `🔒 ${rRole}`) : '✅ 全量数据可见')}</span>
                    </div>
                    <div class="pb-overview-row" style="background: rgba(99,102,241,0.06); border-radius: 4px; padding: 6px 4px;">
                        <span class="pb-overview-tier" style="font-weight:700; color:var(--text-primary);">🎯 L6 最终可视数据行</span>
                        <span class="pb-matrix-status ${isPrivileged ? 'enabled' : (rlsOn ? (rRole === 'Unassigned' ? 'disabled' : 'warn') : 'enabled')}">${isPrivileged ? '✅ 完整全量行可见' : (rlsOn ? (rRole === 'Unassigned' ? '❌ 零数据阻断' : `🔒 仅限 ${rRole} 行`) : '✅ 全量数据可见')}</span>
                    </div>
                `;
            } else if (capsule === 'ols') {
                // OLS 列级与敏感字段安全
                const olsOn = s.olsEnabled;
                const masked = s.maskedFields || 'Salary, Margin';

                rowsHtml = `
                    <div class="pb-overview-row">
                        <span class="pb-overview-tier">🏢 L1 租户数据导出管控</span>
                        <span class="pb-matrix-status ${s.tenantAllowExport ? 'enabled' : 'disabled'}">${s.tenantAllowExport ? '✅ 允许导出' : '❌ 禁用导出'}</span>
                    </div>
                    <div class="pb-overview-row">
                        <span class="pb-overview-tier">⚡ L2 AI Copilot 字段索引</span>
                        <span class="pb-matrix-status ${s.capacityType === 'fabric_f64' ? 'enabled' : 'warn'}">${s.capacityType === 'fabric_f64' ? '⚡ 自动剔除掩蔽列' : '💼 标准索引'}</span>
                    </div>
                    <div class="pb-overview-row">
                        <span class="pb-overview-tier">📁 L3 敏感列豁免特权</span>
                        <span class="pb-matrix-status ${isPrivileged ? 'bypassed' : 'warn'}">${isPrivileged ? '⚡ 特权豁免可见' : '🔒 敏感列受控'}</span>
                    </div>
                    <div class="pb-overview-row">
                        <span class="pb-overview-tier">🗄️ L4 模型架构写回权限</span>
                        <span class="pb-matrix-status ${isPrivileged ? 'enabled' : 'disabled'}">${isPrivileged ? '✅ 架构读写编辑' : '👁️ 只读架构'}</span>
                    </div>
                    <div class="pb-overview-row">
                        <span class="pb-overview-tier">🛡️ L5 行列双重隔离生效</span>
                        <span class="pb-matrix-status ${s.rlsEnabled && olsOn ? 'warn' : 'enabled'}">${s.rlsEnabled && olsOn ? '🔒 行列双重安全' : '✅ 单层或无过滤'}</span>
                    </div>
                    <div class="pb-overview-row" style="background: rgba(99,102,241,0.06); border-radius: 4px; padding: 6px 4px;">
                        <span class="pb-overview-tier" style="font-weight:700; color:var(--text-primary);">🎯 L6 敏感列最终状态</span>
                        <span class="pb-matrix-status ${isPrivileged ? 'enabled' : (olsOn ? 'warn' : 'enabled')}">${isPrivileged ? '⚡ 敏感列全部可见' : (olsOn ? `🔒 掩蔽: ${masked}` : '✅ 全部列开放')}</span>
                    </div>
                `;
            } else if (capsule === 'modeling') {
                // 建模与构建
                const webMod = s.tenantAllowWebModeling;
                const canEditReport = isPrivileged && webMod;

                rowsHtml = `
                    <div class="pb-overview-row">
                        <span class="pb-overview-tier">🏢 L1 Web 端数据建模策略</span>
                        <span class="pb-matrix-status ${webMod ? 'enabled' : 'disabled'}">${webMod ? '✅ 策略放行' : '❌ 禁用网页端建模'}</span>
                    </div>
                    <div class="pb-overview-row">
                        <span class="pb-overview-tier">⚡ L2 XMLA 读写终结点</span>
                        <span class="pb-matrix-status ${s.capacityType === 'fabric_f64' ? 'enabled' : 'warn'}">${s.capacityType === 'fabric_f64' ? '⚡ 完整 XMLA 读写' : '💼 仅只读或受限'}</span>
                    </div>
                    <div class="pb-overview-row">
                        <span class="pb-overview-tier">📁 L3 资产增删改编辑权</span>
                        <span class="pb-matrix-status ${isPrivileged ? 'enabled' : 'disabled'}">${isPrivileged ? '✅ 允许架构变更' : '❌ 无编辑权限'}</span>
                    </div>
                    <div class="pb-overview-row">
                        <span class="pb-overview-tier">🗄️ L4 Build 衍生模型构建</span>
                        <span class="pb-matrix-status ${canBuild ? 'enabled' : 'disabled'}">${canBuild ? '⚡ 允许创建下游资产' : '❌ 仅只读访问'}</span>
                    </div>
                    <div class="pb-overview-row">
                        <span class="pb-overview-tier">🛡️ L5 跨表双向过滤支持</span>
                        <span class="pb-matrix-status enabled">✅ 关系引擎支持</span>
                    </div>
                    <div class="pb-overview-row" style="background: rgba(99,102,241,0.06); border-radius: 4px; padding: 6px 4px;">
                        <span class="pb-overview-tier" style="font-weight:700; color:var(--text-primary);">🎯 L6 报表在线设计与保存</span>
                        <span class="pb-matrix-status ${canEditReport ? 'enabled' : 'disabled'}">${canEditReport ? '✅ 允许在线设计保存' : '❌ 只读禁止设计编辑'}</span>
                    </div>
                `;
            } else {
                // 默认 all 全览
                rowsHtml = `
                    <div class="pb-overview-row">
                        <span class="pb-overview-tier">🏢 L1 租户策略</span>
                        <span class="pb-matrix-status ${s.tenantAllowExport ? 'enabled' : 'disabled'}">${s.tenantAllowExport ? '✅ 允许导出' : '❌ 禁用导出'}</span>
                    </div>
                    <div class="pb-overview-row">
                        <span class="pb-overview-tier">⚡ L2 计算容量</span>
                        <span class="pb-matrix-status ${s.capacityType === 'fabric_f64' ? 'enabled' : 'warn'}">${s.capacityType === 'fabric_f64' ? '⚡ Fabric F64' : '💼 Pro 共享'}</span>
                    </div>
                    <div class="pb-overview-row">
                        <span class="pb-overview-tier">📁 L3 工作区角色</span>
                        <span class="pb-matrix-status ${isAdmin ? 'enabled' : (isPrivileged ? 'bypassed' : (isViewer ? 'warn' : 'disabled'))}">${isAdmin ? '👑 Admin' : (isPrivileged ? `✏️ ${role}` : (isViewer ? '👁️ Viewer' : '🚫 无角色'))}</span>
                    </div>
                    <div class="pb-overview-row">
                        <span class="pb-overview-tier">🗄️ L4 语义模型</span>
                        <span class="pb-matrix-status ${canBuild ? 'enabled' : (canReadModel ? 'warn' : 'disabled')}">${canBuild ? '⚡ 构建+分析' : (canReadModel ? '👁️ 仅模型只读' : '❌ 拒绝访问')}</span>
                    </div>
                    <div class="pb-overview-row">
                        <span class="pb-overview-tier">🛡️ L5 行级安全 (RLS)</span>
                        <span class="pb-matrix-status ${isPrivileged ? 'bypassed' : (s.rlsEnabled ? (s.rlsRoleAssigned === 'Unassigned' ? 'disabled' : 'warn') : 'enabled')}">${isPrivileged ? '⚡ 特权穿透' : (s.rlsEnabled ? (s.rlsRoleAssigned === 'Unassigned' ? '❌ 阻断' : `🔒 ${s.rlsRoleAssigned}`) : '✅ 全量数据')}</span>
                    </div>
                    <div class="pb-overview-row">
                        <span class="pb-overview-tier">🔒 L6 列级与资产 (OLS)</span>
                        <span class="pb-matrix-status ${isPrivileged ? 'bypassed' : (s.olsEnabled ? 'warn' : 'enabled')}">${isPrivileged ? '⚡ 敏感列可见' : (s.olsEnabled ? `🔒 掩蔽: ${s.maskedFields}` : '✅ 资产全开放')}</span>
                    </div>
                `;
            }

            container.innerHTML = rowsHtml;

            // 同步激活当前胶囊按钮样式
            const capsuleContainer = document.getElementById('pb-feature-capsules');
            if (capsuleContainer) {
                const btns = capsuleContainer.querySelectorAll('.pb-capsule-btn');
                btns.forEach(b => {
                    if (b.getAttribute('data-capsule') === capsule) {
                        b.classList.add('active');
                    } else {
                        b.classList.remove('active');
                    }
                });
            }

            // 同步渲染主工作区的 6 大层级横向全景流转矩阵
            this.renderMatrix();
        }

        renderMatrix() {
            const matrixEl = document.getElementById('pb-matrix-container');
            if (!matrixEl) return;

            const s = this.currentState;
            const model = MODEL_DEFINITIONS[this.currentModelKey] || MODEL_DEFINITIONS['model_sales'];
            const wsName = this.currentWorkspaceName || (model ? model.workspaceName : 'Production Analytics');
            const overrides = this.whatIfOverrides || {};
            // 原生源头基础配置 (支持 What-If 覆盖)
            const getRaw = (k, def) => (overrides[k] !== undefined ? overrides[k] : (s[k] !== undefined ? s[k] : def));

            // L1 租户全局基础配置
            const isTenantAdmin = getRaw('isTenantAdmin', s.isTenantAdmin || false);
            const tenantAllowExport = getRaw('tenantAllowExport', true);
            const tenantAllowWebModeling = getRaw('tenantAllowWebModeling', true);
            const shareExternal = getRaw('shareExternal', !s.isGuestUser);
            const isGuestUser = getRaw('isGuestUser', false);
            const xmlaEndpoint = getRaw('xmlaEndpoint', true);
            const isInStrictMode = getRaw('isInStrictMode', false);

            // L2 容量基础配置
            const capacityType = getRaw('capacityType', 'fabric_f64');
            const isFabric = capacityType === 'fabric_f64';
            const largeDataset = getRaw('largeDataset', isFabric);
            const autoScale = getRaw('autoScale', isFabric);
            const queryRate = getRaw('queryRate', isFabric ? '120/min' : '60/min');
            const aiCopilot = getRaw('aiCopilot', isFabric);
            const directLake = getRaw('directLake', isFabric);

            // L3 工作区角色与凭据
            const role = getRaw('workspaceRole', s.workspaceRole || 'Viewer');
            const isAdmin = role === 'Admin';
            const isMember = role === 'Member';
            const isContributor = role === 'Contributor';
            const isViewer = role === 'Viewer';
            const isPrivileged = ['Admin', 'Member', 'Contributor'].includes(role);
            const hasConnRaw = getRaw('hasAccessToAllDataConnections', s.hasAccessToAllDataConnections !== undefined ? s.hasAccessToAllDataConnections : true);

            // L4 语义模型直接权限基础配置
            const sharePermission = getRaw('sharePermission', s.sharePermission || 'Read');
            const canBuild = isPrivileged || (sharePermission && String(sharePermission).includes('Build'));
            const canReadModel = isPrivileged || isViewer || (sharePermission && sharePermission !== 'None');
            const gatewayOnline = getRaw('gatewayOnline', true);

            // L5 行级安全基础配置
            const rlsEnabled = getRaw('rlsEnabled', false);
            const activeRlsRole = getRaw('rlsRoleAssigned', 'Region_East');
            const daxIdentityType = getRaw('daxIdentityType', isGuestUser ? 'Guest_EXT_UPN' : 'Internal_UPN');
            const crossFiltering = getRaw('crossFiltering', true);

            // L6 列级安全基础配置
            const olsEnabled = getRaw('olsEnabled', false);

            // 派生权限动态计算调度器：若用户显式通过 What-If 覆盖了该项则尊重覆盖，否则执行纯函数级联推导，彻底杜绝陈旧状态污染！
            const getDerived = (field, deriveFn) => (overrides[field] !== undefined ? overrides[field] : deriveFn());

            // 动态计算级联波及影响集合
            const impacts = this.calculateWhatIfImpacts();
            const overrideCount = Object.keys(overrides).length;

            // 更新顶部主体徽章状态
            const topBadge = document.getElementById('pb-top-simulated-badge');
            if (topBadge) {
                const preset = USER_PRESETS[this.activePresetKey];
                if (preset && this.activePresetKey !== 'none') {
                    topBadge.textContent = `当前主体: ${preset.name} (${preset.roleTag})`;
                    topBadge.style.background = 'rgba(99, 102, 241, 0.15)';
                    topBadge.style.color = '#818cf8';
                } else {
                    topBadge.textContent = '当前主体: 通用基准 (未模拟特定用户)';
                    topBadge.style.background = 'rgba(148, 163, 184, 0.15)';
                    topBadge.style.color = '#94a3b8';
                }
            }

            // 流转矩阵保持完全纯粹极简，不显示任何顶部横幅
            let bannerHtml = '';

            // 辅助函数：生成设置行 HTML (支持 What-If 开关与全宽联动受影响标签)
            const renderRow = (propName, propKey, statusClass, statusText, whatIfField = null, options = null) => {
                const isOverridden = whatIfField && (overrides[whatIfField] !== undefined);
                const isImpacted = impacts[propKey] !== undefined;
                const rowClass = `pb-col-row ${isImpacted ? 'impacted' : ''}`;
                
                let actionBtn = '';
                if (whatIfField) {
                    if (Array.isArray(options)) {
                        // 循环切换选项 (如工作区角色)
                        const currentIdx = options.indexOf(getRaw(whatIfField));
                        const nextVal = options[(currentIdx + 1) % options.length];
                        actionBtn = `<button class="pb-whatif-toggle-btn" onclick="window.PermissionBlueprint.toggleWhatIfSetting('${whatIfField}', '${nextVal}')" title="What-If 切换为: ${nextVal}">切换</button>`;
                    } else {
                        // 布尔切换
                        actionBtn = `<button class="pb-whatif-toggle-btn" onclick="window.PermissionBlueprint.toggleWhatIfSetting('${whatIfField}')" title="What-If 切换开关">切换</button>`;
                    }
                }

                let impactBanner = '';
                if (isImpacted) {
                    impactBanner = `
                        <div class="pb-impact-banner" title="${impacts[propKey].reason}">
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" style="flex-shrink: 0; margin-top: 1px;"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon></svg>
                            <span>⚡ 受 <strong>${impacts[propKey].from}</strong> 联动: ${impacts[propKey].reason}</span>
                        </div>
                    `;
                }

                return `
                    <div class="${rowClass}" data-prop-key="${propKey}" data-whatif-field="${whatIfField || ''}">
                        <div class="pb-col-row-title-area">
                            <span class="pb-col-prop-name" title="${propName}">${propName}</span>
                            <span class="pb-col-prop-key">${propKey} ${isOverridden ? '<span class="pb-overridden-badge">What-If 覆盖</span>' : ''}</span>
                        </div>
                        <div class="pb-col-row-toolbar">
                            <span class="pb-matrix-status ${statusClass}">${statusText}</span>
                            <div class="pb-col-actions">
                                ${actionBtn}
                            </div>
                        </div>
                        ${impactBanner}
                    </div>
                `;
            };

            // Tier 1: 租户策略
            const t1Status = tenantAllowExport ? 'enabled' : 'disabled';
            const t1StatusText = tenantAllowExport ? '✅ 策略放行' : '❌ 策略收紧';
            const col1Html = `
                <div class="pb-tier-col" data-tier="1">
                    <div class="pb-col-header">
                        <div class="pb-col-title-row">
                            <h4 class="pb-col-title">🏢 L1 租户全局策略</h4>
                            <span class="pb-matrix-status ${t1Status}">${t1StatusText}</span>
                        </div>
                        <div class="pb-col-sub" title="租户管理员全局功能管控">租户全局策略池</div>
                    </div>
                    <div class="pb-col-body">
                        ${renderRow('允许导出数据到 Excel/CSV', 'exportToExcel', tenantAllowExport ? 'enabled' : 'disabled', tenantAllowExport ? '✅ 启用' : '❌ 禁用', 'tenantAllowExport')}
                        ${renderRow('Web 浏览器端数据建模', 'webModeling', tenantAllowWebModeling ? 'enabled' : 'disabled', tenantAllowWebModeling ? '✅ 启用' : '❌ 禁用', 'tenantAllowWebModeling')}
                        ${renderRow('允许组织外部共享内容', 'shareExternal', shareExternal ? 'enabled' : 'disabled', shareExternal ? '✅ 启用' : '❌ 禁用', 'shareExternal')}
                        ${renderRow('Azure AD B2B 外部访客', 'guestAccess', isGuestUser ? 'warn' : 'enabled', isGuestUser ? '⚠️ 外部访客' : '✅ 内部成员', 'isGuestUser')}
                        ${renderRow('XMLA 终结点读写支持', 'xmlaEndpoint', xmlaEndpoint ? 'enabled' : 'disabled', xmlaEndpoint ? '✅ 启用' : '❌ 禁用', 'xmlaEndpoint')}
                        ${renderRow('GAC 细粒度隔离策略', 'gacPolicy', isInStrictMode ? 'enabled' : 'warn', isInStrictMode ? '🛡️ 严格门禁' : '⚠️ 宽松模式', 'isInStrictMode')}
                        ${renderRow('EMBED FOR EXTERNAL', 'embedExternal', 'enabled', '✅ 启用', 'embedExternal')}
                        ${renderRow('CERTIFICATION (认证权限)', 'certification', isTenantAdmin ? 'enabled' : 'disabled', isTenantAdmin ? '✅ 启用' : '❌ 禁用', 'isTenantAdmin')}
                    </div>
                </div>
            `;

            // Tier 2: 容量计算资源
            const t2Status = isFabric ? 'enabled' : 'warn';
            const t2StatusText = isFabric ? '⚡ F64 充足' : '💼 Pro 共享';
            const col2Html = `
                <div class="pb-tier-col" data-tier="2">
                    <div class="pb-col-header">
                        <div class="pb-col-title-row">
                            <h4 class="pb-col-title">⚡ L2 容量计算资源</h4>
                            <span class="pb-matrix-status ${t2Status}">${t2StatusText}</span>
                        </div>
                        <div class="pb-col-sub" title="Fabric / Power BI 容量承载">底层硬件算力池</div>
                    </div>
                    <div class="pb-col-body">
                        ${renderRow('绑定的容量规格', 'capacitySku', isFabric ? 'enabled' : 'warn', isFabric ? '⚡ Fabric F64' : '💼 Pro 共享', 'capacityType', ['fabric_f64', 'pro_shared'])}
                        ${renderRow('大数据集存储格式', 'largeDataset', largeDataset ? 'enabled' : 'disabled', largeDataset ? '✅ 启用' : '❌ 禁用', 'largeDataset')}
                        ${renderRow('弹性自动缩放能力', 'autoScale', autoScale ? 'enabled' : 'disabled', autoScale ? '✅ 启用' : '❌ 禁用', 'autoScale')}
                        ${renderRow('DirectQuery 刷新速率', 'queryRate', queryRate === '120/min' ? 'enabled' : 'warn', queryRate === '120/min' ? '✅ 120次/分' : '⚠️ 60次/分', 'queryRate', ['120/min', '60/min'])}
                        ${renderRow('Copilot 与 AI 增强', 'aiCopilot', aiCopilot ? 'enabled' : 'disabled', aiCopilot ? '✅ 启用' : '❌ 禁用', 'aiCopilot')}
                        ${renderRow('Direct Lake 极速湖仓', 'directLake', directLake ? 'enabled' : 'disabled', directLake ? '✅ 启用' : '❌ 禁用', 'directLake')}
                    </div>
                </div>
            `;

            // Tier 3: 工作区治理角色
            const manageMembers = getDerived('manageMembers', () => isAdmin);
            const editDelete = getDerived('editDelete', () => isPrivileged);
            const publishApp = getDerived('publishApp', () => isAdmin || isMember);
            const gatewayAdmin = getDerived('gatewayAdmin', () => isAdmin);
            
            // L3 GAC 网关数据连接通道：严格模式下非特权用户受到严格审查隔离
            const gacConnPass = getDerived('hasAccessToAllDataConnections', () => {
                if (isInStrictMode && !isPrivileged) return false;
                return hasConnRaw;
            });
            let gacConnStatus = 'enabled';
            let gacConnText = '✅ 共享直连';
            if (isAdmin) {
                gacConnStatus = 'enabled';
                gacConnText = '✅ 全权直连';
            } else if (isInStrictMode && !isPrivileged) {
                gacConnStatus = 'disabled';
                gacConnText = '❌ 严格门禁隔离';
            } else if (!hasConnRaw) {
                gacConnStatus = 'disabled';
                gacConnText = '❌ 凭据隔离';
            } else {
                gacConnStatus = isPrivileged ? 'enabled' : 'warn';
                gacConnText = isInStrictMode ? '✅ 严格特许直连' : '✅ 共享直连';
            }

            const t3Status = isAdmin ? 'enabled' : (isPrivileged ? 'bypassed' : (isViewer ? 'warn' : 'disabled'));
            const t3StatusText = isAdmin ? '👑 完全掌控' : (isPrivileged ? '✏️ 协同编辑' : (isViewer ? '👁️ 只读查看' : '🚫 无权限'));
            const col3Html = `
                <div class="pb-tier-col" data-tier="3">
                    <div class="pb-col-header">
                        <div class="pb-col-title-row">
                            <h4 class="pb-col-title">📁 L3 工作区治理角色</h4>
                            <span class="pb-matrix-status ${t3Status}">${t3StatusText}</span>
                        </div>
                        <div class="pb-col-sub" title="${wsName}">${wsName}</div>
                    </div>
                    <div class="pb-col-body">
                        ${renderRow('当前分配的工作区角色', 'workspaceRole', role === 'None' ? 'disabled' : 'enabled', role === 'None' ? '❌ 无角色' : `✅ ${role}`, 'workspaceRole', ['Admin', 'Member', 'Contributor', 'Viewer', 'None'])}
                        ${renderRow('成员管理与权限授予', 'manageMembers', manageMembers ? 'enabled' : (isMember ? 'warn' : 'disabled'), manageMembers ? '✅ 允许' : (isMember ? '⚠️ 仅查看者' : '❌ 禁用'), 'manageMembers')}
                        ${renderRow('工作区资产增删改', 'editDelete', editDelete ? 'enabled' : 'disabled', editDelete ? '✅ 允许' : '❌ 禁用', 'editDelete')}
                        ${renderRow('发布与更新组织应用', 'publishApp', publishApp ? 'enabled' : (isContributor ? 'warn' : 'disabled'), publishApp ? '✅ 允许' : (isContributor ? '⚠️ 需特许' : '❌ 禁用'), 'publishApp')}
                        ${renderRow('企业网关与凭据托管', 'gatewayAdmin', gatewayAdmin ? 'enabled' : 'disabled', gatewayAdmin ? '✅ 允许' : '❌ 禁用', 'gatewayAdmin')}
                        ${renderRow('GAC 网关数据连接通道', 'gacConnection', gacConnStatus, gacConnText, 'hasAccessToAllDataConnections')}
                        ${renderRow('DELETE WORKSPACE', 'deleteWorkspace', isAdmin ? 'enabled' : 'disabled', isAdmin ? '✅ 启用' : '❌ 禁用', 'deleteWorkspace')}
                        ${renderRow('LINEAGE VIEW', 'lineageView', isPrivileged ? 'enabled' : 'warn', isPrivileged ? '✅ 启用' : '⚠️ 部分视图', 'lineageView')}
                    </div>
                </div>
            `;

            // Tier 4: 语义模型直接权限
            const writePermission = getDerived('writePermission', () => isPrivileged);
            const resharePermission = getDerived('resharePermission', () => isAdmin || isMember || (sharePermission && String(sharePermission).includes('Reshare')));
            
            // L4 模型架构写回：受工作区编辑特权与 L1 XMLA 终结点双重管控
            let writeStatus = writePermission ? 'enabled' : 'disabled';
            let writeText = writePermission ? '✅ 启用' : '❌ 禁用';
            if (writePermission && !xmlaEndpoint) {
                writeStatus = 'warn';
                writeText = '⚠️ 阻断外部写回';
            }

            // L4 向第三方重新共享：受角色及 L1 组织外部共享双重管控
            let reshareStatus = resharePermission ? 'enabled' : 'disabled';
            let reshareText = resharePermission ? '✅ 启用' : '❌ 禁用';
            if (resharePermission && !shareExternal) {
                reshareStatus = 'warn';
                reshareText = '⚠️ 仅限组织内部';
            }

            // L4 数据源直连鉴权：受网关在线、L1 GAC 严格模式与 L3 凭据共同决定
            const isDsAuthOk = getDerived('dataSourceAuth', () => {
                if (!gatewayOnline) return false;
                if (isInStrictMode && !isPrivileged) return false;
                return hasConnRaw;
            });
            let dsAuthStatus = isDsAuthOk ? 'enabled' : 'disabled';
            let dsAuthText = '✅ 凭据已鉴权';
            if (!gatewayOnline) {
                dsAuthStatus = 'disabled';
                dsAuthText = '❌ 网关离线';
            } else if (isInStrictMode && !isPrivileged) {
                dsAuthStatus = 'disabled';
                dsAuthText = '❌ GAC严格门禁阻断';
            } else if (!hasConnRaw) {
                dsAuthStatus = 'warn';
                dsAuthText = '⚠️ 凭据受限放行';
            }

            const t4Status = canBuild ? 'enabled' : (canReadModel ? 'warn' : 'disabled');
            const t4StatusText = canBuild ? '⚡ 构建+衍生' : (canReadModel ? '👁️ 仅只读' : '🚫 拒绝访问');
            const col4Html = `
                <div class="pb-tier-col" data-tier="4">
                    <div class="pb-col-header">
                        <div class="pb-col-title-row">
                            <h4 class="pb-col-title">🗄️ L4 语义模型权限</h4>
                            <span class="pb-matrix-status ${t4Status}">${t4StatusText}</span>
                        </div>
                        <div class="pb-col-sub" title="${model.name}">${model.name}</div>
                    </div>
                    <div class="pb-col-body">
                        ${renderRow('模型只读权限 (Read)', 'readPermission', canReadModel ? 'enabled' : 'disabled', canReadModel ? '✅ 启用' : '❌ 禁用', 'canReadModel')}
                        ${renderRow('构建衍生权限 (Build)', 'buildPermission', canBuild ? 'enabled' : 'disabled', canBuild ? '✅ 启用' : '❌ 禁用', 'sharePermission', ['ReadBuild', 'Read', 'None'])}
                        ${renderRow('模型写回与架构重命名', 'writePermission', writeStatus, writeText, 'writePermission')}
                        ${renderRow('向第三方重新共享 (Reshare)', 'resharePermission', reshareStatus, reshareText, 'resharePermission')}
                        ${renderRow('数据源直连凭据鉴权', 'dataSourceAuth', dsAuthStatus, dsAuthText, 'dataSourceAuth')}
                        ${renderRow('网关连通性状态', 'gatewayConnectivity', gatewayOnline ? 'enabled' : 'disabled', gatewayOnline ? '✅ 在线' : '❌ 离线', 'gatewayOnline')}
                    </div>
                </div>
            `;

            // Tier 5: 行级数据安全 (RLS)
            const unassignedDenied = getDerived('unassignedDenied', () => !isPrivileged && activeRlsRole === 'Unassigned');
            
            // L5 GAC Mashup 数据门禁：特权穿透；严格模式下非特权强制拦截
            const isMashupPass = getDerived('gacMashupGate', () => {
                if (isPrivileged) return true;
                if (isInStrictMode) return false;
                return hasConnRaw && isDsAuthOk;
            });
            let mashupStatus = isMashupPass ? 'enabled' : 'disabled';
            let mashupText = '✅ 门禁放行';
            if (isPrivileged) {
                mashupStatus = 'bypassed';
                mashupText = '⚡ 特权穿透';
            } else if (isInStrictMode) {
                mashupStatus = 'disabled';
                mashupText = '❌ GAC细粒度门禁拦截';
            } else if (!hasConnRaw) {
                mashupStatus = 'warn';
                mashupText = '⚠️ 宽松放行';
            }

            let t5Status = 'enabled';
            let t5StatusText = '✅ 全量数据';
            if (isPrivileged) {
                t5Status = 'bypassed';
                t5StatusText = '⚡ 特权穿透';
            } else if (rlsEnabled) {
                if (activeRlsRole === 'Unassigned') {
                    t5Status = 'disabled';
                    t5StatusText = '❌ 403 阻断';
                } else {
                    t5Status = 'warn';
                    t5StatusText = '🔒 行过滤生效';
                }
            }
            const col5Html = `
                <div class="pb-tier-col" data-tier="5">
                    <div class="pb-col-header">
                        <div class="pb-col-title-row">
                            <h4 class="pb-col-title">🛡️ L5 行级数据安全</h4>
                            <span class="pb-matrix-status ${t5Status}">${t5StatusText}</span>
                        </div>
                        <div class="pb-col-sub" title="Row-Level Security 动态过滤">DAX 行过滤隔离安全层</div>
                    </div>
                    <div class="pb-col-body">
                        ${renderRow('RLS 安全规则总开关', 'rlsSwitch', rlsEnabled ? 'enabled' : 'disabled', rlsEnabled ? '✅ 启用' : '❌ 禁用', 'rlsEnabled')}
                        ${renderRow('生效安全过滤角色', 'activeRlsRole', isPrivileged ? 'bypassed' : (rlsEnabled ? (activeRlsRole === 'Unassigned' ? 'disabled' : 'warn') : 'enabled'), isPrivileged ? '⚡ 特权穿透' : (rlsEnabled ? (activeRlsRole === 'Unassigned' ? '❌ 未分配' : `🔒 ${activeRlsRole}`) : '✅ 全量可见'), 'rlsRoleAssigned', ['Region_East', 'Region_North', 'Store_Managers', 'Unassigned'])}
                        ${renderRow('动态安全主体 (DAX UPN)', 'daxIdentity', isPrivileged ? 'enabled' : (daxIdentityType === 'Guest_EXT_UPN' ? 'warn' : 'enabled'), isPrivileged ? '✅ 免校验' : (daxIdentityType === 'Guest_EXT_UPN' ? '⚠️ 外部访客' : '✅ 内部主体'), 'daxIdentityType', ['Internal_UPN', 'Guest_EXT_UPN'])}
                        ${renderRow('跨表双向安全过滤', 'crossFiltering', crossFiltering ? 'enabled' : 'disabled', crossFiltering ? '✅ 启用' : '❌ 禁用', 'crossFiltering')}
                        ${renderRow('未授权行隔离拦截', 'unassignedDenied', (!isPrivileged && unassignedDenied) ? 'disabled' : 'enabled', (!isPrivileged && unassignedDenied) ? '❌ 阻断' : '✅ 放行', 'unassignedDenied')}
                        ${renderRow('GAC Mashup 数据门禁', 'gacMashupGate', mashupStatus, mashupText, 'gacMashupGate')}
                    </div>
                </div>
            `;

            // Tier 6: 列级安全与导出资产
            const maskedFieldsActive = getDerived('maskedFieldsActive', () => olsEnabled && !isPrivileged);
            const canReadModelEff = overrides['canReadModel'] !== undefined ? overrides['canReadModel'] : canReadModel;
            const isRlsBlocked = !isPrivileged && rlsEnabled && activeRlsRole === 'Unassigned';
            const isReportViewAllowed = canReadModelEff && !isRlsBlocked;
            const reportView = getDerived('reportView', () => isReportViewAllowed);
            let reportViewStatus = reportView ? 'enabled' : 'disabled';
            let reportViewText = reportView ? '✅ 启用' : '❌ 禁用';
            if (isRlsBlocked) {
                reportViewStatus = 'disabled';
                reportViewText = '❌ 403 角色未分配';
            } else if (!canReadModelEff) {
                reportViewStatus = 'disabled';
                reportViewText = '❌ 403 无模型权限';
            }
            
            // L6 视觉对象设计编辑：受租户策略与特权双重约束
            const isReportEditPass = getDerived('reportEdit', () => isPrivileged && tenantAllowWebModeling);
            let reportEditStatus = isReportEditPass ? 'enabled' : 'disabled';
            let reportEditText = '✅ 允许编辑';
            if (!tenantAllowWebModeling) {
                reportEditStatus = 'disabled';
                reportEditText = '❌ 租户禁止Web端在线编辑';
            } else if (!isPrivileged) {
                reportEditStatus = 'disabled';
                reportEditText = '❌ 需协同编辑特权';
            }

            // L6 导出底层明细数据：必须同时拥有 Build 权限且 L1 租户策略放行
            const isExportPass = getDerived('exportUnderlying', () => canBuild && tenantAllowExport);
            let exportStatus = isExportPass ? 'enabled' : 'disabled';
            let exportText = '✅ 允许导出';
            if (!tenantAllowExport) {
                exportStatus = 'disabled';
                exportText = '❌ 租户策略收紧阻断';
            } else if (!canBuild) {
                exportStatus = 'disabled';
                exportText = '❌ 缺少Build权限';
            }

            // L6 Power Query 网页端编辑：多层联动推导
            const isPqPass = getDerived('powerQueryEdit', () => isPrivileged && tenantAllowWebModeling && gatewayOnline && (!isInStrictMode || hasConnRaw));
            let pqStatus = isPqPass ? 'enabled' : 'disabled';
            let pqText = '✅ 允许编辑';
            if (isInStrictMode && !isPrivileged) {
                pqStatus = 'disabled';
                pqText = '❌ GAC严格门禁阻断';
            } else if (!tenantAllowWebModeling) {
                pqStatus = 'disabled';
                pqText = '❌ 租户禁止Web建模';
            } else if (!gatewayOnline) {
                pqStatus = 'disabled';
                pqText = '❌ 网关离线不可达';
            } else if (!isPrivileged) {
                pqStatus = 'disabled';
                pqText = '❌ 需协同编辑特权';
            }

            let t6Status = 'enabled';
            let t6StatusText = '✅ 资产全开放';
            if (isPrivileged) {
                t6Status = 'bypassed';
                t6StatusText = '⚡ 特权全开放';
            } else if (olsEnabled) {
                t6Status = 'warn';
                t6StatusText = '🔒 敏感列掩蔽';
            }
            const col6Html = `
                <div class="pb-tier-col" data-tier="6">
                    <div class="pb-col-header">
                        <div class="pb-col-title-row">
                            <h4 class="pb-col-title">🔒 L6 列级与资产安全</h4>
                            <span class="pb-matrix-status ${t6Status}">${t6StatusText}</span>
                        </div>
                        <div class="pb-col-sub" title="Object-Level Security &amp; 导出管控">报表视觉与敏感列管控</div>
                    </div>
                    <div class="pb-col-body">
                        ${renderRow('OLS 敏感列安全性', 'olsSwitch', olsEnabled ? 'enabled' : 'disabled', olsEnabled ? '✅ 启用' : '❌ 禁用', 'olsEnabled')}
                        ${renderRow('敏感字段掩蔽状态', 'maskedStatus', isPrivileged ? 'bypassed' : (maskedFieldsActive ? 'warn' : 'enabled'), isPrivileged ? '⚡ 特权穿透' : (maskedFieldsActive ? `🔒 掩蔽: ${s.maskedFields}` : '✅ 全部列开放'), 'maskedFieldsActive')}
                        ${renderRow('报表在线查看 (View)', 'reportView', reportViewStatus, reportViewText, 'reportView')}
                        ${renderRow('视觉对象设计编辑 (Edit)', 'reportEdit', reportEditStatus, reportEditText, 'reportEdit')}
                        ${renderRow('导出底层明细数据', 'exportUnderlying', exportStatus, exportText, 'exportUnderlying')}
                        ${renderRow('Power Query 网页端编辑', 'powerQueryEdit', pqStatus, pqText, 'powerQueryEdit')}
                    </div>
                </div>
            `;

            // Tier 7: Connection 连接层
            const isConnOwner = getDerived('connOwner', () => isAdmin);
            const isConnUser = getDerived('connUser', () => gacConnPass || isPrivileged);
            const isConnShare = getDerived('connShare', () => isAdmin || isMember);
            const isSchedRefresh = getDerived('schedRefresh', () => isPrivileged);

            let t7Status = isConnOwner ? 'enabled' : (isConnUser ? 'warn' : 'disabled');
            let t7StatusText = isConnOwner ? '✅ 完全控制' : (isConnUser ? '⚠️ 仅使用' : '❌ 无权限');
            const col7Html = `
                <div class="pb-tier-col" data-tier="7">
                    <div class="pb-col-header">
                        <div class="pb-col-title-row">
                            <h4 class="pb-col-title">🔌 L7 连接与凭据</h4>
                            <span class="pb-matrix-status ${t7Status}">${t7StatusText}</span>
                        </div>
                        <div class="pb-col-sub" title="数据源连接鉴权与网关通道">数据源连接鉴权与网关通道</div>
                    </div>
                    <div class="pb-col-body">
                        ${renderRow('连接所有者/管理员', 'connOwner', isConnOwner ? 'enabled' : 'disabled', isConnOwner ? '✅ 启用' : '❌ 禁用', 'connOwner')}
                        ${renderRow('连接用户凭据', 'connUser', isConnUser ? 'enabled' : 'disabled', isConnUser ? '✅ 启用' : '❌ 禁用', 'connUser')}
                        ${renderRow('连接共享', 'connShare', isConnShare ? 'enabled' : 'disabled', isConnShare ? '✅ 启用' : '❌ 禁用', 'connShare')}
                        ${renderRow('数据源直连鉴权', 'dataSourceAuth7', dsAuthStatus, dsAuthText, 'dataSourceAuth7')}
                        ${renderRow('SSO 身份委派', 'ssoAuth', 'enabled', '✅ 启用', 'ssoAuth')}
                        ${renderRow('计划刷新调度', 'schedRefresh', isSchedRefresh ? 'enabled' : 'disabled', isSchedRefresh ? '✅ 启用' : '❌ 禁用', 'schedRefresh')}
                    </div>
                </div>
            `;

            // Tier 8: 部署管道
            const isPipelineRoleAdmin = getDerived('pipelineRoleAdmin', () => isAdmin);
            const isStageDeploy = getDerived('stageDeploy', () => isAdmin);
            const isSchemaDiff = getDerived('schemaDiff', () => isAdmin);
            const isConfigRules = getDerived('configRules', () => isAdmin);
            const isManagePipeline = getDerived('managePipeline', () => isAdmin);
            const isBackwardDeploy = getDerived('backwardDeploy', () => isAdmin);

            let t8Status = isPipelineRoleAdmin ? 'enabled' : 'warn';
            let t8StatusText = isPipelineRoleAdmin ? '✅ 管理员' : '⚠️ 部署者';
            const col8Html = `
                <div class="pb-tier-col" data-tier="8">
                    <div class="pb-col-header">
                        <div class="pb-col-title-row">
                            <h4 class="pb-col-title">🚀 L8 部署管道</h4>
                            <span class="pb-matrix-status ${t8Status}">${t8StatusText}</span>
                        </div>
                        <div class="pb-col-sub" title="ALM 生命周期管理">ALM 生命周期管理</div>
                    </div>
                    <div class="pb-col-body">
                        ${renderRow('管道角色', 'pipelineRole', 'enabled', isPipelineRoleAdmin ? '✅ Admin' : '✅ Deployer', 'pipelineRole')}
                        ${renderRow('阶段流转部署', 'stageDeploy', isStageDeploy ? 'enabled' : 'disabled', isStageDeploy ? '✅ 启用' : '❌ 禁用', 'stageDeploy')}
                        ${renderRow('架构差异比对', 'schemaDiff', isSchemaDiff ? 'enabled' : 'disabled', isSchemaDiff ? '✅ 启用' : '❌ 禁用', 'schemaDiff')}
                        ${renderRow('部署规则配置', 'configRules', isConfigRules ? 'enabled' : 'disabled', isConfigRules ? '✅ 启用' : '❌ 禁用', 'configRules')}
                        ${renderRow('管道管理', 'managePipeline', isManagePipeline ? 'enabled' : 'disabled', isManagePipeline ? '✅ 启用' : '❌ 禁用', 'managePipeline')}
                        ${renderRow('反向部署', 'backwardDeploy', isBackwardDeploy ? 'enabled' : 'disabled', isBackwardDeploy ? '✅ 启用' : '❌ 禁用', 'backwardDeploy')}
                    </div>
                </div>
            `;

            matrixEl.innerHTML = bannerHtml + col1Html + col2Html + col3Html + col4Html + col5Html + col6Html + col7Html + col8Html;

            // 渲染 What-If 动态影响指向线（DOM 更新后需 rAF 等待布局稳定）
            requestAnimationFrame(() => this._renderImpactArrows(impacts));
        }

        // 渲染 6 层流转矩阵内部的 What-If 跨层级动态流向指向线 (带动态流光、箭头与流向药丸标签)
        _renderImpactArrows(impacts) {
            this._lastImpacts = impacts;
            const matrixEl = document.getElementById('pb-matrix-container');
            if (!matrixEl || matrixEl.style.display === 'none') return;

            // 确保或创建用于矩阵连线的 SVG 画布
            let svgEl = document.getElementById('pb-matrix-flow-svg');
            if (!svgEl) {
                svgEl = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
                svgEl.id = 'pb-matrix-flow-svg';
                svgEl.setAttribute('class', 'pb-matrix-flow-svg');
                matrixEl.appendChild(svgEl);

                // 绑定全方位几何变动监听，确保全屏切换、Zen Mode、滚动与窗口重排时连线 100% 实时紧随卡片自适应吸附重绘
                if (!this._matrixScrollBound) {
                    this._matrixScrollBound = true;
                    const triggerRedraw = () => {
                        if (this.activeMainTab === 'matrix' && this._lastImpacts) {
                            requestAnimationFrame(() => this._renderImpactArrows(this._lastImpacts));
                        }
                    };

                    matrixEl.addEventListener('scroll', triggerRedraw, { passive: true });
                    window.addEventListener('resize', triggerRedraw, { passive: true });
                    window.addEventListener('zenmodechange', () => {
                        // Zen Mode 展开/收回时多帧高频自适应对齐
                        let start = performance.now();
                        const animateRedraw = () => {
                            triggerRedraw();
                            if (performance.now() - start < 450) {
                                requestAnimationFrame(animateRedraw);
                            }
                        };
                        requestAnimationFrame(animateRedraw);
                    }, { passive: true });

                    document.addEventListener('fullscreenchange', triggerRedraw, { passive: true });
                    document.addEventListener('webkitfullscreenchange', triggerRedraw, { passive: true });

                    // 现代 ResizeObserver：监听容器尺寸变化
                    if (window.ResizeObserver && !this._matrixResizeObserver) {
                        this._matrixResizeObserver = new ResizeObserver(() => triggerRedraw());
                        this._matrixResizeObserver.observe(matrixEl);
                    }
                }
            }

            const impactEntries = Object.entries(impacts || {});
            const hasOverrides = this.whatIfOverrides && Object.keys(this.whatIfOverrides).length > 0;

            if (!hasOverrides || impactEntries.length === 0) {
                svgEl.innerHTML = '';
                svgEl.style.display = 'none';
                return;
            }

            svgEl.style.display = 'block';
            svgEl.style.width = matrixEl.scrollWidth + 'px';
            svgEl.style.height = matrixEl.scrollHeight + 'px';

            const matrixRect = matrixEl.getBoundingClientRect();
            const scrollLeft = matrixEl.scrollLeft;
            const scrollTop = matrixEl.scrollTop;

            let pathsHtml = '';
            let dotsHtml = '';
            let pillsHtml = '';

            for (const [propKey, info] of impactEntries) {
                // 查找目标受影响行
                const targetRow = matrixEl.querySelector(`.pb-col-row[data-prop-key="${propKey}"]`);
                if (!targetRow) continue;

                // 查找源元素：优先匹配源字段行，若无则取源层级头部
                let sourceRow = info.fromField ? matrixEl.querySelector(`.pb-col-row[data-whatif-field="${info.fromField}"]`) : null;
                if (!sourceRow && info.fromTier) {
                    sourceRow = matrixEl.querySelector(`.pb-tier-col[data-tier="${info.fromTier}"] .pb-col-header`);
                }
                if (!sourceRow) continue;

                const srcRect = sourceRow.getBoundingClientRect();
                const tgtRect = targetRow.getBoundingClientRect();

                // 判断源与目标的左右相对位置
                const isLeftToRight = srcRect.left < tgtRect.left;

                // 源点坐标 (位于源元素边缘，向外延伸 4px 避免遮挡行内内容)
                const x1 = (isLeftToRight ? (srcRect.right + 4) : (srcRect.left - 4)) - matrixRect.left + scrollLeft;
                const y1 = (srcRect.top + srcRect.bottom) / 2 - matrixRect.top + scrollTop;

                // 目标点坐标 (位于目标元素边缘，向外延伸 4px)
                const x2 = (isLeftToRight ? (tgtRect.left - 4) : (tgtRect.right + 4)) - matrixRect.left + scrollLeft;
                const y2 = (tgtRect.top + tgtRect.bottom) / 2 - matrixRect.top + scrollTop;

                // 计算平滑三次贝塞尔曲线控制点 (彻底解除硬封顶，采用黄金自适应切线张力与纵向曲率补偿)
                const dx = Math.abs(x2 - x1);
                const dy = y2 - y1;
                const tensionX = Math.max(40, dx * 0.45);
                const tensionY = dy * 0.12;

                const cx1 = isLeftToRight ? (x1 + tensionX) : (x1 - tensionX);
                const cy1 = y1 + tensionY;
                const cx2 = isLeftToRight ? (x2 - tensionX) : (x2 + tensionX);
                const cy2 = y2 - tensionY;

                const d = `M ${x1} ${y1} C ${cx1} ${cy1}, ${cx2} ${cy2}, ${x2} ${y2}`;

                const wireType = info.type || 'warn';
                const markerId = wireType === 'danger' ? 'pb-flow-arrow-danger' : (wireType === 'success' ? 'pb-flow-arrow-success' : 'pb-flow-arrow-warn');
                const dotColor = wireType === 'danger' ? '#ef4444' : (wireType === 'success' ? '#10b981' : '#f59e0b');

                // 动态流动连线路径
                pathsHtml += `<path class="pb-flow-wire ${wireType}" d="${d}" stroke-width="2.2" marker-end="url(#${markerId})" />`;

                // 源点与目标点脉冲圆点
                dotsHtml += `
                    <circle cx="${x1}" cy="${y1}" r="3.5" fill="${dotColor}" class="pb-flow-dot" />
                    <circle cx="${x2}" cy="${y2}" r="3.5" fill="${dotColor}" class="pb-flow-dot" />
                `;

                // 连线中点流向药丸标签
                const midX = (x1 + x2) / 2;
                const midY = (y1 + y2) / 2;
                const tagText = `${info.from} ➔ ${info.toTier ? 'L' + info.toTier : '受波及'}`;
                const textWidth = tagText.length * 6.8 + 12;
                pillsHtml += `
                    <g transform="translate(${midX}, ${midY})" style="pointer-events: auto; cursor: default;">
                        <title>${info.reason}</title>
                        <rect x="${-textWidth/2}" y="-9" width="${textWidth}" height="18" class="pb-flow-pill-bg" />
                        <text x="0" y="0" class="pb-flow-pill-text">${tagText}</text>
                    </g>
                `;
            }

            svgEl.innerHTML = `
                <defs>
                    <marker id="pb-flow-arrow-warn" viewBox="0 0 10 10" refX="7" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                        <path d="M 0 1.5 L 8 5 L 0 8.5 z" fill="#f59e0b" />
                    </marker>
                    <marker id="pb-flow-arrow-danger" viewBox="0 0 10 10" refX="7" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                        <path d="M 0 1.5 L 8 5 L 0 8.5 z" fill="#ef4444" />
                    </marker>
                    <marker id="pb-flow-arrow-success" viewBox="0 0 10 10" refX="7" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                        <path d="M 0 1.5 L 8 5 L 0 8.5 z" fill="#10b981" />
                    </marker>
                </defs>
                <g class="pb-flow-paths-group">${pathsHtml}</g>
                <g class="pb-flow-dots-group">${dotsHtml}</g>
                <g class="pb-flow-pills-group">${pillsHtml}</g>
            `;
        }

        // ⚡ 异步穿透检测指定语义模型底层使用的真实数据源与企业网关连接 (REST / Scanner / Gateway Topology)
        async fetchModelConnections(workspaceId, datasetId, forceRefresh = false) {
            if (!datasetId) return null;
            if (!window._modelDatasourcesCache) {
                try {
                    const cached = sessionStorage.getItem('pbi_model_datasources_cache');
                    window._modelDatasourcesCache = cached ? JSON.parse(cached) : {};
                } catch(e) {
                    window._modelDatasourcesCache = {};
                }
            }
            const cacheKey = `${workspaceId || 'global'}_${datasetId}`;
            if (!forceRefresh && window._modelDatasourcesCache[cacheKey]) {
                return window._modelDatasourcesCache[cacheKey];
            }

            this._fetchingConnections = this._fetchingConnections || {};
            if (this._fetchingConnections[cacheKey]) {
                return null;
            }
            this._fetchingConnections[cacheKey] = true;

            let token = '';
            try {
                token = window.currentPbiToken || (window.getEffectiveAccessToken ? window.getEffectiveAccessToken() : '') || localStorage.getItem('pbi_token') || sessionStorage.getItem('pbi_token') || '';
            } catch(e) {}

            try {
                const res = await fetch('/api/datasource/inspect', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        workspace_id: workspaceId || '',
                        dataset_id: datasetId,
                        report_id: null,
                        access_token: token
                    })
                });
                if (res.ok) {
                    const data = await res.json();
                    if (data && data.success && Array.isArray(data.datasources)) {
                        window._modelDatasourcesCache[cacheKey] = data;
                        try {
                            sessionStorage.setItem('pbi_model_datasources_cache', JSON.stringify(window._modelDatasourcesCache));
                        } catch(e) {}
                        delete this._fetchingConnections[cacheKey];
                        // 静默刷新用户全景资产链路，展示真实连接与企业网关
                        if (this.activeMainTab === 'user_assets') {
                            this.renderUserAssetsMatrix();
                        }
                        return data;
                    }
                }
            } catch (e) {
                console.warn('获取模型连接信息失败:', e);
            } finally {
                if (this._fetchingConnections) {
                    delete this._fetchingConnections[cacheKey];
                }
            }
            return null;
        }

        // ⚡ 渲染用户全景资产权限链路流转矩阵 (Tenant -> Workspace -> Model -> Report -> Connection -> Pipeline)
        renderUserAssetsMatrix() {
            const container = document.getElementById('pb-user-assets-container');
            if (!container) return;

            // 1. 获取当前具体租户与用户主体
            const tenantId = localStorage.getItem('pbi_tenant_id') || document.getElementById('set-tenant')?.value || document.getElementById('set-interactive-tenant')?.value || '';
            let user = null;
            if (this.activePresetKey && USER_PRESETS[this.activePresetKey] && this.activePresetKey !== 'none') {
                user = USER_PRESETS[this.activePresetKey];
            } else {
                const liveUser = document.getElementById('set-username')?.value || document.getElementById('set-interactive-username')?.value || '';
                if (liveUser) {
                    user = {
                        name: liveUser.split('@')[0],
                        upn: liveUser,
                        roleTag: '当前组织登录账号',
                        roleColor: '#38bdf8',
                        state: {
                            isGuestUser: false,
                            tenantAllowExport: true,
                            tenantAllowWebModeling: true,
                            workspaceRole: 'Admin',
                            canReadModel: true,
                            sharePermission: 'ReadBuild',
                            gatewayOnline: true,
                            hasAccessToAllDataConnections: true
                        }
                    };
                }
            }

            const isGuest = Boolean(user?.state?.isGuestUser || user?.upn?.includes('#ext#') || user?.roleTag?.includes('Guest'));
            // 彻底解耦：租户级管理员 (Tenant Admin) vs 工作区级管理员 (Workspace Admin)
            // 严谨治理：普通成员即使被分配了工作区 Admin，在租户级也只是 TENANT MEMBER，绝不可越权篡位为 POWER BI ADMINISTRATOR！
            const isTenantAdmin = Boolean(user?.state?.isTenantAdmin === true || (user?.roleTag && user.roleTag.toLowerCase().includes('tenant admin')));
            const wsRole = user?.state?.workspaceRole || 'Viewer';
            const isWsAdmin = wsRole === 'Admin';
            const isMember = wsRole === 'Member';
            const isContributor = wsRole === 'Contributor';
            const isViewer = wsRole === 'Viewer';
            const isPrivileged = ['Admin', 'Member', 'Contributor'].includes(wsRole);
            const isAdmin = isWsAdmin; // 保留供工作区及其下游治理使用

            // 2. 严格检查是否选择了具体工作区 (绝无盲目取第一项的非预期兜底)
            const rawWsData = window.cleanseCrossDomainWorkspaces ? window.cleanseCrossDomainWorkspaces(window.getMergedGtbWorkspaces ? window.getMergedGtbWorkspaces() : []) : [];
            const selectedWsIds = Array.from(window.selectedGtbWorkspaceIds || []);
            // 🚨 严格以顶栏当前选中的工作区为唯一权威依据：顶栏没选就是没选，绝不回退到任何旧状态
            let curWsId = '';
            if (selectedWsIds.length > 0 && rawWsData.some(w => String(w.id).toLowerCase() === selectedWsIds[0].toLowerCase())) {
                curWsId = selectedWsIds[0];
            }
            const curWs = curWsId ? rawWsData.find(w => String(w.id).toLowerCase() === curWsId.toLowerCase()) : null;
            const hasSelectedWs = Boolean(curWs);
            const wsName = curWs ? (curWs.alias || curWs.name) : '未选择';

            // 3. 严格检查是否选择了具体语义模型 —— 完全依赖顶栏已选模型，不在卡片内部提供选择
            const allDatasets = window.getMergedGtbDatasets ? window.getMergedGtbDatasets() : JSON.parse(localStorage.getItem('pbi_datasets') || '[]');
            const selectedDsIds = Array.from(window.selectedGtbDatasetIds || []);
            let curModel = null;
            // 优先通过顶栏已选模型 ID 精准匹配
            if (selectedDsIds.length > 0) {
                curModel = allDatasets.find(d => String(d.id).toLowerCase() === selectedDsIds[0].toLowerCase());
            }
            // 其次在当前工作区限定范围内检索已选模型
            if (!curModel && hasSelectedWs) {
                const scopedModels = allDatasets.filter(d => String(d.workspaceId || '').toLowerCase() === String(curWs.id).toLowerCase());
                if (scopedModels.length > 0 && selectedDsIds.length > 0) {
                    curModel = scopedModels.find(m => selectedDsIds.some(sid => sid.toLowerCase() === String(m.id).toLowerCase()));
                }
            }
            // 兜底：尝试 currentModelKey（蓝图引擎自身保存的键名）
            if (!curModel && this.currentModelKey) {
                const mKeyLower = this.currentModelKey.replace(/^real_model_/, '').toLowerCase();
                curModel = allDatasets.find(m => String(m.id).toLowerCase() === mKeyLower || m.name === this.currentModelKey || m.alias === this.currentModelKey);
            }
            const hasSelectedModel = Boolean(curModel);

            // 4. 严格检查是否选择了具体报表 —— 完全依赖顶栏已选报表，不在卡片内部提供选择
            const allReports = window.getMergedGtbReports ? window.getMergedGtbReports() : JSON.parse(localStorage.getItem('pbi_reports') || '[]');
            const selectedRpIds = Array.from(window.selectedGtbReportIds || []);
            let curReport = null;
            if (selectedRpIds.length > 0) {
                curReport = allReports.find(r => String(r.id).toLowerCase() === selectedRpIds[0].toLowerCase());
            }
            if (!curReport && hasSelectedWs) {
                const scopedReports = allReports.filter(r => String(r.workspaceId || '').toLowerCase() === String(curWs.id).toLowerCase());
                if (scopedReports.length > 0 && selectedRpIds.length > 0) {
                    curReport = scopedReports.find(r => selectedRpIds.some(sid => sid.toLowerCase() === String(r.id).toLowerCase()));
                }
            }
            const hasSelectedReport = Boolean(curReport);

            // 5. 网关与连接：只有在选定模型后才推导；未选模型时保守标注"未关联"
            // gatewayOnline / hasDataConn 只有真实 API 调用才能确认，此处若无模型则显示未知
            const gatewayOnline = hasSelectedModel ? (user?.state?.gatewayOnline !== false) : null;
            const hasDataConn = hasSelectedModel ? (user?.state?.hasAccessToAllDataConnections !== false) : null;

            // 6. 部署管道：只有实际调用 /pipelines API 才能确认；未绑定则如实呈现
            // 此处保守显示"未检测到关联管道"，不伪造 "${wsName} 专属部署管道"
            const pipelineBound = false; // 实际管道绑定需通过 /api/proxy 查询，此处保守为 false
            const isPipelineAdmin = isAdmin && pipelineBound;

            // 更新顶部主体徽章状态
            const topBadge = document.getElementById('pb-top-simulated-badge');
            if (topBadge) {
                const userText = user ? `${user.name} (${user.roleTag})` : '未选择用户主体';
                topBadge.textContent = `主体: ${userText} · 工作区: ${hasSelectedWs ? wsName : '未选择'} · 模型: ${hasSelectedModel ? (curModel.alias || curModel.name) : '未选择'} · 报表: ${hasSelectedReport ? (curReport.alias || curReport.name) : '未选择'}`;
                topBadge.style.background = hasSelectedWs ? 'rgba(99, 102, 241, 0.15)' : 'rgba(148, 163, 184, 0.15)';
                topBadge.style.color = hasSelectedWs ? '#818cf8' : '#94a3b8';
            }

            // 标题处只读状态指示器渲染辅助函数 (去按钮化设计：呼吸微点 + 纯净状态文字)
            const renderHeaderStatus = (statusClass, statusText) => {
                return `
                    <div class="pb-card-header-status status-${statusClass}">
                        <span class="pb-status-indicator-dot"></span>
                        <span class="pb-status-indicator-text">${statusText}</span>
                    </div>
                `;
            };

            // 权限小卡片条目渲染辅助函数 (支持在同一大卡片内上下拖拽移动排序，物理零重叠)
            const renderTierItemsHtml = (tierId, items) => {
                let savedOrder = [];
                try {
                    savedOrder = JSON.parse(localStorage.getItem(`pbi-user-assets-tier-items-${tierId}`) || '[]');
                } catch(e) {}

                let orderedItems = [...items];
                if (Array.isArray(savedOrder) && savedOrder.length > 0) {
                    const itemMap = new Map(items.map(it => [it.id, it]));
                    const prioritized = [];
                    savedOrder.forEach(id => {
                        if (itemMap.has(id)) {
                            prioritized.push(itemMap.get(id));
                            itemMap.delete(id);
                        }
                    });
                    orderedItems = [...prioritized, ...itemMap.values()];
                }

                return orderedItems.map(item => {
                    let formattedDesc = item.desc || '';
                    formattedDesc = formattedDesc
                        .replace(/^【当前分配身份】/, '<strong class="pb-desc-tag tag-role">【分配身份】</strong>')
                        .replace(/^【当前分配角色】/, '<strong class="pb-desc-tag tag-role">【分配角色】</strong>')
                        .replace(/^【当前分配权限】/, '<strong class="pb-desc-tag tag-role">【分配权限】</strong>')
                        .replace(/^【当前模型绑定的官方连接】/, '<strong class="pb-desc-tag tag-conn">【官方连接】</strong>')
                        .replace(/^【承载通道】/, '<strong class="pb-desc-tag tag-gw">【承载通道】</strong>')
                        .replace(/^【环境就绪】/, '<strong class="pb-desc-tag tag-ok">【环境就绪】</strong>')
                        .replace(/^【载体就绪】/, '<strong class="pb-desc-tag tag-ok">【载体就绪】</strong>');

                    return `
                        <div class="pb-asset-card-row ${item.isHero ? 'is-hero-role' : ''} ${item.cat ? 'cat-' + item.cat : 'cat-derived'}" data-row-id="${item.id}" data-tier-id="${tierId}" draggable="true">
                            <div class="pb-asset-row-top">
                                <div class="pb-asset-row-title-area">
                                    <span class="pb-row-drag-handle">
                                        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                                            <circle cx="9" cy="5" r="1.5"></circle>
                                            <circle cx="9" cy="12" r="1.5"></circle>
                                            <circle cx="9" cy="19" r="1.5"></circle>
                                            <circle cx="15" cy="5" r="1.5"></circle>
                                            <circle cx="15" cy="12" r="1.5"></circle>
                                            <circle cx="15" cy="19" r="1.5"></circle>
                                        </svg>
                                    </span>
                                    <span class="pb-asset-prop-name" title="${item.name}">${item.name}</span>
                                </div>
                                <span class="pb-asset-status-pill status-${item.statusClass}">${item.statusText}</span>
                            </div>
                            <div class="pb-asset-row-bottom">
                                <span class="pb-asset-prop-desc">${formattedDesc}</span>
                                ${item.badge ? `<span class="pb-asset-tag-pill">${item.badge}</span>` : ''}
                            </div>
                        </div>
                    `;
                }).join('');
            };

            // 6 个大卡片组装辅助函数 (横向固定不超出屏幕，固定不能移动，内部小卡片可上下移动)
            const buildTierCardHtml = (tierId, title, sub, statusClass, statusText, bodyHtml) => {
                return `
                    <div class="pb-asset-tier-card" data-tier-id="${tierId}">
                        <div class="pb-card-header">
                            <div class="pb-card-header-top">
                                <h4 class="pb-card-title" title="${title}">${title}</h4>
                                ${renderHeaderStatus(statusClass, statusText)}
                            </div>
                            <div class="pb-card-sub" title="${sub}">${sub}</div>
                        </div>
                        <div class="pb-card-body" data-tier-id="${tierId}">
                            ${bodyHtml}
                        </div>
                    </div>
                `;
            };

            // Module 1: Tenant (租户全局策略层)
            const tenantTitleSub = tenantId ? `租户 ID: ${tenantId}` : '租户 ID 未配置';
            const userSub = user ? `主体: ${user.name} (${user.roleTag})` : '未指定具体用户主体';
            const tenantHeaderStatusClass = user ? (isGuest ? 'warn' : 'enabled') : 'disabled';
            const tenantHeaderStatusText = user ? (isGuest ? '⚠️ B2B GUEST' : '✅ AUTH VALID') : '⚠️ NO PRINCIPAL';
            const tenantRoleName = isTenantAdmin ? 'POWER BI ADMINISTRATOR' : (isGuest ? 'B2B GUEST USER' : 'TENANT MEMBER');
            const tenantHeroStatusClass = user ? (isTenantAdmin ? 'bypassed' : (isGuest ? 'warn' : 'enabled')) : 'disabled';
            const tenantHeroStatusText = user ? (isTenantAdmin ? '⚡ ADMIN' : (isGuest ? '⚠️ B2B GUEST' : '✅ MEMBER')) : '❌ NO USER';
            const tenantItems = [
                { id: 'tenant_principal_role', isHero: true, cat: 'assigned', name: tenantRoleName, desc: user ? `【当前分配身份】主体 [${user.name}] (${user.upn}) · 组织租户治理身份` : '【等待配置】请在左侧主体面板指定具体企业成员', statusClass: tenantHeroStatusClass, statusText: tenantHeroStatusText, badge: 'ROLE' },
                { id: 'tenant_gac_policy', cat: 'derived', name: `GAC POLICY: ${user?.state?.isInStrictMode ? 'STRICT MODE (严格隔离)' : 'PERMISSIVE (策略放行)'}`, desc: user?.state?.isInStrictMode ? '租户开启 GAC(Granular Access Control / 细粒度访问控制) 严格审查模式，非特权成员必须具备显式数据连接授权' : '租户 GAC 跨源策略处于放行模式，未对非特权成员实施全局数据源物理隔离', statusClass: user?.state?.isInStrictMode ? 'warn' : 'enabled', statusText: user?.state?.isInStrictMode ? '🔒 STRICT' : '✅ CAN ACCESS', badge: 'GAC' },
                { id: 'tenant_export', cat: 'derived', name: 'EXPORT DATA (明细数据导出策略)', desc: user ? '租户全局策略放行，允许将报表与模型数据导出至本地 Excel/CSV' : '【等待配置】需选定具体登录主体后生效策略', statusClass: user ? 'enabled' : 'disabled', statusText: user ? '✅ CAN EXPORT' : '❌ CANNOT EXPORT', badge: 'EXPORT' },
                { id: 'tenant_web_modeling', cat: 'derived', name: 'WEB MODELING (浏览器在线建模)', desc: user?.state?.tenantAllowWebModeling ? '租户策略允许在浏览器端直接设计、编辑语义模型架构与度量值' : '租户策略禁用网页在线建模，只能通过客户端工具操作', statusClass: user?.state?.tenantAllowWebModeling ? 'enabled' : 'disabled', statusText: user?.state?.tenantAllowWebModeling ? '✅ CAN MODEL' : '❌ CANNOT MODEL', badge: 'WEB MODEL' },
                { id: 'tenant_xmla', cat: 'derived', name: 'XMLA ENDPOINT (终结点全局读写)', desc: '终结点已开启读写，允许 SSMS、DAX Studio 与 Tabular Editor 跨客户端直连', statusClass: 'enabled', statusText: '✅ CAN CONNECT', badge: 'XMLA' },
                { id: 'tenant_external', cat: 'derived', name: 'EXTERNAL SHARING (跨组织外部共享)', desc: user ? (isGuest ? '当前属于外部访客账号，默认受限禁止跨租户二次外发共享' : '租户策略放行组织外部跨域报告共享') : '【等待配置】需选定用户主体后推导策略', statusClass: isGuest ? 'disabled' : (user ? 'enabled' : 'disabled'), statusText: isGuest ? '❌ CANNOT SHARE' : (user ? '✅ CAN SHARE' : '⚠️ WAITING'), badge: 'EXTERNAL' },
                { id: 'tenant_embed', cat: 'derived', name: 'EMBED FOR EXTERNAL (外部嵌入策略)', desc: '控制是否允许将报表通过 Embed for customers 方式嵌入外部应用程序', statusClass: user ? 'enabled' : 'disabled', statusText: user ? '✅ CAN EMBED' : '❌ CANNOT EMBED', badge: 'EMBED' },
                { id: 'tenant_certify', cat: 'derived', name: 'CERTIFICATION (数据集认证权限)', desc: isTenantAdmin ? '允许为语义模型和数据流打上官方认证标签，向全组织推荐可信数据源' : '仅租户管理员具备数据集认证标签颁发权限', statusClass: isTenantAdmin ? 'enabled' : 'disabled', statusText: isTenantAdmin ? '✅ CAN CERTIFY' : '❌ CANNOT CERTIFY', badge: 'CERTIFY' },
                { id: 'tenant_id', cat: 'env', name: `TENANT: ${tenantId ? (tenantId.length > 20 ? tenantId.slice(0, 18) + '...' : tenantId) : '未配置'}`, desc: tenantId ? `【环境就绪】挂载组织目录租户 ID: ${tenantId}` : '【未配置】系统未配置 TENANT_ID，请在设置中输入', statusClass: tenantId ? 'enabled' : 'warn', statusText: tenantId ? '✅ READY' : '⚠️ MISSING ID', badge: 'TENANT ID' }
            ];
            const colTenantBody = renderTierItemsHtml('tenant', tenantItems);

            // Module 2: Workspace (工作区治理角色层)
            let colWorkspaceBody = '';
            const wsHeaderStatusClass = hasSelectedWs ? 'enabled' : 'disabled';
            const wsRoleCaps = (wsRole || 'VIEWER').toUpperCase();
            const wsHeaderStatusText = hasSelectedWs ? `ROLE: ${wsRoleCaps}` : '⚠️ 未选择';
            if (!hasSelectedWs) {
                colWorkspaceBody = `
                    <div style="padding: 16px 10px; text-align: center; background: rgba(255, 255, 255, 0.02); border-radius: 8px; border: 1px dashed rgba(255, 255, 255, 0.08);">
                        <div style="font-size: 1.3rem; margin-bottom: 6px;">🏢</div>
                        <div style="font-weight: 700; font-size: 0.76rem; color: #f59e0b; margin-bottom: 3px;">尚未选择目标工作区</div>
                        <div style="font-size: 0.65rem; color: var(--text-secondary); line-height: 1.4;">
                            工作区是模型与报表载体，请在顶栏下拉框指定目标工作区。
                        </div>
                    </div>
                `;
            } else {
                const t2Status = isAdmin ? 'bypassed' : (isPrivileged ? 'enabled' : (isViewer ? 'warn' : 'disabled'));
                const wsItems = [
                    { id: 'ws_role', isHero: true, cat: 'assigned', name: wsRoleCaps, desc: `【当前分配角色】在工作区 [${wsName}] 被官方授予 [${wsRoleCaps}] 治理身份`, statusClass: t2Status, statusText: wsRoleCaps === 'ADMIN' ? '⚡ ADMIN' : `✅ ${wsRoleCaps}`, badge: 'ROLE' },
                    { id: 'ws_members', cat: 'derived', name: 'MANAGE PERMISSIONS (管理与成员委派)', desc: isAdmin ? '拥有最高管理权，可向组织成员分配、修改或撤销工作区各级角色' : (isMember ? '仅允许向他人授予 Viewer(查看者) 角色，无法分配更高权限' : '无成员管理权限，禁止变更工作区成员名单与权限'), statusClass: isAdmin ? 'enabled' : (isMember ? 'warn' : 'disabled'), statusText: isAdmin ? '✅ CAN MANAGE' : (isMember ? '⚠️ CAN INVITE VIEWERS' : '❌ CANNOT MANAGE'), badge: 'PERMISSIONS' },
                    { id: 'ws_edit', cat: 'derived', name: 'CREATE & EDIT ASSETS (资产协同增删改)', desc: isPrivileged ? '拥有资产编辑特权，允许新建、修改、重命名或删除模型与报表' : '当前为 Viewer 只读角色，禁止修改或新增工作区任何资产', statusClass: isPrivileged ? 'enabled' : 'disabled', statusText: isPrivileged ? '✅ CAN EDIT' : '❌ CANNOT EDIT', badge: 'ASSETS' },
                    { id: 'ws_app', cat: 'derived', name: 'PUBLISH APP (组织应用打包发布)', desc: (isAdmin || isMember) ? '允许将该工作区报表打包发布或更新为企业级应用程序 (App)' : '仅 Admin/Member 角色具备组织应用发布与受众打包权限', statusClass: (isAdmin || isMember) ? 'enabled' : 'disabled', statusText: (isAdmin || isMember) ? '✅ CAN PUBLISH' : '❌ CANNOT PUBLISH', badge: 'APP' },
                    { id: 'ws_capacity', cat: 'derived', name: 'FABRIC CAPACITY (算力容量绑定)', desc: '挂载企业专用容量 (Fabric F64)，享有独立计算算力与大模型加速', statusClass: 'enabled', statusText: '⚡ CAN ACCESS', badge: 'CAPACITY' },
                    { id: 'ws_delete', cat: 'derived', name: 'DELETE WORKSPACE (删除工作区)', desc: isAdmin ? '允许永久删除整个工作区及其包含的所有资产' : '仅 Admin 角色可执行工作区级别的永久删除操作', statusClass: isAdmin ? 'enabled' : 'disabled', statusText: isAdmin ? '✅ CAN DELETE' : '❌ CANNOT DELETE', badge: 'DELETE' },
                    { id: 'ws_lineage', cat: 'derived', name: 'LINEAGE VIEW (数据血缘追溯)', desc: isPrivileged ? '允许查看完整的端到端数据血缘拓扑关系图' : '仅可查看自身有权访问的资产血缘片段', statusClass: isPrivileged ? 'enabled' : 'warn', statusText: isPrivileged ? '✅ FULL LINEAGE' : '⚠️ PARTIAL VIEW', badge: 'LINEAGE' },
                    { id: 'ws_target', cat: 'env', name: `WORKSPACE: ${wsName.toUpperCase()}`, desc: `【载体就绪】工作区名称: ${wsName} · 容器 ID: ${curWs.id}`, statusClass: 'enabled', statusText: '✅ READY', badge: 'WORKSPACE' }
                ];
                colWorkspaceBody = renderTierItemsHtml('workspace', wsItems);
            }

            // Module 3: Model (语义模型资产权限层)
            let colModelBody = '';
            let modelTitleText = '🗄️ 3. MODEL';
            let modelStatusBadge = '⚠️ 等待工作区';
            let modelStatusClass = 'disabled';
            let modelSubText = '未选择模型';

            if (!hasSelectedWs) {
                colModelBody = `
                    <div style="padding: 16px 10px; text-align: center; background: rgba(255, 255, 255, 0.02); border-radius: 8px; border: 1px dashed rgba(255, 255, 255, 0.08);">
                        <div style="font-size: 1.3rem; margin-bottom: 6px;">🗄️</div>
                        <div style="font-weight: 700; font-size: 0.76rem; color: #94a3b8; margin-bottom: 3px;">等待指定目标工作区</div>
                        <div style="font-size: 0.65rem; color: var(--text-secondary); line-height: 1.4;">
                            语义模型归属于工作区，请先在顶栏指定工作区。
                        </div>
                    </div>
                `;
            } else if (!hasSelectedModel) {
                modelTitleText = '🗄️ 3. MODEL (未加载)';
                modelStatusBadge = '⚠️ 尚未选择';
                modelStatusClass = 'warn';
                modelSubText = '请在顶栏挑选模型';
                colModelBody = `
                    <div style="padding: 16px 10px; text-align: center; background: rgba(255, 255, 255, 0.02); border-radius: 8px; border: 1px dashed rgba(255, 255, 255, 0.08);">
                        <div style="font-size: 1.3rem; margin-bottom: 6px;">🗄️</div>
                        <div style="font-weight: 700; font-size: 0.76rem; color: #f59e0b; margin-bottom: 3px;">顶栏尚未选择具体模型</div>
                        <div style="font-size: 0.65rem; color: var(--text-secondary); line-height: 1.4;">
                            请在顶栏「模型」选择器中选择 <strong style="color: #60a5fa;">${wsName}</strong> 下的模型。
                        </div>
                    </div>
                `;
            } else {
                const canReadModel = isPrivileged || isViewer;
                const canBuild = isPrivileged || Boolean(user?.state?.sharePermission && String(user?.state?.sharePermission).includes('Build'));
                const modelPermLabel = canBuild ? 'READ + BUILD' : (canReadModel ? 'READ ONLY' : 'NO ACCESS');
                modelTitleText = `🗄️ 3. MODEL (${(curModel.alias || curModel.name).toUpperCase()})`;
                modelStatusBadge = canBuild ? '⚡ READ + BUILD' : (canReadModel ? '👁️ READ ONLY' : '🚫 NO ACCESS');
                modelStatusClass = canBuild ? 'enabled' : (canReadModel ? 'warn' : 'disabled');
                modelSubText = `模型 ID: ${curModel.id}`;

                const modelItems = [
                    { id: 'model_permission', isHero: true, cat: 'assigned', name: modelPermLabel, desc: `【当前分配权限】当前用户对语义模型 [${curModel.alias || curModel.name}] 的官方有效权限集合`, statusClass: canBuild ? 'enabled' : (canReadModel ? 'warn' : 'disabled'), statusText: canBuild ? '⚡ BUILD' : (canReadModel ? '👁️ READ' : '🚫 DENIED'), badge: 'PERMISSION' },
                    { id: 'model_read', cat: 'derived', name: 'READ (模型直接读取权限)', desc: canReadModel ? '执行 DAX 查询与模型基础刷新，下游报表正常取数渲染' : '无 READ 权限，DAX 查询将被 403 阻断，报表将拒绝加载', statusClass: canReadModel ? 'enabled' : 'disabled', statusText: canReadModel ? '✅ CAN READ' : '❌ CANNOT READ', badge: 'READ' },
                    { id: 'model_build', cat: 'derived', name: 'BUILD (衍生构建与自助探索)', desc: canBuild ? '允许以该模型为基础使用 Excel 透视分析、新建独立衍生报表' : '无 BUILD 权限，无法新建下游衍生报表或在 Excel 中连接探索', statusClass: canBuild ? 'enabled' : 'disabled', statusText: canBuild ? '✅ CAN BUILD' : '❌ CANNOT BUILD', badge: 'BUILD' },
                    { id: 'model_write', cat: 'derived', name: 'WRITE (架构与度量值写回)', desc: isPrivileged ? '通过 XMLA 端点或浏览器在线修改表结构、新建度量值与关系模型' : '非 Admin/Member/Contributor 角色，禁止写回模型架构或修改度量值', statusClass: isPrivileged ? 'enabled' : 'disabled', statusText: isPrivileged ? '✅ CAN WRITE' : '❌ CANNOT WRITE', badge: 'WRITE' },
                    { id: 'model_gac_ols', cat: 'derived', name: 'GAC / OLS (表与列细粒度对象安全)', desc: isPrivileged ? '工作区管理员特权穿透，免除语义模型敏感表与度量值字段的 OLS/GAC 掩蔽限制' : (user?.state?.olsEnabled ? '受敏感字段 OLS/GAC 细粒度安全约束，受保护的高密字段已被动态掩蔽 (Masked)' : '已获模型全量表与字段 GAC 访问权限，所有敏感维度与指标字段完整可见'), statusClass: isPrivileged ? 'bypassed' : (user?.state?.olsEnabled ? 'warn' : 'enabled'), statusText: isPrivileged ? '⚡ ADMIN BYPASS' : (user?.state?.olsEnabled ? '🔒 OLS MASKED' : '✅ CAN ACCESS ALL'), badge: 'OLS' },
                    { id: 'model_rls', cat: 'derived', name: 'RLS (行级数据安全过滤)', desc: isPrivileged ? '工作区管理员特权穿透，直接跳过所有 DAX 行级安全过滤规则' : '受 DAX 角色策略约束，仅能查看授权给当前身份的切片行数据', statusClass: isPrivileged ? 'bypassed' : 'warn', statusText: isPrivileged ? '⚡ ADMIN BYPASS' : '🔒 RLS RESTRICTED', badge: 'RLS' },
                    { id: 'model_reshare', cat: 'derived', name: 'RESHARE (向第三方重新共享)', desc: (isAdmin || isMember) ? '允许将该具体语义模型的访问权限二次授权给其他组织成员' : '无 RESHARE 权限，禁止向第三方组织成员分发或再授权该模型', statusClass: (isAdmin || isMember) ? 'enabled' : 'disabled', statusText: (isAdmin || isMember) ? '✅ CAN RESHARE' : '❌ CANNOT RESHARE', badge: 'RESHARE' }
                ];
                colModelBody = renderTierItemsHtml('model', modelItems);
            }

            // Module 4: Report (报表视图与交互权限层)
            let colReportBody = '';
            let reportTitleText = '📊 4. REPORT';
            let reportStatusBadge = '⚠️ 等待工作区';
            let reportStatusClass = 'disabled';
            let reportSubText = '未选择报表';

            if (!hasSelectedWs) {
                colReportBody = `
                    <div style="padding: 16px 10px; text-align: center; background: rgba(255, 255, 255, 0.02); border-radius: 8px; border: 1px dashed rgba(255, 255, 255, 0.08);">
                        <div style="font-size: 1.3rem; margin-bottom: 6px;">📊</div>
                        <div style="font-weight: 700; font-size: 0.76rem; color: #94a3b8; margin-bottom: 3px;">等待指定目标工作区</div>
                        <div style="font-size: 0.65rem; color: var(--text-secondary); line-height: 1.4;">
                            报表资产归属于工作区，请先在顶栏指定工作区。
                        </div>
                    </div>
                `;
            } else if (!hasSelectedReport) {
                reportTitleText = '📊 4. REPORT (未加载)';
                reportStatusBadge = '⚠️ 尚未选择';
                reportStatusClass = 'warn';
                reportSubText = '请在顶栏挑选报表';
                colReportBody = `
                    <div style="padding: 16px 10px; text-align: center; background: rgba(255, 255, 255, 0.02); border-radius: 8px; border: 1px dashed rgba(255, 255, 255, 0.08);">
                        <div style="font-size: 1.3rem; margin-bottom: 6px;">📊</div>
                        <div style="font-weight: 700; font-size: 0.76rem; color: #f59e0b; margin-bottom: 3px;">顶栏尚未选择具体报表</div>
                        <div style="font-size: 0.65rem; color: var(--text-secondary); line-height: 1.4;">
                            请在顶栏「报表」选择器中选择 <strong style="color: #60a5fa;">${wsName}</strong> 下的报表。
                        </div>
                    </div>
                `;
            } else {
                const canEditReport = isPrivileged && user?.state?.tenantAllowWebModeling;
                const canExportUnderlying = Boolean(user?.state?.sharePermission?.includes('Build') || isPrivileged) && Boolean(user?.state?.tenantAllowExport);
                const reportAccessLabel = canEditReport ? 'EDIT + VIEW' : 'VIEW ONLY';
                reportTitleText = `📊 4. REPORT (${(curReport.alias || curReport.name).toUpperCase()})`;
                reportStatusBadge = canEditReport ? '✏️ EDIT + VIEW' : '👁️ VIEW ONLY';
                reportStatusClass = canEditReport ? 'enabled' : 'warn';
                reportSubText = `报表 ID: ${curReport.id}`;

                const reportItems = [
                    { id: 'report_access', isHero: true, cat: 'assigned', name: reportAccessLabel, desc: `【当前分配权限】当前用户对报表 [${curReport.alias || curReport.name}] 的官方有效访问级别`, statusClass: canEditReport ? 'enabled' : 'warn', statusText: canEditReport ? '✏️ EDIT' : '👁️ VIEW', badge: 'ACCESS' },
                    { id: 'report_view', cat: 'derived', name: 'VIEW & INTERACT (报表在线交互)', desc: '在线访问报表页面、切片器联动与图表多维钻取浏览', statusClass: 'enabled', statusText: '✅ CAN VIEW', badge: 'VIEW' },
                    { id: 'report_edit', cat: 'derived', name: 'EDIT VISUALS (视觉对象在线编辑)', desc: canEditReport ? '在线修改报表图表、调整页面布局与另存副本' : '未被授予编辑权限，报表处于纯只读交互模式，无法修改布局', statusClass: canEditReport ? 'enabled' : 'disabled', statusText: canEditReport ? '✅ CAN EDIT' : '❌ CANNOT EDIT', badge: 'EDIT' },
                    { id: 'report_export', cat: 'derived', name: 'EXPORT DATA (底层明细数据导出)', desc: canExportUnderlying ? '允许导出底层原始颗粒度数据明细至本地 Excel/CSV' : '缺少 BUILD 权限或受租户策略限制，仅允许导出带格式汇总数据', statusClass: canExportUnderlying ? 'enabled' : 'warn', statusText: canExportUnderlying ? '✅ CAN EXPORT' : '⚠️ SUMMARY ONLY', badge: 'EXPORT' },
                    { id: 'report_sub', cat: 'derived', name: 'SUBSCRIBE & ALERT (订阅与数据警报)', desc: '设置报表关键 KPI 阈值自动化警报及定时邮件快照推送', statusClass: 'enabled', statusText: '✅ CAN SUBSCRIBE', badge: 'SUBSCRIBE' },
                    { id: 'report_share', cat: 'derived', name: 'SHARE REPORT (报表安全链接共享)', desc: (isAdmin || isMember) ? '生成组织安全共享链接向授权受众分发报表' : '仅 Admin/Member 具备报表受众共享与链接分发权限', statusClass: (isAdmin || isMember) ? 'enabled' : 'disabled', statusText: (isAdmin || isMember) ? '✅ CAN SHARE' : '❌ CANNOT SHARE', badge: 'SHARE' }
                ];
                colReportBody = renderTierItemsHtml('report', reportItems);
            }

            // Module 5: Connection (网关连接与凭据鉴权层 - 官方 Connection 名称高亮突出，严格区分网关通道)
            let colConnectionBody = '';
            let modelConnections = [];
            const connCacheKey = `${curWs?.id || 'global'}_${curModel?.id || ''}`;
            if (!window._modelDatasourcesCache) {
                try {
                    const cached = sessionStorage.getItem('pbi_model_datasources_cache');
                    window._modelDatasourcesCache = cached ? JSON.parse(cached) : {};
                } catch(e) {
                    window._modelDatasourcesCache = {};
                }
            }
            const inspectCache = (window._modelDatasourcesCache && curModel?.id) ? window._modelDatasourcesCache[connCacheKey] : null;

            let primaryConnName = '';
            let primaryDsType = 'DATABASE';
            let primaryServer = '';
            let primaryDb = '';

            if (!hasSelectedWs) {
                colConnectionBody = `
                    <div style="padding: 16px 10px; text-align: center; background: rgba(255, 255, 255, 0.02); border-radius: 8px; border: 1px dashed rgba(255, 255, 255, 0.08);">
                        <div style="font-size: 1.3rem; margin-bottom: 6px;">🔌</div>
                        <div style="font-weight: 700; font-size: 0.76rem; color: #94a3b8; margin-bottom: 3px;">等待指定目标工作区</div>
                        <div style="font-size: 0.65rem; color: var(--text-secondary); line-height: 1.4;">
                            数据通道需基于工作区和模型推导。
                        </div>
                    </div>
                `;
            } else if (!hasSelectedModel) {
                colConnectionBody = `
                    <div style="padding: 16px 10px; text-align: center; background: rgba(255, 255, 255, 0.02); border-radius: 8px; border: 1px dashed rgba(255, 255, 255, 0.08);">
                        <div style="font-size: 1.3rem; margin-bottom: 6px;">🔌</div>
                        <div style="font-weight: 700; font-size: 0.76rem; color: #f59e0b; margin-bottom: 3px;">未关联具体语义模型</div>
                        <div style="font-size: 0.65rem; color: var(--text-secondary); line-height: 1.4;">
                            请在顶栏选择模型以呈现其具体使用的官方连接与底层网关。
                        </div>
                    </div>
                `;
            } else {
                // 1. 若尚未缓存真实检测结果，后台自动发起穿透探测
                if (!inspectCache && curWs?.id && curModel?.id) {
                    this.fetchModelConnections(curWs.id, curModel.id);
                } else if (inspectCache && Array.isArray(inspectCache.datasources) && inspectCache.datasources.length > 0) {
                    const hasConnNameProp = inspectCache.datasources.some(d => 'connectionName' in d);
                    if (!hasConnNameProp && curWs?.id && curModel?.id) {
                        delete window._modelDatasourcesCache[connCacheKey];
                        this.fetchModelConnections(curWs.id, curModel.id, true);
                    }
                }

                // 2. 预设模型的官方 Connection 映射表 (大写醒目突出官方连接名称)
                const PRESET_CONNS_MAP = {
                    'model_sales': [
                        { id: 'conn_ds_sales_sql', isHero: true, name: 'CONNECTION: AWS REDSHIFT', desc: '【当前模型绑定的官方连接】数据源: Amazon Redshift · vf-uap-apac-redshift.amazonaws.com:5439 · 库: vfuap · 模式: DirectQuery', statusClass: 'enabled', statusText: '✅ CONNECTED', badge: 'REDSHIFT' },
                        { id: 'conn_ds_sales_adls', isHero: true, name: 'CONNECTION: ADLS GEN2', desc: '【当前模型绑定的官方连接】数据源: Azure Data Lake · adlsapacprod.dfs.core.windows.net · 路径: /telemetry_logs · 模式: Import', statusClass: 'enabled', statusText: '✅ CONNECTED', badge: 'DATA LAKE' }
                    ],
                    'model_finance': [
                        { id: 'conn_ds_fin_hana', isHero: true, name: 'CONNECTION: SAP HANA PROD', desc: '【当前模型绑定的官方连接】数据源: SAP HANA · saphana-corp.internal:30015 · 库: S4H_FIN_CORE · 模式: DirectQuery', statusClass: 'enabled', statusText: '✅ CONNECTED', badge: 'SAP HANA' },
                        { id: 'conn_ds_fin_sql', isHero: true, name: 'CONNECTION: SQL SERVER CORP', desc: '【当前模型绑定的官方连接】数据源: SQL Server · corp-sql-fin01 · 库: FIN_LEDGER_DB · 模式: Import', statusClass: 'enabled', statusText: '✅ CONNECTED', badge: 'SQL SERVER' }
                    ],
                    'model_hr': [
                        { id: 'conn_ds_hr_api', isHero: true, name: 'CONNECTION: WORKDAY REST API', desc: '【当前模型绑定的官方连接】数据源: REST API · services.workday.com/ccx/api · 协议: OAuth 2.0 身份委派', statusClass: 'enabled', statusText: '✅ CONNECTED', badge: 'REST API' },
                        { id: 'conn_ds_hr_sql', isHero: true, name: 'CONNECTION: AZURE SQL CONFIDENTIAL', desc: '【当前模型绑定的官方连接】数据源: Azure SQL · sqlsrv-hr-confidential.windows.net · 凭据: 托管标识直连', statusClass: 'enabled', statusText: '✅ CONNECTED', badge: 'AZURE SQL' }
                    ],
                    'model_inventory': [
                        { id: 'conn_ds_inv_oracle', isHero: true, name: 'CONNECTION: ORACLE WMS', desc: '【当前模型绑定的官方连接】数据源: Oracle · ora-logistics-db.corp:1521/ORCL · 模式: DirectQuery', statusClass: 'enabled', statusText: '✅ CONNECTED', badge: 'ORACLE' },
                        { id: 'conn_ds_inv_sp', isHero: true, name: 'CONNECTION: SHAREPOINT ONLINE', desc: '【当前模型绑定的官方连接】数据源: SharePoint · contoso.sharepoint.com · 列表: Stock_Levels · 模式: Import', statusClass: 'enabled', statusText: '✅ CONNECTED', badge: 'SHAREPOINT' }
                    ]
                };

                // 3. 提取当前模型所使用的具体连接项与绑定的真实网关拓扑
                const detectedGateways = (inspectCache && Array.isArray(inspectCache.gateways)) ? inspectCache.gateways : [];

                if (inspectCache && Array.isArray(inspectCache.datasources) && inspectCache.datasources.length > 0) {
                    modelConnections = inspectCache.datasources.map((ds, idx) => {
                        const rawConnName = ds.connectionName || ds.datasourceName || '';
                        const dsType = (ds.datasourceType || 'Database').toUpperCase();
                        const server = ds.server || ds.url || '云端数据库连接';
                        const db = ds.database || '';
                        const gwName = ds.gatewayName || (detectedGateways[0]?.name) || '';
                        const hasGw = Boolean(gwName || (ds.gatewayId && ds.gatewayId !== '-'));
                        const gwStatus = (ds.gatewayStatus || detectedGateways[0]?.status || 'LIVE').toUpperCase();

                        // 提炼大写官方 Connection 名字 (避免将超长 URL 作为标题挤压布局)
                        let connName = rawConnName ? rawConnName.toUpperCase() : '';
                        if (!connName) {
                            connName = db ? `${dsType}: ${db}`.toUpperCase() : (dsType ? `${dsType} CONNECTION` : 'PRIMARY CONNECTION');
                        }
                        if (!primaryConnName) {
                            primaryConnName = connName;
                            primaryDsType = dsType;
                            primaryServer = server;
                            primaryDb = db;
                        }

                        const displayName = connName;
                        const displayDesc = `【当前模型绑定的官方连接】数据源: ${dsType} · 服务器: ${server}${db ? ' · 数据库: ' + db : ''}${hasGw ? ' · 经由网关: ' + gwName : ' · 云端直连通道'}`;

                        return {
                            id: `conn_real_ds_${idx}`,
                            isHero: true,
                            cat: 'assigned',
                            name: displayName,
                            desc: displayDesc,
                            statusClass: 'enabled',
                            statusText: hasGw ? `✅ ${gwStatus}` : '✅ CONNECTED',
                            badge: dsType
                        };
                    });
                } else if (PRESET_CONNS_MAP[curModel?.id] || (this.currentModelKey && PRESET_CONNS_MAP[this.currentModelKey])) {
                    modelConnections = PRESET_CONNS_MAP[curModel?.id] || PRESET_CONNS_MAP[this.currentModelKey];
                    if (modelConnections.length > 0 && modelConnections[0].name) {
                        primaryConnName = modelConnections[0].name.replace(/^CONNECTION:\s*/i, '');
                    }
                }

                // 4. 组装条目列表：先放入当前模型具体使用的官方 Connection 通道
                const connItems = [];
                if (modelConnections.length > 0) {
                    modelConnections.forEach(mc => connItems.push(mc));
                } else if (this._fetchingConnections && this._fetchingConnections[connCacheKey]) {
                    connItems.push({
                        id: 'conn_inspecting',
                        isHero: true,
                        cat: 'assigned',
                        name: '正在穿透探测官方连接...',
                        desc: `【连接探测中】正在向数据源分析引擎拉取模型 [${curModel.alias || curModel.name}] 底层官方连接名称与网关`,
                        statusClass: 'warn',
                        statusText: '⏳ SCANNING',
                        badge: 'SCANNING'
                    });
                } else {
                    const fallbackConnName = `${(curModel.alias || curModel.name).toUpperCase()} PRIMARY CONNECTION`;
                    primaryConnName = fallbackConnName;
                    connItems.push({
                        id: 'conn_default_ds',
                        isHero: true,
                        cat: 'assigned',
                        name: fallbackConnName,
                        desc: `【当前模型绑定的官方连接】模型 [${curModel.alias || curModel.name}] 已挂载官方数据源连接通道 · 运行正常`,
                        statusClass: 'enabled',
                        statusText: '✅ CONNECTED',
                        badge: 'DATASOURCE'
                    });
                }

                // 解析企业数据网关的具体运行态 (作为承载通道，绝不喧宾夺主)
                const activeGw = detectedGateways[0] || (inspectCache?.datasources?.find(d => d.gatewayName) ? {
                    name: inspectCache.datasources.find(d => d.gatewayName).gatewayName,
                    status: inspectCache.datasources.find(d => d.gatewayName).gatewayStatus || 'Live'
                } : null);

                let gwItemName = 'GATEWAY: 企业本地数据网关 (承载通道)';
                let gwItemDesc = '【承载通道】该工作区绑定的本地企业数据网关 (On-Premises Data Gateway) 集群拓扑';
                let gwItemStatusClass = 'warn';
                let gwItemStatusText = '⚠️ UNKNOWN';
                let gwItemBadge = 'GATEWAY';

                if (activeGw) {
                    gwItemName = `GATEWAY: ${activeGw.name.toUpperCase()} (承载网关)`;
                    gwItemDesc = `【承载通道】经由企业本地数据网关集群 [${activeGw.name}] 穿透内网访问底层物理数据库`;
                    gwItemStatusClass = 'enabled';
                    gwItemStatusText = `✅ ${(activeGw.status || 'LIVE').toUpperCase()} ONLINE`;
                    gwItemBadge = 'LIVE CLUSTER';
                } else if (gatewayOnline === true) {
                    gwItemStatusClass = 'enabled';
                    gwItemStatusText = '✅ LIVE ONLINE';
                } else if (gatewayOnline === false) {
                    gwItemStatusClass = 'disabled';
                    gwItemStatusText = '❌ GATEWAY OFFLINE';
                }

                connItems.push(
                    { id: 'conn_user_perm', cat: 'derived', name: 'CONNECTION USER (连接凭据使用权)', desc: hasDataConn ? '具备 Connection User 授权，模型在刷新与 DirectQuery 取数时可复用此凭据' : '未被分配 Connection User 角色，无法调用或复用该连接凭据', statusClass: hasDataConn ? 'enabled' : 'disabled', statusText: hasDataConn ? '✅ CAN USE' : '❌ CANNOT USE', badge: 'CREDENTIALS' },
                    { id: 'conn_gac_perm', cat: 'derived', name: 'GAC PERMISSION (数据源细粒度访问权限)', desc: isPrivileged ? '工作区管理员特权穿透，直接拥有该连接最高 GAC(Granular Access Control) 细粒度物理直连与抽取权限' : (hasDataConn ? '已获官方数据源 GAC 细粒度授权，允许直接复用此连接凭据执行数据查询与抽取' : '未被分配 GAC 细粒度权限，无法通过此连接访问底层物理数据库'), statusClass: isPrivileged ? 'bypassed' : (hasDataConn ? 'enabled' : 'disabled'), statusText: isPrivileged ? '⚡ ADMIN BYPASS' : (hasDataConn ? '✅ CAN ACCESS' : '❌ CANNOT ACCESS'), badge: 'GAC' },
                    { id: 'conn_gac_mashup', cat: 'derived', name: 'GAC MASHUP GATE (跨源数据混合转换门禁)', desc: isPrivileged ? '工作区管理员直通，豁免多数据源 Mashup 细粒度门禁限制，可自由混合处理多源数据' : (hasDataConn && !user?.state?.isInStrictMode ? '跨源安全门禁放行，允许在 Power Query 与 DirectQuery 中将此连接与其它数据源关联合并' : '触发 GAC 跨源安全隔离门禁，严格模式下禁止跨数据源混合关联处理'), statusClass: isPrivileged ? 'bypassed' : (hasDataConn && !user?.state?.isInStrictMode ? 'enabled' : 'disabled'), statusText: isPrivileged ? '⚡ ADMIN BYPASS' : (hasDataConn && !user?.state?.isInStrictMode ? '✅ CAN MASHUP' : '❌ CANNOT MASHUP'), badge: 'MASHUP' },
                    { id: 'conn_gw', cat: 'env', name: gwItemName, desc: gwItemDesc, statusClass: gwItemStatusClass, statusText: gwItemStatusText, badge: gwItemBadge },
                    { id: 'conn_sso', cat: 'derived', name: 'DIRECTQUERY SSO (单点登录身份委派)', desc: 'DirectQuery 运行时使用当前用户 Entra ID 身份穿透鉴权直连底层数据库', statusClass: 'enabled', statusText: '✅ CAN DELEGATE', badge: 'SSO' },
                    { id: 'conn_refresh', cat: 'derived', name: 'SCHEDULED REFRESH (计划刷新调度)', desc: isPrivileged ? '允许配置自动化计划刷新调度并随时手动触发微批次数据抽取' : '仅 Admin/Member/Contributor 具备计划刷新配置与手动触发权限', statusClass: isPrivileged ? 'enabled' : 'disabled', statusText: isPrivileged ? '✅ CAN REFRESH' : '❌ CANNOT REFRESH', badge: 'REFRESH' },
                    { id: 'conn_owner', cat: 'derived', name: 'CONNECTION OWNER (连接所有者管理)', desc: isAdmin ? '拥有连接最高管理权，允许修改连接凭据、参数配置与删除连接' : '非工作区 Admin 角色，无法修改或删除连接配置', statusClass: isAdmin ? 'enabled' : 'disabled', statusText: isAdmin ? '✅ CAN MANAGE' : '❌ CANNOT MANAGE', badge: 'OWNER' },
                    { id: 'conn_share', cat: 'derived', name: 'SHARE CONNECTION (连接共享)', desc: (isAdmin || isMember) ? '允许将该数据源连接共享给其他工作区成员使用' : '仅 Admin/Member 角色具备连接共享授权能力', statusClass: (isAdmin || isMember) ? 'enabled' : 'disabled', statusText: (isAdmin || isMember) ? '✅ CAN SHARE' : '❌ CANNOT SHARE', badge: 'SHARE' }
                );

                colConnectionBody = renderTierItemsHtml('connection', connItems);
            }

            const activeGwName = (inspectCache?.gateways && inspectCache.gateways[0]?.name) || (inspectCache?.datasources?.find(d => d.gatewayName)?.gatewayName) || '';
            const connTitleUpper = primaryConnName ? primaryConnName.toUpperCase() : '数据源连接';
            const connTitleText = '🔌 5. CONNECTION (连接)';
            const connSubText = `连接: ${connTitleUpper} · 经由网关: ${activeGwName ? activeGwName.toUpperCase() : '云端直连'}`;
            const connStatusLabel = !hasSelectedWs ? '⚠️ 未选' : (!hasSelectedModel ? '⚠️ 未选模型' : '✅ CONNECTED');
            const connStatusClass = !hasSelectedWs ? 'disabled' : (!hasSelectedModel ? 'warn' : 'enabled');

            // Module 6: Pipeline (部署管道与 ALM 治理层)
            let colPipelineBody = '';
            const pipelineRoleName = isPipelineAdmin ? 'PIPELINE ADMIN' : (hasSelectedWs ? 'DEPLOYER' : 'NO ACCESS');
            const pipelineItems = [
                { id: 'pipeline_role', isHero: true, cat: 'assigned', name: pipelineRoleName, desc: hasSelectedWs ? `【当前分配角色】在工作区 [${wsName}] 部署管道 ALM 生命周期中的官方治理身份` : '【未关联】需选择目标工作区以呈现部署管道身份', statusClass: hasSelectedWs ? (isPipelineAdmin ? 'enabled' : 'warn') : 'disabled', statusText: hasSelectedWs ? (isPipelineAdmin ? '✅ ADMIN' : '⚠️ DEPLOY') : '❌ NONE', badge: 'ALM' },
                { id: 'pipeline_deploy', cat: 'derived', name: 'STAGE DEPLOYMENT (阶段流转部署)', desc: isPipelineAdmin ? '允许将开发阶段的模型与报表一键晋升部署至测试 (Test) 或生产 (Prod) 环境' : '尚未绑定专用管道或缺少部署者权限，无法执行阶段流转', statusClass: isPipelineAdmin ? 'enabled' : 'warn', statusText: isPipelineAdmin ? '✅ CAN DEPLOY' : '⚠️ CANNOT DEPLOY', badge: 'DEPLOY' },
                { id: 'pipeline_diff', cat: 'derived', name: 'SCHEMA DIFF (阶段架构差异比对)', desc: isPipelineAdmin ? '自动比对各阶段模型架构、表字段变更及度量值元数据差异' : '需绑定部署管道以启用自动化架构差异比对检测引擎', statusClass: isPipelineAdmin ? 'enabled' : 'warn', statusText: isPipelineAdmin ? '✅ CAN COMPARE' : '⚠️ CANNOT COMPARE', badge: 'DIFF' },
                { id: 'pipeline_rules', cat: 'derived', name: 'CONFIGURE RULES (部署规则配置)', desc: isPipelineAdmin ? '允许配置参数覆盖规则、数据源映射规则与部署排除策略' : '需管道管理员权限以配置部署规则', statusClass: isPipelineAdmin ? 'enabled' : 'disabled', statusText: isPipelineAdmin ? '✅ CAN CONFIGURE' : '❌ CANNOT CONFIGURE', badge: 'RULES' },
                { id: 'pipeline_manage', cat: 'derived', name: 'MANAGE PIPELINE (管道生命周期管理)', desc: isPipelineAdmin ? '允许创建、删除部署管道与绑定/解绑各阶段工作区' : '仅管道管理员可执行管道级别生命周期操作', statusClass: isPipelineAdmin ? 'enabled' : 'disabled', statusText: isPipelineAdmin ? '✅ CAN MANAGE' : '❌ CANNOT MANAGE', badge: 'LIFECYCLE' },
                { id: 'pipeline_backward', cat: 'derived', name: 'BACKWARD DEPLOY (反向回退部署)', desc: isPipelineAdmin ? '允许从生产阶段逆向回退部署至测试或开发阶段' : '仅管道管理员可执行反向回退部署', statusClass: isPipelineAdmin ? 'enabled' : 'disabled', statusText: isPipelineAdmin ? '✅ CAN ROLLBACK' : '❌ CANNOT ROLLBACK', badge: 'ROLLBACK' }
            ];
            if (!hasSelectedWs) {
                colPipelineBody = `
                    <div style="padding: 16px 10px; text-align: center; background: rgba(255, 255, 255, 0.02); border-radius: 8px; border: 1px dashed rgba(255, 255, 255, 0.08);">
                        <div style="font-size: 1.3rem; margin-bottom: 6px;">🚀</div>
                        <div style="font-weight: 700; font-size: 0.76rem; color: #94a3b8; margin-bottom: 3px;">等待指定目标工作区</div>
                        <div style="font-size: 0.65rem; color: var(--text-secondary); line-height: 1.4;">
                            部署管道需关联具体工作区以呈现阶段流转。
                        </div>
                    </div>
                `;
            } else {
                colPipelineBody = renderTierItemsHtml('pipeline', pipelineItems);
            }
            const pipelineStatusLabel = !hasSelectedWs ? '⚠️ 未选' : (isPipelineAdmin ? '✅ 管道就绪' : '⚠️ 未绑定管道');
            const pipelineStatusClass = !hasSelectedWs ? 'disabled' : (isPipelineAdmin ? 'enabled' : 'warn');

            // 资产模块大卡片字典映射 (6 个固定大卡片，横向固定不超出屏幕，固定不能移动)
            const cardsMap = {
                'tenant': buildTierCardHtml('tenant', '🏢 1. TENANT (租户策略)', userSub, tenantHeaderStatusClass, tenantHeaderStatusText, colTenantBody),
                'workspace': buildTierCardHtml('workspace', '📁 2. WORKSPACE (工作区)', wsName, wsHeaderStatusClass, wsHeaderStatusText, colWorkspaceBody),
                'model': buildTierCardHtml('model', modelTitleText, modelSubText, modelStatusClass, modelStatusBadge, colModelBody),
                'report': buildTierCardHtml('report', reportTitleText, reportSubText, reportStatusClass, reportStatusBadge, colReportBody),
                'connection': buildTierCardHtml('connection', connTitleText, connSubText, connStatusClass, connStatusLabel, colConnectionBody),
                'pipeline': buildTierCardHtml('pipeline', '🚀 6. PIPELINE (部署管道)', hasSelectedWs ? 'ALM 流转治理' : '等待工作区', pipelineStatusClass, pipelineStatusLabel, colPipelineBody)
            };

            // 6 个大卡片固定按照 1-6 标准流转顺序平分屏幕宽，不能移动
            const fixedOrder = ['tenant', 'workspace', 'model', 'report', 'connection', 'pipeline'];
            container.innerHTML = fixedOrder.map(k => cardsMap[k]).join('') +
                `<div class="pb-category-legend">
                    <div class="pb-legend-item"><span class="pb-legend-dot dot-assigned"></span>ASSIGNED</div>
                    <div class="pb-legend-item"><span class="pb-legend-dot dot-derived"></span>CAPABILITY</div>
                    <div class="pb-legend-item"><span class="pb-legend-dot dot-env"></span>ENV</div>
                </div>`;

            // 初始化卡片内部各个权限小卡片上下拖拽移动排序引擎 (物理零重叠)
            this.initUserAssetsItemDrag(container);
            this.initUserAssetsCausalityLinkage(container);
        }

        // ⚡ 初始化卡片内部权限条目上下拖拽移动引擎 (Zero-Overlap Guaranteed Item Reordering)
        initUserAssetsItemDrag(container) {
            if (!container) return;
            const bodies = container.querySelectorAll('.pb-asset-tier-card .pb-card-body');
            let draggedRow = null;
            let currentTierId = null;

            bodies.forEach(body => {
                const tierId = body.getAttribute('data-tier-id');
                const rows = body.querySelectorAll('.pb-asset-card-row');

                rows.forEach(row => {
                    row.addEventListener('dragstart', (e) => {
                        draggedRow = row;
                        currentTierId = tierId;
                        row.classList.add('pb-row-dragging');
                        e.dataTransfer.effectAllowed = 'move';
                        e.dataTransfer.setData('text/plain', row.getAttribute('data-row-id') || '');
                        e.stopPropagation();
                    });

                    row.addEventListener('dragend', () => {
                        if (draggedRow) {
                            draggedRow.classList.remove('pb-row-dragging');
                        }
                        // 拖拽完成，立即持久化该大卡片内部小条目顺序
                        if (currentTierId && body) {
                            const newOrder = Array.from(body.querySelectorAll('.pb-asset-card-row'))
                                .map(r => r.getAttribute('data-row-id'))
                                .filter(Boolean);
                            try {
                                localStorage.setItem(`pbi-user-assets-tier-items-${currentTierId}`, JSON.stringify(newOrder));
                            } catch(e) {}
                        }
                        draggedRow = null;
                        currentTierId = null;
                    });

                    row.addEventListener('dragover', (e) => {
                        e.preventDefault();
                        e.dataTransfer.dropEffect = 'move';
                        if (!draggedRow || draggedRow === row) return;
                        // 严格限制：只允许在同属于该卡片的条目之间上下排序
                        if (draggedRow.getAttribute('data-tier-id') !== tierId) return;

                        const rect = row.getBoundingClientRect();
                        const midpoint = rect.top + rect.height / 2;
                        const isAfter = (e.clientY > midpoint);

                        // 原生 DOM 垂直插槽重排，物理文档流绝对杜绝重叠
                        if (isAfter) {
                            body.insertBefore(draggedRow, row.nextSibling);
                        } else {
                            body.insertBefore(draggedRow, row);
                        }
                    });
                });
            });
        }

        // ⚡ 穿透刷新用户全景资产权限链路与底层网关连接 (提供全链路显式动效与即时反馈)
        async refreshUserAssetsLineage(btnEl) {
            const icon = btnEl?.querySelector('.pb-refresh-icon');
            const label = btnEl?.querySelector('.pb-refresh-label');
            if (icon) icon.style.animation = 'pb-spin 0.8s linear infinite';
            if (label) label.textContent = '穿透刷新中...';
            if (btnEl) btnEl.disabled = true;

            try {
                this.syncFromGtb();
                const selectedWsIds = Array.from(window.selectedGtbWorkspaceIds || []);
                const curWsId = selectedWsIds[0] || this.currentWorkspaceId;
                const selectedDsIds = Array.from(window.selectedGtbDatasetIds || []);
                let curDsId = selectedDsIds[0] || (this.currentModelKey ? this.currentModelKey.replace(/^real_model_/, '') : '');

                // 若顶栏未直接选中模型但选了工作区，尝试检索该工作区下的第一个模型
                if (!curDsId && curWsId) {
                    const allDatasets = window.getMergedGtbDatasets ? window.getMergedGtbDatasets() : JSON.parse(localStorage.getItem('pbi_datasets') || '[]');
                    const wsDatasets = allDatasets.filter(d => String(d.workspaceId || '').toLowerCase() === String(curWsId).toLowerCase());
                    if (wsDatasets.length > 0) {
                        curDsId = wsDatasets[0].id;
                    }
                }

                if (curDsId) {
                    const cacheKey = `${curWsId || 'global'}_${curDsId}`;
                    if (window._modelDatasourcesCache) {
                        delete window._modelDatasourcesCache[cacheKey];
                    }
                    try {
                        sessionStorage.removeItem('pbi_model_datasources_cache');
                    } catch(e) {}
                    await this.fetchModelConnections(curWsId, curDsId, true);
                }

                // 强制重新渲染矩阵
                this.renderUserAssetsMatrix();

                // 弹出轻量反馈提示与顶部状态栏反馈
                const topBadge = document.getElementById('pb-top-simulated-badge');
                if (topBadge) {
                    const originalText = topBadge.textContent;
                    topBadge.textContent = '⚡ 已完成全景权限链路与数据网关状态穿透刷新！';
                    setTimeout(() => { if (topBadge.textContent.startsWith('⚡')) topBadge.textContent = originalText; }, 2500);
                }

                const toastMsg = curDsId ? '✅ 用户全景权限链路与模型底层官方连接已穿透更新！' : '✅ 用户全景权限链路已刷新 (请在顶栏选择具体模型以检测官方连接)';
                if (typeof window.showNotification === 'function') {
                    window.showNotification(toastMsg, 'success', 2500);
                } else if (typeof window.showToast === 'function') {
                    window.showToast(toastMsg, 'success');
                }
            } catch (err) {
                console.error('刷新链路失败:', err);
                if (typeof window.showNotification === 'function') {
                    window.showNotification('⚠️ 刷新链路异常，请检查网络或登录凭据', 'warn', 3000);
                }
            } finally {
                setTimeout(() => {
                    if (icon) icon.style.animation = '';
                    if (label) label.textContent = '刷新链路';
                    if (btnEl) btnEl.disabled = false;
                }, 400);
            }
        }

        // 重置所有卡片内部权限小条目的上下排列顺序为默认
        resetUserAssetsItemsOrder() {
            try {
                ['tenant', 'workspace', 'model', 'report', 'connection', 'pipeline'].forEach(t => {
                    localStorage.removeItem(`pbi-user-assets-tier-items-${t}`);
                });
                localStorage.removeItem('pbi-user-assets-card-y-offsets');
                localStorage.removeItem('pbi-user-assets-card-order');
            } catch(e) {}
            this.renderUserAssetsMatrix();
            if (typeof window.showNotification === 'function') {
                window.showNotification('✨ 已将所有卡片内部权限条目恢复为默认顺序', 'info', 2000);
            }
        }

        // 兼容重置入口
        resetUserAssetsCardPositions() {
            this.resetUserAssetsItemsOrder();
        }

        resetUserAssetsCardOrder() {
            this.resetUserAssetsItemsOrder();
        }

        // ═════════════════════════════════════════════════════════════════════
        // ⚡ 因果光晕联动 (Hover & Click-to-Pin Causality Glow)
        // ═════════════════════════════════════════════════════════════════════
        initUserAssetsCausalityLinkage(container) {
            if (!container) return;

            // 官方因果关联图谱 (Causality Map: Source Item -> Derivative/Impacted Items)
            const CAUSALITY_MAP = {
                // 1. 租户官方身份 -> 影响全局策略与特权
                'tenant_principal_role': [
                    'tenant_gac_policy', 'tenant_export', 'tenant_web_modeling', 'tenant_xmla', 'tenant_external', 'tenant_embed', 'tenant_certify',
                    'ws_role', 'ws_members', 'ws_delete',
                    'model_write', 'conn_owner', 'pipeline_role', 'pipeline_manage'
                ],
                'tenant_gac_policy': ['conn_gac_perm', 'conn_gac_mashup'],
                'tenant_export': ['report_export'],
                'tenant_web_modeling': ['model_write', 'report_edit'],
                'tenant_xmla': ['model_write'],
                'tenant_external': ['report_share'],
                'tenant_embed': ['report_view'],

                // 2. 工作区官方角色 -> 影响协同编辑、应用发布、模型写回、连接与管道
                'ws_role': [
                    'ws_members', 'ws_edit', 'ws_app', 'ws_capacity', 'ws_delete', 'ws_lineage',
                    'model_write', 'model_reshare', 'model_rls', 'model_gac_ols',
                    'report_edit', 'report_share',
                    'conn_refresh', 'conn_owner', 'conn_share',
                    'pipeline_deploy', 'pipeline_diff', 'pipeline_rules'
                ],
                'ws_members': ['model_reshare', 'report_share', 'conn_share'],
                'ws_edit': ['model_write', 'report_edit'],
                'ws_app': ['report_view', 'report_share'],
                'ws_capacity': ['model_build', 'model_write'],
                'ws_delete': ['ws_target'],
                'ws_lineage': ['report_view', 'model_read'],

                // 3. 语义模型官方权限 -> 影响模型读取、构建与报表查看导出
                'model_permission': [
                    'model_read', 'model_build', 'model_write', 'model_reshare', 'model_gac_ols', 'model_rls',
                    'report_view', 'report_export'
                ],
                'model_read': ['report_view', 'conn_user_perm'],
                'model_build': ['report_export'],
                'model_write': ['report_edit'],
                'model_gac_ols': ['report_view', 'report_export'],
                'model_rls': ['report_view', 'report_export'],
                'model_reshare': ['report_share'],

                // 4. 报表官方访问级别 -> 影响在线交互、编辑与明细导出
                'report_access': [
                    'report_view', 'report_edit', 'report_export', 'report_sub', 'report_share'
                ],
                'report_view': ['report_sub', 'report_export'],
                'report_edit': ['report_export', 'report_share'],
                'report_export': ['report_view'],
                'report_share': ['report_view'],

                // 5. 官方连接与网关 -> 影响数据抽取、GAC与刷新
                'conn_default_ds': ['conn_user_perm', 'conn_gac_perm', 'conn_gac_mashup', 'conn_gw', 'conn_sso', 'conn_refresh', 'conn_owner', 'conn_share', 'model_read'],
                'conn_inspecting': ['conn_gw'],
                'conn_user_perm': ['model_read', 'conn_refresh'],
                'conn_gac_perm': ['conn_gac_mashup', 'model_read'],
                'conn_gac_mashup': ['model_read'],
                'conn_gw': ['model_read', 'conn_refresh'],
                'conn_sso': ['model_read'],
                'conn_refresh': ['model_read'],
                'conn_owner': ['conn_share', 'conn_refresh'],
                'conn_share': ['conn_user_perm'],

                // 6. 部署管道官方角色 -> 影响阶段部署与规则
                'pipeline_role': [
                    'pipeline_deploy', 'pipeline_diff', 'pipeline_rules', 'pipeline_manage', 'pipeline_backward'
                ],
                'pipeline_deploy': ['pipeline_diff', 'pipeline_rules'],
                'pipeline_rules': ['pipeline_deploy'],
                'pipeline_manage': ['pipeline_rules', 'pipeline_backward'],
                'pipeline_backward': ['pipeline_deploy']
            };

            // 构建反向推导索引 (Reverse Causality: Target Item -> Its Source Enablers)
            const REVERSE_MAP = {};
            Object.entries(CAUSALITY_MAP).forEach(([src, targets]) => {
                targets.forEach(tgt => {
                    if (!REVERSE_MAP[tgt]) REVERSE_MAP[tgt] = [];
                    REVERSE_MAP[tgt].push(src);
                });
            });

            // 获取与指定 rowId 关联的所有卡片（包括下游衍生与上游赋权源）
            const getLinkedRowIds = (rowId) => {
                const forward = CAUSALITY_MAP[rowId] || [];
                const reverse = REVERSE_MAP[rowId] || [];
                // 如果是动态连接前缀 conn_real_ds_
                let dynamicConn = [];
                if (rowId.startsWith('conn_real_ds_')) {
                    dynamicConn = CAUSALITY_MAP['conn_default_ds'] || [];
                }
                const set = new Set([...forward, ...reverse, ...dynamicConn]);
                set.delete(rowId);
                return Array.from(set);
            };

            const allRows = container.querySelectorAll('.pb-asset-card-row');

            const clearCausalityVisuals = () => {
                allRows.forEach(r => {
                    r.classList.remove('pb-causality-active', 'pb-causality-pinned', 'pb-causality-target', 'pb-causality-dimmed');
                });
            };

            const applyCausalityVisuals = (activeRow, isPinned = false) => {
                clearCausalityVisuals();
                if (!activeRow) return;

                const rowId = activeRow.getAttribute('data-row-id');
                if (!rowId) return;

                const linkedIds = getLinkedRowIds(rowId);

                // 标记源卡片
                activeRow.classList.add('pb-causality-active');
                if (isPinned) activeRow.classList.add('pb-causality-pinned');

                // 标记关联卡片与其余淡化卡片
                allRows.forEach(r => {
                    if (r === activeRow) return;
                    const id = r.getAttribute('data-row-id');
                    if (linkedIds.includes(id)) {
                        r.classList.add('pb-causality-target');
                    } else {
                        r.classList.add('pb-causality-dimmed');
                    }
                });
            };

            // 监听每个卡片的 Hover 与 Click
            allRows.forEach(row => {
                // 悬停联动 (仅在未锁定时生效)
                row.addEventListener('mouseenter', () => {
                    if (this._pinnedCausalityRow) return;
                    applyCausalityVisuals(row, false);
                });

                row.addEventListener('mouseleave', () => {
                    if (this._pinnedCausalityRow) return;
                    clearCausalityVisuals();
                });

                // 点击锁定或切换
                row.addEventListener('click', (e) => {
                    // 防止点击按钮等其他内嵌控件干扰
                    if (e.target.closest('button, input, select')) return;

                    if (this._pinnedCausalityRow === row) {
                        // 再次点击同一张卡片 -> 取消锁定
                        this._pinnedCausalityRow = null;
                        clearCausalityVisuals();
                    } else {
                        // 点击新卡片 -> 锁定新卡片
                        this._pinnedCausalityRow = row;
                        applyCausalityVisuals(row, true);
                    }
                    e.stopPropagation();
                });
            });

            // 点击空白区域时解除锁定
            if (!container._hasCausalityBlankListener) {
                container._hasCausalityBlankListener = true;
                document.addEventListener('click', (e) => {
                    if (!e.target.closest('.pb-asset-card-row') && this._pinnedCausalityRow) {
                        this._pinnedCausalityRow = null;
                        clearCausalityVisuals();
                    }
                });
            }
        }

        // ═════════════════════════════════════════════════════════════════════
        // ⚠️ 阻断与受限断点速查切换 (Bottlenecks Focus Filter)
        // ═════════════════════════════════════════════════════════════════════
        toggleBottleneckFilter(btnEl) {
            const container = document.getElementById('pb-user-assets-container');
            if (!container) return;

            const isFocus = container.classList.toggle('pb-bottlenecks-focus-mode');
            if (btnEl) btnEl.classList.toggle('active-filter', isFocus);

            if (isFocus) {
                const disabledCount = container.querySelectorAll('.pb-asset-card-row.status-disabled').length;
                const warnCount = container.querySelectorAll('.pb-asset-card-row.status-warn').length;
                const totalIssues = disabledCount + warnCount;
                if (typeof window.showNotification === 'function') {
                    if (totalIssues > 0) {
                        window.showNotification(`⚠️ 已开启断点速查：精准锁定 ${disabledCount} 项阻断与 ${warnCount} 项受限！`, 'warning', 3000);
                    } else {
                        window.showNotification('🎉 当前链路全线放行，未检出任何权限阻断或异常限制！', 'success', 2500);
                    }
                }
            } else {
                if (typeof window.showNotification === 'function') {
                    window.showNotification('✨ 已退出断点速查，恢复全景权限链路总览', 'info', 2000);
                }
            }
        }

        // ═════════════════════════════════════════════════════════════════════
        // 📋 复制权限诊断体检报告至剪贴板 (Copy Audit Summary)
        // ═════════════════════════════════════════════════════════════════════
        async copyAuditSummary(btnEl) {
            const container = document.getElementById('pb-user-assets-container');
            if (!container) return;

            const now = new Date();
            const timeStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;

            // 获取当前模拟主体
            const topBadge = document.getElementById('pb-top-simulated-badge');
            const principalName = topBadge ? topBadge.textContent.trim().replace(/^当前主体:\s*/, '') : '通用基准';

            // 搜集 6 大 Module 的卡片条目信息
            const tierCards = container.querySelectorAll('.pb-asset-tier-card');
            const lines = [];
            lines.push(`=======================================================`);
            lines.push(`🛡️ Power BI 全景资产权限链路诊断体检报告`);
            lines.push(`=======================================================`);
            lines.push(`📅 诊断时间: ${timeStr}`);
            lines.push(`👤 评估主体: ${principalName}`);
            lines.push(`📁 目标工作区: ${this.currentWorkspaceName || '未指定'}`);
            lines.push(`-------------------------------------------------------`);

            const blockedItems = [];
            const restrictedItems = [];
            const passedItems = [];

            tierCards.forEach(card => {
                const title = card.querySelector('.pb-card-title')?.textContent?.trim() || 'Module';
                const heroRole = card.querySelector('.pb-asset-card-row.is-hero-role .pb-asset-prop-name')?.textContent?.trim() || 'N/A';
                const heroStatus = card.querySelector('.pb-asset-card-row.is-hero-role .pb-asset-status-pill')?.textContent?.trim() || '';

                lines.push(`\n【${title}】 官方核心: [${heroRole}] ${heroStatus}`);

                const rows = card.querySelectorAll('.pb-asset-card-row:not(.is-hero-role)');
                rows.forEach(r => {
                    const name = r.querySelector('.pb-asset-prop-name')?.textContent?.trim() || '';
                    const statusText = r.querySelector('.pb-asset-status-pill')?.textContent?.trim() || '';
                    const isDenied = r.classList.contains('status-disabled');
                    const isWarn = r.classList.contains('status-warn');

                    if (isDenied) {
                        blockedItems.push(`  • [${title}] ${name} ➔ ${statusText}`);
                        lines.push(`   ❌ ${name}: ${statusText}`);
                    } else if (isWarn) {
                        restrictedItems.push(`  • [${title}] ${name} ➔ ${statusText}`);
                        lines.push(`   ⚠️ ${name}: ${statusText}`);
                    } else {
                        passedItems.push(name);
                        lines.push(`   ✅ ${name}: ${statusText}`);
                    }
                });
            });

            lines.push(`\n-------------------------------------------------------`);
            lines.push(`🔍 诊断体检排错结论:`);
            if (blockedItems.length === 0 && restrictedItems.length === 0) {
                lines.push(`🎉 状态健康：当前主体在全链路 6 大层级拥有完整权限，无任何拦截或离线隐患！`);
            } else {
                if (blockedItems.length > 0) {
                    lines.push(`⛔ 发现 ${blockedItems.length} 个阻断断点 (Blocked / 403):`);
                    blockedItems.forEach(b => lines.push(b));
                }
                if (restrictedItems.length > 0) {
                    lines.push(`\n⚠️ 发现 ${restrictedItems.length} 个受限/警告项 (Restricted / Warn):`);
                    restrictedItems.forEach(w => lines.push(w));
                }
            }
            lines.push(`=======================================================`);

            const reportText = lines.join('\n');

            try {
                if (navigator.clipboard && navigator.clipboard.writeText) {
                    await navigator.clipboard.writeText(reportText);
                } else {
                    const ta = document.createElement('textarea');
                    ta.value = reportText;
                    document.body.appendChild(ta);
                    ta.select();
                    document.execCommand('copy');
                    document.body.removeChild(ta);
                }
                if (typeof window.showNotification === 'function') {
                    window.showNotification('📋 权限诊断体检报告已成功复制到剪贴板！', 'success', 2500);
                }
            } catch(err) {
                console.error('Failed to copy audit report:', err);
                if (typeof window.showNotification === 'function') {
                    window.showNotification('❌ 复制报告失败，请检查浏览器权限', 'error');
                }
            }
        }
    }

    // 暴露全局单例
    window.PermissionBlueprint = new PermissionBlueprintEngine();

    // 自动自愈侦测：无论脚本何时加载，只要当前激活模块为蓝图或视图可见，立即自启动初始化
    function autoBootstrapBlueprint() {
        if (!window.PermissionBlueprint) return;
        const activeMod = localStorage.getItem('pbi-active-module');
        const viewEl = document.getElementById('view-permission_blueprint');
        const isVisible = viewEl && (viewEl.style.display === 'flex' || (window.getComputedStyle && window.getComputedStyle(viewEl).display === 'flex'));
        if (activeMod === 'permission_blueprint' || isVisible) {
            window.PermissionBlueprint.onActivate();
        }
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', autoBootstrapBlueprint);
    } else {
        setTimeout(autoBootstrapBlueprint, 0);
    }

})();
