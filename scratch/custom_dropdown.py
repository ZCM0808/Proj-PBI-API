import re

html_path = 'static/index.html'
with open(html_path, 'r', encoding='utf-8') as f:
    html = f.read()

# Remove the duplicated block starting at 535 if it exists
# Let's just find and replace the whole wf-config-export_dataset_tables block.
pattern = r'<div id="wf-config-export_dataset_tables" class="wf-config-pane" style="display: none;">(.*?)</div>\s*<div id="wf-config-export_visual"'

replacement = """<div id="wf-config-export_dataset_tables" class="wf-config-pane" style="display: none;">
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 8px;">
                        <div>
                            <label style="font-size: 0.85rem; color: var(--text-secondary);">Workspace ID</label>
                            <select id="wf-ds-workspace" class="wf-input"></select>
                        </div>
                        <div>
                            <label style="font-size: 0.85rem; color: var(--text-secondary);">Dataset ID</label>
                            <select id="wf-ds-dataset" class="wf-input"></select>
                        </div>
                    </div>
                    
                    <div class="wf-steps-container" style="display: flex; flex-direction: column; gap: 12px; margin-top: 8px;">
                        <!-- Step 1 -->
                        <div class="wf-step" id="wf-ds-step-1">
                            <div class="wf-step-header">
                                <span class="wf-step-title">Step 1: Fetch Available Tables</span>
                                <button id="wf-ds-btn-step1" class="btn-action-secondary wf-step-btn" onclick="window.loadDatasetTablesStep1(this)">Run Step 1</button>
                            </div>
                            <div style="position: relative;">
                                <pre id="wf-out-ds-step1" class="wf-console">Input: Ready to fetch tables...</pre>
                                <button type="button" class="wf-copy-btn" onclick="copyWfConsole('ds-step1', this)" title="Copy Output">
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
                                </button>
                            </div>
                        </div>
                        
                        <!-- Step 2 -->
                        <div class="wf-step" id="wf-ds-step-2">
                            <div class="wf-step-header">
                                <span class="wf-step-title">Step 2: Execute Query & Download (CSV)</span>
                                <div style="display: flex; gap: 8px; align-items: center;">
                                    <button id="wf-ds-btn-step2" class="btn-action-secondary wf-step-btn" onclick="window.executeDatasetStep2(this)">Run Step 2</button>
                                </div>
                            </div>
                            
                            <div id="wf-ds-table-container" style="display: flex; align-items: center; gap: 12px; padding: 10px 12px; background: rgba(0,0,0,0.15); border-bottom: 1px solid var(--border-color); opacity: 0.4; transition: opacity 0.3s ease;">
                                <label style="font-size: 0.85rem; color: var(--text-secondary); white-space: nowrap;">Target Table:</label>
                                <div class="custom-select-wrapper" style="position: relative; flex: 1; max-width: 400px;" id="wf-ds-table-wrapper" onclick="window.toggleDsTableDropdown(event)">
                                    <div class="wf-input" id="wf-ds-table-trigger" style="height: 32px; display: flex; align-items: center; justify-content: space-between; cursor: not-allowed; padding: 0 12px; font-size: 0.85rem; border-radius: 4px; user-select: none;">
                                        <span id="wf-ds-table-display" style="overflow: hidden; text-overflow: ellipsis; white-space: nowrap; color: var(--text-secondary);">-- Run Step 1 First --</span>
                                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="transition: transform 0.2s ease;"><path d="M6 9l6 6 6-6"></path></svg>
                                    </div>
                                    <ul id="wf-ds-table-options" class="wf-input custom-select-dropdown" style="position: absolute; top: calc(100% + 4px); left: 0; width: 100%; max-height: 250px; overflow-y: auto; background: var(--bg-panel); border: 1px solid var(--border-color); border-radius: 4px; padding: 4px 0; margin: 0; list-style: none; z-index: 100; opacity: 0; visibility: hidden; transform: translateY(-8px); transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1); box-shadow: 0 4px 12px rgba(0,0,0,0.2);">
                                        <li style="padding: 8px 12px; font-size: 0.85rem; cursor: not-allowed; color: var(--text-secondary);">-- Run Step 1 First --</li>
                                    </ul>
                                    <input type="hidden" id="wf-ds-table" value="">
                                </div>
                            </div>
                            
                            <div style="position: relative;">
                                <pre id="wf-out-ds-step2" class="wf-console" style="border-top-left-radius: 0; border-top-right-radius: 0; border-top: none;">Waiting for Step 1...</pre>
                                <button type="button" class="wf-copy-btn" onclick="copyWfConsole('ds-step2', this)" title="Copy Output">
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
                <div id="wf-config-export_visual\""""

new_html = re.sub(pattern, replacement, html, flags=re.DOTALL)

# Let's remove the stray block from 535 manually if it is left behind.
# It looks like:
#                 <div class="wf-step" id="wf-ds-step-2">
#                     <div class="wf-step-header">
#                         <span class="wf-step-title">Step 2: Parse & Download CSV</span>
#                     </div>
#                     <div style="position: relative;">
#                         <pre id="wf-out-ds-step2" class="wf-console">Waiting for query results...</pre>
#                     </div>
#                 </div>

