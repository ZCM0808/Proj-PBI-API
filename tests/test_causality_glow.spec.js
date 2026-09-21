const { test, expect } = require('@playwright/test');

test.describe('Causality Glow Hover Intent & Gap Buffer Verification', () => {

  test.beforeEach(async ({ page }) => {
    await page.route('**/*.{png,jpg,jpeg,woff,woff2,ttf}', route => route.abort());
    await page.route(/fonts\.googleapis\.com/, route => route.abort());
    await page.route(/alcdn\.msauth\.net/, route => route.abort());
  });

  test('Smooth causality transition: no full-screen flash on mouse sliding', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await page.evaluate(() => {
      localStorage.setItem('pbi-active-module', 'permission_blueprint');
      localStorage.setItem('pb-active-main-tab', 'user_assets');
    });
    await page.reload({ waitUntil: 'domcontentloaded' });

    // Wait for user assets container
    const container = page.locator('#pb-user-assets-container');
    await expect(container).toBeVisible();

    const rows = page.locator('.pb-asset-card-row');
    const count = await rows.count();
    expect(count).toBeGreaterThan(5);

    const firstRow = rows.first();
    const secondRow = rows.nth(1);

    // 1. Fast sweep (< 50ms): should NOT trigger full dimming immediately (Hover Intent)
    await firstRow.hover();
    let dimmedCount = await page.locator('.pb-causality-dimmed').count();
    expect(dimmedCount).toBe(0);

    // 2. Wait 150ms: hover intent confirms focus, causality visuals applied
    await page.waitForTimeout(150);
    dimmedCount = await page.locator('.pb-causality-dimmed').count();
    const rowInfo = await firstRow.evaluate(el => el.getAttribute('data-row-id'));
    console.log('Hovered row:', rowInfo, 'dimmedCount:', dimmedCount);
    expect(dimmedCount).toBeGreaterThanOrEqual(1);

    // 3. Move mouse to second card:
    // With 60ms gap buffer and state diffing, unrelated rows keep pb-causality-dimmed without popping back to normal
    await secondRow.hover();
    await page.waitForTimeout(50);
    const dimmedDuringTransition = await page.locator('.pb-causality-dimmed').count();
    expect(dimmedDuringTransition).toBeGreaterThanOrEqual(1);

    // 4. Move mouse outside to blank area: after grace period (60ms), all rows restore
    await page.mouse.move(10, 10);
    await page.waitForTimeout(120);
    const dimmedAfterLeave = await page.locator('.pb-causality-dimmed').count();
    expect(dimmedAfterLeave).toBe(0);
  });
});
