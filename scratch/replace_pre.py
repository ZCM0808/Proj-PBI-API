import re

with open('static/index.html', 'r', encoding='utf-8') as f:
    html = f.read()

# Replace <pre> with <div> for the consoles
html = re.sub(r'<pre (id="wf-out-ds-step1".*?)</pre>', r'<div \1</div>', html, flags=re.DOTALL)
html = re.sub(r'<pre (id="wf-out-ds-step2".*?)</pre>', r'<div \1</div>', html, flags=re.DOTALL)

with open('static/index.html', 'w', encoding='utf-8') as f:
    f.write(html)
print("Updated index.html")
