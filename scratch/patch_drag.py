import re

with open('static/script.js', 'r', encoding='utf-8') as f:
    script = f.read()

replacement = """        document.addEventListener('mousemove', (e) => {
            if (!isDragging) return;
            let dx = e.clientX - startX;
            let dy = e.clientY - startY;
            
            // Extreme Boundary Defense: Prevent dragging out of viewport
            const rect = modalContent.getBoundingClientRect();
            const winWidth = window.innerWidth;
            const winHeight = window.innerHeight;
            
            // Calculate natural center offsets
            const maxLeft = (winWidth - rect.width) / 2;
            const maxTop = (winHeight - rect.height) / 2;
            
            let newLeft = initialLeft + dx;
            let newTop = initialTop + dy;
            
            // Clamp values
            if (newLeft < -maxLeft) newLeft = -maxLeft;
            if (newLeft > maxLeft) newLeft = maxLeft;
            if (newTop < -maxTop) newTop = -maxTop;
            if (newTop > maxTop) newTop = maxTop;
            
            modalContent.style.left = `${newLeft}px`;
            modalContent.style.top = `${newTop}px`;
        });"""

script = re.sub(
    r"        document\.addEventListener\('mousemove', \(e\) => \{\s*if \(!isDragging\) return;\s*const dx = e\.clientX - startX;\s*const dy = e\.clientY - startY;\s*modalContent\.style\.left = `\$\{initialLeft \+ dx\}px`;\s*modalContent\.style\.top = `\$\{initialTop \+ dy\}px`;\s*\}\);",
    replacement,
    script
)

script = re.sub(r'script\.js\?v=\d+_[a-z0-9_]+', 'script.js?v=20260725_v15_dragBounds', script)

with open('static/script.js', 'w', encoding='utf-8') as f:
    f.write(script)

with open('static/index.html', 'r', encoding='utf-8') as f:
    html = f.read()
html = re.sub(r'script\.js\?v=\d+_[a-z0-9_]+', 'script.js?v=20260725_v15_dragBounds', html)
with open('static/index.html', 'w', encoding='utf-8') as f:
    f.write(html)

print("Draggable boundary defense applied!")
