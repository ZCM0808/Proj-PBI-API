import os
import sys
import json
import httpx
import asyncio
from datetime import datetime, timedelta

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))
from src.config import Config
from src.pbi_client import PBIClient

async def get_one_event():
    client = PBIClient(Config())
    token = client._get_token("powerbi")
    
    d = datetime.utcnow() - timedelta(days=2) # 2026-07-28
    date_iso = d.strftime('%Y-%m-%d')
    start = f"'{date_iso}T00:00:00Z'"
    end = f"'{date_iso}T23:59:59Z'"
    
    url = f"https://api.powerbi.com/v1.0/myorg/admin/activityevents?startDateTime={start}&endDateTime={end}"
    
    async with httpx.AsyncClient() as c:
        continuation_url = url
        while continuation_url:
            res = await c.get(continuation_url, headers={"Authorization": f"Bearer {token}"})
            if res.status_code == 200:
                data = res.json()
                events = data.get("activityEventEntities", [])
                for e in events:
                    if str(e.get('Activity', '')).lower() == 'viewreport':
                        print(json.dumps(e, indent=2))
                        return
                continuation_uri = data.get("continuationUri")
                if continuation_uri:
                    continuation_url = continuation_uri
                else:
                    break

asyncio.run(get_one_event())
