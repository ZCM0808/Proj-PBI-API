"""Power BI API Web Explorer"""

import sys
import os

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

import uvicorn
from fastapi import FastAPI, Request, Response, HTTPException
from pydantic import BaseModel
from src.local_pbi import scan_local_instances, run_dax_query
from fastapi.responses import HTMLResponse, StreamingResponse, RedirectResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
from typing import Optional, Any, List, Dict
from datetime import datetime
import hashlib
import time
import json
import re
import uuid
import asyncio
import subprocess
import io
import base64
import pyotp  # type: ignore[import-untyped]
import qrcode  # type: ignore[import-untyped]
from src.config import Config
from src.pbi_client import PBIClient
from src.pipeline import PBIPipeline
from contextlib import asynccontextmanager

@asynccontextmanager
async def lifespan(app: FastAPI):
    # 异步在后台静默预热长连接，避免阻塞服务器启动
    async def _warmup():
        import google.generativeai as genai
        global _current_api_key, _model_instance
        os.environ["GRPC_DNS_RESOLVER"] = "native"
        keys = [os.getenv("GEMINI_API_KEY_GG3"), os.getenv("GEMINI_API_KEY_GGCM"), os.getenv("GOOGLE_API_KEY")]
        valid_keys = [k for k in keys if k]
        if not valid_keys:
            return
        
        print("Warming up AI connection in background...")
        for api_key in valid_keys:
            try:
                genai.configure(api_key=api_key)
                _model_instance = genai.GenerativeModel("gemini-3.5-flash")
                # 尝试一个请求，禁用 retry 以便快速失败
                await _model_instance.generate_content_async(
                    "ping", 
                    request_options={"timeout": 5.0}
                )
                _current_api_key = api_key
                print(f"AI connection warmed up successfully with key: {api_key[:5]}***")
                return
            except Exception as e:
                print(f"Key {api_key[:5]}*** failed during warmup: {e}. Trying next...")
                
        print("All keys failed during warmup. Will retry on user request.")
            
    asyncio.create_task(_warmup())
    yield

app = FastAPI(title="Power BI API Explorer", lifespan=lifespan)

def make_auth_token(timestamp: int) -> str:
    raw_val = f"{timestamp}:{Config.APP_ACCESS_PASSWORD}"
    sig = hashlib.sha256(raw_val.encode()).hexdigest()
    return f"{timestamp}.{sig}"

def verify_auth_token(token_str: str) -> bool:
    if not token_str or "." not in token_str:
        return False
    try:
        ts_str, sig = token_str.split(".", 1)
        ts = int(ts_str)
        now = int(time.time())
        # 超出 3 小时 (10800 秒) 强制失效
        if now - ts > 10800 or ts > now + 300:
            return False
        raw_val = f"{ts}:{Config.APP_ACCESS_PASSWORD}"
        expected_sig = hashlib.sha256(raw_val.encode()).hexdigest()
        return sig == expected_sig
    except Exception:
        return False

@app.middleware("http")
async def auth_middleware(request: Request, call_next):
    if Config.APP_ACCESS_PASSWORD:
        whitelist = ["/login", "/api/login", "/static/login.html"]
        if request.url.path not in whitelist and not request.url.path.startswith("/static/"):
            token = request.cookies.get("pbi_auth_token")
            if not token or not verify_auth_token(token):
                if request.url.path.startswith("/api/"):
                    return JSONResponse(status_code=401, content={"success": False, "message": "Session expired or unauthorized. Please login."})
                else:
                    return RedirectResponse(url="/login", status_code=302)
    return await call_next(request)

# 挂载静态文件
app.mount("/static", StaticFiles(directory="static"), name="static")

