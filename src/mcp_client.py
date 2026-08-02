import asyncio
import json
import uuid
import subprocess
import os

class MCPClient:
    def __init__(self):
        self.process = None
        self.msg_id = 1

    def get_dynamic_port(self):
        # Fetch the active msmdsrv port
        cmd = ["powershell", "-Command", "(Get-NetTCPConnection -OwningProcess (Get-Process msmdsrv -ErrorAction SilentlyContinue).Id -State Listen -ErrorAction SilentlyContinue).LocalPort"]
        try:
            res = subprocess.run(cmd, capture_output=True, text=True, check=True)
            ports = [p.strip() for p in res.stdout.splitlines() if p.strip()]
            if not ports:
                raise Exception("No active msmdsrv (Power BI Desktop) process found.")
            return ports[0]
        except Exception as e:
            raise Exception(f"Failed to find Power BI port: {e}")

    async def start(self):
        port = self.get_dynamic_port()
        conn_string = f"Data Source=localhost:{port};Application Name=MCP-PBIModeling"
        env = os.environ.copy()
        env["PBI_CONNECTION_STRING"] = conn_string

        # Start the MCP server process
        self.process = await asyncio.create_subprocess_exec(
            "npx", "-y", "@microsoft/powerbi-modeling-mcp",
            stdin=asyncio.subprocess.PIPE,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE,
            env=env
        )

        # Send initialize request
        init_req = {
            "jsonrpc": "2.0",
            "id": str(uuid.uuid4()),
            "method": "initialize",
            "params": {
                "protocolVersion": "2024-11-05",
                "capabilities": {},
                "clientInfo": {"name": "PBI-API-Client", "version": "1.0.0"}
            }
        }
        await self._send(init_req)
        await self._receive() # Wait for init response
        
        # Send initialized notification
        await self._send({"jsonrpc": "2.0", "method": "notifications/initialized"})

    async def _send(self, msg):
        payload = json.dumps(msg) + "\n"
        self.process.stdin.write(payload.encode("utf-8"))
        await self.process.stdin.drain()

    async def _receive(self):
        while True:
            line = await self.process.stdout.readline()
            if not line:
                raise Exception("MCP Server disconnected unexpectedly.")
            
            line = line.decode("utf-8").strip()
            if not line:
                continue
                
            try:
                response = json.loads(line)
                # Ignore logs or notifications, only return actual responses
                if "id" in response:
                    return response
            except json.JSONDecodeError:
                # Might be stdout logs from npx, ignore
                pass

    async def call_tool(self, tool_name, arguments):
        req_id = str(uuid.uuid4())
        req = {
            "jsonrpc": "2.0",
            "id": req_id,
            "method": "tools/call",
            "params": {
                "name": tool_name,
                "arguments": arguments
            }
        }
        await self._send(req)
        response = await self._receive()
        
        if "error" in response:
            raise Exception(f"MCP Tool Error: {response['error']}")
            
        return response.get("result", {})

    async def close(self):
        if self.process:
            self.process.terminate()
            await self.process.wait()
