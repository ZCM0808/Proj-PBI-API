import os
import re

INDEX_FILE = 'static/index.html'
SCRIPT_FILE = 'static/script.js'

def patch_index():
    with open(INDEX_FILE, 'r', encoding='utf-8') as f:
        html = f.read()

    # RVC Copy Buttons
    rvc_btn_pattern = re.compile(r'<button type="button" class="wf-copy-btn" onclick="window\.handleCopyAction\(this, document\.getElementById\(\'wf-out-rvc\'\)\.innerText\)" title="Copy Output".*?</button>', re.DOTALL)
    rvc_new_btns = """<div class="wf-copy-toolbar" style="position: absolute; top: 8px; right: 8px; z-index: 10; display: flex; gap: 6px;">
                                        <button type="button" class="wf-copy-btn" style="position: static; width: auto; padding: 4px 8px; font-size: 0.7rem; border-radius: 4px; display: flex; align-items: center; gap: 4px; border: 1px solid var(--panel-border); background: var(--dropdown-bg); cursor: pointer;" onclick="window.handleCopyAction(this, document.querySelector('#wf-out-rvc .wf-logs')?.innerText || '')">
                                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg> Copy Logs
                                        </button>
                                        <button type="button" class="wf-copy-btn" style="position: static; width: auto; padding: 4px 8px; font-size: 0.7rem; border-radius: 4px; display: flex; align-items: center; gap: 4px; border: 1px solid var(--panel-border); background: var(--dropdown-bg); cursor: pointer;" onclick="window.handleCopyAction(this, document.querySelector('#wf-out-rvc .wf-table-container')?.innerText || '')">
                                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><line x1="3" y1="9" x2="21" y2="9"></line><line x1="9" y1="21" x2="9" y2="9"></line></svg> Copy Table
                                        </button>
                                    </div>"""
    html = rvc_btn_pattern.sub(rvc_new_btns, html)

    # Perms Copy Buttons
    perms_btn_pattern = re.compile(r'<button type="button" class="wf-copy-btn" onclick="window\.handleCopyAction\(this, document\.getElementById\(\'wf-out-perms\'\)\.innerText\)" title="Copy Output".*?</button>', re.DOTALL)
    perms_new_btns = """<div class="wf-copy-toolbar" style="position: absolute; top: 8px; right: 8px; z-index: 10; display: flex; gap: 6px;">
                                        <button type="button" class="wf-copy-btn" style="position: static; width: auto; padding: 4px 8px; font-size: 0.7rem; border-radius: 4px; display: flex; align-items: center; gap: 4px; border: 1px solid var(--panel-border); background: var(--dropdown-bg); cursor: pointer;" onclick="window.handleCopyAction(this, document.querySelector('#wf-out-perms .wf-logs')?.innerText || '')">
                                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg> Copy Logs
                                        </button>
                                        <button type="button" class="wf-copy-btn" style="position: static; width: auto; padding: 4px 8px; font-size: 0.7rem; border-radius: 4px; display: flex; align-items: center; gap: 4px; border: 1px solid var(--panel-border); background: var(--dropdown-bg); cursor: pointer;" onclick="window.handleCopyAction(this, document.querySelector('#wf-out-perms .wf-table-container')?.innerText || '')">
                                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><line x1="3" y1="9" x2="21" y2="9"></line><line x1="9" y1="21" x2="9" y2="9"></line></svg> Copy Table
                                        </button>
                                    </div>"""
    html = perms_btn_pattern.sub(perms_new_btns, html)

    html = re.sub(r'script\.js\?v=[\w_]+', 'script.js?v=20260729_v107_rvc_daily_splitcopy', html)
    
    with open(INDEX_FILE, 'w', encoding='utf-8') as f:
        f.write(html)


def patch_script():
    with open(SCRIPT_FILE, 'r', encoding='utf-8') as f:
        js = f.read()

    # Rewrite runRvcWorkflow entirely for daily view count (2 columns)
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
    
    // Setup dynamic table skeleton (2 Columns)
    tableContainer.innerHTML = `
    <table data-table-id="rvc" style="width: 100%; border-collapse: collapse; font-size: 0.75rem; text-align: left; display: none;">
        <thead>
            <tr>
                <th onclick="window.sortTable(this, event, 0)" style="background: #11141a; position: sticky; top: -12px; z-index: 5; padding: 8px 12px; border-bottom: 1px solid var(--panel-border); font-weight: 600; cursor: pointer; user-select: none; transition: background 0.2s;" onmouseover="this.style.background='#1e222d'" onmouseout="this.style.background='#11141a'">Date</th>
                <th onclick="window.sortTable(this, event, 1)" style="background: #11141a; position: sticky; top: -12px; z-index: 5; padding: 8px 12px; border-bottom: 1px solid var(--panel-border); font-weight: 600; cursor: pointer; user-select: none; transition: background 0.2s;" onmouseover="this.style.background='#1e222d'" onmouseout="this.style.background='#11141a'">View Count</th>
            </tr>
        </thead>
        <tbody id="rvc-dynamic-tbody"></tbody>
    </table>`;
    const tableEl = tableContainer.querySelector('table');
    const tbody = document.getElementById('rvc-dynamic-tbody');
    
    let totalViews = 0;
    let dateStats = {}; // dateIso -> count
    
    const renderTableRows = () => {
        tableEl.style.display = 'table'; // Show table once we have data
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
                
                // Dynamically append/update row for the current date
                if (foundToday > 0 || dateStats[dateIso] !== undefined) {
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

    # 2. Fix the copy button handler slightly so it works with the custom button SVG swap
    handle_copy_pattern = re.compile(r'window\.handleCopyAction = function\(btn, text\) \{.*?(?=\n\s*window\.runCheckPermsWorkflow)', re.DOTALL)
    new_handle_copy = """window.handleCopyAction = function(btn, text) {
    if(!text) return;
    navigator.clipboard.writeText(text).then(() => {
        const origHTML = btn.innerHTML;
        btn.innerHTML = '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="var(--success)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg> Copied!';
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
    print("Patch applied for dual copy buttons and 2-column RVC table!")
