const { chromium } = require('playwright');
const path = require('path');

(async () => {
    const browser = await chromium.launch();
    const page = await browser.newPage();
    await page.setViewportSize({ width: 1200, height: 800 });
    await page.goto(`file://${path.resolve('static/index.html')}`);
    
    // Open workflow modal
    await page.click('#btn-workflows');
    await page.waitForTimeout(500);
    const wfBox = await page.locator('#workflow-modal-content').boundingBox();
    console.log('Workflow Modal:', wfBox);
    await page.click('#close-workflow-btn');
    await page.waitForTimeout(500);

    // Open settings modal
    await page.click('#btn-settings');
    await page.waitForTimeout(500);
    const setBox = await page.locator('#settings-modal .modal-content').boundingBox();
    console.log('Settings Modal:', setBox);

    await browser.close();
})();
