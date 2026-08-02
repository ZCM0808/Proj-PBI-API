import re
with open('static/script.js', 'r', encoding='utf-8') as f:
    js = f.read()

# Add scroll logic to consoleOut.innerText in Step 1
js = re.sub(r'(consoleOut\.innerText = [^\n;]+;)', r'\1\n        setTimeout(() => { consoleOut.scrollTop = consoleOut.scrollHeight; }, 10);', js)

with open('static/script.js', 'w', encoding='utf-8') as f:
    f.write(js)
print("done")
