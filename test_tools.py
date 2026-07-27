import os
import asyncio
from dotenv import load_dotenv

os.environ["GRPC_DNS_RESOLVER"] = "native"
import google.generativeai as genai
from google.generativeai.types import content_types

load_dotenv()

def run_powershell(command: str) -> str:
    """Executes a powershell command."""
    print(f"Executing: {command}")
    return "Output of " + command

async def test_tools():
    key = os.getenv("GEMINI_API_KEY_GG3")
    genai.configure(api_key=key)
    model = genai.GenerativeModel("gemini-3.5-flash", tools=[run_powershell])
    
    chat = model.start_chat()
    print("Sending message...")
    res = await chat.send_message_async("What is the current time in powershell?", stream=True)
    
    async for chunk in res:
        if chunk.text:
            print("TEXT:", chunk.text)
        elif chunk.parts:
            for part in chunk.parts:
                if part.function_call:
                    print("TOOL CALL:", part.function_call.name, part.function_call.args)
                    
                    # mock execution
                    result = run_powershell(part.function_call.args['command'])
                    
                    # send result back
                    print("Sending result back...")
                    res2 = await chat.send_message_async(
                        content_types.Part.from_function_response(
                            name=part.function_call.name,
                            response={"result": result}
                        ),
                        stream=True
                    )
                    async for chunk2 in res2:
                        print("TEXT2:", chunk2.text)

if __name__ == "__main__":
    asyncio.run(test_tools())
