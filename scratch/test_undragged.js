const { chromium } = require('@playwright/test');

(async () => {
    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();
    await page.goto('http://127.0.0.1:8000');

    await page.click('#btn-workflows');
    await page.waitForTimeout(300);
    await page.selectOption('#wf-selector', 'local_model_query');
    await page.waitForTimeout(300);

    const getPos = async () => {
        return await page.evaluate(() => {
            const el = document.getElementById('workflow-modal-content');
            const rect = el.getBoundingClientRect();
            return { top: Math.round(rect.top), left: Math.round(rect.left), height: Math.round(rect.height) };
        });
    };

    const initialPos = await getPos();
    console.log("1. Initial (un-dragged) pos:", initialPos);

    // Click collapse without dragging
    const stepHeader = page.locator('#wf-container-local_model_query .wf-step-header');
    await stepHeader.click();
    await page.waitForTimeout(200);

    const collapsedPos = await getPos();
    console.log("2. Un-dragged collapsed pos:", collapsedPos);

    if (initialPos.top !== collapsedPos.top || initialPos.left !== collapsedPos.left) {
        console.log(`\n❌ UN-DRAGGED SHIFT DETECTED! Initial: (${initialPos.left}, ${initialPos.top}), Collapsed: (${collapsedPos.left}, ${collapsedPos.top})`);
    } else {
        console.log("\n✅ PERFECT: Un-dragged Top & Left stayed 100% fixed at (240, 60)!");
    }

    await browser.close();
    process.exit(0);
})();
