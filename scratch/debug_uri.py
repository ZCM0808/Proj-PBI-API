import os, sys, asyncio, httpx
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))
from src.config import Config
from src.pbi_client import PBIClient

async def check_uri():
    t = PBIClient(Config())._get_token("powerbi")
    async with httpx.AsyncClient() as c:
        r = await c.get("https://api.powerbi.com/v1.0/myorg/admin/activityevents?startDateTime='2026-07-28T00:00:00Z'&endDateTime='2026-07-28T23:59:59Z'", headers={"Authorization": "Bearer "+t})
        print(r.json().get("continuationUri"))

asyncio.run(check_uri())
