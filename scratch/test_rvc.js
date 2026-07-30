const { chromium } = require('playwright');
const fs = require('fs');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  
  // Set the auth cookies
  await context.addCookies([
    {
      name: 'pbi_auth_token',
      value: require('crypto').createHash('sha256').update(process.env.APP_ACCESS_PASSWORD || '').digest('hex'),
      domain: 'localhost',
      path: '/'
    }
  ]);
  
  const page = await context.newPage();
  await page.goto('http://localhost:8000/');
  
  // Open workflows
  await page.click('#btn-workflows');
  
  // Wait for modal
  await page.waitForSelector('#workflow-modal', { state: 'visible' });
  
  // Select RVC workflow
  await page.selectOption('#wf-selector', 'report_view_count');
  
  // Wait for dropdown to populate
  await page.waitForTimeout(2000);
  
  // Set dates
  const today = new Date();
  const weekAgo = new Date();
  weekAgo.setDate(weekAgo.getDate() - 7);
  
  const dStart = weekAgo.toISOString().split('T')[0];
  const dEnd = today.toISOString().split('T')[0];
  
  await page.fill('#wf-rvc-start', dStart);
  await page.fill('#wf-rvc-end', dEnd);
  
  // Run
  await page.click('#btn-run-rvc');
  
  // Wait until done
  await page.waitForFunction(() => {
      const status = document.getElementById('wf-rvc-status').textContent;
      return status.includes('Analysis Complete') || status.includes('Error:');
  }, { timeout: 30000 }).catch(e => console.log('Timeout waiting for finish'));
  
  // Extract results
  const logs = await page.evaluate(() => document.getElementById('wf-out-rvc-logs').innerText);
  const table = await page.evaluate(() => document.getElementById('wf-out-rvc-table').innerText);
  
  console.log("=== LOGS ===");
  console.log(logs);
  console.log("=== TABLE ===");
  console.log(table);
  
  await browser.close();
})();
