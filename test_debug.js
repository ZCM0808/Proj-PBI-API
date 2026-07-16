const { chromium } = require('@playwright/test');

(async () => {
  const browser = await chromium.launch();
  const context = await browser.newContext();
  const newPage = await context.newPage();
  
  newPage.on('console', msg => console.log('LOG:', msg.text()));
  newPage.on('pageerror', error => console.log('PAGE ERROR:', error));
  
  await newPage.route('**/api/settings', route => {
    console.log('ROUTE INTERCEPTED:', route.request().url());
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        PBI_WORKSPACES: [{ id: 'mock-ws-id-123', name: 'Mock Server Workspace' }],
        PBI_DATASETS: [],
        PBI_REPORTS: []
      })
    });
  });

  await newPage.goto('http://127.0.0.1:8000/');
  console.log('Navigated');
  
  await newPage.waitForTimeout(1000);
  
  const val = await newPage.evaluate(() => localStorage.getItem('pbi_workspaces'));
  console.log('LocalStorage val:', val);
  
  await browser.close();
})();
