with open('static/index.html', 'r', encoding='utf-8') as f:
    content = f.read()

bad_html = '<p style="margin: 0; color: var(--text-secondary);">Select tests to run and click Execute.</p>'
good_html = '<p style="margin: 0; color: var(--text-secondary);">Select tests to run and click Execute. <span id="harness-stats" style="margin-left: 10px; font-weight: 600; color: var(--accent);">已选: 0 / 总计: 0</span></p>'

if bad_html in content:
    content = content.replace(bad_html, good_html)
    with open('static/index.html', 'w', encoding='utf-8') as f:
        f.write(content)
    print('Updated index.html with stats span')
else:
    print('bad_html not found')
