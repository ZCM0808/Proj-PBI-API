import re

with open('static/script.js', 'r', encoding='utf-8') as f:
    content = f.read()

# Find the makeDraggable function
pattern = re.compile(r'function makeDraggable\(modalContent, dragHandle\)\s*{.*?dragHandle\.addEventListener\(\'mousedown\'', re.DOTALL)
match = pattern.search(content)
if not match:
    print("Could not find makeDraggable")
else:
    original = match.group(0)
    
    # We want to replace the onMouseMove logic
    replacement = """function makeDraggable(modalContent, dragHandle) {
        let isDragging = false;
        let startMouseX, startMouseY;
        let currentTranslateX = 0, currentTranslateY = 0;
        let initialTranslateX = 0, initialTranslateY = 0;
        let baseX = 0, baseY = 0, modalWidth = 0, modalHeight = 0;

        dragHandle.style.cursor = 'grab';

        let rafId = null;

        const onMouseMove = (e) => {
            if (!isDragging) return;
            const dx = e.clientX - startMouseX;
            const dy = e.clientY - startMouseY;

            let proposedTranslateX = initialTranslateX + dx;
            let proposedTranslateY = initialTranslateY + dy;

            // Enforce 5% screen edge margin rules
            const marginX = window.innerWidth * 0.05;
            const marginY = window.innerHeight * 0.05;
            
            const proposedLeft = baseX + proposedTranslateX;
            const proposedTop = baseY + proposedTranslateY;
            
            const maxRight = window.innerWidth - marginX;
            const maxBottom = window.innerHeight - marginY;

            // Clamp X if modal is smaller than allowed area
            if (modalWidth <= maxRight - marginX) {
                if (proposedLeft < marginX) proposedTranslateX += (marginX - proposedLeft);
                else if (proposedLeft + modalWidth > maxRight) proposedTranslateX -= (proposedLeft + modalWidth - maxRight);
            } else {
                // Too wide, at least keep header accessible
                if (proposedLeft > window.innerWidth - 100) proposedTranslateX -= (proposedLeft - (window.innerWidth - 100));
            }

            // Clamp Y if modal is smaller than allowed area
            if (modalHeight <= maxBottom - marginY) {
                if (proposedTop < marginY) proposedTranslateY += (marginY - proposedTop);
                else if (proposedTop + modalHeight > maxBottom) proposedTranslateY -= (proposedTop + modalHeight - maxBottom);
            } else {
                // Too tall, prioritize top accessibility
                if (proposedTop < marginY) proposedTranslateY += (marginY - proposedTop);
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
    
    content = content.replace(original, replacement)
    
    # We also need to capture baseX, baseY, width, height in mousedown
    mousedown_pattern = re.compile(r'initialTranslateY = parseFloat\(modalContent\.getAttribute\(\'data-translate-y\'\)\) \|\| 0;\s*startMouseX = e\.clientX;\s*startMouseY = e\.clientY;')
    
    mousedown_replacement = """initialTranslateY = parseFloat(modalContent.getAttribute('data-translate-y')) || 0;
            
            const rect = modalContent.getBoundingClientRect();
            baseX = rect.left - initialTranslateX;
            baseY = rect.top - initialTranslateY;
            modalWidth = rect.width;
            modalHeight = rect.height;

            startMouseX = e.clientX;
            startMouseY = e.clientY;"""
    
    content = content.replace(
        "initialTranslateY = parseFloat(modalContent.getAttribute('data-translate-y')) || 0;\n            startMouseX = e.clientX;\n            startMouseY = e.clientY;", 
        mousedown_replacement
    )
    
    with open('static/script.js', 'w', encoding='utf-8') as f:
        f.write(content)
    print("Modified makeDraggable successfully")
