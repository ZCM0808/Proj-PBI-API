import re

# 1. Update main.py
with open('src/main.py', 'r', encoding='utf-8') as f:
    main_code = f.read()

embed_endpoint = """
@app.post("/api/embed_info")
async def get_embed_info(request: Request):
    try:
        data = await request.json()
        w_id = data.get("workspace_id")
        r_id = data.get("report_id")
        if not w_id or not r_id:
            return {"success": False, "error": "Missing workspace_id or report_id"}
        
        import asyncio
        # Get report details
        report_info = await asyncio.to_thread(
            client.request, "GET", f"/groups/{w_id}/reports/{r_id}"
        )
        if "error" in report_info:
            return {"success": False, "error": report_info["error"]}
            
        embed_url = report_info.get("embedUrl")
        
        # Get embed token
        token_res = await asyncio.to_thread(
            client.request, "POST", f"/groups/{w_id}/reports/{r_id}/GenerateToken", json={"accessLevel": "View"}
        )
        if "error" in token_res:
            return {"success": False, "error": token_res["error"]}
            
        embed_token = token_res.get("token")
        
        return {"success": True, "embedUrl": embed_url, "embedToken": embed_token}
    except Exception as e:
        return {"success": False, "error": str(e)}
"""

if "/api/embed_info" not in main_code:
    main_code = main_code.replace("@app.post(\"/api/download\")", embed_endpoint + "\n@app.post(\"/api/download\")")
    with open('src/main.py', 'w', encoding='utf-8') as f:
        f.write(main_code)


# 2. Update index.html
with open('static/index.html', 'r', encoding='utf-8') as f:
    html = f.read()

pbi_js = '<script src="https://microsoft.github.io/PowerBI-JavaScript/demo/node_modules/powerbi-client/dist/powerbi.js"></script>'
if pbi_js not in html:
    html = html.replace('<script src="https://cdn.jsdelivr.net/npm/easymde/dist/easymde.min.js"></script>',
                        '<script src="https://cdn.jsdelivr.net/npm/easymde/dist/easymde.min.js"></script>\n    ' + pbi_js)

embed_div = """                        <div>
                            <label style="font-size: 0.85rem; color: var(--text-secondary);">Max Rows</label>
                            <input type="number" id="wf-vis-rows" class="wf-input" value="100000">
                        </div>
                    </div>
                    
                    <div id="pbi-embed-container" style="display: none; width: 100%; height: 350px; margin-bottom: 12px; border: 1px solid var(--panel-border); border-radius: 6px; background: #fff;"></div>
"""

if "pbi-embed-container" not in html:
    html = html.replace("""                        <div>
                            <label style="font-size: 0.85rem; color: var(--text-secondary);">Max Rows</label>
                            <input type="number" id="wf-vis-rows" class="wf-input" value="100000">
                        </div>
                    </div>""", embed_div)

html = re.sub(r'script\.js\?v=\d+_[a-zA-Z0-9_]+', 'script.js?v=20260726_v32_embedded', html)

with open('static/index.html', 'w', encoding='utf-8') as f:
    f.write(html)


# 3. Update script.js
with open('static/script.js', 'r', encoding='utf-8') as f:
    script = f.read()

# Replace the whole export visual logic
import re

start_marker = "// --- Export Visual Data Logic ---"
end_marker = "// --- End Export Visual Data Logic ---"
idx1 = script.find(start_marker)
idx2 = script.find(end_marker)

