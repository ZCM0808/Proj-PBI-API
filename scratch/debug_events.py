import asyncio
import httpx
from src.main import get_access_token

async def main():
    t = await get_access_token()
    async with httpx.AsyncClient() as c:
        r = await c.get(
            "https://api.powerbi.com/v1.0/myorg/admin/activityevents?startDateTime='2026-07-28T00:00:00Z'&endDateTime='2026-07-28T23:59:59Z'",
            headers={"Authorization": f"Bearer {t}"}
        )
        d = r.json()
        events = d.get('activityEventEntities', [])
        
        # print first few ViewReport events
        view_reports = [e for e in events if e.get('Activity') == 'ViewReport']
        print(f"Total events: {len(events)}, ViewReports: {len(view_reports)}")
        for i, e in enumerate(view_reports[:3]):
            print(f"--- Event {i} ---")
            for k, v in e.items():
                print(f"{k}: {v}")

asyncio.run(main())
