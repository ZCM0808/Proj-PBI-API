with open('static/index.html', 'r', encoding='utf-8') as f:
    content = f.read()

content = content.replace(
    "onclick=\"document.getElementById('scan-modal').style.display='none'\"",
    "onclick=\"document.getElementById('scan-modal').querySelector('.close-modal').click()\""
)

content = content.replace(
    "onclick=\"document.getElementById('gum-add-modal').style.display='none'\"",
    "onclick=\"document.getElementById('gum-add-modal').querySelector('.close-modal').click()\""
)

content = content.replace(
    "onclick=\"document.getElementById('gum-edit-modal').style.display='none'\"",
    "onclick=\"document.getElementById('gum-edit-modal').querySelector('.close-modal').click()\""
)

content = content.replace(
    ">关闭</button>",
    ">取消 (Cancel)</button>"
)

with open('static/index.html', 'w', encoding='utf-8') as f:
    f.write(content)
print('Unified footer cancel buttons')
