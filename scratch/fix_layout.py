import re

html_path = 'static/index.html'
with open(html_path, 'r', encoding='utf-8') as f:
    html = f.read()

# The stray block is:
#                     <div class="wf-steps-container" style="display: flex; flex-direction: column; gap: 12px; margin-top: 8px;">
#                         <div class="wf-step active" id="wf-ds-step-1">
#                             <div class="wf-step-header">
#                                 <span class="wf-step-title">Step 1: Execute DAX Query (executeQueries)</span>
#                             </div>
#                             <div style="position: relative;">
#                                 <pre id="wf-out-ds-step1" class="wf-console">Ready to query...</pre>
#                             </div>
#                         </div>
#         
#
#                 <div id="wf-export-wrapper">

pattern = r'\s*<div class="wf-steps-container" style="display: flex; flex-direction: column; gap: 12px; margin-top: 8px;">\s*<div class="wf-step active" id="wf-ds-step-1">\s*<div class="wf-step-header">\s*<span class="wf-step-title">Step 1: Execute DAX Query \(executeQueries\)</span>\s*</div>\s*<div style="position: relative;">\s*<pre id="wf-out-ds-step1" class="wf-console">Ready to query\.\.\.</pre>\s*</div>\s*</div>\s*</div>\s*<div id="wf-export-wrapper">'

# But wait, there is no closing </div> for wf-config-export_visual before wf-export-wrapper either?
# Let's check the original index.html structure for export_visual.
# It should end with </div> (closing wf-config-export_visual) before <div id="wf-export-wrapper">.

# Let's write a targeted regex to fix it.
fix_pattern = re.compile(
    r'\s*<div class="wf-steps-container" style="display: flex; flex-direction: column; gap: 12px; margin-top: 8px;">'
    r'\s*<div class="wf-step active" id="wf-ds-step-1">'
    r'\s*<div class="wf-step-header">'
    r'\s*<span class="wf-step-title">Step 1: Execute DAX Query \(executeQueries\)</span>'
    r'\s*</div>'
    r'\s*<div style="position: relative;">'
    r'\s*<pre id="wf-out-ds-step1" class="wf-console">Ready to query\.\.\.</pre>'
    r'\s*</div>'
    r'\s*</div>'
    r'\s*</div>'
)

if fix_pattern.search(html):
    html = fix_pattern.sub('', html)
    # We must ensure there is a closing div for wf-config-export_visual before wf-export-wrapper.
    # Let's search for wf-export-wrapper and insert a closing div if needed.
    # Wait, the structure was:
    # <div id="wf-config-export_visual" class="wf-config-pane" style="display: none;">
    #   ...
    #   <div class="wf-steps-container"> ... </div>
    # </div> (MISSING!)
    # <div id="wf-export-wrapper">
    
    html = html.replace('<div id="wf-export-wrapper">', '</div>\n                <div id="wf-export-wrapper">')

with open(html_path, 'w', encoding='utf-8') as f:
    f.write(html)

print("Fixed stray HTML block.")
