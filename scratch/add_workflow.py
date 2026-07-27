import sys

html_path = 'static/index.html'
with open(html_path, 'r', encoding='utf-8') as f:
    html = f.read()

opt_str = '<option value="export_visual">Export Visual Data (CSV) - Underlying/Summarized</option>'
new_opt = opt_str + '\n                        <option value="export_dataset_tables">Export Dataset Tables (CSV)</option>'
if 'export_dataset_tables' not in html:
    html = html.replace(opt_str, new_opt)

vis_pane_start = '<div id="wf-config-export_visual"'
new_pane = '''<div id="wf-config-export_dataset_tables" class="wf-config-pane" style="display: none;">
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 8px;">
                        <div>
                            <label style="font-size: 0.85rem; color: var(--text-secondary);">Workspace ID</label>
                            <select id="wf-ds-workspace" class="wf-input"></select>
                        </div>
                        <div>
                            <label style="font-size: 0.85rem; color: var(--text-secondary);">Dataset ID</label>
                            <select id="wf-ds-dataset" class="wf-input"></select>
                        </div>
                        <div style="grid-column: span 2; display: flex; gap: 8px;">
                            <div style="flex: 1;">
                                <label style="font-size: 0.85rem; color: var(--text-secondary);">Table Name</label>
                                <select id="wf-ds-table" class="wf-input">
                                    <option value="">-- Click Load Tables --</option>
                                </select>
                            </div>
                            <div style="display: flex; align-items: flex-end;">
                                <button type="button" class="btn-verify" id="load-tables-btn" style="height: 38px; width: auto; padding: 0 16px;">Load Tables</button>
                            </div>
                        </div>
                    </div>
                </div>

                '''
if 'id="wf-config-export_dataset_tables"' not in html:
    html = html.replace(vis_pane_start, new_pane + vis_pane_start)

html = html.replace('v48_workflow', 'v49_export_dataset')
html = html.replace('v47_api_fix', 'v49_export_dataset')

with open(html_path, 'w', encoding='utf-8') as f:
    f.write(html)

js_path = 'static/script.js'
with open(js_path, 'r', encoding='utf-8') as f:
    js = f.read()

hide_logic = "document.getElementById('wf-config-export_visual').style.display = 'none';"
new_hide = hide_logic + "\n            document.getElementById('wf-config-export_dataset_tables').style.display = 'none';"
if "wf-config-export_dataset_tables').style.display = 'none';" not in js:
    js = js.replace(hide_logic, new_hide)

show_logic = "} else if (val === 'export_visual') {"
new_show = "} else if (val === 'export_dataset_tables') {\n                document.getElementById('wf-config-export_dataset_tables').style.display = 'block';\n                window.populateWfDropdowns('wf-ds-workspace', 'wf-ds-dataset');\n            " + show_logic
if "val === 'export_dataset_tables'" not in js:
    js = js.replace(show_logic, new_show)

run_logic = "} else if (wfType === 'export_visual') {"
new_run = "} else if (wfType === 'export_dataset_tables') {\n                    await window.executeExportDataset();\n                " + run_logic
if "executeExportDataset()" not in js:
    js = js.replace(run_logic, new_run)

