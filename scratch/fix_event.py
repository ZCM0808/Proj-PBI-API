import sys

with open('static/index.html', 'r', encoding='utf-8') as f:
    html = f.read()

html = html.replace("verifySelectedGuid('groups', 'workspace-list', event)", "verifySelectedGuid('groups', 'workspace-list', this)")
html = html.replace("verifySelectedGuid('datasets', 'dataset-list', event)", "verifySelectedGuid('datasets', 'dataset-list', this)")
html = html.replace("verifySelectedGuid('reports', 'report-list', event)", "verifySelectedGuid('reports', 'report-list', this)")

html = html.replace("scanItems('workspaces', event)", "scanItems('workspaces', this)")
html = html.replace("scanItems('datasets', event)", "scanItems('datasets', this)")
html = html.replace("scanItems('reports', event)", "scanItems('reports', this)")
html = html.replace("v44_verify_all", "v45_fix_event")

with open('static/index.html', 'w', encoding='utf-8') as f:
    f.write(html)

with open('static/script.js', 'r', encoding='utf-8') as f:
    js = f.read()

js = js.replace("window.verifySelectedGuid = async function(type, containerId, event) {", "window.verifySelectedGuid = async function(type, containerId, btn) {")
js = js.replace("window.scanItems = async function(type, event) {", "window.scanItems = async function(type, btn) {")

# Remove the lines `const btn = event.currentTarget;`
js = js.replace("const btn = event.currentTarget;", "")

with open('static/script.js', 'w', encoding='utf-8') as f:
    f.write(js)

print("Fixed event handling")
