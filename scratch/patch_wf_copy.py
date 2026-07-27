import re

# 1. Update style.css
with open('static/style.css', 'r', encoding='utf-8') as f:
    css = f.read()

if '.wf-copy-btn' not in css:
    css += """
.wf-copy-btn { position: absolute; top: 6px; right: 6px; background: rgba(255, 255, 255, 0.1); border: none; color: var(--text-secondary); border-radius: 4px; width: 24px; height: 24px; display: flex; align-items: center; justify-content: center; cursor: pointer; transition: all 0.2s; }
.wf-copy-btn:hover { background: rgba(255, 255, 255, 0.2); color: var(--text-primary); }
"""
    with open('static/style.css', 'w', encoding='utf-8') as f:
        f.write(css)

# 2. Update index.html
with open('static/index.html', 'r', encoding='utf-8') as f:
    html = f.read()

def inject_copy(step_num, initial_text):
    return f"""<div style="position: relative;">
                            <pre id="wf-out-step{step_num}" class="wf-console">{initial_text}</pre>
                            <button type="button" class="wf-copy-btn" onclick="copyWfConsole({step_num}, this)" title="Copy Output">
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
                            </button>
                        </div>"""

html = re.sub(
    r'<pre id="wf-out-step1" class="wf-console">(.*?)</pre>',
    lambda m: inject_copy(1, m.group(1)),
    html
)
html = re.sub(
    r'<pre id="wf-out-step2" class="wf-console">(.*?)</pre>',
    lambda m: inject_copy(2, m.group(1)),
    html
)
html = re.sub(
    r'<pre id="wf-out-step3" class="wf-console">(.*?)</pre>',
    lambda m: inject_copy(3, m.group(1)),
    html
)

html = re.sub(r'script\.js\?v=\d+_[a-z0-9_]+', 'script.js?v=20260726_v22_copybtn', html)
html = re.sub(r'style\.css\?v=\d+_[a-z0-9_]+', 'style.css?v=20260726_v22_copybtn', html)

with open('static/index.html', 'w', encoding='utf-8') as f:
    f.write(html)


# 3. Update script.js
with open('static/script.js', 'r', encoding='utf-8') as f:
    script = f.read()

copy_fn = """
window.copyWfConsole = function(step, btn) {
    const text = document.getElementById(`wf-out-step${step}`).textContent;
    navigator.clipboard.writeText(text).then(() => {
        const origHTML = btn.innerHTML;
        btn.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--success)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>';
        setTimeout(() => { btn.innerHTML = origHTML; }, 2000);
    }).catch(err => {
        alert('Failed to copy: ' + err);
    });
};
"""

if 'window.copyWfConsole =' not in script:
    script = script + "\n" + copy_fn

script = re.sub(r'script\.js\?v=\d+_[a-z0-9_]+', 'script.js?v=20260726_v22_copybtn', script)

with open('static/script.js', 'w', encoding='utf-8') as f:
    f.write(script)

print("Copy buttons injected successfully!")
