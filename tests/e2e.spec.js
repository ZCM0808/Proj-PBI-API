const { test, expect } = require('@playwright/test');

test.describe('Proj-PBI-API UI e2e tests', () => {

  test.beforeEach(async ({ page }) => {
    // 导航到主页
    await page.goto('/');
    // 清空缓存以保证测试环境干净
    await page.evaluate(() => localStorage.clear());
    await page.reload();
  });

  test('刷新页面后，历史下拉框默认必须是隐藏的 (不能因为 CSS 冲突自动展开)', async ({ page }) => {
    const dropdown = page.locator('#request-history-dropdown');
    // 断言下拉框不可见
    await expect(dropdown).toBeHidden();
  });

  test('左侧的一键展开/折叠按钮可以正常控制 API 树的显示状态', async ({ page }) => {
    // 等待 API 树渲染完成
    const apiTree = page.locator('#api-tree');
    await expect(apiTree).toBeVisible();

    const toggleBtn = page.locator('#toggle-all-categories-btn');
    
    // 获取第一个 API 列表（默认为折叠状态）
    const firstList = page.locator('.api-list').first();
    await expect(firstList).toBeHidden();

    // 点击全部展开按钮
    await toggleBtn.click();
    await expect(firstList).toBeVisible();

    // 再次点击折叠按钮
    await toggleBtn.click();
    await expect(firstList).toBeHidden();
  });

  test('点击 New Request 按钮后，Badge 会正确切换为 Free Mode', async ({ page }) => {
    const newBtn = page.locator('#new-request-btn');
    await newBtn.click();
    
    const badge = page.locator('#request-mode-badge');
    await expect(badge).toHaveText(/Free Mode/);
  });

  test('视觉回归测试 (Visual Regression): 主页 UI 必须与基准快照保持像素级一致', async ({ page }) => {
    // 隐藏可能动态变化的元素（如时间、请求耗时等，如果有的话）
    // 等待核心元素渲染完成
    await expect(page.locator('#api-tree')).toBeVisible();
    
    // 对整个页面进行像素级快照对比 (第一次运行会自动生成 baseline)
    await expect(page).toHaveScreenshot('homepage-baseline.png', { fullPage: true, maxDiffPixels: 100 });
  });
});
