import re
import codecs

def patch_login():
    path = r"D:\ZCM\Proj-PBI-API\static\login.html"
    with codecs.open(path, 'r', encoding='utf-8') as f:
        html = f.read()

    # 1. Inject Theme Variables
    theme_vars = """
        :root {
            --bg-gradient: linear-gradient(135deg, #0f172a 0%, #1e1b4b 100%);
            --glass-bg: rgba(255, 255, 255, 0.05);
            --glass-border: rgba(255, 255, 255, 0.1);
            --accent: #8b5cf6;
            --accent-hover: #a78bfa;
            --text-main: #f8fafc;
            --text-secondary: #94a3b8;
            --input-bg: rgba(0, 0, 0, 0.25);
            --input-focus-bg: rgba(0, 0, 0, 0.35);
            --blob-1: #4c1d95;
            --blob-2: #1e3a8a;
            --tab-bg: rgba(0, 0, 0, 0.3);
            --tab-hover: rgba(255, 255, 255, 0.05);
            --logo-bg: rgba(255, 255, 255, 0.08);
            --fade-bg: #0d1117;
        }

        [data-theme="light"] {
            --bg-gradient: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%);
            --glass-bg: rgba(255, 255, 255, 0.65);
            --glass-border: rgba(0, 0, 0, 0.1);
            --text-main: #0f172a;
            --text-secondary: #475569;
            --input-bg: rgba(255, 255, 255, 0.9);
            --input-focus-bg: #ffffff;
            --blob-1: #ddd6fe;
            --blob-2: #bfdbfe;
            --tab-bg: rgba(0, 0, 0, 0.05);
            --tab-hover: rgba(0, 0, 0, 0.05);
            --logo-bg: rgba(0, 0, 0, 0.05);
            --fade-bg: #f8fafc;
        }
"""
    
    html = re.sub(r':root\s*\{[^}]+\}', theme_vars, html, count=1)

    # 2. Update CSS rules to use variables
    html = html.replace('background: #4c1d95;', 'background: var(--blob-1);')
    html = html.replace('background: #1e3a8a;', 'background: var(--blob-2);')
    html = html.replace('background: rgba(255, 255, 255, 0.08);', 'background: var(--logo-bg);')
    html = html.replace('background: rgba(0, 0, 0, 0.3);', 'background: var(--tab-bg);')
    html = html.replace('background: rgba(255, 255, 255, 0.05);', 'background: var(--tab-hover);')
    html = html.replace('background: rgba(0, 0, 0, 0.25);', 'background: var(--input-bg);')
    html = html.replace('background: rgba(0, 0, 0, 0.35);', 'background: var(--input-focus-bg);')
    html = html.replace('color: #fff;', 'color: var(--text-main);')
    html = html.replace('border-top-color: #fff;', 'border-top-color: var(--text-main);')
    html = html.replace('background: #0d1117;', 'background: var(--fade-bg);')

    # Add Theme Toggle Button CSS
    theme_btn_css = """
        .theme-toggle {
            position: absolute;
            top: 20px;
            right: 20px;
            background: var(--glass-bg);
            border: 1px solid var(--glass-border);
            color: var(--text-main);
            width: 40px;
            height: 40px;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            cursor: pointer;
            z-index: 100;
            transition: all 0.3s ease;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
        }
        .theme-toggle:hover {
            transform: scale(1.1) rotate(15deg);
        }
        .theme-toggle svg {
            width: 20px;
            height: 20px;
            fill: currentColor;
        }
        [data-theme="light"] .theme-toggle .moon-icon { display: block; }
        [data-theme="light"] .theme-toggle .sun-icon { display: none; }
        :root:not([data-theme="light"]) .theme-toggle .moon-icon { display: none; }
        :root:not([data-theme="light"]) .theme-toggle .sun-icon { display: block; }
    """
    html = html.replace('</style>', theme_btn_css + '\n    </style>')

    # 3. Inject Theme Toggle Button HTML
    theme_btn_html = """
    <button class="theme-toggle" id="theme-btn" title="Toggle Light/Dark Mode">
        <svg class="sun-icon" viewBox="0 0 24 24"><path d="M12 2.25a.75.75 0 01.75.75v2.25a.75.75 0 01-1.5 0V3a.75.75 0 01.75-.75zM7.5 12a4.5 4.5 0 119 0 4.5 4.5 0 01-9 0zM18.894 6.166a.75.75 0 00-1.06-1.06l-1.591 1.59a.75.75 0 101.06 1.061l1.591-1.59zM21.75 12a.75.75 0 01-.75.75h-2.25a.75.75 0 010-1.5H21a.75.75 0 01.75.75zM17.834 18.894a.75.75 0 001.06-1.06l-1.59-1.591a.75.75 0 10-1.061 1.06l1.59 1.591zM12 18.75a.75.75 0 01.75.75V21a.75.75 0 01-1.5 0v-1.5a.75.75 0 01.75-.75zM6.166 17.834a.75.75 0 00-1.06 1.06l1.59 1.591a.75.75 0 101.06-1.061l-1.59-1.591zM4.5 12a.75.75 0 01-.75.75H1.5a.75.75 0 010-1.5h2.25a.75.75 0 01.75.75zM6.166 6.166a.75.75 0 001.06 1.06l-1.59 1.591a.75.75 0 10-1.06-1.061l1.59-1.591z"/></svg>
        <svg class="moon-icon" viewBox="0 0 24 24"><path d="M9.528 1.718a.75.75 0 01.162.819A8.97 8.97 0 009 6a9 9 0 009 9 8.97 8.97 0 003.463-.69.75.75 0 01.981.98 10.503 10.503 0 01-9.694 6.46c-5.799 0-10.5-4.701-10.5-10.5 0-4.368 2.667-8.112 6.46-9.694a.75.75 0 01.818.162z"/></svg>
    </button>
    """
    html = html.replace('<body>', '<body>\n' + theme_btn_html)

    # 4. Inject Theme JS
    theme_js = """
        // ===== Theme Logic =====
        const themeBtn = document.getElementById('theme-btn');
        function initTheme() {
            const savedTheme = localStorage.getItem('pbi-theme');
            if (savedTheme === 'light') {
                document.documentElement.setAttribute('data-theme', 'light');
            } else if (savedTheme === 'dark') {
                document.documentElement.removeAttribute('data-theme');
            } else if (window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches) {
                document.documentElement.setAttribute('data-theme', 'light');
            }
        }
        initTheme();

        themeBtn.addEventListener('click', () => {
            if (document.documentElement.getAttribute('data-theme') === 'light') {
                document.documentElement.removeAttribute('data-theme');
                localStorage.setItem('pbi-theme', 'dark');
            } else {
                document.documentElement.setAttribute('data-theme', 'light');
                localStorage.setItem('pbi-theme', 'light');
            }
        });
    """
    html = html.replace('// ===== Tab Switching =====', theme_js + '\n        // ===== Tab Switching =====')

    with codecs.open(path, 'w', encoding='utf-8') as f:
        f.write(html)

if __name__ == "__main__":
    patch_login()
