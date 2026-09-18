const { test, expect } = require('@playwright/test');

test.describe('0918 Improvement v2 Requirements Verification', () => {

  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 850 });
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
  });

  test('Requirement 4: Quick Note modal z-index is set to 35000 above all functional areas', async ({ page }) => {
    // Open quick note modal
    await page.evaluate(() => {
      if (window.openNoteModal) window.openNoteModal();
    });

    const noteModal = page.locator('#modal-note');
    await expect(noteModal).toBeVisible();

    const zIndex = await noteModal.evaluate(el => window.getComputedStyle(el).zIndex);
    expect(zIndex).toBe('35000');

    const contentZIndex = await page.locator('#modal-note .modal-content').evaluate(el => window.getComputedStyle(el).zIndex);
    expect(contentZIndex).toBe('35001');
  });

  test('Requirement 6: Quick Note editor has single scrollbar without triple scrollbar bug', async ({ page }) => {
    await page.evaluate(() => {
      if (window.openNoteModal) window.openNoteModal();
    });

    const cmWrapper = page.locator('.note-editor-wrapper .CodeMirror');
    await expect(cmWrapper).toBeVisible();

    const cmOverflowY = await cmWrapper.evaluate(el => window.getComputedStyle(el).overflowY);
    expect(cmOverflowY).toBe('hidden');

    const cmScroll = page.locator('.note-editor-wrapper .CodeMirror-scroll');
    const scrollOverflowY = await cmScroll.evaluate(el => window.getComputedStyle(el).overflowY);
    expect(['auto', 'scroll']).toContain(scrollOverflowY);
  });

  test('Requirement 7: Quick Note action buttons (Upload, Insert API, New, Save) are pure icons with tooltips', async ({ page }) => {
    await page.evaluate(() => {
      if (window.openNoteModal) window.openNoteModal();
    });

    const buttonIds = ['btn-upload-file', 'btn-insert-api', 'btn-new-note', 'btn-save-note'];
    for (const id of buttonIds) {
      const btn = page.locator(`#${id}`);
      await expect(btn).toBeVisible();

      // Check title tooltip exists
      const title = await btn.getAttribute('title');
      expect(title).toBeTruthy();
      expect(title.length).toBeGreaterThan(0);

      // Check SVG icon exists
      const svg = btn.locator('svg');
      await expect(svg).toBeAttached();

      // Check no text labels exist
      const innerText = await btn.evaluate(el => {
        const clone = el.cloneNode(true);
        clone.querySelectorAll('svg').forEach(s => s.remove());
        return clone.textContent.trim();
      });
      expect(innerText).toBe('');
    }
  });

  test('Requirement 5: Quick Note search box and sort button are height-aligned (34px) with multi-option dropdown menu', async ({ page }) => {
    await page.evaluate(() => {
      if (window.openNoteModal) window.openNoteModal();
    });

    const searchInput = page.locator('#note-search');
    const sortBtn = page.locator('#note-sort-btn');

    await expect(searchInput).toBeVisible();
    await expect(sortBtn).toBeVisible();

    // Height alignment test
    const searchBox = await searchInput.boundingBox();
    const sortBox = await sortBtn.boundingBox();
    expect(Math.round(searchBox.height)).toBe(34);
    expect(Math.round(sortBox.height)).toBe(34);

    // Dropdown menu test
    const sortMenu = page.locator('#note-sort-menu');
    await expect(sortMenu).toBeHidden();

    // Click sort button to toggle menu
    await sortBtn.click();
    await expect(sortMenu).toBeVisible();

    // Verify all 6 sort options exist
    const items = sortMenu.locator('.note-sort-item');
    await expect(items).toHaveCount(6);

    // Verify active checkmark
    const checkmark = sortMenu.locator('.note-sort-check');
    await expect(checkmark).toHaveCount(1);

    // Click outside to dismiss (e.g. search input)
    await searchInput.click();
    await expect(sortMenu).toBeHidden();
  });

  test('Requirement 3: GUM Deep Audit checkbox row is removed and deep audit is default', async ({ page }) => {
    const deepAuditCheckbox = page.locator('#gum-deep-audit-mode');
    await expect(deepAuditCheckbox).toHaveCount(0);
  });

  test('Requirement 1 & 2: Universal Modal visible fields has 6-dot drag handles, no up/down arrows, and remembers preferences', async ({ page }) => {
    // Invoke Universal Data Modal via evaluate
    await page.evaluate(() => {
      localStorage.removeItem('pbi_grid_pref_test_matrix');
      window.showUniversalDataModal({
        title: 'Test Matrix',
        storageKey: 'pbi_grid_pref_test_matrix',
        columns: ['ColA', 'ColB', 'ColC'],
        displayNames: ['Column Alpha', 'Column Beta', 'Column Gamma'],
        data: [
          { ColA: '1', ColB: '2', ColC: '3' },
          { ColA: '4', ColB: '5', ColC: '6' }
        ]
      });
    });

    const modalOverlay = page.locator('#universal-modal-overlay');
    await expect(modalOverlay).toBeVisible();

    // Open visible columns dropdown
    const colDropdownBtn = modalOverlay.locator('button:has-text("Select Columns")');
    await expect(colDropdownBtn).toBeVisible();
    await colDropdownBtn.click();

    // Verify 6-dot drag grip handle exists on items
    const grips = modalOverlay.locator('.uni-col-drag-grip');
    await expect(grips).toHaveCount(3);

    // Verify up/down arrow buttons are completely removed
    const upDownBtns = modalOverlay.locator('button:has-text("▲"), button:has-text("▼")');
    await expect(upDownBtns).toHaveCount(0);

    // Verify freeze pin buttons exist
    const pinBtns = modalOverlay.locator('button:has-text("📌")');
    await expect(pinBtns).toHaveCount(3);

    // Click freeze pin on first column and verify localStorage persistence
    await pinBtns.first().click();
    const saved = await page.evaluate(() => {
      return JSON.parse(localStorage.getItem('pbi_grid_pref_test_matrix') || '{}');
    });
    expect(saved.frozenCols).toContain('ColA');
  });

});
