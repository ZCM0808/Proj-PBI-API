const { test, expect } = require('@playwright/test');

test.describe('Causality Glow Hover Intent & Gap Buffer Verification', () => {

  test.beforeEach(async ({ page }) => {
    await page.route('**/*.{png,jpg,jpeg,woff,woff2,ttf}', route => route.abort());
    await page.route(/fonts\.googleapis\.com/, route => route.abort());
    await page.route(/alcdn\.msauth\.net/, route => route.abort());
    await page.addInitScript(() => {
      localStorage.clear();
      localStorage.setItem('pbi-active-module', 'permission_blueprint');
      localStorage.setItem('pb-active-main-tab', 'user_assets');
    });
  });

  test('Hover clean defense & click-to-pin with wire synchronization', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await page.evaluate(() => {
      localStorage.setItem('pbi-active-module', 'permission_blueprint');
      localStorage.setItem('pb-active-main-tab', 'user_assets');
      localStorage.setItem('pb-active-preset', 'preset_admin');
    });
    await page.reload({ waitUntil: 'domcontentloaded' });

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
      if (window.PermissionBlueprint && typeof window.PermissionBlueprint.renderUserAssetsMatrix === 'function') {
        window.PermissionBlueprint.activePresetKey = 'preset_admin';
        window.PermissionBlueprint.currentWorkspaceId = 'ws_prod';
        window.PermissionBlueprint.currentWorkspaceName = 'Production Workspace';
        window.PermissionBlueprint.currentModelKey = 'model_sales';
        window.PermissionBlueprint.renderUserAssetsMatrix();
      }
    });

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
  });

  test('Causality explanation modal & soft border glow verification', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await page.evaluate(() => {
      localStorage.setItem('pbi-active-module', 'permission_blueprint');
      localStorage.setItem('pb-active-main-tab', 'user_assets');
    });
    await page.reload({ waitUntil: 'domcontentloaded' });

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
      await expect(modalBody).toContainText('VIEW & INTERACT');
      await expect(modalBody).toContainText('4. REPORT');
      await expect(modalBody).toContainText('顶栏尚未挑选具体报表');
      await expect(modalBody).toContainText('尚未加载');

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
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await page.evaluate(() => {
      localStorage.setItem('pbi-active-module', 'permission_blueprint');
      localStorage.setItem('pb-active-main-tab', 'user_assets');
      localStorage.setItem('pb-active-preset', 'preset_admin');
    });
    await page.reload({ waitUntil: 'domcontentloaded' });

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
    const ghostGroup = page.locator('.pb-wire-group-ghost').first();
    if (await ghostGroup.count() > 0) {
      await ghostGroup.dispatchEvent('click');
      await page.waitForTimeout(100);
      await expect(ghostGroup).toHaveClass(/is-wire-focused/);
      // 解除聚焦
      await ghostGroup.dispatchEvent('click');
      await page.waitForTimeout(100);
      await expect(ghostGroup).not.toHaveClass(/is-wire-focused/);
    }

    // 6. 再次点击 Build 取消锁定：连线图层全部清空
    await buildRow.click({ force: true });
    await expect(buildRow).not.toHaveClass(/pb-causality-pinned/);
    await page.waitForTimeout(100);
    const wiresRemaining = await page.evaluate(() => document.querySelectorAll('#pb-causality-wires-group *').length);
    expect(wiresRemaining).toBe(0);
  });
});



