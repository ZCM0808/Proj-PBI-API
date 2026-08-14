with open('static/script.js', 'r', encoding='utf-8') as f:
    content = f.read()

bad_toggle = """        btnHarnessToggleAll?.addEventListener('click', () => {
            const checkboxes = document.querySelectorAll('.harness-test-cb');
            const allChecked = Array.from(checkboxes).every(cb => cb.checked);
            checkboxes.forEach(cb => cb.checked = !allChecked);
        });"""

good_toggle = """        btnHarnessToggleAll?.addEventListener('click', () => {
            const checkboxes = document.querySelectorAll('.harness-test-cb');
            const anyChecked = Array.from(checkboxes).some(cb => cb.checked);
            checkboxes.forEach(cb => cb.checked = !anyChecked);
        });"""

if bad_toggle in content:
    content = content.replace(bad_toggle, good_toggle)
    with open('static/script.js', 'w', encoding='utf-8') as f:
        f.write(content)
    print('Fixed toggle all logic')
else:
    print('Could not find bad_toggle')
