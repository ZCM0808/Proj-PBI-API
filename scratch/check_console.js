const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  page.on('pageerror', error => console.log('PAGE ERROR:', error.message));
  page.on('console', msg => { if (msg.type() === 'error') console.log('CONSOLE ERROR:', msg.text()); });
  await page.goto('http://127.0.0.1:8081');
  await page.waitForTimeout(3000);
  console.log('Tree nodes count:', await page.locator('.api-item').count());
  await browser.close();
})();
