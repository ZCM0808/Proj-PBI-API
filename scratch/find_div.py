import re

with open('static/index.html', 'r', encoding='utf-8') as f:
    html = f.read()

start = html.find('id="workflow-modal-content"')
end = html.find('id="settings-modal"')
segment = html[start:end]

lines = segment.split('\n')
stack = []
for i, line in enumerate(lines):
    divs = line.count('<div')
    end_divs = line.count('</div')
    if divs - end_divs != 0:
        stack.append(divs - end_divs)
    
    total = sum(stack)
    if total < 0:
        print(f"Stack went negative at line {i} (relative to start):")
        print(line)
        print("Previous lines:")
        for j in range(max(0, i-5), i):
            print(lines[j])
        break
