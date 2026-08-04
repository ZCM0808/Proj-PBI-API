import re

with open('src/main.py', 'r', encoding='utf-8') as f:
    content = f.read()

bulk_kv = """@app.get("/api/db/kv")
async def get_all_kv():
    import sqlite3
    try:
        conn = sqlite3.connect('data/pbi_app.db')
        c = conn.cursor()
        c.execute('''CREATE TABLE IF NOT EXISTS kv_store (key TEXT PRIMARY KEY, value TEXT)''')
        c.execute('SELECT key, value FROM kv_store')
        rows = c.fetchall()
        conn.close()
        data = {r[0]: r[1] for r in rows}
        return {"success": True, "data": data}
    except Exception as e:
        return {"success": False, "error": str(e)}
"""

if "@app.get(\"/api/db/kv\")" not in content:
    content = content.replace('@app.get("/api/db/kv/{key}")', bulk_kv + '\n@app.get("/api/db/kv/{key}")')
    with open('src/main.py', 'w', encoding='utf-8') as f:
        f.write(content)
    print("Bulk KV endpoint added.")
else:
    print("Already added.")
