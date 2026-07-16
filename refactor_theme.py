import re

css = open('static/style.css', 'r', encoding='utf-8').read()

new_vars = ''':root {
    --bg-color: #0f1115;
    --panel-bg: rgba(25, 28, 36, 0.6);
    --panel-border: rgba(255, 255, 255, 0.08);
    --text-primary: #e2e8f0;
    --text-secondary: #94a3b8;
    --accent: #F2C811; /* Power BI Yellow */
    --accent-hover: #d4af37;
    --accent-glow: rgba(242, 200, 17, 0.2);
    --success: #10b981;
    --error: #ef4444;
    
    --overlay-5: rgba(255, 255, 255, 0.05);
    --overlay-8: rgba(255, 255, 255, 0.08);
    --overlay-10: rgba(255, 255, 255, 0.1);
    --overlay-15: rgba(255, 255, 255, 0.15);
    --overlay-20: rgba(255, 255, 255, 0.2);
    --overlay-30: rgba(255, 255, 255, 0.3);
    
    --shadow-base: rgba(0, 0, 0, 0.3);
    --shadow-dark: rgba(0, 0, 0, 0.6);
    
    --input-bg: rgba(0, 0, 0, 0.3);
    --input-bg-light: rgba(0, 0, 0, 0.2);
}

[data-theme="light"] {
    --bg-color: #f1f5f9;
    --panel-bg: rgba(255, 255, 255, 0.85);
    --panel-border: rgba(0, 0, 0, 0.1);
    --text-primary: #1e293b;
    --text-secondary: #64748b;
    --accent: #d4af37;
    --accent-hover: #b48c22;
    --accent-glow: rgba(212, 175, 55, 0.3);
    
    --overlay-5: rgba(0, 0, 0, 0.04);
    --overlay-8: rgba(0, 0, 0, 0.06);
    --overlay-10: rgba(0, 0, 0, 0.08);
    --overlay-15: rgba(0, 0, 0, 0.12);
    --overlay-20: rgba(0, 0, 0, 0.15);
    --overlay-30: rgba(0, 0, 0, 0.25);
    
    --shadow-base: rgba(0, 0, 0, 0.08);
    --shadow-dark: rgba(0, 0, 0, 0.15);
    
    --input-bg: rgba(255, 255, 255, 0.7);
    --input-bg-light: rgba(255, 255, 255, 0.5);
}
'''

css = re.sub(r':root\s*\{[^}]+\}', new_vars, css)

# Replace common rgbas
css = css.replace('rgba(255, 255, 255, 0.05)', 'var(--overlay-5)')
css = css.replace('rgba(255,255,255,0.05)', 'var(--overlay-5)')
css = css.replace('rgba(255, 255, 255, 0.08)', 'var(--overlay-8)')
css = css.replace('rgba(255, 255, 255, 0.1)', 'var(--overlay-10)')
css = css.replace('rgba(255,255,255,0.1)', 'var(--overlay-10)')
css = css.replace('rgba(255, 255, 255, 0.15)', 'var(--overlay-15)')
css = css.replace('rgba(255, 255, 255, 0.2)', 'var(--overlay-20)')
css = css.replace('rgba(255, 255, 255, 0.3)', 'var(--overlay-30)')
css = css.replace('rgba(255,255,255,0.3)', 'var(--overlay-30)')

css = css.replace('rgba(0, 0, 0, 0.3)', 'var(--shadow-base)')
css = css.replace('rgba(0,0,0,0.3)', 'var(--shadow-base)')
css = css.replace('rgba(0, 0, 0, 0.6)', 'var(--shadow-dark)')

css = css.replace('background: rgba(0, 0, 0, 0.3);', 'background: var(--input-bg);')
css = css.replace('background: rgba(0,0,0,0.2);', 'background: var(--input-bg-light);')
css = css.replace('background: rgba(0, 0, 0, 0.2);', 'background: var(--input-bg-light);')

open('static/style.css', 'w', encoding='utf-8').write(css)
