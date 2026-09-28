const { test, expect } = require('@playwright/test');

test.describe('GUM Auth Cleanup and Pure UI Verification', () => {
  test('verify GUM auth banner and device code / paste buttons are completely removed', async ({ page }) => {
    await page.goto('http://127.0.0.1:8081/');
    await page.waitForLoadState('domcontentloaded');

    // 验证旧的设备流卡片容器彻底不存在
    const authBanner = await page.$('#wf-gum-auth-banner');
    expect(authBanner).toBeNull();

    // 验证页面全局不存在“一键启动设备流登录”或“粘贴 Token”按钮
    const deviceBtn = await page.getByRole('button', { name: /设备流/i });
    expect(await deviceBtn.count()).toBe(0);

    const pasteBtn = await page.getByRole('button', { name: /粘贴.*Token/i });
    expect(await pasteBtn.count()).toBe(0);
  });
});
