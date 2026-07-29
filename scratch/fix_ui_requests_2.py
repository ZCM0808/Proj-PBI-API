import re

html_path = 'static/index.html'
with open(html_path, 'r', encoding='utf-8') as f:
    html = f.read()

# 1. Insert pbi-embed-container into wf-config-export_visual right before <div class="wf-steps-container" ...>
# Find the marker in wf-config-export_visual:
vis_marker = '<div class="wf-step active" id="wf-vis-step-1">'
if vis_marker in html:
    # Find the <div class="wf-steps-container" ...> right before it
    idx = html.rfind('<div class="wf-steps-container"', 0, html.find(vis_marker))
    if idx != -1:
        embed_html = '\n                      <div id="pbi-embed-container" style="display: none; width: 100%; height: 400px; border: 1px solid var(--panel-border); border-radius: 6px; margin: 12px 0; background: var(--input-bg);"></div>\n'
        html = html[:idx] + embed_html + html[idx:]
        print("Inserted pbi-embed-container.")
    else:
        print("Could not find wf-steps-container before vis_marker.")

# 2. Add the report_view_count pane at the end of the workflows.
# Find the end of wf-config-export_dataset_tables (which is before <div id="wf-config-smart_pipeline" ...)
smart_marker = '<div id="wf-config-smart_pipeline"'
if smart_marker in html:
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
                          <div>
                              <label style="font-size: 0.85rem; color: var(--text-secondary);">Target Date (YYYY-MM-DD)</label>
                              <input type="date" id="wf-rvc-date" class="wf-input" value="">
                          </div>
                      </div>
                      <div class="wf-steps-container" style="display: flex; flex-direction: column; gap: 12px; margin-top: 8px;">
                          <div class="wf-step active" id="wf-rvc-step-1">
                              <div class="wf-step-header">
                                  <span class="wf-step-num">1</span>
                                  <span style="font-weight: bold;">Get Daily View Count (Activity Events)</span>
                                  <button class="btn-action-primary" id="btn-run-rvc" style="margin-left: auto; padding: 4px 12px; font-size: 0.8rem;" onclick="window.runRvcWorkflow()">Run</button>
                              </div>
                              <div class="wf-step-content" style="display: block;">
                                  <textarea id="wf-out-rvc" class="wf-input" style="height: 150px; font-family: monospace; font-size: 0.75rem; resize: vertical;" readonly placeholder="Waiting for execution..."></textarea>
                              </div>
                          </div>
                      </div>
                  </div>
"""
    idx = html.find(smart_marker)
    html = html[:idx] + rvc_html + html[idx:]
    print("Inserted report_view_count pane.")

html = html.replace('v20260727_v73_ds_steps_v13', 'v20260727_v74_ds_steps_v14')
with open(html_path, 'w', encoding='utf-8') as f:
    f.write(html)
print("Updated index.html")

# Modify script.js
js_path = 'static/script.js'
with open(js_path, 'r', encoding='utf-8') as f:
    js = f.read()

# Add runRvcWorkflow and handle UI initialization
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
    let url = `https://api.powerbi.com/v1.0/myorg/admin/activityevents?startDateTime=${startDateTime}&endDateTime=${endDateTime}`;
    
    let totalViews = 0;
    let uniqueUsers = new Set();
    let continuationUri = url;
    
    try {
        while(continuationUri) {
            const resp = await fetch(continuationUri, {
                headers: { 'Authorization': `Bearer ${window.pbiToken}` }
            });
            if(!resp.ok) {
                out.textContent += `Error fetching events: ${resp.status} ${resp.statusText}\\n`;
                if(resp.status === 401 || resp.status === 403) {
                    out.textContent += `\\nYou must be a Power BI Admin to use this API.\\n`;
                }
                return;
            }
            const data = await resp.json();
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
    print("Added runRvcWorkflow to script.js")

# In openWorkflowModal, add updateWfSelectors('wf-rvc-workspace', 'wf-rvc-report')
# And set default date
if "updateWfSelectors('wf-rvc-workspace', 'wf-rvc-report')" not in js:
    # Find updateWfSelectors('wf-vis-workspace', 'wf-vis-report');
    target = "updateWfSelectors('wf-vis-workspace', 'wf-vis-report');"
    if target in js:
        add_init = "updateWfSelectors('wf-rvc-workspace', 'wf-rvc-report');\n        document.getElementById('wf-rvc-date').value = new Date().toISOString().split('T')[0];\n"
        js = js.replace(target, target + '\n        ' + add_init)
        print("Added initialization for rvc workflow.")

with open(js_path, 'w', encoding='utf-8') as f:
    f.write(js)
print("Updated script.js")
