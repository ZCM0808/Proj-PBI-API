import re

with open('static/style.css', 'r', encoding='utf-8') as f:
    css = f.read()

# Add collapsed class
if '.collapsed-console' not in css:
    css += """
.wf-console.collapsed-console {
    height: 0px !important;
    min-height: 0px !important;
    max-height: 0px !important;
    padding-top: 0px !important;
    padding-bottom: 0px !important;
    border-top-width: 0px !important;
    border-bottom-width: 0px !important;
    opacity: 0 !important;
    margin-top: 0px !important;
    margin-bottom: 0px !important;
    overflow: hidden !important;
}
"""
    # Make wf-console transition
    css = css.replace('.wf-console {', '.wf-console { transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);')

with open('static/style.css', 'w', encoding='utf-8') as f:
    f.write(css)

print("CSS updated")
