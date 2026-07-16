const { chromium } = require('@playwright/test');
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  
  page.on('console', msg => console.log('PAGE LOG:', msg.text()));
  page.on('pageerror', err => console.log('PAGE ERR:', err));
  
  const response = await page.goto('http://127.0.0.1:8000/');
  console.log("Status:", response.status());
  
  await page.waitForTimeout(2000);
  
  console.log("Body:", await page.evaluate(() => document.body.innerHTML.substring(0, 100)));
  
  await browser.close();
})();
