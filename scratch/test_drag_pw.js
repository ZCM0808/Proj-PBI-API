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

    console.log("Initial pos:", await getPos());

    const header = page.locator('#workflow-modal-content .modal-header h3');
    const box = await header.boundingBox();
    
    // Perform mouse drag
    await page.mouse.move(box.x + 10, box.y + 10);
    await page.mouse.down();
    await page.mouse.move(box.x + 150, box.y + 150, { steps: 10 });
    await page.mouse.up();
    await page.waitForTimeout(200);

    const posDragged = await getPos();
    console.log("Pos after drag:", posDragged);

    // Click local model step header
    const stepHeader = page.locator('#wf-container-local_model_query .wf-step-header');
    await stepHeader.click();
    await page.waitForTimeout(200);

    const posCollapsed = await getPos();
    console.log("Pos after collapse:", posCollapsed);

    if (posDragged.top !== posCollapsed.top || posDragged.left !== posCollapsed.left) {
        console.log(`\n❌ SHIFT DETECTED! Dragged: (${posDragged.left}, ${posDragged.top}), Collapsed: (${posCollapsed.left}, ${posCollapsed.top})`);
    } else {
        console.log("\n✅ PERFECT: Top & Left stayed 100% fixed!");
    }

    await browser.close();
    process.exit(0);
})();
