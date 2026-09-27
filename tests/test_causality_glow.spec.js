const { test, expect } = require('@playwright/test');

test.describe('Causality Glow Hover Intent & Gap Buffer Verification', () => {

  test.beforeEach(async ({ page }) => {
    await page.route('**/*.{png,jpg,jpeg,woff,woff2,ttf}', route => route.abort());
    await page.route(/fonts\.googleapis\.com/, route => route.abort());
    await page.route(/alcdn\.msauth\.net/, route => route.abort());

    const defaultWs = [{ id: 'ws_prod', name: 'Production Workspace', alias: 'Production Workspace' }];
    const defaultDs = [{ id: 'model_sales', name: 'Sales Model', alias: 'Sales Model', workspaceId: 'ws_prod' }];
    const defaultRp = [{ id: 'report_sales', name: 'Sales Report', alias: 'Sales Report', workspaceId: 'ws_prod' }];
    await page.route('**/api/settings', route => route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        AUTH_MODE: 'service_principal',
        PBI_WORKSPACES: defaultWs,
        PBI_DATASETS: defaultDs,
        PBI_REPORTS: defaultRp
      })
    }));

    await page.addInitScript(({ ws, ds, rp }) => {
      localStorage.clear();
      localStorage.setItem('pbi-active-module', 'permission_blueprint');
      localStorage.setItem('pb-active-main-tab', 'user_assets');
      localStorage.setItem('pb-active-preset', 'preset_admin');
      localStorage.setItem('pbi-active-workspace', 'ws_prod');
      localStorage.setItem('pbi-active-dataset', 'model_sales');
      localStorage.setItem('pbi-active-report', 'report_sales');
      localStorage.setItem('pbi-selected-workspaces', JSON.stringify(['ws_prod']));
      localStorage.setItem('pbi-selected-datasets', JSON.stringify(['model_sales']));
      localStorage.setItem('pbi-selected-reports', JSON.stringify(['report_sales']));
      localStorage.setItem('pbi_workspaces', JSON.stringify(ws));
      localStorage.setItem('pbi_datasets', JSON.stringify(ds));
      localStorage.setItem('pbi_reports', JSON.stringify(rp));
    }, { ws: defaultWs, ds: defaultDs, rp: defaultRp });
  });

  async function ensureBlueprintReady(page) {
    await page.waitForFunction(() => window.PermissionBlueprint && typeof window.PermissionBlueprint.renderUserAssetsMatrix === 'function', { timeout: 15000 });
    await page.evaluate(() => {
      const mockWs = [{ id: 'ws_prod', name: 'Production Workspace', alias: 'Production Workspace' }];
      const mockDs = [{ id: 'model_sales', name: 'Sales Model', alias: 'Sales Model', workspaceId: 'ws_prod' }];
      const mockRp = [{ id: 'report_sales', name: 'Sales Report', alias: 'Sales Report', workspaceId: 'ws_prod' }];
      window.allWorkspaces = mockWs;
      window.allDatasets = mockDs;
      window.allReports = mockRp;
      window.selectedGtbWorkspaceIds = new Set(['ws_prod']);
      window.selectedGtbDatasetIds = new Set(['model_sales']);
      window.selectedGtbReportIds = new Set(['report_sales']);
      localStorage.setItem('pbi-active-workspace', 'ws_prod');
      localStorage.setItem('pbi-active-dataset', 'model_sales');
      localStorage.setItem('pbi-active-report', 'report_sales');
      if (window.updateGlobalTopbarDropdowns) window.updateGlobalTopbarDropdowns();
      if (window.PermissionBlueprint && typeof window.PermissionBlueprint.renderUserAssetsMatrix === 'function') {
        window.PermissionBlueprint.activePresetKey = 'preset_admin';
        window.PermissionBlueprint.currentWorkspaceId = 'ws_prod';
        window.PermissionBlueprint.currentWorkspaceName = 'Production Workspace';
        window.PermissionBlueprint.currentModelKey = 'model_sales';
        window.PermissionBlueprint.renderUserAssetsMatrix();
      }
    });
  }

  test('Hover clean defense & click-to-pin with wire synchronization', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await ensureBlueprintReady(page);

    // Wait for user assets container
    const container = page.locator('#pb-user-assets-container');
    await expect(container).toBeVisible();

    const buildRow = page.locator('.pb-asset-card-row[data-row-id="model_build"]');
    await expect(buildRow).toBeVisible({ timeout: 10000 });

    const firstRow = page.locator('.pb-asset-card-row').first();

    // 1. 悬停防御：鼠标悬浮在小卡片上，绝对不触发任何全屏连线或置灰 (保持画板宁静)
    await firstRow.hover();
    await page.waitForTimeout(160);
    let dimmedCount = await page.locator('.pb-causality-dimmed').count();
    expect(dimmedCount).toBe(0);

    let wireCountOnHover = await page.evaluate(() => document.querySelectorAll('#pb-causality-wires-group *').length);
    expect(wireCountOnHover).toBe(0);

    // 悬停在具备因果关系的 buildRow 上同样绝对不产生连线与置灰
    await buildRow.hover();
    await page.waitForTimeout(160);
    dimmedCount = await page.locator('.pb-causality-dimmed').count();
    expect(dimmedCount).toBe(0);
    wireCountOnHover = await page.evaluate(() => document.querySelectorAll('#pb-causality-wires-group *').length);
    expect(wireCountOnHover).toBe(0);

    // 2. 主动点击锁定：只有点击卡片后，才触发因果图谱与高光连线
    await buildRow.click();
    await expect(buildRow).toHaveClass(/pb-causality-pinned/);
    dimmedCount = await page.locator('.pb-causality-dimmed').count();
    expect(dimmedCount).toBeGreaterThanOrEqual(1);

    const wireCountAfterClick = await page.evaluate(() => document.querySelectorAll('#pb-causality-wires-group *').length);
    expect(wireCountAfterClick).toBeGreaterThanOrEqual(1);

    // 3. 上下移动与滚动跟随：触发列滚动事件后，连线图层平滑跟随更新且保持活跃
    const modelBody = page.locator('.pb-asset-tier-card[data-tier-id="model"] .pb-card-body');
    await modelBody.evaluate(el => {
      el.scrollTop = 20;
      el.dispatchEvent(new Event('scroll'));
    });
    await page.waitForTimeout(50);
    const wiresAfterScroll = await page.evaluate(() => document.querySelectorAll('#pb-causality-wires-group *').length);
    expect(wiresAfterScroll).toBeGreaterThanOrEqual(1);

    // 4. 再次点击同一张卡片：取消锁定，连线与置灰完全清空
    await buildRow.click();
    await expect(buildRow).not.toHaveClass(/pb-causality-pinned/);
    dimmedCount = await page.locator('.pb-causality-dimmed').count();
    expect(dimmedCount).toBe(0);
    const wiresAfterUnpin = await page.evaluate(() => document.querySelectorAll('#pb-causality-wires-group *').length);
    expect(wiresAfterUnpin).toBe(0);

    // 5. 验证左下角图例中包含绿色实线与紫色虚线因果连线的含义说明与交互提示
    const legendTrigger = page.locator('#pb-user-assets-legend .pb-legend-trigger');
    await expect(legendTrigger).toBeVisible();
    await legendTrigger.click();
    const legendCard = page.locator('#pb-user-assets-legend .pb-legend-card');
    await expect(legendCard).toBeVisible();
    await expect(legendCard).toContainText('绿色脉冲实线');
    await expect(legendCard).toContainText('紫色点阵虚线');
    await expect(legendCard).toContainText('点击任意连线可独占高亮聚焦该通路与两侧卡片');
  });

  test('Causality explanation modal & soft border glow verification', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });

    // 1. Verify toolbar buttons: copy audit removed, explain causality added
    await expect(page.locator('#pb-btn-copy-audit-summary')).toHaveCount(0);
    const explainBtn = page.locator('#pb-btn-explain-causality');
    await expect(explainBtn).toBeVisible();

    // 2. Click explain button with no card selected -> modal opens with guidance
    await explainBtn.click();
    const modal = page.locator('#pb-explain-causality-modal');
    await expect(modal).toBeVisible();
    await expect(modal.locator('.modal-content')).toBeVisible();
    await expect(modal).toContainText('尚未锁定选中任何权限小卡片');

    // Close modal
    const closeBtn = modal.locator('.modal-header .close-btn');
    await closeBtn.click();
    await page.waitForTimeout(250);
    await expect(modal).toBeHidden();

    // 3. Pin a card (tenant_export is always present)
    const exportRow = page.locator('.pb-asset-card-row[data-row-id="tenant_export"]');
    await expect(exportRow).toBeVisible();
    await exportRow.click();
    await expect(exportRow).toHaveClass(/pb-causality-pinned/);

    // 4. Open explanation modal for pinned card
    await explainBtn.click();
    await expect(modal).toBeVisible();
    await expect(modal).toContainText('当前解析主体');
    await expect(modal).not.toContainText('为什么会有链接？');
    await expect(modal).not.toContainText('架构是否合理？');

    // Verify relationship targets exist without redundant badge words
    await expect(modal).toContainText('下游派生');
    await expect(modal).not.toContainText('前置依据');
    await expect(modal).not.toContainText('派生能力');

    // Close modal
    await closeBtn.click();
    await page.waitForTimeout(250);
    await expect(modal).toBeHidden();

    // 5. CRITICAL: Closing the modal MUST NOT unpin the card! Card remains pinned!
    await expect(exportRow).toHaveClass(/pb-causality-pinned/);

    // 6. Clicking outside/blank area MUST NOT unpin the card
    await page.mouse.move(10, 10);
    await page.mouse.click(10, 10);
    await page.waitForTimeout(100);
    await expect(exportRow).toHaveClass(/pb-causality-pinned/);

    // 7. Only clicking the same card again unpins it
    await exportRow.click();
    await expect(exportRow).not.toHaveClass(/pb-causality-pinned/);

    // 8. Verify model_read: when no report is selected, downstream report VIEW & INTERACT must be displayed with concise unrendered remark
    const modelReadRow = page.locator('.pb-asset-card-row[data-row-id="model_read"]');
    if (await modelReadRow.count() > 0) {
      await modelReadRow.click();
      await expect(modelReadRow).toHaveClass(/pb-causality-pinned/);
      await explainBtn.click();
      await expect(modal).toBeVisible();

      const modalBody = modal.locator('#pb-explain-modal-body');
      await expect(modalBody).toContainText(/View & Interact/i);
      await expect(modalBody).toContainText('4. REPORT');
      await expect(modalBody).toContainText('Model Read');

      // Check report_view raw ID is NOT shown directly as title
      const modalHtml = await modalBody.innerHTML();
      expect(modalHtml).not.toContain('>${tgtId}<');

      // Close modal: card remains pinned
      await closeBtn.click();
      await page.waitForTimeout(200);
      await expect(modelReadRow).toHaveClass(/pb-causality-pinned/);

      // Only clicking the card itself unpins it
      await modelReadRow.click();
      await expect(modelReadRow).not.toHaveClass(/pb-causality-pinned/);
    }
  });

  test('Causality Wires Layer: Solid Trunk flow for active role & Ghost Probe dashed wire for candidate roles', async ({ page }) => {
    test.setTimeout(60000);
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await ensureBlueprintReady(page);

    const container = page.locator('#pb-user-assets-container');
    await expect(container).toBeVisible();

    // 1. 定位 Build 卡片并点击锁定
    const buildRow = page.locator('.pb-asset-card-row[data-row-id="model_build"]');
    await expect(buildRow).toBeVisible({ timeout: 10000 });
    await buildRow.click();
    await expect(buildRow).toHaveClass(/pb-causality-pinned/);

    // 2. 验证 SVG 连线图层生成
    const wiresSvg = page.locator('#pb-causality-wires-svg');
    await expect(wiresSvg).toBeVisible();

    // 验证主干实线存在 (Admin -> Build 以及 Build -> Export Data)
    const trunkWires = page.locator('.pb-wire-trunk');
    const trunkCount = await trunkWires.count();
    expect(trunkCount).toBeGreaterThanOrEqual(1);

    // 验证幽灵虚线存在 (Member & Contributor 潜在赋能源)
    const ghostWires = page.locator('.pb-wire-ghost');
    const ghostCount = await ghostWires.count();
    expect(ghostCount).toBeGreaterThanOrEqual(1);

    // 验证端点磁吸圆点存在
    const portDots = page.locator('.pb-wire-port-dot');
    expect(await portDots.count()).toBeGreaterThanOrEqual(2);

    // 3. 验证幽灵探针悬浮感知 (Ghost Probe Hover Activation)
    const memberRow = page.locator('.pb-asset-card-row[data-alias-id="ws_role_member"], .pb-asset-card-row[data-row-id="ws_role_member"]');
    if (await memberRow.count() > 0) {
      await memberRow.first().scrollIntoViewIfNeeded();
      await memberRow.first().hover();
      await page.waitForTimeout(100);
      const activeProbeCount = await page.evaluate(() => document.querySelectorAll('.pb-wire-ghost.is-probe-active').length);
      expect(activeProbeCount).toBeGreaterThanOrEqual(1);

      // 移开鼠标后幽灵探针恢复微弱态
      await page.mouse.move(5, 5);
      await page.waitForTimeout(60);
      const clearedProbeCount = await page.evaluate(() => document.querySelectorAll('.pb-wire-ghost.is-probe-active').length);
      expect(clearedProbeCount).toBe(0);
    }

    // 4. 验证连线点击交互 (Click-to-Focus Wire): 点击绿色主干线或紫色虚线，高亮连线与微光圆点，聚焦两侧卡片
    const trunkGroup = page.locator('.pb-wire-group-trunk').first();
    await expect(trunkGroup).toBeVisible();
    await trunkGroup.dispatchEvent('click');
    await page.waitForTimeout(100);

    // 验证选中连线获得聚焦态，其他连线淡化
    await expect(trunkGroup).toHaveClass(/is-wire-focused/);
    const focusedTrunkDots = trunkGroup.locator('.pb-wire-port-dot');
    expect(await focusedTrunkDots.count()).toBe(2);

    // 验证两侧卡片保持高亮 (Active & Target)，其余卡片置灰 (Dimmed)
    const dimmedCardsCount = await page.locator('.pb-causality-dimmed').count();
    expect(dimmedCardsCount).toBeGreaterThanOrEqual(1);

    // 再次点击同一条连线 -> 解除连线聚焦，恢复卡片全局因果态
    await trunkGroup.dispatchEvent('click');
    await page.waitForTimeout(100);
    await expect(trunkGroup).not.toHaveClass(/is-wire-focused/);

    // 5. 点击紫色幽灵虚线聚焦
    await page.waitForTimeout(300);
    const ghostGroupCount = await page.locator('.pb-wire-group-ghost').count();
    if (ghostGroupCount > 0) {
      await page.evaluate(() => {
        const g = document.querySelector('.pb-wire-group-ghost');
        if (g) g.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
      });
      await page.waitForTimeout(200);
      await expect(page.locator('.pb-wire-group-ghost.is-wire-focused')).toHaveCount(1);

      // 解除聚焦
      await page.evaluate(() => {
        const g = document.querySelector('.pb-wire-group-ghost.is-wire-focused');
        if (g) g.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
      });
      await page.waitForTimeout(200);
      await expect(page.locator('.pb-wire-group-ghost.is-wire-focused')).toHaveCount(0);
    }

    // 6. 再次点击 Build 取消锁定：连线图层全部清空
    await buildRow.click({ force: true });
    await expect(buildRow).not.toHaveClass(/pb-causality-pinned/);
    await page.waitForTimeout(100);
    const wiresRemaining = await page.evaluate(() => document.querySelectorAll('#pb-causality-wires-group *').length);
    expect(wiresRemaining).toBe(0);
  });

  test('Edge Clamping & Virtual Port Radar: wires stay connected on card scroll, radar arrows appear and click scrolls card back', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await ensureBlueprintReady(page);

    const container = page.locator('#pb-user-assets-container');
    await expect(container).toBeVisible();

    // 1. 点击锁定 model_build 卡片
    const buildRow = page.locator('.pb-asset-card-row[data-row-id="model_build"]');
    await expect(buildRow).toBeVisible({ timeout: 10000 });
    await buildRow.click();
    await expect(buildRow).toHaveClass(/pb-causality-pinned/);

    // 连线存在且初始为微光圆点
    const wiresGroup = page.locator('#pb-causality-wires-group');
    await expect(wiresGroup).toBeVisible();
    const initialDots = wiresGroup.locator('.pb-wire-port-dot');
    expect(await initialDots.count()).toBeGreaterThanOrEqual(2);

    // 2. 约束高度并模拟向下滚动 model 列，使 model_build 滚出可视区上方 (scrollTop 增大)
    const modelBody = page.locator('.pb-asset-tier-card[data-tier-id="model"] .pb-card-body');
    await modelBody.evaluate(el => {
      el.style.maxHeight = '120px';
      el.scrollTop = 300;
      el.dispatchEvent(new Event('scroll'));
    });
    await page.waitForTimeout(200);

    // 连线依然存在 (绝不被粗暴截断销毁)
    const wiresAfterScroll = await page.evaluate(() => document.querySelectorAll('#pb-causality-wires-group path.pb-wire-trunk').length);
    expect(wiresAfterScroll).toBeGreaterThanOrEqual(1);

    // 验证离屏雷达探针生成 (出现带有方向箭头与提示的 pb-wire-radar-anchor)
    const radarAnchors = wiresGroup.locator('.pb-wire-radar-anchor');
    const radarCount = await radarAnchors.count();
    expect(radarCount).toBeGreaterThanOrEqual(1);

    // 验证雷达探针具有向下吸附探针 (radar-bottom)
    const bottomRadar = wiresGroup.locator('.pb-wire-radar-anchor.radar-bottom');
    expect(await bottomRadar.count()).toBeGreaterThanOrEqual(1);

    // 3. 点击雷达探针：触发平滑回滚与高光脉冲
    await bottomRadar.first().click({ force: true });
    await page.waitForTimeout(400);

    // 验证目标卡片 model_build 获得脉冲动效类
    await expect(buildRow).toHaveClass(/pb-radar-scrolled-target/);
  });

  test('Model GAC causality modal displays dual upstreams: Tenant GAC Policy and Workspace GAC Setting', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await ensureBlueprintReady(page);

    const container = page.locator('#pb-user-assets-container');
    await expect(container).toBeVisible();

    // 1. 验证 Model GAC 卡片存在
    const modelGacRow = page.locator('.pb-asset-card-row[data-row-id="model_gac"]');
    await expect(modelGacRow).toBeVisible({ timeout: 10000 });

    // 2. 点击 Model GAC 锁定因果焦点
    await modelGacRow.click();
    await expect(modelGacRow).toHaveClass(/pb-causality-pinned/);

    // 3. 点击顶部「🔍 因果解析」按钮打开 Laya 弹窗
    const explainBtn = page.locator('#pb-btn-explain-causality');
    await expect(explainBtn).toBeVisible();
    await explainBtn.click();

    // 4. 验证弹窗可见并包含双重上游依据 (Tenant GAC Policy + Workspace GAC Setting)
    const modal = page.locator('#pb-explain-causality-modal');
    await expect(modal).toBeVisible();

    // 验证包含上游依据且计数为 2
    await expect(modal).toContainText('上游依据 (2)');
    // 验证上游依据中同时包含租户和工作区策略
    await expect(modal).toContainText('TENANT');
    await expect(modal).toContainText('Workspace GAC');
    // 验证下游派生
    await expect(modal).toContainText('下游派生');

    // 5. 验证弹窗中 Laya 哨兵卫栏正常呈现
    const layaBar = modal.locator('#pb-laya-guardrail-bar');
    await expect(layaBar).toBeVisible();
  });

  test('API Explorer contains Internal Services category with all 9 internal endpoints', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await page.evaluate(() => {
      localStorage.setItem('pbi-active-module', 'api_tree');
      localStorage.setItem('pbi-rail-expanded', 'true');
      localStorage.setItem('pbi-sidebar-collapsed', 'false');
      document.body.classList.remove('sidebar-collapsed');
      if (typeof window.switchAppModule === 'function') {
        window.switchAppModule('api_tree');
      }
    });
    await page.waitForTimeout(300);

    // 1. 验证左侧 API 树存在 Internal Services 分类
    const internalCatHeader = page.locator('.api-category-title:has-text("Internal Services")');
    await internalCatHeader.scrollIntoViewIfNeeded();
    await expect(internalCatHeader).toBeVisible({ timeout: 10000 });

    // 验证包含 9 个内部微服务 API
    const catItem = page.locator('.api-category:has-text("Internal Services")');
    const apiCountBadge = catItem.locator('.api-category-count');
    await expect(apiCountBadge).toContainText('9');

    // 2. 点击展开 Internal Services 分类
    await internalCatHeader.click();
    const endpointList = catItem.locator('.api-list');
    await expect(endpointList).toBeVisible();

    // 3. 验证关键内部端点存在
    await expect(endpointList).toContainText('Get Model Security & Strict Mode Context');
    await expect(endpointList).toContainText('Launch Web Power Query Mashup Editor');
    await expect(endpointList).toContainText('Workspace Delegated Tenant Setting Overrides');
    await expect(endpointList).toContainText('Query & Step Dependent Graph');
  });

  test('Live WABI probe inspects model GAC status and updates blueprint cards', async ({ page }) => {
    // 1. 先验证后端 /api/fabric/inspect-gac-status 探针接口真实连通性与回退基线
    const probeRes = await page.request.get('/api/fabric/inspect-gac-status?model_id=model_sales&workspace_id=ws_prod');
    expect(probeRes.ok()).toBeTruthy();
    const probeData = await probeRes.json();
    expect(probeData.success).toBe(true);
    expect(probeData.security_info).toBeDefined();
    expect(probeData.security_info.isInStrictMode).toBe(true);

    // 2. 进入全景权限蓝图模块验证前端卡片渲染与 LIVE WABI 徽章
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => window.PermissionBlueprint && typeof window.PermissionBlueprint.renderUserAssetsMatrix === 'function', { timeout: 15000 });

    await page.evaluate(() => {
      const mockWs = [{ id: 'ws_prod', name: 'Production Workspace', alias: 'Production Workspace' }];
      const mockDs = [{ id: 'model_sales', name: 'Sales Model', alias: 'Sales Model', workspaceId: 'ws_prod' }];
      const mockRp = [{ id: 'report_sales', name: 'Sales Report', alias: 'Sales Report', workspaceId: 'ws_prod' }];
      window.allWorkspaces = mockWs;
      window.allDatasets = mockDs;
      window.allReports = mockRp;
      window.selectedGtbWorkspaceIds = new Set(['ws_prod']);
      window.selectedGtbDatasetIds = new Set(['model_sales']);
      window.selectedGtbReportIds = new Set(['report_sales']);
      localStorage.setItem('pbi-active-workspace', 'ws_prod');
      localStorage.setItem('pbi-active-dataset', 'model_sales');
      if (window.updateGlobalTopbarDropdowns) window.updateGlobalTopbarDropdowns();

      // 预先向缓存写入已验证的 WABI 探针结果，模拟真实微服务响应注入
      window._modelLiveGacCache = window._modelLiveGacCache || {};
      window._modelLiveGacCache['ws_prod_model_sales'] = {
        success: true,
        is_live: true,
        cluster: 'wabi-south-east-asia-b-primary-redirect.analysis.windows.net',
        model_id: 'model_sales',
        security_info: {
          isInStrictMode: true,
          hasAccessToAllDataConnections: true,
          isModelOwner: false
        }
      };

      if (window.PermissionBlueprint && typeof window.PermissionBlueprint.renderUserAssetsMatrix === 'function') {
        window.PermissionBlueprint.activePresetKey = 'preset_admin';
        window.PermissionBlueprint.currentWorkspaceId = 'ws_prod';
        window.PermissionBlueprint.currentWorkspaceName = 'Production Workspace';
        window.PermissionBlueprint.currentModelKey = 'model_sales';
        window.PermissionBlueprint.renderUserAssetsMatrix();
      }
    });

    const container = page.locator('#pb-user-assets-container');
    await expect(container).toBeVisible();

    // 验证 Model GAC 卡片徽章与描述展示内部微服务/基线数据
    const modelGacRow = page.locator('.pb-asset-card-row[data-row-id="model_gac"]');
    await expect(modelGacRow).toBeVisible({ timeout: 10000 });
    const modelGacBadge = modelGacRow.locator('.pb-asset-tag-pill');
    await expect(modelGacBadge).toHaveText('⚡ LIVE WABI');

    // 验证 Workspace GAC Setting 卡片徽章与描述
    const wsGacRow = page.locator('.pb-asset-card-row[data-row-id="ws_gac_setting"]');
    await expect(wsGacRow).toBeVisible({ timeout: 10000 });
    const wsGacBadge = wsGacRow.locator('.pb-asset-tag-pill');
    await expect(wsGacBadge).toHaveText('⚡ LIVE WABI');
  });
});




