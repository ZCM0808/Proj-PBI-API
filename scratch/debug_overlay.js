const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.goto('http://127.0.0.1:8081');
  const overlay = await page.locator('#workflow-modal');
  const left = await overlay.evaluate(el => window.getComputedStyle(el).left);
  const width = await overlay.evaluate(el => window.getComputedStyle(el).width);
  const zIndex = await overlay.evaluate(el => window.getComputedStyle(el).zIndex);
  const display = await overlay.evaluate(el => window.getComputedStyle(el).display);
  console.log({left, width, zIndex, display});
  
  const content = await page.locator('#workflow-modal-content');
  const cMargin = await content.evaluate(el => window.getComputedStyle(el).margin);
  const cWidth = await content.evaluate(el => window.getComputedStyle(el).width);
  console.log({contentMargin: cMargin, contentWidth: cWidth});

  await browser.close();
})();
