import re

with open('static/script.js', 'r', encoding='utf-8') as f:
    js = f.read()

# 1. Hide the new pane in the change listener
hide_target = "document.getElementById('wf-config-check_permissions').style.display = 'none';"
hide_replacement = hide_target + "\n              const gumPane = document.getElementById('wf-config-global_user_manager'); if(gumPane) gumPane.style.display = 'none';"
if hide_target in js:
    js = js.replace(hide_target, hide_replacement)

# 2. Show the new pane if selected
show_target = "} else if (val === 'check_permissions') {"
show_replacement = "} else if (val === 'global_user_manager') {\n                  document.getElementById('wf-config-global_user_manager').style.display = 'block';\n              " + show_target
if show_target in js:
    js = js.replace(show_target, show_replacement)

# 3. Add to wf-btn-runall execution logic
runall_target = "} else if (wfType === 'smart_pipeline') {"
runall_replacement = "} else if (wfType === 'global_user_manager') {\n                      if (window.runGlobalUserManager) await window.runGlobalUserManager();\n                  " + runall_target
if runall_target in js:
    js = js.replace(runall_target, runall_replacement)

# 4. Append the new functions
new_logic = """

// --- Global User Manager Logic ---
window.gumData = [];

window.runGlobalUserManager = async function() {
    const logsDiv = document.getElementById('wf-out-gum-logs');
    const tableDiv = document.getElementById('wf-out-gum-table');
    const statsSpan = document.getElementById('wf-gum-stats');
    
    logsDiv.innerHTML = '';
    tableDiv.innerHTML = 'Scanning workspaces...';
    statsSpan.textContent = '';
    window.gumData = [];
    
    const appendLog = (msg) => {
        const div = document.createElement('div');
        div.style.marginBottom = '2px';
        div.style.paddingLeft = '10px';
        div.style.borderLeft = '2px solid var(--accent)';
        div.textContent = msg;
        logsDiv.appendChild(div);
        logsDiv.scrollTop = Math.max(0, logsDiv.scrollHeight - logsDiv.clientHeight * 0.66);
    };

    try {
        appendLog(`[1] Fetching all workspaces...`);
        const tokenStr = localStorage.getItem('pbiToken') || '';
        if (!tokenStr) { appendLog('Error: Token not found'); return; }

        const wsRes = await fetch('https://api.powerbi.com/v1.0/myorg/groups?$top=100', {
            headers: { 'Authorization': `Bearer ${tokenStr}` }
        });
        
        if (!wsRes.ok) throw new Error(`Failed to fetch workspaces: ${wsRes.statusText}`);
        const wsData = await wsRes.json();
        const workspaces = wsData.value || [];
        appendLog(`[OK] Found ${workspaces.length} workspaces. Starting user scan...`);
        
        let processed = 0;
        let totalUsers = 0;
        
        for (const ws of workspaces) {
            processed++;
            appendLog(`[${processed}/${workspaces.length}] Scanning users for: ${ws.name}`);
            try {
                const uRes = await fetch(`https://api.powerbi.com/v1.0/myorg/groups/${ws.id}/users`, {
                    headers: { 'Authorization': `Bearer ${tokenStr}` }
                });
                if (uRes.ok) {
                    const uData = await uRes.json();
                    const users = uData.value || [];
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
                    appendLog(`   -> Failed: HTTP ${uRes.status}`);
                }
            } catch (err) {
                appendLog(`   -> Error: ${err.message}`);
            }
            
            // Add a slight delay to avoid rate limiting
            await new Promise(r => setTimeout(r, 100));
        }
        
        appendLog(`\\n[DONE] Scan complete! Found ${totalUsers} user permission records across ${workspaces.length} workspaces.`);
        window.filterGumTable();
        
    } catch (e) {
        appendLog(`[EXCEPTION] ${e.message}`);
    }
};

window.filterGumTable = function() {
    const term = (document.getElementById('wf-gum-search').value || '').toLowerCase();
    const tableDiv = document.getElementById('wf-out-gum-table');
    const statsSpan = document.getElementById('wf-gum-stats');
    
    const filtered = window.gumData.filter(d => 
        (d.wsName || '').toLowerCase().includes(term) ||
        (d.identifier || '').toLowerCase().includes(term) ||
        (d.role || '').toLowerCase().includes(term) ||
        (d.principalType || '').toLowerCase().includes(term)
    );
    
    statsSpan.textContent = `${filtered.length} records`;
    
    if (filtered.length === 0) {
        tableDiv.innerHTML = '<div style="padding: 20px; color: var(--text-secondary); text-align: center;">No matching records found.</div>';
        return;
    }
    
    let html = `
    <table class="data-table" style="width: 100%; border-collapse: collapse; margin-top: 8px;">
        <thead style="position: sticky; top: 0; background: var(--panel-bg); z-index: 10;">
            <tr>
                <th style="padding: 8px; text-align: left; border-bottom: 2px solid var(--overlay-10);">Workspace</th>
                <th style="padding: 8px; text-align: left; border-bottom: 2px solid var(--overlay-10);">User / Principal</th>
                <th style="padding: 8px; text-align: left; border-bottom: 2px solid var(--overlay-10);">Type</th>
                <th style="padding: 8px; text-align: left; border-bottom: 2px solid var(--overlay-10);">Role</th>
                <th style="padding: 8px; text-align: left; border-bottom: 2px solid var(--overlay-10); width: 100px;">Actions</th>
            </tr>
        </thead>
        <tbody>`;
        
    for (const d of filtered) {
        html += `
            <tr style="border-bottom: 1px solid var(--overlay-10);">
                <td style="padding: 8px; font-size: 0.85rem; max-width: 150px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;" title="${d.wsName}">${d.wsName}</td>
                <td style="padding: 8px; font-size: 0.85rem; word-break: break-all;" title="${d.identifier}">${d.identifier}</td>
                <td style="padding: 8px; font-size: 0.85rem;"><span style="background: var(--overlay-10); padding: 2px 6px; border-radius: 12px; font-size: 0.75rem;">${d.principalType}</span></td>
                <td style="padding: 8px; font-size: 0.85rem; font-weight: bold; color: ${d.role==='Admin'?'var(--accent)':(d.role==='Member'?'var(--success)':'var(--text-primary)')}">${d.role}</td>
                <td style="padding: 8px; display: flex; gap: 4px;">
                    <button class="icon-btn" title="Edit Role" style="padding: 4px;" onclick="window.editGumUser('${d.wsId}', '${d.wsName.replace(/'/g, "\\'")}', '${d.identifier}', '${d.principalType}', '${d.role}')">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
                    </button>
                    <button class="icon-btn" title="Remove User" style="padding: 4px; color: var(--error);" onclick="window.deleteGumUser('${d.wsId}', '${d.identifier}', '${d.wsName.replace(/'/g, "\\'")}')">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                    </button>
                </td>
            </tr>`;
    }
    
    html += `</tbody></table>`;
    tableDiv.innerHTML = html;
};

window.editGumUser = function(wsId, wsName, identifier, principalType, currentRole) {
    document.getElementById('gum-edit-ws-id').value = wsId;
    document.getElementById('gum-edit-ws-name').value = wsName;
    document.getElementById('gum-edit-identifier').value = identifier;
    document.getElementById('gum-edit-principal-type').value = principalType;
    document.getElementById('gum-edit-role').value = currentRole;
    document.getElementById('gum-edit-modal').style.display = 'flex';
};

window.submitGumEdit = async function() {
    const wsId = document.getElementById('gum-edit-ws-id').value;
    const identifier = document.getElementById('gum-edit-identifier').value;
    const principalType = document.getElementById('gum-edit-principal-type').value;
    const newRole = document.getElementById('gum-edit-role').value;
    const tokenStr = localStorage.getItem('pbiToken') || '';
    
    const logsDiv = document.getElementById('wf-out-gum-logs');
    
    document.getElementById('gum-edit-modal').style.display = 'none';
    
    // Log the action
    const div = document.createElement('div');
    div.style.paddingLeft = '10px';
    div.style.borderLeft = '2px solid var(--warning)';
    div.textContent = `[UPDATE] Changing role of ${identifier} to ${newRole} ...`;
    logsDiv.appendChild(div);
    
    try {
        const body = {
            identifier: identifier,
            groupUserAccessRight: newRole,
            principalType: principalType
        };
        
        const res = await fetch(`https://api.powerbi.com/v1.0/myorg/groups/${wsId}/users`, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${tokenStr}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(body)
        });
        
        if (res.ok) {
            div.textContent += " OK (Updated)";
            div.style.borderLeft = '2px solid var(--success)';
            // Update local state and re-render
            const rec = window.gumData.find(d => d.wsId === wsId && d.identifier === identifier);
            if(rec) rec.role = newRole;
            window.filterGumTable();
        } else {
            const errJson = await res.json().catch(()=>({}));
            div.textContent += ` FAILED: ${res.status} ${JSON.stringify(errJson)}`;
            div.style.borderLeft = '2px solid var(--error)';
        }
    } catch(err) {
        div.textContent += ` EXCEPTION: ${err.message}`;
        div.style.borderLeft = '2px solid var(--error)';
    }
    logsDiv.scrollTop = Math.max(0, logsDiv.scrollHeight - logsDiv.clientHeight * 0.66);
};

window.deleteGumUser = async function(wsId, identifier, wsName) {
    if (!confirm(`Are you sure you want to completely REMOVE access for:\\n${identifier}\\nfrom workspace [${wsName}]?`)) return;
    
    const tokenStr = localStorage.getItem('pbiToken') || '';
    const logsDiv = document.getElementById('wf-out-gum-logs');
    
    const div = document.createElement('div');
    div.style.paddingLeft = '10px';
    div.style.borderLeft = '2px solid var(--error)';
    div.textContent = `[DELETE] Removing ${identifier} from ${wsName} ...`;
    logsDiv.appendChild(div);
    
    try {
        const res = await fetch(`https://api.powerbi.com/v1.0/myorg/groups/${wsId}/users/${encodeURIComponent(identifier)}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${tokenStr}` }
        });
        
        if (res.ok) {
            div.textContent += " OK (Removed)";
            // Remove from local state
            window.gumData = window.gumData.filter(d => !(d.wsId === wsId && d.identifier === identifier));
            window.filterGumTable();
        } else {
            div.textContent += ` FAILED: ${res.status}`;
        }
    } catch(err) {
        div.textContent += ` EXCEPTION: ${err.message}`;
    }
    logsDiv.scrollTop = Math.max(0, logsDiv.scrollHeight - logsDiv.clientHeight * 0.66);
};
"""

js += new_logic

with open('static/script.js', 'w', encoding='utf-8') as f:
    f.write(js)

print("script.js patched")
