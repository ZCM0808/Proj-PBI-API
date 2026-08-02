import re

with open('static/script.js', 'r', encoding='utf-8') as f:
    js = f.read()

# Add universal toggle
if 'window.toggleConsole =' not in js:
    toggle_fn = """
window.toggleConsole = function(id) {
    const consoleEl = document.getElementById(id);
    if (!consoleEl) return;
    
    const chevronId = id + '-chevron';
    const chevron = document.getElementById(chevronId);
    
    if (consoleEl.classList.contains('collapsed-console')) {
        consoleEl.classList.remove('collapsed-console');
        if (chevron) chevron.style.transform = 'rotate(90deg)';
    } else {
        consoleEl.classList.add('collapsed-console');
        if (chevron) chevron.style.transform = 'rotate(0deg)';
    }
};
"""
    js = js.replace('window.toggleRvcLogs = function() {', toggle_fn + '\nwindow.toggleRvcLogs = function() {')

with open('static/script.js', 'w', encoding='utf-8') as f:
    f.write(js)

print("JS updated")
