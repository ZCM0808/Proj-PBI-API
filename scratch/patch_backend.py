import re

with open('src/main.py', 'r', encoding='utf-8') as f:
    content = f.read()

endpoints = """
@app.get("/api/bookmarks")
async def get_bookmarks():
    import json
    import os
    try:
        if os.path.exists('data/bookmarks.json'):
            with open('data/bookmarks.json', 'r', encoding='utf-8') as f:
                return {"success": True, "data": json.load(f)}
    except Exception as e:
        return {"success": False, "error": str(e)}
    return {"success": True, "data": None}

@app.post("/api/bookmarks")
async def sync_bookmarks(request: Request):
    import json
    import os
    try:
        data = await request.json()
        if not os.path.exists('data'):
            os.makedirs('data')
        with open('data/bookmarks.json', 'w', encoding='utf-8') as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
        return {"success": True}
    except Exception as e:
        return {"success": False, "error": str(e)}

"""

if "@app.get(\"/api/bookmarks\")" not in content:
    content = content.replace('@app.get("/api/graph_users")', endpoints + '\n@app.get("/api/graph_users")')
    with open('src/main.py', 'w', encoding='utf-8') as f:
        f.write(content)
    print("Backend patched successfully.")
else:
    print("Backend already patched.")
