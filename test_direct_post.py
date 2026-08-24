import requests
import json
import os
from msal import PublicClientApplication, SerializableTokenCache

CACHE_FILE = r"C:\Users\ZCM\Desktop\XMLA_Refresh_Tool_Project\msal_token_cache.bin"
cache = SerializableTokenCache()
cache.deserialize(open(CACHE_FILE, "r").read())
msal_app = PublicClientApplication(client_id="04b07795-8ddb-461a-bbee-02f9e1bf7b46", authority="https://login.microsoftonline.com/organizations", token_cache=cache)
token = msal_app.acquire_token_silent(scopes=["https://analysis.windows.net/powerbi/api/.default"], account=msal_app.get_accounts()[0])["access_token"]

# 模拟前端发送的 payload
payload = {
    "xmla_endpoint": "powerbi://api.powerbi.com/v1.0/myorg/DA_APAC_BI_QA",
    "access_token": token,
    "dataset_name": "Carman PA Hypers",
    "dataset_id": "" # 模拟未带 id
}

r = requests.post("http://127.0.0.1:8000/api/xmla/scan-tables", json=payload)
print("Response Status:", r.status_code)
print("Response Text:", r.text)