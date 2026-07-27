import re

js_path = 'static/script.js'
with open(js_path, 'r', encoding='utf-8') as f:
    js = f.read()

# Replace translateY(-8px) with translateY(8px) in script.js
js = js.replace("translateY(-8px)", "translateY(8px)")

with open(js_path, 'w', encoding='utf-8') as f:
    f.write(js)

print("Fixed translateY in script.js")
