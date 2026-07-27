import re

# 1. Update index.html
with open('static/index.html', 'r', encoding='utf-8') as f:
    html = f.read()

# Add option to dropdown
old_select = """                        <option value="export_report">Export Report to File (PDF/Excel/etc.)</option>
                        <option value="smart_pipeline">Smart DataOps Pipeline (Auto Bind/Scan/Check)</option>
                    </select>"""
new_select = """                        <option value="export_report">Export Report to File (PDF/Excel/etc.)</option>
                        <option value="export_visual">Export Visual Data (CSV) - Underlying/Summarized</option>
                        <option value="smart_pipeline">Smart DataOps Pipeline (Auto Bind/Scan/Check)</option>
                    </select>"""
if "export_visual" not in html:
    html = html.replace(old_select, new_select)

# Add the export_visual pane
old_pane_end = """                        </div>
                    </div>
                </div>"""
# This closes wf-config-smart_pipeline. Wait, let's find it exactly.
# It ends with: 🚀 开始全自动链路 (Start DataOps)</button>
#                         </div>
#                     </div>
#                 </div>

smart_pipeline_close = """                    </div>
                </div>

                <div id="wf-export-wrapper">"""
                
export_visual_html = """                    </div>
                </div>

                <div id="wf-config-export_visual" class="wf-config-pane" style="display: none;">
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 8px;">
                        <div>
                            <label style="font-size: 0.85rem; color: var(--text-secondary);">Workspace ID</label>
                            <select id="wf-vis-workspace" class="wf-input"></select>
                        </div>
                        <div>
                            <label style="font-size: 0.85rem; color: var(--text-secondary);">Report ID</label>
                            <select id="wf-vis-report" class="wf-input"></select>
                        </div>
                        <div>
                            <label style="font-size: 0.85rem; color: var(--text-secondary);">Page Name</label>
                            <select id="wf-vis-page" class="wf-input">
                                <option value="">-- Select Report First --</option>
                            </select>
                        </div>
                        <div>
                            <label style="font-size: 0.85rem; color: var(--text-secondary);">Visual Name</label>
                            <select id="wf-vis-visual" class="wf-input">
                                <option value="">-- Select Page First --</option>
                            </select>
                        </div>
                        <div>
                            <label style="font-size: 0.85rem; color: var(--text-secondary);">Export Type</label>
                            <select id="wf-vis-type" class="wf-input">
                                <option value="Summarized">Summarized (聚合)</option>
                                <option value="Underlying">Underlying (底层)</option>
                            </select>
                        </div>
                        <div>
                            <label style="font-size: 0.85rem; color: var(--text-secondary);">Max Rows</label>
                            <input type="number" id="wf-vis-rows" class="wf-input" value="100000">
                        </div>
                    </div>
                    
                    <div class="wf-steps-container" style="display: flex; flex-direction: column; gap: 12px; margin-top: 8px;">
                        <div class="wf-step active" id="wf-vis-step-1">
                            <div class="wf-step-header">
                                <span class="wf-step-title">Execute exportData API (Sync)</span>
                            </div>
                            <div style="position: relative;">
                                <pre id="wf-out-vis" class="wf-console">Ready to export visual data...</pre>
                                <button type="button" class="wf-copy-btn" onclick="copyWfConsole('vis', this)" title="Copy Output">
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                <div id="wf-export-wrapper">"""

if "wf-config-export_visual" not in html:
    html = html.replace(smart_pipeline_close, export_visual_html)

# Bump version
html = re.sub(r'script\.js\?v=\d+_[a-zA-Z0-9_]+', 'script.js?v=20260726_v31_visual_export', html)

with open('static/index.html', 'w', encoding='utf-8') as f:
    f.write(html)


# 2. Update script.js
with open('static/script.js', 'r', encoding='utf-8') as f:
    script = f.read()

# Update dropdown logic
old_wfSelector = """        wfSelector.addEventListener('change', (e) => {
            const val = e.target.value;
            if (val === 'smart_pipeline') {
                document.getElementById('wf-config-export_report').style.display = 'none';
                document.getElementById('wf-export-wrapper').style.display = 'none';
                document.getElementById('wf-config-smart_pipeline').style.display = 'block';
            } else {
                document.getElementById('wf-config-export_report').style.display = 'block';
                document.getElementById('wf-export-wrapper').style.display = 'block';
                document.getElementById('wf-config-smart_pipeline').style.display = 'none';
            }
        });"""

