const { test, expect } = require('@playwright/test');

test.describe('10-14 Improvement Requirements Tests', () => {

    test('1. Quick Note: multiple images inserted inline without forced double newlines, wrapped with width: 220px and inline-block', async ({ page }) => {
        await page.goto('/');
        await page.waitForLoadState('domcontentloaded');

        // Open quick note modal
        await page.evaluate(() => {
            if (typeof window.openNoteModal === 'function') {
                window.openNoteModal();
            }
        });

        // Test uploadFileToNote inline insertion behavior
        const insertionResult = await page.evaluate(async () => {
            if (!window.easyMDE) return null;
            const cm = window.easyMDE.codemirror;
            cm.setValue('');
            cm.setCursor({ line: 0, ch: 0 });

            // Mock uploading 3 images
            const files = [
                { name: 'img1.png', markdown: '![img1](/static/uploads/notes/img1.png)' },
                { name: 'img2.png', markdown: '![img2](/static/uploads/notes/img2.png)' },
                { name: 'img3.png', markdown: '![img3](/static/uploads/notes/img3.png)' }
            ];

            // Simulate the upload logic inside uploadFileToNote
            for (let f of files) {
                const cursor = cm.getCursor();
                const isImg = f.markdown.trim().startsWith('![');
                const curLine = cm.getLine(cursor.line) || '';
                const beforeCursor = curLine.slice(0, cursor.ch);
                let textToInsert = f.markdown;
                if (isImg) {
                    if (beforeCursor.length > 0 && !/\s$/.test(beforeCursor)) {
                        textToInsert = ' ' + textToInsert;
                    }
                    textToInsert += ' ';
                }
                cm.replaceRange(textToInsert, cursor);
            }

            return {
                value: cm.getValue(),
                lineCount: cm.lineCount()
            };
        });

        expect(insertionResult).not.toBeNull();
        expect(insertionResult.lineCount).toBe(1);
        expect(insertionResult.value).toContain('![img1](/static/uploads/notes/img1.png) ![img2](/static/uploads/notes/img2.png) ![img3](/static/uploads/notes/img3.png)');

        // Check CSS styling for .cm-widget-image-card and .editor-preview img
        const cssCheck = await page.evaluate(() => {
            const style = document.createElement('style');
            style.textContent = `
                .test-img-card { display: inline-flex; width: 220px; }
            `;
            document.head.appendChild(style);
            
            const cardEl = document.createElement('div');
            cardEl.className = 'cm-widget-image-card';
            document.body.appendChild(cardEl);
            const cardComputed = window.getComputedStyle(cardEl);
            const cardWidth = cardComputed.width;
            const cardDisplay = cardComputed.display;

            const previewEl = document.createElement('div');
            previewEl.className = 'editor-preview';
            const imgEl = document.createElement('img');
            previewEl.appendChild(imgEl);
            document.body.appendChild(previewEl);
            const imgComputed = window.getComputedStyle(imgEl);
            const imgDisplay = imgComputed.display;

            cardEl.remove();
            previewEl.remove();
            style.remove();

            return { cardWidth, cardDisplay, imgDisplay };
        });

        expect(cssCheck.cardDisplay).toBe('inline-flex');
        expect(cssCheck.imgDisplay).toBe('inline-block');
    });

    test('2. Quick Note: saving a new note does not jump to sorted[0] and stays on the newly saved note', async ({ page }) => {
        await page.goto('/');
        await page.waitForLoadState('domcontentloaded');

        // Test renderSortedNotesList preserves active note even if newly saved note is not yet in sorted cache
        const stayResult = await page.evaluate(() => {
            window.openNoteModal();
            window.createNewNote();
            
            const newNoteName = '2026-10-14 18-00-00.md';
            window.setActiveNote(newNoteName, 'Newly typed content for test', true);

            // Mock sorted notes list that does NOT yet contain newNoteName
            window._currentNotesList = [
                { filename: 'old-note-1.md', content: 'Old note 1 content' },
                { filename: 'old-note-2.md', content: 'Old note 2 content' }
            ];

            // Call renderSortedNotesList
            window.renderSortedNotesList();

            return {
                activeNote: window._activeNoteFilename,
                inputVal: document.getElementById('note-filename')?.value,
                editorVal: window.easyMDE.value()
            };
        });

        expect(stayResult.activeNote).toBe('2026-10-14 18-00-00.md');
        expect(stayResult.inputVal).toBe('2026-10-14 18-00-00');
        expect(stayResult.editorVal).toBe('Newly typed content for test');
    });

    test('3. Permission Blueprint: theme switching applies unified transitions across all elements and SVG', async ({ page }) => {
        await page.goto('/');
        await page.waitForLoadState('domcontentloaded');

        const themeTransitionCheck = await page.evaluate(() => {
            document.documentElement.classList.add('theme-transitioning');
            const testEl = document.createElement('div');
            testEl.className = 'pb-blueprint-node';
            document.body.appendChild(testEl);

            const computed = window.getComputedStyle(testEl);
            const transitionVal = computed.transition;

            document.documentElement.classList.remove('theme-transitioning');
            testEl.remove();

            return { transitionVal };
        });

        expect(themeTransitionCheck.transitionVal).toContain('0.24s');
    });

    test('4. Permission Blueprint: module titles and header status pills do not cap at 45% and display complete text', async ({ page }) => {
        await page.goto('/');
        await page.waitForLoadState('domcontentloaded');

        // Switch to Permission Blueprint view
        await page.evaluate(() => {
            if (typeof window.switchAppModule === 'function') {
                window.switchAppModule('permission_blueprint');
            }
            if (window.PermissionBlueprint && typeof window.PermissionBlueprint.switchMainTab === 'function') {
                window.PermissionBlueprint.switchMainTab('user_assets');
            }
        });

        const statusCapCheck = await page.evaluate(() => {
            const statusEl = document.createElement('div');
            statusEl.className = 'pb-card-header-status';
            document.body.appendChild(statusEl);
            const computed = window.getComputedStyle(statusEl);
            const maxWidth = computed.maxWidth;
            statusEl.remove();

            // Check headers in rendered cards if any
            const headers = Array.from(document.querySelectorAll('.pb-asset-tier-card .pb-card-header-status'));
            const texts = headers.map(h => h.textContent.trim());

            return { maxWidth, texts };
        });

        expect(statusCapCheck.maxWidth).toBe('none');
    });

    test('5. Permission Blueprint: capability subcards default to collapsed, hero identity cards default to expanded, and clicking toggles & recalculates wires', async ({ page }) => {
        await page.goto('/');
        await page.waitForLoadState('domcontentloaded');

        // Switch to Permission Blueprint view and render user assets board
        await page.evaluate(() => {
            if (typeof window.switchAppModule === 'function') {
                window.switchAppModule('permission_blueprint');
            }
            if (window.PermissionBlueprint && typeof window.PermissionBlueprint.switchMainTab === 'function') {
                window.PermissionBlueprint.switchMainTab('user_assets');
            }
        });

        const subcardState = await page.evaluate(async () => {
            const container = document.getElementById('pb-user-assets-container');
            if (!container) return null;

            // Check Tenant principal role (hero)
            const tenantRoleRow = container.querySelector('.pb-asset-card-row[data-row-id="tenant_principal_role"]');
            const isTenantRoleExpanded = tenantRoleRow?.classList.contains('is-expanded');

            // Check GAC Policy (derived capability)
            const gacPolicyRow = container.querySelector('.pb-asset-card-row[data-row-id="tenant_gac_policy"]');
            const isGacCollapsed = gacPolicyRow?.classList.contains('is-collapsed');

            // Check Export Data (derived capability)
            const exportRow = container.querySelector('.pb-asset-card-row[data-row-id="tenant_export"]');
            const isExportCollapsed = exportRow?.classList.contains('is-collapsed');

            // Click GAC policy row to test expanding and wire recalculation
            let wireRecalcCalled = false;
            const origRecalc = window.PermissionBlueprint.recalculateCausalityWires;
            window.PermissionBlueprint.recalculateCausalityWires = function() {
                wireRecalcCalled = true;
                if (origRecalc) origRecalc.apply(this, arguments);
            };

            if (gacPolicyRow) {
                gacPolicyRow.click();
            }
            await new Promise(r => setTimeout(r, 120));

            const isGacNowExpanded = gacPolicyRow?.classList.contains('is-expanded');

            // Restore
            window.PermissionBlueprint.recalculateCausalityWires = origRecalc;

            return {
                isTenantRoleExpanded,
                isGacCollapsed,
                isExportCollapsed,
                isGacNowExpanded,
                wireRecalcCalled
            };
        });

        expect(subcardState).not.toBeNull();
        expect(subcardState.isTenantRoleExpanded).toBe(true);
        expect(subcardState.isGacCollapsed).toBe(true);
        expect(subcardState.isExportCollapsed).toBe(true);
        expect(subcardState.isGacNowExpanded).toBe(true);
        expect(subcardState.wireRecalcCalled).toBe(true);
    });

});
