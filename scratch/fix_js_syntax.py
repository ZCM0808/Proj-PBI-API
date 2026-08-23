import codecs
import re

def fix_syntax():
    path = r"D:\ZCM\Proj-PBI-API\static\script.js"
    with codecs.open(path, 'r', encoding='utf-8') as f:
        content = f.read()

    # Find the broken line
    broken_line = "targetNode.innerText = ${text} ;"
    fixed_line = "targetNode.innerText = `${text} ${arrow}${priority}`;"

    if broken_line in content:
        content = content.replace(broken_line, fixed_line)
        with codecs.open(path, 'w', encoding='utf-8') as f:
            f.write(content)
        print("Fixed syntax error.")
    else:
        print("Broken line not found.")

if __name__ == "__main__":
    fix_syntax()
