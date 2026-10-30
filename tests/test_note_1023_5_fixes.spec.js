const { test, expect } = require('@playwright/test');

test.describe('10-23 Note 5 Issues Regression Tests', () => {

    test.beforeEach(async ({ page }) => {
        await page.goto('/');
        await page.waitForLoadState('domcontentloaded');
        // 等待全局顶栏与脚本初始化完成
        await page.waitForTimeout(500);
    });

    test('Fix 1: Settings Modal reflects active interactive auth without dropping to legacy', async ({ page }) => {
        // Mock /api/auth-info to return is_interactive: true
        await page.route('**/api/auth-info', async route => {
            await route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify({
                    success: true,
                    is_interactive: true,
                    username: 'test_user@vfc.com',
                    policy_label: '余30/共30'
                })
            });
        });

        const settingsBtn = page.locator('#btn-settings');
        const settingsModal = page.locator('#settings-modal');
        await expect.poll(async () => {
            if (!await settingsModal.isVisible()) {
                await page.evaluate(() => window.openSettingsModal && window.openSettingsModal());
            }
            return await settingsModal.isVisible();
        }, { timeout: 10000 }).toBe(true);

        // 验证当前选中的 Tab 是 interactive 而不是 legacy
        const tabBtnInteractive = page.locator('#tab-btn-interactive');
        const tabBtnLegacy = page.locator('#tab-btn-legacy');
        await expect(tabBtnInteractive).toHaveClass(/active/);
        await expect(tabBtnLegacy).not.toHaveClass(/active/);
    });

    test('Fix 2: Draggable modal clamps within viewport and cannot be lost', async ({ page }) => {
        const btnNote = page.locator('#btn-note');
        const noteModal = page.locator('#modal-note');
        await expect.poll(async () => {
            if (!await noteModal.isVisible()) {
                await btnNote.click().catch(() => {});
            }
            return await noteModal.isVisible();
        }, { timeout: 10000 }).toBe(true);

        const modalHeader = noteModal.locator('.modal-header');
        const headerBox = await modalHeader.boundingBox();
        expect(headerBox).not.toBeNull();

        // 模拟猛烈向上向左拖拽出屏幕外部 (负坐标超出视口)
        await page.mouse.move(headerBox.x + 50, headerBox.y + 10);
        await page.mouse.down();
        await page.mouse.move(-5000, -5000, { steps: 5 });
        await page.mouse.up();

        // 验证标题栏 top 依然严格 >= 0，决不能掉出视口上方
        const boxAfterDrag = await modalHeader.boundingBox();
        expect(boxAfterDrag.y).toBeGreaterThanOrEqual(0);
    });

    test('Fix 3: Settings modal footer buttons have full 15px icon size without shrinking', async ({ page }) => {
        const settingsBtn = page.locator('#btn-settings');
        const settingsModal = page.locator('#settings-modal');
        await expect.poll(async () => {
            if (!await settingsModal.isVisible()) {
                await settingsBtn.click().catch(() => {});
            }
            return await settingsModal.isVisible();
        }, { timeout: 10000 }).toBe(true);

        const exportBtn = page.locator('#export-local-btn');
        const importBtn = page.locator('#import-local-btn');
        const saveBtn = page.locator('#save-settings-btn');

        await expect(exportBtn).toBeVisible();
        await expect(importBtn).toBeVisible();
        await expect(saveBtn).toBeVisible();

        // 断言三个按钮内部的 SVG 渲染尺寸均为 15px 黄金视觉大小
        for (const btn of [exportBtn, importBtn, saveBtn]) {
            const svg = btn.locator('svg');
            const box = await svg.boundingBox();
            expect(box).not.toBeNull();
            expect(box.width).toBeGreaterThanOrEqual(14);
            expect(box.height).toBeGreaterThanOrEqual(14);
        }
    });

    test('Fix 4: Quick Note modal has accessible bottom resize handle', async ({ page }) => {
        const btnNote = page.locator('#btn-note');
        const noteModal = page.locator('#modal-note');
        await expect.poll(async () => {
            if (!await noteModal.isVisible()) {
                await btnNote.click().catch(() => {});
            }
            return await noteModal.isVisible();
        }, { timeout: 10000 }).toBe(true);

        const resizerB = noteModal.locator('.modal-resize-handle.resizer-b');
        await expect(resizerB).toBeAttached();

        const zIndex = await resizerB.evaluate(el => window.getComputedStyle(el).zIndex);
        expect(parseInt(zIndex, 10)).toBeGreaterThanOrEqual(1000);

        const cursor = await resizerB.evaluate(el => window.getComputedStyle(el).cursor);
        expect(cursor).toMatch(/s-resize|ns-resize/);
    });

    test('Fix 5: Quick Note bottom line typing is rock-solid without any vertical jitter or DOM collapse', async ({ page }) => {
        const btnNote = page.locator('#btn-note');
        const noteModal = page.locator('#modal-note');
        await expect.poll(async () => {
            if (!await noteModal.isVisible()) {
                await btnNote.click().catch(() => {});
            }
            return await noteModal.isVisible();
        }, { timeout: 10000 }).toBe(true);

        // 设置含有 2 张图片的富内容 (与 2026-10-23 09-46-10.md 结构完全一致)
        await page.evaluate(() => {
            const cm = window.easyMDE.codemirror;
            const content = [
                '1. 第一行问题说明',
                '![图片1](/static/uploads/notes/test1.png)',
                '2. 第二行问题说明',
                '3. 第三行问题说明',
                '![图片2](/static/uploads/notes/test2.png)',
                '4. 第四行问题说明',
                '5. 当前正在编辑的最底下一行文本'
            ].join('\n');
            cm.setValue(content);
            window.renderEditorWidgets(cm, true);
        });

        await page.waitForTimeout(300);

        // 验证初始状态下 2 个图片 widget 成功渲染
        const initialMarks = await page.evaluate(() => {
            return window.easyMDE.codemirror.getAllMarks().filter(m => m._isCustomNoteWidget).length;
        });
        expect(initialMarks).toBe(2);

        // 定位到最底下一行行末
        await page.evaluate(() => {
            const cm = window.easyMDE.codemirror;
            const lastLine = cm.lineCount() - 1;
            const lineLen = cm.getLine(lastLine).length;
            cm.focus();
            cm.setCursor({ line: lastLine, ch: lineLen });
        });

        await page.waitForTimeout(200);

        // 连续输入 15 个字符，记录光标坐标与 markers 存活状态
        const cursorYList = [];
        for (let i = 0; i < 15; i++) {
            await page.keyboard.type('X', { delay: 60 });
            const info = await page.evaluate(() => {
                const cm = window.easyMDE.codemirror;
                const coords = cm.cursorCoords(true, 'window');
                const marks = cm.getAllMarks().filter(m => m._isCustomNoteWidget).length;
                return { top: Math.round(coords.top), marks };
            });
            expect(info.marks).toBe(2); // Diff-and-Patch: widgets 始终存活，绝不被全量 clear 与塌陷！
            cursorYList.push(info.top);
        }

        // 光标 Y 坐标在输入期间必须完全平稳，最大与最小差值严格 <= 2px (完全零跳变)
        const minY = Math.min(...cursorYList);
        const maxY = Math.max(...cursorYList);
        expect(maxY - minY).toBeLessThanOrEqual(2);
    });

});
