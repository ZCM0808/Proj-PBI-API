const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

(async () => {
    const htmlPath = path.resolve('static/index.html');
    let html = fs.readFileSync(htmlPath, 'utf8');
    const cssPath = path.resolve('static/style.css');
    const css = fs.readFileSync(cssPath, 'utf8');
    html = html.replace('<link rel="stylesheet" href="/static/style.css?v=20260730_v122">', `<style>${css}</style>`);
    fs.writeFileSync('scratch/test.html', html);
    
    const browser = await chromium.launch();
    const page = await browser.newPage();
    const uri = 'file:///' + path.resolve('scratch/test.html').replace(/\\/g, '/');
    await page.goto(uri);
    
    const domInfo = await page.evaluate(() => {
        const wfOverlay = document.getElementById('workflow-modal');
        const footer = wfOverlay.querySelector('.modal-footer');
        return {
            footerParentId: footer.parentElement.id,
            footerParentClass: footer.parentElement.className,
            overlayChildren: Array.from(wfOverlay.children).map(c => c.id || c.className)
        };
    });
    
    console.log(domInfo);
    await browser.close();
})();
