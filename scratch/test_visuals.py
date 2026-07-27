import asyncio
from src.pbi_client import PBIApiClient

async def run():
    client = PBIApiClient()
    # Workspace: 2c51e061-0f9f-4d02-bed0-c169019e5d83
    # Report: 3a6e9e19-9aed-4372-a7d9-17155e9dd49d
    w_id = "2c51e061-0f9f-4d02-bed0-c169019e5d83"
    r_id = "3a6e9e19-9aed-4372-a7d9-17155e9dd49d"
    
    print("Fetching pages...")
    pages = client.request("GET", f"/groups/{w_id}/reports/{r_id}/pages")
    print(pages)
    
    if pages and "value" in pages and len(pages["value"]) > 0:
        p_name = pages["value"][0]["name"]
        print(f"\\nFetching visuals for page {p_name}...")
        try:
            visuals = client.request("GET", f"/groups/{w_id}/reports/{r_id}/pages/{p_name}/visuals")
            print(visuals)
        except Exception as e:
            print(f"Error fetching visuals: {e}")

if __name__ == "__main__":
    asyncio.run(run())
