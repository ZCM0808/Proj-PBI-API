const { chromium } = require('playwright');

(async () => {
    const browser = await chromium.launch();
    const context = await browser.newContext();
    const page = await context.newPage();
    
    // Log console messages
    page.on('console', msg => console.log('PAGE LOG:', msg.text()));
    page.on('pageerror', err => console.log('PAGE ERROR:', err.message));
    
    await page.goto('http://127.0.0.1:8081');
    
    // open settings modal
    await page.click('#btn-settings');
    await page.waitForSelector('#settings-modal', { state: 'visible' });
    
    console.log("Settings modal opened. Clicking dropdown trigger...");
    await page.click('#snapshot-dropdown-trigger');
    
    await page.waitForTimeout(1000);
    
    const menuDisplay = await page.evaluate(() => {
        const menu = document.getElementById('snapshot-dropdown-menu');
        return window.getComputedStyle(menu).display;
    });
    console.log("Menu display:", menuDisplay);
    
    const menuOpacity = await page.evaluate(() => {
        const menu = document.getElementById('snapshot-dropdown-menu');
        return window.getComputedStyle(menu).opacity;
    });
    console.log("Menu opacity:", menuOpacity);

    await page.screenshot({ path: 'debug_dropdown.png', fullPage: true });
    
    await browser.close();
})();
