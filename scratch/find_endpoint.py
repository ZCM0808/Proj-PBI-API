with open('static/script.js', 'r', encoding='utf-8') as f:
    for i, line in enumerate(f):
        if 'endpoint-item' in line:
            print(f"{i+1}: {line.strip()}")
