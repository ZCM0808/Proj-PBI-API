import sys
sys.stdout.reconfigure(encoding='utf-8')
with open('static/script.js', 'r', encoding='utf-8') as f:
    content = f.read()

# Fix Chinese texts
replacements = {
    'statsSpan.textContent = `已选: ${checked} / 总计: ${total}`;': 'statsSpan.textContent = `Selected: ${checked} / Total: ${total}`;',
    '免审模式已开启 (点击关闭)': 'Auto-Approve ON (Click to disable)',
    '免审模式': 'Auto-Approve',
    '审批模式已开启 (点击开启免审)': 'Approval Mode (Click to auto-approve)',
    '审批模式': 'Approval Mode',
    '思考中...': 'Thinking...',
    '抱歉，无法连接到 AI：': 'Sorry, unable to connect to AI: ',
    'AI 请求执行高危操作': 'AI Requests High-Risk Tool Execution',
    '工具名称:': 'Tool Name:',
    '✅ 批准执行': '✅ Approve',
    '❌ 拒绝': '❌ Reject',
    '执行中...': 'Executing...',
    '已拒绝': 'Rejected',
    '抱歉，发生错误：': 'Sorry, an error occurred: ',
    '网络请求失败，无法连接到 AI。': 'Network request failed. Unable to connect to AI.'
}

for k, v in replacements.items():
    content = content.replace(k, v)

# Remove automatic close logic for test harness safely
# Instead of skipping blindly, we just replace the exact block of code
target = """                // close modal
                testHarnessModal.classList.add('closing');
                setTimeout(() => { 
                    testHarnessModal.style.display = 'none'; 
                    testHarnessModal.classList.remove('closing'); 
                }, 150);"""

content = content.replace(target, "                // keep modal open so results popup over it")

with open('static/script.js', 'w', encoding='utf-8') as f:
    f.write(content)
print('Updated script.js safely')
