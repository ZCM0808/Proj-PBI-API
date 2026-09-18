const { test, expect } = require('@playwright/test');

test.describe('Proj-PBI-API UI e2e tests', () => {

  test.beforeEach(async ({ page }) => {
    // 导航到主页
    await page.goto('/');
    // 清空缓存并注入稳定的 Mock 环境变量以保证测试环境（本地和CI）绝对一致
    await page.evaluate(() => {
        localStorage.clear();
        localStorage.setItem('pbi-active-module', 'api_tree');
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
    const pipelineBtn = page.locator('#btn-workflows');
    await pipelineBtn.click();
    
    // 2. 等待动画结束 (FLIP 350ms)
    await page.waitForTimeout(400);

    const pipelineModal = page.locator('#workflow-modal .modal-content');
    await expect(pipelineModal).toBeVisible();

    // 3. 将鼠标悬停在执行按钮上，触发 css hover 动画
    await page.locator('#wf-selector').selectOption('smart_pipeline');
    const runBtn = page.locator('#workflow-modal #start-pipeline-btn');
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
  test('UI Consistency - Button Standardization Check', async ({ page }) => {
    // 拦截页面错误
    const errors = [];
    page.on('pageerror', err => errors.push(err.message));
    
    // 打开主页
    await page.goto('http://127.0.0.1:8000');
    await page.waitForLoadState('networkidle');
    
    // 注入脚本分析按钮
    const uiErrors = await page.evaluate(() => {
      const errs = [];
      const buttons = document.querySelectorAll('button');
      buttons.forEach(btn => {
        const text = btn.textContent.trim().toLowerCase();
        const classes = Array.from(btn.classList);
        const inlineStyle = btn.getAttribute('style') || '';
        const id = btn.id || 'unknown-id';
        
        // Rule 1: No hardcoded padding/colors on primary/cancel classes
        if (classes.includes('btn-cancel') || classes.includes('btn-action-primary') || classes.includes('btn-submit')) {
           if (inlineStyle.includes('padding') || inlineStyle.includes('background') || inlineStyle.includes('font-size')) {
               errs.push(`Button '${id}' ('${text}') uses system classes but overrides standard styling via inline 'style' attribute: ${inlineStyle}`);
           }
        }
        
        // Rule 2: Semantic matching for Cancel/Close
        if (text.includes('关闭') || text.includes('取消') || text === 'close' || text === 'cancel' || text === '全选/取消') {
           if (!classes.includes('btn-cancel') && !classes.includes('close-modal')) {
               errs.push(`Button '${id}' ('${text}') should use 'btn-cancel' class for UI consistency.`);
           }
        }
        
        // Rule 3: Semantic matching for Save/Execute
        if (text.includes('保存配置') || text.includes('运行测试')) {
           if (!classes.includes('btn-action-primary') && !classes.includes('btn-submit')) {
               errs.push(`Button '${id}' ('${text}') should use 'btn-action-primary' or 'btn-submit' class for UI consistency.`);
           }
        }
      });
      return errs;
    });
    
    expect(uiErrors.length, 'Found UI Consistency Violations:\\n' + uiErrors.join('\\n')).toBe(0);
  });

  test('全局工作区下拉浮层已移除“完成”与“仅选”按钮，且 API 树充满工作区无多余空白', async ({ page }) => {
    // 1. 验证不存在 .gtb-ws-btn-ok 和 .gtb-ws-item-only-btn
    await expect(page.locator('.gtb-ws-btn-ok')).toHaveCount(0);
    await expect(page.locator('.gtb-ws-item-only-btn')).toHaveCount(0);

    // 2. 验证 API Tree 页面布局：#view-api_tree 是 #workspace-container 的直接子元素
    const isChild = await page.evaluate(() => {
        const wsContainer = document.getElementById('workspace-container');
        const apiView = document.getElementById('view-api_tree');
        return wsContainer && apiView && apiView.parentElement === wsContainer;
    });
    expect(isChild).toBe(true);

    // 3. 验证 GUM 范围切换时不自动发起 fetchGumWorkspaceUsers
    const scanTriggered = await page.evaluate(() => {
        let fetchCalled = false;
        const origFetch = window.fetchGumWorkspaceUsers;
        window.fetchGumWorkspaceUsers = () => { fetchCalled = true; };
        if (window.handleGumScopeChange) {
            window.handleGumScopeChange('workspaces');
        }
        window.fetchGumWorkspaceUsers = origFetch;
        return fetchCalled;
    });
    expect(scanTriggered).toBe(false);
  });


  test('工作流标题高度矮化且已选定向审计用户直接回显在搜索框中', async ({ page }) => {
    // 1. 验证工作流标题栏和按钮高度收敛
    const headerInfo = await page.evaluate(() => {
      const header = document.querySelector('.wf-detail-board > .modal-header');
      const runBtn = document.getElementById('wf-btn-runall');
      return {
        headerHeight: header ? header.getBoundingClientRect().height : 0,
        runBtnHeight: runBtn ? runBtn.getBoundingClientRect().height : 0
      };
    });
    expect(headerInfo.headerHeight).toBeLessThanOrEqual(42);
    expect(headerInfo.runBtnHeight).toBeLessThanOrEqual(30);

    // 2. 验证“定向审计目标用户”栏已移除
    await expect(page.locator('#wf-gum-target-tags-bar')).toHaveCount(0);

    // 3. 验证选中目标用户后，用户名回显在搜索框中且下拉列表其他用户不消失
    await page.evaluate(() => {
      window.gumCandidateUsers = [
        { identifier: 'user1@example.com', displayName: 'User One', role: 'Admin', principalType: 'User' },
        { identifier: 'user2@example.com', displayName: 'User Two', role: 'Member', principalType: 'User' },
        { identifier: 'user3@example.com', displayName: 'User Three', role: 'Viewer', principalType: 'User' }
      ];
      window.gumTargetUsers.clear();
      window.renderGumDropdownUsers('');
      window.toggleGumTargetUser('user1@example.com', 'User One');
    });
    
    // 验证搜索框值
    let searchVal = await page.locator('#wf-gum-search').inputValue();
    expect(searchVal).toBe('User One');

    // 验证下拉列表其他用户没有消失，总数依然为 3
    const candidatesCount = await page.locator('#wf-gum-dropdown-list .gum-dropdown-item').count();
    expect(candidatesCount).toBe(3);

    // 4. 验证下拉列表中无刷新按钮，且有全选与取消全选
    const hasRefreshBtn = await page.evaluate(() => {
      const dd = document.getElementById('wf-gum-user-dropdown');
      if (!dd) return false;
      return Array.from(dd.querySelectorAll('button')).some(b => b.textContent.includes('刷新'));
    });
    expect(hasRefreshBtn).toBe(false);

    // 5. 验证全选与取消全选
    await page.evaluate(() => {
      window.selectAllGumCandidates(true);
    });
    searchVal = await page.locator('#wf-gum-search').inputValue();
    expect(searchVal).toContain('User One');
    expect(searchVal).toContain('User Two');
    expect(searchVal).toContain('User Three');

    await page.evaluate(() => {
      window.selectAllGumCandidates(false);
    });
    searchVal = await page.locator('#wf-gum-search').inputValue();
    expect(searchVal).toBe('');
  });

  test('全局功能区数据模型下拉框支持工作区分组矩阵、全选、清空、多选以及 GUM 统计计数精准匹配', async ({ page }) => {
    // 1. 验证模型下拉触发器结构与初始显示，并先全选工作区以包含全部模型
    await page.evaluate(() => window.selectAllGtbWorkspaces(true));
    await expect(page.locator('#gtb-dataset-box')).toBeVisible();
    await expect(page.locator('#gtb-ds-trigger')).toBeVisible();

    // 展开模型多选与矩阵浮层
    await page.click('#gtb-ds-trigger');
    await expect(page.locator('#gtb-ds-dropdown')).toBeVisible();

    // 2. 验证工作区分组矩阵是否包含每个工作区下的所有模型
    const wsGroups = page.locator('#gtb-ds-list .gtb-ds-ws-group');
    const groupCount = await wsGroups.count();
    expect(groupCount).toBeGreaterThanOrEqual(1);

    const firstGroup = wsGroups.first();
    await expect(firstGroup.locator('.gtb-ds-ws-header')).toBeVisible();
    await expect(firstGroup.locator('.gtb-ds-ws-select-btn')).toHaveCount(0); // 验证已删除全选本区冗余按钮
    const itemsCount = await firstGroup.locator('.gtb-ds-item').count();
    expect(itemsCount).toBeGreaterThanOrEqual(1);

    // 3. 测试通过 UI 按钮【全选】全部模型
    await page.click('#gtb-ds-dropdown .gtb-ws-btn-sm:has-text("全选")');
    let displayText = await page.locator('#gtb-ds-display-text').textContent();
    expect(displayText).toContain('全部模型');
    const badgeText = await page.locator('#gtb-ds-count-badge').textContent();
    expect(badgeText).toBe('全选');

    // 4. 测试通过 UI 按钮【清空】模型
    await page.click('#gtb-ds-dropdown .gtb-ws-btn-sm:has-text("清空")');
    displayText = await page.locator('#gtb-ds-display-text').textContent();
    expect(displayText).toContain('-- 选择模型 (0) --');

    // 5. 测试单选/多选勾选模型
    await firstGroup.locator('.gtb-ds-item').first().click();
    let selectedDs = await page.evaluate(() => window.getSelectedDatasets());
    expect(selectedDs.length).toBe(1);

    // 再次点击取消勾选
    await firstGroup.locator('.gtb-ds-item').first().click();
    selectedDs = await page.evaluate(() => window.getSelectedDatasets());
    expect(selectedDs.length).toBe(0);

    // 测试工作区分组折叠与展开功能
    await firstGroup.locator('.gtb-ds-ws-header').click();
    await expect(firstGroup).toHaveClass(/collapsed/);
    await expect(firstGroup.locator('.gtb-ds-items-group')).toBeHidden();
    await firstGroup.locator('.gtb-ds-ws-header').click();
    await expect(firstGroup).not.toHaveClass(/collapsed/);
    await expect(firstGroup.locator('.gtb-ds-items-group')).toBeVisible();

    // 验证模型下拉列表可顺畅滚动与查看所有模型
    await page.evaluate(() => {
      const mockWs = [{ id: 'ws-scroll-test', name: 'Scroll Test Workspace' }];
      const mockDs = [];
      for (let i = 1; i <= 30; i++) {
        mockDs.push({ id: `ds-scroll-${i}`, name: `Dataset Model Long Name ${i}`, workspaceId: 'ws-scroll-test' });
      }
      localStorage.setItem('pbi_workspaces', JSON.stringify(mockWs));
      localStorage.setItem('pbi_datasets', JSON.stringify(mockDs));
      window.selectedGtbWorkspaceIds.clear();
      window.selectedGtbWorkspaceIds.add('ws-scroll-test');
      window.updateGlobalTopbarDropdowns();
    });

    const scrollMetrics = await page.evaluate(() => {
      const list = document.getElementById('gtb-ds-list');
      const canScroll = list.scrollHeight > list.clientHeight;
      list.scrollTop = 150;
      return { canScroll, scrollTop: list.scrollTop, scrollHeight: list.scrollHeight, clientHeight: list.clientHeight };
    });
    expect(scrollMetrics.canScroll).toBe(true);
    expect(scrollMetrics.scrollTop).toBeGreaterThan(0);

    // 验证模型下拉列表与已选工作区联动 (Workspace Linkage Filter)
    await page.evaluate(() => {
      const mockWs = [
        { id: 'ws-link-1', name: 'Link Workspace 1' },
        { id: 'ws-link-2', name: 'Link Workspace 2' }
      ];
      const mockDs = [
        { id: 'ds-w1-a', name: 'Dataset 1A', workspaceId: 'ws-link-1' },
        { id: 'ds-w1-b', name: 'Dataset 1B', workspaceId: 'ws-link-1' },
        { id: 'ds-w2-a', name: 'Dataset 2A', workspaceId: 'ws-link-2' }
      ];
      localStorage.setItem('pbi_workspaces', JSON.stringify(mockWs));
      localStorage.setItem('pbi_datasets', JSON.stringify(mockDs));
      // 仅勾选工作区 1
      window.selectedGtbWorkspaceIds.clear();
      window.selectedGtbWorkspaceIds.add('ws-link-1');
      window.updateGlobalTopbarDropdowns();
    });

    // 仅展示 ws-link-1 的分组，ws-link-2 不展示
    await expect(page.locator('#gtb-ds-list .gtb-ds-ws-group[data-ws-id="ws-link-1"]')).toBeVisible();
    await expect(page.locator('#gtb-ds-list .gtb-ds-ws-group[data-ws-id="ws-link-2"]')).toHaveCount(0);
    // 统计显示联动 1 个工作区
    let dsStatText = await page.locator('#gtb-ds-stat-text').textContent();
    expect(dsStatText).toContain('联动 1 个工作区');

    // 关闭模型下拉框
    await page.evaluate(() => window.closeGtbDsDropdown());
    await expect(page.locator('#gtb-ds-dropdown')).toBeHidden();

    // 6. 验证 GUM 审计统计：无任何筛选时分子与分母完全一致 (如 8/8 或 7/7，绝不出现 7/8)
    await page.evaluate(() => {
      window.gumAuditScope = 'tenant';
      window.gumData = [
        { workspaceId: 'ws-1', identifier: 'u1@test.com', displayName: 'User 1', role: 'Viewer', effectiveRole: 'Viewer' },
        { workspaceId: 'ws-1', identifier: 'u2@test.com', displayName: 'User 2', role: 'Viewer', effectiveRole: 'Viewer' },
        { workspaceId: 'ws-1', identifier: 'u3@test.com', displayName: 'User 3', role: 'Viewer', effectiveRole: 'Viewer' },
        { workspaceId: 'ws-1', identifier: 'u4@test.com', displayName: 'User 4', role: 'Viewer', effectiveRole: 'Viewer' },
        { workspaceId: 'ws-1', identifier: 'u5@test.com', displayName: 'User 5', role: 'Viewer', effectiveRole: 'Viewer' },
        { workspaceId: 'ws-1', identifier: 'u6@test.com', displayName: 'User 6', role: 'Viewer', effectiveRole: 'Viewer' },
        { workspaceId: 'ws-1', identifier: 'u7@test.com', displayName: 'User 7', role: 'Viewer', effectiveRole: 'Viewer' },
        { workspaceId: 'ws-2', identifier: 'spn-app-8', displayName: 'Service Principal App', role: 'Admin', effectiveRole: 'Admin' }
      ];
      window.gumTargetUsers.clear();
      window._gumSearchFilterTerm = '';
      window._gumPillFilter = 'all';
      window.filterGumTable();
    });

    let gumStats = await page.locator('#wf-gum-stats').textContent();
    expect(gumStats).toBe('筛选结果: 8 / 8 条记录');

    // 切换为工作区级别范围 (已选 ws-1，7条记录)，无用户筛选时精准显示 7 / 7
    await page.evaluate(() => {
      window.gumAuditScope = 'workspaces';
      window.selectedGtbWorkspaceIds.clear();
      window.selectedGtbWorkspaceIds.add('ws-1');
      window.filterGumTable();
    });
    gumStats = await page.locator('#wf-gum-stats').textContent();
    expect(gumStats).toBe('筛选结果: 7 / 7 条记录');

    // 7. 验证复制按钮同时复制 Name 和对应的 ID
    const copiedWsText = await page.evaluate(async () => {
      let written = '';
      const origWrite = navigator.clipboard.writeText;
      navigator.clipboard.writeText = async (txt) => { written = txt; return Promise.resolve(); };
      window.copyGtbItem(null, 'workspace');
      navigator.clipboard.writeText = origWrite;
      return written;
    });
    expect(copiedWsText).toContain('ws-1');
  });
});
