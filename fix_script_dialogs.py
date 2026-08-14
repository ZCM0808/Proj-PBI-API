import re

with open('static/script.js', 'r', encoding='utf-8') as f:
    js = f.read()

# Fix closing animation logic for all custom dialog functions
close_logic_old = r"""modal\.style\.opacity = '0';
                content\.style\.transform = 'scale\(0\.95\)';
                setTimeout\(\(\) => \{ 
                    modal\.style\.visibility = 'hidden'; 
                    modal\.style\.display = 'none';
                \}, 250\);"""
close_logic_new = """modal.classList.add('closing');
                setTimeout(() => { 
                    modal.style.display = 'none';
                    modal.classList.remove('closing');
                }, 200);"""
js = re.sub(close_logic_old, close_logic_new, js)

# Fix opening animation logic (remove manual overrides)
open_logic_old = r"""modal\.style\.display = 'flex';\s*modal\.style\.visibility = 'visible';\s*modal\.style\.opacity = '1';\s*content\.style\.transform = 'scale\(1\)';"""
open_logic_new = """modal.style.display = 'flex';"""
js = re.sub(open_logic_old, open_logic_new, js)

with open('static/script.js', 'w', encoding='utf-8') as f:
    f.write(js)

print('Cleaned script.js custom dialog inline styles!')
