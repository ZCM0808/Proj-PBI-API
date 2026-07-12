"""Power BI API Web Explorer"""

import sys
import os
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

import uvicorn
from fastapi import FastAPI, Request
from fastapi.responses import HTMLResponse
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from src.config import Config
from src.pbi_client import PBIClient

app = FastAPI(title="Power BI API Explorer")

# 添加 CORS 支持
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 挂载静态文件
app.mount("/static", StaticFiles(directory="static"), name="static")

client = PBIClient(Config())

@app.get("/", response_class=HTMLResponse)
def get_ui():
    """返回 Web UI 主页"""
    with open("static/index.html", "r", encoding="utf-8") as f:
        return f.read()

@app.post("/api/proxy")
async def proxy_request(request: Request):
    """
    通用代理接口，接收前端传来的参数并转发给 Power BI REST API。
    """
    try:
        data = await request.json()
    except Exception:
        return {"success": False, "error": "Invalid JSON format"}
        
    method = data.get("method", "GET").upper()
    endpoint = data.get("endpoint", "")
    body = data.get("body", None)
    
    # 简单的格式化，确保 endpoint 开头有 /
    if not endpoint.startswith("/") and not endpoint.startswith("http"):
        endpoint = "/" + endpoint
        
    kwargs = {}
    if body:
        kwargs["json"] = body
        
    try:
        response_data = client.request(method, endpoint, **kwargs)
        return {"success": True, "data": response_data}
    except Exception as e:
        return {"success": False, "error": str(e)}

def main():
    """启动 Web 服务器"""
    print("=== Power BI API Web Explorer 启动 ===")
    print("请在浏览器中访问: http://127.0.0.1:8000")
    uvicorn.run("src.main:app", host="127.0.0.1", port=8000, reload=True)

if __name__ == "__main__":
    main()
