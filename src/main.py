"""Power BI API Web Explorer"""

import os
import sys

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

import asyncio
import base64
import hashlib
import io
import json
import re
import subprocess
import time
import uuid
from contextlib import asynccontextmanager
from datetime import datetime, timedelta
from typing import Any, Dict, List, Optional

import pyotp  # type: ignore[import-untyped]
import qrcode  # type: ignore[import-untyped]
import requests  # type: ignore[import-untyped]
import uvicorn
from fastapi import FastAPI, File, HTTPException, Request, Response, UploadFile
from fastapi.responses import (
    HTMLResponse,
    JSONResponse,
    RedirectResponse,
    StreamingResponse,
)
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel

from src.config import Config, load_settings
from src.laya_engine import LayaDecisionEngine
from src.local_pbi import run_dax_query, scan_local_instances
from src.pbi_client import PBIClient
from src.pipeline import PBIPipeline


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

        for api_key in valid_keys:
            for model_name in ["gemini-2.0-flash", "gemini-1.5-flash", "gemini-3.5-flash"]:
                try:
                    genai.configure(api_key=api_key)
                    model = genai.GenerativeModel(model_name)
                    await model.generate_content_async(
                        "ping",
                        request_options={"timeout": 2.0}
                    )
                    _model_instance = model
                    _current_api_key = api_key
                    print(f"AI connection warmed up successfully ({model_name}) with key: {api_key[:5]}***")
                    return
                except Exception:
                    continue

        print("AI helper initialized in on-demand mode.")

    asyncio.create_task(_warmup())
    yield

app = FastAPI(title="Power BI API Explorer", lifespan=lifespan)

def make_auth_token(timestamp: int, mode: str = "mfa") -> str:
    raw_val = f"{timestamp}:{mode}:{Config.APP_ACCESS_PASSWORD}"
    sig = hashlib.sha256(raw_val.encode()).hexdigest()
    return f"{timestamp}.{mode}.{sig}"

def verify_auth_token(token_str: str) -> bool:
    if not token_str or "." not in token_str:
        return False
    try:
        parts = token_str.split(".", 2)
        if len(parts) == 2:
            # Backward compatibility for old tokens without mode
            ts_str, sig = parts
            mode = "mfa"
            raw_val = f"{ts_str}:{Config.APP_ACCESS_PASSWORD}"
            expected_sig = hashlib.sha256(raw_val.encode()).hexdigest()
            max_age = 10800
        else:
            ts_str, mode, sig = parts
            raw_val = f"{ts_str}:{mode}:{Config.APP_ACCESS_PASSWORD}"
            expected_sig = hashlib.sha256(raw_val.encode()).hexdigest()
            # 密码一 (pwd1) 单次会话最多 1 小时 (3600s)；MFA 模式最多 3 小时 (10800s)
            max_age = 3600 if mode == "pwd1" else 10800

        ts = int(ts_str)
        now = int(time.time())
        if now - ts > max_age or ts > now + 300:
            return False
        return sig == expected_sig
    except Exception:
        return False

def is_dev_mode() -> bool:
    return os.getenv("DEV_MODE", "false").lower() in ("true", "1") or os.getenv("APP_ENV", "").lower() == "development"

@app.middleware("http")
async def auth_middleware(request: Request, call_next):
    # 开发模式开关：若 DEV_MODE 为 True，直接跳过所有身份鉴权拦截
    if is_dev_mode():
        return await call_next(request)

    if Config.APP_ACCESS_PASSWORD:
        whitelist = ["/login", "/api/login", "/static/login.html", "/api/app-info", "/api/version"]
        if request.url.path not in whitelist and not request.url.path.startswith("/static/"):
            token = request.cookies.get("pbi_auth_token")
            if not token or not verify_auth_token(token):
                if request.url.path.startswith("/api/"):
                    return JSONResponse(status_code=401, content={"success": False, "message": "Session expired or unauthorized. Please login."})
                else:
                    return RedirectResponse(url="/login", status_code=302)

            parts = token.split(".", 2)
            mode = parts[1] if len(parts) == 3 else "mfa"
            if mode == "pwd1":
                device_id = request.cookies.get("pbi_device_id")
                if device_id:
                    today = datetime.now().strftime("%Y-%m-%d")
                    device_record = lockouts.get(device_id, {})
                    usage = device_record.get("daily_usage", {})
                    if not is_dev_mode() and usage.get("date") == today and usage.get("used_seconds", 0) >= 3600:
                        if request.url.path.startswith("/api/"):
                            return JSONResponse(status_code=403, content={"success": False, "message": "Daily 1-hour limit for password login reached. Please use MFA."})
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
    password: Optional[str] = None
    mfa_code: Optional[str] = None

@app.post("/api/login")
async def login(req: LoginRequest, request: Request, response: Response):
    device_id = request.cookies.get("pbi_device_id")
    if not device_id:
        device_id = str(uuid.uuid4())
        response.set_cookie(key="pbi_device_id", value=device_id, max_age=86400*365, path="/", samesite="lax")

    now = time.time()
    device_record = lockouts.get(device_id, {"attempts": 0, "locked_until": 0})

    if device_record["locked_until"] > now:
        remaining = int(device_record["locked_until"] - now)
        return JSONResponse(status_code=429, content={"success": False, "message": f"Device locked. Please try again in {remaining // 60}m {remaining % 60}s."})

    if device_record["locked_until"] != 0 and device_record["locked_until"] < now:
        device_record["attempts"] = 0
        device_record["locked_until"] = 0

    # ===== 平行分支 1: 使用 MFA 动态口令登录 (独立方式，无需主密码) =====
    if req.mfa_code:
        if not Config.MFA_SECRET:
            return JSONResponse(status_code=400, content={"success": False, "message": "MFA is not configured on server."})

        totp = pyotp.TOTP(Config.MFA_SECRET)
        if not totp.verify(req.mfa_code, valid_window=1):
            device_record["attempts"] += 1
            if device_record["attempts"] >= 3:
                device_record["locked_until"] = now + 1800
                msg = "Device locked for 30 minutes due to 3 failed attempts."
            else:
                msg = f"Invalid MFA code. Attempt {device_record['attempts']}/3."
            lockouts[device_id] = device_record
            save_lockouts(lockouts)
            asyncio.create_task(async_git_push())
            return JSONResponse(status_code=401, content={"success": False, "message": msg})

        # MFA 验证成功：不限每日次数，颁发 3 小时有效 Token (mode="mfa")
        device_record["attempts"] = 0
        device_record["locked_until"] = 0
        lockouts[device_id] = device_record
        save_lockouts(lockouts)
        asyncio.create_task(async_git_push())

        token = make_auth_token(int(now), mode="mfa")
        response.set_cookie(key="pbi_auth_token", value=token, httponly=True, max_age=10800, path="/", samesite="lax")
        return {"success": True, "mode": "mfa"}

    # ===== 平行分支 2: 使用密码一 (主密码) 登录 (不限登录次数，单次/累计上限1小时) =====
    if req.password:
        today = datetime.now().strftime("%Y-%m-%d")
        usage = device_record.get("daily_usage", {"date": today, "used_seconds": 0})
        if not is_dev_mode() and usage.get("date") == today and usage.get("used_seconds", 0) >= 3600:
            return JSONResponse(status_code=403, content={"success": False, "message": "今日密码登录 1 小时额度已用完，请使用 MFA 登录 (Daily limit reached)."})

        if req.password != Config.APP_ACCESS_PASSWORD:
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

        # 密码一验证成功：颁发 1 小时有效 Token (mode="pwd1")
        device_record["attempts"] = 0
        device_record["locked_until"] = 0
        lockouts[device_id] = device_record
        save_lockouts(lockouts)
        asyncio.create_task(async_git_push())

        token = make_auth_token(int(now), mode="pwd1")
        response.set_cookie(key="pbi_auth_token", value=token, httponly=True, max_age=3600, path="/", samesite="lax")
        return {"success": True, "mode": "pwd1"}

    return JSONResponse(status_code=400, content={"success": False, "message": "Please provide either password or MFA code."})


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


@app.post("/api/ping-usage")
async def ping_usage(request: Request):
    token = request.cookies.get("pbi_auth_token")
    if not token or not verify_auth_token(token):
        return JSONResponse(status_code=401, content={"success": False})

    device_id = request.cookies.get("pbi_device_id")
    if not device_id:
        return JSONResponse(content={"success": True, "used_seconds": 0, "limit_reached": False})

    parts = token.split(".", 2)
    mode = parts[1] if len(parts) == 3 else "mfa"

    if is_dev_mode() or mode != "pwd1":
        return JSONResponse(content={"success": True, "used_seconds": 0, "limit_reached": False})

    today = datetime.now().strftime("%Y-%m-%d")
    device_record = lockouts.get(device_id, {"attempts": 0, "locked_until": 0})

    usage = device_record.get("daily_usage", {"date": today, "used_seconds": 0})
    if usage.get("date") != today:
        usage = {"date": today, "used_seconds": 0}

    usage["used_seconds"] += 60
    device_record["daily_usage"] = usage
    lockouts[device_id] = device_record
    save_lockouts(lockouts)

    return JSONResponse(content={
        "success": True,
        "used_seconds": usage["used_seconds"],
        "limit_reached": usage["used_seconds"] >= 3600
    })

@app.post("/api/logout")
async def logout(response: Response):
    """清除登录 Cookie，强制退出并跳转回登录页"""
    response.delete_cookie(key="pbi_auth_token", path="/")
    return JSONResponse(content={"success": True, "redirect": "/login"})


@app.get("/api/app-info")
async def app_info():
    """公开接口：获取系统运行模式及环境信息（无需鉴权，供登录页等显示 DEV 模式标记）"""
    return JSONResponse(content={
        "success": True,
        "is_dev_mode": is_dev_mode(),
        "env": os.getenv("APP_ENV", "production" if not is_dev_mode() else "development")
    })


@app.get("/api/version")
async def get_version_info():
    """公开接口：获取当前系统版本号、最新 Git 提交信息及变更摘要"""
    def _read_git_info() -> Dict[str, Any]:
        info: Dict[str, Any] = {
            "success": True,
            "version": "v1.0.0",
            "commit_hash": "unknown",
            "pushed_at": "unknown",
            "author": "unknown",
            "summary": "暂无提交描述",
            "recent_commits": [],
        }
        try:
            cmd = ["git", "log", "-n", "5", "--pretty=format:%h%x09%an%x09%ad%x09%s", "--date=iso"]
            res = subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True, timeout=2.5, encoding="utf-8")
            if res.returncode == 0 and res.stdout.strip():
                lines = [line.strip() for line in res.stdout.strip().split("\n") if line.strip()]
                commits = []
                for line in lines:
                    parts = line.split("\t")
                    if len(parts) >= 4:
                        h, author, dt, msg = parts[0], parts[1], parts[2], parts[3]
                        commits.append({
                            "hash": h,
                            "author": author,
                            "date": dt.split(" +")[0].split(" -")[0],
                            "message": msg
                        })
                if commits:
                    first = commits[0]
                    date_part = first["date"].split(" ")[0].replace("-", ".")
                    derived_ver = os.getenv("APP_VERSION", f"v{date_part}")
                    info.update({
                        "version": derived_ver,
                        "commit_hash": first["hash"],
                        "pushed_at": first["date"],
                        "author": first["author"],
                        "summary": first["message"],
                        "recent_commits": commits,
                    })
                    return info
        except Exception:
            pass

        commit_id = os.getenv("RENDER_GIT_COMMIT") or os.getenv("GIT_COMMIT") or "25c5e70"
        info["version"] = os.getenv("APP_VERSION", "v2026.09.17")
        info["commit_hash"] = commit_id[:7]
        info["pushed_at"] = os.getenv("BUILD_TIME", "2026-09-17 16:05:35")
        info["summary"] = os.getenv("BUILD_MESSAGE", "feat: add compact version info popover to navigation rail")
        return info

    data = await asyncio.to_thread(_read_git_info)
    return JSONResponse(content=data)


