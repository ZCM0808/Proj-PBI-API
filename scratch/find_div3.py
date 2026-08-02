import re

with open('static/index.html', 'r', encoding='utf-8') as f:
    html = f.read()

start = html.find('id="workflow-modal-content"')
end = html.find('id="settings-modal"')
segment = html[start:end]

lines = segment.split('\n')
stack = 1
with open('scratch/trace.txt', 'w', encoding='utf-8') as out:
    for i, line in enumerate(lines):
        divs = line.count('<div')
        end_divs = line.count('</div')
        stack += divs - end_divs
        out.write(f"{i}: {stack} | {line.strip()}\n")
