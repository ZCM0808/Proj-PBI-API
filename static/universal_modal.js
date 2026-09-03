/**
 * Universal Data Modal Component
 * Dynamically generates a premium data grid modal with search, column selection, sorting, and export.
 */
window.showUniversalDataModal = function(options) {
    // Inject hardware-accelerated CSS hover rules & comfortable custom scrollbars globally once
    if (!document.getElementById('uni-modal-style')) {
        const style = document.createElement('style');
        style.id = 'uni-modal-style';
        style.textContent = `
            .uni-modal-table tbody tr { transition: background 0.2s; }
            .uni-modal-table tbody tr:hover { background: var(--overlay-10) !important; }
            
            /* Enhanced Comfortable & High-Contrast Scrollbars for Modal Body */
            #universal-modal-body::-webkit-scrollbar {
                width: 12px;
                height: 14px;
            }
            #universal-modal-body::-webkit-scrollbar-track {
                background: var(--overlay-5, rgba(255, 255, 255, 0.04));
                border-radius: 8px;
                margin: 2px;
            }
            #universal-modal-body::-webkit-scrollbar-thumb {
                background: var(--overlay-30, rgba(255, 255, 255, 0.35));
                border-radius: 8px;
                border: 3px solid transparent;
                background-clip: padding-box;
                min-width: 40px;
                min-height: 40px;
                transition: background 0.2s ease, border-width 0.2s ease;
            }
            #universal-modal-body::-webkit-scrollbar-thumb:hover {
                background: var(--accent, #6366f1);
                border: 2px solid transparent;
                background-clip: padding-box;
            }
            #universal-modal-body::-webkit-scrollbar-thumb:active {
                background: var(--accent-hover, #4f46e5);
                border: 1px solid transparent;
                background-clip: padding-box;
            }
            #universal-modal-body {
                scrollbar-width: auto;
                scrollbar-color: var(--overlay-30, rgba(255, 255, 255, 0.35)) var(--overlay-5, rgba(255, 255, 255, 0.04));
            }
        `;
        document.head.appendChild(style);
    }

    const title = options.title || 'Data View';
    const data = options.data || [];
    const columns = options.columns || (data.length > 0 ? Object.keys(data[0]) : []);
    const displayNames = options.displayNames || columns;
    const enableSearch = options.enableSearch !== false;
    const enableColumnFilter = options.enableColumnFilter !== false;

    // Storage Key for Settings Persistence
    const storageKey = options.storageKey || `pbi_grid_pref_${title.toLowerCase().replace(/[^a-z0-9_]/g, '_')}`;
    let savedPrefs = {};
    try {
        savedPrefs = JSON.parse(localStorage.getItem(storageKey) || '{}');
    } catch(e) {}

    // State (Hydrated from persistent storage)
    let selectedCols = new Set(columns);
    if (savedPrefs.selectedCols && Array.isArray(savedPrefs.selectedCols) && savedPrefs.selectedCols.length > 0) {
        // Intersect with valid current columns
        const validSaved = savedPrefs.selectedCols.filter(c => columns.includes(c));
        if (validSaved.length > 0) selectedCols = new Set(validSaved);
    }

    let searchText = "";
    let sortState = Array.isArray(savedPrefs.sortState) ? savedPrefs.sortState : []; // Array of {index, asc}
    const colWidths = (savedPrefs.colWidths && typeof savedPrefs.colWidths === 'object') ? savedPrefs.colWidths : {};

    const savePreferences = () => {
        try {
            localStorage.setItem(storageKey, JSON.stringify({
                selectedCols: Array.from(selectedCols),
                sortState: sortState,
                colWidths: colWidths
            }));
        } catch(e) {}
    };

    // Support unique modal IDs for stacking
    const modalId = options.modalId || 'universal-modal-overlay';

    // Remove existing with SAME ID if any
    let existing = document.getElementById(modalId);
    if (existing) existing.remove();

    // Create overlay
    const overlay = document.createElement('div');
    overlay.id = modalId;
    overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.55);display:flex;align-items:center;justify-content:center;z-index:20000;opacity:0;transition:opacity 0.25s;';
    
    // Panel
    const panel = document.createElement('div');
    // Removed glass-panel to prevent expensive backdrop-filter rendering during modal animation
    panel.style.cssText = [
        'position:relative','background:var(--bg-color)','border:1px solid var(--panel-border)',
        'border-radius:10px','box-shadow:0 24px 80px rgba(0,0,0,0.5)',
        'width:min(94vw, 1200px)','max-height:min(88vh, 900px)','max-width:1200px','min-width:min(100%, 300px)',
        'display:flex','flex-direction:column','overflow:hidden',
        'transform:scale(0.96)','transition:transform 0.25s cubic-bezier(0.175, 0.885, 0.32, 1.275)'
    ].join(';');

    // Header
    const hdr = document.createElement('div');
