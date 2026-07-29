import os
import re

INDEX_FILE = 'static/index.html'
SCRIPT_FILE = 'static/script.js'

def patch_index():
    with open(INDEX_FILE, 'r', encoding='utf-8') as f:
        html = f.read()

    # Restore split containers for RVC
    rvc_pattern = re.compile(r'<div style="position: relative;">\s*<div class="wf-copy-toolbar".*?<div id="wf-out-rvc" class="wf-console".*?</div>\s*</div>', re.DOTALL)
    rvc_split = """<div id="wf-rvc-containers" style="display: none; flex-direction: column; gap: 12px;">
                                    <!-- Logs Section -->
                                    <div style="position: relative;">
                                        <div style="font-size: 0.75rem; font-weight: bold; margin-bottom: 4px; color: var(--text-secondary);">Execution Logs</div>
                                        <button type="button" class="wf-copy-btn" onclick="window.handleCopyAction(this, document.getElementById('wf-out-rvc-logs').innerText)" title="Copy Logs" style="top: 24px; right: 8px; z-index: 10;"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg></button>
                                        <div id="wf-out-rvc-logs" class="wf-console" style="min-height: 100px; padding-bottom: 20px;"></div>
                                    </div>
                                    
                                    <!-- Table Section -->
                                    <div style="position: relative;">
                                        <div style="font-size: 0.75rem; font-weight: bold; margin-bottom: 4px; color: var(--text-secondary);">Activity Events Table</div>
                                        <button type="button" class="wf-copy-btn" onclick="window.handleCopyAction(this, document.getElementById('wf-out-rvc-table').innerText)" title="Copy Table" style="top: 24px; right: 8px; z-index: 10;"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg></button>
                                        <div id="wf-out-rvc-table" class="wf-console" style="min-height: 150px; padding-bottom: 60px;"></div>
                                    </div>
                                </div>"""
    html = rvc_pattern.sub(rvc_split, html)

    # Restore split containers for Check Perms
    perms_pattern = re.compile(r'<div style="position: relative;">\s*<div class="wf-copy-toolbar".*?<div id="wf-out-perms" class="wf-console".*?</div>\s*</div>', re.DOTALL)
    perms_split = """<div id="wf-perms-containers" style="display: flex; flex-direction: column; gap: 12px;">
                                    <!-- Logs Section -->
                                    <div style="position: relative;">
                                        <div style="font-size: 0.75rem; font-weight: bold; margin-bottom: 4px; color: var(--text-secondary);">Execution Logs</div>
                                        <button type="button" class="wf-copy-btn" onclick="window.handleCopyAction(this, document.getElementById('wf-out-perms-logs').innerText)" title="Copy Logs" style="top: 24px; right: 8px; z-index: 10;"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg></button>
                                        <div id="wf-out-perms-logs" class="wf-console" style="min-height: 100px; padding-bottom: 20px;">Ready...</div>
                                    </div>
                                    
                                    <!-- Table Section -->
                                    <div style="position: relative;">
                                        <div style="font-size: 0.75rem; font-weight: bold; margin-bottom: 4px; color: var(--text-secondary);">Permissions Table</div>
                                        <button type="button" class="wf-copy-btn" onclick="window.handleCopyAction(this, document.getElementById('wf-out-perms-table').innerText)" title="Copy Table" style="top: 24px; right: 8px; z-index: 10;"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg></button>
                                        <div id="wf-out-perms-table" class="wf-console" style="min-height: 150px; padding-bottom: 60px;">Waiting for data...</div>
                                    </div>
                                </div>"""
    html = perms_pattern.sub(perms_split, html)

    html = re.sub(r'script\.js\?v=[\w_]+', 'script.js?v=20260729_v108_split_dynamic', html)
    
    with open(INDEX_FILE, 'w', encoding='utf-8') as f:
        f.write(html)


