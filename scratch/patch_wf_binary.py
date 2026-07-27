import re

# --- Patch pbi_client.py ---
with open('src/pbi_client.py', 'r', encoding='utf-8') as f:
    client_code = f.read()

# Change signature
old_sig = """def request(self, method: str, endpoint: str, api_type: str = "powerbi", **kwargs) -> dict:"""
new_sig = """def request(self, method: str, endpoint: str, api_type: str = "powerbi", raw_response: bool = False, **kwargs):"""
client_code = client_code.replace(old_sig, new_sig)

# Change return logic
old_ret = """        # 尝试解析 JSON 返回，对于没有主体的响应（如 202, 204）返回空字典
        if response.content:"""
new_ret = """        if raw_response:
            return response

        # 尝试解析 JSON 返回，对于没有主体的响应（如 202, 204）返回空字典
        if response.content:"""
client_code = client_code.replace(old_ret, new_ret)

with open('src/pbi_client.py', 'w', encoding='utf-8') as f:
    f.write(client_code)


# --- Patch main.py ---
with open('src/main.py', 'r', encoding='utf-8') as f:
    main_code = f.read()

download_endpoint = """
@app.post("/api/download")
async def download_proxy(request: Request):
    try:
        data = await request.json()
    except Exception:
        return {"success": False, "error": "Invalid JSON format"}
        
    method = data.get("method", "GET").upper()
    endpoint = data.get("endpoint", "").strip()
    api_type = data.get("api_type", "powerbi").strip().lower()
    
    if endpoint.startswith("http://") or endpoint.startswith("https://"):
        return {"success": False, "error": "Security Error"}
    if not endpoint.startswith("/"):
        endpoint = "/" + endpoint
        
    try:
        import asyncio
        from fastapi.responses import Response
        resp = await asyncio.to_thread(
            client.request, method, endpoint, api_type=api_type, raw_response=True
        )
        content_type = resp.headers.get("Content-Type", "application/octet-stream")
        return Response(content=resp.content, media_type=content_type)
    except Exception as e:
        return {"success": False, "error": str(e)}
"""

if "/api/download" not in main_code:
    main_code = main_code.replace("@app.post(\"/api/proxy\")", download_endpoint + "\n@app.post(\"/api/proxy\")")
    with open('src/main.py', 'w', encoding='utf-8') as f:
        f.write(main_code)


# --- Patch script.js ---
with open('static/script.js', 'r', encoding='utf-8') as f:
    script = f.read()

old_fetch = """                logToConsole(3, `Calling proxy... (Warning: downloading binary through JSON proxy might corrupt. In a real app, backend needs a /api/download endpoint. We will attempt standard proxy for now)`);
                const res = await fetch('/api/proxy', {"""
new_fetch = """                logToConsole(3, `Calling /api/download endpoint for raw binary stream...`);
                const res = await fetch('/api/download', {"""
script = script.replace(old_fetch, new_fetch)

# If it returns json, it might be our error wrapper!
old_json_check = """                if (res.headers.get('content-type')?.includes('json')) {
                    const data = await res.json();
                    logToConsole(3, `Proxy JSON Output: ${JSON.stringify(data).substring(0, 500)}`);
                } else {"""
new_json_check = """                if (res.headers.get('content-type')?.includes('json')) {
                    const data = await res.json();
                    if (data.error) {
                        logToConsole(3, `Download API Error: ${data.error}`);
                        return false;
                    }
                    logToConsole(3, `Proxy JSON Output (Unexpected): ${JSON.stringify(data).substring(0, 500)}`);
                    return false;
                } else {"""
script = script.replace(old_json_check, new_json_check)

# Bump version
script = re.sub(r'script\.js\?v=\d+_[a-zA-Z0-9_]+', 'script.js?v=20260726_v30_binary_fix', script)

with open('static/script.js', 'w', encoding='utf-8') as f:
    f.write(script)

with open('static/index.html', 'r', encoding='utf-8') as f:
    html = f.read()
html = re.sub(r'script\.js\?v=\d+_[a-zA-Z0-9_]+', 'script.js?v=20260726_v30_binary_fix', html)
with open('static/index.html', 'w', encoding='utf-8') as f:
    f.write(html)
    
print("Binary download fix applied successfully!")
