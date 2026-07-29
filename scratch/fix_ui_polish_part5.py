import os
import re

INDEX_FILE = 'static/index.html'
SCRIPT_FILE = 'static/script.js'

def patch_index():
    with open(INDEX_FILE, 'r', encoding='utf-8') as f:
        html = f.read()

    # 1. RVC HTML: Remove hardcoded table, make it just a container
    old_rvc = """                                    <div id="wf-out-rvc" style="display: none; background: var(--input-bg); border: 1px solid var(--panel-border); border-radius: 6px; overflow-x: auto; max-height: 250px; padding-bottom: 60px;">
                                        <table style="width: 100%; border-collapse: collapse; font-size: 0.75rem; text-align: left;">
                                            <thead style="background: var(--overlay-10); position: sticky; top: 0;">
                                                <tr>
                                                    <th style="padding: 6px 12px; border-bottom: 1px solid var(--panel-border); font-weight: 600;">Time Window</th>
                                                    <th style="padding: 6px 12px; border-bottom: 1px solid var(--panel-border); font-weight: 600;">User Info</th>
                                                    <th style="padding: 6px 12px; border-bottom: 1px solid var(--panel-border); font-weight: 600;">Client IPs</th>
                                                </tr>
                                            </thead>
                                            <tbody id="wf-rvc-tbody">
                                                <!-- Rows -->
                                            </tbody>
                                        </table>
                                    </div>"""
    new_rvc = """                                    <div id="wf-out-rvc" class="wf-console" style="display: none; min-height: 150px; padding-bottom: 60px;"></div>"""
    
    # 2. Perms HTML: Remove hardcoded table, make it just a container
    old_perms = """                                    <div id="wf-out-perms" style="background: var(--input-bg); border: 1px solid var(--panel-border); border-radius: 6px; overflow-x: auto; max-height: 250px; padding-bottom: 60px;">
                                        <table style="width: 100%; border-collapse: collapse; font-size: 0.75rem; text-align: left;">
                                            <thead style="background: var(--overlay-10); position: sticky; top: 0; z-index: 5;">
                                                <tr>
                                                    <th style="padding: 8px 12px; border-bottom: 1px solid var(--panel-border); font-weight: 600;">Feature Name</th>
                                                    <th style="padding: 8px 12px; border-bottom: 1px solid var(--panel-border); font-weight: 600;">State</th>
                                                    <th style="padding: 8px 12px; border-bottom: 1px solid var(--panel-border); font-weight: 600;">Extended State</th>
                                                </tr>
                                            </thead>
                                            <tbody id="wf-perms-tbody">
                                                <tr><td colspan="3" style="padding: 12px; text-align: center; color: var(--text-secondary);">Waiting for execution...</td></tr>
                                            </tbody>
                                        </table>
                                    </div>"""
    new_perms = """                                    <div id="wf-out-perms" class="wf-console" style="min-height: 150px; padding-bottom: 60px;">Ready to check permissions...

Click "Run Check" to fetch /availableFeatures.</div>"""
    
    if old_rvc in html: html = html.replace(old_rvc, new_rvc)
    if old_perms in html: html = html.replace(old_perms, new_perms)
    
    html = re.sub(r'script\.js\?v=[\w_]+', 'script.js?v=20260729_v99_dynamic_tables', html)
    
    with open(INDEX_FILE, 'w', encoding='utf-8') as f:
        f.write(html)