def patch_script():
    with open(SCRIPT_FILE, 'r', encoding='utf-8') as f:
        js = f.read()

    # Rewrite runRvcWorkflow for split containers
    rvc_pattern = re.compile(r'window\.runRvcWorkflow = async function\(\) \{.*?(?=\n\s*window\.handleCopyAction =)', re.DOTALL)
    
    new_rvc = """window.runRvcWorkflow = async function() {
    const reportId = document.getElementById('wf-rvc-report').value;
    const startStr = document.getElementById('wf-rvc-start').value;
    const endStr = document.getElementById('wf-rvc-end').value;
    const statusDiv = document.getElementById('wf-rvc-status');
    const containersDiv = document.getElementById('wf-rvc-containers');
    const logsDiv = document.getElementById('wf-out-rvc-logs');
    const tableDiv = document.getElementById('wf-out-rvc-table');
    
    if(!reportId || !startStr || !endStr) {
        statusDiv.textContent = 'Error: Please select a report and date range.';
        statusDiv.style.color = 'var(--error)';
        return;
    }
    statusDiv.style.color = 'var(--text-secondary)';
    
    let dStart = new Date(startStr);
    let dEnd = new Date(endStr);
    if(dStart > dEnd) {
        statusDiv.textContent = 'Error: Start Date must be before End Date.';
        statusDiv.style.color = 'var(--error)';
        return;
    }
    
    const diffDays = Math.ceil((dEnd - dStart) / (1000 * 60 * 60 * 24));
    if(diffDays > 30) {
        if(!confirm('Date range is larger than 30 days. This will make many API calls. Continue?')) return;
    }

    containersDiv.style.display = 'flex';
    logsDiv.innerHTML = '';
    
    const appendLog = (msg) => {
        const div = document.createElement('div');
        div.textContent = msg;
        logsDiv.appendChild(div);
        setTimeout(() => { logsDiv.scrollTop = logsDiv.scrollHeight; }, 10);
    };

    appendLog(`[INIT] Fetching Activity Events from ${startStr} to ${endStr}...`);
    statusDiv.textContent = `Running analysis...`;
    
    // Setup dynamic table skeleton (2 Columns)
    tableDiv.innerHTML = `
    <table data-table-id="rvc" style="width: 100%; border-collapse: collapse; font-size: 0.75rem; text-align: left;">
        <thead>
            <tr>
                <th onclick="window.sortTable(this, event, 0)" style="background: #11141a; position: sticky; top: -12px; z-index: 5; padding: 8px 12px; border-bottom: 1px solid var(--panel-border); font-weight: 600; cursor: pointer; user-select: none; transition: background 0.2s;" onmouseover="this.style.background='#1e222d'" onmouseout="this.style.background='#11141a'">Date</th>
                <th onclick="window.sortTable(this, event, 1)" style="background: #11141a; position: sticky; top: -12px; z-index: 5; padding: 8px 12px; border-bottom: 1px solid var(--panel-border); font-weight: 600; cursor: pointer; user-select: none; transition: background 0.2s;" onmouseover="this.style.background='#1e222d'" onmouseout="this.style.background='#11141a'">View Count</th>
            </tr>
        </thead>
        <tbody id="rvc-dynamic-tbody"></tbody>
    </table>`;
    const tbody = document.getElementById('rvc-dynamic-tbody');
    
    let totalViews = 0;
    let dateStats = {}; // dateIso -> count
    
    const renderTableRows = () => {
        let rowsHtml = '';
        const sortedDates = Object.keys(dateStats).sort(); // Chronological
        
        for(const d of sortedDates) {
            const count = dateStats[d];
            rowsHtml += `
                <tr style="border-bottom: 1px solid var(--panel-border); transition: background 0.2s;" onmouseover="this.style.background='var(--overlay-10)'" onmouseout="this.style.background='transparent'">
                    <td style="padding: 6px 12px; color: var(--text-primary); font-family: monospace;">${d}</td>
                    <td style="padding: 6px 12px;">
                        <span style="display: inline-block; padding: 2px 6px; border-radius: 12px; background: var(--status-success-bg); color: var(--success); font-size: 0.65rem; border: 1px solid var(--success);">
                            ${count} views
                        </span>
                    </td>
                </tr>
            `;
        }
        tbody.innerHTML = rowsHtml;
    };

    const btn = document.getElementById('btn-run-rvc');
    btn.disabled = true;
    btn.innerHTML = 'Running...';
    
    try {
        let currentDate = new Date(dStart);
        while(currentDate <= dEnd) {
            const dateIso = currentDate.toISOString().split('T')[0];
            appendLog(`[FETCH] Requesting events for ${dateIso}...`);
            
            const startDateTime = `'${dateIso}T00:00:00Z'`;
            const endDateTime = `'${dateIso}T23:59:59Z'`;
            let url = `/admin/activityevents?startDateTime=${startDateTime}&endDateTime=${endDateTime}`;
            
            let continuationUri = url;
            let pageCount = 1;
            while(continuationUri) {
                let endpoint = continuationUri;
                if(endpoint.startsWith('https://api.powerbi.com/v1.0/myorg')) {
                    endpoint = endpoint.substring('https://api.powerbi.com/v1.0/myorg'.length);
                } else if (endpoint.startsWith('https://api.powerbi.com')) {
                    endpoint = endpoint.substring('https://api.powerbi.com'.length);
                }
                const res = await fetch('/api/proxy', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ endpoint: endpoint, method: 'GET' })
                });
                
                if(!res.ok) {
                    appendLog(`[ERROR] ${res.status} ${res.statusText}`);
                    statusDiv.textContent = `Error: ${res.status} ${res.statusText}`;
                    statusDiv.style.color = 'var(--error)';
                    btn.disabled = false;
                    btn.innerHTML = 'Run Analysis';
                    return;
                }
                
                const resData = await res.json();
                const payload = resData.data || resData;
                const events = payload.activityEventEntities || [];
                
                let foundToday = 0;
                for(const e of events) {
                    if(e.Activity === "ViewReport" && e.ReportId === reportId) {
                        foundToday++;
                        totalViews++;
                        if(!dateStats[dateIso]) dateStats[dateIso] = 0;
                        dateStats[dateIso]++;
                    }
                }
                appendLog(`  -> Page ${pageCount}: Scanned ${events.length} events, found ${foundToday} target report views.`);
                continuationUri = payload.continuationUri || null;
                pageCount++;
                
                // Dynamically update the table as data flows in!
                if (foundToday > 0 || dateStats[dateIso] !== undefined) {
                    renderTableRows();
                    setTimeout(() => { tableDiv.scrollTop = tableDiv.scrollHeight; }, 20);
                }
            }
            currentDate.setDate(currentDate.getDate() + 1);
        }
        
        appendLog(`[DONE] Analysis Complete. Total Views: ${totalViews}`);
        statusDiv.textContent = `Analysis Complete: ${totalViews} total views.`;
        statusDiv.style.color = 'var(--success)';
        
    } catch (e) {
        appendLog(`[EXCEPTION] ${e.message}`);
        statusDiv.textContent = `Exception: ${e.message}`;
        statusDiv.style.color = 'var(--error)';
    } finally {
        btn.disabled = false;
        btn.innerHTML = 'Run Analysis';
    }
};"""

    js = rvc_pattern.sub(new_rvc, js)

    # Rewrite runCheckPermsWorkflow for split containers
    perms_pattern = re.compile(r'window\.runCheckPermsWorkflow = async function\(\) \{.*?(?=\n\s*// ==================== TABLE SORTING)', re.DOTALL)
    
    new_perms = """window.runCheckPermsWorkflow = async function() {
    const logsDiv = document.getElementById('wf-out-perms-logs');
    const tableDiv = document.getElementById('wf-out-perms-table');
    const statusDiv = document.getElementById('wf-perms-status');
    const btn = document.getElementById('btn-run-check-perms');
    
    btn.disabled = true;
    btn.innerHTML = 'Running...';
    
    logsDiv.innerHTML = '';
    
    const appendLog = (msg) => {
        const div = document.createElement('div');
        div.textContent = msg;
        logsDiv.appendChild(div);
        setTimeout(() => { logsDiv.scrollTop = logsDiv.scrollHeight; }, 10);
    };

    statusDiv.textContent = `Fetching /availableFeatures...`;
    statusDiv.style.color = 'var(--text-secondary)';
    appendLog(`[INIT] Calling GET /v1.0/myorg/availableFeatures ...`);
    
    try {
        const res = await fetch('/api/proxy', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ endpoint: '/availableFeatures', method: 'GET' })
        });
        
        if(!res.ok) {
            statusDiv.textContent = `Error: ${res.status} ${res.statusText}`;
            statusDiv.style.color = 'var(--error)';
            appendLog(`[ERROR] Failed to fetch: ${res.status} ${res.statusText}`);
            btn.disabled = false;
            btn.innerHTML = 'Run Check';
            return;
        }
        
        const data = await res.json();
        const payload = data.data || data;
        const featuresArray = payload.features;
        
        if (featuresArray && Array.isArray(featuresArray)) {
            appendLog(`[SUCCESS] Loaded ${featuresArray.length} features. Rendering table row by row...`);
            
            // Render table skeleton
            tableDiv.innerHTML = `
            <table data-table-id="perms" style="width: 100%; border-collapse: collapse; font-size: 0.75rem; text-align: left;">
                <thead>
                    <tr>
                        <th onclick="window.sortTable(this, event, 0)" style="background: #11141a; position: sticky; top: -12px; z-index: 5; padding: 8px 12px; border-bottom: 1px solid var(--panel-border); font-weight: 600; cursor: pointer; user-select: none; transition: background 0.2s;" onmouseover="this.style.background='#1e222d'" onmouseout="this.style.background='#11141a'">Feature Name</th>
                        <th onclick="window.sortTable(this, event, 1)" style="background: #11141a; position: sticky; top: -12px; z-index: 5; padding: 8px 12px; border-bottom: 1px solid var(--panel-border); font-weight: 600; cursor: pointer; user-select: none; transition: background 0.2s;" onmouseover="this.style.background='#1e222d'" onmouseout="this.style.background='#11141a'">State</th>
                        <th onclick="window.sortTable(this, event, 2)" style="background: #11141a; position: sticky; top: -12px; z-index: 5; padding: 8px 12px; border-bottom: 1px solid var(--panel-border); font-weight: 600; cursor: pointer; user-select: none; transition: background 0.2s;" onmouseover="this.style.background='#1e222d'" onmouseout="this.style.background='#11141a'">Extended State</th>
                    </tr>
                </thead>
                <tbody id="perms-dynamic-tbody"></tbody>
            </table>`;
            const tbody = document.getElementById('perms-dynamic-tbody');
            
            // Dynamically append rows
            for(let i=0; i<featuresArray.length; i++) {
                const f = featuresArray[i];
                const name = f.name || 'Unknown';
                const state = f.state || 'N/A';
                const extState = f.extendedState || 'N/A';
                
                let stateHtml = state;
                if(state === 'Enabled') {
                    stateHtml = `<span style="color: var(--success); font-weight: 500;">${state}</span>`;
                } else if(state === 'Disabled') {
                    stateHtml = `<span style="color: var(--error); font-weight: 500;">${state}</span>`;
                }
                
                const tr = document.createElement('tr');
                tr.style.cssText = "border-bottom: 1px solid var(--panel-border); transition: background 0.2s;";
                tr.onmouseover = () => tr.style.background='var(--overlay-10)';
                tr.onmouseout = () => tr.style.background='transparent';
                tr.innerHTML = `
                    <td style="padding: 8px 12px; color: var(--text-primary); font-family: monospace;">${name}</td>
                    <td style="padding: 8px 12px;">${stateHtml}</td>
                    <td style="padding: 8px 12px; color: var(--text-secondary);">${extState}</td>
                `;
                tbody.appendChild(tr);
            }
            appendLog(`[DONE] Table rendering complete.`);
            statusDiv.textContent = `Successfully loaded ${featuresArray.length} features.`;
            statusDiv.style.color = 'var(--success)';
        } else {
            appendLog(`[WARN] No features array found. Raw response below:\\n` + JSON.stringify(data, null, 2));
            statusDiv.textContent = `Loaded JSON format (No features array found).`;
            statusDiv.style.color = 'var(--warning)';
        }
        setTimeout(() => { tableDiv.scrollTop = tableDiv.scrollHeight; }, 50);
    } catch (e) {
        appendLog(`[EXCEPTION] ${e.message}`);
        statusDiv.textContent = `Exception: ${e.message}`;
        statusDiv.style.color = 'var(--error)';
    } finally {
        btn.disabled = false;
        btn.innerHTML = 'Run Check';
    }
};"""

    js = perms_pattern.sub(new_perms, js)

    # 3. Restore original handleCopyAction behavior since buttons are standard again
    handle_copy_pattern = re.compile(r'window\.handleCopyAction = function\(btn, text\) \{.*?(?=\n\s*window\.runCheckPermsWorkflow)', re.DOTALL)
    new_handle_copy = """window.handleCopyAction = function(btn, text) {
    if(!text) return;
    navigator.clipboard.writeText(text).then(() => {
        const origHTML = btn.innerHTML;
        btn.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--success)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>';
        btn.style.color = 'var(--success)';
        btn.style.borderColor = 'var(--success)';
        setTimeout(() => { 
            btn.innerHTML = origHTML; 
            btn.style.color = '';
            btn.style.borderColor = '';
        }, 1500);
    }).catch(err => {
        alert('Failed to copy: ' + err);
    });
};"""
    js = handle_copy_pattern.sub(new_handle_copy, js)

    with open(SCRIPT_FILE, 'w', encoding='utf-8') as f:
        f.write(js)

if __name__ == '__main__':
    patch_index()
    patch_script()
    print("Split containers with independent copy buttons restored!")
