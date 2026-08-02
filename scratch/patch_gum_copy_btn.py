import re

with open('static/index.html', 'r', encoding='utf-8') as f:
    html = f.read()

target = """                                        <button type="button" class="wf-copy-btn" onclick="window.handleCopyAction(this, document.getElementById('wf-out-gum-table').innerText)" title="Copy Table" style="top: 24px; right: 8px; z-index: 10;"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg></button>
                                        <div id="wf-out-gum-table" class="wf-console" style="min-height: 250px; max-height: 400px; padding: 0 12px; white-space: normal;">Waiting for scan...</div>"""

replacement = """                                        <button type="button" class="wf-copy-btn" onclick="window.handleCopyAction(this, document.getElementById('wf-out-gum-table').innerText)" title="Copy Table" style="top: 24px; right: 24px; z-index: 20;"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg></button>
                                        <div id="wf-out-gum-table" class="wf-console" style="min-height: 250px; max-height: 400px; padding: 0 32px 0 12px; white-space: normal;">Waiting for scan...</div>"""

if target in html:
    html = html.replace(target, replacement)
    html = re.sub(r'v143', 'v144', html)
    with open('static/index.html', 'w', encoding='utf-8') as f:
        f.write(html)
    print("HTML patched successfully")
else:
    print("Target not found!")
