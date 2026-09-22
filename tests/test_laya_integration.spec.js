const { test, expect } = require('@playwright/test');

test.describe('Laya System 1 Decision Engine Integration Tests', () => {
  test.setTimeout(60000);

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
    await page.evaluate(() => {
      localStorage.setItem('pbi-active-module', 'permission_blueprint');
      localStorage.setItem('pb-active-main-tab', 'user_assets');
    });
    await page.reload({ waitUntil: 'domcontentloaded' });

    // 等待全景资产容器及行卡片就绪
    const container = page.locator('#pb-user-assets-container');
    await expect(container).toBeVisible({ timeout: 15000 });

    const rows = page.locator('.pb-asset-card-row');
    await expect(rows.first()).toBeVisible({ timeout: 10000 });

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
  });

});
