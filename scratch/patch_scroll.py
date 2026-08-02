import re

with open('static/script.js', 'r', encoding='utf-8') as f:
    js = f.read()

# Remove tableDiv auto-scroll completely
js = re.sub(r'setTimeout\(\(\) => \{ tableDiv\.scrollTop = tableDiv\.scrollHeight; \}, \d+\);', '', js)

# Replace all other .scrollTop = .scrollHeight with the 2/3 logic
# Match pattern like: out.scrollTop = out.scrollHeight;
# We need to capture the variable name before .scrollTop
def replace_scroll(match):
    var_name = match.group(1)
    return f"{var_name}.scrollTop = Math.max(0, {var_name}.scrollHeight - {var_name}.clientHeight * 0.66);"

js = re.sub(r'([a-zA-Z0-9_]+)\.scrollTop\s*=\s*\1\.scrollHeight\s*;', replace_scroll, js)

with open('static/script.js', 'w', encoding='utf-8') as f:
    f.write(js)

with open('static/index.html', 'r', encoding='utf-8') as f:
    html = f.read()

html = re.sub(r'v134', 'v135', html)

with open('static/index.html', 'w', encoding='utf-8') as f:
    f.write(html)

print("done")