stray_block = r"""                <div class="wf-step" id="wf-ds-step-2">\s*<div class="wf-step-header">\s*<span class="wf-step-title">Step 2: Parse & Download CSV</span>\s*</div>\s*<div style="position: relative;">\s*<pre id="wf-out-ds-step2" class="wf-console">Waiting for query results\.\.\.</pre>\s*</div>\s*</div>\s*</div>\s*</div>"""
new_html = re.sub(stray_block, "", new_html)

new_html = new_html.replace('v20260727_v63_ds_steps_v3', 'v20260727_v64_ds_steps_v4')

with open(html_path, 'w', encoding='utf-8') as f:
    f.write(new_html)

# Add custom dropdown CSS logic and JS functions
js_path = 'static/script.js'
with open(js_path, 'r', encoding='utf-8') as f:
    js = f.read()

# Add global click listener to close dropdown
global_click_logic = """
document.addEventListener('click', function(e) {
    const wrapper = document.getElementById('wf-ds-table-wrapper');
    if (wrapper && !wrapper.contains(e.target)) {
        const options = document.getElementById('wf-ds-table-options');
        const svg = wrapper.querySelector('svg');
        if (options && options.classList.contains('open')) {
            options.classList.remove('open');
            options.style.opacity = '0';
            options.style.visibility = 'hidden';
            options.style.transform = 'translateY(-8px)';
            if (svg) svg.style.transform = '';
        }
    }
});

window.toggleDsTableDropdown = function(e) {
    const trigger = document.getElementById('wf-ds-table-trigger');
    if (trigger.style.cursor === 'not-allowed') return;
    const options = document.getElementById('wf-ds-table-options');
    const svg = trigger.querySelector('svg');
    if (options.classList.contains('open')) {
        options.classList.remove('open');
        options.style.opacity = '0';
        options.style.visibility = 'hidden';
        options.style.transform = 'translateY(-8px)';
        if (svg) svg.style.transform = '';
    } else {
        options.classList.add('open');
        options.style.opacity = '1';
        options.style.visibility = 'visible';
        options.style.transform = 'translateY(0)';
        if (svg) svg.style.transform = 'rotate(180deg)';
    }
};

window.selectDsTable = function(val, text) {
    document.getElementById('wf-ds-table').value = val;
    const display = document.getElementById('wf-ds-table-display');
    display.innerText = text;
    display.style.color = 'var(--text-primary)';
    
    // Auto close
    const options = document.getElementById('wf-ds-table-options');
    const svg = document.querySelector('#wf-ds-table-trigger svg');
    options.classList.remove('open');
    options.style.opacity = '0';
    options.style.visibility = 'hidden';
    options.style.transform = 'translateY(-8px)';
    if (svg) svg.style.transform = '';
};
"""

if "window.toggleDsTableDropdown" not in js:
    js += "\n" + global_click_logic

# Update loadDatasetTablesStep1 to populate custom dropdown instead of standard select
# We need to replace:
#             select.innerHTML = '';
#             if(tables.length === 0) { ...
# with custom logic.

target_logic = """            select.innerHTML = '';
            if(tables.length === 0) {
                select.innerHTML = '<option value="">-- No Tables Found --</option>';
            } else {
                tables.forEach(t => {
                    const opt = document.createElement('option');
                    opt.value = t;
                    opt.innerText = t;
                    select.appendChild(opt);
                });
                document.getElementById('wf-ds-step-2').classList.add('active');
                document.getElementById('wf-out-ds-step2').innerText = "✅ Step 1 complete. Ready to execute Step 2.";
            }"""

replacement_logic = """            const optionsUl = document.getElementById('wf-ds-table-options');
            const displaySpan = document.getElementById('wf-ds-table-display');
            const triggerDiv = document.getElementById('wf-ds-table-trigger');
            const container = document.getElementById('wf-ds-table-container');
            
            optionsUl.innerHTML = '';
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
                    li.onmouseover = () => li.style.background = 'var(--bg-hover)';
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

js = js.replace(target_logic, replacement_logic)

# In executeExportDataset, adapt how it auto-selects
# Replace:
#         if (select.options.length > 0 && select.options[0].value) {
#             select.selectedIndex = 0;
#         } else if (select.options.length > 1) {
#             select.selectedIndex = 1;
#         }

target_auto_select = """        if (select.options.length > 0 && select.options[0].value) {
            select.selectedIndex = 0;
        } else if (select.options.length > 1) {
            select.selectedIndex = 1;
        }"""

replacement_auto_select = """        const optionsUl = document.getElementById('wf-ds-table-options');
        const firstLi = optionsUl.querySelector('li[style*="cursor: pointer"]');
        if (firstLi) {
            firstLi.click();
        }"""

js = js.replace(target_auto_select, replacement_auto_select)


with open(js_path, 'w', encoding='utf-8') as f:
    f.write(js)

print("Custom dropdown implemented.")
