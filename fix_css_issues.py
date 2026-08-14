import re

with open('static/style.css', 'r', encoding='utf-8') as f:
    css = f.read()

# Fix modal-overlay to be flex-start so tall modals don't get cut off at top
old_modal_overlay_regex = r'\.modal-overlay\s*\{[^\}]+\}'
new_modal_overlay = """.modal-overlay {
    position: fixed; inset: 0;
    background: var(--shadow-dark);
    display: flex; justify-content: center; align-items: flex-start;
    padding: 60px 20px 20px 20px;
    box-sizing: border-box;
    overflow-y: auto;
    overflow-x: hidden;
    z-index: 10000;
    animation: modalFadeIn 0.3s cubic-bezier(0.4, 0, 0.2, 1) forwards;
}"""
css = re.sub(old_modal_overlay_regex, new_modal_overlay, css, count=1)

# Fix modal-content to have margin: 0 auto so it centers properly
old_modal_content_regex = r'\.modal-content\s*\{[^\}]+\}'
new_modal_content = """.modal-content {
    width: 100%; max-width: 600px; 
    max-height: 85vh;
    position: relative;
    margin: 0 auto;
    background: var(--panel-bg);
    border: 1px solid var(--panel-border);
    border-radius: 12px;
    display: flex; flex-direction: column;
    animation: modalPopUp 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards;
    box-shadow: 0 12px 40px rgba(0,0,0,0.3); /* reduced shadow for performance */
}

/* Modal overrides for specific modals */
#workflow-modal .modal-content { max-width: 800px; }
#scan-modal .modal-content { max-width: 1000px; }
#custom-dialog-modal .modal-content { max-width: 400px; padding: 20px; }
#gum-edit-modal .modal-content, #gum-add-modal .modal-content { max-width: 450px; }
#pipeline-modal .modal-content { max-width: 800px; }"""
css = re.sub(old_modal_content_regex, new_modal_content, css, count=1)

# Fix modal-body so it doesn't force height
old_modal_body_regex = r'\.modal-body\s*\{[^\}]+\}'
new_modal_body = """.modal-body { 
    padding: 1.5rem; 
    flex: 0 1 auto; 
    overflow-y: auto; 
    min-height: 0; 
}"""
css = re.sub(old_modal_body_regex, new_modal_body, css)

# Completely kill the scale animation on close to prevent GPU lag
old_modalPopDown_regex = r'@keyframes modalPopDown\s*\{[^\}]+\}'
new_modalPopDown = """@keyframes modalPopDown {
    from { opacity: 1; }
    to { opacity: 0; }
}"""
css = re.sub(old_modalPopDown_regex, new_modalPopDown, css)

with open('static/style.css', 'w', encoding='utf-8') as f:
    f.write(css)

print('Updated style.css!')
