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
        let baseX = 0, baseY = 0, modalWidth = 0, modalHeight = 0;

        dragHandle.style.cursor = 'grab';

        let rafId = null;
        const SNAP_THRESHOLD = 30; // 30px snapping distance

        const onMouseMove = (e) => {
            if (!isDragging) return;
            const dx = e.clientX - startMouseX;
            const dy = e.clientY - startMouseY;

            let proposedTranslateX = initialTranslateX + dx;
            let proposedTranslateY = initialTranslateY + dy;

            // Calculate absolute position
            let proposedLeft = baseX + proposedTranslateX;
            let proposedTop = baseY + proposedTranslateY;
            let proposedRight = proposedLeft + modalWidth;
            let proposedBottom = proposedTop + modalHeight;

            // Edge Snapping Logic
            if (Math.abs(proposedLeft) < SNAP_THRESHOLD) {
                proposedTranslateX -= proposedLeft; // Snap to left edge (0)
            } else if (Math.abs(window.innerWidth - proposedRight) < SNAP_THRESHOLD) {
                proposedTranslateX += (window.innerWidth - proposedRight); // Snap to right edge
            }

            if (Math.abs(proposedTop) < SNAP_THRESHOLD) {
                proposedTranslateY -= proposedTop; // Snap to top edge (0)
            } else if (Math.abs(window.innerHeight - proposedBottom) < SNAP_THRESHOLD) {
                proposedTranslateY += (window.innerHeight - proposedBottom); // Snap to bottom edge
            }

            currentTranslateX = proposedTranslateX;
            currentTranslateY = proposedTranslateY;

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

# Ensure mousedown captures baseX, baseY etc
mousedown_pattern = re.compile(r'initialTranslateY = parseFloat\(modalContent\.getAttribute\(\'data-translate-y\'\)\) \|\| 0;\s*startMouseX = e\.clientX;\s*startMouseY = e\.clientY;')
mousedown_replacement = """initialTranslateY = parseFloat(modalContent.getAttribute('data-translate-y')) || 0;
            
            const rect = modalContent.getBoundingClientRect();
            baseX = rect.left - initialTranslateX;
            baseY = rect.top - initialTranslateY;
            modalWidth = rect.width;
            modalHeight = rect.height;

            startMouseX = e.clientX;
            startMouseY = e.clientY;"""
content = re.sub(mousedown_pattern, mousedown_replacement, content)

with open('static/script.js', 'w', encoding='utf-8') as f:
    f.write(content)
print('Added snapping logic to makeDraggable')
