import re

css_append = """
/* Hide copy button when console is collapsed */
.collapsed-console + .wf-copy-btn,
.collapsed-console ~ .wf-copy-btn {
    display: none !important;
    opacity: 0 !important;
    pointer-events: none !important;
}
"""

with open('static/style.css', 'a', encoding='utf-8') as f:
    f.write(css_append)

with open('static/index.html', 'r', encoding='utf-8') as f:
    html = f.read()

html = re.sub(r'v133', 'v134', html)

with open('static/index.html', 'w', encoding='utf-8') as f:
    f.write(html)

print("done")
