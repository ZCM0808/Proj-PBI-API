const fs = require('fs');
const { chromium } = require('@playwright/test');
(async () => {
    const browser = await chromium.launch();
    const page = await browser.newPage();
    let loaded = false;
    page.on('console', msg => { if(msg.text().includes('DOMContentLoaded fired!')) loaded = true; });
    await page.goto('http://127.0.0.1:8000/');
    await page.waitForTimeout(500);
    console.log('DOMContentLoaded fired:', loaded);
    await browser.close();
})();
