import re

with open('static/script.js', 'r', encoding='utf-8') as f:
    js = f.read()

expand_fn = """
window.expandConsole = function(id) {
    const consoleEl = document.getElementById(id);
    if (!consoleEl) return;
    const chevron = document.getElementById(id + '-chevron');
    if (consoleEl.classList.contains('collapsed-console')) {
        consoleEl.classList.remove('collapsed-console');
        if (chevron) chevron.style.transform = 'rotate(90deg)';
    }
};
"""
if 'window.expandConsole =' not in js:
    js = js.replace('window.toggleConsole = function', expand_fn + '\nwindow.toggleConsole = function')

# Inject expandConsole into workflows
injections = {
    'wf-out-ds-step1': "window.loadDatasetTablesStep1 = async function(btn) {",
    'wf-out-ds-step2': "window.executeDatasetStep2 = async function(btn) {",
    'wf-out-vis': "window.executeExportData = async function(btn) {",
    'wf-out-step1': "window.executeStep1 = async function(btn) {",
    'wf-out-step2': "window.executeStep2 = async function(btn, customParams) {",
    'wf-out-step3': "window.executeStep3 = async function(btn) {",
    'wf-out-rvc-logs': "window.fetchReportViewCount = async function(btn) {",
    'wf-out-perms-logs': "window.checkUserPermissions = async function(btn) {"
}

for cid, signature in injections.items():
    if f"window.expandConsole('{cid}')" not in js:
        js = js.replace(signature, f"{signature}\n    window.expandConsole('{cid}');")

with open('static/script.js', 'w', encoding='utf-8') as f:
    f.write(js)

print("JS patched with expanders")
