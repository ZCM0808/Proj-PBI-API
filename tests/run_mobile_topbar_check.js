const { chromium } = require('playwright');

(async () => {
    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({
        viewport: { width: 390, height: 844 }, // iPhone 14
        deviceScaleFactor: 2,
        isMobile: true,
        hasTouch: true
    });
    const page = await context.newPage();
    
    console.log('Navigating to http://127.0.0.1:8000/ ...');
    await page.goto('http://127.0.0.1:8000/', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1000);

    const topbar = page.locator('#global-topbar');
    const isVisible = await topbar.isVisible();
    console.log('Topbar visible:', isVisible);

    const isScrollable = await topbar.evaluate(el => el.scrollWidth > el.clientWidth);
    const scrollWidth = await topbar.evaluate(el => el.scrollWidth);
    const clientWidth = await topbar.evaluate(el => el.clientWidth);
    console.log(`ScrollWidth: ${scrollWidth}px, ClientWidth: ${clientWidth}px, Scrollable: ${isScrollable}`);

    const items = topbar.locator('.gtb-item');
    const count = await items.count();
    console.log(`Found ${count} topbar items.`);

    const boxes = [];
    for (let i = 0; i < count; i++) {
        const box = await items.nth(i).boundingBox();
        if (box && box.width > 0) {
            boxes.push({ index: i, x: Math.round(box.x), width: Math.round(box.width) });
        }
    }

    let hasOverlap = false;
    for (let i = 0; i < boxes.length - 1; i++) {
        const cur = boxes[i];
        const next = boxes[i + 1];
        if (next.x < cur.x + cur.width - 2) {
            hasOverlap = true;
            console.error(`OVERLAP DETECTED between item ${cur.index} and ${next.index}: cur.right=${cur.x + cur.width}, next.left=${next.x}`);
        }
    }

    if (!hasOverlap) {
        console.log('SUCCESS: All topbar items are strictly sequential with ZERO overlap!');
    }

    // Test horizontal scroll
    await topbar.evaluate(el => { el.scrollLeft = 150; });
    const newScrollLeft = await topbar.evaluate(el => el.scrollLeft);
    console.log(`Horizontal scroll test: scrollLeft = ${newScrollLeft}px (Success: ${newScrollLeft > 0})`);

    await browser.close();
    process.exit(hasOverlap ? 1 : 0);
})();
