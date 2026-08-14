const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.goto('http://localhost:8000/');
  
  // click the workflow Admin Report View Count (Activity Events)
  // Assuming it's in a list
  await page.evaluate(() => {
     const elements = Array.from(document.querySelectorAll('.wf-menu-item'));
     const el = elements.find(e => e.innerText.includes('Admin Report View Count'));
     if (el) el.click();
  });
  
  await page.waitForTimeout(500);
  
  // click run button
  await page.evaluate(() => {
     const btn = document.getElementById('btn-run-rvc');
     if(btn) btn.click();
  });
  
  await page.waitForTimeout(2000);
  
  const html = await page.evaluate(() => {
     const table = document.getElementById('wf-out-rvc-table');
     return table ? table.outerHTML : 'NOT_FOUND';
  });
  console.log(html);
  
  // Get ALL elements with position: sticky
  const stickies = await page.evaluate(() => {
     const all = document.querySelectorAll('*');
     const res = [];
     for(const el of all) {
         const style = window.getComputedStyle(el);
         if(style.position === 'sticky') {
             res.push({
                 tag: el.tagName,
                 id: el.id,
                 className: el.className,
                 html: el.outerHTML.substring(0, 200)
             });
         }
     }
     return res;
  });
  console.log("STICKY ELEMENTS:");
  console.dir(stickies, {depth: null});
  
  await browser.close();
})();
