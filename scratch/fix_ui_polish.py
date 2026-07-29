import os
import re

INDEX_FILE = 'static/index.html'
STYLE_FILE = 'static/style.css'
SCRIPT_FILE = 'static/script.js'

def patch_index():
    with open(INDEX_FILE, 'r', encoding='utf-8') as f:
        html = f.read()

    # 1. Add Check Permissions Workflow to selector
    if 'value="check_permissions"' not in html:
        html = html.replace(
            '<option value="report_view_count">Admin Report View Count (Activity Events)</option>',
            '<option value="report_view_count">Admin Report View Count (Activity Events)</option>\n                        <option value="check_permissions">Check Current Permissions (Token/Features)</option>'
        )

    # 2. Wrap all wf-out pre + button in a relative container if not already
    # Old pattern: <pre id="...">...</pre>\n<button...>...</button>
    # Note: the existing HTML has:
    # <pre id="wf-out-step1" class="wf-console">Input: Ready to start...</pre>
    # <button type="button" class="wf-copy-btn" onclick="copyWfConsole(1, this)" title="Copy Output">
    #     <svg...></svg>
    # </button>
    
    # We will just write a regex to find all <pre class="wf-console"> and following button.
    def replace_console(m):
        pre_tag = m.group(1)
        id_match = re.search(r'id="([^"]+)"', pre_tag)
        pre_id = id_match.group(1) if id_match else "unknown"
        return f'<div style="position: relative;">\n    {pre_tag}\n    <button type="button" class="wf-copy-btn" onclick="window.handleCopyAction(this, document.getElementById(\'{pre_id}\').textContent)" title="Copy Output"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg></button>\n</div>'

    html = re.sub(r'(<pre[^>]*class="wf-console"[^>]*>.*?</pre>)\s*<button[^>]*class="wf-copy-btn"[^>]*>.*?</button>', replace_console, html, flags=re.DOTALL)

    # 3. Add copy button to Admin Report View Count
    if 'onclick="window.handleCopyAction(this, document.getElementById(\'wf-out-rvc\').innerText' not in html:
        target = '<div id="wf-out-rvc"'
        replacement = '<div style="position: relative;">\n                                    <button type="button" class="wf-copy-btn" onclick="window.handleCopyAction(this, document.getElementById(\'wf-out-rvc\').innerText)" title="Copy Output" style="top: 8px; right: 8px; z-index: 10;"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg></button>\n                                    <div id="wf-out-rvc"'
        html = html.replace(target, replacement, 1)
        html = html.replace('</div>\n                            </div>\n                        </div>\n                    </div>\n                </div>', '</div>\n</div>\n                            </div>\n                        </div>\n                    </div>\n                </div>', 1)

    # 4. Insert Check Permissions Pane
    if 'id="wf-config-check_permissions"' not in html:
        perms_pane = """
                <div id="wf-config-check_permissions" class="wf-config-pane" style="display: none;">
                    <div class="wf-steps-container" style="display: flex; flex-direction: column; gap: 12px; margin-top: 8px;">
                        <div class="wf-step active">
                            <div class="wf-step-header">
                                <span class="wf-step-title">Fetch Available Features & Token Info</span>
                                <button class="btn-action-primary" id="btn-run-check-perms" style="margin-left: auto; padding: 4px 12px; font-size: 0.8rem;" onclick="window.runCheckPermsWorkflow()">Run Check</button>
                            </div>
                            <div class="wf-step-content" style="display: block; margin-top: 8px;">
                                <div style="position: relative;">
                                    <pre id="wf-out-perms" class="wf-console" style="min-height: 150px;">Ready to check permissions...\n\nClick "Run Check" to fetch /availableFeatures.</pre>
                                    <button type="button" class="wf-copy-btn" onclick="window.handleCopyAction(this, document.getElementById('wf-out-perms').textContent)" title="Copy Output"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg></button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
"""
        html = html.replace('<div id="wf-config-smart_pipeline"', perms_pane + '<div id="wf-config-smart_pipeline"')

    # 5. Standardize other copy buttons
    # Request Body Copy
    html = re.sub(
        r'<button id="copy-req-body-btn"[^>]*>.*?</button>',
        '<button id="copy-req-body-btn" class="icon-btn" title="Copy Request Body" type="button" style="padding: 4px; display: flex; align-items: center; justify-content: center; color: var(--text-secondary); border-color: var(--overlay-10); border-radius: 4px; background: transparent; cursor: pointer;" onclick="window.handleCopyAction(this, document.getElementById(\'req-body\').value)"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg></button>',
        html, flags=re.DOTALL
    )
    # Response Body Copy
    html = re.sub(
        r'<button id="copy-res-body-btn"[^>]*>.*?</button>',
        '<button id="copy-res-body-btn" class="icon-btn" title="Copy Response JSON" type="button" style="padding: 4px; display: flex; align-items: center; justify-content: center; color: var(--text-secondary); border-color: var(--overlay-10); border-radius: 4px; background: transparent; cursor: pointer;" onclick="window.handleCopyAction(this, window.currentJsonResponse ? JSON.stringify(window.currentJsonResponse, null, 2) : document.getElementById(\'response-output\').textContent)"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg></button>',
        html, flags=re.DOTALL
    )
    
    # 6. Cache busting
    html = re.sub(r'script\.js\?v=[\w_]+', 'script.js?v=20260729_v94_perms', html)
    html = re.sub(r'style\.css\?v=[\w_]+', 'style.css?v=20260729_v94_perms', html)

    with open(INDEX_FILE, 'w', encoding='utf-8') as f:
        f.write(html)

