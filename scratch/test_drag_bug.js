const puppeteer = require('puppeteer');

(async () => {
    const browser = await puppeteer.launch({ headless: true });
    const page = await browser.newPage();
    await page.goto('http://127.0.0.1:8000', { waitUntil: 'networkidle0' });

    console.log("1. Opening Workflows modal...");
    await page.click('#btn-workflows');
    await new Promise(r => setTimeout(r, 500));

    console.log("2. Switching to local_model_query...");
    await page.select('#wf-selector', 'local_model_query');
    await new Promise(r => setTimeout(r, 500));

    const getModalPos = async () => {
        return await page.evaluate(() => {
            const el = document.getElementById('workflow-modal-content');
            const rect = el.getBoundingClientRect();
            return { x: rect.x, y: rect.y, top: rect.top, left: rect.left, width: rect.width, height: rect.height };
        });
    };

    let posBefore = await getModalPos();
    console.log("Pos before drag:", posBefore);

    console.log("3. Dragging workflow modal content by (100, 100)...");
    const header = await page.$('#workflow-modal-content .modal-header');
    const box = await header.boundingClientRect();
    await page.mouse.move(box.x + 50, box.y + 10);
    await page.mouse.down();
    await page.mouse.move(box.x + 150, box.y + 110);
    await page.mouse.up();
    await new Promise(r => setTimeout(r, 200));

    let posAfterDrag = await getModalPos();
    console.log("Pos after drag:", posAfterDrag);

    console.log("4. Clicking collapse header...");
    await page.click('.wf-step-header');
    await new Promise(r => setTimeout(r, 300));

    let posAfterCollapse = await getModalPos();
    console.log("Pos after collapse:", posAfterCollapse);

    console.log("5. Clicking expand header...");
    await page.click('.wf-step-header');
    await new Promise(r => setTimeout(r, 300));

    let posAfterExpand = await getModalPos();
    console.log("Pos after expand:", posAfterExpand);

    await browser.close();
    process.exit(0);
})();
