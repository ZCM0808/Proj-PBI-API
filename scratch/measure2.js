const { chromium } = require('playwright');

(async () => {
    const browser = await chromium.launch();
    const page = await browser.newPage();
    await page.setViewportSize({ width: 1200, height: 800 });
    
    // Serve from the backend server which we know is running on 8081?
    // Wait, let's use the local file URI properly this time:
    const path = require('path');
    const uri = 'file:///' + path.resolve('static/index.html').replace(/\\/g, '/');
    await page.goto(uri);
    
    // Evaluate in browser
    const sizes = await page.evaluate(() => {
        const wfOverlay = document.getElementById('workflow-modal');
        const wfContent = document.getElementById('workflow-modal-content');
        
        // Force display flex
        wfOverlay.style.display = 'flex';
        wfOverlay.style.visibility = 'visible';
        wfOverlay.style.opacity = '1';
        wfContent.style.left = '0px';
        wfContent.style.top = '0px';
        
        const wfRect = wfContent.getBoundingClientRect();
        const setOverlay = document.getElementById('settings-modal');
        const setContent = setOverlay.querySelector('.modal-content');
        
        setOverlay.style.display = 'flex';
        setContent.style.left = '0px';
        setContent.style.top = '0px';
        
        const setRect = setContent.getBoundingClientRect();
        
        return {
            windowWidth: window.innerWidth,
            wf: {
                left: wfRect.left,
                rightDist: window.innerWidth - wfRect.right,
                width: wfRect.width
            },
            set: {
                left: setRect.left,
                rightDist: window.innerWidth - setRect.right,
                width: setRect.width
            }
        };
    });
    
    console.log("Measurements:");
    console.log(JSON.stringify(sizes, null, 2));

    await browser.close();
})();
