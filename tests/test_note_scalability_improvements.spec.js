const { test, expect } = require('@playwright/test');

test.describe('Quick Note Scalability & High-Performance Loading Tests', () => {

    test('1. Backend API: /api/search-notes returns lightweight metadata and /api/note fetches content on demand', async ({ request }) => {
        // 1. 测试 search-notes 默认轻量化（不携带巨大的 content，极大节省传输与解析耗时）
        const searchRes = await request.get('/api/search-notes');
        expect(searchRes.status()).toBe(200);
        const searchJson = await searchRes.json();
        expect(searchJson.success).toBe(true);
        expect(Array.isArray(searchJson.results)).toBe(true);

        if (searchJson.results.length > 0) {
            const firstNote = searchJson.results[0];
            expect(firstNote.filename).toBeDefined();
            expect(firstNote.mtime).toBeDefined();
            expect(firstNote.size).toBeDefined();
            // 校验默认未携带全量 content（轻量解耦）
            expect(firstNote.content).toBeUndefined();

            // 2. 测试单篇笔记按需拉取接口 /api/note?filename=...
            const noteRes = await request.get(`/api/note?filename=${encodeURIComponent(firstNote.filename)}`);
            expect(noteRes.status()).toBe(200);
            const noteJson = await noteRes.json();
            expect(noteJson.success).toBe(true);
            expect(noteJson.filename).toBe(firstNote.filename);
            expect(typeof noteJson.content).toBe('string');
        }
    });

    test('2. Progressive Chunked Rendering: 100+ notes load first batch instantly (25 items) and expand on scroll', async ({ page }) => {
        await page.goto('/');
        await page.waitForLoadState('domcontentloaded');

        // 打开 Quick Note 弹窗并注入 100 篇模拟笔记
        const initResult = await page.evaluate(() => {
            window.openNoteModal();

            // 生成 100 篇结构化模拟笔记元数据
            const mockNotes = [];
            for (let i = 1; i <= 100; i++) {
                const pad = String(i).padStart(3, '0');
                mockNotes.push({
                    filename: `scale_test_note_${pad}.md`,
                    snippet: `This is the preview snippet for test note number ${pad}`,
                    updated_at: 1729000000 - i * 100,
                    created_at: 1728000000,
                    size: 1024 * i
                });
            }

            window._allNotesMetadata = mockNotes;
            window._currentNotesList = mockNotes;
            window.renderSortedNotesList();

            const listEl = document.getElementById('note-history-list');
            const items = listEl.querySelectorAll('.note-history-item');
            const sentinel = document.getElementById('note-list-sentinel');
            const counterText = document.getElementById('note-total-count-text')?.textContent;

            return {
                renderedCount: items.length,
                hasSentinel: !!sentinel,
                sentinelText: sentinel?.textContent,
                counterText: counterText
            };
        });

        // 验证首屏分批加载：仅渲染 25 项，并带有正确的加载提示与总数徽章
        expect(initResult.renderedCount).toBe(25);
        expect(initResult.hasSentinel).toBe(true);
        expect(initResult.sentinelText).toContain('25 / 100');
        expect(initResult.counterText).toBe('共 100 篇笔记');

        // 模拟滚动或触发 renderMoreNotesChunk 加载下一批
        const secondBatchResult = await page.evaluate(() => {
            window.renderMoreNotesChunk();
            const listEl = document.getElementById('note-history-list');
            const items = listEl.querySelectorAll('.note-history-item');
            const sentinel = document.getElementById('note-list-sentinel');

            return {
                renderedCount: items.length,
                hasSentinel: !!sentinel,
                sentinelText: sentinel?.textContent
            };
        });

        // 验证追加加载至 50 项
        expect(secondBatchResult.renderedCount).toBe(50);
        expect(secondBatchResult.hasSentinel).toBe(true);
        expect(secondBatchResult.sentinelText).toContain('50 / 100');
    });

    test('3. On-Demand Note Fetching & Memory Caching: fetches unread note content on click and caches it', async ({ page }) => {
        await page.goto('/');
        await page.waitForLoadState('domcontentloaded');

        // 拦截 /api/note 请求返回受控数据
        await page.route('**/api/note?filename=lazy_demo.md', async route => {
            await route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify({
                    success: true,
                    filename: 'lazy_demo.md',
                    content: '# Lazy Loaded Demo Content\nThis content was fetched on demand without bloating the list.'
                })
            });
        });

        await page.evaluate(() => {
            window.openNoteModal();
            window._allNotesMetadata = [
                { filename: 'lazy_demo.md', snippet: 'Preview snippet', updated_at: 1729000000, size: 88 }
            ];
            window._currentNotesList = window._allNotesMetadata;
            window._noteContentCache = {};
            window.renderSortedNotesList();
            // 激活 lazy_demo.md (未提供 content)
            window.setActiveNote('lazy_demo.md', null, true);
        });

        // 等待正文按需拉取并填入 easyMDE
        await page.waitForFunction(() => {
            return window.easyMDE && window.easyMDE.value().includes('Lazy Loaded Demo Content');
        }, null, { timeout: 5000 });

        // 校验内存缓存是否已建立
        const cacheCheck = await page.evaluate(() => {
            return {
                inCache: !!window._noteContentCache['lazy_demo.md'],
                cachedContent: window._noteContentCache['lazy_demo.md']
            };
        });

        expect(cacheCheck.inCache).toBe(true);
        expect(cacheCheck.cachedContent).toContain('Lazy Loaded Demo Content');
    });

    test('4. 0ms Instant Local Filtering and Search Counter Integration', async ({ page }) => {
        await page.goto('/');
        await page.waitForLoadState('domcontentloaded');

        // 拦截网络深搜请求，确保与本地过滤结果无缝呼应
        await page.route('**/api/search-notes*', async route => {
            const url = new URL(route.request().url());
            const q = (url.searchParams.get('q') || '').toLowerCase();
            const all = [
                { filename: 'Alpha_Finance_Report.md', snippet: 'Q3 Financial Analysis', updated_at: 1729000100, size: 100 },
                { filename: 'Beta_Marketing_Plan.md', snippet: 'Brand strategy 2026', updated_at: 1729000200, size: 200 },
                { filename: 'Gamma_Tech_Specs.md', snippet: 'Architecture doc', updated_at: 1729000300, size: 300 }
            ];
            const filtered = q ? all.filter(n => n.filename.toLowerCase().includes(q) || n.snippet.toLowerCase().includes(q)) : all;
            await route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify({ success: true, results: filtered })
            });
        });

        await page.evaluate(() => {
            window.openNoteModal();
            const mockNotes = [
                { filename: 'Alpha_Finance_Report.md', snippet: 'Q3 Financial Analysis', updated_at: 1729000100, size: 100 },
                { filename: 'Beta_Marketing_Plan.md', snippet: 'Brand strategy 2026', updated_at: 1729000200, size: 200 },
                { filename: 'Gamma_Tech_Specs.md', snippet: 'Architecture doc', updated_at: 1729000300, size: 300 }
            ];
            window._allNotesMetadata = mockNotes;
            window._currentNotesList = mockNotes;
            window.renderSortedNotesList();
        });

        const searchInput = page.locator('#note-search');
        await expect(searchInput).toBeVisible();

        // 输入搜索词 "Finance"
        await searchInput.fill('Finance');
        await page.evaluate(() => {
            window.handleNoteSearchInput(document.getElementById('note-search'));
        });

        // 验证 0ms 瞬间本地过滤
        const filterCheck = await page.evaluate(() => {
            const listEl = document.getElementById('note-history-list');
            const items = listEl.querySelectorAll('.note-history-item');
            const statusText = document.getElementById('note-filter-status-text')?.textContent;
            return {
                itemCount: items.length,
                firstItemText: items[0]?.textContent,
                statusText: statusText
            };
        });

        expect(filterCheck.itemCount).toBe(1);
        expect(filterCheck.firstItemText).toContain('Alpha_Finance_Report');
        expect(filterCheck.statusText).toContain('匹配 1 项');

        // 点击清空搜索按钮
        const clearBtn = page.locator('#btn-clear-note-search');
        await clearBtn.click();

        // 验证立即复原为 3 篇笔记
        const restoreCheck = await page.evaluate(() => {
            const listEl = document.getElementById('note-history-list');
            const items = listEl.querySelectorAll('.note-history-item');
            const totalText = document.getElementById('note-total-count-text')?.textContent;
            return {
                itemCount: items.length,
                totalText: totalText
            };
        });

        expect(restoreCheck.itemCount).toBe(3);
        expect(restoreCheck.totalText).toBe('共 3 篇笔记');
    });

});
