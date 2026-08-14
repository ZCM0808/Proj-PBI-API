with open('static/script.js', 'r', encoding='utf-8') as f:
    content = f.read()

bad_cond = "            if (['INPUT', 'BUTTON', 'TEXTAREA'].includes(e.target.tagName) || e.target.closest('button')) return;"
good_cond = "            if (['INPUT', 'BUTTON', 'TEXTAREA'].includes(e.target.tagName) || e.target.closest('button') || e.target.closest('h1, h2, h3, h4, h5, h6, p, span.copyable')) return;"

if bad_cond in content:
    content = content.replace(bad_cond, good_cond)
    with open('static/script.js', 'w', encoding='utf-8') as f:
        f.write(content)
    print('Fixed text selection in makeDraggable')
else:
    print('Condition not found')
