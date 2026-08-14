with open('static/index.html', 'r', encoding='utf-8') as f:
    content = f.read()

bad_html = '''                <div style="margin-bottom: 15px; display: flex; justify-content: space-between; align-items: center;">
                    <p style="margin: 0; color: var(--text-secondary);">Select tests to run and click Execute.</p>
                    <div>
                        <button type="button" id="btn-harness-toggle-all" class="btn-cancel">全选/取消 (Toggle All)</button>
                    </div>
                </div>'''

good_html = '''                <div style="margin-bottom: 15px; display: flex; justify-content: space-between; align-items: center;">
                    <p style="margin: 0; color: var(--text-secondary);">Select tests to run and click Execute.</p>
                    <div style="display: flex; gap: 8px;">
                        <button type="button" id="btn-harness-select-all" class="btn-action-primary" style="padding: 4px 10px; font-size: 0.85rem; height: auto;">全选 (All)</button>
                        <button type="button" id="btn-harness-clear-all" class="btn-cancel" style="padding: 4px 10px; font-size: 0.85rem; height: auto;">清空 (Clear)</button>
                    </div>
                </div>'''

if bad_html in content:
    content = content.replace(bad_html, good_html)
    with open('static/index.html', 'w', encoding='utf-8') as f:
        f.write(content)
    print('Fixed html buttons')
else:
    print('bad_html not found')
