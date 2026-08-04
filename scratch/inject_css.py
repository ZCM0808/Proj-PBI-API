import re

with open('static/index.html', 'r', encoding='utf-8') as f:
    content = f.read()

css_block = """
    <style>
        .tree-pin-btn {
            cursor: pointer;
            padding: 0;
            user-select: none;
            transition: all 0.2s ease;
            display: inline-block;
        }
        .tree-pin-btn.unpinned {
            opacity: 0.2;
        }
        .tree-pin-btn.pinned {
            opacity: 1.0;
        }
        .tree-pin-btn.unpinned:hover {
            opacity: 1.0;
            transform: scale(1.1);
        }
        .tree-pin-btn.pinned:hover {
            opacity: 1.0;
            transform: scale(1.1);
        }
    </style>
</head>"""

if "tree-pin-btn" not in content:
    content = content.replace("</head>", css_block)
    content = content.replace("v194", "v195")
    
    with open('static/index.html', 'w', encoding='utf-8') as f:
        f.write(content)
    print("CSS successfully injected into index.html")
else:
    print("CSS already exists!")
