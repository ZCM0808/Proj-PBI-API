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

            /* Column Header Filter Popover & Buttons */
            .uni-col-filter-popover {
                position: fixed;
                z-index: 25000;
                width: 275px;
                background: var(--dropdown-bg, #1a1a24);
                border: 1px solid var(--panel-border, rgba(255,255,255,0.14));
                border-radius: 8px;
                box-shadow: 0 16px 40px rgba(0, 0, 0, 0.7), 0 0 1px rgba(255,255,255,0.2);
                display: flex;
                flex-direction: column;
                padding: 10px;
                font-size: 0.78rem;
                color: var(--text-primary);
                opacity: 0;
                transform: translateY(-6px) scale(0.97);
                transition: opacity 0.18s ease, transform 0.18s cubic-bezier(0.16, 1, 0.3, 1);
                pointer-events: none;
                backdrop-filter: blur(12px);
                -webkit-backdrop-filter: blur(12px);
            }
            .uni-col-filter-popover.active {
                opacity: 1;
                transform: translateY(0) scale(1);
                pointer-events: auto;
            }
            .uni-col-filter-list {
                max-height: 220px;
                overflow-y: auto;
                margin: 6px 0;
                padding-right: 2px;
                display: flex;
                flex-direction: column;
                gap: 2px;
            }
            .uni-col-filter-list::-webkit-scrollbar {
                width: 6px;
            }
            .uni-col-filter-list::-webkit-scrollbar-thumb {
                background: var(--overlay-20);
                border-radius: 4px;
            }
            .uni-col-filter-item {
                display: flex;
                align-items: center;
                gap: 7px;
                padding: 5px 6px;
                border-radius: 4px;
                cursor: pointer;
                user-select: none;
                transition: background 0.15s;
            }
            .uni-col-filter-item:hover {
                background: var(--overlay-10, rgba(255,255,255,0.08));
            }
            .uni-col-filter-btn {
                display: inline-flex;
                align-items: center;
                justify-content: center;
                padding: 2px 4px;
                border-radius: 4px;
                cursor: pointer;
                opacity: 0.35;
                transition: all 0.18s ease;
                background: transparent;
                border: none;
                color: inherit;
                vertical-align: middle;
                margin-left: 4px;
            }
            .uni-col-filter-btn:hover {
                opacity: 1;
                background: var(--overlay-15, rgba(255,255,255,0.12));
                color: var(--accent);
            }
            .uni-col-filter-btn.active {
                opacity: 1;
                color: var(--accent);
                background: var(--accent-subtle, rgba(99,102,241,0.2));
            }
        `;
        document.head.appendChild(style);
    }

    const title = options.title || 'Data View';
    const data = options.data || [];
    let columns = options.columns ? [...options.columns] : (data.length > 0 ? Object.keys(data[0]) : []);
    let displayNames = options.displayNames ? [...options.displayNames] : [...columns];
    const enableSearch = options.enableSearch !== false;
    const enableColumnFilter = options.enableColumnFilter !== false;

    // Storage Key for Settings Persistence
    const storageKey = options.storageKey || `pbi_grid_pref_${title.toLowerCase().replace(/[^a-z0-9_]/g, '_')}`;
    let savedPrefs = {};
    try {
        savedPrefs = JSON.parse(localStorage.getItem(storageKey) || '{}');
    } catch(e) {}

    // Hydrate Column Order (Preference persistence)
    if (savedPrefs.columnOrder && Array.isArray(savedPrefs.columnOrder) && savedPrefs.columnOrder.length > 0) {
        const expandedOrder = [];
        savedPrefs.columnOrder.forEach(col => {
            if (col === 'Models') {
                expandedOrder.push('Model Name', 'Model ID');
            } else {
                expandedOrder.push(col);
            }
        });
        const ordered = [];
        const orderedNames = [];
        expandedOrder.forEach(col => {
            const idx = columns.indexOf(col);
            if (idx !== -1 && !ordered.includes(col)) {
                ordered.push(col);
                orderedNames.push(displayNames[idx]);
            }
        });
        columns.forEach((col, idx) => {
            if (!ordered.includes(col)) {
                ordered.push(col);
                orderedNames.push(displayNames[idx]);
            }
        });
        columns = ordered;
        displayNames = orderedNames;
    }

    // State (Hydrated from persistent storage)
    let selectedCols = new Set(columns);
    if (savedPrefs.selectedCols && Array.isArray(savedPrefs.selectedCols) && savedPrefs.selectedCols.length > 0) {
        const expandedSelected = [];
        savedPrefs.selectedCols.forEach(col => {
            if (col === 'Models') {
                expandedSelected.push('Model Name', 'Model ID');
            } else {
                expandedSelected.push(col);
            }
        });
        // Intersect with valid current columns
        const validSaved = expandedSelected.filter(c => columns.includes(c));
        if (validSaved.length > 0) {
            // If new columns were added to the schema that didn't exist when user saved preferences, ensure they are visible
            if (savedPrefs.columnOrder && Array.isArray(savedPrefs.columnOrder)) {
                columns.forEach(col => {
                    if (!savedPrefs.columnOrder.includes(col) && col !== 'Models' && !validSaved.includes(col)) {
                        validSaved.push(col);
                    }
                });
            }
            selectedCols = new Set(validSaved);
        }
    }

    // Frozen columns state (Excel Frozen columns)
    let frozenCols = new Set();
    if (savedPrefs.frozenCols && Array.isArray(savedPrefs.frozenCols)) {
        savedPrefs.frozenCols.forEach(c => {
            if (columns.includes(c)) frozenCols.add(c);
        });
    }

    let searchText = "";
    let sortState = Array.isArray(savedPrefs.sortState) ? savedPrefs.sortState : []; // Array of {index, asc}
    const colWidths = (savedPrefs.colWidths && typeof savedPrefs.colWidths === 'object') ? savedPrefs.colWidths : {};

    // Column Filters state (key: colName, value: Set of checked string values)
    const columnFilters = {};
    let updateResetColFiltersBtn = null;

    const formatFilterVal = (val) => {
        if (val === null || val === undefined) return '(空白)';
        const s = String(val).trim();
        return s === '' ? '(空白)' : s;
    };

    // 多列联动候选值计算引擎 (Faceted Cross-Filtering Engine)
    const getFacetValuesForColumn = (targetCol) => {
        // 1. 先经过全局搜索过滤
        let baseData = data;
        if (searchText) {
            baseData = baseData.filter(row => {
                return columns.some(col => {
                    if (!selectedCols.has(col)) return false;
                    const val = row[col];
                    if (val === null || val === undefined) return false;
                    return val.toString().toLowerCase().includes(searchText);
                });
            });
        }

        // 2. 经过除 targetCol 自身之外的所有其他激活筛选列的交集过滤
        const otherActiveCols = Object.keys(columnFilters).filter(c => c !== targetCol && columnFilters[c] && columnFilters[c].size > 0);
        let filteredForTarget = baseData;
        if (otherActiveCols.length > 0) {
            filteredForTarget = baseData.filter(row => {
                for (const c of otherActiveCols) {
                    const rowVal = formatFilterVal(row[c]);
                    if (!columnFilters[c].has(rowVal)) {
                        return false;
                    }
                }
                return true;
            });
        }

        // 3. 统计 targetCol 在联动数据中的唯一值与频次
        const countsMap = new Map();
        filteredForTarget.forEach(row => {
            const val = formatFilterVal(row[targetCol]);
            countsMap.set(val, (countsMap.get(val) || 0) + 1);
        });

        const sortedValues = Array.from(countsMap.entries()).map(([val, count]) => ({ val, count }));
        sortedValues.sort((a, b) => {
            if (a.val === '(空白)') return 1;
            if (b.val === '(空白)') return -1;
            return a.val.localeCompare(b.val, undefined, { numeric: true, sensitivity: 'base' });
        });

        return sortedValues;
    };

    const savePreferences = () => {
        try {
            localStorage.setItem(storageKey, JSON.stringify({
                columnOrder: columns,
                selectedCols: Array.from(selectedCols),
                frozenCols: Array.from(frozenCols),
                sortState: sortState,
                colWidths: colWidths,
                modalSize: savedPrefs.modalSize || null
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
    
    // 计算初始尺寸（优先读取当前弹窗个性化偏好，其次读取通用数据弹窗记忆，最后采用稳定基准尺寸）
    let initialWidth = 'min(94vw, 1200px)';
    let initialHeight = 'min(88vh, 850px)';

    let customSize = savedPrefs.modalSize;
    if (!customSize || typeof customSize.width !== 'number' || typeof customSize.height !== 'number') {
        try {
            const lastGlobalSize = JSON.parse(localStorage.getItem('pbi_universal_modal_last_size') || 'null');
            if (lastGlobalSize && typeof lastGlobalSize.width === 'number' && typeof lastGlobalSize.height === 'number') {
                customSize = lastGlobalSize;
            }
        } catch(e) {}
    }

    if (customSize && typeof customSize.width === 'number' && typeof customSize.height === 'number') {
        const safeW = Math.max(360, Math.min(customSize.width, Math.round(window.innerWidth * 0.96)));
        const safeH = Math.max(260, Math.min(customSize.height, Math.round(window.innerHeight * 0.94)));
        initialWidth = `${safeW}px`;
        initialHeight = `${safeH}px`;
    }

    // Panel
    const panel = document.createElement('div');
    // Removed glass-panel to prevent expensive backdrop-filter rendering during modal animation
    panel.style.cssText = [
        'position:relative','background:var(--bg-color)','border:1px solid var(--panel-border)',
        'border-radius:10px','box-shadow:0 24px 80px rgba(0,0,0,0.5)',
        `width:${initialWidth}`,
        `height:${initialHeight}`,
        'max-width:96vw',
        'max-height:94vh',
        'min-width:min(100%, 360px)',
        'min-height:260px',
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

                // 记录手动调节后的大小并持久化存储
                const currentW = Math.round(panel.offsetWidth);
                const currentH = Math.round(panel.offsetHeight);
                if (currentW >= 360 && currentH >= 220) {
                    const sizePref = { width: currentW, height: currentH };
                    savedPrefs.modalSize = sizePref;
                    savePreferences();
                    try {
                        localStorage.setItem('pbi_universal_modal_last_size', JSON.stringify(sizePref));
                    } catch(e) {}
                }
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
        colDropdownBtn.id = 'um-col-dropdown-btn';
        colDropdownBtn.className = 'wf-input';
        colDropdownBtn.style.cssText = 'padding:4px 10px;font-size:0.75rem;cursor:pointer;display:flex;align-items:center;gap:6px;background:var(--bg-color);';
        dropdownWrapper.appendChild(colDropdownBtn);

        const dropdownList = document.createElement('div');
        dropdownList.id = 'um-column-dropdown-list';
        dropdownList.style.cssText = 'display:none;position:absolute;top:100%;left:0;margin-top:4px;background:var(--dropdown-bg, #1a1a24);border:1px solid var(--panel-border);border-radius:6px;box-shadow:0 8px 24px rgba(0,0,0,0.8);max-height:260px;overflow-y:auto;width:290px;padding:6px;z-index:3000;';
        
        const dropdownHeader = document.createElement('div');
        dropdownHeader.style.cssText = 'display:flex;justify-content:space-between;padding:4px 6px;border-bottom:1px solid var(--overlay-10);margin-bottom:4px;font-size:0.75rem;';
        dropdownHeader.innerHTML = `
            <span style="color:var(--accent);cursor:pointer;font-weight:bold;" id="uni-sel-all">Select All</span>
            <span style="color:var(--text-secondary);cursor:pointer;" id="uni-dsel-all">Deselect All</span>
        `;
        dropdownList.appendChild(dropdownHeader);

        const colItemsContainer = document.createElement('div');
        dropdownList.appendChild(colItemsContainer);

        // Auto-scroll dropdown list when dragging near top/bottom boundaries
        const handleDragAutoScroll = (clientY) => {
            const rect = dropdownList.getBoundingClientRect();
            const threshold = 38;
            const maxSpeed = 10;

            if (clientY < rect.top + threshold) {
                // Near top boundary
                const distance = Math.max(0, clientY - rect.top);
                const speed = Math.ceil((1 - distance / threshold) * maxSpeed) + 2;
                dropdownList.scrollTop = Math.max(0, dropdownList.scrollTop - speed);
            } else if (clientY > rect.bottom - threshold) {
                // Near bottom boundary
                const distance = Math.max(0, rect.bottom - clientY);
                const speed = Math.ceil((1 - distance / threshold) * maxSpeed) + 2;
                dropdownList.scrollTop = Math.min(
                    dropdownList.scrollHeight - dropdownList.clientHeight,
                    dropdownList.scrollTop + speed
                );
            }
        };
        dropdownList._handleDragAutoScroll = handleDragAutoScroll;

        dropdownList.addEventListener('dragover', (e) => {
            e.preventDefault();
            handleDragAutoScroll(e.clientY);
        });

        dropdownWrapper.appendChild(dropdownList);
        filterLeft.appendChild(dropdownWrapper);
        filterBar.appendChild(filterLeft);

        // Right side: Copy Selected Columns Toolbar
        const filterRight = document.createElement('div');
        filterRight.style.cssText = 'display:flex;align-items:center;gap:8px;';

        const selectAllColsBtn = document.createElement('button');
        selectAllColsBtn.type = 'button';
        selectAllColsBtn.style.cssText = 'background:var(--overlay-10, rgba(255,255,255,0.06));border:1px solid var(--overlay-20, rgba(255,255,255,0.15));color:var(--text-primary);font-size:0.75rem;cursor:pointer;padding:4px 8px;border-radius:5px;transition:all 0.2s;font-weight:500;';
        selectAllColsBtn.textContent = '全选';
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
        clearColsBtn.textContent = '清空';
        clearColsBtn.title = '取消当前所有已选列';
        clearColsBtn.onmouseover = () => { clearColsBtn.style.background = 'var(--overlay-20)'; clearColsBtn.style.color = 'var(--text-primary)'; };
        clearColsBtn.onmouseout = () => { clearColsBtn.style.background = 'var(--overlay-10)'; clearColsBtn.style.color = 'var(--text-secondary)'; };
        clearColsBtn.onclick = () => {
            selectedColForCopy.clear();
            updateCopyToolbar();
            renderTable();
        };
        filterRight.appendChild(clearColsBtn);

        const resetColFiltersBtn = document.createElement('button');
        resetColFiltersBtn.type = 'button';
        resetColFiltersBtn.id = 'um-reset-col-filters-btn';
        resetColFiltersBtn.style.cssText = 'display:none;background:rgba(239,68,68,0.12);border:1px solid rgba(239,68,68,0.3);color:var(--error, #ef4444);font-size:0.75rem;cursor:pointer;padding:4px 8px;border-radius:5px;transition:all 0.2s;font-weight:500;align-items:center;gap:4px;';
        resetColFiltersBtn.title = '一键清除所有列的筛选条件';
        resetColFiltersBtn.innerHTML = `<span>🧹 重置筛选</span>`;
        resetColFiltersBtn.onclick = () => {
            Object.keys(columnFilters).forEach(k => delete columnFilters[k]);
            if (typeof closeColumnFilterPopover === 'function') closeColumnFilterPopover();
            if (updateResetColFiltersBtn) updateResetColFiltersBtn();
            renderTable();
        };
        filterRight.appendChild(resetColFiltersBtn);

        updateResetColFiltersBtn = () => {
            const activeCount = Object.keys(columnFilters).filter(c => columnFilters[c] && columnFilters[c].size > 0).length;
            if (activeCount > 0) {
                resetColFiltersBtn.style.display = 'inline-flex';
                resetColFiltersBtn.innerHTML = `<span>🧹 重置筛选 (${activeCount})</span>`;
            } else {
                resetColFiltersBtn.style.display = 'none';
            }
        };

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
            let draggedColIdx = null;

            columns.forEach((col, idx) => {
                const itemDiv = document.createElement('div');
                itemDiv.className = 'uni-col-item';
                itemDiv.setAttribute('draggable', 'true');
                itemDiv.dataset.idx = idx;
                itemDiv.style.cssText = 'display:flex;align-items:center;justify-content:space-between;gap:4px;padding:4px 6px;border-radius:4px;transition:background 0.15s, border-color 0.15s;border-top:2px solid transparent;border-bottom:2px solid transparent;user-select:none;cursor:default;';
                itemDiv.onmouseover = () => { if (itemDiv.style.borderTopColor === 'transparent' && itemDiv.style.borderBottomColor === 'transparent') itemDiv.style.background = 'var(--overlay-5)'; };
                itemDiv.onmouseout = () => { if (draggedColIdx === null) itemDiv.style.background = 'transparent'; };

                // Left part: Drag Handle + Checkbox + Label
                const leftPart = document.createElement('div');
                leftPart.style.cssText = 'display:flex;align-items:center;gap:6px;flex:1;min-width:0;';

                // 6-dot vertical grip SVG handle
                const dragHandle = document.createElement('span');
                dragHandle.className = 'uni-col-drag-grip';
                dragHandle.title = '上下拖拽调整列显示顺序';
                dragHandle.style.cssText = 'display:inline-flex;align-items:center;justify-content:center;cursor:grab;padding:2px;border-radius:3px;color:var(--text-secondary);opacity:0.65;transition:opacity 0.2s, color 0.2s;flex-shrink:0;';
                dragHandle.innerHTML = `
                    <svg width="12" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="pointer-events:none;">
                        <circle cx="8" cy="5" r="1.5" fill="currentColor"/>
                        <circle cx="16" cy="5" r="1.5" fill="currentColor"/>
                        <circle cx="8" cy="12" r="1.5" fill="currentColor"/>
                        <circle cx="16" cy="12" r="1.5" fill="currentColor"/>
                        <circle cx="8" cy="19" r="1.5" fill="currentColor"/>
                        <circle cx="16" cy="19" r="1.5" fill="currentColor"/>
                    </svg>
                `;
                dragHandle.onmouseenter = () => { dragHandle.style.opacity = '1'; dragHandle.style.color = 'var(--accent)'; };
                dragHandle.onmouseleave = () => { dragHandle.style.opacity = '0.65'; dragHandle.style.color = 'var(--text-secondary)'; };
                leftPart.appendChild(dragHandle);

                const chk = document.createElement('input');
                chk.type = 'checkbox';
                chk.checked = selectedCols.has(col);
                chk.style.cursor = 'pointer';
                chk.style.accentColor = 'var(--accent)';
                chk.style.flexShrink = '0';
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
                leftPart.appendChild(chk);

                const span = document.createElement('span');
                span.style.cssText = 'overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:160px;cursor:pointer;font-size:0.75rem;color:var(--text-primary);';
                span.title = displayNames[idx];
                span.textContent = displayNames[idx];
                span.onclick = () => {
                    chk.checked = !chk.checked;
                    chk.dispatchEvent(new Event('change'));
                };
                leftPart.appendChild(span);
                itemDiv.appendChild(leftPart);

                // Right action controls: Only Freeze Pin (▲ / ▼ removed)
                const orderCtrl = document.createElement('div');
                orderCtrl.style.cssText = 'display:flex;align-items:center;gap:4px;flex-shrink:0;';

                const pinBtn = document.createElement('button');
                pinBtn.type = 'button';
                const isFrozen = frozenCols.has(col);
                pinBtn.innerHTML = '📌';
                pinBtn.title = isFrozen ? '已冻结固定该列 (点击取消)' : '点击冻结固定该列 (Excel 窗格冻结)';
                pinBtn.style.cssText = `background:none;border:none;cursor:pointer;font-size:0.75rem;padding:2px 4px;border-radius:3px;line-height:1;opacity:${isFrozen ? '1' : '0.35'};transition:opacity 0.2s;`;
                pinBtn.onclick = (e) => {
                    e.stopPropagation();
                    if (frozenCols.has(col)) {
                        frozenCols.delete(col);
                    } else {
                        frozenCols.add(col);
                    }
                    savePreferences();
                    renderColItems();
                    renderTable();
                };

                orderCtrl.appendChild(pinBtn);
                itemDiv.appendChild(orderCtrl);

                // HTML5 Drag and Drop events for reordering
                itemDiv.addEventListener('dragstart', (e) => {
                    draggedColIdx = idx;
                    e.dataTransfer.effectAllowed = 'move';
                    e.dataTransfer.setData('text/plain', String(idx));
                    itemDiv.style.opacity = '0.35';
                });

                itemDiv.addEventListener('dragend', () => {
                    itemDiv.style.opacity = '1';
                    draggedColIdx = null;
                    colItemsContainer.querySelectorAll('.uni-col-item').forEach(el => {
                        el.style.borderTopColor = 'transparent';
                        el.style.borderBottomColor = 'transparent';
                        el.style.background = 'transparent';
                    });
                });

                itemDiv.addEventListener('dragover', (e) => {
                    e.preventDefault();
                    e.dataTransfer.dropEffect = 'move';
                    handleDragAutoScroll(e.clientY);
                    const rect = itemDiv.getBoundingClientRect();
                    const midY = rect.top + rect.height / 2;
                    if (e.clientY < midY) {
                        itemDiv.style.borderTopColor = 'var(--accent)';
                        itemDiv.style.borderBottomColor = 'transparent';
                    } else {
                        itemDiv.style.borderTopColor = 'transparent';
                        itemDiv.style.borderBottomColor = 'var(--accent)';
                    }
                });

                itemDiv.addEventListener('dragleave', () => {
                    itemDiv.style.borderTopColor = 'transparent';
                    itemDiv.style.borderBottomColor = 'transparent';
                });

                itemDiv.addEventListener('drop', (e) => {
                    e.preventDefault();
                    itemDiv.style.borderTopColor = 'transparent';
                    itemDiv.style.borderBottomColor = 'transparent';

                    const fromIdx = draggedColIdx !== null ? draggedColIdx : parseInt(e.dataTransfer.getData('text/plain'), 10);
                    if (isNaN(fromIdx) || fromIdx === idx) return;

                    const rect = itemDiv.getBoundingClientRect();
                    const midY = rect.top + rect.height / 2;
                    let targetIdx = e.clientY < midY ? idx : idx + 1;
                    if (fromIdx < targetIdx) targetIdx--;

                    const [movedCol] = columns.splice(fromIdx, 1);
                    const [movedName] = displayNames.splice(fromIdx, 1);
                    columns.splice(targetIdx, 0, movedCol);
                    displayNames.splice(targetIdx, 0, movedName);

                    savePreferences();
                    renderColItems();
                    renderTable();
                });

                colItemsContainer.appendChild(itemDiv);
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

        // 2. 列级分面多选联动过滤 (Faceted Cross-Column Filtering)
        const activeFilterCols = Object.keys(columnFilters).filter(c => columnFilters[c] && columnFilters[c].size !== undefined);
        if (activeFilterCols.length > 0) {
            filtered = filtered.filter(row => {
                for (const c of activeFilterCols) {
                    const rowVal = formatFilterVal(row[c]);
                    if (!columnFilters[c].has(rowVal)) {
                        return false;
                    }
                }
                return true;
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

    // ─── Column Filter Popover Engine ───
    let activeFilterPopover = null;

    const closeColumnFilterPopover = () => {
        if (activeFilterPopover) {
            activeFilterPopover.remove();
            activeFilterPopover = null;
        }
    };

    const openColumnFilterPopover = (col, triggerBtn) => {
        if (activeFilterPopover && activeFilterPopover._col === col) {
            closeColumnFilterPopover();
            return;
        }
        closeColumnFilterPopover();

        // 1. 获取联动上下文下的候选值列表
        const facetList = getFacetValuesForColumn(col);
        const allPossibleVals = facetList.map(item => item.val);
        
        let currentChecked = new Set();
        if (columnFilters[col]) {
            columnFilters[col].forEach(v => currentChecked.add(v));
        } else {
            allPossibleVals.forEach(v => currentChecked.add(v));
        }

        // 2. 创建 Popover 容器
        const popover = document.createElement('div');
        popover.className = 'uni-col-filter-popover';
        popover._col = col;
        activeFilterPopover = popover;

        // Header 标题
        const popHdr = document.createElement('div');
        popHdr.style.cssText = 'display:flex;align-items:center;justify-content:space-between;padding-bottom:6px;border-bottom:1px solid var(--overlay-10);font-weight:600;font-size:0.8rem;';
        popHdr.innerHTML = `
            <span style="display:flex;align-items:center;gap:5px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:190px;" title="${col}">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" stroke-width="2.2"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"></polygon></svg>
                筛选: ${col}
            </span>
            <span id="pop-filter-count-badge" style="font-size:0.7rem;color:var(--accent);font-weight:normal;flex-shrink:0;"></span>
        `;
        popover.appendChild(popHdr);

        // 快速搜索输入框
        const searchInput = document.createElement('input');
        searchInput.type = 'text';
        searchInput.className = 'wf-input';
        searchInput.placeholder = '在候选值中快速搜索...';
        searchInput.style.cssText = 'margin-top:6px;padding:4px 8px;font-size:0.75rem;min-height:unset;width:100%;box-sizing:border-box;border-radius:4px;';
        popover.appendChild(searchInput);

        // 批量操作栏 (全选 / 清空 / 反选)
        const actionRow = document.createElement('div');
        actionRow.style.cssText = 'display:flex;align-items:center;justify-content:space-between;padding:5px 2px 3px;font-size:0.72rem;color:var(--accent);border-bottom:1px solid var(--overlay-5);';
        actionRow.innerHTML = `
            <div style="display:flex;gap:10px;">
                <span id="pop-select-all" style="cursor:pointer;font-weight:600;text-decoration:underline;">全选</span>
                <span id="pop-clear-all" style="cursor:pointer;color:var(--text-secondary);">清空</span>
                <span id="pop-invert" style="cursor:pointer;color:var(--text-secondary);">反选</span>
            </div>
            <span style="color:var(--text-secondary);font-size:0.68rem;" id="pop-total-facet-stat">${facetList.length} 项可选</span>
        `;
        popover.appendChild(actionRow);

        // 候选项滚动列表
        const listContainer = document.createElement('div');
        listContainer.className = 'uni-col-filter-list';
        popover.appendChild(listContainer);

        let filterKeyword = '';
        const renderFacetItems = () => {
            listContainer.innerHTML = '';
            const matchingFacets = facetList.filter(item => {
                if (!filterKeyword) return true;
                return item.val.toLowerCase().includes(filterKeyword);
            });

            if (matchingFacets.length === 0) {
                listContainer.innerHTML = `<div style="padding:16px 6px;text-align:center;color:var(--text-secondary);font-size:0.72rem;font-style:italic;">无匹配的候选值</div>`;
            } else {
                matchingFacets.forEach(item => {
                    const itemDiv = document.createElement('div');
                    itemDiv.className = 'uni-col-filter-item';
                    
                    const isChecked = currentChecked.has(item.val);
                    itemDiv.innerHTML = `
                        <input type="checkbox" style="cursor:pointer;accent-color:var(--accent);margin:0;flex-shrink:0;" ${isChecked ? 'checked' : ''}>
                        <span style="flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;" title="${item.val}">${item.val}</span>
                        <span style="font-size:0.68rem;color:var(--text-secondary);background:var(--overlay-5);padding:1px 5px;border-radius:8px;flex-shrink:0;">${item.count}</span>
                    `;

                    const chk = itemDiv.querySelector('input');
                    itemDiv.onclick = (e) => {
                        if (e.target !== chk) {
                            chk.checked = !chk.checked;
                        }
                        if (chk.checked) {
                            currentChecked.add(item.val);
                        } else {
                            currentChecked.delete(item.val);
                        }
                        updateBadges();
                    };
                    listContainer.appendChild(itemDiv);
                });
            }

            updateBadges();
        };

        const updateBadges = () => {
            const countBadge = popover.querySelector('#pop-filter-count-badge');
            if (countBadge) {
                countBadge.textContent = `${currentChecked.size}/${facetList.length}`;
            }
        };

        searchInput.oninput = (e) => {
            filterKeyword = e.target.value.trim().toLowerCase();
            renderFacetItems();
        };

        actionRow.querySelector('#pop-select-all').onclick = () => {
            if (filterKeyword) {
                facetList.filter(i => i.val.toLowerCase().includes(filterKeyword)).forEach(i => currentChecked.add(i.val));
            } else {
                facetList.forEach(i => currentChecked.add(i.val));
            }
            renderFacetItems();
        };
        actionRow.querySelector('#pop-clear-all').onclick = () => {
            if (filterKeyword) {
                facetList.filter(i => i.val.toLowerCase().includes(filterKeyword)).forEach(i => currentChecked.delete(i.val));
            } else {
                currentChecked.clear();
            }
            renderFacetItems();
        };
        actionRow.querySelector('#pop-invert').onclick = () => {
            const targetItems = filterKeyword ? facetList.filter(i => i.val.toLowerCase().includes(filterKeyword)) : facetList;
            targetItems.forEach(item => {
                if (currentChecked.has(item.val)) currentChecked.delete(item.val);
                else currentChecked.add(item.val);
            });
            renderFacetItems();
        };

        // Footer 底部操作按钮
        const popFooter = document.createElement('div');
        popFooter.style.cssText = 'display:flex;align-items:center;justify-content:space-between;padding-top:8px;border-top:1px solid var(--overlay-10);gap:6px;';
        
        const resetBtn = document.createElement('button');
        resetBtn.type = 'button';
        resetBtn.className = 'btn-wf-sm btn-wf-secondary';
        resetBtn.style.cssText = 'padding:3px 8px;font-size:0.72rem;cursor:pointer;';
        resetBtn.textContent = '重置此列';
        resetBtn.title = '取消此列的所有筛选限制';
        resetBtn.onclick = () => {
            delete columnFilters[col];
            closeColumnFilterPopover();
            if (updateResetColFiltersBtn) updateResetColFiltersBtn();
            renderTable();
        };

        const rightBtns = document.createElement('div');
        rightBtns.style.cssText = 'display:flex;align-items:center;gap:6px;';

        const cancelBtn = document.createElement('button');
        cancelBtn.type = 'button';
        cancelBtn.className = 'btn-wf-sm btn-wf-secondary';
        cancelBtn.style.cssText = 'padding:3px 8px;font-size:0.72rem;cursor:pointer;';
        cancelBtn.textContent = '取消';
        cancelBtn.onclick = closeColumnFilterPopover;

        const applyBtn = document.createElement('button');
        applyBtn.type = 'button';
        applyBtn.className = 'btn-wf-sm btn-wf-primary';
        applyBtn.style.cssText = 'padding:3px 10px;font-size:0.72rem;cursor:pointer;background:var(--accent);color:#ffffff;border:none;border-radius:4px;font-weight:600;';
        applyBtn.textContent = '确定应用';
        applyBtn.onclick = () => {
            if (currentChecked.size === facetList.length) {
                // 全选等同于无限制
                delete columnFilters[col];
            } else {
                columnFilters[col] = new Set(currentChecked);
            }
            closeColumnFilterPopover();
            if (updateResetColFiltersBtn) updateResetColFiltersBtn();
            renderTable();
        };

        rightBtns.appendChild(cancelBtn);
        rightBtns.appendChild(applyBtn);
        popFooter.appendChild(resetBtn);
        popFooter.appendChild(rightBtns);
        popover.appendChild(popFooter);

        // 挂载到 body 并定位
        document.body.appendChild(popover);
        renderFacetItems();

        const btnRect = triggerBtn.getBoundingClientRect();
        const popW = 275;
        let left = btnRect.left;
        if (left + popW > window.innerWidth - 16) {
            left = window.innerWidth - popW - 16;
        }
        if (left < 16) left = 16;

        let top = btnRect.bottom + 4;
        const estimatedHeight = 340;
        if (top + estimatedHeight > window.innerHeight - 16) {
            top = Math.max(16, btnRect.top - estimatedHeight - 4);
        }

        popover.style.left = left + 'px';
        popover.style.top = top + 'px';

        requestAnimationFrame(() => {
            popover.classList.add('active');
            searchInput.focus();
        });

        popover.onclick = (e) => e.stopPropagation();
        popover.onmousedown = (e) => e.stopPropagation();
    };

    // 全局点击空白自动关闭筛选弹窗
    const handleGlobalMouseDownForPopover = (e) => {
        if (activeFilterPopover) {
            if (!activeFilterPopover.contains(e.target) && !e.target.closest('.uni-col-filter-btn')) {
                closeColumnFilterPopover();
            }
        }
    };
    document.addEventListener('mousedown', handleGlobalMouseDownForPopover);

    const renderTable = () => {
        const visibleData = getFilteredData();
        
        // Update stats
        const statsEl = hdrTitle.querySelector('#uni-modal-stats');
        if (statsEl) {
            if (visibleData.length !== data.length) {
                statsEl.textContent = `${visibleData.length}/${data.length} rows / ${selectedCols.size} cols`;
            } else {
                statsEl.textContent = `${visibleData.length} rows / ${selectedCols.size} cols`;
            }
        }

        if (typeof updateResetColFiltersBtn === 'function') {
            updateResetColFiltersBtn();
        }

        let lastSelectedCol = null;

        // Render Colgroup & Head with Visual Column Resizers
        colgroup.innerHTML = '';
        thead.innerHTML = '';
        const trHead = document.createElement('tr');
        
        const activeCols = columns.filter(c => selectedCols.has(c));
        const colStickyLeft = {};
        let cumulativeLeft = 0;
        let lastFrozenCol = null;

        activeCols.forEach(col => {
            if (frozenCols.has(col)) {
                colStickyLeft[col] = cumulativeLeft;
                const idx = columns.indexOf(col);
                const initialWidth = colWidths[col] || Math.max(140, Math.min(300, displayNames[idx].length * 14 + 50));
                colWidths[col] = initialWidth;
                cumulativeLeft += initialWidth;
                lastFrozenCol = col;
            }
        });

        activeCols.forEach((col) => {
            const idx = columns.indexOf(col);
            const colEl = document.createElement('col');
            const initialWidth = colWidths[col] || Math.max(140, Math.min(300, displayNames[idx].length * 14 + 50));
            colWidths[col] = initialWidth;
            colEl.style.width = initialWidth + 'px';
            colEl.setAttribute('data-col', col);
            colgroup.appendChild(colEl);

            const isColSelectedForCopy = selectedColForCopy.has(col);
            const isFrozen = frozenCols.has(col);
            const isLastFrozen = (col === lastFrozenCol);
            const frozenShadow = isLastFrozen ? 'box-shadow: 3px 0 8px -2px rgba(0,0,0,0.45); border-right: 2px solid var(--accent, #6366f1) !important;' : '';
            const frozenSticky = isFrozen ? `position:sticky; left:${colStickyLeft[col]}px; z-index:25;` : 'position:sticky; top:0; z-index:16;';

            const th = document.createElement('th');
            th.setAttribute('data-col', col);
            th.style.cssText = `${frozenSticky} top:0; background:${isColSelectedForCopy ? 'var(--accent-subtle, rgba(99,102,241,0.18))' : 'var(--bg-color)'}; padding:10px 16px 10px 8px; border-bottom:1px solid var(--panel-border); font-weight:600; cursor:pointer; user-select:none; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; box-sizing:border-box; transition:background 0.2s; color:${isColSelectedForCopy ? 'var(--accent)' : 'inherit'}; ${frozenShadow}`;
            th.title = '点击表头选择列以供复制 (支持 Ctrl/Shift 多选)；点击右侧标题排序；点击图钉冻结固定列';

            // Checkbox for column selection
            const colChk = document.createElement('input');
            colChk.type = 'checkbox';
            colChk.checked = isColSelectedForCopy;
            colChk.style.cssText = 'margin-right:5px; cursor:pointer; vertical-align:middle; accent-color:var(--accent);';
            colChk.title = '选中/取消此列以供复制 (含列名)';
            colChk.onclick = (e) => {
                e.stopPropagation();
                if (colChk.checked) selectedColForCopy.add(col);
                else selectedColForCopy.delete(col);
                if (updateCopyToolbar) updateCopyToolbar();
                renderTable();
            };
            th.appendChild(colChk);

            // Frozen Pin in Header
            const pinIcon = document.createElement('span');
            pinIcon.style.cssText = `margin-right:5px; font-size:0.75rem; cursor:pointer; opacity:${isFrozen ? '1' : '0.28'}; transition:opacity 0.2s; vertical-align:middle; display:inline-block;`;
            pinIcon.title = isFrozen ? '已冻结固定在左侧 (点击解除固定)' : '点击冻结固定在左侧 (左右横向滚动不移动)';
            pinIcon.innerHTML = '📌';
            pinIcon.onmouseenter = () => pinIcon.style.opacity = '1';
            pinIcon.onmouseleave = () => pinIcon.style.opacity = isFrozen ? '1' : '0.28';
            pinIcon.onclick = (e) => {
                e.stopPropagation();
                if (frozenCols.has(col)) {
                    frozenCols.delete(col);
                } else {
                    frozenCols.add(col);
                }
                savePreferences();
                if (renderColItems) renderColItems();
                renderTable();
            };
            th.appendChild(pinIcon);

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
            titleSpan.style.cssText = 'display:inline-block; max-width:calc(100% - 68px); overflow:hidden; text-overflow:ellipsis; vertical-align:middle; cursor:pointer;';
            titleSpan.title = '点击按此列排序 (按住 Shift 多列排序)';
            titleSpan.innerHTML = displayNames[idx] + arrow;
            th.appendChild(titleSpan);

            // Column Header Filter Funnel Button
            const isColFiltered = !!(columnFilters[col] && columnFilters[col].size !== undefined);
            const filterBtn = document.createElement('button');
            filterBtn.type = 'button';
            filterBtn.className = `uni-col-filter-btn ${isColFiltered ? 'active' : ''}`;
            filterBtn.title = isColFiltered ? `此列已激活筛选 (${columnFilters[col].size} 项已选)，点击查看或调整` : `筛选列: ${displayNames[idx]}`;
            filterBtn.innerHTML = `
                <svg width="11" height="11" viewBox="0 0 24 24" fill="${isColFiltered ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="${isColFiltered ? '2.5' : '2'}" stroke-linecap="round" stroke-linejoin="round">
                    <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"></polygon>
                </svg>
            `;
            filterBtn.onclick = (e) => {
                e.stopPropagation();
                openColumnFilterPopover(col, filterBtn);
            };
            th.appendChild(filterBtn);

            // Visual Column Resizer Handle (Single unified divider handle)
            const resizer = document.createElement('div');
            resizer.className = 'uni-col-resizer';
            resizer.style.cssText = 'position:absolute; top:0; right:-4px; width:8px; height:100%; cursor:col-resize; user-select:none; z-index:30; display:flex; align-items:center; justify-content:center;';
            
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
                        if (frozenCols.has(col)) {
                            renderTable();
                        }
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
                if (frozenCols.has(col)) {
                    renderTable();
                }
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
                const isFrozen = frozenCols.has(col);
                const isLastFrozen = (col === lastFrozenCol);
                const colHighlight = isSelectedCol ? 'background: rgba(99, 102, 241, 0.08) !important;' : '';
                const frozenShadow = isLastFrozen ? 'box-shadow: 3px 0 8px -2px rgba(0,0,0,0.35); border-right: 2px solid var(--accent, #6366f1) !important;' : '';
                const frozenSticky = isFrozen ? `position: sticky; left: ${colStickyLeft[col]}px; z-index: 10; background: var(--bg-color);` : '';
                const cellCommonStyle = `padding: 6px 12px; color: var(--text-primary); border-bottom: 1px solid var(--panel-border); border-right: 1px solid var(--overlay-5); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; ${colHighlight} ${frozenSticky} ${frozenShadow}`;

                let val = row[col];
                let cellHtml = '';
                let cellTitle = '';
                
                if (options.cellRenderer) {
                    const customHtml = options.cellRenderer(col, val, row);
                    if (customHtml !== undefined) {
                        htmlRows += `<td style="${cellCommonStyle}">${customHtml}</td>`;
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
                
                htmlRows += `<td title="${cellTitle}" style="${cellCommonStyle}">${cellHtml}</td>`;
            });
            htmlRows += `</tr>`;
        });
        tbody.innerHTML = htmlRows;
    };

    renderTable();

    // Global Ctrl+C / Cmd+C shortcut listener for copying columns & ESC for closing filter popover
    const handleKeyDown = (e) => {
        if (e.key === 'Escape' && activeFilterPopover) {
            e.stopPropagation();
            closeColumnFilterPopover();
            return;
        }
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

    // Clean up keydown listener and filter popover on close
    const originalClose = closeBtn.onclick;
    closeBtn.onclick = (e) => {
        document.removeEventListener('keydown', handleKeyDown);
        document.removeEventListener('mousedown', handleGlobalMouseDownForPopover);
        if (typeof closeColumnFilterPopover === 'function') closeColumnFilterPopover();
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
