import asyncio
from src.pbi_client import PBIClient

async def run():
    client = PBIClient()
    w_id = '2c51e061-0f9f-4d02-bed0-c169019e5d83'
    r_id = '3a6e9e19-9aed-4372-a7d9-17155e9dd49d'
    
    print("Testing GET Report Details...")
    try:
        report_info = client.request("GET", f"/groups/{w_id}/reports/{r_id}")
        print("Success! Embed URL:", report_info.get("embedUrl"))
    except Exception as e:
        print("Error getting report:", e)
        
    print("\\nTesting GenerateToken...")
    try:
        token_res = client.request("POST", f"/groups/{w_id}/reports/{r_id}/GenerateToken", json={"accessLevel": "View"})
        print("Success! Token:", token_res.get("token")[:20] + "...")
    except Exception as e:
        print("Error getting token:", e)

if __name__ == "__main__":
    asyncio.run(run())
