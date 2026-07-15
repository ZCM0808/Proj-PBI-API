const { chromium } = require('@playwright/test');

(async () => {
    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();

    page.on('dialog', async dialog => {
        console.log(`Dialog message: ${dialog.message()}`);
        await dialog.accept();
    });
    page.on('console', msg => console.log('PAGE LOG:', msg.text()));

    await page.goto('http://127.0.0.1:8000');
    
    // Open settings modal
    await page.click('#btn-settings');
    await page.waitForTimeout(1000);

    // Fill credentials
    await page.fill('#set-client', 'f0123456-789a-bcde-f012-3456789abcde');
    await page.fill('#set-secret', 'dummy_secret');
    await page.fill('#set-tenant', 'c8923456-789a-bcde-f012-3456789abcde');

    // Click verify
    console.log('Clicking verify...');
    await page.click('#verify-settings-btn');
    await page.waitForTimeout(2000);

    console.log('Done.');
    await browser.close();
})();
