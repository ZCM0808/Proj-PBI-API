with open('src/main.py', 'r', encoding='utf-8') as f:
    content = f.read()

bad_str = 'results += result.stdout + "\\n" + result.stderr'
good_str = 'results += (result.stdout or "") + "\\n" + (result.stderr or "")'

if bad_str in content:
    content = content.replace(bad_str, good_str)
    with open('src/main.py', 'w', encoding='utf-8') as f:
        f.write(content)
    print('Fixed remaining NoneType concatenations')
else:
    print('No remaining bad concatenations found')
