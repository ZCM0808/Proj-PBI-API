const { test, expect } = require('@playwright/test');

test.describe('Note 10-23 Laya Intent & UI Fixes Verification', () => {

    test.beforeEach(async ({ page }) => {
        await page.goto('/', { waitUntil: 'domcontentloaded' });
        await page.waitForFunction(() => typeof window.switchAppModule === 'function' && typeof window.handleLayaIntentSearch === 'function', { timeout: 15000 });
        await page.evaluate(() => {
            window.switchAppModule('api_tree');
        });
        await page.waitForTimeout(300);
    });

    test('Issue 1: API Resource Tree Header does NOT contain redundant LAYA POWERED badge', async ({ page }) => {
        const navTitle = page.locator('.nav-title', { hasText: 'API 资源树' });
        await expect(navTitle).toBeVisible();
        await expect(navTitle).toContainText('API 资源树');
        
        // Assert LAYA POWERED badge is completely absent
        const layaPowered = navTitle.locator('text=LAYA POWERED');
        await expect(layaPowered).toHaveCount(0);

        const allText = await navTitle.innerText();
        expect(allText).not.toContain('LAYA POWERED');
    });

    test('Issue 2: Banner text fixes duplicate Laya, replaces Locate with Info popover', async ({ page }) => {
        const searchInput = page.locator('#api-search-input');
        const layaBtn = page.locator('#btn-laya-intent-search');
        const hintBanner = page.locator('#laya-search-intent-hint');

        await expect(searchInput).toBeVisible();
        await expect(layaBtn).toBeVisible();

        // 1. Enter query and trigger Laya Intent Search
        await searchInput.fill('查看模型刷新历史与参数');
        await layaBtn.click();

        // 2. Banner should appear with .visible
        await expect(hintBanner).toBeVisible({ timeout: 8000 });
        await expect(hintBanner).toHaveClass(/visible/);

        // 3. Verify text: must be "意图直达:" without duplicate "Laya 意图直达:"
        const bannerText = await hintBanner.innerText();
        expect(bannerText).toContain('LAYA');
        expect(bannerText).toContain('意图直达:');
        expect(bannerText).not.toContain('Laya 意图直达');

        // 4. Old locate button should no longer exist
        const oldLocateBtn = page.locator('#laya-intent-locate-btn');
        await expect(oldLocateBtn).toHaveCount(0);

        // 5. Info button exists and has accessible title
        const infoBtn = page.locator('#laya-intent-info-btn');
        await expect(infoBtn).toBeVisible();
        await expect(infoBtn).toHaveAttribute('title', '查看所有候选置信度与推导依据');

        // 6. Hover wrapper to display popover
        const infoWrapper = page.locator('#laya-intent-info-wrapper');
        const popover = page.locator('#laya-intent-popover');
        await infoWrapper.hover();
        await expect(popover).toBeVisible();

        // 7. Verify Popover content: reasoning and all 9 probability rows
        const reasonEl = page.locator('#laya-popover-reason');
        await expect(reasonEl).toBeVisible();
        const reasonText = await reasonEl.innerText();
        expect(reasonText).toContain('判定依据:');
        expect(reasonText).toMatch(/(模型|刷新|语义)/);

        const probRows = page.locator('#laya-popover-probs-list .laya-prob-row');
        await expect(probRows).toHaveCount(9);

        // Top match row must have .top-match class and high confidence
        const topRow = page.locator('#laya-popover-probs-list .laya-prob-row.top-match');
        await expect(topRow).toHaveCount(1);
        await expect(topRow).toContainText('Datasets');

        // Check if criteria descriptions exist
        const descCount = await page.locator('#laya-popover-probs-list .laya-prob-desc').count();
        expect(descCount).toBe(9);
    });

    test('Issue 2 Bonus: Clicking banner text area still navigates and locates in API Tree', async ({ page }) => {
        const searchInput = page.locator('#api-search-input');
        const layaBtn = page.locator('#btn-laya-intent-search');
        const clickableArea = page.locator('#laya-intent-clickable-area');

        await searchInput.fill('本地网关集群与数据源');
        await layaBtn.click();

        await expect(clickableArea).toBeVisible({ timeout: 8000 });
        // Clicking clickable area should not throw and trigger tree focus
        await clickableArea.click();
        await page.waitForTimeout(300);

        // Expect Gateways to be expanded or present in DOM
        const gatewayTitle = page.locator('.api-category-title', { hasText: 'Gateways' });
        await expect(gatewayTitle).toBeVisible();
    });

});
