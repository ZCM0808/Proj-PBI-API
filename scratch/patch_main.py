import re

with open('src/main.py', 'r', encoding='utf-8') as f:
    content = f.read()

# Add imports
if 'from src.local_pbi import scan_local_instances, run_dax_query' not in content:
    content = content.replace('from fastapi import FastAPI, Request', 'from fastapi import FastAPI, Request\nfrom pydantic import BaseModel\nfrom src.local_pbi import scan_local_instances, run_dax_query')

# Add endpoints
endpoints = """

@app.get("/api/local_pbi/scan")
def api_scan_local_pbi():
    try:
        instances = scan_local_instances()
        return {"instances": instances}
    except Exception as e:
        return JSONResponse({"error": str(e)}, status_code=500)

class DaxQueryReq(BaseModel):
    port: str
    query: str

@app.post("/api/local_pbi/query")
def api_query_local_pbi(req: DaxQueryReq):
    try:
        res = run_dax_query(req.port, req.query)
        if "error" in res:
            return JSONResponse(res, status_code=500)
        return res
    except Exception as e:
        return JSONResponse({"error": str(e)}, status_code=500)
"""

if '/api/local_pbi/scan' not in content:
    # insert before if __name__ == "__main__": if it exists, otherwise at end
    if 'if __name__ == "__main__":' in content:
        content = content.replace('if __name__ == "__main__":', endpoints + '\nif __name__ == "__main__":')
    else:
        content += endpoints

with open('src/main.py', 'w', encoding='utf-8') as f:
    f.write(content)
