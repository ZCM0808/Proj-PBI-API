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
    
    total_events = 0
    activities = set()
    report_views = 0
    
    for i in range(1, 31):
        d = datetime.utcnow() - timedelta(days=i)
        date_iso = d.strftime('%Y-%m-%d')
        start = f"'{date_iso}T00:00:00Z'"
        end = f"'{date_iso}T23:59:59Z'"
        
        url = f"https://api.powerbi.com/v1.0/myorg/admin/activityevents?startDateTime={start}&endDateTime={end}"
        
        async with httpx.AsyncClient() as c:
            try:
                res = await c.get(url, headers={"Authorization": f"Bearer {token}"})
                if res.status_code == 200:
                    data = res.json()
                    events = data.get("activityEventEntities", [])
                    total_events += len(events)
                    for e in events:
                        act = e.get('Activity', '')
                        activities.add(act)
                        if str(act).lower() == 'viewreport':
                            report_views += 1
            except Exception as e:
                print(f"Failed on {date_iso}: {e}")
                
    print(f"Total events in 30 days: {total_events}")
    print(f"Total ViewReport events: {report_views}")
    print(f"All Activities: {activities}")

asyncio.run(debug_events())
