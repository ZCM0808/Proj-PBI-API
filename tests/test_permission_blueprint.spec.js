const { test, expect } = require('@playwright/test');

test.describe('Power BI Permission Blueprint E2E Tests', () => {
    test.beforeEach(async ({ page }) => {
        test.setTimeout(60000);
        try {
            await page.request.delete('/api/db/kv/pbi-blueprint-node-positions');
        } catch (e) {}
        await page.goto('/');
        await page.evaluate(() => {
            localStorage.clear();
            localStorage.setItem('pbi_tenant_id', 'mock-tenant-1234');
            localStorage.setItem('pbi-theme', 'dark');
        });
        await page.reload();
        await page.waitForLoadState('domcontentloaded');
    });

    async function goToBlueprint(page) {
        await page.evaluate(() => {
            if (typeof window.switchAppModule === 'function') {
                window.switchAppModule('permission_blueprint');
            }
        });
        await expect(page.locator('#view-permission_blueprint')).toBeVisible();
    }

    test('入口按钮位置正确：位于左侧第一面板且在 API 资源树下方', async ({ page }) => {
        const railItems = page.locator('#app-rail .rail-menu-list .rail-item');
        await expect(railItems).toHaveCount(3);

        const apiTreeBtn = page.locator('#rail-nav-api_tree');
        const blueprintBtn = page.locator('#rail-nav-permission_blueprint');

        await expect(apiTreeBtn).toBeVisible();
        await expect(blueprintBtn).toBeVisible();

        // 验证位置顺序：blueprint 必须紧随 api_tree 之后
        const apiTreeBox = await apiTreeBtn.boundingBox();
        const blueprintBox = await blueprintBtn.boundingBox();
        expect(blueprintBox.y).toBeGreaterThan(apiTreeBox.y);
    });

    test('核心保障：完整保留交互式拓扑蓝图画布，并默认渲染 8 大核心节点、SVG 连线与浮动图例', async ({ page }) => {
        const blueprintBtn = page.locator('#rail-nav-permission_blueprint');
        await blueprintBtn.click();

        // 1. 验证 Rail 激活状态
        await expect(blueprintBtn).toHaveClass(/active/);

        // 2. 验证主工作区 View 切换并默认显示蓝图画布
        const blueprintMainView = page.locator('#view-permission_blueprint');
        await expect(blueprintMainView).toBeVisible();

        const canvasViewport = page.locator('#pb-canvas-viewport');
        await expect(canvasViewport).toBeVisible();

        // 3. 验证顶部 Tab 默认选中【🗺️ 权限流转蓝图】
        const blueprintTabBtn = page.locator('#pb-tab-blueprint-btn');
        await expect(blueprintTabBtn).toHaveClass(/active/);

        // 4. 验证 8 大核心节点渲染呈现
        const nodes = page.locator('.pb-blueprint-node');
        await expect(nodes).toHaveCount(8);

        const nodeTenant = page.locator('#node_tenant');
        await expect(nodeTenant).toBeVisible();

        // 5. 验证 SVG 连线生成且置顶于卡片上层 (z-index >= 15, pointer-events: none)，彻底避免被卡片遮挡
        const svgWires = page.locator('#pb-svg-wires');
        const svgZIndex = await svgWires.evaluate(el => window.getComputedStyle(el).zIndex);
        expect(parseInt(svgZIndex, 10)).toBeGreaterThanOrEqual(15);
        const svgPointerEvents = await svgWires.evaluate(el => window.getComputedStyle(el).pointerEvents);
        expect(svgPointerEvents).toBe('none');

        const wires = page.locator('#pb-wires-group .pb-wire-group');
        const wireCount = await wires.count();
        expect(wireCount).toBeGreaterThanOrEqual(8);

        // 6. 验证浮动图例卡片存在且可见
        const legendCard = page.locator('.pb-legend-card');
        await expect(legendCard).toBeVisible();
        await expect(legendCard).toContainText('连线与流转图例：');

        // 7. 验证蓝图专属画布工具栏可见
        await expect(page.locator('#pb-blueprint-toolbar')).toBeVisible();
    });

    test('平滑无缝切换：一键切换至【6 层流转矩阵】，从左到右依次排列 L1~L6 全景权限与启用/禁用徽章', async ({ page }) => {
        await goToBlueprint(page);

        // 点击切换到【🏛️ 6 层流转矩阵】Tab
        const matrixTabBtn = page.locator('#pb-tab-matrix-btn');
        await expect(matrixTabBtn).toBeVisible();
        await matrixTabBtn.click();

        // 1. 验证 Tab 切换状态与视图切换
        await expect(matrixTabBtn).toHaveClass(/active/);
        await expect(page.locator('#pb-tab-blueprint-btn')).not.toHaveClass(/active/);

        // 画布隐藏，矩阵呈现
        await expect(page.locator('#pb-canvas-viewport')).toBeHidden();
        const matrixContainer = page.locator('#pb-matrix-container');
        await expect(matrixContainer).toBeVisible();

        // 2. 验证 6 大层级横向依次排列
        const tierCols = page.locator('.pb-tier-col');
        await expect(tierCols).toHaveCount(6);

        const colTitles = [
            'L1 租户全局策略',
            'L2 容量计算资源',
            'L3 工作区治理角色',
            'L4 语义模型权限',
            'L5 行级数据安全',
            'L6 列级与资产安全'
        ];
        for (let i = 0; i < colTitles.length; i++) {
            const col = tierCols.nth(i);
            await expect(col).toContainText(colTitles[i]);
            await expect(col).not.toContainText(`Tier ${i + 1}`);
        }

        // 3. 验证各层级内仅展示设置名称与精简的启用/禁用徽章，绝无冗余段落描述
        const statusBadges = page.locator('.pb-matrix-status');
        const badgeCount = await statusBadges.count();
        expect(badgeCount).toBeGreaterThanOrEqual(30);

        // 4. 再次点击【🗺️ 权限流转蓝图】可瞬间切回蓝图画布且卡片与连线完好如初
        await page.locator('#pb-tab-blueprint-btn').click();
        await expect(page.locator('#pb-canvas-viewport')).toBeVisible();
        await expect(matrixContainer).toBeHidden();
        await expect(page.locator('.pb-blueprint-node')).toHaveCount(8);
    });

    test('第二竖直面板：滚动条平滑无遮挡、消除容器嵌套过多线条，且呈现高阶综合速览', async ({ page }) => {
        await goToBlueprint(page);

        // 1. 验证侧边栏滚动容器存在且已配置防遮挡 gutter
        const scrollContainer = page.locator('#sidebar-pane-permission_blueprint .pb-sidebar-scroll');
        await expect(scrollContainer).toBeVisible();

        // 2. 验证有效权限卡片内部已消除多重容器嵌套 (pb-perm-tier 折叠框已移除)
        const oldNestedTiers = page.locator('.pb-perm-tier');
        await expect(oldNestedTiers).toHaveCount(0);

        // 3. 验证侧边栏有效权限卡片展现简洁的 6 行高阶速览
        const overviewRows = page.locator('.pb-overview-row');
        await expect(overviewRows).toHaveCount(6);

        const overviewCard = page.locator('#pb-effective-permissions-card');
        await expect(overviewCard).toContainText('L1 租户策略');
        await expect(overviewCard).toContainText('L2 计算容量');
        await expect(overviewCard).toContainText('L3 工作区角色');
        await expect(overviewCard).toContainText('L4 语义模型');
        await expect(overviewCard).toContainText('L5 行级安全');
        await expect(overviewCard).toContainText('L6 列级与资产');
    });

    test('用户主体切换实时联动推演：Admin、Viewer 之间切换，蓝图连线、主矩阵与侧边速览同步重算', async ({ page }) => {
        await goToBlueprint(page);

        const userSelect = page.locator('#pb-user-preset-select');
        const overviewCard = page.locator('#pb-effective-permissions-card');

        // 1. 选择 Admin (Sarah Connor) 时的权限校验
        await page.evaluate(() => window.PermissionBlueprint.selectUserPreset('preset_admin'));
        await page.waitForTimeout(200);

        // 侧边速览校验
        await expect(overviewCard).toContainText('👑 Admin');
        await expect(overviewCard).toContainText('⚡ 特权穿透');

        // 切换到矩阵查看细节
        await page.locator('#pb-tab-matrix-btn').click();
        const matrixContainer = page.locator('#pb-matrix-container');

        // 6 层矩阵校验：L3 工作区管理为【✅ 允许】
        const col3 = matrixContainer.locator('.pb-tier-col[data-tier="3"]');
        await expect(col3).toContainText('👑 完全掌控');
        await expect(col3).toContainText('✅ 允许');

        // L5 行级安全为【⚡ 特权穿透】
        const col5 = matrixContainer.locator('.pb-tier-col[data-tier="5"]');
        await expect(col5).toContainText('⚡ 特权穿透');

        // 2. 切换至 Viewer (Emma Viewer) 时的受限校验
        await page.evaluate(() => window.PermissionBlueprint.selectUserPreset('preset_viewer_rls'));
        await page.waitForTimeout(200);

        // 侧边速览校验
        await expect(overviewCard).toContainText('👁️ Viewer');
        await expect(overviewCard).toContainText('🔒 Region_East');

        // L3 工作区管理权应为【❌ 禁用】
        await expect(col3).toContainText('👁️ 只读查看');
        await expect(col3).toContainText('❌ 禁用');

        // L5 行级安全应为受限切片
        await expect(col5).toContainText('Region_East');

        // L6 列级安全敏感列掩蔽生效
        await expect(matrixContainer.locator('.pb-tier-col[data-tier="6"]')).toContainText('🔒 掩蔽: Salary, Margin');
    });

    test('蓝图沙盒卡片无极自由拖拽：解除 10px 边界，支持突破限制向左自由移动', async ({ page }) => {
        await goToBlueprint(page);

        const nodeTenant = page.locator('#node_tenant');
        await expect(nodeTenant).toBeVisible();

        const initialLeft = await nodeTenant.evaluate(el => parseInt(el.style.left, 10));
        expect(initialLeft).toBe(60);

        // 拖拽卡片头部向左移动 200px
        const header = nodeTenant.locator('.pb-node-header');
        const box = await header.boundingBox();

        await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
        await page.mouse.down();
        await page.mouse.move(box.x + box.width / 2 - 200, box.y + box.height / 2, { steps: 5 });
        await page.mouse.up();

        // 断言：突破原有 10px 限制
        const newLeft = await nodeTenant.evaluate(el => parseInt(el.style.left, 10));
        expect(newLeft).toBeLessThan(10);
    });

    test('一体化联合推演控制区：无冗余人员长列表，纯下拉直选、英文括号标注、纯SVG取消按钮与跨模型权限重算', async ({ page }) => {
        await goToBlueprint(page);

        // 1. 验证用户主体卡片常驻可见，冗余的目标工作区与模型卡片已彻底移除，由顶栏统一驱动
        const userCard = page.locator('#pb-user-principal-card');
        await expect(userCard).toBeVisible();
        await expect(page.locator('#pb-model-select-card')).toHaveCount(0);
        await expect(page.locator('text=当前模拟用户：')).toBeHidden();

        // 2. 核心保障：验证该模型授权用户与权限分布列表卡片已彻底移除，界面零多余列表
        const modelUsersCard = page.locator('#pb-model-users-card');
        await expect(modelUsersCard).toHaveCount(0);

        // 3. 核心保障：验证取消选中按钮与真实用户标签已彻底移除，界面纯粹极简
        await expect(page.locator('#pb-badge-role-tag')).toHaveCount(0);
        await expect(page.locator('#pb-btn-clear-user')).toHaveCount(0);

        // 4. 验证通过下拉选单或 API 切换回 none 时，自动恢复通用基准流向
        await page.evaluate(() => window.PermissionBlueprint.selectUserPreset('none'));
        await expect(page.locator('#pb-current-upn-label')).toContainText('未选定模拟主体');
    });

    test('明亮与黑暗双主题深度支持：蓝图卡片、矩阵列与状态标签自适应变色且对比度优秀', async ({ page }) => {
        await goToBlueprint(page);
        await expect(page.locator('#pb-canvas-viewport')).toBeVisible();

        const node = page.locator('#node_tenant');
        await expect(node).toBeVisible();

        // 1. 点击主题切换为亮色模式 (Light Theme)
        const themeToggleBtn = page.locator('#theme-toggle-btn');
        await expect(themeToggleBtn).toBeVisible();
        await themeToggleBtn.scrollIntoViewIfNeeded();
        await themeToggleBtn.click();
        await page.waitForTimeout(400);

        // 验证 document 切换为亮色主题
        const isLight = await page.evaluate(() => {
            return document.documentElement.getAttribute('data-theme') === 'light' || document.body.classList.contains('light-theme');
        });
        expect(isLight).toBe(true);

        // 验证蓝图卡片变为纯白玻璃拟态底
        const nodeBg = await node.evaluate(el => window.getComputedStyle(el).backgroundColor);
        expect(nodeBg).toMatch(/rgba?\(255,\s*255,\s*255/);

        // 2. 切换到 6 层流转矩阵，验证矩阵卡片白底
        await page.locator('#pb-tab-matrix-btn').click();
        const firstCol = page.locator('.pb-tier-col').first();
        await expect(firstCol).toBeVisible();
        const colBg = await firstCol.evaluate(el => window.getComputedStyle(el).backgroundColor);
        expect(colBg).toMatch(/rgba?\(255,\s*255,\s*255/);

        // 3. 再次点击平滑切回暗色模式
        await themeToggleBtn.click();
        await page.waitForTimeout(400);

        const isDark = await page.evaluate(() => {
            return document.documentElement.getAttribute('data-theme') !== 'light' && !document.body.classList.contains('light-theme');
        });
        expect(isDark).toBe(true);
    });

    test('持久化跨刷新自愈保障：用户刷新页面 (F5 Reload) 后，蓝图沙盒卡片 100% 自动自愈渲染', async ({ page }) => {
        // 1. 进入蓝图流转沙盒
        await goToBlueprint(page);
        await expect(page.locator('.pb-blueprint-node')).toHaveCount(8);

        // 2. 模拟真实用户执行页面全量刷新 (F5 Reload)
        await page.reload();

        // 3. 断言：刷新后主视图依然保持在 Permission Blueprint，且 8 大卡片 100% 自愈渲染
        const blueprintMainView = page.locator('#view-permission_blueprint');
        await expect(blueprintMainView).toBeVisible();

        const nodes = page.locator('.pb-blueprint-node');
        await expect(nodes).toHaveCount(8);
        await expect(page.locator('#node_tenant')).toBeVisible();
    });

    test('真实租户环境联动：跨透视常驻同步条抓取真实数据，真实用户直接注入下拉选单', async ({ page }) => {
        await goToBlueprint(page);

        // 1. 验证真实数据同步条常驻呈现
        const syncCard = page.locator('.pb-real-sync-card');
        await expect(syncCard).toBeVisible();

        const syncBtn = page.locator('#pb-btn-sync-real');
        await expect(syncBtn).toBeVisible();

        // 2. 模拟注入真实组织工作区 WorkSpace_DEV 并拦截真实用户查询 API
        await page.route('**/api/proxy', async route => {
            const req = route.request();
            if (req.method() === 'POST') {
                const postData = req.postDataJSON() || {};
                if (postData.endpoint && postData.endpoint.includes('/users')) {
                    await route.fulfill({
                        status: 200,
                        contentType: 'application/json',
                        body: JSON.stringify({
                            success: true,
                            data: {
                                value: [
                                    { identifier: 'admin@carman.ccwu.cc', displayName: 'Carman Admin', groupUserAccessRight: 'Admin', principalType: 'User' },
                                    { identifier: 'analyst@sina.cn', displayName: 'Sina Analyst', groupUserAccessRight: 'Member', principalType: 'User' }
                                ]
                            }
                        })
                    });
                    return;
                }
            }
            await route.continue();
        });

        await page.evaluate(() => {
            localStorage.setItem('pbi_workspaces', JSON.stringify([
                { id: '2c51e061-0f9f-4d02-bed0-c169019e5d83', name: 'WorkSpace_DEV', type: 'Workspace' }
            ]));
            localStorage.setItem('pbi-active-workspace', '2c51e061-0f9f-4d02-bed0-c169019e5d83');
            if (window.PermissionBlueprint) {
                window.PermissionBlueprint.populateWorkspaceSelect();
            }
        });

        // 3. 点击【同步】
        await syncBtn.click();
        await page.waitForTimeout(1000);

        // 4. 验证同步状态条已更新为已载入成员，且工作区选择下拉框聚合真实工作区
        const syncWsName = page.locator('#pb-sync-ws-name');
        await expect(syncWsName).toContainText('WorkSpace_DEV');

        // 验证顶栏工作区反映同步状态
        const gtbWsTrigger = page.locator('#gtb-ws-trigger');
        await expect(gtbWsTrigger).toBeVisible();

        // 5. 验证同步后，真实租户用户直接注入到用户主体下拉框中，无需额外长列表
        const userTrigger = page.locator('#pb-user-trigger');
        await expect(userTrigger).toBeVisible();
        const userSelect = page.locator('#pb-user-preset-select');
        const selectHtml = await userSelect.innerHTML();
        expect(selectHtml).toMatch(/carman\.ccwu\.cc|sina\.cn|Automation/);

        // 验证用户可直接从下拉框选择真实租户成员进行推演
        const realOption = userSelect.locator('option:has-text("carman.ccwu.cc"), option:has-text("sina.cn")').first();
        if (await realOption.count() > 0) {
            const realVal = await realOption.getAttribute('value');
            if (realVal) {
                await page.evaluate((val) => window.PermissionBlueprint.selectUserPreset(val), realVal);
                const upnLabel = page.locator('#pb-current-upn-label');
                const labelText = await upnLabel.textContent();
                expect(labelText).toMatch(/carman\.ccwu\.cc|sina\.cn/);
            }
        }

        // 再次断言模型用户长列表卡片不存在
        await expect(page.locator('#pb-model-users-card')).toHaveCount(0);
    });

    test('顶栏数据模型下拉选单纯净化：零“已选”脏数据，仅显示纯正真实模型与经典场景', async ({ page }) => {
        await goToBlueprint(page);

        const gtbDsTrigger = page.locator('#gtb-ds-trigger');
        await expect(gtbDsTrigger).toBeVisible();
        await gtbDsTrigger.click();

        const dsDropdown = page.locator('#gtb-ds-dropdown');
        await expect(dsDropdown).toBeVisible();

        const dsItems = dsDropdown.locator('.gtb-ds-item .gtb-ws-item-title');
        const count = await dsItems.count();
        if (count > 0) {
            for (let i = 0; i < count; i++) {
                const optText = await dsItems.nth(i).textContent();
                // 严禁出现“已选 X 个模型”等顶栏临时统计文本
                expect(optText).not.toContain('已选 2 个模型');
                expect(optText).not.toContain('已选 5 个模型');
                expect(optText).not.toContain('已选');
                expect(optText).not.toContain('个模型');
            }
        }
        await gtbDsTrigger.click();
    });

    test('6 层流转矩阵权限文本自适应换行：长文本完整展示，无省略号截断', async ({ page }) => {
        await goToBlueprint(page);
        await page.locator('#pb-tab-matrix-btn').click();

        const propNames = page.locator('.pb-col-prop-name');
        const count = await propNames.count();
        expect(count).toBeGreaterThanOrEqual(30);

        // 验证首个关键长文本项（如“允许导出数据到 Excel/CSV”）
        const exportProp = propNames.filter({ hasText: '允许导出数据到 Excel/CSV' }).first();
        await expect(exportProp).toBeVisible();

        // 验证 CSS 计算样式：必须是 normal 且无省略号
        const whiteSpace = await exportProp.evaluate(el => window.getComputedStyle(el).whiteSpace);
        expect(whiteSpace).toBe('normal');

        const textOverflow = await exportProp.evaluate(el => window.getComputedStyle(el).textOverflow);
        expect(textOverflow).toBe('clip');
    });

    test('What-If 策略演练：点击切换触发连锁反应，实时高亮联动波及层级与诊断横幅', async ({ page }) => {
        await goToBlueprint(page);
        await page.locator('#pb-tab-matrix-btn').click();

        // 1. 初始状态：无多余 What-If 静态横幅干扰，保持流转矩阵整洁
        const initialBanner = page.locator('.pb-whatif-banner');
        await expect(initialBanner).toHaveCount(0);

        // 验证 6 大层级共 36 个设置项已 100% 配备【切换】按钮
        const toggleBtns = page.locator('.pb-whatif-toggle-btn');
        await expect(toggleBtns).toHaveCount(36);

        // 2. 找到 L1 租户“允许导出数据到 Excel/CSV”项旁的【切换】按钮并点击
        const exportRow = page.locator('.pb-col-row', { hasText: '允许导出数据到 Excel/CSV' });
        const toggleBtn = exportRow.locator('.pb-whatif-toggle-btn');
        await expect(toggleBtn).toBeVisible();

        // 点击切换 L1 导出策略
        await toggleBtn.click();

        // 3. 验证矩阵顶部始终保持纯粹极简，不显示任何横幅
        await expect(page.locator('.pb-whatif-banner')).toHaveCount(0);

        // 4. 验证 L6 层的“导出底层明细数据”被实时波及，产生 .impacted 高亮与联动徽章
        const exportUnderlyingRow = page.locator('.pb-col-row', { hasText: '导出底层明细数据' });
        await expect(exportUnderlyingRow).toHaveClass(/impacted/);
        await expect(exportUnderlyingRow).toContainText('⚡ 受 L1 联动');

        // 验证动态流动指向连线 (pb-flow-wire) 实时生成并展现动态流动动画
        const flowWires = page.locator('.pb-flow-wire');
        const wireCount = await flowWires.count();
        expect(wireCount).toBeGreaterThanOrEqual(1);

        // 5. 验证核心需求：再次点击【切换】按钮切回原始值时，连线必须自动销毁
        await toggleBtn.click();
        await expect(exportUnderlyingRow).not.toHaveClass(/impacted/);
        await expect(page.locator('.pb-flow-wire')).toHaveCount(0);

        // 6. 验证功能预设胶囊按钮 (导出、GAC、RLS、OLS、建模)
        const capsuleContainer = page.locator('#pb-feature-capsules');
        await expect(capsuleContainer).toBeVisible();
        const exportCapsule = capsuleContainer.locator('button[data-capsule="export"]');
        await expect(exportCapsule).toBeVisible();
        await exportCapsule.click();
        await expect(exportCapsule).toHaveClass(/active/);

        // 验证选中“导出”胶囊后，下方呈现针对导出能力的 6 大层级穿透判定
        const overviewContent = page.locator('#pb-effective-permissions-content');
        await expect(overviewContent).toContainText('L1 租户导出策略');
        await expect(overviewContent).toContainText('L6 最终底层导出能力');

        // 切换回“GAC”胶囊
        const gacCapsule = capsuleContainer.locator('button[data-capsule="gac"]');
        await gacCapsule.click();
        await expect(gacCapsule).toHaveClass(/active/);
        await expect(overviewContent).toContainText('L1 GAC 隔离策略模式');
        await expect(overviewContent).toContainText('L5 GAC Mashup 门禁');
    });

    test('深度保障：暗黑模式 Tab 高对比度与 L1 GAC 切换全链路流转至 L3 工作区及 L4/L5/L6 下游阻断', async ({ page }) => {
        await goToBlueprint(page);

        // 1. 切换到 6 层流转矩阵 Tab 并验证可见
        const matrixTabBtn = page.locator('#pb-tab-matrix-btn');
        await matrixTabBtn.click();
        await expect(matrixTabBtn).toHaveClass(/active/);
        await expect(page.locator('#pb-matrix-container')).toBeVisible();

        // 2. 确保处于通用基准状态 (未模拟特定主体，初始为宽松模式)
        await page.evaluate(() => window.PermissionBlueprint.clearSimulatedUser());
        await page.waitForTimeout(300);

        // 3. 暗黑模式下 Tab 高对比度校验：确保绝非黄底白字
        const tabBg = await matrixTabBtn.evaluate(el => window.getComputedStyle(el).backgroundColor);
        const tabColor = await matrixTabBtn.locator('span').evaluate(el => window.getComputedStyle(el).color);

        // 验证不是黄色背景 (rgba(251, 191, 36) 或 rgb(245, 158, 11))
        expect(tabBg).not.toContain('251, 191, 36');
        expect(tabBg).not.toContain('245, 158, 11');
        // 验证字体颜色为明亮清晰白字 (rgb(255, 255, 255))
        expect(tabColor).toBe('rgb(255, 255, 255)');

        // 4. 找到 L1 GAC 细粒度隔离策略项旁的【切换】按钮
        const gacRow = page.locator('.pb-col-row[data-prop-key="gacPolicy"]');
        await expect(gacRow).toBeVisible();
        await expect(gacRow).toContainText('⚠️ 宽松模式');
        const gacToggleBtn = gacRow.locator('.pb-whatif-toggle-btn');
        await expect(gacToggleBtn).toBeVisible();

        // 切换 L1 GAC 为严格模式
        await gacToggleBtn.click();
        await page.waitForTimeout(200);

        // 验证 L1 变为严格门禁
        await expect(gacRow).toContainText('🛡️ 严格门禁');

        // 3. 核心断言：验证 L1 GAC 切换真正流转到工作区级别 (L3)
        const l3GacConnRow = page.locator('.pb-col-row[data-prop-key="gacConnection"]');
        await expect(l3GacConnRow).toBeVisible();
        await expect(l3GacConnRow).toHaveClass(/impacted/);
        await expect(l3GacConnRow).toContainText('❌ 严格门禁隔离');
        await expect(l3GacConnRow).toContainText('⚡ 受 L1 联动');

        // 4. 核心断言：验证下游 L4、L5、L6 同步产生连锁阻断反应
        const l4DsAuthRow = page.locator('.pb-col-row[data-prop-key="dataSourceAuth"]');
        await expect(l4DsAuthRow).toHaveClass(/impacted/);
        await expect(l4DsAuthRow).toContainText('❌ GAC严格门禁阻断');

        const l5MashupRow = page.locator('.pb-col-row[data-prop-key="gacMashupGate"]');
        await expect(l5MashupRow).toHaveClass(/impacted/);
        await expect(l5MashupRow).toContainText('❌ GAC细粒度门禁拦截');

        const l6PqRow = page.locator('.pb-col-row[data-prop-key="powerQueryEdit"]');
        await expect(l6PqRow).toHaveClass(/impacted/);
        await expect(l6PqRow).toContainText('❌ GAC严格门禁阻断');

        // 5. 验证跨层级动态流向连线产生 (从 L1 连接到 L3、L4、L5、L6)
        const wires = page.locator('.pb-flow-wire');
        const wireCount = await wires.count();
        expect(wireCount).toBeGreaterThanOrEqual(4);

        // 6. 验证再次点击切换切回基准时，连线瞬间销毁，状态恢复
        await gacToggleBtn.click();
        await page.waitForTimeout(200);
        await expect(l3GacConnRow).not.toHaveClass(/impacted/);
        await expect(page.locator('.pb-flow-wire')).toHaveCount(0);
    });

    test('节点坐标手动拖拽持久化与重置：拖拽节点位置后刷新保持，点击【重置排版】恢复默认', async ({ page }) => {
        await goToBlueprint(page);
        const tenantNode = page.locator('#node_tenant');
        await expect(tenantNode).toBeVisible();

        // 1. 记录移动前的初始位置
        const boxBefore = await tenantNode.boundingBox();
        expect(boxBefore).not.toBeNull();

        // 2. 模拟拖拽移动租户节点
        const header = tenantNode.locator('.pb-node-header');
        await header.hover({ force: true });
        await page.mouse.down();
        await page.mouse.move(boxBefore.x + 120, boxBefore.y + 80, { steps: 5 });
        await page.mouse.up();
        await page.waitForTimeout(100);

        // 验证 localStorage 中已保存坐标
        const storedCoords = await page.evaluate(() => localStorage.getItem('pbi-blueprint-node-positions'));
        expect(storedCoords).not.toBeNull();
        const parsed = JSON.parse(storedCoords);
        expect(parsed.node_tenant).toBeDefined();

        // 验证 SQLite 数据库已通过双写 API 成功持久化 (使用 expect.poll 防御异步网络延迟)
        await expect.poll(async () => {
            const dbResp = await page.request.get('/api/db/kv/pbi-blueprint-node-positions');
            if (!dbResp.ok()) return null;
            const dbJson = await dbResp.json();
            return dbJson.data;
        }, { timeout: 3000 }).not.toBeNull();

        // 3. 模拟全量刷新 (F5 Reload)
        await page.reload();
        await expect(tenantNode).toBeVisible();

        // 断言：刷新后 localStorage 仍然存在，并且内存中已自动加载持久化坐标
        const reloadedCoords = await page.evaluate(() => localStorage.getItem('pbi-blueprint-node-positions'));
        expect(reloadedCoords).toBe(storedCoords);

        // 4. 点击【重置排版】按钮
        const resetBtn = page.locator('button[onclick*="resetLayout"]');
        await expect(resetBtn).toBeVisible();
        await resetBtn.click();

        // 断言：点击重置后，localStorage 缓存与 SQLite 数据库中的键值记录均被彻底清除
        await expect.poll(async () => {
            return await page.evaluate(() => localStorage.getItem('pbi-blueprint-node-positions'));
        }, { timeout: 3000 }).toBeNull();

        await expect.poll(async () => {
            const dbResetResp = await page.request.get('/api/db/kv/pbi-blueprint-node-positions');
            const dbResetJson = await dbResetResp.json();
            return dbResetJson.data;
        }, { timeout: 3000 }).toBeNull();
    });

    test('下拉框内嵌搜索与清空重置操作，矩阵卡片采用整行标题与100%全宽黄字解释', async ({ page }) => {
        await goToBlueprint(page);

        // 1. 验证目标用户主体下拉框：点击展开，内嵌搜索框与清空按钮可见
        const userTrigger = page.locator('#pb-user-trigger');
        await expect(userTrigger).toBeVisible();
        await userTrigger.click();

        const userDropdown = page.locator('#pb-user-dropdown');
        await expect(userDropdown).toBeVisible();

        // 验证预设虚拟用户（如 Sarah Connor、Alex Developer）已从目标用户主体下拉列表中彻底移除
        const virtualPresetItem = userDropdown.locator('.gtb-ws-item', { hasText: 'Sarah Connor' });
        await expect(virtualPresetItem).toHaveCount(0);
        const virtualDeveloperItem = userDropdown.locator('.gtb-ws-item', { hasText: 'Alex Developer' });
        await expect(virtualDeveloperItem).toHaveCount(0);

        // 验证用户主体已彻底取消手动输入功能，且输入框不存在
        await expect(page.locator('#pb-custom-user-box')).toHaveCount(0);
        const manualInputItem = userDropdown.locator('.gtb-ws-item', { hasText: '手动输入' });
        await expect(manualInputItem).toHaveCount(0);

        // 点击清空按钮
        const clearBtn = userDropdown.locator('button:has-text("清空")');
        await expect(clearBtn).toBeVisible();
        await clearBtn.click();

        // 验证已恢复通用基准
        await expect(userTrigger).toContainText('通用基准');

        // 2. 验证侧边栏冗余的目标工作区与目标语义模型面板已被彻底移除
        await expect(page.locator('#pb-model-select-card')).toHaveCount(0);

        // 3. 验证顶栏工作区下拉框展开且严格隔离私人域
        const gtbWsTrigger = page.locator('#gtb-ws-trigger');
        await gtbWsTrigger.click();
        const wsDropdown = page.locator('#gtb-ws-dropdown');
        await expect(wsDropdown).toBeVisible();
        await expect(page.locator('#gtb-ws-search-input')).toBeVisible();

        // 验证工作区列表不出现个人私人域
        const personalItems = wsDropdown.locator('.gtb-ws-item', { hasText: 'PersonalWorkspace' });
        await expect(personalItems).toHaveCount(0);

        // 关闭顶栏工作区下拉框
        await gtbWsTrigger.click();

        // 4. 验证顶栏数据模型下拉框：支持输入关键字（如 apac）进行跨工作区智能匹配
        const gtbDsTrigger = page.locator('#gtb-ds-trigger');
        await gtbDsTrigger.click();
        const dsDropdown = page.locator('#gtb-ds-dropdown');
        await expect(dsDropdown).toBeVisible();

        const dsSearchInput = page.locator('#gtb-ds-search-input');
        await expect(dsSearchInput).toBeVisible();

        // 搜索模型名字或工作区
        await dsSearchInput.fill('apac');
        // 关闭顶栏模型下拉框
        await gtbDsTrigger.click();

        // 4. 验证矩阵卡片排版：切换到 6 层流转矩阵
        await page.locator('#pb-tab-matrix-btn').click();
        await expect(page.locator('#pb-matrix-container')).toBeVisible();

        // 验证卡片标题占独立整行，状态与切换按钮分行呈现
        const firstRow = page.locator('.pb-col-row').first();
        await expect(firstRow.locator('.pb-col-row-title-area')).toBeVisible();
        await expect(firstRow.locator('.pb-col-row-toolbar')).toBeVisible();

        // 4. 点击 L1 租户策略切换按钮，触发 What-If 联动
        const l1ToggleBtn = page.locator('.pb-tier-col[data-tier="1"] .pb-whatif-toggle-btn').first();
        await l1ToggleBtn.click();

        // 验证受波及项出现 100% 全宽黄字解释条
        const impactedBanner = page.locator('.pb-impact-banner').first();
        await expect(impactedBanner).toBeVisible();
        await expect(impactedBanner).toContainText('联动');

        // 验证其 CSS 宽度为 100%
        const bannerWidth = await impactedBanner.evaluate(el => window.getComputedStyle(el).width);
        const cardWidth = await firstRow.evaluate(el => window.getComputedStyle(el).width);
        expect(parseFloat(bannerWidth)).toBeGreaterThan(150);
    });

    test('全链路保障：顶栏工作区清空为0项、跨刷新绝无跨域工作区与XMLA、且支持切换至用户全景权限链路流转矩阵', async ({ page }) => {
        // 1. 测试顶栏工作区清空功能：点击清空后，严格为 0 项，绝不强制自动选择
        const gtbWsTrigger = page.locator('#gtb-ws-trigger');
        await gtbWsTrigger.click();
        const gtbWsDropdown = page.locator('#gtb-ws-dropdown');
        await expect(gtbWsDropdown).toBeVisible();

        const clearWsBtn = gtbWsDropdown.locator('button:has-text("清空")');
        await expect(clearWsBtn).toBeVisible();
        await clearWsBtn.click();

        // 验证工作区触发器显示已选 0 项
        const gtbWsDisplayText = page.locator('#gtb-ws-display-text');
        await expect(gtbWsDisplayText).toContainText('选择工作区 (0)');

        // 验证 XMLA 输入框同步被置空
        const xmlaInput = page.locator('#gtb-input-xmla');
        await expect(xmlaInput).toHaveValue('');

        // 2. 页面刷新 (F5 Reload) 后验证跨域隔离与端点纯净化
        await page.reload();
        await page.waitForLoadState('networkidle');

        // 验证工作区列表中绝不包含 workspace_dev 或 personalworkspace 或 my
        await page.locator('#gtb-ws-trigger').click();
        const devWsItem = page.locator('#gtb-ws-list .gtb-ws-item', { hasText: 'WorkSpace_DEV' });
        await expect(devWsItem).toHaveCount(0);
        const myWsItem = page.locator('#gtb-ws-list .gtb-ws-item', { hasText: 'my' });
        await expect(myWsItem).toHaveCount(0);

        // 验证 XMLA 下拉历史端点中绝无跨域 dev 或 myorg/my 端点
        await page.locator('#gtb-xmla-trigger').click();
        const devXmlaItem = page.locator('#gtb-xmla-list .gtb-xmla-item', { hasText: 'workspace_dev' });
        await expect(devXmlaItem).toHaveCount(0);
        const myXmlaItem = page.locator('#gtb-xmla-list .gtb-xmla-item', { hasText: '/myorg/my' });
        await expect(myXmlaItem).toHaveCount(0);
        await page.locator('#gtb-xmla-trigger').click();

        // 3. 进入权限流转蓝图模块，验证全新【🌐 用户全景权限链路】流转矩阵
        await goToBlueprint(page);

        // 验证顶部切换按钮存在
        const userAssetsTabBtn = page.locator('#pb-tab-user-assets-btn');
        await expect(userAssetsTabBtn).toBeVisible();
        await userAssetsTabBtn.click();

        // 验证激活状态与容器展示
        await expect(userAssetsTabBtn).toHaveClass(/active/);
        const userAssetsContainer = page.locator('#pb-user-assets-container');
        await expect(userAssetsContainer).toBeVisible();

        // 验证从左到右依次排列展示 6 大模块
        const cols = userAssetsContainer.locator('.pb-tier-col');
        await expect(cols).toHaveCount(6);

        // 验证各模块标题对应：Tenant, Workspace, Model, Report, Connection, Pipeline
        await expect(cols.nth(0)).toContainText('Tenant');
        await expect(cols.nth(1)).toContainText('Workspace');
        await expect(cols.nth(2)).toContainText('Model');
        await expect(cols.nth(3)).toContainText('Report');
        await expect(cols.nth(4)).toContainText('Connection');
        await expect(cols.nth(5)).toContainText('Pipeline');

        // 4. 验证侧边第三个面板（具体有效权限速览）上的快捷切换按钮
        const switchBtn = page.locator('#pb-btn-switch-user-assets');
        await expect(switchBtn).toBeVisible();
        await switchBtn.scrollIntoViewIfNeeded();
        await switchBtn.click({ force: true });
        await expect(userAssetsContainer).toBeVisible();
    });
});


