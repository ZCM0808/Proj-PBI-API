const { test, expect } = require('@playwright/test');

test.describe('Laya System 1 Decision Engine Integration Tests', () => {
  test.setTimeout(120000);

  test.beforeEach(async ({ page }) => {
    await page.route('**/*.{png,jpg,jpeg,woff,woff2,ttf}', route => route.abort());
    await page.route(/fonts\.googleapis\.com/, route => route.abort());
    await page.route(/alcdn\.msauth\.net/, route => route.abort());
  });

  test('Backend Laya endpoints respond correctly', async ({ request }) => {
    // 1. Status endpoint
    const statusRes = await request.get('/api/ai/laya/status');
    expect(statusRes.ok()).toBeTruthy();
    const statusData = await statusRes.json();
    expect(statusData.status).toBe('ok');
    expect(typeof statusData.available).toBe('boolean');

    // 2. Route API endpoint
    const routeRes = await request.post('/api/ai/laya/route-api', {
      data: { query: 'audit tenant activity logs' }
    });
    expect(routeRes.ok()).toBeTruthy();
    const routeData = await routeRes.json();
    expect(routeData.category).toBeTruthy();
    expect(routeData.title).toBeTruthy();

    // 3. Triage Error endpoint
    const triageRes = await request.post('/api/ai/laya/triage-error', {
      data: { error_text: 'The credentials supplied for the datasource connection have expired.' }
    });
    expect(triageRes.ok()).toBeTruthy();
    const triageData = await triageRes.json();
    expect(triageData.cause).toBeTruthy();
    expect(triageData.advice).toBeTruthy();

    // 4. Audit Permission endpoint
    const auditRes = await request.post('/api/ai/laya/audit-permission', {
      data: {
        role: 'Admin',
        user_title: 'Summer Intern',
        workspace_type: 'Executive Confidential',
        permissions: ['Delete Workspace', 'Export Data']
      }
    });
    expect(auditRes.ok()).toBeTruthy();
    const auditData = await auditRes.json();
    expect(typeof auditData.is_high_risk).toBe('boolean');
    expect(auditData.advice).toBeTruthy();
  });

  test('UI: API Explorer natural language intent routing works', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });

    // 切换到 API 资源树视图
    await page.evaluate(() => {
      if (typeof window.switchAppModule === 'function') {
        window.switchAppModule('api_tree');
      }
    });

    // 定位搜索框与闪电意图按钮
    const searchInput = page.locator('#api-search-input');
    const layaBtn = page.locator('#btn-laya-intent-search');
    const intentHint = page.locator('#laya-search-intent-hint');

    await expect(searchInput).toBeVisible({ timeout: 10000 });
    await expect(layaBtn).toBeVisible({ timeout: 10000 });

    // 输入口语意图并点击闪电按钮
    await searchInput.fill('audit who accessed our reports in tenant activity');
    await layaBtn.click();

    // 验证提示条浮现并显示意图解析
    await expect(intentHint).toBeVisible({ timeout: 15000 });
    const hintText = await intentHint.innerText();
    expect(hintText).toContain('Laya 意图直达');
  });

  test('UI: Error triage card displays properly when triggered', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });

    // 切换到 API Explorer 主工作区
    await page.evaluate(() => {
      if (typeof window.switchAppModule === 'function') {
        window.switchAppModule('api_tree');
      }
    });

    // 等待脚本函数挂载
    await page.waitForFunction(() => typeof window.triggerLayaErrorTriage === 'function', { timeout: 15000 });

    // 触发 Laya 错误快速诊断
    await page.evaluate(async () => {
      await window.triggerLayaErrorTriage(
        'DMTS_DatasourceHasNoSuchConnection: The credentials supplied for the datasource connection have expired.'
      );
    });

    const triageCard = page.locator('#laya-error-triage-card');
    await expect(triageCard).toBeVisible({ timeout: 15000 });
    const cardText = await triageCard.innerText();
    expect(cardText).toContain('Laya 智能预诊');
  });

  test('UI: Permission causality modal displays Laya Guardrail bar', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });

    // 等待核心脚本挂载就绪
    await page.waitForFunction(
      () => typeof window.PermissionBlueprint !== 'undefined' && typeof window.PermissionBlueprint.switchMainTab === 'function',
      { timeout: 15000 }
    );

    // 1. 点击左侧一级 Rail 导航按钮进入全景权限蓝图
    const navBtn = page.locator('#rail-nav-permission_blueprint');
    await expect(navBtn).toBeVisible({ timeout: 10000 });
    await navBtn.click();

    // 2. 切换到全景权限链路选项卡
    await page.evaluate(() => {
      window.PermissionBlueprint.switchMainTab('user_assets');
    });

    // 等待全景资产容器及行卡片就绪
    const container = page.locator('#pb-user-assets-container');
    await expect(container).toBeVisible({ timeout: 15000 });
    await expect(container).toBeVisible({ timeout: 15000 });

    const rows = page.locator('.pb-asset-card-row');
    await expect(rows.first()).toBeVisible({ timeout: 15000 });

    // 锁定点击第一个卡片
    await rows.first().click();

    // 点击因果关系解析按钮
    const explainBtn = page.locator('#pb-btn-explain-causality');
    await expect(explainBtn).toBeVisible({ timeout: 10000 });
    await explainBtn.click();

    // 验证弹窗中的 Laya 门禁安全条
    const guardrailBar = page.locator('#pb-laya-guardrail-bar');
    await expect(guardrailBar).toBeVisible({ timeout: 15000 });
    const guardText = await guardrailBar.innerText();
    expect(guardText).toContain('System 1 合规门禁');
    expect(guardText).toContain('LAYA');
    expect(guardText).toContain('Laya');
  });

  test('UI: Explicit LAYA badges and labels are prominently displayed across all entry points', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });

    // 1. 切换至 API 资源树
    await page.evaluate(() => {
      if (typeof window.switchAppModule === 'function') {
        window.switchAppModule('api_tree');
      }
    });

    // 验证标题微标与按钮文字
    const title = page.locator('#sidebar-pane-api_tree .nav-title');
    await expect(title).toContainText('LAYA POWERED');

    const layaBtn = page.locator('#btn-laya-intent-search');
    await expect(layaBtn).toContainText('Laya');
    await expect(layaBtn.locator('svg')).toBeVisible();

    const searchInput = page.locator('#api-search-input');
    const placeholder = await searchInput.getAttribute('placeholder');
    expect(placeholder).toContain('Laya');

    // 2. 切换至全景权限蓝图
    await page.evaluate(() => {
      localStorage.setItem('pbi-active-module', 'permission_blueprint');
      localStorage.setItem('pb-active-main-tab', 'user_assets');
    });
    await page.reload({ waitUntil: 'domcontentloaded' });

    // 验证蓝图工具栏【解析卡片关系】按钮上含有 LAYA 微标
    const explainBtn = page.locator('#pb-btn-explain-causality');
    await expect(explainBtn).toBeVisible();
    await expect(explainBtn).toContainText('LAYA');
  });

  test('UI: Toolbar buttons never wrap and resist shrinkage when exiting full screen', async ({ page }) => {
    // 模拟非全屏较窄视口 (1024x768)
    await page.setViewportSize({ width: 1024, height: 768 });
    await page.goto('/', { waitUntil: 'domcontentloaded' });

    // 切换至全景权限链路视图，侧边栏保持展开状态（非 Zen Mode 沉浸全屏）
    await page.evaluate(() => {
      localStorage.setItem('pbi-active-module', 'permission_blueprint');
      localStorage.setItem('pb-active-main-tab', 'user_assets');
      document.body.classList.remove('zen-mode');
    });
    await page.reload({ waitUntil: 'domcontentloaded' });

    const toolbar = page.locator('#pb-user-assets-toolbar');
    await expect(toolbar).toBeVisible({ timeout: 15000 });

    // 检验工具栏内所有按钮的 white-space 均为 nowrap
    const buttons = toolbar.locator('button');
    const count = await buttons.count();
    expect(count).toBeGreaterThanOrEqual(4);

    for (let i = 0; i < count; i++) {
      const btn = buttons.nth(i);
      const ws = await btn.evaluate(el => window.getComputedStyle(el).whiteSpace);
      expect(ws).toBe('nowrap');
      const flexShrink = await btn.evaluate(el => window.getComputedStyle(el).flexShrink);
      expect(flexShrink).toBe('0');
    }
  });

  test('UI: Global Settings retains user last tab, scroll position, and collapse states', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });

    // 重置测试环境中的记忆偏好，确保验证默认首次折叠行为
    await page.evaluate(() => {
      localStorage.removeItem('pbi-settings-collapse-workspace-list');
      localStorage.removeItem('pbi-settings-collapse-dataset-list');
      localStorage.removeItem('pbi-settings-collapse-report-list');
      localStorage.removeItem('pbi-settings-active-tab');
      localStorage.removeItem('pbi-settings-scroll-top');
    });

    // 1. 打开全局环境配置弹窗
    const btnSettings = page.locator('#btn-settings');
    await expect(btnSettings).toBeVisible({ timeout: 10000 });
    await btnSettings.click();

    const settingsModal = page.locator('#settings-modal');
    await expect(settingsModal).toBeVisible({ timeout: 10000 });

    // 2. 验证 Workspace / Model (Dataset) / Report 默认全部折叠
    const wsList = page.locator('#workspace-list');
    const dsList = page.locator('#dataset-list');
    const repList = page.locator('#report-list');

    await expect(wsList).toBeHidden();
    await expect(dsList).toBeHidden();
    await expect(repList).toBeHidden();

    // 3. 验证折叠箭头图标初始为 ▶
    const collapseIcons = page.locator('label[onclick*="workspace-list"] .collapse-icon');
    await expect(collapseIcons).toContainText('▶');

    // 4. 点击展开工作区字典
    await page.locator('label[onclick*="workspace-list"]').click();
    await expect(wsList).toBeVisible({ timeout: 10000 });

    // 5. 切换到常规认证 Tab
    const tabLegacyBtn = page.locator('#tab-btn-legacy');
    await tabLegacyBtn.click();
    await expect(page.locator('#panel-auth-legacy')).toBeVisible();
    await expect(page.locator('#panel-auth-interactive')).toBeHidden();

    // 6. 关闭设置弹窗
    const closeBtn = page.locator('#close-settings-btn');
    await closeBtn.click();
    await expect(settingsModal).toBeHidden();

    // 7. 再次打开设置弹窗，验证上次界面完整恢复
    await btnSettings.click();
    await expect(settingsModal).toBeVisible();

    // 验证仍停留在常规认证 Tab
    await expect(page.locator('#panel-auth-legacy')).toBeVisible();
    await expect(page.locator('#panel-auth-interactive')).toBeHidden();

    // 验证 Workspace 保持用户展开的状态，而 Dataset / Report 保持默认折叠
    await expect(wsList).toBeVisible();
    await expect(dsList).toBeHidden();
    await expect(repList).toBeHidden();
  });

  test('UI: Laya master switch toggles engine on/off with instant feedback', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });

    // 1. 打开全局设置弹窗
    await page.locator('#btn-settings').click();
    await expect(page.locator('#settings-modal')).toBeVisible();

    const layaCard = page.locator('#laya-global-toggle-card');
    const layaSwitch = page.locator('#laya-global-switch');
    const layaSwitchLabel = page.locator('.laya-toggle-switch');
    const layaBadge = page.locator('#laya-global-badge');

    await expect(layaCard).toBeVisible();
    await expect(layaSwitch).toBeChecked();
    await expect(layaBadge).toContainText('运行中');

    // 2. 点击 Switch 一键关闭 Laya 引擎
    await layaSwitchLabel.click();
    await expect(layaSwitch).not.toBeChecked();
    await expect(layaBadge).toContainText('已停用');

    // 检查 localStorage 记忆持久化
    const isEnabledDisabled = await page.evaluate(() => localStorage.getItem('pbi-laya-enabled'));
    expect(isEnabledDisabled).toBe('false');

    // 3. 再次点击 Switch 一键重新开启 Laya 引擎
    await layaSwitchLabel.click();
    await expect(layaSwitch).toBeChecked();
    await expect(layaBadge).toContainText('运行中');

    const isEnabledActive = await page.evaluate(() => localStorage.getItem('pbi-laya-enabled'));
    expect(isEnabledActive).toBe('true');
  });

});

