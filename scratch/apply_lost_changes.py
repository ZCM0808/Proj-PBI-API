import re

html_path = 'static/index.html'
js_path = 'static/script.js'

with open(html_path, 'r', encoding='utf-8') as f:
    html = f.read()

with open(js_path, 'r', encoding='utf-8') as f:
    js = f.read()


# --- 1. Copy Icon ---
pattern_label = '<label style="color: var(--text-secondary); font-weight: bold;">Select Workflow:</label>'
replacement_label = '''<label style="color: var(--text-secondary); font-weight: bold; display: flex; align-items: center; gap: 6px;">
                        Select Workflow:
                        <button type="button" class="icon-btn" style="padding: 2px; width: 20px; height: 20px; border: none; background: transparent; color: var(--text-secondary); cursor: pointer;" onclick="navigator.clipboard.writeText(document.getElementById(\'wf-selector\').options[document.getElementById(\'wf-selector\').selectedIndex].text); this.style.color=\'var(--success)\'; setTimeout(()=>this.style.color=\'var(--text-secondary)\', 1500);" title="Copy Workflow Name">
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
                        </button>
                    </label>'''
if pattern_label in html:
    html = html.replace(pattern_label, replacement_label)
    print("Added copy icon.")


# --- 2. PBI Embed Container ---
pattern_old_embed = '<div id="pbi-embed-container" style="visibility: hidden; position: absolute; left: -9999px; top: -9999px; width: 1200px; height: 800px;"></div>'
if pattern_old_embed in html:
    html = html.replace(pattern_old_embed, '')

# Insert the new embed container in export_visual right before wf-steps-container
vis_marker = '<div class="wf-step active" id="wf-vis-step-1">'
if vis_marker in html and 'pbi-embed-container' not in html:
    idx = html.rfind('<div class="wf-steps-container"', 0, html.find(vis_marker))
    if idx != -1:
        embed_html = '\n                    <div id="pbi-embed-container" style="display: none; width: 100%; height: 400px; border: 1px solid var(--panel-border); border-radius: 6px; margin: 12px 0; background: var(--input-bg);"></div>\n'
        html = html[:idx] + embed_html + html[idx:]
        print("Moved pbi-embed-container.")


# --- 3. Admin Report View Count ---
# A) Add option to wf-selector
opt = '<option value="smart_pipeline">Smart DataOps Pipeline (Auto Bind/Scan/Check)</option>'
if opt in html and 'value="report_view_count"' not in html:
    new_opt = '<option value="report_view_count">Admin Report View Count (Activity Events)</option>\n                        ' + opt
    html = html.replace(opt, new_opt)

# B) Add the pane
smart_marker = '<div id="wf-config-smart_pipeline"'
if smart_marker in html and 'wf-config-report_view_count' not in html:
    rvc_html = """
                <div id="wf-config-report_view_count" class="wf-config-pane" style="display: none;">
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 8px;">
                        <div>
                            <label style="font-size: 0.85rem; color: var(--text-secondary);">Workspace ID</label>
                            <select id="wf-rvc-workspace" class="wf-input"></select>
                        </div>
                        <div>
                            <label style="font-size: 0.85rem; color: var(--text-secondary);">Report ID</label>
                            <select id="wf-rvc-report" class="wf-input"></select>
                        </div>
                        <div style="grid-column: span 2;">
                            <label style="font-size: 0.85rem; color: var(--text-secondary);">Target Date (YYYY-MM-DD)</label>
                            <input type="date" id="wf-rvc-date" class="wf-input" value="">
                        </div>
                    </div>
                    <div class="wf-steps-container" style="display: flex; flex-direction: column; gap: 12px; margin-top: 8px;">
                        <div class="wf-step active" id="wf-rvc-step-1">
                            <div class="wf-step-header">
                                <span class="wf-step-title">Get Daily View Count (Activity Events)</span>
                                <button class="btn-action-primary" id="btn-run-rvc" style="margin-left: auto; padding: 4px 12px; font-size: 0.8rem;" onclick="window.runRvcWorkflow()">Run</button>
                            </div>
                            <div class="wf-step-content" style="display: block; margin-top: 8px;">
                                <textarea id="wf-out-rvc" class="wf-input" style="height: 150px; font-family: monospace; font-size: 0.75rem; resize: vertical;" readonly placeholder="Waiting for execution..."></textarea>
                            </div>
                        </div>
                    </div>
                </div>
"""
    idx = html.find(smart_marker)
    html = html[:idx] + rvc_html + html[idx:]

