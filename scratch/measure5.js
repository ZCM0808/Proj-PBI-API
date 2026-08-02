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
    
    await page.waitForTimeout(1000); // Wait for animation
    
    const sizes = await page.evaluate(() => {
        const wfOverlay = document.getElementById('workflow-modal');
        const wfContent = document.getElementById('workflow-modal-content');
        wfOverlay.style.display = 'flex';
        wfOverlay.style.visibility = 'visible';
        wfOverlay.style.opacity = '1';
        wfContent.style.left = '0px';
        wfContent.style.top = '0px';
        
        return new Promise(resolve => {
            setTimeout(() => {
                const setOverlay = document.getElementById('settings-modal');
                const setContent = setOverlay.querySelector('.modal-content');
                setOverlay.style.display = 'flex';
                setContent.style.left = '0px';
                setContent.style.top = '0px';
                
                setTimeout(() => {
                    resolve({
                        wf: {
                            rect: wfContent.getBoundingClientRect(),
                            margin: window.getComputedStyle(wfContent).margin,
                            width: window.getComputedStyle(wfContent).width,
                            flexBasis: window.getComputedStyle(wfContent).flexBasis,
                            transform: window.getComputedStyle(wfContent).transform
                        },
                        set: {
                            rect: setContent.getBoundingClientRect(),
                            margin: window.getComputedStyle(setContent).margin,
                            width: window.getComputedStyle(setContent).width
                        }
                    });
                }, 1000); // wait for settings animation
            }, 1000);
        });
    });
    
    console.log(JSON.stringify(sizes, null, 2));
    await browser.close();
})();
