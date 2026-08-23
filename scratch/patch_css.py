import codecs

def patch_css():
    path = r"D:\ZCM\Proj-PBI-API\static\style.css"
    with codecs.open(path, 'r', encoding='utf-8') as f:
        content = f.read()

    # Find [data-theme="light"] {
    target = '[data-theme="light"] {'
    replacement = '[data-theme="light"] {\n    --dev-badge-text: #b45309;\n    --dev-badge-bg: rgba(245, 158, 11, 0.2);\n    --dev-badge-border: rgba(245, 158, 11, 0.4);'
    
    if target in content and '--dev-badge-text' not in content:
        content = content.replace(target, replacement)
        with codecs.open(path, 'w', encoding='utf-8') as f:
            f.write(content)
        print("Patched style.css successfully")
    else:
        print("Could not patch style.css")

if __name__ == "__main__":
    patch_css()
