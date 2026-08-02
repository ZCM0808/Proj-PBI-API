import re

with open('static/index.html', 'r', encoding='utf-8') as f:
    html = f.read()

target = """                                    <!-- Table Section -->
                                    <div style="position: relative;">
                                        <div style="font-size: 0.75rem; font-weight: bold; margin-bottom: 4px; color: var(--text-secondary); display: flex; justify-content: space-between; align-items: center;">
                                            <div style="display: flex; gap: 8px; align-items: center;">
                                                <span>Global Permissions Table</span>
                                                <span id="wf-gum-stats" style="color: var(--accent); font-weight: normal;"></span>
                                            </div>
                                            <button type="button" style="background: transparent; border: 1px solid var(--panel-border); color: var(--text-primary); padding: 2px 6px; border-radius: 4px; font-size: 0.7rem; cursor: pointer; display: flex; align-items: center; gap: 4px; transition: background 0.2s;" onmouseover="this.style.background='var(--overlay-10)'" onmouseout="this.style.background='transparent'" onclick="window.handleCopyAction(this, document.getElementById('wf-out-gum-table').innerText)" title="Copy Table">
                                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg> Copy
                                            </button>
                                        </div>
                                        <div id="wf-out-gum-table" class="wf-console" style="min-height: 250px; max-height: 400px; padding: 0 12px; white-space: normal;">Waiting for scan...</div>
                                    </div>"""

replacement = """                                    <!-- Table Section -->
                                    <div style="position: relative;">
                                        <div style="font-size: 0.75rem; font-weight: bold; margin-bottom: 4px; color: var(--text-secondary); display: flex; justify-content: space-between; align-items: center;">
                                            <span>Global Permissions Table</span>
                                            <span id="wf-gum-stats" style="color: var(--accent); font-weight: normal;"></span>
                                        </div>
                                        <button type="button" class="wf-copy-btn" onclick="window.handleCopyAction(this, document.getElementById('wf-out-gum-table').innerText)" title="Copy Table" style="top: 24px; right: 8px; z-index: 10;"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg></button>
                                        <div id="wf-out-gum-table" class="wf-console" style="min-height: 250px; max-height: 400px; padding: 0 32px 0 12px; white-space: normal;">Waiting for scan...</div>
                                    </div>"""

if target in html:
    html = html.replace(target, replacement)
    html = re.sub(r'v145', 'v146', html)
    with open('static/index.html', 'w', encoding='utf-8') as f:
        f.write(html)
    print("HTML patched successfully")
else:
    print("Target HTML not found!")

with open('static/script.js', 'r', encoding='utf-8') as f:
    js = f.read()

target_js = """<thead style="position: sticky; top: 0; background: var(--panel-bg); z-index: 10;">"""
replacement_js = """<thead style="position: sticky; top: 0; background: var(--panel-bg); z-index: 5;">"""

if target_js in js:
    js = js.replace(target_js, replacement_js)
    with open('static/script.js', 'w', encoding='utf-8') as f:
        f.write(js)
    print("JS patched successfully")
else:
    print("Target JS not found!")
