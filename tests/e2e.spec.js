const { test, expect } = require('@playwright/test');

test.describe('Proj-PBI-API UI e2e tests', () => {

  test.beforeEach(async ({ page }) => {
    // 导航到主页
    await page.goto('/');
    // 清空缓存并注入稳定的 Mock 环境变量以保证测试环境（本地和CI）绝对一致
    await page.evaluate(() => {
        localStorage.clear();
        localStorage.setItem('pbi_tenant_id', 'mock-tenant-1234');
        localStorage.setItem('pbi_app_name', 'Mock App');
    });
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
    const firstList = page.locator('.api-list:has(.api-item)').first();
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

    // 测试清空所有（使用自定义 Confirm 弹窗）
    const clearBtn = page.locator('#history-clear-all');
    await clearBtn.click();
    
    // 等待自定义弹窗显示并点击确认
    await page.waitForSelector('#custom-dialog-modal', { state: 'visible' });
    await page.click('#custom-confirm-ok-btn');
    
    // 弹窗会因为清空而自动关闭
    await expect(dropdown).toBeHidden();
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

  test('结构防御 (DOM Hierarchy): context-toolbar 必须严格被 request-builder-top 包裹，防止掉落外层导致间距异常', async ({ page }) => {
    // 这里使用 CSS 严格的直接子代选择器 `>` 
    // 如果之前那种 </div> 提前闭合的 Bug 再现，这里就会找不到元素并报错
    const toolbarInTop = page.locator('.request-builder-top > #context-toolbar');
    await expect(toolbarInTop).toBeVisible();
    
    const envInTop = page.locator('.request-builder-top > #env-identity');
    await expect(envInTop).toBeVisible();
  });

  test('结构防御 (DOM Hierarchy): Response 面板必须严格被 main-content 包裹，防止意外的闭合标签导致布局崩塌', async ({ page }) => {
    const mainContent = page.locator('.main-content');
    const responseContainer = page.locator('.response-container');
    
    // 物理坐标断言防御
    const mainContentBox = await mainContent.boundingBox();
    const responseBox = await responseContainer.boundingBox();
    
    expect(mainContentBox).not.toBeNull();
    expect(responseBox).not.toBeNull();
    
    // Response 的左边界必须大于等于 Main Content 的左边界，绝不允许溢出到左侧菜单区域
    expect(responseBox.x).toBeGreaterThanOrEqual(mainContentBox.x);
    // 同时也利用严格的直接子代选择器验证 DOM 树归属关系
    await expect(page.locator('.main-content > .response-container')).toBeVisible();
  });

  test('溢出防御 (Overflow Defense): 动作按钮组绝对不能跑到右侧面板之外', async ({ page }) => {
    const mainContent = page.locator('.main-content');
    const resetBtn = page.locator('#reset-request-btn');
    
    const mainBox = await mainContent.boundingBox();
    const btnBox = await resetBtn.boundingBox();
    
    // 断言按钮存在
    expect(btnBox).not.toBeNull();
    expect(mainBox).not.toBeNull();
    
    // 按钮的右边界必须小于等于父容器的右边界 (加上微小的容差值防次像素取整)
    expect(btnBox.x + btnBox.width).toBeLessThanOrEqual(mainBox.x + mainBox.width + 1);
  });

  test('弹性布局抗挤压测试 (Flex bounds): 请求体 textarea 不能被上方的错误空白完全挤压', async ({ page }) => {
    const requestBody = page.locator('#request-body');
    await expect(requestBody).toBeVisible();
    
    const box = await requestBody.boundingBox();
    expect(box).not.toBeNull();
    
    // 正常情况下 flex:1 应该保证它至少有一点高度来显示一行，而不是 0
    expect(box.height).toBeGreaterThan(30);
  });

  test('垂直调整器防御 (Vertical Resizer): 向上极限拖拽时，请求面板不能被压到不可用状态', async ({ page }) => {
    const resizer = page.locator('#vertical-resizer');
    const requestBuilder = page.locator('.request-builder');
    
    const resizerBox = await resizer.boundingBox();
    expect(resizerBox).not.toBeNull();
    
    // 鼠标拖拽动作模拟：点住中间，疯狂往上拖拽 1000 像素
    await page.mouse.move(resizerBox.x + resizerBox.width / 2, resizerBox.y + resizerBox.height / 2);
    await page.mouse.down();
    await page.mouse.move(resizerBox.x + resizerBox.width / 2, resizerBox.y - 1000, { steps: 10 });
    await page.mouse.up();
    
    // 断言高度是否被限制在了可用的最小值 (如 150px 左右)
    const builderBox = await requestBuilder.boundingBox();
    expect(builderBox.height).toBeGreaterThanOrEqual(140); // 给一点点容错
    
    // 断言即便被压扁，URL 输入框仍然在视口内可见
    await expect(page.locator('#api-endpoint')).toBeInViewport();
  });

  test('局部组件视觉回归测试 (Component Visual Regression): Request 面板防间距空洞及布局偏移检查', async ({ page }) => {
    // 截取 request-builder 局部
    const requestBuilder = page.locator('.request-builder');
    await expect(requestBuilder).toBeVisible();
    
    // 如果再出现莫名其妙的 24px Gap 导致排版撑大，这个快照将精准拦截
    await expect(requestBuilder).toHaveScreenshot('request-panel-baseline.png', { maxDiffPixelRatio: 0.05 });
  });
});
