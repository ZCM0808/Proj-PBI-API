import os
import re

INDEX_FILE = 'static/index.html'
SCRIPT_FILE = 'static/script.js'

def patch_index():
    with open(INDEX_FILE, 'r', encoding='utf-8') as f:
        html = f.read()

    old_perms = """                                  <div style="position: relative;">
                                      <button type="button" class="wf-copy-btn" onclick="window.handleCopyAction(this, document.getElementById('wf-out-perms').innerText)" title="Copy Output" style="top: 8px; right: 8px; z-index: 10;"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg></button>
                                      <div id="wf-out-perms" class="wf-console" style="min-height: 150px; padding-bottom: 60px;">Ready to check permissions...

Click "Run Check" to fetch /availableFeatures.</div>
                                  </div>"""
                                  
    new_perms = """                                  <!-- JSON Section -->
                                  <div style="position: relative; margin-bottom: 12px;">
                                      <div style="font-size: 0.75rem; font-weight: bold; margin-bottom: 4px; color: var(--text-secondary);">Raw JSON Response</div>
                                      <button type="button" class="wf-copy-btn" onclick="window.handleCopyAction(this, document.getElementById('wf-out-perms-json').textContent)" title="Copy JSON" style="top: 24px; right: 8px; z-index: 10;"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg></button>
                                      <div id="wf-out-perms-json" class="wf-console" style="min-height: 100px; padding-bottom: 20px;">Waiting...</div>
                                  </div>
                                  
                                  <!-- Table Section -->
                                  <div style="position: relative;">
                                      <div style="font-size: 0.75rem; font-weight: bold; margin-bottom: 4px; color: var(--text-secondary);">Parsed Features Table</div>
                                      <button type="button" class="wf-copy-btn" onclick="window.handleCopyAction(this, document.getElementById('wf-out-perms-table').innerText)" title="Copy Table Text" style="top: 24px; right: 8px; z-index: 10;"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg></button>
                                      <div id="wf-out-perms-table" class="wf-console" style="min-height: 150px; padding-bottom: 60px;">Waiting...</div>
                                  </div>"""
    
    html = html.replace(old_perms, new_perms)
    html = re.sub(r'script\.js\?v=[\w_]+', 'script.js?v=20260729_v101_split_json_table', html)
    
    with open(INDEX_FILE, 'w', encoding='utf-8') as f:
        f.write(html)

def patch_script():
    with open(SCRIPT_FILE, 'r', encoding='utf-8') as f:
        js = f.read()

    # The existing function block
    pattern = re.compile(r'window\.runCheckPermsWorkflow = async function\(\) \{.*?(?=\nwindow\.runRvcWorkflow = )', re.DOTALL)
    
    new_fn = """window.runCheckPermsWorkflow = async function() {
    const jsonDiv = document.getElementById('wf-out-perms-json');
    const tableDiv = document.getElementById('wf-out-perms-table');
    const statusDiv = document.getElementById('wf-perms-status');
    const btn = document.getElementById('btn-run-check-perms');
    
    btn.disabled = true;
    btn.innerHTML = 'Running...';
    
    statusDiv.textContent = `Fetching /availableFeatures...`;
    statusDiv.style.color = 'var(--text-secondary)';
    jsonDiv.textContent = 'Loading...';
    tableDiv.innerHTML = 'Loading...';
    
    try {
        const res = await fetch('/api/proxy', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ endpoint: '/availableFeatures', method: 'GET' })
        });
        
        if(!res.ok) {
            statusDiv.textContent = `Error: ${res.status} ${res.statusText}`;
            statusDiv.style.color = 'var(--error)';
            const errMsg = `Failed to fetch: ${res.status} ${res.statusText}`;
            jsonDiv.textContent = errMsg;
            tableDiv.innerHTML = errMsg;
            btn.disabled = false;
            btn.innerHTML = 'Run Check';
            return;
        }
        
        const data = await res.json();
        
        // 1. Output RAW JSON
        jsonDiv.textContent = JSON.stringify(data, null, 2);
        
        // 2. Output Table
        const payload = data.data || data;
        const featuresArray = payload.features;
        
        if (featuresArray && Array.isArray(featuresArray)) {
            let rowsHtml = '';
            featuresArray.forEach(f => {
                const name = f.name || 'Unknown';
                const state = f.state || 'N/A';
                const extState = f.extendedState || 'N/A';
                
                let stateHtml = state;
                if(state === 'Enabled') {
                    stateHtml = `<span style="color: var(--success); font-weight: 500;">${state}</span>`;
                } else if(state === 'Disabled') {
                    stateHtml = `<span style="color: var(--error); font-weight: 500;">${state}</span>`;
                }
                
                rowsHtml += `
                    <tr style="border-bottom: 1px solid var(--panel-border); transition: background 0.2s;" onmouseover="this.style.background='var(--overlay-10)'" onmouseout="this.style.background='transparent'">
                        <td style="padding: 8px 12px; color: var(--text-primary); font-family: monospace;">${name}</td>
                        <td style="padding: 8px 12px;">${stateHtml}</td>
                        <td style="padding: 8px 12px; color: var(--text-secondary);">${extState}</td>
                    </tr>
                `;
            });
            
            let tableHtml = `
            <table style="width: 100%; border-collapse: collapse; font-size: 0.75rem; text-align: left;">
                <thead style="background: var(--overlay-10); position: sticky; top: 0; z-index: 5;">
                    <tr>
                        <th style="padding: 8px 12px; border-bottom: 1px solid var(--panel-border); font-weight: 600;">Feature Name</th>
                        <th style="padding: 8px 12px; border-bottom: 1px solid var(--panel-border); font-weight: 600;">State</th>
                        <th style="padding: 8px 12px; border-bottom: 1px solid var(--panel-border); font-weight: 600;">Extended State</th>
                    </tr>
                </thead>
                <tbody>${rowsHtml}</tbody>
            </table>`;
            
            tableDiv.innerHTML = tableHtml;
            statusDiv.textContent = `Successfully loaded ${featuresArray.length} features.`;
            statusDiv.style.color = 'var(--success)';
        } else {
            tableDiv.innerHTML = `No features array found.`;
            statusDiv.textContent = `Loaded JSON format (No features array found).`;
            statusDiv.style.color = 'var(--warning)';
        }
        
        setTimeout(() => { 
            jsonDiv.scrollTop = jsonDiv.scrollHeight; 
            tableDiv.scrollTop = tableDiv.scrollHeight;
        }, 50);
    } catch (e) {
        statusDiv.textContent = `Exception: ${e.message}`;
        statusDiv.style.color = 'var(--error)';
        setTimeout(() => { 
            if(jsonDiv) jsonDiv.scrollTop = jsonDiv.scrollHeight; 
            if(tableDiv) tableDiv.scrollTop = tableDiv.scrollHeight;
        }, 50);
    } finally {
        btn.disabled = false;
        btn.innerHTML = 'Run Check';
    }
};"""
    
    js = pattern.sub(new_fn, js)
    
    with open(SCRIPT_FILE, 'w', encoding='utf-8') as f:
        f.write(js)

if __name__ == '__main__':
    patch_index()
    patch_script()
    print("Done split")
