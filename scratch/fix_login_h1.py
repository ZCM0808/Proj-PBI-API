import codecs

def fix_h1_color():
    path = r"D:\ZCM\Proj-PBI-API\static\login.html"
    with codecs.open(path, 'r', encoding='utf-8') as f:
        html = f.read()

    # Add the CSS variable to the light theme block
    html = html.replace('--text-main: #0f172a;', '--text-main: #0f172a;\n            --h1-gradient: linear-gradient(to right, #1e293b, #4f46e5);')
    
    # Update the h1 rule
    html = html.replace('background: linear-gradient(to right, #fff, #a5b4fc);', 'background: var(--h1-gradient, linear-gradient(to right, #fff, #a5b4fc));')

    with codecs.open(path, 'w', encoding='utf-8') as f:
        f.write(html)

if __name__ == "__main__":
    fix_h1_color()
