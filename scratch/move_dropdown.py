import re

html_path = 'static/index.html'
with open(html_path, 'r', encoding='utf-8') as f:
    html = f.read()

# We need to replace the wf-ds-step-2 header and the separate container with a combined header.
pattern = re.compile(
    r'<div class="wf-step-header">\s*'
    r'<span class="wf-step-title">Step 2: Execute Query & Download \(CSV\)</span>\s*'
    r'<div style="display: flex; gap: 8px; align-items: center;">\s*'
    r'<button id="wf-ds-btn-step2" class="btn-action-secondary wf-step-btn" onclick="window\.executeDatasetStep2\(this\)">Run Step 2</button>\s*'
    r'</div>\s*'
    r'</div>\s*'
    r'<div id="wf-ds-table-container"[^>]*>.*?<input type="hidden" id="wf-ds-table" value="">\s*</div>\s*</div>',
    re.DOTALL
)

replacement = """<div class="wf-step-header" style="flex-wrap: nowrap; gap: 8px;">
                                <span class="wf-step-title" style="white-space: nowrap;">Step 2: Execute Query & Download (CSV)</span>
                                
                                <div id="wf-ds-table-container" style="display: flex; align-items: center; justify-content: flex-end; flex: 1; opacity: 0.4; transition: opacity 0.3s ease; min-width: 150px;">
                                    <div class="custom-select-wrapper" style="position: relative; flex: 1; max-width: 350px;" id="wf-ds-table-wrapper" onclick="window.toggleDsTableDropdown(event)">
                                        <div class="wf-input" id="wf-ds-table-trigger" style="height: 26px; display: flex; align-items: center; justify-content: space-between; cursor: not-allowed; padding: 0 8px; font-size: 0.75rem; border-radius: 4px; user-select: none; background: rgba(0,0,0,0.2);">
                                            <span id="wf-ds-table-display" style="overflow: hidden; text-overflow: ellipsis; white-space: nowrap; color: var(--text-secondary);">-- Run Step 1 First --</span>
                                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="transition: transform 0.2s ease; margin-left: 6px;"><path d="M6 9l6 6 6-6"></path></svg>
                                        </div>
                                        <ul id="wf-ds-table-options" class="wf-input custom-select-dropdown" style="position: absolute; top: calc(100% + 4px); bottom: auto; left: 0; width: 100%; max-height: 200px; overflow-y: auto; background: var(--dropdown-bg); border: 1px solid var(--panel-border); border-radius: 4px; padding: 4px 0; margin: 0; list-style: none; z-index: 1000; opacity: 0; visibility: hidden; transform: translateY(-8px); transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1); box-shadow: 0 4px 16px rgba(0,0,0,0.4);">
                                            <li style="padding: 6px 10px; font-size: 0.75rem; cursor: not-allowed; color: var(--text-secondary);">-- Run Step 1 First --</li>
                                        </ul>
                                        <input type="hidden" id="wf-ds-table" value="">
                                    </div>
                                </div>
                                
                                <button id="wf-ds-btn-step2" class="btn-action-secondary wf-step-btn" style="white-space: nowrap;" onclick="window.executeDatasetStep2(this)">Run Step 2</button>
                            </div>"""

if pattern.search(html):
    html = pattern.sub(replacement, html)
    html = html.replace('v20260727_v67_ds_steps_v7', 'v20260727_v68_ds_steps_v8')
    with open(html_path, 'w', encoding='utf-8') as f:
        f.write(html)
    print("HTML updated successfully.")
else:
    print("Pattern not found in HTML!")


js_path = 'static/script.js'
with open(js_path, 'r', encoding='utf-8') as f:
    js = f.read()

# Change translateY(8px) back to translateY(-8px) for dropdown animations
# We only want to change the dropdown's transforms, not the chat bubbles.
js = js.replace("options.style.transform = 'translateY(8px)';", "options.style.transform = 'translateY(-8px)';")

with open(js_path, 'w', encoding='utf-8') as f:
    f.write(js)
print("JS updated successfully.")
