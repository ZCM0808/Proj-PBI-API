import os
import re
import sys

sys.stdout.reconfigure(encoding='utf-8')

proj = r'D:\ZCM\Proj-PBI-API\static'
target_files = ['script.js', 'permission_blueprint.js', 'index.html']

print("=== STARTUP ANALYSIS ===")
for fname in target_files:
    fpath = os.path.join(proj, fname)
    if not os.path.exists(fpath):
        continue
    with open(fpath, 'r', encoding='utf-8', errors='ignore') as f:
        text = f.read()

    print(f"\n--- FILE: {fname} (Length: {len(text)} chars) ---")
    
    # 查找所有被立即调用的函数表达式 (IIFE)
    iifes = list(re.finditer(r'(\([a-zA-Z0-9_\s]*function|\(\s*async\s*\(\)\s*=>)', text))
    print(f"Total IIFEs: {len(iifes)}")
    for m in iifes[:10]:
        idx = m.start()
        line = text[:idx].count('\n') + 1
        print(f"  Line {line}: {text[idx:idx+120].replace(chr(10), ' ')}")

    # 查找所有 DOMContentLoaded / window.onload
    loaders = list(re.finditer(r'(addEventListener\s*\(\s*[\'"`](DOMContentLoaded|load)[\'"`]|window\.onload)', text))
    print(f"Total Loader Listeners: {len(loaders)}")
    for m in loaders:
        idx = m.start()
        line = text[:idx].count('\n') + 1
        print(f"  Line {line}: {text[idx:idx+140].replace(chr(10), ' ')}")
