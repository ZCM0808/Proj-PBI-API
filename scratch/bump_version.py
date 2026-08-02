import re
with open('static/index.html', 'r', encoding='utf-8') as f:
    html = f.read()

html = re.sub(r'style\.css\?v=[^"]+', 'style.css?v=20260730_v128', html)
html = re.sub(r'script\.js\?v=[^"]+', 'script.js?v=20260730_v128', html)

with open('static/index.html', 'w', encoding='utf-8') as f:
    f.write(html)
print("Bumped version")