if idx1 != -1 and idx2 != -1:
    new_logic = """// --- Export Visual Data Logic ---
        let currentEmbeddedReport = null;

        const loadPages = async () => {
            const wId = document.getElementById('wf-vis-workspace').value;
            const rId = document.getElementById('wf-vis-report').value;
            const pageSelect = document.getElementById('wf-vis-page');
            const visSelect = document.getElementById('wf-vis-visual');
            const embedContainer = document.getElementById('pbi-embed-container');
            const out = document.getElementById('wf-out-vis');
            
            pageSelect.innerHTML = '<option value="">Loading pages...</option>';
            visSelect.innerHTML = '<option value="">-- Select Page First --</option>';
            
            if (!wId || !rId) return;
            
            try {
                // 1. Fetch Embed Token & URL
                out.textContent = `[${new Date().toLocaleTimeString()}] Requesting Embed Token...\\n`;
                const res = await fetch('/api/embed_info', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ workspace_id: wId, report_id: rId })
                });
                const data = await res.json();
                if (!data.success) {
                    out.textContent += `Error getting embed info: ${data.error}\\n`;
                    pageSelect.innerHTML = '<option value="">Error</option>';
                    return;
                }
                
                out.textContent += `Token received. Initializing Power BI Embedded iframe...\\n`;
                embedContainer.style.display = 'block';
                
                // 2. Embed the report
                const models = window['powerbi-client'].models;
                const config = {
                    type: 'report',
                    tokenType: models.TokenType.Embed,
                    accessToken: data.embedToken,
                    embedUrl: data.embedUrl,
                    id: rId,
                    permissions: models.Permissions.Read,
                    settings: {
                        panes: { filters: { visible: false }, pageNavigation: { visible: false } }
                    }
                };
                
                // Reset container
                powerbi.reset(embedContainer);
                currentEmbeddedReport = powerbi.embed(embedContainer, config);
                
                currentEmbeddedReport.off("loaded");
                currentEmbeddedReport.on("loaded", async function () {
                    out.textContent += `Report rendered in UI! Fetching Pages via JS SDK...\\n`;
                    const pages = await currentEmbeddedReport.getPages();
                    pageSelect.innerHTML = '<option value="">-- Select a Page --</option>';
                    pages.forEach(p => {
                        const opt = document.createElement('option');
                        opt.value = p.name; // This is the internal name
                        opt.textContent = p.displayName + ' (' + p.name + ')';
                        pageSelect.appendChild(opt);
                    });
                });
                
                currentEmbeddedReport.off("error");
                currentEmbeddedReport.on("error", function (event) {
                    out.textContent += `Embed Error: ${event.detail.message}\\n`;
                });

            } catch (err) {
                out.textContent += `Exception: ${err.message}\\n`;
                pageSelect.innerHTML = '<option value="">Error loading pages</option>';
            }
        };

        const loadVisuals = async () => {
            const pId = document.getElementById('wf-vis-page').value;
            const visSelect = document.getElementById('wf-vis-visual');
            visSelect.innerHTML = '<option value="">Loading visuals...</option>';
            
            if (!pId || !currentEmbeddedReport) return;
            
            try {
                const pages = await currentEmbeddedReport.getPages();
                const activePage = pages.find(p => p.name === pId);
                if (!activePage) throw new Error("Page not found in embedded report");
                
                const visuals = await activePage.getVisuals();
                visSelect.innerHTML = '<option value="">-- Select a Visual --</option>';
                visuals.forEach(v => {
                    const opt = document.createElement('option');
                    opt.value = v.name;
                    const vTitle = v.title ? v.title : (v.type ? `[${v.type}]` : 'Unnamed Visual');
                    opt.textContent = vTitle + ' (' + v.name + ')';
                    visSelect.appendChild(opt);
                });
            } catch (err) {
                visSelect.innerHTML = '<option value="">Error loading visuals</option>';
            }
        };

        document.getElementById('wf-vis-workspace').addEventListener('change', loadPages);
        document.getElementById('wf-vis-report').addEventListener('change', loadPages);
        document.getElementById('wf-vis-page').addEventListener('change', loadVisuals);

        const executeExportVisual = async () => {
            const out = document.getElementById('wf-out-vis');
            out.textContent = `[${new Date().toLocaleTimeString()}] Triggering JS SDK exportData()...\\n`;
            
            const pId = document.getElementById('wf-vis-page').value;
            const visId = document.getElementById('wf-vis-visual').value;
            const expTypeStr = document.getElementById('wf-vis-type').value;
            const rows = parseInt(document.getElementById('wf-vis-rows').value) || 100000;
            
            if (!pId || !visId || !currentEmbeddedReport) {
                out.textContent += `Error: Please select page and visual.\\n`;
                return;
            }
            
            try {
                const pages = await currentEmbeddedReport.getPages();
                const activePage = pages.find(p => p.name === pId);
                const visuals = await activePage.getVisuals();
                const targetVisual = visuals.find(v => v.name === visId);
                
                if (!targetVisual) {
                    out.textContent += `Error: Visual not found.\\n`;
                    return;
                }
                
                const models = window['powerbi-client'].models;
                const exportType = (expTypeStr === 'Summarized') ? models.ExportDataType.Summarized : models.ExportDataType.Underlying;
                
                out.textContent += `Extracting data from visual [${targetVisual.type}] (Rows: ${rows})...\\n`;
                const result = await targetVisual.exportData(exportType, rows);
                
                out.textContent += `\\nData successfully extracted! Generating CSV file...\\n`;
                
                const blob = new Blob([result.data], { type: 'text/csv;charset=utf-8;' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `VisualExport_${expTypeStr}.csv`;
                a.style.display = 'none';
                document.body.appendChild(a);
                a.click();
                window.URL.revokeObjectURL(url);
                out.textContent += `\\nFile downloaded: VisualExport_${expTypeStr}.csv 🎉\\n`;
                
            } catch (err) {
                out.textContent += `Exception during export: ${err.message || JSON.stringify(err)}\\n`;
            }
        };

        // --- End Export Visual Data Logic ---"""
    script = script[:idx1] + new_logic + script[idx2 + len(end_marker):]

script = re.sub(r'script\.js\?v=\d+_[a-zA-Z0-9_]+', 'script.js?v=20260726_v32_embedded', script)

with open('static/script.js', 'w', encoding='utf-8') as f:
    f.write(script)

print("Embedded Visual Export feature successfully added!")
