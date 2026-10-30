const { chromium } = require('playwright');
(async () => {
    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
    await page.goto('http://127.0.0.1:8000/', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1000);

    // Apply the unified scroll css
    await page.evaluate(() => {
        const style = document.createElement('style');
        style.id = 'fix-scroll-unity';
        style.textContent = `
            .app-main-layout {
                overflow-x: visible !important;
                width: max-content !important;
                min-width: 100% !important;
            }
            #workspace-container {
                overflow-x: visible !important;
            }
        `;
        document.head.appendChild(style);
    });

    // 1. Test clicking Auth Box
    console.log('Testing Auth dropdown open...');
    await page.click('#gtb-auth-box');
    await page.waitForTimeout(300);
    const authDropdown = page.locator('#gtb-auth-dropdown');
    const isAuthVisible = await authDropdown.isVisible();
    console.log('Auth dropdown visible:', isAuthVisible);

    // 2. Test clicking Tenant Box
    console.log('Testing Tenant dropdown open...');
    await page.click('#gtb-tenant-box');
    await page.waitForTimeout(300);
    const tenantDropdown = page.locator('#gtb-tenant-dropdown');
    const isTenantVisible = await tenantDropdown.isVisible();
    console.log('Tenant dropdown visible:', isTenantVisible);

    // 3. Test clicking Workspace Box
    console.log('Testing Workspace dropdown open...');
    await page.click('#gtb-workspace-box');
    await page.waitForTimeout(300);
    const wsDropdown = page.locator('#gtb-ws-dropdown');
    const isWsVisible = await wsDropdown.isVisible();
    console.log('Workspace dropdown visible:', isWsVisible);

    // 4. Test clicking Dataset Box
    console.log('Testing Dataset dropdown open...');
    await page.click('#gtb-dataset-box');
    await page.waitForTimeout(300);
    const dsDropdown = page.locator('#gtb-ds-dropdown');
    const isDsVisible = await dsDropdown.isVisible();
    console.log('Dataset dropdown visible:', isDsVisible);

    // 5. Test Quick Note modal open
    console.log('Testing Quick Note button click...');
    await page.click('#btn-note');
    await page.waitForTimeout(300);
    const noteModal = page.locator('#modal-note');
    const isNoteVisible = await noteModal.isVisible();
    console.log('Note modal visible:', isNoteVisible);

    // 6. Test scrolling and then clicking an item
    console.log('Testing scroll and then click item...');
    await page.evaluate(() => {
        document.querySelector('.app-container').scrollLeft = 300;
    });
    await page.waitForTimeout(200);
    // Click Workspace Box again
    await page.click('#gtb-workspace-box');
    await page.waitForTimeout(300);
    const wsBoxAfterScroll = await wsDropdown.boundingBox();
    console.log('Workspace dropdown bounding box after scroll:', wsBoxAfterScroll);

    const allPassed = isAuthVisible && isTenantVisible && isWsVisible && isDsVisible && isNoteVisible && wsBoxAfterScroll !== null;
    console.log('ALL CLICK TESTS PASSED:', allPassed);

    await browser.close();
    process.exit(allPassed ? 0 : 1);
})();
