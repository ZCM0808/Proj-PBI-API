import re

with open('static/script.js', 'r', encoding='utf-8') as f:
    js = f.read()

target1 = """        const wsData = await wsRes.json();
        const workspaces = wsData.value || [];"""

replacement1 = """        const wsData = await wsRes.json();
        const wsPayload = wsData.data || wsData;
        const workspaces = wsPayload.value || [];"""

target2 = """                if (uRes.ok) {
                    const uData = await uRes.json();
                    const users = uData.value || [];"""

replacement2 = """                if (uRes.ok) {
                    const uData = await uRes.json();
                    const uPayload = uData.data || uData;
                    const users = uPayload.value || [];"""

if target1 in js and target2 in js:
    js = js.replace(target1, replacement1)
    js = js.replace(target2, replacement2)
    with open('static/script.js', 'w', encoding='utf-8') as f:
        f.write(js)
    
    with open('static/index.html', 'r', encoding='utf-8') as f:
        html = f.read()
    html = re.sub(r'v141', 'v142', html)
    with open('static/index.html', 'w', encoding='utf-8') as f:
        f.write(html)
        
    print("JS patched")
else:
    print("Targets not found")
