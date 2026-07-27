import re

with open('static/index.html', 'r', encoding='utf-8') as f:
    html = f.read()

# Change Workspace and Report inputs to select
html = html.replace('<input type="text" id="wf-exp-workspace" class="wf-input" placeholder="Enter Workspace GUID">', '<select id="wf-exp-workspace" class="wf-input"></select>')
html = html.replace('<input type="text" id="wf-exp-report" class="wf-input" placeholder="Enter Report GUID">', '<select id="wf-exp-report" class="wf-input"></select>')

# Make the step headers less tall
# Since I injected wf-step and wf-console via CSS in style.css, I will fix them there.

# Cache busting
html = re.sub(r'script\.js\?v=\d+_[a-z0-9_]+', 'script.js?v=20260726_v23_ui_polishes', html)
html = re.sub(r'style\.css\?v=\d+_[a-z0-9_]+', 'style.css?v=20260726_v23_ui_polishes', html)

with open('static/index.html', 'w', encoding='utf-8') as f:
    f.write(html)


with open('static/style.css', 'r', encoding='utf-8') as f:
    css = f.read()

# Adjust spacing for steps
css = css.replace('.wf-step { background: rgba(0, 0, 0, 0.2); border: 1px solid var(--panel-border); border-radius: 8px; padding: 12px;', '.wf-step { background: rgba(0, 0, 0, 0.2); border: 1px solid var(--panel-border); border-radius: 8px; padding: 8px 12px;')
css = css.replace('.wf-step-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; }', '.wf-step-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px; }')
css = css.replace('.wf-step-title { font-weight: 600; color: var(--accent); }', '.wf-step-title { font-weight: 600; color: var(--accent); font-size: 0.9rem; }')
css = css.replace('.wf-step-btn { padding: 4px 12px; font-size: 0.8rem; }', '.wf-step-btn { padding: 2px 10px; font-size: 0.75rem; }')
css = css.replace('.wf-console { background: #0b0c10; color: #a5d6ff; padding: 8px; border-radius: 4px; font-size: 0.8rem;', '.wf-console { background: #0b0c10; color: #a5d6ff; padding: 6px; border-radius: 4px; font-size: 0.75rem;')

with open('static/style.css', 'w', encoding='utf-8') as f:
    f.write(css)


with open('static/script.js', 'r', encoding='utf-8') as f:
    script = f.read()

# Fix the Draggable issue by initializing makeDraggable when the button is clicked!
# This avoids the undefined issue at startup.
init_drag_replacement = """        btnWorkflows.addEventListener('click', () => {
            if (window.makeDraggable && !wfContent.hasAttribute('data-drag-init')) {
                window.makeDraggable(wfContent, wfContent.querySelector('.modal-header'));
                wfContent.setAttribute('data-drag-init', 'true');
            }
"""
script = script.replace("        btnWorkflows.addEventListener('click', () => {", init_drag_replacement)
# Remove the old buggy init
script = script.replace("""        if (window.makeDraggable) {
            window.makeDraggable(wfContent, wfContent.querySelector('.modal-header'));
        }""", "")

# Populate select boxes
populate_logic = """            // Auto-fill active workspace/report if available
            const fillSelect = (selectId, storageKey) => {
                const select = document.getElementById(selectId);
                if(!select) return;
                select.innerHTML = '<option value="">-- Select --</option>';
                const items = JSON.parse(localStorage.getItem(storageKey) || '[]');
                items.forEach(item => {
                    const opt = document.createElement('option');
                    opt.value = item.id;
                    opt.textContent = `${item.name} (${item.id})`;
                    select.appendChild(opt);
                });
            };
            fillSelect('wf-exp-workspace', 'pbi_workspaces');
            fillSelect('wf-exp-report', 'pbi_reports');

            const activeW = document.getElementById('active-workspace')?.value;
            const activeR = document.getElementById('active-report')?.value;
            if (activeW) document.getElementById('wf-exp-workspace').value = activeW;
            if (activeR) document.getElementById('wf-exp-report').value = activeR;
"""
# Replace the old auto-fill
old_auto_fill = """            // Auto-fill active workspace/report if available
            const activeW = document.getElementById('active-workspace')?.value;
            const activeR = document.getElementById('active-report')?.value;
            if (activeW) document.getElementById('wf-exp-workspace').value = activeW;
            if (activeR) document.getElementById('wf-exp-report').value = activeR;"""
script = script.replace(old_auto_fill, populate_logic)


# Auto-reset position when clicking outside or closing
close_logic = """        closeWorkflowBtn.addEventListener('click', () => {
            workflowModal.style.opacity = '0';
            wfContent.style.transform = 'scale(0.95)';
            setTimeout(() => { 
                workflowModal.style.visibility = 'hidden'; 
                workflowModal.style.display = 'none';
                wfContent.style.left = '0px';
                wfContent.style.top = '0px';
            }, 250);
        });

        // Close on background click
        window.addEventListener('click', (e) => {
            if (e.target === workflowModal) {
                closeWorkflowBtn.click();
            }
        });
"""
script = script.replace("""        closeWorkflowBtn.addEventListener('click', () => {
            workflowModal.style.opacity = '0';
            wfContent.style.transform = 'scale(0.95)';
            setTimeout(() => { 
                workflowModal.style.visibility = 'hidden'; 
                workflowModal.style.display = 'none';
            }, 250);
        });""", close_logic)


script = re.sub(r'script\.js\?v=\d+_[a-z0-9_]+', 'script.js?v=20260726_v23_ui_polishes', script)

with open('static/script.js', 'w', encoding='utf-8') as f:
    f.write(script)

print("Workflow polishes applied!")
