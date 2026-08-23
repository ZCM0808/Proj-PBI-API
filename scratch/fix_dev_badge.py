import codecs
import re

def fix_dev_badge():
    files = [
        r"D:\ZCM\Proj-PBI-API\static\index.html",
        r"D:\ZCM\Proj-PBI-API\static\login.html"
    ]
    
    for path in files:
        with codecs.open(path, 'r', encoding='utf-8') as f:
            content = f.read()
        
        # Inject CSS variables into the light theme definition
        # The light theme usually looks like: [data-theme="light"] { ... }
        if '[data-theme="light"] {' in content:
            if '--dev-badge-text' not in content:
                content = content.replace(
                    '[data-theme="light"] {',
                    '[data-theme="light"] {\n            --dev-badge-text: #b45309;\n            --dev-badge-bg: rgba(245, 158, 11, 0.2);\n            --dev-badge-border: rgba(245, 158, 11, 0.4);'
                )
        else:
            # Fallback if [data-theme="light"] is formatted differently
            print(f"Could not find exact [data-theme=\"light\"] {{ in {path}")
            
        # Also need to make sure dark theme has the default variables, or just rely on fallback
        
        # Replace the hardcoded colors in the inline style with variables
        content = re.sub(
            r'background:\s*rgba\(234,\s*179,\s*8,\s*0\.2\);',
            'background: var(--dev-badge-bg, rgba(234, 179, 8, 0.2));',
            content
        )
        content = re.sub(
            r'border:\s*1px solid rgba\(234,\s*179,\s*8,\s*0\.4\);',
            'border: 1px solid var(--dev-badge-border, rgba(234, 179, 8, 0.4));',
            content
        )
        content = re.sub(
            r'color:\s*#fde047;',
            'color: var(--dev-badge-text, #fde047);',
            content
        )
        
        with codecs.open(path, 'w', encoding='utf-8') as f:
            f.write(content)
        print(f"Fixed {path}")

if __name__ == "__main__":
    fix_dev_badge()
