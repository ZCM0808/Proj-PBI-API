with open('static/script.js', 'r', encoding='utf-8') as f:
    content = f.read()

# Fix Custom Alert
content = content.replace(
    '<button class=\"btn-action-secondary\" id=\"custom-alert-ok-btn\" style=\"padding: 0.5rem 1.25rem;\">',
    '<button class=\"btn-action-primary\" id=\"custom-alert-ok-btn\">'
)

# Fix Custom Confirm
content = content.replace(
    '<button class=\"btn-action-secondary\" id=\"custom-confirm-cancel-btn\" style=\"padding: 0.5rem 1.25rem;\">',
    '<button class=\"btn-cancel\" id=\"custom-confirm-cancel-btn\">'
)
content = content.replace(
    '<button class=\"btn-action-primary\" id=\"custom-confirm-ok-btn\" style=\"padding: 0.5rem 1.25rem; border: none; background: var(--accent); color: var(--accent-text);\">',
    '<button class=\"btn-action-primary\" id=\"custom-confirm-ok-btn\">'
)

# Fix Custom Prompt
content = content.replace(
    '<button class=\"btn-action-secondary\" id=\"custom-prompt-cancel-btn\" style=\"padding: 0.5rem 1.25rem;\">Cancel</button><button class=\"btn-action-primary\" id=\"custom-prompt-ok-btn\" style=\"padding: 0.5rem 1.25rem; border: none; background: var(--accent); color: var(--accent-text);\">OK</button>',
    '<button class=\"btn-cancel\" id=\"custom-prompt-cancel-btn\">Cancel</button><button class=\"btn-action-primary\" id=\"custom-prompt-ok-btn\">OK</button>'
)

# Fix Dialog OK
content = content.replace(
    '<button class=\"btn-action-secondary\" id=\"custom-dialog-ok-btn\" style=\"padding: 0.5rem 1.25rem;\">',
    '<button class=\"btn-action-primary\" id=\"custom-dialog-ok-btn\">'
)

with open('static/script.js', 'w', encoding='utf-8') as f:
    f.write(content)
print('Fixed custom dialog buttons')
