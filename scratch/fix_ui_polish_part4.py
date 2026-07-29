import os
import re

INDEX_FILE = 'static/index.html'
SCRIPT_FILE = 'static/script.js'
STYLE_FILE = 'static/style.css'

def patch_style():
    with open(STYLE_FILE, 'r', encoding='utf-8') as f:
        css = f.read()
    # Change padding to leave bottom gap
    css = css.replace('padding: 12px 32px 12px 12px;', 'padding: 12px 32px 60px 12px;')
    with open(STYLE_FILE, 'w', encoding='utf-8') as f:
        f.write(css)

def patch_index():
    with open(INDEX_FILE, 'r', encoding='utf-8') as f:
        html = f.read()
    
    # 1. RVC padding
    html = html.replace(
        'id="wf-out-rvc" style="display: none; background: var(--input-bg); border: 1px solid var(--panel-border); border-radius: 6px; overflow-x: auto; max-height: 250px;"',
        'id="wf-out-rvc" style="display: none; background: var(--input-bg); border: 1px solid var(--panel-border); border-radius: 6px; overflow-x: auto; max-height: 250px; padding-bottom: 60px;"'
    )
    html = html.replace(
        'id="wf-out-rvc" style="display: block; background: var(--input-bg); border: 1px solid var(--panel-border); border-radius: 6px; overflow-x: auto; max-height: 250px;"',
        'id="wf-out-rvc" style="display: block; background: var(--input-bg); border: 1px solid var(--panel-border); border-radius: 6px; overflow-x: auto; max-height: 250px; padding-bottom: 60px;"'
    )

    # 2. Perms HTML
    old_perms = """                                <div style="position: relative;">
                                    <pre id="wf-out-perms" class="wf-console" style="min-height: 150px;">Ready to check permissions...

Click "Run Check" to fetch /availableFeatures.</pre>
                                    <button type="button" class="wf-copy-btn" onclick="window.handleCopyAction(this, document.getElementById('wf-out-perms').textContent)" title="Copy Output"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg></button>
                                </div>"""
    
    new_perms = """                                <div id="wf-perms-status" style="font-size: 0.75rem; color: var(--text-secondary); margin-bottom: 8px;">Ready. Click "Run Check" to fetch /availableFeatures.</div>
                                <div style="position: relative;">
                                    <button type="button" class="wf-copy-btn" onclick="window.handleCopyAction(this, document.getElementById('wf-out-perms').innerText)" title="Copy Output" style="top: 8px; right: 8px; z-index: 10;"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg></button>
                                    <div id="wf-out-perms" style="background: var(--input-bg); border: 1px solid var(--panel-border); border-radius: 6px; overflow-x: auto; max-height: 250px; padding-bottom: 60px;">
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
                                    </div>
                                </div>"""
    
    html = html.replace(old_perms, new_perms)
    html = re.sub(r'script\.js\?v=[\w_]+', 'script.js?v=20260729_v98_table_perms', html)
    
    with open(INDEX_FILE, 'w', encoding='utf-8') as f:
        f.write(html)

def patch_script():
    with open(SCRIPT_FILE, 'r', encoding='utf-8') as f:
        js = f.read()

    old_fn = """window.runCheckPermsWorkflow = async function() {
    const out = document.getElementById('wf-out-perms');
    const btn = document.getElementById('btn-run-check-perms');
    btn.disabled = true;
    btn.innerHTML = 'Running...';
    
    out.textContent = `[${new Date().toLocaleTimeString()}] Fetching /availableFeatures ...\\n\\n`;
    
    try {
        const res = await fetch('/api/proxy', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ endpoint: '/availableFeatures', method: 'GET' })
        });
        
        if(!res.ok) {
            out.textContent += `Error: ${res.status} ${res.statusText}\\n`;
            btn.disabled = false;
            btn.innerHTML = 'Run Check';
            return;
        }
        
        const data = await res.json();
        
        if (data.features && Array.isArray(data.features)) {
            let listOutput = "Available Permissions & Features:\\n";
            listOutput += "=================================================\\n";
            listOutput += "Feature Name".padEnd(55) + "State\\n";
            listOutput += "-------------------------------------------------------\\n";
            data.features.forEach(f => {
                const fName = (f.name || 'Unknown').padEnd(55);
                const fState = f.state || 'N/A';
                listOutput += `${fName} [${fState}]\\n`;
            });
            out.textContent += listOutput + '\\n';
        } else {
            out.textContent += JSON.stringify(data, null, 2) + '\\n\\n';
        }
        
        out.textContent += `[Success] Permission check complete.\\n`;
        setTimeout(() => { out.scrollTop = out.scrollHeight; }, 50);
    } catch (e) {
        out.textContent += `Exception: ${e.message}\\n`;
        setTimeout(() => { out.scrollTop = out.scrollHeight; }, 50);
    } finally {
        btn.disabled = false;
        btn.innerHTML = 'Run Check';
    }
};"""

    new_fn = """window.runCheckPermsWorkflow = async function() {
    const outDiv = document.getElementById('wf-out-perms');
    const tbody = document.getElementById('wf-perms-tbody');
    const statusDiv = document.getElementById('wf-perms-status');
    const btn = document.getElementById('btn-run-check-perms');
    
    btn.disabled = true;
    btn.innerHTML = 'Running...';
    
    statusDiv.textContent = `Fetching /availableFeatures...`;
    statusDiv.style.color = 'var(--text-secondary)';
    tbody.innerHTML = '<tr><td colspan="3" style="padding: 12px; text-align: center; color: var(--text-secondary);">Loading permissions...</td></tr>';
    
    try {
        const res = await fetch('/api/proxy', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ endpoint: '/availableFeatures', method: 'GET' })
        });
        
        if(!res.ok) {
            statusDiv.textContent = `Error: ${res.status} ${res.statusText}`;
            statusDiv.style.color = 'var(--error)';
            tbody.innerHTML = '<tr><td colspan="3" style="padding: 12px; text-align: center; color: var(--error);">Failed to fetch.</td></tr>';
            btn.disabled = false;
            btn.innerHTML = 'Run Check';
            return;
        }
        
        const data = await res.json();
        
        if (data.features && Array.isArray(data.features)) {
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
        }
        
        setTimeout(() => { outDiv.scrollTop = outDiv.scrollHeight; }, 50);
    } catch (e) {
        statusDiv.textContent = `Exception: ${e.message}`;
        statusDiv.style.color = 'var(--error)';
        setTimeout(() => { outDiv.scrollTop = outDiv.scrollHeight; }, 50);
    } finally {
        btn.disabled = false;
        btn.innerHTML = 'Run Check';
    }
};"""

    js = js.replace(old_fn, new_fn)
    with open(SCRIPT_FILE, 'w', encoding='utf-8') as f:
        f.write(js)

if __name__ == '__main__':
    patch_style()
    patch_index()
    patch_script()
    print("Done")
