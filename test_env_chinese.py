import os, json
from dotenv import set_key, load_dotenv

val = json.dumps([{"alias": "工作区", "id": "123"}], ensure_ascii=False)
set_key(".env.test3", "TEST", val)

with open(".env.test3", "r", encoding="utf-8") as f:
    print("File:", f.read())

load_dotenv(".env.test3", override=True)
print("Loaded:", repr(os.getenv("TEST")))
