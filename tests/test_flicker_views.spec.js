const { test, expect } = require('@playwright/test');

test.describe('Zero-Flicker Multi-View Reload Verification', () => {

  test.beforeEach(async ({ page }) => {
    // Abort external fonts/CDNs that can time out in test environments
    await page.route('**/*.{png,jpg,jpeg,woff,woff2,ttf}', route => route.abort());
    await page.route(/fonts\.googleapis\.com/, route => route.abort());
    await page.route(/alcdn\.msauth\.net/, route => route.abort());
  });

  test('Module 1: API Explorer reloads with zero flicker', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await page.evaluate(() => {
      localStorage.setItem('pbi-active-module', 'api_tree');
    });
    await page.reload({ waitUntil: 'domcontentloaded' });

    const apiTreeDisp = await page.locator('#view-api_tree').evaluate(el => window.getComputedStyle(el).display);
    const wfDisp = await page.locator('#view-workflows').evaluate(el => window.getComputedStyle(el).display);
    expect(apiTreeDisp).toBe('flex');
    expect(wfDisp).toBe('none');
  });

  test('Module 2: Permission Blueprint user_assets tab reloads with zero flicker', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await page.evaluate(() => {
      localStorage.setItem('pbi-active-module', 'permission_blueprint');
      localStorage.setItem('pb-active-main-tab', 'user_assets');
    });
    await page.reload({ waitUntil: 'domcontentloaded' });

    const bpDisp = await page.locator('#view-permission_blueprint').evaluate(el => window.getComputedStyle(el).display);
    const uaDisp = await page.locator('#pb-user-assets-container').evaluate(el => window.getComputedStyle(el).display);
    const cvDisp = await page.locator('#pb-canvas-viewport').evaluate(el => window.getComputedStyle(el).display);
    expect(bpDisp).toBe('flex');
    expect(uaDisp).toBe('flex');
    expect(cvDisp).toBe('none');
  });

  test('Module 3: Workflows datasource_inspector reloads with zero flicker', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await page.evaluate(() => {
      localStorage.setItem('pbi-active-module', 'workflows');
      localStorage.setItem('pbi-last-workflow', 'datasource_inspector');
    });
    await page.reload({ waitUntil: 'domcontentloaded' });

    const wfDisp = await page.locator('#view-workflows').evaluate(el => window.getComputedStyle(el).display);
    const dsDisp = await page.locator('#wf-config-datasource_inspector').evaluate(el => window.getComputedStyle(el).display);
    const expDisp = await page.locator('#wf-config-export_report').evaluate(el => window.getComputedStyle(el).display);
    expect(wfDisp).toBe('flex');
    expect(dsDisp).toBe('block');
    expect(expDisp).toBe('none');
  });
});
