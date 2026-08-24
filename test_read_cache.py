import json
import requests
import os
from msal import PublicClientApplication, SerializableTokenCache

CACHE_FILE = r"C:\Users\ZCM\Desktop\XMLA_Refresh_Tool_Project\msal_token_cache.bin"
cache = SerializableTokenCache()
if os.path.exists(CACHE_FILE):
    try:
        cache.deserialize(open(CACHE_FILE, "r").read())
        app = PublicClientApplication(client_id="04b07795-8ddb-461a-bbee-02f9e1bf7b46", authority="https://login.microsoftonline.com/organizations", token_cache=cache)
        accounts = app.get_accounts()
        if accounts:
            res = app.acquire_token_silent(scopes=["https://analysis.windows.net/powerbi/api/.default"], account=accounts[0])
            if res and "access_token" in res:
                print("TOKEN_FOUND:", res["access_token"])
    except Exception as e:
        print("ERROR:", e)