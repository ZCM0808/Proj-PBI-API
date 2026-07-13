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

  test('官方绑定模式 (Bound Mode)：点击 API 树能正确绑定并支持 Reset 重置', async ({ page }) => {
    // 等待 API 树并展开
    const toggleBtn = page.locator('#toggle-all-categories-btn');
    await toggleBtn.click();

    // 点击第一个 API 节点
    const firstApiItem = page.locator('.api-item').first();
    await expect(firstApiItem).toBeVisible();
    await firstApiItem.click();

    // 验证 Badge 是否变为 Bound to 模式
    const badge = page.locator('#request-mode-badge');
    await expect(badge).toContainText('Bound to:');

    // 验证 URL 是否被填充
    const urlInput = page.locator('#api-endpoint');
    const originalUrl = await urlInput.inputValue();
    expect(originalUrl.length).toBeGreaterThan(0);

    // 修改 URL 模拟用户破坏内容
    await urlInput.fill('/api/hacked/url');
    
    // 点击 Reset 按钮
    const resetBtn = page.locator('#reset-request-btn');
    await resetBtn.click();

    // 验证是否瞬间恢复
    const restoredUrl = await urlInput.inputValue();
    expect(restoredUrl).toBe(originalUrl);
  });

  test('设置弹窗与环境变量清洗：必须抹除多行 SQL_CONN_STR 的回车换行符', async ({ page }) => {
    // 点击设置按钮
    const settingsBtn = page.locator('#btn-settings');
    await settingsBtn.click();

    // 弹窗可见
    const settingsModal = page.locator('#settings-modal');
    await expect(settingsModal).toBeVisible();

    // 填入带恶意回车换行的 SQL 字符串
    const sqlInput = page.locator('#set-sql');
    await sqlInput.fill('Server=myServerAddress;\r\nDatabase=myDataBase;\nUser Id=myUsername;');

    // 拦截网络请求并等待发出
    const requestPromise = page.waitForRequest(request => request.url().includes('/api/settings') && request.method() === 'POST');

    // 强制点击保存（防止由于动画或 Modal 结构导致元素被遮挡）
    const saveBtn = page.locator('#save-settings-btn');
    await saveBtn.click({ force: true });

    // 验证网络请求的 Payload 中是否已经没有换行符
    const request = await requestPromise;
    const capturedPayload = request.postDataJSON();
    
    expect(capturedPayload).not.toBeNull();
    expect(capturedPayload.SQL_CONN_STR).toBe('Server=myServerAddress;Database=myDataBase;User Id=myUsername;');
  });

  test('全局历史记录搜索 (Fuzzy Search) 与清空机制', async ({ page }) => {
    // 拦截发送请求，直接返回 Mock 数据，避免受制于真实后端状态
    await page.route('**/api/proxy', route => route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ success: true, data: "Mocked response" })
    }));

    // 制造一条历史记录
    await page.locator('#new-request-btn').click();
    await page.locator('#api-endpoint').fill('/test/fake/endpoint/123');
    await page.locator('#send-btn').click();
    
    // 等待请求响应完成（前端通常在响应后才写入 history）
    await page.waitForTimeout(500);

    // 打开历史下拉框
    const historyBtn = page.locator('#history-request-btn');
    await historyBtn.click();
    
    const dropdown = page.locator('#request-history-dropdown');
    await expect(dropdown).toBeVisible();

    // 应该能看到历史记录列表
    const listContainer = page.locator('#history-list-container');
    const fakeEndpointElement = listContainer.locator('div', { hasText: '/test/fake/endpoint/123' }).first();
    await expect(fakeEndpointElement).toBeVisible();

    // 测试搜索过滤（输入不存在的关键字）
    const searchInput = page.locator('#history-search-input');
    await searchInput.fill('NotFoundKeyword');
    await expect(fakeEndpointElement).toBeHidden();

    // 测试搜索过滤（输入正确的关键字）
    await searchInput.fill('/test/fake');
    await expect(fakeEndpointElement).toBeVisible();

    // 监听并同意清空确认弹窗
    page.on('dialog', dialog => dialog.accept());
    
    // 测试清空所有
    const clearBtn = page.locator('#history-clear-all');
    await clearBtn.click();
    
    // 弹窗会因为清空而自动关闭
    await expect(dropdown).toBeHidden();
  });

  test('视觉回归测试 (Visual Regression): 主页 UI 必须与基准快照保持像素级一致', async ({ page }) => {
    // 隐藏可能动态变化的元素（如时间、请求耗时等，如果有的话）
    // 等待核心元素渲染完成
    await expect(page.locator('#api-tree')).toBeVisible();
    
    // Windows 11 (本地) 和 Windows Server (GitHub CI) 的系统字体渲染会有微小差异
    // 允许最多 5% 的像素差异阈值
    await expect(page).toHaveScreenshot('homepage-baseline.png', { fullPage: true, maxDiffPixels: 100, maxDiffPixelRatio: 0.05 });
  });

  test('???????? (Component Visual Regression): ????? API ?????,????????', async ({ page }) => {
    await expect(page.locator('#api-tree')).toBeVisible();
    const sidebar = page.locator('.sidebar');
    // ??? sidebar ???,?????????????????
    await expect(sidebar).toHaveScreenshot('sidebar-baseline.png', { maxDiffPixelRatio: 0.05 });
  });
});
