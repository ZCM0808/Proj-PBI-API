import re

with open('static/index.html', 'r', encoding='utf-8') as f:
    content = f.read()

old_css = """        .tree-pin-btn.pinned {
            opacity: 1.0;
            transform: rotate(-45deg);
        }
        .tree-pin-btn.unpinned:hover {
            opacity: 1.0;
            transform: scale(1.1);
        }
        .tree-pin-btn.pinned:hover {
            opacity: 1.0;
            transform: rotate(-45deg) scale(1.1);
        }"""
        
new_css = """        .tree-pin-btn.pinned {
            opacity: 1.0;
        }
        .tree-pin-btn.unpinned:hover {
            opacity: 1.0;
            transform: scale(1.1);
        }
        .tree-pin-btn.pinned:hover {
            opacity: 1.0;
            transform: scale(1.1);
        }"""

content = content.replace(old_css, new_css)
content = content.replace("v192", "v193")

with open('static/index.html', 'w', encoding='utf-8') as f:
    f.write(content)

print("index.html CSS fixed.")
