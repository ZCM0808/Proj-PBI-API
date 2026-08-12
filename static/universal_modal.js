/**
 * Universal Data Modal Component
 * Dynamically generates a premium data grid modal with search, column selection, sorting, and export.
 */
window.showUniversalDataModal = function(options) {
    // Inject hardware-accelerated CSS hover rules globally once
    if (!document.getElementById('uni-modal-style')) {
        const style = document.createElement('style');
        style.id = 'uni-modal-style';
        style.textContent = `
            .uni-modal-table tbody tr { transition: background 0.2s; }
            .uni-modal-table tbody tr:hover { background: var(--overlay-10) !important; }
        `;
        document.head.appendChild(style);
    }

    const title = options.title || 'Data View';
    const data = options.data || [];
    const columns = options.columns || (data.length > 0 ? Object.keys(data[0]) : []);
    const displayNames = options.displayNames || columns;
    const enableSearch = options.enableSearch !== false;
    const enableColumnFilter = options.enableColumnFilter !== false;

    // State
    let selectedCols = new Set(columns);
    let searchText = "";
    let sortState = []; // Array of {index, asc}

    // Remove existing if any
    let existing = document.getElementById('universal-modal-overlay');
    if (existing) existing.remove();

    // Create overlay
    const overlay = document.createElement('div');
    overlay.id = 'universal-modal-overlay';
    overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.55);display:flex;align-items:center;justify-content:center;z-index:20000;opacity:0;transition:opacity 0.25s;';
    
    // Panel
    const panel = document.createElement('div');
    panel.className = 'glass-panel';
    panel.style.cssText = [
        'position:relative','background:var(--bg-color)','border:1px solid var(--panel-border)',
        'border-radius:10px','box-shadow:0 24px 80px rgba(0,0,0,0.5)',
        'width:90vw','height:85vh','max-width:1200px','min-width:450px','min-height:300px',
        'display:flex','flex-direction:column','overflow:hidden',
        'resize:both','transform:scale(0.94)','transition:transform 0.25s'
    ].join(';');

    // Header
    const hdr = document.createElement('div');
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

    // Copy Button
    const copyBtn = document.createElement('button');
    copyBtn.className = 'icon-btn copy-btn';
    copyBtn.title = 'Copy Visible Data';
    copyBtn.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>`;
    copyBtn.onclick = () => {
        const visibleData = getFilteredData();
        if (visibleData.length === 0) {
            window.showNotification('No data to copy', 'warning');
            return;
        }
        const visibleCols = columns.filter(c => selectedCols.has(c));
        const headerRow = visibleCols.map(c => displayNames[columns.indexOf(c)]).join('\t');
        const lines = [headerRow];
        visibleData.forEach(row => {
            lines.push(visibleCols.map(c => (row[c] !== null && row[c] !== undefined ? row[c].toString() : '')).join('\t'));
        });
        window.handleCopyAction(copyBtn, lines.join('\n'));
    };
    hdrActions.appendChild(copyBtn);

    // Close Button
    const closeBtn = document.createElement('button');
    closeBtn.className = 'close-btn';
    closeBtn.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 6L6 18M6 6l12 12"/></svg>`;
    closeBtn.onclick = () => {
        overlay.style.opacity = '0';
        const tx = panel.getAttribute('data-translate-x') || 0;
        const ty = panel.getAttribute('data-translate-y') || 0;
        panel.style.transition = 'transform 0.25s, opacity 0.25s';
        if (tx != 0 || ty != 0) {
            panel.style.transform = `translate3d(${tx}px, ${ty}px, 0) scale(0.94)`;
        } else {
            panel.style.transform = 'scale(0.94)';
        }
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

    // Filter Bar (Column Selector)
    let filterBar = null;
    let colDropdownBtn = null;
    let renderColItems = null;
    if (enableColumnFilter && columns.length > 0) {
        filterBar = document.createElement('div');
        filterBar.style.cssText = 'padding:6px 16px;background:var(--overlay-5);border-bottom:1px solid var(--overlay-10);display:flex;align-items:center;gap:10px;font-size:0.75rem;flex-shrink:0;position:relative;z-index:20;';
        
        const filterLabel = document.createElement('span');
        filterLabel.style.cssText = 'font-weight:bold;color:var(--text-secondary);';
        filterLabel.textContent = 'Visible Fields:';
        filterBar.appendChild(filterLabel);

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
        filterBar.appendChild(dropdownWrapper);
        panel.appendChild(filterBar);

        dropdownHeader.querySelector('#uni-sel-all').onclick = () => {
            selectedCols = new Set(columns);
            renderColItems();
            renderTable();
        };
        dropdownHeader.querySelector('#uni-dsel-all').onclick = () => {
            selectedCols.clear();
            renderColItems();
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
                    else selectedCols.delete(col);
                    renderColItems();
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
    }

    // Body
    const body = document.createElement('div');
    body.id = 'universal-modal-body';
    body.style.cssText = 'flex:1;overflow:auto;padding:12px;';
    
    const tableId = 'uni-modal-table-' + Math.random().toString(36).substr(2, 9);
    const table = document.createElement('table');
    table.id = tableId;
    table.className = 'data-table uni-modal-table';
    table.setAttribute('data-table-id', tableId);
    table.style.cssText = 'width: 100%; border-collapse: collapse; font-size: 0.82rem; text-align: left;';
    
    const thead = document.createElement('thead');
    thead.style.cssText = 'position: sticky; top: 0; background: var(--bg-color); z-index: 5; box-shadow: 0 1px 0 var(--panel-border);';
    
    const tbody = document.createElement('tbody');
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

        // Render Head
        thead.innerHTML = '';
        const trHead = document.createElement('tr');
        columns.forEach((col, idx) => {
            if (!selectedCols.has(col)) return;
            const th = document.createElement('th');
            th.style.cssText = 'padding:8px 12px; border-bottom:1px solid var(--panel-border); font-weight:600; cursor:pointer; user-select:none; resize:horizontal; overflow:hidden; min-width:80px; white-space:nowrap;';
            th.title = 'Click to sort, Shift+Click multi-sort, Drag right edge to resize';
            
            let arrow = '';
            const existingSort = sortState.find(s => s.index === idx);
            if (existingSort) {
                arrow = existingSort.asc ? ' ↑' : ' ↓';
                th.style.color = 'var(--accent)';
                if (sortState.length > 1) {
                    arrow += ` <span style="font-size:0.65rem;color:var(--text-secondary);">${sortState.indexOf(existingSort) + 1}</span>`;
                }
            }
            
            th.innerHTML = displayNames[idx] + arrow;
            th.onclick = (e) => {
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
                
                let val = row[col];
                let cellHtml = '';
                let cellTitle = '';
                
                if (options.cellRenderer) {
                    const customHtml = options.cellRenderer(col, val, row);
                    if (customHtml !== undefined) {
                        htmlRows += `<td style="padding: 6px 12px; color: var(--text-primary); border-bottom: 1px solid var(--panel-border); max-width: 300px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${customHtml}</td>`;
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
                
                htmlRows += `<td title="${cellTitle}" style="padding: 6px 12px; color: var(--text-primary); border-bottom: 1px solid var(--panel-border); max-width: 300px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${cellHtml}</td>`;
            });
            htmlRows += `</tr>`;
        });
        tbody.innerHTML = htmlRows;
    };

    renderTable();

    // Animate in
    requestAnimationFrame(() => {
        overlay.style.opacity = '1';
        panel.style.transform = 'scale(1)';
    });
};
