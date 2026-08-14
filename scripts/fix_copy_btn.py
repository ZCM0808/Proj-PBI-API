import os

with open('static/script.js', 'r', encoding='utf-8') as f:
    js = f.read()

target = '''        if (isSelfButton) {
            const origHTML = targetEl.innerHTML;
            targetEl.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--success)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>';
            targetEl.style.color = 'var(--success)';
            setTimeout(() => { 
                targetEl.innerHTML = origHTML; 
                targetEl.style.color = '';
            }, 1500);
        } else if (iconWrapper) {'''

replacement = '''        if (isSelfButton) {
            const svgEl = targetEl.querySelector('svg');
            let origSVG = null;
            let origHTML = null;
            if (svgEl) {
                origSVG = svgEl.outerHTML;
                svgEl.outerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>';
            } else {
                origHTML = targetEl.innerHTML;
                targetEl.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>';
            }
            targetEl.style.color = 'var(--success)';
            setTimeout(() => { 
                if (origSVG) {
                    const newSvg = targetEl.querySelector('svg');
                    if (newSvg) newSvg.outerHTML = origSVG;
                } else if (origHTML !== null) {
                    targetEl.innerHTML = origHTML;
                }
                targetEl.style.color = '';
            }, 1500);
        } else if (iconWrapper) {'''

if target in js:
    js = js.replace(target, replacement)
    with open('static/script.js', 'w', encoding='utf-8') as f:
        f.write(js)
    print('Updated script.js successfully.')
else:
    print('Target string not found in script.js.')
