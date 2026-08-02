import asyncio
import sys
sys.path.append("D:/ZCM/Proj-PBI-API")
from src.mcp_client import MCPClient
import uuid
import json
import subprocess
import os

async def list_tools():
    mcp = MCPClient()
    port = mcp.get_dynamic_port()
    
    env = os.environ.copy()
    env["PBI_CONNECTION_STRING"] = f"Data Source=localhost:{port};Application Name=MCP-PBIModeling"
    env["CI"] = "1"
    env["TERM"] = "dumb"
    env["ASPNETCORE_ENVIRONMENT"] = "Production"
    env["NODE_ENV"] = "production"
    
    proc = subprocess.Popen(
        ["npx.cmd", "-y", "@microsoft/powerbi-modeling-mcp", "stdio"], # try passing stdio as arg just in case
        stdin=subprocess.PIPE,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        text=True,
        env=env
    )
    
    err_line = proc.stderr.read()
    print(f"STDERR: {err_line}")

if __name__ == "__main__":
    asyncio.run(list_tools())
