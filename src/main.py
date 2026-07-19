"""Power BI API Web Explorer"""

import sys
import os

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

import uvicorn
from fastapi import FastAPI, Request, Response
from fastapi.responses import HTMLResponse, StreamingResponse, RedirectResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
import hashlib
from src.config import Config
from src.pbi_client import PBIClient
from src.pipeline import PBIPipeline

app = FastAPI(title="Power BI API Explorer")

@app.middleware("http")
async def auth_middleware(request: Request, call_next):
    if Config.APP_ACCESS_PASSWORD:
        whitelist = ["/login", "/api/login", "/static/login.html"]
        if request.url.path not in whitelist and not request.url.path.startswith("/static/"):
            token = request.cookies.get("pbi_auth_token")
            expected_token = hashlib.sha256(Config.APP_ACCESS_PASSWORD.encode()).hexdigest()
            if token != expected_token:
                if request.url.path.startswith("/api/"):
                    return JSONResponse(status_code=401, content={"success": False, "message": "Unauthorized. Please login."})
                else:
                    return RedirectResponse(url="/login", status_code=302)
    return await call_next(request)

# 挂载静态文件
app.mount("/static", StaticFiles(directory="static"), name="static")

client = PBIClient(Config())

import time
import json
import uuid
import asyncio
import subprocess
import os

LOCKOUT_FILE = "data/lockouts.json"

def load_lockouts():
    try:
        with open(LOCKOUT_FILE, "r") as f:
            return json.load(f)
    except Exception:
        return {}

def save_lockouts(data):
    os.makedirs("data", exist_ok=True)
    with open(LOCKOUT_FILE, "w") as f:
        json.dump(data, f, indent=2)

lockouts = load_lockouts()

