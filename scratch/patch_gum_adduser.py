import re

with open('static/index.html', 'r', encoding='utf-8') as f:
    html = f.read()

# 1. Add the "Add User" button
target_btn = """                                    <div style="flex: 1;">
                                        <label style="font-size: 0.85rem; color: var(--text-secondary);">搜索 (Search) / Filter</label>
                                        <input type="text" id="wf-gum-search" class="wf-input" placeholder="Search by user email, name or workspace..." onkeyup="if(window.filterGumTable) window.filterGumTable()">
                                    </div>
                                </div>"""

replacement_btn = """                                    <div style="flex: 1;">
                                        <label style="font-size: 0.85rem; color: var(--text-secondary);">搜索 (Search) / Filter</label>
                                        <input type="text" id="wf-gum-search" class="wf-input" placeholder="Search by user email, name or workspace..." onkeyup="if(window.filterGumTable) window.filterGumTable()">
                                    </div>
                                    <div style="padding-bottom: 2px;">
                                        <button class="btn-action-primary" style="height: 34px; padding: 0 16px;" onclick="if(window.openGumAddUserModal) window.openGumAddUserModal()">+ Add User</button>
                                    </div>
                                </div>"""
if target_btn in html:
    html = html.replace(target_btn, replacement_btn)

# 2. Add the Add User Modal HTML right next to Edit User Modal
target_modal = """    <!-- Edit User Permission Modal -->"""

add_modal_html = """
    <!-- Add User Permission Modal -->
    <div id="gum-add-modal" class="modal-overlay" style="display: none; z-index: 20000;">
        <div class="modal-content glass-panel" style="max-width: 400px; width: 90%;">
            <div class="modal-header">
                <h3 style="font-size: 1.05rem;">Add User to Workspace</h3>
                <button type="button" class="close-btn" onclick="document.getElementById('gum-add-modal').style.display='none'"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 6L6 18M6 6l12 12"></path></svg></button>
            </div>
            <div class="modal-body" style="padding: 16px;">
                <div style="margin-bottom: 12px;">
                    <label style="font-size: 0.85rem; color: var(--text-secondary); display: block; margin-bottom: 4px;">Workspace</label>
                    <select id="gum-add-ws-id" class="wf-input">
                        <option value="">Select a Workspace...</option>
                    </select>
                </div>
                
                <div style="margin-bottom: 12px;">
                    <label style="font-size: 0.85rem; color: var(--text-secondary); display: block; margin-bottom: 4px;">User / Principal Email</label>
                    <input type="text" id="gum-add-identifier" class="wf-input" placeholder="e.g. zhangsan@company.com">
                </div>
                
                <div style="margin-bottom: 12px;">
                    <label style="font-size: 0.85rem; color: var(--text-secondary); display: block; margin-bottom: 4px;">Principal Type</label>
                    <select id="gum-add-principal-type" class="wf-input">
                        <option value="User">User</option>
                        <option value="Group">Group</option>
                        <option value="App">App (Service Principal)</option>
                    </select>
                </div>
                
                <div style="margin-bottom: 16px;">
                    <label style="font-size: 0.85rem; color: var(--text-secondary); display: block; margin-bottom: 4px;">Access Right (Role)</label>
                    <select id="gum-add-role" class="wf-input">
                        <option value="Admin">Admin</option>
                        <option value="Member">Member</option>
                        <option value="Contributor">Contributor</option>
                        <option value="Viewer" selected>Viewer</option>
                    </select>
                </div>
                
                <div style="display: flex; gap: 8px; justify-content: flex-end;">
                    <button type="button" class="btn-cancel" onclick="document.getElementById('gum-add-modal').style.display='none'">Cancel</button>
                    <button type="button" class="btn-action-primary" onclick="if(window.submitGumAddUser) window.submitGumAddUser()">Add User</button>
                </div>
            </div>
        </div>
    </div>
"""
if target_modal in html:
    html = html.replace(target_modal, add_modal_html + "\n" + target_modal)

html = re.sub(r'v142', 'v143', html)
with open('static/index.html', 'w', encoding='utf-8') as f:
    f.write(html)


with open('static/script.js', 'r', encoding='utf-8') as f:
    js = f.read()

