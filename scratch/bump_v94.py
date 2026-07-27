import re
with open('D:/ZCM/Proj-PBI-API/static/index.html', 'r', encoding='utf-8') as f:
    html = f.read()
html = re.sub(r'style\.css\?v=[^"]+', 'style.css?v=20260722_v94', html)
html = re.sub(r'script\.js\?v=[^"]+', 'script.js?v=20260722_v94', html)
with open('D:/ZCM/Proj-PBI-API/static/index.html', 'w', encoding='utf-8') as f:
    f.write(html)
print('v94 done')
