import re
with open('static/script.js', 'r', encoding='utf-8') as f:
    js = f.read()

js = re.sub(r'(out\.textContent \+=.*?)(?=\n)', r'\1\n                    setTimeout(() => { out.scrollTop = out.scrollHeight; }, 10);', js)

with open('static/script.js', 'w', encoding='utf-8') as f:
    f.write(js)
print("done")
