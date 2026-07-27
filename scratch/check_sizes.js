const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.goto('http://127.0.0.1:8081');
  await page.waitForTimeout(1000);
  
  // Click first API to show the right panel
  await page.locator('.api-item').first().click();
  await page.waitForTimeout(500);
  
  // Also we need it to have a bookmark with alias and tag so we can inspect them
  await page.evaluate(() => {
    localStorage.setItem('pbi-bookmarks', JSON.stringify([
      { path: '/v1.0/myorg/datasets', method: 'GET', alias: 'TestAlias', userTags: ['TestTag'] }
    ]));
    window.location.reload();
  });
  await page.waitForTimeout(1000);
  await page.locator('.api-item').first().click();
  await page.waitForTimeout(500);

  // Evaluate computed styles
  const styles = await page.evaluate(() => {
    const getStyles = (selector) => {
      const el = document.querySelector(selector);
      if (!el) return null;
      const rect = el.getBoundingClientRect();
      const comp = window.getComputedStyle(el);
      return {
        tag: el.tagName,
        width: rect.width,
        height: rect.height,
        padding: comp.padding,
        margin: comp.margin,
        fontSize: comp.fontSize,
        lineHeight: comp.lineHeight,
        display: comp.display,
        alignItems: comp.alignItems,
        boxSizing: comp.boxSizing
      };
    };
    return {
      section: getStyles('#right-panel-bm-section'),
      star: getStyles('#right-panel-bm-star'),
      alias: getStyles('.bm-alias'),
      tag: getStyles('.bm-tag'),
      locateBtn: getStyles('#right-panel-locate-btn'),
      quickNote: getStyles('#btn-note')
    };
  });
  
  console.log(JSON.stringify(styles, null, 2));
  await browser.close();
})();
