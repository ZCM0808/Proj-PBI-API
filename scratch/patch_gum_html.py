import re

with open('static/index.html', 'r', encoding='utf-8') as f:
    html = f.read()

# Add option to selector
opt_target = """<option value="smart_pipeline">Smart DataOps Pipeline (Auto Bind/Scan/Check)</option>"""
opt_replacement = """<option value="smart_pipeline">Smart DataOps Pipeline (Auto Bind/Scan/Check)</option>
                        <option value="global_user_manager">Global Workspace Permissions Manager</option>"""
html = html.replace(opt_target, opt_replacement)

# Add pane HTML right before wf-config-smart_pipeline
pane_target = """                <div id="wf-config-smart_pipeline" class="wf-config-pane" style="display: none;">"""

pane_replacement = """                <!-- Global User Manager Pane -->
                <div id="wf-config-global_user_manager" class="wf-config-pane" style="display: none;">
                    <div style="display: flex; gap: 8px; margin-bottom: 12px; align-items: flex-end;">
                        <div style="flex: 1;">
                            <label style="font-size: 0.85rem; color: var(--text-secondary);">"?s? / Filter</label>
                            <input type="text" id="wf-gum-search" class="wf-input" placeholder="Search by user email, name or workspace..." onkeyup="if(window.filterGumTable) window.filterGumTable()">
                        </div>
                    </div>
                    
                    <div id="wf-gum-containers" style="display: flex; flex-direction: column; gap: 12px;">
                        <!-- Logs Section -->
                        <div style="position: relative;">
                            <div style="font-size: 0.75rem; font-weight: bold; margin-bottom: 4px; color: var(--text-secondary); display: flex; align-items: center; cursor: pointer; user-select: none; width: fit-content;" onclick="window.toggleConsole('wf-out-gum-logs')">
                                <svg id="wf-out-gum-logs-chevron" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="margin-right: 4px; transition: transform 0.2s; transform: rotate(0deg);"><polyline points="9 18 15 12 9 6"></polyline></svg>Execution Logs
                            </div>
                            <div id="wf-out-gum-logs" class="wf-console collapsed-console" style="min-height: 100px; padding-bottom: 20px;">Ready to scan all workspaces...</div>
                        </div>
                        
                        <!-- Table Section -->
                        <div style="position: relative;">
                            <div style="font-size: 0.75rem; font-weight: bold; margin-bottom: 4px; color: var(--text-secondary); display: flex; justify-content: space-between; align-items: center;">
                                <span>Global Permissions Table</span>
                                <span id="wf-gum-stats" style="color: var(--accent); font-weight: normal;"></span>
                            </div>
                            <button type="button" class="wf-copy-btn" onclick="window.handleCopyAction(this, document.getElementById('wf-out-gum-table').innerText)" title="Copy Table" style="top: 24px; right: 8px; z-index: 10;"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg></button>
                            <div id="wf-out-gum-table" class="wf-console" style="min-height: 250px; max-height: 400px; padding: 0 12px; white-space: normal;">Waiting for scan...</div>
                        </div>
                    </div>
                </div>

                <div id="wf-config-smart_pipeline" class="wf-config-pane" style="display: none;">"""

html = html.replace(pane_target, pane_replacement)

# Add custom edit modal to index.html
edit_modal = """
    <!-- Edit User Permission Modal -->
    <div id="gum-edit-modal" class="modal-overlay" style="display: none; z-index: 20000;">
        <div class="modal-content glass-panel" style="max-width: 400px; width: 90%;">
            <div class="modal-header">
                <h3 style="font-size: 1.05rem;">Edit Workspace Access</h3>
                <button type="button" class="close-btn" onclick="document.getElementById('gum-edit-modal').style.display='none'"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 6L6 18M6 6l12 12"></path></svg></button>
            </div>
            <div class="modal-body" style="padding: 16px;">
                <input type="hidden" id="gum-edit-ws-id">
                <input type="hidden" id="gum-edit-principal-type">
                
                <div style="margin-bottom: 12px;">
                    <label style="font-size: 0.85rem; color: var(--text-secondary); display: block; margin-bottom: 4px;">Workspace</label>
                    <input type="text" id="gum-edit-ws-name" class="wf-input" disabled style="opacity: 0.7;">
                </div>
                
                <div style="margin-bottom: 12px;">
                    <label style="font-size: 0.85rem; color: var(--text-secondary); display: block; margin-bottom: 4px;">User / Principal</label>
                    <input type="text" id="gum-edit-identifier" class="wf-input" disabled style="opacity: 0.7;">
                </div>
                
                <div style="margin-bottom: 16px;">
                    <label style="font-size: 0.85rem; color: var(--text-secondary); display: block; margin-bottom: 4px;">Access Right (Role)</label>
                    <select id="gum-edit-role" class="wf-input">
                        <option value="Admin">Admin</option>
                        <option value="Member">Member</option>
                        <option value="Contributor">Contributor</option>
                        <option value="Viewer">Viewer</option>
                    </select>
                </div>
                
                <div style="display: flex; gap: 8px; justify-content: flex-end;">
                    <button type="button" class="btn-cancel" onclick="document.getElementById('gum-edit-modal').style.display='none'">Cancel</button>
                    <button type="button" class="btn-action-primary" onclick="if(window.submitGumEdit) window.submitGumEdit()">Save Changes</button>
                </div>
            </div>
        </div>
    </div>
"""
# insert before the final script tags
html = html.replace('    <script src="https://cdn.jsdelivr.net/npm/marked/marked.min.js"></script>', edit_modal + '\n    <script src="https://cdn.jsdelivr.net/npm/marked/marked.min.js"></script>')

html = re.sub(r'v137', 'v138', html)

with open('static/index.html', 'w', encoding='utf-8') as f:
    f.write(html)

print("index.html patched")
