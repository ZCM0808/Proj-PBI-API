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

workspace_id = None
groups_res = requests.get("https://api.powerbi.com/v1.0/myorg/groups", headers=pbi_headers)
if groups_res.status_code == 200:
    for g in groups_res.json().get("value", []):
        if g.get("name", "").lower() == ws_name.lower():
            workspace_id = g.get("id")
            break

dataset_name = "Carman PA Hypers"
dataset_id = None
ds_list_url = f"https://api.powerbi.com/v1.0/myorg/groups/{workspace_id}/datasets"
ds_list_res = requests.get(ds_list_url, headers=pbi_headers)
if ds_list_res.status_code == 200:
    for d in ds_list_res.json().get("value", []):
        if d.get("name", "").lower() == dataset_name.lower():
            dataset_id = d.get("id")
            break

dax_url = f"https://api.powerbi.com/v1.0/myorg/groups/{workspace_id}/datasets/{dataset_id}/executeQueries"
dax_body = {"queries": [{"query": "EVALUATE SUMMARIZE(COLUMNSTATISTICS(), [Table Name])"}], "serializerSettings": {"incNull": True}}
r_dax = requests.post(dax_url, json=dax_body, headers=pbi_headers)

results = r_dax.json().get("results", [])
tables = []
if results and "tables" in results[0]:
    rows = results[0]["tables"][0].get("rows", [])
    raw_names = list(set([r.get("[Table Name]") or r.get("Table Name") or r.get("ExplicitName") for r in rows if (r.get("[Table Name]") or r.get("Table Name") or r.get("ExplicitName"))]))
    for t_name in sorted(raw_names):
        if t_name and not str(t_name).startswith("DateTableTemplate") and not str(t_name).startswith("LocalDateTable") and not str(t_name).startswith("RowNumber"):
            tables.append({"name": t_name, "partitions": [{"name": t_name, "mode": "import"}]})

print(json.dumps({"success": True, "tables_count": len(tables), "tables": tables}))