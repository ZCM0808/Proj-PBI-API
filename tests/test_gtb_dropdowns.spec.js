const { test, expect } = require('@playwright/test');

test.describe('Global Topbar Unified Custom Dropdowns Verification', () => {

  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 1400, height: 900 });
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');

    // 预注入模拟的工作区、模型与报表测试数据
    await page.evaluate(() => {
      localStorage.setItem('pbi_workspaces', JSON.stringify([
        { id: 'ws-101', name: 'WorkSpace_DEV', alias: 'WorkSpace_DEV' },
        { id: 'ws-102', name: 'WorkSpace_PROD', alias: 'WorkSpace_PROD' }
      ]));
      localStorage.setItem('pbi_datasets', JSON.stringify([
        { id: 'ds-201', name: 'Sales_Model', workspaceId: 'ws-101' },
        { id: 'ds-202', name: 'Finance_Model', workspaceId: 'ws-102' }
      ]));
      localStorage.setItem('pbi_reports', JSON.stringify([
        { id: 'rp-301', name: 'Sales_Executive_Report', workspaceId: 'ws-101' },
        { id: 'rp-302', name: 'Finance_PnL_Report', workspaceId: 'ws-102' },
        { id: 'rp-303', name: 'Global_HR_Overview', workspaceId: 'ws-101' }
      ]));
      localStorage.setItem('pbi-xmla-history', JSON.stringify([
        'powerbi://api.powerbi.com/v1.0/myorg/WorkSpace_DEV',
        'powerbi://api.powerbi.com/v1.0/myorg/WorkSpace_PROD'
      ]));

      // 设置已选工作区为 ws-101，保证联动报表可用
      window.selectedGtbWorkspaceIds = new Set(['ws-101']);
      window.selectedGtbReportIds = new Set();
      window._gtbRpInitialized = false;

      // 触发顶栏刷新
      if (window.updateGlobalTopbarDropdowns) {
        window.updateGlobalTopbarDropdowns();
      }
    });
  });

  test('Requirement 1: Report has custom dropdown matching Workspace/Model design (trigger, search, list, badge, copy)', async ({ page }) => {
    const rpTrigger = page.locator('#gtb-rp-trigger');
    const rpDropdown = page.locator('#gtb-rp-dropdown');
    const rpBox = page.locator('#gtb-report-box');

    await expect(rpTrigger).toBeVisible();
    await expect(rpDropdown).toBeHidden();

    // 1. Click to toggle open
    await rpTrigger.click();
    await expect(rpDropdown).toBeVisible();
    await expect(rpBox).toHaveClass(/active/);

    // 2. Check search input and actions
    const searchInput = page.locator('#gtb-rp-search-input');
    await expect(searchInput).toBeVisible();
    const selectAllBtn = page.locator('#gtb-rp-dropdown .gtb-ws-actions .gtb-ws-btn-sm', { hasText: '全选' });
    const clearBtn = page.locator('#gtb-rp-dropdown .gtb-ws-actions .gtb-ws-btn-sm', { hasText: '清空' });
    await expect(selectAllBtn).toBeVisible();
    await expect(clearBtn).toBeVisible();

    // 3. Test Clear Action
    await clearBtn.click();
    expect(await page.locator('#gtb-rp-display-text').textContent()).toContain('-- 选择报表 (0) --');

    // 4. Search filtering
    await searchInput.fill('Sales');
    const visibleItems = page.locator('#gtb-rp-list .gtb-rp-item:visible');
    const count = await visibleItems.count();
    expect(count).toBeGreaterThanOrEqual(1);

    // 5. Click item to select
    await visibleItems.first().click();
    const displayText = await page.locator('#gtb-rp-display-text').textContent();
    expect(displayText).toContain('Sales_Executive_Report');

    // 6. Click outside to close
    await page.mouse.click(10, 10);
    await expect(rpDropdown).toBeHidden();
    await expect(rpBox).not.toHaveClass(/active/);
  });

  test('Requirement 2: XMLA Endpoint has custom dropdown with history, search, and quick switch', async ({ page }) => {
    const xmlaTrigger = page.locator('#gtb-xmla-trigger');
    const xmlaDropdown = page.locator('#gtb-xmla-dropdown');
    const xmlaBox = page.locator('#gtb-xmla-box');

    await expect(xmlaTrigger).toBeVisible();
    await expect(xmlaDropdown).toBeHidden();

    // Click to toggle open
    await xmlaTrigger.click();
    await expect(xmlaDropdown).toBeVisible();
    await expect(xmlaBox).toHaveClass(/active/);

    // Check search input
    const searchInput = page.locator('#gtb-xmla-search-input');
    await expect(searchInput).toBeVisible();

    // Check items in list
    const xmlaItems = page.locator('#gtb-xmla-list .gtb-xmla-item');
    expect(await xmlaItems.count()).toBeGreaterThanOrEqual(2);

    // Click first item to select
    await xmlaItems.first().click();
    await expect(xmlaDropdown).toBeHidden();

    const displayText = await page.locator('#gtb-xmla-display-text').textContent();
    expect(displayText).toContain('myorg/');
  });

  test('Requirement 3: Auth Mode has custom dropdown card panel with Service Principal & Personal mode', async ({ page }) => {
    const authTrigger = page.locator('#gtb-auth-trigger');
    const authDropdown = page.locator('#gtb-auth-dropdown');
    const authBox = page.locator('#gtb-auth-box');

    await expect(authTrigger).toBeVisible();
    await expect(authDropdown).toBeHidden();

    // Click to toggle open
    await authTrigger.click();
    await expect(authDropdown).toBeVisible();
    await expect(authBox).toHaveClass(/active/);

    // Verify both mode cards exist
    const cards = page.locator('#gtb-auth-list .gtb-auth-card');
    await expect(cards).toHaveCount(2);

    const spCard = cards.filter({ hasText: 'Service Principal' });
    const personalCard = cards.filter({ hasText: 'Personal' });
    await expect(spCard).toBeVisible();
    await expect(personalCard).toBeVisible();

    // Click outside to close
    await page.mouse.click(10, 10);
    await expect(authDropdown).toBeHidden();
  });

  test('Requirement 4: Tenant has custom profile dropdown popover', async ({ page }) => {
    const tenantTrigger = page.locator('#gtb-tenant-trigger');
    const tenantDropdown = page.locator('#gtb-tenant-dropdown');
    const tenantBox = page.locator('#gtb-tenant-box');

    await expect(tenantTrigger).toBeVisible();
    await expect(tenantDropdown).toBeHidden();

    // Click to toggle open
    await tenantTrigger.click();
    await expect(tenantDropdown).toBeVisible();
    await expect(tenantBox).toHaveClass(/active/);

    // Check detail fields
    await expect(page.locator('#gtb-tenant-detail-name')).toBeVisible();
    await expect(page.locator('#gtb-tenant-detail-id')).toBeVisible();

    // Click outside to close
    await page.mouse.click(10, 10);
    await expect(tenantDropdown).toBeHidden();
  });

  test('Requirement 5: Mutual exclusion - opening one dropdown closes all others', async ({ page }) => {
    const wsTrigger = page.locator('#gtb-ws-trigger');
    const rpTrigger = page.locator('#gtb-rp-trigger');
    const xmlaTrigger = page.locator('#gtb-xmla-trigger');
    const authTrigger = page.locator('#gtb-auth-trigger');

    // Open Workspace dropdown
    await wsTrigger.click();
    await expect(page.locator('#gtb-ws-dropdown')).toBeVisible();

    // Now open Report dropdown - Workspace should automatically close
    await rpTrigger.click();
    await expect(page.locator('#gtb-rp-dropdown')).toBeVisible();
    await expect(page.locator('#gtb-ws-dropdown')).toBeHidden();

    // Now open XMLA dropdown - Report should automatically close
    await xmlaTrigger.click();
    await expect(page.locator('#gtb-xmla-dropdown')).toBeVisible();
    await expect(page.locator('#gtb-rp-dropdown')).toBeHidden();

    // Now open Auth dropdown - XMLA should automatically close
    await authTrigger.click();
    await expect(page.locator('#gtb-auth-dropdown')).toBeVisible();
    await expect(page.locator('#gtb-xmla-dropdown')).toBeHidden();
  });

  test('Requirement 6: Report dropdown groups items by workspace (Workspace Matrix, Collapsible, Group Select/Deselect)', async ({ page }) => {
    // 允许查看全部工作区报表，包含指定工作区和未指定工作区的报表
    await page.evaluate(() => {
      localStorage.setItem('pbi_reports', JSON.stringify([
        { id: 'rp-1', name: 'DEV_Report_A', workspaceId: 'ws-101' },
        { id: 'rp-2', name: 'DEV_Report_B', workspaceId: 'ws-101' },
        { id: 'rp-3', name: 'PROD_Report_X', workspaceId: 'ws-102' },
        { id: 'rp-4', name: 'Orphan_Report_Z' } // 未指定工作区
      ]));
      window.selectedGtbWorkspaceIds = new Set(['ws-101', 'ws-102']);
      window.selectedGtbReportIds = new Set();
      window._gtbRpInitialized = true;
      window.updateGlobalTopbarDropdowns();
    });

    const rpTrigger = page.locator('#gtb-rp-trigger');
    const rpDropdown = page.locator('#gtb-rp-dropdown');

    // 打开报表下拉列表
    await rpTrigger.click();
    await expect(rpDropdown).toBeVisible();

    // 1. 验证存在对应的工作区分组
    const groups = page.locator('#gtb-rp-list .gtb-rp-ws-group');
    await expect(groups).toHaveCount(3); // ws-101, ws-102, __unassigned__

    // 2. 验证工作区分组头部与徽章
    const devGroup = groups.filter({ hasText: 'WorkSpace_DEV' });
    await expect(devGroup).toBeVisible();
    await expect(devGroup.locator('.gtb-rp-ws-badge')).toHaveText('2 个报表');

    const unassignedGroup = groups.filter({ hasText: '其他 / 未指定工作区报表' });
    await expect(unassignedGroup).toBeVisible();
    await expect(unassignedGroup.locator('.gtb-rp-ws-badge')).toHaveText('1 个报表');

    // 3. 测试分组折叠与展开
    const devHeader = devGroup.locator('.gtb-rp-ws-header');
    await devHeader.click();
    await expect(devGroup).toHaveClass(/collapsed/);

    await devHeader.click();
    await expect(devGroup).not.toHaveClass(/collapsed/);

    // 4. 测试分组头部一键全选/反选
    const devToggleBtn = devGroup.locator('button.gtb-ws-btn-sm');
    await expect(devToggleBtn).toHaveText('全选');
    await devToggleBtn.click();

    // 验证 ws-101 组内两个报表均被勾选
    const devCheckboxes = devGroup.locator('input[type="checkbox"]');
    await expect(devCheckboxes.nth(0)).toBeChecked();
    await expect(devCheckboxes.nth(1)).toBeChecked();
    await expect(devToggleBtn).toHaveText('取消');

    // 再次点击取消全选
    await devToggleBtn.click();
    await expect(devCheckboxes.nth(0)).not.toBeChecked();
    await expect(devCheckboxes.nth(1)).not.toBeChecked();
    await expect(devToggleBtn).toHaveText('全选');

    // 5. 测试搜索时自动展开
    // 先折叠 dev 分组
    await devHeader.click();
    await expect(devGroup).toHaveClass(/collapsed/);

    // 搜索 DEV_Report_A，分组应自动取消 collapsed
    const searchInput = page.locator('#gtb-rp-search-input');
    await searchInput.fill('DEV_Report_A');
    await expect(devGroup).not.toHaveClass(/collapsed/);
    await expect(devGroup.locator('.gtb-rp-item:visible')).toHaveCount(1);
  });

});
