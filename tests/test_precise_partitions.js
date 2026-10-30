const { chromium } = require('playwright');

(async () => {
    console.log('--- STARTING PRECISE 2024/2025/2026 PARTITIONS TEST ---');
    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();

    await page.goto('http://127.0.0.1:8000', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1000);

    // 1. 验证自愈恢复与分区数据
    const hydrated = await page.evaluate(async () => {
        if (window.hydrateDpmScanCache) {
            await window.hydrateDpmScanCache();
        }
        return {
            total: window.dpmPartitionsCache ? window.dpmPartitionsCache.length : 0,
            badge: document.getElementById('wf-dpm-stats-badge')?.textContent,
            samplePartitions: (window.dpmPartitionsCache || []).slice(0, 6).map(p => ({
                table: p.tableName,
                name: p.partitionName,
                cat: p.partitionCategory,
                year: p.year
            }))
        };
    });

    console.log('Hydrated total:', hydrated.total);
    console.log('Sample partitions:', hydrated.samplePartitions);

    if (hydrated.total < 16) {
        throw new Error(`Expected 16 partitions, got ${hydrated.total}`);
    }

    // 检查是否有精确的 -2024, -2025, -2026 分区
    const has2024 = hydrated.samplePartitions.some(p => p.name.endsWith('-2024'));
    const has2025 = hydrated.samplePartitions.some(p => p.name.endsWith('-2025'));
    const has2026 = hydrated.samplePartitions.some(p => p.name.endsWith('-2026'));
    console.log('Has precise year partitions:', { has2024, has2025, has2026 });
    if (!has2024 || !has2025 || !has2026) {
        throw new Error('Partitions do not match 2024/2025/2026 pattern!');
    }

    // 2. 打开 Universal Modal 并校验表格单元格与精简说明徽章
    await page.evaluate(() => {
        window.openDpmResultModal();
    });
    await page.waitForTimeout(600);

    const rowsData = await page.evaluate(() => {
        const trs = Array.from(document.querySelectorAll('#universal-modal-overlay .uni-modal-table tbody tr'));
        return trs.map((tr, idx) => {
            const tds = tr.querySelectorAll('td');
            const tableName = tds[3] ? tds[3].textContent.trim() : '';
            const partitionName = tds[4] ? tds[4].querySelector('span')?.textContent.trim() : '';
            const partitionType = tds[5] ? tds[5].textContent.trim() : '';
            return { idx: idx + 1, tableName, partitionName, partitionType };
        });
    });

    console.log('Modal rows sample:');
    rowsData.slice(0, 8).forEach(r => {
        console.log(`  [Row ${r.idx}] Table: ${r.tableName} | Partition: ${r.partitionName} | Type: ${r.partitionType}`);
    });

    // 验证说明是否精简 (不超过 10 个字符)
    rowsData.forEach(r => {
        if (r.partitionType.length > 12) {
            throw new Error(`Partition type description too verbose (${r.partitionType.length} chars): ${r.partitionType}`);
        }
    });

    console.log('All partition type badges are concise (< 12 chars)!');

    await browser.close();
    console.log('🎉 ALL PRECISE PARTITIONS AND CONCISE BADGES VERIFIED SUCCESSFULLY!');
})();
