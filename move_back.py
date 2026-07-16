import re

with open('static/index.html', 'r', encoding='utf-8') as f:
    html = f.read()

# 1. Extract request-actions
actions_regex = r'(<div class="request-actions".*?</div>\s*</div>\s*</div>\s*</div>)'
match = re.search(actions_regex, html, flags=re.DOTALL)
if match:
    actions_html = match.group(1)
    # Remove it from the header
    html = html.replace(actions_html, '')
else:
    print("Could not find request-actions")
    # try another regex
    actions_regex_2 = r'(<div class="request-actions".*?</div>\s*</div>\s*</div>)'
    match = re.search(actions_regex_2, html, flags=re.DOTALL)
    if match:
        actions_html = match.group(1)
        html = html.replace(actions_html, '')
    else:
        # actually let's just find by string matching
        pass

# Let's use strict string finding
actions_start = html.find('<div class="request-actions"')
def get_balanced_end(text, start_idx):
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
                return idx
        else:
            idx += 1
    return -1

actions_end = get_balanced_end(html, actions_start)
actions_html = html[actions_start:actions_end]

# remove from current location
html = html[:actions_start] + html[actions_end:]

# insert into right-panel-category-container
cat_start = html.find('<span id="right-panel-category-badge"></span></div>')
insert_pos = cat_start + len('<span id="right-panel-category-badge"></span></div>')

html = html[:insert_pos] + '\n                    ' + actions_html + html[insert_pos:]

html = html.replace('script.js?v=20260715_v19', 'script.js?v=20260715_v20')

with open('static/index.html', 'w', encoding='utf-8') as f:
    f.write(html)
print("Done")
