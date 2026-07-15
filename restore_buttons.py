import re

with open('static/index.html', 'r', encoding='utf-8') as f:
    html = f.read()

actions_regex = r'\s*<div style="border-left: 1px solid rgba\(255,255,255,0\.1\); height: 16px; margin: 0 4px;"></div>\s*(<div class="request-actions".*?</div>\s*</div>\s*</div>\s*</div>)'

match = re.search(actions_regex, html, flags=re.DOTALL)
if match:
    full_str = match.group(0)
    actions_html = match.group(1)
    
    # remove from input-group row
    html = html.replace(full_str, '')
    
    # insert back into right-panel-category-container
    insert_target = '<div style="flex: 1;"><span id="right-panel-category-badge"></span></div>'
    replacement = insert_target + '\n                    ' + actions_html
    html = html.replace(insert_target, replacement)

    with open('static/index.html', 'w', encoding='utf-8') as f:
        f.write(html)
