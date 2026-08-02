import asyncio
import sys
sys.path.append("D:/ZCM/Proj-PBI-API")
from src.mcp_client import MCPClient
import uuid

async def list_tools():
    mcp = MCPClient()
    await mcp.start()
    
    # Send tools/list request
    req = {
        "jsonrpc": "2.0",
        "id": str(uuid.uuid4()),
        "method": "tools/list",
        "params": {}
    }
    await mcp._send(req)
    response = await mcp._receive()
    
    tools = response.get("result", {}).get("tools", [])
    print("Available Tools:")
    for t in tools:
        print(f"- {t.get('name')}: {t.get('description')}")
        print(f"  Schema: {t.get('inputSchema')}")
        
    await mcp.close()

if __name__ == "__main__":
    asyncio.run(list_tools())
