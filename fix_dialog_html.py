import re

with open('static/index.html', 'r', encoding='utf-8') as f:
    html = f.read()

# Refactor custom-dialog-modal to use standard modal-body and modal-footer structure!
old_dialog = r"""    <div id="custom-dialog-modal" class="modal-overlay" style="display: none;">
        <div class="modal-content glass-panel">
            <div class="modal-header" style="border-bottom: none; padding-bottom: 0; margin-bottom: 15px;">
                <h3 id="custom-dialog-title" style="font-size: 1.1rem; margin: 0; color: var(--text-primary); font-weight: 600;">Alert</h3>
                <button type="button" class="close-btn" title="Close"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 6L6 18M6 6l12 12"></path></svg></button>
            </div>
            <div id="custom-dialog-message" style="font-size: 0.95rem; color: var(--text-primary); margin-bottom: 20px; line-height: 1.5; white-space: pre-wrap;"></div>
            <div style="display: flex; justify-content: flex-end; gap: 10px;" id="custom-dialog-buttons">
                <!-- Buttons dynamically inserted -->
            </div>
        </div>
    </div>"""

new_dialog = """    <div id="custom-dialog-modal" class="modal-overlay" style="display: none;">
        <div class="modal-content glass-panel">
            <div class="modal-header" style="border-bottom: 1px solid var(--overlay-10);">
                <h3 id="custom-dialog-title" style="font-size: 1.1rem; margin: 0; color: var(--text-primary); font-weight: 600;">Alert</h3>
                <button type="button" class="close-btn" title="Close"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 6L6 18M6 6l12 12"></path></svg></button>
            </div>
            <div class="modal-body">
                <div id="custom-dialog-message" style="font-size: 0.95rem; color: var(--text-primary); line-height: 1.5; white-space: pre-wrap;"></div>
            </div>
            <div class="modal-footer" style="display: flex; justify-content: flex-end; gap: 10px;" id="custom-dialog-buttons">
                <!-- Buttons dynamically inserted -->
            </div>
        </div>
    </div>"""

html = html.replace(old_dialog, new_dialog)

with open('static/index.html', 'w', encoding='utf-8') as f:
    f.write(html)

# Now remove the double padding from style.css
with open('static/style.css', 'r', encoding='utf-8') as f:
    css = f.read()
    
css = css.replace('#custom-dialog-modal .modal-content { max-width: 400px; padding: 20px; }', '#custom-dialog-modal .modal-content { max-width: 400px; }')

with open('static/style.css', 'w', encoding='utf-8') as f:
    f.write(css)

print('Fixed dialog HTML and CSS!')
