import re

with open('static/script.js', 'r', encoding='utf-8') as f:
    js = f.read()

# Fix literal \n in the code
js = js.replace('const executeStep1 = async () => {\\n    if(window.expandConsole) window.expandConsole(\'wf-out-step1\');', 'const executeStep1 = async () => {\n    if(window.expandConsole) window.expandConsole(\'wf-out-step1\');')
js = js.replace('const executeStep2 = async (btn, customParams) => {\\n    if(window.expandConsole) window.expandConsole(\'wf-out-step2\');', 'const executeStep2 = async (btn, customParams) => {\n    if(window.expandConsole) window.expandConsole(\'wf-out-step2\');')
js = js.replace('const executeStep3 = async () => {\\n    if(window.expandConsole) window.expandConsole(\'wf-out-step3\');', 'const executeStep3 = async () => {\n    if(window.expandConsole) window.expandConsole(\'wf-out-step3\');')
js = js.replace('const fetchReportViewCount = async (btn) => {\\n    if(window.expandConsole) window.expandConsole(\'wf-out-rvc-logs\');', 'const fetchReportViewCount = async (btn) => {\n    if(window.expandConsole) window.expandConsole(\'wf-out-rvc-logs\');')
js = js.replace('const checkUserPermissions = async (btn) => {\\n    if(window.expandConsole) window.expandConsole(\'wf-out-perms-logs\');', 'const checkUserPermissions = async (btn) => {\n    if(window.expandConsole) window.expandConsole(\'wf-out-perms-logs\');')
js = js.replace('const executeExportData = async () => {\\n    if(window.expandConsole) window.expandConsole(\'wf-out-vis\');', 'const executeExportData = async () => {\n    if(window.expandConsole) window.expandConsole(\'wf-out-vis\');')

# Fix api-search to api-search-input
js = js.replace("document.getElementById('api-search')", "document.getElementById('api-search-input')")

with open('static/script.js', 'w', encoding='utf-8') as f:
    f.write(js)

with open('static/index.html', 'r', encoding='utf-8') as f:
    html = f.read()

html = re.sub(r'v132', 'v133', html)

with open('static/index.html', 'w', encoding='utf-8') as f:
    f.write(html)

print("done")
