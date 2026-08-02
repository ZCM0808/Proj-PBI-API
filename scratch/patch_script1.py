import re

with open('static/script.js', 'r', encoding='utf-8') as f:
    js = f.read()

# 1. Add updateDsTableDisplay
update_fn = """
window.updateDsTableDisplay = function() {
    const checkboxes = document.querySelectorAll('.wf-ds-table-cb:checked');
    const displaySpan = document.getElementById('wf-ds-table-display');
    const selectAllCb = document.getElementById('wf-ds-table-select-all');
    const allCheckboxes = document.querySelectorAll('.wf-ds-table-cb');
    
    if (selectAllCb) {
        selectAllCb.checked = checkboxes.length === allCheckboxes.length && allCheckboxes.length > 0;
    }
    
    window.selectedDsTables = Array.from(checkboxes).map(cb => cb.value);
    
    if (window.selectedDsTables.length === 0) {
        displaySpan.innerText = '-- Select Tables --';
        displaySpan.style.color = 'var(--text-secondary)';
    } else if (window.selectedDsTables.length === 1) {
        displaySpan.innerText = window.selectedDsTables[0];
        displaySpan.style.color = 'var(--text-primary)';
    } else {
        displaySpan.innerText = `${window.selectedDsTables.length} table(s) selected`;
        displaySpan.style.color = 'var(--text-primary)';
    }
};
"""

js = js.replace('window.selectDsTable = function(val, text) {', update_fn + '\nwindow.selectDsTable = function(val, text) {')

# 2. Update loadDatasetTablesStep1 UI creation
old_html_gen = """            optionsUl.innerHTML = '';
            if(tables.length === 0) {
                optionsUl.innerHTML = '<li style="padding: 8px 12px; font-size: 0.85rem; cursor: not-allowed; color: var(--text-secondary);">-- No Tables Found --</li>';
                displaySpan.innerText = '-- No Tables Found --';
                displaySpan.style.color = 'var(--text-secondary)';
                triggerDiv.style.cursor = 'not-allowed';
            } else {
                tables.forEach(t => {
                    const li = document.createElement('li');
                    li.style.cssText = 'padding: 8px 12px; font-size: 0.85rem; cursor: pointer; color: var(--text-primary); transition: background 0.15s ease; border-radius: 4px; margin: 0 4px;';
                    li.innerText = t;
                    li.onmouseover = () => li.style.background = 'var(--overlay-10)';
                    li.onmouseout = () => li.style.background = 'transparent';
                    li.onclick = (e) => { e.stopPropagation(); window.selectDsTable(t, t); };
                    optionsUl.appendChild(li);
                });
                
                // Highlight step 2 UI
                document.getElementById('wf-ds-step-2').classList.add('active');
                document.getElementById('wf-out-ds-step2').innerText = "✅ Step 1 complete. Ready to execute Step 2.";
                container.style.opacity = '1';
                triggerDiv.style.cursor = 'pointer';
                displaySpan.innerText = '-- Click to Select Table --';
                displaySpan.style.color = 'var(--text-primary)';
                document.getElementById('wf-ds-table').value = ''; // clear hidden value
            }"""

new_html_gen = """            window.selectedDsTables = [];
            optionsUl.innerHTML = '';
            if(tables.length === 0) {
                optionsUl.innerHTML = '<li style="padding: 8px 12px; font-size: 0.85rem; cursor: not-allowed; color: var(--text-secondary);">-- No Tables Found --</li>';
                displaySpan.innerText = '-- No Tables Found --';
                displaySpan.style.color = 'var(--text-secondary)';
                triggerDiv.style.cursor = 'not-allowed';
            } else {
                const selectAllLi = document.createElement('li');
                selectAllLi.style.cssText = 'padding: 8px 12px; font-size: 0.85rem; cursor: pointer; color: var(--text-primary); transition: background 0.15s ease; border-radius: 4px; margin: 0 4px; border-bottom: 1px solid var(--panel-border); font-weight: bold; position: sticky; top: 0; background: var(--dropdown-bg); z-index: 2;';
                selectAllLi.innerHTML = `<label style="display: flex; align-items: center; gap: 8px; cursor: pointer; margin: 0; width: 100%;"><input type="checkbox" id="wf-ds-table-select-all" style="cursor: pointer;"> Select All Tables</label>`;
                
                selectAllLi.querySelector('input').onclick = (e) => {
                    const checked = e.target.checked;
                    const checkboxes = optionsUl.querySelectorAll('.wf-ds-table-cb');
                    checkboxes.forEach(cb => cb.checked = checked);
                    window.updateDsTableDisplay();
                };
                selectAllLi.onclick = (e) => {
                    if (e.target.tagName !== 'INPUT') {
                        const cb = selectAllLi.querySelector('input');
                        cb.checked = !cb.checked;
                        cb.onclick({target: cb});
                    }
                };
                optionsUl.appendChild(selectAllLi);
                
                tables.forEach(t => {
                    const li = document.createElement('li');
                    li.style.cssText = 'padding: 8px 12px; font-size: 0.85rem; cursor: pointer; color: var(--text-primary); transition: background 0.15s ease; border-radius: 4px; margin: 0 4px;';
                    li.innerHTML = `<label style="display: flex; align-items: center; gap: 8px; cursor: pointer; margin: 0; width: 100%;"><input type="checkbox" value="${t.replace(/"/g, '&quot;')}" class="wf-ds-table-cb" style="cursor: pointer;"> ${t}</label>`;
                    li.onmouseover = () => li.style.background = 'var(--overlay-10)';
                    li.onmouseout = () => li.style.background = 'transparent';
                    li.querySelector('input').onclick = (e) => {
                        window.updateDsTableDisplay();
                    };
                    li.onclick = (e) => {
                        if (e.target.tagName !== 'INPUT') {
                            const cb = li.querySelector('input');
                            cb.checked = !cb.checked;
                            window.updateDsTableDisplay();
                        }
                    };
                    optionsUl.appendChild(li);
                });
                
                document.getElementById('wf-ds-export-format').disabled = false;
                document.getElementById('wf-ds-export-format').style.cursor = 'pointer';
                
                // Highlight step 2 UI
                document.getElementById('wf-ds-step-2').classList.add('active');
                document.getElementById('wf-out-ds-step2').innerText = "✅ Step 1 complete. Ready to execute Step 2.";
                container.style.opacity = '1';
                triggerDiv.style.cursor = 'pointer';
                displaySpan.innerText = '-- Select Tables --';
                displaySpan.style.color = 'var(--text-secondary)';
            }"""
js = js.replace(old_html_gen, new_html_gen)

with open('static/script.js', 'w', encoding='utf-8') as f:
    f.write(js)
