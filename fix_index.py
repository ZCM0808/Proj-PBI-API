import sys
sys.stdout.reconfigure(encoding='utf-8')
with open('static/index.html', 'r', encoding='utf-8') as f:
    content = f.read()

content = content.replace(
    '<button id=\"btn-harness-execute\" class=\"btn-action-primary\">运行测试</button>',
    '<button id=\"btn-harness-execute\" class=\"btn-action-primary\" style=\"padding: 6px 14px; font-size: 0.8rem; width: 150px; justify-content: center;\">Run Tests</button>'
)

replacements = {
    '取消 (Cancel)': 'Cancel',
    '全选 (All)': 'Select All',
    '清空 (Clear)': 'Clear All',
    '审批模式 (点击开启免审)': 'Approval Mode (Click to auto-approve)',
    '审批模式': 'Approval Mode',
    '已选: 0 / 总计: 0': 'Selected: 0 / Total: 0',
    '✨ AI 智能助手': '✨ AI Assistant',
    '输入您的问题...': 'Type your prompt...',
    '你好！我是 PBI 智能助手。有什么可以帮你的吗？': 'Hello! I am your PBI AI Assistant. How can I help you today?',
    '❌ 清空所有请求历史 (Clear All)': '❌ Clear All History',
    '✅ 添加选中项 (Add Selected)': '✅ Add Selected',
    '📥 导入 (Import)': '📥 Import'
}

for k, v in replacements.items():
    content = content.replace(k, v)

with open('static/index.html', 'w', encoding='utf-8') as f:
    f.write(content)
print('Updated index.html safely')
