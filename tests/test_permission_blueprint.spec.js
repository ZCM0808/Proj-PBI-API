const { test, expect } = require('@playwright/test');

test.describe('Power BI Permission Blueprint E2E Tests', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('/');
        await page.evaluate(() => {
            localStorage.clear();
            localStorage.setItem('pbi_tenant_id', 'mock-tenant-1234');
            localStorage.setItem('pbi-theme', 'dark');
        });
        await page.reload();
    });

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

    test('点击 Blueprint 菜单项能无缝切换侧边栏与主工作区，并渲染 8 大核心节点与连线', async ({ page }) => {
        const blueprintBtn = page.locator('#rail-nav-permission_blueprint');
        await blueprintBtn.click();

        // 1. 验证 Rail 激活状态
        await expect(blueprintBtn).toHaveClass(/active/);

        // 2. 验证二级侧边栏 Pane 切换
        const blueprintSidePane = page.locator('#sidebar-pane-permission_blueprint');
        await expect(blueprintSidePane).toBeVisible();
        await expect(page.locator('#sidebar-pane-workflows')).toBeHidden();
        await expect(page.locator('#sidebar-pane-api_tree')).toBeHidden();

        // 3. 验证主工作区 View 切换
        const blueprintMainView = page.locator('#view-permission_blueprint');
        await expect(blueprintMainView).toBeVisible();
        await expect(page.locator('#view-workflows')).toBeHidden();
        await expect(page.locator('#view-api_tree')).toBeHidden();

        // 4. 验证 8 大核心节点渲染
        const nodes = page.locator('.pb-blueprint-node');
        await expect(nodes).toHaveCount(8);

        // 5. 验证 SVG 连线生成
        const wires = page.locator('#pb-wires-group .pb-wire-group');
        const wireCount = await wires.count();
        expect(wireCount).toBeGreaterThanOrEqual(8);

        // 6. 验证最终有效权力报告抽屉与 6 项裁定卡片
        const auditDrawer = page.locator('#pb-audit-drawer');
        await expect(auditDrawer).toBeVisible();
        const auditCards = page.locator('.pb-audit-card');
        await expect(auditCards).toHaveCount(6);
    });

    test('What-If 假设推演：GAC 严格模式拦截与 Contributor 特权穿透测试', async ({ page }) => {
        // 进入蓝图
        await page.locator('#rail-nav-permission_blueprint').click();

        // 点击 What-If 场景：模拟 GAC 开启但缺连接
        const scenarioGacBtn = page.locator('button:has-text("模拟：GAC开启但缺连接(阻断PQ)")');
        await scenarioGacBtn.click();

        // 验证第 3 项 Power Query 裁定卡片变为拦截状态
        const pqAuditCard = page.locator('.pb-audit-card').nth(2);
        await expect(pqAuditCard).toContainText('严格拦截');
        await expect(pqAuditCard).toContainText('GAC 严格模式已启用，但用户缺少底层数据源连接凭据');

        // 点击 What-If 场景：模拟 Contributor 特权穿透
        const scenarioBypassBtn = page.locator('button:has-text("模拟：Contributor 特权穿透 RLS/OLS")');
        await scenarioBypassBtn.click();

        // 验证 RLS 与 OLS 均变为“全量穿透”
        const rlsCard = page.locator('.pb-audit-card').nth(3);
        const olsCard = page.locator('.pb-audit-card').nth(4);
        await expect(rlsCard).toContainText('特权穿透');
        await expect(olsCard).toContainText('特权穿透');
    });

    test('双向透视模式：按模型透视切换与用户载入，且支持明暗主题高对比视觉反馈', async ({ page }) => {
        await page.locator('#rail-nav-permission_blueprint').click();

        const tabUser = page.locator('#pb-tab-user');
        const tabModel = page.locator('#pb-tab-model');

        // 1. 默认暗色模式下，用户主体按钮处于激活态
        await expect(tabUser).toHaveClass(/active/);
        await expect(tabModel).not.toHaveClass(/active/);

        // 2. 点击切换至“按目标模型”，验证强烈的视觉激活反馈
        await tabModel.click();
        await expect(tabModel).toHaveClass(/active/);
        await expect(tabUser).not.toHaveClass(/active/);

        // 验证模型关联用户列表卡片展开
        const modelUsersCard = page.locator('#pb-model-users-card');
        await expect(modelUsersCard).toBeVisible();

        // 3. 验证亮色模式下的按钮主题适配
        const themeToggleBtn = page.locator('#theme-toggle-btn');
        await themeToggleBtn.click();
        await page.waitForTimeout(300);

        // 亮色模式下 active 按钮为纯白底配深紫蓝文字 (#4338ca)
        const lightModelColor = await tabModel.evaluate(el => window.getComputedStyle(el).color);
        expect(lightModelColor).toMatch(/rgb\(67,\s*56,\s*202\)/); // #4338ca

        // 切回暗色模式
        await themeToggleBtn.click();
        await page.waitForTimeout(300);

        const userRows = page.locator('.pb-model-user-row');
        await expect(userRows.first()).toBeVisible();

        // 点击第一位管理员用户下钻
        await userRows.first().click();

        // 验证模型面板顶部出现下钻横条
        const drillBanner = page.locator('#pb-model-drill-banner');
        await expect(drillBanner).toBeVisible();
        await expect(page.locator('#pb-drill-user-name')).toContainText('Sarah Connor');

        // 验证：在按目标模型透视下，用户主体选择卡片必须彻底隐藏 (完全解决面板重叠混杂)
        const userCard = page.locator('#pb-user-principal-card');
        await expect(userCard).toBeHidden();

        // 4. 切回“按用户主体”模式，验证用户选择卡片恢复显示
        await tabUser.click();
        await expect(userCard).toBeVisible();

        // 5. 验证【✕ 取消模拟】按钮功能：点击后清空模拟用户，恢复通用基准
        const clearUserBtn = page.locator('#pb-btn-clear-user');
        await expect(clearUserBtn).toBeVisible();
        await clearUserBtn.click();

        const upnLabel = page.locator('#pb-current-upn-label');
        await expect(upnLabel).toContainText('未选定模拟主体');
        const roleTag = page.locator('#pb-badge-role-tag');
        await expect(roleTag).toHaveText('通用基准');
    });

    test('沙盒卡片向左拖拽无限制：解除 10px 边界，支持全向自由无级拖动', async ({ page }) => {
        await page.locator('#rail-nav-permission_blueprint').click();

        const nodeTenant = page.locator('#node_tenant');
        await expect(nodeTenant).toBeVisible();

        // 初始位置 (DEFAULT_NODE_COORDS x=60)
        const initialLeft = await nodeTenant.evaluate(el => parseInt(el.style.left, 10));
        expect(initialLeft).toBe(60);

        // 拖拽手柄向左拖动 200px
        const header = nodeTenant.locator('.pb-node-header');
        const box = await header.boundingBox();

        await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
        await page.mouse.down();
        await page.mouse.move(box.x + box.width / 2 - 200, box.y + box.height / 2, { steps: 5 });
        await page.mouse.up();

        // 断言：新位置必须成功突破原本 10px 的硬限制（已拖到负坐标或远小于 10px）
        const newLeft = await nodeTenant.evaluate(el => parseInt(el.style.left, 10));
        expect(newLeft).toBeLessThan(10);
    });

    test('明亮与黑暗双主题深度支持：主题切换后蓝图画布与节点自适应变色', async ({ page }) => {
        await page.locator('#rail-nav-permission_blueprint').click();

        const viewport = page.locator('#pb-canvas-viewport');
        const node = page.locator('#node_tenant');
        const themeToggleBtn = page.locator('#theme-toggle-btn');

        // 1. 默认暗色模式下：背景为深黑色系
        const darkBg = await viewport.evaluate(el => window.getComputedStyle(el).backgroundColor);
        expect(darkBg).toMatch(/rgb\(11,\s*15,\s*25\)/); // #0b0f19

        // 2. 点击主题切换为亮色模式 (Light Theme)
        await themeToggleBtn.click();
        await page.waitForTimeout(300);

        // 验证 html 标记了 data-theme="light"
        const htmlTheme = await page.evaluate(() => document.documentElement.getAttribute('data-theme'));
        expect(htmlTheme).toBe('light');

        // 验证亮色模式下视口变为浅白底 (#f8fafc -> rgb(248, 250, 252))
        const lightBg = await viewport.evaluate(el => window.getComputedStyle(el).backgroundColor);
        expect(lightBg).toMatch(/rgb\(248,\s*250,\s*252\)/);

        // 验证蓝图卡片变为纯白玻璃拟态底
        const nodeBg = await node.evaluate(el => window.getComputedStyle(el).backgroundColor);
        expect(nodeBg).toMatch(/rgba?\(255,\s*255,\s*255/);

        // 3. 再次点击平滑切回暗色模式
        await themeToggleBtn.click();
        await page.waitForTimeout(300);

        const restoredDarkBg = await viewport.evaluate(el => window.getComputedStyle(el).backgroundColor);
        expect(restoredDarkBg).toMatch(/rgb\(11,\s*15,\s*25\)/);
    });

    test('场景预设与Announced公告框在日夜模式下均具备高对比度且零发白', async ({ page }) => {
        await page.locator('#rail-nav-permission_blueprint').click();
        const themeToggleBtn = page.locator('#theme-toggle-btn');

        // 切换为亮色白天模式
        await themeToggleBtn.click();
        await page.waitForTimeout(300);

        // 1. 验证预设按钮文字在白底下的对比度（金黄色按钮文字应为深琥珀色 #b45309，而不是发白的浅黄）
        const bypassBtn = page.locator('.pb-scenario-bypass');
        const bypassTextColor = await bypassBtn.evaluate(el => window.getComputedStyle(el).color);
        expect(bypassTextColor).toMatch(/rgb\(180,\s*83,\s*9\)/); // #b45309

        // 2. 验证节点内的 Announced 公告框文本清晰易读
        const nodeAlert = page.locator('.pb-node-alert').first();
        await expect(nodeAlert).toBeVisible();
        const alertColor = await nodeAlert.evaluate(el => window.getComputedStyle(el).color);
        // 不应是几乎看不见的白色/极淡浅色
        expect(alertColor).not.toMatch(/rgb\(255,\s*255,\s*255\)/);
    });

    test('防走失核心保障：当卡片漂移出视口时雷达提示自动浮现，点击一键找回瞬间居中', async ({ page }) => {
        await page.locator('#rail-nav-permission_blueprint').click();

        const radarNotice = page.locator('#pb-radar-notice');
        const locateBtn = page.locator('#pb-btn-locate-all');

        // 默认卡片在视口内，雷达提示必须隐藏
        await expect(radarNotice).toBeHidden();

        // 故意将画布平移到遥远坐标，制造“卡片丢失”场景
        await page.evaluate(() => {
            window.PermissionBlueprint.panX = 3500;
            window.PermissionBlueprint.panY = 3500;
            window.PermissionBlueprint.updateCanvasTransform();
            window.PermissionBlueprint.checkRadarVisibility();
        });

        // 验证：雷达防丢提示气泡自动浮现
        await expect(radarNotice).toBeVisible();
        await expect(radarNotice).toContainText('卡片位于视口外部');

        // 点击工具栏的“找回卡片”按钮
        await locateBtn.click();
        await page.waitForTimeout(400);

        // 验证：雷达提示自动隐藏，且节点重新回到可见视口
        await expect(radarNotice).toBeHidden();
        const nodeBox = await page.locator('#node_tenant').boundingBox();
        expect(nodeBox).not.toBeNull();
        expect(nodeBox.x).toBeGreaterThan(0);
        expect(nodeBox.y).toBeGreaterThan(0);
    });

    test('持久化跨刷新自愈保障：用户刷新页面 (F5 Reload) 后，8 大核心卡片 100% 自动自愈渲染且绝不消失', async ({ page }) => {
        // 1. 进入蓝图沙盒
        await page.locator('#rail-nav-permission_blueprint').click();
        await expect(page.locator('#node_tenant')).toBeVisible();

        // 2. 模拟真实用户执行页面全量刷新 (F5 Reload)
        await page.reload();

        // 3. 断言：刷新后主视图依然保持在 Permission Blueprint，且 8 张卡片 100% 渲染呈现，绝不变成 0 张
        const blueprintMainView = page.locator('#view-permission_blueprint');
        await expect(blueprintMainView).toBeVisible();

        const nodes = page.locator('.pb-blueprint-node');
        await expect(nodes).toHaveCount(8);

        const nodeTenant = page.locator('#node_tenant');
        await expect(nodeTenant).toBeVisible();
        const tenantBox = await nodeTenant.boundingBox();
        expect(tenantBox).not.toBeNull();
        expect(tenantBox.x).toBeGreaterThan(0);
        expect(tenantBox.y).toBeGreaterThan(0);
    });
});
