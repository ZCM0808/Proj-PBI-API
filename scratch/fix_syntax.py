import sys
js_path = 'static/script.js'
with open(js_path, 'r', encoding='utf-8') as f:
    js = f.read()

# Fix the broken line
js = js.replace('let csv = rawKeys.map(k => `"${cleanKey(k).replace(/"/g, \'""\')}"`).join(",") + "\\n";";', 
                'let csv = rawKeys.map(k => `"${cleanKey(k).replace(/"/g, \'""\')}"`).join(",") + "\\n";')

# Also fix the inner one if it was broken
broken_inner = '}).join(",") + "\\n";\\n'
if '}).join(",") + " ' in js:
    js = js.replace('}).join(",") + " \n";', '}).join(",") + "\\n";')
if '}).join(",") + "\n";' in js:
    js = js.replace('}).join(",") + "\n";', '}).join(",") + "\\n";')

with open(js_path, 'w', encoding='utf-8') as f:
    f.write(js)