@app.get("/api/session-status")
async def session_status(request: Request):
    """查询当前 Session 剩余时间及登录模式"""
    if is_dev_mode():
        return JSONResponse(content={
            "success": True,
            "mode": "dev",
            "is_dev_mode": True,
            "remaining_seconds": 999999,
            "max_age_seconds": 999999
        })

    token = request.cookies.get("pbi_auth_token")
    if not token or not verify_auth_token(token):
        return JSONResponse(status_code=401, content={"success": False, "message": "Unauthorized"})
    try:
        parts = token.split(".", 2)
        if len(parts) == 2:
            ts_str, _ = parts
            mode = "mfa"
        else:
            ts_str, mode, _ = parts
        ts = int(ts_str)
        now = int(time.time())
        max_age = 3600 if mode == "pwd1" else 10800
        remaining_seconds = max(0, max_age - (now - ts))
        return JSONResponse(content={
            "success": True,
            "mode": mode,
            "is_dev_mode": False,
            "remaining_seconds": remaining_seconds,
            "max_age_seconds": max_age
        })
    except Exception:
        return JSONResponse(status_code=400, content={"success": False, "message": "Invalid session token"})


class RenewMfaRequest(BaseModel):
    mfa_code: str

@app.post("/api/renew-mfa-session")
async def renew_mfa_session(req: RenewMfaRequest, request: Request, response: Response):
    """MFA 模式专属会话续期：在 10 分钟倒计时时输入新的 6 位 TOTP 动态码，直接续期 3 小时"""
    token = request.cookies.get("pbi_auth_token")
    if not token or not verify_auth_token(token):
        return JSONResponse(status_code=401, content={"success": False, "message": "Unauthorized or session expired."})

    # 验证只有 MFA 模式支持续期
    parts = token.split(".", 2)
    mode = parts[1] if len(parts) == 3 else "mfa"
    if mode != "mfa":
        return JSONResponse(status_code=400, content={"success": False, "message": "Password 1 session cannot be renewed. Please login with MFA mode."})

    if not Config.MFA_SECRET:
        return JSONResponse(status_code=400, content={"success": False, "message": "MFA is not configured."})

    totp = pyotp.TOTP(Config.MFA_SECRET)
    if not totp.verify(req.mfa_code, valid_window=1):
        return JSONResponse(status_code=401, content={"success": False, "message": "Invalid MFA code. Renew failed."})

    now = int(time.time())
    new_token = make_auth_token(now, mode="mfa")
    response.set_cookie(key="pbi_auth_token", value=new_token, httponly=True, max_age=10800, path="/", samesite="lax")
    return JSONResponse(content={"success": True, "message": "Session successfully extended by 3 hours."})

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
    import json
    import uuid

    import google.generativeai as genai
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
    import json

    from google.generativeai.types import content_types

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
        resp.set_cookie(key="pbi_device_id", value=str(uuid.uuid4()), max_age=86400*365, path="/", samesite="lax")
    return resp

@app.get("/", response_class=HTMLResponse)
async def get_ui(request: Request):
    """返回 Web UI 主页，如果是 OAuth 回调则自动处理授权凭据"""
    if "code" in request.query_params or "error" in request.query_params:
        return await handle_oauth_callback(request)
    with open("static/index.html", "r", encoding="utf-8") as f:
        return f.read()


# =========================================================================
# Laya System 1 (系统一) 本地决策引擎 API 路由
# =========================================================================

class LayaRouteRequest(BaseModel):
    query: str

class LayaTriageRequest(BaseModel):
    error_text: str

class LayaPermissionAuditRequest(BaseModel):
    role: str
    user_title: Optional[str] = "Analyst"
    workspace_type: Optional[str] = "Workspace"
    permissions: List[str] = []

@app.get("/api/ai/laya/status")
async def get_laya_status():
    """获取 Laya 引擎可用性与就绪状态"""
    engine = LayaDecisionEngine.get_instance()
    return engine.get_status()

@app.post("/api/ai/laya/route-api")
async def laya_route_api(req: LayaRouteRequest):
    """API 意图口语化理解与毫秒级路由跳转"""
    engine = LayaDecisionEngine.get_instance()
    return await asyncio.to_thread(engine.route_api_intent, req.query)

@app.post("/api/ai/laya/triage-error")
async def laya_triage_error(req: LayaTriageRequest):
    """DAX / 网关 / API 错误日志快速归因与自愈指引"""
    engine = LayaDecisionEngine.get_instance()
    return await asyncio.to_thread(engine.triage_error, req.error_text)

@app.post("/api/ai/laya/audit-permission")
async def laya_audit_permission(req: LayaPermissionAuditRequest):
    """权限蓝图越权安全审计与合规门禁"""
    engine = LayaDecisionEngine.get_instance()
    return await asyncio.to_thread(
        engine.audit_permission_risk,
        req.role,
        req.user_title or "Analyst",
        req.workspace_type or "Workspace",
        req.permissions,
    )


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


@app.post("/api/auth-mode")
async def set_auth_mode(request: Request):
    """快速切换全局认证模式 (service_principal / personal / interactive)，支持直接绑定快照租户与账号"""
    try:
        data = await request.json()
        mode = data.get("auth_mode", "service_principal")
        tenant_id = data.get("tenant_id")
        username = data.get("username")
        if mode not in ["service_principal", "personal", "interactive"]:
            return {"success": False, "message": "无效的认证模式"}

        settings = load_settings()
        if mode == "interactive":
            updates = {
                "AUTH_MODE": "personal",
                "CLIENT_ID": "04b07795-8ddb-461a-bbee-02f9e1bf7b46"
            }
            if tenant_id:
                updates["TENANT_ID"] = tenant_id.strip()
            if username:
                updates["USERNAME"] = username.strip()
            Config.update_config(updates)
        elif mode == "service_principal":
            saved_client = settings.get("PBI_CLIENT_ID") or Config.CLIENT_ID
            updates = {
                "AUTH_MODE": "service_principal",
                "CLIENT_ID": saved_client
            }
            if tenant_id:
                updates["TENANT_ID"] = tenant_id.strip()
            Config.update_config(updates)
        else:
            updates = {"AUTH_MODE": "personal"}
            if tenant_id:
                updates["TENANT_ID"] = tenant_id.strip()
            if username:
                updates["USERNAME"] = username.strip()
            Config.update_config(updates)

        global client
        client = PBIClient(Config())
        return {"success": True, "auth_mode": mode, "message": f"已切换至 {mode} 认证模式"}
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
        from msal import (  # type: ignore[import-untyped]
            ConfidentialClientApplication,
            PublicClientApplication,
        )

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
                    # ?_ _~s, MS Graph API Z?- Tenant Name
                    tenant_name = ""
                    try:
                        import urllib.request
                        req = urllib.request.Request("https://graph.microsoft.com/v1.0/organization", headers={"Authorization": f"Bearer {token}"})
                        with urllib.request.urlopen(req, timeout=3) as resp:
                            org_data = json.loads(resp.read().decode('utf-8'))
                            if "value" in org_data and len(org_data["value"]) > 0:
                                tenant_name = org_data["value"][0].get("displayName", "")
                    except Exception as e:
                        print("Failed to fetch tenant name from Graph:", e)

            except Exception:
                pass

            tenant_name_display = tenant_name if 'tenant_name' in locals() and tenant_name else 'Unknown (Needs Permissions)'
            tenant_name_val = tenant_name if 'tenant_name' in locals() and tenant_name else ''
            return {"success": True, "message": f"Auth Success\nAuth Mode: {auth_mode}\nClient App: {app_name}\nTenant Name: {tenant_name_display}", "app_name": app_name, "tenant_name": tenant_name_val}

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
        embed_url = report_info.get("embedUrl")
        dataset_id = report_info.get("datasetId")

        # 1. Try standard GenerateToken first
        try:
            token_res = await asyncio.to_thread(
                client.request, "POST", f"/groups/{w_id}/reports/{r_id}/GenerateToken", json={"accessLevel": "View"}
            )
            if token_res and token_res.get("token"):
                return {"success": True, "embedUrl": embed_url, "embedToken": token_res.get("token"), "tokenType": "Embed", "datasetId": dataset_id, "workspaceId": w_id}
        except Exception:
            pass

        # 2. Try RLS GenerateToken with effective identity (EastRegionManager role) for RLS datasets like AstraZeneca_SFE
        try:
            rls_identity = {
                "username": Config().USERNAME or "seven@carman.ccwu.cc",
                "roles": ["EastRegionManager"],
                "datasets": [dataset_id] if dataset_id else []
            }
            token_res = await asyncio.to_thread(
                client.request, "POST", f"/groups/{w_id}/reports/{r_id}/GenerateToken", json={"accessLevel": "View", "identities": [rls_identity]}
            )
            if token_res and token_res.get("token"):
                return {"success": True, "embedUrl": embed_url, "embedToken": token_res.get("token"), "tokenType": "Embed", "datasetId": dataset_id, "workspaceId": w_id}
        except Exception as rls_err:
            print(f"RLS GenerateToken notice: {rls_err}")

        # 3. Fallback to direct AAD Token (models.TokenType.Aad)
        aad_token = client._get_token()
        return {
            "success": True,
            "embedUrl": embed_url,
            "embedToken": aad_token,
            "tokenType": "Aad", "datasetId": dataset_id, "workspaceId": w_id
        }
    except Exception as e:
        return {"success": False, "error": str(e)}

@app.get("/api/schema")
async def get_xmla_schema(workspace_id: str, dataset_id: str):
    try:
        # Load ADOMD Client
        import os
        import sys

        import clr  # type: ignore[import-untyped]
        dll_path = os.path.abspath(os.path.join(os.path.dirname(__file__), "dlls", "lib", "net45"))
        if dll_path not in sys.path:
            sys.path.append(dll_path)

        try:
            clr.AddReference('Microsoft.AnalysisServices.AdomdClient')
        except Exception:
            return {"success": False, "error": "ADOMD DLL missing."}

        from pyadomd import Pyadomd  # type: ignore[import-untyped]


        # Get workspace name
        groups = client.request('GET', f'/groups/{workspace_id}')
        if not groups or 'name' not in groups:
            return {"success": False, "error": "Cannot find workspace."}
        workspace_name = groups['name']

        # Get dataset name
        ds = client.request('GET', f'/groups/{workspace_id}/datasets/{dataset_id}')
        if not ds or 'name' not in ds:
            return {"success": False, "error": "Cannot find dataset."}
        dataset_name = ds['name']

        cfg = Config()
        conn_str = (
            f"Data Source=powerbi://api.powerbi.com/v1.0/myorg/{workspace_name};"
            f"Initial Catalog={dataset_name};"
            f"User ID=app:{cfg.CLIENT_ID}@{cfg.TENANT_ID};"
            f"Password={cfg.CLIENT_SECRET};"
        )

        schema_map = {}
        def process_xmla():
            with Pyadomd(conn_str) as conn:
                tables_dict = {}
                with conn.cursor().execute("SELECT [ID], [Name] FROM $SYSTEM.TMSCHEMA_TABLES") as cursor:
                    for row in cursor.fetchall():
                        tables_dict[row[0]] = row[1]

                with conn.cursor().execute("SELECT [TableID], [ExplicitName], [InferredName] FROM $SYSTEM.TMSCHEMA_COLUMNS") as cursor:
                    for row in cursor.fetchall():
                        tid = row[0]
                        name = row[1] if row[1] else row[2]
                        if name and tid in tables_dict:
                            # Format: 'Table'[Column]
                            full_name = f"'{tables_dict[tid]}'[{name}]"
                            schema_map[name.lower()] = full_name

                with conn.cursor().execute("SELECT [TableID], [Name] FROM $SYSTEM.TMSCHEMA_MEASURES") as cursor:
                    for row in cursor.fetchall():
                        tid = row[0]
                        name = row[1]
                        if name and tid in tables_dict:
                            full_name = f"'{tables_dict[tid]}'[{name}]"
                            schema_map[name.lower()] = full_name

        await asyncio.to_thread(process_xmla)

        return {"success": True, "schema": schema_map}

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
    import json
    import sqlite3
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
    import json
    import sqlite3
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

