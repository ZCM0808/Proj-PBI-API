import re

with open('static/index.html', 'r', encoding='utf-8') as f:
    html = f.read()

# 1. Fix the header buttons
header_buttons_regex = r'<button id="btn-workflows".*?<\/button>\s*<button id="btn-smart-ops".*?<\/button>'
new_header_buttons = """<button id="btn-workflows" class="btn-action-icon" title="Automated Workflows (includes Smart DataOps Pipeline)">
                            <span>⚡</span>
                        </button>"""
html = re.sub(header_buttons_regex, new_header_buttons, html, flags=re.DOTALL)

# Also in case they are separated:
html = re.sub(r'<button id="btn-smart-ops".*?<\/button>', '', html, flags=re.DOTALL)

# 2. Add Smart Pipeline to Workflow selector
options_regex = r'(<select id="wf-selector" class="wf-input" style="flex: 1;">\s*<option value="export_report">Export Report to File \(PDF/Excel/etc\.\)</option>)'
new_options = r'\1\n                        <option value="smart_pipeline">Smart DataOps Pipeline (Auto Bind/Scan/Check)</option>'
html = re.sub(options_regex, new_options, html)

# 3. Move Pipeline Modal content into Workflow Modal
# Extract pipeline body and footer
pipeline_inner = """
                <!-- Smart Pipeline Container -->
                <div id="wf-config-smart_pipeline" class="wf-config-pane" style="display: none;">
                    <div style="background: rgba(0,0,0,0.2); border: 1px solid var(--panel-border); border-radius: 8px; padding: 12px;">
                        <div class="terminal-view" id="pipeline-terminal" style="max-height: 200px; margin-bottom: 12px;">
                            <div class="terminal-line"><span class="info">系统已就绪。点击下方按钮开始智能扫描并自动绑定工作区、数据集和报表...</span></div>
                        </div>
                        <div style="display: flex; justify-content: flex-end;">
                            <button id="start-pipeline-btn" class="btn-pipeline" style="padding: 8px 16px;">🚀 开始全自动链路 (Start DataOps)</button>
                        </div>
                    </div>
                </div>
"""

# Insert right after the wf-config-export_report div ends
# The end of wf-config-export_report is before `<div class="wf-steps-container"`
wf_steps_start = '<div class="wf-steps-container"'
html = html.replace(wf_steps_start, pipeline_inner + '\n                ' + wf_steps_start)

# Add an ID to the export config pane wrapper to hide/show it
if 'id="wf-export-wrapper"' not in html:
    html = html.replace('<div class="wf-steps-container"', '<div id="wf-export-wrapper">\n                <div class="wf-steps-container"')
    html = html.replace('<!-- Step 1 -->', '<!-- Step 1 -->')
    # close the wrapper right before modal-body closes
    html = html.replace('</div>\n        </div>\n    </div>\n    <!-- Settings Modal -->', '</div>\n            </div>\n        </div>\n    </div>\n    <!-- Settings Modal -->')


# Wait, actually we can just wrap the export specific things in a div.
# Let's replace the whole modal content logic inside index.html for safety.
# We will use regex to find `<div id="wf-config-export_report"` and the steps container, and wrap them.

html = re.sub(r'script\.js\?v=\d+_[a-z0-9_]+', 'script.js?v=20260726_v21_workflow_fix', html)
with open('static/index.html', 'w', encoding='utf-8') as f:
    f.write(html)

# 4. Patch script.js
with open('static/script.js', 'r', encoding='utf-8') as f:
    script = f.read()

# Fix the URLs in executeStep1, executeStep2, executeStep3
script = script.replace('endpoint: `/v1.0/myorg/groups/${wId}/reports/${rId}/ExportTo`', 'endpoint: `/groups/${wId}/reports/${rId}/ExportTo`')
script = script.replace('Endpoint: /v1.0/myorg/groups/${wId}/reports/${rId}/ExportTo', 'Endpoint: /groups/${wId}/reports/${rId}/ExportTo')

script = script.replace('endpoint: `/v1.0/myorg/groups/${wId}/reports/${rId}/exports/${currentExportId}`', 'endpoint: `/groups/${wId}/reports/${rId}/exports/${currentExportId}`')
script = script.replace('GET /v1.0/myorg/groups/${wId}/reports/${rId}/exports/${currentExportId}', 'GET /groups/${wId}/reports/${rId}/exports/${currentExportId}')

script = script.replace('endpoint: `/v1.0/myorg/groups/${wId}/reports/${rId}/exports/${currentExportId}/file`', 'endpoint: `/groups/${wId}/reports/${rId}/exports/${currentExportId}/file`')
script = script.replace('GET /v1.0/myorg/groups/${wId}/reports/${rId}/exports/${currentExportId}/file', 'GET /groups/${wId}/reports/${rId}/exports/${currentExportId}/file')


# Add the select logic to switch between workflows
workflow_switch_js = """
        const wfSelector = document.getElementById('wf-selector');
        wfSelector.addEventListener('change', (e) => {
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
        });
"""

# Let's write a targeted replacement for script.js
if 'wfSelector.addEventListener' not in script:
    script = script.replace("document.getElementById('wf-btn-step1').onclick = executeStep1;", workflow_switch_js + "\n        document.getElementById('wf-btn-step1').onclick = executeStep1;")

# Remove the old btnSmartOps listener and update pipeline logic to not use pipelineModal
script = script.replace("btnSmartOps.addEventListener('click', () => {", "/* removed btnSmartOps */ if(false) {")
script = script.replace("closeModalBtn.addEventListener('click', () => {", "/* removed pipeline modal close */ if(false) {")
script = script.replace("pipelineModal.style.display = 'flex';", "/* pipelineModal.style.display = 'flex'; */")
script = script.replace("pipelineModal.style.display = 'none';", "/* pipelineModal.style.display = 'none'; */")


script = re.sub(r'script\.js\?v=\d+_[a-z0-9_]+', 'script.js?v=20260726_v21_workflow_fix', script)

with open('static/script.js', 'w', encoding='utf-8') as f:
    f.write(script)

print("Patch generated!")
