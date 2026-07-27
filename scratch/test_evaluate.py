import os
import requests
from msal import ConfidentialClientApplication
import time

tenant_id = '78a11419-9556-437d-843b-55d8396908e1'
client_id = '1846a56a-668f-405d-9ffd-574db4da5ce4'
client_secret = 'REDACTED'
workspace_id = '2c51e061-0f9f-4d02-bed0-c169019e5d83'
dataset_id = '8f2a320c-7ab8-44df-ae3d-c722664ee9d1'

authority_url = f"https://login.microsoftonline.com/{tenant_id}"
app = ConfidentialClientApplication(
    client_id=client_id,
    client_credential=client_secret,
    authority=authority_url,
)
scope = ["https://analysis.windows.net/powerbi/api/.default"]
result = app.acquire_token_for_client(scopes=scope)
access_token = result["access_token"]

endpoint = f"https://api.powerbi.com/v1.0/myorg/groups/{workspace_id}/datasets/{dataset_id}/executeQueries"
headers = {
    "Authorization": f"Bearer {access_token}",
    "Content-Type": "application/json"
}

# Try a very simple table or just TOPN
query = "EVALUATE 'Fact Universal Journal'"

payload = {
    "queries": [{"query": query}],
    "serializerSettings": {"includeNulls": True}
}

print("Executing query...")
t0 = time.time()
try:
    response = requests.post(endpoint, headers=headers, json=payload, timeout=30)
    print(f"Status: {response.status_code}")
    print(f"Time taken: {time.time()-t0:.2f}s")
    print('Rows:', len(response.json()['results'][0]['tables'][0]['rows']))
except Exception as e:
    print(f"Error: {e}")
