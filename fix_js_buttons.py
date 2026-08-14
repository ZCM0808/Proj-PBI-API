with open('static/script.js', 'r', encoding='utf-8') as f:
    content = f.read()

bad_js1 = "    const btnHarnessToggleAll = document.getElementById('btn-harness-toggle-all');"
good_js1 = """    const btnHarnessSelectAll = document.getElementById('btn-harness-select-all');
    const btnHarnessClearAll = document.getElementById('btn-harness-clear-all');"""

bad_js2 = """        let toggleDebounce = false;
        btnHarnessToggleAll?.addEventListener('click', () => {
            if (toggleDebounce) return;
            toggleDebounce = true;
            
            const checkboxes = document.querySelectorAll('.harness-test-cb');
            const anyChecked = Array.from(checkboxes).some(cb => cb.checked);
            checkboxes.forEach(cb => cb.checked = !anyChecked);
            
            setTimeout(() => { toggleDebounce = false; }, 300); // Prevent double-click toggle cancellation
        });"""

good_js2 = """        btnHarnessSelectAll?.addEventListener('click', () => {
            document.querySelectorAll('.harness-test-cb').forEach(cb => cb.checked = true);
        });
        
        btnHarnessClearAll?.addEventListener('click', () => {
            document.querySelectorAll('.harness-test-cb').forEach(cb => cb.checked = false);
        });"""

if bad_js1 in content and bad_js2 in content:
    content = content.replace(bad_js1, good_js1)
    content = content.replace(bad_js2, good_js2)
    with open('static/script.js', 'w', encoding='utf-8') as f:
        f.write(content)
    print('Fixed js buttons')
else:
    print('bad_js not found')
