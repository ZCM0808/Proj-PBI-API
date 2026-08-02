import re

with open('static/script.js', 'r', encoding='utf-8') as f:
    js = f.read()

target_json_array = """        const table = document.createElement('table');
        table.style.cssText = "width: 100%; border-collapse: collapse; text-align: left;";
        
        const thead = document.createElement('thead');
        const trHead = document.createElement('tr');
        columns.forEach(col => {
            const th = document.createElement('th');
            th.textContent = col;
            th.style.cssText = "border: 1px solid var(--panel-border); padding: 8px; background: var(--shadow-light); color: var(--text-secondary); white-space: nowrap; position: relative;";
            
            const resizer = document.createElement('div');
            resizer.style.cssText = "position: absolute; right: 0; top: 0; bottom: 0; width: 4px; cursor: col-resize; z-index: 1; transition: background 0.2s;";
            resizer.onmouseover = () => resizer.style.background = 'var(--accent)';
            resizer.onmouseout = () => resizer.style.background = 'transparent';
            
            resizer.addEventListener('mousedown', (e) => {
                const startX = e.pageX;
                const startWidth = th.offsetWidth;
                
                const onMouseMove = (moveEvent) => {
                    const newWidth = Math.max(30, startWidth + (moveEvent.pageX - startX));
                    th.style.width = newWidth + 'px';
                    th.style.minWidth = newWidth + 'px';
                    th.style.maxWidth = newWidth + 'px';
                    if (table.style.tableLayout !== 'fixed') {
                        Array.from(trHead.children).forEach(h => {
                            h.style.width = h.offsetWidth + 'px';
                        });
                        table.style.tableLayout = 'fixed';
                    }
                };
                
                const onMouseUp = () => {
                    document.removeEventListener('mousemove', onMouseMove);
                    document.removeEventListener('mouseup', onMouseUp);
                };
                
                document.addEventListener('mousemove', onMouseMove);
                document.addEventListener('mouseup', onMouseUp);
                e.stopPropagation();
                e.preventDefault();
            });
            
            th.appendChild(resizer);
            trHead.appendChild(th);
        });
        thead.appendChild(trHead);"""

replace_json_array = """        const table = document.createElement('table');
        table.className = 'data-table';
        table.style.cssText = "width: 100%; border-collapse: collapse; text-align: left;";
        
        const thead = document.createElement('thead');
        thead.style.cssText = "position: sticky; top: 0; background: var(--bg-color); z-index: 5;";
        const trHead = document.createElement('tr');
        columns.forEach((col, idx) => {
            const th = document.createElement('th');
            th.textContent = col;
            th.style.cssText = "padding: 8px 12px; border-bottom: 1px solid var(--panel-border); font-weight: 600; cursor: pointer; user-select: none; resize: horizontal; overflow: hidden; min-width: 50px;";
            th.title = "Click to sort, Shift+Click for multi-sort, Drag right edge to resize";
            th.onclick = (e) => window.sortTable(th, e, idx);
            trHead.appendChild(th);
        });
        thead.appendChild(trHead);"""


target_json_obj = """        const table = document.createElement('table');
        table.style.cssText = "width: 100%; border-collapse: collapse; text-align: left;";
        
        const thead = document.createElement('thead');
        const trHead = document.createElement('tr');
        ['Key', 'Value'].forEach((col, i) => {
            const th = document.createElement('th');
            th.textContent = col;
            th.style.cssText = `border: 1px solid var(--panel-border); padding: 8px; background: var(--shadow-light); color: var(--text-secondary); position: relative; ${i === 0 ? 'width: 30%;' : ''}`;
            
            const resizer = document.createElement('div');
            resizer.style.cssText = "position: absolute; right: 0; top: 0; bottom: 0; width: 4px; cursor: col-resize; z-index: 1; transition: background 0.2s;";
            resizer.onmouseover = () => resizer.style.background = 'var(--accent)';
            resizer.onmouseout = () => resizer.style.background = 'transparent';
            
            resizer.addEventListener('mousedown', (e) => {
                const startX = e.pageX;
                const startWidth = th.offsetWidth;
                
                const onMouseMove = (moveEvent) => {
                    const newWidth = Math.max(30, startWidth + (moveEvent.pageX - startX));
                    th.style.width = newWidth + 'px';
                    th.style.minWidth = newWidth + 'px';
                    th.style.maxWidth = newWidth + 'px';
                    if (table.style.tableLayout !== 'fixed') {
                        Array.from(trHead.children).forEach(h => {
                            h.style.width = h.offsetWidth + 'px';
                        });
                        table.style.tableLayout = 'fixed';
                    }
                };
                
                const onMouseUp = () => {
                    document.removeEventListener('mousemove', onMouseMove);
                    document.removeEventListener('mouseup', onMouseUp);
                };
                
                document.addEventListener('mousemove', onMouseMove);
                document.addEventListener('mouseup', onMouseUp);
                e.stopPropagation();
                e.preventDefault();
            });
            
            th.appendChild(resizer);
            trHead.appendChild(th);
        });
        thead.appendChild(trHead);"""

replace_json_obj = """        const table = document.createElement('table');
        table.className = 'data-table';
        table.style.cssText = "width: 100%; border-collapse: collapse; text-align: left;";
        
        const thead = document.createElement('thead');
        thead.style.cssText = "position: sticky; top: 0; background: var(--bg-color); z-index: 5;";
        const trHead = document.createElement('tr');
        ['Key', 'Value'].forEach((col, idx) => {
            const th = document.createElement('th');
            th.textContent = col;
            th.style.cssText = `padding: 8px 12px; border-bottom: 1px solid var(--panel-border); font-weight: 600; cursor: pointer; user-select: none; resize: horizontal; overflow: hidden; min-width: 50px; ${idx === 0 ? 'width: 30%;' : ''}`;
            th.title = "Click to sort, Shift+Click for multi-sort, Drag right edge to resize";
            th.onclick = (e) => window.sortTable(th, e, idx);
            trHead.appendChild(th);
        });
        thead.appendChild(trHead);"""

if target_json_array in js and target_json_obj in js:
    js = js.replace(target_json_array, replace_json_array)
    js = js.replace(target_json_obj, replace_json_obj)
    with open('static/script.js', 'w', encoding='utf-8') as f:
        f.write(js)
    print("script.js patched for JSON Viewer!")
else:
    print("Targets not found in script.js!")
    if target_json_array not in js:
        print("target_json_array not found")
    if target_json_obj not in js:
        print("target_json_obj not found")

# Bump version
with open('static/index.html', 'r', encoding='utf-8') as f:
    html = f.read()
html = re.sub(r'v151', 'v152', html)
with open('static/index.html', 'w', encoding='utf-8') as f:
    f.write(html)

