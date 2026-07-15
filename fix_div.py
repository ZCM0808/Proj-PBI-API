with open('static/index.html', 'r', encoding='utf-8') as f:
    html = f.read()

# The pattern is:
#                     </div>
#                 </div>
#                 </div>
# 
#                 <div class="input-group row">

# We want to remove the third </div>
target = '                    </div>\n                </div>\n                </div>\n\n                <div class="input-group row">'
replacement = '                    </div>\n                </div>\n\n                <div class="input-group row">'

html = html.replace(target, replacement)

# also increment the version of script.js from v17 to v18 to fix cache!
html = html.replace('script.js?v=20260715_v17', 'script.js?v=20260715_v18')

with open('static/index.html', 'w', encoding='utf-8') as f:
    f.write(html)
