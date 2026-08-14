with open('static/script.js', 'r', encoding='utf-8') as f:
    content = f.read()

bad_center = """    window.centerModal = function(modalContent) {
        if (!modalContent) return;
        const parent = modalContent.parentElement;
        const savedTop = modalContent.getAttribute('data-drag-top');
        const savedLeft = modalContent.getAttribute('data-drag-left');
        if (savedTop !== null && savedLeft !== null) {
            if (parent) {
                parent.style.alignItems = 'flex-start';
                parent.style.justifyContent = 'flex-start';
            }
            modalContent.style.position = 'fixed';
            modalContent.style.top = savedTop;
            modalContent.style.left = savedLeft;
            modalContent.style.margin = '0';
            modalContent.style.transform = 'none';
            modalContent.style.animation = 'none';
        } else {
            // Un-dragged state: Freeze top-left origin firmly at 60px from viewport top
            if (parent) {
                parent.style.alignItems = 'flex-start';
                parent.style.justifyContent = 'center';
            }
            modalContent.style.position = 'relative';
            modalContent.style.top = '0px';
            modalContent.style.left = '0px';
            modalContent.style.margin = '0 auto';
            modalContent.style.transform = 'none';
            modalContent.style.animation = 'none';
        }
    };"""

good_center = """    window.centerModal = function(modalContent) {
        if (!modalContent) return;
        const parent = modalContent.parentElement;
        
        // Always reset to center! User explicitly requested:
        // "在关闭后再次打开时必须自动重置回居中位置"
        if (parent) {
            parent.style.alignItems = 'flex-start';
            parent.style.justifyContent = 'center';
        }
        modalContent.style.position = 'relative';
        modalContent.style.top = '0px';
        modalContent.style.left = '0px';
        modalContent.style.margin = '0 auto';
        modalContent.style.transform = 'none';
        modalContent.style.animation = ''; // Do NOT kill animation, allow CSS to handle it
        
        // CLEAR translation state so makeDraggable doesn't read stale values
        modalContent.removeAttribute('data-translate-x');
        modalContent.removeAttribute('data-translate-y');
        modalContent.removeAttribute('data-drag-top');
        modalContent.removeAttribute('data-drag-left');
    };"""

if bad_center in content:
    content = content.replace(bad_center, good_center)
    with open('static/script.js', 'w', encoding='utf-8') as f:
        f.write(content)
    print('Fixed centerModal')
else:
    print('Could not find bad_center block')
