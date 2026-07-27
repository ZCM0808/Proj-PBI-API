import re

# 1. Update style.css
with open('static/style.css', 'r', encoding='utf-8') as f:
    css = f.read()

# Force overrides for step button and title
css = css.replace('.wf-step-btn { padding: 2px 10px; font-size: 0.75rem; }', '.wf-step-btn { padding: 4px 10px !important; font-size: 0.75rem !important; height: auto !important; border-radius: 6px !important; line-height: 1 !important; }')
css = css.replace('.wf-step-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 2px; }', '.wf-step-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 2px !important; }')
css = css.replace('.wf-step-title { font-weight: 600; color: var(--accent); font-size: 0.8rem; }', '.wf-step-title { font-weight: 600; color: var(--accent); font-size: 0.8rem !important; margin: 0 !important; line-height: 1 !important; }')

# 2. Update script.js
with open('static/script.js', 'r', encoding='utf-8') as f:
    script = f.read()

# Make sure visibility is visible and opacity is 1 just in case legacy state is stuck
open_logic_fix = """            wfContent.style.left = '0px';
            wfContent.style.top = '0px';
            workflowModal.style.visibility = 'visible';
            workflowModal.style.opacity = '1';
            workflowModal.style.display = 'flex';"""

script = script.replace("""            wfContent.style.left = '0px';
            wfContent.style.top = '0px';
            workflowModal.style.display = 'flex';""", open_logic_fix)

# Cache busting
script = re.sub(r'script\.js\?v=\d+_[a-z0-9_]+', 'script.js?v=20260726_v25_modal_hotfix', script)
css = re.sub(r'style\.css\?v=\d+_[a-z0-9_]+', 'style.css?v=20260726_v25_modal_hotfix', css)

with open('static/script.js', 'w', encoding='utf-8') as f:
    f.write(script)

with open('static/style.css', 'w', encoding='utf-8') as f:
    f.write(css)

with open('static/index.html', 'r', encoding='utf-8') as f:
    html = f.read()
html = re.sub(r'script\.js\?v=\d+_[a-z0-9_]+', 'script.js?v=20260726_v25_modal_hotfix', html)
html = re.sub(r'style\.css\?v=\d+_[a-z0-9_]+', 'style.css?v=20260726_v25_modal_hotfix', html)
with open('static/index.html', 'w', encoding='utf-8') as f:
    f.write(html)

print("Patch 4 applied!")
