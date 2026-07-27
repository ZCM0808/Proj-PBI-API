import os
import time
import asyncio
import httpx
from dotenv import load_dotenv

load_dotenv()

async def test_key(name, key):
    if not key:
        return
    print(f"[{name}] Testing key {key[:10]}...")
    start_time = time.time()
    
    url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash:streamGenerateContent?alt=sse&key={key}"
    payload = {
        "system_instruction": {
            "parts": [{"text": "You are a helpful assistant."}]
        },
        "contents": [{
            "role": "user",
            "parts": [{"text": "Hi"}]
        }]
    }
    
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            async with client.stream("POST", url, json=payload) as response:
                response.raise_for_status()
                first_chunk = False
                async for line in response.aiter_lines():
                    if line.startswith("data:"):
                        if not first_chunk:
                            first_chunk_time = time.time()
                            print(f"[{name}] Success! TTFB: {first_chunk_time - start_time:.2f}s")
                            first_chunk = True
                        break
    except Exception as e:
        print(f"[{name}] Failed! Error: {str(e)}")

async def main():
    keys = {
        "GGCM": os.getenv("GEMINI_API_KEY_GGCM"),
        "GG3": os.getenv("GEMINI_API_KEY_GG3"),
    }
    for name, key in keys.items():
        await test_key(name, key)

if __name__ == "__main__":
    asyncio.run(main())
