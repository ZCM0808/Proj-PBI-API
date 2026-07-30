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
    report_views = 0
    
    # Just check last 7 days to be fast
    for i in range(1, 8):
        d = datetime.utcnow() - timedelta(days=i)
        date_iso = d.strftime('%Y-%m-%d')
        start = f"'{date_iso}T00:00:00Z'"
        end = f"'{date_iso}T23:59:59Z'"
        
        url = f"https://api.powerbi.com/v1.0/myorg/admin/activityevents?startDateTime={start}&endDateTime={end}"
        
        async with httpx.AsyncClient() as c:
            continuation_url = url
            while continuation_url:
                try:
                    res = await c.get(continuation_url, headers={"Authorization": f"Bearer {token}"})
                    if res.status_code == 200:
                        data = res.json()
                        events = data.get("activityEventEntities", [])
                        total_events += len(events)
                        for e in events:
                            act = str(e.get('Activity', '')).lower()
                            if act == 'viewreport':
                                report_views += 1
                        
                        continuation_uri = data.get("continuationUri")
                        if continuation_uri:
                            continuation_url = continuation_uri
                        else:
                            continuation_url = None
                    else:
                        print(f"Error {res.status_code}")
                        break
                except Exception as e:
                    print(f"Exception: {e}")
                    break
                    
    print(f"Actual Total events in 7 days: {total_events}")
    print(f"Actual Total ViewReport events: {report_views}")

asyncio.run(debug_events())
