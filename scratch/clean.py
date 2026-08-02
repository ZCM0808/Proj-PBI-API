import re
content = open('static/style.css', encoding='utf-8').read()
content = re.sub(r'\s*--modal-offset:.*?;', '', content)
content = re.sub(r'\s*:root\s*{\s*--modal-offset:\s*0px;\s*}', '', content)
content = re.sub(r'\s*left:\s*var\(--modal-offset,\s*0px\);', '', content)
open('static/style.css', 'w', encoding='utf-8').write(content)
