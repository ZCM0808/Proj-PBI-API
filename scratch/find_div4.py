import re

with open('static/index.html', 'r', encoding='utf-8') as f:
    html = f.read()

start = html.find('id="workflow-modal-content"')
end = html.find('id="settings-modal"')
segment = html[start:end]

lines = segment.split('\n')
div_stack = []
for i, line in enumerate(lines):
    for match in re.finditer(r'<(div[^>]*)>|<\/div>', line):
        tag = match.group(0)
        if tag.startswith('<div'):
            div_stack.append((i, tag))
        else:
            if div_stack:
                div_stack.pop()
            else:
                print(f"EXTRA CLOSING DIV AT LINE {i}: {line}")

print("Unclosed divs at end:")
for item in div_stack:
    print(f"Line {item[0]}: {item[1]}")
