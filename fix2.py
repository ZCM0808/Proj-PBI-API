import os

js_path = r'D:\ZCM\Proj-PBI-API\static\script.js'
with open(js_path, 'r', encoding='utf-8') as f:
    text = f.read()

# 1. Fetch interceptor
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
text = fetch_interceptor + text

# 2. Extract Test Harness Logic block
# We know it starts at "// Test Harness Modal Logic" and ends before "// Custom Dialog Modal System"
start_str = '    // Test Harness Modal Logic'
end_str = '    // Custom Dialog Modal System (Alert/Confirm) replacing native popups'

start_idx = text.find(start_str)
end_idx = text.find(end_str)

block = text[start_idx:end_idx]

# Wait, the block includes the mousedown `});` which is right before "// Custom Dialog Modal System"
# Let's fix the block:
# It looks like:
#     // Test Harness Modal Logic
#     ... (test harness code) ...
#     }
#     
# });
# 
#     // Custom Dialog...

# We want to remove `});` from the end of the block.
block = block.replace('});\n\n\n', '\n\n')

# 3. Add spinner logic inside the block
block = block.replace('btnHarnessExecute.disabled = true;\n            const originalText = btnHarnessExecute.innerHTML;',
    '''btnHarnessExecute.disabled = true;
            const originalText = btnHarnessExecute.innerHTML;
            const originalMainText = btnTestHarness ? btnTestHarness.innerHTML : '';
            const spinnerHtml = '<span class="spinner" style="display:inline-block; width:12px; height:12px; border:2px solid var(--text-primary); border-top-color:transparent; border-radius:50%; animation:spin 1s linear infinite;"></span>';
            btnHarnessExecute.innerHTML = `${spinnerHtml} Running tests...`;
            if (btnTestHarness) {
                btnTestHarness.innerHTML = spinnerHtml;
            }''')

block = block.replace('btnHarnessExecute.innerHTML = originalText;',
    '''btnHarnessExecute.innerHTML = originalText;
                if (btnTestHarness) {
                    btnTestHarness.innerHTML = originalMainText;
                }''')

# 4. Remove the block from its original position
text = text[:start_idx] + '});\n\n\n' + text[end_idx:]

# 5. Insert the block into the first DOMContentLoaded block, say right before "window.setupFLIPModal ="
insert_marker = '    window.setupFLIPModal = function setupFLIPModal'
insert_idx = text.find(insert_marker)

text = text[:insert_idx] + block + '\n' + text[insert_idx:]

with open(js_path, 'w', encoding='utf-8') as f:
    f.write(text)