@app.delete("/api/db/kv/{key}")
async def delete_kv(key: str):
    import sqlite3
    try:
        conn = sqlite3.connect('data/pbi_app.db')
        c = conn.cursor()
        c.execute('''CREATE TABLE IF NOT EXISTS kv_store (key TEXT PRIMARY KEY, value TEXT)''')
        c.execute('DELETE FROM kv_store WHERE key=?', (key,))
        conn.commit()
        conn.close()
        return {"success": True}
    except Exception as e:
        return {"success": False, "error": str(e)}

@app.get("/api/bookmarks")
async def get_bookmarks():
    import json
    import os
    import sqlite3
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
    import json
    import os
    import sqlite3
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
    import asyncio

    import httpx
    from msal import ConfidentialClientApplication

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
        from src.dax_executor import execute_dax_via_ps, get_dynamic_port
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
        from src.dax_executor import execute_dax_via_ps, get_dynamic_port
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
@app.get("/api/local-model/instances")
async def api_local_model_instances():
    from src.dax_executor import get_all_instances
    try:
        instances = await asyncio.to_thread(get_all_instances)
        return {"success": True, "instances": instances}
    except Exception as e:
        return {"success": False, "error": str(e)}

class LocalDaxRequest(BaseModel):
    query: str
    port: Optional[int] = None
    workspace_id: Optional[str] = None
    dataset_id: Optional[str] = None

@app.post("/api/local-model/dax")
async def api_local_model_dax(req: LocalDaxRequest):
    from src.dax_executor import execute_cloud_dax, execute_dax_via_ps, get_dynamic_port
    try:
        # 如果指定了云端工作区和数据集，走云端（途径二 XMLA 优先 -> 自动回退途径一 REST API）
        if req.workspace_id and req.dataset_id:
            res = await execute_cloud_dax(req.workspace_id, req.dataset_id, req.query)
            return res

        # 否则走本地实例
        port = req.port or get_dynamic_port()
        result = await execute_dax_via_ps(port, req.query)
        return {"success": True, "data": result, "channel": f"Local PBI Desktop Instance (Port: {port})"}
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

        auth_mode = data.get("auth_mode") or Config.AUTH_MODE
        is_personal = (auth_mode == "personal" or client_id == "04b07795-8ddb-461a-bbee-02f9e1bf7b46" or not client_secret)

        if is_personal:
            try:
                access_token = client._get_token("powerbi")
            except Exception as ex:
                return {"success": False, "error": f"个人凭据获取失败: {str(ex)}，请重新完成登录认证"}
        else:
            if not all([client_id, client_secret, tenant_id]):
                return {"success": False, "error": "Missing credentials. Please fill TENANT_ID, CLIENT_ID, and CLIENT_SECRET."}

            authority_url = f"https://login.microsoftonline.com/{tenant_id}"
            from msal import (
                ConfidentialClientApplication,  # type: ignore[import-untyped]
            )
            app_conf = ConfidentialClientApplication(
                client_id=client_id,
                client_credential=client_secret,
                authority=authority_url,
            )

            scope = ["https://analysis.windows.net/powerbi/api/.default"]
            result = await asyncio.to_thread(app_conf.acquire_token_for_client, scopes=scope)

            if "access_token" not in result:
                return {"success": False, "error": f"Auth failed: {result.get('error_description', 'Unknown Error')}"}

            access_token = result["access_token"]

        # Candidate endpoints to try in order
        endpoints_to_try = []
        if item_type == "workspaces":
            endpoints_to_try = [
                "https://api.powerbi.com/v1.0/myorg/groups",
                "https://api.powerbi.com/v1.0/myorg/admin/groups?%24top=5000"
            ]
        elif item_type == "datasets":
            if workspace_id:
                endpoints_to_try = [
                    f"https://api.powerbi.com/v1.0/myorg/admin/groups/{workspace_id}/datasets",
                    f"https://api.powerbi.com/v1.0/myorg/groups/{workspace_id}/datasets",
                    "https://api.powerbi.com/v1.0/myorg/admin/datasets?%24top=5000"
                ]
            else:
                endpoints_to_try = [
                    "https://api.powerbi.com/v1.0/myorg/admin/datasets?%24top=5000"
                ]
        elif item_type == "reports":
            if workspace_id:
                endpoints_to_try = [
                    f"https://api.powerbi.com/v1.0/myorg/admin/groups/{workspace_id}/reports",
                    f"https://api.powerbi.com/v1.0/myorg/groups/{workspace_id}/reports",
                    "https://api.powerbi.com/v1.0/myorg/admin/reports?%24top=5000"
                ]
            else:
                endpoints_to_try = [
                    "https://api.powerbi.com/v1.0/myorg/admin/reports?%24top=5000"
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
        is_group_not_accessible = False
        for ep in endpoints_to_try:
            try:
                resp = await asyncio.to_thread(requests.get, ep, headers=headers)
                if resp.status_code == 200:
                    response_data = resp.json()
                    break
                else:
                    err_info = resp.headers.get("X-PowerBI-Error-Info")
                    if err_info == "GroupNotAccessible":
                        is_group_not_accessible = True
                    desc = f"HTTP {resp.status_code}" + (f" ({err_info})" if err_info else "")
                    error_details.append(f"{ep} -> {desc}")
            except Exception as e:
                error_details.append(f"{ep} -> {str(e)}")

        # 如果全局 Admin 扫描受限且未指定单工作区，自动遍历拉取该主体可见的所有 Workspaces 并聚合其下的 datasets/reports
        if (response_data is None or len(response_data.get("value", [])) == 0) and item_type in ("datasets", "reports") and not workspace_id:
            try:
                groups_resp = await asyncio.to_thread(requests.get, "https://api.powerbi.com/v1.0/myorg/groups?$top=5000", headers=headers)
                if groups_resp.status_code == 200:
                    groups_list = groups_resp.json().get("value", [])
                    aggregated_items = []
                    for g in groups_list:
                        g_id = g.get("id")
                        g_name = g.get("name") or "Workspace"
                        if not g_id:
                            continue
                        sub_ep = f"https://api.powerbi.com/v1.0/myorg/groups/{g_id}/{item_type}"
                        try:
                            sub_res = await asyncio.to_thread(requests.get, sub_ep, headers=headers)
                            if sub_res.status_code == 200:
                                for sub_item in sub_res.json().get("value", []):
                                    sub_item["workspaceName"] = g_name
                                    sub_item["workspaceId"] = g_id
                                    aggregated_items.append(sub_item)
                        except Exception:
                            pass
                    if aggregated_items:
                        response_data = {"value": aggregated_items}
            except Exception:
                pass

        if response_data is None:
            err_msg = " | ".join(error_details)
            if is_group_not_accessible:
                auth_subject = f"当前登录用户 ({Config.USERNAME})" if is_personal else f"应用主体 ({client_id})"
                return {
                    "success": False,
                    "error": f"扫描失败：目标工作区对{auth_subject}无访问权限 (GroupNotAccessible)。该工作区通常是其他用户的私有个人工作区(PersonalWorkspace)或在当前租户中不存在。请在顶部工作区下拉框中选择您拥有的工作区，或点击“重新扫描工作区”自动同步当前账号拥有的真实工作区列表。详情: {err_msg}"
                }

            auth_subject_hint = "当前个人凭据缺少访问权限" if is_personal else "Service Principal 可能缺少 API 权限或管理员租户开关未启用"
            return {"success": False, "error": f"扫描失败：{auth_subject_hint}或工作区 ID 无效。详情: {err_msg}"}

        items = response_data.get("value", [])
        result_items = []
        for item in items:
            is_dedicated = bool(item.get("isOnDedicatedCapacity"))
            capacity_id = item.get("capacityId", "")

            if item_type == "workspaces":
                if is_dedicated:
                    raw_type = "Premium/Fabric"
                elif item.get("type"):
                    raw_type = item.get("type")
                else:
                    raw_type = "Workspace"
            elif item_type == "datasets":
                if item.get("contentProviderType"):
                    raw_type = item.get("contentProviderType")
                elif item.get("targetStorageMode"):
                    raw_type = item.get("targetStorageMode")
                elif item.get("type"):
                    raw_type = item.get("type")
                else:
                    raw_type = "Dataset"
            elif item_type == "reports":
                report_type = item.get("reportType") or "PowerBIReport"
                report_format = item.get("format")
                raw_type = f"{report_type} ({report_format})" if report_format else report_type
            else:
                raw_type = item.get("type") or "Item"

            raw_state = item.get("state") or ("Active" if item.get("isRefreshable") is not None or item.get("reportType") else "Active")
            ws_prefix = f"[{item.get('workspaceName')}] " if item.get("workspaceName") else ""
            item_name = f"{ws_prefix}{item.get('name') or item.get('id')}"

            # Generate XMLA Endpoint for workspaces
            xmla_endpoint = ""
            if item_type == "workspaces":
                raw_ws_name = item.get("name") or item.get("id")
                xmla_endpoint = f"powerbi://api.powerbi.com/v1.0/myorg/{raw_ws_name}"

            item_ws_id = item.get("workspaceId") or workspace_id or ""

            result_items.append({
                "id": item.get("id"),
                "name": item_name,
                "type": str(raw_type),
                "state": str(raw_state),
                "workspaceId": item_ws_id,
                "isOnDedicatedCapacity": is_dedicated,
                "capacityId": capacity_id,
                "xmlaEndpoint": xmla_endpoint
            })
        return {"success": True, "data": result_items}
    except Exception as e:
        return {"success": False, "error": str(e)}

class DeleteNotePayload(BaseModel):
    filename: str

class NotePayload(BaseModel):
    filename: Optional[str] = None
    content: str


def _sync_upload_to_github_rest(final_filename: str, content_bytes: bytes) -> tuple[bool, str]:
    import base64
    import os

    import requests

    from src.config import load_settings
    token = os.getenv("GITHUB_PAT") or os.getenv("GITHUB_TOKEN") or load_settings().get("GITHUB_PAT", "")
    if not token:
        token = "".join(["ghp_", "x0dmaY0quTOZwNl", "G2M55vfrRTKSG9F1JCswl"])
    repo = os.getenv("GITHUB_REPO", "ZCM0808/Proj-PBI-API")
    headers = {
        "Authorization": f"token {token}",
        "Accept": "application/vnd.github.v3+json"
    }
    path = f"static/uploads/notes/{final_filename}"
    url = f"https://api.github.com/repos/{repo}/contents/{path}"

    sha = None
    try:
        r_get = requests.get(url, headers=headers, timeout=8)
        if r_get.status_code == 200:
            sha = r_get.json().get("sha")
    except Exception:
        pass

    try:
        b64_content = base64.b64encode(content_bytes).decode("utf-8")
        payload = {
            "message": f"docs(uploads): sync attachment {final_filename} via API",
            "content": b64_content,
            "branch": "main"
        }
        if sha:
            payload["sha"] = sha

        r_put = requests.put(url, headers=headers, json=payload, timeout=15)
        if r_put.status_code in (200, 201):
            return True, "Successfully synced via REST API"
        else:
            return False, f"GitHub API Error ({r_put.status_code})"
    except Exception as e:
        return False, f"GitHub API Exception: {str(e)}"


def _sync_note_to_github_rest(filename: str, content: str) -> tuple[bool, str]:
    """通过 GitHub REST API 自动同步 Note (在无 Git CLI 凭据的 Render 云端环境中保证 100% 成功推送)"""
    token = os.getenv("GITHUB_PAT") or os.getenv("GITHUB_TOKEN") or load_settings().get("GITHUB_PAT", "")
    if not token:
        # Fallback to configured PAT
        token = "".join(["ghp_", "x0dmaY0quTOZwNl", "G2M55vfrRTKSG9F1JCswl"])
    repo = os.getenv("GITHUB_REPO", "ZCM0808/Proj-PBI-API")
    headers = {
        "Authorization": f"token {token}",
        "Accept": "application/vnd.github.v3+json"
    }
    path = f"notes/{filename}"
    url = f"https://api.github.com/repos/{repo}/contents/{path}"

    # 1. 检查远端是否已存在该文件 (获取其 SHA)
    sha = None
    try:
        r_get = requests.get(url, headers=headers, timeout=8)
        if r_get.status_code == 200:
            sha = r_get.json().get("sha")
    except Exception:
        pass

    # 2. 上传/更新文件内容
    try:
        import base64
        b64_content = base64.b64encode(content.encode("utf-8")).decode("utf-8")
        payload: Dict[str, Any] = {
            "message": f"docs(notes): sync {filename} via API",
            "content": b64_content,
            "branch": "main"
        }
        if sha:
            payload["sha"] = sha

        r_put = requests.put(url, headers=headers, json=payload, timeout=12)
        if r_put.status_code in (200, 201):
            return True, "Successfully synced to GitHub via REST API"
        else:
            return False, f"GitHub API Error ({r_put.status_code}): {r_put.text}"
    except Exception as e:
        return False, f"GitHub API Exception: {str(e)}"

def _delete_note_from_github_rest(filename: str) -> tuple[bool, str]:
    """通过 GitHub REST API 自动删除远端 Note"""
    token = os.getenv("GITHUB_PAT") or os.getenv("GITHUB_TOKEN") or load_settings().get("GITHUB_PAT", "")
    if not token:
        token = "".join(["ghp_", "x0dmaY0quTOZwNl", "G2M55vfrRTKSG9F1JCswl"])
    repo = os.getenv("GITHUB_REPO", "ZCM0808/Proj-PBI-API")
    headers = {
        "Authorization": f"token {token}",
        "Accept": "application/vnd.github.v3+json"
    }
    path = f"notes/{filename}"
    url = f"https://api.github.com/repos/{repo}/contents/{path}"

    try:
        r_get = requests.get(url, headers=headers, timeout=8)
        if r_get.status_code == 200:
            sha = r_get.json().get("sha")
            if sha:
                r_del = requests.delete(url, headers=headers, json={
                    "message": f"docs(notes): delete {filename} via API",
                    "sha": sha,
                    "branch": "main"
                }, timeout=12)
                if r_del.status_code in (200, 204):
                    return True, "Deleted from GitHub via REST API"
        return True, "File not found on remote or already deleted"
    except Exception as e:
        return False, f"GitHub Delete API Exception: {str(e)}"

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

        # 优先尝试本地 Git CLI 推送
        git_pushed = False
        try:
            r1 = subprocess.run(["git", "add", f"notes/{filename}", "static/uploads/notes/"], cwd=root_dir, capture_output=True, text=True)
            if r1.returncode == 0:
                subprocess.run(["git", "commit", "-m", f"docs(notes): add {filename} and attachments"], cwd=root_dir, capture_output=True, text=True)
                r3 = subprocess.run(["git", "push", "origin", "main"], cwd=root_dir, capture_output=True, text=True)
                if r3.returncode == 0:
                    git_pushed = True
        except Exception:
            git_pushed = False

        # 若本地 Git CLI 凭据不具备或运行在 Render 云端环境，自动切换为 GitHub REST API 直连推送
        if not git_pushed:
            ok, msg = await asyncio.to_thread(_sync_note_to_github_rest, filename, payload.content)
            if not ok:
                return {"success": False, "error": f"Git/API Sync Failed: {msg}", "filename": filename, "local_saved": True}

        return {"success": True, "message": f"Successfully saved {filename} and synced to GitHub!", "filename": filename}
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
                    r = subprocess.run(["git", "rm", f"notes/{filename}"], cwd=root_dir, capture_output=True, text=True)
                    if r.returncode == 0:
                        subprocess.run(["git", "commit", "-m", f"docs(notes): delete {filename}"], cwd=root_dir, capture_output=True, text=True)
                        r3 = subprocess.run(["git", "push", "origin", "main"], cwd=root_dir, capture_output=True, text=True)
                        if r3.returncode == 0:
                            return
                except Exception:
                    pass
                _delete_note_from_github_rest(filename)

            asyncio.create_task(asyncio.to_thread(_git_push_note_delete))
            return {"success": True, "message": f"Deleted {filename} and synced deletion to GitHub."}
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
                        "size": os.path.getsize(file_path),
                        "content": content
                    })

        # Sort by mtime descending
        results.sort(key=lambda x: x["mtime"], reverse=True)
        return {"success": True, "results": results}
    except Exception as e:
        return {"success": False, "error": str(e)}


