import re

with open('static/script.js', 'r', encoding='utf-8') as f:
    content = f.read()

# Define the function
update_func = """
        window.updateHarnessStats = () => {
            const statsSpan = document.getElementById('harness-stats');
            if (!statsSpan) return;
            const checkboxes = document.querySelectorAll('.harness-test-cb');
            const total = checkboxes.length;
            const checked = Array.from(checkboxes).filter(cb => cb.checked).length;
            statsSpan.textContent = `已选: ${checked} / 总计: ${total}`;
        };
"""

# Insert function before setupFLIPModal
if "window.setupFLIPModal(btnTestHarness" in content and "window.updateHarnessStats =" not in content:
    content = content.replace("window.setupFLIPModal(btnTestHarness", update_func + "\n        window.setupFLIPModal(btnTestHarness")

# Replace the buttons to include calls
bad_select_all = "document.querySelectorAll('.harness-test-cb').forEach(cb => cb.checked = true);"
good_select_all = "document.querySelectorAll('.harness-test-cb').forEach(cb => cb.checked = true);\n            if (window.updateHarnessStats) window.updateHarnessStats();"

bad_clear_all = "document.querySelectorAll('.harness-test-cb').forEach(cb => cb.checked = false);"
good_clear_all = "document.querySelectorAll('.harness-test-cb').forEach(cb => cb.checked = false);\n            if (window.updateHarnessStats) window.updateHarnessStats();"

content = content.replace(bad_select_all, good_select_all)
content = content.replace(bad_clear_all, good_clear_all)

with open('static/script.js', 'w', encoding='utf-8') as f:
    f.write(content)
print("Done inserting stats function")
