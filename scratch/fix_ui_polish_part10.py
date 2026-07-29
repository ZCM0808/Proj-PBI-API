import os
import re

SCRIPT_FILE = 'static/script.js'

with open(SCRIPT_FILE, 'r', encoding='utf-8') as f:
    js = f.read()

# 1. Update Check Perms Table TH to top: -12px (fixes sticky inside padded container)
js = js.replace('top: 0;', 'top: -12px;')

# 2. Rewrite runRvcWorkflow entirely
pattern = re.compile(r'window\.runRvcWorkflow = async function\(\) \{.*?(?=\n\s*window\.handleCopyAction =)', re.DOTALL)

new_rvc = """window.runRvcWorkflow = async function() {
    const reportId = document.getElementById('wf-rvc-report').value;
    const startStr = document.getElementById('wf-rvc-start').value;
    const endStr = document.getElementById('wf-rvc-end').value;
    const statusDiv = document.getElementById('wf-rvc-status');
    const jsonContainer = document.getElementById('wf-rvc-json-container');
    const tableContainer = document.getElementById('wf-rvc-table-container');
    const jsonDiv = document.getElementById('wf-out-rvc-json');
    const tableDiv = document.getElementById('wf-out-rvc-table');
    
    if(!reportId || !startStr || !endStr) {
        statusDiv.textContent = 'Error: Please select a report and date range.';
        statusDiv.style.color = 'var(--error)';
        return;
    }
    statusDiv.style.color = 'var(--text-secondary)';
    
    // Validate range
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

    statusDiv.textContent = `Fetching Activity Events from ${startStr} to ${endStr}... (Requires Power BI Admin)`;
    jsonContainer.style.display = 'block';
    tableContainer.style.display = 'block';
    jsonDiv.textContent = 'Loading JSON...';
    tableDiv.innerHTML = 'Loading Table...\n';
    
    let totalViews = 0;
    let userStats = {}; // uid -> { count, first, last, ip: Set }
    let allRawData = []; // Store all responses for JSON output
    
    const btn = document.getElementById('btn-run-rvc');
    btn.disabled = true;
    btn.innerHTML = 'Running...';
    
    try {
        let currentDate = new Date(dStart);
        while(currentDate <= dEnd) {
            const dateIso = currentDate.toISOString().split('T')[0];
            statusDiv.textContent = `Fetching events for ${dateIso}...`;
            
            const startDateTime = `'${dateIso}T00:00:00Z'`;
            const endDateTime = `'${dateIso}T23:59:59Z'`;
            let url = `/admin/activityevents?startDateTime=${startDateTime}&endDateTime=${endDateTime}`;
            
            let continuationUri = url;
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
                    statusDiv.textContent = `Error: ${res.status} ${res.statusText}`;
                    if(res.status === 401 || res.status === 403) statusDiv.textContent += ` (Must be PBI Admin)`;
                    statusDiv.style.color = 'var(--error)';
                    jsonDiv.textContent = `Failed to fetch: ${res.status} ${res.statusText}`;
                    btn.disabled = false;
                    btn.innerHTML = 'Run Analysis';
                    return;
                }
                
                const resData = await res.json();
                allRawData.push(resData);
                
                // Fix proxy nesting issue
                const payload = resData.data || resData;
                const events = payload.activityEventEntities || [];
                
                for(const e of events) {
                    if(e.Activity === "ViewReport" && e.ReportId === reportId) {
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
                continuationUri = payload.continuationUri || null;
            }
            currentDate.setDate(currentDate.getDate() + 1);
        }
        
        // 1. Output RAW JSON
        jsonDiv.textContent = JSON.stringify(allRawData, null, 2);
        
        // 2. Build Table
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
        
        let tableHtml = `
        <table data-table-id="rvc" style="width: 100%; border-collapse: collapse; font-size: 0.75rem; text-align: left;">
            <thead>
                <tr>
                    <th onclick="window.sortTable(this, event, 0)" style="background: #11141a; position: sticky; top: -12px; z-index: 5; padding: 8px 12px; border-bottom: 1px solid var(--panel-border); font-weight: 600; cursor: pointer; user-select: none; transition: background 0.2s;" onmouseover="this.style.background='#1e222d'" onmouseout="this.style.background='#11141a'">Time Window</th>
                    <th onclick="window.sortTable(this, event, 1)" style="background: #11141a; position: sticky; top: -12px; z-index: 5; padding: 8px 12px; border-bottom: 1px solid var(--panel-border); font-weight: 600; cursor: pointer; user-select: none; transition: background 0.2s;" onmouseover="this.style.background='#1e222d'" onmouseout="this.style.background='#11141a'">User Info</th>
                    <th onclick="window.sortTable(this, event, 2)" style="background: #11141a; position: sticky; top: -12px; z-index: 5; padding: 8px 12px; border-bottom: 1px solid var(--panel-border); font-weight: 600; cursor: pointer; user-select: none; transition: background 0.2s;" onmouseover="this.style.background='#1e222d'" onmouseout="this.style.background='#11141a'">Client IPs</th>
                </tr>
            </thead>
            <tbody>${rowsHtml}</tbody>
        </table>`;
        
        tableDiv.innerHTML = tableHtml;
        statusDiv.textContent = `Analysis Complete: ${totalViews} total views by ${sortedUsers.length} unique viewers.`;
        statusDiv.style.color = 'var(--success)';
        setTimeout(() => { 
            jsonDiv.scrollTop = jsonDiv.scrollHeight; 
            tableDiv.scrollTop = tableDiv.scrollHeight; 
        }, 50);
        
    } catch (e) {
        statusDiv.textContent = `Exception: ${e.message}`;
        statusDiv.style.color = 'var(--error)';
    } finally {
        btn.disabled = false;
        btn.innerHTML = 'Run Analysis';
    }
};"""

js = pattern.sub(new_rvc, js)

with open(SCRIPT_FILE, 'w', encoding='utf-8') as f:
    f.write(js)
print("Script updated for RVC proxy fix and sticky padding fix")
