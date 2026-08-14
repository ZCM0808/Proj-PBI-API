with open('static/index.html', 'r', encoding='utf-8') as f:
    content = f.read()

content = content.replace('<button id="btn-harness-toggle-all" class="btn-cancel">', '<button type="button" id="btn-harness-toggle-all" class="btn-cancel">')

with open('static/index.html', 'w', encoding='utf-8') as f:
    f.write(content)
print('Added type=button to toggle all button')
