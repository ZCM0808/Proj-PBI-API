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
groups_res = requests.get("https://api.powerbi.com/v1.0/myorg/groups", headers=pbi_headers)
print("Groups Status:", groups_res.status_code)
for g in groups_res.json().get("value", []):
    print("Found Group:", g.get("name"), "ID:", g.get("id"))