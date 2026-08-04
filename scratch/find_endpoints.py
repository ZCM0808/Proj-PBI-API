import json

with open('static/swagger.json', 'r', encoding='utf-8') as f:
    swagger = json.load(f)

targets = ['Groups_GetGroups', 'Reports_GetReportsInGroup', 'Datasets_ExecuteQueriesInGroup', 'Groups_GetGroupUsers']
found = []

for path, obj in swagger.get('paths', {}).items():
    for method, op in obj.items():
        if op.get('operationId') in targets:
            found.append({
                "operationId": op['operationId'],
                "method": method.upper(),
                "path": path,
                "summary": op.get('summary', ''),
                "tags": op.get('tags', []),
                "category": "official"
            })
            
with open('scratch/endpoints.json', 'w', encoding='utf-8') as f:
    json.dump(found, f, indent=2)
