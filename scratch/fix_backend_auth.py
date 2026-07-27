import sys

py_path = 'src/main.py'
with open(py_path, 'r', encoding='utf-8') as f:
    py = f.read()

old_auth_check = """        client_id = data.get("pbi_client_id", "").strip()
        client_secret = data.get("pbi_client_secret", "").strip()
        tenant_id = data.get("pbi_tenant_id", "").strip()
        query = data.get("query", "").strip()

        if not all([client_id, client_secret, tenant_id, query]):
            return {"success": False, "message": "Missing credentials or query"}"""

new_auth_check = """        query = data.get("query", "").strip()
        
        client_id = data.get("pbi_client_id", "").strip() or Config.CLIENT_ID
        client_secret = data.get("pbi_client_secret", "").strip() or Config.CLIENT_SECRET
        tenant_id = data.get("pbi_tenant_id", "").strip() or Config.TENANT_ID

        if not all([client_id, client_secret, tenant_id, query]):
            return {"success": False, "message": "Missing credentials or query. Please check your Global Settings or .env file."}"""

if old_auth_check in py:
    py = py.replace(old_auth_check, new_auth_check)
    with open(py_path, 'w', encoding='utf-8') as f:
        f.write(py)
    print("Backend auth fallback added to export_dataset")
else:
    print("Could not find the auth check block in src/main.py")
