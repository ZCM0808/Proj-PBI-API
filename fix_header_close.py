import re

with open('static/index.html', 'r', encoding='utf-8') as f:
    content = f.read()

standard_svg = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 6L6 18M6 6l12 12"></path></svg>'

content = content.replace(
    '<button class="close-modal" title="Close Modal">&times;</button>',
    f'<button class="close-btn close-modal" title="Close">{standard_svg}</button>'
)

with open('static/index.html', 'w', encoding='utf-8') as f:
    f.write(content)
print('Fixed harness modal header close button')
