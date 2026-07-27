import re

html_path = 'static/index.html'
with open(html_path, 'r', encoding='utf-8') as f:
    html = f.read()

# 1. Add copy button to Workflow label
pattern_label = r'<label style="color: var\(--text-secondary\); font-weight: bold;">Select Workflow:</label>'
replacement_label = '''<label style="color: var(--text-secondary); font-weight: bold; display: flex; align-items: center; gap: 6px;">
                        Select Workflow:
                        <button type="button" class="icon-btn" style="padding: 2px; width: 20px; height: 20px; border: none; background: transparent; color: var(--text-secondary); cursor: pointer;" onclick="navigator.clipboard.writeText(document.getElementById('wf-selector').options[document.getElementById('wf-selector').selectedIndex].text); this.style.color='var(--success)'; setTimeout(()=>this.style.color='var(--text-secondary)', 1500);" title="Copy Workflow Name">
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
                        </button>
                    </label>'''
if pattern_label in html:
    html = html.replace(pattern_label, replacement_label)
    print("Added copy button to Workflow label.")
else:
    print("Could not find Workflow label.")

# 2. Move pbi-embed-container to be visible
# Find the old hidden one and remove it
pattern_old_embed = r'<div id="pbi-embed-container" style="visibility: hidden; position: absolute; left: -9999px; top: -9999px; width: 1200px; height: 800px;"></div>'
if pattern_old_embed in html:
    html = html.replace(pattern_old_embed, '')
    print("Removed old hidden embed container.")
else:
    print("Could not find old embed container.")

# Insert new one right before the wf-steps-container in export_visual
# Since we can't easily regex for the exact spot, we'll insert it right after the grid closes in wf-config-export_visual.
# The grid ends with </select> \n </div> \n </div>
pattern_grid_end = re.compile(
    r'(<select id="wf-vis-type" class="wf-input">\s*<option value="Summarized">Summarized[^\n]*</option>\s*<option value="Underlying">Underlying[^\n]*</option>\s*</select>\s*</div>\s*</div>)',
    re.DOTALL
)

replacement_grid = r'\1\n                      <div id="pbi-embed-container" style="display: none; width: 100%; height: 350px; border: 1px solid var(--panel-border); border-radius: 6px; margin: 12px 0; background: var(--input-bg);"></div>'
if pattern_grid_end.search(html):
    html = pattern_grid_end.sub(replacement_grid, html)
    print("Inserted new visible embed container.")
else:
    print("Could not find export visual grid end.")

html = html.replace('v20260727_v72_ds_steps_v12', 'v20260727_v73_ds_steps_v13')

with open(html_path, 'w', encoding='utf-8') as f:
    f.write(html)
print("Finished modifying index.html")
