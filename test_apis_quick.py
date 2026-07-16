import asyncio
import httpx
from src.config import Config
from src.pbi_client import PBIClient

async def run():
    client = PBIClient(Config())
    try:
        token = client._get_token()
        print(f"Token acquired, length: {len(token)}")
    except Exception as e:
        print(f"Auth failed: {e}")
        return

    # test one endpoint
    try:
        res = client.request("GET", "/groups")
        print(f"Groups response keys: {res.keys() if isinstance(res, dict) else type(res)}")
        if isinstance(res, dict) and "value" in res:
            print(f"Found {len(res['value'])} groups")
    except Exception as e:
        print(f"API request failed: {e}")

asyncio.run(run())
