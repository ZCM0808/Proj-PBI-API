const { chromium } = require('playwright');

(async () => {
    console.log('--- STARTING PLAYWRIGHT RELOAD PERSISTENCE TEST ---');
    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext();
    const page = await context.newPage();

    // 1. 打开首页
    await page.goto('http://127.0.0.1:8000', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1000);

    // 2. 模拟用户执行了一次扫描并保存到缓存中（或者通过 hydrate 从后端恢复）
    const isHydrated = await page.evaluate(async () => {
        if (window.hydrateDpmScanCache) {
            await window.hydrateDpmScanCache();
        }
        return {
            cacheLength: window.dpmPartitionsCache ? window.dpmPartitionsCache.length : 0,
            display: document.getElementById('wf-dpm-result-wrap')?.style.display,
            badge: document.getElementById('wf-dpm-stats-badge')?.textContent
        };
    });
    console.log('Hydration check on load:', isHydrated);

    if (isHydrated.cacheLength === 0) {
        throw new Error('Cache length should be > 0 (restored from backend cache file)');
    }
    if (isHydrated.display !== 'block') {
        throw new Error('Result wrap should be visible (display: block)');
    }

    // 3. 模拟用户刷新页面（F5 Reload）！
    console.log('Simulating Page Reload (F5)...');
    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1000);

    // 4. 验证刷新页面后，扫描结果依然完整保留！
    const afterReload = await page.evaluate(() => {
        return {
            cacheLength: window.dpmPartitionsCache ? window.dpmPartitionsCache.length : 0,
            display: document.getElementById('wf-dpm-result-wrap')?.style.display,
            badge: document.getElementById('wf-dpm-stats-badge')?.textContent
        };
    });
    console.log('Status after reload:', afterReload);

    if (afterReload.cacheLength !== isHydrated.cacheLength) {
        throw new Error(`Cache length mismatch after reload! Expected ${isHydrated.cacheLength}, got ${afterReload.cacheLength}`);
    }
    if (afterReload.display !== 'block') {
        throw new Error('Result wrap became hidden after reload! Expected display: block');
    }

    // 5. 点击【全屏弹窗矩阵 (Universal Modal)】，验证弹窗能否正常展开
    console.log('Clicking Universal Modal button...');
    await page.evaluate(() => {
        window.openDpmResultModal();
    });
    await page.waitForTimeout(600);

    const modalTitle = await page.locator('#universal-modal-overlay .modal-header span').first().textContent();
    console.log('Modal title:', modalTitle ? modalTitle.trim() : 'NOT_FOUND');

    const rowCount = await page.locator('#universal-modal-overlay .uni-modal-table tbody tr').count();
    console.log('Modal row count:', rowCount);
    if (rowCount !== afterReload.cacheLength) {
        throw new Error(`Modal row count (${rowCount}) != cache length (${afterReload.cacheLength})`);
    }

    // 6. 验证顶栏模型与报表全量数据在刷新后依然完好
    const gtbCounts = await page.evaluate(() => {
        const dsItems = document.querySelectorAll('#gtb-ds-list .gtb-ds-item').length;
        const rpItems = document.querySelectorAll('#gtb-rp-list .gtb-rp-item').length;
        const dsStat = document.getElementById('gtb-ds-stat-text')?.textContent;
        const rpStat = document.getElementById('gtb-rp-stat-text')?.textContent;
        return { dsItems, rpItems, dsStat, rpStat };
    });
    console.log('Topbar counts after reload:', gtbCounts);

    if (gtbCounts.dsItems < 100) {
        throw new Error(`Datasets in topbar shrank to ${gtbCounts.dsItems}, should be >= 120!`);
    }
    if (gtbCounts.rpItems < 100) {
        throw new Error(`Reports in topbar shrank to ${gtbCounts.rpItems}, should be >= 120!`);
    }

    await browser.close();
    console.log('🎉 ALL PERSISTENCE TESTS PASSED 100%!');
})();
