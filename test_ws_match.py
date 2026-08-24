import requests
import json
import os
from msal import PublicClientApplication, SerializableTokenCache

CACHE_FILE = r"C:\Users\ZCM\Desktop\XMLA_Refresh_Tool_Project\msal_token_cache.bin"
cache = SerializableTokenCache()
cache.deserialize(open(CACHE_FILE, "r").read())
msal_app = PublicClientApplication(client_id="04b07795-8ddb-461a-bbee-02f9e1bf7b46", authority="https://login.microsoftonline.com/organizations", token_cache=cache)
token = msal_app.acquire_token_silent(scopes=["https://analysis.windows.net/powerbi/api/.default"], account=msal_app.get_accounts()[0])["access_token"]

pbi_headers = {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}
endpoint = "powerbi://api.powerbi.com/v1.0/myorg/DA_APAC_BI_QA"
ws_name = endpoint.rstrip("/").split("/")[-1]
print("ws_name parsed:", ws_name)

groups_res = requests.get("https://api.powerbi.com/v1.0/myorg/groups", headers=pbi_headers)
workspace_id = None
if groups_res.status_code == 200:
    for g in groups_res.json().get("value", []):
        print(f"Comparing '{g.get('name').lower()}' with '{ws_name.lower()}'")
        if g.get("name", "").lower() == ws_name.lower():
            workspace_id = g.get("id")
            break

print("workspace_id found:", workspace_id)