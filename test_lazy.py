import os
import asyncio
from dotenv import load_dotenv

os.environ["GRPC_DNS_RESOLVER"] = "native"
import google.generativeai as genai

load_dotenv()

async def test_lazy():
    key = os.getenv("GEMINI_API_KEY_GGCM")
    genai.configure(api_key=key)
    model = genai.GenerativeModel("gemini-3.5-flash")
    
    print("Calling generate_content_async...")
    res = await model.generate_content_async("ping", stream=True)
    print("Returned:", type(res))
    
    try:
        async for chunk in res:
            print("Chunk:", chunk.text)
    except Exception as e:
        print("Exception during iteration:", type(e))

asyncio.run(test_lazy())
