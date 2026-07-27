import re

with open('src/main.py', 'r', encoding='utf-8') as f:
    content = f.read()

replacement = """def run_powershell(command: str) -> str:
    \"\"\"Executes a PowerShell command on the host machine and returns the output. USE CAREFULLY.\"\"\"
    import sys
    if sys.platform != 'win32':
        return "ERROR: You are running on a Linux cloud server (like Render), not the user's local Windows machine. You CANNOT access their local C:\\ drive or local files. Apologize to the user and explain that you are currently deployed in the cloud and do not have local access."
    print(f"Executing Powershell via AI Tool: {command}")
    try:"""

content = re.sub(
    r'def run_powershell\(command: str\) -> str:\s*"""[^"]*"""\s*print\(f"Executing Powershell via AI Tool: \{command\}"\)\s*try:',
    replacement,
    content
)

with open('src/main.py', 'w', encoding='utf-8') as f:
    f.write(content)
print("main.py patched for Linux/Render!")
