import re

with open('static/index.html', 'r', encoding='utf-8') as f:
    content = f.read()

css_old = """    <style>
        .tree-pin-btn {"""
        
css_new = """    <style>
        @keyframes flashBlink {
            0%, 100% { background-color: transparent; }
            50% { background-color: rgba(242, 200, 17, 0.4); }
        }
        .tree-pin-btn {"""

if "flashBlink" not in content:
    content = content.replace(css_old, css_new)
    content = content.replace("v198", "v199")

with open('static/index.html', 'w', encoding='utf-8') as f:
    f.write(content)

print("flashBlink CSS injected to index.html.")
