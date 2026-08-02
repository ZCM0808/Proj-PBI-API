import re
content = open('static/script.js', encoding='utf-8').read()
content = re.sub(r'modalContent\.style\.left = \$\{offset\}px;', 'modalContent.style.left = offset + "px";', content)
open('static/script.js', 'w', encoding='utf-8').write(content)
