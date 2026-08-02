import re

# 1. index.html
with open('static/index.html', 'r', encoding='utf-8') as f:
    html = f.read()

# Add to selector
if 'value="local_dax"' not in html:
    html = html.replace(
        '<option value="global_user_manager">Global Workspace Permissions Manager</option>',
        '<option value="global_user_manager">Global Workspace Permissions Manager</option>\n                          <option value="local_dax">Local PBI Desktop Query (DAX)</option>'
    )

# Add pane
local_dax_pane = """                  <div id="wf-config-local_dax" class="wf-config-pane" style="display: none;">
                      <div class="wf-steps-container" style="display: flex; flex-direction: column; gap: 12px;">
                          <!-- Step 1: Scan -->
                          <div class="wf-step" id="wf-local-step-1">
                              <div class="wf-step-header">
                                  <span class="wf-step-title">Step 1: Scan Local Instances</span>
                                  <button id="wf-local-btn-scan" class="btn-action-secondary wf-step-btn" onclick="window.scanLocalPBI(this)">Scan</button>
                              </div>
                              <div style="display: grid; grid-template-columns: 1fr; gap: 12px; margin-top: 8px;">
                                  <div>
                                      <label style="font-size: 0.85rem; color: var(--text-secondary);">Target Instance (Database)</label>
                                      <select id="wf-local-instance" class="wf-input">
                                          <option value="">Scan first...</option>
                                      </select>
                                  </div>
                              </div>
                          </div>
                          
                          <!-- Step 2: Query -->
                          <div class="wf-step" id="wf-local-step-2">
                              <div class="wf-step-header">
                                  <span class="wf-step-title">Step 2: Run DAX Query</span>
                                  <button id="wf-local-btn-run" class="btn-action wf-step-btn" onclick="window.runLocalDAX(this)" disabled>Execute</button>
                              </div>
                              <div style="margin-top: 8px;">
                                  <textarea id="wf-local-dax-query" class="wf-input" style="height: 120px; font-family: monospace; resize: vertical;" placeholder="EVALUATE INFO.TABLES()"></textarea>
                              </div>
                              <div style="position: relative; margin-top: 8px;">
                                  <div style="font-size: 0.75rem; font-weight: bold; margin-bottom: 4px; color: var(--text-secondary); display: flex; align-items: center; cursor: pointer; user-select: none; width: fit-content;" onclick="window.toggleConsole('wf-out-local')"><svg id="wf-out-local-chevron" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="margin-right: 4px; transition: transform 0.2s; transform: rotate(0deg);"><polyline points="9 18 15 12 9 6"></polyline></svg>Output Logs & Results</div>
                                  <div style="position: relative;">
                                      <div id="wf-out-local" class="wf-console collapsed-console">Ready to execute DAX...</div>
                                      <button type="button" class="wf-copy-btn" onclick="window.handleCopyAction(this, document.getElementById('wf-out-local').textContent)" title="Copy Output"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg></button>
                                  </div>
                              </div>
                              <div id="wf-out-local-table" style="margin-top: 12px; overflow-x: auto; background: var(--bg-color); border-radius: 6px; border: 1px solid var(--panel-border);"></div>
                          </div>
                      </div>
                  </div>"""

if 'wf-config-local_dax' not in html:
    html = html.replace('<!-- Right Column: Workspace Config -->', '<!-- Right Column: Workspace Config -->\n' + local_dax_pane)

# Bump version
html = re.sub(r'v152', 'v153', html)

with open('static/index.html', 'w', encoding='utf-8') as f:
    f.write(html)

# 2. script.js
with open('static/script.js', 'r', encoding='utf-8') as f:
    js = f.read()

# Add JS functions
js_code = """
window.scanLocalPBI = async function(btn) {
    if(btn.disabled) return;
    btn.disabled = true;
    const oldText = btn.textContent;
    btn.textContent = 'Scanning...';
    const select = document.getElementById('wf-local-instance');
    
    try {
        const res = await fetch('/api/local_pbi/scan');
        const data = await res.json();
        
        select.innerHTML = '';
        if(data.instances && data.instances.length > 0) {
            window.localPBIInstances = data.instances;
            data.instances.forEach(inst => {
                const opt = document.createElement('option');
                opt.value = inst.port;
                opt.textContent = `Port: ${inst.port} | DB: ${inst.database}`;
                select.appendChild(opt);
            });
            document.getElementById('wf-local-btn-run').disabled = false;
        } else {
            select.innerHTML = '<option value="">No local PBI instances found</option>';
            document.getElementById('wf-local-btn-run').disabled = true;
        }
    } catch(e) {
        alert("Error scanning local instances: " + e);
    }
    btn.disabled = false;
    btn.textContent = oldText;
};

window.runLocalDAX = async function(btn) {
    if(btn.disabled) return;
    const port = document.getElementById('wf-local-instance').value;
    const query = document.getElementById('wf-local-dax-query').value.trim();
    if(!port || !query) {
        alert("Please scan for instances and enter a query.");
        return;
    }
    
    btn.disabled = true;
    const oldText = btn.textContent;
    btn.textContent = 'Executing...';
    
    const logsDiv = document.getElementById('wf-out-local');
    const tableDiv = document.getElementById('wf-out-local-table');
    window.expandConsole('wf-out-local');
    
    const appendLog = (msg) => {
        logsDiv.innerHTML += `<div>${msg}</div>`;
        logsDiv.scrollTop = logsDiv.scrollHeight;
    };
    
    logsDiv.innerHTML = '';
    tableDiv.innerHTML = '';
    appendLog(`[INIT] Running DAX on localhost:${port}...`);
    
    try {
        const res = await fetch('/api/local_pbi/query', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({port: port, query: query})
        });
        const data = await res.json();
        
        if(data.error) {
            appendLog(`<span style="color:var(--error)">[ERROR] ${data.error}</span>`);
        } else if(data.columns && data.rows) {
            appendLog(`[SUCCESS] Returned ${data.rows.length} rows, ${data.columns.length} columns.`);
            
            // Render table
            window.renderJsonViewer(data.rows, tableDiv, "DAX Result");
        } else {
            appendLog(`[INFO] Query executed successfully, but no standard resultset returned.`);
        }
    } catch(e) {
        appendLog(`<span style="color:var(--error)">[ERROR] ${e.message}</span>`);
    }
    
    btn.disabled = false;
    btn.textContent = oldText;
};
"""

if 'window.scanLocalPBI' not in js:
    js += js_code
    with open('static/script.js', 'w', encoding='utf-8') as f:
        f.write(js)

print("Patch complete.")
