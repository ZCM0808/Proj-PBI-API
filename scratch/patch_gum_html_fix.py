import re

with open('static/index.html', 'r', encoding='utf-8') as f:
    html = f.read()

# Add the Global User Manager pane right before wf-config-smart_pipeline
target = r'<div id="wf-config-smart_pipeline" class="wf-config-pane" style="display: none;">'

replacement = """
                <!-- Global User Manager Pane -->
                <div id="wf-config-global_user_manager" class="wf-config-pane" style="display: none;">
                    <div class="wf-steps-container" style="display: flex; flex-direction: column; gap: 12px; margin-top: 8px;">
                        <div class="wf-step active">
                            <div class="wf-step-header">
                                <span class="wf-step-title">Scan Workspaces & Manage Permissions</span>
                                <button class="btn-action-primary" id="btn-run-gum" style="margin-left: auto; padding: 4px 12px; font-size: 0.8rem;" onclick="if(window.runGlobalUserManager) window.runGlobalUserManager()">Run Scan</button>
                            </div>
                            <div class="wf-step-content" style="display: block; margin-top: 8px;">
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
                        </div>
                    </div>
                </div>

<div id="wf-config-smart_pipeline" class="wf-config-pane" style="display: none;">
"""

if re.search(target, html):
    html = re.sub(target, replacement, html)
    html = re.sub(r'v139', 'v140', html) # Bump version
    with open('static/index.html', 'w', encoding='utf-8') as f:
        f.write(html)
    print("Injected Global User Manager Pane")
else:
    print("Failed to find target")
