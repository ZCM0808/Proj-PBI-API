import re

with open('static/style.css', 'r', encoding='utf-8') as f:
    css = f.read()

# Replace .modal-content block entirely
old_modal_content_regex = r'\.modal-content\s*\{[^\}]+\}'
new_modal_content = """.modal-content {
    width: 100%; max-width: 600px; 
    max-height: 85vh;
    position: relative;
    background: var(--panel-bg);
    border: 1px solid var(--panel-border);
    border-radius: 12px;
    display: flex; flex-direction: column;
    animation: modalPopUp 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards;
    box-shadow: 0 24px 80px rgba(0,0,0,0.5);
}

/* Modal overrides for specific modals */
#workflow-modal .modal-content { max-width: 800px; }
#scan-modal .modal-content { max-width: 1000px; }
#custom-dialog-modal .modal-content { max-width: 400px; padding: 20px; }
#gum-edit-modal .modal-content, #gum-add-modal .modal-content { max-width: 450px; }
#pipeline-modal .modal-content { max-width: 800px; }
"""

css = re.sub(old_modal_content_regex, new_modal_content, css)

# Make modal-body correctly scrollable without taking too much space
old_modal_body_regex = r'\.modal-body\s*\{[^\}]+\}'
new_modal_body = """.modal-body { 
    padding: 1.5rem; 
    flex: 1; 
    overflow-y: auto; 
    min-height: 0; 
}"""
css = re.sub(old_modal_body_regex, new_modal_body, css)

# Make sure note modal body doesn't have min-height
css = css.replace("min-height: 480px;", "")

with open('static/style.css', 'w', encoding='utf-8') as f:
    f.write(css)

print('Updated style.css for consistent modals!')
