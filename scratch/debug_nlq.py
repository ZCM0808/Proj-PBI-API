import asyncio
import os
import sys

sys.path.append("D:/ZCM/Proj-PBI-API")
from src.dax_executor import execute_dax_via_ps, get_dynamic_port

async def test():
    try:
        import google.generativeai as genai
        genai.configure(api_key=os.getenv("GEMINI_API_KEY_GG3") or os.getenv("GOOGLE_API_KEY"))
        model = genai.GenerativeModel("gemini-3.5-flash")
        
        nlq = "列出实例中的所有表名"
        prompt = f"""
        You are an expert Power BI DAX developer. The user wants to query the local model with this natural language request:
        "{nlq}"
        
        Write a valid DAX EVALUATE statement to retrieve this data. 
        Do not include any explanation or markdown formatting like ```dax. Just return the raw DAX query text.
        For example, if they ask for top 10 products, return: EVALUATE TOPN(10, 'Dim_Products')
        """
        print("Prompting AI...")
        res = await model.generate_content_async(prompt)
        print("AI Response:", res.text)
        
        dax = res.text.strip().replace("```dax", "").replace("```", "").strip()
        port = get_dynamic_port()
        print(f"Executing DAX on port {port}: {dax}")
        
        result = await execute_dax_via_ps(port, dax)
        print("Result:", result)
    except Exception as e:
        import traceback
        traceback.print_exc()
        print(f"Error as str: '{str(e)}'")

if __name__ == "__main__":
    asyncio.run(test())
