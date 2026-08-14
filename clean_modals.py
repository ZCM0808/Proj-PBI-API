import re

with open('static/index.html', 'r', encoding='utf-8') as f:
    html = f.read()

# Fix modal-overlay styles
html = re.sub(r'class="(modal-overlay[^"]*)" style="[^"]*"', r'class="\1" style="display: none;"', html)

# Fix modal-content styles
html = re.sub(r'class="(modal-content[^"]*)" style="[^"]*"', r'class="\1"', html)

# Fix confirm-modal-overlay
html = re.sub(r'class="(confirm-modal-overlay[^"]*)" style="[^"]*"', r'class="\1" style="display: none;"', html)

with open('static/index.html', 'w', encoding='utf-8') as f:
    f.write(html)
print('Cleaned inline styles!')
