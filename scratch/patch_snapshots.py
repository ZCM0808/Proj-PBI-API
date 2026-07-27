import os
import re

INDEX_FILE = 'static/index.html'
STYLE_FILE = 'static/style.css'
SCRIPT_FILE = 'static/script.js'

def patch_index():
    with open(INDEX_FILE, 'r', encoding='utf-8') as f:
        content = f.read()
    
    if 'auth-snapshots-container' in content:
        print("index.html already patched.")
        return

    # Add HTML block for Snapshots
    html_block = """
                    <!-- Auth Snapshots UI -->
                    <div class="auth-snapshots-container" style="margin-bottom: 12px; padding-bottom: 8px; border-bottom: 1px dashed var(--panel-border);">
                        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                            <h4 style="font-weight: bold; font-size: 0.75rem; color: var(--text-primary); margin: 0;">Auth Profiles (配置快照)</h4>
                            <button type="button" id="btn-save-snapshot" class="icon-btn" title="Save current config as new snapshot" style="padding: 2px 8px; border-radius: 12px; font-size: 0.7rem; border: 1px solid var(--accent); color: var(--accent); display: flex; align-items: center; gap: 4px; font-weight: 500;">
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path><polyline points="17 21 17 13 7 13 7 21"></polyline><polyline points="7 3 7 8 15 8"></polyline></svg>
                                存为快照
                            </button>
                        </div>
                        <div id="snapshot-chips-container" style="display: flex; gap: 8px; overflow-x: auto; padding-bottom: 4px;" class="hide-scrollbar">
                            <!-- Chips dynamically populated here -->
                        </div>
                    </div>
"""
    
    target_str = '<div class="form-group" style="margin-bottom: 12px; padding: 8px; background: rgba(0,0,0,0.15); border-radius: 4px;">'
    content = content.replace(target_str, html_block + "\n                        " + target_str)
    
    # Cache busting in script and css links if not already modified
    content = re.sub(r'style\.css\?v=[\w_]+', 'style.css?v=20260727_v39_snapshots', content)
    
    # Append snapshots.js to index.html before body ends
    if 'snapshots.js' not in content:
        content = content.replace('</body>', '    <script src="/static/snapshots.js?v=20260727_v39_snapshots"></script>\n</body>')
    
    with open(INDEX_FILE, 'w', encoding='utf-8') as f:
        f.write(content)
    print("Patched index.html")

def patch_style():
    with open(STYLE_FILE, 'r', encoding='utf-8') as f:
        content = f.read()
    
    if '.snapshot-chip' in content:
        print("style.css already patched.")
        return

    css_block = """
/* Auth Snapshots */
.snapshot-chip {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 4px 10px;
    border-radius: 16px;
    background: var(--overlay-10);
    border: 1px solid var(--panel-border);
    font-size: 0.75rem;
    color: var(--text-secondary);
    cursor: pointer;
    transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
    white-space: nowrap;
    user-select: none;
    position: relative;
    overflow: hidden;
}
.snapshot-chip:hover {
    background: var(--overlay-15);
    color: var(--text-primary);
}
.snapshot-chip.active {
    background: rgba(167, 139, 250, 0.15);
    border-color: #a78bfa;
    color: #a78bfa;
    box-shadow: 0 0 8px rgba(167, 139, 250, 0.3);
}
.snapshot-chip-name {
    max-width: 120px;
    overflow: hidden;
    text-overflow: ellipsis;
    outline: none;
    transition: color 0.2s;
}
.snapshot-chip-name[contenteditable="true"] {
    background: var(--input-bg);
    padding: 0 4px;
    border-radius: 4px;
    border: 1px solid var(--accent);
    color: var(--text-primary);
    min-width: 50px;
    box-shadow: inset 0 0 4px rgba(0,0,0,0.5);
}
.snapshot-chip-actions {
    display: flex;
    gap: 2px;
    opacity: 0;
    transition: opacity 0.2s;
}
.snapshot-chip:hover .snapshot-chip-actions, .snapshot-chip.active .snapshot-chip-actions {
    opacity: 1;
}
.chip-btn {
    background: transparent;
    border: none;
    color: inherit;
    cursor: pointer;
    padding: 2px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: background 0.2s;
}
.chip-btn:hover {
    background: rgba(255, 255, 255, 0.1);
}
.chip-btn.delete:hover {
    background: rgba(255, 0, 0, 0.2);
    color: #ff4444;
}

/* Micro animation for inputs when switching snapshots */
.snapshot-flash {
    animation: snapshotFlash 0.6s cubic-bezier(0.16, 1, 0.3, 1);
}
@keyframes snapshotFlash {
    0% { background-color: rgba(167, 139, 250, 0.4); transform: scale(1.02); }
    100% { background-color: transparent; transform: scale(1); }
}
"""
    content += "\n" + css_block
    with open(STYLE_FILE, 'w', encoding='utf-8') as f:
        f.write(content)
    print("Patched style.css")

def patch_script():
    with open(SCRIPT_FILE, 'r', encoding='utf-8') as f:
        content = f.read()
    
    if 'window.saveAuthSnapshot' in content:
        print("script.js already patched.")
        return

    # Find the success block of verifySettingsBtn
    target = """                    if (result.success) {
                        if (result.app_name) {"""
    
    replacement = """                    if (result.success) {
                        if (window.saveAuthSnapshot) {
                            window.saveAuthSnapshot(result.app_name || "Auto-Saved Profile");
                        }
                        if (result.app_name) {"""
    
    if target in content:
        content = content.replace(target, replacement)
        with open(SCRIPT_FILE, 'w', encoding='utf-8') as f:
            f.write(content)
        print("Patched script.js")
    else:
        print("Could not find verifySettingsBtn target block in script.js!")

if __name__ == '__main__':
    patch_index()
    patch_style()
    patch_script()
