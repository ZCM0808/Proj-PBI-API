
with open('static/script.js', 'r', encoding='utf-8') as f:
    content = f.read()

toggle_fn = """
    window.isAutoApprove = false;
    window.toggleAutoApprove = function() {
        window.isAutoApprove = !window.isAutoApprove;
        const btn = document.getElementById('ai-auto-approve-btn');
        const icon = document.getElementById('auto-approve-icon');
        const text = document.getElementById('auto-approve-text');
        if (window.isAutoApprove) {
            btn.style.borderColor = '#22c55e';
            btn.style.color = '#22c55e';
            btn.title = '免审模式已开启 (点击关闭)';
            icon.textContent = '🔓';
            text.textContent = '免审模式';
            btn.style.transform = 'scale(1.05)';
            setTimeout(() => btn.style.transform = 'scale(1)', 150);
        } else {
            btn.style.borderColor = 'var(--panel-border)';
            btn.style.color = 'var(--text-secondary)';
            btn.title = '审批模式已开启 (点击开启免审)';
            icon.textContent = '🔒';
            text.textContent = '审批模式';
            btn.style.transform = 'scale(0.95)';
            setTimeout(() => btn.style.transform = 'scale(1)', 150);
        }
    };
"""

if 'window.toggleAutoApprove =' not in content:
    content = content.replace('window.aiSessionId = window.aiSessionId || null;', 'window.aiSessionId = window.aiSessionId || null;\n' + toggle_fn)

# Replace the checkbox reading logic with window.isAutoApprove
old_checkbox_logic = """const autoApprove = document.getElementById('ai-auto-approve')?.checked;
                                if (autoApprove) {
                                    handleAction(true);
                                }"""
new_checkbox_logic = """if (window.isAutoApprove) {
                                    handleAction(true);
                                }"""

content = content.replace(old_checkbox_logic, new_checkbox_logic)

with open('static/script.js', 'w', encoding='utf-8') as f:
    f.write(content)
print("script.js updated successfully!")
