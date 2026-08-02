import re
content = open('static/script.js', encoding='utf-8').read()

replacement = """    window.centerModal = function(modalContent) {
        if (modalContent) {
            modalContent.style.left = '0px';
            modalContent.style.top = '0px';
        }
    };"""

# Replace the existing function
content = re.sub(r'window\.centerModal = function\(modalContent\) \{.*?\};\n', replacement + '\n', content, flags=re.DOTALL)

open('static/script.js', 'w', encoding='utf-8').write(content)
