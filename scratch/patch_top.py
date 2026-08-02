import re

with open('static/script.js', 'r', encoding='utf-8') as f:
    js = f.read()

# Remove existing toggleConsole and expandConsole
js = re.sub(r'window\.expandConsole = function.*?};\n+', '', js, flags=re.DOTALL)
js = re.sub(r'window\.toggleConsole = function.*?};\n+', '', js, flags=re.DOTALL)

top_funcs = """
window.expandConsole = function(id) {
    const consoleEl = document.getElementById(id);
    if (!consoleEl) return;
    const chevron = document.getElementById(id + '-chevron');
    if (consoleEl.classList.contains('collapsed-console')) {
        consoleEl.classList.remove('collapsed-console');
        if (chevron) chevron.style.transform = 'rotate(90deg)';
    }
};

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

js = top_funcs + '\n' + js

with open('static/script.js', 'w', encoding='utf-8') as f:
    f.write(js)

with open('static/index.html', 'r', encoding='utf-8') as f:
    html = f.read()

html = re.sub(r'v131', 'v132', html)

with open('static/index.html', 'w', encoding='utf-8') as f:
    f.write(html)

print("done")