new_wfSelector = """        wfSelector.addEventListener('change', (e) => {
            const val = e.target.value;
            // Hide all first
            document.getElementById('wf-config-export_report').style.display = 'none';
            document.getElementById('wf-export-wrapper').style.display = 'none';
            document.getElementById('wf-config-smart_pipeline').style.display = 'none';
            document.getElementById('wf-config-export_visual').style.display = 'none';
            
            if (val === 'smart_pipeline') {
                document.getElementById('wf-config-smart_pipeline').style.display = 'block';
            } else if (val === 'export_visual') {
                document.getElementById('wf-config-export_visual').style.display = 'block';
            } else {
                document.getElementById('wf-config-export_report').style.display = 'block';
                document.getElementById('wf-export-wrapper').style.display = 'block';
            }
        });"""
if "wf-config-export_visual" not in script:
    script = script.replace(old_wfSelector, new_wfSelector)

# Add logic for visual export
export_visual_logic = """
        // --- Export Visual Data Logic ---
        
        const loadPages = async () => {
            const wId = document.getElementById('wf-vis-workspace').value;
            const rId = document.getElementById('wf-vis-report').value;
            const pageSelect = document.getElementById('wf-vis-page');
            pageSelect.innerHTML = '<option value="">Loading pages...</option>';
            
            if (!wId || !rId) return;
            try {
                const res = await fetch('/api/proxy', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        endpoint: `/groups/${wId}/reports/${rId}/pages`,
                        method: 'GET'
                    })
                });
                const data = await res.json();
                pageSelect.innerHTML = '<option value="">-- Select a Page --</option>';
                if (data.data && data.data.value) {
                    data.data.value.forEach(p => {
                        const opt = document.createElement('option');
                        opt.value = p.name;
                        opt.textContent = p.displayName + ' (' + p.name + ')';
                        pageSelect.appendChild(opt);
                    });
                }
            } catch (err) {
                pageSelect.innerHTML = '<option value="">Error loading pages</option>';
            }
        };

        const loadVisuals = async () => {
            const wId = document.getElementById('wf-vis-workspace').value;
            const rId = document.getElementById('wf-vis-report').value;
            const pId = document.getElementById('wf-vis-page').value;
            const visSelect = document.getElementById('wf-vis-visual');
            visSelect.innerHTML = '<option value="">Loading visuals...</option>';
            
            if (!wId || !rId || !pId) return;
            try {
                const res = await fetch('/api/proxy', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        endpoint: `/groups/${wId}/reports/${rId}/pages/${pId}/visuals`,
                        method: 'GET'
                    })
                });
                const data = await res.json();
                visSelect.innerHTML = '<option value="">-- Select a Visual --</option>';
                if (data.data && data.data.value) {
                    data.data.value.forEach(v => {
                        const opt = document.createElement('option');
                        opt.value = v.name;
                        // Some visuals don't have a title, fallback to their type
                        const vTitle = v.title ? v.title : (v.type ? `[${v.type}]` : 'Unnamed Visual');
                        opt.textContent = vTitle + ' (' + v.name + ')';
                        visSelect.appendChild(opt);
                    });
                }
            } catch (err) {
                visSelect.innerHTML = '<option value="">Error loading visuals</option>';
            }
        };

        document.getElementById('wf-vis-workspace').addEventListener('change', loadPages);
        document.getElementById('wf-vis-report').addEventListener('change', loadPages);
        document.getElementById('wf-vis-page').addEventListener('change', loadVisuals);

        const executeExportVisual = async () => {
            const out = document.getElementById('wf-out-vis');
            out.textContent = `[${new Date().toLocaleTimeString()}] Starting exportData API...\\n`;
            
            const wId = document.getElementById('wf-vis-workspace').value;
            const rId = document.getElementById('wf-vis-report').value;
            const pId = document.getElementById('wf-vis-page').value;
            const visId = document.getElementById('wf-vis-visual').value;
            const expType = document.getElementById('wf-vis-type').value;
            const rows = parseInt(document.getElementById('wf-vis-rows').value) || 100000;
            
            if (!wId || !rId || !pId || !visId) {
                out.textContent += `Error: Please select workspace, report, page, and visual.\\n`;
                return;
            }
            
            try {
                const endpoint = `/groups/${wId}/reports/${rId}/pages/${pId}/visuals/${visId}/exportData`;
                out.textContent += `POST ${endpoint}\\nPayload: { rows: ${rows}, exportDataType: "${expType}" }\\nWaiting for response...\\n`;
                
                const res = await fetch('/api/proxy', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        endpoint: endpoint,
                        method: 'POST',
                        body: { rows: rows, exportDataType: expType }
                    })
                });
                const data = await res.json();
                
                if (data.error || (data.status && data.status >= 400)) {
                    out.textContent += `API Error: ${JSON.stringify(data, null, 2)}\\n`;
                    return;
                }
                
                out.textContent += `Success! Response data received.\\n`;
                // Try to download as CSV if we got text back
                if (data.data) {
                    // Extract CSV string, the API might wrap it depending on version, usually data is the plain text, but JSON parser might have parsed it?
                    // Actually, exportData returns a raw string or JSON. Let's see.
                    let csvData = data.data;
                    if (typeof csvData === 'object') {
                        csvData = JSON.stringify(csvData, null, 2);
                    }
                    
                    const blob = new Blob([csvData], { type: 'text/csv;charset=utf-8;' });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = `VisualExport_${expType}.csv`;
                    a.style.display = 'none';
                    document.body.appendChild(a);
                    a.click();
                    window.URL.revokeObjectURL(url);
                    out.textContent += `\\nFile downloaded: VisualExport_${expType}.csv 🎉\\n`;
                }
            } catch (err) {
                out.textContent += `Exception: ${err.message}\\n`;
            }
        };

        // --- End Export Visual Data Logic ---
"""