hdr.className = 'modal-header';
    hdr.style.cssText = 'display:flex;align-items:center;justify-content:space-between;padding:12px 16px;border-bottom:1px solid var(--overlay-10);cursor:move;user-select:none;flex-shrink:0;background:var(--bg-color);';
    
    const hdrTitle = document.createElement('span');
    hdrTitle.style.cssText = 'font-size:1.05rem;font-weight:bold;color:var(--text-primary);display:flex;align-items:center;gap:8px;';
    hdrTitle.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" stroke-width="2"><path d="M4 6h16M4 10h16M4 14h16M4 18h16"/></svg> 
        ${title} <span id="uni-modal-stats" style="color:var(--accent);font-weight:normal;font-size:0.8rem;margin-left:8px;"></span>`;

    const hdrActions = document.createElement('div');
    hdrActions.style.cssText = 'display:flex;align-items:center;gap:12px;';

    // Search Input
    let searchInput = null;
    if (enableSearch) {
        searchInput = document.createElement('input');
        searchInput.type = 'text';
        searchInput.className = 'wf-input';
        searchInput.placeholder = 'Search globally...';
        searchInput.style.cssText = 'width:200px;padding:4px 8px;min-height:unset;font-size:0.8rem;';
        searchInput.onkeyup = (e) => {
            searchText = e.target.value.toLowerCase();
            renderTable();
        };
        hdrActions.appendChild(searchInput);
    }

    // Custom Header Actions (e.g. Switch to Lineage DAG)
    if (options.headerActions && Array.isArray(options.headerActions)) {
        options.headerActions.forEach(act => {
            const btn = document.createElement('button');
            btn.type = 'button';
            btn.className = 'btn-wf-sm btn-wf-secondary';
            btn.innerHTML = act.label;
            btn.title = act.title || '';
            btn.style.cssText = 'padding:4px 10px;font-size:0.75rem;cursor:pointer;display:inline-flex;align-items:center;gap:5px;' + (act.style || '');
            btn.onclick = (e) => {
                if (act.onClick) act.onClick(e);
            };
            hdrActions.appendChild(btn);
        });
    }

    // Close Button
    const closeBtn = document.createElement('button');
    closeBtn.className = 'close-btn';
    closeBtn.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 6L6 18M6 6l12 12"/></svg>`;
    closeBtn.onclick = () => {
        overlay.style.opacity = '0';
        // Avoid animating transform on close to prevent lag with huge DOM trees
        panel.style.transition = 'opacity 0.25s ease';
        panel.style.opacity = '0';
        setTimeout(() => overlay.remove(), 250);
    };
    hdrActions.appendChild(closeBtn);

    hdr.appendChild(hdrTitle);
    hdr.appendChild(hdrActions);
    panel.appendChild(hdr);

    // Make Draggable
    if (window.makeDraggable) {
        window.makeDraggable(panel, hdr);
    }

    // Custom Border Resizers
    const addResizer = (cls, cursor, css) => {
        const r = document.createElement('div');
        r.className = cls;
        r.style.cssText = 'position:absolute;z-index:100;user-select:none;' + css;
        r.style.cursor = cursor;
        panel.appendChild(r);
        
        r.addEventListener('mousedown', (e) => {
            e.preventDefault();
            e.stopPropagation();
            
            // 核心修复：必须将 position 设为 fixed，因为 getBoundingClientRect() 返回的是视口绝对像素！
            // 原先保持 position: relative 时，设置 left: rect.left 会在当前已居中定位的基础上再次向右累加偏移，导致弹窗瞬间向右飞走！
            const rect = panel.getBoundingClientRect();
            panel.style.position = 'fixed';
            panel.style.margin = '0';
            panel.style.left = rect.left + 'px';
            panel.style.top = rect.top + 'px';
            panel.style.width = rect.width + 'px';
            panel.style.height = rect.height + 'px';
            panel.style.maxWidth = 'none';
            panel.style.maxHeight = 'none';
            panel.style.right = 'auto';
            panel.style.bottom = 'auto';
            panel.style.transform = 'none';
            panel.style.transition = 'none';
            panel.removeAttribute('data-translate-x');
            panel.removeAttribute('data-translate-y');
            
            document.body.style.cursor = cursor;
            document.body.style.userSelect = 'none';
            
            const startX = e.clientX;
            const startY = e.clientY;
            const startW = rect.width;
            const startH = rect.height;
            const startL = rect.left;
            const startT = rect.top;
            
            const onMouseMove = (me) => {
                const dx = me.clientX - startX;
                const dy = me.clientY - startY;
                
                // 水平右侧调整 (E / SE / NE)
                if (cls.includes('resizer-r') || cls.includes('resizer-br') || cls.includes('resizer-tr')) {
                    panel.style.width = Math.max(360, startW + dx) + 'px';
                }
                // 水平左侧调整 (W / SW / NW)
                if (cls.includes('resizer-l') || cls.includes('resizer-bl') || cls.includes('resizer-tl')) {
                    const newW = Math.max(360, startW - dx);
                    panel.style.width = newW + 'px';
                    panel.style.left = (startL + (startW - newW)) + 'px';
                }
                // 垂直底部调整 (S / SE / SW)
                if (cls.includes('resizer-b') || cls.includes('resizer-br') || cls.includes('resizer-bl')) {
                    panel.style.height = Math.max(220, startH + dy) + 'px';
                }
                // 垂直顶部调整 (N / NE / NW)
                if (cls.includes('resizer-t') || cls.includes('resizer-tr') || cls.includes('resizer-tl')) {
                    const newH = Math.max(220, startH - dy);
                    panel.style.height = newH + 'px';
                    panel.style.top = (startT + (startH - newH)) + 'px';
                }
            };
            
            const onMouseUp = () => {
                document.removeEventListener('mousemove', onMouseMove);
                document.removeEventListener('mouseup', onMouseUp);
                document.body.style.cursor = '';
                document.body.style.userSelect = '';
            };
            document.addEventListener('mousemove', onMouseMove);
            document.addEventListener('mouseup', onMouseUp);
        });
    };

    // 8 个方向完整缩放把手配置（覆盖四边与四角）
    addResizer('resizer-r', 'e-resize', 'right: -4px; top: 0; width: 8px; height: 100%;');
    addResizer('resizer-b', 's-resize', 'bottom: -4px; left: 0; height: 8px; width: 100%;');
    addResizer('resizer-l', 'w-resize', 'left: -4px; top: 0; width: 8px; height: 100%;');
    addResizer('resizer-t', 'n-resize', 'top: -4px; left: 0; height: 8px; width: 100%;');
    addResizer('resizer-br', 'se-resize', 'bottom: -4px; right: -4px; width: 14px; height: 14px; z-index: 102;');
    addResizer('resizer-bl', 'sw-resize', 'bottom: -4px; left: -4px; width: 14px; height: 14px; z-index: 102;');
    addResizer('resizer-tr', 'ne-resize', 'top: -4px; right: -4px; width: 14px; height: 14px; z-index: 102;');
    addResizer('resizer-tl', 'nw-resize', 'top: -4px; left: -4px; width: 14px; height: 14px; z-index: 102;');


    // Filter Bar (Column Selector & Copy Toolbar)
    let filterBar = null;
    let colDropdownBtn = null;
    let renderColItems = null;
    let selectedColForCopy = new Set(); // Multi-selected columns for copying
    let updateCopyToolbar = null;

    // Core copy columns function
    const copySelectedColumnsData = () => {
        const visibleData = getFilteredData();
        if (visibleData.length === 0) {
            if (window.showNotification) window.showNotification('⚠️ 当前无匹配数据可供复制', 'warning');
            return;
        }

        // If user explicitly selected columns, copy those; otherwise copy all visible columns
        const activeVisibleCols = columns.filter(c => selectedCols.has(c));
        const targetCols = selectedColForCopy.size > 0 
            ? activeVisibleCols.filter(c => selectedColForCopy.has(c))
            : activeVisibleCols;

        if (targetCols.length === 0) {
            if (window.showNotification) window.showNotification('⚠️ 请至少选择一列以供复制', 'warning');
            return;
        }

        // 1. Build Header Row with Column Display Names
        const headerRow = targetCols.map(c => displayNames[columns.indexOf(c)]).join('\t');
        const lines = [headerRow];

        // 2. Build Data Rows
        visibleData.forEach(row => {
            lines.push(targetCols.map(c => {
                const val = row[c];
                if (val === null || val === undefined) return '';
                if (typeof val === 'object') return JSON.stringify(val);
                return String(val);
            }).join('\t'));
        });

        const fullText = lines.join('\n');
        
        // 3. Write to Clipboard & Notify
        if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(fullText).then(() => {
                if (window.showNotification) {
                    window.showNotification(`✅ 成功复制 ${targetCols.length} 列数据（含列名，共 ${visibleData.length} 行）！可直接粘贴至 Excel`, 'success');
                }
            }).catch(() => {
                fallbackCopy(fullText, targetCols.length, visibleData.length);
            });
        } else {
            fallbackCopy(fullText, targetCols.length, visibleData.length);
        }
    };

    const fallbackCopy = (text, colCount, rowCount) => {
        const ta = document.createElement('textarea');
        ta.value = text;
        ta.style.position = 'fixed';
        ta.style.opacity = '0';
        document.body.appendChild(ta);
        ta.select();
        try {
            document.execCommand('copy');
            if (window.showNotification) {
                window.showNotification(`✅ 成功复制 ${colCount} 列数据（含列名，共 ${rowCount} 行）！可直接粘贴至 Excel`, 'success');
            }
        } catch (e) {
            if (window.showNotification) window.showNotification('❌ 复制失败: ' + e.message, 'error');
        }
        document.body.removeChild(ta);
    };

    if (enableColumnFilter && columns.length > 0) {
        filterBar = document.createElement('div');
        filterBar.style.cssText = 'padding:6px 16px;background:var(--overlay-5);border-bottom:1px solid var(--overlay-10);display:flex;align-items:center;justify-content:space-between;gap:10px;font-size:0.75rem;flex-shrink:0;position:relative;z-index:20;';
        
        // Left side: Visible columns selector
        const filterLeft = document.createElement('div');
        filterLeft.style.cssText = 'display:flex;align-items:center;gap:8px;';

        const filterLabel = document.createElement('span');
        filterLabel.style.cssText = 'font-weight:600;color:var(--text-secondary);';
        filterLabel.textContent = 'Visible Fields:';
        filterLeft.appendChild(filterLabel);

        const dropdownWrapper = document.createElement('div');
        dropdownWrapper.style.cssText = 'position:relative;display:inline-block;';

        colDropdownBtn = document.createElement('button');
        colDropdownBtn.className = 'wf-input';
        colDropdownBtn.style.cssText = 'padding:4px 10px;font-size:0.75rem;cursor:pointer;display:flex;align-items:center;gap:6px;background:var(--bg-color);';
        dropdownWrapper.appendChild(colDropdownBtn);

        const dropdownList = document.createElement('div');
        dropdownList.style.cssText = 'display:none;position:absolute;top:100%;left:0;margin-top:4px;background:var(--dropdown-bg, #1a1a24);border:1px solid var(--panel-border);border-radius:6px;box-shadow:0 8px 24px rgba(0,0,0,0.8);max-height:220px;overflow-y:auto;width:240px;padding:6px;z-index:3000;';
        
        const dropdownHeader = document.createElement('div');
        dropdownHeader.style.cssText = 'display:flex;justify-content:space-between;padding:4px 6px;border-bottom:1px solid var(--overlay-10);margin-bottom:4px;';
        dropdownHeader.innerHTML = `
            <span style="color:var(--accent);cursor:pointer;font-weight:bold;" id="uni-sel-all">Select All</span>
            <span style="color:var(--text-secondary);cursor:pointer;" id="uni-dsel-all">Deselect All</span>
        `;
        dropdownList.appendChild(dropdownHeader);

        const colItemsContainer = document.createElement('div');
        dropdownList.appendChild(colItemsContainer);
        dropdownWrapper.appendChild(dropdownList);
        filterLeft.appendChild(dropdownWrapper);
        filterBar.appendChild(filterLeft);

        // Right side: Copy Selected Columns Toolbar
        const filterRight = document.createElement('div');
        filterRight.style.cssText = 'display:flex;align-items:center;gap:8px;';

        const selectAllColsBtn = document.createElement('button');
        selectAllColsBtn.type = 'button';
        selectAllColsBtn.style.cssText = 'background:var(--overlay-10, rgba(255,255,255,0.06));border:1px solid var(--overlay-20, rgba(255,255,255,0.15));color:var(--text-primary);font-size:0.75rem;cursor:pointer;padding:4px 8px;border-radius:5px;transition:all 0.2s;font-weight:500;';
        selectAllColsBtn.textContent = '全选列';
        selectAllColsBtn.title = '选中所有可见列以供复制';
        selectAllColsBtn.onmouseover = () => { selectAllColsBtn.style.background = 'var(--overlay-20)'; selectAllColsBtn.style.borderColor = 'var(--accent)'; };
        selectAllColsBtn.onmouseout = () => { selectAllColsBtn.style.background = 'var(--overlay-10)'; selectAllColsBtn.style.borderColor = 'var(--overlay-20)'; };
        selectAllColsBtn.onclick = () => {
            const activeVisibleCols = columns.filter(c => selectedCols.has(c));
            selectedColForCopy = new Set(activeVisibleCols);
            updateCopyToolbar();
            renderTable();
        };
        filterRight.appendChild(selectAllColsBtn);

        const clearColsBtn = document.createElement('button');
        clearColsBtn.type = 'button';
        clearColsBtn.style.cssText = 'background:var(--overlay-10, rgba(255,255,255,0.06));border:1px solid var(--overlay-20, rgba(255,255,255,0.15));color:var(--text-secondary);font-size:0.75rem;cursor:pointer;padding:4px 8px;border-radius:5px;transition:all 0.2s;font-weight:500;';
        clearColsBtn.textContent = '清空选中';
        clearColsBtn.title = '取消当前所有已选列';
        clearColsBtn.onmouseover = () => { clearColsBtn.style.background = 'var(--overlay-20)'; clearColsBtn.style.color = 'var(--text-primary)'; };
        clearColsBtn.onmouseout = () => { clearColsBtn.style.background = 'var(--overlay-10)'; clearColsBtn.style.color = 'var(--text-secondary)'; };
        clearColsBtn.onclick = () => {
            selectedColForCopy.clear();
            updateCopyToolbar();
            renderTable();
        };
        filterRight.appendChild(clearColsBtn);

        const copyColsBtn = document.createElement('button');
        copyColsBtn.type = 'button';
        copyColsBtn.style.cssText = 'display:inline-flex;align-items:center;gap:6px;padding:5px 12px;font-size:0.8rem;cursor:pointer;background:#4f46e5;color:#ffffff;border:1px solid rgba(165,180,252,0.4);border-radius:6px;font-weight:600;transition:all 0.2s;box-shadow:0 2px 8px rgba(79,70,229,0.35);letter-spacing:0.2px;';
        copyColsBtn.title = '复制当前选中列（包含表头列名，支持快捷键 Ctrl+C）';
        copyColsBtn.onmouseover = () => { copyColsBtn.style.background = '#4338ca'; copyColsBtn.style.transform = 'translateY(-1px)'; copyColsBtn.style.boxShadow = '0 4px 14px rgba(79,70,229,0.5)'; };
        copyColsBtn.onmouseout = () => { copyColsBtn.style.background = '#4f46e5'; copyColsBtn.style.transform = 'none'; copyColsBtn.style.boxShadow = '0 2px 8px rgba(79,70,229,0.35)'; };
        copyColsBtn.onclick = copySelectedColumnsData;
        filterRight.appendChild(copyColsBtn);

        filterBar.appendChild(filterRight);
        panel.appendChild(filterBar);

        updateCopyToolbar = () => {
            const activeVisibleCols = columns.filter(c => selectedCols.has(c));
            const isExplicit = selectedColForCopy.size > 0;
            const count = isExplicit ? selectedColForCopy.size : activeVisibleCols.length;
            const scopeText = isExplicit ? `已选 ${count} 列` : `全表 ${count} 列`;
            copyColsBtn.innerHTML = `
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#ffffff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
                <span style="color:#ffffff;font-weight:600;">复制数据 (含列名)</span>
                <span style="background:rgba(255,255,255,0.22);color:#ffffff;padding:1px 7px;border-radius:10px;font-size:0.72rem;font-weight:600;margin:0 2px;">${scopeText}</span>
                <kbd style="background:rgba(0,0,0,0.35);color:#ffffff;padding:1px 5px;border-radius:4px;font-family:monospace;font-size:0.7rem;font-weight:500;border:1px solid rgba(255,255,255,0.25);">Ctrl+C</kbd>
            `;
        };

        dropdownHeader.querySelector('#uni-sel-all').onclick = () => {
            selectedCols = new Set(columns);
            savePreferences();
            renderColItems();
            updateCopyToolbar();
            renderTable();
        };
        dropdownHeader.querySelector('#uni-dsel-all').onclick = () => {
            selectedCols.clear();
            selectedColForCopy.clear();
            savePreferences();
            renderColItems();
            updateCopyToolbar();
            renderTable();
        };

        colDropdownBtn.onclick = (e) => {
            e.stopPropagation();
            dropdownList.style.display = dropdownList.style.display === 'block' ? 'none' : 'block';
        };
        document.addEventListener('click', (e) => {
            if (!dropdownWrapper.contains(e.target)) {
                dropdownList.style.display = 'none';
            }
        });

        renderColItems = () => {
            colDropdownBtn.innerHTML = `Select Columns (${selectedCols.size}/${columns.length}) <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 9l6 6 6-6"/></svg>`;
            colItemsContainer.innerHTML = '';
            columns.forEach((col, idx) => {
                const lbl = document.createElement('label');
                lbl.style.cssText = 'display:flex;align-items:center;gap:6px;padding:4px 6px;cursor:pointer;font-size:0.75rem;border-radius:4px;';
                lbl.onmouseover = () => lbl.style.background = 'var(--overlay-5)';
                lbl.onmouseout = () => lbl.style.background = 'transparent';
                
                const chk = document.createElement('input');
                chk.type = 'checkbox';
                chk.checked = selectedCols.has(col);
                chk.style.cursor = 'pointer';
                chk.onchange = (e) => {
                    if (e.target.checked) selectedCols.add(col);
                    else {
                        selectedCols.delete(col);
                        selectedColForCopy.delete(col);
                    }
                    savePreferences();
                    renderColItems();
                    updateCopyToolbar();
                    renderTable();
                };
                
                const span = document.createElement('span');
                span.style.cssText = 'overflow:hidden;text-overflow:ellipsis;white-space:nowrap;';
                span.title = displayNames[idx];
                span.textContent = displayNames[idx];
                
                lbl.appendChild(chk);
                lbl.appendChild(span);
                colItemsContainer.appendChild(lbl);
            });
        };
        renderColItems();
        updateCopyToolbar();
    }

    // Body
    const body = document.createElement('div');
    body.id = 'universal-modal-body';
    body.style.cssText = 'flex:1; min-height:0; overflow:auto; padding:0; position:relative; background:var(--bg-color);';
    
    const tableId = 'uni-modal-table-' + Math.random().toString(36).substr(2, 9);
    const table = document.createElement('table');
    table.id = tableId;
    table.className = 'data-table uni-modal-table';
    table.setAttribute('data-table-id', tableId);
    table.style.cssText = 'width: 100%; border-collapse: collapse; font-size: 0.82rem; text-align: left; table-layout: fixed;';
    
    const colgroup = document.createElement('colgroup');
    const thead = document.createElement('thead');
    thead.style.cssText = 'position: sticky; top: 0; background: var(--bg-color); z-index: 15; box-shadow: 0 1px 0 var(--panel-border);';
    
    const tbody = document.createElement('tbody');
    table.appendChild(colgroup);
    table.appendChild(thead);
    table.appendChild(tbody);
    body.appendChild(table);
    panel.appendChild(body);
    overlay.appendChild(panel);
    document.body.appendChild(overlay);

    const getFilteredData = () => {
        let filtered = data;
        if (searchText) {
            filtered = data.filter(row => {
                return columns.some(col => {
                    if (!selectedCols.has(col)) return false;
                    const val = row[col];
                    if (val === null || val === undefined) return false;
                    return val.toString().toLowerCase().includes(searchText);
                });
            });
        }
        if (sortState.length > 0) {
            filtered = [...filtered].sort((a, b) => {
                for (let s of sortState) {
                    const sortKey = columns[s.index];
                    let va = a[sortKey]; let vb = b[sortKey];
                    if (va === null || va === undefined) va = '';
                    if (vb === null || vb === undefined) vb = '';
                    
                    let diff = 0;
                    if (typeof va === 'number' && typeof vb === 'number') {
                        diff = va - vb;
                    } else {
                        const sa = va.toString().toLowerCase();
                        const sb = vb.toString().toLowerCase();
                        if (sa < sb) diff = -1;
                        else if (sa > sb) diff = 1;
                    }
                    if (diff !== 0) {
                        return s.asc ? diff : -diff;
                    }
                }
                return 0;
            });
        }
        return filtered;
    };

    const renderTable = () => {
        const visibleData = getFilteredData();
        
        // Update stats
        const statsEl = hdrTitle.querySelector('#uni-modal-stats');
        if (statsEl) {
            statsEl.textContent = `${visibleData.length} rows / ${selectedCols.size} cols`;
        }

        let lastSelectedCol = null;

        // Render Colgroup & Head with Visual Column Resizers
        colgroup.innerHTML = '';
        thead.innerHTML = '';
        const trHead = document.createElement('tr');
        
        const activeCols = columns.filter(c => selectedCols.has(c));
        activeCols.forEach((col) => {
            const idx = columns.indexOf(col);
            const colEl = document.createElement('col');
            const initialWidth = colWidths[col] || Math.max(140, Math.min(300, displayNames[idx].length * 14 + 50));
            colWidths[col] = initialWidth;
            colEl.style.width = initialWidth + 'px';
            colEl.setAttribute('data-col', col);
            colgroup.appendChild(colEl);

            const isColSelectedForCopy = selectedColForCopy.has(col);
            const th = document.createElement('th');
            th.setAttribute('data-col', col);
            th.style.cssText = `position:sticky; top:0; background:${isColSelectedForCopy ? 'var(--accent-subtle, rgba(99,102,241,0.18))' : 'var(--bg-color)'}; z-index:16; padding:10px 16px 10px 10px; border-bottom:1px solid var(--panel-border); font-weight:600; cursor:pointer; user-select:none; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; box-sizing:border-box; transition:background 0.2s; color:${isColSelectedForCopy ? 'var(--accent)' : 'inherit'};`;
            th.title = '点击表头选择列以供复制 (支持 Ctrl/Shift 多选)；点击右侧标题排序';
            
            // Checkbox for column selection
            const colChk = document.createElement('input');
            colChk.type = 'checkbox';
            colChk.checked = isColSelectedForCopy;
            colChk.style.cssText = 'margin-right:6px; cursor:pointer; vertical-align:middle; accent-color:var(--accent);';
            colChk.title = '选中/取消此列以供复制 (含列名)';
            colChk.onclick = (e) => {
                e.stopPropagation();
                if (colChk.checked) selectedColForCopy.add(col);
                else selectedColForCopy.delete(col);
                if (updateCopyToolbar) updateCopyToolbar();
                renderTable();
            };
            th.appendChild(colChk);

            let arrow = '';
            const existingSort = sortState.find(s => s.index === idx);
            if (existingSort) {
                arrow = existingSort.asc ? ' ↑' : ' ↓';
                th.style.color = 'var(--accent)';
                if (sortState.length > 1) {
                    arrow += ` <span style="font-size:0.65rem;color:var(--text-secondary);">${sortState.indexOf(existingSort) + 1}</span>`;
                }
            }
            
            const titleSpan = document.createElement('span');
            titleSpan.className = 'uni-sort-trigger';
            titleSpan.style.cssText = 'display:inline-block; max-width:calc(100% - 30px); overflow:hidden; text-overflow:ellipsis; vertical-align:middle; cursor:pointer;';
            titleSpan.title = '点击按此列排序 (按住 Shift 多列排序)';
            titleSpan.innerHTML = displayNames[idx] + arrow;
            th.appendChild(titleSpan);

            // Visual Column Resizer Handle (Single unified divider handle)
            const resizer = document.createElement('div');
            resizer.className = 'uni-col-resizer';
            resizer.style.cssText = 'position:absolute; top:0; right:-4px; width:8px; height:100%; cursor:col-resize; user-select:none; z-index:20; display:flex; align-items:center; justify-content:center;';
            
            const resizerLine = document.createElement('div');
            resizerLine.style.cssText = 'width:2px; height:60%; background:var(--overlay-20); border-radius:1px; transition:background 0.2s, height 0.2s, box-shadow 0.2s;';
            resizer.appendChild(resizerLine);

            resizer.onmouseenter = () => {
                resizerLine.style.background = 'var(--accent)';
                resizerLine.style.height = '100%';
            };
            resizer.onmouseleave = () => {
                if (!isResizing) {
                    resizerLine.style.background = 'var(--overlay-20)';
                    resizerLine.style.height = '65%';
                }
            };

            let startX = 0;
            let startWidth = 0;
            let isResizing = false;

            resizer.addEventListener('mousedown', (e) => {
                e.stopPropagation();
                e.preventDefault();
                isResizing = true;
                startX = e.pageX;
                startWidth = colWidths[col] || th.offsetWidth;
                resizerLine.style.background = 'var(--accent)';
                resizerLine.style.height = '100%';
                resizerLine.style.boxShadow = '0 0 8px var(--accent-glow)';
                document.body.style.cursor = 'col-resize';
                document.body.style.userSelect = 'none';

                const onMouseMove = (moveEvent) => {
                    if (!isResizing) return;
                    const diffX = moveEvent.pageX - startX;
                    const newWidth = Math.max(70, startWidth + diffX);
                    colWidths[col] = newWidth;
                    colEl.style.width = newWidth + 'px';
                };

                const onMouseUp = () => {
                    if (isResizing) {
                        isResizing = false;
                        resizerLine.style.background = 'var(--overlay-20)';
                        resizerLine.style.height = '65%';
                        resizerLine.style.boxShadow = 'none';
                        document.body.style.cursor = '';
                        document.body.style.userSelect = '';
                        document.removeEventListener('mousemove', onMouseMove);
                        document.removeEventListener('mouseup', onMouseUp);
                        savePreferences();
                    }
                };

                document.addEventListener('mousemove', onMouseMove);
                document.addEventListener('mouseup', onMouseUp);
            });

            // Double click to auto fit content width
            resizer.addEventListener('dblclick', (e) => {
                e.stopPropagation();
                let maxLen = displayNames[idx].length;
                visibleData.slice(0, 100).forEach(r => {
                    const v = r[col];
                    if (v !== null && v !== undefined) {
                        maxLen = Math.max(maxLen, String(v).length);
                    }
                });
                const fitWidth = Math.max(90, Math.min(600, maxLen * 9 + 40));
                colWidths[col] = fitWidth;
                colEl.style.width = fitWidth + 'px';
                savePreferences();
            });

            resizer.addEventListener('click', (e) => {
                e.stopPropagation();
            });

            th.appendChild(resizer);

            const handleSort = (e) => {
                if (e.shiftKey) {
                    const s = sortState.find(s => s.index === idx);
                    if (s) s.asc = !s.asc;
                    else sortState.push({index: idx, asc: true});
                } else {
                    const s = sortState.find(s => s.index === idx);
                    if (s && sortState.length === 1) {
                        s.asc = !s.asc;
                    } else {
                        sortState = [{index: idx, asc: true}];
                    }
                }
                savePreferences();
                renderTable();
            };

            th.onclick = (e) => {
                if (isResizing) return;
                
                // If clicked directly on sort trigger text, sort column
                if (e.target.closest('.uni-sort-trigger')) {
                    handleSort(e);
                    return;
                }
                
                // Otherwise toggle column selection for copying
                if (e.ctrlKey || e.metaKey) {
                    if (selectedColForCopy.has(col)) selectedColForCopy.delete(col);
                    else selectedColForCopy.add(col);
                } else if (e.shiftKey && lastSelectedCol) {
                    const colList = activeCols;
                    const startIdx = colList.indexOf(lastSelectedCol);
                    const endIdx = colList.indexOf(col);
                    if (startIdx !== -1 && endIdx !== -1) {
                        const [minIdx, maxIdx] = [Math.min(startIdx, endIdx), Math.max(startIdx, endIdx)];
                        for (let i = minIdx; i <= maxIdx; i++) {
                            selectedColForCopy.add(colList[i]);
                        }
                    }
                } else {
                    if (selectedColForCopy.has(col) && selectedColForCopy.size === 1) {
                        selectedColForCopy.clear();
                    } else {
                        selectedColForCopy.clear();
                        selectedColForCopy.add(col);
                    }
                }
                lastSelectedCol = col;
                if (updateCopyToolbar) updateCopyToolbar();
                renderTable();
            };
            trHead.appendChild(th);
        });
        thead.appendChild(trHead);

        // Render Body
        tbody.innerHTML = '';
        if (visibleData.length === 0) {
            const emptyTr = document.createElement('tr');
            emptyTr.innerHTML = `<td colspan="${selectedCols.size}" style="padding:16px;text-align:center;color:var(--text-secondary);">No matching records found.</td>`;
            tbody.appendChild(emptyTr);
            return;
        }

        // Fast String Concatenation Engine for blazing fast render
        let htmlRows = '';
        visibleData.forEach(row => {
            htmlRows += `<tr>`;
            columns.forEach(col => {
                if (!selectedCols.has(col)) return;
                
                const isSelectedCol = selectedColForCopy.has(col);
                const colHighlight = isSelectedCol ? 'background: rgba(99, 102, 241, 0.08) !important;' : '';

                let val = row[col];
                let cellHtml = '';
                let cellTitle = '';
                
                if (options.cellRenderer) {
                    const customHtml = options.cellRenderer(col, val, row);
                    if (customHtml !== undefined) {
                        htmlRows += `<td style="padding: 6px 12px; color: var(--text-primary); border-bottom: 1px solid var(--panel-border); border-right: 1px solid var(--overlay-5); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; ${colHighlight}">${customHtml}</td>`;
                        return;
                    }
                }
                
                if (typeof val === 'boolean') {
                    cellHtml = val ? `<span style="color:var(--success);font-weight:500;">True</span>` : `<span style="color:var(--error);font-weight:500;">False</span>`;
                } else if (val === null || val === undefined) {
                    cellHtml = `<span style="color:var(--text-secondary);font-style:italic;">null</span>`;
                } else if (typeof val === 'object') {
                    const str = JSON.stringify(val);
                    cellTitle = str.replace(/"/g, '&quot;');
                    cellHtml = str.replace(/</g, '&lt;').replace(/>/g, '&gt;');
                } else {
                    const str = String(val);
                    cellTitle = str.replace(/"/g, '&quot;');
                    cellHtml = str.replace(/</g, '&lt;').replace(/>/g, '&gt;');
                }
                
                htmlRows += `<td title="${cellTitle}" style="padding: 6px 12px; color: var(--text-primary); border-bottom: 1px solid var(--panel-border); border-right: 1px solid var(--overlay-5); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; ${colHighlight}">${cellHtml}</td>`;
            });
            htmlRows += `</tr>`;
        });
        tbody.innerHTML = htmlRows;
    };

    renderTable();

    // Global Ctrl+C / Cmd+C shortcut listener for copying columns
    const handleKeyDown = (e) => {
        if ((e.ctrlKey || e.metaKey) && (e.key === 'c' || e.key === 'C')) {
            const activeEl = document.activeElement;
            const isTyping = activeEl && (activeEl.tagName === 'INPUT' || activeEl.tagName === 'TEXTAREA') && activeEl.selectionStart !== activeEl.selectionEnd;
            if (!isTyping) {
                e.preventDefault();
                copySelectedColumnsData();
            }
        }
    };
    document.addEventListener('keydown', handleKeyDown);

    // Clean up keydown listener on close
    const originalClose = closeBtn.onclick;
    closeBtn.onclick = (e) => {
        document.removeEventListener('keydown', handleKeyDown);
        if (originalClose) originalClose(e);
    };

    // Animate in & clear transition after open for 60fps smooth dragging
    requestAnimationFrame(() => {
        overlay.style.opacity = '1';
        panel.style.transform = 'scale(1)';
        setTimeout(() => {
            panel.style.transition = 'none';
        }, 260);
    });
};
