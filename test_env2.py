import os
from dotenv import load_dotenv

with open('.env.test', 'w') as f:
    f.write('TEST_KEY=\'[{"a":"b"}]\'\n')

load_dotenv('.env.test', override=True)
val = os.getenv('TEST_KEY')
print("Loaded:", repr(val))

import json
try:
    print("Parsed:", json.loads(val))
except Exception as e:
    print("Error parsing:", e)
