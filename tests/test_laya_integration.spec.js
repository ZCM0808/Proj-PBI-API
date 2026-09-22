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

  test('UI: Permission Blueprint 3 views toggle their toolbars exclusively without mixing', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });

    // 等待蓝图模块挂载
    await page.waitForFunction(() => typeof window.PermissionBlueprint !== 'undefined', { timeout: 15000 });

    // 切换至蓝图模块
    await page.evaluate(() => {
      if (typeof window.switchAppModule === 'function') {
        window.switchAppModule('permission_blueprint');
      }
    });

    const bpToolbar = page.locator('#pb-blueprint-toolbar');
    const mxToolbar = page.locator('#pb-matrix-toolbar');
    const uaToolbar = page.locator('#pb-user-assets-toolbar');

    // 1. 切换至 🗺️ 权限流转蓝图
    await page.evaluate(() => window.PermissionBlueprint.switchMainTab('blueprint'));
    await expect(bpToolbar).toBeVisible();
    await expect(mxToolbar).toBeHidden();
    await expect(uaToolbar).toBeHidden();

    // 2. 切换至 🏛️ 6 层推导矩阵
    await page.evaluate(() => window.PermissionBlueprint.switchMainTab('matrix'));
    await expect(bpToolbar).toBeHidden();
    await expect(mxToolbar).toBeVisible();
    await expect(uaToolbar).toBeHidden();

    // 3. 切换至 🌐 用户全景权限链路
    await page.evaluate(() => window.PermissionBlueprint.switchMainTab('user_assets'));
    await expect(bpToolbar).toBeHidden();
    await expect(mxToolbar).toBeHidden();
    await expect(uaToolbar).toBeVisible();
  });

  test('UI: API Explorer response panel DOM hierarchy and layout is clean and aligned', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });

    // 切换至 API 资源树
    await page.evaluate(() => {
      if (typeof window.switchAppModule === 'function') {
        window.switchAppModule('api_tree');
      }
    });

    // 验证 DOM 层级正确闭合：.response-header 与 .response-body 必须互为同级子元素
    const isHierarchyValid = await page.evaluate(() => {
      const container = document.querySelector('.response-container');
      const header = document.querySelector('.response-header');
      const body = document.querySelector('.response-body');
      if (!container || !header || !body) return false;

      // header 绝不能包含 body
      const headerContainsBody = header.contains(body);
      // container 必须同时为 header 和 body 的直接父级
      const bothDirectChildren = (header.parentElement === container) && (body.parentElement === container);

      return !headerContainsBody && bothDirectChildren;
    });

    expect(isHierarchyValid).toBe(true);

    const resHeader = page.locator('.response-header');
    const resBody = page.locator('.response-body');
    await expect(resHeader).toBeVisible();
    await expect(resBody).toBeVisible();
  });

  test('UI: User assets matrix respects unselected principal and shows NO PRINCIPAL', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => typeof window.PermissionBlueprint !== 'undefined', { timeout: 15000 });

    await page.evaluate(() => {
      if (typeof window.switchAppModule === 'function') {
        window.switchAppModule('permission_blueprint');
      }
      window.PermissionBlueprint.activePresetKey = null;
      window.PermissionBlueprint.selectedPrincipal = null;
      window.PermissionBlueprint.switchMainTab('user_assets');
    });

    // 检查 Tenant 模块与 Workspace 模块在未选用户时的状态提示
    const tenantHeader = page.locator('#pb-module-card-tenant');
    await expect(tenantHeader).toBeVisible({ timeout: 15000 });

    const tenantHeaderText = await tenantHeader.innerText();
    expect(tenantHeaderText).toContain('NO PRINCIPAL');

    const wsHeader = page.locator('#pb-module-card-workspace');
    await expect(wsHeader).toBeVisible({ timeout: 15000 });
    const wsHeaderText = await wsHeader.innerText();
    expect(wsHeaderText).toContain('工作区');
    expect(wsHeaderText).toContain('未选择');
  });

  test('UI: Zen fullscreen button is always visible in user assets view', async ({ page }) => {
    await page.setViewportSize({ width: 1200, height: 800 });
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => typeof window.PermissionBlueprint !== 'undefined', { timeout: 15000 });

    await page.evaluate(() => {
      if (typeof window.switchAppModule === 'function') {
        window.switchAppModule('permission_blueprint');
      }
      window.PermissionBlueprint.switchMainTab('user_assets');
    });

    const zenBtn = page.locator('#pb-global-zen-btn');
    await expect(zenBtn).toBeVisible({ timeout: 15000 });

    const box = await zenBtn.boundingBox();
    expect(box).not.toBeNull();
    if (box) {
      expect(box.x + box.width).toBeLessThanOrEqual(1205);
      expect(box.width).toBeGreaterThanOrEqual(28);
    }
  });

  test('UI: Permission Matrix L7 and L8 tiers retain minimum width in 1:1 mode and are not squeezed', async ({ page }) => {
    await page.setViewportSize({ width: 1200, height: 800 });
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => typeof window.PermissionBlueprint !== 'undefined', { timeout: 15000 });

    await page.evaluate(() => {
      if (typeof window.switchAppModule === 'function') {
        window.switchAppModule('permission_blueprint');
      }
      window.PermissionBlueprint.matrixFitToScreen = false;
      window.PermissionBlueprint.switchMainTab('matrix');
      window.PermissionBlueprint.applyMatrixFitScale();
    });

    const tier7 = page.locator('.pb-tier-col[data-tier="7"]');
    const tier8 = page.locator('.pb-tier-col[data-tier="8"]');

    await expect(tier7).toBeVisible({ timeout: 15000 });
    await expect(tier8).toBeVisible({ timeout: 15000 });

    const box7 = await tier7.boundingBox();
    const box8 = await tier8.boundingBox();

    expect(box7).not.toBeNull();
    expect(box8).not.toBeNull();
    if (box7 && box8) {
      expect(box7.width).toBeGreaterThanOrEqual(200);
      expect(box8.width).toBeGreaterThanOrEqual(200);
    }
  });

  test('UI: Permission Matrix Fit-to-Screen engine scales matrix to fit within viewport in non-fullscreen', async ({ page }) => {
    await page.setViewportSize({ width: 1200, height: 800 });
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => typeof window.PermissionBlueprint !== 'undefined', { timeout: 15000 });

    await page.evaluate(() => {
      if (typeof window.switchAppModule === 'function') {
        window.switchAppModule('permission_blueprint');
      }
      window.PermissionBlueprint.matrixFitToScreen = true;
      window.PermissionBlueprint.switchMainTab('matrix');
    });

    await page.waitForTimeout(300);
    await page.evaluate(() => window.PermissionBlueprint.applyMatrixFitScale());
    await page.waitForTimeout(200);

    const fitBtn = page.locator('#pb-btn-matrix-fit');
    await expect(fitBtn).toBeVisible({ timeout: 15000 });

    const tier8 = page.locator('.pb-tier-col[data-tier="8"]');
    await expect(tier8).toBeVisible({ timeout: 15000 });

    // 1. 在开启 Fit-to-Screen 模式下，L8 必定收纳在 1200px 视口内部 (<= 1205px)
    const box8Fit = await tier8.boundingBox();
    expect(box8Fit).not.toBeNull();
    if (box8Fit) {
      expect(box8Fit.x + box8Fit.width).toBeLessThanOrEqual(1205);
    }

    // 2. 点击工具栏一键切换至 1:1 模式
    await fitBtn.click();
    await page.waitForTimeout(300);

    const isFitAfterClick = await page.evaluate(() => window.PermissionBlueprint.matrixFitToScreen);
    expect(isFitAfterClick).toBe(false);

    // 3. 再次点击一键切回 Fit-to-Screen
    await fitBtn.click();
    await page.waitForTimeout(300);

    const isFitRestored = await page.evaluate(() => window.PermissionBlueprint.matrixFitToScreen);
    expect(isFitRestored).toBe(true);
  });

  test('UI: User assets matrix displays clean asset names instead of raw IDs in Model, Report, and Connection headers', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => typeof window.PermissionBlueprint !== 'undefined', { timeout: 15000 });

    await page.evaluate(() => {
      if (typeof window.switchAppModule === 'function') {
        window.switchAppModule('permission_blueprint');
      }
      // 模拟选中预设模型与测试工作区
      window.selectedGtbWorkspaceIds = new Set(['ws_prod']);
      window.selectedGtbDatasetIds = new Set(['model_sales']);
      window.selectedGtbReportIds = new Set(['report_sales_exec']);
      window.PermissionBlueprint.currentModelKey = 'model_sales';
      window.PermissionBlueprint.switchMainTab('user_assets');
    });

    await page.waitForTimeout(500);

    // 1. 验证 Model 卡片标题与副标题：显示业务名称，不显示原始 model id
    const modelCard = page.locator('#pb-module-card-model');
    await expect(modelCard).toBeVisible({ timeout: 10000 });
    const modelTitle = await modelCard.locator('.pb-card-title').textContent();
    const modelSub = await modelCard.locator('.pb-card-sub').textContent();

    expect(modelTitle).toContain('3. MODEL:');
    expect(modelTitle).toContain('ENTERPRISE SALES & MARGIN MODEL');
    expect(modelTitle).not.toContain('model_sales');
    expect(modelSub).not.toContain('模型 ID:');

    // 2. 验证 Report 卡片标题与副标题：显示业务名称，不显示原始 report id
    const reportCard = page.locator('#pb-module-card-report');
    await expect(reportCard).toBeVisible({ timeout: 10000 });
    const reportTitle = await reportCard.locator('.pb-card-title').textContent();
    const reportSub = await reportCard.locator('.pb-card-sub').textContent();

    expect(reportTitle).toContain('4. REPORT:');
    expect(reportTitle).toContain('SALES EXECUTIVE DASHBOARD');
    expect(reportTitle).not.toContain('report_sales_exec');
    expect(reportSub).not.toContain('报表 ID:');

    // 3. 验证 Connection 卡片标题：展示具体连接业务名
    const connCard = page.locator('#pb-module-card-connection');
    await expect(connCard).toBeVisible({ timeout: 10000 });
    const connTitle = await connCard.locator('.pb-card-title').textContent();

    expect(connTitle).toContain('5. CONNECTION:');
    expect(connTitle).toContain('AWS REDSHIFT');

    // 4. 验证点击 READ 卡片时的因果链路：仅影响报表 VIEW，绝不波及网关与计划刷新
    const readRow = page.locator('.pb-asset-card-row[data-row-id="model_read"]');
    await expect(readRow).toBeVisible({ timeout: 10000 });
    await readRow.click();
    await page.waitForTimeout(300);

    const reportViewRow = page.locator('.pb-asset-card-row[data-row-id="report_view"]');
    await expect(reportViewRow).toHaveClass(/pb-causality-target/);

    const gwRow = page.locator('.pb-asset-card-row[data-row-id="conn_gw"]');
    if (await gwRow.count() > 0) {
      await expect(gwRow).not.toHaveClass(/pb-causality-target/);
    }

    const refreshRow = page.locator('.pb-asset-card-row[data-row-id="conn_refresh"]');
    if (await refreshRow.count() > 0) {
      await expect(refreshRow).not.toHaveClass(/pb-causality-target/);
    }

    // 5. 验证点击 WRITE 卡片时的因果链路：超集蕴含 Read + Build，自然解锁报表层的 VIEW, EDIT, EXPORT
    const writeRow = page.locator('.pb-asset-card-row[data-row-id="model_write"]');
    await expect(writeRow).toBeVisible({ timeout: 10000 });
    await writeRow.click();
    await page.waitForTimeout(300);

    const reportEditRow = page.locator('.pb-asset-card-row[data-row-id="report_edit"]');
    await expect(reportViewRow).toHaveClass(/pb-causality-target/);
    await expect(reportEditRow).toHaveClass(/pb-causality-target/);
    const reportExportRow = page.locator('.pb-asset-card-row[data-row-id="report_export"]');
    await expect(reportExportRow).toHaveClass(/pb-causality-target/);

    const reportShareRow = page.locator('.pb-asset-card-row[data-row-id="report_share"]');
    await expect(reportShareRow).not.toHaveClass(/pb-causality-target/);

    // 6. 验证点击 RESHARE 卡片时：派生授权分发，精准点亮报表层的 SHARE REPORT
    const reshareRow = page.locator('.pb-asset-card-row[data-row-id="model_reshare"]');
    if (await reshareRow.count() > 0) {
      await reshareRow.click();
      await page.waitForTimeout(300);
      await expect(reportShareRow).toHaveClass(/pb-causality-target/);
    }

    // 7. 验证小卡片中已移除冗余的 pb-cat-tag-pill (无需重复显示 assigned/capability/env)
    const catPillCount = await page.locator('.pb-cat-tag-pill').count();
    expect(catPillCount).toBe(0);

    // 8. 验证用户全景左下角图例默认收起为小圆圈，点击切换长久展开 (Pinned)
    const legendContainer = page.locator('#pb-user-assets-legend');
    await expect(legendContainer).toBeAttached();
    const triggerBtn = legendContainer.locator('.pb-legend-trigger');
    await expect(triggerBtn).toBeVisible();

    // 点击小圆圈 -> 展开锁定 (is-pinned)
    await triggerBtn.click({ force: true });
    await page.waitForTimeout(300);
    await expect(legendContainer).toHaveClass(/is-pinned/);

    const legendCard = legendContainer.locator('.pb-category-legend');
    await expect(legendCard).toBeVisible();
    await expect(legendCard.locator('.pb-legend-title')).toContainText('权限分类与标识图例');
    const legendRows = legendCard.locator('.pb-legend-row');
    await expect(legendRows).toHaveCount(3);
    const legendText = await legendCard.textContent();
    expect(legendText).toContain('官方分配身份');
    expect(legendText).toContain('衍生能力权限');
    expect(legendText).toContain('承载环境资产');

    // 再次点击图钉按钮 -> 取消锁定并收缩
    const pinBtn = legendContainer.locator('.pb-legend-pin-hint');
    await pinBtn.click({ force: true });
    await page.waitForTimeout(300);
    await expect(legendContainer).not.toHaveClass(/is-pinned/);

    // 9. 验证小卡片标题与角色官方标准权威命名 (中英双语 + 角色派生)
    const wsRoleProp = page.locator('.pb-asset-card-row[data-row-id="ws_role"] .pb-asset-prop-name');
    await expect(wsRoleProp).toBeVisible();
    const wsRoleText = await wsRoleProp.innerText();
    expect(wsRoleText).toMatch(/Workspace Role:\s*(ADMIN|VIEWER|MEMBER|CONTRIBUTOR|UNSPECIFIED|NO USER)/i);

    const modelReadProp = page.locator('.pb-asset-card-row[data-row-id="model_read"] .pb-asset-prop-name');
    await expect(modelReadProp).toBeVisible();
    const modelReadText = await modelReadProp.innerText();
    expect(modelReadText).toContain('Permission: Read');
  });

});

