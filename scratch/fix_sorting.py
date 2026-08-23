import codecs

def patch_sort_table():
    path = r"D:\ZCM\Proj-PBI-API\static\script.js"
    with codecs.open(path, 'r', encoding='utf-8') as f:
        content = f.read()

    old_logic = """      headers.forEach((th, idx) => {
          let text = th.getAttribute('data-original-text');
          if (!text) {
              text = th.innerText.replace(/ [▲▼][\\d]*$/, '');
              th.setAttribute('data-original-text', text);
          }
          
          let sortInfo = sorts.findIndex(s => s.colIndex === idx);
          if (sortInfo >= 0) {
              let s = sorts[sortInfo];
              let arrow = s.dir === 'asc' ? '▲' : '▼';
              let priority = sorts.length > 1 ? (sortInfo + 1) : '';
              th.innerText = `${text} ${arrow}${priority}`;
              th.style.color = 'var(--accent)';
          } else {
              th.innerText = text;
              th.style.color = '';
          }
      });"""

    new_logic = """      headers.forEach((th, idx) => {
          let targetNode = th.querySelector('span:not(.col-resizer)');
          if (!targetNode) targetNode = th;
          
          let text = targetNode.getAttribute('data-original-text');
          if (!text) {
              text = targetNode.innerText.replace(/ [▲▼][\\d]*$/, '');
              targetNode.setAttribute('data-original-text', text);
          }
          
          let sortInfo = sorts.findIndex(s => s.colIndex === idx);
          if (sortInfo >= 0) {
              let s = sorts[sortInfo];
              let arrow = s.dir === 'asc' ? '▲' : '▼';
              let priority = sorts.length > 1 ? (sortInfo + 1) : '';
              targetNode.innerText = `${text} ${arrow}${priority}`;
              targetNode.style.color = 'var(--accent)';
          } else {
              targetNode.innerText = text;
              targetNode.style.color = '';
          }
      });"""

    if old_logic in content:
        content = content.replace(old_logic, new_logic)
        with codecs.open(path, 'w', encoding='utf-8') as f:
            f.write(content)
        print("Successfully patched window.sortTable")
    else:
        print("Failed to find old logic. Might already be patched or formatting differs.")

if __name__ == "__main__":
    patch_sort_table()
