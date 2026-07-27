import sys
import re

js_path = 'static/script.js'
with open(js_path, 'r', encoding='utf-8') as f:
    lines = f.readlines()

new_lines = []
for line in lines:
    if line.endswith("'\n") or line.endswith('"\n') or line.endswith(";\n") or line.endswith("{\n") or line.endswith("}\n") or line.endswith(")\n") or line.endswith(",\n"):
        new_lines.append(line)
    elif "'" in line and "\\n" not in line and "innerText" not in line:
        new_lines.append(line)
    else:
        # A line that ends with a literal newline inside a string literal.
        if "successLog + '" in line:
            line = line.replace("successLog + '\n", "successLog + '\\n")
        elif "consoleOut.innerText =" in line and "`\n" in line:
            line = line.replace("`\n", "`\\n")
        elif "let csv = rawKeys.map" in line and "\\n" not in line:
            line = line.replace('").join(",") + "\n";', '").join(",") + "\\n";')
        elif "}).join(\",\") +" in line and "\\n" not in line:
            line = line.replace('}).join(",") + "\n";', '}).join(",") + "\\n";')
        
        # If it's still broken, let's just do a naive replace:
        new_lines.append(line.replace("'\n", "'\\n").replace("`\n", "`\\n"))

# Actually, the easiest way is to re-inject the JS properly via Python.
