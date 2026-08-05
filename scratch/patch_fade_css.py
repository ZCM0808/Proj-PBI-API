import re

with open('static/index.html', 'r', encoding='utf-8') as f:
    content = f.read()

# Add CSS for fade out
if "fadeOutModal" not in content:
    css_insert = """
        @keyframes fadeOutModal {
            from { opacity: 1; transform: scale(1); }
            to { opacity: 0; transform: scale(0.95); }
        }
        .modal-overlay.fade-out {
            animation: fadeOutModal 0.25s forwards ease-in-out;
        }"""
    content = content.replace("</style>", css_insert + "\n    </style>")

content = content.replace("v201", "v202")

with open('static/index.html', 'w', encoding='utf-8') as f:
    f.write(content)
print("index.html patched with fade-out animation.")
