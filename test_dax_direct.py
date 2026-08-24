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
workspace_id = "81293c65-8c1b-49ed-9752-58734e364db3"
dataset_id = "4e0c60d7-cc3a-4da9-b68a-8816bdfc4d9b"
dax_url = f"https://api.powerbi.com/v1.0/myorg/groups/{workspace_id}/datasets/{dataset_id}/executeQueries"

dax_queries = [
    "EVALUATE SUMMARIZE(COLUMNSTATISTICS(), [Table Name])",
    "EVALUATE SELECTCOLUMNS(INFO.TABLES(), \"Table Name\", COALESCE([ExplicitName], [Name]))",
    "EVALUATE SELECTCOLUMNS(FILTER(INFO.TABLES(), [IsHidden] = FALSE()), \"Table Name\", [ExplicitName])"
]

for q in dax_queries:
    dax_body = {"queries": [{"query": q}], "serializerSettings": {"incNull": True}}
    r = requests.post(dax_url, json=dax_body, headers=pbi_headers)
    print(f"Query: {q}")
    print(f"Status: {r.status_code}")
    print(f"Response: {r.text[:300]}\n")