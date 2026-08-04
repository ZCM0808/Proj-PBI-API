import sqlite3
import json

endpoints = [
  {
    "operationId": "Datasets_ExecuteQueriesInGroup",
    "method": "POST",
    "path": "/v1.0/myorg/groups/{groupId}/datasets/{datasetId}/executeQueries",
    "summary": "Executes Data Analysis Expressions (DAX) queries against the provided dataset.",
    "tags": ["Datasets"],
    "category": "official",
    "reqBody": json.dumps({
        "queries": [
            {
                "query": "EVALUATE INFO.MEASURES() // Use INFO.TABLES() for dim/fact tables"
            }
        ],
        "serializerSettings": {
            "includeNulls": True
        }
    }, indent=2)
  },
  {
    "operationId": "Reports_GetReportsInGroup",
    "method": "GET",
    "path": "/v1.0/myorg/groups/{groupId}/reports",
    "summary": "Returns a list of reports from the specified workspace.",
    "tags": ["Reports"],
    "category": "official"
  },
  {
    "operationId": "Groups_GetGroups",
    "method": "GET",
    "path": "/v1.0/myorg/groups",
    "summary": "Returns a list of workspaces the user has access to.",
    "tags": ["Groups"],
    "category": "official"
  },
  {
    "operationId": "Groups_GetGroupUsers",
    "method": "GET",
    "path": "/v1.0/myorg/groups/{groupId}/users",
    "summary": "Returns a list of users that have access to the specified workspace.",
    "tags": ["Groups"],
    "category": "official"
  }
]

def add_bookmarks():
    conn = sqlite3.connect('data/pbi_app.db')
    c = conn.cursor()
    c.execute('SELECT data FROM bookmarks ORDER BY id DESC LIMIT 1')
    row = c.fetchone()
    
    if row:
        existing = json.loads(row[0])
    else:
        existing = []
        
    for ep in endpoints:
        # Check if already exists
        exists = False
        for ex in existing:
            if ex.get('operationId') == ep['operationId']:
                exists = True
                break
        if not exists:
            existing.append(ep)
            
    c.execute('INSERT INTO bookmarks (data) VALUES (?)', (json.dumps(existing, ensure_ascii=False),))
    conn.commit()
    conn.close()
    print("Successfully injected 4 useful APIs into the bookmarks database!")

add_bookmarks()
