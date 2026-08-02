import re

with open('static/index.html', 'r', encoding='utf-8') as f:
    html = f.read()

start = html.find('id="workflow-modal-content"')
end = html.find('<!-- Settings Modal -->')
segment = html[start:end]

lines = segment.split('\n')
c = 1
for i, l in enumerate(lines):
    opens = len(re.findall(r'<div', l))
    closes = len(re.findall(r'</div', l))
    c += opens - closes
    if opens != closes:
        print(f'L{i}: {c} (+{opens}/-{closes}) {l.strip()}')