def patch_script():
    with open(SCRIPT_FILE, 'r', encoding='utf-8') as f:
        js = f.read()

    # 1. RVC JS
    old_rvc_js = """    statusDiv.textContent = `Fetching Activity Events from ${startStr} to ${endStr}... (Requires Power BI Admin)`;
    outDiv.style.display = 'block';
    tbody.innerHTML = '<tr><td colspan="3" style="padding: 12px; text-align: center; color: var(--text-secondary);">Loading data... please wait.</td></tr>';"""
    new_rvc_js = """    statusDiv.textContent = `Fetching Activity Events from ${startStr} to ${endStr}... (Requires Power BI Admin)`;
    outDiv.style.display = 'block';
    outDiv.innerHTML = 'Loading data... please wait.\\n';"""

    old_rvc_end = """        tbody.innerHTML = rowsHtml;
        outDiv.style.display = 'block';"""
    new_rvc_end = """        let tableHtml = `
            <table style="width: 100%; border-collapse: collapse; font-size: 0.75rem; text-align: left;">
                <thead style="background: var(--overlay-10); position: sticky; top: 0; z-index: 5;">
                    <tr>
                        <th style="padding: 8px 12px; border-bottom: 1px solid var(--panel-border); font-weight: 600;">Time Window</th>
                        <th style="padding: 8px 12px; border-bottom: 1px solid var(--panel-border); font-weight: 600;">User Info</th>
                        <th style="padding: 8px 12px; border-bottom: 1px solid var(--panel-border); font-weight: 600;">Client IPs</th>
                    </tr>
                </thead>
                <tbody>${rowsHtml}</tbody>
            </table>`;
        outDiv.innerHTML = tableHtml;
        outDiv.style.display = 'block';"""

    if old_rvc_js in js: js = js.replace(old_rvc_js, new_rvc_js)
    if old_rvc_end in js: js = js.replace(old_rvc_end, new_rvc_end)
    
    # 2. Perms JS
    old_perms_js_start = """window.runCheckPermsWorkflow = async function() {
    const outDiv = document.getElementById('wf-out-perms');
    const tbody = document.getElementById('wf-perms-tbody');
    const statusDiv = document.getElementById('wf-perms-status');
    const btn = document.getElementById('btn-run-check-perms');
    
    btn.disabled = true;
    btn.innerHTML = 'Running...';
    
    statusDiv.textContent = `Fetching /availableFeatures...`;
    statusDiv.style.color = 'var(--text-secondary)';
    tbody.innerHTML = '<tr><td colspan="3" style="padding: 12px; text-align: center; color: var(--text-secondary);">Loading permissions...</td></tr>';"""
    
    new_perms_js_start = """window.runCheckPermsWorkflow = async function() {
    const outDiv = document.getElementById('wf-out-perms');
    const statusDiv = document.getElementById('wf-perms-status');
    const btn = document.getElementById('btn-run-check-perms');
    
    btn.disabled = true;
    btn.innerHTML = 'Running...';
    
    statusDiv.textContent = `Fetching /availableFeatures...`;
    statusDiv.style.color = 'var(--text-secondary)';
    outDiv.innerHTML = 'Loading permissions...\\n';"""
    
    old_perms_js_err = """        if(!res.ok) {
            statusDiv.textContent = `Error: ${res.status} ${res.statusText}`;
            statusDiv.style.color = 'var(--error)';
            tbody.innerHTML = '<tr><td colspan="3" style="padding: 12px; text-align: center; color: var(--error);">Failed to fetch.</td></tr>';
            btn.disabled = false;
            btn.innerHTML = 'Run Check';
            return;
        }"""
    
    new_perms_js_err = """        if(!res.ok) {
            statusDiv.textContent = `Error: ${res.status} ${res.statusText}`;
            statusDiv.style.color = 'var(--error)';
            outDiv.innerHTML = `Failed to fetch: ${res.status} ${res.statusText}\\n`;
            btn.disabled = false;
            btn.innerHTML = 'Run Check';
            return;
        }"""
    
    old_perms_js_success = """        if (data.features && Array.isArray(data.features)) {
            let rowsHtml = '';
            data.features.forEach(f => {
                const name = f.name || 'Unknown';
                const state = f.state || 'N/A';
                const extState = f.extendedState || 'N/A';
                
                // Color coding for state
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
            tbody.innerHTML = rowsHtml;
            statusDiv.textContent = `Successfully loaded ${data.features.length} features.`;
            statusDiv.style.color = 'var(--success)';
        } else {
            tbody.innerHTML = `<tr><td colspan="3" style="padding: 12px;"><pre style="margin:0; font-size: 0.7rem; color: var(--text-primary);">${JSON.stringify(data, null, 2)}</pre></td></tr>`;
            statusDiv.textContent = `Loaded JSON format (No features array found).`;
            statusDiv.style.color = 'var(--warning)';
        }"""
        
    new_perms_js_success = """        if (data.features && Array.isArray(data.features)) {
            let rowsHtml = '';
            data.features.forEach(f => {
                const name = f.name || 'Unknown';
                const state = f.state || 'N/A';
                const extState = f.extendedState || 'N/A';
                
                // Color coding for state
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
            
            outDiv.innerHTML = tableHtml;
            statusDiv.textContent = `Successfully loaded ${data.features.length} features.`;
            statusDiv.style.color = 'var(--success)';
        } else {
            outDiv.innerHTML = `<pre style="margin:0; font-size: 0.7rem; color: var(--text-primary);">${JSON.stringify(data, null, 2)}</pre>`;
            statusDiv.textContent = `Loaded JSON format (No features array found).`;
            statusDiv.style.color = 'var(--warning)';
        }"""
    
    if old_perms_js_start in js: js = js.replace(old_perms_js_start, new_perms_js_start)
    if old_perms_js_err in js: js = js.replace(old_perms_js_err, new_perms_js_err)
    if old_perms_js_success in js: js = js.replace(old_perms_js_success, new_perms_js_success)
    
    with open(SCRIPT_FILE, 'w', encoding='utf-8') as f:
        f.write(js)

if __name__ == '__main__':
    patch_index()
    patch_script()
    print("Patch applied for dynamic tables.")
