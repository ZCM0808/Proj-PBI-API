const { chromium } = require('@playwright/test');
(async () => {
  const browser = await chromium.launch();
  const context = await browser.newContext();
  const page = await context.newPage();
  
  page.on('console', msg => console.log('PAGE LOG:', msg.text()));
  page.on('pageerror', err => console.log('PAGE ERR:', err));
  
  await page.goto('http://127.0.0.1:8000/');
  await page.waitForTimeout(1000);
  
  const wData = await page.evaluate(() => localStorage.getItem('pbi_workspaces'));
  console.log("Local Storage pbi_workspaces:", wData);
  
  const selectHtml = await page.evaluate(() => document.getElementById('active-workspace').innerHTML);
  console.log("Select HTML:", selectHtml);
  
  await browser.close();
})();
