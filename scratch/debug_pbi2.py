import os
import sys
import json
import httpx
import asyncio
from datetime import datetime, timedelta

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))
from src.config import Config
from src.pbi_client import PBIClient

async def debug_events():
    client = PBIClient(Config())
    token = client._get_token("powerbi")
    
    for i in range(1, 8):
        d = datetime.utcnow() - timedelta(days=i)
        date_iso = d.strftime('%Y-%m-%d')
        start = f"'{date_iso}T00:00:00Z'"
        end = f"'{date_iso}T23:59:59Z'"
        
        url = f"https://api.powerbi.com/v1.0/myorg/admin/activityevents?startDateTime={start}&endDateTime={end}"
        
        async with httpx.AsyncClient() as c:
            res = await c.get(url, headers={"Authorization": f"Bearer {token}"})
            data = res.json()
            events = data.get("activityEventEntities", [])
            
            print(f"[{date_iso}] Total events: {len(events)}")
            if len(events) > 0:
                activities = set([e.get('Activity') for e in events])
                print(f"  Activities: {activities}")
                # print one full event just to see its keys
                print("  Sample keys:", list(events[0].keys()))

asyncio.run(debug_events())
