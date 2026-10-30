// @ts-check
const { test, expect } = require('@playwright/test');

test.describe('Mobile Topbar Anti-Squish & Gestures Test', () => {
    test.use({ viewport: { width: 390, height: 844 } }); // iPhone 14 / standard mobile screen

    test('Topbar items must not overlap and topbar should be scrollable horizontally', async ({ page }) => {
        await page.goto('/', { waitUntil: 'domcontentloaded' });
        await page.waitForTimeout(1000);

        const topbar = page.locator('#global-topbar');
        await expect(topbar).toBeVisible();

        // Check scrollability
        const isScrollable = await topbar.evaluate(el => el.scrollWidth > el.clientWidth);
        expect(isScrollable).toBe(true);

        // Check non-overlapping items
        const items = topbar.locator('.gtb-item');
        const count = await items.count();
        expect(count).toBeGreaterThanOrEqual(5);

        const boxes = [];
        for (let i = 0; i < count; i++) {
            const box = await items.nth(i).boundingBox();
            if (box && box.width > 0) {
                boxes.push(box);
            }
        }

        // Assert strictly that adjacent items do not overlap in X axis
        for (let i = 0; i < boxes.length - 1; i++) {
            const current = boxes[i];
            const next = boxes[i + 1];
            expect(next.x).toBeGreaterThanOrEqual(current.x + current.width - 2); // allow max 2px subpixel rounding
        }

        // Test smooth horizontal scroll
        await topbar.evaluate(el => { el.scrollLeft = 200; });
        const scrollLeft = await topbar.evaluate(el => el.scrollLeft);
        expect(scrollLeft).toBeGreaterThan(0);
    });
});
