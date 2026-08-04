import re

with open('src/main.py', 'r', encoding='utf-8') as f:
    content = f.read()

kv_endpoints = """
@app.get("/api/db/history")
async def get_history():
    import sqlite3
    import json
    import os
    try:
        conn = sqlite3.connect('data/pbi_app.db')
        c = conn.cursor()
        c.execute('''CREATE TABLE IF NOT EXISTS history (id INTEGER PRIMARY KEY AUTOINCREMENT, data TEXT)''')
        c.execute('SELECT data FROM history ORDER BY id DESC LIMIT 1')
        row = c.fetchone()
        conn.close()
        if row:
            return {"success": True, "data": json.loads(row[0])}
    except Exception as e:
        return {"success": False, "error": str(e)}
    return {"success": True, "data": None}

@app.post("/api/db/history")
async def sync_history(request: Request):
    import sqlite3
    import json
    import os
    try:
        data = await request.json()
        conn = sqlite3.connect('data/pbi_app.db')
        c = conn.cursor()
        c.execute('''CREATE TABLE IF NOT EXISTS history (id INTEGER PRIMARY KEY AUTOINCREMENT, data TEXT)''')
        c.execute('INSERT INTO history (data) VALUES (?)', (json.dumps(data, ensure_ascii=False),))
        conn.commit()
        conn.close()
        return {"success": True}
    except Exception as e:
        return {"success": False, "error": str(e)}

@app.get("/api/db/kv/{key}")
async def get_kv(key: str):
    import sqlite3
    import json
    import os
    try:
        conn = sqlite3.connect('data/pbi_app.db')
        c = conn.cursor()
        c.execute('''CREATE TABLE IF NOT EXISTS kv_store (key TEXT PRIMARY KEY, value TEXT)''')
        c.execute('SELECT value FROM kv_store WHERE key=?', (key,))
        row = c.fetchone()
        conn.close()
        if row:
            return {"success": True, "data": row[0]}
    except Exception as e:
        return {"success": False, "error": str(e)}
    return {"success": True, "data": None}

@app.post("/api/db/kv/{key}")
async def set_kv(key: str, request: Request):
    import sqlite3
    import json
    import os
    try:
        body = await request.json()
        value = body.get('value', '')
        conn = sqlite3.connect('data/pbi_app.db')
        c = conn.cursor()
        c.execute('''CREATE TABLE IF NOT EXISTS kv_store (key TEXT PRIMARY KEY, value TEXT)''')
        c.execute('INSERT OR REPLACE INTO kv_store (key, value) VALUES (?, ?)', (key, value))
        conn.commit()
        conn.close()
        return {"success": True}
    except Exception as e:
        return {"success": False, "error": str(e)}
"""

if "@app.get(\"/api/db/history\")" not in content:
    content = content.replace('@app.get("/api/bookmarks")', kv_endpoints + '\n@app.get("/api/bookmarks")')
    with open('src/main.py', 'w', encoding='utf-8') as f:
        f.write(content)
    print("Backend KV + History SQLite endpoints added.")
else:
    print("Backend already patched.")
