import codecs

def fix():
    path = r"D:\ZCM\Proj-PBI-API\static\script.js"
    with codecs.open(path, 'r', encoding='utf-8') as f:
        content = f.read()

    start_str = "window.sortTable = function(thElement, event, colIndex) {"
    end_str = "// --- Global User Manager Logic ---"

    start_idx = content.find(start_str)
    end_idx = content.find(end_str)

    if start_idx != -1 and end_idx != -1:
        new_sort = """window.sortTable = function(thElement, event, colIndex) {
    if (event.shiftKey) {
        window.getSelection()?.removeAllRanges();
    }
    const table = thElement.closest('table');
    const tableId = table.getAttribute('data-table-id') || 'default_table';
    const tbody = table.querySelector('tbody');
    const headers = Array.from(table.querySelectorAll('th'));
    
    if (!window.tableSortStates[tableId]) {
        window.tableSortStates[tableId] = [];
    }
    let sorts = window.tableSortStates[tableId];
    let existingIdx = sorts.findIndex(s => s.colIndex === colIndex);
    
    if (!event.shiftKey) {
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
            text = targetNode.innerText.replace(/ [\\u25B2\\u25BC][\\d]*$/, '');
            targetNode.setAttribute('data-original-text', text);
        }
        
        let sortInfo = sorts.findIndex(s => s.colIndex === idx);
        if (sortInfo >= 0) {
            let s = sorts[sortInfo];
            let arrow = s.dir === 'asc' ? '\\u25B2' : '\\u25BC';
            let priority = sorts.length > 1 ? (sortInfo + 1) : '';
            targetNode.innerText = `${text} ${arrow}${priority}`;
            targetNode.style.color = 'var(--accent)';
        } else {
            targetNode.innerText = text;
            targetNode.style.color = '';
        }
    });
    
    let rows = Array.from(tbody.querySelectorAll('tr'));
    rows.sort((a, b) => {
        for (let s of sorts) {
            let tdA = a.children[s.colIndex];
            let tdB = b.children[s.colIndex];
            if (!tdA || !tdB) continue;
            
            let cellA = tdA.innerText.trim();
            let cellB = tdB.innerText.trim();
            
            let numA = parseFloat(cellA);
            let numB = parseFloat(cellB);
            
            let cmp = 0;
            if (!isNaN(numA) && !isNaN(numB) && cellA === numA.toString()) {
                cmp = numA - numB;
            } else {
                cmp = cellA.localeCompare(cellB);
            }
            
            if (cmp !== 0) {
                return s.dir === 'asc' ? cmp : -cmp;
            }
        }
        return 0;
    });
    
    rows.forEach(r => tbody.appendChild(r));
};

"""
        content = content[:start_idx] + new_sort + content[end_idx:]
        with codecs.open(path, 'w', encoding='utf-8') as f:
            f.write(content)
        print("Success")
    else:
        print("Failed", start_idx, end_idx)

if __name__ == "__main__":
    fix()
