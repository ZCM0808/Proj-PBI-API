const { test, expect } = require('@playwright/test');

test.describe('GTB Model Search & Panoramic Permission Chain Model Application Verification', () => {
  test.setTimeout(60000);

  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 1400, height: 900 });
    await page.goto('/', { waitUntil: 'domcontentloaded' });

    // 注入模拟的工作区与模型数据：包含 APAC 工作区以及跨工作区的多个模型
    await page.evaluate(() => {
      localStorage.setItem('pbi_workspaces', JSON.stringify([
        { id: 'ws-apac-101', name: 'DA_APAC_PROD', alias: 'DA_APAC_PROD' },
        { id: 'ws-emea-102', name: 'DA_EMEA_PROD', alias: 'DA_EMEA_PROD' }
      ]));
      localStorage.setItem('pbi_datasets', JSON.stringify([
        { id: 'ds-apac-01', name: 'apac_channel_performance_analytics', alias: 'apac_channel_performance_analytics', workspaceId: 'ws-apac-101' },
        { id: 'ds-fin-02', name: 'finance_ledger_model', alias: 'finance_ledger_model', workspaceId: 'ws-apac-101' },
        { id: 'ds-emea-03', name: 'emea_supply_chain', alias: 'emea_supply_chain', workspaceId: 'ws-emea-102' }
      ]));

      // 预设选定工作区为 ws-apac-101
      window.selectedGtbWorkspaceIds = new Set(['ws-apac-101']);
      window.selectedGtbDatasetIds = new Set();
      window._gtbDsInitialized = false;

      if (window.updateGlobalTopbarDropdowns) {
        window.updateGlobalTopbarDropdowns();
      }
    });
  });

  test('验证 1: 顶栏模型下拉框搜索 apac 时仅展示匹配该关键字的模型，绝不带出该工作区下所有模型', async ({ page }) => {
    const dsTrigger = page.locator('#gtb-ds-trigger');
    const dsDropdown = page.locator('#gtb-ds-dropdown');
    const dsSearchInput = page.locator('#gtb-ds-search-input');

    // 打开模型下拉 Popover
    await dsTrigger.click();
    await expect(dsDropdown).toBeVisible();

    // 搜索 "apac"
    await dsSearchInput.fill('apac');

    // 验证：apac_channel_performance_analytics 处于可见状态
    const apacItem = dsDropdown.locator('.gtb-ds-item:visible', { hasText: /apac.*channel.*performance/i }).first();
    await expect(apacItem).toBeVisible();

    // 验证：同属 DA_APAC_PROD 工作区的 finance_ledger_model 绝不应该可见
    const financeItem = dsDropdown.locator('.gtb-ds-item:visible', { hasText: 'finance_ledger_model' });
    await expect(financeItem).toHaveCount(0);

    // 验证：不属于 apac 的 emea_supply_chain 也绝不应该可见
    const emeaItem = dsDropdown.locator('.gtb-ds-item:visible', { hasText: 'emea_supply_chain' });
    await expect(emeaItem).toHaveCount(0);
  });

  test('验证 2: 搜索并选中某个模型后，全景权限链路中的 MODEL 模块即刻应用并渲染该选中的模型', async ({ page }) => {
    // 1. 切换到权限流转蓝图模块并选择全景权限链路 Tab
    await page.evaluate(() => {
      window.switchAppModule('permission_blueprint');
      if (window.PermissionBlueprint) {
        window.PermissionBlueprint.switchMainTab('user_assets');
      }
    });

    const userAssetsContainer = page.locator('#pb-user-assets-container');
    await expect(userAssetsContainer).toBeVisible();

    // 未选模型前，验证 Model 模块呈现未选提示
    const modelCardHeader = page.locator('.pb-asset-tier-card[data-tier-id="model"] .pb-card-header');
    await expect(modelCardHeader).toContainText('尚未选择');

    // 2. 在顶栏搜索并选择 apac_channel_performance_analytics 模型
    const dsTrigger = page.locator('#gtb-ds-trigger');
    await dsTrigger.click();
    const dsDropdown = page.locator('#gtb-ds-dropdown');
    await expect(dsDropdown).toBeVisible();

    const dsSearchInput = page.locator('#gtb-ds-search-input');
    await dsSearchInput.fill('apac');

    const apacItem = dsDropdown.locator('.gtb-ds-item:visible', { hasText: /apac.*channel.*performance/i }).first();
    await expect(apacItem).toBeVisible();
    await apacItem.click();

    // 3. 验证全景权限链路中的 MODEL 模块已自动应用选中的模型！
    await expect(modelCardHeader).toContainText(/APAC.*CHANNEL.*PERFORMANCE/i);
    await expect(modelCardHeader).not.toContainText('尚未选择');

    // 验证 MODEL 模块内部小卡片已正确生成
    const modelRowPermission = page.locator('.pb-asset-tier-card[data-tier-id="model"] .pb-asset-card-row[data-row-id="model_permission"]');
    await expect(modelRowPermission).toBeVisible();

    // 4. 验证小卡片标题已彻底移除括号及内部说明 (冗余去除)
    const modelRowRead = page.locator('.pb-asset-tier-card[data-tier-id="model"] .pb-asset-card-row[data-row-id="model_read"]');
    await expect(modelRowRead).toBeVisible();
    const readTitle = modelRowRead.locator('.pb-asset-prop-name');
    await expect(readTitle).toHaveText('READ');

    // 5. 验证卡片上的图例标识 (ASSIGNED / CAPABILITY / ENV) 始终清晰常驻展示
    const readCatPill = modelRowRead.locator('.pb-cat-tag-pill');
    await expect(readCatPill).toHaveText('CAPABILITY');
    await expect(readCatPill).toBeVisible();

    const permCatPill = modelRowPermission.locator('.pb-cat-tag-pill');
    await expect(permCatPill).toHaveText('ASSIGNED');
    await expect(permCatPill).toBeVisible();

    // 6. 验证选中 delete workspace 时，tenant 区域的 tenant member 卡片绝不高亮
    const wsDeleteRow = page.locator('.pb-asset-tier-card[data-tier-id="workspace"] .pb-asset-card-row[data-row-id="ws_delete"]');
    await expect(wsDeleteRow).toBeVisible();
    await wsDeleteRow.click();

    // 验证 ws_delete 本身激活
    await expect(wsDeleteRow).toHaveClass(/pb-causality-active/);

    // 验证 tenant_principal_role 绝不高亮为 target，而是作为无关项被淡化 (dimmed)
    const tenantMemberRow = page.locator('.pb-asset-tier-card[data-tier-id="tenant"] .pb-asset-card-row[data-row-id="tenant_principal_role"]');
    await expect(tenantMemberRow).not.toHaveClass(/pb-causality-target/);
    await expect(tenantMemberRow).toHaveClass(/pb-causality-dimmed/);

    // 验证工作区角色 ws_role 作为上游依赖正确高亮
    const wsRoleRow = page.locator('.pb-asset-tier-card[data-tier-id="workspace"] .pb-asset-card-row[data-row-id="ws_role"]');
    await expect(wsRoleRow).toHaveClass(/pb-causality-target/);

    // 7. 验证高亮/选中期间，图例标识仍然常驻可见
    await expect(wsRoleRow.locator('.pb-cat-tag-pill')).toBeVisible();
    await expect(wsDeleteRow.locator('.pb-cat-tag-pill')).toBeVisible();
  });

});
