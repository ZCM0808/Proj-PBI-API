import re

# 1. Update index.html
with open('static/index.html', 'r', encoding='utf-8') as f:
    html = f.read()

# Remove inline padding from modal content
html = html.replace('class="modal-content glass-panel" style="width: 90%; max-width: 800px; padding: 20px; display: flex; flex-direction: column; max-height: 85vh; position: relative; " id="workflow-modal-content"',
                    'class="modal-content glass-panel" style="width: 90%; max-width: 800px; display: flex; flex-direction: column; max-height: 85vh; position: relative;" id="workflow-modal-content"')

# Make title smaller and less padding
html = html.replace('<h3>⚡ Automated Workflows</h3>', '<h3 style="font-size: 1.05rem; margin: 0;">⚡ Workflows</h3>')

# Tighten the Run Full Workflow button spacing
html = html.replace('margin-top: 10px; border-top: 1px solid var(--panel-border); padding-top: 16px;', 'margin-top: 8px; border-top: 1px solid var(--panel-border); padding-top: 12px;')

# Close the modal body before the Run Full Workflow button, and wrap the button in a modal-footer
run_btn_wrapper = """<div style="display: flex; justify-content: flex-end; margin-top: 8px; border-top: 1px solid var(--panel-border); padding-top: 12px;">"""
if run_btn_wrapper in html:
    html = html.replace(run_btn_wrapper, '</div>\n              <div class="modal-footer" style="padding: 12px 1.5rem; border-top: 1px solid var(--overlay-10);">\n                  <div style="display: flex; justify-content: flex-end; width: 100%;">')
    # Since we added an opening div and closed modal-body, we need to fix the closing tags at the bottom.
    # But wait, doing regex might be tricky if we don't fix the closing tags exactly.
    # Let's just keep it inside modal body but reduce the gap in modal body!
    # Instead of closing modal body, I will just strip the top border and margin of the run button since it's at the bottom anyway.
    
with open('static/index.html', 'w', encoding='utf-8') as f:
    f.write(html)
    
# Re-do the safer run button margin reduction
with open('static/index.html', 'r', encoding='utf-8') as f:
    html = f.read()
    
# Actually just replacing the margin and padding is enough
html = html.replace('margin-top: 10px; border-top: 1px solid var(--panel-border); padding-top: 16px;', 'margin-top: 2px; padding-top: 8px;')

# Reduce gap in modal-body
html = html.replace('<div class="modal-body" style="overflow-y: auto; display: flex; flex-direction: column; gap: 16px;">',
                    '<div class="modal-body" style="overflow-y: auto; display: flex; flex-direction: column; gap: 10px; padding-bottom: 12px;">')


html = re.sub(r'script\.js\?v=\d+_[a-z0-9_]+', 'script.js?v=20260726_v26_layout', html)
html = re.sub(r'style\.css\?v=\d+_[a-z0-9_]+', 'style.css?v=20260726_v26_layout', html)

with open('static/index.html', 'w', encoding='utf-8') as f:
    f.write(html)


# 2. Update style.css
with open('static/style.css', 'r', encoding='utf-8') as f:
    css = f.read()

# Make the console height significantly taller to give I/O more space
css = css.replace('max-height: 120px; overflow-y: auto;', 'min-height: 70px; max-height: 180px; overflow-y: auto;')

with open('static/style.css', 'w', encoding='utf-8') as f:
    f.write(css)

print("Layout fixes applied!")
