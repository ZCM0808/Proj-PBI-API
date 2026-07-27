import os
import sys
import asyncio
from dotenv import load_dotenv

# 强制优化 gRPC DNS 解析
os.environ["GRPC_DNS_RESOLVER"] = "native"

import google.generativeai as genai

load_dotenv()

def get_project_memory():
    memory_path = os.path.join(os.path.dirname(__file__), "PROJECT_MEMORY.md")
    if os.path.exists(memory_path):
        with open(memory_path, "r", encoding="utf-8") as f:
            return f.read()
    return "You are a helpful assistant for Power BI and data engineering."

async def main():
    keys = [
        os.getenv("GEMINI_API_KEY_GG3"),
        os.getenv("GEMINI_API_KEY_GGCM"),
        os.getenv("GOOGLE_API_KEY")
    ]
    valid_keys = [k for k in keys if k]
    if not valid_keys:
        print("❌ 未在 .env 中找到任何有效的 GEMINI_API_KEY 配置。")
        return

    print("🔄 正在初始化 AI (寻找可用通道)...")
    model = None
    for api_key in valid_keys:
        try:
            genai.configure(api_key=api_key)
            model = genai.GenerativeModel("gemini-3.5-flash")
            # 快速探测
            await model.generate_content_async("ping", request_options={"timeout": 5.0})
            print(f"✅ 连接成功! 当前使用的 Key: {api_key[:5]}***\n")
            break
        except Exception:
            continue
    
    if not model:
        print("❌ 所有 API Key 均已失效或超额。")
        return

    project_kb = get_project_memory()
    
    # 建立持续的对话上下文
    chat = model.start_chat(history=[])
    
    # 发送一次系统设定 (因为 start_chat 暂不支持直接在构造函数中完美处理大段 system_instruction, 我们作为开场白注入)
    print("🧠 正在注入专属项目知识库...\n")
    await chat.send_message_async(f"【这是你的系统设定，请严格遵守，不要将其作为用户的对话内容】\n\n{project_kb}")

    print("="*50)
    print("🤖 Power BI 智能助手 CLI 模式已启动。输入 'exit' 或 'quit' 退出。")
    print("="*50)
    
    while True:
        try:
            user_input = input("\n🧑 您: ")
            if user_input.strip().lower() in ['exit', 'quit']:
                print("👋 再见！")
                break
            if not user_input.strip():
                continue
                
            print("🤖 AI: ", end="", flush=True)
            response = await chat.send_message_async(user_input, stream=True)
            
            async for chunk in response:
                if chunk.text:
                    print(chunk.text, end="", flush=True)
            print() # 换行
            
        except KeyboardInterrupt:
            print("\n👋 再见！")
            break
        except Exception as e:
            print(f"\n❌ 请求发生错误: {e}")

if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        sys.exit(0)
