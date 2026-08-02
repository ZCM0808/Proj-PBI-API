import re

with open('static/script.js', 'r', encoding='utf-8') as f:
    js = f.read()

start_marker = "    try {\n        appendLog(`[1] Fetching all workspaces...`);"
end_marker = "            } catch (err) {\n                appendLog(`   -> Error: ${err.message}`);\n            }\n        }"

start_idx = js.find(start_marker)
end_idx = js.find(end_marker, start_idx) + len(end_marker)

if start_idx != -1 and end_idx != -1:
    target = js[start_idx:end_idx]
    
    replacement = """    try {
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
        
    js = js.replace(target, replacement)
    with open('static/script.js', 'w', encoding='utf-8') as f:
        f.write(js)
    print("JS patched dynamically")
else:
    print("Could not find markers in JS")
