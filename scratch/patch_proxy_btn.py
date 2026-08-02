import re

with open('static/script.js', 'r', encoding='utf-8') as f:
    js = f.read()

# Fix 1: runGlobalUserManager workspaces fetch
target1 = """        const tokenStr = document.getElementById('token-input')?.value.trim() || '';
        if (!tokenStr) { appendLog('Error: Token not found'); return; }

        const wsRes = await fetch('https://api.powerbi.com/v1.0/myorg/groups?$top=100', {
            headers: { 'Authorization': `Bearer ${tokenStr}` }
        });"""

replacement1 = """        const wsRes = await fetch('/api/proxy', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ endpoint: '/groups?$top=100', method: 'GET' })
        });"""
js = js.replace(target1, replacement1)

# Fix 2: runGlobalUserManager users fetch
target2 = """                const uRes = await fetch(`https://api.powerbi.com/v1.0/myorg/groups/${ws.id}/users`, {
                    headers: { 'Authorization': `Bearer ${tokenStr}` }
                });"""

replacement2 = """                const uRes = await fetch('/api/proxy', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ endpoint: `/groups/${ws.id}/users`, method: 'GET' })
                });"""
js = js.replace(target2, replacement2)

# Fix 3: submitGumEdit users put
target3 = """    const tokenStr = document.getElementById('token-input')?.value.trim() || '';
    
    const logsDiv = document.getElementById('wf-out-gum-logs');"""

replacement3 = """    const logsDiv = document.getElementById('wf-out-gum-logs');"""
js = js.replace(target3, replacement3)

target4 = """        const res = await fetch(`https://api.powerbi.com/v1.0/myorg/groups/${wsId}/users`, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${tokenStr}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(body)
        });"""

replacement4 = """        const res = await fetch('/api/proxy', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ endpoint: `/groups/${wsId}/users`, method: 'PUT', body: body })
        });"""
js = js.replace(target4, replacement4)

# Fix 4: deleteGumUser delete
target5 = """    const tokenStr = document.getElementById('token-input')?.value.trim() || '';
    const logsDiv = document.getElementById('wf-out-gum-logs');"""

replacement5 = """    const logsDiv = document.getElementById('wf-out-gum-logs');"""
js = js.replace(target5, replacement5)

target6 = """        const res = await fetch(`https://api.powerbi.com/v1.0/myorg/groups/${wsId}/users/${encodeURIComponent(identifier)}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${tokenStr}` }
        });"""

replacement6 = """        const res = await fetch('/api/proxy', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ endpoint: `/groups/${wsId}/users/${encodeURIComponent(identifier)}`, method: 'DELETE' })
        });"""
js = js.replace(target6, replacement6)


# Fix HTML layout (move Run Scan to Execution Logs line)
with open('static/index.html', 'r', encoding='utf-8') as f:
    html = f.read()

html_target1 = """                            <div class="wf-step-header">
                                <span class="wf-step-title">Scan Workspaces & Manage Permissions</span>
                                <button class="btn-action-primary" id="btn-run-gum" style="margin-left: auto; padding: 4px 12px; font-size: 0.8rem;" onclick="if(window.runGlobalUserManager) window.runGlobalUserManager()">Run Scan</button>
                            </div>"""
html_replacement1 = """                            <div class="wf-step-header">
                                <span class="wf-step-title">Scan Workspaces & Manage Permissions</span>
                            </div>"""

html_target2 = """                                        <div style="font-size: 0.75rem; font-weight: bold; margin-bottom: 4px; color: var(--text-secondary); display: flex; align-items: center; cursor: pointer; user-select: none; width: fit-content;" onclick="window.toggleConsole('wf-out-gum-logs')">
                                            <svg id="wf-out-gum-logs-chevron" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="margin-right: 4px; transition: transform 0.2s; transform: rotate(0deg);"><polyline points="9 18 15 12 9 6"></polyline></svg>Execution Logs
                                        </div>"""
html_replacement2 = """                                        <div style="font-size: 0.75rem; font-weight: bold; margin-bottom: 4px; color: var(--text-secondary); display: flex; align-items: center; justify-content: space-between; user-select: none;">
                                            <div style="display: flex; align-items: center; cursor: pointer; width: fit-content;" onclick="window.toggleConsole('wf-out-gum-logs')">
                                                <svg id="wf-out-gum-logs-chevron" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="margin-right: 4px; transition: transform 0.2s; transform: rotate(0deg);"><polyline points="9 18 15 12 9 6"></polyline></svg>Execution Logs
                                            </div>
                                            <button class="btn-action-primary" id="btn-run-gum" style="padding: 4px 12px; font-size: 0.75rem; height: 24px;" onclick="if(window.runGlobalUserManager) window.runGlobalUserManager()">Run Scan</button>
                                        </div>"""

if html_target1 in html and html_target2 in html:
    html = html.replace(html_target1, html_replacement1)
    html = html.replace(html_target2, html_replacement2)
    html = re.sub(r'v140', 'v141', html)
    with open('static/index.html', 'w', encoding='utf-8') as f:
        f.write(html)
    print("HTML patched")
else:
    print("HTML target missing")

with open('static/script.js', 'w', encoding='utf-8') as f:
    f.write(js)
print("JS patched")
