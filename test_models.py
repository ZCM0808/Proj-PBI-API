import os
from dotenv import load_dotenv
import google.generativeai as genai

load_dotenv()

key1 = os.getenv("GEMINI_API_KEY_GGCM")
print(f"Testing GGCM Key: {key1[:10]}...")

try:
    genai.configure(api_key=key1)
    models = [m.name for m in genai.list_models() if 'generateContent' in m.supported_generation_methods]
    print("Available models:")
    for m in models:
        print(" -", m)
except Exception as e:
    print("Error listing models:", e)
