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

  test('Causality explanation modal & soft border glow verification', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await page.evaluate(() => {
      localStorage.setItem('pbi-active-module', 'permission_blueprint');
      localStorage.setItem('pb-active-main-tab', 'user_assets');
    });
    await page.reload({ waitUntil: 'domcontentloaded' });

    // 1. Verify toolbar buttons: copy audit removed, explain causality added
    await expect(page.locator('#pb-btn-copy-audit-summary')).toHaveCount(0);
    const explainBtn = page.locator('#pb-btn-explain-causality');
    await expect(explainBtn).toBeVisible();

    // 2. Click explain button with no card selected -> modal opens with guidance
    await explainBtn.click();
    const modal = page.locator('#pb-explain-causality-modal');
    await expect(modal).toBeVisible();
    await expect(modal.locator('.modal-content')).toBeVisible();
    await expect(modal).toContainText('尚未锁定选中任何权限小卡片');

    // Close modal
    const closeBtn = modal.locator('.modal-header .close-btn');
    await closeBtn.click();
    await page.waitForTimeout(250);
    await expect(modal).toBeHidden();

    // 3. Pin a card (tenant_export is always present)
    const exportRow = page.locator('.pb-asset-card-row[data-row-id="tenant_export"]');
    await expect(exportRow).toBeVisible();
    await exportRow.click();
    await expect(exportRow).toHaveClass(/pb-causality-pinned/);

    // 4. Open explanation modal for pinned card
    await explainBtn.click();
    await expect(modal).toBeVisible();
    await expect(modal).toContainText('当前解析主体');
    await expect(modal).toContainText('为什么会有链接？');
    await expect(modal).toContainText('架构是否合理？');

    // Verify relationship targets exist
    await expect(modal).toContainText('派生能力');

    // Close modal
    await closeBtn.click();
    await page.waitForTimeout(250);
    await expect(modal).toBeHidden();

    // 5. CRITICAL: Closing the modal MUST NOT unpin the card! Card remains pinned!
    await expect(exportRow).toHaveClass(/pb-causality-pinned/);

    // 6. Clicking outside/blank area MUST NOT unpin the card
    await page.mouse.move(10, 10);
    await page.mouse.click(10, 10);
    await page.waitForTimeout(100);
    await expect(exportRow).toHaveClass(/pb-causality-pinned/);

    // 7. Only clicking the same card again unpins it
    await exportRow.click();
    await expect(exportRow).not.toHaveClass(/pb-causality-pinned/);

    // 8. Verify model_read: when no report is rendered on canvas, report_view must NOT be listed as a phantom target
    const modelReadRow = page.locator('.pb-asset-card-row[data-row-id="model_read"]');
    if (await modelReadRow.count() > 0) {
      await modelReadRow.click();
      await expect(modelReadRow).toHaveClass(/pb-causality-pinned/);
      await explainBtn.click();
      await expect(modal).toBeVisible();

      // Check report_view raw ID is NOT in the cards list
      const modalText = await modal.locator('#pb-explain-modal-body').textContent();
      expect(modalText).not.toContain('report_view');
      await closeBtn.click();
      await page.waitForTimeout(200);
      await expect(modelReadRow).toHaveClass(/pb-causality-pinned/);
      // Unpin
      await modelReadRow.click();
      await expect(modelReadRow).not.toHaveClass(/pb-causality-pinned/);
    }
  });
});

