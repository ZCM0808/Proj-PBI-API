import re

with open('static/index.html', 'r', encoding='utf-8') as f:
    html = f.read()

target = """                <!-- Global User Manager Pane -->
                <div id="wf-config-global_user_manager" class="wf-config-pane" style="display: none;">
                    <div style="display: flex; gap: 8px; margin-bottom: 12px; align-items: flex-end;">"""

replacement = """                <!-- Global User Manager Pane -->
                <div id="wf-config-global_user_manager" class="wf-config-pane" style="display: none;">
                    <div class="wf-steps-container" style="display: flex; flex-direction: column; gap: 12px; margin-top: 8px;">
                        <div class="wf-step active">
                            <div class="wf-step-header">
                                <span class="wf-step-title">Scan Workspaces & Manage Permissions</span>
                                <button class="btn-action-primary" id="btn-run-gum" style="margin-left: auto; padding: 4px 12px; font-size: 0.8rem;" onclick="if(window.runGlobalUserManager) window.runGlobalUserManager()">Run Scan</button>
                            </div>
                            <div class="wf-step-content" style="display: block; margin-top: 8px;">
                                <div style="display: flex; gap: 8px; margin-bottom: 12px; align-items: flex-end;">"""

if target in html:
    html = html.replace(target, replacement)
    
    # Need to close the new tags correctly
    # Find the end of wf-config-global_user_manager
    end_target = """                    </div>
                </div>

                <div id="wf-config-smart_pipeline" class="wf-config-pane" style="display: none;">"""
                
    end_replacement = """                    </div>
                            </div>
                        </div>
                    </div>
                </div>

                <div id="wf-config-smart_pipeline" class="wf-config-pane" style="display: none;">"""
                
    if end_target in html:
        html = html.replace(end_target, end_replacement)
        
        # bump version
        html = re.sub(r'v138', 'v139', html)
        
        with open('static/index.html', 'w', encoding='utf-8') as f:
            f.write(html)
        print("HTML patched successfully")
    else:
        print("End target not found")
else:
    print("Start target not found")
