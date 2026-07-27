import os
import time
import asyncio
from dotenv import load_dotenv

os.environ["GRPC_DNS_RESOLVER"] = "native"
import google.generativeai as genai

load_dotenv()

async def test_reuse():
    key = os.getenv("GEMINI_API_KEY_GGCM")
    if not key:
        print("No key.")
        return
        
    print("Configuring...")
    genai.configure(api_key=key)
    model = genai.GenerativeModel("gemini-3.5-flash")
    
    print("Request 1...")
    t0 = time.time()
    res1 = await model.generate_content_async("ping", stream=True)
    async for chunk in res1:
        pass
    print(f"Request 1 took: {time.time() - t0:.2f}s")
    
    print("Request 2...")
    t1 = time.time()
    res2 = await model.generate_content_async("pong", stream=True)
    async for chunk in res2:
        pass
    print(f"Request 2 took: {time.time() - t1:.2f}s")
    
    print("Request 3 (large context)...")
    t2 = time.time()
    kb = "A" * 10000
    res3 = await model.generate_content_async(f"{kb}\nping", stream=True)
    async for chunk in res3:
        pass
    print(f"Request 3 took: {time.time() - t2:.2f}s")

if __name__ == "__main__":
    asyncio.run(test_reuse())
