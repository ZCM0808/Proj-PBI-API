import re

css_path = 'static/style.css'
with open(css_path, 'r', encoding='utf-8') as f:
    css = f.read()

# 1. Update text colors for higher contrast
css = css.replace('--text-primary: #1e293b;', '--text-primary: #0f172a;')
css = css.replace('--text-secondary: #64748b;', '--text-secondary: #475569;')
css = css.replace('--panel-border: rgba(0, 0, 0, 0.1);', '--panel-border: rgba(0, 0, 0, 0.15);')

# 2. Re-unify Accent Color to Power BI Yellow for both themes
css = css.replace('--accent: #d4af37;', '--accent: #F2C811;')
css = css.replace('--accent-hover: #b48c22;', '--accent-hover: #d4af37;')

# 3. Add global --accent-text variable
if '--accent-text:' not in css:
    css = css.replace('--accent: #F2C811; /* Power BI Yellow */', '--accent: #F2C811; /* Power BI Yellow */\\n    --accent-text: #0f1115;')
    css = css.replace('--accent: #F2C811;\\n    --accent-hover: #d4af37;', '--accent: #F2C811;\\n    --accent-text: #0f1115;\\n    --accent-hover: #d4af37;')

# Replace hardcoded dark text or white text on accent backgrounds with var(--accent-text)
css = css.replace('color: #0f1115;', 'color: var(--accent-text);')

# Wait, view-mode-btn active has background:var(--accent); color:#fff;
css = css.replace('background:var(--accent); color:#fff;', 'background:var(--accent); color:var(--accent-text);')
css = css.replace('background: var(--accent);\\n    color: var(--text-primary);', 'background: var(--accent);\\n    color: var(--accent-text);')

# 4. Add ::selection rules to make selected text beautiful and high contrast
selection_css = """
/* Selection Highlighting */
::selection {
    background: var(--accent);
    color: var(--accent-text);
}
::-moz-selection {
    background: var(--accent);
    color: var(--accent-text);
}

* {
"""
if '::selection' not in css:
    css = css.replace('* {\\n    box-sizing: border-box;', selection_css + '    box-sizing: border-box;')

# 5. Fix any remaining low contrast overlay colors
css = css.replace('--overlay-5: rgba(0, 0, 0, 0.04);', '--overlay-5: rgba(0, 0, 0, 0.05);')
css = css.replace('--overlay-8: rgba(0, 0, 0, 0.06);', '--overlay-8: rgba(0, 0, 0, 0.08);')

with open(css_path, 'w', encoding='utf-8') as f:
    f.write(css)

print("Applied contrast and selection fixes!")