# Inject logic before `document.getElementById('wf-btn-runall').onclick`
runall_marker = "document.getElementById('wf-btn-runall').onclick = async function() {"
if "loadPages" not in script:
    script = script.replace(runall_marker, export_visual_logic + "\n        " + runall_marker)

# Replace the runall button logic
old_runall = """        document.getElementById('wf-btn-runall').onclick = async function() {
            if (isWorkflowRunning) return;
            isWorkflowRunning = true;
            this.disabled = true;
            this.innerHTML = '<span class="loader" style="width: 12px; height: 12px; border-width: 2px;"></span> Running...';
            
            try {
                const s1 = await executeStep1();
                if (s1) {
                    const s2 = await executeStep2(true); // pass true for auto-polling
                    if (s2) {
                        await executeStep3();
                    }
                }
            } finally {
                isWorkflowRunning = false;
                this.disabled = false;
                this.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg> Run Full Workflow';
            }
        };"""

new_runall = """        document.getElementById('wf-btn-runall').onclick = async function() {
            if (isWorkflowRunning) return;
            isWorkflowRunning = true;
            this.disabled = true;
            this.innerHTML = '<span class="loader" style="width: 12px; height: 12px; border-width: 2px;"></span> Running...';
            
            try {
                const wfType = document.getElementById('wf-selector').value;
                if (wfType === 'export_report') {
                    const s1 = await executeStep1();
                    if (s1) {
                        const s2 = await executeStep2(true); // pass true for auto-polling
                        if (s2) {
                            await executeStep3();
                        }
                    }
                } else if (wfType === 'export_visual') {
                    await executeExportVisual();
                } else if (wfType === 'smart_pipeline') {
                    // Smart Pipeline trigger
                }
            } finally {
                isWorkflowRunning = false;
                this.disabled = false;
                this.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg> Run Full Workflow';
            }
        };"""

if "wfType === 'export_report'" not in script:
    script = script.replace(old_runall, new_runall)

# Also need to initialize wf-vis-workspace and wf-vis-report
init_logic = """            fillSelect('wf-exp-workspace', 'pbi_workspaces');
            fillSelect('wf-exp-report', 'pbi_reports');"""
new_init_logic = """            fillSelect('wf-exp-workspace', 'pbi_workspaces');
            fillSelect('wf-exp-report', 'pbi_reports');
            fillSelect('wf-vis-workspace', 'pbi_workspaces');
            fillSelect('wf-vis-report', 'pbi_reports');
            
            // Auto trigger loadPages if there's a selection
            setTimeout(loadPages, 500);
"""
if "wf-vis-workspace" not in init_logic:
    # Actually wait, `script` already contains "wf-vis-workspace" in `export_visual_logic`.
    pass

script = script.replace(init_logic, new_init_logic)


# Bump version
script = re.sub(r'script\.js\?v=\d+_[a-zA-Z0-9_]+', 'script.js?v=20260726_v31_visual_export', script)

with open('static/script.js', 'w', encoding='utf-8') as f:
    f.write(script)

print("Export Visual Workflow created successfully!")
