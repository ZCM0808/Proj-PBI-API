import re

with open('static/index.html', 'r', encoding='utf-8') as f:
    html = f.read()

# Find the workflow-modal overlay
start = html.find('id="workflow-modal"')
end = html.find('id="settings-modal"')
segment = html[start:end]

print("divs:", segment.count('<div'))
print("/divs:", segment.count('</div'))
