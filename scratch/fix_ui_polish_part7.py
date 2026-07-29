import os
import re

SCRIPT_FILE = 'static/script.js'

with open(SCRIPT_FILE, 'r', encoding='utf-8') as f:
    js = f.read()

# Replace the entire runCheckPermsWorkflow function
pattern = re.compile(r'window\.runCheckPermsWorkflow = async function\(\) \{.*$', re.DOTALL)

new_fn = """window.runCheckPermsWorkflow = async function() {
    const jsonDiv = document.getElementById('wf-out-perms-json');
    const tableDiv = document.getElementById('wf-out-perms-table');
    const statusDiv = document.getElementById('wf-perms-status');
    const btn = document.getElementById('btn-run-check-perms');
    
    btn.disabled = true;
    btn.innerHTML = 'Running...';
    
    statusDiv.textContent = `Fetching /availableFeatures...`;
    statusDiv.style.color = 'var(--text-secondary)';
    jsonDiv.textContent = 'Loading JSON...';
    tableDiv.innerHTML = 'Loading Table...';
    
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
                <thead style="background: var(--bg-color); position: sticky; top: 0; z-index: 5;">
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
};
"""

js = pattern.sub(new_fn, js)

# Also fix RVC table header background so it's opaque!
js = js.replace('thead style="background: var(--overlay-10);', 'thead style="background: var(--bg-color);')

with open(SCRIPT_FILE, 'w', encoding='utf-8') as f:
    f.write(js)
print("JS updated successfully!")
