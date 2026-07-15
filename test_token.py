import os
import json
import base64
from msal import ConfidentialClientApplication

def get_env():
    env = {}
    if os.path.exists('.env'):
        with open('.env', 'r', encoding='utf-8') as f:
            for line in f:
                line = line.strip()
                if line and not line.startswith('#') and '=' in line:
                    k, v = line.split('=', 1)
                    env[k.strip()] = v.strip().replace("'", "").replace('"', '')
    return env

env = get_env()
tenant_id = env.get('PBI_TENANT_ID', '')
client_id = env.get('PBI_CLIENT_ID', '')
client_secret = env.get('PBI_CLIENT_SECRET', '')

if not tenant_id or not client_id or not client_secret:
    print('Missing credentials in .env')
    exit(1)

app = ConfidentialClientApplication(
    client_id=client_id,
    client_credential=client_secret,
    authority=f'https://login.microsoftonline.com/{tenant_id}'
)
result = app.acquire_token_for_client(scopes=['https://graph.microsoft.com/.default'])
if 'access_token' in result:
    token = result['access_token']
    payload = token.split('.')[1]
    payload += '=' * (-len(payload) % 4)
    decoded = base64.b64decode(payload).decode('utf-8')
    data = json.loads(decoded)
    print(json.dumps(data, indent=2))
else:
    print('Failed to get token:', result)
