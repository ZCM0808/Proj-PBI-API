import re

with open('static/script.js', 'r', encoding='utf-8') as f:
    js = f.read()

target = """    let html = `
    <table class="data-table" style="width: 100%; border-collapse: collapse; margin-top: 8px;">
        <thead style="position: sticky; top: 0; background: var(--panel-bg); z-index: 5;">
            <tr>
                <th style="padding: 8px; text-align: left; border-bottom: 2px solid var(--overlay-10);">Workspace</th>
                <th style="padding: 8px; text-align: left; border-bottom: 2px solid var(--overlay-10);">User / Principal</th>
                <th style="padding: 8px; text-align: left; border-bottom: 2px solid var(--overlay-10);">Type</th>
                <th style="padding: 8px; text-align: left; border-bottom: 2px solid var(--overlay-10);">Role</th>
                <th style="padding: 8px; text-align: left; border-bottom: 2px solid var(--overlay-10); width: 100px;">Actions</th>
            </tr>
        </thead>"""

replacement = """    let html = `
    <table data-table-id="gum_table" class="data-table" style="width: 100%; border-collapse: collapse;">
        <thead style="position: sticky; top: 0; background: var(--panel-bg); z-index: 5;">
            <tr>
                <th style="padding: 8px; text-align: left; border-bottom: 2px solid var(--overlay-10); cursor: pointer; resize: horizontal; overflow: hidden; min-width: 50px;" onclick="window.sortTable(this, event, 0)" title="Click to sort, Shift+Click for multi-sort, Drag right edge to resize">Workspace</th>
                <th style="padding: 8px; text-align: left; border-bottom: 2px solid var(--overlay-10); cursor: pointer; resize: horizontal; overflow: hidden; min-width: 50px;" onclick="window.sortTable(this, event, 1)" title="Click to sort, Shift+Click for multi-sort, Drag right edge to resize">User / Principal</th>
                <th style="padding: 8px; text-align: left; border-bottom: 2px solid var(--overlay-10); cursor: pointer; resize: horizontal; overflow: hidden; min-width: 50px;" onclick="window.sortTable(this, event, 2)" title="Click to sort, Shift+Click for multi-sort, Drag right edge to resize">Type</th>
                <th style="padding: 8px; text-align: left; border-bottom: 2px solid var(--overlay-10); cursor: pointer; resize: horizontal; overflow: hidden; min-width: 50px;" onclick="window.sortTable(this, event, 3)" title="Click to sort, Shift+Click for multi-sort, Drag right edge to resize">Role</th>
                <th style="padding: 8px; text-align: left; border-bottom: 2px solid var(--overlay-10); width: 100px;">Actions</th>
            </tr>
        </thead>"""

if target in js:
    js = js.replace(target, replacement)
    with open('static/script.js', 'w', encoding='utf-8') as f:
        f.write(js)
    print("JS patched with exact target!")
else:
    print("Target not found in JS!")

# Make sure we also patch index.html version number
with open('static/index.html', 'r', encoding='utf-8') as f:
    html = f.read()
html = re.sub(r'v148', 'v149', html)
with open('static/index.html', 'w', encoding='utf-8') as f:
    f.write(html)
