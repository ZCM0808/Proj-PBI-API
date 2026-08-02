import re

with open('static/index.html', 'r', encoding='utf-8') as f:
    html = f.read()

start = html.find('id="workflow-modal-content"')
end = html.find('id="settings-modal"')
segment = html[start:end]

lines = segment.split('\n')
stack = 1  # start with 1 because id="workflow-modal-content" is on line 0 but we want to track it
for i, line in enumerate(lines):
    # wait, line 0 has <div class="modal-content...
    divs = line.count('<div')
    end_divs = line.count('</div')
    stack += divs - end_divs
    print(f"{i}: {stack} | {line.strip()}")
