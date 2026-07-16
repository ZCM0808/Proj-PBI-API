import re

html = open('static/index.html', 'r', encoding='utf-8').read()

# Find request-actions div
actions_match = re.search(r'<div class="request-actions".*?<!-- Env Identity -->', html, flags=re.DOTALL)
if actions_match:
    actions_html = actions_match.group(0).replace('<!-- Env Identity -->', '').strip()
    html = html.replace(actions_html, '')
    
    # insert above input-group row
    insert_target = '</div>\n                </div>\n\n                <div class="input-group row">'
    replacement = f'''</div>
                </div>

                <div id="right-panel-category-container" style="display: none; justify-content: space-between; align-items: flex-end; margin-bottom: 6px; min-height: 24px;">
                    <div style="flex: 1;"><span id="right-panel-category-badge"></span></div>
                    {actions_html}
                </div>

                <div class="input-group row">'''
    html = html.replace(insert_target, replacement)

html = html.replace('script.js?v=20260715_v15', 'script.js?v=20260715_v17')

with open('static/index.html', 'w', encoding='utf-8') as f:
    f.write(html)