client = PBIClient(Config())



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
            # Configure git user for Render environment
            subprocess.run(["git", "config", "user.email", "bot@render.com"], check=False)
            subprocess.run(["git", "config", "user.name", "Render Bot"], check=False)
            
            subprocess.run(["git", "add", LOCKOUT_FILE], check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
            subprocess.run(["git", "commit", "-m", "security: update device lockouts"], check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
            
            # Push using GitHub PAT from environment variable
            github_pat = os.environ.get("GITHUB_PAT")
            if github_pat:
                pat_url = f"https://ZCM0808:{github_pat}@github.com/ZCM0808/Proj-PBI-API.git"
                subprocess.run(["git", "push", pat_url, "HEAD:main"], check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
            else:
                # Fallback to default push (will fail on Render without PAT)
                subprocess.run(["git", "push"], check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        except Exception:
            pass
    await asyncio.to_thread(_push)

class LoginRequest(BaseModel):
    password: str
    mfa_code: Optional[str] = None  # 第二步提交的 TOTP 动态口令（可选）

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
        mfa_enabled = bool(Config.MFA_SECRET)
        if mfa_enabled:
            if not req.mfa_code:
                # 第一步通过：密码正确，要求用户提交 TOTP 动态口令（不泄露二维码与 Secret）
                return JSONResponse(
                    status_code=200,
                    content={
                        "success": False,
                        "mfa_required": True,
                        "message": "Password verified. Please enter your Authenticator code.",
                    }
                )
            # 第二步：校验 TOTP 动态口令（允许 ±1 个 30 秒窗口容错）
            totp = pyotp.TOTP(Config.MFA_SECRET)
            if not totp.verify(req.mfa_code, valid_window=1):
                return JSONResponse(
                    status_code=401,
                    content={"success": False, "message": "Invalid authenticator code. Please try again."}
                )
        # 密码+MFA 均通过，颁发 Session Token
        token = make_auth_token(int(now))
        response.set_cookie(key="pbi_auth_token", value=token, httponly=True, max_age=10800)
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


@app.get("/api/mfa-setup")
async def mfa_setup(request: Request):
    """返回 MFA 绑定二维码（仅在已登录状态下可访问，用于首次绑定手机 Authenticator App）"""
    token = request.cookies.get("pbi_auth_token")
    if not token or not verify_auth_token(token):
        return JSONResponse(status_code=401, content={"success": False, "message": "Please login first."})
    if not Config.MFA_SECRET:
        return JSONResponse(status_code=400, content={"success": False, "message": "MFA is not configured on this server."})
    totp = pyotp.TOTP(Config.MFA_SECRET)
    provisioning_uri = totp.provisioning_uri(name="admin", issuer_name="PBI API Explorer")
    img = qrcode.make(provisioning_uri)
    buf = io.BytesIO()
    img.save(buf, format="PNG")
    buf.seek(0)
    qr_b64 = base64.b64encode(buf.read()).decode()
    return JSONResponse(content={
        "success": True,
        "qr_image_base64": qr_b64,
        "secret": Config.MFA_SECRET,
        "provisioning_uri": provisioning_uri
    })


@app.post("/api/logout")
async def logout(response: Response):
    """清除登录 Cookie，强制退出并跳转回登录页"""
    response.delete_cookie(key="pbi_auth_token")
    return JSONResponse(content={"success": True, "redirect": "/login"})

_current_api_key = None
_model_instance = None
_project_memory = ""

def get_project_memory():
    global _project_memory
    if not _project_memory:
        try:
            # Read PROJECT_MEMORY.md from the root directory
            memory_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), "PROJECT_MEMORY.md")
            if os.path.exists(memory_path):
                with open(memory_path, "r", encoding="utf-8") as f:
                    _project_memory = f.read()
            else:
                _project_memory = "You are a helpful assistant for Power BI and data engineering."
        except Exception as e:
            _project_memory = f"You are a helpful assistant. (Failed to load knowledge base: {e})"
    return _project_memory

class ChatRequest(BaseModel):
    message: str
    session_id: Optional[str] = None

class ToolApproveRequest(BaseModel):
    session_id: str
    tool_name: str
    tool_args: dict
    approved: bool

# 全局状态，用于保存用户的持续会话上下文 (因为工具调用需要多轮记忆)
_chat_sessions: Dict[str, Any] = {}

def run_powershell(command: str) -> str:
    """Executes a PowerShell command on the host machine and returns the output. USE CAREFULLY."""
    import sys
    if sys.platform != 'win32':
        return "ERROR: You are running on a Linux cloud server (like Render), not the user's local Windows machine. You CANNOT access their local C:\\ drive or local files. Apologize to the user and explain that you are currently deployed in the cloud and do not have local access."
    print(f"Executing Powershell via AI Tool: {command}")
    try:
        # 使用 timeout 防止后台阻塞
        result = subprocess.run(["powershell", "-Command", command], capture_output=True, text=True, timeout=15)
        out = result.stdout[:2000] + ("\n...[truncated]" if len(result.stdout) > 2000 else "")
        err = result.stderr[:2000] + ("\n...[truncated]" if len(result.stderr) > 2000 else "")
        res = ""
        if out:
            res += f"STDOUT:\n{out}\n"
        if err:
            res += f"STDERR:\n{err}\n"
        if not res:
            res = "Command executed successfully (no output)."
        return res
    except Exception as e:
        return f"Error executing command: {str(e)}"

def _get_valid_api_keys():
    keys = [
        os.getenv("GEMINI_API_KEY_GG3"),
        os.getenv("GEMINI_API_KEY_GGCM"),
        os.getenv("GOOGLE_API_KEY")
    ]
    return [k for k in keys if k]

@app.post("/api/chat")
async def ai_chat(req: ChatRequest):
    import google.generativeai as genai
    import json
    import uuid
    global _current_api_key
    
    os.environ["GRPC_DNS_RESOLVER"] = "native"
    valid_keys = _get_valid_api_keys()
    
    if not valid_keys:
        return {"success": False, "message": "Backend missing GEMINI_API_KEY in .env"}
    
    # 优先使用已证明可用的 Key，防止掉入 429 陷阱
    if _current_api_key and _current_api_key in valid_keys:
        valid_keys.remove(_current_api_key)
        valid_keys.insert(0, _current_api_key)
        
    session_id = req.session_id or str(uuid.uuid4())
    chat = _chat_sessions.get(session_id)
    
    last_error = None
    if not chat:
        for api_key in valid_keys:
            try:
                genai.configure(api_key=api_key)
                # 向模型注入工具！(赋能执行系统命令)
                model = genai.GenerativeModel("gemini-3.5-flash", tools=[run_powershell])
                chat = model.start_chat(history=[])
                _chat_sessions[session_id] = chat
                _current_api_key = api_key
                break
            except Exception as e:
                last_error = str(e)
                continue
                
    if not chat:
        return {"success": False, "message": f"All API keys failed to init session. Error: {last_error}"}

    # 如果是第一次聊天，主动把项目知识库喂进去
    full_message = req.message
    if len(chat.history) == 0:
        project_kb = get_project_memory()
        full_message = f"=== 专属项目知识库 ===\n{project_kb}\n\n=== 用户请求 ===\n{req.message}"
        
    try:
        response = await chat.send_message_async(full_message, stream=True)
        
        async def event_generator():
            try:
                # 告诉前端当前的 Session ID
                yield f"data: {json.dumps({'success': True, 'type': 'session_info', 'session_id': session_id})}\n\n"
                
                async for chunk in response:
                    # 拦截特殊的 Tool Call（函数调用申请）
                    if getattr(chunk, 'parts', None):
                        for part in chunk.parts:
                            if getattr(part, 'function_call', None):
                                fc = part.function_call
                                args_dict = {}
                                try:
                                    args_dict = dict(fc.args) if hasattr(fc, 'args') else {}
                                except Exception:
                                    # Fallback for protobuf mapping
                                    args_dict = {k: v for k, v in fc.args.items()} if hasattr(fc.args, 'items') else {}
                                
                                payload = {
                                    'success': True,
                                    'type': 'tool_request',
                                    'name': fc.name,
                                    'args': args_dict
                                }
                                # 向前端抛出拦截卡片，并中断本次回复流！等待前端人工审批
                                yield f"data: {json.dumps(payload)}\n\n"
                                yield "data: [DONE]\n\n"
                                return
                                
                    # 普通聊天文本，正常输出
                    try:
                        if chunk.text:
                            yield f"data: {json.dumps({'success': True, 'type': 'text', 'text': chunk.text})}\n\n"
                    except ValueError:
                        # 兼容有些 SDK 版本在存在 function_call 时访问 text 会报错
                        pass
                yield "data: [DONE]\n\n"
            except Exception as e:
                yield f"data: {json.dumps({'success': False, 'message': str(e)})}\n\n"
                
        return StreamingResponse(event_generator(), media_type="text/event-stream")
    except Exception as e:
        return {"success": False, "message": str(e)}

@app.post("/api/tool/approve")
async def ai_tool_approve(req: ToolApproveRequest):
    """前端点击批准/拒绝后，回调此接口执行工具，并继续聊天"""
    from google.generativeai.types import content_types
    import json
    
    chat = _chat_sessions.get(req.session_id)
    if not chat:
        return {"success": False, "message": "Session expired or not found. Please start a new chat."}
        
    if not req.approved:
        tool_result = "User REJECTED the execution of this command for security reasons. Apologize and propose a different solution."
    else:
        if req.tool_name == "run_powershell":
            import asyncio
            tool_result = await asyncio.to_thread(run_powershell, req.tool_args.get("command", ""))
        else:
            tool_result = f"Unknown tool: {req.tool_name}"
            
    try:
        # 将工具执行结果送回给 AI 大脑，触发它继续输出结果
        response = await chat.send_message_async(
            content_types.Part.from_function_response(  # type: ignore
                name=req.tool_name,
                response={"result": tool_result}
            ),
            stream=True
        )
        
        # 原封不动复用上面的流式下发器逻辑
        async def event_generator():
            try:
                async for chunk in response:
                    # 再次检查是否产生了连续的工具调用
                    if getattr(chunk, 'parts', None):
                        for part in chunk.parts:
                            if getattr(part, 'function_call', None):
                                fc = part.function_call
                                args_dict = {}
                                try:
                                    args_dict = dict(fc.args) if hasattr(fc, 'args') else {}
                                except Exception:
                                    args_dict = {k: v for k, v in fc.args.items()} if hasattr(fc.args, 'items') else {}
                                yield f"data: {json.dumps({'success': True, 'type': 'tool_request', 'name': fc.name, 'args': args_dict})}\n\n"
                                yield "data: [DONE]\n\n"
                                return
                    try:
                        if chunk.text:
                            yield f"data: {json.dumps({'success': True, 'type': 'text', 'text': chunk.text})}\n\n"
                    except ValueError:
                        pass
                yield "data: [DONE]\n\n"
            except Exception as e:
                yield f"data: {json.dumps({'success': False, 'message': str(e)})}\n\n"
                
        return StreamingResponse(event_generator(), media_type="text/event-stream")
    except Exception as e:
        return {"success": False, "message": str(e)}

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




@app.post("/api/embed_info")
async def get_embed_info(request: Request):
    try:
        data = await request.json()
        w_id = data.get("workspace_id")
        r_id = data.get("report_id")
        if not w_id or not r_id:
            return {"success": False, "error": "Missing workspace_id or report_id"}
        
        import asyncio
        # Get report details
        report_info = await asyncio.to_thread(
            client.request, "GET", f"/groups/{w_id}/reports/{r_id}"
        )
        if "error" in report_info:
            return {"success": False, "error": report_info["error"]}
            
        embed_url = report_info.get("embedUrl")
        
        # Get embed token
        token_res = await asyncio.to_thread(
            client.request, "POST", f"/groups/{w_id}/reports/{r_id}/GenerateToken", json={"accessLevel": "View"}
        )
        if "error" in token_res:
            return {"success": False, "error": token_res["error"]}
            
        embed_token = token_res.get("token")
        
        return {"success": True, "embedUrl": embed_url, "embedToken": embed_token}
    except Exception as e:
        return {"success": False, "error": str(e)}

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




@app.get("/api/db/history")
async def get_history():
    import sqlite3
    import json
    try:
        conn = sqlite3.connect('data/pbi_app.db')
        c = conn.cursor()
        c.execute('''CREATE TABLE IF NOT EXISTS history (id INTEGER PRIMARY KEY AUTOINCREMENT, data TEXT)''')
        c.execute('SELECT data FROM history ORDER BY id DESC LIMIT 1')
        row = c.fetchone()
        conn.close()
        if row:
            return {"success": True, "data": json.loads(row[0])}
    except Exception as e:
        return {"success": False, "error": str(e)}
    return {"success": True, "data": None}

@app.post("/api/db/history")
async def sync_history(request: Request):
    import sqlite3
    import json
    try:
        data = await request.json()
        conn = sqlite3.connect('data/pbi_app.db')
        c = conn.cursor()
        c.execute('''CREATE TABLE IF NOT EXISTS history (id INTEGER PRIMARY KEY AUTOINCREMENT, data TEXT)''')
        c.execute('INSERT INTO history (data) VALUES (?)', (json.dumps(data, ensure_ascii=False),))
        conn.commit()
        conn.close()
        return {"success": True}
    except Exception as e:
        return {"success": False, "error": str(e)}

@app.get("/api/db/kv")
async def get_all_kv():
    import sqlite3
    try:
        conn = sqlite3.connect('data/pbi_app.db')
        c = conn.cursor()
        c.execute('''CREATE TABLE IF NOT EXISTS kv_store (key TEXT PRIMARY KEY, value TEXT)''')
        c.execute('SELECT key, value FROM kv_store')
        rows = c.fetchall()
        conn.close()
        data = {r[0]: r[1] for r in rows}
        return {"success": True, "data": data}
    except Exception as e:
        return {"success": False, "error": str(e)}

@app.get("/api/db/kv/{key}")
async def get_kv(key: str):
    import sqlite3
    try:
        conn = sqlite3.connect('data/pbi_app.db')
        c = conn.cursor()
        c.execute('''CREATE TABLE IF NOT EXISTS kv_store (key TEXT PRIMARY KEY, value TEXT)''')
        c.execute('SELECT value FROM kv_store WHERE key=?', (key,))
        row = c.fetchone()
        conn.close()
        if row:
            return {"success": True, "data": row[0]}
    except Exception as e:
        return {"success": False, "error": str(e)}
    return {"success": True, "data": None}

@app.post("/api/db/kv/{key}")
async def set_kv(key: str, request: Request):
    import sqlite3
    try:
        body = await request.json()
        value = body.get('value', '')
        conn = sqlite3.connect('data/pbi_app.db')
        c = conn.cursor()
        c.execute('''CREATE TABLE IF NOT EXISTS kv_store (key TEXT PRIMARY KEY, value TEXT)''')
        c.execute('INSERT OR REPLACE INTO kv_store (key, value) VALUES (?, ?)', (key, value))
        conn.commit()
        conn.close()
        return {"success": True}
    except Exception as e:
        return {"success": False, "error": str(e)}

@app.get("/api/bookmarks")
async def get_bookmarks():
    import sqlite3
    import json
    import os
    try:
        if not os.path.exists('data'):
            os.makedirs('data')
        conn = sqlite3.connect('data/pbi_app.db')
        c = conn.cursor()
        c.execute('''CREATE TABLE IF NOT EXISTS bookmarks 
                     (id INTEGER PRIMARY KEY AUTOINCREMENT, data TEXT)''')
        c.execute('SELECT data FROM bookmarks ORDER BY id DESC LIMIT 1')
        row = c.fetchone()
        conn.close()
        if row:
            return {"success": True, "data": json.loads(row[0])}
    except Exception as e:
        return {"success": False, "error": str(e)}
    return {"success": True, "data": None}

@app.post("/api/bookmarks")
async def sync_bookmarks(request: Request):
    import sqlite3
    import json
    import os
    try:
        data = await request.json()
        if not os.path.exists('data'):
            os.makedirs('data')
        conn = sqlite3.connect('data/pbi_app.db')
        c = conn.cursor()
        c.execute('''CREATE TABLE IF NOT EXISTS bookmarks 
                     (id INTEGER PRIMARY KEY AUTOINCREMENT, data TEXT)''')
        # Just store the entire array as a single JSON blob for the MVP database sync
        c.execute('INSERT INTO bookmarks (data) VALUES (?)', (json.dumps(data, ensure_ascii=False),))
        conn.commit()
        conn.close()
        return {"success": True}
    except Exception as e:
        return {"success": False, "error": str(e)}


@app.get("/api/graph_users")
async def get_graph_users(query: str = ""):
    from msal import ConfidentialClientApplication
    import httpx
    import asyncio
    
    if not query:
        return {"success": False, "error": "Query is empty"}
        
    try:
        from src.config import Config
        cfg = Config()
        client_id = cfg.CLIENT_ID
        client_secret = cfg.CLIENT_SECRET
        tenant_id = cfg.TENANT_ID
        
        if not all([client_id, client_secret, tenant_id]):
            return {"success": False, "error": "Missing credentials in Config."}
            
        authority_url = f"https://login.microsoftonline.com/{tenant_id}"
        app_msal = ConfidentialClientApplication(
            client_id=client_id,
            client_credential=client_secret,
            authority=authority_url,
        )
        result = await asyncio.to_thread(app_msal.acquire_token_for_client, scopes=["https://graph.microsoft.com/.default"])
        
        if "access_token" not in result:
            return {"success": False, "error": "Failed to get Graph token. Ensure User.Read.All is granted."}
            
        token = result["access_token"]
        
        # Call Graph API
        headers = {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}
        safe_q = query.replace("'", "''")
        url = f"https://graph.microsoft.com/v1.0/users?$filter=startswith(displayName,'{safe_q}') or startswith(userPrincipalName,'{safe_q}')&$top=10&$select=id,displayName,userPrincipalName"
        
        async with httpx.AsyncClient() as http_client:
            resp = await http_client.get(url, headers=headers)
            if resp.status_code == 200:
                data = resp.json()
                return {"success": True, "users": data.get("value", [])}
            else:
                return {"success": False, "error": resp.text}
                
    except Exception as e:
        return {"success": False, "error": str(e)}

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
    
    # 拦截自然语言查询 NLQ
    if endpoint == "/api/local-model/nlq":
        from src.dax_executor import get_dynamic_port, execute_dax_via_ps
        try:
            nlq = ""
            if body and "query" in body:
                nlq = body["query"]
            else:
                return {"success": False, "error": "Missing 'query' field in body"}
                
            port = get_dynamic_port()
            
            # Use pre-warmed AI model to translate NLQ to DAX
            global _model_instance
            if not _model_instance:
                return {"success": False, "error": "AI Model not initialized. Please configure API keys."}
                
            prompt = f"""
            You are an expert Power BI DAX developer. The user wants to query the local model with this natural language request:
            "{nlq}"
            
            Write a valid DAX EVALUATE statement to retrieve this data. 
            Do not include any explanation or markdown formatting like ```dax. Just return the raw DAX query text.
            For example, if they ask for top 10 products, return: EVALUATE TOPN(10, 'Dim_Products')
            """
            
            ai_res = await _model_instance.generate_content_async(prompt)
            dax_query = ai_res.text.strip().replace("```dax", "").replace("```", "").strip()
            
            # Execute the generated DAX
            result = await execute_dax_via_ps(port, dax_query)
            
            return {
                "success": True, 
                "dax_generated": dax_query,
                "data": result
            }
        except Exception as e:
            return {"success": False, "error": str(e)}

    # 拦截纯 DAX 执行请求
    if endpoint in ["local-model/instances", "/local-model/instances", "/api/local-model/instances"]:
        from src.dax_executor import get_all_instances
        try:
            instances = get_all_instances()
            return {"success": True, "instances": instances}
        except Exception as e:
            return {"success": False, "error": str(e)}

    if endpoint in ["local-model/dax", "/local-model/dax", "/api/local-model/dax"]:
        from src.dax_executor import get_dynamic_port, execute_dax_via_ps
        try:
            dax = ""
            if body and "query" in body:
                dax = body["query"]
            else:
                return {"success": False, "error": "Missing 'query' field in body"}
                
            port = body.get("port") if body else None
            if not port:
                port = get_dynamic_port()
            result = await execute_dax_via_ps(port, dax)
            
            return {
                "success": True,
                "data": result
            }
        except Exception as e:
            return {"success": False, "error": str(e)}


    # 拦截 MCP 查询请求
    if endpoint == "/api/mcp/query":
        from src.mcp_client import MCPClient
        try:
            mcp = MCPClient()
            await mcp.start()
            arguments = {}
            tool_name = "execute_dax"
            if body:
                arguments = body.get("arguments", {})
                tool_name = body.get("tool_name", "execute_dax")
            result = await mcp.call_tool(f"{tool_name}", arguments)
            await mcp.close()
            return {"success": True, "data": result}
        except Exception as e:
            if 'mcp' in locals() and hasattr(mcp, 'close'):
                await mcp.close()
            return {"success": False, "error": str(e)}

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

@app.post("/api/local-model/instances")
async def api_local_model_instances():
    from src.dax_executor import get_all_instances
    try:
        instances = get_all_instances()
        return {"success": True, "instances": instances}
    except Exception as e:
        return {"success": False, "error": str(e)}

class LocalDaxRequest(BaseModel):
    query: str
    port: Optional[int] = None

@app.post("/api/local-model/dax")
async def api_local_model_dax(req: LocalDaxRequest):
    from src.dax_executor import get_dynamic_port, execute_dax_via_ps
    try:
        port = req.port or get_dynamic_port()
        result = await execute_dax_via_ps(port, req.query)
        return {"success": True, "data": result}
    except Exception as e:
        return {"success": False, "error": str(e)}

@app.post("/api/clear-cache")

async def clear_cache(request: Request):
    """Clear MSAL Token Cache"""
    try:
        cache_file = ".msal_token_cache.json"
        if os.path.exists(cache_file):
            os.remove(cache_file)
        
        # Reset the in-memory cache of the global client
        from msal import SerializableTokenCache  # type: ignore[import-untyped]
        client.cache = SerializableTokenCache()
        
        return {"success": True, "message": "Token cache cleared successfully. You will be prompted to re-authenticate on your next request."}
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
    import requests  # type: ignore[import-untyped]
    from msal import ConfidentialClientApplication  # type: ignore[import-untyped]

    try:
        data = await request.json()
        client_id = data.get("pbi_client_id", "").strip()
        client_secret = data.get("pbi_client_secret", "").strip()
        tenant_id = data.get("pbi_tenant_id", "").strip()
        item_type = data.get("type", "").strip()
        guid = data.get("guid", "").strip()
        workspace_id = data.get("workspace_id", "").strip()

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
        
        endpoints_to_try = []
        if item_type == "groups":
            endpoints_to_try = [
                f"https://api.powerbi.com/v1.0/myorg/admin/groups/{guid}",
                f"https://api.powerbi.com/v1.0/myorg/groups/{guid}"
            ]
        elif item_type in ["datasets", "reports"]:
            if workspace_id:
                endpoints_to_try = [
                    f"https://api.powerbi.com/v1.0/myorg/admin/groups/{workspace_id}/{item_type}/{guid}",
                    f"https://api.powerbi.com/v1.0/myorg/groups/{workspace_id}/{item_type}/{guid}",
                    f"https://api.powerbi.com/v1.0/myorg/admin/{item_type}/{guid}"
                ]
            else:
                endpoints_to_try = [
                    f"https://api.powerbi.com/v1.0/myorg/admin/{item_type}/{guid}"
                ]

        headers = {
            "Authorization": f"Bearer {access_token}",
            "Accept": "application/json"
        }

        resp_data = None
        last_err = ""
        for ep in endpoints_to_try:
            try:
                response = await asyncio.to_thread(requests.get, ep, headers=headers)
                if response.status_code == 200:
                    resp_data = response.json()
                    break
                else:
                    last_err = f"{response.status_code} - {response.text}"
            except Exception as ex:
                last_err = str(ex)

        if resp_data is not None:
            name = resp_data.get("name", "Unknown")
            raw_type = resp_data.get("type") or ("Personal" if resp_data.get("isOnDedicatedCapacity") is False and "type" not in resp_data else "Workspace")
            raw_state = resp_data.get("state") or "Active"
            return {
                "success": True,
                "message": "Valid!",
                "name": name,
                "type": str(raw_type),
                "state": str(raw_state)
            }
        else:
            return {"success": False, "message": f"API Error: {last_err}"}

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
        
        # Candidate endpoints to try in order (Note: Service Principals cannot use /myorg/datasets or /myorg/reports, so we use Admin endpoints or /groups/{id}/ endpoints)
        endpoints_to_try = []
        if item_type == "workspaces":
            endpoints_to_try = [
                "https://api.powerbi.com/v1.0/myorg/admin/groups?$top=5000",
                "https://api.powerbi.com/v1.0/myorg/groups?$top=5000"
            ]
        elif item_type == "datasets":
            if workspace_id:
                endpoints_to_try = [
                    f"https://api.powerbi.com/v1.0/myorg/admin/groups/{workspace_id}/datasets",
                    f"https://api.powerbi.com/v1.0/myorg/groups/{workspace_id}/datasets",
                    "https://api.powerbi.com/v1.0/myorg/admin/datasets?$top=5000"
                ]
            else:
                endpoints_to_try = [
                    "https://api.powerbi.com/v1.0/myorg/admin/datasets?$top=5000"
                ]
        elif item_type == "reports":
            if workspace_id:
                endpoints_to_try = [
                    f"https://api.powerbi.com/v1.0/myorg/admin/groups/{workspace_id}/reports",
                    f"https://api.powerbi.com/v1.0/myorg/groups/{workspace_id}/reports",
                    "https://api.powerbi.com/v1.0/myorg/admin/reports?$top=5000"
                ]
            else:
                endpoints_to_try = [
                    "https://api.powerbi.com/v1.0/myorg/admin/reports?$top=5000"
                ]
        else:
            return {"success": False, "error": "Invalid item type"}

        import requests  # type: ignore[import-untyped]
        headers = {
            "Authorization": f"Bearer {access_token}",
            "Accept": "application/json"
        }
        
        response_data = None
        error_details = []
        for ep in endpoints_to_try:
            try:
                resp = await asyncio.to_thread(requests.get, ep, headers=headers)
                resp.raise_for_status()
                response_data = resp.json()
                break
            except Exception as e:
                error_details.append(f"{ep} -> {str(e)}")

        if response_data is None:
            err_msg = " | ".join(error_details)
            return {"success": False, "error": f"Scan failed. Service Principal may lack permissions or Workspace ID is invalid. Details: {err_msg}"}

        items = response_data.get("value", [])
        result_items = []
        for item in items:
            raw_type = item.get("type") or ("Personal" if item.get("isOnDedicatedCapacity") is False and "type" not in item else "Workspace")
            raw_state = item.get("state") or "Active"
            result_items.append({
                "id": item.get("id"),
                "name": item.get("name") or item.get("id"),
                "type": str(raw_type),
                "state": str(raw_state)
            })
        return {"success": True, "data": result_items}
    except Exception as e:
        return {"success": False, "error": str(e)}

class DeleteNotePayload(BaseModel):
    filename: str

class NotePayload(BaseModel):
    filename: Optional[str] = None
    content: str

@app.post("/api/save-note")
async def save_note(payload: NotePayload):
    try:
        root_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
        notes_dir = os.path.join(root_dir, "notes")
        os.makedirs(notes_dir, exist_ok=True)
        
        raw_filename = payload.filename.strip() if payload.filename and payload.filename.strip() else f"{datetime.now().strftime('%Y%m%d_%H%M%S')}.md"
        # Security: Prevent Path Traversal by extracting only the basename
        filename = os.path.basename(raw_filename)
        if not filename.endswith(".md"):
            filename += ".md"
            
        file_path = os.path.join(notes_dir, filename)
        
        with open(file_path, "w", encoding="utf-8") as f:
            f.write(payload.content)
            
        git_error = None
        try:
            r1 = subprocess.run(["git", "add", f"notes/{filename}"], cwd=root_dir, capture_output=True, text=True)
            if r1.returncode != 0:
                git_error = f"Git Add Error: {r1.stderr.strip()}"
            else:
                r2 = subprocess.run(["git", "commit", "-m", f"docs(notes): add {filename}"], cwd=root_dir, capture_output=True, text=True)
                if r2.returncode != 0 and "nothing to commit" not in r2.stdout and "nothing to commit" not in r2.stderr:
                    git_error = f"Git Commit Error: {r2.stderr.strip() or r2.stdout.strip()}"
                else:
                    r3 = subprocess.run(["git", "push", "origin", "main"], cwd=root_dir, capture_output=True, text=True)
                    if r3.returncode != 0:
                        git_error = f"Git Push Error: {r3.stderr.strip() or r3.stdout.strip()}"
        except Exception as ge:
            git_error = f"Git Subprocess Exception: {str(ge)}"

        if git_error:
            return {"success": False, "error": git_error, "filename": filename, "local_saved": True}

        return {"success": True, "message": f"Successfully saved {filename} and pushed to GitHub!", "filename": filename}
    except Exception as e:
        return {"success": False, "error": f"File Write Error: {str(e)}"}


@app.post("/api/delete-note")
async def delete_note(payload: DeleteNotePayload):
    try:
        root_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
        notes_dir = os.path.join(root_dir, "notes")
        filename = os.path.basename(payload.filename.strip())
        if not filename:
            raise HTTPException(status_code=400, detail="Invalid filename")
        
        file_path = os.path.join(notes_dir, filename)
        if os.path.exists(file_path):
            os.remove(file_path)
            
            def _git_push_note_delete():
                try:
                    subprocess.run(["git", "rm", f"notes/{filename}"], cwd=root_dir, check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
                    subprocess.run(["git", "commit", "-m", f"docs(notes): delete {filename}"], cwd=root_dir, check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
                    subprocess.run(["git", "push", "origin", "main"], cwd=root_dir, check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
                except Exception as e:
                    print(f"Git push note delete failed: {e}")
                    
            asyncio.create_task(asyncio.to_thread(_git_push_note_delete))
            return {"success": True, "message": f"Deleted {filename} and pushing deletion to GitHub."}
        else:
            return {"success": False, "error": "File not found"}
    except Exception as e:
        return {"success": False, "error": str(e)}

@app.get("/api/search-notes")
async def search_notes(q: str = ""):
    try:
        root_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
        notes_dir = os.path.join(root_dir, "notes")
        if not os.path.exists(notes_dir):
            return {"success": True, "results": []}
        
        results: List[Dict[str, Any]] = []
        for filename in os.listdir(notes_dir):
            if filename.endswith(".md"):
                file_path = os.path.join(notes_dir, filename)
                with open(file_path, "r", encoding="utf-8") as f:
                    content = f.read()
                    
                if not q or q.lower() in filename.lower() or q.lower() in content.lower():
                    # extract a snippet if q is present in content
                    snippet = ""
                    if q and q.lower() in content.lower():
                        idx = content.lower().find(q.lower())
                        start = max(0, idx - 40)
                        end = min(len(content), idx + len(q) + 40)
                        snippet = content[start:end].replace('\n', ' ')
                        if start > 0:
                            snippet = "..." + snippet
                        if end < len(content):
                            snippet = snippet + "..."
                    else:
                        snippet = content[:80].replace('\n', ' ') + ("..." if len(content) > 80 else "")
                        
                    results.append({
                        "filename": filename,
                        "snippet": snippet,
                        "mtime": os.path.getmtime(file_path),
                        "content": content
                    })
                    
        # Sort by mtime descending
        results.sort(key=lambda x: x["mtime"], reverse=True)
        return {"success": True, "results": results}
    except Exception as e:
        return {"success": False, "error": str(e)}



@app.get("/api/local_pbi/scan")
def api_scan_local_pbi():
    try:
        instances = scan_local_instances()
        return {"instances": instances}
    except Exception as e:
        return JSONResponse({"error": str(e)}, status_code=500)

class DaxQueryReq(BaseModel):
    port: str
    query: str

@app.post("/api/local_pbi/query")
def api_query_local_pbi(req: DaxQueryReq):
    try:
        res = run_dax_query(req.port, req.query)
        if "error" in res:
            return JSONResponse(res, status_code=500)
        return res
    except Exception as e:
        return JSONResponse({"error": str(e)}, status_code=500)

if __name__ == "__main__":
    main()


@app.post("/api/export_dataset/{workspace_id}/{dataset_id}")
async def export_dataset_queries(workspace_id: str, dataset_id: str, request: Request):
    import asyncio
    import requests
    from msal import ConfidentialClientApplication

    try:
        data = await request.json()
        query = data.get("query", "").strip()
        
        client_id = data.get("pbi_client_id", "").strip() or Config.CLIENT_ID
        client_secret = data.get("pbi_client_secret", "").strip() or Config.CLIENT_SECRET
        tenant_id = data.get("pbi_tenant_id", "").strip() or Config.TENANT_ID

        if not all([client_id, client_secret, tenant_id, query]):
            return {"success": False, "message": "Missing credentials or query. Please check your Global Settings or .env file."}

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
        
        endpoint = f"https://api.powerbi.com/v1.0/myorg/groups/{workspace_id}/datasets/{dataset_id}/executeQueries"
        
        headers = {
            "Authorization": f"Bearer {access_token}",
            "Content-Type": "application/json"
        }
        
        payload = {
            "queries": [{"query": query}],
            "serializerSettings": {"includeNulls": True}
        }
        
        response = await asyncio.to_thread(requests.post, endpoint, headers=headers, json=payload)
        
        if response.status_code == 200:
            resp_data = response.json()
            results = resp_data.get("results", [])
            if results and len(results) > 0:
                tables = results[0].get("tables", [])
                if tables and len(tables) > 0:
                    rows = tables[0].get("rows", [])
                    return {"success": True, "results": rows}
            return {"success": True, "results": []}
        else:
            return {"success": False, "message": f"API Error: {response.status_code} - {response.text}"}

    except Exception as e:
        return {"success": False, "message": f"Server Error: {str(e)}"}


@app.get("/api/harness/tests")
async def get_harness_tests():
    try:
        import re
        tests = []
        with open("tests/e2e.spec.js", "r", encoding="utf-8") as f:
            content = f.read()
            matches = re.findall(r"test\(['\"]([^'\"]+)['\"]", content)
            tests.extend([{"name": m, "type": "playwright"} for m in matches])
        with open("tests/test_backend.py", "r", encoding="utf-8") as f:
            content = f.read()
            matches = re.findall(r"def (test_[^\(]+)", content)
            tests.extend([{"name": m, "type": "pytest"} for m in matches])
        return {"success": True, "tests": tests}
    except Exception as e:
        return {"success": False, "error": str(e)}

@app.post("/api/harness/run")
async def run_harness_tests(request: Request):
    try:
        data = await request.json()
        selected_tests = data.get("tests", [])
        if not selected_tests:
            return {"success": False, "error": "No tests selected"}
        
        playwright_tests = [t["name"] for t in selected_tests if t["type"] == "playwright"]
        pytest_tests = [t["name"] for t in selected_tests if t["type"] == "pytest"]
        
        import subprocess
        results = ""
        
        if playwright_tests:
            # Replace all regex metacharacters with '.' to avoid Playwright test parsing errors
            pattern = "|".join([re.sub(r'[()[\]{}.?*+^$|\\]', '.', t) for t in playwright_tests])
            cmd = f'npx playwright test -g "{pattern}"'
            result = subprocess.run(cmd, shell=True, capture_output=True, text=True)
            results += "\n=== Playwright E2E Tests ===\n"
            results += f"> Executed: {cmd} (Exit Code: {result.returncode})\n\n"
            results += "--- STDOUT ---\n" + (result.stdout or "No STDOUT") + "\n"
            results += "--- STDERR ---\n" + (result.stderr or "No STDERR") + "\n"
            
        if pytest_tests:
            pattern = " or ".join(pytest_tests)
            pytest_cmd = ["pytest", "tests/test_backend.py", "-k", pattern, "-v"]
            result = subprocess.run(pytest_cmd, shell=True, capture_output=True, text=True)
            results += "\n=== Pytest Backend Tests ===\n"
            results += f"> Executed: {' '.join(pytest_cmd)} (Exit Code: {result.returncode})\n\n"
            results += "--- STDOUT ---\n" + (result.stdout or "No STDOUT") + "\n"
            results += "--- STDERR ---\n" + (result.stderr or "No STDERR") + "\n"
            
        return {"success": True, "logs": results}
    except Exception as e:
        return {"success": False, "error": str(e)}

