import re

with open('static/index.html', 'r', encoding='utf-8') as f:
    html = f.read()

# Match the request-actions div precisely
# We know it starts with <div class="request-actions" and ends before </div>\n                </div>\n\n                <div class="input-group row">
match = re.search(r'(<div class="request-actions".*?</div>\s*</div>)', html, flags=re.DOTALL)
if match:
    actions_outer = match.group(1) # This includes the closing </div> for request-actions, AND wait, the regex above matches the first </div>
    pass

# A safer approach: I will just find the exact string of request-actions and move it.
start_str = '<div class="request-actions" style="display: flex; align-items: center; gap: 8px;">'
end_str = '                    </div>\n                </div>\n                </div>\n\n                <div class="input-group row">'

# Actually, the file has:
#                     <div class="request-actions" style="display: flex; align-items: center; gap: 8px;">
#                         <div style="position: relative;">
#                             <button id="history-request-btn" ...

# Let's extract from <div class="request-actions" down to its closing </div>
# In the current file, request-actions ends at line 207 (</div>).
# Line 208 is </div> (closes right-panel-category-container)
# Line 209 is </div> (extra? NO, it's just two closing divs)
# Wait, my previous view showed:
# 207:                     </div>
# 208:                 </div>
# 209:                 </div>

# We can just extract it by finding <div class="request-actions" and counting divs.
def get_balanced_div(text, start_idx):
    idx = start_idx
    count = 0
    while idx < len(text):
        if text[idx:idx+4] == '<div':
            count += 1
            idx += 4
        elif text[idx:idx+5] == '</div':
            count -= 1
            idx += 5
            if count == 0:
                # Add the > and return
                return text[start_idx:text.find('>', idx) + 1]
        else:
            idx += 1
    return ""

start_idx = html.find('<div class="request-actions"')
actions_html = get_balanced_div(html, start_idx)

# Remove actions_html from its current place
html = html.replace(actions_html, '')

# Now find where to insert it: after send-btn
send_btn_end = html.find('</button>\n                </div>\n\n                <div class="body-editor-container">')

# Wait, the closing of send-btn is:
#                     <button id="send-btn" class="btn-primary">
#                         <span>Send Request</span>
#                         <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z"/></svg>
#                     </button>

# Let's just use regex to insert after send-btn
html = re.sub(
    r'(<button id="send-btn".*?</button>)', 
    r'\1\n                    <div style="border-left: 1px solid rgba(255,255,255,0.1); height: 16px; margin: 0 4px;"></div>\n                    ' + actions_html.replace('\\', '\\\\'), 
    html, 
    flags=re.DOTALL
)

with open('static/index.html', 'w', encoding='utf-8') as f:
    f.write(html)
