const { test, expect } = require('@playwright/test');

test.describe('0930 Issues Verification', () => {
    test.beforeEach(async ({ page }) => {
        // 打开主页
        await page.goto('/');
        await page.waitForLoadState('domcontentloaded');
    });

    test('Issue 4: 权限流转蓝图右上角应无 6 层权限体系 Badge', async ({ page }) => {
        const badge = page.locator('#pb-view-controls .api-count-badge:has-text("6 层权限体系")');
        await expect(badge).toHaveCount(0);
    });

    test('Issue 3 & 10: 权限流转蓝图目标主体输入框无 Emoji 且包含复制按钮', async ({ page }) => {
        // 目标主体 Label 文本不含 🎯
        const label = page.locator('#pb-user-principal-card label');
        const labelText = await label.textContent();
        expect(labelText || '').not.toContain('🎯');

        // 下拉框内包含复制按钮
        const copyBtn = page.locator('#pb-user-copy-btn');
        await expect(copyBtn).toHaveCount(1);
    });

    test('Issue 5: AI Assistant Header 包含关闭按钮且支持 ESC 快捷键收起', async ({ page }) => {
        // Header 内有关闭按钮
        const closeBtn = page.locator('#ai-chat-header .close-btn');
        await expect(closeBtn).toHaveCount(1);

        // 点击悬浮球展开 AI 窗口
        const fab = page.locator('#ai-chat-fab');
        await fab.click();
        const win = page.locator('#ai-chat-window');
        await expect(win).toHaveCSS('opacity', '1');

        // 按 ESC 键收起
        await page.keyboard.press('Escape');
        await expect(win).toHaveCSS('opacity', '0');
    });

    test('Issue 1: Quick note 新建笔记时占位符为当前日期时间', async ({ page }) => {
        // 打开 Quick note 弹窗
        await page.evaluate(() => {
            if (window.openNoteModal) window.openNoteModal();
            if (window.createNewNote) window.createNewNote();
        });

        const fnInput = page.locator('#note-filename');
        const placeholder = await fnInput.getAttribute('placeholder');
        expect(placeholder).not.toBeNull();
        expect(placeholder).toMatch(/^\d{4}-\d{2}-\d{2}\s\d{2}:\d{2}:\d{2}$/);
    });

    test('Issue 6 & 7: Quick Note 列表渲染时间规范为 24 小时制且无 Emoji', async ({ page }) => {
        // 验证 formatNoteDateTime 函数格式与无 Emoji
        const formatted = await page.evaluate(() => {
            const ts = 1790749998; // 2026-09-30 14:33:18
            return window.formatNoteDateTime ? window.formatNoteDateTime(ts) : null;
        });
        expect(formatted).not.toBeNull();
        expect(formatted).toMatch(/^\d{4}-\d{2}-\d{2}\s\d{2}:\d{2}:\d{2}$/);
        // 不包含 12 小时制标识或 Emoji
        expect(formatted).not.toContain('🕒');
        expect(formatted).not.toContain('🌱');
        expect(formatted).not.toContain('下午');
        expect(formatted).not.toContain('AM');
        expect(formatted).not.toContain('PM');
    });
});