# C) Add runRvcWorkflow to script.js
if 'runRvcWorkflow' not in js:
    js_addition = """
window.runRvcWorkflow = async function() {
    const reportId = document.getElementById('wf-rvc-report').value;
    const dateStr = document.getElementById('wf-rvc-date').value;
    const out = document.getElementById('wf-out-rvc');
    if(!reportId || !dateStr) {
        out.textContent = 'Error: Please select a report and date.\\n';
        return;
    }
    out.textContent = `Fetching Activity Events for ${dateStr}...\\n(Note: Requires Power BI Admin privileges)\\n\\n`;
    
    const startDateTime = `'${dateStr}T00:00:00Z'`;
    const endDateTime = `'${dateStr}T23:59:59Z'`;
    let url = `/v1.0/myorg/admin/activityevents?startDateTime=${startDateTime}&endDateTime=${endDateTime}`;
    
    let totalViews = 0;
    let uniqueUsers = new Set();
    let continuationUri = url;
    
    try {
        while(continuationUri) {
            let endpoint = continuationUri;
            if(endpoint.startsWith('https://api.powerbi.com')) {
                endpoint = endpoint.substring('https://api.powerbi.com'.length);
            }
            const res = await fetch('/api/proxy', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ endpoint: endpoint, method: 'GET' })
            });
            if(!res.ok) {
                out.textContent += `Error fetching events: ${res.status} ${res.statusText}\\n`;
                if(res.status === 401 || res.status === 403) {
                    out.textContent += `\\nYou must be a Power BI Admin to use this API.\\n`;
                }
                return;
            }
            const data = await res.json();
            const events = data.activityEventEntities || [];
            
            for(const e of events) {
                if(e.Activity === "ViewReport" && e.ReportId === reportId) {
                    totalViews++;
                    if(e.UserId) uniqueUsers.add(e.UserId);
                }
            }
            
            continuationUri = data.continuationUri || null;
            if(continuationUri) {
                out.textContent += `Fetching next page of events...\\n`;
            }
        }
        
        out.textContent += `\\n--- Results for ${dateStr} ---\\n`;
        out.textContent += `Total Views: ${totalViews}\\n`;
        out.textContent += `Unique Viewers: ${uniqueUsers.size}\\n`;
        out.textContent += `\\nSuccess.\\n`;
        
    } catch (e) {
        out.textContent += `Exception: ${e.message}\\n`;
    }
};
"""
    js += js_addition

# D) Add initialization
target = "updateWfSelectors('wf-vis-workspace', 'wf-vis-report');"
if target in js and "updateWfSelectors('wf-rvc-workspace', 'wf-rvc-report')" not in js:
    add_init = "updateWfSelectors('wf-rvc-workspace', 'wf-rvc-report');\n            document.getElementById('wf-rvc-date').value = new Date().toISOString().split('T')[0];\n"
    js = js.replace(target, target + '\n            ' + add_init)


# Bump version safely
old_ver = re.search(r'script\.js\?v=(\d+_v[a-zA-Z0-9_]+)', html)
if old_ver:
    v = old_ver.group(1)
    new_v = '20260729_v92_audit'
    html = html.replace(f'script.js?v={v}', f'script.js?v={new_v}')
    html = html.replace(f'style.css?v={v}', f'style.css?v={new_v}')


with open(html_path, 'w', encoding='utf-8') as f:
    f.write(html)
with open(js_path, 'w', encoding='utf-8') as f:
    f.write(js)

print("All lost changes applied successfully!")
