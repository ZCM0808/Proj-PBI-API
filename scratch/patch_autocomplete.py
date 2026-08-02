import re
import os

# 1. Patch main.py
with open('src/main.py', 'r', encoding='utf-8') as f:
    main_py = f.read()

graph_endpoint = """
@app.get("/api/graph_users")
async def get_graph_users(query: str = ""):
    from msal import ConfidentialClientApplication
    import httpx
    import asyncio
    
    if not query:
        return {"success": False, "error": "Query is empty"}
        
    try:
        from src.config import Config
        cfg = Config()
        client_id = cfg.CLIENT_ID
        client_secret = cfg.CLIENT_SECRET
        tenant_id = cfg.TENANT_ID
        
        if not all([client_id, client_secret, tenant_id]):
            return {"success": False, "error": "Missing credentials in Config."}
            
        authority_url = f"https://login.microsoftonline.com/{tenant_id}"
        app_msal = ConfidentialClientApplication(
            client_id=client_id,
            client_credential=client_secret,
            authority=authority_url,
        )
        result = await asyncio.to_thread(app_msal.acquire_token_for_client, scopes=["https://graph.microsoft.com/.default"])
        
        if "access_token" not in result:
            return {"success": False, "error": "Failed to get Graph token. Ensure User.Read.All is granted."}
            
        token = result["access_token"]
        
        # Call Graph API
        headers = {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}
        safe_q = query.replace("'", "''")
        url = f"https://graph.microsoft.com/v1.0/users?$filter=startswith(displayName,'{safe_q}') or startswith(userPrincipalName,'{safe_q}')&$top=10&$select=id,displayName,userPrincipalName"
        
        async with httpx.AsyncClient() as http_client:
            resp = await http_client.get(url, headers=headers)
            if resp.status_code == 200:
                data = resp.json()
                return {"success": True, "users": data.get("value", [])}
            else:
                return {"success": False, "error": resp.text}
                
    except Exception as e:
        return {"success": False, "error": str(e)}

@app.post("/api/proxy")
"""

main_py = main_py.replace('@app.post("/api/proxy")', graph_endpoint)
with open('src/main.py', 'w', encoding='utf-8') as f:
    f.write(main_py)

# 2. Patch index.html
with open('static/index.html', 'r', encoding='utf-8') as f:
    html = f.read()

target_html = """                <div style="margin-bottom: 12px;">
                    <label style="font-size: 0.85rem; color: var(--text-secondary); display: block; margin-bottom: 4px;">User / Principal Email</label>
                    <input type="text" id="gum-add-identifier" class="wf-input" placeholder="e.g. zhangsan@company.com">
                </div>"""

replacement_html = """                <div style="margin-bottom: 12px; position: relative;">
                    <label style="font-size: 0.85rem; color: var(--text-secondary); display: block; margin-bottom: 4px;">User / Principal Email</label>
                    <input type="text" id="gum-add-identifier" class="wf-input" placeholder="Type name or email to search..." oninput="if(window.handleGumAddIdentifierInput) window.handleGumAddIdentifierInput(event)">
                    <div id="gum-add-autocomplete" style="display:none; position: absolute; top: 100%; left: 0; right: 0; background: var(--panel-bg); border: 1px solid var(--panel-border); border-top: none; z-index: 20001; max-height: 150px; overflow-y: auto; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
                    </div>
                </div>"""

if target_html in html:
    html = html.replace(target_html, replacement_html)
    html = re.sub(r'v146', 'v147', html)
    with open('static/index.html', 'w', encoding='utf-8') as f:
        f.write(html)
    print("HTML patched")

# 3. Patch script.js
with open('static/script.js', 'r', encoding='utf-8') as f:
    js = f.read()

js_logic = """
window.gumAutocompleteTimer = null;
window.handleGumAddIdentifierInput = function(e) {
    const val = e.target.value.trim();
    const dropdown = document.getElementById('gum-add-autocomplete');
    
    if (val.length < 2) {
        dropdown.style.display = 'none';
        return;
    }
    
    if (window.gumAutocompleteTimer) clearTimeout(window.gumAutocompleteTimer);
    
    window.gumAutocompleteTimer = setTimeout(async () => {
        dropdown.innerHTML = '<div style="padding: 8px; font-size: 0.8rem; color: var(--text-secondary);">Searching...</div>';
        dropdown.style.display = 'block';
        
        try {
            const res = await fetch(`/api/graph_users?query=${encodeURIComponent(val)}`);
            const data = await res.json();
            
            if (data.success && data.users && data.users.length > 0) {
                dropdown.innerHTML = '';
                for (const u of data.users) {
                    const div = document.createElement('div');
                    div.style.padding = '8px';
                    div.style.borderBottom = '1px solid var(--overlay-10)';
                    div.style.cursor = 'pointer';
                    div.style.fontSize = '0.8rem';
                    div.innerHTML = `<strong>${u.displayName}</strong> <span style="color: var(--text-secondary); font-size: 0.75rem;">(${u.userPrincipalName})</span>`;
                    div.onmouseover = () => div.style.background = 'var(--overlay-10)';
                    div.onmouseout = () => div.style.background = 'transparent';
                    div.onclick = () => {
                        document.getElementById('gum-add-identifier').value = u.userPrincipalName;
                        dropdown.style.display = 'none';
                    };
                    dropdown.appendChild(div);
                }
            } else if (data.success) {
                dropdown.innerHTML = '<div style="padding: 8px; font-size: 0.8rem; color: var(--text-secondary);">No matching users found</div>';
            } else {
                dropdown.innerHTML = `<div style="padding: 8px; font-size: 0.8rem; color: var(--error);">Error: ${data.error || 'Check Graph API permissions'}</div>`;
            }
        } catch(err) {
            dropdown.innerHTML = `<div style="padding: 8px; font-size: 0.8rem; color: var(--error);">Network Error</div>`;
        }
    }, 500); // 500ms debounce
};

// Close autocomplete when clicking outside
document.addEventListener('click', function(e) {
    const ac = document.getElementById('gum-add-autocomplete');
    const input = document.getElementById('gum-add-identifier');
    if (ac && input && !ac.contains(e.target) && e.target !== input) {
        ac.style.display = 'none';
    }
});
"""

if "window.gumAutocompleteTimer" not in js:
    js += js_logic
    with open('static/script.js', 'w', encoding='utf-8') as f:
        f.write(js)
    print("JS patched")

