import json
import requests
from msal import PublicClientApplication

CLIENT_ID = "04b07795-8ddb-461a-bbee-02f9e1bf7b46"
AUTHORITY = "https://login.microsoftonline.com/organizations"
app = PublicClientApplication(client_id=CLIENT_ID, authority=AUTHORITY)
result = app.acquire_token_interactive(scopes=["https://analysis.windows.net/powerbi/api/.default"])
token = result.get("access_token")

pbi_headers = {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}

# 查找工作区组
ws_res = requests.get("https://api.powerbi.com/v1.0/myorg/groups", headers=pbi_headers)
workspace_id = None
if ws_res.status_code == 200:
    for g in ws_res.json().get("value", []):
        if g.get("name", "").lower() == "DA_APAC_BI_QA".lower():
            workspace_id = g.get("id")
            break

print("Workspace ID:", workspace_id)

ds_res = requests.get(f"https://api.powerbi.com/v1.0/myorg/groups/{workspace_id}/datasets", headers=pbi_headers) if workspace_id else requests.get("https://api.powerbi.com/v1.0/myorg/datasets", headers=pbi_headers)
datasets = ds_res.json().get("value", []) if ds_res.status_code == 200 else []
target_ds = next((ds for ds in datasets if ds.get("name") == "Carman PA Hypers"), None)

if target_ds:
    ds_id = target_ds.get("id")
    print(f"Target Dataset ID: {ds_id}")
    
    dax_url = f"https://api.powerbi.com/v1.0/myorg/groups/{workspace_id}/datasets/{ds_id}/executeQueries" if workspace_id else f"https://api.powerbi.com/v1.0/myorg/datasets/{ds_id}/executeQueries"
    
    # 尝试各种方案
    dax_body = {"queries": [{"query": "EVALUATE SUMMARIZE(COLUMNSTATISTICS(), [Table Name])"}]}
    r = requests.post(dax_url, json=dax_body, headers=pbi_headers)
    print("\n--- ExecuteQueries (SUMMARIZE) Response ---")
    print("Status:", r.status_code)
    print("Body:", r.text[:300])
