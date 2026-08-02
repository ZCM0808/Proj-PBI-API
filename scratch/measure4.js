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
    await page.setViewportSize({ width: 1200, height: 800 });
    const uri = 'file:///' + path.resolve('scratch/test.html').replace(/\\/g, '/');
    await page.goto(uri);
    
    const sizes = await page.evaluate(() => {
        const wfOverlay = document.getElementById('workflow-modal');
        const wfContent = document.getElementById('workflow-modal-content');
        wfOverlay.style.display = 'flex';
        wfOverlay.style.visibility = 'visible';
        wfOverlay.style.opacity = '1';
        wfContent.style.left = '0px';
        wfContent.style.top = '0px';
        
        return {
            overlayRect: wfOverlay.getBoundingClientRect(),
            contentRect: wfContent.getBoundingClientRect(),
            contentStyle: window.getComputedStyle(wfContent).margin,
            contentLeft: window.getComputedStyle(wfContent).left,
            contentTransform: window.getComputedStyle(wfContent).transform
        };
    });
    
    console.log(JSON.stringify(sizes, null, 2));
    await browser.close();
})();