if 'window.executeExportDataset =' not in js:
    injection = """
window.executeExportDataset = async function() {
    const ws = document.getElementById('wf-ds-workspace').value;
    const ds = document.getElementById('wf-ds-dataset').value;
    const tb = document.getElementById('wf-ds-table').value;
    
    if(!ws || !ds || !tb) {
        alert("请先选择 Workspace, Dataset 和 Table！(Please select Workspace, Dataset, and Table.)");
        return;
    }
    
    const clientId = document.getElementById('set-client').value.trim();
    const clientSecret = document.getElementById('set-secret').value.trim();
    const tenantId = document.getElementById('set-tenant').value.trim();
    if (!clientId || !clientSecret || !tenantId) {
        alert("请在 Global Settings 中填写 Auth Credentials！");
        return;
    }
    
    const btn = document.getElementById('run-workflow-btn');
    const origHtml = btn.innerHTML;
    btn.innerHTML = '⏳ Exporting...';
    btn.disabled = true;
    
    try {
        const payload = {
            pbi_client_id: clientId,
            pbi_client_secret: clientSecret,
            pbi_tenant_id: tenantId,
            query: `EVALUATE '${tb}'`
        };
        
        const res = await fetch(`/api/export_dataset/${ws}/${ds}`, {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify(payload)
        });
        
        const data = await res.json();
        if(data.success) {
            const rows = data.results;
            if(!rows || rows.length === 0) {
                alert("表中没有数据 (Table is empty).");
                return;
            }
            // Strip brackets like TableName[ColumnName] to just ColumnName
            const cleanKey = (k) => {
                const match = k.match(/\[(.*?)\]/);
                return match ? match[1] : k;
            };
            const rawKeys = Object.keys(rows[0]);
            let csv = rawKeys.map(k => `"${cleanKey(k).replace(/"/g, '""')}"`).join(",") + "\\n";
            rows.forEach(r => {
                csv += rawKeys.map(k => {
                    let val = r[k];
                    if (val === null || val === undefined) val = '';
                    return `"${val.toString().replace(/"/g, '""')}"`;
                }).join(",") + "\\n";
            });
            
            const blob = new Blob(['\\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `${tb}_export.csv`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            
            alert(`✅ 成功导出 (Exported) ${rows.length} 行数据！`);
        } else {
            alert("❌ 导出失败 (Export failed): " + data.message);
        }
    } catch(err) {
        alert("❌ 网络异常 (Network error): " + err);
    } finally {
        btn.innerHTML = origHtml;
        btn.disabled = false;
    }
};

document.addEventListener('DOMContentLoaded', () => {
    const loadBtn = document.getElementById('load-tables-btn');
    if(loadBtn) {
        loadBtn.addEventListener('click', async () => {
            const ws = document.getElementById('wf-ds-workspace').value;
            const ds = document.getElementById('wf-ds-dataset').value;
            if(!ws || !ds) {
                alert("请先选择 Workspace 和 Dataset！(Select Workspace & Dataset first)");
                return;
            }
            
            const clientId = document.getElementById('set-client').value.trim();
            const clientSecret = document.getElementById('set-secret').value.trim();
            const tenantId = document.getElementById('set-tenant').value.trim();
            if (!clientId || !clientSecret || !tenantId) {
                alert("请在 Global Settings 中填写 Auth Credentials！");
                return;
            }
            
            await window.animateVerifyBtn(loadBtn, async () => {
                const payload = {
                    pbi_client_id: clientId,
                    pbi_client_secret: clientSecret,
                    pbi_tenant_id: tenantId,
                    query: "EVALUATE FILTER(INFO.TABLES(), [IsHidden] = FALSE)"
                };
                
                const res = await fetch(`/api/export_dataset/${ws}/${ds}`, {
                    method: 'POST',
                    headers: {'Content-Type': 'application/json'},
                    body: JSON.stringify(payload)
                });
                
                const data = await res.json();
                if(data.success) {
                    const sel = document.getElementById('wf-ds-table');
                    sel.innerHTML = '';
                    data.results.forEach(t => {
                        const NameKey = Object.keys(t).find(k => k.endsWith('Name]') || k === 'Name');
                        const opt = document.createElement('option');
                        opt.value = t[NameKey];
                        opt.textContent = t[NameKey];
                        sel.appendChild(opt);
                    });
                    return { success: true, message: `加载了 ${data.results.length} 张表` };
                } else {
                    return { success: false, message: data.message };
                }
            }, (res) => {
                // Success callback, do nothing special except the animation
            });
        });
    }
});
"""
    js += "\n" + injection

with open(js_path, 'w', encoding='utf-8') as f:
    f.write(js)

py_path = 'src/main.py'
with open(py_path, 'r', encoding='utf-8') as f:
    py = f.read()

if 'def export_dataset_queries' not in py:
    py_inj = """
@app.post("/api/export_dataset/{workspace_id}/{dataset_id}")
async def export_dataset_queries(workspace_id: str, dataset_id: str, request: Request):
    import asyncio
    import requests
    from msal import ConfidentialClientApplication

    try:
        data = await request.json()
        client_id = data.get("pbi_client_id", "").strip()
        client_secret = data.get("pbi_client_secret", "").strip()
        tenant_id = data.get("pbi_tenant_id", "").strip()
        query = data.get("query", "").strip()

        if not all([client_id, client_secret, tenant_id, query]):
            return {"success": False, "message": "Missing credentials or query"}

        authority_url = f"https://login.microsoftonline.com/{tenant_id}"
        app_msal = ConfidentialClientApplication(
            client_id=client_id,
            client_credential=client_secret,
            authority=authority_url,
        )
        
        scope = ["https://analysis.windows.net/powerbi/api/.default"]
        result = await asyncio.to_thread(app_msal.acquire_token_for_client, scopes=scope)
        
        if "access_token" not in result:
            return {"success": False, "message": f"Auth failed: {result.get('error_description', 'Unknown Error')}"}
        
        access_token = result["access_token"]
        
        endpoint = f"https://api.powerbi.com/v1.0/myorg/groups/{workspace_id}/datasets/{dataset_id}/executeQueries"
        
        headers = {
            "Authorization": f"Bearer {access_token}",
            "Content-Type": "application/json"
        }
        
        payload = {
            "queries": [{"query": query}],
            "serializerSettings": {"includeNulls": True}
        }
        
        response = await asyncio.to_thread(requests.post, endpoint, headers=headers, json=payload)
        
        if response.status_code == 200:
            resp_data = response.json()
            results = resp_data.get("results", [])
            if results and len(results) > 0:
                tables = results[0].get("tables", [])
                if tables and len(tables) > 0:
                    rows = tables[0].get("rows", [])
                    return {"success": True, "results": rows}
            return {"success": True, "results": []}
        else:
            return {"success": False, "message": f"API Error: {response.status_code} - {response.text}"}

    except Exception as e:
        return {"success": False, "message": f"Server Error: {str(e)}"}
"""
    py += "\n" + py_inj
    with open(py_path, 'w', encoding='utf-8') as f:
        f.write(py)

print("Workflow added to JS, HTML, and Python!")