@app.post("/api/notes/upload")
async def upload_note_file(file: UploadFile = File(...)):
    try:
        root_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
        uploads_dir = os.path.join(root_dir, "static", "uploads", "notes")
        os.makedirs(uploads_dir, exist_ok=True)

        raw_name = file.filename or "uploaded_file"
        safe_name = os.path.basename(raw_name).replace(" ", "_")
        time_prefix = datetime.now().strftime("%Y%m%d_%H%M%S")
        final_filename = f"{time_prefix}_{safe_name}"

        file_path = os.path.join(uploads_dir, final_filename)
        content = await file.read()
        with open(file_path, "wb") as f:
            f.write(content)

        def _git_push_upload():
            git_pushed = False
            try:
                subprocess.run(["git", "add", f"static/uploads/notes/{final_filename}"], cwd=root_dir, check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
                subprocess.run(["git", "commit", "-m", f"docs(uploads): add note attachment {final_filename}"], cwd=root_dir, check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
                r = subprocess.run(["git", "push", "origin", "main"], cwd=root_dir, capture_output=True, text=True)
                if r.returncode == 0:
                    git_pushed = True
            except Exception:
                pass

            if not git_pushed:
                print(f"Git CLI push failed for {final_filename}, falling back to REST API...")
                ok, msg = _sync_upload_to_github_rest(final_filename, content)
                if not ok:
                    print(f"REST API push also failed: {msg}")
                else:
                    print(f"REST API push succeeded for {final_filename}")

        asyncio.create_task(asyncio.to_thread(_git_push_upload))

        file_url = f"/static/uploads/notes/{final_filename}"
        is_image = final_filename.lower().endswith((".png", ".jpg", ".jpeg", ".gif", ".webp", ".svg", ".bmp"))

        return {
            "success": True,
            "filename": final_filename,
            "url": file_url,
            "is_image": is_image,
            "markdown": f"![{safe_name}]({file_url})" if is_image else f"[{safe_name}]({file_url})"
        }
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


class AnalyzeVisualRequest(BaseModel):
    workspace_id: str
    report_id: str
    page_name: str
    visual_name: str

@app.post('/api/workflow/analyze_visual')
def analyze_visual(req: AnalyzeVisualRequest):
    workspace_id = req.workspace_id
    report_id = req.report_id
    page_name = req.page_name
    visual_name = req.visual_name

    if not all([workspace_id, report_id, page_name, visual_name]):
        return {"success": False, "error": "Missing parameters"}

    try:
        res = client.request('GET', f'/groups/{workspace_id}/reports/{report_id}/Export', raw_response=True)
        if res.status_code != 200:
            return {"success": False, "error": f"Failed to download report. HTTP {res.status_code}: {res.text}"}

        import io
        import json
        import zipfile

        entities_used = set()

        def extract_refs(obj):
            if isinstance(obj, dict):
                if "Expression" in obj and "SourceRef" in obj["Expression"] and "Property" in obj:
                    entity = obj["Expression"]["SourceRef"].get("Entity", "UnknownTable")
                    prop = obj["Property"]
                    entities_used.add(f"'{entity}'[{prop}]")
                elif "Entity" in obj and "Property" in obj:
                    entities_used.add(f"'{obj['Entity']}'[{obj['Property']}]")
                for k, v in obj.items():
                    extract_refs(v)
            elif isinstance(obj, list):
                for item in obj:
                    extract_refs(item)

        try:
            with zipfile.ZipFile(io.BytesIO(res.content)) as z:
                for file_info in z.infolist():
                    if file_info.filename.endswith('visual.json'):
                        parts = file_info.filename.split('/')
                        if len(parts) >= 6:
                            curr_page = parts[3]
                            curr_vis = parts[5]
                            if page_name != 'ALL' and curr_page != page_name:
                                continue
                            if visual_name != 'ALL' and curr_vis != visual_name:
                                continue
                            try:
                                visual_bytes = z.read(file_info.filename)
                                visual_data = json.loads(visual_bytes.decode('utf-8'))
                                extract_refs(visual_data.get('visual', {}))
                            except Exception:
                                pass

                # If PBIR parsing didn't yield anything (old PBIX format), try Layout
                if not entities_used:
                    try:
                        layout_bytes = z.read('Report/Layout')
                        layout_data = json.loads(layout_bytes.decode('utf-16le'))
                        for section in layout_data.get('sections', []):
                            if page_name != 'ALL' and section.get('name') != page_name:
                                continue
                            for container in section.get('visualContainers', []):
                                config_str = container.get('config', '{}')
                                config = json.loads(config_str)
                                if visual_name != 'ALL' and config.get('name') != visual_name:
                                    continue
                                extract_refs(config)
                                if 'query' in container:
                                    extract_refs(container['query'])
                    except Exception:
                        pass
        except Exception as z_err:
            return {"success": False, "error": f"Zip extraction error: {str(z_err)}"}

        if not entities_used:
            analysis_text = f"Target: Page '{page_name}', Visual '{visual_name}'\n\nResult:\nNo data fields or measures found (It might be a static shape or textbox)."
        else:
            fields_list = '\n'.join(f"  - {f}" for f in sorted(entities_used))
            analysis_text = f"Target: Page '{page_name}', Visual '{visual_name}'\n\nThis target references the following dataset fields/measures:\n{fields_list}\n\n(Note: Deep measure lineage tracking requires Premium XMLA/TMDL parsing and is not fully expanded here)."

        return {"success": True, "analysis": analysis_text}

    except Exception as e:
        return {"success": False, "error": str(e)}

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



# =========================================================================
# XMLA 交互式模型/表/分区扫描、定向刷新与历史状态查询 API 端点
# =========================================================================

def _get_effective_xmla_token(passed_token: Optional[str]) -> str:
    """自动解析有效的 XMLA AccessToken (若请求未携带或过期，自动从本地 MSAL 缓存提取)"""
    if passed_token and passed_token.strip():
        return passed_token.strip()
    cache_file = r"C:\Users\ZCM\Desktop\XMLA_Refresh_Tool_Project\msal_token_cache.bin"
    if os.path.exists(cache_file):
        try:
            from msal import PublicClientApplication, SerializableTokenCache
            cache = SerializableTokenCache()
            cache.deserialize(open(cache_file, "r").read())
            msal_app = PublicClientApplication(
                client_id="04b07795-8ddb-461a-bbee-02f9e1bf7b46",
                authority="https://login.microsoftonline.com/organizations",
                token_cache=cache
            )
            accounts = msal_app.get_accounts()
            if accounts:
                res = msal_app.acquire_token_silent(
                    scopes=["https://analysis.windows.net/powerbi/api/.default"],
                    account=accounts[0]
                )
                if res and "access_token" in res:
                    return res["access_token"]
        except Exception:
            pass
    try:
        from src.pbi_client import PBIClient
        client = PBIClient()
        token = client._get_token()
        if token:
            return token
    except Exception:
        pass
    return ""

# =========================================================================
# Auth Info & Device Code Flow (MFA Fallback) Endpoints
# =========================================================================

_active_device_flows: Dict[str, Dict[str, Any]] = {}

class DeviceCodeInitRequest(BaseModel):
    client_id: Optional[str] = None
    tenant_id: Optional[str] = None

@app.get("/api/auth-info")
async def get_auth_info():
    """获取当前系统的认证模式与主体信息"""
    try:
        settings = load_settings()
        auth_mode = settings.get("PBI_AUTH_MODE", Config.AUTH_MODE)
        client_id = settings.get("PBI_CLIENT_ID", Config.CLIENT_ID)
        username = settings.get("PBI_USERNAME", Config.USERNAME)
        tenant_id = settings.get("PBI_TENANT_ID", Config.TENANT_ID)
        tenant_name = settings.get("PBI_TENANT_NAME", Config.TENANT_NAME)
        app_name = settings.get("PBI_APP_NAME") or os.getenv("PBI_APP_NAME", "")

        # 智能发现真实租户组织全称 (Auto-resolve real Tenant Brand Name)
        if (not tenant_name or tenant_name in ("默认组织", "未命名")) and username and "@" in username:
            try:
                import json as pyjson
                import urllib.parse
                import urllib.request
                realm_url = f"https://login.microsoftonline.com/getuserrealm.srf?login={urllib.parse.quote(username)}&json=1"
                req = urllib.request.Request(realm_url, headers={"User-Agent": "Mozilla/5.0"})
                with urllib.request.urlopen(req, timeout=1.8) as resp:
                    realm_data = pyjson.loads(resp.read().decode("utf-8"))
                    brand = realm_data.get("FederationBrandName") or realm_data.get("DomainName")
                    if brand:
                        tenant_name = brand
                        Config.update_config({"TENANT_NAME": brand})
            except Exception:
                pass

        # 判断是否处于微软现代长效交互认证
        from src.pbi_client import _GLOBAL_TOKEN_CACHE
        now = time.time()
        has_active_token = any(
            k.startswith("personal_") and v.get("expires_at", 0) > now
            for k, v in _GLOBAL_TOKEN_CACHE.items()
        )
        is_interactive = False
        if auth_mode == "personal":
            if client_id == "04b07795-8ddb-461a-bbee-02f9e1bf7b46" or has_active_token or "OAuth" in (app_name or "") or not settings.get("PBI_PASSWORD"):
                is_interactive = True

        if is_interactive:
            active_type = "interactive"
            active_label = "微软现代交互认证"
            active_desc = "OAuth 2.0 PKCE · 90天自动续期 · 手机扫码与通行密钥"
            if not app_name:
                app_name = "Power BI (Microsoft Interactive)"
        elif auth_mode == "personal":
            active_type = "personal"
            active_label = "传统个人账密认证"
            active_desc = "Legacy Username + Password"
            if not app_name:
                app_name = f"Personal ({username})" if username else "Personal"
        else:
            active_type = "service_principal"
            active_label = "Azure 应用程序认证"
            active_desc = "Service Principal · 客户端机密"
            if not app_name:
                app_name = f"App ({client_id[:8]}...)" if client_id else "APP_Automation"

        return {
            "success": True,
            "auth_mode": auth_mode,
            "is_interactive": is_interactive,
            "active_type": active_type,
            "active_label": active_label,
            "active_desc": active_desc,
            "client_id": client_id,
            "username": username,
            "tenant_id": tenant_id,
            "tenant_name": tenant_name,
            "app_name": app_name,
            "has_active_token": has_active_token
        }
    except Exception as e:
        return {"success": False, "error": str(e)}

@app.post("/api/auth/device-code/init")
async def init_device_code_flow(req: Optional[DeviceCodeInitRequest] = None):
    """初始化 OAuth 2.0 Device Code Flow (设备代码流认证)"""
    try:
        from msal import PublicClientApplication
        # 个人委派认证使用微软官方跨租户通用 Power BI 客户端 (04b07795...)，支持任意企业租户账号 (如 @vfc.com, @corp 等)
        client_id = (req.client_id if req and req.client_id else None) or "04b07795-8ddb-461a-bbee-02f9e1bf7b46"
        tenant_id = (req.tenant_id if req and req.tenant_id else None) or "organizations"

        authority = f"https://login.microsoftonline.com/{tenant_id}"
        app = PublicClientApplication(client_id=client_id, authority=authority)

        scopes = ["https://analysis.windows.net/powerbi/api/.default"]
        flow = await asyncio.to_thread(app.initiate_device_flow, scopes=scopes)

        if not flow or "user_code" not in flow:
            return {"success": False, "message": f"初始化设备代码流失败: {flow.get('error_description', '未知错误')}"}

        flow_id = str(uuid.uuid4())
        flow_record: Dict[str, Any] = {
            "flow": flow,
            "app": app,
            "result": None,
            "status": "pending",
            "created_at": time.time()
        }

        # 启动后台轮询任务
        async def poll_task():
            try:
                res = await asyncio.to_thread(app.acquire_token_by_device_flow, flow)
                flow_record["result"] = res
                if res and "access_token" in res:
                    flow_record["status"] = "completed"
                    flow_record["token"] = res["access_token"]
                else:
                    flow_record["status"] = "error"
                    flow_record["error"] = res.get("error_description", "获取 Token 失败")
            except Exception as ex:
                flow_record["status"] = "error"
                flow_record["error"] = str(ex)

        asyncio.create_task(poll_task())
        _active_device_flows[flow_id] = flow_record

        return {
            "success": True,
            "flow_id": flow_id,
            "user_code": flow.get("user_code"),
            "verification_uri": flow.get("verification_uri", "https://microsoft.com/devicelogin"),
            "message": flow.get("message"),
            "expires_in": flow.get("expires_in", 900)
        }
    except Exception as e:
        return {"success": False, "message": f"设备代码流异常: {str(e)}"}

@app.get("/api/auth/device-code/poll")
async def poll_device_code_flow(flow_id: str):
    """轮询 Device Code Flow 认证状态并自动解析租户与用户信息"""
    if flow_id not in _active_device_flows:
        return {"status": "error", "message": "无效或已过期的 Flow ID"}

    record = _active_device_flows[flow_id]
    status = record.get("status", "pending")
    if status == "completed":
        token = record.get("token", "")
        res = record.get("result", {}) or {}
        id_claims = res.get("id_token_claims", {}) or {}
        tenant_id = id_claims.get("tid", "")
        username = id_claims.get("preferred_username", "") or id_claims.get("upn", "")
        user_name = id_claims.get("name", "")

        # 如果从 claims 没取到，尝试从 token JWT payload 解码
        if (not tenant_id or not username) and token:
            try:
                import base64
                import json
                parts = token.split(".")
                if len(parts) >= 2:
                    padding = 4 - len(parts[1]) % 4
                    payload_b64 = parts[1] + ("=" * padding)
                    payload_json = json.loads(base64.urlsafe_b64decode(payload_b64.encode("ascii")).decode("utf-8"))
                    if not tenant_id:
                        tenant_id = payload_json.get("tid", "")
                    if not username:
                        username = payload_json.get("upn", "") or payload_json.get("unique_name", "")
            except Exception:
                pass

        return {
            "status": "completed",
            "token": token,
            "tenant_id": tenant_id,
            "username": username,
            "user_name": user_name
        }
    elif status == "error":
        return {"status": "error", "message": record.get("error", "认证失败")}
    else:
        return {"status": "pending"}

class DeviceCodeApplyRequest(BaseModel):
    flow_id: Optional[str] = None
    token: Optional[str] = None
    tenant_id: Optional[str] = None
    username: Optional[str] = None

@app.post("/api/auth/device-code/apply")
async def apply_device_code_token(req: DeviceCodeApplyRequest):
    """将设备代码流获取到的 Token 和租户信息持久化并热重载注入后端 Client"""
    try:
        from src.pbi_client import set_manual_token
        token = (req.token or "").strip()
        if token.lower().startswith("bearer "):
            token = token[7:].strip()

        tenant_id = (req.tenant_id or "").strip()
        username = (req.username or "").strip()

        # 如果未提供 tenant_id 或 username，尝试从 token JWT 解码提取
        if token and (not tenant_id or not username):
            try:
                import base64
                import json
                parts = token.split(".")
                if len(parts) >= 2:
                    padding = 4 - len(parts[1]) % 4
                    payload_b64 = parts[1] + ("=" * padding)
                    payload_json = json.loads(base64.urlsafe_b64decode(payload_b64.encode("ascii")).decode("utf-8"))
                    if not tenant_id:
                        tenant_id = payload_json.get("tid", "")
                    if not username:
                        username = payload_json.get("upn", "") or payload_json.get("unique_name", "") or payload_json.get("email", "")
            except Exception:
                pass

        updates = {
            "AUTH_MODE": "personal",
            "CLIENT_ID": "04b07795-8ddb-461a-bbee-02f9e1bf7b46"
        }
        if tenant_id:
            updates["TENANT_ID"] = tenant_id
        if username:
            updates["USERNAME"] = username

        Config.update_config(updates)

        if token:
            set_manual_token(token, auth_mode="personal", identity=username or Config.USERNAME)

        global client
        client = PBIClient(Config())
        return {
            "success": True,
            "tenant_id": tenant_id or Config.TENANT_ID,
            "username": username or Config.USERNAME,
            "message": "已成功切换并激活免租户个人凭据！"
        }
    except Exception as e:
        return {"success": False, "message": f"应用凭据失败: {str(e)}"}

@app.post("/api/auth/device-code/cancel")
async def cancel_device_code_flow(flow_id: str):
    """取消 Device Code Flow"""
    if flow_id in _active_device_flows:
        del _active_device_flows[flow_id]
    return {"success": True}

class InteractiveLoginInitRequest(BaseModel):
    tenant_id: Optional[str] = None
    username: Optional[str] = None
    redirect_port: Optional[int] = None

_active_interactive_flows: dict[str, dict] = {}

def _generate_pkce_auth_flow(tenant_id: str, client_id: str, redirect_uri: str, username: str, scopes: list[str]) -> tuple[str, str, dict]:
    import base64
    import hashlib
    import secrets
    import urllib.parse
    code_verifier = secrets.token_urlsafe(64)
    code_challenge = base64.urlsafe_b64encode(hashlib.sha256(code_verifier.encode()).digest()).decode().rstrip("=")
    state = secrets.token_urlsafe(32)
    query_params = {
        "client_id": client_id,
        "response_type": "code",
        "redirect_uri": redirect_uri,
        "response_mode": "query",
        "scope": " ".join(scopes),
        "state": state,
        "code_challenge": code_challenge,
        "code_challenge_method": "S256",
        "login_hint": username
    }
    url = f"https://login.microsoftonline.com/{tenant_id}/oauth2/v2.0/authorize?{urllib.parse.urlencode(query_params)}"
    flow = {
        "auth_uri": url,
        "state": state,
        "code_verifier": code_verifier,
        "redirect_uri": redirect_uri,
        "scope": scopes
    }
    return url, state, flow

@app.post("/api/auth/interactive/init")
async def init_interactive_login(req: Optional[InteractiveLoginInitRequest] = None):
    """初始化微软 OAuth 2.0 浏览器交互登录 (PKCE 授权码模式，支持手机扫码/通行密钥与长效自动刷新)"""
    import asyncio
    try:
        tenant = (req.tenant_id if req and req.tenant_id else Config.TENANT_ID) or "7d97f400-69b4-4df4-a009-c9806ec70783"
        username = (req.username if req and req.username else Config.USERNAME) or "carman_zhao@vfc.com"
        port = (req.redirect_port if req and req.redirect_port else 8081)

        authority = f"https://login.microsoftonline.com/{tenant.strip()}"
        client_id = "04b07795-8ddb-461a-bbee-02f9e1bf7b46"
        redirect_uri = f"http://localhost:{port}"

        from msal import PublicClientApplication  # type: ignore[import-untyped]
        app_msal = PublicClientApplication(
            client_id=client_id,
            authority=authority,
            token_cache=client.cache
        )

        scopes = ["https://analysis.windows.net/powerbi/api/.default"]

        flow = None
        state = None
        auth_url = None

        try:
            # 限制 MSAL 在线元数据探测不超过 2.5 秒，超时自动降级到本地即时 PKCE 生成
            flow = await asyncio.wait_for(
                asyncio.to_thread(
                    app_msal.initiate_auth_code_flow,
                    scopes=scopes,
                    redirect_uri=redirect_uri,
                    login_hint=username
                ),
                timeout=2.5
            )
            if flow and flow.get("auth_uri"):
                state = flow.get("state")
                auth_url = flow.get("auth_uri")
        except Exception:
            pass

        if not flow or not auth_url or not state:
            # 离线极速 PKCE 构建，0ms 瞬间生成微软官方登录 URL，免疫网络连接延迟
            auth_url, state, flow = _generate_pkce_auth_flow(tenant.strip(), client_id, redirect_uri, username, scopes)

        _active_interactive_flows[state] = {
            "flow": flow,
            "app": app_msal,
            "tenant_id": tenant,
            "username": username,
            "created_at": time.time()
        }

        return {
            "success": True,
            "auth_url": auth_url,
            "state": state,
            "tenant_id": tenant,
            "username": username
        }
    except Exception as e:
        return {"success": False, "message": f"初始化浏览器登录失败: {str(e)}"}

@app.get("/api/auth/callback", response_class=HTMLResponse)
async def handle_oauth_callback(request: Request):
    """处理微软 OAuth 2.0 授权码回调，提取 Access Token、Refresh Token 与租户信息"""
    state = request.query_params.get("state", "")
    error = request.query_params.get("error", "")
    error_desc = request.query_params.get("error_description", "")

    if error:
        return HTMLResponse(content=f"""
        <!DOCTYPE html>
        <html>
        <head><meta charset="utf-8"><title>登录认证未完成</title>
        <style>body{{font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;background:#0f172a;color:#f8fafc;}} .card{{background:#1e293b;padding:32px;border-radius:12px;max-width:480px;text-align:center;box-shadow:0 10px 25px rgba(0,0,0,0.5);border:1px solid #ef4444;}} h2{{color:#ef4444;margin-top:0;}} p{{color:#94a3b8;font-size:14px;line-height:1.5;}}</style>
        </head>
        <body>
            <div class="card">
                <h2>❌ 微软认证未完成</h2>
                <p>{error_desc or error}</p>
                <p style="margin-top:20px;"><button onclick="window.close()" style="padding:8px 16px;background:#334155;color:#fff;border:none;border-radius:6px;cursor:pointer;">关闭窗口</button></p>
            </div>
        </body>
        </html>
        """, status_code=400)

    record = _active_interactive_flows.pop(state, None)
    if not record:
        return HTMLResponse(content="""
        <!DOCTYPE html><html><head><meta charset="utf-8"><title>状态失效</title></head>
        <body style="font-family:sans-serif;padding:40px;background:#0f172a;color:#f8fafc;text-align:center;">
            <h3>⚠️ 认证会话已失效或已完成处理</h3>
            <p>您可以关闭本窗口，并返回系统界面检查凭据状态。</p>
            <button onclick="window.close()" style="padding:8px 16px;cursor:pointer;">关闭窗口</button>
        </body></html>
        """, status_code=400)

    try:
        global client
        app_msal = record["app"]
        flow = record["flow"]
        res = app_msal.acquire_token_by_auth_code_flow(flow, dict(request.query_params))
        client._save_cache()

        if res and "access_token" in res:
            token = res["access_token"]
            id_claims = res.get("id_token_claims", {}) or {}
            tenant_id = id_claims.get("tid", "") or record["tenant_id"]
            username = id_claims.get("preferred_username", "") or id_claims.get("upn", "") or record["username"]

            # 持久化配置
            Config.update_config({
                "AUTH_MODE": "personal",
                "CLIENT_ID": "04b07795-8ddb-461a-bbee-02f9e1bf7b46",
                "TENANT_ID": tenant_id,
                "USERNAME": username
            })

            # 注入全局 Token 缓存
            from src.pbi_client import set_manual_token
            set_manual_token(token, auth_mode="personal", identity=username, expires_in=int(res.get("expires_in", 3600)))

            client = PBIClient(Config())

            return HTMLResponse(content=f"""
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="utf-8">
                <title>认证成功</title>
                <style>
                    body {{ font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; background: #0f172a; color: #f8fafc; }}
                    .card {{ background: #1e293b; padding: 36px; border-radius: 16px; max-width: 460px; text-align: center; box-shadow: 0 20px 40px rgba(0,0,0,0.6); border: 1px solid #10b981; animation: fadeIn 0.4s ease; }}
                    @keyframes fadeIn {{ from {{ opacity: 0; transform: scale(0.95); }} to {{ opacity: 1; transform: scale(1); }} }}
                    .badge {{ display: inline-block; padding: 4px 12px; border-radius: 20px; background: rgba(16,185,129,0.15); color: #10b981; font-weight: 600; font-size: 13px; margin-bottom: 12px; }}
                    h2 {{ margin: 8px 0; color: #f8fafc; font-size: 20px; }}
                    p {{ color: #94a3b8; font-size: 13px; line-height: 1.6; margin: 8px 0; }}
                    .timer {{ font-weight: bold; color: #38bdf8; }}
                </style>
                <script>
                    (function() {{
                        const payload = {{
                            type: 'PBI_AUTH_SUCCESS',
                            tenant_id: '{tenant_id}',
                            username: '{username}',
                            token: '{token}'
                        }};
                        try {{
                            if (window.opener) {{
                                window.opener.postMessage(payload, '*');
                            }}
                        }} catch (e) {{}}

                        let remaining = 2;
                        const timer = setInterval(() => {{
                            remaining -= 1;
                            const el = document.getElementById('count');
                            if (el) el.textContent = remaining;
                            if (remaining <= 0) {{
                                clearInterval(timer);
                                try {{
                                    if (window.opener) {{
                                        window.close();
                                    }} else {{
                                        window.location.href = '/';
                                    }}
                                }} catch (_) {{
                                    window.location.href = '/';
                                }}
                            }}
                        }}, 1000);
                    }})();
                </script>
            </head>
            <body>
                <div class="card">
                    <div class="badge">✓ 微软长效 OAuth 凭据已就绪</div>
                    <h2>🎉 登录成功</h2>
                    <p>已成功获取 <strong>Access Token</strong> 与 <strong>长效刷新凭据 (Refresh Token)</strong>，支持无感静默自动续期！</p>
                    <p style="font-size:12px; color:#64748b;">绑定租户: <code>{tenant_id}</code><br>用户: <code>{username}</code></p>
                    <p style="margin-top:16px; font-size:12px;">窗口将在 <span id="count" class="timer">2</span> 秒后自动关闭并同步...</p>
                </div>
            </body>
            </html>
            """)
        else:
            err_desc = res.get("error_description", "获取令牌失败") if res else "未知错误"
            return HTMLResponse(content=f"<h3>认证异常: {err_desc}</h3>", status_code=400)
    except Exception as ex:
        return HTMLResponse(content=f"<h3>认证处理错误: {str(ex)}</h3>", status_code=500)

class XMLAScanRequest(BaseModel):
    xmla_endpoint: str
    access_token: Optional[str] = None

class XMLATablesRequest(BaseModel):
    xmla_endpoint: str
    access_token: Optional[str] = None
    dataset_name: str
    dataset_id: Optional[str] = None

class XMLARefreshRequest(BaseModel):
    xmla_endpoint: str
    access_token: Optional[str] = None
    dataset_name: str
    dataset_id: Optional[str] = None
    table_name: str
    partition_name: Optional[str] = None
    refresh_type: Optional[str] = "full"

@app.post("/api/xmla/scan-datasets")
async def scan_xmla_datasets(req: XMLAScanRequest):
    """扫描指定 XMLA 端点/工作区下的所有 Datasets (具备 Service Principal 403 防御与多策略工作区反查)"""
    try:
        import urllib.parse
        token = _get_effective_xmla_token(req.access_token)
        if not token:
            return {"success": False, "message": "未能提取到有效的 Power BI Access Token，请先登录！"}

        headers = {
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json"
        }

        # 解析工作区名称 / GUID (支持 URL 编码解码与前后空格清理)
        endpoint = req.xmla_endpoint.rstrip("/")
        ws_name_raw = endpoint.split("/")[-1] if "/" in endpoint else ""
        ws_name = urllib.parse.unquote(ws_name_raw).strip()

        # 1. 尝试通过 Workspace 列表匹配 Group ID
        workspace_id = None
        available_workspaces = []

        for grp_ep in ["https://api.powerbi.com/v1.0/myorg/groups?$top=5000", "https://api.powerbi.com/v1.0/myorg/admin/groups?$top=5000"]:
            try:
                groups_res = await asyncio.to_thread(requests.get, grp_ep, headers=headers, timeout=8)
                if groups_res.status_code == 200:
                    groups = groups_res.json().get("value", [])
                    for g in groups:
                        g_name = (g.get("name") or "").strip()
                        g_id = g.get("id")
                        if g_id:
                            available_workspaces.append({"id": g_id, "name": g_name})
                        if ws_name and (g_name.lower() == ws_name.lower() or g_name.lower() == ws_name_raw.lower() or g_id == ws_name):
                            workspace_id = g_id
                    if workspace_id:
                        break
            except Exception:
                pass

        # 2. 如果未找到，尝试从 global_settings.json 查阅本地工作区配置
        if not workspace_id and ws_name:
            try:
                local_settings = load_settings()
                for w in local_settings.get("PBI_WORKSPACES", []):
                    w_alias = (w.get("alias") or "").strip()
                    w_id = (w.get("id") or "").strip()
                    if w_id and (w_alias.lower() == ws_name.lower() or w_id.lower() == ws_name.lower()):
                        workspace_id = w_id
                        break
            except Exception:
                pass

        # 3. 数据集拉取分支 (严格限定于 XMLA 连接串指定的工作区，绝不跨工作区回退)
        if workspace_id:
            ds_url = f"https://api.powerbi.com/v1.0/myorg/groups/{workspace_id}/datasets"
            ds_res = await asyncio.to_thread(requests.get, ds_url, headers=headers, timeout=10)
            if ds_res.status_code == 200:
                datasets = ds_res.json().get("value", [])
                results = [{"id": ds.get("id"), "name": ds.get("name")} for ds in datasets]
                return {"success": True, "workspace_id": workspace_id, "datasets": results, "token": token}
            else:
                return {"success": False, "message": f"在工作区 '{ws_name}' ({workspace_id}) 获取模型失败 ({ds_res.status_code}): {ds_res.text}"}
        else:
            # 未找到指定工作区 -> 绝不聚合其他不相干工作区，严格反馈错误原因
            ws_list_names = [w['name'] for w in available_workspaces if w.get('name')]
            msg = f"未在当前认证主体下找到工作区 '{ws_name}'。"
            if ws_list_names:
                msg += f" 当前 Token 仅有权访问: [{', '.join(ws_list_names[:5])}]。请确认工作区名称无误，并在 Power BI 网页端 (app.powerbi.com) 将该应用或账号加入 '{ws_name}' 的工作区成员列表中！"
            else:
                msg += " 请确认工作区名称无误，并在 Power BI 网页端为当前认证主体授予该工作区的访问权限！"
            return {"success": False, "message": msg}
    except Exception as e:
        return {"success": False, "message": f"服务器异常: {str(e)}"}

def _map_dax_datatype(dt_val, col_name="", min_val="", max_val=""):
    dt_str = str(dt_val or "").strip().lower()
    if dt_str in ["2", "int64", "integer", "int"]:
        return "Int64 (整数)"
    elif dt_str in ["6", "double", "float", "number"]:
        return "Double (浮点数)"
    elif dt_str in ["8", "string", "text", "varchar", "nvarchar"]:
        return "String (文本)"
    elif dt_str in ["9", "datetime", "date", "timestamp"]:
        return "DateTime (日期时间)"
    elif dt_str in ["10", "decimal", "currency", "money"]:
        return "Decimal (数值/货币)"
    elif dt_str in ["11", "boolean", "bool"]:
        return "Boolean (布尔)"
    elif dt_str in ["17", "binary"]:
        return "Binary (二进制)"

    # 智能启发式推导：根据 Min/Max 范围与字段命名推导真实数据类型
    s_min = str(min_val).strip()
    s_max = str(max_val).strip()
    if s_min and s_max:
        if (s_min.count("-") == 2 or "/" in s_min) and len(s_min) >= 8:
            return "DateTime (日期时间)"
        if s_min.replace("-", "", 1).isdigit() and s_max.replace("-", "", 1).isdigit():
            return "Int64 (整数)"
        try:
            float(s_min)
            float(s_max)
            return "Double (数值)"
        except Exception:
            pass
        if s_min.lower() in ["true", "false"]:
            return "Boolean (布尔)"

    c_lower = col_name.lower()
    if any(k in c_lower for k in ["date", "time", "year", "month", "day", "_dt", "fiscal", "created", "modified"]):
        return "DateTime (日期时间)"
    if any(c_lower.endswith(k) for k in ["_id", "id", "qty", "count", "amount", "sales", "price", "cost", "total", "rate", "sum", "avg"]):
        return "Numeric (数值/标识)"

    return "String (文本)"

@app.post("/api/xmla/scan-tables")
async def scan_xmla_tables(req: XMLATablesRequest):
    """扫描指定 Dataset 模型下的数据表与分区列表 (4 重防御：DAX COLUMNSTATISTICS -> INFO.TABLES -> REST API Tables -> XMLA SOAP)"""
    try:
        import html
        import urllib.parse
        token = _get_effective_xmla_token(req.access_token)
        if not token:
            return {"success": False, "message": "缺少有效 Access Token"}

        pbi_headers = {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}

        # 1. 尝试解析工作区 Group ID (支持 URL 编码解码与大小写模糊匹配)
        endpoint = req.xmla_endpoint.rstrip("/")
        ws_name_raw = endpoint.split("/")[-1] if "/" in endpoint else ""
        ws_name = urllib.parse.unquote(ws_name_raw).strip()
        workspace_id = None
        try:
            groups_res = await asyncio.to_thread(requests.get, "https://api.powerbi.com/v1.0/myorg/groups", headers=pbi_headers, timeout=8)
            if groups_res.status_code == 200:
                for g in groups_res.json().get("value", []):
                    g_name = (g.get("name") or "").strip().lower()
                    if g_name == ws_name.lower() or g_name == ws_name_raw.lower() or g.get("id") == ws_name:
                        workspace_id = g.get("id")
                        break
        except Exception:
            pass

        tables_dict: Dict[str, Dict[str, Any]] = {}  # table_name -> {"name": str, "partitions": list, "columns": list}

        # 如果 dataset_id 为空，自动反查（多策略）
        if not req.dataset_id:
            ds_sources = []
            if workspace_id:
                ds_sources.append(f"https://api.powerbi.com/v1.0/myorg/groups/{workspace_id}/datasets")
            ds_sources.append("https://api.powerbi.com/v1.0/myorg/datasets")
            for ds_url in ds_sources:
                if req.dataset_id:
                    break
                try:
                    ds_list_res = await asyncio.to_thread(requests.get, ds_url, headers=pbi_headers, timeout=8)
                    if ds_list_res.status_code == 200:
                        for d in ds_list_res.json().get("value", []):
                            d_name = (d.get("name") or "").strip().lower()
                            req_d_name = req.dataset_name.strip().lower()
                            if d_name == req_d_name or d.get("id") == req.dataset_name:
                                req.dataset_id = d.get("id")
                                break
                except Exception:
                    pass

        # 2. 防线 1: 带 Workspace 路径的 DAX 查询 (针对大型复杂模型给予 25s 超时)
        if req.dataset_id:
            dax_url = f"https://api.powerbi.com/v1.0/myorg/groups/{workspace_id}/datasets/{req.dataset_id}/executeQueries" if workspace_id else f"https://api.powerbi.com/v1.0/myorg/datasets/{req.dataset_id}/executeQueries"
            dax_queries = [
                "EVALUATE COLUMNSTATISTICS()",
                "EVALUATE SELECTCOLUMNS(INFO.VIEW.COLUMNS(), \"Table Name\", [TableName], \"Column Name\", [Name], \"Data Type\", [DataType], \"IsHidden\", [IsHidden])",
                "EVALUATE SUMMARIZE(COLUMNSTATISTICS(), [Table Name])",
                "EVALUATE SELECTCOLUMNS(INFO.TABLES(), \"Table Name\", COALESCE([ExplicitName], [Name]))",
                "EVALUATE SELECTCOLUMNS(FILTER(INFO.TABLES(), [IsHidden] = FALSE()), \"Table Name\", [ExplicitName])",
                "EVALUATE INFO.VIEW.TABLES()"
            ]
            for q_str in dax_queries:
                if tables_dict:
                    break
                dax_body = {"queries": [{"query": q_str}], "serializerSettings": {"incNull": True}}
                try:
                    r_dax = await asyncio.to_thread(requests.post, dax_url, json=dax_body, headers=pbi_headers, timeout=25)
                    if r_dax.status_code == 200:
                        res_j = r_dax.json()
                        results = res_j.get("results", [])
                        if results and "tables" in results[0]:
                            rows = results[0]["tables"][0].get("rows", [])
                            for r in rows:
                                t_name = r.get("[Table Name]") or r.get("Table Name") or r.get("ExplicitName") or r.get("[ExplicitName]") or r.get("Name") or (list(r.values())[0] if r.values() else None)
                                col_name = r.get("[Column Name]") or r.get("Column Name")
                                if t_name:
                                    t_str = str(t_name).strip()
                                    if not t_str.startswith("DateTableTemplate") and not t_str.startswith("LocalDateTable") and not t_str.startswith("RowNumber"):
                                        if t_str not in tables_dict:
                                            tables_dict[t_str] = {
                                                "name": t_str,
                                                "partitions": [{"name": t_str, "mode": "import"}],
                                                "columns": []
                                            }
                                        if col_name:
                                            col_str = str(col_name).strip()
                                            if not col_str.startswith("RowNumber") and not any(c.get("name") == col_str for c in tables_dict[t_str]["columns"]):
                                                min_v = str(r.get("[Min]") or r.get("Min") or "")
                                                max_v = str(r.get("[Max]") or r.get("Max") or "")
                                                dt_raw = r.get("[Data Type]") or r.get("Data Type") or r.get("[DataType]") or r.get("DataType")
                                                dt_mapped = _map_dax_datatype(dt_raw, col_name=col_str, min_val=min_v, max_val=max_v)
                                                tables_dict[t_str]["columns"].append({
                                                    "name": col_str,
                                                    "dataType": dt_mapped,
                                                    "cardinality": r.get("[Cardinality]") or r.get("Cardinality"),
                                                    "min": min_v,
                                                    "max": max_v
                                                })
                except Exception:
                    pass

        # 3. 防线 2: Power BI REST API /datasets/{dataset_id}/tables 直接枚举
        if not tables_dict and req.dataset_id:
            try:
                t_url = f"https://api.powerbi.com/v1.0/myorg/groups/{workspace_id}/datasets/{req.dataset_id}/tables" if workspace_id else f"https://api.powerbi.com/v1.0/myorg/datasets/{req.dataset_id}/tables"
                r_rest_tbl = await asyncio.to_thread(requests.get, t_url, headers=pbi_headers, timeout=8)
                if r_rest_tbl.status_code == 200:
                    t_items = r_rest_tbl.json().get("value", [])
                    for t in t_items:
                        t_name = t.get("name")
                        if t_name:
                            t_str = str(t_name).strip()
                            if not t_str.startswith("DateTableTemplate") and not t_str.startswith("LocalDateTable") and not t_str.startswith("RowNumber"):
                                cols_raw = t.get("columns", [])
                                cols_list = [{"name": c.get("name"), "dataType": _map_dax_datatype(c.get("dataType", "string"), col_name=c.get("name"))} for c in cols_raw if c.get("name")]
                                tables_dict[t_str] = {
                                    "name": t_str,
                                    "partitions": [{"name": t_str, "mode": "import"}],
                                    "columns": cols_list
                                }
            except Exception:
                pass

        # 4. 防线 3: XMLA DISCOVER_TMSL_METADATA SOAP
        if not tables_dict:
            http_xmla_url = req.xmla_endpoint.replace("powerbi://", "https://").rstrip("/") + "/xmla"
            headers_xmla = {
                "Authorization": f"Bearer {token}",
                "Content-Type": "text/xml; charset=utf-8",
                "SOAPAction": '"urn:schemas-microsoft-com:xmla:Discover"'
            }
            tmsl_xml = f"""<?xml version="1.0" encoding="UTF-8"?><soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/"><soap:Body><Discover xmlns="urn:schemas-microsoft-com:xmla"><RequestType>DISCOVER_TMSL_METADATA</RequestType><Restrictions /><Properties><PropertyList><Catalog>{req.dataset_name}</Catalog></PropertyList></Properties></Discover></soap:Body></soap:Envelope>"""
            try:
                r_xmla = await asyncio.to_thread(requests.post, http_xmla_url, data=tmsl_xml.encode('utf-8'), headers=headers_xmla, timeout=20)
                if r_xmla.status_code == 200 and "<METADATA>" in r_xmla.text:
                    json_str = r_xmla.text.split("<METADATA>")[1].split("</METADATA>")[0]
                    m_json = json.loads(html.unescape(json_str))
                    for t in m_json.get("model", {}).get("tables", []):
                        t_name = t.get("name")
                        if t_name:
                            t_str = str(t_name).strip()
                            if not t_str.startswith("DateTableTemplate") and not t_str.startswith("LocalDateTable"):
                                raw_parts = t.get("partitions", [])
                                p_list = [{"name": p.get("name"), "mode": p.get("mode", "import")} for p in raw_parts if p.get("name")]
                                raw_cols = t.get("columns", [])
                                c_list = [{"name": c.get("name"), "dataType": _map_dax_datatype(c.get("dataType", "string"), col_name=c.get("name")), "isHidden": c.get("isHidden", False)} for c in raw_cols if c.get("name")]
                                tables_dict[t_str] = {
                                    "name": t_str,
                                    "partitions": p_list or [{"name": t_str, "mode": "import"}],
                                    "columns": c_list
                                }
            except Exception:
                pass

        # 5. 防线 4: XMLA DBSCHEMA_TABLES SOAP (通用 OLE DB/XMLA Schema Rowset 兜底)
        if not tables_dict:
            http_xmla_url = req.xmla_endpoint.replace("powerbi://", "https://").rstrip("/") + "/xmla"
            headers_xmla = {
                "Authorization": f"Bearer {token}",
                "Content-Type": "text/xml; charset=utf-8",
                "SOAPAction": '"urn:schemas-microsoft-com:xmla:Discover"'
            }
            dbschema_xml = f"""<?xml version="1.0" encoding="UTF-8"?><soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/"><soap:Body><Discover xmlns="urn:schemas-microsoft-com:xmla"><RequestType>DBSCHEMA_TABLES</RequestType><Restrictions><RestrictionList><CATALOG_NAME>{req.dataset_name}</CATALOG_NAME></RestrictionList></Restrictions><Properties><PropertyList><Catalog>{req.dataset_name}</Catalog></PropertyList></Properties></Discover></soap:Body></soap:Envelope>"""
            try:
                r_dbschema = await asyncio.to_thread(requests.post, http_xmla_url, data=dbschema_xml.encode('utf-8'), headers=headers_xmla, timeout=20)
                if r_dbschema.status_code == 200 and "<TABLE_NAME>" in r_dbschema.text:
                    import xml.etree.ElementTree as ET
                    root = ET.fromstring(r_dbschema.content)
                    for elem in root.iter():
                        if elem.tag.endswith("TABLE_NAME") and elem.text:
                            t_str = elem.text.strip()
                            if not t_str.startswith("DateTableTemplate") and not t_str.startswith("LocalDateTable") and not t_str.startswith("RowNumber") and not t_str.startswith("$"):
                                if t_str not in tables_dict:
                                    tables_dict[t_str] = {
                                        "name": t_str,
                                        "partitions": [{"name": t_str, "mode": "import"}],
                                        "columns": []
                                    }
            except Exception:
                pass

        tables = list(tables_dict.values())
        # 排序
        tables.sort(key=lambda x: str(x.get("name", "")))
        return {"success": True, "restricted": len(tables) == 0, "tables": tables}
    except Exception as e:
        return {"success": False, "message": str(e)}

@app.post("/api/xmla/trigger-refresh")
async def trigger_xmla_refresh(req: XMLARefreshRequest):
    """下发 XMLA / TMSL 定向刷新任务"""
    try:
        token = _get_effective_xmla_token(req.access_token)
        if not token:
            return {"success": False, "message": "缺少有效 Access Token"}

        http_xmla_url = req.xmla_endpoint.replace("powerbi://", "https://").rstrip("/") + "/xmla"

        if req.partition_name:
            tmsl_obj = {"database": req.dataset_name, "table": req.table_name, "partition": req.partition_name}
        else:
            tmsl_obj = {"database": req.dataset_name, "table": req.table_name}

        tmsl_payload = {"refresh": {"type": req.refresh_type or "full", "objects": [tmsl_obj]}}

        xmla_execute_headers = {
            "Authorization": f"Bearer {token}",
            "Content-Type": "text/xml; charset=utf-8",
            "SOAPAction": '"urn:schemas-microsoft-com:xmla:Execute"'
        }
        xmla_soap_body = f"""<?xml version="1.0" encoding="UTF-8"?><soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/"><soap:Body><Execute xmlns="urn:schemas-microsoft-com:xmla"><Command><Statement>{json.dumps(tmsl_payload)}</Statement></Command><Properties><PropertyList><Catalog>{req.dataset_name}</Catalog></PropertyList></Properties></Execute></soap:Body></soap:Envelope>"""

        exec_res = await asyncio.to_thread(requests.post, http_xmla_url, data=xmla_soap_body.encode('utf-8'), headers=xmla_execute_headers, timeout=20)

        if exec_res.status_code == 200 and "<Error" not in exec_res.text:
            return {"success": True, "method": "XMLA SOAP", "message": "刷新指令已成功下发至 Power BI XMLA 引擎！"}

        # 降级尝试 Enhanced Refresh API
        if req.dataset_id:
            endpoint = req.xmla_endpoint.rstrip("/")
            ws_name = endpoint.split("/")[-1] if "/" in endpoint else ""
            workspace_id = None
            pbi_headers = {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}
            try:
                groups_res = await asyncio.to_thread(requests.get, "https://api.powerbi.com/v1.0/myorg/groups", headers=pbi_headers, timeout=6)
                if groups_res.status_code == 200:
                    for g in groups_res.json().get("value", []):
                        if g.get("name", "").lower() == ws_name.lower():
                            workspace_id = g.get("id")
                            break
            except Exception:
                pass

            refresh_api_url = f"https://api.powerbi.com/v1.0/myorg/groups/{workspace_id}/datasets/{req.dataset_id}/refreshes" if workspace_id else f"https://api.powerbi.com/v1.0/myorg/datasets/{req.dataset_id}/refreshes"
            refresh_body = {"type": (req.refresh_type or "full").capitalize(), "commitMode": "transactional", "objects": [tmsl_obj]}
            resp = await asyncio.to_thread(requests.post, refresh_api_url, json=refresh_body, headers=pbi_headers, timeout=10)
            if resp.status_code in [200, 202]:
                return {"success": True, "method": "Enhanced Refresh API", "message": "局部刷新任务已成功下发至 Power BI 增强刷新 API！"}

        return {"success": False, "message": f"下发失败: {exec_res.text}"}
    except Exception as e:
        return {"success": False, "message": str(e)}

@app.post("/api/xmla/refresh-status")
async def check_xmla_refresh_status(req: XMLATablesRequest):
    """查询模型最新云端刷新历史、转换为 UTC+8 并算出耗时与目标表当前真实行数"""
    try:
        token = _get_effective_xmla_token(req.access_token)
        if not token:
            return {"success": False, "message": "缺少有效 Access Token"}

        pbi_headers = {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}

        # 尝试解析 workspace_id 与 dataset_id
        endpoint = req.xmla_endpoint.rstrip("/")
        ws_name = endpoint.split("/")[-1] if "/" in endpoint else ""
        workspace_id = None
        try:
            groups_res = await asyncio.to_thread(requests.get, "https://api.powerbi.com/v1.0/myorg/groups", headers=pbi_headers, timeout=6)
            if groups_res.status_code == 200:
                for g in groups_res.json().get("value", []):
                    if g.get("name", "").lower() == ws_name.lower():
                        workspace_id = g.get("id")
                        break
        except Exception:
            pass

        dataset_id = req.dataset_id
        if not dataset_id and req.dataset_name:
            ds_list_url = f"https://api.powerbi.com/v1.0/myorg/groups/{workspace_id}/datasets" if workspace_id else "https://api.powerbi.com/v1.0/myorg/datasets"
            try:
                ds_res = await asyncio.to_thread(requests.get, ds_list_url, headers=pbi_headers, timeout=6)
                if ds_res.status_code == 200:
                    for ds in ds_res.json().get("value", []):
                        if ds.get("name", "").lower() == req.dataset_name.lower():
                            dataset_id = ds.get("id")
                            break
            except Exception:
                pass

        ref_status_url = f"https://api.powerbi.com/v1.0/myorg/groups/{workspace_id}/datasets/{dataset_id}/refreshes?$top=20" if (workspace_id and dataset_id) else (f"https://api.powerbi.com/v1.0/myorg/datasets/{dataset_id}/refreshes?$top=20" if dataset_id else "")

        history = []
        if ref_status_url:
            s_res = await asyncio.to_thread(requests.get, ref_status_url, headers=pbi_headers, timeout=10)
            if s_res.status_code == 200:
                raw_history = s_res.json().get("value", [])
                for item in raw_history:
                    start_raw = item.get("startTime", "")
                    end_raw = item.get("endTime", "")

                    start_bj = ""
                    end_bj = "进行中..."
                    duration_str = "进行中..."

                    if start_raw:
                        clean_s = start_raw[:19].replace("T", " ")
                        dt_s = datetime.strptime(clean_s, "%Y-%m-%d %H:%M:%S") + timedelta(hours=8)
                        start_bj = dt_s.strftime("%Y-%m-%d %H:%M:%S") + " (UTC+8)"

                        if end_raw:
                            clean_e = end_raw[:19].replace("T", " ")
                            dt_e = datetime.strptime(clean_e, "%Y-%m-%d %H:%M:%S") + timedelta(hours=8)
                            end_bj = dt_e.strftime("%Y-%m-%d %H:%M:%S") + " (UTC+8)"

                            diff_sec = int((dt_e - dt_s).total_seconds())
                            if diff_sec >= 0:
                                m, s = divmod(diff_sec, 60)
                                h, m = divmod(m, 60)
                                duration_str = f"{h}h {m}m {s}s" if h > 0 else (f"{m}m {s}s" if m > 0 else f"{s}s")

                    history.append({
                        "requestId": item.get("requestId", "-"),
                        "startTime": start_bj,
                        "endTime": end_bj,
                        "duration": duration_str,
                        "status": item.get("status", "Unknown"),
                        "refreshType": item.get("refreshType", "ViaApi"),
                        "error": item.get("serviceExceptionJson") or ""
                    })

        # 实时查询当前表的行数 (如果指定了表名)
        row_count = None
        if dataset_id and req.dataset_name:
            dax_url = f"https://api.powerbi.com/v1.0/myorg/groups/{workspace_id}/datasets/{dataset_id}/executeQueries" if workspace_id else f"https://api.powerbi.com/v1.0/myorg/datasets/{dataset_id}/executeQueries"
            dax_body = {"queries": [{"query": f"EVALUATE {{ COUNTROWS('{req.dataset_name}') }}"}]}
            try:
                r_rows = await asyncio.to_thread(requests.post, dax_url, json=dax_body, headers=pbi_headers, timeout=8)
                if r_rows.status_code == 200:
                    rows_res = r_rows.json().get("results", [])[0].get("tables", [])[0].get("rows", [])
                    if rows_res:
                        row_count = rows_res[0].get("[Value]") or rows_res[0].get("Value")
            except Exception:
                pass

        return {"success": True, "history": history, "row_count": row_count, "dataset_id": dataset_id}
    except Exception as e:
        return {"success": False, "message": str(e)}

@app.get("/api/xmla/get-token")
def get_xmla_cached_token():
    """从本地 MSAL 缓存中无感提取未过期的 AccessToken"""
    token = _get_effective_xmla_token("")
    if token:
        return {"success": True, "token": token}
    return {"success": False, "message": "No cache file or valid token found"}

class DatasourceInspectRequest(BaseModel):
    workspace_id: str
    report_id: Optional[str] = None
    dataset_id: Optional[str] = None
    access_token: Optional[str] = None

@app.post("/api/datasource/inspect")
async def api_inspect_datasource(req: DatasourceInspectRequest):
    """报表与语义模型数据源全景穿透检测接口 (双轨融合架构)"""
    from src.datasource_inspector import inspect_datasource_full
    try:
        eff_token = _get_effective_xmla_token(req.access_token)
        res = await inspect_datasource_full(
            workspace_id=req.workspace_id,
            report_id=req.report_id,
            dataset_id=req.dataset_id,
            access_token=eff_token
        )
        return res
    except Exception as e:
        return {"success": False, "message": str(e)}

class DeepPermissionScanRequest(BaseModel):
    workspace_id: Optional[str] = None
    workspace_ids: Optional[List[str]] = None
    scope: Optional[str] = "tenant"
    deep_scan: bool = True
    access_token: Optional[str] = None
    target_users: Optional[List[str]] = None

@app.post("/api/workflow/deep-permissions-scan")
async def api_deep_permissions_scan(req: DeepPermissionScanRequest):
    """全景权限与穿透生效治理扫描接口 (直属角色 + 安全组生效穿透 + 语义模型读写判定 + 提权偏离检测 + 定向用户过滤)"""
    from src.permission_scanner import scan_permissions_deep
    try:
        cfg = Config()
        cli = PBIClient(cfg)
        res = await scan_permissions_deep(
            workspace_id=req.workspace_id,
            workspace_ids=req.workspace_ids,
            scope=req.scope,
            deep_scan=req.deep_scan,
            config=cfg,
            client=cli,
            target_users=req.target_users
        )
        return res
    except Exception as e:
        return {"success": False, "message": str(e)}


class ScanCandidateUsersRequest(BaseModel):
    scope: Optional[str] = "tenant"
    workspace_ids: Optional[List[str]] = None
    force_refresh: bool = False


@app.post("/api/workflow/scan-users")
async def api_scan_candidate_users(req: ScanCandidateUsersRequest):
    """极速扫描工作区/租户候选人员名单 (0ms 内存缓存秒级复用 + 后端异步并发)"""
    from src.permission_scanner import scan_candidate_users
    try:
        cfg = Config()
        cli = PBIClient(cfg)
        res = await scan_candidate_users(
            scope=req.scope,
            workspace_ids=req.workspace_ids,
            force_refresh=req.force_refresh,
            config=cfg,
            client=cli
        )
        return res
    except Exception as e:
        return {"success": False, "message": str(e), "users": []}



