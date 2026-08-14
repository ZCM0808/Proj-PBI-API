with open('static/script.js', 'r', encoding='utf-8') as f:
    content = f.read()

bad_cb_create = """                        cb.className = 'harness-test-cb';
                        cb.dataset.name = test.name;
                        cb.dataset.type = test.type;

                        const text = document.createElement('span');"""

good_cb_create = """                        cb.className = 'harness-test-cb';
                        cb.dataset.name = test.name;
                        cb.dataset.type = test.type;
                        cb.addEventListener('change', window.updateHarnessStats);

                        const text = document.createElement('span');"""

bad_tests_loaded = """                        label.appendChild(cb);
                        label.appendChild(text);
                        harnessTestList.appendChild(label);
                    });
                } else {"""

good_tests_loaded = """                        label.appendChild(cb);
                        label.appendChild(text);
                        harnessTestList.appendChild(label);
                    });
                    if (window.updateHarnessStats) window.updateHarnessStats();
                } else {"""

bad_buttons = """        btnHarnessSelectAll?.addEventListener('click', () => {
            document.querySelectorAll('.harness-test-cb').forEach(cb => cb.checked = true);
        });
        
        btnHarnessClearAll?.addEventListener('click', () => {
            document.querySelectorAll('.harness-test-cb').forEach(cb => cb.checked = false);
        });"""

good_buttons = """        window.updateHarnessStats = () => {
            const statsSpan = document.getElementById('harness-stats');
            if (!statsSpan) return;
            const checkboxes = document.querySelectorAll('.harness-test-cb');
            const total = checkboxes.length;
            const checked = Array.from(checkboxes).filter(cb => cb.checked).length;
            statsSpan.textContent = `已选: ${checked} / 总计: ${total}`;
        };

        btnHarnessSelectAll?.addEventListener('click', () => {
            document.querySelectorAll('.harness-test-cb').forEach(cb => cb.checked = true);
            window.updateHarnessStats();
        });
        
        btnHarnessClearAll?.addEventListener('click', () => {
            document.querySelectorAll('.harness-test-cb').forEach(cb => cb.checked = false);
            window.updateHarnessStats();
        });"""

if bad_cb_create in content and bad_tests_loaded in content and bad_buttons in content:
    content = content.replace(bad_cb_create, good_cb_create)
    content = content.replace(bad_tests_loaded, good_tests_loaded)
    content = content.replace(bad_buttons, good_buttons)
    with open('static/script.js', 'w', encoding='utf-8') as f:
        f.write(content)
    print('Successfully added harness stats logic')
else:
    print('Some bad blocks not found')
    if bad_cb_create not in content: print('bad_cb_create missing')
    if bad_tests_loaded not in content: print('bad_tests_loaded missing')
    if bad_buttons not in content: print('bad_buttons missing')
