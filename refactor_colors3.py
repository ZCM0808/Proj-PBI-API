import re

css_path = 'static/style.css'
with open(css_path, 'r', encoding='utf-8') as f:
    css = f.read()

# Add a few more variables
var_additions_root = """
    /* Misc Components */
    --badge-custom-bg: rgba(167, 139, 250, 0.2);
    --badge-custom-text: #a78bfa;
    --markdown-border: #30363d;
"""

var_additions_light = """
    /* Misc Components */
    --badge-custom-bg: rgba(139, 92, 246, 0.15);
    --badge-custom-text: #7c3aed;
    --markdown-border: rgba(0,0,0,0.1);
"""

css = css.replace('    --status-error-text: #ef4444;', '    --status-error-text: #ef4444;' + var_additions_root)
css = css.replace('    --status-error-text: #dc2626;', '    --status-error-text: #dc2626;' + var_additions_light)


# Simple replaces
css = css.replace('background: rgba(167, 139, 250, 0.2);', 'background: var(--badge-custom-bg);')
css = css.replace('color: #a78bfa;', 'color: var(--badge-custom-text);')
css = css.replace('background: rgba(242, 200, 17, 0.15);', 'background: var(--accent-glow);')
css = css.replace('background: rgba(242, 200, 17, 0.3);', 'background: var(--accent-glow);')
css = css.replace('background: rgba(242, 200, 17, 0.12) !important;', 'background: var(--accent-glow) !important;')
css = css.replace('border-color: rgba(242, 200, 17, 0.6) !important;', 'border-color: var(--accent) !important;')
css = css.replace('background: #F2C811 !important;', 'background: var(--accent) !important;')
css = css.replace('border-color: #F2C811 !important;', 'border-color: var(--accent) !important;')
css = css.replace('color: #F2C811;', 'color: var(--accent);')

css = css.replace('background: rgba(255, 255, 255, 0.12) !important;', 'background: var(--overlay-15) !important;')
css = css.replace('border-color: rgba(255, 255, 255, 0.25) !important;', 'border-color: var(--overlay-30) !important;')
css = css.replace('border-color: rgba(255, 255, 255, 0.18);', 'border-color: var(--overlay-20);')
css = css.replace('background: rgba(0, 0, 0, 0.35);', 'background: var(--shadow-dark);')

# Markdown
css = css.replace('background: #30363d;', 'background: var(--markdown-border);')
css = css.replace('color: #8b949e;', 'color: var(--text-secondary);')
css = css.replace('color: #e1e4e8;', 'color: var(--text-primary);')

with open(css_path, 'w', encoding='utf-8') as f:
    f.write(css)
print("Updated CSS with misc variables!")
