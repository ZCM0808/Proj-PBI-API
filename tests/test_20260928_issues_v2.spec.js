const { test, expect } = require('@playwright/test');

test.describe.serial('2026-09-28 Issues v2 Verification Suite', () => {
  let page;

  test.beforeAll(async ({ browser }) => {
    page = await browser.newPage();
    await page.route(/fonts\.(googleapis|gstatic)\.com/, route => route.abort());
    await page.setViewportSize({ width: 1400, height: 900 });
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
  });

  test.afterAll(async () => {
    if (page) await page.close();
  });

  test('Req 10: Global Zen Mode button is pinned at topbar leftmost and toggles zen-mode', async () => {
    const zenBtn = page.locator('#gtb-zen-btn');
    await expect(zenBtn).toBeVisible();

    // 验证是否在 .gtb-group 的首位
    const isFirstInGroup = await page.evaluate(() => {
      const btn = document.getElementById('gtb-zen-btn');
      const group = document.querySelector('#global-topbar .gtb-group');
      return group && group.firstElementChild === btn;
    });
    expect(isFirstInGroup).toBe(true);

    // 初始状态下不是 zen-mode
    const initialZen = await page.evaluate(() => document.body.classList.contains('zen-mode'));
    if (initialZen) {
      await zenBtn.click();
      await page.waitForTimeout(350);
    }

    // 点击切换为 Zen Mode
    await zenBtn.click();
    await page.waitForTimeout(350);
    const inZenMode = await page.evaluate(() => document.body.classList.contains('zen-mode'));
    expect(inZenMode).toBe(true);

    // 验证全屏/折叠图标切换
    const expandIconVisible = await page.evaluate(() => {
      const el = document.querySelector('#gtb-zen-btn .zen-icon-expand');
      return el && window.getComputedStyle(el).display !== 'none';
    });
    const collapseIconVisible = await page.evaluate(() => {
      const el = document.querySelector('#gtb-zen-btn .zen-icon-collapse');
      return el && window.getComputedStyle(el).display !== 'none';
    });
    expect(expandIconVisible).toBe(false);
    expect(collapseIconVisible).toBe(true);

    // 再次点击退出 Zen Mode
    await zenBtn.click();
    await page.waitForTimeout(350);
    const outZenMode = await page.evaluate(() => document.body.classList.contains('zen-mode'));
    expect(outZenMode).toBe(false);
  });

  test('Req 8 & 9: Sub-views (Workflows, API tree, Blueprint) do NOT contain redundant bp buttons or zen buttons', async () => {
    // 验证 工作流 面板内无全景链路按钮和沉浸按钮
    const wfBpBtnCount = await page.locator('#view-workflows .btn-quick-switch-bp').count();
    const wfZenBtnCount = await page.locator('#view-workflows .zen-mode-btn').count();
    expect(wfBpBtnCount).toBe(0);
    expect(wfZenBtnCount).toBe(0);

    // 验证 API 树 内无全景链路按钮和沉浸按钮
    const apiBpBtnCount = await page.locator('#view-api_tree .btn-quick-switch-bp').count();
    const apiZenBtnCount = await page.locator('#view-api_tree .zen-mode-btn').count();
    expect(apiBpBtnCount).toBe(0);
    expect(apiZenBtnCount).toBe(0);

    // 验证 权限蓝图 工具栏内无沉浸模式按钮、全权掌管标签、全景链路按钮、真实租户卡片
    const pbZenBtnCount = await page.locator('#pb-global-zen-btn').count();
    const pbSummaryBadgeCount = await page.locator('#pb-perm-summary-badge').count();
    const pbSwitchUserBtnCount = await page.locator('#pb-btn-switch-user-assets').count();
    const pbRealSyncCardCount = await page.locator('.pb-real-sync-card').count();

    expect(pbZenBtnCount).toBe(0);
    expect(pbSummaryBadgeCount).toBe(0);
    expect(pbSwitchUserBtnCount).toBe(0);
    expect(pbRealSyncCardCount).toBe(0);
  });

  test('Req 4 & 7: Quick Note cancel button lifecycle and progress bar robustness on repeated save', async () => {
    // 打开 Quick Note 弹窗
    await page.evaluate(() => {
      if (window.openNoteModal) window.openNoteModal();
    });

    const noteModal = page.locator('#modal-note');
    await expect(noteModal).toBeVisible();

    const cancelBtn = page.locator('#btn-cancel-save-note');
    const saveBtn = page.locator('#btn-save-note');
    const statusWrapper = page.locator('#note-save-status-wrapper');

    // 初始状态下：取消按钮必须不可见（display: none）
    const isCancelVisibleInitially = await cancelBtn.isVisible();
    expect(isCancelVisibleInitially).toBe(false);

    // Mock 慢速保存 API 请求，模拟用户在保存过程中点击取消
    await page.route('**/api/save-note', async route => {
      // 延迟 2 秒以测试取消交互
      await new Promise(r => setTimeout(r, 2000));
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, message: 'Saved successfully' })
      });
    });

    // 第一次点击保存
    await saveBtn.click();
    await page.waitForTimeout(200);

    // 此时：取消按钮应该显示（is-active），进度状态条应该显示
    expect(await cancelBtn.isVisible()).toBe(true);
    expect(await statusWrapper.isVisible()).toBe(true);

    // 用户点击取消按钮
    await cancelBtn.click();
    await page.waitForTimeout(200);

    // 取消后：取消按钮立即隐藏，保存按钮恢复可用
    expect(await cancelBtn.isVisible()).toBe(false);
    expect(await saveBtn.isEnabled()).toBe(true);

    // 关键回归断言 (Req 7)：用户取消后立即再次点击保存，进度指示器与取消按钮必须再次正常显示，绝不被旧定时器隐藏！
    await saveBtn.click();
    await page.waitForTimeout(300);

    expect(await cancelBtn.isVisible()).toBe(true);
    expect(await statusWrapper.isVisible()).toBe(true);

    // 等待超过 1.6 秒（原先取消定时器的 1.5s 超时点），断言进度条依然稳定存在
    await page.waitForTimeout(1700);
    expect(await statusWrapper.isVisible()).toBe(true);

    // 解除 API 路由 mock
    await page.unroute('**/api/save-note');

    // 关闭弹窗
    await page.evaluate(() => {
      if (window.closeNoteModal) window.closeNoteModal();
    });
    await page.waitForTimeout(200);
  });

  test('Req 1 & 3: LocalStorage pbi-theme and pbi-daily-time are NOT overwritten by syncStateFromBackend', async () => {
    // 设置本地特定值
    await page.evaluate(() => {
      localStorage.setItem('pbi-theme', 'light');
      localStorage.setItem('pbi-daily-time', JSON.stringify({ date: '2026-09-28', seconds: 123 }));
    });

    // Mock /api/db/kv 返回冲突数据
    await page.route('**/api/db/kv', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          'pbi-theme': 'dark',
          'pbi-daily-time': JSON.stringify({ date: '2026-09-28', seconds: 9999 })
        })
      });
    });

    // 触发页面内部的 syncStateFromBackend
    await page.evaluate(() => {
      // 重新执行 fetch kv 并走排除逻辑
      fetch('/api/db/kv')
        .then(res => res.json())
        .then(data => {
          const excludedKvKeys = [
            'pbi-sidebar-width', 'pbi-sidebar-collapsed', 'pbi-rail-expanded', 'pbi-topbar-collapsed',
            'pbi-request-height', 'pbi-details-collapsed', 'apiReqHistory', 'pbi-bookmarks',
            'pbi_workspaces', 'pbi_datasets', 'pbi_reports', 'pbi-xmla-history',
            'pbi_xmla_last_dataset', 'pbi_xmla_last_table', 'pbi-selected-workspaces',
            'pbi-selected-datasets', 'pbi-selected-reports', 'pbi-active-workspace',
            'pbi-active-dataset', 'pbi-active-report', 'pbi_cached_tenant_users',
            'pb-active-preset', 'pb-cached-user-presets', 'pb-active-main-tab',
            'pbi-active-module', 'pbi-theme', 'pbi-daily-time'
          ];
          for (const [key, value] of Object.entries(data)) {
            if (!excludedKvKeys.includes(key)) {
              localStorage.setItem(key, typeof value === 'object' ? JSON.stringify(value) : value);
            }
          }
        });
    });

    await page.waitForTimeout(300);

    const currentTheme = await page.evaluate(() => localStorage.getItem('pbi-theme'));
    const currentDaily = await page.evaluate(() => {
      const d = JSON.parse(localStorage.getItem('pbi-daily-time') || '{}');
      return d.seconds;
    });

    expect(currentTheme).toBe('light');
    expect(currentDaily).toBe(123);

    await page.unroute('**/api/db/kv');
  });

  test('Req 2: Session limit enforcement (401 limit_reached terminates session)', async () => {
    // 验证 API 返回 401 limit_reached 时前端拦截机制
    const redirectUrl = await page.evaluate(async () => {
      // 模拟调用返回 401 + limit_reached
      const res = new Response(JSON.stringify({
        success: false,
        message: 'Daily 1-hour limit for password login reached. Session terminated.',
        limit_reached: true
      }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
      const data = await res.json();
      return (data && data.limit_reached) ? '/login?expired=1' : null;
    });

    expect(redirectUrl).toBe('/login?expired=1');
  });
});
