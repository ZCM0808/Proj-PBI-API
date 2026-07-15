"""Power BI API Web Explorer"""

import sys
import os

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

import uvicorn
from fastapi import FastAPI, Request
from fastapi.responses import HTMLResponse, StreamingResponse
from fastapi.staticfiles import StaticFiles
from src.config import Config
from src.pbi_client import PBIClient
from src.pipeline import PBIPipeline

app = FastAPI(title="Power BI API Explorer")

# 挂载静态文件
app.mount("/static", StaticFiles(directory="static"), name="static")

client = PBIClient(Config())


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
        return {"success": True, "message": "配置保存成功！"}
    except Exception as e:
        return {"success": False, "message": str(e)}


@app.post("/api/settings/verify")
async def verify_settings(request: Request):
    """验证客户端凭证"""
    from msal import ConfidentialClientApplication # type: ignore[import-untyped]
    try:
        data = await request.json()
        client_id = data.get("pbi_client_id", "").strip()
        client_secret = data.get("pbi_client_secret", "").strip()
        tenant_id = data.get("pbi_tenant_id", "").strip()

        if not all([client_id, client_secret, tenant_id]):
            return {"success": False, "message": "TENANT_ID, CLIENT_ID, and CLIENT_SECRET are required for verification."}

        authority_url = f"https://login.microsoftonline.com/{tenant_id}"
        app = ConfidentialClientApplication(
            client_id=client_id,
            client_credential=client_secret,
            authority=authority_url,
        )
        
        # Test default PowerBI scope
        scope = ["https://analysis.windows.net/powerbi/api/.default"]
        result = app.acquire_token_for_client(scopes=scope)
        if "access_token" in result:
            app_name = "Unknown App"
            try:
                # 尝试获取 Graph token 以提取应用名称 (PowerBI token 往往不包含 app_displayname)
                graph_result = app.acquire_token_for_client(scopes=["https://graph.microsoft.com/.default"])
                if "access_token" in graph_result:
                    import base64
                    import json
                    token = graph_result["access_token"]
                    payload = token.split(".")[1]
                    payload += "=" * (-len(payload) % 4)
                    decoded = base64.b64decode(payload).decode("utf-8")
                    jwt_data = json.loads(decoded)
                    app_name = jwt_data.get("app_displayname", "Unknown App")
            except Exception:
                pass
                
            return {"success": True, "message": "验证成功！(Authentication Successful)", "app_name": app_name, "tenant_id": tenant_id}
        else:
            return {"success": False, "message": f"验证失败: {result.get('error_description', '未知错误')}"}
    except Exception as e:
        return {"success": False, "message": f"验证异常: {str(e)}"}


@app.post("/api/settings/verify-sql")
async def verify_sql_settings(request: Request):
    """验证 SQL 连接凭证"""
    try:
        data = await request.json()
        sql_conn_str = data.get("pbi_sql_conn", "").strip()

        if not sql_conn_str:
            return {"success": False, "message": "SQL_CONN_STR is required for verification."}

        try:
            import pyodbc  # type: ignore
            # 尝试连接，设置短超时防止长时间阻塞
            conn = pyodbc.connect(sql_conn_str, timeout=3)
            conn.close()
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
        response_data = client.request(method, endpoint, api_type=api_type, **kwargs)
        return {"success": True, "data": response_data}
    except Exception as e:
        return {"success": False, "error": str(e)}


def main():
    """Start Web Server"""
    print("=== Power BI API Web Explorer Starting ===")
    print("Please visit: http://127.0.0.1:8000")
    uvicorn.run("src.main:app", host="127.0.0.1", port=8000, reload=True)


if __name__ == "__main__":
    main()
