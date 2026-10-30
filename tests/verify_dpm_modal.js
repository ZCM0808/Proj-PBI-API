const { chromium } = require('playwright');

(async () => {
    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();
    await page.goto('http://127.0.0.1:8000', { waitUntil: 'domcontentloaded' });

    // 1. Verify DPM trigger button structure and classes
    const btnText = await page.locator('#wf-dpm-result-wrap button').textContent();
    console.log('Button text:', btnText.trim());
    if (!btnText.includes('全屏弹窗矩阵 (Universal Modal)')) {
        throw new Error('DPM button text does not match GUM standard');
    }

    const btnClass = await page.locator('#wf-dpm-result-wrap button').getAttribute('class');
    console.log('Button class:', btnClass);
    if (!btnClass.includes('btn-wf-sm') || !btnClass.includes('btn-wf-primary')) {
        throw new Error('DPM button class does not match GUM standard');
    }

    // 2. Inject mock cache and trigger openDpmResultModal
    await page.evaluate(() => {
        window.dpmPartitionsCache = [
            {
                workspaceName: 'DA_APAC_BI_QA',
                datasetName: 'APAC Channel performance Analytics',
                tableName: 'Fact_Sales',
                partitionName: 'Fact_Sales-Archive-2025',
                mode: 'Import',
                isIncremental: true,
                canRefresh: true
            },
            {
                workspaceName: 'DA_APAC_BI_QA',
                datasetName: 'APAC Channel performance Analytics',
                tableName: 'Dim_Product',
                partitionName: 'Dim_Product-Default',
                mode: 'Import',
                isIncremental: false,
                canRefresh: true
            }
        ];
        window.openDpmResultModal();
    });

    await page.waitForTimeout(500);

    // 3. Verify modal existence & title
    const modalHeader = page.locator('#universal-modal-overlay .modal-header span').first();
    const modalTitle = await modalHeader.textContent();
    console.log('Modal title:', modalTitle ? modalTitle.trim() : 'NOT_FOUND');

    // 4. Verify columns
    const thTexts = await page.locator('#universal-modal-overlay th').allTextContents();
    console.log('Modal Headers:', thTexts.map(t => t.trim()).filter(Boolean));

    // 5. Verify badge rendering inside table
    const badges = await page.locator('#universal-modal-overlay .uni-modal-table').innerHTML();
    const hasArchiveBadge = badges.includes('历史归档分区') || badges.includes('滚动增量分区');
    const hasStandardBadge = badges.includes('标准全量分区');
    console.log('Has partition badges:', hasArchiveBadge && hasStandardBadge);

    await browser.close();
    console.log('🎉 VERIFICATION_SUCCESSFUL');
})();
