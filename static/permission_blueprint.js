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
            roleTag: 'Viewer (RLS 受限)',
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
        'node_ols': { x: 1220, y: 530 }
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
        'port_out_ols_final': { nodeId: 'node_ols', relX: 320, relY: 58 }
    };

    // 蓝图运行时单例
    class PermissionBlueprintEngine {
        constructor() {
            this.activePresetKey = 'preset_developer';
            this.currentModelKey = 'model_sales';
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

            // 深度克隆状态
            this.currentState = JSON.parse(JSON.stringify(USER_PRESETS['preset_developer'].state));
            this.nodePositions = JSON.parse(JSON.stringify(DEFAULT_NODE_COORDS));

            // DOM 引用
            this.viewportEl = null;
            this.contentEl = null;
            this.svgEl = null;
            this.wiresGroupEl = null;
            this.nodesLayerEl = null;
            this.isInitialized = false;
            this.hasCenteredOnce = false;
        }

        // 模块首次激活或切换时调用
        onActivate() {
            if (!this.isInitialized) {
                this.initDOM();
                this.isInitialized = true;
            }
            this.renderNodes();
            this.recalculateAndRenderWires();
            this.updateAuditReport();

            // 首次激活且视图可见时，在下一帧确保包围盒居中
            if (!this.hasCenteredOnce) {
                this.hasCenteredOnce = true;
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

            // 监听全局主题切换
            const themeObserver = new MutationObserver(() => {
                this.recalculateAndRenderWires();
            });
            themeObserver.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme', 'class'] });
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

        // 🎯 核心防丢保障：一键计算所有节点的最小包围盒并自动居中聚焦召回
        locateAndFitAllNodes(showToast = true) {
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
                this.nodePositions = JSON.parse(JSON.stringify(DEFAULT_NODE_COORDS));
                this.renderNodes();
                this.locateAndFitAllNodes(showToast);
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
                this.contentEl.style.transition = 'transform 0.32s cubic-bezier(0.16, 1, 0.3, 1)';
                this.updateCanvasTransform();
                setTimeout(() => {
                    if (this.contentEl) this.contentEl.style.transition = '';
                }, 340);
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

        resetNodePositions() {
            if (!this.isInitialized) {
                this.initDOM();
                this.isInitialized = true;
            }
            this.nodePositions = JSON.parse(JSON.stringify(DEFAULT_NODE_COORDS));
            this.renderNodes();
            this.recalculateAndRenderWires();
            this.locateAndFitAllNodes(false);
            if (typeof window.showNotification === 'function') {
                window.showNotification('已重置蓝图排版并自动平移居中！', 'info');
            }
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

            if (mode === 'user') {
                if (tabUser) tabUser.classList.add('active');
                if (tabModel) tabModel.classList.remove('active');

                // 呈现用户主体专属面板，隐藏模型专属面板
                if (userPrincipalCard) userPrincipalCard.style.display = 'block';
                if (scenariosCard) scenariosCard.style.display = 'block';
                if (modelSelectCard) modelSelectCard.style.display = 'none';
                if (modelUsersCard) modelUsersCard.style.display = 'none';

                // 沙盒画布反馈：短暂微聚焦 L1 用户主体节点
                const userNode = document.getElementById('node_tenant');
                if (userNode) {
                    userNode.classList.add('pb-node-focus-pulse');
                    setTimeout(() => userNode.classList.remove('pb-node-focus-pulse'), 800);
                }

                if (typeof window.showNotification === 'function') {
                    window.showNotification('👤 已切换为【按用户主体】透视：可指定或自定义用户推演其在 6 层的实际有效权限', 'info');
                }
            } else {
                if (tabModel) tabModel.classList.add('active');
                if (tabUser) tabUser.classList.remove('active');

                // 彻底隐藏用户主体选择框！专注模型资产与关联用户矩阵
                if (userPrincipalCard) userPrincipalCard.style.display = 'none';
                if (scenariosCard) scenariosCard.style.display = 'none';
                if (modelSelectCard) modelSelectCard.style.display = 'block';
                if (modelUsersCard) modelUsersCard.style.display = 'block';
                this.renderModelUsersList();

                // 沙盒画布反馈：短暂微聚焦 L3 工作区与模型节点
                const wsNode = document.getElementById('node_workspace');
                if (wsNode) {
                    wsNode.classList.add('pb-node-focus-pulse');
                    setTimeout(() => wsNode.classList.remove('pb-node-focus-pulse'), 800);
                }

                if (typeof window.showNotification === 'function') {
                    window.showNotification('📊 已切换为【按目标模型】透视：已展开当前模型关联的所有主体与权限分布', 'info');
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

            if (typeof window.showNotification === 'function') {
                window.showNotification('✕ 已取消模拟用户，当前蓝图已恢复 6 层权限流转通用基准拓扑', 'info');
            }
        }

        selectUserPreset(presetKey) {
            if (presetKey === 'none') {
                this.clearSimulatedUser();
                return;
            }

            const customBox = document.getElementById('pb-custom-user-box');
            if (presetKey === 'custom') {
                if (customBox) customBox.style.display = 'block';
                return;
            }
            if (customBox) customBox.style.display = 'none';

            this.activePresetKey = presetKey;
            const preset = USER_PRESETS[presetKey];
            if (!preset) return;

            const upnLabel = document.getElementById('pb-current-upn-label');
            const badgeTag = document.getElementById('pb-badge-role-tag');
            if (upnLabel) upnLabel.textContent = preset.upn;
            if (badgeTag) {
                badgeTag.textContent = preset.roleTag;
                badgeTag.style.color = preset.roleColor;
                badgeTag.style.borderColor = `${preset.roleColor}40`;
            }

            this.currentState = JSON.parse(JSON.stringify(preset.state));
            this.renderNodes();
            this.recalculateAndRenderWires();
            this.updateAuditReport();

            if (typeof window.showNotification === 'function') {
                window.showNotification(`✨ 已切换模拟主体为：${preset.name} (${preset.roleTag})`, 'success');
            }
        }

        updateCustomUpn(val) {
            const upnLabel = document.getElementById('pb-current-upn-label');
            if (upnLabel) upnLabel.textContent = val || 'custom.user@contoso.com';
            this.updateAuditReport();
        }

        selectModel(modelKey) {
            this.currentModelKey = modelKey;
            const model = MODEL_DEFINITIONS[modelKey];
            if (!model) return;

            const wsLabel = document.getElementById('pb-model-ws-name');
            if (wsLabel) wsLabel.textContent = model.workspaceName;

            this.exitModelUserDrilldown(false);
            this.renderModelUsersList();
            this.updateAuditReport();

            if (typeof window.showNotification === 'function') {
                window.showNotification(`🗄️ 已切换目标语义模型为：${model.name}`, 'info');
            }
        }

        async fetchRealModelAndUsers() {
            const wsIdInput = document.getElementById('gtb-select-workspace');
            const dsIdInput = document.getElementById('gtb-select-dataset');
            const wsNameEl = document.getElementById('gtb-ws-display-text');
            const dsNameEl = document.getElementById('gtb-ds-display-text');

            const wsId = wsIdInput ? wsIdInput.value : '';
            const dsId = dsIdInput ? dsIdInput.value : '';
            const wsName = (wsNameEl && wsNameEl.textContent !== '-- 选择工作区 --') ? wsNameEl.textContent : '';
            const dsName = (dsNameEl && dsNameEl.textContent !== '-- 选择模型 --') ? dsNameEl.textContent : '';

            if (!wsId) {
                if (typeof window.showNotification === 'function') {
                    window.showNotification('💡 请先在上方顶栏选择要审计的真实工作区（Workspace）！', 'warning');
                }
                return;
            }

            if (typeof window.showNotification === 'function') {
                window.showNotification(`🔄 正在连接微软 Power BI 真实环境抓取 [${wsName || wsId}] 的授权用户...`, 'info');
            }

            try {
                // 1. 调用 proxy 抓取工作区真实用户与直接角色
                const res = await fetch('/api/proxy', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        url: `https://api.powerbi.com/v1.0/myorg/groups/${wsId}/users`,
                        method: 'GET'
                    })
                });
                const data = await res.json();
                let realUsers = [];

                if (res.ok && data && Array.isArray(data.value) && data.value.length > 0) {
                    realUsers = data.value.map(u => {
                        const email = u.emailAddress || u.userPrincipalName || u.identifier || 'unknown@org.com';
                        const role = u.groupUserAccessRight || 'Viewer';
                        const presetKey = `real_${email.replace(/[^a-zA-Z0-9_]/g, '_')}`;

                        // 注册到 USER_PRESETS 中，供沙盒完整流转模拟
                        USER_PRESETS[presetKey] = {
                            id: presetKey,
                            name: u.displayName || email.split('@')[0],
                            upn: email,
                            roleTag: `${role} (真实租户)`,
                            roleColor: role === 'Admin' ? '#60a5fa' : (role === 'Contributor' ? '#34d399' : (role === 'Member' ? '#818cf8' : '#fbbf24')),
                            description: `真实组织工作区 [${wsName}] 中的直属授权主体`,
                            state: {
                                isGuestUser: email.includes('#ext#') || email.toLowerCase().includes('external'),
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
                                rlsEnabled: true,
                                rlsRoleAssigned: 'Region_Assigned',
                                olsEnabled: false,
                                maskedFields: 'Salary, Margin'
                            }
                        };

                        return {
                            upn: email,
                            role: `${role}`,
                            presetId: presetKey
                        };
                    });
                }

                if (realUsers.length === 0) {
                    throw new Error('未获取到工作区成员列表，可能需要管理员身份或个人 Delegated 授权凭据');
                }

                // 2. 动态注册真实模型至 MODEL_DEFINITIONS
                const modelKey = `real_model_${dsId || wsId}`;
                const finalModelName = dsName ? `🟢 真实模型: ${dsName}` : `🟢 真实工作区资产 (${wsName})`;

                MODEL_DEFINITIONS[modelKey] = {
                    id: modelKey,
                    name: finalModelName,
                    workspaceName: wsName || '生产工作区',
                    capacity: '真实租户环境 (Fabric / Premium)',
                    tables: ['Real_Model_Data', 'Security_Mapping'],
                    hasRLS: true,
                    hasOLS: false,
                    users: realUsers
                };

                // 3. 动态注入到模型下拉框
                const selectEl = document.getElementById('pb-model-select');
                if (selectEl) {
                    let opt = selectEl.querySelector(`option[value="${modelKey}"]`);
                    if (!opt) {
                        opt = document.createElement('option');
                        opt.value = modelKey;
                        selectEl.insertBefore(opt, selectEl.firstChild);
                    }
                    opt.textContent = `${finalModelName} - ${wsName}`;
                    selectEl.value = modelKey;
                }

                this.currentModelKey = modelKey;
                const wsLabel = document.getElementById('pb-model-ws-name');
                if (wsLabel) wsLabel.textContent = wsName;

                this.exitModelUserDrilldown(false);
                this.renderModelUsersList();
                this.updateAuditReport();

                if (typeof window.showNotification === 'function') {
                    window.showNotification(`🎉 真实数据同步成功！已载入 ${realUsers.length} 位真实租户用户，可点击任意用户进行 6 层权限流转推演！`, 'success');
                }
            } catch (err) {
                console.warn('Fetch real model error:', err);
                if (typeof window.showNotification === 'function') {
                    window.showNotification(`⚠️ 真实数据抓取提示: ${err.message || '网络或凭据异常'}，已保留预设环境供离线推演`, 'warning');
                }
            }
        }

        syncGlobalModel() {
            const gtbModelNameEl = document.getElementById('gtb-ds-display-text');
            const gtbWsNameEl = document.getElementById('gtb-ws-display-text');

            const mName = gtbModelNameEl ? gtbModelNameEl.textContent : '当前选中模型';
            const wName = gtbWsNameEl ? gtbWsNameEl.textContent : '当前选中工作区';

            const wsLabel = document.getElementById('pb-model-ws-name');
            if (wsLabel) wsLabel.textContent = wName;

            if (typeof window.showNotification === 'function') {
                window.showNotification(`已同步全局上下文: ${mName} (${wName})`, 'info');
            }
        }

        renderModelUsersList() {
            const listEl = document.getElementById('pb-model-user-list');
            const countEl = document.getElementById('pb-model-user-count');
            if (!listEl) return;

            const model = MODEL_DEFINITIONS[this.currentModelKey] || MODEL_DEFINITIONS['model_sales'];
            if (countEl) countEl.textContent = `${model.users.length} 位关联用户`;

            listEl.innerHTML = model.users.map(u => `
                <div class="pb-model-user-row" onclick="window.PermissionBlueprint.loadUserFromModel('${u.presetId}')" style="display: flex; justify-content: space-between; align-items: center; padding: 6px 8px; border-radius: 6px; cursor: pointer; transition: all 0.2s;" title="点击下钻模拟该用户在当前模型中的 6 层有效权限">
                    <div style="display: flex; flex-direction: column; min-width: 0;">
                        <span style="font-size: 0.73rem; font-weight: 600; color: var(--text-primary); white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${u.upn}</span>
                        <span style="font-size: 0.65rem; color: var(--text-secondary);">身份类别: ${USER_PRESETS[u.presetId] ? USER_PRESETS[u.presetId].name : u.role}</span>
                    </div>
                    <span class="gtb-auth-badge" style="font-size: 0.65rem; padding: 2px 6px;">${u.role}</span>
                </div>
            `).join('');
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
        }

        updateStateField(key, val) {
            this.currentState[key] = val;
            this.recalculateAndRenderWires();
            this.updateAuditReport();
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
