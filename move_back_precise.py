with open('static/index.html', 'r', encoding='utf-8') as f:
    html = f.read()

start_idx = html.find('<div class="request-actions"')
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

end_idx = get_balanced_end(html, start_idx)
actions_html = html[start_idx:end_idx]

# Remove from original location
html = html[:start_idx] + html[end_idx:]

# Insert into right-panel-category-container
cat_start = html.find('<span id="right-panel-category-badge"></span></div>')
insert_pos = cat_start + len('<span id="right-panel-category-badge"></span></div>')

html = html[:insert_pos] + '\n                    ' + actions_html + html[insert_pos:]

html = html.replace('script.js?v=20260715_v19', 'script.js?v=20260715_v20')

with open('static/index.html', 'w', encoding='utf-8') as f:
    f.write(html)
print("Done")
