with open('src/main.py', 'r', encoding='utf-8') as f:
    content = f.read()

bad_block = '''        if playwright_tests:
            import re
            pattern = "|".join([re.escape(t) for t in playwright_tests])
            cmd = ["npx.cmd", "playwright", "test", "-g", pattern]
            result = subprocess.run(cmd, shell=False, capture_output=True, text=True)
            results += "\\n=== Playwright E2E Tests ===\\n"
            results += f"> Executed: {' '.join(cmd)} (Exit Code: {result.returncode})\\n\\n"'''

good_block = '''        if playwright_tests:
            # Join names simply with |, no regex escaping needed as we exact match names, except to avoid breaking the CLI string quotes
            pattern = "|".join([t.replace('"', '') for t in playwright_tests])
            cmd = f'npx playwright test -g "{pattern}"'
            result = subprocess.run(cmd, shell=True, capture_output=True, text=True)
            results += "\\n=== Playwright E2E Tests ===\\n"
            results += f"> Executed: {cmd} (Exit Code: {result.returncode})\\n\\n"'''

if bad_block in content:
    content = content.replace(bad_block, good_block)
    with open('src/main.py', 'w', encoding='utf-8') as f:
        f.write(content)
    print('Replaced Playwright block successfully')
else:
    print('bad_block not found')