def patch_style():
    with open(STYLE_FILE, 'r', encoding='utf-8') as f:
        css = f.read()
    
    # Update wf-console font size and padding
    css = re.sub(
        r'\.wf-console\s*\{[^}]*\}',
        ".wf-console { background: var(--input-bg); color: var(--text-primary); padding: 12px 32px 12px 12px; border-radius: 4px; font-size: 0.85rem; font-family: 'Fira Code', monospace; min-height: 100px; max-height: 250px; overflow-y: auto; margin: 0; white-space: pre-wrap; border: 1px solid var(--panel-border); }",
        css
    )
    with open(STYLE_FILE, 'w', encoding='utf-8') as f:
        f.write(css)

def patch_script():
    with open(SCRIPT_FILE, 'r', encoding='utf-8') as f:
        js = f.read()

    # 1. Add handleCopyAction
    if 'window.handleCopyAction' not in js:
        copy_fn = """
window.handleCopyAction = function(btn, text) {
    if(!text) return;
    navigator.clipboard.writeText(text).then(() => {
        const origHTML = btn.innerHTML;
        btn.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--success)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>';
        btn.style.color = 'var(--success)';
        btn.style.borderColor = 'var(--success)';
        setTimeout(() => { 
            btn.innerHTML = origHTML; 
            btn.style.color = '';
            btn.style.borderColor = '';
        }, 1500);
    }).catch(err => {
        alert('Failed to copy: ' + err);
    });
};
"""
        js = js + "\n" + copy_fn

    # 2. Add runCheckPermsWorkflow
    if 'window.runCheckPermsWorkflow' not in js:
        perms_fn = """
window.runCheckPermsWorkflow = async function() {
    const out = document.getElementById('wf-out-perms');
    const btn = document.getElementById('btn-run-check-perms');
    btn.disabled = true;
    btn.innerHTML = 'Running...';
    
    out.textContent = `[${new Date().toLocaleTimeString()}] Fetching /v1.0/myorg/availableFeatures ...\\n\\n`;
    
    try {
        const res = await fetch('/api/proxy', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ endpoint: '/v1.0/myorg/availableFeatures', method: 'GET' })
        });
        
        if(!res.ok) {
            out.textContent += `Error: ${res.status} ${res.statusText}\\n`;
            btn.disabled = false;
            btn.innerHTML = 'Run Check';
            return;
        }
        
        const data = await res.json();
        out.textContent += JSON.stringify(data, null, 2) + '\\n\\n';
        out.textContent += `[Success] Permission check complete.`;
    } catch (e) {
        out.textContent += `Exception: ${e.message}\\n`;
    } finally {
        btn.disabled = false;
        btn.innerHTML = 'Run Check';
    }
};
"""
        js = js + "\n" + perms_fn

    # 3. Add to wfSelector
    if "val === 'check_permissions'" not in js:
        js = js.replace(
            "document.getElementById('wf-config-report_view_count').style.display = 'none';",
            "document.getElementById('wf-config-report_view_count').style.display = 'none';\n            document.getElementById('wf-config-check_permissions').style.display = 'none';"
        )
        js = js.replace(
            "} else if (val === 'export_visual') {",
            "} else if (val === 'check_permissions') {\n                document.getElementById('wf-config-check_permissions').style.display = 'block';\n            } else if (val === 'export_visual') {"
        )

    # 4. Remove copyWfConsole if it still exists
    js = re.sub(r'window\.copyWfConsole\s*=\s*function\(.*?\)\s*\{.*?\};\n', '', js, flags=re.DOTALL)

    with open(SCRIPT_FILE, 'w', encoding='utf-8') as f:
        f.write(js)

if __name__ == '__main__':
    patch_index()
    patch_style()
    patch_script()
    print("Done")
