content = open('static/script.js', encoding='utf-8').read()
content = content.replace("\\'0px\\'", "'0px'")
open('static/script.js', 'w', encoding='utf-8').write(content)
