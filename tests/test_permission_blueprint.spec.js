const { test, expect } = require('@playwright/test');

test.describe('Power BI Permission Blueprint E2E Tests', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('/');
        await page.evaluate(() => {
            localStorage.clear();
            localStorage.setItem('pbi_tenant_id', 'mock-tenant-1234');
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

    test('双向透视模式：按模型透视切换与用户载入', async ({ page }) => {
        await page.locator('#rail-nav-permission_blueprint').click();

        // 切换至“按目标模型”
        const tabModel = page.locator('#pb-tab-model');
        await tabModel.click();

        // 验证模型关联用户列表卡片展开
        const modelUsersCard = page.locator('#pb-model-users-card');
        await expect(modelUsersCard).toBeVisible();

        const userRows = page.locator('.pb-model-user-row');
        await expect(userRows.first()).toBeVisible();

        // 点击第一位管理员用户
        await userRows.first().click();

        // 自动切回用户主体，且模拟用户标签更新
        const upnLabel = page.locator('#pb-current-upn-label');
        await expect(upnLabel).toHaveText(/sarah.connor@contoso.com/);
    });
});
