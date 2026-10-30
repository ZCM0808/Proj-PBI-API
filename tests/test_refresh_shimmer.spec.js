const { test, expect } = require('@playwright/test');

test.describe('Global Topbar Refresh Micro-Shimmer Visual Feedback Tests', () => {

    test.beforeEach(async ({ page }) => {
        await page.goto('/');
        await page.waitForLoadState('domcontentloaded');
        await page.waitForTimeout(500);
    });

    test('Refresh Button triggers micro-shimmer on all 5 target objects (Auth, Tenant, Workspace, Dataset, Report)', async ({ page }) => {
        // Intercept /api/scan/workspaces with a deliberate small delay to reliably observe shimmer state
        let scanRequested = false;
        await page.route('**/api/scan/workspaces', async route => {
            scanRequested = true;
            await new Promise(r => setTimeout(r, 400));
            await route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify({
                    success: true,
                    data: [
                        { id: 'ws-test-01', name: 'Test Workspace A', type: 'Workspace', state: 'Active' }
                    ]
                })
            });
        });

        const refreshBtn = page.locator('#gtb-btn-refresh');
        await expect(refreshBtn).toBeVisible();

        const authBox = page.locator('#gtb-auth-box');
        const tenantBox = page.locator('#gtb-tenant-box');
        const wsBox = page.locator('#gtb-workspace-box');
        const dsBox = page.locator('#gtb-dataset-box');
        const rpBox = page.locator('#gtb-report-box');

        // 1. Initial State: No shimmer
        await expect(authBox).not.toHaveClass(/gtb-refresh-shimmer/);
        await expect(tenantBox).not.toHaveClass(/gtb-refresh-shimmer/);
        await expect(wsBox).not.toHaveClass(/gtb-refresh-shimmer/);
        await expect(dsBox).not.toHaveClass(/gtb-refresh-shimmer/);
        await expect(rpBox).not.toHaveClass(/gtb-refresh-shimmer/);

        // 2. Click Refresh Button
        await refreshBtn.click();

        // 3. During Refresh: All 5 objects must have gtb-refresh-shimmer class
        await expect(authBox).toHaveClass(/gtb-refresh-shimmer/);
        await expect(tenantBox).toHaveClass(/gtb-refresh-shimmer/);
        await expect(wsBox).toHaveClass(/gtb-refresh-shimmer/);
        await expect(dsBox).toHaveClass(/gtb-refresh-shimmer/);
        await expect(rpBox).toHaveClass(/gtb-refresh-shimmer/);

        // Verify animation name is gtbRefreshPulse
        const animName = await authBox.evaluate(el => window.getComputedStyle(el).animationName);
        expect(animName).toContain('gtbRefreshPulse');

        // 4. Wait for Refresh to complete (refreshBtn not disabled)
        await expect(refreshBtn).not.toBeDisabled({ timeout: 10000 });

        // 5. After Refresh: Shimmer class removed from all 5 objects
        await expect.poll(async () => {
            const hasShimmer = await authBox.evaluate(el => el.classList.contains('gtb-refresh-shimmer'));
            return hasShimmer;
        }, { timeout: 3000 }).toBe(false);

        await expect(authBox).not.toHaveClass(/gtb-refresh-shimmer/);
        await expect(tenantBox).not.toHaveClass(/gtb-refresh-shimmer/);
        await expect(wsBox).not.toHaveClass(/gtb-refresh-shimmer/);
        await expect(dsBox).not.toHaveClass(/gtb-refresh-shimmer/);
        await expect(rpBox).not.toHaveClass(/gtb-refresh-shimmer/);
    });

});
