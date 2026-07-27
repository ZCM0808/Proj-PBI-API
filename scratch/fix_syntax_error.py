import sys

js_path = 'static/script.js'
with open(js_path, 'r', encoding='utf-8') as f:
    js = f.read()

# Replace the second declaration of btn and origHtml
js = js.replace("""    const btn = document.getElementById('run-workflow-btn');
    const origHtml = btn.innerHTML;""", """    // Removed duplicate btn and origHtml declaration""")

with open(js_path, 'w', encoding='utf-8') as f:
    f.write(js)
print("Fixed syntax error")
