import json
import httpx
import re
import asyncio
from msal import ConfidentialClientApplication

async def test_bookmarks():
    with open(r'D:\MyData\Downloads\pbi_backup_localhost_1785852292312.json', 'r', encoding='utf-8') as f:
        data = json.load(f)
    
    bookmarks = json.loads(data.get('bookmarks', '[]'))
    print(f"Total API count in bookmarks: {len(bookmarks)}")
    
    workspaces = json.loads(data.get('workspaces', '[]'))
    datasets = json.loads(data.get('datasets', '[]'))
    
    ws_id = workspaces[0]['id'] if workspaces else 'C06A2729-EE28-4471-AF27-803B56A3D8CC'
    ds_id = datasets[0]['id'] if datasets else '8f2a320c-7ab8-44df-ae3d-c722664ee9d1'
    
    client_id = data.get('clientId')
    client_secret = data.get('clientSecret')
    tenant_id = data.get('tenantId')
    
    authority_url = f"https://login.microsoftonline.com/{tenant_id}"
    app = ConfidentialClientApplication(
        client_id=client_id,
        client_credential=client_secret,
        authority=authority_url,
    )
    scope = ["https://analysis.windows.net/powerbi/api/.default"]
    result = app.acquire_token_for_client(scopes=scope)
    
    if "access_token" not in result:
        print("Auth failed:", result.get("error_description", "Unknown Error"))
        return
        
    access_token = result["access_token"]
    headers = {
        "Authorization": f"Bearer {access_token}",
        "Content-Type": "application/json"
    }

    success = 0
    fail = 0
    
    async with httpx.AsyncClient(timeout=15.0) as client:
        for bm in bookmarks:
            path = bm['path']
            method = bm['method']
            # inject values
            path = re.sub(r'\{groupId\}|\{\{workspaceId\}\}|\{workspaceId\}', ws_id, path, flags=re.IGNORECASE)
            path = re.sub(r'\{datasetId\}', ds_id, path, flags=re.IGNORECASE)
            path = re.sub(r'\{tableName\}', 'MyTable', path, flags=re.IGNORECASE)
            
            full_url = "https://api.powerbi.com" + path
            try:
                res = await client.request(method, full_url, headers=headers)
                if 200 <= res.status_code < 300:
                    print(f"[OK] {method} {path} - HTTP {res.status_code}")
                    success += 1
                else:
                    print(f"[FAIL] {method} {path} - HTTP {res.status_code} - {res.text}")
                    fail += 1
            except Exception as e:
                print(f"[EXCEPTION] {method} {path} - {str(e)}")
                fail += 1

    print(f"\nTest finished. Success: {success}, Fail: {fail}")

if __name__ == '__main__':
    asyncio.run(test_bookmarks())
