import re

with open('src/main.py', 'r', encoding='utf-8') as f:
    content = f.read()

# Replace the previous bookmarks endpoint with SQLite
old_endpoints = """@app.get("/api/bookmarks")
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
        return {"success": False, "error": str(e)}"""

sqlite_endpoints = """@app.get("/api/bookmarks")
async def get_bookmarks():
    import sqlite3
    import json
    import os
    try:
        if not os.path.exists('data'):
            os.makedirs('data')
        conn = sqlite3.connect('data/pbi_app.db')
        c = conn.cursor()
        c.execute('''CREATE TABLE IF NOT EXISTS bookmarks 
                     (id INTEGER PRIMARY KEY AUTOINCREMENT, data TEXT)''')
        c.execute('SELECT data FROM bookmarks ORDER BY id DESC LIMIT 1')
        row = c.fetchone()
        conn.close()
        if row:
            return {"success": True, "data": json.loads(row[0])}
    except Exception as e:
        return {"success": False, "error": str(e)}
    return {"success": True, "data": None}

@app.post("/api/bookmarks")
async def sync_bookmarks(request: Request):
    import sqlite3
    import json
    import os
    try:
        data = await request.json()
        if not os.path.exists('data'):
            os.makedirs('data')
        conn = sqlite3.connect('data/pbi_app.db')
        c = conn.cursor()
        c.execute('''CREATE TABLE IF NOT EXISTS bookmarks 
                     (id INTEGER PRIMARY KEY AUTOINCREMENT, data TEXT)''')
        # Just store the entire array as a single JSON blob for the MVP database sync
        c.execute('INSERT INTO bookmarks (data) VALUES (?)', (json.dumps(data, ensure_ascii=False),))
        conn.commit()
        conn.close()
        return {"success": True}
    except Exception as e:
        return {"success": False, "error": str(e)}"""

if "@app.get(\"/api/bookmarks\")" in content:
    content = content.replace(old_endpoints, sqlite_endpoints)
    with open('src/main.py', 'w', encoding='utf-8') as f:
        f.write(content)
    print("Backend upgraded to SQLite.")
else:
    print("Old endpoints not found.")
