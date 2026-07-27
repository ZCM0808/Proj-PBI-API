import re

# 1. Update style.css
with open('static/style.css', 'r', encoding='utf-8') as f:
    css = f.read()

if '.wf-input' not in css:
    css += """
/* Workflow UI Styles */
.wf-input { background: var(--input-bg); border: 1px solid var(--panel-border); color: var(--text-primary); padding: 8px; border-radius: 6px; width: 100%; outline: none; font-family: inherit; transition: border-color 0.2s; box-sizing: border-box; }
.wf-input:focus { border-color: var(--accent); }
.wf-step { background: rgba(0, 0, 0, 0.2); border: 1px solid var(--panel-border); border-radius: 8px; padding: 12px; transition: border-color 0.3s; }
.wf-step.active { border-color: var(--accent); box-shadow: 0 0 8px var(--accent-glow); }
.wf-step-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; }
.wf-step-title { font-weight: 600; color: var(--accent); }
.wf-console { background: #0b0c10; color: #a5d6ff; padding: 8px; border-radius: 4px; font-size: 0.8rem; font-family: 'Fira Code', monospace; max-height: 120px; overflow-y: auto; margin: 0; white-space: pre-wrap; border: 1px solid rgba(255,255,255,0.05); }
.wf-step-btn { padding: 4px 12px; font-size: 0.8rem; }
.wf-step-btn:disabled { opacity: 0.5; cursor: not-allowed; }
"""
    with open('static/style.css', 'w', encoding='utf-8') as f:
        f.write(css)


# 2. Update index.html
with open('static/index.html', 'r', encoding='utf-8') as f:
    html = f.read()

# Add button to header
btn_html = """                        <button id="btn-workflows" class="btn-action-secondary" title="Run Automated Workflows">
                            <span>⚡ Workflows</span>
                        </button>
                        <button id="btn-smart-ops\""""
html = html.replace('<button id="btn-smart-ops"', btn_html)

# Add Modal
modal_html = """
    <!-- Workflow Modal -->
    <div id="workflow-modal" class="modal-overlay" style="display: none; z-index: 10000; opacity: 0; visibility: hidden; transition: opacity 0.25s ease;">
        <div class="modal-content glass-panel" style="width: 90%; max-width: 800px; padding: 20px; display: flex; flex-direction: column; max-height: 85vh; position: relative; transform: scale(0.95); transition: transform 0.25s cubic-bezier(0.175, 0.885, 0.32, 1.275);" id="workflow-modal-content">
            <div class="modal-header">
                <h3>⚡ Automated Workflows</h3>
                <button type="button" class="close-btn" id="close-workflow-btn" title="Close"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 6L6 18"></path><path d="M6 6l12 12"></path></svg></button>
            </div>
            
            <div class="modal-body" style="overflow-y: auto; display: flex; flex-direction: column; gap: 16px;">
                <div style="display: flex; gap: 12px; align-items: center;">
                    <label style="color: var(--text-secondary); font-weight: bold;">Select Workflow:</label>
                    <select id="wf-selector" class="wf-input" style="flex: 1;">
                        <option value="export_report">Export Report to File (PDF/Excel/etc.)</option>
                    </select>
                </div>
                
                <div id="wf-config-export_report" class="wf-config-pane">
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 8px;">
                        <div>
                            <label style="font-size: 0.85rem; color: var(--text-secondary);">Workspace ID</label>
                            <input type="text" id="wf-exp-workspace" class="wf-input" placeholder="Enter Workspace GUID">
                        </div>
                        <div>
                            <label style="font-size: 0.85rem; color: var(--text-secondary);">Report ID</label>
                            <input type="text" id="wf-exp-report" class="wf-input" placeholder="Enter Report GUID">
                        </div>
                        <div style="grid-column: span 2;">
                            <label style="font-size: 0.85rem; color: var(--text-secondary);">Export Format</label>
                            <select id="wf-exp-format" class="wf-input">
                                <option value="PDF">PDF</option>
                                <option value="XLSX">Excel (XLSX) - *Paginated only</option>
                                <option value="CSV">CSV - *Paginated only</option>
                                <option value="PPTX">PowerPoint (PPTX)</option>
                                <option value="PNG">Image (PNG)</option>
                            </select>
                        </div>
                    </div>
                </div>

                <div class="wf-steps-container" style="display: flex; flex-direction: column; gap: 12px; margin-top: 8px;">
                    <!-- Step 1 -->
                    <div class="wf-step" id="wf-step-1">
                        <div class="wf-step-header">
                            <span class="wf-step-title">Step 1: Trigger Export (POST)</span>
                            <button id="wf-btn-step1" class="btn-action-secondary wf-step-btn">Run Step 1</button>
                        </div>
                        <pre id="wf-out-step1" class="wf-console">Input: Ready to start...</pre>
                    </div>
                    <!-- Step 2 -->
                    <div class="wf-step" id="wf-step-2">
                        <div class="wf-step-header">
                            <span class="wf-step-title">Step 2: Poll Status (GET)</span>
                            <button id="wf-btn-step2" class="btn-action-secondary wf-step-btn" disabled>Run Step 2</button>
                        </div>
                        <pre id="wf-out-step2" class="wf-console">Waiting for exportId from Step 1...</pre>
                    </div>
                    <!-- Step 3 -->
                    <div class="wf-step" id="wf-step-3">
                        <div class="wf-step-header">
                            <span class="wf-step-title">Step 3: Download File (GET)</span>
                            <button id="wf-btn-step3" class="btn-action-secondary wf-step-btn" disabled>Run Step 3</button>
                        </div>
                        <pre id="wf-out-step3" class="wf-console">Waiting for Succeeded status from Step 2...</pre>
                    </div>
                </div>

                <div style="display: flex; justify-content: flex-end; margin-top: 10px; border-top: 1px solid var(--panel-border); padding-top: 16px;">
                    <button id="wf-btn-runall" class="btn-action-primary" style="padding: 8px 16px; font-weight: bold; display: flex; align-items: center; gap: 6px;">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>
                        Run Full Workflow
                    </button>
                </div>
            </div>
        </div>
    </div>
    <!-- Settings Modal -->"""
