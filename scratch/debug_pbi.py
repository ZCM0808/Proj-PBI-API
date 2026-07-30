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
    
    # We want events from yesterday
    d = datetime.utcnow() - timedelta(days=1)
    date_iso = d.strftime('%Y-%m-%d')
    start = f"'{date_iso}T00:00:00Z'"
    end = f"'{date_iso}T23:59:59Z'"
    
    url = f"https://api.powerbi.com/v1.0/myorg/admin/activityevents?startDateTime={start}&endDateTime={end}"
    
    async with httpx.AsyncClient() as c:
        res = await c.get(url, headers={"Authorization": f"Bearer {token}"})
        data = res.json()
        events = data.get("activityEventEntities", [])
        
        print(f"Total events for {date_iso}: {len(events)}")
        
        report_events = [e for e in events if 'report' in str(e.get('Activity', '')).lower()]
        
        print(f"Events containing 'report' in Activity: {len(report_events)}")
        
        if report_events:
            print("Sample 5 report events:")
            for e in report_events[:5]:
                print(json.dumps(e, indent=2))
        else:
            print("No report events found.")

asyncio.run(debug_events())
