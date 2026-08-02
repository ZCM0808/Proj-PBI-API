import asyncio
import sys
sys.path.append("D:/ZCM/Proj-PBI-API")
from src.mcp_client import MCPClient
import uuid
import json

async def list_tools():
    mcp = MCPClient()
    port = mcp.get_dynamic_port()
    print(f"Dynamic port: {port}")
    
    # We will just run npx.cmd directly to see stderr
    import subprocess
    import os
    env = os.environ.copy()
    env["PBI_CONNECTION_STRING"] = f"Data Source=localhost:{port};Application Name=MCP-PBIModeling"
    
    proc = subprocess.Popen(
        ["npx.cmd", "-y", "@microsoft/powerbi-modeling-mcp"],
        stdin=subprocess.PIPE,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        text=True,
        env=env
    )
    
    init_req = {
        "jsonrpc": "2.0",
        "id": "1",
        "method": "initialize",
        "params": {
            "protocolVersion": "2024-11-05",
            "capabilities": {},
            "clientInfo": {"name": "PBI-API", "version": "1.0"}
        }
    }
    proc.stdin.write(json.dumps(init_req) + "\n")
    proc.stdin.flush()
    
    # read first line
    try:
        out_line = proc.stdout.readline()
        print(f"STDOUT: {out_line}")
    except Exception as e:
        print(f"STDOUT ERROR: {e}")
        
    err_line = proc.stderr.read()
    print(f"STDERR: {err_line}")

if __name__ == "__main__":
    asyncio.run(list_tools())
