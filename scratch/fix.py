import re
content = open('static/script.js', encoding='utf-8').read()
content = re.sub(r'(modalContent\.setAttribute\(\'data-drag-init\', \'true\'\);\s*\})', r'\1\n        window.centerModal(modalContent);\n        modalContent.style.top = \'0px\';', content, count=1)
open('static/script.js', 'w', encoding='utf-8').write(content)
