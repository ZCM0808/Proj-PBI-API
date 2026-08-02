import re

with open('static/index.html', 'r', encoding='utf-8') as f:
    html = f.read()

# Helper to inject title above console
def wrap_console(html, console_id):
    # Check if already wrapped (like wf-out-rvc-logs or wf-out-perms-logs)
    if f"id=\"{console_id}-chevron\"" in html:
        return html
    
    # For wf-out-perms-logs, there is already an Execution Logs title, we replace it
    if console_id == 'wf-out-perms-logs':
        html = html.replace(
            '<div style="font-size: 0.75rem; font-weight: bold; margin-bottom: 4px; color: var(--text-secondary);">Execution Logs</div>',
            f'<div style="font-size: 0.75rem; font-weight: bold; margin-bottom: 4px; color: var(--text-secondary); display: flex; align-items: center; cursor: pointer; user-select: none; width: fit-content;" onclick="window.toggleConsole(\'{console_id}\')"><svg id="{console_id}-chevron" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="margin-right: 4px; transition: transform 0.2s; transform: rotate(0deg);"><polyline points="9 18 15 12 9 6"></polyline></svg>Execution Logs</div>'
        )
        return html
        
    # For wf-out-rvc-logs, it already has toggleRvcLogs, let's update it to use toggleConsole
    if console_id == 'wf-out-rvc-logs':
        html = html.replace('onclick="window.toggleRvcLogs()"', f'onclick="window.toggleConsole(\'{console_id}\')"')
        html = html.replace('id="wf-rvc-logs-chevron"', f'id="{console_id}-chevron"')
        return html
        
    # For others, we inject the toggle before the relative div wrapper
    # The relative div wrapper contains the wf-console and the copy button
    pattern = rf'(<div style="position: relative;">\s*<div id="{console_id}" class="wf-console")'
    replacement = f'<div style="font-size: 0.75rem; font-weight: bold; margin-bottom: 4px; color: var(--text-secondary); display: flex; align-items: center; cursor: pointer; user-select: none; width: fit-content;" onclick="window.toggleConsole(\'{console_id}\')"><svg id="{console_id}-chevron" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="margin-right: 4px; transition: transform 0.2s; transform: rotate(0deg);"><polyline points="9 18 15 12 9 6"></polyline></svg>Execution Logs</div>\n\\1'
    html = re.sub(pattern, replacement, html)
    return html

consoles = [
    'wf-out-ds-step1', 'wf-out-ds-step2', 'wf-out-vis',
    'wf-out-step1', 'wf-out-step2', 'wf-out-step3',
    'wf-out-rvc-logs', 'wf-out-perms-logs'
]

for c in consoles:
    html = wrap_console(html, c)

# Make all consoles collapsed by default
for c in consoles:
    html = re.sub(rf'(<div id="{c}" class="wf-console)(?! collapsed-console)', r'\1 collapsed-console', html)

# Bump version
v_match = re.search(r'style\.css\?v=20260730_v(\d+)', html)
if v_match:
    new_v = int(v_match.group(1)) + 1
    html = re.sub(r'style\.css\?v=20260730_v\d+', f'style.css?v=20260730_v{new_v}', html)
    html = re.sub(r'script\.js\?v=20260730_v\d+', f'script.js?v=20260730_v{new_v}', html)

with open('static/index.html', 'w', encoding='utf-8') as f:
    f.write(html)
print("HTML patched")
