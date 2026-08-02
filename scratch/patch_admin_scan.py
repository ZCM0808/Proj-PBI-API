import re

# 1. Update HTML
with open('static/index.html', 'r', encoding='utf-8') as f:
    html = f.read()

target_html = """                                        <div style="font-size: 0.75rem; font-weight: bold; margin-bottom: 4px; color: var(--text-secondary); display: flex; align-items: center; justify-content: space-between; user-select: none;">
                                            <div style="display: flex; align-items: center; cursor: pointer; width: fit-content;" onclick="window.toggleConsole('wf-out-gum-logs')">
                                                <svg id="wf-out-gum-logs-chevron" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="margin-right: 4px; transition: transform 0.2s; transform: rotate(0deg);"><polyline points="9 18 15 12 9 6"></polyline></svg>Execution Logs
                                            </div>
                                            <button class="btn-action-primary" id="btn-run-gum" style="padding: 4px 12px; font-size: 0.75rem; height: 24px;" onclick="if(window.runGlobalUserManager) window.runGlobalUserManager()">Run Scan</button>
                                        </div>"""

replacement_html = """                                        <div style="font-size: 0.75rem; font-weight: bold; margin-bottom: 4px; color: var(--text-secondary); display: flex; align-items: center; justify-content: space-between; user-select: none;">
                                            <div style="display: flex; align-items: center; cursor: pointer; width: fit-content;" onclick="window.toggleConsole('wf-out-gum-logs')">
                                                <svg id="wf-out-gum-logs-chevron" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="margin-right: 4px; transition: transform 0.2s; transform: rotate(0deg);"><polyline points="9 18 15 12 9 6"></polyline></svg>Execution Logs
                                            </div>
                                            <div style="display: flex; align-items: center; gap: 12px;">
                                                <label style="display: flex; align-items: center; gap: 4px; cursor: pointer; color: var(--text-secondary); font-size: 0.75rem; font-weight: normal;">
                                                    <input type="checkbox" id="gum-admin-mode" class="wf-input" style="width: auto; margin: 0; cursor: pointer;">
                                                    Admin Mode (All Workspaces)
                                                </label>
                                                <button class="btn-action-primary" id="btn-run-gum" style="padding: 4px 12px; font-size: 0.75rem; height: 24px;" onclick="if(window.runGlobalUserManager) window.runGlobalUserManager()">Run Scan</button>
                                            </div>
                                        </div>"""

if target_html in html:
    html = html.replace(target_html, replacement_html)
    html = re.sub(r'v147', 'v148', html)
    with open('static/index.html', 'w', encoding='utf-8') as f:
        f.write(html)
    print("HTML patched")

# 2. Update JS
with open('static/script.js', 'r', encoding='utf-8') as f:
    js = f.read()

target_js = """    try {
        appendLog(`[1] Fetching all workspaces...`);
        const wsRes = await fetch('/api/proxy', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ endpoint: '/groups?$top=100', method: 'GET' })
        });
        
        if (!wsRes.ok) throw new Error(`Failed to fetch workspaces: ${wsRes.statusText}`);
        const wsData = await wsRes.json();
        const wsPayload = wsData.data || wsData;
        const workspaces = wsPayload.value || [];
        window.gumWorkspaces = workspaces;
        appendLog(`[OK] Found ${workspaces.length} workspaces. Starting user scan...`);
        
        let processed = 0;
        let totalUsers = 0;
        
        for (const ws of workspaces) {
            processed++;
            appendLog(`[${processed}/${workspaces.length}] Scanning users for: ${ws.name}`);
            try {
                const uRes = await fetch('/api/proxy', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ endpoint: `/groups/${ws.id}/users`, method: 'GET' })
                });
                if (uRes.ok) {
                    const uData = await uRes.json();
                    const uPayload = uData.data || uData;
                    const users = uPayload.value || [];
                    for (const u of users) {
                        window.gumData.push({
                            wsId: ws.id,
                            wsName: ws.name,
                            identifier: u.identifier,
                            principalType: u.principalType,
                            role: u.groupUserAccessRight
                        });
                        totalUsers++;
                    }
                } else {
                    appendLog(`   -> Failed: ${uRes.status}`);
                }
            } catch (err) {
                appendLog(`   -> Error: ${err.message}`);
            }
        }"""

replacement_js = """    try {
        const isAdminMode = document.getElementById('gum-admin-mode')?.checked;
        
        appendLog(`[1] Fetching workspaces (${isAdminMode ? 'Admin Mode: All Workspaces' : 'Standard Mode: Assigned Only'})...`);
        
        const wsEndpoint = isAdminMode ? '/admin/groups?$top=5000&$expand=users' : '/groups?$top=100';
        
        const wsRes = await fetch('/api/proxy', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ endpoint: wsEndpoint, method: 'GET' })
        });
        
        if (!wsRes.ok) {
            if (isAdminMode) {
                appendLog(`[ERROR] Admin Scan failed (${wsRes.status}). Ensure Service Principal has Tenant.Read.All and is enabled in Power BI Admin Portal.`);
            }
            throw new Error(`Failed to fetch workspaces: ${wsRes.statusText}`);
        }
        
        const wsData = await wsRes.json();
        const wsPayload = wsData.data || wsData;
        const workspaces = wsPayload.value || [];
        window.gumWorkspaces = workspaces;
        appendLog(`[OK] Found ${workspaces.length} workspaces. Starting user processing...`);
        
        let processed = 0;
        let totalUsers = 0;
        
        if (isAdminMode) {
            // In Admin mode, $expand=users provides all users immediately! No need to loop requests.
            appendLog(`[2] Extracting users from Admin API response (Instant Mode)...`);
            for (const ws of workspaces) {
                const users = ws.users || [];
                for (const u of users) {
                    window.gumData.push({
                        wsId: ws.id,
                        wsName: ws.name,
                        identifier: u.identifier,
                        principalType: u.principalType,
                        role: u.groupUserAccessRight
                    });
                    totalUsers++;
                }
            }
        } else {
            // Standard mode requires looping over each workspace
            for (const ws of workspaces) {
                processed++;
                appendLog(`[${processed}/${workspaces.length}] Scanning users for: ${ws.name}`);
                try {
                    const uRes = await fetch('/api/proxy', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ endpoint: `/groups/${ws.id}/users`, method: 'GET' })
                    });
                    if (uRes.ok) {
                        const uData = await uRes.json();
                        const uPayload = uData.data || uData;
                        const users = uPayload.value || [];
                        for (const u of users) {
                            window.gumData.push({
                                wsId: ws.id,
                                wsName: ws.name,
                                identifier: u.identifier,
                                principalType: u.principalType,
                                role: u.groupUserAccessRight
                            });
                            totalUsers++;
                        }
                    } else {
                        appendLog(`   -> Failed: ${uRes.status}`);
                    }
                } catch (err) {
                    appendLog(`   -> Error: ${err.message}`);
                }
            }
        }"""

if target_js in js:
    js = js.replace(target_js, replacement_js)
    with open('static/script.js', 'w', encoding='utf-8') as f:
        f.write(js)
    print("JS patched")
