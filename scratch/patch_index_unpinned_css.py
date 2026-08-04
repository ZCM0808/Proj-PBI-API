import re

with open('static/index.html', 'r', encoding='utf-8') as f:
    content = f.read()

old_css = """        .tree-pin-btn.pinned {
            opacity: 1.0;
        }"""
        
new_css = """        .tree-pin-btn.unpinned {
            opacity: 0.2;
        }
        .tree-pin-btn.pinned {
            opacity: 1.0;
        }"""

content = content.replace(old_css, new_css)
content = content.replace("v193", "v194")

with open('static/index.html', 'w', encoding='utf-8') as f:
    f.write(content)

print("index.html unpinned CSS fixed.")
