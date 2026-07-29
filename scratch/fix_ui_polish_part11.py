import os
import re

INDEX_FILE = 'static/index.html'
SCRIPT_FILE = 'static/script.js'

def patch_index():
    with open(INDEX_FILE, 'r', encoding='utf-8') as f:
        html = f.read()

    # 1. Restore single box for RVC
    rvc_pattern = re.compile(r'<!-- JSON Section -->\s*<div.*?id="wf-rvc-json-container".*?<!-- Table Section -->.*?</div>\s*</div>', re.DOTALL)
    rvc_single = """<div style="position: relative;">
                                    <button type="button" class="wf-copy-btn" onclick="window.handleCopyAction(this, document.getElementById('wf-out-rvc').innerText)" title="Copy Output" style="top: 8px; right: 8px; z-index: 10;"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg></button>
                                    <div id="wf-out-rvc" class="wf-console" style="display: none; min-height: 150px; padding-bottom: 60px;"></div>
                                </div>"""
    html = rvc_pattern.sub(rvc_single, html)

    # 2. Restore single box for Check Perms
    perms_pattern = re.compile(r'<!-- JSON Section -->\s*<div style="position: relative; margin-bottom: 12px;">.*?id="wf-out-perms-json".*?<!-- Table Section -->.*?</div>\s*</div>', re.DOTALL)
    perms_single = """<div style="position: relative;">
                                    <button type="button" class="wf-copy-btn" onclick="window.handleCopyAction(this, document.getElementById('wf-out-perms').innerText)" title="Copy Output" style="top: 8px; right: 8px; z-index: 10;"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg></button>
                                    <div id="wf-out-perms" class="wf-console" style="min-height: 150px; padding-bottom: 60px;">Ready to check permissions...

Click "Run Check" to fetch /availableFeatures.</div>
                                </div>"""
    html = perms_pattern.sub(perms_single, html)
    
    html = re.sub(r'script\.js\?v=[\w_]+', 'script.js?v=20260729_v106_unified_dynamic', html)
    
    with open(INDEX_FILE, 'w', encoding='utf-8') as f:
        f.write(html)