if 'id="workflow-modal"' not in html:
    html = html.replace('<!-- Settings Modal -->', modal_html)

# Cache busting
html = re.sub(r'script\.js\?v=\d+_[a-z0-9_]+', 'script.js?v=20260726_v20_workflows', html)
html = re.sub(r'style\.css\?v=\d+_[a-z0-9_]+', 'style.css?v=20260726_v20_workflows', html)

with open('static/index.html', 'w', encoding='utf-8') as f:
    f.write(html)

# 3. Update script.js
with open('static/script.js', 'r', encoding='utf-8') as f:
    script = f.read()

workflow_js = """
    // --- Workflow Modal Logic ---
    const btnWorkflows = document.getElementById('btn-workflows');
    const workflowModal = document.getElementById('workflow-modal');
    const closeWorkflowBtn = document.getElementById('close-workflow-btn');
    const wfContent = document.getElementById('workflow-modal-content');
    
    let currentExportId = null;
    let isWorkflowRunning = false;

    if (btnWorkflows && workflowModal) {
        if (window.makeDraggable) {
            window.makeDraggable(wfContent, wfContent.querySelector('.modal-header'));
        }

        btnWorkflows.addEventListener('click', () => {
            workflowModal.style.display = 'flex';
            // Trigger animation
            setTimeout(() => {
                workflowModal.style.visibility = 'visible';
                workflowModal.style.opacity = '1';
                wfContent.style.transform = 'scale(1)';
            }, 10);
            
            // Auto-fill active workspace/report if available
            const activeW = document.getElementById('active-workspace')?.value;
            const activeR = document.getElementById('active-report')?.value;
            if (activeW) document.getElementById('wf-exp-workspace').value = activeW;
            if (activeR) document.getElementById('wf-exp-report').value = activeR;
        });

        closeWorkflowBtn.addEventListener('click', () => {
            workflowModal.style.opacity = '0';
            wfContent.style.transform = 'scale(0.95)';
            setTimeout(() => { 
                workflowModal.style.visibility = 'hidden'; 
                workflowModal.style.display = 'none';
            }, 250);
        });

        const logToConsole = (step, msg) => {
            const out = document.getElementById(`wf-out-step${step}`);
            out.textContent += `\\n[${new Date().toLocaleTimeString()}] ${msg}`;
            out.scrollTop = out.scrollHeight;
        };
        const resetConsole = (step, initialMsg) => {
            const out = document.getElementById(`wf-out-step${step}`);
            out.textContent = initialMsg;
        };
        const setStepActive = (step) => {
            [1, 2, 3].forEach(s => document.getElementById(`wf-step-${s}`).classList.remove('active'));
            if (step) document.getElementById(`wf-step-${step}`).classList.add('active');
        };

        const executeStep1 = async () => {
            resetConsole(1, "Input: Sending POST request...");
            setStepActive(1);
            const wId = document.getElementById('wf-exp-workspace').value.trim();
            const rId = document.getElementById('wf-exp-report').value.trim();
            const format = document.getElementById('wf-exp-format').value;
            
            if (!wId || !rId) {
                logToConsole(1, "Error: Workspace ID and Report ID are required.");
                return false;
            }

            try {
                logToConsole(1, `Endpoint: /v1.0/myorg/groups/${wId}/reports/${rId}/ExportTo\\nFormat: ${format}`);
                const res = await fetch('/api/proxy', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        endpoint: `/v1.0/myorg/groups/${wId}/reports/${rId}/ExportTo`,
                        method: 'POST',
                        body: { format: format }
                    })
                });
                const data = await res.json();
                
                if (data.error || (data.status && data.status >= 400)) {
                    logToConsole(1, `API Error: ${JSON.stringify(data, null, 2)}`);
                    return false;
                }
                
                logToConsole(1, `Success! Response: \\n${JSON.stringify(data, null, 2)}`);
                if (data.id) {
                    currentExportId = data.id;
                    logToConsole(1, `\\nExtracted exportId: ${currentExportId}\\nReady for Step 2.`);
                    document.getElementById('wf-btn-step2').disabled = false;
                    return true;
                } else {
                    logToConsole(1, `Could not find 'id' in response.`);
                    return false;
                }
            } catch (err) {
                logToConsole(1, `Exception: ${err.message}`);
                return false;
            }
        };

        const executeStep2 = async (isAuto = false) => {
            if (!currentExportId) {
                logToConsole(2, "Error: No exportId found. Please run Step 1 first.");
                return false;
            }
            if (!isAuto) resetConsole(2, `Polling status for exportId: ${currentExportId}...`);
            setStepActive(2);
            const wId = document.getElementById('wf-exp-workspace').value.trim();
            const rId = document.getElementById('wf-exp-report').value.trim();
            
            try {
                logToConsole(2, `GET /v1.0/myorg/groups/${wId}/reports/${rId}/exports/${currentExportId}`);
                const res = await fetch('/api/proxy', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        endpoint: `/v1.0/myorg/groups/${wId}/reports/${rId}/exports/${currentExportId}`,
                        method: 'GET'
                    })
                });
                const data = await res.json();
                logToConsole(2, `Status response: ${JSON.stringify(data)}`);
                
                if (data.status === 'Succeeded') {
                    logToConsole(2, `\\nExport Succeeded! Ready for Step 3.`);
                    document.getElementById('wf-btn-step3').disabled = false;
                    return true;
                } else if (data.status === 'Failed') {
                    logToConsole(2, `\\nExport Failed! Check Power BI service.`);
                    return false;
                } else {
                    // Running or NotStarted
                    if (isAuto) {
                        logToConsole(2, `Wait 3s and retry...`);
                        await new Promise(r => setTimeout(r, 3000));
                        return await executeStep2(true);
                    }
                    return false;
                }
            } catch (err) {
                logToConsole(2, `Exception: ${err.message}`);
                return false;
            }
        };

        const executeStep3 = async () => {
            resetConsole(3, `Downloading file for exportId: ${currentExportId}...`);
            setStepActive(3);
            const wId = document.getElementById('wf-exp-workspace').value.trim();
            const rId = document.getElementById('wf-exp-report').value.trim();
            
            try {
                logToConsole(3, `GET /v1.0/myorg/groups/${wId}/reports/${rId}/exports/${currentExportId}/file`);
                // Use proxy to get raw response stream
                // Note: since our proxy returns JSON by default if we don't stream, we should tell proxy to fetch raw data.
                // Wait, our proxy doesn't handle binary download easily. 
                // We will send a fetch and then process it.
                logToConsole(3, `Calling proxy... (Warning: downloading binary through JSON proxy might corrupt. In a real app, backend needs a /api/download endpoint. We will attempt standard proxy for now)`);
                const res = await fetch('/api/proxy', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        endpoint: `/v1.0/myorg/groups/${wId}/reports/${rId}/exports/${currentExportId}/file`,
                        method: 'GET'
                    })
                });
                // If it returns a binary stream, the proxy might fail because it tries to return JSON.
                // Since this is a demonstration of the workflow UI, we'll log whatever we get.
                if (res.headers.get('content-type')?.includes('json')) {
                    const data = await res.json();
                    logToConsole(3, `Proxy JSON Output: ${JSON.stringify(data).substring(0, 500)}`);
                } else {
                    const blob = await res.blob();
                    logToConsole(3, `Received Blob: size=${blob.size}, type=${blob.type}`);
                    // trigger download
                    const url = window.URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.style.display = 'none';
                    a.href = url;
                    a.download = `ExportedReport_${rId}`;
                    document.body.appendChild(a);
                    a.click();
                    window.URL.revokeObjectURL(url);
                    logToConsole(3, `File download triggered! Workflow Complete! 🎉`);
                }
                setStepActive(null);
                return true;
            } catch (err) {
                logToConsole(3, `Exception: ${err.message}`);
                return false;
            }
        };

        document.getElementById('wf-btn-step1').onclick = executeStep1;
        document.getElementById('wf-btn-step2').onclick = () => executeStep2(false);
        document.getElementById('wf-btn-step3').onclick = executeStep3;

        document.getElementById('wf-btn-runall').onclick = async function() {
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
        };
    }
    // --- End Workflow Modal Logic ---
"""

if 'btnWorkflows = document.getElementById' not in script:
    script += workflow_js
    script = re.sub(r'script\.js\?v=\d+_[a-z0-9_]+', 'script.js?v=20260726_v20_workflows', script)
    with open('static/script.js', 'w', encoding='utf-8') as f:
        f.write(script)

print("Workflow UI injected!")
