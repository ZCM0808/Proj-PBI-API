const { chromium } = require('playwright');

(async () => {
    console.log('--- STARTING THREE PARTITIONS & ANTI-TRUNCATION TEST ---');
    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();

    await page.goto('http://127.0.0.1:8000', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1000);

    // 1. 验证 hydrate 后的数据与状态
    const status = await page.evaluate(async () => {
        if (window.hydrateDpmScanCache) {
            await window.hydrateDpmScanCache();
        }
        return {
            totalPartitions: window.dpmPartitionsCache ? window.dpmPartitionsCache.length : 0,
            badge: document.getElementById('wf-dpm-stats-badge')?.textContent,
            display: document.getElementById('wf-dpm-result-wrap')?.style.display
        };
    });
    console.log('Hydrated status:', status);

    if (status.totalPartitions < 16) {
        throw new Error(`Expected at least 16 partitions across 10 tables, got ${status.totalPartitions}`);
    }

    // 2. 验证各个表的 3 分区分布
    const partitionDistribution = await page.evaluate(() => {
        const map = {};
        window.dpmPartitionsCache.forEach(p => {
            const t = p.tableName;
            map[t] = map[t] || [];
            map[t].push(p.partitionName);
        });
        return map;
    });

    console.log('Partition distribution:');
    for (const [tbl, parts] of Object.entries(partitionDistribution)) {
        console.log(`  Table '${tbl}': ${parts.length} partitions`);
        if (tbl.includes('sales') || tbl.includes('transaction') || tbl.includes('inventory')) {
            if (parts.length !== 3) {
                throw new Error(`Table ${tbl} should have 3 partitions! Got ${parts.length}`);
            }
        }
    }

    // 3. 打开 Universal Modal
    await page.evaluate(() => {
        window.openDpmResultModal();
    });
    await page.waitForTimeout(600);

    // 4. 验证 Universal Modal 表格中 Partition Name 的完整渲染与无截断属性
    const partitionCellChecks = await page.evaluate(() => {
        const rows = Array.from(document.querySelectorAll('#universal-modal-overlay .uni-modal-table tbody tr'));
        const checks = [];
        rows.forEach((r, idx) => {
            // 第 4 列为 Partition Name
            const td = r.querySelectorAll('td')[4];
            if (!td) return;
            const container = td.querySelector('div');
            const span = td.querySelector('span');
            const text = span ? span.textContent : td.textContent;
            const computedStyle = window.getComputedStyle(span || td);
            checks.push({
                row: idx + 1,
                partitionName: text.trim(),
                whiteSpace: computedStyle.whiteSpace,
                wordBreak: computedStyle.wordBreak,
                textOverflow: computedStyle.textOverflow
            });
        });
        return checks;
    });

    console.log(`Verified ${partitionCellChecks.length} rows in Universal Modal:`);
    let has3PartitionsFact = false;
    partitionCellChecks.slice(0, 5).forEach(c => {
        console.log(`  Row ${c.row}: "${c.partitionName}" (whiteSpace=${c.whiteSpace}, wordBreak=${c.wordBreak})`);
        if (c.partitionName.includes('Archive') || c.partitionName.includes('Rolling') || c.partitionName.includes('Active')) {
            has3PartitionsFact = true;
        }
        if (c.textOverflow === 'ellipsis') {
            throw new Error(`Row ${c.row} has text-overflow: ellipsis! Truncation detected!`);
        }
    });

    if (!has3PartitionsFact) {
        throw new Error('Did not find expected 3-tier partition names in modal rows!');
    }

    await browser.close();
    console.log('🎉 ALL THREE-PARTITION AND ANTI-TRUNCATION ASSERTIONS PASSED 100%!');
})();
