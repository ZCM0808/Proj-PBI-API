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

    // 等待 FLIP 动画完全结束 (350ms)
    await page.waitForTimeout(400);
    const saveBtn = page.locator('#save-settings-btn');
    // 使用 DOM 原生事件触发点击，绕过 Playwright 对长 Modal 在小视口下的 Actionability (可视性) 检查拦截
    await saveBtn.evaluate(node => node.click());

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

  test('全局配置与下拉框同步机制：页面刷新会自动从服务器拉取配置并同步给前端', async ({ page }) => {
    // 拦截 API 返回测试配置
    await page.route('**/api/settings', route => route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        PBI_WORKSPACES: [{ id: 'mock-ws-id-123', name: 'Mock Server Workspace' }],
        PBI_DATASETS: [],
        PBI_REPORTS: []
      })
    }));

    // 重新加载页面以触发 DOMContentLoaded 中的拉取逻辑
    await page.reload();
    // 留出时间给 await fetch 和渲染
    await page.waitForTimeout(500);
    
    // 1. 验证 localStorage 被正确写入
    const localWorkspaces = await page.evaluate(() => localStorage.getItem('pbi_workspaces'));
    expect(localWorkspaces).toContain('mock-ws-id-123');

    // 2. 验证主页右上角的下拉菜单被正确渲染
    const workspaceDropdown = page.locator('#active-workspace');
    await expect(workspaceDropdown).toContainText('Mock Server Workspace');
  });

  test('全局环境配置 (Global Settings)：Scan Workspace 能够严格过滤重复添加的 GUID', async ({ page }) => {
    // 预埋一条服务器已有数据
    await page.route('**/api/settings', route => route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        PBI_WORKSPACES: [{ id: 'duplicate-ws', name: 'Already Added WS' }]
      })
    }));
    await page.reload();
    await page.waitForTimeout(300);

    // 点击全局设置按钮
    await page.locator('#btn-settings').click();
    await expect(page.locator('#settings-modal')).toBeVisible();

    // 拦截 scan 接口，返回包含一个已存在的 GUID 和一个新的 GUID
    await page.route('**/api/scan/workspaces', route => route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        data: [
          { id: 'duplicate-ws', name: 'Already Added WS (Should be skipped)' },
          { id: 'new-fresh-ws', name: 'New Fresh WS' }
        ]
      })
    }));

    // 点击 Workspace 的 Scan 按钮 (找第一个包含 Scan 字样的按钮)
    const scanBtn = page.locator('button', { hasText: '🔍 Scan' }).first();
    await scanBtn.click();

    // 弹窗可见并点击全部添加 (Add Selected)
    const scanModal = page.locator('#scan-modal');
    await expect(scanModal).toBeVisible();
    await page.locator('#scan-modal-add-btn').click();
    
    // 验证去重逻辑：由于原来有 duplicate-ws，现在加入一个重复的和一个新的，最终 input 的数量必须是 2
    const workspaceInputs = page.locator('#workspace-list .id-input');
    await expect(workspaceInputs).toHaveCount(2);
    // 验证新加入的正确渲染
    const newWsInput = page.locator('#workspace-list .id-input').nth(1);
    await expect(newWsInput).toHaveValue('new-fresh-ws');
  });

  test('视觉回归测试 (Visual Regression): 主页 UI 必须与基准快照保持像素级一致', async ({ page }) => {
    // 隐藏可能动态变化的元素（如时间、请求耗时等，如果有的话）
    // 等待核心元素渲染完成
    await expect(page.locator('#api-tree')).toBeVisible();
    
    // Windows 11 (本地) 和 Windows Server (GitHub CI) 的系统字体渲染会有微小差异
    // 允许最多 5% 的像素差异阈值，且适当宽限至 500 像素以兼容亚像素抗锯齿微差
    await expect(page).toHaveScreenshot('homepage-baseline.png', { fullPage: true, maxDiffPixels: 500, maxDiffPixelRatio: 0.05 });
  });

  test('局部组件视觉回归测试 (Component Visual Regression): 侧边栏 API 树状图滚动条截断、文字溢出排版验证', async ({ page }) => {
    await expect(page.locator('#api-tree')).toBeVisible();
    const sidebar = page.locator('.sidebar');
    // 截取 sidebar 局部，防止长命名挤压样式或没有显示省略号
    await expect(sidebar).toHaveScreenshot('sidebar-baseline.png', { maxDiffPixelRatio: 0.05 });
  });

  test('局部组件视觉回归测试 (Component Visual Regression): Pipeline 弹窗内执行按钮的 Hover 闪光态', async ({ page }) => {
    // 1. 打开 Pipeline 弹窗
    const pipelineBtn = page.locator('#btn-smart-ops');
    await pipelineBtn.click();
    
    // 2. 等待动画结束 (FLIP 350ms)
    await page.waitForTimeout(400);

    const pipelineModal = page.locator('#pipeline-modal .modal-content');
    await expect(pipelineModal).toBeVisible();

    // 3. 将鼠标悬停在执行按钮上，触发 css hover 动画
    const runBtn = page.locator('#start-pipeline-btn');
    await runBtn.hover();

    // 4. 等待 0.3 秒，让闪光动画正好跑向中间态（用于捕获发光色块飞出边界的 Bug）
    await page.waitForTimeout(300);

    // 5. 对整个弹窗截图，如果 overflow: hidden 丢失，光效会溢出到背景上从而导致断言失败
    await expect(pipelineModal).toHaveScreenshot('pipeline-modal-hover-baseline.png', { maxDiffPixelRatio: 0.05 });
  });
});
