import re

# 1. Update index.html
with open('static/index.html', 'r', encoding='utf-8') as f:
    html = f.read()

# Strip inline styles for transition, opacity, visibility, transform from workflow-modal
old_modal_overlay = 'id="workflow-modal" class="modal-overlay" style="display: none; z-index: 10000; opacity: 0; visibility: hidden; transition: opacity 0.25s ease;"'
new_modal_overlay = 'id="workflow-modal" class="modal-overlay" style="display: none; z-index: 10000;"'
html = html.replace(old_modal_overlay, new_modal_overlay)

old_modal_content = 'id="workflow-modal-content"'
# Actually we can just regex the style
html = re.sub(
    r'class="modal-content glass-panel" style="([^"]*?)transform: scale\(0.95\); transition: transform 0.25s cubic-bezier\(0.175, 0.885, 0.32, 1.275\);"',
    r'class="modal-content glass-panel" style="\1"',
    html
)

html = re.sub(r'script\.js\?v=\d+_[a-z0-9_]+', 'script.js?v=20260726_v24_ui_fixes', html)
html = re.sub(r'style\.css\?v=\d+_[a-z0-9_]+', 'style.css?v=20260726_v24_ui_fixes', html)

with open('static/index.html', 'w', encoding='utf-8') as f:
    f.write(html)


# 2. Update style.css
with open('static/style.css', 'r', encoding='utf-8') as f:
    css = f.read()

# User says: 每个步骤的标题太大了，空余空间太多了 (The step title is too large, too much empty space)
css = css.replace('.wf-step-title { font-weight: 600; color: var(--accent); font-size: 0.9rem; }', '.wf-step-title { font-weight: 600; color: var(--accent); font-size: 0.8rem; }')
css = css.replace('.wf-step { background: rgba(0, 0, 0, 0.2); border: 1px solid var(--panel-border); border-radius: 8px; padding: 8px 12px;', '.wf-step { background: rgba(0, 0, 0, 0.2); border: 1px solid var(--panel-border); border-radius: 8px; padding: 6px 10px;')
css = css.replace('.wf-step-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px; }', '.wf-step-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 2px; }')
css = css.replace('.wf-console { background: #0b0c10; color: #a5d6ff; padding: 6px; border-radius: 4px; font-size: 0.75rem;', '.wf-console { background: #0b0c10; color: #a5d6ff; padding: 4px; border-radius: 4px; font-size: 0.7rem;')

# Add animation for the workflow-modal content to match other modals.
# .modal-content already has animation: modalPopUp 0.3s forwards. 

with open('static/style.css', 'w', encoding='utf-8') as f:
    f.write(css)


# 3. Update script.js
with open('static/script.js', 'r', encoding='utf-8') as f:
    script = f.read()

# Fix alias vs name for dropdowns
script = script.replace('opt.textContent = `${item.name} (${item.id})`;', 'opt.textContent = `${item.alias || item.name || "Unnamed"} (${item.id})`;')


# Refactor workflowModal opening/closing to match global logic
new_open_logic = """        btnWorkflows.addEventListener('click', () => {
            if (window.makeDraggable && !wfContent.hasAttribute('data-drag-init')) {
                window.makeDraggable(wfContent, wfContent.querySelector('.modal-header'));
                wfContent.setAttribute('data-drag-init', 'true');
            }
            
            wfContent.style.left = '0px';
            wfContent.style.top = '0px';
            workflowModal.style.display = 'flex';
"""
script = re.sub(r'        btnWorkflows\.addEventListener\(\'click\', \(\) => \{\n.*?workflowModal\.style\.display = \'flex\';\n.*?setTimeout\(\(\) => \{\n.*?workflowModal\.style\.visibility = \'visible\';\n.*?workflowModal\.style\.opacity = \'1\';\n.*?wfContent\.style\.transform = \'scale\(1\)\';\n.*?\}, 10\);', new_open_logic, script, flags=re.DOTALL)

# Refactor close logic to use closeModalWithAnimation
new_close_logic = """        closeWorkflowBtn.addEventListener('click', () => {
            if(window.closeModalWithAnimation) {
                window.closeModalWithAnimation('workflow-modal');
            } else {
                workflowModal.style.display = 'none';
            }
        });
"""
script = re.sub(r'        closeWorkflowBtn\.addEventListener\(\'click\', \(\) => \{\n.*?workflowModal\.style\.opacity = \'0\';\n.*?wfContent\.style\.transform = \'scale\(0\.95\)\';\n.*?setTimeout\(\(\) => \{\n.*?workflowModal\.style\.visibility = \'hidden\';\n.*?workflowModal\.style\.display = \'none\';\n.*?wfContent\.style\.left = \'0px\';\n.*?wfContent\.style\.top = \'0px\';\n.*?\}, 250\);\n.*?\}\);', new_close_logic, script, flags=re.DOTALL)

# We already removed double click event listener (Wait, I added one in previous patch, let's remove it!)
remove_bg_click = r'        // Close on background click\n        window\.addEventListener\(\'click\', \(e\) => \{\n            if \(e\.target === workflowModal\) \{\n                closeWorkflowBtn\.click\(\);\n            \}\n        \}\);'
script = re.sub(remove_bg_click, '', script)

script = re.sub(r'script\.js\?v=\d+_[a-z0-9_]+', 'script.js?v=20260726_v24_ui_fixes', script)

with open('static/script.js', 'w', encoding='utf-8') as f:
    f.write(script)

print("Patch 3 generated and applied!")
