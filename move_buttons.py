import re

with open('static/index.html', 'r', encoding='utf-8') as f:
    html = f.read()

# Extract request-actions
actions_match = re.search(r'<div class="request-actions".*?</div>\s*</div>\s*</div>\s*</div>', html, flags=re.DOTALL)
if actions_match:
    actions_html = actions_match.group(0)
    # Remove from right-panel-category-container
    html = html.replace(actions_html, '')
    
    # Clean up right-panel-category-container if needed
    # We want to keep right-panel-category-badge but remove empty spaces
    
    # Insert actions_html into input-group row, right after send-btn
    send_btn_regex = r'(<button id="send-btn".*?</button>)'
    
    def replacer(match):
        return match.group(1) + '\n                    <div style="border-left: 1px solid rgba(255,255,255,0.1); height: 16px; margin: 0 4px;"></div>\n                    ' + actions_html

    html = re.sub(send_btn_regex, replacer, html, flags=re.DOTALL)

with open('static/index.html', 'w', encoding='utf-8') as f:
    f.write(html)
