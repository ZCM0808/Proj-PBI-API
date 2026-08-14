import re

with open('static/script.js', 'r', encoding='utf-8') as f:
    content = f.read()

pattern = re.compile(r'function makeDraggable\(modalContent, dragHandle\)\s*{.*?dragHandle\.addEventListener\(\'mousedown\'', re.DOTALL)
match = pattern.search(content)

original = """function makeDraggable(modalContent, dragHandle) {
        let isDragging = false;
        let startMouseX, startMouseY;
        let currentTranslateX = 0, currentTranslateY = 0;
        let initialTranslateX = 0, initialTranslateY = 0;

        dragHandle.style.cursor = 'grab';

        let rafId = null;

        const onMouseMove = (e) => {
            if (!isDragging) return;
            const dx = e.clientX - startMouseX;
            const dy = e.clientY - startMouseY;

            currentTranslateX = initialTranslateX + dx;
            currentTranslateY = initialTranslateY + dy;

            if (!rafId) {
                rafId = requestAnimationFrame(() => {
                    modalContent.style.transform = `translate3d(${currentTranslateX}px, ${currentTranslateY}px, 0)`;
                    rafId = null;
                });
            }
        };

        const onMouseUp = () => {
            if (isDragging) {
                isDragging = false;
                dragHandle.style.cursor = 'grab';
                document.body.style.userSelect = '';
                modalContent.setAttribute('data-translate-y', currentTranslateY);
                modalContent.setAttribute('data-translate-x', currentTranslateX);

                // Restore expensive CSS effects after dragging
                modalContent.style.pointerEvents = '';
                modalContent.style.backdropFilter = '';
                modalContent.style.webkitBackdropFilter = '';
                modalContent.style.boxShadow = '';
                modalContent.style.transition = '';

                document.removeEventListener('mousemove', onMouseMove);
                document.removeEventListener('mouseup', onMouseUp);
            }
        };

        dragHandle.addEventListener('mousedown'"""

content = content.replace(match.group(0), original)

mousedown_pattern = re.compile(r'initialTranslateY = parseFloat\(modalContent\.getAttribute\(\'data-translate-y\'\)\) \|\| 0;\s*const rect = modalContent\.getBoundingClientRect\(\);.*?startMouseY = e\.clientY;', re.DOTALL)

mousedown_replacement = """initialTranslateY = parseFloat(modalContent.getAttribute('data-translate-y')) || 0;
            startMouseX = e.clientX;
            startMouseY = e.clientY;"""
content = re.sub(mousedown_pattern, mousedown_replacement, content)

with open('static/script.js', 'w', encoding='utf-8') as f:
    f.write(content)
print('Restored makeDraggable to allow free dragging')
