const { test, expect } = require('@playwright/test');

test.describe('0918 Improvement v3 Requirements Verification', () => {

  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 850 });
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
  });

  test('Requirement 2: Quick Note modal action buttons (Sort, New, Save) have clearly visible SVG icons with width/height > 0', async ({ page }) => {
    await page.evaluate(() => {
      if (window.openNoteModal) window.openNoteModal();
    });

    const noteModal = page.locator('#modal-note');
    await expect(noteModal).toBeVisible();

    const targetButtons = ['note-sort-btn', 'btn-new-note', 'btn-save-note', 'btn-upload-file', 'btn-insert-api'];
    for (const btnId of targetButtons) {
      const btn = page.locator(`#${btnId}`);
      await expect(btn).toBeVisible();

      // Check SVG inside button
      const svg = btn.locator('svg');
      await expect(svg).toBeVisible();

      const box = await svg.boundingBox();
      expect(box).not.toBeNull();
      expect(box.width).toBeGreaterThanOrEqual(12);
      expect(box.height).toBeGreaterThanOrEqual(12);

      // Verify button padding did not collapse the SVG
      const svgDims = await svg.evaluate(el => {
        return {
          clientWidth: el.clientWidth,
          clientHeight: el.clientHeight,
          getBoundingClientRect: el.getBoundingClientRect().width
        };
      });
      expect(svgDims.getBoundingClientRect).toBeGreaterThanOrEqual(12);
    }
  });

  test('Requirement 3: Quick Note editor has no duplicate CodeMirror-vscrollbar (CodeMirror-vscrollbar is display: none)', async ({ page }) => {
    await page.evaluate(() => {
      if (window.openNoteModal) window.openNoteModal();
    });

    const vScrollbar = page.locator('.note-editor-wrapper .CodeMirror-vscrollbar');
    const isVScrollbarHidden = await vScrollbar.evaluate(el => {
      const cs = window.getComputedStyle(el);
      return cs.display === 'none' || cs.visibility === 'hidden' || el.offsetWidth === 0;
    });
    expect(isVScrollbarHidden).toBe(true);

    // Ensure native CodeMirror-scroll container handles scrolling
    const cmScroll = page.locator('.note-editor-wrapper .CodeMirror-scroll');
    const scrollDisplay = await cmScroll.evaluate(el => window.getComputedStyle(el).display);
    expect(scrollDisplay).not.toBe('none');
  });

  test('Requirement 4: Universal Modal Visible Fields list supports handleDragAutoScroll', async ({ page }) => {
    // Open Universal Modal with 25 columns to make the dropdown scrollable
    await page.evaluate(() => {
      const sampleRow = {};
      for (let i = 1; i <= 25; i++) {
        sampleRow[`Field_${i}`] = `Val_${i}`;
      }
      if (window.showUniversalDataModal) {
        window.showUniversalDataModal({
          title: 'Test Auto Scroll Grid',
          data: [sampleRow]
        });
      }
    });

    const modal = page.locator('#universal-modal-overlay');
    await expect(modal).toBeVisible();

    // Click the Visible Fields dropdown button
    const dropdownBtn = page.locator('#um-col-dropdown-btn');
    await expect(dropdownBtn).toBeVisible();
    await dropdownBtn.click();

    const dropdownList = page.locator('#um-column-dropdown-list');
    await expect(dropdownList).toBeVisible();

    // Verify auto scroll down and up
    const scrollTestResult = await page.evaluate(() => {
      const list = document.getElementById('um-column-dropdown-list');
      if (!list || typeof list._handleDragAutoScroll !== 'function') {
        return { ok: false, reason: 'Method or element not found' };
      }
      list.scrollTop = 0;
      const rect = list.getBoundingClientRect();
      // Simulate drag near bottom boundary (e.clientY close to rect.bottom)
      list._handleDragAutoScroll(rect.bottom - 5);
      const scrolledDown = list.scrollTop > 0;

      // Simulate drag near top boundary
      const currentScroll = list.scrollTop;
      list._handleDragAutoScroll(rect.top + 5);
      const scrolledUp = list.scrollTop < currentScroll;

      return {
        ok: true,
        scrolledDown,
        scrolledUp,
        scrollTopAfterDown: currentScroll,
        scrollTopAfterUp: list.scrollTop
      };
    });

    expect(scrollTestResult.ok).toBe(true);
    expect(scrollTestResult.scrolledDown).toBe(true);
    expect(scrollTestResult.scrolledUp).toBe(true);
  });

  test('Requirement 5: Quick Note button is moved to #global-topbar and placed before #gtb-btn-refresh', async ({ page }) => {
    const noteBtn = page.locator('#global-topbar #btn-note');
    await expect(noteBtn).toBeVisible();

    // Ensure it is no longer inside #context-header
    const oldContextNoteBtn = page.locator('#context-header #btn-note');
    await expect(oldContextNoteBtn).toHaveCount(0);

    // Verify its position relative to #gtb-btn-refresh
    const isBeforeRefresh = await page.evaluate(() => {
      const btnNote = document.getElementById('btn-note');
      const btnRefresh = document.getElementById('gtb-btn-refresh');
      if (!btnNote || !btnRefresh) return false;
      return (btnNote.compareDocumentPosition(btnRefresh) & Node.DOCUMENT_POSITION_FOLLOWING) !== 0;
    });
    expect(isBeforeRefresh).toBe(true);
  });

  test('Requirement 6: Quick Note search input has a clear button with dynamic visibility and clear action', async ({ page }) => {
    await page.evaluate(() => {
      if (window.openNoteModal) window.openNoteModal();
    });

    const searchInput = page.locator('#note-search');
    const clearBtn = page.locator('#btn-clear-note-search');

    await expect(searchInput).toBeVisible();
    await expect(clearBtn).toBeAttached();

    // Initially clear button should be hidden (display: none)
    await expect(clearBtn).toBeHidden();

    // Type something
    await searchInput.fill('test keyword');
    await searchInput.dispatchEvent('input');

    // Clear button should become visible
    await expect(clearBtn).toBeVisible();

    // Click clear button
    await clearBtn.click();

    // Input should be cleared and clear button hidden
    expect(await searchInput.inputValue()).toBe('');
    await expect(clearBtn).toBeHidden();
  });

  test('Requirement 7: Quick Note filename auto-sync, active note highlighting, and compact header space', async ({ page }) => {
    // 模拟笔记数据并打开弹窗
    await page.evaluate(() => {
      window._currentNotesList = [
        { filename: '20260918_200000.md', content: '# Welcome Note\nHello world', mtime: 1726660000, size: 28 },
        { filename: 'architecture_design.md', content: '## System Architecture\nSpecs', mtime: 1726650000, size: 35 }
      ];
      localStorage.removeItem('pbi_active_note_filename');
      if (window.openNoteModal) window.openNoteModal();
      if (window.renderSortedNotesList) window.renderSortedNotesList();
    });

    const noteModal = page.locator('#modal-note');
    await expect(noteModal).toBeVisible();

    // 1. 验证上方标题栏紧凑化 (消除空旷空白区域)
    const modalHeader = noteModal.locator('.modal-header');
    await expect(modalHeader).toBeVisible();
    const headerHeight = await modalHeader.evaluate(el => el.getBoundingClientRect().height);
    expect(headerHeight).toBeLessThanOrEqual(40); // 紧凑高度，消除了多余空白

    // 2. 验证多余的大 label 已移除
    const searchLabels = noteModal.locator('.note-left-panel label');
    expect(await searchLabels.count()).toBe(0);

    // 3. 验证当前选中的笔记具备高亮态，并且 filename 自动填入
    const filenameInput = page.locator('#note-filename');
    await expect(filenameInput).toBeVisible();
    // 默认应自动关联到第一篇笔记
    expect(await filenameInput.inputValue()).toBe('20260918_200000.md');

    // 第一项应具备 .active 类与高亮边框
    const items = noteModal.locator('#note-history-list .note-history-item');
    await expect(items).toHaveCount(2);
    await expect(items.nth(0)).toHaveClass(/active/);
    await expect(items.nth(1)).not.toHaveClass(/active/);

    // 4. 点击第二项，验证高亮切换且 filename 与内容同步变更
    await items.nth(1).click();
    await expect(items.nth(0)).not.toHaveClass(/active/);
    await expect(items.nth(1)).toHaveClass(/active/);
    expect(await filenameInput.inputValue()).toBe('architecture_design.md');

    // 5. 点击新建笔记，验证高亮清除且 filename 为空
    const newBtn = page.locator('#btn-new-note');
    await newBtn.click();
    expect(await filenameInput.inputValue()).toBe('');
    await expect(items.nth(0)).not.toHaveClass(/active/);
    await expect(items.nth(1)).not.toHaveClass(/active/);
  });

});
