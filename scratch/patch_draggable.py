import re

with open('static/script.js', 'r', encoding='utf-8') as f:
    content = f.read()

# Make AI chat window draggable
ai_chat_init_code = """
    // Initialize AI chat draggable
    const aiWin = document.getElementById('ai-chat-window');
    const aiHeader = document.getElementById('ai-chat-header');
    if (aiWin && aiHeader && window.makeDraggable) {
        window.makeDraggable(aiWin, aiHeader);
    }
"""

if 'Initialize AI chat draggable' not in content:
    content = content.replace(
        "window.toggleAIChat = function() {",
        ai_chat_init_code + "\n    window.toggleAIChat = function() {"
    )

# Make sure AI chat window resets position on open
reset_code = """
        if (win.style.opacity === '0' || !win.style.opacity) {
            win.style.left = '';
            win.style.top = '';
            win.style.right = '20px';
            win.style.bottom = '80px';
"""
content = content.replace(
    "if (win.style.opacity === '0' || !win.style.opacity) {",
    reset_code
)

# Cache busting
content = re.sub(r'script\.js\?v=\d+_[a-z0-9_]+', 'script.js?v=20260725_v10_draggable', content)

with open('static/script.js', 'w', encoding='utf-8') as f:
    f.write(content)

with open('static/index.html', 'r', encoding='utf-8') as f:
    html = f.read()
html = re.sub(r'script\.js\?v=\d+_[a-z0-9_]+', 'script.js?v=20260725_v10_draggable', html)
with open('static/index.html', 'w', encoding='utf-8') as f:
    f.write(html)

print("Draggable fixes applied!")
