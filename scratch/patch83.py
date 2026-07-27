"""
Add Push Dataset (rows/table) APIs + refresh variants to bookmarks seed list.
"""
import json

with open('D:/ZCM/Proj-PBI-API/static/swagger.json', 'r', encoding='utf-8') as f:
    swagger = json.load(f)

TARGET_IDS = [
    # Push rows (write data)
    'Datasets_PostRows',           # POST rows -> My workspace
    'Datasets_PostRowsInGroup',    # POST rows -> specified workspace
    'Datasets_DeleteRows',         # DELETE rows -> My workspace
    'Datasets_DeleteRowsInGroup',  # DELETE rows -> specified workspace
    # Update table schema (modify columns)
    'Datasets_PutTable',           # PUT table schema -> My workspace
    'Datasets_PutTableInGroup',    # PUT table schema -> specified workspace
    # Get tables (needed to know tableName before writing rows)
    'Datasets_GetTables',
    'Datasets_GetTablesInGroup',
]

found = []
for path, methods in swagger.get('paths', {}).items():
    for method, op in methods.items():
        if not isinstance(op, dict): continue
        if op.get('operationId') in TARGET_IDS:
            found.append({
                'operationId': op['operationId'],
                'method': method.upper(),
                'path': path,
                'summary': op.get('summary', ''),
                'tags': op.get('tags', []),
                'category': 'official',
            })
            print(f"OK {method.upper():6} {path}")

print(f"\nTotal found: {len(found)}")

# Read script.js and update DEFAULT_BOOKMARKS_VERSION + list
with open('D:/ZCM/Proj-PBI-API/static/script.js', 'r', encoding='utf-8') as f:
    js = f.read()

# Build new bookmark entries as JS object literals
new_entries = ''
for ep in found:
    summary_escaped = ep['summary'].replace("'", "\\'")
    new_entries += (
        f"        {{ operationId: '{ep['operationId']}', method: '{ep['method']}', "
        f"path: '{ep['path']}', summary: '{summary_escaped[:120]}', "
        f"tags: ['{ep['tags'][0] if ep['tags'] else 'Datasets'}'], category: 'official' }},\n"
    )

# Append new entries before the closing ]; of DEFAULT_BOOKMARKS
old_marker = "    ];\n\n    function seedDefaultBookmarks()"
new_list_tail = new_entries + "    ];\n\n    function seedDefaultBookmarks()"
js = js.replace(old_marker, new_list_tail, 1)

# Bump seed version so existing users get the new bookmarks too
js = js.replace(
    "const DEFAULT_BOOKMARKS_VERSION = 'v1';",
    "const DEFAULT_BOOKMARKS_VERSION = 'v2';"
)

with open('D:/ZCM/Proj-PBI-API/static/script.js', 'w', encoding='utf-8', newline='\r\n') as f:
    f.write(js)

print("script.js updated with new bookmark entries and version bumped to v2.")

# Bump HTML cache version
import re
with open('D:/ZCM/Proj-PBI-API/static/index.html', 'r', encoding='utf-8') as f:
    html = f.read()
html = re.sub(r'style\.css\?v=[^"]+', 'style.css?v=20260723_v98', html)
html = re.sub(r'script\.js\?v=[^"]+', 'script.js?v=20260723_v98', html)
with open('D:/ZCM/Proj-PBI-API/static/index.html', 'w', encoding='utf-8', newline='\r\n') as f:
    f.write(html)

print("index.html bumped to v98.")
