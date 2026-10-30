const { chromium } = require('playwright');
(async () => {
    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
    await page.goto('http://127.0.0.1:8000/', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1000);

    // Apply the fix dynamically
    await page.evaluate(() => {
        const style = document.createElement('style');
        style.id = 'fix-scroll-unity';
        style.textContent = `
            .app-main-layout {
                overflow-x: visible !important;
                width: max-content !important;
                min-width: 100% !important;
            }
            #workspace-container {
                overflow-x: visible !important;
            }
        `;
        document.head.appendChild(style);
    });

    const info = await page.evaluate(() => {
        const appContainer = document.querySelector('.app-container');
        const topbar = document.querySelector('#global-topbar');
        const mainLayout = document.querySelector('.app-main-layout');
        const sidebar = document.querySelector('.sidebar');
        const ws = document.querySelector('#workspace-container');
        
        // Initial positions before scroll
        const initial = {
            topbarX: Math.round(topbar.getBoundingClientRect().x),
            mainLayoutX: Math.round(mainLayout.getBoundingClientRect().x),
            sidebarX: Math.round(sidebar.getBoundingClientRect().x),
            wsX: Math.round(ws.getBoundingClientRect().x)
        };

        return { initial };
    });

    console.log('Initial state:', JSON.stringify(info, null, 2));

    // Simulate real touch drag in the middle of the screen (y = 400, on the workspace)
    console.log('Simulating touch drag from x=300 to x=100 on workspace...');
    await page.touchscreen.tap(300, 400);
    // Drag left
    const startX = 320;
    const endX = 100;
    const y = 400;
    
    // Dispatch touch sequence
    await page.evaluate(async () => {
        const el = document.elementFromPoint(300, 400);
        console.log('Element at point (300, 400):', el.tagName, el.className, el.id);
    });

    // Use playwright mouse/touch to swipe
    await page.mouse.move(startX, y);
    await page.mouse.down();
    for (let x = startX; x >= endX; x -= 20) {
        await page.mouse.move(x, y);
        await page.waitForTimeout(10);
    }
    await page.mouse.up();
    await page.waitForTimeout(500);

    const afterTouch = await page.evaluate(() => {
        const appContainer = document.querySelector('.app-container');
        const topbar = document.querySelector('#global-topbar');
        const mainLayout = document.querySelector('.app-main-layout');
        const sidebar = document.querySelector('.sidebar');
        const ws = document.querySelector('#workspace-container');
        return {
            scrollLeft: appContainer.scrollLeft,
            topbarX: Math.round(topbar.getBoundingClientRect().x),
            mainLayoutX: Math.round(mainLayout.getBoundingClientRect().x),
            sidebarX: Math.round(sidebar.getBoundingClientRect().x),
            wsX: Math.round(ws.getBoundingClientRect().x)
        };
    });

    console.log('After touch drag state:', JSON.stringify(afterTouch, null, 2));
    await browser.close();
})();
