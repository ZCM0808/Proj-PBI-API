import os
import time
import asyncio
import httpx
from dotenv import load_dotenv

load_dotenv()

async def test_reuse_httpx():
    key = os.getenv("GEMINI_API_KEY_GGCM")
    if not key:
        return
        
    url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash:streamGenerateContent?alt=sse&key={key}"
    payload = {
        "contents": [{"parts": [{"text": "ping"}]}]
    }
    
    # Use a single httpx client session
    async with httpx.AsyncClient(timeout=15.0) as client:
        print("Request 1...")
        t0 = time.time()
        async with client.stream("POST", url, json=payload) as res:
            res.raise_for_status()
            async for line in res.aiter_lines():
                pass
        print(f"Request 1 took: {time.time() - t0:.2f}s")
        
        print("Request 2...")
        t1 = time.time()
        async with client.stream("POST", url, json=payload) as res:
            res.raise_for_status()
            async for line in res.aiter_lines():
                pass
        print(f"Request 2 took: {time.time() - t1:.2f}s")

if __name__ == "__main__":
    asyncio.run(test_reuse_httpx())