# 3. Add window.gumWorkspaces global list to script.js
target_js_1 = "window.gumData = [];"
replacement_js_1 = "window.gumData = [];\nwindow.gumWorkspaces = [];"
if target_js_1 in js:
    js = js.replace(target_js_1, replacement_js_1)
    
target_js_2 = "        const workspaces = wsPayload.value || [];"
replacement_js_2 = "        const workspaces = wsPayload.value || [];\n        window.gumWorkspaces = workspaces;"
if target_js_2 in js:
    js = js.replace(target_js_2, replacement_js_2)

# 4. Append JS Logic for Add User Modal
new_logic = """
window.openGumAddUserModal = function() {
    const sel = document.getElementById('gum-add-ws-id');
    sel.innerHTML = '<option value="">Select a Workspace...</option>';
    
    if (!window.gumWorkspaces || window.gumWorkspaces.length === 0) {
        alert('Please run the "Scan" first to populate the workspaces list!');
        return;
    }
    
    // Populate workspaces sorted by name
    const wses = [...window.gumWorkspaces].sort((a,b) => (a.name||'').localeCompare(b.name||''));
    for(const ws of wses) {
        const opt = document.createElement('option');
        opt.value = ws.id;
        opt.textContent = ws.name;
        sel.appendChild(opt);
    }
    
    document.getElementById('gum-add-identifier').value = '';
    document.getElementById('gum-add-role').value = 'Viewer';
    document.getElementById('gum-add-modal').style.display = 'flex';
};

window.submitGumAddUser = async function() {
    const wsId = document.getElementById('gum-add-ws-id').value;
    const identifier = document.getElementById('gum-add-identifier').value.trim();
    const principalType = document.getElementById('gum-add-principal-type').value;
    const newRole = document.getElementById('gum-add-role').value;
    
    if(!wsId) { alert('Please select a workspace!'); return; }
    if(!identifier) { alert('Please enter an email/identifier!'); return; }
    
    document.getElementById('gum-add-modal').style.display = 'none';
    
    const logsDiv = document.getElementById('wf-out-gum-logs');
    window.expandConsole('wf-out-gum-logs'); // ensure logs are visible
    
    const div = document.createElement('div');
    div.style.paddingLeft = '10px';
    div.style.borderLeft = '2px solid var(--accent)';
    div.textContent = `[ADD] Adding ${identifier} to workspace [${wsId}] as ${newRole}...`;
    logsDiv.appendChild(div);
    
    try {
        const body = {
            identifier: identifier,
            groupUserAccessRight: newRole,
            principalType: principalType
        };
        
        // Use POST to add a user
        const res = await fetch('/api/proxy', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ endpoint: `/groups/${wsId}/users`, method: 'POST', body: body })
        });
        
        if (res.ok) {
            div.textContent += " OK (Added)";
            div.style.borderLeft = '2px solid var(--success)';
            
            // Re-fetch that specific workspace's users to update the table immediately!
            try {
                const uRes = await fetch('/api/proxy', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ endpoint: `/groups/${wsId}/users`, method: 'GET' })
                });
                if(uRes.ok) {
                    const uData = await uRes.json();
                    const uPayload = uData.data || uData;
                    const users = uPayload.value || [];
                    
                    // Remove old records for this workspace
                    window.gumData = window.gumData.filter(d => d.wsId !== wsId);
                    
                    // Add fresh records
                    const wsName = window.gumWorkspaces.find(w => w.id === wsId)?.name || 'Unknown';
                    for(const u of users) {
                        window.gumData.push({
                            wsId: wsId,
                            wsName: wsName,
                            identifier: u.identifier,
                            principalType: u.principalType,
                            role: u.groupUserAccessRight
                        });
                    }
                    window.filterGumTable();
                }
            } catch(e) {}
            
        } else {
            const errJson = await res.json().catch(()=>({}));
            div.textContent += ` FAILED: ${res.status} ${JSON.stringify(errJson)}`;
            div.style.borderLeft = '2px solid var(--error)';
        }
    } catch(err) {
        div.textContent += ` EXCEPTION: ${err.message}`;
        div.style.borderLeft = '2px solid var(--error)';
    }
    setTimeout(() => { logsDiv.scrollTop = Math.max(0, logsDiv.scrollHeight - logsDiv.clientHeight * 0.66); }, 50);
};
"""
js += new_logic

with open('static/script.js', 'w', encoding='utf-8') as f:
    f.write(js)