def patch_script():
    with open(SCRIPT_FILE, 'r', encoding='utf-8') as f:
        js = f.read()

    # Rewrite runRvcWorkflow
    rvc_pattern = re.compile(r'window\.runRvcWorkflow = async function\(\) \{.*?(?=\n\s*window\.handleCopyAction =)', re.DOTALL)
    
    new_rvc = """window.runRvcWorkflow = async function() {
    const reportId = document.getElementById('wf-rvc-report').value;
    const startStr = document.getElementById('wf-rvc-start').value;
    const endStr = document.getElementById('wf-rvc-end').value;
    const statusDiv = document.getElementById('wf-rvc-status');
    const outDiv = document.getElementById('wf-out-rvc');
    
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

    outDiv.style.display = 'block';
    outDiv.innerHTML = `
        <div class="wf-logs" style="margin-bottom: 12px; color: var(--text-secondary); font-family: monospace;"></div>
        <div class="wf-table-container"></div>
    `;
    const logsDiv = outDiv.querySelector('.wf-logs');
    const tableContainer = outDiv.querySelector('.wf-table-container');
    
    const appendLog = (msg) => {
        const div = document.createElement('div');
        div.textContent = msg;
        logsDiv.appendChild(div);
        setTimeout(() => { outDiv.scrollTop = outDiv.scrollHeight; }, 10);
    };

    appendLog(`[INIT] Fetching Activity Events from ${startStr} to ${endStr}...`);
    statusDiv.textContent = `Running analysis...`;
    
    // Setup dynamic table skeleton
    tableContainer.innerHTML = `
    <table data-table-id="rvc" style="width: 100%; border-collapse: collapse; font-size: 0.75rem; text-align: left; display: none;">
        <thead>
            <tr>
                <th onclick="window.sortTable(this, event, 0)" style="background: #11141a; position: sticky; top: -12px; z-index: 5; padding: 8px 12px; border-bottom: 1px solid var(--panel-border); font-weight: 600; cursor: pointer; user-select: none; transition: background 0.2s;" onmouseover="this.style.background='#1e222d'" onmouseout="this.style.background='#11141a'">Time Window</th>
                <th onclick="window.sortTable(this, event, 1)" style="background: #11141a; position: sticky; top: -12px; z-index: 5; padding: 8px 12px; border-bottom: 1px solid var(--panel-border); font-weight: 600; cursor: pointer; user-select: none; transition: background 0.2s;" onmouseover="this.style.background='#1e222d'" onmouseout="this.style.background='#11141a'">User Info</th>
                <th onclick="window.sortTable(this, event, 2)" style="background: #11141a; position: sticky; top: -12px; z-index: 5; padding: 8px 12px; border-bottom: 1px solid var(--panel-border); font-weight: 600; cursor: pointer; user-select: none; transition: background 0.2s;" onmouseover="this.style.background='#1e222d'" onmouseout="this.style.background='#11141a'">Client IPs</th>
            </tr>
        </thead>
        <tbody id="rvc-dynamic-tbody"></tbody>
    </table>`;
    const tableEl = tableContainer.querySelector('table');
    const tbody = document.getElementById('rvc-dynamic-tbody');
    
    let totalViews = 0;
    let userStats = {}; // uid -> { count, first, last, ip: Set }
    
    const renderTableRows = () => {
        tableEl.style.display = 'table'; // Show table once we have data or try to render
        let rowsHtml = '';
        const sortedUsers = Object.keys(userStats).sort((a,b) => userStats[b].count - userStats[a].count);
        
        for(const uid of sortedUsers) {
            const st = userStats[uid];
            const ipsStr = Array.from(st.ips).join(', ');
            rowsHtml += `
                <tr style="border-bottom: 1px solid var(--panel-border); transition: background 0.2s;" onmouseover="this.style.background='var(--overlay-10)'" onmouseout="this.style.background='transparent'">
                    <td style="padding: 6px 12px; color: var(--text-primary); font-size: 0.7rem;">
                        <div style="font-weight: 500;">First: ${st.first.toLocaleString()}</div>
                        <div style="color: var(--text-secondary); margin-top: 2px;">Last: ${st.last.toLocaleString()}</div>
                    </td>
                    <td style="padding: 6px 12px;">
                        <div style="color: var(--info); font-weight: 500; margin-bottom: 2px;">${uid}</div>
                        <span style="display: inline-block; padding: 2px 6px; border-radius: 12px; background: var(--status-success-bg); color: var(--success); font-size: 0.65rem; border: 1px solid var(--success);">
                            ${st.count} views
                        </span>
                    </td>
                    <td style="padding: 6px 12px; color: var(--text-secondary); font-size: 0.7rem;">${ipsStr}</td>
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
                        const uid = e.UserId || 'Unknown';
                        const timeStr = e.CreationTime;
                        const t = new Date(timeStr);
                        const ip = e.ClientIP || 'N/A';
                        
                        if(!userStats[uid]) {
                            userStats[uid] = { count: 1, first: t, last: t, ips: new Set([ip]) };
                        } else {
                            userStats[uid].count++;
                            userStats[uid].ips.add(ip);
                            if(t < userStats[uid].first) userStats[uid].first = t;
                            if(t > userStats[uid].last) userStats[uid].last = t;
                        }
                    }
                }
                appendLog(`  -> Page ${pageCount}: Scanned ${events.length} events, found ${foundToday} target report views.`);
                continuationUri = payload.continuationUri || null;
                pageCount++;
                
                // Dynamically update the table as data flows in!
                if (foundToday > 0) {
                    renderTableRows();
                    setTimeout(() => { outDiv.scrollTop = outDiv.scrollHeight; }, 20);
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

    # Rewrite runCheckPermsWorkflow
    perms_pattern = re.compile(r'window\.runCheckPermsWorkflow = async function\(\) \{.*?(?=\n\s*// ==================== TABLE SORTING)', re.DOTALL)
    
    new_perms = """window.runCheckPermsWorkflow = async function() {
    const outDiv = document.getElementById('wf-out-perms');
    const statusDiv = document.getElementById('wf-perms-status');
    const btn = document.getElementById('btn-run-check-perms');
    
    btn.disabled = true;
    btn.innerHTML = 'Running...';
    
    outDiv.innerHTML = `
        <div class="wf-logs" style="margin-bottom: 12px; color: var(--text-secondary); font-family: monospace;"></div>
        <div class="wf-table-container"></div>
    `;
    const logsDiv = outDiv.querySelector('.wf-logs');
    const tableContainer = outDiv.querySelector('.wf-table-container');
    
    const appendLog = (msg) => {
        const div = document.createElement('div');
        div.textContent = msg;
        logsDiv.appendChild(div);
        setTimeout(() => { outDiv.scrollTop = outDiv.scrollHeight; }, 10);
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
            tableContainer.innerHTML = `
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
            
            // Dynamically append rows to simulate streaming UI and satisfy "拿到一个信息就在表格中新增一行"
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
        setTimeout(() => { outDiv.scrollTop = outDiv.scrollHeight; }, 50);
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

    with open(SCRIPT_FILE, 'w', encoding='utf-8') as f:
        f.write(js)


if __name__ == '__main__':
    patch_index()
    patch_script()
    print("Unified dynamic console patch applied!")
