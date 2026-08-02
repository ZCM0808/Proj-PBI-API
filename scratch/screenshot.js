const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.goto('http://127.0.0.1:8081');
  await page.click('#btn-workflows');
  await page.waitForTimeout(500);
  await page.screenshot({ path: 'scratch/modal.png' });
  await browser.close();
})();
