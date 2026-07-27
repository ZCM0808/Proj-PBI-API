import re

with open('static/index.html', 'r', encoding='utf-8') as f:
    html = f.read()

old_link = '<script src="https://microsoft.github.io/PowerBI-JavaScript/demo/node_modules/powerbi-client/dist/powerbi.js"></script>'
new_link = '<script src="https://cdn.jsdelivr.net/npm/powerbi-client/dist/powerbi.min.js"></script>'

html = html.replace(old_link, new_link)
html = re.sub(r'script\.js\?v=\d+_[a-zA-Z0-9_]+', 'script.js?v=20260726_v33_cdn_fix', html)

with open('static/index.html', 'w', encoding='utf-8') as f:
    f.write(html)
