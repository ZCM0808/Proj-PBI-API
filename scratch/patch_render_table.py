import re

with open('static/script.js', 'r', encoding='utf-8') as f:
    content = f.read()

# Replace from `if (arr && arr.length > 0 && typeof arr[0] === 'object') {` to `container.appendChild(wrapper);\n    } else {`
start_marker = "if (arr && arr.length > 0 && typeof arr[0] === 'object') {"
end_marker = "    } else {\n        const wrapper = document.createElement('div');"

# Find the block
start_idx = content.find(start_marker)
end_idx = content.find(end_marker, start_idx)

if start_idx != -1 and end_idx != -1:
    old_block = content[start_idx:end_idx]
    
    new_block = """if (arr && arr.length > 0 && typeof arr[0] === 'object') {
        const keys = new Set();
        arr.forEach(item => {
            if(item && typeof item === 'object') {
                Object.keys(item).forEach(k => keys.add(k));
            }
        });
        const allColumns = Array.from(keys);
        
        if (!container._jsonSelectedCols || container._jsonNodePath !== nodePath) {
            container._jsonSelectedCols = new Set(allColumns);
            container._jsonNodePath = nodePath;
        }
        
        container.innerHTML = '';
        const wrapper = document.createElement('div');
        wrapper.style.cssText = "width: 100%; font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; font-size: 0.8rem; display: flex; flex-direction: column;";
        
        const infoHeader = document.createElement('div');
        infoHeader.style.cssText = "display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; font-weight: 600; font-size: 0.85rem; flex-wrap: wrap; gap: 8px;";
        
        const leftDiv = document.createElement('div');
        leftDiv.style.cssText = "display: flex; align-items: center; gap: 10px;";
        const titleSpan = document.createElement('span');
        titleSpan.textContent = nodePath ? "Table Path: " + nodePath : "JSON Table View";
        titleSpan.style.color = "var(--accent)";
        
        const dropdownDiv = document.createElement('div');
        dropdownDiv.style.cssText = 'position:relative;display:inline-block;z-index:10;';
        
        const dropdownBtn = document.createElement('button');
        dropdownBtn.className = 'wf-input';
        dropdownBtn.style.cssText = 'padding:4px 10px;font-size:0.75rem;cursor:pointer;display:flex;align-items:center;gap:6px;background:var(--bg-color);border:1px solid var(--panel-border);color:var(--text-primary);border-radius:4px;';
        
        const dropdownList = document.createElement('div');
        dropdownList.style.cssText = 'display:none;position:absolute;top:100%;left:0;margin-top:4px;background:var(--dropdown-bg, #1a1a24);border:1px solid var(--panel-border);border-radius:6px;box-shadow:0 8px 24px rgba(0,0,0,0.8);max-height:220px;overflow-y:auto;width:240px;padding:6px;z-index:2000;';
        
        dropdownBtn.onclick = (e) => {
            e.stopPropagation();
            dropdownList.style.display = dropdownList.style.display === 'block' ? 'none' : 'block';
        };
        document.addEventListener('click', (e) => {
            if (!dropdownDiv.contains(e.target)) dropdownList.style.display = 'none';
        });
        
        dropdownDiv.appendChild(dropdownBtn);
        dropdownDiv.appendChild(dropdownList);
        leftDiv.appendChild(titleSpan);
        leftDiv.appendChild(dropdownDiv);
        
        const statsSpan = document.createElement('span');
        statsSpan.style.cssText = "color: var(--text-secondary); background: var(--overlay-5); padding: 4px 8px; border-radius: 4px; border: 1px solid var(--panel-border);";
        
        infoHeader.appendChild(leftDiv);
        infoHeader.appendChild(statsSpan);
        wrapper.appendChild(infoHeader);
        
        const tableContainer = document.createElement('div');
        tableContainer.style.cssText = "width: 100%; overflow-x: auto;";
        wrapper.appendChild(tableContainer);
        container.appendChild(wrapper);

        const renderTableAndDropdown = () => {
            let listHtml = `<div style="display:flex;justify-content:space-between;padding:4px 6px;border-bottom:1px solid var(--overlay-10);margin-bottom:4px;">
                <span style="color:var(--accent);cursor:pointer;font-weight:bold;" onclick="this.parentElement.parentElement._selectAll(true)">Select All</span>
                <span style="color:var(--text-secondary);cursor:pointer;" onclick="this.parentElement.parentElement._selectAll(false)">Deselect All</span>
            </div>`;
            allColumns.forEach(col => {
                const checked = container._jsonSelectedCols.has(col) ? 'checked' : '';
                listHtml += `<label style="display:flex;align-items:center;gap:6px;padding:4px 6px;cursor:pointer;font-size:0.75rem;border-radius:4px;" onmouseover="this.style.background='var(--overlay-5)'" onmouseout="this.style.background='transparent'">
                    <input type="checkbox" ${checked} value="${col.replace(/"/g, '&quot;')}" style="cursor:pointer;" onchange="this.parentElement.parentElement._toggleCol(this.value, this.checked)">
                    <span style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap;" title="${col}">${col}</span>
                </label>`;
            });
            dropdownList.innerHTML = listHtml;
            
            dropdownList._toggleCol = (col, isChecked) => {
                if (isChecked) container._jsonSelectedCols.add(col);
                else container._jsonSelectedCols.delete(col);
                renderTableAndDropdown();
            };
            dropdownList._selectAll = (selectAll) => {
                if (selectAll) container._jsonSelectedCols = new Set(allColumns);
                else container._jsonSelectedCols.clear();
                renderTableAndDropdown();
            };
            
            const activeCols = allColumns.filter(c => container._jsonSelectedCols.has(c));
            dropdownBtn.innerHTML = `Select Columns (${activeCols.length}/${allColumns.length}) <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 9l6 6 6-6"/></svg>`;
            statsSpan.textContent = `${arr.length} rows × ${activeCols.length} cols`;
            
            tableContainer.innerHTML = '';
            if (activeCols.length === 0) {
                tableContainer.innerHTML = '<div style="padding:20px;text-align:center;color:var(--text-secondary);">No columns selected to display.</div>';
                return;
            }
            
            const table = document.createElement('table');
            table.className = 'data-table';
            table.style.cssText = "width: 100%; border-collapse: collapse; text-align: left;";
            
            const thead = document.createElement('thead');
            thead.style.cssText = "position: sticky; top: 0; background: var(--bg-color); z-index: 5;";
            const trHead = document.createElement('tr');
            activeCols.forEach((col, idx) => {
                const th = document.createElement('th');
                th.textContent = col;
                th.style.cssText = "padding: 8px 12px; border-bottom: 1px solid var(--panel-border); font-weight: 600; cursor: pointer; user-select: none; resize: horizontal; overflow: hidden; min-width: 50px; max-width: 250px; white-space: nowrap; text-overflow: ellipsis;";
                th.title = col + " (Click to sort, Drag right edge to resize)";
                th.onclick = (e) => window.sortTable(th, e, idx);
                trHead.appendChild(th);
            });
            thead.appendChild(trHead);
            table.appendChild(thead);
            
            const tbody = document.createElement('tbody');
            arr.forEach(item => {
                const tr = document.createElement('tr');
                tr.style.cssText = "transition: background 0.2s; cursor: default;";
                tr.onmouseover = () => tr.style.background = "rgba(255,255,255,0.02)";
                tr.onmouseout = () => tr.style.background = "transparent";
                activeCols.forEach(col => {
                    const td = document.createElement('td');
                    td.style.cssText = "border: 1px solid var(--panel-border); padding: 8px; color: var(--text-primary); max-width: 300px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;";
                    let val = item ? item[col] : undefined;
                    if (typeof val === 'object' && val !== null) {
                        td.textContent = JSON.stringify(val);
                    } else {
                        td.textContent = val !== undefined && val !== null ? String(val) : '';
                    }
                    td.title = td.textContent;
                    tr.appendChild(td);
                });
                tbody.appendChild(tr);
            });
            table.appendChild(tbody);
            tableContainer.appendChild(table);
        };
        
        renderTableAndDropdown();
"""
    content = content[:start_idx] + new_block + content[end_idx:]
    
    # Also fix the else block (for Key Value objects) where headers can be too wide
    old_th = "th.style.cssText = `padding: 8px 12px; border-bottom: 1px solid var(--panel-border); font-weight: 600; cursor: pointer; user-select: none; resize: horizontal; overflow: hidden; min-width: 50px; ${idx === 0 ? 'width: 30%;' : ''}`;"
    new_th = "th.style.cssText = `padding: 8px 12px; border-bottom: 1px solid var(--panel-border); font-weight: 600; cursor: pointer; user-select: none; resize: horizontal; overflow: hidden; min-width: 50px; max-width: 250px; white-space: nowrap; text-overflow: ellipsis; ${idx === 0 ? 'width: 30%;' : ''}`;"
    content = content.replace(old_th, new_th)

    with open('static/script.js', 'w', encoding='utf-8') as f:
        f.write(content)
    print("renderJsonTable patched for column picker and overflow.")
else:
    print("Could not find blocks.")
