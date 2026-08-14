import re

with open('static/script.js', 'r', encoding='utf-8') as f:
    js = f.read()

# Fix closing animation logic for all custom dialog functions (catch remaining scale(0.95) instances)
bad_pattern = r"""modal\.style\.opacity = '0';\s*content\.style\.transform = 'scale\(0\.95\)';\s*setTimeout\(\(\) => \{ modal\.style\.visibility = 'hidden'; \}, 250\);"""
good_pattern = """modal.classList.add('closing');
                setTimeout(() => { 
                    modal.style.display = 'none';
                    modal.classList.remove('closing');
                }, 150);"""
                
js = re.sub(bad_pattern, good_pattern, js)

with open('static/script.js', 'w', encoding='utf-8') as f:
    f.write(js)

print('Fixed remaining custom dialog close logic!')
