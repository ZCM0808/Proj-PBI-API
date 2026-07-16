import os
from dotenv import set_key, load_dotenv
import json

data = [{"alias": "my", "id": "123"}]
val = json.dumps(data)
print("Before:", repr(val))

set_key(".env.test", "TEST_KEY", val)

# Read it directly
with open(".env.test") as f:
    print("File content:")
    print(f.read())

load_dotenv(".env.test", override=True)
print("After load_dotenv:", repr(os.getenv("TEST_KEY")))
