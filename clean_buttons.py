with open('static/index.html', 'r', encoding='utf-8') as f:
    content = f.read()

# Fix settings modal buttons
content = content.replace(
    'id="export-local-btn" class="btn-cancel" style="background: var(--input-bg); color: var(--text-secondary); border: 1px solid var(--panel-border); border-radius: 4px; padding: 4px 8px; font-size: 0.8rem; cursor: pointer;"',
    'id="export-local-btn" class="btn-cancel"'
)
content = content.replace(
    'id="import-local-btn" class="btn-cancel" style="background: var(--input-bg); color: var(--text-secondary); border: 1px solid var(--panel-border); border-radius: 4px; padding: 4px 8px; font-size: 0.8rem; cursor: pointer;"',
    'id="import-local-btn" class="btn-cancel"'
)
content = content.replace(
    'id="save-settings-btn" class="btn-action-primary" style="font-size: 0.8rem; border: 1px solid transparent; padding: 4px 12px;"',
    'id="save-settings-btn" class="btn-action-primary"'
)

# Fix test harness toggle button
content = content.replace(
    'id="btn-harness-toggle-all" class="btn-cancel" style="padding: 4px 8px; font-size: 0.8rem;"',
    'id="btn-harness-toggle-all" class="btn-cancel"'
)

with open('static/index.html', 'w', encoding='utf-8') as f:
    f.write(content)
print('Cleaned inline styles from buttons in index.html')
