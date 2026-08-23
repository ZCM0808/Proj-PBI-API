import codecs
import re

def fix_script():
    path = "static/script.js"
    with codecs.open(path, 'r', encoding='utf-8') as f:
        content = f.read()
    
    start_pattern = r'window\.sortTable = function\(thElement, event, colIndex\) \{'
    match = re.search(start_pattern, content)
    if not match:
        print("Could not find window.sortTable")
        return
        
    start_idx = match.start()
    
    end_pattern = r'// --- Global User Manager Logic ---'
    match_end = re.search(end_pattern, content[start_idx:])
    if not match_end:
        print("Could not find end of window.sortTable")
        return
        
    end_idx = start_idx + match_end.start()
    
    new_func = """window.sortTable = function(thElement, event, colIndex) {
    try {
        if (event && event.shiftKey) {
            window.getSelection()?.removeAllRanges();
        }
        
        const table = thElement.closest('table');
        if (!table) return;
        
        const tbody = table.querySelector('tbody');
        if (!tbody) return;
        
        // Dynamically assign a unique table ID if missing
        if (!table.hasAttribute('data-table-id')) {
            table.setAttribute('data-table-id', 'table_' + Math.random().toString(36).substr(2, 9));
        }
        const tableId = table.getAttribute('data-table-id');
        const headers = Array.from(table.querySelectorAll('th'));
        
        if (!window.tableSortStates) window.tableSortStates = {};
        if (!window.tableSortStates[tableId]) window.tableSortStates[tableId] = [];
        
        let sorts = window.tableSortStates[tableId];
        let existingIdx = sorts.findIndex(s => s.colIndex === colIndex);
        
        if (!event || !event.shiftKey) {
            if (existingIdx >= 0) {
                const currentDir = sorts[existingIdx].dir;
                sorts = [{ colIndex: colIndex, dir: currentDir === 'asc' ? 'desc' : 'asc' }];
            } else {
                sorts = [{ colIndex: colIndex, dir: 'asc' }];
            }
        } else {
            if (existingIdx >= 0) {
                sorts[existingIdx].dir = sorts[existingIdx].dir === 'asc' ? 'desc' : 'asc';
            } else {
                sorts.push({ colIndex: colIndex, dir: 'asc' });
            }
        }
        window.tableSortStates[tableId] = sorts;
        
        headers.forEach((th, idx) => {
            let targetNode = th.querySelector('span:not(.col-resizer)');
            if (!targetNode) targetNode = th;
            
            let text = targetNode.getAttribute('data-original-text');
            if (!text) {
                text = targetNode.textContent.replace(/\\s*[\\u25B2\\u25BC][\\d]*$/, '').trim();
                targetNode.setAttribute('data-original-text', text);
            }
            
            let sortInfo = sorts.findIndex(s => s.colIndex === idx);
            if (sortInfo >= 0) {
                let s = sorts[sortInfo];
                let arrow = s.dir === 'asc' ? '\\u25B2' : '\\u25BC';
                let priority = sorts.length > 1 ? (sortInfo + 1) : '';
                targetNode.textContent = `${text} ${arrow}${priority}`;
                targetNode.style.color = 'var(--accent)';
            } else {
                targetNode.textContent = text;
                targetNode.style.color = '';
            }
        });
        
        let rows = Array.from(tbody.querySelectorAll('tr'));
        rows.sort((a, b) => {
            for (let s of sorts) {
                let tdA = a.children[s.colIndex];
                let tdB = b.children[s.colIndex];
                if (!tdA || !tdB) continue;
                
                let cellA = (tdA.textContent || '').trim();
                let cellB = (tdB.textContent || '').trim();
                
                let numA = parseFloat(cellA);
                let numB = parseFloat(cellB);
                
                let cmp = 0;
                const isNumA = !isNaN(numA) && numA.toString() === cellA;
                const isNumB = !isNaN(numB) && numB.toString() === cellB;
                
                if (isNumA && isNumB) {
                    cmp = numA - numB;
                } else {
                    cmp = cellA.localeCompare(cellB, undefined, {numeric: true, sensitivity: 'base'});
                }
                
                if (cmp !== 0) {
                    return s.dir === 'asc' ? cmp : -cmp;
                }
            }
            return 0;
        });
        
        const parent = tbody.parentNode;
        const nextSibling = tbody.nextSibling;
        parent.removeChild(tbody);
        rows.forEach(r => tbody.appendChild(r));
        if (nextSibling) {
            parent.insertBefore(tbody, nextSibling);
        } else {
            parent.appendChild(tbody);
        }
        
    } catch (err) {
        console.error("Sorting failed:", err);
    }
};

"""
    new_content = content[:start_idx] + new_func + content[end_idx:]
    
    with codecs.open(path, 'w', encoding='utf-8') as f:
        f.write(new_content)
    print("Replaced window.sortTable!")

if __name__ == "__main__":
    fix_script()
