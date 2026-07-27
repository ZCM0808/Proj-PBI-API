"""
Extract the full endpoint objects for the 7 target APIs from swagger.json,
then inject them into localStorage via a browser automation script.
"""
import json

with open('D:/ZCM/Proj-PBI-API/static/swagger.json', 'r', encoding='utf-8') as f:
    swagger = json.load(f)

TARGET_OPERATION_IDS = [
    # Dataset Update / Refresh APIs
    'Datasets_UpdateDatasetInGroup',      # PATCH - update dataset properties
    'Datasets_UpdateDatasourcesInGroup',  # POST  - update connection string
    'Datasets_UpdateParametersInGroup',   # POST  - update Power Query params
    'Datasets_RefreshDatasetInGroup',     # POST  - trigger refresh
    'Datasets_UpdateDataset',             # PATCH - my workspace variant
    'Datasets_UpdateParameters',          # POST  - my workspace variant
    'Datasets_RefreshDataset',            # POST  - my workspace variant
    # Report Usage / Activity
    'Admin_GetActivityEvents',            # GET   - get ViewReport activity logs
]

endpoints = []
paths = swagger.get('paths', {})
for path, methods in paths.items():
    for method, op in methods.items():
        if not isinstance(op, dict):
            continue
        op_id = op.get('operationId', '')
        if op_id in TARGET_OPERATION_IDS:
            tags = op.get('tags', [])
            summary = op.get('summary', op_id)
            # Build simplified endpoint object matching what the app stores
            ep = {
                'operationId': op_id,
                'method': method.upper(),
                'path': path,
                'summary': summary,
                'tags': tags,
                'category': 'official',
                'description': op.get('description', summary),
            }
            endpoints.append(ep)
            print(f"  OK {method.upper():6} {path[:80]}")

print(f"\nTotal: {len(endpoints)} endpoints found")

# Write a Playwright inject script
inject_js = f"""
const newBookmarks = {json.dumps(endpoints, ensure_ascii=False, indent=2)};
const existing = JSON.parse(localStorage.getItem('pbi-bookmarks') || '[]');

// Merge - avoid duplicates
newBookmarks.forEach(nb => {{
  const cleanNew = nb.path.replace('/v1.0/myorg', '');
  const already = existing.some(b => {{
    const cleanB = (b.path || '').replace('/v1.0/myorg', '');
    return cleanB === cleanNew && (b.method||'').toUpperCase() === nb.method.toUpperCase();
  }});
  if (!already) existing.push(nb);
}});
localStorage.setItem('pbi-bookmarks', JSON.stringify(existing));
console.log('Bookmarks saved:', existing.length);
"""

with open('D:/ZCM/Proj-PBI-API/scratch/inject_bookmarks.js', 'w', encoding='utf-8') as f:
    f.write(inject_js)
print("\ninject_bookmarks.js written.")
