import re

css_path = 'static/style.css'
with open(css_path, 'r', encoding='utf-8') as f:
    css = f.read()

# 1. Update variables block
var_additions_root = """
    /* Syntax Highlighting */
    --syntax-key: #9cdcfe;
    --syntax-string: #ce9178;
    --syntax-number: #b5cea8;
    --syntax-bool: #569cd6;
    --syntax-bracket: #d4d4d4;

    /* Components */
    --modal-bg: rgba(20, 20, 25, 0.85);
    --modal-overlay: rgba(0, 0, 0, 0.65);
    --dropdown-bg: #1a1e23;
    
    /* Method Badges */
    --badge-get-bg: rgba(56, 189, 248, 0.15);
    --badge-get-text: #38bdf8;
    --badge-post-bg: rgba(16, 185, 129, 0.15);
    --badge-post-text: #10b981;
    --badge-put-bg: rgba(245, 158, 11, 0.15);
    --badge-put-text: #f59e0b;
    --badge-delete-bg: rgba(239, 68, 68, 0.15);
    --badge-delete-text: #ef4444;
    
    /* Global Status */
    --status-success-bg: rgba(16, 185, 129, 0.1);
    --status-error-bg: rgba(239, 68, 68, 0.2);
    --status-error-text: #ef4444;
"""

var_additions_light = """
    /* Syntax Highlighting (VS Code Light Theme inspired) */
    --syntax-key: #0451a5;
    --syntax-string: #a31515;
    --syntax-number: #098658;
    --syntax-bool: #0000ff;
    --syntax-bracket: #333333;

    /* Components */
    --modal-bg: rgba(248, 250, 252, 0.95);
    --modal-overlay: rgba(15, 23, 42, 0.4);
    --dropdown-bg: #ffffff;

    /* Method Badges (slightly darker for contrast on light) */
    --badge-get-bg: rgba(2, 132, 199, 0.15);
    --badge-get-text: #0284c7;
    --badge-post-bg: rgba(5, 150, 105, 0.15);
    --badge-post-text: #059669;
    --badge-put-bg: rgba(217, 119, 6, 0.15);
    --badge-put-text: #d97706;
    --badge-delete-bg: rgba(220, 38, 38, 0.15);
    --badge-delete-text: #dc2626;
    
    /* Global Status */
    --status-success-bg: rgba(5, 150, 105, 0.15);
    --status-error-bg: rgba(220, 38, 38, 0.15);
    --status-error-text: #dc2626;
"""

css = css.replace('    --input-bg-light: rgba(0, 0, 0, 0.2);', '    --input-bg-light: rgba(0, 0, 0, 0.2);' + var_additions_root)
css = css.replace('    --input-bg-light: rgba(255, 255, 255, 0.5);', '    --input-bg-light: rgba(255, 255, 255, 0.5);' + var_additions_light)

# Replace syntax colors
css = css.replace('color: #d4d4d4;', 'color: var(--syntax-bracket);')
css = css.replace('color: #9cdcfe;', 'color: var(--syntax-key);')
css = css.replace('color: #ce9178;', 'color: var(--syntax-string);')
css = css.replace('color: #b5cea8;', 'color: var(--syntax-number);')
css = css.replace('color: #569cd6;', 'color: var(--syntax-bool);')

# Replace Modal
css = css.replace('background: rgba(20, 20, 25, 0.85);', 'background: var(--modal-bg);')
css = css.replace('background: rgba(0, 0, 0, 0.65);', 'background: var(--modal-overlay);')

# Replace Dropdown
css = css.replace('background-color: #1a1e23;', 'background-color: var(--dropdown-bg);')
css = css.replace('background: #1a1e23;', 'background: var(--dropdown-bg);')

# Badges
css = css.replace('background: rgba(56, 189, 248, 0.15);', 'background: var(--badge-get-bg);')
css = css.replace('color: #38bdf8;', 'color: var(--badge-get-text);')
css = css.replace('background: rgba(16, 185, 129, 0.15);', 'background: var(--badge-post-bg);')
css = css.replace('color: #10b981;', 'color: var(--badge-post-text);')
css = css.replace('background: rgba(245, 158, 11, 0.15);', 'background: var(--badge-put-bg);')
css = css.replace('color: #f59e0b;', 'color: var(--badge-put-text);')
css = css.replace('background: rgba(239, 68, 68, 0.15);', 'background: var(--badge-delete-bg);')
css = css.replace('color: #ef4444;', 'color: var(--badge-delete-text);')

# Status response container
css = css.replace('background: rgba(16, 185, 129, 0.1);', 'background: var(--status-success-bg);')
css = css.replace('background: rgba(239, 68, 68, 0.2);', 'background: var(--status-error-bg);')
css = css.replace('color: #ef4444;', 'color: var(--status-error-text);')

# Other hardcoded `white` and `#fff`
# We should change color: white to color: var(--text-primary) where it makes sense, EXCEPT on buttons where background is primary accent
css = css.replace('color: white;', 'color: var(--text-primary);')
# Revert for .btn-primary and similar that must be light on dark or dark on light
css = css.replace('.btn-primary {\\n    background: var(--accent);\\n    color: var(--text-primary);', '.btn-primary {\\n    background: var(--accent);\\n    color: #0f1115;') 

# Also fix the tree item active states
css = css.replace('color: #fff !important;', 'color: var(--text-primary) !important;')
css = css.replace('color: white !important;', 'color: var(--text-primary) !important;')

# Update Markdown generated tables / blocks
css = css.replace('background: #0d1117;', 'background: var(--input-bg);')
css = css.replace('color: #c9d1d9;', 'color: var(--text-primary);')

# Write back
with open(css_path, 'w', encoding='utf-8') as f:
    f.write(css)
print("Updated CSS with variables!")
