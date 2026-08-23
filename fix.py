import os

js_path = r'D:\ZCM\Proj-PBI-API\static\script.js'
with open(js_path, 'r', encoding='utf-8') as f:
    lines = f.readlines()

# 1. Add fetch interceptor at the top
fetch_interceptor = '''
// Global Fetch Interceptor for 401 Unauthorized
const originalFetch = window.fetch;
window.fetch = async function(...args) {
    const response = await originalFetch.apply(window, args);
    if (response.status === 401 && !window.location.pathname.includes('/login')) {
        window.location.href = '/login';
    }
    return response;
};
'''
lines.insert(0, fetch_interceptor + '\n')

# Find Test Harness Modal Logic
start_idx = -1
for i, line in enumerate(lines):
    if '// Test Harness Modal Logic' in line:
        start_idx = i
        break

end_idx = -1
for i in range(start_idx, len(lines)):
    if '});' in lines[i]:
        if 'window.showCustomAlert(' in lines[i-5]:
            end_idx = i
            break

print('Extracting block from', start_idx, 'to', end_idx)
block = lines[start_idx:end_idx]

# Update the spinner logic in the block
for i, line in enumerate(block):
    if 'btnHarnessExecute.disabled = true;' in line:
        block.insert(i+1, '            const originalMainText = btnTestHarness ? btnTestHarness.innerHTML : \'\';\n')
        block.insert(i+2, '            const spinnerHtml = \'<span class=\"spinner\" style=\"display:inline-block; width:12px; height:12px; border:2px solid var(--text-primary); border-top-color:transparent; border-radius:50%; animation:spin 1s linear infinite;\"></span>\';\n')
        block.insert(i+3, '            if (btnTestHarness) { btnTestHarness.innerHTML = spinnerHtml; }\n')
        break

for i, line in enumerate(block):
    if 'btnHarnessExecute.innerHTML = originalText;' in line:
        block.insert(i+1, '                if (btnTestHarness) { btnTestHarness.innerHTML = originalMainText; }\n')
        break

del lines[start_idx:end_idx]

# Insert block into first DOMContentLoaded block (around btnSmartOps)
insert_idx = -1
for i, line in enumerate(lines):
    if 'setupFLIPModal(btnSmartOps, closePipelineBtn, pipelineModal);' in line:
        insert_idx = i + 1
        break

lines[insert_idx:insert_idx] = ['\n'] + block + ['\n']

with open(js_path, 'w', encoding='utf-8') as f:
    f.writelines(lines)
