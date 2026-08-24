import requests
import json
import os
from msal import PublicClientApplication, SerializableTokenCache

CACHE_FILE = r"C:\Users\ZCM\Desktop\XMLA_Refresh_Tool_Project\msal_token_cache.bin"
cache = SerializableTokenCache()
cache.deserialize(open(CACHE_FILE, "r").read())
msal_app = PublicClientApplication(client_id="04b07795-8ddb-461a-bbee-02f9e1bf7b46", authority="https://login.microsoftonline.com/organizations", token_cache=cache)
token = msal_app.acquire_token_silent(scopes=["https://analysis.windows.net/powerbi/api/.default"], account=msal_app.get_accounts()[0])["access_token"]

# 1. 调 scan-datasets
r_ds = requests.post("http://127.0.0.1:8000/api/xmla/scan-datasets", json={
    "xmla_endpoint": "powerbi://api.powerbi.com/v1.0/myorg/DA_APAC_BI_QA",
    "access_token": token
})
print("Scan Datasets Result:")
print("Status:", r_ds.status_code)
ds_json = r_ds.json()
print("Workspace ID:", ds_json.get("workspace_id"))
datasets = ds_json.get("datasets", [])
target = next((d for d in datasets if d["name"] == "Carman PA Hypers"), None)
print("Target Dataset:", target)

# 2. 调 scan-tables
if target:
    r_tbl = requests.post("http://127.0.0.1:8000/api/xmla/scan-tables", json={
        "xmla_endpoint": "powerbi://api.powerbi.com/v1.0/myorg/DA_APAC_BI_QA",
        "access_token": token,
        "dataset_name": target["name"],
        "dataset_id": target["id"]
    })
    print("\nScan Tables Result:")
    print("Status:", r_tbl.status_code)
    print("Body:", r_tbl.text)