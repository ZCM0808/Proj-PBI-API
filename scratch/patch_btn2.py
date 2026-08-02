import re

with open('static/style.css', 'r', encoding='utf-8') as f:
    css = f.read()

target = """/* Hide copy button when console is collapsed */
.collapsed-console + .wf-copy-btn,
.collapsed-console ~ .wf-copy-btn {"""

replacement = """/* Hide copy button when console is collapsed */
div:has(> .collapsed-console) > .wf-copy-btn,
.collapsed-console + .wf-copy-btn,
.collapsed-console ~ .wf-copy-btn {"""

if target in css:
    css = css.replace(target, replacement)
    
    # bump version in index.html
    with open('static/index.html', 'r', encoding='utf-8') as f:
        html = f.read()
    html = re.sub(r'v136', 'v137', html)
    with open('static/index.html', 'w', encoding='utf-8') as f:
        f.write(html)
        
    with open('static/style.css', 'w', encoding='utf-8') as f:
        f.write(css)
    print("Patched successfully")
else:
    print("Target not found")
