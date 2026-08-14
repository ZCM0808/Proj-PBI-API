import re

with open('static/script.js', 'r', encoding='utf-8') as f:
    js = f.read()

# Fix closing animation logic so it resolves AFTER animation completes!
# Previous replace might have left it like this:
#                 modal.classList.add('closing');
#                 setTimeout(() => { 
#                     modal.style.display = 'none';
#                     modal.classList.remove('closing');
#                 }, 200);
#                 resolve(val);

# We need to move resolve(val) into the setTimeout!
bad_pattern = r"""modal\.classList\.add\('closing'\);\s*setTimeout\(\(\) => \{\s*modal\.style\.display = 'none';\s*modal\.classList\.remove\('closing'\);\s*\}, 200\);\s*resolve\(val\);"""
good_pattern = """modal.classList.add('closing');
                setTimeout(() => { 
                    modal.style.display = 'none';
                    modal.classList.remove('closing');
                    resolve(val);
                }, 150);"""
                
js = re.sub(bad_pattern, good_pattern, js)

with open('static/script.js', 'w', encoding='utf-8') as f:
    f.write(js)

print('Fixed promise resolution timing!')
