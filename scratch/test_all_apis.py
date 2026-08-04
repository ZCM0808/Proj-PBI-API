import json
import httpx
import re
import asyncio
from msal import ConfidentialClientApplication

async def find_and_test_apis():
    # 1. Load original backup to get config
    backup_path = r'D:\MyData\Downloads\pbi_backup_localhost_1785852292312.json'
    with open(backup_path, 'r', encoding='utf-8') as f:
        data = json.load(f)
        
    client_id = data.get('clientId')
    client_secret = data.get('clientSecret')
    tenant_id = data.get('tenantId')
    
    workspaces = json.loads(data.get('workspaces', '[]'))
    datasets = json.loads(data.get('datasets', '[]'))
    reports = json.loads(data.get('reports', '[]'))
    
    ws_id = workspaces[0]['id'] if workspaces else 'C06A2729-EE28-4471-AF27-803B56A3D8CC'
    ds_id = datasets[0]['id'] if datasets else '8f2a320c-7ab8-44df-ae3d-c722664ee9d1'
    rp_id = reports[0]['id'] if reports else '3a6e9e19-9aed-4372-a7d9-17155e9dd49d'
    
    # 2. Auth
    authority_url = f"https://login.microsoftonline.com/{tenant_id}"
    app = ConfidentialClientApplication(
        client_id=client_id,
        client_credential=client_secret,
        authority=authority_url,
    )
    result = app.acquire_token_for_client(scopes=["https://analysis.windows.net/powerbi/api/.default"])
    if "access_token" not in result:
        print("Auth failed!")
        return
    headers = {"Authorization": f"Bearer {result['access_token']}", "Content-Type": "application/json"}

    # 3. Load swagger
    with open(r'D:\zcm\Proj-PBI-API\static\swagger.json', 'r', encoding='utf-8') as f:
        swagger = json.load(f)

    # 4. Filter candidate APIs
    # Criteria: GET request, contains {groupId}, doesn't contain {capacityId} or {dashboardId} (since we don't have them easily)
    candidates = []
    for path, path_obj in swagger.get('paths', {}).items():
        if '{groupId}' in path and 'get' in path_obj:
            if '{dashboardId}' in path or '{capacityId}' in path or '{appId}' in path or '{pipelineId}' in path:
                continue
            
            get_op = path_obj['get']
            candidates.append({
                "operationId": get_op.get("operationId"),
                "method": "GET",
                "path": path,
                "summary": get_op.get("summary", ""),
                "tags": get_op.get("tags", []),
                "category": "official"
            })
            
    print(f"Found {len(candidates)} candidate GET APIs to test...")
    
    # Also keep the known working ones from original bookmarks
    original_bookmarks = json.loads(data.get('bookmarks', '[]'))
    working_bookmarks = []
    
    # We already know Datasets_RefreshDatasetInGroup works from last test
    for bm in original_bookmarks:
        if bm.get('operationId') == 'Datasets_RefreshDatasetInGroup':
            working_bookmarks.append(bm)
            
    # Test candidates (limit to first 30 to not overwhelm)
    success_apis = []
    async with httpx.AsyncClient(timeout=15.0) as client:
        # We test up to 25 to be safe
        for bm in candidates[:25]:
            path = bm['path']
            # inject values
            path = re.sub(r'\{groupId\}', ws_id, path, flags=re.IGNORECASE)
            path = re.sub(r'\{datasetId\}', ds_id, path, flags=re.IGNORECASE)
            path = re.sub(r'\{reportId\}', rp_id, path, flags=re.IGNORECASE)
            # if still has unreplaced {id}, skip
            if '{' in path:
                continue
                
            full_url = "https://api.powerbi.com" + path
            try:
                res = await client.get(full_url, headers=headers)
                if 200 <= res.status_code < 300:
                    print(f"[OK] {bm['operationId']} - HTTP {res.status_code}")
                    success_apis.append(bm)
                else:
                    print(f"[FAIL] {bm['operationId']} - HTTP {res.status_code}")
            except Exception:
                pass
                
    print(f"\nDiscovered {len(success_apis)} new working APIs!")
    
    # Combine and save
    final_bookmarks = working_bookmarks + success_apis
    
    # Remove duplicates by operationId
    seen = set()
    dedup = []
    for b in final_bookmarks:
        if b['operationId'] not in seen:
            seen.add(b['operationId'])
            dedup.append(b)
            
    data['bookmarks'] = json.dumps(dedup)
    
    export_path = r'D:\MyData\Downloads\pbi_backup_optimized.json'
    with open(export_path, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
        
    print(f"\nSuccessfully saved optimized backup to: {export_path}")
    print(f"Total APIs in new bookmark list: {len(dedup)}")

if __name__ == '__main__':
    asyncio.run(find_and_test_apis())
