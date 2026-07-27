import re

with open('src/main.py', 'r', encoding='utf-8') as f:
    content = f.read()

# Fix import HTTPException
content = content.replace(
    "from fastapi import FastAPI, Request, Response",
    "from fastapi import FastAPI, Request, Response, HTTPException"
)

# Fix E701
content = content.replace("if out: res += f\"STDOUT:\\n{out}\\n\"", "if out:\n            res += f\"STDOUT:\\n{out}\\n\"")
content = content.replace("if err: res += f\"STDERR:\\n{err}\\n\"", "if err:\n            res += f\"STDERR:\\n{err}\\n\"")
content = content.replace("if not res: res = \"Command executed successfully (no output).\"", "if not res:\n            res = \"Command executed successfully (no output).\"")

# Fix bare excepts
content = content.replace("except:", "except Exception:")

with open('src/main.py', 'w', encoding='utf-8') as f:
    f.write(content)
print("main.py fixed for ruff!")