async def async_git_push():
    def _push():
        try:
            subprocess.run(["git", "add", LOCKOUT_FILE], check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
            subprocess.run(["git", "commit", "-m", "security: update device lockouts"], check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
            subprocess.run(["git", "push"], check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        except Exception:
            pass
    await asyncio.to_thread(_push)

class LoginRequest(BaseModel):
    password: str

@app.post("/api/login")
async def login(req: LoginRequest, request: Request, response: Response):
    device_id = request.cookies.get("pbi_device_id")
    if not device_id:
        device_id = str(uuid.uuid4())
        response.set_cookie(key="pbi_device_id", value=device_id, max_age=86400*365)
    
    now = time.time()
    device_record = lockouts.get(device_id, {"attempts": 0, "locked_until": 0})
    
    if device_record["locked_until"] > now:
        remaining = int(device_record["locked_until"] - now)
        return JSONResponse(status_code=429, content={"success": False, "message": f"Device locked. Please try again in {remaining // 60}m {remaining % 60}s."})
    
    if device_record["locked_until"] != 0 and device_record["locked_until"] < now:
        device_record["attempts"] = 0
        device_record["locked_until"] = 0
    
    if req.password == Config.APP_ACCESS_PASSWORD:
        token = hashlib.sha256(Config.APP_ACCESS_PASSWORD.encode()).hexdigest()
        response.set_cookie(key="pbi_auth_token", value=token, httponly=True, max_age=86400*30)
        if device_id in lockouts:
            del lockouts[device_id]
            save_lockouts(lockouts)
            asyncio.create_task(async_git_push())
        return {"success": True}
    
    device_record["attempts"] += 1
    if device_record["attempts"] >= 3:
        device_record["locked_until"] = now + 1800
        msg = "Device locked for 30 minutes due to 3 failed attempts."
    else:
        msg = f"Invalid password. Attempt {device_record['attempts']}/3."
        
    lockouts[device_id] = device_record
    save_lockouts(lockouts)
    asyncio.create_task(async_git_push())
    
    return JSONResponse(status_code=401, content={"success": False, "message": msg})

@app.get("/login", response_class=HTMLResponse)
def get_login_ui(request: Request):
    device_id = request.cookies.get("pbi_device_id")
    with open("static/login.html", "r", encoding="utf-8") as f:
        html = f.read()
    resp = HTMLResponse(content=html)
    if not device_id:
        resp.set_cookie(key="pbi_device_id", value=str(uuid.uuid4()), max_age=86400*365)
    return resp

@app.get("/", response_class=HTMLResponse)
def get_ui():
    """返回 Web UI 主页"""
    with open("static/index.html", "r", encoding="utf-8") as f:
        return f.read()


@app.get("/api/settings")
async def get_settings():
    return Config.get_all()


@app.post("/api/settings")
async def update_settings(request: Request):
    try:
        data = await request.json()
        Config.update_config(data)
        global client
        client = PBIClient(Config())
        return {"success": True, "message": "配置保存成功！"}
    except Exception as e:
        return {"success": False, "message": str(e)}


@app.post("/api/settings/verify")
async def verify_settings(request: Request):
    """验证客户端凭证"""
    try:
        data = await request.json()
        client_id = data.get("pbi_client_id", "").strip()
        client_secret = data.get("pbi_client_secret", "").strip()
        username = data.get("pbi_username", "").strip()
        password = data.get("pbi_password", "").strip()
        tenant_id = data.get("pbi_tenant_id", "").strip()
        auth_mode = data.get("pbi_auth_mode", "service_principal")

        if not client_id or not tenant_id:
            return {"success": False, "message": "TENANT_ID and CLIENT_ID are required."}

        authority_url = f"https://login.microsoftonline.com/{tenant_id}"
        from msal import ConfidentialClientApplication, PublicClientApplication  # type: ignore[import-untyped]
        
        # Test default PowerBI scope
        scope = ["https://analysis.windows.net/powerbi/api/.default"]
        import asyncio
        
        result = None
        if auth_mode == "personal":
            if not username or not password:
                return {"success": False, "message": "USERNAME and PASSWORD are required for Personal Auth Mode."}
            app = PublicClientApplication(
                client_id=client_id,
                authority=authority_url,
            )
            result = await asyncio.to_thread(app.acquire_token_by_username_password, username=username, password=password, scopes=scope)
            
            if result and "error" in result:
                error_codes = result.get("error_codes", [])
                error_msg = result.get("error", "").lower()
                if 50076 in error_codes or 50158 in error_codes or 65001 in error_codes or "interaction_required" in error_msg or "invalid_grant" in error_msg:
                    result = await asyncio.to_thread(app.acquire_token_interactive, scopes=scope, login_hint=username)
        else:
            if not client_secret:
                return {"success": False, "message": "CLIENT_SECRET or USERNAME/PASSWORD is required."}
            app = ConfidentialClientApplication(
                client_id=client_id,
                client_credential=client_secret,
                authority=authority_url,
            )
            result = await asyncio.to_thread(app.acquire_token_for_client, scopes=scope)
        
        if result and "access_token" in result:
            app_name = "Unknown App"
            try:
                import base64
                import json
                # 尝试获取 Graph token 以提取应用名称
                graph_result = await asyncio.to_thread(app.acquire_token_for_client, scopes=["https://graph.microsoft.com/.default"])
                if "access_token" in graph_result:
                    token = graph_result["access_token"]
                    payload = token.split(".")[1]
                    payload += "=" * ((4 - len(payload) % 4) % 4)
                    jwt_data = json.loads(base64.b64decode(payload).decode('utf-8'))
                    app_name = jwt_data.get("app_displayname") or jwt_data.get("name") or "Service Principal"
            except Exception:
                pass
                
            return {"success": True, "message": f"凭证验证成功！(Auth Success)\nAuth Mode: {'Personal Auth (Delegated)' if auth_mode == 'personal' else 'Service Principal'}\nClient App: {app_name}", "app_name": app_name}
        
        error_desc = result.get('error_description', result.get('error', 'Unknown Error')) if result else "No result returned"
        return {"success": False, "message": f"Auth failed: {error_desc}"}
    except Exception as e:
        return {"success": False, "message": f"Server Error: {str(e)}"}


@app.post("/api/settings/verify-sql")
async def verify_sql_settings(request: Request):
    """验证 SQL 连接凭证"""
    try:
        data = await request.json()
        sql_conn_str = data.get("pbi_sql_conn", "").strip()

        if not sql_conn_str:
            return {"success": False, "message": "SQL_CONN_STR is required for verification."}

        import asyncio
        try:
            import pyodbc  # type: ignore
            # 尝试连接，设置短超时防止长时间阻塞
            def test_conn():
                conn = pyodbc.connect(sql_conn_str, timeout=3)
                conn.close()
            await asyncio.to_thread(test_conn)
            return {"success": True, "message": "SQL 连接成功！(SQL Connection Successful)"}
        except ImportError:
            return {"success": False, "message": "请先安装 pyodbc 库: pip install pyodbc"}
        except Exception as e:
            return {"success": False, "message": f"SQL 连接失败: {str(e)}"}
    except Exception as e:
        return {"success": False, "message": f"验证异常: {str(e)}"}


@app.get("/api/pipeline/run")
async def run_pipeline(workspace_id: str = "", dataset_id: str = "", report_id: str = ""):
    pipeline = PBIPipeline(workspace_id=workspace_id, dataset_id=dataset_id, report_id=report_id)
    return StreamingResponse(pipeline.run(), media_type="text/event-stream")


@app.post("/api/proxy")
async def proxy_request(request: Request):
    """
    通用代理接口，接收前端传来的参数并转发给 Power BI 或 Fabric REST API。
    """
    try:
        data = await request.json()
    except Exception:
        return {"success": False, "error": "Invalid JSON format"}
        
    method = data.get("method", "GET").upper()
    endpoint = data.get("endpoint", "").strip()
    body = data.get("body", None)
    api_type = data.get("api_type", "powerbi").strip().lower()
    
    # [安全验证] 防止 SSRF (服务器端请求伪造)
    if endpoint.startswith("http://") or endpoint.startswith("https://"):
        return {"success": False, "error": "Security Error: Absolute URLs are strictly prohibited to prevent SSRF and Token leakage. Please provide only the API path."}
    
    # 简单的格式化，确保 endpoint 开头有 /
    if not endpoint.startswith("/"):
        endpoint = "/" + endpoint
        
    kwargs = {}
    if body:
        kwargs["json"] = body
        
    try:
        import asyncio
        response_data = await asyncio.to_thread(
            client.request, method, endpoint, api_type=api_type, **kwargs
        )
        return {"success": True, "data": response_data}
    except Exception as e:
        return {"success": False, "error": str(e)}


def main():
    """Start Web Server"""
    print("=== Power BI API Web Explorer Starting ===")
    port = int(os.environ.get("PORT", 8000))
    print(f"Please visit: http://127.0.0.1:{port}")
    uvicorn.run("src.main:app", host="127.0.0.1", port=port, reload=True)


@app.post("/api/test/guid")
async def test_guid(request: Request):
    """Test a specific GUID via Power BI API"""
    import asyncio
    import requests
    from msal import ConfidentialClientApplication  # type: ignore[import-untyped]

    try:
        data = await request.json()
        client_id = data.get("pbi_client_id", "").strip()
        client_secret = data.get("pbi_client_secret", "").strip()
        tenant_id = data.get("pbi_tenant_id", "").strip()
        item_type = data.get("type", "").strip()
        guid = data.get("guid", "").strip()

        if not all([client_id, client_secret, tenant_id, item_type, guid]):
            return {"success": False, "message": "Missing credentials or GUID"}

        authority_url = f"https://login.microsoftonline.com/{tenant_id}"
        app_msal = ConfidentialClientApplication(
            client_id=client_id,
            client_credential=client_secret,
            authority=authority_url,
        )
        
        scope = ["https://analysis.windows.net/powerbi/api/.default"]
        result = await asyncio.to_thread(app_msal.acquire_token_for_client, scopes=scope)
        
        if "access_token" not in result:
            return {"success": False, "message": f"Auth failed: {result.get('error_description', 'Unknown Error')}"}
        
        access_token = result["access_token"]
        endpoint = f"https://api.powerbi.com/v1.0/myorg/{item_type}/{guid}"
            
        headers = {
            "Authorization": f"Bearer {access_token}",
            "Accept": "application/json"
        }
        
        response = await asyncio.to_thread(requests.get, endpoint, headers=headers)
        
        if response.status_code == 200:
            resp_data = response.json()
            name = resp_data.get("name", "Unknown")
            return {"success": True, "message": "Valid!", "name": name}
        else:
            return {"success": False, "message": f"API Error: {response.status_code} - {response.text}"}

    except Exception as e:
        return {"success": False, "message": f"Server Error: {str(e)}"}


@app.post("/api/scan/{item_type}")
async def scan_pbi_items(item_type: str, request: Request, workspace_id: str | None = None):
    """Scan workspaces, datasets, or reports using provided credentials"""
    import asyncio
    
    try:
        data = await request.json()
        client_id = data.get("pbi_client_id", "").strip()
        client_secret = data.get("pbi_client_secret", "").strip()
        tenant_id = data.get("pbi_tenant_id", "").strip()
        body_workspace_id = data.get("workspace_id", "").strip()
        # Prefer body parameter over query parameter
        if body_workspace_id:
            workspace_id = body_workspace_id
        
        if not all([client_id, client_secret, tenant_id]):
            return {"success": False, "error": "Missing credentials. Please fill TENANT_ID, CLIENT_ID, and CLIENT_SECRET."}

        authority_url = f"https://login.microsoftonline.com/{tenant_id}"
        from msal import ConfidentialClientApplication  # type: ignore[import-untyped]
        app = ConfidentialClientApplication(
            client_id=client_id,
            client_credential=client_secret,
            authority=authority_url,
        )
        
        scope = ["https://analysis.windows.net/powerbi/api/.default"]
        result = await asyncio.to_thread(app.acquire_token_for_client, scopes=scope)
        
        if "access_token" not in result:
            return {"success": False, "error": f"Auth failed: {result.get('error_description', 'Unknown Error')}"}
        
        access_token = result["access_token"]
        
        if item_type == "workspaces":
            endpoint = "https://api.powerbi.com/v1.0/myorg/groups"
        elif item_type == "datasets":
            if workspace_id:
                endpoint = f"https://api.powerbi.com/v1.0/myorg/groups/{workspace_id}/datasets"
            else:
                endpoint = "https://api.powerbi.com/v1.0/myorg/datasets"
        elif item_type == "reports":
            if workspace_id:
                endpoint = f"https://api.powerbi.com/v1.0/myorg/groups/{workspace_id}/reports"
            else:
                endpoint = "https://api.powerbi.com/v1.0/myorg/reports"
        else:
            return {"success": False, "error": "Invalid item type"}

        import requests
        headers = {
            "Authorization": f"Bearer {access_token}",
            "Accept": "application/json"
        }
        
        response = await asyncio.to_thread(requests.get, endpoint, headers=headers)
        response.raise_for_status()
        response_data = response.json()

        items = response_data.get("value", [])
        result_items = [{"id": item.get("id"), "name": item.get("name")} for item in items]
        return {"success": True, "data": result_items}
    except Exception as e:
        return {"success": False, "error": str(e)}

if __name__ == "__main__":
    main()
